// Адаптер для IndexedDB (заглушка)
class IndexedDBAdapter extends StorageAdapter {
    constructor() {
        super();
        this.dbName = 'LegoStorageDB';
        this.dbVersion = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Создаем хранилища объектов
                if (!db.objectStoreNames.contains('containers')) {
                    db.createObjectStore('containers', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('pileItems')) {
                    db.createObjectStore('pileItems', { keyPath: 'id' });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async loadProject() {
        if (!this.db) {
            await this.init();
        }
        
        try {
            const containers = await this.getAll('containers');
            const pileItems = await this.getAll('pileItems');
            const settings = await this.getSettings();
            
            return {
                containers,
                pileItems,
                settings,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: '1.0'
            };
        } catch (error) {
            console.error('Ошибка загрузки проекта:', error);
            return this.getDefaultProject();
        }
    }

    async saveProject(project) {
        if (!this.db) {
            await this.init();
        }
        
        try {
            await this.clear('containers');
            await this.clear('pileItems');
            
            for (const container of project.containers) {
                await this.put('containers', container);
            }
            
            for (const item of project.pileItems) {
                await this.put('pileItems', item);
            }
            
            await this.saveSettings(project.settings);
            return true;
        } catch (error) {
            console.error('Ошибка сохранения проекта:', error);
            return false;
        }
    }

    async loadContainer(id) {
        if (!this.db) {
            await this.init();
        }
        
        return await this.get('containers', id);
    }

    async saveContainer(container) {
        if (!this.db) {
            await this.init();
        }
        
        return await this.put('containers', container);
    }

    async exportAll() {
        const project = await this.loadProject();
        const blob = new Blob([JSON.stringify(project, null, 2)], { 
            type: 'application/json' 
        });
        return blob;
    }

    async importAll(data) {
        try {
            let projectData;
            
            if (typeof data === 'string') {
                projectData = JSON.parse(data);
            } else if (data instanceof File) {
                const text = await data.text();
                projectData = JSON.parse(text);
            } else {
                projectData = data;
            }
            
            return await this.saveProject(projectData);
        } catch (error) {
            console.error('Ошибка импорта данных:', error);
            return false;
        }
    }

    // Вспомогательные методы для работы с IndexedDB
    async get(storeName, key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async clear(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.clear();
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getSettings() {
        const settings = await this.getAll('settings');
        const settingsObj = {};
        settings.forEach(setting => {
            settingsObj[setting.key] = setting.value;
        });
        return settingsObj;
    }

    async saveSettings(settings) {
        for (const [key, value] of Object.entries(settings)) {
            await this.put('settings', { key, value });
        }
    }

    async clearAll() {
        if (!this.db) {
            await this.init();
        }
        
        try {
            // Очищаем все хранилища объектов
            await this.clear('containers');
            await this.clear('pileItems');
            await this.clear('settings');
            return true;
        } catch (error) {
            console.error('Ошибка очистки данных IndexedDB:', error);
            return false;
        }
    }

    getDefaultProject() {
        return {
            containers: [],
            pileItems: [],
            settings: {
                storageAdapter: 'idb',
                imageSource: 'bricklink',
                theme: 'light'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: '1.0'
        };
    }
}
