// Drag & Drop функциональность
class DragDropManager {
    constructor() {
        this.draggedElement = null;
        this.dropTarget = null;
        this.isDragging = false;
        this.init();
    }

    init() {
        this.setupGlobalListeners();
    }

    setupGlobalListeners() {
        // Предотвращаем стандартное поведение drag & drop
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
        });

        // Обработка завершения перетаскивания
        document.addEventListener('dragend', (e) => {
            this.handleDragEnd(e);
        });
    }

    // Настройка элемента для перетаскивания
    makeDraggable(element, data) {
        element.draggable = true;
        element.dataset.dragData = JSON.stringify(data);
        
        element.addEventListener('dragstart', (e) => {
            this.handleDragStart(e, data);
        });

        element.addEventListener('dragend', (e) => {
            this.handleDragEnd(e);
        });
    }

    // Настройка элемента как цели для сброса
    makeDroppable(element, onDrop) {
        element.addEventListener('dragover', (e) => {
            this.handleDragOver(e);
        });

        element.addEventListener('dragenter', (e) => {
            this.handleDragEnter(e);
        });

        element.addEventListener('dragleave', (e) => {
            this.handleDragLeave(e);
        });

        element.addEventListener('drop', (e) => {
            this.handleDrop(e, onDrop);
        });
    }

    handleDragStart(e, data) {
        this.draggedElement = e.target;
        this.isDragging = true;
        
        // Добавляем класс для стилизации
        e.target.classList.add('dragging');
        
        // Устанавливаем данные для передачи
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', JSON.stringify(data));
        
        // Создаем изображение для перетаскивания
        const dragImage = this.createDragImage(e.target, data);
        e.dataTransfer.setDragImage(dragImage, 0, 0);
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        e.preventDefault();
        this.dropTarget = e.target;
        e.target.classList.add('drop-target');
    }

    handleDragLeave(e) {
        e.target.classList.remove('drop-target');
    }

    handleDrop(e, onDrop) {
        e.preventDefault();
        
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            onDrop(data, e.target);
        } catch (error) {
            console.error('Ошибка обработки drop:', error);
        }
        
        e.target.classList.remove('drop-target');
    }

    handleDragEnd(e) {
        this.isDragging = false;
        this.draggedElement = null;
        this.dropTarget = null;
        
        // Убираем классы стилизации
        document.querySelectorAll('.dragging, .drop-target').forEach(el => {
            el.classList.remove('dragging', 'drop-target');
        });
    }

    createDragImage(element, data) {
        const dragImage = element.cloneNode(true);
        dragImage.style.position = 'absolute';
        dragImage.style.top = '-1000px';
        dragImage.style.left = '-1000px';
        dragImage.style.pointerEvents = 'none';
        dragImage.style.opacity = '0.8';
        dragImage.style.transform = 'rotate(5deg)';
        
        document.body.appendChild(dragImage);
        
        // Удаляем через короткое время
        setTimeout(() => {
            if (dragImage.parentNode) {
                dragImage.parentNode.removeChild(dragImage);
            }
        }, 100);
        
        return dragImage;
    }

    // Утилиты для работы с drag & drop
    static isDragSupported() {
        const div = document.createElement('div');
        return (('draggable' in div) || ('ondragstart' in div && 'ondrop' in div));
    }

    static getDragData(element) {
        try {
            return JSON.parse(element.dataset.dragData || '{}');
        } catch (error) {
            console.error('Ошибка парсинга drag data:', error);
            return {};
        }
    }

    static setDragData(element, data) {
        element.dataset.dragData = JSON.stringify(data);
    }

    // Обработка перетаскивания между контейнерами
    setupContainerDragDrop(containerElement, onCellDrop) {
        const cells = containerElement.querySelectorAll('.grid-cell');
        
        cells.forEach((cell, index) => {
            this.makeDroppable(cell, (data, target) => {
                onCellDrop(data, index, target);
            });
        });
    }

    // Обработка перетаскивания элементов кучи
    setupPileDragDrop(pileElement, onItemDrop) {
        const items = pileElement.querySelectorAll('.pile-item');
        
        items.forEach(item => {
            this.makeDraggable(item, {
                type: 'pile-item',
                id: item.dataset.itemId
            });
        });
    }

    // Обработка перетаскивания между разными видами
    setupCrossViewDragDrop() {
        // Настройка перетаскивания из кучи в контейнеры
        const pileItems = document.querySelectorAll('.pile-item');
        const containerCells = document.querySelectorAll('.grid-cell');
        
        pileItems.forEach(item => {
            this.makeDraggable(item, {
                type: 'pile-item',
                id: item.dataset.itemId
            });
        });
        
        containerCells.forEach(cell => {
            this.makeDroppable(cell, (data, target) => {
                if (data.type === 'pile-item') {
                    this.handlePileToContainerDrop(data, target);
                }
            });
        });
    }

    handlePileToContainerDrop(data, target) {
        // Логика перемещения элемента из кучи в контейнер
        console.log('Перемещение из кучи в контейнер:', data, target);
        
        if (window.app) {
            window.app.showNotification('Элемент перемещен в контейнер', 'success');
        }
    }

    // Обработка перетаскивания файлов
    setupFileDrop(element, onFileDrop) {
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            const files = Array.from(e.dataTransfer.files);
            onFileDrop(files);
        });
    }
}
