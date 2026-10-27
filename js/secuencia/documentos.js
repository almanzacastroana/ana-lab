// ANA LAB · Documentos del oficio dibujados en HTML: hoja de solicitud (vale), albarán y etiqueta de lo abierto.
// Los usan la clase (pantallas «documento», con anotaciones numeradas) y los juegos (rellenables).
// Una celda puede ser texto (con **negrita**) o un nodo (un campo para escribir, un desplegable…).
// En el móvil cada línea se apila; en el ordenador se ve como el papel, con todas sus columnas.
(function () {
  const AL = window.AL;
  const { el, t } = AL;

  const celda = (v, attrs) => (v != null && typeof v === "object" ? el("span", attrs, v) : t("span", v == null ? "" : String(v), attrs));
  // Marca numerada de una parte del documento (para explicarlo en clase).
  const marca = (d, k) => (d.marcas && d.marcas[k] ? el("span", { class: "doc-marca", "data-n": String(d.marcas[k]), "aria-label": `Parte ${d.marcas[k]}`, text: String(d.marcas[k]) }) : null);

  function tabla(d, cols, lineas, clase) {
    const cab = el("div", { class: "doc-fila doc-fila-cab", role: "row" },
      cols.map(c => el("span", { class: `doc-c c-${c.k}`, role: "columnheader" }, c.h, marca(d, "col-" + c.k))));
    const filas = lineas.map((l, i) => el("div", { class: "doc-fila" + (l.clase ? " " + l.clase : ""), role: "row", "data-i": String(i) },
      cols.map(c => celda(l[c.k], { class: `doc-c c-${c.k}`, role: "cell", "data-h": c.h }))));
    return el("div", { class: "doc-tabla " + clase, role: "table", "aria-label": d.titulo || "Líneas del documento" }, cab, filas);
  }

  // Hoja de solicitud interna (vale de pedido al almacén). Modelo de 02_DOCUMENTACION.md, 3.2.
  function vale(d) {
    const alm = d.almacenes || {};
    const cols = [{ k: "cod", h: "Cód." }, { k: "art", h: "Artículo (nombre exacto)" }, { k: "unidad", h: "Unidad" },
                  { k: "sol", h: "Solicitada" }, { k: "serv", h: "Servida" }, { k: "obs", h: "Observ." }];
    return el("div", { class: "doc doc-vale" + (d.clase ? " " + d.clase : "") },
      el("div", { class: "doc-cab" },
        el("div", {}, el("p", { class: "doc-tit", text: "Hoja de solicitud interna" }),
          el("p", { class: "doc-dato" }, "Departamento: ", el("b", { text: d.depto || "BAR-CAFETERÍA" }), marca(d, "depto"))),
        el("p", { class: "doc-num" }, "Nº ", el("b", { text: d.numero || "____" }), marca(d, "numero"))),
      el("p", { class: "doc-dato doc-alm" }, "Almacén: ",
        ["Economato", "Bodega", "Cámara", "Congelación", "Material"].filter(a => a in alm || !d.soloMarcados).map(a =>
          el("span", { class: "doc-check" + (alm[a] ? " si" : ""), text: (alm[a] ? "☒ " : "☐ ") + a })), marca(d, "almacen")),
      el("p", { class: "doc-dato" }, "Fecha de solicitud: ", celda(d.fecha || "__/__/____", { class: "boli" }),
        el("span", { class: "doc-sep", text: " · " }), "Para el servicio de: ", celda(d.servicio || "__/__/____", { class: "boli" }), marca(d, "fechas")),
      tabla(d, cols, d.lineas || [], "t-vale"),
      el("div", { class: "doc-firmas" },
        [["solicita", "Solicita"], ["autoriza", "Autoriza"], ["entrega", "Entrega"]].map(([k, h]) =>
          el("div", { class: "doc-firma" }, el("span", { class: "doc-firma-h", text: h }), celda((d.firmas || {})[k] || "", { class: "boli firma" }), marca(d, "firma-" + k)))),
      el("p", { class: "doc-pie", text: d.pie || "Modelo didáctico ANA LAB" }));
  }

  // Albarán de un proveedor. Modelo de 02_DOCUMENTACION.md, 4.1. Los proveedores son siempre inventados.
  function albaran(d) {
    const pr = d.proveedor || {};
    const cols = [{ k: "cod", h: "Código" }, { k: "desc", h: "Descripción" }, { k: "unidad", h: "Unidad" }, { k: "cant", h: "Cantidad" }, { k: "lote", h: "Lote" }];
    if (d.conCaducidad) cols.push({ k: "cad", h: "Fecha" });
    return el("div", { class: "doc doc-albaran" + (d.clase ? " " + d.clase : "") },
      el("div", { class: "doc-cab" },
        el("div", {}, el("p", { class: "doc-prov" }, el("b", { text: pr.nombre || "PROVEEDOR, S.L." }), marca(d, "proveedor")),
          el("p", { class: "doc-dato peq", text: `${pr.cif ? "CIF " + pr.cif + " · " : ""}${pr.dir || ""}` })),
        el("div", { class: "doc-num-caja" }, el("p", { class: "doc-tit", text: "Albarán" }), el("p", { class: "doc-num" }, "Nº ", el("b", { text: d.numero || "____" }), marca(d, "numero")),
          el("p", { class: "doc-dato" }, "Fecha: ", el("b", { text: d.fecha || "" }), marca(d, "fecha")))),
      el("p", { class: "doc-dato" }, "Cliente: ", el("b", { text: d.cliente || "Cafetería Escuela" }), marca(d, "cliente")),
      tabla(d, cols, d.lineas || [], "t-albaran" + (d.conCaducidad ? " con-cad" : "")),
      el("div", { class: "doc-pie-alb" },
        el("div", { class: "doc-obs" }, el("span", { class: "doc-firma-h" }, "Observaciones", marca(d, "obs")), celda(d.obs || "", { class: "boli obs" })),
        el("div", { class: "doc-firma" }, el("span", { class: "doc-firma-h" }, "Recibido (firma y sello)", marca(d, "firma")), celda(d.firma || "", { class: "boli firma" }))),
      el("p", { class: "doc-pie", text: d.pie || "Empresa ficticia · Modelo didáctico ANA LAB" }));
  }

  // Copia del pedido que el establecimiento hizo al proveedor: es la referencia para comprobar el albarán.
  function pedido(d) {
    const cols = [{ k: "cod", h: "Código" }, { k: "desc", h: "Artículo" }, { k: "unidad", h: "Unidad" }, { k: "cant", h: "Pedido" }];
    return el("div", { class: "doc doc-pedido" },
      el("div", { class: "doc-cab" },
        el("div", {}, el("p", { class: "doc-tit", text: "Pedido a proveedor · copia" }), el("p", { class: "doc-dato" }, "Proveedor: ", el("b", { text: d.proveedor || "" }))),
        el("div", { class: "doc-num-caja" }, el("p", { class: "doc-num" }, "Nº ", el("b", { text: d.numero || "" })), el("p", { class: "doc-dato", text: d.fecha ? "Fecha: " + d.fecha : "" }))),
      tabla(d, cols, d.lineas || [], "t-pedido"),
      el("p", { class: "doc-pie", text: "Cafetería Escuela · Modelo didáctico ANA LAB" }));
  }

  // Etiqueta de un producto abierto o preparado (02_DOCUMENTACION.md, 6.3).
  function etiqueta(d) {
    const fila = (k, h, v) => el("p", { class: "eti-fila" }, el("span", { class: "eti-h", text: h }), celda(v || "", { class: "boli" }), marca(d, k));
    return el("div", { class: "doc doc-etiqueta" },
      fila("producto", "Producto", d.producto), fila("elaborado", d.abierto ? "Abierto" : "Elaborado", d.elaborado),
      fila("hasta", "Usar hasta", d.hasta), fila("responsable", "Responsable", d.responsable));
  }

  // Fechas: el oficio las escribe de muchas formas; los juegos las mezclan para que se aprenda a leerlas todas.
  const dd = n => String(n).padStart(2, "0");
  function fecha(f, estilo) {
    const d = dd(f.getDate()), m = dd(f.getMonth() + 1), a = String(f.getFullYear());
    switch (estilo) {
      case "corta": return `${d}/${m}/${a.slice(2)}`;
      case "puntos": return `${d}.${m}.${a.slice(2)}`;
      case "dm": return `${d}/${m}`;
      default: return `${d}/${m}/${a}`;
    }
  }
  const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const fechaLarga = f => `${DIAS[f.getDay()]} ${f.getDate()} de ${MESES[f.getMonth()]}`;
  const sumaDias = (f, n) => { const r = new Date(f.getTime()); r.setDate(r.getDate() + n); return r; };

  AL.doc = { vale, albaran, pedido, etiqueta, fecha, fechaLarga, sumaDias };
})();
