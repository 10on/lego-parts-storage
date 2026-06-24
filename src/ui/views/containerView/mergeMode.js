class MergeMode {
    constructor(containerView) {
        this.view = containerView;
        this.isMergeMode = false;
        this.mergeSelectedCells = new Set();
    }

    get container() { return this.view.container; }

    toggleMergeMode() {
        this.isMergeMode = !this.isMergeMode;
        if (this.isMergeMode) {
            this.startMergeMode();
        } else {
            this.cancelMerge();
        }
    }

    startMergeMode() {
        this.mergeSelectedCells.clear();
        document.getElementById('merge-controls')?.classList.remove('hidden');
        document.getElementById('container-view')?.classList.add('merge-mode');
        const mergeBtn = document.getElementById('merge-cells-btn');
        if (mergeBtn) {
            mergeBtn.textContent = '❌ Отменить объединение';
            mergeBtn.classList.remove('btn-outline');
            mergeBtn.classList.add('btn-danger');
        }
        this.updateMergeControls();
    }

    cancelMerge() {
        this.isMergeMode = false;
        this.mergeSelectedCells.clear();
        document.getElementById('merge-controls')?.classList.add('hidden');
        document.getElementById('container-view')?.classList.remove('merge-mode');
        const mergeBtn = document.getElementById('merge-cells-btn');
        if (mergeBtn) {
            mergeBtn.textContent = '🔗 Объединить ячейки';
            mergeBtn.classList.add('btn-outline');
            mergeBtn.classList.remove('btn-danger');
        }
        document.querySelectorAll('.grid-cell').forEach(cell => {
            cell.classList.remove('merge-selectable', 'merge-selected', 'merge-invalid');
        });
    }

    toggleMergeCellSelection(cell) {
        const cellIndex = parseInt(cell.dataset.cellIndex);
        if (this.mergeSelectedCells.has(cellIndex)) {
            this.mergeSelectedCells.delete(cellIndex);
            cell.classList.remove('merge-selected');
        } else if (this.canAddToMergeSelection(cellIndex)) {
            this.mergeSelectedCells.add(cellIndex);
            cell.classList.remove('merge-invalid');
            cell.classList.add('merge-selected');
        } else {
            cell.classList.add('merge-invalid');
            setTimeout(() => cell.classList.remove('merge-invalid'), 1000);
        }
        this.updateMergeControls();
    }

    canAddToMergeSelection(cellIndex) {
        if (this.mergeSelectedCells.size === 0) return true;
        const { cols } = this.container;
        const currentRow = Math.floor(cellIndex / cols);
        const currentCol = cellIndex % cols;
        for (const selectedIndex of this.mergeSelectedCells) {
            const selectedRow = Math.floor(selectedIndex / cols);
            const selectedCol = selectedIndex % cols;
            const isSameRow = currentRow === selectedRow;
            const isSameCol = currentCol === selectedCol;
            if (!isSameRow && !isSameCol) return false;
            if (isSameRow && Math.abs(currentCol - selectedCol) === 1) return true;
            if (isSameCol && Math.abs(currentRow - selectedRow) === 1) return true;
        }
        return false;
    }

    updateMergeControls() {
        const countElement = document.getElementById('selected-cells-count');
        const confirmBtn = document.getElementById('confirm-merge-btn');
        if (countElement) countElement.textContent = this.mergeSelectedCells.size;
        if (confirmBtn) confirmBtn.disabled = this.mergeSelectedCells.size < 2;
        document.querySelectorAll('.grid-cell').forEach(cell => {
            if (this.isMergeMode) {
                cell.classList.add('merge-selectable');
            } else {
                cell.classList.remove('merge-selectable', 'merge-selected', 'merge-invalid');
            }
        });
    }

    confirmMerge() {
        if (this.mergeSelectedCells.size < 2) return;
        const mergedCell = this.createMergedCell(Array.from(this.mergeSelectedCells));
        this.updateContainerForMerge(Array.from(this.mergeSelectedCells), mergedCell);
        this.view.renderGrid();
        this.cancelMerge();
        window.app?.showNotification('Ячейки успешно объединены!', 'success');
        window.app?.autoSave();
    }

    createMergedCell(cellIndices) {
        const { cols } = this.container;
        const sortedIndices = [...cellIndices].sort((a, b) => a - b);
        const firstIndex = sortedIndices[0];
        const lastIndex = sortedIndices[sortedIndices.length - 1];
        const isHorizontal = Math.floor(firstIndex / cols) === Math.floor(lastIndex / cols);
        const isVertical = (firstIndex % cols) === (lastIndex % cols);
        if (!isHorizontal && !isVertical) throw new Error('Cells must be in the same row or column');

        const allItems = [];
        for (const index of sortedIndices) {
            const cellData = this.container.cells[index];
            if (cellData) {
                if (cellData.items) {
                    allItems.push(...cellData.items);
                } else if (cellData.partId) {
                    allItems.push({ partId: cellData.partId, name: cellData.name, color: cellData.color, quantity: cellData.quantity, image: cellData.image });
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
        const sortedIndices = [...cellIndices].sort((a, b) => a - b);
        this.container.cells[sortedIndices[0]] = mergedCell;
        for (let i = 1; i < sortedIndices.length; i++) {
            this.container.cells[sortedIndices[i]] = null;
        }
        this.container.updatedAt = new Date().toISOString();
    }
}
