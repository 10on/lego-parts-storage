/**
 * IndexedDB Adapter for BrickLink Data
 * Управление большими объемами данных деталей и цветов
 */

class IndexedDBAdapter {
    constructor(dbName = 'BrickLinkDB', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
    }

    /**
     * Инициализация базы данных
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error('Failed to open IndexedDB'));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('✅ IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Создаем хранилище для деталей
                if (!db.objectStoreNames.contains('parts')) {
                    const partsStore = db.createObjectStore('parts', { keyPath: 'partId' });
                    partsStore.createIndex('name', 'name', { unique: false });
                    partsStore.createIndex('categoryName', 'categoryName', { unique: false });
                    partsStore.createIndex('nameAndId', ['name', 'partId'], { unique: false });
                }

                // Создаем хранилище для цветов
                if (!db.objectStoreNames.contains('colors')) {
                    const colorsStore = db.createObjectStore('colors', { keyPath: 'id' });
                    colorsStore.createIndex('name', 'name', { unique: false });
                    colorsStore.createIndex('parts', 'parts', { unique: false });
                }

                // Создаем хранилище для метаданных
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }

                console.log('📦 IndexedDB schema created');
            };
        });
    }

    /**
     * Загружает данные из CSV и сохраняет в IndexedDB
     */
    async loadFromCSV() {
        console.log('🔄 Loading data from CSV to IndexedDB...');
        
        try {
            // Проверяем, есть ли уже данные
            const metadata = await this.getMetadata('lastUpdate');
            const now = Date.now();
            const oneDay = 24 * 60 * 60 * 1000;

            if (metadata && (now - metadata.timestamp) < oneDay) {
                console.log('📦 Data is fresh, skipping CSV loading');
                return;
            }

            // Загружаем и сохраняем детали
            await this.loadPartsFromCSV();
            
            // Загружаем и сохраняем цвета
            await this.loadColorsFromCSV();

            // Обновляем метаданные
            await this.setMetadata('lastUpdate', { timestamp: now });

            console.log('✅ CSV data loaded to IndexedDB');
        } catch (error) {
            console.error('❌ Failed to load CSV data:', error);
            throw error;
        }
    }

    /**
     * Загружает детали из CSV
     */
    async loadPartsFromCSV() {
        const response = await fetch('/data/bricklink/parts.csv');
        const text = await response.text();
        const lines = text.split('\n');

        const transaction = this.db.transaction(['parts'], 'readwrite');
        const store = transaction.objectStore('parts');

        // Очищаем старые данные
        await this.clearStore('parts');

        let processed = 0;
        const batchSize = 1000;
        let batch = [];

        for (let i = 3; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split('\t');
            if (values.length < 4) continue;

            const part = {
                categoryId: values[0] || '',
                categoryName: values[1] || '',
                partId: values[2] || '',
                name: values[3] || '',
                alternateId: values[4] || ''
            };

            // Пропускаем нежелательные категории, но оставляем больше деталей
            if (part.categoryName === 'Sticker Sheet' || part.categoryName === 'Homemaker') {
                continue;
            }

            if (part.partId && part.name) {
                batch.push(part);
                processed++;

                if (batch.length >= batchSize) {
                    await this.saveBatch(store, batch);
                    batch = [];
                    
                    if (processed % 5000 === 0) {
                        console.log(`📦 Processed ${processed} parts...`);
                    }
                }
            }
        }

        // Сохраняем оставшиеся данные
        if (batch.length > 0) {
            await this.saveBatch(store, batch);
        }

        await this.waitForTransaction(transaction);
        console.log(`📦 Loaded ${processed} parts to IndexedDB`);
    }

    /**
     * Загружает цвета из CSV
     */
    async loadColorsFromCSV() {
        const response = await fetch('/data/bricklink/colors.csv');
        const text = await response.text();
        const lines = text.split('\n');

        const transaction = this.db.transaction(['colors'], 'readwrite');
        const store = transaction.objectStore('colors');

        // Очищаем старые данные
        await this.clearStore('colors');

        let processed = 0;

        for (let i = 3; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const values = line.split('\t');
            if (values.length < 5) continue;

            const color = {
                id: values[0] || '',
                name: values[1] || '',
                rgb: values[2] || '',
                type: values[3] || '',
                parts: parseInt(values[4]) || 0
            };

            if (color.name === '(Not Applicable)' || !color.name || !color.rgb) {
                continue;
            }

            store.add(color);
            processed++;
        }

        await this.waitForTransaction(transaction);
        console.log(`🎨 Loaded ${processed} colors to IndexedDB`);
    }

    /**
     * Поиск деталей
     */
    async searchParts(query, limit = 50) {
        if (!query || query.length < 2) return [];

        const transaction = this.db.transaction(['parts'], 'readonly');
        const store = transaction.objectStore('parts');
        
        const results = [];
        const searchQuery = query.toLowerCase();

        // Поиск по всем записям (можно оптимизировать с курсорами)
        const request = store.openCursor();
        
        return new Promise((resolve) => {
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor && results.length < limit) {
                    const part = cursor.value;
                    const matchesId = part.partId.toLowerCase().includes(searchQuery);
                    const matchesName = part.name.toLowerCase().includes(searchQuery);
                    const matchesCategory = part.categoryName.toLowerCase().includes(searchQuery);

                    if (matchesId || matchesName || matchesCategory) {
                        results.push({
                            value: part.partId,
                            label: `${part.partId} - ${part.name}`,
                            category: part.categoryName,
                            data: part
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
     * Поиск цветов
     */
    async searchColors(query, limit = 20) {
        const transaction = this.db.transaction(['colors'], 'readonly');
        const store = transaction.objectStore('colors');
        
        if (!query || query.length < 1) {
            // Возвращаем популярные цвета
            const index = store.index('parts');
            const request = index.openCursor(null, 'prev'); // По убыванию количества деталей
            
            const results = [];
            return new Promise((resolve) => {
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    
                    if (cursor && results.length < limit) {
                        const color = cursor.value;
                        results.push({
                            value: color.name,
                            label: color.name,
                            rgb: color.rgb,
                            data: color
                        });
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
            });
        }

        // Поиск по запросу
        const results = [];
        const searchQuery = query.toLowerCase();
        const request = store.openCursor();

        return new Promise((resolve) => {
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                
                if (cursor && results.length < limit) {
                    const color = cursor.value;
                    if (color.name.toLowerCase().includes(searchQuery) || color.id.includes(searchQuery)) {
                        results.push({
                            value: color.name,
                            label: color.name,
                            rgb: color.rgb,
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
     * Получить деталь по ID
     */
    async getPartById(partId) {
        const transaction = this.db.transaction(['parts'], 'readonly');
        const store = transaction.objectStore('parts');
        
        return new Promise((resolve) => {
            const request = store.get(partId);
            request.onsuccess = () => resolve(request.result);
        });
    }

    /**
     * Получить цвет по имени
     */
    async getColorByName(colorName) {
        const transaction = this.db.transaction(['colors'], 'readonly');
        const store = transaction.objectStore('colors');
        const index = store.index('name');
        
        return new Promise((resolve) => {
            const request = index.get(colorName);
            request.onsuccess = () => resolve(request.result);
        });
    }

    // Вспомогательные методы
    async saveBatch(store, batch) {
        return Promise.all(batch.map(item => {
            return new Promise((resolve, reject) => {
                const request = store.add(item);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }));
    }

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

    /**
     * Получить статистику базы данных
     */
    async getStats() {
        const partsCount = await this.getStoreCount('parts');
        const colorsCount = await this.getStoreCount('colors');
        
        return {
            parts: partsCount,
            colors: colorsCount,
            lastUpdate: await this.getMetadata('lastUpdate')
        };
    }

    async getStoreCount(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        
        return new Promise((resolve) => {
            const request = store.count();
            request.onsuccess = () => resolve(request.result);
        });
    }
}

// Экспортируем класс
window.IndexedDBAdapter = IndexedDBAdapter;
