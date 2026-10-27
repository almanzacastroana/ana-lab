// ANA LAB · Generadores de retos. Crean variantes nuevas con datos verosímiles y UNA solución verificable.
// Las reglas son las mismas que valida herramientas/validar_banco.py (10.000 partidas por motor).
// Cada generador recibe (rnd, catalogo, opciones) y devuelve una instancia lista para pintar.
(function () {
  const AL = (window.AL = window.AL || {});
  const APERTURAS = [6, 8, 10, 12, 16, 20, 24, 30, 36, 48];
  const coma = n => String(n).replace(".", ",");
  const plural = (n, s, p) => (n === 1 ? s : p || s + "s");
  const nombreCorto = p => p.nombre.replace(/\s*\(.*?\)\s*/g, " ").trim();
  const sinMaterial = cat => cat.productos.filter(p => p.almacen !== "material");

  const G = (AL.gen = {});

  // Reposición. nivel 1: restar · 2: con previsión · 3: con previsión y formato.
  G.reposicion = function (rnd, cat, { nivel = 1 } = {}) {
    const candidatos = nivel === 3 ? sinMaterial(cat).filter(p => p.n >= 4 && p.n <= 24) : sinMaterial(cat);
    const p = rnd.pick(candidatos);
    const apertura = rnd.pick(APERTURAS);
    let factores = nivel === 1 ? [1] : nivel === 2 ? [1.5, 2] : [1, 1.5, 2];
    if (apertura % 2) factores = factores.filter(f => f !== 1.5);
    if (!factores.length) factores = [2];
    const factor = rnd.pick(factores);
    const objetivo = apertura * factor;
    const existencias = rnd.int(0, apertura);
    const faltan = Math.max(0, objetivo - existencias);
    const n = nivel === 3 ? p.n : 1;
    const pedir = Math.ceil(faltan / n);
    const unidad = nivel === 3 ? p.formato : "unidad";
    let enunciado, pasos;
    if (nivel === 1) {
      enunciado = `Al abrir debe haber **${apertura}** unidades de «${nombreCorto(p)}». Quedan **${existencias}**. ¿Cuántas hay que reponer?`;
      pasos = [`${apertura} − ${existencias} = ${faltan}`];
    } else if (nivel === 2) {
      enunciado = `Un día normal, al abrir debe haber **${apertura}** unidades de «${nombreCorto(p)}». Mañana la previsión es **×${coma(factor)}**. Quedan **${existencias}**. ¿Cuántas unidades hay que reponer?`;
      pasos = [`Previsión: ${apertura} × ${coma(factor)} = ${objetivo}`, `${objetivo} − ${existencias} = ${faltan}`];
    } else {
      enunciado = `Al abrir debe haber **${apertura}** unidades de «${nombreCorto(p)}»${factor !== 1 ? ` y la previsión es **×${coma(factor)}**` : ""}. Quedan **${existencias}**. Viene en **${p.formato} de ${p.n}**. ¿Cuántos ${plural(2, p.formato, p.formato === "pack" ? "packs" : undefined)} hay que pedir?`;
      pasos = [];
      if (factor !== 1) pasos.push(`Previsión: ${apertura} × ${coma(factor)} = ${objetivo}`);
      pasos.push(`Faltan: ${objetivo} − ${existencias} = ${faltan}`);
      if (faltan > 0) pasos.push(`${faltan} ÷ ${p.n} = ${coma(Math.round((faltan / p.n) * 100) / 100)} → redondeo hacia arriba: **${pedir}**`);
    }
    if (faltan === 0) pasos.push("No falta nada: **no se pide**.");
    return { motor: "reposicion", nivel, producto: p, apertura, factor, existencias, faltan, n, pedir, unidad,
             respuesta: nivel === 3 ? pedir : faltan, enunciado, pasos };
  };

  // Recepción: triple comparación pedido ↔ albarán ↔ llegado. Como máximo una discrepancia por línea.
  G.RESP_RECEPCION = {
    correcta: "Correcta",
    falta: "Falta mercancía (llega menos de lo que dice el albarán)",
    albaran_distinto: "El albarán no coincide con lo pedido",
    sobra: "Llega más de lo que dice el albarán"
  };
  G.recepcion = function (rnd, cat, { lineas = 4 } = {}) {
    const tipos = Object.keys(G.RESP_RECEPCION);
    let tl = Array.from({ length: lineas }, () => rnd.pick(tipos));
    if (tl.every(t => t === "correcta")) tl[rnd.int(0, lineas - 1)] = rnd.pick(tipos.slice(1));
    const prods = rnd.sample(sinMaterial(cat), lineas);
    return { motor: "recepcion", lineas: prods.map((p, i) => {
      const t = tl[i];
      let pedido = rnd.int(1, 12), albaran, llegado;
      if (t === "correcta") { albaran = pedido; llegado = pedido; }
      else if (t === "falta") { pedido = Math.max(pedido, 2); albaran = pedido; llegado = albaran - rnd.int(1, Math.min(2, albaran - 1)); }
      else if (t === "albaran_distinto") { const d = rnd.pick([-4, -3, -2, -1, 1, 2, 3, 4].filter(x => pedido + x >= 1)); albaran = pedido + d; llegado = albaran; }
      else { albaran = pedido; llegado = pedido + 1; }
      return { producto: p.n > 1 ? `${nombreCorto(p)} (${p.formato} ${p.n})` : nombreCorto(p), pedido, albaran, llegado, solucion: t };
    }) };
  };
  G.resolverLinea = l => (l.pedido !== l.albaran ? "albaran_distinto" : l.llegado < l.albaran ? "falta" : l.llegado > l.albaran ? "sobra" : "correcta");

  // FEFO: unidades con fecha de entrada y caducidad distintas; solución = orden por caducidad.
  G.fefo = function (rnd, cat, { unidades = 4 } = {}) {
    const frios = cat.productos.filter(p => p.cerrado === "refrigeracion" && p.formato !== "malla 1 kg");
    const p = rnd.pick(frios);
    const caducidades = rnd.sample(Array.from({ length: 24 }, (_, i) => i + 6), unidades);
    const entradas = rnd.shuffle(Array.from({ length: unidades }, (_, i) => i + 1)).map(x => x);
    const letras = "ABCDEF".split("");
    const us = caducidades.map((c, i) => ({ id: letras[i], texto: `${nombreCorto(p)} ${letras[i]}`, entrada: entradas[i], caduca: c }));
    const solucion = us.slice().sort((a, b) => a.caduca - b.caduca).map(u => u.id);
    const fifo = us.slice().sort((a, b) => a.entrada - b.entrada).map(u => u.id);
    return { motor: "fefo", producto: p, unidades: us, solucion, difiereDeFifo: fifo.join() !== solucion.join() };
  };

  // Traslado: 3 o 4 productos de clases distintas; solución = clase ascendente.
  G.traslado = function (rnd, cat, { k } = {}) {
    const clases = {};
    for (const p of cat.productos) (clases[p.traslado] = clases[p.traslado] || []).push(p);
    const n = k || rnd.pick([3, 4]);
    const elegidas = rnd.sample(Object.keys(clases), n).map(Number).sort((a, b) => a - b);
    const productos = elegidas.map(c => rnd.pick(clases[c]));
    return { motor: "traslado", productos: rnd.shuffle(productos), solucion: productos.map(p => p.id) };
  };

  // Clasificaciones con el catálogo.
  G.almacen = function (rnd, cat, { k = 6, muestra } = {}) {
    const base = muestra ? cat.productos.filter(p => muestra.includes(p.id)) : cat.productos;
    return { motor: "almacen", categorias: Object.values(cat.almacenes),
             elementos: rnd.sample(base, Math.min(k, base.length)).map(p => ({ t: p.nombre, cat: cat.almacenes[p.almacen], fb: explicaAlmacen(p, cat) })) };
  };
  function explicaAlmacen(p, cat) {
    return { economato: "No perecedero o consumible: economato.", bodega: "Bebida: bodega.", camara: "Necesita frío positivo: cámara de refrigeración.",
             congelacion: "Congelado: cámara o arcón de congelación.", material: "Material o limpieza: almacén de material, separado de los alimentos." }[p.almacen];
  }
  G.conservacion = function (rnd, cat, { k = 6, muestra } = {}) {
    let pares = [];
    for (const p of cat.productos) for (const est of ["cerrado", "abierto"]) if (p[est]) pares.push([p, est]);
    if (muestra) pares = pares.filter(([p, est]) => muestra.some(m => m[0] === p.id && m[1] === est));
    return { motor: "conservacion", categorias: Object.values(cat.conservacion),
             elementos: rnd.sample(pares, Math.min(k, pares.length)).map(([p, est]) => ({
               t: `${p.nombre} · ${est}`, cat: cat.conservacion[p[est]],
               fb: est === "abierto" && p.cerrado !== p.abierto ? "Cerrado aguanta a temperatura ambiente, pero abierto necesita frío: la etiqueta manda." : `${cat.conservacion[p[est]]}.` })) };
  };
  G.residuos = function (rnd, cat, { k = 6 } = {}) {
    return { motor: "residuos", categorias: Object.values(cat.residuos_destinos),
             elementos: rnd.sample(cat.residuos, Math.min(k, cat.residuos.length)).map(r => ({ t: r.t, cat: cat.residuos_destinos[r.destino], fb: r.fb })) };
  };

  // Vale: varias líneas de reposición (nivel 3) que hay que pasar al documento.
  G.vale = function (rnd, cat, { lineas = 3 } = {}) {
    const usados = new Set(), filas = [];
    let guard = 0;
    while (filas.length < lineas && guard++ < 100) {
      const r = G.reposicion(rnd, cat, { nivel: 3 });
      if (usados.has(r.producto.id) || r.pedir === 0) continue;
      usados.add(r.producto.id);
      filas.push({ producto: r.producto.nombre, faltan: r.faltan, formato: `${r.producto.formato} ${r.producto.n}`, pedir: r.pedir });
    }
    return { motor: "vale", filas };
  };
})();
