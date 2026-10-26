// ================================================================ ЭКРАН ИЗ КОНСТРУКТОРА (hmi/constructor)
// Экран описан данными: const SCREEN = {...} в начале файла (его пишет конструктор).
// Здесь — универсальная «рисовалка» элементов, опрос DB ПЛК, запись тегов, свои всплывающие окна.
// Ядро (core.js) даёт: рисование, кнопки, клавиатуру, подтверждение, пароль, окна задвижки/насоса ГЦУ, демо-режим.
const HOST = (typeof __host !== 'undefined') ? __host : null;   // есть только в конструкторе (браузер)
const SIM = cfg.__sim === true;                                 // конструктор: демо ГЦУ + опрос эмулятора ПЛК
const ELS = SCREEN.els || [];
const POPS = SCREEN.pops || {};
const TAGS = SCREEN.tags || {};
const POLLS = SCREEN.polls || [];
const buf = {};                  // ключ опроса -> слова
const demoV = {};                // демо-значения тегов (запись в демо-режиме)
const hist = {};                 // история трендов: id -> {v: [[...], ...]}
let P = null;                    // параметр открытого своего окна (подставляется вместо #)
let GX = 0, GY = 0;              // смещение рисования (окно, группа)

function screenInfo() {
  const o = SCREEN.opt || {};
  return { name: 'custom', diag: o.diag || null, demoChip: o.demoChip || null, noCommBar: !!o.noCommBar };
}
function onDataUpdate() { }

// ---------------------------------------------------------------- теги
function subst(s) {
  if (s === undefined || s === null) return '';
  s = String(s);
  return (P !== null && s.indexOf('#') >= 0) ? s.split('#').join(String(P)) : s;
}
function num(v) { return +subst(v); }
function pathVal(o, path) {
  const parts = path.split('.');
  for (let i = 0; i < parts.length; i++) { if (o === null || o === undefined) return undefined; o = o[parts[i]]; }
  if (typeof o === 'boolean') return o ? 1 : 0;
  return (typeof o === 'number') ? o : undefined;
}
// gcu:путь — данные ГЦУ из DB100/DB101 (разбирает ядро), gcuset:поле — уставка DB101, gcuspd:n — ручное задание
function gcuVal(path) { return noData() ? undefined : pathVal(S, path); }
function sc(t, v, back) {
  const k = t.sc;
  if (!k || k[1] === k[0]) return v;
  return back ? k[0] + (v - k[2]) * (k[1] - k[0]) / (k[3] - k[2]) : k[2] + (v - k[0]) * (k[3] - k[2]) / (k[1] - k[0]);
}
function decodeTag(w, t) {
  switch (t.t) {
    case 'bool': return bitOf(w, t.o, t.b || 0) ? 1 : 0;
    case 'byte': return byteOf(w, t.o);
    case 'sint': { const b = byteOf(w, t.o); return b >= 128 ? b - 256 : b; }
    case 'int': return i16(w, t.o);
    case 'uint': case 'word': return wordOf(w, t.o);
    case 'dint': { const v = wordOf(w, t.o) * 65536 + wordOf(w, t.o + 2); return v >= 2147483648 ? v - 4294967296 : v; }
    case 'udint': case 'dword': return wordOf(w, t.o) * 65536 + wordOf(w, t.o + 2);
    case 'real': return real(w, t.o);
  }
  return undefined;
}
function encodeTag(w, t, v) {         // в массив слов w (смещение t.o внутри массива)
  switch (t.t) {
    case 'bool': putBit(w, t.o, t.b || 0, !!v); break;
    case 'byte': case 'sint': {
      const i = t.o >> 1, even = (t.o & 1) === 0, hi = HI_FIRST ? even : !even;
      const ww = wordOf(w, t.o & ~1), b = Math.round(v) & 0xFF;
      w[i] = hi ? ((ww & 0x00FF) | (b << 8)) : ((ww & 0xFF00) | b);
      break;
    }
    case 'int': case 'uint': case 'word': w[t.o >> 1] = Math.round(v) & 0xFFFF; break;
    case 'dint': case 'udint': case 'dword': {
      let u = Math.round(v); if (u < 0) u += 4294967296;
      w[t.o >> 1] = Math.floor(u / 65536) & 0xFFFF; w[(t.o >> 1) + 1] = u & 0xFFFF; break;
    }
    case 'real': putReal(w, t.o, v); break;
  }
}
function demoTag(name, t) {
  if (Object.prototype.hasOwnProperty.call(demoV, name)) return demoV[name];
  const d = +t.d || 0, n = Date.now();
  if (t.ds === 'sin') return d + (+t.da || 10) * Math.sin(n / 4000);
  if (t.ds === 'blink') return Math.floor(n / 2000) % 2;
  if (t.ds === 'ramp') return d + ((n / 200) % (+t.da || 100));
  return d;
}
function tagVal(name) {
  name = subst(name);
  if (!name) return undefined;
  if (name.indexOf('gcu:') === 0) return gcuVal(name.slice(4));
  if (name.indexOf('gcuset:') === 0) return gcuVal('set.' + name.slice(7));
  if (name.indexOf('gcuspd:') === 0) return gcuVal('manSpeed.' + name.slice(7));
  const t = TAGS[name];
  if (!t) return undefined;
  if (DEMO && !SIM) return demoTag(name, t);
  const w = buf[t.p];
  if (!w) return undefined;
  const v = decodeTag(w, t);
  return t.t === 'bool' ? v : sc(t, v, false);
}
function ndv(v) { return v === undefined || v === null || (typeof v === 'number' && !isFinite(v)); }

// ---------------------------------------------------------------- запись
// уставки DB101 ГЦУ: поле -> [смещение, тип]
const GSET = { pressSP: [0, 'r'], kp: [4, 'r'], ti: [8, 'r'], spdMin: [12, 'r'], spdMax: [16, 'r'], levelSP: [20, 'r'],
  hyst: [24, 'r'], startMin: [28, 'r'], tAdd: [32, 'i'], tRem: [34, 'i'], nStart: [36, 'i'], nMin: [38, 'i'], nMax: [40, 'i'],
  duty: [42, 'i'], tScour: [46, 'i'], tFlushStart: [48, 'i'], tFlushStop: [50, 'i'], tDrain: [52, 'i'] };
async function writeTag(name, v) {
  name = subst(name);
  if (name.indexOf('gcuset:') === 0) {
    const f = name.slice(7);
    if (f.indexOf('repair.') === 0) { setRepair(+f.slice(7), !!v); return; }
    const g = GSET[f];
    if (!g) { toast('Нет уставки ' + f); return; }
    if (g[1] === 'r') setReal(g[0], v); else setI16(g[0], Math.round(v));
    return;
  }
  if (name.indexOf('gcuspd:') === 0) { setManSpeed(+name.slice(7), v); return; }
  if (name.indexOf('gcu:') === 0) { toast('Данные ГЦУ «' + name + '» — только чтение'); return; }
  const t = TAGS[name];
  if (!t) { toast('Тег «' + name + '» не найден'); return; }
  if (t.t !== 'bool') v = sc(t, v, true);
  if (DEMO && !SIM) { demoV[name] = t.t === 'bool' ? (v ? 1 : 0) : +v; req(); return; }
  const addr = cfg[t.w];
  if (!t.w || !addr) { toast('Тег «' + name + '» только для чтения (в конструкторе не отмечена запись)'); return; }
  try {
    let words;
    const lt = { t: t.t, o: t.o & 1, b: t.b };
    if (t.t === 'bool' || t.t === 'byte' || t.t === 'sint') {
      // одно слово: прочитать — поменять бит/байт — записать (соседние биты не трогаем)
      const d = await driver.promises.getData(addr, 1);
      words = wordsFrom(d, 1);
      encodeTag(words, lt, v);
    } else {
      words = [0, 0];
      encodeTag(words, { t: t.t, o: 0 }, v);
      words = (t.t === 'int' || t.t === 'uint' || t.t === 'word') ? [words[0]] : words;
    }
    await driver.promises.setData(addr, words);
    if (buf[t.p]) { encodeTag(buf[t.p], t, v); req(); }     // сразу показать, не ждать опроса
  } catch (e) {
    toast('Ошибка записи ' + name + ': ' + (e && e.message ? e.message : e));
  }
}

// ---------------------------------------------------------------- опрос DB
function startPolls() {
  if (DEMO && !SIM) return;
  POLLS.forEach(function (p) {
    const addr = cfg[p.k];
    if (!addr) { commErr = 'в конфигурации нет «' + p.k + '»'; return; }
    let busy = false;
    const tick = async function () {
      if (busy) return;
      busy = true;
      try {
        const d = await driver.promises.getData(addr, p.n);
        buf[p.k] = wordsFrom(d, p.n);
        if (commErr.indexOf(p.d) >= 0) commErr = '';
        lastUpdate = Date.now(); updates++;
        req();
      } catch (e) {
        commErr = p.d + ': ' + ((e && e.message) ? e.message : 'нет ответа');
        req();
      }
      busy = false;
    };
    tick();
    setInterval(tick, p.ms || 500);
  });
}

// ---------------------------------------------------------------- условия и состояния
function cond1(c) {
  if (!c || !c.tag) return true;
  const v = tagVal(c.tag);
  if (c.op === 'nd') return ndv(v);
  if (c.op === 'ok') return !ndv(v);
  if (ndv(v)) return false;
  const x = num(c.v);
  switch (c.op) {
    case '1': return !!v;
    case '0': return !v;
    case '=': return v == x;
    case '!=': return v != x;
    case '>': return v > x;
    case '<': return v < x;
    case '>=': return v >= x;
    case '<=': return v <= x;
    case 'bit': return ((v >> x) & 1) === 1;
  }
  return true;
}
function cond(c) {
  if (!c) return true;
  if (!c.l) return cond1(c);
  if (!c.l.length) return true;
  return c.m === 'any' ? c.l.some(cond1) : c.l.every(cond1);
}
function eff(e) {                     // правила «Состояния»: первое выполненное правило меняет свойства
  if (!e.st || !e.st.length) return e;
  for (let i = 0; i < e.st.length; i++) {
    const r = e.st[i];
    if (cond(r.c)) {
      const o = {};
      let k;
      for (k in e) o[k] = e[k];
      for (k in (r.p || {})) o[k] = r.p[k];
      if (r.bl) o._bl = true;
      return o;
    }
  }
  return e;
}
function X(v) { return (+v || 0) + GX; }
function Y(v) { return (+v || 0) + GY; }
function drawEl(e) {
  if (!(HOST && HOST.showAll) && !cond(e.vis)) return;
  e = eff(e);
  if (e.hide) return;
  const R = RENDER[e.t];
  if (!R) return;
  const blinkOff = e._bl && !ui.blink;
  if (blinkOff) cv.globalAlpha = 0.3;
  try { R(e, X(e.x), Y(e.y)); } catch (err) { console.log('элемент ' + e.id + ': ' + err.message); }
  if (blinkOff) cv.globalAlpha = 1;
  if (e.act && !NOHIT[e.t]) {
    const pp = P;
    if (e.t === 'line') {
      const x1 = Math.min(X(e.x), X(e.x2)), y1 = Math.min(Y(e.y), Y(e.y2));
      hit(x1 - 4, y1 - 4, Math.abs(e.x2 - e.x) + 8, Math.abs(e.y2 - e.y) + 8, function () { runAction(e.act, pp); }, e.id);
    } else hit(X(e.x), Y(e.y), e.w, e.h, function () { runAction(e.act, pp); }, e.id);
  }
}
const NOHIT = { button: 1, hold: 1, input: 1, group: 1 };

// ---------------------------------------------------------------- действия
function runAction(a, pp) {          // pp — номер своего окна (#), запомненный при рисовании кнопки
  if (!a || !a.a) return;
  if (pp === undefined) pp = P;
  const go = function () {
    const sp = P; P = pp;
    switch (a.a) {
      case 'write': writeTag(a.tag, num(a.v)); break;
      case 'toggle': writeTag(a.tag, tagVal(a.tag) ? 0 : 1); break;
      case 'keypad': {
        const tg = subst(a.tag), cur = tagVal(a.tag);
        keypad(subst(a.ti || a.tag), ndv(cur) ? 0 : cur, num(a.min || 0), num(a.max || 100), num(a.dec || 0),
          function (v) { writeTag(tg, v); });
        break;
      }
      case 'popup': openPopup({ type: 'cpop', id: a.id, p: (a.p === undefined || a.p === '') ? pp : subst(a.p) }); break;
      case 'close': closePopup(); break;
      case 'gcu': cmdGcu(num(a.v)); break;
      case 'pump': cmdPump(num(a.n), num(a.v)); break;
      case 'valvecmd': cmdValve(num(a.n), num(a.v)); break;
      case 'valvewin': openValve(num(a.n)); break;
      case 'pumpwin': openPump(num(a.n)); break;
      case 'resetall': resetAll(); break;
      case 'win': goWindow(num(a.n)); break;
    }
    if (a.msg) toast(subst(a.msg));
    if (a.log) logEvent(subst(a.log));
    P = sp;
  };
  const guarded = a.cf ? function () { const sp = P; P = pp; const t = subst(a.cf), m = subst(a.cm || ''); P = sp; confirm(t, m, go); } : go;
  if (a.pin) withAccess(guarded); else guarded();
}

// ---------------------------------------------------------------- вспомогательные
function fmtV(e, v) {
  if (ndv(v)) return '—';
  if (e.fm === 'bool') return v ? subst(e.on || '1') : subst(e.off || '0');
  if (e.fm === 'hex') return hex4(v);
  if (e.fm === 'map') {
    const m = e.map || [];
    for (let i = 0; i < m.length; i++) if (+m[i].v === +v) return subst(m[i].tx);
    return String(v);
  }
  return (+v).toFixed(+e.dec || 0);
}
function anchorX(e, x) { return e.align === 'left' ? x + (+e.pad || 0) : (e.align === 'right' ? x + e.w - (+e.pad || 0) : x + e.w / 2); }
function vcol(view, kind, nd) {           // [заливка, контур, пунктир] — как viewColors ядра
  if (nd) return [C.stop, C.repairLine, true];
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
function circle(cx, cy, r, fill, stroke, lw, dash) {
  cv.beginPath(); cv.arc(cx, cy, r, 0, Math.PI * 2);
  if (fill) { cv.fillStyle = fill; cv.fill(); }
  if (stroke) { cv.strokeStyle = stroke; cv.lineWidth = lw || 1; cv.setLineDash(dash || []); cv.stroke(); if (dash) cv.setLineDash([]); }
}
function boxRect(x, y, w, h, r, fill, stroke, lw, dash) {
  if (r > 0) { rrect(x, y, w, h, r, fill || null, stroke || null, lw || 1, dash ? [5, 3] : null); return; }
  if (fill) fillRect(x, y, w, h, fill);
  if (stroke) { const l = lw || 1; strokeRect(x + l / 2, y + l / 2, w - l, h - l, stroke, l, dash ? [5, 3] : null); }
}
function myEdit(id, x, y, w, h, value, unit, fn, on, sz) {
  rrect(x, y, w, h, 3, on ? C.white : '#ECEDEA', on ? (ui.press === id ? C.ready : C.btnBorder) : C.panelBorder, ui.press === id ? 2 : 1);
  textFit(value + (unit ? ' ' + unit : ''), x + w - 8, y + h / 2 + 1, w - 24, sz || 16, on ? C.ready : C.textDis, 'right', true);
  if (on) line(x + 8, y + h - 7, x + 16, y + 7, C.ready, 2);
  hit(x, y, w, h, on ? fn : function () { }, id);
}
const jogs = { e: null, timer: null, alive: Math.floor(Math.random() * 1000) };
function holdSend() {
  const e = jogs.e;
  if (!e) return;
  writeTag(e.tag, num(e.v));
  if (e.alive) { jogs.alive = (jogs.alive + 1) & 0x7FFF; writeTag(e.alive, jogs.alive); }
}
function holdStart(e, pp) {
  holdStop();
  const sp = P; P = (pp === undefined) ? P : pp;
  jogs.e = { tag: subst(e.tag), v: subst(e.v), alive: e.alive ? subst(e.alive) : '', rv: (e.rv === undefined || e.rv === null) ? '0' : subst(e.rv) };
  P = sp;
  holdSend();
  jogs.timer = setInterval(holdSend, Math.max(100, +e.ms || 200));
  req();
}
function holdStop() {
  if (jogs.timer) { clearInterval(jogs.timer); jogs.timer = null; }
  if (jogs.e) { const e = jogs.e; jogs.e = null; if (e.rv !== '') writeTag(e.tag, num(e.rv || 0)); }
  req();
}

// ---------------------------------------------------------------- элементы
const RENDER = {
  rect: function (e, x, y) { boxRect(x, y, e.w, e.h, +e.r || 0, e.fill, e.stroke, +e.lw || 1, e.dash); },
  pipe: function (e, x, y) { fillRect(x, y, e.w, e.h, e.fill || C.pulp); },
  circle: function (e, x, y) { circle(x + e.w / 2, y + e.h / 2, Math.min(e.w, e.h) / 2 - (e.stroke ? (+e.lw || 1) / 2 : 0), e.fill, e.stroke, +e.lw || 1, e.dash ? [5, 3] : null); },
  text: function (e, x, y) {
    const lines = subst(e.tx).split('\n'), sz = +e.size || 14, lh = Math.round(sz * 1.25);
    const y0 = y + e.h / 2 - (lines.length - 1) * lh / 2 + 1;
    lines.forEach(function (s, i) {
      if (e.fit) textFit(s, anchorX(e, x), y0 + i * lh, e.w, sz, e.color || C.text, e.align || 'center', !!e.bold);
      else text(s, anchorX(e, x), y0 + i * lh, sz, e.color || C.text, e.align || 'center', !!e.bold);
    });
  },
  value: function (e, x, y) {
    const okv = e.ok ? tagVal(e.ok) : 1, v = tagVal(e.tag), bad = !ndv(v) && !ndv(okv) && !okv;
    if (e.fill || e.stroke || bad) boxRect(x, y, e.w, e.h, e.r === undefined ? 3 : +e.r, e.fill, bad ? C.alarm : e.stroke, bad ? 2 : 1);
    if (bad) { textFit(subst(e.bad || 'НЕДОСТ.'), anchorX(e, x), y + e.h / 2 + 1, e.w - 4, Math.min(+e.size || 16, 14), C.alarm, e.align || 'center', true); return; }
    const s = subst(e.pre || '') + fmtV(e, v) + (e.unit ? ' ' + subst(e.unit) : '');
    textFit(s, anchorX(e, x), y + e.h / 2 + 1, e.w - 4, +e.size || 16, ndv(v) ? C.textDis : (e.color || C.text), e.align || 'center', e.bold !== false);
  },
  valuebox: function (e, x, y) {
    const okv = e.ok ? tagVal(e.ok) : 1, v = tagVal(e.tag), bad = !ndv(v) && !ndv(okv) && !okv;
    rrect(x, y, e.w, e.h, 4, e.fill || C.white, bad ? C.alarm : (e.stroke || C.panelBorder), bad ? 2 : 1);
    const tsz = +e.tsz || 12, vsz = +e.vsz || 24;
    textFit(subst(e.ti), x + e.w / 2, y + tsz + 3, e.w - 6, tsz, C.text2, 'center');
    const vy = y + tsz + 6 + (e.h - tsz - 6) / 2;
    if (bad) { textFit(subst(e.bad || 'НЕДОСТОВЕРНО'), x + e.w / 2, vy, e.w - 6, 14, C.alarm, 'center', true); return; }
    textFit(fmtV(e, v) + ' ' + subst(e.unit || ''), x + e.w / 2, vy, e.w - 6, vsz, e.color || C.text, 'center', true);
  },
  line: function (e, x, y) {
    const x2 = X(e.x2), y2 = Y(e.y2), c = e.color || C.text2, lw = +e.lw || 2;
    line(x, y, x2, y2, c, lw, e.dash ? [6, 4] : null);
    if (e.ar) {
      const a = Math.atan2(y2 - y, x2 - x), L = 6 + lw * 2;
      poly([x2, y2, x2 - L * Math.cos(a - 0.45), y2 - L * Math.sin(a - 0.45), x2 - L * Math.cos(a + 0.45), y2 - L * Math.sin(a + 0.45)], c);
    }
  },
  tri: function (e, x, y) {
    const w = e.w, h = e.h, d = e.dir || 'down';
    const p = d === 'up' ? [x, y + h, x + w, y + h, x + w / 2, y] : d === 'left' ? [x + w, y, x + w, y + h, x, y + h / 2] :
      d === 'right' ? [x, y, x, y + h, x + w, y + h / 2] : [x, y, x + w, y, x + w / 2, y + h];
    poly(p, e.fill || C.pulp, e.stroke || null, +e.lw || 1);
  },
  clock: function (e, x, y) {
    const t = Date.now(), d = new Date(t);
    const s = e.fm === 'date' ? two(d.getDate()) + '.' + two(d.getMonth() + 1) + '.' + d.getFullYear() :
      (e.fm === 'time' ? fmtTime(t) : fmtTime(t, true));
    text(s, anchorX(e, x), y + e.h / 2 + 1, +e.size || 16, e.color || C.text, e.align || 'center', !!e.bold);
  },
  valve: function (e, x, y) {
    let view, local, nd;
    if (e.src === 'tag') { view = tagVal(e.vt); local = e.lt ? tagVal(e.lt) : 0; nd = ndv(view); }
    else { const v = S.valve[num(e.n)] || { view: 0, local: false }; nd = noData(); view = v.view; local = v.local; }
    const c = vcol(view, 'valve', nd), dash = c[2] ? [5, 3] : null, lw = c[2] ? 2 : 1.6, w = e.w, h = e.h;
    if (e.dir === 'v') {
      const sx = w / 32, sy = h / 48;
      poly([x + 2 * sx, y + 2 * sy, x + 30 * sx, y + 2 * sy, x + 16 * sx, y + 24 * sy], c[0], c[1], lw, dash);
      poly([x + 2 * sx, y + 46 * sy, x + 30 * sx, y + 46 * sy, x + 16 * sx, y + 24 * sy], c[0], c[1], lw, dash);
    } else {
      const sx = w / 48, sy = h / 32;
      poly([x + 2 * sx, y + 2 * sy, x + 24 * sx, y + 16 * sy, x + 2 * sx, y + 30 * sy], c[0], c[1], lw, dash);
      poly([x + 46 * sx, y + 2 * sy, x + 24 * sx, y + 16 * sy, x + 46 * sx, y + 30 * sy], c[0], c[1], lw, dash);
    }
    if (view === 5 && !nd) qMark(x + w / 2, y + h / 2);
    if (!nd && local && e.bp !== 'none') localBadge(e.bp === 'left' ? x - 22 : x + w + 2, y);
    if (!e.act && e.src !== 'tag') hit(x - 4, y - 4, w + 8, h + 8, function () { openValve(num(e.n)); }, e.id);
  },
  pump: function (e, x, y) {
    let view, nd;
    if (e.src === 'tag') { view = tagVal(e.vt); nd = ndv(view); }
    else { const p = S.pump[num(e.n)] || { view: 0 }; view = p.view; nd = noData(); }
    const c = vcol(view, 'pump', nd), cx = x + e.w / 2, cy = y + e.h / 2, r = Math.min(e.w, e.h) / 2 * 33 / 36, k = r / 33;
    circle(cx, cy, r, c[0], c[1], 3 * Math.max(0.5, k), c[2] ? [7, 5] : null);
    const dark = nd || view === 0 || view === 4 || view === 5;
    poly([cx + 11 * k, cy - 11 * k, cx + 33 * k, cy, cx + 11 * k, cy + 11 * k], dark ? C.text : C.white, C.text, 1.5);
    if (e.lb) text(subst(e.lb), cx - 8 * k, cy + 1, Math.round((+e.size || 15) * Math.max(0.6, k)), (dark || view === 3) ? C.text : C.white, 'center', true);
    if (!e.act && e.src !== 'tag') hit(x, y, e.w, e.h, function () { openPump(num(e.n)); }, e.id);
  },
  pumpcard: function (e, x, y) {
    const n = num(e.n), p = S.pump[n] || {}, nd = noData(), w = e.w, h = e.h;
    const col = nd ? C.stop : [C.btnBorder, C.ready, C.run, C.alarm, C.repairLine, C.move][p.view] || C.btnBorder;
    rrect(x, y, w, h, 4, C.panel, C.panelBorder, 1);
    rrect(x + 1, y + 1, 6, h - 2, 2, col);
    text((e.lb ? subst(e.lb) : 'Н-' + n) + (p.duty && !nd ? ' · осн.' : ''), x + 14, y + 15, 14, C.text, 'left', true);
    if (!nd && S.activePump === n) { rrect(x + w - 46, y + 6, 40, 18, 3, C.ready); text('РАБ.', x + w - 26, y + 16, 11, C.white, 'center', true); }
    text(nd ? '—' : (p.view === 5 ? (p.starting ? 'ПУСК' : 'ОСТАНОВ') : PUMP_STATE[p.view] || '?'), x + 14, y + h - 16, 13,
      p.view === 3 && !nd ? C.alarm : C.text2, 'left', p.view === 3);
    text(nd ? '—' : fmt(p.speed, 1) + ' %', x + w - 6, y + h - 16, 16, C.text, 'right', true);
    if (!e.act) hit(x, y, w, h, function () { openPump(n); }, e.id);
  },
  cyclone: function (e, x, y) {
    let rep;
    if (e.src === 'tag') rep = !!tagVal(e.rt);
    else { const k = num(e.n), v = S.valve[12 + k] || {}; rep = !noData() && (v.repair || S.set.repair[1 + k]); }
    const sx = e.w / 48, sy = e.h / 89;
    poly([x + sx, y, x + 47 * sx, y, x + 31 * sx, y + e.h, x + 17 * sx, y + e.h], rep ? C.cycRepair : C.cycRun, rep ? C.repairLine : C.text, 1.5, rep ? [5, 3] : null);
    text(e.lb !== undefined ? subst(e.lb) : 'ГЦ-' + e.n, x + e.w / 2, y + 13 * sy, 12, rep ? C.text : C.white, 'center', true);
    if (rep) text('РЕМ.', x + e.w / 2, y + 39 * sy, 11, C.text, 'center', true);
    if (!e.act && e.src !== 'tag') hit(x, y - 3, e.w, e.h + 7, function () { openValve(12 + num(e.n)); }, e.id);
  },
  sensor: function (e, x, y) {
    const r = Math.min(e.w, e.h) / 2;
    circle(x + e.w / 2, y + e.h / 2, r - 0.75, e.fill || C.white, e.stroke || C.text, 1.5);
    text(subst(e.tx || 'PT'), x + e.w / 2, y + e.h / 2 + 1, +e.size || 11, e.color || C.text, 'center', true);
  },
  tank: function (e, x, y) {
    const w = e.w, h = e.h, mn = +e.min || 0, mx = (e.max === undefined || e.max === '') ? 100 : +e.max;
    const ly = function (v) { return y + h - 3 - (h - 6) * Math.max(0, Math.min(1, (v - mn) / ((mx - mn) || 1))); };
    fillRect(x, y, w, h, e.bg || C.tankIn);
    const v = tagVal(e.tag), okv = e.ok ? tagVal(e.ok) : 1;
    if (!ndv(v)) { const t = ly(v); fillRect(x + 3, t, w - 6, y + h - 3 - t, (!ndv(okv) && !okv) ? '#C9C2B8' : (e.fill || C.slurry)); }
    strokeRect(x + 1.5, y + 1.5, w - 3, h - 3, e.wall || C.tankWall, 3);
    (e.marks || []).forEach(function (m) {
      const yy = ly(+m.v), c = m.c || C.text2;
      line(x - 14, yy, x, yy, c, 2);
      text(subst(m.n) + ' ' + m.v, x - 17, yy, 12, c, 'right', String(m.n).length === 2);
    });
    const sp = e.sp ? tagVal(e.sp) : undefined;
    if (!ndv(sp) && sp > mn && sp < mx) {
      const yy = ly(sp);
      line(x - 14, yy, x, yy, C.ready, 2);
      text('SP ' + fmt(sp, 0), x - 17, yy, 12, C.ready, 'right', true);
      line(x + 4, yy, x + w - 4, yy, C.ready, 1.5, [6, 4]);
    }
  },
  bar: function (e, x, y) {
    const w = e.w, h = e.h, mn = +e.min || 0, mx = (e.max === undefined || e.max === '') ? 100 : +e.max;
    const v = tagVal(e.tag), okv = e.ok ? tagVal(e.ok) : 1, bad = !ndv(okv) && !okv;
    boxRect(x, y, w, h, 2, e.bg || C.white, null);
    if (!ndv(v)) {
      const f = Math.max(0, Math.min(1, (v - mn) / ((mx - mn) || 1)));
      if (e.dir === 'h') fillRect(x, y, w * f, h, bad ? C.stop : (e.fill || C.ready));
      else fillRect(x, y + h * (1 - f), w, h * f, bad ? C.stop : (e.fill || C.ready));
    }
    boxRect(x, y, w, h, 2, null, e.stroke || C.panelBorder, 1);
    if (e.sv) textFit(fmtV(e, v) + (e.unit ? ' ' + subst(e.unit) : ''), x + w / 2, y + h / 2 + 1, w - 4, +e.size || 13, C.text, 'center', true);
  },
  lamp: function (e, x, y) {
    const v = tagVal(e.tag), nd = ndv(v);
    let on = !!v;
    if (e.inv) on = !on;
    let col = nd ? C.stop : (on ? (e.on || C.run) : (e.off || C.white));
    if (!nd && on && e.bl && !ui.blink) col = e.off || C.white;
    if (e.shape === 'rect') rrect(x, y, e.w, e.h, 3, col, e.stroke || C.text, 1.2);
    else circle(x + e.w / 2, y + e.h / 2, Math.min(e.w, e.h) / 2 - 0.6, col, e.stroke || C.text, 1.2);
    if (e.lb) text(subst(e.lb), x + e.w + 8, y + e.h / 2 + 1, +e.size || 14, (on && !nd && e.lc) ? e.lc : C.text2, 'left', on && !nd && !!e.lc);
  },
  state: function (e, x, y) {
    const v = tagVal(e.tag);
    let s = null;
    if (ndv(v)) s = { tx: e.ndt || '—', f: C.stop, c: C.text };
    else {
      const l = e.sts || [];
      for (let i = 0; i < l.length; i++) if (+l[i].v === +v) { s = l[i]; break; }
      if (!s) s = { tx: e.dtx !== undefined ? e.dtx : String(v), f: e.df || C.stop, c: e.dc || C.text };
    }
    const off = s.bl && !ui.blink;
    if (off) cv.globalAlpha = 0.45;
    rrect(x, y, e.w, e.h, e.r === undefined ? 4 : +e.r, s.f || C.stop, e.stroke || null, 1, s.dash ? [5, 3] : null);
    if (off) cv.globalAlpha = 1;
    textFit(subst(s.tx), x + e.w / 2, y + e.h / 2 + 1, e.w - 8, +e.size || 16, s.c || C.text, 'center', e.bold !== false);
  },
  button: function (e, x, y) {
    button(e.id + (P !== null ? '_' + P : ''), x, y, e.w, e.h, subst(e.tx), { active: e.ac ? cond(e.ac) : false, style: e.style || 'normal',
      enabled: cond(e.en), why: subst(e.why || ''), size: +e.size || 16 }, (function (pp) { return function () { runAction(e.act, pp); }; })(P));
  },
  hold: function (e, x, y) {
    holdButton(e.id, x, y, e.w, e.h, subst(e.tx), { enabled: cond(e.en), why: subst(e.why || ''), style: e.style === 'blue' ? 'blue' : 'green',
      active: !!(jogs.e && jogs.e.tag === subst(e.tag) && jogs.e.v === subst(e.v)), size: +e.size || 18 },
      (function (pp) { return function () { holdStart(e, pp); }; })(P), holdStop);
  },
  input: function (e, x, y) {
    const v = tagVal(e.tag), on = !ndv(v) && cond(e.en);
    const a = { a: 'keypad', tag: e.tag, min: e.min, max: e.max, dec: e.dec, ti: e.ti || e.tag, pin: e.pin, cf: e.cf, cm: e.cm };
    const pp = P;
    myEdit(e.id + (P !== null ? '_' + P : ''), x, y, e.w, e.h, ndv(v) ? '—' : (+v).toFixed(+e.dec || 0), subst(e.unit || ''), function () { runAction(a, pp); }, on, +e.size || 16);
  },
  alarmline: function (e, x, y) {
    const w = e.w, h = e.h;
    if (!DEMO && commErr) { rrect(x, y, w, h, 4, C.alarm, null); textFit('НЕТ СВЯЗИ С ПЛК: ' + commErr, x + 10, y + h / 2 + 1, w - 20, 15, C.white, 'left', true); return; }
    if (noData()) { rrect(x, y, w, h, 4, C.panel, C.panelBorder); text('Ожидание данных от ПЛК…', x + 10, y + h / 2 + 1, 15, C.text2); return; }
    const list = alarmList(), nA = list.filter(function (q) { return q.c === 'A'; }).length, nW = list.length - nA;
    rrect(x, y, w, h, 4, list.length ? C.white : C.panel, C.panelBorder);
    let cx = x + 4;
    if (nA) { rrect(cx, y + 3, 104, h - 6, 3, C.alarm); text('АВАРИЙ ' + nA, cx + 52, y + h / 2 + 1, 14, C.white, 'center', true); cx += 110; }
    if (nW) { rrect(cx, y + 3, 116, h - 6, 3, C.move); text('ПРЕДУПР. ' + nW, cx + 58, y + h / 2 + 1, 14, C.text, 'center', true); cx += 122; }
    if (!list.length) { text('Аварий и предупреждений нет', x + 10, y + h / 2 + 1, 15, C.text2); return; }
    const k = Math.floor(Date.now() / 3000) % list.length, cur = list[k];
    textFit((list.length > 1 ? (k + 1) + '/' + list.length + '  ' : '') + cur.t, cx + 6, y + h / 2 + 1, x + w - cx - 12, 15,
      cur.c === 'A' ? C.alarm : C.text, 'left', cur.c === 'A');
  },
  alarms: function (e, x, y) {
    const rh = +e.rh || 26, sz = +e.size || 14;
    rrect(x, y, e.w, e.h, 4, C.white, C.panelBorder);
    const act = (e.items || []).filter(function (it) { const v = tagVal(it.tag); return !ndv(v) && (it.inv ? !v : !!v); });
    act.sort(function (a, b) { return (a.c === 'A' ? 0 : 1) - (b.c === 'A' ? 0 : 1); });
    if (!act.length) { text(subst(e.empty || 'Сообщений нет'), x + 10, y + rh / 2 + 2, sz, C.text2); return; }
    const max = Math.max(1, Math.floor((e.h - 4) / rh));
    act.slice(0, max).forEach(function (it, i) {
      const ry = y + 2 + i * rh, col = it.c === 'A' ? C.alarm : (it.c === 'W' ? C.move : C.ready);
      if (i) line(x + 6, ry, x + e.w - 6, ry, C.rowLine, 1);
      rrect(x + 6, ry + 5, 8, rh - 10, 2, (it.c === 'A' && !ui.blink) ? '#E8A0A0' : col);
      textFit(subst(it.tx), x + 22, ry + rh / 2 + 1, e.w - 30, sz, it.c === 'A' ? C.alarm : C.text, 'left', it.c === 'A');
    });
    if (act.length > max) text('ещё ' + (act.length - max), x + e.w - 8, y + e.h - 10, 11, C.text2, 'right');
  },
  trend: function (e, x, y) {
    const w = e.w, h = e.h, pens = e.pens || [], mn = +e.min || 0, mx = (e.max === undefined || e.max === '') ? 100 : +e.max;
    rrect(x, y, w, h, 4, C.white, C.panelBorder);
    const px = x + 46, py = y + 24, pw = w - 56, ph = h - 46;
    for (let i = 0; i <= 4; i++) {
      const yy = py + ph * i / 4;
      line(px, yy, px + pw, yy, C.rowLine, 1);
      text(fmt(mx - (mx - mn) * i / 4, +e.dec || 0), px - 4, yy, 11, C.text2, 'right');
    }
    const span = Math.max(10, +e.span || 600);
    text('−' + (span >= 120 ? Math.round(span / 60) + ' мин' : span + ' с'), px, y + h - 10, 11, C.text2, 'left');
    text('сейчас', px + pw, y + h - 10, 11, C.text2, 'right');
    const H = hist[e.id];
    let lx = x + 8;
    pens.forEach(function (pn, k) {
      const col = pn.c || [C.ready, C.run, C.alarm][k % 3], v = tagVal(pn.tag);
      const lbl = subst(pn.n || pn.tag) + ': ' + (ndv(v) ? '—' : (+v).toFixed(+e.dec || 1));
      rrect(lx, y + 6, 10, 10, 2, col);
      font(12, true); const tw = cv.measureText ? cv.measureText(lbl).width : lbl.length * 7;
      text(lbl, lx + 14, y + 12, 12, C.text, 'left', true);
      lx += tw + 30;
      if (!H || !H.v[k]) return;
      const a = H.v[k], n = a.length, step = pw / span;
      cv.beginPath(); let pen = false;
      for (let i = 0; i < n; i++) {
        const val = a[i];
        if (!(typeof val === 'number' && isFinite(val))) { pen = false; continue; }
        const xx = px + pw - (n - 1 - i) * step, yy = py + ph - ph * Math.max(0, Math.min(1, (val - mn) / ((mx - mn) || 1)));
        if (!pen) { cv.moveTo(xx, yy); pen = true; } else cv.lineTo(xx, yy);
      }
      cv.strokeStyle = col; cv.lineWidth = 2; cv.setLineDash([]); cv.stroke();
    });
    strokeRect(px, py, pw, ph, C.panelBorder, 1);
  },
  group: function (e, x, y) {
    const sx = GX, sy = GY;
    GX = x; GY = y;
    (e.els || []).forEach(drawEl);
    GX = sx; GY = sy;
    if (e.act) { const pp = P; hit(x, y, e.w, e.h, function () { runAction(e.act, pp); }, e.id); }
  }
};

// ---------------------------------------------------------------- свои всплывающие окна
function popRect(d) {
  const w = d.w || 400, h = d.h || 300;
  return { x: (d.x === undefined || d.x === null || d.x === '') ? OX + Math.round((W0 - w) / 2) : +d.x,
    y: (d.y === undefined || d.y === null || d.y === '') ? OY + Math.round((H0 - h) / 2) : +d.y, w: w, h: h };
}
function drawExtraPopup(p) {
  if (p.type !== 'cpop') return;
  const d = POPS[p.id];
  if (!d) { closePopup(); return; }
  const r = popRect(d), sp = P;
  P = (p.p === undefined) ? null : p.p;
  popupFrame(r.x, r.y, r.w, r.h, subst(d.ti || ''), d.cl !== false);
  if (d.bg) fillRect(r.x + 2, r.y + 44, r.w - 4, r.h - 46, d.bg);
  GX = r.x; GY = r.y;
  (d.els || []).forEach(drawEl);
  GX = 0; GY = 0;
  P = sp;
}

// ---------------------------------------------------------------- экран
function drawScreen() {
  GX = 0; GY = 0; P = null;
  ELS.forEach(drawEl);
}
function walk(list, fn) { (list || []).forEach(function (e) { fn(e); if (e.t === 'group') walk(e.els, fn); }); }
function trendSample() {
  const all = [];
  walk(ELS, function (e) { if (e.t === 'trend') all.push([e, null]); });
  Object.keys(POPS).forEach(function (k) { walk(POPS[k].els, function (e) { if (e.t === 'trend') all.push([e, k]); }); });
  all.forEach(function (it) {
    const e = it[0], span = Math.max(10, +e.span || 600);
    const H = hist[e.id] || (hist[e.id] = { v: [] });
    (e.pens || []).forEach(function (pn, k) {
      const a = H.v[k] || (H.v[k] = []);
      const v = tagVal(pn.tag);
      a.push(ndv(v) ? NaN : +v);
      if (a.length > span + 1) a.splice(0, a.length - span - 1);
    });
  });
}
function screenInit() {
  startPolls();
  setInterval(trendSample, 1000);
  if (HOST) HOST.attach({
    setScreen: function (s) {
      ELS.length = 0; (s.els || []).forEach(function (e) { ELS.push(e); });
      Object.keys(POPS).forEach(function (k) { delete POPS[k]; });
      Object.keys(s.pops || {}).forEach(function (k) { POPS[k] = s.pops[k]; });
      req();
    },
    showPop: function (id, p) { ui.stack = []; ui.popup = id ? { type: 'cpop', id: id, p: p } : null; req(); },
    closeAll: closeAll,
    val: tagVal,
    buf: buf,
    redraw: req
  });
}
