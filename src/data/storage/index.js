// Интерфейс для адаптеров хранения
class StorageAdapter {
    async loadProject() {
        throw new Error('loadProject method must be implemented');
    }

    async saveProject(project) {
        throw new Error('saveProject method must be implemented');
    }

    async loadContainer(id) {
        throw new Error('loadContainer method must be implemented');
    }

    async saveContainer(container) {
        throw new Error('saveContainer method must be implemented');
    }

    async exportAll() {
        throw new Error('exportAll method must be implemented');
    }

    async importAll(data) {
        throw new Error('importAll method must be implemented');
    }
}

// Фабрика адаптеров
class StorageAdapterFactory {
    static create(type) {
        switch (type) {
            case 'local':
                return new LocalStorageAdapter();
            case 'idb':
                return new IndexedDBAdapter();
            case 'firebase':
                return new FirebaseAdapter();
            default:
                throw new Error(`Unknown storage adapter type: ${type}`);
        }
    }
}
