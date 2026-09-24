#!/usr/bin/env python3
"""
BrickLink Data Fetcher
Скрипт для скачивания различных типов данных с BrickLink
"""

import requests
import browser_cookie3
from pathlib import Path

class BrickLinkFetcher:
    def __init__(self, use_firefox_cookies=True):
        self.base_url = "https://www.bricklink.com/catalogDownload.asp?a=a"
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.5,en;q=0.3',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://www.bricklink.com',
            'Referer': 'https://www.bricklink.com/catalogDownload.asp',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-User': '?1',
            'Priority': 'u=0, i',
            'TE': 'trailers'
        }
        
        # Создаем сессию
        self.session = requests.Session()
        self.session.headers.update(self.headers)
        
        # Загружаем cookies из Firefox
        if use_firefox_cookies:
            try:
                firefox_cookies = browser_cookie3.firefox(domain_name='bricklink.com')
                self.session.cookies.update(firefox_cookies)
                cookie_count = len([c for c in firefox_cookies])
                print(f"✅ Загружено {cookie_count} cookies из Firefox")
            except Exception as e:
                print(f"⚠️ Не удалось загрузить cookies из Firefox: {e}")
        
        # Добавляем дополнительные cookies для Part & Color Codes
        self.add_additional_cookies()
        
        # Типы данных для скачивания (согласно SPEC-PART-COLOR-MAP_v2.md)
        self.data_types = {
            # ОБЯЗАТЕЛЬНЫЕ данные
            'part_color_codes': {
                'viewType': '5',
                'itemType': 'S',
                'filename': 'part_color_codes.tab',
                'description': 'Part & Color Codes (ОБЯЗАТЕЛЬНО)',
                'required': True
            },
            # РЕКОМЕНДУЕМЫЕ данные
            'colors': {
                'viewType': '3',
                'itemType': 'S',
                'filename': 'colors.tab',
                'description': 'Colors (РЕКОМЕНДУЕМО)',
                'required': False
            },
            'parts': {
                'viewType': '0',
                'itemType': 'P',
                'filename': 'parts.tab',
                'description': 'Items (Parts) (РЕКОМЕНДУЕМО)',
                'required': False
            },
            # ДОПОЛНИТЕЛЬНЫЕ данные
            'categories': {
                'viewType': '2',
                'itemType': 'S',
                'filename': 'categories.tab',
                'description': 'Categories (ОПЦИОНАЛЬНО)',
                'required': False
            },
            'item_types': {
                'viewType': '1',
                'itemType': 'S',
                'filename': 'item_types.tab',
                'description': 'Item Types (ОПЦИОНАЛЬНО)',
                'required': False
            }
        }
    
    def add_additional_cookies(self):
        """Добавляет дополнительные cookies для доступа к Part & Color Codes"""
        # Сессия берется из cookies Firefox; здесь только настройки отображения каталога
        additional_cookies = {
            'catalogView': 'cView=1^&invView=1'
        }
        
        for name, value in additional_cookies.items():
            self.session.cookies.set(name, value, domain='.bricklink.com')
        
        print("✅ Добавлены дополнительные cookies для Part & Color Codes")
    
    def fetch_data(self, data_type, output_dir='bricklink_data'):
        """Скачивает данные определенного типа"""
        if data_type not in self.data_types:
            print(f"❌ Неизвестный тип данных: {data_type}")
            return False
        
        config = self.data_types[data_type]
        
        # Подготовка данных для POST-запроса
        data = {
            'viewType': config['viewType'],
            'itemType': config['itemType'],
            'itemTypeInv': config['itemType'],
            'itemNo': '',
            'downloadType': 'T'
        }
        
        # Специальная обработка для Part & Color Codes
        if data_type == 'part_color_codes':
            # Используем правильные параметры для Part & Color Codes
            data = {
                'itemType': 'S',
                'viewType': '5',
                'itemTypeInv': 'S',
                'itemNo': '',
                'downloadType': 'T'
            }
        
        print(f"📥 Скачиваю {config['description']}...")
        
        try:
            response = self.session.post(
                self.base_url,
                data=data,
                timeout=30
            )
            response.raise_for_status()
            
            # Проверяем, что получили TSV данные, а не HTML
            content_type = response.headers.get('content-type', '').lower()
            content_text = response.text[:200]  # Первые 200 символов для проверки
            
            if 'text/html' in content_type or content_text.strip().startswith('<!doctype html>'):
                print(f"⚠️  Получен HTML вместо TSV данных для {config['description']}")
                print(f"   Content-Type: {content_type}")
                print(f"   Начало ответа: {content_text[:100]}...")
                return False
            
            # Создаем папку если не существует
            Path(output_dir).mkdir(exist_ok=True)
            
            # Сохраняем файл
            filepath = Path(output_dir) / config['filename']
            with open(filepath, 'wb') as f:
                f.write(response.content)
            
            file_size = filepath.stat().st_size
            print(f"✅ {config['description']} сохранен ({file_size:,} bytes)")
            return True
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Ошибка при скачивании {config['description']}: {e}")
            return False
    
    def fetch_all(self, output_dir='bricklink_data'):
        """Скачивает все типы данных с приоритизацией обязательных"""
        print("🚀 BrickLink Data Fetcher (SPEC v2)")
        print("=" * 50)
        
        # Разделяем типы данных по приоритету
        required_types = [k for k, v in self.data_types.items() if v.get('required', False)]
        recommended_types = [k for k, v in self.data_types.items() if not v.get('required', False)]
        
        success_count = 0
        total_count = len(self.data_types)
        
        # Сначала скачиваем обязательные данные
        print("📥 Скачивание ОБЯЗАТЕЛЬНЫХ данных:")
        for data_type in required_types:
            if self.fetch_data(data_type, output_dir):
                success_count += 1
            print()
        
        # Затем рекомендуемые
        print("📥 Скачивание РЕКОМЕНДУЕМЫХ данных:")
        for data_type in recommended_types:
            if self.fetch_data(data_type, output_dir):
                success_count += 1
            print()
        
        print("=" * 50)
        print(f"✅ Готово! {success_count}/{total_count} файлов успешно скачано")
        
        # Проверяем наличие обязательных файлов
        output_path = Path(output_dir)
        missing_required = []
        for data_type in required_types:
            filename = self.data_types[data_type]['filename']
            if not (output_path / filename).exists():
                missing_required.append(filename)
        
        if missing_required:
            print(f"⚠️  ВНИМАНИЕ: Отсутствуют обязательные файлы: {', '.join(missing_required)}")
            print("   Без этих файлов невозможно построить карту допустимых цветов!")
        else:
            print("✅ Все обязательные файлы успешно скачаны")
        
        # Показываем информацию о файлах
        if output_path.exists():
            print(f"\n📁 Файлы сохранены в: {output_path.absolute()}")
            print("\n📋 Список файлов:")
            for file in sorted(output_path.glob("*.tab")):
                size = file.stat().st_size
                status = "✅" if file.name not in missing_required else "❌"
                print(f"   {status} {file.name:<25} {size:>10,} bytes")


def main():
    # Просто запускаем скачивание всех данных
    fetcher = BrickLinkFetcher(use_firefox_cookies=True)
    fetcher.fetch_all()


if __name__ == "__main__":
    main()