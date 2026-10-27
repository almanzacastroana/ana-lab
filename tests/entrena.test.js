let fallos = 0;
const app = () => window.__app;
(document._l.DOMContentLoaded || []).forEach(f => f());
for (let s = 0; s < 40; s++) {
  const ini = app().querySelectorAll("button").find(b => b.textContent.indexOf("serie") >= 0);
  if (!ini) { const r = app().querySelector(".reto"); print("✗ atascado en " + (r ? r.attrs["data-id"] + " (" + r.attrs["data-tipo"] + ")" : "?") + ": " + app().textContent.slice(0, 200)); fallos++; break; }
  ini.click();
  let n = 0;
  while (n++ < 12) {
    const fin = app().querySelector(".marcador");
    if (fin) break;
    const reto = app().querySelector(".reto");
    if (!reto) { fallos++; print("✗ sin reto"); break; }
    // Responder lo mínimo para avanzar: elegir una opción, comprobar o autoevaluar.
    const b = reto.querySelectorAll(".opciones .opcion")[0];
    for (let k = 0; k < 6; k++) {
      const sig = app().querySelectorAll("button").find(x => /Siguiente reto|Ver resultado/.test(x.textContent));
      if (sig) { sig.click(); break; }
      const ops = reto.querySelectorAll(".opciones .opcion").filter(x => !x.disabled);
      reto.querySelectorAll("select").forEach(sl => { const o = sl.children[1]; if (o) sl.value = o.attrs.value; });
      reto.querySelectorAll("input").forEach(i => { if (i.attrs.type === "radio" || i.attrs.type === "checkbox") i.checked = true; else i.value = i.attrs.type === "number" ? "1" : "respuesta"; });
      reto.querySelectorAll("textarea").forEach(i => { i.value = "respuesta"; });
      const accion = reto.querySelectorAll("button").find(x => /Comprobar|Ver respuesta|Comparar|Sí|Continuar|Siguiente paso|Siguiente fase/.test(x.textContent) && !x.disabled);
      if (accion) accion.click(); else if (ops[0]) ops[0].click();
    }
  }
}
const est = JSON.parse(localStorage.getItem("analab:3038-T1:entrena"));
if (!est || est.series < 30) { fallos++; print("✗ el entrenamiento no completa series: " + JSON.stringify(est && est.series)); }
print(fallos ? `❌ ${fallos} fallos` : `✅ Entrenamiento correcto (${est.series} series, ${Object.keys(est.dominio).length} conceptos con dominio)`);
if (fallos) throw new Error("fallos");
