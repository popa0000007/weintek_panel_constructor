// ================================================================ ЭКРАН: входы и выходы DI / DO / AI / AO (окно 17)
// Данные — DB102 HMI_IO: панель пишет Kind + Id, ПЛК копирует DI/DO/AI/AO.Item[Id] в буфер.
// Правка — одним запросом [Kind, Id, Cmd, CmdVal] (FC GCU_HMI_IO). Сигнальные DB панель напрямую не пишет.
// config (дополнительно к мнемосхеме): ioSub — Подписка DBn 1020000 длина 99; ioAddr — Адрес DBn 1020000; pin; winAddr.
function screenInfo() { return { name: 'io', diag: [760, 64], demoChip: [600, 64] }; }
const IO_WORDS = 99;
const KINDS = ['', 'DI', 'DO', 'AI', 'AO'];
const KTITLE = ['', 'Диагностика дискретных входных сигналов. DI', 'Диагностика дискретных выходных сигналов. DO',
  'Диагностика входных аналоговых сигналов. AI', 'Диагностика выходных аналоговых сигналов. AO'];
const BASE = [0, 14, 42, 62, 156];
// поля: имя -> [тип, смещение в структуре, бит, код правки]   b Bool, r Real, i Int, d DInt
const F = {
  1: {
    Active: ['b', 0, 0, 1], Value: ['b', 0, 1], Quality: ['b', 0, 2], Mask: ['b', 0, 3, 2], MaskValue: ['b', 0, 4, 3], AlmUse: ['b', 0, 5, 4],
    IsAlarm: ['b', 0, 6], Inverse: ['b', 0, 7, 7], RawVal: ['b', 1, 0], AlmMode: ['b', 1, 2, 5], AlmDisable: ['b', 1, 3, 6], StatBit_REV: ['b', 1, 4, 8],
    Tf: ['r', 4, 0, 20], StatusBYTE: ['i', 12], StatusBIT: ['i', 14], AdrByte: ['i', 16], AdrBit: ['i', 18], Timeout: ['d', 20, 0, 21], TimeAlarm: ['d', 24]
  },
  2: {
    Active: ['b', 0, 0, 1], Value: ['b', 0, 1], Quality: ['b', 0, 2], Mask: ['b', 0, 3, 2], MaskValue: ['b', 0, 4, 3], Inverse: ['b', 0, 5, 7],
    RawVal: ['b', 0, 6], StatBit_REV: ['b', 0, 7, 8], StatusBYTE: ['i', 10], StatusBIT: ['i', 12], AdrByte: ['i', 14], AdrBit: ['i', 16]
  },
  3: {
    Active: ['b', 0, 0, 1], AlmDisable: ['b', 0, 1, 6], Quality: ['b', 0, 6], Mask: ['b', 0, 7, 2],
    AlmHiHi: ['b', 1, 0], AlmHi: ['b', 1, 1], AlmLo: ['b', 1, 2], AlmLoLo: ['b', 1, 3],
    HiHiUse: ['b', 1, 4, 9], HiUse: ['b', 1, 5, 10], LoUse: ['b', 1, 6, 11], LoLoUse: ['b', 1, 7, 12],
    Value: ['r', 2], MaskValue: ['r', 6, 0, 22], MinEU: ['r', 10, 0, 23], MaxEU: ['r', 14, 0, 24], HiHi: ['r', 18, 0, 25], Hi: ['r', 22, 0, 26],
    Lo: ['r', 26, 0, 27], LoLo: ['r', 30, 0, 28], Current: ['r', 34], Factor: ['r', 38, 0, 29], Tf: ['r', 42, 0, 20], Threshold: ['r', 50, 0, 30],
    Timeout: ['d', 54, 0, 21], AIType: ['i', 74, 0, 31], AdrByte: ['i', 78], Overflow: ['i', 80, 0, 34], Underflow: ['i', 82, 0, 35],
    MinRaw: ['i', 84, 0, 32], MaxRaw: ['i', 86, 0, 33], RawVal: ['i', 88], StatusBYTE: ['i', 90], StatusBIT: ['i', 92]
  },
  4: {
    Active: ['b', 0, 0, 1], Quality: ['b', 1, 6], Mask: ['b', 1, 7, 2], Value: ['r', 2], MaskValue: ['r', 6, 0, 22], MinEU: ['r', 10, 0, 23],
    MaxEU: ['r', 14, 0, 24], Current: ['r', 18], AOType: ['i', 26, 0, 31], AdrByte: ['i', 30], MinRaw: ['i', 32, 0, 32], MaxRaw: ['i', 34, 0, 33], RawVal: ['i', 36]
  }
};
let ioW = new Array(IO_WORDS).fill(0), hasIo = false, ioAckPrev = null;
const sel = { kind: 1, id: [0, 1, 1, 1, 1] };

function i32(arr, off) {
  let a = wordOf(arr, off), b = wordOf(arr, off + 2);
  if (REAL_SWAP) { const t = a; a = b; b = t; }
  return ((a << 16) | b) | 0;
}
function put32(arr, off, v) {
  let a = (v >>> 16) & 0xFFFF, b = v & 0xFFFF;
  if (REAL_SWAP) { const t = a; a = b; b = t; }
  arr[off >> 1] = a; arr[(off >> 1) + 1] = b;
}
function g(name) {
  const f = F[sel.kind][name];
  if (!f) return undefined;
  const o = BASE[sel.kind] + f[1];
  if (f[0] === 'b') return bitOf(ioW, o, f[2]);
  if (f[0] === 'r') return real(ioW, o);
  if (f[0] === 'i') return i16(ioW, o);
  return i32(ioW, o);
}
function curId() { return sel.id[sel.kind]; }
function sigList() { return SIG[KINDS[sel.kind]]; }
function sigText(k, id) { const s = SIG[KINDS[k]][id - 1]; return s ? 'ID=' + id + '.  ' + s[0] + '  ·  ' + s[1] : 'ID=' + id; }
function ioValid() { return (DEMO || hasIo) && i16(ioW, 0) === sel.kind && i16(ioW, 2) === curId(); }
function unitOf() { const s = sigList()[curId() - 1]; if (!s) return ''; const m = s[1].split(','); return m.length > 1 ? m[m.length - 1].trim() : ''; }

function selectIo() {
  if (DEMO) { demoIoBuild(); req(); return; }
  write(cfg.ioAddr, [sel.kind, curId(), 0], 'ioAddr');
}
function sendIo(name, value, label) {
  const f = F[sel.kind][name];
  if (!f || !f[3]) return;
  const tmp = [sel.kind, curId(), f[3], 0, 0];
  putReal(tmp, 6, value);
  if (DEMO) { demoIoSet(name, value); }
  else write(cfg.ioAddr, tmp, 'ioAddr');
  logEvent('Изменено: ' + KINDS[sel.kind] + ' ' + curId() + ' «' + (sigList()[curId() - 1] || ['', ''])[1] + '» — ' + label + ' = ' + value);
}

function screenInit() {
  if (!DEMO && cfg.ioSub) {
    const onIo = function (err, data) {
      if (err) { commErr = err.message || String(err); req(); return; }
      ioW = wordsFrom(data, IO_WORDS); hasIo = true;
      const ack = i16(ioW, 12);
      if (ioAckPrev !== null && ack !== ioAckPrev) toast('ПЛК принял изменение');
      ioAckPrev = ack;
      req();
    };
    cfg.ioSub.onResponse(onIo);
    if (cfg.ioSub.latestData) onIo(undefined, cfg.ioSub.latestData);
  } else {
    // без подписки: опрос DB102 через Адрес ioAddr каждые 0,5 с (окно открывается, даже если DB102 нет в ПЛК)
    poll(cfg.ioAddr, IO_WORDS, 500, function (w) {
      ioW = w; hasIo = true;
      const ack = i16(ioW, 12);
      if (ioAckPrev !== null && ack !== ioAckPrev) toast('ПЛК принял изменение');
      ioAckPrev = ack;
      req();
    }, function () { req(); });
  }
  // выбранный сигнал: если ПЛК уже показывает какой-то — продолжаем с него
  const k0 = i16(ioW, 0), id0 = i16(ioW, 2);
  if (k0 >= 1 && k0 <= 4 && id0 >= 1 && id0 <= SIG[KINDS[k0]].length) { sel.kind = k0; sel.id[k0] = id0; }
  setTimeout(selectIo, 50);
}
function onDataUpdate() { }
function drawExtraPopup(p) { }

// ---------------------------------------------------------------- элементы строк
const RX = 24, RW = 600, VX = 330;
function lbl(s, y) { textFit(s, RX, y + 13, VX - RX - 10, 15, C.text, 'left'); }
function roBox(x, y, w, s, color) {
  rrect(x, y, w, 26, 3, '#ECEDEA', C.panelBorder, 1);
  textFit(s, x + w - 8, y + 14, w - 12, 15, color || C.text, 'right', true);
}
function edBox(id, x, y, w, name, label, dec, min, max, always) {
  const v = g(name);
  // always — поле доступно, даже если буфер DB102 ещё не прочитан (значение маскирования готовят заранее)
  const on = ioValid() || (always && (DEMO || !!cfg.ioAddr));
  rrect(x, y, w, 26, 3, on ? C.white : '#ECEDEA', on ? (ui.press === id ? C.ready : C.btnBorder) : C.panelBorder, ui.press === id ? 2 : 1);
  textFit(ioValid() ? fmt(v, dec) : '—', x + w - 8, y + 14, w - 12, 15, on ? C.ready : C.textDis, 'right', true);
  hit(x, y, w, 26, on ? function () {
    withAccess(function () {
      keypad(KINDS[sel.kind] + ' ' + curId() + ': ' + label, ioValid() ? v : NaN, min, max, dec, function (nv) { sendIo(name, nv, label); }, { noLog: true });
    });
  } : function () { }, id);
}
function tgl(id, x, y, w, name, label, onTxt, offTxt, warnMsg) {
  const v = !!g(name), on = ioValid();
  const pressed = ui.press === id;
  const fill = !on ? '#ECEDEA' : (v ? (pressed ? C.greenDark : C.run) : (pressed ? C.btnPressed : C.btn));
  rrect(x, y, w, 26, 3, fill, !on ? C.panelBorder : (v ? C.greenDark : C.btnBorder), 1);
  textFit(on ? (v ? onTxt : offTxt) : '—', x + w / 2, y + 14, w - 8, 14, on && v ? C.white : (on ? C.text : C.textDis), 'center', true);
  hit(x, y, w, 26, on ? function () {
    withAccess(function () {
      const nv = !v;
      const doIt = function () { sendIo(name, nv ? 1 : 0, label); };
      if (warnMsg) confirm(label + ': ' + (nv ? onTxt : offTxt) + '?', warnMsg, doIt); else doIt();
    });
  } : function () { }, id);
}
function bit01(v) { return v ? '1' : '0'; }

// ---------------------------------------------------------------- панели
function drawParams() {
  const X = 12, Y = 272, W = 624, H = 432;
  rrect(X, Y, W, H, 4, C.panel, C.panelBorder, 1);
  const k = sel.kind, un = unitOf();
  let y = Y + 10;
  const RH = k === 3 ? 26 : 34;
  const next = function () { y += RH; };
  const MASKW = 'Маскирование подменяет реальный сигнал значением маскирования. Логика ГЦУ будет работать по подменённому значению.';
  if (k === 1 || k === 2) {
    lbl('Текущее значение', y); roBox(VX, y, 110, ioValid() ? bit01(g('Value')) : '—', g('Value') ? C.run : C.text); next();
    lbl(k === 1 ? 'Сигнал на входном блоке' : 'Сигнал на выходном блоке', y); roBox(VX, y, 110, ioValid() ? bit01(g('RawVal')) : '—'); next();
    lbl('Адрес в ПЛК (байт . бит)', y); roBox(VX, y, 110, ioValid() ? g('AdrByte') + ' . ' + g('AdrBit') : '—');
    text(ioValid() && g('AdrByte') >= 0 ? (k === 1 ? '%I' : '%Q') + g('AdrByte') + '.' + g('AdrBit') : '', VX + 122, y + 14, 14, C.text2); next();
    lbl('Статусный бит (байт . бит)', y); roBox(VX, y, 110, ioValid() ? (g('StatusBYTE') < 0 ? 'не исп.' : g('StatusBYTE') + ' . ' + g('StatusBIT')) : '—'); next();
    if (k === 1) {
      lbl('Режим алармирования', y); tgl('tAM', VX, y, 110, 'AlmMode', 'Режим алармирования', 'по 1', 'по 0'); next();
      lbl('Алармирование', y); tgl('tAU', VX, y, 110, 'AlmUse', 'Алармирование', 'ВКЛ', 'ВЫКЛ'); next();
      lbl('Задержка срабатывания аварии, мс', y); edBox('eTO', VX, y, 110, 'Timeout', 'Задержка аварии, мс', 0, 0, 600000); next();
      lbl('Текущее время аварии, мс', y); roBox(VX, y, 110, ioValid() ? String(g('TimeAlarm')) : '—'); next();
      lbl('Постоянная фильтра, с', y); edBox('eTf', VX, y, 110, 'Tf', 'Постоянная фильтра, с', 2, 0, 60); next();
    }
    lbl('Значение маскирования сигнала', y); tgl('tMV', VX, y, 110, 'MaskValue', 'Значение маскирования', '1', '0');
    tgl('tMK', VX + 122, y, 150, 'Mask', 'Маскирование', 'МАСКА ВКЛ', 'МАСКА ВЫКЛ', MASKW); next();
  } else if (k === 3) {
    lbl('Текущее значение' + (un ? ', ' + un : ''), y); roBox(VX, y, 120, ioValid() ? fmt(g('Value'), 2) : '—', C.text); next();
    lbl('Адрес в ПЛК (%IW) · статус байт.бит', y); roBox(VX, y, 120, ioValid() ? String(g('AdrByte')) : '—');
    roBox(VX + 132, y, 110, ioValid() ? (g('StatusBYTE') < 0 ? 'не исп.' : g('StatusBYTE') + ' . ' + g('StatusBIT')) : '—'); next();
    const sp = [['HiHi', 'HiHiUse', 'Верхняя аварийная уставка (ВАУ)'], ['Hi', 'HiUse', 'Верхняя предупр. уставка (ВПУ)'],
      ['Lo', 'LoUse', 'Нижняя предупр. уставка (НПУ)'], ['LoLo', 'LoLoUse', 'Нижняя аварийная уставка (НАУ)']];
    sp.forEach(function (s, i) {
      lbl(s[2], y); edBox('eS' + i, VX, y, 120, s[0], s[2], 2, -99999, 99999);
      tgl('tS' + i, VX + 132, y, 110, s[1], s[2] + ' — использование', 'ВКЛ', 'ВЫКЛ'); next();
    });
    lbl('Задержка аварии, мс', y); edBox('eTO', VX, y, 120, 'Timeout', 'Задержка аварии, мс', 0, 0, 600000); next();
    lbl('Гистерезис, % шкалы', y); edBox('eTh', VX, y, 120, 'Threshold', 'Гистерезис, % шкалы', 2, 0, 10); next();
    lbl('Тип сигнала', y); edBox('eTy', VX, y, 120, 'AIType', 'Тип сигнала (0 4-20 мА, 1 КИП, 2 температура, 5 ABB)', 0, 0, 5);
    text({ 0: '4–20 мА', 1: 'КИП', 2: 'температура', 5: 'ABB WORD' }[g('AIType')] || '', VX + 132, y + 14, 13, C.text2); next();
    lbl('Шкала в инж. единицах (мин – макс)', y); edBox('eE0', VX, y, 120, 'MinEU', 'Шкала, минимум', 2, -99999, 99999);
    text('–', VX + 126, y + 13, 15, C.text2, 'center'); edBox('eE1', VX + 132, y, 110, 'MaxEU', 'Шкала, максимум', 2, -99999, 99999); next();
    lbl('Шкала в единицах АЦП (мин – макс)', y); edBox('eR0', VX, y, 120, 'MinRaw', 'АЦП, минимум', 0, -32768, 32767);
    text('–', VX + 126, y + 13, 15, C.text2, 'center'); edBox('eR1', VX + 132, y, 110, 'MaxRaw', 'АЦП, максимум', 0, -32768, 32767); next();
    lbl('Переполнение (снизу / сверху)', y); edBox('eU0', VX, y, 120, 'Underflow', 'Переполнение снизу', 0, -32768, 32767);
    text('/', VX + 126, y + 13, 15, C.text2, 'center'); edBox('eU1', VX + 132, y, 110, 'Overflow', 'Переполнение сверху', 0, -32768, 32767); next();
    lbl('Постоянная фильтра, с', y); edBox('eTf', VX, y, 120, 'Tf', 'Постоянная фильтра, с', 2, 0, 60); next();
    lbl('Множитель', y); edBox('eFa', VX, y, 120, 'Factor', 'Множитель', 3, -1000, 1000); next();
    lbl('Значение АЦП · ток, мА', y); roBox(VX, y, 120, ioValid() ? String(g('RawVal')) : '—'); roBox(VX + 132, y, 110, ioValid() ? fmt(g('Current'), 2) : '—'); next();
    lbl('Значение маскирования сигнала', y); edBox('eMV', VX, y, 120, 'MaskValue', 'Значение маскирования', 2, -99999, 99999, true);
    tgl('tMK', VX + 132, y, 150, 'Mask', 'Маскирование', 'МАСКА ВКЛ', 'МАСКА ВЫКЛ', MASKW); next();
  } else {
    lbl('Текущее значение' + (un ? ', ' + un : ''), y); roBox(VX, y, 120, ioValid() ? fmt(g('Value'), 2) : '—'); next();
    lbl('Адрес в ПЛК (%QW)', y); roBox(VX, y, 120, ioValid() ? String(g('AdrByte')) : '—'); next();
    lbl('Тип сигнала', y); edBox('eTy', VX, y, 120, 'AOType', 'Тип сигнала', 0, 0, 5); next();
    lbl('Шкала в инж. единицах (мин – макс)', y); edBox('eE0', VX, y, 120, 'MinEU', 'Шкала, минимум', 2, -99999, 99999);
    text('–', VX + 126, y + 13, 15, C.text2, 'center'); edBox('eE1', VX + 132, y, 110, 'MaxEU', 'Шкала, максимум', 2, -99999, 99999); next();
    lbl('Шкала в единицах АЦП (мин – макс)', y); edBox('eR0', VX, y, 120, 'MinRaw', 'АЦП, минимум', 0, -32768, 32767);
    text('–', VX + 126, y + 13, 15, C.text2, 'center'); edBox('eR1', VX + 132, y, 110, 'MaxRaw', 'АЦП, максимум', 0, -32768, 32767); next();
    lbl('Значение в единицах АЦП', y); roBox(VX, y, 120, ioValid() ? String(g('RawVal')) : '—'); next();
    lbl('Значение тока, мА', y); roBox(VX, y, 120, ioValid() ? fmt(g('Current'), 2) : '—'); next();
    lbl('Значение маскирования сигнала', y); edBox('eMV', VX, y, 120, 'MaskValue', 'Значение маскирования', 2, -99999, 99999, true);
    tgl('tMK', VX + 132, y, 150, 'Mask', 'Маскирование', 'МАСКА ВКЛ', 'МАСКА ВЫКЛ', MASKW); next();
  }
  if (!ioValid()) {
    rrect(X + W / 2 - 170, Y + H / 2 - 24, 340, 48, 6, C.topBar);
    text(noData() && !hasIo ? 'Нет данных от ПЛК (DB102)' : 'Чтение данных сигнала…', X + W / 2, Y + H / 2 + 1, 16, C.white, 'center', true);
  }
}
function drawSignals() {
  const X = 648, Y = 272, W = 364, H = 212, k = sel.kind;
  rrect(X, Y, W, H, 4, C.panel, C.panelBorder, 1);
  text('Сигнализации', X + 14, Y + 22, 17, C.text, 'left', true);
  let list;
  if (k === 1) list = [['Авария сигнала', g('IsAlarm')], ['Сигнал недостоверный', !g('Quality')], ['Сигнал замаскирован', g('Mask'), 'W'],
    ['Сигнал неактивен', !g('Active'), 'W'], ['Алармы отключены', g('AlmDisable'), 'W']];
  else if (k === 2) list = [['Сигнал недостоверный', !g('Quality')], ['Сигнал замаскирован', g('Mask'), 'W'], ['Сигнал неактивен', !g('Active'), 'W']];
  else if (k === 3) list = [['Верхняя аварийная граница', g('AlmHiHi')], ['Верхняя предупредительная граница', g('AlmHi'), 'W'],
    ['Нижняя предупредительная граница', g('AlmLo'), 'W'], ['Нижняя аварийная граница', g('AlmLoLo')], ['Сигнал недостоверный', !g('Quality')],
    ['Сигнал замаскирован', g('Mask'), 'W']];
  else list = [['Сигнал недостоверный', !g('Quality')], ['Сигнал замаскирован', g('Mask'), 'W'], ['Сигнал неактивен', !g('Active'), 'W']];
  list.forEach(function (q, i) {
    const y = Y + 50 + i * 29, on = ioValid() && q[1];
    const col = q[2] === 'W' ? C.move : C.alarm;
    text(q[0], X + 14, y, 14, on ? (q[2] === 'W' ? C.text : C.alarm) : C.text2, 'left', on);
    cv.beginPath(); cv.arc(X + W - 26, y, 9, 0, Math.PI * 2);
    cv.fillStyle = on ? col : C.white; cv.fill(); cv.strokeStyle = on ? C.text : C.btnBorder; cv.lineWidth = 1.5; cv.stroke();
  });
}
function drawControlPanel() {
  const X = 648, Y = 494, W = 364, H = 210, k = sel.kind;
  rrect(X, Y, W, H, 4, C.panel, C.panelBorder, 1);
  text('Управление сигналом', X + 14, Y + 22, 17, C.text, 'left', true);
  const ACTW = 'Неактивный сигнал не обрабатывается: значение не обновляется, аварии не формируются.';
  const rowsC = [['Активность', 'tAc', 'Active', 'ВКЛ', 'ВЫКЛ', ACTW]];
  if (k === 1 || k === 2) rowsC.push(['Инверсия сигнала', 'tIn', 'Inverse', 'ВКЛ', 'ВЫКЛ', 'Значение сигнала станет противоположным.']);
  if (k === 1 || k === 3) rowsC.push(['Деактивация алармов', 'tAD', 'AlmDisable', 'ВКЛ', 'ВЫКЛ', 'Аварии этого сигнала перестанут формироваться.']);
  if (k === 1 || k === 2) rowsC.push(['Инверсия статусного бита', 'tSR', 'StatBit_REV', 'ВКЛ', 'ВЫКЛ', null]);
  rowsC.forEach(function (r, i) {
    const y = Y + 42 + i * 36;
    text(r[0], X + 14, y + 13, 14, C.text);
    tgl(r[1], X + W - 124, y, 110, r[2], r[0], r[3], r[4], r[5]);
  });
}

function drawScreen() {
  text('Входы и выходы', 16, 78, 22, C.text, 'left', true);
  accessButton(890, 62);
  if (cfg.winAddr) button('bBack', 430, 62, 150, 32, '← Регуляторы', { size: 14 }, function () { goWindow(13); });
  // вкладки
  for (let k = 1; k <= 4; k++) {
    button('tab' + k, 16 + (k - 1) * 138, 104, 130, 40, KINDS[k] + ' · ' + SIG[KINDS[k]].length, { active: sel.kind === k, style: 'blue', size: 16 }, (function (kk) {
      return function () { if (sel.kind !== kk) { sel.kind = kk; selectIo(); } };
    })(k));
  }
  if (!DEMO && !cfg.ioSub && !cfg.ioAddr) text('В Config нет ioAddr (DB102)', 580, 124, 14, C.alarm, 'left', true);
  else if (!DEMO && !hasIo) text('Нет ответа от DB102 HMI_IO — загружен ли он в ПЛК?', 580, 124, 14, C.alarm, 'left', true);
  // заголовок как в стандарте
  fillRect(12, 152, 1000, 32, C.topBar);
  text(KTITLE[sel.kind], 24, 168, 17, C.white, 'left', true);
  // выбор сигнала
  const n = sigList().length;
  button('idPrev', 12, 190, 52, 40, '◀', { size: 18, enabled: curId() > 1 }, function () { sel.id[sel.kind]--; selectIo(); });
  rrect(70, 190, 780, 40, 3, C.white, ui.press === 'idBox' ? C.ready : C.btnBorder, ui.press === 'idBox' ? 2 : 1);
  textFit(sigText(sel.kind, curId()), 82, 211, 740, 16, C.text, 'left', true);
  poly([826, 205, 840, 205, 833, 214], C.text2);
  hit(70, 190, 780, 40, openSigList, 'idBox');
  button('idNext', 856, 190, 52, 40, '▶', { size: 18, enabled: curId() < n }, function () { sel.id[sel.kind]++; selectIo(); });
  button('idList', 914, 190, 98, 40, 'Список', { size: 15 }, openSigList);
  const s = sigList()[curId() - 1] || ['', '', ''];
  text('ID: ' + curId() + '   ·   Подключение: ' + s[0] + (s[2] ? '   ·   тег ПЛК: ' + s[2] : ''), 16, 252, 14, C.text2);
  drawParams();
  drawSignals();
  drawControlPanel();
  text(cfg.pin ? (hasAccess() ? 'Правка разрешена (уровень «Инженер»)' : 'Правка параметров — после ВХОД') : 'Белые поля и кнопки — правка', 1008, 252, 13, C.text2, 'right');
}
function openSigList() {
  const items = sigList().map(function (s, i) { return 'ID=' + (i + 1) + '.  ' + s[0] + '  ·  ' + s[1]; });
  openList('Выбор сигнала ' + KINDS[sel.kind], items, curId(), function (id) { sel.id[sel.kind] = id; selectIo(); });
}

// ---------------------------------------------------------------- демо (без ПЛК): модель сигналов в памяти
const demoOv = {};
function demoDefaults(k, id) {
  const s = SIG[KINDS[k]][id - 1] || ['', ''];
  const m = /^%[IQ]W?(\d+)(?:\.(\d))?/.exec(s[0]) || [];
  const ab = m[1] ? +m[1] : -1, bt = m[2] ? +m[2] : 0;
  if (k === 1) return { Active: 1, Quality: 1, Value: id % 3 === 0 ? 1 : 0, RawVal: id % 3 === 0 ? 1 : 0, AlmUse: 0, Tf: 0.1, Timeout: 3000, AdrByte: ab, AdrBit: bt, StatusBYTE: -1, StatusBIT: -1, StatBit_REV: 1 };
  if (k === 2) return { Active: 1, Quality: 1, Value: id % 4 === 1 ? 1 : 0, RawVal: id % 4 === 1 ? 1 : 0, AdrByte: ab, AdrBit: bt, StatusBYTE: -1, StatusBIT: -1, StatBit_REV: 1 };
  if (k === 3) {
    const lv = id === 1, v = lv ? S.level : S.press, mx = lv ? 100 : 2.5;
    return { Active: 1, Quality: 1, HiHiUse: lv ? 1 : 0, HiUse: 1, LoUse: 1, LoLoUse: lv ? 1 : 0, Value: v, MinEU: 0, MaxEU: mx,
      HiHi: lv ? 95 : 0, Hi: lv ? 85 : 2.0, Lo: lv ? 20 : 0.3, LoLo: lv ? 10 : 0, Current: 4 + 16 * v / mx, Factor: 1, Tf: lv ? 2 : 1, Threshold: 0.5,
      Timeout: 3000, AIType: 0, AdrByte: ab, Overflow: 32766, Underflow: -32766, MinRaw: 0, MaxRaw: 27648, RawVal: Math.round(27648 * v / mx), StatusBYTE: -1, StatusBIT: -1 };
  }
  const v = S.pump[id] ? S.pump[id].speed : 0;
  return { Active: 1, Quality: 1, Value: v, MinEU: 0, MaxEU: 100, Current: 0, AOType: 0, AdrByte: id === 1 ? 1002 : 1052, MinRaw: 0, MaxRaw: 16384, RawVal: Math.round(16384 * v / 100) };
}
function demoIoBuild() {
  const k = sel.kind, id = curId();
  ioW = new Array(IO_WORDS).fill(0);
  putI16(ioW, 0, k); putI16(ioW, 2, id); putI16(ioW, 10, SIG[KINDS[k]].length);
  const vals = demoDefaults(k, id), ov = demoOv[k + ':' + id] || {};
  Object.keys(ov).forEach(function (q) { vals[q] = ov[q]; });
  if (k === 1 && vals.Mask) vals.Value = vals.MaskValue;
  if (k === 3) { vals.AlmHi = vals.HiUse && vals.Value > vals.Hi ? 1 : 0; vals.AlmHiHi = vals.HiHiUse && vals.Value > vals.HiHi ? 1 : 0; if (vals.Mask) vals.Value = vals.MaskValue || 0; }
  Object.keys(F[k]).forEach(function (name) {
    const f = F[k][name], o = BASE[k] + f[1], v = vals[name];
    if (v === undefined) return;
    if (f[0] === 'b') putBit(ioW, o, f[2], !!v);
    else if (f[0] === 'r') putReal(ioW, o, v);
    else if (f[0] === 'i') putI16(ioW, o, v);
    else put32(ioW, o, v);
  });
  hasIo = true;
}
function demoIoSet(name, value) {
  const key = sel.kind + ':' + curId();
  if (!demoOv[key]) demoOv[key] = {};
  demoOv[key][name] = value;
  demoIoBuild();
  toast('ПЛК принял изменение (демо)');
}
if (DEMO) setInterval(function () { if (DEMO) { demoIoBuild(); req(); } }, 1000);
