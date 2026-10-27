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
modulos/3038/         Página del módulo y, dentro, un directorio por tema
```

## Ver la web en local

```sh
python3 -m http.server 8000
```

y abrir <http://localhost:8000>.

## Reglas

- **Nunca** se suben nombres, notas, fotos ni datos del alumnado.
- Las soluciones, exámenes y evaluaciones **no** se publican aquí: siguen en Drive.
- Nada se publica sin la aprobación de Ana.
