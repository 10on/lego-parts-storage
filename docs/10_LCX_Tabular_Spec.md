# LCX-Tabular v1 — спецификация формата передачи каталога LEGO (категории, цвета, детали, связи)

Цель: один «пакет» с экономным JSON-представлением **без дублирования ключей** в каждой записи (аналог CSV в JSON).  
Удобно парсить на фронте, писать в IndexedDB/SQLite-wasm, не держать всё в памяти.

---

## 0. Общая идея

- Один файл `catalog.lctx.json.gz` (gzip).
- Внутри — объект с таблицами. Каждая таблица имеет:
  - `cols`: массив названий колонок (один раз),
  - `rows`: массив строк-массивов (значения в порядке колонок).
- Никаких вложенных объектов на запись → минимум байтов «на проводе».

> Пример экономии:  
> NDJSON c ключами → ~100–120 байт/запись;  
> LCX-Tabular (массивы) → ~60–80 байт/запись при тех же данных (экономия 25–45%).  
> Плюс gzip обычно даёт ×3–×6.

---

## 1. Контейнер

```json
{
  "schemaVersion": 1,
  "source": "bricklink",
  "version": "2025-09-06T17:20:00Z",
  "tables": {
    "categories": { "cols": [...], "rows": [...] },
    "colors":     { "cols": [...], "rows": [...] },
    "parts":      { "cols": [...], "rows": [...] },
    "partColors": { "cols": [...], "rows": [...] }   // опционально
  }
}
```

### 1.1 Обязательные поля корня
- `schemaVersion` (int) — версия этой спецификации (сейчас `1`).
- `source` (string) — источник (`"bricklink"`).
- `version` (string, ISO8601) — версия выгрузки (дата/время генерации).
- `tables` (object) — контейнер таблиц. Минимум: `categories`, `colors`, `parts`. `partColors` — по возможности.

---

## 2. Таблицы и схемы колонок

> Во всех таблицах `rows[i][j]` соответствует колонке `cols[j]`.  
> Пустые значения — `null`. Строки — **trim()**. Числа — целые.

### 2.1 `categories`

```
cols: ["id","name"]
```

| Колонка | Тип  | Обяз. | Описание                             |
|---------|------|-------|--------------------------------------|
| id      | int  | ✅    | Category ID                          |
| name    | str  | ✅    | Название категории                   |

**Пример:**
```json
"categories": {
  "cols": ["id","name"],
  "rows": [
    [143,"(Other)"],
    [43,"Wheel"],
    [2,"Baseplate"]
  ]
}
```

---

### 2.2 `colors`

```
cols: ["id","name","rgb","type","parts","inSets","wanted","forSale","yearFrom","yearTo"]
```

| Колонка | Тип        | Обяз. | Правила                                                                 |
|---------|------------|-------|-------------------------------------------------------------------------|
| id      | int        | ✅    | Color ID                                                                |
| name    | str        | ✅    | Название                                                                |
| rgb     | str\|null  | ✅    | HEX6 **UPPERCASE**, без `#` (например `"212121"`); пусто → `null`       |
| type    | str        | ✅    | Тип (например `"Solid"`, `"Transparent"`, `"N/A"`, …)                   |
| parts   | int        | ✅    | Кол-во уникальных деталей в этом цвете                                 |
| inSets  | int        | ✅    | В скольких наборах встречается                                          |
| wanted  | int        | ✅    | Wanted count                                                            |
| forSale | int        | ✅    | For sale count                                                          |
| yearFrom| int\|null  | ✅    | Год появления                                                           |
| yearTo  | int\|null  | ✅    | Год последнего появления                                                |

**Пример:**
```json
"colors": {
  "cols": ["id","name","rgb","type","parts","inSets","wanted","forSale","yearFrom","yearTo"],
  "rows": [
    [0,"(Not Applicable)",null,"N/A",5820,14716,88785,15634,1954,2025],
    [11,"Black","212121","Solid",13685,14061,18971,14148,1957,2025],
    [7,"Blue","0057A6","Solid",4416,9149,7902,4947,1950,2025]
  ]
}
```

---

### 2.3 `parts`

```
cols: ["blId","name","catId","alt"]
```

| Колонка | Тип            | Обяз. | Правила                                                    |
|---------|----------------|-------|------------------------------------------------------------|
| blId    | str            | ✅    | **Ключ** детали (BrickLink Number), например `"122c01"`     |
| name    | str            | ✅    | Название                                                   |
| catId   | int            | ✅    | FK → `categories.id`                                       |
| alt     | str[] \| null  | ❌    | Альтернативные номера (уникальные), пусто → `null`         |

**Пример:**
```json
"parts": {
  "cols": ["blId","name","catId","alt"],
  "rows": [
    ["sticker","Sticker (Unsorted, Generic Entry)",160,null],
    ["122c01","Plate, Modified 2 x 2 with Red Wheels",43,["71185"]],
    ["10p01","Baseplate 24 x 32 with Set 363/555 Dots Pattern",2,null]
  ]
}
```

---

### 2.4 `partColors` (опционально, если доступна связь деталь–цвет)

```
cols: ["partId","colorId","hasImg"]
```

| Колонка | Тип     | Обяз. | Правила                                             |
|---------|---------|-------|-----------------------------------------------------|
| partId  | str     | ✅    | FK → `parts.blId`                                   |
| colorId | int     | ✅    | FK → `colors.id`                                    |
| hasImg  | boolean | ❌    | Есть ли изображение конкретной комбинации           |

**Пример:**
```json
"partColors": {
  "cols": ["partId","colorId","hasImg"],
  "rows": [
    ["122c01",11,true],
    ["10p01",0,false]
  ]
}
```

---

## 3. Правила валидации

- Числа: `int` ≥ 0, `yearFrom/yearTo` — `int` или `null`.
- `rgb`: либо `null`, либо **ровно 6** символов `[0-9A-F]`, верхним регистром.
- `blId`/строки: `trim()`, пустые строки запрещены в обязательных полях.
- Ссылочная целостность:
  - Для каждой строки `parts` требуется существующий `categories.id = catId`.
  - Для `partColors` — требуются существующие `parts.blId` и `colors.id`.
- Дубликаты ключей: последняя запись побеждает (upsert).

---

## 4. Обработка на фронтенде

- Парсить `cols` → делать map индексов.  
- Каждую строку `rows` мапить по индексам → писать батчами в IndexedDB/SQLite.  
- Порядок: categories → colors → parts → partColors.  
- Все операции — upsert (bulkPut).  
- Парсинг/запись — в Web Worker.  

---

## 5. Расширение

- Новые колонки можно добавлять в конец `cols` без поломки старого клиента.  
- Новые таблицы можно добавлять в `tables`.  
- Удалять/переименовывать — только с bump `schemaVersion`.

---

## 6. Минимальный пример всего контейнера

```json
{
  "schemaVersion": 1,
  "source": "bricklink",
  "version": "2025-09-06T17:20:00Z",
  "tables": {
    "categories": {
      "cols": ["id","name"],
      "rows": [
        [143,"(Other)"],
        [43,"Wheel"],
        [2,"Baseplate"]
      ]
    },
    "colors": {
      "cols": ["id","name","rgb","type","parts","inSets","wanted","forSale","yearFrom","yearTo"],
      "rows": [
        [0,"(Not Applicable)",null,"N/A",5820,14716,88785,15634,1954,2025],
        [11,"Black","212121","Solid",13685,14061,18971,14148,1957,2025],
        [7,"Blue","0057A6","Solid",4416,9149,7902,4947,1950,2025]
      ]
    },
    "parts": {
      "cols": ["blId","name","catId","alt"],
      "rows": [
        ["sticker","Sticker (Unsorted, Generic Entry)",160,null],
        ["122c01","Plate, Modified 2 x 2 with Red Wheels",43,["71185"]],
        ["10p01","Baseplate 24 x 32 with Set 363/555 Dots Pattern",2,null]
      ]
    },
    "partColors": {
      "cols": ["partId","colorId","hasImg"],
      "rows": [
        ["122c01",11,true],
        ["10p01",0,false]
      ]
    }
  }
}
```
