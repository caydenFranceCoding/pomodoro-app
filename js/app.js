const App = {
    currentView: 'dashboard',
    currentUser: null,

    init() {
        this.bindLanding();
        this.bindNavigation();
        this.bindMobileMenu();
        this.bindModals();
        this.bindProfile();
        this.renderBoardsList();
        this.updateDashboard();
        this.showView('dashboard');

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js');
        }
    },

    bindProfile() {
        const profileIcon = document.getElementById('profile-icon');
        const dropdown = document.getElementById('profile-dropdown');

        profileIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
        });

        document.addEventListener('click', () => {
            dropdown.classList.remove('active');
        });

        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            Api.logout();
            this.currentUser = null;
            document.getElementById('main-app').classList.add('hidden');
            document.getElementById('landing-page').classList.remove('hidden');
            dropdown.classList.remove('active');
        });
    },

    setUserProfile(user) {
        this.currentUser = user;
        const initials = user.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase();
        
        document.getElementById('profile-initials').textContent = initials;
        document.getElementById('profile-name').textContent = user.name;
        document.getElementById('profile-email').textContent = user.email;
    },

    bindLanding() {
        const openApp = (mode) => {
            if (Api.token) {
                this.showLoading(() => {
                    document.getElementById('main-app').classList.remove('hidden');
                    setTimeout(() => document.getElementById('main-app').classList.add('visible'), 10);
                    this.loadUserData();
                });
            } else {
                document.getElementById('auth-modal').classList.remove('hidden');
                document.getElementById('login-form').classList.remove('hidden');
                document.getElementById('register-form').classList.add('hidden');
            }
        };

        document.getElementById('open-individual-btn').addEventListener('click', () => openApp('individual'));
        document.getElementById('open-collab-btn').addEventListener('click', () => openApp('collab'));

        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('login-form').classList.add('hidden');
            document.getElementById('register-form').classList.remove('hidden');
            document.getElementById('auth-error').classList.add('hidden');
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('register-form').classList.add('hidden');
            document.getElementById('login-form').classList.remove('hidden');
            document.getElementById('auth-error').classList.add('hidden');
        });

        document.getElementById('login-btn').addEventListener('click', async () => {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            
            if (!email || !password) {
                this.showAuthError('Please fill in all fields');
                return;
            }

            try {
                const data = await Api.login(email, password);
                this.setUserProfile(data.user);
                document.getElementById('auth-modal').classList.add('hidden');
                this.showLoading(() => {
                    document.getElementById('main-app').classList.remove('hidden');
                    setTimeout(() => document.getElementById('main-app').classList.add('visible'), 10);
                    this.loadUserData();
                });
            } catch (error) {
                this.showAuthError(error.message);
            }
        });

        document.getElementById('register-btn').addEventListener('click', async () => {
            const name = document.getElementById('register-name').value.trim();
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-password').value;
            
            if (!name || !email || !password) {
                this.showAuthError('Please fill in all fields');
                return;
            }

            if (password.length < 6) {
                this.showAuthError('Password must be at least 6 characters');
                return;
            }

            try {
                const data = await Api.register(email, password, name);
                this.setUserProfile(data.user);
                document.getElementById('auth-modal').classList.add('hidden');
                this.showLoading(() => {
                    document.getElementById('main-app').classList.remove('hidden');
                    setTimeout(() => document.getElementById('main-app').classList.add('visible'), 10);
                    this.loadUserData();
                });
            } catch (error) {
                this.showAuthError(error.message);
            }
        });

        ['login-email', 'login-password'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') document.getElementById('login-btn').click();
            });
        });

        ['register-name', 'register-email', 'register-password'].forEach(id => {
            document.getElementById(id).addEventListener('keydown', (e) => {
                if (e.key === 'Enter') document.getElementById('register-btn').click();
            });
        });
    },

    showAuthError(message) {
        const errorEl = document.getElementById('auth-error');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    },

    showLoading(callback) {
        document.getElementById('landing-page').classList.add('hidden');
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.classList.remove('hidden');
        setTimeout(() => loadingScreen.classList.add('visible'), 10);
        
        setTimeout(() => {
            loadingScreen.classList.remove('visible');
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                callback();
            }, 500);
        }, 1500);
    },

    async loadUserData() {
        try {
            const boards = await Api.getBoards();
            Storage.data.boards = boards.map(b => ({
                id: b._id,
                name: b.name,
                cards: []
            }));
            
            if (boards.length > 0) {
                Storage.data.activeBoard = boards[0]._id;
                const cards = await Api.getCards(boards[0]._id);
                Storage.data.boards[0].cards = cards.map(c => ({
                    id: c._id,
                    title: c.title,
                    column: c.column,
                    pomodoros: c.pomodoros,
                    journal: c.journal,
                    createdAt: c.createdAt
                }));

                if (boards[0].owner) {
                    this.setUserProfile(boards[0].owner);
                }
            }
            
            this.renderBoardsList();
            this.updateDashboard();
        } catch (error) {
            console.error('Failed to load data:', error);
        }
    },

    bindNavigation() {
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.showView(btn.dataset.view);
            });
        });
    },

    bindMobileMenu() {
        const menuBtn = document.getElementById('menu-btn');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        if (menuBtn && sidebar && overlay) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.add('open');
                overlay.classList.add('visible');
            });

            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('visible');
            });
        }
    },

    closeMobileMenu() {
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebar-overlay');
            if (sidebar && overlay) {
                sidebar.classList.remove('open');
                overlay.classList.remove('visible');
            }
        }
    },

    showView(viewId) {
        this.currentView = viewId;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        this.closeMobileMenu();

        if (viewId === 'dashboard') {
            this.updateDashboard();
        } else if (viewId === 'board') {
            Board.render();
        }
    },

    bindModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            const backdrop = modal.querySelector('.modal-backdrop');
            const closeBtn = modal.querySelector('.modal-close');
            
            if (backdrop) {
                backdrop.addEventListener('click', () => {
                    modal.classList.add('hidden');
                });
            }
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => {
                    modal.classList.add('hidden');
                });
            }
        });

        document.getElementById('add-board-btn').addEventListener('click', () => {
            document.getElementById('add-board-modal').classList.remove('hidden');
            document.getElementById('new-board-title').value = '';
            document.getElementById('new-board-title').focus();
        });

        document.getElementById('create-board-btn').addEventListener('click', async () => {
            const title = document.getElementById('new-board-title').value.trim();
            if (title) {
                try {
                    const board = await Api.createBoard(title);
                    Storage.data.boards.push({
                        id: board._id,
                        name: board.name,
                        cards: []
                    });
                    Storage.data.activeBoard = board._id;
                    this.renderBoardsList();
                    document.getElementById('add-board-modal').classList.add('hidden');
                    this.showView('board');
                } catch (error) {
                    console.error('Failed to create board:', error);
                }
            }
        });

        document.getElementById('new-board-title').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('create-board-btn').click();
            }
        });
    },

    renderBoardsList() {
        const list = document.getElementById('boards-list');
        list.innerHTML = '';

        Storage.data.boards.forEach(board => {
            const li = document.createElement('li');
            li.textContent = board.name;
            li.dataset.boardId = board.id;
            if (board.id === Storage.data.activeBoard) {
                li.classList.add('active');
            }
            li.addEventListener('click', () => {
                Storage.setActiveBoard(board.id);
                this.renderBoardsList();
                this.showView('board');
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                document.querySelector('[data-view="board"]').classList.add('active');
            });
            list.appendChild(li);
        });
    },

    updateDashboard() {
        const stats = Storage.getStats();
        document.getElementById('total-tasks').textContent = stats.totalTasks;
        document.getElementById('completed-tasks').textContent = stats.completedTasks;
        document.getElementById('total-pomodoros').textContent = stats.totalPomodoros;
        document.getElementById('total-hours').textContent = stats.totalHours + 'h';

        const feed = document.getElementById('activity-feed');
        feed.innerHTML = '';

        Storage.data.activity.slice(0, 10).forEach(item => {
            const li = document.createElement('li');
            const time = new Date(item.timestamp);
            
            const hasBoard = item.boardId && Storage.data.boards.find(b => b.id === item.boardId);
            const hasCard = item.cardId && item.boardId && Storage.getCard(item.cardId, item.boardId);
            
            if (hasBoard) {
                li.classList.add('clickable');
                li.addEventListener('click', () => {
                    Storage.setActiveBoard(item.boardId);
                    this.renderBoardsList();
                    this.showView('board');
                    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                    document.querySelector('[data-view="board"]').classList.add('active');
                    
                    if (hasCard) {
                        setTimeout(() => {
                            Card.open(item.cardId);
                        }, 50);
                    }
                });
            }

            li.innerHTML = `
                <div>${item.message}</div>
                <div class="activity-time">${this.formatTime(time)}</div>
            `;
            feed.appendChild(li);
        });

        if (Storage.data.activity.length === 0) {
            feed.innerHTML = '<li>No activity yet. Create a task to get started.</li>';
        }
    },

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});