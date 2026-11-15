# Uso del móvil: cómo actualizar

Cuando el usuario pase pantallazos de *Tiempo de uso* del iPhone (vista de un día):

1. Lee de cada pantallazo: fecha ("Ayer, 14 de noviembre" → la fecha real; "Hoy" = día incompleto: guárdalo con `"parcial": true` y una nota con la hora, y sustitúyelo entero cuando llegue el día completo), las categorías que aparezcan (iPhone muestra solo 3) y el total del iPhone. **El `total` del día es la suma de esas categorías** (lo gris no cuenta); el total que muestra el iPhone se guarda en `total_iphone` y no se usa en la web, todas las apps de "Más usadas" con sus minutos y, si se ve el gráfico por horas, los minutos de cada hora (24 valores, `horas_aprox: true`). Escala del gráfico por horas: líneas de 0, 30 min y 1 h.
2. Añade o sustituye el día en `privado/datos.json` (formato: ver días existentes). Opcional: `"festivo": true` (cuenta como fin de semana) y `"nota"`.
3. `node tools/publicar.mjs` (valida y cifra a `docs/datos.enc` con `privado/clave.txt`). Si falla la validación, revisa la lectura del pantallazo.
4. `git add docs/datos.enc && git commit -m "Datos AAAA-MM-DD" && git push`. La web se actualiza en 1-2 minutos.
5. Resume al usuario en 2-3 líneas el día: total, semáforo y qué norma se ha pasado.

Origen de los pantallazos: Google Drive del usuario (conector de Google Drive), carpeta «Uso móvil» (id `1lrRldnpUHqCeuox2KUzTIZgz0mJuHzD0`). Busca las imágenes con `parentId = '<id>'`, descárgalas y, tras publicar, muévelas a «Procesados» (id `15UjVC7aHUyp9dxFrIz6T3AzHXEApjrOD`). Si un día solo tiene un pantallazo, procésalo igual y avisa de lo que falta. También puede pegarlos directamente en el chat.

Reiniciar (empezar de cero): `node tools/reiniciar.mjs` (copia de seguridad en `privado/copia-*.json`, vacía los días y publica). Solo si el usuario lo pide; detalles en README.md.

Reglas:
- **Nunca** subas `privado/` ni escribas la contraseña o los datos en claro en el repositorio (es público). Tampoco nombres ni correos.
- Si `privado/datos.json` no existe (otro equipo), recupéralo: `node tools/publicar.mjs --descifrar` (necesita `privado/clave.txt` o `CLAVE`).
- Las normas están en `docs/normas.json` (minutos, `lectivo` / `fin_de_semana`). La lógica de evaluación está en `docs/evaluar.js` y la usan la web y el correo.
