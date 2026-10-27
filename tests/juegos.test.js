// ANA LAB · Pruebas de los juegos del tema (JavaScriptCore + DOM mínimo).
let fallos = 0;
const falla = m => { fallos++; print("✗ " + m); };
const S = window.__SEMANA;
const app = () => window.__app;
const boton = txt => app().querySelectorAll("button").find(b => b.textContent.indexOf(txt) >= 0);
function pulsa(txt) { const b = boton(txt); if (!b) throw new Error("no encuentro el botón «" + txt + "»"); b.click(); }

function semana({ bien, reto }) {
  location.search = reto ? "?reto=" + reto : "";
  (document._l.DOMContentLoaded || []).forEach(f => f());
  pulsa(reto ? "Empezar el reto" : "Empezar la semana");
  for (let d = 0; d < 5; d++) {
    pulsa("Empezar el día");
    const e = S.estado;
    e.pedido.forEach(l => { l.inp.value = String(bien ? l.pedir : l.pedir + 1); });
    pulsa("Enviar el vale"); pulsa("Llega el pedido");
    e.recepcion.forEach(l => { const sol = S.correctaRecepcion(l); l.sel.value = bien ? sol : (sol === "aceptar" ? "rechazar" : "aceptar"); });
    pulsa("Firmar el albarán"); pulsa("Colocar el género");
    const o = e.ordenFefo(); const sol = e.fefo.solucion;
    if (bien) o.splice(0, o.length, ...sol); else o.splice(0, o.length, ...sol.slice().reverse());
    e.almacen.forEach(a => { a.sel.value = a.cat; });
    pulsa("Comprobar la colocación"); pulsa("Cerrar el día");
    e.residuos.forEach(a => { a.sel.value = a.cat; });
    pulsa("Comprobar el cierre"); pulsa("Ver el resumen del día");
    if (!bien && !e.consecuencias.length) falla("jugando mal no hay consecuencias");
    pulsa(d < 4 ? "Empezar el" : "Ver el resultado");
  }
  return S.estado;
}

let partidas = 0;
for (let i = 0; i < 300; i++) {
  try {
    const e = semana({ bien: true, reto: i % 10 === 0 ? "AULA" + (i % 3) : "" });
    if (e.puntos !== e.max) falla(`partida ${i}: jugando bien ${e.puntos}/${e.max}`);
    if (e.max < 100) falla(`partida ${i}: demasiado corta (${e.max})`);
    if (e.reto) { pulsa("Generar mi código"); } // sin nº de lista no genera: no debe romper
    partidas++;
    const m = semana({ bien: false, reto: "" });
    if (m.puntos >= m.max) falla(`partida ${i}: jugando mal puntúa el máximo`);
    partidas++;
  } catch (e) { falla(`partida ${i}: ${e}\n${e.stack}`); break; }
}
// El reto de clase produce la misma semana para todos
function huella(reto) { location.search = "?reto=" + reto; (document._l.DOMContentLoaded || []).forEach(f => f()); pulsa("Empezar el reto"); pulsa("Empezar el día"); return S.estado.pedido.map(l => l.p.id + l.apertura + l.existencias).join(); }
if (huella("CLASE1") !== huella("CLASE1")) falla("el reto de clase no reproduce la misma semana");
if (huella("CLASE1") === huella("CLASE2")) falla("retos distintos dan la misma semana");
print(`Semanas simuladas: ${partidas}`);
print(fallos ? `❌ ${fallos} fallos` : "✅ Juego «Semana de barra» correcto");
if (fallos) throw new Error("fallos");
