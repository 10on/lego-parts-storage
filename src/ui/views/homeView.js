// Главный вид - список контейнеров
class HomeView {
    constructor() {
        this.containers = [];
    }

    render(containers = []) {
        this.containers = containers;
        const container = document.getElementById('containers-grid');
        if (!container) return;

        if (containers.length === 0) {
            container.innerHTML = this.renderEmptyState();
        } else {
            container.innerHTML = containers.map(container => this.renderContainerCard(container)).join('');
        }

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
        const { rows, cols, cells } = container;
        const borderColor = this.darkenColor(color, 20);
        
        // Отображаем полную сетку без ограничений
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
                         style="background-color: ${isFilled ? '#fff' : 'transparent'};
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
        // Клик по карточке контейнера
        document.querySelectorAll('.container-card').forEach(card => {
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
                window.app.showView('container');
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
