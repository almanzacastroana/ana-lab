#!/bin/sh
# ANA LAB · Ejecuta las pruebas de un tema con JavaScriptCore (incluido en macOS).
# Uso: sh tests/ejecutar.sh modulos/3038/t1
set -e
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
TEMA=${1:?Indica la carpeta del tema, p. ej. modulos/3038/t1}
cd "$(dirname "$0")/.."
for f in js/secuencia/*.js js/juegos/*.js "$TEMA"/datos/*.js; do
  printf "checkSyntax('%s')\n" "$f" > "${TMPDIR:-/tmp}/analab-cs.js"
  "$JSC" "${TMPDIR:-/tmp}/analab-cs.js"
done
"$JSC" tests/dom-minimo.js js/secuencia/core.js js/secuencia/generadores.js js/secuencia/retos.js \
  "$TEMA"/datos/banco.js "$TEMA"/datos/sesiones.js js/secuencia/player.js tests/secuencia.test.js
"$JSC" tests/dom-minimo.js js/secuencia/core.js js/secuencia/generadores.js js/secuencia/retos.js \
  "$TEMA"/datos/banco.js js/juegos/semana.js tests/juegos.test.js
"$JSC" tests/dom-minimo.js js/secuencia/core.js js/secuencia/generadores.js js/secuencia/retos.js \
  "$TEMA"/datos/banco.js js/juegos/entrena.js tests/entrena.test.js
