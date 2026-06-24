class CellRenderer {
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
                ${partData.image ? `<img src="${partData.image}" alt="${partData.name}" class="cell-image" onerror="this.style.display='none'" data-original-src="${partData.image}">` : ''}
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
                    ${part.image ? `<img src="${part.image}" alt="${part.name}" class="cell-image-small" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" onload="this.nextElementSibling.style.display='none';" data-original-src="${part.image}">` : ''}
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

    isCellPartOfMerge(cellIndex, cells) {
        for (let i = 0; i < cells.length; i++) {
            const cellData = cells[i];
            if (cellData && cellData.type === 'merged') {
                const { startIndex, cellCount } = cellData;
                if (cellIndex > startIndex && cellIndex <= startIndex + cellCount - 1) {
                    return true;
                }
            }
        }
        return false;
    }

    applyMergedCellStyles(cell, cellData, startIndex, cols) {
        const { direction, cellCount } = cellData;
        const startRow = Math.floor(startIndex / cols) + 1;
        const startCol = (startIndex % cols) + 1;

        if (direction === 'horizontal') {
            cell.style.gridColumn = `${startCol} / ${startCol + cellCount}`;
            cell.style.gridRow = `${startRow} / ${startRow + 1}`;
        } else {
            cell.style.gridColumn = `${startCol} / ${startCol + 1}`;
            cell.style.gridRow = `${startRow} / ${startRow + cellCount}`;
        }
    }

    handleCellImageFallbacks(container) {
        if (!window.imageLoader) return;
        container.querySelectorAll('img[data-original-src]').forEach(img => {
            const originalSrc = img.dataset.originalSrc;
            if (!originalSrc) return;
            const testImg = new Image();
            testImg.onload = () => {
                if (img.src !== originalSrc) img.src = originalSrc;
            };
            testImg.onerror = () => {
                window.imageLoader.loadImageWithFallback(originalSrc, img, null, {
                    showFallbackIndicator: true,
                    fallbackIndicatorText: '⚠️ Цвет',
                    onSuccess: (url, isFallback) => {
                        if (isFallback) img.classList.add('fallback-image');
                    }
                });
            };
            testImg.src = originalSrc;
        });
    }
}
