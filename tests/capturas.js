// Pinta estados representativos y los imprime como HTML estático (para revisarlos con QuickLook).
const AL = window.AL, B = window.BANCO, cat = B.catalogo;
(document._l.DOMContentLoaded || []).forEach(f => f());
function captura(nombre) { print("@@@" + nombre); print(window.__app.outerHTML); }
function ir(h) { location.hash = h; (window.__winL.hashchange || []).forEach(f => f()); }
ir(""); captura("01-indice");
ir("#S02/0"); captura("02-portada-S02");
ir("#S02/3"); captura("03-idea-zonas-S02");
ir("#S04/4"); captura("04-reto-calculo-S04");
// Responder un reto con un fallo y un acierto para ver la retroalimentación
ir("#S07/12");
let op = window.__app.querySelectorAll(".opciones .opcion");
if (op.length) { op[0].click(); }
captura("05-reto-feedback-S07");
ir("#S06/12"); captura("06-recepcion-S06");
ir("#S09/9"); captura("07-fefo-S09");
