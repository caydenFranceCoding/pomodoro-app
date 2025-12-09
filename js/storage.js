const Storage = {
    data: {
        boards: [],
        activeBoard: null,
        settings: {
            focusDuration: 25,
            breakDuration: 5,
            notifications: false
        },
        stats: {
            totalPomodoros: 0,
            totalMinutes: 0
        },
        activity: []
    },

    init() {
        const saved = localStorage.getItem('focusflow');
        if (saved) {
            this.data = JSON.parse(saved);
        }
    },

    save() {
        localStorage.setItem('focusflow', JSON.stringify(this.data));
    },

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    getActiveBoard() {
        return this.data.boards.find(b => b.id === this.data.activeBoard);
    },

    setActiveBoard(boardId) {
        this.data.activeBoard = boardId;
        this.save();
    },

    addBoard(name) {
        const board = {
            id: this.generateId(),
            name: name,
            cards: []
        };
        this.data.boards.push(board);
        this.data.activeBoard = board.id;
        this.save();
        this.logActivity(`Created project: ${name}`, null, board.id);
        return board;
    },

    deleteBoard(boardId) {
        const board = this.data.boards.find(b => b.id === boardId);
        if (!board) return;
        
        this.data.boards = this.data.boards.filter(b => b.id !== boardId);
        
        if (this.data.activeBoard === boardId) {
            this.data.activeBoard = this.data.boards.length > 0 ? this.data.boards[0].id : null;
        }
        
        this.save();
        this.logActivity(`Deleted project: ${board.name}`);
    },

    addCard(title) {
        const board = this.getActiveBoard();
        const card = {
            id: this.generateId(),
            title: title,
            column: 'todo',
            pomodoros: 0,
            journal: [],
            createdAt: new Date().toISOString()
        };
        board.cards.push(card);
        this.save();
        this.logActivity(`Added task: ${title}`, card.id, board.id);
        return card;
    },

    getCard(cardId, boardId = null) {
        const board = boardId 
            ? this.data.boards.find(b => b.id === boardId)
            : this.getActiveBoard();
        if (!board) return null;
        return board.cards.find(c => c.id === cardId);
    },

    updateCard(cardId, updates) {
        const card = this.getCard(cardId);
        if (card) {
            Object.assign(card, updates);
            this.save();
        }
        return card;
    },

    deleteCard(cardId) {
        const board = this.getActiveBoard();
        const card = this.getCard(cardId);
        board.cards = board.cards.filter(c => c.id !== cardId);
        this.save();
        this.logActivity(`Deleted task: ${card.title}`);
    },

    moveCard(cardId, column) {
        const card = this.getCard(cardId);
        if (card) {
            card.column = column;
            this.save();
        }
    },

    addJournalEntry(cardId, text) {
        const card = this.getCard(cardId);
        if (card) {
            const entry = {
                id: this.generateId(),
                text: text,
                createdAt: new Date().toISOString()
            };
            card.journal.unshift(entry);
            this.save();
            this.logActivity(`Added journal entry to: ${card.title}`, cardId, this.data.activeBoard);
            return entry;
        }
    },

    addPomodoro(cardId) {
        const card = this.getCard(cardId);
        if (card) {
            card.pomodoros++;
            this.data.stats.totalPomodoros++;
            this.data.stats.totalMinutes += this.data.settings.focusDuration;
            this.save();
            this.logActivity(`Completed pomodoro: ${card.title}`, cardId, this.data.activeBoard);
        }
    },

    logActivity(message, cardId = null, boardId = null) {
        this.data.activity.unshift({
            message: message,
            cardId: cardId,
            boardId: boardId,
            timestamp: new Date().toISOString()
        });
        if (this.data.activity.length > 50) {
            this.data.activity = this.data.activity.slice(0, 50);
        }
        this.save();
    },

    getStats() {
        const board = this.getActiveBoard();
        const cards = board ? board.cards : [];
        return {
            totalTasks: cards.length,
            completedTasks: cards.filter(c => c.column === 'done').length,
            totalPomodoros: this.data.stats.totalPomodoros,
            totalHours: Math.round(this.data.stats.totalMinutes / 60)
        };
    }
};

Storage.init();