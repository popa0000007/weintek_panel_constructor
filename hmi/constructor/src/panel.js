// ================================================================ МОДЕЛЬ ПАНЕЛИ WEINTEK
// Разрешение — размер экрана в пикселях. «ok»: 1 — подтверждено datasheet/страницей Weintek, 0 — по каталогам, проверьте перед работой.
// Окно конструктора (JS-объект) занимает экран минус верхнюю полосу и нижнее меню (ваши общие окна EasyBuilder): top / bot.
const PANELS = [
  ['cMT X (Standard)', [
    ['cMT2078X', '7"', 800, 480, 1], ['cMT2108X2', '10.1"', 1024, 600, 1], ['cMT2128X', '12.1"', 1024, 768, 1], ['cMT2158X', '15"', 1024, 768, 1]]],
  ['cMT X (Advanced)', [
    ['cMT3072XH', '7"', 1024, 600, 1], ['cMT3092X', '9.7"', 1024, 768, 1], ['cMT3152X', '15"', 1024, 768, 1], ['cMT3162X', '15.6"', 1920, 1080, 1]]],
  ['MT8000 (iP / XE)', [
    ['MT8071iP', '7"', 800, 480, 1], ['MT8102iP', '10.1"', 1024, 600, 1], ['MT8121XE', '12.1"', 1024, 768, 0], ['MT8150XE', '15"', 1024, 768, 0]]]
];
function panelInfo(id) { let r = null; PANELS.forEach(g => g[1].forEach(p => { if (p[0] === id) r = { id: p[0], diag: p[1], w: p[2], h: p[3], ok: p[4] }; })); return r; }
function panelDefault() { return { model: 'cMT2158X', w: 1024, h: 768, top: 48, bot: 56 }; }
function panelWork(pn) { return { w: pn.w, h: Math.max(100, pn.h - (+pn.top || 0) - (+pn.bot || 0)), ox: 0, oy: +pn.top || 0 }; }
function scaleEls(list, kx, ky) {
  (list || []).forEach(e => {
    ['x', 'w', 'x2'].forEach(k => { if (typeof e[k] === 'number') e[k] = Math.round(e[k] * kx); });
    ['y', 'h', 'y2'].forEach(k => { if (typeof e[k] === 'number') e[k] = Math.round(e[k] * ky); });
    if (e.els) scaleEls(e.els, kx, ky);
  });
}
function openPanel() {
  const pn = proj.panel = Object.assign(panelDefault(), proj.panel || {});
  const sel = h('select', {}, PANELS.map(g => h('optgroup', { label: g[0] }, g[1].map(p => h('option', { value: p[0] }, p[0] + ' · ' + p[1] + ' · ' + p[2] + '×' + p[3] + (p[4] ? '' : ' (проверьте)'))))), h('option', { value: '' }, 'Другая (вручную)'));
  sel.value = panelInfo(pn.model) ? pn.model : '';
  const W = numIn(pn, 'w'), H = numIn(pn, 'h'), TOP = numIn(pn, 'top'), BOT = numIn(pn, 'bot');
  const info = h('div', { class: 'note' });
  const apply = h('input', { type: 'checkbox', checked: true }), scale = h('input', { type: 'checkbox' });
  const upd = () => {
    const w = panelWork(pn), p = panelInfo(pn.model);
    info.textContent = 'Рабочая область окон: ' + w.w + '×' + w.h + ' (X' + w.ox + ' Y' + w.oy + ')' + (w.h < 460 ? '. Высота меньше 460 — экранная клавиатура (452 px) не поместится: уменьшите полосы сверху/снизу или не используйте ввод с клавиатуры.' : '.') +
      (p && !p.ok ? ' Разрешение этой модели не подтверждено datasheet — сверьте с вашей панелью.' : '');
  };
  sel.onchange = () => {
    const p = panelInfo(sel.value);
    if (p) { pn.model = p.id; pn.w = p.w; pn.h = p.h; W.value = p.w; H.value = p.h; } else pn.model = '';
    upd();
  };
  [W, H, TOP, BOT].forEach(i => i.addEventListener('input', upd));
  upd();
  openModal('Модель панели Weintek', [
    h('p', { class: 'note' }, 'Выбор модели задаёт разрешение экрана и размер рабочей области окон (JS-объекта EasyBuilder).'),
    fieldRow('Модель', sel), fieldRow('Ширина экрана, px', W), fieldRow('Высота экрана, px', H),
    fieldRow('Полоса сверху, px', TOP, 'Ваше общее окно с аварийной строкой (в проекте ГЦУ — 48)'), fieldRow('Меню снизу, px', BOT, 'Нижнее меню (в проекте ГЦУ — 56)'),
    info,
    h('label', { class: 'chk' }, apply, 'Применить размер рабочей области ко всем окнам проекта'),
    h('label', { class: 'chk' }, scale, 'Пропорционально изменить положение и размер элементов (шрифты не меняются — проверьте вид)'),
    h('div', { class: 'btnrow', style: 'justify-content:flex-end' }, h('button', { class: 'accent', onclick: () => {
      pushUndo();
      const w = panelWork(pn);
      if (apply.checked) {
        proj.screens.forEach(s => {
          if (scale.checked && s.w && s.h) { const kx = w.w / s.w, ky = w.h / s.h; scaleEls(s.els, kx, ky); }
          s.w = w.w; s.h = w.h; s.ox = w.ox; s.oy = w.oy;
        });
      }
      autosave(); changed(true); refreshAll(true); closeModal();
      toast('Панель: ' + (pn.model || 'вручную') + ' ' + pn.w + '×' + pn.h);
    } }, 'Применить'))]);
}
