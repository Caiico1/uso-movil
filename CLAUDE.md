# Uso del móvil: cómo actualizar

Cuando el usuario pase pantallazos de *Tiempo de uso* del iPhone (vista de un día):

1. Lee de cada pantallazo: fecha ("Ayer, 14 de noviembre" → la fecha real; "Hoy" = día incompleto: guárdalo con `"parcial": true` y una nota con la hora, y sustitúyelo entero cuando llegue el día completo), total, las categorías que aparezcan (iPhone muestra solo 3; el resto se ve como "Otras"), todas las apps de "Más usadas" con sus minutos y, si se ve el gráfico por horas, los minutos de cada hora (24 valores, `horas_aprox: true`). Escala del gráfico por horas: líneas de 0, 30 min y 1 h.
2. Añade o sustituye el día en `privado/datos.json` (formato: ver días existentes). Opcional: `"festivo": true` (cuenta como fin de semana) y `"nota"`.
3. `node tools/publicar.mjs` (valida y cifra a `docs/datos.enc` con `privado/clave.txt`). Si falla la validación, revisa la lectura del pantallazo.
4. `git add docs/datos.enc && git commit -m "Datos AAAA-MM-DD" && git push`. La web se actualiza en 1-2 minutos.
5. Resume al usuario en 2-3 líneas el día: total, semáforo y qué norma se ha pasado.

Reglas:
- **Nunca** subas `privado/` ni escribas la contraseña o los datos en claro en el repositorio (es público). Tampoco nombres ni correos.
- Si `privado/datos.json` no existe (otro equipo), recupéralo: `node tools/publicar.mjs --descifrar` (necesita `privado/clave.txt` o `CLAVE`).
- Las normas están en `docs/normas.json` (minutos, `lectivo` / `fin_de_semana`). La lógica de evaluación está en `docs/evaluar.js` y la usan la web y el correo.
