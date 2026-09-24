// Общие утилиты
class Utils {
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * Экранирует строку для безопасной вставки в HTML (текст и значения атрибутов)
     */
    static escapeHtml(value) {
        if (value === null || value === undefined) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Затемняет HEX-цвет на заданный процент
     */
    static darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    /**
     * Проверяет, перекрыта ли ячейка объединением (входит в него, но не является первой)
     */
    static isCellPartOfMerge(cellIndex, cells) {
        return cells.some(cellData => {
            if (!cellData || cellData.type !== 'merged') return false;
            const { startIndex, cellCount } = cellData;
            return cellIndex > startIndex && cellIndex <= startIndex + cellCount - 1;
        });
    }

    /**
     * Возвращает CSS Grid позицию объединенной ячейки
     * @returns {{gridColumn: string, gridRow: string}}
     */
    static getMergedGridArea(cellData, startIndex, cols) {
        const { direction, cellCount } = cellData;
        const startRow = Math.floor(startIndex / cols) + 1; // +1 для CSS Grid (начинается с 1)
        const startCol = (startIndex % cols) + 1;

        if (direction === 'horizontal') {
            return {
                gridColumn: `${startCol} / ${startCol + cellCount}`,
                gridRow: `${startRow} / ${startRow + 1}`
            };
        }
        return {
            gridColumn: `${startCol} / ${startCol + 1}`,
            gridRow: `${startRow} / ${startRow + cellCount}`
        };
    }
}

// Короткий алиас для шаблонов: `<div>${esc(value)}</div>`
const esc = Utils.escapeHtml;
