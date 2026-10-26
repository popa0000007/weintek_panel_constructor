// ================================================================ ПРОВЕРКА ПРОЕКТА, ТЕГИ, ЗАМЕНА, ВЫГРУЗКА ВСЕХ ОКОН
// Всё работает по данным проекта (proj), без запуска панели.
const NEED_TAG = { value: 'tag', valuebox: 'tag', lamp: 'tag', state: 'tag', bar: 'tag', tank: 'tag', input: 'tag', hold: 'tag' };
function containers() {
  return proj.screens.map(s => ({ kind: 'screen', id: s.id, name: s.name || s.id, c: s })).concat(proj.pops.map(p => ({ kind: 'pop', id: p.id, name: (p.name || p.id) + ' (своё окно)', c: p })));
}
function bounds(c) {
  if (c.kind === 'screen') return { w: +c.c.w, h: +c.c.h };
  return { w: +c.c.w || 400, h: +c.c.h || 300 };
}
function checkProject() {
  const out = [];
  const add = (lvl, where, msg, nav) => out.push({ lvl: lvl, where: where, msg: msg, nav: nav });
  const all = allTags(proj);
  const used = {};         // тег -> [окна]
  const popUsed = {};
  // DB
  const nums = {};
  proj.dbs.forEach(db => {
    if (!db.raw) { if (nums[db.num]) add('err', 'Данные ПЛК', 'Номер DB' + db.num + ' у блоков «' + nums[db.num] + '» и «' + db.name + '»'); nums[db.num] = db.name; }
    if (!db.fields.length) add('warn', 'Данные ПЛК', 'В блоке «' + db.name + '» нет полей');
    overlaps(db).forEach(o => add('warn', 'Данные ПЛК', db.name + ': перекрываются поля ' + o));
    db.fields.forEach(f => { if (TYPES[f.t][0] > 1 && !db.raw && (f.o & 1)) add('warn', 'Данные ПЛК', db.name + '.' + f.n + ': ' + TYPES[f.t][1] + ' с нечётного байта ' + f.o); });
  });
  if (!(proj.conn && proj.conn.dev)) add('warn', 'Связь', 'Не указано имя устройства ПЛК');
  containers().forEach(co => {
    const els = co.c.els || [], b = bounds(co);
    const where = co.name;
    const seen = {};
    const visit = (list, depth) => (list || []).forEach(e => {
      if (seen[e.id]) add('err', where, 'Повторяется id элемента ' + e.id); seen[e.id] = 1;
      const nm = elLabel(e);
      if (!depth && e.t !== 'group') {
        const bx = bbox(e);
        const ox = co.kind === 'screen' ? (+co.c.ox || 0) : 0, oy = co.kind === 'screen' ? (+co.c.oy || 0) : 0;
        if (bx.x < ox - 1 || bx.y < oy - 1 || bx.x + bx.w > ox + b.w + 1 || bx.y + bx.h > oy + b.h + 1) add('warn', where, nm + ': выходит за границы окна (' + Math.round(bx.x) + ',' + Math.round(bx.y) + ' ' + Math.round(bx.w) + '×' + Math.round(bx.h) + ')');
      }
      const k = NEED_TAG[e.t];
      if (k && !e[k] && !(e.t === 'value' && e.fm === 'time')) add('warn', where, nm + ': не выбран тег');
      if (e.t === 'trend' && !(e.pens || []).some(p => p.tag)) add('warn', where, nm + ': в тренде нет перьев с тегом');
      if (e.t === 'sym' && !symFind(e.lib)) add('err', where, nm + ': символ «' + e.lib + '» удалён из библиотеки');
      if ((e.t === 'button') && !e.vis && !(e.act && e.act.a)) add('warn', where, nm + ': у кнопки нет действия');
      const a = e.act;
      if (a && a.a === 'popup') { if (!proj.pops.find(p => p.id === a.id)) add('err', where, nm + ': открывает несуществующее окно «' + (a.id || '') + '»'); else popUsed[a.id] = 1; }
      if (a && (a.a === 'write' || a.a === 'toggle' || a.a === 'keypad') && !a.tag) add('warn', where, nm + ': в действии не выбран тег');
      if (a && a.a === 'multi' && !(a.l || []).length) add('warn', where, nm + ': действие «несколько записей» пустое');
      if (e.t === 'group') visit(e.els, depth + 1);
    });
    visit(els, 0);
    if (co.kind === 'pop' && (+co.c.w > (proj.screens[0] || {}).w || +co.c.h > (proj.screens[0] || {}).h)) add('warn', where, 'Окно больше рабочей области');
    refsOf(els).forEach(r => { (used[r] = used[r] || {})[co.name] = 1; });
    if (co.kind === 'pop') { /* # проверяется по шаблону */ }
    else refsOf(els).filter(r => r.indexOf('#') >= 0).forEach(r => add('warn', where, 'Тег «' + r + '» с # вне своего окна — # не подставится'));
  });
  proj.pops.forEach(p => { if (!popUsed[p.id] && !proj.screens.length) return; if (!popUsed[p.id]) add('info', p.name || p.id, 'Своё окно нигде не открывается'); });
  // окна экспорта
  proj.screens.forEach(s => {
    try {
      const r = exportScreen(proj, s.id, Object.assign({ ver: '' }, ENGINE));
      r.warn.forEach(w => add(/больше лимита/.test(w) ? 'err' : 'warn', s.name || s.id, w));
      if (r.size > ENGINE_LIMIT * 0.9 && r.size <= ENGINE_LIMIT) add('warn', s.name || s.id, 'Код ' + Math.round(r.size / 1024) + ' КБ — близко к лимиту ~100 КБ');
      r.info.forEach(w => add('info', s.name || s.id, w));
    } catch (e) { add('err', s.name || s.id, 'Экспорт не удался: ' + e.message); }
    const pn = proj.panel;
    if (pn && (+s.w > pn.w || (+s.oy || 0) + (+s.h) > pn.h)) add('warn', s.name || s.id, 'Окно ' + s.w + '×' + s.h + ' (Y' + (s.oy || 0) + ') не помещается на панель ' + pn.model + ' ' + pn.w + '×' + pn.h);
  });
  // неиспользуемые символы и теги
  (proj.lib || []).forEach(d => {
    let n = 0; containers().forEach(co => walkEls(co.c.els, e => { if (e.t === 'sym' && e.lib === d.id) n++; }));
    if (!n) add('info', 'Символы', '«' + d.name + '» нигде не используется');
  });
  const unused = [];
  proj.dbs.forEach(db => db.fields.forEach(f => { const n = tagName(db, f); if (!used[n] && !Object.keys(used).some(u => u.indexOf('#') >= 0 && new RegExp('^' + reEsc(u).split('#').join('[^.]*?') + '$').test(n))) unused.push(n); }));
  if (unused.length) add('info', 'Данные ПЛК', 'Не используются в окнах: ' + unused.length + ' тегов из ' + proj.dbs.reduce((s, d) => s + d.fields.length, 0));
  const order = { err: 0, warn: 1, info: 2 };
  return out.sort((a, b) => order[a.lvl] - order[b.lvl]);
}
// тег -> где используется (окна) и признак записи
function tagTable() {
  const all = allTags(proj), rows = {};
  containers().forEach(co => {
    refsOf(co.c.els || []).forEach(r => {
      const list = [];
      if (/^gcu(set|spd)?:/.test(r)) list.push(r); else if (r.indexOf('#') >= 0) { const re = new RegExp('^' + reEsc(r).split('#').join('[^.]*?') + '$'); Object.keys(all).forEach(n => { if (re.test(n)) list.push(n); }); } else list.push(r);
      list.forEach(n => { (rows[n] = rows[n] || { n: n, w: {} }).w[co.name] = 1; });
    });
  });
  return Object.keys(rows).sort().map(n => {
    const t = all[n], g = /^gcu(set|spd)?:/.test(n);
    return { n: n, db: t ? 'DB' + t.db.num : (g ? 'ГЦУ' : '?'), addr: t ? addrText(t.db, t.f) : (g ? '' : 'не найден'), t: t ? TYPES[t.f.t][1] : ((GCU_MAP[n] || {}).t || ''), wr: t ? !!t.f.wr : /^gcuset|^gcuspd/.test(n), cm: t ? (t.f.cm || '') : ((GCU_MAP[n] || {}).d || ''), w: Object.keys(rows[n].w) };
  });
}
function csvEsc(s) { s = String(s === undefined ? '' : s); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
function tagsCsv() {
  return '﻿' + ['Тег;DB;Адрес;Тип;Запись;Окна;Комментарий'].concat(tagTable().map(r => [r.n, r.db, r.addr, r.t, r.wr ? 'да' : '', r.w.join(', '), r.cm].map(csvEsc).join(';'))).join('\r\n') + '\r\n';
}
// заменить часть имени тега во всех окнах (и своих окнах), например при переименовании DB
function replaceTags(from, to, dry) {
  let n = 0;
  containers().forEach(co => walkObj(co.c.els, (k, v, o) => { if (TAG_KEYS[k] && typeof v === 'string' && v.indexOf(from) >= 0) { n++; if (!dry) o[k] = v.split(from).join(to); } }));
  return n;
}
// ---------------------------------------------------------------- ZIP (без сжатия) для выгрузки всех окон
function crc32(b) {
  let c, crc = -1; if (!crc32.t) { crc32.t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crc32.t[n] = c >>> 0; } }
  for (let i = 0; i < b.length; i++) crc = crc32.t[(crc ^ b[i]) & 255] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}
function zipStore(files) {      // files: [{name, text}] -> Uint8Array
  const enc = new TextEncoder(), parts = [], cen = [];
  let off = 0;
  const u16 = v => [v & 255, (v >> 8) & 255], u32 = v => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  files.forEach(f => {
    const nm = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
    const hd = [0x50, 0x4b, 3, 4, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0].concat(u32(crc), u32(data.length), u32(data.length), u16(nm.length), [0, 0]);
    parts.push(new Uint8Array(hd), nm, data);
    cen.push(new Uint8Array([0x50, 0x4b, 1, 2, 20, 0, 20, 0, 0, 8, 0, 0, 0, 0, 0x21, 0].concat(u32(crc), u32(data.length), u32(data.length), u16(nm.length), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], u32(off))), nm);
    off += hd.length + nm.length + data.length;
  });
  const cl = cen.reduce((s, a) => s + a.length, 0);
  const end = new Uint8Array([0x50, 0x4b, 5, 6, 0, 0, 0, 0].concat(u16(files.length), u16(files.length), u32(cl), u32(off), [0, 0]));
  const all = parts.concat(cen, [end]), res = new Uint8Array(all.reduce((s, a) => s + a.length, 0));
  let p = 0; all.forEach(a => { res.set(a, p); p += a.length; });
  return res;
}
function exportAll() {
  const files = [], rep = [];
  const safe = s => String(s).replace(/[^\wА-Яа-яЁё]+/g, '_');
  proj.screens.forEach((s, i) => {
    try {
      const r = exportScreen(proj, s.id, Object.assign({ ver: '@@VERSION@@' }, ENGINE));
      const base = String(i + 1).padStart(2, '0') + '_' + safe(s.name || s.id);
      files.push({ name: base + '/code.js', text: r.code }, { name: base + '/config.json', text: r.config });
      rep.push('[' + base + ']  объект X' + (s.ox || 0) + ' Y' + (s.oy || 0) + ' ' + s.w + '×' + s.h + ' · код ' + Math.round(r.size / 1024) + ' КБ' + (r.size > ENGINE_LIMIT ? '  ПРЕВЫШЕН ЛИМИТ' : '') + (r.warn.length ? '\r\n   ' + r.warn.join('\r\n   ') : ''));
    } catch (e) { rep.push('[' + (s.name || s.id) + '] ошибка: ' + e.message); }
  });
  files.push({ name: 'tags.csv', text: tagsCsv() });
  files.push({ name: 'README.txt', text: 'Проект: ' + (proj.name || '') + (proj.panel ? '\r\nПанель: ' + proj.panel.model + ' ' + proj.panel.w + '×' + proj.panel.h : '') + '\r\n\r\nВ каждой папке: code.js — вкладка «Исходный код» JS-объекта, config.json — «Конфигурирование» → «Шаблон…».\r\ntags.csv — все используемые теги с адресами и окнами.\r\n\r\n' + rep.join('\r\n') + '\r\n' });
  const blob = new Blob([zipStore(files)], { type: 'application/zip' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = safe(proj.name || 'проект') + '_окна.zip'; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  toast('Выгружено окон: ' + proj.screens.length + ' (zip с кодом, конфигурацией и tags.csv)');
}
// ---------------------------------------------------------------- окно «Проверка»
let chkTab = 'chk';
function openCheck(tab) {
  chkTab = tab || chkTab;
  openModal('Проверка проекта', h('div', { id: 'chkBody' }));
  renderCheck();
}
function renderCheck() {
  const body = $('#chkBody'); if (!body) return;
  body.innerHTML = '';
  const tabs = h('div', { class: 'btnrow', style: 'margin:0 0 8px' }, [['chk', 'Проверка'], ['tags', 'Теги и ссылки'], ['rep', 'Замена в тегах'], ['all', 'Выгрузка всех окон']].map(t =>
    h('button', { class: chkTab === t[0] ? 'accent' : '', onclick: () => { chkTab = t[0]; renderCheck(); } }, t[1])));
  body.append(tabs);
  if (chkTab === 'chk') {
    const list = checkProject();
    const cnt = l => list.filter(x => x.lvl === l).length;
    body.append(h('p', {}, h('b', {}, 'Ошибок: ' + cnt('err') + ' · предупреждений: ' + cnt('warn') + ' · замечаний: ' + cnt('info')), cnt('err') + cnt('warn') === 0 ? ' — проект в порядке.' : ''));
    const box = h('div', { style: 'max-height:55vh;overflow:auto' });
    list.forEach(x => box.append(h('div', { class: 'note ' + (x.lvl === 'err' ? 'bad' : x.lvl === 'warn' ? 'warn' : ''), style: 'margin:3px 0' }, h('b', {}, (x.lvl === 'err' ? '✖ ' : x.lvl === 'warn' ? '⚠ ' : 'ℹ ') + x.where + ': '), x.msg)));
    body.append(box);
    body.append(h('p', { class: 'note' }, 'Проверяется: теги и записи, лимит кода ~100 КБ, выход элементов за границы окна, кнопки без действия, ссылки на окна и символы, DB (номера, перекрытие полей), размер окон относительно модели панели.'));
  } else if (chkTab === 'tags') {
    const rows = tagTable();
    body.append(h('div', { class: 'btnrow', style: 'margin:0 0 6px' }, h('button', { class: 'accent', onclick: () => download((proj.name || 'проект').replace(/[^\wА-Яа-яЁё]+/g, '_') + '_теги.csv', tagsCsv()) }, 'Скачать CSV (для программиста ПЛК)'), h('span', { class: 'note', style: 'margin:0' }, 'Тегов в окнах: ' + rows.length)));
    const tbl = h('table', { style: 'width:100%;font-size:12px;border-collapse:collapse' }, h('tr', {}, ['Тег', 'Адрес', 'Тип', 'Зап.', 'Окна'].map(c => h('th', { style: 'text-align:left;border-bottom:1px solid #bbb;padding:2px 6px' }, c))));
    rows.forEach(r => tbl.append(h('tr', { style: r.addr === 'не найден' ? 'color:#C42B2B' : '' }, h('td', { style: 'padding:2px 6px;font-family:monospace' }, r.n), h('td', { style: 'padding:2px 6px' }, r.db + (r.addr ? ' · ' + r.addr : '')), h('td', { style: 'padding:2px 6px' }, r.t), h('td', { style: 'padding:2px 6px' }, r.wr ? '✔' : ''), h('td', { style: 'padding:2px 6px' }, r.w.join(', ')))));
    body.append(h('div', { style: 'max-height:58vh;overflow:auto' }, tbl));
  } else if (chkTab === 'rep') {
    const a = h('input', { type: 'text', placeholder: 'что заменить, например MY_DB.' }), b = h('input', { type: 'text', placeholder: 'на что, например MOTORS.' });
    const res = h('div', { class: 'note' });
    const upd = () => { res.textContent = a.value ? 'Будет изменено ссылок на теги: ' + replaceTags(a.value, b.value, true) : ''; };
    a.oninput = b.oninput = upd;
    body.append(h('p', { class: 'note' }, 'Заменяет часть имени тега во всех элементах всех окон (теги, достоверность, условия, действия). Имена блоков в «Данные ПЛК» не меняются — переименуйте их отдельно.'),
      fieldRow('Найти', a), fieldRow('Заменить на', b), res,
      h('div', { class: 'btnrow' }, h('button', { class: 'accent', onclick: () => { if (!a.value) return; pushUndo(); const n = replaceTags(a.value, b.value); autosave(); changed(true); refreshAll(true); toast('Заменено ссылок: ' + n); upd(); } }, 'Заменить во всех окнах')));
  } else {
    body.append(h('p', {}, 'Одним архивом (zip): для каждого окна — код и конфигурацию, плюс tags.csv и README.txt с размерами и предупреждениями.'),
      h('div', { class: 'btnrow' }, h('button', { class: 'accent', onclick: exportAll }, 'Скачать zip со всеми окнами')),
      h('p', { class: 'note' }, 'Если скачивание блокируется (конструктор открыт не как файл) — используйте «Экспорт в панель» по одному окну.'));
  }
}
