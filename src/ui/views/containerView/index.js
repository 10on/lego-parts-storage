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
        const html = `
            <div class="cell-editor-header">
                <div class="header-left">
                    <h4>${cellData ? '✏️ Редактировать ячейку' : '➕ Добавить деталь'}</h4>
                    <span class="cell-position">Ячейка ${cellIndex + 1}</span>
                </div>
                <button type="button" class="close-btn" id="modal-close">✕</button>
            </div>
            <div class="cell-editor-content">
                <form class="cell-editor-form">
                    <div class="form-group">
                        <label class="form-label">Деталь *</label>
                        <input type="text" class="form-input autocomplete-input" id="cell-part" value="${this.formatPartValue(cellData)}" placeholder="Начните вводить номер или название детали..." required>
                        <small class="form-help">Выберите деталь из каталога BrickLink</small>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Цвет *</label>
                            <input type="text" class="form-input autocomplete-input" id="cell-color" value="${cellData?.color || ''}" placeholder="Начните вводить цвет..." required>
                            <small class="form-help">Выберите цвет из каталога BrickLink</small>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Количество</label>
                            <input type="number" class="form-input" id="cell-quantity" value="${cellData?.quantity || 1}" min="1" max="999">
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <span>${cellData ? 'Сохранить изменения' : 'Добавить деталь'}</span>
                        </button>
                        <button type="button" class="btn btn-secondary" id="cell-cancel">Отмена</button>
                        ${cellData ? '<button type="button" class="btn btn-danger" id="cell-clear">🗑️ Очистить</button>' : ''}
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
        if (!cellData || !cellData.partId) return '';
        if (cellData.name) {
            return `${cellData.partId} - ${cellData.name}`;
        }
        return cellData.partId;
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

        const cellData = {
            id: `cell-${cellIndex}`,
            partId: partId.toUpperCase(),
            name,
            quantity,
            color: color || 'Unknown',
            colorId: this.getColorId(color),
            image: this.generateImageUrl(partId, color),
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
}
