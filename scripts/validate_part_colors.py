#!/usr/bin/env python3
"""
Part Colors Validator
Инструмент валидации данных partColors согласно SPEC-PART-COLOR-MAP_v2.md
"""

import json
import gzip
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import argparse
import sys

class PartColorsValidator:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.metrics = {}
    
    def validate_lcx_file(self, lcx_file: Path) -> Dict[str, Any]:
        """Валидирует LCX файл с данными partColors"""
        print(f"🔍 Валидация LCX файла: {lcx_file}")
        
        # Загружаем LCX файл
        try:
            if lcx_file.suffix == '.gz':
                with gzip.open(lcx_file, 'rt', encoding='utf-8') as f:
                    lcx_data = json.load(f)
            else:
                with open(lcx_file, 'r', encoding='utf-8') as f:
                    lcx_data = json.load(f)
        except Exception as e:
            self.errors.append(f"Ошибка загрузки LCX файла: {e}")
            return self.get_validation_result()
        
        # Проверяем структуру LCX
        self.validate_lcx_structure(lcx_data)
        
        # Валидируем таблицу partColors
        if 'tables' in lcx_data and 'partColors' in lcx_data['tables']:
            self.validate_part_colors_table(lcx_data['tables']['partColors'])
        else:
            self.errors.append("Отсутствует таблица partColors в LCX файле")
        
        # Валидируем связанные таблицы
        if 'tables' in lcx_data:
            if 'colors' in lcx_data['tables']:
                self.validate_colors_table(lcx_data['tables']['colors'])
            if 'parts' in lcx_data['tables']:
                self.validate_parts_table(lcx_data['tables']['parts'])
        
        return self.get_validation_result()
    
    def validate_lcx_structure(self, lcx_data: Dict[str, Any]):
        """Валидирует базовую структуру LCX файла"""
        required_fields = ['schemaVersion', 'source', 'version', 'tables']
        
        for field in required_fields:
            if field not in lcx_data:
                self.errors.append(f"Отсутствует обязательное поле: {field}")
        
        # Проверяем версию схемы
        if 'schemaVersion' in lcx_data and lcx_data['schemaVersion'] != 1:
            self.warnings.append(f"Неподдерживаемая версия схемы: {lcx_data['schemaVersion']}")
    
    def validate_part_colors_table(self, part_colors_table: Dict[str, Any]):
        """Валидирует таблицу partColors согласно спецификации"""
        if 'cols' not in part_colors_table or 'rows' not in part_colors_table:
            self.errors.append("Таблица partColors должна содержать поля 'cols' и 'rows'")
            return
        
        # Проверяем схему колонок
        expected_cols = ['partId', 'colorId', 'hasImg']
        if part_colors_table['cols'] != expected_cols:
            self.errors.append(f"Неверная схема колонок partColors. Ожидается: {expected_cols}, получено: {part_colors_table['cols']}")
            return
        
        rows = part_colors_table['rows']
        if not isinstance(rows, list):
            self.errors.append("Поле 'rows' должно быть массивом")
            return
        
        # Валидируем каждую строку
        for i, row in enumerate(rows):
            self.validate_part_color_row(row, i + 1)
        
        # Вычисляем метрики
        self.compute_part_colors_metrics(rows)
    
    def validate_part_color_row(self, row: List[Any], row_num: int):
        """Валидирует одну строку таблицы partColors"""
        if not isinstance(row, list) or len(row) != 3:
            self.errors.append(f"Строка {row_num}: должна быть массивом из 3 элементов")
            return
        
        part_id, color_id, has_img = row
        
        # Валидация partId
        if not isinstance(part_id, str) or not part_id.strip():
            self.errors.append(f"Строка {row_num}: partId должен быть непустой строкой")
        elif part_id != part_id.strip():
            self.warnings.append(f"Строка {row_num}: partId содержит лишние пробелы")
        
        # Валидация colorId
        if not isinstance(color_id, int) or color_id < 0:
            self.errors.append(f"Строка {row_num}: colorId должен быть целым числом >= 0")
        
        # Валидация hasImg
        if has_img is not None and not isinstance(has_img, bool):
            self.errors.append(f"Строка {row_num}: hasImg должен быть true, false или null")
    
    def validate_colors_table(self, colors_table: Dict[str, Any]):
        """Валидирует таблицу colors"""
        if 'cols' not in colors_table or 'rows' not in colors_table:
            return
        
        expected_cols = ['id', 'name', 'rgb']
        if colors_table['cols'] != expected_cols:
            self.warnings.append(f"Неожиданная схема колонок colors: {colors_table['cols']}")
            return
        
        # Создаем индекс цветов для валидации partColors
        self.color_ids = set()
        for row in colors_table['rows']:
            if len(row) >= 1 and isinstance(row[0], int):
                self.color_ids.add(row[0])
    
    def validate_parts_table(self, parts_table: Dict[str, Any]):
        """Валидирует таблицу parts"""
        if 'cols' not in parts_table or 'rows' not in parts_table:
            return
        
        expected_cols = ['blId', 'name', 'catId']
        if parts_table['cols'] != expected_cols:
            self.warnings.append(f"Неожиданная схема колонок parts: {parts_table['cols']}")
            return
        
        # Создаем индекс деталей для валидации partColors
        self.part_ids = set()
        for row in parts_table['rows']:
            if len(row) >= 1 and isinstance(row[0], str):
                self.part_ids.add(row[0])
    
    def compute_part_colors_metrics(self, rows: List[List[Any]]):
        """Вычисляет метрики качества данных"""
        total_links = len(rows)
        unique_parts = set()
        unique_colors = set()
        has_img_true = 0
        has_img_false = 0
        has_img_null = 0
        unknown_colors = 0
        unknown_parts = 0
        
        for row in rows:
            if len(row) >= 3:
                part_id, color_id, has_img = row
                
                unique_parts.add(part_id)
                unique_colors.add(color_id)
                
                if has_img is True:
                    has_img_true += 1
                elif has_img is False:
                    has_img_false += 1
                else:
                    has_img_null += 1
                
                # Проверяем на неизвестные цвета и детали
                if hasattr(self, 'color_ids') and color_id not in self.color_ids:
                    unknown_colors += 1
                
                if hasattr(self, 'part_ids') and part_id not in self.part_ids:
                    unknown_parts += 1
        
        self.metrics = {
            'total_links': total_links,
            'unique_parts': len(unique_parts),
            'unique_colors': len(unique_colors),
            'has_img_true': has_img_true,
            'has_img_false': has_img_false,
            'has_img_null': has_img_null,
            'unknown_colors': unknown_colors,
            'unknown_parts': unknown_parts,
            'unknown_colors_pct': (unknown_colors / total_links * 100) if total_links > 0 else 0,
            'unknown_parts_pct': (unknown_parts / total_links * 100) if total_links > 0 else 0
        }
    
    def get_validation_result(self) -> Dict[str, Any]:
        """Возвращает результат валидации"""
        return {
            'valid': len(self.errors) == 0,
            'errors': self.errors,
            'warnings': self.warnings,
            'metrics': self.metrics
        }
    
    def print_validation_report(self, result: Dict[str, Any]):
        """Выводит отчет о валидации"""
        print("\n" + "=" * 60)
        print("📊 ОТЧЕТ О ВАЛИДАЦИИ")
        print("=" * 60)
        
        if result['valid']:
            print("✅ Валидация пройдена успешно!")
        else:
            print("❌ Обнаружены ошибки валидации!")
        
        # Ошибки
        if result['errors']:
            print(f"\n🚨 ОШИБКИ ({len(result['errors'])}):")
            for i, error in enumerate(result['errors'], 1):
                print(f"   {i}. {error}")
        
        # Предупреждения
        if result['warnings']:
            print(f"\n⚠️  ПРЕДУПРЕЖДЕНИЯ ({len(result['warnings'])}):")
            for i, warning in enumerate(result['warnings'], 1):
                print(f"   {i}. {warning}")
        
        # Метрики
        if result['metrics']:
            print(f"\n📈 МЕТРИКИ КАЧЕСТВА:")
            metrics = result['metrics']
            print(f"   Связей всего: {metrics.get('total_links', 0):,}")
            print(f"   Уникальных деталей: {metrics.get('unique_parts', 0):,}")
            print(f"   Уникальных цветов: {metrics.get('unique_colors', 0):,}")
            print(f"   hasImg=true: {metrics.get('has_img_true', 0):,}")
            print(f"   hasImg=false: {metrics.get('has_img_false', 0):,}")
            print(f"   hasImg=null: {metrics.get('has_img_null', 0):,}")
            print(f"   Неизвестных цветов: {metrics.get('unknown_colors', 0):,} ({metrics.get('unknown_colors_pct', 0):.1f}%)")
            print(f"   Неизвестных деталей: {metrics.get('unknown_parts', 0):,} ({metrics.get('unknown_parts_pct', 0):.1f}%)")
        
        print("=" * 60)
        
        return result['valid']


def main():
    parser = argparse.ArgumentParser(description='Валидатор данных partColors')
    parser.add_argument('lcx_file', type=Path, help='LCX файл для валидации')
    parser.add_argument('--json', action='store_true', help='Вывести результат в JSON формате')
    
    args = parser.parse_args()
    
    if not args.lcx_file.exists():
        print(f"❌ Файл не найден: {args.lcx_file}")
        sys.exit(1)
    
    validator = PartColorsValidator()
    result = validator.validate_lcx_file(args.lcx_file)
    
    if args.json:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        is_valid = validator.print_validation_report(result)
        sys.exit(0 if is_valid else 1)


if __name__ == "__main__":
    main()
