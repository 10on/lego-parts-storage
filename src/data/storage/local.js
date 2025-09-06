// Адаптер для LocalStorage
class LocalStorageAdapter extends StorageAdapter {
    constructor() {
        super();
        this.storageKey = 'lego-storage-project';
    }

    async loadProject() {
        try {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                return JSON.parse(data);
            }
            return this.getDefaultProject();
        } catch (error) {
            console.error('Ошибка загрузки проекта:', error);
            return this.getDefaultProject();
        }
    }

    async saveProject(project) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(project));
            return true;
        } catch (error) {
            console.error('Ошибка сохранения проекта:', error);
            return false;
        }
    }

    async loadContainer(id) {
        const project = await this.loadProject();
        return project.containers.find(container => container.id === id);
    }

    async saveContainer(container) {
        const project = await this.loadProject();
        const index = project.containers.findIndex(c => c.id === container.id);
        
        if (index !== -1) {
            project.containers[index] = container;
        } else {
            project.containers.push(container);
        }
        
        return await this.saveProject(project);
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

    getDefaultProject() {
        return {
            containers: [],
            pileItems: [],
            settings: {
                storageAdapter: 'local',
                imageSource: 'bricklink',
                theme: 'light'
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            version: '1.0'
        };
    }

    // Дополнительные методы для работы с LocalStorage
    async clearAll() {
        try {
            localStorage.removeItem(this.storageKey);
            return true;
        } catch (error) {
            console.error('Ошибка очистки данных:', error);
            return false;
        }
    }

    async getStorageSize() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? new Blob([data]).size : 0;
        } catch (error) {
            console.error('Ошибка получения размера хранилища:', error);
            return 0;
        }
    }

    async isStorageAvailable() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }
}
