import sys, os
HDR = {
 'mimic':   ('gcu_mimic.js',   'Мнемосхема ГЦУ (окно 10 или 16)'),
 'pump':    ('gcu_pump.js',    'Насос Н-1 / Н-2 (окна 11, 12; config pump = 1 или 2)'),
 'settings':('gcu_settings.js','Регуляторы и уставки (окно 13)'),
 'alarms':  ('gcu_alarms.js',  'Аварии и журнал (окно 14)'),
 'trends':  ('gcu_trends.js',  'Тренды (окно 15)'),
 'io':      ('gcu_io.js',      'Входы и выходы DI/DO/AI/AO (окно 17)'),
 'pd':      ('gcu_pd.js',      'Пульподелитель трёхструйный (окно 18)'),
 'recorder':('gcu_recorder.js','Регистратор трендов и журнала (общее окно 4, невидимый)'),
}
SRC = os.environ.get('GCU_SRC', 'src'); OUT = os.environ.get('GCU_OUT', 'dist')
rd = lambda n: open(os.path.join(SRC, n), encoding='utf-8').read()
core = rd('core.js')
os.makedirs(OUT, exist_ok=True)
for key in (sys.argv[1:] or HDR.keys()):
    out, title = HDR[key]
    scr = rd(f'scr_{key}.js')
    if key == 'io': scr = rd('io_signals.js') + scr
    cfgn = 'config_pump1.json / config_pump2.json' if key == 'pump' else f'config_{key}.json'
    head = ('// =====================================================================\n'
            f'//  ГЦУ-1 · {title}\n'
            '//  JS Object для Weintek cMT X (EasyBuilder Pro >= 6.09). Версия 2.5 · 2026-10-24\n'
            f'//  Собрано из src/core.js + src/scr_{key}.js (build.py). Вставлять целиком.\n'
            f'//  Конфигурация — hmi/js/{cfgn} (кнопка «Шаблон…»).\n'
            '// =====================================================================\n\n')
    body = core + '\n' + scr + '\nstart();\n'
    if len((head + body).encode('utf-8')) > 90000:
        # лимит исходного кода JS-объекта 100 КБ: убрать отступы и строки, состоящие только из комментария
        body = '\n'.join(l.strip() for l in body.split('\n') if l.strip() and not l.strip().startswith('//')) + '\n'
        head = head.replace('Вставлять целиком.', 'Вставлять целиком. Сжат (без отступов) — читаемый код в src/.')
    open(os.path.join(OUT, out), 'w', encoding='utf-8').write(head + body)
    print(out, os.path.getsize(os.path.join(OUT, out)))
