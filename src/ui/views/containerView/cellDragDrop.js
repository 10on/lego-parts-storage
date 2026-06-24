class CellDragDrop {
    constructor(containerView) {
        this.view = containerView;
    }

    get container() { return this.view.container; }

    setupCellDragDrop(cell, cellData, index) {
        cell.draggable = true;
        cell.style.cursor = 'grab';

        cell.addEventListener('dragstart', (e) => {
            const dragData = {
                type: 'cell',
                containerId: this.container.id,
                cellIndex: index,
                cellData,
                parts: cellData.items || [],
                totalQuantity: cellData.items ? cellData.items.reduce((sum, item) => sum + item.quantity, 0) : 0
            };
            e.dataTransfer.setData('application/json', JSON.stringify(dragData));
            e.dataTransfer.effectAllowed = 'move';
            cell.style.opacity = '0.5';
        });

        cell.addEventListener('dragend', () => { cell.style.opacity = '1'; });
        cell.addEventListener('dragenter', (e) => e.preventDefault());
        cell.addEventListener('dragover', (e) => e.preventDefault());
        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            const data = e.dataTransfer.getData('application/json');
            if (!data) return;
            try {
                this.handleCellDrop(JSON.parse(data), index);
            } catch (error) {
                console.error('Ошибка при обработке drop:', error);
            }
        });
    }

    handleCellDrop(dropData, targetCellIndex) {
        if (dropData.type !== 'cell') return;
        if (dropData.source === 'buffer') {
            this.handleBufferToCellDrop(dropData, targetCellIndex);
        } else {
            this.handleCellToCellDrop(dropData, targetCellIndex);
        }
    }

    handleBufferToCellDrop(dropData, targetCellIndex) {
        const targetCell = this.container.cells[targetCellIndex];
        if (!targetCell) {
            this.container.cells[targetCellIndex] = { type: 'single', items: dropData.parts };
        } else {
            if (!targetCell.items) targetCell.items = [];
            targetCell.items.push(...dropData.parts);
        }
        this.view.renderGrid();
        window.app?.views?.split?.removeFromBuffer(dropData.bufferIndex);
        window.app?.showNotification('Содержимое перемещено из буфера', 'success');
        window.app?.autoSave();
    }

    handleCellToCellDrop(dropData, targetCellIndex) {
        if (dropData.containerId === this.container.id && dropData.cellIndex === targetCellIndex) return;
        const sourceCell = this.container.cells[dropData.cellIndex];
        if (!sourceCell || !sourceCell.items) return;

        const targetCell = this.container.cells[targetCellIndex];
        if (!targetCell) {
            this.container.cells[targetCellIndex] = { type: 'single', items: [...sourceCell.items] };
        } else {
            if (!targetCell.items) targetCell.items = [];
            targetCell.items.push(...sourceCell.items);
        }
        this.container.cells[dropData.cellIndex] = null;
        this.view.renderGrid();
        window.app?.showNotification('Содержимое перемещено между ячейками', 'success');
        window.app?.autoSave();
    }
}
