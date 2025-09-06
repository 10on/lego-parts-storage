// Вид контейнера - сетка с ячейками
class ContainerView {
    constructor() {
        this.container = null;
        this.isEditing = false;
        this.selectedCells = new Set();
    }

    setContainer(container) {
        console.log('Setting container:', container);
        this.container = container;
        this.render();
    }

    render() {
        console.log('Rendering container view:', this.container);
        if (!this.container) {
            console.error('No container to render!');
            return;
        }

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

        // Добавляем обработчики событий прямо при создании ячейки
        cell.addEventListener('click', (e) => {
            console.log('Cell click event triggered!', index);
            this.handleCellClick(e, cell);
        });

        cell.addEventListener('dblclick', (e) => {
            console.log('Cell double-click event triggered!', index);
            this.handleCellDoubleClick(e, cell);
        });

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
        // Обработчики ячеек теперь добавляются в createCell()
        // Здесь только кнопки управления
        
        const editModeBtn = document.getElementById('edit-mode-btn');
        if (editModeBtn) {
            // Удаляем старые обработчики
            editModeBtn.replaceWith(editModeBtn.cloneNode(true));
            const newEditModeBtn = document.getElementById('edit-mode-btn');
            newEditModeBtn.addEventListener('click', () => {
                this.toggleEditMode();
            });
        }

        const saveBtn = document.getElementById('save-container-btn');
        if (saveBtn) {
            // Удаляем старые обработчики
            saveBtn.replaceWith(saveBtn.cloneNode(true));
            const newSaveBtn = document.getElementById('save-container-btn');
            newSaveBtn.addEventListener('click', () => {
                this.saveContainer();
            });
        }

        // Кнопка "Назад"
        const backBtn = document.getElementById('back-to-home');
        if (backBtn) {
            backBtn.replaceWith(backBtn.cloneNode(true));
            const newBackBtn = document.getElementById('back-to-home');
            newBackBtn.addEventListener('click', () => {
                if (window.app) {
                    window.app.showView('home');
                }
            });
        }
    }

    handleCellClick(e, cell) {
        console.log('Cell clicked!', cell, this.isEditing);
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
        console.log('Opening cell editor for cell:', cell);
        // Закрываем предыдущий редактор
        this.closeCellEditor();

        const cellIndex = parseInt(cell.dataset.cellIndex);
        const cellData = this.container.cells[cellIndex];
        
        console.log('Cell index:', cellIndex, 'Cell data:', cellData);

        // Создаем модальное окно
        const modal = document.createElement('div');
        modal.className = 'cell-editor-modal';
        modal.id = 'cell-editor-modal';

        const editor = document.createElement('div');
        editor.className = 'cell-editor';
        
        try {
            editor.innerHTML = this.renderCellEditor(cellData, cellIndex);
            console.log('Editor HTML created successfully');
        } catch (error) {
            console.error('Error creating editor HTML:', error);
            return;
        }
        
        modal.appendChild(editor);
        document.body.appendChild(modal);
        cell.classList.add('editing');
        
        console.log('Modal editor created and added to body');

        // Обработчики редактора
        this.setupCellEditorListeners(editor, cell, cellIndex);
        
        // Закрытие по клику на фон
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeCellEditor();
            }
        });
        
        // Закрытие по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCellEditor();
            }
        }, { once: true });
        
        console.log('Cell editor modal should be visible now!');
    }

    renderCellEditor(cellData, cellIndex) {
        return `
            <div class="cell-editor-header">
                <div class="header-left">
                    <h4>${cellData ? '✏️ Редактировать ячейку' : '➕ Добавить деталь'}</h4>
                    <span class="cell-position">Ячейка ${cellIndex + 1}</span>
                </div>
                <button type="button" class="close-btn" id="modal-close">✕</button>
            </div>
            <form class="cell-editor-form">
                <div class="form-row">
                    <div class="form-group">
                        <label class="form-label">Деталь *</label>
                        <input type="text" class="form-input autocomplete-input" id="cell-part-id" value="${cellData?.partId || ''}" placeholder="Начните вводить номер или название детали..." required>
                        <small class="form-help">Выберите деталь из каталога BrickLink</small>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Количество</label>
                        <input type="number" class="form-input" id="cell-quantity" value="${cellData?.quantity || 1}" min="1" max="999">
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Название детали</label>
                    <input type="text" class="form-input" id="cell-name" value="${cellData?.name || ''}" placeholder="Заполнится автоматически при выборе детали" readonly>
                    <small class="form-help">Заполняется автоматически при выборе детали</small>
                </div>
                <div class="form-group">
                    <label class="form-label">Цвет *</label>
                    <input type="text" class="form-input autocomplete-input" id="cell-color" value="${cellData?.color || ''}" placeholder="Начните вводить цвет..." required>
                    <small class="form-help">Выберите цвет из каталога BrickLink</small>
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
        const closeBtn = editor.querySelector('#modal-close');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCellData(cell, cellIndex, editor);
        });

        cancelBtn.addEventListener('click', () => {
            this.clearValidationErrors();
            this.closeCellEditor();
        });

        closeBtn.addEventListener('click', () => {
            this.closeCellEditor();
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearCellData(cell, cellIndex);
            });
        }

        // Инициализация автокомплита для деталей
        this.setupPartAutocomplete(editor);
        
        // Инициализация автокомплита для цветов
        this.setupColorAutocomplete(editor);
    }

    setupPartAutocomplete(editor) {
        const partInput = editor.querySelector('#cell-part-id');
        const nameInput = editor.querySelector('#cell-name');

        if (!partInput || !window.brickLinkData || !window.brickLinkData.isLoaded) {
            console.warn('BrickLink data not loaded, using simple input');
            return;
        }

        const partAutocomplete = new AutoComplete(partInput, {
            minChars: 2,
            delay: 200,
            placeholder: 'Введите номер или название детали...',
            noResultsText: 'Деталь не найдена',
            showCategories: true,
            source: async (query) => {
                return window.brickLinkData.searchParts(query);
            },
            onSelect: (value, item) => {
                // Извлекаем Part ID из значения "partId - название"
                const partData = window.brickLinkData.getPartById(value);
                if (partData) {
                    partInput.value = partData.partId;
                    nameInput.value = partData.name;
                } else {
                    // Если не найдено, пробуем извлечь из item
                    const partId = item.dataset.value;
                    const partInfo = window.brickLinkData.getPartById(partId);
                    if (partInfo) {
                        partInput.value = partInfo.partId;
                        nameInput.value = partInfo.name;
                    }
                }
            }
        });

        // Сохраняем ссылку для последующего удаления
        this.partAutocomplete = partAutocomplete;
    }

    setupColorAutocomplete(editor) {
        const colorInput = editor.querySelector('#cell-color');

        if (!colorInput || !window.brickLinkData || !window.brickLinkData.isLoaded) {
            console.warn('BrickLink data not loaded, using simple input');
            return;
        }

        const colorAutocomplete = new AutoComplete(colorInput, {
            minChars: 0, // Показываем популярные цвета сразу
            delay: 100,
            placeholder: 'Выберите или введите цвет...',
            noResultsText: 'Цвет не найден',
            source: async (query) => {
                return window.brickLinkData.searchColors(query);
            },
            onSelect: (value, item) => {
                colorInput.value = value;
            }
        });

        // Сохраняем ссылку для последующего удаления
        this.colorAutocomplete = colorAutocomplete;
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
        // Очищаем автокомплиты
        if (this.partAutocomplete) {
            this.partAutocomplete.destroy();
            this.partAutocomplete = null;
        }
        
        if (this.colorAutocomplete) {
            this.colorAutocomplete.destroy();
            this.colorAutocomplete = null;
        }

        const modal = document.getElementById('cell-editor-modal');
        if (modal) {
            modal.remove();
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
