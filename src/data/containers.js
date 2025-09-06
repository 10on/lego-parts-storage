// Модель контейнеров
class ContainerModel {
    constructor() {
        this.containers = [];
        this.init();
    }

    init() {
        // Загружаем контейнеры из localStorage
        this.loadFromStorage();
    }

    // CRUD операции для контейнеров
    create(containerData) {
        const container = {
            id: this.generateId(),
            ...containerData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.containers.push(container);
        this.saveToStorage();
        return container;
    }

    read(id) {
        return this.containers.find(container => container.id === id);
    }

    readAll() {
        return [...this.containers];
    }

    update(id, updates) {
        const index = this.containers.findIndex(container => container.id === id);
        if (index !== -1) {
            this.containers[index] = {
                ...this.containers[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            this.saveToStorage();
            return this.containers[index];
        }
        return null;
    }

    delete(id) {
        const index = this.containers.findIndex(container => container.id === id);
        if (index !== -1) {
            const deleted = this.containers.splice(index, 1)[0];
            this.saveToStorage();
            return deleted;
        }
        return null;
    }

    // Операции с ячейками контейнера
    updateCell(containerId, cellIndex, cellData) {
        const container = this.read(containerId);
        if (container && container.cells) {
            container.cells[cellIndex] = cellData;
            container.updatedAt = new Date().toISOString();
            this.saveToStorage();
            return container;
        }
        return null;
    }

    clearCell(containerId, cellIndex) {
        return this.updateCell(containerId, cellIndex, null);
    }

    // Поиск и фильтрация
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.containers.filter(container => 
            container.name.toLowerCase().includes(lowerQuery) ||
            container.type.toLowerCase().includes(lowerQuery)
        );
    }

    filterByType(type) {
        return this.containers.filter(container => container.type === type);
    }

    // Статистика
    getStats() {
        const total = this.containers.length;
        const byType = this.containers.reduce((acc, container) => {
            acc[container.type] = (acc[container.type] || 0) + 1;
            return acc;
        }, {});

        const totalCells = this.containers.reduce((sum, container) => {
            return sum + (container.rows * container.cols);
        }, 0);

        const filledCells = this.containers.reduce((sum, container) => {
            return sum + (container.cells ? container.cells.filter(cell => cell !== null).length : 0);
        }, 0);

        return {
            total,
            byType,
            totalCells,
            filledCells,
            fillPercentage: totalCells > 0 ? (filledCells / totalCells) * 100 : 0
        };
    }

    // Импорт/экспорт
    exportToJSON() {
        return JSON.stringify(this.containers, null, 2);
    }

    importFromJSON(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            if (Array.isArray(imported)) {
                this.containers = imported;
                this.saveToStorage();
                return true;
            }
        } catch (error) {
            console.error('Ошибка импорта контейнеров:', error);
        }
        return false;
    }

    // Синхронизация с другими моделями
    syncWithPile(pileModel) {
        // Синхронизация данных между контейнерами и кучей
        // Это может включать поиск дубликатов, обновление количеств и т.д.
    }

    // Валидация
    validate(container) {
        const errors = [];
        
        if (!container.name || container.name.trim() === '') {
            errors.push('Название контейнера обязательно');
        }
        
        if (!container.type || !['cabinet', 'box', 'pile'].includes(container.type)) {
            errors.push('Неверный тип контейнера');
        }
        
        if (container.rows && (container.rows < 1 || container.rows > 50)) {
            errors.push('Количество строк должно быть от 1 до 50');
        }
        
        if (container.cols && (container.cols < 1 || container.cols > 50)) {
            errors.push('Количество столбцов должно быть от 1 до 50');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    // Утилиты
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    loadFromStorage() {
        try {
            const stored = localStorage.getItem('lego-storage-containers');
            if (stored) {
                this.containers = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Ошибка загрузки контейнеров:', error);
            this.containers = [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem('lego-storage-containers', JSON.stringify(this.containers));
        } catch (error) {
            console.error('Ошибка сохранения контейнеров:', error);
        }
    }

    // Очистка данных
    clearAll() {
        this.containers = [];
        this.saveToStorage();
    }

    // Клонирование контейнера
    clone(containerId, includeContent = false) {
        const originalContainer = this.read(containerId);
        if (!originalContainer) {
            return null;
        }

        const clonedContainer = {
            id: this.generateId(),
            name: `${originalContainer.name} (копия)`,
            type: originalContainer.type,
            rows: originalContainer.rows,
            cols: originalContainer.cols,
            color: originalContainer.color,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (includeContent && originalContainer.cells) {
            // Глубокое копирование ячеек с содержимым
            clonedContainer.cells = originalContainer.cells.map(cell => {
                if (!cell) return null;
                
                // Копируем структуру ячейки
                const clonedCell = {
                    type: cell.type,
                    partId: cell.partId,
                    name: cell.name,
                    color: cell.color,
                    colorId: cell.colorId,
                    quantity: cell.quantity,
                    image: cell.image,
                    lastUpdated: cell.lastUpdated
                };

                // Если это объединенная ячейка, копируем дополнительные свойства
                if (cell.type === 'merged') {
                    clonedCell.cellCount = cell.cellCount;
                    clonedCell.items = cell.items ? cell.items.map(item => ({
                        ...item,
                        id: Date.now().toString(36) + Math.random().toString(36).substr(2) // Новый ID для каждого элемента
                    })) : [];
                }

                return clonedCell;
            });
        } else {
            // Создаем пустую сетку того же размера
            clonedContainer.cells = Array(originalContainer.rows * originalContainer.cols).fill(null);
        }

        this.containers.push(clonedContainer);
        this.saveToStorage();
        return clonedContainer;
    }

    // Резервное копирование
    createBackup() {
        return {
            containers: this.containers,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
    }

    restoreFromBackup(backup) {
        if (backup && backup.containers && Array.isArray(backup.containers)) {
            this.containers = backup.containers;
            this.saveToStorage();
            return true;
        }
        return false;
    }
}
