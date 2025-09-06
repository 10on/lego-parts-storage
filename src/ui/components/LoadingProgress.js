/**
 * LoadingProgress Component
 * Компонент для отображения прогресса загрузки данных с детализацией по этапам
 */

class LoadingProgress {
    constructor() {
        this.isVisible = false;
        this.currentStep = 0;
        this.totalSteps = 0;
        this.stepDetails = [];
        this.onCancel = null;
    }

    /**
     * Показать экран загрузки
     */
    show(steps, options = {}) {
        this.stepDetails = steps;
        this.totalSteps = steps.length;
        this.currentStep = 0;
        this.onCancel = options.onCancel || null;
        
        this.createProgressModal();
        this.isVisible = true;
        
        console.log('🔄 Loading progress started:', steps.map(s => s.title));
        
        // Возвращаем this для цепочки вызовов
        return this;
    }

    /**
     * Скрыть экран загрузки
     */
    hide() {
        const modal = document.getElementById('loading-progress-modal');
        if (modal) {
            modal.classList.remove('show');
            modal.classList.add('hide');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.remove();
                }
            }, 300);
        }
        this.isVisible = false;
        console.log('✅ Loading progress completed');
    }

    /**
     * Обновить прогресс текущего шага
     */
    updateStep(stepIndex, progress, details = '') {
        if (!this.isVisible) return;

        this.currentStep = stepIndex;
        
        // Добавляем отладочную информацию
        console.log(`🔄 Progress update: Step ${stepIndex}, Progress ${progress}%, Details: ${details}`);
        
        // Плавно обновляем прогресс
        this.renderCurrentStep(stepIndex, progress, details);
    }

    /**
     * Рендер текущего шага
     */
    renderCurrentStep(stepIndex, progress, details = '') {
        const container = document.getElementById('current-step-container');
        if (!container) return;

        const step = this.stepDetails[stepIndex];
        if (!step) return;

        const isCompleted = progress >= 100;
        const stepClass = isCompleted ? 'completed' : 'active';
        
        // Проверяем, существует ли уже элемент прогресса
        const existingStep = container.querySelector('.progress-step');
        const existingProgressBar = container.querySelector('.progress-bar');
        const shouldAnimate = existingProgressBar && progress > 0;
        
        // Если это новый шаг, создаем новый элемент
        if (!existingStep || existingStep.dataset.stepIndex !== stepIndex.toString()) {
            container.innerHTML = `
                <div class="progress-step ${stepClass}" data-step-index="${stepIndex}">
                    <div class="step-header">
                        <div class="step-number">${stepIndex + 1}</div>
                        <div class="step-info">
                            <div class="step-title">${step.title}</div>
                            <div class="step-description">${step.description}</div>
                        </div>
                    </div>
                    <div class="step-progress">
                        <div class="progress-bar-container">
                            <div class="progress-bar-bg">
                                <div class="progress-bar" style="width: ${Math.min(100, Math.max(0, progress))}%"></div>
                            </div>
                        </div>
                        <div class="progress-details">${details || 'Ожидание...'}</div>
                    </div>
                </div>
            `;
        } else {
            // Обновляем существующий элемент
            const stepElement = container.querySelector('.progress-step');
            const progressBar = container.querySelector('.progress-bar');
            const progressDetails = container.querySelector('.progress-details');
            
            // Обновляем класс шага
            stepElement.className = `progress-step ${stepClass}`;
            
            // Обновляем прогресс-бар с анимацией
            if (progressBar) {
                progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
            }
            
            // Обновляем детали
            if (progressDetails) {
                progressDetails.textContent = details || 'Ожидание...';
            }
        }
        
        // Добавляем анимацию для плавного перехода
        if (shouldAnimate) {
            const progressBar = container.querySelector('.progress-bar');
            if (progressBar) {
                progressBar.style.transition = 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            }
        }
    }

    /**
     * Завершить текущий шаг
     */
    completeStep(stepIndex, details = 'Завершено') {
        this.updateStep(stepIndex, 100, details);
        
        // Автоматически переходим к следующему шагу
        if (stepIndex < this.totalSteps - 1) {
            setTimeout(() => {
                this.updateStep(stepIndex + 1, 0, 'Начинаем...');
            }, 500);
        }
    }

    /**
     * Показать ошибку на определенном шаге
     */
    showError(stepIndex, errorMessage) {
        this.renderCurrentStep(stepIndex, 0, `❌ ${errorMessage}`);
        
        // Обновляем класс контейнера для ошибки
        const container = document.getElementById('current-step-container');
        if (container) {
            const stepElement = container.querySelector('.progress-step');
            if (stepElement) {
                stepElement.className = 'progress-step error';
            }
        }
    }


    /**
     * Создать модальное окно прогресса
     */
    createProgressModal() {
        const existingModal = document.getElementById('loading-progress-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'loading-progress-modal';
        modal.className = 'loading-progress-modal';
        modal.innerHTML = this.renderProgressModal();

        document.body.appendChild(modal);
        
        // Добавляем обработчик кнопки отмены
        const cancelBtn = document.getElementById('loading-cancel-btn');
        if (cancelBtn && this.onCancel) {
            cancelBtn.addEventListener('click', () => {
                if (this.onCancel) {
                    this.onCancel();
                }
                this.hide();
            });
        }

        // Показываем модальное окно с анимацией
        requestAnimationFrame(() => {
            modal.classList.add('show');
        });
    }

    /**
     * Рендер HTML модального окна
     */
    renderProgressModal() {
        const hasCancel = this.onCancel !== null;
        
        return `
            <div class="loading-progress-content">
                <div class="loading-header">
                    <h3>Загрузка данных</h3>
                    <div class="loading-spinner"></div>
                </div>

                <div class="steps-container">
                    <div id="current-step-container">
                        <!-- Текущий шаг будет отображаться здесь -->
                    </div>
                </div>

                ${hasCancel ? `
                    <div class="loading-actions">
                        <button id="loading-cancel-btn" class="btn btn-outline">Отменить</button>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Статический метод для быстрого создания прогресса загрузки LCX
     */
    static createLCXProgress() {
        const steps = [
            {
                title: 'Инициализация базы данных',
                description: 'Подготовка IndexedDB и создание таблиц'
            },
            {
                title: 'Скачивание файла данных',
                description: 'Загрузка LCX файла с сервера BrickLink'
            },
            {
                title: 'Распаковка архива',
                description: 'Извлечение данных из сжатого файла'
            },
            {
                title: 'Парсинг JSON данных',
                description: 'Обработка и валидация структуры данных'
            },
            {
                title: 'Загрузка категорий',
                description: 'Сохранение категорий деталей в базу'
            },
            {
                title: 'Загрузка цветов',
                description: 'Сохранение информации о цветах в базу'
            },
            {
                title: 'Загрузка деталей',
                description: 'Сохранение каталога деталей в базу'
            },
            {
                title: 'Создание индексов',
                description: 'Построение поисковых индексов для быстрого доступа'
            },
            {
                title: 'Завершение',
                description: 'Финализация и очистка временных данных'
            }
        ];

        return new LoadingProgress().show(steps, {
            onCancel: () => {
                console.log('❌ Loading cancelled by user');
                // Можно добавить логику отмены загрузки
            }
        });
    }

    /**
     * Статический метод для создания прогресса инициализации приложения
     */
    static createAppInitProgress() {
        const steps = [
            {
                title: 'Проверка локального хранилища',
                description: 'Поиск сохраненных данных проекта'
            },
            {
                title: 'Инициализация IndexedDB',
                description: 'Подключение к локальной базе данных'
            },
            {
                title: 'Загрузка каталога деталей',
                description: 'Получение данных из локальной базы'
            },
            {
                title: 'Инициализация компонентов',
                description: 'Создание интерфейса приложения'
            }
        ];

        return new LoadingProgress().show(steps);
    }
}

// Экспортируем класс
window.LoadingProgress = LoadingProgress;
