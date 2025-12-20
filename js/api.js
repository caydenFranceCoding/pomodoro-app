const API_URL = 'https://ourflow-backend.onrender.com/api';

const Api = {
    token: localStorage.getItem('token'),

    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    },

    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
    },

    async request(endpoint, options = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: { ...headers, ...options.headers }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Request failed');
        return data;
    },

    async register(email, password, name) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, password, name })
        });
        this.setToken(data.token);
        return data;
    },

    async login(email, password) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        this.setToken(data.token);
        return data;
    },

    logout() {
        this.clearToken();
    },

    async getMe() {
        return this.request('/auth/me');
    },

    async getBoards() {
        return this.request('/boards');
    },

    async getBoard(id) {
        return this.request(`/boards/${id}`);
    },

    async createBoard(name) {
        return this.request('/boards', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    },

    async deleteBoard(id) {
        return this.request(`/boards/${id}`, { method: 'DELETE' });
    },

    async inviteToBoard(boardId, email) {
        return this.request(`/boards/${boardId}/invite`, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    },

    async removeCollaborator(boardId, userId) {
        return this.request(`/boards/${boardId}/collaborators/${userId}`, {
            method: 'DELETE'
        });
    },

    async getCards(boardId) {
        return this.request(`/cards/board/${boardId}`);
    },

    async createCard(title, boardId) {
        return this.request('/cards', {
            method: 'POST',
            body: JSON.stringify({ title, boardId })
        });
    },

    async updateCard(id, updates) {
        return this.request(`/cards/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },

    async deleteCard(id) {
        return this.request(`/cards/${id}`, { method: 'DELETE' });
    },

    async addJournalEntry(cardId, text) {
        return this.request(`/cards/${cardId}/journal`, {
            method: 'POST',
            body: JSON.stringify({ text })
        });
    },

    async addPomodoro(cardId) {
        return this.request(`/cards/${cardId}/pomodoro`, { method: 'PUT' });
    }
};