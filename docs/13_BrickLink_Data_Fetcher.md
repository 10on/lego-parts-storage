# Документация по скрипту `bl_fetch_lcx.py`

Скрипт предназначен для **скачивания каталога BrickLink** напрямую через официальный интерфейс выгрузки  
и конвертации данных в единый компактный формат **LCX-Tabular v1** (`.json.gz`).  
Полученный файл можно использовать на фронтенде (IndexedDB/SQLite-wasm и т. д.).

---

## Возможности

- Скачивает и преобразует:
  - **Категории** (`viewType=2`)
  - **Цвета** (`viewType=3`)
  - **Детали** (`viewType=0`, `itemType=P` — Parts)
  - **Связи деталь–цвет** (`viewType=5`, опционально)
- Формирует один gzip-файл (по умолчанию `catalog.lctx.json.gz`).
- Умеет брать **куки из браузера** (Firefox, Chrome и др. через [`browser-cookie3`](https://pypi.org/project/browser-cookie3/)).

---

## Установка

1. Скачайте файл `bl_fetch_lcx.py` в удобную директорию.
2. Установите зависимости:

```bash
pip install requests
# Для автоматического получения кук из браузера:
pip install browser-cookie3
```

---

## Запуск

### Базовый запуск (без кук)

```bash
python bl_fetch_lcx.py --out catalog.lctx.json.gz
```

> ⚠️ Может не сработать, если BrickLink требует авторизацию.

---

### Использование кук из Firefox

```bash
python bl_fetch_lcx.py --use-firefox-cookies --out catalog.lctx.json.gz
```

Скрипт сам найдёт профиль Firefox и достанет куки для домена `bricklink.com`.

---

### Использование кук из Chrome

```bash
python bl_fetch_lcx.py --cookies-from-browser chrome --out catalog.lctx.json.gz
```

(Поддержка Chrome/Edge работает так же, как Firefox — через `browser-cookie3`).

---

### Передача кук вручную

```bash
python bl_fetch_lcx.py --cookie "BLID=...; JSESSIONID=..." --out catalog.lctx.json.gz
```

---

## Опции

- `--out FILE` — путь к выходному файлу (по умолчанию `catalog.lctx.json.gz`).  
  Если имя не оканчивается на `.gz`, будет создан простой `.json`.

- `--cookie STRING` — передать строку Cookie вручную.

- `--use-firefox-cookies` — взять куки из локального Firefox.

- `--cookies-from-browser {firefox,chrome,edge}` — выбрать конкретный браузер (расширение над `browser-cookie3`).

- `--user-agent UA` — переопределить User-Agent.

- `--item-type P` — тип элементов для выгрузки деталей (по умолчанию `P` = Parts). Можно указать другое (`M` = Minifigs, `S` = Sets и т. д.).

- `--skip-partcolors` — пропустить скачивание связей «деталь–цвет».

---

## Примеры

1. Полная выгрузка с Firefox-куками:
```bash
python bl_fetch_lcx.py --use-firefox-cookies --out catalog.lctx.json.gz
```

2. Только категории и цвета:
```bash
python bl_fetch_lcx.py --use-firefox-cookies --skip-partcolors --out light.lctx.json.gz
```

3. Задать тип `M` (minifigs) вместо деталей:
```bash
python bl_fetch_lcx.py --use-firefox-cookies --item-type M --out minifigs.lctx.json.gz
```

---

## Выходной формат

Файл соответствует спецификации **LCX-Tabular v1**:  
```json
{
  "schemaVersion": 1,
  "source": "bricklink",
  "version": "2025-09-06T20:00:00Z",
  "tables": {
    "categories": { "cols": ["id","name"], "rows": [...] },
    "colors": { "cols": [...], "rows": [...] },
    "parts": { "cols": [...], "rows": [...] },
    "partColors": { "cols": [...], "rows": [...] }
  }
}
```

- `cols` — список колонок,
- `rows` — массив строк-значений (как CSV в JSON).

См. подробную спецификацию в [`SPEC-LCX-TABULAR.md`](./SPEC-LCX-TABULAR.md).

---

## Советы

- Если BrickLink вернул HTML вместо TSV → проверь куки.  
- Лучше запускать через `--use-firefox-cookies` или `--cookies-from-browser`, как делает yt-dlp.  
- Скрипт работает щадяще (1 запрос на тип данных). Не злоупотребляй, чтобы не словить блокировку.
