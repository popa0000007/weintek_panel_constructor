// Пример проекта для конструктора: мнемосхема ГЦУ (перенос scr_mimic.js 1:1) + окно-образец со своим DB.
// Запуск (разработчику): node hmi/constructor/src/make_example.js  -> hmi/constructor/examples/gcu.json
'use strict';
const fs = require('fs'), path = require('path');
const X = require('./export.js');
const ROOT = path.resolve(__dirname, '../../..');
const C = {
  bg: '#DFE0DC', panel: '#F4F4F1', white: '#FFFFFF', text: '#1D2023', text2: '#4B5157', alarmMark: '#A12020',
  run: '#1E8A3C', ready: '#2F6FB8', alarm: '#C42B2B', move: '#E0A100', stop: '#C4C7CB', panelBorder: '#B3B6B0', rowLine: '#D3D5D0',
  pulp: '#5A5F65', water: '#3F7FB4', branchOff: '#8F949A', topBar: '#23272B'
};
let N = 0;
const id = () => 'e' + (++N);
const el = (t, o) => Object.assign({ id: id(), t: t }, o);
const cnd = (tag, op, v, m) => ({ m: m || 'all', l: [{ tag: tag, op: op, v: v === undefined ? '' : String(v) }] });
// подписи как text(...) ядра: точка привязки (x, y) по центру строки
function T(s, x, y, size, color, align, bold, w) {
  w = w || Math.max(30, Math.ceil(s.length * size * 0.62) + 6);
  const bx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  return el('text', { x: bx, y: y - 10, w: w, h: 20, tx: s, size: size, color: color, align: align || 'center', bold: !!bold });
}
const hp = (x1, x2, y, th, c, nm) => el('pipe', { x: x1, y: y - th / 2, w: x2 - x1, h: th, fill: c, nm: nm });
const vp = (x, y1, y2, th, c, nm) => el('pipe', { x: x - th / 2, y: y1, w: th, h: y2 - y1, fill: c, nm: nm });
const ln = (x1, y1, x2, y2, c, lw) => el('line', { x: x1, y: y1, x2: x2, y2: y2, w: 0, h: 0, color: c, lw: lw });

// ================================================================ окно 1: мнемосхема
const M = [];
M.push(el('alarmline', { x: 14, y: 56, w: 600, h: 28, nm: 'Строка аварий' }));
// зумпф
M.push(T('Пульпа с МШР', 160, 108, 13, C.text2, 'center', false, 120));
M.push(ln(160, 120, 160, 182, C.pulp, 2));
M.push(el('tri', { x: 154, y: 180, w: 12, h: 9, dir: 'down', fill: C.pulp }));
M.push(el('tank', { x: 70, y: 190, w: 180, h: 450, tag: 'gcu:level', min: 0, max: 100, sp: 'gcu:set.levelSP', ok: 'gcu:st.levelOk', nm: 'Зумпф',
  marks: [{ n: 'HH', v: 95, c: C.alarmMark }, { n: 'H', v: 85, c: C.text2 }, { n: 'L', v: 20, c: C.text2 }, { n: 'LL', v: 10, c: C.alarmMark }] }));
M.push(el('valuebox', { x: 95, y: 200, w: 130, h: 60, ti: 'LT-1 · уровень', tag: 'gcu:level', dec: 1, unit: '%', ok: 'gcu:st.levelOk', nm: 'LT-1' }));
// насосные линии
[1, 2].forEach(function (n) {
  const L = n === 1 ? 420 : 590, b = (n - 1) * 6;
  M.push(hp(274, 422, L - 110, 3, C.water, 'Тех. вода Н-' + n));
  M.push(T('тех. вода', 319, L - 122, 11, C.water, 'center', false, 60));
  M.push(vp(274, L - 110, L - 3, 3, C.water));
  M.push(vp(364, L - 110, L - 3, 3, C.water));
  M.push(vp(420, L - 110, L - 36, 3, C.water));
  M.push(hp(250, 384, L, 6, C.pulp, 'Всас Н-' + n));
  M.push(hp(456, 643, L, 6, C.pulp, 'Нагнетание Н-' + n));
  M.push(vp(476, L + 3, L + 26, 3, C.pulp));
  M.push(T('разм.', 274, L - 122, 12, C.text2));
  M.push(T('пром.', 364, L - 122, 12, C.text2));
  M.push(T('г/п', 420, L - 122, 12, C.text2));
  M.push(T('всас', 324, L + 28, 12, C.text2));
  M.push(T('нагн.', 540, L - 26, 12, C.text2));
  M.push(T('дрен.', 496, L + 68, 12, C.text2, 'left'));
  const V = (i, x, y, v, nm) => M.push(el('valve', { x: x, y: y, w: v ? 32 : 48, h: v ? 48 : 32, dir: v ? 'v' : 'h', src: 'gcu', n: b + i, nm: nm + ' Н-' + n }));
  V(5, 258, L - 84, true, 'Размывка'); V(4, 348, L - 84, true, 'Промывка'); V(1, 404, L - 96, true, 'Гидроподпор');
  V(2, 300, L - 16, false, 'Всас'); V(3, 516, L - 16, false, 'Нагнетание'); V(6, 460, L + 26, true, 'Дренаж');
  M.push(el('pump', { x: 384, y: L - 36, w: 72, h: 72, src: 'gcu', n: n, lb: 'Н-' + n, nm: 'Насос Н-' + n }));
  M.push(el('pumpcard', { x: 480, y: L - 92, w: 150, h: 56, n: n, nm: 'Карточка Н-' + n }));
  M.push(ln(506, L + 3, 506, L + 18, C.text2, 2));
  M.push(el('sensor', { x: 493, y: L + 18, w: 26, h: 26, tx: 'PT', size: 11 }));
  M.push(el('value', { x: 524, y: L + 19, w: 74, h: 24, tag: 'gcu:line.' + n + '.p', ok: 'gcu:line.' + n + '.ok', dec: 2, unit: 'бар', size: 14,
    align: 'right', pad: 4, fill: C.white, stroke: C.panelBorder, r: 3, nm: 'Давление линии Н-' + n }));
});
// гидроциклоны
M.push(hp(646, 994, 92, 3, C.pulp, 'Слив'));
M.push(T('Слив → сгущение', 994, 70, 13, C.text2, 'right', false, 160));
M.push(vp(640, 297, 593, 6, C.pulp, 'Стояк'));
M.push(hp(637, 1000, 300, 6, C.pulp, 'Коллектор'));
for (let k = 1; k <= 6; k++) {
  const c = 670 + 60 * (k - 1), vi = 12 + k;
  const rep = cnd('gcu:valve.' + vi + '.repair', '1', '', 'any');
  rep.l.push({ tag: 'gcu:set.repair.' + (1 + k), op: '1', v: '' });
  M.push(vp(c, 94, 111, 2, C.pulp));
  const b1 = vp(c + 28, 119, 297, 4, C.pulp, 'Подвод ГЦ-' + k), b2 = hp(c + 20, c + 30, 121, 4, C.pulp);
  b1.st = [{ c: rep, p: { fill: C.branchOff } }];
  b2.st = [{ c: X.clone(rep), p: { fill: C.branchOff } }];
  M.push(b1, b2);
  M.push(el('cyclone', { x: c - 24, y: 111, w: 48, h: 89, src: 'gcu', n: k, nm: 'ГЦ-' + k }));
  M.push(el('valve', { x: c + 12, y: 226, w: 32, h: 48, dir: 'v', src: 'gcu', n: vi, bp: 'left', nm: 'Задвижка ГЦ-' + k }));
}
// давление
M.push(el('valuebox', { x: 480, y: 210, w: 130, h: 60, ti: 'PT-1 · давление', tag: 'gcu:press', dec: 2, unit: 'бар', ok: 'gcu:st.pressOk', nm: 'PT-1' }));
M.push(ln(610, 240, 652, 240, C.text2, 2));
M.push(ln(652, 240, 652, 297, C.text2, 2));
// панель управления
const PX = 656, PW = 356;
M.push(el('rect', { x: PX, y: 330, w: PW, h: 370, r: 4, fill: C.panel, stroke: C.panelBorder, lw: 1, nm: 'Панель управления' }));
M.push(T('Режим', PX + 12, 360, 16, C.text, 'left', true));
M.push(el('button', { x: 760, y: 338, w: 120, h: 44, tx: 'РУЧНОЙ', style: 'blue', ac: cnd('gcu:st.auto', '0'), en: cnd('gcu:st.auto', 'ok'),
  act: { a: 'gcu', v: 11, cf: 'Перевести ГЦУ в РУЧНОЙ режим?', cm: 'Алгоритм перестанет управлять насосами и циклонами.' } }));
const autoEn = cnd('gcu:st.auto', '1', '', 'any'); autoEn.l.push({ tag: 'gcu:st.canAuto', op: '1', v: '' });
M.push(el('button', { x: 884, y: 338, w: 120, h: 44, tx: 'АВТОМАТ', style: 'green', ac: cnd('gcu:st.auto', '1'), en: autoEn,
  why: 'Нет условий для перевода в АВТОМАТ (задвижки в дистанции, нет аварий)',
  act: { a: 'gcu', v: 10, cf: 'Перевести ГЦУ в АВТОМАТ?', cm: 'Команды оператора задвижкам и ПЧ будут блокированы.' } }));
M.push(T('Программа', PX + 12, 412, 16, C.text, 'left', true));
M.push(el('button', { x: 762, y: 390, w: 76, h: 44, tx: 'ПУСК', style: 'green', ac: cnd('gcu:st.run', '1'), en: cnd('gcu:st.auto', '1'),
  why: 'Пуск программы — только в АВТОМАТЕ', act: { a: 'gcu', v: 1, cf: 'Запустить программу ГЦУ?', cm: 'Насос и гидроциклоны будут включены по алгоритму.' } }));
M.push(el('button', { x: 842, y: 390, w: 76, h: 44, tx: 'СТОП', en: cnd('gcu:st.auto', 'ok'),
  act: { a: 'gcu', v: 2, cf: 'Остановить программу ГЦУ?', cm: 'Насос будет остановлен с промывкой и дренажом.' } }));
M.push(el('button', { x: 922, y: 390, w: 82, h: 44, tx: 'СБРОС', en: cnd('gcu:st.auto', 'ok'), act: { a: 'gcu', v: 4, msg: 'Сброс аварий отправлен' } }));
M.push(ln(PX + 10, 442, PX + PW - 10, 442, C.rowLine, 1));
const row = (label, y, tag, dec, unit) => {
  M.push(T(label, PX + 12, y, 15, C.text2, 'left', false, 170));
  M.push(el('value', { x: PX + PW - 12 - 130, y: y - 10, w: 130, h: 20, tag: tag, dec: dec, unit: unit, size: 16, align: 'right', nm: label }));
};
const inp = (label, y, tag, dec, unit, min, max, ti) => {
  M.push(T(label, PX + 12, y, 15, C.text2, 'left', false, 120));
  M.push(el('input', { x: 878, y: y - 12, w: 122, h: 26, tag: tag, dec: dec, unit: unit, min: min, max: max, ti: ti, nm: ti }));
};
M.push(T('Давление → насос', PX + 12, 457, 15, C.text, 'left', true, 200));
row('Давление', 480, 'gcu:press', 2, 'бар');
inp('Задание', 506, 'gcuset:pressSP', 2, 'бар', 0.1, 2.5, 'Уставка давления, бар');
row('Скорость насоса', 532, 'gcu:speedOut', 1, '%');
M.push(ln(PX + 10, 548, PX + PW - 10, 548, C.rowLine, 1));
M.push(T('Уровень → гидроциклоны', PX + 12, 563, 15, C.text, 'left', true, 240));
row('Уровень', 586, 'gcu:level', 1, '%');
inp('Уставка', 612, 'gcuset:levelSP', 1, '%', 5, 95, 'Уставка уровня, %');
inp('Зона ±', 638, 'gcuset:hyst', 1, '%', 0.5, 20, 'Зона нечувствительности ±, %');
M.push(T('Открыто циклонов', PX + 12, 664, 15, C.text2, 'left', false, 170));
M.push(el('value', { x: 950, y: 654, w: 50, h: 20, tag: 'gcu:set.nMax', pre: 'из ', dec: 0, size: 16, align: 'right' }));
M.push(el('value', { x: 911, y: 654, w: 50, h: 20, tag: 'gcu:nCyc', dec: 0, size: 16, align: 'right' }));
M.push(el('rect', { x: PX + 8, y: 676, w: PW - 16, h: 20, r: 3, fill: C.white, stroke: C.rowLine, lw: 1 }));
M.push(el('value', { x: PX + 16, y: 677, w: 150, h: 20, tag: 'gcu:activePump', fm: 'map', map: [{ v: 0, tx: '—' }, { v: 1, tx: 'Н-1' }, { v: 2, tx: 'Н-2' }],
  pre: 'Рабочий: ', size: 13, align: 'left', nm: 'Рабочий насос' }));
M.push(el('state', { x: PX + 168, y: 678, w: 172, h: 16, r: 3, tag: 'gcu:st.permit', size: 12, ndt: 'МШР: —', nm: 'Разрешение МШР',
  sts: [{ v: 1, tx: 'МШР: РАЗРЕШЕНО', f: C.run, c: C.white }, { v: 0, tx: 'МШР: ЗАПРЕЩЕНО', f: C.alarm, c: C.white }] }));
// воздух ПМУ
M.push(el('rect', { x: 262, y: 98, w: 206, h: 84, r: 4, fill: C.panel, stroke: C.panelBorder, lw: 1, nm: 'Воздух ПМУ' }));
M.push(T('Воздух пневматики ПМУ', 272, 113, 13, C.text, 'left', true, 190));
[['ПМУ насосов', 2], ['ПМУ циклонов', 1]].forEach(function (r, i) {
  const yy = 138 + i * 28;
  if (i) M.push(ln(270, yy - 14, 460, yy - 14, C.rowLine, 1));
  M.push(T(r[0], 272, yy, 14, C.text2, 'left', false, 110));
  M.push(el('value', { x: 378, y: yy - 10, w: 80, h: 20, tag: 'gcu:air.' + r[1] + '.p', ok: 'gcu:air.' + r[1] + '.ok', dec: 1, unit: 'бар', size: 15, align: 'right', r: 0 }));
});

// ================================================================ окно 2: образец со своим DB (DB200 — в ПЛК его нет, только пример)
N = 1000;
const myFields = [];
for (let m = 1; m <= 3; m++) {
  myFields.push({ n: 'Motor[' + m + '].Cmd', t: 'int', cm: 'команда: 1 пуск, 2 стоп, 4 сброс (ПЛК обнуляет)', wr: true });
  myFields.push({ n: 'Motor[' + m + '].State', t: 'int', cm: '0 стоит, 1 готов, 2 работа, 3 авария, 4 ремонт, 5 пуск/останов', d: [2, 1, 3][m - 1] });
  myFields.push({ n: 'Motor[' + m + '].Speed', t: 'real', cm: 'скорость, %', d: [72, 0, 0][m - 1], ds: m === 1 ? 'sin' : '', da: 6 });
  myFields.push({ n: 'Motor[' + m + '].SpeedSP', t: 'real', cm: 'задание скорости, %', wr: true, d: [75, 50, 50][m - 1] });
  myFields.push({ n: 'Motor[' + m + '].Run', t: 'bool', cm: 'работает', d: m === 1 ? 1 : 0 });
  myFields.push({ n: 'Motor[' + m + '].Fault', t: 'bool', cm: 'авария', d: m === 3 ? 1 : 0 });
  myFields.push({ n: 'Motor[' + m + '].Local', t: 'bool', cm: 'местное управление' });
}
myFields.push({ n: 'Level', t: 'real', cm: 'уровень в баке, %', d: 55, ds: 'sin', da: 20 });
myFields.push({ n: 'Jog', t: 'int', cm: 'толчок: 1 вперёд, 2 назад (пока нажата кнопка)', wr: true });
myFields.push({ n: 'Alive', t: 'int', cm: 'счётчик жизни панели (для толчка)', wr: true });
X.autoOffsets(myFields);
myFields.forEach(f => { if (!f.ds) delete f.ds; if (!f.da) delete f.da; if (f.d === undefined) delete f.d; });
const E = [];
E.push(el('text', { x: 20, y: 60, w: 600, h: 28, tx: 'Образец: свои данные из DB200 «MY_DB» (только для изучения)', size: 16, bold: true, align: 'left', color: C.text }));
E.push(el('rect', { x: 20, y: 100, w: 600, h: 300, r: 4, fill: C.panel, stroke: C.panelBorder, lw: 1, nm: 'Панель моторов' }));
['Мотор', 'Состояние', 'Скорость', 'Авария', ''].forEach((h, i) => E.push(el('text', { x: [40, 150, 330, 430, 500][i], y: 108, w: 100, h: 20, tx: h, size: 13, color: C.text2, align: 'left', bold: true })));
for (let m = 1; m <= 3; m++) {
  const y = 140 + (m - 1) * 84, P = 'MY_DB.Motor[' + m + '].';
  const g = { id: id(), t: 'group', x: 30, y: y, w: 580, h: 72, nm: 'Мотор ' + m, els: [
    el('pump', { x: 0, y: 0, w: 60, h: 60, src: 'tag', vt: P + 'State', lb: 'M' + m, act: { a: 'popup', id: 'pm', p: String(m) } }),
    el('state', { x: 110, y: 14, w: 170, h: 32, tag: P + 'State', size: 15, sts: [
      { v: 0, tx: 'СТОИТ', f: C.stop, c: C.text }, { v: 1, tx: 'ГОТОВ', f: C.ready, c: C.white }, { v: 2, tx: 'РАБОТА', f: C.run, c: C.white },
      { v: 3, tx: 'АВАРИЯ', f: C.alarm, c: C.white, bl: true }, { v: 4, tx: 'РЕМОНТ', f: '#ECEDEA', c: C.text }, { v: 5, tx: 'ПУСК / ОСТАНОВ', f: C.move, c: C.text }] }),
    el('value', { x: 300, y: 14, w: 90, h: 32, tag: P + 'Speed', dec: 1, unit: '%', size: 18, fill: C.white, stroke: C.panelBorder }),
    el('lamp', { x: 410, y: 20, w: 20, h: 20, tag: P + 'Fault', on: C.alarm, off: C.white, bl: true }),
    el('button', { x: 470, y: 12, w: 100, h: 36, tx: 'Управление', size: 14, act: { a: 'popup', id: 'pm', p: String(m) } })
  ] };
  E.push(g);
}
E.push(el('text', { x: 660, y: 100, w: 120, h: 20, tx: 'Уровень', size: 14, color: C.text2, align: 'left', bold: true }));
E.push(el('bar', { x: 660, y: 125, w: 50, h: 275, tag: 'MY_DB.Level', min: 0, max: 100, fill: C.water, sv: false }));
E.push(el('value', { x: 720, y: 250, w: 90, h: 30, tag: 'MY_DB.Level', dec: 1, unit: '%', size: 20, align: 'left' }));
E.push(el('trend', { x: 20, y: 420, w: 600, h: 230, min: 0, max: 100, span: 300, dec: 0, nm: 'Тренд', pens: [
  { tag: 'MY_DB.Motor[1].Speed', c: C.ready, n: 'M1 скорость' }, { tag: 'MY_DB.Level', c: C.water, n: 'Уровень' }] }));
E.push(el('alarms', { x: 640, y: 420, w: 370, h: 140, empty: 'Аварий моторов нет', items: [1, 2, 3].map(m => ({ tag: 'MY_DB.Motor[' + m + '].Fault', tx: 'Мотор ' + m + ': авария', c: 'A' }))
  .concat([1, 2, 3].map(m => ({ tag: 'MY_DB.Motor[' + m + '].Local', tx: 'Мотор ' + m + ': местное управление', c: 'W' }))) }));
E.push(el('text', { x: 640, y: 576, w: 360, h: 20, tx: 'Толчок (действует, пока нажата)', size: 13, color: C.text2, align: 'left' }));
E.push(el('hold', { x: 640, y: 600, w: 170, h: 56, tx: '◀ НАЗАД', style: 'blue', tag: 'MY_DB.Jog', v: 2, rv: 0, ms: 200, alive: 'MY_DB.Alive' }));
E.push(el('hold', { x: 830, y: 600, w: 170, h: 56, tx: 'ВПЕРЁД ▶', style: 'green', tag: 'MY_DB.Jog', v: 1, rv: 0, ms: 200, alive: 'MY_DB.Alive' }));
E.push(el('clock', { x: 840, y: 60, w: 170, h: 28, fm: 'datetime', size: 15, align: 'right' }));
// своё окно «Мотор #» (# = номер, передаётся кнопкой)
const PM = [];
const pP = 'MY_DB.Motor[#].';
PM.push(el('state', { x: 16, y: 58, w: 388, h: 40, tag: pP + 'State', size: 18, sts: [
  { v: 0, tx: 'СТОИТ', f: C.stop, c: C.text }, { v: 1, tx: 'ГОТОВ', f: C.ready, c: C.white }, { v: 2, tx: 'РАБОТА', f: C.run, c: C.white },
  { v: 3, tx: 'АВАРИЯ', f: C.alarm, c: C.white, bl: true }, { v: 4, tx: 'РЕМОНТ', f: '#ECEDEA', c: C.text }, { v: 5, tx: 'ПУСК / ОСТАНОВ', f: C.move, c: C.text }] }));
PM.push(el('text', { x: 16, y: 116, w: 180, h: 24, tx: 'Скорость', size: 15, color: C.text2, align: 'left' }));
PM.push(el('value', { x: 254, y: 116, w: 150, h: 24, tag: pP + 'Speed', dec: 1, unit: '%', size: 17, align: 'right' }));
PM.push(el('text', { x: 16, y: 152, w: 180, h: 24, tx: 'Задание', size: 15, color: C.text2, align: 'left' }));
PM.push(el('input', { x: 254, y: 150, w: 150, h: 28, tag: pP + 'SpeedSP', dec: 1, unit: '%', min: 0, max: 100, ti: 'Мотор #: задание скорости, %' }));
PM.push(el('lamp', { x: 16, y: 192, w: 18, h: 18, tag: pP + 'Local', on: C.move, lb: 'Местное управление', size: 14 }));
PM.push(el('lamp', { x: 220, y: 192, w: 18, h: 18, tag: pP + 'Fault', on: C.alarm, bl: true, lb: 'Авария', size: 14 }));
const notLocal = cnd(pP + 'Local', '0');
PM.push(el('button', { x: 16, y: 250, w: 120, h: 48, tx: 'ПУСК', style: 'green', ac: cnd(pP + 'Run', '1'), en: notLocal, why: 'Мотор в местном управлении',
  act: { a: 'write', tag: pP + 'Cmd', v: '1', cf: 'Пустить мотор #?', log: 'Оператор: пуск мотора #' } }));
PM.push(el('button', { x: 150, y: 250, w: 120, h: 48, tx: 'СТОП', en: X.clone(notLocal), why: 'Мотор в местном управлении',
  act: { a: 'write', tag: pP + 'Cmd', v: '2', cf: 'Остановить мотор #?', log: 'Оператор: стоп мотора #' } }));
PM.push(el('button', { x: 284, y: 250, w: 120, h: 48, tx: 'СБРОС', act: { a: 'write', tag: pP + 'Cmd', v: '4', msg: 'Сброс отправлен' } }));

// ================================================================ данные ПЛК
const scl = fs.readFileSync(path.join(ROOT, 'plc/5_GCU_HMI.scl'), 'utf8');
const imp = X.sclToDbs(scl);
const nums = { HMI_GCU: 100, HMI_SET: 101 };
const dbs = imp.dbs.filter(d => nums[d.name]).map((d, i) => ({ id: 'db' + (i + 1), name: d.name, num: nums[d.name], ms: d.name === 'HMI_SET' ? 2000 : 500,
  fields: d.fields.map(f => Object.assign(f, { wr: d.name === 'HMI_SET' || /Cmd|SelValve|ManSpeed/.test(f.n) })) }));
dbs.push({ id: 'db9', name: 'MY_DB', num: 200, ms: 500, fields: myFields });

const project = {
  v: 1, name: 'ГЦУ-1', nextId: 2000,
  conn: { dev: 'Siemens S7-1200/S7-1500', hiFirst: true, realSwap: false, maxWords: 90, font: 'Arial', bold: true },
  dbs: dbs,
  screens: [
    { id: 's1', name: 'Мнемосхема ГЦУ', w: 1024, h: 664, ox: 0, oy: 48, bg: C.bg, diag: [14, 676], demoChip: [140, 676], noCommBar: true, els: M },
    { id: 's2', name: 'Образец: свои данные (DB200)', w: 1024, h: 664, ox: 0, oy: 48, bg: C.bg, demoChip: [660, 62], els: E }
  ],
  pops: [{ id: 'pm', name: 'Мотор (окно управления)', ti: 'Мотор # — управление', w: 420, h: 320, els: PM }]
};
// ================================================================ остальные окна проекта (make_<окно>.js) и пример своего символа
project.ex = { id: 'gcu', v: 2 };
project.panel = { model: 'cMT2158X', w: 1024, h: 768, top: 48, bot: 56 };
project.lib = [{ id: 'sym_agit', name: 'Мешалка (пример символа)', w: 80, h: 80,
  sts: [{ v: 0, tx: 'СТОИТ', f: C.stop, s: C.text, c: C.text }, { v: 1, tx: 'РАБОТА', f: C.run, s: C.text, c: C.white }, { v: 2, tx: 'АВАРИЯ', f: C.alarm, s: C.text, c: C.white, bl: true }],
  df: { tx: '', f: C.stop, s: C.text, c: C.text }, nd: { tx: '—', f: '#E3E4E1', s: C.text2, c: C.text2 },
  shapes: [{ k: 'rect', x: 8, y: 20, w: 64, h: 52, r: 4, fill: C.white, stroke: '@s', lw: 2 },
    { k: 'line', pt: '40 4 40 52', stroke: '@s', lw: 3 }, { k: 'poly', pt: '14 52 66 52 60 62 20 62', fill: '@f', stroke: '@s', lw: 1.5 },
    { k: 'ell', x: 34, y: 46, w: 12, h: 12, fill: '@f', stroke: '@s', lw: 1.5 }, { k: 'text', x: 40, y: 38, tx: '@lb', size: 14, bold: true, color: C.text }] }];
project.screens[1].els.push(el('sym', { x: 900, y: 200, w: 80, h: 80, lib: 'sym_agit', tag: 'MY_DB.Motor[1].Run', lb: 'М1', nm: 'Мешалка (свой символ)' }));
['pump', 'settings', 'alarms', 'trends', 'io', 'pd'].forEach(function (nm) {
  const f = require('./make_' + nm + '.js')(require('./make_lib.js')('x_' + nm + '_'));
  f.screens.forEach(s => project.screens.push(s));
  (f.pops || []).forEach(s => project.pops.push(s));
  (f.dbs || []).forEach(d => { if (!project.dbs.some(x => x.name === d.name)) project.dbs.push(d); });
});
const out = path.join(__dirname, '..', 'examples', 'gcu.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(project, null, 1));
console.log('examples/gcu.json', fs.statSync(out).size, 'окон', project.screens.length, 'окон-pops', project.pops.length, 'DB', project.dbs.length);
