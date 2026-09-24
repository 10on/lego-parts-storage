# Структура исходников

Фронтенд — ES-модули без сборки. Точка входа: `index.html` → `<script type="module" src="src/main.js">`,
остальные модули подключаются через `import`.

```
/index.html
/css/
  app.css, grid.css, panel.css, components.css, splitview.css, autocomplete.css, loading-progress.css
/src/
  main.js                  # LegoStorageApp: инициализация, загрузка/сохранение проекта (window.app)
  router.js                # hash-роутинг между видами
  events.js                # глобальные горячие клавиши
  utils/
    index.js               # Utils, esc() — экранирование HTML
    imageLoader.js         # URL изображений BrickLink и fallback при ошибках загрузки
  components/
    autocomplete.js        # AutoComplete
  domain/
    model.js               # Container: данные контейнера, миграция формата ячеек, клонирование
  data/
    project.js             # MockData — тестовые данные для нового пользователя
    bricklink.js           # brickLinkData — фасад каталога BrickLink
    lcx-parser.js          # разбор LCX-файлов
    lcx-file-loader.js     # скачивание и распаковка LCX-файла
    lcx-indexeddb-adapter.js  # хранение каталога в IndexedDB
    storage/
      adapter.js           # базовый StorageAdapter
      local.js, idb.js     # адаптеры хранения проекта
      index.js             # StorageAdapterFactory
  ui/
    appShell/sidebar.js
    components/LoadingProgress.js
    views/
      homeView.js
      containerView/
        index.js           # ContainerView: сетка, режимы, связывает компоненты ниже
        cellRenderer.js    # HTML содержимого ячейки
        cellEditor.js      # редактор ячейки: детали, автокомплит, превью изображения
        mergeMode.js       # объединение ячеек
        splitMode.js       # разбиение объединенных ячеек
        cellDragDrop.js    # перетаскивание (обмен содержимым ячеек)
      pileView/, splitView/, duplicatesView/, importView/, settingsView/
/data/
  bricklink-catalog.lcx.json.gz   # каталог BrickLink, загружается в IndexedDB при первом запуске
/scripts/                  # Python-скрипты подготовки каталога
```
