// ================================================================ ЭКРАН: регуляторы и уставки (окно 13)
// config (дополнительно): pin — пароль инженера (String, пусто = без пароля); winAddr — LW-9050 для перехода в окно 17 (необязательно)
function screenInfo() { return { name: 'settings', demoChip: [480, 62] }; }
function screenInit() { }
function onDataUpdate() { }
function drawExtraPopup(p) { }

function panel(x, y, w, h, title, sub) {
  rrect(x, y, w, h, 4, C.panel, C.panelBorder, 1);
  text(title, x + 14, y + 24, 18, C.text, 'left', true);
  if (sub) { font(18, true); const tw = cv.measureText ? cv.measureText(title).width : title.length * 9; text(sub, x + 22 + tw, y + 25, 14, C.text2, 'left'); }
}
// поле уставки: подпись слева, значение справа; нажатие -> пароль (если задан) -> клавиатура -> запись в DB101
function field(id, label, x, y, w, def) {
  const nd = noData();
  const v = def.get();
  textFit(label, x, y + 17, w - 132, 15, C.text2, 'left');
  editBox(id, x + w - 126, y, 92, 34, nd ? '—' : fmt(v, def.dec), '', function () {
    withAccess(function () {
      keypad(def.title, v, def.min(), def.max(), def.dec, function (nv) {
        if (def.int) setI16(def.off, nv); else setReal(def.off, nv);
      });
    });
  });
  text(def.unit, x + w - 30, y + 18, 14, C.text2, 'left');
}
function toggle(id, x, y, w, h, label, sub, on, fn, dashedOn) {
  const pressed = ui.press === id;
  rrect(x, y, w, h, 4, on ? (dashedOn ? C.warnRow : C.ready) : (pressed ? C.btnPressed : C.btn), on ? (dashedOn ? C.move : C.blueDark) : C.btnBorder, on && dashedOn ? 2 : 1, on && dashedOn ? [5, 3] : null);
  text(label, x + w / 2, y + h / 2 - (sub ? 7 : 0), 16, on && !dashedOn ? C.white : C.text, 'center', true);
  if (sub) text(sub, x + w / 2, y + h / 2 + 12, 11, on ? (dashedOn ? '#8A6400' : C.white) : C.text2, 'center', on);
  hit(x, y, w, h, noData() ? function () { } : fn, id);
}

function drawScreen() {
  const st = S.set, nd = noData();
  text('Регуляторы и уставки', 16, 78, 22, C.text, 'left', true);
  accessButton(890, 62);
  if (cfg.winAddr) button('bIO', 650, 62, 150, 32, 'Входы / выходы →', { size: 14 }, function () { goWindow(17); });

  // ---- давление -> скорость
  panel(12, 104, 494, 196, 'Давление → скорость насоса', '· ПИ');
  field('f1', 'Уставка', 28, 144, 230, { get: function () { return st.pressSP; }, off: 0, dec: 2, unit: 'бар', title: 'Уставка давления, бар', min: function () { return 0.1; }, max: function () { return 2.5; } });
  field('f2', 'Kp', 28, 194, 230, { get: function () { return st.kp; }, off: 4, dec: 1, unit: '%/бар', title: 'Kp регулятора давления, %/бар', min: function () { return 0; }, max: function () { return 1000; } });
  field('f3', 'Ti', 28, 244, 230, { get: function () { return st.ti; }, off: 8, dec: 1, unit: 'с', title: 'Ti регулятора давления, с', min: function () { return 0; }, max: function () { return 3600; } });
  field('f4', 'Скор. мин.', 284, 194, 212, { get: function () { return st.spdMin; }, off: 12, dec: 0, unit: '%', title: 'Скорость насоса минимум, %', min: function () { return 0; }, max: function () { return 100; } });
  field('f5', 'Скор. макс.', 284, 144, 212, { get: function () { return st.spdMax; }, off: 16, dec: 0, unit: '%', title: 'Скорость насоса максимум, %', min: function () { return Math.max(0, st.spdMin); }, max: function () { return 100; } });
  text(nd ? '' : 'Сейчас: ' + fmt(S.press, 2) + ' бар', 300, 252, 13, C.text2, 'left');
  text(nd ? '' : 'скорость ' + fmt(S.speedOut, 1) + ' %', 300, 270, 13, C.text2, 'left');

  // ---- уровень -> гидроциклоны
  panel(518, 104, 494, 196, 'Уровень → гидроциклоны', '· ступенчатый');
  field('f6', 'Уставка', 534, 144, 230, { get: function () { return st.levelSP; }, off: 20, dec: 1, unit: '%', title: 'Уставка уровня, %', min: function () { return 5; }, max: function () { return 95; } });
  field('f7', 'Зона ±', 774, 144, 226, { get: function () { return st.hyst; }, off: 24, dec: 1, unit: '%', title: 'Зона нечувствительности ±, %', min: function () { return 0.5; }, max: function () { return 20; } });
  field('f8', 'Подключение', 534, 194, 230, { get: function () { return st.tAdd; }, off: 32, dec: 0, int: true, unit: 'с', title: 'Подключение циклона через, с', min: function () { return 1; }, max: function () { return 600; } });
  field('f9', 'Отключение', 774, 194, 226, { get: function () { return st.tRem; }, off: 34, dec: 0, int: true, unit: 'с', title: 'Отключение циклона через, с', min: function () { return 1; }, max: function () { return 600; } });
  field('f10', 'Мин. для пуска', 534, 244, 230, { get: function () { return st.startMin; }, off: 28, dec: 1, unit: '%', title: 'Минимум уровня для пуска, %', min: function () { return 0; }, max: function () { return 100; } });
  text(nd ? '' : 'Сейчас: ' + fmt(S.level, 1) + ' %', 790, 252, 13, C.text2, 'left');
  text(nd ? '' : 'открыто циклонов: ' + S.nCyc, 790, 270, 13, C.text2, 'left');

  // ---- гидроциклоны
  panel(12, 312, 494, 392, 'Гидроциклоны');
  field('f11', 'При пуске', 28, 352, 230, { get: function () { return st.nStart; }, off: 36, dec: 0, int: true, unit: 'шт', title: 'Циклонов при пуске, шт', min: function () { return 1; }, max: function () { return 6; } });
  field('f12', 'Минимум', 268, 352, 226, { get: function () { return st.nMin; }, off: 38, dec: 0, int: true, unit: 'шт', title: 'Циклонов минимум, шт', min: function () { return 0; }, max: function () { return st.nMax; } });
  field('f13', 'Максимум', 28, 402, 230, { get: function () { return st.nMax; }, off: 40, dec: 0, int: true, unit: 'шт', title: 'Циклонов максимум, шт', min: function () { return 1; }, max: function () { return 6; } });
  text('Вывод в ремонт (нажатие переключает)', 28, 470, 15, C.text2);
  for (let k = 1; k <= 6; k++) {
    const rep = !nd && st.repair[1 + k];
    const x = 28 + (k - 1) * 78;
    toggle('rc' + k, x, 488, 70, 58, 'ГЦ' + k, rep ? 'РЕМОНТ' : 'в работе', rep, (function (kk, r) {
      return function () {
        withAccess(function () {
          confirm(r ? 'Ввести ГЦ-' + kk + ' из ремонта?' : 'Вывести ГЦ-' + kk + ' в ремонт?',
            r ? 'Циклон снова будет использоваться регулятором уровня.' : 'Регулятор уровня перестанет открывать этот циклон.',
            function () { setRepair(1 + kk, !r); logEvent('ГЦ-' + kk + (r ? ' введён из ремонта' : ' выведен в ремонт')); });
        });
      };
    })(k, rep), true);
  }
  // состояние задвижек циклонов
  text('Задвижки подачи', 28, 572, 15, C.text2);
  for (let k = 1; k <= 6; k++) {
    const v = S.valve[12 + k], x = 28 + (k - 1) * 78;
    const col = nd ? C.stop : valveCol(v.view);
    rrect(x, 588, 70, 26, 3, col, v.view === 4 ? C.repairLine : null, 1.5, v.view === 4 ? [4, 3] : null);
    textFit(nd ? '—' : ['закр.', 'откр.', 'движ.', 'авария', 'ремонт', 'неизв.'][v.view] || '?', x + 35, 602, 64, 12, (nd || v.view === 0 || v.view === 2 || v.view === 4 || v.view === 5) ? C.text : C.white, 'center', true);
    hit(x, 588, 70, 26, (function (i) { return function () { openValve(i); }; })(12 + k), 'cv' + k);
  }
  text('нажатие — окно задвижки', 28, 632, 12, C.text2);

  // ---- насосы
  panel(518, 312, 494, 392, 'Насосы');
  text('Основной насос', 534, 374, 15, C.text2);
  for (let n = 1; n <= 2; n++) {
    const on = !nd && st.duty === n;
    toggle('du' + n, 760 + (n - 1) * 120, 352, 110, 44, 'Н-' + n, '', on, (function (nn, o) {
      return function () {
        if (o) return;
        withAccess(function () { confirm('Сделать Н-' + nn + ' основным?', 'Резервный насос включается по АВР.', function () { setI16(42, nn); logEvent('Основной насос: Н-' + nn); }); });
      };
    })(n, on));
  }
  text('Вывод в ремонт', 534, 430, 15, C.text2);
  for (let n = 1; n <= 2; n++) {
    const rep = !nd && st.repair[n - 1];
    toggle('rp' + n, 760 + (n - 1) * 120, 408, 110, 44, 'Н-' + n, rep ? 'РЕМОНТ' : '', rep, (function (nn, r) {
      return function () {
        withAccess(function () {
          confirm(r ? 'Ввести Н-' + nn + ' из ремонта?' : 'Вывести Н-' + nn + ' в ремонт?',
            r ? 'Насос снова будет доступен для работы и АВР.' : 'Насос не будет пускаться ни алгоритмом, ни АВР.',
            function () { setRepair(nn - 1, !r); logEvent('Насос Н-' + nn + (r ? ' введён из ремонта' : ' выведен в ремонт')); });
        });
      };
    })(n, rep), true);
  }
  line(530, 470, 1000, 470, C.rowLine, 1);
  text('Время шагов последовательности', 534, 492, 15, C.text, 'left', true);
  field('f14', 'Размыв (пуск)', 534, 512, 230, { get: function () { return st.tScour; }, off: 46, dec: 0, int: true, unit: 'с', title: 'Размыв при пуске, с', min: function () { return 1; }, max: function () { return 600; } });
  field('f15', 'Пром. (пуск)', 774, 512, 226, { get: function () { return st.tFlushStart; }, off: 48, dec: 0, int: true, unit: 'с', title: 'Промывка при пуске, с', min: function () { return 1; }, max: function () { return 600; } });
  field('f16', 'Пром. (стоп)', 534, 562, 230, { get: function () { return st.tFlushStop; }, off: 50, dec: 0, int: true, unit: 'с', title: 'Промывка при останове, с', min: function () { return 1; }, max: function () { return 600; } });
  field('f17', 'Дренаж', 774, 562, 226, { get: function () { return st.tDrain; }, off: 52, dec: 0, int: true, unit: 'с', title: 'Дренаж, с', min: function () { return 1; }, max: function () { return 600; } });
  text('Уставки хранятся в DB101 (сохраняемый блок).', 534, 630, 12, C.text2);
  text('Значение вне диапазона ПЛК поправит сам.', 534, 648, 12, C.text2);
  if (!hasAccess()) text('Для изменения нажмите ВХОД и введите пароль.', 534, 672, 12, C.text2);
}
