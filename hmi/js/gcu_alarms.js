// =====================================================================
//  ГЦУ-1 · Аварии и журнал (окно 14)
//  JS Object для Weintek cMT X (EasyBuilder Pro >= 6.09). Версия 2.5 · 2026-10-24
//  Собрано из src/core.js + src/scr_alarms.js (build.py). Вставлять целиком.
//  Конфигурация — hmi/js/config_alarms.json (кнопка «Шаблон…»).
// =====================================================================

const self = this;
const cfg = this.config || {};
const W0 = 1024, H0 = 664, OY = 48;          // объект ставится в X0 Y48, размер 1024x664
const FONT = (typeof cfg.fontFamily === 'string' && cfg.fontFamily.length) ? cfg.fontFamily : 'Arial';
const BOLD = cfg.useBold === false ? '' : 'bold ';
const HI_FIRST = cfg.boolHighByteFirst !== false;
const REAL_SWAP = cfg.realWordSwap === true;
const DEMO = cfg.demo === true || (!cfg.hmiSub && !cfg.cmdAddr);
const HMI_WORDS = 114, SET_WORDS = 27;         // DB100 228 байт: 0..187 — cmdAddr (94 слова), 188..227 — extAddr (20 слов)
const SI = screenInfo();                     // параметры экрана (задаёт файл экрана)

// ---------------------------------------------------------------- цвета (hmi/GCU_Colors.txt)
const C = {
  topBar: '#23272B', bg: '#DFE0DC', panel: '#F4F4F1', white: '#FFFFFF',   // чистый белый (на прежней панели был розовым — тогда стоял #FCFCFB; панель заменена)
  text: '#1D2023', text2: '#4B5157', textLight: '#E8E9E6', textDis: '#7A7F85', alarmMark: '#A12020',
  run: '#1E8A3C', ready: '#2F6FB8', alarm: '#C42B2B', move: '#E0A100', stop: '#C4C7CB',
  repairFill: '#ECEDEA', repairLine: '#6F757B', warnRow: '#FFF6DD',
  btn: '#E4E5E1', btnBorder: '#8F949A', btnPressed: '#C9CCC6', panelBorder: '#B3B6B0', rowLine: '#D3D5D0',
  greenDark: '#146B2C', blueDark: '#1F4F87',
  pulp: '#5A5F65', water: '#3F7FB4', slurry: '#A0978A', tankWall: '#3B4045', tankIn: '#EDEDEA',
  cycRun: '#6A6F75', cycRepair: '#C3C6CA', branchOff: '#8F949A',
  unknown: '#9CC3E4'   // положение неизвестно / промежуточное
};

// ---------------------------------------------------------------- тексты
const VALVE_NAMES = [
  '', 'Н-1 гидроподпор', 'Н-1 всас', 'Н-1 нагнетание', 'Н-1 промывка', 'Н-1 размывка', 'Н-1 дренаж',
  'Н-2 гидроподпор', 'Н-2 всас', 'Н-2 нагнетание', 'Н-2 промывка', 'Н-2 размывка', 'Н-2 дренаж',
  'ГЦ-1 подача', 'ГЦ-2 подача', 'ГЦ-3 подача', 'ГЦ-4 подача', 'ГЦ-5 подача', 'ГЦ-6 подача'
];
const VALVE_STATE = ['ЗАКРЫТА', 'ОТКРЫТА', 'В ДВИЖЕНИИ', 'АВАРИЯ', 'РЕМОНТ', 'НЕИЗВЕСТНО'];
// цвет плашки задвижки по View (5 — положение неизвестно: нет концевиков)
function valveCol(view) { return [C.stop, C.run, C.move, C.alarm, C.repairFill, C.unknown][view] || C.stop; }
const PUMP_STATE = ['СТОИТ', 'ГОТОВ', 'РАБОТА', 'АВАРИЯ', 'РЕМОНТ', 'ПУСК / ОСТАНОВ'];
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
// биты HMI_GCU.Alm (DB100.DBX52.0 … 53.6): [категория, текст]  A авария, W предупреждение, E событие
const ALM_DEF = [
  ['A', 'Уровнемер зумпфа неисправен'], ['W', 'Датчик давления на циклонах неисправен'],
  ['A', 'Уровень зумпфа аварийно высокий (HH)'], ['W', 'Уровень зумпфа высокий (H)'],
  ['W', 'Уровень зумпфа низкий (L)'], ['A', 'Уровень зумпфа аварийно низкий (LL)'],
  ['W', 'Уровень выше уставки, все циклоны открыты'], ['W', 'Уровень ниже уставки при минимуме циклонов'],
  ['A', 'Насос Н-1: авария'], ['A', 'Насос Н-2: авария'], ['E', 'Сработал АВР насосов'],
  ['A', 'Нет готового насоса, ГЦУ остановлена'], ['A', 'Авария задвижки гидроциклона'],
  ['A', 'Аварийный стоп по уровню зумпфа'], ['A', 'Аварийный стоп ГЦУ (после отжатия кнопки — СБРОС)']
];

// ---------------------------------------------------------------- данные DB100 / DB101
let hmiW = new Array(HMI_WORDS).fill(0);
let setW = new Array(SET_WORDS).fill(0);
let hasHmi = false, hasSet = false, hmiLen = 0, hasExt = false;
let commErr = '', lastUpdate = 0, updates = 0;
const dv = new DataView(new ArrayBuffer(4));

function wordOf(arr, off) { const v = arr[off >> 1]; return (typeof v === 'number') ? (v & 0xFFFF) : 0; }
function byteOf(arr, off) {
  const w = wordOf(arr, off & ~1);
  const even = (off & 1) === 0;
  return ((HI_FIRST ? (even ? w >> 8 : w) : (even ? w : w >> 8)) & 0xFF);
}
function bitOf(arr, off, b) { return ((byteOf(arr, off) >> b) & 1) === 1; }
function i16(arr, off) { const w = wordOf(arr, off); return w >= 0x8000 ? w - 0x10000 : w; }
function real(arr, off) {
  let a = wordOf(arr, off), b = wordOf(arr, off + 2);
  if (REAL_SWAP) { const t = a; a = b; b = t; }
  dv.setUint16(0, a); dv.setUint16(2, b);
  return dv.getFloat32(0);
}
function putI16(arr, off, v) { arr[off >> 1] = v & 0xFFFF; }
function putReal(arr, off, v) {
  dv.setFloat32(0, v);
  let a = dv.getUint16(0), b = dv.getUint16(2);
  if (REAL_SWAP) { const t = a; a = b; b = t; }
  arr[off >> 1] = a; arr[(off >> 1) + 1] = b;
}
function putBit(arr, off, b, val) {
  const i = off >> 1, even = (off & 1) === 0;
  const shift = (HI_FIRST ? (even ? 8 : 0) : (even ? 0 : 8)) + b;
  let w = wordOf(arr, off & ~1);
  w = val ? (w | (1 << shift)) : (w & ~(1 << shift));
  arr[i] = w & 0xFFFF;
}
function valveAt(base) {
  const o = base;
  return {
    opened: bitOf(hmiW, o, 0), closed: bitOf(hmiW, o, 1), moving: bitOf(hmiW, o, 2), fault: bitOf(hmiW, o, 3),
    auto: bitOf(hmiW, o, 4), fltTravel: bitOf(hmiW, o, 5), fltLimits: bitOf(hmiW, o, 6), fltSwitch: bitOf(hmiW, o, 7),
    target: bitOf(hmiW, o + 1, 0), local: bitOf(hmiW, o + 1, 1), fltSignal: bitOf(hmiW, o + 1, 2), repair: bitOf(hmiW, o + 1, 3),
    view: i16(hmiW, o + 2)
  };
}
let S = null;
function decode() {
  const s = {};
  s.st = {
    auto: bitOf(hmiW, 50, 0), run: bitOf(hmiW, 50, 1), readyAuto: bitOf(hmiW, 50, 2), canAuto: bitOf(hmiW, 50, 3),
    sysRun: bitOf(hmiW, 50, 4), permit: bitOf(hmiW, 50, 5), levelOk: bitOf(hmiW, 50, 6), pressOk: bitOf(hmiW, 50, 7)
  };
  s.alm = [];
  for (let i = 0; i < 15; i++) s.alm.push(bitOf(hmiW, 52 + (i >> 3), i & 7));
  s.activePump = i16(hmiW, 54);
  s.nCyc = i16(hmiW, 56);
  s.level = real(hmiW, 58);
  s.press = real(hmiW, 62);
  s.speedOut = real(hmiW, 66);
  s.manSpeed = [0, real(hmiW, 42), real(hmiW, 46)];
  s.pump = [null];
  for (let n = 1; n <= 2; n++) {
    const o = 70 + (n - 1) * 16;
    s.pump.push({
      step: i16(hmiW, o), faultCode: i16(hmiW, o + 2), speed: real(hmiW, o + 4),
      running: bitOf(hmiW, o + 8, 0), ready: bitOf(hmiW, o + 8, 1), fault: bitOf(hmiW, o + 8, 2), inRun: bitOf(hmiW, o + 8, 3),
      starting: bitOf(hmiW, o + 8, 4), stopping: bitOf(hmiW, o + 8, 5), remote: bitOf(hmiW, o + 8, 6), fltDrive: bitOf(hmiW, o + 8, 7),
      fltComm: bitOf(hmiW, o + 9, 0), fltStart: bitOf(hmiW, o + 9, 1), fltStop: bitOf(hmiW, o + 9, 2), fltUnxStart: bitOf(hmiW, o + 9, 3),
      fltUnxStop: bitOf(hmiW, o + 9, 4), duty: bitOf(hmiW, o + 9, 5), selected: bitOf(hmiW, o + 9, 6), repair: bitOf(hmiW, o + 9, 7),
      drv: i16(hmiW, o + 10), starts: i16(hmiW, o + 12), view: i16(hmiW, o + 14)
    });
  }
  s.valve = [null];
  for (let i = 1; i <= 18; i++) s.valve.push(valveAt(102 + (i - 1) * 4));
  s.selValve = i16(hmiW, 174);
  s.sel = valveAt(178);
  s.selTravel = i16(hmiW, 182);
  s.selCycles = i16(hmiW, 184);
  s.selCanCmd = bitOf(hmiW, 186, 0);
  // давление в линиях нагнетания (DB100.188/192, достоверность 196.0/196.1) — есть, если подписка 99 слов
  s.hasLine = DEMO || hasExt || hmiLen >= 99;
  s.line = [null, { p: real(hmiW, 188), ok: bitOf(hmiW, 196, 0) }, { p: real(hmiW, 192), ok: bitOf(hmiW, 196, 1) }];
  // давление воздуха ПМУ (DB100.198/202, достоверность 206.0/206.1) — подписка 104 слова
  s.hasAir = DEMO || hasExt || hmiLen >= 104;
  s.air = [null, { p: real(hmiW, 198), ok: bitOf(hmiW, 206, 0) }, { p: real(hmiW, 202), ok: bitOf(hmiW, 206, 1) }];
  // гидроподпор насосов (DB100.208…224) и доп. аварии Alm2 (226…227) — опрос extAddr
  s.hasSeal = DEMO || hasExt;
  s.seal = [null];
  for (let n = 1; n <= 2; n++) s.seal.push({
    p: real(hmiW, 204 + n * 4), f: real(hmiW, 212 + n * 4),
    pOk: bitOf(hmiW, 224, n - 1), fOk: bitOf(hmiW, 224, n + 1),
    hh: bitOf(hmiW, 224, 2 + n * 2), ll: bitOf(hmiW, 224, 3 + n * 2)
  });
  s.alm2 = {
    estop: [bitOf(hmiW, 226, 0), bitOf(hmiW, 226, 1), bitOf(hmiW, 226, 2), bitOf(hmiW, 226, 3)],
    sealBad: [false, bitOf(hmiW, 226, 4), bitOf(hmiW, 226, 5)],
    doorGcu: bitOf(hmiW, 226, 6), doorCyc: bitOf(hmiW, 226, 7), doorPlc: bitOf(hmiW, 227, 0),
    airGcu: bitOf(hmiW, 227, 1), airCyc: bitOf(hmiW, 227, 2), light: bitOf(hmiW, 227, 3), horn: bitOf(hmiW, 227, 4)
  };
  s.set = {
    pressSP: real(setW, 0), kp: real(setW, 4), ti: real(setW, 8), spdMin: real(setW, 12), spdMax: real(setW, 16),
    levelSP: real(setW, 20), hyst: real(setW, 24), startMin: real(setW, 28),
    tAdd: i16(setW, 32), tRem: i16(setW, 34), nStart: i16(setW, 36), nMin: i16(setW, 38), nMax: i16(setW, 40),
    duty: i16(setW, 42), tScour: i16(setW, 46), tFlushStart: i16(setW, 48), tFlushStop: i16(setW, 50), tDrain: i16(setW, 52),
    repair: []
  };
  for (let i = 0; i < 8; i++) s.set.repair.push(bitOf(setW, 44, i));   // 0 Pump1, 1 Pump2, 2..7 Cyc1..6
  S = s;
}
decode();

// ---------------------------------------------------------------- запись в ПЛК
function toast(msg) { ui.toast = { msg: msg, until: Date.now() + 3500 }; req(); }
async function write(addr, value, name) {
  if (DEMO) { demoWrite(name, value); return; }
  if (!addr) { toast('В Config нет адреса «' + name + '»'); return; }
  try {
    await driver.promises.setData(addr, value);
  } catch (e) {
    toast('Ошибка записи ' + name + ': ' + (e && e.message ? e.message : e));
  }
}
// GCU: DB100.DBW0; насосы: DBW2, DBW4. ПЛК обнуляет команды после выполнения.
function cmdGcu(c) { write(cfg.cmdAddr, [c], 'cmdAddr'); }
function cmdPump(n, c) { write(cfg.cmdAddr, n === 1 ? [0, c] : [0, 0, c], 'cmdAddr'); }
// SelValve (DBW174) и SelCmd (DBW176) — одним запросом
function selectValve(n) { write(cfg.selAddr, [n, 0], 'selAddr'); }
function cmdValve(n, c) {
  write(cfg.selAddr, [n, c], 'selAddr');
  if (c > 1000) logEvent('Изменено: ' + VALVE_NAMES[n] + ' — время хода = ' + (c - 1000) + ' с');
}
// ManSpeed[1..2] (DBD42, DBD46) пишутся 4 словами от DBW42: Real раскладываем сами
function setManSpeed(n, v) {
  const tmp = hmiW.slice();
  putReal(tmp, n === 1 ? 42 : 46, v);
  write(cfg.speedAddr, [tmp[21], tmp[22], tmp[23], tmp[24]], 'speedAddr');
}
// DB101 пишется целиком: берём прочитанный образ и меняем одно поле
function writeSet(mutator) {
  if (!hasSet && !DEMO) { toast('Уставки ещё не прочитаны из ПЛК'); return; }
  const copy = setW.slice();
  mutator(copy);
  write(cfg.setAddr, copy, 'setAddr');
}
function setI16(off, v) { writeSet(function (a) { putI16(a, off, v); }); }
function setReal(off, v) { writeSet(function (a) { putReal(a, off, v); }); }
function setRepair(bit, val) { writeSet(function (a) { putBit(a, 44, bit, val); }); }

// ---------------------------------------------------------------- холст и ввод
const canvas = new Canvas();
self.widget.add(canvas);
const mouse = new MouseArea();
self.widget.add(mouse);
let SC = 1;
function updateScale() {
  const w = self.widget.width || W0;
  SC = w / W0;
  if (!(SC > 0)) SC = 1;
}
updateScale();

const ui = {
  popup: null,        // {type:'valve'|'pump'|'confirm'|'keypad'|'diag', ...}
  stack: [],          // окна под текущим (клавиатура поверх окна насоса и т.п.)
  toast: null,
  blink: false,
  press: null         // подсветка нажатой кнопки
};
let hits = [];
function hit(x, y, w, h, fn, id, hold) { hits.push({ x: x, y: y, w: w, h: h, fn: fn, id: id || '', hold: hold || null }); }

function openPopup(p) { if (ui.popup) ui.stack.push(ui.popup); ui.popup = p; req(); }
function closePopup() { ui.popup = ui.stack.length ? ui.stack.pop() : null; req(); }
function closeAll() { ui.popup = null; ui.stack = []; req(); }

mouse.on('mousedown', function (e) {
  const p = toLocal(e);
  const h = findHit(p.x, p.y);
  ui.press = h ? h.id : null;
  if (h && h.hold) { ui.holding = h; try { h.hold.down(); } catch (err) { console.log('hold: ' + err.message); } }
  if (ui.press) req();
});
mouse.on('mouseup', function () {
  if (ui.holding) { const hh = ui.holding; ui.holding = null; try { hh.hold.up(); } catch (err) { console.log('hold: ' + err.message); } }
  if (ui.press) { ui.press = null; req(); }
});
mouse.on('click', function (e) {
  const p = toLocal(e);
  const h = findHit(p.x, p.y);
  if (h && h.fn && !h.hold) {
    try { h.fn(); } catch (err) { console.log('click error: ' + err.message); }
    draw();                       // сразу перестроить зоны нажатия
  }
});
function toLocal(e) { return { x: e.x / SC, y: e.y / SC + OY }; }
function findHit(x, y) {
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return h;
  }
  return null;
}

// ---------------------------------------------------------------- примитивы рисования
const cv = canvas;
function font(sz, bold) { cv.font = (bold ? BOLD : '') + sz + 'px ' + FONT; }
function fillRect(x, y, w, h, color) { cv.fillStyle = color; cv.fillRect(x, y, w, h); }
function strokeRect(x, y, w, h, color, lw, dash) {
  cv.strokeStyle = color; cv.lineWidth = lw || 1;
  cv.setLineDash(dash || []);
  cv.strokeRect(x, y, w, h);
  if (dash) cv.setLineDash([]);
}
function rrPath(x, y, w, h, r) {
  cv.beginPath();
  cv.moveTo(x + r, y);
  cv.lineTo(x + w - r, y); cv.arcTo(x + w, y, x + w, y + r, r);
  cv.lineTo(x + w, y + h - r); cv.arcTo(x + w, y + h, x + w - r, y + h, r);
  cv.lineTo(x + r, y + h); cv.arcTo(x, y + h, x, y + h - r, r);
  cv.lineTo(x, y + r); cv.arcTo(x, y, x + r, y, r);
  cv.closePath();
}
function rrect(x, y, w, h, r, fill, stroke, lw, dash) {
  rrPath(x, y, w, h, r);
  if (fill) { cv.fillStyle = fill; cv.fill(); }
  if (stroke) {
    cv.strokeStyle = stroke; cv.lineWidth = lw || 1; cv.setLineDash(dash || []);
    cv.stroke();
    if (dash) cv.setLineDash([]);
  }
}
function line(x1, y1, x2, y2, color, lw, dash) {
  cv.beginPath(); cv.moveTo(x1, y1); cv.lineTo(x2, y2);
  cv.strokeStyle = color; cv.lineWidth = lw || 1; cv.setLineDash(dash || []);
  cv.stroke();
  if (dash) cv.setLineDash([]);
}
function hpipe(x1, x2, y, th, color) { fillRect(x1, y - th / 2, x2 - x1, th, color); }
function vpipe(x, y1, y2, th, color) { fillRect(x - th / 2, y1, th, y2 - y1, color); }
function text(s, x, y, sz, color, align, bold) {
  font(sz || 14, bold);
  cv.fillStyle = color || C.text;
  cv.textAlign = align || 'left';
  cv.textBaseline = 'middle';
  cv.fillText(String(s), x, y);
}
function textFit(s, x, y, maxW, sz, color, align, bold) {
  let size = sz;
  font(size, bold);
  while (size > 9 && cv.measureText && cv.measureText(String(s)).width > maxW) { size--; font(size, bold); }
  text(s, x, y, size, color, align, bold);
}
function poly(pts, fill, stroke, lw, dash) {
  cv.beginPath();
  cv.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) cv.lineTo(pts[i], pts[i + 1]);
  cv.closePath();
  if (fill) { cv.fillStyle = fill; cv.fill(); }
  if (stroke) { cv.strokeStyle = stroke; cv.lineWidth = lw || 1; cv.lineJoin = 'round'; cv.setLineDash(dash || []); cv.stroke(); if (dash) cv.setLineDash([]); }
}
function fmt(v, d) {
  if (typeof v !== 'number' || !isFinite(v)) return '—';
  return v.toFixed(d);
}
function noData() { return !DEMO && !hasHmi; }

// кнопка: style 'normal' | 'green' | 'blue' | 'red' ; active — выбранное состояние
function button(id, x, y, w, h, label, opts, fn) {
  opts = opts || {};
  const enabled = opts.enabled !== false;
  const pressed = enabled && ui.press === id;
  let fill = C.btn, border = C.btnBorder, color = C.text;
  if (opts.active) {
    if (opts.style === 'green') { fill = C.run; border = C.greenDark; color = C.white; }
    else if (opts.style === 'red') { fill = C.alarm; border = '#8E1E1E'; color = C.white; }
    else { fill = C.ready; border = C.blueDark; color = C.white; }
  }
  if (pressed) fill = opts.active ? border : C.btnPressed;
  if (!enabled) { fill = '#ECEDEA'; border = C.panelBorder; color = C.textDis; }
  rrect(x, y, w, h, 4, fill, border, 1);
  textFit(label, x + w / 2, y + h / 2 + 1, w - 8, opts.size || 16, color, 'center', true);
  hit(x, y, w, h, enabled ? fn : function () { if (opts.why) toast(opts.why); }, id);
}

// кнопка «пока нажата»: down — при нажатии, up — при отпускании (в любом месте экрана)
function holdButton(id, x, y, w, h, label, opts, down, up) {
  opts = opts || {};
  const enabled = opts.enabled !== false;
  const pressed = enabled && ui.press === id;
  let fill = C.btn, border = C.btnBorder, color = C.text;
  if (pressed || opts.active) { fill = opts.style === 'blue' ? C.ready : C.run; border = opts.style === 'blue' ? C.blueDark : C.greenDark; color = C.white; }
  if (!enabled) { fill = '#ECEDEA'; border = C.panelBorder; color = C.textDis; }
  rrect(x, y, w, h, 6, fill, border, pressed ? 3 : 1);
  textFit(label, x + w / 2, y + h / 2 + 1, w - 12, opts.size || 18, color, 'center', true);
  if (enabled) hit(x, y, w, h, function () { }, id, { down: down, up: up });
  else hit(x, y, w, h, function () { if (opts.why) toast(opts.why); }, id);
}

// ---------------------------------------------------------------- символы
function viewColors(view, kind) {
  // возвращает [заливка, контур, пунктир?]
  if (noData()) return [C.stop, C.repairLine, true];
  if (kind === 'pump') {
    switch (view) {
      case 1: return [C.ready, C.text, false];
      case 2: return [C.run, C.text, false];
      case 3: return [ui.blink ? C.alarm : '#E8A0A0', C.text, false];
      case 4: return [C.repairFill, C.repairLine, true];
      case 5: return [ui.blink ? C.move : '#F2D27A', C.text, false];
      default: return [C.stop, C.text, false];
    }
  }
  switch (view) {
    case 1: return [C.run, C.text, false];
    case 2: return [ui.blink ? C.move : '#F2D27A', C.text, false];
    case 3: return [C.alarm, C.text, false];
    case 4: return [C.repairFill, C.repairLine, true];
    case 5: return [C.unknown, C.text, false];
    default: return [C.stop, C.text, false];
  }
}
function valveH(x, y, view) {           // 48x32
  const c = viewColors(view, 'valve');
  const dash = c[2] ? [5, 3] : null;
  poly([x + 2, y + 2, x + 24, y + 16, x + 2, y + 30], c[0], c[1], c[2] ? 2 : 1.6, dash);
  poly([x + 46, y + 2, x + 24, y + 16, x + 46, y + 30], c[0], c[1], c[2] ? 2 : 1.6, dash);
  if (view === 5 && !noData()) qMark(x + 24, y + 16);
}
function valveV(x, y, view) {           // 32x48
  const c = viewColors(view, 'valve');
  const dash = c[2] ? [5, 3] : null;
  poly([x + 2, y + 2, x + 30, y + 2, x + 16, y + 24], c[0], c[1], c[2] ? 2 : 1.6, dash);
  poly([x + 2, y + 46, x + 30, y + 46, x + 16, y + 24], c[0], c[1], c[2] ? 2 : 1.6, dash);
  if (view === 5 && !noData()) qMark(x + 16, y + 24);
}
function qMark(cx, cy) {           // «?» — положение неизвестно
  cv.beginPath(); cv.arc(cx, cy, 9, 0, Math.PI * 2);
  cv.fillStyle = C.white; cv.fill(); cv.strokeStyle = C.text; cv.lineWidth = 1.2; cv.stroke();
  text('?', cx, cy + 1, 13, C.text, 'center', true);
}
function localBadge(x, y) {
  rrect(x, y, 20, 20, 3, C.topBar);
  text('М', x + 10, y + 11, 14, C.white, 'center', true);
}
// задвижка на схеме: символ + «М» + зона нажатия
function valveObj(idx, x, y, vertical, badgeX) {
  const v = S.valve[idx];
  if (vertical) valveV(x, y, v.view); else valveH(x, y, v.view);
  const w = vertical ? 32 : 48, h = vertical ? 48 : 32;
  if (!noData() && v.local) localBadge(typeof badgeX === 'number' ? badgeX : x + w + 2, y);
  hit(x - 4, y - 4, w + 8, h + 8, function () { openValve(idx); }, 'v' + idx);
}
function pumpSym(cx, cy, view) {
  const c = viewColors(view, 'pump');
  cv.beginPath(); cv.arc(cx, cy, 33, 0, Math.PI * 2);
  cv.fillStyle = c[0]; cv.fill();
  cv.strokeStyle = c[1]; cv.lineWidth = 3; cv.setLineDash(c[2] ? [7, 5] : []); cv.stroke(); cv.setLineDash([]);
  const dark = (view === 0 || view === 4 || view === 5 || noData());
  poly([cx + 11, cy - 11, cx + 33, cy, cx + 11, cy + 11], dark ? C.text : C.white, C.text, 1.5);
}

// ---------------------------------------------------------------- тревоги
function alarmList() {
  const a = [];
  if (noData()) return a;
  ALM_DEF.forEach(function (d, i) { if (S.alm[i] && d[0] !== 'E') a.push({ c: d[0], t: d[1] }); });
  if (S.hasSeal) {
    ['пульт ГЦУ', 'шкаф гидроциклонов', 'шкаф ПЛК', 'панель HMI'].forEach(function (w, i) {
      if (S.alm2.estop[i]) a.push({ c: 'A', t: 'Нажата кнопка аварийного стопа: ' + w });
    });
    for (let n = 1; n <= 2; n++) if (S.alm2.sealBad[n]) a.push({ c: 'W', t: 'Н-' + n + ': датчик давления гидроподпора неисправен (защита не работает)' });
  }
  for (let n = 1; n <= 2; n++) {
    const p = S.pump[n], N = 'Н-' + n + ': ';
    if (p.fltDrive) a.push({ c: 'A', t: N + 'авария частотника' });
    if (p.fltComm) a.push({ c: 'A', t: N + 'нет связи с частотником (Profibus)' });
    if (p.fltStart) a.push({ c: 'A', t: N + 'частотник не запустился' });
    if (p.fltStop) a.push({ c: 'A', t: N + 'частотник не остановился' });
    if (p.fltUnxStart) a.push({ c: 'A', t: N + 'самопроизвольный пуск' });
    if (p.fltUnxStop) a.push({ c: 'A', t: N + 'самопроизвольный останов' });
    if (p.faultCode && FAULT_TEXT[p.faultCode]) a.push({ c: 'A', t: N + 'аварийный останов — ' + FAULT_TEXT[p.faultCode] });
    if (p.repair) a.push({ c: 'W', t: 'Насос Н-' + n + ' выведен в ремонт' });
  }
  for (let i = 1; i <= 18; i++) {
    const v = S.valve[i], N = VALVE_NAMES[i] + ': ';
    if (v.fltTravel) a.push({ c: 'A', t: N + 'превышено время хода' });
    if (v.fltLimits) a.push({ c: 'A', t: N + 'неисправность концевиков' });
    if (v.fltSwitch) a.push({ c: 'A', t: N + 'неисправность местного переключателя' });
    if (v.fltSignal) a.push({ c: 'A', t: N + 'недостоверный сигнал' });
    if (i >= 13 && v.repair) a.push({ c: 'W', t: 'Гидроциклон ' + (i - 12) + ' выведен в ремонт' });
  }
  a.sort(function (x, y) { return (x.c === 'A' ? 0 : 1) - (y.c === 'A' ? 0 : 1); });
  return a;
}
function drawAlarmLine() {
  const x = 14, y = 56, w = 600, h = 28;
  if (!DEMO && commErr) {
    rrect(x, y, w, h, 4, C.alarm, null);
    textFit('НЕТ СВЯЗИ С ПЛК: ' + commErr, x + 10, y + h / 2 + 1, w - 20, 15, C.white, 'left', true);
    return;
  }
  if (noData()) {
    rrect(x, y, w, h, 4, C.panel, C.panelBorder);
    text('Ожидание данных от ПЛК…', x + 10, y + h / 2 + 1, 15, C.text2);
    return;
  }
  const list = alarmList();
  const nA = list.filter(function (q) { return q.c === 'A'; }).length;
  const nW = list.length - nA;
  rrect(x, y, w, h, 4, list.length ? C.white : C.panel, C.panelBorder);
  let cx = x + 4;
  if (nA) { rrect(cx, y + 3, 104, h - 6, 3, C.alarm); text('АВАРИЙ ' + nA, cx + 52, y + h / 2 + 1, 14, C.white, 'center', true); cx += 110; }
  if (nW) { rrect(cx, y + 3, 116, h - 6, 3, C.move); text('ПРЕДУПР. ' + nW, cx + 58, y + h / 2 + 1, 14, C.text, 'center', true); cx += 122; }
  if (!list.length) { text('Аварий и предупреждений нет', x + 10, y + h / 2 + 1, 15, C.text2); return; }
  const k = Math.floor(Date.now() / 3000) % list.length;
  const cur = list[k];
  textFit((list.length > 1 ? (k + 1) + '/' + list.length + '  ' : '') + cur.t, cx + 6, y + h / 2 + 1, x + w - cx - 12, 15,
    cur.c === 'A' ? C.alarm : C.text, 'left', cur.c === 'A');
}

// ---------------------------------------------------------------- панель управления
function row(label, x, y, w, value, unit, valColor) {
  text(label, x, y, 15, C.text2, 'left');
  text(value + (unit ? ' ' + unit : ''), x + w, y, 16, valColor || C.text, 'right', true);
}
function editBox(id, x, y, w, h, value, unit, fn, enabled) {
  const on = enabled !== false && !noData();
  rrect(x, y, w, h, 3, on ? C.white : '#ECEDEA', on ? (ui.press === id ? C.ready : C.btnBorder) : C.panelBorder, ui.press === id ? 2 : 1);
  text(value + ' ' + unit, x + w - 8, y + h / 2 + 1, 16, on ? C.ready : C.textDis, 'right', true);
  if (on) {
    // карандаш-подсказка
    line(x + 8, y + h - 7, x + 16, y + 7, C.ready, 2);
  }
  hit(x, y, w, h, on ? fn : function () { }, id);
}
// ---------------------------------------------------------------- всплывающие окна
function popupFrame(x, y, w, h, title, closable) {
  // затемнение
  cv.globalAlpha = 0.35; fillRect(0, OY, W0, H0, '#000000'); cv.globalAlpha = 1;
  hit(0, OY, W0, H0, function () { }, 'modal');      // клики мимо окна не проходят на схему
  fillRect(x, y, w, h, C.panel);
  fillRect(x, y, w, 44, C.topBar);
  strokeRect(x + 1, y + 1, w - 2, h - 2, C.topBar, 2);
  textFit(title, x + 12, y + 23, w - 70, 18, C.white, 'left', true);
  if (closable !== false) {
    const id = 'close';
    if (ui.press === id) fillRect(x + w - 44, y, 44, 44, '#454B51');
    line(x + w - 30, y + 14, x + w - 14, y + 30, C.white, 2.5);
    line(x + w - 14, y + 14, x + w - 30, y + 30, C.white, 2.5);
    hit(x + w - 48, y, 48, 44, closePopup, id);
  }
}
function statePlate(x, y, w, h, color, label, darkText, dashed) {
  rrect(x, y, w, h, 4, color, dashed ? C.repairLine : null, 2, dashed ? [5, 3] : null);
  text(label, x + w / 2, y + h / 2 + 1, 18, darkText ? C.text : C.white, 'center', true);
}
function faultRow(x, y, active, label) {
  cv.beginPath(); cv.arc(x + 8, y + 12, 7, 0, Math.PI * 2);
  cv.fillStyle = active ? C.alarm : C.white; cv.fill();
  cv.strokeStyle = active ? '#8E1E1E' : C.btnBorder; cv.lineWidth = 1.5; cv.stroke();
  text(label, x + 24, y + 12, 15, active ? C.alarm : C.text2, 'left', active);
}

function openValve(idx) {
  selectValve(idx);
  openPopup({ type: 'valve', idx: idx, t0: Date.now() });
}
function drawValvePopup(p) {
  const x = 312, y = 200, w = 400, h = 360;
  const v = S.valve[p.idx];
  const selOk = S.selValve === p.idx;
  popupFrame(x, y, w, h, VALVE_NAMES[p.idx]);
  const nd = noData();
  // символ + плашка
  if (p.idx === 2 || p.idx === 3 || p.idx === 8 || p.idx === 9) valveH(x + 16, y + 60, v.view);
  else valveV(x + 24, y + 52, v.view);
  const col = nd ? C.stop : valveCol(v.view);
  statePlate(x + 76, y + 56, 308, 40, col, nd ? 'НЕТ ДАННЫХ' : (VALVE_STATE[v.view] || '?'), nd || v.view === 0 || v.view === 2 || v.view === 4 || v.view === 5, v.view === 4);
  // режимы
  text('Управление:', x + 16, y + 118, 15, C.text2);
  text(nd ? '—' : (v.local ? 'МЕСТНОЕ' : 'ДИСТАНЦИЯ'), x + 106, y + 118, 15, v.local ? C.move : C.text, 'left', true);
  text('ГЦУ:', x + 230, y + 118, 15, C.text2);
  text(nd ? '—' : (S.st.auto ? 'АВТОМАТ' : 'РУЧНОЙ'), x + 268, y + 118, 15, S.st.auto ? C.run : C.ready, 'left', true);
  // время хода: правка (1..600 с) — ПЛК пишет в WaitOpen и WaitClose (SelCmd = 1000 + с)
  text('Время хода', x + 16, y + 146, 15, C.text2);
  editBox('vTr', x + 102, y + 132, 86, 28, selOk && !nd ? String(S.selTravel) : '—', 'с', function () {
    withAccess(function () {
      keypad(VALVE_NAMES[p.idx] + ': время хода, с', S.selTravel, 1, 600, 0, function (v) { cmdValve(p.idx, 1000 + v); }, { noLog: true });
    });
  }, selOk && !nd);
  text('Циклов: ' + (selOk && !nd ? S.selCycles : '—'), x + 200, y + 146, 15, C.text2);
  // аварии
  faultRow(x + 16, y + 164, v.fltTravel, 'Превышено время хода');
  faultRow(x + 16, y + 190, v.fltLimits, 'Неисправность концевиков');
  faultRow(x + 16, y + 216, v.fltSwitch, 'Неисправность местного переключателя');
  faultRow(x + 16, y + 242, v.fltSignal, 'Недостоверный сигнал');
  // кнопки
  const can = DEMO ? (selOk && S.selCanCmd) : (selOk && S.selCanCmd);
  const why = nd ? 'Нет данных от ПЛК' : (S.st.auto ? 'В АВТОМАТЕ задвижкой управляет ГЦУ' :
    (v.local ? 'Задвижка в МЕСТНОМ управлении' : (v.fault ? 'Сначала сбросьте аварию' : 'Команда недоступна')));
  if (!can && !nd) text(why, x + w / 2, y + 282, 13, C.text2, 'center');
  button('vOpen', x + 16, y + 300, 116, 44, 'ОТКРЫТЬ', { enabled: can, why: why }, function () { cmdValve(p.idx, 1); });
  button('vClose', x + 142, y + 300, 116, 44, 'ЗАКРЫТЬ', { enabled: can, why: why }, function () { cmdValve(p.idx, 2); });
  button('vReset', x + 268, y + 300, 116, 44, 'СБРОС', { enabled: !nd }, function () { cmdValve(p.idx, 4); toast('Сброс аварии задвижки отправлен'); });
  // ремонт гидроциклона
  if (p.idx >= 13 && !nd) {
    const k = p.idx - 12, rep = S.set.repair[1 + k];
    button('vRep', x + 268, y + 130, 116, 30, rep ? 'ИЗ РЕМОНТА' : 'В РЕМОНТ', { active: rep, style: 'blue', size: 14 }, function () {
      confirm(rep ? 'Ввести ГЦ-' + k + ' из ремонта?' : 'Вывести ГЦ-' + k + ' в ремонт?',
        rep ? 'Циклон снова будет использоваться регулятором уровня.' : 'Регулятор уровня перестанет открывать этот циклон.',
        function () { setRepair(1 + k, !rep); });
    });
  }
}

function openPump(n) { openPopup({ type: 'pump', n: n }); }
function drawPumpPopup(pp) {
  const n = pp.n, p = S.pump[n], nd = noData();
  const x = 292, y = 160, w = 440, h = 440;
  popupFrame(x, y, w, h, 'Насос Н-' + n + (p.duty && !nd ? ' (основной)' : '') + (S.activePump === n && !nd ? ' · рабочий' : ''));
  const col = nd ? C.stop : [C.stop, C.ready, C.run, C.alarm, C.repairFill, C.move][p.view] || C.stop;
  const lbl = nd ? 'НЕТ ДАННЫХ' : (p.view === 5 ? (p.starting ? 'ПУСК' : 'ОСТАНОВ') : PUMP_STATE[p.view] || '?');
  statePlate(x + 16, y + 56, w - 32, 40, col, lbl, nd || p.view === 0 || p.view === 4 || p.view === 5, p.view === 4);
  let yy = y + 120;
  const r = function (l, v, c) { row(l, x + 16, yy, w - 32, v, '', c); yy += 26; };
  r('Шаг программы', nd ? '—' : p.step + ' · ' + (STEP_TEXT[p.step] || '—'));
  r('Авария линии', nd ? '—' : (p.faultCode ? 'код ' + p.faultCode + ' · ' + (FAULT_TEXT[p.faultCode] || '?') : 'нет'), p.faultCode ? C.alarm : null);
  r('Частотник', nd ? '—' : (DRV_TEXT[p.drv] || ('сост. ' + p.drv)) + ' · ' + (p.remote ? 'ДИСТАНЦИЯ' : 'МЕСТНОЕ'), p.remote ? null : C.move);
  r('Задание скорости', nd ? '—' : fmt(p.speed, 1) + ' %');
  r('Пусков', nd ? '—' : String(p.starts));
  // аварии ПЧ — в одну-две строки
  const f = [];
  if (!nd) {
    if (p.fltDrive) f.push('авария ПЧ'); if (p.fltComm) f.push('нет связи'); if (p.fltStart) f.push('не запустился');
    if (p.fltStop) f.push('не остановился'); if (p.fltUnxStart) f.push('самопр. пуск'); if (p.fltUnxStop) f.push('самопр. останов');
  }
  textFit(f.length ? 'Аварии ПЧ: ' + f.join(', ') : 'Аварий частотника нет', x + 16, yy, w - 32, 14, f.length ? C.alarm : C.text2, 'left', f.length > 0);
  yy += 30;
  // ручное задание
  const man = !nd && !S.st.auto;
  text('Ручное задание', x + 16, yy + 13, 15, C.text2);
  editBox('eMan', x + w - 16 - 130, yy, 130, 28, nd ? '—' : fmt(S.manSpeed[n], 1), '%', function () {
    keypad('Н-' + n + ': ручное задание скорости, %', S.manSpeed[n], 0, 100, 1, function (v) { setManSpeed(n, v); });
  }, man);
  if (!man && !nd) text('(в АВТОМАТЕ — от регулятора)', x + 132, yy + 13, 12, C.text2);
  // кнопки
  const why = nd ? 'Нет данных от ПЛК' : 'Пуск и стоп насоса — только в РУЧНОМ режиме';
  const by = y + h - 60;
  button('pStart', x + 16, by, 96, 44, 'ПУСК', { enabled: man, why: why }, function () {
    confirm('Пустить насос Н-' + n + '?', 'Проверьте положение задвижек линии.', function () { cmdPump(n, 1); });
  });
  button('pStop', x + 120, by, 96, 44, 'СТОП', { enabled: man, why: why }, function () {
    confirm('Остановить насос Н-' + n + '?', '', function () { cmdPump(n, 2); });
  });
  button('pReset', x + 224, by, 96, 44, 'СБРОС', { enabled: !nd }, function () { cmdPump(n, 4); toast('Сброс аварий линии Н-' + n + ' отправлен'); });
  const rep = !nd && S.set.repair[n - 1];
  button('pRep', x + 328, by, 96, 44, rep ? 'ИЗ РЕМ.' : 'В РЕМОНТ', { enabled: !nd, active: rep, style: 'blue', size: 14 }, function () {
    confirm(rep ? 'Ввести Н-' + n + ' из ремонта?' : 'Вывести Н-' + n + ' в ремонт?',
      rep ? 'Насос снова будет доступен для работы и АВР.' : 'Насос не будет пускаться ни алгоритмом, ни АВР.',
      function () { setRepair(n - 1, !rep); });
  });
}

function confirm(title, msg, fn) { openPopup({ type: 'confirm', title: title, msg: msg, fn: fn }); }
function wrapLines(str, maxW, sz) {
  font(sz);
  const words = String(str).split(' '), out = [];
  let cur = '';
  words.forEach(function (w) {
    const t = cur ? cur + ' ' + w : w;
    if (cv.measureText && cv.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t;
  });
  if (cur) out.push(cur);
  return out;
}
function drawConfirm(p) {
  const lines = p.msg ? wrapLines(p.msg, 480, 14).slice(0, 4) : [];
  const w = 520, h = 168 + lines.length * 20, x = (W0 - w) / 2, y = OY + (H0 - h) / 2;
  popupFrame(x, y, w, h, 'Подтверждение', false);
  textFit(p.title, x + w / 2, y + 70, w - 32, 18, C.text, 'center', true);
  lines.forEach(function (l, i) { text(l, x + w / 2, y + 98 + i * 20, 14, C.text2, 'center'); });
  const by = y + h - 60;
  button('cYes', x + 60, by, 170, 48, 'ДА', { active: true, style: 'green' }, function () { const f = p.fn; closePopup(); if (f) f(); });
  button('cNo', x + w - 230, by, 170, 48, 'НЕТ', {}, closePopup);
}

function keypad(title, cur, min, max, dec, fn, opts) {
  opts = opts || {};
  openPopup({ type: 'keypad', title: title, cur: cur, min: min, max: max, dec: dec, fn: fn, s: '', err: '',
    secret: !!opts.secret, noLog: !!opts.noLog || !!opts.secret });
}
function drawKeypad(p) {
  const w = 300, h = 452, x = (W0 - w) / 2, y = OY + (H0 - h) / 2;
  popupFrame(x, y, w, h, p.title);
  if (p.secret) text('Введите пароль инженера', x + w / 2, y + 60, 13, C.text2, 'center');
  else text('Сейчас: ' + fmt(p.cur, p.dec) + '   Диапазон: ' + p.min + ' … ' + p.max, x + w / 2, y + 60, 13, C.text2, 'center');
  rrect(x + 16, y + 74, w - 32, 46, 4, C.white, p.err ? C.alarm : C.ready, 2);
  const shown = p.secret ? new Array(p.s.length + 1).join('•') : p.s;
  text(p.s.length ? shown : (p.secret ? '' : fmt(p.cur, p.dec)), x + w - 28, y + 98, 26, p.s.length ? C.text : C.textDis, 'right', true);
  if (p.err) text(p.err, x + w / 2, y + 132, 13, C.alarm, 'center', true);
  const neg = !p.secret && p.min < 0;
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', (p.dec > 0 ? '.' : (neg ? '±' : '')), '←'];
  const kx = x + 16, ky = y + 144, kw = 84, kh = 50, g = 8;
  keys.forEach(function (k, i) {
    if (!k) return;
    const cx = kx + (i % 3) * (kw + g), cy = ky + Math.floor(i / 3) * (kh + g);
    button('k' + i, cx, cy, kw, kh, k, { size: 22 }, function () {
      p.err = '';
      if (k === '←') p.s = p.s.slice(0, -1);
      else if (k === '.') { if (p.s.indexOf('.') < 0) p.s = ((p.s.length && p.s !== '-') ? p.s : (p.s === '-' ? '-0' : '0')) + '.'; }
      else if (k === '±') p.s = p.s.charAt(0) === '-' ? p.s.slice(1) : '-' + p.s;
      else if (p.s.length < 9) p.s = (p.s === '0' ? '' : (p.s === '-0' ? '-' : p.s)) + k;
    });
  });
  const by = ky + 4 * (kh + g);
  if (neg && p.dec > 0) {
    button('kC', kx, by, 40, kh, 'C', { size: 18 }, function () { p.s = ''; p.err = ''; });
    button('kS', kx + 44, by, 40, kh, '±', { size: 18 }, function () { p.s = p.s.charAt(0) === '-' ? p.s.slice(1) : '-' + p.s; });
  } else button('kC', kx, by, kw, kh, 'C', { size: 20 }, function () { p.s = ''; p.err = ''; });
  button('kEsc', kx + kw + g, by, kw, kh, 'Отмена', { size: 15 }, closePopup);
  button('kOk', kx + 2 * (kw + g), by, kw, kh, 'ОК', { active: true, style: 'green', size: 20 }, function () {
    if (p.secret) { const f0 = p.fn; const v0 = p.s; closePopup(); f0(v0); return; }
    if (!p.s.length || p.s === '-') { closePopup(); return; }
    const v = parseFloat(p.s);
    if (!isFinite(v)) { p.err = 'Неверное число'; return; }
    if (v < p.min || v > p.max) { p.err = 'Вне диапазона ' + p.min + ' … ' + p.max; return; }
    const f = p.fn;
    const val = Math.round(v * Math.pow(10, p.dec)) / Math.pow(10, p.dec);
    closePopup();
    f(val);
    if (!p.noLog) logEvent('Изменено: ' + p.title + ' = ' + val + ' (было ' + fmt(p.cur, p.dec) + ')');
    toast('Записано: ' + val);
  });
}

// ---------------------------------------------------------------- список выбора (10 строк на странице)
function openList(title, items, cur, onPick) {
  const per = 10;
  openPopup({ type: 'list', title: title, items: items, cur: cur, onPick: onPick, page: Math.max(0, Math.floor((cur - 1) / per)), per: per });
}
function drawList(p) {
  const w = 760, h = 540, x = (W0 - w) / 2, y = OY + (H0 - h) / 2;
  popupFrame(x, y, w, h, p.title);
  const pages = Math.max(1, Math.ceil(p.items.length / p.per));
  if (p.page >= pages) p.page = pages - 1;
  for (let r = 0; r < p.per; r++) {
    const i = p.page * p.per + r;
    if (i >= p.items.length) break;
    const ry = y + 52 + r * 40;
    const sel = (i + 1) === p.cur;
    const id = 'li' + r;
    rrect(x + 12, ry, w - 24 - 70, 36, 3, sel ? C.ready : (ui.press === id ? C.btnPressed : C.white), sel ? C.blueDark : C.rowLine, 1);
    textFit(p.items[i], x + 22, ry + 19, w - 24 - 90, 15, sel ? C.white : C.text, 'left', sel);
    hit(x + 12, ry, w - 24 - 70, 36, (function (n) { return function () { const f = p.onPick; closePopup(); f(n); }; })(i + 1), id);
  }
  button('lUp', x + w - 72, y + 52, 60, 190, '▲', { size: 24, enabled: p.page > 0 }, function () { p.page--; });
  button('lDn', x + w - 72, y + 250, 60, 190, '▼', { size: 24, enabled: p.page < pages - 1 }, function () { p.page++; });
  text('стр. ' + (p.page + 1) + ' / ' + pages, x + w - 42, y + 462, 13, C.text2, 'center');
}

// ---------------------------------------------------------------- общее хранилище панели (MemoryStorage)
// Видно всем окнам, очищается при перезагрузке панели. Без него (старый EasyBuilder) — память этого окна.
const STORE = (function () {
  try { if (typeof window !== 'undefined' && window && window.memoryStorage) return window.memoryStorage; } catch (e) { }
  const m = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem: function (k, v) { m[k] = String(v); },
    removeItem: function (k) { delete m[k]; }
  };
})();
function storeGet(k, def) {
  try { const v = STORE.getItem(k); return v === null || v === undefined ? def : JSON.parse(v); } catch (e) { return def; }
}
function storeSet(k, v) { try { STORE.setItem(k, JSON.stringify(v)); } catch (e) { console.log('store: ' + e.message); } }
// журнал: {t: мс, c: 'A'|'W'|'E', x: текст, s: 'on'|'off'|'ack'|'evt'}
const LOG_KEY = 'gcu_log', LOG_MAX = 400;
function logEvent(textMsg, cat, state) {
  const log = storeGet(LOG_KEY, []);
  log.unshift({ t: Date.now(), c: cat || 'E', x: textMsg, s: state || 'evt' });
  if (log.length > LOG_MAX) log.length = LOG_MAX;
  storeSet(LOG_KEY, log);
}

// ---------------------------------------------------------------- доступ инженера (config: pin — строка; пусто — без пароля)
let accessUntil = 0;
function hasAccess() { return !cfg.pin || Date.now() < accessUntil; }
function withAccess(fn) {
  if (hasAccess()) { fn(); return; }
  keypad('Доступ «Инженер»', 0, 0, 0, 0, function (v) {
    if (String(v) === String(cfg.pin)) { accessUntil = Date.now() + 10 * 60 * 1000; logEvent('Вход: уровень «Инженер»'); toast('Доступ открыт на 10 минут'); fn(); }
    else toast('Неверный пароль');
  }, { secret: true });
}
function accessButton(x, y) {
  if (!cfg.pin) return;
  const on = hasAccess();
  button('bAcc', x, y, 120, 32, on ? 'ВЫХОД' : 'ВХОД', { size: 14, active: on, style: 'green' }, function () {
    if (on) { accessUntil = 0; toast('Доступ закрыт'); } else withAccess(function () { });
  });
  text(on ? 'Инженер · ' + Math.ceil((accessUntil - Date.now()) / 60000) + ' мин' : 'Изменение — уровень «Инженер»', x - 10, y + 17, 13, C.text2, 'right');
}

function hex4(v) { const s = (v & 0xFFFF).toString(16).toUpperCase(); return '0000'.slice(s.length) + s; }
function drawDiag() {
  const x = 40, y = OY + 20, w = W0 - 80, h = H0 - 40;
  popupFrame(x, y, w, h, 'Диагностика обмена с ПЛК');
  let yy = y + 62;
  const t = function (s, c) { text(s, x + 16, yy, 14, c || C.text); yy += 20; };
  t('Режим: ' + (DEMO ? 'ДЕМО (данные имитируются)' : 'ПЛК') + '    Обновлений: ' + updates +
    '    Последнее: ' + (lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '—') +
    '    Ошибка: ' + (commErr || 'нет'), commErr ? C.alarm : C.text);
  t('Config: hmiSub ' + (cfg.hmiSub ? 'есть' : 'НЕТ') + ' · setSub ' + (cfg.setSub ? 'есть' : 'НЕТ') +
    ' · cmdAddr ' + (cfg.cmdAddr ? 'есть' : 'НЕТ') + ' · speedAddr ' + (cfg.speedAddr ? 'есть' : 'НЕТ') +
    ' · selAddr ' + (cfg.selAddr ? 'есть' : 'НЕТ') + ' · setAddr ' + (cfg.setAddr ? 'есть' : 'НЕТ') +
    '    boolHighByteFirst=' + HI_FIRST + ' realWordSwap=' + REAL_SWAP);
  t('Проверка (сравните с таблицей наблюдения TIA): Level=' + fmt(S.level, 2) + '  Press=' + fmt(S.press, 3) +
    '  SpeedOut=' + fmt(S.speedOut, 2) + '  Press_SP=' + fmt(S.set.pressSP, 2) + '  Level_SP=' + fmt(S.set.levelSP, 2), C.ready);
  t('St: AutoMode=' + +S.st.auto + ' ProgRun=' + +S.st.run + ' ReadyAuto=' + +S.st.readyAuto + ' CanSwitchAuto=' + +S.st.canAuto +
    ' PermitMill=' + +S.st.permit + ' LevelOk=' + +S.st.levelOk + ' PressOk=' + +S.st.pressOk +
    '   ActivePump=' + S.activePump + ' NCycOpen=' + S.nCyc + ' SelValve=' + S.selValve);
  yy += 6;
  text('DB100 (HMI_GCU), слова hex, слева — смещение в байтах:', x + 16, yy, 13, C.text2); yy += 18;
  for (let r0 = 0; r0 < HMI_WORDS; r0 += 12) {
    let s = (r0 * 2 < 100 ? (r0 * 2 < 10 ? '  ' : ' ') : '') + (r0 * 2) + ':  ';
    for (let i = r0; i < Math.min(r0 + 12, HMI_WORDS); i++) s += hex4(hmiW[i]) + ' ';
    text(s, x + 16, yy, 13, C.text, 'left'); yy += 17;
  }
  yy += 6;
  text('DB101 (HMI_SET):', x + 16, yy, 13, C.text2); yy += 18;
  for (let r0 = 0; r0 < SET_WORDS; r0 += 12) {
    let s = (r0 * 2 < 10 ? '  ' : ' ') + (r0 * 2) + ':  ';
    for (let i = r0; i < Math.min(r0 + 12, SET_WORDS); i++) s += hex4(setW[i]) + ' ';
    text(s, x + 16, yy, 13, C.text, 'left'); yy += 17;
  }
  text('Если биты «съехали» — boolHighByteFirst = false. Если уровень/давление — мусор, — realWordSwap = true.', x + 16, y + h - 20, 13, C.text2);
}

// ---------------------------------------------------------------- кадр
let dirty = false;
function req() {
  if (dirty) return;
  dirty = true;
  setTimeout(function () { dirty = false; draw(); }, 20);
}
function draw() {
  if (SI.headless) return;
  hits = [];
  updateScale();
  cv.setTransform(1, 0, 0, 1, 0, 0);
  cv.clearRect(0, 0, cv.width || W0 * SC, cv.height || H0 * SC);
  cv.save();
  cv.setTransform(SC, 0, 0, SC, 0, -OY * SC);
  fillRect(0, OY, W0, H0, C.bg);
  drawScreen();
  if (SI.diag) button('bDiag', SI.diag[0], SI.diag[1], 118, 26, 'Диагностика', { size: 13 }, function () { openPopup({ type: 'diag' }); });
  if (DEMO && SI.demoChip) { rrect(SI.demoChip[0], SI.demoChip[1], 150, 26, 4, C.move); text('ДЕМО-РЕЖИМ', SI.demoChip[0] + 75, SI.demoChip[1] + 14, 14, C.text, 'center', true); }
  if (!DEMO && commErr && !SI.noCommBar) {
    cv.globalAlpha = 0.92; fillRect(0, 688, W0, 24, C.alarm); cv.globalAlpha = 1;
    textFit('НЕТ СВЯЗИ С ПЛК: ' + commErr + (hasHmi ? ' — показаны последние полученные значения' : ''), W0 / 2, 701, W0 - 40, 14, C.white, 'center', true);
  }
  // окна
  const all = ui.stack.concat(ui.popup ? [ui.popup] : []);
  all.forEach(function (p, i) {
    const top = i === all.length - 1;
    const saved = hits;
    if (!top) hits = [];          // нижние окна рисуем, но нажимать можно только верхнее
    if (p.type === 'valve') drawValvePopup(p);
    else if (p.type === 'pump') drawPumpPopup(p);
    else if (p.type === 'confirm') drawConfirm(p);
    else if (p.type === 'keypad') drawKeypad(p);
    else if (p.type === 'diag') drawDiag(p);
    else if (p.type === 'list') drawList(p);
    else drawExtraPopup(p);
    if (!top) hits = saved;
  });
  // всплывающее сообщение
  if (ui.toast) {
    if (Date.now() > ui.toast.until) ui.toast = null;
    else {
      const w = 560, x = (W0 - w) / 2, y = 640;
      rrect(x, y, w, 34, 6, C.topBar);
      textFit(ui.toast.msg, x + w / 2, y + 18, w - 24, 15, C.white, 'center', true);
    }
  }
  cv.restore();
}

// ---------------------------------------------------------------- подписки DB100 / DB101
function wordsFrom(data, n) {
  const out = new Array(n).fill(0);
  if (data && data.values) for (let i = 0; i < n && i < data.values.length; i++) out[i] = data.values[i] & 0xFFFF;
  return out;
}
// опрос «Адреса» без подписки: getData по таймеру. Не блокирует запуск объекта, если блока нет в ПЛК
// (JS-объект ждёт ответа всех подписок перед запуском кода).
function poll(addr, n, periodMs, onData, onErr) {
  if (!addr || DEMO) return;
  let busy = false;
  const tick = async function () {
    if (busy) return;
    busy = true;
    try { const d = await driver.promises.getData(addr, n); onData(wordsFrom(d, n)); }
    catch (e) { if (onErr) onErr(e); }
    busy = false;
  };
  tick();
  setInterval(tick, periodMs);
}
function subscribeMain() {
  // хвост DB100 (смещения 188..207: давления линий и воздуха) — Адрес extAddr = DBn 1000188, опрос 1 с
  // + гидроподпор и доп. аварии (208..227) — всего 20 слов (DB100 228 байт)
  // Если в ПЛК ещё старый DB100 (208 байт) и 20 слов не читаются — переходим на 10 (давления линий и воздуха)
  if (cfg.extAddr && !DEMO) {
    let extN = 20, extBusy = false, extFails = 0;
    const extTick = async function () {
      if (extBusy) return;
      extBusy = true;
      try {
        const d = await driver.promises.getData(cfg.extAddr, extN);
        const w = wordsFrom(d, extN);
        for (let i = 0; i < extN; i++) hmiW[94 + i] = w[i];
        extFails = 0; hasExt = true; decode(); onDataUpdate(); req();
      } catch (e) {
        extFails++;
        if (extN === 20 && extFails >= 2) { extN = 10; extFails = 0; }
        if (hasExt) { hasExt = false; decode(); req(); }
      }
      extBusy = false;
    };
    extTick();
    setInterval(extTick, 1000);
  }
  if (DEMO) return;
  const onHmi = function (err, data) {
    if (err) { commErr = err.message || String(err); req(); return; }
    commErr = '';
    const w = wordsFrom(data, HMI_WORDS);
    hmiLen = data && data.values ? Math.min(data.values.length, HMI_WORDS) : 0;
    for (let i = 0; i < (cfg.extAddr ? Math.min(hmiLen, 94) : hmiLen); i++) hmiW[i] = w[i];      // хвост 94..113 — опросом extAddr
    hasHmi = true; lastUpdate = Date.now(); updates++;
    decode(); onDataUpdate(); req();
  };
  const onSet = function (err, data) {
    if (err) { commErr = err.message || String(err); req(); return; }
    setW = wordsFrom(data, SET_WORDS); hasSet = true; decode(); onDataUpdate(); req();
  };
  const onErr = function (e) { commErr = (e && e.message) ? e.message : 'нет ответа'; req(); };
  // DB100: подписка (старые конфигурации) или опрос через Адрес cmdAddr (DB100.0) каждые 0,5 с.
  // Без подписок код объекта запускается всегда — и без связи с ПЛК окно рисуется с «НЕТ СВЯЗИ».
  if (cfg.hmiSub) {
    cfg.hmiSub.onResponse(onHmi);
    if (cfg.hmiSub.latestData) onHmi(undefined, cfg.hmiSub.latestData);
  } else poll(cfg.cmdAddr, 94, 500, function (w) { onHmi(undefined, { values: w }); }, onErr);
  // DB101: подписка или опрос через Адрес setAddr (DB101.0) каждые 2 с
  if (cfg.setSub) {
    cfg.setSub.onResponse(onSet);
    if (cfg.setSub.latestData) onSet(undefined, cfg.setSub.latestData);
  } else poll(cfg.setAddr, SET_WORDS, 2000, function (w) { onSet(undefined, { values: w }); }, onErr);
}

// ---------------------------------------------------------------- демо-режим (без ПЛК)
const demo = { t: 0, moving: {}, travel: {} };
function demoInit() {
  putReal(setW, 0, 1.0); putReal(setW, 4, 20); putReal(setW, 8, 10); putReal(setW, 12, 40); putReal(setW, 16, 100);
  putReal(setW, 20, 70); putReal(setW, 24, 5); putReal(setW, 28, 30);
  putI16(setW, 32, 30); putI16(setW, 34, 30); putI16(setW, 36, 2); putI16(setW, 38, 1); putI16(setW, 40, 6);
  putI16(setW, 42, 1); putI16(setW, 46, 10); putI16(setW, 48, 20); putI16(setW, 50, 30); putI16(setW, 52, 60);
  putBit(setW, 44, 7, true);                       // ГЦ-6 в ремонте
  putBit(hmiW, 50, 0, true); putBit(hmiW, 50, 1, true); putBit(hmiW, 50, 3, true); putBit(hmiW, 50, 4, true);
  putBit(hmiW, 50, 5, true); putBit(hmiW, 50, 6, true); putBit(hmiW, 50, 7, true);
  putI16(hmiW, 54, 1);
  // Н-1 работает, Н-2 готов
  putI16(hmiW, 70, 100); putBit(hmiW, 78, 0, true); putBit(hmiW, 78, 1, true); putBit(hmiW, 78, 3, true); putBit(hmiW, 78, 6, true);
  putBit(hmiW, 79, 5, true); putBit(hmiW, 79, 6, true); putI16(hmiW, 80, 5); putI16(hmiW, 82, 37); putI16(hmiW, 84, 2);
  putBit(hmiW, 94, 1, true); putBit(hmiW, 94, 6, true); putI16(hmiW, 96, 4); putI16(hmiW, 98, 12); putI16(hmiW, 100, 1);
  // задвижки Н-1: г/п, всас, нагнетание открыты
  const open = [1, 2, 3, 13, 14, 15, 16];
  for (let i = 1; i <= 18; i++) demoValve(i, open.indexOf(i) >= 0 ? 1 : 0);
  // ГЦ-6 ремонт, Н-2 всас в местном
  demoValveBits(18, function (o) { putBit(hmiW, o + 1, 3, true); putI16(hmiW, o + 2, 4); });
  demoValveBits(8, function (o) { putBit(hmiW, o + 1, 1, true); });
  demoValve(12, 5);                              // Н-2 дренаж: нет концевиков — положение неизвестно
  putI16(hmiW, 56, 4);
  putReal(hmiW, 42, 85); putReal(hmiW, 46, 0);
}
function demoValveBits(i, fn) { fn(102 + (i - 1) * 4); }
function demoValve(i, state) {          // 0 закрыта, 1 открыта, 2 движение
  const o = 102 + (i - 1) * 4;
  putBit(hmiW, o, 0, state === 1); putBit(hmiW, o, 1, state === 0); putBit(hmiW, o, 2, state === 2);
  putBit(hmiW, o, 4, bitOf(hmiW, 50, 0));
  const rep = bitOf(hmiW, o + 1, 3), flt = bitOf(hmiW, o, 3);
  putI16(hmiW, o + 2, rep ? 4 : (flt ? 3 : state));
}
function demoSel() {
  const n = i16(hmiW, 174);
  if (n >= 1 && n <= 18) {
    const o = 102 + (n - 1) * 4;
    hmiW[89] = hmiW[o >> 1]; hmiW[90] = hmiW[(o >> 1) + 1];
    putI16(hmiW, 182, demo.travel[n] || 60); putI16(hmiW, 184, 100 + n * 7);
    const local = bitOf(hmiW, o + 1, 1), flt = bitOf(hmiW, o, 3), rep = bitOf(hmiW, o + 1, 3);
    putBit(hmiW, 186, 0, !bitOf(hmiW, 50, 0) && !local && !flt && !rep);
  }
}
function demoWrite(name, value) {
  const v = Array.isArray(value) ? value : [value];
  if (name === 'cmdAddr') {
    const gc = v[0] || 0, p1 = v[1] || 0, p2 = v[2] || 0;
    if (gc === 10) putBit(hmiW, 50, 0, true);
    if (gc === 11) { putBit(hmiW, 50, 0, false); }
    if (gc === 1) putBit(hmiW, 50, 1, true);
    if (gc === 2) putBit(hmiW, 50, 1, false);
    if (gc === 4 || gc === 8) putBit(hmiW, 227, 4, false);
    if (gc === 4) for (let i = 1; i <= 18; i++) { const o = 102 + (i - 1) * 4; putBit(hmiW, o, 3, false); putBit(hmiW, o, 5, false); }
    [p1, p2].forEach(function (c, k) {
      const o = 70 + k * 16;
      if (c === 1) { putBit(hmiW, o + 8, 0, true); putI16(hmiW, o + 14, 2); putI16(hmiW, o + 10, 5); }
      if (c === 2) { putBit(hmiW, o + 8, 0, false); putI16(hmiW, o + 14, 1); putI16(hmiW, o + 10, 4); }
      if (c === 4) { putI16(hmiW, o + 2, 0); }
    });
  } else if (name === 'selAddr') {
    putI16(hmiW, 174, v[0]);
    const n = v[0], c = v[1] || 0, o = 102 + (n - 1) * 4;
    if (c >= 1001 && c <= 1600) demo.travel[n] = c - 1000;
    if (c === 1 || c === 2) {
      demoValve(n, 2);
      demo.moving[n] = { to: c === 1 ? 1 : 0, at: Date.now() + 3000 };
    }
    if (c === 4) { putBit(hmiW, o, 3, false); putBit(hmiW, o, 5, false); demoValve(n, bitOf(hmiW, o, 0) ? 1 : 0); }
    demoSel();
  } else if (name === 'speedAddr') {
    for (let i = 0; i < 4; i++) hmiW[21 + i] = v[i] & 0xFFFF;
  } else if (name === 'setAddr') {
    for (let i = 0; i < SET_WORDS; i++) setW[i] = v[i] & 0xFFFF;
    for (let k = 1; k <= 6; k++) {
      const o = 102 + (12 + k - 1) * 4;
      putBit(hmiW, o + 1, 3, bitOf(setW, 44, 1 + k));
      demoValve(12 + k, bitOf(hmiW, o, 0) ? 1 : 0);
    }
    for (let n = 1; n <= 2; n++) {
      const o = 70 + (n - 1) * 16;
      const rep = bitOf(setW, 44, n - 1);
      putBit(hmiW, o + 9, 7, rep);
      putI16(hmiW, o + 14, rep ? 4 : (bitOf(hmiW, o + 8, 0) ? 2 : 1));
    }
  }
  decode(); req();
}
function demoTick() {
  demo.t += 0.5;
  const t = demo.t;
  putReal(hmiW, 58, 68 + 9 * Math.sin(t / 12) + 1.5 * Math.sin(t / 2.3));
  putReal(hmiW, 62, real(setW, 0) + 0.06 * Math.sin(t / 3.1));
  const spd = 78 + 6 * Math.sin(t / 9);
  putReal(hmiW, 66, spd);
  for (let n = 1; n <= 2; n++) {
    const run = bitOf(hmiW, 70 + (n - 1) * 16 + 8, 0);
    putReal(hmiW, 184 + n * 4, run ? 1.55 + 0.08 * Math.sin(t / 4 + n) : 0.04);
    putBit(hmiW, 196, n - 1, true);
    putReal(hmiW, 194 + n * 4, 6.2 - 0.3 * n + 0.08 * Math.sin(t / 7 + n));
    putBit(hmiW, 206, n - 1, true);
    putReal(hmiW, 204 + n * 4, 2.4 + 0.1 * n + 0.05 * Math.sin(t / 5 + n));   // давление гидроподпора
    putReal(hmiW, 212 + n * 4, 11.5 - n + 0.4 * Math.sin(t / 6 + n));          // расход гидроподпора
    putBit(hmiW, 224, n - 1, true); putBit(hmiW, 224, n + 1, true);
  }
  if (bitOf(hmiW, 78, 0)) putReal(hmiW, 74, spd); else putReal(hmiW, 74, 0);
  // уровень выше H — предупреждение
  putBit(hmiW, 52, 3, real(hmiW, 58) > 85);
  const now = Date.now();
  Object.keys(demo.moving).forEach(function (k) {
    const m = demo.moving[k];
    if (now >= m.at) { demoValve(+k, m.to); delete demo.moving[k]; }
  });
  demoSel();
  lastUpdate = now; updates++;
  decode();
}

// ---------------------------------------------------------------- запуск
function start() {
  screenInit();
  subscribeMain();
  if (DEMO) { demoInit(); demoTick(); onDataUpdate(); setInterval(function () { demoTick(); onDataUpdate(); req(); }, 500); }
  if (!SI.headless) setInterval(function () { ui.blink = !ui.blink; req(); }, 600);
  draw();
}

// ---------------------------------------------------------------- сброс всех аварий
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function resetAll() {
  logEvent('Оператор: сброс аварий');
  await write(cfg.cmdAddr, [4, 4, 4], 'cmdAddr');          // ГЦУ + линии Н-1, Н-2 (ПЧ и их задвижки)
  for (let i = 1; i <= 18; i++) {
    if (S.valve[i].fault) { await sleep(300); await write(cfg.selAddr, [i, 4], 'selAddr'); }
  }
  toast('Сброс аварий отправлен');
}

// переход в базовое окно через системный регистр LW-9050 (config winAddr: Local HMI, LW 9050) — необязательно
function goWindow(n) { write(cfg.winAddr, [n], 'winAddr'); }
// общие ключи хранилища: активные тревоги {текст: {t, c, ack}} — ведёт регистратор
const ACT_KEY = 'gcu_act';
function two(n) { return (n < 10 ? '0' : '') + n; }
function fmtTime(t, withDate) {
  const d = new Date(t);
  return (withDate ? two(d.getDate()) + '.' + two(d.getMonth() + 1) + ' ' : '') + two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds());
}

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

start();
