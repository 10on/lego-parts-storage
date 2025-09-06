// Вид настроек
class SettingsView {
    constructor() {
        this.settings = {
            storageAdapter: 'local',
            imageSource: 'bricklink',
            theme: 'light',
            autoSave: true,
            gridSize: 'medium',
            notifications: true
        };
    }

    render() {
        const container = document.getElementById('settings-content');
        if (!container) return;

        container.innerHTML = this.renderSettingsInterface();
        this.setupEventListeners();
        this.loadSettings();
    }

    renderSettingsInterface() {
        return `
            <div class="settings-section">
                <h3>Хранение данных</h3>
                <p>Выберите способ хранения данных приложения</p>
                <div class="form-group">
                    <label class="form-label">Адаптер хранения</label>
                    <select class="form-select" id="storage-adapter">
                        <option value="local">LocalStorage (быстро, ограничено)</option>
                        <option value="idb">IndexedDB (больше места)</option>
                        <option value="firebase">Firebase (синхронизация)</option>
                    </select>
                </div>
                <div class="setting-description">
                    <p><strong>LocalStorage:</strong> Данные хранятся локально в браузере. Быстро, но ограничено по объему.</p>
                    <p><strong>IndexedDB:</strong> Больше места для хранения, поддерживает большие объемы данных.</p>
                    <p><strong>Firebase:</strong> Облачное хранение с синхронизацией между устройствами.</p>
                </div>
            </div>

            <div class="settings-section">
                <h3>Источник изображений</h3>
                <p>Выберите источник изображений деталей LEGO</p>
                <div class="form-group">
                    <label class="form-label">Источник изображений</label>
                    <select class="form-select" id="image-source">
                        <option value="bricklink">BrickLink</option>
                        <option value="rebrickable">Rebrickable</option>
                        <option value="local">Локальные файлы</option>
                    </select>
                </div>
                <div class="setting-description">
                    <p><strong>BrickLink:</strong> Официальные изображения с BrickLink.com</p>
                    <p><strong>Rebrickable:</strong> Изображения с Rebrickable.com</p>
                    <p><strong>Локальные:</strong> Использовать локально сохраненные изображения</p>
                </div>
            </div>

            <div class="settings-section">
                <h3>Внешний вид</h3>
                <p>Настройки интерфейса и темы</p>
                <div class="form-group">
                    <label class="form-label">Тема</label>
                    <select class="form-select" id="theme-select">
                        <option value="light">Светлая</option>
                        <option value="dark">Тёмная</option>
                        <option value="auto">Автоматически</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Размер сетки</label>
                    <select class="form-select" id="grid-size">
                        <option value="small">Маленький (40px)</option>
                        <option value="medium">Средний (60px)</option>
                        <option value="large">Большой (80px)</option>
                    </select>
                </div>
            </div>

            <div class="settings-section">
                <h3>Поведение</h3>
                <p>Настройки работы приложения</p>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="auto-save" checked>
                        Автоматическое сохранение
                    </label>
                </div>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="notifications" checked>
                        Показывать уведомления
                    </label>
                </div>
                <div class="form-group">
                    <label class="checkbox-label">
                        <input type="checkbox" id="confirm-delete">
                        Подтверждать удаление
                    </label>
                </div>
            </div>

            <div class="settings-section">
                <h3>Данные</h3>
                <p>Управление данными приложения</p>
                <div class="settings-actions">
                    <button class="btn btn-outline" id="export-settings-btn">Экспорт настроек</button>
                    <button class="btn btn-outline" id="import-settings-btn">Импорт настроек</button>
                    <button class="btn btn-outline" id="reset-settings-btn">Сбросить настройки</button>
                </div>
            </div>

            <div class="settings-section">
                <h3>О приложении</h3>
                <div class="app-info">
                    <p><strong>LEGO Storage Mapper</strong> v1.0.0</p>
                    <p>Инструмент для управления коллекцией LEGO деталей</p>
                    <p>Разработано для систематизации и организации деталей</p>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Изменение настроек
        document.getElementById('storage-adapter')?.addEventListener('change', (e) => {
            this.updateSetting('storageAdapter', e.target.value);
        });

        document.getElementById('image-source')?.addEventListener('change', (e) => {
            this.updateSetting('imageSource', e.target.value);
        });

        document.getElementById('theme-select')?.addEventListener('change', (e) => {
            this.updateSetting('theme', e.target.value);
            this.applyTheme(e.target.value);
        });

        document.getElementById('grid-size')?.addEventListener('change', (e) => {
            this.updateSetting('gridSize', e.target.value);
            this.applyGridSize(e.target.value);
        });

        document.getElementById('auto-save')?.addEventListener('change', (e) => {
            this.updateSetting('autoSave', e.target.checked);
        });

        document.getElementById('notifications')?.addEventListener('change', (e) => {
            this.updateSetting('notifications', e.target.checked);
        });

        document.getElementById('confirm-delete')?.addEventListener('change', (e) => {
            this.updateSetting('confirmDelete', e.target.checked);
        });

        // Кнопки действий
        document.getElementById('export-settings-btn')?.addEventListener('click', () => {
            this.exportSettings();
        });

        document.getElementById('import-settings-btn')?.addEventListener('click', () => {
            this.importSettings();
        });

        document.getElementById('reset-settings-btn')?.addEventListener('click', () => {
            this.resetSettings();
        });
    }

    loadSettings() {
        // Загружаем настройки из localStorage
        const savedSettings = localStorage.getItem('lego-storage-settings');
        if (savedSettings) {
            try {
                this.settings = { ...this.settings, ...JSON.parse(savedSettings) };
            } catch (error) {
                console.error('Ошибка загрузки настроек:', error);
            }
        }

        // Применяем настройки к интерфейсу
        Object.keys(this.settings).forEach(key => {
            const element = document.getElementById(this.getSettingElementId(key));
            if (element) {
                if (element.type === 'checkbox') {
                    element.checked = this.settings[key];
                } else {
                    element.value = this.settings[key];
                }
            }
        });

        // Применяем настройки к приложению
        this.applyTheme(this.settings.theme);
        this.applyGridSize(this.settings.gridSize);
    }

    getSettingElementId(key) {
        const mapping = {
            'storageAdapter': 'storage-adapter',
            'imageSource': 'image-source',
            'theme': 'theme-select',
            'gridSize': 'grid-size',
            'autoSave': 'auto-save',
            'notifications': 'notifications',
            'confirmDelete': 'confirm-delete'
        };
        return mapping[key] || key;
    }

    updateSetting(key, value) {
        this.settings[key] = value;
        this.saveSettings();
        
        if (window.app) {
            window.app.showNotification('Настройка сохранена', 'success');
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('lego-storage-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Ошибка сохранения настроек:', error);
            if (window.app) {
                window.app.showNotification('Ошибка сохранения настроек', 'error');
            }
        }
    }

    applyTheme(theme) {
        const body = document.body;
        
        // Удаляем предыдущие классы темы
        body.classList.remove('theme-light', 'theme-dark', 'theme-auto');
        
        // Применяем новую тему
        switch (theme) {
            case 'light':
                body.classList.add('theme-light');
                break;
            case 'dark':
                body.classList.add('theme-dark');
                break;
            case 'auto':
                body.classList.add('theme-auto');
                break;
        }
    }

    applyGridSize(size) {
        const root = document.documentElement;
        
        switch (size) {
            case 'small':
                root.style.setProperty('--grid-cell-size', '40px');
                break;
            case 'medium':
                root.style.setProperty('--grid-cell-size', '60px');
                break;
            case 'large':
                root.style.setProperty('--grid-cell-size', '80px');
                break;
        }
    }

    exportSettings() {
        const settingsData = {
            settings: this.settings,
            exportedAt: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(settingsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lego-storage-settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        if (window.app) {
            window.app.showNotification('Настройки экспортированы', 'success');
        }
    }

    importSettings() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        if (data.settings) {
                            this.settings = { ...this.settings, ...data.settings };
                            this.saveSettings();
                            this.loadSettings();
                            
                            if (window.app) {
                                window.app.showNotification('Настройки импортированы', 'success');
                            }
                        }
                    } catch (error) {
                        console.error('Ошибка импорта настроек:', error);
                        if (window.app) {
                            window.app.showNotification('Ошибка импорта настроек', 'error');
                        }
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }

    resetSettings() {
        if (confirm('Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?')) {
            this.settings = {
                storageAdapter: 'local',
                imageSource: 'bricklink',
                theme: 'light',
                autoSave: true,
                gridSize: 'medium',
                notifications: true
            };
            
            this.saveSettings();
            this.loadSettings();
            
            if (window.app) {
                window.app.showNotification('Настройки сброшены', 'success');
            }
        }
    }
}
