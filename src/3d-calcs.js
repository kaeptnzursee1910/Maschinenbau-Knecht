
/* ================= ERWEITERUNG: FESTIGKEIT ================= */
calc('abgesetztewelle', {
  fields: [
    { id: 'E', label: 'E-Modul <i>E</i>', unit: 'N/mm²', val: 210000 },
    ...[1, 2, 3, 4].flatMap(i => [
      { h: `Abschnitt ${i}` },
      { id: 'l' + i, label: `Länge <i>l</i><sub>${i}</sub>`, unit: 'mm', val: [60, 120, 80, 0][i - 1] },
      { id: 'd' + i, label: `Durchmesser <i>d</i><sub>${i}</sub>`, unit: 'mm', val: [35, 45, 35, 30][i - 1] }
    ]),
    { h: 'Querkräfte (Abstand vom linken Lager)' },
    { id: 'F1', label: 'Kraft <i>F</i><sub>1</sub>', unit: 'N', val: 6000 },
    { id: 'x1', label: 'Lage <i>x</i><sub>1</sub>', unit: 'mm', val: 100 },
    { id: 'F2', label: 'Kraft <i>F</i><sub>2</sub>', unit: 'N', val: 2500 },
    { id: 'x2', label: 'Lage <i>x</i><sub>2</sub>', unit: 'mm', val: 200 }
  ],
  compute(g) {
    const E = pos(g('E'), 'E');
    const sec = [];
    let L = 0;
    for (let i = 1; i <= 4; i++) {
      const l = or0(g('l' + i)); if (l <= 0) continue;
      const d = pos(g('d' + i), `d${i}`);
      sec.push({ i, x0: L, x1: L + l, d }); L += l;
    }
    if (!sec.length) fail('Mindestens ein Abschnitt mit Länge größer 0 eingeben.');
    const loads = [[or0(g('F1')), or0(g('x1'))], [or0(g('F2')), or0(g('x2'))]].filter(f => f[0] !== 0);
    for (const [, a] of loads) if (a < 0 || a > L) fail(`Die Lage der Kräfte muss zwischen 0 und der Wellenlänge ${fmt(L)} mm liegen.`);
    const B = loads.reduce((t, [F, a]) => t + F * a, 0) / L, A = loads.reduce((t, [F]) => t + F, 0) - B;
    const M = x => A * x - loads.reduce((t, [F, a]) => t + (x > a ? F * (x - a) : 0), 0);
    const dAt = x => (sec.find(s => x <= s.x1 + 1e-9) || sec[sec.length - 1]).d;
    const N = 2000, h = L / N, xs = [], ys1 = [0], ys = [0];
    for (let k = 0; k <= N; k++) xs.push(k * h);
    const kap = xs.map(x => M(x) / (E * PI * dAt(x) ** 4 / 64));
    for (let k = 1; k <= N; k++) ys1.push(ys1[k - 1] + (kap[k - 1] + kap[k]) / 2 * h);
    for (let k = 1; k <= N; k++) ys.push(ys[k - 1] + (ys1[k - 1] + ys1[k]) / 2 * h);
    const c = ys[N] / L;
    const w = ys.map((y, k) => -(y - c * xs[k]));
    const slope = ys1.map(s => s - c);
    let kf = 0; w.forEach((v, k) => { if (abs(v) > abs(w[kf])) kf = k; });
    const sig = xs.map(x => 32 * M(x) / (PI * dAt(x) ** 3));
    let ks = 0; sig.forEach((v, k) => { if (abs(v) > abs(sig[ks])) ks = k; });
    let km = 0; xs.forEach((x, k) => { if (abs(M(x)) > abs(M(xs[km]))) km = k; });
    const min = r => r / DEG * 60;
    const table = { head: ['Abschnitt', 'x von … bis in mm', 'd in mm', 'σb,max in N/mm²'], rows: sec.map(s => {
      let m = 0; xs.forEach((x, k) => { if (x >= s.x0 && x <= s.x1) m = Math.max(m, abs(sig[k])); });
      return [String(s.i), `${fmt(s.x0)} … ${fmt(s.x1)}`, fmt(s.d), fmt(m)];
    }) };
    const rows = [
      ['Wellenlänge (Lagerabstand)', L, 'mm'], ['Lagerkraft <i>A</i> / <i>B</i>', `${fmt(A)} / ${fmt(B)}`, 'N'],
      ['größtes Moment |<i>M</i>|', abs(M(xs[km])) / 1000, 'N·m'], ['größte Durchbiegung <i>f</i>', w[kf] * 1000, 'µm', 1], ['bei <i>x</i>', xs[kf], 'mm'],
      ['Neigung linkes Lager', min(abs(slope[0])), '′', 1], ['Neigung rechtes Lager', min(abs(slope[N])), '′', 1],
      ['größte Biegespannung', abs(sig[ks]), 'N/mm²', 1], ['bei <i>x</i>', xs[ks], 'mm']
    ];
    const step = 10, pw = xs.filter((_, k) => k % step === 0).map((x, j) => [x, w[j * step] * 1000]);
    const wm = Math.max(...pw.map(p => abs(p[1]))) || 1;
    const under = (sx, sy, m, pwid, ph) => sec.slice(1).map(s => `<line class="s4" x1="${r1(sx(s.x0))}" x2="${r1(sx(s.x0))}" y1="${m.t}" y2="${m.t + ph}"/>`).join('');
    const fig = plot({ h: 200, x: [0, L], y: [-wm * 0.1, wm * 1.25], yrev: true, yl: 'w(x) in µm', ny: 4, under,
      series: [{ pts: [[0, 0], [L, 0]], cls: 's4' }, { pts: pw, cls: 's1', area: 0 }],
      points: [{ x: xs[kf], y: w[kf] * 1000, label: `f = ${fmt(w[kf] * 1000, 3)} µm`, dy: 18, anchor: 'middle', dx: 0 }], title: 'Biegelinie' });
    const ps = xs.filter((_, k) => k % step === 0).map((x, j) => [x, sig[j * step]]);
    const sm = Math.max(...ps.map(p => abs(p[1]))) || 1;
    const fig2 = plot({ h: 180, x: [0, L], y: padRange(Math.min(...ps.map(p => p[1])), sm, 0.15), yl: 'σb in N/mm²', xl: 'x in mm', ny: 4, under,
      series: [{ pts: ps, cls: 's2', area: 0, acls: 'a2' }], title: 'Biegespannung' });
    return { rows, table, fig: fig + fig2 + '<div class="cap">Dünne senkrechte Linien: Wellenabsätze. Die Spannung springt an jedem Absatz.</div>' };
  }
});

calc('hertz', {
  fields: [
    { id: 'art', label: 'Kontaktart', val: 'punkt', opts: [['punkt', 'Punktberührung (Kugel)'], ['linie', 'Linienberührung (Zylinder)']] },
    { id: 'F', label: 'Normalkraft <i>F</i>', unit: 'N', val: 2000 },
    { id: 'r1', label: 'Radius Körper 1 <i>r</i><sub>1</sub>', unit: 'mm', val: 10 },
    { id: 'r2', label: 'Radius Körper 2 <i>r</i><sub>2</sub>', unit: 'mm', val: 0, hint: '0 = Ebene, negativ = Hohlfläche' },
    { id: 'l', label: 'Berührlänge <i>l</i>', unit: 'mm', val: 20, when: s => s('art') === 'linie' },
    { id: 'E1', label: '<i>E</i><sub>1</sub>', unit: 'N/mm²', val: 210000 },
    { id: 'n1', label: '<i>ν</i><sub>1</sub>', val: 0.3 },
    { id: 'E2', label: '<i>E</i><sub>2</sub>', unit: 'N/mm²', val: 210000 },
    { id: 'n2', label: '<i>ν</i><sub>2</sub>', val: 0.3 }
  ],
  compute(g, s) {
    const F = pos(g('F'), 'F'), r1v = or0(g('r1')), r2v = or0(g('r2'));
    const Es = 1 / ((1 - or0(g('n1')) ** 2) / pos(g('E1'), 'E₁') + (1 - or0(g('n2')) ** 2) / pos(g('E2'), 'E₂'));
    const invR = (r1v ? 1 / r1v : 0) + (r2v ? 1 / r2v : 0);
    if (invR <= 0) fail('Die Körper berühren sich so nicht konvex: 1/r₁ + 1/r₂ muss größer als 0 sein.');
    const R = 1 / invR;
    if (s('art') === 'punkt') {
      const a = Math.cbrt(3 * F * R / (4 * Es)), p = 3 * F / (2 * PI * a * a);
      return { rows: [['Ersatzmodul <i>E</i>*', Es, 'N/mm²'], ['Ersatzradius <i>R</i>', R, 'mm'], ['Kontaktradius <i>a</i>', a, 'mm', 1], ['größte Pressung <i>p</i><sub>max</sub>', p, 'N/mm²', 1], ['mittlere Pressung', p * 2 / 3, 'N/mm²'], ['Annäherung <i>δ</i>', a * a / R * 1000, 'µm'], ['größte Schubspannung', 0.31 * p, 'N/mm²'], ['in der Tiefe', 0.48 * a, 'mm']] };
    }
    const l = pos(g('l'), 'l'), b = sqrt(4 * F * R / (PI * l * Es)), p = 2 * F / (PI * b * l);
    return { rows: [['Ersatzmodul <i>E</i>*', Es, 'N/mm²'], ['Ersatzradius <i>R</i>', R, 'mm'], ['halbe Kontaktbreite <i>b</i>', b, 'mm', 1], ['größte Pressung <i>p</i><sub>max</sub>', p, 'N/mm²', 1], ['mittlere Pressung', p * PI / 4, 'N/mm²'], ['Linienlast <i>F</i>/<i>l</i>', F / l, 'N/mm'], ['größte Schubspannung', 0.30 * p, 'N/mm²'], ['in der Tiefe', 0.78 * b, 'mm']] };
  }
});

const PL_X = [1, 1.2, 1.4, 1.6, 1.8, 2, 3, 4, 5, 1000];
const PL = {
  gel: { b: [0.2874, 0.3762, 0.4530, 0.5172, 0.5688, 0.6102, 0.7134, 0.7410, 0.7476, 0.75], a: [0.0444, 0.0616, 0.0770, 0.0906, 0.1017, 0.1110, 0.1335, 0.1400, 0.1417, 0.1421] },
  ein: { b: [0.3078, 0.3834, 0.4356, 0.4680, 0.4872, 0.4974, 0.5, 0.5, 0.5, 0.5], a: [0.0138, 0.0188, 0.0226, 0.0251, 0.0267, 0.0277, 0.0284, 0.0284, 0.0284, 0.0284] }
};
calc('platten', {
  fields: [
    { id: 'form', label: 'Plattenform', val: 'kreis', opts: [['kreis', 'Kreisplatte'], ['rechteck', 'Rechteckplatte']] },
    { id: 'lag', label: 'Randlagerung', val: 'ein', opts: [['gel', 'gelenkig (frei drehbar)'], ['ein', 'eingespannt']] },
    { id: 'p', label: 'Druck <i>p</i>', unit: 'bar', val: 10 },
    { id: 'r', label: 'Radius <i>r</i>', unit: 'mm', val: 150, when: s => s('form') === 'kreis' },
    { id: 'a', label: 'lange Seite <i>a</i>', unit: 'mm', val: 600, when: s => s('form') === 'rechteck' },
    { id: 'b', label: 'kurze Seite <i>b</i>', unit: 'mm', val: 400, when: s => s('form') === 'rechteck' },
    { id: 'h', label: 'Dicke <i>h</i>', unit: 'mm', val: 20 },
    { id: 'E', label: 'E-Modul <i>E</i>', unit: 'N/mm²', val: 210000 },
    { id: 'nu', label: '<i>ν</i>', val: 0.3, when: s => s('form') === 'kreis' },
    { id: 'Re', label: 'Streckgrenze <i>R<sub>e</sub></i>', unit: 'N/mm²', val: 235 }
  ],
  compute(g, s) {
    const p = pos(g('p'), 'p') / 10, h = pos(g('h'), 'h'), E = pos(g('E'), 'E'), ein = s('lag') === 'ein', Re = g('Re');
    let sig, w, where, extra = [];
    if (s('form') === 'kreis') {
      const r = pos(g('r'), 'r'), nu = or0(g('nu')), K = E * h ** 3 / (12 * (1 - nu * nu));
      if (ein) { sig = 0.75 * p * r * r / (h * h); w = p * r ** 4 / (64 * K); where = 'am Rand'; extra.push(['Spannung in der Mitte', 3 * (1 + nu) / 8 * p * r * r / (h * h), 'N/mm²']); }
      else { sig = 3 * (3 + nu) / 8 * p * r * r / (h * h); w = (5 + nu) * p * r ** 4 / (64 * (1 + nu) * K); where = 'in der Mitte'; }
      extra.push(['Plattensteifigkeit <i>K</i>', K, 'N·mm'], ['Gesamtkraft auf die Platte', p * PI * r * r / 1000, 'kN']);
    } else {
      let a = pos(g('a'), 'a'), b = pos(g('b'), 'b'); if (b > a) [a, b] = [b, a];
      const t = PL[ein ? 'ein' : 'gel'], q = a / b;
      const be = interp(PL_X, t.b, q), al = interp(PL_X, t.a, q);
      sig = be * p * b * b / (h * h); w = al * p * b ** 4 / (E * h ** 3); where = ein ? 'Mitte der langen Seite (Rand)' : 'Plattenmitte';
      extra.push(['Seitenverhältnis <i>a</i>/<i>b</i>', q, ''], ['Beiwerte <i>β</i> / <i>α</i>', `${fmt(be, 3)} / ${fmt(al, 3)}`, ''], ['Gesamtkraft auf die Platte', p * a * b / 1000, 'kN']);
    }
    const S = isFinite(Re) ? Re / sig : NaN;
    const chips = [];
    if (isFinite(S)) chips.push([`S<sub>F</sub> = ${fmt(S, 3)}`, S >= 1.5 ? 'good' : S >= 1 ? 'warn' : 'bad']);
    if (w > h / 2) chips.push(['w > h/2: Membranwirkung, lineare Theorie ungenau', 'warn']);
    return { chips, rows: [['größte Spannung <i>σ</i><sub>max</sub>', sig, 'N/mm²', 1], ['Ort', where, ''], ['größte Durchbiegung <i>w</i><sub>max</sub>', w, 'mm', 1], ['Verhältnis <i>w</i>/<i>h</i>', w / h, ''], ...extra, ['Sicherheit gegen Fließen', S, '']] };
  }
});

calc('behaelter', {
  fields: [
    { id: 'Da', label: 'Außendurchmesser <i>D<sub>a</sub></i>', unit: 'mm', val: 219.1 },
    { id: 's', label: 'Wanddicke <i>s</i>', unit: 'mm', val: 6.3 },
    { id: 'pi', label: 'Innendruck <i>p<sub>i</sub></i> (Überdruck)', unit: 'bar', val: 40 },
    { id: 'pa', label: 'Außendruck (Unterdruck innen)', unit: 'bar', val: 1, hint: 'für den Beulnachweis' },
    { id: 'K', label: 'Festigkeitskennwert <i>R</i><sub>p0,2,T</sub>', unit: 'N/mm²', val: 235 },
    { id: 'S', label: 'Sicherheitsbeiwert', val: 1.5 },
    { id: 'z', label: 'Schweißnahtfaktor <i>z</i>', val: 1 },
    { id: 'c', label: 'Zuschläge <i>c</i>', unit: 'mm', val: 1 },
    { id: 'E', label: 'E-Modul <i>E</i>', unit: 'N/mm²', val: 210000 }
  ],
  compute(g) {
    const Da = pos(g('Da'), 'Da'), s = pos(g('s'), 's'), p = nn(g('pi'), 'pi') / 10, pa = or0(g('pa')) / 10;
    if (2 * s >= Da) fail('Die Wanddicke ist zu groß für diesen Durchmesser.');
    const Di = Da - 2 * s, dm = Da - s, f = pos(g('K'), 'K') / pos(g('S'), 'S'), z = pos(g('z'), 'z'), c = or0(g('c')), E = pos(g('E'), 'E'), nu = 0.3;
    const st = p * dm / (2 * s), sa = p * dm / (4 * s);
    const k = Da * Da - Di * Di, sti = p * (Da * Da + Di * Di) / k, sri = -p, sai = p * Di * Di / k;
    const sv = sqrt(((sti - sri) ** 2 + (sri - sai) ** 2 + (sai - sti) ** 2) / 2);
    const emin = p * Da / (2 * f * z + p) + c;
    const pk = 2 * E / (1 - nu * nu) * (s / dm) ** 3;
    const chips = [[s >= emin ? 'Wanddicke ausreichend' : 'Wanddicke zu gering', s >= emin ? 'good' : 'bad']];
    if (pa > 0) chips.push([`Beulsicherheit ${fmt(pk / pa, 3)}`, pk / pa >= 3 ? 'good' : pk / pa >= 1.5 ? 'warn' : 'bad']);
    return {
      chips,
      rows: [
        ['Durchmesserverhältnis <i>D<sub>a</sub></i>/<i>D<sub>i</sub></i>', Da / Di, ''], { h: 'Kesselformel (dünnwandig)' },
        ['Umfangsspannung <i>σ<sub>t</sub></i>', st, 'N/mm²', 1], ['Längsspannung <i>σ<sub>a</sub></i>', sa, 'N/mm²'],
        { h: 'Lamé (dickwandig), Innenfaser' },
        ['Umfangsspannung', sti, 'N/mm²'], ['Radialspannung', sri, 'N/mm²'], ['Längsspannung (geschlossen)', sai, 'N/mm²'], ['Vergleichsspannung GEH', sv, 'N/mm²', 1],
        { h: 'Auslegung' },
        ['zulässige Spannung <i>f</i>', f, 'N/mm²'], ['Mindestwanddicke <i>e</i>', emin, 'mm', 1], ['zulässiger Innendruck mit <i>s</i>', (s - c) > 0 ? 2 * f * z * (s - c) / (Da - (s - c)) * 10 : 0, 'bar'],
        ['Beuldruck <i>p<sub>k</sub></i> (langes Rohr)', pk * 10, 'bar', 1]
      ]
    };
  }
});

/* ================= QUERSCHNITTE & PROFILE ================= */
// Profil, h, b, tw, tf, A [cm²], Iy [cm⁴], Wy [cm³], Iz [cm⁴], Wz [cm³]
const PROFILE = [
  ['IPE 80', 80, 46, 3.8, 5.2, 7.64, 80.1, 20.0, 8.49, 3.69], ['IPE 100', 100, 55, 4.1, 5.7, 10.3, 171, 34.2, 15.9, 5.79],
  ['IPE 120', 120, 64, 4.4, 6.3, 13.2, 318, 53.0, 27.7, 8.65], ['IPE 140', 140, 73, 4.7, 6.9, 16.4, 541, 77.3, 44.9, 12.3],
  ['IPE 160', 160, 82, 5.0, 7.4, 20.1, 869, 109, 68.3, 16.7], ['IPE 180', 180, 91, 5.3, 8.0, 23.9, 1317, 146, 101, 22.2],
  ['IPE 200', 200, 100, 5.6, 8.5, 28.5, 1943, 194, 142, 28.5], ['IPE 220', 220, 110, 5.9, 9.2, 33.4, 2772, 252, 205, 37.3],
  ['IPE 240', 240, 120, 6.2, 9.8, 39.1, 3892, 324, 284, 47.3], ['IPE 270', 270, 135, 6.6, 10.2, 45.9, 5790, 429, 420, 62.2],
  ['IPE 300', 300, 150, 7.1, 10.7, 53.8, 8356, 557, 604, 80.5], ['IPE 330', 330, 160, 7.5, 11.5, 62.6, 11770, 713, 788, 98.5],
  ['IPE 360', 360, 170, 8.0, 12.7, 72.7, 16270, 904, 1043, 123], ['IPE 400', 400, 180, 8.6, 13.5, 84.5, 23130, 1160, 1318, 146],
  ['HEB 100', 100, 100, 6, 10, 26.0, 450, 89.9, 167, 33.5], ['HEB 120', 120, 120, 6.5, 11, 34.0, 864, 144, 318, 52.9],
  ['HEB 140', 140, 140, 7, 12, 43.0, 1509, 216, 550, 78.5], ['HEB 160', 160, 160, 8, 13, 54.3, 2492, 311, 889, 111],
  ['HEB 180', 180, 180, 8.5, 14, 65.3, 3831, 426, 1363, 151], ['HEB 200', 200, 200, 9, 15, 78.1, 5696, 570, 2003, 200],
  ['HEB 220', 220, 220, 9.5, 16, 91.0, 8091, 736, 2843, 258], ['HEB 240', 240, 240, 10, 17, 106, 11260, 938, 3923, 327],
  ['HEB 260', 260, 260, 10, 17.5, 118, 14920, 1148, 5135, 395], ['HEB 280', 280, 280, 10.5, 18, 131, 19270, 1376, 6595, 471],
  ['HEB 300', 300, 300, 11, 19, 149, 25170, 1678, 8563, 571]
];
const kgm = A => A * 0.785;
calc('profile', {
  fields: [
    { id: 'pr', label: 'Profil', val: 'IPE 200', opts: PROFILE.map(p => [p[0], p[0]]) },
    { id: 'M', label: 'Biegemoment <i>M<sub>y</sub></i>', unit: 'kN·m', val: 30 },
    { id: 'sz', label: 'zulässige Spannung', unit: 'N/mm²', val: 160 }
  ],
  compute(g, s) {
    const P = PROFILE.find(p => p[0] === s('pr')), M = nn(g('M'), 'M') * 1e6, sz = pos(g('sz'), 'σzul');
    const sig = M / (P[7] * 1e3), Werf = M / sz / 1e3;
    const best = r => PROFILE.filter(p => p[0].startsWith(r) && p[7] >= Werf).sort((a, b) => a[5] - b[5])[0];
    const bi = best('IPE'), bh = best('HEB');
    return {
      chips: [[`Ausnutzung ${fmt(sig / sz * 100, 3)} %`, sig <= sz ? 'good' : 'bad']],
      rows: [
        { h: P[0] }, ['Höhe × Breite', `${P[1]} × ${P[2]}`, 'mm'], ['Steg / Flansch <i>t<sub>w</sub></i> / <i>t<sub>f</sub></i>', `${fmt(P[3])} / ${fmt(P[4])}`, 'mm'],
        ['Fläche <i>A</i>', P[5], 'cm²'], ['Masse', kgm(P[5]), 'kg/m'], ['<i>I<sub>y</sub></i> / <i>W<sub>y</sub></i>', `${fmt(P[6])} / ${fmt(P[7])}`, 'cm⁴ / cm³'],
        ['<i>I<sub>z</sub></i> / <i>W<sub>z</sub></i>', `${fmt(P[8])} / ${fmt(P[9])}`, 'cm⁴ / cm³'], ['<i>i<sub>y</sub></i> / <i>i<sub>z</sub></i>', `${fmt(sqrt(P[6] / P[5]) * 10)} / ${fmt(sqrt(P[8] / P[5]) * 10)}`, 'mm'],
        ['Biegespannung <i>σ</i>', sig, 'N/mm²', 1],
        { h: 'Auswahl für dieses Moment' },
        ['erforderliches <i>W<sub>y</sub></i>', Werf, 'cm³'], ['leichtestes IPE', bi ? `${bi[0]} (${fmt(kgm(bi[5]))} kg/m)` : 'keins ausreichend', '', 1],
        ['leichtestes HEB', bh ? `${bh[0]} (${fmt(kgm(bh[5]))} kg/m)` : 'keins ausreichend', '', 1]
      ]
    };
  }
});

const TQ_R = [0, 0.1, 1 / 6, 0.25, 1 / 3, 0.5, 2 / 3, 1];
const TQ_C1 = [0.333, 0.312, 0.299, 0.281, 0.263, 0.229, 0.196, 0.141];
const TQ_C2 = [0.333, 0.312, 0.299, 0.282, 0.267, 0.246, 0.231, 0.208];
calc('torsionq', {
  fields: [
    { id: 'q', label: 'Querschnitt', val: 'rechteck', wide: 1, opts: [['rechteck', 'Rechteck / Vierkant'], ['dreieck', 'gleichseitiges Dreieck'], ['offen', 'dünnwandig offen (bis 3 Teile)']] },
    { id: 'h', label: 'lange Seite <i>h</i>', unit: 'mm', val: 40, when: s => s('q') === 'rechteck' },
    { id: 'b', label: 'kurze Seite <i>b</i>', unit: 'mm', val: 20, when: s => s('q') === 'rechteck' },
    { id: 'a', label: 'Seitenlänge <i>a</i>', unit: 'mm', val: 40, when: s => s('q') === 'dreieck' },
    ...[1, 2, 3].flatMap(i => [
      { id: 'h' + i, label: `Teil ${i} Länge <i>h</i><sub>${i}</sub>`, unit: 'mm', val: [100, 180, 100][i - 1], when: s => s('q') === 'offen' },
      { id: 't' + i, label: `Teil ${i} Dicke <i>t</i><sub>${i}</sub>`, unit: 'mm', val: [8.5, 5.6, 8.5][i - 1], when: s => s('q') === 'offen' }
    ]),
    { id: 'eta', label: 'Profilbeiwert <i>η</i>', val: 1.2, when: s => s('q') === 'offen' },
    { id: 'T', label: 'Torsionsmoment <i>T</i>', unit: 'N·m', val: 200 },
    { id: 'l', label: 'Länge <i>l</i>', unit: 'mm', val: 1000 },
    { id: 'G', label: 'Schubmodul <i>G</i>', unit: 'N/mm²', val: 81000 }
  ],
  compute(g, s) {
    const Tn = fin(g('T'), 'T') * 1000, l = pos(g('l'), 'l'), G = pos(g('G'), 'G');
    let It, Wt, extra = [];
    if (s('q') === 'rechteck') {
      let h = pos(g('h'), 'h'), b = pos(g('b'), 'b'); if (b > h) [h, b] = [b, h];
      const r = b / h, c1 = interp(TQ_R, TQ_C1, r), c2 = interp(TQ_R, TQ_C2, r);
      It = c1 * h * b ** 3; Wt = c2 * h * b * b;
      extra = [['<i>h</i>/<i>b</i>', h / b, ''], ['Beiwerte <i>c</i><sub>1</sub> / <i>c</i><sub>2</sub>', `${fmt(c1, 3)} / ${fmt(c2, 3)}`, '']];
    } else if (s('q') === 'dreieck') {
      const a = pos(g('a'), 'a'); It = sqrt(3) / 80 * a ** 4; Wt = a ** 3 / 20;
    } else {
      const eta = pos(g('eta'), 'η'); let sum = 0, tmax = 0;
      for (let i = 1; i <= 3; i++) { const h = or0(g('h' + i)), t = or0(g('t' + i)); if (h > 0 && t > 0) { sum += h * t ** 3; tmax = Math.max(tmax, t); } }
      if (!sum) fail('Mindestens ein Teil mit Länge und Dicke eingeben.');
      It = eta / 3 * sum; Wt = It / tmax;
    }
    const tau = Tn / Wt, phi = Tn * l / (G * It);
    return { rows: [...extra, ['Torsionsträgheitsmoment <i>I<sub>t</sub></i>', It, 'mm⁴', 1], ['Torsionswiderstandsmoment <i>W<sub>t</sub></i>', Wt, 'mm³', 1], ['größte Schubspannung <i>τ</i><sub>max</sub>', tau, 'N/mm²', 1], ['Verdrehwinkel <i>φ</i>', phi / DEG, '°', 1], ['Torsionssteifigkeit <i>GI<sub>t</sub></i>/<i>l</i>', G * It / l / 1000, 'N·m/rad']] };
  }
});

/* ================= ANTRIEBSTECHNIK ================= */
calc('antrieb', {
  fields: [
    { id: 'P', label: 'Motorleistung <i>P<sub>N</sub></i>', unit: 'kW', val: 15 },
    { id: 'n', label: 'Nenndrehzahl <i>n</i>', unit: 'min⁻¹', val: 1460 },
    { id: 'kA', label: 'Anlaufmoment <i>T<sub>A</sub></i>/<i>T<sub>N</sub></i>', val: 2 },
    { id: 'JM', label: 'Trägheit Motor <i>J<sub>M</sub></i>', unit: 'kg·m²', val: 0.08 },
    { id: 'JL', label: 'Trägheit Last (reduziert) <i>J<sub>L</sub></i>', unit: 'kg·m²', val: 0.6 },
    { id: 'TL', label: 'Lastmoment beim Anlauf <i>T<sub>L</sub></i>', unit: 'N·m', val: 40 },
    { id: 'ct', label: 'Drehsteifigkeit Kupplung + Welle <i>c<sub>t</sub></i>', unit: 'N·m/rad', val: 25000, hint: 'optional' }
  ],
  compute(g) {
    const P = pos(g('P'), 'P') * 1000, n = pos(g('n'), 'n'), w = 2 * PI * n / 60, TN = P / w, TA = pos(g('kA'), 'TA/TN') * TN;
    const JM = pos(g('JM'), 'JM'), JL = nn(g('JL'), 'JL'), TL = nn(or0(g('TL')), 'TL'), ct = g('ct');
    if (TA <= TL) fail('Das Anlaufmoment reicht nicht: Der Motor läuft gegen dieses Lastmoment nicht an.');
    const tH = (JM + JL) * w / (TA - TL);
    const TK0 = TA * JL / (JM + JL), TK = TL + (TA - TL) * JL / (JM + JL);
    const rows = [
      ['Nennmoment <i>T<sub>N</sub></i>', TN, 'N·m', 1], ['Anlaufmoment <i>T<sub>A</sub></i>', TA, 'N·m'], ['Beschleunigungsmoment', TA - TL, 'N·m'],
      ['Hochlaufzeit <i>t<sub>H</sub></i>', tH, 's', 1], ['Kupplungsmoment, Anlauf ohne Last', TK0, 'N·m'], ['Kupplungsmoment, Anlauf unter Last', TK, 'N·m', 1],
      ['Verhältnis zu <i>T<sub>N</sub></i>', TK / TN, ''], ['Anlaufenergie (Wärme im Läufer ≈ kinetische Energie)', 0.5 * (JM + JL) * w * w / 1000, 'kJ']
    ];
    if (isFinite(ct) && ct > 0 && JL > 0) {
      const we = sqrt(ct * (JM + JL) / (JM * JL));
      rows.push({ h: 'Torsionsschwingung' }, ['Eigenkreisfrequenz <i>ω<sub>e</sub></i>', we, '1/s'], ['Eigenfrequenz', we / (2 * PI), 'Hz', 1], ['Resonanzdrehzahl 1. Ordnung', we / (2 * PI) * 60, 'min⁻¹'], ['Abstand zur Betriebsdrehzahl', (we / (2 * PI) * 60 / n - 1) * 100, '%']);
    }
    return { rows };
  }
});

calc('unwucht', {
  fields: [
    { id: 'm', label: 'Rotormasse <i>m</i>', unit: 'kg', val: 25 },
    { id: 'n', label: 'Betriebsdrehzahl <i>n</i>', unit: 'min⁻¹', val: 3000 },
    { id: 'G', label: 'Auswuchtgüte', val: '6.3', opts: [['0.4', 'G 0,4'], ['1', 'G 1'], ['2.5', 'G 2,5'], ['6.3', 'G 6,3'], ['16', 'G 16'], ['40', 'G 40']] },
    { id: 'z', label: 'Ausgleichsebenen', val: '2', opts: [['1', '1 Ebene'], ['2', '2 Ebenen']] },
    { h: 'Vorhandene Unwucht (optional)' },
    { id: 'mu', label: 'Unwuchtmasse <i>m<sub>u</sub></i>', unit: 'g', val: 5 },
    { id: 'r', label: 'Radius <i>r</i>', unit: 'mm', val: 100 }
  ],
  compute(g, s) {
    const m = pos(g('m'), 'm'), n = pos(g('n'), 'n'), G = +s('G'), z = +s('z'), w = 2 * PI * n / 60;
    const e = G / w * 1000, U = m * e, Fz = U * 1e-6 * w * w;
    const mu = or0(g('mu')), r = or0(g('r')), Uv = mu * r, F = mu / 1000 * r / 1000 * w * w, Gv = Uv / m / 1000 * w;
    const rows = [
      ['Winkelgeschwindigkeit <i>ω</i>', w, '1/s'], ['zulässige Exzentrizität <i>e</i>', e, 'µm', 1], ['zulässige Restunwucht <i>U</i>', U, 'g·mm', 1],
      z === 2 ? ['je Ausgleichsebene', U / 2, 'g·mm'] : null, ['Fliehkraft bei zulässiger Unwucht', Fz, 'N']
    ];
    let chips = [];
    if (Uv > 0) {
      rows.push({ h: 'Vorhandene Unwucht' }, ['Unwucht <i>m<sub>u</sub></i>·<i>r</i>', Uv, 'g·mm'], ['Fliehkraft', F, 'N', 1], ['entspricht Gütestufe', Gv, 'mm/s'], ['entspricht Exzentrizität', Uv / m, 'µm']);
      chips = [[Uv <= U ? 'innerhalb der Gütestufe' : 'Gütestufe überschritten', Uv <= U ? 'good' : 'bad']];
    }
    return { chips, rows };
  }
});

calc('gelenkwelle', {
  fields: [
    { id: 'b', label: 'Beugungswinkel <i>β</i>', unit: '°', val: 12 },
    { id: 'n', label: 'Antriebsdrehzahl <i>n</i><sub>1</sub>', unit: 'min⁻¹', val: 1500 },
    { id: 'T', label: 'Antriebsmoment <i>T</i><sub>1</sub>', unit: 'N·m', val: 800 },
    { h: 'Gelenkwellenrohr' },
    { id: 'L', label: 'Länge zwischen den Gelenken <i>L</i>', unit: 'mm', val: 1500 },
    { id: 'D', label: 'Rohr außen <i>D</i>', unit: 'mm', val: 80 },
    { id: 'd', label: 'Rohr innen <i>d</i>', unit: 'mm', val: 74 },
    { id: 'E', label: 'E-Modul', unit: 'N/mm²', val: 210000 },
    { id: 'rho', label: 'Dichte', unit: 'kg/m³', val: 7850 }
  ],
  compute(g) {
    const b = nn(g('b'), 'β') * DEG, n = pos(g('n'), 'n'), T1 = or0(g('T'));
    if (b >= 45 * DEG) fail('Kreuzgelenke werden bis etwa 45° Beugung gebaut, üblich sind unter 25°.');
    const w1 = 2 * PI * n / 60, sb2 = Math.sin(b) ** 2;
    const ratio = f => Math.cos(b) / (1 - sb2 * Math.sin(f) ** 2);
    let amax = 0; const pts = [];
    for (let k = 0; k <= 360; k++) {
      const f = k * DEG; pts.push([k, ratio(f)]);
      const da = (ratio(f + 1e-4) - ratio(f - 1e-4)) / 2e-4;
      amax = Math.max(amax, abs(da) * w1 * w1);
    }
    const L = pos(g('L'), 'L') / 1000, D = pos(g('D'), 'D') / 1000, d = nn(g('d'), 'd') / 1000, E = pos(g('E'), 'E') * 1e6, rho = pos(g('rho'), 'ρ');
    if (d >= D) fail('Der Innendurchmesser muss kleiner als der Außendurchmesser sein.');
    const nk = 30 * PI / (L * L) * sqrt(E * (D * D + d * d) / (16 * rho));
    const fig = plot({ h: 200, x: [0, 360], y: [Math.cos(b) - (1 / Math.cos(b) - Math.cos(b)) * 0.15, 1 / Math.cos(b) + (1 / Math.cos(b) - Math.cos(b)) * 0.15 + 1e-6], xt: [0, 90, 180, 270, 360], xl: 'Drehwinkel φ₁ in °', yl: 'ω₂/ω₁', ny: 4,
      series: [{ pts: [[0, 1], [360, 1]], cls: 's4' }, { pts, cls: 's1' }], title: 'Übertragungsverhältnis' });
    return {
      chips: [[`n/n<sub>krit</sub> = ${fmt(n / nk * 100, 3)} %`, n / nk <= 0.7 ? 'good' : n / nk <= 0.85 ? 'warn' : 'bad']],
      rows: [
        ['Ungleichförmigkeitsgrad <i>U</i>', Math.tan(b) * Math.sin(b) * 100, '%', 1], ['Abtriebsdrehzahl min / max', `${fmt(n * Math.cos(b))} / ${fmt(n / Math.cos(b))}`, 'min⁻¹'],
        ['Abtriebsmoment min / max', `${fmt(T1 * Math.cos(b))} / ${fmt(T1 / Math.cos(b))}`, 'N·m'], ['größte Winkelbeschleunigung Abtrieb', amax, 'rad/s²', 1],
        ['kritische Biegedrehzahl des Rohrs', nk, 'min⁻¹', 1]
      ],
      notes: ['Mit zwei Gelenken in Z- oder W-Anordnung und gleichen Beugungswinkeln läuft der Abtrieb gleichförmig; die Werte gelten dann nur für die Zwischenwelle.'],
      fig
    };
  }
});

calc('isolierung', {
  fields: [
    { id: 'm', label: 'Masse der Maschine <i>m</i>', unit: 'kg', val: 1200 },
    { id: 'z', label: 'Anzahl Lager', val: 4 },
    { id: 'cm', label: 'Lagersteifigkeit', val: 'direkt', opts: [['direkt', 'je Lager direkt eingeben'], ['gummi', 'aus Gummiquader berechnen']] },
    { id: 'c', label: 'Steifigkeit je Lager <i>c</i>', unit: 'N/mm', val: 900, when: s => s('cm') === 'direkt' },
    { id: 'a', label: 'Gummi Länge <i>a</i>', unit: 'mm', val: 100, when: s => s('cm') === 'gummi' },
    { id: 'b', label: 'Gummi Breite <i>b</i>', unit: 'mm', val: 100, when: s => s('cm') === 'gummi' },
    { id: 'h', label: 'Gummi Höhe <i>h</i>', unit: 'mm', val: 50, when: s => s('cm') === 'gummi' },
    { id: 'G', label: 'Schubmodul <i>G</i>', unit: 'N/mm²', val: 0.64, when: s => s('cm') === 'gummi', hint: '≈ 50 Shore A' },
    { id: 'kd', label: 'dynamische Versteifung', val: 1.4 },
    { id: 'n', label: 'Erregerdrehzahl', unit: 'min⁻¹', val: 1500 },
    { id: 'D', label: 'Dämpfungsgrad <i>D</i>', val: 0.05 }
  ],
  compute(g, s) {
    const m = pos(g('m'), 'm'), z = pos(g('z'), 'Anzahl'), kd = pos(g('kd'), 'Versteifung'), fe = pos(g('n'), 'n') / 60, D = nn(g('D'), 'D');
    let c, extra = [];
    if (s('cm') === 'direkt') c = pos(g('c'), 'c');
    else {
      const a = pos(g('a'), 'a'), b = pos(g('b'), 'b'), h = pos(g('h'), 'h'), G = pos(g('G'), 'G');
      const k = a * b / (2 * h * (a + b)), Ec = 3 * G * (1 + 2 * k * k); c = Ec * a * b / h;
      extra = [['Formfaktor <i>k</i>', k, ''], ['Kompressionsmodul <i>E<sub>c</sub></i>', Ec, 'N/mm²'], ['Druckspannung im Gummi', m * 9.81 / (z * a * b), 'N/mm²']];
    }
    const cg = z * c * 1000, sst = m * 9.81 / cg * 1000, f0 = sqrt(kd * cg / m) / (2 * PI), eta = fe / f0;
    const VT = sqrt((1 + (2 * D * eta) ** 2) / ((1 - eta * eta) ** 2 + (2 * D * eta) ** 2)), iso = 1 - VT;
    const curve = Array.from({ length: 241 }, (_, k) => { const e = k * Math.max(4, eta * 1.2) / 240; return [e, sqrt((1 + (2 * D * e) ** 2) / ((1 - e * e) ** 2 + (2 * D * e) ** 2))]; });
    const fig = plot({ h: 220, x: [0, Math.max(4, eta * 1.2)], y: [0, Math.min(6, Math.max(2, VT * 1.3))], xl: 'η = f/f₀', yl: 'V_T', ny: 4,
      series: [{ pts: [[0, 1], [Math.max(4, eta * 1.2), 1]], cls: 's4' }, { pts: curve, cls: 's1' }],
      points: [{ x: eta, y: VT, label: `i = ${fmt(iso * 100, 3)} %` }], title: 'Übertragungsfaktor' });
    return {
      chips: [[iso >= 0.8 ? 'gute Isolierung' : iso > 0 ? 'mäßige Isolierung' : 'Schwingungen werden verstärkt', iso >= 0.8 ? 'good' : iso > 0 ? 'warn' : 'bad']],
      rows: [...extra, ['Steifigkeit je Lager <i>c</i>', c, 'N/mm'], ['statische Einfederung', sst, 'mm'], ['Eigenfrequenz <i>f</i><sub>0</sub> (dynamisch)', f0, 'Hz', 1], ['Erregerfrequenz', fe, 'Hz'], ['Frequenzverhältnis <i>η</i>', eta, ''], ['Übertragungsfaktor <i>V<sub>T</sub></i>', VT, ''], ['Isoliergrad <i>i</i>', iso * 100, '%', 1]],
      fig
    };
  }
});

/* ================= THERMODYNAMIK ================= */
const W_LAM = [0.561, 0.580, 0.598, 0.615, 0.631, 0.644, 0.654, 0.663, 0.670, 0.675, 0.679];
const W_PR = [13.4, 9.45, 7.01, 5.42, 4.32, 3.55, 2.99, 2.55, 2.21, 1.95, 1.75];
const W_BETA = [-0.07, 0.088, 0.207, 0.303, 0.385, 0.457, 0.523, 0.585, 0.643, 0.698, 0.752];
const W_PD = [0.611, 1.228, 2.339, 4.246, 7.384, 12.35, 19.94, 31.18, 47.39, 70.14, 101.3];
function fluid(med, T) {
  if (med === 'wasser') { const w = wasser(T); return { ...w, lam: interp(W_T, W_LAM, T), Pr: interp(W_T, W_PR, T), beta: interp(W_T, W_BETA, T) * 1e-3 }; }
  const l = luft(T, 1.01325); return { ...l, lam: 0.0244 * ((T + 273.15) / 273.15) ** 0.82, Pr: 0.71, beta: 1 / (T + 273.15) };
}
const magnus = T => 611.2 * Math.exp(17.62 * T / (243.12 + T));
calc('waermeuebergang', {
  fields: [
    { id: 'fall', label: 'Anordnung', val: 'rohr', wide: 1, opts: [['platte', 'Platte längs angeströmt (erzwungen)'], ['rohr', 'Rohr innen durchströmt (erzwungen)'], ['zyl', 'Zylinder quer angeströmt (erzwungen)'], ['wand', 'senkrechte Wand (frei)'], ['hzyl', 'waagrechter Zylinder (frei)']] },
    { id: 'med', label: 'Fluid', val: 'wasser', opts: [['wasser', 'Wasser'], ['luft', 'Luft']] },
    { id: 'Tf', label: 'Fluidtemperatur', unit: '°C', val: 40 },
    { id: 'Tw', label: 'Wandtemperatur', unit: '°C', val: 60 },
    { id: 'v', label: 'Geschwindigkeit <i>v</i>', unit: 'm/s', val: 1, when: s => 'platte rohr zyl'.includes(s('fall')) },
    { id: 'L', label: 'Länge <i>L</i> bzw. Durchmesser <i>d</i>', unit: 'mm', val: 25 },
    { id: 'Lr', label: 'Rohrlänge', unit: 'm', val: 2, when: s => s('fall') === 'rohr' }
  ],
  compute(g, s) {
    const Tf = fin(g('Tf'), 'Fluidtemperatur'), Tw = fin(g('Tw'), 'Wandtemperatur'), L = pos(g('L'), 'L') / 1000, fall = s('fall');
    const st = fluid(s('med'), (Tf + Tw) / 2);
    let Nu, rows = [];
    if ('platte rohr zyl'.includes(fall)) {
      const Re = pos(g('v'), 'v') * L / st.nu; rows.push(['Reynolds-Zahl <i>Re</i>', Re, '']);
      if (fall === 'platte') { const nl = 0.664 * sqrt(Re) * st.Pr ** (1 / 3), nt = 0.037 * Re ** 0.8 * st.Pr / (1 + 2.443 * Re ** -0.1 * (st.Pr ** (2 / 3) - 1)); Nu = sqrt(nl * nl + nt * nt); }
      if (fall === 'rohr') {
        if (Re < 2300) Nu = 3.66;
        else { const xi = (1.8 * Math.log10(Re) - 1.5) ** -2, Lr = pos(g('Lr'), 'Rohrlänge'); Nu = (xi / 8) * (Re - 1000) * st.Pr / (1 + 12.7 * sqrt(xi / 8) * (st.Pr ** (2 / 3) - 1)) * (1 + (L / Lr) ** (2 / 3)); }
        rows.push(['Strömung', Re < 2300 ? 'laminar' : 'turbulent', '']);
      }
      if (fall === 'zyl') Nu = 0.3 + 0.62 * sqrt(Re) * st.Pr ** (1 / 3) / (1 + (0.4 / st.Pr) ** (2 / 3)) ** 0.25 * (1 + (Re / 282000) ** 0.625) ** 0.8;
    } else {
      const Ra = 9.81 * abs(st.beta) * abs(Tw - Tf) * L ** 3 / (st.nu * st.nu) * st.Pr;
      rows.push(['Rayleigh-Zahl <i>Ra</i>', Ra, '']);
      if (fall === 'wand') Nu = (0.825 + 0.387 * Ra ** (1 / 6) / (1 + (0.492 / st.Pr) ** (9 / 16)) ** (8 / 27)) ** 2;
      else Nu = (0.6 + 0.387 * Ra ** (1 / 6) / (1 + (0.559 / st.Pr) ** (9 / 16)) ** (8 / 27)) ** 2;
    }
    const a = Nu * st.lam / L;
    return { rows: [...rows, ['Prandtl-Zahl <i>Pr</i>', st.Pr, ''], ['Wärmeleitfähigkeit <i>λ</i>', st.lam, 'W/(m·K)'], ['Nußelt-Zahl <i>Nu</i>', Nu, '', 1], ['Wärmeübergangskoeffizient <i>α</i>', a, 'W/(m²·K)', 1], ['Wärmestromdichte <i>q̇</i>', a * (Tw - Tf), 'W/m²', 1]], notes: ['Stoffwerte bei der mittleren Temperatur ' + fmt((Tf + Tw) / 2) + ' °C.'] };
  }
});

calc('strahlung', {
  fields: [
    { id: 'k', label: 'Anordnung', val: 'klein', wide: 1, opts: [['klein', 'kleiner Körper in großem Raum'], ['platten', 'zwei parallele große Platten'], ['umschl', 'Körper 1 von Fläche 2 umschlossen']] },
    { id: 'e1', label: 'Emissionsgrad <i>ε</i><sub>1</sub>', val: 0.9 },
    { id: 'e2', label: 'Emissionsgrad <i>ε</i><sub>2</sub>', val: 0.9, when: s => s('k') !== 'klein' },
    { id: 'A1', label: 'Fläche <i>A</i><sub>1</sub>', unit: 'm²', val: 2 },
    { id: 'A2', label: 'Fläche <i>A</i><sub>2</sub>', unit: 'm²', val: 6, when: s => s('k') === 'umschl' },
    { id: 'T1', label: 'Temperatur <i>ϑ</i><sub>1</sub>', unit: '°C', val: 200 },
    { id: 'T2', label: 'Temperatur <i>ϑ</i><sub>2</sub>', unit: '°C', val: 20 }
  ],
  compute(g, s) {
    const e1 = pos(g('e1'), 'ε₁'), A1 = pos(g('A1'), 'A₁'), T1 = fin(g('T1'), 'ϑ₁') + 273.15, T2 = fin(g('T2'), 'ϑ₂') + 273.15, k = s('k');
    if (e1 > 1) fail('Emissionsgrade liegen zwischen 0 und 1.');
    let e12 = e1;
    if (k === 'platten') e12 = 1 / (1 / e1 + 1 / pos(g('e2'), 'ε₂') - 1);
    if (k === 'umschl') { const A2 = pos(g('A2'), 'A₂'); if (A2 < A1) fail('Die umschließende Fläche muss mindestens so groß wie A₁ sein.'); e12 = 1 / (1 / e1 + A1 / A2 * (1 / pos(g('e2'), 'ε₂') - 1)); }
    const sg = 5.670e-8, q = e12 * sg * (T1 ** 4 - T2 ** 4), aS = T1 !== T2 ? q / (T1 - T2) : 4 * e12 * sg * T1 ** 3;
    return { rows: [['Strahlungsaustauschzahl <i>ε</i><sub>12</sub>', e12, ''], ['Wärmestromdichte <i>q̇</i>', q, 'W/m²', 1], ['Wärmestrom <i>Q̇</i>', q * A1, 'W', 1], ['äquivalentes <i>α</i><sub>Str</sub>', aS, 'W/(m²·K)', 1], ['Abstrahlung schwarzer Körper bei ϑ₁', sg * T1 ** 4, 'W/m²']] };
  }
});

calc('abkuehlung', {
  fields: [
    { id: 'mode', label: 'Aufgabe', val: 'beh', wide: 1, opts: [['beh', 'Behälter abkühlen oder aufheizen'], ['rohr', 'Wasserleitung einfrieren']] },
    { id: 'm', label: 'Masse des Inhalts <i>m</i>', unit: 'kg', val: 500, when: s => s('mode') === 'beh' },
    { id: 'c', label: 'spez. Wärmekapazität <i>c</i>', unit: 'kJ/(kg·K)', val: 4.19, when: s => s('mode') === 'beh' },
    { id: 'k', label: 'Wärmedurchgang <i>k</i>', unit: 'W/(m²·K)', val: 1.5, when: s => s('mode') === 'beh' },
    { id: 'A', label: 'Oberfläche <i>A</i>', unit: 'm²', val: 4, when: s => s('mode') === 'beh' },
    { id: 'di', label: 'Innendurchmesser Rohr', unit: 'mm', val: 50, when: s => s('mode') === 'rohr' },
    { id: 'kl', label: 'Wärmedurchgang <i>k<sub>l</sub></i>', unit: 'W/(m·K)', val: 0.3, when: s => s('mode') === 'rohr', hint: 'gedämmtes Rohr, siehe Wärmedurchgang' },
    { id: 'T0', label: 'Anfangstemperatur', unit: '°C', val: 80, when: s => s('mode') === 'beh' },
    { id: 'T0r', label: 'Wassertemperatur am Anfang', unit: '°C', val: 10, when: s => s('mode') === 'rohr' },
    { id: 'Tu', label: 'Umgebungstemperatur', unit: '°C', val: 10, when: s => s('mode') === 'beh' },
    { id: 'Tur', label: 'Außentemperatur', unit: '°C', val: -15, when: s => s('mode') === 'rohr' },
    { id: 'Tz', label: 'Zieltemperatur', unit: '°C', val: 40, when: s => s('mode') === 'beh' }
  ],
  compute(g, s) {
    if (s('mode') === 'rohr') {
      const di = pos(g('di'), 'Innendurchmesser') / 1000, kl = pos(g('kl'), 'kl'), T0 = fin(g('T0r'), 'Wassertemperatur'), Tu = fin(g('Tur'), 'Außentemperatur');
      if (Tu >= 0) fail('Bei Außentemperaturen über 0 °C friert die Leitung nicht ein.');
      if (T0 < 0) fail('Die Wassertemperatur am Anfang muss mindestens 0 °C sein.');
      const mp = 1000 * PI * di * di / 4, t1 = mp * 4190 / kl * Math.log((T0 - Tu) / (0 - Tu)), t2 = mp * 334000 / (kl * (0 - Tu));
      return { rows: [['Wassermasse je Meter', mp, 'kg/m'], ['Zeit bis 0 °C', t1 / 3600, 'h', 1], ['Zeit zum vollständigen Durchfrieren', t2 / 3600, 'h'], ['Gesamtzeit bis zum Einfrieren', (t1 + t2) / 3600, 'h', 1]], notes: ['Die Leitung friert schon vorher zu, sobald der Querschnitt teilweise vereist ist; Eisbildung beginnt nach t₁.'] };
    }
    const m = pos(g('m'), 'm'), c = pos(g('c'), 'c') * 1000, k = pos(g('k'), 'k'), A = pos(g('A'), 'A'), T0 = fin(g('T0'), 'Anfangstemperatur'), Tu = fin(g('Tu'), 'Umgebungstemperatur'), Tz = g('Tz');
    const tau = m * c / (k * A);
    let tz = NaN;
    if (isFinite(Tz)) { const r = (T0 - Tu) / (Tz - Tu); if (r > 1) tz = tau * Math.log(r); }
    const tm = Math.max(3 * tau, isFinite(tz) ? tz * 1.2 : 0);
    const pts = Array.from({ length: 121 }, (_, i) => { const t = tm * i / 120; return [t / 3600, Tu + (T0 - Tu) * Math.exp(-t / tau)]; });
    const fig = plot({ h: 220, x: [0, tm / 3600], y: padRange(Math.min(T0, Tu), Math.max(T0, Tu), 0.1, false), xl: 't in h', yl: 'ϑ in °C', ny: 4,
      series: [{ pts: [[0, Tu], [tm / 3600, Tu]], cls: 's3' }, { pts, cls: 's1' }], points: isFinite(tz) ? [{ x: tz / 3600, y: Tz, label: `${fmt(tz / 3600, 3)} h` }] : [], title: 'Temperaturverlauf' });
    return { rows: [['Zeitkonstante <i>τ</i>', tau / 3600, 'h', 1], ['Zeit bis zur Zieltemperatur', isFinite(tz) ? tz / 3600 : 'nicht erreichbar', 'h', 1], ['Anfangswärmestrom', k * A * abs(T0 - Tu), 'W'], ['abgegebene Wärme bis Zieltemperatur', isFinite(Tz) ? m * c * abs(T0 - Tz) / 3.6e6 : '–', 'kWh']], fig };
  }
});

calc('feuchteluft', {
  fields: [
    { id: 'T', label: 'Temperatur <i>ϑ</i><sub>1</sub>', unit: '°C', val: 20 },
    { id: 'phi', label: 'relative Feuchte <i>φ</i><sub>1</sub>', unit: '%', val: 60 },
    { id: 'p', label: 'Luftdruck <i>p</i>', unit: 'hPa', val: 1013.25 },
    { id: 'T2', label: 'Temperatur nach Erwärmen/Kühlen <i>ϑ</i><sub>2</sub>', unit: '°C', val: 8 }
  ],
  compute(g) {
    const T = fin(g('T'), 'ϑ₁'), phi = nn(g('phi'), 'φ') / 100, p = pos(g('p'), 'p') * 100, T2 = g('T2');
    if (T < -45 || T > 60) fail('Die Magnus-Formel ist hier für −45 bis +60 °C hinterlegt.');
    if (phi > 1) fail('Die relative Feuchte liegt zwischen 0 und 100 %.');
    const ps = magnus(T), pd = phi * ps, x = 0.622 * pd / (p - pd), TK = T + 273.15;
    const lg = Math.log(pd / 611.2), Td = pd > 0 ? 243.12 * lg / (17.62 - lg) : NaN;
    const h = 1.006 * T + x * (2501 + 1.86 * T), rho = (p - pd) / (287.1 * TK) + pd / (461.5 * TK);
    const rows = [
      ['Sättigungsdampfdruck <i>p<sub>s</sub></i>', ps / 100, 'hPa'], ['Dampfteildruck <i>p<sub>D</sub></i>', pd / 100, 'hPa'], ['Wassergehalt <i>x</i>', x * 1000, 'g/kg', 1],
      ['absolute Feuchte', pd / (461.5 * TK) * 1000, 'g/m³'], ['Taupunkt <i>ϑ<sub>τ</sub></i>', Td, '°C', 1], ['Enthalpie <i>h</i><sub>1+x</sub>', h, 'kJ/kg', 1], ['Dichte feuchter Luft', rho, 'kg/m³']
    ];
    const notes = [];
    if (isFinite(T2)) {
      if (T2 < -45 || T2 > 60) fail('ϑ₂ liegt außerhalb von −45 bis +60 °C.');
      let x2 = x, cond = 0;
      const xs2 = 0.622 * magnus(T2) / (p - magnus(T2));
      if (x > xs2) { cond = x - xs2; x2 = xs2; }
      const pd2 = x2 * p / (0.622 + x2), h2 = 1.006 * T2 + x2 * (2501 + 1.86 * T2);
      rows.push({ h: 'Zustand 2' }, ['relative Feuchte <i>φ</i><sub>2</sub>', pd2 / magnus(T2) * 100, '%', 1], ['Wassergehalt <i>x</i><sub>2</sub>', x2 * 1000, 'g/kg'], ['Enthalpieänderung Δ<i>h</i>', h2 - h, 'kJ/kg', 1], ['ausfallendes Kondensat', cond * 1000, 'g/kg']);
      if (cond > 0) notes.push('Beim Kühlen unter den Taupunkt fällt Wasser aus; Zustand 2 ist gesättigt (φ = 100 %).');
    }
    return { rows, notes };
  }
});

/* ================= STRÖMUNG ================= */
calc('hydrostatik', {
  fields: [
    { id: 'm', label: 'Aufgabe', val: 'wand', wide: 1, opts: [['wand', 'Kraft auf senkrechte Rechteckwand'], ['auf', 'Auftrieb und Schwimmen'], ['presse', 'hydraulische Presse']] },
    { id: 'rho', label: 'Dichte der Flüssigkeit <i>ρ</i>', unit: 'kg/m³', val: 1000, when: s => s('m') !== 'presse' },
    { id: 'b', label: 'Wandbreite <i>b</i>', unit: 'm', val: 2, when: s => s('m') === 'wand' },
    { id: 'h', label: 'Wandhöhe <i>h</i>', unit: 'm', val: 1.5, when: s => s('m') === 'wand' },
    { id: 'h0', label: 'Tiefe der Oberkante <i>h</i><sub>0</sub>', unit: 'm', val: 0, when: s => s('m') === 'wand' },
    { id: 'V', label: 'Körpervolumen <i>V</i>', unit: 'dm³', val: 50, when: s => s('m') === 'auf' },
    { id: 'mk', label: 'Körpermasse <i>m</i>', unit: 'kg', val: 30, when: s => s('m') === 'auf' },
    { id: 'd1', label: 'Pumpenkolben <i>d</i><sub>1</sub>', unit: 'mm', val: 20, when: s => s('m') === 'presse' },
    { id: 'd2', label: 'Presskolben <i>d</i><sub>2</sub>', unit: 'mm', val: 200, when: s => s('m') === 'presse' },
    { id: 'F1', label: 'Kraft am Pumpenkolben <i>F</i><sub>1</sub>', unit: 'N', val: 300, when: s => s('m') === 'presse' },
    { id: 's1', label: 'Hub Pumpenkolben <i>s</i><sub>1</sub>', unit: 'mm', val: 50, when: s => s('m') === 'presse' }
  ],
  compute(g, s) {
    const m = s('m');
    if (m === 'wand') {
      const rho = pos(g('rho'), 'ρ'), b = pos(g('b'), 'b'), h = pos(g('h'), 'h'), h0 = nn(or0(g('h0')), 'h₀');
      const ys = h0 + h / 2, A = b * h, F = rho * 9.81 * ys * A, yD = ys + (b * h ** 3 / 12) / (ys * A);
      return { rows: [['Druck an der Unterkante', rho * 9.81 * (h0 + h) / 1e5, 'bar'], ['Schwerpunkttiefe <i>h<sub>S</sub></i>', ys, 'm'], ['Kraft auf die Wand <i>F</i>', F / 1000, 'kN', 1], ['Druckmittelpunkt unter der Oberfläche', yD, 'm', 1], ['Abstand von der Unterkante', h0 + h - yD, 'm']] };
    }
    if (m === 'auf') {
      const rho = pos(g('rho'), 'ρ'), V = pos(g('V'), 'V') / 1000, mk = pos(g('mk'), 'm');
      const FA = rho * 9.81 * V, G = mk * 9.81, rk = mk / V;
      return { chips: [[rk < rho ? 'Körper schwimmt' : rk > rho ? 'Körper sinkt' : 'Körper schwebt', rk < rho ? 'good' : rk > rho ? 'bad' : 'warn']], rows: [['Dichte des Körpers', rk, 'kg/m³'], ['Auftrieb voll eingetaucht <i>F<sub>A</sub></i>', FA, 'N', 1], ['Gewichtskraft <i>G</i>', G, 'N'], ['resultierende Kraft (+ nach oben)', FA - G, 'N', 1], ['eingetauchter Anteil beim Schwimmen', rk < rho ? rk / rho * 100 : 100, '%']] };
    }
    const d1 = pos(g('d1'), 'd₁'), d2 = pos(g('d2'), 'd₂'), F1 = pos(g('F1'), 'F₁'), s1 = or0(g('s1'));
    const A1 = PI * d1 * d1 / 4, A2 = PI * d2 * d2 / 4;
    return { rows: [['Druck <i>p</i>', F1 / A1 * 10, 'bar'], ['Übersetzung <i>A</i><sub>2</sub>/<i>A</i><sub>1</sub>', A2 / A1, ''], ['Presskraft <i>F</i><sub>2</sub>', F1 * A2 / A1 / 1000, 'kN', 1], ['Hub des Presskolbens', s1 * A1 / A2, 'mm', 1], ['Hübe für 10 mm Pressweg', 10 * A2 / A1 / (s1 || 1), '']] };
  }
});

calc('druckmessung', {
  fields: [
    { id: 'm', label: 'Messverfahren', val: 'prandtl', wide: 1, opts: [['urohr', 'U-Rohr-Manometer'], ['schraeg', 'Schrägrohrmanometer'], ['prandtl', 'Prandtl-Rohr (Geschwindigkeit)'], ['blende', 'Blende (Durchfluss)']] },
    { id: 'rM', label: 'Dichte Messflüssigkeit <i>ρ<sub>M</sub></i>', unit: 'kg/m³', val: 998, when: s => s('m') === 'urohr' || s('m') === 'schraeg' },
    { id: 'rF', label: 'Dichte Medium <i>ρ<sub>F</sub></i>', unit: 'kg/m³', val: 1.2, when: s => s('m') === 'urohr' || s('m') === 'schraeg' },
    { id: 'dh', label: 'Höhendifferenz Δ<i>h</i>', unit: 'mm', val: 120, when: s => s('m') === 'urohr' },
    { id: 'l', label: 'Ablesung im Schrägrohr <i>l</i>', unit: 'mm', val: 150, when: s => s('m') === 'schraeg' },
    { id: 'al', label: 'Neigungswinkel <i>α</i>', unit: '°', val: 10, when: s => s('m') === 'schraeg' },
    { id: 'dp', label: 'Staudruck', unit: 'Pa', val: 240, when: s => s('m') === 'prandtl' },
    { id: 'rho', label: 'Dichte des Mediums <i>ρ</i>', unit: 'kg/m³', val: 1.2, when: s => s('m') === 'prandtl' || s('m') === 'blende' },
    { id: 'D', label: 'Rohrdurchmesser <i>D</i>', unit: 'mm', val: 100, when: s => s('m') === 'blende' },
    { id: 'd', label: 'Blendenbohrung <i>d</i>', unit: 'mm', val: 60, when: s => s('m') === 'blende' },
    { id: 'dpb', label: 'Wirkdruck Δ<i>p</i>', unit: 'mbar', val: 10, when: s => s('m') === 'blende' },
    { id: 'C', label: 'Durchflusskoeffizient <i>C</i>', val: 0.6, when: s => s('m') === 'blende' }
  ],
  compute(g, s) {
    const m = s('m');
    if (m === 'urohr' || m === 'schraeg') {
      const rM = pos(g('rM'), 'ρM'), rF = nn(g('rF'), 'ρF');
      const dh = m === 'urohr' ? pos(g('dh'), 'Δh') : pos(g('l'), 'l') * Math.sin(pos(g('al'), 'α') * DEG);
      const dp = (rM - rF) * 9.81 * dh / 1000;
      return { rows: [m === 'schraeg' ? ['senkrechte Höhe Δ<i>h</i>', dh, 'mm'] : null, ['Druckdifferenz Δ<i>p</i>', dp, 'Pa', 1], ['', dp / 100, 'mbar'], ['bei Luft entspricht das <i>v</i>', sqrt(2 * dp / 1.2), 'm/s']] };
    }
    if (m === 'prandtl') { const dp = nn(g('dp'), 'Staudruck'), rho = pos(g('rho'), 'ρ'); return { rows: [['Geschwindigkeit <i>v</i>', sqrt(2 * dp / rho), 'm/s', 1], ['', sqrt(2 * dp / rho) * 3.6, 'km/h']] }; }
    const D = pos(g('D'), 'D'), d = pos(g('d'), 'd'), dp = pos(g('dpb'), 'Δp') * 100, rho = pos(g('rho'), 'ρ'), C = pos(g('C'), 'C');
    if (d >= D) fail('Die Blendenbohrung muss kleiner als der Rohrdurchmesser sein.');
    const be = d / D, qm = C / sqrt(1 - be ** 4) * PI * (d / 1000) ** 2 / 4 * sqrt(2 * dp * rho);
    return { rows: [['Durchmesserverhältnis <i>β</i>', be, ''], ['Massenstrom <i>q<sub>m</sub></i>', qm, 'kg/s', 1], ['Volumenstrom', qm / rho * 3600, 'm³/h', 1], ['mittlere Rohrgeschwindigkeit', qm / rho / (PI * (D / 1000) ** 2 / 4), 'm/s'], ['bleibender Druckverlust ≈', (1 - be ** 1.9) * dp / 100, 'mbar']], notes: ['Empfohlener Bereich nach ISO 5167: 0,2 ≤ β ≤ 0,75.'] };
  }
});

calc('kvwert', {
  fields: [
    { id: 'm', label: 'Aufgabe', val: 'fl', wide: 1, opts: [['fl', 'Kv für Flüssigkeit'], ['gas', 'Kv für Gas'], ['netz', 'Ventile in Reihe und parallel']] },
    { id: 'Q', label: 'Volumenstrom <i>V̇</i>', unit: 'm³/h', val: 12, when: s => s('m') === 'fl' },
    { id: 'dp', label: 'Druckverlust Δ<i>p</i>', unit: 'bar', val: 0.5, when: s => s('m') === 'fl' },
    { id: 'rho', label: 'Dichte <i>ρ</i>', unit: 'kg/m³', val: 998, when: s => s('m') === 'fl' },
    { id: 'Qn', label: 'Normvolumenstrom <i>V̇<sub>n</sub></i>', unit: 'm³/h', val: 200, when: s => s('m') === 'gas' },
    { id: 'rn', label: 'Normdichte <i>ρ<sub>n</sub></i>', unit: 'kg/m³', val: 1.293, when: s => s('m') === 'gas' },
    { id: 'T1', label: 'Temperatur vor dem Ventil', unit: '°C', val: 20, when: s => s('m') === 'gas' },
    { id: 'p1', label: 'Druck vor dem Ventil (abs.)', unit: 'bar', val: 6, when: s => s('m') === 'gas' },
    { id: 'p2', label: 'Druck nach dem Ventil (abs.)', unit: 'bar', val: 5, when: s => s('m') === 'gas' },
    { id: 'dn', label: 'Nennweite für ζ (Innen-Ø)', unit: 'mm', val: 50, when: s => s('m') !== 'netz', hint: 'optional' },
    { id: 'k1', label: '<i>K<sub>v</sub></i> Ventil 1', unit: 'm³/h', val: 16, when: s => s('m') === 'netz' },
    { id: 'k2', label: '<i>K<sub>v</sub></i> Ventil 2', unit: 'm³/h', val: 25, when: s => s('m') === 'netz' },
    { id: 'k3', label: '<i>K<sub>v</sub></i> Ventil 3', unit: 'm³/h', val: 0, when: s => s('m') === 'netz' }
  ],
  compute(g, s) {
    const m = s('m');
    if (m === 'netz') {
      const ks = [g('k1'), g('k2'), g('k3')].filter(v => isFinite(v) && v > 0);
      if (!ks.length) fail('Mindestens einen Kv-Wert eingeben.');
      return { rows: [['Reihenschaltung', 1 / sqrt(ks.reduce((t, k) => t + 1 / (k * k), 0)), 'm³/h', 1], ['Parallelschaltung', ks.reduce((t, k) => t + k, 0), 'm³/h', 1]] };
    }
    let Kv, rows = [], chips = [];
    if (m === 'fl') { Kv = pos(g('Q'), 'V̇') * sqrt(pos(g('rho'), 'ρ') / 1000 / pos(g('dp'), 'Δp')); }
    else {
      const Qn = pos(g('Qn'), 'V̇n'), rn = pos(g('rn'), 'ρn'), T1 = fin(g('T1'), 'Temperatur') + 273.15, p1 = pos(g('p1'), 'p₁'), p2 = nn(g('p2'), 'p₂');
      if (p2 >= p1) fail('Der Druck nach dem Ventil muss kleiner als davor sein.');
      const krit = p2 <= p1 / 2;
      Kv = krit ? Qn / (257 * p1) * sqrt(rn * T1) : Qn / 514 * sqrt(rn * T1 / ((p1 - p2) * p2));
      chips.push([krit ? 'überkritisch (Schallgeschwindigkeit)' : 'unterkritisch', krit ? 'warn' : '']);
    }
    rows.push(['erforderlicher <i>K<sub>v</sub></i>', Kv, 'm³/h', 1], ['empfohlener <i>K<sub>vs</sub></i> (Kv/0,7)', Kv / 0.7, 'm³/h'], ['<i>C<sub>v</sub></i> (US gal/min)', 1.156 * Kv, '']);
    const dn = g('dn');
    if (isFinite(dn) && dn > 0) rows.push(['Verlustbeiwert <i>ζ</i> bezogen auf DN', 0.0016 * dn ** 4 / (Kv * Kv), '']);
    return { chips, rows };
  }
});

calc('zeta', {
  fields: [
    { id: 'm', label: 'Einbauteil', val: 'bogen', wide: 1, opts: [['erw', 'plötzliche Erweiterung'], ['ver', 'plötzliche Verengung'], ['bogen', 'Rohrbogen (gerundet)'], ['knie', 'Kniestück (scharfkantig)']] },
    { id: 'd1', label: 'Durchmesser vorher <i>d</i><sub>1</sub>', unit: 'mm', val: 50, when: s => s('m') === 'erw' || s('m') === 'ver' },
    { id: 'd2', label: 'Durchmesser nachher <i>d</i><sub>2</sub>', unit: 'mm', val: 80, when: s => s('m') === 'erw' || s('m') === 'ver' },
    { id: 'Rd', label: 'Krümmungsverhältnis <i>R</i>/<i>d</i>', val: 1.5, when: s => s('m') === 'bogen' },
    { id: 'del', label: 'Umlenkwinkel <i>δ</i>', unit: '°', val: 90, when: s => s('m') === 'bogen' || s('m') === 'knie' },
    { id: 'v', label: 'Geschwindigkeit im kleineren Querschnitt', unit: 'm/s', val: 2 },
    { id: 'rho', label: 'Dichte <i>ρ</i>', unit: 'kg/m³', val: 998 }
  ],
  compute(g, s) {
    const m = s('m'), v = nn(g('v'), 'v'), rho = pos(g('rho'), 'ρ');
    let z, extra = [];
    if (m === 'erw' || m === 'ver') {
      const d1 = pos(g('d1'), 'd₁'), d2 = pos(g('d2'), 'd₂');
      if (m === 'erw' && d2 <= d1) fail('Bei einer Erweiterung muss d₂ größer als d₁ sein.');
      if (m === 'ver' && d2 >= d1) fail('Bei einer Verengung muss d₂ kleiner als d₁ sein.');
      const ar = (Math.min(d1, d2) / Math.max(d1, d2)) ** 2;
      z = m === 'erw' ? (1 - ar) ** 2 : 0.5 * (1 - ar) ** 0.75;
      extra = [['Flächenverhältnis klein/groß', ar, '']];
    } else if (m === 'bogen') {
      const Rd = pos(g('Rd'), 'R/d'), del = pos(g('del'), 'δ');
      const z90 = interp([1, 1.5, 2, 3, 4, 6, 10], [0.21, 0.17, 0.14, 0.12, 0.11, 0.09, 0.11], Rd), kd = interp([0, 30, 45, 60, 90, 180], [0, 0.4, 0.6, 0.78, 1, 1.4], del);
      z = z90 * kd; extra = [['<i>ζ</i><sub>90</sub>', z90, ''], ['Winkelfaktor <i>k<sub>δ</sub></i>', kd, '']];
      if (Rd < 1) extra.push(['Hinweis', 'R/d < 1 außerhalb der Tabelle', '']);
    } else {
      const sd = Math.sin(pos(g('del'), 'δ') * DEG / 2); z = 0.946 * sd * sd + 2.05 * sd ** 4;
    }
    return { rows: [...extra, ['Verlustbeiwert <i>ζ</i>', z, '', 1], ['Druckverlust Δ<i>p</i>', z * rho / 2 * v * v, 'Pa', 1], ['', z * rho / 2 * v * v / 100, 'mbar'], ['Verlusthöhe', z * v * v / (2 * 9.81), 'm']] };
  }
});

/* ================= FLUIDTECHNIK ================= */
calc('hydraulik', {
  fields: [
    { id: 'm', label: 'Komponente', val: 'zyl', wide: 1, opts: [['pumpe', 'Hydraulikpumpe'], ['motor', 'Hydromotor'], ['zyl', 'Differentialzylinder']] },
    { id: 'Vg', label: 'Verdrängervolumen <i>V<sub>g</sub></i>', unit: 'cm³', val: 28, when: s => s('m') !== 'zyl' },
    { id: 'n', label: 'Antriebsdrehzahl <i>n</i>', unit: 'min⁻¹', val: 1450, when: s => s('m') === 'pumpe' },
    { id: 'Q', label: 'Volumenstrom <i>Q</i>', unit: 'l/min', val: 40, when: s => s('m') !== 'pumpe' },
    { id: 'p', label: 'Druck(differenz) <i>p</i>', unit: 'bar', val: 160 },
    { id: 'ev', label: 'volumetr. Wirkungsgrad', val: 0.95, when: s => s('m') !== 'zyl' },
    { id: 'eg', label: 'Gesamtwirkungsgrad', val: 0.85, when: s => s('m') !== 'zyl' },
    { id: 'D', label: 'Kolbendurchmesser <i>D</i>', unit: 'mm', val: 63, when: s => s('m') === 'zyl' },
    { id: 'd', label: 'Stangendurchmesser <i>d</i>', unit: 'mm', val: 36, when: s => s('m') === 'zyl' },
    { id: 'hub', label: 'Hub', unit: 'mm', val: 400, when: s => s('m') === 'zyl' },
    { id: 'ehm', label: 'hydr.-mech. Wirkungsgrad', val: 0.95, when: s => s('m') === 'zyl' }
  ],
  compute(g, s) {
    const m = s('m'), p = pos(g('p'), 'p');
    if (m === 'pumpe' || m === 'motor') {
      const Vg = pos(g('Vg'), 'Vg'), ev = pos(g('ev'), 'ηvol'), eg = pos(g('eg'), 'ηges'), ehm = eg / ev;
      if (ev > 1 || eg > ev) fail('Die Wirkungsgrade müssen ≤ 1 sein, und der Gesamtwirkungsgrad kann nicht über dem volumetrischen liegen.');
      if (m === 'pumpe') {
        const n = pos(g('n'), 'n'), Q = Vg * n * ev / 1000;
        return { rows: [['Volumenstrom <i>Q</i>', Q, 'l/min', 1], ['hydraulische Leistung', Q * p / 600, 'kW'], ['Antriebsleistung <i>P<sub>an</sub></i>', Q * p / (600 * eg), 'kW', 1], ['Antriebsmoment <i>T</i>', Vg * p / (20 * PI * ehm), 'N·m', 1], ['hydr.-mech. Wirkungsgrad', ehm, '']] };
      }
      const Q = pos(g('Q'), 'Q'), n = Q * 1000 * ev / Vg;
      return { rows: [['Drehzahl <i>n</i>', n, 'min⁻¹', 1], ['Abtriebsmoment <i>T</i>', Vg * p * ehm / (20 * PI), 'N·m', 1], ['zugeführte Leistung', Q * p / 600, 'kW'], ['Abtriebsleistung', Q * p * eg / 600, 'kW', 1]] };
    }
    const D = pos(g('D'), 'D'), d = nn(g('d'), 'd'), Q = pos(g('Q'), 'Q'), hub = or0(g('hub')), ehm = pos(g('ehm'), 'ηhm');
    if (d >= D) fail('Der Stangendurchmesser muss kleiner als der Kolbendurchmesser sein.');
    const AK = PI * D * D / 4, AR = PI * (D * D - d * d) / 4, Qm = Q / 60000;
    const va = Qm / (AK * 1e-6), ve = Qm / (AR * 1e-6);
    return { rows: [['Kolbenfläche / Ringfläche', `${fmt(AK / 100)} / ${fmt(AR / 100)}`, 'cm²'], ['Flächenverhältnis <i>φ</i>', AK / AR, ''], ['Kraft ausfahren', p * 0.1 * AK * ehm / 1000, 'kN', 1], ['Kraft einfahren', p * 0.1 * AR * ehm / 1000, 'kN', 1], ['Geschwindigkeit aus / ein', `${fmt(va, 3)} / ${fmt(ve, 3)}`, 'm/s'], ['Hubzeit aus / ein', hub ? `${fmt(hub / 1000 / va, 3)} / ${fmt(hub / 1000 / ve, 3)}` : '–', 's'], ['Ölvolumen für einen Hub aus', AK * hub / 1e6, 'l']] };
  }
});

calc('pneumatik', {
  fields: [
    { id: 'w', label: 'Zylinder', val: 'doppelt', opts: [['doppelt', 'doppeltwirkend'], ['einfach', 'einfachwirkend']] },
    { id: 'D', label: 'Kolbendurchmesser <i>D</i>', unit: 'mm', val: 50 },
    { id: 'd', label: 'Stangendurchmesser <i>d</i>', unit: 'mm', val: 20 },
    { id: 'hub', label: 'Hub <i>s</i>', unit: 'mm', val: 200 },
    { id: 'pe', label: 'Betriebsdruck (Überdruck)', unit: 'bar', val: 6 },
    { id: 'eta', label: 'Wirkungsgrad <i>η</i>', val: 0.9 },
    { id: 'nH', label: 'Arbeitsspiele pro Minute', unit: '1/min', val: 20 },
    { id: 'Fr', label: 'Rückstellfeder (einfachwirkend)', unit: 'N', val: 60, when: s => s('w') === 'einfach' },
    { h: 'Speicher' },
    { id: 't', label: 'Überbrückungszeit <i>t</i>', unit: 's', val: 60 },
    { id: 'dpB', label: 'zulässiger Druckabfall Δ<i>p</i>', unit: 'bar', val: 1 }
  ],
  compute(g, s) {
    const D = pos(g('D'), 'D'), d = nn(g('d'), 'd'), hub = pos(g('hub'), 's'), pe = pos(g('pe'), 'pe'), eta = pos(g('eta'), 'η'), nH = nn(g('nH'), 'Arbeitsspiele'), dop = s('w') === 'doppelt';
    if (d >= D) fail('Der Stangendurchmesser muss kleiner als der Kolbendurchmesser sein.');
    const Aa = PI * D * D / 4, Ae = PI * (D * D - d * d) / 4, pn = 1.01325;
    const Fa = pe * 0.1 * Aa * eta - (dop ? 0 : or0(g('Fr'))), Fe = dop ? pe * 0.1 * Ae * eta : or0(g('Fr'));
    const Vn = (Aa + (dop ? Ae : 0)) * hub * 1e-6 * nH * (pe + pn) / pn;
    const t = or0(g('t')), dpB = g('dpB');
    const VB = isFinite(dpB) && dpB > 0 ? Vn / 60000 * t * pn / dpB : NaN;
    return { rows: [['Kraft ausfahren', Fa, 'N', 1], [dop ? 'Kraft einfahren' : 'Federkraft einfahren', Fe, 'N'], ['Luftverbrauch je Arbeitsspiel', (Aa + (dop ? Ae : 0)) * hub * 1e-6 * (pe + pn) / pn, 'Nl'], ['Luftverbrauch', Vn, 'Nl/min', 1], ['', Vn * 0.06, 'Nm³/h'], ['Speichervolumen für die Überbrückung', VB * 1000, 'l', 1]], notes: ['Normzustand hier 1,013 bar; Totvolumina in Leitungen nicht enthalten.'] };
  }
});

calc('pumpe', {
  fields: [
    { id: 'Q', label: 'Förderstrom <i>V̇</i>', unit: 'm³/h', val: 30 },
    { id: 'H', label: 'Förderhöhe <i>H</i>', unit: 'm', val: 32 },
    { id: 'eta', label: 'Pumpenwirkungsgrad', val: 0.72 },
    { id: 'etaM', label: 'Motorwirkungsgrad', val: 0.9 },
    { h: 'Saugseite' },
    { id: 'T', label: 'Wassertemperatur', unit: '°C', val: 40 },
    { id: 'z', label: 'Aufstellhöhe über NN', unit: 'm', val: 500 },
    { id: 'Hs', label: 'geodätische Saughöhe <i>H</i><sub>s,geo</sub>', unit: 'm', val: 3, hint: 'negativ bei Zulauf' },
    { id: 'hV', label: 'Verluste in der Saugleitung <i>h</i><sub>V,s</sub>', unit: 'm', val: 0.8 },
    { id: 'NR', label: '<i>NPSH<sub>R</sub></i> der Pumpe', unit: 'm', val: 2.5 },
    { h: 'Drehzahländerung' },
    { id: 'n1', label: 'Nenndrehzahl', unit: 'min⁻¹', val: 2900 },
    { id: 'n2', label: 'neue Drehzahl', unit: 'min⁻¹', val: 2400 }
  ],
  compute(g) {
    const Q = pos(g('Q'), 'V̇') / 3600, H = pos(g('H'), 'H'), eta = pos(g('eta'), 'η'), etaM = pos(g('etaM'), 'ηM'), T = fin(g('T'), 'Wassertemperatur');
    const w = wasser(T), pD = interp(W_T, W_PD, T) * 1000, z = or0(g('z')), pamb = 101325 * (1 - 0.0065 * z / 288.15) ** 5.255;
    const Hs = or0(g('Hs')), hV = nn(or0(g('hV')), 'hV'), NR = g('NR');
    const Ph = w.rho * 9.81 * Q * H, NA = (pamb - pD) / (w.rho * 9.81) - Hs - hV;
    const res = isFinite(NR) ? NA - NR : NaN;
    const n1 = g('n1'), n2 = g('n2'), r = isFinite(n1) && isFinite(n2) && n1 > 0 ? n2 / n1 : NaN;
    const rows = [
      ['hydraulische Leistung <i>P<sub>h</sub></i>', Ph / 1000, 'kW'], ['Wellenleistung <i>P</i>', Ph / eta / 1000, 'kW', 1], ['elektrische Leistung', Ph / eta / etaM / 1000, 'kW'],
      { h: 'Kavitation' }, ['Luftdruck', pamb / 100, 'hPa'], ['Dampfdruck', pD / 1000, 'kPa'], ['<i>NPSH<sub>A</sub></i>', NA, 'm', 1], ['Reserve <i>NPSH<sub>A</sub></i> − <i>NPSH<sub>R</sub></i>', res, 'm', 1],
      ['größte zulässige Saughöhe (Reserve 0,5 m)', isFinite(NR) ? Hs + res - 0.5 : '–', 'm']
    ];
    if (isFinite(r)) rows.push({ h: 'Bei neuer Drehzahl' }, ['Förderstrom', Q * 3600 * r, 'm³/h'], ['Förderhöhe', H * r * r, 'm'], ['Wellenleistung', Ph / eta / 1000 * r ** 3, 'kW', 1]);
    return { chips: isFinite(res) ? [[res >= 0.5 ? 'kavitationssicher' : res >= 0 ? 'knapp, Reserve unter 0,5 m' : 'Kavitation', res >= 0.5 ? 'good' : res >= 0 ? 'warn' : 'bad']] : [], rows };
  }
});

calc('ventilator', {
  fields: [
    { id: 'Q', label: 'Volumenstrom <i>V̇</i>', unit: 'm³/h', val: 12000 },
    { id: 'dp', label: 'Totaldruckerhöhung Δ<i>p<sub>t</sub></i>', unit: 'Pa', val: 800 },
    { id: 'eta', label: 'Ventilatorwirkungsgrad', val: 0.75 },
    { id: 'etaM', label: 'Motor- und Antriebswirkungsgrad', val: 0.88 },
    { id: 'rho', label: 'Luftdichte <i>ρ</i>', unit: 'kg/m³', val: 1.2 },
    { id: 'D', label: 'Laufraddurchmesser <i>D</i>', unit: 'mm', val: 500 },
    { id: 'n', label: 'Drehzahl <i>n</i>', unit: 'min⁻¹', val: 1450 },
    { h: 'Neuer Betriebszustand' },
    { id: 'n2', label: 'Drehzahl <i>n</i><sub>2</sub>', unit: 'min⁻¹', val: 1200 },
    { id: 'rho2', label: 'Dichte <i>ρ</i><sub>2</sub>', unit: 'kg/m³', val: 1.2 }
  ],
  compute(g) {
    const Q = pos(g('Q'), 'V̇') / 3600, dp = pos(g('dp'), 'Δp'), eta = pos(g('eta'), 'η'), etaM = pos(g('etaM'), 'ηM'), rho = pos(g('rho'), 'ρ'), D = pos(g('D'), 'D') / 1000, n = pos(g('n'), 'n') / 60;
    const PL = Q * dp, PW = PL / eta, u = PI * D * n;
    const rn = or0(g('n2')) / 60 / n, rr = (g('rho2') || rho) / rho;
    return {
      rows: [
        ['Förderleistung <i>P<sub>L</sub></i>', PL / 1000, 'kW'], ['Wellenleistung <i>P<sub>W</sub></i>', PW / 1000, 'kW', 1], ['Motorleistung', PW / etaM / 1000, 'kW'],
        ['Umfangsgeschwindigkeit <i>u</i>', u, 'm/s'], ['Lieferzahl <i>φ</i>', Q / (PI / 4 * D * D * u), ''], ['Druckzahl <i>ψ</i>', 2 * dp / (rho * u * u), ''],
        { h: 'Neuer Betriebszustand' }, ['Volumenstrom', Q * 3600 * rn, 'm³/h'], ['Druckerhöhung', dp * rr * rn * rn, 'Pa'], ['Wellenleistung', PW / 1000 * rr * rn ** 3, 'kW', 1]
      ]
    };
  }
});

/* ================= LÜFTUNG & ROHRLEITUNGEN ================= */
calc('luftzustand', {
  fields: [
    { id: 'h', label: 'Höhe über NN', unit: 'm', val: 500 },
    { id: 'T', label: 'Lufttemperatur', unit: '°C', val: 25 },
    { id: 'phi', label: 'relative Feuchte', unit: '%', val: 50 },
    { id: 'Vn', label: 'Normvolumenstrom <i>V̇<sub>n</sub></i>', unit: 'm³/h', val: 1000, hint: 'DIN 1343: 0 °C, 1,01325 bar' },
    { id: 'pu', label: 'Überdruck in der Leitung', unit: 'bar', val: 0 }
  ],
  compute(g) {
    const h = fin(g('h'), 'Höhe'), T = fin(g('T'), 'Temperatur'), phi = nn(or0(g('phi')), 'φ') / 100, Vn = nn(or0(g('Vn')), 'V̇n'), pu = or0(g('pu'));
    if (h > 11000) fail('Die barometrische Höhenformel gilt hier bis 11 000 m.');
    const p = 101325 * (1 - 0.0065 * h / 288.15) ** 5.255, TK = T + 273.15, ps = T > -45 && T < 60 ? magnus(T) : 0;
    const rt = p / (287.1 * TK), rf = (p - phi * ps) / (287.1 * TK) + phi * ps / (461.5 * TK);
    const pB = p + pu * 1e5, VB = Vn * 101325 / pB * TK / 273.15;
    return { rows: [['Luftdruck', p / 100, 'hPa', 1], ['Dichte trockene Luft', rt, 'kg/m³', 1], ['Dichte feuchte Luft', rf, 'kg/m³'], ['Dichte bezogen auf Meereshöhe, 20 °C', rt / 1.204 * 100, '%'], ['Betriebsvolumenstrom <i>V̇<sub>B</sub></i>', VB, 'm³/h', 1], ['Massenstrom (trocken)', Vn * 1.293 / 3600, 'kg/s']] };
  }
});

calc('raumlueftung', {
  fields: [
    { id: 'Q', label: 'Wärmelast im Raum <i>Q̇</i>', unit: 'kW', val: 25 },
    { id: 'dT', label: 'zul. Erwärmung der Luft Δ<i>ϑ</i>', unit: 'K', val: 10 },
    { id: 'Tz', label: 'Zulufttemperatur', unit: '°C', val: 25 },
    { id: 'VR', label: 'Raumvolumen', unit: 'm³', val: 300 },
    { id: 'v', label: 'Luftgeschwindigkeit im Kanal', unit: 'm/s', val: 6 },
    { id: 'z', label: '<i>ζ</i> der Zuluftöffnung (Gitter)', val: 3 },
    { id: 'dp', label: 'zul. Druckverlust der Öffnung', unit: 'Pa', val: 30 }
  ],
  compute(g) {
    const Q = pos(g('Q'), 'Q̇') * 1000, dT = pos(g('dT'), 'Δϑ'), Tz = fin(g('Tz'), 'Zulufttemperatur'), VR = g('VR'), v = pos(g('v'), 'v'), z = g('z'), dp = g('dp');
    const rho = 101325 / (287.1 * (Tz + 273.15)), V = Q / (rho * 1005 * dT);
    const Af = isFinite(z) && isFinite(dp) && dp > 0 ? V * sqrt(z * rho / (2 * dp)) : NaN;
    return { rows: [['Luftdichte', rho, 'kg/m³'], ['Zuluftvolumenstrom', V * 3600, 'm³/h', 1], ['Massenstrom', V * rho, 'kg/s'], ['Luftwechsel', isFinite(VR) && VR > 0 ? V * 3600 / VR : '–', '1/h', 1], ['Kanalquerschnitt', V / v, 'm²', 1], ['quadratischer Kanal, Kantenlänge', sqrt(V / v) * 1000, 'mm'], ['freier Querschnitt der Öffnung', Af, 'm²']], notes: ['Die Abluftöffnung wird wegen der Erwärmung etwas größer ausgelegt (Volumenstrom × T_Abluft/T_Zuluft).'] };
  }
});

calc('rohrleitung', {
  fields: [
    { id: 'Da', label: 'Außendurchmesser <i>D<sub>a</sub></i>', unit: 'mm', val: 114.3 },
    { id: 's', label: 'vorhandene Wanddicke', unit: 'mm', val: 3.6 },
    { id: 'p', label: 'Berechnungsdruck', unit: 'bar', val: 16 },
    { id: 'f', label: 'zulässige Spannung <i>f</i>', unit: 'N/mm²', val: 140 },
    { id: 'z', label: 'Schweißnahtfaktor <i>z</i>', val: 0.85 },
    { id: 'c', label: 'Zuschläge <i>c</i><sub>0</sub> + <i>c</i><sub>1</sub>', unit: 'mm', val: 1 },
    { h: 'Wärmedehnung' },
    { id: 'L', label: 'Leitungslänge zwischen Festpunkten', unit: 'm', val: 40 },
    { id: 'dT', label: 'Temperaturänderung Δ<i>T</i>', unit: 'K', val: 110 },
    { id: 'a', label: 'Wärmeausdehnung <i>α</i>', unit: '10⁻⁶/K', val: 12 },
    { id: 'E', label: 'E-Modul', unit: 'N/mm²', val: 200000 },
    { id: 'sz', label: '<i>σ</i><sub>zul</sub> im Dehnungsschenkel', unit: 'N/mm²', val: 70 }
  ],
  compute(g) {
    const Da = pos(g('Da'), 'Da'), s = pos(g('s'), 'Wanddicke'), p = nn(g('p'), 'p') / 10, f = pos(g('f'), 'f'), z = pos(g('z'), 'z'), c = or0(g('c'));
    const e = p * Da / (2 * f * z + p) + c;
    const L = nn(g('L'), 'L') * 1000, dT = or0(g('dT')), a = pos(g('a'), 'α') * 1e-6, E = pos(g('E'), 'E'), sz = pos(g('sz'), 'σzul');
    const dL = a * L * dT, sig = E * a * dT, Aw = PI * (Da * Da - (Da - 2 * s) ** 2) / 4;
    const LS = sqrt(1.5 * E * Da * abs(dL) / sz);
    return {
      chips: [[s >= e ? 'Wanddicke ausreichend' : 'Wanddicke zu gering', s >= e ? 'good' : 'bad']],
      rows: [['Mindestwanddicke <i>e</i><sub>min</sub>', e, 'mm', 1], ['Wandquerschnitt', Aw, 'mm²'], ['Längenänderung Δ<i>L</i>', dL, 'mm', 1], ['Spannung bei starrer Einspannung', sig, 'N/mm²'], ['Festpunktkraft', sig * Aw / 1000, 'kN', 1], ['Länge des Dehnungsschenkels', LS / 1000, 'm', 1]],
      notes: ['Die Festpunktkraft gilt ohne Kompensation; Innendruckkraft und Reibung an Gleitlagern kommen bei der Festpunktauslegung hinzu.']
    };
  }
});

calc('leckrate', {
  fields: [
    { id: 'V', label: 'Prüfvolumen <i>V</i>', unit: 'l', val: 20 },
    { id: 'dp', label: 'Druckänderung Δ<i>p</i>', unit: 'mbar', val: 5 },
    { id: 't', label: 'Messdauer Δ<i>t</i>', unit: 's', val: 600 },
    { id: 'gas', label: 'Gas', val: 'luft', opts: [['luft', 'Luft (M = 28,96)'], ['he', 'Helium (M = 4,00)'], ['n2', 'Stickstoff (M = 28,01)']] },
    { id: 'T', label: 'Temperatur', unit: '°C', val: 20 }
  ],
  compute(g, s) {
    const V = pos(g('V'), 'V'), dp = pos(g('dp'), 'Δp'), t = pos(g('t'), 'Δt'), T = fin(g('T'), 'Temperatur') + 273.15;
    const M = { luft: 28.96, he: 4.0, n2: 28.01 }[s('gas')];
    const q = V * dp / t, qPa = q * 0.1, mdot = qPa * M / 1000 / (8.314 * T);
    const cls = q >= 1e-1 ? 'tropfend (≥ 10⁻¹)' : q >= 1e-2 ? 'wasserdicht' : q >= 1e-4 ? 'dampfdicht' : q >= 1e-5 ? 'bakteriendicht' : 'gasdicht';
    return { rows: [['Leckrate <i>q<sub>L</sub></i>', q, 'mbar·l/s', 1], ['', qPa, 'Pa·m³/s'], ['Gasvolumen bei Normaldruck', q * 0.987 * 60, 'cm³/min'], ['Massenverlust', mdot * 1000 * 3.156e7, 'g/Jahr', 1], ['Einordnung', cls, '']] };
  }
});

/* ================= AKUSTIK ================= */
const lsum = arr => 10 * Math.log10(arr.reduce((t, L) => t + Math.pow(10, L / 10), 0));
calc('schallpegel', {
  fields: [
    { h: 'Pegeladdition (leere Felder werden ignoriert)' },
    ...[1, 2, 3, 4, 5].map(i => ({ id: 'L' + i, label: `Pegel <i>L</i><sub>${i}</sub>`, unit: 'dB', val: ['85', '82', '78', '', ''][i - 1] })),
    { id: 'nq', label: 'Anzahl gleicher Quellen', val: 1 },
    { h: 'Entfernung' },
    { id: 'Lr', label: 'Pegel im Abstand <i>r</i><sub>1</sub>', unit: 'dB', val: 85 },
    { id: 'r1', label: 'Abstand <i>r</i><sub>1</sub>', unit: 'm', val: 1 },
    { id: 'r2', label: 'Abstand <i>r</i><sub>2</sub>', unit: 'm', val: 10 },
    { id: 'q', label: 'Quellenart', val: 'punkt', opts: [['punkt', 'Punktquelle'], ['linie', 'Linienquelle']] },
    { h: 'Schallleistung → Schalldruck' },
    { id: 'LW', label: 'Schallleistungspegel <i>L<sub>W</sub></i>', unit: 'dB', val: 100 },
    { id: 'r', label: 'Abstand <i>r</i>', unit: 'm', val: 5 },
    { id: 'raum', label: 'Abstrahlung', val: 'halb', opts: [['voll', 'Vollkugel (frei im Raum)'], ['halb', 'Halbkugel (über Boden)']] }
  ],
  compute(g, s) {
    const Ls = [1, 2, 3, 4, 5].map(i => g('L' + i)).filter(isFinite);
    const nq = or0(g('nq')) || 1;
    const sum = Ls.length ? lsum(Ls) + 10 * Math.log10(nq) : NaN;
    const r1v = g('r1'), r2v = g('r2'), Lr = g('Lr'), k = s('q') === 'punkt' ? 20 : 10;
    const L2 = isFinite(Lr) && r1v > 0 && r2v > 0 ? Lr - k * Math.log10(r2v / r1v) : NaN;
    const LW = g('LW'), r = g('r'), S = r > 0 ? (s('raum') === 'voll' ? 4 : 2) * PI * r * r : NaN;
    const Lp = isFinite(LW) ? LW - 10 * Math.log10(S) : NaN;
    return { rows: [['Summenpegel', sum, 'dB', 1], ['Erhöhung gegenüber lautester Quelle', Ls.length ? sum - Math.max(...Ls) : '–', 'dB'], ['Pegel im Abstand <i>r</i><sub>2</sub>', L2, 'dB', 1], ['Pegelabnahme', isFinite(L2) ? Lr - L2 : '–', 'dB'], ['Messfläche <i>S</i>', S, 'm²'], ['Schalldruckpegel im Abstand <i>r</i>', Lp, 'dB', 1]] };
  }
});

calc('schallleistung', {
  fields: [
    { h: 'Gemessene Schalldruckpegel' },
    ...[1, 2, 3, 4, 5, 6].map(i => ({ id: 'L' + i, label: `Messpunkt ${i}`, unit: 'dB', val: ['84', '86', '83', '85', '', ''][i - 1] })),
    { id: 'f', label: 'Messfläche', val: 'quader', opts: [['quader', 'Quader über Boden'], ['halb', 'Halbkugel']] },
    { id: 'l1', label: 'Länge <i>l</i><sub>1</sub>', unit: 'm', val: 2, when: s => s('f') === 'quader' },
    { id: 'l2', label: 'Breite <i>l</i><sub>2</sub>', unit: 'm', val: 1, when: s => s('f') === 'quader' },
    { id: 'l3', label: 'Höhe <i>l</i><sub>3</sub>', unit: 'm', val: 1.5, when: s => s('f') === 'quader' },
    { id: 'd', label: 'Messabstand <i>d</i>', unit: 'm', val: 1, when: s => s('f') === 'quader' },
    { id: 'r', label: 'Radius <i>r</i>', unit: 'm', val: 4, when: s => s('f') === 'halb' },
    { id: 'dL', label: 'Abstand zum Fremdgeräusch Δ<i>L</i>', unit: 'dB', val: 12, hint: 'optional' }
  ],
  compute(g, s) {
    const Ls = [1, 2, 3, 4, 5, 6].map(i => g('L' + i)).filter(isFinite);
    if (!Ls.length) fail('Mindestens einen Messwert eingeben.');
    const Lm = lsum(Ls) - 10 * Math.log10(Ls.length);
    let S;
    if (s('f') === 'quader') { const a = pos(g('l1'), 'l₁') / 2 + nn(g('d'), 'd'), b = pos(g('l2'), 'l₂') / 2 + g('d'), c = pos(g('l3'), 'l₃') + g('d'); S = 4 * (a * b + b * c + c * a); }
    else S = 2 * PI * pos(g('r'), 'r') ** 2;
    const dL = g('dL'); let K1 = 0, chips = [];
    if (isFinite(dL)) { if (dL < 6) chips.push(['Fremdgeräuschabstand unter 6 dB: Messung ungültig', 'bad']); else K1 = -10 * Math.log10(1 - Math.pow(10, -0.1 * dL)); }
    return { chips, rows: [['energetischer Mittelwert', Lm, 'dB'], ['Messfläche <i>S</i>', S, 'm²'], ['Messflächenmaß 10 lg(<i>S</i>/<i>S</i><sub>0</sub>)', 10 * Math.log10(S), 'dB'], ['Korrektur <i>K</i><sub>1</sub>', K1, 'dB'], ['Schallleistungspegel <i>L<sub>W</sub></i>', Lm - K1 + 10 * Math.log10(S), 'dB', 1]] };
  }
});

calc('raumakustik', {
  fields: [
    { id: 'V', label: 'Raumvolumen <i>V</i>', unit: 'm³', val: 1500 },
    ...[1, 2, 3, 4].flatMap(i => [
      { id: 'S' + i, label: `Fläche ${i}`, unit: 'm²', val: [400, 300, 450, 0][i - 1] },
      { id: 'a' + i, label: `<i>α</i> Fläche ${i}`, val: [0.02, 0.05, 0.03, 0][i - 1] }
    ]),
    { h: 'Zusätzliche Absorption' },
    { id: 'Sx', label: 'Absorberfläche', unit: 'm²', val: 200 },
    { id: 'ax', label: '<i>α</i> Absorber', val: 0.8 },
    { h: 'Wand (Massegesetz)' },
    { id: 'mw', label: 'flächenbez. Masse <i>m</i>″', unit: 'kg/m²', val: 200 },
    { id: 'f', label: 'Frequenz <i>f</i>', unit: 'Hz', val: 500 }
  ],
  compute(g) {
    const V = pos(g('V'), 'V');
    let A1 = 0;
    for (let i = 1; i <= 4; i++) A1 += or0(g('S' + i)) * or0(g('a' + i));
    if (A1 <= 0) fail('Mindestens eine Fläche mit Absorptionsgrad größer 0 eingeben.');
    const A2 = A1 + or0(g('Sx')) * or0(g('ax')), T1 = 0.163 * V / A1, T2 = 0.163 * V / A2;
    const mw = g('mw'), f = g('f'), R = mw > 0 && f > 0 ? 20 * Math.log10(mw * f) - 47 : NaN;
    return { rows: [['Absorptionsfläche vorher <i>A</i><sub>1</sub>', A1, 'm²'], ['Nachhallzeit vorher', T1, 's', 1], ['Absorptionsfläche nachher <i>A</i><sub>2</sub>', A2, 'm²'], ['Nachhallzeit nachher', T2, 's', 1], ['Pegelminderung Δ<i>L</i>', 10 * Math.log10(A2 / A1), 'dB', 1], ['Hallradius vorher / nachher', `${fmt(0.057 * sqrt(V / T1), 3)} / ${fmt(0.057 * sqrt(V / T2), 3)}`, 'm'], ['Schalldämmmaß <i>R</i> der Wand', R, 'dB', 1]] };
  }
});

/* ================= VERBRENNUNGSMOTOREN ================= */
calc('kurbeltrieb', {
  fields: [
    { id: 's', label: 'Hub <i>s</i>', unit: 'mm', val: 90 },
    { id: 'l', label: 'Pleuellänge <i>l</i>', unit: 'mm', val: 150 },
    { id: 'n', label: 'Drehzahl <i>n</i>', unit: 'min⁻¹', val: 3000 },
    { id: 'mo', label: 'oszillierende Masse', unit: 'kg', val: 0.6 },
    { id: 'mr', label: 'rotierende Masse', unit: 'kg', val: 0.5 },
    { id: 'phi', label: 'Kurbelwinkel <i>φ</i> (0° = OT)', unit: '°', val: 60 }
  ],
  compute(g) {
    const s = pos(g('s'), 's'), r = s / 2000, l = pos(g('l'), 'l') / 1000, n = pos(g('n'), 'n'), w = 2 * PI * n / 60, la = r / l;
    if (la >= 0.5) fail('Das Pleuel ist zu kurz: λ = r/l sollte unter 0,4 liegen.');
    const mo = or0(g('mo')), mr = or0(g('mr')), ph = or0(g('phi')) * DEG;
    const S = f => r * ((1 - Math.cos(f)) + la / 4 * (1 - Math.cos(2 * f))), V = f => r * w * (Math.sin(f) + la / 2 * Math.sin(2 * f)), A = f => r * w * w * (Math.cos(f) + la * Math.cos(2 * f));
    const ps = Array.from({ length: 361 }, (_, k) => k);
    const vmax = Math.max(...ps.map(k => V(k * DEG)));
    const pv = ps.map(k => [k, V(k * DEG)]), pa = ps.map(k => [k, A(k * DEG)]);
    const f1 = plot({ h: 170, x: [0, 360], y: padRange(-vmax, vmax, 0.1), xt: [0, 90, 180, 270, 360], yl: 'v in m/s', ny: 4, series: [{ pts: pv, cls: 's1' }], points: [{ x: ph / DEG, y: V(ph) }], title: 'Kolbengeschwindigkeit' });
    const amin = Math.min(...pa.map(p => p[1])), amax = Math.max(...pa.map(p => p[1]));
    const f2 = plot({ h: 170, x: [0, 360], y: padRange(amin, amax, 0.1), xt: [0, 90, 180, 270, 360], yl: 'a in m/s²', xl: 'Kurbelwinkel φ in °', ny: 4, series: [{ pts: pa, cls: 's2' }], points: [{ x: ph / DEG, y: A(ph), cls: 'pt2' }], title: 'Kolbenbeschleunigung' });
    return {
      rows: [
        ['Pleuelstangenverhältnis <i>λ</i>', la, ''], ['mittlere Kolbengeschwindigkeit <i>c<sub>m</sub></i>', 2 * s / 1000 * n / 60, 'm/s', 1], ['größte Kolbengeschwindigkeit', vmax, 'm/s'],
        { h: 'Bei φ = ' + fmt(ph / DEG) + '°' }, ['Kolbenweg', S(ph) * 1000, 'mm'], ['Geschwindigkeit', V(ph), 'm/s'], ['Beschleunigung', A(ph), 'm/s²'], ['oszillierende Massenkraft', mo * A(ph), 'N', 1],
        { h: 'Amplituden' }, ['Beschleunigung im OT / UT', `${fmt(A(0))} / ${fmt(A(PI))}`, 'm/s²'], ['Massenkraft 1. Ordnung', mo * r * w * w, 'N'], ['Massenkraft 2. Ordnung', mo * r * w * w * la, 'N'], ['rotierende Massenkraft', mr * r * w * w, 'N']
      ],
      fig: f1 + f2
    };
  }
});

const KRAFTSTOFF = { diesel: ['Diesel', 42.7, 14.5], benzin: ['Benzin', 42.0, 14.7], erdgas: ['Erdgas H', 48.0, 17.2] };
calc('motor', {
  fields: [
    { id: 'P', label: 'effektive Leistung <i>P<sub>e</sub></i>', unit: 'kW', val: 150 },
    { id: 'n', label: 'Drehzahl <i>n</i>', unit: 'min⁻¹', val: 1800 },
    { id: 'VH', label: 'Gesamthubraum <i>V<sub>H</sub></i>', unit: 'l', val: 7.7 },
    { id: 'tk', label: 'Arbeitsverfahren', val: '4', opts: [['4', 'Viertakt'], ['2', 'Zweitakt']] },
    { id: 'be', label: 'spez. Kraftstoffverbrauch <i>b<sub>e</sub></i>', unit: 'g/kWh', val: 205 },
    { id: 'ks', label: 'Kraftstoff', val: 'diesel', opts: Object.entries(KRAFTSTOFF).map(([k, v]) => [k, v[0]]) },
    { id: 'la', label: 'Luftverhältnis <i>λ</i>', val: 1.8 }
  ],
  compute(g, s) {
    const P = pos(g('P'), 'P') * 1000, n = pos(g('n'), 'n') / 60, VH = pos(g('VH'), 'VH') / 1000, k = s('tk') === '4' ? 2 : 1, be = pos(g('be'), 'be'), la = pos(g('la'), 'λ');
    const [, Hu, Lst] = KRAFTSTOFF[s('ks')];
    const T = P / (2 * PI * n), pme = P * k / (VH * n), mB = be * P / 1000 / 1000, eta = 3600 / (be * Hu);
    const mL = la * Lst * mB, mA = mB + mL;
    return {
      rows: [['Drehmoment <i>T</i>', T, 'N·m', 1], ['effektiver Mitteldruck <i>p<sub>me</sub></i>', pme / 1e5, 'bar', 1], ['Literleistung', P / 1000 / (VH * 1000), 'kW/l'],
        ['Kraftstoffverbrauch', mB, 'kg/h'], ['effektiver Wirkungsgrad <i>η<sub>e</sub></i>', eta * 100, '%', 1], ['zugeführte Brennstoffleistung', mB / 3600 * Hu * 1000, 'kW'],
        ['Luftmassenstrom', mL, 'kg/h'], ['Abgasmassenstrom', mA, 'kg/h', 1], ['Restsauerstoff (trocken, Näherung)', la > 1 ? 20.9 * (la - 1) / la : 0, '%']]
    };
  }
});

/* ================= VERBINDUNGSELEMENTE ================= */
calc('bolzen', {
  fields: [
    { id: 'm', label: 'Verbindung', val: 'bolzen', wide: 1, opts: [['bolzen', 'Bolzen Gabel – Stange'], ['quer', 'Querstift in Welle und Nabe'], ['laengs', 'Längsstift']] },
    { id: 'F', label: 'Kraft <i>F</i>', unit: 'N', val: 20000, when: s => s('m') === 'bolzen' },
    { id: 'd', label: 'Bolzen- bzw. Stiftdurchmesser <i>d</i>', unit: 'mm', val: 16 },
    { id: 'tS', label: 'Stangendicke <i>t<sub>S</sub></i>', unit: 'mm', val: 20, when: s => s('m') === 'bolzen' },
    { id: 'tG', label: 'Gabelwange <i>t<sub>G</sub></i> (je Seite)', unit: 'mm', val: 12, when: s => s('m') === 'bolzen' },
    { id: 'fall', label: 'Einbaufall', val: '1', when: s => s('m') === 'bolzen', opts: [['1', '1: Spiel in Gabel und Stange'], ['2', '2: in Gabel eingespannt'], ['3', '3: in Stange eingespannt']] },
    { id: 'Rm', label: 'Zugfestigkeit Bolzen <i>R<sub>m</sub></i>', unit: 'N/mm²', val: 600, when: s => s('m') === 'bolzen' },
    { id: 'T', label: 'Drehmoment <i>T</i>', unit: 'N·m', val: 150, when: s => s('m') !== 'bolzen' },
    { id: 'dW', label: 'Wellendurchmesser <i>d<sub>W</sub></i>', unit: 'mm', val: 40, when: s => s('m') !== 'bolzen' },
    { id: 'D', label: 'Nabenaußendurchmesser <i>D</i>', unit: 'mm', val: 70, when: s => s('m') === 'quer' },
    { id: 'l', label: 'Stiftlänge <i>l</i>', unit: 'mm', val: 40, when: s => s('m') === 'laengs' }
  ],
  compute(g, s) {
    const m = s('m'), d = pos(g('d'), 'd');
    if (m === 'bolzen') {
      const F = pos(g('F'), 'F'), tS = pos(g('tS'), 'tS'), tG = pos(g('tG'), 'tG'), Rm = g('Rm'), fall = s('fall');
      const Mb = fall === '1' ? F * (tS + 2 * tG) / 8 : fall === '2' ? F * tS / 8 : F * tG / 4;
      const sb = Mb / (0.1 * d ** 3), ta = 4 / 3 * F / (2 * PI * d * d / 4);
      const chips = isFinite(Rm) ? [[`Biegung ${fmt(sb / (0.3 * Rm) * 100, 3)} % von 0,3·R<sub>m</sub>`, sb <= 0.3 * Rm ? 'good' : 'bad']] : [];
      return { chips, rows: [['Biegemoment <i>M<sub>b</sub></i>', Mb / 1000, 'N·m'], ['Biegespannung <i>σ<sub>b</sub></i>', sb, 'N/mm²', 1], ['Scherspannung <i>τ</i><sub>a,max</sub>', ta, 'N/mm²', 1], ['Pressung Stange <i>p<sub>S</sub></i>', F / (d * tS), 'N/mm²'], ['Pressung Gabel <i>p<sub>G</sub></i>', F / (2 * d * tG), 'N/mm²'], ['Richtwert <i>σ</i><sub>b,zul</sub> / <i>τ</i><sub>a,zul</sub>', isFinite(Rm) ? `${fmt(0.3 * Rm)} / ${fmt(0.2 * Rm)}` : '–', 'N/mm²']] };
    }
    const T = pos(g('T'), 'T') * 1000, dW = pos(g('dW'), 'dW');
    if (m === 'quer') {
      const D = pos(g('D'), 'D'); if (D <= dW) fail('Der Nabendurchmesser muss größer als der Wellendurchmesser sein.');
      return { rows: [['Scherspannung im Stift', 4 * T / (PI * d * d * dW), 'N/mm²', 1], ['Pressung in der Welle', 6 * T / (d * dW * dW), 'N/mm²', 1], ['Pressung in der Nabe', 4 * T / (d * (D * D - dW * dW)), 'N/mm²'], ['Stift/Welle <i>d</i>/<i>d<sub>W</sub></i>', d / dW, '']] };
    }
    const l = pos(g('l'), 'l');
    return { rows: [['Flächenpressung', 4 * T / (d * dW * l), 'N/mm²', 1], ['Scherspannung', 2 * T / (d * dW * l), 'N/mm²', 1]] };
  }
});

calc('kegelpress', {
  fields: [
    { id: 'Dm', label: 'mittlerer Kegeldurchmesser <i>D<sub>m</sub></i>', unit: 'mm', val: 40 },
    { id: 'l', label: 'Fugenlänge <i>l</i>', unit: 'mm', val: 50 },
    { id: 'C', label: 'Kegelverhältnis <i>C</i>', val: '0.1', opts: [['0.2', '1 : 5'], ['0.1', '1 : 10'], ['0.05', '1 : 20'], ['0.02', '1 : 50']] },
    { id: 'T', label: 'zu übertragendes Moment <i>T</i>', unit: 'N·m', val: 300 },
    { id: 'mu', label: 'Haftbeiwert <i>μ</i>', val: 0.12 },
    { id: 'DaA', label: 'Nabenaußendurchmesser', unit: 'mm', val: 80 },
    { id: 'E', label: 'E-Modul (Welle und Nabe)', unit: 'N/mm²', val: 210000 },
    { id: 'ReA', label: 'Streckgrenze Nabe', unit: 'N/mm²', val: 355 }
  ],
  compute(g, s) {
    const Dm = pos(g('Dm'), 'Dm'), l = pos(g('l'), 'l'), C = +s('C'), T = pos(g('T'), 'T') * 1000, mu = pos(g('mu'), 'μ'), DaA = pos(g('DaA'), 'DaA'), E = pos(g('E'), 'E'), ReA = g('ReA'), nu = 0.3;
    if (DaA <= Dm) fail('Der Nabenaußendurchmesser muss größer als der Kegeldurchmesser sein.');
    const a2 = Math.atan(C / 2), p = 2 * T / (mu * PI * Dm * Dm * l);
    const Fa = p * PI * Dm * l * (Math.sin(a2) + mu * Math.cos(a2)), Fl = p * PI * Dm * l * (mu * Math.cos(a2) - Math.sin(a2));
    const QA = Dm / DaA, K = 1 / E * ((1 + QA * QA) / (1 - QA * QA) + nu) + 1 / E * (1 - nu);
    const U = p * Dm * K, a = U / C, sv = 2 * p / (1 - QA * QA), S = isFinite(ReA) ? ReA / sv : NaN;
    return {
      chips: [[Math.tan(a2) < mu ? 'selbsthemmend' : 'nicht selbsthemmend', Math.tan(a2) < mu ? 'good' : 'warn'], isFinite(S) ? [`Nabe S<sub>F</sub> = ${fmt(S, 3)}`, S >= 1.3 ? 'good' : 'bad'] : null],
      rows: [['halber Kegelwinkel <i>α</i>/2', a2 / DEG, '°'], ['erforderliche Fugenpressung <i>p</i>', p, 'N/mm²', 1], ['Einpresskraft <i>F<sub>a</sub></i>', Fa / 1000, 'kN', 1], ['Lösekraft', Fl > 0 ? Fl / 1000 : 0, 'kN'], ['Übermaß <i>Ü</i>', U * 1000, 'µm'], ['Aufschubweg <i>a</i>', a, 'mm', 1], ['Vergleichsspannung Nabe innen', sv, 'N/mm²']]
    };
  }
});

calc('klemm', {
  fields: [
    { id: 'art', label: 'Nabenform', val: 'geteilt', opts: [['geteilt', 'geteilte Nabe'], ['geschlitzt', 'geschlitzte Nabe']] },
    { id: 'vt', label: 'Pressungsannahme', val: 'linie', opts: [['gleich', 'gleichmäßige Pressung'], ['linie', 'Linienberührung (vorsichtig)']] },
    { id: 'z', label: 'Schrauben je Seite <i>z</i>', val: 2 },
    { id: 'FS', label: 'Vorspannkraft je Schraube <i>F<sub>S</sub></i>', unit: 'N', val: 15000 },
    { id: 'a', label: 'Hebelarm Schraube <i>a</i>', unit: 'mm', val: 45, when: s => s('art') === 'geschlitzt' },
    { id: 'b', label: 'Hebelarm Wellenmitte <i>b</i>', unit: 'mm', val: 25, when: s => s('art') === 'geschlitzt' },
    { id: 'd', label: 'Wellendurchmesser <i>d</i>', unit: 'mm', val: 30 },
    { id: 'l', label: 'Nabenlänge <i>l</i>', unit: 'mm', val: 40 },
    { id: 'mu', label: 'Haftbeiwert <i>μ</i>', val: 0.15 },
    { id: 'Te', label: 'gefordertes Moment', unit: 'N·m', val: 100, hint: 'optional' }
  ],
  compute(g, s) {
    const z = pos(g('z'), 'z'), FS = pos(g('FS'), 'FS'), d = pos(g('d'), 'd'), l = pos(g('l'), 'l'), mu = pos(g('mu'), 'μ');
    const lever = s('art') === 'geschlitzt' ? pos(g('a'), 'a') / pos(g('b'), 'b') : 1;
    const k = s('vt') === 'gleich' ? PI / 2 : 1;
    const FN = z * FS * lever, T = k * mu * FN * d / 1000, Te = g('Te');
    return {
      chips: isFinite(Te) && Te > 0 ? [[T >= Te ? 'Moment wird übertragen' : 'Moment zu groß', T >= Te ? 'good' : 'bad']] : [],
      rows: [['Normalkraft <i>F<sub>N</sub></i>', FN, 'N'], ['Flächenpressung <i>p</i>', FN / (d * l), 'N/mm²'], ['übertragbares Moment <i>T</i>', T, 'N·m', 1], ['erforderliche Schraubenkraft für das geforderte Moment', isFinite(Te) && Te > 0 ? Te * 1000 / (k * mu * d * z * lever) : '–', 'N', 1]]
    };
  }
});

const SW_ST = { s235: ['S235', 235, 360, 0.8], s275: ['S275', 275, 430, 0.85], s355: ['S355', 355, 490, 0.9] };
calc('schweissnaht', {
  fields: [
    { id: 'n', label: 'Nahtart', val: 'kehl', opts: [['kehl', 'Kehlnaht'], ['stumpf', 'Stumpfnaht, voll durchgeschweißt']] },
    { id: 'st', label: 'Stahl', val: 's235', opts: Object.entries(SW_ST).map(([k, v]) => [k, v[0]]) },
    { id: 'a', label: 'Nahtdicke <i>a</i>', unit: 'mm', val: 4 },
    { id: 'l', label: 'Nahtlänge <i>l</i> (je Naht)', unit: 'mm', val: 120 },
    { id: 'k', label: 'Anzahl Nähte', val: 2 },
    { id: 'Fq', label: 'Bemessungskraft quer zur Naht', unit: 'kN', val: 60 },
    { id: 'Fl', label: 'Bemessungskraft längs zur Naht', unit: 'kN', val: 40 },
    { id: 't', label: 'dünneres Blech <i>t</i><sub>min</sub>', unit: 'mm', val: 8, when: s => s('n') === 'kehl' }
  ],
  compute(g, s) {
    const [, fy, fu, bw] = SW_ST[s('st')], a = pos(g('a'), 'a'), l = pos(g('l'), 'l'), k = pos(g('k'), 'Anzahl'), Fq = or0(g('Fq')) * 1000, Fl = or0(g('Fl')) * 1000;
    const Aw = k * a * l, gM2 = 1.25;
    if (s('n') === 'stumpf') {
      const sg = Fq / Aw, ta = Fl / Aw, sv = sqrt(sg * sg + 3 * ta * ta);
      return { chips: [[`Ausnutzung ${fmt(sv / fy * 100, 3)} %`, sv <= fy ? 'good' : 'bad']], rows: [['Nahtfläche <i>A<sub>w</sub></i>', Aw, 'mm²'], ['Normalspannung', sg, 'N/mm²'], ['Schubspannung', ta, 'N/mm²'], ['Vergleichsspannung', sv, 'N/mm²', 1], ['Grenzwert <i>f<sub>y</sub></i>/<i>γ</i><sub>M0</sub>', fy, 'N/mm²']] };
    }
    const sp = Fq / (sqrt(2) * Aw), tp = sp, tl = Fl / Aw, sv = sqrt(sp * sp + 3 * (tp * tp + tl * tl)), lim = fu / (bw * gM2), lim2 = 0.9 * fu / gM2;
    const t = g('t'), notes = [];
    if (a < 3) notes.push('a unter 3 mm: Mindestnahtdicke nach EN 1993-1-8 ist 3 mm.');
    if (isFinite(t) && a > 0.7 * t) notes.push(`a über 0,7·t<sub>min</sub> = ${fmt(0.7 * t)} mm.`);
    if (l < Math.max(30, 6 * a)) notes.push(`Nahtlänge unter dem Mindestwert ${fmt(Math.max(30, 6 * a))} mm (6a, mindestens 30 mm).`);
    const u = Math.max(sv / lim, sp / lim2);
    return { chips: [[`Ausnutzung ${fmt(u * 100, 3)} %`, u <= 1 ? 'good' : 'bad']], rows: [['Nahtfläche <i>A<sub>w</sub></i>', Aw, 'mm²'], ['<i>σ</i><sub>⊥</sub> = <i>τ</i><sub>⊥</sub>', sp, 'N/mm²'], ['<i>τ</i><sub>∥</sub>', tl, 'N/mm²'], ['Vergleichswert', sv, 'N/mm²', 1], ['Grenzwert <i>f<sub>u</sub></i>/(<i>β<sub>w</sub></i>·<i>γ</i><sub>M2</sub>)', lim, 'N/mm²'], ['Grenzwert für <i>σ</i><sub>⊥</sub>', lim2, 'N/mm²']], notes };
  }
});

/* ================= MASCHINENELEMENTE ================= */
const TR = { 'Tr 10×2': [10, 2, 9, 7.5], 'Tr 12×3': [12, 3, 10.5, 8.5], 'Tr 16×4': [16, 4, 14, 11.5], 'Tr 20×4': [20, 4, 18, 15.5], 'Tr 24×5': [24, 5, 21.5, 18.5], 'Tr 28×5': [28, 5, 25.5, 22.5], 'Tr 32×6': [32, 6, 29, 25], 'Tr 36×6': [36, 6, 33, 29], 'Tr 40×7': [40, 7, 36.5, 32], 'Tr 44×7': [44, 7, 40.5, 36], 'Tr 50×8': [50, 8, 46, 41], 'Tr 60×9': [60, 9, 55.5, 50] };
calc('bewegungsschraube', {
  fields: [
    { id: 'tr', label: 'Gewinde', val: 'Tr 32×6', opts: Object.keys(TR).map(k => [k, k]) },
    { id: 'F', label: 'Axialkraft <i>F</i>', unit: 'kN', val: 20 },
    { id: 'mu', label: 'Gewindereibung <i>μ</i>', val: 0.1 },
    { id: 'm', label: 'Mutterhöhe <i>m</i>', unit: 'mm', val: 60 },
    { id: 'pz', label: 'zulässige Pressung', unit: 'N/mm²', val: 12 },
    { id: 'lf', label: 'freie Knicklänge (Spindel)', unit: 'mm', val: 800 },
    { id: 'fall', label: 'Euler-Fall', val: '2', opts: [['1', '1 (β = 2)'], ['2', '2 (β = 1)'], ['3', '3 (β = 0,7)'], ['4', '4 (β = 0,5)']] },
    { id: 'tor', label: 'Torsion im Druckabschnitt', val: 'ja', opts: [['ja', 'ja'], ['nein', 'nein']] }
  ],
  compute(g, s) {
    const [d, P, d2, d3] = TR[s('tr')], F = pos(g('F'), 'F') * 1000, mu = nn(g('mu'), 'μ'), m = pos(g('m'), 'm'), pz = g('pz');
    const phi = Math.atan(P / (PI * d2)), rho = Math.atan(mu / Math.cos(15 * DEG));
    const T = F * d2 / 2 * Math.tan(phi + rho), eta = Math.tan(phi) / Math.tan(phi + rho);
    const A3 = PI * d3 * d3 / 4, sg = F / A3, ta = s('tor') === 'ja' ? T / (PI * d3 ** 3 / 16) : 0, sv = sqrt(sg * sg + 3 * ta * ta);
    const p = F * P / (PI * d2 * 0.5 * P * m), merf = isFinite(pz) && pz > 0 ? F / (PI * d2 * 0.5 * pz) : NaN;
    const beta = { 1: 2, 2: 1, 3: 0.699, 4: 0.5 }[s('fall')], lk = beta * or0(g('lf')), i = d3 / 4, lam = lk / i;
    const sk = lam >= 104 ? PI * PI * 210000 / (lam * lam) : 310 - 1.14 * lam, SK = lk > 0 ? sk * A3 / F : NaN;
    const self = phi < rho;
    return {
      chips: [[self ? 'selbsthemmend' : 'nicht selbsthemmend', self ? 'good' : 'warn'], isFinite(SK) ? [`Knicksicherheit ${fmt(SK, 3)}`, SK >= 4 ? 'good' : SK >= 2 ? 'warn' : 'bad'] : null, isFinite(pz) ? [`Pressung ${fmt(p, 3)} N/mm²`, p <= pz ? 'good' : 'bad'] : null],
      rows: [['Flanken- / Kerndurchmesser', `${fmt(d2)} / ${fmt(d3)}`, 'mm'], ['Steigungswinkel <i>φ</i>', phi / DEG, '°'], ['Reibungswinkel <i>ρ</i>′', rho / DEG, '°'], ['Antriebsmoment <i>T</i>', T / 1000, 'N·m', 1], ['Wirkungsgrad <i>η</i>', eta * 100, '%', 1],
        ['Druck- bzw. Zugspannung', sg, 'N/mm²'], ['Torsionsspannung', ta, 'N/mm²'], ['Vergleichsspannung', sv, 'N/mm²', 1], ['Flächenpressung Mutter <i>p</i>', p, 'N/mm²'], ['erforderliche Mutterhöhe', merf, 'mm'],
        ['Schlankheitsgrad <i>λ</i>', lk > 0 ? lam : '–', ''], ['Knickkraft <i>F<sub>K</sub></i>', lk > 0 ? sk * A3 / 1000 : '–', 'kN']]
    };
  }
});

calc('riementrieb', {
  fields: [
    { id: 'typ', label: 'Riemenart', val: 'keil', opts: [['flach', 'Flachriemen'], ['keil', 'Keilriemen (38°)']] },
    { id: 'd1', label: 'kleine Scheibe <i>d</i><sub>1</sub>', unit: 'mm', val: 125 },
    { id: 'd2', label: 'große Scheibe <i>d</i><sub>2</sub>', unit: 'mm', val: 315 },
    { id: 'a', label: 'Achsabstand <i>a</i>', unit: 'mm', val: 600 },
    { id: 'n1', label: 'Drehzahl kleine Scheibe <i>n</i><sub>1</sub>', unit: 'min⁻¹', val: 1450 },
    { id: 'P', label: 'Leistung <i>P</i>', unit: 'kW', val: 7.5 },
    { id: 'KA', label: 'Betriebsfaktor <i>K<sub>A</sub></i>', val: 1.2 },
    { id: 'mu', label: 'Reibungszahl <i>μ</i>', val: 0.2 },
    { id: 'mp', label: 'Riemenmasse je Meter', unit: 'kg/m', val: 0.12, hint: 'SPA ≈ 0,12; SPB ≈ 0,2' },
    { id: 'z', label: 'Anzahl Riemen', val: 2, when: s => s('typ') === 'keil' }
  ],
  compute(g, s) {
    const d1 = pos(g('d1'), 'd₁'), d2 = pos(g('d2'), 'd₂'), a = pos(g('a'), 'a'), n1 = pos(g('n1'), 'n₁'), P = pos(g('P'), 'P') * 1000, KA = pos(g('KA'), 'KA'), mu = pos(g('mu'), 'μ'), mp = or0(g('mp'));
    if (abs(d2 - d1) >= 2 * a) fail('Der Achsabstand ist für diese Scheibendurchmesser zu klein.');
    const dmin = Math.min(d1, d2), dmax = Math.max(d1, d2);
    const b1 = PI - 2 * Math.asin((dmax - dmin) / (2 * a)), L = 2 * a + PI / 2 * (d1 + d2) + (dmax - dmin) ** 2 / (4 * a);
    const keil = s('typ') === 'keil', zr = keil ? Math.max(1, Math.round(or0(g('z')) || 1)) : 1;
    const mue = keil ? mu / Math.sin(19 * DEG) : mu, mm = Math.exp(mue * b1);
    const v = PI * d1 / 1000 * n1 / 60, Fu = KA * P / v, F1 = Fu * mm / (mm - 1), F2 = Fu / (mm - 1), Ff = zr * mp * v * v;
    const FW = sqrt(F1 * F1 + F2 * F2 - 2 * F1 * F2 * Math.cos(b1));
    return {
      chips: [[`β₁ = ${fmt(b1 / DEG, 3)}°`, b1 / DEG >= 120 ? 'good' : 'warn']],
      rows: [['Übersetzung <i>i</i>', d2 / d1, ''], ['Riemenlänge (Wirklänge) <i>L</i>', L, 'mm', 1], ['Riemengeschwindigkeit <i>v</i>', v, 'm/s'], ['Umfangskraft <i>F<sub>u</sub></i> (mit K<sub>A</sub>)', Fu, 'N'],
        ['wirksame Reibungszahl <i>μ</i>′', mue, ''], ['Trumkraftverhältnis <i>m</i>', mm, ''], ['Zugtrum <i>F</i><sub>1</sub>', F1 + Ff, 'N', 1], ['Leertrum <i>F</i><sub>2</sub>', F2 + Ff, 'N'], ['Fliehkraft je Trum', Ff, 'N'],
        ['Mindest-Vorspannkraft je Trum', (F1 + F2) / 2 + Ff, 'N'], ['Wellenbelastung <i>F<sub>W</sub></i>', FW, 'N', 1], ['Biegefrequenz <i>f<sub>B</sub></i>', 2 * v / (L / 1000), 's⁻¹']],
      notes: keil ? [`Kräfte gelten für alle ${zr} Riemen zusammen.`] : []
    };
  }
});

const KETTE = { '06B': [9.525, 9, 0.41], '08B': [12.7, 18, 0.70], '10B': [15.875, 22.4, 0.95], '12B': [19.05, 29, 1.25], '16B': [25.4, 60, 2.70], '20B': [31.75, 95, 3.60], '24B': [38.1, 160, 6.70] };
calc('kettentrieb', {
  fields: [
    { id: 'k', label: 'Kette (DIN 8187)', val: '10B', opts: Object.keys(KETTE).map(k => [k, k]) },
    { id: 'z1', label: 'Zähnezahl Ritzel <i>z</i><sub>1</sub>', val: 19 },
    { id: 'z2', label: 'Zähnezahl Rad <i>z</i><sub>2</sub>', val: 57 },
    { id: 'n1', label: 'Drehzahl Ritzel', unit: 'min⁻¹', val: 400 },
    { id: 'P', label: 'Leistung <i>P</i>', unit: 'kW', val: 3 },
    { id: 'a0', label: 'gewünschter Achsabstand', unit: 'mm', val: 600 }
  ],
  compute(g, s) {
    const [p, FB, q] = KETTE[s('k')], z1 = Math.round(pos(g('z1'), 'z₁')), z2 = Math.round(pos(g('z2'), 'z₂')), n1 = pos(g('n1'), 'n₁'), P = pos(g('P'), 'P') * 1000, a0 = pos(g('a0'), 'Achsabstand');
    if (z1 < 7) fail('Kettenräder unter 7 Zähnen sind nicht sinnvoll.');
    const tz = (z2 - z1) / (2 * PI);
    let X = 2 * a0 / p + (z1 + z2) / 2 + tz * tz * p / a0; X = 2 * Math.round(X / 2);
    const u = X - (z1 + z2) / 2, a = p / 4 * (u + sqrt(u * u - 8 * tz * tz));
    const d = z => p / Math.sin(PI / z), v = z1 * p * n1 / 60000, Ft = P / v, Ff = q * v * v;
    return {
      chips: [[z1 >= 17 ? 'Ritzel ≥ 17 Zähne' : 'Ritzel unter 17 Zähnen: unruhiger Lauf', z1 >= 17 ? 'good' : 'warn']],
      rows: [['Übersetzung <i>i</i>', z2 / z1, ''], ['Teilkreis <i>d</i><sub>1</sub> / <i>d</i><sub>2</sub>', `${fmt(d(z1))} / ${fmt(d(z2))}`, 'mm'], ['Kopfkreis Ritzel ≈', p * (0.54 + 1 / Math.tan(PI / z1)), 'mm'],
        ['Gliederzahl <i>X</i> (gerade)', X, '', 1], ['Achsabstand für <i>X</i>', a, 'mm', 1], ['Kettengeschwindigkeit <i>v</i>', v, 'm/s'], ['Kettenzugkraft <i>F<sub>t</sub></i>', Ft, 'N', 1], ['Fliehkraft', Ff, 'N'],
        ['Wellenbelastung ≈ 1,1·<i>F<sub>t</sub></i>', 1.1 * Ft, 'N'], ['statische Sicherheit', FB * 1000 / (Ft + Ff), '', 1], ['Geschwindigkeitsschwankung (Polygon)', (1 - Math.cos(PI / z1)) * 100, '%']]
    };
  }
});

/* ================= NACHSCHLAGEN ================= */
const IP1 = ['kein Schutz', 'Fremdkörper ≥ 50 mm, Handrücken', 'Fremdkörper ≥ 12,5 mm, Finger', 'Fremdkörper ≥ 2,5 mm, Werkzeug', 'Fremdkörper ≥ 1 mm, Draht', 'staubgeschützt', 'staubdicht'];
const IP2 = { 0: 'kein Schutz', 1: 'senkrecht fallendes Tropfwasser', 2: 'Tropfwasser bis 15° Neigung', 3: 'Sprühwasser bis 60°', 4: 'Spritzwasser aus allen Richtungen', 5: 'Strahlwasser', 6: 'starkes Strahlwasser', 7: 'zeitweiliges Untertauchen', 8: 'dauerndes Untertauchen', '9K': 'Hochdruck- und Dampfstrahlreinigung' };
calc('ipcode', {
  fields: [
    { id: 'a', label: '1. Kennziffer', val: '5', opts: IP1.map((_, i) => [String(i), String(i)]) },
    { id: 'b', label: '2. Kennziffer', val: '4', opts: Object.keys(IP2).map(k => [k, k]) }
  ],
  compute(g, s) {
    return { rows: [['Schutzart', 'IP' + s('a') + s('b'), '', 1], ['Berührung und Fremdkörper', IP1[+s('a')], ''], ['Wasser', IP2[s('b')], '']] };
  }
});

function solveLin(A, b) {
  const n = b.length;
  for (let i = 0; i < n; i++) {
    let mx = i; for (let r = i + 1; r < n; r++) if (abs(A[r][i]) > abs(A[mx][i])) mx = r;
    [A[i], A[mx]] = [A[mx], A[i]]; [b[i], b[mx]] = [b[mx], b[i]];
    if (abs(A[i][i]) < 1e-300) fail('Das Gleichungssystem ist singulär: zu wenige verschiedene x-Werte für diesen Grad.');
    for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) { let sum = b[i]; for (let c = i + 1; c < n; c++) sum -= A[i][c] * x[c]; x[i] = sum / A[i][i]; }
  return x;
}
calc('ausgleich', {
  fields: [
    { id: 'x', label: 'x-Werte', val: '0; 10; 20; 30; 40; 50', wide: 1, text: 1 },
    { id: 'y', label: 'y-Werte', val: '42,1; 41,3; 39,0; 35,2; 29,8; 22,9', wide: 1, text: 1 },
    { id: 'm', label: 'Polynomgrad', val: '2', opts: [['1', '1 (Gerade)'], ['2', '2 (Parabel)'], ['3', '3'], ['4', '4']] }
  ],
  compute(g, s) {
    const parse = t => t.split(/[;\s]+/).filter(Boolean).map(parseNum);
    const xs = parse(s('x')), ys = parse(s('y')), m = +s('m');
    if (xs.some(v => !isFinite(v)) || ys.some(v => !isFinite(v))) fail('Ein Wert ist keine Zahl. Trenne die Werte mit Semikolon oder Leerzeichen.');
    if (xs.length !== ys.length) fail(`Es sind ${xs.length} x-Werte, aber ${ys.length} y-Werte.`);
    if (xs.length < m + 1) fail(`Für Grad ${m} braucht es mindestens ${m + 1} Punkte.`);
    const xm = xs.reduce((t, v) => t + v, 0) / xs.length, xsd = Math.max(...xs.map(v => abs(v - xm))) || 1;
    const u = xs.map(v => (v - xm) / xsd);
    const N = m + 1, A = Array.from({ length: N }, () => Array(N).fill(0)), b = Array(N).fill(0);
    u.forEach((ui, i) => { for (let r = 0; r < N; r++) { b[r] += ys[i] * ui ** r; for (let c = 0; c < N; c++) A[r][c] += ui ** (r + c); } });
    const cu = solveLin(A, b);
    const evalU = t => cu.reduce((acc, c, k) => acc + c * t ** k, 0), f = x => evalU((x - xm) / xsd);
    // Koeffizienten in x zurückrechnen
    const coef = Array(N).fill(0);
    for (let k = 0; k < N; k++) {
      // (x - xm)^k / xsd^k = sum_j C(k,j) x^j (-xm)^(k-j) / xsd^k
      let C = 1;
      for (let j = 0; j <= k; j++) { if (j > 0) C = C * (k - j + 1) / j; coef[j] += cu[k] * C * Math.pow(-xm, k - j) / Math.pow(xsd, k); }
    }
    const ym = ys.reduce((t, v) => t + v, 0) / ys.length;
    const ssr = ys.reduce((t, y, i) => t + (y - f(xs[i])) ** 2, 0), sst = ys.reduce((t, y) => t + (y - ym) ** 2, 0);
    const R2 = sst > 0 ? 1 - ssr / sst : 1;
    const poly = coef.map((c, k) => (k === 0 ? fmt(c, 5) : (c < 0 ? ' − ' : ' + ') + fmt(abs(c), 5) + (k === 1 ? '·x' : '·x' + sup(k)))).join('');
    const xmin = Math.min(...xs), xmax = Math.max(...xs), span = xmax - xmin || 1;
    const curve = Array.from({ length: 201 }, (_, i) => { const x = xmin - 0.05 * span + 1.1 * span * i / 200; return [x, f(x)]; });
    const yall = [...ys, ...curve.map(p => p[1])];
    const fig = plot({ h: 260, x: [xmin - 0.05 * span, xmax + 0.05 * span], y: padRange(Math.min(...yall), Math.max(...yall), 0.08, false), xl: 'x', yl: 'y',
      series: [{ pts: curve, cls: 's1' }], points: xs.map((x, i) => ({ x, y: ys[i], cls: 'pt2', r: 4 })), title: 'Ausgleichskurve' });
    return {
      rows: [['Polynom', poly, ''], ...coef.map((c, k) => [`<i>a</i><sub>${k}</sub>`, c, '', 0, 6]), ['Bestimmtheitsmaß <i>R</i>²', R2, '', 1, 6], ['mittlere Abweichung (RMS)', sqrt(ssr / xs.length), '']],
      fig
    };
  }
});

/* ================= Einheiten erweitern ================= */
UNITS.push(
  { g: 'Fläche', u: [['mm²', 1e-6], ['cm²', 1e-4], ['m²', 1], ['ha', 1e4], ['in²', 6.4516e-4], ['ft²', 0.09290304]] },
  { g: 'Volumen', u: [['mm³', 1e-9], ['cm³ = ml', 1e-6], ['l', 1e-3], ['m³', 1], ['in³', 1.6387064e-5], ['ft³', 0.028316847], ['gal (US)', 3.785412e-3]] },
  { g: 'Masse', u: [['g', 1e-3], ['kg', 1], ['t', 1e3], ['lb', 0.45359237], ['oz', 0.028349523]] },
  { g: 'Dichte', u: [['kg/m³', 1], ['g/cm³', 1e3], ['kg/l', 1e3], ['lb/ft³', 16.018463]] },
  { g: 'Beschleunigung', u: [['m/s²', 1], ['g (Erdbeschleunigung)', 9.80665], ['ft/s²', 0.3048]] },
  { g: 'Flächenträgheitsmoment', u: [['mm⁴', 1e-12], ['cm⁴', 1e-8], ['m⁴', 1], ['in⁴', 4.162314e-7]] },
  { g: 'Widerstandsmoment', u: [['mm³', 1e-9], ['cm³', 1e-6], ['m³', 1], ['in³', 1.6387064e-5]] },
  { g: 'Massenträgheitsmoment', u: [['kg·m²', 1], ['kg·cm²', 1e-4], ['g·cm²', 1e-7], ['lb·ft²', 0.04214011]] },
  { g: 'Winkel', u: [['°', PI / 180], ['rad', 1], ['′ (Bogenminute)', PI / 10800], ['gon', PI / 200]] },
  { g: 'Drehzahl, Frequenz', u: [['1/min', 1 / 60], ['1/s = Hz', 1], ['rad/s', 1 / (2 * PI)]] }
);

/* ================= erzeugte Tabellen ================= */
for (const el of $$('[data-gen]')) {
  const pre = el.dataset.gen.toUpperCase();
  const rows = PROFILE.filter(p => p[0].startsWith(pre));
  el.innerHTML = '<table><tr><th>Profil</th><th>h</th><th>b</th><th>t<sub>w</sub></th><th>t<sub>f</sub></th><th>A in cm²</th><th>G in kg/m</th><th>I<sub>y</sub> in cm⁴</th><th>W<sub>y</sub> in cm³</th><th>I<sub>z</sub> in cm⁴</th><th>W<sub>z</sub> in cm³</th></tr>' +
    rows.map(p => `<tr><td>${p[0]}</td><td>${p[1]}</td><td>${p[2]}</td><td>${fmt(p[3])}</td><td>${fmt(p[4])}</td><td>${fmt(p[5])}</td><td>${fmt(kgm(p[5]), 3)}</td><td>${fmt(p[6])}</td><td>${fmt(p[7])}</td><td>${fmt(p[8])}</td><td>${fmt(p[9])}</td></tr>`).join('') + '</table>';
}
