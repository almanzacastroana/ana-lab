// ANA LAB · DOM mínimo para probar la lógica de las secuencias en JavaScriptCore (sin navegador).
// No pretende ser un navegador: solo lo que usan core.js, retos.js y player.js.
(function (g) {
  function Lista(n) { this.n = n; }
  Lista.prototype.add = function (...c) { const s = new Set(this.n.className.split(/\s+/).filter(Boolean)); c.forEach(x => s.add(x)); this.n.className = [...s].join(" "); };
  Lista.prototype.remove = function (...c) { this.n.className = this.n.className.split(/\s+/).filter(x => x && !c.includes(x)).join(" "); };
  Lista.prototype.contains = function (c) { return this.n.className.split(/\s+/).includes(c); };
  Lista.prototype.toggle = function (c) { if (this.contains(c)) { this.remove(c); return false; } this.add(c); return true; };

  function Nodo(tag) {
    this.tagName = (tag || "#text").toUpperCase(); this.children = []; this.childNodes = []; this.parentNode = null;
    this.attrs = {}; this.className = ""; this._txt = ""; this._html = ""; this.listeners = {}; this.style = {};
    this.classList = new Lista(this); this.disabled = false; this.hidden = false; this.value = ""; this.checked = false;
  }
  const P = Nodo.prototype;
  P.setAttribute = function (k, v) { this.attrs[k] = String(v); if (k === "class") this.className = String(v); if (k === "disabled") this.disabled = true; if (k === "hidden") this.hidden = true; if (k === "type") this.type = String(v); if (k === "value") this.value = String(v); if (k === "name") this.name = String(v); };
  P.getAttribute = function (k) { return k in this.attrs ? this.attrs[k] : null; };
  P.removeAttribute = function (k) { delete this.attrs[k]; };
  P.addEventListener = function (ev, f) { (this.listeners[ev] = this.listeners[ev] || []).push(f); };
  P._add = function (h) { if (typeof h === "string" || typeof h === "number") { const t = new Nodo("#text"); t._txt = String(h); h = t; } if (h.parentNode) h.parentNode._quitar(h); h.parentNode = this; this.childNodes.push(h); if (h.tagName !== "#TEXT") this.children.push(h); };
  P._quitar = function (h) { this.childNodes = this.childNodes.filter(x => x !== h); this.children = this.children.filter(x => x !== h); h.parentNode = null; };
  P.append = function (...hs) { hs.forEach(h => this._add(h)); };
  P.appendChild = function (h) { this._add(h); return h; };
  P.replaceChildren = function (...hs) { this.childNodes.slice().forEach(c => this._quitar(c)); this._html = ""; hs.forEach(h => this._add(h)); };
  P._insertar = function (h, desfase) {
    const padre = this.parentNode; if (!padre) return;
    if (typeof h === "string") { const t = new Nodo("#text"); t._txt = h; h = t; }
    if (h.parentNode) h.parentNode._quitar(h);
    h.parentNode = padre;
    const i = padre.childNodes.indexOf(this) + desfase; padre.childNodes.splice(i, 0, h);
    if (h.tagName !== "#TEXT") { const j = padre.children.indexOf(this) + desfase; padre.children.splice(j, 0, h); }
  };
  P.before = function (...hs) { hs.forEach(h => this._insertar(h, 0)); };
  P.after = function (...hs) { hs.slice().reverse().forEach(h => this._insertar(h, 1)); };
  P.remove = function () { if (this.parentNode) this.parentNode._quitar(this); };
  P.focus = function () { g.document.activeElement = this; };
  P.closest = function (sel) { let n = this; while (n) { if (coincide(n, sel)) return n; n = n.parentNode; } return null; };
  Object.defineProperty(P, "textContent", {
    get() { return this.tagName === "#TEXT" ? this._txt : (this._html.replace(/<[^>]+>/g, "") + this.childNodes.map(c => c.textContent).join("")); },
    set(v) { this.replaceChildren(); this._txt = ""; if (this.tagName === "#TEXT") this._txt = String(v); else this._add(String(v)); }
  });
  Object.defineProperty(P, "innerHTML", { get() { return this._html; }, set(v) { this.replaceChildren(); this._html = String(v); } });
  Object.defineProperty(P, "href", { get() { return this.attrs.href || ""; } });

  const VACIOS = new Set(["INPUT", "BR", "HR", "IMG", "META", "LINK"]);
  const escA = v => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const escT = v => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  Object.defineProperty(P, "outerHTML", { get() {
    if (this.tagName === "#TEXT") return escT(this._txt);
    const tag = this.tagName.toLowerCase();
    const at = Object.assign({}, this.attrs);
    if (this.className) at.class = this.className; else delete at.class;
    if (this.disabled) at.disabled = ""; if (this.hidden) at.hidden = "";
    if (this.checked) at.checked = "";
    if (tag === "input" && this.value) at.value = this.value;
    const attrs = Object.entries(at).map(([k, v]) => v === "" ? ` ${k}` : ` ${k}="${escA(v)}"`).join("");
    if (VACIOS.has(this.tagName)) return `<${tag}${attrs}>`;
    let dentro = this._html + this.childNodes.map(c => c.outerHTML).join("");
    if (tag === "select") dentro = this.childNodes.map(c => c.attrs && c.attrs.value === this.value && this.value ? c.outerHTML.replace("<option", "<option selected") : c.outerHTML).join("");
    return `<${tag}${attrs}>${dentro}</${tag}>`;
  } });
  function coincideSimple(n, s) {
    if (!n || n.tagName === "#TEXT") return false;
    s = s.trim();
    let m;
    if ((m = /^([a-z0-9]*)((?:\.[\w-]+)*)((?:\[[^\]]+\])*)((?::[\w-]+(?:\([^)]*\))?)*)$/i.exec(s)) === null) return false;
    const [, tag, clases, atrs, pseudos] = m;
    if (tag && n.tagName !== tag.toUpperCase()) return false;
    for (const c of clases.split(".").filter(Boolean)) if (!n.classList.contains(c)) return false;
    for (const a of (atrs.match(/\[[^\]]+\]/g) || [])) { const [k, v] = a.slice(1, -1).split("="); if (k === "disabled" ? !n.disabled : !(k in n.attrs)) return false; if (v && n.attrs[k] !== v.replace(/"/g, "")) return false; }
    for (const p of (pseudos.match(/:[\w-]+(\([^)]*\))?/g) || [])) {
      if (p === ":checked" && !n.checked) return false;
      if (p.startsWith(":not(")) { if (coincideSimple(n, p.slice(5, -1))) return false; }
    }
    return true;
  }
  function coincide(n, sel) { return sel.split(",").some(parte => { const ps = parte.trim().split(/\s+/); if (!coincideSimple(n, ps[ps.length - 1])) return false; let a = n.parentNode; for (let i = ps.length - 2; i >= 0; i--) { while (a && !coincideSimple(a, ps[i])) a = a.parentNode; if (!a) return false; a = a.parentNode; } return true; }); }
  function todos(raiz) { const out = []; (function rec(n) { for (const c of n.children) { out.push(c); rec(c); } })(raiz); return out; }
  P.querySelectorAll = function (sel) { return todos(this).filter(n => coincide(n, sel)); };
  P.querySelector = function (sel) { return this.querySelectorAll(sel)[0] || null; };
  P.dispatch = function (ev, extra) { const e = Object.assign({ type: ev, currentTarget: this, target: this, key: "", preventDefault() {} }, extra || {}); (this.listeners[ev] || []).forEach(f => f(e)); };
  P.click = function () { if (!this.disabled) this.dispatch("click"); };

  const body = new Nodo("body");
  g.window = g;
  g.document = {
    body, activeElement: null, title: "", _l: {},
    createElement: t => new Nodo(t),
    createElementNS: (ns, t) => new Nodo(t),
    getElementById: id => (id === "app" ? g.__app : null),
    addEventListener(ev, f) { (this._l[ev] = this._l[ev] || []).push(f); },
    querySelector: sel => body.querySelector(sel), querySelectorAll: sel => body.querySelectorAll(sel)
  };
  g.__app = new Nodo("div"); body.append(g.__app);
  g.location = { hash: "", href: "", search: "" };
  if (typeof g.URLSearchParams === "undefined") g.URLSearchParams = function (q) { const m = {}; String(q || "").replace(/^\?/, "").split("&").filter(Boolean).forEach(kv => { const [k, v] = kv.split("="); m[decodeURIComponent(k)] = decodeURIComponent(v || ""); }); this.get = k => (k in m ? m[k] : null); };
  g.__winL = {};
  g.addEventListener = (ev, f) => { (g.__winL[ev] = g.__winL[ev] || []).push(f); };
  g.scrollTo = () => {};
  g.matchMedia = () => ({ matches: false });
  g.confirm = () => true;
  const mem = {};
  g.localStorage = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  Object.defineProperty(g.localStorage, "__keys", { value: mem });
  g.console = g.console || { log: print };
  g.__Nodo = Nodo;
})(this);
