// Менеджер изображений деталей
class ImageManager {
    constructor() {
        this.cache = new Map();
        this.fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0yMCAxMEwyMCAzME0xMCAyMEwzMCAyMCIgc3Ryb2tlPSIjQ0NDQ0NDIiBzdHJva2Utd2lkdGg9IjIiLz4KPC9zdmc+';
        this.init();
    }

    init() {
        // Инициализация кэша изображений
        this.loadCacheFromStorage();
    }

    async getImage(partId, colorId, source = 'bricklink') {
        const cacheKey = `${partId}-${colorId}-${source}`;
        
        // Проверяем кэш
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Загружаем изображение
        const imageUrl = await this.loadImage(partId, colorId, source);
        this.cache.set(cacheKey, imageUrl);
        this.saveCacheToStorage();
        
        return imageUrl;
    }

    async loadImage(partId, colorId, source) {
        try {
            let imageUrl;
            
            switch (source) {
                case 'bricklink':
                    imageUrl = this.getBrickLinkImageUrl(partId, colorId);
                    break;
                case 'rebrickable':
                    imageUrl = this.getRebrickableImageUrl(partId, colorId);
                    break;
                default:
                    imageUrl = this.fallbackImage;
            }

            // Проверяем доступность изображения
            const isValid = await this.validateImage(imageUrl);
            return isValid ? imageUrl : this.fallbackImage;
            
        } catch (error) {
            console.error('Ошибка загрузки изображения:', error);
            return this.fallbackImage;
        }
    }

    getBrickLinkImageUrl(partId, colorId) {
        return `https://img.bricklink.com/ItemImage/PN/${colorId}/${partId}.png`;
    }

    getRebrickableImageUrl(partId, colorId) {
        return `https://cdn.rebrickable.com/media/thumbs/parts/${partId}.png`;
    }

    async validateImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    // Кэширование
    loadCacheFromStorage() {
        try {
            const cached = localStorage.getItem('lego-storage-image-cache');
            if (cached) {
                const cacheData = JSON.parse(cached);
                this.cache = new Map(cacheData);
            }
        } catch (error) {
            console.error('Ошибка загрузки кэша изображений:', error);
        }
    }

    saveCacheToStorage() {
        try {
            const cacheData = Array.from(this.cache.entries());
            localStorage.setItem('lego-storage-image-cache', JSON.stringify(cacheData));
        } catch (error) {
            console.error('Ошибка сохранения кэша изображений:', error);
        }
    }

    clearCache() {
        this.cache.clear();
        localStorage.removeItem('lego-storage-image-cache');
    }

    // Предзагрузка изображений
    async preloadImages(parts) {
        const promises = parts.map(part => 
            this.getImage(part.partId, part.colorId, 'bricklink')
        );
        
        await Promise.all(promises);
    }

    // Получение изображения с обработкой ошибок
    getImageWithFallback(partId, colorId, source = 'bricklink') {
        return this.getImage(partId, colorId, source).catch(() => this.fallbackImage);
    }
}
