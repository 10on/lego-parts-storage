// Вид разделения контейнеров
class SplitView {
    constructor() {
        this.leftContainer = null;
        this.rightContainer = null;
    }

    render() {
        const leftPreview = document.getElementById('left-container-preview');
        const rightPreview = document.getElementById('right-container-preview');
        
        if (leftPreview) {
            leftPreview.innerHTML = this.renderContainerPreview(this.leftContainer, 'left');
        }
        
        if (rightPreview) {
            rightPreview.innerHTML = this.renderContainerPreview(this.rightContainer, 'right');
        }

        this.setupEventListeners();
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
                <div class="container-grid-preview">
                    ${this.renderGridPreview(container)}
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

    calculateContainerStats(container) {
        const totalCells = container.rows * container.cols;
        const filledCells = container.cells.filter(cell => cell !== null).length;
        
        return {
            totalCells,
            filledCells
        };
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
}
