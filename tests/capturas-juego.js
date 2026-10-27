const S = window.__SEMANA;
const boton = txt => window.__app.querySelectorAll("button").find(b => b.textContent.indexOf(txt) >= 0);
function captura(n) { print("@@@" + n); print(window.__app.outerHTML); }
location.search = "";
(document._l.DOMContentLoaded || []).forEach(f => f());
captura("j1-inicio");
boton("Empezar la semana").click(); boton("Empezar el día").click();
captura("j2-pedido");
S.estado.pedido.forEach((l, i) => { l.inp.value = String(i === 0 ? l.pedir + 1 : l.pedir); });
boton("Enviar el vale").click(); captura("j3-pedido-corregido");
boton("Llega el pedido").click();
S.estado.recepcion.forEach(l => { l.sel.value = S.correctaRecepcion(l); });
boton("Firmar").click(); captura("j4-recepcion");
