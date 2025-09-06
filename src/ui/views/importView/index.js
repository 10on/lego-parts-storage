// Вид импорта и экспорта данных
class ImportView {
    constructor() {
        this.importHistory = [];
    }

    render() {
        const container = document.getElementById('import-content');
        if (!container) return;

        container.innerHTML = this.renderImportInterface();
        this.setupEventListeners();
    }

    renderImportInterface() {
        return `
            <div class="import-section">
                <h3>Импорт из файла</h3>
                <p>Импортируйте данные из JSON, CSV или LCX файлов</p>
                <div class="import-form">
                    <input type="file" id="import-file" accept=".json,.csv,.lcx.json,.lctx.json,.gz" class="file-input">
                    <div class="import-options">
                        <label class="checkbox-label">
                            <input type="checkbox" id="import-overwrite" checked>
                            Перезаписать существующие данные
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" id="import-validate">
                            Валидировать данные перед импортом
                        </label>
                    </div>
                    <button class="btn btn-primary" id="import-btn">Импортировать</button>
                </div>
            </div>

            <div class="import-section">
                <h3>Экспорт данных</h3>
                <p>Экспортируйте ваши данные в различных форматах</p>
                <div class="export-options">
                    <div class="export-option">
                        <h4>JSON формат</h4>
                        <p>Полный экспорт всех данных проекта</p>
                        <button class="btn btn-outline" id="export-json-btn">Экспорт JSON</button>
                    </div>
                    <div class="export-option">
                        <h4>CSV формат</h4>
                        <p>Табличный формат для Excel/Google Sheets</p>
                        <button class="btn btn-outline" id="export-csv-btn">Экспорт CSV</button>
                    </div>
                    <div class="export-option">
                        <h4>BrickLink формат</h4>
                        <p>Формат для загрузки в BrickLink</p>
                        <button class="btn btn-outline" id="export-bricklink-btn">Экспорт BrickLink</button>
                    </div>
                    <div class="export-option">
                        <h4>LCX формат</h4>
                        <p>Каталог BrickLink в формате LCX-Tabular</p>
                        <button class="btn btn-outline" id="export-lcx-btn">Экспорт LCX</button>
                    </div>
                </div>
            </div>

            <div class="import-section">
                <h3>История импорта</h3>
                <p>Последние операции импорта и экспорта</p>
                <div class="import-history" id="import-history">
                    ${this.renderImportHistory()}
                </div>
            </div>
        `;
    }

    renderImportHistory() {
        if (this.importHistory.length === 0) {
            return '<p class="text-muted">История пуста</p>';
        }

        return this.importHistory.map(record => `
            <div class="history-item">
                <div class="history-info">
                    <div class="history-type">${record.type}</div>
                    <div class="history-date">${new Date(record.date).toLocaleString('ru-RU')}</div>
                </div>
                <div class="history-details">
                    <div class="history-filename">${record.filename}</div>
                    <div class="history-status ${record.status}">${this.getStatusText(record.status)}</div>
                </div>
            </div>
        `).join('');
    }

    getStatusText(status) {
        const statusMap = {
            'success': 'Успешно',
            'error': 'Ошибка',
            'warning': 'Предупреждение'
        };
        return statusMap[status] || status;
    }

    setupEventListeners() {
        // Импорт файла
        const importBtn = document.getElementById('import-btn');
        if (importBtn) {
            importBtn.addEventListener('click', () => {
                this.handleImport();
            });
        }

        // Экспорт JSON
        const exportJsonBtn = document.getElementById('export-json-btn');
        if (exportJsonBtn) {
            exportJsonBtn.addEventListener('click', () => {
                this.exportToJSON();
            });
        }

        // Экспорт CSV
        const exportCsvBtn = document.getElementById('export-csv-btn');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => {
                this.exportToCSV();
            });
        }

        // Экспорт BrickLink
        const exportBricklinkBtn = document.getElementById('export-bricklink-btn');
        if (exportBricklinkBtn) {
            exportBricklinkBtn.addEventListener('click', () => {
                this.exportToBrickLink();
            });
        }

        // Экспорт LCX
        const exportLcxBtn = document.getElementById('export-lcx-btn');
        if (exportLcxBtn) {
            exportLcxBtn.addEventListener('click', () => {
                this.exportToLCX();
            });
        }
    }

    handleImport() {
        const fileInput = document.getElementById('import-file');
        const file = fileInput.files[0];
        
        if (!file) {
            alert('Выберите файл для импорта');
            return;
        }

        const overwrite = document.getElementById('import-overwrite').checked;
        const validate = document.getElementById('import-validate').checked;

        this.importFile(file, { overwrite, validate });
    }

    importFile(file, options) {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                const data = this.parseFileContent(content, file.name);
                
                if (options.validate && !this.validateData(data)) {
                    this.addHistoryRecord('import', file.name, 'error', 'Ошибка валидации данных');
                    return;
                }
                
                await this.processImportedData(data, options.overwrite);
                this.addHistoryRecord('import', file.name, 'success', 'Импорт завершен успешно');
                
                if (window.app) {
                    window.app.showNotification('Данные импортированы!', 'success');
                }
                
            } catch (error) {
                console.error('Ошибка импорта:', error);
                this.addHistoryRecord('import', file.name, 'error', error.message);
                
                if (window.app) {
                    window.app.showNotification('Ошибка импорта: ' + error.message, 'error');
                }
            }
        };
        
        reader.readAsText(file);
    }

    parseFileContent(content, filename) {
        const lowerFilename = filename.toLowerCase();
        
        // Проверяем LCX форматы
        if (lowerFilename.includes('.lcx.json') || lowerFilename.includes('.lctx.json')) {
            return { type: 'lcx', data: JSON.parse(content) };
        }
        
        const extension = filename.split('.').pop().toLowerCase();
        
        switch (extension) {
            case 'json':
                return { type: 'json', data: JSON.parse(content) };
            case 'csv':
                return { type: 'csv', data: this.parseCSV(content) };
            default:
                throw new Error('Неподдерживаемый формат файла');
        }
    }

    parseCSV(content) {
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim());
                const row = {};
                headers.forEach((header, index) => {
                    row[header] = values[index] || '';
                });
                data.push(row);
            }
        }
        
        return data;
    }

    validateData(data) {
        // Простая валидация данных
        if (!data || typeof data !== 'object') {
            return false;
        }
        
        // Валидация LCX данных
        if (data.type === 'lcx') {
            const lcxData = data.data;
            return lcxData.schemaVersion && lcxData.source && lcxData.tables;
        }
        
        // Дополнительная валидация в зависимости от структуры данных
        return true;
    }

    async processImportedData(data, overwrite) {
        // Обработка LCX данных
        if (data.type === 'lcx') {
            return await this.processLCXData(data.data);
        }
        
        // Обработка обычных данных проекта
        const actualData = data.data || data;
        
        if (overwrite) {
            // Перезаписываем все данные
            if (actualData.containers) {
                window.app.containers = actualData.containers;
            }
            if (actualData.pileItems) {
                window.app.pileItems = actualData.pileItems;
            }
        } else {
            // Добавляем к существующим данным
            if (actualData.containers) {
                window.app.containers.push(...actualData.containers);
            }
            if (actualData.pileItems) {
                window.app.pileItems.push(...actualData.pileItems);
            }
        }
        
        // Обновляем отображение
        if (window.app) {
            window.app.updateViewContent(window.app.currentView);
        }
    }

    async processLCXData(lcxData) {
        // Создаем и показываем прогресс
        const progress = new LoadingProgress();
        progress.show([
            { title: 'Шаг 1: Инициализация', description: 'Подготовка базы данных и парсера' },
            { title: 'Шаг 2: Парсинг файла', description: 'Чтение и валидация LCX данных' },
            { title: 'Шаг 3: Загрузка категорий', description: 'Сохранение категорий деталей' },
            { title: 'Шаг 4: Загрузка цветов', description: 'Сохранение информации о цветах' },
            { title: 'Шаг 5: Загрузка деталей', description: 'Сохранение каталога деталей' },
            { title: 'Шаг 6: Загрузка связей', description: 'Сохранение связей деталь-цвет' },
            { title: 'Шаг 7: Завершение', description: 'Обновление индексов и финализация' }
        ], {
            onCancel: () => {
                console.log('❌ LCX import cancelled by user');
                progress.hide();
            }
        });

        try {
            // Создаем LCX адаптер если его нет
            if (!window.lcxAdapter) {
                window.lcxAdapter = new LCXIndexedDBAdapter();
            }

            // Создаем временный файл для парсера
            const lcxBlob = new Blob([JSON.stringify(lcxData)], { type: 'application/json' });
            lcxBlob.name = 'imported.lcx.json';

            // Загружаем LCX данные с прогрессом
            const stats = await window.lcxAdapter.loadFromLCX(lcxBlob, (stepIndex, progressPercent, details) => {
                progress.updateStep(stepIndex, progressPercent, details);
            });
            
            // Завершаем последний шаг
            progress.completeStep(6, `Загружено: ${stats.parts} деталей, ${stats.colors} цветов`);
            
            // Обновляем BrickLink данные в приложении
            if (window.brickLinkData) {
                window.brickLinkData.dbAdapter = window.lcxAdapter;
                window.brickLinkData.isLoaded = true;
            }

            console.log('✅ LCX data imported successfully:', stats);
            
            // Скрываем прогресс через небольшую задержку
            setTimeout(() => {
                progress.hide();
            }, 1500);
            
            return stats;
        } catch (error) {
            console.error('❌ Failed to process LCX data:', error);
            progress.showError(progress.currentStep, error.message);
            
            // Скрываем прогресс через задержку при ошибке
            setTimeout(() => {
                progress.hide();
            }, 3000);
            
            throw error;
        }
    }

    exportToJSON() {
        const data = {
            containers: window.app?.containers || [],
            pileItems: window.app?.pileItems || [],
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        this.downloadFile(blob, 'lego-storage-export.json');
        
        this.addHistoryRecord('export', 'lego-storage-export.json', 'success', 'JSON экспорт завершен');
    }

    exportToCSV() {
        const containers = window.app?.containers || [];
        const pileItems = window.app?.pileItems || [];
        
        let csvContent = 'Type,Name,Part ID,Color,Quantity,Location\n';
        
        // Экспорт контейнеров
        containers.forEach(container => {
            container.cells.forEach((cell, index) => {
                if (cell) {
                    csvContent += `Container,${container.name},${cell.partId},${cell.color},${cell.quantity},${container.name} (cell ${index + 1})\n`;
                }
            });
        });
        
        // Экспорт кучи
        pileItems.forEach(item => {
            csvContent += `Pile,${item.name},${item.partId},${item.color},${item.quantity},Pile\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        this.downloadFile(blob, 'lego-storage-export.csv');
        
        this.addHistoryRecord('export', 'lego-storage-export.csv', 'success', 'CSV экспорт завершен');
    }

    exportToBrickLink() {
        const containers = window.app?.containers || [];
        const pileItems = window.app?.pileItems || [];
        
        let bricklinkContent = 'Part ID,Color,Quantity\n';
        
        // Собираем все детали
        const allItems = new Map();
        
        containers.forEach(container => {
            container.cells.forEach(cell => {
                if (cell) {
                    const key = `${cell.partId}-${cell.color}`;
                    if (allItems.has(key)) {
                        allItems.get(key).quantity += cell.quantity;
                    } else {
                        allItems.set(key, {
                            partId: cell.partId,
                            color: cell.color,
                            quantity: cell.quantity
                        });
                    }
                }
            });
        });
        
        pileItems.forEach(item => {
            const key = `${item.partId}-${item.color}`;
            if (allItems.has(key)) {
                allItems.get(key).quantity += item.quantity;
            } else {
                allItems.set(key, {
                    partId: item.partId,
                    color: item.color,
                    quantity: item.quantity
                });
            }
        });
        
        // Формируем BrickLink формат
        allItems.forEach(item => {
            bricklinkContent += `${item.partId},${item.color},${item.quantity}\n`;
        });
        
        const blob = new Blob([bricklinkContent], { type: 'text/csv' });
        this.downloadFile(blob, 'lego-storage-bricklink.csv');
        
        this.addHistoryRecord('export', 'lego-storage-bricklink.csv', 'success', 'BrickLink экспорт завершен');
    }

    async exportToLCX() {
        try {
            // Создаем LCX адаптер если его нет
            if (!window.lcxAdapter) {
                window.lcxAdapter = new LCXIndexedDBAdapter();
                await window.lcxAdapter.init();
            }

            // Получаем статистику для проверки наличия данных
            const stats = await window.lcxAdapter.getStats();
            
            if (stats.parts === 0 || stats.colors === 0) {
                if (window.app) {
                    window.app.showNotification('Нет данных для экспорта. Импортируйте LCX файл сначала.', 'warning');
                }
                return;
            }

            // Экспортируем данные в LCX формат
            const lcxData = await this.generateLCXExport();
            const jsonString = JSON.stringify(lcxData, null, 2);
            
            const blob = new Blob([jsonString], { type: 'application/json' });
            this.downloadFile(blob, 'bricklink-catalog.lcx.json');
            
            this.addHistoryRecord('export', 'bricklink-catalog.lcx.json', 'success', 'LCX экспорт завершен');
            
            if (window.app) {
                window.app.showNotification('LCX каталог экспортирован!', 'success');
            }
        } catch (error) {
            console.error('Ошибка экспорта LCX:', error);
            this.addHistoryRecord('export', 'bricklink-catalog.lcx.json', 'error', error.message);
            
            if (window.app) {
                window.app.showNotification('Ошибка экспорта LCX: ' + error.message, 'error');
            }
        }
    }

    async generateLCXExport() {
        const adapter = window.lcxAdapter;
        
        // Получаем все данные из IndexedDB
        const [categories, colors, parts, partColors] = await Promise.all([
            this.getAllFromStore(adapter, 'categories'),
            this.getAllFromStore(adapter, 'colors'),
            this.getAllFromStore(adapter, 'parts'),
            adapter.db.objectStoreNames.contains('partColors') ? 
                this.getAllFromStore(adapter, 'partColors') : []
        ]);

        // Преобразуем в формат LCX-Tabular
        const lcxData = {
            schemaVersion: 1,
            source: "bricklink",
            version: new Date().toISOString(),
            tables: {
                categories: this.arrayToLCXTable(categories, ['id', 'name']),
                colors: this.arrayToLCXTable(colors, [
                    'id', 'name', 'rgb', 'type', 'parts', 
                    'inSets', 'wanted', 'forSale', 'yearFrom', 'yearTo'
                ]),
                parts: this.arrayToLCXTable(parts, ['blId', 'name', 'catId', 'alt'])
            }
        };

        // Добавляем partColors если есть данные
        if (partColors.length > 0) {
            lcxData.tables.partColors = this.arrayToLCXTable(partColors, ['partId', 'colorId', 'hasImg']);
        }

        return lcxData;
    }

    async getAllFromStore(adapter, storeName) {
        return new Promise((resolve, reject) => {
            const transaction = adapter.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    arrayToLCXTable(array, columns) {
        const rows = array.map(item => {
            return columns.map(col => {
                const value = item[col];
                // Обрабатываем null/undefined значения
                return value === null || value === undefined ? null : value;
            });
        });

        return {
            cols: columns,
            rows: rows
        };
    }

    downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    addHistoryRecord(type, filename, status, details) {
        const record = {
            type,
            filename,
            status,
            details,
            date: new Date().toISOString()
        };
        
        this.importHistory.unshift(record);
        
        // Ограничиваем историю 50 записями
        if (this.importHistory.length > 50) {
            this.importHistory = this.importHistory.slice(0, 50);
        }
        
        // Обновляем отображение истории
        const historyContainer = document.getElementById('import-history');
        if (historyContainer) {
            historyContainer.innerHTML = this.renderImportHistory();
        }
    }
}
