// =====================================================================
//  ГЦУ-1 · Входы и выходы DI/DO/AI/AO (окно 17)
//  JS Object для Weintek cMT X (EasyBuilder Pro >= 6.09). Версия 2.5 · 2026-10-24
//  Собрано из src/core.js + src/scr_io.js (build.py). Вставлять целиком. Сжат (без отступов) — читаемый код в src/.
//  Конфигурация — hmi/js/config_io.json (кнопка «Шаблон…»).
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
const VALVE_NAMES = [
'', 'Н-1 гидроподпор', 'Н-1 всас', 'Н-1 нагнетание', 'Н-1 промывка', 'Н-1 размывка', 'Н-1 дренаж',
'Н-2 гидроподпор', 'Н-2 всас', 'Н-2 нагнетание', 'Н-2 промывка', 'Н-2 размывка', 'Н-2 дренаж',
'ГЦ-1 подача', 'ГЦ-2 подача', 'ГЦ-3 подача', 'ГЦ-4 подача', 'ГЦ-5 подача', 'ГЦ-6 подача'
];
const VALVE_STATE = ['ЗАКРЫТА', 'ОТКРЫТА', 'В ДВИЖЕНИИ', 'АВАРИЯ', 'РЕМОНТ', 'НЕИЗВЕСТНО'];
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
const ALM_DEF = [
['A', 'Уровнемер зумпфа неисправен'], ['W', 'Датчик давления на циклонах неисправен'],
['A', 'Уровень зумпфа аварийно высокий (HH)'], ['W', 'Уровень зумпфа высокий (H)'],
['W', 'Уровень зумпфа низкий (L)'], ['A', 'Уровень зумпфа аварийно низкий (LL)'],
['W', 'Уровень выше уставки, все циклоны открыты'], ['W', 'Уровень ниже уставки при минимуме циклонов'],
['A', 'Насос Н-1: авария'], ['A', 'Насос Н-2: авария'], ['E', 'Сработал АВР насосов'],
['A', 'Нет готового насоса, ГЦУ остановлена'], ['A', 'Авария задвижки гидроциклона'],
['A', 'Аварийный стоп по уровню зумпфа'], ['A', 'Аварийный стоп ГЦУ (после отжатия кнопки — СБРОС)']
];
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
s.hasLine = DEMO || hasExt || hmiLen >= 99;
s.line = [null, { p: real(hmiW, 188), ok: bitOf(hmiW, 196, 0) }, { p: real(hmiW, 192), ok: bitOf(hmiW, 196, 1) }];
s.hasAir = DEMO || hasExt || hmiLen >= 104;
s.air = [null, { p: real(hmiW, 198), ok: bitOf(hmiW, 206, 0) }, { p: real(hmiW, 202), ok: bitOf(hmiW, 206, 1) }];
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
function cmdGcu(c) { write(cfg.cmdAddr, [c], 'cmdAddr'); }
function cmdPump(n, c) { write(cfg.cmdAddr, n === 1 ? [0, c] : [0, 0, c], 'cmdAddr'); }
function selectValve(n) { write(cfg.selAddr, [n, 0], 'selAddr'); }
function cmdValve(n, c) {
write(cfg.selAddr, [n, c], 'selAddr');
if (c > 1000) logEvent('Изменено: ' + VALVE_NAMES[n] + ' — время хода = ' + (c - 1000) + ' с');
}
function setManSpeed(n, v) {
const tmp = hmiW.slice();
putReal(tmp, n === 1 ? 42 : 46, v);
write(cfg.speedAddr, [tmp[21], tmp[22], tmp[23], tmp[24]], 'speedAddr');
}
function writeSet(mutator) {
if (!hasSet && !DEMO) { toast('Уставки ещё не прочитаны из ПЛК'); return; }
const copy = setW.slice();
mutator(copy);
write(cfg.setAddr, copy, 'setAddr');
}
function setI16(off, v) { writeSet(function (a) { putI16(a, off, v); }); }
function setReal(off, v) { writeSet(function (a) { putReal(a, off, v); }); }
function setRepair(bit, val) { writeSet(function (a) { putBit(a, 44, bit, val); }); }
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
function viewColors(view, kind) {
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
function row(label, x, y, w, value, unit, valColor) {
text(label, x, y, 15, C.text2, 'left');
text(value + (unit ? ' ' + unit : ''), x + w, y, 16, valColor || C.text, 'right', true);
}
function editBox(id, x, y, w, h, value, unit, fn, enabled) {
const on = enabled !== false && !noData();
rrect(x, y, w, h, 3, on ? C.white : '#ECEDEA', on ? (ui.press === id ? C.ready : C.btnBorder) : C.panelBorder, ui.press === id ? 2 : 1);
text(value + ' ' + unit, x + w - 8, y + h / 2 + 1, 16, on ? C.ready : C.textDis, 'right', true);
if (on) {
line(x + 8, y + h - 7, x + 16, y + 7, C.ready, 2);
}
hit(x, y, w, h, on ? fn : function () { }, id);
}
function popupFrame(x, y, w, h, title, closable) {
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
if (p.idx === 2 || p.idx === 3 || p.idx === 8 || p.idx === 9) valveH(x + 16, y + 60, v.view);
else valveV(x + 24, y + 52, v.view);
const col = nd ? C.stop : valveCol(v.view);
statePlate(x + 76, y + 56, 308, 40, col, nd ? 'НЕТ ДАННЫХ' : (VALVE_STATE[v.view] || '?'), nd || v.view === 0 || v.view === 2 || v.view === 4 || v.view === 5, v.view === 4);
text('Управление:', x + 16, y + 118, 15, C.text2);
text(nd ? '—' : (v.local ? 'МЕСТНОЕ' : 'ДИСТАНЦИЯ'), x + 106, y + 118, 15, v.local ? C.move : C.text, 'left', true);
text('ГЦУ:', x + 230, y + 118, 15, C.text2);
text(nd ? '—' : (S.st.auto ? 'АВТОМАТ' : 'РУЧНОЙ'), x + 268, y + 118, 15, S.st.auto ? C.run : C.ready, 'left', true);
text('Время хода', x + 16, y + 146, 15, C.text2);
editBox('vTr', x + 102, y + 132, 86, 28, selOk && !nd ? String(S.selTravel) : '—', 'с', function () {
withAccess(function () {
keypad(VALVE_NAMES[p.idx] + ': время хода, с', S.selTravel, 1, 600, 0, function (v) { cmdValve(p.idx, 1000 + v); }, { noLog: true });
});
}, selOk && !nd);
text('Циклов: ' + (selOk && !nd ? S.selCycles : '—'), x + 200, y + 146, 15, C.text2);
faultRow(x + 16, y + 164, v.fltTravel, 'Превышено время хода');
faultRow(x + 16, y + 190, v.fltLimits, 'Неисправность концевиков');
faultRow(x + 16, y + 216, v.fltSwitch, 'Неисправность местного переключателя');
faultRow(x + 16, y + 242, v.fltSignal, 'Недостоверный сигнал');
const can = DEMO ? (selOk && S.selCanCmd) : (selOk && S.selCanCmd);
const why = nd ? 'Нет данных от ПЛК' : (S.st.auto ? 'В АВТОМАТЕ задвижкой управляет ГЦУ' :
(v.local ? 'Задвижка в МЕСТНОМ управлении' : (v.fault ? 'Сначала сбросьте аварию' : 'Команда недоступна')));
if (!can && !nd) text(why, x + w / 2, y + 282, 13, C.text2, 'center');
button('vOpen', x + 16, y + 300, 116, 44, 'ОТКРЫТЬ', { enabled: can, why: why }, function () { cmdValve(p.idx, 1); });
button('vClose', x + 142, y + 300, 116, 44, 'ЗАКРЫТЬ', { enabled: can, why: why }, function () { cmdValve(p.idx, 2); });
button('vReset', x + 268, y + 300, 116, 44, 'СБРОС', { enabled: !nd }, function () { cmdValve(p.idx, 4); toast('Сброс аварии задвижки отправлен'); });
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
const f = [];
if (!nd) {
if (p.fltDrive) f.push('авария ПЧ'); if (p.fltComm) f.push('нет связи'); if (p.fltStart) f.push('не запустился');
if (p.fltStop) f.push('не остановился'); if (p.fltUnxStart) f.push('самопр. пуск'); if (p.fltUnxStop) f.push('самопр. останов');
}
textFit(f.length ? 'Аварии ПЧ: ' + f.join(', ') : 'Аварий частотника нет', x + 16, yy, w - 32, 14, f.length ? C.alarm : C.text2, 'left', f.length > 0);
yy += 30;
const man = !nd && !S.st.auto;
text('Ручное задание', x + 16, yy + 13, 15, C.text2);
editBox('eMan', x + w - 16 - 130, yy, 130, 28, nd ? '—' : fmt(S.manSpeed[n], 1), '%', function () {
keypad('Н-' + n + ': ручное задание скорости, %', S.manSpeed[n], 0, 100, 1, function (v) { setManSpeed(n, v); });
}, man);
if (!man && !nd) text('(в АВТОМАТЕ — от регулятора)', x + 132, yy + 13, 12, C.text2);
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
const LOG_KEY = 'gcu_log', LOG_MAX = 400;
function logEvent(textMsg, cat, state) {
const log = storeGet(LOG_KEY, []);
log.unshift({ t: Date.now(), c: cat || 'E', x: textMsg, s: state || 'evt' });
if (log.length > LOG_MAX) log.length = LOG_MAX;
storeSet(LOG_KEY, log);
}
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
function wordsFrom(data, n) {
const out = new Array(n).fill(0);
if (data && data.values) for (let i = 0; i < n && i < data.values.length; i++) out[i] = data.values[i] & 0xFFFF;
return out;
}
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
if (cfg.hmiSub) {
cfg.hmiSub.onResponse(onHmi);
if (cfg.hmiSub.latestData) onHmi(undefined, cfg.hmiSub.latestData);
} else poll(cfg.cmdAddr, 94, 500, function (w) { onHmi(undefined, { values: w }); }, onErr);
if (cfg.setSub) {
cfg.setSub.onResponse(onSet);
if (cfg.setSub.latestData) onSet(undefined, cfg.setSub.latestData);
} else poll(cfg.setAddr, SET_WORDS, 2000, function (w) { onSet(undefined, { values: w }); }, onErr);
}
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
putI16(hmiW, 70, 100); putBit(hmiW, 78, 0, true); putBit(hmiW, 78, 1, true); putBit(hmiW, 78, 3, true); putBit(hmiW, 78, 6, true);
putBit(hmiW, 79, 5, true); putBit(hmiW, 79, 6, true); putI16(hmiW, 80, 5); putI16(hmiW, 82, 37); putI16(hmiW, 84, 2);
putBit(hmiW, 94, 1, true); putBit(hmiW, 94, 6, true); putI16(hmiW, 96, 4); putI16(hmiW, 98, 12); putI16(hmiW, 100, 1);
const open = [1, 2, 3, 13, 14, 15, 16];
for (let i = 1; i <= 18; i++) demoValve(i, open.indexOf(i) >= 0 ? 1 : 0);
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
function start() {
screenInit();
subscribeMain();
if (DEMO) { demoInit(); demoTick(); onDataUpdate(); setInterval(function () { demoTick(); onDataUpdate(); req(); }, 500); }
if (!SI.headless) setInterval(function () { ui.blink = !ui.blink; req(); }, 600);
draw();
}
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
async function resetAll() {
logEvent('Оператор: сброс аварий');
await write(cfg.cmdAddr, [4, 4, 4], 'cmdAddr');          // ГЦУ + линии Н-1, Н-2 (ПЧ и их задвижки)
for (let i = 1; i <= 18; i++) {
if (S.valve[i].fault) { await sleep(300); await write(cfg.selAddr, [i, 4], 'selAddr'); }
}
toast('Сброс аварий отправлен');
}
function goWindow(n) { write(cfg.winAddr, [n], 'winAddr'); }
const ACT_KEY = 'gcu_act';
function two(n) { return (n < 10 ? '0' : '') + n; }
function fmtTime(t, withDate) {
const d = new Date(t);
return (withDate ? two(d.getDate()) + '.' + two(d.getMonth() + 1) + ' ' : '') + two(d.getHours()) + ':' + two(d.getMinutes()) + ':' + two(d.getSeconds());
}
const SIG = {"DI": [["%I32.4", "Н1 гидроподпор: концевик ОТКРЫТА", "Гидроподпор 34.4 Открыт"], ["%I32.5", "Н1 гидроподпор: концевик ЗАКРЫТА", "Гидроподпор 34.4 Закрыт"], ["%I36.4", "Н1 гидроподпор: переключатель ОТКРЫТЬ (местн.)", "Y11.1 (CH23) Гидроподпор 34.4 ключ Открыть"], ["%I36.5", "Н1 гидроподпор: переключатель ЗАКРЫТЬ (местн.)", "Y11.2 (CH24) Гидроподпор 34.4 ключ Закрыть"], ["%I31.4", "Н1 всас: концевик ОТКРЫТА", "Всас 34.4 Открыт"], ["%I31.5", "Н1 всас: концевик ЗАКРЫТА", "Всас 34.4 Закрыт"], ["%I35.4", "Н1 всас: переключатель ОТКРЫТЬ (местн.)", "Y7.1 (CH15) Всас 36.4 ключ Открыть"], ["%I35.5", "Н1 всас: переключатель ЗАКРЫТЬ (местн.)", "Y7.2 (CH16) Всас 36.4 ключ Закрыть"], ["%I32.0", "Н1 нагнетание: концевик ОТКРЫТА", "Нагнетание 34.4 Открыт"], ["%I32.1", "Н1 нагнетание: концевик ЗАКРЫТА", "Нагнетание 34.4 Закрыт"], ["%I36.0", "Н1 нагнетание: переключатель ОТКРЫТЬ (местн.)", "Y9.1 (CH19) Нагнетание 34.4 ключ Открыть"], ["%I36.1", "Н1 нагнетание: переключатель ЗАКРЫТЬ (местн.)", "Y9.2 (CH20) Нагнетание 34.4 ключ Закрыть"], ["%I30.4", "Н1 промывка: концевик ОТКРЫТА", "Промывка 34.4 Открыт"], ["%I30.5", "Н1 промывка: концевик ЗАКРЫТА", "Промывка 34.4 Закрыт"], ["%I34.4", "Н1 промывка: переключатель ОТКРЫТЬ (местн.)", "Y3.1 (CH7) Промывка 36.4 ключ Открыть"], ["%I34.5", "Н1 промывка: переключатель ЗАКРЫТЬ (местн.)", "Y3.2 (CH8) Промывка 36.4 ключ Закрыть"], ["%I31.0", "Н1 размывка: концевик ОТКРЫТА", "Размывка 34.4 Открыт"], ["%I31.1", "Н1 размывка: концевик ЗАКРЫТА", "Размывка 34.4 Закрыт"], ["%I35.0", "Н1 размывка: переключатель ОТКРЫТЬ (местн.)", "Y5.1 (CH11) Размывка 36.4 ключ Открыть"], ["%I35.1", "Н1 размывка: переключатель ЗАКРЫТЬ (местн.)", "Y5.2 (CH12) Размывка 36.4 ключ Закрыть"], ["%I30.0", "Н1 дренаж: концевик ОТКРЫТА", "Дренаж 34.4 Открыт"], ["%I30.1", "Н1 дренаж: концевик ЗАКРЫТА", "Дренаж 34.4 Закрыт"], ["%I34.0", "Н1 дренаж: переключатель ОТКРЫТЬ (местн.)", "Y1.1 (CH3) Дренаж 36.4 ключ Открыть"], ["%I34.1", "Н1 дренаж: переключатель ЗАКРЫТЬ (местн.)", "Y1.2 (CH4) Дренаж 36.4 ключ Закрыть"], ["%I32.6", "Н2 гидроподпор: концевик ОТКРЫТА", "Гидроподпор 34.5 Открыт"], ["%I32.7", "Н2 гидроподпор: концевик ЗАКРЫТА", "Гидроподпор 34.5 Закрыт"], ["%I36.6", "Н2 гидроподпор: переключатель ОТКРЫТЬ (местн.)", "Y12.1 (CH25) Гидроподпор 34.5 ключ Открыть"], ["%I36.7", "Н2 гидроподпор: переключатель ЗАКРЫТЬ (местн.)", "Y12.2 (CH26) Гидроподпор 34.5 ключ Закрыть"], ["%I31.6", "Н2 всас: концевик ОТКРЫТА", "Всас 34.5 Открыт"], ["%I31.7", "Н2 всас: концевик ЗАКРЫТА", "Всас 34.5 Закрыт"], ["%I35.6", "Н2 всас: переключатель ОТКРЫТЬ (местн.)", "Y8.1 (CH17) Всас 36.5 ключ Открыть"], ["%I35.7", "Н2 всас: переключатель ЗАКРЫТЬ (местн.)", "Y8.2 (CH18) Всас 36.5 ключ Закрыть"], ["%I32.2", "Н2 нагнетание: концевик ОТКРЫТА", "Нагнетание 34.5 Открыт"], ["%I32.3", "Н2 нагнетание: концевик ЗАКРЫТА", "Нагнетание 34.5 Закрыт"], ["%I36.2", "Н2 нагнетание: переключатель ОТКРЫТЬ (местн.)", "Y10.1 (CH21) Нагнетание 34.5 ключ Открыть"], ["%I36.3", "Н2 нагнетание: переключатель ЗАКРЫТЬ (местн.)", "Y10.2 (CH22) Нагнетание 34.5 ключ Закрыть"], ["%I30.6", "Н2 промывка: концевик ОТКРЫТА", "Промывка 34.5 Открыт"], ["%I30.7", "Н2 промывка: концевик ЗАКРЫТА", "Промывка 34.5 Закрыт"], ["%I34.6", "Н2 промывка: переключатель ОТКРЫТЬ (местн.)", "Y4.1 (CH9) Промывка 36.5 ключ Открыть"], ["%I34.7", "Н2 промывка: переключатель ЗАКРЫТЬ (местн.)", "Y4.2 (CH10) Промывка 36.5 ключ Закрыть"], ["%I31.2", "Н2 размывка: концевик ОТКРЫТА", "Размывка 34.5 Открыт"], ["%I31.3", "Н2 размывка: концевик ЗАКРЫТА", "Размывка 34.5 Закрыт"], ["%I35.2", "Н2 размывка: переключатель ОТКРЫТЬ (местн.)", "Y6.1 (CH13) Размывка 36.5 ключ Открыть"], ["%I35.3", "Н2 размывка: переключатель ЗАКРЫТЬ (местн.)", "Y6.2 (CH14) Размывка 36.5 ключ Закрыть"], ["%I30.2", "Н2 дренаж: концевик ОТКРЫТА", "Дренаж 34.5 Открыт"], ["%I30.3", "Н2 дренаж: концевик ЗАКРЫТА", "Дренаж 34.5 Закрыт"], ["%I34.2", "Н2 дренаж: переключатель ОТКРЫТЬ (местн.)", "Y2.1 (CH5) Дренаж 36.5 ключ Открыть"], ["%I34.3", "Н2 дренаж: переключатель ЗАКРЫТЬ (местн.)", "Y2.2 (CH6) Дренаж 36.5 ключ Закрыть"], ["%I71.0", "ГЦ1: концевик ОТКРЫТА", "Задвижка №1 ГЦ-28-4 Открыт"], ["%I71.1", "ГЦ1: концевик ЗАКРЫТА", "Задвижка №1 ГЦ-28-4 Закрыт"], ["%I73.0", "ГЦ1: переключатель ОТКРЫТЬ (местн.)", "Y1.1 (CH3) Задвижка №1 ключ Открыть"], ["%I73.1", "ГЦ1: переключатель ЗАКРЫТЬ (местн.)", "Y1.2 (CH4) Задвижка №1 ключ Закрыть"], ["%I71.2", "ГЦ2: концевик ОТКРЫТА", "Задвижка №2 ГЦ-28-4 Открыт"], ["%I71.3", "ГЦ2: концевик ЗАКРЫТА", "Задвижка №2 ГЦ-28-4 Закрыт"], ["%I73.2", "ГЦ2: переключатель ОТКРЫТЬ (местн.)", "Y2.1 (CH5) Задвижка №2 ключ Открыть"], ["%I73.3", "ГЦ2: переключатель ЗАКРЫТЬ (местн.)", "Y2.2 (CH6) Задвижка №2 ключ Закрыть"], ["%I71.4", "ГЦ3: концевик ОТКРЫТА", "Задвижка №3 ГЦ-28-4 Открыт"], ["%I71.5", "ГЦ3: концевик ЗАКРЫТА", "Задвижка №3 ГЦ-28-4 Закрыт"], ["%I73.4", "ГЦ3: переключатель ОТКРЫТЬ (местн.)", "Y3.1 (CH7) Задвижка №3 ключ Открыть"], ["%I73.5", "ГЦ3: переключатель ЗАКРЫТЬ (местн.)", "Y3.2 (CH8) Задвижка №3 ключ Закрыть"], ["%I71.6", "ГЦ4: концевик ОТКРЫТА", "Задвижка №4 ГЦ-28-4 Открыт"], ["%I71.7", "ГЦ4: концевик ЗАКРЫТА", "Задвижка №4 ГЦ-28-4 Закрыт"], ["%I73.6", "ГЦ4: переключатель ОТКРЫТЬ (местн.)", "Y4.1 (CH9) Задвижка №4 ключ Открыть"], ["%I73.7", "ГЦ4: переключатель ЗАКРЫТЬ (местн.)", "Y4.2 (CH10) Задвижка №4 ключ Закрыть"], ["%I72.0", "ГЦ5: концевик ОТКРЫТА", "Задвижка №5 ГЦ-28-4 Открыт"], ["%I72.1", "ГЦ5: концевик ЗАКРЫТА", "Задвижка №5 ГЦ-28-4 Закрыт"], ["%I74.0", "ГЦ5: переключатель ОТКРЫТЬ (местн.)", "Y5.1 (CH11) Задвижка №5 ключ Открыть"], ["%I74.1", "ГЦ5: переключатель ЗАКРЫТЬ (местн.)", "Y5.2 (CH12) Задвижка №5 ключ Закрыть"], ["%I72.2", "ГЦ6: концевик ОТКРЫТА", "Задвижка №6 ГЦ-28-4 Открыт"], ["%I72.3", "ГЦ6: концевик ЗАКРЫТА", "Задвижка №6 ГЦ-28-4 Закрыт"], ["%I74.2", "ГЦ6: переключатель ОТКРЫТЬ (местн.)", "Y6.1 (CH12) Задвижка №6 ключ Открыть"], ["%I74.3", "ГЦ6: переключатель ЗАКРЫТЬ (местн.)", "Y6.2 (CH13) Задвижка №6 ключ Закрыть"], ["%I37.4", "Аварийный стоп (пульт ГЦУ), 1 = нажат", "Аварийный стоп"], ["%I74.7", "Аварийный стоп (шкаф гидроциклонов), 1 = нажат", "Аварийный стоп(1)"], ["%I4.0", "Пульподелитель задв. №1: концевик ОТКРЫТА", "Пульподелитель. Задвижка №1 Открыт"], ["%I4.1", "Пульподелитель задв. №1: концевик ЗАКРЫТА", "Пульподелитель. Задвижка №1 Закрыт"], ["%I4.2", "Пульподелитель задв. №2: концевик ОТКРЫТА", "Пульподелитель. Задвижка №2 Открыт"], ["%I4.3", "Пульподелитель задв. №2: концевик ЗАКРЫТА", "Пульподелитель. Задвижка №2 Закрыт"], ["%I4.4", "Пульподелитель задв. №3: концевик ОТКРЫТА", "Пульподелитель. Задвижка №3 Открыт"], ["%I4.5", "Пульподелитель задв. №3: концевик ЗАКРЫТА", "Пульподелитель. Задвижка №3 Закрыт"], ["%I37.0", "Пульт ГЦУ: ИБП включено", "ИБП включено"], ["%I37.1", "Пульт ГЦУ: дверь закрыта", "Дверь закрыта"], ["%I37.2", "Пульт ГЦУ: реле давления воздуха", "Реле давления пульта"], ["%I37.3", "Пульт ГЦУ: дистанционный режим", "Дистанционный режим"], ["%I74.4", "Шкаф гидроциклонов: ИБП включено", "ИБП включено(1)"], ["%I74.5", "Шкаф гидроциклонов: дверь закрыта", "Дверь закрыта(1)"], ["%I74.6", "Шкаф гидроциклонов: реле давления воздуха", "Реле давления пульта(1)"], ["%I0.0", "Шкаф ПЛК: R3 от ИБП", "R3 от ИБП"], ["%I0.1", "Шкаф ПЛК: R2 от ИБП", "R2 от ИБП"], ["%I0.2", "Шкаф ПЛК: от ИБП, работа от батареи", "От ИБП, работа от батареи"], ["%I0.3", "Шкаф ПЛК: от ИБП, работа от батареи(1)", "От ИБП, работа от батареи(1)"], ["%I0.4", "Шкаф ПЛК: R4 от ИБП", "R4 от ИБП"], ["%I0.5", "Шкаф ПЛК: I/P2 от ИБП", "I/P2 от ИБП"], ["%I0.6", "Шкаф ПЛК: дверь открыта", "Дверь открыта"], ["%I0.7", "Шкаф ПЛК: включение общего +24В ХТ4.1", "Включение общего +24В на клемнике ХТ4.1"], ["%I1.0", "Аварийный стоп шкаф ПЛК (НО)", "Аварийный стоп шкаф PLC"], ["%I1.1", "Аварийный стоп панель HMI (НО)", "Аварийный стоп панель HMI"], ["%I1.2", "Система густой смазки М-2", "Система густой смазки М-2"], ["%I1.3", "Система густой смазки М-3", "Система густой смазки М-3"]], "DO": [["%Q13.4", "Н1 гидроподпор: ОТКРЫТЬ", "Y11.1 (CH23) Гидроподпор 34.4 Открыть"], ["%Q13.5", "Н1 гидроподпор: ЗАКРЫТЬ", "Y11.2 (CH24) Гидроподпор 34.4 Закрыть"], ["%Q12.4", "Н1 всас: ОТКРЫТЬ", "Y7.1 (CH15) Всас 36.4 Открыть"], ["%Q12.5", "Н1 всас: ЗАКРЫТЬ", "Y7.2 (CH16) Всас 36.4 Закрыть"], ["%Q13.0", "Н1 нагнетание: ОТКРЫТЬ", "Y9.1 (CH19) Нагнетание 34.4 Открыть"], ["%Q13.1", "Н1 нагнетание: ЗАКРЫТЬ", "Y9.2 (CH20) Нагнетание 34.4 Закрыть"], ["%Q11.4", "Н1 промывка: ОТКРЫТЬ", "Y3.1 (CH7) Промывка 36.4 Открыть"], ["%Q11.5", "Н1 промывка: ЗАКРЫТЬ", "Y3.2 (CH8) Промывка 36.4 Закрыть"], ["%Q12.0", "Н1 размывка: ОТКРЫТЬ", "Y5.1 (CH11) Размывка 36.4 Открыть"], ["%Q12.1", "Н1 размывка: ЗАКРЫТЬ", "Y5.2 (CH12) Размывка 36.4 Закрыть"], ["%Q11.0", "Н1 дренаж: ОТКРЫТЬ", "Y1.1 (CH3) Дренаж 36.4 Открыть"], ["%Q11.1", "Н1 дренаж: ЗАКРЫТЬ", "Y1.2 (CH4) Дренаж 36.4 Закрыть"], ["%Q13.6", "Н2 гидроподпор: ОТКРЫТЬ", "Y12.1 (CH25) Гидроподпор 34.5 Открыть"], ["%Q13.7", "Н2 гидроподпор: ЗАКРЫТЬ", "Y12.2 (CH26) Гидроподпор 34.5 Закрыть"], ["%Q12.6", "Н2 всас: ОТКРЫТЬ", "Y8.1 (CH17) Всас 36.5 Открыть"], ["%Q12.7", "Н2 всас: ЗАКРЫТЬ", "Y8.2 (CH18) Всас 36.5 Закрыть"], ["%Q13.2", "Н2 нагнетание: ОТКРЫТЬ", "Y10.1 (CH21) Нагнетание 34.5 Открыть"], ["%Q13.3", "Н2 нагнетание: ЗАКРЫТЬ", "Y10.2 (CH22) Нагнетание 34.5 Закрыть"], ["%Q11.6", "Н2 промывка: ОТКРЫТЬ", "Y4.1 (CH9) Промывка 36.5 Открыть"], ["%Q11.7", "Н2 промывка: ЗАКРЫТЬ", "Y4.2 (CH10) Промывка 36.5 Закрыть"], ["%Q12.2", "Н2 размывка: ОТКРЫТЬ", "Y6.1 (CH13) Размывка 36.5 Открыть"], ["%Q12.3", "Н2 размывка: ЗАКРЫТЬ", "Y6.2 (CH14) Размывка 36.5 Закрыть"], ["%Q11.2", "Н2 дренаж: ОТКРЫТЬ", "Y2.1 (CH5) Дренаж 36.5 Открыть"], ["%Q11.3", "Н2 дренаж: ЗАКРЫТЬ", "Y2.2 (CH6) Дренаж 36.5 Закрыть"], ["%Q24.0", "ГЦ1: ОТКРЫТЬ", "Y1.1 (CH3) Задвижка №1  Открыть"], ["%Q24.1", "ГЦ1: ЗАКРЫТЬ", "Y1.2 (CH4) Задвижка №1  Закрыть"], ["%Q24.2", "ГЦ2: ОТКРЫТЬ", "Y2.1 (CH5) Задвижка №2  Открыть"], ["%Q24.3", "ГЦ2: ЗАКРЫТЬ", "Y2.2 (CH6) Задвижка №2  Закрыть"], ["%Q24.4", "ГЦ3: ОТКРЫТЬ", "Y3.1 (CH7) Задвижка №3  Открыть"], ["%Q24.5", "ГЦ3: ЗАКРЫТЬ", "Y3.2 (CH8) Задвижка №3  Закрыть"], ["%Q24.6", "ГЦ4: ОТКРЫТЬ", "Y4.1 (CH9) Задвижка №4  Открыть"], ["%Q24.7", "ГЦ4: ЗАКРЫТЬ", "Y4.2 (CH10) Задвижка №4  Закрыть"], ["%Q25.0", "ГЦ5: ОТКРЫТЬ", "Y5.1 (CH11) Задвижка №5  Открыть"], ["%Q25.1", "ГЦ5: ЗАКРЫТЬ", "Y5.2 (CH12) Задвижка №5  Закрыть"], ["%Q25.2", "ГЦ6: ОТКРЫТЬ", "Y6.1 (CH12) Задвижка №6  Открыть"], ["%Q25.3", "ГЦ6: ЗАКРЫТЬ", "Y6.2 (CH13) Задвижка №6  Закрыть"], ["%Q2.0", "Пульподелитель задв. №1: ОТКРЫТЬ", "Пульподелитель. Задвижка №1 Открыть"], ["%Q2.1", "Пульподелитель задв. №1: ЗАКРЫТЬ", "Пульподелитель. Задвижка №1 Закрыть"], ["%Q2.2", "Пульподелитель задв. №2: ОТКРЫТЬ", "Пульподелитель. Задвижка №2 Открыть"], ["%Q2.3", "Пульподелитель задв. №2: ЗАКРЫТЬ", "Пульподелитель. Задвижка №2 Закрыть"], ["%Q2.4", "Пульподелитель задв. №3: ОТКРЫТЬ", "Пульподелитель. Задвижка №3 Открыть"], ["%Q2.5", "Пульподелитель задв. №3: ЗАКРЫТЬ", "Пульподелитель. Задвижка №3 Закрыть"], ["%Q0.0", "Световая сигнализация", "Световая сигнализация"], ["%Q0.1", "Звуковая сигнализация", "Звуковая сигнализация"]], "AI": [["%IW47", "Уровень зумпфа, %", "Уровень ЗУМПФ"], ["%IW81", "Давление на входе гидроциклонов, бар", "Датчик давления кластера"], ["%IW1002", "Производительность Н1 (ПЧ), %", "—"], ["%IW1052", "Производительность Н2 (ПЧ), %", "—"], ["%IW1006", "Ток Н1 (ПЧ), %", "—"], ["%IW1056", "Ток Н2 (ПЧ), %", "—"], ["%IW6", "Давление гидроподпора Н-1 (36.4)", "Датчик давления гидроподпора 36.4"], ["%IW8", "Давление гидроподпора Н-2 (36.5)", "Датчик давления гидроподпора 36.5"], ["%IW10", "Расход гидроподпора Н-1 (36.4)", "Датчик расхода гидроподпора 36.4"], ["%IW12", "Расход гидроподпора Н-2 (36.5)", "Датчик расхода гидроподпора 36.5"], ["%IW14", "Плотномер питания сгустителей Насоса №1(1)", "Плотномер питания сгустителей Насоса №1(1)"], ["%IW16", "Плотномер питания сгустителей Насоса №3(1)", "Плотномер питания сгустителей Насоса №3(1)"], ["%IW18", "Газоанализатор HCN МЛГ-20М (3 стадия)", "Газоанализатор HCN МЛГ-20М (3 стадия)"], ["%IW20", "Резерв AI", "Резерв(75)"], ["%IW43", "Давление линии нагнетания Н-1 (36.4), бар", "Датчик давления линии 36.4"], ["%IW45", "Давление линии нагнетания Н-2 (36.5), бар", "Датчик давления линии 36.5"], ["%IW39", "Давление воздуха (датчик давления пульта), бар", "Датчик давления пульта"], ["%IW77", "Давление воздуха (датчик давления пульта(1)), бар", "Датчик давления пульта(1)"]], "AO": [["%QW1002", "Н1 ПЧ: задание скорости, %", ""], ["%QW1052", "Н2 ПЧ: задание скорости, %", ""]]};
function screenInfo() { return { name: 'io', diag: [760, 64], demoChip: [600, 64] }; }
const IO_WORDS = 99;
const KINDS = ['', 'DI', 'DO', 'AI', 'AO'];
const KTITLE = ['', 'Диагностика дискретных входных сигналов. DI', 'Диагностика дискретных выходных сигналов. DO',
'Диагностика входных аналоговых сигналов. AI', 'Диагностика выходных аналоговых сигналов. AO'];
const BASE = [0, 14, 42, 62, 156];
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
poll(cfg.ioAddr, IO_WORDS, 500, function (w) {
ioW = w; hasIo = true;
const ack = i16(ioW, 12);
if (ioAckPrev !== null && ack !== ioAckPrev) toast('ПЛК принял изменение');
ioAckPrev = ack;
req();
}, function () { req(); });
}
const k0 = i16(ioW, 0), id0 = i16(ioW, 2);
if (k0 >= 1 && k0 <= 4 && id0 >= 1 && id0 <= SIG[KINDS[k0]].length) { sel.kind = k0; sel.id[k0] = id0; }
setTimeout(selectIo, 50);
}
function onDataUpdate() { }
function drawExtraPopup(p) { }
const RX = 24, RW = 600, VX = 330;
function lbl(s, y) { textFit(s, RX, y + 13, VX - RX - 10, 15, C.text, 'left'); }
function roBox(x, y, w, s, color) {
rrect(x, y, w, 26, 3, '#ECEDEA', C.panelBorder, 1);
textFit(s, x + w - 8, y + 14, w - 12, 15, color || C.text, 'right', true);
}
function edBox(id, x, y, w, name, label, dec, min, max, always) {
const v = g(name);
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
for (let k = 1; k <= 4; k++) {
button('tab' + k, 16 + (k - 1) * 138, 104, 130, 40, KINDS[k] + ' · ' + SIG[KINDS[k]].length, { active: sel.kind === k, style: 'blue', size: 16 }, (function (kk) {
return function () { if (sel.kind !== kk) { sel.kind = kk; selectIo(); } };
})(k));
}
if (!DEMO && !cfg.ioSub && !cfg.ioAddr) text('В Config нет ioAddr (DB102)', 580, 124, 14, C.alarm, 'left', true);
else if (!DEMO && !hasIo) text('Нет ответа от DB102 HMI_IO — загружен ли он в ПЛК?', 580, 124, 14, C.alarm, 'left', true);
fillRect(12, 152, 1000, 32, C.topBar);
text(KTITLE[sel.kind], 24, 168, 17, C.white, 'left', true);
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
start();
