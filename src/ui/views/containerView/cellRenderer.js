import { Utils, esc } from '../../../utils/index.js';

export class CellRenderer {
    renderCellContent(cellData) {
        if (cellData && cellData.type === 'merged') {
            if (!cellData.items || cellData.items.length === 0) {
                return '<div class="cell-content"></div>';
            }
            return this.renderMultipleParts(cellData.items, true);
        }

        if (cellData) {
            if (cellData.items && cellData.items.length > 0) {
                return this.renderMultipleParts(cellData.items, false);
            }
            if (cellData.partId) {
                return this.renderSinglePart(cellData);
            }
        }

        return '<div class="cell-content"></div>';
    }

    renderSinglePart(partData) {
        return `
            <div class="cell-content">
                ${partData.image ? `<img src="${esc(partData.image)}" alt="${esc(partData.name)}" class="cell-image" onerror="this.style.display='none'" data-original-src="${esc(partData.image)}">` : ''}
            </div>
        `;
    }

    renderMultipleParts(parts, isMerged = false) {
        if (!parts || parts.length === 0) return '<div class="cell-content"></div>';

        const sortedParts = [...parts].sort((a, b) => (b.quantity || 1) - (a.quantity || 1));
        const visibleParts = sortedParts.slice(0, 3);
        const hiddenCount = Math.max(0, sortedParts.length - 3);

        const partsHtml = visibleParts.map(part => `
            <div class="cell-part">
                <div class="part-image-container-small">
                    ${part.image ? `<img src="${esc(part.image)}" alt="${esc(part.name)}" class="cell-image-small" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" onload="this.nextElementSibling.style.display='none';" data-original-src="${esc(part.image)}">` : ''}
                    <div class="part-image-placeholder-small" style="${part.image ? 'display: flex;' : ''}">
                        <div class="placeholder-icon-tiny">🧱</div>
                    </div>
                </div>
            </div>
        `).join('');

        const hiddenHtml = hiddenCount > 0 ? `<div class="hidden-parts">+${hiddenCount}</div>` : '';

        return `
            <div class="cell-content multiple-parts ${isMerged ? 'merged' : ''}">
                ${partsHtml}
                ${hiddenHtml}
            </div>
        `;
    }

    applyMergedCellStyles(cell, cellData, startIndex, cols) {
        const { gridColumn, gridRow } = Utils.getMergedGridArea(cellData, startIndex, cols);
        cell.style.gridColumn = gridColumn;
        cell.style.gridRow = gridRow;
    }
}
