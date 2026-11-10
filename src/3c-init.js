
/* ================= Navigation ================= */
const topics = $$('section.topic');
const groups = [];
for (const sec of topics) {
  let gr = groups.find(x => x.name === sec.dataset.group);
  if (!gr) { gr = { name: sec.dataset.group, items: [] }; groups.push(gr); }
  gr.items.push(sec);
}
// Schriftfelder
for (const gr of groups) gr.items.forEach((sec, i) => {
  const sf = document.createElement('div');
  sf.className = 'sf';
  sf.innerHTML = `<div><small>Benennung</small><h1>${sec.dataset.title}</h1></div>` +
    `<div><small>Bereich · Blatt ${i + 1}/${gr.items.length}</small><span class="v">${gr.name}</span></div>` +
    `<div><small>Norm / Grundlage</small><span class="v">${sec.dataset.norm}</span></div>`;
  sec.prepend(sf);
});
// Seitenleiste und Übersicht
const nav = $('#nav'), grid = $('#groups');
let navHtml = '', gridHtml = '';
for (const gr of groups) {
  navHtml += `<div class="navgroup" data-g="${esc(gr.name)}"><h4>${gr.name}<i>${gr.items.length}</i></h4>` +
    gr.items.map(sec => `<button type="button" class="navlink" data-go="${sec.id}">${sec.dataset.title}${sec.querySelector('.calc') ? '' : '<span class="tag">Tabelle</span>'}</button>`).join('') + '</div>';
  gridHtml += `<div class="gcard"><h2>${gr.name}<small>${gr.items.length} Themen</small></h2><ul>` +
    gr.items.map(sec => `<li><button type="button" data-go="${sec.id}"><b>${sec.dataset.title}</b><em>${sec.dataset.norm}</em><span>${sec.dataset.desc}</span></button></li>`).join('') + '</ul></div>';
}
nav.innerHTML = navHtml + '<p class="nohit" id="nohit" hidden>Kein Thema gefunden.</p>';
grid.innerHTML = gridHtml;

let current = null;
function typesetSection(sec) {
  if (!sec || sec.dataset.tex || !window.MathJax || !MathJax.typesetPromise) return;
  sec.dataset.tex = '1';
  MathJax.typesetPromise([sec]).catch(err => { delete sec.dataset.tex; console.error(err); });
}
window.__typesetVisible = () => typesetSection(current && document.getElementById(current));

function show(id, scroll = true) {
  let sec = document.getElementById(id);
  if (!sec || !(sec.classList.contains('topic') || id === 'start')) { id = 'start'; sec = $('#start'); }
  current = id;
  $('#start').hidden = id !== 'start';
  for (const t of topics) t.hidden = t.id !== id;
  $$('.navlink').forEach(b => { if (b.dataset.go === id) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('#crumb').textContent = id === 'start' ? '' : sec.dataset.group + ' · ' + sec.dataset.title;
  document.title = id === 'start' ? 'Maschinenbau-Kompendium' : sec.dataset.title + ' · MB-Kompendium';
  if (id !== 'start') { $$('.calc', sec).forEach(buildCalc); typesetSection(sec); }
  try { history.replaceState(null, '', '#' + id); } catch (e) { /* Adressleiste nicht änderbar */ }
  try { localStorage.setItem('mbk.last', id); } catch (e) { /* ohne Speicher */ }
  document.body.classList.remove('nav-open');
  if (scroll) window.scrollTo(0, 0);
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (!b) return;
  e.preventDefault();
  show(b.dataset.go);
});
$('#menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
$('#scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.body.classList.remove('nav-open'); });

// Suche
const q = $('#q');
const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const hay = {};
for (const sec of topics) hay[sec.id] = norm([sec.dataset.title, sec.dataset.group, sec.dataset.keys, sec.dataset.desc, sec.dataset.norm].join(' '));
function filter() {
  const terms = norm(q.value.trim()).split(/\s+/).filter(Boolean);
  let any = false;
  for (const grEl of $$('.navgroup', nav)) {
    let vis = 0;
    for (const b of $$('.navlink', grEl)) { const ok = terms.every(t => hay[b.dataset.go].includes(t)); b.hidden = !ok; if (ok) vis++; }
    grEl.hidden = vis === 0; if (vis) any = true;
  }
  $('#nohit').hidden = any;
}
q.addEventListener('input', filter);
q.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const first = $$('.navlink', nav).find(b => !b.hidden && !b.closest('.navgroup').hidden);
  if (first) { show(first.dataset.go); q.blur(); }
});

let start = (location.hash || '').slice(1);
if (!start) { try { start = localStorage.getItem('mbk.last') || ''; } catch (e) { start = ''; } }
show(start || 'start');
window.addEventListener('load', () => window.scrollTo(0, 0));
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== current) show(h); });
})();
</script>
