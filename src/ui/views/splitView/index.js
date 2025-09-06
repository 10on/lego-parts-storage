// Вид перестановки контейнеров
class SplitView {
    constructor() {
        this.leftContainer = null;
        this.rightContainer = null;
        this.cellBuffer = [];
        this.selectedContainers = new Set();
        this.selectedCell = null; // {containerId, cellIndex, side}
    }

    render() {
        const leftPreview = document.getElementById('left-container-preview');
        const rightPreview = document.getElementById('right-container-preview');
        const cellBuffer = document.getElementById('cell-buffer');
        const containersGrid = document.getElementById('containers-grid');
        
        if (leftPreview) {
            leftPreview.innerHTML = this.renderContainerPreview(this.leftContainer, 'left');
            // Устанавливаем CSS переменную для левой панели
            if (this.leftContainer) {
                const leftGrid = document.querySelector('.container-grid-full[data-side="left"]');
                if (leftGrid) {
                    leftGrid.style.setProperty('--left-cols', this.leftContainer.cols);
                }
            }
        }
        
        if (rightPreview) {
            rightPreview.innerHTML = this.renderContainerPreview(this.rightContainer, 'right');
            // Устанавливаем CSS переменную для правой панели
            if (this.rightContainer) {
                const rightGrid = document.querySelector('.container-grid-full[data-side="right"]');
                if (rightGrid) {
                    rightGrid.style.setProperty('--right-cols', this.rightContainer.cols);
                }
            }
        }

        if (cellBuffer) {
            cellBuffer.innerHTML = this.renderCellBuffer();
        }

        if (containersGrid) {
            containersGrid.innerHTML = this.renderContainersList();
        }

        this.setupEventListeners();
        
        // Настройка клик-системы после рендеринга
        setTimeout(() => {
            this.setupClickSystem();
        }, 100);
    }

    renderContainerPreview(container, side) {
        if (!container) {
            return `
                <div class="empty-container-preview">
                    <p>Выберите контейнер</p>
                    <button class="btn btn-outline" data-action="select" data-side="${side}">
                        Выбрать контейнер
                    </button>
                </div>
            `;
        }

        const stats = this.calculateContainerStats(container);
        
        return `
            <div class="container-preview-content">
                <h4>${container.name}</h4>
                <div class="container-stats">
                    <div class="stat">
                        <span class="stat-label">Размер:</span>
                        <span class="stat-value">${container.rows}×${container.cols}</span>
                    </div>
                    <div class="stat">
                        <span class="stat-label">Заполнено:</span>
                        <span class="stat-value">${stats.filledCells}/${stats.totalCells}</span>
                    </div>
                </div>
                <div class="container-grid-full" data-side="${side}">
                    ${this.renderFullGrid(container, side)}
                </div>
                <button class="btn btn-outline btn-sm" data-action="change" data-side="${side}">
                    Изменить
                </button>
            </div>
        `;
    }

    renderGridPreview(container) {
        const { rows, cols, cells } = container;
        const previewSize = Math.min(rows, cols, 6); // Ограничиваем размер превью
        
        let html = '';
        for (let i = 0; i < previewSize * previewSize; i++) {
            const cell = cells[i];
            const isEmpty = !cell;
            html += `<div class="grid-cell-preview ${isEmpty ? 'empty' : 'filled'}"></div>`;
        }
        
        return html;
    }

    renderFullGrid(container, side) {
        const { rows, cols, cells } = container;
        
        let html = '';
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const cellIndex = row * cols + col;
                const cell = cells[cellIndex];
                const isEmpty = !cell || !cell.items || cell.items.length === 0;
                
                const isSelected = this.selectedCell && 
                    this.selectedCell.containerId === container.id && 
                    this.selectedCell.cellIndex === cellIndex;
                
                html += `
                    <div class="grid-cell-split ${isEmpty ? 'empty' : 'filled'} ${isSelected ? 'selected' : ''}" 
                         data-cell-index="${cellIndex}" 
                         data-side="${side}"
                         data-container-id="${container.id}">
                        ${this.renderCellContent(cell, cellIndex)}
                    </div>
                `;
            }
        }
        
        return html;
    }

    renderCellContent(cell, cellIndex) {
        if (!cell || !cell.items || cell.items.length === 0) {
            return '<div class="cell-empty">+</div>';
        }

        const totalQuantity = cell.items.reduce((sum, item) => sum + item.quantity, 0);
        const partNames = cell.items.map(item => item.name).join(', ');
        
        return `
            <div class="cell-content">
                <div class="cell-parts">${partNames}</div>
                <div class="cell-quantity">${totalQuantity}</div>
            </div>
        `;
    }

    calculateContainerStats(container) {
        const totalCells = container.rows * container.cols;
        const filledCells = container.cells.filter(cell => cell !== null).length;
        
        return {
            totalCells,
            filledCells
        };
    }

    renderCellBuffer() {
        if (this.cellBuffer.length === 0) {
            return '<div class="buffer-empty"><p>Кликните на ячейку, затем сюда для перемещения в буфер</p></div>';
        }

        return this.cellBuffer.map((cellData, index) => {
            const isSelected = this.selectedCell && 
                this.selectedCell.source === 'buffer' && 
                this.selectedCell.bufferIndex === index;
            
            // Безопасная обработка данных ячейки
            const parts = cellData.parts || cellData.items || [];
            const partNames = parts.map(part => part.name || part).join(', ');
            const totalQuantity = cellData.totalQuantity || (parts.reduce((sum, item) => sum + (item.quantity || 0), 0));
            
            return `
                <div class="buffer-cell ${isSelected ? 'selected' : ''}" data-buffer-index="${index}">
                    <div class="cell-parts">${partNames}</div>
                    <div class="cell-quantity">${totalQuantity}</div>
                    <button class="remove-btn" data-action="remove-from-buffer" data-index="${index}">×</button>
                </div>
            `;
        }).join('');
    }

    renderContainersList() {
        const containers = window.app?.containers || [];
        
        if (containers.length === 0) {
            return '<p style="text-align: center; color: var(--text-muted); font-style: italic;">Нет доступных контейнеров</p>';
        }

        return containers.map(container => {
            const stats = this.calculateContainerStats(container);
            const isSelected = this.selectedContainers.has(container.id);
            
            return `
                <div class="container-card ${isSelected ? 'selected' : ''}" data-container-id="${container.id}">
                    <h4>${container.name}</h4>
                    <p>${container.type} • ${container.rows}×${container.cols}</p>
                    <div class="container-stats">
                        Заполнено: ${stats.filledCells}/${stats.totalCells}
                    </div>
                    <div class="container-preview-mini">
                        ${this.renderMiniGrid(container)}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderMiniGrid(container) {
        const { rows, cols, cells } = container;
        const miniSize = Math.min(rows, cols, 4);
        let html = '';
        
        for (let i = 0; i < miniSize * miniSize; i++) {
            const cell = cells[i];
            const isEmpty = !cell;
            html += `<div class="mini-cell ${isEmpty ? '' : 'filled'}"></div>`;
        }
        
        return html;
    }

    setupEventListeners() {
        // Кнопки выбора контейнеров
        document.querySelectorAll('[data-action="select"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const side = e.target.dataset.side;
                this.showContainerSelector(side);
            });
        });

        document.querySelectorAll('[data-action="change"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const side = e.target.dataset.side;
                this.showContainerSelector(side);
            });
        });

        // Кнопки в заголовке
        const selectLeftBtn = document.getElementById('select-left-container');
        const selectRightBtn = document.getElementById('select-right-container');
        const clearBufferBtn = document.getElementById('clear-buffer-btn');
        
        if (selectLeftBtn) {
            selectLeftBtn.addEventListener('click', () => {
                this.showContainerSelector('left');
            });
        }
        
        if (selectRightBtn) {
            selectRightBtn.addEventListener('click', () => {
                this.showContainerSelector('right');
            });
        }

        if (clearBufferBtn) {
            clearBufferBtn.addEventListener('click', () => {
                this.clearBuffer();
            });
        }

        // Выбор контейнеров из списка
        document.querySelectorAll('.container-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const containerId = card.dataset.containerId;
                this.toggleContainerSelection(containerId);
            });
        });

        // Удаление из буфера
        document.querySelectorAll('[data-action="remove-from-buffer"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(e.target.dataset.index);
                this.removeFromBuffer(index);
            });
        });

    }

    showContainerSelector(side) {
        const containers = window.app?.containers || [];
        
        if (containers.length === 0) {
            alert('Нет доступных контейнеров');
            return;
        }

        const content = `
            <div class="container-selector">
                <h4>Выберите контейнер для ${side === 'left' ? 'левой' : 'правой'} панели</h4>
                <div class="containers-list">
                    ${containers.map(container => `
                        <div class="container-option" data-container-id="${container.id}">
                            <h5>${container.name}</h5>
                            <p>${container.type} • ${container.rows}×${container.cols}</p>
                            <div class="container-stats">
                                <span>Заполнено: ${this.calculateContainerStats(container).filledCells}/${this.calculateContainerStats(container).totalCells}</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        if (window.app) {
            window.app.showModal(`Выбор контейнера (${side === 'left' ? 'левая' : 'правая'} панель)`, content);
            
            document.querySelectorAll('.container-option').forEach(option => {
                option.addEventListener('click', () => {
                    const containerId = option.dataset.containerId;
                    this.selectContainer(side, containerId);
                });
            });
        }
    }

    selectContainer(side, containerId) {
        const container = window.app?.containers.find(c => c.id === containerId);
        
        if (container) {
            if (side === 'left') {
                this.leftContainer = container;
            } else {
                this.rightContainer = container;
            }
            
            this.render();
            
            if (window.app) {
                window.app.hideModal();
                window.app.showNotification(`Контейнер "${container.name}" выбран для ${side === 'left' ? 'левой' : 'правой'} панели`, 'success');
            }
        }
    }

    toggleContainerSelection(containerId) {
        if (this.selectedContainers.has(containerId)) {
            this.selectedContainers.delete(containerId);
        } else {
            this.selectedContainers.add(containerId);
        }
        this.render();
    }

    addToBuffer(cellData) {
        // Нормализуем данные ячейки для буфера
        const normalizedCellData = {
            parts: cellData.items || cellData.parts || [],
            totalQuantity: cellData.items ? 
                cellData.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 
                (cellData.totalQuantity || 0),
            originalData: cellData // Сохраняем оригинальные данные
        };
        
        this.cellBuffer.push(normalizedCellData);
        this.render();
    }

    removeFromBuffer(index) {
        if (index >= 0 && index < this.cellBuffer.length) {
            this.cellBuffer.splice(index, 1);
            this.render();
        }
    }

    clearBuffer() {
        this.cellBuffer = [];
        this.render();
        if (window.app) {
            window.app.showNotification('Буфер очищен', 'success');
        }
    }

    setupClickSystem() {
        const splitView = document.getElementById('split-view');
        if (!splitView) return;

        // Удаляем старые обработчики, если они есть
        if (this.clickHandler) {
            splitView.removeEventListener('click', this.clickHandler);
        }
        if (this.bufferClickHandler) {
            const buffer = document.getElementById('cell-buffer');
            if (buffer) {
                buffer.removeEventListener('click', this.bufferClickHandler);
            }
        }

        // Создаем новые обработчики
        this.clickHandler = (e) => {
            // Ищем ближайшую ячейку (может быть клик по дочернему элементу)
            const cellElement = e.target.closest('.grid-cell-split');
            if (cellElement) {
                this.handleCellClick(cellElement);
            }
        };

        this.bufferClickHandler = (e) => {
            if (e.target.classList.contains('buffer-empty') || e.target.closest('.buffer-empty')) {
                this.handleBufferClick();
            } else if (e.target.classList.contains('buffer-cell') || e.target.closest('.buffer-cell')) {
                this.handleBufferCellClick(e.target.closest('.buffer-cell'));
            }
        };

        // Добавляем обработчики
        splitView.addEventListener('click', this.clickHandler);

        const buffer = document.getElementById('cell-buffer');
        if (buffer) {
            buffer.addEventListener('click', this.bufferClickHandler);
        }
    }

    handleCellClick(cellElement) {
        const cellIndex = parseInt(cellElement.dataset.cellIndex);
        const containerId = cellElement.dataset.containerId;
        const side = cellElement.dataset.side;
        
        // Проверяем, есть ли в ячейке содержимое
        const container = window.app?.containers.find(c => c.id === containerId);
        const hasContent = container && container.cells[cellIndex] && container.cells[cellIndex].items && container.cells[cellIndex].items.length > 0;
        
        if (hasContent) {
            // Заполненная ячейка
            if (this.selectedCell) {
                // Есть выделенная ячейка - обмениваем содержимое
                this.swapCells(cellIndex, containerId, side);
            } else {
                // Нет выделенной ячейки - выделяем эту
                this.selectCell(cellIndex, containerId, side);
            }
        } else {
            // Пустая ячейка - пытаемся поместить туда выделенное содержимое
            if (this.selectedCell) {
                this.moveToCell(cellIndex, containerId, side);
            }
        }
    }

    handleBufferClick() {
        if (this.selectedCell) {
            // Перемещаем выделенную ячейку в буфер
            this.moveToBuffer();
        }
    }

    handleBufferCellClick(bufferCellElement) {
        const bufferIndex = parseInt(bufferCellElement.dataset.bufferIndex);
        const cellData = this.cellBuffer[bufferIndex];
        
        if (this.selectedCell) {
            // Есть выделенная ячейка - обмениваем содержимое
            this.swapWithBuffer(bufferIndex);
        } else {
            // Нет выделенной ячейки - выделяем ячейку из буфера
            this.selectBufferCell(bufferIndex);
        }
    }

    selectBufferCell(bufferIndex) {
        this.selectedCell = { bufferIndex, source: 'buffer' };
        this.render();
        
        if (window.app) {
            window.app.showNotification('Ячейка из буфера выделена. Кликните на другую ячейку для перемещения', 'info');
        }
    }

    swapWithBuffer(bufferIndex) {
        if (!this.selectedCell || this.selectedCell.source === 'buffer') return;

        const container = window.app?.containers.find(c => c.id === this.selectedCell.containerId);
        if (!container) return;

        const sourceCell = container.cells[this.selectedCell.cellIndex];
        const bufferCell = this.cellBuffer[bufferIndex];
        
        if (!sourceCell) return;

        // Обмениваем содержимое
        container.cells[this.selectedCell.cellIndex] = bufferCell;
        this.cellBuffer[bufferIndex] = sourceCell;
        
        // Снимаем выделение
        this.selectedCell = null;
        this.render();

        if (window.app) {
            window.app.showNotification('Содержимое обменяно с буфером', 'success');
            window.app.autoSave();
        }
    }

    selectCell(cellIndex, containerId, side) {
        this.selectedCell = { cellIndex, containerId, side };
        this.render();
        
        if (window.app) {
            window.app.showNotification('Ячейка выделена. Кликните на буфер или другую ячейку для перемещения', 'info');
        }
    }

    moveToBuffer() {
        if (!this.selectedCell) return;

        const container = window.app?.containers.find(c => c.id === this.selectedCell.containerId);
        if (!container || !container.cells[this.selectedCell.cellIndex]) return;

        const cellData = container.cells[this.selectedCell.cellIndex];
        this.addToBuffer(cellData);
        
        // Очищаем исходную ячейку
        container.cells[this.selectedCell.cellIndex] = null;
        
        // Снимаем выделение
        this.selectedCell = null;
        this.render();

        if (window.app) {
            window.app.showNotification('Содержимое перемещено в буфер', 'success');
            window.app.autoSave();
        }
    }

    moveToCell(targetCellIndex, targetContainerId, targetSide) {
        if (!this.selectedCell) return;

        const targetContainer = window.app?.containers.find(c => c.id === targetContainerId);
        if (!targetContainer) return;

        let sourceCell;
        
        if (this.selectedCell.source === 'buffer') {
            // Перемещение из буфера
            const bufferCell = this.cellBuffer[this.selectedCell.bufferIndex];
            if (!bufferCell) return;
            
            // Используем оригинальные данные или создаем из parts
            const sourceCell = bufferCell.originalData || {
                type: 'single',
                items: bufferCell.parts
            };
            
            // Добавляем в целевую ячейку
            if (!targetContainer.cells[targetCellIndex]) {
                targetContainer.cells[targetCellIndex] = {
                    type: 'single',
                    items: [...sourceCell.items]
                };
            } else {
                if (!targetContainer.cells[targetCellIndex].items) {
                    targetContainer.cells[targetCellIndex].items = [];
                }
                targetContainer.cells[targetCellIndex].items.push(...sourceCell.items);
            }
            
            // Удаляем из буфера
            this.cellBuffer.splice(this.selectedCell.bufferIndex, 1);
            
        } else {
            // Перемещение из контейнера
            const sourceContainer = window.app?.containers.find(c => c.id === this.selectedCell.containerId);
            if (!sourceContainer) return;
            
            sourceCell = sourceContainer.cells[this.selectedCell.cellIndex];
            if (!sourceCell) return;

            // Добавляем в целевую ячейку
            if (!targetContainer.cells[targetCellIndex]) {
                targetContainer.cells[targetCellIndex] = {
                    type: 'single',
                    items: [...sourceCell.items]
                };
            } else {
                if (!targetContainer.cells[targetCellIndex].items) {
                    targetContainer.cells[targetCellIndex].items = [];
                }
                targetContainer.cells[targetCellIndex].items.push(...sourceCell.items);
            }

            // Очищаем исходную ячейку
            sourceContainer.cells[this.selectedCell.cellIndex] = null;
        }
        
        // Снимаем выделение
        this.selectedCell = null;
        this.render();

        if (window.app) {
            window.app.showNotification('Содержимое перемещено', 'success');
            window.app.autoSave();
        }
    }

    swapCells(targetCellIndex, targetContainerId, targetSide) {
        if (!this.selectedCell) return;

        const sourceContainer = window.app?.containers.find(c => c.id === this.selectedCell.containerId);
        const targetContainer = window.app?.containers.find(c => c.id === targetContainerId);
        
        if (!sourceContainer || !targetContainer) return;

        const sourceCell = sourceContainer.cells[this.selectedCell.cellIndex];
        const targetCell = targetContainer.cells[targetCellIndex];
        
        if (!sourceCell) return;

        // Обмениваем содержимое
        sourceContainer.cells[this.selectedCell.cellIndex] = targetCell;
        targetContainer.cells[targetCellIndex] = sourceCell;
        
        // Снимаем выделение
        this.selectedCell = null;
        this.render();

        if (window.app) {
            window.app.showNotification('Содержимое ячеек обменяно', 'success');
            window.app.autoSave();
        }
    }

}
