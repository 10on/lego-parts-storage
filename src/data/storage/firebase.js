// Адаптер для Firebase (заглушка)
class FirebaseAdapter extends StorageAdapter {
    constructor() {
        super();
        this.initialized = false;
        this.db = null;
    }

    async init() {
        if (this.initialized) return;
        
        // Проверяем, доступен ли Firebase
        if (typeof firebase === 'undefined') {
            throw new Error('Firebase SDK не загружен');
        }
        
        try {
            // Инициализация Firebase (заглушка)
            this.db = firebase.firestore();
            this.initialized = true;
        } catch (error) {
            console.error('Ошибка инициализации Firebase:', error);
            throw error;
        }
    }

    async loadProject() {
        if (!this.initialized) {
            await this.init();
        }
        
        try {
            const containersSnapshot = await this.db.collection('containers').get();
            const pileItemsSnapshot = await this.db.collection('pileItems').get();
            const settingsSnapshot = await this.db.collection('settings').get();
            
            const containers = [];
            const pileItems = [];
            const settings = {};
            
            containersSnapshot.forEach(doc => {
                containers.push({ id: doc.id, ...doc.data() });
            });
            
            pileItemsSnapshot.forEach(doc => {
                pileItems.push({ id: doc.id, ...doc.data() });
            });
            
            settingsSnapshot.forEach(doc => {
                settings[doc.id] = doc.data().value;
            });
            
            return {
                containers,
                pileItems,
                settings,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                version: '1.0'
            };
        } catch (error) {
            console.error('Ошибка загрузки проекта из Firebase:', error);
            return this.getDefaultProject();
        }
    }

    async saveProject(project) {
        if (!this.initialized) {
            await this.init();
        }
        
        try {
            const batch = this.db.batch();
            
            // Очищаем существующие данные
            const containersSnapshot = await this.db.collection('containers').get();
            const pileItemsSnapshot = await this.db.collection('pileItems').get();
            const settingsSnapshot = await this.db.collection('settings').get();
            
            containersSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            pileItemsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            settingsSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });
            
            // Добавляем новые данные
            project.containers.forEach(container => {
                const docRef = this.db.collection('containers').doc(container.id);
                batch.set(docRef, container);
            });
            
            project.pileItems.forEach(item => {
                const docRef = this.db.collection('pileItems').doc(item.id);
                batch.set(docRef, item);
            });
            
            Object.entries(project.settings).forEach(([key, value]) => {
                const docRef = this.db.collection('settings').doc(key);
                batch.set(docRef, { value });
            });
            
            await batch.commit();
            return true;
        } catch (error) {
            console.error('Ошибка сохранения проекта в Firebase:', error);
            return false;
        }
    }

    async loadContainer(id) {
        if (!this.initialized) {
            await this.init();
        }
        
        try {
            const doc = await this.db.collection('containers').doc(id).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Ошибка загрузки контейнера из Firebase:', error);
            return null;
        }
    }

    async saveContainer(container) {
        if (!this.initialized) {
            await this.init();
        }
        
        try {
            await this.db.collection('containers').doc(container.id).set(container);
            return true;
        } catch (error) {
            console.error('Ошибка сохранения контейнера в Firebase:', error);
            return false;
        }
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
            console.error('Ошибка импорта данных в Firebase:', error);
            return false;
        }
    }

    // Дополнительные методы для Firebase
    async isOnline() {
        try {
            if (!this.initialized) {
                await this.init();
            }
            return this.db.app.options.projectId !== undefined;
        } catch (error) {
            return false;
        }
    }

    async syncWithServer() {
        if (!this.initialized) {
            await this.init();
        }
        
        try {
            // Синхронизация с сервером
            const project = await this.loadProject();
            return await this.saveProject(project);
        } catch (error) {
            console.error('Ошибка синхронизации с сервером:', error);
            return false;
        }
    }

    getDefaultProject() {
        return {
            containers: [],
            pileItems: [],
            settings: {
                storageAdapter: 'firebase',
                imageSource: 'bricklink',
                theme: 'light'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: '1.0'
        };
    }
}
