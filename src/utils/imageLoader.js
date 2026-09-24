/**
 * Утилитарный класс для загрузки изображений с fallback стратегиями
 */
export class ImageLoader {
    constructor() {
        this.fallbackCache = new Map(); // Кэш для fallback изображений
    }

    /**
     * Формирует URL изображения детали на BrickLink
     * @param {string} partId - ID детали
     * @param {string|number} colorId - ID цвета BrickLink (0 - дефолтный рендер)
     * @returns {string}
     */
    getPartImageUrl(partId, colorId = '0') {
        return `https://img.bricklink.com/ItemImage/PN/${colorId}/${partId}.png`;
    }

    /**
     * Подключает fallback для всех изображений с data-original-src внутри root:
     * если оригинал не загружается, пробует альтернативные цвета
     * @param {ParentNode} root - Элемент, в котором искать изображения
     * @param {string} selector - Селектор изображений
     */
    applyFallbacks(root = document, selector = 'img[data-original-src]') {
        root.querySelectorAll(selector).forEach(img => {
            const originalSrc = img.dataset.originalSrc;
            if (!originalSrc) return;

            const testImg = new Image();
            testImg.onload = () => {
                if (img.src !== originalSrc) {
                    img.src = originalSrc;
                }
            };
            testImg.onerror = () => {
                this.loadImageWithFallback(originalSrc, img, null, {
                    onSuccess: (url, isFallback) => {
                        if (isFallback) {
                            img.classList.add('fallback-image');
                        }
                    }
                });
            };
            testImg.src = originalSrc;
        });
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

        try {
            // Пытаемся загрузить оригинальное изображение
            await this.loadImage(originalUrl, imageElement);
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
            fallbackUrls.push(this.getPartImageUrl(partId, '0'));
        }
        
        // 2. Пробуем с базовыми цветами
        const basicColors = ['1', '2', '3', '4', '5']; // White, Tan, Yellow, Orange, Red
        for (const basicColorId of basicColors) {
            if (basicColorId !== colorId) {
                fallbackUrls.push(this.getPartImageUrl(partId, basicColorId));
            }
        }
        
        // 3. Пробуем с черным цветом (ID = 11)
        if (colorId !== '11') {
            fallbackUrls.push(this.getPartImageUrl(partId, '11'));
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

export const imageLoader = new ImageLoader();
