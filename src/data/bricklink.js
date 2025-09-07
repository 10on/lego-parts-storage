/**
 * BrickLink Data Management
 * Парсинг и работа с данными деталей и цветов из BrickLink
 */

class BrickLinkData {
    constructor() {
        // Используем LCX адаптер по умолчанию
        this.dbAdapter = new LCXIndexedDBAdapter();
        this.isLoaded = false;
    }

    /**
     * Загружает данные деталей и цветов с отображением прогресса
     */
    async loadData(showProgress = true, progressCallback = null) {
        if (this.isLoaded) return;

        let progress = null;
        
        if (showProgress) {
            if (typeof LoadingProgress === 'undefined') {
                console.error('❌ LoadingProgress не загружен');
                showProgress = false;
            } else {
                progress = LoadingProgress.createLCXProgress();
                if (!progress) {
                    console.error('❌ Не удалось создать прогресс-бар');
                    showProgress = false;
                }
            }
        }

        try {
            // Этап 1: Инициализация базы данных
            if (progress) progress.updateStep(0, 50, 'Создание таблиц...');
            if (progressCallback) progressCallback(0, 50, 'Создание таблиц...');
            await this.dbAdapter.init();
            if (progress) progress.completeStep(0, 'База данных готова');
            if (progressCallback) progressCallback(0, 100, 'База данных готова');
            
            // Этап 2: Скачивание файла БД
            if (progress) progress.updateStep(1, 5, 'Скачивание файла БД...');
            if (progressCallback) progressCallback(1, 5, 'Скачивание файла БД...');
            if (progress) progress.updateStep(1, 10, 'Получение размера файла...');
            if (progressCallback) progressCallback(1, 10, 'Получение размера файла...');
            if (progress) progress.updateStep(1, 15, 'Начинаем скачивание...');
            if (progressCallback) progressCallback(1, 15, 'Начинаем скачивание...');
            // Прогресс скачивания будет обновляться в downloadInChunks
            if (progress) progress.updateStep(1, 95, 'Скачивание завершается...');
            if (progressCallback) progressCallback(1, 95, 'Скачивание завершается...');
            if (progress) progress.completeStep(1, 'Файл БД скачан');
            if (progressCallback) progressCallback(1, 100, 'Файл БД скачан');
            
            // Этап 3: Распаковка
            if (progress) progress.updateStep(2, 5, 'Распаковка...');
            if (progressCallback) progressCallback(2, 5, 'Распаковка...');
            if (progress) progress.updateStep(2, 10, 'Начинаем распаковку...');
            if (progressCallback) progressCallback(2, 10, 'Начинаем распаковку...');
            // Прогресс распаковки будет обновляться в decompressGzipWithProgress
            if (progress) progress.updateStep(2, 95, 'Завершение распаковки...');
            if (progressCallback) progressCallback(2, 95, 'Завершение распаковки...');
            if (progress) progress.completeStep(2, 'Распаковка завершена');
            if (progressCallback) progressCallback(2, 100, 'Распаковка завершена');
            
            // Этап 4: Обработка данных
            if (progress) progress.updateStep(3, 20, 'Обработка данных...');
            if (progressCallback) progressCallback(3, 20, 'Обработка данных...');
            if (progress) progress.updateStep(3, 50, 'Данные обработаны...');
            if (progressCallback) progressCallback(3, 50, 'Данные обработаны...');
            if (progress) progress.updateStep(3, 80, 'Подготовка к сохранению...');
            if (progressCallback) progressCallback(3, 80, 'Подготовка к сохранению...');
            if (progress) progress.completeStep(3, 'Обработка завершена');
            if (progressCallback) progressCallback(3, 100, 'Обработка завершена');
            
            // Этап 5: Создание индексов
            if (progress) progress.updateStep(4, 100, 'Создание индексов...');
            if (progressCallback) progressCallback(4, 100, 'Создание индексов...');
            if (progress) progress.completeStep(4, 'Индексы созданы');
            if (progressCallback) progressCallback(4, 100, 'Индексы созданы');
            
            // Этап 6: Вставка данных в базу
            if (progress) progress.updateStep(5, 100, 'Вставка данных в базу...');
            if (progressCallback) progressCallback(5, 100, 'Вставка данных в базу...');
            if (progress) progress.completeStep(5, 'Данные вставлены');
            if (progressCallback) progressCallback(5, 100, 'Данные вставлены');
            
            // Этап 7: Загрузка деталей
            if (progress) progress.updateStep(6, 0, 'Начинаем загрузку деталей...');
            if (progressCallback) progressCallback(6, 0, 'Начинаем загрузку деталей...');
            
            // Создаем callback для loadData
            const dbProgressCallback = progress ? (step, percent, message) => {
                if (step === 6) {
                    progress.updateStep(6, percent, message);
                }
                if (progressCallback) {
                    progressCallback(6, percent, message);
                }
            } : progressCallback;
            
            await this.dbAdapter.loadData(dbProgressCallback);
            if (progress) progress.completeStep(6, 'Детали загружены');
            if (progressCallback) progressCallback(6, 100, 'Детали загружены');
            
            // Этап 8: Финализация
            if (progress) progress.updateStep(7, 100, 'Финализация...');
            if (progressCallback) progressCallback(7, 100, 'Финализация...');
            if (progress) progress.completeStep(7, 'Финализация завершена');
            if (progressCallback) progressCallback(7, 100, 'Финализация завершена');
            
            this.isLoaded = true;
            
            // Этап 9: Завершение
            if (progress) progress.updateStep(8, 100, 'Финализация...');
            if (progressCallback) progressCallback(8, 100, 'Финализация...');
            
            // Показываем статистику
            const stats = await this.dbAdapter.getStats();
            console.log(`✅ BrickLink data loaded from IndexedDB: ${stats.parts} parts, ${stats.colors} colors`);
            
            if (progress) {
                progress.completeStep(8, `Готово: ${stats.parts} деталей, ${stats.colors} цветов`);
                setTimeout(() => progress.hide(), 1000);
            }
            if (progressCallback) {
                progressCallback(8, 100, `Готово: ${stats.parts} деталей, ${stats.colors} цветов`);
            }
            
            return stats;
        } catch (error) {
            console.error('❌ Failed to load BrickLink data:', error);
            
            if (progress) {
                progress.showError(progress.currentStep, error.message);
                setTimeout(() => progress.hide(), 3000);
            }
            
            throw error;
        }
    }


    /**
     * Поиск деталей по запросу
     */
    async searchParts(query) {
        if (!this.isLoaded) return [];
        return this.dbAdapter.searchParts(query);
    }

    /**
     * Поиск цветов по запросу
     */
    async searchColors(query) {
        if (!this.isLoaded) return [];
        return this.dbAdapter.searchColors(query);
    }

    /**
     * Получить деталь по ID
     */
    async getPartById(partId) {
        if (!this.isLoaded) return null;
        return this.dbAdapter.getPartById(partId);
    }

    /**
     * Получить цвет по имени
     */
    async getColorByName(colorName) {
        if (!this.isLoaded) return null;
        return this.dbAdapter.getColorByName(colorName);
    }

    /**
     * Получить цвет по ID
     */
    async getColorById(colorId) {
        if (!this.isLoaded) return null;
        return this.dbAdapter.getColorById(colorId);
    }

    /**
     * Получить статистику данных
     */
    async getStats() {
        if (!this.isLoaded) return null;
        return this.dbAdapter.getStats();
    }
}

// Экспортируем синглтон
window.brickLinkData = new BrickLinkData();
