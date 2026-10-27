# ANA LAB

Web de materiales de Formación Profesional de Hostelería: secuencias de clase, juegos para casa y fichas del alumnado.

- **Método de trabajo:** `METODO_ANA_LAB.md` (en Google Drive, carpeta `ANA LAB/`).
- **Originales editables** (Word, documentación, fotos en alta resolución): siguen en Drive. Aquí solo vive lo que se publica.
- **Tecnología:** HTML, CSS y JavaScript nativos. Sin compilación ni dependencias. Se publica tal cual con GitHub Pages.

## Estructura

```text
index.html            Portal (se pinta desde js/catalogo.js)
js/catalogo.js        Módulos, temas, estado y enlaces → publicar un material = editar aquí
css/                  tokens.css · base.css · components.css
assets/fonts/         Tipografías OFL alojadas aquí (sin llamadas a Google)
assets/img/           Imágenes (cada una con su ficha en assets/CREDITOS.md)
modulos/3038/         Página del módulo y, dentro, un directorio por tema (t1/clase · t1/juegos · t1/ficha · t1/datos · t1/img)
js/secuencia/         Motor común: núcleo, generadores, retos y reproductor de sesiones
js/juegos/            Juegos reutilizables (semana.js, entrena.js)
```

## Ver la web en local

```sh
python3 -m http.server 8000
```

y abrir <http://localhost:8000>.

## Pruebas

```sh
sh tests/ejecutar.sh modulos/3038/t1
```

Usa JavaScriptCore (incluido en macOS) y un DOM mínimo (`tests/dom-minimo.js`): comprueba la sintaxis, pinta y responde todos los retos, recorre todas las pantallas de la clase y simula cientos de partidas de los juegos.

## Reglas

- **Nunca** se suben nombres, notas, fotos ni datos del alumnado.
- Las soluciones, exámenes y evaluaciones **no** se publican aquí: siguen en Drive.
- Nada se publica sin la aprobación de Ana.
