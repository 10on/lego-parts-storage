/**
 * BrickLink Data Management
 * Парсинг и работа с данными деталей и цветов из BrickLink
 */

class BrickLinkData {
    constructor() {
        this.parts = [];
        this.colors = [];
        this.isLoaded = false;
    }

    /**
     * Загружает данные деталей и цветов
     */
    async loadData() {
        if (this.isLoaded) return;

        try {
            await Promise.all([
                this.loadParts(),
                this.loadColors()
            ]);
            this.isLoaded = true;
            console.log(`✅ BrickLink data loaded: ${this.parts.length} parts, ${this.colors.length} colors`);
        } catch (error) {
            console.error('❌ Failed to load BrickLink data:', error);
        }
    }

    /**
     * Загружает данные деталей из JSON
     */
    async loadParts() {
        const response = await fetch('/data/bricklink/parts.json');
        const data = await response.json();
        
        this.parts = data.map(part => ({
            categoryId: part.catId,
            categoryName: part.cat,
            partId: part.id,
            name: part.name
        }));
        
        console.log(`📦 Loaded ${this.parts.length} parts`);
    }

    /**
     * Загружает данные цветов из JSON
     */
    async loadColors() {
        const response = await fetch('/data/bricklink/colors.json');
        this.colors = await response.json();
        
        console.log(`🎨 Loaded ${this.colors.length} colors`);
    }

    /**
     * Поиск деталей по запросу
     */
    searchParts(query) {
        if (!query || query.length < 2) return [];
        
        const searchQuery = query.toLowerCase();
        
        return this.parts
            .filter(part => 
                part.partId.toLowerCase().includes(searchQuery) ||
                part.name.toLowerCase().includes(searchQuery) ||
                part.categoryName.toLowerCase().includes(searchQuery)
            )
            .slice(0, 50) // Ограничиваем до 50 результатов
            .map(part => ({
                value: part.partId,
                label: `${part.partId} - ${part.name}`,
                category: part.categoryName,
                data: part
            }));
    }

    /**
     * Поиск цветов по запросу
     */
    searchColors(query) {
        if (!query || query.length < 1) {
            // Возвращаем топ-20 популярных цветов
            return this.colors
                .slice(0, 20)
                .map(color => ({
                    value: color.name,
                    label: color.name,
                    rgb: color.rgb,
                    data: color
                }));
        }
        
        const searchQuery = query.toLowerCase();
        
        return this.colors
            .filter(color => 
                color.name.toLowerCase().includes(searchQuery) ||
                color.id.includes(searchQuery)
            )
            .slice(0, 20)
            .map(color => ({
                value: color.name,
                label: color.name,
                rgb: color.rgb,
                data: color
            }));
    }

    /**
     * Получить деталь по ID
     */
    getPartById(partId) {
        return this.parts.find(part => part.partId === partId);
    }

    /**
     * Получить цвет по имени
     */
    getColorByName(colorName) {
        return this.colors.find(color => color.name === colorName);
    }

    /**
     * Получить все категории деталей
     */
    getCategories() {
        const categories = [...new Set(this.parts.map(part => part.categoryName))]
            .filter(cat => cat)
            .sort();
        return categories;
    }

    /**
     * Получить популярные цвета (топ-10)
     */
    getPopularColors() {
        return this.colors.slice(0, 10);
    }
}

// Экспортируем синглтон
window.brickLinkData = new BrickLinkData();
