// ANA LAB · Pruebas de la secuencia del tema (JavaScriptCore, sin navegador).
// Ejecutar desde la raíz del repo:  sh tests/ejecutar.sh modulos/3038/t1
// 1) Integridad: cada pantalla «reto» apunta a un hueco que existe en el banco publicado.
// 2) Generadores: 10.000 instancias por motor con solución única y válida.
// 3) Retos: cada reto publicable se pinta con 30 semillas y, respondido CORRECTAMENTE, puntúa 1;
//    respondido mal (cuando es posible), puntúa menos de 1.
// 4) Reproductor: se recorren todas las pantallas de todas las sesiones sin errores.
let fallos = 0, ok = 0;
const falla = m => { fallos++; print("✗ " + m); };
const bien = () => { ok++; };
const AL = window.AL, B = window.BANCO, S = window.SECUENCIA, cat = B.catalogo;

// ───── 1. Integridad ─────
const porHueco = {};
for (const r of B.retos) for (const h of r.huecos || []) porHueco[h] = r;
for (const s of S.sesiones) {
  for (const m of ["repaso", "desarrollo", "salida"]) for (const p of s[m] || []) {
    if (p.t !== "reto") continue;
    if (!porHueco[`${s.id}.${p.h}`]) falla(`${s.id}.${p.h}: hueco sin reto en el banco publicado`); else bien();
  }
  if (s.fuera && !porHueco[s.fuera.h]) falla(`${s.id}: el reto fuera del aula apunta a ${s.fuera.h}, que no existe`);
}
if (B.retos.some(r => r.usos.length === 1 && r.usos[0] === "examen")) falla("el banco publicado contiene retos solo de examen");

// ───── 2. Generadores ─────
const N = 10000, rnd = AL.rng(20261027);
for (let i = 0; i < N; i++) {
  const nivel = 1 + (i % 3), g = AL.gen.reposicion(rnd, cat, { nivel });
  const esperado = Math.ceil(Math.max(0, g.apertura * g.factor - g.existencias) / (nivel === 3 ? g.producto.n : 1));
  if (!Number.isInteger(g.apertura * g.factor) || g.respuesta !== (nivel === 3 ? esperado : g.faltan) || g.respuesta < 0) { falla("reposición inválida " + JSON.stringify(g)); break; }
  const rc = AL.gen.recepcion(rnd, cat, { lineas: 3 + (i % 3) });
  if (!rc.lineas.some(l => l.solucion !== "correcta")) { falla("recepción sin discrepancias"); break; }
  for (const l of rc.lineas) if (AL.gen.resolverLinea(l) !== l.solucion || Math.min(l.pedido, l.albaran, l.llegado) < 1) { falla("recepción ambigua " + JSON.stringify(l)); i = N; break; }
  const f = AL.gen.fefo(rnd, cat, { unidades: 3 + (i % 4) });
  const cads = f.solucion.map(id => f.unidades.find(u => u.id === id).caduca);
  if (new Set(cads).size !== cads.length || cads.some((c, k) => k && c <= cads[k - 1])) { falla("FEFO inválido"); break; }
  const tr = AL.gen.traslado(rnd, cat);
  const cl = tr.solucion.map(id => cat.productos.find(p => p.id === id).traslado);
  if (new Set(cl).size !== cl.length || cl.some((c, k) => k && c <= cl[k - 1])) { falla("traslado ambiguo"); break; }
  const v = AL.gen.vale(rnd, cat, { lineas: 3 });
  if (v.filas.length !== 3 || v.filas.some(x => x.pedir < 1)) { falla("vale inválido"); break; }
}
bien();

// ───── 3. Retos: pintar y responder ─────
const N_ = window.__Nodo;
function botones(n) { return n.querySelectorAll("button"); }
function porTexto(nodos, txt) { return nodos.find(b => b.textContent.indexOf(txt) >= 0); }
function boton(n, txt) { return porTexto(botones(n), txt); }
const limpio = s => String(s).replace(/\*\*/g, "").replace(/\*/g, "");

function responderBien(r, nodo) {
  // Devuelve true si ha sabido responder este tipo de reto correctamente.
  const t = r.tipo;
  if (nodo.querySelector(".fases")) return "fases";
  if (r.motor === "reposicion") {
    // Recuperar la instancia: el enunciado generado contiene los datos; se recalcula con la misma lógica leyendo el texto.
    // Los datos van en negrita en el enunciado generado: se leen de ahí (los nombres de producto también llevan cifras).
    const html = nodo.querySelector(".reto-enun").innerHTML;
    const fuertes = (html.match(/<strong>([^<]+)<\/strong>/g) || []).map(x => x.replace(/<\/?strong>/g, ""));
    const num = x => Number(String(x).replace("×", "").replace(",", ".").match(/[\d.]+/g).pop());
    let resp;
    if (r.nivel === 1) resp = Math.max(0, num(fuertes[0]) - num(fuertes[1]));
    else if (r.nivel === 2) resp = Math.max(0, num(fuertes[0]) * num(fuertes[1]) - num(fuertes[2]));
    else {
      const conFactor = fuertes.length === 4;
      const ap = num(fuertes[0]), fac = conFactor ? num(fuertes[1]) : 1, ex = num(fuertes[conFactor ? 2 : 1]), n = num(fuertes[fuertes.length - 1]);
      resp = Math.ceil(Math.max(0, ap * fac - ex) / n);
    }
    nodo.querySelector("input").value = String(resp);
    boton(nodo, "Comprobar").click(); return true;
  }
  if (r.motor === "recepcion") {
    for (const fila of nodo.querySelectorAll(".rec-fila")) {
      const dd = fila.querySelectorAll("dd").map(d => Number(d.textContent));
      fila.querySelector("select").value = AL.gen.resolverLinea({ pedido: dd[0], albaran: dd[1], llegado: dd[2] });
    }
    boton(nodo, "Comprobar").click(); return true;
  }
  if (r.motor === "vale") {
    const filas = nodo.querySelectorAll("tbody tr").map(tr => tr.querySelectorAll("td").map(td => td.textContent));
    nodo.querySelectorAll(".vale-linea").forEach((l, i) => {
      const [, faltan, formato] = filas[i]; const n = Number(formato.split(" ").pop());
      l.querySelector("select").value = formato; l.querySelector("input").value = String(Math.ceil(Number(faltan) / n));
    });
    nodo.querySelectorAll("input").find(x => x.attrs.type === "text").value = "Bar-cafetería";
    nodo.querySelectorAll("input").find(x => x.attrs.type === "date").value = "2026-11-06";
    nodo.querySelectorAll("input").find(x => x.attrs.type === "checkbox").checked = true;
    boton(nodo, "Comprobar").click(); return true;
  }
  if (nodo.querySelector(".ordenar")) {
    // Reordenar con los botones ↑ hasta que coincida con la solución conocida.
    let objetivo;
    if (r.motor === "fefo") objetivo = nodo.querySelectorAll(".ordenar-t").map(x => x.innerHTML).slice().sort((a, b) => Number(/caduca el <strong>(\d+)/.exec(a)[1]) - Number(/caduca el <strong>(\d+)/.exec(b)[1]));
    else if (r.motor === "traslado") objetivo = nodo.querySelectorAll(".ordenar-t").map(x => x.innerHTML).slice().sort((a, b) => cat.productos.find(p => AL.fmt(p.nombre) === a).traslado - cat.productos.find(p => AL.fmt(p.nombre) === b).traslado);
    else objetivo = (r.pasos || r.elementos).map(x => AL.fmt(x));
    for (let pos = 0; pos < objetivo.length; pos++) {
      let guard = 0;
      while (nodo.querySelectorAll(".ordenar-t")[pos].innerHTML !== objetivo[pos] && guard++ < 50) {
        const items = nodo.querySelectorAll(".ordenar-item");
        const idx = items.findIndex(li => li.querySelector(".ordenar-t").innerHTML === objetivo[pos]);
        items[idx].querySelectorAll("button")[0].click();
      }
    }
    boton(nodo, "Comprobar").click();
    if (r.tipo === "priorizar") { const s = boton(nodo, "Sí"); s && s.click(); }
    return true;
  }
  if (nodo.querySelector(".clasificar")) {
    const els = r.elementos || null;
    for (const fila of nodo.querySelectorAll(".clas-fila")) {
      const texto = fila.querySelector(".clas-t").innerHTML;
      let correcto;
      if (els) correcto = (els.find(e => AL.fmt(e.t) === texto) || {});
      if (!correcto || !(correcto.cat || correcto.zona)) {
        // generables de catálogo
        const prod = cat.productos.find(p => AL.fmt(p.nombre) === texto || AL.fmt(p.nombre + " · cerrado") === texto || AL.fmt(p.nombre + " · abierto") === texto);
        const res = cat.residuos.find(x => AL.fmt(x.t) === texto);
        if (r.motor === "almacen") correcto = { cat: cat.almacenes[prod.almacen] };
        else if (r.motor === "conservacion") correcto = { cat: cat.conservacion[prod[texto.endsWith("abierto") ? "abierto" : "cerrado"]] };
        else if (r.motor === "residuos") correcto = { cat: cat.residuos_destinos[res.destino] };
      }
      const valor = correcto.cat || correcto.zona;
      const sel = fila.querySelector("select");
      if (sel) sel.value = valor; else fila.querySelectorAll("input").find(i => i.attrs.value === valor).checked = true;
    }
    boton(nodo, "Comprobar").click(); return true;
  }
  if (nodo.querySelector(".emparejar")) {
    for (const fila of nodo.querySelectorAll(".emp-fila")) { const a = fila.querySelector(".emp-a").innerHTML; fila.querySelector("select").value = r.pares.find(p => AL.fmt(p.a) === a).b; }
    boton(nodo, "Comprobar").click(); return true;
  }
  if (t === "detectar-errores" && r.elementos) {
    for (const b of nodo.querySelectorAll(".opciones .opcion")) { const e = r.elementos.find(x => AL.fmt(x.t) === b.querySelectorAll("span")[1].innerHTML); if (e.error) b.click(); }
    boton(nodo, "Comprobar").click(); return true;
  }
  if (t === "elegir-varias") {
    for (const b of nodo.querySelectorAll(".opciones .opcion")) { const o = r.opciones.find(x => AL.fmt(x.t) === b.querySelectorAll("span")[1].innerHTML); if (o.ok) b.click(); }
    boton(nodo, "Comprobar").click(); return true;
  }
  if (r.nodos) {
    let guard = 0;
    while (guard++ < 10) {
      const pasos = nodo.querySelectorAll(".paso");
      const ult = pasos[pasos.length - 1];
      if (ult.classList.contains("final")) break;
      const opc = ult.querySelectorAll("button").filter(b => !b.disabled);
      const nodoActual = Object.values(r.nodos).find(n => n.opciones && AL.fmt(n.texto) === ult.querySelector(".paso-s").innerHTML);
      const buena = nodoActual.opciones.find(o => o.ok);
      opc.find(b => b.querySelector("span").innerHTML === AL.fmt(buena.t)).click();
      boton(nodo, "Continuar").click();
    }
    return true;
  }
  if (r.pasos && typeof r.pasos[0] === "object") {
    for (let k = 0; k < r.pasos.length; k++) {
      const pasos = nodo.querySelectorAll(".paso"); const ult = pasos[pasos.length - 1];
      const buena = r.pasos[k].opciones.find(o => o.ok);
      ult.querySelectorAll("button").find(b => b.querySelector("span").innerHTML === AL.fmt(buena.t)).click();
      const sig = boton(nodo, "Siguiente paso"); if (sig) sig.click();
    }
    return true;
  }
  if (r.opciones) {
    const buena = r.opciones.find(o => o.ok);
    nodo.querySelectorAll(".opciones .opcion").find(b => b.querySelectorAll("span")[1].innerHTML === AL.fmt(buena.t)).click();
    return true;
  }
  if (r.documento) { nodo.querySelectorAll("input").forEach(i => (i.value = "x")); boton(nodo, "Comparar").click(); boton(nodo, "Sí").click(); return true; }
  if (r.respuesta_modelo || r.pauta || r.correccion) { const c = nodo.querySelector("textarea") || nodo.querySelector("input"); c.value = "mi respuesta"; boton(nodo, "Ver respuesta").click(); boton(nodo, "Sí").click(); return true; }
  return false;
}

let pintados = 0, respondidos = 0;
for (const r of B.retos) {
  for (let semilla = 1; semilla <= 30; semilla++) {
    let res = null;
    let nodo;
    try {
      nodo = AL.retos.crear(r, { rnd: AL.rng(semilla * 7919), catalogo: cat, compacto: semilla % 2 === 0, usarMuestra: semilla % 3 === 0, alTerminar: x => { if (!res) res = x; } });
    } catch (e) { falla(`${r.id} (semilla ${semilla}): error al pintar: ${e}`); break; }
    if (nodo.textContent.indexOf("tipo sin pintar") >= 0) { falla(`${r.id}: tipo sin pintar`); break; }
    pintados++;
    let pudo;
    try { pudo = responderBien(r, nodo); } catch (e) { falla(`${r.id} (semilla ${semilla}): error al responder: ${e}\n${e.stack}`); break; }
    if (pudo === "fases") break;
    if (!pudo) { falla(`${r.id}: la prueba no sabe responder este tipo`); break; }
    if (!res) { falla(`${r.id} (semilla ${semilla}): respondido sin resultado`); break; }
    if (res.puntos !== 1) { falla(`${r.id} (semilla ${semilla}): respuesta correcta puntuada ${res.puntos}`); break; }
    respondidos++;
  }
}
// Respuesta incorrecta: en retos de una opción, la primera incorrecta debe dar 0 aunque luego se acierte.
for (const r of B.retos.filter(x => x.opciones && !x.nodos && x.tipo !== "elegir-varias")) {
  let res = null;
  const nodo = AL.retos.crear(r, { rnd: AL.rng(3), catalogo: cat, alTerminar: x => { if (!res) res = x; } });
  const mala = r.opciones.find(o => !o.ok), buena = r.opciones.find(o => o.ok);
  const bs = nodo.querySelectorAll(".opciones .opcion");
  bs.find(b => b.querySelectorAll("span")[1].innerHTML === AL.fmt(mala.t)).click();
  if (res) { falla(`${r.id}: un fallo termina el reto`); continue; }
  if (nodo.querySelector(".reto-fb").textContent.indexOf("Todavía no") < 0) falla(`${r.id}: el fallo no muestra retroalimentación`);
  bs.find(b => b.querySelectorAll("span")[1].innerHTML === AL.fmt(buena.t)).click();
  if (!res || res.puntos !== 0) falla(`${r.id}: acierto tras fallo debería puntuar 0 en la salida (puntuó ${res && res.puntos})`); else bien();
}

// Caso integrado por fases: recorrer las 4 fases respondiendo bien.
for (const r of B.retos.filter(x => x.fases)) {
  let res = null;
  const nodo = AL.retos.crear(r, { rnd: AL.rng(11), catalogo: cat, alTerminar: x => { res = x; } });
  for (let k = 0; k < 4; k++) {
    const subs = nodo.querySelectorAll(".fases .reto");
    const sub = subs[subs.length - 1];
    const tipoSub = sub.attrs["data-tipo"];
    const fake = tipoSub === "completar-documento" ? { motor: "vale", tipo: tipoSub } : tipoSub === "simulacion" ? { motor: "recepcion", tipo: tipoSub } : { motor: k === 2 ? "almacen" : "residuos", tipo: "clasificar" };
    responderBien(fake, sub);
    const sig = boton(nodo, k < 3 ? "Siguiente fase" : "Terminar el caso"); if (sig) sig.click();
  }
  if (!res || res.puntos !== 1) falla(`${r.id}: caso por fases respondido bien no puntúa 1 (${res && res.puntos})`); else bien();
}

// ───── 4. Reproductor: todas las pantallas ─────
(document._l.DOMContentLoaded || []).forEach(f => f());
let pantallas = 0;
for (const s of S.sesiones) {
  for (let i = 0; i < 60; i++) {
    location.hash = `#${s.id}/${i}`;
    try { (window.__winL.hashchange || []).forEach(f => f()); } catch (e) { falla(`${s.id}/${i}: error en el reproductor: ${e}\n${e.stack}`); break; }
    const app = window.__app;
    const txt = app.textContent;
    if (txt.indexOf("Falta el reto") >= 0 || txt.indexOf("Pantalla desconocida") >= 0) falla(`${s.id}/${i}: ${txt.slice(0, 120)}`);
    pantallas++;
    const n = app.querySelector(".ses-n").textContent.split(" / ");
    if (Number(n[0]) >= Number(n[1])) break;
  }
}
location.hash = ""; (window.__winL.hashchange || []).forEach(f => f());
if (window.__app.querySelectorAll(".ses-card").length !== S.sesiones.length) falla("el índice no muestra todas las sesiones");

// Código de verificación
const c = AL.codigo({ sesion: "S04", aciertos: 8, total: 10, lista: 12, dia: "2026-11-06" });
if (!AL.verificarCodigo(c, "2026-11-06") || AL.verificarCodigo(c, "2026-11-07") || AL.verificarCodigo(c.replace("08/10", "10/10"), "2026-11-06")) falla("código de verificación"); else bien();

print(`\nRetos pintados: ${pintados} · respondidos correctamente: ${respondidos} · pantallas recorridas: ${pantallas}`);
print(fallos ? `❌ ${fallos} fallos` : `✅ Todo correcto (${ok} comprobaciones de grupo)`);
if (fallos) throw new Error("pruebas fallidas");
