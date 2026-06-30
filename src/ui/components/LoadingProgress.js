class LoadingProgress {
    constructor() {
        this.isVisible = false;
        this.currentStep = 0;
        this.totalSteps = 0;
        this.stepDetails = [];
        this.stepProgress = [];
        this.onCancel = null;
    }

    show(steps, options = {}) {
        this.stepDetails = steps;
        this.totalSteps = steps.length;
        this.currentStep = 0;
        this.stepProgress = new Array(steps.length).fill(0);
        this.onCancel = options.onCancel || null;

        this._createModal();
        this.isVisible = true;
        this._render();
        return this;
    }

    hide() {
        const modal = document.getElementById('loading-progress-modal');
        if (modal) {
            modal.classList.add('lp-hide');
            setTimeout(() => modal.remove(), 300);
        }
        this.isVisible = false;
    }

    updateStep(stepIndex, progress, details = '') {
        if (!this.isVisible) return;
        this.currentStep = stepIndex;
        this.stepProgress[stepIndex] = Math.min(100, Math.max(0, progress));
        this._currentDetails = details;
        this._render();
    }

    completeStep(stepIndex, details = '') {
        this.stepProgress[stepIndex] = 100;
        this._currentDetails = details;
        this._render();
    }

    showError(stepIndex, errorMessage) {
        if (!this.isVisible) return;
        this._errorMessage = errorMessage;
        this._render();
    }

    // --- private ---

    _overallPercent() {
        if (this.totalSteps === 0) return 0;
        let done = 0;
        for (let i = 0; i < this.totalSteps; i++) {
            done += this.stepProgress[i] / 100;
        }
        return Math.round((done / this.totalSteps) * 100);
    }

    _render() {
        const pct = this._overallPercent();

        const bar = document.getElementById('lp-bar-fill');
        if (bar) bar.style.width = `${pct}%`;

        const pctLabel = document.getElementById('lp-percent');
        if (pctLabel) pctLabel.textContent = `${pct}%`;

        const stepLabel = document.getElementById('lp-stage-label');
        if (stepLabel) {
            const step = this.stepDetails[this.currentStep];
            stepLabel.textContent = step ? step.title : '';
        }

        const details = document.getElementById('lp-details');
        if (details) {
            if (this._errorMessage) {
                details.textContent = `Ошибка: ${this._errorMessage}`;
                details.className = 'lp-details lp-details--error';
            } else {
                details.textContent = this._currentDetails || '';
                details.className = 'lp-details';
            }
        }

        const stages = document.getElementById('lp-stages');
        if (!stages) return;

        stages.querySelectorAll('.lp-stage').forEach((el, i) => {
            const p = this.stepProgress[i] ?? 0;
            el.className = 'lp-stage' +
                (p >= 100 ? ' lp-stage--done' :
                 i === this.currentStep ? ' lp-stage--active' :
                 ' lp-stage--pending');

            const icon = el.querySelector('.lp-stage-icon');
            if (icon) icon.textContent = p >= 100 ? '✓' : i === this.currentStep ? '→' : String(i + 1);
        });
    }

    _createModal() {
        document.getElementById('loading-progress-modal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'loading-progress-modal';
        modal.className = 'loading-progress-modal';
        modal.innerHTML = this._html();
        document.body.appendChild(modal);

        if (this.onCancel) {
            document.getElementById('lp-cancel-btn')?.addEventListener('click', () => {
                this.onCancel?.();
                this.hide();
            });
        }

        requestAnimationFrame(() => modal.classList.add('lp-show'));
    }

    _html() {
        const stagesHtml = this.stepDetails.map((step, i) => `
            <div class="lp-stage lp-stage--pending">
                <span class="lp-stage-icon">${i + 1}</span>
                <span class="lp-stage-title">${step.title}</span>
            </div>
        `).join('');

        const cancelBtn = this.onCancel
            ? `<div class="lp-actions"><button id="lp-cancel-btn" class="btn btn-outline">Отменить</button></div>`
            : '';

        return `
            <div class="lp-content">
                <div class="lp-header">
                    <div class="lp-spinner"></div>
                    <span class="lp-title">Загрузка данных</span>
                    <span id="lp-percent" class="lp-percent">0%</span>
                </div>

                <div class="lp-bar-track">
                    <div id="lp-bar-fill" class="lp-bar-fill" style="width:0%"></div>
                </div>

                <div class="lp-stage-row">
                    <span id="lp-stage-label" class="lp-stage-label"></span>
                    <span id="lp-details" class="lp-details"></span>
                </div>

                <div id="lp-stages" class="lp-stages">${stagesHtml}</div>

                ${cancelBtn}
            </div>
        `;
    }

    static createLCXProgress() {
        const steps = [
            { title: 'Инициализация базы данных' },
            { title: 'Скачивание файла данных' },
            { title: 'Распаковка архива' },
            { title: 'Парсинг JSON' },
            { title: 'Загрузка категорий' },
            { title: 'Загрузка цветов' },
            { title: 'Загрузка деталей' },
            { title: 'Загрузка связей' },
            { title: 'Создание индексов' },
            { title: 'Завершение' },
        ];
        return new LoadingProgress().show(steps, {
            onCancel: () => console.log('❌ Loading cancelled by user'),
        });
    }

    static createAppInitProgress() {
        const steps = [
            { title: 'Проверка хранилища' },
            { title: 'База данных' },
            { title: 'Каталог деталей' },
            { title: 'Интерфейс' },
        ];
        return new LoadingProgress().show(steps);
    }
}

window.LoadingProgress = LoadingProgress;
