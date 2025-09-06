// Компонент боковой панели навигации
class Sidebar {
    constructor() {
        this.isCollapsed = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateActiveState();
    }

    setupEventListeners() {
        // Обработка кликов по ссылкам навигации
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNavigation(link);
            });
        });

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Обработка горячих клавиш для навигации
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.navigateToView('home');
                        break;
                    case '2':
                        e.preventDefault();
                        this.navigateToView('pile');
                        break;
                    case '3':
                        e.preventDefault();
                        this.navigateToView('split');
                        break;
                    case '4':
                        e.preventDefault();
                        this.navigateToView('duplicates');
                        break;
                    case '5':
                        e.preventDefault();
                        this.navigateToView('import');
                        break;
                    case ',':
                        e.preventDefault();
                        this.navigateToView('settings');
                        break;
                }
            }
        });
    }

    handleNavigation(link) {
        const view = link.dataset.view;
        
        // Обновляем активное состояние
        this.setActiveLink(link);
        
        // Переключаемся на вид
        if (window.app) {
            window.app.showView(view);
        }
    }

    setActiveLink(activeLink) {
        // Убираем активный класс со всех ссылок
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        // Добавляем активный класс к выбранной ссылке
        activeLink.classList.add('active');
    }

    navigateToView(viewName) {
        const link = document.querySelector(`[data-view="${viewName}"]`);
        if (link) {
            this.handleNavigation(link);
        }
    }

    updateActiveState() {
        // Обновляем активное состояние на основе текущего вида
        const currentView = window.app?.currentView || 'home';
        const activeLink = document.querySelector(`[data-view="${currentView}"]`);
        if (activeLink) {
            this.setActiveLink(activeLink);
        }
    }

    handleResize() {
        // Адаптивное поведение для мобильных устройств
        if (window.innerWidth <= 768) {
            this.collapse();
        } else {
            this.expand();
        }
    }

    collapse() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.add('collapsed');
            this.isCollapsed = true;
        }
    }

    expand() {
        const sidebar = document.getElementById('sidebar');
        if (sidebar) {
            sidebar.classList.remove('collapsed');
            this.isCollapsed = false;
        }
    }

    toggle() {
        if (this.isCollapsed) {
            this.expand();
        } else {
            this.collapse();
        }
    }

    // Методы для обновления счетчиков и уведомлений
    updateContainerCount(count) {
        const homeLink = document.querySelector('[data-view="home"]');
        if (homeLink) {
            this.updateLinkBadge(homeLink, count);
        }
    }

    updatePileCount(count) {
        const pileLink = document.querySelector('[data-view="pile"]');
        if (pileLink) {
            this.updateLinkBadge(pileLink, count);
        }
    }

    updateDuplicatesCount(count) {
        const duplicatesLink = document.querySelector('[data-view="duplicates"]');
        if (duplicatesLink) {
            this.updateLinkBadge(duplicatesLink, count);
        }
    }

    updateLinkBadge(link, count) {
        // Удаляем существующий badge
        const existingBadge = link.querySelector('.nav-badge');
        if (existingBadge) {
            existingBadge.remove();
        }

        // Добавляем новый badge если есть счетчик
        if (count > 0) {
            const badge = document.createElement('span');
            badge.className = 'nav-badge';
            badge.textContent = count;
            link.appendChild(badge);
        }
    }

    // Методы для показа уведомлений о новых функциях
    showFeatureNotification(feature, message) {
        const link = document.querySelector(`[data-view="${feature}"]`);
        if (link) {
            const notification = document.createElement('span');
            notification.className = 'nav-notification';
            notification.textContent = '!';
            notification.title = message;
            link.appendChild(notification);
        }
    }

    hideFeatureNotification(feature) {
        const link = document.querySelector(`[data-view="${feature}"]`);
        if (link) {
            const notification = link.querySelector('.nav-notification');
            if (notification) {
                notification.remove();
            }
        }
    }
}
