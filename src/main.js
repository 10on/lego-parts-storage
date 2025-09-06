// Главный файл приложения
class LegoStorageApp {
    constructor() {
        this.currentView = 'home';
        this.containers = [];
        this.pileItems = [];
        this.mockData = new MockData();
        this.storage = null; // Инициализируем позже
        
        this.init();
    }

    async init() {
        console.log('🚀 Инициализация LEGO Storage Mapper');
        
        // Проверяем, что LoadingProgress загружен
        if (typeof LoadingProgress === 'undefined') {
            console.error('❌ LoadingProgress не загружен');
            return;
        }
        
        // Показываем прогресс инициализации
        const initProgress = LoadingProgress.createAppInitProgress();
        
        if (!initProgress) {
            console.error('❌ Не удалось создать прогресс-бар');
            return;
        }
        
        try {
            // Этап 1: Проверка локального хранилища
            initProgress.updateStep(0, 50, 'Поиск сохраненных данных...');
            this.storage = new LocalStorageAdapter();
            initProgress.completeStep(0, 'Хранилище готово');
            
            // Этап 2: Инициализация IndexedDB
            initProgress.updateStep(1, 50, 'Подключение к базе данных...');
            this.imageManager = new ImageManager();
            window.imageManager = this.imageManager;
            initProgress.completeStep(1, 'База данных подключена');
            
            // Этап 3: Загрузка каталога деталей
            initProgress.updateStep(2, 0, 'Загрузка данных BrickLink...');
            await this.loadBrickLinkData(false); // Отключаем LCX прогресс
            initProgress.updateStep(2, 50, 'Загрузка данных проекта...');
            await this.loadMockData();
            initProgress.completeStep(2, 'Данные загружены');
            
            // Этап 4: Инициализация компонентов
            initProgress.updateStep(3, 25, 'Создание интерфейса...');
            this.sidebar = new Sidebar();
            this.homeView = new HomeView();
            this.containerView = new ContainerView();
            this.pileView = new PileView();
            this.splitView = new SplitView();
            this.duplicatesView = new DuplicatesView();
            this.importView = new ImportView();
            this.settingsView = new SettingsView();
            
            initProgress.updateStep(3, 75, 'Настройка навигации...');
            this.setupEventListeners();
            this.router = new Router();
            this.router.init();
            
            initProgress.updateStep(3, 100, 'Показ интерфейса...');
            this.showView('home');
            
            initProgress.completeStep(3, 'Приложение готово!');
            
            console.log('✅ Приложение инициализировано');
            
            // Скрываем прогресс через 1 секунду
            setTimeout(() => {
                initProgress.hide();
            }, 1000);
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            initProgress.showError(initProgress.currentStep, error.message);
            setTimeout(() => {
                initProgress.hide();
            }, 3000);
        }
    }

    async loadBrickLinkData(showProgress = true) {
        try {
            console.log('📦 Загрузка данных BrickLink...');
            await window.brickLinkData.loadData(showProgress);
        } catch (error) {
            console.error('❌ Ошибка загрузки данных BrickLink:', error);
            this.showNotification('Ошибка загрузки данных каталога. Некоторые функции могут быть недоступны.', 'warning');
            // Приложение может работать и без BrickLink данных
        }
    }

    async loadMockData() {
        try {
            // Загружаем данные из LocalStorage
            const project = await this.storage.loadProject();
            
            // Проверяем, есть ли вообще сохраненный проект
            const hasExistingProject = localStorage.getItem('lego-storage-project') !== null;
            
            if (project.containers && project.containers.length > 0) {
                // Данные уже есть - загружаем их
                this.containers = project.containers;
                this.pileItems = project.pileItems || [];
                console.log('📦 Загружены данные из LocalStorage:', this.containers.length, 'контейнеров');
            } else if (!hasExistingProject) {
                // Совсем новый пользователь (никогда не было localStorage) - создаем тестовые данные
                this.containers = this.mockData.getContainers();
                this.pileItems = this.mockData.getPileItems();
                
                // Сохраняем тестовые данные в LocalStorage
                await this.saveProject();
                console.log('🆕 Созданы тестовые данные для нового пользователя:', this.containers.length, 'контейнеров');
            } else {
                // Проект существует, но контейнеры пусты (пользователь удалил все) - оставляем пустым
                this.containers = [];
                this.pileItems = project.pileItems || [];
                console.log('📂 Проект существует, но контейнеры отсутствуют (удалены пользователем)');
            }
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            // В случае ошибки проверяем, есть ли хоть что-то в localStorage
            const hasAnyData = localStorage.getItem('lego-storage-project') !== null;
            
            if (!hasAnyData) {
                // Если совсем ничего нет - создаем тестовые данные
                this.containers = this.mockData.getContainers();
                this.pileItems = this.mockData.getPileItems();
                console.log('🔧 Ошибка загрузки + нет данных: созданы тестовые данные');
            } else {
                // Если данные есть, но не загружаются - оставляем пустыми
                this.containers = [];
                this.pileItems = [];
                console.log('🔧 Ошибка загрузки существующих данных: оставляем пустыми');
            }
        }
    }

    setupEventListeners() {
        // Навигация
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                this.showView(view);
            });
        });

        // Кнопки действий
        document.getElementById('add-container-btn')?.addEventListener('click', () => {
            this.showAddContainerModal();
        });

        document.getElementById('back-to-home')?.addEventListener('click', () => {
            this.showView('home');
        });

        // Модальные окна
        document.getElementById('modal-close')?.addEventListener('click', () => {
            this.hideModal();
        });

        document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.hideModal();
            }
        });
    }

    showView(viewName) {
        // Скрыть все виды
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });

        // Показать выбранный вид
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.add('active');
            this.currentView = viewName;
            
            // Обновить навигацию
            document.querySelectorAll('.nav-link').forEach(link => {
                link.classList.remove('active');
            });
            document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');
            
            // Обновить содержимое вида
            this.updateViewContent(viewName);
        }
    }

    getCurrentView() {
        return this.currentView;
    }

    updateViewContent(viewName) {
        switch (viewName) {
            case 'home':
                this.homeView.render(this.containers);
                break;
            case 'containers':
                this.showView('home'); // Пока что перенаправляем на home
                break;
            case 'pile':
                this.pileView.render(this.pileItems);
                break;
            case 'split':
                this.splitView.render();
                break;
            case 'duplicates':
                this.duplicatesView.render();
                break;
            case 'import':
                this.importView.render();
                break;
            case 'settings':
                this.settingsView.render();
                break;
        }
    }

    showModal(title, content) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = content;
        document.getElementById('modal-overlay').classList.add('active');
    }

    hideModal() {
        document.getElementById('modal-overlay').classList.remove('active');
    }

    showAddContainerModal() {
        const content = `
            <form id="add-container-form">
                <div class="form-group">
                    <label class="form-label">Название контейнера</label>
                    <input type="text" class="form-input" id="container-name" placeholder="Моя кассетница" required>
                </div>
                <div class="form-group">
                    <label class="form-label">Тип</label>
                    <select class="form-select" id="container-type">
                        <option value="cabinet">Кассетница</option>
                        <option value="box">Коробка</option>
                        <option value="pile">Куча</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Размер сетки</label>
                    <div class="form-row">
                        <div class="form-group">
                            <input type="number" class="form-input" id="grid-rows" placeholder="Строки" value="8" min="1" max="50">
                        </div>
                        <div class="form-group">
                            <input type="number" class="form-input" id="grid-cols" placeholder="Столбцы" value="4" min="1" max="50">
                        </div>
                    </div>
                    <div class="form-help">
                        <small>Максимум: 50×50 ячеек. Рекомендуется не более 20×20 для производительности.</small>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Цвет контейнера</label>
                    <div class="color-picker-container">
                        <input type="color" class="color-picker" id="container-color" value="#e0e0e0">
                        <input type="text" class="form-input color-input" id="container-color-hex" placeholder="#e0e0e0" value="#e0e0e0">
                        <button type="button" class="btn btn-outline btn-sm" id="clear-color">Очистить</button>
                    </div>
                    <div class="color-preview" id="color-preview">
                        <div class="preview-label">Предпросмотр:</div>
                        <div class="preview-grid" id="preview-grid"></div>
                    </div>
                </div>
                <div class="form-group">
                    <button type="submit" class="btn btn-primary">Создать контейнер</button>
                </div>
            </form>
        `;
        
        this.showModal('Добавить контейнер', content);
        
        // Обработчик формы
        document.getElementById('add-container-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createContainer();
        });
        
        // Обработчики color picker
        this.setupColorPicker();
    }

    setupColorPicker() {
        const colorPicker = document.getElementById('container-color');
        const colorInput = document.getElementById('container-color-hex');
        const clearBtn = document.getElementById('clear-color');
        const rowsInput = document.getElementById('grid-rows');
        const colsInput = document.getElementById('grid-cols');
        
        // Синхронизация color picker и text input
        colorPicker.addEventListener('input', (e) => {
            colorInput.value = e.target.value;
            this.updateColorPreview();
        });
        
        colorInput.addEventListener('input', (e) => {
            if (this.isValidHex(e.target.value)) {
                colorPicker.value = e.target.value;
                this.updateColorPreview();
            }
        });
        
        // Кнопка очистки цвета
        clearBtn.addEventListener('click', () => {
            colorPicker.value = '#e0e0e0';
            colorInput.value = '#e0e0e0';
            this.updateColorPreview();
        });
        
        // Обновление предпросмотра при изменении размера
        rowsInput.addEventListener('input', () => this.updateColorPreview());
        colsInput.addEventListener('input', () => this.updateColorPreview());
        
        // Начальный предпросмотр
        this.updateColorPreview();
    }
    
    isValidHex(hex) {
        return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(hex);
    }
    
    updateColorPreview() {
        const rows = parseInt(document.getElementById('grid-rows').value) || 8;
        const cols = parseInt(document.getElementById('grid-cols').value) || 4;
        const color = document.getElementById('container-color').value;
        const previewGrid = document.getElementById('preview-grid');
        
        if (!previewGrid) return;
        
        previewGrid.innerHTML = '';
        previewGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        previewGrid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        previewGrid.style.backgroundColor = color;
        previewGrid.style.border = `2px solid ${this.darkenColor(color, 20)}`;
        
        // Создаем ячейки
        for (let i = 0; i < rows * cols; i++) {
            const cell = document.createElement('div');
            cell.className = 'preview-cell';
            cell.style.backgroundColor = 'white';
            cell.style.border = '1px solid #ddd';
            cell.style.minHeight = '8px';
            cell.style.minWidth = '8px';
            previewGrid.appendChild(cell);
        }
    }
    
    darkenColor(color, percent) {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
    }

    async createContainer() {
        const name = document.getElementById('container-name').value;
        const type = document.getElementById('container-type').value;
        const rows = parseInt(document.getElementById('grid-rows').value);
        const cols = parseInt(document.getElementById('grid-cols').value);
        const color = document.getElementById('container-color').value;
        
        const container = {
            id: Date.now().toString(),
            name,
            type,
            rows,
            cols,
            color,
            cells: Array(rows * cols).fill(null),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.containers.push(container);
        this.hideModal();
        this.updateViewContent('home');
        
        // Автоматическое сохранение
        await this.autoSave();
        
        this.showNotification('Контейнер создан!', 'success');
    }

    async saveProject() {
        try {
            const project = {
                containers: this.containers,
                pileItems: this.pileItems,
                settings: {
                    storageAdapter: 'local',
                    imageSource: 'bricklink',
                    theme: 'light'
                },
                updatedAt: new Date().toISOString(),
                version: '1.0'
            };
            
            await this.storage.saveProject(project);
            console.log('💾 Проект сохранен в LocalStorage');
            return true;
        } catch (error) {
            console.error('Ошибка сохранения проекта:', error);
            this.showNotification('Ошибка сохранения данных', 'error');
            return false;
        }
    }

    async loadProject() {
        try {
            const project = await this.storage.loadProject();
            this.containers = project.containers || [];
            this.pileItems = project.pileItems || [];
            console.log('📦 Проект загружен из LocalStorage');
            return true;
        } catch (error) {
            console.error('Ошибка загрузки проекта:', error);
            this.showNotification('Ошибка загрузки данных', 'error');
            return false;
        }
    }

    // Автоматическое сохранение при изменениях
    async autoSave() {
        if (this.autoSaveTimeout) {
            clearTimeout(this.autoSaveTimeout);
        }
        
        this.autoSaveTimeout = setTimeout(async () => {
            await this.saveProject();
        }, 1000); // Сохраняем через 1 секунду после последнего изменения
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-header">
                <div class="notification-title">${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} Уведомление</div>
                <button class="notification-close">&times;</button>
            </div>
            <div class="notification-message">${message}</div>
        `;
        
        document.body.appendChild(notification);
        
        // Автоматическое удаление через 3 секунды
        setTimeout(() => {
            notification.remove();
        }, 3000);
        
        // Удаление по клику
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }
}

// Запуск приложения при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    window.app = new LegoStorageApp();
});
