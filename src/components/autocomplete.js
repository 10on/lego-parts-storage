/**
 * Simple Autocomplete Component
 * Легкий компонент автокомплита без зависимостей
 */

class AutoComplete {
    constructor(input, options = {}) {
        this.input = input;
        this.options = {
            minChars: 1,
            delay: 300,
            maxResults: 20,
            placeholder: 'Начните вводить...',
            noResultsText: 'Ничего не найдено',
            loadingText: 'Поиск...',
            showCategories: false,
            ...options
        };
        
        this.container = null;
        this.dropdown = null;
        this.currentFocus = -1;
        this.searchTimeout = null;
        this.isOpen = false;
        
        this.init();
    }

    init() {
        this.createContainer();
        this.setupEventListeners();
        this.input.setAttribute('autocomplete', 'off');
        this.input.setAttribute('placeholder', this.options.placeholder);
    }

    createContainer() {
        // Создаем контейнер
        this.container = document.createElement('div');
        this.container.className = 'autocomplete-container';
        this.container.style.position = 'relative';
        
        // Оборачиваем input
        this.input.parentNode.insertBefore(this.container, this.input);
        this.container.appendChild(this.input);
        
        // Создаем dropdown
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'autocomplete-dropdown';
        this.dropdown.style.display = 'none';
        this.container.appendChild(this.dropdown);
    }

    setupEventListeners() {
        // Ввод текста
        this.input.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });

        // Навигация клавишами
        this.input.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Фокус
        this.input.addEventListener('focus', () => {
            if (this.input.value.length >= this.options.minChars) {
                this.handleInput(this.input.value);
            }
        });

        // Закрытие при клике вне
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });
    }

    handleInput(value) {
        clearTimeout(this.searchTimeout);
        
        if (value.length < this.options.minChars) {
            this.close();
            return;
        }

        this.searchTimeout = setTimeout(() => {
            this.search(value);
        }, this.options.delay);
    }

    async search(query) {
        if (!this.options.source) return;

        this.showLoading();

        try {
            const results = await this.options.source(query);
            this.showResults(results);
        } catch (error) {
            console.error('Autocomplete search error:', error);
            this.showError();
        }
    }

    showLoading() {
        this.dropdown.innerHTML = `
            <div class="autocomplete-item loading">
                <span class="loading-spinner">⏳</span>
                ${this.options.loadingText}
            </div>
        `;
        this.open();
    }

    showResults(results) {
        if (!results || results.length === 0) {
            this.dropdown.innerHTML = `
                <div class="autocomplete-item no-results">
                    ${this.options.noResultsText}
                </div>
            `;
            this.open();
            return;
        }

        let html = '';
        let currentCategory = '';

        results.slice(0, this.options.maxResults).forEach((item, index) => {
            // Показываем категорию если включено
            if (this.options.showCategories && item.category && item.category !== currentCategory) {
                currentCategory = item.category;
                html += `<div class="autocomplete-category">${currentCategory}</div>`;
            }

            html += `
                <div class="autocomplete-item" data-index="${index}" data-value="${item.value}">
                    ${this.renderItem(item)}
                </div>
            `;
        });

        this.dropdown.innerHTML = html;
        this.currentFocus = -1;
        this.attachItemListeners();
        this.open();
    }

    renderItem(item) {
        let html = `<span class="item-label">${this.highlightMatch(item.label)}</span>`;
        
        // Добавляем цветовой индикатор для цветов
        if (item.rgb) {
            html = `
                <div class="color-item">
                    <span class="color-swatch" style="background-color: #${item.rgb}"></span>
                    ${html}
                </div>
            `;
        }

        // Добавляем категорию для деталей
        if (item.category && !this.options.showCategories) {
            html += `<span class="item-category">${item.category}</span>`;
        }

        return html;
    }

    highlightMatch(text) {
        const query = this.input.value;
        if (!query) return text;
        
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    attachItemListeners() {
        this.dropdown.querySelectorAll('.autocomplete-item:not(.no-results):not(.loading)').forEach(item => {
            item.addEventListener('click', () => {
                this.selectItem(item);
            });
        });
    }

    selectItem(item) {
        const value = item.dataset.value;
        this.input.value = value;
        this.close();
        
        // Вызываем callback если есть
        if (this.options.onSelect) {
            this.options.onSelect(value, item);
        }

        // Генерируем событие change
        this.input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    handleKeydown(e) {
        if (!this.isOpen) return;

        const items = this.dropdown.querySelectorAll('.autocomplete-item:not(.no-results):not(.loading)');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.currentFocus = Math.min(this.currentFocus + 1, items.length - 1);
                this.updateFocus(items);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.currentFocus = Math.max(this.currentFocus - 1, -1);
                this.updateFocus(items);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.currentFocus >= 0 && items[this.currentFocus]) {
                    this.selectItem(items[this.currentFocus]);
                }
                break;
                
            case 'Escape':
                this.close();
                break;
        }
    }

    updateFocus(items) {
        items.forEach((item, index) => {
            item.classList.toggle('focused', index === this.currentFocus);
        });
    }

    showError() {
        this.dropdown.innerHTML = `
            <div class="autocomplete-item error">
                ❌ Ошибка поиска
            </div>
        `;
        this.open();
    }

    open() {
        this.dropdown.style.display = 'block';
        this.isOpen = true;
        this.container.classList.add('open');
    }

    close() {
        this.dropdown.style.display = 'none';
        this.isOpen = false;
        this.currentFocus = -1;
        this.container.classList.remove('open');
    }

    destroy() {
        clearTimeout(this.searchTimeout);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.insertBefore(this.input, this.container);
            this.container.remove();
        }
    }
}

// Экспортируем класс
window.AutoComplete = AutoComplete;
