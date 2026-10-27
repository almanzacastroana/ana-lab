// ANA LAB · Pinta el portal y las páginas de módulo a partir de window.CATALOGO.
(function () {
  const ESTADOS = {
    pendiente: { texto: "Próximamente", clase: "" },
    preparacion: { texto: "En preparación", clase: "prep" },
    listo: { texto: "Disponible", clase: "listo" }
  };
  const MATERIALES = ["Secuencia de clase", "Juegos", "Ficha del alumnado"];

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
      caja.append(el("a", { class: "card", href: m.url, style: `--accent:${m.color}` },
        el("div", { class: "code" }, `${m.codigo} · ${m.ambito}`),
        el("h3", {}, m.titulo),
        el("p", {}, m.curso),
        el("p", { class: "note" }, `${m.temas.length} temas · ${listos} disponibles`)
      ));
    }
    caja.append(el("div", { class: "card soon" },
      el("div", { class: "code" }, "Próximamente"),
      el("h3", {}, "Más módulos"),
      el("p", {}, "El mismo sistema, con su propio color.")
    ));
  }

  function pintarModulo(caja, codigo) {
    const m = CATALOGO.modulos.find(x => x.codigo === codigo);
    if (!m) return;
    for (const t of m.temas) {
      const e = ESTADOS[t.estado] || ESTADOS.pendiente;
      const mats = t.materiales || MATERIALES.map(tipo => ({ titulo: tipo }));
      caja.append(el("article", { class: "card", style: `--accent:${m.color}` },
        el("div", { class: "code" }, `Tema ${t.n}${t.ra.length ? " · " + t.ra.join(", ") : ""}`),
        el("h3", {}, t.titulo),
        t.resumen ? el("p", {}, t.resumen) : null,
        el("span", { class: `status ${e.clase}` }, e.texto),
        el("div", { class: "links" }, ...mats.map(x => x.url
          ? el("a", { class: "pill", href: x.url }, x.titulo)
          : el("span", { class: "pill", "aria-disabled": "true", title: "Todavía no está publicado" }, x.titulo)))
      ));
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const portal = document.getElementById("modulos");
    if (portal) pintarPortal(portal);
    const temas = document.getElementById("temas");
    if (temas) pintarModulo(temas, temas.dataset.modulo);
  });
})();
