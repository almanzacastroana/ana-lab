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
    pulsa("Firmar y enviar el vale"); pulsa("Llega un proveedor");
    e.recepcion.forEach(l => { const sol = S.correctaRecepcion(l); l.sel.value = bien ? sol : (sol === "aceptar" ? "rechazar_envase" : "aceptar"); });
    const fs = S.firmaCorrecta(); e.firmaSel.value = bien ? fs : (fs === "reservas" ? "conforme" : "reservas");
    pulsa("Firmar el albarán");
    if (bien && e.obs.textContent === "") falla("las observaciones del albarán no se escriben");
    for (const l of e.recepcion) comprobarLinea(l); pulsa("Colocar el género");
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

// Coherencia de cada línea del muelle: una sola incidencia y datos que la sostienen.
const vistos = {};
function comprobarLinea(l) {
  const sol = S.correctaRecepcion(l); vistos[sol] = (vistos[sol] || 0) + 1;
  if (l.llegado < 1 || l.albaran < 1) falla("cantidades imposibles " + JSON.stringify([l.pedido, l.albaran, l.llegado]));
  const fria = l.p.cerrado === "refrigeracion", cong = l.p.cerrado === "congelacion";
  const tempMala = l.temp != null && ((fria && (l.temp > 4 || l.temp < 0)) || (cong && l.temp > -18));
  if ((sol === "rechazar_temp") !== tempMala) falla(`temperatura incoherente: ${l.p.id} ${l.temp} ${sol}`);
  const hoy = S.estado.hoy;
  const fechaMala = l.fechaTipo === "cad" && l.fecha <= hoy;
  if ((sol === "rechazar_fecha") !== fechaMala) falla(`fecha incoherente: ${l.p.id} ${sol}`);
  if ((sol === "rechazar_envase") !== !!l.envase) falla(`envase incoherente: ${l.p.id} ${sol}`);
  if (sol !== "albaran_distinto" && l.tipo !== "albaran_distinto" && (l.pedido !== l.albaran || l.pedidoP !== l.p)) falla("albarán distinto sin detectar");
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
for (const k of Object.keys(S.ACC)) if (!vistos[k]) falla("la incidencia «" + k + "» nunca sale");
print(`Semanas simuladas: ${partidas} · líneas de recepción comprobadas: ${Object.values(vistos).reduce((a, b) => a + b, 0)} (${JSON.stringify(vistos)})`);
print(fallos ? `❌ ${fallos} fallos` : "✅ Juego «Semana de barra» correcto");
if (fallos) throw new Error("fallos");
