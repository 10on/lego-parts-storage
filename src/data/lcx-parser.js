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
     * @returns {Promise<Object>} Распарсенные данные
     */
    async parse(input) {
        let jsonString;

        try {
            if (typeof input === 'string') {
                jsonString = input;
            } else if (input instanceof File || input instanceof Blob) {
                // Проверяем, сжат ли файл
                if (input.name && input.name.endsWith('.gz')) {
                    jsonString = await this.decompressGzip(input);
                } else {
                    jsonString = await input.text();
                }
            } else {
                throw new Error('Неподдерживаемый тип входных данных');
            }

            const lcxData = JSON.parse(jsonString);
            await this.validate(lcxData);
            
            return await this.transform(lcxData);
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
        if (progressCallback) progressCallback(0, 60, 'Парсинг категорий...');
        transformedData.categories = this.transformTable(lcxData.tables.categories);
        
        // Парсим цвета
        if (progressCallback) progressCallback(0, 65, 'Парсинг цветов...');
        transformedData.colors = this.transformTable(lcxData.tables.colors);
        
        // Парсим детали (самый большой массив)
        if (progressCallback) progressCallback(0, 70, 'Парсинг деталей...');
        transformedData.parts = this.transformTable(lcxData.tables.parts);

        if (lcxData.tables.partColors) {
            transformedData.partColors = this.transformTable(lcxData.tables.partColors);
        }

        // Применяем специфичные трансформации
        this.postProcessCategories(transformedData.categories);
        this.postProcessColors(transformedData.colors);
        this.postProcessParts(transformedData.parts);

        if (transformedData.partColors) {
            this.postProcessPartColors(transformedData.partColors);
        }

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
     * Декомпрессия GZIP (для браузера)
     */
    async decompressGzip(file) {
        // Используем CompressionStream API если доступно
        if ('DecompressionStream' in window) {
            const stream = file.stream().pipeThrough(new DecompressionStream('gzip'));
            const response = new Response(stream);
            return await response.text();
        } else {
            // Fallback: предполагаем что файл не сжат или используем библиотеку
            console.warn('DecompressionStream не поддерживается, пытаемся прочитать как обычный JSON');
            return await file.text();
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
