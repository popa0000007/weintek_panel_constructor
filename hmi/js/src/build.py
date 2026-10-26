# Сборка окон JS-панели: hmi/js/src/core.js + scr_<окно>.js -> hmi/js/gcu_<окно>.js
# Запуск: python hmi/js/src/build.py [mimic pump settings alarms trends io pd recorder]
import os, runpy
here = os.path.dirname(os.path.abspath(__file__))
os.environ['GCU_SRC'] = here
os.environ['GCU_OUT'] = os.path.dirname(here)
runpy.run_path(os.path.join(here, '_build_impl.py'), run_name='__main__')
