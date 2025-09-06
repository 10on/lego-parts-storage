// Вид кучи деталей
class PileView {
    constructor() {
        this.pileItems = [];
        this.selectedItems = new Set();
    }

    render(pileItems = []) {
        this.pileItems = pileItems;
        const container = document.getElementById('pile-content');
        if (!container) return;

        if (pileItems.length === 0) {
            container.innerHTML = this.renderEmptyState();
        } else {
            container.innerHTML = pileItems.map(item => this.renderPileItem(item)).join('');
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

    renderPileItem(item) {
        const lastUsed = new Date(item.lastUsed).toLocaleDateString('ru-RU');
        
        return `
            <div class="pile-item" data-item-id="${item.id}">
                <img src="${item.image}" alt="${item.name}" class="pile-item-image" onerror="this.style.display='none'">
                <div class="pile-item-info">
                    <div class="pile-item-name">${item.name}</div>
                    <div class="pile-item-part-id">Part ID: ${item.partId}</div>
                    <div class="pile-item-color">Цвет: ${item.color}</div>
                    <div class="pile-item-last-used">Использовано: ${lastUsed}</div>
                </div>
                <div class="pile-item-actions">
                    <div class="pile-item-quantity-controls">
                        <button class="quantity-btn" data-action="decrease">-</button>
                        <input type="number" class="quantity-input" value="${item.quantity || ''}" min="0">
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
            
            // Автоматическое сохранение
            if (window.app) {
                await window.app.autoSave();
                window.app.showNotification('Количество обновлено!', 'success');
            }
        }
    }

    editItem(itemId) {
        const item = this.pileItems.find(i => i.id === itemId);
        if (!item) return;

        const content = `
            <form id="edit-pile-item-form">
                <div class="form-group">
                    <label class="form-label">Part ID</label>
                    <input type="text" class="form-input" id="edit-part-id" value="${item.partId}" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input" id="edit-name" value="${item.name}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Количество</label>
                        <input type="number" class="form-input" id="edit-quantity" value="${item.quantity}" min="0">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Цвет</label>
                        <input type="text" class="form-input" id="edit-color" value="${item.color}">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">URL изображения</label>
                    <input type="url" class="form-input" id="edit-image" value="${item.image}">
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

    saveItemChanges(itemId) {
        const partId = document.getElementById('edit-part-id').value;
        const name = document.getElementById('edit-name').value;
        const quantity = parseInt(document.getElementById('edit-quantity').value);
        const color = document.getElementById('edit-color').value;
        const image = document.getElementById('edit-image').value;

        const item = this.pileItems.find(i => i.id === itemId);
        if (item) {
            item.partId = partId;
            item.name = name;
            item.quantity = quantity;
            item.color = color;
            item.image = image;
            item.lastUsed = new Date().toISOString();

            this.render(this.pileItems);
            
            if (window.app) {
                window.app.hideModal();
                window.app.showNotification('Деталь обновлена!', 'success');
            }
        }
    }

    deleteItem(itemId) {
        if (confirm('Вы уверены, что хотите удалить эту деталь из кучи?')) {
            const index = this.pileItems.findIndex(i => i.id === itemId);
            if (index > -1) {
                this.pileItems.splice(index, 1);
                this.render(this.pileItems);
                
                if (window.app) {
                    window.app.showNotification('Деталь удалена!', 'success');
                }
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
                <h4>Распределить "${item.name}"</h4>
                <p>Выберите контейнер для распределения:</p>
                <div class="containers-list">
                    ${containers.map(container => `
                        <div class="container-option" data-container-id="${container.id}">
                            <h5>${container.name}</h5>
                            <p>${container.rows}×${container.cols} ячеек</p>
                        </div>
                    `).join('')}
                </div>
                <div class="form-group">
                    <label class="form-label">Количество для распределения</label>
                    <input type="number" class="form-input" id="distribute-quantity" value="${item.quantity}" min="1" max="${item.quantity}">
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
        const content = `
            <form id="add-pile-item-form">
                <div class="form-group">
                    <label class="form-label">Part ID</label>
                    <input type="text" class="form-input" id="new-part-id" placeholder="3001" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input" id="new-name" placeholder="Brick 2x4" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Количество (опционально)</label>
                        <input type="number" class="form-input" id="new-quantity" placeholder="Оставить пустым если не важно">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Цвет</label>
                        <input type="text" class="form-input" id="new-color" placeholder="Red">
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
            
            document.getElementById('add-pile-item-form').addEventListener('submit', (e) => {
                e.preventDefault();
                this.addNewItem();
            });
        }
    }

    async addNewItem() {
        const partId = document.getElementById('new-part-id').value;
        const name = document.getElementById('new-name').value;
        const quantityValue = document.getElementById('new-quantity').value;
        const quantity = quantityValue ? parseInt(quantityValue) : null;
        const color = document.getElementById('new-color').value;
        const image = document.getElementById('new-image').value;

        const newItem = {
            id: `pile-${Date.now()}`,
            partId,
            name,
            color,
            colorId: await this.getColorId(color),
            quantity,
            image,
            lastUsed: new Date().toISOString()
        };

        this.pileItems.push(newItem);
        this.render(this.pileItems);
        
        // Автоматическое сохранение
        if (window.app) {
            await window.app.autoSave();
            window.app.hideModal();
            window.app.showNotification('Деталь добавлена в кучу!', 'success');
        }
    }

    showDistributeModal() {
        if (this.selectedItems.size === 0) {
            alert('Выберите детали для распределения');
            return;
        }

        // Логика распределения выбранных элементов
        console.log('Распределение выбранных элементов:', Array.from(this.selectedItems));
    }

    async getColorId(color) {
        // Загружаем цвет из BrickLink данных
        if (!window.brickLinkData || !window.brickLinkData.isLoaded) {
            console.warn('BrickLink data not loaded, using fallback color ID');
            return '1'; // Fallback к белому цвету
        }
        
        try {
            const colorData = await window.brickLinkData.getColorByName(color);
            return colorData ? colorData.id.toString() : '1';
        } catch (error) {
            console.error('Error getting color ID:', error);
            return '1'; // Fallback к белому цвету
        }
    }
}
