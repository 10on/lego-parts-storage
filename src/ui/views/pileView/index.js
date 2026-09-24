// Вид кучи деталей
class PileView {
    constructor() {
        this.pileItems = [];
        this.selectedItems = new Set();
    }

    async render(pileItems = []) {
        this.pileItems = pileItems;
        const container = document.getElementById('pile-content');
        if (!container) return;

        if (pileItems.length === 0) {
            container.innerHTML = this.renderEmptyState();
        } else {
            const itemsHtml = await Promise.all(pileItems.map(item => this.renderPileItem(item)));
            container.innerHTML = itemsHtml.join('');
            
            // Обрабатываем fallback изображения
            window.imageLoader.applyFallbacks(container, '.pile-item-image[data-original-src]');
        }

        this.setupEventListeners();
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-content">
                    <h3>Куча пуста</h3>
                    <p>Добавьте детали в кучу для быстрого доступа</p>
                    <button class="btn btn-primary" id="add-first-pile-item">Добавить деталь</button>
                </div>
            </div>
        `;
    }

    async renderPileItem(item) {
        const lastUsed = new Date(item.lastUsed).toLocaleDateString('ru-RU');
        const colorName = await window.brickLinkData.resolveColorName(item.colorId);
        
        return `
            <div class="pile-item" data-item-id="${esc(item.id)}">
                <img src="${esc(item.image)}" alt="${esc(item.partId)}" class="pile-item-image" onerror="this.style.display='none'" data-original-src="${esc(item.image)}">
                <div class="pile-item-info">
                    <div class="pile-item-part-id">Part ID: ${esc(item.partId)}</div>
                    <div class="pile-item-color">Цвет: ${esc(colorName)}</div>
                    <div class="pile-item-last-used">Использовано: ${esc(lastUsed)}</div>
                </div>
                <div class="pile-item-actions">
                    <div class="pile-item-quantity-controls">
                        <button class="quantity-btn" data-action="decrease">-</button>
                        <input type="number" class="quantity-input" value="${esc(item.quantity || '')}" min="0">
                        <button class="quantity-btn" data-action="increase">+</button>
                    </div>
                    <button class="btn btn-sm btn-outline" data-action="edit" title="Редактировать">
                        ✏️
                    </button>
                    <button class="btn btn-sm btn-outline" data-action="distribute" title="Распределить">
                        📤
                    </button>
                    <button class="btn btn-sm btn-outline" data-action="delete" title="Удалить">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Клики по элементам кучи
        document.querySelectorAll('.pile-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Игнорируем клики по кнопкам действий
                if (e.target.closest('.pile-item-actions')) {
                    return;
                }
                
                this.toggleItemSelection(item);
            });
        });

        // Кнопки управления количеством
        document.querySelectorAll('[data-action="increase"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.changeQuantity(btn, 1);
            });
        });

        document.querySelectorAll('[data-action="decrease"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.changeQuantity(btn, -1);
            });
        });

        // Прямое редактирование количества
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateQuantity(e.target);
            });
        });

        // Кнопки действий
        document.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.closest('.pile-item').dataset.itemId;
                this.editItem(itemId);
            });
        });

        document.querySelectorAll('[data-action="distribute"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.closest('.pile-item').dataset.itemId;
                this.distributeItem(itemId);
            });
        });

        document.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.closest('.pile-item').dataset.itemId;
                this.deleteItem(itemId);
            });
        });

        // Кнопка добавления первого элемента
        const addFirstBtn = document.getElementById('add-first-pile-item');
        if (addFirstBtn) {
            addFirstBtn.addEventListener('click', () => {
                this.showAddItemModal();
            });
        }

        // Кнопка добавления элемента
        const addBtn = document.getElementById('add-pile-item-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.showAddItemModal();
            });
        }

        // Кнопка распределения
        const distributeBtn = document.getElementById('distribute-pile-btn');
        if (distributeBtn) {
            distributeBtn.addEventListener('click', () => {
                this.showDistributeModal();
            });
        }
    }

    toggleItemSelection(item) {
        const itemId = item.dataset.itemId;
        
        if (this.selectedItems.has(itemId)) {
            this.selectedItems.delete(itemId);
            item.classList.remove('selected');
        } else {
            this.selectedItems.add(itemId);
            item.classList.add('selected');
        }
    }

    changeQuantity(btn, delta) {
        const input = btn.parentElement.querySelector('.quantity-input');
        const currentValue = input.value ? parseInt(input.value) : 0;
        const newValue = Math.max(0, currentValue + delta);
        input.value = newValue || '';
        this.updateQuantity(input);
    }

    async updateQuantity(input) {
        const itemId = input.closest('.pile-item').dataset.itemId;
        const quantityValue = input.value;
        const newQuantity = quantityValue ? parseInt(quantityValue) : null;
        
        if (quantityValue && (isNaN(newQuantity) || newQuantity < 0)) {
            input.value = '';
            return;
        }

        const item = this.pileItems.find(i => i.id === itemId);
        if (item) {
            item.quantity = newQuantity;
            item.lastUsed = new Date().toISOString();
            
            // Обновляем данные в основном приложении
            if (window.app) {
                const appItem = window.app.pileItems.find(i => i.id === itemId);
                if (appItem) {
                    appItem.quantity = newQuantity;
                    appItem.lastUsed = item.lastUsed;
                }
                
                // Автоматическое сохранение
                await window.app.autoSave();
                window.app.showNotification('Количество обновлено!', 'success');
            }
        }
    }

    async editItem(itemId) {
        const item = this.pileItems.find(i => i.id === itemId);
        if (!item) return;

        const content = `
            <form id="edit-pile-item-form">
                <div class="form-group">
                    <label class="form-label">Part ID</label>
                    <input type="text" class="form-input" id="edit-part-id" value="${esc(item.partId)}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Количество</label>
                        <input type="number" class="form-input" id="edit-quantity" value="${esc(item.quantity)}" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Цвет</label>
                        <input type="text" class="form-input" id="edit-color" value="${esc(await window.brickLinkData.resolveColorName(item.colorId))}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">URL изображения</label>
                    <input type="url" class="form-input" id="edit-image" value="${esc(item.image)}">
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Сохранить изменения</button>
                </div>
            </form>
        `;

        if (window.app) {
            window.app.showModal('Редактировать деталь', content);
            
            document.getElementById('edit-pile-item-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveItemChanges(itemId);
            });
        }
    }

    async saveItemChanges(itemId) {
        const partId = document.getElementById('edit-part-id').value;
        const quantity = parseInt(document.getElementById('edit-quantity').value);
        const color = document.getElementById('edit-color').value;
        const image = document.getElementById('edit-image').value;

        const item = this.pileItems.find(i => i.id === itemId);
        if (item) {
            item.partId = partId;
            item.quantity = quantity;
            item.colorId = await window.brickLinkData.resolveColorId(color, '1');
            item.image = image;
            item.lastUsed = new Date().toISOString();

            // Обновляем данные в основном приложении
            if (window.app) {
                const appItem = window.app.pileItems.find(i => i.id === itemId);
                if (appItem) {
                    Object.assign(appItem, item);
                }
                
                // Автоматическое сохранение
                await window.app.autoSave();
                window.app.hideModal();
                window.app.showNotification('Деталь обновлена!', 'success');
            }

            this.render(this.pileItems);
        }
    }

    async deleteItem(itemId) {
        if (confirm('Вы уверены, что хотите удалить эту деталь из кучи?')) {
            const index = this.pileItems.findIndex(i => i.id === itemId);
            if (index > -1) {
                this.pileItems.splice(index, 1);
                
                // Обновляем данные в основном приложении
                if (window.app) {
                    const appIndex = window.app.pileItems.findIndex(i => i.id === itemId);
                    if (appIndex > -1) {
                        window.app.pileItems.splice(appIndex, 1);
                    }
                    
                    // Автоматическое сохранение
                    await window.app.autoSave();
                    window.app.showNotification('Деталь удалена!', 'success');
                }
                
                this.render(this.pileItems);
            }
        }
    }

    distributeItem(itemId) {
        const item = this.pileItems.find(i => i.id === itemId);
        if (!item) return;

        // Показываем модальное окно выбора контейнера
        const containers = window.app?.containers || [];
        if (containers.length === 0) {
            alert('Нет доступных контейнеров для распределения');
            return;
        }

        const content = `
            <div class="distribute-modal">
                <h4>Распределить "${esc(item.name)}"</h4>
                <p>Выберите контейнер для распределения:</p>
                <div class="containers-list">
                    ${containers.map(container => `
                        <div class="container-option" data-container-id="${esc(container.id)}">
                            <h5>${esc(container.name)}</h5>
                            <p>${container.rows}×${container.cols} ячеек</p>
                        </div>
                    `).join('')}
                </div>
                <div class="form-group">
                    <label class="form-label">Количество для распределения</label>
                    <input type="number" class="form-input" id="distribute-quantity" value="${esc(item.quantity)}" min="1" max="${esc(item.quantity)}">
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-primary" id="confirm-distribute">Распределить</button>
                </div>
            </div>
        `;

        if (window.app) {
            window.app.showModal('Распределить деталь', content);
            
            // Обработчики выбора контейнера
            document.querySelectorAll('.container-option').forEach(option => {
                option.addEventListener('click', () => {
                    document.querySelectorAll('.container-option').forEach(o => o.classList.remove('selected'));
                    option.classList.add('selected');
                });
            });

            document.getElementById('confirm-distribute').addEventListener('click', () => {
                this.confirmDistribute(itemId);
            });
        }
    }

    confirmDistribute(itemId) {
        const selectedContainer = document.querySelector('.container-option.selected');
        const quantity = parseInt(document.getElementById('distribute-quantity').value);
        
        if (!selectedContainer) {
            alert('Выберите контейнер для распределения');
            return;
        }

        const containerId = selectedContainer.dataset.containerId;
        const item = this.pileItems.find(i => i.id === itemId);
        
        if (item && quantity > 0 && quantity <= item.quantity) {
            // Уменьшаем количество в куче
            item.quantity -= quantity;
            if (item.quantity <= 0) {
                this.deleteItem(itemId);
            } else {
                this.render(this.pileItems);
            }
            
            if (window.app) {
                window.app.hideModal();
                window.app.showNotification(`Распределено ${quantity} деталей!`, 'success');
            }
        }
    }

    showAddItemModal() {
        console.log('showAddItemModal called');
        const content = `
            <form id="add-pile-item-form">
                <div class="form-group">
                    <label class="form-label">Part ID</label>
                    <input type="text" class="form-input" id="new-part-id" placeholder="3001" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Количество (опционально)</label>
                        <input type="number" class="form-input" id="new-quantity" placeholder="Оставить пустым если не важно">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Цвет</label>
                        <input type="text" class="form-input" id="new-color" placeholder="Выберите цвет..." disabled>
                        <div class="color-restriction-info" id="color-restriction-info" style="display: none;">
                            <small>Доступные цвета для выбранной детали</small>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">URL изображения</label>
                    <input type="url" class="form-input" id="new-image" placeholder="https://...">
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Добавить в кучу</button>
                </div>
            </form>
        `;

        if (window.app) {
            window.app.showModal('Добавить деталь в кучу', content);
            
            // Небольшая задержка для создания DOM элементов
            setTimeout(() => {
                console.log('Initializing modal components');
                // Инициализируем автодополнение для Part ID
                this.initializePartIdAutocomplete();
                
                // Инициализируем автодополнение для цветов (изначально отключено)
                this.initializeColorAutocomplete();
                
                // Обработчик изменения Part ID
                const partIdInput = document.getElementById('new-part-id');
                if (partIdInput) {
                    partIdInput.addEventListener('input', (e) => {
                        this.handlePartIdChange(e.target.value);
                    });
                }

                // Обработчик изменения цвета для валидации
                const colorInput = document.getElementById('new-color');
                if (colorInput) {
                    colorInput.addEventListener('input', (e) => {
                        this.validateSelectedColor(e.target.value);
                    });
                }
                
                // Обработчик отправки формы
                const form = document.getElementById('add-pile-item-form');
                if (form) {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        this.addNewItem();
                    });
                }
            }, 100);
        }
    }

    async addNewItem() {
        const partId = document.getElementById('new-part-id').value;
        const quantityValue = document.getElementById('new-quantity').value;
        const quantity = quantityValue ? parseInt(quantityValue) : null;
        const color = document.getElementById('new-color').value;
        const image = document.getElementById('new-image').value;

        // Валидация цвета
        if (this.availableColors && this.availableColors.length > 0) {
            const isValidColor = this.availableColors.some(availableColor => 
                availableColor.name.toLowerCase() === color.toLowerCase()
            );

            if (!isValidColor) {
                window.app.showNotification('Выбранный цвет недоступен для этой детали!', 'error');
                return;
            }
        }

        const newItem = {
            id: `pile-${Date.now()}`,
            partId,
            colorId: await window.brickLinkData.resolveColorId(color, '1'),
            quantity,
            image,
            lastUsed: new Date().toISOString()
        };

        this.pileItems.push(newItem);
        
        // Добавляем в основное приложение
        if (window.app) {
            window.app.pileItems.push(newItem);
            
            // Автоматическое сохранение
            await window.app.autoSave();
            window.app.hideModal();
            window.app.showNotification('Деталь добавлена в кучу!', 'success');
        }
        
        this.render(this.pileItems);
    }

    showDistributeModal() {
        if (this.selectedItems.size === 0) {
            alert('Выберите детали для распределения');
            return;
        }

        // Логика распределения выбранных элементов
        console.log('Распределение выбранных элементов:', Array.from(this.selectedItems));
    }

    /**
     * Инициализирует автодополнение для Part ID
     */
    initializePartIdAutocomplete() {
        const partIdInput = document.getElementById('new-part-id');
        if (!partIdInput) {
            console.warn('Part ID input not found');
            return;
        }
        
        if (!window.AutoComplete) {
            console.warn('AutoComplete not available');
            return;
        }

        console.log('Initializing Part ID autocomplete');
        
        new AutoComplete(partIdInput, {
            minChars: 1,
            delay: 300,
            maxResults: 20,
            placeholder: '3001',
            source: async (query) => {
                console.log('Searching parts for:', query);
                if (!window.brickLinkData || !window.brickLinkData.isLoaded) {
                    console.warn('BrickLink data not loaded');
                    return [];
                }
                
                try {
                    // searchParts уже возвращает элементы в формате автокомплита
                    return await window.brickLinkData.searchParts(query);
                } catch (error) {
                    console.error('Error searching parts:', error);
                    return [];
                }
            },
            onSelect: (value) => {
                console.log('Part selected:', value);
                // При выборе детали обновляем доступные цвета
                this.handlePartIdChange(value);
            }
        });
    }

    /**
     * Инициализирует автодополнение для цветов
     */
    initializeColorAutocomplete() {
        const colorInput = document.getElementById('new-color');
        if (!colorInput) {
            console.warn('Color input not found');
            return;
        }
        
        if (!window.AutoComplete) {
            console.warn('AutoComplete not available');
            return;
        }

        console.log('Initializing color autocomplete');

        this.colorAutocomplete = new AutoComplete(colorInput, {
            minChars: 0,
            delay: 200,
            maxResults: 50,
            placeholder: 'Выберите цвет...',
            source: async (query) => {
                console.log('Searching colors for:', query);
                if (!this.availableColors || this.availableColors.length === 0) {
                    console.log('No available colors');
                    return [];
                }
                
                const filteredColors = this.availableColors.filter(color => 
                    color.name.toLowerCase().includes(query.toLowerCase())
                );
                
                console.log('Filtered colors:', filteredColors.length);
                return filteredColors.map(color => ({
                    value: color.name,
                    label: color.name,
                    rgb: color.rgb,
                    category: 'Цвета'
                }));
            },
            onSelect: (value) => {
                console.log('Color selected:', value);
                this.validateSelectedColor(value);
            }
        });
    }

    /**
     * Валидирует выбранный цвет
     */
    validateSelectedColor(selectedColorName) {
        if (!this.availableColors || this.availableColors.length === 0) {
            return;
        }

        const isValidColor = this.availableColors.some(color => 
            color.name.toLowerCase() === selectedColorName.toLowerCase()
        );

        const colorInput = document.getElementById('new-color');
        const colorInfo = document.getElementById('color-restriction-info');

        if (isValidColor) {
            // Цвет валиден
            colorInput.style.borderColor = '';
            colorInput.style.backgroundColor = '';
            if (colorInfo) {
                colorInfo.innerHTML = `<small>✅ Цвет "${esc(selectedColorName)}" доступен для этой детали</small>`;
                colorInfo.className = 'color-restriction-info success';
            }
        } else {
            // Цвет не валиден
            colorInput.style.borderColor = 'var(--danger-color)';
            colorInput.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
            if (colorInfo) {
                colorInfo.innerHTML = `<small>❌ Цвет "${esc(selectedColorName)}" недоступен для этой детали</small>`;
                colorInfo.className = 'color-restriction-info error';
            }
        }
    }

    /**
     * Обрабатывает изменение Part ID
     */
    async handlePartIdChange(partId) {
        console.log('handlePartIdChange called with:', partId);
        
        const colorInput = document.getElementById('new-color');
        const colorInfo = document.getElementById('color-restriction-info');
        
        if (!colorInput) {
            console.warn('Color input not found');
            return;
        }
        
        if (!colorInfo) {
            console.warn('Color info element not found');
            return;
        }
        
        if (!partId || partId.trim() === '') {
            console.log('Empty part ID, disabling color selection');
            // Если Part ID пустой, отключаем выбор цвета
            colorInput.disabled = true;
            colorInput.placeholder = 'Сначала выберите деталь';
            colorInput.value = '';
            colorInfo.style.display = 'none';
            this.availableColors = [];
            return;
        }

        try {
            console.log('Loading colors for part:', partId);
            // Показываем индикатор загрузки
            colorInput.disabled = true;
            colorInput.placeholder = 'Загрузка доступных цветов...';
            colorInfo.style.display = 'block';
            colorInfo.innerHTML = '<small>⏳ Загрузка доступных цветов...</small>';

            // Получаем доступные цвета для детали
            if (window.brickLinkData && window.brickLinkData.isLoaded) {
                console.log('BrickLink data is loaded, fetching colors...');
                this.availableColors = await window.brickLinkData.getAvailableColorsForPart(partId);
                console.log('Available colors:', this.availableColors);
                
                if (this.availableColors.length > 0) {
                    console.log('Found colors, enabling selection');
                    // Включаем выбор цвета
                    colorInput.disabled = false;
                    colorInput.placeholder = `Выберите из ${this.availableColors.length} доступных цветов`;
                    colorInfo.innerHTML = `<small>✅ Найдено ${this.availableColors.length} доступных цветов</small>`;
                    
                    // Обновляем автодополнение
                    if (this.colorAutocomplete) {
                        this.colorAutocomplete.destroy();
                    }
                    this.initializeColorAutocomplete();
                } else {
                    console.log('No colors found for this part');
                    // Нет доступных цветов
                    colorInput.disabled = true;
                    colorInput.placeholder = 'Нет доступных цветов для этой детали';
                    colorInput.value = '';
                    colorInfo.innerHTML = '<small>❌ Нет доступных цветов для этой детали</small>';
                }
            } else {
                console.log('BrickLink data not loaded');
                // BrickLink данные не загружены
                colorInput.disabled = false;
                colorInput.placeholder = 'BrickLink данные не загружены - введите цвет вручную';
                colorInfo.innerHTML = '<small>⚠️ BrickLink данные не загружены</small>';
            }
        } catch (error) {
            console.error('Error loading available colors:', error);
            colorInput.disabled = false;
            colorInput.placeholder = 'Ошибка загрузки - введите цвет вручную';
            colorInfo.innerHTML = '<small>❌ Ошибка загрузки цветов</small>';
        }
    }
}
