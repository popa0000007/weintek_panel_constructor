// Окна «Насос Н-1» и «Насос Н-2» (окна 11, 12): перенос hmi/js/src/scr_pump.js в элементы конструктора.
// Данные — встроенные gcu:… / gcuset:… / gcuspd:… (DB100/DB101), своих DB нет.
'use strict';
const mkLib = require('./make_lib.js');

const STEP_TEXT = {
  0: 'Исходное', 10: 'Открытие гидроподпора', 20: 'Открытие размывки', 25: 'Размыв зумпфа',
  30: 'Открытие промывки и нагнетания', 40: 'Пуск насоса', 45: 'Промывка насоса', 50: 'Открытие всаса',
  60: 'Закрытие промывки', 100: 'Работа', 200: 'Снижение скорости', 210: 'Открытие промывки',
  220: 'Закрытие всаса', 230: 'Промывка', 240: 'Останов насоса', 250: 'Закрытие задвижек, дренаж',
  260: 'Дренаж', 270: 'Закрытие дренажа', 280: 'Закрытие гидроподпора',
  900: 'Аварийный останов', 910: 'Аварийный дренаж', 920: 'Выдержка гидроподпора'
};
const FAULT_TEXT = {
  1: 'авария частотника', 3: 'авария гидроподпора', 4: 'авария промывки', 5: 'авария размывки',
  6: 'авария нагнетания', 7: 'авария всаса', 8: 'авария дренажа', 9: 'превышено время шага',
  10: 'потеря положения задвижки в работе', 11: 'задвижка переведена в местное при пуске',
  13: 'аварийный стоп по уровню', 14: 'аварийный стоп (кнопка)', 15: 'давление гидроподпора вне нормы'
};
const DRV_TEXT = { 1: 'не готов', 2: 'запрет включения', 3: 'готов к включению', 4: 'готов', 5: 'работа', 8: 'авария' };
const PUMP_STATE = ['СТОИТ', 'ГОТОВ', 'РАБОТА', 'АВАРИЯ', 'РЕМОНТ'];
const VALVE_STATE = ['ЗАКРЫТА', 'ОТКРЫТА', 'В ДВИЖЕНИИ', 'АВАРИЯ', 'РЕМОНТ', 'НЕИЗВЕСТНО'];
const REPAIR_FILL = '#ECEDEA', REPAIR_LINE = '#6F757B', BTN_BORDER = '#8F949A', UNKNOWN = '#9CC3E4';

function buildPump(L, PN) {
  const C = L.C, el = L.el, cnd = L.cnd, T = L.T, ln = L.ln;
  const E = [];
  const P = 'gcu:pump.' + PN + '.';
  const b = (PN - 1) * 6;
  const both = (a, c2) => ({ m: 'all', l: a.l.concat(c2.l) });
  const valveCol = [C.stop, C.run, C.move, C.alarm, REPAIR_FILL, UNKNOWN];
  const valveDark = [true, false, true, false, true, true];
  const val = (x, yc, w, tag, o) => el('value', Object.assign({ x: x, y: yc - 10, w: w, h: 20, tag: tag, size: 16, align: 'right' }, o));
  const panel = (x, y, w, h, title, sub, subX) => {
    E.push(el('rect', { x: x, y: y, w: w, h: h, r: 4, fill: C.panel, stroke: C.panelBorder, lw: 1, nm: title }));
    E.push(T(title, x + 14, y + 22, 18, C.text, 'left', true, 130));
    if (sub) E.push(T(sub, subX, y + 23, 13, C.text2, 'left', false, 150));
  };
  const dotRow = (cx, cy, tag, label, lw) => {
    E.push(el('lamp', { x: cx - 7, y: cy - 7, w: 14, h: 14, tag: tag, on: C.alarm, off: C.white, stroke: BTN_BORDER }));
    const t = T(label, cx + 14, cy + 1, 14, C.text2, 'left', false, lw || 110);
    t.st = [{ c: cnd(tag, '1'), p: { color: C.alarm, bold: true } }];
    E.push(t);
  };

  // ---------------------------------------------------------------- 1. последовательность (12, 58, 330 × 646)
  {
    const x = 12, y = 58, w = 330, h = 646;
    panel(x, y, w, h, 'Насос Н-' + PN, 'последовательность', x + 14 + 98);
    E.push(val(x + w - 14 - 90, y + 23, 90, P + 'step', { pre: 'шаг ', dec: 0, size: 15, nm: 'Шаг' }));
    const colW = (w - 28) / 2;
    E.push(T('ПУСК', x + 14, y + 52, 13, C.text, 'left', true, 80));
    E.push(T('ОСТАНОВ', x + 14 + colW + 4, y + 52, 13, C.text, 'left', true, 100));
    const startSteps = [[10, 'Гидроподпор'], [20, 'Размывка зумпфа'], [25, 'Размыв', 'gcuset:tScour'], [30, 'Промывка, нагнет.'],
      [40, 'Пуск, малая скор.'], [45, 'Промывка', 'gcuset:tFlushStart'], [50, 'Открыть всас'], [60, 'Закрыть промывку'], [100, 'РАБОТА']];
    const stopSteps = [[200, 'Малая скорость'], [210, 'Открыть промывку'], [220, 'Закрыть всас'], [230, 'Промывка', 'gcuset:tFlushStop'],
      [240, 'Стоп насоса'], [250, 'Закрыть, дренаж'], [260, 'Дренаж', 'gcuset:tDrain'], [270, 'Закрыть дренаж'], [280, 'Закрыть г/п'],
      [900, 'Аварийный стоп'], [910, 'Аварийный дренаж'], [920, 'Выдержка г/п']];
    const stepRow = (s, cx, cy) => {
      const cur = cnd(P + 'step', '=', s[0]);
      const red = s[0] >= 900;
      E.push(el('rect', { x: cx - 4, y: cy - 12, w: colW - 2, h: 25, r: 3, fill: red ? C.alarm : C.run, vis: cur, nm: 'Текущий шаг ' + s[0] }));
      const num = T(String(s[0]), cx + 26, cy + 1, 13, red ? C.alarm : C.text, 'right', true, 30);
      num.st = [{ c: L.X.clone(cur), p: { color: C.white } }];
      E.push(num);
      const wd = colW - 42;
      if (s[2]) {      // подпись с временем шага из уставок DB101
        E.push(el('value', { x: cx + 34, y: cy - 9, w: wd, h: 20, tag: s[2], pre: s[1] + ' ', unit: 'с', dec: 0, size: 13, bold: false,
          align: 'left', color: red ? C.alarm : C.text2, st: [{ c: L.X.clone(cur), p: { color: C.white, bold: true } }] }));
      } else {
        const t = el('text', { x: cx + 34, y: cy - 9, w: wd, h: 20, tx: s[1], size: 13, color: red ? C.alarm : C.text2, align: 'left', fit: true,
          st: [{ c: L.X.clone(cur), p: { color: C.white, bold: true } }] });
        E.push(t);
      }
    };
    startSteps.forEach((s, i) => stepRow(s, x + 14, y + 80 + i * 30));
    stopSteps.forEach((s, i) => stepRow(s, x + 18 + colW, y + 80 + i * 30));
    // нижний блок
    const by = y + h - 96;
    E.push(el('rect', { x: x + 12, y: by, w: w - 24, h: 84, r: 4, fill: C.white, stroke: C.panelBorder, lw: 1 }));
    E.push(T('Код аварии: ', x + 24, by + 20, 14, C.text2, 'left', false, 84));
    const fm = [{ v: 0, tx: '0 — нет' }];
    Object.keys(FAULT_TEXT).forEach(k => fm.push({ v: +k, tx: k + ' — ' + FAULT_TEXT[k] }));
    E.push(val(x + 108, by + 20, w - 136, P + 'faultCode', { fm: 'map', map: fm, size: 14, align: 'left',
      st: [{ c: cnd(P + 'faultCode', '!=', 0), p: { color: C.alarm } }], nm: 'Код аварии' }));
    E.push(T('Шаг: ', x + 24, by + 44, 14, C.text2, 'left', false, 36));
    const sm = Object.keys(STEP_TEXT).map(k => ({ v: +k, tx: STEP_TEXT[k] }));
    E.push(val(x + 62, by + 44, w - 90, P + 'step', { fm: 'map', map: sm, size: 14, align: 'left', nm: 'Текст шага' }));
    E.push(T('ГЦУ: ', x + 24, by + 68, 14, C.text2, 'left', false, 36));
    const autoCol = [{ c: cnd('gcu:st.auto', '1'), p: { color: C.run } }];
    const manCol = [{ c: cnd('gcu:st.auto', '1'), p: { color: C.run } }];
    E.push(val(x + 62, by + 68, 78, 'gcu:st.auto', { fm: 'bool', on: 'АВТОМАТ', off: 'РУЧНОЙ', size: 14, align: 'left', color: C.ready, st: autoCol, nm: 'Режим ГЦУ' }));
    E.push(val(x + 140, by + 68, w - 24 - 128, 'gcu:st.run', { fm: 'bool', on: '· программа РАБОТА', off: '· программа СТОП', size: 14, align: 'left',
      color: C.ready, st: manCol, nm: 'Программа ГЦУ' }));
  }

  // ---------------------------------------------------------------- 2. частотник (352, 58, 318 × 646)
  {
    const x = 352, y = 58, w = 318, h = 646;
    panel(x, y, w, h, 'Частотник', 'Danfoss · Profibus', x + 14 + 106);
    // плашка состояния: views 0…4 по цвету PUMP_STATE; view 5 — «ПУСК» / «ОСТАНОВ» по биту starting
    const pv = P + 'view', dark = [true, false, false, false, true];
    const cols = [C.stop, C.ready, C.run, C.alarm, REPAIR_FILL];
    const base = { x: x + 12, y: y + 42, w: w - 24, h: 40, size: 18, tag: pv, ndt: 'НЕТ ДАННЫХ', r: 4 };
    E.push(el('state', Object.assign({}, base, { nm: 'Состояние насоса',
      sts: PUMP_STATE.map((t, i) => ({ v: i, tx: t, f: cols[i], c: dark[i] ? C.text : C.white })),
      dtx: '?', vis: { m: 'any', l: [{ tag: pv, op: '!=', v: '5' }, { tag: pv, op: 'nd', v: '' }] },
      st: [{ c: cnd(pv, '=', 4), p: { stroke: REPAIR_LINE } }] })));
    E.push(el('state', Object.assign({}, base, { nm: 'Пуск', sts: [{ v: 5, tx: 'ПУСК', f: C.move, c: C.text }],
      vis: both(cnd(pv, '=', 5), cnd(P + 'starting', '1')) })));
    E.push(el('state', Object.assign({}, base, { nm: 'Останов', sts: [{ v: 5, tx: 'ОСТАНОВ', f: C.move, c: C.text }],
      vis: both(cnd(pv, '=', 5), cnd(P + 'starting', '0')) })));
    let yy = y + 106;
    const lab = (s) => E.push(T(s, x + 14, yy, 15, C.text2, 'left', false, 170));
    const vr = (tag, o) => E.push(val(x + w - 14 - 140, yy, 140, tag, o));
    lab('Управление');
    vr(P + 'remote', { fm: 'bool', on: 'Дистанция', off: 'Местное', st: [{ c: cnd(P + 'remote', '0'), p: { color: C.move } }] }); yy += 28;
    lab('Состояние ПЧ');
    vr(P + 'drv', { fm: 'map', map: Object.keys(DRV_TEXT).map(k => ({ v: +k, tx: DRV_TEXT[k] })) }); yy += 28;
    lab('Задание');
    vr(P + 'speed', { dec: 1, unit: '%' }); yy += 28;
    lab('Давление нагнетания');
    vr('gcu:line.' + PN + '.p', { dec: 2, unit: 'бар', ok: 'gcu:line.' + PN + '.ok', bad: 'недостоверно' }); yy += 28;
    lab('Воздух ПМУ насосов');
    vr('gcu:air.2.p', { dec: 1, unit: 'бар', ok: 'gcu:air.2.ok', bad: 'недостоверно' }); yy += 28;
    lab('Пусков');
    vr(P + 'starts', { dec: 0 }); yy += 28;
    lab('Роль');
    vr(P + 'duty', { fm: 'bool', on: 'основной', off: 'резервный', vis: cnd('gcu:activePump', '!=', PN) });
    vr(P + 'duty', { fm: 'bool', on: 'основной · рабочий', off: 'резервный · рабочий', vis: cnd('gcu:activePump', '=', PN) }); yy += 28;
    // ручное задание
    yy += 6;
    E.push(T('Ручное задание', x + 14, yy + 15, 15, C.text2, 'left', false, 140));
    E.push(el('input', { x: x + w - 14 - 120, y: yy, w: 120, h: 30, tag: 'gcuspd:' + PN, dec: 1, unit: '%', min: 0, max: 100,
      ti: 'Н-' + PN + ': ручное задание скорости, %', en: cnd('gcu:st.auto', '0'), nm: 'Ручное задание' }));
    yy += 46;
    const bw = (w - 24 - 16) / 3;
    const why = 'Пуск и стоп насоса — только в РУЧНОМ режиме';
    E.push(el('button', { x: x + 12, y: yy, w: bw, h: 46, tx: 'ПУСК', en: cnd('gcu:st.auto', '0'), why: why,
      act: { a: 'pump', n: PN, v: 1, cf: 'Пустить насос Н-' + PN + '?', cm: 'Проверьте положение задвижек линии.', log: 'Оператор: пуск Н-' + PN } }));
    E.push(el('button', { x: x + 20 + bw, y: yy, w: bw, h: 46, tx: 'СТОП', en: cnd('gcu:st.auto', '0'), why: why,
      act: { a: 'pump', n: PN, v: 2, cf: 'Остановить насос Н-' + PN + '?', log: 'Оператор: стоп Н-' + PN } }));
    E.push(el('button', { x: x + 28 + 2 * bw, y: yy, w: bw, h: 46, tx: 'СБРОС', en: cnd('gcu:st.auto', 'ok'),
      act: { a: 'pump', n: PN, v: 4, msg: 'Сброс аварий линии Н-' + PN + ' отправлен', log: 'Оператор: сброс аварий линии Н-' + PN } }));
    yy += 58;
    E.push(T('Пуск и стоп с панели — только в режиме РУЧНОЙ', x + 14, yy, 12, C.text2, 'left', false, 290));
    yy += 26;
    [['fltDrive', 'Авария ПЧ'], ['fltComm', 'Связь DP'], ['fltStart', 'Не запустился'], ['fltStop', 'Не остановился'],
      ['fltUnxStart', 'Самопр. пуск'], ['fltUnxStop', 'Самопр. стоп']].forEach((q, i) => {
      dotRow(x + 22 + (i % 2) * ((w - 28) / 2), yy + Math.floor(i / 2) * 26, P + q[0], q[1], 120);
    });
  }

  // ---------------------------------------------------------------- 3. задвижки развязки (680, 58, 332 × 646)
  {
    const x = 680, y = 58, w = 332, h = 646;
    panel(x, y, w, h, 'Задвижки развязки', null);
    const names = ['Гидроподпор', 'Всас', 'Нагнетание', 'Промывка', 'Размывка', 'Дренаж'];
    const rowH = 62;
    names.forEach((nm, k) => {
      const idx = b + 1 + k, V = 'gcu:valve.' + idx + '.', ry = y + 44 + k * rowH;
      if (k > 0) E.push(ln(x + 12, ry - 6, x + w - 12, ry - 6, C.rowLine, 1));
      E.push(el('text', { x: x + 8, y: ry, w: 120, h: 44, tx: nm, size: 15, color: C.text, align: 'left', pad: 6, nm: nm,
        act: { a: 'valvewin', n: idx } }));
      E.push(el('rect', { x: x + 106, y: ry + 12, w: 20, h: 20, r: 3, fill: C.topBar, vis: cnd(V + 'local', '1'), nm: 'Значок М' }));
      E.push(el('text', { x: x + 106, y: ry + 12, w: 20, h: 20, tx: 'М', size: 14, bold: true, color: C.white, align: 'center', vis: cnd(V + 'local', '1') }));
      E.push(el('state', { x: x + 132, y: ry + 9, w: 92, h: 26, r: 3, tag: V + 'view', size: 13, ndt: '—', dtx: '?', nm: 'Состояние ' + nm,
        sts: VALVE_STATE.map((t, i) => ({ v: i, tx: t, f: valveCol[i], c: valveDark[i] ? C.text : C.white })),
        st: [{ c: cnd(V + 'view', '=', 4), p: { stroke: REPAIR_LINE } }] }));
      const can = { m: 'all', l: [{ tag: 'gcu:st.auto', op: '0', v: '' }, { tag: V + 'local', op: '0', v: '' }, { tag: V + 'fault', op: '0', v: '' }, { tag: V + 'repair', op: '0', v: '' }] };
      const why = 'Недоступно: в АВТОМАТЕ задвижкой управляет ГЦУ; в МЕСТНОМ, при аварии или в ремонте — управление закрыто';
      E.push(el('button', { x: x + 232, y: ry + 2, w: 46, h: 40, tx: 'ОТКР', size: 13, style: 'green', ac: cnd(V + 'opened', '1'), en: can, why: why,
        act: { a: 'valvecmd', n: idx, v: 1 }, nm: 'ОТКР ' + nm }));
      E.push(el('button', { x: x + 284, y: ry + 2, w: 46, h: 40, tx: 'ЗАКР', size: 13, style: 'blue', ac: cnd(V + 'closed', '1'), en: L.X.clone(can), why: why,
        act: { a: 'valvecmd', n: idx, v: 2 }, nm: 'ЗАКР ' + nm }));
    });
    // датчики гидроподпора
    const sy = y + 44 + 6 * rowH - 2;
    const S = 'gcu:seal.' + PN + '.';
    E.push(ln(x + 12, sy - 6, x + w - 12, sy - 6, C.rowLine, 1));
    E.push(T('Гидроподпор — датчики', x + 14, sy + 14, 15, C.text, 'left', true, 200));
    E.push(T('Давление', x + 14, sy + 42, 15, C.text2, 'left', false, 100));
    E.push(val(x + w - 14 - 140, sy + 42, 140, S + 'p', { dec: 2, unit: 'бар', ok: S + 'pOk', bad: 'недостоверно' }));
    E.push(T('Расход', x + 14, sy + 70, 15, C.text2, 'left', false, 100));
    E.push(val(x + w - 14 - 140, sy + 70, 140, S + 'f', { dec: 1, unit: 'м³/ч', ok: S + 'fOk', bad: 'недостоверно' }));
    dotRow(x + 22, sy + 98, S + 'hh', 'HH', 40);
    dotRow(x + 82, sy + 98, S + 'll', 'LL', 40);
    E.push(el('text', { x: x + 124, y: sy + 89, w: w - 136, h: 20, tx: 'защита: стоп насоса в АВТОМАТЕ', size: 12, color: C.text2, align: 'left', fit: true }));
    // основной / ремонт
    const by = y + h - 64;
    E.push(ln(x + 12, by - 10, x + w - 12, by - 10, C.rowLine, 1));
    E.push(T('Насос', x + 14, by + 22, 15, C.text2, 'left', false, 50));
    const dutyTag = 'gcuset:duty', repTag = 'gcuset:repair.' + (PN - 1);
    E.push(el('button', { x: x + 66, y: by, w: 120, h: 44, tx: 'СДЕЛАТЬ ОСН.', size: 14, style: 'blue', en: cnd(dutyTag, 'ok'),
      act: { a: 'write', tag: dutyTag, v: String(PN), cf: 'Сделать Н-' + PN + ' основным?', cm: 'Резервный насос включается по АВР.', log: 'Оператор: основной насос Н-' + PN },
      nm: 'Сделать основным' }));
    E.push(el('button', { x: x + 66, y: by, w: 120, h: 44, tx: 'ОСНОВНОЙ', size: 14, style: 'blue', ac: { m: 'all', l: [] }, vis: cnd(dutyTag, '=', PN), nm: 'Основной' }));
    const rw = w - 206;
    E.push(el('button', { x: x + 194, y: by, w: rw, h: 44, tx: 'ВЫВЕСТИ В РЕМОНТ', size: 14, style: 'blue', en: cnd(repTag, 'ok'),
      act: { a: 'write', tag: repTag, v: '1', cf: 'Вывести Н-' + PN + ' в ремонт?', cm: 'Насос не будет пускаться ни алгоритмом, ни АВР.', log: 'Оператор: Н-' + PN + ' выведен в ремонт' },
      vis: { m: 'any', l: [{ tag: repTag, op: '0', v: '' }, { tag: repTag, op: 'nd', v: '' }] }, nm: 'В ремонт' }));
    E.push(el('button', { x: x + 194, y: by, w: rw, h: 44, tx: 'ВВЕСТИ ИЗ РЕМОНТА', size: 14, style: 'blue', ac: { m: 'all', l: [] }, vis: cnd(repTag, '1'),
      act: { a: 'write', tag: repTag, v: '0', cf: 'Ввести Н-' + PN + ' из ремонта?', cm: 'Насос снова будет доступен для работы и АВР.', log: 'Оператор: Н-' + PN + ' введён из ремонта' }, nm: 'Из ремонта' }));
  }
  return E;
}

module.exports = function (L) {
  const L2 = mkLib('pu2_');
  return {
    screens: [
      Object.assign(L.screen('pu_s1', 'Насос Н-1', buildPump(L, 1)), { demoChip: [860, 60] }),
      Object.assign(L2.screen('pu_s2', 'Насос Н-2', buildPump(L2, 2)), { demoChip: [860, 60] })
    ],
    pops: [],
    dbs: []
  };
};
