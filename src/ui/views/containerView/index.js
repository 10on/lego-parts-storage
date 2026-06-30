class ContainerView {
    constructor() {
        this.container = null;
        this.isEditing = false;
        this.selectedCells = new Set();

        this.renderer = new CellRenderer();
        this.editor = new CellEditor(this);
        this.mergeMode = new MergeMode(this);
        this.splitMode = new SplitMode(this);
        this.dragDrop = new CellDragDrop(this);
    }

    setContainer(container) {
        this.container = container;
        this.render();
    }

    render() {
        if (!this.container) return;
        const title = document.getElementById('container-title');
        if (title) title.textContent = this.container.name;
        this.renderGrid();
        this.setupEventListeners();
    }

    renderGrid() {
        const grid = document.getElementById('container-grid');
        if (!grid || !this.container) return;

        const { rows, cols, cells } = this.container;
        grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        grid.innerHTML = '';

        for (let i = 0; i < rows * cols; i++) {
            if (this.renderer.isCellPartOfMerge(i, cells)) continue;
            grid.appendChild(this.createCell(i, cells[i]));
        }

        this.splitMode.updateSplitModeCursors();
    }

    createCell(index, cellData) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.cellIndex = index;

        if (cellData) {
            cell.innerHTML = this.renderer.renderCellContent(cellData);
            if (cellData.type === 'merged') {
                cell.classList.add('merged');
                this.renderer.applyMergedCellStyles(cell, cellData, index, this.container.cols);
                cell.classList.add(!cellData.items || cellData.items.length === 0 ? 'empty' : 'filled');
            } else {
                cell.classList.add('filled');
            }
        } else {
            cell.classList.add('empty');
        }

        this.renderer.handleCellImageFallbacks(cell);
        cell.addEventListener('click', (e) => this.handleCellClick(e, cell));
        cell.addEventListener('dblclick', (e) => this.handleCellDoubleClick(e, cell));
        this.dragDrop.setupCellDragDrop(cell, index);

        return cell;
    }

    setupEventListeners() {
        this._rebind('edit-mode-btn', () => this.toggleEditMode());
        this._rebind('save-container-btn', () => this.saveContainer());
        this._rebind('back-to-home', () => { window.location.hash = 'home'; });
        this._rebind('merge-cells-btn', () => this.mergeMode.toggleMergeMode());
        this._rebind('split-cells-btn', () => this.splitMode.toggleSplitMode());
        this._rebind('confirm-merge-btn', () => this.mergeMode.confirmMerge());
        this._rebind('cancel-merge-btn', () => this.mergeMode.cancelMerge());
    }

    _rebind(id, handler) {
        const el = document.getElementById(id);
        if (!el) return;
        const clone = el.cloneNode(true);
        el.parentNode.replaceChild(clone, el);
        clone.addEventListener('click', handler);
    }

    handleCellClick(e, cell) {
        if (this.splitMode.isSplitMode) {
            this.splitMode.splitMergedCell(cell);
        } else if (this.mergeMode.isMergeMode) {
            this.mergeMode.toggleMergeCellSelection(cell);
        } else if (this.isEditing) {
            this.toggleCellSelection(cell);
        } else {
            this.editor.openCellEditor(cell);
        }
    }

    handleCellDoubleClick(e, cell) {
        this.editor.openCellEditor(cell);
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

    toggleEditMode() {
        this.isEditing = !this.isEditing;
        const editBtn = document.getElementById('edit-mode-btn');
        if (this.isEditing) {
            editBtn.textContent = 'Выйти из редактирования';
            editBtn.classList.add('active');
            document.querySelectorAll('.grid-cell').forEach(cell => cell.classList.add('editable'));
        } else {
            editBtn.textContent = 'Режим редактирования';
            editBtn.classList.remove('active');
            document.querySelectorAll('.grid-cell').forEach(cell => cell.classList.remove('editable', 'selected'));
            this.selectedCells.clear();
        }
    }

    async saveContainer() {
        if (!window.app) return;
        const idx = window.app.containers.findIndex(c => c.id === this.container.id);
        if (idx > -1) {
            this.container.updatedAt = new Date().toISOString();
            window.app.containers[idx] = this.container;
            await window.app.autoSave();
        }
        window.app.showNotification('Контейнер сохранен!', 'success');
    }

    updateGridSize() {
        if (this.container) this.renderGrid();
    }
}
