// ================================================================ КОНСТРУКТОР ПАНЕЛИ: редактор
// Холст = настоящий код панели (ядро + runtime.js), запущенный в браузере с имитацией API Weintek.
// Поверх — прозрачный слой редактора: выделение, перетаскивание, ручки размера, сетка, направляющие.
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const h = (tag, attrs, ...kids) => {
  const el = document.createElement(tag);
  for (const k in (attrs || {})) {
    const v = attrs[k];
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  kids.flat().forEach(c => { if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c))); });
  return el;
};
const LS_KEY = 'gcu_constructor_project_v1';
const CL = {
  topBar: '#23272B', bg: '#DFE0DC', panel: '#F4F4F1', white: '#FFFFFF', text: '#1D2023', text2: '#4B5157', textDis: '#7A7F85', alarmMark: '#A12020',
  run: '#1E8A3C', ready: '#2F6FB8', alarm: '#C42B2B', move: '#E0A100', stop: '#C4C7CB', repairFill: '#ECEDEA', repairLine: '#6F757B',
  btn: '#E4E5E1', btnBorder: '#8F949A', panelBorder: '#B3B6B0', rowLine: '#D3D5D0', pulp: '#5A5F65', water: '#3F7FB4', slurry: '#A0978A',
  tankWall: '#3B4045', tankIn: '#EDEDEA', unknown: '#9CC3E4'
};
const NAMED_COLORS = [
  ['Работа / открыта', CL.run], ['Готов / выбран', CL.ready], ['Авария', CL.alarm], ['Движение / предупр.', CL.move], ['Стоит / закрыта', CL.stop],
  ['Текст', CL.text], ['Текст вторичный', CL.text2], ['Белый', CL.white], ['Панель', CL.panel], ['Фон экрана', CL.bg], ['Рамка панели', CL.panelBorder],
  ['Линия таблицы', CL.rowLine], ['Труба пульпы', CL.pulp], ['Труба воды', CL.water], ['Пульпа', CL.slurry], ['Стенка ёмкости', CL.tankWall],
  ['Ремонт (заливка)', CL.repairFill], ['Ремонт (контур)', CL.repairLine], ['Верхняя полоса', CL.topBar], ['Неизвестно', CL.unknown]
];
const VALVE_N = ['', 'Н-1 гидроподпор', 'Н-1 всас', 'Н-1 нагнетание', 'Н-1 промывка', 'Н-1 размывка', 'Н-1 дренаж',
  'Н-2 гидроподпор', 'Н-2 всас', 'Н-2 нагнетание', 'Н-2 промывка', 'Н-2 размывка', 'Н-2 дренаж',
  'ГЦ-1 подача', 'ГЦ-2 подача', 'ГЦ-3 подача', 'ГЦ-4 подача', 'ГЦ-5 подача', 'ГЦ-6 подача'];
const ALM_N = ['Уровнемер неисправен', 'Датчик давления неисправен', 'Уровень HH', 'Уровень H', 'Уровень L', 'Уровень LL', 'Все циклоны открыты',
  'Минимум циклонов', 'Авария Н-1', 'Авария Н-2', 'АВР', 'Нет готового насоса', 'Авария задвижки ГЦ', 'Аварийный стоп по уровню', 'Аварийный стоп (кнопка)'];

// ---------------------------------------------------------------- данные ГЦУ (встроены в ядро панели)
const GCU_TAGS = (() => {
  const L = [];
  const a = (n, d, t) => L.push({ n: n, d: d, t: t || '' });
  a('gcu:level', 'Уровень зумпфа LT-1, %', 'real'); a('gcu:press', 'Давление на циклонах PT-1, бар', 'real'); a('gcu:speedOut', 'Скорость рабочего насоса (выход регулятора), %', 'real');
  [['auto', 'Режим АВТОМАТ'], ['run', 'Программа запущена'], ['readyAuto', 'Исходное состояние (можно ПУСК)'], ['canAuto', 'Разрешён переход в АВТОМАТ'],
    ['sysRun', 'Насос работает с правильной развязкой'], ['permit', 'Разрешение работы МШР'], ['levelOk', 'Уровнемер достоверен'], ['pressOk', 'Датчик давления достоверен']]
    .forEach(x => a('gcu:st.' + x[0], x[1], 'bool'));
  a('gcu:activePump', 'Рабочий насос (0, 1, 2)', 'int'); a('gcu:nCyc', 'Открыто гидроциклонов', 'int'); a('gcu:selValve', 'Выбранная задвижка (окно)', 'int');
  ALM_N.forEach((t, i) => a('gcu:alm.' + i, 'Авария: ' + t, 'bool'));
  [1, 2].forEach(n => {
    const P = 'gcu:pump.' + n + '.', N = 'Н-' + n + ': ';
    [['view', 'состояние для символа (0 стоит, 1 готов, 2 работа, 3 авария, 4 ремонт, 5 пуск/останов)', 'int'], ['step', 'шаг программы', 'int'], ['faultCode', 'код аварии линии', 'int'],
      ['speed', 'задание скорости, %', 'real'], ['running', 'работает', 'bool'], ['ready', 'готов', 'bool'], ['fault', 'авария', 'bool'], ['remote', 'ПЧ в дистанции', 'bool'],
      ['starting', 'пуск', 'bool'], ['stopping', 'останов', 'bool'], ['duty', 'основной', 'bool'], ['repair', 'в ремонте', 'bool'], ['starts', 'число пусков', 'int'], ['drv', 'состояние ПЧ', 'int'],
      ['fltDrive', 'авария ПЧ', 'bool'], ['fltComm', 'нет связи с ПЧ', 'bool']].forEach(x => a(P + x[0], N + x[1], x[2]));
    a('gcu:line.' + n + '.p', N + 'давление линии нагнетания, бар', 'real'); a('gcu:line.' + n + '.ok', N + 'датчик давления линии достоверен', 'bool');
    a('gcu:seal.' + n + '.p', N + 'давление гидроподпора', 'real'); a('gcu:seal.' + n + '.f', N + 'расход гидроподпора', 'real');
    a('gcu:seal.' + n + '.hh', N + 'гидроподпор HH', 'bool'); a('gcu:seal.' + n + '.ll', N + 'гидроподпор LL', 'bool');
    a('gcu:manSpeed.' + n, N + 'ручное задание скорости, % (чтение)', 'real');
  });
  a('gcu:air.2.p', 'Воздух ПМУ насосов, бар', 'real'); a('gcu:air.2.ok', 'Воздух ПМУ насосов: датчик достоверен', 'bool');
  a('gcu:air.1.p', 'Воздух ПМУ циклонов, бар', 'real'); a('gcu:air.1.ok', 'Воздух ПМУ циклонов: датчик достоверен', 'bool');
  ['пульт ГЦУ', 'шкаф гидроциклонов', 'шкаф ПЛК', 'панель HMI'].forEach((w, i) => a('gcu:alm2.estop.' + i, 'Нажат аварийный стоп: ' + w, 'bool'));
  a('gcu:alm2.light', 'Световая сигнализация включена', 'bool'); a('gcu:alm2.horn', 'Звуковая сигнализация включена', 'bool');
  a('gcu:alm2.doorGcu', 'Дверь пульта ГЦУ открыта', 'bool'); a('gcu:alm2.doorCyc', 'Дверь шкафа ГЦ открыта', 'bool'); a('gcu:alm2.doorPlc', 'Дверь шкафа ПЛК открыта', 'bool');
  for (let i = 1; i <= 18; i++) {
    const P = 'gcu:valve.' + i + '.', N = VALVE_N[i] + ': ';
    [['view', 'состояние для символа (0 закр., 1 откр., 2 движ., 3 авария, 4 ремонт, 5 неизв.)', 'int'], ['opened', 'открыта', 'bool'], ['closed', 'закрыта', 'bool'],
      ['moving', 'в движении', 'bool'], ['fault', 'авария', 'bool'], ['local', 'местное управление', 'bool'], ['repair', 'ремонт', 'bool']].forEach(x => a(P + x[0], N + x[1], x[2]));
  }
  const SET = [['pressSP', 'Уставка давления, бар', 'real'], ['kp', 'Kp регулятора давления', 'real'], ['ti', 'Ti регулятора давления, с', 'real'],
    ['spdMin', 'Скорость минимум, %', 'real'], ['spdMax', 'Скорость максимум, %', 'real'], ['levelSP', 'Уставка уровня, %', 'real'], ['hyst', 'Зона нечувствительности ±, %', 'real'],
    ['startMin', 'Минимум уровня для пуска, %', 'real'], ['tAdd', 'Подключение циклона через, с', 'int'], ['tRem', 'Отключение циклона через, с', 'int'],
    ['nStart', 'Циклонов при пуске', 'int'], ['nMin', 'Циклонов минимум', 'int'], ['nMax', 'Циклонов максимум', 'int'], ['duty', 'Основной насос (1/2)', 'int'],
    ['tScour', 'Размыв при пуске, с', 'int'], ['tFlushStart', 'Промывка при пуске, с', 'int'], ['tFlushStop', 'Промывка при останове, с', 'int'], ['tDrain', 'Дренаж, с', 'int']];
  SET.forEach(x => a('gcuset:' + x[0], 'Уставка DB101 (чтение и запись): ' + x[1], x[2]));
  ['Н-1', 'Н-2', 'ГЦ-1', 'ГЦ-2', 'ГЦ-3', 'ГЦ-4', 'ГЦ-5', 'ГЦ-6'].forEach((w, i) => a('gcuset:repair.' + i, 'Вывод в ремонт (запись): ' + w, 'bool'));
  a('gcuspd:1', 'Ручное задание скорости Н-1, % (запись)', 'real'); a('gcuspd:2', 'Ручное задание скорости Н-2, % (запись)', 'real');
  return L;
})();
const GCU_MAP = Object.fromEntries(GCU_TAGS.map(t => [t.n, t]));

// ---------------------------------------------------------------- типы элементов
const TL = {
  text: 'Текст', value: 'Значение', valuebox: 'Окно значения', rect: 'Прямоугольник', pipe: 'Труба', circle: 'Круг', line: 'Линия', tri: 'Треугольник',
  clock: 'Дата и время', valve: 'Задвижка', pump: 'Насос / мотор', pumpcard: 'Карточка насоса ГЦУ', cyclone: 'Гидроциклон', sensor: 'Датчик (кружок)',
  tank: 'Ёмкость с уровнем', bar: 'Столбик', lamp: 'Лампа', state: 'Многосостояние', button: 'Кнопка', hold: 'Кнопка «пока нажата»', input: 'Поле ввода',
  alarmline: 'Строка аварий ГЦУ', alarms: 'Список сообщений', trend: 'Тренд', group: 'Группа'
};
const PAL = [
  ['Основные', [
    ['text', 'Текст', { t: 'text', w: 140, h: 20, tx: 'Текст', size: 14, color: CL.text, align: 'left' }],
    ['value', 'Значение', { t: 'value', w: 110, h: 24, tag: '', dec: 1, unit: '', size: 16, align: 'right' }],
    ['valuebox', 'Окно значения', { t: 'valuebox', w: 130, h: 60, ti: 'Название', tag: '', dec: 1, unit: '' }],
    ['rect', 'Панель', { t: 'rect', w: 220, h: 140, r: 4, fill: CL.panel, stroke: CL.panelBorder, lw: 1 }],
    ['circle', 'Круг', { t: 'circle', w: 40, h: 40, fill: CL.white, stroke: CL.text, lw: 1.5 }],
    ['line', 'Линия', { t: 'line', w: 0, h: 0, dx: 120, dy: 0, color: CL.text2, lw: 2 }],
    ['pipeH', 'Труба пульпы', { t: 'pipe', w: 160, h: 6, fill: CL.pulp }],
    ['pipeW', 'Труба воды', { t: 'pipe', w: 160, h: 3, fill: CL.water }],
    ['tri', 'Стрелка', { t: 'tri', w: 12, h: 10, dir: 'down', fill: CL.pulp }],
    ['clock', 'Дата и время', { t: 'clock', w: 170, h: 24, fm: 'datetime', size: 15, align: 'right' }]
  ]],
  ['Технология', [
    ['valveH', 'Задвижка гориз.', { t: 'valve', w: 48, h: 32, dir: 'h', src: 'tag', vt: '', lt: '', bp: 'right' }],
    ['valveV', 'Задвижка верт.', { t: 'valve', w: 32, h: 48, dir: 'v', src: 'tag', vt: '', lt: '', bp: 'right' }],
    ['pump', 'Насос / мотор', { t: 'pump', w: 72, h: 72, src: 'tag', vt: '', lb: 'М1' }],
    ['tank', 'Ёмкость с уровнем', { t: 'tank', w: 120, h: 240, tag: '', min: 0, max: 100, marks: [{ n: 'H', v: 85, c: CL.text2 }, { n: 'L', v: 20, c: CL.text2 }] }],
    ['bar', 'Столбик', { t: 'bar', w: 30, h: 150, tag: '', min: 0, max: 100, fill: CL.ready }],
    ['sensor', 'Датчик', { t: 'sensor', w: 26, h: 26, tx: 'PT', size: 11 }],
    ['cyclone', 'Гидроциклон', { t: 'cyclone', w: 48, h: 89, src: 'gcu', n: 1 }],
    ['pumpcard', 'Карточка насоса ГЦУ', { t: 'pumpcard', w: 150, h: 56, n: 1 }]
  ]],
  ['Индикация', [
    ['lamp', 'Лампа', { t: 'lamp', w: 20, h: 20, tag: '', on: CL.run, off: CL.white, lb: 'Подпись', size: 14 }],
    ['state', 'Многосостояние', { t: 'state', w: 170, h: 32, tag: '', size: 15, sts: [{ v: 0, tx: 'СТОИТ', f: CL.stop, c: CL.text }, { v: 1, tx: 'РАБОТА', f: CL.run, c: CL.white }, { v: 2, tx: 'АВАРИЯ', f: CL.alarm, c: CL.white, bl: true }] }],
    ['alarms', 'Список сообщений', { t: 'alarms', w: 360, h: 140, items: [], empty: 'Сообщений нет' }],
    ['trend', 'Тренд', { t: 'trend', w: 420, h: 220, pens: [{ tag: '', c: CL.ready, n: '' }], min: 0, max: 100, span: 600, dec: 0 }],
    ['alarmline', 'Строка аварий ГЦУ', { t: 'alarmline', w: 600, h: 28 }]
  ]],
  ['Управление', [
    ['button', 'Кнопка', { t: 'button', w: 120, h: 44, tx: 'КНОПКА', style: 'normal', act: { a: 'write', tag: '', v: '1' } }],
    ['btnPop', 'Кнопка «окно»', { t: 'button', w: 140, h: 40, tx: 'Открыть окно', style: 'normal', size: 15, act: { a: 'popup', id: '' } }],
    ['btnClose', 'Кнопка «закрыть»', { t: 'button', w: 120, h: 44, tx: 'ЗАКРЫТЬ', style: 'normal', act: { a: 'close' } }],
    ['hold', 'Пока нажата', { t: 'hold', w: 150, h: 56, tx: '▲ ВПЕРЁД', style: 'green', tag: '', v: '1', rv: '0', ms: 200 }],
    ['input', 'Поле ввода', { t: 'input', w: 120, h: 28, tag: '', dec: 1, unit: '', min: 0, max: 100, ti: '' }]
  ]]
];

// ---------------------------------------------------------------- описание свойств (инспектор)
const ALIGN = [['left', 'влево'], ['center', 'по центру'], ['right', 'вправо']];
const BSTYLE = [['normal', 'серая'], ['green', 'зелёная'], ['blue', 'синяя'], ['red', 'красная']];
const isTag = e => e.src === 'tag', isGcu = e => e.src !== 'tag';
const F = {
  text: [['tx', 'Текст', 'area', null, 'Перевод строки — Enter. В своём окне # заменяется номером.'], ['size', 'Размер шрифта', 'num'], ['color', 'Цвет', 'color'], ['bold', 'Жирный', 'bool'],
    ['align', 'Выравнивание', 'sel', ALIGN], ['fit', 'Ужимать', 'bool', null, 'Уменьшать шрифт, если текст не влезает в ширину']],
  value: [['tag', 'Тег', 'tag'], ['dec', 'Знаков после ,', 'num'], ['pre', 'Текст перед', 'text'], ['unit', 'Ед. изм.', 'text'],
    ['fm', 'Показывать как', 'sel', [['', 'число'], ['bool', 'вкл / выкл (текст)'], ['map', 'текст по значению'], ['hex', 'hex']]],
    ['on', 'Текст при 1', 'text', null, null, e => e.fm === 'bool'], ['off', 'Текст при 0', 'text', null, null, e => e.fm === 'bool'],
    ['map', 'Значение → текст', 'map', null, null, e => e.fm === 'map'],
    ['size', 'Размер шрифта', 'num'], ['color', 'Цвет', 'color'], ['bold', 'Жирный', 'bool', null, null, null, true], ['align', 'Выравнивание', 'sel', ALIGN], ['pad', 'Отступ', 'num'],
    ['fill', 'Заливка', 'color'], ['stroke', 'Рамка', 'color'], ['r', 'Скругление', 'num'],
    ['ok', 'Достоверность', 'tag', null, 'Бит: 1 — достоверно. При 0 — «НЕДОСТ.»'], ['bad', 'Текст недостов.', 'text']],
  valuebox: [['ti', 'Заголовок', 'text'], ['tag', 'Тег', 'tag'], ['dec', 'Знаков после ,', 'num'], ['unit', 'Ед. изм.', 'text'], ['ok', 'Достоверность', 'tag', null, 'Бит: 1 — достоверно'],
    ['tsz', 'Шрифт заголовка', 'num'], ['vsz', 'Шрифт значения', 'num'], ['color', 'Цвет значения', 'color'], ['fill', 'Заливка', 'color'], ['stroke', 'Рамка', 'color']],
  rect: [['fill', 'Заливка', 'color'], ['stroke', 'Рамка', 'color'], ['lw', 'Толщина рамки', 'num'], ['r', 'Скругление', 'num'], ['dash', 'Пунктир', 'bool']],
  pipe: [['fill', 'Цвет', 'color']],
  circle: [['fill', 'Заливка', 'color'], ['stroke', 'Контур', 'color'], ['lw', 'Толщина', 'num'], ['dash', 'Пунктир', 'bool']],
  line: [['color', 'Цвет', 'color'], ['lw', 'Толщина', 'num'], ['dash', 'Пунктир', 'bool'], ['ar', 'Стрелка на конце', 'bool']],
  tri: [['dir', 'Направление', 'sel', [['down', 'вниз'], ['up', 'вверх'], ['left', 'влево'], ['right', 'вправо']]], ['fill', 'Заливка', 'color'], ['stroke', 'Контур', 'color']],
  clock: [['fm', 'Формат', 'sel', [['datetime', 'дата и время'], ['time', 'время'], ['date', 'дата']]], ['size', 'Размер шрифта', 'num'], ['color', 'Цвет', 'color'], ['bold', 'Жирный', 'bool'], ['align', 'Выравнивание', 'sel', ALIGN]],
  valve: [['dir', 'Положение', 'sel', [['h', 'горизонтальная'], ['v', 'вертикальная']]], ['src', 'Данные', 'sel', [['tag', 'свой тег'], ['gcu', 'задвижка ГЦУ (DB100)']]],
    ['n', 'Задвижка ГЦУ', 'sel', VALVE_N.map((n, i) => [i, i + ' · ' + n]).slice(1), 'Нажатие откроет окно задвижки ГЦУ', isGcu],
    ['vt', 'Состояние', 'tag', null, 'Int: 0 закрыта, 1 открыта, 2 движение, 3 авария, 4 ремонт, 5 неизвестно', isTag],
    ['lt', 'Местное', 'tag', null, 'Бит: значок «М»', isTag], ['bp', 'Значок «М»', 'sel', [['right', 'справа'], ['left', 'слева'], ['none', 'не показывать']]]],
  pump: [['src', 'Данные', 'sel', [['tag', 'свой тег'], ['gcu', 'насос ГЦУ (DB100)']]], ['n', 'Насос ГЦУ', 'sel', [[1, 'Н-1'], [2, 'Н-2']], 'Нажатие откроет окно насоса', isGcu],
    ['vt', 'Состояние', 'tag', null, 'Int: 0 стоит, 1 готов, 2 работа, 3 авария, 4 ремонт, 5 пуск/останов', isTag], ['lb', 'Подпись', 'text'], ['size', 'Шрифт подписи', 'num']],
  pumpcard: [['n', 'Насос ГЦУ', 'sel', [[1, 'Н-1'], [2, 'Н-2']]], ['lb', 'Подпись', 'text']],
  cyclone: [['src', 'Данные', 'sel', [['gcu', 'гидроциклон ГЦУ'], ['tag', 'свой тег']]], ['n', 'Номер ГЦ', 'sel', [1, 2, 3, 4, 5, 6].map(i => [i, 'ГЦ-' + i]), null, isGcu],
    ['rt', 'Ремонт', 'tag', null, 'Бит: 1 — в ремонте', isTag], ['lb', 'Подпись', 'text']],
  sensor: [['tx', 'Буквы', 'text'], ['size', 'Шрифт', 'num'], ['color', 'Цвет букв', 'color'], ['fill', 'Заливка', 'color'], ['stroke', 'Контур', 'color']],
  tank: [['tag', 'Уровень', 'tag'], ['min', 'Мин. шкалы', 'num'], ['max', 'Макс. шкалы', 'num'], ['sp', 'Уставка (SP)', 'tag', null, 'Синий пунктир'], ['ok', 'Достоверность', 'tag'],
    ['marks', 'Отметки', 'marks'], ['fill', 'Цвет продукта', 'color'], ['bg', 'Цвет пустоты', 'color'], ['wall', 'Цвет стенки', 'color']],
  bar: [['tag', 'Тег', 'tag'], ['min', 'Мин.', 'num'], ['max', 'Макс.', 'num'], ['dir', 'Направление', 'sel', [['v', 'вертикально'], ['h', 'горизонтально']]], ['fill', 'Цвет', 'color'],
    ['bg', 'Фон', 'color'], ['stroke', 'Рамка', 'color'], ['ok', 'Достоверность', 'tag'], ['sv', 'Показывать число', 'bool'], ['dec', 'Знаков после ,', 'num'], ['unit', 'Ед. изм.', 'text'], ['size', 'Шрифт', 'num']],
  lamp: [['tag', 'Тег (бит)', 'tag'], ['inv', 'Инверсия', 'bool'], ['on', 'Цвет при 1', 'color'], ['off', 'Цвет при 0', 'color'], ['bl', 'Мигать при 1', 'bool'],
    ['shape', 'Форма', 'sel', [['circle', 'круг'], ['rect', 'квадрат']]], ['lb', 'Подпись справа', 'text'], ['lc', 'Цвет подписи при 1', 'color'], ['size', 'Шрифт', 'num'], ['stroke', 'Контур', 'color']],
  state: [['tag', 'Тег', 'tag'], ['sts', 'Состояния', 'sts'], ['dtx', 'Текст иначе', 'text', null, 'Пусто — показать число'], ['df', 'Заливка иначе', 'color'], ['dc', 'Цвет текста иначе', 'color'],
    ['ndt', 'Нет данных', 'text'], ['size', 'Шрифт', 'num'], ['bold', 'Жирный', 'bool', null, null, null, true], ['r', 'Скругление', 'num'], ['stroke', 'Рамка', 'color']],
  button: [['tx', 'Надпись', 'text'], ['style', 'Цвет при подсветке', 'sel', BSTYLE], ['size', 'Шрифт', 'num'], ['act', 'Действие', 'act'],
    ['ac', 'Подсвечена, если', 'cond'], ['en', 'Доступна, если', 'cond'], ['why', 'Почему недоступна', 'text', null, 'Сообщение при нажатии на недоступную кнопку']],
  hold: [['tx', 'Надпись', 'text'], ['style', 'Цвет', 'sel', [['green', 'зелёная'], ['blue', 'синяя']]], ['size', 'Шрифт', 'num'],
    ['tag', 'Писать в тег', 'tagw'], ['v', 'Пока нажата', 'text', null, 'Значение, которое пишется каждые N мс'], ['rv', 'При отпускании', 'text', null, 'Пусто — ничего не писать'],
    ['ms', 'Период, мс', 'num'], ['alive', 'Счётчик жизни', 'tagw', null, 'Необязательно: Int, растёт каждую отправку (ПЛК снимает команду, если он не меняется)'],
    ['en', 'Доступна, если', 'cond'], ['why', 'Почему недоступна', 'text']],
  input: [['tag', 'Тег', 'tagw'], ['dec', 'Знаков после ,', 'num'], ['unit', 'Ед. изм.', 'text'], ['min', 'Минимум', 'num'], ['max', 'Максимум', 'num'],
    ['ti', 'Заголовок клавиатуры', 'text'], ['pin', 'Пароль инженера', 'bool', null, 'Пароль задаётся в свойствах окна'], ['cf', 'Подтверждение', 'text', null, 'Пусто — без вопроса'],
    ['en', 'Доступно, если', 'cond'], ['size', 'Шрифт', 'num']],
  alarmline: [],
  alarms: [['items', 'Сообщения', 'items'], ['empty', 'Если пусто', 'text'], ['size', 'Шрифт', 'num'], ['rh', 'Высота строки', 'num']],
  trend: [['pens', 'Перья', 'pens'], ['min', 'Мин. шкалы', 'num'], ['max', 'Макс. шкалы', 'num'], ['span', 'Окно, с', 'num'], ['dec', 'Знаков после ,', 'num']],
  group: []
};
const NOTE = {
  alarmline: 'Бегущая строка аварий ГЦУ (те же сообщения, что в окне «Аварии»). Нужны данные DB100.',
  pumpcard: 'Карточка насоса ГЦУ: состояние, скорость, «основной», «РАБ.». Нажатие — окно насоса.',
  group: 'Группа двигается целиком. Чтобы изменить элементы внутри — «Разгр.» (Ctrl+Shift+G).',
  hold: 'Пока кнопка нажата, панель пишет значение каждые N мс. Отпустили — пишет «при отпускании». Как толчок пульподелителя.',
  input: 'Нажатие открывает клавиатуру панели, введённое значение пишется в тег (с проверкой диапазона).'
};
const RULE_KEYS = {
  rect: ['fill', 'stroke', 'lw'], pipe: ['fill'], circle: ['fill', 'stroke'], text: ['tx', 'color', 'size', 'bold'], value: ['color', 'fill', 'stroke', 'unit'], valuebox: ['color', 'stroke', 'ti'],
  line: ['color', 'lw', 'dash'], tri: ['fill'], lamp: ['on', 'off', 'lb'], state: ['stroke'], button: ['tx', 'style'], sensor: ['fill', 'color', 'tx'], bar: ['fill'], tank: ['fill'],
  clock: ['color'], valve: [], pump: ['lb'], hold: ['tx'], input: [], alarms: [], trend: [], cyclone: [], pumpcard: [], alarmline: [], group: []
};
const KEY_KIND = { fill: 'color', stroke: 'color', color: 'color', on: 'color', off: 'color', lw: 'num', size: 'num', tx: 'text', lb: 'text', unit: 'text', ti: 'text', bold: 'bool', dash: 'bool', style: 'sel' };
const KEY_NAME = { fill: 'Заливка', stroke: 'Рамка', color: 'Цвет', on: 'Цвет при 1', off: 'Цвет при 0', lw: 'Толщина', size: 'Шрифт', tx: 'Текст', lb: 'Подпись', unit: 'Ед. изм.', ti: 'Заголовок', bold: 'Жирный', dash: 'Пунктир', style: 'Цвет кнопки', hide: 'Скрыть' };
const OPS = [['1', '= 1 (вкл)'], ['0', '= 0 (выкл)'], ['=', 'равно'], ['!=', 'не равно'], ['>', 'больше'], ['<', 'меньше'], ['>=', '≥'], ['<=', '≤'], ['bit', 'бит № = 1'], ['ok', 'есть данные'], ['nd', 'нет данных']];
const OPV = { '=': 1, '!=': 1, '>': 1, '<': 1, '>=': 1, '<=': 1, bit: 1 };
const ACTS = [['', '— нет —'], ['write', 'Записать значение в тег'], ['toggle', 'Переключить бит (0↔1)'], ['keypad', 'Ввести число с клавиатуры'], ['popup', 'Открыть своё окно'],
  ['close', 'Закрыть окно'], ['gcu', 'Команда ГЦУ'], ['pump', 'Команда насосу ГЦУ'], ['valvecmd', 'Команда задвижке ГЦУ'], ['valvewin', 'Окно задвижки ГЦУ'], ['pumpwin', 'Окно насоса ГЦУ'],
  ['resetall', 'Сброс всех аварий ГЦУ'], ['win', 'Перейти в базовое окно EasyBuilder']];
const GCU_CMDS = [[1, '1 — ПУСК программы'], [2, '2 — СТОП программы'], [4, '4 — СБРОС аварий'], [8, '8 — Квитировать (звук)'], [10, '10 — АВТОМАТ'], [11, '11 — РУЧНОЙ']];

// ---------------------------------------------------------------- состояние редактора
let proj = null;
let cur = { kind: 'screen', id: null };
let lastScreen = null;
let sel = [];
let zoom = 1, zoomMode = 'fit';
const grid = { on: true, size: 8, snap: true };
let mode = 'edit';
let showHidden = false;
const undoS = [], redoS = [];
let clip = null;
let leftTab = 'pal';

function uid() { proj.nextId = (proj.nextId || 1) + 1; return 'e' + proj.nextId; }
function snapshot() { return JSON.stringify({ p: proj, c: cur, s: sel }); }
function pushUndo(snap) { undoS.push(snap || snapshot()); if (undoS.length > 150) undoS.shift(); redoS.length = 0; updButtons(); }
function restore(s) { const o = JSON.parse(s); proj = o.p; cur = o.c; sel = o.s || []; refreshAll(true); }
function undo() { if (!undoS.length) return; redoS.push(snapshot()); restore(undoS.pop()); toast('Отменено'); }
function redo() { if (!redoS.length) return; undoS.push(snapshot()); restore(redoS.pop()); }
let saveT = 0;
function autosave() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(LS_KEY, JSON.stringify(proj)); } catch (e) { } }, 400); }

function curCont() {
  if (cur.kind === 'pop') {
    const p = proj.pops.find(x => x.id === cur.id);
    if (p) return p;
  }
  let s = proj.screens.find(x => x.id === cur.id);
  if (!s) { s = proj.screens[0]; cur = { kind: 'screen', id: s.id }; }
  return s;
}
function curScreen() {
  if (cur.kind === 'screen') return curCont();
  return proj.screens.find(x => x.id === lastScreen) || proj.screens[0];
}
function curEls() { return curCont().els || (curCont().els = []); }
function byId(id, list) { return (list || curEls()).find(e => e.id === id); }
function selEls() { return sel.map(id => byId(id)).filter(Boolean); }
// начало координат элементов: окно — координаты панели; своё окно — от его левого верхнего угла
function frameOf(pop, scr) {
  const w = +pop.w || 400, hh = +pop.h || 300;
  const x = (pop.x === undefined || pop.x === null || pop.x === '') ? (+scr.ox || 0) + Math.round((+scr.w - w) / 2) : +pop.x;
  const y = (pop.y === undefined || pop.y === null || pop.y === '') ? (+scr.oy || 0) + Math.round((+scr.h - hh) / 2) : +pop.y;
  return { x: x, y: y, w: w, h: hh };
}
function origin() {
  const s = curScreen();
  if (cur.kind === 'pop') { const f = frameOf(curCont(), s); return { x: f.x, y: f.y }; }
  return { x: 0, y: 0 };
}
function bbox(e) {
  if (e.t === 'line') { const x = Math.min(e.x, e.x2), y = Math.min(e.y, e.y2); return { x: x, y: y, w: Math.abs(e.x2 - e.x), h: Math.abs(e.y2 - e.y) }; }
  return { x: +e.x, y: +e.y, w: +e.w, h: +e.h };
}
function unionBox(list) {
  if (!list.length) return null;
  let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
  list.forEach(e => { const b = bbox(e); x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.w); y2 = Math.max(y2, b.y + b.h); });
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}
function elLabel(e) {
  if (e.nm) return e.nm;
  const t = TL[e.t] || e.t;
  if (e.t === 'text') return '«' + String(e.tx || '').split('\n')[0].slice(0, 24) + '»';
  if (e.t === 'button' || e.t === 'hold') return t + ' «' + (e.tx || '') + '»';
  if ((e.t === 'valve' || e.t === 'pump' || e.t === 'cyclone') && e.src !== 'tag') return t + ' ' + (e.t === 'valve' ? VALVE_N[e.n] || e.n : (e.t === 'pump' ? 'Н-' + e.n : 'ГЦ-' + e.n));
  const tg = e.tag || e.vt;
  return t + (tg ? ' · ' + tg : '');
}

// ---------------------------------------------------------------- теги проекта
function tagIndex() { return allTags(proj); }
function tagKnown(n) {
  if (!n) return true;
  if (GCU_MAP[n]) return true;
  if (/^gcu(set|spd)?:/.test(n)) return !!GCU_MAP[n];
  if (n.indexOf('#') >= 0) { const re = new RegExp('^' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').split('#').join('[^.]*?') + '$'); return Object.keys(tagIndex()).some(k => re.test(k)); }
  return !!tagIndex()[n];
}
function refreshDatalist() {
  const dl = $('#dlTags');
  dl.innerHTML = '';
  const idx = tagIndex();
  Object.keys(idx).forEach(n => { const f = idx[n].f; dl.append(h('option', { value: n }, TYPES[f.t][1] + ' · ' + addrText(idx[n].db, f) + (f.cm ? ' · ' + f.cm : ''))); });
  GCU_TAGS.forEach(t => dl.append(h('option', { value: t.n }, 'ГЦУ · ' + t.d)));
}
function addrText(db, f) { return 'DB' + db.num + '.' + (f.t === 'bool' ? 'DBX' + f.o + '.' + (f.b || 0) : (TYPES[f.t][0] === 4 ? 'DBD' : TYPES[f.t][0] === 2 ? 'DBW' : 'DBB') + f.o); }
function renameRefs(oldN, newN) {
  if (!oldN || oldN === newN) return 0;
  let n = 0;
  const fix = list => walkObj(list, (k, v, o) => { if (TAG_KEYS[k] && v === oldN) { o[k] = newN; n++; } });
  proj.screens.forEach(s => fix(s.els)); proj.pops.forEach(p => fix(p.els));
  return n;
}

// ---------------------------------------------------------------- эмулятор панели (код панели в браузере)
const RT = { api: null, iv: new Set(), to: new Set(), mouse: null, key: '', canvas: null, mem: {}, cfg: null, screen: null, running: false };
function memOf(num, size) {
  let m = RT.mem[num];
  if (!m || m.length < size) { const n = new Uint8Array(Math.max(size || 2, m ? m.length : 0, 2) + 2); if (m) n.set(m); m = RT.mem[num] = n; }
  return m;
}
function memInitDemo(force) {
  proj.dbs.forEach(db => {
    const fresh = !RT.mem[db.num] || force;
    const m = memOf(db.num, dbSize(db));
    if (!fresh) return;
    m.fill(0);
    db.fields.forEach(f => { if (f.d !== undefined && f.d !== '' && +f.d) memSet(db, f, +f.d, true); });
  });
}
function memGet(db, f) {
  const m = memOf(db.num, dbSize(db)), o = +f.o, dv = new DataView(m.buffer);
  let v;
  switch (f.t) {
    case 'bool': v = (m[o] >> (f.b || 0)) & 1; break;
    case 'byte': v = m[o]; break;
    case 'sint': v = dv.getInt8(o); break;
    case 'int': v = dv.getInt16(o); break;
    case 'uint': case 'word': v = dv.getUint16(o); break;
    case 'dint': v = dv.getInt32(o); break;
    case 'udint': case 'dword': v = dv.getUint32(o); break;
    case 'real': v = dv.getFloat32(o); break;
  }
  if (f.t !== 'bool' && f.sc && f.sc.length === 4 && f.sc.some(x => x !== '' && x !== null)) {
    const k = f.sc.map(Number); if (k[1] !== k[0]) v = k[2] + (v - k[0]) * (k[3] - k[2]) / (k[1] - k[0]);
  }
  return v;
}
function memSet(db, f, v, raw) {
  const m = memOf(db.num, dbSize(db)), o = +f.o, dv = new DataView(m.buffer);
  if (!raw && f.t !== 'bool' && f.sc && f.sc.length === 4 && f.sc.some(x => x !== '' && x !== null)) {
    const k = f.sc.map(Number); if (k[3] !== k[2]) v = k[0] + (v - k[2]) * (k[1] - k[0]) / (k[3] - k[2]);
  }
  switch (f.t) {
    case 'bool': m[o] = v ? (m[o] | (1 << (f.b || 0))) : (m[o] & ~(1 << (f.b || 0))); break;
    case 'byte': m[o] = v & 255; break;
    case 'sint': dv.setInt8(o, Math.max(-128, Math.min(127, Math.round(v)))); break;
    case 'int': dv.setInt16(o, Math.round(v)); break;
    case 'uint': case 'word': dv.setUint16(o, Math.round(v) & 0xFFFF); break;
    case 'dint': dv.setInt32(o, Math.round(v)); break;
    case 'udint': case 'dword': dv.setUint32(o, Math.round(v) >>> 0); break;
    case 'real': dv.setFloat32(o, v); break;
  }
}
const simDriver = {
  promises: {
    getData: async (a, n) => {
      if (!a || a.db === undefined) throw new Error('нет адреса');
      const m = memOf(a.db, a.off + n * 2), v = [];
      for (let i = 0; i < n; i++) v.push((m[a.off + 2 * i] << 8) | m[a.off + 2 * i + 1]);
      return { values: v };
    },
    setData: async (a, vals) => {
      if (!a || a.db === undefined) throw new Error('нет адреса');
      vals = Array.isArray(vals) ? vals : [vals];
      const m = memOf(a.db, a.off + vals.length * 2);
      vals.forEach((w, i) => { m[a.off + 2 * i] = (w >> 8) & 255; m[a.off + 2 * i + 1] = w & 255; });
      simLog('Запись ' + 'DB' + a.db + '.' + a.off + ' ← ' + vals.map(w => '16#' + (w & 0xFFFF).toString(16).toUpperCase().padStart(4, '0')).join(' '));
    }
  }
};
const simWrites = [];
function simLog(s) { simWrites.unshift(new Date().toLocaleTimeString() + '  ' + s); if (simWrites.length > 40) simWrites.length = 40; if (mode === 'run') renderSimLog(); }
function rtStop() {
  RT.iv.forEach(clearInterval); RT.iv.clear();
  RT.to.forEach(clearTimeout); RT.to.clear();
  RT.api = null; RT.mouse = null; RT.running = false;
}
function simScreen() {
  const scr = curScreen();
  const r = exportScreen(proj, scr.id, null, { allPops: true, edit: true });
  return { scr: scr, r: r };
}
function rtSync(force) {
  const { scr, r } = simScreen();
  const key = JSON.stringify([scr.id, scr.w, scr.h, scr.ox, scr.oy, scr.bg, scr.pin, r.screen.tags, r.screen.polls, r.screen.opt, proj.conn]);
  RT.screen = r.screen;
  if (!force && RT.running && key === RT.key && RT.api) {
    RT.api.setScreen({ els: r.screen.els, pops: r.screen.pops });
  } else {
    RT.key = key;
    rtStart(scr, r);
  }
  if (cur.kind === 'pop' && RT.api) RT.api.showPop(cur.id, 1);
  else if (mode === 'edit' && RT.api) RT.api.showPop(null);
}
function rtStart(scr, r) {
  rtStop();
  memInitDemo(false);
  const cv = $('#cvRt');
  const k = zoom * (window.devicePixelRatio || 1);
  cv.width = Math.round(scr.w * k); cv.height = Math.round(scr.h * k);
  const ctx = cv.getContext('2d');
  const widget = { width: scr.w * k, height: scr.h * k, add() { return true; } };
  RT.widget = widget;
  const Canvas = function () {
    return new Proxy({}, {
      get(t, p) { if (p === 'width') return cv.width; if (p === 'height') return cv.height; const v = ctx[p]; return typeof v === 'function' ? v.bind(ctx) : v; },
      set(t, p, v) { if (p === 'width' || p === 'height') return true; ctx[p] = v; return true; }
    });
  };
  const MouseArea = function () { this.h = {}; this.on = (n, f) => { this.h[n] = f; }; RT.mouse = this; };
  const cfg = { demo: true, __sim: true, fontFamily: proj.conn.font || 'Arial', useBold: proj.conn.bold !== false, boolHighByteFirst: true, realWordSwap: false };
  if (scr.pin) cfg.pin = String(scr.pin);
  Object.keys(r.amap).forEach(key => { cfg[key] = r.amap[key]; });
  RT.cfg = cfg;
  const sI = (f, ms) => { const id = setInterval(f, ms); RT.iv.add(id); return id; };
  const cI = id => { clearInterval(id); RT.iv.delete(id); };
  const sT = (f, ms) => { const id = setTimeout(() => { RT.to.delete(id); f(); }, ms); RT.to.add(id); return id; };
  const host = { showAll: showHidden, attach(api) { RT.api = api; } };
  RT.host = host;
  try { window.memoryStorage = window.memoryStorage || (() => { const m = {}; return { getItem: k2 => (k2 in m ? m[k2] : null), setItem: (k2, v) => { m[k2] = String(v); }, removeItem: k2 => { delete m[k2]; } }; })(); } catch (e) { }
  const all = Object.keys(ENGINE.r);
  const code = 'const SCREEN=' + JSON.stringify(r.screen) + ';\n' + ENGINE.core + ENGINE.head + 'const RENDER={\n' + all.map(t => ENGINE.r[t]).join(',\n') + '\n};\n' + ENGINE.tail + 'start();\n';
  const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
  const con = { log: (...a) => { console.log('[панель]', ...a); } };
  try {
    const fn = new AsyncFunction('Canvas', 'MouseArea', 'driver', 'console', 'setInterval', 'setTimeout', 'clearInterval', '__host', code);
    RT.running = true;
    fn.call({ config: cfg, widget: widget }, Canvas, MouseArea, simDriver, con, sI, sT, cI, host).catch(e => { status('Ошибка кода панели: ' + e.message); console.error(e); });
  } catch (e) { status('Ошибка кода панели: ' + e.message); console.error(e); }
}
function rtRescale() {
  const scr = curScreen(), cv = $('#cvRt'), k = zoom * (window.devicePixelRatio || 1);
  cv.width = Math.round(scr.w * k); cv.height = Math.round(scr.h * k);
  if (RT.widget) { RT.widget.width = scr.w * k; RT.widget.height = scr.h * k; }
  if (RT.api) RT.api.redraw();
}

// ---------------------------------------------------------------- холст: размеры, слой редактора
function layoutStage() {
  const scr = curScreen();
  if (zoomMode === 'fit') {
    const wr = $('#stageWrap');
    zoom = Math.max(0.3, Math.min(2, Math.min((wr.clientWidth - 48) / scr.w, (wr.clientHeight - 48) / scr.h)));
    zoom = Math.floor(zoom * 100) / 100;
  }
  const st = $('#stage');
  st.style.width = (scr.w * zoom) + 'px'; st.style.height = (scr.h * zoom) + 'px';
  ['#cvRt', '#cvOv'].forEach(s => { const c = $(s); c.style.width = (scr.w * zoom) + 'px'; c.style.height = (scr.h * zoom) + 'px'; });
  const ov = $('#cvOv'), d = window.devicePixelRatio || 1;
  ov.width = Math.round(scr.w * zoom * d); ov.height = Math.round(scr.h * zoom * d);
  rtRescale();
  drawOv();
}
// модельные координаты (как в элементах) <-> пиксели слоя
function m2s(x, y) { const s = curScreen(), o = origin(); return [(x + o.x - (+s.ox || 0)) * zoom, (y + o.y - (+s.oy || 0)) * zoom]; }
function s2m(px, py) { const s = curScreen(), o = origin(); return [px / zoom + (+s.ox || 0) - o.x, py / zoom + (+s.oy || 0) - o.y]; }
let drag = null, hover = null, guides = [];
function drawOv() {
  const ov = $('#cvOv'), c = ov.getContext('2d'), d = window.devicePixelRatio || 1;
  c.setTransform(d, 0, 0, d, 0, 0);
  c.clearRect(0, 0, ov.width, ov.height);
  if (mode !== 'edit') return;
  const scr = curScreen();
  // сетка
  if (grid.on && grid.size * zoom >= 4) {
    const o = origin();
    c.fillStyle = 'rgba(30,40,60,0.22)';
    const g = grid.size;
    const x0 = Math.ceil(((+scr.ox || 0) - o.x) / g) * g, y0 = Math.ceil(((+scr.oy || 0) - o.y) / g) * g;
    for (let x = x0; x <= (+scr.ox || 0) - o.x + scr.w; x += g) {
      for (let y = y0; y <= (+scr.oy || 0) - o.y + scr.h; y += g) {
        const p = m2s(x, y);
        const major = (x % (g * 4) === 0 && y % (g * 4) === 0);
        c.fillRect(Math.round(p[0]) - (major ? 1 : 0.5), Math.round(p[1]) - (major ? 1 : 0.5), major ? 2 : 1, major ? 2 : 1);
      }
    }
  }
  // рамка своего окна
  if (cur.kind === 'pop') {
    const p = curCont(), a = m2s(0, 0);
    c.strokeStyle = '#E0A100'; c.setLineDash([6, 4]); c.lineWidth = 2;
    c.strokeRect(a[0] - 1, a[1] - 1, p.w * zoom + 2, p.h * zoom + 2); c.setLineDash([]);
    c.fillStyle = 'rgba(224,161,0,0.9)'; c.font = '600 11px sans-serif';
    c.fillText('своё окно · ' + p.w + '×' + p.h + ' · заголовок 44 px', a[0], a[1] - 5);
  }
  // скрытые и заблокированные
  curEls().forEach(e => {
    if (e._h) { const b = bbox(e), p = m2s(b.x, b.y); c.strokeStyle = 'rgba(120,120,120,.7)'; c.setLineDash([3, 3]); c.strokeRect(p[0], p[1], b.w * zoom, b.h * zoom); c.setLineDash([]); }
  });
  if (hover && sel.indexOf(hover) < 0) { const e = byId(hover); if (e) { const b = bbox(e), p = m2s(b.x, b.y); c.strokeStyle = 'rgba(47,111,184,.7)'; c.lineWidth = 1; c.strokeRect(p[0] - 1.5, p[1] - 1.5, b.w * zoom + 3, b.h * zoom + 3); } }
  // выделение
  const se = selEls();
  se.forEach(e => {
    const b = bbox(e), p = m2s(b.x, b.y);
    c.strokeStyle = '#2F6FB8'; c.lineWidth = 1.5; c.setLineDash(e._l ? [4, 3] : []);
    if (e.t === 'line') { const a = m2s(e.x, e.y), z = m2s(e.x2, e.y2); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(z[0], z[1]); c.strokeStyle = 'rgba(47,111,184,.55)'; c.lineWidth = 5; c.stroke(); }
    else c.strokeRect(p[0] - 1.5, p[1] - 1.5, b.w * zoom + 3, b.h * zoom + 3);
    c.setLineDash([]);
  });
  if (se.length === 1 && !se[0]._l) handles(se[0]).forEach(hd => { c.fillStyle = '#FFFFFF'; c.strokeStyle = '#2F6FB8'; c.lineWidth = 1.5; c.fillRect(hd.x - 4, hd.y - 4, 8, 8); c.strokeRect(hd.x - 4, hd.y - 4, 8, 8); });
  if (se.length > 1) { const u = unionBox(se), p = m2s(u.x, u.y); c.strokeStyle = 'rgba(47,111,184,.6)'; c.setLineDash([5, 3]); c.strokeRect(p[0] - 4, p[1] - 4, u.w * zoom + 8, u.h * zoom + 8); c.setLineDash([]); }
  // направляющие
  c.strokeStyle = '#D6336C'; c.lineWidth = 1;
  guides.forEach(g => { c.beginPath(); if (g.v) { const p = m2s(g.v, 0); c.moveTo(p[0] + .5, 0); c.lineTo(p[0] + .5, ov.height); } else { const p = m2s(0, g.hz); c.moveTo(0, p[1] + .5); c.lineTo(ov.width, p[1] + .5); } c.stroke(); });
  // рамка выделения
  if (drag && drag.type === 'marq') { const a = drag.a, b = drag.b; c.fillStyle = 'rgba(47,111,184,.12)'; c.strokeStyle = '#2F6FB8'; c.fillRect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); c.strokeRect(Math.min(a[0], b[0]) + .5, Math.min(a[1], b[1]) + .5, Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1])); }
  // размеры при перетаскивании
  if (drag && (drag.type === 'move' || drag.type === 'size') && se.length) {
    const u = unionBox(se), p = m2s(u.x, u.y);
    const s = 'X ' + r1(u.x) + '  Y ' + r1(u.y) + '  ' + r1(u.w) + '×' + r1(u.h);
    c.font = '600 11px monospace'; const tw = c.measureText(s).width;
    c.fillStyle = 'rgba(35,39,43,.9)'; c.fillRect(p[0], p[1] - 22, tw + 10, 17); c.fillStyle = '#fff'; c.fillText(s, p[0] + 5, p[1] - 9);
  }
}
function r1(v) { return Math.round(v * 10) / 10; }
function handles(e) {
  if (e.t === 'line') { const a = m2s(e.x, e.y), b = m2s(e.x2, e.y2); return [{ k: 'p1', x: a[0], y: a[1] }, { k: 'p2', x: b[0], y: b[1] }]; }
  const b = bbox(e), p = m2s(b.x, b.y), w = b.w * zoom, hh = b.h * zoom;
  return [['nw', 0, 0], ['n', .5, 0], ['ne', 1, 0], ['e', 1, .5], ['se', 1, 1], ['s', .5, 1], ['sw', 0, 1], ['w', 0, .5]].map(q => ({ k: q[0], x: p[0] + q[1] * w, y: p[1] + q[2] * hh }));
}
function hitEl(mx, my) {
  const els = curEls();
  for (let i = els.length - 1; i >= 0; i--) {
    const e = els[i];
    if (e._l || (e._h && !showHidden)) continue;
    if (e.t === 'line') { if (segDist(mx, my, e.x, e.y, e.x2, e.y2) <= 5 / zoom + (+e.lw || 2) / 2) return e; continue; }
    const b = bbox(e), pad = Math.max(0, 4 / zoom - Math.min(b.w, b.h) / 2);
    if (mx >= b.x - pad && mx <= b.x + b.w + pad && my >= b.y - pad && my <= b.y + b.h + pad) return e;
  }
  return null;
}
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1, l = dx * dx + dy * dy;
  let t = l ? ((px - x1) * dx + (py - y1) * dy) / l : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - x1 - t * dx, py - y1 - t * dy);
}
function snapV(v) { return grid.snap ? Math.round(v / grid.size) * grid.size : Math.round(v); }
// привязка к краям/центрам других элементов
function snapGuides(box, exclude) {
  guides = [];
  const th = 5 / zoom, xs = [], ys = [];
  curEls().forEach(e => { if (exclude.indexOf(e.id) >= 0 || e._h) return; const b = bbox(e); xs.push(b.x, b.x + b.w / 2, b.x + b.w); ys.push(b.y, b.y + b.h / 2, b.y + b.h); });
  if (cur.kind === 'pop') { const p = curCont(); xs.push(0, p.w / 2, p.w); ys.push(0, 44, p.h / 2, p.h); }
  else { const s = curScreen(); xs.push(s.ox || 0, (s.ox || 0) + s.w / 2, (s.ox || 0) + s.w); ys.push(s.oy || 0, (s.oy || 0) + s.h / 2, (s.oy || 0) + s.h); }
  let dx = null, dy = null;
  [box.x, box.x + box.w / 2, box.x + box.w].forEach(v => xs.forEach(g => { if (Math.abs(g - v) <= th && (dx === null || Math.abs(g - v) < Math.abs(dx))) { dx = g - v; } }));
  [box.y, box.y + box.h / 2, box.y + box.h].forEach(v => ys.forEach(g => { if (Math.abs(g - v) <= th && (dy === null || Math.abs(g - v) < Math.abs(dy))) { dy = g - v; } }));
  if (dx !== null) [box.x, box.x + box.w / 2, box.x + box.w].forEach(v => { if (xs.some(g => Math.abs(g - (v + dx)) < 0.01)) guides.push({ v: v + dx }); });
  if (dy !== null) [box.y, box.y + box.h / 2, box.y + box.h].forEach(v => { if (ys.some(g => Math.abs(g - (v + dy)) < 0.01)) guides.push({ hz: v + dy }); });
  return [dx, dy];
}
function evPos(ev) { const r = $('#cvOv').getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; }

function initStage() {
  const ov = $('#cvOv');
  ov.addEventListener('mousedown', ev => {
    hideCtx();
    if (mode === 'run') { rtMouse('mousedown', ev); return; }
    if (ev.button === 2) return;
    ov.focus();
    const sp = evPos(ev), mp = s2m(sp[0], sp[1]);
    const se = selEls();
    if (se.length === 1 && !se[0]._l) {
      const hd = handles(se[0]).find(q => Math.abs(q.x - sp[0]) <= 6 && Math.abs(q.y - sp[1]) <= 6);
      if (hd) { drag = { type: 'size', k: hd.k, snap: snapshot(), start: JSON.parse(JSON.stringify(se[0])), mp: mp, moved: false }; return; }
    }
    const e = hitEl(mp[0], mp[1]);
    if (e) {
      if (ev.shiftKey || ev.ctrlKey || ev.metaKey) { if (sel.indexOf(e.id) >= 0) sel = sel.filter(x => x !== e.id); else sel.push(e.id); }
      else if (sel.indexOf(e.id) < 0) sel = [e.id];
      refreshSel();
      if (sel.indexOf(e.id) >= 0) drag = { type: 'move', snap: snapshot(), mp: mp, start: selEls().map(x => JSON.parse(JSON.stringify(x))), moved: false, alt: ev.altKey };
    } else {
      if (!(ev.shiftKey || ev.ctrlKey)) { sel = []; refreshSel(); }
      drag = { type: 'marq', a: sp, b: sp, base: sel.slice() };
    }
  });
  window.addEventListener('mousemove', ev => {
    if (mode === 'run') { if (drag) return; rtMouse('mousemove', ev); return; }
    const sp = evPos(ev), mp = s2m(sp[0], sp[1]);
    const s = curScreen();
    const inside = sp[0] >= 0 && sp[1] >= 0 && sp[0] <= s.w * zoom && sp[1] <= s.h * zoom;
    if (inside) $('#stPos').textContent = (cur.kind === 'pop' ? 'в окне ' : '') + 'X ' + Math.round(mp[0]) + '  Y ' + Math.round(mp[1]);
    if (!drag) {
      const e = inside ? hitEl(mp[0], mp[1]) : null, nh = e ? e.id : null;
      let cursor = e ? 'move' : 'default';
      const se = selEls();
      if (se.length === 1 && !se[0]._l) { const hd = handles(se[0]).find(q => Math.abs(q.x - sp[0]) <= 6 && Math.abs(q.y - sp[1]) <= 6); if (hd) cursor = ({ n: 'ns', s: 'ns', e: 'ew', w: 'ew', ne: 'nesw', sw: 'nesw', nw: 'nwse', se: 'nwse', p1: 'crosshair', p2: 'crosshair' })[hd.k] + (hd.k.length < 3 ? '-resize' : ''); }
      $('#cvOv').style.cursor = cursor;
      if (nh !== hover) { hover = nh; drawOv(); }
      return;
    }
    if (drag.type === 'marq') { drag.b = sp; drawOv(); return; }
    let dx = mp[0] - drag.mp[0], dy = mp[1] - drag.mp[1];
    if (!drag.moved && Math.hypot(dx * zoom, dy * zoom) < 3) return;
    drag.moved = true;
    if (drag.type === 'move') {
      const box0 = unionBox(drag.start);
      let nx = box0.x + dx, ny = box0.y + dy;
      if (!ev.altKey) { nx = snapV(nx); ny = snapV(ny); }
      if (ev.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) ny = box0.y; else nx = box0.x; }
      let g = [null, null];
      if (!ev.altKey) { g = snapGuides({ x: nx, y: ny, w: box0.w, h: box0.h }, sel); if (g[0] !== null) nx += g[0]; if (g[1] !== null) ny += g[1]; } else guides = [];
      const ddx = nx - box0.x, ddy = ny - box0.y;
      drag.start.forEach(s0 => {
        const e = byId(s0.id); if (!e) return;
        e.x = r1(s0.x + ddx); e.y = r1(s0.y + ddy);
        if (e.t === 'line') { e.x2 = r1(s0.x2 + ddx); e.y2 = r1(s0.y2 + ddy); }
      });
    } else if (drag.type === 'size') {
      const e = byId(drag.start.id), s0 = drag.start;
      if (e.t === 'line') {
        let px = s0[drag.k === 'p1' ? 'x' : 'x2'] + dx, py = s0[drag.k === 'p1' ? 'y' : 'y2'] + dy;
        if (!ev.altKey) { px = snapV(px); py = snapV(py); }
        if (ev.shiftKey) { const ox = drag.k === 'p1' ? s0.x2 : s0.x, oy = drag.k === 'p1' ? s0.y2 : s0.y; if (Math.abs(px - ox) > Math.abs(py - oy)) py = oy; else px = ox; }
        if (drag.k === 'p1') { e.x = px; e.y = py; } else { e.x2 = px; e.y2 = py; }
      } else {
        let x1 = s0.x, y1 = s0.y, x2 = s0.x + s0.w, y2 = s0.y + s0.h;
        const k = drag.k, sv = v => ev.altKey ? r1(v) : snapV(v);
        if (k.indexOf('w') >= 0) x1 = Math.min(sv(x1 + dx), x2 - 2);
        if (k.indexOf('e') >= 0) x2 = Math.max(sv(x2 + dx), x1 + 2);
        if (k.indexOf('n') >= 0) y1 = Math.min(sv(y1 + dy), y2 - 2);
        if (k.indexOf('s') >= 0) y2 = Math.max(sv(y2 + dy), y1 + 2);
        if (ev.shiftKey && s0.w && s0.h) { const ar = s0.w / s0.h; if (k === 'n' || k === 's') { const w = (y2 - y1) * ar; x2 = x1 + w; } else { const hh = (x2 - x1) / ar; if (k.indexOf('n') >= 0) y1 = y2 - hh; else y2 = y1 + hh; } }
        e.x = x1; e.y = y1; e.w = r1(x2 - x1); e.h = r1(y2 - y1);
        if (e.t === 'group') scaleGroup(e, s0);
      }
    }
    drawOv(); rtSoft(); inspPos();
  });
  window.addEventListener('mouseup', ev => {
    if (mode === 'run') { rtMouse('mouseup', ev); rtMouse('click', ev); return; }
    if (!drag) return;
    const d = drag; drag = null; guides = [];
    if (d.type === 'marq') {
      const a = s2m(d.a[0], d.a[1]), b = s2m(d.b[0], d.b[1]);
      const x1 = Math.min(a[0], b[0]), x2 = Math.max(a[0], b[0]), y1 = Math.min(a[1], b[1]), y2 = Math.max(a[1], b[1]);
      if (x2 - x1 > 2 || y2 - y1 > 2) {
        const got = curEls().filter(e => !e._l && !(e._h && !showHidden)).filter(e => { const q = bbox(e); return q.x >= x1 && q.y >= y1 && q.x + q.w <= x2 && q.y + q.h <= y2; }).map(e => e.id);
        sel = Array.from(new Set(d.base.concat(got)));
      }
      refreshSel(); return;
    }
    if (d.moved) { pushUndo(d.snap); changed(false); } else drawOv();
  });
  ov.addEventListener('contextmenu', ev => {
    ev.preventDefault();
    if (mode !== 'edit') return;
    const sp = evPos(ev), mp = s2m(sp[0], sp[1]), e = hitEl(mp[0], mp[1]);
    if (e && sel.indexOf(e.id) < 0) { sel = [e.id]; refreshSel(); }
    showCtx(ev.clientX, ev.clientY, mp);
  });
  ov.addEventListener('dblclick', ev => {
    if (mode !== 'edit') return;
    const sp = evPos(ev), mp = s2m(sp[0], sp[1]), e = hitEl(mp[0], mp[1]);
    if (!e) return;
    const fld = $('#insp [data-k="tx"]') || $('#insp [data-k="tag"]') || $('#insp [data-k="vt"]');
    if (fld) { fld.focus(); if (fld.select) fld.select(); }
  });
  ov.addEventListener('wheel', ev => {
    if (!(ev.ctrlKey || ev.metaKey)) return;
    ev.preventDefault();
    setZoom(Math.max(0.3, Math.min(3, zoom * (ev.deltaY < 0 ? 1.1 : 1 / 1.1))));
  }, { passive: false });
  // перетаскивание из палитры
  const wrap = $('#stageWrap');
  wrap.addEventListener('dragover', ev => { if (mode === 'edit') { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; } });
  wrap.addEventListener('drop', ev => {
    ev.preventDefault();
    const k = ev.dataTransfer.getData('text/x-gcu-pal');
    if (!k) return;
    const sp = evPos(ev), mp = s2m(sp[0], sp[1]);
    addPreset(k, mp[0], mp[1]);
  });
  new ResizeObserver(() => { if (zoomMode === 'fit') layoutStage(); }).observe(wrap);
}
function scaleGroup(g, s0) {
  // группа меняет размер — дочерние элементы масштабируются
  const kx = s0.w ? g.w / s0.w : 1, ky = s0.h ? g.h / s0.h : 1;
  const sc = (list, src) => list.forEach((c, i) => {
    const o = src[i];
    c.x = r1(o.x * kx); c.y = r1(o.y * ky);
    if (c.t === 'line') { c.x2 = r1(o.x2 * kx); c.y2 = r1(o.y2 * ky); }
    else { c.w = r1(o.w * kx); c.h = r1(o.h * ky); }
    if (c.t === 'group') sc(c.els, o.els);
  });
  sc(g.els, s0.els);
}
function rtMouse(type, ev) {
  if (!RT.mouse || !RT.mouse.h[type]) return;
  const sp = evPos(ev), s = curScreen();
  if (type !== 'mouseup' && (sp[0] < 0 || sp[1] < 0 || sp[0] > s.w * zoom || sp[1] > s.h * zoom)) return;
  const k = (window.devicePixelRatio || 1);
  try { RT.mouse.h[type]({ x: sp[0] * k, y: sp[1] * k }); } catch (e) { console.error(e); }
}
let softT = 0;
function rtSoft() { if (softT) return; softT = requestAnimationFrame(() => { softT = 0; if (RT.api && RT.running) { const { r } = simScreen(); RT.api.setScreen({ els: r.screen.els, pops: r.screen.pops }); } }); }

// ---------------------------------------------------------------- изменение модели
function changed(rebuildInsp) {
  autosave();
  rtSync(false);
  drawOv();
  renderLayers();
  if (rebuildInsp !== false) renderInsp(); else inspPos();
  updButtons();
  checkStatus();
}
function refreshSel() { sel = sel.filter(id => byId(id)); drawOv(); renderLayers(); renderInsp(); updButtons(); updSelStatus(); }
function refreshAll(keepZoom) {
  sel = sel.filter(id => byId(id));
  refreshDatalist();
  renderPalette(); renderWindows(); renderLayers(); renderInsp();
  rtSync(true);
  if (!keepZoom || zoomMode === 'fit') layoutStage(); else layoutStage();
  updButtons(); checkStatus();
  $('#stWin').textContent = (cur.kind === 'pop' ? 'Своё окно: ' : 'Окно: ') + (curCont().name || '');
}
function addPreset(key, x, y) {
  let pre = null;
  PAL.forEach(g => g[1].forEach(p => { if (p[0] === key) pre = p[2]; }));
  if (!pre) return;
  pushUndo();
  const e = JSON.parse(JSON.stringify(pre));
  e.id = uid();
  if (e.t === 'button' && e.act && e.act.a === 'popup') e.act.id = (proj.pops[0] || {}).id || '';
  const w = e.t === 'line' ? e.dx : e.w, hh = e.t === 'line' ? e.dy : e.h;
  e.x = snapV(x - w / 2); e.y = snapV(y - hh / 2);
  if (e.t === 'line') { e.x2 = e.x + e.dx; e.y2 = e.y + e.dy; delete e.dx; delete e.dy; }
  curEls().push(e);
  sel = [e.id];
  changed(true);
  toast('Добавлено: ' + (TL[e.t] || e.t) + '. Настройте справа.');
}
function addPresetCenter(key) {
  const wr = $('#stageWrap'), st = $('#stage').getBoundingClientRect(), wrr = wr.getBoundingClientRect();
  const cx = (wrr.left + wrr.width / 2) - st.left, cy = (wrr.top + wrr.height / 2) - st.top;
  const m = s2m(cx, cy);
  addPreset(key, m[0], m[1]);
}
function delSel() {
  if (!sel.length) return;
  pushUndo();
  const c = curCont(); c.els = c.els.filter(e => sel.indexOf(e.id) < 0);
  sel = []; changed(true);
}
function reId(e) { e.id = uid(); if (e.t === 'group') e.els.forEach(reId); return e; }
function copySel() { if (!sel.length) return; clip = JSON.parse(JSON.stringify(selEls())); try { localStorage.setItem(LS_KEY + '_clip', JSON.stringify(clip)); } catch (e) { } toast('Скопировано: ' + clip.length); }
function paste() {
  let c = clip;
  if (!c) { try { c = JSON.parse(localStorage.getItem(LS_KEY + '_clip') || 'null'); } catch (e) { } }
  if (!c || !c.length) { toast('Буфер пуст'); return; }
  pushUndo();
  const off = grid.size * 2;
  const added = c.map(e => { const n = reId(JSON.parse(JSON.stringify(e))); n.x += off; n.y += off; if (n.t === 'line') { n.x2 += off; n.y2 += off; } return n; });
  added.forEach(e => curEls().push(e));
  clip = added.map(e => JSON.parse(JSON.stringify(e)));
  sel = added.map(e => e.id); changed(true);
}
function dupSel() { if (!sel.length) return; const save = clip; copySel(); paste(); clip = save; }
function nudge(dx, dy) {
  if (!sel.length) return;
  pushUndo();
  selEls().forEach(e => { e.x = r1(+e.x + dx); e.y = r1(+e.y + dy); if (e.t === 'line') { e.x2 = r1(+e.x2 + dx); e.y2 = r1(+e.y2 + dy); } });
  changed(false);
}
function order(dir) {
  if (!sel.length) return;
  pushUndo();
  const c = curCont(), s = c.els.filter(e => sel.indexOf(e.id) >= 0), rest = c.els.filter(e => sel.indexOf(e.id) < 0);
  if (dir === 'front') c.els = rest.concat(s);
  else if (dir === 'back') c.els = s.concat(rest);
  else {
    const els = c.els;
    const idx = els.map((e, i) => sel.indexOf(e.id) >= 0 ? i : -1).filter(i => i >= 0);
    if (dir === 'up') for (let k = idx.length - 1; k >= 0; k--) { const i = idx[k]; if (i < els.length - 1 && sel.indexOf(els[i + 1].id) < 0) { const t = els[i]; els[i] = els[i + 1]; els[i + 1] = t; } }
    if (dir === 'down') idx.forEach(i => { if (i > 0 && sel.indexOf(els[i - 1].id) < 0) { const t = els[i]; els[i] = els[i - 1]; els[i - 1] = t; } });
  }
  changed(false);
}
function groupSel() {
  const se = selEls();
  if (se.length < 2) { toast('Выделите два или больше элемента (Shift + щелчок или рамкой)'); return; }
  pushUndo();
  const u = unionBox(se), c = curCont();
  const first = c.els.findIndex(e => sel.indexOf(e.id) >= 0);
  const kids = c.els.filter(e => sel.indexOf(e.id) >= 0).map(e => { const k = JSON.parse(JSON.stringify(e)); k.x = r1(k.x - u.x); k.y = r1(k.y - u.y); if (k.t === 'line') { k.x2 = r1(k.x2 - u.x); k.y2 = r1(k.y2 - u.y); } return k; });
  const g = { id: uid(), t: 'group', x: u.x, y: u.y, w: u.w, h: u.h, nm: 'Группа', els: kids };
  c.els = c.els.filter(e => sel.indexOf(e.id) < 0);
  c.els.splice(first, 0, g);
  sel = [g.id]; changed(true);
}
function ungroupSel() {
  const gs = selEls().filter(e => e.t === 'group');
  if (!gs.length) { toast('Выделите группу'); return; }
  pushUndo();
  const c = curCont(), ns = [];
  gs.forEach(g => {
    const i = c.els.indexOf(g);
    const kids = g.els.map(k => { k.x = r1(+k.x + g.x); k.y = r1(+k.y + g.y); if (k.t === 'line') { k.x2 = r1(+k.x2 + g.x); k.y2 = r1(+k.y2 + g.y); } if (g.vis && g.vis.l && g.vis.l.length && !k.vis) k.vis = JSON.parse(JSON.stringify(g.vis)); ns.push(k.id); return k; });
    c.els.splice(i, 1, ...kids);
  });
  sel = ns; changed(true);
}
function align(kind) {
  const se = selEls();
  if (se.length < 2 && !/^s[wh]$/.test(kind)) return;
  pushUndo();
  const u = unionBox(se);
  const mv = (e, nx, ny) => { const b = bbox(e), dx = nx === null ? 0 : nx - b.x, dy = ny === null ? 0 : ny - b.y; e.x = r1(+e.x + dx); e.y = r1(+e.y + dy); if (e.t === 'line') { e.x2 = r1(+e.x2 + dx); e.y2 = r1(+e.y2 + dy); } };
  if (kind === 'l') se.forEach(e => mv(e, u.x, null));
  if (kind === 'r') se.forEach(e => mv(e, u.x + u.w - bbox(e).w, null));
  if (kind === 'hc') se.forEach(e => mv(e, u.x + u.w / 2 - bbox(e).w / 2, null));
  if (kind === 't') se.forEach(e => mv(e, null, u.y));
  if (kind === 'b') se.forEach(e => mv(e, null, u.y + u.h - bbox(e).h));
  if (kind === 'vc') se.forEach(e => mv(e, null, u.y + u.h / 2 - bbox(e).h / 2));
  if (kind === 'dh' || kind === 'dv') {
    const H = kind === 'dh', s = se.slice().sort((a, b) => H ? bbox(a).x - bbox(b).x : bbox(a).y - bbox(b).y);
    const total = s.reduce((m, e) => m + (H ? bbox(e).w : bbox(e).h), 0), gap = ((H ? u.w : u.h) - total) / Math.max(1, s.length - 1);
    let p = H ? u.x : u.y;
    s.forEach(e => { if (H) mv(e, p, null); else mv(e, null, p); p += (H ? bbox(e).w : bbox(e).h) + gap; });
  }
  if (kind === 'sw' || kind === 'sh') { const f = se[0]; se.forEach(e => { if (e.t === 'line') return; if (kind === 'sw') e.w = f.w; else e.h = f.h; }); }
  changed(false);
}
function setZoom(z) { zoomMode = 'manual'; zoom = Math.round(z * 100) / 100; $('#sZoom').value = ['0.5', '0.75', '1', '1.25', '1.5', '2'].indexOf(String(zoom)) >= 0 ? String(zoom) : $('#sZoom').value; layoutStage(); }

// ---------------------------------------------------------------- контекстное меню
function showCtx(x, y, mp) {
  const m = $('#ctx'); m.innerHTML = '';
  const it = (label, key, fn, en) => m.append(h('button', { disabled: en === false, onclick: () => { hideCtx(); fn(); } }, label, h('span', {}, key || '')));
  const n = sel.length;
  it('Копировать', 'Ctrl+C', copySel, n > 0); it('Вставить', 'Ctrl+V', paste); it('Дублировать', 'Ctrl+D', dupSel, n > 0); it('Удалить', 'Del', delSel, n > 0);
  m.append(h('hr'));
  it('На передний план', '', () => order('front'), n > 0); it('На задний план', '', () => order('back'), n > 0);
  it('Сгруппировать', 'Ctrl+G', groupSel, n > 1); it('Разгруппировать', 'Ctrl+Shift+G', ungroupSel, selEls().some(e => e.t === 'group'));
  m.append(h('hr'));
  it(n === 1 && byId(sel[0])._l ? 'Разблокировать' : 'Заблокировать', '', () => { pushUndo(); selEls().forEach(e => { e._l = !e._l; }); sel = []; changed(true); }, n > 0);
  it('Скрыть в редакторе', '', () => { pushUndo(); selEls().forEach(e => { e._h = true; }); sel = []; changed(true); }, n > 0);
  m.hidden = false;
  const r = m.getBoundingClientRect();
  m.style.left = Math.min(x, innerWidth - r.width - 8) + 'px'; m.style.top = Math.min(y, innerHeight - r.height - 8) + 'px';
}
function hideCtx() { $('#ctx').hidden = true; }

// ---------------------------------------------------------------- палитра
function icon(key, cv) {
  const c = cv.getContext('2d'), d = 2; cv.width = 40 * d; cv.height = 26 * d; c.scale(d, d);
  const P = (pts, f, s) => { c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = 1.2; c.stroke(); } };
  const R = (x, y, w, hh, f, s) => { if (f) { c.fillStyle = f; c.fillRect(x, y, w, hh); } if (s) { c.strokeStyle = s; c.lineWidth = 1; c.strokeRect(x + .5, y + .5, w - 1, hh - 1); } };
  const T = (t, x, y, sz, col, b) => { c.font = (b ? 'bold ' : '') + sz + 'px sans-serif'; c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, x, y); };
  const O = (x, y, r, f, s, lw) => { c.beginPath(); c.arc(x, y, r, 0, 7); if (f) { c.fillStyle = f; c.fill(); } if (s) { c.strokeStyle = s; c.lineWidth = lw || 1.2; c.stroke(); } };
  switch (key) {
    case 'text': T('Аб', 20, 13, 15, CL.text, true); break;
    case 'value': R(4, 6, 32, 14, CL.white, CL.panelBorder); T('12.5', 20, 13.5, 10, CL.text, true); break;
    case 'valuebox': R(5, 2, 30, 22, CL.white, CL.panelBorder); T('LT-1', 20, 7, 6, CL.text2); T('70.6', 20, 16, 10, CL.text, true); break;
    case 'rect': R(4, 4, 32, 18, CL.panel, CL.panelBorder); break;
    case 'circle': O(20, 13, 9, CL.white, CL.text); break;
    case 'line': c.strokeStyle = CL.text2; c.lineWidth = 2; c.beginPath(); c.moveTo(4, 20); c.lineTo(36, 6); c.stroke(); break;
    case 'pipeH': R(2, 10, 36, 6, CL.pulp); break;
    case 'pipeW': R(2, 11, 36, 3, CL.water); break;
    case 'tri': P([14, 7, 26, 7, 20, 19], CL.pulp); break;
    case 'clock': T('12:30', 20, 13, 11, CL.text, true); break;
    case 'valveH': P([8, 5, 20, 13, 8, 21], CL.run, CL.text); P([32, 5, 20, 13, 32, 21], CL.run, CL.text); break;
    case 'valveV': P([12, 1, 28, 1, 20, 13], CL.stop, CL.text); P([12, 25, 28, 25, 20, 13], CL.stop, CL.text); break;
    case 'pump': O(18, 13, 11, CL.run, CL.text, 2); P([22, 9, 29, 13, 22, 17], '#fff', CL.text); break;
    case 'tank': R(12, 2, 16, 22, CL.tankIn); R(13, 11, 14, 12, CL.slurry); R(12, 2, 16, 22, null, CL.tankWall); break;
    case 'bar': R(16, 2, 9, 22, CL.white, CL.panelBorder); R(17, 10, 7, 13, CL.ready); break;
    case 'sensor': O(20, 13, 9, CL.white, CL.text); T('PT', 20, 13.5, 7, CL.text, true); break;
    case 'cyclone': P([10, 2, 30, 2, 23, 24, 17, 24], '#6A6F75', CL.text); break;
    case 'pumpcard': R(4, 4, 32, 18, CL.panel, CL.panelBorder); R(5, 5, 3, 16, CL.run); T('Н-1', 18, 10, 6, CL.text, true); break;
    case 'lamp': O(13, 13, 6, CL.run, CL.text); R(22, 11, 13, 3, CL.text2); break;
    case 'state': R(3, 7, 34, 12, CL.run); T('РАБОТА', 20, 13.5, 6.5, '#fff', true); break;
    case 'alarms': R(3, 3, 34, 20, CL.white, CL.panelBorder); R(6, 7, 3, 4, CL.alarm); R(11, 8, 20, 2, CL.alarm); R(6, 15, 3, 4, CL.move); R(11, 16, 16, 2, CL.text2); break;
    case 'trend': R(3, 3, 34, 20, CL.white, CL.panelBorder); c.strokeStyle = CL.ready; c.lineWidth = 1.5; c.beginPath(); c.moveTo(5, 18); c.lineTo(12, 12); c.lineTo(19, 15); c.lineTo(27, 7); c.lineTo(35, 10); c.stroke(); break;
    case 'alarmline': R(2, 8, 36, 10, CL.white, CL.panelBorder); R(3, 9, 10, 8, CL.move); break;
    case 'button': c.fillStyle = CL.btn; c.strokeStyle = CL.btnBorder; c.fillRect(5, 6, 30, 14); c.strokeRect(5.5, 6.5, 29, 13); T('ПУСК', 20, 13.5, 7, CL.text, true); break;
    case 'btnPop': c.fillStyle = CL.btn; c.strokeStyle = CL.btnBorder; c.fillRect(5, 6, 30, 14); c.strokeRect(5.5, 6.5, 29, 13); T('⧉', 20, 13.5, 10, CL.text, true); break;
    case 'btnClose': R(8, 4, 24, 18, CL.topBar); T('×', 20, 13, 14, '#fff', true); break;
    case 'hold': R(5, 4, 30, 18, CL.run); T('▲', 20, 13.5, 10, '#fff', true); break;
    case 'input': R(4, 6, 32, 14, CL.white, CL.btnBorder); T('75.0', 23, 13.5, 8, CL.ready, true); c.strokeStyle = CL.ready; c.beginPath(); c.moveTo(7, 18); c.lineTo(10, 9); c.stroke(); break;
  }
}
function renderPalette() {
  const box = $('#tab-pal'); if (box.childElementCount) return;
  PAL.forEach(g => {
    const grid2 = h('div', { class: 'pal' });
    g[1].forEach(p => {
      const cv = h('canvas', { 'aria-hidden': 'true' }); icon(p[0], cv);
      const b = h('button', { draggable: 'true', title: 'Перетащите на холст или нажмите', onclick: () => { if (mode !== 'edit') setMode('edit'); addPresetCenter(p[0]); } }, cv, p[1]);
      b.addEventListener('dragstart', ev => { ev.dataTransfer.setData('text/x-gcu-pal', p[0]); ev.dataTransfer.effectAllowed = 'copy'; });
      grid2.append(b);
    });
    box.append(h('div', { class: 'palgrp' }, h('h3', {}, g[0]), grid2));
  });
  box.append(h('p', { class: 'note' }, 'Перетащите элемент на холст. Двойной щелчок по элементу — к его тексту или тегу в свойствах. Правая кнопка — меню.'));
}

// ---------------------------------------------------------------- окна проекта
function renderWindows() {
  const box = $('#tab-win'); box.innerHTML = '';
  box.append(h('div', { class: 'secttl' }, 'Окна панели (JS-объекты)'));
  const l1 = h('div', { class: 'list' });
  proj.screens.forEach(s => l1.append(h('div', { class: 'li' + (cur.kind === 'screen' && cur.id === s.id ? ' on' : ''), onclick: () => openCont('screen', s.id) },
    h('span', { class: 'nm' }, s.name || s.id), h('span', { class: 'ty' }, s.w + '×' + s.h))));
  box.append(l1);
  box.append(h('div', { class: 'btnrow' },
    h('button', { onclick: addScreen }, '+ Окно'),
    h('button', { onclick: () => dupCont('screen'), disabled: cur.kind !== 'screen' }, 'Дублировать'),
    h('button', { class: 'danger', onclick: () => delCont('screen'), disabled: cur.kind !== 'screen' || proj.screens.length < 2 }, 'Удалить')));
  box.append(h('div', { class: 'secttl' }, 'Свои всплывающие окна'));
  const l2 = h('div', { class: 'list' });
  if (!proj.pops.length) l2.append(h('p', { class: 'note' }, 'Окно поверх экрана с заголовком и крестиком — как окно задвижки. Открывается кнопкой с действием «Открыть своё окно». Символ # в тегах и текстах заменяется номером, который передаёт кнопка — одно окно на много моторов.'));
  proj.pops.forEach(p => l2.append(h('div', { class: 'li' + (cur.kind === 'pop' && cur.id === p.id ? ' on' : ''), onclick: () => openCont('pop', p.id) },
    h('span', { class: 'nm' }, p.name || p.id), h('span', { class: 'ty' }, p.w + '×' + p.h))));
  box.append(l2);
  box.append(h('div', { class: 'btnrow' },
    h('button', { onclick: addPop }, '+ Своё окно'),
    h('button', { onclick: () => dupCont('pop'), disabled: cur.kind !== 'pop' }, 'Дублировать'),
    h('button', { class: 'danger', onclick: () => delCont('pop'), disabled: cur.kind !== 'pop' }, 'Удалить')));
  box.append(h('p', { class: 'note' }, 'Свойства выбранного окна — справа, когда ничего не выделено (щелчок по пустому месту холста).'));
}
function openCont(kind, id) {
  if (kind === 'screen') lastScreen = id;
  cur = { kind: kind, id: id }; sel = [];
  if (mode === 'run' && kind === 'pop') setMode('edit');
  refreshAll(false);
}
function addScreen() {
  pushUndo();
  const id = 's' + uid().slice(1);
  proj.screens.push({ id: id, name: 'Окно ' + (proj.screens.length + 1), w: 1024, h: 664, ox: 0, oy: 48, bg: CL.bg, demoChip: [860, 60], els: [] });
  openCont('screen', id); autosave();
}
function addPop() {
  pushUndo();
  const id = 'p' + uid().slice(1);
  proj.pops.push({ id: id, name: 'Окно ' + (proj.pops.length + 1), ti: 'Заголовок окна', w: 420, h: 320, els: [
    { id: uid(), t: 'button', x: 284, y: 256, w: 120, h: 48, tx: 'ЗАКРЫТЬ', style: 'normal', act: { a: 'close' } }] });
  if (!lastScreen) lastScreen = curScreen().id;
  openCont('pop', id); autosave();
}
function dupCont(kind) {
  pushUndo();
  const list = kind === 'screen' ? proj.screens : proj.pops;
  const src = list.find(x => x.id === cur.id); if (!src) return;
  const c = JSON.parse(JSON.stringify(src));
  c.id = (kind === 'screen' ? 's' : 'p') + uid().slice(1); c.name = (src.name || '') + ' (копия)';
  c.els.forEach(reId);
  list.push(c); openCont(kind, c.id); autosave();
}
async function delCont(kind) {
  const list = kind === 'screen' ? proj.screens : proj.pops, c = list.find(x => x.id === cur.id);
  if (!c) return;
  if (!(await ask('Удалить окно?', '«' + (c.name || c.id) + '» и все его элементы. Отменить можно кнопкой ↶.', 'Удалить'))) return;
  pushUndo();
  list.splice(list.indexOf(c), 1);
  openCont('screen', proj.screens[0].id); autosave();
}

// ---------------------------------------------------------------- слои
function renderLayers() {
  const box = $('#tab-lay'); if (box.hidden) return;
  box.innerHTML = '';
  box.append(h('div', { class: 'secttl' }, 'Элементы (сверху — передний план)', h('label', { class: 'chk', title: 'Показывать скрытые условием видимости и в редакторе' }, h('input', { type: 'checkbox', checked: showHidden, onchange: ev => { showHidden = ev.target.checked; if (RT.host) RT.host.showAll = showHidden; rtSync(true); drawOv(); } }), 'все')));
  const l = h('div', { class: 'list' });
  const els = curEls().slice().reverse();
  if (!els.length) l.append(h('p', { class: 'note' }, 'Пусто. Перетащите элементы из палитры.'));
  els.forEach(e => {
    const row = h('div', { class: 'li' + (sel.indexOf(e.id) >= 0 ? ' on' : ''), onclick: ev => { if (ev.target.closest('.ic')) return; if (ev.shiftKey || ev.ctrlKey) { if (sel.indexOf(e.id) >= 0) sel = sel.filter(x => x !== e.id); else sel.push(e.id); } else sel = [e.id]; refreshSel(); } },
      h('button', { class: 'ic' + (e._h ? '' : ' act'), title: e._h ? 'Показать в редакторе' : 'Скрыть в редакторе (на панели будет виден)', onclick: () => { pushUndo(); e._h = !e._h; changed(false); } }, e._h ? '◌' : '●'),
      h('button', { class: 'ic' + (e._l ? ' act' : ''), title: e._l ? 'Разблокировать' : 'Заблокировать (нельзя выделить на холсте)', onclick: () => { pushUndo(); e._l = !e._l; if (e._l) sel = sel.filter(x => x !== e.id); changed(true); } }, e._l ? '🔒' : '·'),
      h('span', { class: 'nm' }, elLabel(e)), h('span', { class: 'ty' }, e.t));
    l.append(row);
    if (e.t === 'group') e.els.slice().reverse().forEach(k => l.append(h('div', { class: 'li child' }, h('span', { class: 'nm' }, '└ ' + elLabel(k)), h('span', { class: 'ty' }, k.t))));
  });
  box.append(l);
  box.append(h('div', { class: 'btnrow' }, h('button', { onclick: () => order('up'), disabled: !sel.length }, '↑ выше'), h('button', { onclick: () => order('down'), disabled: !sel.length }, '↓ ниже')));
}

// ---------------------------------------------------------------- инспектор: поля
function fieldRow(label, ctl, hint) { return h('div', { class: 'row' }, h('label', {}, label), ctl, hint ? h('div', { class: 'hint' }, hint) : null); }
let focusSnap = null;
function bindInput(inp, get, set, live) {
  inp.addEventListener('focus', () => { focusSnap = snapshot(); });
  inp.addEventListener(live ? 'input' : 'change', () => {
    if (!focusSnap) focusSnap = snapshot();
    set(inp.type === 'checkbox' ? inp.checked : inp.value);
    autosave(); rtSoft(); drawOv();
    if (inp.type === 'checkbox' || inp.tagName === 'SELECT') { pushUndo(focusSnap); focusSnap = null; changed(true); }
  });
  if (live) inp.addEventListener('change', () => { if (focusSnap) { pushUndo(focusSnap); focusSnap = null; } changed(false); renderLayers(); });
  return inp;
}
function numIn(obj, k, opts) {
  opts = opts || {};
  const i = h('input', { type: 'number', class: 'num', step: opts.step || 'any', value: obj[k] === undefined ? '' : obj[k], 'data-k': k, placeholder: opts.ph || '' });
  return bindInput(i, null, v => { if (v === '' && opts.empty) delete obj[k]; else obj[k] = v === '' ? 0 : +v; }, true);
}
function textIn(obj, k, opts) {
  opts = opts || {};
  const i = h(opts.area ? 'textarea' : 'input', { type: 'text', value: obj[k] === undefined ? '' : obj[k], 'data-k': k, placeholder: opts.ph || '', rows: opts.area ? 2 : null });
  if (opts.area) i.value = obj[k] === undefined ? '' : obj[k];
  return bindInput(i, null, v => { if (v === '' && opts.empty !== false) delete obj[k]; else obj[k] = v; }, true);
}
function boolIn(obj, k, def) { const i = h('input', { type: 'checkbox', checked: obj[k] === undefined ? !!def : !!obj[k], 'data-k': k }); return bindInput(i, null, v => { obj[k] = !!v; }); }
function selIn(obj, k, opts, def) {
  const i = h('select', { 'data-k': k });
  opts.forEach(o => i.append(h('option', { value: String(o[0]) }, o[1])));
  i.value = String(obj[k] === undefined ? (def !== undefined ? def : opts[0][0]) : obj[k]);
  return bindInput(i, null, v => { const n = opts.find(o => String(o[0]) === v); obj[k] = n && typeof n[0] === 'number' ? +v : v; });
}
function colorIn(obj, k) {
  const val = obj[k] || '';
  const t = h('input', { type: 'text', value: val, placeholder: 'нет', 'data-k': k, maxlength: 9 });
  const c = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(val) ? val : '#ffffff', title: 'Выбрать цвет' });
  const s = h('select', { title: 'Цвета проекта ГЦУ' }, h('option', { value: '' }, '▾'), NAMED_COLORS.map(n => h('option', { value: n[1], style: 'background:' + n[1] + ';color:' + (contrast(n[1]) ? '#000' : '#fff') }, n[0])), h('option', { value: '-' }, '— убрать цвет'));
  const apply = v => {
    if (!focusSnap) focusSnap = snapshot();
    if (v === '' || v === '-') delete obj[k]; else obj[k] = v;
    t.value = obj[k] || ''; if (obj[k] && /^#[0-9a-f]{6}$/i.test(obj[k])) c.value = obj[k];
    pushUndo(focusSnap); focusSnap = null; changed(false); autosave();
  };
  t.addEventListener('focus', () => { focusSnap = snapshot(); });
  t.addEventListener('change', () => { let v = t.value.trim(); if (v && v[0] !== '#') v = '#' + v; apply(v); });
  c.addEventListener('focus', () => { focusSnap = snapshot(); });
  c.addEventListener('input', () => { obj[k] = c.value; t.value = c.value; rtSoft(); });
  c.addEventListener('change', () => apply(c.value));
  s.addEventListener('change', () => { if (s.value) apply(s.value); s.value = ''; });
  return h('div', { class: 'colin' }, c, t, s);
}
function contrast(hex) { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 140; }
function tagIn(obj, k, write) {
  const i = h('input', { type: 'text', value: obj[k] || '', list: 'dlTags', 'data-k': k, placeholder: write ? 'тег для записи' : 'выберите тег', spellcheck: 'false' });
  const mark = () => { const v = i.value.trim(); i.classList.toggle('bad', !!v && !tagKnown(v)); i.title = v ? tagDesc(v) : ''; };
  mark();
  bindInput(i, null, v => { v = v.trim(); if (v) obj[k] = v; else delete obj[k]; mark(); }, true);
  const b = h('button', { title: 'Выбрать из списка тегов', onclick: () => tagBrowser(v => { i.value = v; if (!focusSnap) focusSnap = snapshot(); obj[k] = v; mark(); pushUndo(focusSnap); focusSnap = null; changed(true); }, write) }, '⋯');
  return h('div', { class: 'tagin' }, i, b);
}
function tagDesc(n) {
  if (GCU_MAP[n]) return 'ГЦУ: ' + GCU_MAP[n].d;
  const t = tagIndex()[n]; if (t) return TYPES[t.f.t][1] + ' · ' + addrText(t.db, t.f) + (t.f.cm ? ' · ' + t.f.cm : '') + (t.f.wr ? ' · запись' : '');
  if (n.indexOf('#') >= 0) return 'Шаблон: # заменяется номером окна';
  return 'Тег не найден — добавьте его в «Данные ПЛК»';
}
function condEd(obj, k, title) {
  const c = obj[k] || { m: 'all', l: [] };
  const box = h('div', { class: 'box' });
  const draw = () => {
    box.innerHTML = '';
    if (!c.l.length) box.append(h('div', { class: 'hint', style: 'color:var(--fg3);font-size:11.5px;margin-bottom:4px' }, 'Нет условий — ' + (title || 'всегда')));
    if (c.l.length > 1) box.append(h('div', { style: 'margin-bottom:4px' }, selIn(c, 'm', [['all', 'все условия (И)'], ['any', 'любое условие (ИЛИ)']])));
    c.l.forEach((r, i) => {
      const vin = textIn(r, 'v', { ph: 'знач.', empty: false });
      vin.style.visibility = OPV[r.op] ? 'visible' : 'hidden';
      const op = selIn(r, 'op', OPS);
      op.addEventListener('change', () => { vin.style.visibility = OPV[r.op] ? 'visible' : 'hidden'; });
      box.append(h('div', { class: 'crow' }, tagIn(r, 'tag'), op, vin, h('button', { class: 'mini', title: 'Убрать условие', onclick: () => { pushUndo(); c.l.splice(i, 1); if (!c.l.length) delete obj[k]; changed(true); } }, '×')));
    });
    box.append(h('button', { class: 'mini', onclick: () => { pushUndo(); c.l.push({ tag: '', op: '1', v: '' }); obj[k] = c; changed(true); } }, '+ условие'));
  };
  draw();
  return box;
}
function actEd(obj, k) {
  const a = obj[k] || { a: '' };
  const box = h('div', { class: 'box' });
  const s = selIn(a, 'a', ACTS);
  s.addEventListener('change', () => { if (a.a) obj[k] = a; else delete obj[k]; changed(true); });
  box.append(s);
  const R = (l, ctl, hint) => box.append(fieldRow(l, ctl, hint));
  switch (a.a) {
    case 'write': R('Тег', tagIn(a, 'tag', true)); R('Значение', textIn(a, 'v', { empty: false })); break;
    case 'toggle': R('Тег (бит)', tagIn(a, 'tag', true)); break;
    case 'keypad': R('Тег', tagIn(a, 'tag', true)); R('Заголовок', textIn(a, 'ti')); R('Минимум', numIn(a, 'min')); R('Максимум', numIn(a, 'max')); R('Знаков после ,', numIn(a, 'dec')); break;
    case 'popup': R('Окно', selIn(a, 'id', [['', '— выберите —']].concat(proj.pops.map(p => [p.id, p.name || p.id])))); R('Номер (#)', textIn(a, 'p', { ph: 'напр. 1' }), 'Подставится вместо # в тегах и текстах окна'); break;
    case 'gcu': R('Команда', selIn(a, 'v', GCU_CMDS)); break;
    case 'pump': R('Насос', selIn(a, 'n', [[1, 'Н-1'], [2, 'Н-2']])); R('Команда', selIn(a, 'v', [[1, '1 — ПУСК'], [2, '2 — СТОП'], [4, '4 — СБРОС']])); break;
    case 'valvecmd': R('Задвижка', selIn(a, 'n', VALVE_N.map((n, i) => [i, i + ' · ' + n]).slice(1))); R('Команда', selIn(a, 'v', [[1, '1 — ОТКРЫТЬ'], [2, '2 — ЗАКРЫТЬ'], [4, '4 — СБРОС']])); break;
    case 'valvewin': R('Задвижка', selIn(a, 'n', VALVE_N.map((n, i) => [i, i + ' · ' + n]).slice(1))); break;
    case 'pumpwin': R('Насос', selIn(a, 'n', [[1, 'Н-1'], [2, 'Н-2']])); break;
    case 'win': R('Номер окна', numIn(a, 'n'), 'Нужен адрес LW-9050 в свойствах окна'); break;
  }
  if (a.a && a.a !== 'close') {
    R('Подтверждение', textIn(a, 'cf', { ph: 'вопрос «ДА / НЕТ»' }), 'Пусто — выполнить сразу');
    if (a.cf) R('Пояснение', textIn(a, 'cm'));
    R('Пароль инженера', boolIn(a, 'pin'));
    R('Сообщение', textIn(a, 'msg', { ph: 'после выполнения' }));
    R('В журнал', textIn(a, 'log', { ph: 'запись в журнал событий' }));
  }
  return box;
}
function listEd(obj, k, cols, newRow, title) {
  const arr = obj[k] || (obj[k] = []);
  const box = h('div', { class: 'box' });
  arr.forEach((r, i) => {
    const line = h('div', { style: 'display:grid;grid-template-columns:' + cols.map(c => c[2] || '1fr').join(' ') + ' 22px;gap:3px;margin:3px 0;align-items:center' });
    cols.forEach(c => {
      let ctl;
      if (c[1] === 'num') ctl = numIn(r, c[0]); else if (c[1] === 'color') { ctl = colorIn(r, c[0]); ctl.querySelector('input[type=text]').style.display = 'none'; }
      else if (c[1] === 'tag') ctl = tagIn(r, c[0]); else if (c[1] === 'bool') ctl = h('label', { class: 'chk', title: c[3] || '' }, boolIn(r, c[0]), c[3] || '');
      else if (c[1] === 'sel') ctl = selIn(r, c[0], c[3]); else ctl = textIn(r, c[0], { ph: c[3] || '', empty: false });
      line.append(ctl);
    });
    line.append(h('button', { class: 'mini', title: 'Удалить', onclick: () => { pushUndo(); arr.splice(i, 1); changed(true); } }, '×'));
    box.append(line);
  });
  box.append(h('button', { class: 'mini', onclick: () => { pushUndo(); arr.push(newRow()); changed(true); } }, '+ ' + (title || 'строка')));
  return box;
}
function rulesEd(e) {
  const keys = (RULE_KEYS[e.t] || []).concat(['hide']);
  const arr = e.st || [];
  const box = h('div');
  arr.forEach((r, i) => {
    const b = h('div', { class: 'box' });
    b.append(h('div', { style: 'display:flex;justify-content:space-between;align-items:center;margin-bottom:3px' }, h('b', { style: 'font-size:12px' }, 'Правило ' + (i + 1) + ' — если'),
      h('button', { class: 'mini', onclick: () => { pushUndo(); arr.splice(i, 1); if (!arr.length) delete e.st; changed(true); } }, 'удалить')));
    if (!r.c) r.c = { m: 'all', l: [] };
    b.append(condEd(r, 'c', 'правило не сработает'));
    b.append(h('div', { style: 'font-size:12px;margin:4px 0 2px;color:var(--fg2)' }, 'то:'));
    r.p = r.p || {};
    Object.keys(r.p).forEach(pk => {
      const kind = KEY_KIND[pk] || (pk === 'hide' ? 'bool' : 'text');
      let ctl = kind === 'color' ? colorIn(r.p, pk) : kind === 'num' ? numIn(r.p, pk) : kind === 'bool' ? boolIn(r.p, pk) : kind === 'sel' ? selIn(r.p, pk, BSTYLE) : textIn(r.p, pk, { empty: false });
      b.append(h('div', { class: 'row' }, h('label', {}, KEY_NAME[pk] || pk), h('div', { style: 'display:flex;gap:3px;min-width:0' }, ctl, h('button', { class: 'mini', onclick: () => { pushUndo(); delete r.p[pk]; changed(true); } }, '×'))));
    });
    const add = h('select', {}, h('option', { value: '' }, '+ изменить свойство…'), keys.filter(x => !(x in r.p)).map(x => h('option', { value: x }, KEY_NAME[x] || x)));
    add.addEventListener('change', () => { if (!add.value) return; pushUndo(); const kk = add.value; r.p[kk] = kk === 'hide' || kk === 'bold' || kk === 'dash' ? true : (KEY_KIND[kk] === 'color' ? CL.alarm : KEY_KIND[kk] === 'num' ? (e[kk] || 1) : kk === 'style' ? 'red' : (e[kk] || '')); changed(true); });
    b.append(h('div', { style: 'display:flex;gap:8px;align-items:center;margin-top:4px' }, add, h('label', { class: 'chk' }, boolIn(r, 'bl'), 'мигать')));
    box.append(b);
  });
  box.append(h('button', { class: 'mini', onclick: () => { pushUndo(); e.st = arr; arr.push({ c: { m: 'all', l: [{ tag: '', op: '1', v: '' }] }, p: {} }); changed(true); } }, '+ правило'));
  return box;
}
function inspPos() {
  const se = selEls(); if (se.length !== 1) { updSelStatus(); return; }
  const e = se[0];
  ['x', 'y', 'w', 'h', 'x2', 'y2'].forEach(k => { const i = $('#insp [data-pos="' + k + '"]'); if (i && document.activeElement !== i) i.value = e[k] === undefined ? '' : r1(e[k]); });
  updSelStatus();
}
function updSelStatus() { const se = selEls(); if (!se.length) { $('#stSel').textContent = ''; return; } const u = unionBox(se); $('#stSel').textContent = (se.length > 1 ? se.length + ' эл. · ' : '') + 'X ' + r1(u.x) + ' Y ' + r1(u.y) + ' · ' + r1(u.w) + '×' + r1(u.h); }

function renderInsp() {
  const box = $('#insp'); box.innerHTML = '';
  $('#alignbar').hidden = !(mode === 'edit' && sel.length > 1);
  if (mode === 'run') { renderSim(); return; }
  const se = selEls();
  if (!se.length) { renderContInsp(box); return; }
  if (se.length > 1) {
    box.append(h('div', { class: 'ih' }, h('h2', {}, 'Выделено: ' + se.length), h('p', {}, 'Выравнивание — панель над холстом. Двигать — мышью или стрелками.')));
    const s = h('div', { class: 'sec' }, h('h4', {}, 'Действия'));
    s.append(h('div', { class: 'btnrow' }, h('button', { onclick: groupSel }, 'Сгруппировать'), h('button', { onclick: dupSel }, 'Дублировать'), h('button', { class: 'danger', onclick: delSel }, 'Удалить')));
    box.append(s);
    const common = se.every(e => e.t === se[0].t) ? se[0].t : null;
    if (common && (F[common] || []).some(f => f[2] === 'color')) {
      const s2 = h('div', { class: 'sec' }, h('h4', {}, 'Цвет для всех'));
      (F[common] || []).filter(f => f[2] === 'color').forEach(f => {
        const proxy = { [f[0]]: se[0][f[0]] };
        const ctl = colorIn(new Proxy(proxy, { set(t, p, v) { t[p] = v; se.forEach(e => { e[p] = v; }); return true; }, deleteProperty(t, p) { delete t[p]; se.forEach(e => delete e[p]); return true; } }), f[0]);
        s2.append(fieldRow(f[1], ctl));
      });
      box.append(s2);
    }
    return;
  }
  const e = se[0];
  box.append(h('div', { class: 'ih' }, h('h2', {}, TL[e.t] || e.t), h('p', {}, elLabel(e) + ' · ' + e.id)));
  const s0 = h('div', { class: 'sec' }, h('h4', {}, 'Положение и размер', h('span', { class: 'mono', style: 'font-size:10.5px' }, cur.kind === 'pop' ? 'от угла окна' : 'координаты панели')));
  const pos = (k, l) => { const i = numIn(e, k); i.setAttribute('data-pos', k); i.removeAttribute('data-k'); return h('label', {}, l, i); };
  if (e.t === 'line') s0.append(h('div', { class: 'grid4' }, pos('x', 'X1'), pos('y', 'Y1'), pos('x2', 'X2'), pos('y2', 'Y2')));
  else s0.append(h('div', { class: 'grid4' }, pos('x', 'X'), pos('y', 'Y'), pos('w', 'Ширина'), pos('h', 'Высота')));
  s0.append(fieldRow('Имя в слоях', textIn(e, 'nm', { ph: elLabel(e) })));
  box.append(s0);
  if (NOTE[e.t]) box.append(h('div', { class: 'sec' }, h('p', { class: 'note', style: 'margin:0' }, NOTE[e.t])));
  const fl = F[e.t] || [];
  if (fl.length) {
    const s1 = h('div', { class: 'sec' }, h('h4', {}, 'Свойства'));
    fl.forEach(f => {
      const [k, l, kind, o, hint, show, def] = f;
      if (show && !show(e)) return;
      let ctl;
      switch (kind) {
        case 'num': ctl = numIn(e, k, { empty: true }); break;
        case 'text': ctl = textIn(e, k); break;
        case 'area': ctl = textIn(e, k, { area: true }); break;
        case 'color': ctl = colorIn(e, k); break;
        case 'bool': ctl = boolIn(e, k, def); break;
        case 'sel': ctl = selIn(e, k, o); ctl.addEventListener('change', () => { if (k === 'src' || k === 'fm' || k === 'dir') { if (k === 'dir' && e.t === 'valve') { const t = e.w; e.w = e.h; e.h = t; } changed(true); } }); break;
        case 'tag': ctl = tagIn(e, k); break;
        case 'tagw': ctl = tagIn(e, k, true); break;
        case 'cond': s1.append(h('div', { style: 'font-size:12px;color:var(--fg2);margin-top:6px' }, l)); s1.append(condEd(e, k)); if (hint) s1.append(h('div', { class: 'hint' }, hint)); return;
        case 'act': s1.append(h('div', { style: 'font-size:12px;color:var(--fg2);margin-top:6px' }, l)); s1.append(actEd(e, k)); return;
        case 'sts': s1.append(h('div', { style: 'font-size:12px;color:var(--fg2);margin-top:6px' }, 'Состояния: значение → текст, заливка, цвет текста, мигание'));
          s1.append(listEd(e, k, [['v', 'num', '46px'], ['tx', 'text', '1fr'], ['f', 'color', '64px'], ['c', 'color', '64px'], ['bl', 'bool', '30px', '']], () => ({ v: (e.sts || []).length, tx: 'СОСТОЯНИЕ', f: CL.stop, c: CL.text }), 'состояние')); return;
        case 'marks': s1.append(h('div', { style: 'font-size:12px;color:var(--fg2);margin-top:6px' }, 'Отметки слева: подпись, значение, цвет'));
          s1.append(listEd(e, k, [['n', 'text', '1fr', 'HH'], ['v', 'num', '64px'], ['c', 'color', '64px']], () => ({ n: 'H', v: 80, c: CL.text2 }), 'отметка')); return;
        case 'map': s1.append(listEd(e, k, [['v', 'num', '56px'], ['tx', 'text', '1fr']], () => ({ v: (e.map || []).length, tx: '' }), 'значение')); return;
        case 'items': s1.append(h('div', { style: 'font-size:12px;color:var(--fg2);margin-top:6px' }, 'Бит → текст сообщения, класс (A авария, W предупр., E событие), инверсия'));
          s1.append(listEd(e, k, [['tag', 'tag', '1.2fr'], ['tx', 'text', '1fr', 'текст'], ['c', 'sel', '48px', [['A', 'A'], ['W', 'W'], ['E', 'E']]], ['inv', 'bool', '24px', '']], () => ({ tag: '', tx: '', c: 'A' }), 'сообщение')); return;
        case 'pens': s1.append(listEd(e, k, [['tag', 'tag', '1.3fr'], ['n', 'text', '1fr', 'подпись'], ['c', 'color', '40px']], () => ({ tag: '', n: '', c: [CL.ready, CL.run, CL.alarm, CL.move][(e.pens || []).length % 4] }), 'перо')); return;
      }
      s1.append(fieldRow(l, ctl, hint));
    });
    box.append(s1);
  }
  if (['button', 'hold', 'input', 'group'].indexOf(e.t) < 0) {
    const sa = h('div', { class: 'sec' }, h('h4', {}, 'При нажатии'));
    if ((e.t === 'valve' || e.t === 'pump' || e.t === 'cyclone' || e.t === 'pumpcard') && e.src !== 'tag' && !e.act) sa.append(h('div', { class: 'hint', style: 'color:var(--fg3);font-size:11.5px' }, 'По умолчанию — окно задвижки / насоса ГЦУ.'));
    sa.append(actEd(e, 'act'));
    box.append(sa);
  }
  if ((RULE_KEYS[e.t] || []).length || e.st) {
    const sr = h('div', { class: 'sec' }, h('h4', {}, 'Состояния (меняют вид по данным)'));
    sr.append(rulesEd(e));
    box.append(sr);
  }
  const sv = h('div', { class: 'sec' }, h('h4', {}, 'Видимость'));
  sv.append(condEd(e, 'vis', 'виден всегда'));
  box.append(sv);
  const sd = h('div', { class: 'sec' }, h('div', { class: 'btnrow' }, h('button', { onclick: dupSel }, 'Дублировать'), h('button', { onclick: () => order('front') }, 'Вперёд'), h('button', { onclick: () => order('back') }, 'Назад'), h('button', { class: 'danger', onclick: delSel }, 'Удалить')));
  box.append(sd);
  updSelStatus();
}
function renderContInsp(box) {
  const c = curCont();
  if (cur.kind === 'pop') {
    box.append(h('div', { class: 'ih' }, h('h2', {}, 'Своё окно'), h('p', {}, 'Открывается кнопкой с действием «Открыть своё окно»')));
    const s = h('div', { class: 'sec' }, h('h4', {}, 'Свойства окна'));
    s.append(fieldRow('Имя', textIn(c, 'name', { empty: false })));
    s.append(fieldRow('Заголовок', textIn(c, 'ti'), '# — номер, переданный кнопкой'));
    s.append(h('div', { class: 'grid4' }, h('label', {}, 'Ширина', numIn(c, 'w')), h('label', {}, 'Высота', numIn(c, 'h')), h('label', {}, 'X (пусто — центр)', numIn(c, 'x', { empty: true })), h('label', {}, 'Y', numIn(c, 'y', { empty: true }))));
    s.append(fieldRow('Крестик', boolIn(c, 'cl', true)));
    s.append(fieldRow('Фон', colorIn(c, 'bg')));
    s.append(h('p', { class: 'note' }, 'Верхние 44 px занимает заголовок. Координаты элементов — от левого верхнего угла окна. Фоном показан экран «' + (curScreen().name || '') + '».'));
    s.querySelectorAll('input').forEach(i => i.addEventListener('change', () => { layoutStage(); renderWindows(); }));
    box.append(s);
    return;
  }
  box.append(h('div', { class: 'ih' }, h('h2', {}, 'Окно панели'), h('p', {}, 'Один JS-объект EasyBuilder. Выделите элемент, чтобы изменить его.')));
  const s = h('div', { class: 'sec' }, h('h4', {}, 'Свойства окна'));
  s.append(fieldRow('Имя', textIn(c, 'name', { empty: false })));
  const pre = h('select', {}, h('option', { value: '' }, 'Размер объекта…'), h('option', { value: '0,48,1024,664' }, 'Рабочая область 1024×664 (Y48, под общим окном)'), h('option', { value: '0,0,1024,768' }, 'Весь экран 1024×768'), h('option', { value: '0,0,800,480' }, '800×480'), h('option', { value: '0,0,1280,800' }, '1280×800'));
  pre.addEventListener('change', () => { if (!pre.value) return; pushUndo(); const v = pre.value.split(',').map(Number); c.ox = v[0]; c.oy = v[1]; c.w = v[2]; c.h = v[3]; refreshAll(false); });
  s.append(pre);
  s.append(h('div', { class: 'grid4', style: 'margin-top:6px' }, h('label', {}, 'X объекта', numIn(c, 'ox')), h('label', {}, 'Y объекта', numIn(c, 'oy')), h('label', {}, 'Ширина', numIn(c, 'w')), h('label', {}, 'Высота', numIn(c, 'h'))));
  s.querySelectorAll('.grid4 input').forEach(i => i.addEventListener('change', () => refreshAll(false)));
  s.append(fieldRow('Фон', colorIn(c, 'bg')));
  box.append(s);
  const s2 = h('div', { class: 'sec' }, h('h4', {}, 'Служебное'));
  const pt = (k, l) => {
    const on = !!c[k];
    const cb = h('input', { type: 'checkbox', checked: on });
    cb.addEventListener('change', () => { pushUndo(); if (cb.checked) c[k] = k === 'diag' ? [(c.ox || 0) + 14, (c.oy || 0) + c.h - 36] : [(c.ox || 0) + c.w - 160, (c.oy || 0) + 12]; else delete c[k]; changed(true); });
    const row = h('div', { class: 'row' }, h('label', { class: 'chk' }, cb, l));
    if (on) { const xy = { x: c[k][0], y: c[k][1] }; const px = numIn(xy, 'x'), py = numIn(xy, 'y'); [px, py].forEach(i => i.addEventListener('input', () => { c[k] = [+xy.x, +xy.y]; })); row.append(h('div', { class: 'grid4', style: 'grid-template-columns:1fr 1fr' }, px, py)); }
    else row.append(h('span'));
    return row;
  };
  s2.append(pt('diag', 'Кнопка «Диагностика»'));
  s2.append(pt('demoChip', 'Плашка «ДЕМО-РЕЖИМ»'));
  s2.append(fieldRow('Без полосы связи', boolIn(c, 'noCommBar'), 'Не показывать красную полосу «НЕТ СВЯЗИ» внизу (если есть строка аварий ГЦУ)'));
  s2.append(fieldRow('Демо-режим', boolIn(c, 'demo'), 'В конфигурацию пойдёт "demo": true — окно без ПЛК, данные имитируются'));
  s2.append(fieldRow('Пароль инженера', textIn(c, 'pin', { ph: 'нет' }), 'Для полей и кнопок с отметкой «пароль»'));
  s2.append(fieldRow('Адрес LW-9050', textIn(c, 'winAddr', { ph: 'Address|… из EasyBuilder' }), 'Только для действия «Перейти в базовое окно»: в «Шаблон…» добавьте Адрес Local HMI LW-9050 и скопируйте сюда его строку'));
  box.append(s2);
  const r = exportScreen(proj, c.id, null);
  const s3 = h('div', { class: 'sec' }, h('h4', {}, 'Сводка'));
  s3.append(h('div', { style: 'font-size:12px;color:var(--fg2)' }, 'Элементов: ' + countEls(c.els) + ' · опросов ПЛК: ' + r.polls.length + ' · тегов: ' + Object.keys(r.tags).length + (r.gcu ? ' · данные ГЦУ (DB100/101)' : '')));
  r.warn.slice(0, 6).forEach(w => s3.append(h('div', { class: 'note warn' }, w)));
  box.append(s3);
}
function countEls(l) { let n = 0; walkEls(l, () => n++); return n; }

// ---------------------------------------------------------------- выбор тега
function tagBrowser(onPick, write) {
  const q = h('input', { type: 'search', placeholder: 'Поиск по имени, комментарию, адресу…', style: 'width:100%', id: 'tbq' });
  const list = h('div', { class: 'scroll', style: 'max-height:60vh' });
  const idx = tagIndex();
  const rows = [];
  proj.dbs.forEach(db => db.fields.forEach(f => rows.push({ n: tagName(db, f), g: db.name + ' (DB' + db.num + ')', t: TYPES[f.t][1], a: addrText(db, f), d: f.cm || '', w: !!f.wr })));
  GCU_TAGS.forEach(t => rows.push({ n: t.n, g: 'ГЦУ — встроенные данные', t: t.t, a: '', d: t.d, w: /^gcu(set|spd):/.test(t.n) }));
  const draw = () => {
    const s = q.value.trim().toLowerCase();
    list.innerHTML = '';
    const tbl = h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, h('th', {}, 'Тег'), h('th', {}, 'Тип'), h('th', {}, 'Адрес'), h('th', {}, 'Комментарий'), h('th', {}, ''))));
    const tb = h('tbody');
    let g = null, n = 0;
    rows.forEach(r => {
      if (s && (r.n + ' ' + r.d + ' ' + r.a).toLowerCase().indexOf(s) < 0) return;
      if (write && !r.w) return;
      if (n > 600) return;
      if (r.g !== g) { g = r.g; tb.append(h('tr', {}, h('td', { colspan: 5, style: 'font-weight:600;background:var(--chrome2)' }, g))); }
      n++;
      tb.append(h('tr', { style: 'cursor:pointer', onclick: () => { closeModal(); onPick(r.n); } }, h('td', { class: 'mono' }, r.n), h('td', {}, r.t), h('td', { class: 'mono' }, r.a), h('td', {}, r.d), h('td', {}, r.w ? h('span', { class: 'chip w' }, 'запись') : '')));
    });
    tbl.append(tb); list.append(tbl);
    if (!n) list.append(h('p', { class: 'note' }, write ? 'Нет тегов с признаком «Запись». Отметьте его в «Данные ПЛК».' : 'Ничего не найдено.'));
  };
  q.addEventListener('input', draw);
  openModal('Выбор тега' + (write ? ' для записи' : ''), [q, h('div', { style: 'height:8px' }), list, h('p', { class: 'note' }, 'Нет нужного тега? Добавьте блок данных в «Данные ПЛК» (можно вставить исходник DB из TIA). Шаблон с # (например MY_DB.Motor[#].Run) — для своих окон с номером.')]);
  draw(); setTimeout(() => q.focus(), 30);
}

// ---------------------------------------------------------------- данные ПЛК
let dataSel = null, dataFilter = '';
function openData() {
  if (!dataSel || !proj.dbs.find(d => d.id === dataSel)) dataSel = proj.dbs[0] ? proj.dbs[0].id : null;
  openModal('Данные ПЛК — блоки данных, теги, опросы', h('div', { id: 'dataBody' }));
  renderData();
}
function renderData() {
  const body = $('#dataBody'); if (!body) return;
  body.innerHTML = '';
  const left = h('div');
  left.append(h('div', { class: 'secttl' }, 'Блоки данных (DB)'));
  const l = h('div', { class: 'list' });
  proj.dbs.forEach(db => l.append(h('div', { class: 'li' + (db.id === dataSel ? ' on' : ''), onclick: () => { dataSel = db.id; renderData(); } }, h('span', { class: 'nm' }, db.name), h('span', { class: 'ty' }, db.raw ? 'адрес' : 'DB' + db.num), h('span', { class: 'ty' }, db.fields.length))));
  if (!proj.dbs.length) l.append(h('p', { class: 'note' }, 'Блоков нет. Добавьте DB или импортируйте.'));
  left.append(l);
  left.append(h('div', { class: 'btnrow' }, h('button', { onclick: addDb }, '+ DB'), h('button', { class: 'accent2', onclick: openImport }, 'Импорт…')));
  left.append(h('div', { class: 'secttl' }, 'Связь с ПЛК'));
  const c = proj.conn;
  const cs = h('div');
  cs.append(fieldRow('Устройство', textIn(c, 'dev', { empty: false }), 'Имя устройства в EasyBuilder (Системные параметры). Латиницей.'));
  cs.append(fieldRow('Слов за запрос', numIn(c, 'maxWords'), 'Не больше «Макс. размер команды чтения» драйвера (обычно 100)'));
  cs.append(fieldRow('Старший байт первым', boolIn(c, 'hiFirst', true), 'Если биты «съехали» — снимите'));
  cs.append(fieldRow('Real: слова наоборот', boolIn(c, 'realSwap'), 'Если Real показывает мусор — отметьте'));
  cs.append(fieldRow('Шрифт', textIn(c, 'font', { empty: false })));
  cs.append(fieldRow('Жирный', boolIn(c, 'bold', true)));
  cs.querySelectorAll('input').forEach(i => i.addEventListener('change', () => { autosave(); rtSync(true); }));
  left.append(cs);
  const right = h('div', { style: 'min-width:0' });
  const db = proj.dbs.find(d => d.id === dataSel);
  if (db) {
    const top = h('div', { style: 'display:grid;grid-template-columns:1.4fr .7fr .8fr auto;gap:8px;align-items:end' });
    const nm = textIn(db, 'name', { empty: false });
    let oldName = db.name;
    nm.addEventListener('change', () => { const v = nm.value.trim().replace(/[^\wА-Яа-яЁё]/g, '_') || 'DB'; db.name = v; nm.value = v; const n = renameTagsDb(oldName, v); oldName = v; if (n) toast('Обновлены ссылки на теги: ' + n); refreshDatalist(); renderData(); rtSync(true); });
    top.append(h('label', {}, 'Имя (как в TIA)', nm), h('label', {}, 'Номер DB', numIn(db, 'num')), h('label', {}, 'Опрос, мс', numIn(db, 'ms')),
      h('div', { class: 'btnrow', style: 'margin:0' }, h('button', { class: 'danger', onclick: () => delDb(db) }, 'Удалить DB')));
    right.append(top);
    top.querySelectorAll('input').forEach(i => i.addEventListener('change', () => { refreshDatalist(); rtSync(true); }));
    const sz = dbSize(db), ov = overlaps(db);
    right.append(h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:8px 0' },
      h('span', { class: 'mono', style: 'color:var(--fg2)' }, 'Полей: ' + db.fields.length + ' · размер ' + sz + ' байт (' + Math.ceil(sz / 2) + ' слов)'),
      h('input', { type: 'search', placeholder: 'фильтр…', value: dataFilter, style: 'width:180px', oninput: ev => { dataFilter = ev.target.value; drawFields(); } }),
      h('button', { onclick: () => { pushUndo(); db.fields.push({ n: 'Field' + (db.fields.length + 1), t: 'int', o: 0, cm: '' }); autoOffsets(db.fields); renderData(); refreshDatalist(); } }, '+ поле'),
      h('button', { title: 'Посчитать смещения по порядку полей, как TIA в неоптимизированном DB', onclick: async () => { if (await ask('Пересчитать смещения?', 'Смещения всех полей будут заданы по порядку, как в TIA (Bool упаковываются в байты, Int/Real — с чётного байта). Ручные смещения пропадут.', 'Пересчитать')) { pushUndo(); autoOffsets(db.fields); renderData(); rtSync(true); } } }, 'Смещения по порядку'),
      h('label', { class: 'chk' }, h('input', { type: 'checkbox', checked: !!db.raw, onchange: ev => { pushUndo(); if (ev.target.checked) db.raw = 'Address|'; else delete db.raw; renderData(); } }), 'адрес вручную')));
    if (db.raw !== undefined) right.append(fieldRow('Адрес из EasyBuilder', textIn(db, 'raw', { empty: false, ph: 'Address|…' }), 'Для областей M, I, Q или другого драйвера: в «Шаблон…» JS-объекта выберите Адрес начала (смещение 0) и скопируйте строку сюда. Запись в такие теги недоступна.'));
    if (ov.length) right.append(h('div', { class: 'note bad' }, 'Поля перекрываются: ' + ov.slice(0, 5).join('; ') + (ov.length > 5 ? '…' : '')));
    if (db.fields.some(f => TYPES[f.t][0] > 1 && (f.o & 1))) right.append(h('div', { class: 'note bad' }, 'Есть Int/Real с нечётного байта — в неоптимизированном DB так не бывает. Проверьте смещения.'));
    const wrap = h('div', { class: 'scroll', id: 'fwrap' });
    right.append(wrap);
    const drawFields = () => {
      wrap.innerHTML = '';
      const tbl = h('table', { class: 'tbl' });
      tbl.append(h('thead', {}, h('tr', {}, ['Имя поля', 'Тип', 'Байт', 'Бит', 'Адрес', 'Запись', 'Демо', 'Имитация', 'Масштаб: сырое мин/макс → инж. мин/макс', 'Комментарий', ''].map(t => h('th', {}, t)))));
      const tb = h('tbody');
      const fq = dataFilter.trim().toLowerCase();
      db.fields.forEach((f, i) => {
        if (fq && (f.n + ' ' + (f.cm || '')).toLowerCase().indexOf(fq) < 0) return;
        if (tb.childElementCount > 800) return;
        const nameIn = h('input', { type: 'text', value: f.n, style: 'min-width:150px', class: 'mono' });
        nameIn.addEventListener('change', () => { const old = tagName(db, f); pushUndo(); f.n = nameIn.value.trim() || f.n; const n = renameRefs(old, tagName(db, f)); if (n) toast('Обновлены ссылки: ' + n); refreshDatalist(); rtSync(true); });
        const ty = h('select', {}, Object.keys(TYPES).map(t => h('option', { value: t }, TYPES[t][1]))); ty.value = f.t;
        ty.addEventListener('change', () => { pushUndo(); f.t = ty.value; if (f.t !== 'bool') delete f.b; else f.b = f.b || 0; drawFields(); rtSync(true); refreshDatalist(); });
        const o = h('input', { type: 'number', min: 0, value: f.o, class: 'num', style: 'width:64px' }); o.addEventListener('change', () => { pushUndo(); f.o = Math.max(0, +o.value | 0); drawFields(); rtSync(true); });
        const b = f.t === 'bool' ? h('input', { type: 'number', min: 0, max: 7, value: f.b || 0, class: 'num', style: 'width:42px' }) : h('span');
        if (f.t === 'bool') b.addEventListener('change', () => { pushUndo(); f.b = Math.max(0, Math.min(7, +b.value | 0)); drawFields(); rtSync(true); });
        const wr = h('input', { type: 'checkbox', checked: !!f.wr }); wr.addEventListener('change', () => { pushUndo(); f.wr = wr.checked; rtSync(true); });
        const d = h('input', { type: 'number', step: 'any', value: f.d === undefined ? '' : f.d, class: 'num', style: 'width:64px', title: 'Значение в демо-режиме и в «Просмотре»' });
        d.addEventListener('change', () => { if (d.value === '') delete f.d; else f.d = +d.value; memSet(db, f, +d.value || 0); autosave(); });
        const ds = h('select', { title: 'Демо: как меняется значение' }, [['', '—'], ['sin', 'волна'], ['blink', 'мигание'], ['ramp', 'пила']].map(x => h('option', { value: x[0] }, x[1]))); ds.value = f.ds || '';
        ds.addEventListener('change', () => { if (ds.value) f.ds = ds.value; else delete f.ds; autosave(); });
        const sc = f.sc || ['', '', '', ''];
        const scIn = [0, 1, 2, 3].map(k => { const x = h('input', { type: 'number', step: 'any', value: sc[k] === undefined || sc[k] === null ? '' : sc[k], class: 'num', style: 'width:58px', disabled: f.t === 'bool' }); x.addEventListener('change', () => { const a = f.sc || ['', '', '', '']; a[k] = x.value === '' ? '' : +x.value; if (a.every(v => v === '')) delete f.sc; else f.sc = a; autosave(); rtSync(true); }); return x; });
        const cm = h('input', { type: 'text', value: f.cm || '', style: 'min-width:180px' }); cm.addEventListener('change', () => { f.cm = cm.value; autosave(); refreshDatalist(); });
        tb.append(h('tr', {}, h('td', {}, nameIn), h('td', {}, ty), h('td', {}, o), h('td', {}, b), h('td', { class: 'mono', style: 'white-space:nowrap;color:var(--fg2)' }, addrText(db, f)),
          h('td', { style: 'text-align:center' }, wr), h('td', {}, d), h('td', {}, ds), h('td', {}, h('div', { style: 'display:flex;gap:2px' }, scIn)), h('td', {}, cm),
          h('td', {}, h('button', { class: 'mini', title: 'Удалить поле', onclick: () => { pushUndo(); db.fields.splice(i, 1); drawFields(); refreshDatalist(); rtSync(true); } }, '×'))));
      });
      tbl.append(tb); wrap.append(tbl);
    };
    drawFields();
  } else right.append(h('p', { class: 'note' }, 'Выберите блок данных слева или импортируйте исходник DB из TIA Portal.'));
  // план опросов текущего окна
  const scr = curScreen(), r = exportScreen(proj, scr.id, null);
  const pl = h('div', { style: 'margin-top:10px' }, h('div', { class: 'secttl' }, 'Опросы окна «' + (scr.name || '') + '» (считаются сами по использованным тегам)'));
  if (!r.polls.length) pl.append(h('p', { class: 'note' }, r.gcu ? 'Своих опросов нет — окно использует только данные ГЦУ (DB100/DB101 опрашивает ядро).' : 'Окно пока не использует теги ПЛК.'));
  else {
    const t = h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Ключ в конфигурации', 'Область', 'Слов', 'Период', 'Тегов'].map(x => h('th', {}, x)))));
    const tb = h('tbody');
    r.polls.forEach(p => tb.append(h('tr', {}, h('td', { class: 'mono' }, p.k), h('td', { class: 'mono' }, p.d), h('td', {}, p.n), h('td', {}, p.ms + ' мс'), h('td', {}, Object.values(r.tags).filter(x => x.p === p.k).length))));
    t.append(tb); pl.append(t);
  }
  r.warn.forEach(w => pl.append(h('div', { class: 'note warn' }, w)));
  right.append(pl);
  body.append(h('div', { class: 'cols' }, left, right));
}
function renameTagsDb(oldName, newName) {
  let n = 0;
  if (oldName === newName) return 0;
  const fix = list => walkObj(list, (k, v, o) => { if (TAG_KEYS[k] && typeof v === 'string' && v.indexOf(oldName + '.') === 0) { o[k] = newName + v.slice(oldName.length); n++; } });
  proj.screens.forEach(s => fix(s.els)); proj.pops.forEach(p => fix(p.els));
  autosave();
  return n;
}
function addDb() {
  pushUndo();
  const used = proj.dbs.map(d => d.num);
  let num = 200; while (used.indexOf(num) >= 0) num++;
  const db = { id: 'db' + uid().slice(1), name: 'MY_DB' + (proj.dbs.length + 1), num: num, ms: 500, fields: [{ n: 'Value', t: 'real', o: 0, cm: 'пример' }, { n: 'Cmd', t: 'int', o: 4, cm: 'команда', wr: true }, { n: 'Run', t: 'bool', o: 6, b: 0, cm: 'работает' }] };
  proj.dbs.push(db); dataSel = db.id; renderData(); refreshDatalist(); autosave();
}
async function delDb(db) {
  if (!(await ask('Удалить блок данных?', '«' + db.name + '» и все его поля. Элементы, привязанные к ним, останутся без данных.', 'Удалить'))) { openData(); return; }
  pushUndo(); proj.dbs.splice(proj.dbs.indexOf(db), 1); dataSel = null; refreshDatalist(); rtSync(true); openData();
}
function openImport() {
  const ta = h('textarea', { class: 'code', id: 'impText', placeholder: 'Вставьте сюда:\n• исходник DB из TIA (ПКМ по блоку → Generate source from blocks → открыть .db/.scl блокнотом → скопировать всё). Если DB использует свои типы (UDT) — вставьте и их описание TYPE … END_TYPE;\n• или таблицу из Excel: Имя ⇥ Тип ⇥ Смещение ⇥ Комментарий;\n• или файл тегов EasyBuilder (.csv).', style: 'height:240px' });
  const file = h('input', { type: 'file', accept: '.scl,.db,.udt,.csv,.txt,.awl' });
  file.addEventListener('change', () => { const f = file.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { ta.value = rd.result; preview(); }; rd.readAsText(f, 'utf-8'); });
  const out = h('div');
  let parsed = null;
  const preview = () => {
    out.innerHTML = '';
    const t = ta.value;
    parsed = null;
    if (!t.trim()) return;
    if (/DATA_BLOCK/i.test(t) || /^\s*TYPE\s+"/im.test(t)) {
      const r = sclToDbs(t);
      parsed = { kind: 'scl', dbs: r.dbs.map(d => ({ name: d.name, num: guessNum(d.name), fields: d.fields, opt: d.opt })) };
      parsed.dbs.forEach(d => { d.def = d.fields.length > 0 && d.opt !== true && (r.dbs.length === 1 || proj.dbs.some(x => x.name === d.name)); });
      if (r.dbs.length > 1) out.append(h('div', { class: 'note' }, 'В тексте ' + r.dbs.length + ' блоков. Отмечены те, что уже есть в проекте (или единственный). Отметьте нужные и укажите номер DB.'));
      r.errors.forEach(e => out.append(h('div', { class: 'note warn' }, e)));
    } else if (/,(DBn|DBDn|DBnBit),/.test(t)) {
      const r = ebCsvToDbs(t);
      parsed = { kind: 'csv', dbs: r.dbs.map(d => { const ex = proj.dbs.find(x => x.num === d.num && !x.raw); return { name: ex ? ex.name : 'DB' + d.num, num: d.num, fields: d.fields }; }) };
      r.errors.slice(0, 8).forEach(e => out.append(h('div', { class: 'note warn' }, e)));
    } else {
      const r = tableToFields(t);
      parsed = { kind: 'tbl', dbs: [{ name: 'IMPORT_DB', num: 1, fields: r.fields }] };
      r.errors.slice(0, 8).forEach(e => out.append(h('div', { class: 'note warn' }, e)));
    }
    if (!parsed.dbs.length) { out.append(h('div', { class: 'note bad' }, 'Ничего не найдено.')); return; }
    const tbl = h('table', { class: 'tbl' }, h('thead', {}, h('tr', {}, ['Импорт', 'Имя DB', 'Номер DB', 'Полей', 'Размер, байт', 'Если DB с таким номером уже есть'].map(x => h('th', {}, x)))));
    const tb = h('tbody');
    parsed.dbs.forEach(d => {
      d.on = d.def !== false; d.mode = 'replace';
      const nm = h('input', { type: 'text', value: d.name }); nm.addEventListener('input', () => { d.name = nm.value.trim(); });
      const nu = h('input', { type: 'number', value: d.num, class: 'num', style: 'width:80px' }); nu.addEventListener('input', () => { d.num = +nu.value; });
      const md = h('select', {}, h('option', { value: 'replace' }, 'заменить поля (по имени или номеру)'), h('option', { value: 'merge' }, 'добавить новые поля'), h('option', { value: 'new' }, 'создать ещё один')); md.addEventListener('change', () => { d.mode = md.value; });
      const on = h('input', { type: 'checkbox', checked: d.on }); on.addEventListener('change', () => { d.on = on.checked; });
      tb.append(h('tr', {}, h('td', {}, on), h('td', {}, nm), h('td', {}, nu), h('td', {}, d.fields.length), h('td', {}, dbSize({ fields: d.fields })), h('td', {}, md)));
    });
    tbl.append(tb); out.append(tbl);
    out.append(h('p', { class: 'note' }, parsed.kind === 'scl' ? 'Смещения посчитаны как в TIA для неоптимизированного DB. Сверьте 2–3 поля со столбцом Offset в TIA. Номер DB укажите как в свойствах блока (General → Number).' : 'Проверьте номера DB.'));
  };
  ta.addEventListener('input', () => { clearTimeout(ta._t); ta._t = setTimeout(preview, 300); });
  const go = h('button', { class: 'accent', onclick: () => {
    if (!parsed) { toast('Вставьте текст'); return; }
    pushUndo();
    let n = 0;
    parsed.dbs.filter(d => d.on && d.fields.length).forEach(d => {
      d.fields.forEach(f => { if (f.wr === undefined) f.wr = false; });
      const ex = proj.dbs.find(x => x.name === d.name && !x.raw) || proj.dbs.find(x => x.num === d.num && !x.raw);
      if (ex && d.mode === 'replace') { ex.fields = d.fields; if (d.name && d.name !== ex.name) { renameTagsDb(ex.name, d.name); ex.name = d.name; } dataSel = ex.id; }
      else if (ex && d.mode === 'merge') { const have = {}; ex.fields.forEach(f => have[f.n] = 1); d.fields.forEach(f => { if (!have[f.n]) ex.fields.push(f); }); dataSel = ex.id; }
      else { const db = { id: 'db' + uid().slice(1), name: uniqName(d.name || 'DB' + d.num), num: d.num, ms: 500, fields: d.fields }; proj.dbs.push(db); dataSel = db.id; }
      n++;
    });
    refreshDatalist(); rtSync(true); autosave();
    toast('Импортировано блоков: ' + n);
    openData();
  } }, 'Импортировать');
  openModal('Импорт блоков данных', [h('div', { style: 'display:flex;gap:10px;align-items:center;margin-bottom:6px;flex-wrap:wrap' }, h('span', {}, 'Файл:'), file, h('button', { onclick: openData }, '← К данным')), ta, out, h('div', { class: 'btnrow', style: 'justify-content:flex-end' }, go)]);
}
function guessNum(name) { const ex = proj.dbs.find(d => d.name === name); if (ex) return ex.num; const m = String(name).match(/(\d+)$/); return m ? +m[1] : 1; }
function uniqName(n) { let s = n.replace(/[^\wА-Яа-яЁё]/g, '_'), k = 2; while (proj.dbs.some(d => d.name === s)) s = n + '_' + (k++); return s; }

// ---------------------------------------------------------------- режим просмотра: имитатор ПЛК
function setMode(m) {
  mode = m;
  $('#mEdit').classList.toggle('on', m === 'edit'); $('#mRun').classList.toggle('on', m === 'run');
  $('#cvOv').style.cursor = m === 'run' ? 'pointer' : 'default';
  if (m === 'run' && cur.kind === 'pop') { cur = { kind: 'screen', id: curScreen().id }; }
  sel = m === 'run' ? [] : sel;
  if (RT.api) RT.api.closeAll();
  refreshAll(true);
}
let simT = 0;
function renderSim() {
  const box = $('#insp');
  box.innerHTML = '';
  box.append(h('div', { class: 'ih' }, h('h2', {}, 'Просмотр'), h('p', {}, 'Окно работает как на панели: нажимайте кнопки, открывайте окна. Значения ниже — это память имитатора ПЛК, их можно менять.')));
  const r = exportScreen(proj, curScreen().id, null, { allPops: true });
  const idx = tagIndex();
  const s = h('div', { class: 'sec' }, h('h4', {}, 'Теги окна (имитатор ПЛК)'));
  const names = Object.keys(r.tags);
  if (!names.length) s.append(h('p', { class: 'note' }, r.gcu ? 'Окно использует данные ГЦУ — они имитируются демо-режимом ядра (как "demo": true на панели).' : 'Окно не использует теги ПЛК.'));
  const tbl = h('table', { class: 'tbl' }); const tb = h('tbody');
  names.forEach(n => {
    const t = idx[n]; if (!t) return;
    let ctl;
    if (t.f.t === 'bool') { ctl = h('input', { type: 'checkbox', 'data-sim': n }); ctl.addEventListener('change', () => { memSet(t.db, t.f, ctl.checked ? 1 : 0); }); }
    else { ctl = h('input', { type: 'number', step: 'any', class: 'num', style: 'width:96px', 'data-sim': n }); ctl.addEventListener('change', () => { memSet(t.db, t.f, +ctl.value || 0); }); }
    tb.append(h('tr', {}, h('td', { class: 'mono', style: 'font-size:11.5px;word-break:break-all' }, n, h('div', { style: 'color:var(--fg3);font-family:var(--f-ui)' }, addrText(t.db, t.f) + (t.f.wr ? ' · запись' : ''))), h('td', {}, ctl)));
  });
  tbl.append(tb); s.append(tbl);
  box.append(s);
  const s2 = h('div', { class: 'sec' }, h('h4', {}, 'Что панель записала в ПЛК'), h('div', { id: 'simLog', class: 'mono', style: 'font-size:11px;white-space:pre-wrap;color:var(--fg2);max-height:200px;overflow:auto' }));
  s2.append(h('div', { class: 'btnrow' }, h('button', { onclick: () => { memInitDemo(true); toast('Память имитатора — демо-значения'); } }, 'Сбросить к демо-значениям')));
  box.append(s2);
  renderSimLog();
  clearInterval(simT);
  const upd = () => {
    if (mode !== 'run') { clearInterval(simT); return; }
    $$('#insp [data-sim]').forEach(i => {
      if (document.activeElement === i) return;
      const t = idx[i.getAttribute('data-sim')]; if (!t) return;
      const v = memGet(t.db, t.f);
      if (i.type === 'checkbox') i.checked = !!v; else i.value = t.f.t === 'real' ? r1(v * 10) / 10 : v;
    });
  };
  upd(); simT = setInterval(upd, 400);
}
function renderSimLog() { const l = $('#simLog'); if (l) l.textContent = simWrites.length ? simWrites.join('\n') : 'Пока ничего. Нажмите кнопку или введите значение на холсте.'; }

// ---------------------------------------------------------------- экспорт
function openExport() {
  const pick = h('select', { id: 'exScr' }, proj.screens.map(s => h('option', { value: s.id }, s.name || s.id)));
  pick.value = curScreen().id;
  const body = h('div');
  const draw = () => {
    body.innerHTML = '';
    const scr = proj.screens.find(s => s.id === pick.value);
    let r;
    try { r = exportScreen(proj, scr.id, Object.assign({ ver: '@@VERSION@@' }, ENGINE)); } catch (e) { body.append(h('div', { class: 'note bad' }, 'Ошибка: ' + e.message)); return; }
    const kb = Math.round(r.size / 102.4) / 10, pct = Math.min(100, r.size / ENGINE_LIMIT * 100);
    body.append(h('div', { style: 'display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px' },
      h('div', {}, h('div', { class: 'secttl' }, 'Размер кода: ' + kb + ' КБ из ~100 КБ'), h('div', { class: 'sizebar' }, h('i', { class: pct > 98 ? 'bad' : pct > 90 ? 'warn' : '', style: 'width:' + pct + '%' })),
        h('div', { style: 'font-size:12px;color:var(--fg2)' }, 'Объект: X' + (scr.ox || 0) + ' Y' + (scr.oy || 0) + ' · ' + scr.w + '×' + scr.h + ' · опросов: ' + r.polls.length + ' · адресов записи: ' + Object.keys(r.cfg).filter(k => /^w/.test(k)).length + (r.gcu ? ' · данные ГЦУ: да' : '') + (r.pops.length ? ' · своих окон: ' + r.pops.length : ''))),
      h('div', {}, r.warn.length ? r.warn.map(w => h('div', { class: 'note warn' }, w)) : h('div', { class: 'note' }, 'Проверка пройдена: все теги найдены.'), r.info.map(w => h('div', { class: 'note' }, w)))));
    const fname = (scr.name || scr.id).replace(/[^\wА-Яа-яЁё]+/g, '_');
    const codeTa = h('textarea', { class: 'code', readonly: true, id: 'exCode' }); codeTa.value = r.code;
    const cfgTa = h('textarea', { class: 'code', readonly: true, id: 'exCfg', style: 'height:150px' }); cfgTa.value = r.config;
    body.append(h('div', { style: 'display:grid;grid-template-columns:minmax(0,1.3fr) minmax(0,1fr);gap:16px;margin-top:10px' },
      h('div', {}, h('div', { class: 'secttl' }, '1. Код → вкладка «Исходный код»', h('span', { class: 'btnrow', style: 'margin:0' }, h('button', { class: 'accent', onclick: () => copyText(codeTa, 'Код скопирован') }, 'Копировать код'), h('button', { onclick: () => download(fname + '.js', r.code) }, 'Скачать .js'))), codeTa),
      h('div', {}, h('div', { class: 'secttl' }, '2. Конфигурация → «Шаблон…»', h('span', { class: 'btnrow', style: 'margin:0' }, h('button', { class: 'accent', onclick: () => copyText(cfgTa, 'Конфигурация скопирована') }, 'Копировать'), h('button', { onclick: () => download(fname + '.config.json', r.config) }, 'Скачать .json'))), cfgTa)));
    body.append(h('div', { class: 'secttl', style: 'margin-top:12px' }, 'Как вставить в EasyBuilder Pro'));
    body.append(h('ol', { class: 'steps' },
      h('li', {}, 'Откройте нужное окно. Объекты → JavaScript → ', h('b', {}, 'JS-объект'), '. Профиль: X ' + (scr.ox || 0) + ', Y ' + (scr.oy || 0) + ', ширина ' + scr.w + ', высота ' + scr.h + '.'),
      h('li', {}, 'Вкладка «Исходный код»: удалите всё, вставьте код (кнопка «Копировать код») → «Компиляция». Ошибок быть не должно.'),
      h('li', {}, 'Вкладка «Конфигурирование» → «Шаблон…» → удалите всё → вставьте конфигурацию → OK. Записей после вставки должно быть ' + Object.keys(r.cfg).length + '.'),
      h('li', {}, 'Проверка без ПЛК: в «Шаблон…» поменяйте "demo": false на true — окно покажет демо-значения (столбец «Демо» в данных ПЛК). Потом верните false.'),
      r.polls.length ? h('li', {}, 'В ПЛК: DB ' + Array.from(new Set(r.polls.map(p => p.d.replace(/\..*/, '')))).join(', ') + ' — неоптимизированные (снимите «Optimized block access»), в CPU включён PUT/GET.') : null,
      h('li', {}, 'Поменяли окно в конструкторе — вставьте код заново. Конфигурацию — только если менялись теги или DB (конструктор подскажет: другое число записей).')));
  };
  pick.addEventListener('change', draw);
  openModal('Экспорт в панель', [h('div', { style: 'display:flex;gap:10px;align-items:center;margin-bottom:8px' }, h('b', {}, 'Окно:'), pick), body]);
  draw();
}
function copyText(ta, msg) {
  const done = () => toast(msg);
  try { navigator.clipboard.writeText(ta.value).then(done, () => { ta.focus(); ta.select(); toast('Текст выделен — нажмите Ctrl+C'); }); }
  catch (e) { ta.focus(); ta.select(); toast('Текст выделен — нажмите Ctrl+C'); }
}
function download(name, text) {
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast('Скачивание: ' + name + ' (если файл не появился — откройте конструктор как файл с диска или используйте «Копировать»)');
  } catch (e) { toast('Скачивание недоступно — используйте «Копировать»'); }
}

// ---------------------------------------------------------------- проект: файлы
function normalize(p) {
  p.v = 1; p.conn = Object.assign({ dev: 'Siemens S7-1200/S7-1500', hiFirst: true, realSwap: false, maxWords: 90, font: 'Arial', bold: true }, p.conn || {});
  p.dbs = p.dbs || []; p.screens = p.screens || []; p.pops = p.pops || [];
  if (!p.screens.length) p.screens.push({ id: 's1', name: 'Окно 1', w: 1024, h: 664, ox: 0, oy: 48, bg: CL.bg, els: [] });
  let mx = +p.nextId || 0;
  const scan = l => walkEls(l, e => { const n = +String(e.id || '').replace(/\D/g, ''); if (n > mx) mx = n; });
  p.screens.forEach(s => { s.els = s.els || []; scan(s.els); });
  p.pops.forEach(s => { s.els = s.els || []; scan(s.els); });
  p.dbs.forEach(d => { d.fields = d.fields || []; d.id = d.id || ('db' + (++mx)); });
  p.nextId = mx + 1;
  return p;
}
function loadProject(p, msg) {
  proj = normalize(p);
  cur = { kind: 'screen', id: proj.screens[0].id }; lastScreen = cur.id; sel = [];
  undoS.length = 0; redoS.length = 0; RT.mem = {};
  memInitDemo(true);
  refreshAll(false); autosave();
  if (msg) toast(msg);
}
async function newProject() {
  if (!(await ask('Новый проект?', 'Текущий проект в браузере будет заменён. Сохраните его в файл, если он нужен.', 'Создать'))) return;
  loadProject({ name: 'Новый проект', dbs: [{ id: 'db1', name: 'MY_DB', num: 200, ms: 500, fields: autoOffsets([{ n: 'Level', t: 'real', cm: 'уровень, %', d: 50, ds: 'sin', da: 20 }, { n: 'Run', t: 'bool', cm: 'работает', d: 1 }, { n: 'Cmd', t: 'int', cm: 'команда', wr: true }]) }],
    screens: [{ id: 's1', name: 'Окно 1', w: 1024, h: 664, ox: 0, oy: 48, bg: CL.bg, demoChip: [860, 60], els: [] }], pops: [] }, 'Новый проект. Добавьте блоки данных в «Данные ПЛК» и перетащите элементы.');
}
function saveProject() {
  const txt = JSON.stringify(proj, null, 1);
  const name = (proj.name || 'проект').replace(/[^\wА-Яа-яЁё]+/g, '_') + '.constructor.json';
  download(name, txt);
}
function saveDialog() {
  const ta = h('textarea', { class: 'code', readonly: true, style: 'height:260px' }); ta.value = JSON.stringify(proj, null, 1);
  openModal('Сохранить проект', [
    h('p', { class: 'note' }, 'Проект сохраняется в этом браузере сам. Чтобы перенести на другой компьютер или положить в репозиторий (hmi/constructor/projects/), сохраните файл.'),
    fieldRow('Имя проекта', textIn(proj, 'name', { empty: false })),
    h('div', { class: 'btnrow' }, h('button', { class: 'accent', onclick: saveProject }, 'Скачать файл проекта'), h('button', { onclick: () => copyText(ta, 'Проект скопирован — вставьте в блокнот и сохраните как .json') }, 'Копировать текст проекта')),
    ta]);
}
function openFile(f) {
  const rd = new FileReader();
  rd.onload = () => { try { const p = JSON.parse(rd.result); if (!p.screens) throw new Error('это не файл проекта конструктора'); loadProject(p, 'Открыт проект: ' + (p.name || f.name)); } catch (e) { toast('Не открылся: ' + e.message); } };
  rd.readAsText(f, 'utf-8');
}

// ---------------------------------------------------------------- окна-диалоги, сообщения
function openModal(title, content, narrow) {
  $('#mTitle').textContent = title;
  const b = $('#mBody'); b.innerHTML = '';
  (Array.isArray(content) ? content : [content]).forEach(c => c && b.append(c));
  $('#modal .mbox').classList.toggle('narrow', !!narrow);
  $('#modal').hidden = false;
}
function closeModal() { $('#modal').hidden = true; $('#mBody').innerHTML = ''; refreshDatalist(); if (mode === 'edit') renderInsp(); else renderSim(); }
function ask(title, text, ok) {
  return new Promise(res => {
    const yes = h('button', { class: 'accent', onclick: () => { $('#modal').hidden = true; res(true); } }, ok || 'Да');
    const no = h('button', { onclick: () => { $('#modal').hidden = true; res(false); } }, 'Отмена');
    openModal(title, [h('p', {}, text), h('div', { class: 'btnrow', style: 'justify-content:flex-end' }, no, yes)], true);
    setTimeout(() => yes.focus(), 20);
  });
}
let toastT = 0;
function toast(s) { const t = $('#toast'); t.textContent = s; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2800); }
function status(s) { $('#stMsg').textContent = s || ''; }
function checkStatus() {
  try { const r = exportScreen(proj, curScreen().id, null); status(r.warn.length ? '⚠ ' + r.warn[0] + (r.warn.length > 1 ? ' (+' + (r.warn.length - 1) + ')' : '') : ''); } catch (e) { status(e.message); }
}
function updButtons() {
  $('#bUndo').disabled = !undoS.length; $('#bRedo').disabled = !redoS.length;
  const n = sel.length, ed = mode === 'edit';
  ['#bCopy', '#bDup', '#bDel', '#bFront', '#bBack'].forEach(s => { $(s).disabled = !n || !ed; });
  $('#bGroup').disabled = n < 2 || !ed; $('#bUngroup').disabled = !selEls().some(e => e.t === 'group') || !ed;
  $('#bPaste').disabled = !ed;
}
function help() {
  openModal('Как пользоваться конструктором', [h('div', { style: 'columns:2 340px;column-gap:28px;font-size:13px' },
    h('h3', {}, 'Идея'), h('p', {}, 'Каждое окно конструктора — это один JS-объект EasyBuilder во всю рабочую область, как ваши окна 10–18. Конструктор сам пишет код: вы двигаете элементы мышкой и выбираете теги из списка.'),
    h('p', {}, 'Холст — это настоящий код панели, запущенный в браузере. Что видите здесь — то будет на панели (шрифт панели может немного отличаться).'),
    h('h3', {}, 'Порядок работы'),
    h('ol', { class: 'steps' }, h('li', {}, h('b', {}, 'Данные ПЛК'), ': добавьте DB. Проще всего — «Импорт…» исходника DB из TIA: смещения посчитаются сами. Отметьте «Запись» у полей, в которые панель пишет.'),
      h('li', {}, 'Перетащите элементы из палитры, справа выберите тег (поле с ⋯ — список всех тегов с комментариями).'),
      h('li', {}, h('b', {}, '▶ Просмотр'), ': нажимайте кнопки, меняйте значения тегов справа — проверка без ПЛК.'),
      h('li', {}, h('b', {}, 'Экспорт в панель'), ': скопируйте код и конфигурацию в JS-объект.')),
    h('h3', {}, 'Опросы ПЛК'), h('p', {}, 'Отдельно настраивать не нужно: конструктор сам собирает использованные теги каждого DB в непрерывные участки (не больше «Слов за запрос») и опрашивает их с периодом DB. Список — внизу окна «Данные ПЛК».'),
    h('p', {}, 'Запись бита: панель читает слово, меняет один бит и записывает слово обратно. Для команд надёжнее Int-код, который ПЛК обнуляет (как в DB100).'),
    h('h3', {}, 'Данные ГЦУ'), h('p', {}, 'Теги gcu:… — это DB100/DB101, которые уже разбирает ядро панели. Задвижки и насосы с данными «ГЦУ» по нажатию открывают готовые окна задвижки/насоса. gcuset:… — уставки DB101 (запись с проверкой диапазона ПЛК).'),
    h('h3', {}, 'Свои окна и #'), h('p', {}, 'Окна → «+ Своё окно». В тегах окна пишите # вместо номера: MY_DB.Motor[#].Run. Кнопка «Открыть своё окно» с номером 2 покажет мотор 2.'),
    h('h3', {}, 'Мышь и клавиши'),
    h('p', {}, h('span', { class: 'kbd' }, 'Shift'), ' + щелчок — добавить к выделению; рамка по пустому месту — выделить несколько. ', h('span', { class: 'kbd' }, 'Alt'), ' при перетаскивании — без привязки. ', h('span', { class: 'kbd' }, 'Shift'), ' — только по горизонтали/вертикали, при изменении размера — с сохранением пропорций.'),
    h('p', {}, h('span', { class: 'kbd' }, '←↑→↓'), ' — сдвиг на 1, с ', h('span', { class: 'kbd' }, 'Shift'), ' — на шаг сетки. ', h('span', { class: 'kbd' }, 'Ctrl+Z / Y'), ' отмена/повтор, ', h('span', { class: 'kbd' }, 'Ctrl+C / V / D'), ', ', h('span', { class: 'kbd' }, 'Del'), ', ', h('span', { class: 'kbd' }, 'Ctrl+G'), ' группа, ', h('span', { class: 'kbd' }, 'Ctrl+колесо'), ' масштаб.'),
    h('h3', {}, 'Где хранится проект'), h('p', {}, 'Автоматически — в этом браузере. Для переноса и истории — «Сохранить» (файл .json) и положите его в hmi/constructor/projects/ репозитория.'))]);
}

// ---------------------------------------------------------------- клавиатура
function initKeys() {
  window.addEventListener('keydown', ev => {
    if (!$('#modal').hidden) { if (ev.key === 'Escape') { closeModal(); } return; }
    const t = ev.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT');
    const ctrl = ev.ctrlKey || ev.metaKey, k = ev.key.toLowerCase();
    if (ctrl && k === 's') { ev.preventDefault(); saveDialog(); return; }
    if (typing) return;
    if (mode !== 'edit') return;
    if (ctrl && (k === 'z' || k === 'я')) { ev.preventDefault(); if (ev.shiftKey) redo(); else undo(); return; }
    if (ctrl && (k === 'y' || k === 'н')) { ev.preventDefault(); redo(); return; }
    if (ctrl && (k === 'c' || k === 'с')) { ev.preventDefault(); copySel(); return; }
    if (ctrl && (k === 'x' || k === 'ч')) { ev.preventDefault(); copySel(); delSel(); return; }
    if (ctrl && (k === 'v' || k === 'м')) { ev.preventDefault(); paste(); return; }
    if (ctrl && (k === 'd' || k === 'в')) { ev.preventDefault(); dupSel(); return; }
    if (ctrl && (k === 'a' || k === 'ф')) { ev.preventDefault(); sel = curEls().filter(e => !e._l && !e._h).map(e => e.id); refreshSel(); return; }
    if (ctrl && (k === 'g' || k === 'п')) { ev.preventDefault(); if (ev.shiftKey) ungroupSel(); else groupSel(); return; }
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); delSel(); return; }
    if (ev.key === 'Escape') { sel = []; refreshSel(); return; }
    const st = ev.shiftKey ? grid.size : 1;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); nudge(-st, 0); } if (ev.key === 'ArrowRight') { ev.preventDefault(); nudge(st, 0); }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); nudge(0, -st); } if (ev.key === 'ArrowDown') { ev.preventDefault(); nudge(0, st); }
  });
}

// ---------------------------------------------------------------- запуск
function init() {
  $('#bNew').onclick = newProject; $('#bOpen').onclick = () => $('#fOpen').click(); $('#fOpen').onchange = ev => { const f = ev.target.files[0]; if (f) openFile(f); ev.target.value = ''; };
  $('#bSave').onclick = saveDialog;
  $('#bExample').onclick = async () => { if (await ask('Загрузить пример?', 'Мнемосхема ГЦУ (перенос окна 10/16) и образец со своим DB. Текущий проект в браузере будет заменён.', 'Загрузить')) loadProject(JSON.parse(JSON.stringify(EXAMPLES.gcu)), 'Загружен пример: мнемосхема ГЦУ'); };
  $('#bUndo').onclick = undo; $('#bRedo').onclick = redo; $('#bCopy').onclick = copySel; $('#bPaste').onclick = paste; $('#bDup').onclick = dupSel; $('#bDel').onclick = delSel;
  $('#bGroup').onclick = groupSel; $('#bUngroup').onclick = ungroupSel; $('#bFront').onclick = () => order('front'); $('#bBack').onclick = () => order('back');
  $('#cGrid').onchange = ev => { grid.on = ev.target.checked; drawOv(); };
  $('#sGrid').onchange = ev => { grid.size = +ev.target.value; drawOv(); };
  $('#cSnap').onchange = ev => { grid.snap = ev.target.checked; };
  $('#sZoom').onchange = ev => { if (ev.target.value === 'fit') { zoomMode = 'fit'; layoutStage(); } else setZoom(+ev.target.value); };
  $('#mEdit').onclick = () => setMode('edit'); $('#mRun').onclick = () => setMode('run');
  $('#bData').onclick = openData; $('#bExport').onclick = openExport; $('#bHelp').onclick = help;
  $('#mClose').onclick = closeModal;
  $('#modal').addEventListener('mousedown', ev => { if (ev.target.id === 'modal') closeModal(); });
  $$('.tabs button').forEach(b => b.onclick = () => { leftTab = b.dataset.tab; $$('.tabs button').forEach(x => x.classList.toggle('on', x === b)); $$('.tabpane').forEach(p => { p.hidden = p.id !== 'tab-' + leftTab; }); renderLayers(); });
  $$('#alignbar button').forEach(b => b.onclick = () => align(b.dataset.al));
  document.addEventListener('mousedown', ev => { if (!ev.target.closest('#ctx')) hideCtx(); });
  initStage(); initKeys();
  let p = null;
  try { const s = localStorage.getItem(LS_KEY); if (s) p = JSON.parse(s); } catch (e) { }
  loadProject(p || JSON.parse(JSON.stringify(EXAMPLES.gcu)), p ? 'Восстановлен проект из браузера' : 'Открыт пример: мнемосхема ГЦУ. «Новый» — начать с чистого листа.');
}
init();
