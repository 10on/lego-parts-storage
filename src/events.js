// Глобальные обработчики событий
class EventManager {
    constructor() {
        this.handlers = new Map();
        this.init();
    }

    init() {
        // Горячие клавиши
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Обработка кликов вне элементов
        document.addEventListener('click', (e) => {
            this.handleGlobalClick(e);
        });

        // Обработка изменения размера окна
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    handleKeyboardShortcuts(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        switch (e.key) {
            case 'Escape':
                this.handleEscape();
                break;
            case 'Enter':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.handleCtrlEnter();
                }
                break;
        }
    }

    handleGlobalClick(e) {
        // Закрытие модальных окон
        if (e.target.classList.contains('modal-overlay')) {
            if (window.app) {
                window.app.hideModal();
            }
        }

        // Закрытие уведомлений
        if (e.target.classList.contains('notification-close')) {
            e.target.closest('.notification')?.remove();
        }
    }

    handleResize() {
        // Обновление размеров сетки при изменении размера окна
        if (window.app && window.app.containerView) {
            window.app.containerView.updateGridSize();
        }
    }

    handleEscape() {
        // Закрытие модальных окон и редакторов
        if (window.app) {
            window.app.hideModal();
        }
        
        // Закрытие редактора ячеек
        const cellEditor = document.querySelector('.cell-editor');
        if (cellEditor) {
            cellEditor.remove();
        }
    }

    handleCtrlEnter() {
        if (window.app) {
            const currentView = window.app.getCurrentView();
            if (currentView === 'container') {
                window.app.containerView.saveContainer();
            }
        }
    }

    // Регистрация обработчиков событий
    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        this.handlers.get(event).push(handler);
    }

    off(event, handler) {
        if (this.handlers.has(event)) {
            const handlers = this.handlers.get(event);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).forEach(handler => {
                handler(data);
            });
        }
    }
}

new EventManager();
