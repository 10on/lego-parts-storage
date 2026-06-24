class CellEditor {
    constructor(containerView) {
        this.view = containerView;
        this.partAutocomplete = null;
        this.colorAutocomplete = null;
        this.availableColors = [];
    }

    get container() { return this.view.container; }

    async openCellEditor(cell) {
        this.closeCellEditor();

        const cellIndex = parseInt(cell.dataset.cellIndex);
        const cellData = this.container.cells[cellIndex];

        const modal = document.createElement('div');
        modal.className = 'cell-editor-modal';
        modal.id = 'cell-editor-modal';

        const editor = document.createElement('div');
        editor.className = 'cell-editor';

        try {
            editor.innerHTML = await this.renderCellEditor(cellData, cellIndex);
        } catch (error) {
            console.error('Error creating editor HTML:', error);
            return;
        }

        modal.appendChild(editor);
        document.body.appendChild(modal);
        cell.classList.add('editing');

        this.setupCellEditorListeners(editor, cell, cellIndex);
        this.view.renderer.handleCellImageFallbacks(editor);

        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.closeCellEditor();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeCellEditor();
        }, { once: true });
    }

    async renderCellEditor(cellData, cellIndex) {
        const isMerged = cellData && cellData.type === 'merged';
        const hasItems = isMerged && cellData.items && cellData.items.length > 0;

        let displayData = null;
        let existingParts = [];

        if (isMerged && hasItems) {
            displayData = cellData.items[0];
            existingParts = cellData.items;
        } else if (cellData && cellData.items && cellData.items.length > 0) {
            displayData = cellData.items[0];
            existingParts = cellData.items;
        } else if (cellData && cellData.partId) {
            displayData = cellData;
            existingParts = [cellData];
        }

        const existingPartsHtml = existingParts.length > 0 ? await this._renderExistingParts(existingParts) : '';

        return `
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
                                <div class="existing-parts-list">${existingPartsHtml}</div>
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
                                    <button type="submit" class="btn btn-primary"><span>➕ Добавить деталь</span></button>
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
    }

    async _renderExistingParts(existingParts) {
        const rows = await Promise.all(existingParts.map(async (item, index) => {
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
        return rows.join('');
    }

    formatPartValue(cellData) {
        if (!cellData) return '';
        if (cellData.type === 'merged' && cellData.items && cellData.items.length > 0) {
            const first = cellData.items[0];
            return first.name ? `${first.partId} - ${first.name}` : first.partId;
        }
        if (cellData.partId) {
            return cellData.name ? `${cellData.partId} - ${cellData.name}` : cellData.partId;
        }
        return '';
    }

    setupCellEditorListeners(editor, cell, cellIndex) {
        editor.querySelector('.cell-editor-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveCellData(cell, cellIndex, editor);
        });
        editor.querySelector('#cell-cancel').addEventListener('click', () => {
            this.clearValidationErrors();
            this.closeCellEditor();
        });
        editor.querySelector('#modal-close').addEventListener('click', () => this.closeCellEditor());
        editor.querySelector('#cell-clear')?.addEventListener('click', () => this.clearCellData(cell, cellIndex));

        const updateImage = this.setupImageUpdate(editor);
        const cellData = this.container.cells[cellIndex];
        if (cellData && cellData.partId && cellData.color) {
            setTimeout(() => updateImage(), 100);
        }

        this.setupPartAutocomplete(editor, updateImage);
        this.setupColorAutocomplete(editor, updateImage);
        this.setupExistingPartsListeners(editor, cell, cellIndex);
        this.setupTabListeners(editor);
    }

    setupPartAutocomplete(editor, updateImage) {
        const partInput = editor.querySelector('#cell-part');
        if (!partInput || !window.brickLinkData?.isLoaded) return;

        this.partAutocomplete = new AutoComplete(partInput, {
            minChars: 2,
            delay: 200,
            placeholder: 'Введите номер или название детали...',
            noResultsText: 'Деталь не найдена',
            showCategories: true,
            source: async (query) => window.brickLinkData.searchParts(query),
            onSelect: async (value) => {
                try {
                    const partData = await window.brickLinkData.getPartById(value);
                    partInput.value = partData ? `${partData.partId} - ${partData.name}` : value;
                } catch {
                    partInput.value = value;
                }
                this.handleCellPartIdChange(value, editor);
                if (updateImage) updateImage();
            }
        });

        partInput.addEventListener('input', (e) => {
            const value = e.target.value;
            const partId = value.includes(' - ') ? value.split(' - ')[0] : value;
            this.handleCellPartIdChange(partId, editor);
            if (updateImage) setTimeout(() => updateImage(), 200);
        });
    }

    setupColorAutocomplete(editor, updateImage) {
        const colorInput = editor.querySelector('#cell-color');
        if (!colorInput || !window.brickLinkData?.isLoaded) return;

        this.colorAutocomplete = new AutoComplete(colorInput, {
            minChars: 0,
            delay: 100,
            placeholder: 'Выберите цвет...',
            noResultsText: 'Цвет не найден',
            source: async (query) => {
                if (this.availableColors && this.availableColors.length > 0) {
                    return this.availableColors
                        .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
                        .map(c => ({ value: c.name, label: c.name, rgb: c.rgb, category: 'Цвета' }));
                }
                return window.brickLinkData.searchColors(query);
            },
            onSelect: (value) => {
                colorInput.value = value;
                this.validateCellSelectedColor(value, editor);
                if (updateImage) updateImage();
            }
        });

        colorInput.addEventListener('input', (e) => this.validateCellSelectedColor(e.target.value, editor));
    }

    setupExistingPartsListeners(editor, cell, cellIndex) {
        editor.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const index = parseInt(e.target.dataset.index);
                const val = e.target.value;
                this.updatePartQuantity(cell, cellIndex, index, val ? parseInt(val) : null);
            });
        });
        editor.querySelectorAll('.btn-remove-part').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.removePartFromCell(cell, cellIndex, parseInt(e.target.dataset.index), editor);
            });
        });
        editor.querySelectorAll('.btn-edit-part').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.editPartInCell(editor, cell, cellIndex, parseInt(e.target.dataset.index));
            });
        });
    }

    setupTabListeners(editor) {
        const tabButtons = editor.querySelectorAll('.tab-btn');
        const tabPanels = editor.querySelectorAll('.tab-panel');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                tabButtons.forEach(b => b.classList.remove('active'));
                tabPanels.forEach(p => p.classList.remove('active'));
                e.target.classList.add('active');
                editor.querySelector(`#tab-${targetTab}`)?.classList.add('active');
            });
        });
    }

    async updatePartQuantity(cell, cellIndex, partIndex, newQuantity) {
        const cellData = this.container.cells[cellIndex];
        if (!cellData) return;

        const items = cellData.items;
        if (items && items[partIndex] !== undefined) {
            items[partIndex].quantity = newQuantity;
            (cellData.type === 'merged' ? cellData : this.container).updatedAt = new Date().toISOString();
        }

        cell.innerHTML = this.view.renderer.renderCellContent(cellData);
        this.view.renderer.handleCellImageFallbacks(cell);
        this._syncContainerToApp();
        await window.app?.autoSave();
    }

    async removePartFromCell(cell, cellIndex, partIndex, editor) {
        const cellData = this.container.cells[cellIndex];
        if (!cellData) return;

        if (cellData.items) {
            cellData.items.splice(partIndex, 1);
            if (cellData.items.length === 0) {
                this.container.cells[cellIndex] = null;
            } else {
                (cellData.type === 'merged' ? cellData : this.container).updatedAt = new Date().toISOString();
            }
        }

        const updatedCellData = this.container.cells[cellIndex];
        cell.innerHTML = this.view.renderer.renderCellContent(updatedCellData);
        this.view.renderer.handleCellImageFallbacks(cell);
        this._syncContainerToApp();
        await window.app?.autoSave();

        if (!updatedCellData) {
            this.closeCellEditor();
        } else {
            const remaining = this._getCellParts(updatedCellData);
            this._updateTabCounter(editor, remaining.length);
            this._updateModalHeader(editor, remaining.length);
            this.openCellEditor(cell);
        }
    }

    async saveCellData(cell, cellIndex, editor) {
        const partValue = editor.querySelector('#cell-part').value.trim();
        const quantityValue = editor.querySelector('#cell-quantity').value;
        const quantity = quantityValue ? parseInt(quantityValue) : null;
        const color = editor.querySelector('#cell-color').value.trim();
        const editingPartIndex = editor.dataset.editingPartIndex;

        if (!partValue) {
            this.showValidationError(editor.querySelector('#cell-part'), 'Деталь обязательна');
            return;
        }
        if (!color) {
            this.showValidationError(editor.querySelector('#cell-color'), 'Цвет обязателен');
            return;
        }
        if (this.availableColors?.length > 0) {
            const isValid = this.availableColors.some(c => c.name.toLowerCase() === color.toLowerCase());
            if (!isValid) {
                this.showValidationError(editor.querySelector('#cell-color'), `Цвет "${color}" недоступен для этой детали. Выберите из доступных цветов.`);
                return;
            }
        }
        if (quantityValue && (quantity < 1 || quantity > 999)) {
            this.showValidationError(editor.querySelector('#cell-quantity'), 'Количество должно быть от 1 до 999');
            return;
        }

        let partId, name;
        if (partValue.includes(' - ')) {
            [partId, name] = partValue.split(' - ', 2);
        } else {
            partId = partValue;
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

        if (editingPartIndex !== undefined) {
            this.updateExistingPart(cellIndex, parseInt(editingPartIndex), newItem);
            delete editor.dataset.editingPartIndex;
            const submitBtn = editor.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.innerHTML = '<span>➕ Добавить деталь</span>';
        } else {
            this.addNewPart(cellIndex, newItem);
        }

        const updatedCellData = this.container.cells[cellIndex];
        cell.innerHTML = this.view.renderer.renderCellContent(updatedCellData);
        this.view.renderer.handleCellImageFallbacks(cell);
        cell.classList.remove('empty', 'editing');
        cell.classList.add('filled');

        editor.querySelector('#cell-part').value = '';
        editor.querySelector('#cell-color').value = '';
        editor.querySelector('#cell-quantity').value = '1';

        const imageEl = editor.querySelector('#part-image');
        const placeholderEl = editor.querySelector('#part-image-placeholder');
        if (imageEl && placeholderEl) {
            imageEl.style.display = 'none';
            placeholderEl.style.display = 'flex';
        }

        if (window.app) {
            await window.app.autoSave();
            const action = editingPartIndex !== undefined ? 'обновлена' : 'добавлена';
            window.app.showNotification(`Деталь "${name}" ${action}!`, 'success');
        }

        this.updateExistingPartsSection(editor, cellIndex);
        this._switchToExistingPartsTab(editor);
    }

    addNewPart(cellIndex, newItem) {
        const existing = this.container.cells[cellIndex];
        if (existing && existing.type === 'merged') {
            if (!existing.items) existing.items = [];
            existing.items.push(newItem);
            existing.updatedAt = new Date().toISOString();
        } else if (!existing) {
            this.container.cells[cellIndex] = { items: [newItem] };
        } else if (existing.items) {
            const idx = existing.items.findIndex(item => item.partId === newItem.partId && item.colorId === newItem.colorId);
            if (idx >= 0) {
                existing.items[idx].quantity += newItem.quantity || 1;
            } else {
                existing.items.push(newItem);
            }
        } else if (existing.partId) {
            this.container.cells[cellIndex] = { items: [{ ...existing }, newItem] };
        } else {
            this.container.cells[cellIndex] = { items: [newItem] };
        }
        this.container.updatedAt = new Date().toISOString();
        this._syncContainerToApp();
    }

    updateExistingPart(cellIndex, partIndex, updatedItem) {
        const cellData = this.container.cells[cellIndex];
        if (!cellData?.items?.[partIndex]) return;
        cellData.items[partIndex] = updatedItem;
        (cellData.type === 'merged' ? cellData : this.container).updatedAt = new Date().toISOString();
    }

    async editPartInCell(editor, cell, cellIndex, partIndex) {
        const cellData = this.container.cells[cellIndex];
        const partData = cellData?.items?.[partIndex];
        if (!partData) return;

        editor.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        editor.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        editor.querySelector('[data-tab="add-new"]')?.classList.add('active');
        editor.querySelector('#tab-add-new')?.classList.add('active');

        editor.querySelector('#cell-part').value = partData.partId;
        editor.querySelector('#cell-color').value = await this.getColorName(partData.colorId);
        editor.querySelector('#cell-quantity').value = partData.quantity || 1;

        const updateImage = this.setupImageUpdate(editor);
        if (updateImage) setTimeout(() => updateImage(), 100);

        editor.dataset.editingPartIndex = partIndex;
        const submitBtn = editor.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.innerHTML = '<span>💾 Сохранить изменения</span>';
    }

    async updateExistingPartsSection(editor, cellIndex) {
        const cellData = this.container.cells[cellIndex];
        const partsList = editor.querySelector('.existing-parts-list');
        if (!partsList || !cellData) return;

        partsList.innerHTML = '<div class="loading">Загрузка деталей...</div>';
        const existingParts = this._getCellParts(cellData);
        partsList.innerHTML = await this._renderExistingParts(existingParts);

        const cell = document.querySelector(`[data-cell-index="${cellIndex}"]`);
        this.setupExistingPartsListeners(editor, cell, cellIndex);
        this.view.renderer.handleCellImageFallbacks(editor);
        this._updateTabCounter(editor, existingParts.length);
        this._updateModalHeader(editor, existingParts.length);
    }

    showValidationError(input, message) {
        this.clearValidationErrors();
        input.classList.add('error');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'validation-error';
        errorDiv.textContent = message;
        input.parentNode.appendChild(errorDiv);
        input.focus();
        input.select();
    }

    clearValidationErrors() {
        const editor = document.querySelector('.cell-editor');
        if (!editor) return;
        editor.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
        editor.querySelectorAll('.validation-error').forEach(el => el.remove());
    }

    async clearCellData(cell, cellIndex) {
        this.container.cells[cellIndex] = null;
        this.container.updatedAt = new Date().toISOString();
        cell.innerHTML = this.view.renderer.renderCellContent(null);
        cell.classList.remove('filled');
        cell.classList.add('empty');
        this.closeCellEditor();
        if (window.app) {
            await window.app.autoSave();
            window.app.showNotification('Ячейка очищена!', 'success');
        }
    }

    closeCellEditor() {
        this.partAutocomplete?.destroy();
        this.partAutocomplete = null;
        this.colorAutocomplete?.destroy();
        this.colorAutocomplete = null;
        document.getElementById('cell-editor-modal')?.remove();
        document.querySelectorAll('.grid-cell.editing').forEach(cell => cell.classList.remove('editing'));
    }

    async generateImageUrl(partId, color) {
        const colorCode = await this.getColorId(color) || '1';
        return `https://img.bricklink.com/ItemImage/PN/${colorCode}/${partId}.png`;
    }

    async getColorId(color) {
        if (!color?.trim() || !window.brickLinkData?.isLoaded) return '0';
        try {
            const colorData = await window.brickLinkData.getColorByName(color);
            return colorData ? colorData.id.toString() : '0';
        } catch {
            return '0';
        }
    }

    async getColorName(colorId) {
        if (!colorId || colorId === '0') return 'Default';
        if (!window.brickLinkData?.isLoaded) return `Color ${colorId}`;
        try {
            const colorData = await window.brickLinkData.getColorById(colorId);
            return colorData ? colorData.name : `Color ${colorId}`;
        } catch {
            return `Color ${colorId}`;
        }
    }

    setupImageUpdate(editor) {
        const partInput = editor.querySelector('#cell-part');
        const colorInput = editor.querySelector('#cell-color');
        const imageElement = editor.querySelector('#part-image');
        const placeholderElement = editor.querySelector('#part-image-placeholder');

        const updateImage = async () => {
            const partValue = partInput.value.trim();
            if (!partValue) {
                this._showImagePlaceholder(imageElement, placeholderElement);
                return;
            }
            const partId = partValue.split(' - ')[0].trim();
            const colorId = colorInput.value.trim() ? await this.getColorId(colorInput.value.trim()) : '0';
            try {
                const imageUrl = this._getPartImageUrl(partId, colorId);
                await this._loadPartImage(imageElement, placeholderElement, imageUrl);
            } catch {
                this._showImagePlaceholder(imageElement, placeholderElement);
            }
        };

        if (partInput.value.trim() && colorInput.value.trim()) {
            updateImage();
        } else {
            this._showImagePlaceholder(imageElement, placeholderElement);
        }

        return updateImage;
    }

    _getPartImageUrl(partId, colorId) {
        return `https://img.bricklink.com/ItemImage/PN/${colorId}/${partId}.png`;
    }

    async _loadPartImage(imageElement, placeholderElement, imageUrl) {
        if (window.imageLoader) {
            return window.imageLoader.loadImageWithFallback(imageUrl, imageElement, placeholderElement, {
                showFallbackIndicator: true,
                fallbackIndicatorText: '⚠️ Цвет',
                onSuccess: (url, isFallback) => {
                    if (isFallback) imageElement.classList.add('fallback-image');
                }
            });
        }
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                imageElement.src = imageUrl;
                imageElement.style.display = 'block';
                placeholderElement.style.display = 'none';
                resolve();
            };
            img.onerror = () => {
                this._showImagePlaceholder(imageElement, placeholderElement);
                resolve();
            };
            img.src = imageUrl;
        });
    }

    _showImagePlaceholder(imageElement, placeholderElement) {
        imageElement.style.display = 'none';
        imageElement.src = '';
        placeholderElement.style.display = 'flex';
        placeholderElement.innerHTML = `
            <div class="placeholder-icon">🖼️</div>
            <div class="placeholder-text">Выберите деталь и цвет</div>
        `;
    }

    async handleCellPartIdChange(partId, editor) {
        const colorInput = editor.querySelector('#cell-color');
        const colorInfo = editor.querySelector('#cell-color-restriction-info');
        if (!colorInput || !colorInfo) return;

        if (!partId?.trim()) {
            colorInput.disabled = true;
            colorInput.placeholder = 'Сначала выберите деталь';
            colorInput.value = '';
            colorInfo.style.display = 'none';
            this.availableColors = [];
            return;
        }

        try {
            colorInput.disabled = true;
            colorInput.placeholder = 'Загрузка доступных цветов...';
            colorInfo.style.display = 'block';
            colorInfo.innerHTML = '<small>⏳ Загрузка доступных цветов...</small>';

            if (window.brickLinkData?.isLoaded) {
                this.availableColors = await window.brickLinkData.getAvailableColorsForPart(partId);
                if (this.availableColors.length > 0) {
                    colorInput.disabled = false;
                    colorInput.placeholder = `Выберите из ${this.availableColors.length} доступных цветов`;
                    colorInfo.innerHTML = `<small>✅ Найдено ${this.availableColors.length} доступных цветов</small>`;
                    this.colorAutocomplete?.destroy();
                    const newUpdateImage = this.setupImageUpdate(editor);
                    this.setupColorAutocomplete(editor, newUpdateImage);
                    if (newUpdateImage) setTimeout(() => newUpdateImage(), 100);
                } else {
                    colorInput.disabled = true;
                    colorInput.placeholder = 'Нет доступных цветов для этой детали';
                    colorInput.value = '';
                    colorInfo.innerHTML = '<small>❌ Нет доступных цветов для этой детали</small>';
                }
            } else {
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

    validateCellSelectedColor(selectedColorName, editor) {
        if (!this.availableColors?.length) return;
        const isValid = this.availableColors.some(c => c.name.toLowerCase() === selectedColorName.toLowerCase());
        const colorInput = editor.querySelector('#cell-color');
        const colorInfo = editor.querySelector('#cell-color-restriction-info');
        if (isValid) {
            colorInput.style.borderColor = '';
            colorInput.style.backgroundColor = '';
            if (colorInfo) {
                colorInfo.innerHTML = `<small>✅ Цвет "${selectedColorName}" доступен для этой детали</small>`;
                colorInfo.className = 'color-restriction-info success';
            }
        } else {
            colorInput.style.borderColor = 'var(--danger-color)';
            colorInput.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
            if (colorInfo) {
                colorInfo.innerHTML = `<small>❌ Цвет "${selectedColorName}" недоступен для этой детали</small>`;
                colorInfo.className = 'color-restriction-info error';
            }
        }
    }

    _getCellParts(cellData) {
        if (!cellData) return [];
        if (cellData.items) return cellData.items;
        if (cellData.partId) return [cellData];
        return [];
    }

    _updateTabCounter(editor, count) {
        const tab = editor.querySelector('[data-tab="existing"]');
        if (tab) tab.textContent = `📦 Текущие детали (${count})`;
    }

    _updateModalHeader(editor, count) {
        const cellPosition = editor.querySelector('.cell-position');
        if (!cellPosition) return;
        const match = cellPosition.textContent.match(/Ячейка (\d+)/);
        if (match) cellPosition.textContent = `Ячейка ${match[1]} • ${count} деталей`;
    }

    _switchToExistingPartsTab(editor) {
        const existingTab = editor.querySelector('[data-tab="existing"]');
        const existingPanel = editor.querySelector('#tab-existing');
        if (!existingTab || !existingPanel) return;
        editor.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        editor.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        existingTab.classList.add('active');
        existingPanel.classList.add('active');
    }

    _syncContainerToApp() {
        if (!window.app) return;
        const idx = window.app.containers.findIndex(c => c.id === this.container.id);
        if (idx > -1) window.app.containers[idx] = this.container;
    }
}
