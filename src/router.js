// Роутер для навигации между видами
class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
    }

    init() {
        // Обработка изменения hash
        window.addEventListener('hashchange', () => {
            this.handleRouteChange();
        });

        // Обработка кнопок браузера
        window.addEventListener('popstate', () => {
            this.handleRouteChange();
        });

        // Инициализация маршрутов
        this.setupRoutes();
        
        // Обработка начального маршрута с задержкой
        setTimeout(() => {
            this.handleRouteChange();
        }, 100);
    }

    setupRoutes() {
        this.routes.set('home', {
            view: 'home',
            title: 'Главная'
        });
        
        this.routes.set('containers', {
            view: 'home',
            title: 'Контейнеры'
        });
        
        this.routes.set('container', {
            view: 'container',
            title: 'Контейнер'
        });
        
        this.routes.set('pile', {
            view: 'pile',
            title: 'Куча деталей'
        });
        
        this.routes.set('split', {
            view: 'split',
            title: 'Перестановка'
        });
        
        this.routes.set('duplicates', {
            view: 'duplicates',
            title: 'Дубликаты'
        });
        
        this.routes.set('import', {
            view: 'import',
            title: 'Импорт'
        });
        
        this.routes.set('settings', {
            view: 'settings',
            title: 'Настройки'
        });
    }

    handleRouteChange() {
        const hash = window.location.hash.slice(1) || 'home';
        
        // Проверяем, является ли это маршрутом контейнера с ID
        if (hash.startsWith('container/')) {
            const containerId = hash.split('/')[1];
            this.navigateToContainer(containerId);
            return;
        }
        
        const route = this.routes.get(hash);
        
        if (route) {
            this.navigate(route.view, route.title);
        } else {
            // Неизвестный маршрут - перенаправляем на главную
            this.navigate('home', 'Главная');
        }
    }

    navigate(view, title) {
        if (this.currentRoute !== view) {
            this.currentRoute = view;
            
            // Обновляем заголовок страницы
            document.title = `${title} - LEGO Storage Mapper`;
            
            // Уведомляем приложение о смене маршрута
            if (window.app && typeof window.app.showView === 'function') {
                window.app.showView(view);
            }
        }
    }

    goTo(view) {
        const route = Array.from(this.routes.entries()).find(([key, value]) => value.view === view);
        if (route) {
            // Обновляем hash, что вызовет hashchange event
            window.location.hash = route[0];
        }
    }

    getCurrentView() {
        return this.currentRoute;
    }

    navigateToContainer(containerId) {
        // Находим контейнер по ID
        if (window.app && window.app.containers) {
            const container = window.app.containers.find(c => c.id === containerId);
            if (container) {
                // Устанавливаем контейнер и переключаемся на вид
                window.app.containerView.setContainer(container);
                this.navigate('container', `Контейнер: ${container.name}`);
            } else {
                // Контейнер не найден - перенаправляем на главную
                this.navigate('home', 'Главная');
            }
        } else {
            // Приложение не готово - перенаправляем на главную
            this.navigate('home', 'Главная');
        }
    }
}
