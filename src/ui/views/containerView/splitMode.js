class SplitMode {
    constructor(containerView) {
        this.view = containerView;
        this.isSplitMode = false;
    }

    get container() { return this.view.container; }

    toggleSplitMode() {
        this.isSplitMode = !this.isSplitMode;
        if (this.isSplitMode) {
            this.startSplitMode();
        } else {
            this.cancelSplitMode();
        }
    }

    startSplitMode() {
        const splitBtn = document.getElementById('split-cells-btn');
        if (splitBtn) {
            splitBtn.textContent = '❌ Отменить разбивание';
            splitBtn.classList.remove('btn-outline');
            splitBtn.classList.add('btn-danger');
        }
        document.getElementById('container-view')?.classList.add('split-mode');
        this.updateSplitModeCursors();
    }

    cancelSplitMode() {
        this.isSplitMode = false;
        document.getElementById('container-view')?.classList.remove('split-mode');
        const splitBtn = document.getElementById('split-cells-btn');
        if (splitBtn) {
            splitBtn.textContent = '✂️ Разбить ячейки';
            splitBtn.classList.add('btn-outline');
            splitBtn.classList.remove('btn-danger');
        }
        document.querySelectorAll('.grid-cell.merged').forEach(cell => {
            cell.classList.remove('split-selectable');
        });
    }

    updateSplitModeCursors() {
        document.querySelectorAll('.grid-cell.merged').forEach(cell => {
            cell.classList.toggle('split-selectable', this.isSplitMode);
        });
    }

    splitMergedCell(cell) {
        const cellIndex = parseInt(cell.dataset.cellIndex);
        const cellData = this.container.cells[cellIndex];
        if (!cellData || cellData.type !== 'merged') return;
        if (window.confirm(`Разбить объединенную ячейку на ${cellData.cellCount} отдельных ячеек?`)) {
            this.performSplit(cellIndex, cellData);
        }
    }

    performSplit(startIndex, mergedCellData) {
        const { cellCount, items } = mergedCellData;
        const itemsPerCell = Math.ceil(items.length / cellCount);
        for (let i = 0; i < cellCount; i++) {
            const cellIndex = startIndex + i;
            const cellItems = items.slice(i * itemsPerCell, Math.min((i + 1) * itemsPerCell, items.length));
            if (cellItems.length > 0) {
                this.container.cells[cellIndex] = {
                    partId: cellItems[0].partId,
                    name: cellItems[0].name,
                    color: cellItems[0].color,
                    quantity: cellItems.reduce((sum, item) => sum + item.quantity, 0),
                    image: cellItems[0].image,
                    items: cellItems
                };
            } else {
                this.container.cells[cellIndex] = null;
            }
        }
        this.view.renderGrid();
        this.cancelSplitMode();
        window.app?.showNotification('Ячейка успешно разбита!', 'success');
        window.app?.autoSave();
    }
}
