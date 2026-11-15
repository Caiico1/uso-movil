// Cifra privado/datos.json -> docs/datos.enc con la contraseña de privado/clave.txt
// (o de la variable CLAVE). Valida los datos antes de cifrar.
//   node tools/publicar.mjs            cifra
//   node tools/publicar.mjs --descifrar   recupera privado/datos.json desde docs/datos.enc
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { cifrar, descifrar } from '../docs/cripto.js';

const raiz = new URL('..', import.meta.url);
const ruta = p => new URL(p, raiz);

function leerClave() {
  if (process.env.CLAVE) return process.env.CLAVE.trim();
  if (existsSync(ruta('privado/clave.txt'))) return readFileSync(ruta('privado/clave.txt'), 'utf8').trim();
  throw new Error('Falta la contraseña: privado/clave.txt o variable CLAVE');
}

function validar(datos) {
  const errores = [];
  const vistas = new Set();
  for (const d of datos.dias) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.fecha)) errores.push(`fecha mal escrita: ${d.fecha}`);
    if (vistas.has(d.fecha)) errores.push(`fecha repetida: ${d.fecha}`);
    vistas.add(d.fecha);
    if (typeof d.total !== 'number') errores.push(`${d.fecha}: falta total`);
    const suma = o => Object.values(o || {}).reduce((a, b) => a + b, 0);
    // iPhone solo muestra las 3 categorías principales: el resto se ve en la web como "Otras"
    if (d.categorias && suma(d.categorias) > d.total + 5) errores.push(`${d.fecha}: categorías suman ${suma(d.categorias)} y el total es ${d.total}`);
    if (d.apps && suma(d.apps) > d.total + 5) errores.push(`${d.fecha}: las apps suman más que el total`);
    if (d.horas && d.horas.length !== 24) errores.push(`${d.fecha}: 'horas' debe tener 24 valores`);
    if (d.horas && Math.abs(suma(d.horas) - d.total) > 20) console.warn(`aviso ${d.fecha}: horas suman ${suma(d.horas)} frente a total ${d.total}`);
  }
  if (errores.length) throw new Error('Datos no válidos:\n- ' + errores.join('\n- '));
  datos.dias.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return datos;
}

const clave = leerClave();
if (process.argv.includes('--descifrar')) {
  const texto = await descifrar(readFileSync(ruta('docs/datos.enc'), 'utf8'), clave);
  writeFileSync(ruta('privado/datos.json'), JSON.stringify(JSON.parse(texto), null, 2) + '\n');
  console.log('Recuperado privado/datos.json');
} else {
  const datos = validar(JSON.parse(readFileSync(ruta('privado/datos.json'), 'utf8')));
  datos.actualizado = new Date().toISOString();
  writeFileSync(ruta('docs/datos.enc'), await cifrar(JSON.stringify(datos), clave));
  // Comprobación: se puede descifrar
  JSON.parse(await descifrar(readFileSync(ruta('docs/datos.enc'), 'utf8'), clave));
  const u = datos.dias.at(-1);
  console.log(`Cifrado docs/datos.enc: ${datos.dias.length} días, último ${u.fecha}`);
}
