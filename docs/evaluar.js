// Lógica común (navegador y Node): evalúa cada día contra las normas de normas.json.
// No toca el DOM, así la usan la web y el resumen semanal por correo.

export const NIVEL = { ok: 0, ambar: 1, rojo: 2, sin_datos: -1 };

export function fmtMin(m) {
  if (m == null || isNaN(m)) return '—';
  m = Math.round(m);
  const h = Math.floor(m / 60), r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

export function parseFecha(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
export function isoFecha(d) { return d.toISOString().slice(0, 10); }
export function sumarDias(s, n) { const d = parseFecha(s); d.setUTCDate(d.getUTCDate() + n); return isoFecha(d); }
// 1 = lunes … 7 = domingo
export function diaSemana(s) { const w = parseFecha(s).getUTCDay(); return w === 0 ? 7 : w; }
export function lunesDe(s) { return sumarDias(s, 1 - diaSemana(s)); }

const DIAS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export function fechaLarga(s) { const d = parseFecha(s); return `${DIAS[diaSemana(s)]} ${d.getUTCDate()} de ${MESES[d.getUTCMonth()]}`; }
export function fechaCorta(s) { const d = parseFecha(s); return `${DIAS[diaSemana(s)].slice(0, 3)} ${d.getUTCDate()}/${d.getUTCMonth() + 1}`; }

// "lectivo" o "fin_de_semana" (los festivos marcados en el día cuentan como fin de semana)
export function tipoDia(fecha, porFecha, normas) {
  const dia = porFecha?.[fecha];
  if (dia?.festivo) return 'fin_de_semana';
  return (normas.dias_fin_de_semana || [6, 7]).includes(diaSemana(fecha)) ? 'fin_de_semana' : 'lectivo';
}

// Minutos en [desde, hasta) de un array horario, con horas fraccionarias (23.5 = 23:30)
function minutosEntre(horas, desde, hasta) {
  let t = 0;
  for (let h = 0; h < 24; h++) {
    const solape = Math.max(0, Math.min(h + 1, hasta) - Math.max(h, desde));
    t += (horas[h] || 0) * solape;
  }
  return t;
}

function nivelLimite(valor, limite, normas) {
  if (limite == null) return null;
  if (valor <= limite) return 'ok';
  const pct = normas.semaforo?.ambar_hasta_pct ?? 20;
  return valor <= limite * (1 + pct / 100) ? 'ambar' : 'rojo';
}

export function evaluarDia(dia, porFecha, normas) {
  const tipo = tipoDia(dia.fecha, porFecha, normas);
  const L = normas.limites || {};
  const checks = [];

  if (L.total?.[tipo] != null) {
    checks.push({ clave: 'total', nombre: 'Tiempo total', valor: dia.total, limite: L.total[tipo], nivel: nivelLimite(dia.total, L.total[tipo], normas) });
  }
  for (const [cat, lim] of Object.entries(L.categorias || {})) {
    const v = dia.categorias?.[cat];
    if (lim[tipo] == null) continue;
    checks.push(v == null
      ? { clave: 'cat:' + cat, nombre: cat, valor: null, limite: lim[tipo], nivel: 'sin_datos' }
      : { clave: 'cat:' + cat, nombre: cat, valor: v, limite: lim[tipo], nivel: nivelLimite(v, lim[tipo], normas) });
  }
  for (const [app, lim] of Object.entries(L.apps || {})) {
    if (lim[tipo] == null) continue;
    if (!dia.apps) { checks.push({ clave: 'app:' + app, nombre: app, valor: null, limite: lim[tipo], nivel: 'sin_datos' }); continue; }
    const v = dia.apps[app] ?? 0;
    checks.push({ clave: 'app:' + app, nombre: app, valor: v, limite: lim[tipo], nivel: nivelLimite(v, lim[tipo], normas) });
  }

  const N = normas.noche;
  if (N) {
    if (!dia.horas) {
      checks.push({ clave: 'noche', nombre: 'Uso nocturno', valor: null, limite: N.tolerancia_min, nivel: 'sin_datos' });
    } else {
      // Madrugada de este día (00:00 → hasta) + noche que empieza hoy (desde → 24:00).
      // La hora de inicio depende de si mañana es lectivo o fin de semana.
      const manana = tipoDia(sumarDias(dia.fecha, 1), porFecha, normas);
      const desde = manana === 'lectivo' ? N.desde_antes_de_lectivo : N.desde_antes_de_fin_de_semana;
      const v = minutosEntre(dia.horas, 0, N.hasta) + minutosEntre(dia.horas, Math.min(desde, 24), 24);
      const nivel = v <= N.tolerancia_min ? 'ok' : v <= (N.ambar_hasta_min ?? 30) ? 'ambar' : 'rojo';
      checks.push({ clave: 'noche', nombre: 'Uso nocturno', valor: v, limite: N.tolerancia_min, nivel });
    }
  }

  const C = normas.horario_clase;
  if (C?.activo && tipo === 'lectivo') {
    if (!dia.horas) {
      checks.push({ clave: 'clase', nombre: 'En horario de clase', valor: null, limite: C.max_min, nivel: 'sin_datos' });
    } else {
      const v = minutosEntre(dia.horas, C.desde, C.hasta);
      checks.push({ clave: 'clase', nombre: 'En horario de clase', valor: v, limite: C.max_min, nivel: nivelLimite(v, C.max_min, normas) });
    }
  }

  const conDatos = checks.filter(c => c.nivel !== 'sin_datos');
  const peor = conDatos.reduce((a, c) => Math.max(a, NIVEL[c.nivel]), conDatos.length ? 0 : -1);
  const nivel = ['ok', 'ambar', 'rojo'][peor] || 'sin_datos';
  return { fecha: dia.fecha, tipo, checks, nivel };
}

// Resumen de un conjunto de días (una semana normalmente)
export function resumirDias(dias, porFecha, normas) {
  const evals = dias.map(d => evaluarDia(d, porFecha, normas));
  let puntos = 0, n = 0;
  for (const e of evals) for (const c of e.checks) {
    if (c.nivel === 'sin_datos') continue;
    n++; puntos += c.nivel === 'ok' ? 1 : c.nivel === 'ambar' ? 0.5 : 0;
  }
  const media = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
  const lect = dias.filter((d, i) => evals[i].tipo === 'lectivo').map(d => d.total);
  const finde = dias.filter((d, i) => evals[i].tipo === 'fin_de_semana').map(d => d.total);
  const noche = evals.map(e => e.checks.find(c => c.clave === 'noche')).filter(c => c && c.valor != null);
  const apps = {};
  for (const d of dias) for (const [a, m] of Object.entries(d.apps || {})) apps[a] = (apps[a] || 0) + m;
  return {
    evals,
    nota: n ? Math.round((puntos / n) * 100) / 10 : null,
    media_total: media(dias.map(d => d.total)),
    media_lectivo: media(lect),
    media_fin_de_semana: media(finde),
    noche_total: noche.reduce((a, c) => a + c.valor, 0),
    noches_con_uso: noche.filter(c => c.valor > (normas.noche?.tolerancia_min ?? 0)).length,
    cuenta: { ok: evals.filter(e => e.nivel === 'ok').length, ambar: evals.filter(e => e.nivel === 'ambar').length, rojo: evals.filter(e => e.nivel === 'rojo').length },
    apps: Object.entries(apps).sort((a, b) => b[1] - a[1]),
  };
}

export const ETIQUETA_NIVEL = { ok: 'Correcto', ambar: 'Algo por encima', rojo: 'Por encima', sin_datos: 'Sin datos' };
