// Окно 14 «Аварии и события» (hmi/js/src/scr_alarms.js) для конструктора.
// Активные тревоги — элементом «Список сообщений» по тегам gcu:… (те же условия, что alarmList() ядра).
// Журнал, время появления, квитирование по строкам и постраничный вывод в конструкторе недоступны — см. examples/GAPS_alarms_trends_io.md
'use strict';
const fs = require('fs'), path = require('path');
module.exports = function (L) {
  const C = L.C, el = L.el, T = L.T, ln = L.ln, cnd = L.cnd;
  const core = fs.readFileSync(path.join(__dirname, '../../js/src/core.js'), 'utf8');
  const VALVE_NAMES = eval(core.match(/const VALVE_NAMES = (\[[\s\S]*?\]);/)[1]);
  const FAULT_TEXT = eval('(' + core.match(/const FAULT_TEXT = (\{[\s\S]*?\});/)[1] + ')');
  const ALM_DEF = eval(core.match(/const ALM_DEF = (\[[\s\S]*?\n\]);/)[1]);
  const E = [];
  E.push(T('Аварии и события', 16, 78, 22, C.text, 'left', true, 300));
  E.push(el('rect', { x: 790, y: 72, w: 10, h: 10, fill: C.alarm })); E.push(T('авария', 804, 78, 13, C.text2, 'left'));
  E.push(el('rect', { x: 856, y: 72, w: 10, h: 10, fill: C.move })); E.push(T('предупр.', 870, 78, 13, C.text2, 'left'));
  E.push(el('rect', { x: 934, y: 72, w: 10, h: 10, fill: '#8F949A' })); E.push(T('событие', 948, 78, 13, C.text2, 'left'));
  E.push(el('text', { x: 250, y: 66, w: 520, h: 24, tx: 'Активные тревоги и предупреждения ГЦУ', size: 15, color: C.text2, align: 'left', nm: 'Заголовок' }));

  // ---- активные тревоги (как alarmList() в core.js)
  const items = [];
  const it = (tag, c, tx) => items.push({ tag: tag, tx: tx, c: c });
  ALM_DEF.forEach((d, i) => { if (d[0] !== 'E') it('gcu:alm.' + i, d[0], d[1]); });
  ['пульт ГЦУ', 'шкаф гидроциклонов', 'шкаф ПЛК', 'панель HMI'].forEach((w, i) => it('gcu:alm2.estop.' + i, 'A', 'Нажата кнопка аварийного стопа: ' + w));
  for (let n = 1; n <= 2; n++) it('gcu:alm2.sealBad.' + n, 'W', 'Н-' + n + ': датчик давления гидроподпора неисправен (защита не работает)');
  for (let n = 1; n <= 2; n++) {
    const P = 'gcu:pump.' + n + '.', N = 'Н-' + n + ': ';
    [['fltDrive', 'авария частотника'], ['fltComm', 'нет связи с частотником (Profibus)'], ['fltStart', 'частотник не запустился'],
      ['fltStop', 'частотник не остановился'], ['fltUnxStart', 'самопроизвольный пуск'], ['fltUnxStop', 'самопроизвольный останов']]
      .forEach(f => it(P + f[0], 'A', N + f[1]));
    it(P + 'repair', 'W', 'Насос Н-' + n + ' выведен в ремонт');
  }
  for (let i = 1; i <= 18; i++) {
    const P = 'gcu:valve.' + i + '.', N = VALVE_NAMES[i] + ': ';
    [['fltTravel', 'превышено время хода'], ['fltLimits', 'неисправность концевиков'], ['fltSwitch', 'неисправность местного переключателя'],
      ['fltSignal', 'недостоверный сигнал']].forEach(f => it(P + f[0], 'A', N + f[1]));
    if (i >= 13) it(P + 'repair', 'W', 'Гидроциклон ' + (i - 12) + ' выведен в ремонт');
  }
  const X0 = 12, Y0 = 106, W0 = 1000;
  E.push(el('alarms', { x: X0, y: Y0, w: W0, h: 464, items: items, empty: 'Активных аварий и предупреждений нет', size: 15, rh: 38, nm: 'Активные тревоги' }));
  // причина аварийного останова линии (код → текст): отдельные строки под списком
  const faultMap = Object.keys(FAULT_TEXT).map(k => ({ v: +k, tx: 'аварийный останов — ' + FAULT_TEXT[k] }));
  [1, 2].forEach((n, i) => {
    const tag = 'gcu:pump.' + n + '.faultCode';
    E.push(el('value', { x: X0 + 12, y: Y0 + 474 + i * 24, w: W0 - 24, h: 22, tag: tag, fm: 'map', map: faultMap, pre: 'Н-' + n + ': ', size: 15, bold: true,
      color: C.alarm, align: 'left', vis: cnd(tag, '>', 0), nm: 'Причина останова Н-' + n }));
  });
  E.push(el('text', { x: X0 + 12, y: Y0 + 520, w: W0 - 24, h: 20, size: 12, color: C.text2, align: 'left', tx: 'Журнал событий, время появления и квитирование по строкам в этом окне недоступны (см. «Журнал событий» панели).', nm: 'Примечание' }));

  // ---- низ
  const by = 646;
  E.push(el('state', { x: 500, y: by + 10, w: 110, h: 32, tag: 'gcu:alm2.horn', r: 4, size: 14, stroke: C.alarm, vis: cnd('gcu:alm2.horn', '1'), sts: [{ v: 1, tx: 'ЗВУК ВКЛ', f: C.white, c: C.alarm, bl: true }], nm: 'Звук включён' }));
  E.push(el('button', { x: 620, y: by, w: 180, h: 52, tx: 'КВИТИРОВАТЬ', size: 16, en: cnd('gcu:st.auto', 'ok'), act: { a: 'gcu', v: 8, msg: 'Тревоги квитированы', log: 'Оператор: квитирование' } }));
  E.push(el('button', { x: 812, y: by, w: 200, h: 52, tx: 'СБРОС АВАРИЙ', size: 16, en: cnd('gcu:st.auto', 'ok'),
    act: { a: 'resetall', cf: 'Сбросить аварии?', cm: 'ГЦУ, линии Н-1/Н-2 и задвижки с аварией. Причина должна быть устранена.' } }));
  return { screens: [L.screen('al_s1', 'Аварии и события', E, { demoChip: [600, 62] })], pops: [], dbs: [] };
};
