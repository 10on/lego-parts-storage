/**
 * LCX-compatible IndexedDB Adapter
 * Расширение IndexedDBAdapter для поддержки LCX-Tabular формата
 */

class LCXIndexedDBAdapter {
    constructor(dbName = 'BrickLinkDB', version = 2) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.lcxParser = new LCXParser();
    }

    /**
     * Инициализация базы данных с поддержкой LCX структуры
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ LCX IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Создаем/обновляем хранилище для категорий
                if (!db.objectStoreNames.contains('categories')) {
                    const categoriesStore = db.createObjectStore('categories', { keyPath: 'id' });
                    categoriesStore.createIndex('name', 'name', { unique: false });
                }

                // Создаем/обновляем хранилище для цветов
                if (!db.objectStoreNames.contains('colors')) {
                    const colorsStore = db.createObjectStore('colors', { keyPath: 'id' });
                    colorsStore.createIndex('name', 'name', { unique: false });
                    colorsStore.createIndex('parts', 'parts', { unique: false });
                    colorsStore.createIndex('type', 'type', { unique: false });
                } else if (event.oldVersion < 2) {
                    // Обновляем схему для v2
                    const transaction = event.target.transaction;
                    const colorsStore = transaction.objectStore('colors');
                    if (!colorsStore.indexNames.contains('type')) {
                        colorsStore.createIndex('type', 'type', { unique: false });
                    }
                }

                // Создаем/обновляем хранилище для деталей
                if (!db.objectStoreNames.contains('parts')) {
                    const partsStore = db.createObjectStore('parts', { keyPath: 'partId' });
                    partsStore.createIndex('name', 'name', { unique: false });
                    partsStore.createIndex('catId', 'catId', { unique: false });
                    partsStore.createIndex('blId', 'blId', { unique: false });
                    partsStore.createIndex('nameAndId', ['name', 'partId'], { unique: false });
                } else if (event.oldVersion < 2) {
                    // Обновляем схему для v2
                    const transaction = event.target.transaction;
                    const partsStore = transaction.objectStore('parts');
                    if (!partsStore.indexNames.contains('catId')) {
                        partsStore.createIndex('catId', 'catId', { unique: false });
                    }
                    if (!partsStore.indexNames.contains('blId')) {
                        partsStore.createIndex('blId', 'blId', { unique: false });
                    }
                }

                // Создаем хранилище для связей деталь-цвет (новое в v2)
                if (!db.objectStoreNames.contains('partColors')) {
                    const partColorsStore = db.createObjectStore('partColors', { keyPath: ['partId', 'colorId'] });
                    partColorsStore.createIndex('partId', 'partId', { unique: false });
                    partColorsStore.createIndex('colorId', 'colorId', { unique: false });
                    partColorsStore.createIndex('hasImg', 'hasImg', { unique: false });
                    // Составной индекс для быстрого поиска по детали и наличию изображения
                    partColorsStore.createIndex('partId_hasImg', ['partId', 'hasImg'], { unique: false });
                }

                // Создаем/обновляем хранилище для метаданных
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }

                console.log('📦 LCX IndexedDB schema created/updated');
            };
        });
    }

    /**
     * Загружает данные из LCX файла с отображением прогресса
     */
    async loadFromLCX(lcxFile, progressCallback = null) {
        console.log('🔄 Loading data from LCX to IndexedDB...');
        
        try {
            // Шаг 1: Инициализация
            if (progressCallback) progressCallback(1, 0, 'Инициализация базы данных...');
            await this.init();
            
            // Шаг 2: Парсинг файла
            if (progressCallback) progressCallback(2, 0, 'Парсинг LCX файла...');
            const transformedData = await this.lcxParser.parse(lcxFile, progressCallback);
            
            // Шаг 3-6: Сохранение данных (шаги 3-6 в saveLCXData)
            if (progressCallback) progressCallback(3, 0, 'Начинаем сохранение данных...');
            await this.saveLCXData(transformedData, progressCallback);
            
            // Шаг 7: Финализация
            if (progressCallback) progressCallback(7, 0, 'Обновление метаданных...');
            await this.setMetadata('lastUpdate', { 
                timestamp: Date.now(),
                source: 'lcx',
                version: transformedData.metadata.version
            });
            await this.setMetadata('lcxMetadata', transformedData.metadata);

            if (progressCallback) progressCallback(8, 100, 'Загрузка завершена!');
            
            const stats = this.lcxParser.getStats(transformedData);
            console.log('✅ LCX data loaded to IndexedDB:', stats);
            
            return stats;
        } catch (error) {
            console.error('❌ Failed to load LCX data:', error);
            if (progressCallback) progressCallback(-1, 0, `Ошибка: ${error.message}`);
            throw error;
        }
    }

    /**
     * Сохраняет LCX данные в IndexedDB с отображением прогресса
     */
    async saveLCXData(transformedData, progressCallback = null) {
        try {
            // Очищаем старые данные
            if (progressCallback) progressCallback(6, 10, 'Очистка старых данных...');
            await Promise.all([
                this.clearStore('categories'),
                this.clearStore('colors'), 
                this.clearStore('parts'),
                this.clearStore('partColors')
            ]);

            // Шаг 4: Сохраняем категории
            if (progressCallback) progressCallback(4, 0, `Категории: подготовка к сохранению ${transformedData.categories.length} записей...`);
            await this.saveBulkDataWithProgress('categories', transformedData.categories, progressCallback);
            console.log(`📦 Saved ${transformedData.categories.length} categories`);

            // Шаг 5: Сохраняем цвета
            if (progressCallback) progressCallback(5, 0, `Цвета: подготовка к сохранению ${transformedData.colors.length} записей...`);
            await this.saveBulkDataWithProgress('colors', transformedData.colors, progressCallback);
            console.log(`🎨 Saved ${transformedData.colors.length} colors`);

            // Шаг 6: Сохраняем детали (самый большой массив)
            if (progressCallback) progressCallback(6, 0, `Детали: подготовка к сохранению ${transformedData.parts.length} записей...`);
            await this.saveBulkDataWithProgress('parts', transformedData.parts, progressCallback);
            console.log(`🧱 Saved ${transformedData.parts.length} parts`);

            // Шаг 7: Сохраняем связи деталь-цвет (если есть)
            if (transformedData.partColors && transformedData.partColors.length > 0) {
                if (progressCallback) progressCallback(7, 0, `Связи деталь-цвет: подготовка к сохранению ${transformedData.partColors.length} записей...`);
                await this.saveBulkDataWithProgress('partColors', transformedData.partColors, progressCallback);
                console.log(`🔗 Saved ${transformedData.partColors.length} part-color relations`);
            } else {
                if (progressCallback) progressCallback(7, 0, 'Связи деталь-цвет отсутствуют');
            }

            console.log('✅ All LCX data saved to IndexedDB');
        } catch (error) {
            console.error('Ошибка сохранения LCX данных:', error);
            throw error;
        }
    }

    /**
     * Массовое сохранение данных с отслеживанием прогресса
     */
    async saveBulkDataWithProgress(storeName, data, progressCallback) {
        const batchSize = 100; // Уменьшаем размер батча для более частых обновлений
        const totalItems = data.length;
        let processedItems = 0;
        
        for (let i = 0; i < totalItems; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            // Создаем новую транзакцию для каждого батча
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Сохраняем батч (используем put вместо add для избежания ошибок дубликатов)
            await Promise.all(batch.map(item => {
                return new Promise((resolve, reject) => {
                    const request = store.put(item);
                    request.onsuccess = () => resolve();
                    request.onerror = () => {
                        console.warn(`⚠️ Failed to save item to ${storeName}:`, request.error);
                        resolve(); // Продолжаем выполнение даже при ошибке
                    };
                });
            }));
            
            // Ждем завершения транзакции
            await this.waitForTransaction(transaction);
            
            processedItems += batch.length;
            
            const progress = Math.min(100, Math.round((processedItems / totalItems) * 100));
            if (progressCallback) {
                const stepNumber = this.getStepNumberForStore(storeName);
                const dataTypeName = this.getDataTypeName(storeName);
                progressCallback(stepNumber, progress, `${dataTypeName}: сохранено ${processedItems} из ${totalItems} записей`);
            }
            
            // Даем браузеру время на обновление UI каждые 2 батча
            if (i % (batchSize * 2) === 0) {
                await new Promise(resolve => setTimeout(resolve, 5));
            }
        }
    }

    /**
     * Получает номер шага для конкретного хранилища
     */
    getStepNumberForStore(storeName) {
        const stepMap = {
            'categories': 4,
            'colors': 5,
            'parts': 6,
            'partColors': 7
        };
        return stepMap[storeName] || 4;
    }

    /**
     * Получает название типа данных для отображения
     */
    getDataTypeName(storeName) {
        const typeMap = {
            'categories': 'Категории',
            'colors': 'Цвета',
            'parts': 'Детали',
            'partColors': 'Связи деталь-цвет'
        };
        return typeMap[storeName] || 'Данные';
    }

    /**
     * Поиск деталей с улучшенными возможностями
     */
    async searchParts(query, limit = 50, options = {}) {
        if (!query || query.length < 2) return [];

        const transaction = this.db.transaction(['parts', 'categories'], 'readonly');
        const partsStore = transaction.objectStore('parts');
        const categoriesStore = transaction.objectStore('categories');
        
        // Получаем категории для обогащения данных
        const categories = await this.getAllFromStore(categoriesStore);
        const categoryMap = new Map(categories.map(cat => [cat.id, cat.name]));
        
        const results = [];
        const searchQuery = query.toLowerCase();

        const request = partsStore.openCursor();
        
        return new Promise((resolve) => {
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor && results.length < limit) {
                    const part = cursor.value;
                    const categoryName = categoryMap.get(part.catId) || 'Unknown';
                    
                    const matchesBlId = part.blId.toLowerCase().includes(searchQuery);
                    const matchesPartId = part.partId && part.partId.toLowerCase().includes(searchQuery);
                    const matchesName = part.name.toLowerCase().includes(searchQuery);
                    const matchesCategory = categoryName.toLowerCase().includes(searchQuery);

                    if (matchesBlId || matchesPartId || matchesName || matchesCategory) {
                        results.push({
                            value: part.partId || part.blId,
                            label: `${part.blId} - ${part.name}`,
                            category: categoryName,
                            data: {
                                ...part,
                                categoryName
                            }
                        });
                    }
                    
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
        });
    }

    /**
     * Поиск цветов с улучшенными возможностями
     */
    async searchColors(query, limit = 20, options = {}) {
        const transaction = this.db.transaction(['colors'], 'readonly');
        const store = transaction.objectStore('colors');
        
        if (!query || query.length < 1) {
            // Возвращаем популярные цвета
            return this.getPopularColors(limit);
        }

        const results = [];
        const searchQuery = query.toLowerCase();
        const request = store.openCursor();

        return new Promise((resolve) => {
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor && results.length < limit) {
                    const color = cursor.value;
                    const matchesName = color.name.toLowerCase().includes(searchQuery);
                    const matchesId = String(color.id).includes(searchQuery);
                    const matchesType = color.type && color.type.toLowerCase().includes(searchQuery);

                    if (matchesName || matchesId || matchesType) {
                        results.push({
                            value: color.name,
                            label: color.name,
                            rgb: color.rgb,
                            type: color.type,
                            data: color
                        });
                    }
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
        });
    }

    /**
     * Получить популярные цвета
     */
    async getPopularColors(limit = 20) {
        const transaction = this.db.transaction(['colors'], 'readonly');
        const store = transaction.objectStore('colors');
        const index = store.index('parts');
        
        const results = [];
        const request = index.openCursor(null, 'prev');

        return new Promise((resolve) => {
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor && results.length < limit) {
                    const color = cursor.value;
                    results.push({
                        value: color.name,
                        label: color.name,
                        rgb: color.rgb,
                        type: color.type,
                        data: color
                    });
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
        });
    }

    /**
     * Получить все элементы из store
     */
    async getAllFromStore(store) {
        return new Promise((resolve) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    /**
     * Получить категорию по ID
     */
    async getCategoryById(categoryId) {
        const transaction = this.db.transaction(['categories'], 'readonly');
        const store = transaction.objectStore('categories');
        
        return new Promise((resolve) => {
            const request = store.get(categoryId);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Получить деталь по ID
     */
    async getPartById(partId) {
        if (!this.db) return null;
        
        const transaction = this.db.transaction(['parts'], 'readonly');
        const store = transaction.objectStore('parts');
        
        return new Promise((resolve) => {
            const request = store.get(partId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    }

    /**
     * Получить цвет по имени
     */
    async getColorByName(colorName) {
        if (!this.db) return null;
        
        const transaction = this.db.transaction(['colors'], 'readonly');
        const store = transaction.objectStore('colors');
        const index = store.index('name');
        
        return new Promise((resolve) => {
            const request = index.get(colorName);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    }

    /**
     * Получить цвет по ID
     */
    async getColorById(colorId) {
        if (!this.db) return null;
        
        const transaction = this.db.transaction(['colors'], 'readonly');
        const store = transaction.objectStore('colors');
        
        return new Promise((resolve) => {
            const request = store.get(parseInt(colorId));
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    }

    /**
     * Получить расширенную статистику
     */
    async getStats() {
        const [partsCount, colorsCount, categoriesCount, partColorsCount] = await Promise.all([
            this.getStoreCount('parts'),
            this.getStoreCount('colors'),
            this.getStoreCount('categories'),
            this.db.objectStoreNames.contains('partColors') ? this.getStoreCount('partColors') : 0
        ]);
        
        const lastUpdate = await this.getMetadata('lastUpdate');
        const lcxMetadata = await this.getMetadata('lcxMetadata');
        
        return {
            parts: partsCount,
            colors: colorsCount,
            categories: categoriesCount,
            partColors: partColorsCount,
            lastUpdate,
            lcxMetadata,
            source: lcxMetadata?.source || 'unknown',
            version: lcxMetadata?.version || 'unknown'
        };
    }

    /**
     * Определяет тип данных для загрузки
     */
    async loadData(progressCallback = null) {
        if (this.isLoaded) return;

        try {
            await this.init();
            
            // Проверяем, есть ли LCX данные
            const lcxMetadata = await this.getMetadata('lcxMetadata');
            const hasData = await this.hasExistingData();
            
            if (lcxMetadata && hasData) {
                console.log('✅ LCX data found in IndexedDB, skipping download');
                this.isLoaded = true;
                const stats = await this.getStats();
                console.log(`📊 Loaded from IndexedDB: ${stats.parts} parts, ${stats.colors} colors, ${stats.categories} categories`);
                return stats;
            }
            
            // Если есть метаданные, но нет данных - очищаем метаданные
            if (lcxMetadata && !hasData) {
                console.log('🧹 Clearing outdated metadata...');
                await this.setMetadata('lcxMetadata', null);
                console.log('⚠️ LCX metadata found but no actual data, will reload');
            } else {
                console.log('📥 No LCX data found, will load LCX file...');
            }

            // Очищаем существующие данные перед загрузкой
            console.log('🧹 Clearing existing data before loading...');
            await Promise.all([
                this.clearStore('categories'),
                this.clearStore('colors'), 
                this.clearStore('parts'),
                this.clearStore('partColors')
            ]);

            // Пытаемся загрузить LCX файл
            try {
                console.log('🔄 Loading LCX data from file...');
                await this.loadFromLCXFile(progressCallback);
                this.isLoaded = true;
                
                const stats = await this.getStats();
                console.log(`📊 Loaded from LCX file: ${stats.parts} parts, ${stats.colors} colors, ${stats.categories} categories`);
                return stats;
            } catch (error) {
                console.warn('⚠️ Failed to load LCX file, falling back to CSV:', error);
                // Fallback к старому CSV методу
                if (progressCallback) progressCallback(0, 50, 'Fallback к CSV загрузке...');
                await this.loadFromCSV();
            }
            this.isLoaded = true;
            
            const stats = await this.getStats();
            console.log(`📊 Loaded from CSV: ${stats.parts} parts, ${stats.colors} colors`);
            return stats;
        } catch (error) {
            console.error('❌ Failed to load data:', error);
            throw error;
        }
    }

    /**
     * Проверяет поддержку LCX файла
     */
    static canHandleLCX(file) {
        return LCXParser.canParse(file);
    }

    /**
     * Загружает LCX данные из объекта
     */
    async loadFromLCXData(lcxData, progressCallback = null) {
        console.log('🔄 Loading data from LCX object to IndexedDB...');
        
        try {
            // Шаг 4: Трансформация данных
            if (progressCallback) progressCallback(4, 0, 'Трансформация данных...');
            console.log('📊 Transforming data...');
            const transformedData = await this.lcxParser.transform(lcxData, progressCallback);
            
            // Шаги 5-8: Сохранение данных (выполняется в saveLCXData)
            console.log('📊 Saving data to IndexedDB...');
            await this.saveLCXData(transformedData, progressCallback);
            
            // Шаг 8: Завершение
            if (progressCallback) progressCallback(8, 50, 'Сохранение метаданных...');
            await this.setMetadata('lcxMetadata', {
                schemaVersion: lcxData.schemaVersion,
                source: lcxData.source,
                version: lcxData.version,
                lastUpdate: new Date().toISOString()
            });
            
            if (progressCallback) progressCallback(8, 100, 'Загрузка завершена!');
            console.log('✅ LCX data loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load LCX data:', error);
            if (progressCallback) progressCallback(-1, 0, `Ошибка: ${error.message}`);
            throw error;
        }
    }

    /**
     * Загружает LCX данные из файла
     */
    async loadFromLCXFile(progressCallback = null) {
        try {
            console.log('📁 Loading LCX file: data/bricklink-catalog.lcx.json.gz');
            
            // Шаг 1: Скачивание файла БД
            if (progressCallback) progressCallback(1, 5, 'Скачивание файла БД...');
            const response = await fetch('data/bricklink-catalog.lcx.json.gz');
            if (!response.ok) {
                throw new Error(`Failed to fetch LCX file: ${response.status}`);
            }
            
            if (progressCallback) progressCallback(1, 10, 'Получение размера файла...');
            const contentLength = response.headers.get('content-length');
            const totalSize = contentLength ? parseInt(contentLength) : 0;
            
            if (progressCallback) progressCallback(1, 15, `Размер файла: ${Math.round(totalSize / 1024)} KB`);
            
            // Чанковое скачивание
            const compressedData = await LCXFileLoader.downloadInChunks(response, progressCallback);
            if (progressCallback) progressCallback(1, 100, 'Файл БД скачан');

            // Шаг 2: Распаковка
            if (progressCallback) progressCallback(2, 5, 'Распаковка...');
            const decompressedData = await LCXFileLoader.decompressGzip(compressedData, progressCallback);
            if (progressCallback) progressCallback(2, 100, 'Распаковка завершена');
            
            // Шаг 3: Обработка данных
            if (progressCallback) progressCallback(3, 20, 'Обработка данных...');
            const lcxData = JSON.parse(decompressedData);
            if (progressCallback) progressCallback(3, 50, 'Данные обработаны');
            if (progressCallback) progressCallback(3, 80, 'Подготовка к сохранению...');
            if (progressCallback) progressCallback(3, 100, 'Обработка завершена');
            
            // Загружаем данные в IndexedDB (шаги 4-8)
            await this.loadFromLCXData(lcxData, progressCallback);
            
            console.log('✅ LCX file loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load LCX file:', error);
            throw error;
        }
    }

    /**
     * Проверяет, есть ли существующие данные в базе
     */
    async hasExistingData() {
        if (!this.db) {
            return false;
        }
        
        try {
            // Проверяем основные таблицы
            const [partsCount, colorsCount, categoriesCount] = await Promise.all([
                this.getStoreCount('parts'),
                this.getStoreCount('colors'),
                this.getStoreCount('categories')
            ]);
            
            // Считаем, что данные есть, если есть хотя бы части и цвета
            const hasData = partsCount > 0 && colorsCount > 0;
            
            if (hasData) {
                console.log(`📊 Found existing data: ${partsCount} parts, ${colorsCount} colors, ${categoriesCount} categories`);
            }
            
            return hasData;
        } catch (error) {
            console.warn('⚠️ Error checking existing data:', error);
            return false;
        }
    }

    /**
     * Получает количество записей в указанном store
     */
    async getStoreCount(storeName) {
        if (!this.db) {
            return 0;
        }
        
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        return new Promise((resolve) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(0);
        });
    }

    // Вспомогательные методы для совместимости
    async clearStore(storeName) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        await new Promise((resolve) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
        });
    }

    async waitForTransaction(transaction) {
        return new Promise((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async setMetadata(key, value) {
        const transaction = this.db.transaction(['metadata'], 'readwrite');
        const store = transaction.objectStore('metadata');
        store.put({ key, ...value });
        return this.waitForTransaction(transaction);
    }

    async getMetadata(key) {
        const transaction = this.db.transaction(['metadata'], 'readonly');
        const store = transaction.objectStore('metadata');
        
        return new Promise((resolve) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
        });
    }

    // Методы для работы с partColors согласно SPEC-PART-COLOR-MAP_v2.md
    
    /**
     * Получает все доступные цвета для детали
     * @param {string} partId - ID детали
     * @returns {Promise<Array>} Массив объектов {colorId, hasImg}
     */
    async getPartColors(partId) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        
        const transaction = this.db.transaction(['partColors'], 'readonly');
        const store = transaction.objectStore('partColors');
        const index = store.index('partId');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(partId);
            request.onsuccess = () => {
                const results = request.result.map(item => ({
                    colorId: item.colorId,
                    hasImg: item.hasImg
                }));
                // Сортируем по colorId для стабильности
                results.sort((a, b) => a.colorId - b.colorId);
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Получает все детали для цвета
     * @param {number} colorId - ID цвета
     * @returns {Promise<Array>} Массив partId
     */
    async getColorParts(colorId) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        
        const transaction = this.db.transaction(['partColors'], 'readonly');
        const store = transaction.objectStore('partColors');
        const index = store.index('colorId');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(colorId);
            request.onsuccess = () => {
                const results = request.result.map(item => item.partId);
                // Сортируем лексикографически для стабильности
                results.sort();
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Проверяет, доступен ли цвет для детали
     * @param {string} partId - ID детали
     * @param {number} colorId - ID цвета
     * @returns {Promise<boolean>} true если цвет доступен
     */
    async isColorAvailableForPart(partId, colorId) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        
        const transaction = this.db.transaction(['partColors'], 'readonly');
        const store = transaction.objectStore('partColors');
        
        return new Promise((resolve, reject) => {
            const request = store.get([partId, colorId]);
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Получает детали с изображениями для определенного цвета
     * @param {number} colorId - ID цвета
     * @returns {Promise<Array>} Массив partId с изображениями
     */
    async getColorPartsWithImages(colorId) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        
        const transaction = this.db.transaction(['partColors'], 'readonly');
        const store = transaction.objectStore('partColors');
        const index = store.index('colorId');
        
        return new Promise((resolve, reject) => {
            const request = index.getAll(colorId);
            request.onsuccess = () => {
                const results = request.result
                    .filter(item => item.hasImg === true)
                    .map(item => item.partId);
                results.sort();
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    /**
     * Получает статистику по partColors
     * @returns {Promise<Object>} Статистика
     */
    async getPartColorsStats() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        
        const transaction = this.db.transaction(['partColors'], 'readonly');
        const store = transaction.objectStore('partColors');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const data = request.result;
                const stats = {
                    totalLinks: data.length,
                    uniqueParts: new Set(data.map(item => item.partId)).size,
                    uniqueColors: new Set(data.map(item => item.colorId)).size,
                    withImages: data.filter(item => item.hasImg === true).length,
                    withoutImages: data.filter(item => item.hasImg === false).length,
                    nullImages: data.filter(item => item.hasImg === null).length
                };
                resolve(stats);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Получает доступные цвета для конкретной детали
     * @param {string} partId - ID детали
     * @returns {Promise<Array>} Массив доступных цветов с информацией
     */
    async getAvailableColorsForPart(partId) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        
        const transaction = this.db.transaction(['partColors', 'colors'], 'readonly');
        const partColorsStore = transaction.objectStore('partColors');
        const colorsStore = transaction.objectStore('colors');
        
        return new Promise((resolve, reject) => {
            // Получаем все связи для данной детали
            const partColorsRequest = partColorsStore.index('partId').getAll(partId);
            
            partColorsRequest.onsuccess = () => {
                const partColors = partColorsRequest.result;
                
                if (partColors.length === 0) {
                    resolve([]);
                    return;
                }
                
                // Получаем информацию о цветах
                const colorIds = partColors.map(pc => pc.colorId);
                const colorPromises = colorIds.map(colorId => {
                    return new Promise((resolveColor, rejectColor) => {
                        const colorRequest = colorsStore.get(colorId);
                        colorRequest.onsuccess = () => {
                            const color = colorRequest.result;
                            if (color) {
                                resolveColor({
                                    id: color.id,
                                    name: color.name,
                                    rgb: color.rgb,
                                    partId: partId
                                });
                            } else {
                                resolveColor(null);
                            }
                        };
                        colorRequest.onerror = () => rejectColor(colorRequest.error);
                    });
                });
                
                Promise.all(colorPromises).then(colors => {
                    // Фильтруем null значения и сортируем по имени
                    const validColors = colors.filter(color => color !== null);
                    validColors.sort((a, b) => a.name.localeCompare(b.name));
                    resolve(validColors);
                }).catch(reject);
            };
            
            partColorsRequest.onerror = () => reject(partColorsRequest.error);
        });
    }

}

// Экспортируем класс
window.LCXIndexedDBAdapter = LCXIndexedDBAdapter;
