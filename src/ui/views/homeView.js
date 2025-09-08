// Главный вид - список контейнеров
class HomeView {
    constructor() {
        this.containers = [];
    }

    render(containers = []) {
        console.log('🎨 Рендеринг контейнеров:', containers.length, 'контейнеров');
        this.containers = containers;
        const container = document.getElementById('containers-grid');
        if (!container) {
            console.error('❌ Элемент containers-grid не найден');
            return;
        }

        if (containers.length === 0) {
            container.innerHTML = this.renderEmptyState();
        } else {
            container.innerHTML = containers.map(container => this.renderContainerCard(container)).join('');
        }

        console.log('🔧 Настройка обработчиков событий...');
        this.setupEventListeners();
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-content">
                    <h3>Пока нет контейнеров</h3>
                    <p>Создайте свой первый контейнер для хранения LEGO деталей</p>
                    <button class="btn btn-primary" id="create-first-container">Создать контейнер</button>
                </div>
            </div>
        `;
    }

    renderContainerCard(container) {
        const stats = this.calculateContainerStats(container);
        const typeIcon = this.getTypeIcon(container.type);
        const lastUpdated = new Date(container.updatedAt).toLocaleDateString('ru-RU');
        const containerColor = container.color || '#e0e0e0';

        return `
            <div class="container-card" data-container-id="${container.id}">
                <div class="container-card-header">
                    <h3>${typeIcon} ${container.name}</h3>
                    <div class="container-actions">
                        <button class="btn btn-sm btn-outline" data-action="clone" title="Клонировать">
                            📋
                        </button>
                        <button class="btn btn-sm btn-outline" data-action="edit" title="Редактировать">
                            ✏️
                        </button>
                        <button class="btn btn-sm btn-outline" data-action="delete" title="Удалить">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="container-visualization">
                    ${this.renderContainerGrid(container, containerColor)}
                </div>
                <p class="container-description">${this.getTypeDescription(container.type)}</p>
                <div class="container-stats">
                    <div class="stat">
                        <span class="stat-label">Размер:</span>
                        <span class="stat-value">${container.rows}×${container.cols}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Заполнено:</span>
                        <span class="stat-value">${stats.filledCells}/${stats.totalCells}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Обновлено:</span>
                        <span class="stat-value">${lastUpdated}</span>
                    </div>
                </div>
                <div class="container-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${stats.fillPercentage}%"></div>
                    </div>
                    <span class="progress-text">${Math.round(stats.fillPercentage)}%</span>
                </div>
            </div>
        `;
    }

    calculateContainerStats(container) {
        const totalCells = container.rows * container.cols;
        const filledCells = container.cells.filter(cell => cell !== null).length;
        const fillPercentage = totalCells > 0 ? (filledCells / totalCells) * 100 : 0;

        return {
            totalCells,
            filledCells,
            fillPercentage
        };
    }

    getTypeIcon(type) {
        const icons = {
            'cabinet': '📦',
            'box': '📁',
            'pile': '📚'
        };
        return icons[type] || '📦';
    }

    renderContainerGrid(container, color) {
        const { rows, cols, cells, type } = container;
        const borderColor = this.darkenColor(color, 20);
        
        // Для куч показываем заглушку вместо сетки
        if (type === 'pile') {
            return `
                <div class="container-pile-preview" 
                     style="background-color: ${color};
                            border: 2px solid ${borderColor};">
                    <div class="pile-icon">📚</div>
                    <div class="pile-text">Куча деталей</div>
                    <div class="pile-count">${cells ? cells.filter(c => c !== null).length : 0} деталей</div>
                </div>
            `;
        }
        
        // Отображаем полную сетку для cabinet и box
        let gridHtml = `
            <div class="container-grid-preview" 
                 style="grid-template-columns: repeat(${cols}, 1fr); 
                        grid-template-rows: repeat(${rows}, 1fr);
                        background-color: ${color};
                        border: 2px solid ${borderColor};">
        `;
        
        // Создаем все ячейки
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cellIndex = row * cols + col;
                const cell = cells[cellIndex];
                const isFilled = cell !== null;
                
                gridHtml += `
                    <div class="preview-cell ${isFilled ? 'filled' : 'empty'}" 
                         style="background-color: ${isFilled ? '#f5f5f5' : '#f5f5f5'};
                                border: 1px solid ${this.darkenColor(color, 10)};">
                        ${isFilled ? '●' : ''}
                    </div>
                `;
            }
        }
        
        gridHtml += '</div>';
        
        return gridHtml;
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    getTypeDescription(type) {
        const descriptions = {
            'cabinet': 'Кассетница для систематического хранения деталей',
            'box': 'Коробка для временного хранения или транспортировки',
            'pile': 'Куча для быстрого доступа к часто используемым деталям'
        };
        return descriptions[type] || 'Контейнер для хранения деталей';
    }

    setupEventListeners() {
        console.log('🎯 Настройка обработчиков событий...');
        
        // Клик по карточке контейнера
        const containerCards = document.querySelectorAll('.container-card');
        console.log('📋 Найдено карточек контейнеров:', containerCards.length);
        
        containerCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Игнорируем клики по кнопкам действий
                if (e.target.closest('.container-actions')) {
                    return;
                }
                
                const containerId = card.dataset.containerId;
                this.openContainer(containerId);
            });
        });

        // Кнопки действий
        const cloneButtons = document.querySelectorAll('[data-action="clone"]');
        console.log('🔄 Найдено кнопок клонирования:', cloneButtons.length);
        
        cloneButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const containerId = btn.closest('.container-card').dataset.containerId;
                console.log('🔄 Кнопка клонирования нажата для контейнера:', containerId);
                this.showCloneModal(containerId);
            });
        });

        document.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const containerId = btn.closest('.container-card').dataset.containerId;
                this.editContainer(containerId);
            });
        });

        document.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const containerId = btn.closest('.container-card').dataset.containerId;
                this.deleteContainer(containerId);
            });
        });

        // Кнопка создания первого контейнера
        const createFirstBtn = document.getElementById('create-first-container');
        if (createFirstBtn) {
            createFirstBtn.addEventListener('click', () => {
                if (window.app) {
                    window.app.showAddContainerModal();
                }
            });
        }
    }

    openContainer(containerId) {
        const container = this.containers.find(c => c.id === containerId);
        if (container) {
            // Переключаемся на вид контейнера
            if (window.app) {
                window.app.containerView.setContainer(container);
                // Передаем ID контейнера в URL
                window.location.hash = `container/${containerId}`;
            }
        }
    }

    editContainer(containerId) {
        const container = this.containers.find(c => c.id === containerId);
        if (container) {
            // Показываем модальное окно редактирования
            const content = `
                <form id="edit-container-form">
                    <div class="form-group">
                        <label class="form-label">Название контейнера</label>
                        <input type="text" class="form-input" id="edit-container-name" value="${container.name}" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Тип</label>
                        <select class="form-select" id="edit-container-type">
                            <option value="cabinet" ${container.type === 'cabinet' ? 'selected' : ''}>Кассетница</option>
                            <option value="box" ${container.type === 'box' ? 'selected' : ''}>Коробка</option>
                            <option value="pile" ${container.type === 'pile' ? 'selected' : ''}>Куча</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary">Сохранить изменения</button>
                    </div>
                </form>
            `;
            
            if (window.app) {
                window.app.showModal('Редактировать контейнер', content);
                
                // Обработчик формы
                document.getElementById('edit-container-form').addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.saveContainerChanges(containerId);
                });
            }
        }
    }

    saveContainerChanges(containerId) {
        const name = document.getElementById('edit-container-name').value;
        const type = document.getElementById('edit-container-type').value;
        
        const container = this.containers.find(c => c.id === containerId);
        if (container) {
            container.name = name;
            container.type = type;
            container.updatedAt = new Date().toISOString();
            
            // Обновляем отображение
            this.render(this.containers);
            
            if (window.app) {
                window.app.hideModal();
                window.app.showNotification('Контейнер обновлен!', 'success');
            }
        }
    }

    showCloneModal(containerId) {
        console.log('🔍 Поиск контейнера для клонирования:', containerId);
        console.log('📦 Доступные контейнеры:', this.containers.map(c => ({ id: c.id, name: c.name })));
        
        const container = this.containers.find(c => c.id === containerId);
        if (!container) {
            console.error('❌ Контейнер не найден:', containerId);
            return;
        }
        
        console.log('✅ Контейнер найден:', container.name);

        // Проверяем, что window.app доступен
        if (!window.app) {
            console.error('❌ window.app не доступен');
            return;
        }

        console.log('🔧 Показываем модальное окно...');
        const content = `
            <div class="clone-modal-content">
                <p>Выберите, как клонировать контейнер "<strong>${container.name}</strong>":</p>
                <div class="clone-options">
                    <label class="clone-option">
                        <input type="radio" name="clone-type" value="empty" checked>
                        <div class="option-content">
                            <div class="option-icon">📦</div>
                            <div class="option-text">
                                <strong>Пустой контейнер</strong>
                                <small>Только структура и размеры</small>
                            </div>
                        </div>
                    </label>
                    <label class="clone-option">
                        <input type="radio" name="clone-type" value="with-content">
                        <div class="option-content">
                            <div class="option-icon">📋</div>
                            <div class="option-text">
                                <strong>С содержимым</strong>
                                <small>Копировать все детали и их расположение</small>
                            </div>
                        </div>
                    </label>
                </div>
                <div class="clone-actions">
                    <button class="btn btn-primary" id="confirm-clone-btn">Клонировать</button>
                    <button class="btn btn-secondary" id="cancel-clone-btn">Отмена</button>
                </div>
            </div>
        `;

        if (window.app) {
            window.app.showModal('Клонировать контейнер', content);
            
            // Обработчики кнопок
            const confirmBtn = document.getElementById('confirm-clone-btn');
            const cancelBtn = document.getElementById('cancel-clone-btn');
            
            if (confirmBtn) {
                confirmBtn.addEventListener('click', () => {
                    console.log('✅ Кнопка "Клонировать" нажата');
                    this.cloneContainer(containerId);
                });
            } else {
                console.error('❌ Кнопка confirm-clone-btn не найдена');
            }
            
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    console.log('❌ Кнопка "Отмена" нажата');
                    window.app.hideModal();
                });
            } else {
                console.error('❌ Кнопка cancel-clone-btn не найдена');
            }
        }
    }

    async cloneContainer(containerId) {
        const cloneType = document.querySelector('input[name="clone-type"]:checked').value;
        const includeContent = cloneType === 'with-content';
        
        if (window.app) {
            // Находим оригинальный контейнер
            const originalContainer = window.app.containers.find(c => c.id === containerId);
            if (!originalContainer) {
                window.app.showNotification('Контейнер не найден', 'error');
                return;
            }

            // Создаем клонированный контейнер
            let clonedContainer;
            if (originalContainer && typeof originalContainer.clone === 'function') {
                // Если это экземпляр класса Container
                clonedContainer = originalContainer.clone(includeContent);
            } else {
                // Если это обычный объект, создаем клон вручную
                clonedContainer = this.cloneContainerData(originalContainer, includeContent);
            }
            
            if (clonedContainer) {
                // Добавляем клонированный контейнер в массив
                window.app.containers.push(clonedContainer);
                
                // Сохраняем изменения
                await window.app.saveProject();
                
                // Перерендериваем список
                this.render(window.app.containers);
                
                // Закрываем модальное окно
                window.app.hideModal();
                
                // Показываем уведомление
                const message = includeContent ? 
                    'Контейнер клонирован с содержимым!' : 
                    'Пустой контейнер создан!';
                window.app.showNotification(message, 'success');
            } else {
                window.app.showNotification('Ошибка при клонировании контейнера', 'error');
            }
        }
    }

    cloneContainerData(originalContainer, includeContent = false) {
        const clonedContainer = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            name: `${originalContainer.name} (копия)`,
            type: originalContainer.type,
            rows: originalContainer.rows,
            cols: originalContainer.cols,
            color: originalContainer.color,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (includeContent && originalContainer.cells) {
            // Глубокое копирование ячеек с содержимым
            clonedContainer.cells = originalContainer.cells.map(cell => {
                if (!cell) return null;
                
                // Копируем структуру ячейки
                const clonedCell = {
                    type: cell.type,
                    partId: cell.partId,
                    name: cell.name,
                    color: cell.color,
                    colorId: cell.colorId,
                    quantity: cell.quantity,
                    image: cell.image,
                    lastUpdated: cell.lastUpdated
                };

                // Если это объединенная ячейка, копируем дополнительные свойства
                if (cell.type === 'merged') {
                    clonedCell.cellCount = cell.cellCount;
                    clonedCell.items = cell.items ? cell.items.map(item => ({
                        ...item,
                        id: Date.now().toString(36) + Math.random().toString(36).substr(2) // Новый ID для каждого элемента
                    })) : [];
                }

                return clonedCell;
            });
        } else {
            // Создаем пустую сетку того же размера
            clonedContainer.cells = Array(originalContainer.rows * originalContainer.cols).fill(null);
        }

        return clonedContainer;
    }

    async deleteContainer(containerId) {
        if (confirm('Вы уверены, что хотите удалить этот контейнер? Это действие нельзя отменить.')) {
            const index = this.containers.findIndex(c => c.id === containerId);
            if (index > -1) {
                // Удаляем контейнер из массива
                this.containers.splice(index, 1);
                
                // Обновляем глобальный массив контейнеров в приложении
                if (window.app) {
                    window.app.containers = this.containers;
                    
                    // Сохраняем изменения в localStorage
                    await window.app.saveProject();
                    
                    window.app.showNotification('Контейнер удален!', 'success');
                }
                
                // Перерендериваем список
                this.render(this.containers);
            }
        }
    }
}
