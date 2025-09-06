// Модель проекта и тестовые данные
class MockData {
    constructor() {
        this.containers = [];
        this.pileItems = [];
        this.catalog = [];
        this.init();
    }

    init() {
        this.generateMockContainers();
        this.generateMockPileItems();
        this.generateMockCatalog();
    }

    generateMockContainers() {
        this.containers = [
            {
                id: '1',
                name: 'Основная кассетница',
                type: 'cabinet',
                rows: 6,
                cols: 8,
                color: '#e3f2fd',
                cells: this.generateMockCells(6, 8),
                createdAt: '2024-01-15T10:00:00Z',
                updatedAt: '2024-01-20T15:30:00Z'
            },
            {
                id: '2',
                name: 'Коробка с деталями',
                type: 'box',
                rows: 4,
                cols: 6,
                color: '#f3e5f5',
                cells: this.generateMockCells(4, 6),
                createdAt: '2024-01-16T09:15:00Z',
                updatedAt: '2024-01-19T12:45:00Z'
            },
            {
                id: '3',
                name: 'Временная куча',
                type: 'pile',
                rows: 1,
                cols: 1,
                color: '#fff3e0',
                cells: [],
                createdAt: '2024-01-18T14:20:00Z',
                updatedAt: '2024-01-20T16:10:00Z'
            }
        ];
    }

    generateMockPileItems() {
        this.pileItems = [
            {
                id: 'pile-1',
                partId: '3001',
                colorId: '4',
                quantity: 25,
                image: 'https://img.bricklink.com/ItemImage/PN/4/3001.png',
                lastUsed: '2024-01-20T10:30:00Z'
            },
            {
                id: 'pile-2',
                partId: '3002',
                colorId: '1',
                quantity: 15,
                image: 'https://img.bricklink.com/ItemImage/PN/1/3002.png',
                lastUsed: '2024-01-19T15:45:00Z'
            },
            {
                id: 'pile-3',
                partId: '3003',
                colorId: '3',
                quantity: 30,
                image: 'https://img.bricklink.com/ItemImage/PN/3/3003.png',
                lastUsed: '2024-01-18T12:20:00Z'
            },
            {
                id: 'pile-4',
                partId: '3004',
                colorId: '6',
                quantity: 50,
                image: 'https://img.bricklink.com/ItemImage/PN/6/3004.png',
                lastUsed: '2024-01-17T09:15:00Z'
            },
            {
                id: 'pile-5',
                partId: '3005',
                colorId: '1',
                quantity: 100,
                image: 'https://img.bricklink.com/ItemImage/PN/1/3005.png',
                lastUsed: '2024-01-16T14:30:00Z'
            }
        ];
    }

    generateMockCatalog() {
        this.catalog = [
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
                image: 'https://img.bricklink.com/ItemImage/PN/6/3004.png',
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
    }

    generateMockCells(rows, cols) {
        const cells = [];
        const totalCells = rows * cols;
        
        // Используем детерминированный подход для стабильных тестовых данных
        const seed = 12345; // Фиксированное значение для воспроизводимости
        
        for (let i = 0; i < totalCells; i++) {
            // Детерминированная "случайность" на основе индекса и seed
            const pseudoRandom = ((i + seed) * 9301 + 49297) % 233280 / 233280;
            
            // 30% вероятность заполненной ячейки
            if (pseudoRandom < 0.3) {
                const part = this.getRandomPart(i); // Передаем индекс для детерминированности
                
                // Создаем ячейку в НОВОМ формате с массивом items
                const items = [{
                    partId: part.partId,
                    colorId: part.colorId,
                    quantity: Math.floor(pseudoRandom * 20) + 1,
                    image: part.image,
                    lastUpdated: new Date().toISOString()
                }];
                
                // 10% вероятность ячейки с множественными деталями
                if (pseudoRandom > 0.2 && pseudoRandom < 0.25) {
                    const secondPart = this.getRandomPart(i + 1000); // Другая деталь
                    items.push({
                        partId: secondPart.partId,
                        colorId: secondPart.colorId,
                        quantity: Math.floor(pseudoRandom * 10) + 1,
                        image: secondPart.image,
                        lastUpdated: new Date().toISOString()
                    });
                }
                
                cells.push({ items });
            } else {
                cells.push(null);
            }
        }
        
        return cells;
    }

    getRandomPart(index = 0) {
        const parts = [
            {
                partId: '3001',
                colorId: '4',
                image: 'https://img.bricklink.com/ItemImage/PN/4/3001.png'
            },
            {
                partId: '3002',
                colorId: '1',
                image: 'https://img.bricklink.com/ItemImage/PN/1/3002.png'
            },
            {
                partId: '3003',
                colorId: '3',
                image: 'https://img.bricklink.com/ItemImage/PN/3/3003.png'
            },
            {
                partId: '3004',
                colorId: '6',
                image: 'https://img.bricklink.com/ItemImage/PN/6/3004.png'
            },
            {
                partId: '3005',
                colorId: '1',
                image: 'https://img.bricklink.com/ItemImage/PN/1/3005.png'
            }
        ];
        
        // Детерминированный выбор на основе индекса
        return parts[index % parts.length];
    }

    getContainers() {
        return this.containers;
    }

    getPileItems() {
        return this.pileItems;
    }

    getCatalog() {
        return this.catalog;
    }

    getContainerById(id) {
        return this.containers.find(container => container.id === id);
    }

    getPileItemById(id) {
        return this.pileItems.find(item => item.id === id);
    }

    getPartById(partId) {
        return this.catalog.find(part => part.partId === partId);
    }

    // Методы для работы с данными
    addContainer(container) {
        container.id = Date.now().toString();
        container.createdAt = new Date().toISOString();
        container.updatedAt = new Date().toISOString();
        this.containers.push(container);
        return container;
    }

    updateContainer(id, updates) {
        const container = this.getContainerById(id);
        if (container) {
            Object.assign(container, updates);
            container.updatedAt = new Date().toISOString();
        }
        return container;
    }

    deleteContainer(id) {
        const index = this.containers.findIndex(container => container.id === id);
        if (index > -1) {
            this.containers.splice(index, 1);
            return true;
        }
        return false;
    }

    addPileItem(item) {
        item.id = `pile-${Date.now()}`;
        item.lastUsed = new Date().toISOString();
        this.pileItems.push(item);
        return item;
    }

    updatePileItem(id, updates) {
        const item = this.getPileItemById(id);
        if (item) {
            Object.assign(item, updates);
            item.lastUsed = new Date().toISOString();
        }
        return item;
    }

    deletePileItem(id) {
        const index = this.pileItems.findIndex(item => item.id === id);
        if (index > -1) {
            this.pileItems.splice(index, 1);
            return true;
        }
        return false;
    }
}
