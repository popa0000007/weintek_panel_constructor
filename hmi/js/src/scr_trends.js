// ================================================================ ЭКРАН: тренды (окно 15)
// История — из общего хранилища, её пишет регистратор gcu_recorder.js (общее окно 4) каждые 5 с, 8 часов.
function screenInfo() { return { name: 'trends', demoChip: [130, 66] }; }
const TV = { span: 3600, end: 0, pause: false };     // span, с; end — правый край (0 = сейчас)
function screenInit() { if (DEMO) demoHistory(); setInterval(req, 5000); }
function onDataUpdate() { }
function drawExtraPopup(p) { }

const TR_IDX = 'gcu_tr_idx';
function readSamples(t0, t1) {
  // формат куска часа: "сек,L*10,P*1000,SpeedOut*10,V1*10,V2*10;"
  const out = [];
  const idx = storeGet(TR_IDX, []);
  idx.forEach(function (h) {
    if ((h + 1) * 3600 < t0 || h * 3600 > t1) return;
    let s = null;
    try { s = STORE.getItem('gcu_tr_' + h); } catch (e) { }
    if (!s) return;
    s.split(';').forEach(function (q) {
      if (!q) return;
      const a = q.split(',');
      const t = h * 3600 + (+a[0]);
      if (t < t0 || t > t1) return;
      out.push({ t: t, L: a[1] === '' ? NaN : a[1] / 10, P: a[2] === '' ? NaN : a[2] / 1000, O: a[3] / 10, A: a[4] / 10, B: a[5] / 10 });
    });
  });
  out.sort(function (p, q) { return p.t - q.t; });
  return out;
}
function demoHistory() {
  if (storeGet(TR_IDX, []).length) return;
  const now = Math.floor(Date.now() / 1000), hrs = {};
  for (let t = now - 8 * 3600; t <= now; t += 5) {
    const h = Math.floor(t / 3600), k = (t - now) / 60;
    const L = 70 + 6 * Math.sin(k / 23) + 2 * Math.sin(k / 3.7), P = 1.0 + 0.05 * Math.sin(k / 5.3), O = 78 + 7 * Math.sin(k / 17 + 1);
    hrs[h] = (hrs[h] || '') + (t - h * 3600) + ',' + Math.round(L * 10) + ',' + Math.round(P * 1000) + ',' + Math.round(O * 10) + ',' + Math.round(O * 10) + ',0;';
  }
  Object.keys(hrs).forEach(function (h) { try { STORE.setItem('gcu_tr_' + h, hrs[h]); } catch (e) { } });
  storeSet(TR_IDX, Object.keys(hrs).map(Number));
}

function drawScreen() {
  const nd = noData();
  rrect(12, 56, 760, 648, 4, C.panel, C.panelBorder, 1);
  text('Тренды', 28, 82, 22, C.text, 'left', true);
  [[900, '15 мин'], [3600, '1 ч'], [8 * 3600, '8 ч']].forEach(function (s, i) {
    button('sp' + i, 300 + i * 74, 64, 68, 36, s[1], { active: TV.span === s[0], style: 'blue', size: 15 }, function () { TV.span = s[0]; });
  });
  const nowS = Math.floor(Date.now() / 1000);
  if (!TV.pause) TV.end = nowS;
  button('bBack', 540, 64, 50, 36, '◀', { size: 18 }, function () { TV.pause = true; TV.end -= TV.span / 2; });
  button('bPause', 596, 64, 50, 36, TV.pause ? '▶▶' : '❚❚', { size: 16, active: TV.pause, style: 'blue' }, function () { TV.pause = !TV.pause; });
  button('bFwd', 652, 64, 50, 36, '▶', { size: 18, enabled: TV.pause }, function () { TV.end = Math.min(nowS, TV.end + TV.span / 2); if (TV.end >= nowS) TV.pause = false; });
  // график
  const GX = 70, GY = 118, GW = 640, GH = 520;
  rrect(GX, GY, GW, GH, 0, C.white, C.panelBorder, 1);
  const t1 = TV.end, t0 = t1 - TV.span;
  for (let i = 0; i <= 4; i++) {
    const y = GY + GH * i / 4;
    if (i > 0 && i < 4) line(GX, y, GX + GW, y, '#E1E2DE', 1);
    text((100 - 25 * i) + (i === 4 ? ' %' : ''), GX - 8, y, 12, '#B5651D', 'right');
    text(fmt(2.5 - 0.625 * i, 2), GX + GW + 8, y, 12, C.ready, 'left');
  }
  text('бар', GX + GW + 8, GY - 14, 12, C.ready, 'left');
  text('%', GX - 8, GY - 14, 12, '#B5651D', 'right');
  for (let i = 0; i <= 4; i++) {
    const x = GX + GW * i / 4;
    if (i > 0 && i < 4) line(x, GY, x, GY + GH, '#E1E2DE', 1);
    const d = new Date((t0 + TV.span * i / 4) * 1000);
    text(two(d.getHours()) + ':' + two(d.getMinutes()), x, GY + GH + 16, 12, C.text2, 'center');
  }
  const xs = function (t) { return GX + (t - t0) / TV.span * GW; };
  const yl = function (v) { return GY + GH - Math.max(0, Math.min(100, v)) / 100 * GH; };
  const yp = function (v) { return GY + GH - Math.max(0, Math.min(2.5, v)) / 2.5 * GH; };
  // уставка уровня
  if (!nd && isFinite(S.set.levelSP)) line(GX, yl(S.set.levelSP), GX + GW, yl(S.set.levelSP), '#B5651D', 1.5, [6, 4]);
  if (!nd && isFinite(S.set.pressSP)) line(GX, yp(S.set.pressSP), GX + GW, yp(S.set.pressSP), C.ready, 1, [3, 5]);
  const data = readSamples(t0, t1);
  // прореживание до ~2 точек на пиксель
  const step = Math.max(1, Math.floor(data.length / (GW * 2)));
  const series = [['L', yl, '#B5651D', 2.2], ['P', yp, C.ready, 2.2], ['O', yl, C.text, 1.6]];
  cv.save(); cv.beginPath(); cv.rect(GX, GY, GW, GH); cv.clip();
  series.forEach(function (s) {
    cv.beginPath();
    let pen = false, last = 0;
    for (let i = 0; i < data.length; i += step) {
      const d = data[i], v = d[s[0]];
      if (!isFinite(v) || (pen && d.t - last > 60)) { pen = false; if (!isFinite(v)) continue; }
      const x = xs(d.t), y = s[1](v);
      if (!pen) { cv.moveTo(x, y); pen = true; } else cv.lineTo(x, y);
      last = d.t;
    }
    cv.strokeStyle = s[2]; cv.lineWidth = s[3]; cv.setLineDash([]); cv.stroke();
  });
  cv.restore();
  if (!data.length) {
    text('Нет записанных данных за этот интервал', GX + GW / 2, GY + GH / 2 - 12, 16, C.text2, 'center', true);
    text('Историю пишет регистратор gcu_recorder.js в общем окне 4', GX + GW / 2, GY + GH / 2 + 14, 13, C.text2, 'center');
  }
  if (TV.pause) { rrect(GX + 8, GY + 8, 120, 24, 3, C.move); text('ПАУЗА', GX + 68, GY + 21, 13, C.text, 'center', true); }
  // легенда
  [['#B5651D', 'Уровень, %'], [C.ready, 'Давление, бар'], [C.text, 'Скорость насоса, %']].forEach(function (l, i) {
    fillRect(GX + i * 190, GY + GH + 34, 22, 4, l[0]); text(l[1], GX + 28 + i * 190, GY + GH + 36, 13, C.text2);
  });

  // ---- сейчас
  rrect(784, 56, 228, 648, 4, C.panel, C.panelBorder, 1);
  text('Сейчас', 798, 82, 18, C.text, 'left', true);
  const card = function (y, color, title, val, unit, sub) {
    rrect(796, y, 204, 96, 4, C.white, C.panelBorder, 1);
    fillRect(797, y + 1, 5, 94, color);
    text(title, 812, y + 20, 13, C.text2);
    text(val + ' ' + unit, 812, y + 50, 26, C.text, 'left', true);
    text(sub, 812, y + 78, 12, C.text2);
  };
  card(104, '#B5651D', 'Уровень зумпфа', nd ? '—' : fmt(S.level, 1), '%', nd ? '' : 'уставка ' + fmt(S.set.levelSP, 1) + ' % (пунктир)');
  card(212, C.ready, 'Давление на циклонах', nd ? '—' : fmt(S.press, 2), 'бар', nd ? '' : 'уставка ' + fmt(S.set.pressSP, 2) + ' бар');
  card(320, C.text, 'Скорость насоса', nd ? '—' : fmt(S.speedOut, 1), '%', nd ? '' : 'задание регулятора, шкала слева');
  text('Открыто циклонов: ' + (nd ? '—' : S.nCyc), 798, 446, 14, C.text);
  text('Рабочий насос: ' + (nd || !S.activePump ? '—' : 'Н-' + S.activePump), 798, 470, 14, C.text);
  text('Запись: каждые 5 с, 8 часов.', 798, 640, 12, C.text2);
  text('После перезагрузки панели', 798, 658, 12, C.text2);
  text('история начинается заново.', 798, 676, 12, C.text2);
}
