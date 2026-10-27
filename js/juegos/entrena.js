// ANA LAB · Modo «Entrenamiento» de un tema: series de 10 retos del banco, eligiendo con más peso
// los conceptos que has fallado (repaso espaciado sencillo) y mezclando tipos. Solo guarda en el dispositivo.
(function () {
  const AL = window.AL;
  const { el, t } = AL;
  let BANCO, raiz, clave;
  const SERIE = 10;

  const estado = () => AL.store.get(clave, { dominio: {}, series: 0, mejor: 0 });
  // dominio[concepto] = nivel 0–5: sube al acertar, baja al fallar. Menos dominio = más probabilidad de salir.
  function elegir(rnd) {
    const est = estado();
    const candidatos = BANCO.retos.filter(r => !r.fases && r.usos.some(u => u === "juego" || u === "repaso" || u === "salida" || u === "reto"));
    const peso = r => 6 - Math.min(5, est.dominio[r.concepto] || 0);
    const elegidos = [], usados = new Set();
    let guard = 0;
    while (elegidos.length < SERIE && guard++ < 500) {
      const total = candidatos.reduce((a, r) => a + (usados.has(r.concepto) ? 0 : peso(r)), 0);
      let x = rnd() * total;
      const r = candidatos.find(c => !usados.has(c.concepto) && (x -= peso(c)) < 0);
      if (!r) break;
      usados.add(r.concepto); elegidos.push(r);
    }
    return elegidos;
  }

  function inicio() {
    const est = estado();
    const conceptos = new Set(BANCO.retos.map(r => r.concepto));
    const dominados = [...conceptos].filter(c => (est.dominio[c] || 0) >= 3).length;
    raiz.replaceChildren(el("main", { id: "contenido", class: "juego-main" },
      el("header", { class: "juego-hero" }, el("p", { class: "eyebrow", text: "3038 · Tema 1 · Entrenamiento" }), el("h1", { text: "Entrena el tema" }),
        t("p", "Series de **10 retos variados** de todo el tema. Lo que falles saldrá **más a menudo** hasta que lo domines.")),
      el("div", { class: "dominio" }, el("p", { class: "eyebrow", text: "Tu dominio del tema" }),
        el("div", { class: "meter", role: "meter", "aria-valuemin": "0", "aria-valuemax": String(conceptos.size), "aria-valuenow": String(dominados), "aria-label": "Conceptos dominados" },
          el("i", { style: `width:${(dominados / conceptos.size) * 100}%` })),
        el("p", { class: "note", text: `${dominados} de ${conceptos.size} conceptos dominados · ${est.series} series hechas · mejor serie: ${est.mejor}/10` })),
      el("div", { class: "reto-acciones" }, el("button", { type: "button", class: "btn btn-primario", onclick: serie, text: "Empezar una serie" })),
      el("p", { class: "note", text: "Puntuación de juego: no es una nota. Se guarda solo en este dispositivo." })));
  }

  function serie() {
    const rnd = AL.rng(AL.semillaNueva());
    const retos = elegir(rnd);
    const resultados = [];
    const zona = el("div", {});
    raiz.replaceChildren(el("main", { id: "contenido", class: "juego-main" }, el("h1", { class: "visually-hidden", text: "Serie de entrenamiento" }), zona));
    const sig = k => {
      if (k >= retos.length) return fin(retos, resultados);
      zona.replaceChildren(el("p", { class: "paso-n", text: `Reto ${k + 1} de ${retos.length}` }),
        AL.retos.crear(retos[k], { rnd, catalogo: BANCO.catalogo, compacto: true, alTerminar: res => {
          resultados.push(res);
          zona.append(el("div", { class: "reto-acciones" }, el("button", { type: "button", class: "btn btn-primario", text: k + 1 < retos.length ? "Siguiente reto" : "Ver resultado", onclick: () => { sig(k + 1); window.scrollTo(0, 0); } })));
        } }));
      window.scrollTo(0, 0);
    };
    sig(0);
  }

  function fin(retos, resultados) {
    const est = estado();
    retos.forEach((r, i) => {
      const p = resultados[i] ? resultados[i].puntos : 0;
      est.dominio[r.concepto] = Math.max(0, Math.min(5, (est.dominio[r.concepto] || 0) + (p >= 1 ? 1 : p >= 0.5 ? 0 : -1)));
    });
    const total = Math.round(resultados.reduce((a, r) => a + r.puntos, 0) * 10) / 10;
    est.series++; est.mejor = Math.max(est.mejor, total);
    AL.store.set(clave, est);
    const fallados = retos.filter((r, i) => !resultados[i] || resultados[i].puntos < 1);
    raiz.replaceChildren(el("main", { id: "contenido", class: "juego-main" }, el("section", { class: "resultado" },
      el("h1", { text: "Serie terminada" }), el("p", { class: "marcador" }, el("strong", { text: String(total).replace(".", ",") }), " de 10"),
      fallados.length ? el("div", { class: "fb fb-tip" }, el("h4", { text: "Volverán a salir" }), el("ul", { class: "revision" }, fallados.map(r => t("li", `Apartado ${r.sub}: ${r.enunciado.slice(0, 90)}${r.enunciado.length > 90 ? "…" : ""}`))))
        : el("div", { class: "fb fb-ok" }, el("h4", { text: "¡Serie perfecta!" })),
      el("div", { class: "reto-acciones" }, el("button", { type: "button", class: "btn btn-primario", onclick: serie, text: "Otra serie" }), el("a", { class: "btn btn-sec", href: "../", text: "Volver a los juegos" })))));
    window.scrollTo(0, 0);
  }

  document.addEventListener("DOMContentLoaded", () => {
    BANCO = window.BANCO; raiz = document.getElementById("app"); clave = `${BANCO.tema}:entrena`;
    inicio();
  });
})();
