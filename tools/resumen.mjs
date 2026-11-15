// Genera el resumen semanal (lunes a domingo) en HTML para enviarlo por correo.
//   CLAVE=... node tools/resumen.mjs [--semana AAAA-MM-DD] [--salida carpeta]
// Por defecto, la semana que terminó el domingo pasado (hora de Madrid).
// Escribe <salida>/resumen.html y <salida>/asunto.txt
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { descifrar } from '../docs/cripto.js';
import { resumirDias, fmtMin, fechaCorta, fechaLarga, sumarDias, lunesDe, ETIQUETA_NIVEL } from '../docs/evaluar.js';

const raiz = new URL('..', import.meta.url);
const arg = n => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : null; };
const clave = process.env.CLAVE?.trim() || (existsSync(new URL('privado/clave.txt', raiz)) ? readFileSync(new URL('privado/clave.txt', raiz), 'utf8').trim() : null);
if (!clave) throw new Error('Falta CLAVE');

let datos;
try {
  datos = JSON.parse(await descifrar(readFileSync(new URL('docs/datos.enc', raiz), 'utf8'), clave));
} catch (e) {
  // Diagnóstico sin revelar la clave: longitud y huella corta
  const { createHash } = await import('node:crypto');
  const raw = process.env.CLAVE || '';
  console.error(`No se pudo descifrar. CLAVE: ${clave.length} caracteres (sin recortar ${raw.length}), huella ${createHash('sha256').update(clave).digest('hex').slice(0, 6)}`);
  throw e;
}
const normas = JSON.parse(readFileSync(new URL('docs/normas.json', raiz), 'utf8'));
const porFecha = Object.fromEntries(datos.dias.map(d => [d.fecha, d]));

const hoyMadrid = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid' }).format(new Date());
const lun = arg('--semana') ? lunesDe(arg('--semana')) : sumarDias(lunesDe(hoyMadrid), -7);
const dom = sumarDias(lun, 6);
const sem = datos.dias.filter(d => d.fecha >= lun && d.fecha <= dom);
const ant = datos.dias.filter(d => d.fecha >= sumarDias(lun, -7) && d.fecha < lun);
const r = resumirDias(sem, porFecha, normas);
const ra = ant.length ? resumirDias(ant, porFecha, normas) : null;

const COLOR = { ok: '#0ca30c', ambar: '#fab219', rojo: '#d03b3b', sin_datos: '#c3c2b7' };
const ICONO = { ok: '✓', ambar: '!', rojo: '✕', sin_datos: '?' };
const faltan = [];
for (let i = 0; i < 7; i++) { const f = sumarDias(lun, i); if (!porFecha[f]) faltan.push(fechaCorta(f)); }

let comp = 'sin datos de la semana anterior';
if (ra?.media_total != null && r.media_total != null) {
  const d = Math.round(r.media_total - ra.media_total);
  comp = Math.abs(d) < 5 ? 'igual que la semana anterior' : d < 0 ? `${fmtMin(-d)} menos al día que la semana anterior` : `${fmtMin(d)} más al día que la semana anterior`;
}

// Normas más incumplidas
const fallos = {};
for (const e of r.evals) for (const c of e.checks) if (c.nivel === 'ambar' || c.nivel === 'rojo') fallos[c.nombre] = (fallos[c.nombre] || 0) + 1;
const fallosTxt = Object.entries(fallos).sort((a, b) => b[1] - a[1]).map(([n, k]) => `${n}: ${k} día${k > 1 ? 's' : ''}`);

const filas = r.evals.map((e, i) => {
  const d = sem[i];
  const n = e.checks.find(c => c.clave === 'noche');
  return `<tr>
    <td style="padding:6px 8px;border-top:1px solid #e1e0d9">${fechaCorta(d.fecha)}</td>
    <td style="padding:6px 8px;border-top:1px solid #e1e0d9;text-align:right">${fmtMin(d.total)}${d.aprox ? ' ≈' : ''}</td>
    <td style="padding:6px 8px;border-top:1px solid #e1e0d9;text-align:right">${n?.valor == null ? '—' : fmtMin(n.valor)}</td>
    <td style="padding:6px 8px;border-top:1px solid #e1e0d9"><span style="display:inline-block;width:16px;height:16px;line-height:16px;text-align:center;border-radius:8px;background:${COLOR[e.nivel]};color:${e.nivel === 'ambar' ? '#0b0b0b' : '#fff'};font-size:11px;font-weight:700">${ICONO[e.nivel]}</span> ${ETIQUETA_NIVEL[e.nivel]}</td>
  </tr>`;
}).join('');

const web = process.env.WEB_URL || 'https://caiico1.github.io/uso-movil/';
const nota = r.nota == null ? '—' : r.nota.toLocaleString('es-ES');
const html = `<!doctype html><html><body style="margin:0;background:#f9f9f7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#0b0b0b">
<div style="max-width:560px;margin:0 auto;padding:20px 16px">
  <h1 style="font-size:20px;margin:0 0 4px">Uso del móvil · resumen semanal</h1>
  <p style="color:#52514e;margin:0 0 16px;font-size:14px">Del ${fechaLarga(lun)} al ${fechaLarga(dom)}</p>
  ${sem.length === 0 ? '<p>No hay datos de esta semana. ¿Se os olvidó mandar los pantallazos?</p>' : `
  <div style="background:#fcfcfb;border:1px solid #e1e0d9;border-radius:12px;padding:16px">
    <div style="font-size:13px;color:#52514e">Nota de la semana</div>
    <div style="font-size:34px;font-weight:700">${nota} <span style="font-size:16px;color:#898781">/ 10</span></div>
    <p style="margin:8px 0 0;font-size:14px">Media diaria: <b>${fmtMin(r.media_total)}</b> (${comp}).<br>
    Entre semana: ${fmtMin(r.media_lectivo)} · fin de semana: ${fmtMin(r.media_fin_de_semana)}.<br>
    Uso nocturno total: ${fmtMin(r.noche_total)} (${r.noches_con_uso} noche${r.noches_con_uso === 1 ? '' : 's'} por encima de la tolerancia).<br>
    Días: ✓ ${r.cuenta.ok} correctos · ! ${r.cuenta.ambar} algo por encima · ✕ ${r.cuenta.rojo} por encima.</p>
    ${fallosTxt.length ? `<p style="margin:8px 0 0;font-size:14px">Normas que más se han pasado: ${fallosTxt.join('; ')}.</p>` : ''}
    ${r.apps.length ? `<p style="margin:8px 0 0;font-size:14px">Apps más usadas: ${r.apps.slice(0, 5).map(([a, m]) => `${a} ${fmtMin(m)}`).join(' · ')}.</p>` : ''}
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:14px;background:#fcfcfb;border:1px solid #e1e0d9;border-radius:12px">
    <tr style="color:#52514e;font-size:12px"><th style="text-align:left;padding:8px">Día</th><th style="text-align:right;padding:8px">Total</th><th style="text-align:right;padding:8px">Noche</th><th style="text-align:left;padding:8px">Estado</th></tr>
    ${filas}
  </table>`}
  ${faltan.length && sem.length ? `<p style="font-size:13px;color:#8a5a00">Faltan datos de: ${faltan.join(', ')}.</p>` : ''}
  <p style="font-size:14px;margin-top:16px"><a href="${web}" style="color:#2a78d6">Ver gráficas en la web</a></p>
  <p style="font-size:12px;color:#898781">Valoración orientativa frente a unas normas de referencia, solo para seguimiento.</p>
</div></body></html>`;

const asunto = sem.length ? `Uso del móvil: semana del ${fechaCorta(lun)} · nota ${nota}/10 · media ${fmtMin(r.media_total)}/día` : `Uso del móvil: sin datos de la semana del ${fechaCorta(lun)}`;
const salida = arg('--salida') || '.';
mkdirSync(salida, { recursive: true });
writeFileSync(`${salida}/resumen.html`, html);
writeFileSync(`${salida}/asunto.txt`, asunto);
console.log(asunto);
