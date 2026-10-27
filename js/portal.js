// ANA LAB · Pinta el portal y las páginas de módulo a partir de window.CATALOGO.
(function () {
  const ESTADOS = {
    pendiente: { texto: "Próximamente", clase: "" },
    preparacion: { texto: "En preparación", clase: "prep" },
    listo: { texto: "Disponible", clase: "listo" }
  };
  const SVG = {
    clase: '<path d="M4 5h16v11H4zM9 20h6M12 16v4"/>',
    juegos: '<path d="M6 9h12a3 3 0 0 1 3 3v2a3 3 0 0 1-5 2l-1-1H9l-1 1a3 3 0 0 1-5-2v-2a3 3 0 0 1 3-3zM8 11v3M6.5 12.5h3M15.5 12h.01M17.5 14h.01"/>',
    ficha: '<path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5"/>',
    ir: '<path d="M9 6l6 6-6 6"/>'
  };
  // Los tres materiales de cada tema, con nombre corto para el móvil.
  const MATERIALES = [
    { tipo: "clase", titulo: "Clase" },
    { tipo: "juegos", titulo: "Juegos" },
    { tipo: "ficha", titulo: "Ficha" }
  ];

  const icono = nombre => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("fill", "none");
    s.setAttribute("stroke", "currentColor");
    s.setAttribute("stroke-width", "2");
    s.setAttribute("stroke-linecap", "round");
    s.setAttribute("stroke-linejoin", "round");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = SVG[nombre];
    return s;
  };

  const el = (tag, attrs = {}, ...hijos) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "style") n.style.cssText = v;
      else n.setAttribute(k, v);
    }
    for (const h of hijos) if (h != null) n.append(h);
    return n;
  };

  function pintarPortal(caja) {
    for (const m of CATALOGO.modulos) {
      const listos = m.temas.filter(t => t.estado === "listo").length;
      const enlace = el("a", { class: "card", href: m.url, style: `--accent:${m.color}` },
        el("div", { class: "code" }, `${m.codigo} · ${m.ambito}`),
        el("h3", {}, m.titulo),
        el("p", {}, m.curso),
        el("p", { class: "note" }, `${m.temas.length} temas · ${listos} disponibles`)
      );
      const flecha = icono("ir");
      flecha.setAttribute("class", "go");
      enlace.append(flecha);
      caja.append(enlace);
    }
    caja.append(el("div", { class: "card soon" },
      el("div", { class: "code" }, "Próximamente"),
      el("h3", {}, "Más módulos"),
      el("p", {}, "El mismo sistema, con su propio color.")
    ));
  }

  function tarjetaTema(m, t) {
    const e = ESTADOS[t.estado] || ESTADOS.pendiente;
    const urls = t.materiales || {};
    return el("article", { class: "card", style: `--accent:${m.color}` },
      el("div", { class: "code" }, `Tema ${t.n}${t.ra.length ? " · " + t.ra.join(", ") : ""}`),
      el("h3", {}, t.titulo),
      t.resumen ? el("p", {}, t.resumen) : null,
      el("span", { class: `status ${e.clase}` }, e.texto),
      el("div", { class: "mats" }, ...MATERIALES.map(x => urls[x.tipo]
        ? el("a", { class: "mat", href: urls[x.tipo] }, icono(x.tipo), x.titulo)
        : el("span", { class: "mat", "aria-disabled": "true", title: "Todavía no está publicado" }, icono(x.tipo), x.titulo)))
    );
  }

  function pintarModulo(caja, codigo) {
    const m = CATALOGO.modulos.find(x => x.codigo === codigo);
    if (!m) return;
    // Los temas con material (o en preparación) van en tarjeta; el resto, en una lista compacta.
    const activos = m.temas.filter(t => t.estado !== "pendiente");
    const pendientes = m.temas.filter(t => t.estado === "pendiente");
    if (activos.length) caja.append(el("div", { class: "cards" }, ...activos.map(t => tarjetaTema(m, t))));
    if (pendientes.length) {
      caja.append(el("h3", { class: "subhead" }, "Próximos temas"));
      caja.append(el("ul", { class: "temas-list", style: `--accent:${m.color}` }, ...pendientes.map(t =>
        el("li", {}, el("span", { class: "num", "aria-hidden": "true" }, String(t.n)),
          el("span", { class: "t" }, el("span", { class: "visually-hidden" }, `Tema ${t.n}: `), t.titulo),
          el("span", { class: "status" }, ESTADOS.pendiente.texto)))));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const portal = document.getElementById("modulos");
    if (portal) pintarPortal(portal);
    const temas = document.getElementById("temas");
    if (temas) pintarModulo(temas, temas.dataset.modulo);
  });
})();
