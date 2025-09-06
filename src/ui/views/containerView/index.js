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
        if (!grid) return;

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
            <h4>${cellData ? 'Редактировать ячейку' : 'Добавить деталь'}</h4>
            <form class="cell-editor-form">
                <div class="form-group">
                    <label class="form-label">Part ID</label>
                    <input type="text" class="form-input" id="cell-part-id" value="${cellData?.partId || ''}" placeholder="3001">
                </div>
                <div class="form-group">
                    <label class="form-label">Название</label>
                    <input type="text" class="form-input" id="cell-name" value="${cellData?.name || ''}" placeholder="Brick 2x4">
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Количество</label>
                        <input type="number" class="form-input" id="cell-quantity" value="${cellData?.quantity || 1}" min="1">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Цвет</label>
                        <input type="text" class="form-input" id="cell-color" value="${cellData?.color || ''}" placeholder="Red">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">URL изображения</label>
                    <input type="url" class="form-input" id="cell-image" value="${cellData?.image || ''}" placeholder="https://...">
                </div>
                <div class="form-row">
                    <button type="submit" class="btn btn-primary">Сохранить</button>
                    <button type="button" class="btn btn-secondary" id="cell-cancel">Отмена</button>
                    ${cellData ? '<button type="button" class="btn btn-danger" id="cell-clear">Очистить</button>' : ''}
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

    saveCellData(cell, cellIndex, editor) {
        const partId = editor.querySelector('#cell-part-id').value;
        const name = editor.querySelector('#cell-name').value;
        const quantity = parseInt(editor.querySelector('#cell-quantity').value);
        const color = editor.querySelector('#cell-color').value;
        const image = editor.querySelector('#cell-image').value;

        if (!partId || !name) {
            alert('Пожалуйста, заполните Part ID и название');
            return;
        }

        const cellData = {
            id: `cell-${cellIndex}`,
            partId,
            name,
            quantity,
            color,
            colorId: this.getColorId(color),
            image,
            lastUpdated: new Date().toISOString()
        };

        this.container.cells[cellIndex] = cellData;
        this.container.updatedAt = new Date().toISOString();

        // Обновляем отображение ячейки
        cell.innerHTML = this.renderCellContent(cellData);
        cell.classList.remove('empty');
        cell.classList.add('filled');

        this.closeCellEditor();
        
        if (window.app) {
            window.app.showNotification('Ячейка сохранена!', 'success');
        }
    }

    clearCellData(cell, cellIndex) {
        this.container.cells[cellIndex] = null;
        this.container.updatedAt = new Date().toISOString();

        cell.innerHTML = '';
        cell.classList.remove('filled');
        cell.classList.add('empty');

        this.closeCellEditor();
        
        if (window.app) {
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

    saveContainer() {
        if (window.app) {
            // Обновляем контейнер в данных приложения
            const containerIndex = window.app.containers.findIndex(c => c.id === this.container.id);
            if (containerIndex > -1) {
                window.app.containers[containerIndex] = this.container;
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
        this.renderGrid();
    }
}
