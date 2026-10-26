// Окно «Регуляторы и уставки» (окно 13): перенос hmi/js/src/scr_settings.js в элементы конструктора.
// Данные — встроенные gcuset:… (DB101) и gcu:… (DB100). Пароль инженера: свойство окна «pin» (в оригинале — "pin" в конфигурации).
'use strict';

const REPAIR_FILL = '#ECEDEA', REPAIR_LINE = '#6F757B', UNKNOWN = '#9CC3E4', BTN = '#E4E5E1', BTN_BORDER = '#8F949A';
const WARN_ROW = '#FFF6DD', BLUE_DARK = '#1F4F87', WARN_TEXT = '#8A6400';

module.exports = function (L) {
  const C = L.C, el = L.el, cnd = L.cnd, T = L.T, ln = L.ln;
  const E = [];
  const valveCol = [C.stop, C.run, C.move, C.alarm, REPAIR_FILL, UNKNOWN];
  const valveDark = [true, false, true, false, true, true];

  const panel = (x, y, w, h, title, sub) => {
    E.push(el('rect', { x: x, y: y, w: w, h: h, r: 4, fill: C.panel, stroke: C.panelBorder, lw: 1, nm: title }));
    E.push(T(title, x + 14, y + 24, 18, C.text, 'left', true, Math.ceil(title.length * 10.8) + 8));
    if (sub) E.push(T(sub, x + 22 + Math.ceil(title.length * 10.8), y + 25, 14, C.text2, 'left', false, 90));
  };
  // поле уставки: подпись слева, окно ввода справа, единица. Нажатие -> (пароль) -> клавиатура -> запись в DB101
  const field = (label, x, y, w, f, unit, dec, title, min, max) => {
    E.push(el('text', { x: x, y: y + 7, w: w - 132, h: 20, tx: label, size: 15, color: C.text2, align: 'left', fit: true }));
    E.push(el('input', { x: x + w - 126, y: y, w: 92, h: 34, tag: 'gcuset:' + f, dec: dec, unit: '', min: min, max: max, ti: title, pin: true, nm: label }));
    E.push(T(unit, x + w - 30, y + 18, 14, C.text2, 'left', false, 34));
  };
  // переключатель: серая плашка; включённая — заливка (сплошная синяя или жёлтая пунктирная «ремонт»)
  //   opt.tag — тег состояния, opt.onAct/offAct — действия при выключенном/включённом (offAct нет — нажатие в «вкл» ничего не делает)
  //   opt.dashed — вид включённого состояния (жёлтая пунктирная), opt.sub — подпись [вкл, выкл] (или null)
  const toggle = (x, y, w, h, label, opt) => {
    const on = cnd(opt.tag, '=', opt.onVal === undefined ? 1 : opt.onVal);
    const off = { m: 'any', l: [{ tag: opt.tag, op: opt.onVal === undefined ? '0' : '!=', v: opt.onVal === undefined ? '' : String(opt.onVal) }, { tag: opt.tag, op: 'nd', v: '' }] };
    E.push(el('rect', { x: x, y: y, w: w, h: h, r: 4, fill: BTN, stroke: BTN_BORDER, lw: 1, vis: off, act: opt.offAct, nm: label }));
    E.push(el('rect', { x: x, y: y, w: w, h: h, r: 4, fill: opt.dashed ? WARN_ROW : C.ready, stroke: opt.dashed ? C.move : BLUE_DARK, lw: opt.dashed ? 2 : 1,
      dash: !!opt.dashed, vis: on, act: opt.onAct, nm: label + ' (вкл)' }));
    const sub = opt.sub;
    // подпись: выключено — тёмный текст, включено — белый (синяя заливка) / тёмный (жёлтая)
    const lab = (vis, dy, color) => E.push(el('text', { x: x, y: y + h / 2 + dy - 10, w: w, h: 20, tx: label, size: 16, bold: true, color: color, align: 'center', vis: vis }));
    lab(off, sub ? -7 : 0, C.text);
    lab(on, sub ? -7 : (opt.dashed ? -7 : 0), opt.dashed ? C.text : C.white);
    if (sub) {
      E.push(el('text', { x: x, y: y + h / 2 + 12 - 10, w: w, h: 20, tx: sub[1], size: 11, bold: false, color: C.text2, align: 'center', vis: off }));
      E.push(el('text', { x: x, y: y + h / 2 + 12 - 10, w: w, h: 20, tx: sub[0], size: 11, bold: true, color: opt.dashed ? WARN_TEXT : C.white, align: 'center', vis: on }));
    }
  };
  const repairAct = (tag, name, v, nameDat, log) => ({ a: 'write', tag: tag, v: String(v), pin: true,
    cf: (v ? 'Вывести ' : 'Ввести ') + name + (v ? ' в ремонт?' : ' из ремонта?'), cm: nameDat, log: log });

  // ---------------------------------------------------------------- шапка
  E.push(T('Регуляторы и уставки', 16, 78, 22, C.text, 'left', true, 300));

  // ---------------------------------------------------------------- давление -> скорость
  panel(12, 104, 494, 196, 'Давление → скорость насоса', '· ПИ');
  field('Уставка', 28, 144, 230, 'pressSP', 'бар', 2, 'Уставка давления, бар', 0.1, 2.5);
  field('Kp', 28, 194, 230, 'kp', '%/бар', 1, 'Kp регулятора давления, %/бар', 0, 1000);
  field('Ti', 28, 244, 230, 'ti', 'с', 1, 'Ti регулятора давления, с', 0, 3600);
  field('Скор. мин.', 284, 194, 212, 'spdMin', '%', 0, 'Скорость насоса минимум, %', 0, 100);
  field('Скор. макс.', 284, 144, 212, 'spdMax', '%', 0, 'Скорость насоса максимум, %', 0, 100);
  E.push(el('value', { x: 300, y: 242, w: 200, h: 20, tag: 'gcu:press', pre: 'Сейчас: ', unit: 'бар', dec: 2, size: 13, bold: false, color: C.text2, align: 'left' }));
  E.push(el('value', { x: 300, y: 260, w: 200, h: 20, tag: 'gcu:speedOut', pre: 'скорость ', unit: '%', dec: 1, size: 13, bold: false, color: C.text2, align: 'left' }));

  // ---------------------------------------------------------------- уровень -> гидроциклоны
  panel(518, 104, 494, 196, 'Уровень → гидроциклоны', '· ступенчатый');
  field('Уставка', 534, 144, 230, 'levelSP', '%', 1, 'Уставка уровня, %', 5, 95);
  field('Зона ±', 774, 144, 226, 'hyst', '%', 1, 'Зона нечувствительности ±, %', 0.5, 20);
  field('Подключение', 534, 194, 230, 'tAdd', 'с', 0, 'Подключение циклона через, с', 1, 600);
  field('Отключение', 774, 194, 226, 'tRem', 'с', 0, 'Отключение циклона через, с', 1, 600);
  field('Мин. для пуска', 534, 244, 230, 'startMin', '%', 1, 'Минимум уровня для пуска, %', 0, 100);
  E.push(el('value', { x: 790, y: 242, w: 200, h: 20, tag: 'gcu:level', pre: 'Сейчас: ', unit: '%', dec: 1, size: 13, bold: false, color: C.text2, align: 'left' }));
  E.push(el('value', { x: 790, y: 260, w: 200, h: 20, tag: 'gcu:nCyc', pre: 'открыто циклонов: ', dec: 0, size: 13, bold: false, color: C.text2, align: 'left' }));

  // ---------------------------------------------------------------- гидроциклоны
  panel(12, 312, 494, 392, 'Гидроциклоны', null);
  field('При пуске', 28, 352, 230, 'nStart', 'шт', 0, 'Циклонов при пуске, шт', 1, 6);
  field('Минимум', 268, 352, 226, 'nMin', 'шт', 0, 'Циклонов минимум, шт', 0, 6);
  field('Максимум', 28, 402, 230, 'nMax', 'шт', 0, 'Циклонов максимум, шт', 1, 6);
  E.push(T('Вывод в ремонт (нажатие переключает)', 28, 470, 15, C.text2, 'left', false, 300));
  for (let k = 1; k <= 6; k++) {
    const tag = 'gcuset:repair.' + (1 + k);
    toggle(28 + (k - 1) * 78, 488, 70, 58, 'ГЦ' + k, { tag: tag, dashed: true, sub: ['РЕМОНТ', 'в работе'],
      offAct: repairAct(tag, 'ГЦ-' + k, 1, 'Регулятор уровня перестанет открывать этот циклон.', 'ГЦ-' + k + ' выведен в ремонт'),
      onAct: repairAct(tag, 'ГЦ-' + k, 0, 'Циклон снова будет использоваться регулятором уровня.', 'ГЦ-' + k + ' введён из ремонта') });
  }
  E.push(T('Задвижки подачи', 28, 572, 15, C.text2, 'left', false, 200));
  for (let k = 1; k <= 6; k++) {
    const V = 'gcu:valve.' + (12 + k) + '.view';
    E.push(el('state', { x: 28 + (k - 1) * 78, y: 588, w: 70, h: 26, r: 3, tag: V, size: 12, ndt: '—', dtx: '?', nm: 'Задвижка ГЦ-' + k,
      sts: ['закр.', 'откр.', 'движ.', 'авария', 'ремонт', 'неизв.'].map((t, i) => ({ v: i, tx: t, f: valveCol[i], c: valveDark[i] ? C.text : C.white })),
      st: [{ c: cnd(V, '=', 4), p: { stroke: REPAIR_LINE } }], act: { a: 'valvewin', n: 12 + k } }));
  }
  E.push(T('нажатие — окно задвижки', 28, 632, 12, C.text2, 'left', false, 200));

  // ---------------------------------------------------------------- насосы
  panel(518, 312, 494, 392, 'Насосы', null);
  E.push(T('Основной насос', 534, 374, 15, C.text2, 'left', false, 200));
  for (let n = 1; n <= 2; n++) {
    toggle(760 + (n - 1) * 120, 352, 110, 44, 'Н-' + n, { tag: 'gcuset:duty', onVal: n,
      offAct: { a: 'write', tag: 'gcuset:duty', v: String(n), pin: true, cf: 'Сделать Н-' + n + ' основным?', cm: 'Резервный насос включается по АВР.', log: 'Основной насос: Н-' + n } });
  }
  E.push(T('Вывод в ремонт', 534, 430, 15, C.text2, 'left', false, 200));
  for (let n = 1; n <= 2; n++) {
    const tag = 'gcuset:repair.' + (n - 1);
    toggle(760 + (n - 1) * 120, 408, 110, 44, 'Н-' + n, { tag: tag, dashed: true, sub: null,
      offAct: repairAct(tag, 'Н-' + n, 1, 'Насос не будет пускаться ни алгоритмом, ни АВР.', 'Насос Н-' + n + ' выведен в ремонт'),
      onAct: repairAct(tag, 'Н-' + n, 0, 'Насос снова будет доступен для работы и АВР.', 'Насос Н-' + n + ' введён из ремонта') });
    // подпись «РЕМОНТ» в включённом состоянии (в оригинале — вторая строка)
    E.push(el('text', { x: 760 + (n - 1) * 120, y: 408 + 22 + 12 - 10, w: 110, h: 20, tx: 'РЕМОНТ', size: 11, bold: true, color: WARN_TEXT, align: 'center', vis: cnd(tag, '1') }));
  }
  E.push(ln(530, 470, 1000, 470, C.rowLine, 1));
  E.push(T('Время шагов последовательности', 534, 492, 15, C.text, 'left', true, 300));
  field('Размыв (пуск)', 534, 512, 230, 'tScour', 'с', 0, 'Размыв при пуске, с', 1, 600);
  field('Пром. (пуск)', 774, 512, 226, 'tFlushStart', 'с', 0, 'Промывка при пуске, с', 1, 600);
  field('Пром. (стоп)', 534, 562, 230, 'tFlushStop', 'с', 0, 'Промывка при останове, с', 1, 600);
  field('Дренаж', 774, 562, 226, 'tDrain', 'с', 0, 'Дренаж, с', 1, 600);
  E.push(T('Уставки хранятся в DB101 (сохраняемый блок).', 534, 630, 12, C.text2, 'left', false, 340));
  E.push(T('Значение вне диапазона ПЛК поправит сам.', 534, 648, 12, C.text2, 'left', false, 340));

  return { screens: [L.screen('se_s1', 'Регуляторы и уставки', E, { demoChip: [480, 62] })], pops: [], dbs: [] };
};
