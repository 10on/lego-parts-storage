#!/usr/bin/env python3
"""
TSV to LCX Converter
Конвертер TSV данных BrickLink в LCX-Tabular формат согласно SPEC-PART-COLOR-MAP_v2.md
"""

import csv
import json
import gzip
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import argparse
import sys

class TSVToLCXConverter:
    def __init__(self):
        self.schema_version = 1
        self.source = "BrickLink"
        self.version = "2024.1"
        
        # Маппинг заголовков согласно спецификации
        self.header_mappings = {
            'part_color_codes': {
                'partId': ['Number', 'Item No', 'ItemNo', 'Part No', 'Part Number'],
                'colorId': ['Color ID', 'ColorID', 'Color Code'],
                'hasImg': ['Has Image', 'HasImage', 'Image', 'Img']
            },
            'colors': {
                'id': ['Color ID', 'ColorID'],
                'name': ['Color Name'],
                'rgb': ['RGB']
            },
            'parts': {
                'blId': ['Number', 'Item No', 'ItemNo'],
                'name': ['Name'],
                'catId': ['Category ID']
            }
        }
    
    def normalize_has_img(self, value: str) -> Optional[bool]:
        """Нормализует значение hasImg согласно спецификации"""
        if not value or value.strip() == '':
            return None
        
        value = value.strip().lower()
        if value in ['1', 'true', 'yes', 'y']:
            return True
        elif value in ['0', 'false', 'no', 'n']:
            return False
        else:
            return None
    
    def normalize_rgb(self, value: str) -> Optional[str]:
        """Нормализует RGB значение в HEX6 UPPERCASE без #"""
        if not value or value.strip() == '':
            return None
        
        value = value.strip().upper()
        # Убираем # если есть
        if value.startswith('#'):
            value = value[1:]
        
        # Проверяем формат HEX6
        if len(value) == 6 and all(c in '0123456789ABCDEF' for c in value):
            return value
        else:
            return None
    
    def find_column_index(self, headers: List[str], possible_names: List[str]) -> Optional[int]:
        """Находит индекс колонки по возможным названиям (case-insensitive)"""
        headers_lower = [h.strip().lower() for h in headers]
        possible_names_lower = [name.strip().lower() for name in possible_names]
        
        for i, header in enumerate(headers_lower):
            if header in possible_names_lower:
                return i
        
        return None
    
    def parse_tsv_file(self, file_path: Path, data_type: str) -> List[Dict[str, Any]]:
        """Парсит TSV файл и возвращает список объектов"""
        print(f"📖 Парсинг {file_path.name}...")
        
        if not file_path.exists():
            raise FileNotFoundError(f"Файл не найден: {file_path}")
        
        mapping = self.header_mappings.get(data_type, {})
        if not mapping:
            raise ValueError(f"Неизвестный тип данных: {data_type}")
        
        rows = []
        
        with open(file_path, 'r', encoding='utf-8') as f:
            # Читаем первую строку как заголовки
            headers = f.readline().strip().split('\t')
            
            # Находим индексы нужных колонок
            column_indices = {}
            for field, possible_names in mapping.items():
                idx = self.find_column_index(headers, possible_names)
                if idx is not None:
                    column_indices[field] = idx
                else:
                    print(f"⚠️  Колонка для поля '{field}' не найдена в {file_path.name}")
                    print(f"   Ожидаемые названия: {possible_names}")
                    print(f"   Найденные заголовки: {headers}")
            
            # Читаем данные
            reader = csv.reader(f, delimiter='\t')
            for row_num, row in enumerate(reader, start=2):
                if not row or all(cell.strip() == '' for cell in row):
                    continue  # Пропускаем пустые строки
                
                obj = {}
                for field, idx in column_indices.items():
                    if idx < len(row):
                        value = row[idx].strip()
                        
                        # Применяем специфичную нормализацию
                        if field == 'hasImg':
                            obj[field] = self.normalize_has_img(value)
                        elif field == 'rgb':
                            obj[field] = self.normalize_rgb(value)
                        elif field in ['id', 'colorId', 'catId']:
                            try:
                                obj[field] = int(value) if value else None
                            except ValueError:
                                obj[field] = None
                        else:
                            obj[field] = value if value else None
                    else:
                        obj[field] = None
                
                # Валидация обязательных полей
                if data_type == 'part_color_codes':
                    if not obj.get('partId') or obj.get('colorId') is None:
                        print(f"⚠️  Строка {row_num}: пропущена (отсутствуют обязательные поля)")
                        continue
                elif data_type == 'colors':
                    if obj.get('id') is None or not obj.get('name'):
                        print(f"⚠️  Строка {row_num}: пропущена (отсутствуют обязательные поля)")
                        continue
                elif data_type == 'parts':
                    if not obj.get('blId') or not obj.get('name') or obj.get('catId') is None:
                        print(f"⚠️  Строка {row_num}: пропущена (отсутствуют обязательные поля)")
                        continue
                
                rows.append(obj)
        
        print(f"✅ Обработано {len(rows)} строк из {file_path.name}")
        return rows
    
    def deduplicate_part_colors(self, part_colors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Дедупликация связей part-color согласно спецификации"""
        print("🔄 Дедупликация связей деталь-цвет...")
        
        # Группируем по ключу (partId, colorId)
        groups = {}
        for item in part_colors:
            key = (item['partId'], item['colorId'])
            if key not in groups:
                groups[key] = []
            groups[key].append(item)
        
        # Агрегируем hasImg по правилу "есть хотя бы одно true"
        deduplicated = []
        for key, items in groups.items():
            part_id, color_id = key
            
            # Агрегируем hasImg
            has_img_values = [item['hasImg'] for item in items if item['hasImg'] is not None]
            if has_img_values:
                has_img_agg = any(has_img_values)  # True если есть хотя бы одно true
            else:
                has_img_agg = None  # Если не было ни одного явного значения
            
            deduplicated.append({
                'partId': part_id,
                'colorId': color_id,
                'hasImg': has_img_agg
            })
        
        print(f"✅ Дедупликация завершена: {len(part_colors)} → {len(deduplicated)} связей")
        return deduplicated
    
    def validate_data(self, part_colors: List[Dict], colors: List[Dict], parts: List[Dict]) -> Dict[str, Any]:
        """Валидация данных и вычисление метрик качества"""
        print("🔍 Валидация данных...")
        
        # Создаем индексы для быстрого поиска
        color_ids = {color['id'] for color in colors if color.get('id') is not None}
        part_ids = {part['blId'] for part in parts if part.get('blId')}
        
        # Подсчитываем метрики
        total_links = len(part_colors)
        unique_parts = len(set(item['partId'] for item in part_colors))
        unique_colors = len(set(item['colorId'] for item in part_colors))
        
        # Проверяем неизвестные цвета
        unknown_colors = [item for item in part_colors if item['colorId'] not in color_ids]
        unknown_colors_pct = (len(unknown_colors) / total_links * 100) if total_links > 0 else 0
        
        # Проверяем неизвестные детали
        unknown_parts = [item for item in part_colors if item['partId'] not in part_ids]
        unknown_parts_pct = (len(unknown_parts) / total_links * 100) if total_links > 0 else 0
        
        # Статистика по hasImg
        has_img_true = len([item for item in part_colors if item['hasImg'] is True])
        has_img_null = len([item for item in part_colors if item['hasImg'] is None])
        has_img_true_pct = (has_img_true / total_links * 100) if total_links > 0 else 0
        has_img_null_pct = (has_img_null / total_links * 100) if total_links > 0 else 0
        
        metrics = {
            'links_total': total_links,
            'parts_total': unique_parts,
            'colors_total': unique_colors,
            'unknown_colors_count': len(unknown_colors),
            'unknown_colors_pct': round(unknown_colors_pct, 2),
            'unknown_parts_count': len(unknown_parts),
            'unknown_parts_pct': round(unknown_parts_pct, 2),
            'has_img_true_count': has_img_true,
            'has_img_true_pct': round(has_img_true_pct, 2),
            'has_img_null_count': has_img_null,
            'has_img_null_pct': round(has_img_null_pct, 2)
        }
        
        print("📊 Метрики качества:")
        print(f"   Связей всего: {metrics['links_total']:,}")
        print(f"   Уникальных деталей: {metrics['parts_total']:,}")
        print(f"   Уникальных цветов: {metrics['colors_total']:,}")
        print(f"   Неизвестных цветов: {metrics['unknown_colors_count']:,} ({metrics['unknown_colors_pct']}%)")
        print(f"   Неизвестных деталей: {metrics['unknown_parts_count']:,} ({metrics['unknown_parts_pct']}%)")
        print(f"   hasImg=true: {metrics['has_img_true_count']:,} ({metrics['has_img_true_pct']}%)")
        print(f"   hasImg=null: {metrics['has_img_null_count']:,} ({metrics['has_img_null_pct']}%)")
        
        return metrics
    
    def create_lcx_structure(self, part_colors: List[Dict], colors: List[Dict], parts: List[Dict], categories: List[Dict] = None) -> Dict[str, Any]:
        """Создает LCX структуру данных"""
        print("🏗️  Создание LCX структуры...")
        
        # Сортируем данные для стабильности
        part_colors_sorted = sorted(part_colors, key=lambda x: (x['partId'], x['colorId']))
        colors_sorted = sorted(colors, key=lambda x: x['id'])
        parts_sorted = sorted(parts, key=lambda x: x['blId'])
        
        lcx_data = {
            'schemaVersion': self.schema_version,
            'source': self.source,
            'version': self.version,
            'tables': {
                'partColors': {
                    'cols': ['partId', 'colorId', 'hasImg'],
                    'rows': [[item['partId'], item['colorId'], item['hasImg']] for item in part_colors_sorted]
                },
                'colors': {
                    'cols': ['id', 'name', 'rgb'],
                    'rows': [[item['id'], item['name'], item['rgb']] for item in colors_sorted]
                },
                'parts': {
                    'cols': ['blId', 'name', 'catId'],
                    'rows': [[item['blId'], item['name'], item['catId']] for item in parts_sorted]
                }
            }
        }
        
        # Добавляем категории если есть
        if categories:
            categories_sorted = sorted(categories, key=lambda x: x['id'])
            lcx_data['tables']['categories'] = {
                'cols': ['id', 'name'],
                'rows': [[item['id'], item['name']] for item in categories_sorted]
            }
        
        return lcx_data
    
    def convert(self, input_dir: Path, output_file: Path, compress: bool = True) -> Dict[str, Any]:
        """Основной метод конвертации"""
        print("🚀 TSV to LCX Converter (SPEC v2)")
        print("=" * 50)
        
        # Проверяем наличие обязательных файлов
        required_files = {
            'part_color_codes': input_dir / 'part_color_codes.tab'
        }
        
        optional_files = {
            'colors': input_dir / 'colors.tab',
            'parts': input_dir / 'parts.tab',
            'categories': input_dir / 'categories.tab'
        }
        
        missing_required = [name for name, path in required_files.items() if not path.exists()]
        if missing_required:
            raise FileNotFoundError(f"Отсутствуют обязательные файлы: {missing_required}")
        
        # Парсим данные
        part_colors = self.parse_tsv_file(required_files['part_color_codes'], 'part_color_codes')
        
        colors = []
        if optional_files['colors'].exists():
            colors = self.parse_tsv_file(optional_files['colors'], 'colors')
        
        parts = []
        if optional_files['parts'].exists():
            parts = self.parse_tsv_file(optional_files['parts'], 'parts')
        
        categories = []
        if optional_files['categories'].exists():
            categories = self.parse_tsv_file(optional_files['categories'], 'categories')
        
        # Дедупликация
        part_colors = self.deduplicate_part_colors(part_colors)
        
        # Валидация
        metrics = self.validate_data(part_colors, colors, parts)
        
        # Создание LCX структуры
        lcx_data = self.create_lcx_structure(part_colors, colors, parts, categories)
        
        # Сохранение
        print(f"💾 Сохранение в {output_file}...")
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        json_str = json.dumps(lcx_data, ensure_ascii=False, separators=(',', ':'))
        
        if compress:
            with gzip.open(output_file, 'wt', encoding='utf-8') as f:
                f.write(json_str)
            print(f"✅ Сжатый LCX файл сохранен: {output_file}")
        else:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(json_str)
            print(f"✅ LCX файл сохранен: {output_file}")
        
        # Добавляем метрики в результат
        lcx_data['metrics'] = metrics
        
        return lcx_data


def main():
    parser = argparse.ArgumentParser(description='Конвертер TSV данных BrickLink в LCX формат')
    parser.add_argument('input_dir', type=Path, help='Папка с TSV файлами BrickLink')
    parser.add_argument('-o', '--output', type=Path, default=Path('bricklink-catalog.lcx.json.gz'), 
                       help='Выходной LCX файл (по умолчанию: bricklink-catalog.lcx.json.gz)')
    parser.add_argument('--no-compress', action='store_true', help='Не сжимать выходной файл')
    
    args = parser.parse_args()
    
    try:
        converter = TSVToLCXConverter()
        result = converter.convert(args.input_dir, args.output, not args.no_compress)
        
        print("\n🎉 Конвертация завершена успешно!")
        print(f"📊 Итоговые метрики:")
        for key, value in result['metrics'].items():
            print(f"   {key}: {value}")
            
    except Exception as e:
        print(f"❌ Ошибка конвертации: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
