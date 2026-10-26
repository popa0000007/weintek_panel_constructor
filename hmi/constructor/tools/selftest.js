// Самопроверка конструктора: собранный HTML открывается в headless Chromium (Playwright), для каждого окна проекта-примера
// проверяется экспорт (предупреждения, лимит кода, синтаксис), запуск в режиме «Просмотр» и «Проверка проекта».
// Запуск: python3 hmi/constructor/build.py && node hmi/constructor/tools/selftest.js   (нужен модуль playwright)
'use strict';
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const url = 'file://' + encodeURI(path.resolve(__dirname, '..', 'Конструктор_панели.html'));
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1500, height: 900 } });
  const errs = [];
  pg.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  pg.on('console', m => { if (m.type() === 'error' || /\[панель\]/.test(m.text())) errs.push('CONSOLE ' + m.text().slice(0, 300)); });
  await pg.goto(url); await pg.evaluate(() => localStorage.clear()); await pg.reload(); await pg.waitForTimeout(600);
  const rep = await pg.evaluate(() => {
    const AF = Object.getPrototypeOf(async function () { }).constructor;
    const screens = proj.screens.map(s => {
      const x = exportScreen(proj, s.id, Object.assign({ ver: 'test' }, ENGINE));
      let syn = 'ok'; try { new AF('Canvas', 'MouseArea', 'driver', 'console', '__host', x.code); } catch (e) { syn = e.message; }
      return { id: s.id, kb: Math.round(x.size / 1024), warn: x.warn, syn: syn };
    });
    return { screens: screens, check: checkProject().filter(x => x.lvl === 'err') };
  });
  let bad = 0;
  rep.screens.forEach(s => { const ok = !s.warn.length && s.syn === 'ok'; if (!ok) bad++; console.log((ok ? 'OK   ' : 'FAIL ') + s.id + ' ' + s.kb + ' КБ' + (s.warn.length ? ' ' + s.warn.join('; ') : '') + (s.syn !== 'ok' ? ' синтаксис: ' + s.syn : '')); });
  rep.check.forEach(c => { bad++; console.log('FAIL проверка: ' + c.where + ': ' + c.msg); });
  await pg.click('#mRun'); await pg.click('[data-tab=win]');
  const n = await pg.locator('#tab-win .li').count();
  for (let i = 0; i < n; i++) { await pg.locator('#tab-win .li').nth(i).click(); await pg.waitForTimeout(400); }
  if (errs.length) { bad += errs.length; console.log(errs.join('\n')); }
  console.log(bad ? 'ОШИБОК: ' + bad : 'Все проверки пройдены');
  await b.close(); process.exit(bad ? 1 : 0);
})();
