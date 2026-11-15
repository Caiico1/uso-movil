# Uso del móvil

Panel familiar de seguimiento del tiempo de pantalla a partir de los pantallazos de *Tiempo de uso* del iPhone.

- Web estática en `docs/` (GitHub Pages). Los datos van **cifrados** (`docs/datos.enc`, AES-256-GCM con clave derivada de una contraseña); sin la contraseña no se pueden leer.
- `docs/normas.json`: normas de referencia (parametrizables) con las que se valora cada día.
- `tools/publicar.mjs`: valida y cifra los datos locales (`privado/`, fuera del repositorio).
- `tools/resumen.mjs` + `.github/workflows/resumen-semanal.yml`: resumen semanal por correo.

No se guardan imágenes, nombres ni contenidos: solo minutos por día, categoría, app y hora.
