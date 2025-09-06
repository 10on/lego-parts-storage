// Вид контейнера - сетка с ячейками
class ContainerView {
    constructor() {
        this.container = null;
        this.isEditing = false;
        this.selectedCells = new Set();
    }

    setContainer(container) {
        this.container = container;
        this.render();
    }

    render() {
        if (!this.container) return;

        // Обновляем заголовок
        const title = document.getElementById('container-title');
        if (title) {
            title.textContent = this.container.name;
        }

        // Рендерим сетку
        this.renderGrid();
        this.setupEventListeners();
    }

    renderGrid() {
        const grid = document.getElementById('container-grid');
        if (!grid || !this.container) return;

        const { rows, cols, cells } = this.container;
        
        // Устанавливаем размеры сетки
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

        // Очищаем сетку
        grid.innerHTML = '';

        // Создаем ячейки
        for (let i = 0; i < rows * cols; i++) {
            const cell = this.createCell(i, cells[i]);
            grid.appendChild(cell);
        }
    }

    createCell(index, cellData) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.cellIndex = index;
        
        if (cellData) {
            cell.innerHTML = this.renderCellContent(cellData);
            cell.classList.add('filled');
        } else {
            cell.classList.add('empty');
        }

        return cell;
    }

    renderCellContent(cellData) {
        return `
            <div class="cell-content">
                ${cellData.image ? `<img src="${cellData.image}" alt="${cellData.name}" class="cell-image" onerror="this.style.display='none'">` : ''}
                <div class="cell-part-id">${cellData.partId}</div>
                <div class="cell-quantity">${cellData.quantity}</div>
                <div class="cell-color">${cellData.color}</div>
            </div>
        `;
    }

    setupEventListeners() {
        // Клики по ячейкам
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.addEventListener('click', (e) => {
                this.handleCellClick(e, cell);
            });

            cell.addEventListener('dblclick', (e) => {
                this.handleCellDoubleClick(e, cell);
            });
        });

        // Кнопки управления
        const editModeBtn = document.getElementById('edit-mode-btn');
        if (editModeBtn) {
            editModeBtn.addEventListener('click', () => {
                this.toggleEditMode();
            });
        }

        const saveBtn = document.getElementById('save-container-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveContainer();
            });
        }
    }

    handleCellClick(e, cell) {
        if (this.isEditing) {
            this.toggleCellSelection(cell);
        } else {
            this.openCellEditor(cell);
        }
    }

    handleCellDoubleClick(e, cell) {
        this.openCellEditor(cell);
    }

    toggleCellSelection(cell) {
        if (this.selectedCells.has(cell)) {
            this.selectedCells.delete(cell);
            cell.classList.remove('selected');
        } else {
            this.selectedCells.add(cell);
            cell.classList.add('selected');
        }
    }

    openCellEditor(cell) {
        // Закрываем предыдущий редактор
        this.closeCellEditor();

        const cellIndex = parseInt(cell.dataset.cellIndex);
        const cellData = this.container.cells[cellIndex];

        const editor = document.createElement('div');
        editor.className = 'cell-editor';
        editor.innerHTML = this.renderCellEditor(cellData, cellIndex);
        
        cell.appendChild(editor);
        cell.classList.add('editing');

        // Обработчики редактора
        this.setupCellEditorListeners(editor, cell, cellIndex);
    }

    renderCellEditor(cellData, cellIndex) {
        return `
            <div class="cell-editor-header">
                <h4>${cellData ? '✏️ Редактировать ячейку' : '➕ Добавить деталь'}</h4>
                <span class="cell-position">Ячейка ${cellIndex + 1}</span>
            </div>
            <form class="cell-editor-form">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Part ID *</label>
                        <input type="text" class="form-input" id="cell-part-id" value="${cellData?.partId || ''}" placeholder="3001" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Количество</label>
                        <input type="number" class="form-input" id="cell-quantity" value="${cellData?.quantity || 1}" min="1" max="999">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Название детали *</label>
                    <input type="text" class="form-input" id="cell-name" value="${cellData?.name || ''}" placeholder="Brick 2x4" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Цвет</label>
                    <div class="color-input-group">
                        <input type="text" class="form-input" id="cell-color" value="${cellData?.color || ''}" placeholder="Red" list="lego-colors">
                        <datalist id="lego-colors">
                            <option value="Red">
                            <option value="Blue">
                            <option value="Yellow">
                            <option value="Green">
                            <option value="White">
                            <option value="Black">
                            <option value="Orange">
                            <option value="Purple">
                            <option value="Pink">
                            <option value="Gray">
                        </datalist>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">URL изображения</label>
                    <input type="url" class="form-input" id="cell-image" value="${cellData?.image || ''}" placeholder="https://img.bricklink.com/...">
                    <small class="form-help">Необязательно. Автоматически подставится если оставить пустым</small>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <span>${cellData ? 'Сохранить изменения' : 'Добавить деталь'}</span>
                    </button>
                    <button type="button" class="btn btn-secondary" id="cell-cancel">Отмена</button>
                    ${cellData ? '<button type="button" class="btn btn-danger" id="cell-clear">🗑️ Очистить</button>' : ''}
                </div>
            </form>
        `;
    }

    setupCellEditorListeners(editor, cell, cellIndex) {
        const form = editor.querySelector('.cell-editor-form');
        const cancelBtn = editor.querySelector('#cell-cancel');
        const clearBtn = editor.querySelector('#cell-clear');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCellData(cell, cellIndex, editor);
        });

        cancelBtn.addEventListener('click', () => {
            this.clearValidationErrors();
            this.closeCellEditor();
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearCellData(cell, cellIndex);
            });
        }

        // Закрытие по клику вне редактора
        document.addEventListener('click', (e) => {
            if (!editor.contains(e.target) && !cell.contains(e.target)) {
                this.closeCellEditor();
            }
        }, { once: true });
    }

    async saveCellData(cell, cellIndex, editor) {
        const partId = editor.querySelector('#cell-part-id').value.trim();
        const name = editor.querySelector('#cell-name').value.trim();
        const quantity = parseInt(editor.querySelector('#cell-quantity').value) || 1;
        const color = editor.querySelector('#cell-color').value.trim();
        const image = editor.querySelector('#cell-image').value.trim();

        // Валидация
        if (!partId) {
            this.showValidationError(editor.querySelector('#cell-part-id'), 'Part ID обязателен');
            return;
        }

        if (!name) {
            this.showValidationError(editor.querySelector('#cell-name'), 'Название детали обязательно');
            return;
        }

        if (quantity < 1 || quantity > 999) {
            this.showValidationError(editor.querySelector('#cell-quantity'), 'Количество должно быть от 1 до 999');
            return;
        }

        const cellData = {
            id: `cell-${cellIndex}`,
            partId: partId.toUpperCase(),
            name,
            quantity,
            color: color || 'Unknown',
            colorId: this.getColorId(color),
            image: image || this.generateImageUrl(partId, color),
            lastUpdated: new Date().toISOString()
        };

        this.container.cells[cellIndex] = cellData;
        this.container.updatedAt = new Date().toISOString();

        // Обновляем отображение ячейки
        cell.innerHTML = this.renderCellContent(cellData);
        cell.classList.remove('empty', 'editing');
        cell.classList.add('filled');

        this.closeCellEditor();
        
        // Автоматическое сохранение
        if (window.app) {
            await window.app.autoSave();
            window.app.showNotification(`Деталь "${name}" добавлена!`, 'success');
        }
    }

    showValidationError(input, message) {
        // Удаляем предыдущие ошибки
        this.clearValidationErrors();
        
        // Добавляем стиль ошибки
        input.classList.add('error');
        
        // Показываем сообщение
        const errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);
        
        // Фокус на поле с ошибкой
        input.focus();
        input.select();
    }

    clearValidationErrors() {
        const editor = document.querySelector('.cell-editor');
        if (editor) {
            editor.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
            editor.querySelectorAll('.validation-error').forEach(el => el.remove());
        }
    }

    generateImageUrl(partId, color) {
        // Простая генерация URL для BrickLink
        const colorCode = this.getColorId(color) || '1';
        return `https://img.bricklink.com/ItemImage/PN/${colorCode}/${partId}.png`;
    }

    async clearCellData(cell, cellIndex) {
        this.container.cells[cellIndex] = null;
        this.container.updatedAt = new Date().toISOString();

        cell.innerHTML = '';
        cell.classList.remove('filled');
        cell.classList.add('empty');

        this.closeCellEditor();
        
        // Автоматическое сохранение
        if (window.app) {
            await window.app.autoSave();
            window.app.showNotification('Ячейка очищена!', 'success');
        }
    }

    closeCellEditor() {
        const editor = document.querySelector('.cell-editor');
        if (editor) {
            editor.remove();
        }
        
        document.querySelectorAll('.grid-cell.editing').forEach(cell => {
            cell.classList.remove('editing');
        });
    }

    toggleEditMode() {
        this.isEditing = !this.isEditing;
        const editBtn = document.getElementById('edit-mode-btn');
        
        if (this.isEditing) {
            editBtn.textContent = 'Выйти из редактирования';
            editBtn.classList.add('active');
            document.querySelectorAll('.grid-cell').forEach(cell => {
                cell.classList.add('editable');
            });
        } else {
            editBtn.textContent = 'Режим редактирования';
            editBtn.classList.remove('active');
            document.querySelectorAll('.grid-cell').forEach(cell => {
                cell.classList.remove('editable', 'selected');
            });
            this.selectedCells.clear();
        }
    }

    async saveContainer() {
        if (window.app) {
            // Обновляем контейнер в данных приложения
            const containerIndex = window.app.containers.findIndex(c => c.id === this.container.id);
            if (containerIndex > -1) {
                this.container.updatedAt = new Date().toISOString();
                window.app.containers[containerIndex] = this.container;
                
                // Автоматическое сохранение
                await window.app.autoSave();
            }
            
            window.app.showNotification('Контейнер сохранен!', 'success');
        }
    }

    getColorId(color) {
        const colorMap = {
            'Red': '4',
            'Blue': '1',
            'Yellow': '3',
            'Green': '2',
            'White': '1',
            'Black': '0'
        };
        return colorMap[color] || '1';
    }

    updateGridSize() {
        // Обновление размеров сетки при изменении размера окна
        if (this.container) {
            this.renderGrid();
        }
    }
}
