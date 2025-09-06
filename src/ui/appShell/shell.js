// Основной компонент оболочки приложения
class AppShell {
    constructor() {
        this.isLoading = false;
        this.currentView = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.initializeApp();
    }

    setupEventListeners() {
        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Обработка видимости страницы
        document.addEventListener('visibilitychange', () => {
            this.handleVisibilityChange();
        });

        // Обработка ошибок
        window.addEventListener('error', (e) => {
            this.handleError(e.error);
        });

        // Обработка необработанных промисов
        window.addEventListener('unhandledrejection', (e) => {
            this.handleError(e.reason);
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Игнорируем если фокус на input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Глобальные горячие клавиши
            switch (e.key) {
                case 'F1':
                    e.preventDefault();
                    this.showHelp();
                    break;
                case 'F5':
                    e.preventDefault();
                    this.refreshData();
                    break;
                case 'Escape':
                    this.handleEscape();
                    break;
            }

            // Комбинации клавиш
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 's':
                        e.preventDefault();
                        this.saveAll();
                        break;
                    case 'n':
                        e.preventDefault();
                        this.createNew();
                        break;
                    case 'o':
                        e.preventDefault();
                        this.openFile();
                        break;
                    case 'e':
                        e.preventDefault();
                        this.exportData();
                        break;
                    case 'i':
                        e.preventDefault();
                        this.importData();
                        break;
                }
            }
        });
    }

    initializeApp() {
        // Показываем загрузочный экран
        this.showLoadingScreen();
        
        // Инициализируем приложение
        setTimeout(() => {
            this.hideLoadingScreen();
            this.showWelcomeMessage();
        }, 1000);
    }

    showLoadingScreen() {
        const loadingScreen = document.createElement('div');
        loadingScreen.id = 'loading-screen';
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <h2>LEGO Storage Mapper</h2>
                <p>Загрузка приложения...</p>
            </div>
        `;
        
        document.body.appendChild(loadingScreen);
        this.isLoading = true;
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.remove();
        }
        this.isLoading = false;
    }

    showWelcomeMessage() {
        if (window.app) {
            window.app.showNotification('Добро пожаловать в LEGO Storage Mapper!', 'success');
        }
    }

    handleResize() {
        // Обновляем размеры компонентов при изменении размера окна
        if (window.app && window.app.containerView) {
            window.app.containerView.updateGridSize();
        }
    }

    handleVisibilityChange() {
        if (document.hidden) {
            // Страница скрыта - сохраняем данные
            this.autoSave();
        } else {
            // Страница видна - обновляем данные
            this.refreshData();
        }
    }

    handleError(error) {
        console.error('Ошибка приложения:', error);
        
        if (window.app) {
            window.app.showNotification('Произошла ошибка: ' + error.message, 'error');
        }
    }

    handleEscape() {
        // Закрываем модальные окна
        if (window.app) {
            window.app.hideModal();
        }
        
        // Закрываем редакторы
        const cellEditor = document.querySelector('.cell-editor');
        if (cellEditor) {
            cellEditor.remove();
        }
    }

    // Методы для горячих клавиш
    showHelp() {
        const content = `
            <div class="help-content">
                <h3>Горячие клавиши</h3>
                <div class="shortcuts-list">
                    <div class="shortcut">
                        <kbd>Ctrl+N</kbd>
                        <span>Создать новый контейнер</span>
                    </div>
                    <div class="shortcut">
                        <kbd>Ctrl+S</kbd>
                        <span>Сохранить все изменения</span>
                    </div>
                    <div class="shortcut">
                        <kbd>Ctrl+O</kbd>
                        <span>Открыть файл</span>
                    </div>
                    <div class="shortcut">
                        <kbd>Ctrl+E</kbd>
                        <span>Экспорт данных</span>
                    </div>
                    <div class="shortcut">
                        <kbd>Ctrl+I</kbd>
                        <span>Импорт данных</span>
                    </div>
                    <div class="shortcut">
                        <kbd>F5</kbd>
                        <span>Обновить данные</span>
                    </div>
                    <div class="shortcut">
                        <kbd>Escape</kbd>
                        <span>Закрыть модальные окна</span>
                    </div>
                </div>
                <h3>Навигация</h3>
                <div class="shortcuts-list">
                    <div class="shortcut">
                        <kbd>Ctrl+1</kbd>
                        <span>Главная</span>
                    </div>
                    <div class="shortcut">
                        <kbd>Ctrl+2</kbd>
                        <span>Куча</span>
                    </div>
                    <div class="shortcut">
                        <kbd>Ctrl+3</kbd>
                        <span>Разделение</span>
                    </div>
                    <div class="shortcut">
                        <kbd>Ctrl+4</kbd>
                        <span>Дубликаты</span>
                    </div>
                    <div class="shortcut">
                        <kbd>Ctrl+5</kbd>
                        <span>Импорт</span>
                    </div>
                    <div class="shortcut">
                        <kbd>Ctrl+,</kbd>
                        <span>Настройки</span>
                    </div>
                </div>
            </div>
        `;

        if (window.app) {
            window.app.showModal('Справка', content);
        }
    }

    refreshData() {
        if (window.app) {
            window.app.loadMockData();
            window.app.updateViewContent(window.app.currentView);
            window.app.showNotification('Данные обновлены', 'success');
        }
    }

    saveAll() {
        if (window.app) {
            // Сохраняем все изменения
            if (window.app.containerView) {
                window.app.containerView.saveContainer();
            }
            
            window.app.showNotification('Все изменения сохранены', 'success');
        }
    }

    createNew() {
        if (window.app) {
            window.app.showAddContainerModal();
        }
    }

    openFile() {
        if (window.app && window.app.importView) {
            window.app.importView.importSettings();
        }
    }

    exportData() {
        if (window.app && window.app.importView) {
            window.app.importView.exportToJSON();
        }
    }

    importData() {
        if (window.app && window.app.importView) {
            window.app.importView.handleImport();
        }
    }

    autoSave() {
        // Автоматическое сохранение при скрытии страницы
        if (window.app && window.app.settings?.autoSave) {
            this.saveAll();
        }
    }

    // Методы для управления состоянием приложения
    setCurrentView(view) {
        this.currentView = view;
    }

    getCurrentView() {
        return this.currentView;
    }

    // Методы для показа уведомлений о состоянии
    showOfflineMessage() {
        if (window.app) {
            window.app.showNotification('Приложение работает в автономном режиме', 'warning');
        }
    }

    showOnlineMessage() {
        if (window.app) {
            window.app.showNotification('Соединение восстановлено', 'success');
        }
    }
}
