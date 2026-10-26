// ================================================================ ЭКРАН: трёхструйный пульподелитель (окно 18)
// Задвижка №1 -> ЗУМПФ мельницы 1; №2 и №3 -> ЗУМПФ мельниц 2 и 3.
// Кнопки ОТКРЫВАТЬ / ЗАКРЫВАТЬ действуют, пока нажаты: панель каждые 200 мс пишет [Cmd, Alive] в DB103 HMI_PD.
// Отпустили кнопку (или пропала связь дольше 0,7 с) — ПЛК снимает выход. Степень открытия оператор видит по месту.
// config (дополнительно): pdSub — Подписка DBn 1030000 длина 10; pdAddr — Адрес DBn 1030000; pin (для изменения JogMax).
function screenInfo() { return { name: 'pd', demoChip: [600, 62] }; }
const PD_WORDS = 10;
let pdW = new Array(PD_WORDS).fill(0), hasPd = false;
const jog = { code: 0, timer: null, alive: Math.floor(Math.random() * 1000) };
const PD_NAMES = ['', 'Задвижка №1', 'Задвижка №2', 'Задвижка №3'];
const PD_DEST = ['', 'ЗУМПФ мельницы 1', 'ЗУМПФ мельниц 2 и 3', 'ЗУМПФ мельниц 2 и 3'];

function pv(n) {
  const o = 8 + (n - 1) * 4;
  return {
    opened: bitOf(pdW, o, 0), closed: bitOf(pdW, o, 1), opening: bitOf(pdW, o, 2), closing: bitOf(pdW, o, 3),
    middle: bitOf(pdW, o, 4), fltLimits: bitOf(pdW, o, 5), fltTimeout: bitOf(pdW, o, 6), fltSignal: bitOf(pdW, o, 7),
    jogTime: i16(pdW, o + 2) / 10
  };
}
function pdOk() { return DEMO || hasPd; }
function jogMax() { return i16(pdW, 4); }

// ---------------------------------------------------------------- толчковое управление
function jogSend() {
  jog.alive = (jog.alive + 1) & 0x7FFF;
  if (DEMO) { demoPd.cmd = jog.code; demoPd.seen = Date.now(); return; }
  write(cfg.pdAddr, [jog.code, jog.alive], 'pdAddr');
}
function jogStart(code) {
  if (jog.timer) clearInterval(jog.timer);
  jog.code = code;
  jogSend();
  jog.timer = setInterval(jogSend, 200);
  req();
}
function jogStop() {
  if (jog.timer) { clearInterval(jog.timer); jog.timer = null; }
  if (jog.code) {
    const c = jog.code;
    jog.code = 0;
    jogSend();
    logEvent('Пульподелитель: ' + PD_NAMES[c % 10] + (c < 20 ? ' — открытие' : ' — закрытие') + ' (толчок)');
  }
  req();
}

function screenInit() {
  if (!DEMO && cfg.pdSub) {
    const onPd = function (err, data) {
      if (err) { commErr = err.message || String(err); req(); return; }
      pdW = wordsFrom(data, PD_WORDS); hasPd = true; req();
    };
    cfg.pdSub.onResponse(onPd);
    if (cfg.pdSub.latestData) onPd(undefined, cfg.pdSub.latestData);
  } else {
    // без подписки: опрос DB103 через Адрес pdAddr каждые 0,25 с
    poll(cfg.pdAddr, PD_WORDS, 250, function (w) { pdW = w; hasPd = true; req(); }, function () { req(); });
  }
  if (DEMO) { putI16(pdW, 4, 30); setInterval(demoPdTick, 100); }
}
function onDataUpdate() { }
function drawExtraPopup(p) { }

// ---------------------------------------------------------------- схема
function pdColor(v) {
  if (!pdOk()) return [C.stop, C.repairLine, true];
  if (v.fltLimits || v.fltSignal || v.fltTimeout) return [C.alarm, C.text, false];
  if (v.opening || v.closing) return [ui.blink ? C.move : '#F2D27A', C.text, false];
  if (v.opened) return [C.run, C.text, false];
  if (v.closed) return [C.stop, C.text, false];
  return ['#9CC3E4', C.text, false];        // промежуточное положение
}
function pdState(v) {
  if (!pdOk()) return 'НЕТ ДАННЫХ';
  if (v.fltSignal) return 'НЕДОСТОВЕРНО';
  if (v.fltLimits) return 'ОБА КОНЦЕВИКА';
  if (v.opening) return 'ОТКРЫВАЕТСЯ…';
  if (v.closing) return 'ЗАКРЫВАЕТСЯ…';
  if (v.fltTimeout) return 'СТОП ПО ВРЕМЕНИ';
  if (v.opened) return 'ОТКРЫТА';
  if (v.closed) return 'ЗАКРЫТА';
  return 'ПРОМЕЖУТОЧНОЕ';
}
function pdValve(n, cx, y) {
  const v = pv(n), c = pdColor(v);
  const dash = c[2] ? [5, 3] : null;
  poly([cx - 16, y, cx + 16, y, cx, y + 24], c[0], c[1], 1.6, dash);
  poly([cx - 16, y + 48, cx + 16, y + 48, cx, y + 24], c[0], c[1], 1.6, dash);
  text('№' + n, cx + 24, y + 24, 15, C.text, 'left', true);
}
function drawScheme() {
  rrect(12, 104, 500, 600, 4, C.panel, C.panelBorder, 1);
  text('Схема', 26, 128, 17, C.text, 'left', true);
  // питание
  text('Питание пульподелителя', 262, 152, 13, C.text2, 'center');
  vpipe(262, 164, 206, 8, C.pulp);
  poly([254, 200, 270, 200, 262, 210], C.pulp);
  // корпус делителя
  poly([150, 212, 374, 212, 340, 282, 184, 282], '#D9D6CF', C.tankWall, 2.5);
  text('Пульподелитель', 262, 236, 15, C.text, 'center', true);
  text('трёхструйный', 262, 258, 13, C.text2, 'center');
  const xs = [0, 192, 262, 332];
  for (let n = 1; n <= 3; n++) {
    const x = xs[n], v = pv(n);
    const flow = pdOk() && !v.closed;
    vpipe(x, 282, 352, 6, C.pulp);
    pdValve(n, x, 352);
    vpipe(x, 400, n === 1 ? 452 : 480, 6, flow ? C.pulp : C.branchOff);
  }
  // №1 -> зумпф 1
  const f1 = pdOk() && !pv(1).closed ? C.pulp : C.branchOff;
  hpipe(110, 195, 452, 6, f1);
  vpipe(110, 449, 478, 6, f1);
  // №2, №3 -> общий коллектор -> зумпф 2,3
  const f23 = pdOk() && (!pv(2).closed || !pv(3).closed);
  hpipe(259, 335, 480, 6, f23 ? C.pulp : C.branchOff);
  vpipe(380, 480, 600, 6, f23 ? C.pulp : C.branchOff);
  hpipe(332, 383, 480, 6, f23 ? C.pulp : C.branchOff);
  const zumpf = function (x, y, w, title, sub) {
    fillRect(x, y, w, 80, C.tankIn);
    fillRect(x + 3, y + 40, w - 6, 37, C.slurry);
    strokeRect(x + 1.5, y + 1.5, w - 3, 77, C.tankWall, 3);
    text(title, x + w / 2, y + 18, 14, C.text, 'center', true);
    text(sub, x + w / 2, y + 58, 12, C.white, 'center', true);
  };
  zumpf1();
  zumpf(300, 604, 170, 'ЗУМПФ', 'мельницы 2 и 3');
  text('Степень открытия — визуально по месту, задвижки управляются толчками', 26, 694, 12, C.text2, 'left');
}

// ---------------------------------------------------------------- зумпф мельницы 1 — мини-версия с уровнем (LT-1, AI 1)
function lvlState() {
  const nd = noData(), ok = nd ? false : (S.st.levelOk || DEMO);
  const hh = !nd && S.alm[2], ll = !nd && S.alm[5];
  return { nd: nd, ok: ok, lvl: Math.max(0, Math.min(100, S.level || 0)), alarm: hh || ll, hh: hh, ll: ll };
}
// уменьшенная копия зумпфа с мнемосхемы — шкала HH/H/SP/L/LL, окно LT-1
function zumpf1() {
  const x = 46, y = 478, w = 128, h = 206, L = lvlState();
  const ly = function (v) { return y + h - 4 - (h - 8) * v / 100; };
  fillRect(x, y, w, h, C.tankIn);
  if (!L.nd) fillRect(x + 3, ly(L.lvl), w - 6, y + h - 3 - ly(L.lvl), L.ok ? C.slurry : '#C9C2B8');
  strokeRect(x + 1.5, y + 1.5, w - 3, h - 3, C.tankWall, 3);
  [['HH', 95, C.alarmMark], ['H', 85, C.text2], ['L', 20, C.text2], ['LL', 10, C.alarmMark]].forEach(function (m) {
    const yy = ly(m[1]);
    line(36, yy, x, yy, m[2], 2);
    text(m[0], 33, yy, 11, m[2], 'right', m[0].length === 2);
  });
  const sp = S.set.levelSP;
  if (!L.nd && isFinite(sp) && sp > 0 && sp < 100) {
    const yy = ly(sp);
    line(36, yy, x, yy, C.ready, 2);
    line(x + 4, yy, x + w - 4, yy, C.ready, 1.5, [6, 4]);
    text('SP', 33, yy, 11, C.ready, 'right', true);
  }
  const bad = !L.nd && !L.ok;
  rrect(x + 12, y + 6, w - 24, 44, 4, C.white, bad || L.alarm ? C.alarm : C.panelBorder, bad || L.alarm ? 2 : 1);
  text('LT-1 · уровень', x + w / 2, y + 17, 11, C.text2, 'center');
  if (bad) text('НЕДОСТ.', x + w / 2, y + 37, 15, C.alarm, 'center', true);
  else text(L.nd ? '— %' : fmt(L.lvl, 1) + ' %', x + w / 2, y + 37, 20, L.alarm ? C.alarm : C.text, 'center', true);
  text('ЗУМПФ', x + w + 12, y + h - 40, 14, C.text, 'left', true);
  text('мельница 1', x + w + 12, y + h - 20, 12, C.text2, 'left');
  if (L.hh || L.ll) text(L.hh ? 'уровень HH' : 'уровень LL', x + w + 12, y + h - 62, 12, C.alarm, 'left', true);
}
// ---------------------------------------------------------------- карточки управления
function drawCard(n, x, y, w, h) {
  const v = pv(n), ok = pdOk();
  rrect(x, y, w, h, 4, C.panel, C.panelBorder, 1);
  text(PD_NAMES[n], x + 14, y + 22, 18, C.text, 'left', true);
  text('→ ' + PD_DEST[n], x + 140, y + 23, 14, C.text2, 'left');
  const c = pdColor(v);
  rrect(x + 14, y + 40, 176, 32, 4, c[0], c[2] ? C.repairLine : null, 1.5, c[2] ? [5, 3] : null);
  textFit(pdState(v), x + 102, y + 57, 168, 15, (c[0] === C.run || c[0] === C.alarm) ? C.white : C.text, 'center', true);
  // концевики
  const lim = function (ly, on, label) {
    cv.beginPath(); cv.arc(x + 22, ly, 7, 0, Math.PI * 2);
    cv.fillStyle = ok && on ? C.run : C.white; cv.fill(); cv.strokeStyle = C.btnBorder; cv.lineWidth = 1.2; cv.stroke();
    text(label, x + 36, ly + 1, 13, C.text2);
  };
  lim(y + 90, v.opened, 'концевик ОТКРЫТА');
  lim(y + 112, v.closed, 'концевик ЗАКРЫТА');
  const moving = ok && (v.opening || v.closing);
  text(moving ? 'Движение: ' + fmt(v.jogTime, 1) + ' с' : (v.fltTimeout ? 'Отпустите кнопку' : ''), x + 14, y + 134, 13, v.fltTimeout ? C.alarm : C.text, 'left', true);
  // кнопки «пока нажата»
  const bx = x + w - 2 * 136 - 22, by = y + 40;
  const whyO = !ok ? 'Нет данных от ПЛК' : (v.opened ? 'Задвижка уже открыта (концевик)' : (v.fltSignal ? 'Недостоверный сигнал концевика' : 'Оба концевика сработали — неисправность'));
  const canO = ok && !v.opened && !v.fltSignal && !v.fltLimits;
  const whyC = !ok ? 'Нет данных от ПЛК' : (v.closed ? 'Задвижка уже закрыта (концевик)' : (v.fltSignal ? 'Недостоверный сигнал концевика' : 'Оба концевика сработали — неисправность'));
  const canC = ok && !v.closed && !v.fltSignal && !v.fltLimits;
  holdButton('ho' + n, bx, by, 132, 98, '▲ ОТКРЫВАТЬ', { enabled: canO, why: whyO, active: jog.code === 10 + n, style: 'green', size: 18 },
    function () { jogStart(10 + n); }, jogStop);
  holdButton('hc' + n, bx + 140, by, 132, 98, '▼ ЗАКРЫВАТЬ', { enabled: canC, why: whyC, active: jog.code === 20 + n, style: 'blue', size: 18 },
    function () { jogStart(20 + n); }, jogStop);
}

function drawScreen() {
  text('Пульподелитель трёхструйный', 16, 78, 22, C.text, 'left', true);
  accessButton(890, 62);
  drawScheme();
  for (let n = 1; n <= 3; n++) drawCard(n, 524, 104 + (n - 1) * 160, 488, 150);
  // настройка
  const y = 588;
  rrect(524, y, 488, 116, 4, C.panel, C.panelBorder, 1);
  text('Кнопка действует, пока нажата. Отпустили — задвижка остановилась.', 538, y + 22, 14, C.text);
  text('Задвижка сама остановится на концевике и через', 538, y + 46, 13, C.text2);
  text('макс. время непрерывного движения:', 538, y + 66, 13, C.text2);
  editBox('eJog', 796, y + 52, 100, 30, pdOk() ? String(jogMax()) : '—', 'с', function () {
    withAccess(function () {
      keypad('Пульподелитель: макс. непрерывное движение, с', jogMax(), 1, 600, 0, function (v) {
        if (DEMO) { putI16(pdW, 4, v); return; }
        jog.alive = (jog.alive + 1) & 0x7FFF;
        write(cfg.pdAddr, [0, jog.alive, v], 'pdAddr');
      });
    });
  }, pdOk() && !jog.code);
  if (!DEMO && !cfg.pdSub && !cfg.pdAddr) text('В Config нет pdAddr (DB103)', 538, y + 96, 13, C.alarm, 'left', true);
  else if (!pdOk()) text('Нет данных от ПЛК (DB103 HMI_PD)', 538, y + 96, 13, C.alarm, 'left', true);
}

// ---------------------------------------------------------------- демо: модель положения задвижек
const demoPd = { cmd: 0, seen: 0, pos: [0, 100, 35, 0], lock: [0, 0, 0, 0], t: [0, 0, 0, 0] };
function demoPdTick() {
  if (Date.now() - demoPd.seen > 700) demoPd.cmd = 0;
  for (let n = 1; n <= 3; n++) {
    const o = 8 + (n - 1) * 4;
    let p = demoPd.pos[n];
    const wo = demoPd.cmd === 10 + n && p < 100, wc = demoPd.cmd === 20 + n && p > 0;
    if (demoPd.cmd !== 10 + n && demoPd.cmd !== 20 + n) demoPd.lock[n] = 0;
    const run = (wo || wc) && !demoPd.lock[n];
    demoPd.t[n] = run ? demoPd.t[n] + 0.1 : 0;
    if (demoPd.t[n] > jogMax()) { demoPd.lock[n] = 1; }
    if (run && !demoPd.lock[n]) p = Math.max(0, Math.min(100, p + (wo ? 1.5 : -1.5)));
    demoPd.pos[n] = p;
    putBit(pdW, o, 0, p >= 100); putBit(pdW, o, 1, p <= 0); putBit(pdW, o, 2, run && wo && !demoPd.lock[n]); putBit(pdW, o, 3, run && wc && !demoPd.lock[n]);
    putBit(pdW, o, 4, p > 0 && p < 100); putBit(pdW, o, 6, !!demoPd.lock[n]);
    putI16(pdW, o + 2, Math.round(demoPd.t[n] * 10));
  }
  req();
}
