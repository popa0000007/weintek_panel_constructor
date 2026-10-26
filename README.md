# Конструктор панели Weintek

Конструктор окон для панели Weintek (JS-объекты EasyBuilder Pro), выделенный из проекта ГЦУ-1 (`GCU_1_Mill_ATP` v0.11).
Остальные окна проекта оставлены как примеры.

## Что где

| Путь | Что |
|---|---|
| `hmi/constructor/` | сам конструктор: `src/` (editor, runtime, export), `build.py`, `examples/gcu.json` (пример: мнемосхема), инструкция |
| `hmi/constructor/Конструктор_панели.html` | собранный конструктор (открывать в браузере) |
| `hmi/js/src/core.js` | ядро панели (рисование, опрос DB, ввод). **Конструктор собирается из него** |
| `hmi/js/src/scr_*.js` | окна проекта как примеры: мнемосхема, насос, уставки, аварии, тренды, входы/выходы, пульподелитель, регистратор |
| `hmi/js/gcu_*.js`, `config_*.json` | собранные окна и их конфигурации; `preview/` — скриншоты окон |
| `hmi/mockup/` | макеты окон (`*.dc.html`) |
| `hmi/GCU_HMI_Tags.xlsx`, `GCU_EB_Tags.csv` | теги и карта DB панели |
| `plc/` | `5_GCU_HMI.scl`, `4b_PulpDivider.scl`, `0_IO_Lib.scl` — раскладка DB для импорта тегов в конструктор |

## Сборка

```
python3 hmi/constructor/build.py      # -> hmi/constructor/Конструктор_панели.html
python3 hmi/js/src/build.py           # -> hmi/js/gcu_*.js
```

После правки `hmi/js/src/core.js` конструктор нужно пересобрать. Подробности — `hmi/constructor/ИНСТРУКЦИЯ_КОНСТРУКТОР.md`.

## Что есть в конструкторе

- Пример-проект `hmi/constructor/examples/gcu.json`: мнемосхема, насосы Н-1/Н-2, уставки, аварии, тренды, входы/выходы (2 части), пульподелитель, образец со своим DB. Генераторы — `hmi/constructor/src/make_*.js`; неточности переноса — `hmi/constructor/examples/GAPS_*.md`.
- Библиотека своих технологических элементов («Символы»): фигуры, таблица состояний, импорт SVG.
- Выбор модели панели Weintek («Панель»).
- Импорт DB и UDT из TIA одним текстом (порядок не важен).

После правки `src/*` или `hmi/js/src/core.js`: `node hmi/constructor/src/make_example.js && python3 hmi/constructor/build.py`.
