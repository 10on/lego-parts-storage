/**
 * BrickLink Data Management
 * Парсинг и работа с данными деталей и цветов из BrickLink
 */

class BrickLinkData {
    constructor() {
        this.dbAdapter = new IndexedDBAdapter();
        this.isLoaded = false;
    }

    /**
     * Загружает данные деталей и цветов
     */
    async loadData() {
        if (this.isLoaded) return;

        try {
            // Инициализируем IndexedDB
            await this.dbAdapter.init();
            
            // Загружаем данные из CSV в IndexedDB (если нужно)
            await this.dbAdapter.loadFromCSV();
            
            this.isLoaded = true;
            
            // Показываем статистику
            const stats = await this.dbAdapter.getStats();
            console.log(`✅ BrickLink data loaded from IndexedDB: ${stats.parts} parts, ${stats.colors} colors`);
        } catch (error) {
            console.error('❌ Failed to load BrickLink data:', error);
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
     * Получить статистику данных
     */
    async getStats() {
        if (!this.isLoaded) return null;
        return this.dbAdapter.getStats();
    }
}

// Экспортируем синглтон
window.brickLinkData = new BrickLinkData();
