// ================================================================ ЭКРАН: насос Н-1 / Н-2 (окна 11, 12)
// config: pump = 1 или 2 (Number). Остальные записи — как у мнемосхемы.
function screenInfo() { return { name: 'pump', demoChip: [860, 60] }; }
function screenInit() { }
function onDataUpdate() { }
function drawExtraPopup(p) { }
const PN = (cfg.pump === 2 || cfg.pump === '2') ? 2 : 1;
// единицы датчиков гидроподпора (можно переопределить в конфигурации: "sealPUnit", "sealFUnit")
const SEAL_P_UNIT = typeof cfg.sealPUnit === 'string' ? cfg.sealPUnit : 'бар';
const SEAL_F_UNIT = typeof cfg.sealFUnit === 'string' ? cfg.sealFUnit : 'м³/ч';

function panel(x, y, w, h, title, sub) {
  rrect(x, y, w, h, 4, C.panel, C.panelBorder, 1);
  text(title, x + 14, y + 22, 18, C.text, 'left', true);
  if (sub) { font(18, true); const tw = cv.measureText ? cv.measureText(title).width : title.length * 9; text(sub, x + 22 + tw, y + 23, 13, C.text2, 'left'); }
}
function dot(x, y, on, color) {
  cv.beginPath(); cv.arc(x, y, 7, 0, Math.PI * 2);
  cv.fillStyle = on ? (color || C.alarm) : C.white; cv.fill();
  cv.strokeStyle = on ? C.text : C.btnBorder; cv.lineWidth = 1.2; cv.stroke();
}
function chip(x, y, w, h, color, label, darkText, dashed) {
  rrect(x, y, w, h, 3, color, dashed ? C.repairLine : null, 1.5, dashed ? [4, 3] : null);
  textFit(label, x + w / 2, y + h / 2 + 1, w - 6, 13, darkText ? C.text : C.white, 'center', true);
}

function drawSequence(x, y, w, h) {
  const p = S.pump[PN], nd = noData(), st = S.set;
  panel(x, y, w, h, 'Насос Н-' + PN, 'последовательность');
  text('шаг ' + (nd ? '—' : p.step), x + w - 14, y + 23, 15, C.text, 'right', true);
  const startSteps = [[10, 'Гидроподпор'], [20, 'Размывка зумпфа'], [25, 'Размыв ' + st.tScour + ' с'], [30, 'Промывка, нагнет.'],
    [40, 'Пуск, малая скор.'], [45, 'Промывка ' + st.tFlushStart + ' с'], [50, 'Открыть всас'], [60, 'Закрыть промывку'], [100, 'РАБОТА']];
  const stopSteps = [[200, 'Малая скорость'], [210, 'Открыть промывку'], [220, 'Закрыть всас'], [230, 'Промывка ' + st.tFlushStop + ' с'],
    [240, 'Стоп насоса'], [250, 'Закрыть, дренаж'], [260, 'Дренаж ' + st.tDrain + ' с'], [270, 'Закрыть дренаж'], [280, 'Закрыть г/п'],
    [900, 'Аварийный стоп'], [910, 'Аварийный дренаж'], [920, 'Выдержка г/п']];
  const colW = (w - 28) / 2;
  text('ПУСК', x + 14, y + 52, 13, C.text, 'left', true);
  text('ОСТАНОВ', x + 14 + colW + 4, y + 52, 13, C.text, 'left', true);
  const stepRow = function (s, cx, cy) {
    const cur = !nd && p.step === s[0];
    const red = s[0] >= 900;
    if (cur) rrect(cx - 4, cy - 12, colW - 2, 25, 3, red ? C.alarm : C.run);
    text(s[0], cx + 26, cy + 1, 13, cur ? C.white : (red ? C.alarm : C.text), 'right', true);
    textFit(s[1], cx + 34, cy + 1, colW - 42, 13, cur ? C.white : (red ? C.alarm : C.text2), 'left', cur);
  };
  startSteps.forEach(function (s, i) { stepRow(s, x + 14, y + 80 + i * 30); });
  stopSteps.forEach(function (s, i) { stepRow(s, x + 18 + colW, y + 80 + i * 30); });
  // нижний блок
  const by = y + h - 96;
  rrect(x + 12, by, w - 24, 84, 4, C.white, C.panelBorder, 1);
  const fc = nd ? 0 : p.faultCode;
  text('Код аварии: ', x + 24, by + 20, 14, C.text2);
  textFit(nd ? '—' : (fc ? fc + ' — ' + (FAULT_TEXT[fc] || '?') : '0 — нет'), x + 108, by + 20, w - 136, 14, fc ? C.alarm : C.text, 'left', true);
  text('Шаг: ', x + 24, by + 44, 14, C.text2);
  textFit(nd ? '—' : (STEP_TEXT[p.step] || '—'), x + 62, by + 44, w - 90, 14, C.text, 'left', true);
  text('ГЦУ: ', x + 24, by + 68, 14, C.text2);
  text(nd ? '—' : (S.st.auto ? 'АВТОМАТ' : 'РУЧНОЙ') + (S.st.run ? ' · программа РАБОТА' : ' · программа СТОП'), x + 62, by + 68, 14,
    S.st.auto ? C.run : C.ready, 'left', true);
}

function drawDrive(x, y, w, h) {
  const p = S.pump[PN], nd = noData();
  panel(x, y, w, h, 'Частотник', 'Danfoss · Profibus');
  const col = nd ? C.stop : [C.stop, C.ready, C.run, C.alarm, C.repairFill, C.move][p.view] || C.stop;
  const lbl = nd ? 'НЕТ ДАННЫХ' : (p.view === 5 ? (p.starting ? 'ПУСК' : 'ОСТАНОВ') : PUMP_STATE[p.view] || '?');
  statePlate(x + 12, y + 42, w - 24, 40, col, lbl, nd || p.view === 0 || p.view === 4 || p.view === 5, p.view === 4);
  let yy = y + 106;
  const r = function (l, v, c) { row(l, x + 14, yy, w - 28, v, '', c); yy += 28; };
  r('Управление', nd ? '—' : (p.remote ? 'Дистанция' : 'Местное'), p.remote ? null : C.move);
  r('Состояние ПЧ', nd ? '—' : (DRV_TEXT[p.drv] || ('код ' + p.drv)));
  r('Задание', nd ? '—' : fmt(p.speed, 1) + ' %');
  const ln = S.line[PN];
  r('Давление нагнетания', nd || !S.hasLine ? '—' : (ln.ok ? fmt(ln.p, 2) + ' бар' : 'недостоверно'), !nd && S.hasLine && !ln.ok ? C.alarm : null);
  const ar = S.air[2];   // ПМУ насосов — AirPress[2] (AI 18, %IW77): так подтверждено на объекте
  r('Воздух ПМУ насосов', nd || !S.hasAir ? '—' : (ar.ok ? fmt(ar.p, 1) + ' бар' : 'недостоверно'), !nd && S.hasAir && !ar.ok ? C.alarm : null);
  r('Пусков', nd ? '—' : String(p.starts));
  r('Роль', nd ? '—' : (p.duty ? 'основной' : 'резервный') + (S.activePump === PN ? ' · рабочий' : ''));
  // ручное задание
  yy += 6;
  const man = !nd && !S.st.auto;
  text('Ручное задание', x + 14, yy + 15, 15, C.text2);
  editBox('eMan', x + w - 14 - 120, yy, 120, 30, nd ? '—' : fmt(S.manSpeed[PN], 1), '%', function () {
    keypad('Н-' + PN + ': ручное задание скорости, %', S.manSpeed[PN], 0, 100, 1, function (v) { setManSpeed(PN, v); });
  }, man);
  yy += 46;
  const why = nd ? 'Нет данных от ПЛК' : 'Пуск и стоп насоса — только в РУЧНОМ режиме';
  const bw = (w - 24 - 16) / 3;
  button('pStart', x + 12, yy, bw, 46, 'ПУСК', { enabled: man, why: why }, function () {
    confirm('Пустить насос Н-' + PN + '?', 'Проверьте положение задвижек линии.', function () { cmdPump(PN, 1); logEvent('Оператор: пуск Н-' + PN); });
  });
  button('pStop', x + 20 + bw, yy, bw, 46, 'СТОП', { enabled: man, why: why }, function () {
    confirm('Остановить насос Н-' + PN + '?', '', function () { cmdPump(PN, 2); logEvent('Оператор: стоп Н-' + PN); });
  });
  button('pReset', x + 28 + 2 * bw, yy, bw, 46, 'СБРОС', { enabled: !nd }, function () { cmdPump(PN, 4); logEvent('Оператор: сброс аварий линии Н-' + PN); toast('Сброс аварий линии Н-' + PN + ' отправлен'); });
  yy += 58;
  text('Пуск и стоп с панели — только в режиме РУЧНОЙ', x + 14, yy, 12, C.text2);
  yy += 26;
  const f = [[p.fltDrive, 'Авария ПЧ'], [p.fltComm, 'Связь DP'], [p.fltStart, 'Не запустился'], [p.fltStop, 'Не остановился'],
    [p.fltUnxStart, 'Самопр. пуск'], [p.fltUnxStop, 'Самопр. стоп']];
  f.forEach(function (q, i) {
    const cx = x + 22 + (i % 2) * ((w - 28) / 2), cy = yy + Math.floor(i / 2) * 26;
    dot(cx, cy, !nd && q[0]);
    text(q[1], cx + 14, cy + 1, 14, !nd && q[0] ? C.alarm : C.text2, 'left', !nd && q[0]);
  });
}

function drawValves(x, y, w, h) {
  const nd = noData(), b = (PN - 1) * 6;
  panel(x, y, w, h, 'Задвижки развязки');
  const names = ['Гидроподпор', 'Всас', 'Нагнетание', 'Промывка', 'Размывка', 'Дренаж'];
  const rowH = 62;
  names.forEach(function (nm, k) {
    const idx = b + 1 + k, v = S.valve[idx];
    const ry = y + 44 + k * rowH;
    if (k > 0) line(x + 12, ry - 6, x + w - 12, ry - 6, C.rowLine, 1);
    // название — нажатие открывает окно задвижки
    const id = 'vn' + k;
    if (ui.press === id) rrect(x + 8, ry, 120, 44, 3, C.btnPressed);
    text(nm, x + 14, ry + 22, 15, C.text, 'left');
    hit(x + 8, ry, 120, 44, function () { openValve(idx); }, id);
    if (!nd && v.local) localBadge(x + 106, ry + 12);
    const col = nd ? C.stop : valveCol(v.view);
    chip(x + 132, ry + 9, 92, 26, col, nd ? '—' : (VALVE_STATE[v.view] || '?'), nd || v.view === 0 || v.view === 2 || v.view === 4 || v.view === 5, v.view === 4);
    const can = !nd && !S.st.auto && !v.local && !v.fault && !v.repair;
    const why = nd ? 'Нет данных' : (S.st.auto ? 'В АВТОМАТЕ задвижкой управляет ГЦУ' : (v.local ? 'Задвижка в МЕСТНОМ' : (v.fault ? 'Сначала сбросьте аварию (имя задвижки → окно)' : 'Недоступно')));
    button('vo' + k, x + 232, ry + 2, 46, 40, 'ОТКР', { enabled: can, why: why, size: 13, active: !nd && v.opened, style: 'green' }, function () { cmdValve(idx, 1); });
    button('vc' + k, x + 284, ry + 2, 46, 40, 'ЗАКР', { enabled: can, why: why, size: 13, active: !nd && v.closed, style: 'blue' }, function () { cmdValve(idx, 2); });
  });
  // датчики гидроподпора (AI 7/8 — давление, AI 9/10 — расход)
  const sy = y + 44 + 6 * rowH - 2;
  line(x + 12, sy - 6, x + w - 12, sy - 6, C.rowLine, 1);
  const sl = S.seal[PN], sk = !nd && S.hasSeal;
  text('Гидроподпор — датчики', x + 14, sy + 14, 15, C.text, 'left', true);
  row('Давление', x + 14, sy + 42, w - 28, sk ? (sl.pOk ? fmt(sl.p, 2) : 'недостоверно') : '—', sk && sl.pOk ? SEAL_P_UNIT : '', sk && !sl.pOk ? C.alarm : null);
  row('Расход', x + 14, sy + 70, w - 28, sk ? (sl.fOk ? fmt(sl.f, 1) : 'недостоверно') : '—', sk && sl.fOk ? SEAL_F_UNIT : '', sk && !sl.fOk ? C.alarm : null);
  dot(x + 22, sy + 98, sk && sl.hh);
  text('HH', x + 34, sy + 99, 14, sk && sl.hh ? C.alarm : C.text2, 'left', sk && sl.hh);
  dot(x + 82, sy + 98, sk && sl.ll);
  text('LL', x + 94, sy + 99, 14, sk && sl.ll ? C.alarm : C.text2, 'left', sk && sl.ll);
  textFit('защита: стоп насоса в АВТОМАТЕ', x + 124, sy + 99, w - 136, 12, C.text2, 'left');
  // насос: основной / ремонт
  const by = y + h - 64;
  line(x + 12, by - 10, x + w - 12, by - 10, C.rowLine, 1);
  const duty = !nd && S.set.duty === PN, rep = !nd && S.set.repair[PN - 1];
  text('Насос', x + 14, by + 22, 15, C.text2);
  button('bDuty', x + 66, by, 120, 44, duty ? 'ОСНОВНОЙ' : 'СДЕЛАТЬ ОСН.', { enabled: !nd, active: duty, style: 'blue', size: 14 }, function () {
    if (duty) return;
    confirm('Сделать Н-' + PN + ' основным?', 'Резервный насос включается по АВР.', function () { setI16(42, PN); logEvent('Оператор: основной насос Н-' + PN); });
  });
  button('bRep', x + 194, by, w - 206, 44, rep ? 'ВВЕСТИ ИЗ РЕМОНТА' : 'ВЫВЕСТИ В РЕМОНТ', { enabled: !nd, active: rep, style: 'blue', size: 14 }, function () {
    confirm(rep ? 'Ввести Н-' + PN + ' из ремонта?' : 'Вывести Н-' + PN + ' в ремонт?',
      rep ? 'Насос снова будет доступен для работы и АВР.' : 'Насос не будет пускаться ни алгоритмом, ни АВР.',
      function () { setRepair(PN - 1, !rep); logEvent('Оператор: Н-' + PN + (rep ? ' введён из ремонта' : ' выведен в ремонт')); });
  });
}

function drawScreen() {
  drawSequence(12, 58, 330, 646);
  drawDrive(352, 58, 318, 646);
  drawValves(680, 58, 332, 646);
}
