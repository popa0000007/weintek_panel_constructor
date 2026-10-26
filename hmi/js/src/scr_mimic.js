// ================================================================ ЭКРАН: мнемосхема (окно 10/16)
function screenInfo() { return { name: 'mimic', diag: [14, 676], demoChip: [140, 676], noCommBar: true }; }
function screenInit() { }
function onDataUpdate() { }
function drawExtraPopup(p) { }
function drawScreen() {
  drawAlarmLine();
  drawTank();
  drawCyclones();
  drawPumpLine(1);
  drawPumpLine(2);
  drawPressure();
  drawControl();
  drawAir();
}
// ---------------------------------------------------------------- мнемосхема
function levelY(p) { return 637 - 444 * Math.max(0, Math.min(100, p)) / 100; }

function drawTank() {
  // подача пульпы
  text('Пульпа с МШР', 160, 108, 13, C.text2, 'center');
  line(160, 120, 160, 182, C.pulp, 2);
  poly([154, 180, 166, 180, 160, 189], C.pulp);
  // стенка и пустота
  fillRect(70, 190, 180, 450, C.tankIn);
  // пульпа
  if (!noData()) {
    const ly = levelY(S.level);
    fillRect(73, ly, 174, 637 - ly, S.st.levelOk || DEMO ? C.slurry : '#C9C2B8');
  }
  strokeRect(71.5, 191.5, 177, 447, C.tankWall, 3);
  // отметки
  const marks = [['HH', 95, C.alarmMark], ['H', 85, C.text2], ['L', 20, C.text2], ['LL', 10, C.alarmMark]];
  marks.forEach(function (m) {
    const y = levelY(m[1]);
    line(56, y, 70, y, m[2], 2);
    text(m[0] + ' ' + m[1], 53, y, 12, m[2], 'right', m[0].length === 2);
  });
  if (!noData()) {
    const sp = S.set.levelSP;
    if (isFinite(sp) && sp > 0 && sp < 100) {
      const y = levelY(sp);
      line(56, y, 70, y, C.ready, 2);
      text('SP ' + fmt(sp, 0), 53, y, 12, C.ready, 'right', true);
      line(74, y, 246, y, C.ready, 1.5, [6, 4]);
    }
  }
  // окно значения LT-1
  valueBox(95, 200, 130, 60, 'LT-1 · уровень', noData() ? '—' : fmt(S.level, 1), '%', !noData() && !S.st.levelOk && !DEMO);
}
function valueBox(x, y, w, h, title, val, unit, bad) {
  rrect(x, y, w, h, 4, C.white, bad ? C.alarm : C.panelBorder, bad ? 2 : 1);
  text(title, x + w / 2, y + 15, 12, C.text2, 'center');
  if (bad) { text('НЕДОСТОВЕРНО', x + w / 2, y + 41, 14, C.alarm, 'center', true); return; }
  text(val + ' ' + unit, x + w / 2, y + 41, 24, C.text, 'center', true);
}

function drawPumpLine(n) {
  const L = n === 1 ? 420 : 590;
  const b = (n - 1) * 6;           // 1 seal, 2 suct, 3 disch, 4 flush, 5 scour, 6 drain
  const p = S.pump[n];
  // вода
  hpipe(274, 422, L - 110, 3, C.water);
  text('тех. вода', 319, L - 122, 11, C.water, 'center');
  vpipe(274, L - 110, L - 3, 3, C.water);           // размывка — врезана в трубу всаса до задвижки всаса
  vpipe(364, L - 110, L - 3, 3, C.water);           // промывка
  vpipe(420, L - 110, L - 36, 3, C.water);          // гидроподпор
  // пульпа
  hpipe(250, 384, L, 6, C.pulp);                    // всас
  hpipe(456, 643, L, 6, C.pulp);                    // нагнетание
  vpipe(476, L + 3, L + 26, 3, C.pulp);             // дренаж
  // подписи
  text('разм.', 274, L - 122, 12, C.text2, 'center');
  text('пром.', 364, L - 122, 12, C.text2, 'center');
  text('г/п', 420, L - 122, 12, C.text2, 'center');
  text('всас', 324, L + 28, 12, C.text2, 'center');
  text('нагн.', 540, L - 26, 12, C.text2, 'center');
  text('дрен.', 496, L + 68, 12, C.text2, 'left');
  // задвижки
  valveObj(b + 5, 258, L - 84, true);    // размывка (вертикальная, на трубе всаса)
  valveObj(b + 4, 348, L - 84, true);    // промывка
  valveObj(b + 1, 404, L - 96, true);    // гидроподпор
  valveObj(b + 2, 300, L - 16, false);   // всас
  valveObj(b + 3, 516, L - 16, false);   // нагнетание
  valveObj(b + 6, 460, L + 26, true);    // дренаж
  // насос
  pumpSym(420, L, p.view);
  const dk = noData() || p.view === 0 || p.view === 4 || p.view === 5 || p.view === 3;
  text('Н-' + n, 412, L + 1, 15, dk ? C.text : C.white, 'center', true);
  hit(384, L - 36, 72, 72, function () { openPump(n); }, 'p' + n);
  // карточка насоса
  pumpCard(n, 480, L - 92);
  linePT(n, 506, L);
}
function pumpCard(n, x, y) {
  const p = S.pump[n];
  const col = noData() ? C.stop : [C.btnBorder, C.ready, C.run, C.alarm, C.repairLine, C.move][p.view] || C.btnBorder;
  rrect(x, y, 150, 56, 4, C.panel, C.panelBorder, 1);
  rrect(x + 1, y + 1, 6, 54, 2, col);
  text('Н-' + n + (p.duty && !noData() ? ' · осн.' : ''), x + 14, y + 15, 14, C.text, 'left', true);
  if (!noData() && S.activePump === n) { rrect(x + 104, y + 6, 40, 18, 3, C.ready); text('РАБ.', x + 124, y + 16, 11, C.white, 'center', true); }
  text(noData() ? '—' : (p.view === 5 ? (p.starting ? 'ПУСК' : 'ОСТАНОВ') : PUMP_STATE[p.view] || '?'), x + 14, y + 40, 13,
    p.view === 3 && !noData() ? C.alarm : C.text2, 'left', p.view === 3);
  text(noData() ? '—' : fmt(p.speed, 1) + ' %', x + 144, y + 40, 16, C.text, 'right', true);
  hit(x, y, 150, 56, function () { openPump(n); }, 'pc' + n);
}

function drawCyclones() {
  // слив
  hpipe(646, 994, 92, 3, C.pulp);
  text('Слив → сгущение', 994, 70, 13, C.text2, 'right');
  // коллектор и стояк
  vpipe(640, 297, 593, 6, C.pulp);
  hpipe(637, 1000, 300, 6, C.pulp);
  for (let k = 1; k <= 6; k++) {
    const c = 670 + 60 * (k - 1);
    const vi = 12 + k;
    const v = S.valve[vi];
    const rep = !noData() && (v.repair || S.set.repair[1 + k]);
    const br = rep ? C.branchOff : C.pulp;
    vpipe(c, 94, 111, 2, C.pulp);
    // подвод сбоку в верхнюю часть
    vpipe(c + 28, 119, 297, 4, br);
    hpipe(c + 20, c + 30, 121, 4, br);
    // конус
    poly([c - 23, 111, c + 23, 111, c + 7, 200, c - 7, 200], rep ? C.cycRepair : C.cycRun, rep ? C.repairLine : C.text, 1.5, rep ? [5, 3] : null);
    text('ГЦ-' + k, c, 124, 12, rep ? C.text : C.white, 'center', true);
    if (rep) text('РЕМ.', c, 150, 11, C.text, 'center', true);
    hit(c - 24, 108, 48, 96, function () { openValve(vi); }, 'cy' + k);
    valveObj(vi, c + 12, 226, true, c - 10);
  }
}
function drawPressure() {
  valueBox(480, 210, 130, 60, 'PT-1 · давление', noData() ? '—' : fmt(S.press, 2), 'бар', !noData() && !S.st.pressOk && !DEMO);
  line(610, 240, 652, 240, C.text2, 2);
  line(652, 240, 652, 297, C.text2, 2);
}

function drawControl() {
  const X = 656, Y = 330, W = 356, H = 370;
  rrect(X, Y, W, H, 4, C.panel, C.panelBorder, 1);
  const auto = S.st.auto, run = S.st.run, nd = noData();
  // Режим
  text('Режим', X + 12, 360, 16, C.text, 'left', true);
  button('bMan', 760, 338, 120, 44, 'РУЧНОЙ', { active: !nd && !auto, style: 'blue', enabled: !nd }, function () {
    if (!auto) return;
    confirm('Перевести ГЦУ в РУЧНОЙ режим?', 'Алгоритм перестанет управлять насосами и циклонами.', function () { cmdGcu(11); });
  });
  button('bAuto', 884, 338, 120, 44, 'АВТОМАТ', {
    active: !nd && auto, style: 'green', enabled: !nd && (auto || S.st.canAuto || DEMO),
    why: 'Нет условий для перевода в АВТОМАТ (задвижки в дистанции, нет аварий)'
  }, function () {
    if (auto) return;
    confirm('Перевести ГЦУ в АВТОМАТ?', 'Команды оператора задвижкам и ПЧ будут блокированы.', function () { cmdGcu(10); });
  });
  // Программа
  text('Программа', X + 12, 412, 16, C.text, 'left', true);
  button('bStart', 762, 390, 76, 44, 'ПУСК', { active: !nd && run, style: 'green', enabled: !nd && auto, why: 'Пуск программы — только в АВТОМАТЕ' }, function () {
    confirm('Запустить программу ГЦУ?', 'Насос и гидроциклоны будут включены по алгоритму.', function () { cmdGcu(1); });
  });
  button('bStop', 842, 390, 76, 44, 'СТОП', { enabled: !nd }, function () {
    confirm('Остановить программу ГЦУ?', 'Насос будет остановлен с промывкой и дренажом.', function () { cmdGcu(2); });
  });
  button('bReset', 922, 390, 82, 44, 'СБРОС', { enabled: !nd }, function () { cmdGcu(4); toast('Сброс аварий отправлен'); });
  line(X + 10, 442, X + W - 10, 442, C.rowLine, 1);
  // Давление -> насос
  text('Давление → насос', X + 12, 457, 15, C.text, 'left', true);
  row('Давление', X + 12, 480, W - 24, nd ? '—' : fmt(S.press, 2), 'бар');
  text('Задание', X + 12, 506, 15, C.text2, 'left');
  editBox('ePress', 878, 494, 122, 26, nd ? '—' : fmt(S.set.pressSP, 2), 'бар', function () {
    keypad('Уставка давления, бар', S.set.pressSP, 0.1, 2.5, 2, function (v) { setReal(0, v); });
  });
  row('Скорость насоса', X + 12, 532, W - 24, nd ? '—' : fmt(S.speedOut, 1), '%');
  line(X + 10, 548, X + W - 10, 548, C.rowLine, 1);
  // Уровень -> гидроциклоны
  text('Уровень → гидроциклоны', X + 12, 563, 15, C.text, 'left', true);
  row('Уровень', X + 12, 586, W - 24, nd ? '—' : fmt(S.level, 1), '%');
  text('Уставка', X + 12, 612, 15, C.text2, 'left');
  editBox('eLvl', 878, 600, 122, 26, nd ? '—' : fmt(S.set.levelSP, 1), '%', function () {
    keypad('Уставка уровня, %', S.set.levelSP, 5, 95, 1, function (v) { setReal(20, v); });
  });
  text('Зона ±', X + 12, 638, 15, C.text2, 'left');
  editBox('eHyst', 878, 626, 122, 26, nd ? '—' : fmt(S.set.hyst, 1), '%', function () {
    keypad('Зона нечувствительности ±, %', S.set.hyst, 0.5, 20, 1, function (v) { setReal(24, v); });
  });
  row('Открыто циклонов', X + 12, 664, W - 24, nd ? '—' : S.nCyc + ' из ' + S.set.nMax, '');
  // строка состояния
  rrect(X + 8, 676, W - 16, 20, 3, C.white, C.rowLine, 1);
  text('Рабочий: ' + (nd || !S.activePump ? '—' : 'Н-' + S.activePump), X + 16, 687, 13, C.text, 'left', true);
  const pm = !nd && S.st.permit;
  rrect(X + 168, 678, 172, 16, 3, nd ? C.stop : (pm ? C.run : C.alarm));
  text(nd ? 'МШР: —' : (pm ? 'МШР: РАЗРЕШЕНО' : 'МШР: ЗАПРЕЩЕНО'), X + 254, 687, 12, C.white, 'center', true);
}

// ---------------------------------------------------------------- давление в линии нагнетания насоса
// «Датчик давления линии 36.4 / 36.5» (%IW43 / %IW45, AI 15/16) — после насоса, до задвижки нагнетания. Только показ.
function linePT(n, x, L) {
  line(x, L + 3, x, L + 18, C.text2, 2);                        // отбор давления
  cv.beginPath(); cv.arc(x, L + 31, 13, 0, Math.PI * 2);
  cv.fillStyle = C.white; cv.fill(); cv.strokeStyle = C.text; cv.lineWidth = 1.5; cv.stroke();
  text('PT', x, L + 32, 11, C.text, 'center', true);
  const has = !noData() && S.hasLine, d = S.line[n], bad = has && !d.ok;
  rrect(x + 18, L + 19, 74, 24, 3, C.white, bad ? C.alarm : C.panelBorder, bad ? 2 : 1);
  if (bad) text('НЕДОСТ.', x + 55, L + 32, 12, C.alarm, 'center', true);
  else text(has ? fmt(d.p, 2) + ' бар' : '— бар', x + 88, L + 32, 14, has ? C.text : C.textDis, 'right', true);
}

// ---------------------------------------------------------------- давление воздуха пневматики ПМУ (только показ)
// На объекте (2026-10-24): «Датчик давления пульта» %IW39 (AI 17, AirPress[1]) — ПМУ циклонов;
// «Датчик давления пульта(1)» %IW77 (AI 18, AirPress[2]) — ПМУ насосов.
function drawAir() {
  const x = 262, y = 98, w = 206, h = 84;
  rrect(x, y, w, h, 4, C.panel, C.panelBorder, 1);
  text('Воздух пневматики ПМУ', x + 10, y + 15, 13, C.text, 'left', true);
  const has = !noData() && S.hasAir;
  [['ПМУ насосов', 2], ['ПМУ циклонов', 1]].forEach(function (r, i) {
    const yy = y + 40 + i * 28, d = S.air[r[1]], bad = has && !d.ok;
    if (i) line(x + 8, yy - 14, x + w - 8, yy - 14, C.rowLine, 1);
    text(r[0], x + 10, yy, 14, C.text2);
    if (bad) text('НЕДОСТ.', x + w - 10, yy, 13, C.alarm, 'right', true);
    else text(has ? fmt(d.p, 1) + ' бар' : '— бар', x + w - 10, yy, 15, has ? C.text : C.textDis, 'right', true);
  });
}
