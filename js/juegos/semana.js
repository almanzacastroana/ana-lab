// ANA LAB · Juego «Semana de barra» (3038 · Tema 1). Simulación de acopio de lunes a viernes.
// Cada día: 1 Pedir (vale) · 2 Recibir (pedido/albarán/llegado + calidad) · 3 Colocar (FEFO + almacén) · 4 Cerrar (residuos).
// Puntúa decisiones correctas (no velocidad). Lo fallado vuelve con más frecuencia. Récord y repasos solo en el dispositivo.
// Modo «reto de clase»: ?reto=CODIGO → misma semana para todo el grupo y código final verificable.
(function () {
  const AL = window.AL;
  const { el, t } = AL;
  const DIAS = [
    { n: "Lunes", lugar: "Cafetería", lineas: 3, factores: [1], rec: 3, fefo: 3, res: 4, nota: "Día tranquilo para empezar." },
    { n: "Martes", lugar: "Cafetería", lineas: 3, factores: [1, 1.5], rec: 4, fefo: 4, res: 4, nota: "Hay un grupo de desayunos." },
    { n: "Miércoles", lugar: "Cafetería", lineas: 4, factores: [1, 1.5], rec: 4, fefo: 4, res: 5, nota: "Llega un proveedor nuevo: atención al albarán." },
    { n: "Jueves", lugar: "Cafetería", lineas: 4, factores: [1.5, 2], rec: 5, fefo: 5, res: 5, nota: "Jornada de puertas abiertas." },
    { n: "Viernes", lugar: "Bitácora", lineas: 5, factores: [2], rec: 5, fefo: 5, res: 6, nota: "Servicio en el restaurante-escuela: 40 comensales." }
  ];
  const PUNTOS = 10;
  const corto = p => p.nombre.replace(/\s*\(.*?\)\s*/g, " ").trim();
  const conFormato = p => p.n > 1 ? `${corto(p)} (${p.formato} ${p.n})` : corto(p);
  const DEFECTOS = [
    { id: "hinchado", t: "envase hinchado", aplica: p => p.cerrado !== null, bien: "rechazar", fb: "Un envase hinchado puede indicar fermentación o contaminación: se rechaza y se anota." },
    { id: "precinto", t: "precinto roto", aplica: p => ["cafe", "cacao", "mermelada", "jamon", "mantequilla"].includes(p.id), bien: "rechazar", fb: "Con el precinto roto no se puede garantizar su estado." },
    { id: "templado", t: "llega templado (11 °C)", aplica: p => p.cerrado === "refrigeracion", bien: "rechazar", fb: "Un refrigerado templado ha roto la cadena de frío." },
    { id: "blando", t: "congelado blando, con bloques de hielo dentro", aplica: p => p.cerrado === "congelacion", bien: "rechazar", fb: "Señales de descongelación y recongelación." },
    { id: "caduca", t: "caduca mañana y se iba a usar toda la semana", aplica: p => ["refrigeracion"].includes(p.cerrado), bien: "rechazar", fb: "La fecha no es suficiente para el uso previsto." },
    { id: "ambiente", t: "llega a temperatura ambiente", aplica: p => p.cerrado === "ambiente" && p.almacen === "bodega", bien: "aceptar", fb: "¡Trampa! Cerrado se conserva a temperatura ambiente: se acepta y se enfría solo lo que se va a servir." }
  ];
  const ACC = {
    aceptar: "Aceptar: todo correcto",
    falta: "Anotar: falta mercancía",
    sobra: "Anotar: llega de más",
    albaran_distinto: "Anotar: el albarán no coincide con lo pedido",
    rechazar: "Rechazar por calidad y anotarlo"
  };

  let BANCO, CAT, raiz, rnd, estado;
  const clave = () => `${BANCO.tema}:juego-semana`;
  const prefs = () => AL.store.get(clave(), { record: 0, partidas: 0, fallos: {} });
  const guardarPrefs = x => AL.store.set(clave(), x);

  // ───────── Utilidades de pantalla ─────────
  function pantalla(...hijos) { raiz.replaceChildren(el("main", { id: "contenido", class: "juego-main" }, ...hijos)); window.scrollTo(0, 0); const h = raiz.querySelector("h1, h2"); if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); } }
  function hud() {
    const d = DIAS[estado.dia];
    return el("div", { class: "hud" },
      el("div", { class: "hud-t" }, el("strong", { text: `${d.n} · ${d.lugar}` }), el("span", { class: "note", text: estado.fase ? `Fase ${estado.fase} de 4` : "" })),
      el("div", { class: "hud-stats" }, el("span", { class: "stat" }, el("em", { text: "Puntos" }), String(estado.puntos)), el("span", { class: "stat" }, el("em", { text: "Récord" }), String(prefs().record))));
  }
  const btn = (txt, f, cls) => el("button", { type: "button", class: "btn " + (cls || "btn-primario"), onclick: f, text: txt });
  function fallo(concepto) { estado.fallos[concepto] = (estado.fallos[concepto] || 0) + 1; }
  function anota(ok, concepto, texto) { estado.log.push({ ok, concepto, texto }); if (ok) estado.puntos += PUNTOS; else fallo(concepto); estado.max += PUNTOS; }
  function fb(clase, tit, txt) { return el("div", { class: `fb fb-${clase}` }, el("h4", { text: tit }), txt ? t("p", txt) : null); }

  // ───────── Inicio ─────────
  function inicio() {
    const pr = prefs();
    const params = new URLSearchParams(location.search);
    const reto = (params.get("reto") || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
    pantalla(
      el("header", { class: "juego-hero" }, el("p", { class: "eyebrow", text: "3038 · Tema 1 · Juego" }), el("h1", { text: "Semana de barra" }),
        t("p", "Llevas el acopio de la cafetería de **lunes a viernes**. Pide lo justo, recibe con ojo, coloca con cabeza y cierra limpio. El viernes, servicio en **Bitácora**.")),
      el("section", { class: "juego-reglas" },
        el("h2", { text: "Cómo se juega" }),
        el("ol", {}, ["**Pedir:** calcula cuánto pedir de cada producto (con previsión y formato).", "**Recibir:** compara pedido, albarán y llegado, y revisa la calidad.", "**Colocar:** ordena por fecha (FEFO) y decide el almacén.", "**Cerrar:** separa los residuos y los retornables."].map(x => t("li", x))),
        t("p", "Cada decisión correcta suma **10 puntos**. **No cuenta la velocidad**: piensa. Lo que falles volverá a salir para que lo domines.", { class: "note" })),
      reto ? fb("tip", `Reto de clase: ${reto}`, "Toda la clase juega la misma semana. Al terminar tendrás un código para tu profesora.") : null,
      el("div", { class: "reto-acciones" }, btn(reto ? "Empezar el reto de clase" : "Empezar la semana", () => empezar(reto))),
      pr.partidas ? el("p", { class: "note", text: `Partidas jugadas: ${pr.partidas} · Tu récord: ${pr.record} puntos.` }) : null,
      el("p", { class: "note", text: "Puntuación de juego: no es una nota. Todo se guarda solo en este dispositivo." }));
  }

  function empezar(reto) {
    const semilla = reto ? AL.hash("semana|" + reto) : AL.semillaNueva();
    rnd = AL.rng(semilla);
    estado = { reto, semilla, dia: 0, fase: 0, puntos: 0, max: 0, log: [], fallos: reto ? {} : Object.assign({}, prefs().fallos), resumenDia: [] };
    iniciarDia();
  }

  // ───────── Día ─────────
  function iniciarDia() {
    const d = DIAS[estado.dia];
    estado.fase = 0; estado.diaLog = estado.log.length; estado.consecuencias = [];
    pantalla(hud(), el("section", { class: "dia-intro" }, el("p", { class: "eyebrow", text: `Día ${estado.dia + 1} de 5` }), el("h2", { text: `${d.n} en ${d.lugar === "Bitácora" ? "Bitácora" : "la cafetería"}` }), t("p", d.nota),
      el("div", { class: "reto-acciones" }, btn("Empezar el día", fasePedido))));
  }

  // Elegir productos teniendo en cuenta lo que se ha fallado (repaso): más peso a lo fallado.
  function productosDelDia(n) {
    const base = CAT.productos.filter(p => p.almacen !== "material" && p.n >= 4 && p.n <= 24);
    return rnd.sample(base, n);
  }

  // Fase 1 · Pedido
  function fasePedido() {
    estado.fase = 1;
    const d = DIAS[estado.dia];
    const prods = productosDelDia(d.lineas);
    const factor = rnd.pick(d.factores);
    estado.pedido = prods.map(p => {
      let apertura = rnd.pick([12, 16, 20, 24, 30, 36]);
      const objetivo = apertura * factor;
      const existencias = rnd.int(0, Math.min(apertura, objetivo));
      const faltan = Math.max(0, objetivo - existencias);
      return { p, apertura, factor, existencias, faltan, pedir: Math.ceil(faltan / p.n) };
    });
    const filas = estado.pedido.map(l => {
      const inp = el("input", { type: "number", inputmode: "numeric", min: "0", class: "num", "aria-label": `${l.p.formato}s de ${corto(l.p)}` });
      l.inp = inp;
      return el("div", { class: "rec-fila" }, el("p", { class: "rec-prod", text: corto(l.p) }),
        el("dl", { class: "rec-nums cuatro" }, el("dt", { text: "Apertura" }), el("dd", { text: String(l.apertura) }), el("dt", { text: "Previsión" }), el("dd", { text: "×" + String(l.factor).replace(".", ",") }),
          el("dt", { text: "Quedan" }), el("dd", { text: String(l.existencias) }), el("dt", { text: "Formato" }), el("dd", { class: "peq", text: `${l.p.formato} ${l.p.n}` })),
        el("label", { class: "num-fila" }, el("span", { text: "Pido:" }), inp, el("span", { text: l.p.formato === "pack" ? "packs" : l.p.formato + "s" })));
    });
    pantalla(hud(), el("section", {}, el("h2", { text: "1 · Haz el pedido al almacén" }),
      t("p", `Previsión de hoy: **×${String(factor).replace(".", ",")}**. ¿Cuántas cajas o packs pides de cada producto? Escribe 0 si no hace falta.`, { class: "ayuda" }),
      el("div", { class: "recepcion" }, filas), el("div", { class: "reto-acciones" }, btn("Enviar el vale", corregirPedido))));
  }
  function corregirPedido() {
    if (estado.pedido.some(l => l.inp.value === "")) { raiz.querySelector(".reto-acciones").before(fb("tip", "Falta alguna cantidad", "Escribe 0 si no hace falta pedir.")); return; }
    const notas = [];
    for (const l of estado.pedido) {
      const v = Number(l.inp.value), ok = v === l.pedir;
      anota(ok, "reposicion", corto(l.p));
      const calc = `${l.apertura}${l.factor !== 1 ? " × " + String(l.factor).replace(".", ",") : ""} − ${l.existencias} = ${l.faltan} → ${l.faltan} ÷ ${l.p.n} → **${l.pedir}**`;
      if (ok) notas.push(t("li", `✓ ${corto(l.p)}: ${l.pedir}. ${calc}`));
      else if (v < l.pedir) { const falt = l.faltan - v * l.p.n; estado.consecuencias.push(`Se acabó «${corto(l.p)}» a media mañana: faltaron ${falt} unidades.`); notas.push(t("li", `✗ ${corto(l.p)}: pediste ${v}, hacían falta ${l.pedir}. ${calc}`)); }
      else { estado.consecuencias.push(`Sobran ${(v - l.pedir) * l.p.n} unidades de «${corto(l.p)}»: ocupan sitio y pueden acabar en merma.`); notas.push(t("li", `✗ ${corto(l.p)}: pediste ${v}, bastaba con ${l.pedir}. ${calc}`)); }
    }
    raiz.querySelectorAll("input").forEach(i => (i.disabled = true));
    raiz.querySelector(".reto-acciones").replaceChildren(btn("Llega el pedido →", faseRecepcion));
    raiz.querySelector(".reto-acciones").before(el("div", { class: "fb fb-tip" }, el("h4", { text: "Corrección del vale" }), el("ul", { class: "revision" }, notas)));
  }

  // Fase 2 · Recepción (cantidad o calidad; como máximo un problema por línea)
  function faseRecepcion() {
    estado.fase = 2;
    const d = DIAS[estado.dia];
    const tipos = ["aceptar", "falta", "sobra", "albaran_distinto", "rechazar", "rechazar", "aceptar"];
    // Repaso: si se ha fallado un tipo, aparece al menos una vez.
    const pendientes = Object.keys(ACC).filter(k => (estado.fallos["rec-" + k] || 0) > 0);
    const prods = rnd.sample(CAT.productos.filter(p => p.almacen !== "material"), d.rec);
    estado.recepcion = prods.map((p, i) => {
      let tipo = i < pendientes.length ? pendientes[i] : rnd.pick(tipos);
      let defecto = null;
      if (tipo === "rechazar" || (tipo === "aceptar" && rnd() < 0.35)) {
        const posibles = DEFECTOS.filter(x => x.aplica(p) && (tipo === "rechazar" ? x.bien === "rechazar" : x.bien === "aceptar"));
        if (posibles.length) defecto = rnd.pick(posibles); else tipo = tipo === "rechazar" ? "aceptar" : tipo;
      }
      let pedido = rnd.int(2, 10), albaran = pedido, llegado = pedido;
      if (tipo === "falta") llegado = albaran - rnd.int(1, 2);
      if (tipo === "sobra") llegado = albaran + 1;
      if (tipo === "albaran_distinto") { albaran = pedido + rnd.pick([-2, -1, 1, 2, 3]); llegado = albaran; }
      return { p, tipo, defecto, pedido, albaran, llegado };
    });
    const filas = estado.recepcion.map(l => {
      const sel = el("select", { class: "sel", "aria-label": `Decisión para ${corto(l.p)}` }, el("option", { value: "", text: "¿Qué haces?" }), Object.entries(ACC).map(([k, v]) => el("option", { value: k, text: v })));
      l.sel = sel;
      return el("div", { class: "rec-fila" }, el("p", { class: "rec-prod", text: conFormato(l.p) }),
        el("dl", { class: "rec-nums" }, el("dt", { text: "Pedido" }), el("dd", { text: String(l.pedido) }), el("dt", { text: "Albarán" }), el("dd", { text: String(l.albaran) }), el("dt", { text: "Llegado" }), el("dd", { text: String(l.llegado) })),
        l.defecto ? el("p", { class: "defecto", text: "Al revisarlo: " + l.defecto.t }) : el("p", { class: "defecto ok", text: "Al revisarlo: envase y fechas correctos" }),
        sel, el("div", { class: "clas-fb" }));
    });
    pantalla(hud(), el("section", {}, el("h2", { text: "2 · Recibe el pedido" }), t("p", "Compara **pedido, albarán y llegado** y revisa la calidad. Decide qué haces con cada línea **antes de firmar**.", { class: "ayuda" }),
      el("div", { class: "recepcion" }, filas), el("div", { class: "reto-acciones" }, btn("Firmar el albarán", corregirRecepcion))));
  }
  function correctaRecepcion(l) {
    if (l.defecto) return l.defecto.bien;
    if (l.pedido !== l.albaran) return "albaran_distinto";
    if (l.llegado < l.albaran) return "falta";
    if (l.llegado > l.albaran) return "sobra";
    return "aceptar";
  }
  function corregirRecepcion() {
    if (estado.recepcion.some(l => !l.sel.value)) { raiz.querySelector(".reto-acciones").before(fb("tip", "Decide todas las líneas", "Aún no puedes firmar.")); return; }
    for (const l of estado.recepcion) {
      const sol = correctaRecepcion(l), ok = l.sel.value === sol;
      anota(ok, "rec-" + sol, l.p.nombre);
      l.sel.disabled = true;
      l.sel.parentNode.classList.add(ok ? "bien" : "mal");
      const porque = l.defecto ? l.defecto.fb : { aceptar: "Todo cuadra.", falta: "Ha llegado menos de lo que dice el albarán: se anota antes de firmar.", sobra: "Ha llegado más de lo que dice el albarán: se anota.", albaran_distinto: "El albarán no coincide con lo que pediste: si no lo anotas, te cobrarán lo que no pediste (o te faltará)." }[sol];
      l.sel.parentNode.querySelector(".clas-fb").replaceChildren(t("p", (ok ? "✓ " : `✗ Lo correcto: **${ACC[sol]}**. `) + porque));
      if (!ok && sol !== "aceptar") estado.consecuencias.push(`«${corto(l.p)}»: la incidencia no se anotó y no se podrá reclamar.`);
      if (!ok && sol === "aceptar") estado.consecuencias.push(`«${corto(l.p)}» se rechazó sin motivo: el bar se queda sin ese producto.`);
    }
    raiz.querySelector(".reto-acciones").replaceChildren(btn("Colocar el género →", faseColocar));
  }

  // Fase 3 · Colocar: FEFO + almacén
  function faseColocar() {
    estado.fase = 3;
    const d = DIAS[estado.dia];
    const g = AL.gen.fefo(rnd, CAT, { unidades: d.fefo });
    estado.fefo = g;
    let orden = rnd.shuffle(g.unidades.map(u => u.id));
    const lista = el("ol", { class: "ordenar" });
    const pintar = () => lista.replaceChildren(...orden.map((id, pos) => {
      const u = g.unidades.find(x => x.id === id);
      return el("li", { class: "ordenar-item" }, el("span", { class: "ordenar-n", text: pos === 0 ? "Delante" : pos === orden.length - 1 ? "Detrás" : String(pos + 1) }),
        t("span", `**${u.texto}** · llegó el día ${u.entrada} · caduca el **${u.caduca}**`, { class: "ordenar-t" }),
        el("span", { class: "ordenar-btns" },
          el("button", { type: "button", class: "mini", "aria-label": `Adelantar ${u.texto}`, disabled: pos === 0, onclick: () => { [orden[pos - 1], orden[pos]] = [orden[pos], orden[pos - 1]]; pintar(); }, text: "↑" }),
          el("button", { type: "button", class: "mini", "aria-label": `Atrasar ${u.texto}`, disabled: pos === orden.length - 1, onclick: () => { [orden[pos + 1], orden[pos]] = [orden[pos], orden[pos + 1]]; pintar(); }, text: "↓" })));
    }));
    pintar();
    estado.ordenFefo = () => orden;
    const alm = AL.gen.almacen(rnd, CAT, { k: 3 });
    estado.almacen = alm.elementos.map(e => {
      const sel = el("select", { class: "sel", "aria-label": `Almacén para ${e.t}` }, el("option", { value: "", text: "¿Dónde va?" }), alm.categorias.map(c => el("option", { value: c, text: c })));
      return Object.assign({ sel }, e);
    });
    pantalla(hud(), el("section", {}, el("h2", { text: "3 · Coloca el género" }),
      t("p", "Ordena la estantería: **arriba = delante** (lo que se usa primero).", { class: "ayuda" }), lista,
      el("h3", { class: "fase-tit", text: "¿Y estos productos, dónde se guardan?" }),
      el("div", { class: "recepcion" }, estado.almacen.map(a => el("div", { class: "rec-fila" }, el("p", { class: "rec-prod", text: a.t }), a.sel, el("div", { class: "clas-fb" })))),
      el("div", { class: "reto-acciones" }, btn("Comprobar la colocación", corregirColocar))));
  }
  function corregirColocar() {
    if (estado.almacen.some(a => !a.sel.value)) { raiz.querySelector(".reto-acciones").before(fb("tip", "Falta algún almacén", "")); return; }
    const orden = estado.ordenFefo(), sol = estado.fefo.solucion;
    const okFefo = orden.join() === sol.join();
    anota(okFefo, "fefo", "estantería");
    raiz.querySelectorAll(".ordenar button").forEach(b => (b.disabled = true));
    raiz.querySelector(".ordenar").after(okFefo ? fb("ok", "Estantería FEFO correcta", "Lo que caduca antes, delante.")
      : fb("ko", "Estantería mal ordenada", `Orden correcto (por caducidad): ${sol.join(" → ")}.${estado.fefo.difiereDeFifo ? " Ojo: aquí el orden de llegada (FIFO) no coincide con el de caducidad: manda la fecha (FEFO)." : ""}`));
    if (!okFefo) estado.consecuencias.push("Una unidad caducó al fondo de la estantería: merma.");
    for (const a of estado.almacen) {
      const ok = a.sel.value === a.cat; anota(ok, "almacen", a.t);
      a.sel.disabled = true; a.sel.parentNode.classList.add(ok ? "bien" : "mal");
      a.sel.parentNode.querySelector(".clas-fb").replaceChildren(t("p", (ok ? "✓ " : `✗ Va a: **${a.cat}**. `) + a.fb));
    }
    raiz.querySelector(".reto-acciones").replaceChildren(btn("Cerrar el día →", faseCierre));
  }

  // Fase 4 · Cierre: residuos
  function faseCierre() {
    estado.fase = 4;
    const d = DIAS[estado.dia];
    const g = AL.gen.residuos(rnd, CAT, { k: d.res });
    estado.residuos = g.elementos.map(e => Object.assign({ sel: el("select", { class: "sel", "aria-label": `Destino de ${e.t}` }, el("option", { value: "", text: "¿Dónde va?" }), g.categorias.map(c => el("option", { value: c, text: c }))) }, e));
    pantalla(hud(), el("section", {}, el("h2", { text: "4 · Cierre: residuos y retornables" }),
      el("div", { class: "recepcion" }, estado.residuos.map(a => el("div", { class: "rec-fila" }, el("p", { class: "rec-prod", text: a.t }), a.sel, el("div", { class: "clas-fb" })))),
      el("div", { class: "reto-acciones" }, btn("Comprobar el cierre", corregirCierre))));
  }
  function corregirCierre() {
    if (estado.residuos.some(a => !a.sel.value)) { raiz.querySelector(".reto-acciones").before(fb("tip", "Falta algún residuo", "")); return; }
    for (const a of estado.residuos) {
      const ok = a.sel.value === a.cat; anota(ok, "residuos", a.t);
      a.sel.disabled = true; a.sel.parentNode.classList.add(ok ? "bien" : "mal");
      a.sel.parentNode.querySelector(".clas-fb").replaceChildren(t("p", (ok ? "✓ " : `✗ Va a: **${a.cat}**. `) + a.fb));
    }
    raiz.querySelector(".reto-acciones").replaceChildren(btn("Ver el resumen del día →", resumenDia));
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
    const NOMBRES = { reposicion: "Calcular el pedido", recepcion: "Recibir y comprobar", fefo: "Rotación FEFO", almacen: "Elegir el almacén", residuos: "Residuos y retornables" };
    const repasar = Object.entries(porConcepto).filter(([, v]) => v.ok / v.n < 0.8).map(([k]) => NOMBRES[k]);
    let codigo = null, lista = null;
    const zonaCod = el("div", {});
    if (estado.reto) {
      const inp = el("input", { type: "number", inputmode: "numeric", min: "1", max: "40", class: "num", "aria-label": "Tu número de lista" });
      zonaCod.append(el("label", { class: "num-fila" }, el("span", { text: "Nº de lista" }), inp), btn("Generar mi código", () => {
        lista = parseInt(inp.value, 10); if (!(lista >= 1 && lista <= 40)) return;
        const aciertos = Math.min(99, Math.round(estado.puntos / 10)), total = Math.min(99, Math.round(estado.max / 10));
        codigo = AL.codigo({ sesion: "J01", aciertos, total, lista, dia: AL.hoy() });
        zonaCod.replaceChildren(el("div", { class: "codigo" }, el("p", { class: "eyebrow", text: `Reto ${estado.reto} · código para tu profesora` }), el("p", { class: "codigo-v", text: codigo }), el("p", { class: "note", text: `${aciertos} de ${total} decisiones · válido hoy (${AL.hoy()})` })));
      }));
    }
    pantalla(el("section", { class: "resultado" }, el("h1", { text: "¡Semana terminada!" }),
      el("p", { class: "marcador" }, el("strong", { text: String(estado.puntos) }), ` puntos de ${estado.max}`),
      !estado.reto && nuevoRecord ? fb("ok", "¡Nuevo récord!", "") : null,
      el("table", { class: "tabla" }, el("thead", {}, el("tr", {}, ["Día", "Bien", "Estrellas"].map(h => el("th", { text: h })))),
        el("tbody", {}, estado.resumenDia.map(r => el("tr", {}, el("td", { "data-h": "Día", text: r.dia }), el("td", { "data-h": "Bien", text: `${r.bien}/${r.total}` }), el("td", { "data-h": "Estrellas", text: "★".repeat(r.estrellas) + "☆".repeat(3 - r.estrellas) }))))),
      repasar.length ? fb("tip", "Para repasar", "En tu próxima partida saldrán más retos de: **" + repasar.join("**, **") + "**.") : fb("ok", "Lo dominas todo", "Prueba a batir tu récord."),
      zonaCod,
      el("div", { class: "reto-acciones" }, btn("Jugar otra semana", () => empezar(estado.reto && false)), el("a", { class: "btn btn-sec", href: "../", text: "Volver a los juegos" })),
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
  window.__SEMANA = { DIAS, DEFECTOS, ACC, correctaRecepcion, get estado() { return estado; } };
})();
