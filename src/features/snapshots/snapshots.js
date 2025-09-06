// Система снимков состояния
class SnapshotManager {
    constructor() {
        this.snapshots = [];
        this.currentIndex = -1;
        this.maxSnapshots = 50;
        this.init();
    }

    init() {
        // Загружаем снимки из localStorage
        this.loadSnapshots();
    }

    // Создание снимка текущего состояния
    createSnapshot(description = '') {
        const snapshot = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            description,
            data: this.captureCurrentState(),
            version: '1.0'
        };

        // Удаляем снимки после текущего индекса
        this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
        
        // Добавляем новый снимок
        this.snapshots.push(snapshot);
        this.currentIndex = this.snapshots.length - 1;

        // Ограничиваем количество снимков
        if (this.snapshots.length > this.maxSnapshots) {
            this.snapshots.shift();
            this.currentIndex--;
        }

        this.saveSnapshots();
        return snapshot;
    }

    // Восстановление состояния из снимка
    restoreSnapshot(snapshotId) {
        const snapshot = this.snapshots.find(s => s.id === snapshotId);
        if (!snapshot) {
            throw new Error('Снимок не найден');
        }

        this.restoreState(snapshot.data);
        return snapshot;
    }

    // Отмена последнего действия
    undo() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            const snapshot = this.snapshots[this.currentIndex];
            this.restoreState(snapshot.data);
            return snapshot;
        }
        return null;
    }

    // Повтор отмененного действия
    redo() {
        if (this.currentIndex < this.snapshots.length - 1) {
            this.currentIndex++;
            const snapshot = this.snapshots[this.currentIndex];
            this.restoreState(snapshot.data);
            return snapshot;
        }
        return null;
    }

    // Проверка возможности отмены
    canUndo() {
        return this.currentIndex > 0;
    }

    // Проверка возможности повтора
    canRedo() {
        return this.currentIndex < this.snapshots.length - 1;
    }

    // Получение истории снимков
    getHistory() {
        return this.snapshots.map((snapshot, index) => ({
            ...snapshot,
            isCurrent: index === this.currentIndex
        }));
    }

    // Очистка истории
    clearHistory() {
        this.snapshots = [];
        this.currentIndex = -1;
        this.saveSnapshots();
    }

    // Захват текущего состояния
    captureCurrentState() {
        if (!window.app) {
            return {};
        }

        return {
            containers: Utils.deepClone(window.app.containers || []),
            pileItems: Utils.deepClone(window.app.pileItems || []),
            currentView: window.app.currentView,
            timestamp: new Date().toISOString()
        };
    }

    // Восстановление состояния
    restoreState(data) {
        if (!window.app) {
            return;
        }

        // Восстанавливаем данные
        if (data.containers) {
            window.app.containers = data.containers;
        }
        
        if (data.pileItems) {
            window.app.pileItems = data.pileItems;
        }
        
        if (data.currentView) {
            window.app.showView(data.currentView);
        }

        // Обновляем отображение
        window.app.updateViewContent(window.app.currentView);
    }

    // Сохранение снимков в localStorage
    saveSnapshots() {
        try {
            const data = {
                snapshots: this.snapshots,
                currentIndex: this.currentIndex,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('lego-storage-snapshots', JSON.stringify(data));
        } catch (error) {
            console.error('Ошибка сохранения снимков:', error);
        }
    }

    // Загрузка снимков из localStorage
    loadSnapshots() {
        try {
            const data = localStorage.getItem('lego-storage-snapshots');
            if (data) {
                const parsed = JSON.parse(data);
                this.snapshots = parsed.snapshots || [];
                this.currentIndex = parsed.currentIndex || -1;
            }
        } catch (error) {
            console.error('Ошибка загрузки снимков:', error);
            this.snapshots = [];
            this.currentIndex = -1;
        }
    }

    // Генерация ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Экспорт снимков
    exportSnapshots() {
        const data = {
            snapshots: this.snapshots,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lego-storage-snapshots-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Импорт снимков
    importSnapshots(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.snapshots && Array.isArray(data.snapshots)) {
                        this.snapshots = data.snapshots;
                        this.currentIndex = this.snapshots.length - 1;
                        this.saveSnapshots();
                        resolve(true);
                    } else {
                        reject(new Error('Неверный формат файла снимков'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(new Error('Ошибка чтения файла'));
            reader.readAsText(file);
        });
    }

    // Автоматическое создание снимков
    enableAutoSnapshots(interval = 30000) {
        this.autoSnapshotInterval = setInterval(() => {
            this.createSnapshot('Автоматический снимок');
        }, interval);
    }

    disableAutoSnapshots() {
        if (this.autoSnapshotInterval) {
            clearInterval(this.autoSnapshotInterval);
            this.autoSnapshotInterval = null;
        }
    }

    // Создание снимка перед важными операциями
    createPreActionSnapshot(action) {
        return this.createSnapshot(`Перед: ${action}`);
    }

    // Создание снимка после важных операций
    createPostActionSnapshot(action) {
        return this.createSnapshot(`После: ${action}`);
    }
}
