// Главный файл приложения
class LegoStorageApp {
    constructor() {
        this.currentView = 'home';
        this.containers = [];
        this.pileItems = [];
        this.mockData = new MockData();
        
        this.init();
    }

    async init() {
        console.log('🚀 Инициализация LEGO Storage Mapper');
        
        // Инициализация компонентов
        this.router = new Router();
        this.sidebar = new Sidebar();
        this.homeView = new HomeView();
        this.containerView = new ContainerView();
        this.pileView = new PileView();
        this.splitView = new SplitView();
        this.duplicatesView = new DuplicatesView();
        this.importView = new ImportView();
        this.settingsView = new SettingsView();
        
        // Загрузка тестовых данных
        await this.loadMockData();
        
        // Инициализация событий
        this.setupEventListeners();
        
        // Показ начального экрана
        this.showView('home');
        
        console.log('✅ Приложение инициализировано');
    }

    async loadMockData() {
        this.containers = this.mockData.getContainers();
        this.pileItems = this.mockData.getPileItems();
        console.log('📦 Загружены тестовые данные:', this.containers.length, 'контейнеров');
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
                            <input type="number" class="form-input" id="grid-rows" placeholder="Строки" value="6" min="1" max="20">
                        </div>
                        <div class="form-group">
                            <input type="number" class="form-input" id="grid-cols" placeholder="Столбцы" value="8" min="1" max="20">
                        </div>
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
    }

    createContainer() {
        const name = document.getElementById('container-name').value;
        const type = document.getElementById('container-type').value;
        const rows = parseInt(document.getElementById('grid-rows').value);
        const cols = parseInt(document.getElementById('grid-cols').value);
        
        const container = {
            id: Date.now().toString(),
            name,
            type,
            rows,
            cols,
            cells: Array(rows * cols).fill(null),
            createdAt: new Date().toISOString()
        };
        
        this.containers.push(container);
        this.hideModal();
        this.updateViewContent('home');
        
        this.showNotification('Контейнер создан!', 'success');
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
