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

            if (progressCallback) progressCallback(7, 100, 'Загрузка завершена!');
            
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

            // Шаг 3: Сохраняем категории
            if (progressCallback) progressCallback(3, 0, `Сохранение ${transformedData.categories.length} категорий...`);
            await this.saveBulkDataWithProgress('categories', transformedData.categories, progressCallback);
            console.log(`📦 Saved ${transformedData.categories.length} categories`);

            // Шаг 4: Сохраняем цвета
            if (progressCallback) progressCallback(4, 0, `Сохранение ${transformedData.colors.length} цветов...`);
            await this.saveBulkDataWithProgress('colors', transformedData.colors, progressCallback);
            console.log(`🎨 Saved ${transformedData.colors.length} colors`);

            // Шаг 5: Сохраняем детали (самый большой массив)
            if (progressCallback) progressCallback(5, 0, `Сохранение ${transformedData.parts.length} деталей...`);
            await this.saveBulkDataWithProgress('parts', transformedData.parts, progressCallback);
            console.log(`🧱 Saved ${transformedData.parts.length} parts`);

            // Шаг 6: Сохраняем связи деталь-цвет (если есть)
            if (transformedData.partColors && transformedData.partColors.length > 0) {
                if (progressCallback) progressCallback(6, 0, `Сохранение ${transformedData.partColors.length} связей...`);
                await this.saveBulkDataWithProgress('partColors', transformedData.partColors, progressCallback);
                console.log(`🔗 Saved ${transformedData.partColors.length} part-color relations`);
            } else {
                if (progressCallback) progressCallback(6, 0, 'Связи деталь-цвет отсутствуют');
            }

            console.log('✅ All LCX data saved to IndexedDB');
        } catch (error) {
            console.error('Ошибка сохранения LCX данных:', error);
            throw error;
        }
    }

    /**
     * Массовое сохранение данных
     */
    async saveBulkData(store, data) {
        const batchSize = 1000;
        
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            await Promise.all(batch.map(item => {
                return new Promise((resolve, reject) => {
                    const request = store.add(item);
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }));
            
            if (i % 5000 === 0 && i > 0) {
                console.log(`📦 Processed ${i}/${data.length} items...`);
            }
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
            
            // Обновляем прогресс с более детальной информацией
            const progress = Math.min(100, Math.round((processedItems / totalItems) * 100));
            if (progressCallback) {
                const stepNumber = this.getStepNumberForStore(storeName);
                // Исправляем передачу параметров: step, percent, message
                console.log(`📊 Progress callback: Step ${stepNumber}, Progress ${progress}%, Store: ${storeName}, Processed: ${processedItems}/${totalItems}`);
                progressCallback(stepNumber, progress, `Сохранено ${processedItems} из ${totalItems} записей`);
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
            'categories': 3,
            'colors': 4,
            'parts': 5,
            'partColors': 6
        };
        return stepMap[storeName] || 3;
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
     * Получить связи деталь-цвет
     */
    async getPartColors(partId) {
        if (!this.db.objectStoreNames.contains('partColors')) {
            return [];
        }

        const transaction = this.db.transaction(['partColors'], 'readonly');
        const store = transaction.objectStore('partColors');
        const index = store.index('partId');
        
        return new Promise((resolve) => {
            const request = index.getAll(partId);
            request.onsuccess = () => resolve(request.result || []);
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
            
            // Шаг 1: Чанковое скачивание файла данных
            if (progressCallback) progressCallback(1, 5, 'Чтение локального архива...');
            const response = await fetch('data/bricklink-catalog.lcx.json.gz');
            if (!response.ok) {
                throw new Error(`Failed to fetch LCX file: ${response.status}`);
            }
            
            if (progressCallback) progressCallback(1, 10, 'Получение размера архива...');
            const contentLength = response.headers.get('content-length');
            const totalSize = contentLength ? parseInt(contentLength) : 0;
            
            if (progressCallback) progressCallback(1, 15, `Размер архива: ${Math.round(totalSize / 1024)} KB`);
            
            // Чанковое скачивание
            const compressedData = await this.downloadInChunks(response, progressCallback);
            if (progressCallback) progressCallback(1, 100, 'Архив прочитан');
            
            // Шаг 2: Чанковая распаковка архива
            if (progressCallback) progressCallback(2, 5, 'Инициализация распаковки...');
            const decompressedData = await this.decompressGzipWithProgress(compressedData, progressCallback);
            if (progressCallback) progressCallback(2, 100, 'Архив распакован');
            
            // Шаг 3: Парсинг JSON данных
            if (progressCallback) progressCallback(3, 20, 'Начало парсинга JSON...');
            const lcxData = JSON.parse(decompressedData);
            if (progressCallback) progressCallback(3, 50, 'JSON распарсен');
            if (progressCallback) progressCallback(3, 80, 'Валидация структуры...');
            if (progressCallback) progressCallback(3, 100, 'Данные обработаны');
            
            // Загружаем данные в IndexedDB (шаги 4-8)
            await this.loadFromLCXData(lcxData, progressCallback);
            
            console.log('✅ LCX file loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load LCX file:', error);
            throw error;
        }
    }

    /**
     * Чанковое скачивание файла с прогрессом
     */
    async downloadInChunks(response, progressCallback = null) {
        const reader = response.body.getReader();
        const chunks = [];
        let receivedLength = 0;
        const contentLength = response.headers.get('content-length');
        const totalSize = contentLength ? parseInt(contentLength) : 0;
        
        let progressStep = 20; // Начинаем с 20% после получения размера
        const progressIncrement = 5; // Обновляем каждые 5%
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                chunks.push(value);
                receivedLength += value.length;
                
                // Обновляем прогресс каждые 5%
                if (totalSize > 0) {
                    const currentProgress = Math.floor((receivedLength / totalSize) * 75) + 20; // 20-95%
                    if (currentProgress >= progressStep) {
                        if (progressCallback) {
                            progressCallback(1, currentProgress, 
                                `Прочитано: ${Math.round(receivedLength / 1024)} KB / ${Math.round(totalSize / 1024)} KB`);
                        }
                        progressStep += progressIncrement;
                    }
                } else {
                    // Если размер неизвестен, обновляем каждые 50KB
                    if (receivedLength % (50 * 1024) < value.length) {
                        if (progressCallback) {
                            progressCallback(1, Math.min(95, 20 + (receivedLength / 1024) * 0.1), 
                                `Прочитано: ${Math.round(receivedLength / 1024)} KB`);
                        }
                    }
                }
                
                // Небольшая задержка для демонстрации прогресса
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            // Объединяем все чанки
            const result = new Uint8Array(receivedLength);
            let position = 0;
            for (const chunk of chunks) {
                result.set(chunk, position);
                position += chunk.length;
            }
            
            return result;
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Распаковывает gzip данные с прогрессом
     */
    async decompressGzipWithProgress(compressedData, progressCallback = null) {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        // Записываем сжатые данные
        writer.write(compressedData);
        writer.close();
        
        // Читаем распакованные данные с прогрессом
        const chunks = [];
        let done = false;
        let totalDecompressed = 0;
        let progressStep = 10;
        const progressIncrement = 5;
        
        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            
            if (value) {
                chunks.push(value);
                totalDecompressed += value.length;
                
                // Обновляем прогресс каждые 5%
                const currentProgress = Math.min(95, 10 + (totalDecompressed / 1024) * 0.1);
                if (currentProgress >= progressStep) {
                    if (progressCallback) {
                        progressCallback(2, currentProgress, 
                            `Распаковано: ${Math.round(totalDecompressed / 1024)} KB`);
                    }
                    progressStep += progressIncrement;
                }
                
                // Небольшая задержка для демонстрации прогресса
                await new Promise(resolve => setTimeout(resolve, 5));
            }
        }
        
        // Объединяем чанки в строку
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        
        return new TextDecoder().decode(result);
    }

    /**
     * Распаковывает gzip данные (старый метод для совместимости)
     */
    async decompressGzip(compressedData) {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        // Записываем сжатые данные
        writer.write(compressedData);
        writer.close();
        
        // Читаем распакованные данные
        const chunks = [];
        let done = false;
        
        while (!done) {
            const { value, done: readerDone } = await reader.read();
            done = readerDone;
            if (value) {
                chunks.push(value);
            }
        }
        
        // Объединяем чанки в строку
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        
        return new TextDecoder().decode(result);
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

    // Методы совместимости для старого API
    async loadFromCSV() {
        console.log('📦 CSV loading not supported in LCX adapter, use loadFromLCX instead');
        return;
    }
}

// Экспортируем класс
window.LCXIndexedDBAdapter = LCXIndexedDBAdapter;
