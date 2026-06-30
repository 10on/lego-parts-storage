class CellDragDrop {
    constructor(containerView) {
        this.view = containerView;
        this.dragSourceIndex = null;
    }

    get container() { return this.view.container; }

    setupCellDragDrop(cell, index) {
        cell.draggable = true;

        cell.addEventListener('dragstart', (e) => {
            this.dragSourceIndex = index;
            e.dataTransfer.setData('application/json', JSON.stringify({
                type: 'cell',
                containerId: this.container.id,
                cellIndex: index,
            }));
            e.dataTransfer.effectAllowed = 'move';
            requestAnimationFrame(() => cell.classList.add('dragging'));
        });

        cell.addEventListener('dragend', () => {
            cell.classList.remove('dragging');
            this.dragSourceIndex = null;
            document.querySelectorAll('.grid-cell.drop-target').forEach(c => c.classList.remove('drop-target'));
        });

        cell.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (this.dragSourceIndex !== index) {
                cell.classList.add('drop-target');
            }
        });

        cell.addEventListener('dragleave', (e) => {
            if (!cell.contains(e.relatedTarget)) {
                cell.classList.remove('drop-target');
            }
        });

        cell.addEventListener('dragover', (e) => { e.preventDefault(); });

        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.classList.remove('drop-target');
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
            this.handleCellSwap(dropData, targetCellIndex);
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

    handleCellSwap(dropData, targetCellIndex) {
        if (dropData.containerId !== this.container.id) return;
        if (dropData.cellIndex === targetCellIndex) return;

        const sourceIndex = dropData.cellIndex;
        const sourceData = this.container.cells[sourceIndex] ?? null;
        const targetData = this.container.cells[targetCellIndex] ?? null;

        this.container.cells[sourceIndex] = targetData;
        this.container.cells[targetCellIndex] = sourceData;

        this.view.renderGrid();
        window.app?.autoSave();
    }
}
