// Borra todos los días registrados para empezar de cero.
// Guarda antes una copia en privado/copia-AAAA-MM-DD-HHMM.json (solo en este ordenador)
// y publica la web vacía (cifra, commit y push).
//   node tools/reiniciar.mjs
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const ruta = p => raiz + p;
const sh = c => execSync(c, { cwd: raiz, stdio: 'inherit' });

if (!existsSync(ruta('privado/clave.txt'))) throw new Error('Falta privado/clave.txt');

if (existsSync(ruta('privado/datos.json'))) {
  const n = JSON.parse(readFileSync(ruta('privado/datos.json'), 'utf8')).dias?.length ?? 0;
  const sello = new Date().toISOString().slice(0, 16).replace('T', '-').replace(':', '');
  copyFileSync(ruta('privado/datos.json'), ruta(`privado/copia-${sello}.json`));
  console.log(`Copia de seguridad (${n} días): privado/copia-${sello}.json`);
}
writeFileSync(ruta('privado/datos.json'), JSON.stringify({ dias: [] }, null, 2) + '\n');

sh('node tools/publicar.mjs');
sh('git add docs/datos.enc');
sh('git commit -q -m "Reinicio de datos: se empieza de cero"');
sh('git push -q');
console.log('Listo: la web estará vacía en 1-2 minutos.');
