// ================================================================ БИБЛИОТЕКА СИМВОЛОВ (свои технологические элементы)
// Символ = набор фигур (прямоугольник, эллипс, многоугольник, линия, текст) в своих координатах + таблица состояний
// «значение тега → цвета». Цвета фигур: #RRGGBB или «@f» (заливка состояния), «@s» (контур), «@c» (цвет текста).
// В тексте: «@lb» — подпись элемента, «@st» — название состояния. Хранится в proj.lib, на панель уходит только
// то, что используется в окне (screen.lib). Рисует элемент 'sym' (runtime.js).
const SYM_TOK = ['@f', '@s', '@c'];
function symNew() {
  return { id: 'sym' + (++proj.nextId), name: 'Новый символ', w: 60, h: 60,
    sts: [{ v: 0, tx: 'ВЫКЛ', f: CL.stop, s: CL.text, c: CL.text }, { v: 1, tx: 'ВКЛ', f: CL.run, s: CL.text, c: CL.white }, { v: 2, tx: 'АВАРИЯ', f: CL.alarm, s: CL.text, c: CL.white, bl: true }],
    df: { tx: '', f: CL.stop, s: CL.text, c: CL.text }, nd: { tx: '—', f: '#E3E4E1', s: CL.text2, c: CL.text2 },
    shapes: [{ k: 'ell', x: 4, y: 4, w: 52, h: 52, fill: '@f', stroke: '@s', lw: 2 }, { k: 'text', x: 30, y: 30, tx: '@lb', size: 14, bold: true, color: '@c' }] };
}
function symFind(id) { return (proj.lib || []).find(d => d.id === id); }
// рисование символа в произвольном контексте (предпросмотр, значок палитры); s — состояние
function symDraw(c, d, s, x, y, w, hh, lb) {
  const kx = w / (+d.w || 1), ky = hh / (+d.h || 1), ks = Math.min(kx, ky);
  s = s || { f: CL.stop, s: CL.text, c: CL.text, tx: '' };
  const col = v => v === '@f' ? s.f : v === '@s' ? s.s : v === '@c' ? s.c : v;
  const poly = (pts, f, st, lw) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); if (f) { c.fillStyle = f; c.fill(); } if (st) { c.strokeStyle = st; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); } };
  (d.shapes || []).forEach(sh => {
    if (sh.off) return;
    const f = col(sh.fill), st = col(sh.stroke), lw = (+sh.lw || 1) * ks;
    c.setLineDash(sh.dash ? [4, 3] : []);
    if (sh.k === 'rect') {
      const r = (+sh.r || 0) * ks, X = x + sh.x * kx, Y = y + sh.y * ky, W = sh.w * kx, H = sh.h * ky;
      c.beginPath(); if (c.roundRect && r) c.roundRect(X, Y, W, H, r); else c.rect(X, Y, W, H);
      if (f) { c.fillStyle = f; c.fill(); } if (st) { c.strokeStyle = st; c.lineWidth = lw; c.stroke(); }
    } else if (sh.k === 'ell') {
      c.beginPath(); c.ellipse(x + (+sh.x + sh.w / 2) * kx, y + (+sh.y + sh.h / 2) * ky, Math.abs(sh.w * kx / 2), Math.abs(sh.h * ky / 2), 0, 0, 7);
      if (f) { c.fillStyle = f; c.fill(); } if (st) { c.strokeStyle = st; c.lineWidth = lw; c.stroke(); }
    } else if (sh.k === 'poly' || sh.k === 'line') {
      const p = String(sh.pt || '').split(/[\s,;]+/).filter(Boolean).map(Number), pts = [];
      for (let i = 0; i + 1 < p.length; i += 2) pts.push(x + p[i] * kx, y + p[i + 1] * ky);
      if (pts.length < 4) return;
      if (sh.k === 'poly' && sh.closed !== false) poly(pts, f, st, lw);
      else { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.strokeStyle = st || f || CL.text; c.lineWidth = lw; c.lineJoin = 'round'; c.stroke(); }
    } else if (sh.k === 'text') {
      const t = String(sh.tx || '').split('@lb').join(lb || '').split('@st').join(s.tx || '');
      c.font = (sh.bold ? 'bold ' : '') + Math.max(8, Math.round((+sh.size || 12) * ks)) + 'px sans-serif';
      c.fillStyle = col(sh.color) || CL.text; c.textAlign = sh.align || 'center'; c.textBaseline = 'middle'; c.fillText(t, x + sh.x * kx, y + sh.y * ky);
    }
    c.setLineDash([]);
  });
}
function symIcon(d, cv) {
  const c = cv.getContext('2d'), k = 2; cv.width = 40 * k; cv.height = 26 * k; c.scale(k, k);
  const a = Math.min(34 / d.w, 22 / d.h), w = d.w * a, hh = d.h * a;
  symDraw(c, d, (d.sts || [])[1] || (d.sts || [])[0] || d.df, (40 - w) / 2, (26 - hh) / 2, w, hh, d.name.slice(0, 2));
}
// ---------------------------------------------------------------- импорт SVG
function svgToShapes(text, fillToState) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== 'svg' || doc.querySelector('parsererror')) throw new Error('Это не SVG-файл');
  let vb = (root.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
  let w = parseFloat(root.getAttribute('width')), hh = parseFloat(root.getAttribute('height'));
  if (vb.length !== 4 || vb.some(isNaN)) vb = [0, 0, w || 100, hh || 100];
  const warn = [];
  const sty = (el, k) => {
    const st = el.getAttribute('style') || '', m = st.match(new RegExp('(?:^|;)\\s*' + k + '\\s*:\\s*([^;]+)'));
    if (m) return m[1].trim();
    let n = el; while (n && n.getAttribute) { const v = n.getAttribute(k); if (v) return v; n = n.parentNode; }
    return null;
  };
  const colr = (v, def) => { if (v === null || v === undefined) return def; if (v === 'none' || v === 'transparent') return ''; if (/^url\(/.test(v)) return '#888888'; return v; };
  const sh = []; let hasTr = false;
  const R = x => Math.round(x * 100) / 100;
  const walk = el => {
    Array.prototype.forEach.call(el.children, n => {
      const t = n.nodeName.toLowerCase();
      if (n.getAttribute('transform')) hasTr = true;
      let fill = colr(sty(n, 'fill'), '#000000'), stroke = colr(sty(n, 'stroke'), ''), lw = parseFloat(sty(n, 'stroke-width')) || 1;
      if (fillToState && fill) fill = '@f';
      if (fillToState && stroke) stroke = '@s';
      const base = { fill: fill, stroke: stroke, lw: lw };
      const nm = a => parseFloat(n.getAttribute(a)) || 0;
      if (t === 'g' || t === 'svg') walk(n);
      else if (t === 'rect') sh.push(Object.assign({ k: 'rect', x: R(nm('x') - vb[0]), y: R(nm('y') - vb[1]), w: nm('width'), h: nm('height'), r: nm('rx') }, base));
      else if (t === 'circle') sh.push(Object.assign({ k: 'ell', x: R(nm('cx') - nm('r') - vb[0]), y: R(nm('cy') - nm('r') - vb[1]), w: nm('r') * 2, h: nm('r') * 2 }, base));
      else if (t === 'ellipse') sh.push(Object.assign({ k: 'ell', x: R(nm('cx') - nm('rx') - vb[0]), y: R(nm('cy') - nm('ry') - vb[1]), w: nm('rx') * 2, h: nm('ry') * 2 }, base));
      else if (t === 'line') sh.push({ k: 'line', pt: [nm('x1') - vb[0], nm('y1') - vb[1], nm('x2') - vb[0], nm('y2') - vb[1]].map(R).join(' '), stroke: stroke || fill, lw: lw });
      else if (t === 'polygon' || t === 'polyline') {
        const p = (n.getAttribute('points') || '').split(/[\s,]+/).filter(Boolean).map(Number);
        sh.push(Object.assign({ k: t === 'polygon' ? 'poly' : 'line', pt: p.map((v, i) => R(v - vb[i % 2])).join(' ') }, t === 'polygon' ? base : { stroke: stroke || fill, lw: lw }));
      } else if (t === 'path') {
        const d = n.getAttribute('d') || '', svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px'; document.body.append(svg);
        d.split(/(?=[Mm])/).filter(x => x.trim()).forEach(sp => {
          const pe = document.createElementNS('http://www.w3.org/2000/svg', 'path'); pe.setAttribute('d', sp); svg.append(pe);
          let len = 0; try { len = pe.getTotalLength(); } catch (e) { }
          if (!len) return;
          const cnt = Math.max(6, Math.min(80, Math.round(len / 3))), pts = [];
          for (let i = 0; i <= cnt; i++) { const q = pe.getPointAtLength(len * i / cnt); pts.push(R(q.x - vb[0]), R(q.y - vb[1])); }
          const closed = /[zZ]/.test(sp);
          sh.push(closed ? Object.assign({ k: 'poly', pt: pts.join(' ') }, base) : { k: 'line', pt: pts.join(' '), stroke: stroke || fill, lw: lw });
        });
        svg.remove();
      } else if (t === 'text') sh.push({ k: 'text', x: R(nm('x') - vb[0]), y: R(nm('y') - vb[1]), tx: n.textContent.trim(), size: parseFloat(sty(n, 'font-size')) || 12, color: fillToState ? '@c' : fill, align: 'center' });
      else if (!/^(defs|title|desc|style|metadata|linearGradient|radialGradient|clipPath)$/.test(t)) warn.push('элемент <' + t + '> пропущен');
    });
  };
  walk(root);
  if (hasTr) warn.push('у части элементов есть transform — он не учитывается, проверьте вид');
  return { w: vb[2], h: vb[3], shapes: sh, warn: warn };
}
// ---------------------------------------------------------------- окно библиотеки
let libSel = null, libSt = 0;
function openLib(id) {
  proj.lib = proj.lib || [];
  libSel = (id && symFind(id)) ? id : (symFind(libSel) ? libSel : (proj.lib[0] ? proj.lib[0].id : null));
  openModal('Библиотека символов — свои технологические элементы', h('div', { id: 'libBody' }));
  renderLib();
}
function renderLib() {
  const body = $('#libBody'); if (!body) return;
  body.innerHTML = '';
  const d = symFind(libSel);
  const touch = () => { autosave(); refreshPalette(); rtSoft(); };
  const struct = () => { touch(); renderLib(); };
  const left = h('div'), right = h('div');
  left.append(h('div', { class: 'secttl' }, 'Символы'));
  const l = h('div', { class: 'list' });
  proj.lib.forEach(s => l.append(h('div', { class: 'li' + (s.id === libSel ? ' on' : ''), onclick: () => { libSel = s.id; libSt = 0; renderLib(); } }, h('span', { class: 'nm' }, s.name), h('span', { class: 'ty' }, (s.shapes || []).length))));
  if (!proj.lib.length) l.append(h('p', { class: 'note' }, 'Символов нет. Создайте или импортируйте SVG.'));
  left.append(l);
  left.append(h('div', { class: 'btnrow' },
    h('button', { class: 'accent', onclick: () => { pushUndo(); const s = symNew(); proj.lib.push(s); libSel = s.id; struct(); } }, '+ Символ'),
    h('button', { onclick: () => symImportDlg() }, 'Импорт SVG…'),
    h('button', { disabled: !d, onclick: () => { pushUndo(); const s = JSON.parse(JSON.stringify(d)); s.id = 'sym' + (++proj.nextId); s.name += ' (копия)'; proj.lib.push(s); libSel = s.id; struct(); } }, 'Копия'),
    h('button', { disabled: !d, onclick: async () => { if (!(await ask('Удалить символ?', 'Элементы окон, которые его используют, перестанут рисоваться.', 'Удалить'))) return; pushUndo(); proj.lib.splice(proj.lib.indexOf(d), 1); libSel = null; openLib(); touch(); } }, 'Удалить')));
  left.append(h('p', { class: 'note' }, 'Символ — набор фигур, цвет которых зависит от значения тега. Перетащите его на холст из вкладки «Элементы» → «Мои символы». Размер на холсте можно менять: фигуры масштабируются.'));
  if (!d) { right.append(h('p', { class: 'note' }, 'Выберите или создайте символ.')); body.append(h('div', { style: 'display:grid;grid-template-columns:240px 1fr;gap:14px' }, left, right)); return; }
  // имя и размер
  const top = h('div', { style: 'display:grid;grid-template-columns:1fr 80px 80px;gap:8px;align-items:end' },
    h('label', {}, 'Имя', pin(d, 'name', 'text', touch)), h('label', {}, 'Ширина', pin(d, 'w', 'number', touch)), h('label', {}, 'Высота', pin(d, 'h', 'number', touch)));
  // предпросмотр
  const cv = h('canvas', { style: 'background:#DFE0DC;border:1px solid var(--bd,#bbb);border-radius:4px;max-width:100%' });
  const stSel = h('select', { onchange: () => { libSt = +stSel.value; prev(); } });
  const stList = () => (d.sts || []).concat([d.df, d.nd].filter(Boolean));
  const prev = () => {
    const k = Math.min(220 / d.w, 220 / d.h, 4), W = Math.max(40, Math.round(d.w * k)), H = Math.max(40, Math.round(d.h * k)), dpr = 2;
    cv.width = (W + 20) * dpr; cv.height = (H + 20) * dpr; cv.style.width = (W + 20) + 'px'; cv.style.height = (H + 20) + 'px';
    const c = cv.getContext('2d'); c.scale(dpr, dpr);
    c.strokeStyle = '#B3B6B0'; c.setLineDash([3, 3]); c.strokeRect(9.5, 9.5, W + 1, H + 1); c.setLineDash([]);
    symDraw(c, d, stList()[libSt] || d.df, 10, 10, W, H, 'Т-1');
  };
  const refreshSt = () => { stSel.innerHTML = ''; stList().forEach((s, i) => stSel.append(h('option', { value: i }, i < d.sts.length ? ('значение ' + s.v + ' · ' + (s.tx || '')) : (s === d.df ? 'иначе' : 'нет данных')))); stSel.value = String(Math.min(libSt, stList().length - 1)); };
  const live = () => { touch(); prev(); };
  // состояния
  const stBox = h('div', { class: 'box' });
  stBox.append(h('div', { style: 'font-size:12px;color:var(--fg2)' }, 'Состояния: значение тега → название, заливка (@f), контур (@s), цвет текста (@c), мигание'));
  const stRow = (s, lab, del) => {
    const r = h('div', { style: 'display:grid;grid-template-columns:' + (lab ? '70px' : '48px') + ' 1fr 40px 40px 40px 34px 22px;gap:3px;margin:3px 0;align-items:center' });
    r.append(lab ? h('span', { style: 'font-size:12px' }, lab) : pin(s, 'v', 'number', live), pin(s, 'tx', 'text', () => { live(); refreshSt(); }), cin(s, 'f', live), cin(s, 's', live), cin(s, 'c', live),
      lab ? h('span') : h('label', { class: 'chk', title: 'мигать' }, pin(s, 'bl', 'check', live), 'м'),
      del ? h('button', { class: 'mini', onclick: () => { pushUndo(); d.sts.splice(d.sts.indexOf(s), 1); struct(); } }, '×') : h('span'));
    return r;
  };
  d.sts.forEach(s => stBox.append(stRow(s, null, true)));
  stBox.append(stRow(d.df = d.df || { tx: '', f: CL.stop, s: CL.text, c: CL.text }, 'иначе'), stRow(d.nd = d.nd || { tx: '—', f: '#E3E4E1', s: CL.text2, c: CL.text2 }, 'нет данных'));
  stBox.append(h('button', { class: 'mini', onclick: () => { pushUndo(); d.sts.push({ v: d.sts.length, tx: 'СОСТОЯНИЕ', f: CL.stop, s: CL.text, c: CL.text }); struct(); } }, '+ состояние'));
  // фигуры
  const shBox = h('div');
  d.shapes = d.shapes || [];
  d.shapes.forEach((sh, i) => {
    const ln = (...a) => h('div', { style: 'display:flex;gap:4px;flex-wrap:wrap;align-items:center;margin:2px 0' }, ...a);
    const lab = (t, c, w) => h('label', { style: 'font-size:11px;display:flex;align-items:center;gap:3px' }, t, c);
    const kindSel = h('select', { onchange: () => { sh.k = kindSel.value; struct(); } }, [['rect', 'Прямоугольник'], ['ell', 'Эллипс'], ['poly', 'Многоугольник'], ['line', 'Ломаная'], ['text', 'Текст']].map(x => h('option', { value: x[0] }, x[1])));
    kindSel.value = sh.k;
    const card = h('div', { class: 'box', style: sh.off ? 'opacity:.5' : '' });
    card.append(ln(kindSel, h('span', { style: 'flex:1' }),
      h('button', { class: 'mini', title: 'Выше', onclick: () => { if (i) { pushUndo(); d.shapes.splice(i - 1, 0, d.shapes.splice(i, 1)[0]); struct(); } } }, '↑'),
      h('button', { class: 'mini', title: 'Ниже', onclick: () => { if (i < d.shapes.length - 1) { pushUndo(); d.shapes.splice(i + 1, 0, d.shapes.splice(i, 1)[0]); struct(); } } }, '↓'),
      h('label', { class: 'chk', title: 'Не рисовать' }, pin(sh, 'off', 'check', struct), 'скрыть'),
      h('button', { class: 'mini', onclick: () => { pushUndo(); d.shapes.splice(i, 1); struct(); } }, '×')));
    const nIn = k => h('span', { style: 'width:58px;display:inline-block' }, pin(sh, k, 'number', live));
    if (sh.k === 'rect') card.append(ln(lab('x', nIn('x')), lab('y', nIn('y')), lab('ш', nIn('w')), lab('в', nIn('h')), lab('скругл.', nIn('r'))));
    if (sh.k === 'ell') card.append(ln(lab('x', nIn('x')), lab('y', nIn('y')), lab('ш', nIn('w')), lab('в', nIn('h'))));
    if (sh.k === 'poly' || sh.k === 'line') card.append(ln(lab('точки x y x y …', pin(sh, 'pt', 'text', live, 'style="width:230px"'))));
    if (sh.k === 'text') card.append(ln(lab('текст', pin(sh, 'tx', 'text', live)), lab('x', nIn('x')), lab('y', nIn('y')), lab('размер', nIn('size')), lab('цвет', cin(sh, 'color', live)), h('label', { class: 'chk' }, pin(sh, 'bold', 'check', live), 'жирный')));
    if (sh.k !== 'text') card.append(ln(lab('заливка', cin(sh, 'fill', live)), lab('контур', cin(sh, 'stroke', live)), lab('толщ.', nIn('lw')), h('label', { class: 'chk' }, pin(sh, 'dash', 'check', live), 'пунктир')));
    card.append(ln(lab('показывать при значениях (через запятую; пусто — всегда)', pin(sh, 'svs', 'text', live, 'style="width:90px"'))));
    shBox.append(card);
  });
  const addSh = h('select', { onchange: () => { const k = addSh.value; if (!k) return; pushUndo(); const w = d.w, hh = d.h;
    d.shapes.push({ rect: { k, x: w * .1, y: hh * .1, w: w * .8, h: hh * .8, r: 4, fill: '@f', stroke: '@s', lw: 1.5 }, ell: { k, x: w * .1, y: hh * .1, w: w * .8, h: hh * .8, fill: '@f', stroke: '@s', lw: 1.5 },
      poly: { k, pt: [w * .5, hh * .1, w * .9, hh * .9, w * .1, hh * .9].join(' '), fill: '@f', stroke: '@s', lw: 1.5 }, line: { k, pt: [w * .1, hh * .5, w * .9, hh * .5].join(' '), stroke: '@s', lw: 2 },
      text: { k, x: w / 2, y: hh / 2, tx: '@lb', size: 14, bold: true, color: '@c' } }[k]); struct(); } },
    h('option', { value: '' }, '+ фигура…'), [['rect', 'Прямоугольник'], ['ell', 'Эллипс'], ['poly', 'Многоугольник'], ['line', 'Ломаная'], ['text', 'Текст']].map(x => h('option', { value: x[0] }, x[1])));
  right.append(top, h('div', { style: 'display:flex;gap:10px;align-items:flex-start;margin:8px 0;flex-wrap:wrap' }, h('div', {}, cv, h('div', {}, 'Состояние: ', stSel)), h('div', { style: 'flex:1;min-width:300px' }, stBox)),
    h('div', { class: 'secttl' }, 'Фигуры (нижняя рисуется первой)'), shBox, addSh,
    h('p', { class: 'note' }, 'Цвета: «@f» — заливка текущего состояния, «@s» — контур, «@c» — цвет текста. «@lb» в тексте — подпись элемента, «@st» — название состояния. Многоугольники задаются точками «x y x y …» в координатах символа.'));
  body.append(h('div', { style: 'display:grid;grid-template-columns:240px 1fr;gap:14px' }, left, right));
  refreshSt(); prev();
}
// простые поля без привязки к undo инспектора
function pin(obj, k, type, cb, attrs) {
  const i = h('input', { type: type === 'check' ? 'checkbox' : type, 'data-k': k });
  if (type === 'check') i.checked = !!obj[k]; else i.value = obj[k] === undefined ? '' : obj[k];
  if (attrs) i.style.cssText = (attrs.match(/style="([^"]*)"/) || [])[1] || '';
  i.addEventListener(type === 'check' ? 'change' : 'input', () => { obj[k] = type === 'check' ? i.checked : (type === 'number' ? (i.value === '' ? 0 : +i.value) : i.value); if (cb) cb(); });
  return i;
}
function cin(obj, k, cb) {   // цвет: текст (#hex или @f/@s/@c) + выбор цвета
  const t = h('input', { type: 'text', value: obj[k] || '', maxlength: 9, placeholder: 'нет', style: 'width:52px', list: 'symTok' });
  const c = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(obj[k] || '') ? obj[k] : '#808080', style: 'width:26px;padding:0' });
  t.addEventListener('input', () => { obj[k] = t.value; if (/^#[0-9a-f]{6}$/i.test(t.value)) c.value = t.value; cb && cb(); });
  c.addEventListener('input', () => { obj[k] = c.value; t.value = c.value; cb && cb(); });
  return h('span', { style: 'display:inline-flex;gap:2px' }, t, c);
}
function symImportDlg() {
  const ta = h('textarea', { class: 'code', style: 'height:200px', placeholder: 'Вставьте текст SVG или выберите файл (hmi/hmi_svg/…)' });
  const file = h('input', { type: 'file', accept: '.svg,image/svg+xml' });
  file.onchange = () => { const f = file.files[0]; if (f) { const r = new FileReader(); r.onload = () => { ta.value = r.result; nm.value = f.name.replace(/\.svg$/i, ''); }; r.readAsText(f); } };
  const nm = h('input', { type: 'text', value: 'Символ из SVG' }), st = h('input', { type: 'checkbox', checked: true });
  const out = h('div', { class: 'note' });
  openModal('Импорт SVG в библиотеку символов', [
    h('p', { class: 'note' }, 'Поддерживаются rect, circle, ellipse, line, polygon, polyline, path (кривые переводятся в ломаные), text. Градиенты и transform не учитываются.'),
    file, ta, h('label', { style: 'display:block;margin-top:6px' }, 'Имя: ', nm),
    h('label', { class: 'chk' }, st, 'Все заливки и контуры заменить цветами состояния (@f / @s) — тогда цвет задаётся таблицей состояний'),
    out,
    h('div', { class: 'btnrow', style: 'justify-content:flex-end' }, h('button', { onclick: () => openLib() }, 'Назад'),
      h('button', { class: 'accent', onclick: () => {
        try {
          const r = svgToShapes(ta.value, st.checked);
          if (!r.shapes.length) { out.textContent = 'В SVG не найдено фигур.'; return; }
          pushUndo();
          const s = symNew(); s.name = nm.value || 'Символ из SVG'; s.w = r.w; s.h = r.h; s.shapes = r.shapes;
          proj.lib.push(s); libSel = s.id; autosave(); refreshPalette();
          toast('Импортировано фигур: ' + r.shapes.length + (r.warn.length ? ' · ' + r.warn.join('; ') : ''));
          openLib(s.id);
        } catch (e) { out.textContent = 'Ошибка: ' + e.message; }
      } }, 'Импортировать'))]);
}
function refreshPalette() { const box = $('#tab-pal'); if (box) { box.innerHTML = ''; renderPalette(); } }
