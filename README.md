# Uso del móvil

Panel familiar de seguimiento del tiempo de pantalla a partir de los pantallazos de *Tiempo de uso* del iPhone.

- Web estática en `docs/` (GitHub Pages). Los datos van **cifrados** (`docs/datos.enc`, AES-256-GCM con clave derivada de una contraseña); sin la contraseña no se pueden leer.
- `docs/normas.json`: normas de referencia (parametrizables) con las que se valora cada día.
- `tools/publicar.mjs`: valida y cifra los datos locales (`privado/`, fuera del repositorio).
- `tools/resumen.mjs` + `.github/workflows/resumen-semanal.yml`: resumen semanal por correo.

No se guardan imágenes, nombres ni contenidos: solo minutos por día, categoría, app y hora.

## Empezar de cero (borrar todos los días)

En una terminal (símbolo del sistema, PowerShell o Git Bash), desde la carpeta del proyecto:

```
cd C:\Users\javie\Proyectos\uso-movil
node tools\reiniciar.mjs
```

Hay que escribir `node` delante; si se escribe solo el nombre del archivo, Windows lo abre en el editor en lugar de ejecutarlo.

Qué hace:

1. Guarda una copia de los datos actuales en `privado\copia-<fecha>.json` (solo en este ordenador).
2. Borra todos los días registrados.
3. Publica la web vacía (cifra, commit y push). En 1-2 minutos la web muestra «Aún no hay datos».

No toca las normas, la contraseña, el correo semanal ni la carpeta de Drive.

Para recuperar una copia: copia `privado\copia-<fecha>.json` sobre `privado\datos.json` y ejecuta `node tools\publicar.mjs`; después `git add docs/datos.enc`, `git commit -m "Restaurar datos"` y `git push`.
