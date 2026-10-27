// ANA LAB · Núcleo común de secuencias y juegos.
// Utilidades sin dependencias: creación de nodos, formato de texto, azar con semilla,
// guardado local tolerante a fallos y código de verificación.
(function () {
  const AL = (window.AL = window.AL || {});

  // Crea un nodo. attrs admite class, text, html (solo contenido propio ya escapado) y onX para eventos.
  AL.el = function (tag, attrs, ...hijos) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    for (const h of hijos.flat()) if (h != null && h !== false) n.append(h);
    return n;
  };

  // Texto con **negrita**, *cursiva* y saltos de línea. Se escapa antes de dar formato.
  AL.esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  AL.fmt = function (s) {
    return AL.esc(s)
      .replace(/\*\*(.+?)\*\*(?!\*)/g, "<strong>$1</strong>")
      .replace(/(^|[^\w*])\*([^\s*](?:[^*]*[^\s*])?)\*(?![\w*])/g, "$1<em>$2</em>")
      .replace(/\n/g, "<br>");
  };
  AL.t = (tag, s, attrs) => AL.el(tag, Object.assign({ html: AL.fmt(s) }, attrs || {}));

  // Azar reproducible (mulberry32) a partir de una semilla numérica o de texto.
  AL.hash = function (s) {
    let h = 0x811c9dc5;
    for (const ch of String(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  };
  AL.rng = function (semilla) {
    let a = typeof semilla === "number" ? semilla >>> 0 : AL.hash(semilla);
    const f = function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = (min, max) => min + Math.floor(f() * (max - min + 1));
    f.pick = arr => arr[Math.floor(f() * arr.length)];
    f.shuffle = arr => { const b = arr.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(f() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
    f.sample = (arr, k) => f.shuffle(arr).slice(0, k);
    return f;
  };
  AL.semillaNueva = () => (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;

  // Guardado local: si el navegador lo bloquea (modo privado, etc.), todo sigue funcionando sin guardar.
  AL.store = {
    get(clave, porDefecto) {
      try { const v = localStorage.getItem("analab:" + clave); return v == null ? porDefecto : JSON.parse(v); }
      catch (e) { return porDefecto; }
    },
    set(clave, valor) {
      try { localStorage.setItem("analab:" + clave, JSON.stringify(valor)); return true; }
      catch (e) { return false; }
    },
    borrarTodo(prefijo) {
      try { Object.keys(localStorage).filter(k => k.startsWith("analab:" + (prefijo || ""))).forEach(k => localStorage.removeItem(k)); }
      catch (e) { /* sin guardado: nada que borrar */ }
    }
  };

  // Código de verificación de un reto fuera del aula.
  // Formato: S04-08/10-N12-K7Q2 (sesiones S01…; juegos J01…). Lo comprueba la página docente con la misma regla.
  // Límite conocido: se calcula en el dispositivo, así que disuade, pero no es inviolable.
  const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
  AL.SAL = "analab-3038";
  AL.firma = function (texto) {
    let h = AL.hash(texto + "|" + AL.SAL), s = "";
    for (let i = 0; i < 4; i++) { s += ALFABETO[h % ALFABETO.length]; h = Math.floor(h / ALFABETO.length); }
    return s;
  };
  AL.codigo = function ({ sesion, aciertos, total, lista, dia }) {
    const base = `${sesion}-${String(aciertos).padStart(2, "0")}/${String(total).padStart(2, "0")}-N${String(lista).padStart(2, "0")}`;
    return base + "-" + AL.firma(base + "|" + dia);
  };
  AL.verificarCodigo = function (codigo, dia) {
    const m = /^([SJ]\d\d-\d\d\/\d\d-N\d\d)-([A-Z0-9]{4})$/.exec(String(codigo).trim().toUpperCase());
    return !!m && AL.firma(m[1] + "|" + dia) === m[2];
  };
  AL.hoy = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

  AL.prefiereMenosMovimiento = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
})();
