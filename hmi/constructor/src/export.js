// ================================================================ КОНСТРУКТОР: модель проекта, импорт, экспорт
// Чистые функции без интерфейса (используются редактором и тестами).
'use strict';
const TYPES = {           // тип поля: [размер в байтах, название как в TIA]
  bool: [1, 'Bool'], byte: [1, 'Byte'], sint: [1, 'SInt'], int: [2, 'Int'], uint: [2, 'UInt'], word: [2, 'Word'],
  dint: [4, 'DInt'], udint: [4, 'UDInt'], dword: [4, 'DWord'], real: [4, 'Real']
};
const ENGINE_LIMIT = 100000;          // лимит исходного кода JS-объекта EasyBuilder (~100 КБ)
const TAG_KEYS = { tag: 1, ok: 1, sp: 1, vt: 1, lt: 1, rt: 1, alive: 1, minT: 1, maxT: 1 };
const GCU_TYPES = { pumpcard: 1, alarmline: 1 };
const GCU_ACTS = { gcu: 1, pump: 1, valvecmd: 1, valvewin: 1, pumpwin: 1, resetall: 1 };
const GCU_ADDR = { cmdAddr: [100, 0], speedAddr: [100, 42], selAddr: [100, 174], setAddr: [101, 0], extAddr: [100, 188] };

function clone(o) { return JSON.parse(JSON.stringify(o)); }
function utf8(s) { return unescape(encodeURIComponent(s)); }
function b64(bin) {
  if (typeof btoa === 'function') return btoa(bin);
  return Buffer.from(bin, 'binary').toString('base64');
}
// Адрес EasyBuilder (тип «Адрес» в конфигурации JS-объекта): устройство + DBn + «номер DB и 4 цифры смещения»
function encodeAddress(dev, db, off) {
  const a = String(db) + ('0000' + off).slice(-4);
  const d = utf8(dev);
  let s = String.fromCharCode(0, 0, 1, d.length & 255, d.length >> 8) + d + String.fromCharCode(0x68, a.length & 255, a.length >> 8) + a;
  s += String.fromCharCode(0, 0, 0, 0, 0, 2, 1, 0);
  return 'Address|' + b64(s);
}
function tagName(db, f) { return db.name + '.' + f.n; }
function allTags(project) {
  const out = {};
  (project.dbs || []).forEach(function (db) {
    (db.fields || []).forEach(function (f) { out[tagName(db, f)] = { db: db, f: f }; });
  });
  return out;
}

// ---------------------------------------------------------------- обход элементов
function walkEls(list, fn) {
  (list || []).forEach(function (e) { fn(e); if (e.t === 'group') walkEls(e.els, fn); });
}
function walkObj(o, fn, key) {
  if (Array.isArray(o)) { o.forEach(function (x) { walkObj(x, fn, key); }); return; }
  if (o && typeof o === 'object') { Object.keys(o).forEach(function (k) { fn(k, o[k], o); walkObj(o[k], fn, k); }); }
}
function refsOf(els) {
  const refs = {};
  walkObj(els, function (k, v) { if (TAG_KEYS[k] && typeof v === 'string' && v) refs[v] = 1; });
  return Object.keys(refs);
}
function popupRefs(els, project) {          // своих окон, на которые есть ссылки (с вложенными)
  const ids = {}, queue = [els];
  while (queue.length) {
    const l = queue.shift();
    walkObj(l, function (k, v, o) {
      if (k === 'a' && v === 'popup' && o.id && !ids[o.id]) {
        const p = (project.pops || []).find(function (q) { return q.id === o.id; });
        if (p) { ids[o.id] = p; queue.push(p.els || []); }
      }
    });
  }
  return ids;
}
function usesGcu(els, refs) {
  let g = refs.some(function (r) { return /^gcu(set|spd)?:/.test(r); });
  walkObj(els, function (k, v, o) {
    if (k === 't' && (GCU_TYPES[v] || ((v === 'valve' || v === 'pump' || v === 'cyclone') && o.src !== 'tag'))) g = true;
    if (k === 'a' && GCU_ACTS[v]) g = true;
  });
  return g;
}
function typesOf(els) {
  const t = {};
  walkObj(els, function (k, v, o) { if (k === 't' && typeof v === 'string' && o.id !== undefined) t[v] = 1; });
  return t;
}
function cleanEls(list, edit) {     // убрать служебные поля редактора (edit — скрытые в редакторе не рисовать)
  return (list || []).filter(function (e) { return !(edit && e._h); }).map(function (e) {
    const o = {};
    Object.keys(e).forEach(function (k) { if (k !== 'nm' && k !== '_h' && k !== '_l' && k !== '_off') o[k] = e[k]; });
    if (o.t === 'group') o.els = cleanEls(o.els, edit);
    return o;
  });
}
// сжатие данных окна для кода панели: короткие id, условия из одного пункта без обёртки {m, l}
function compactScreen(screen) {
  let n = 0;
  const cond = function (o) {
    if (Array.isArray(o)) { o.forEach(cond); return; }
    if (!o || typeof o !== 'object') return;
    Object.keys(o).forEach(function (k) {
      const v = o[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.l) && typeof v.m === 'string' && v.l.length === 1) o[k] = v.l[0];
      else cond(v);
    });
  };
  const ids = function (list) {
    (list || []).forEach(function (e) { e.id = (++n).toString(36); if (e.els) ids(e.els); });
  };
  cond(screen.els); ids(screen.els);
  Object.keys(screen.pops).forEach(function (k) { cond(screen.pops[k].els); ids(screen.pops[k].els); });
}
// текст окна для кода панели: повторяющиеся строки-значения (теги, цвета, подписи) выносятся в таблицу _S — это JS, не JSON
function screenSrc(screen) {
  const js = JSON.stringify(screen), cnt = {};
  const re = /"(?:[^"\\]|\\.)*"/g;
  let m;
  while ((m = re.exec(js))) { if (js.charAt(re.lastIndex) !== ':') cnt[m[0]] = (cnt[m[0]] || 0) + 1; }
  const keys = Object.keys(cnt).filter(function (k) { return cnt[k] > 1 && k.length > 6; })
    .sort(function (a, b) { return cnt[b] * b.length - cnt[a] * a.length; });
  const tab = [], idx = {};
  keys.forEach(function (k) {
    const ref = '_S[' + tab.length + ']';
    if ((k.length - ref.length) * cnt[k] - k.length - 1 > 8) { idx[k] = ref; tab.push(k); }
  });
  if (!tab.length) return 'const SCREEN=' + js;
  const body = js.replace(re, function (t, off) { return (idx[t] && js.charAt(off + t.length) !== ':') ? idx[t] : t; });
  return 'const _S=[' + tab.join(',') + '];\nconst SCREEN=' + body;
}
function reEsc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

// ---------------------------------------------------------------- план опросов
// Для каждого DB — непрерывные участки, покрывающие используемые поля (≤ maxWords слов, разрывы ≤ 32 байт объединяются).
function planPolls(project, used) {
  const maxW = Math.max(4, +(project.conn && project.conn.maxWords) || 90);
  const byDb = {};
  used.forEach(function (u) { (byDb[u.db.id] = byDb[u.db.id] || { db: u.db, l: [] }).l.push(u); });
  const polls = [], tagMap = {}, warn = [];
  Object.keys(byDb).forEach(function (id) {
    const db = byDb[id].db, l = byDb[id].l;
    l.sort(function (a, b) { return a.f.o - b.f.o; });
    if (db.raw) {          // адрес вставлен вручную: один участок от смещения 0
      const end = l.reduce(function (m, u) { return Math.max(m, u.f.o + TYPES[u.f.t][0]); }, 0);
      const n = Math.ceil(end / 2);
      if (n > maxW) warn.push('DB «' + db.name + '»: адрес вручную — нужно ' + n + ' слов за один запрос (больше ' + maxW + ')');
      const k = 'r_' + db.name.replace(/\W/g, '_');
      polls.push({ k: k, n: n, ms: +db.ms || 500, d: db.name, raw: db.raw, db: db });
      l.forEach(function (u) { tagMap[u.name] = { p: k, o: u.f.o }; });
      return;
    }
    let cur = null;
    l.forEach(function (u) {
      const o = +u.f.o, end = o + TYPES[u.f.t][0];
      if (cur && (end - cur.s) <= maxW * 2 && o - cur.e <= 32) { cur.e = Math.max(cur.e, end); cur.u.push(u); return; }
      cur = { s: o & ~1, e: end, u: [u] };
      polls.push(cur);
      cur.db = db;
    });
  });
  const out = polls.map(function (p) {
    if (p.k) return p;
    const n = Math.ceil((p.e - p.s) / 2), k = 'r' + p.db.num + '_' + p.s;
    p.u.forEach(function (u) { tagMap[u.name] = { p: k, o: u.f.o - p.s }; });
    return { k: k, n: n, ms: +p.db.ms || 500, d: 'DB' + p.db.num + '.' + p.s + '…' + (p.s + n * 2 - 1), db: p.db, s: p.s };
  });
  return { polls: out, tagMap: tagMap, warn: warn };
}

// ---------------------------------------------------------------- экспорт одного окна
// символ библиотеки -> компактное описание для кода панели (строки «показывать при» и «точки» разбираются в числа)
function libOut(d) {
  const num = function (t) { return String(t).split(/[\s,;]+/).filter(Boolean).map(Number).filter(isFinite); };
  const o = { w: +d.w || 60, h: +d.h || 60, sts: (d.sts || []).map(clone), shapes: [] };
  if (d.df) o.df = clone(d.df);
  if (d.nd) o.nd = clone(d.nd);
  (d.shapes || []).forEach(function (h) {
    if (h.off) return;
    const s = {};
    Object.keys(h).forEach(function (k) { if (k !== 'svs' && k !== 'pt' && k !== 'off' && h[k] !== '' && h[k] !== undefined && h[k] !== null) s[k] = h[k]; });
    if (h.svs) s.sv = num(h.svs);
    if (h.pt) s.pts = num(h.pt);
    o.shapes.push(s);
  });
  return o;
}
function exportScreen(project, screenId, engine, opts) {
  opts = opts || {};
  const scr = (project.screens || []).find(function (s) { return s.id === screenId; });
  if (!scr) throw new Error('нет окна ' + screenId);
  const conn = project.conn || {};
  const dev = conn.dev || 'Siemens S7-1200/S7-1500';
  const warn = [], info = [];
  const els = cleanEls(scr.els, opts.edit);
  let pops = popupRefs(els, project);
  if (opts.allPops) { pops = {}; (project.pops || []).forEach(function (p) { pops[p.id] = p; }); }
  const popsOut = {};
  Object.keys(pops).forEach(function (id) {
    const p = pops[id];
    popsOut[id] = { ti: p.ti || '', w: +p.w || 400, h: +p.h || 300, els: cleanEls(p.els, opts.edit) };
    if (p.x !== undefined && p.x !== null && p.x !== '') popsOut[id].x = +p.x;
    if (p.y !== undefined && p.y !== null && p.y !== '') popsOut[id].y = +p.y;
    if (p.cl === false) popsOut[id].cl = false;
    if (p.bg) popsOut[id].bg = p.bg;
    if (+p.w > +scr.w || +p.h > +scr.h) warn.push('Окно «' + (p.name || id) + '» больше объекта ' + scr.w + '×' + scr.h);
  });
  const everything = els.concat(Object.keys(popsOut).reduce(function (a, k) { return a.concat(popsOut[k].els); }, []));
  const refs = refsOf(everything);
  const all = allTags(project);
  const usedNames = {};
  refs.forEach(function (r) {
    if (/^gcu(set|spd)?:/.test(r)) return;
    if (r.indexOf('#') >= 0) {
      const re = new RegExp('^' + reEsc(r).split('#').join('[^.]*?') + '$');
      let any = false;
      Object.keys(all).forEach(function (n) { if (re.test(n)) { usedNames[n] = 1; any = true; } });
      if (!any) warn.push('Шаблон тега «' + r + '» (с #) не совпал ни с одним тегом');
      return;
    }
    if (all[r]) usedNames[r] = 1;
    else warn.push('Тег «' + r + '» не найден в «Данные ПЛК»');
  });
  const used = Object.keys(usedNames).map(function (n) { return { name: n, db: all[n].db, f: all[n].f }; });
  const plan = planPolls(project, used);
  plan.warn.forEach(function (w) { warn.push(w); });
  const cfg = {}, tags = {}, amap = {};
  const gcu = usesGcu(everything, refs);
  if (gcu) Object.keys(GCU_ADDR).forEach(function (k) { cfg[k] = encodeAddress(dev, GCU_ADDR[k][0], GCU_ADDR[k][1]); });
  const polls = plan.polls.map(function (p) {
    cfg[p.k] = p.raw ? p.raw : encodeAddress(dev, p.db.num, p.s);
    amap[p.k] = { db: p.db.num, off: p.raw ? 0 : p.s };
    return { k: p.k, n: p.n, ms: p.ms, d: p.d };
  });
  used.forEach(function (u) {
    const f = u.f, m = plan.tagMap[u.name], t = { p: m.p, o: m.o, t: f.t };
    if (f.t === 'bool') t.b = +f.b || 0;
    if (f.sc && f.sc.length === 4 && f.sc.some(function (x) { return x !== '' && x !== null; })) t.sc = f.sc.map(Number);
    if (f.d !== undefined && f.d !== '' && +f.d) t.d = +f.d;
    if (f.ds) { t.ds = f.ds; if (f.da) t.da = +f.da; }
    if (f.wr) {
      if (u.db.raw) warn.push('Тег «' + u.name + '»: запись невозможна — адрес DB задан вручную');
      else {
        const size = TYPES[f.t][0], wo = size === 1 ? (f.o & ~1) : +f.o;
        if (size > 1 && (f.o & 1)) warn.push('Тег «' + u.name + '»: нечётное смещение ' + f.o + ' — слово должно начинаться с чётного байта');
        const k = 'w' + u.db.num + '_' + wo;
        cfg[k] = encodeAddress(dev, u.db.num, wo);
        amap[k] = { db: u.db.num, off: wo };
        t.w = k;
      }
    }
    tags[u.name] = t;
  });
  // запись в теги без признака «запись»
  walkObj(everything, function (k, v, o) {
    if ((k === 'a' && (v === 'write' || v === 'toggle' || v === 'keypad' || v === 'multi')) || (k === 't' && (v === 'input' || v === 'hold'))) {
      const nm = o.tag, nms = (v === 'multi' ? (o.l || []).map(function (x) { return x.tag; }) : [nm, o.alive]).filter(Boolean);
      nms.forEach(function (n) {
        if (/^gcu:/.test(n)) warn.push('Запись в «' + n + '»: данные ГЦУ только для чтения (для уставок — gcuset:)');
        else if (!/^gcu(set|spd):/.test(n) && all[n] && !all[n].f.wr) warn.push('Тег «' + n + '» используется для записи, но в «Данные ПЛК» не отмечен «Запись»');
        else if (!n) warn.push('Элемент ' + (o.id || '') + ': не выбран тег для записи');
      });
    }
  });
  if (+scr.h < 460) info.push('Высота объекта ' + scr.h + ' — экранная клавиатура (452 px) не поместится');
  if (scr.winAddr) cfg.winAddr = scr.winAddr;
  cfg.demo = !!scr.demo;
  cfg.fontFamily = conn.font || 'Arial';
  cfg.useBold = conn.bold !== false;
  cfg.boolHighByteFirst = conn.hiFirst !== false;
  cfg.realWordSwap = !!conn.realSwap;
  if (scr.pin) cfg.pin = String(scr.pin);
  const screen = { w: +scr.w, h: +scr.h, ox: +scr.ox || 0, oy: +scr.oy || 0, els: els, pops: popsOut, tags: tags, polls: polls };
  if (!opts.edit) compactScreen(screen);
  if (scr.bg) screen.bg = scr.bg;
  const libIds = {};
  walkObj(everything, function (k, v, o) { if (k === 't' && v === 'sym') libIds[o.lib] = 1; });
  Object.keys(libIds).forEach(function (lid) {
    const d = (project.lib || []).find(function (q) { return q.id === lid; });
    if (!d) { warn.push('Символ «' + lid + '» не найден в библиотеке'); return; }
    (screen.lib = screen.lib || {})[lid] = libOut(d);
  });
  screen.opt = {};
  if (scr.diag) screen.opt.diag = [+scr.diag[0], +scr.diag[1]];
  if (scr.demoChip) screen.opt.demoChip = [+scr.demoChip[0], +scr.demoChip[1]];
  if (scr.noCommBar) screen.opt.noCommBar = true;
  let code = null, size = 0;
  if (engine) {
    const types = typesOf(everything);
    const names = Object.keys(engine.r).filter(function (t) { return types[t]; });
    const head = '// =====================================================================\n' +
      '//  ' + (project.name || 'Проект') + ' · ' + (scr.name || scr.id) + '\n' +
      '//  JS Object для Weintek cMT X (EasyBuilder Pro >= 6.09). Сделано в конструкторе панели ' + (engine.ver || '') + '\n' +
      '//  ' + (project.panel && project.panel.model ? 'Панель ' + project.panel.model + ' ' + project.panel.w + '×' + project.panel.h + ' · ' : '') + 'Объект: X' + (scr.ox || 0) + ' Y' + (scr.oy || 0) + ' ' + scr.w + '×' + scr.h + '. Вставлять целиком; конфигурация — «Шаблон…».\n' +
      '//  Не правьте этот текст вручную: меняйте окно в конструкторе и вставляйте заново.\n' +
      '// =====================================================================\n';
    code = head + screenSrc(screen) + ';\n' + engine.core + engine.head +
      'const RENDER={\n' + names.map(function (t) { return engine.r[t]; }).join(',\n') + '\n};\n' + engine.tail + 'start();\n';
    size = utf8(code).length;
    if (size > ENGINE_LIMIT) warn.unshift('Код ' + Math.round(size / 1024) + ' КБ — больше лимита JS-объекта (~100 КБ). Разделите окно на два или упростите.');
  }
  const config = '{\n' + Object.keys(cfg).map(function (k) { return ' ' + JSON.stringify(k) + ': ' + JSON.stringify(cfg[k]); }).join(',\n') + '\n}';
  return { code: code, size: size, config: config, cfg: cfg, amap: amap, screen: screen, polls: polls, tags: tags, warn: warn, info: info, gcu: gcu, pops: Object.keys(popsOut) };
}

// ---------------------------------------------------------------- раскладка неоптимизированного DB (как в TIA)
const SCL_T = {
  BOOL: ['bool', 0], BYTE: ['byte', 1], CHAR: ['byte', 1], SINT: ['sint', 1], USINT: ['byte', 1],
  INT: ['int', 2], UINT: ['uint', 2], WORD: ['word', 2], DATE: ['uint', 2], S5TIME: ['word', 2], WCHAR: ['word', 2],
  DINT: ['dint', 4], UDINT: ['udint', 4], DWORD: ['dword', 4], REAL: ['real', 4], TIME: ['dint', 4], TIME_OF_DAY: ['udint', 4], TOD: ['udint', 4],
  LREAL: [null, 8], LINT: [null, 8], ULINT: [null, 8], LWORD: [null, 8], LTIME: [null, 8], DATE_AND_TIME: [null, 8], DT: [null, 8], DTL: [null, 12]
};
// разбор текста SCL (исходник DB/UDT из TIA: «Generate source from blocks»)
function parseScl(text) {
  const src = text.replace(/\(\*[\s\S]*?\*\)/g, '').replace(/\r/g, '');
  const types = {}, dbs = [], errors = [];
  // поля: {name, kind:'base'|'struct'|'array'|'udt'|'string', ...}
  function parseFields(lines, idx, endRe) {
    const fields = [];
    while (idx.i < lines.length) {
      let raw = lines[idx.i++];
      const cm = raw.indexOf('//') >= 0 ? raw.slice(raw.indexOf('//') + 2).trim() : '';
      let s = raw.replace(/\/\/.*$/, '').replace(/\{[^}]*\}/g, '').trim();
      if (!s) continue;
      if (endRe.test(s)) return fields;
      const m = s.match(/^"?([A-Za-z_][\w]*)"?\s*:\s*(.+?);?$/);
      if (!m) continue;
      const name = m[1];
      let ty = m[2].replace(/:=.*$/, '').replace(/;$/, '').trim();
      const f = { name: name, cm: cm };
      const arr = ty.match(/^Array\s*\[\s*(-?\d+)\s*\.\.\s*(-?\d+)\s*\]\s*of\s+(.+)$/i);
      if (arr) { f.lo = +arr[1]; f.hi = +arr[2]; ty = arr[3].trim(); }
      if (/^Struct$/i.test(ty)) { f.kind = 'struct'; f.fields = parseFields(lines, idx, /^END_STRUCT\s*;?$/i); }
      else if (/^"/.test(ty)) { f.kind = 'udt'; f.udt = ty.replace(/"/g, ''); }
      else if (/^W?String/i.test(ty)) { const n = ty.match(/\[(\d+)\]/); f.kind = 'string'; f.len = n ? +n[1] : 254; f.wide = /^WString/i.test(ty); }
      else { f.kind = 'base'; f.base = ty.toUpperCase(); if (!SCL_T[f.base]) errors.push('Тип «' + ty + '» у поля ' + name + ' не знаю — пропущен (2 байта)'); }
      fields.push(f);
    }
    return fields;
  }
  const lines = src.split('\n');
  const idx = { i: 0 };
  while (idx.i < lines.length) {
    const s = lines[idx.i++].trim();
    let m = s.match(/^TYPE\s+"([^"]+)"/i);
    if (m) {
      const name = m[1];
      while (idx.i < lines.length && !/^\s*STRUCT\s*$/i.test(lines[idx.i])) idx.i++;
      idx.i++;
      types[name] = parseFields(lines, idx, /^END_STRUCT\s*;?$/i);
      continue;
    }
    m = s.match(/^DATA_BLOCK\s+"([^"]+)"/i);
    if (m) {
      const db = { name: m[1], opt: null, fields: [], udt: null };
      while (idx.i < lines.length) {
        const t = lines[idx.i].trim();
        if (/S7_Optimized_Access\s*:=\s*'TRUE'/i.test(t)) db.opt = true;
        if (/S7_Optimized_Access\s*:=\s*'FALSE'/i.test(t)) db.opt = false;
        if (/^(STRUCT|VAR)\b/i.test(t)) { idx.i++; db.fields = parseFields(lines, idx, /^(END_STRUCT|END_VAR)\s*;?$/i); break; }
        if (/^"[^"]+"\s*$/.test(t)) { db.udt = t.replace(/"/g, ''); idx.i++; break; }
        if (/^BEGIN\b/i.test(t) || /^END_DATA_BLOCK/i.test(t)) break;
        idx.i++;
      }
      dbs.push(db);
    }
  }
  return { types: types, dbs: dbs, errors: errors };
}
// раскладка полей в плоский список {n, t, o, b, cm}
function layoutFields(fields, types, errors) {
  const out = [];
  let off = 0, bit = 0;      // текущая позиция; bit > 0 — внутри байта с Bool
  function alignByte() { if (bit) { off++; bit = 0; } }
  function alignWord() { alignByte(); if (off & 1) off++; }
  function sizeOfStruct(fl) { const sv = [off, bit]; off = 0; bit = 0; place(fl, '', [], true); alignWord(); const s = off; off = sv[0]; bit = sv[1]; return s; }
  function placeOne(f, path, cm, dry) {
    if (f.kind === 'base') {
      const d = SCL_T[f.base] || [null, 2];
      if (f.base === 'BOOL') {
        if (!dry) out.push({ n: path, t: 'bool', o: off, b: bit, cm: cm });
        bit++; if (bit === 8) { bit = 0; off++; }
        return;
      }
      if (d[1] === 1) alignByte(); else alignWord();
      if (!dry && d[0]) out.push({ n: path, t: d[0], o: off, cm: cm });
      off += d[1];
      return;
    }
    if (f.kind === 'string') { alignWord(); off += (f.len + 2) * (f.wide ? 2 : 1); return; }
    let fl = f.fields;
    if (f.kind === 'udt') { fl = types[f.udt]; if (!fl) { errors.push('Тип «' + f.udt + '» не найден в вставленном тексте — сгенерируйте исходник и для этого типа (UDT → Generate source from blocks) и вставьте его в то же поле, порядок не важен'); return; } }
    alignWord();
    place(fl, path + '.', cm, dry);
    alignWord();
  }
  function place(fl, prefix, pcm, dry) {
    fl.forEach(function (f) {
      const cm = f.cm || '';
      if (f.lo !== undefined) {
        alignWord();
        for (let i = f.lo; i <= f.hi; i++) {
          if (out.length > 4000) { errors.push('Слишком много полей (> 4000) — массив ' + f.name + ' обрезан'); return; }
          placeOne(f, prefix + f.name + '[' + i + ']', cm, dry);
        }
        alignWord();
      } else placeOne(f, prefix + f.name, cm, dry);
    });
  }
  void sizeOfStruct;
  place(fields, '', '', false);
  return out;
}
function sclToDbs(text) {
  const r = parseScl(text), errors = r.errors.slice(), res = [];
  r.dbs.forEach(function (db) {
    let fl = db.fields;
    if (db.udt) { fl = r.types[db.udt]; if (!fl) { errors.push('DB «' + db.name + '»: тип «' + db.udt + '» не найден'); return; } }
    if (db.opt === true) errors.push('DB «' + db.name + '» оптимизированный — панель читает только неоптимизированные DB (снимите «Optimized block access»)');
    res.push({ name: db.name, opt: db.opt, fields: layoutFields(fl, r.types, errors) });
  });
  if (!r.dbs.length) errors.push('В тексте не найдено ни одного DATA_BLOCK');
  return { dbs: res, errors: errors };
}
// таблица: «Имя ⇥ Тип ⇥ Смещение ⇥ … ⇥ Комментарий» (из Excel или TIA)
function tableToFields(text) {
  const out = [], errors = [], seen = {};
  text.replace(/\r/g, '').split('\n').forEach(function (ln, k) {
    if (!ln.trim()) return;
    const c = ln.split(/\t|;/).map(function (x) { return x.trim(); });
    let ti = -1, oi = -1;
    c.forEach(function (x, i) { if (ti < 0 && SCL_T[x.toUpperCase()] && i > 0) ti = i; if (oi < 0 && /^\d+(\.\d)?$/.test(x) && i > 0 && i !== ti) oi = i; });
    if (ti < 0 || oi < 0) { if (k) errors.push('Строка ' + (k + 1) + ' пропущена: нет типа или смещения'); return; }
    const d = SCL_T[c[ti].toUpperCase()];
    if (!d[0]) { errors.push('Строка ' + (k + 1) + ': тип ' + c[ti] + ' не поддерживается'); return; }
    const p = c[oi].split('.');
    let n = c[0].replace(/^"|"$/g, '') || ('f' + k);
    if (seen[n]) n = n + '_' + k;
    seen[n] = 1;
    const f = { n: n, t: d[0], o: +p[0], cm: c.length - 1 > Math.max(ti, oi) ? c[c.length - 1] : '' };
    if (d[0] === 'bool') f.b = +(p[1] || 0);
    out.push(f);
  });
  return { fields: out, errors: errors };
}
// CSV тегов EasyBuilder: имя,устройство,DBn|DBDn|DBnBit,адрес,комментарий,тип
function ebCsvToDbs(text) {
  const byNum = {}, errors = [];
  text.replace(/^﻿/, '').replace(/\r/g, '').split('\n').forEach(function (ln, k) {
    if (!ln.trim()) return;
    const c = [];
    let cur = '', q = false;
    for (let i = 0; i < ln.length; i++) {
      const ch = ln[i];
      if (ch === '"') { if (q && ln[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (ch === ',' && !q) { c.push(cur); cur = ''; } else cur += ch;
    }
    c.push(cur);
    if (c.length < 4) return;
    const ty = c[2], a = c[3], dt = (c[5] || '').toLowerCase();
    let num, o, b, t;
    if (ty === 'DBnBit') { num = +a.slice(0, -5); o = +a.slice(-5, -1); b = +a.slice(-1); t = 'bool'; }
    else if (ty === 'DBn' || ty === 'DBDn') {
      num = +a.slice(0, -4); o = +a.slice(-4);
      t = /float/.test(dt) ? 'real' : /32/.test(dt) ? (/unsigned/.test(dt) ? 'udint' : 'dint') : (/unsigned/.test(dt) ? 'uint' : 'int');
      if (ty === 'DBDn' && t === 'int') t = 'dint';
    } else { errors.push('Строка ' + (k + 1) + ': тип адреса ' + ty + ' не поддерживается (только DBn, DBDn, DBnBit)'); return; }
    if (!(num > 0)) { errors.push('Строка ' + (k + 1) + ': не разобран адрес ' + a); return; }
    const f = { n: c[0], t: t, o: o, cm: c[4] || '' };
    if (t === 'bool') f.b = b;
    (byNum[num] = byNum[num] || []).push(f);
  });
  return { dbs: Object.keys(byNum).map(function (n) { return { num: +n, fields: byNum[n] }; }), errors: errors };
}
// пересчёт смещений по порядку полей (как TIA в неоптимизированном DB) — для ручного ввода
function autoOffsets(fields) {
  let off = 0, bit = 0;
  fields.forEach(function (f) {
    if (f.t === 'bool') { f.o = off; f.b = bit; bit++; if (bit === 8) { bit = 0; off++; } return; }
    if (bit) { off++; bit = 0; }
    const size = TYPES[f.t][0];
    if (size > 1 && (off & 1)) off++;
    f.o = off; delete f.b;
    off += size;
  });
  return fields;
}
function dbSize(db) {
  return (db.fields || []).reduce(function (m, f) { return Math.max(m, +f.o + (TYPES[f.t] ? TYPES[f.t][0] : 1)); }, 0);
}
// перекрытия полей: [описание, …]
function overlaps(db) {
  const bytes = {}, bits = {}, res = [];
  (db.fields || []).forEach(function (f) {
    if (f.t === 'bool') {
      const k = f.o + '.' + (f.b || 0);
      if (bits[k]) res.push(f.n + ' и ' + bits[k] + ' (бит ' + k + ')');
      else if (bytes[f.o]) res.push(f.n + ' и ' + bytes[f.o] + ' (байт ' + f.o + ')');
      bits[k] = f.n; bits['b' + f.o] = f.n;
      return;
    }
    const n = TYPES[f.t] ? TYPES[f.t][0] : 1;
    for (let i = 0; i < n; i++) {
      const o = +f.o + i;
      const other = bytes[o] || bits['b' + o];
      if (other && other !== f.n) { res.push(f.n + ' и ' + other + ' (байт ' + o + ')'); break; }
      bytes[o] = f.n;
    }
  });
  return res;
}

const EXPORT_API = { TYPES: TYPES, ENGINE_LIMIT: ENGINE_LIMIT, encodeAddress: encodeAddress, allTags: allTags, tagName: tagName,
  walkEls: walkEls, walkObj: walkObj, refsOf: refsOf, exportScreen: exportScreen, planPolls: planPolls, sclToDbs: sclToDbs,
  tableToFields: tableToFields, ebCsvToDbs: ebCsvToDbs, autoOffsets: autoOffsets, dbSize: dbSize, overlaps: overlaps, clone: clone,
  typesOf: typesOf, popupRefs: popupRefs, libOut: libOut, compactScreen: compactScreen };
if (typeof module !== 'undefined') module.exports = EXPORT_API;
