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
            
            // Этап 2: Чтение локального архива (теперь с реальным прогрессом)
            if (progress) progress.updateStep(1, 5, 'Чтение локального архива...');
            if (progressCallback) progressCallback(1, 5, 'Чтение локального архива...');
            if (progress) progress.updateStep(1, 10, 'Получение размера архива...');
            if (progressCallback) progressCallback(1, 10, 'Получение размера архива...');
            if (progress) progress.updateStep(1, 15, 'Начинаем чтение...');
            if (progressCallback) progressCallback(1, 15, 'Начинаем чтение...');
            // Прогресс чтения будет обновляться в downloadInChunks
            if (progress) progress.updateStep(1, 95, 'Чтение завершается...');
            if (progressCallback) progressCallback(1, 95, 'Чтение завершается...');
            if (progress) progress.completeStep(1, 'Архив прочитан');
            if (progressCallback) progressCallback(1, 100, 'Архив прочитан');
            
            // Этап 3: Распаковка архива (теперь с реальным прогрессом)
            if (progress) progress.updateStep(2, 5, 'Инициализация распаковки...');
            if (progressCallback) progressCallback(2, 5, 'Инициализация распаковки...');
            if (progress) progress.updateStep(2, 10, 'Начинаем извлечение...');
            if (progressCallback) progressCallback(2, 10, 'Начинаем извлечение...');
            // Прогресс распаковки будет обновляться в decompressGzipWithProgress
            if (progress) progress.updateStep(2, 95, 'Завершение распаковки...');
            if (progressCallback) progressCallback(2, 95, 'Завершение распаковки...');
            if (progress) progress.completeStep(2, 'Архив распакован');
            if (progressCallback) progressCallback(2, 100, 'Архив распакован');
            
            // Этап 4: Парсинг JSON данных (теперь с более детальным прогрессом)
            if (progress) progress.updateStep(3, 20, 'Начало парсинга JSON...');
            if (progressCallback) progressCallback(3, 20, 'Начало парсинга JSON...');
            if (progress) progress.updateStep(3, 50, 'JSON распарсен...');
            if (progressCallback) progressCallback(3, 50, 'JSON распарсен...');
            if (progress) progress.updateStep(3, 80, 'Валидация структуры...');
            if (progressCallback) progressCallback(3, 80, 'Валидация структуры...');
            if (progress) progress.completeStep(3, 'Данные обработаны');
            if (progressCallback) progressCallback(3, 100, 'Данные обработаны');
            
            // Этап 5: Загрузка категорий
            if (progress) progress.updateStep(4, 100, 'Сохранение категорий...');
            if (progressCallback) progressCallback(4, 100, 'Сохранение категорий...');
            if (progress) progress.completeStep(4, 'Категории загружены');
            if (progressCallback) progressCallback(4, 100, 'Категории загружены');
            
            // Этап 6: Загрузка цветов
            if (progress) progress.updateStep(5, 100, 'Сохранение цветов...');
            if (progressCallback) progressCallback(5, 100, 'Сохранение цветов...');
            if (progress) progress.completeStep(5, 'Цвета загружены');
            if (progressCallback) progressCallback(5, 100, 'Цвета загружены');
            
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
            
            // Этап 8: Создание индексов
            if (progress) progress.updateStep(7, 100, 'Построение индексов...');
            if (progressCallback) progressCallback(7, 100, 'Построение индексов...');
            if (progress) progress.completeStep(7, 'Индексы созданы');
            if (progressCallback) progressCallback(7, 100, 'Индексы созданы');
            
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
