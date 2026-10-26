// Общие помощники для генераторов окон конструктора (make_*.js). Каждый make_<окно>.js экспортирует
//   module.exports = function (L) { return { screens: [...], pops: [...], dbs: [...] }; }
// где L — результат lib(prefix). Идентификаторы элементов получают префикс окна (уникальны в проекте).
'use strict';
const fs = require('fs'), path = require('path');
const X = require('./export.js');
const ROOT = path.resolve(__dirname, '../../..');
const C = {
  bg: '#DFE0DC', panel: '#F4F4F1', white: '#FFFFFF', text: '#1D2023', text2: '#4B5157', alarmMark: '#A12020',
  run: '#1E8A3C', ready: '#2F6FB8', alarm: '#C42B2B', move: '#E0A100', stop: '#C4C7CB', panelBorder: '#B3B6B0', rowLine: '#D3D5D0',
  pulp: '#5A5F65', water: '#3F7FB4', branchOff: '#8F949A', topBar: '#23272B'
};
module.exports = function lib(prefix) {
  let N = 0;
  const id = () => prefix + (++N);
  const el = (t, o) => Object.assign({ id: id(), t: t }, o);
  const cnd = (tag, op, v, m) => ({ m: m || 'all', l: [{ tag: tag, op: op, v: v === undefined ? '' : String(v) }] });
  function T(s, x, y, size, color, align, bold, w) {   // подпись: (x, y) — точка привязки по центру строки
    w = w || Math.max(30, Math.ceil(s.length * size * 0.62) + 6);
    const bx = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    return el('text', { x: bx, y: y - 10, w: w, h: 20, tx: s, size: size, color: color, align: align || 'center', bold: !!bold });
  }
  const hp = (x1, x2, y, th, c, nm) => el('pipe', { x: x1, y: y - th / 2, w: x2 - x1, h: th, fill: c, nm: nm });
  const vp = (x, y1, y2, th, c, nm) => el('pipe', { x: x - th / 2, y: y1, w: th, h: y2 - y1, fill: c, nm: nm });
  const ln = (x1, y1, x2, y2, c, lw) => el('line', { x: x1, y: y1, x2: x2, y2: y2, w: 0, h: 0, color: c, lw: lw });
  // DB из исходников PLC (смещения считает тот же разбор, что и кнопка «Импорт…» в конструкторе)
  let _all = null;
  function importDb(name, num, ms, writeRe) {
    if (!_all) {
      const text = ['plc/0_IO_Lib.scl', 'plc/4b_PulpDivider.scl', 'plc/5_GCU_HMI.scl'].map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
      _all = X.sclToDbs(text).dbs;
    }
    const d = _all.find(x => x.name === name);
    if (!d) throw new Error('DB ' + name + ' не найден в plc/*.scl');
    return { id: 'db_' + name, name: name, num: num, ms: ms || 500,
      fields: d.fields.map(f => Object.assign(f, { wr: writeRe ? writeRe.test(f.n) : false })) };
  }
  return { C: C, X: X, el: el, cnd: cnd, T: T, hp: hp, vp: vp, ln: ln, id: id, importDb: importDb,
    screen: (sid, name, els, extra) => Object.assign({ id: sid, name: name, w: 1024, h: 664, ox: 0, oy: 48, bg: C.bg, demoChip: [660, 62], els: els }, extra || {}) };
};
