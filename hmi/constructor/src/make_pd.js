// Окно 18 «Пульподелитель» (hmi/js/src/scr_pd.js) как окно конструктора.
// Запуск отдельно: node hmi/constructor/src/make_pd.js  -> печатает сводку; в проект его собирает общий генератор.
'use strict';
const lib = require('./make_lib.js');

// DB103 HMI_PD: запись — команда, счётчик жизни, предел времени; время движения 0.1 с -> с (масштаб); демо-значения для просмотра
function pdDb(L) {
  const db = L.importDb('HMI_PD', 103, 250, /^(Cmd|Alive|JogMax)$/);
  db.fields.forEach(f => {
    if (/\.JogTime$/.test(f.n)) f.sc = [0, 10, 0, 1];
    if (f.n === 'JogMax') f.d = 30;
    if (f.n === 'V[1].F.Closed' || f.n === 'V[2].F.Opened') f.d = 1;
  });
  return db;
}

module.exports = function (L) {
  L = L || lib('pd_');
  const { C, el, cnd, T, hp, vp, ln } = L;
  const P = (n, f) => 'HMI_PD.V[' + n + '].F.' + f;
  const ALIVE = 'HMI_PD.Alive', CMD = 'HMI_PD.Cmd', JMAX = 'HMI_PD.JogMax';
  const anyOf = list => ({ m: 'any', l: list.map(t => ({ tag: t, op: '1', v: '' })) });
  const noData = () => cnd(JMAX, 'nd');                  // нет данных DB103 (как «!pdOk()» в оригинале)

  const E = [];
  E.push(T('Пульподелитель трёхструйный', 16, 78, 22, C.text, 'left', true, 420));

  // ------------------------------------------------------------ схема
  E.push(el('rect', { x: 12, y: 104, w: 500, h: 600, r: 4, fill: C.panel, stroke: C.panelBorder, lw: 1, nm: 'Панель схемы' }));
  E.push(T('Схема', 26, 128, 17, C.text, 'left', true, 80));
  E.push(T('Питание пульподелителя', 262, 152, 13, C.text2, 'center', false, 200));
  E.push(vp(262, 164, 206, 8, C.pulp, 'Питание'));
  E.push(el('tri', { x: 254, y: 200, w: 16, h: 10, dir: 'down', fill: C.pulp }));
  // корпус делителя: трапеция 150..374 / 184..340. Многоугольника в движке нет — заливка по центру + контур линиями (см. GAPS_pd.md)
  E.push(el('rect', { x: 184, y: 212, w: 156, h: 70, r: 0, fill: '#D9D6CF', nm: 'Корпус делителя' }));
  E.push(ln(150, 212, 374, 212, '#3B4045', 2.5));
  E.push(ln(150, 212, 184, 282, '#3B4045', 2.5));
  E.push(ln(374, 212, 340, 282, '#3B4045', 2.5));
  E.push(ln(184, 282, 340, 282, '#3B4045', 2.5));
  E.push(T('Пульподелитель', 262, 236, 15, C.text, 'center', true, 150));
  E.push(T('трёхструйный', 262, 258, 13, C.text2, 'center', false, 110));

  // цвет «потока»: серый, если задвижка закрыта или нет данных
  const flowRules = cl => [{ c: noData(), p: { fill: C.branchOff } }, { c: cl, p: { fill: C.branchOff } }];
  const closedAll = (a, b) => ({ m: 'all', l: [{ tag: P(a, 'Closed'), op: '1', v: '' }, { tag: P(b, 'Closed'), op: '1', v: '' }] });
  // цвет задвижки по состоянию (scr_pd.js: pdColor)
  const valveRules = n => [
    { c: noData(), p: { fill: C.stop, stroke: C.repairLine } },
    { c: anyOf([P(n, 'FltLimits'), P(n, 'FltSignal'), P(n, 'FltTimeout')]), p: { fill: C.alarm } },
    { c: anyOf([P(n, 'Opening'), P(n, 'Closing')]), p: { fill: C.move }, bl: true },
    { c: cnd(P(n, 'Opened'), '1'), p: { fill: C.run } },
    { c: cnd(P(n, 'Closed'), '1'), p: { fill: C.stop } }
  ];
  const xs = [0, 192, 262, 332];
  for (let n = 1; n <= 3; n++) {
    const x = xs[n];
    E.push(vp(x, 282, 352, 6, C.pulp, 'Подвод №' + n));
    E.push(el('tri', { x: x - 16, y: 352, w: 32, h: 24, dir: 'down', fill: '#9CC3E4', stroke: C.text, lw: 1.6, st: valveRules(n), nm: 'Задвижка №' + n + ' верх' }));
    E.push(el('tri', { x: x - 16, y: 376, w: 32, h: 24, dir: 'up', fill: '#9CC3E4', stroke: C.text, lw: 1.6, st: valveRules(n), nm: 'Задвижка №' + n + ' низ' }));
    E.push(T('№' + n, x + 24, 376, 15, C.text, 'left', true, 40));
    const p = vp(x, 400, n === 1 ? 452 : 480, 6, C.pulp, 'Отвод №' + n);
    p.st = flowRules(cnd(P(n, 'Closed'), '1'));
    E.push(p);
  }
  // №1 -> зумпф 1
  const a1 = hp(110, 195, 452, 6, C.pulp, 'К зумпфу 1'), a2 = vp(110, 449, 478, 6, C.pulp, 'К зумпфу 1');
  a1.st = flowRules(cnd(P(1, 'Closed'), '1')); a2.st = L.X.clone(a1.st);
  E.push(a1, a2);
  // №2, №3 -> общий коллектор -> зумпф 2 и 3
  [hp(259, 335, 480, 6, C.pulp, 'Коллектор'), vp(380, 480, 600, 6, C.pulp, 'К зумпфу 2,3'), hp(332, 383, 480, 6, C.pulp, 'Коллектор')]
    .forEach(p => { p.st = flowRules(closedAll(2, 3)); E.push(p); });

  // зумпф мельниц 2 и 3 (статика)
  E.push(el('rect', { x: 300, y: 604, w: 170, h: 80, r: 0, fill: C.tankIn }));
  E.push(el('rect', { x: 303, y: 644, w: 164, h: 37, r: 0, fill: '#A0978A' }));
  E.push(el('rect', { x: 300, y: 604, w: 170, h: 80, r: 0, stroke: '#3B4045', lw: 3, nm: 'Зумпф 2,3' }));
  E.push(T('ЗУМПФ', 385, 622, 14, C.text, 'center', true, 80));
  E.push(T('мельницы 2 и 3', 385, 662, 12, C.white, 'center', true, 120));
  // зумпф мельницы 1 — уменьшенная копия с уровнем LT-1
  E.push(el('tank', { x: 46, y: 478, w: 128, h: 206, tag: 'gcu:level', min: 0, max: 100, sp: 'gcuset:levelSP', ok: 'gcu:st.levelOk', nm: 'Зумпф 1',
    marks: [{ n: 'HH', v: 95, c: C.alarmMark }, { n: 'H', v: 85, c: C.text2 }, { n: 'L', v: 20, c: C.text2 }, { n: 'LL', v: 10, c: C.alarmMark }] }));
  const lt = el('valuebox', { x: 58, y: 484, w: 104, h: 44, ti: 'LT-1 · уровень', tag: 'gcu:level', dec: 1, unit: '%', ok: 'gcu:st.levelOk', tsz: 11, vsz: 20, nm: 'LT-1' });
  lt.st = [{ c: { m: 'any', l: [{ tag: 'gcu:alm.2', op: '1', v: '' }, { tag: 'gcu:alm.5', op: '1', v: '' }] }, p: { color: C.alarm, stroke: C.alarm } }];
  E.push(lt);
  E.push(T('ЗУМПФ', 186, 644, 14, C.text, 'left', true, 70));
  E.push(T('мельница 1', 186, 664, 12, C.text2, 'left', false, 80));
  const lv = (tx, tag) => { const t = T(tx, 186, 622, 12, C.alarm, 'left', true, 90); t.vis = cnd(tag, '1'); return t; };
  E.push(lv('уровень HH', 'gcu:alm.2'), lv('уровень LL', 'gcu:alm.5'));
  E.push(T('Степень открытия — визуально по месту, задвижки управляются толчками', 26, 694, 12, C.text2, 'left', false, 480));

  // ------------------------------------------------------------ карточки управления
  const NAMES = ['', 'Задвижка №1', 'Задвижка №2', 'Задвижка №3'];
  const DEST = ['', 'ЗУМПФ мельницы 1', 'ЗУМПФ мельниц 2 и 3', 'ЗУМПФ мельниц 2 и 3'];
  for (let n = 1; n <= 3; n++) {
    const x = 524, y = 104 + (n - 1) * 160, w = 488, h = 150, f = k => P(n, k);
    E.push(el('rect', { x: x, y: y, w: w, h: h, r: 4, fill: C.panel, stroke: C.panelBorder, lw: 1, nm: 'Карточка №' + n }));
    E.push(T(NAMES[n], x + 14, y + 22, 18, C.text, 'left', true, 125));
    E.push(T('→ ' + DEST[n], x + 140, y + 23, 14, C.text2, 'left', false, 200));
    // плашка состояния: заливка и текст — по битам (scr_pd.js: pdColor / pdState)
    const fl = valveRules(n).map(r => ({ c: r.c, p: { fill: r.p.fill, stroke: r.p.stroke }, bl: r.bl })).concat([]);
    fl[0].p = { fill: C.stop, stroke: C.repairLine, dash: true };
    E.push(el('rect', { x: x + 14, y: y + 40, w: 176, h: 32, r: 4, fill: '#9CC3E4', st: fl, nm: 'Плашка состояния №' + n }));
    const tr = [
      [noData(), 'НЕТ ДАННЫХ', C.text], [cnd(f('FltSignal'), '1'), 'НЕДОСТОВЕРНО', C.white], [cnd(f('FltLimits'), '1'), 'ОБА КОНЦЕВИКА', C.white],
      [cnd(f('Opening'), '1'), 'ОТКРЫВАЕТСЯ…', C.text], [cnd(f('Closing'), '1'), 'ЗАКРЫВАЕТСЯ…', C.text], [cnd(f('FltTimeout'), '1'), 'СТОП ПО ВРЕМЕНИ', C.white],
      [cnd(f('Opened'), '1'), 'ОТКРЫТА', C.white], [cnd(f('Closed'), '1'), 'ЗАКРЫТА', C.text]];
    E.push(el('text', { x: x + 14, y: y + 40, w: 176, h: 32, tx: 'ПРОМЕЖУТОЧНОЕ', size: 15, bold: true, align: 'center', color: C.text, fit: true,
      st: tr.map(t => ({ c: t[0], p: { tx: t[1], color: t[2] } })), nm: 'Текст состояния №' + n }));
    // концевики
    [[y + 90, 'Opened', 'концевик ОТКРЫТА'], [y + 112, 'Closed', 'концевик ЗАКРЫТА']].forEach(r =>
      E.push(el('lamp', { x: x + 15, y: r[0] - 7, w: 14, h: 14, tag: f(r[1]), on: C.run, off: C.white, stroke: '#8F949A', lb: r[2], size: 13, nm: r[2] + ' №' + n })));
    E.push(el('value', { x: x + 14, y: y + 124, w: 170, h: 20, tag: 'HMI_PD.V[' + n + '].JogTime', pre: 'Движение: ', unit: 'с', dec: 1, size: 13, align: 'left', bold: true,
      vis: anyOf([f('Opening'), f('Closing')]), nm: 'Время движения №' + n }));
    const wr = T('Отпустите кнопку', x + 14, y + 134, 13, C.alarm, 'left', true, 170);
    wr.vis = cnd(f('FltTimeout'), '1'); E.push(wr);
    // кнопки «пока нажата»: каждые 200 мс пишут Cmd и счётчик Alive
    const ok = () => ({ m: 'all', l: [{ tag: JMAX, op: 'ok', v: '' }, { tag: f('FltSignal'), op: '0', v: '' }, { tag: f('FltLimits'), op: '0', v: '' }] });
    const enO = ok(); enO.l.push({ tag: f('Opened'), op: '0', v: '' });
    const enC = ok(); enC.l.push({ tag: f('Closed'), op: '0', v: '' });
    const bx = x + w - 2 * 136 - 22, by = y + 40;
    E.push(el('hold', { x: bx, y: by, w: 132, h: 98, tx: '▲ ОТКРЫВАТЬ', style: 'green', size: 18, tag: CMD, v: 10 + n, rv: 0, ms: 200, alive: ALIVE, en: enO,
      why: 'Нельзя открывать: нет данных, уже открыта, недостоверный сигнал или оба концевика', nm: 'Открывать №' + n }));
    E.push(el('hold', { x: bx + 140, y: by, w: 132, h: 98, tx: '▼ ЗАКРЫВАТЬ', style: 'blue', size: 18, tag: CMD, v: 20 + n, rv: 0, ms: 200, alive: ALIVE, en: enC,
      why: 'Нельзя закрывать: нет данных, уже закрыта, недостоверный сигнал или оба концевика', nm: 'Закрывать №' + n }));
  }
  // ------------------------------------------------------------ настройка
  const sy = 588;
  E.push(el('rect', { x: 524, y: sy, w: 488, h: 116, r: 4, fill: C.panel, stroke: C.panelBorder, lw: 1, nm: 'Настройка' }));
  E.push(T('Кнопка действует, пока нажата. Отпустили — задвижка остановилась.', 538, sy + 22, 14, C.text, 'left', false, 460));
  E.push(T('Задвижка сама остановится на концевике и через', 538, sy + 46, 13, C.text2, 'left', false, 300));
  E.push(T('макс. время непрерывного движения:', 538, sy + 66, 13, C.text2, 'left', false, 250));
  E.push(el('input', { x: 796, y: sy + 52, w: 100, h: 30, tag: JMAX, dec: 0, unit: 'с', min: 1, max: 600, pin: true, en: cnd(CMD, '=', 0),
    ti: 'Пульподелитель: макс. непрерывное движение, с', nm: 'Макс. время движения' }));
  const nd = T('Нет данных от ПЛК (DB103 HMI_PD)', 538, sy + 96, 13, C.alarm, 'left', true, 300);
  nd.vis = noData(); E.push(nd);

  return { screens: [L.screen('pd_s1', 'Пульподелитель (окно 18)', E, { demoChip: [600, 62], pin: '1234' })], pops: [], dbs: [pdDb(L)] };
};

if (require.main === module) {
  const r = module.exports(lib('pd_'));
  console.log('экранов', r.screens.length, 'элементов', r.screens[0].els.length, 'DB', r.dbs.map(d => d.name + ' DB' + d.num + ' полей ' + d.fields.length));
}
