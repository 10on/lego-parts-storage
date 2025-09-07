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

        // Добавляем drag & drop для ячеек с содержимым
        if (cellData && cellData.items && cellData.items.length > 0) {
            this.setupCellDragDrop(cell, cellData, index);
        }

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
            return this.renderMultipleParts(cellData.items, true);
        }
        
        if (cellData) {
            // Проверяем, есть ли массив деталей (новый формат)
            if (cellData.items && cellData.items.length > 0) {
                return this.renderMultipleParts(cellData.items, false);
            }
            
            // Старый формат - одна деталь
            if (cellData.partId) {
                return this.renderSinglePart(cellData);
            }
        }
        
        // Пустая ячейка
        return '<div class="cell-content"></div>';
    }

    renderSinglePart(partData) {
            return `
                <div class="cell-content">
                ${partData.image ? `<img src="${partData.image}" alt="${partData.name}" class="cell-image" onerror="this.style.display='none'">` : ''}
                </div>
            `;
        }
        
    renderMultipleParts(parts, isMerged = false) {
        if (!parts || parts.length === 0) {
            return '<div class="cell-content"></div>';
        }

        // Сортируем детали по количеству (больше сначала)
        const sortedParts = [...parts].sort((a, b) => (b.quantity || 1) - (a.quantity || 1));
        
        // Показываем максимум 3 детали в ряд, остальные скрываем
        const visibleParts = sortedParts.slice(0, 3);
        const hiddenCount = Math.max(0, sortedParts.length - 3);
        
        const partsHtml = visibleParts.map((part, index) => {
            return `
                <div class="cell-part">
                    <div class="part-image-container-small">
                        ${part.image ? `<img src="${part.image}" alt="${part.name}" class="cell-image-small" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" onload="this.nextElementSibling.style.display='none';">` : ''}
                        <div class="part-image-placeholder-small" style="${part.image ? 'display: flex;' : ''}">
                            <div class="placeholder-icon-tiny">🧱</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        const hiddenHtml = hiddenCount > 0 ? 
            `<div class="hidden-parts">+${hiddenCount}</div>` : '';

        return `
            <div class="cell-content multiple-parts ${isMerged ? 'merged' : ''}">
                ${partsHtml}
                ${hiddenHtml}
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
                    window.location.hash = 'home';
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

    async openCellEditor(cell) {
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
            editor.innerHTML = await this.renderCellEditor(cellData, cellIndex);
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

    async renderCellEditor(cellData, cellIndex) {
        // Определяем, является ли ячейка объединенной
        const isMerged = cellData && cellData.type === 'merged';
        const hasItems = isMerged && cellData.items && cellData.items.length > 0;
        
        // Получаем данные для отображения
        let displayData = null;
        let existingParts = [];
        
        if (isMerged && hasItems) {
            // Для объединенной ячейки показываем данные первой детали
            displayData = cellData.items[0];
            existingParts = cellData.items;
        } else if (cellData && cellData.items && cellData.items.length > 0) {
            // Для обычной ячейки с множественными деталями
            displayData = cellData.items[0];
            existingParts = cellData.items;
        } else if (cellData && cellData.partId) {
            // Для обычной ячейки с одной деталью
            displayData = cellData;
            existingParts = [cellData];
        }
        
        const html = `
            <div class="cell-editor-header">
                <div class="header-left">
                    <h4>${isMerged ? '🔗 Объединенная ячейка' : (existingParts.length > 0 ? '✏️ Управление деталями' : '➕ Добавить деталь')}</h4>
                    <span class="cell-position">Ячейка ${cellIndex + 1}${isMerged ? ` (${cellData.cellCount} ячеек)` : ''}${existingParts.length > 0 ? ` • ${existingParts.length} деталей` : ''}</span>
                </div>
                <button type="button" class="close-btn" id="modal-close">✕</button>
            </div>
            <div class="cell-editor-content">
                ${existingParts.length > 0 ? `
                    <div class="editor-tabs">
                        <button type="button" class="tab-btn active" data-tab="existing">📦 Текущие детали (${existingParts.length})</button>
                        <button type="button" class="tab-btn" data-tab="add-new">➕ Добавить новую</button>
                    </div>
                ` : ''}
                
                <div class="tab-content">
                    ${existingParts.length > 0 ? `
                        <div class="tab-panel active" id="tab-existing">
                            <div class="existing-parts-section">
                                <div class="existing-parts-list">
                                    ${await Promise.all(existingParts.map(async (item, index) => {
                                        const colorName = await this.getColorName(item.colorId);
                                        return `
                                            <div class="existing-part-item" data-part-id="${item.partId}" data-color-id="${item.colorId}">
                                                <div class="part-image-small">
                                                    ${item.image ? `<img src="${item.image}" alt="${item.partId}" class="part-thumbnail" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" onload="this.nextElementSibling.style.display='none';">` : ''}
                                                    <div class="part-thumbnail-placeholder" style="${item.image ? 'display: flex;' : ''}">
                                                        <div class="placeholder-icon-small">🧱</div>
                                                    </div>
                                                </div>
                                                <div class="part-info">
                                                    <div class="part-id">${item.partId}</div>
                                                    <div class="part-color">${colorName}</div>
                                                </div>
                                                <div class="part-quantity">
                                                    <input type="number" value="${item.quantity || ''}" max="999" class="quantity-input" data-index="${index}">
                                                </div>
                                                <div class="part-actions">
                                                    <button type="button" class="btn-edit-part" data-index="${index}" title="Редактировать деталь">✏️</button>
                                                    <button type="button" class="btn-remove-part" data-index="${index}" title="Удалить деталь">🗑️</button>
                                                </div>
                                            </div>
                                        `;
                                    })).then(html => html.join(''))}
                                </div>
                                <div class="existing-parts-actions">
                                    <button type="button" class="btn btn-danger" id="cell-clear">🗑️ Очистить все детали</button>
                                </div>
                        </div>
                    </div>
                ` : ''}
                    
                    <div class="tab-panel ${existingParts.length === 0 ? 'active' : ''}" id="tab-add-new">
                        <div class="form-and-image-container">
                <form class="cell-editor-form">
                    <div class="form-group">
                        <label class="form-label">Деталь *</label>
                        <input type="text" class="form-input autocomplete-input" id="cell-part" value="${this.formatPartValue(cellData)}" placeholder="Начните вводить номер или название детали..." required>
                        <small class="form-help">Выберите деталь из каталога BrickLink</small>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Цвет *</label>
                            <input type="text" class="form-input autocomplete-input" id="cell-color" value="${displayData?.color || ''}" placeholder="Сначала выберите деталь..." required disabled>
                            <div class="color-restriction-info" id="cell-color-restriction-info" style="display: none;">
                                <small>Доступные цвета для выбранной детали</small>
                            </div>
                            <small class="form-help">Выберите цвет из доступных для детали</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Количество (опционально)</label>
                            <input type="number" class="form-input" id="cell-quantity" value="${displayData?.quantity || ''}" placeholder="Оставить пустым если не важно" max="999">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                                        <span>➕ Добавить деталь</span>
                        </button>
                        <button type="button" class="btn btn-secondary" id="cell-cancel">Отмена</button>
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
        
        // Инициализация обработчиков для существующих деталей
        this.setupExistingPartsListeners(editor, cell, cellIndex);
        
        // Инициализация обработчиков табов
        this.setupTabListeners(editor);
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
                
                // Обрабатываем изменение Part ID для ограничения цветов
                this.handleCellPartIdChange(value, editor);
                
                // Обновляем изображение при выборе детали
                if (updateImage) updateImage();
            }
        });

        // Добавляем обработчик для ручного ввода Part ID
        partInput.addEventListener('input', (e) => {
            const value = e.target.value;
            // Извлекаем Part ID из значения (если есть формат "ID - Название")
            const partId = value.includes(' - ') ? value.split(' - ')[0] : value;
            this.handleCellPartIdChange(partId, editor);
            
            // Обновляем изображение при изменении Part ID
            if (updateImage) {
                setTimeout(() => updateImage(), 200);
            }
        });

        // Сохраняем ссылку для последующего удаления
        this.partAutocomplete = partAutocomplete;
    }

    setupColorAutocomplete(editor, updateImage) {
        const colorInput = editor.querySelector('#cell-color');

        if (!colorInput) {
            console.warn('Color input not found');
            return;
        }

        if (!window.brickLinkData || !window.brickLinkData.isLoaded) {
            console.warn('BrickLink data not loaded, using simple input');
            return;
        }

        const colorAutocomplete = new AutoComplete(colorInput, {
            minChars: 0,
            delay: 100,
            placeholder: 'Выберите цвет...',
            noResultsText: 'Цвет не найден',
            source: async (query) => {
                // Если есть доступные цвета, используем их
                if (this.availableColors && this.availableColors.length > 0) {
                    const filteredColors = this.availableColors.filter(color => 
                        color.name.toLowerCase().includes(query.toLowerCase())
                    );
                    return filteredColors.map(color => ({
                        value: color.name,
                        label: color.name,
                        rgb: color.rgb,
                        category: 'Цвета'
                    }));
                }
                
                // Иначе используем общий поиск
                return window.brickLinkData.searchColors(query);
            },
            onSelect: (value, item) => {
                colorInput.value = value;
                // Валидируем выбранный цвет
                this.validateCellSelectedColor(value, editor);
                // Обновляем изображение при выборе цвета
                if (updateImage) updateImage();
            }
        });

        // Добавляем обработчик для ручного ввода цвета
        colorInput.addEventListener('input', (e) => {
            this.validateCellSelectedColor(e.target.value, editor);
        });

        // Сохраняем ссылку для последующего удаления
        this.colorAutocomplete = colorAutocomplete;
    }

    setupExistingPartsListeners(editor, cell, cellIndex) {
        // Обработчики для изменения количества
        editor.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const quantityValue = e.target.value;
                const newQuantity = quantityValue ? parseInt(quantityValue) : null;
                this.updatePartQuantity(cell, cellIndex, index, newQuantity);
            });
        });

        // Обработчики для удаления деталей
        editor.querySelectorAll('.btn-remove-part').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removePartFromCell(cell, cellIndex, index, editor);
            });
        });

        // Обработчики для редактирования деталей
        editor.querySelectorAll('.btn-edit-part').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.editPartInCell(editor, cell, cellIndex, index);
            });
        });
    }

    async updatePartQuantity(cell, cellIndex, partIndex, newQuantity) {
        const cellData = this.container.cells[cellIndex];
        if (!cellData) return;

        // Если это объединенная ячейка
        if (cellData.type === 'merged' && cellData.items) {
            if (cellData.items[partIndex]) {
                cellData.items[partIndex].quantity = newQuantity;
                cellData.updatedAt = new Date().toISOString();
            }
        } else if (cellData.items) {
            // Если это обычная ячейка с множественными деталями
            if (cellData.items[partIndex]) {
                cellData.items[partIndex].quantity = newQuantity;
                this.container.updatedAt = new Date().toISOString();
            }
        }

        // Обновляем отображение ячейки
        cell.innerHTML = this.renderCellContent(cellData);
        
        // Синхронизируем с основным приложением
        if (window.app) {
            const containerIndex = window.app.containers.findIndex(c => c.id === this.container.id);
            if (containerIndex > -1) {
                window.app.containers[containerIndex] = this.container;
            }
            await window.app.autoSave();
        }
    }

    async removePartFromCell(cell, cellIndex, partIndex, editor) {
        const cellData = this.container.cells[cellIndex];
        if (!cellData) return;

        // Если это объединенная ячейка
        if (cellData.type === 'merged' && cellData.items) {
            cellData.items.splice(partIndex, 1);
            if (cellData.items.length === 0) {
                // Если деталей не осталось, очищаем ячейку
                this.container.cells[cellIndex] = null;
            } else {
                cellData.updatedAt = new Date().toISOString();
            }
        } else if (cellData.items) {
            // Если это обычная ячейка с множественными деталями
            cellData.items.splice(partIndex, 1);
            if (cellData.items.length === 0) {
                // Если деталей не осталось, очищаем ячейку
                this.container.cells[cellIndex] = null;
            } else {
                this.container.updatedAt = new Date().toISOString();
            }
        }

        // Обновляем отображение ячейки
        const updatedCellData = this.container.cells[cellIndex];
        cell.innerHTML = this.renderCellContent(updatedCellData);

        // Синхронизируем с основным приложением
        if (window.app) {
            const containerIndex = window.app.containers.findIndex(c => c.id === this.container.id);
            if (containerIndex > -1) {
                window.app.containers[containerIndex] = this.container;
            }
            await window.app.autoSave();
        }

        // Если ячейка стала пустой, закрываем редактор
        if (!updatedCellData) {
            this.closeCellEditor();
        } else {
            // Обновляем счетчики для оставшихся деталей
            const remainingParts = this.getCellPartsFromData(updatedCellData);
            this.updateTabCounter(editor, remainingParts.length);
            this.updateModalHeader(editor, remainingParts.length);
            
            // Перерендериваем редактор с обновленными данными
            this.openCellEditor(cell);
        }
    }

    async saveCellData(cell, cellIndex, editor) {
        const partValue = editor.querySelector('#cell-part').value.trim();
        const quantityValue = editor.querySelector('#cell-quantity').value;
        const quantity = quantityValue ? parseInt(quantityValue) : null;
        const color = editor.querySelector('#cell-color').value.trim();
        const editingPartIndex = editor.dataset.editingPartIndex;

        // Валидация
        if (!partValue) {
            this.showValidationError(editor.querySelector('#cell-part'), 'Деталь обязательна');
            return;
        }

        if (!color) {
            this.showValidationError(editor.querySelector('#cell-color'), 'Цвет обязателен');
            return;
        }

        // Валидация цвета - проверяем, доступен ли он для выбранной детали
        if (this.availableColors && this.availableColors.length > 0) {
            const isValidColor = this.availableColors.some(availableColor => 
                availableColor.name.toLowerCase() === color.toLowerCase()
            );
            
            if (!isValidColor) {
                this.showValidationError(editor.querySelector('#cell-color'), `Цвет "${color}" недоступен для этой детали. Выберите из доступных цветов.`);
                return;
            }
        }

        if (quantityValue && (quantity < 1 || quantity > 999)) {
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
            quantity,
            colorId: await this.getColorId(color),
            image: await this.generateImageUrl(partId, color),
            lastUpdated: new Date().toISOString()
        };

        // Если это редактирование существующей детали
        if (editingPartIndex !== undefined) {
            this.updateExistingPart(cell, cellIndex, parseInt(editingPartIndex), newItem);
            // Сбрасываем флаг редактирования
            delete editor.dataset.editingPartIndex;
            // Возвращаем текст кнопки
            const submitBtn = editor.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.innerHTML = '<span>➕ Добавить деталь</span>';
            }
        } else {
            // Это добавление новой детали
            this.addNewPart(cell, cellIndex, newItem);
        }

        // Обновляем отображение ячейки
        const updatedCellData = this.container.cells[cellIndex];
        cell.innerHTML = this.renderCellContent(updatedCellData);
        cell.classList.remove('empty', 'editing');
        cell.classList.add('filled');

        // Очищаем поля формы для добавления следующей детали
        editor.querySelector('#cell-part').value = '';
        editor.querySelector('#cell-color').value = '';
        editor.querySelector('#cell-quantity').value = '1';
        
        // Обновляем изображение (показываем заглушку)
        const imageElement = editor.querySelector('#part-image');
        const placeholderElement = editor.querySelector('#part-image-placeholder');
        if (imageElement && placeholderElement) {
            imageElement.style.display = 'none';
            placeholderElement.style.display = 'flex';
        }
        
        // Автоматическое сохранение
        if (window.app) {
            await window.app.autoSave();
            const action = editingPartIndex !== undefined ? 'обновлена' : 'добавлена';
            window.app.showNotification(`Деталь "${name}" ${action}!`, 'success');
        }
        
        // Обновляем секцию существующих деталей
        this.updateExistingPartsSection(editor, cellIndex);
        
        // Переключаемся на вкладку "Текущие детали" чтобы показать обновленный список
        this.switchToExistingPartsTab(editor);
        
        // НЕ закрываем редактор - позволяем добавить еще детали
    }

    addNewPart(cell, cellIndex, newItem) {
        const existingCellData = this.container.cells[cellIndex];
        
        if (existingCellData && existingCellData.type === 'merged') {
            // Если это объединенная ячейка, добавляем деталь в массив items
            if (!existingCellData.items) {
                existingCellData.items = [];
            }
            existingCellData.items.push(newItem);
            existingCellData.updatedAt = new Date().toISOString();
        } else {
            // Если это обычная ячейка, добавляем деталь к существующим
            if (!existingCellData) {
                // Пустая ячейка - создаем новую структуру
                this.container.cells[cellIndex] = { items: [newItem] };
            } else if (existingCellData.items) {
                // Ячейка уже содержит массив деталей - добавляем к ним
                // Проверяем, есть ли уже такая деталь (по partId и colorId)
                const existingItemIndex = existingCellData.items.findIndex(item => 
                    item.partId === newItem.partId && item.colorId === newItem.colorId
                );
                
                if (existingItemIndex >= 0) {
                    // Увеличиваем количество существующей детали
                    existingCellData.items[existingItemIndex].quantity += newItem.quantity || 1;
                } else {
                    // Добавляем новую деталь
                    existingCellData.items.push(newItem);
                }
            } else if (existingCellData.partId) {
                // Старая ячейка с одной деталью - конвертируем в новый формат
                const existingPart = { ...existingCellData };
                this.container.cells[cellIndex] = { items: [existingPart, newItem] };
            } else {
                // Неожиданная структура - создаем новую
                this.container.cells[cellIndex] = { items: [newItem] };
            }
        }

        this.container.updatedAt = new Date().toISOString();
        
        // Синхронизируем с основным приложением
        if (window.app) {
            const containerIndex = window.app.containers.findIndex(c => c.id === this.container.id);
            if (containerIndex > -1) {
                window.app.containers[containerIndex] = this.container;
            }
        }
    }

    updateExistingPart(cell, cellIndex, partIndex, updatedItem) {
        const cellData = this.container.cells[cellIndex];
        if (!cellData) return;

        // Если это объединенная ячейка
        if (cellData.type === 'merged' && cellData.items) {
            if (cellData.items[partIndex]) {
                cellData.items[partIndex] = updatedItem;
                cellData.updatedAt = new Date().toISOString();
            }
        } else if (cellData.items) {
            // Если это обычная ячейка с множественными деталями
            if (cellData.items[partIndex]) {
                cellData.items[partIndex] = updatedItem;
                this.container.updatedAt = new Date().toISOString();
            }
        }
    }

    switchToExistingPartsTab(editor) {
        const existingTab = editor.querySelector('[data-tab="existing"]');
        const existingPanel = editor.querySelector('#tab-existing');
        
        if (existingTab && existingPanel) {
            // Убираем активный класс со всех табов
            editor.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            editor.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
            
            // Активируем вкладку "Текущие детали"
            existingTab.classList.add('active');
            existingPanel.classList.add('active');
        }
    }

    async updateExistingPartsSection(editor, cellIndex) {
        const cellData = this.container.cells[cellIndex];
        if (!cellData) return;

        // Получаем список деталей
        let existingParts = [];
        if (cellData.type === 'merged' && cellData.items) {
            existingParts = cellData.items;
        } else if (cellData.items) {
            existingParts = cellData.items;
        } else if (cellData.partId) {
            existingParts = [cellData];
        }

        // Обновляем секцию существующих деталей
        const existingPartsSection = editor.querySelector('.existing-parts-section');
        if (existingPartsSection) {
            const partsList = existingPartsSection.querySelector('.existing-parts-list');
            if (partsList) {
                // Сначала показываем загрузку
                partsList.innerHTML = '<div class="loading">Загрузка деталей...</div>';
                
                // Асинхронно получаем названия цветов
                const partsHtml = await Promise.all(existingParts.map(async (item, index) => {
                    const colorName = await this.getColorName(item.colorId);
                    return `
                        <div class="existing-part-item" data-part-id="${item.partId}" data-color-id="${item.colorId}">
                            <div class="part-image-small">
                                ${item.image ? `<img src="${item.image}" alt="${item.partId}" class="part-thumbnail" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" onload="this.nextElementSibling.style.display='none';">` : ''}
                                <div class="part-thumbnail-placeholder" style="${item.image ? 'display: flex;' : ''}">
                                    <div class="placeholder-icon-small">🧱</div>
                                </div>
                            </div>
                            <div class="part-info">
                                <div class="part-id">${item.partId}</div>
                                <div class="part-color">${colorName}</div>
                            </div>
                            <div class="part-quantity">
                                <input type="number" value="${item.quantity || ''}" max="999" class="quantity-input" data-index="${index}">
                            </div>
                            <div class="part-actions">
                                <button type="button" class="btn-edit-part" data-index="${index}" title="Редактировать деталь">✏️</button>
                                <button type="button" class="btn-remove-part" data-index="${index}" title="Удалить деталь">🗑️</button>
                            </div>
                        </div>
                    `;
                }));
                
                partsList.innerHTML = partsHtml.join('');

                // Переустанавливаем обработчики событий
                const cell = document.querySelector(`[data-cell-index="${cellIndex}"]`);
                this.setupExistingPartsListeners(editor, cell, cellIndex);
                
                // Обновляем счетчик деталей в заголовке таба
                this.updateTabCounter(editor, existingParts.length);
                
                // Обновляем счетчик в заголовке модального окна
                this.updateModalHeader(editor, existingParts.length);
            }
        }
    }

    getCellPartsFromData(cellData) {
        if (!cellData) return [];
        
        // Если это объединенная ячейка
        if (cellData.type === 'merged' && cellData.items) {
            return cellData.items;
        }
        
        // Если это обычная ячейка с множественными деталями
        if (cellData.items) {
            return cellData.items;
        }
        
        // Если это старая ячейка с одной деталью
        if (cellData.partId) {
            return [cellData];
        }
        
        return [];
    }

    updateTabCounter(editor, count) {
        const existingTab = editor.querySelector('[data-tab="existing"]');
        if (existingTab) {
            existingTab.textContent = `📦 Текущие детали (${count})`;
        }
    }

    updateModalHeader(editor, count) {
        const cellPosition = editor.querySelector('.cell-position');
        if (cellPosition) {
            // Извлекаем номер ячейки из текущего текста
            const currentText = cellPosition.textContent;
            const cellNumber = currentText.match(/Ячейка (\d+)/);
            if (cellNumber) {
                cellPosition.textContent = `Ячейка ${cellNumber[1]} • ${count} деталей`;
            }
        }
    }

    setupTabListeners(editor) {
        const tabButtons = editor.querySelectorAll('.tab-btn');
        const tabPanels = editor.querySelectorAll('.tab-panel');

        tabButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                
                // Убираем активный класс со всех кнопок и панелей
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabPanels.forEach(panel => panel.classList.remove('active'));
                
                // Активируем выбранную кнопку и панель
                e.target.classList.add('active');
                const targetPanel = editor.querySelector(`#tab-${targetTab}`);
                if (targetPanel) {
                    targetPanel.classList.add('active');
                }
            });
        });
    }

    async editPartInCell(editor, cell, cellIndex, partIndex) {
        const cellData = this.container.cells[cellIndex];
        if (!cellData) return;

        // Получаем данные детали
        let partData = null;
        if (cellData.type === 'merged' && cellData.items) {
            partData = cellData.items[partIndex];
        } else if (cellData.items) {
            partData = cellData.items[partIndex];
        }

        if (!partData) return;

        // Переключаемся на таб добавления новой детали
        const addNewTab = editor.querySelector('[data-tab="add-new"]');
        const addNewPanel = editor.querySelector('#tab-add-new');
        if (addNewTab && addNewPanel) {
            // Убираем активный класс со всех табов
            editor.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            editor.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
            
            // Активируем таб добавления
            addNewTab.classList.add('active');
            addNewPanel.classList.add('active');
        }

        // Заполняем форму данными детали
        const partInput = editor.querySelector('#cell-part');
        const colorInput = editor.querySelector('#cell-color');
        const quantityInput = editor.querySelector('#cell-quantity');

        if (partInput) {
            partInput.value = partData.partId;
        }
        if (colorInput) {
            // Получаем название цвета по ID
            const colorName = await this.getColorName(partData.colorId);
            colorInput.value = colorName;
        }
        if (quantityInput) {
            quantityInput.value = partData.quantity || 1;
        }

        // Обновляем изображение
        const updateImage = this.setupImageUpdate(editor);
        if (updateImage) {
            setTimeout(() => updateImage(), 100);
        }

        // Помечаем, что это редактирование существующей детали
        editor.dataset.editingPartIndex = partIndex;
        
        // Изменяем текст кнопки
        const submitBtn = editor.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<span>💾 Сохранить изменения</span>';
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

    async generateImageUrl(partId, color) {
        // Простая генерация URL для BrickLink
        const colorCode = await this.getColorId(color) || '1';
        return `https://img.bricklink.com/ItemImage/PN/${colorCode}/${partId}.png`;
    }

    async clearCellData(cell, cellIndex) {
        this.container.cells[cellIndex] = null;
        this.container.updatedAt = new Date().toISOString();

        cell.innerHTML = this.renderCellContent(null);
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

    async getColorId(color) {
        if (!color || color.trim() === '') {
            return '0'; // Дефолтный рендер BrickLink
        }
        
        // Загружаем цвет из BrickLink данных
        if (!window.brickLinkData || !window.brickLinkData.isLoaded) {
            console.warn('BrickLink data not loaded, using fallback color ID');
            return '0'; // Fallback к дефолтному цвету
        }
        
        try {
            const colorData = await window.brickLinkData.getColorByName(color);
            return colorData ? colorData.id.toString() : '0';
        } catch (error) {
            console.error('Error getting color ID:', error);
            return '0'; // Fallback к дефолтному цвету
        }
    }

    async getColorName(colorId) {
        if (!colorId || colorId === '0') {
            return 'Default'; // Дефолтный цвет
        }
        
        // Загружаем цвет из BrickLink данных
        if (!window.brickLinkData || !window.brickLinkData.isLoaded) {
            console.warn('BrickLink data not loaded, using fallback color name');
            return `Color ${colorId}`; // Fallback к ID цвета
        }
        
        try {
            const colorData = await window.brickLinkData.getColorById(colorId);
            return colorData ? colorData.name : `Color ${colorId}`;
        } catch (error) {
            console.error('Error getting color name:', error);
            return `Color ${colorId}`; // Fallback к ID цвета
        }
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
            const colorId = colorValue ? await this.getColorId(colorValue) : '0';

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
            
            img.onerror = async (error) => {
                console.warn('Image failed to load:', error, 'URL:', imageUrl);
                
                // Пытаемся загрузить fallback изображения
                const fallbackUrls = this.getFallbackImageUrls(imageUrl);
                let fallbackLoaded = false;
                
                for (const fallbackUrl of fallbackUrls) {
                    try {
                        const fallbackImg = new Image();
                        const fallbackPromise = new Promise((resolveFallback, rejectFallback) => {
                            fallbackImg.onload = () => {
                                console.log('Fallback image loaded:', fallbackUrl);
                                imageElement.src = fallbackUrl;
                                imageElement.style.display = 'block';
                                placeholderElement.style.display = 'none';
                                fallbackLoaded = true;
                                resolveFallback();
                            };
                            fallbackImg.onerror = () => rejectFallback();
                        });
                        
                        fallbackImg.src = fallbackUrl;
                        await fallbackPromise;
                        break; // Если fallback загрузился, выходим из цикла
                    } catch (fallbackError) {
                        console.warn('Fallback image failed:', fallbackUrl);
                        continue; // Пробуем следующий fallback
                    }
                }
                
                if (!fallbackLoaded) {
                    // Если все fallback'и не сработали, показываем заглушку с информацией
                    this.showImagePlaceholderWithError(imageElement, placeholderElement, 'Изображение недоступно');
                }
                
                resolve(); // Не reject'им, чтобы не ломать UI
            };
            
            img.src = imageUrl;
        });
    }

    showImagePlaceholder(imageElement, placeholderElement) {
        imageElement.style.display = 'none';
        imageElement.src = '';
        placeholderElement.style.display = 'flex';
        placeholderElement.innerHTML = `
            <div class="placeholder-icon">🖼️</div>
            <div class="placeholder-text">Выберите деталь и цвет</div>
        `;
    }

    showImagePlaceholderWithError(imageElement, placeholderElement, errorMessage) {
        imageElement.style.display = 'none';
        imageElement.src = '';
        placeholderElement.style.display = 'flex';
        placeholderElement.innerHTML = `
            <div class="placeholder-icon">❌</div>
            <div class="placeholder-text">${errorMessage}</div>
        `;
        placeholderElement.style.color = 'var(--danger-color)';
    }

    getFallbackImageUrls(originalUrl) {
        // Извлекаем partId и colorId из URL
        const urlParts = originalUrl.match(/\/PN\/(\d+)\/(\w+)\.png$/);
        if (!urlParts) return [];
        
        const [, colorId, partId] = urlParts;
        const fallbackUrls = [];
        
        // 1. Пробуем с дефолтным цветом (ID = 0)
        if (colorId !== '0') {
            fallbackUrls.push(`https://img.bricklink.com/ItemImage/PN/0/${partId}.png`);
        }
        
        // 2. Пробуем с базовыми цветами
        const basicColors = ['1', '2', '3', '4', '5']; // White, Tan, Yellow, Orange, Red
        for (const basicColorId of basicColors) {
            if (basicColorId !== colorId) {
                fallbackUrls.push(`https://img.bricklink.com/ItemImage/PN/${basicColorId}/${partId}.png`);
            }
        }
        
        // 3. Пробуем с черным цветом (ID = 11)
        if (colorId !== '11') {
            fallbackUrls.push(`https://img.bricklink.com/ItemImage/PN/11/${partId}.png`);
        }
        
        return fallbackUrls;
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

    setupCellDragDrop(cell, cellData, index) {
        // Делаем ячейку перетаскиваемой
        cell.draggable = true;
        cell.style.cursor = 'grab';

        cell.addEventListener('dragstart', (e) => {
            // Подготавливаем данные для перетаскивания
            const dragData = {
                type: 'cell',
                containerId: this.container.id,
                cellIndex: index,
                cellData: cellData,
                parts: cellData.items || [],
                totalQuantity: cellData.items ? cellData.items.reduce((sum, item) => sum + item.quantity, 0) : 0
            };

            e.dataTransfer.setData('application/json', JSON.stringify(dragData));
            e.dataTransfer.effectAllowed = 'move';
            
            // Добавляем визуальную обратную связь
            cell.style.opacity = '0.5';
        });

        cell.addEventListener('dragend', (e) => {
            // Восстанавливаем визуальное состояние
            cell.style.opacity = '1';
        });

        cell.addEventListener('dragenter', (e) => {
            e.preventDefault();
        });

        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            
            const data = e.dataTransfer.getData('application/json');
            if (data) {
                try {
                    const dropData = JSON.parse(data);
                    this.handleCellDrop(dropData, index);
                } catch (error) {
                    console.error('Ошибка при обработке drop:', error);
                }
            }
        });
    }

    handleCellDrop(dropData, targetCellIndex) {
        // Обработка перетаскивания ячеек
        if (dropData.type === 'cell') {
            if (dropData.source === 'buffer') {
                // Перетаскивание из буфера в ячейку
                this.handleBufferToCellDrop(dropData, targetCellIndex);
            } else {
                // Перетаскивание между ячейками
                this.handleCellToCellDrop(dropData, targetCellIndex);
            }
        }
    }

    handleBufferToCellDrop(dropData, targetCellIndex) {
        // Добавляем содержимое из буфера в ячейку
        const targetCell = this.container.cells[targetCellIndex];
        
        if (!targetCell) {
            // Создаем новую ячейку
            this.container.cells[targetCellIndex] = {
                type: 'single',
                items: dropData.parts
            };
        } else {
            // Добавляем к существующей ячейке
            if (!targetCell.items) {
                targetCell.items = [];
            }
            targetCell.items.push(...dropData.parts);
        }

        // Перерендериваем сетку
        this.renderGrid();
        
        // Уведомляем SplitView об удалении из буфера
        if (window.app && window.app.views && window.app.views.split) {
            window.app.views.split.removeFromBuffer(dropData.bufferIndex);
        }

        if (window.app) {
            window.app.showNotification('Содержимое перемещено из буфера', 'success');
            window.app.autoSave();
        }
    }

    handleCellToCellDrop(dropData, targetCellIndex) {
        // Перемещение между ячейками
        if (dropData.containerId === this.container.id && dropData.cellIndex === targetCellIndex) {
            return; // Нельзя перемещать в ту же ячейку
        }

        const sourceCell = this.container.cells[dropData.cellIndex];
        const targetCell = this.container.cells[targetCellIndex];

        if (sourceCell && sourceCell.items) {
            if (!targetCell) {
                // Создаем новую ячейку
                this.container.cells[targetCellIndex] = {
                    type: 'single',
                    items: [...sourceCell.items]
                };
            } else {
                // Добавляем к существующей ячейке
                if (!targetCell.items) {
                    targetCell.items = [];
                }
                targetCell.items.push(...sourceCell.items);
            }

            // Очищаем исходную ячейку
            this.container.cells[dropData.cellIndex] = null;

            // Перерендериваем сетку
            this.renderGrid();

            if (window.app) {
                window.app.showNotification('Содержимое перемещено между ячейками', 'success');
                window.app.autoSave();
            }
        }
    }

    /**
     * Обрабатывает изменение Part ID в модалке контейнера
     */
    async handleCellPartIdChange(partId, editor) {
        console.log('handleCellPartIdChange called with:', partId);
        
        const colorInput = editor.querySelector('#cell-color');
        const colorInfo = editor.querySelector('#cell-color-restriction-info');
        
        if (!colorInput) {
            console.warn('Color input not found in editor');
            return;
        }
        
        if (!colorInfo) {
            console.warn('Color info element not found in editor');
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
                    // Создаем новую функцию updateImage для обновленного автодополнения
                    const newUpdateImage = this.setupImageUpdate(editor);
                    this.setupColorAutocomplete(editor, newUpdateImage);
                    
                    // Обновляем изображение для выбранной детали
                    if (newUpdateImage) {
                        setTimeout(() => newUpdateImage(), 100);
                    }
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

    /**
     * Валидирует выбранный цвет в модалке контейнера
     */
    validateCellSelectedColor(selectedColorName, editor) {
        console.log('validateCellSelectedColor called with:', selectedColorName);
        console.log('Available colors:', this.availableColors);
        
        if (!this.availableColors || this.availableColors.length === 0) {
            console.log('No available colors, skipping validation');
            return;
        }

        const isValidColor = this.availableColors.some(color => 
            color.name.toLowerCase() === selectedColorName.toLowerCase()
        );

        console.log('Is valid color:', isValidColor);

        const colorInput = editor.querySelector('#cell-color');
        const colorInfo = editor.querySelector('#cell-color-restriction-info');

        if (isValidColor) {
            // Цвет валиден
            colorInput.style.borderColor = '';
            colorInput.style.backgroundColor = '';
            if (colorInfo) {
                colorInfo.innerHTML = `<small>✅ Цвет "${selectedColorName}" доступен для этой детали</small>`;
                colorInfo.className = 'color-restriction-info success';
            }
        } else {
            // Цвет не валиден
            colorInput.style.borderColor = 'var(--danger-color)';
            colorInput.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
            if (colorInfo) {
                colorInfo.innerHTML = `<small>❌ Цвет "${selectedColorName}" недоступен для этой детали</small>`;
                colorInfo.className = 'color-restriction-info error';
            }
        }
    }
}
