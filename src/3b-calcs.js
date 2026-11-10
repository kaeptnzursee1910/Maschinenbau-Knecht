
/* ================= KINETIK ================= */
calc('schwinger', {
  fields: [
    { id: 'm', label: 'Masse <i>m</i>', unit: 'kg', val: 50 },
    { id: 'c', label: 'Federsteifigkeit <i>c</i>', unit: 'N/m', val: '2e5' },
    { id: 'd', label: 'Dämpfungskonstante <i>d</i>', unit: 'N·s/m', val: 300 },
    { id: 'f', label: 'Erregerfrequenz <i>f</i> = Ω/2π', unit: 'Hz', val: 8 },
    { id: 'F', label: 'Kraftamplitude <i>F̂</i>', unit: 'N', val: 500 }
  ],
  compute(g) {
    const m = pos(g('m'), 'm'), c = pos(g('c'), 'c'), d = nn(g('d'), 'd'), f = nn(g('f'), 'f'), F = or0(g('F'));
    const w0 = sqrt(c / m), D = d / (2 * sqrt(c * m)), eta = 2 * PI * f / w0;
    const V = 1 / sqrt((1 - eta * eta) ** 2 + (2 * D * eta) ** 2);
    const psi = Math.atan2(2 * D * eta, 1 - eta * eta) / DEG;
    const Tr = V * sqrt(1 + (2 * D * eta) ** 2);
    const chips = [];
    if (D >= 1) chips.push(['überkritisch gedämpft (D ≥ 1)', 'warn']);
    if (eta > 0.8 && eta < 1.25) chips.push(['Resonanznähe', 'bad']);
    else if (eta >= sqrt(2)) chips.push(['überkritischer Betrieb, isolierend', 'good']);
    else chips.push(['unterkritischer Betrieb', '']);
    const rows = [
      ['Eigenkreisfrequenz <i>ω</i><sub>0</sub>', w0, '1/s'], ['Eigenfrequenz <i>f</i><sub>0</sub>', w0 / (2 * PI), 'Hz', 1],
      ['entspricht Drehzahl', w0 / (2 * PI) * 60, 'min⁻¹'], ['Dämpfungsgrad <i>D</i>', D, '', 1],
      ['gedämpfte Eigenfrequenz <i>f<sub>d</sub></i>', D < 1 ? w0 * sqrt(1 - D * D) / (2 * PI) : '–', 'Hz'],
      ['log. Dekrement <i>Λ</i>', D < 1 ? 2 * PI * D / sqrt(1 - D * D) : '–', ''],
      ['Frequenzverhältnis <i>η</i>', eta, '', 1], ['Vergrößerungsfunktion <i>V</i>', V, '', 1],
      ['statische Auslenkung <i>F̂</i>/<i>c</i>', F / c * 1000, 'mm'], ['Amplitude <i>x̂</i>', V * F / c * 1000, 'mm', 1],
      ['Phasenwinkel <i>ψ</i>', psi, '°'], ['Kraft aufs Fundament', Tr * abs(F), 'N']
    ];
    const ymax = Math.max(4, Math.min(12, (D > 0 ? 1 / (2 * D) : 12) * 1.15, V * 1.2));
    const etaMax = Math.max(3, eta * 1.15);
    const curve = Dk => Array.from({ length: 301 }, (_, i) => { const e = etaMax * i / 300; return [e, 1 / sqrt((1 - e * e) ** 2 + (2 * Dk * e) ** 2)]; });
    const series = [0.05, 0.1, 0.2, 0.3, 0.5, 1].map(Dk => ({ pts: curve(Dk), cls: 's4' }));
    series.push({ pts: curve(D), cls: 's1' });
    const fig = plot({ h: 260, x: [0, etaMax], y: [0, ymax], xl: 'η = Ω/ω₀', yl: 'V', series,
      extra: (sx, sy, mm, pw, ph) => `<line class="s3" x1="${r1(sx(sqrt(2)))}" x2="${r1(sx(sqrt(2)))}" y1="${mm.t}" y2="${mm.t + ph}"/>` + T(sx(sqrt(2)) + 4, mm.t + 14, 'η = √2', 'tk'),
      points: [{ x: eta, y: V, label: `V = ${fmt(V, 3)}` }], title: 'Vergrößerungsfunktion' });
    return { chips, rows, fig: fig + '<div class="cap">Graue Kurven: D = 0,05; 0,1; 0,2; 0,3; 0,5; 1. Blau: aktueller Dämpfungsgrad.</div>' };
  }
});

calc('traegheit', {
  fields: [
    { id: 'k', label: 'Körper', val: 'zyl', wide: 1, opts: [['zyl', 'Vollzylinder (Längsachse)'], ['hohl', 'Hohlzylinder (Längsachse)'], ['zylq', 'Vollzylinder (Querachse)'], ['kugel', 'Kugel'], ['quader', 'Quader (Achse parallel zu c)']] },
    { id: 'd', label: 'Durchmesser <i>d</i>', unit: 'mm', val: 300, when: s => s('k') === 'zyl' || s('k') === 'zylq' || s('k') === 'kugel' },
    { id: 'da', label: 'Außendurchmesser <i>d<sub>a</sub></i>', unit: 'mm', val: 300, when: s => s('k') === 'hohl' },
    { id: 'di', label: 'Innendurchmesser <i>d<sub>i</sub></i>', unit: 'mm', val: 200, when: s => s('k') === 'hohl' },
    { id: 'l', label: 'Länge <i>l</i>', unit: 'mm', val: 60, when: s => 'zyl hohl zylq'.includes(s('k')) },
    { id: 'a', label: 'Kante <i>a</i>', unit: 'mm', val: 200, when: s => s('k') === 'quader' },
    { id: 'b', label: 'Kante <i>b</i>', unit: 'mm', val: 100, when: s => s('k') === 'quader' },
    { id: 'c', label: 'Kante <i>c</i> (∥ Achse)', unit: 'mm', val: 50, when: s => s('k') === 'quader' },
    { id: 'rho', label: 'Dichte <i>ρ</i>', unit: 'kg/m³', val: 7850 },
    { id: 's', label: 'Achsabstand <i>s</i> (Steiner)', unit: 'mm', val: 0 },
    { id: 'n', label: 'Drehzahl <i>n</i>', unit: 'min⁻¹', val: 1500 },
    { id: 'TA', label: 'Beschleunigungsmoment <i>T<sub>A</sub></i>', unit: 'N·m', val: 20 }
  ],
  compute(g, sl) {
    const k = sl('k'), rho = pos(g('rho'), 'ρ'), mm = 1e-3;
    let V, J1;
    if (k === 'zyl' || k === 'zylq') { const r = pos(g('d'), 'd') / 2 * mm, l = pos(g('l'), 'l') * mm; V = PI * r * r * l; J1 = k === 'zyl' ? r * r / 2 : (3 * r * r + l * l) / 12; }
    if (k === 'hohl') { const ra = pos(g('da'), 'da') / 2 * mm, ri = nn(g('di'), 'di') / 2 * mm, l = pos(g('l'), 'l') * mm; if (ri >= ra) fail('Der Innendurchmesser muss kleiner als der Außendurchmesser sein.'); V = PI * (ra * ra - ri * ri) * l; J1 = (ra * ra + ri * ri) / 2; }
    if (k === 'kugel') { const r = pos(g('d'), 'd') / 2 * mm; V = 4 / 3 * PI * r ** 3; J1 = 0.4 * r * r; }
    if (k === 'quader') { const a = pos(g('a'), 'a') * mm, b = pos(g('b'), 'b') * mm, c = pos(g('c'), 'c') * mm; V = a * b * c; J1 = (a * a + b * b) / 12; }
    const m = rho * V, JS = m * J1, s = or0(g('s')) * mm, JA = JS + m * s * s;
    const n = or0(g('n')), w = 2 * PI * n / 60, TA = g('TA');
    return {
      rows: [
        ['Volumen <i>V</i>', V * 1e6, 'cm³'], ['Masse <i>m</i>', m, 'kg', 1],
        ['<i>J<sub>S</sub></i> (Schwerpunktachse)', JS, 'kg·m²', 1], ['<i>J<sub>A</sub></i> = <i>J<sub>S</sub></i> + <i>ms</i>²', JA, 'kg·m²', s > 0],
        ['Trägheitsradius <i>i</i>', sqrt(JA / m) * 1000, 'mm'], ['Winkelgeschwindigkeit <i>ω</i>', w, '1/s'],
        ['Rotationsenergie <i>E</i><sub>rot</sub>', 0.5 * JA * w * w / 1000, 'kJ', 1],
        ['Hochlaufzeit <i>t<sub>H</sub></i>', isFinite(TA) && TA > 0 ? JA * w / TA : '–', 's', 1],
        ['Drehwinkel beim Hochlauf', isFinite(TA) && TA > 0 ? JA * w * w / (2 * TA) / (2 * PI) : '–', 'Umdr.']
      ]
    };
  }
});

calc('stoss', {
  fields: [
    { id: 'm1', label: 'Masse <i>m</i><sub>1</sub>', unit: 'kg', val: 2 },
    { id: 'v1', label: 'Geschwindigkeit <i>v</i><sub>1</sub>', unit: 'm/s', val: 3 },
    { id: 'm2', label: 'Masse <i>m</i><sub>2</sub>', unit: 'kg', val: 1 },
    { id: 'v2', label: 'Geschwindigkeit <i>v</i><sub>2</sub>', unit: 'm/s', val: -1 },
    { id: 'e', label: 'Stoßzahl <i>e</i>', unit: '', val: 0.7, hint: '1 elastisch, 0 plastisch' }
  ],
  compute(g) {
    const m1 = pos(g('m1'), 'm₁'), m2 = pos(g('m2'), 'm₂'), v1 = fin(g('v1'), 'v₁'), v2 = fin(g('v2'), 'v₂'), e = nn(g('e'), 'e');
    if (e > 1) fail('Die Stoßzahl liegt zwischen 0 und 1.');
    if (v1 <= v2) fail('Mit v₁ ≤ v₂ holt Körper 1 Körper 2 nicht ein; es kommt zu keinem Stoß.');
    const P = m1 * v1 + m2 * v2, M = m1 + m2;
    const u1 = (P - e * m2 * (v1 - v2)) / M, u2 = (P + e * m1 * (v1 - v2)) / M;
    const E0 = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2, E1 = 0.5 * m1 * u1 * u1 + 0.5 * m2 * u2 * u2;
    return {
      rows: [
        ['<i>v</i><sub>1</sub>′ nach dem Stoß', u1, 'm/s', 1], ['<i>v</i><sub>2</sub>′ nach dem Stoß', u2, 'm/s', 1],
        ['gemeinsame Geschwindigkeit (Schwerpunkt)', P / M, 'm/s'], ['Gesamtimpuls', P, 'kg·m/s'],
        ['Energie vorher', E0, 'J'], ['Energie nachher', E1, 'J'], ['Energieverlust Δ<i>E</i>', E0 - E1, 'J', 1],
        ['Verlust in %', E0 > 0 ? (E0 - E1) / E0 * 100 : 0, '%'], ['Kraftstoß auf Körper 1', m1 * (u1 - v1), 'N·s']
      ]
    };
  }
});

/* ================= THERMODYNAMIK ================= */
const GASE = { luft: [287.1, 1.4], n2: [296.8, 1.4], o2: [259.8, 1.4], co2: [188.9, 1.29], h2: [4124, 1.41], he: [2077, 1.667], ar: [208.1, 1.667], ch4: [518.3, 1.31] };
const GAS_OPTS = [['luft', 'Luft'], ['n2', 'Stickstoff N₂'], ['o2', 'Sauerstoff O₂'], ['co2', 'Kohlendioxid CO₂'], ['h2', 'Wasserstoff H₂'], ['he', 'Helium'], ['ar', 'Argon'], ['ch4', 'Methan CH₄'], ['frei', 'eigene Werte']];
calc('zustand', {
  fields: [
    { id: 'gas', label: 'Gas', val: 'luft', opts: GAS_OPTS },
    { id: 'R', label: 'Gaskonstante <i>R<sub>i</sub></i>', unit: 'J/(kg·K)', val: 287.1, when: s => s('gas') === 'frei' },
    { id: 'k', label: 'Isentropenexponent <i>κ</i>', val: 1.4, when: s => s('gas') === 'frei' },
    { id: 'pz', label: 'Zustandsänderung', val: 'isen', opts: [['isochor', 'isochor (V = konst.)'], ['isobar', 'isobar (p = konst.)'], ['isoth', 'isotherm (T = konst.)'], ['isen', 'isentrop (adiabat, reversibel)'], ['poly', 'polytrop']] },
    { id: 'n', label: 'Polytropenexponent <i>n</i>', val: 1.3, when: s => s('pz') === 'poly' },
    { id: 'm', label: 'Masse <i>m</i>', unit: 'kg', val: 0.01 },
    { id: 'p1', label: 'Druck <i>p</i><sub>1</sub>', unit: 'bar', val: 1 },
    { id: 'T1', label: 'Temperatur <i>ϑ</i><sub>1</sub>', unit: '°C', val: 20 },
    { id: 'z', label: 'Vorgabe für Zustand 2', val: 'p2', opts: [['p2', 'Enddruck p₂'], ['T2', 'Endtemperatur ϑ₂'], ['vr', 'Volumenverhältnis V₂/V₁']] },
    { id: 'p2', label: 'Druck <i>p</i><sub>2</sub>', unit: 'bar', val: 8, when: s => s('z') === 'p2' },
    { id: 'T2', label: 'Temperatur <i>ϑ</i><sub>2</sub>', unit: '°C', val: 200, when: s => s('z') === 'T2' },
    { id: 'vr', label: 'Verhältnis <i>V</i><sub>2</sub>/<i>V</i><sub>1</sub>', val: 0.2, when: s => s('z') === 'vr' }
  ],
  compute(g, s) {
    const [R, k] = s('gas') === 'frei' ? [pos(g('R'), 'Ri'), pos(g('k'), 'κ')] : GASE[s('gas')];
    if (k <= 1) fail('κ muss größer als 1 sein.');
    const cv = R / (k - 1), cp = k * cv;
    const m = pos(g('m'), 'm'), p1 = pos(g('p1'), 'p₁') * 1e5, T1 = fin(g('T1'), 'ϑ₁') + 273.15;
    if (T1 <= 0) fail('Die Temperatur muss über dem absoluten Nullpunkt liegen.');
    const V1 = m * R * T1 / p1, pz = s('pz'), z = s('z');
    let n = { isochor: Infinity, isobar: 0, isoth: 1, isen: k, poly: fin(g('n'), 'n') }[pz];
    let p2, T2, V2;
    const zp = () => pos(g('p2'), 'p₂') * 1e5, zT = () => { const t = fin(g('T2'), 'ϑ₂') + 273.15; if (t <= 0) fail('ϑ₂ liegt unter dem absoluten Nullpunkt.'); return t; }, zr = () => pos(g('vr'), 'V₂/V₁');
    if (pz === 'isochor') {
      if (z === 'vr') fail('Bei einer isochoren Zustandsänderung bleibt das Volumen konstant. Gib p₂ oder ϑ₂ vor.');
      V2 = V1; if (z === 'p2') { p2 = zp(); T2 = T1 * p2 / p1; } else { T2 = zT(); p2 = p1 * T2 / T1; }
    } else if (pz === 'isobar') {
      if (z === 'p2') fail('Bei einer isobaren Zustandsänderung bleibt der Druck konstant. Gib ϑ₂ oder V₂/V₁ vor.');
      p2 = p1; T2 = z === 'T2' ? zT() : T1 * zr(); V2 = V1 * T2 / T1;
    } else if (pz === 'isoth' || abs(n - 1) < 1e-9) {
      if (z === 'T2') fail('Bei einer isothermen Zustandsänderung bleibt die Temperatur konstant. Gib p₂ oder V₂/V₁ vor.');
      T2 = T1; if (z === 'p2') { p2 = zp(); V2 = V1 * p1 / p2; } else { V2 = V1 * zr(); p2 = p1 * V1 / V2; }
      n = 1;
    } else {
      if (n === 0 || !isFinite(n)) fail('Für n = 0 oder n = ∞ bitte isobar bzw. isochor wählen.');
      if (z === 'p2') { p2 = zp(); T2 = T1 * (p2 / p1) ** ((n - 1) / n); V2 = V1 * (p1 / p2) ** (1 / n); }
      else if (z === 'T2') { T2 = zT(); p2 = p1 * (T2 / T1) ** (n / (n - 1)); V2 = V1 * (T1 / T2) ** (1 / (n - 1)); }
      else { const r = zr(); V2 = V1 * r; p2 = p1 * r ** -n; T2 = T1 * r ** (1 - n); }
    }
    let WV, Wt, Q;
    const dU = m * cv * (T2 - T1), dH = m * cp * (T2 - T1);
    if (pz === 'isochor') { WV = 0; Wt = V1 * (p2 - p1); Q = dU; }
    else if (pz === 'isobar') { WV = -p1 * (V2 - V1); Wt = 0; Q = dH; }
    else if (n === 1) { WV = m * R * T1 * Math.log(p2 / p1); Wt = WV; Q = -WV; }
    else { WV = m * R * (T2 - T1) / (n - 1); Wt = n * WV; Q = m * cv * (n - k) / (n - 1) * (T2 - T1); }
    const dS = m * (cp * Math.log(T2 / T1) - R * Math.log(p2 / p1));
    const K = 1e-3;
    const rows = [
      ['Volumenänderungsarbeit <i>W</i><sub>V,12</sub>', WV * K, 'kJ', 1], ['technische Arbeit <i>W</i><sub>t,12</sub>', Wt * K, 'kJ'],
      ['Wärme <i>Q</i><sub>12</sub>', Q * K, 'kJ', 1], ['Δ<i>U</i>', dU * K, 'kJ'], ['Δ<i>H</i>', dH * K, 'kJ'], ['Δ<i>S</i>', dS * K, 'kJ/K'],
      ['<i>c<sub>v</sub></i> / <i>c<sub>p</sub></i>', `${fmt(cv)} / ${fmt(cp)}`, 'J/(kg·K)'], ['Exponent <i>n</i>', isFinite(n) ? n : '∞', '']
    ];
    const table = { head: ['Zustand', 'p in bar', 'ϑ in °C', 'T in K', 'V in Liter'], rows: [['1', fmt(p1 / 1e5), fmt(T1 - 273.15), fmt(T1), fmt(V1 * 1000)], ['2', fmt(p2 / 1e5), fmt(T2 - 273.15), fmt(T2), fmt(V2 * 1000)]] };
    let pts;
    if (pz === 'isochor') pts = [[V1, p1], [V2, p2]];
    else pts = Array.from({ length: 81 }, (_, i) => { const V = V1 + (V2 - V1) * i / 80; return [V, pz === 'isobar' ? p1 : p1 * (V1 / V) ** n]; });
    pts = pts.map(p => [p[0] * 1000, p[1] / 1e5]);
    const vmax = Math.max(V1, V2) * 1000, pmax = Math.max(p1, p2) / 1e5;
    const fig = plot({ h: 260, x: [0, vmax * 1.12], y: [0, pmax * 1.15], xl: 'V in Liter', yl: 'p in bar',
      series: [{ pts, cls: 's1', area: 0, acls: 'a1' }],
      points: [{ x: V1 * 1000, y: p1 / 1e5, label: '1', cls: 'pt2' }, { x: V2 * 1000, y: p2 / 1e5, label: '2', cls: 'pt2' }], title: 'p-V-Diagramm' });
    return { table, rows, notes: [Q > 0 ? 'Dem Gas wird Wärme zugeführt.' : Q < 0 ? 'Das Gas gibt Wärme ab.' : 'Adiabat: kein Wärmeaustausch.'], fig: fig + '<div class="cap">Fläche unter der Kurve = Betrag der Volumenänderungsarbeit.</div>' };
  }
});

calc('kreisprozess', {
  fields: [
    { id: 'typ', label: 'Prozess', val: 'otto', opts: [['otto', 'Otto (Gleichraum)'], ['diesel', 'Diesel (Gleichdruck)'], ['joule', 'Joule (Gasturbine)'], ['carnot', 'Carnot']] },
    { id: 'p1', label: 'Druck <i>p</i><sub>1</sub>', unit: 'bar', val: 1, when: s => s('typ') !== 'carnot' },
    { id: 'T1', label: 'Temperatur <i>ϑ</i><sub>1</sub> (min.)', unit: '°C', val: 20 },
    { id: 'eps', label: 'Verdichtung <i>ε</i> = V₁/V₂', val: 10, when: s => s('typ') === 'otto' || s('typ') === 'diesel' },
    { id: 'pi', label: 'Druckverhältnis <i>π</i> = p₂/p₁', val: 12, when: s => s('typ') === 'joule' },
    { id: 'T3', label: 'Höchsttemperatur <i>ϑ</i><sub>3</sub>', unit: '°C', val: 1500 },
    { id: 'k', label: '<i>κ</i>', val: 1.4, when: s => s('typ') !== 'carnot' },
    { id: 'R', label: '<i>R<sub>i</sub></i>', unit: 'J/(kg·K)', val: 287.1, when: s => s('typ') !== 'carnot' }
  ],
  compute(g, s) {
    const typ = s('typ'), T1 = fin(g('T1'), 'ϑ₁') + 273.15, T3 = fin(g('T3'), 'ϑ₃') + 273.15;
    if (T1 <= 0) fail('ϑ₁ liegt unter dem absoluten Nullpunkt.');
    if (T3 <= T1) fail('Die Höchsttemperatur muss über ϑ₁ liegen.');
    const etaC = 1 - T1 / T3;
    if (typ === 'carnot') {
      const fig = plot({ h: 240, x: [0, 1], y: [0, (T3 - 273.15) * 1.15 + 20], xt: [], yl: 'ϑ in °C', xl: 's (schematisch)',
        series: [{ pts: [[0.25, T1 - 273.15], [0.25, T3 - 273.15], [0.75, T3 - 273.15], [0.75, T1 - 273.15], [0.25, T1 - 273.15]], cls: 's1', fill: 'a1' }],
        points: [{ x: 0.25, y: T1 - 273.15, label: '1', dx: -14, cls: 'pt2' }, { x: 0.25, y: T3 - 273.15, label: '2', dx: -14, cls: 'pt2' }, { x: 0.75, y: T3 - 273.15, label: '3', cls: 'pt2' }, { x: 0.75, y: T1 - 273.15, label: '4', cls: 'pt2' }], title: 'T-s-Diagramm Carnot' });
      return {
        rows: [['Carnot-Wirkungsgrad <i>η<sub>C</sub></i>', etaC * 100, '%', 1], ['Leistungszahl Kältemaschine', T1 / (T3 - T1), ''], ['Leistungszahl Wärmepumpe', T3 / (T3 - T1), '']],
        notes: ['Zwei Isothermen (Wärmezu- und -abfuhr) und zwei Isentropen. Die Fläche im T-s-Diagramm ist die Nutzarbeit.'], fig
      };
    }
    const k = pos(g('k'), 'κ'), R = pos(g('R'), 'Ri'), p1 = pos(g('p1'), 'p₁') * 1e5;
    const cv = R / (k - 1), cp = k * cv;
    const v1 = R * T1 / p1;
    let st = [], qzu, qab, eta, path = [];
    const isen = (va, pa, vb, N = 40) => Array.from({ length: N + 1 }, (_, i) => { const v = va + (vb - va) * i / N; return [v, pa * (va / v) ** k]; });
    if (typ === 'otto' || typ === 'diesel') {
      const eps = pos(g('eps'), 'ε'); if (eps <= 1) fail('Das Verdichtungsverhältnis muss größer als 1 sein.');
      const v2 = v1 / eps, T2 = T1 * eps ** (k - 1), p2 = p1 * eps ** k;
      if (T3 <= T2) fail(`ϑ₃ muss über der Verdichtungsendtemperatur ϑ₂ = ${fmt(T2 - 273.15)} °C liegen.`);
      let v3, p3, T4, p4;
      if (typ === 'otto') { v3 = v2; p3 = p2 * T3 / T2; qzu = cv * (T3 - T2); }
      else { p3 = p2; v3 = v2 * T3 / T2; qzu = cp * (T3 - T2); }
      T4 = T3 * (v3 / v1) ** (k - 1); p4 = p1 * T4 / T1;
      qab = cv * (T4 - T1);
      eta = 1 - qab / qzu;
      st = [[p1, T1, v1], [p2, T2, v2], [p3, T3, v3], [p4, T4, v1]];
      path = [...isen(v1, p1, v2), ...(typ === 'otto' ? [[v2, p3]] : [[v3, p3]]), ...isen(v3, p3, v1), [v1, p1]];
      const w = qzu - qab;
      var extraRows = [['Mitteldruck <i>p<sub>m</sub></i>', w / (v1 - v2) / 1e5, 'bar', 1], typ === 'diesel' ? ['Einspritzverhältnis <i>φ</i>', v3 / v2, ''] : null];
    } else {
      const pi = pos(g('pi'), 'π'); if (pi <= 1) fail('Das Druckverhältnis muss größer als 1 sein.');
      const T2 = T1 * pi ** ((k - 1) / k), p2 = p1 * pi, v2 = R * T2 / p2;
      if (T3 <= T2) fail(`ϑ₃ muss über der Verdichterendtemperatur ϑ₂ = ${fmt(T2 - 273.15)} °C liegen.`);
      const v3 = R * T3 / p2, T4 = T3 / pi ** ((k - 1) / k), v4 = R * T4 / p1;
      qzu = cp * (T3 - T2); qab = cp * (T4 - T1); eta = 1 - qab / qzu;
      st = [[p1, T1, v1], [p2, T2, v2], [p2, T3, v3], [p1, T4, v4]];
      path = [...isen(v1, p1, v2), [v3, p2], ...isen(v3, p2, v4), [v1, p1]];
      const wT = cp * (T3 - T4), wV = cp * (T2 - T1);
      var extraRows = [['Rückarbeitsverhältnis <i>w<sub>V</sub></i>/<i>w<sub>T</sub></i>', wV / wT, ''], ['optimales π für max. Arbeit', (T3 / T1) ** (k / (2 * (k - 1))), '']];
    }
    const K = 1e-3;
    const rows = [
      ['thermischer Wirkungsgrad <i>η</i><sub>th</sub>', eta * 100, '%', 1], ['Carnot bei gleichen Temperaturen', etaC * 100, '%'],
      ['zugeführte Wärme <i>q</i><sub>zu</sub>', qzu * K, 'kJ/kg'], ['abgeführte Wärme |<i>q</i><sub>ab</sub>|', qab * K, 'kJ/kg'],
      ['Nutzarbeit |<i>w</i>|', (qzu - qab) * K, 'kJ/kg', 1], ...extraRows
    ];
    const table = { head: ['Punkt', 'p in bar', 'ϑ in °C', 'v in m³/kg'], rows: st.map((z, i) => [String(i + 1), fmt(z[0] / 1e5), fmt(z[1] - 273.15), fmt(z[2])]) };
    const vmax = Math.max(...st.map(z => z[2])), pmax = Math.max(...st.map(z => z[0])) / 1e5;
    const fig = plot({ h: 270, x: [0, vmax * 1.1], y: [0, pmax * 1.12], xl: 'v in m³/kg', yl: 'p in bar',
      series: [{ pts: path.map(p => [p[0], p[1] / 1e5]), cls: 's1', fill: 'a1' }],
      points: st.map((z, i) => ({ x: z[2], y: z[0] / 1e5, label: String(i + 1), cls: 'pt2', dx: i === 0 || i === 3 ? 8 : -16 })), title: 'p-v-Diagramm' });
    return { table, rows, fig: fig + '<div class="cap">Die eingeschlossene Fläche ist die spezifische Nutzarbeit.</div>' };
  }
});

calc('waermeleitung', {
  fields: [
    { id: 'geo', label: 'Geometrie', val: 'wand', opts: [['wand', 'ebene Wand'], ['rohr', 'Rohr (Zylinderwand)']] },
    { id: 'A', label: 'Fläche <i>A</i>', unit: 'm²', val: 1, when: s => s('geo') === 'wand' },
    { id: 'di', label: 'Innendurchmesser <i>d<sub>i</sub></i>', unit: 'mm', val: 100, when: s => s('geo') === 'rohr' },
    { id: 'L', label: 'Rohrlänge <i>L</i>', unit: 'm', val: 1, when: s => s('geo') === 'rohr' },
    { id: 'Ti', label: 'Fluid innen <i>ϑ<sub>i</sub></i>', unit: '°C', val: 150 },
    { id: 'Ta', label: 'Fluid außen <i>ϑ<sub>a</sub></i>', unit: '°C', val: 20 },
    { id: 'ai', label: '<i>α<sub>i</sub></i>', unit: 'W/(m²·K)', val: 25 },
    { id: 'aa', label: '<i>α<sub>a</sub></i>', unit: 'W/(m²·K)', val: 8 },
    ...[1, 2, 3, 4].flatMap(i => [
      { h: `Schicht ${i}` },
      { id: 's' + i, label: `Dicke <i>s</i><sub>${i}</sub>`, unit: 'mm', val: [2, 80, 1, 0][i - 1] },
      { id: 'l' + i, label: `<i>λ</i><sub>${i}</sub>`, unit: 'W/(m·K)', val: [50, 0.04, 160, 1][i - 1] }
    ])
  ],
  compute(g, s) {
    const rohr = s('geo') === 'rohr';
    const Ti = fin(g('Ti'), 'ϑi'), Ta = fin(g('Ta'), 'ϑa'), ai = pos(g('ai'), 'αi'), aa = pos(g('aa'), 'αa');
    const lay = [];
    for (let i = 1; i <= 4; i++) { const t = or0(g('s' + i)); if (t > 0) lay.push({ i, t: t / 1000, l: pos(g('l' + i), `λ${i}`) }); }
    let Rs = [], tot, Q, unitQ, kv, x = [];
    if (!rohr) {
      const A = pos(g('A'), 'A');
      Rs = [1 / ai, ...lay.map(L => L.t / L.l), 1 / aa];
      tot = Rs.reduce((a, b) => a + b, 0);
      const q = (Ti - Ta) / tot; Q = q * A; kv = 1 / tot;
      let pos0 = 0; x = [0]; lay.forEach(L => { pos0 += L.t; x.push(pos0); });
      var rowsA = [['Wärmedurchgangskoeffizient <i>k</i>', kv, 'W/(m²·K)', 1], ['Wärmestromdichte <i>q̇</i>', q, 'W/m²', 1], ['Wärmestrom <i>Q̇</i>', Q, 'W', 1], ['Gesamtwiderstand 1/<i>k</i>', tot, 'm²·K/W']];
      unitQ = q;
    } else {
      const di = pos(g('di'), 'di') / 1000, Lr = pos(g('L'), 'L');
      let d = di; const ds = [di];
      lay.forEach(L => { d += 2 * L.t; ds.push(d); });
      Rs = [1 / (ai * PI * di), ...lay.map((L, j) => Math.log(ds[j + 1] / ds[j]) / (2 * PI * L.l)), 1 / (aa * PI * d)];
      tot = Rs.reduce((a, b) => a + b, 0);
      const ql = (Ti - Ta) / tot; Q = ql * Lr; kv = 1 / tot;
      x = ds.map(v => v / 2);
      const lastL = lay.length ? lay[lay.length - 1].l : NaN;
      var rowsA = [['längenbezogener <i>k<sub>l</sub></i>', kv, 'W/(m·K)', 1], ['Wärmestrom je Meter <i>Q̇</i>/<i>L</i>', ql, 'W/m', 1], ['Wärmestrom <i>Q̇</i>', Q, 'W', 1], ['Außendurchmesser <i>d<sub>a</sub></i>', d * 1000, 'mm'], ['kritischer Radius <i>λ</i>/<i>α<sub>a</sub></i>', lastL / aa * 1000, 'mm']];
      unitQ = ql;
    }
    const Ts = [Ti]; let Tc = Ti;
    for (const r of Rs) { Tc -= unitQ * r; Ts.push(Tc); }
    const wallT = Ts.slice(1, -1);
    const table = { head: ['Stelle', 'ϑ in °C'], rows: [['Oberfläche innen', fmt(wallT[0])], ...lay.map((L, j) => [j === lay.length - 1 ? 'Oberfläche außen' : `nach Schicht ${L.i}`, fmt(wallT[j + 1])])] };
    // Diagramm
    const span = x[x.length - 1] - x[0] || 0.01, pad = span * 0.18;
    const x0 = x[0], xe = x[x.length - 1];
    const prof = [[x0 - pad, Ti], [x0 - pad * 0.35, Ti], [x0, wallT[0]]];
    lay.forEach((L, j) => {
      if (!rohr) prof.push([x[j + 1], wallT[j + 1]]);
      else for (let k = 1; k <= 20; k++) { const r = x[j] * Math.pow(x[j + 1] / x[j], k / 20); prof.push([r, wallT[j] - (wallT[j] - wallT[j + 1]) * Math.log(r / x[j]) / Math.log(x[j + 1] / x[j])]); }
    });
    prof.push([xe + pad * 0.35, Ta], [xe + pad, Ta]);
    const k1 = 1000;
    const fig = plot({ h: 250, x: [(x0 - pad) * k1, (xe + pad) * k1], y: padRange(Math.min(Ti, Ta), Math.max(Ti, Ta), 0.12, false), xl: rohr ? 'Radius r in mm' : 'x in mm', yl: 'ϑ in °C',
      under: (sx, sy, m, pw, ph) => lay.map((L, j) => `<rect class="${j % 2 ? 'a2' : 'a1'}" x="${r1(sx(x[j] * k1))}" y="${m.t}" width="${r1(Math.max(1, sx(x[j + 1] * k1) - sx(x[j] * k1)))}" height="${ph}"/>`).join(''),
      series: [{ pts: prof.map(p => [p[0] * k1, p[1]]), cls: 's1' }],
      points: [{ x: x0 * k1, y: wallT[0], r: 4, label: fmt(wallT[0], 3) + ' °C', dx: 6, dy: -8 }, { x: xe * k1, y: wallT[wallT.length - 1], r: 4, label: fmt(wallT[wallT.length - 1], 3) + ' °C', anchor: 'end', dx: -6, dy: 16 }], title: 'Temperaturverlauf' });
    return { rows: rowsA, table, fig: fig + '<div class="cap">Schichten abwechselnd hinterlegt. Links und rechts der Wand: Temperaturabfall in der Grenzschicht des Fluids.</div>' };
  }
});

calc('waermeuebertrager', {
  fields: [
    { id: 'typ', label: 'Bauart', val: 'gegen', opts: [['gegen', 'Gegenstrom'], ['gleich', 'Gleichstrom']] },
    { h: 'Strom 1 (warm)' },
    { id: 'm1', label: 'Massenstrom <i>ṁ</i><sub>1</sub>', unit: 'kg/s', val: 0.5 },
    { id: 'c1', label: '<i>c<sub>p1</sub></i>', unit: 'kJ/(kg·K)', val: 4.19 },
    { id: 'T1', label: 'Eintritt <i>ϑ</i><sub>1</sub>′', unit: '°C', val: 90 },
    { h: 'Strom 2 (kalt)' },
    { id: 'm2', label: 'Massenstrom <i>ṁ</i><sub>2</sub>', unit: 'kg/s', val: 0.8 },
    { id: 'c2', label: '<i>c<sub>p2</sub></i>', unit: 'kJ/(kg·K)', val: 4.19 },
    { id: 'T2', label: 'Eintritt <i>ϑ</i><sub>2</sub>′', unit: '°C', val: 15 },
    { h: 'Apparat' },
    { id: 'k', label: 'Wärmedurchgang <i>k</i>', unit: 'W/(m²·K)', val: 1500 },
    { id: 'A', label: 'Fläche <i>A</i>', unit: 'm²', val: 4 }
  ],
  compute(g, s) {
    const C1 = pos(g('m1'), 'ṁ₁') * pos(g('c1'), 'cp1') * 1000, C2 = pos(g('m2'), 'ṁ₂') * pos(g('c2'), 'cp2') * 1000;
    const T1 = fin(g('T1'), 'ϑ₁′'), T2 = fin(g('T2'), 'ϑ₂′'), k = pos(g('k'), 'k'), A = pos(g('A'), 'A');
    if (T1 <= T2) fail('Strom 1 muss wärmer als Strom 2 eintreten.');
    const gegen = s('typ') === 'gegen';
    const Cmin = Math.min(C1, C2), Cmax = Math.max(C1, C2), Cr = Cmin / Cmax, NTU = k * A / Cmin;
    let eps;
    if (gegen) eps = abs(1 - Cr) < 1e-9 ? NTU / (1 + NTU) : (1 - Math.exp(-NTU * (1 - Cr))) / (1 - Cr * Math.exp(-NTU * (1 - Cr)));
    else eps = (1 - Math.exp(-NTU * (1 + Cr))) / (1 + Cr);
    const Q = eps * Cmin * (T1 - T2), T1a = T1 - Q / C1, T2a = T2 + Q / C2;
    const dA = gegen ? T1 - T2a : T1 - T2, dB = gegen ? T1a - T2 : T1a - T2a;
    const lmtd = abs(dA - dB) < 1e-9 ? dA : (dA - dB) / Math.log(dA / dB);
    // Verlauf über der Fläche (RK4)
    const N = 120, h = A / N, ph = [], pc = [];
    let th = T1, tc = gegen ? T2a : T2;
    const f = (a, b) => [-k * (a - b) / C1, (gegen ? -1 : 1) * k * (a - b) / C2];
    for (let i = 0; i <= N; i++) {
      ph.push([i * h, th]); pc.push([i * h, tc]);
      const k1 = f(th, tc), k2 = f(th + h / 2 * k1[0], tc + h / 2 * k1[1]), k3 = f(th + h / 2 * k2[0], tc + h / 2 * k2[1]), k4 = f(th + h * k3[0], tc + h * k3[1]);
      th += h / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); tc += h / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    }
    const fig = plot({ h: 250, x: [0, A], y: padRange(T2, T1, 0.1, false), xl: 'Fläche A in m²', yl: 'ϑ in °C',
      series: [{ pts: ph, cls: 's2', label: gegen ? 'warm →' : 'warm →', labelAt: 'start', ldx: 4, ldy: -8, lcls: 'tam' }, { pts: pc, cls: 's1', label: gegen ? '← kalt' : 'kalt →', labelAt: gegen ? 'end' : 'start', anchor: gegen ? 'end' : undefined, ldx: gegen ? -4 : 4, ldy: 16, lcls: 'ta' }],
      title: 'Temperaturverlauf' });
    return {
      rows: [
        ['Wärmestrom <i>Q̇</i>', Q / 1000, 'kW', 1], ['Austritt warm <i>ϑ</i><sub>1</sub>″', T1a, '°C', 1], ['Austritt kalt <i>ϑ</i><sub>2</sub>″', T2a, '°C', 1],
        ['<i>Ċ</i><sub>1</sub> / <i>Ċ</i><sub>2</sub>', `${fmt(C1 / 1000)} / ${fmt(C2 / 1000)}`, 'kW/K'], ['<i>NTU</i>', NTU, ''], ['<i>C<sub>r</sub></i>', Cr, ''],
        ['Betriebscharakteristik <i>ε</i>', eps, ''], ['Δ<i>T<sub>m</sub></i> (LMTD)', lmtd, 'K'], ['maximal möglicher Wärmestrom', Cmin * (T1 - T2) / 1000, 'kW']
      ],
      notes: [gegen && T2a > T1a ? 'Die kalte Seite tritt wärmer aus als die warme Seite: Das geht nur im Gegenstrom.' : ''],
      fig
    };
  }
});

/* ================= STRÖMUNG ================= */
const W_T = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const W_RHO = [999.8, 999.7, 998.2, 995.7, 992.2, 988.0, 983.2, 977.8, 971.8, 965.3, 958.4];
const W_ETA = [1.792, 1.306, 1.002, 0.797, 0.653, 0.547, 0.466, 0.404, 0.355, 0.315, 0.282];
function wasser(T) { if (T < 0 || T > 100) fail('Die Wassertabelle reicht von 0 bis 100 °C.'); const rho = interp(W_T, W_RHO, T), eta = interp(W_T, W_ETA, T) * 1e-3; return { rho, eta, nu: eta / rho }; }
function luft(T, p) { const TK = T + 273.15; if (TK <= 0) fail('Temperatur unter dem absoluten Nullpunkt.'); const rho = p * 1e5 / (287.1 * TK), eta = 1.716e-5 * (TK / 273.15) ** 1.5 * (273.15 + 110.4) / (TK + 110.4); return { rho, eta, nu: eta / rho, a: sqrt(1.4 * 287.1 * TK) }; }

calc('stoffwerte', {
  fields: [
    { id: 'med', label: 'Medium', val: 'wasser', opts: [['wasser', 'Wasser'], ['luft', 'Luft (trocken)']] },
    { id: 'T', label: 'Temperatur <i>ϑ</i>', unit: '°C', val: 20 },
    { id: 'p', label: 'Druck <i>p</i>', unit: 'bar', val: 1.013, when: s => s('med') === 'luft' },
    { id: 'v', label: 'Geschwindigkeit <i>v</i>', unit: 'm/s', val: 2 },
    { id: 'L', label: 'charakteristische Länge <i>L</i>', unit: 'm', val: 0.05 }
  ],
  compute(g, s) {
    const T = fin(g('T'), 'ϑ'), v = nn(g('v'), 'v'), L = pos(g('L'), 'L');
    const st = s('med') === 'wasser' ? wasser(T) : luft(T, pos(g('p'), 'p'));
    const Re = v * L / st.nu;
    const rows = [
      ['Dichte <i>ρ</i>', st.rho, 'kg/m³', 1], ['dyn. Viskosität <i>η</i>', st.eta * 1e3, 'mPa·s'], ['kin. Viskosität <i>ν</i>', st.nu * 1e6, 'mm²/s', 1],
      ['Reynolds-Zahl <i>Re</i>', Re, '', 1], ['Froude-Zahl <i>Fr</i>', v / sqrt(9.81 * L), ''], ['Staudruck <i>ρv</i>²/2', st.rho * v * v / 2, 'Pa']
    ];
    if (st.a) rows.push(['Schallgeschwindigkeit <i>a</i>', st.a, 'm/s'], ['Mach-Zahl <i>Ma</i>', v / st.a, ''], ['Prandtl-Zahl <i>Pr</i> (≈)', 0.71, '']);
    const notes = [Re < 2300 ? 'Als Rohrströmung (L = d): laminar.' : Re < 4000 ? 'Als Rohrströmung (L = d): Übergangsbereich.' : 'Als Rohrströmung (L = d): turbulent.'];
    if (st.a && v / st.a > 0.3) notes.push('Ma > 0,3: Kompressibilität ist nicht mehr vernachlässigbar.');
    return { rows, notes };
  }
});

function colebrook(Re, kd) {
  let x = -1.8 * Math.log10(6.9 / Re + (kd / 3.7) ** 1.11);
  for (let i = 0; i < 40; i++) x = -2 * Math.log10(2.51 * x / Re + kd / 3.71);
  return 1 / (x * x);
}
calc('rohr', {
  fields: [
    { id: 'med', label: 'Medium', val: 'wasser', opts: [['wasser', 'Wasser'], ['luft', 'Luft'], ['oel', 'Hydrauliköl HLP 46 (40 °C)'], ['frei', 'eigene Stoffwerte']] },
    { id: 'T', label: 'Temperatur <i>ϑ</i>', unit: '°C', val: 20, when: s => s('med') === 'wasser' || s('med') === 'luft' },
    { id: 'p', label: 'Druck <i>p</i>', unit: 'bar', val: 1.013, when: s => s('med') === 'luft' },
    { id: 'rho', label: 'Dichte <i>ρ</i>', unit: 'kg/m³', val: 870, when: s => s('med') === 'frei' },
    { id: 'nu', label: 'kin. Viskosität <i>ν</i>', unit: 'mm²/s', val: 46, when: s => s('med') === 'frei' },
    { id: 'd', label: 'Innendurchmesser <i>d</i>', unit: 'mm', val: 50 },
    { id: 'V', label: 'Volumenstrom <i>V̇</i>', unit: 'm³/h', val: 12 },
    { id: 'L', label: 'Rohrlänge <i>L</i>', unit: 'm', val: 100 },
    { id: 'k', label: 'Rauheit <i>k</i>', unit: 'mm', val: 0.05, hint: 'Stahl neu 0,02 … 0,05; Kunststoff 0,007' },
    { id: 'z', label: 'Summe der Verlustbeiwerte Σ<i>ζ</i>', val: 4 },
    { id: 'dz', label: 'Höhendifferenz <i>z</i><sub>2</sub> − <i>z</i><sub>1</sub>', unit: 'm', val: 5 }
  ],
  compute(g, s) {
    const med = s('med');
    let st;
    if (med === 'wasser') st = wasser(fin(g('T'), 'ϑ'));
    else if (med === 'luft') st = luft(fin(g('T'), 'ϑ'), pos(g('p'), 'p'));
    else if (med === 'oel') st = { rho: 870, nu: 46e-6 };
    else st = { rho: pos(g('rho'), 'ρ'), nu: pos(g('nu'), 'ν') * 1e-6 };
    const d = pos(g('d'), 'd') / 1000, Vd = pos(g('V'), 'V̇') / 3600, L = nn(g('L'), 'L'), k = nn(g('k'), 'k') / 1000, z = or0(g('z')), dz = or0(g('dz'));
    const A = PI * d * d / 4, v = Vd / A, Re = v * d / st.nu, kd = k / d;
    const lam = Re < 2300 ? 64 / Re : colebrook(Re, kd);
    const qd = st.rho / 2 * v * v;
    const dpR = lam * L / d * qd, dpZ = z * qd, dpG = st.rho * 9.81 * dz, dp = dpR + dpZ + dpG;
    const regime = Re < 2300 ? ['laminar', 'good'] : Re < 4000 ? ['Übergangsbereich, λ unsicher', 'warn'] : ['turbulent', ''];
    const rows = [
      ['Geschwindigkeit <i>v</i>', v, 'm/s', 1], ['Reynolds-Zahl <i>Re</i>', Re, '', 1], ['relative Rauheit <i>k</i>/<i>d</i>', kd, ''],
      ['Rohrreibungszahl <i>λ</i>', lam, '', 1], ['Reibungsverlust Δ<i>p<sub>R</sub></i>', dpR / 1e5, 'bar'], ['Einzelverluste Δ<i>p<sub>ζ</sub></i>', dpZ / 1e5, 'bar'],
      ['geodätisch <i>ρg</i>Δ<i>z</i>', dpG / 1e5, 'bar'], ['Druckdifferenz gesamt', dp / 1e5, 'bar', 1], ['Verlusthöhe <i>h<sub>V</sub></i>', (dpR + dpZ) / (st.rho * 9.81), 'm'],
      ['hydraulische Leistung <i>V̇</i>·Δ<i>p</i>', Vd * dp, 'W', 1]
    ];
    // Moody-Diagramm
    const kds = [0, 1e-5, 1e-4, 5e-4, 1e-3, 5e-3, 0.01, 0.02, 0.05];
    const re = Array.from({ length: 80 }, (_, i) => Math.pow(10, Math.log10(2300) + (8 - Math.log10(2300)) * i / 79));
    const series = [{ pts: [[1e3, 0.064], [2300, 64 / 2300]], cls: 's2', label: 'laminar', labelAt: 'start', ldx: 4, ldy: -6, lcls: 'tam' }];
    kds.forEach(kk => series.push({ pts: re.map(r => [r, colebrook(r, kk)]), cls: abs(kk - kd) < 1e-12 ? 's1' : 's4', label: kk === 0 ? 'glatt' : fmt(kk, 2) }));
    if (!kds.some(kk => abs(kk - kd) < 1e-12) && kd < 0.06) series.push({ pts: re.map(r => [r, colebrook(r, kd)]), cls: 's1' });
    const fig = plot({ h: 300, m: { r: 54 }, x: [1e3, 1e8], y: [0.008, 0.1], xlog: true, ylog: true, xl: 'Reynolds-Zahl Re', yl: 'λ', yt: [0.008, 0.01, 0.015, 0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1], yf: v => fmt(v, 3),
      series, points: [{ x: Re, y: lam, label: `λ = ${fmt(lam, 3)}`, dy: -10 }], title: 'Moody-Diagramm' });
    return { chips: [regime], rows, notes: [v > 3 && med === 'wasser' ? 'Für Wasserleitungen ist die Geschwindigkeit hoch; üblich sind 1 … 2 m/s.' : ''], fig: fig + '<div class="cap">Kurven für k/d (rechts beschriftet), blau: aktuelles Rohr.</div>' };
  }
});

calc('bernoulli', {
  fields: [
    { id: 'm', label: 'Aufgabe', val: 'venturi', wide: 1, opts: [['venturi', 'Venturi-Durchflussmessung'], ['aus', 'Ausfluss aus einem Behälter'], ['cw', 'Strömungswiderstand eines Körpers']] },
    { id: 'rho', label: 'Dichte <i>ρ</i>', unit: 'kg/m³', val: 998, when: s => s('m') === 'venturi' },
    { id: 'd1', label: 'Rohrdurchmesser <i>d</i><sub>1</sub>', unit: 'mm', val: 100, when: s => s('m') === 'venturi' },
    { id: 'd2', label: 'Engstelle <i>d</i><sub>2</sub>', unit: 'mm', val: 50, when: s => s('m') === 'venturi' },
    { id: 'dp', label: 'Wirkdruck Δ<i>p</i>', unit: 'mbar', val: 150, when: s => s('m') === 'venturi' },
    { id: 'C', label: 'Durchflussbeiwert <i>C</i>', val: 0.98, when: s => s('m') === 'venturi' },
    { id: 'h', label: 'Wasserspiegel über Öffnung <i>h</i>', unit: 'm', val: 2, when: s => s('m') === 'aus' },
    { id: 'do', label: 'Öffnungsdurchmesser <i>d</i>', unit: 'mm', val: 20, when: s => s('m') === 'aus' },
    { id: 'mu', label: 'Ausflusszahl <i>μ</i>', val: 0.62, when: s => s('m') === 'aus' },
    { id: 'phi', label: 'Geschwindigkeitszahl <i>φ</i>', val: 0.97, when: s => s('m') === 'aus' },
    { id: 'AB', label: 'Behälterquerschnitt <i>A<sub>B</sub></i>', unit: 'm²', val: 1, when: s => s('m') === 'aus' },
    { id: 'cw', label: 'Widerstandsbeiwert <i>c<sub>W</sub></i>', val: 0.3, when: s => s('m') === 'cw' },
    { id: 'A', label: 'Stirnfläche <i>A</i>', unit: 'm²', val: 2.2, when: s => s('m') === 'cw' },
    { id: 'v', label: 'Geschwindigkeit <i>v</i>', unit: 'km/h', val: 100, when: s => s('m') === 'cw' },
    { id: 'rl', label: 'Dichte <i>ρ</i>', unit: 'kg/m³', val: 1.204, when: s => s('m') === 'cw' }
  ],
  compute(g, s) {
    const m = s('m');
    if (m === 'venturi') {
      const rho = pos(g('rho'), 'ρ'), d1 = pos(g('d1'), 'd₁') / 1000, d2 = pos(g('d2'), 'd₂') / 1000, dp = nn(g('dp'), 'Δp') * 100, C = pos(g('C'), 'C');
      if (d2 >= d1) fail('Die Engstelle muss kleiner als der Rohrdurchmesser sein.');
      const A1 = PI * d1 * d1 / 4, A2 = PI * d2 * d2 / 4, v2 = sqrt(2 * dp / rho / (1 - (A2 / A1) ** 2)), V = C * A2 * v2;
      return { rows: [['Öffnungsverhältnis <i>A</i><sub>2</sub>/<i>A</i><sub>1</sub>', A2 / A1, ''], ['<i>v</i><sub>2</sub> (Engstelle, ideal)', v2, 'm/s'], ['<i>v</i><sub>1</sub> (Rohr)', V / A1, 'm/s'], ['Volumenstrom <i>V̇</i>', V * 3600, 'm³/h', 1], ['', V * 1000, 'L/s'], ['Massenstrom <i>ṁ</i>', V * rho, 'kg/s', 1]] };
    }
    if (m === 'aus') {
      const h = nn(g('h'), 'h'), d = pos(g('do'), 'd') / 1000, mu = pos(g('mu'), 'μ'), phi = pos(g('phi'), 'φ'), AB = g('AB');
      const A = PI * d * d / 4, vt = sqrt(2 * 9.81 * h), V = mu * A * vt;
      const tl = isFinite(AB) && AB > A ? AB / (mu * A) * sqrt(2 * h / 9.81) : NaN;
      return { rows: [['Torricelli-Geschwindigkeit √(2<i>gh</i>)', vt, 'm/s'], ['Strahlgeschwindigkeit <i>φ</i>√(2<i>gh</i>)', phi * vt, 'm/s', 1], ['Volumenstrom <i>V̇</i>', V * 1000, 'L/s', 1], ['', V * 3600, 'm³/h'], ['Kontraktionszahl <i>α</i> = <i>μ</i>/<i>φ</i>', mu / phi, ''], ['Auslaufzeit bis leer', tl / 60, 'min', 1]], notes: ['Auslaufzeit für einen prismatischen Behälter ohne Zulauf: t = (A<sub>B</sub>/μA)·√(2h/g).'] };
    }
    const cw = pos(g('cw'), 'cW'), A = pos(g('A'), 'A'), v = nn(g('v'), 'v') / 3.6, rho = pos(g('rl'), 'ρ');
    const q = rho / 2 * v * v, F = cw * q * A;
    const vs = Array.from({ length: 61 }, (_, i) => i * Math.max(v, 1) * 1.5 / 60);
    const fig = plot({ h: 220, x: [0, Math.max(v, 1) * 1.5 * 3.6], y: [0, cw * rho / 2 * (Math.max(v, 1) * 1.5) ** 3 * A / 1000 * 1.05], xl: 'v in km/h', yl: 'P in kW',
      series: [{ pts: vs.map(u => [u * 3.6, cw * rho / 2 * u ** 3 * A / 1000]), cls: 's1', area: 0 }], points: [{ x: v * 3.6, y: F * v / 1000, label: fmt(F * v / 1000, 3) + ' kW' }], title: 'Widerstandsleistung' });
    return { rows: [['Staudruck <i>q</i>', q, 'Pa'], ['Widerstandskraft <i>F<sub>W</sub></i>', F, 'N', 1], ['Widerstandsleistung <i>P</i>', F * v / 1000, 'kW', 1], ['<i>c<sub>W</sub></i>·<i>A</i>', cw * A, 'm²']], notes: ['Die Leistung wächst mit der dritten Potenz der Geschwindigkeit.'], fig };
  }
});

/* ================= TOLERANZEN ================= */
const MAIN_UP = [3, 6, 10, 18, 30, 50, 80, 120, 180, 250, 315, 400, 500];
const FINE_UP = [3, 6, 10, 14, 18, 24, 30, 40, 50, 65, 80, 100, 120, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450, 500];
const IT = {
  1: [0.8, 1, 1, 1.2, 1.5, 1.5, 2, 2.5, 3.5, 4.5, 6, 7, 8], 2: [1.2, 1.5, 1.5, 2, 2.5, 2.5, 3, 4, 5, 7, 8, 9, 10],
  3: [2, 2.5, 2.5, 3, 4, 4, 5, 6, 8, 10, 12, 13, 15], 4: [3, 4, 4, 5, 6, 7, 8, 10, 12, 14, 16, 18, 20],
  5: [4, 5, 6, 8, 9, 11, 13, 15, 18, 20, 23, 25, 27], 6: [6, 8, 9, 11, 13, 16, 19, 22, 25, 29, 32, 36, 40],
  7: [10, 12, 15, 18, 21, 25, 30, 35, 40, 46, 52, 57, 63], 8: [14, 18, 22, 27, 33, 39, 46, 54, 63, 72, 81, 89, 97],
  9: [25, 30, 36, 43, 52, 62, 74, 87, 100, 115, 130, 140, 155], 10: [40, 48, 58, 70, 84, 100, 120, 140, 160, 185, 210, 230, 250],
  11: [60, 75, 90, 110, 130, 160, 190, 220, 250, 290, 320, 360, 400], 12: [100, 120, 150, 180, 210, 250, 300, 350, 400, 460, 520, 570, 630],
  13: [140, 180, 220, 270, 330, 390, 460, 540, 630, 720, 810, 890, 970], 14: [250, 300, 360, 430, 520, 620, 740, 870, 1000, 1150, 1300, 1400, 1550],
  15: [400, 480, 580, 700, 840, 1000, 1200, 1400, 1600, 1850, 2100, 2300, 2500], 16: [600, 750, 900, 1100, 1300, 1600, 1900, 2200, 2500, 2900, 3200, 3600, 4000]
};
const SH_MAIN = {
  d: [-20, -30, -40, -50, -65, -80, -100, -120, -145, -170, -190, -210, -230],
  e: [-14, -20, -25, -32, -40, -50, -60, -72, -85, -100, -110, -125, -135],
  f: [-6, -10, -13, -16, -20, -25, -30, -36, -43, -50, -56, -62, -68],
  g: [-2, -4, -5, -6, -7, -9, -10, -12, -14, -15, -17, -18, -20],
  h: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  k: [0, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 4, 5],
  m: [2, 4, 6, 7, 8, 9, 11, 13, 15, 17, 20, 21, 23],
  n: [4, 8, 10, 12, 15, 17, 20, 23, 27, 31, 34, 37, 40],
  p: [6, 12, 15, 18, 22, 26, 32, 37, 43, 50, 56, 62, 68]
};
const SH_FINE = {
  c: [-60, -70, -80, -95, -95, -110, -110, -120, -130, -140, -150, -170, -180, -200, -210, -230, -240, -260, -280, -300, -330, -360, -400, -440, -480],
  r: [10, 15, 19, 23, 23, 28, 28, 34, 34, 41, 43, 51, 54, 63, 65, 68, 77, 80, 84, 94, 98, 108, 114, 126, 132],
  s: [14, 19, 23, 28, 28, 35, 35, 43, 43, 53, 59, 71, 79, 92, 100, 108, 122, 130, 140, 158, 170, 190, 208, 232, 252],
  t: [null, null, null, null, null, null, 41, 48, 54, 66, 75, 91, 104, 122, 134, 146, 166, 180, 196, 218, 240, 268, 294, 330, 360],
  u: [18, 23, 28, 33, 33, 41, 48, 60, 70, 87, 102, 124, 144, 170, 190, 210, 236, 258, 284, 315, 350, 390, 435, 490, 540]
};
function isoRange(D) {
  if (!(D > 0) || D > 500) fail('ISO 286 ist hier für Nennmaße über 0 bis 500 mm hinterlegt.');
  return { mi: MAIN_UP.findIndex(u => D <= u), fi: FINE_UP.findIndex(u => D <= u) };
}
function shaftDev(l, gr, D) {
  const { mi, fi } = isoRange(D), Tt = IT[gr][mi];
  if (l === 'js') return { es: Tt / 2, ei: -Tt / 2, T: Tt };
  if ('cdefgh'.includes(l)) { const es = l === 'c' ? SH_FINE.c[fi] : SH_MAIN[l][mi]; return { es, ei: es - Tt, T: Tt }; }
  let ei;
  if (l === 'k') ei = gr >= 4 && gr <= 7 ? SH_MAIN.k[mi] : 0;
  else if ('mnp'.includes(l)) ei = SH_MAIN[l][mi];
  else { ei = SH_FINE[l][fi]; if (ei === null) fail(`Das Grundabmaß ${l} ist erst für Nennmaße über 24 mm genormt.`); }
  return { es: ei + Tt, ei, T: Tt };
}
function holeDev(L, gr, D) {
  const { mi, fi } = isoRange(D), Tt = IT[gr][mi];
  if (L === 'JS') return { ES: Tt / 2, EI: -Tt / 2, T: Tt };
  if ('CDEFGH'.includes(L)) { const EI = -shaftDev(L.toLowerCase(), gr, D).es; return { ES: EI + Tt, EI, T: Tt }; }
  const delta = D <= 3 || gr < 2 ? 0 : IT[gr][mi] - IT[gr - 1][mi];
  let ES;
  if (L === 'K') ES = gr <= 8 ? -SH_MAIN.k[mi] + delta : 0;
  else if (L === 'M') ES = gr <= 8 ? -SH_MAIN.m[mi] + delta : -SH_MAIN.m[mi];
  else if (L === 'N') ES = gr <= 8 ? -SH_MAIN.n[mi] + delta : (D <= 3 ? -4 : 0);
  else {
    const l = L.toLowerCase();
    const ei = l === 'p' ? SH_MAIN.p[mi] : SH_FINE[l][fi];
    if (ei === null) fail(`Das Grundabmaß ${L} ist erst für Nennmaße über 24 mm genormt.`);
    ES = gr <= 7 ? -ei + delta : -ei;
  }
  return { ES, EI: ES - Tt, T: Tt };
}
function fitOf(N, H, hg, S, sg) {
  const b = holeDev(H, hg, N), w = shaftDev(S, sg, N);
  return { b, w, PSH: b.ES - w.ei, PSM: b.EI - w.es };
}
const HOLES = ['C', 'D', 'E', 'F', 'G', 'H', 'JS', 'K', 'M', 'N', 'P', 'R', 'S', 'T', 'U'];
const SHAFTS = ['c', 'd', 'e', 'f', 'g', 'h', 'js', 'k', 'm', 'n', 'p', 'r', 's', 't', 'u'];
const GRADES = [4, 5, 6, 7, 8, 9, 10, 11].map(x => [String(x), 'IT' + x]);

calc('passung', {
  fields: [
    { id: 'N', label: 'Nennmaß <i>N</i>', unit: 'mm', val: 40 },
    { id: 'H', label: 'Bohrung Grundabmaß', val: 'H', opts: HOLES.map(x => [x, x]) },
    { id: 'hg', label: 'Bohrung Toleranzgrad', val: '7', opts: GRADES },
    { id: 'S', label: 'Welle Grundabmaß', val: 'g', opts: SHAFTS.map(x => [x, x]) },
    { id: 'sg', label: 'Welle Toleranzgrad', val: '6', opts: GRADES }
  ],
  compute(g, s) {
    const N = pos(g('N'), 'N'), H = s('H'), hg = +s('hg'), S = s('S'), sg = +s('sg');
    const { b, w, PSH, PSM } = fitOf(N, H, hg, S, sg);
    const art = PSM >= 0 ? ['Spielpassung', 'good'] : PSH <= 0 ? ['Übermaßpassung', 'bad'] : ['Übergangspassung', 'warn'];
    const mm = v => fx(v, 3);
    const rows = [
      { h: `Bohrung ${H}${hg}` },
      ['oberes Abmaß <i>ES</i>', sgn(b.ES), 'µm', 1], ['unteres Abmaß <i>EI</i>', sgn(b.EI), 'µm', 1],
      ['Höchstmaß', mm(N + b.ES / 1000), 'mm'], ['Mindestmaß', mm(N + b.EI / 1000), 'mm'], ['Toleranz <i>T<sub>B</sub></i>', b.T, 'µm'],
      { h: `Welle ${S}${sg}` },
      ['oberes Abmaß <i>es</i>', sgn(w.es), 'µm', 1], ['unteres Abmaß <i>ei</i>', sgn(w.ei), 'µm', 1],
      ['Höchstmaß', mm(N + w.es / 1000), 'mm'], ['Mindestmaß', mm(N + w.ei / 1000), 'mm'], ['Toleranz <i>T<sub>W</sub></i>', w.T, 'µm'],
      { h: 'Passung' },
      [PSH >= 0 ? 'Höchstspiel <i>P<sub>SH</sub></i>' : 'Mindestübermaß', abs(PSH), 'µm', 1],
      [PSM >= 0 ? 'Mindestspiel <i>P<sub>SM</sub></i>' : 'Höchstübermaß', abs(PSM), 'µm', 1],
      ['Passtoleranz <i>T<sub>B</sub></i> + <i>T<sub>W</sub></i>', b.T + w.T, 'µm']
    ];
    // Toleranzfeldbild
    const vals = [b.ES, b.EI, w.es, w.ei, 0];
    const hi = Math.max(...vals), lo = Math.min(...vals), span = hi - lo || 1;
    const W = 640, Hh = 280, top = 30, bot = Hh - 34, Y = v => r1(top + (hi - v) / span * (bot - top));
    let v = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Toleranzfeldbild">`;
    for (const t of ticks(lo, hi, 5)) if (t >= lo && t <= hi) v += `<line class="gl" x1="70" x2="${W - 20}" y1="${Y(t)}" y2="${Y(t)}"/>` + T(62, Y(t) + 4, sgn(t), 'tk', 'end');
    v += `<line class="ink" x1="70" x2="${W - 20}" y1="${Y(0)}" y2="${Y(0)}"/>` + T(W - 22, Y(0) - 6, `Nulllinie (N = ${fmt(N)} mm)`, 'tk', 'end');
    v += T(10, 16, 'Abmaß in µm', 'lb');
    const box = (x, a, c, cls, txtCls, lab) => {
      const y1 = Y(a), y2 = Y(c), hgt = Math.max(2, y2 - y1);
      return `<rect class="${cls}" x="${x}" y="${y1}" width="150" height="${hgt}" style="stroke-width:1.5"/>` +
        T(x + 75, y1 + hgt / 2 + 5, lab, txtCls, 'middle') + T(x + 158, y1 + 4, sgn(a), 'tk') + T(x + 158, y2 + 4, sgn(c), 'tk');
    };
    v += box(150, b.ES, b.EI, 'a1', 'ta', `${H}${hg}`).replace('class="a1"', 'class="a1" stroke="var(--accent)"');
    v += box(390, w.es, w.ei, 'a2', 'tam', `${S}${sg}`).replace('class="a2"', 'class="a2" stroke="var(--amber)"');
    v += T(225, Hh - 10, 'Bohrung', 'lb', 'middle') + T(465, Hh - 10, 'Welle', 'lb', 'middle');
    v += '</svg>';
    const notes = [];
    if (H !== 'H' && S !== 'h') notes.push('Weder Einheitsbohrung (H) noch Einheitswelle (h): solche Kombinationen sind möglich, aber unüblich.');
    return { chips: [art], rows, notes, fig: v };
  }
});

calc('iso2768', {
  fields: [
    { id: 'N', label: 'Nennmaß (Länge)', unit: 'mm', val: 45 },
    { id: 'W', label: 'kürzerer Winkelschenkel', unit: 'mm', val: 30 }
  ],
  compute(g) {
    const N = pos(g('N'), 'das Nennmaß'), Wl = g('W');
    const LB = [3, 6, 30, 120, 400, 1000, 2000, 4000];
    const LT = { f: [0.05, 0.05, 0.1, 0.15, 0.2, 0.3, 0.5, null], m: [0.1, 0.1, 0.2, 0.3, 0.5, 0.8, 1.2, 2], c: [0.2, 0.3, 0.5, 0.8, 1.2, 2, 3, 4], v: [null, 0.5, 1, 1.5, 2.5, 4, 6, 8] };
    if (N < 0.5) fail('Unter 0,5 mm gibt ISO 2768 keine Allgemeintoleranz an; die Toleranz muss direkt am Maß stehen.');
    if (N > 4000) fail('ISO 2768-1 reicht bis 4000 mm.');
    const i = LB.findIndex(u => N <= u);
    const t = c => (LT[c][i] === null ? '–' : '±' + fx(LT[c][i], LT[c][i] < 0.1 ? 2 : LT[c][i] < 1 ? (LT[c][i] * 10 % 1 ? 2 : 1) : 0).replace(/,0+$/, ''));
    const ri = N <= 3 ? 0 : N <= 6 ? 1 : 2;
    const RF = [[0.2, 0.4], [0.5, 1], [1, 2]][ri];
    let ang = null;
    if (isFinite(Wl) && Wl > 0) {
      const j = Wl <= 10 ? 0 : Wl <= 50 ? 1 : Wl <= 120 ? 2 : Wl <= 400 ? 3 : 4;
      ang = [['±1°', '±0°30′', '±0°20′', '±0°10′', '±0°5′'][j], ['±1°30′', '±1°', '±0°30′', '±0°15′', '±0°10′'][j], ['±3°', '±2°', '±1°', '±0°30′', '±0°20′'][j]];
    }
    return {
      table: { head: ['Klasse', 'Längenmaß in mm', 'Rundung/Fase in mm', 'Winkel'], rows: [
        ['f (fein)', t('f'), '±' + fx(RF[0], 1), ang ? ang[0] : '–'],
        ['m (mittel)', t('m'), '±' + fx(RF[0], 1), ang ? ang[0] : '–'],
        ['c (grob)', t('c'), '±' + fx(RF[1], 1), ang ? ang[1] : '–'],
        ['v (sehr grob)', t('v'), '±' + fx(RF[1], 1), ang ? ang[2] : '–']
      ] },
      notes: [`Nennmaßbereich für Längen: ${i === 0 ? '0,5 … 3' : 'über ' + fmt(LB[i - 1]) + ' … ' + fmt(LB[i])} mm.`, 'Die Rundungs- und Fasentoleranz gilt, wenn das eingegebene Maß ein Radius oder eine Fasenhöhe ist.']
    };
  }
});

calc('masskette', {
  fields: [1, 2, 3, 4, 5, 6].flatMap(i => [
    { h: `Glied ${i}` },
    { id: 'N' + i, label: 'Nennmaß', unit: 'mm', val: [118.5, 23, 23, 72, 0, 0][i - 1] },
    { id: 'o' + i, label: 'oberes Abmaß', unit: 'mm', val: [0.1, 0, 0, 0.05, 0, 0][i - 1] },
    { id: 'u' + i, label: 'unteres Abmaß', unit: 'mm', val: [0, -0.12, -0.12, -0.05, 0, 0][i - 1] },
    { id: 'r' + i, label: 'Richtung', val: ['+', '-', '-', '-', '+', '+'][i - 1], opts: [['+', '+ vergrößert'], ['-', '− verkleinert']] }
  ]),
  compute(g, s) {
    const L = [];
    for (let i = 1; i <= 6; i++) {
      const N = or0(g('N' + i)); if (N === 0) continue;
      const o = or0(g('o' + i)), u = or0(g('u' + i));
      if (u > o) fail(`Glied ${i}: Das untere Abmaß muss kleiner als das obere sein.`);
      L.push({ i, N, o, u, d: s('r' + i) === '-' ? -1 : 1, T: o - u, C: N + (o + u) / 2 });
    }
    if (!L.length) fail('Mindestens ein Glied mit Nennmaß ungleich 0 eingeben.');
    const M0 = L.reduce((a, x) => a + x.d * x.N, 0);
    const Go = L.reduce((a, x) => a + (x.d > 0 ? x.N + x.o : -(x.N + x.u)), 0);
    const Gu = L.reduce((a, x) => a + (x.d > 0 ? x.N + x.u : -(x.N + x.o)), 0);
    const T0 = L.reduce((a, x) => a + x.T, 0), Ts = sqrt(L.reduce((a, x) => a + x.T * x.T, 0));
    const C0 = L.reduce((a, x) => a + x.d * x.C, 0);
    const chips = [Gu < 0 && Go > 0 ? ['Schließmaß kann das Vorzeichen wechseln', 'warn'] : Gu >= 0 ? ['Schließmaß immer ≥ 0', 'good'] : ['Schließmaß immer negativ', 'bad']];
    const f3 = v => fx(v, 3);
    const rows = [
      ['Nennschließmaß <i>M</i><sub>0</sub>', f3(M0), 'mm', 1],
      { h: 'Arithmetisch (Worst Case)' },
      ['Höchstmaß <i>G</i><sub>o,0</sub>', f3(Go), 'mm', 1], ['Mindestmaß <i>G</i><sub>u,0</sub>', f3(Gu), 'mm', 1], ['Toleranz <i>T</i><sub>0</sub>', f3(T0), 'mm'],
      { h: 'Statistisch (RSS, ±3σ)' },
      ['Mittelwert <i>C</i><sub>0</sub>', f3(C0), 'mm'], ['Toleranz <i>T</i><sub>0,s</sub>', f3(Ts), 'mm'],
      ['obere Grenze', f3(C0 + Ts / 2), 'mm', 1], ['untere Grenze', f3(C0 - Ts / 2), 'mm', 1], ['Einsparung gegenüber Worst Case', (1 - Ts / T0) * 100, '%']
    ];
    // Balken
    const W = 640, rowH = 26, n = L.length + 2, Hh = 30 + n * rowH + 10, x0 = 170, xw = W - x0 - 70, tmax = T0 || 1;
    let v = `<svg viewBox="0 0 ${W} ${Hh}" role="img" aria-label="Toleranzanteile">` + T(10, 18, 'Toleranz in mm', 'lb');
    const bar = (y, lab, t, cls) => T(x0 - 10, y + 15, lab, 'lb', 'end') + `<rect class="${cls}" x="${x0}" y="${y + 4}" width="${r1(Math.max(1, t / tmax * xw))}" height="${rowH - 10}"/>` + T(x0 + t / tmax * xw + 6, y + 15, f3(t), 'tk');
    L.forEach((x, k) => { v += bar(28 + k * rowH, `Glied ${x.i} (${x.d > 0 ? '+' : '−'})`, x.T, 'fa'); });
    v += bar(28 + L.length * rowH, 'T₀ arithmetisch', T0, 'fam');
    v += bar(28 + (L.length + 1) * rowH, 'T₀ statistisch', Ts, 'fam');
    v += '</svg>';
    return { chips, rows, fig: v };
  }
});

/* ================= MASCHINENELEMENTE ================= */
const GEW = { // d, P, d2, d3, As, SW, dh mittel
  M4: [4, 0.7, 3.545, 3.141, 8.78, 7, 4.5], M5: [5, 0.8, 4.480, 4.019, 14.2, 8, 5.5], M6: [6, 1, 5.350, 4.773, 20.1, 10, 6.6],
  M8: [8, 1.25, 7.188, 6.466, 36.6, 13, 9], M10: [10, 1.5, 9.026, 8.160, 58.0, 16, 11], M12: [12, 1.75, 10.863, 9.853, 84.3, 18, 13.5],
  M14: [14, 2, 12.701, 11.546, 115, 21, 15.5], M16: [16, 2, 14.701, 13.546, 157, 24, 17.5], M20: [20, 2.5, 18.376, 16.933, 245, 30, 22],
  M24: [24, 3, 22.051, 20.319, 353, 36, 26], M30: [30, 3.5, 27.727, 25.706, 561, 46, 33], M36: [36, 4, 33.402, 31.093, 817, 55, 39]
};
const FK = { '4.6': [240, 400], '5.6': [300, 500], '8.8': [640, 800], '10.9': [940, 1040], '12.9': [1100, 1220] };
calc('schraube', {
  fields: [
    { id: 'g', label: 'Gewinde', val: 'M12', opts: Object.keys(GEW).map(k => [k, k]) },
    { id: 'fk', label: 'Festigkeitsklasse', val: '8.8', opts: Object.keys(FK).map(k => [k, k]) },
    { id: 'muG', label: 'Gewindereibung <i>μ<sub>G</sub></i>', val: 0.12 },
    { id: 'muK', label: 'Kopfreibung <i>μ<sub>K</sub></i>', val: 0.12 },
    { id: 'nu', label: 'Ausnutzung <i>ν</i>', val: 0.9 },
    { id: 'aA', label: 'Anziehfaktor <i>α<sub>A</sub></i>', val: 1.6 },
    { h: 'Betriebslast (optional)' },
    { id: 'FA', label: 'axiale Betriebskraft <i>F<sub>A</sub></i>', unit: 'N', val: 10000 },
    { id: 'Phi', label: 'Kraftverhältnis <i>Φ<sub>n</sub></i>', val: 0.1 },
    { id: 'FZ', label: 'Setzkraftverlust <i>F<sub>Z</sub></i>', unit: 'N', val: 3000 }
  ],
  compute(g, s) {
    const [d, P, d2, d3, As, SW, dh] = GEW[s('g')];
    let [Rp, Rm] = FK[s('fk')];
    if (s('fk') === '8.8' && d > 16) { Rp = 660; Rm = 830; }
    const muG = nn(g('muG'), 'μG'), muK = nn(g('muK'), 'μK'), nu = pos(g('nu'), 'ν'), aA = pos(g('aA'), 'αA');
    if (nu > 1) fail('Die Ausnutzung ν liegt zwischen 0 und 1 (VDI-Standard 0,9).');
    const d0 = (d2 + d3) / 2, DKm = (SW + dh) / 2;
    const FM = As * nu * Rp / sqrt(1 + 3 * (1.5 * d2 / d0 * (P / (PI * d2) + 1.155 * muG)) ** 2);
    const MA = FM * (0.16 * P + 0.58 * d2 * muG + DKm / 2 * muK) / 1000;
    const MG = FM * d2 / 2 * Math.tan(Math.atan(P / (PI * d2)) + Math.atan(1.155 * muG));
    const sigM = FM / As, tauM = MG / (PI * d0 ** 3 / 16), sred = sqrt(sigM ** 2 + 3 * tauM ** 2);
    const FA = or0(g('FA')), Phi = or0(g('Phi')), FZ = or0(g('FZ'));
    const FMmin = FM / aA, FKR = FMmin - FZ - (1 - Phi) * FA, FSmax = FM + Phi * FA;
    const chips = [];
    if (FA > 0) chips.push(FKR > 0 ? [`Restklemmkraft ${fmt(FKR / 1000, 3)} kN`, 'good'] : ['Fuge klafft (Restklemmkraft ≤ 0)', 'bad']);
    return {
      chips,
      rows: [
        ['<i>R</i><sub>p0,2</sub> / <i>R<sub>m</sub></i>', `${Rp} / ${Rm}`, 'N/mm²'], ['Spannungsquerschnitt <i>A<sub>S</sub></i>', As, 'mm²'],
        ['<i>D<sub>Km</sub></i> = (SW + <i>d<sub>h</sub></i>)/2', DKm, 'mm'],
        ['zul. Montagevorspannkraft <i>F</i><sub>M,zul</sub>', FM / 1000, 'kN', 1], ['Anziehdrehmoment <i>M<sub>A</sub></i>', MA, 'N·m', 1],
        ['Gewindemoment <i>M<sub>G</sub></i>', MG / 1000, 'N·m'], ['Zugspannung <i>σ<sub>M</sub></i>', sigM, 'N/mm²'], ['Torsionsspannung <i>τ<sub>M</sub></i>', tauM, 'N/mm²'],
        ['Vergleichsspannung (= ν·<i>R</i><sub>p0,2</sub>)', sred, 'N/mm²'],
        { h: 'Mit Betriebslast' },
        ['kleinste Montagevorspannkraft <i>F</i><sub>M,min</sub>', FMmin / 1000, 'kN'],
        ['Restklemmkraft <i>F<sub>KR</sub></i>', FKR / 1000, 'kN', 1], ['größte Schraubenkraft', FSmax / 1000, 'kN'],
        ['Zusatzkraft in der Schraube <i>F<sub>SA</sub></i>', Phi * FA / 1000, 'kN']
      ],
      notes: ['F<sub>M,min</sub> = F<sub>M,zul</sub>/α<sub>A</sub>: Bei drehmomentgesteuertem Anziehen kann die Vorspannkraft bis auf diesen Wert streuen.']
    };
  }
});

const WMAT = { s235: ['S235JR', 235, 360], e295: ['E295', 295, 490], e335: ['E335', 335, 590], c45: ['C45E +QT', 490, 700], cr: ['42CrMo4 +QT', 900, 1100] };
calc('welle', {
  fields: [
    { id: 'Mb', label: 'Biegemoment <i>M<sub>b</sub></i>', unit: 'N·m', val: 300 },
    { id: 'T', label: 'Torsionsmoment <i>T</i>', unit: 'N·m', val: 400 },
    { id: 'd', label: 'Wellendurchmesser <i>d</i>', unit: 'mm', val: 40 },
    { id: 'a0', label: 'Anstrengungsverhältnis <i>α</i><sub>0</sub>', val: 0.7 },
    { id: 'w', label: 'Werkstoff', val: 'c45', opts: [...Object.entries(WMAT).map(([k, v]) => [k, v[0]]), ['frei', 'eigene Streckgrenze']] },
    { id: 'Re', label: 'Streckgrenze <i>R<sub>e</sub></i>', unit: 'N/mm²', val: 355, when: s => s('w') === 'frei' },
    { id: 'S', label: 'erforderliche Sicherheit <i>S<sub>F</sub></i>', val: 2 },
    { id: 'tz', label: '<i>τ</i><sub>zul</sub> für Überschlag', unit: 'N/mm²', val: 20 }
  ],
  compute(g, s) {
    const Mb = nn(g('Mb'), 'Mb') * 1000, Tt = nn(g('T'), 'T') * 1000, d = pos(g('d'), 'd'), a0 = pos(g('a0'), 'α0');
    const Re = s('w') === 'frei' ? pos(g('Re'), 'Re') : WMAT[s('w')][1], Sreq = pos(g('S'), 'SF'), tz = g('tz');
    const sb = 32 * Mb / (PI * d ** 3), tt = 16 * Tt / (PI * d ** 3), sv = sqrt(sb * sb + 3 * (a0 * tt) ** 2);
    const SF = sv > 0 ? Re / sv : Infinity;
    const Mv = sqrt(Mb * Mb + 0.75 * (a0 * Tt) ** 2), derf = Math.cbrt(32 * Mv / (PI * Re / Sreq));
    const du = isFinite(tz) && tz > 0 && Tt > 0 ? Math.cbrt(16 * Tt / (PI * tz)) : NaN;
    return {
      chips: [[`S<sub>F</sub> = ${isFinite(SF) ? fmt(SF, 3) : '∞'}`, SF >= Sreq ? 'good' : SF >= 1 ? 'warn' : 'bad']],
      rows: [
        ['Biegespannung <i>σ<sub>b</sub></i>', sb, 'N/mm²'], ['Torsionsspannung <i>τ<sub>t</sub></i>', tt, 'N/mm²'],
        ['Vergleichsspannung <i>σ<sub>v</sub></i>', sv, 'N/mm²', 1], ['Streckgrenze <i>R<sub>e</sub></i>', Re, 'N/mm²'],
        ['Sicherheit gegen Fließen <i>S<sub>F</sub></i>', SF, '', 1], ['Vergleichsmoment <i>M<sub>v</sub></i>', Mv / 1000, 'N·m'],
        ['Mindestdurchmesser für <i>S<sub>F</sub></i>', derf, 'mm', 1], ['Überschlag nur aus <i>T</i>', du, 'mm']
      ],
      notes: ['Statischer Nachweis an der glatten Welle. Die Dauerfestigkeit an Kerben ist meist maßgebend und muss gesondert nachgewiesen werden.']
    };
  }
});

const PF = [[10, 12, 4, 4, 2.5, 1.8], [12, 17, 5, 5, 3, 2.3], [17, 22, 6, 6, 3.5, 2.8], [22, 30, 8, 7, 4, 3.3], [30, 38, 10, 8, 5, 3.3], [38, 44, 12, 8, 5, 3.3], [44, 50, 14, 9, 5.5, 3.8], [50, 58, 16, 10, 6, 4.3], [58, 65, 18, 11, 7, 4.4], [65, 75, 20, 12, 7.5, 4.9], [75, 85, 22, 14, 9, 5.4], [85, 95, 25, 14, 9, 5.4], [95, 110, 28, 16, 10, 6.4], [110, 130, 32, 18, 11, 7.4]];
const PF_L = [8, 10, 12, 14, 16, 18, 20, 22, 25, 28, 32, 36, 40, 45, 50, 56, 63, 70, 80, 90, 100, 110, 125, 140, 160, 180, 200, 220, 250, 280, 320, 360, 400];
calc('passfeder', {
  fields: [
    { id: 'd', label: 'Wellendurchmesser <i>d</i>', unit: 'mm', val: 40 },
    { id: 'T', label: 'Drehmoment <i>T</i>', unit: 'N·m', val: 400 },
    { id: 'l', label: 'Passfederlänge <i>l</i>', unit: 'mm', val: 56 },
    { id: 'form', label: 'Form', val: 'A', opts: [['A', 'A (rundstirnig)'], ['B', 'B (geradstirnig)']] },
    { id: 'i', label: 'Anzahl Passfedern', val: '1', opts: [['1', '1'], ['2', '2 (um 180° versetzt)']] },
    { id: 'pz', label: 'zulässige Pressung <i>p</i><sub>zul</sub>', unit: 'N/mm²', val: 100 }
  ],
  compute(g, s) {
    const d = pos(g('d'), 'd'), Tn = pos(g('T'), 'T') * 1000, l = pos(g('l'), 'l'), pz = pos(g('pz'), 'pzul');
    const row = PF.find(r => d > r[0] && d <= r[1]);
    if (!row) fail('Die Tabelle nach DIN 6885-1 ist hier für Wellen über 10 bis 130 mm hinterlegt.');
    const [, , b, h, t1, t2] = row;
    const i = +s('i'), phi = i === 2 ? 0.75 : 1;
    const ltr = s('form') === 'A' ? l - b : l;
    if (ltr <= 0) fail('Die Passfeder ist kürzer als ihre Breite; bei Form A bleibt keine tragende Länge.');
    const p = 2 * Tn / (d * (h - t1) * ltr * i * phi);
    const ltrErf = 2 * Tn / (d * (h - t1) * pz * i * phi), lErf = ltrErf + (s('form') === 'A' ? b : 0);
    const lNorm = PF_L.find(x => x >= lErf);
    return {
      chips: [[`p = ${fmt(p, 3)} N/mm²`, p <= pz ? 'good' : 'bad'], ltr > 1.6 * d ? ['tragende Länge über 1,6·d', 'warn'] : null],
      rows: [
        ['Passfeder <i>b</i> × <i>h</i>', `${b} × ${h}`, 'mm', 1], ['Nuttiefe Welle <i>t</i><sub>1</sub>', t1, 'mm'], ['Nuttiefe Nabe <i>t</i><sub>2</sub>', t2, 'mm'],
        ['tragende Länge <i>l<sub>tr</sub></i>', ltr, 'mm'], ['Flächenpressung <i>p</i>', p, 'N/mm²', 1], ['Ausnutzung <i>p</i>/<i>p</i><sub>zul</sub>', p / pz * 100, '%'],
        ['erforderliche Länge <i>l</i>', lErf, 'mm'], ['nächste Normlänge', lNorm || '> 400', 'mm', 1]
      ],
      notes: [`Bezeichnung z. B.: Passfeder DIN 6885 – ${s('form')} – ${b} × ${h} × ${lNorm || Math.ceil(lErf)}.`]
    };
  }
});

const PRESS_FITS = ['H7/r6', 'H7/s6', 'H7/u6', 'H8/u8', 'H7/p6', 'H6/s5'];
calc('pressverband', {
  fields: [
    { id: 'DF', label: 'Fugendurchmesser <i>D<sub>F</sub></i>', unit: 'mm', val: 50 },
    { id: 'DaA', label: 'Nabenaußendurchmesser <i>D<sub>aA</sub></i>', unit: 'mm', val: 90 },
    { id: 'DiI', label: 'Bohrung der Welle <i>D<sub>iI</sub></i>', unit: 'mm', val: 0, hint: '0 für Vollwelle' },
    { id: 'lF', label: 'Fugenlänge <i>l<sub>F</sub></i>', unit: 'mm', val: 40 },
    { id: 'fit', label: 'Passung', val: 'H7/s6', opts: [...PRESS_FITS.map(x => [x, x]), ['man', 'Übermaß direkt eingeben']] },
    { id: 'Umin', label: 'kleinstes Übermaß', unit: 'µm', val: 18, when: s => s('fit') === 'man' },
    { id: 'Umax', label: 'größtes Übermaß', unit: 'µm', val: 59, when: s => s('fit') === 'man' },
    { id: 'RzA', label: '<i>Rz</i> Nabe', unit: 'µm', val: 4 },
    { id: 'RzI', label: '<i>Rz</i> Welle', unit: 'µm', val: 2.5 },
    { id: 'mu', label: 'Haftbeiwert <i>μ</i>', val: 0.15 },
    { id: 'EA', label: '<i>E<sub>A</sub></i> Nabe', unit: 'N/mm²', val: 210000 },
    { id: 'EI', label: '<i>E<sub>I</sub></i> Welle', unit: 'N/mm²', val: 210000 },
    { id: 'nA', label: '<i>ν<sub>A</sub></i>', val: 0.3 },
    { id: 'nI', label: '<i>ν<sub>I</sub></i>', val: 0.3 },
    { id: 'ReA', label: 'Streckgrenze Nabe <i>R<sub>eA</sub></i>', unit: 'N/mm²', val: 490 },
    { id: 'aA', label: 'Wärmeausdehnung Nabe', unit: '10⁻⁶/K', val: 11 },
    { id: 'tU', label: 'Raumtemperatur', unit: '°C', val: 20 }
  ],
  compute(g, s) {
    const DF = pos(g('DF'), 'DF'), DaA = pos(g('DaA'), 'DaA'), DiI = nn(or0(g('DiI')), 'DiI'), lF = pos(g('lF'), 'lF');
    if (DaA <= DF) fail('Der Nabenaußendurchmesser muss größer als der Fugendurchmesser sein.');
    if (DiI >= DF) fail('Die Wellenbohrung muss kleiner als der Fugendurchmesser sein.');
    let Umin, Umax, fitTxt = '';
    if (s('fit') === 'man') { Umin = nn(g('Umin'), 'Ümin'); Umax = pos(g('Umax'), 'Ümax'); if (Umin > Umax) fail('Das kleinste Übermaß ist größer als das größte.'); }
    else {
      const [hs, ws] = s('fit').split('/');
      const f = fitOf(DF, hs[0], +hs.slice(1), ws[0], +ws.slice(1));
      Umin = -f.PSH; Umax = -f.PSM; fitTxt = s('fit');
    }
    const G = 0.8 * (or0(g('RzA')) + or0(g('RzI')));
    const Uwmin = Umin - G, Uwmax = Umax - G;
    const QA = DF / DaA, QI = DiI / DF;
    const EA = pos(g('EA'), 'EA'), EI = pos(g('EI'), 'EI'), nA = or0(g('nA')), nI = or0(g('nI')), mu = pos(g('mu'), 'μ');
    const K = 1 / EA * ((1 + QA * QA) / (1 - QA * QA) + nA) + 1 / EI * ((1 + QI * QI) / (1 - QI * QI) - nI);
    const p = U => Math.max(0, U / 1000 / DF / K);
    const pmin = p(Uwmin), pmax = p(Uwmax);
    const Tmin = pmin * PI * DF * DF * lF * mu / 2 / 1000, Fax = pmin * PI * DF * lF * mu;
    const sv = 2 * pmax / (1 - QA * QA), st = pmax * (1 + QA * QA) / (1 - QA * QA);
    const ReA = g('ReA'), SF = isFinite(ReA) && sv > 0 ? ReA / sv : NaN;
    const aA = pos(g('aA'), 'α') * 1e-6, tU = or0(g('tU'));
    const tJ = tU + (Umax / 1000 + 0.001 * DF) / (aA * DF);
    const chips = [];
    if (Uwmin <= 0) chips.push(['Kleinstes wirksames Übermaß ≤ 0: kein sicherer Sitz', 'bad']);
    if (isFinite(SF)) chips.push([`Nabe S<sub>F</sub> = ${fmt(SF, 3)}`, SF >= 1.3 ? 'good' : SF >= 1 ? 'warn' : 'bad']);
    return {
      chips,
      rows: [
        fitTxt ? { h: `Passung ${fitTxt} bei Ø${fmt(DF)} mm` } : null,
        ['Übermaß min / max', `${fmt(Umin)} / ${fmt(Umax)}`, 'µm'], ['Glättung 0,8·(Rz<sub>A</sub>+Rz<sub>I</sub>)', G, 'µm'],
        ['wirksames Übermaß min / max', `${fmt(Uwmin)} / ${fmt(Uwmax)}`, 'µm'], ['<i>Q<sub>A</sub></i> / <i>Q<sub>I</sub></i>', `${fmt(QA, 3)} / ${fmt(QI, 3)}`, ''],
        ['Fugendruck <i>p</i><sub>min</sub>', pmin, 'N/mm²', 1], ['Fugendruck <i>p</i><sub>max</sub>', pmax, 'N/mm²', 1],
        ['sicher übertragbares Moment <i>T</i><sub>min</sub>', Tmin, 'N·m', 1], ['übertragbare Axialkraft', Fax / 1000, 'kN'],
        ['Tangentialspannung Nabe innen', st, 'N/mm²'], ['Vergleichsspannung Nabe innen (SH)', sv, 'N/mm²', 1],
        ['Fügetemperatur der Nabe', tJ, '°C', 1]
      ],
      notes: [tJ > 300 ? 'Die Fügetemperatur liegt über der Anlasstemperatur vergüteter Stähle; besser die Welle zusätzlich unterkühlen.' : '']
    };
  }
});

calc('waelzlager', {
  fields: [
    { id: 'art', label: 'Lagerart', val: 'kugel', opts: [['kugel', 'Kugellager (p = 3)'], ['rolle', 'Rollenlager (p = 10/3)']] },
    { id: 'C', label: 'dynamische Tragzahl <i>C</i>', unit: 'kN', val: 32.5, hint: 'z. B. 6208: 32,5 kN' },
    { id: 'Fr', label: 'Radialkraft <i>F<sub>r</sub></i>', unit: 'kN', val: 3.5 },
    { id: 'Fa', label: 'Axialkraft <i>F<sub>a</sub></i>', unit: 'kN', val: 0 },
    { id: 'X', label: 'Radialfaktor <i>X</i>', val: 1 },
    { id: 'Y', label: 'Axialfaktor <i>Y</i>', val: 0 },
    { id: 'n', label: 'Drehzahl <i>n</i>', unit: 'min⁻¹', val: 1450 },
    { id: 'a1', label: 'Zuverlässigkeit', val: '1', opts: [['1', '90 % (a₁ = 1)'], ['0.64', '95 % (a₁ = 0,64)'], ['0.55', '96 % (a₁ = 0,55)'], ['0.47', '97 % (a₁ = 0,47)'], ['0.37', '98 % (a₁ = 0,37)'], ['0.25', '99 % (a₁ = 0,25)']] },
    { id: 'aiso', label: 'Lebensdauerbeiwert <i>a</i><sub>ISO</sub>', val: 1 },
    { id: 'Lsoll', label: 'geforderte Lebensdauer', unit: 'h', val: 20000 }
  ],
  compute(g, s) {
    const p = s('art') === 'kugel' ? 3 : 10 / 3;
    const C = pos(g('C'), 'C'), Fr = nn(g('Fr'), 'Fr'), Fa = nn(or0(g('Fa')), 'Fa'), X = nn(g('X'), 'X'), Y = nn(or0(g('Y')), 'Y'), n = pos(g('n'), 'n');
    const a1 = +s('a1'), aiso = pos(g('aiso'), 'aISO'), Ls = g('Lsoll');
    const P = X * Fr + Y * Fa;
    if (P <= 0) fail('Die äquivalente Belastung ist 0. Gib eine Kraft ein.');
    const L10 = (C / P) ** p, L10h = L10 * 1e6 / (60 * n), Lnm = a1 * aiso * L10h;
    const Cerf = isFinite(Ls) && Ls > 0 ? P * (Ls * 60 * n / 1e6 / (a1 * aiso)) ** (1 / p) : NaN;
    return {
      chips: isFinite(Ls) && Ls > 0 ? [[Lnm >= Ls ? 'Lebensdauer erreicht' : 'Lebensdauer zu kurz', Lnm >= Ls ? 'good' : 'bad']] : [],
      rows: [
        ['äquivalente Belastung <i>P</i>', P, 'kN', 1], ['Tragzahlverhältnis <i>C</i>/<i>P</i>', C / P, ''],
        ['<i>L</i><sub>10</sub>', L10, '10⁶ Umdr.'], ['nominelle Lebensdauer <i>L</i><sub>10h</sub>', L10h, 'h', 1],
        ['modifizierte Lebensdauer <i>L<sub>nm</sub></i>', Lnm, 'h', 1], ['in Jahren bei 8 h/Tag, 250 Tagen', Lnm / 2000, 'a'],
        ['erforderliche Tragzahl <i>C</i><sub>erf</sub>', Cerf, 'kN', 1]
      ]
    };
  }
});

calc('zahnrad', {
  fields: [
    { id: 'mn', label: 'Normalmodul <i>m<sub>n</sub></i>', unit: 'mm', val: 2.5 },
    { id: 'z1', label: 'Zähnezahl Ritzel <i>z</i><sub>1</sub>', val: 19 },
    { id: 'z2', label: 'Zähnezahl Rad <i>z</i><sub>2</sub>', val: 58 },
    { id: 'b', label: 'Schrägungswinkel <i>β</i>', unit: '°', val: 15 },
    { id: 'an', label: 'Eingriffswinkel <i>α<sub>n</sub></i>', unit: '°', val: 20 },
    { id: 'w', label: 'Zahnbreite <i>b</i>', unit: 'mm', val: 30 },
    { id: 'T1', label: 'Ritzelmoment <i>T</i><sub>1</sub>', unit: 'N·m', val: 120 }
  ],
  compute(g) {
    const mn = pos(g('mn'), 'mn'), z1 = pos(g('z1'), 'z₁'), z2 = pos(g('z2'), 'z₂'), be = nn(or0(g('b')), 'β') * DEG, an = pos(g('an'), 'αn') * DEG, bw = or0(g('w')), T1 = or0(g('T1'));
    if (be >= 45 * DEG) fail('Der Schrägungswinkel sollte unter 45° liegen.');
    const mt = mn / Math.cos(be), at = Math.atan(Math.tan(an) / Math.cos(be));
    const d1 = mt * z1, d2 = mt * z2, da1 = d1 + 2 * mn, da2 = d2 + 2 * mn, df1 = d1 - 2.5 * mn, df2 = d2 - 2.5 * mn;
    const db1 = d1 * Math.cos(at), db2 = d2 * Math.cos(at), a = (d1 + d2) / 2;
    const ea = (sqrt((da1 / 2) ** 2 - (db1 / 2) ** 2) + sqrt((da2 / 2) ** 2 - (db2 / 2) ** 2) - a * Math.sin(at)) / (PI * mt * Math.cos(at));
    const eb = bw * Math.sin(be) / (PI * mn);
    const Ft = T1 > 0 ? 2 * T1 * 1000 / d1 : NaN;
    const zn1 = z1 / Math.cos(be) ** 3;
    const zg = 2 / Math.sin(an) ** 2;
    const chips = [];
    chips.push(zn1 < zg * 14 / 17 ? ['Unterschnitt am Ritzel: Profilverschiebung nötig', 'bad'] : zn1 < zg ? ['Ritzel unter Grenzzähnezahl, geringer Unterschnitt zulässig', 'warn'] : ['kein Unterschnitt', 'good']);
    if (ea < 1.1) chips.push(['Profilüberdeckung zu klein', 'bad']);
    const rows = [
      ['Übersetzung <i>i</i>', z2 / z1, '', 1], ['Stirnmodul <i>m<sub>t</sub></i>', mt, 'mm'], ['Stirneingriffswinkel <i>α<sub>t</sub></i>', at / DEG, '°'],
      ['Teilkreis <i>d</i><sub>1</sub> / <i>d</i><sub>2</sub>', `${fmt(d1, 5)} / ${fmt(d2, 5)}`, 'mm', 1], ['Kopfkreis <i>d</i><sub>a1</sub> / <i>d</i><sub>a2</sub>', `${fmt(da1, 5)} / ${fmt(da2, 5)}`, 'mm'],
      ['Fußkreis <i>d</i><sub>f1</sub> / <i>d</i><sub>f2</sub>', `${fmt(df1, 5)} / ${fmt(df2, 5)}`, 'mm'], ['Grundkreis <i>d</i><sub>b1</sub> / <i>d</i><sub>b2</sub>', `${fmt(db1, 5)} / ${fmt(db2, 5)}`, 'mm'],
      ['Achsabstand <i>a</i>', a, 'mm', 1], ['Profilüberdeckung <i>ε<sub>α</sub></i>', ea, '', 1], ['Sprungüberdeckung <i>ε<sub>β</sub></i>', eb, ''], ['Gesamtüberdeckung <i>ε<sub>γ</sub></i>', ea + eb, ''],
      ['Ersatzzähnezahl <i>z</i><sub>n1</sub>', zn1, ''],
      { h: 'Zahnkräfte am Ritzel' },
      ['Umfangskraft <i>F<sub>t</sub></i>', Ft, 'N', 1], ['Radialkraft <i>F<sub>r</sub></i>', Ft * Math.tan(at), 'N'], ['Axialkraft <i>F<sub>a</sub></i>', Ft * Math.tan(be), 'N']
    ];
    // Zeichnung
    const r1a = da1 / 2, r2a = da2 / 2;
    const bb = [-r1a, a + r2a, -Math.max(r1a, r2a), Math.max(r1a, r2a)];
    const W = 640, H = 300, S = scene(bb, W, H, 22), k = S.k;
    const circ = (cx, r, cls, extra = '') => `<circle class="${cls}" cx="${S.X(cx)}" cy="${S.Y(0)}" r="${r1(r * k)}" ${extra}/>`;
    let v = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Radpaar">`;
    v += circ(0, da1 / 2, 'body', 'style="fill-opacity:.6"') + circ(a, da2 / 2, 'body', 'style="fill-opacity:.6"');
    v += circ(0, df1 / 2, 's4') + circ(a, df2 / 2, 's4');
    v += circ(0, db1 / 2, 's4', 'stroke-dasharray="2 3"') + circ(a, db2 / 2, 's4', 'stroke-dasharray="2 3"');
    v += circ(0, d1 / 2, 's1', 'stroke-dasharray="10 3 2 3"') + circ(a, d2 / 2, 's2', 'stroke-dasharray="10 3 2 3"');
    const C = [d1 / 2, 0], L = r1a * 1.3;
    const ux = Math.sin(at), uy = Math.cos(at);
    v += `<line class="s3" x1="${S.X(C[0] - ux * L)}" y1="${S.Y(-uy * L)}" x2="${S.X(C[0] + ux * L)}" y2="${S.Y(uy * L)}"/>`;
    v += `<line class="s4" x1="${S.X(0)}" y1="${S.Y(0)}" x2="${S.X(a)}" y2="${S.Y(0)}"/><circle class="inkf" cx="${S.X(0)}" cy="${S.Y(0)}" r="3"/><circle class="inkf" cx="${S.X(a)}" cy="${S.Y(0)}" r="3"/>`;
    v += `<circle class="pt" cx="${S.X(C[0])}" cy="${S.Y(0)}" r="4"/>` + T(S.X(C[0]) + 6, S.Y(0) - 8, 'C', 'ta');
    v += T(S.X(a / 2), S.Y(0) + 16, `a = ${fmt(a, 4)} mm`, 'tk', 'middle');
    v += '</svg><div class="cap">Teilkreise strichpunktiert, Grundkreise gepunktet, Eingriffslinie gestrichelt durch den Wälzpunkt C.</div>';
    return { chips, rows, fig: v };
  }
});

calc('feder', {
  fields: [
    { id: 'd', label: 'Drahtdurchmesser <i>d</i>', unit: 'mm', val: 3 },
    { id: 'D', label: 'mittlerer Windungsdurchmesser <i>D</i>', unit: 'mm', val: 24 },
    { id: 'n', label: 'federnde Windungen <i>n</i>', val: 8 },
    { id: 'G', label: 'Schubmodul <i>G</i>', unit: 'N/mm²', val: 81500 },
    { id: 'F', label: 'Federkraft <i>F</i>', unit: 'N', val: 150 },
    { id: 'L0', label: 'ungespannte Länge <i>L</i><sub>0</sub>', unit: 'mm', val: 70 },
    { id: 'tz', label: 'zulässige Schubspannung', unit: 'N/mm²', val: 850 }
  ],
  compute(g) {
    const d = pos(g('d'), 'd'), D = pos(g('D'), 'D'), n = pos(g('n'), 'n'), G = pos(g('G'), 'G'), F = nn(g('F'), 'F'), L0 = g('L0'), tz = g('tz');
    const w = D / d;
    if (w <= 1) fail('Der Windungsdurchmesser muss größer als der Drahtdurchmesser sein.');
    const R = G * d ** 4 / (8 * D ** 3 * n), sF = F / R, tau = 8 * F * D / (PI * d ** 3), kk = (w + 0.5) / (w - 0.75);
    const nt = n + 2, Lc = nt * d;
    const sc = isFinite(L0) ? L0 - Lc : NaN, Fc = R * sc, tc = 8 * Fc * D / (PI * d ** 3);
    const chips = [];
    if (isFinite(tz)) chips.push([`τ/τ<sub>zul</sub> = ${fmt(tau / tz * 100, 3)} %`, tau <= tz ? 'good' : 'bad']);
    if (isFinite(L0) && L0 - sF < Lc) chips.push(['Feder geht auf Block', 'bad']);
    if (w < 4 || w > 20) chips.push(['Wickelverhältnis außerhalb 4 … 20', 'warn']);
    return {
      chips,
      rows: [
        ['Wickelverhältnis <i>w</i>', w, ''], ['Federrate <i>R</i>', R, 'N/mm', 1], ['Federweg <i>s</i>', sF, 'mm', 1],
        ['Länge unter Last <i>L</i>', isFinite(L0) ? L0 - sF : '–', 'mm'], ['Schubspannung <i>τ</i>', tau, 'N/mm²', 1],
        ['Korrekturfaktor <i>k</i>', kk, ''], ['korrigiert <i>τ<sub>k</sub></i>', kk * tau, 'N/mm²'], ['Federarbeit <i>W</i>', F * sF / 2 / 1000, 'J'],
        ['Gesamtwindungen <i>n<sub>t</sub></i>', nt, ''], ['Blocklänge <i>L<sub>c</sub></i>', Lc, 'mm'],
        ['Kraft bei Blocklänge', Fc, 'N'], ['Schubspannung bei Block', tc, 'N/mm²']
      ],
      notes: [isFinite(tz) && tc > tz ? 'Die Feder ist nicht blockfest: Auf Block gedrückt wird τ<sub>zul</sub> überschritten.' : '', isFinite(L0) && L0 / D > 2.6 ? 'L₀/D über 2,6: Knickgefahr prüfen, ggf. Führung vorsehen.' : '']
    };
  }
});

/* ================= EINHEITEN ================= */
const UNITS = [
  { g: 'Druck, Spannung', b: 'Pa', u: [['Pa', 1], ['kPa', 1e3], ['MPa = N/mm²', 1e6], ['GPa', 1e9], ['bar', 1e5], ['mbar', 100], ['atm', 101325], ['at (kp/cm²)', 98066.5], ['psi', 6894.757], ['mmHg (Torr)', 133.3224], ['mWS', 9806.65]] },
  { g: 'Kraft', u: [['N', 1], ['kN', 1e3], ['MN', 1e6], ['kp', 9.80665], ['lbf', 4.448222]] },
  { g: 'Drehmoment', u: [['N·m', 1], ['N·mm', 1e-3], ['kN·m', 1e3], ['kp·m', 9.80665], ['lbf·ft', 1.355818], ['lbf·in', 0.1129848]] },
  { g: 'Energie, Arbeit', u: [['J', 1], ['kJ', 1e3], ['MJ', 1e6], ['Wh', 3600], ['kWh', 3.6e6], ['kcal', 4186.8], ['BTU', 1055.056]] },
  { g: 'Leistung', u: [['W', 1], ['kW', 1e3], ['MW', 1e6], ['PS', 735.49875], ['hp', 745.69987], ['kcal/h', 1.163], ['BTU/h', 0.29307107]] },
  { g: 'Länge', u: [['µm', 1e-6], ['mm', 1e-3], ['cm', 1e-2], ['m', 1], ['km', 1e3], ['in', 0.0254], ['ft', 0.3048]] },
  { g: 'Geschwindigkeit', u: [['m/s', 1], ['km/h', 1 / 3.6], ['m/min', 1 / 60], ['kn', 0.514444], ['mph', 0.44704], ['ft/min', 0.00508]] },
  { g: 'Volumenstrom', u: [['m³/s', 1], ['m³/h', 1 / 3600], ['L/s', 1e-3], ['L/min', 1 / 60000], ['gpm (US)', 6.30902e-5]] },
  { g: 'kinematische Viskosität', u: [['m²/s', 1], ['mm²/s (cSt)', 1e-6], ['St', 1e-4]] },
  { g: 'dynamische Viskosität', u: [['Pa·s', 1], ['mPa·s (cP)', 1e-3], ['P (Poise)', 0.1]] },
  { g: 'Temperatur', u: [['°C', 'C'], ['K', 'K'], ['°F', 'F']] }
];
calc('einheiten', {
  fields: [
    { id: 'v', label: 'Wert', val: 10 },
    { id: 'u', label: 'Einheit', val: '0|4', wide: 1, opts: UNITS.map((c, i) => ({ g: c.g, o: c.u.map((u, j) => [`${i}|${j}`, u[0]]) })) }
  ],
  compute(g, s) {
    const v = fin(g('v'), 'den Wert'), [ci, uj] = s('u').split('|').map(Number), cat = UNITS[ci];
    let rows;
    if (cat.g === 'Temperatur') {
      const toK = { C: x => x + 273.15, K: x => x, F: x => (x - 32) * 5 / 9 + 273.15 }, fromK = { C: x => x - 273.15, K: x => x, F: x => (x - 273.15) * 9 / 5 + 32 };
      const K = toK[cat.u[uj][1]](v);
      if (K < 0) fail('Die Temperatur liegt unter dem absoluten Nullpunkt.');
      rows = cat.u.map(([n, k], j) => [n, fromK[k](K), '', j === uj, 6]);
    } else {
      const si = v * cat.u[uj][1];
      rows = cat.u.map(([n, f], j) => [n, si / f, '', j === uj, 6]);
    }
    return { rows: [{ h: cat.g }, ...rows] };
  }
});
