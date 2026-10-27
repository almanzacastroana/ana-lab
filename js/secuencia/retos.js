// ANA LAB · Pintado de los 16 tipos de reto del banco.
// Uso: AL.retos.crear(reto, ctx) → nodo. ctx = { rnd, catalogo, alTerminar(resultado), compacto }
// resultado = { id, puntos (0–1), autoevaluado }. Nada exige arrastrar: todo se hace con toques o teclado.
(function () {
  const AL = (window.AL = window.AL || {});
  const { el, t } = AL;

  const ETIQUETA = {
    "elegir": "Elige", "elegir-varias": "Marca todas las correctas", "ordenar": "Ordena", "clasificar": "Clasifica",
    "emparejar": "Relaciona", "calcular": "Calcula", "completar-documento": "Completa el documento",
    "detectar-errores": "Detecta los errores", "simulacion": "Simulación", "situar": "Sitúa", "caso": "Caso",
    "priorizar": "Prioriza", "consecuencia": "¿Qué pasaría?", "corregir": "Corrige", "justificar": "Explica",
    "vocabulario-en-uso": "Vocabulario en uso"
  };

  // ───────── Piezas comunes ─────────
  function feedback(clase, titulo, texto) {
    return el("div", { class: `fb fb-${clase}` }, el("h4", { text: titulo }), texto ? t("p", texto) : null);
  }
  function boton(texto, onclick, clase) { return el("button", { type: "button", class: "btn " + (clase || "btn-primario"), onclick, text: texto }); }

  function marco(reto, ctx) {
    const zonaFb = el("div", { class: "reto-fb", "aria-live": "polite" });
    const acciones = el("div", { class: "reto-acciones" });
    const cuerpo = el("div", { class: "reto-cuerpo" });
    const nodo = el("article", { class: "reto", "data-id": reto.id, "data-tipo": reto.tipo },
      el("div", { class: "reto-cab" },
        el("span", { class: "reto-tipo", text: ETIQUETA[reto.tipo] || reto.tipo }),
        el("span", { class: "reto-dif", title: "Dificultad", text: "●".repeat(reto.dif) + "○".repeat(3 - reto.dif) })),
      reto._enunciado ? t("p", reto._enunciado, { class: "reto-enun" }) : t("p", reto.enunciado, { class: "reto-enun" }),
      cuerpo, acciones, zonaFb);
    let terminado = false;
    const api = {
      nodo, cuerpo, acciones,
      fb(clase, titulo, texto) { zonaFb.replaceChildren(feedback(clase, titulo, texto)); },
      fbAdd(nodoExtra) { zonaFb.append(nodoExtra); },
      fin(puntos, autoevaluado) {
        if (terminado) return;
        terminado = true;
        nodo.classList.add("hecho");
        ctx.alTerminar && ctx.alTerminar({ id: reto.id, puntos: Math.max(0, Math.min(1, puntos)), autoevaluado: !!autoevaluado });
      },
      porque() {
        const extra = [];
        if (reto.explicacion) extra.push(feedback("tip", "Por qué", reto.explicacion));
        if (reto.error_tipico) extra.push(feedback("tip", "Ojo con…", reto.error_tipico));
        extra.forEach(x => zonaFb.append(x));
      },
      get terminado() { return terminado; }
    };
    return api;
  }

  function autoevaluacion(m, modelo, pauta) {
    m.fbAdd(el("div", { class: "fb fb-tip" },
      el("h4", { text: "Respuesta modelo" }), modelo ? t("p", modelo) : null,
      pauta && pauta.length ? el("ul", { class: "pauta" }, pauta.map(p => t("li", p))) : null));
    const caja = el("div", { class: "autoeval", role: "group", "aria-label": "¿Tu respuesta se parece al modelo?" },
      el("p", { class: "autoeval-q", text: "Compara con el modelo. ¿Tu respuesta lo tiene?" }));
    [["Sí", 1], ["En parte", 0.5], ["Aún no", 0]].forEach(([txt, p]) =>
      caja.append(boton(txt, () => { caja.querySelectorAll("button").forEach(b => (b.disabled = true)); m.fin(p, true);
        m.fbAdd(feedback(p === 1 ? "ok" : "tip", p === 1 ? "¡Bien!" : "Lo repasamos", p === 1 ? "" : "Este concepto volverá a aparecer en el repaso.")); }, "btn-sec")));
    m.fbAdd(caja);
  }

  // ───────── Elegir una (elegir, consecuencia, caso con opciones, vocabulario con opciones, detectar con opciones) ─────────
  function unaOpcion(reto, ctx, opcionesFuente, alAcertar) {
    const m = marco(reto, ctx);
    const opciones = ctx.rnd.shuffle(opcionesFuente);
    let intentos = 0;
    const lista = el("div", { class: "opciones", role: "group", "aria-label": "Opciones" });
    opciones.forEach((o, i) => {
      const b = el("button", { type: "button", class: "opcion", onclick: () => {
        if (m.terminado || b.disabled) return;
        intentos++;
        if (o.ok) {
          b.classList.add("bien");
          lista.querySelectorAll("button").forEach(x => (x.disabled = true));
          m.fb("ok", intentos === 1 ? "¡Correcto!" : "Correcto", o.fb);
          m.porque();
          m.fin(intentos === 1 ? 1 : 0);
          alAcertar && alAcertar();
        } else {
          b.classList.add("mal"); b.disabled = true;
          m.fb("ko", "Todavía no", o.fb + " Prueba otra vez.");
        }
      } }, el("span", { class: "opcion-l", "aria-hidden": "true", text: String.fromCharCode(65 + i) }), t("span", o.t));
      lista.append(b);
    });
    m.cuerpo.append(lista);
    return m.nodo;
  }

  // ───────── Elegir varias ─────────
  function varias(reto, ctx) {
    const m = marco(reto, ctx);
    const opciones = ctx.rnd.shuffle(reto.opciones);
    const lista = el("div", { class: "opciones", role: "group", "aria-label": "Marca todas las que correspondan" });
    const botones = opciones.map(o => {
      const b = el("button", { type: "button", class: "opcion toggle", "aria-pressed": "false",
        onclick: () => { if (!m.terminado) b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); } },
        el("span", { class: "check", "aria-hidden": "true" }), t("span", o.t));
      lista.append(b); return b;
    });
    m.cuerpo.append(lista);
    m.acciones.append(boton("Comprobar", () => {
      if (m.terminado) return;
      let aciertos = 0, fallos = 0; const total = opciones.filter(o => o.ok).length;
      const notas = el("ul", { class: "revision" });
      opciones.forEach((o, i) => {
        const marcada = botones[i].getAttribute("aria-pressed") === "true";
        botones[i].disabled = true;
        if (marcada && o.ok) { aciertos++; botones[i].classList.add("bien"); }
        else if (marcada && !o.ok) { fallos++; botones[i].classList.add("mal"); notas.append(t("li", "✗ " + o.t + ": " + o.fb)); }
        else if (!marcada && o.ok) { botones[i].classList.add("falto"); notas.append(t("li", "Faltaba: " + o.t + ". " + o.fb)); }
      });
      const p = Math.max(0, (aciertos - fallos) / total);
      m.fb(p === 1 ? "ok" : "ko", p === 1 ? "¡Todas bien!" : `${aciertos} de ${total} correctas${fallos ? `, ${fallos} de más` : ""}`);
      if (notas.children.length) m.fbAdd(notas);
      m.porque(); m.fin(p); m.acciones.replaceChildren();
    }));
    return m.nodo;
  }

  // ───────── Ordenar (pasos, priorizar, FEFO, traslado) ─────────
  function ordenar(reto, ctx, items, correcto, { flexible, detalle } = {}) {
    const m = marco(reto, ctx);
    let orden = ctx.rnd.shuffle(items.map((_, i) => i));
    if (orden.every((v, i) => v === i) && items.length > 1) orden = orden.slice(1).concat(orden[0]);
    const lista = el("ol", { class: "ordenar" });
    function pintar(foco) {
      lista.replaceChildren(...orden.map((idx, pos) => el("li", { class: "ordenar-item" },
        el("span", { class: "ordenar-n", "aria-hidden": "true", text: String(pos + 1) }),
        t("span", items[idx], { class: "ordenar-t" }),
        el("span", { class: "ordenar-btns" },
          el("button", { type: "button", class: "mini", "aria-label": `Subir: ${String(items[idx]).replace(/\*/g, "")}`, disabled: pos === 0 || m.terminado,
            onclick: () => { [orden[pos - 1], orden[pos]] = [orden[pos], orden[pos - 1]]; pintar({ pos: pos - 1, dir: "up" }); }, text: "↑" }),
          el("button", { type: "button", class: "mini", "aria-label": `Bajar: ${String(items[idx]).replace(/\*/g, "")}`, disabled: pos === orden.length - 1 || m.terminado,
            onclick: () => { [orden[pos + 1], orden[pos]] = [orden[pos], orden[pos + 1]]; pintar({ pos: pos + 1, dir: "down" }); }, text: "↓" })))));
      if (foco) {
        const fila = lista.children[foco.pos];
        const b = fila && fila.querySelectorAll("button")[foco.dir === "up" ? 0 : 1];
        (b && !b.disabled ? b : fila && fila.querySelector("button:not([disabled])"))?.focus();
      }
    }
    pintar();
    m.cuerpo.append(lista);
    m.acciones.append(boton("Comprobar", () => {
      if (m.terminado) return;
      const bien = orden.filter((idx, pos) => idx === correcto[pos]).length;
      [...lista.children].forEach((li, pos) => li.classList.add(orden[pos] === correcto[pos] ? "bien" : "mal"));
      lista.querySelectorAll("button").forEach(b => (b.disabled = true));
      m.acciones.replaceChildren();
      const modelo = el("ol", { class: "modelo" }, correcto.map(i => t("li", items[i] + (detalle ? " — " + detalle[i] : ""))));
      if (flexible) {
        m.fb("tip", `Coinciden ${bien} de ${items.length} posiciones con la propuesta`, "Aquí puede haber más de un orden razonable. Lo importante es la justificación.");
        m.fbAdd(el("div", { class: "fb fb-tip" }, el("h4", { text: "Orden propuesto" }), modelo));
        autoevaluacion(m, reto.explicacion, reto.pauta);
      } else {
        const p = bien / items.length;
        m.fb(p === 1 ? "ok" : "ko", p === 1 ? "¡Orden correcto!" : `${bien} de ${items.length} en su sitio`, p === 1 ? "" : "Este es el orden correcto:");
        if (p < 1) m.fbAdd(modelo);
        m.porque(); m.fin(p);
      }
    }));
    return m.nodo;
  }

  // ───────── Clasificar / situar ─────────
  function clasificar(reto, ctx, categorias, elementos) {
    const m = marco(reto, ctx);
    const usaSelect = categorias.length > 4;
    const els = ctx.rnd.shuffle(elementos);
    const filas = els.map((e, i) => {
      const nombre = `${reto.id}-c${i}-${Math.floor(ctx.rnd() * 1e6)}`;
      let control;
      if (usaSelect) {
        control = el("select", { class: "sel", "aria-label": `Categoría para: ${e.t}` },
          el("option", { value: "", text: "Elige…" }), categorias.map(c => el("option", { value: c, text: c })));
      } else {
        control = el("div", { class: "chips", role: "radiogroup", "aria-label": `Categoría para: ${e.t}` },
          categorias.map(c => el("label", { class: "chip" }, el("input", { type: "radio", name: nombre, value: c }), el("span", { text: c }))));
      }
      const fila = el("div", { class: "clas-fila" }, t("p", e.t, { class: "clas-t" }), control, el("div", { class: "clas-fb", "aria-live": "polite" }));
      return { e, fila, valor: () => usaSelect ? control.value : (control.querySelector("input:checked") || {}).value };
    });
    m.cuerpo.append(el("div", { class: "clasificar" }, filas.map(f => f.fila)));
    m.acciones.append(boton("Comprobar", () => {
      if (m.terminado) return;
      if (filas.some(f => !f.valor())) { m.fb("tip", "Falta alguno", "Elige una opción para cada elemento antes de comprobar."); return; }
      let bien = 0;
      filas.forEach(f => {
        const ok = f.valor() === (f.e.cat || f.e.zona);
        if (ok) bien++;
        f.fila.classList.add(ok ? "bien" : "mal");
        f.fila.querySelectorAll("input,select").forEach(x => (x.disabled = true));
        f.fila.querySelector(".clas-fb").replaceChildren(t("p", (ok ? "✓ " : `✗ Era: **${f.e.cat || f.e.zona}**. `) + (f.e.fb || "")));
      });
      const p = bien / filas.length;
      m.fb(p === 1 ? "ok" : "ko", p === 1 ? "¡Todo en su sitio!" : `${bien} de ${filas.length} bien`);
      m.porque(); m.fin(p); m.acciones.replaceChildren();
    }));
    return m.nodo;
  }

  // ───────── Emparejar (y vocabulario con pares) ─────────
  function emparejar(reto, ctx) {
    const m = marco(reto, ctx);
    const pares = ctx.rnd.shuffle(reto.pares);
    const bs = ctx.rnd.shuffle(reto.pares.map(p => p.b));
    const filas = pares.map(p => {
      const sel = el("select", { class: "sel", "aria-label": `Pareja de: ${p.a}` }, el("option", { value: "", text: "Elige…" }), bs.map(b => el("option", { value: b, text: b })));
      return { p, sel, fila: el("div", { class: "emp-fila" }, t("p", p.a, { class: "emp-a" }), sel, el("div", { class: "clas-fb" })) };
    });
    m.cuerpo.append(el("div", { class: "emparejar" }, filas.map(f => f.fila)));
    m.acciones.append(boton("Comprobar", () => {
      if (m.terminado) return;
      if (filas.some(f => !f.sel.value)) { m.fb("tip", "Falta alguno", "Elige una pareja para cada elemento."); return; }
      let bien = 0;
      filas.forEach(f => {
        const ok = f.sel.value === f.p.b; if (ok) bien++;
        f.fila.classList.add(ok ? "bien" : "mal"); f.sel.disabled = true;
        if (!ok) f.fila.querySelector(".clas-fb").replaceChildren(t("p", `✗ Era: **${f.p.b}**`));
      });
      const p = bien / filas.length;
      m.fb(p === 1 ? "ok" : "ko", p === 1 ? "¡Todas las parejas bien!" : `${bien} de ${filas.length} bien`);
      m.porque(); m.fin(p); m.acciones.replaceChildren();
    }));
    return m.nodo;
  }

  // ───────── Detectar errores (elementos con error sí/no) ─────────
  function detectar(reto, ctx) {
    const m = marco(reto, ctx);
    const els = ctx.rnd.shuffle(reto.elementos);
    m.cuerpo.append(t("p", "Toca los que sean **un error**. Deja sin marcar los que estén bien.", { class: "ayuda" }));
    const filas = els.map(e => {
      const b = el("button", { type: "button", class: "opcion toggle", "aria-pressed": "false",
        onclick: () => { if (!m.terminado) b.setAttribute("aria-pressed", String(b.getAttribute("aria-pressed") !== "true")); } },
        el("span", { class: "check", "aria-hidden": "true" }), t("span", e.t));
      return { e, b };
    });
    m.cuerpo.append(el("div", { class: "opciones" }, filas.map(f => f.b)));
    m.acciones.append(boton("Comprobar", () => {
      if (m.terminado) return;
      let bien = 0; const notas = el("ul", { class: "revision" });
      filas.forEach(({ e, b }) => {
        const marcado = b.getAttribute("aria-pressed") === "true"; b.disabled = true;
        const ok = marcado === !!e.error; if (ok) bien++;
        b.classList.add(e.error ? (marcado ? "bien" : "falto") : (marcado ? "mal" : "neutro"));
        notas.append(t("li", (e.error ? "⚠️ " : "✔︎ ") + e.t + " — " + e.fb));
      });
      const p = bien / filas.length;
      const errores = els.filter(e => e.error).length;
      m.fb(p === 1 ? "ok" : "ko", p === 1 ? `¡Has encontrado los ${errores} errores!` : `${bien} de ${filas.length} bien decididos`);
      m.fbAdd(notas); m.fin(p); m.acciones.replaceChildren();
    }));
    return m.nodo;
  }

  // ───────── Simulación por pasos (cada paso, una decisión) ─────────
  function pasos(reto, ctx) {
    const m = marco(reto, ctx);
    const total = reto.pasos.length; let k = 0, puntos = 0;
    const caja = el("div", { class: "pasos" });
    m.cuerpo.append(caja);
    function paso() {
      const p = reto.pasos[k];
      let intentos = 0;
      const lista = el("div", { class: "opciones" });
      const bloque = el("div", { class: "paso" }, el("p", { class: "paso-n", text: `Paso ${k + 1} de ${total}` }), t("p", p.situacion, { class: "paso-s" }), lista);
      ctx.rnd.shuffle(p.opciones).forEach(o => {
        const b = el("button", { type: "button", class: "opcion", onclick: () => {
          if (b.disabled) return; intentos++;
          if (o.ok) {
            b.classList.add("bien"); lista.querySelectorAll("button").forEach(x => (x.disabled = true));
            if (intentos === 1) puntos++;
            m.fb("ok", "Bien", o.fb);
            k++;
            if (k < total) m.acciones.replaceChildren(boton("Siguiente paso", () => { m.acciones.replaceChildren(); m.fb("tip", "", ""); paso(); }));
            else { m.acciones.replaceChildren(); m.porque(); m.fin(puntos / total); m.fbAdd(feedback(puntos === total ? "ok" : "tip", `Simulación terminada: ${puntos} de ${total} a la primera`)); }
          } else { b.classList.add("mal"); b.disabled = true; m.fb("ko", "Todavía no", o.fb); }
        } }, t("span", o.t));
        lista.append(b);
      });
      caja.append(bloque);
      bloque.querySelector("button")?.focus({ preventScroll: true });
    }
    paso();
    return m.nodo;
  }

  // ───────── Caso ramificado ─────────
  function ramificado(reto, ctx) {
    const m = marco(reto, ctx);
    const caja = el("div", { class: "pasos" }); m.cuerpo.append(caja);
    let decisiones = 0, buenas = 0;
    function nodo(id) {
      const n = reto.nodos[id];
      if (n.final) {
        caja.append(el("div", { class: "paso final" }, t("p", n.texto)));
        m.porque(); m.fin(decisiones ? buenas / decisiones : 0); m.acciones.replaceChildren(); return;
      }
      const lista = el("div", { class: "opciones" });
      caja.append(el("div", { class: "paso" }, t("p", n.texto, { class: "paso-s" }), lista));
      n.opciones.forEach(o => lista.append(el("button", { type: "button", class: "opcion", onclick: ev => {
        lista.querySelectorAll("button").forEach(x => (x.disabled = true));
        ev.currentTarget.classList.add(o.ok ? "bien" : "mal");
        decisiones++; if (o.ok) buenas++;
        m.fb(o.ok ? "ok" : "ko", o.ok ? "Buena decisión" : "Decisión mejorable", o.fb);
        m.acciones.replaceChildren(boton("Continuar", () => { m.acciones.replaceChildren(); nodo(o.ir); }));
      } }, t("span", o.t))));
    }
    nodo("inicio");
    return m.nodo;
  }

  // ───────── Calcular (generable: reposición) ─────────
  function calcular(reto, ctx) {
    const inst = AL.gen.reposicion(ctx.rnd, ctx.catalogo, { nivel: reto.nivel || 1 });
    const r = Object.assign({}, reto, { _enunciado: inst.enunciado });
    const m = marco(r, ctx);
    const unidad = inst.nivel === 3 ? (inst.producto.formato === "pack" ? "packs" : inst.producto.formato + "s") : "unidades";
    const input = el("input", { type: "number", inputmode: "numeric", min: "0", step: "1", class: "num", "aria-label": `Respuesta en ${unidad}` });
    m.cuerpo.append(el("label", { class: "num-fila" }, input, el("span", { text: unidad })));
    let intentos = 0;
    const comprobar = () => {
      if (m.terminado) return;
      if (input.value === "") { m.fb("tip", "Escribe un número", ""); return; }
      intentos++;
      const ok = Number(input.value) === inst.respuesta;
      const pasosTxt = el("ol", { class: "modelo" }, inst.pasos.map(p => t("li", p)));
      if (ok) { m.fb("ok", "¡Correcto!", ""); m.fbAdd(pasosTxt); m.porque(); m.fin(intentos === 1 ? 1 : 0.5); m.acciones.replaceChildren(); input.disabled = true; }
      else if (intentos === 1) m.fb("ko", "Revísalo", inst.nivel === 3 ? "Pista: calcula primero cuántas unidades faltan y después pásalo al formato, redondeando hacia arriba." : inst.nivel === 2 ? "Pista: aplica primero la previsión al stock de apertura." : "Pista: stock de apertura − existencias.");
      else { m.fb("ko", `La respuesta era ${inst.respuesta}`, ""); m.fbAdd(pasosTxt); m.porque(); m.fin(0); m.acciones.replaceChildren(); input.disabled = true; }
    };
    input.addEventListener("keydown", e => { if (e.key === "Enter") comprobar(); });
    m.acciones.append(boton("Comprobar", comprobar));
    return m.nodo;
  }

  // ───────── Recepción (triple comparación) ─────────
  function recepcion(reto, ctx, inst) {
    inst = inst || AL.gen.recepcion(ctx.rnd, ctx.catalogo, { lineas: ctx.compacto ? 3 : 4 });
    const m = marco(reto, ctx);
    const resp = AL.gen.RESP_RECEPCION;
    const filas = inst.lineas.map((l, i) => {
      const sel = el("select", { class: "sel", "aria-label": `¿Qué pasa con ${l.producto}?` }, el("option", { value: "", text: "¿Qué pasa?" }),
        Object.entries(resp).map(([k, v]) => el("option", { value: k, text: v })));
      const fila = el("div", { class: "rec-fila" },
        el("p", { class: "rec-prod", text: l.producto }),
        el("dl", { class: "rec-nums" }, el("dt", { text: "Pedido" }), el("dd", { text: String(l.pedido) }),
          el("dt", { text: "Albarán" }), el("dd", { text: String(l.albaran) }), el("dt", { text: "Llegado" }), el("dd", { text: String(l.llegado) })),
        sel, el("div", { class: "clas-fb" }));
      return { l, sel, fila };
    });
    m.cuerpo.append(el("div", { class: "recepcion" }, filas.map(f => f.fila)));
    m.acciones.append(boton("Comprobar", () => {
      if (m.terminado) return;
      if (filas.some(f => !f.sel.value)) { m.fb("tip", "Falta alguna línea", "Decide qué pasa en cada línea."); return; }
      let bien = 0;
      filas.forEach(f => {
        const sol = AL.gen.resolverLinea(f.l), ok = f.sel.value === sol; if (ok) bien++;
        f.fila.classList.add(ok ? "bien" : "mal"); f.sel.disabled = true;
        if (!ok) f.fila.querySelector(".clas-fb").replaceChildren(t("p", `✗ Era: **${resp[sol]}**`));
      });
      const p = bien / filas.length;
      m.fb(p === 1 ? "ok" : "ko", p === 1 ? "¡Recepción bien comprobada!" : `${bien} de ${filas.length} líneas bien`);
      m.porque(); m.fin(p); m.acciones.replaceChildren();
    }));
    return m.nodo;
  }

  // ───────── Vale (completar documento generable) ─────────
  function vale(reto, ctx, inst) {
    inst = inst || AL.gen.vale(ctx.rnd, ctx.catalogo, { lineas: ctx.compacto ? 2 : 3 });
    const m = marco(reto, ctx);
    const tabla = el("table", { class: "tabla-rep" },
      el("thead", {}, el("tr", {}, ["Producto", "Faltan (uds.)", "Formato"].map(h => el("th", { text: h })))),
      el("tbody", {}, inst.filas.map(f => el("tr", {}, el("td", { "data-h": "Producto", text: f.producto }), el("td", { "data-h": "Faltan", text: String(f.faltan) }), el("td", { "data-h": "Formato", text: f.formato })))));
    const formatos = Array.from(new Set(["unidad"].concat(ctx.catalogo.productos.map(p => `${p.formato} ${p.n}`))));
    const lineas = inst.filas.map(f => {
      const u = el("select", { class: "sel", "aria-label": `Unidad para ${f.producto}` }, el("option", { value: "", text: "Unidad…" }), formatos.map(x => el("option", { value: x, text: x })));
      const c = el("input", { type: "number", inputmode: "numeric", min: "0", class: "num", "aria-label": `Cantidad de ${f.producto}` });
      return { f, u, c, fila: el("div", { class: "vale-linea" }, el("p", { class: "vale-art", text: f.producto }), el("div", { class: "vale-ctrl" }, u, c), el("div", { class: "clas-fb" })) };
    });
    const dep = el("input", { type: "text", class: "txt", placeholder: "Departamento solicitante", "aria-label": "Departamento solicitante" });
    const fecha = el("input", { type: "date", class: "txt", "aria-label": "Fecha de solicitud" });
    const firma = el("label", { class: "chk" }, el("input", { type: "checkbox" }), el("span", { text: "Firmo como quien solicita" }));
    m.cuerpo.append(el("p", { class: "ayuda", text: "Tabla de reposición:" }), tabla,
      el("div", { class: "vale" }, el("p", { class: "vale-tit", text: "HOJA DE SOLICITUD INTERNA" }), dep, fecha, lineas.map(l => l.fila), firma,
        el("p", { class: "note", text: "«Cantidad servida» y las firmas de quien autoriza y entrega no las rellenas tú." })));
    m.acciones.append(boton("Comprobar", () => {
      if (m.terminado) return;
      let bien = 0, total = lineas.length * 2 + 3;
      lineas.forEach(l => {
        const okU = l.u.value === l.f.formato, okC = Number(l.c.value) === l.f.pedir && l.c.value !== "";
        bien += okU + okC;
        l.fila.classList.add(okU && okC ? "bien" : "mal");
        if (!(okU && okC)) l.fila.querySelector(".clas-fb").replaceChildren(t("p", `✗ Debía ser **${l.f.formato} · ${l.f.pedir}** (${l.f.faltan} ÷ ${l.f.formato.split(" ").pop()}, redondeando hacia arriba).`));
        l.u.disabled = l.c.disabled = true;
      });
      const okDep = dep.value.trim().length > 2, okFecha = !!fecha.value, okFirma = firma.querySelector("input").checked;
      bien += okDep + okFecha + okFirma;
      const faltas = [!okDep && "el departamento", !okFecha && "la fecha", !okFirma && "tu firma"].filter(Boolean);
      const p = bien / total;
      m.fb(p === 1 ? "ok" : "ko", p === 1 ? "¡Vale correcto!" : `${bien} de ${total} datos bien`, faltas.length ? "Falta: " + faltas.join(", ") + "." : "");
      m.porque(); m.fin(p); m.acciones.replaceChildren();
    }));
    return m.nodo;
  }

  // ───────── Documento con campos (etiqueta) o texto libre ─────────
  function documentoCampos(reto, ctx) {
    const m = marco(reto, ctx);
    const campos = reto.documento.campos.map(c => ({ c, i: el("input", { type: "text", class: "txt", "aria-label": c, placeholder: c }) }));
    m.cuerpo.append(el("div", { class: "etiqueta" }, campos.map(x => el("label", { class: "campo" }, el("span", { text: x.c }), x.i))));
    m.acciones.append(boton("Comparar con el modelo", () => {
      if (campos.some(x => !x.i.value.trim())) { m.fb("tip", "Rellena todos los campos", ""); return; }
      campos.forEach(x => (x.i.disabled = true)); m.acciones.replaceChildren();
      const sol = reto.solucion || {};
      autoevaluacion(m, Object.entries(sol).map(([k, v]) => `**${k}:** ${v}`).join("\n"), reto.pauta || ["Todos los campos completos y coherentes con la situación."]);
    }));
    return m.nodo;
  }
  function textoLibre(reto, ctx, { linea } = {}) {
    const m = marco(reto, ctx);
    if (reto.original) m.cuerpo.append(el("p", { class: "original" }, el("span", { text: "Original: " }), el("code", { text: reto.original })));
    const caja = linea ? el("input", { type: "text", class: "txt", "aria-label": "Tu respuesta" }) : el("textarea", { class: "txt", rows: "4", "aria-label": "Tu respuesta" });
    m.cuerpo.append(caja, el("p", { class: "note", text: "Lo que escribas no se guarda ni se envía: sirve para comparar con el modelo." }));
    m.acciones.append(boton("Ver respuesta modelo", () => {
      if (caja.value.trim().length < 3) { m.fb("tip", "Escribe primero tu respuesta", "Aunque sea corta: así aprendes más al compararla."); return; }
      caja.disabled = true; m.acciones.replaceChildren();
      autoevaluacion(m, reto.correccion ? `**${reto.correccion}**` : reto.respuesta_modelo, reto.pauta);
    }));
    return m.nodo;
  }

  // ───────── Casos integrados por fases ─────────
  function fases(reto, ctx) {
    const m = marco(reto, ctx);
    const plan = [
      { titulo: "1 · Calcula y cumplimenta el vale", crear: c => vale({ id: reto.id + "-vale", tipo: "completar-documento", dif: reto.dif, enunciado: "Con la tabla de reposición, cumplimenta el vale." }, c, AL.gen.vale(ctx.rnd, ctx.catalogo, { lineas: reto.guiado ? 3 : 4 })) },
      { titulo: "2 · Recibe y comprueba el pedido", crear: c => recepcion({ id: reto.id + "-rec", tipo: "simulacion", dif: reto.dif, enunciado: "Llega el pedido. Compara pedido, albarán y llegado." }, c, AL.gen.recepcion(ctx.rnd, ctx.catalogo, { lineas: reto.guiado ? 4 : 5 })) },
      { titulo: "3 · Distribuye el género", crear: c => clasificar({ id: reto.id + "-alm", tipo: "clasificar", dif: reto.dif, enunciado: "¿Dónde se guarda cada producto que ha llegado?" }, c, ...(g => [g.categorias, g.elementos])(AL.gen.almacen(ctx.rnd, ctx.catalogo, { k: reto.guiado ? 5 : 7 }))) },
      { titulo: "4 · Cierre: separa los residuos", crear: c => clasificar({ id: reto.id + "-res", tipo: "clasificar", dif: reto.dif, enunciado: "Al cerrar, ¿dónde va cada cosa?" }, c, ...(g => [g.categorias, g.elementos])(AL.gen.residuos(ctx.rnd, ctx.catalogo, { k: reto.guiado ? 5 : 7 }))) }
    ];
    const puntos = [];
    const caja = el("div", { class: "fases" }); m.cuerpo.append(caja);
    function siguiente(k) {
      if (k >= plan.length) {
        const media = puntos.reduce((a, b) => a + b, 0) / puntos.length;
        m.fb(media >= 0.8 ? "ok" : "tip", `Caso completado: ${Math.round(media * 100)} %`, reto.guiado ? "Ahora prueba el caso B, con menos ayuda." : "");
        m.porque(); m.fin(media); return;
      }
      caja.append(el("h4", { class: "fase-tit", text: plan[k].titulo }));
      caja.append(plan[k].crear(Object.assign({}, ctx, { alTerminar: r => { puntos.push(r.puntos);
        caja.append(el("div", { class: "reto-acciones" }, boton(k + 1 < plan.length ? "Siguiente fase" : "Terminar el caso", ev => { ev.currentTarget.parentNode.remove(); siguiente(k + 1); }))); } })));
    }
    siguiente(0);
    return m.nodo;
  }

  // ───────── Enrutado por tipo ─────────
  AL.retos = {
    ETIQUETA,
    crear(reto, ctx) {
      ctx = Object.assign({ rnd: AL.rng(AL.semillaNueva()) }, ctx);
      const tp = reto.tipo;
      if (reto.fases) return fases(reto, ctx);
      if (reto.motor === "recepcion") return recepcion(reto, ctx);
      if (reto.motor === "vale") return vale(reto, ctx);
      if (reto.motor === "reposicion") return calcular(reto, ctx);
      if (reto.motor === "fefo") {
        const g = AL.gen.fefo(ctx.rnd, ctx.catalogo, { unidades: ctx.compacto ? 3 : 4 });
        const items = g.unidades.map(u => `**${u.texto}** · llegó el día ${u.entrada} · caduca el **${u.caduca}**`);
        const correcto = g.solucion.map(id => g.unidades.findIndex(u => u.id === id));
        const r = Object.assign({}, reto, { _enunciado: reto.enunciado + " (Arriba = delante)" });
        return ordenar(r, ctx, items, correcto);
      }
      if (reto.motor === "traslado") {
        const g = AL.gen.traslado(ctx.rnd, ctx.catalogo);
        const items = g.productos.map(p => p.nombre);
        const correcto = g.solucion.map(id => g.productos.findIndex(p => p.id === id));
        const clases = ctx.catalogo.traslado_clases;
        return ordenar(reto, ctx, items, correcto, { detalle: g.productos.map(p => clases[p.traslado]) });
      }
      if (reto.motor === "almacen" || reto.motor === "conservacion" || reto.motor === "residuos") {
        const g = AL.gen[reto.motor](ctx.rnd, ctx.catalogo, { k: ctx.compacto ? 4 : 8, muestra: ctx.usarMuestra ? reto.muestra : undefined });
        return clasificar(reto, ctx, g.categorias, g.elementos);
      }
      if (reto.motor === "situar") {
        const els = ctx.compacto ? ctx.rnd.sample(reto.elementos, 5) : reto.elementos;
        return clasificar(reto, ctx, reto.zonas, els);
      }
      if (reto.nodos) return ramificado(reto, ctx);
      if (reto.pasos && typeof reto.pasos[0] === "object") return pasos(reto, ctx);
      if (tp === "ordenar" && reto.pasos) return ordenar(reto, ctx, reto.pasos, reto.pasos.map((_, i) => i));
      if (tp === "priorizar") return ordenar(reto, ctx, reto.elementos, reto.elementos.map((_, i) => i), { flexible: true });
      if (tp === "elegir-varias") return varias(reto, ctx);
      if (reto.opciones) return unaOpcion(reto, ctx, reto.opciones);
      if (reto.pares) return emparejar(reto, ctx);
      if (tp === "detectar-errores" && reto.elementos) return detectar(reto, ctx);
      if ((tp === "clasificar" || tp === "situar") && reto.elementos) return clasificar(reto, ctx, reto.categorias || reto.zonas, reto.elementos);
      if (tp === "completar-documento" && reto.documento) return documentoCampos(reto, ctx);
      if (tp === "corregir") return textoLibre(reto, ctx, { linea: true });
      if (reto.respuesta_modelo || reto.pauta) return textoLibre(reto, ctx);
      return el("p", { class: "fb fb-ko", text: `Reto ${reto.id}: tipo sin pintar (${tp}).` });
    }
  };
})();
