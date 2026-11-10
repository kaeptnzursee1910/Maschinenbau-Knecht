<script>
window.MathJax = {
  tex: { inlineMath: [['\\(', '\\)']], displayMath: [['\\[', '\\]']] },
  svg: { fontCache: 'global' },
  options: { enableMenu: false },
  startup: {
    typeset: false,
    ready() { MathJax.startup.defaultReady(); if (window.__typesetVisible) window.__typesetVisible(); }
  }
};
</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3.2.2/es5/tex-svg.js" async></script>
<script>
(function () {
'use strict';

/* ================= Grundfunktionen ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const PI = Math.PI, sqrt = Math.sqrt, abs = Math.abs, DEG = PI / 180;
const r1 = v => Math.round(v * 10) / 10;

class UErr extends Error {}
const fail = m => { throw new UErr(m); };
function fin(v, n) { if (!isFinite(v)) fail(`Bitte einen Wert für ${n} eingeben.`); return v; }
function pos(v, n) { fin(v, n); if (v <= 0) fail(`${n} muss größer als 0 sein.`); return v; }
function nn(v, n) { fin(v, n); if (v < 0) fail(`${n} darf nicht negativ sein.`); return v; }
const or0 = v => (isFinite(v) ? v : 0);

const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const sup = n => String(n).split('').map(c => SUP[c] || c).join('');

function fmt(x, sig = 4) { return fmt0(x, sig).replace(/^-/, '−').replace('·10⁻', '·10⁻'); }
function fmt0(x, sig) {
  if (x === null || x === undefined) return '–';
  if (typeof x === 'string') return x;
  if (!isFinite(x)) return '–';
  if (x === 0 || abs(x) < 1e-12) return '0';
  const a = abs(x);
  if (a >= 1e7 || a < 1e-3) {
    let e = Math.floor(Math.log10(a)), m = x / Math.pow(10, e);
    if (abs(+m.toFixed(sig - 1)) >= 10) { m /= 10; e++; }
    return m.toLocaleString('de-DE', { maximumFractionDigits: sig - 1 }) + '·10' + sup(e);
  }
  if (a >= Math.pow(10, sig)) return Math.round(x).toLocaleString('de-DE');
  return x.toLocaleString('de-DE', { maximumSignificantDigits: sig });
}
const fx = (x, d) => (isFinite(x) ? x.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d }) : '–');
const sgn = (x, d = 0) => (x > 0 ? '+' : x < 0 ? '−' : '±') + fx(abs(x), d);

function parseNum(s) {
  s = String(s).trim().replace(/\s/g, '').replace(/·10\^?/, 'e').replace(/×10\^?/, 'e').replace('−', '-');
  if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
  if (s === '' || s === '-' || s === '.') return NaN;
  return Number(s);
}
function interp(xs, ys, x) {
  if (x <= xs[0]) return ys[0];
  for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return ys[i - 1] + (ys[i] - ys[i - 1]) * (x - xs[i - 1]) / (xs[i] - xs[i - 1]);
  return ys[ys.length - 1];
}
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* ================= Diagramme ================= */
function niceStep(range, n) {
  const raw = range / n, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p;
  return (m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10) * p;
}
function ticks(a, b, n = 5) {
  if (!(b > a)) { a -= 1; b += 1; }
  const st = niceStep(b - a, n), t = [];
  for (let v = Math.ceil(a / st - 1e-9) * st; v <= b + st * 1e-9; v += st) t.push(abs(v) < st * 1e-9 ? 0 : +v.toPrecision(12));
  return t;
}
function decades(r) { const t = []; for (let k = Math.ceil(Math.log10(r[0]) - 1e-9); k <= Math.floor(Math.log10(r[1]) + 1e-9); k++) t.push(Math.pow(10, k)); return t; }
const expLabel = v => '10' + sup(Math.round(Math.log10(v)));
function padRange(lo, hi, f = 0.08, zero = true) {
  if (zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  if (hi === lo) { hi += 1; lo -= zero && lo === 0 ? 0 : 1; }
  const d = (hi - lo) * f;
  return [lo < 0 || !zero ? lo - d : lo, hi > 0 || !zero ? hi + d : hi];
}
let clipN = 0;
function plot(o) {
  const W = o.w || 640, H = o.h || 320, m = Object.assign({ l: 62, r: 18, t: 26, b: 40 }, o.m || {});
  const lx = !!o.xlog, ly = !!o.ylog;
  const tx = v => (lx ? Math.log10(v) : v), ty = v => (ly ? Math.log10(v) : v);
  const X0 = tx(o.x[0]), X1 = tx(o.x[1]), Y0 = ty(o.y[0]), Y1 = ty(o.y[1]);
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const sx = v => m.l + (tx(v) - X0) / (X1 - X0) * pw;
  const sy = o.yrev ? v => m.t + (ty(v) - Y0) / (Y1 - Y0) * ph : v => m.t + ph - (ty(v) - Y0) / (Y1 - Y0) * ph;
  const xt = o.xt || (lx ? decades(o.x) : ticks(o.x[0], o.x[1], o.nx || 6));
  const yt = o.yt || (ly ? decades(o.y) : ticks(o.y[0], o.y[1], o.ny || 5));
  const xf = o.xf || (lx ? expLabel : v => fmt(v, 3)), yf = o.yf || (ly ? expLabel : v => fmt(v, 3));
  const inX = v => v >= o.x[0] - 1e-12 * abs(o.x[1]) && v <= o.x[1] + 1e-12 * abs(o.x[1]);
  const inY = v => v >= Math.min(o.y[0], o.y[1]) - 1e-12 && v <= Math.max(o.y[0], o.y[1]) + 1e-12;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(o.title || 'Diagramm')}">`;
  for (const v of xt) { if (!inX(v)) continue; const X = r1(sx(v)); s += `<line class="gl" x1="${X}" x2="${X}" y1="${m.t}" y2="${m.t + ph}"/><text class="tk" x="${X}" y="${m.t + ph + 15}" text-anchor="middle">${xf(v)}</text>`; }
  for (const v of yt) { if (!inY(v)) continue; const Y = r1(sy(v)); s += `<line class="gl" x1="${m.l}" x2="${m.l + pw}" y1="${Y}" y2="${Y}"/><text class="tk" x="${m.l - 6}" y="${Y + 3.5}" text-anchor="end">${yf(v)}</text>`; }
  if (!ly && o.y[0] < 0 && o.y[1] > 0) { const Y = r1(sy(0)); s += `<line class="ax" x1="${m.l}" x2="${m.l + pw}" y1="${Y}" y2="${Y}"/>`; }
  if (!lx && o.x[0] < 0 && o.x[1] > 0) { const X = r1(sx(0)); s += `<line class="ax" x1="${X}" x2="${X}" y1="${m.t}" y2="${m.t + ph}"/>`; }
  s += `<rect class="ax" x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/>`;
  if (o.xl) s += `<text class="lb" x="${m.l + pw}" y="${H - 6}" text-anchor="end">${o.xl}</text>`;
  if (o.yl) s += `<text class="lb" x="8" y="${m.t - 10}">${o.yl}</text>`;
  const id = 'cp' + (++clipN);
  s += `<defs><clipPath id="${id}"><rect x="${m.l}" y="${m.t}" width="${pw}" height="${ph}"/></clipPath></defs><g clip-path="url(#${id})">`;
  if (o.under) s += o.under(sx, sy, m, pw, ph);
  const valid = p => isFinite(p[0]) && isFinite(p[1]) && (!lx || p[0] > 0) && (!ly || p[1] > 0);
  for (const se of o.series || []) {
    const pts = se.pts.filter(valid);
    if (pts.length < 2) continue;
    const d = pts.map((p, i) => (i ? 'L' : 'M') + r1(sx(p[0])) + ' ' + r1(sy(p[1]))).join('');
    if (se.area !== undefined) {
      const yb = r1(sy(se.area));
      s += `<path class="${se.acls || 'a1'}" d="${d}L${r1(sx(pts[pts.length - 1][0]))} ${yb}L${r1(sx(pts[0][0]))} ${yb}Z"/>`;
    }
    if (se.fill) s += `<path class="${se.fill}" d="${d}Z"/>`;
    s += `<path class="${se.cls || 's1'}" d="${d}"/>`;
  }
  s += '</g>';
  for (const se of o.series || []) {
    if (!se.label) continue;
    const pts = se.pts.filter(p => valid(p) && inX(p[0]) && inY(p[1]));
    if (!pts.length) continue;
    const p = se.labelAt === 'start' ? pts[0] : pts[pts.length - 1];
    s += `<text class="${se.lcls || 'tk'}" x="${r1(sx(p[0]) + (se.ldx || 4))}" y="${r1(sy(p[1]) + (se.ldy || 3))}"${se.anchor ? ` text-anchor="${se.anchor}"` : ''}>${se.label}</text>`;
  }
  for (const p of o.points || []) {
    if (!valid([p.x, p.y]) || !inX(p.x) || !inY(p.y)) continue;
    const X = r1(sx(p.x)), Y = r1(sy(p.y));
    s += `<circle class="${p.cls || 'pt'}" cx="${X}" cy="${Y}" r="${p.r || 5}"/>`;
    if (p.label) s += `<text class="${p.lcls || 'lbb'}" x="${X + (p.dx ?? 8)}" y="${Y + (p.dy ?? -8)}"${p.anchor ? ` text-anchor="${p.anchor}"` : ''}>${p.label}</text>`;
  }
  if (o.extra) s += o.extra(sx, sy, m, pw, ph);
  return s + '</svg>';
}
function scene(bb, W, H, pad) {
  const k = Math.min((W - 2 * pad) / ((bb[1] - bb[0]) || 1), (H - 2 * pad) / ((bb[3] - bb[2]) || 1));
  const ox = (W - k * (bb[1] - bb[0])) / 2, oy = (H - k * (bb[3] - bb[2])) / 2;
  return { k, X: x => r1(ox + (x - bb[0]) * k), Y: y => r1(H - oy - (y - bb[2]) * k) };
}
function arrow(x1, y1, x2, y2, cls = 'ar', hcls = 'fa', hs = 9) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
  if (L < 1) return '';
  const h = Math.min(hs, L * 0.6);
  const bx = x2 - h * 0.85 * Math.cos(a), by = y2 - h * 0.85 * Math.sin(a);
  const p1 = [x2 - h * Math.cos(a - 0.38), y2 - h * Math.sin(a - 0.38)], p2 = [x2 - h * Math.cos(a + 0.38), y2 - h * Math.sin(a + 0.38)];
  return `<line class="${cls}" x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(bx)}" y2="${r1(by)}"/><polygon class="${hcls}" points="${r1(x2)},${r1(y2)} ${r1(p1[0])},${r1(p1[1])} ${r1(p2[0])},${r1(p2[1])}"/>`;
}
const T = (x, y, txt, cls = 'lb', anchor) => `<text class="${cls}" x="${r1(x)}" y="${r1(y)}"${anchor ? ` text-anchor="${anchor}"` : ''}>${txt}</text>`;

/* ================= Rechner-Gerüst ================= */
const CALCS = {};
const calc = (name, spec) => { CALCS[name] = spec; };
const STORE_KEY = 'mbk.v1';
let store = {};
try { store = JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { store = {}; }
const saveStore = () => { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) { /* Speicher nicht verfügbar */ } };
const dflt = v => (typeof v === 'number' ? String(v).replace('.', ',') : String(v));

function renderOut(out, r) {
  let h = '';
  if (r.chips && r.chips.length) h += '<div class="chips">' + r.chips.filter(Boolean).map(c => `<span class="chip ${c[1] || ''}">${c[0]}</span>`).join('') + '</div>';
  if (r.rows && r.rows.length) {
    h += '<div class="res">' + r.rows.filter(Boolean).map(x => x.h !== undefined ? `<div class="rh">${x.h}</div>`
      : `<div class="r${x[3] ? ' key' : ''}"><span class="k">${x[0]}</span><span class="val">${typeof x[1] === 'number' ? fmt(x[1], x[4] || 4) : x[1]}</span><span class="un">${x[2] || ''}</span></div>`).join('') + '</div>';
  }
  if (r.table) {
    h += '<div class="tbl"><table><tr>' + r.table.head.map(c => `<th>${c}</th>`).join('') + '</tr>' +
      r.table.rows.map(row => '<tr>' + row.map((c, i) => `<td${i === 0 && r.table.textFirst !== false ? ' class="t"' : ''}>${typeof c === 'number' ? fmt(c) : c}</td>`).join('') + '</tr>').join('') + '</table></div>';
  }
  if (r.notes && r.notes.length) h += '<ul class="notes">' + r.notes.filter(Boolean).map(n => `<li>${n}</li>`).join('') + '</ul>';
  out.innerHTML = h;
}

function buildCalc(root) {
  const name = root.dataset.calc, spec = CALCS[name];
  if (!spec || root.dataset.built) return;
  root.dataset.built = '1';
  const head = document.createElement('div');
  head.className = 'calc-head';
  head.innerHTML = '<h2>Rechner</h2><span class="sp"></span>';
  const reset = document.createElement('button');
  reset.type = 'button'; reset.textContent = 'Beispielwerte';
  head.append(reset);
  const box = document.createElement('div'); box.className = 'fields';
  const out = document.createElement('div'); out.className = 'out'; out.setAttribute('aria-live', 'polite');
  const fig = document.createElement('div'); fig.className = 'fig';
  const saved = store[name] || {};
  const conds = [], inputs = [];
  for (const f of spec.fields) {
    let node;
    if (f.h !== undefined) {
      node = document.createElement('div'); node.className = 'fh'; node.textContent = f.h;
    } else {
      const id = name + '-' + f.id;
      node = document.createElement('div'); node.className = 'field' + (f.wide ? ' wide' : '');
      let ctl;
      if (f.opts) {
        ctl = document.createElement('select');
        for (const o of f.opts) {
          if (o.g) {
            const og = document.createElement('optgroup'); og.label = o.g;
            for (const p of o.o) { const op = document.createElement('option'); op.value = p[0]; op.textContent = p[1]; og.append(op); }
            ctl.append(og);
          } else { const op = document.createElement('option'); op.value = o[0]; op.textContent = o[1]; ctl.append(op); }
        }
      } else {
        ctl = document.createElement('input');
        ctl.type = 'text'; ctl.inputMode = 'decimal'; ctl.autocomplete = 'off'; ctl.spellcheck = false;
        ctl.setAttribute('autocorrect', 'off');
      }
      ctl.id = id;
      ctl.dataset.def = dflt(f.val);
      ctl.value = saved[f.id] !== undefined ? saved[f.id] : dflt(f.val);
      if (f.opts && ctl.value === '') ctl.value = dflt(f.val);
      const lab = document.createElement('label'); lab.htmlFor = id; lab.innerHTML = f.label;
      const wrap = document.createElement('div'); wrap.className = 'inp'; wrap.append(ctl);
      if (f.unit) { const u = document.createElement('span'); u.className = 'u'; u.innerHTML = f.unit; wrap.append(u); }
      node.append(lab, wrap);
      if (f.hint) { const hn = document.createElement('div'); hn.className = 'hint'; hn.innerHTML = f.hint; node.append(hn); }
      inputs.push({ f, ctl, wrap });
    }
    if (f.when) conds.push({ f, node });
    box.append(node);
  }
  root.append(head, box, out, fig);

  const get = id => { const e = document.getElementById(name + '-' + id); return e ? parseNum(e.value) : NaN; };
  const sel = id => { const e = document.getElementById(name + '-' + id); return e ? e.value : ''; };
  function run() {
    for (const c of conds) c.node.hidden = !c.f.when(sel, get);
    for (const { f, ctl, wrap } of inputs) wrap.classList.toggle('bad', !f.opts && ctl.value.trim() !== '' && !isFinite(parseNum(ctl.value)));
    try {
      const r = spec.compute(get, sel) || {};
      renderOut(out, r);
      fig.innerHTML = r.fig || '';
    } catch (e) {
      out.innerHTML = `<p class="err">${esc(e instanceof UErr ? e.message : 'Diese Eingabe lässt sich nicht berechnen. Prüfe die Werte.')}</p>`;
      fig.innerHTML = '';
      if (!(e instanceof UErr)) console.error(e);
    }
  }
  const onChange = e => {
    const t = e.target; if (!t.id || !t.id.startsWith(name + '-')) return;
    (store[name] = store[name] || {})[t.id.slice(name.length + 1)] = t.value;
    saveStore(); run();
  };
  box.addEventListener('input', onChange);
  box.addEventListener('change', onChange);
  reset.addEventListener('click', () => {
    for (const { ctl } of inputs) ctl.value = ctl.dataset.def;
    delete store[name]; saveStore(); run();
  });
  run();
}

/* ================= STATIK ================= */
calc('resultierende', {
  fields: [1, 2, 3, 4].flatMap(i => [
    { h: `Kraft ${i}` },
    { id: 'F' + i, label: `Betrag <i>F</i><sub>${i}</sub>`, unit: 'N', val: [800, 500, 300, 0][i - 1] },
    { id: 'a' + i, label: `Winkel <i>α</i><sub>${i}</sub>`, unit: '°', val: [30, 120, 270, 0][i - 1] },
    { id: 'x' + i, label: `Angriffspunkt <i>x</i><sub>${i}</sub>`, unit: 'm', val: [0, 2, 1, 0][i - 1] },
    { id: 'y' + i, label: `Angriffspunkt <i>y</i><sub>${i}</sub>`, unit: 'm', val: [0, 0, 1, 0][i - 1] }
  ]),
  compute(g) {
    const F = [];
    for (let i = 1; i <= 4; i++) {
      const f = or0(g('F' + i)); if (f === 0) continue;
      const a = or0(g('a' + i)) * DEG;
      F.push({ i, f, fx: f * Math.cos(a), fy: f * Math.sin(a), x: or0(g('x' + i)), y: or0(g('y' + i)) });
    }
    if (!F.length) fail('Mindestens eine Kraft mit Betrag ungleich 0 eingeben.');
    let Rx = 0, Ry = 0, M = 0;
    for (const k of F) { Rx += k.fx; Ry += k.fy; M += k.x * k.fy - k.y * k.fx; }
    const R = Math.hypot(Rx, Ry), aR = Math.atan2(Ry, Rx) / DEG;
    const rows = [
      ['<i>R<sub>x</sub></i>', Rx, 'N'], ['<i>R<sub>y</sub></i>', Ry, 'N'],
      ['Resultierende <i>R</i>', R, 'N', 1], ['Richtung <i>α<sub>R</sub></i>', R > 1e-12 ? aR : '–', '°', 1],
      ['Moment um 0, <i>M</i><sup>(0)</sup>', M, 'N·m'],
      ['Abstand Wirkungslinie <i>h</i>', R > 1e-12 ? abs(M) / R : '–', 'm'],
      ['Schnitt mit x-Achse <i>x<sub>s</sub></i>', abs(Ry) > 1e-12 ? M / Ry : '–', 'm']
    ];
    const notes = [];
    if (R < 1e-9 * Math.max(...F.map(k => abs(k.f)))) notes.push(abs(M) > 1e-9 ? 'Die Kräfte bilden ein reines Kräftepaar: keine Resultierende, nur ein Moment.' : 'Das Kräftesystem ist im Gleichgewicht.');
    // Zeichnung
    const pts = [[0, 0]];
    const ext0 = Math.max(1, ...F.map(k => Math.max(abs(k.x), abs(k.y))));
    const Fm = Math.max(R, ...F.map(k => abs(k.f)));
    const Lr = 0.55 * ext0 / Fm;
    F.forEach(k => { pts.push([k.x, k.y], [k.x + k.fx * Lr, k.y + k.fy * Lr]); });
    let P0 = null;
    if (R > 1e-12) { P0 = [Ry * M / (R * R), -Rx * M / (R * R)]; pts.push(P0, [P0[0] + Rx * Lr, P0[1] + Ry * Lr]); }
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const bb = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const W = 640, H = 340, S = scene(bb, W, H, 40);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Kräfteplan">`;
    s += `<line class="s4" x1="0" x2="${W}" y1="${S.Y(0)}" y2="${S.Y(0)}"/><line class="s4" y1="0" y2="${H}" x1="${S.X(0)}" x2="${S.X(0)}"/>`;
    s += T(W - 8, S.Y(0) - 6, 'x', 'tk', 'end') + T(S.X(0) + 6, 14, 'y', 'tk');
    if (P0) {
      const big = 4 * ext0;
      s += `<line class="s3" x1="${S.X(P0[0] - Rx / R * big)}" y1="${S.Y(P0[1] - Ry / R * big)}" x2="${S.X(P0[0] + Rx / R * big)}" y2="${S.Y(P0[1] + Ry / R * big)}"/>`;
      s += arrow(S.X(P0[0]), S.Y(P0[1]), S.X(P0[0] + Rx * Lr), S.Y(P0[1] + Ry * Lr), 'arm', 'fam', 11);
      s += T(S.X(P0[0] + Rx * Lr) + 6, S.Y(P0[1] + Ry * Lr) - 6, 'R', 'tam');
    }
    for (const k of F) {
      s += arrow(S.X(k.x), S.Y(k.y), S.X(k.x + k.fx * Lr), S.Y(k.y + k.fy * Lr));
      s += `<circle class="pt" cx="${S.X(k.x)}" cy="${S.Y(k.y)}" r="3.5"/>`;
      s += T(S.X(k.x + k.fx * Lr) + 6, S.Y(k.y + k.fy * Lr) + 4, 'F' + '₁₂₃₄'[k.i - 1], 'ta');
    }
    s += '</svg><div class="cap">Kräfte maßstäblich (blau), Resultierende auf ihrer Wirkungslinie (gestrichelt).</div>';
    return { rows, notes, fig: s };
  }
});

calc('balken', {
  fields: [
    { id: 'typ', label: 'Lagerung', val: 'ef', wide: 1, opts: [['ef', 'Einfeldträger (Fest- und Loslager)'], ['ka', 'Kragarm, links eingespannt']] },
    { id: 'L', label: 'Länge <i>l</i>', unit: 'm', val: 6 },
    { id: 'q', label: 'Streckenlast <i>q</i>', unit: 'kN/m', val: 2 },
    { id: 'F1', label: 'Einzellast <i>F</i><sub>1</sub>', unit: 'kN', val: 10 },
    { id: 'a1', label: 'Lage <i>a</i><sub>1</sub>', unit: 'm', val: 2 },
    { id: 'F2', label: 'Einzellast <i>F</i><sub>2</sub>', unit: 'kN', val: 5 },
    { id: 'a2', label: 'Lage <i>a</i><sub>2</sub>', unit: 'm', val: 4.5 }
  ],
  compute(g, s) {
    const L = pos(g('L'), 'die Länge l'), q = or0(g('q'));
    const loads = [[or0(g('F1')), or0(g('a1'))], [or0(g('F2')), or0(g('a2'))]].filter(l => l[0] !== 0);
    for (const [, a] of loads) if (a < 0 || a > L) fail('Die Lage einer Einzellast muss zwischen 0 und l liegen.');
    const ka = s('typ') === 'ka';
    let A, B, MA, Q, M;
    if (!ka) {
      B = (loads.reduce((t, [F, a]) => t + F * a, 0) + q * L * L / 2) / L;
      A = loads.reduce((t, [F]) => t + F, 0) + q * L - B;
      Q = x => A - q * x - loads.reduce((t, [F, a]) => t + (x > a ? F : 0), 0);
      M = x => A * x - q * x * x / 2 - loads.reduce((t, [F, a]) => t + (x > a ? F * (x - a) : 0), 0);
    } else {
      A = loads.reduce((t, [F]) => t + F, 0) + q * L;
      MA = -(loads.reduce((t, [F, a]) => t + F * a, 0) + q * L * L / 2);
      Q = x => loads.reduce((t, [F, a]) => t + (x < a ? F : 0), 0) + q * (L - x);
      M = x => -(loads.reduce((t, [F, a]) => t + (x < a ? F * (a - x) : 0), 0) + q * (L - x) * (L - x) / 2);
    }
    const xs = [];
    const N = 400;
    for (let i = 0; i <= N; i++) xs.push(L * i / N);
    for (const [, a] of loads) xs.push(a - 1e-9 * L, a + 1e-9 * L);
    xs.sort((u, v) => u - v);
    const xsC = xs.filter(x => x >= 0 && x <= L);
    const Qp = xsC.map(x => [x, Q(x)]), Mp = xsC.map(x => [x, M(x)]);
    if (ka) { Qp.unshift([0, 0]); Qp.push([L, 0]); } else { Qp.unshift([0, 0]); Qp.push([L, 0]); }
    let iM = 0; Mp.forEach((p, i) => { if (abs(p[1]) > abs(Mp[iM][1])) iM = i; });
    const Mmax = Mp[iM][1], xM = Mp[iM][0];
    const Qabs = Math.max(...Qp.map(p => abs(p[1])));
    const rows = ka ? [
      ['Vertikalkraft Einspannung <i>F<sub>A</sub></i>', A, 'kN', 1], ['Einspannmoment <i>M<sub>A</sub></i>', MA, 'kN·m', 1],
      ['größte Querkraft |<i>Q</i>|', Qabs, 'kN'], ['größtes Moment |<i>M</i>|<sub>max</sub>', abs(Mmax), 'kN·m'], ['bei <i>x</i>', xM, 'm']
    ] : [
      ['Lagerkraft <i>A</i> (links)', A, 'kN', 1], ['Lagerkraft <i>B</i> (rechts)', B, 'kN', 1],
      ['größte Querkraft |<i>Q</i>|', Qabs, 'kN'], ['größtes Moment <i>M</i><sub>max</sub>', Mmax, 'kN·m', 1], ['bei <i>x</i>', xM, 'm']
    ];
    // Skizze
    const W = 640, ml = 62, mr = 18, X = x => r1(ml + x / L * (W - ml - mr));
    let sk = `<svg viewBox="0 0 ${W} 112" role="img" aria-label="Belastungsskizze">`;
    const yb = 58;
    sk += `<rect class="body" x="${X(0)}" y="${yb}" width="${X(L) - X(0)}" height="9"/>`;
    if (!ka) {
      const tri = (x, roller) => `<polygon class="body" points="${x},${yb + 9} ${x - 10},${yb + 27} ${x + 10},${yb + 27}"/>` +
        (roller ? `<line class="ink" x1="${x - 13}" x2="${x + 13}" y1="${yb + 31}" y2="${yb + 31}"/>` : '') +
        `<line class="ink" x1="${x - 16}" x2="${x + 16}" y1="${yb + (roller ? 35 : 29)}" y2="${yb + (roller ? 35 : 29)}"/>`;
      sk += tri(X(0), false) + tri(X(L), true);
      sk += T(X(0), 108, 'A', 'tk', 'middle') + T(X(L), 108, 'B', 'tk', 'middle');
    } else {
      sk += `<line class="ink" x1="${X(0)}" x2="${X(0)}" y1="${yb - 26}" y2="${yb + 36}" style="stroke-width:3"/>`;
      for (let y = yb - 24; y < yb + 36; y += 8) sk += `<line class="hatch" x1="${X(0)}" y1="${y}" x2="${X(0) - 9}" y2="${y + 9}"/>`;
    }
    if (q) {
      sk += `<line class="arm" x1="${X(0)}" x2="${X(L)}" y1="${yb - 22}" y2="${yb - 22}"/>`;
      for (let i = 0; i <= 16; i++) { const x = X(L * i / 16); sk += q > 0 ? arrow(x, yb - 22, x, yb - 1, 'arm', 'fam', 6) : arrow(x, yb - 1, x, yb - 22, 'arm', 'fam', 6); }
      sk += T(X(L) - 4, yb - 27, `q = ${fmt(q)} kN/m`, 'tam', 'end');
    }
    loads.forEach(([F, a], i) => {
      const x = X(a);
      sk += F > 0 ? arrow(x, 6, x, yb - 1, 'ar', 'fa', 10) : arrow(x, yb - 1, x, 6, 'ar', 'fa', 10);
      sk += T(x + (a > L * 0.8 ? -6 : 6), 16, `F${'₁₂'[i]} = ${fmt(F)} kN`, 'ta', a > L * 0.8 ? 'end' : undefined);
    });
    sk += '</svg>';
    const qr = padRange(Math.min(...Qp.map(p => p[1])), Math.max(...Qp.map(p => p[1])), 0.15);
    const mr2 = padRange(Math.min(...Mp.map(p => p[1])), Math.max(...Mp.map(p => p[1])), 0.18);
    const pQ = plot({ h: 190, x: [0, L], y: qr, yl: 'Q(x) in kN', series: [{ pts: Qp, cls: 's1', area: 0, acls: 'a1' }], title: 'Querkraftverlauf', ny: 4 });
    const pM = plot({ h: 200, x: [0, L], y: mr2, yl: 'M(x) in kN·m', xl: 'x in m', series: [{ pts: Mp, cls: 's2', area: 0, acls: 'a2' }],
      points: [{ x: xM, y: Mmax, cls: 'pt2', label: `${fmt(Mmax)} kN·m`, dy: Mmax >= 0 ? -10 : 18, anchor: xM > L * 0.75 ? 'end' : undefined, dx: xM > L * 0.75 ? -8 : 8 }], title: 'Momentenverlauf', ny: 4 });
    return { rows, fig: sk + pQ + pM };
  }
});

calc('reibung', {
  fields: [
    { h: 'Seilreibung' },
    { id: 'S1', label: 'Seilkraft <i>S</i><sub>1</sub>', unit: 'N', val: 1000 },
    { id: 'mus', label: 'Reibungszahl <i>μ</i>', val: 0.3 },
    { id: 'beta', label: 'Umschlingung <i>β</i>', unit: '°', val: 180 },
    { h: 'Schiefe Ebene' },
    { id: 'G', label: 'Gewichtskraft <i>G</i>', unit: 'N', val: 1000 },
    { id: 'al', label: 'Neigung <i>α</i>', unit: '°', val: 25 },
    { id: 'mu0', label: 'Haftreibungszahl <i>μ</i><sub>0</sub>', val: 0.3 },
    { id: 'mu', label: 'Gleitreibungszahl <i>μ</i>', val: 0.2 }
  ],
  compute(g) {
    const S1 = fin(g('S1'), 'S₁'), mus = nn(g('mus'), 'μ'), b = nn(g('beta'), 'β') * DEG;
    const e = Math.exp(mus * b);
    const G = nn(g('G'), 'G'), al = fin(g('al'), 'α') * DEG, mu0 = nn(g('mu0'), 'μ₀'), mu = nn(g('mu'), 'μ');
    if (al < 0 || al >= PI / 2) fail('Die Neigung muss zwischen 0° und 90° liegen.');
    const haftet = Math.tan(al) <= mu0;
    const Fh = G * (Math.sin(al) + mu * Math.cos(al));
    const Fhalt = G * (Math.sin(al) - mu0 * Math.cos(al));
    const Frunter = G * (mu * Math.cos(al) - Math.sin(al));
    const s = plot({ h: 230, x: [0, 720], y: [1, Math.max(e * 1.1, Math.exp(mus * 4 * PI) > 1e4 ? 1e4 : Math.exp(mus * 4 * PI))], ylog: true, xt: [0, 90, 180, 270, 360, 450, 540, 630, 720], yl: 'S₂/S₁', xl: 'Umschlingungswinkel β in °',
      yt: [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000], yf: v => fmt(v),
      series: [{ pts: Array.from({ length: 73 }, (_, i) => [i * 10, Math.exp(mus * i * 10 * DEG)]), cls: 's1' }],
      points: [{ x: b / DEG, y: e, label: fmt(e, 3) }], title: 'Seilreibung' });
    return {
      chips: [haftet ? ['Körper haftet ohne Zugkraft', 'good'] : ['Körper rutscht ohne Haltekraft', 'bad']],
      rows: [
        { h: 'Seilreibung' },
        ['Verhältnis <i>e</i><sup>μβ</sup>', e, '', 1],
        ['größte Kraft <i>S</i><sub>2</sub> = <i>S</i><sub>1</sub>e<sup>μβ</sup>', S1 * e, 'N', 1],
        ['kleinste Kraft <i>S</i><sub>1</sub>e<sup>−μβ</sup>', S1 / e, 'N'],
        { h: 'Schiefe Ebene' },
        ['Normalkraft <i>N</i>', G * Math.cos(al), 'N'],
        ['Haftgrenzwinkel <i>ρ</i><sub>0</sub>', Math.atan(mu0) / DEG, '°'],
        ['Zugkraft hoch (gleitend)', Fh, 'N', 1],
        ['Haltekraft gegen Abrutschen', Fhalt > 0 ? Fhalt : 0, 'N', 1],
        ['Zugkraft runter (gleitend)', Frunter > 0 ? Frunter : 0, 'N']
      ],
      notes: [Frunter <= 0 ? 'Beim Gleiten beschleunigt der Körper hangabwärts von selbst, sobald er einmal losgebrochen ist.' : ''],
      fig: s
    };
  }
});

/* ================= FESTIGKEITSLEHRE ================= */
calc('zugstab', {
  fields: [
    { id: 'qs', label: 'Querschnitt', val: 'kreis', opts: [['kreis', 'Vollkreis, Durchmesser d'], ['flaeche', 'Fläche A direkt']] },
    { id: 'd', label: 'Durchmesser <i>d</i>', unit: 'mm', val: 20, when: s => s('qs') === 'kreis' },
    { id: 'A', label: 'Fläche <i>A</i>', unit: 'mm²', val: 314, when: s => s('qs') === 'flaeche' },
    { id: 'F', label: 'Längskraft <i>F</i> (Zug +)', unit: 'N', val: 50000 },
    { id: 'l', label: 'Länge <i>l</i>', unit: 'mm', val: 1000 },
    { id: 'E', label: 'E-Modul <i>E</i>', unit: 'N/mm²', val: 210000 },
    { id: 'at', label: 'Wärmeausdehnung <i>α<sub>T</sub></i>', unit: '10⁻⁶/K', val: 12 },
    { id: 'dT', label: 'Temperaturänderung Δ<i>T</i>', unit: 'K', val: 40 },
    { id: 'Re', label: 'Streckgrenze <i>R<sub>e</sub></i>', unit: 'N/mm²', val: 235 }
  ],
  compute(g, s) {
    const A = s('qs') === 'kreis' ? PI / 4 * pos(g('d'), 'd') ** 2 : pos(g('A'), 'A');
    const F = fin(g('F'), 'F'), l = pos(g('l'), 'l'), E = pos(g('E'), 'E'), at = or0(g('at')) * 1e-6, dT = or0(g('dT'));
    const sig = F / A, eps = sig / E, dlm = eps * l, dlt = at * dT * l, sth = -E * at * dT;
    const Re = g('Re');
    const S = isFinite(Re) && sig !== 0 ? Re / abs(sig) : NaN;
    return {
      chips: isFinite(S) ? [[`S<sub>F</sub> = ${fmt(S, 3)}`, S >= 1.5 ? 'good' : S >= 1 ? 'warn' : 'bad']] : [],
      rows: [
        ['Fläche <i>A</i>', A, 'mm²'], ['Spannung <i>σ</i>', sig, 'N/mm²', 1], ['Dehnung <i>ε</i> (elastisch)', eps * 100, '%'],
        ['Δ<i>l</i> aus Kraft', dlm, 'mm'], ['Δ<i>l</i> aus Temperatur', dlt, 'mm'], ['Δ<i>l</i> gesamt', dlm + dlt, 'mm', 1],
        ['Steifigkeit <i>EA</i>/<i>l</i>', E * A / l, 'N/mm'], ['σ bei behinderter Wärmedehnung', sth, 'N/mm²', 1],
        ['Sicherheit gegen Fließen <i>S<sub>F</sub></i>', S, '']
      ],
      notes: [abs(sth) > or0(Re) && isFinite(Re) ? 'Bei vollständig behinderter Wärmedehnung würde der Stab plastisch verformt.' : '']
    };
  }
});

calc('querschnitt', {
  fields: [
    { id: 'p', label: 'Profil', val: 'i', wide: 1, opts: [['rechteck', 'Rechteck'], ['kreis', 'Vollkreis'], ['ring', 'Kreisring (Rohr)'], ['hohl', 'Rechteckrohr'], ['i', 'I-Profil (doppelt symmetrisch)'], ['t', 'T-Profil']] },
    { id: 'b', label: 'Breite <i>b</i>', unit: 'mm', val: 100, when: s => 'rechteck hohl i t'.includes(s('p')) },
    { id: 'h', label: 'Höhe <i>h</i>', unit: 'mm', val: 200, when: s => 'rechteck hohl i t'.includes(s('p')) },
    { id: 'D', label: 'Außendurchmesser <i>D</i>', unit: 'mm', val: 60, when: s => s('p') === 'kreis' || s('p') === 'ring' },
    { id: 'd', label: 'Innendurchmesser <i>d</i>', unit: 'mm', val: 50, when: s => s('p') === 'ring' },
    { id: 't', label: 'Wanddicke <i>t</i>', unit: 'mm', val: 5, when: s => s('p') === 'hohl' },
    { id: 'tf', label: 'Gurtdicke <i>t<sub>f</sub></i>', unit: 'mm', val: 8.5, when: s => s('p') === 'i' || s('p') === 't' },
    { id: 'tw', label: 'Stegdicke <i>t<sub>w</sub></i>', unit: 'mm', val: 5.6, when: s => s('p') === 'i' || s('p') === 't' }
  ],
  compute(g, s) {
    const p = s('p');
    let A, eo, eu, Iy, Iz, bz, Ip, Wp, It, shape;
    if (p === 'rechteck') {
      const b = pos(g('b'), 'b'), h = pos(g('h'), 'h');
      A = b * h; eo = eu = h / 2; Iy = b * h ** 3 / 12; Iz = h * b ** 3 / 12; bz = b / 2;
      const lo = Math.min(b, h), hi = Math.max(b, h), r = lo / hi;
      It = hi * lo ** 3 / 3 * (1 - 0.63 * r + 0.052 * r ** 5);
      shape = { poly: [[[-b / 2, 0], [b / 2, 0], [b / 2, h], [-b / 2, h]]], w: b, h, zs: h / 2 };
    } else if (p === 'kreis' || p === 'ring') {
      const D = pos(g('D'), 'D'), d = p === 'ring' ? nn(g('d'), 'd') : 0;
      if (d >= D) fail('Der Innendurchmesser muss kleiner als der Außendurchmesser sein.');
      A = PI / 4 * (D * D - d * d); Iy = Iz = PI / 64 * (D ** 4 - d ** 4); eo = eu = bz = D / 2;
      Ip = 2 * Iy; Wp = Ip / (D / 2); It = Ip;
      shape = { circ: [D, d], w: D, h: D, zs: D / 2 };
    } else if (p === 'hohl') {
      const b = pos(g('b'), 'b'), h = pos(g('h'), 'h'), t = pos(g('t'), 't');
      if (2 * t >= Math.min(b, h)) fail('Die Wanddicke ist zu groß für diese Außenmaße.');
      const bi = b - 2 * t, hi = h - 2 * t;
      A = b * h - bi * hi; eo = eu = h / 2; bz = b / 2;
      Iy = (b * h ** 3 - bi * hi ** 3) / 12; Iz = (h * b ** 3 - hi * bi ** 3) / 12;
      const Am = (b - t) * (h - t), Um = 2 * ((b - t) + (h - t));
      It = 4 * Am * Am * t / Um; Wp = 2 * Am * t;
      shape = { poly: [[[-b / 2, 0], [b / 2, 0], [b / 2, h], [-b / 2, h]], [[-bi / 2, t], [-bi / 2, t + hi], [bi / 2, t + hi], [bi / 2, t]]], w: b, h, zs: h / 2 };
    } else if (p === 'i') {
      const b = pos(g('b'), 'b'), h = pos(g('h'), 'h'), tf = pos(g('tf'), 'tf'), tw = pos(g('tw'), 'tw');
      if (2 * tf >= h || tw >= b) fail('Gurt- oder Stegdicke passen nicht zu Breite und Höhe.');
      const hw = h - 2 * tf;
      A = 2 * b * tf + hw * tw; eo = eu = h / 2; bz = b / 2;
      Iy = (b * h ** 3 - (b - tw) * hw ** 3) / 12; Iz = 2 * tf * b ** 3 / 12 + hw * tw ** 3 / 12;
      It = (2 * b * tf ** 3 + hw * tw ** 3) / 3;
      shape = { poly: [[[-b / 2, 0], [b / 2, 0], [b / 2, tf], [tw / 2, tf], [tw / 2, h - tf], [b / 2, h - tf], [b / 2, h], [-b / 2, h], [-b / 2, h - tf], [-tw / 2, h - tf], [-tw / 2, tf], [-b / 2, tf]]], w: b, h, zs: h / 2 };
    } else {
      const b = pos(g('b'), 'b'), h = pos(g('h'), 'h'), tf = pos(g('tf'), 'tf'), tw = pos(g('tw'), 'tw');
      if (tf >= h || tw >= b) fail('Gurt- oder Stegdicke passen nicht zu Breite und Höhe.');
      const hw = h - tf, Af = b * tf, Aw = hw * tw;
      A = Af + Aw;
      const zs = (Aw * hw / 2 + Af * (h - tf / 2)) / A;
      eu = zs; eo = h - zs; bz = b / 2;
      Iy = b * tf ** 3 / 12 + Af * (h - tf / 2 - zs) ** 2 + tw * hw ** 3 / 12 + Aw * (hw / 2 - zs) ** 2;
      Iz = tf * b ** 3 / 12 + hw * tw ** 3 / 12;
      It = (b * tf ** 3 + hw * tw ** 3) / 3;
      shape = { poly: [[[-tw / 2, 0], [tw / 2, 0], [tw / 2, hw], [b / 2, hw], [b / 2, h], [-b / 2, h], [-b / 2, hw], [-tw / 2, hw]]], w: b, h, zs };
    }
    const Wy = Iy / Math.max(eo, eu);
    const rows = [
      ['Fläche <i>A</i>', A, 'mm²', 1],
      ['Randabstand oben <i>e<sub>o</sub></i>', eo, 'mm'], ['Randabstand unten <i>e<sub>u</sub></i>', eu, 'mm'],
      ['<i>I<sub>y</sub></i>', Iy, 'mm⁴', 1], ['<i>I<sub>y</sub></i>', Iy / 1e4, 'cm⁴'],
      ['<i>W<sub>y</sub></i> (kleinstes)', Wy, 'mm³', 1], ['<i>W<sub>y</sub></i>', Wy / 1e3, 'cm³'],
      ['<i>I<sub>z</sub></i>', Iz, 'mm⁴'], ['<i>W<sub>z</sub></i>', Iz / bz, 'mm³'],
      ['<i>i<sub>y</sub></i>', sqrt(Iy / A), 'mm'], ['<i>i<sub>z</sub></i>', sqrt(Iz / A), 'mm']
    ];
    if (p === 't') rows.splice(7, 0, ['<i>W<sub>y</sub></i> oben / unten', `${fmt(Iy / eo)} / ${fmt(Iy / eu)}`, 'mm³']);
    if (Ip) rows.push(['polar <i>I<sub>p</sub></i>', Ip, 'mm⁴'], ['polar <i>W<sub>p</sub></i>', Wp, 'mm³']);
    else if (p === 'hohl') rows.push(['Torsion <i>I<sub>t</sub></i> (Bredt)', It, 'mm⁴'], ['Torsion <i>W<sub>t</sub></i>', Wp, 'mm³']);
    else rows.push(['Torsion <i>I<sub>t</sub></i> ≈', It, 'mm⁴']);
    // Zeichnung
    const W = 640, H = 270, bb = [-shape.w / 2, shape.w / 2, 0, shape.h];
    const S = scene(bb, W, H, 30);
    let sv = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Querschnitt">`;
    if (shape.poly) {
      const d = shape.poly.map(pl => 'M' + pl.map(q => S.X(q[0]) + ' ' + S.Y(q[1])).join('L') + 'Z').join('');
      sv += `<path class="body" fill-rule="evenodd" d="${d}"/>`;
    } else {
      const cx = S.X(0), cy = S.Y(shape.h / 2), R = shape.circ[0] / 2 * S.k, r = shape.circ[1] / 2 * S.k;
      sv += r > 0 ? `<path class="body" fill-rule="evenodd" d="M${cx - R} ${cy}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0ZM${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z"/>` : `<circle class="body" cx="${cx}" cy="${cy}" r="${R}"/>`;
    }
    const ys = S.Y(shape.zs), xs = S.X(0);
    sv += `<line class="s3" x1="${S.X(bb[0]) - 24}" x2="${S.X(bb[1]) + 24}" y1="${ys}" y2="${ys}"/><line class="s3" x1="${xs}" x2="${xs}" y1="${S.Y(bb[3]) - 16}" y2="${S.Y(0) + 16}"/>`;
    sv += arrow(S.X(bb[1]) + 10, ys, S.X(bb[1]) + 40, ys, 'ar', 'fa', 8) + T(S.X(bb[1]) + 44, ys + 4, 'y', 'ta');
    sv += arrow(xs, S.Y(0) + 4, xs, Math.min(H - 4, S.Y(0) + 22), 'ar', 'fa', 8) + T(xs + 8, Math.min(H - 6, S.Y(0) + 20), 'z', 'ta');
    sv += `<circle class="pt2" cx="${xs}" cy="${ys}" r="5"/>` + T(xs - 10, ys - 8, 'S', 'tam', 'end');
    sv += '</svg><div class="cap">Schwerpunkt S und Hauptachsen; z zeigt nach unten (Biegeachse y).</div>';
    return { rows, fig: sv };
  }
});

calc('biegelinie', {
  fields: [
    { id: 'fall', label: 'Lastfall', val: '4', wide: 1, opts: [['1', 'Kragarm, Einzellast am Ende'], ['2', 'Kragarm, Streckenlast'], ['3', 'Einfeldträger, Einzellast mittig'], ['4', 'Einfeldträger, Streckenlast'], ['5', 'Einfeldträger, Einzellast bei a'], ['6', 'beidseitig eingespannt, Streckenlast']] },
    { id: 'l', label: 'Länge <i>l</i>', unit: 'mm', val: 3000 },
    { id: 'F', label: 'Einzellast <i>F</i>', unit: 'N', val: 5000, when: s => '135'.includes(s('fall')) },
    { id: 'q', label: 'Streckenlast <i>q</i>', unit: 'N/mm', val: 5, when: s => '246'.includes(s('fall')) },
    { id: 'a', label: 'Lastabstand <i>a</i> vom linken Lager', unit: 'mm', val: 1000, when: s => s('fall') === '5' },
    { id: 'E', label: 'E-Modul <i>E</i>', unit: 'N/mm²', val: 210000 },
    { id: 'I', label: 'Flächenträgheitsmoment <i>I</i>', unit: 'mm⁴', val: '1,943e7', hint: 'IPE 200: 1,943·10⁷ mm⁴' },
    { id: 'W', label: 'Widerstandsmoment <i>W</i>', unit: 'mm³', val: '1,94e5', hint: 'optional, für σ<sub>b</sub>' }
  ],
  compute(g, s) {
    const c = s('fall'), l = pos(g('l'), 'l'), E = pos(g('E'), 'E'), I = pos(g('I'), 'I'), EI = E * I, W = g('W');
    let F = 0, q = 0, a = 0;
    if ('135'.includes(c)) F = fin(g('F'), 'F'); else q = fin(g('q'), 'q');
    let w, f, xf, phi, Mmax, phiL = 'Neigung';
    if (c === '1') { w = x => F / (6 * EI) * (3 * l * x * x - x ** 3); f = F * l ** 3 / (3 * EI); xf = l; phi = F * l * l / (2 * EI); Mmax = F * l; phiL = 'Neigung am Ende'; }
    if (c === '2') { w = x => q / (24 * EI) * (x ** 4 - 4 * l * x ** 3 + 6 * l * l * x * x); f = q * l ** 4 / (8 * EI); xf = l; phi = q * l ** 3 / (6 * EI); Mmax = q * l * l / 2; phiL = 'Neigung am Ende'; }
    if (c === '3') { w = x => { const u = Math.min(x, l - x); return F * u / (48 * EI) * (3 * l * l - 4 * u * u); }; f = F * l ** 3 / (48 * EI); xf = l / 2; phi = F * l * l / (16 * EI); Mmax = F * l / 4; phiL = 'Neigung am Lager'; }
    if (c === '4') { w = x => q * x / (24 * EI) * (l ** 3 - 2 * l * x * x + x ** 3); f = 5 * q * l ** 4 / (384 * EI); xf = l / 2; phi = q * l ** 3 / (24 * EI); Mmax = q * l * l / 8; phiL = 'Neigung am Lager'; }
    if (c === '5') {
      a = fin(g('a'), 'a'); if (a <= 0 || a >= l) fail('Der Lastabstand a muss zwischen 0 und l liegen.');
      const b = l - a;
      w = x => x <= a ? F * b * x / (6 * EI * l) * (l * l - b * b - x * x) : F * a * (l - x) / (6 * EI * l) * (l * l - a * a - (l - x) ** 2);
      const bs = Math.min(a, b);
      f = F * bs * (l * l - bs * bs) ** 1.5 / (9 * sqrt(3) * EI * l);
      const xm = sqrt((l * l - bs * bs) / 3); xf = a >= b ? xm : l - xm;
      phi = F * a * b * (l + b) / (6 * EI * l); Mmax = F * a * b / l; phiL = 'Neigung am linken Lager';
    }
    if (c === '6') { w = x => q * x * x * (l - x) ** 2 / (24 * EI); f = q * l ** 4 / (384 * EI); xf = l / 2; phi = 0; Mmax = q * l * l / 12; phiL = 'Neigung an der Einspannung'; }
    const rows = [
      ['größte Durchbiegung <i>f</i>', f, 'mm', 1], ['an der Stelle <i>x</i>', xf, 'mm'],
      ['Verhältnis <i>l</i>/<i>f</i>', abs(f) > 0 ? abs(l / f) : '–', ''],
      [phiL, phi, 'rad'], [phiL + ' (Grad)', phi / DEG, '°'],
      ['größtes Biegemoment |<i>M</i>|', abs(Mmax), 'N·mm'], ['', abs(Mmax) / 1e6, 'kN·m'],
      ['Biegesteifigkeit <i>EI</i>', EI, 'N·mm²']
    ];
    if (isFinite(W) && W > 0) rows.push(['Biegespannung <i>σ</i><sub>b,max</sub>', abs(Mmax) / W, 'N/mm²', 1]);
    const pts = Array.from({ length: 201 }, (_, i) => { const x = l * i / 200; return [x, w(x)]; });
    const fm = Math.max(...pts.map(p => abs(p[1])));
    const fig = plot({ h: 220, x: [0, l], y: [Math.min(0, ...pts.map(p => p[1])) - fm * 0.05, fm * 1.25 || 1], yrev: true, yl: 'w(x) in mm', xl: 'x in mm', ny: 4,
      series: [{ pts: [[0, 0], [l, 0]], cls: 's4' }, { pts, cls: 's1', area: 0, acls: 'a1' }], points: [{ x: xf, y: w(xf), label: `f = ${fmt(f, 3)} mm`, dy: 20, anchor: xf > l * 0.7 ? 'end' : 'middle', dx: 0 }], title: 'Biegelinie' });
    return { rows, fig };
  }
});

calc('torsion', {
  fields: [
    { id: 'typ', label: 'Querschnitt', val: 'hohl', opts: [['voll', 'Vollwelle'], ['hohl', 'Hohlwelle']] },
    { id: 'D', label: 'Außendurchmesser <i>D</i>', unit: 'mm', val: 40 },
    { id: 'd', label: 'Innendurchmesser <i>d</i>', unit: 'mm', val: 24, when: s => s('typ') === 'hohl' },
    { id: 'm', label: 'Belastung', val: 'T', opts: [['T', 'Drehmoment T'], ['P', 'Leistung und Drehzahl']] },
    { id: 'T', label: 'Drehmoment <i>T</i>', unit: 'N·m', val: 400, when: s => s('m') === 'T' },
    { id: 'P', label: 'Leistung <i>P</i>', unit: 'kW', val: 30, when: s => s('m') === 'P' },
    { id: 'n', label: 'Drehzahl <i>n</i>', unit: 'min⁻¹', val: 1450, when: s => s('m') === 'P' },
    { id: 'l', label: 'Länge <i>l</i>', unit: 'mm', val: 800 },
    { id: 'G', label: 'Schubmodul <i>G</i>', unit: 'N/mm²', val: 81000 },
    { id: 'tz', label: 'zulässig <i>τ</i><sub>zul</sub>', unit: 'N/mm²', val: 60, hint: 'optional' }
  ],
  compute(g, s) {
    const D = pos(g('D'), 'D'), d = s('typ') === 'hohl' ? nn(g('d'), 'd') : 0;
    if (d >= D) fail('Der Innendurchmesser muss kleiner als der Außendurchmesser sein.');
    let Tm = s('m') === 'T' ? fin(g('T'), 'T') : pos(g('P'), 'P') * 1000 / (2 * PI * pos(g('n'), 'n') / 60);
    const l = pos(g('l'), 'l'), G = pos(g('G'), 'G'), tz = g('tz');
    const Ip = PI / 32 * (D ** 4 - d ** 4), Wp = Ip / (D / 2), Tn = Tm * 1000;
    const tau = Tn / Wp, phi = Tn * l / (G * Ip);
    const util = isFinite(tz) && tz > 0 ? abs(tau) / tz : NaN;
    const rows = [
      s('m') === 'P' ? ['Drehmoment <i>T</i>', Tm, 'N·m', 1] : null,
      ['<i>I<sub>p</sub></i>', Ip, 'mm⁴'], ['<i>W<sub>p</sub></i>', Wp, 'mm³'],
      ['<i>τ</i><sub>max</sub> (außen)', tau, 'N/mm²', 1], d > 0 ? ['<i>τ</i> innen', tau * d / D, 'N/mm²'] : null,
      ['Verdrehwinkel <i>φ</i>', phi / DEG, '°', 1], ['bezogen auf 1 m', phi / DEG / l * 1000, '°/m'],
      ['Torsionssteifigkeit <i>c<sub>t</sub></i>', G * Ip / l / 1000, 'N·m/rad'],
      d > 0 ? ['Masse im Vergleich zur Vollwelle', (1 - (d / D) ** 2) * 100, '%'] : null,
      d > 0 ? ['<i>W<sub>p</sub></i> im Vergleich zur Vollwelle', (1 - (d / D) ** 4) * 100, '%'] : null
    ];
    const R = D / 2, ri = d / 2;
    const pts = [[-R, -tau], [-ri, -tau * ri / R]], pts2 = [[ri, tau * ri / R], [R, tau]];
    const fig = plot({ h: 210, x: [-R * 1.15, R * 1.15], y: padRange(-abs(tau), abs(tau), 0.15), xl: 'r in mm', yl: 'τ in N/mm²', ny: 4,
      under: (sx, sy, m, pw, ph) => `<rect class="a2" x="${r1(sx(-R))}" y="${m.t}" width="${r1(sx(-ri) - sx(-R))}" height="${ph}"/><rect class="a2" x="${r1(sx(ri))}" y="${m.t}" width="${r1(sx(R) - sx(ri))}" height="${ph}"/>`,
      series: [{ pts: [[-R, 0], ...pts, [-ri, 0]], fill: 'a1', cls: 's1' }, { pts: [[ri, 0], ...pts2, [R, 0]], fill: 'a1', cls: 's1' }], title: 'Schubspannungsverteilung' });
    return { chips: isFinite(util) ? [[`Ausnutzung ${fmt(util * 100, 3)} %`, util <= 1 ? 'good' : 'bad']] : [], rows, fig: fig + '<div class="cap">Linearer Verlauf über dem Radius; schattiert ist der Werkstoff.</div>' };
  }
});

calc('mohr', {
  fields: [
    { id: 'sx', label: '<i>σ<sub>x</sub></i>', unit: 'N/mm²', val: 120 },
    { id: 'sy', label: '<i>σ<sub>y</sub></i>', unit: 'N/mm²', val: -40 },
    { id: 'txy', label: '<i>τ<sub>xy</sub></i>', unit: 'N/mm²', val: 60 },
    { id: 'Re', label: 'Streckgrenze <i>R<sub>e</sub></i>', unit: 'N/mm²', val: 355, hint: 'optional, für die Sicherheit' }
  ],
  compute(g) {
    const sx = fin(g('sx'), 'σx'), sy = fin(g('sy'), 'σy'), t = fin(g('txy'), 'τxy'), Re = g('Re');
    const sm = (sx + sy) / 2, R = Math.hypot((sx - sy) / 2, t);
    const s1 = sm + R, s2 = sm - R;
    const phi = 0.5 * Math.atan2(2 * t, sx - sy) / DEG;
    const gEH = sqrt(sx * sx + sy * sy - sx * sy + 3 * t * t);
    const sH = Math.max(abs(s1 - s2), abs(s1), abs(s2));
    const tabs = sH / 2;
    const S = isFinite(Re) && gEH > 0 ? Re / gEH : NaN;
    const rows = [
      ['Mittelpunkt <i>σ<sub>m</sub></i>', sm, 'N/mm²'], ['Radius = <i>τ</i><sub>max</sub> in der Ebene', R, 'N/mm²'],
      ['Hauptspannung <i>σ</i><sub>1</sub>', s1, 'N/mm²', 1], ['Hauptspannung <i>σ</i><sub>2</sub>', s2, 'N/mm²', 1],
      ['Hauptrichtung <i>φ</i>* (x → σ₁)', phi, '°'], ['absolut größte Schubspannung', tabs, 'N/mm²'],
      ['<i>σ<sub>v</sub></i> GEH (von Mises)', gEH, 'N/mm²', 1], ['<i>σ<sub>v</sub></i> SH (Tresca)', sH, 'N/mm²'],
      ['<i>σ<sub>v</sub></i> NH (Rankine)', Math.max(s1, 0), 'N/mm²'], ['Sicherheit <i>R<sub>e</sub></i>/<i>σ<sub>v,GEH</sub></i>', S, '']
    ];
    // Mohrscher Kreis
    const Rr = R || Math.max(abs(sx), 1) * 0.05;
    const bb = [Math.min(s2, 0, sm - Rr), Math.max(s1, 0, sm + Rr), -Rr, Rr];
    const W = 640, H = 330, Sc = scene(bb, W, H, 44);
    let v = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Mohrscher Kreis">`;
    v += `<line class="ax" x1="10" x2="${W - 10}" y1="${Sc.Y(0)}" y2="${Sc.Y(0)}"/>` + T(W - 12, Sc.Y(0) - 6, 'σ', 'lb', 'end');
    v += `<line class="ax" x1="${Sc.X(0)}" x2="${Sc.X(0)}" y1="8" y2="${H - 8}"/>` + T(Sc.X(0) + 6, 18, 'τ', 'lb');
    v += `<circle class="s1" cx="${Sc.X(sm)}" cy="${Sc.Y(0)}" r="${r1(R * Sc.k)}" style="fill:var(--accent);fill-opacity:.08"/>`;
    v += `<line class="s3" x1="${Sc.X(sx)}" y1="${Sc.Y(t)}" x2="${Sc.X(sy)}" y2="${Sc.Y(-t)}"/>`;
    if (R > 0) {
      const a0 = Math.atan2(t, sx - sm), rr = Math.min(R * Sc.k * 0.35, 46);
      const cx = Sc.X(sm), cy = Sc.Y(0);
      const ex = cx + rr * Math.cos(a0), ey = cy - rr * Math.sin(a0);
      v += `<path class="arm" d="M${r1(ex)} ${r1(ey)}A${r1(rr)} ${r1(rr)} 0 0 ${a0 > 0 ? 1 : 0} ${r1(cx + rr)} ${r1(cy)}"/>`;
      v += T(cx + rr + 6, cy + (a0 > 0 ? -rr * 0.35 : rr * 0.35 + 8), `2φ* = ${fmt(2 * phi, 3)}°`, 'tam');
    }
    v += `<circle class="pt" cx="${Sc.X(sx)}" cy="${Sc.Y(t)}" r="5"/>` + T(Sc.X(sx) + 8, Sc.Y(t) - 8, 'X', 'ta');
    v += `<circle class="pt" cx="${Sc.X(sy)}" cy="${Sc.Y(-t)}" r="5"/>` + T(Sc.X(sy) + 8, Sc.Y(-t) + 16, 'Y', 'ta');
    v += `<circle class="pt2" cx="${Sc.X(s1)}" cy="${Sc.Y(0)}" r="5"/>` + T(Sc.X(s1) + 6, Sc.Y(0) + 18, 'σ₁ = ' + fmt(s1, 3), 'tam');
    v += `<circle class="pt2" cx="${Sc.X(s2)}" cy="${Sc.Y(0)}" r="5"/>` + T(Sc.X(s2) - 6, Sc.Y(0) + 18, 'σ₂ = ' + fmt(s2, 3), 'tam', 'end');
    v += `<circle class="inkf" cx="${Sc.X(sm)}" cy="${Sc.Y(0)}" r="2.5"/>`;
    v += '</svg><div class="cap">τ nach oben positiv. X = (σ<sub>x</sub>, τ<sub>xy</sub>), Y = (σ<sub>y</sub>, −τ<sub>xy</sub>).</div>';
    return { chips: isFinite(S) ? [[`S = ${fmt(S, 3)} gegen Fließen`, S >= 1.5 ? 'good' : S >= 1 ? 'warn' : 'bad']] : [], rows, fig: v };
  }
});

const TETMAJER = {
  s235: { n: 'S235 (St 37)', E: 210000, lp: 104, f: l => 310 - 1.14 * l },
  s355: { n: 'S355 (St 52)', E: 210000, lp: 89, f: l => 335 - 0.62 * l },
  gjl: { n: 'Grauguss', E: 100000, lp: 80, f: l => 776 - 12 * l + 0.053 * l * l },
  holz: { n: 'Nadelholz', E: 10000, lp: 100, f: l => 29.3 - 0.194 * l }
};
calc('knickung', {
  fields: [
    { id: 'fall', label: 'Euler-Fall', val: '2', wide: 1, opts: [['1', '1: eingespannt – frei (β = 2)'], ['2', '2: gelenkig – gelenkig (β = 1)'], ['3', '3: eingespannt – gelenkig (β = 0,699)'], ['4', '4: eingespannt – eingespannt (β = 0,5)']] },
    { id: 'l', label: 'Stablänge <i>l</i>', unit: 'mm', val: 1500 },
    { id: 'F', label: 'Druckkraft <i>F</i>', unit: 'N', val: 40000 },
    { id: 'w', label: 'Werkstoff', val: 's235', opts: [['s235', 'S235 (St 37)'], ['s355', 'S355 (St 52)'], ['gjl', 'Grauguss'], ['holz', 'Nadelholz'], ['frei', 'eigene Werte (nur Euler)']] },
    { id: 'E', label: 'E-Modul <i>E</i>', unit: 'N/mm²', val: 70000, when: s => s('w') === 'frei' },
    { id: 'sp', label: 'Proportionalitätsgrenze <i>σ<sub>P</sub></i>', unit: 'N/mm²', val: 200, when: s => s('w') === 'frei' },
    { id: 'qs', label: 'Querschnitt', val: 'rohr', opts: [['kreis', 'Vollkreis'], ['rohr', 'Rohr'], ['frei', 'I und A eingeben']] },
    { id: 'D', label: 'Außendurchmesser <i>D</i>', unit: 'mm', val: 48.3, when: s => s('qs') !== 'frei' },
    { id: 'd', label: 'Innendurchmesser <i>d</i>', unit: 'mm', val: 40.3, when: s => s('qs') === 'rohr' },
    { id: 'I', label: '<i>I</i><sub>min</sub>', unit: 'mm⁴', val: '1,6e5', when: s => s('qs') === 'frei' },
    { id: 'A', label: 'Fläche <i>A</i>', unit: 'mm²', val: 1000, when: s => s('qs') === 'frei' }
  ],
  compute(g, s) {
    const beta = { 1: 2, 2: 1, 3: 0.699, 4: 0.5 }[s('fall')];
    const l = pos(g('l'), 'l'), F = g('F');
    let I, A;
    if (s('qs') === 'frei') { I = pos(g('I'), 'I'); A = pos(g('A'), 'A'); }
    else {
      const D = pos(g('D'), 'D'), d = s('qs') === 'rohr' ? nn(g('d'), 'd') : 0;
      if (d >= D) fail('Der Innendurchmesser muss kleiner als der Außendurchmesser sein.');
      I = PI / 64 * (D ** 4 - d ** 4); A = PI / 4 * (D * D - d * d);
    }
    const w = s('w'), mat = TETMAJER[w];
    const E = mat ? mat.E : pos(g('E'), 'E');
    const lp = mat ? mat.lp : PI * sqrt(E / pos(g('sp'), 'σP'));
    const lk = beta * l, i = sqrt(I / A), lam = lk / i;
    const euler = lam >= lp;
    let sk = PI * PI * E / (lam * lam);
    if (!euler && mat) sk = mat.f(lam);
    const Fk = sk * A, S = isFinite(F) && F > 0 ? Fk / F : NaN;
    const chips = [[euler ? 'elastisches Knicken (Euler)' : mat ? 'unelastisches Knicken (Tetmajer)' : 'Euler hier ungültig', euler ? '' : mat ? 'warn' : 'bad']];
    if (isFinite(S)) chips.push([`S<sub>K</sub> = ${fmt(S, 3)}`, S >= (euler ? 3 : 2) ? 'good' : S >= 1 ? 'warn' : 'bad']);
    const rows = [
      ['Knicklänge <i>l<sub>k</sub></i>', lk, 'mm'], ['Trägheitsradius <i>i</i>', i, 'mm'],
      ['Schlankheitsgrad <i>λ</i>', lam, '', 1], ['Grenzschlankheit <i>λ<sub>P</sub></i>', lp, ''],
      ['Knickspannung <i>σ<sub>K</sub></i>', sk, 'N/mm²'], ['Knickkraft <i>F<sub>K</sub></i>', Fk / 1000, 'kN', 1],
      ['vorhandene Spannung <i>σ<sub>d</sub></i>', isFinite(F) ? F / A : '–', 'N/mm²'], ['Sicherheit <i>S<sub>K</sub></i>', S, '', 1]
    ];
    const notes = [];
    if (lam < 20) notes.push('Sehr gedrungener Stab: maßgebend ist eher die Druckfestigkeit bzw. Quetschgrenze als das Knicken.');
    if (!mat && !euler) notes.push('Für λ unter λ<sub>P</sub> überschätzt Euler die Knickkraft. Für diesen Werkstoff sind Tetmajer- oder Eurocode-Werte nötig.');
    const lmax = Math.max(200, lam * 1.2);
    const ymax = mat ? Math.max(mat.f(0), sk) * 1.1 : Math.max(sk, PI * PI * E / lp / lp) * 1.6;
    const eul = []; for (let x = 5; x <= lmax; x += lmax / 200) eul.push([x, PI * PI * E / (x * x)]);
    const series = [{ pts: eul.filter(p => p[0] < lp), cls: 's3' }, { pts: eul.filter(p => p[0] >= lp), cls: 's1', label: 'Euler', anchor: 'end', ldx: -4, ldy: -8 }];
    if (mat) series.push({ pts: Array.from({ length: 41 }, (_, k) => [lp * k / 40, mat.f(lp * k / 40)]), cls: 's2', label: 'Tetmajer', labelAt: 'start', ldx: 6, ldy: 16, lcls: 'tam' });
    const fig = plot({ h: 260, x: [0, lmax], y: [0, ymax], xl: 'Schlankheitsgrad λ', yl: 'σK in N/mm²', series,
      extra: (sx, sy, m, pw, ph) => `<line class="s4" x1="${r1(sx(lp))}" x2="${r1(sx(lp))}" y1="${m.t}" y2="${m.t + ph}"/>` + T(sx(lp) + 4, m.t + 14, 'λ<tspan dy="3" font-size="9">P</tspan>', 'tk'),
      points: [{ x: lam, y: sk, label: `λ = ${fmt(lam, 3)}` }], title: 'Knickspannungslinie' });
    return { chips, rows, notes, fig };
  }
});

calc('dauerfest', {
  fields: [
    { id: 'm', label: 'Eingabe der Belastung', val: 'ma', wide: 1, opts: [['ma', 'Mittel- und Ausschlagspannung'], ['ou', 'Ober- und Unterspannung']] },
    { id: 'sm', label: 'Mittelspannung <i>σ<sub>m</sub></i>', unit: 'N/mm²', val: 150, when: s => s('m') === 'ma' },
    { id: 'sa', label: 'Ausschlagspannung <i>σ<sub>a</sub></i>', unit: 'N/mm²', val: 110, when: s => s('m') === 'ma' },
    { id: 'so', label: 'Oberspannung <i>σ<sub>o</sub></i>', unit: 'N/mm²', val: 260, when: s => s('m') === 'ou' },
    { id: 'su', label: 'Unterspannung <i>σ<sub>u</sub></i>', unit: 'N/mm²', val: 40, when: s => s('m') === 'ou' },
    { id: 'sW', label: 'Bauteilwechselfestigkeit <i>σ<sub>WK</sub></i>', unit: 'N/mm²', val: 240 },
    { id: 'Rm', label: 'Zugfestigkeit <i>R<sub>m</sub></i>', unit: 'N/mm²', val: 700 },
    { id: 'Re', label: 'Streckgrenze <i>R<sub>e</sub></i>', unit: 'N/mm²', val: 490 },
    { id: 'Smin', label: 'erforderliche Sicherheit', unit: '', val: 1.5 }
  ],
  compute(g, s) {
    let sm, sa;
    if (s('m') === 'ma') { sm = fin(g('sm'), 'σm'); sa = nn(g('sa'), 'σa'); }
    else { const so = fin(g('so'), 'σo'), su = fin(g('su'), 'σu'); if (su > so) fail('Die Unterspannung muss kleiner als die Oberspannung sein.'); sm = (so + su) / 2; sa = (so - su) / 2; }
    const sW = pos(g('sW'), 'σWK'), Rm = pos(g('Rm'), 'Rm'), Re = pos(g('Re'), 'Re'), Smin = or0(g('Smin')) || 1;
    if (Re > Rm) fail('Die Streckgrenze kann nicht über der Zugfestigkeit liegen.');
    const sme = Math.max(sm, 0);
    const A = sa / sW, B = sme / Rm;
    const SG = 1 / (A + B), SS = 1 / (A + sme / Re);
    const SGe = B > 0 ? (-A + sqrt(A * A + 4 * B * B)) / (2 * B * B) : 1 / A;
    const SF = Re / (abs(sm) + sa);
    const so = sm + sa, su = sm - sa, R = so !== 0 ? su / so : NaN;
    const chips = [[`Goodman: S = ${fmt(SG, 3)}`, SG >= Smin ? 'good' : SG >= 1 ? 'warn' : 'bad'], [`Fließen: S = ${fmt(SF, 3)}`, SF >= Smin ? 'good' : SF >= 1 ? 'warn' : 'bad']];
    const rows = [
      ['<i>σ<sub>o</sub></i> / <i>σ<sub>u</sub></i>', `${fmt(so)} / ${fmt(su)}`, 'N/mm²'], ['Spannungsverhältnis <i>R</i>', R, ''],
      ['Sicherheit Goodman', SG, '', 1], ['Sicherheit Gerber', SGe, ''], ['Sicherheit Soderberg', SS, ''], ['Sicherheit gegen Fließen', SF, '', 1],
      ['ertragbare Amplitude (Goodman, gleiches R)', sa * SG, 'N/mm²']
    ];
    const notes = [sm < 0 ? 'Druckmittelspannung: ihr günstiger Einfluss ist hier konservativ nicht angerechnet (σ<sub>m</sub> = 0 gesetzt).' : ''];
    const xmax = Rm * 1.05, ymax = Math.max(sW, sa) * 1.35;
    const gerber = Array.from({ length: 60 }, (_, k) => { const x = Rm * k / 59; return [x, sW * (1 - (x / Rm) ** 2)]; });
    const allow = Array.from({ length: 100 }, (_, k) => { const x = Rm * k / 99; return [x, Math.max(0, Math.min(sW * (1 - x / Rm), Re - x))]; });
    const series = [
      { pts: [[0, 0], ...allow, [Rm, 0]], fill: 'a1', cls: 's4' },
      { pts: [[0, sW], [Rm, 0]], cls: 's1', label: 'Goodman', anchor: 'end', ldx: -6, ldy: -6, labelAt: 'end' },
      { pts: gerber, cls: 's3', label: 'Gerber', anchor: 'end', ldx: -50, ldy: -40 },
      { pts: [[0, sW], [Re, 0]], cls: 's4' },
      { pts: [[0, Re], [Re, 0]], cls: 's2', label: 'Fließgrenze', labelAt: 'start', ldx: 6, ldy: 4, lcls: 'tam' }
    ];
    if (sm > 0 && sa > 0) { const k = Math.min(xmax / sm, ymax / sa); series.push({ pts: [[0, 0], [sm * k, sa * k]], cls: 's3' }); }
    const fig = plot({ h: 280, x: [0, xmax], y: [0, ymax], xl: 'Mittelspannung σm in N/mm²', yl: 'σa in N/mm²', series,
      points: [{ x: sme, y: sa, label: 'Betriebspunkt' }], title: 'Haigh-Diagramm' });
    return { chips, rows, notes, fig: fig + '<div class="cap">Zulässiger Bereich (Goodman und Fließgrenze) blau hinterlegt; gestrichelt: Gerber und Lastgerade bei konstantem R. Soderberg ist die dünne graue Linie.</div>' };
  }
});
