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
            'Content-Type': 'application/x-www-form-urlencoded',
            'Origin': 'https://www.bricklink.com',
            'Referer': 'https://www.bricklink.com/catalogDownload.asp',
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
        
        # Типы данных для скачивания (согласно HTML форме)
        self.data_types = {
            'item_types': {
                'viewType': '1',
                'itemType': 'S',
                'filename': 'item_types.tab',
                'description': 'Типы элементов'
            },
            'categories': {
                'viewType': '2',
                'itemType': 'S',
                'filename': 'categories.tab',
                'description': 'Категории'
            },
            'colors': {
                'viewType': '3',
                'itemType': 'S',
                'filename': 'colors.tab',
                'description': 'Цвета'
            },
            'parts': {
                'viewType': '0',
                'itemType': 'P',
                'filename': 'parts.tab',
                'description': 'Детали (Parts)'
            },
            'part_color_codes': {
                'viewType': '5',
                'itemType': 'S',
                'filename': 'part_color_codes.tab',
                'description': 'Коды деталей и цветов'
            }
        }
    
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
        
        print(f"📥 Скачиваю {config['description']}...")
        
        try:
            response = self.session.post(
                self.base_url,
                data=data,
                timeout=30
            )
            response.raise_for_status()
            
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
        """Скачивает все типы данных"""
        print("🚀 BrickLink Data Fetcher")
        print("=" * 40)
        
        success_count = 0
        total_count = len(self.data_types)
        
        for data_type in self.data_types.keys():
            if self.fetch_data(data_type, output_dir):
                success_count += 1
            print()  # Пустая строка для разделения
        
        print("=" * 40)
        print(f"✅ Готово! {success_count}/{total_count} файлов успешно скачано")
        
        # Показываем информацию о файлах
        output_path = Path(output_dir)
        if output_path.exists():
            print(f"\n📁 Файлы сохранены в: {output_path.absolute()}")
            print("\n📋 Список файлов:")
            for file in sorted(output_path.glob("*.tab")):
                size = file.stat().st_size
                print(f"   {file.name:<25} {size:>10,} bytes")


def main():
    # Просто запускаем скачивание всех данных
    fetcher = BrickLinkFetcher(use_firefox_cookies=True)
    fetcher.fetch_all()


if __name__ == "__main__":
    main()