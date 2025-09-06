// Вид импорта и экспорта данных
class ImportView {
    constructor() {
        this.importHistory = [];
    }

    render() {
        console.log('🎨 Рендеринг ImportView...');
        const container = document.getElementById('import-content');
        if (!container) {
            console.log('❌ Контейнер import-content не найден');
            return;
        }

        console.log('✅ Контейнер найден, рендерим интерфейс...');
        container.innerHTML = this.renderImportInterface();
        
        // Небольшая задержка, чтобы DOM успел обновиться
        setTimeout(() => {
            this.setupEventListeners();
        }, 100);
    }

    renderImportInterface() {
        return `
            <div class="import-section">
                <h3>Импорт из файла</h3>
                <p>Импортируйте данные из JSON или LCX файлов</p>
                <div class="import-form">
                    <input type="file" id="import-file" accept=".json,.lcx.json,.lctx.json,.gz" class="file-input">
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
                <p>Экспортируйте все ваши данные в JSON</p>
                <button class="btn btn-primary" id="export-json-btn">Экспорт JSON</button>
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
        console.log('🔧 Настройка обработчиков событий ImportView...');
        
        // Импорт файла
        const importBtn = document.getElementById('import-btn');
        if (importBtn) {
            console.log('✅ Найден import-btn');
            importBtn.addEventListener('click', () => {
                this.handleImport();
            });
        } else {
            console.log('❌ import-btn не найден');
        }

        // Экспорт JSON
        const exportJsonBtn = document.getElementById('export-json-btn');
        if (exportJsonBtn) {
            console.log('✅ Найден export-json-btn');
            exportJsonBtn.addEventListener('click', () => {
                console.log('🖱️ Клик по кнопке экспорта JSON');
                this.exportToJSON();
            });
        } else {
            console.log('❌ export-json-btn не найден');
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
            default:
                throw new Error('Неподдерживаемый формат файла');
        }
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
        
        // Проверяем, является ли это полным экспортом localStorage
        if (actualData.exportType === 'full-localStorage-backup') {
            return await this.processFullBackupData(actualData, overwrite);
        }
        
        // Обработка старых форматов данных
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

    async processFullBackupData(data, overwrite) {
        try {
            // Восстанавливаем данные в localStorage
            const keys = ['project', 'containers', 'snapshots', 'settings', 'imageCache'];
            
            for (const key of keys) {
                if (data[key] !== null) {
                    localStorage.setItem(`lego-storage-${key}`, JSON.stringify(data[key]));
                }
            }
            
            // Перезагружаем приложение для применения изменений
            if (window.app) {
                window.app.showNotification('Данные восстановлены! Перезагружаем приложение...', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
            
        } catch (error) {
            console.error('Ошибка восстановления данных:', error);
            throw new Error('Не удалось восстановить данные: ' + error.message);
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
        console.log('🔄 Начинаем экспорт JSON...');
        
        // Собираем все данные из localStorage
        const data = {
            // Основные данные проекта
            project: this.getLocalStorageData('lego-storage-project'),
            containers: this.getLocalStorageData('lego-storage-containers'),
            snapshots: this.getLocalStorageData('lego-storage-snapshots'),
            settings: this.getLocalStorageData('lego-storage-settings'),
            imageCache: this.getLocalStorageData('lego-storage-image-cache'),
            
            // Метаданные экспорта
            exportedAt: new Date().toISOString(),
            version: '1.0',
            exportType: 'full-localStorage-backup'
        };
        
        console.log('📦 Данные для экспорта:', data);
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        this.downloadFile(blob, 'lego-storage-full-export.json');
        
        this.addHistoryRecord('export', 'lego-storage-full-export.json', 'success', 'Полный JSON экспорт завершен');
        
        console.log('✅ JSON экспорт завершен');
    }

    getLocalStorageData(key) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error(`Ошибка получения данных из localStorage для ключа ${key}:`, error);
            return null;
        }
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
