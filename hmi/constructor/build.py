# Сборка конструктора панели: один файл hmi/constructor/Конструктор_панели.html (работает без интернета).
# Запуск: python hmi/constructor/build.py
# Берёт ядро панели hmi/js/src/core.js (то же, что у остальных окон), правит в нём несколько строк
# (размер и положение объекта из SCREEN, демо-режим только по флагу) и встраивает вместе с
# src/runtime.js, редактором src/editor.* и примером examples/*.json.
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
VERSION = '1.0'
DATE = '2026-10-25'

def rd(*p):
    return open(os.path.join(*p), encoding='utf-8').read()

# ---------------------------------------------------------------- правки ядра (каждая должна найтись ровно столько раз)
PATCHES = [
    ('const W0 = 1024, H0 = 664, OY = 48;', 'const W0 = SCREEN.w, H0 = SCREEN.h, OY = SCREEN.oy, OX = SCREEN.ox;', 1),
    ('const DEMO = cfg.demo === true || (!cfg.hmiSub && !cfg.cmdAddr);', 'const DEMO = cfg.demo === true;', 1),
    ('return { x: e.x / SC, y: e.y / SC + OY };', 'return { x: e.x / SC + OX, y: e.y / SC + OY };', 1),
    ('cv.setTransform(SC, 0, 0, SC, 0, -OY * SC);', 'cv.setTransform(SC, 0, 0, SC, -OX * SC, -OY * SC);', 1),
    ('fillRect(0, OY, W0, H0, C.bg);', 'fillRect(OX, OY, W0, H0, SCREEN.bg || C.bg);', 1),
    ("fillRect(0, OY, W0, H0, '#000000');", "fillRect(OX, OY, W0, H0, '#000000');", 1),
    ("hit(0, OY, W0, H0, function () { }, 'modal');", "hit(OX, OY, W0, H0, function () { }, 'modal');", 1),
    ('const x = 312, y = 200, w = 400, h = 360;', 'const w = 400, h = 360, x = OX + (W0 - w) / 2, y = OY + (H0 - h) / 2;', 1),
    ('const x = 292, y = 160, w = 440, h = 440;', 'const w = 440, h = 440, x = OX + (W0 - w) / 2, y = OY + (H0 - h) / 2;', 1),
    ('x = (W0 - w) / 2', 'x = OX + (W0 - w) / 2', 4),
    ('const w = 560, x = OX + (W0 - w) / 2, y = 640;', 'const w = Math.min(560, W0 - 20), x = OX + (W0 - w) / 2, y = OY + H0 - 72;', 1),
    ('fillRect(0, 688, W0, 24, C.alarm);', 'fillRect(OX, OY + H0 - 24, W0, 24, C.alarm);', 1),
    ('W0 / 2, 701, W0 - 40,', 'OX + W0 / 2, OY + H0 - 11, W0 - 40,', 1),
    ('const x = 40, y = OY + 20, w = W0 - 80, h = H0 - 40;', 'const x = OX + 40, y = OY + 20, w = W0 - 80, h = H0 - 40;', 1),
]

def minify(s):
    """Сжатие без изменения смысла: убрать комментарии, отступы и лишние пробелы (строки в кавычках не трогаются).
    Переводы строк сохраняются. В исходниках нет шаблонных строк и регулярных выражений — проверяется ниже."""
    if '`' in s:
        sys.exit('ОШИБКА: шаблонные строки (`) в исходнике не поддерживаются сжатием')
    W = re.compile(r'[A-Za-z0-9_$]')
    toks, i, n = [], 0, len(s)
    while i < n:
        c = s[i]
        if c in '\'"':
            j = i + 1
            while j < n and s[j] != c:
                if s[j] == '\\':
                    j += 1
                if s[j] == '\n':
                    sys.exit('ОШИБКА сжатия: незакрытая строка около: ' + s[i:i + 60])
                j += 1
            toks.append(('S', s[i:j + 1])); i = j + 1; continue
        if s.startswith('//', i):
            j = s.find('\n', i); i = n if j < 0 else j; continue
        if s.startswith('/*', i):
            i = s.find('*/', i) + 2; continue
        if c == '\n':
            toks.append(('N', '\n')); i += 1; continue
        if c in ' \t\r':
            while i < n and s[i] in ' \t\r':
                i += 1
            toks.append(('W', ' ')); continue
        j = i
        while j < n and s[j] not in '\'"\n \t\r' and not s.startswith('//', j) and not s.startswith('/*', j):
            j += 1
        toks.append(('C', s[i:j])); i = j
    res = []
    for k, (t, v) in enumerate(toks):
        if t == 'W':
            p = res[-1][-1:] if res else ''
            nx = ''
            for t2, v2 in toks[k + 1:]:
                if t2 != 'W':
                    nx = '\n' if t2 == 'N' else v2[:1]
                    break
            if p and p != '\n' and nx and nx != '\n' and ((W.match(p) and W.match(nx)) or (p in '+-' and nx in '+-')):
                res.append(' ')
            continue
        if t == 'N':
            if res and not res[-1].endswith('\n'):
                res.append('\n')
            continue
        res.append(v)
    return ''.join(res).strip() + '\n'

def engine():
    """Возвращает (полный читаемый код, части для конструктора)."""
    core = rd(ROOT, 'hmi', 'js', 'src', 'core.js')
    for a, b, n in PATCHES:
        c = core.count(a)
        if c != n:
            sys.exit(f'ОШИБКА: в core.js строка «{a}» найдена {c} раз (ожидалось {n}). Ядро изменилось — поправьте PATCHES в build.py.')
        core = core.replace(a, b)
    rt = rd(HERE, 'src', 'runtime.js')
    b0, b1 = rt.index('const RENDER = {\n'), rt.index('\n};\n', rt.index('const RENDER = {\n'))
    head, body, tail = rt[:b0], rt[b0 + len('const RENDER = {\n'):b1], rt[b1 + 4:]
    # элементы: строки вида «  имя: function (...» с отступом 2
    starts = [(m.start(), m.group(1)) for m in re.finditer(r'^  (\w+): function', body, re.M)]
    rend = {}
    for k, (pos, name) in enumerate(starts):
        end = starts[k + 1][0] if k + 1 < len(starts) else len(body)
        chunk = body[pos:end].rstrip().rstrip(',')
        rend[name] = minify(chunk).strip()
    parts = {'core': minify(core), 'head': minify(head), 'tail': minify(tail), 'r': rend}
    return core + '\n' + rt + '\n', parts

def assemble(parts, types=None):
    names = [t for t in parts['r'] if types is None or t in types]
    return parts['core'] + parts['head'] + 'const RENDER={\n' + ',\n'.join(parts['r'][t] for t in names) + '\n};\n' + parts['tail']

def js_str(s):
    return json.dumps(s, ensure_ascii=False).replace('</', '<\\/')

def main():
    full, parts = engine()
    os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
    open(os.path.join(HERE, 'dist', 'engine.js'), 'w', encoding='utf-8').write(full)
    eng = assemble(parts)
    open(os.path.join(HERE, 'dist', 'engine.min.js'), 'w', encoding='utf-8').write(eng)
    tpl_path = os.path.join(HERE, 'src', 'editor.html')
    if not os.path.exists(tpl_path):
        print('engine.min.js', len(eng.encode('utf-8')))
        return
    examples = {}
    exdir = os.path.join(HERE, 'examples')
    for f in sorted(os.listdir(exdir)):
        if f.endswith('.json'):
            examples[f[:-5]] = json.loads(rd(exdir, f))
    html = rd(tpl_path)
    repl = {
        '/*@@CSS@@*/': rd(HERE, 'src', 'editor.css'),
        '/*@@JS@@*/': rd(HERE, 'src', 'export.js') + '\n' + rd(HERE, 'src', 'symlib.js') + '\n' + rd(HERE, 'src', 'panel.js') + '\n' + rd(HERE, 'src', 'check.js') + '\n' + rd(HERE, 'src', 'editor.js'),
        '/*@@ENGINE@@*/': 'const ENGINE = ' + json.dumps(parts, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ';',
        '/*@@EXAMPLES@@*/': 'const EXAMPLES = ' + json.dumps(examples, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/') + ';',
        '@@VERSION@@': VERSION,
        '@@DATE@@': DATE,
    }
    for k, v in repl.items():
        if k not in html:
            sys.exit('ОШИБКА: в editor.html нет метки ' + k)
        html = html.replace(k, v)
    # для публикации (оболочку <html><head><body> добавляет сервис) и для открытия с диска (полный документ)
    open(os.path.join(HERE, 'dist', 'artifact.html'), 'w', encoding='utf-8').write(html)
    full_doc = ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
                '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
                '<style>body{margin:0}[hidden]{display:none!important}</style>\n</head>\n<body>\n' + html + '\n</body>\n</html>\n')
    out = os.path.join(HERE, 'Конструктор_панели.html')
    open(out, 'w', encoding='utf-8').write(full_doc)
    print(os.path.basename(out), os.path.getsize(out), '· ядро (сжатое, все элементы)', len(eng.encode('utf-8')))

if __name__ == '__main__':
    main()
