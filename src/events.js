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
        // Игнорируем если фокус на input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (e.key) {
            case '/':
                e.preventDefault();
                this.focusSearch();
                break;
                
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

        // Комбинации клавиш
        if (e.altKey) {
            switch (e.key) {
                case 'ArrowRight':
                    e.preventDefault();
                    this.handleAltArrowRight();
                    break;
            }
        }

        if (e.shiftKey) {
            switch (e.key) {
                case 'ArrowRight':
                    e.preventDefault();
                    this.handleShiftArrowRight();
                    break;
            }
        }

        if (e.key === 'x' || e.key === 'X') {
            e.preventDefault();
            this.handleSwapCells();
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

    // Обработчики горячих клавиш
    focusSearch() {
        // Поиск будет реализован позже
        console.log('🔍 Фокус на поиск');
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
        // Сохранение текущих изменений
        if (window.app) {
            const currentView = window.app.getCurrentView();
            if (currentView === 'container') {
                window.app.containerView.save();
            }
        }
    }

    handleAltArrowRight() {
        // Копирование элемента
        console.log('📋 Копирование элемента');
    }

    handleShiftArrowRight() {
        // Перемещение элемента
        console.log('↔️ Перемещение элемента');
    }

    handleSwapCells() {
        // Обмен ячеек
        console.log('🔄 Обмен ячеек');
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

// Создаем глобальный экземпляр менеджера событий
window.eventManager = new EventManager();
