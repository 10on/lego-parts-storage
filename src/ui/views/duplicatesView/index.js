// Вид поиска дубликатов
class DuplicatesView {
    constructor() {
        this.duplicates = [];
    }

    render() {
        const container = document.getElementById('duplicates-content');
        if (!container) return;

        if (this.duplicates.length === 0) {
            container.innerHTML = this.renderEmptyState();
        } else {
            container.innerHTML = this.renderDuplicatesList();
        }

        this.setupEventListeners();
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-content">
                    <h3>Дубликаты не найдены</h3>
                    <p>Нажмите "Сканировать" для поиска дубликатов в ваших контейнерах</p>
                    <button class="btn btn-primary" id="scan-duplicates-first">Сканировать дубликаты</button>
                </div>
            </div>
        `;
    }

    renderDuplicatesList() {
        return `
            <div class="duplicates-summary">
                <h3>Найдено дубликатов: ${this.duplicates.length}</h3>
                <p>Общее количество дублирующихся деталей: ${this.calculateTotalDuplicates()}</p>
            </div>
            <div class="duplicates-list">
                ${this.duplicates.map(group => this.renderDuplicateGroup(group)).join('')}
            </div>
        `;
    }

    renderDuplicateGroup(group) {
        return `
            <div class="duplicate-group">
                <div class="duplicate-group-header">
                    <div class="duplicate-group-title">${group.partId} - ${group.name}</div>
                    <div class="duplicate-group-count">${group.items.length} экземпляров</div>
                </div>
                <div class="duplicate-items">
                    ${group.items.map(item => this.renderDuplicateItem(item)).join('')}
                </div>
            </div>
        `;
    }

    renderDuplicateItem(item) {
        return `
            <div class="duplicate-item">
                <img src="${item.image}" alt="${item.name}" class="duplicate-item-image" onerror="this.style.display='none'">
                <div class="duplicate-item-info">
                    <div class="duplicate-item-name">${item.name}</div>
                    <div class="duplicate-item-location">${item.location}</div>
                </div>
                <div class="duplicate-item-quantity">${item.quantity}</div>
                <div class="duplicate-item-actions">
                    <button class="btn btn-sm btn-outline" data-action="merge" data-item-id="${item.id}">
                        Объединить
                    </button>
                    <button class="btn btn-sm btn-outline" data-action="view" data-item-id="${item.id}">
                        Просмотр
                    </button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Кнопка сканирования
        const scanBtn = document.getElementById('scan-duplicates-btn');
        const scanFirstBtn = document.getElementById('scan-duplicates-first');
        
        [scanBtn, scanFirstBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => {
                    this.scanForDuplicates();
                });
            }
        });

        // Кнопки действий с дубликатами
        document.querySelectorAll('[data-action="merge"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                this.mergeDuplicates(itemId);
            });
        });

        document.querySelectorAll('[data-action="view"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const itemId = e.target.dataset.itemId;
                this.viewItem(itemId);
            });
        });
    }

    scanForDuplicates() {
        if (window.app) {
            window.app.showNotification('Сканирование дубликатов...', 'info');
        }

        // Имитация сканирования
        setTimeout(() => {
            this.duplicates = this.findDuplicates();
            this.render();
            
            if (window.app) {
                window.app.showNotification(`Найдено ${this.duplicates.length} групп дубликатов`, 'success');
            }
        }, 1000);
    }

    findDuplicates() {
        const containers = window.app?.containers || [];
        const pileItems = window.app?.pileItems || [];
        
        const allItems = [];
        
        // Собираем все детали из контейнеров
        containers.forEach(container => {
            container.cells.forEach((cell, index) => {
                if (cell) {
                    allItems.push({
                        ...cell,
                        location: `${container.name} (ячейка ${index + 1})`,
                        containerId: container.id,
                        cellIndex: index
                    });
                }
            });
        });
        
        // Собираем все детали из кучи
        pileItems.forEach(item => {
            allItems.push({
                ...item,
                location: 'Куча деталей',
                containerId: 'pile',
                cellIndex: -1
            });
        });
        
        // Группируем по partId и цвету
        const groups = new Map();
        
        allItems.forEach(item => {
            const key = `${item.partId}-${item.color}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    partId: item.partId,
                    name: item.name,
                    color: item.color,
                    items: []
                });
            }
            groups.get(key).items.push(item);
        });
        
        // Фильтруем только группы с дубликатами
        return Array.from(groups.values()).filter(group => group.items.length > 1);
    }

    calculateTotalDuplicates() {
        return this.duplicates.reduce((total, group) => {
            return total + group.items.reduce((sum, item) => {
                if (item.quantity === null || item.quantity === undefined) {
                    return sum; // Не учитываем детали без количества
                }
                return sum + item.quantity;
            }, 0);
        }, 0);
    }

    mergeDuplicates(itemId) {
        // Находим группу дубликатов для этого элемента
        const group = this.duplicates.find(g => 
            g.items.some(item => item.id === itemId)
        );
        
        if (!group) return;
        
        const content = `
            <div class="merge-duplicates-modal">
                <h4>Объединить дубликаты: ${group.name}</h4>
                <p>Выберите, как объединить дубликаты:</p>
                <div class="merge-options">
                    <div class="merge-option">
                        <input type="radio" id="merge-keep-first" name="merge-strategy" value="keep-first" checked>
                        <label for="merge-keep-first">Оставить в первом контейнере</label>
                    </div>
                    <div class="merge-option">
                        <input type="radio" id="merge-keep-last" name="merge-strategy" value="keep-last">
                        <label for="merge-keep-last">Оставить в последнем контейнере</label>
                    </div>
                    <div class="merge-option">
                        <input type="radio" id="merge-keep-largest" name="merge-strategy" value="keep-largest">
                        <label for="merge-keep-largest">Оставить в контейнере с наибольшим количеством</label>
                    </div>
                </div>
                <div class="form-group">
                    <button type="button" class="btn btn-primary" id="confirm-merge">Объединить</button>
                </div>
            </div>
        `;

        if (window.app) {
            window.app.showModal('Объединить дубликаты', content);
            
            document.getElementById('confirm-merge').addEventListener('click', () => {
                this.confirmMerge(group);
            });
        }
    }

    confirmMerge(group) {
        const strategy = document.querySelector('input[name="merge-strategy"]:checked').value;
        
        // Логика объединения дубликатов
        console.log('Объединение дубликатов:', group, 'стратегия:', strategy);
        
        // Обновляем данные
        this.performMerge(group, strategy);
        
        // Обновляем отображение
        this.scanForDuplicates();
        
        if (window.app) {
            window.app.hideModal();
            window.app.showNotification('Дубликаты объединены!', 'success');
        }
    }

    performMerge(group, strategy) {
        // Простая реализация объединения
        const items = group.items;
        let targetItem = items[0];
        
        switch (strategy) {
            case 'keep-last':
                targetItem = items[items.length - 1];
                break;
            case 'keep-largest':
                targetItem = items.reduce((max, item) => 
                    item.quantity > max.quantity ? item : max
                );
                break;
        }
        
        // Суммируем количества
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        targetItem.quantity = totalQuantity;
        
        // Удаляем остальные элементы
        items.forEach((item, index) => {
            if (item !== targetItem) {
                this.removeItem(item);
            }
        });
    }

    removeItem(item) {
        if (item.containerId === 'pile') {
            // Удаляем из кучи
            const index = window.app.pileItems.findIndex(i => i.id === item.id);
            if (index > -1) {
                window.app.pileItems.splice(index, 1);
            }
        } else {
            // Удаляем из контейнера
            const container = window.app.containers.find(c => c.id === item.containerId);
            if (container && item.cellIndex >= 0) {
                container.cells[item.cellIndex] = null;
            }
        }
    }

    viewItem(itemId) {
        // Находим элемент и показываем его местоположение
        const group = this.duplicates.find(g => 
            g.items.some(item => item.id === itemId)
        );
        
        if (group) {
            const item = group.items.find(i => i.id === itemId);
            if (item) {
                if (window.app) {
                    window.app.showNotification(`Деталь находится: ${item.location}`, 'info');
                }
            }
        }
    }
}
