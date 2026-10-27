// ANA LAB · Juego «Semana de barra» (3038 · Tema 1). Simulación de acopio de lunes a viernes, con papeles de verdad.
// Cada día: 1 Vale al almacén (hoja de existencias → vale) · 2 Recepción (pedido + albarán + mercancía en el muelle, firma)
//           3 Colocar (etiquetas de fecha reales, FEFO + almacén) · 4 Cerrar (residuos).
// Todo sale al azar con semilla: fechas, imprevistos, proveedor, productos, cantidades, lotes, temperaturas e incidencias.
// Puntúa decisiones correctas (no velocidad). Lo fallado vuelve con más frecuencia. Récord y repasos solo en el dispositivo.
// Modo «reto de clase»: ?reto=CODIGO → misma semana para todo el grupo y código final verificable.
(function () {
  const AL = window.AL;
  const { el, t } = AL;
  const IMG = "../../img/";
  const DIAS = [
    { n: "Lunes", lugar: "Cafetería", lineas: 3, rec: 3, fefo: 3, res: 4, eventos: "tranquilo" },
    { n: "Martes", lugar: "Cafetería", lineas: 3, rec: 4, fefo: 4, res: 4, eventos: "todos" },
    { n: "Miércoles", lugar: "Cafetería", lineas: 4, rec: 4, fefo: 4, res: 5, eventos: "todos" },
    { n: "Jueves", lugar: "Cafetería", lineas: 4, rec: 5, fefo: 5, res: 5, eventos: "todos" },
    { n: "Viernes", lugar: "Bitácora", lineas: 5, rec: 5, fefo: 5, res: 6, eventos: "bitacora" }
  ];
  // Imprevistos: el encargado ajusta la previsión (multiplica el stock de apertura).
  const EVENTOS = {
    tranquilo: [{ t: "Día normal: sin previsiones especiales.", f: 1 }, { t: "Llueve: la gente se queda dentro, pero el encargado mantiene la previsión normal.", f: 1 }],
    todos: [{ t: "Día normal: sin previsiones especiales.", f: 1 },
            { t: "Hay un grupo de 30 desayunos: el encargado pide un 50 % más.", f: 1.5 },
            { t: "Jornada de puertas abiertas: se espera el doble de lo habitual.", f: 2 },
            { t: "Partido a mediodía en la tele: un 50 % más.", f: 1.5 },
            { t: "Excursión de todo 1.º: la cafetería estará a medias. Previsión: la mitad.", f: 0.5 }],
    bitacora: [{ t: "Servicio en el restaurante-escuela Bitácora: 40 comensales. Un 50 % más.", f: 1.5 },
               { t: "Bitácora con menú especial: 60 comensales. El doble de lo habitual.", f: 2 }]
  };
  // Proveedores inventados (nombre, dirección y CIF ficticios).
  const PROVEEDORES = [
    { nombre: "BEBIDAS DEL HENARES, S.L.", dir: "Polígono inventado, nave 4", es: p => p.almacen === "bodega" },
    { nombre: "LÁCTEOS VALLE DEL JARAMA, S.A.", dir: "Camino imaginario, 12", es: p => ["lechefresca", "lecheuht", "lechesl", "yogur", "mantequilla", "zumorefri"].includes(p.id) },
    { nombre: "DISTRIBUCIONES TAJO HOSTELERÍA, S.L.", dir: "Calle ficticia, 7", es: p => (p.almacen === "economato" && !p.id.startsWith("leche")) || ["jamon", "limones"].includes(p.id) },
    { nombre: "CONGELADOS LA SIERRA, S.L.", dir: "Avenida supuesta, 30", es: p => p.almacen === "congelacion" },
    { nombre: "SUMINISTROS HIGIÉNICOS DEL SUR, S.L.", dir: "Plaza que no existe, 2", es: p => p.almacen === "material" }
  ];
  const PUNTOS = 10;
  const corto = p => p.nombre.replace(/\s*\(.*?\)\s*/g, " ").trim();
  const unidad = p => (p.n > 1 ? `${p.formato} ${p.n}` : p.formato);
  const plural = f => ({ caja: "cajas", pack: "packs", paquete: "paquetes", bolsa: "bolsas", bote: "botes", garrafa: "garrafas", botella: "botellas", "malla 1 kg": "mallas" }[f] || f);
  const coma = x => String(x).replace(".", ",");
  // En la vista previa de Drive (un solo .html) las imágenes llegan incrustadas en window.AL_IMGS.
  const imagen = n => (window.AL_IMGS && window.AL_IMGS[n]) || IMG + n;
  const foto = (p, cls) => el("img", { class: cls || "prod-img", src: imagen(`p-${p.id}.jpg`), alt: "", width: "64", height: "64", loading: "lazy" });

  // Decisiones de la recepción. Cada línea tiene como mucho UNA incidencia, para que la respuesta sea inequívoca.
  const ACC = {
    aceptar: "Conforme: todo correcto",
    falta: "Falta: llega menos de lo que dice el albarán",
    sobra: "Sobra: llega más de lo que dice el albarán",
    albaran_distinto: "El albarán no coincide con nuestro pedido",
    rechazar_temp: "Rechazar: temperatura incorrecta",
    rechazar_envase: "Rechazar: envase dañado",
    rechazar_fecha: "Rechazar: caducado o caduca hoy"
  };
  const OBS = { falta: "falta mercancía", sobra: "sobra mercancía", albaran_distinto: "no coincide con el pedido", rechazar_temp: "rechazado por temperatura", rechazar_envase: "rechazado, envase dañado", rechazar_fecha: "rechazado por fecha" };
  const POR_QUE = {
    aceptar: "Pedido, albarán y mercancía cuadran, y el estado es bueno.",
    falta: "Ha llegado menos de lo que dice el albarán: se anota antes de firmar.",
    sobra: "Ha llegado más de lo que dice el albarán: se anota (o se devuelve) antes de firmar.",
    albaran_distinto: "El albarán no coincide con lo que pedimos.",
    rechazar_temp: "Fuera de temperatura se ha roto la cadena de frío: refrigerados entre 0 y 4 °C; congelados a −18 °C o menos.",
    rechazar_envase: "Un envase dañado no garantiza el producto: se aparta, se anota y se avisa.",
    rechazar_fecha: "Caducado, o caduca hoy y no da para usarlo: no se acepta."
  };
  const envaseMalo = p => {
    if (p.id === "cola33") return "2 latas abolladas que gotean";
    if (["tonica20", "zumo20", "vino75"].includes(p.id)) return "3 botellas rotas y la caja mojada";
    if (["lechefresca", "lecheuht", "lechesl", "zumorefri"].includes(p.id)) return "un brik hinchado";
    if (["cafe", "cacao", "jamon", "mantequilla", "mermelada"].includes(p.id)) return "precinto roto";
    if (p.cerrado === "congelacion") return "caja rota, con bloques de hielo dentro";
    if (p.almacen === "material") return "envase roto que pierde líquido";
    return "envase roto y mojado";
  };
  const conTemperatura = p => p.cerrado === "refrigeracion" || p.cerrado === "congelacion";
  const perecedero = p => p.cerrado === "refrigeracion";

  let BANCO, CAT, raiz, rnd, estado;
  const clave = () => `${BANCO.tema}:juego-semana`;
  const prefs = () => AL.store.get(clave(), { record: 0, partidas: 0, fallos: {} });
  const guardarPrefs = x => AL.store.set(clave(), x);
  const codigoInterno = p => "0" + ({ bodega: 3, camara: 4, congelacion: 5, economato: 6, material: 9 }[p.almacen] || 7) + String(10 + CAT.productos.indexOf(p)).padStart(2, "0");
  const codigoProv = p => p.id.slice(0, 2).toUpperCase() + "-" + String(100 + (AL.hash(p.id) % 900));

  // ───────── Utilidades de pantalla ─────────
  function pantalla(...hijos) { raiz.replaceChildren(el("main", { id: "contenido", class: "juego-main" }, ...hijos)); window.scrollTo(0, 0); const h = raiz.querySelector("h1, h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }
  function hud() {
    const d = DIAS[estado.dia];
    return el("div", { class: "hud" },
      el("div", { class: "hud-t" }, el("strong", { text: `${d.n} ${AL.doc.fecha(estado.hoy, "dm")} · ${d.lugar}` }), el("span", { class: "note", text: estado.fase ? `Fase ${estado.fase} de 4` : "" })),
      el("div", { class: "hud-stats" }, el("span", { class: "stat" }, el("em", { text: "Puntos" }), String(estado.puntos)), el("span", { class: "stat" }, el("em", { text: "Récord" }), String(prefs().record))));
  }
  const btn = (txt, f, cls) => el("button", { type: "button", class: "btn " + (cls || "btn-primario"), onclick: f, text: txt });
  function fallo(concepto) { estado.fallos[concepto] = (estado.fallos[concepto] || 0) + 1; }
  function anota(ok, concepto, texto) { estado.log.push({ ok, concepto, texto }); if (ok) estado.puntos += PUNTOS; else fallo(concepto); estado.max += PUNTOS; }
  function fb(clase, tit, txt) { return el("div", { class: `fb fb-${clase}` }, el("h4", { text: tit }), txt ? t("p", txt) : null); }
  const acciones = () => raiz.querySelector(".reto-acciones");

  // ───────── Inicio ─────────
  function inicio() {
    const pr = prefs();
    const params = new URLSearchParams(location.search);
    const reto = (params.get("reto") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    pantalla(
      el("header", { class: "juego-hero" }, el("p", { class: "eyebrow", text: "3038 · Tema 1 · Juego" }), el("h1", { text: "Semana de barra" }),
        t("p", "Llevas el acopio de la cafetería de **lunes a viernes**, con los papeles de verdad: hoja de existencias, vale, pedido, albarán y etiquetas. El viernes, servicio en **Bitácora**.")),
      el("section", { class: "juego-reglas" },
        el("h2", { text: "Cómo se juega" }),
        el("ol", {}, ["**Vale:** mira la hoja de existencias y la previsión, y rellena el vale al almacén.",
          "**Recepción:** llega un proveedor. Compara tu pedido, su albarán y lo que hay en el muelle: cuenta los bultos, mira la sonda, las fechas y los envases. Después, firma.",
          "**Colocar:** lee las etiquetas de fecha y ordena la estantería (FEFO). Decide el almacén.",
          "**Cerrar:** separa los residuos y los retornables."].map(x => t("li", x))),
        t("p", "Cada semana es distinta: imprevistos, proveedores, productos, fechas e incidencias salen al azar. Cada decisión correcta suma **10 puntos**. **No cuenta la velocidad.**", { class: "note" })),
      reto ? fb("tip", `Reto de clase: ${reto}`, "Toda la clase juega la misma semana. Al terminar tendrás un código para tu profesora.") : null,
      el("div", { class: "reto-acciones" }, btn(reto ? "Empezar el reto de clase" : "Empezar la semana", () => empezar(reto))),
      pr.partidas ? el("p", { class: "note", text: `Partidas jugadas: ${pr.partidas} · Tu récord: ${pr.record} puntos.` }) : null,
      el("p", { class: "note", text: "Puntuación de juego: no es una nota. Todo se guarda solo en este dispositivo. Proveedores y documentos son inventados." }));
  }

  function empezar(reto) {
    const semilla = reto ? AL.hash("semana|" + reto) : AL.semillaNueva();
    rnd = AL.rng(semilla);
    const lunes = AL.doc.sumaDias(new Date(2026, 10, 2), 7 * rnd.int(0, 18)); // un lunes cualquiera de noviembre a marzo
    estado = { reto, semilla, lunes, dia: 0, fase: 0, puntos: 0, max: 0, log: [], fallos: reto ? {} : Object.assign({}, prefs().fallos), resumenDia: [], nVale: rnd.int(120, 880) };
    iniciarDia();
  }

  // ───────── Día ─────────
  function iniciarDia() {
    const d = DIAS[estado.dia];
    estado.fase = 0; estado.diaLog = estado.log.length; estado.consecuencias = [];
    estado.hoy = AL.doc.sumaDias(estado.lunes, estado.dia);
    estado.evento = rnd.pick(EVENTOS[d.eventos]);
    const titulo = AL.doc.fechaLarga(estado.hoy);
    pantalla(hud(), el("section", { class: "dia-intro" }, el("p", { class: "eyebrow", text: `Día ${estado.dia + 1} de 5` }),
      el("h2", { text: titulo.charAt(0).toUpperCase() + titulo.slice(1) + (d.lugar === "Bitácora" ? " · Bitácora" : "") }),
      fb("tip", "Aviso del encargado", estado.evento.t),
      el("div", { class: "reto-acciones" }, btn("Empezar el día", fasePedido))));
  }

  // Stock de apertura verosímil según cómo se sirve el producto (siempre par: así ×0,5 y ×1,5 dan enteros).
  function apertura(p) {
    if (p.n === 1) return rnd.pick([2, 4, 6, 8]);
    if (p.n <= 12) return rnd.pick([12, 18, 24, 36]);
    return rnd.pick([24, 36, 48, 72]);
  }

  // Fase 1 · Hoja de existencias → vale al almacén
  function fasePedido() {
    estado.fase = 1;
    const d = DIAS[estado.dia], f = estado.evento.f;
    const base = CAT.productos.filter(p => p.almacen !== "material" && p.n < 100);
    estado.pedido = rnd.sample(base, d.lineas).map(p => {
      const ap = apertura(p), existencias = rnd.int(0, ap);
      const faltan = Math.max(0, ap * f - existencias);
      return { p, apertura: ap, factor: f, existencias, faltan, pedir: Math.ceil(faltan / p.n) };
    });
    const ayer = AL.doc.sumaDias(estado.hoy, -1);
    const hoja = el("div", { class: "existencias" }, el("p", { class: "doc-tit", text: `Hoja de existencias · cierre del ${AL.doc.fecha(ayer, "dm")}` }),
      estado.pedido.map(l => el("div", { class: "exist-fila" }, foto(l.p),
        el("div", { class: "exist-t" }, el("strong", { text: corto(l.p) }),
          el("span", { class: "exist-nums" }, el("span", { text: `Apertura: ${l.apertura}` }), el("span", { text: `Quedan: ${l.existencias}` }), el("span", { text: `Se sirve en: ${unidad(l.p)}` }))))));
    const lineas = rnd.shuffle(estado.pedido).map(l => {
      l.inp = el("input", { type: "number", inputmode: "numeric", min: "0", class: "num", "aria-label": `${plural(l.p.formato)} de ${corto(l.p)}` });
      return { cod: codigoInterno(l.p), art: corto(l.p), unidad: unidad(l.p), sol: l.inp, serv: "", l };
    });
    const alm = {};
    for (const l of estado.pedido) alm[{ bodega: "Bodega", camara: "Cámara", congelacion: "Congelación", economato: "Economato" }[l.p.almacen]] = true;
    estado.valeLineas = lineas;
    estado.valeDoc = AL.doc.vale({ numero: String(estado.nVale++).padStart(4, "0"), almacenes: alm, fecha: AL.doc.fecha(ayer),
      servicio: AL.doc.fecha(estado.hoy) + (d.lugar === "Bitácora" ? " (Bitácora)" : ""), lineas, firmas: { solicita: "Barra" } });
    pantalla(hud(), el("section", {}, el("h2", { text: "1 · Haz el vale al almacén" }),
      fb("tip", `Previsión de hoy: ×${coma(f)}`, estado.evento.t),
      t("p", "**Paso a paso:** apertura × previsión − lo que queda = lo que falta. Después, pásalo al **formato** y redondea **hacia arriba**. Si no falta nada, escribe **0**.", { class: "ayuda" }),
      hoja, el("h3", { class: "fase-tit", text: "Tu vale (ojo: las líneas van en otro orden)" }), estado.valeDoc,
      el("div", { class: "reto-acciones" }, btn("Firmar y enviar el vale", corregirPedido))));
  }
  function corregirPedido() {
    if (estado.pedido.some(l => l.inp.value === "")) { acciones().before(fb("tip", "Falta alguna cantidad", "Escribe 0 si no hace falta pedir.")); return; }
    const notas = [];
    const filas = Array.from(estado.valeDoc.querySelectorAll(".doc-fila"));
    estado.valeLineas.forEach((v, i) => {
      const l = v.l, val = Number(l.inp.value), ok = val === l.pedir;
      anota(ok, "reposicion", corto(l.p));
      const fila = filas.filter(x => x.getAttribute("data-i") === String(i))[0];
      if (fila) { fila.classList.add(ok ? "bien" : "mal"); const s = fila.querySelector(".c-serv"); if (s) s.replaceChildren(el("span", { class: "boli", text: String(val) })); }
      const bruto = l.apertura * l.factor - l.existencias;
      const calc = `${l.apertura}${l.factor !== 1 ? " × " + coma(l.factor) : ""} − ${l.existencias} = ${bruto}${l.faltan > 0 ? ` → ${l.faltan} ÷ ${l.p.n} → **${l.pedir}**` : " → no falta nada: **0**"}`;
      if (ok) notas.push(t("li", `✓ ${corto(l.p)}: ${l.pedir}. ${calc}`));
      else if (val < l.pedir) { estado.consecuencias.push(`Se acabó «${corto(l.p)}» a media mañana: faltaron ${l.faltan - val * l.p.n} unidades.`); notas.push(t("li", `✗ ${corto(l.p)}: pediste ${val}, hacían falta ${l.pedir}. ${calc}`)); }
      else { estado.consecuencias.push(`Sobran ${(val - l.pedir) * l.p.n} unidades de «${corto(l.p)}»: ocupan sitio y pueden acabar en merma.`); notas.push(t("li", `✗ ${corto(l.p)}: pediste ${val}, bastaba con ${l.pedir}. ${calc}`)); }
    });
    raiz.querySelectorAll("input").forEach(i => (i.disabled = true));
    acciones().replaceChildren(btn("Llega un proveedor →", faseRecepcion));
    acciones().before(el("div", { class: "fb fb-tip" }, el("h4", { text: "El almacén ha servido tu vale" }), el("ul", { class: "revision" }, notas)));
  }

  // Fase 2 · Recepción de un proveedor: pedido + albarán + mercancía en el muelle + firma
  function faseRecepcion() {
    estado.fase = 2;
    const d = DIAS[estado.dia], hoy = estado.hoy;
    const prov = rnd.pick([0, 1, 1, 2, 3, 3, 4].map(i => PROVEEDORES[i])); // lácteos y congelados, más a menudo: traen frío y fechas
    const suyos = CAT.productos.filter(prov.es);
    const prods = rnd.sample(suyos, Math.min(d.rec, suyos.length));
    // Incidencias posibles para cada producto: la temperatura solo en lo que va en frío; la fecha, en lo perecedero.
    const posibles = p => ["aceptar", "aceptar", "falta", "sobra", "albaran_distinto", "rechazar_envase"]
      .concat(conTemperatura(p) ? ["rechazar_temp", "rechazar_temp"] : [], perecedero(p) ? ["rechazar_fecha", "rechazar_fecha"] : []);
    const pendientes = Object.keys(ACC).filter(k => (estado.fallos["rec-" + k] || 0) > 0); // repaso: lo fallado sale antes
    estado.prov = prov;
    estado.recepcion = prods.map((p, i) => {
      const op = posibles(p);
      const tipo = i < pendientes.length && op.includes(pendientes[i]) ? pendientes[i] : rnd.pick(op);
      const l = { p, tipo, pedidoP: p, lote: "L" + rnd.int(1000, 9999) };
      l.pedido = rnd.int(2, 9); l.albaran = l.pedido; l.llegado = l.pedido;
      if (tipo === "falta") l.llegado = l.albaran - rnd.int(1, Math.min(2, l.albaran - 1));
      if (tipo === "sobra") l.llegado = l.albaran + rnd.int(1, 2);
      if (tipo === "albaran_distinto") {
        const hermanos = suyos.filter(x => x !== p && x.formato === p.formato && !prods.includes(x));
        const modo = rnd.pick(["cantidad", "cantidad", "producto", "nopedido"]);
        if (modo === "producto" && hermanos.length) { l.pedidoP = rnd.pick(hermanos); l.cambio = true; }
        else if (modo === "nopedido") l.pedido = null;
        else { l.albaran = Math.max(1, l.pedido + rnd.pick([-2, -1, 1, 2, 3])); if (l.albaran === l.pedido) l.albaran++; }
        l.llegado = l.albaran;
      }
      // Estado de la mercancía: correcto, salvo la incidencia de calidad elegida.
      if (conTemperatura(p)) l.temp = p.cerrado === "refrigeracion" ? (tipo === "rechazar_temp" ? rnd.int(70, 120) / 10 : rnd.int(10, 40) / 10)
        : (tipo === "rechazar_temp" ? -rnd.int(60, 120) / 10 : -rnd.int(180, 240) / 10);
      if (perecedero(p)) { l.fechaTipo = "cad"; l.fecha = AL.doc.sumaDias(hoy, tipo === "rechazar_fecha" ? rnd.int(-3, 0) : rnd.int(5, 20)); }
      else if (p.almacen !== "material") { l.fechaTipo = "pref"; l.fecha = AL.doc.sumaDias(hoy, rnd.int(90, 540)); }
      l.envase = tipo === "rechazar_envase" ? envaseMalo(p) : null;
      l.trampaAmbiente = !conTemperatura(p) && p.almacen === "bodega" && tipo === "aceptar" && rnd() < 0.5;
      l.formatoFecha = rnd.pick(["corta", "puntos", "larga"]);
      return l;
    });
    const docPedido = AL.doc.pedido({ proveedor: prov.nombre, numero: "P-" + rnd.int(1000, 9999), fecha: AL.doc.fecha(AL.doc.sumaDias(hoy, -2)),
      lineas: estado.recepcion.filter(l => l.pedido != null).map(l => ({ cod: codigoProv(l.pedidoP), desc: corto(l.pedidoP), unidad: unidad(l.pedidoP), cant: String(l.pedido) })) });
    estado.obs = el("span", {}); estado.firmaTxt = el("span", {});
    estado.albaranDoc = AL.doc.albaran({ proveedor: { nombre: prov.nombre, cif: "B-00000000", dir: prov.dir }, numero: `A-${hoy.getFullYear()}/${rnd.int(1000, 9999)}`,
      fecha: AL.doc.fecha(hoy), cliente: "Cafetería Escuela", obs: estado.obs, firma: estado.firmaTxt,
      lineas: estado.recepcion.map(l => ({ cod: codigoProv(l.p), desc: corto(l.p), unidad: unidad(l.p), cant: String(l.albaran), lote: l.lote })) });
    const muelle = estado.recepcion.map(l => {
      l.sel = el("select", { class: "sel", "aria-label": `Decisión para ${corto(l.p)}` }, el("option", { value: "", text: "¿Qué haces?" }), Object.entries(ACC).map(([k, v]) => el("option", { value: k, text: v })));
      const bultos = el("span", { class: "bultos", role: "img", "aria-label": `${l.llegado} bultos` }, Array.from({ length: l.llegado }, () => el("span", { class: "bulto" })));
      const etiqueta = l.fechaTipo === "cad" ? `CAD ${AL.doc.fecha(l.fecha, l.formatoFecha)}` : l.fechaTipo === "pref" ? `Consumir preferentemente antes de ${AL.doc.fecha(l.fecha).slice(3)}` : "sin fecha (no es un alimento)";
      return el("div", { class: "rec-fila muelle" },
        el("div", { class: "muelle-cab" }, foto(l.p), el("div", {}, el("p", { class: "rec-prod", text: corto(l.p) }), el("p", { class: "muelle-sub", text: `${unidad(l.p)} · lote ${l.lote}` }))),
        el("p", { class: "muelle-dato" }, el("span", { class: "muelle-h", text: "Bultos en el muelle" }), bultos),
        el("ul", { class: "muelle-chips" },
          l.temp != null ? el("li", { class: "chip-dato" }, `🌡 Sonda: ${coma(l.temp.toFixed(1))} °C`) : null,
          l.trampaAmbiente ? el("li", { class: "chip-dato", text: "🌡 Llega a temperatura ambiente (21 °C)" }) : null,
          el("li", { class: "chip-dato", text: "Etiqueta: " + etiqueta }),
          el("li", { class: "chip-dato" + (l.envase ? " alerta" : ""), text: "Envase: " + (l.envase || "correcto") })),
        l.sel, el("div", { class: "clas-fb" }));
    });
    estado.firmaSel = el("select", { class: "sel", "aria-label": "Cómo firmas el albarán" }, el("option", { value: "", text: "¿Cómo firmas?" }),
      el("option", { value: "conforme", text: "Firmo conforme" }), el("option", { value: "reservas", text: "Firmo con reservas, anotando las incidencias" }));
    pantalla(hud(), el("section", {}, el("h2", { text: "2 · Llega un proveedor" }),
      t("p", `El repartidor de **${prov.nombre}** deja la mercancía en la puerta de servicio y espera tu firma. Compara **tu pedido**, **su albarán** y **lo que hay en el muelle**. Hoy es **${AL.doc.fecha(hoy)}**.`, { class: "ayuda" }),
      el("div", { class: "docs-recepcion" }, docPedido, estado.albaranDoc),
      el("h3", { class: "fase-tit", text: "En el muelle" }), el("div", { class: "recepcion" }, muelle),
      el("h3", { class: "fase-tit", text: "La firma" }), el("div", { class: "rec-fila" }, estado.firmaSel, el("div", { class: "clas-fb firma-fb" })),
      el("div", { class: "reto-acciones" }, btn("Firmar el albarán", corregirRecepcion))));
  }
  function correctaRecepcion(l) {
    if (l.tipo === "rechazar_temp" || l.tipo === "rechazar_envase" || l.tipo === "rechazar_fecha") return l.tipo;
    if (l.pedido == null || l.pedidoP !== l.p || l.pedido !== l.albaran) return "albaran_distinto";
    if (l.llegado < l.albaran) return "falta";
    if (l.llegado > l.albaran) return "sobra";
    return "aceptar";
  }
  const firmaCorrecta = () => (estado.recepcion.some(l => correctaRecepcion(l) !== "aceptar") ? "reservas" : "conforme");
  function corregirRecepcion() {
    if (estado.recepcion.some(l => !l.sel.value) || !estado.firmaSel.value) { acciones().before(fb("tip", "Decide todas las líneas y cómo firmas", "Aún no puedes firmar.")); return; }
    const obs = [];
    for (const l of estado.recepcion) {
      const sol = correctaRecepcion(l), ok = l.sel.value === sol;
      anota(ok, "rec-" + sol, l.p.nombre);
      l.sel.disabled = true;
      l.sel.parentNode.classList.add(ok ? "bien" : "mal");
      let detalle = POR_QUE[sol];
      if (sol === "albaran_distinto") detalle = l.pedido == null ? `No pedimos «${corto(l.p)}» y viene en el albarán: se anota y se devuelve.` : l.cambio ? `Pedimos «${corto(l.pedidoP)}» y traen «${corto(l.p)}»: no es lo mismo.` : `Pedimos ${l.pedido} y el albarán dice ${l.albaran}: si no se anota, se pagará lo que no se pidió (o faltará).`;
      if (sol === "aceptar" && l.trampaAmbiente) detalle = "¡Trampa! Esta bebida se conserva cerrada a temperatura ambiente: se acepta y se enfría solo lo que se vaya a servir.";
      if (sol === "falta" || sol === "sobra") detalle = `El albarán dice ${l.albaran} y en el muelle hay ${l.llegado}. ` + detalle;
      l.sel.parentNode.querySelector(".clas-fb").replaceChildren(t("p", (ok ? "✓ " : `✗ Lo correcto: **${ACC[sol]}**. `) + detalle));
      if (l.sel.value !== "aceptar") obs.push(`${corto(l.p)}: ${OBS[l.sel.value]}${l.sel.value === "falta" || l.sel.value === "sobra" ? ` (recibidos ${l.llegado} de ${l.albaran})` : ""}.`);
      if (!ok && sol !== "aceptar") estado.consecuencias.push(`«${corto(l.p)}»: la incidencia no se anotó como debía y no se podrá reclamar.`);
      if (!ok && sol === "aceptar") estado.consecuencias.push(`«${corto(l.p)}» se rechazó o se anotó sin motivo: el bar se queda sin ese producto.`);
    }
    const fsol = firmaCorrecta(), fok = estado.firmaSel.value === fsol;
    anota(fok, "firma", "firma del albarán");
    estado.firmaSel.disabled = true;
    estado.obs.replaceChildren(obs.join(" ") || "—");
    estado.firmaTxt.replaceChildren(estado.firmaSel.value === "reservas" ? "Con reservas · Barra" : "Conforme · Barra");
    raiz.querySelector(".firma-fb").replaceChildren(fok
      ? fb("ok", "Firma correcta", fsol === "reservas" ? "Había incidencias: se anotan en observaciones y se firma **con reservas**." : "Todo estaba bien: se firma **conforme**.")
      : fb("ko", "Firma incorrecta", fsol === "reservas" ? "Había incidencias: firmar conforme es aceptar que todo llegó bien. Se firma **con reservas**." : "No había ninguna incidencia: se firma **conforme**."));
    if (!fok && fsol === "reservas") estado.consecuencias.push("Firmaste conforme un albarán con incidencias: el proveedor dirá que todo llegó bien.");
    acciones().replaceChildren(btn("Colocar el género →", faseColocar));
  }

  // Fase 3 · Colocar: estantería FEFO con etiquetas de fecha reales + almacén de cada producto
  function faseColocar() {
    estado.fase = 3;
    const d = DIAS[estado.dia];
    const g = AL.gen.fefo(rnd, CAT, { unidades: d.fefo });
    estado.fefo = g;
    const formatos = ["corta", "puntos", "larga"];
    g.unidades.forEach(u => {
      u.llego = AL.doc.sumaDias(estado.hoy, -(d.fefo + 1 - u.entrada));
      u.cad = AL.doc.sumaDias(estado.hoy, u.caduca);
      u.etiqueta = rnd.pick([`CAD ${AL.doc.fecha(u.cad, rnd.pick(formatos))}`, `Fecha de caducidad: ${AL.doc.fecha(u.cad, rnd.pick(formatos))}`, `Cad.: ${AL.doc.fecha(u.cad)}`]);
    });
    const orden = rnd.shuffle(g.unidades.map(u => u.id));
    const lista = el("ol", { class: "ordenar" });
    const pintar = () => lista.replaceChildren(...orden.map((id, pos) => {
      const u = g.unidades.find(x => x.id === id);
      return el("li", { class: "ordenar-item" }, el("span", { class: "ordenar-n", text: `${pos + 1}.º` }),
        foto(g.producto, "prod-img peq"),
        el("span", { class: "ordenar-t" }, t("span", `**${u.texto}** · llegó el ${AL.doc.fecha(u.llego, "dm")}`), el("span", { class: "eti-fecha", text: u.etiqueta })),
        el("span", { class: "ordenar-btns" },
          el("button", { type: "button", class: "mini", "aria-label": `Adelantar ${u.texto}`, disabled: pos === 0, onclick: () => { [orden[pos - 1], orden[pos]] = [orden[pos], orden[pos - 1]]; pintar(); }, text: "↑" }),
          el("button", { type: "button", class: "mini", "aria-label": `Atrasar ${u.texto}`, disabled: pos === orden.length - 1, onclick: () => { [orden[pos + 1], orden[pos]] = [orden[pos], orden[pos + 1]]; pintar(); }, text: "↓" })));
    }));
    pintar();
    estado.ordenFefo = () => orden;
    const alm = AL.gen.almacen(rnd, CAT, { k: 3 });
    estado.almacen = alm.elementos.map(e => {
      const sel = el("select", { class: "sel", "aria-label": `Almacén para ${e.t}` }, el("option", { value: "", text: "¿Dónde va?" }), alm.categorias.map(c => el("option", { value: c, text: c })));
      return Object.assign({ sel, p: CAT.productos.find(p => p.nombre === e.t) }, e);
    });
    pantalla(hud(), el("section", {}, el("h2", { text: "3 · Coloca el género" }),
      t("p", `Hoy es **${AL.doc.fecha(estado.hoy)}**. Ordena la estantería leyendo las **etiquetas**: el 1.º es el que queda **delante** y se usa primero.`, { class: "ayuda" }), lista,
      el("h3", { class: "fase-tit", text: "¿Y estos productos, dónde se guardan?" }),
      el("div", { class: "recepcion" }, estado.almacen.map(a => el("div", { class: "rec-fila" }, el("div", { class: "muelle-cab" }, a.p ? foto(a.p) : null, el("p", { class: "rec-prod", text: a.t })), a.sel, el("div", { class: "clas-fb" })))),
      el("div", { class: "reto-acciones" }, btn("Comprobar la colocación", corregirColocar))));
  }
  function corregirColocar() {
    if (estado.almacen.some(a => !a.sel.value)) { acciones().before(fb("tip", "Falta algún almacén", "")); return; }
    const orden = estado.ordenFefo(), sol = estado.fefo.solucion;
    const okFefo = orden.join() === sol.join();
    anota(okFefo, "fefo", "estantería");
    raiz.querySelectorAll(".ordenar button").forEach(b => (b.disabled = true));
    const fechas = sol.map(id => { const u = estado.fefo.unidades.find(x => x.id === id); return `${u.id} (${AL.doc.fecha(u.cad, "dm")})`; }).join(" → ");
    raiz.querySelector(".ordenar").after(okFefo ? fb("ok", "Estantería FEFO correcta", "Lo que caduca antes, delante.")
      : fb("ko", "Estantería mal ordenada", `Orden correcto, por caducidad: ${fechas}.${estado.fefo.difiereDeFifo ? " Ojo: aquí el orden de llegada (FIFO) no coincide con el de caducidad: manda la fecha (FEFO)." : ""}`));
    if (!okFefo) estado.consecuencias.push("Una unidad caducó al fondo de la estantería: merma.");
    for (const a of estado.almacen) {
      const ok = a.sel.value === a.cat; anota(ok, "almacen", a.t);
      a.sel.disabled = true; a.sel.parentNode.classList.add(ok ? "bien" : "mal");
      a.sel.parentNode.querySelector(".clas-fb").replaceChildren(t("p", (ok ? "✓ " : `✗ Va a: **${a.cat}**. `) + a.fb));
    }
    acciones().replaceChildren(btn("Cerrar el día →", faseCierre));
  }

  // Fase 4 · Cierre: residuos
  function faseCierre() {
    estado.fase = 4;
    const d = DIAS[estado.dia];
    const g = AL.gen.residuos(rnd, CAT, { k: d.res });
    estado.residuos = g.elementos.map(e => Object.assign({ sel: el("select", { class: "sel", "aria-label": `Destino de ${e.t}` }, el("option", { value: "", text: "¿Dónde va?" }), g.categorias.map(c => el("option", { value: c, text: c }))) }, e));
    pantalla(hud(), el("section", {}, el("h2", { text: "4 · Cierre: residuos y retornables" }),
      t("p", "Recoges la barra. ¿Dónde va cada cosa? Recuerda: **los retornables no son residuos**.", { class: "ayuda" }),
      el("div", { class: "recepcion" }, estado.residuos.map(a => el("div", { class: "rec-fila" }, el("p", { class: "rec-prod", text: a.t }), a.sel, el("div", { class: "clas-fb" })))),
      el("div", { class: "reto-acciones" }, btn("Comprobar el cierre", corregirCierre))));
  }
  function corregirCierre() {
    if (estado.residuos.some(a => !a.sel.value)) { acciones().before(fb("tip", "Falta algún residuo", "")); return; }
    for (const a of estado.residuos) {
      const ok = a.sel.value === a.cat; anota(ok, "residuos", a.t);
      a.sel.disabled = true; a.sel.parentNode.classList.add(ok ? "bien" : "mal");
      a.sel.parentNode.querySelector(".clas-fb").replaceChildren(t("p", (ok ? "✓ " : `✗ Va a: **${a.cat}**. `) + a.fb));
    }
    acciones().replaceChildren(btn("Ver el resumen del día →", resumenDia));
  }

  function resumenDia() {
    const d = DIAS[estado.dia];
    const del = estado.log.slice(estado.diaLog);
    const bien = del.filter(x => x.ok).length;
    const estrellas = bien / del.length >= 0.9 ? 3 : bien / del.length >= 0.7 ? 2 : 1;
    estado.resumenDia.push({ dia: d.n, bien, total: del.length, estrellas });
    const ultimo = estado.dia === DIAS.length - 1;
    pantalla(hud(), el("section", { class: "resultado" }, el("h2", { text: `Resumen del ${d.n.toLowerCase()}` }),
      el("p", { class: "marcador" }, el("strong", { text: String(bien) }), ` de ${del.length} decisiones bien`),
      el("p", { class: "estrellas", "aria-label": `${estrellas} de 3 estrellas`, text: "★".repeat(estrellas) + "☆".repeat(3 - estrellas) }),
      estado.consecuencias.length ? el("div", { class: "fb fb-ko" }, el("h4", { text: "Lo que pasó hoy en la barra" }), el("ul", { class: "revision" }, estado.consecuencias.map(c => t("li", c))))
        : fb("ok", "Un día redondo", "Ni faltas, ni merma, ni incidencias sin anotar."),
      el("div", { class: "reto-acciones" }, btn(ultimo ? "Ver el resultado de la semana" : `Empezar el ${DIAS[estado.dia + 1].n.toLowerCase()} →`, () => { if (ultimo) final(); else { estado.dia++; iniciarDia(); } }))));
  }

  function final() {
    const pr = prefs();
    const nuevoRecord = estado.puntos > pr.record;
    pr.partidas++;
    if (!estado.reto) { pr.record = Math.max(pr.record, estado.puntos); pr.fallos = recalcularFallos(pr.fallos); }
    guardarPrefs(pr);
    const porConcepto = {};
    for (const x of estado.log) { const c = x.concepto.startsWith("rec-") ? "recepcion" : x.concepto; porConcepto[c] = porConcepto[c] || { ok: 0, n: 0 }; porConcepto[c].n++; if (x.ok) porConcepto[c].ok++; }
    const NOMBRES = { reposicion: "Calcular el vale", recepcion: "Recibir y comprobar", firma: "Firmar el albarán", fefo: "Rotación FEFO", almacen: "Elegir el almacén", residuos: "Residuos y retornables" };
    const repasar = Object.entries(porConcepto).filter(([, v]) => v.ok / v.n < 0.8).map(([k]) => NOMBRES[k]);
    const zonaCod = el("div", {});
    if (estado.reto) {
      const inp = el("input", { type: "number", inputmode: "numeric", min: "1", max: "40", class: "num", "aria-label": "Tu número de lista" });
      zonaCod.append(el("label", { class: "num-fila" }, el("span", { text: "Nº de lista" }), inp), btn("Generar mi código", () => {
        const lista = parseInt(inp.value, 10); if (!(lista >= 1 && lista <= 40)) return;
        const aciertos = Math.min(99, Math.round(estado.puntos / 10)), total = Math.min(99, Math.round(estado.max / 10));
        const codigo = AL.codigo({ sesion: "J01", aciertos, total, lista, dia: AL.hoy() });
        zonaCod.replaceChildren(el("div", { class: "codigo" }, el("p", { class: "eyebrow", text: `Reto ${estado.reto} · código para tu profesora` }), el("p", { class: "codigo-v", text: codigo }), el("p", { class: "note", text: `${aciertos} de ${total} decisiones · válido hoy (${AL.hoy()})` })));
      }));
    }
    pantalla(el("section", { class: "resultado" }, el("h1", { text: "¡Semana terminada!" }),
      el("p", { class: "marcador" }, el("strong", { text: String(estado.puntos) }), ` puntos de ${estado.max}`),
      !estado.reto && nuevoRecord ? fb("ok", "¡Nuevo récord!", "") : null,
      el("table", { class: "tabla" }, el("thead", {}, el("tr", {}, ["Día", "Bien", "Estrellas"].map(h => el("th", { text: h })))),
        el("tbody", {}, estado.resumenDia.map(r => el("tr", {}, el("td", { "data-h": "Día", text: r.dia }), el("td", { "data-h": "Bien", text: `${r.bien}/${r.total}` }), el("td", { "data-h": "Estrellas", text: "★".repeat(r.estrellas) + "☆".repeat(3 - r.estrellas) }))))),
      repasar.length ? fb("tip", "Para repasar", "En tu próxima partida saldrán más retos de: **" + repasar.join("**, **") + "**.") : fb("ok", "Lo dominas todo", "Prueba a batir tu récord: la próxima semana será distinta."),
      zonaCod,
      el("div", { class: "reto-acciones" }, btn("Jugar otra semana", () => empezar("")), el("a", { class: "btn btn-sec", href: "../", text: "Volver a los juegos" })),
      el("p", { class: "note", text: "Puntuación de juego: no es una nota." })));
  }
  function recalcularFallos(previos) {
    // Repaso espaciado sencillo: lo fallado en esta partida suma; lo acertado resta. Nunca por debajo de 0.
    const r = Object.assign({}, previos);
    for (const x of estado.log) { if (!x.concepto.startsWith("rec-")) continue; r[x.concepto] = Math.max(0, (r[x.concepto] || 0) + (x.ok ? -1 : 1)); }
    return r;
  }

  document.addEventListener("DOMContentLoaded", () => {
    BANCO = window.BANCO; CAT = BANCO.catalogo; raiz = document.getElementById("app");
    inicio();
  });
  window.__SEMANA = { DIAS, ACC, PROVEEDORES, correctaRecepcion, firmaCorrecta, get estado() { return estado; } };
})();
