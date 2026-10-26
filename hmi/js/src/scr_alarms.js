// ================================================================ ЭКРАН: аварии и журнал (окно 14)
// Активные тревоги — из DB100 (как строка аварий мнемосхемы). Время появления и журнал — из общего хранилища,
// которое ведёт регистратор gcu_recorder.js в общем окне 4. Без регистратора журнал ведётся только пока открыто это окно.
function screenInfo() { return { name: 'alarms', demoChip: [600, 62] }; }
const view = { tab: 'act', page: 0 };
const localSeen = {};
function screenInit() { }
function onDataUpdate() { }
function drawExtraPopup(p) { }

function activeRows() {
  const act = storeGet(ACT_KEY, null);
  const list = alarmList();
  return list.map(function (a) {
    let t = 0, ack = false;
    if (act && act[a.t]) { t = act[a.t].t; ack = !!act[a.t].ack; }
    else { if (!localSeen[a.t]) localSeen[a.t] = Date.now(); t = localSeen[a.t]; ack = !!localSeen['ack:' + a.t]; }
    return { t: t, c: a.c, x: a.t, s: ack ? 'Квитировано' : 'Активно', ack: ack };
  }).sort(function (p, q) { return q.t - p.t; });
}
function journalRows() {
  const st = { on: 'Появилось', off: 'Ушло', ack: 'Квитировано', evt: '—' };
  return storeGet(LOG_KEY, []).map(function (e) { return { t: e.t, c: e.c, x: e.x, s: st[e.s] || '—', ack: true }; });
}
function ackAll() {
  const act = storeGet(ACT_KEY, null);
  if (act) { Object.keys(act).forEach(function (k) { act[k].ack = true; }); storeSet(ACT_KEY, act); }
  alarmList().forEach(function (a) { localSeen['ack:' + a.t] = true; });
  logEvent('Оператор: квитирование', 'E', 'ack');
  if (!noData()) cmdGcu(8);   // ПЛК: выключить звуковую сигнализацию (свет горит, пока есть авария)
  toast('Тревоги квитированы');
}

function drawScreen() {
  const nd = noData();
  text('Аварии и события', 16, 78, 22, C.text, 'left', true);
  const act = activeRows();
  button('tAct', 250, 60, 150, 36, 'АКТИВНЫЕ · ' + act.length, { active: view.tab === 'act', style: 'blue', size: 15 }, function () { view.tab = 'act'; view.page = 0; });
  button('tLog', 408, 60, 130, 36, 'ЖУРНАЛ', { active: view.tab === 'log', style: 'blue', size: 15 }, function () { view.tab = 'log'; view.page = 0; });
  // легенда
  fillRect(790, 72, 10, 10, C.alarm); text('авария', 804, 78, 13, C.text2);
  fillRect(856, 72, 10, 10, C.move); text('предупр.', 870, 78, 13, C.text2);
  fillRect(934, 72, 10, 10, C.btnBorder); text('событие', 948, 78, 13, C.text2);

  const rows = view.tab === 'act' ? act : journalRows();
  const per = 13, pages = Math.max(1, Math.ceil(rows.length / per));
  if (view.page >= pages) view.page = pages - 1;
  // таблица
  const X = 12, Y = 106, W = 1000, RH = 38;
  rrect(X, Y, W, 36 + per * RH, 4, C.white, C.panelBorder, 1);
  fillRect(X + 1, Y + 1, W - 2, 34, C.panel);
  const cols = [[X + 20, 'Время'], [X + 160, 'Тип'], [X + 270, 'Состояние'], [X + 420, 'Сообщение']];
  cols.forEach(function (c) { text(c[1], c[0], Y + 18, 14, C.text2, 'left', true); });
  if (!rows.length) text(view.tab === 'act' ? (nd ? 'Нет данных от ПЛК' : 'Активных аварий и предупреждений нет') : 'Журнал пуст', X + W / 2, Y + 36 + 3 * RH, 16, C.text2, 'center');
  for (let r = 0; r < per; r++) {
    const e = rows[view.page * per + r];
    if (!e) break;
    const ry = Y + 36 + r * RH;
    const active = view.tab === 'act';
    const unack = active && !e.ack;
    if (active && e.c === 'W') fillRect(X + 1, ry, W - 2, RH, C.warnRow);
    if (r > 0) line(X + 1, ry, X + W - 1, ry, C.rowLine, 1);
    const bar = e.c === 'A' ? C.alarm : (e.c === 'W' ? C.move : C.btnBorder);
    if (!(unack && !ui.blink)) fillRect(X + 1, ry + 1, 6, RH - 1, bar);
    text(fmtTime(e.t, true), cols[0][0], ry + RH / 2 + 1, 14, C.text, 'left', unack);
    text(e.c === 'A' ? 'Авария' : (e.c === 'W' ? 'Предупр.' : 'Событие'), cols[1][0], ry + RH / 2 + 1, 14, e.c === 'A' ? C.alarm : C.text, 'left', unack);
    text(e.s, cols[2][0], ry + RH / 2 + 1, 14, C.text2, 'left');
    textFit(e.x, cols[3][0], ry + RH / 2 + 1, X + W - cols[3][0] - 12, 15, e.c === 'A' && active ? C.alarm : C.text, 'left', unack || (active && e.c === 'A'));
  }
  // низ
  const by = 646;
  button('pUp', 12, by, 70, 52, '▲', { size: 22, enabled: view.page > 0 }, function () { view.page--; });
  button('pDn', 90, by, 70, 52, '▼', { size: 22, enabled: view.page < pages - 1 }, function () { view.page++; });
  text('стр. ' + (view.page + 1) + ' / ' + pages + (view.tab === 'log' ? '   · журнал с момента включения панели' : ''), 176, by + 26, 13, C.text2);
  const horn = !nd && S.hasSeal && S.alm2.horn;
  if (horn) {
    rrect(500, by + 10, 110, 32, 4, ui.blink ? C.alarm : C.white, C.alarm, 2);
    text('ЗВУК ВКЛ', 555, by + 27, 14, ui.blink ? C.white : C.alarm, 'center', true);
  }
  button('bAck', 620, by, 180, 52, 'КВИТИРОВАТЬ', { size: 16, enabled: horn || act.some(function (a) { return !a.ack; }) }, ackAll);
  button('bRes', 812, by, 200, 52, 'СБРОС АВАРИЙ', { size: 16, enabled: !nd }, function () {
    confirm('Сбросить аварии?', 'ГЦУ, линии Н-1/Н-2 и задвижки с аварией. Причина должна быть устранена.', resetAll);
  });
}
