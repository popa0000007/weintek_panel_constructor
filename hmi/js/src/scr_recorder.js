// ================================================================ РЕГИСТРАТОР (общее окно 4, невидимый объект)
// Каждые 5 с пишет тренд (уровень, давление, скорости) в общее хранилище панели — 8 часов.
// Раз в секунду сравнивает тревоги с прошлым состоянием: появилось / ушло -> журнал; события режима, пуска, АВР, местного.
function screenInfo() { return { name: 'recorder', headless: true, noCommBar: true }; }
function drawScreen() { }
function drawExtraPopup(p) { }
function onDataUpdate() { }
const TR_IDX = 'gcu_tr_idx', TR_HOURS = 9;
let prev = null, lastComm = '';
function screenInit() {
  setInterval(sample, 5000);
  setInterval(watch, 1000);
}
function sample() {
  if (noData()) return;
  const t = Math.floor(Date.now() / 1000), h = Math.floor(t / 3600);
  const L = S.st.levelOk || DEMO ? Math.round(S.level * 10) : '', P = S.st.pressOk || DEMO ? Math.round(S.press * 1000) : '';
  const rec = (t - h * 3600) + ',' + L + ',' + P + ',' + Math.round(S.speedOut * 10) + ',' + Math.round(S.pump[1].speed * 10) + ',' + Math.round(S.pump[2].speed * 10) + ';';
  let cur = null;
  try { cur = STORE.getItem('gcu_tr_' + h); } catch (e) { }
  try { STORE.setItem('gcu_tr_' + h, (cur || '') + rec); } catch (e) { console.log('tr: ' + e.message); }
  let idx = storeGet(TR_IDX, []);
  if (idx.indexOf(h) < 0) {
    idx.push(h); idx.sort(function (a, b) { return a - b; });
    while (idx.length > TR_HOURS) { const old = idx.shift(); try { STORE.removeItem('gcu_tr_' + old); } catch (e) { } }
    storeSet(TR_IDX, idx);
  }
}
function watch() {
  // связь
  if (!DEMO && commErr !== lastComm) {
    if (commErr) logEvent('Нет связи с ПЛК: ' + commErr, 'A', 'on'); else if (lastComm) logEvent('Связь с ПЛК восстановлена', 'A', 'off');
    lastComm = commErr;
  }
  if (noData()) return;
  // тревоги
  const act = storeGet(ACT_KEY, {});
  const now = Date.now(), seen = {};
  alarmList().forEach(function (a) {
    seen[a.t] = true;
    if (!act[a.t]) { act[a.t] = { t: now, c: a.c, ack: false }; logEvent(a.t, a.c, 'on'); }
  });
  Object.keys(act).forEach(function (k) {
    if (!seen[k]) { logEvent(k, act[k].c, 'off'); delete act[k]; }
  });
  storeSet(ACT_KEY, act);
  // события
  const cur = {
    auto: S.st.auto, run: S.st.run, abp: S.alm[10], p1: S.pump[1].running, p2: S.pump[2].running,
    loc: S.valve.slice(1).map(function (v) { return v.local; }),
    // двери шкафов и реле давления воздуха — только в журнал (события), не в активные тревоги
    ext: S.hasSeal ? [S.alm2.doorGcu, S.alm2.doorCyc, S.alm2.doorPlc, S.alm2.airGcu, S.alm2.airCyc] : (prev ? prev.ext : null)
  };
  if (cur.ext) {
    const EXT_TXT = [['Пульт ГЦУ: дверь открыта', 'Пульт ГЦУ: дверь закрыта'], ['Шкаф гидроциклонов: дверь открыта', 'Шкаф гидроциклонов: дверь закрыта'],
      ['Шкаф ПЛК: дверь открыта', 'Шкаф ПЛК: дверь закрыта'], ['Пульт ГЦУ: нет давления воздуха (реле)', 'Пульт ГЦУ: давление воздуха в норме'],
      ['Шкаф гидроциклонов: нет давления воздуха (реле)', 'Шкаф гидроциклонов: давление воздуха в норме']];
    cur.ext.forEach(function (v, i) {
      const was = prev && prev.ext ? prev.ext[i] : false;
      if (v !== was) logEvent(EXT_TXT[i][v ? 0 : 1], 'E', v ? 'on' : 'off');
    });
  }
  if (prev) {
    if (cur.auto !== prev.auto) logEvent('Режим ГЦУ: ' + (cur.auto ? 'АВТОМАТ' : 'РУЧНОЙ'));
    if (cur.run !== prev.run) logEvent('Программа ГЦУ: ' + (cur.run ? 'ПУСК' : 'СТОП'));
    if (cur.abp && !prev.abp) logEvent('Сработал АВР насосов');
    if (cur.p1 !== prev.p1) logEvent('Насос Н-1: ' + (cur.p1 ? 'работа' : 'остановлен'));
    if (cur.p2 !== prev.p2) logEvent('Насос Н-2: ' + (cur.p2 ? 'работа' : 'остановлен'));
    cur.loc.forEach(function (l, i) { if (l !== prev.loc[i]) logEvent(VALVE_NAMES[i + 1] + ': ' + (l ? 'местное управление' : 'дистанция')); });
  }
  prev = cur;
}
