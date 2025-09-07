/**
 * LCX-Tabular Parser
 * Парсер для эффективной обработки каталога LEGO в формате LCX-Tabular v1
 */

class LCXParser {
    constructor() {
        this.supportedSchemaVersion = 1;
        this.requiredTables = ['categories', 'colors', 'parts'];
        this.optionalTables = ['partColors'];
    }

    /**
     * Парсит LCX файл (JSON или сжатый JSON.gz)
     * @param {File|Blob|string} input - Файл, blob или JSON строка
     * @param {Function} progressCallback - Функция обратного вызова для прогресса
     * @returns {Promise<Object>} Распарсенные данные
     */
    async parse(input, progressCallback = null) {
        let jsonString;

        try {
            if (typeof input === 'string') {
                jsonString = input;
                if (progressCallback) progressCallback(2, 100, 'Данные уже загружены');
            } else if (input instanceof File || input instanceof Blob) {
                // Проверяем, сжат ли файл
                if (input.name && input.name.endsWith('.gz')) {
                    jsonString = await this.decompressGzip(input, progressCallback);
                } else {
                    jsonString = await this.loadFileWithProgress(input, progressCallback);
                }
            } else {
                throw new Error('Неподдерживаемый тип входных данных');
            }

            if (progressCallback) progressCallback(2, 100, 'Парсинг JSON данных...');
            const lcxData = JSON.parse(jsonString);
            await this.validate(lcxData);
            
            return await this.transform(lcxData, progressCallback);
        } catch (error) {
            console.error('Ошибка парсинга LCX:', error);
            throw new Error(`Ошибка парсинга LCX: ${error.message}`);
        }
    }

    /**
     * Валидирует структуру LCX данных
     */
    async validate(lcxData) {
        // Проверка корневой структуры
        if (!lcxData || typeof lcxData !== 'object') {
            throw new Error('Некорректная структура LCX файла');
        }

        // Проверка версии схемы
        if (lcxData.schemaVersion !== this.supportedSchemaVersion) {
            throw new Error(`Неподдерживаемая версия схемы: ${lcxData.schemaVersion}. Поддерживается: ${this.supportedSchemaVersion}`);
        }

        // Проверка обязательных полей
        if (!lcxData.source) {
            throw new Error('Отсутствует поле "source"');
        }
        if (!lcxData.version) {
            throw new Error('Отсутствует поле "version"');
        }
        if (!lcxData.tables || typeof lcxData.tables !== 'object') {
            throw new Error('Отсутствует или некорректное поле "tables"');
        }

        // Проверка обязательных таблиц
        for (const tableName of this.requiredTables) {
            if (!lcxData.tables[tableName]) {
                throw new Error(`Отсутствует обязательная таблица: ${tableName}`);
            }
            this.validateTable(lcxData.tables[tableName], tableName);
        }

        // Проверка опциональных таблиц
        for (const tableName of this.optionalTables) {
            if (lcxData.tables[tableName]) {
                this.validateTable(lcxData.tables[tableName], tableName);
            }
        }

        console.log('✅ LCX структура валидна');
    }

    /**
     * Валидирует структуру таблицы
     */
    validateTable(table, tableName) {
        if (!table.cols || !Array.isArray(table.cols)) {
            throw new Error(`Таблица ${tableName}: отсутствует или некорректное поле "cols"`);
        }
        if (!table.rows || !Array.isArray(table.rows)) {
            throw new Error(`Таблица ${tableName}: отсутствует или некорректное поле "rows"`);
        }

        // Проверка соответствия количества колонок
        for (let i = 0; i < table.rows.length; i++) {
            const row = table.rows[i];
            if (!Array.isArray(row)) {
                throw new Error(`Таблица ${tableName}, строка ${i}: строка должна быть массивом`);
            }
            if (row.length !== table.cols.length) {
                throw new Error(`Таблица ${tableName}, строка ${i}: количество значений (${row.length}) не соответствует количеству колонок (${table.cols.length})`);
            }
        }

        // Валидация специфичных схем колонок
        this.validateTableSchema(table, tableName);
    }

    /**
     * Валидирует схему колонок для конкретных таблиц
     */
    validateTableSchema(table, tableName) {
        const expectedSchemas = {
            categories: ['id', 'name'],
            colors: ['id', 'name', 'rgb', 'type', 'parts', 'inSets', 'wanted', 'forSale', 'yearFrom', 'yearTo'],
            parts: ['blId', 'name', 'catId', 'alt'],
            partColors: ['partId', 'colorId', 'hasImg']
        };

        const expectedCols = expectedSchemas[tableName];
        if (!expectedCols) return; // Неизвестная таблица, пропускаем

        if (JSON.stringify(table.cols) !== JSON.stringify(expectedCols)) {
            throw new Error(`Таблица ${tableName}: неожиданная схема колонок. Ожидается: [${expectedCols.join(', ')}], получено: [${table.cols.join(', ')}]`);
        }
    }

    /**
     * Трансформирует LCX данные в формат для IndexedDB
     */
    async transform(lcxData, progressCallback = null) {
        const transformedData = {
            metadata: {
                source: lcxData.source,
                version: lcxData.version,
                schemaVersion: lcxData.schemaVersion,
                parsedAt: new Date().toISOString()
            }
        };

        // Парсим категории
        if (progressCallback) progressCallback(3, 10, 'Парсинг категорий...');
        transformedData.categories = this.transformTable(lcxData.tables.categories);
        if (progressCallback) progressCallback(3, 30, `Обработано ${transformedData.categories.length} категорий`);
        
        // Парсим цвета
        if (progressCallback) progressCallback(3, 50, 'Парсинг цветов...');
        transformedData.colors = this.transformTable(lcxData.tables.colors);
        if (progressCallback) progressCallback(3, 70, `Обработано ${transformedData.colors.length} цветов`);
        
        // Парсим детали (самый большой массив)
        if (progressCallback) progressCallback(3, 80, 'Парсинг деталей...');
        transformedData.parts = this.transformTable(lcxData.tables.parts);
        if (progressCallback) progressCallback(3, 90, `Обработано ${transformedData.parts.length} деталей`);

        if (lcxData.tables.partColors) {
            if (progressCallback) progressCallback(3, 95, 'Парсинг связей деталь-цвет...');
            transformedData.partColors = this.transformTable(lcxData.tables.partColors);
            if (progressCallback) progressCallback(3, 100, `Обработано ${transformedData.partColors.length} связей`);
        }

        // Применяем специфичные трансформации
        if (progressCallback) progressCallback(4, 0, 'Применение трансформаций...');
        this.postProcessCategories(transformedData.categories);
        this.postProcessColors(transformedData.colors);
        this.postProcessParts(transformedData.parts);

        if (transformedData.partColors) {
            this.postProcessPartColors(transformedData.partColors);
        }

        if (progressCallback) progressCallback(4, 100, 'Трансформация завершена');
        return transformedData;
    }

    /**
     * Трансформирует таблицу из формата cols/rows в массив объектов
     */
    transformTable(table) {
        const { cols, rows } = table;
        return rows.map(row => {
            const obj = {};
            cols.forEach((col, index) => {
                obj[col] = row[index];
            });
            return obj;
        });
    }

    /**
     * Пост-обработка категорий
     */
    postProcessCategories(categories) {
        categories.forEach(category => {
            // Обеспечиваем правильные типы
            category.id = parseInt(category.id);
            category.name = String(category.name || '').trim();
        });
    }

    /**
     * Пост-обработка цветов
     */
    postProcessColors(colors) {
        colors.forEach(color => {
            // Обеспечиваем правильные типы
            color.id = parseInt(color.id);
            color.name = String(color.name || '').trim();
            
            // RGB может быть null
            if (color.rgb !== null) {
                color.rgb = String(color.rgb).toUpperCase();
                // Валидация HEX
                if (!/^[0-9A-F]{6}$/.test(color.rgb)) {
                    console.warn(`Некорректный RGB для цвета ${color.name}: ${color.rgb}`);
                    color.rgb = null;
                }
            }
            
            color.type = String(color.type || '').trim();
            color.parts = parseInt(color.parts) || 0;
            color.inSets = parseInt(color.inSets) || 0;
            color.wanted = parseInt(color.wanted) || 0;
            color.forSale = parseInt(color.forSale) || 0;
            
            // Годы могут быть null
            color.yearFrom = color.yearFrom !== null ? parseInt(color.yearFrom) : null;
            color.yearTo = color.yearTo !== null ? parseInt(color.yearTo) : null;
        });
    }

    /**
     * Пост-обработка деталей
     */
    postProcessParts(parts) {
        parts.forEach(part => {
            // Обеспечиваем правильные типы
            part.blId = String(part.blId || '').trim();
            part.name = String(part.name || '').trim();
            part.catId = parseInt(part.catId);
            
            // alt может быть null или массивом
            if (part.alt === null || part.alt === undefined) {
                part.alt = null;
            } else if (Array.isArray(part.alt)) {
                part.alt = part.alt.map(id => String(id).trim()).filter(id => id);
            } else {
                part.alt = null;
            }

            // Для совместимости с текущей схемой IndexedDB
            part.partId = part.blId; // Используем blId как partId
        });
    }

    /**
     * Пост-обработка связей деталь-цвет
     */
    postProcessPartColors(partColors) {
        partColors.forEach(partColor => {
            partColor.partId = String(partColor.partId || '').trim();
            partColor.colorId = parseInt(partColor.colorId);
            partColor.hasImg = Boolean(partColor.hasImg);
        });
    }

    /**
     * Загрузка файла с отслеживанием прогресса
     */
    async loadFileWithProgress(file, progressCallback = null) {
        if (progressCallback) progressCallback(2, 0, 'Начинаем чтение файла...');
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onprogress = (event) => {
                if (event.lengthComputable && progressCallback) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    progressCallback(2, percentComplete, `Прочитано ${Math.round(event.loaded / 1024 / 1024)}MB из ${Math.round(event.total / 1024 / 1024)}MB`);
                }
            };
            
            reader.onload = () => {
                if (progressCallback) progressCallback(2, 100, 'Файл прочитан');
                resolve(reader.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Ошибка чтения файла'));
            };
            
            reader.readAsText(file);
        });
    }

    /**
     * Декомпрессия GZIP (для браузера) с отслеживанием прогресса
     */
    async decompressGzip(file, progressCallback = null) {
        if (progressCallback) progressCallback(2, 0, 'Начинаем распаковку архива...');
        
        // Используем CompressionStream API если доступно
        if ('DecompressionStream' in window) {
            try {
                const stream = file.stream().pipeThrough(new DecompressionStream('gzip'));
                const response = new Response(stream);
                
                // Создаем reader для отслеживания прогресса
                const reader = response.body.getReader();
                const chunks = [];
                let receivedLength = 0;
                const contentLength = file.size; // Приблизительный размер
                
                while (true) {
                    const { done, value } = await reader.read();
                    
                    if (done) break;
                    
                    chunks.push(value);
                    receivedLength += value.length;
                    
                    if (progressCallback) {
                        const percentComplete = Math.min(100, Math.round((receivedLength / contentLength) * 100));
                        progressCallback(2, percentComplete, `Распаковано ${Math.round(receivedLength / 1024 / 1024)}MB`);
                    }
                }
                
                // Собираем все чанки в один Uint8Array
                const allChunks = new Uint8Array(receivedLength);
                let position = 0;
                for (const chunk of chunks) {
                    allChunks.set(chunk, position);
                    position += chunk.length;
                }
                
                // Конвертируем в текст
                const decoder = new TextDecoder();
                const result = decoder.decode(allChunks);
                
                if (progressCallback) progressCallback(2, 100, 'Архив распакован');
                return result;
            } catch (error) {
                console.warn('Ошибка при распаковке GZIP, пытаемся прочитать как обычный файл:', error);
                return await this.loadFileWithProgress(file, progressCallback);
            }
        } else {
            // Fallback: предполагаем что файл не сжат или используем библиотеку
            console.warn('DecompressionStream не поддерживается, пытаемся прочитать как обычный JSON');
            return await this.loadFileWithProgress(file, progressCallback);
        }
    }

    /**
     * Получить статистику парсинга
     */
    getStats(transformedData) {
        return {
            categories: transformedData.categories?.length || 0,
            colors: transformedData.colors?.length || 0,
            parts: transformedData.parts?.length || 0,
            partColors: transformedData.partColors?.length || 0,
            source: transformedData.metadata?.source,
            version: transformedData.metadata?.version,
            parsedAt: transformedData.metadata?.parsedAt
        };
    }

    /**
     * Проверка поддержки файла
     */
    static canParse(file) {
        if (!file || !file.name) return false;
        
        const fileName = file.name.toLowerCase();
        return fileName.endsWith('.lctx.json') || 
               fileName.endsWith('.lctx.json.gz') ||
               fileName.endsWith('.lcx.json') ||
               fileName.endsWith('.lcx.json.gz');
    }
}

// Экспортируем класс
window.LCXParser = LCXParser;
