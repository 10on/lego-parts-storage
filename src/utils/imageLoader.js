/**
 * Утилитарный класс для загрузки изображений с fallback стратегиями
 */
class ImageLoader {
    constructor() {
        this.fallbackCache = new Map(); // Кэш для fallback изображений
    }

    /**
     * Загружает изображение с fallback стратегиями
     * @param {string} originalUrl - Оригинальный URL изображения
     * @param {HTMLElement} imageElement - DOM элемент изображения
     * @param {HTMLElement} placeholderElement - DOM элемент заглушки (опционально)
     * @param {Object} options - Дополнительные опции
     * @returns {Promise<boolean>} - true если изображение загружено, false если все fallback'и не сработали
     */
    async loadImageWithFallback(originalUrl, imageElement, placeholderElement = null, options = {}) {
        const {
            showFallbackIndicator = true,
            fallbackIndicatorText = '⚠️ Цвет',
            onSuccess = null,
            onError = null
        } = options;

        console.log('ImageLoader: Loading image:', originalUrl);

        try {
            // Пытаемся загрузить оригинальное изображение
            await this.loadImage(originalUrl, imageElement);
            console.log('ImageLoader: Original image loaded successfully');
            if (onSuccess) onSuccess(originalUrl, false);
            return true;
        } catch (error) {
            console.warn('ImageLoader: Original image failed, trying fallbacks:', error);
            
            // Получаем fallback URLs
            const fallbackUrls = this.getFallbackImageUrls(originalUrl);
            let fallbackLoaded = false;
            let loadedUrl = null;

            // Пробуем каждый fallback
            for (const fallbackUrl of fallbackUrls) {
                try {
                    await this.loadImage(fallbackUrl, imageElement);
                    console.log('ImageLoader: Fallback image loaded:', fallbackUrl);
                    loadedUrl = fallbackUrl;
                    fallbackLoaded = true;
                    
                    // Добавляем индикатор fallback'а
                    if (showFallbackIndicator) {
                        this.addFallbackIndicator(imageElement, fallbackIndicatorText);
                    }
                    
                    break; // Если fallback загрузился, выходим из цикла
                } catch (fallbackError) {
                    console.warn('ImageLoader: Fallback image failed:', fallbackUrl);
                    continue; // Пробуем следующий fallback
                }
            }

            if (fallbackLoaded) {
                if (onSuccess) onSuccess(loadedUrl, true);
                return true;
            } else {
                // Если все fallback'и не сработали, показываем заглушку
                this.showErrorPlaceholder(imageElement, placeholderElement, 'Изображение недоступно');
                if (onError) onError('All fallbacks failed');
                return false;
            }
        }
    }

    /**
     * Загружает изображение в элемент
     * @param {string} url - URL изображения
     * @param {HTMLElement} imageElement - DOM элемент изображения
     * @returns {Promise<void>}
     */
    loadImage(url, imageElement) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                imageElement.src = url;
                imageElement.style.display = 'block';
                if (imageElement.nextElementSibling && imageElement.nextElementSibling.classList.contains('part-image-placeholder')) {
                    imageElement.nextElementSibling.style.display = 'none';
                }
                resolve();
            };
            
            img.onerror = (error) => {
                reject(new Error(`Failed to load image: ${url}`));
            };
            
            img.src = url;
        });
    }

    /**
     * Получает список fallback URLs для изображения
     * @param {string} originalUrl - Оригинальный URL
     * @returns {string[]} - Массив fallback URLs
     */
    getFallbackImageUrls(originalUrl) {
        // Проверяем кэш
        if (this.fallbackCache.has(originalUrl)) {
            return this.fallbackCache.get(originalUrl);
        }

        // Извлекаем partId и colorId из URL
        const urlParts = originalUrl.match(/\/PN\/(\d+)\/(\w+)\.png$/);
        if (!urlParts) {
            this.fallbackCache.set(originalUrl, []);
            return [];
        }
        
        const [, colorId, partId] = urlParts;
        const fallbackUrls = [];
        
        // 1. Пробуем с дефолтным цветом (ID = 0)
        if (colorId !== '0') {
            fallbackUrls.push(`https://img.bricklink.com/ItemImage/PN/0/${partId}.png`);
        }
        
        // 2. Пробуем с базовыми цветами
        const basicColors = ['1', '2', '3', '4', '5']; // White, Tan, Yellow, Orange, Red
        for (const basicColorId of basicColors) {
            if (basicColorId !== colorId) {
                fallbackUrls.push(`https://img.bricklink.com/ItemImage/PN/${basicColorId}/${partId}.png`);
            }
        }
        
        // 3. Пробуем с черным цветом (ID = 11)
        if (colorId !== '11') {
            fallbackUrls.push(`https://img.bricklink.com/ItemImage/PN/11/${partId}.png`);
        }
        
        // Кэшируем результат
        this.fallbackCache.set(originalUrl, fallbackUrls);
        return fallbackUrls;
    }

    /**
     * Добавляет индикатор fallback'а к изображению
     * @param {HTMLElement} imageElement - DOM элемент изображения
     * @param {string} text - Текст индикатора
     */
    addFallbackIndicator(imageElement, text = '⚠️ Цвет') {
        // Удаляем существующий индикатор
        const existingIndicator = imageElement.parentElement.querySelector('.fallback-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }

        // Создаем новый индикатор
        const indicator = document.createElement('div');
        indicator.className = 'fallback-indicator';
        indicator.textContent = text;
        
        // Добавляем к родительскому элементу
        if (imageElement.parentElement) {
            imageElement.parentElement.style.position = 'relative';
            imageElement.parentElement.appendChild(indicator);
        }
    }

    /**
     * Показывает заглушку с ошибкой
     * @param {HTMLElement} imageElement - DOM элемент изображения
     * @param {HTMLElement} placeholderElement - DOM элемент заглушки
     * @param {string} message - Сообщение об ошибке
     */
    showErrorPlaceholder(imageElement, placeholderElement, message = 'Изображение недоступно') {
        if (imageElement) {
            imageElement.style.display = 'none';
            imageElement.src = '';
        }
        
        if (placeholderElement) {
            placeholderElement.style.display = 'flex';
            placeholderElement.innerHTML = `
                <div class="placeholder-icon">❌</div>
                <div class="placeholder-text">${message}</div>
            `;
            placeholderElement.style.color = 'var(--danger-color)';
        }
    }

    /**
     * Очищает кэш fallback'ов
     */
    clearCache() {
        this.fallbackCache.clear();
    }
}

// Создаем глобальный экземпляр
window.imageLoader = new ImageLoader();
