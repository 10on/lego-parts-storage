import { IndexedDBAdapter } from './idb.js';
import { LocalStorageAdapter } from './local.js';

// Фабрика адаптеров
export class StorageAdapterFactory {
    static create(type) {
        switch (type) {
            case 'local':
                return new LocalStorageAdapter();
            case 'idb':
                return new IndexedDBAdapter();
            default:
                throw new Error(`Unknown storage adapter type: ${type}`);
        }
    }
}
