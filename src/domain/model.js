// Доменная модель приложения
class LegoPart {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.partId = data.partId;
        this.name = data.name;
        this.color = data.color;
        this.colorId = data.colorId;
        this.quantity = data.quantity || 1;
        this.image = data.image;
        this.lastUpdated = data.lastUpdated || new Date().toISOString();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    updateQuantity(newQuantity) {
        if (newQuantity >= 0) {
            this.quantity = newQuantity;
            this.lastUpdated = new Date().toISOString();
        }
    }

    addQuantity(amount) {
        this.updateQuantity(this.quantity + amount);
    }

    removeQuantity(amount) {
        this.updateQuantity(Math.max(0, this.quantity - amount));
    }

    clone() {
        return new LegoPart({
            partId: this.partId,
            name: this.name,
            color: this.color,
            colorId: this.colorId,
            quantity: this.quantity,
            image: this.image
        });
    }

    equals(other) {
        return this.partId === other.partId && this.color === other.color;
    }

    toJSON() {
        return {
            id: this.id,
            partId: this.partId,
            name: this.name,
            color: this.color,
            colorId: this.colorId,
            quantity: this.quantity,
            image: this.image,
            lastUpdated: this.lastUpdated
        };
    }
}

class Container {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.name = data.name;
        this.type = data.type; // 'cabinet', 'box', 'pile'
        this.rows = data.rows || 1;
        this.cols = data.cols || 1;
        this.cells = data.cells || this.initializeCells();
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    initializeCells() {
        return Array(this.rows * this.cols).fill(null);
    }

    getCellIndex(row, col) {
        return row * this.cols + col;
    }

    getCell(row, col) {
        const index = this.getCellIndex(row, col);
        return this.cells[index];
    }

    setCell(row, col, part) {
        const index = this.getCellIndex(row, col);
        this.cells[index] = part;
        this.updatedAt = new Date().toISOString();
    }

    // Новые методы для работы с множественными деталями в ячейке
    addPartToCell(row, col, part) {
        const index = this.getCellIndex(row, col);
        if (!this.cells[index]) {
            this.cells[index] = { items: [] };
        }
        
        // Если ячейка содержит одну деталь (старый формат), конвертируем в новый
        if (this.cells[index].partId && !this.cells[index].items) {
            const existingPart = { ...this.cells[index] };
            this.cells[index] = { items: [existingPart] };
        }
        
        // Добавляем новую деталь
        if (!this.cells[index].items) {
            this.cells[index].items = [];
        }
        
        // Проверяем, есть ли уже такая деталь (по partId и color)
        const existingItemIndex = this.cells[index].items.findIndex(item => 
            item.partId === part.partId && item.color === part.color
        );
        
        if (existingItemIndex >= 0) {
            // Увеличиваем количество существующей детали
            this.cells[index].items[existingItemIndex].quantity += part.quantity || 1;
        } else {
            // Добавляем новую деталь
            this.cells[index].items.push({
                ...part,
                quantity: part.quantity || 1
            });
        }
        
        this.updatedAt = new Date().toISOString();
    }

    removePartFromCell(row, col, partId, color, quantity = 1) {
        const index = this.getCellIndex(row, col);
        if (!this.cells[index] || !this.cells[index].items) {
            return false;
        }
        
        const itemIndex = this.cells[index].items.findIndex(item => 
            item.partId === partId && item.color === color
        );
        
        if (itemIndex >= 0) {
            const item = this.cells[index].items[itemIndex];
            item.quantity = Math.max(0, item.quantity - quantity);
            
            if (item.quantity <= 0) {
                this.cells[index].items.splice(itemIndex, 1);
            }
            
            // Если деталей не осталось, очищаем ячейку
            if (this.cells[index].items.length === 0) {
                this.cells[index] = null;
            }
            
            this.updatedAt = new Date().toISOString();
            return true;
        }
        
        return false;
    }

    getCellParts(row, col) {
        const index = this.getCellIndex(row, col);
        const cellData = this.cells[index];
        
        if (!cellData) return [];
        
        // Если это объединенная ячейка
        if (cellData.type === 'merged' && cellData.items) {
            return cellData.items;
        }
        
        // Если это обычная ячейка с множественными деталями
        if (cellData.items) {
            return cellData.items;
        }
        
        // Если это старая ячейка с одной деталью
        if (cellData.partId) {
            return [cellData];
        }
        
        return [];
    }

    getCellPartCount(row, col) {
        return this.getCellParts(row, col).length;
    }

    getCellTotalQuantity(row, col) {
        const parts = this.getCellParts(row, col);
        return parts.reduce((total, part) => total + (part.quantity || 1), 0);
    }

    clearCell(row, col) {
        this.setCell(row, col, null);
    }

    getCellByIndex(index) {
        return this.cells[index];
    }

    setCellByIndex(index, part) {
        this.cells[index] = part;
        this.updatedAt = new Date().toISOString();
    }

    clearCellByIndex(index) {
        this.setCellByIndex(index, null);
    }

    getFilledCells() {
        return this.cells.filter(cell => cell !== null);
    }

    getEmptyCells() {
        return this.cells.filter(cell => cell === null);
    }

    getFillPercentage() {
        const total = this.rows * this.cols;
        const filled = this.getFilledCells().length;
        return total > 0 ? (filled / total) * 100 : 0;
    }

    findPart(partId, color) {
        return this.cells.find(cell => 
            cell && cell.partId === partId && cell.color === color
        );
    }

    findPartByIndex(partId, color) {
        return this.cells.findIndex(cell => 
            cell && cell.partId === partId && cell.color === color
        );
    }

    addPart(part, row, col) {
        if (this.isValidPosition(row, col)) {
            this.setCell(row, col, part);
            return true;
        }
        return false;
    }

    removePart(row, col) {
        if (this.isValidPosition(row, col)) {
            const part = this.getCell(row, col);
            this.clearCell(row, col);
            return part;
        }
        return null;
    }

    isValidPosition(row, col) {
        return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
    }

    resize(newRows, newCols) {
        const newCells = Array(newRows * newCols).fill(null);
        
        // Копируем существующие ячейки
        for (let row = 0; row < Math.min(this.rows, newRows); row++) {
            for (let col = 0; col < Math.min(this.cols, newCols); col++) {
                const oldIndex = this.getCellIndex(row, col);
                const newIndex = row * newCols + col;
                newCells[newIndex] = this.cells[oldIndex];
            }
        }
        
        this.rows = newRows;
        this.cols = newCols;
        this.cells = newCells;
        this.updatedAt = new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            type: this.type,
            rows: this.rows,
            cols: this.cols,
            cells: this.cells,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

class Pile {
    constructor() {
        this.items = [];
    }

    addItem(part) {
        const existingItem = this.findItem(part.partId, part.color);
        if (existingItem) {
            existingItem.addQuantity(part.quantity);
        } else {
            this.items.push(new LegoPart(part));
        }
    }

    removeItem(partId, color, quantity) {
        const item = this.findItem(partId, color);
        if (item) {
            item.removeQuantity(quantity);
            if (item.quantity <= 0) {
                this.items = this.items.filter(i => i !== item);
            }
            return true;
        }
        return false;
    }

    findItem(partId, color) {
        return this.items.find(item => 
            item.partId === partId && item.color === color
        );
    }

    getTotalQuantity() {
        return this.items.reduce((total, item) => total + item.quantity, 0);
    }

    getUniqueParts() {
        return this.items.length;
    }

    clear() {
        this.items = [];
    }

    toJSON() {
        return this.items.map(item => item.toJSON());
    }
}

class DuplicateFinder {
    constructor(containers, pile) {
        this.containers = containers;
        this.pile = pile;
    }

    findDuplicates() {
        const allParts = this.collectAllParts();
        const groups = this.groupByPartAndColor(allParts);
        return this.filterDuplicates(groups);
    }

    collectAllParts() {
        const parts = [];
        
        // Собираем из контейнеров
        this.containers.forEach(container => {
            container.cells.forEach((cell, index) => {
                if (cell) {
                    parts.push({
                        ...cell,
                        location: `${container.name} (ячейка ${index + 1})`,
                        containerId: container.id,
                        cellIndex: index
                    });
                }
            });
        });
        
        // Собираем из кучи
        this.pile.items.forEach(item => {
            parts.push({
                ...item,
                location: 'Куча деталей',
                containerId: 'pile',
                cellIndex: -1
            });
        });
        
        return parts;
    }

    groupByPartAndColor(parts) {
        const groups = new Map();
        
        parts.forEach(part => {
            const key = `${part.partId}-${part.color}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    partId: part.partId,
                    name: part.name,
                    color: part.color,
                    items: []
                });
            }
            groups.get(key).items.push(part);
        });
        
        return groups;
    }

    filterDuplicates(groups) {
        return Array.from(groups.values()).filter(group => group.items.length > 1);
    }
}

class PartCatalog {
    constructor() {
        this.parts = new Map();
        this.init();
    }

    init() {
        // Загружаем базовый каталог
        this.loadBasicCatalog();
    }

    loadBasicCatalog() {
        const basicParts = [
            {
                partId: '3001',
                name: 'Brick 2x4',
                category: 'Bricks',
                image: 'https://img.bricklink.com/ItemImage/PN/4/3001.png',
                colors: ['Red', 'Blue', 'Yellow', 'Green', 'White', 'Black']
            },
            {
                partId: '3002',
                name: 'Brick 2x3',
                category: 'Bricks',
                image: 'https://img.bricklink.com/ItemImage/PN/1/3002.png',
                colors: ['Red', 'Blue', 'Yellow', 'Green', 'White', 'Black']
            },
            {
                partId: '3003',
                name: 'Brick 2x2',
                category: 'Bricks',
                image: 'https://img.bricklink.com/ItemImage/PN/3/3003.png',
                colors: ['Red', 'Blue', 'Yellow', 'Green', 'White', 'Black']
            },
            {
                partId: '3004',
                name: 'Brick 1x2',
                category: 'Bricks',
                image: 'https://img.bricklink.com/ItemImage/PN/2/3004.png',
                colors: ['Red', 'Blue', 'Yellow', 'Green', 'White', 'Black']
            },
            {
                partId: '3005',
                name: 'Brick 1x1',
                category: 'Bricks',
                image: 'https://img.bricklink.com/ItemImage/PN/1/3005.png',
                colors: ['Red', 'Blue', 'Yellow', 'Green', 'White', 'Black']
            }
        ];
        
        basicParts.forEach(part => {
            this.parts.set(part.partId, part);
        });
    }

    getPart(partId) {
        return this.parts.get(partId);
    }

    searchParts(query) {
        const lowerQuery = query.toLowerCase();
        return Array.from(this.parts.values()).filter(part =>
            part.name.toLowerCase().includes(lowerQuery) ||
            part.partId.toLowerCase().includes(lowerQuery)
        );
    }

    getPartsByCategory(category) {
        return Array.from(this.parts.values()).filter(part => part.category === category);
    }

    addPart(part) {
        this.parts.set(part.partId, part);
    }
}
