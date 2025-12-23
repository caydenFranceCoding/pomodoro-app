const Theme = {
    current: 'default',

    init() {
        // Load saved theme
        const saved = localStorage.getItem('ourflow-theme');
        if (saved) {
            this.current = saved;
            this.apply(saved);
        }
        
        this.bindEvents();
    },

    bindEvents() {
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.checked = this.current === 'starwars';
            toggle.addEventListener('change', (e) => {
                const theme = e.target.checked ? 'starwars' : 'default';
                this.set(theme);
            });
        }
    },

    set(theme) {
        this.current = theme;
        localStorage.setItem('ourflow-theme', theme);
        this.apply(theme);
    },

    apply(theme) {
        if (theme === 'starwars') {
            document.documentElement.setAttribute('data-theme', 'starwars');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        
        // Update toggle if it exists
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            toggle.checked = theme === 'starwars';
        }
    },

    toggle() {
        const newTheme = this.current === 'starwars' ? 'default' : 'starwars';
        this.set(newTheme);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Theme.init();
});