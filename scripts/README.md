# BrickLink Data Processing Scripts

Скрипты для работы с данными BrickLink согласно SPEC-PART-COLOR-MAP_v2.md

## Обзор

Этот набор скриптов реализует полный пайплайн обработки данных BrickLink:

1. **Скачивание данных** - получение TSV файлов с BrickLink
2. **Конвертация** - преобразование TSV в LCX формат
3. **Валидация** - проверка качества данных

## Скрипты

### 1. bricklink_python_fetcher.py

Скачивает данные с BrickLink согласно спецификации.

**Использование:**
```bash
python bricklink_python_fetcher.py
```

**Особенности:**
- Приоритизирует обязательные данные (Part & Color Codes)
- Использует cookies из Firefox для авторизации
- Проверяет наличие обязательных файлов
- Подробная отчетность о процессе

### 2. tsv_to_lcx_converter.py

Конвертирует TSV файлы BrickLink в LCX-Tabular формат.

**Использование:**
```bash
# Конвертация с сжатием (по умолчанию)
python tsv_to_lcx_converter.py bricklink_data/

# Конвертация без сжатия
python tsv_to_lcx_converter.py bricklink_data/ -o output.lcx.json --no-compress

# Указать выходной файл
python tsv_to_lcx_converter.py bricklink_data/ -o my-catalog.lcx.json.gz
```

**Особенности:**
- Строгое соответствие SPEC-PART-COLOR-MAP_v2.md
- Дедупликация связей part-color
- Валидация данных
- Вычисление метрик качества
- Поддержка сжатия gzip

### 3. validate_part_colors.py

Валидирует LCX файлы с данными partColors.

**Использование:**
```bash
# Валидация с подробным отчетом
python validate_part_colors.py bricklink-catalog.lcx.json.gz

# Валидация с выводом в JSON
python validate_part_colors.py bricklink-catalog.lcx.json.gz --json
```

**Особенности:**
- Проверка структуры LCX файла
- Валидация схемы таблицы partColors
- Проверка связанных таблиц (colors, parts)
- Вычисление метрик качества
- Детальная отчетность

## Полный пайплайн

```bash
# 1. Скачивание данных
python bricklink_python_fetcher.py

# 2. Конвертация в LCX
python tsv_to_lcx_converter.py bricklink_data/ -o bricklink-catalog.lcx.json.gz

# 3. Валидация результата
python validate_part_colors.py bricklink-catalog.lcx.json.gz
```

## Требования

- Python 3.7+
- Зависимости: `requests`, `browser_cookie3`
- Авторизация на BrickLink (cookies в Firefox)

## Структура данных

### Входные TSV файлы

- `part_color_codes.tab` - **ОБЯЗАТЕЛЬНО** - связи деталь-цвет
- `colors.tab` - **РЕКОМЕНДУЕМО** - справочник цветов
- `parts.tab` - **РЕКОМЕНДУЕМО** - справочник деталей
- `categories.tab` - **ОПЦИОНАЛЬНО** - категории

### Выходной LCX файл

```json
{
  "schemaVersion": 1,
  "source": "BrickLink",
  "version": "2024.1",
  "tables": {
    "partColors": {
      "cols": ["partId", "colorId", "hasImg"],
      "rows": [["122c01", 11, true], ...]
    },
    "colors": {
      "cols": ["id", "name", "rgb"],
      "rows": [[11, "Black", "000000"], ...]
    },
    "parts": {
      "cols": ["blId", "name", "catId"],
      "rows": [["122c01", "Brick 2x2", 1], ...]
    }
  },
  "metrics": {
    "total_links": 150000,
    "unique_parts": 5000,
    "unique_colors": 200,
    ...
  }
}
```

## Контроль качества

Все скрипты включают проверки качества данных:

- **Валидация схемы** - соответствие ожидаемым полям
- **Проверка типов** - корректность типов данных
- **Дедупликация** - удаление дубликатов
- **Связанность** - проверка ссылок между таблицами
- **Метрики** - статистика по качеству данных

## Обработка ошибок

- Детальное логирование всех операций
- Graceful handling некорректных данных
- Предупреждения о потенциальных проблемах
- Выходные коды для автоматизации

## Интеграция с фронтендом

Результирующий LCX файл совместим с:
- `LCXIndexedDBAdapter` - загрузка в IndexedDB
- `LCXParser` - парсинг данных
- Существующей системой управления деталями

## Документация

Подробная спецификация: [SPEC-PART-COLOR-MAP_v2.md](../docs/15_Part_Color_Map_Spec.md)
