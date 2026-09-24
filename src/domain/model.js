// Доменная модель приложения
class Container {
    constructor(data = {}) {
        // Сохраняем все поля (в т.ч. color, description), чтобы они не терялись при сохранении
        Object.assign(this, data);
        this.id = data.id || Utils.generateId();
        this.rows = data.rows || 1;
        this.cols = data.cols || 1;
        this.cells = (data.cells || Array(this.rows * this.cols).fill(null)).map(Container.migrateCell);
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
    }

    /**
     * Приводит данные к экземпляру Container (идемпотентно)
     */
    static from(data) {
        return data instanceof Container ? data : new Container(data);
    }

    /**
     * Конвертирует ячейку старого формата ({partId, colorId, ...}) в новый ({items: [...]})
     */
    static migrateCell(cell) {
        if (!cell || Array.isArray(cell.items) || !cell.partId) {
            return cell ?? null;
        }

        return {
            items: [{
                partId: cell.partId,
                colorId: cell.colorId,
                quantity: cell.quantity,
                image: cell.image,
                lastUpdated: cell.lastUpdated || new Date().toISOString()
            }]
        };
    }

    clone(includeContent = false) {
        const data = this.toJSON();
        delete data.id;
        delete data.createdAt;
        delete data.updatedAt;
        data.name = `${this.name} (копия)`;

        if (includeContent) {
            data.cells = structuredClone(this.cells);
            data.cells.forEach(cell => {
                cell?.items?.forEach(item => {
                    if (item.id) item.id = Utils.generateId();
                });
            });
        } else {
            // Пустая сетка того же размера; объединения ячеек не переносятся
            data.cells = Array(this.rows * this.cols).fill(null);
        }

        return new Container(data);
    }

    toJSON() {
        return { ...this };
    }
}
