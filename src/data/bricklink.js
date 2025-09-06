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
    async loadData(showProgress = true) {
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
            await this.dbAdapter.init();
            if (progress) progress.completeStep(0, 'База данных готова');
            
            // Этап 2: Скачивание файла данных (симуляция)
            if (progress) progress.updateStep(1, 25, 'Подключение к серверу...');
            if (progress) progress.updateStep(1, 75, 'Скачивание файла...');
            if (progress) progress.completeStep(1, 'Файл скачан');
            
            // Этап 3: Распаковка архива (симуляция)
            if (progress) progress.updateStep(2, 50, 'Извлечение данных...');
            if (progress) progress.completeStep(2, 'Архив распакован');
            
            // Этап 4: Парсинг JSON данных
            if (progress) progress.updateStep(3, 50, 'Обработка структуры...');
            if (progress) progress.completeStep(3, 'Данные обработаны');
            
            // Этап 5: Загрузка категорий
            if (progress) progress.updateStep(4, 100, 'Сохранение категорий...');
            if (progress) progress.completeStep(4, 'Категории загружены');
            
            // Этап 6: Загрузка цветов
            if (progress) progress.updateStep(5, 100, 'Сохранение цветов...');
            if (progress) progress.completeStep(5, 'Цвета загружены');
            
            // Этап 7: Загрузка деталей
            if (progress) progress.updateStep(6, 50, 'Сохранение деталей...');
            
            // Создаем callback для loadData
            const progressCallback = progress ? (step, percent, message) => {
                if (step === 6) {
                    progress.updateStep(6, percent, message);
                }
            } : null;
            
            await this.dbAdapter.loadData(progressCallback);
            if (progress) progress.completeStep(6, 'Детали загружены');
            
            // Этап 8: Создание индексов
            if (progress) progress.updateStep(7, 100, 'Построение индексов...');
            if (progress) progress.completeStep(7, 'Индексы созданы');
            
            this.isLoaded = true;
            
            // Этап 9: Завершение
            if (progress) progress.updateStep(8, 100, 'Финализация...');
            
            // Показываем статистику
            const stats = await this.dbAdapter.getStats();
            console.log(`✅ BrickLink data loaded from IndexedDB: ${stats.parts} parts, ${stats.colors} colors`);
            
            if (progress) {
                progress.completeStep(8, `Готово: ${stats.parts} деталей, ${stats.colors} цветов`);
                setTimeout(() => progress.hide(), 1000);
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
