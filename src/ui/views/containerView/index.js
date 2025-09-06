// Вид контейнера - сетка с ячейками
class ContainerView {
    constructor() {
        this.container = null;
        this.isEditing = false;
        this.selectedCells = new Set();
        this.isMergeMode = false;
        this.mergeSelectedCells = new Set();
        this.isSplitMode = false;
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

        // Создаем ячейки, пропуская объединенные
        for (let i = 0; i < rows * cols; i++) {
            const cellData = cells[i];
            
            // Пропускаем ячейки, которые являются частью объединения (но не первой)
            if (this.isCellPartOfMerge(i, cells)) {
                continue;
            }
            
            const cell = this.createCell(i, cellData);
            grid.appendChild(cell);
        }
        
        // Обновляем курсоры после рендеринга
        this.updateSplitModeCursors();
    }

    isCellPartOfMerge(cellIndex, cells) {
        // Проверяем, является ли ячейка частью объединения (но не первой)
        for (let i = 0; i < cells.length; i++) {
            const cellData = cells[i];
            if (cellData && cellData.type === 'merged') {
                const { startIndex, cellCount } = cellData;
                const endIndex = startIndex + cellCount - 1;
                
                // Если это не первая ячейка объединения, но входит в диапазон
                if (cellIndex > startIndex && cellIndex <= endIndex) {
                    return true;
                }
            }
        }
        return false;
    }

    createCell(index, cellData) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.cellIndex = index;
        
        if (cellData) {
            cell.innerHTML = this.renderCellContent(cellData);
            
            // Добавляем класс для объединенных ячеек
            if (cellData.type === 'merged') {
                cell.classList.add('merged');
                this.applyMergedCellStyles(cell, cellData, index);
                
                // Если объединенная ячейка пустая - добавляем класс empty
                if (!cellData.items || cellData.items.length === 0) {
                    cell.classList.add('empty');
                } else {
                    cell.classList.add('filled');
                }
            } else {
                cell.classList.add('filled');
            }
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

    applyMergedCellStyles(cell, cellData, startIndex) {
        const { rows, cols } = this.container;
        const { direction, cellCount } = cellData;
        
        const startRow = Math.floor(startIndex / cols) + 1; // +1 для CSS Grid (начинается с 1)
        const startCol = (startIndex % cols) + 1;
        
        if (direction === 'horizontal') {
            // Горизонтальное объединение
            cell.style.gridColumn = `${startCol} / ${startCol + cellCount}`;
            cell.style.gridRow = `${startRow} / ${startRow + 1}`;
        } else {
            // Вертикальное объединение
            cell.style.gridColumn = `${startCol} / ${startCol + 1}`;
            cell.style.gridRow = `${startRow} / ${startRow + cellCount}`;
        }
    }

    renderCellContent(cellData) {
        if (cellData && cellData.type === 'merged') {
            // Для объединенных ячеек рендерим ТОЧНО ТАК ЖЕ как обычные
            if (!cellData.items || cellData.items.length === 0) {
                // Пустая объединенная ячейка - показываем как пустую обычную
                return '<div class="cell-content"></div>';
            }
            
            // Заполненная объединенная ячейка - показываем содержимое как в обычной
            const firstItem = cellData.items[0];
            const totalQuantity = cellData.items.reduce((sum, item) => sum + item.quantity, 0);
            
            return `
                <div class="cell-content">
                    ${firstItem.image ? `<img src="${firstItem.image}" alt="${firstItem.name}" class="cell-image" onerror="this.style.display='none'">` : ''}
                    <div class="cell-part-id">${firstItem.partId}</div>
                    <div class="cell-quantity">${totalQuantity}</div>
                    <div class="cell-color">${firstItem.color}</div>
                </div>
            `;
        }
        
        if (cellData) {
            return `
                <div class="cell-content">
                    ${cellData.image ? `<img src="${cellData.image}" alt="${cellData.name}" class="cell-image" onerror="this.style.display='none'">` : ''}
                    <div class="cell-part-id">${cellData.partId}</div>
                    <div class="cell-quantity">${cellData.quantity}</div>
                    <div class="cell-color">${cellData.color}</div>
                </div>
            `;
        }
        
        // Пустая ячейка
        return '<div class="cell-content"></div>';
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

        // Кнопка объединения ячеек
        const mergeBtn = document.getElementById('merge-cells-btn');
        if (mergeBtn) {
            mergeBtn.replaceWith(mergeBtn.cloneNode(true));
            const newMergeBtn = document.getElementById('merge-cells-btn');
            newMergeBtn.addEventListener('click', () => {
                this.toggleMergeMode();
            });
        }

        // Кнопка разбивания ячеек
        const splitBtn = document.getElementById('split-cells-btn');
        if (splitBtn) {
            splitBtn.replaceWith(splitBtn.cloneNode(true));
            const newSplitBtn = document.getElementById('split-cells-btn');
            newSplitBtn.addEventListener('click', () => {
                this.toggleSplitMode();
            });
        }

        // Кнопки управления объединением
        const confirmMergeBtn = document.getElementById('confirm-merge-btn');
        if (confirmMergeBtn) {
            confirmMergeBtn.replaceWith(confirmMergeBtn.cloneNode(true));
            const newConfirmBtn = document.getElementById('confirm-merge-btn');
            newConfirmBtn.addEventListener('click', () => {
                this.confirmMerge();
            });
        }

        const cancelMergeBtn = document.getElementById('cancel-merge-btn');
        if (cancelMergeBtn) {
            cancelMergeBtn.replaceWith(cancelMergeBtn.cloneNode(true));
            const newCancelBtn = document.getElementById('cancel-merge-btn');
            newCancelBtn.addEventListener('click', () => {
                this.cancelMerge();
            });
        }
    }

    handleCellClick(e, cell) {
        console.log('Cell clicked!', cell, this.isEditing, this.isMergeMode, this.isSplitMode);
        if (this.isSplitMode) {
            this.splitMergedCell(cell);
        } else if (this.isMergeMode) {
            this.toggleMergeCellSelection(cell);
        } else if (this.isEditing) {
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
        // Определяем, является ли ячейка объединенной
        const isMerged = cellData && cellData.type === 'merged';
        const hasItems = isMerged && cellData.items && cellData.items.length > 0;
        
        // Получаем данные для отображения
        let displayData = null;
        if (isMerged && hasItems) {
            // Для объединенной ячейки показываем данные первой детали
            displayData = cellData.items[0];
        } else if (cellData && cellData.partId) {
            // Для обычной ячейки показываем данные ячейки
            displayData = cellData;
        }
        
        const html = `
            <div class="cell-editor-header">
                <div class="header-left">
                    <h4>${isMerged ? '🔗 Объединенная ячейка' : (displayData ? '✏️ Редактировать ячейку' : '➕ Добавить деталь')}</h4>
                    <span class="cell-position">Ячейка ${cellIndex + 1}${isMerged ? ` (${cellData.cellCount} ячеек)` : ''}</span>
                </div>
                <button type="button" class="close-btn" id="modal-close">✕</button>
            </div>
            <div class="cell-editor-content">
                ${isMerged && hasItems ? `
                    <div class="merged-cell-info">
                        <h5>Содержимое объединенной ячейки:</h5>
                        <div class="merged-items-list">
                            ${cellData.items.map((item, index) => `
                                <div class="merged-item">
                                    <span class="item-part">${item.partId}</span>
                                    <span class="item-name">${item.name}</span>
                                    <span class="item-color">${item.color}</span>
                                    <span class="item-quantity">×${item.quantity}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                <form class="cell-editor-form">
                    <div class="form-group">
                        <label class="form-label">Деталь *</label>
                        <input type="text" class="form-input autocomplete-input" id="cell-part" value="${this.formatPartValue(cellData)}" placeholder="Начните вводить номер или название детали..." required>
                        <small class="form-help">Выберите деталь из каталога BrickLink</small>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Цвет *</label>
                            <input type="text" class="form-input autocomplete-input" id="cell-color" value="${displayData?.color || ''}" placeholder="Начните вводить цвет..." required>
                            <small class="form-help">Выберите цвет из каталога BrickLink</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Количество</label>
                            <input type="number" class="form-input" id="cell-quantity" value="${displayData?.quantity || 1}" min="1" max="999">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <span>${isMerged ? 'Добавить деталь' : (displayData ? 'Сохранить изменения' : 'Добавить деталь')}</span>
                        </button>
                        <button type="button" class="btn btn-secondary" id="cell-cancel">Отмена</button>
                        ${displayData ? '<button type="button" class="btn btn-danger" id="cell-clear">🗑️ Очистить</button>' : ''}
                    </div>
                </form>
                <div class="part-image-container">
                    <div class="part-image-wrapper">
                        <img id="part-image" src="" alt="Изображение детали" class="part-image" style="display: none;">
                        <div id="part-image-placeholder" class="part-image-placeholder">
                            <div class="placeholder-icon">🖼️</div>
                            <div class="placeholder-text">Выберите деталь и цвет</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        console.log('Generated HTML contains part-image-container:', html.includes('part-image-container'));
        return html;
    }

    formatPartValue(cellData) {
        if (!cellData) return '';
        
        // Если это объединенная ячейка, показываем информацию о первой детали
        if (cellData.type === 'merged' && cellData.items && cellData.items.length > 0) {
            const firstItem = cellData.items[0];
            if (firstItem.name) {
                return `${firstItem.partId} - ${firstItem.name}`;
            }
            return firstItem.partId;
        }
        
        // Если это обычная ячейка
        if (cellData.partId) {
            if (cellData.name) {
                return `${cellData.partId} - ${cellData.name}`;
            }
            return cellData.partId;
        }
        
        return '';
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

        // Инициализация обновления изображения
        const updateImage = this.setupImageUpdate(editor);
        
        // Получаем данные ячейки из контейнера
        const cellData = this.container.cells[cellIndex];
        
        // Обновляем изображение для существующих данных ячейки
        if (cellData && cellData.partId && cellData.color) {
            // Небольшая задержка чтобы DOM успел обновиться
            setTimeout(() => {
                updateImage();
            }, 100);
        }
        
        // Инициализация автокомплита для деталей
        this.setupPartAutocomplete(editor, updateImage);
        
        // Инициализация автокомплита для цветов
        this.setupColorAutocomplete(editor, updateImage);
    }

    setupPartAutocomplete(editor, updateImage) {
        const partInput = editor.querySelector('#cell-part');

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
            onSelect: async (value, item) => {
                try {
                    // value уже содержит partId, получаем полную информацию
                    const partData = await window.brickLinkData.getPartById(value);
                    if (partData) {
                        // Устанавливаем объединенное значение "ID - Название"
                        partInput.value = `${partData.partId} - ${partData.name}`;
                    } else {
                        // Если не удалось получить данные, используем только ID
                        partInput.value = value;
                    }
                } catch (error) {
                    console.warn('Failed to get part data:', error);
                    partInput.value = value;
                }
                // Обновляем изображение при выборе детали
                if (updateImage) updateImage();
            }
        });

        // Сохраняем ссылку для последующего удаления
        this.partAutocomplete = partAutocomplete;
    }

    setupColorAutocomplete(editor, updateImage) {
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
                // Обновляем изображение при выборе цвета
                updateImage();
            }
        });

        // Сохраняем ссылку для последующего удаления
        this.colorAutocomplete = colorAutocomplete;
    }

    async saveCellData(cell, cellIndex, editor) {
        const partValue = editor.querySelector('#cell-part').value.trim();
        const quantity = parseInt(editor.querySelector('#cell-quantity').value) || 1;
        const color = editor.querySelector('#cell-color').value.trim();

        // Валидация
        if (!partValue) {
            this.showValidationError(editor.querySelector('#cell-part'), 'Деталь обязательна');
            return;
        }

        if (!color) {
            this.showValidationError(editor.querySelector('#cell-color'), 'Цвет обязателен');
            return;
        }

        if (quantity < 1 || quantity > 999) {
            this.showValidationError(editor.querySelector('#cell-quantity'), 'Количество должно быть от 1 до 999');
            return;
        }

        // Извлекаем partId и name из объединенного значения
        let partId, name;
        if (partValue.includes(' - ')) {
            [partId, name] = partValue.split(' - ', 2);
        } else {
            partId = partValue;
            // Пытаемся найти название в каталоге
            try {
                const partData = await window.brickLinkData?.getPartById(partId);
                name = partData?.name || partId;
            } catch {
                name = partId;
            }
        }

        const newItem = {
            partId: partId.toUpperCase(),
            name,
            quantity,
            color: color || 'Unknown',
            colorId: this.getColorId(color),
            image: this.generateImageUrl(partId, color),
            lastUpdated: new Date().toISOString()
        };

        // Проверяем, является ли ячейка объединенной
        const existingCellData = this.container.cells[cellIndex];
        if (existingCellData && existingCellData.type === 'merged') {
            // Если это объединенная ячейка, добавляем деталь в массив items
            if (!existingCellData.items) {
                existingCellData.items = [];
            }
            existingCellData.items.push(newItem);
            existingCellData.updatedAt = new Date().toISOString();
        } else {
            // Если это обычная ячейка, заменяем данные
            const cellData = {
                id: `cell-${cellIndex}`,
                ...newItem
            };
            this.container.cells[cellIndex] = cellData;
        }

        this.container.updatedAt = new Date().toISOString();

        // Обновляем отображение ячейки
        const updatedCellData = this.container.cells[cellIndex];
        cell.innerHTML = this.renderCellContent(updatedCellData);
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
        if (!color || color.trim() === '') {
            return '0'; // Дефолтный рендер BrickLink
        }
        
        const colorMap = {
            'Red': '4',
            'Blue': '1',
            'Yellow': '3',
            'Green': '2',
            'White': '1',
            'Black': '0',
            'Light Gray': '7',
            'Dark Gray': '8',
            'Light Blue': '9',
            'Dark Blue': '10',
            'Orange': '11',
            'Purple': '12',
            'Pink': '13',
            'Brown': '14',
            'Tan': '15',
            'Lime': '16',
            'Magenta': '17',
            'Nougat': '18',
            'Light Nougat': '19',
            'Dark Nougat': '20',
            'Silver': '21',
            'Gold': '22',
            'Copper': '23',
            'Pearl': '24',
            'Transparent': '25',
            'Transparent Red': '26',
            'Transparent Blue': '27',
            'Transparent Yellow': '28',
            'Transparent Green': '29',
            'Transparent Orange': '30',
            'Transparent Purple': '31',
            'Transparent Pink': '32',
            'Transparent Brown': '33',
            'Transparent Light Blue': '34',
            'Transparent Dark Blue': '35',
            'Transparent Light Gray': '36',
            'Transparent Dark Gray': '37',
            'Transparent Black': '38',
            'Transparent White': '39',
            'Transparent Lime': '40',
            'Transparent Magenta': '41',
            'Transparent Nougat': '42',
            'Transparent Light Nougat': '43',
            'Transparent Dark Nougat': '44',
            'Transparent Silver': '45',
            'Transparent Gold': '46',
            'Transparent Copper': '47',
            'Transparent Pearl': '48'
        };
        return colorMap[color] || '0'; // Дефолтный рендер если цвет не найден
    }

    updateGridSize() {
        // Обновление размеров сетки при изменении размера окна
        if (this.container) {
            this.renderGrid();
        }
    }

    setupImageUpdate(editor) {
        const partInput = editor.querySelector('#cell-part');
        const colorInput = editor.querySelector('#cell-color');
        const imageElement = editor.querySelector('#part-image');
        const placeholderElement = editor.querySelector('#part-image-placeholder');

        const updateImage = async () => {
            const partValue = partInput.value.trim();
            const colorValue = colorInput.value.trim();

            // Показываем заглушку если деталь не выбрана
            if (!partValue) {
                this.showImagePlaceholder(imageElement, placeholderElement);
                return;
            }

            // Извлекаем partId из значения (может быть в формате "3001 - Brick 2x4")
            const partId = partValue.split(' - ')[0].trim();
            
            // Если цвет не указан, используем дефолтный рендер BrickLink (ID = 0)
            const colorId = colorValue ? this.getColorId(colorValue) : '0';

            try {
                const imageUrl = this.getPartImageUrl(partId, colorId);
                await this.loadPartImage(imageElement, placeholderElement, imageUrl);
            } catch (error) {
                console.warn('Failed to load part image:', error);
                this.showImagePlaceholder(imageElement, placeholderElement);
            }
        };

        // НЕ обновляем изображение при вводе - только при выборе из списка

        // Показываем заглушку при загрузке формы или обновляем изображение если есть данные
        if (partInput.value.trim() && colorInput.value.trim()) {
            // Если есть данные в полях, обновляем изображение
            updateImage();
        } else {
            // Иначе показываем заглушку
            this.showImagePlaceholder(imageElement, placeholderElement);
        }
        
        // Возвращаем функцию updateImage для использования в других методах
        return updateImage;
    }

    getPartImageUrl(partId, colorId) {
        try {
            // Используем ImageManager если доступен, иначе формируем URL напрямую
            if (window.imageManager) {
                return window.imageManager.getBrickLinkImageUrl(partId, colorId);
            }
            
            // Fallback URL для BrickLink
            return `https://img.bricklink.com/ItemImage/PN/${colorId}/${partId}.png`;
        } catch (error) {
            console.warn('Failed to get image URL:', error);
            // Fallback URL для BrickLink
            return `https://img.bricklink.com/ItemImage/PN/${colorId}/${partId}.png`;
        }
    }

    async loadPartImage(imageElement, placeholderElement, imageUrl) {
        console.log('Loading image:', imageUrl);
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                console.log('Image loaded successfully');
                imageElement.src = imageUrl;
                imageElement.style.display = 'block';
                placeholderElement.style.display = 'none';
                resolve();
            };
            
            img.onerror = (error) => {
                console.warn('Image failed to load:', error, 'URL:', imageUrl);
                this.showImagePlaceholder(imageElement, placeholderElement);
                reject(new Error('Failed to load image'));
            };
            
            img.src = imageUrl;
        });
    }

    showImagePlaceholder(imageElement, placeholderElement) {
        imageElement.style.display = 'none';
        imageElement.src = '';
        placeholderElement.style.display = 'flex';
    }

    // === МЕТОДЫ ОБЪЕДИНЕНИЯ ЯЧЕЕК ===

    toggleMergeMode() {
        this.isMergeMode = !this.isMergeMode;
        
        if (this.isMergeMode) {
            this.startMergeMode();
        } else {
            this.cancelMerge();
        }
    }

    startMergeMode() {
        console.log('Starting merge mode');
        this.mergeSelectedCells.clear();
        
        // Показываем панель управления
        const mergeControls = document.getElementById('merge-controls');
        if (mergeControls) {
            mergeControls.classList.remove('hidden');
        }
        
        // Добавляем класс режима объединения к контейнеру
        const containerView = document.getElementById('container-view');
        if (containerView) {
            containerView.classList.add('merge-mode');
        }
        
        // Обновляем кнопку
        const mergeBtn = document.getElementById('merge-cells-btn');
        if (mergeBtn) {
            mergeBtn.textContent = '❌ Отменить объединение';
            mergeBtn.classList.remove('btn-outline');
            mergeBtn.classList.add('btn-danger');
        }
        
        this.updateMergeControls();
    }

    cancelMerge() {
        console.log('Canceling merge mode');
        this.isMergeMode = false;
        this.mergeSelectedCells.clear();
        
        // Скрываем панель управления
        const mergeControls = document.getElementById('merge-controls');
        if (mergeControls) {
            mergeControls.classList.add('hidden');
        }
        
        // Убираем класс режима объединения
        const containerView = document.getElementById('container-view');
        if (containerView) {
            containerView.classList.remove('merge-mode');
        }
        
        // Обновляем кнопку
        const mergeBtn = document.getElementById('merge-cells-btn');
        if (mergeBtn) {
            mergeBtn.textContent = '🔗 Объединить ячейки';
            mergeBtn.classList.add('btn-outline');
            mergeBtn.classList.remove('btn-danger');
        }
        
        // Убираем все классы выбора с ячеек
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('merge-selectable', 'merge-selected', 'merge-invalid');
        });
    }

    toggleMergeCellSelection(cell) {
        const cellIndex = parseInt(cell.dataset.cellIndex);
        
        if (this.mergeSelectedCells.has(cellIndex)) {
            // Убираем из выбора
            this.mergeSelectedCells.delete(cellIndex);
            cell.classList.remove('merge-selected');
        } else {
            // Проверяем, можно ли добавить эту ячейку
            if (this.canAddToMergeSelection(cellIndex)) {
                this.mergeSelectedCells.add(cellIndex);
                cell.classList.remove('merge-invalid');
                cell.classList.add('merge-selected');
            } else {
                // Показываем, что ячейка не может быть выбрана
                cell.classList.add('merge-invalid');
                setTimeout(() => {
                    cell.classList.remove('merge-invalid');
                }, 1000);
            }
        }
        
        this.updateMergeControls();
    }

    canAddToMergeSelection(cellIndex) {
        if (this.mergeSelectedCells.size === 0) {
            return true; // Первая ячейка всегда может быть выбрана
        }
        
        const { rows, cols } = this.container;
        const currentRow = Math.floor(cellIndex / cols);
        const currentCol = cellIndex % cols;
        
        // Проверяем, что ячейка соседняя с уже выбранными
        for (const selectedIndex of this.mergeSelectedCells) {
            const selectedRow = Math.floor(selectedIndex / cols);
            const selectedCol = selectedIndex % cols;
            
            // Проверяем, что ячейки в одной строке или одном столбце
            const isSameRow = currentRow === selectedRow;
            const isSameCol = currentCol === selectedCol;
            
            if (!isSameRow && !isSameCol) {
                return false; // Ячейки должны быть в одной линии
            }
            
            // Проверяем, что ячейки соседние
            const rowDiff = Math.abs(currentRow - selectedRow);
            const colDiff = Math.abs(currentCol - selectedCol);
            
            if (isSameRow && colDiff === 1) {
                return true; // Соседние по горизонтали
            }
            if (isSameCol && rowDiff === 1) {
                return true; // Соседние по вертикали
            }
        }
        
        return false;
    }

    updateMergeControls() {
        const countElement = document.getElementById('selected-cells-count');
        const confirmBtn = document.getElementById('confirm-merge-btn');
        
        if (countElement) {
            countElement.textContent = this.mergeSelectedCells.size;
        }
        
        if (confirmBtn) {
            confirmBtn.disabled = this.mergeSelectedCells.size < 2;
        }
        
        // Обновляем классы ячеек для режима выбора
        document.querySelectorAll('.grid-cell').forEach(cell => {
            if (this.isMergeMode) {
                cell.classList.add('merge-selectable');
            } else {
                cell.classList.remove('merge-selectable', 'merge-selected', 'merge-invalid');
            }
        });
    }

    confirmMerge() {
        if (this.mergeSelectedCells.size < 2) {
            console.warn('Need at least 2 cells to merge');
            return;
        }
        
        console.log('Confirming merge for cells:', Array.from(this.mergeSelectedCells));
        
        // Создаем объединенную ячейку
        const mergedCell = this.createMergedCell(Array.from(this.mergeSelectedCells));
        
        // Обновляем модель данных
        this.updateContainerForMerge(Array.from(this.mergeSelectedCells), mergedCell);
        
        // Перерендериваем сетку
        this.renderGrid();
        
        // Выходим из режима объединения
        this.cancelMerge();
        
        // Показываем уведомление
        if (window.app) {
            window.app.showNotification('Ячейки успешно объединены!', 'success');
        }
        
        // Автосохранение
        if (window.app) {
            window.app.autoSave();
        }
    }

    createMergedCell(cellIndices) {
        const { rows, cols } = this.container;
        const sortedIndices = cellIndices.sort((a, b) => a - b);
        
        // Определяем направление объединения
        const firstIndex = sortedIndices[0];
        const lastIndex = sortedIndices[sortedIndices.length - 1];
        
        const firstRow = Math.floor(firstIndex / cols);
        const firstCol = firstIndex % cols;
        const lastRow = Math.floor(lastIndex / cols);
        const lastCol = lastIndex % cols;
        
        const isHorizontal = firstRow === lastRow;
        const isVertical = firstCol === lastCol;
        
        if (!isHorizontal && !isVertical) {
            throw new Error('Cells must be in the same row or column');
        }
        
        // Собираем данные из всех ячеек
        const allItems = [];
        for (const index of sortedIndices) {
            const cellData = this.container.cells[index];
            if (cellData) {
                if (cellData.items) {
                    // Если это уже объединенная ячейка
                    allItems.push(...cellData.items);
                } else if (cellData.partId) {
                    // Если это обычная ячейка с деталью
                    allItems.push({
                        partId: cellData.partId,
                        name: cellData.name,
                        color: cellData.color,
                        quantity: cellData.quantity,
                        image: cellData.image
                    });
                }
            }
        }
        
        return {
            type: 'merged',
            direction: isHorizontal ? 'horizontal' : 'vertical',
            cellCount: sortedIndices.length,
            startIndex: firstIndex,
            endIndex: lastIndex,
            items: allItems,
            mergedAt: new Date().toISOString()
        };
    }

    updateContainerForMerge(cellIndices, mergedCell) {
        const sortedIndices = cellIndices.sort((a, b) => a - b);
        const startIndex = sortedIndices[0];
        
        // Заменяем первую ячейку на объединенную
        this.container.cells[startIndex] = mergedCell;
        
        // Очищаем остальные ячейки
        for (let i = 1; i < sortedIndices.length; i++) {
            this.container.cells[sortedIndices[i]] = null;
        }
        
        // Обновляем время изменения
        this.container.updatedAt = new Date().toISOString();
    }

    // === МЕТОДЫ РАЗБИВАНИЯ ЯЧЕЕК ===

    toggleSplitMode() {
        this.isSplitMode = !this.isSplitMode;
        
        if (this.isSplitMode) {
            this.startSplitMode();
        } else {
            this.cancelSplitMode();
        }
    }

    startSplitMode() {
        console.log('Starting split mode');
        
        // Обновляем кнопку
        const splitBtn = document.getElementById('split-cells-btn');
        if (splitBtn) {
            splitBtn.textContent = '❌ Отменить разбивание';
            splitBtn.classList.remove('btn-outline');
            splitBtn.classList.add('btn-danger');
        }
        
        // Добавляем класс режима разбивания к контейнеру
        const containerView = document.getElementById('container-view');
        if (containerView) {
            containerView.classList.add('split-mode');
        }
        
        // Обновляем курсор для объединенных ячеек
        this.updateSplitModeCursors();
    }

    cancelSplitMode() {
        console.log('Canceling split mode');
        this.isSplitMode = false;
        
        // Убираем класс режима разбивания
        const containerView = document.getElementById('container-view');
        if (containerView) {
            containerView.classList.remove('split-mode');
        }
        
        // Обновляем кнопку
        const splitBtn = document.getElementById('split-cells-btn');
        if (splitBtn) {
            splitBtn.textContent = '✂️ Разбить ячейки';
            splitBtn.classList.add('btn-outline');
            splitBtn.classList.remove('btn-danger');
        }
        
        // Убираем курсор разбивания
        document.querySelectorAll('.grid-cell.merged').forEach(cell => {
            cell.classList.remove('split-selectable');
        });
    }

    updateSplitModeCursors() {
        document.querySelectorAll('.grid-cell.merged').forEach(cell => {
            if (this.isSplitMode) {
                cell.classList.add('split-selectable');
            } else {
                cell.classList.remove('split-selectable');
            }
        });
    }

    splitMergedCell(cell) {
        const cellIndex = parseInt(cell.dataset.cellIndex);
        const cellData = this.container.cells[cellIndex];
        
        if (!cellData || cellData.type !== 'merged') {
            console.warn('Cell is not merged, cannot split');
            return;
        }
        
        console.log('Splitting merged cell:', cellData);
        
        // Подтверждение разбивания
        if (window.confirm(`Разбить объединенную ячейку на ${cellData.cellCount} отдельных ячеек?`)) {
            this.performSplit(cellIndex, cellData);
        }
    }

    performSplit(startIndex, mergedCellData) {
        const { cellCount, items } = mergedCellData;
        const { rows, cols } = this.container;
        
        // Распределяем items по отдельным ячейкам
        const itemsPerCell = Math.ceil(items.length / cellCount);
        
        for (let i = 0; i < cellCount; i++) {
            const cellIndex = startIndex + i;
            const startItemIndex = i * itemsPerCell;
            const endItemIndex = Math.min(startItemIndex + itemsPerCell, items.length);
            const cellItems = items.slice(startItemIndex, endItemIndex);
            
            if (cellItems.length > 0) {
                // Создаем обычную ячейку с данными
                this.container.cells[cellIndex] = {
                    partId: cellItems[0].partId,
                    name: cellItems[0].name,
                    color: cellItems[0].color,
                    quantity: cellItems.reduce((sum, item) => sum + item.quantity, 0),
                    image: cellItems[0].image,
                    items: cellItems
                };
            } else {
                // Пустая ячейка
                this.container.cells[cellIndex] = null;
            }
        }
        
        // Перерендериваем сетку
        this.renderGrid();
        
        // Выходим из режима разбивания
        this.cancelSplitMode();
        
        // Показываем уведомление
        if (window.app) {
            window.app.showNotification('Ячейка успешно разбита!', 'success');
        }
        
        // Автосохранение
        if (window.app) {
            window.app.autoSave();
        }
    }
}
