// ANA LAB · Reproductor de secuencias didácticas.
// Datos: window.BANCO (retos publicables + catálogo) y window.SECUENCIA (sesiones → momentos → pantallas).
// Navegación: índice de sesiones → sesión pantalla a pantalla (#S03/4). Móvil primero; modo proyector opcional.
(function () {
  const AL = window.AL;
  const { el, t } = AL;
  const MOMENTOS = { repaso: "Repaso inicial", desarrollo: "Desarrollo", salida: "Prueba de salida" };
  let SEC, BANCO, raiz, porHueco, porId, clave;

  // ───────── Progreso local ─────────
  const progreso = () => AL.store.get(clave, {});
  function guardarSesion(sid, datos) {
    const p = progreso(); p[sid] = Object.assign({}, p[sid], datos); AL.store.set(clave, p);
  }

  // ───────── Índice ─────────
  function indice() {
    document.title = `${SEC.titulo} · Clase · ANA LAB`;
    const p = progreso();
    const lista = el("ol", { class: "ses-lista" }, SEC.sesiones.map(s => {
      const pr = p[s.id] || {};
      const estado = pr.salida ? `Salida: ${pr.salida.aciertos}/${pr.salida.total}` : pr.vista ? "Empezada" : "";
      return el("li", {}, el("a", { class: "ses-card", href: `#${s.id}/0` },
        el("span", { class: "ses-id", text: s.id }),
        el("span", { class: "ses-txt" }, el("strong", { text: s.titulo }), el("span", { class: "note", text: `${s.dur}′ · ${s.subs}` })),
        estado ? el("span", { class: "status " + (pr.salida ? "listo" : "prep"), text: estado }) : null));
    }));
    raiz.replaceChildren(
      el("header", { class: "sec-hero" },
        el("div", { class: "eyebrow", text: `${SEC.modulo} · Tema ${SEC.n} · Clase` }),
        el("h1", { text: SEC.titulo }),
        t("p", SEC.intro, { class: "lead" })),
      el("main", { class: "wrap", id: "contenido" },
        el("h2", { class: "subhead", text: "Sesiones" }), lista,
        el("p", { class: "note" }, "Tu progreso solo se guarda en este dispositivo. ",
          el("button", { type: "button", class: "link", onclick: () => { if (confirm("¿Borrar tu progreso de este tema en este dispositivo?")) { AL.store.set(clave, {}); indice(); } }, text: "Borrar mi progreso" }))));
    window.scrollTo(0, 0);
  }

  // ───────── Sesión ─────────
  function aplanar(s) {
    const out = [{ m: "inicio", p: { t: "portada" } }];
    for (const m of ["repaso", "desarrollo", "salida"]) for (const p of s[m] || []) out.push({ m, p });
    out.push({ m: "salida", p: { t: "resultado" } });
    if (s.fuera) out.push({ m: "fuera", p: { t: "fuera" } });
    return out;
  }
  const estadoSesion = {}; // resultados de la sesión abierta: { idx: puntos }

  function sesion(sid, idx) {
    const s = SEC.sesiones.find(x => x.id === sid);
    if (!s) return indice();
    const pantallas = aplanar(s);
    idx = Math.max(0, Math.min(pantallas.length - 1, idx | 0));
    if (!estadoSesion[sid]) estadoSesion[sid] = { salida: {}, todos: {} };
    guardarSesion(sid, { vista: true });
    const { m, p } = pantallas[idx];
    document.title = `${s.id} · ${s.titulo} · ANA LAB`;

    const barra = el("div", { class: "ses-bar" },
      el("a", { class: "back", href: "#", "aria-label": "Volver a las sesiones" }, "← Sesiones"),
      el("span", { class: "ses-bar-t", text: `${s.id} · ${s.titulo}` }),
      el("button", { type: "button", class: "mini aula-btn", "aria-pressed": String(document.body.classList.contains("aula")), title: "Modo proyector (letra grande)",
        onclick: ev => { const on = document.body.classList.toggle("aula"); ev.currentTarget.setAttribute("aria-pressed", String(on)); AL.store.set("pref:aula", on); }, text: "A+" }));
    const prog = el("div", { class: "ses-prog", role: "progressbar", "aria-valuemin": "1", "aria-valuemax": String(pantallas.length), "aria-valuenow": String(idx + 1), "aria-label": "Avance de la sesión" },
      el("i", { style: `width:${((idx + 1) / pantallas.length) * 100}%` }));
    const chip = m === "inicio" ? null : el("div", { class: `momento m-${m}`, text: m === "fuera" ? "Reto fuera del aula" : MOMENTOS[m] });

    const contenido = el("div", { class: "pantalla" }, pintar(s, p, m, idx, pantallas));
    const nav = el("nav", { class: "ses-nav", "aria-label": "Pantallas" },
      el("a", { class: "btn btn-sec", href: `#${sid}/${idx - 1}`, "aria-disabled": String(idx === 0), tabindex: idx === 0 ? "-1" : null, text: "← Anterior" }),
      el("span", { class: "ses-n", text: `${idx + 1} / ${pantallas.length}` }),
      idx < pantallas.length - 1
        ? el("a", { class: "btn btn-primario", href: `#${sid}/${idx + 1}`, text: "Siguiente →" })
        : el("a", { class: "btn btn-primario", href: "#", text: "Terminar" }));
    raiz.replaceChildren(barra, prog, el("main", { id: "contenido", class: "ses-main" }, chip, contenido), nav);
    window.scrollTo(0, 0);
    const foco = contenido.querySelector("h2, h3");
    if (foco) { foco.setAttribute("tabindex", "-1"); foco.focus({ preventScroll: true }); }
    if (window.NOTAS_DOCENTE && NOTAS_DOCENTE[sid]) pintarNotas(raiz, NOTAS_DOCENTE[sid], p);
  }

  function retoDeHueco(sid, h) {
    const r = porHueco[`${sid}.${h}`] || porHueco[h];
    return r || null;
  }

  function pintar(s, p, m, idx, pantallas) {
    switch (p.t) {
      case "portada":
        return el("section", { class: "portada" },
          el("p", { class: "eyebrow", text: `${s.id} · ${s.dur} minutos` }),
          el("h2", { text: s.titulo }),
          el("div", { class: "objetivo" }, el("p", { class: "eyebrow", text: "Al terminar, serás capaz de…" }), t("p", s.objetivo)),
          el("p", { class: "note", text: `Apartados: ${s.subs}. Ten a mano tu ficha (${s.id}).` }));
      case "idea": {
        const zf = p.zonas ? fotoZonas(p.zonas) : null;
        const lis = (p.puntos || []).map((x, i) => zf
          ? t("li", x, { class: "zona-li", role: "button", tabindex: "0", onclick: () => zf.ir(i), onkeydown: e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); zf.ir(i); } } })
          : t("li", x));
        if (zf) zf.lis = lis;
        return el("section", { class: "idea" }, p.sub ? el("p", { class: "eyebrow", text: p.sub }) : null, el("h2", { text: p.tit }),
          conFoto(p, [ideaClave(p.clave),
            p.txt ? t("p", p.txt) : null,
            p.puntos ? el("ul", { class: "puntos" + (zf ? " puntos-zonas" : "") }, lis) : null,
            p.svg ? el("div", { class: "figura", html: p.svg, role: "img", "aria-label": p.alt || p.tit }) : null,
            p.ficha ? marcaFicha(p.ficha, p.fichaTxt) : null], zf && zf.nodo));
      }
      case "explica":
        return el("section", { class: "idea explica" }, p.sub ? el("p", { class: "eyebrow", text: p.sub }) : null, el("h2", { text: p.tit }),
          conFoto(p, [p.lead ? t("p", p.lead, { class: "lead" }) : null,
            ...String(p.txt || "").split(/\n\n+/).filter(Boolean).map(x => t("p", x)),
            p.puntos ? el("ul", { class: "puntos" }, p.puntos.map(x => t("li", x))) : null,
            ideaClave(p.clave), p.ficha ? marcaFicha(p.ficha, p.fichaTxt) : null]));
      case "documento":
        return documento(p);
      case "tabla":
        return el("section", { class: "idea" }, el("h2", { text: p.tit }), p.txt ? t("p", p.txt) : null,
          p.fotos ? el("div", { class: "fotos" }, p.fotos.map(figura)) : null,
          el("table", { class: "tabla" }, el("thead", {}, el("tr", {}, p.cab.map(c => el("th", { text: c })))),
            el("tbody", {}, p.filas.map(f => el("tr", {}, f.map((c, i) => t("td", c, { "data-h": p.cab[i] })))))),
          p.nota ? t("p", p.nota, { class: "note" }) : null, p.ficha ? marcaFicha(p.ficha, p.fichaTxt) : null);
      case "ejemplo":
        return el("section", { class: "caja-ej" }, el("p", { class: "eyebrow", text: "Ejemplo profesional" }), el("h2", { text: p.tit }),
          conFoto(p, [t("p", p.txt), p.puntos ? el("ul", { class: "puntos" }, p.puntos.map(x => t("li", x))) : null, p.ficha ? marcaFicha(p.ficha, p.fichaTxt) : null]));
      case "ojo":
        return el("section", { class: "caja-ojo" }, el("p", { class: "eyebrow", text: "Ojo con…" }), el("h2", { text: p.tit || "El error típico" }), conFoto(p, [t("p", p.txt)]));
      case "pregunta":
        return el("section", { class: "caja-preg" }, el("p", { class: "eyebrow", text: "Para pensar en clase" }), el("h2", { text: p.tit }), p.txt ? t("p", p.txt) : null,
          p.revelar ? revelar(p.revelar) : null);
      case "galeria":
        return el("section", { class: "idea" }, p.sub ? el("p", { class: "eyebrow", text: p.sub }) : null, el("h2", { text: p.tit }), p.txt ? t("p", p.txt) : null,
          el("div", { class: "galeria" }, p.items.map(it => {
            const resp = el("span", { class: "gal-resp", hidden: true }, t("span", it.revela));
            const b = el("button", { type: "button", class: "gal-item", "aria-expanded": "false",
              onclick: () => { resp.hidden = !resp.hidden; b.setAttribute("aria-expanded", String(!resp.hidden)); b.classList.toggle("abierta", !resp.hidden); } },
              el("img", { src: it.src, alt: it.alt, loading: "lazy", width: "420", height: "420" }), el("span", { class: "gal-pie", text: it.pie }), resp);
            return b;
          })),
          el("p", { class: "note", text: "Toca cada imagen para ver la respuesta." }), p.ficha ? marcaFicha(p.ficha, p.fichaTxt) : null);
      case "ficha":
        return el("section", { class: "idea" }, marcaFicha(p.ref, p.txt, true));
      case "reto": {
        const r = retoDeHueco(s.id, p.h);
        if (!r) return el("p", { class: "fb fb-ko", text: `Falta el reto del hueco ${s.id}.${p.h}` });
        const semilla = AL.hash(`${s.id}|${idx}|${AL.hoy()}|${p.h}`) ^ (estadoSesion[s.id].nuevo || 0);
        const nodo = AL.retos.crear(r, { rnd: AL.rng(semilla), catalogo: BANCO.catalogo, compacto: m !== "desarrollo", usarMuestra: m === "desarrollo",
          alTerminar: res => {
            estadoSesion[s.id].todos[idx] = res.puntos;
            if (m === "salida") estadoSesion[s.id].salida[idx] = res.puntos;
          } });
        return el("section", { class: "pantalla-reto" },
          p.modo === "clase" ? el("p", { class: "modo", text: "👥 En grupo: la clase decide y una persona responde" })
            : p.modo === "individual" ? el("p", { class: "modo", text: "📱 Individual, en tu móvil" }) : null,
          nodo,
          r.generable ? el("button", { type: "button", class: "link otra", onclick: () => { estadoSesion[s.id].nuevo = AL.semillaNueva(); sesion(s.id, idx); }, text: "↻ Otra variante" }) : null);
      }
      case "resultado": {
        const res = estadoSesion[s.id].salida;
        const vals = Object.values(res);
        const total = (s.salida || []).filter(x => x.t === "reto").length;
        const suma = vals.reduce((a, b) => a + b, 0);
        const aciertos = Math.round(suma * 10) / 10;
        if (vals.length) guardarSesion(s.id, { salida: { aciertos, total, fecha: AL.hoy() } });
        return el("section", { class: "resultado" },
          el("h2", { text: "Resultado de la prueba de salida" }),
          vals.length ? el("p", { class: "marcador" }, el("strong", { text: String(aciertos).replace(".", ",") }), ` de ${total}`) :
            el("p", { text: "No has respondido la prueba de salida todavía. Vuelve atrás para hacerla." }),
          vals.length < total && vals.length ? el("p", { class: "note", text: `Has respondido ${vals.length} de ${total}.` }) : null,
          el("div", { class: "fb fb-tip" }, el("h4", { text: "Anótalo en tu ficha" }), t("p", `Casilla **${s.id}.X**: escribe tu resultado y marca en la autoevaluación lo que ya sabes hacer.`)),
          el("p", { class: "note", text: "Esto no es una nota: es una pista para saber qué repasar. Lo que hayas fallado volverá a salir en el repaso de la próxima sesión." }));
      }
      case "fuera":
        return retoFuera(s);
      default:
        return el("p", { text: "Pantalla desconocida." });
    }
  }

  // Recuadro «Idea clave», como en la presentación antigua.
  function ideaClave(txt) {
    return txt ? el("p", { class: "clave" }, el("span", { class: "clave-l", text: "Idea clave" }), t("span", txt)) : null;
  }
  // Una foto con su pie, o varias en fila. Con imagen, el texto va al lado (ordenador) o debajo (móvil).
  function figura(f) {
    return el("figure", { class: "foto" }, el("img", { src: f.src, alt: f.alt, loading: "lazy", width: "600", height: "400" }), f.pie ? t("figcaption", f.pie) : null);
  }
  function conFoto(p, cuerpo, propia) {
    const figs = propia || (p.foto ? figura(p.foto) : p.fotos ? el("div", { class: "fotos" }, p.fotos.map(figura)) : null);
    if (!figs) return cuerpo;
    if (p.fotos && p.fotos.length > 2) { figs.classList.add("tira"); return [...cuerpo, figs]; } // tres o más: en fila, bajo el texto
    return el("div", { class: "duo" }, el("div", { class: "duo-txt" }, cuerpo), el("div", { class: "duo-fig" }, figs));
  }
  // Foto con zonas: oscurece el resto y señala cada zona con un contorno animado y su explicación.
  // Se recorre sola («Recorrer las zonas»), paso a paso o tocando una zona de la foto o de la lista.
  let nZonas = 0;
  function fotoZonas(z) {
    const id = "mz" + (++nZonas), W = z.w || 1536, H = z.h || 1024;
    const svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><defs><mask id="${id}"><rect width="${W}" height="${H}" fill="#fff"/><polygon class="zm-hueco" points="" fill="#000"/></mask></defs>` +
      `<rect class="zm-velo" width="${W}" height="${H}" mask="url(#${id})"/>` +
      z.areas.map((a, i) => `<polygon class="zm-area" data-i="${i}" points="${a.pts}"/>`).join("") +
      z.areas.map((a, i) => `<g class="zm-num" data-i="${i}" transform="translate(${a.x} ${a.y})"><circle r="50"/><text text-anchor="middle" dy="17">${i + 1}</text></g>`).join("") + "</svg>";
    const capa = el("div", { class: "zm-capa", html: svg });
    const cap = el("div", { class: "zm-cap", "aria-live": "polite" }, t("p", z.ayuda || "Pulsa **Recorrer las zonas** o toca una zona."));
    let activa = -1, timer = null;
    const sig = el("button", { type: "button", class: "btn btn-sec", text: "Siguiente zona →" });
    const play = el("button", { type: "button", class: "btn btn-primario", text: "▶ Recorrer las zonas" });
    const api = { lis: [] };
    api.ir = i => {
      activa = i;
      const q = s => Array.from(capa.querySelectorAll(s) || []);
      q(".zm-area").forEach(n => n.classList[n.getAttribute("data-i") === String(i) ? "add" : "remove"]("activa"));
      q(".zm-num").forEach(n => n.classList[n.getAttribute("data-i") === String(i) ? "add" : "remove"]("activa"));
      const hueco = capa.querySelector(".zm-hueco");
      if (hueco) hueco.setAttribute("points", i >= 0 ? z.areas[i].pts : "");
      if (i >= 0) capa.classList.add("con-zona"); else capa.classList.remove("con-zona");
      api.lis.forEach((li, k) => li.classList[k === i ? "add" : "remove"]("activa"));
      if (i >= 0) cap.replaceChildren(el("p", { class: "zm-tit" }, el("span", { class: "zm-n", text: String(i + 1) }), z.areas[i].tit), t("p", z.areas[i].txt));
    };
    const parar = () => { if (timer) { clearInterval(timer); timer = null; play.textContent = "▶ Recorrer las zonas"; } };
    sig.addEventListener("click", () => { parar(); api.ir((activa + 1) % z.areas.length); });
    play.addEventListener("click", () => {
      if (timer) return parar();
      api.ir(0); play.textContent = "❚❚ Pausa";
      timer = setInterval(() => { if (activa + 1 >= z.areas.length) { parar(); return; } api.ir(activa + 1); }, z.ms || 4000);
    });
    capa.addEventListener("click", e => {
      const n = e.target && e.target.closest ? e.target.closest("[data-i]") : null;
      if (n) { parar(); api.ir(parseInt(n.getAttribute("data-i"), 10)); }
    });
    api.nodo = el("figure", { class: "zonas-foto" },
      el("div", { class: "zm-marco" }, el("img", { src: z.src, alt: z.alt, width: "1200", height: "800" }), capa),
      el("div", { class: "doc-acciones" }, play, sig), cap, z.pie ? t("figcaption", z.pie) : null);
    return api;
  }

  // Pantalla «documento»: un vale, un albarán o una etiqueta con sus partes numeradas, que se explican una a una.
  function documento(p) {
    const notas = p.notas || [];
    const d = Object.assign({}, p.doc, { marcas: {} });
    notas.forEach((n, i) => { d.marcas[n.k] = i + 1; });
    const papel = AL.doc[p.doc.tipo](d);
    const items = notas.map((n, i) => el("li", { class: "doc-nota", hidden: true },
      el("span", { class: "doc-marca", text: String(i + 1), "aria-hidden": "true" }), el("div", {}, el("strong", { text: n.tit }), n.txt ? t("p", n.txt) : null)));
    let vistas = 0;
    const sig = el("button", { type: "button", class: "btn btn-primario" });
    const todo = el("button", { type: "button", class: "btn btn-sec", text: "Verlo todo" });
    const pinta = () => {
      items.forEach((li, i) => { li.hidden = i >= vistas; });
      papel.querySelectorAll(".doc-marca").forEach(m => {
        const n = parseInt(m.getAttribute("data-n"), 10);
        m.classList.remove("activa", "apagada");
        if (n === vistas) m.classList.add("activa"); else if (n > vistas) m.classList.add("apagada");
      });
      if (vistas >= notas.length) { sig.hidden = true; todo.hidden = true; } else sig.textContent = `Explicar la parte ${vistas + 1} de ${notas.length}`;
    };
    sig.addEventListener("click", () => { vistas++; pinta(); });
    todo.addEventListener("click", () => { vistas = notas.length; pinta(); });
    pinta();
    return el("section", { class: "idea documento" }, p.sub ? el("p", { class: "eyebrow", text: p.sub }) : null, el("h2", { text: p.tit }), p.txt ? t("p", p.txt) : null,
      el("div", { class: "duo doc-duo" }, el("div", {}, papel),
        el("div", {}, notas.length ? el("div", { class: "doc-acciones" }, sig, todo) : null, el("ol", { class: "doc-notas", "aria-live": "polite" }, items),
          ideaClave(p.clave), p.ficha ? marcaFicha(p.ficha, p.fichaTxt) : null)));
  }

  function marcaFicha(ref, txt, grande) {
    return el("div", { class: "ficha-marca" + (grande ? " grande" : "") }, el("span", { class: "ficha-ico", "aria-hidden": "true", text: "✎" }),
      el("div", {}, el("strong", { text: `Ficha ${ref}` }), txt ? t("p", txt) : null));
  }
  function revelar(txt) {
    const caja = el("div", { class: "revelar", hidden: true }, t("p", txt));
    const b = el("button", { type: "button", class: "btn btn-sec", "aria-expanded": "false", onclick: () => { caja.hidden = !caja.hidden; b.setAttribute("aria-expanded", String(!caja.hidden)); b.textContent = caja.hidden ? "Ver la respuesta" : "Ocultar"; }, text: "Ver la respuesta" });
    return el("div", {}, b, caja);
  }

  // ───────── Reto fuera del aula (genera un código para la profesora) ─────────
  function retoFuera(s) {
    const cfg = s.fuera;
    const r = porHueco[cfg.h] || porId[cfg.id];
    const caja = el("section", { class: "fuera" },
      el("h2", { text: "Reto fuera del aula" }),
      t("p", cfg.txt || "Hazlo en casa, en tu móvil. Al terminar tendrás un código para enseñárselo a tu profesora."),
      el("p", { class: "note", text: "Solo se pide tu número de lista. Nunca tu nombre." }));
    if (!r) return caja;
    const lista = el("input", { type: "number", inputmode: "numeric", min: "1", max: "40", class: "num", "aria-label": "Tu número de lista" });
    const zona = el("div", {});
    caja.append(el("label", { class: "num-fila" }, el("span", { text: "Nº de lista" }), lista),
      el("div", { class: "reto-acciones" }, el("button", { type: "button", class: "btn btn-primario", text: `Empezar (${cfg.n} retos)`, onclick: ev => {
        const n = parseInt(lista.value, 10);
        if (!(n >= 1 && n <= 40)) { zona.replaceChildren(el("div", { class: "fb fb-tip" }, el("h4", { text: "Escribe tu número de lista (1–40)" }))); return; }
        ev.currentTarget.disabled = true; lista.disabled = true;
        const rnd = AL.rng(AL.semillaNueva());
        const puntos = [];
        const sig = k => {
          if (k >= cfg.n) {
            const aciertos = Math.round(puntos.reduce((a, b) => a + b, 0));
            const codigo = AL.codigo({ sesion: s.id, aciertos, total: cfg.n, lista: n, dia: AL.hoy() });
            guardarSesion(s.id, { fuera: { aciertos, total: cfg.n, codigo, fecha: AL.hoy() } });
            zona.append(el("div", { class: "codigo" }, el("p", { class: "eyebrow", text: "Tu código para la profesora" }), el("p", { class: "codigo-v", text: codigo }),
              el("p", { class: "note", text: `${aciertos} de ${cfg.n} · válido hoy (${AL.hoy()}). Cópialo en tu ficha.` })));
            return;
          }
          zona.append(el("p", { class: "paso-n", text: `Reto ${k + 1} de ${cfg.n}` }));
          zona.append(AL.retos.crear(r, { rnd, catalogo: BANCO.catalogo, compacto: true, alTerminar: res => {
            puntos.push(res.puntos);
            zona.append(el("div", { class: "reto-acciones" }, el("button", { type: "button", class: "btn btn-primario", text: k + 1 < cfg.n ? "Siguiente" : "Ver mi código", onclick: e2 => { e2.currentTarget.parentNode.remove(); sig(k + 1); } })));
          } }));
        };
        sig(0);
      } })), zona);
    return caja;
  }

  // ───────── Notas docentes (solo en la copia local de Drive; nunca se publican) ─────────
  function pintarNotas(raiz, notas, p) {
    const txt = p.nota || (p.t === "portada" ? notas.general : null);
    if (!txt) return;
    raiz.append(el("aside", { class: "notas-docente", "aria-label": "Notas para la docente" }, el("strong", { text: "Notas docentes · " }), t("span", txt)));
  }

  // ───────── Arranque ─────────
  function ruta() {
    const m = /^#(S\d\d)\/(\d+)$/.exec(location.hash);
    if (m) sesion(m[1], parseInt(m[2], 10)); else indice();
  }
  document.addEventListener("keydown", e => {
    if (e.target.closest("input, textarea, select") || e.altKey || e.metaKey || e.ctrlKey) return;
    const m = /^#(S\d\d)\/(\d+)$/.exec(location.hash);
    if (!m) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { const a = document.querySelector(".ses-nav .btn-primario"); if (a) { e.preventDefault(); location.href = a.href; } }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { const n = parseInt(m[2], 10); if (n > 0) { e.preventDefault(); location.hash = `#${m[1]}/${n - 1}`; } }
  });
  document.addEventListener("DOMContentLoaded", () => {
    SEC = window.SECUENCIA; BANCO = window.BANCO;
    raiz = document.getElementById("app");
    clave = `${BANCO.tema}:progreso`;
    porHueco = {}; porId = {};
    for (const r of BANCO.retos) { porId[r.id] = r; for (const h of r.huecos || []) porHueco[h] = r; }
    if (AL.store.get("pref:aula", false)) document.body.classList.add("aula");
    window.addEventListener("hashchange", ruta);
    ruta();
  });
})();
