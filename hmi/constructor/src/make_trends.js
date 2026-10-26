// Окно 15 «Тренды» (hmi/js/src/scr_trends.js) для конструктора.
// Оригинал рисует график из истории регистратора (8 ч, две шкалы). В конструкторе — два элемента «Тренд» (%, бар):
// история копится, пока окно открыто; переключатели 15 мин/1 ч/8 ч и прокрутка недоступны — см. examples/GAPS_alarms_trends_io.md
'use strict';
module.exports = function (L) {
  const C = L.C, el = L.el, T = L.T, cnd = L.cnd;
  const OR = '#B5651D';
  const E = [];
  E.push(el('rect', { x: 12, y: 56, w: 760, h: 648, r: 4, fill: C.panel, stroke: C.panelBorder, lw: 1, nm: 'Панель графика' }));
  E.push(T('Тренды', 28, 82, 22, C.text, 'left', true, 200));
  E.push(T('окно 1 ч · история копится, пока открыто это окно', 300, 82, 14, C.text2, 'left', false, 460));
  // уровень и скорость — шкала в % (слева в оригинале); давление — своя шкала в барах (справа в оригинале)
  E.push(el('trend', { x: 20, y: 104, w: 744, h: 296, min: 0, max: 100, span: 3600, dec: 0, nm: 'Уровень и скорость, %', pens: [
    { tag: 'gcu:level', c: OR, n: 'Уровень, %' }, { tag: 'gcu:set.levelSP', c: '#D9A66B', n: 'Уставка уровня' }, { tag: 'gcu:speedOut', c: C.text, n: 'Скорость насоса, %' }] }));
  E.push(el('trend', { x: 20, y: 408, w: 744, h: 288, min: 0, max: 2.5, span: 3600, dec: 2, nm: 'Давление, бар', pens: [
    { tag: 'gcu:press', c: C.ready, n: 'Давление, бар' }, { tag: 'gcu:set.pressSP', c: '#8FB4DD', n: 'Уставка давления' }] }));
  // ---- сейчас
  E.push(el('rect', { x: 784, y: 56, w: 228, h: 648, r: 4, fill: C.panel, stroke: C.panelBorder, lw: 1, nm: 'Панель «Сейчас»' }));
  E.push(T('Сейчас', 798, 82, 18, C.text, 'left', true, 120));
  const card = (y, color, title, tag, dec, unit, subTag, subPre, subUnit, nm) => {
    E.push(el('rect', { x: 796, y: y, w: 204, h: 96, r: 4, fill: C.white, stroke: C.panelBorder, lw: 1, nm: 'Карточка: ' + nm }));
    E.push(el('rect', { x: 797, y: y + 1, w: 5, h: 94, fill: color }));
    E.push(T(title, 812, y + 20, 13, C.text2, 'left', false, 180));
    E.push(el('value', { x: 812, y: y + 33, w: 180, h: 34, tag: tag, dec: dec, unit: unit, size: 26, bold: true, align: 'left', nm: nm }));
    if (subTag) E.push(el('value', { x: 812, y: y + 68, w: 184, h: 20, tag: subTag, dec: dec, pre: subPre, unit: subUnit, size: 12, color: C.text2, bold: false, align: 'left', nm: nm + ': уставка' }));
    else E.push(T('задание регулятора', 812, y + 78, 12, C.text2, 'left', false, 180));
  };
  card(104, OR, 'Уровень зумпфа', 'gcu:level', 1, '%', 'gcu:set.levelSP', 'уставка ', ' %', 'Уровень');
  card(212, C.ready, 'Давление на циклонах', 'gcu:press', 2, 'бар', 'gcu:set.pressSP', 'уставка ', ' бар', 'Давление');
  card(320, C.text, 'Скорость насоса', 'gcu:speedOut', 1, '%', null, '', '', 'Скорость');
  E.push(T('Открыто циклонов:', 798, 446, 14, C.text, 'left', false, 140));
  E.push(el('value', { x: 940, y: 436, w: 60, h: 20, tag: 'gcu:nCyc', dec: 0, size: 14, align: 'left' }));
  E.push(T('Рабочий насос:', 798, 470, 14, C.text, 'left', false, 120));
  E.push(el('value', { x: 918, y: 460, w: 82, h: 20, tag: 'gcu:activePump', fm: 'map', map: [{ v: 0, tx: '—' }, { v: 1, tx: 'Н-1' }, { v: 2, tx: 'Н-2' }], size: 14, align: 'left' }));
  E.push(T('История — пока открыто окно.', 798, 640, 12, C.text2, 'left', false, 200));
  E.push(T('После перезагрузки панели', 798, 658, 12, C.text2, 'left', false, 200));
  E.push(T('история начинается заново.', 798, 676, 12, C.text2, 'left', false, 200));
  return { screens: [L.screen('tr_s1', 'Тренды', E, { demoChip: [130, 66] })], pops: [], dbs: [] };
};
