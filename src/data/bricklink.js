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
     * Загружает данные деталей из CSV
     */
    async loadParts() {
        const response = await fetch('/data/bricklink/parts.csv');
        const text = await response.text();
        
        const lines = text.split('\n');
        const headers = lines[0].split('\t');
        
        this.parts = [];
        
        for (let i = 3; i < lines.length; i++) { // Пропускаем заголовок и пустые строки
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
            
            // Пропускаем стикеры и homemaker детали
            if (part.categoryName === 'Sticker Sheet' || part.categoryName === 'Homemaker') {
                continue;
            }
            
            if (part.partId && part.name) {
                this.parts.push(part);
            }
        }
        
        console.log(`📦 Loaded ${this.parts.length} parts`);
    }

    /**
     * Загружает данные цветов из CSV
     */
    async loadColors() {
        const response = await fetch('/data/bricklink/colors.csv');
        const text = await response.text();
        
        const lines = text.split('\n');
        
        this.colors = [];
        
        for (let i = 3; i < lines.length; i++) { // Пропускаем заголовок и пустые строки
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split('\t');
            if (values.length < 4) continue;
            
            const color = {
                id: values[0] || '',
                name: values[1] || '',
                rgb: values[2] || '',
                type: values[3] || '',
                parts: parseInt(values[4]) || 0
            };
            
            // Пропускаем специальные цвета
            if (color.name === '(Not Applicable)' || !color.name || !color.rgb) {
                continue;
            }
            
            this.colors.push(color);
        }
        
        // Сортируем по популярности (количеству деталей)
        this.colors.sort((a, b) => b.parts - a.parts);
        
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
