#!/usr/bin/env python3
"""
TAB to LCX Converter
Конвертирует скачанные TAB файлы от BrickLink в формат LCX-Tabular v1
"""

import json
import gzip
import csv
from datetime import datetime, timezone
from pathlib import Path

class TabToLCXConverter:
    def __init__(self, input_dir='bricklink_data'):
        self.input_dir = Path(input_dir)
        
    def read_tab_file(self, filename):
        """Читает TAB файл и возвращает заголовки и строки"""
        filepath = self.input_dir / filename
        
        if not filepath.exists():
            print(f"⚠️ Файл {filename} не найден")
            return [], []
            
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.reader(f, delimiter='\t')
            rows = list(reader)
            
        if not rows:
            return [], []
            
        # Удаляем пустые строки
        rows = [row for row in rows if any(cell.strip() for cell in row)]
        
        if len(rows) < 2:
            return [], []
            
        header = rows[0]
        data_rows = rows[1:]
        
        print(f"📁 {filename}: {len(data_rows)} строк, {len(header)} колонок")
        return header, data_rows
    
    def process_categories(self):
        """Обрабатывает категории"""
        header, rows = self.read_tab_file('categories.tab')
        
        if not rows:
            return ["id", "name"], []
            
        # Ожидаем: Category ID, Category Name
        cols = ["id", "name"]
        processed_rows = []
        
        for row in rows:
            if len(row) >= 2:
                try:
                    cat_id = int(row[0].strip()) if row[0].strip() else None
                    name = row[1].strip() if len(row) > 1 else ""
                    
                    if cat_id is not None and name:
                        processed_rows.append([cat_id, name])
                except ValueError:
                    continue
                    
        print(f"✅ Обработано {len(processed_rows)} категорий")
        return cols, processed_rows
    
    def process_colors(self):
        """Обрабатывает цвета"""
        header, rows = self.read_tab_file('colors.tab')
        
        if not rows:
            return ["id", "name", "rgb", "type", "parts", "inSets", "wanted", "forSale", "yearFrom", "yearTo"], []
            
        # Ожидаем: Color ID, Color Name, RGB, Type, Parts, In Sets, Wanted, For Sale, Year From, Year To
        cols = ["id", "name", "rgb", "type", "parts", "inSets", "wanted", "forSale", "yearFrom", "yearTo"]
        processed_rows = []
        
        for row in rows:
            if len(row) >= 10:
                try:
                    color_id = int(row[0].strip()) if row[0].strip() else None
                    name = row[1].strip() if len(row) > 1 else ""
                    rgb = row[2].strip() if len(row) > 2 and row[2].strip() else None
                    color_type = row[3].strip() if len(row) > 3 else ""
                    parts = int(row[4].strip()) if len(row) > 4 and row[4].strip() else 0
                    in_sets = int(row[5].strip()) if len(row) > 5 and row[5].strip() else 0
                    wanted = int(row[6].strip()) if len(row) > 6 and row[6].strip() else 0
                    for_sale = int(row[7].strip()) if len(row) > 7 and row[7].strip() else 0
                    year_from = int(row[8].strip()) if len(row) > 8 and row[8].strip() else None
                    year_to = int(row[9].strip()) if len(row) > 9 and row[9].strip() else None
                    
                    if color_id is not None and name:
                        processed_rows.append([
                            color_id, name, rgb, color_type, parts, 
                            in_sets, wanted, for_sale, year_from, year_to
                        ])
                except ValueError:
                    continue
                    
        print(f"✅ Обработано {len(processed_rows)} цветов")
        return cols, processed_rows
    
    def process_parts(self):
        """Обрабатывает детали"""
        header, rows = self.read_tab_file('parts.tab')
        
        if not rows:
            return ["blId", "name", "catId", "alt"], []
            
        # Ожидаем: Category ID, Category Name, Number, Name, Alternate Item Number
        cols = ["blId", "name", "catId", "alt"]
        processed_rows = []
        
        for row in rows:
            if len(row) >= 4:
                try:
                    cat_id = int(row[0].strip()) if row[0].strip() else None
                    # category_name = row[1].strip() если нужно
                    number = row[2].strip() if len(row) > 2 else ""
                    name = row[3].strip() if len(row) > 3 else ""
                    alt = row[4].strip() if len(row) > 4 and row[4].strip() else None
                    
                    # Обрабатываем альтернативные номера
                    alt_list = None
                    if alt:
                        # Разделяем по запятым и очищаем
                        alt_parts = [p.strip() for p in alt.split(',') if p.strip()]
                        alt_list = alt_parts if alt_parts else None
                    
                    if number and name and cat_id is not None:
                        processed_rows.append([number, name, cat_id, alt_list])
                except ValueError:
                    continue
                    
        print(f"✅ Обработано {len(processed_rows)} деталей")
        return cols, processed_rows
    
    def process_part_colors(self):
        """Обрабатывает связи деталь-цвет"""
        header, rows = self.read_tab_file('part_color_codes.tab')
        
        if not rows:
            return ["partId", "colorId", "hasImg"], []
            
        # Ожидаем: Item No, Color, Code
        # Создаем маппинг названий цветов к ID (загружаем из colors.tab)
        color_name_to_id = {}
        _, color_rows = self.read_tab_file('colors.tab')
        for color_row in color_rows:
            if len(color_row) >= 2:
                try:
                    color_id = int(color_row[0].strip())
                    color_name = color_row[1].strip()
                    color_name_to_id[color_name] = color_id
                except ValueError:
                    continue
        
        cols = ["partId", "colorId", "hasImg"]
        processed_rows = []
        
        for row in rows:
            if len(row) >= 2:
                try:
                    part_id = row[0].strip() if row[0].strip() else None
                    color_name = row[1].strip() if len(row) > 1 else ""
                    
                    # Ищем ID цвета по названию
                    color_id = color_name_to_id.get(color_name)
                    
                    if part_id and color_id is not None:
                        processed_rows.append([part_id, color_id, True])  # hasImg = True по умолчанию
                except (ValueError, IndexError):
                    continue
                    
        print(f"✅ Обработано {len(processed_rows)} связей деталь-цвет")
        return cols, processed_rows
    
    def create_lcx_container(self, categories, colors, parts, part_colors):
        """Создает LCX контейнер"""
        return {
            "schemaVersion": 1,
            "source": "bricklink",
            "version": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "tables": {
                "categories": {
                    "cols": categories[0],
                    "rows": categories[1]
                },
                "colors": {
                    "cols": colors[0], 
                    "rows": colors[1]
                },
                "parts": {
                    "cols": parts[0],
                    "rows": parts[1]
                },
                "partColors": {
                    "cols": part_colors[0],
                    "rows": part_colors[1]
                }
            }
        }
    
    def convert_to_lcx(self, output_file='data/bricklink-catalog.lcx.json.gz'):
        """Конвертирует все TAB файлы в LCX формат"""
        print("🚀 TAB to LCX Converter")
        print("=" * 50)
        
        # Обрабатываем все типы данных
        categories = self.process_categories()
        colors = self.process_colors()
        parts = self.process_parts()
        part_colors = self.process_part_colors()
        
        # Создаем LCX контейнер
        lcx_data = self.create_lcx_container(categories, colors, parts, part_colors)
        
        # Создаем выходную папку
        output_path = Path(output_file)
        output_path.parent.mkdir(exist_ok=True)
        
        # Сохраняем файл
        json_str = json.dumps(lcx_data, ensure_ascii=False, separators=(',', ':'))
        
        if output_file.endswith('.gz'):
            with gzip.open(output_path, 'wt', encoding='utf-8') as f:
                f.write(json_str)
        else:
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write(json_str)
        
        # Статистика
        file_size = output_path.stat().st_size
        total_items = len(categories[1]) + len(colors[1]) + len(parts[1]) + len(part_colors[1])
        
        print("=" * 50)
        print(f"✅ LCX файл создан: {output_path.absolute()}")
        print(f"📊 Размер файла: {file_size:,} bytes")
        print(f"📈 Всего элементов: {total_items:,}")
        print(f"   - Категории: {len(categories[1]):,}")
        print(f"   - Цвета: {len(colors[1]):,}")  
        print(f"   - Детали: {len(parts[1]):,}")
        print(f"   - Связи деталь-цвет: {len(part_colors[1]):,}")
        
        return output_path


def main():
    converter = TabToLCXConverter('bricklink_data')
    converter.convert_to_lcx('data/bricklink-catalog.lcx.json.gz')


if __name__ == "__main__":
    main()
