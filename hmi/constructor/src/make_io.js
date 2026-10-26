// Окно 17 «Входы/выходы» (hmi/js/src/scr_io.js + io_signals.js) для конструктора. DB102 HMI_IO.
// Выбор сигнала: вкладки пишут Kind, номер — поле ввода Id, имя сигнала — «текст по значению» от Id.
// Правка параметров ДВУХШАГОВАЯ (в конструкторе одно действие = одна запись): 1) значение в поле «Значение для ▶»
// (HMI_IO.CmdVal), 2) кнопка ▶ в нужной строке пишет код поля в HMI_IO.Cmd. См. examples/GAPS_alarms_trends_io.md
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
module.exports = function (L) {
  const C = L.C, el = L.el, T = L.T, cnd = L.cnd;
  const sigSrc = fs.readFileSync(path.join(__dirname, '../../js/src/io_signals.js'), 'utf8');
  const SIG = vm.runInNewContext('(' + sigSrc.slice(sigSrc.indexOf('const SIG = ') + 12).replace(/;\s*$/, '') + ')');
  // Окно в одном JS-объекте не помещается в лимит (~100 КБ): две части — «DI / DO» и «AI / AO».
  // Вкладки своей части пишут Kind, вкладки другой части открывают её окно (действие «Перейти в базовое окно»).
  const a = build(L, SIG, [1, 2], 'io_s1', 'Входы и выходы: DI / DO', 19, true);
  const b = build(L, SIG, [3, 4], 'io_s2', 'Входы и выходы: AI / AO', 17, false);
  return { screens: a.screens.concat(b.screens), pops: [], dbs: a.dbs };
};
function build(L, SIG, KS, sid, sname, otherWin, withDb) {
  const C = L.C, el = L.el, T = L.T, cnd = L.cnd;
  const KINDS = ['', 'DI', 'DO', 'AI', 'AO'];
  const KTITLE = ['', 'Диагностика дискретных входных сигналов. DI', 'Диагностика дискретных выходных сигналов. DO',
    'Диагностика входных аналоговых сигналов. AI', 'Диагностика выходных аналоговых сигналов. AO'];
  const PRE = { 1: 'HMI_IO.DIn.', 2: 'HMI_IO.DOut.', 3: 'HMI_IO.AIn.', 4: 'HMI_IO.AOut.' };
  const K = 'HMI_IO.Kind';
  const E = [];
  E.push(T('Входы и выходы', 16, 78, 22, C.text, 'left', true, 260));
  for (let k = 1; k <= 4; k++) {
    const own = KS.indexOf(k) >= 0;
    E.push(el('button', { x: 16 + (k - 1) * 138, y: 104, w: 130, h: 40, tx: KINDS[k] + ' · ' + SIG[KINDS[k]].length, style: 'blue', size: 16,
      ac: own ? cnd(K, '=', k) : undefined, act: own ? { a: 'write', tag: K, v: String(k) } : { a: 'win', n: String(otherWin) }, nm: 'Вкладка ' + KINDS[k] }));
  }
  E.push(el('text', { x: 16 + 4 * 138, y: 112, w: 440, h: 24, size: 13, color: C.text2, align: 'left', nm: 'Подсказка вкладок',
    tx: KS[0] === 1 ? 'Вкладки AI / AO открывают окно ' + otherWin + '. Нажмите DI или DO.' : 'Вкладки DI / DO открывают окно ' + otherWin + '. Нажмите AI или AO.' }));
  E.push(el('rect', { x: 12, y: 152, w: 1000, h: 32, fill: C.topBar, nm: 'Заголовок' }));
  for (const k of KS) E.push(el('text', { x: 24, y: 158, w: 560, h: 20, tx: KTITLE[k], size: 17, bold: true, color: C.white, align: 'left', vis: cnd(K, '=', k), nm: 'Заголовок ' + KINDS[k] }));
  E.push(el('text', { x: 560, y: 161, w: 444, h: 16, tx: 'Правка: 1) значение справа вверху  2) ▶ в нужной строке', size: 12, color: '#C9CCD0', align: 'right' }));
  // выбор сигнала: Id (клавиатура) + имя по значению Id
  E.push(el('input', { x: 12, y: 190, w: 96, h: 40, tag: 'HMI_IO.Id', dec: 0, min: 1, max: 99, ti: 'Номер сигнала (ID)', size: 18, nm: 'ID сигнала' }));
  for (const k of KS) {
    const map = SIG[KINDS[k]].map((s, i) => ({ v: i + 1, tx: s[0] + '  ·  ' + s[1] }));
    E.push(el('value', { x: 116, y: 190, w: 896, h: 40, tag: 'HMI_IO.Id', fm: 'map', map: map, size: 16, bold: true, align: 'left', pad: 12,
      fill: C.white, stroke: C.btnBorder || '#8F949A', r: 3, vis: cnd(K, '=', k), nm: 'Имя сигнала ' + KINDS[k] }));
  }
  // значение для ▶
  E.push(T('Значение для ▶:', 640, 253, 14, C.text2, 'left', true, 124));
  E.push(el('input', { x: 764, y: 240, w: 110, h: 26, tag: 'HMI_IO.CmdVal', dec: 3, min: -99999, max: 99999, ti: 'Значение для записи в параметр (CmdVal)', pin: true, nm: 'CmdVal' }));
  E.push(el('button', { x: 880, y: 240, w: 60, h: 26, tx: '= 1', size: 13, act: { a: 'write', tag: 'HMI_IO.CmdVal', v: '1', pin: true }, nm: 'CmdVal = 1' }));
  E.push(el('button', { x: 946, y: 240, w: 60, h: 26, tx: '= 0', size: 13, act: { a: 'write', tag: 'HMI_IO.CmdVal', v: '0', pin: true }, nm: 'CmdVal = 0' }));

  // ---- панель параметров
  const X = 12, Y = 272, W = 624, H = 432, RX = 24, VX = 330;
  E.push(el('rect', { x: X, y: Y, w: W, h: H, r: 4, fill: C.panel, stroke: C.panelBorder, lw: 1, nm: 'Панель параметров' }));
  const MASKW = 'Маскирование подменяет реальный сигнал значением маскирования. Логика ГЦУ будет работать по подменённому значению.';
  const grp = (k, els) => E.push({ id: L.id(), t: 'group', x: 0, y: 0, w: 1024, h: 664, vis: cnd(K, '=', k), els: els, nm: 'Параметры ' + KINDS[k] });
  function mk(k) {
    const P = PRE[k], G = [];
    let y = Y + 10;
    const RH = k === 3 ? 26 : 34;
    const lbl = (s) => G.push(T(s, RX, y + 13, 15, C.text, 'left', false, VX - RX - 10));
    const ro = (x, w, name, dec, o) => G.push(el('value', Object.assign({ x: x, y: y, w: w, h: 26, tag: P + name, dec: dec, size: 15, bold: true, align: 'right', pad: 8, fill: '#ECEDEA', stroke: C.panelBorder, r: 3, nm: name }, o || {})));
    const roBool = (x, w, name, green) => ro(x, w, name, 0, { fm: 'bool', on: '1', off: '0', st: green ? [{ c: cnd(P + name, '1'), p: { color: C.run } }] : undefined });
    const ap = (x, code, label, warn, w) => G.push(el('button', { x: x, y: y, w: w || 34, h: 26, tx: '▶', size: 13, nm: '▶ ' + label,
      act: Object.assign({ a: 'write', tag: 'HMI_IO.Cmd', v: String(code), pin: true}, warn ? { cf: label + '?', cm: warn } : {}) }));
    const ed = (x, w, name, dec, code, label) => { ro(x, w, name, dec, { color: C.ready }); ap(x + w + 4, code, label); };
    const tg = (x, w, name, code, label, onT, offT, warn) => {
      G.push(el('state', { x: x, y: y, w: w, h: 26, tag: P + name, r: 3, size: 13, stroke: C.panelBorder, sts: [{ v: 1, tx: onT, f: C.run, c: C.white }, { v: 0, tx: offT, f: C.btn || '#E4E5E1', c: C.text }] }));
      ap(x + w + 4, code, label, warn);
    };
    const next = () => { y += RH; };
    const dot = (s) => G.push(T(s, 0, y + 13, 15, C.text2, 'center', false, 14));
    if (k === 1 || k === 2) {
      lbl('Текущее значение'); roBool(VX, 110, 'Value', true); next();
      lbl(k === 1 ? 'Сигнал на входном блоке' : 'Сигнал на выходном блоке'); roBool(VX, 110, 'RawVal'); next();
      lbl('Адрес в ПЛК (байт . бит)'); ro(VX, 52, 'AdrByte', 0); G.push(T('.', VX + 58, y + 13, 15, C.text2, 'center', false, 10)); ro(VX + 64, 46, 'AdrBit', 0);
      G.push(el('value', { x: VX + 122, y: y, w: 100, h: 26, tag: P + 'AdrByte', fm: 'map', map: [], size: 14, color: C.text2, align: 'left', bold: false, nm: 'Адрес %' })); next();
      lbl('Статусный бит (байт . бит)'); ro(VX, 52, 'StatusBYTE', 0); G.push(T('.', VX + 58, y + 13, 15, C.text2, 'center', false, 10)); ro(VX + 64, 46, 'StatusBIT', 0); next();
      if (k === 1) {
        lbl('Режим алармирования'); tg(VX, 110, 'AlmMode', 5, 'Режим алармирования', 'по 1', 'по 0'); next();
        lbl('Алармирование'); tg(VX, 110, 'AlmUse', 4, 'Алармирование', 'ВКЛ', 'ВЫКЛ'); next();
        lbl('Задержка срабатывания аварии, мс'); ed(VX, 110, 'Timeout', 0, 21, 'Задержка аварии, мс'); next();
        lbl('Текущее время аварии, мс'); ro(VX, 110, 'TimeAlarm', 0); next();
        lbl('Постоянная фильтра, с'); ed(VX, 110, 'Tf', 2, 20, 'Постоянная фильтра, с'); next();
      }
      lbl('Значение маскирования сигнала'); tg(VX, 74, 'MaskValue', 3, 'Значение маскирования', '1', '0');
      y += 0; G.push(el('state', { x: VX + 118, y: y, w: 120, h: 26, tag: P + 'Mask', r: 3, size: 13, stroke: C.panelBorder, sts: [{ v: 1, tx: 'МАСКА ВКЛ', f: C.run, c: C.white }, { v: 0, tx: 'МАСКА ВЫКЛ', f: C.btn || '#E4E5E1', c: C.text }] }));
      G.push(el('button', { x: VX + 242, y: y, w: 34, h: 26, tx: '▶', size: 13, nm: '▶ Маскирование', act: { a: 'write', tag: 'HMI_IO.Cmd', v: '2', pin: true, cf: 'Маскирование?', cm: MASKW } })); next();
    } else {
      const unit = '';
      lbl('Текущее значение'); ro(VX, 120, 'Value', 2); next();
      if (k === 3) {
        lbl('Адрес в ПЛК (%IW) · статус байт.бит'); ro(VX, 120, 'AdrByte', 0); ro(VX + 132, 52, 'StatusBYTE', 0); G.push(T('.', VX + 188, y + 13, 15, C.text2, 'center', false, 10)); ro(VX + 194, 46, 'StatusBIT', 0); next();
        [['HiHi', 'HiHiUse', 'Верхняя аварийная уставка (ВАУ)', 25, 9], ['Hi', 'HiUse', 'Верхняя предупр. уставка (ВПУ)', 26, 10],
          ['Lo', 'LoUse', 'Нижняя предупр. уставка (НПУ)', 27, 11], ['LoLo', 'LoLoUse', 'Нижняя аварийная уставка (НАУ)', 28, 12]].forEach(s => {
          lbl(s[2]); ed(VX, 90, s[0], 2, s[3], s[2]); tg(VX + 132, 70, s[1], s[4], s[2] + ' — использование', 'ВКЛ', 'ВЫКЛ'); next();
        });
        lbl('Задержка аварии, мс'); ed(VX, 120, 'Timeout', 0, 21, 'Задержка аварии, мс'); next();
        lbl('Гистерезис, % шкалы'); ed(VX, 120, 'Threshold', 2, 30, 'Гистерезис, % шкалы'); next();
        lbl('Тип сигнала (0 4–20 мА, 1 КИП, 2 темп., 5 ABB)'); ed(VX, 120, 'AIType', 0, 31, 'Тип сигнала'); next();
        lbl('Шкала в инж. единицах (мин – макс)'); ed(VX, 90, 'MinEU', 2, 23, 'Шкала, минимум'); ed(VX + 140, 90, 'MaxEU', 2, 24, 'Шкала, максимум'); next();
        lbl('Шкала в единицах АЦП (мин – макс)'); ed(VX, 90, 'MinRaw', 0, 32, 'АЦП, минимум'); ed(VX + 140, 90, 'MaxRaw', 0, 33, 'АЦП, максимум'); next();
        lbl('Переполнение (снизу / сверху)'); ed(VX, 90, 'Underflow', 0, 35, 'Переполнение снизу'); ed(VX + 140, 90, 'Overflow', 0, 34, 'Переполнение сверху'); next();
        lbl('Постоянная фильтра, с'); ed(VX, 120, 'Tf', 2, 20, 'Постоянная фильтра, с'); next();
        lbl('Множитель'); ed(VX, 120, 'Factor', 3, 29, 'Множитель'); next();
        lbl('Значение АЦП · ток, мА'); ro(VX, 120, 'RawVal', 0); ro(VX + 132, 110, 'Current', 2); next();
      } else {
        lbl('Адрес в ПЛК (%QW)'); ro(VX, 120, 'AdrByte', 0); next();
        lbl('Тип сигнала'); ed(VX, 120, 'AOType', 0, 31, 'Тип сигнала'); next();
        lbl('Шкала в инж. единицах (мин – макс)'); ed(VX, 90, 'MinEU', 2, 23, 'Шкала, минимум'); ed(VX + 140, 90, 'MaxEU', 2, 24, 'Шкала, максимум'); next();
        lbl('Шкала в единицах АЦП (мин – макс)'); ed(VX, 90, 'MinRaw', 0, 32, 'АЦП, минимум'); ed(VX + 140, 90, 'MaxRaw', 0, 33, 'АЦП, максимум'); next();
        lbl('Значение в единицах АЦП'); ro(VX, 120, 'RawVal', 0); next();
        lbl('Значение тока, мА'); ro(VX, 120, 'Current', 2); next();
      }
      void unit; void dot;
      lbl('Значение маскирования сигнала'); ed(VX, 90, 'MaskValue', 2, 22, 'Значение маскирования');
      G.push(el('state', { x: VX + 140, y: y, w: 120, h: 26, tag: P + 'Mask', r: 3, size: 13, stroke: C.panelBorder, sts: [{ v: 1, tx: 'МАСКА ВКЛ', f: C.run, c: C.white }, { v: 0, tx: 'МАСКА ВЫКЛ', f: C.btn || '#E4E5E1', c: C.text }] }));
      G.push(el('button', { x: VX + 264, y: y, w: 34, h: 26, tx: '▶', size: 13, nm: '▶ Маскирование', act: { a: 'write', tag: 'HMI_IO.Cmd', v: '2', pin: true, cf: 'Маскирование?', cm: MASKW } })); next();
    }
    return G;
  }
  // у адресов %I/%Q текст-подсказка не строится (его нет в данных ПЛК): убрать пустышку
  KS.forEach(k => { const g = mk(k).filter(e => !(e.t === 'value' && e.fm === 'map' && !(e.map || []).length)); grp(k, g); });

  // ---- сигнализации
  const SX = 648, SY = 272, SW = 364;
  E.push(el('rect', { x: SX, y: SY, w: SW, h: 212, r: 4, fill: C.panel, stroke: C.panelBorder, lw: 1, nm: 'Панель сигнализаций' }));
  E.push(T('Сигнализации', SX + 14, SY + 22, 17, C.text, 'left', true, 200));
  const lists = {
    1: [['Авария сигнала', 'IsAlarm'], ['Сигнал недостоверный', 'Quality', 0, 1], ['Сигнал замаскирован', 'Mask', 'W'], ['Сигнал неактивен', 'Active', 'W', 1], ['Алармы отключены', 'AlmDisable', 'W']],
    2: [['Сигнал недостоверный', 'Quality', 0, 1], ['Сигнал замаскирован', 'Mask', 'W'], ['Сигнал неактивен', 'Active', 'W', 1]],
    3: [['Верхняя аварийная граница', 'AlmHiHi'], ['Верхняя предупредительная граница', 'AlmHi', 'W'], ['Нижняя предупредительная граница', 'AlmLo', 'W'],
      ['Нижняя аварийная граница', 'AlmLoLo'], ['Сигнал недостоверный', 'Quality', 0, 1], ['Сигнал замаскирован', 'Mask', 'W']],
    4: [['Сигнал недостоверный', 'Quality', 0, 1], ['Сигнал замаскирован', 'Mask', 'W'], ['Сигнал неактивен', 'Active', 'W', 1]]
  };
  for (const k of KS) {
    const G = [];
    lists[k].forEach((q, i) => {
      const y = SY + 50 + i * 29;
      G.push(T(q[0], SX + 14, y, 14, C.text, 'left', false, 280));
      G.push(el('lamp', { x: SX + SW - 35, y: y - 9, w: 18, h: 18, tag: PRE[k] + q[1], inv: !!q[3], on: q[2] === 'W' ? C.move : C.alarm, off: C.white, stroke: '#8F949A', nm: q[0] }));
    });
    E.push({ id: L.id(), t: 'group', x: 0, y: 0, w: 1024, h: 664, vis: cnd(K, '=', k), els: G, nm: 'Сигнализации ' + KINDS[k] });
  }
  // ---- управление сигналом
  const CX = 648, CY = 494;
  E.push(el('rect', { x: CX, y: CY, w: SW, h: 210, r: 4, fill: C.panel, stroke: C.panelBorder, lw: 1, nm: 'Панель управления сигналом' }));
  E.push(T('Управление сигналом', CX + 14, CY + 22, 17, C.text, 'left', true, 240));
  const ACTW = 'Неактивный сигнал не обрабатывается: значение не обновляется, аварии не формируются.';
  const ctl = {
    1: [['Активность', 'Active', 1, ACTW], ['Инверсия сигнала', 'Inverse', 7, 'Значение сигнала станет противоположным.'], ['Деактивация алармов', 'AlmDisable', 6, 'Аварии этого сигнала перестанут формироваться.'], ['Инверсия статусного бита', 'StatBit_REV', 8, null]],
    2: [['Активность', 'Active', 1, ACTW], ['Инверсия сигнала', 'Inverse', 7, 'Значение сигнала станет противоположным.'], ['Инверсия статусного бита', 'StatBit_REV', 8, null]],
    3: [['Активность', 'Active', 1, ACTW], ['Деактивация алармов', 'AlmDisable', 6, 'Аварии этого сигнала перестанут формироваться.']],
    4: [['Активность', 'Active', 1, ACTW]]
  };
  for (const k of KS) {
    const G = [];
    ctl[k].forEach((r, i) => {
      const y = CY + 42 + i * 36;
      G.push(T(r[0], CX + 14, y + 13, 14, C.text, 'left', false, 190));
      G.push(el('state', { x: CX + SW - 164, y: y, w: 110, h: 26, tag: PRE[k] + r[1], r: 3, size: 13, stroke: C.panelBorder, sts: [{ v: 1, tx: 'ВКЛ', f: C.run, c: C.white }, { v: 0, tx: 'ВЫКЛ', f: '#E4E5E1', c: C.text }] }));
      G.push(el('button', { x: CX + SW - 50, y: y, w: 34, h: 26, tx: '▶', size: 13, nm: '▶ ' + r[0],
        act: Object.assign({ a: 'write', tag: 'HMI_IO.Cmd', v: String(r[2]), pin: true }, r[3] ? { cf: r[0] + '?', cm: r[3] } : {}) }));
    });
    E.push({ id: L.id(), t: 'group', x: 0, y: 0, w: 1024, h: 664, vis: cnd(K, '=', k), els: G, nm: 'Управление ' + KINDS[k] });
  }
  // ---- DB102
  const db = L.importDb('HMI_IO', 102, 500, /^(Kind|Id|Cmd|CmdVal)$/);
  const demo = { Kind: 1, Id: 1, MaxId: 99, 'DIn.Active': 1, 'DIn.Quality': 1, 'DIn.Value': 1, 'DIn.AdrByte': 32, 'DIn.AdrBit': 4, 'DIn.StatusBYTE': -1, 'DIn.Tf': 0.1, 'DIn.Timeout': 3000,
    'AIn.Active': 1, 'AIn.Quality': 1, 'AIn.Value': 70, 'AIn.MaxEU': 100, 'AIn.Hi': 85, 'AIn.HiUse': 1, 'AIn.MaxRaw': 27648, 'AIn.Factor': 1, 'AIn.Current': 16 };
  db.fields.forEach(f => { if (demo[f.n] !== undefined) f.d = demo[f.n]; });
  return { screens: [L.screen(sid, sname, E, { demoChip: [600, 64] })], pops: [], dbs: withDb ? [db] : [] };
}
