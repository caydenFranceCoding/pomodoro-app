const Card = {
    currentCardId: null,

    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('card-title-input').addEventListener('change', (e) => {
            if (this.currentCardId) {
                Storage.updateCard(this.currentCardId, { title: e.target.value });
                Board.render();
            }
        });

        document.getElementById('card-column-select').addEventListener('change', (e) => {
            if (this.currentCardId) {
                Storage.moveCard(this.currentCardId, e.target.value);
                Board.render();
            }
        });

        document.getElementById('focus-this-btn').addEventListener('click', () => {
            if (this.currentCardId) {
                Timer.setTask(this.currentCardId);
                document.getElementById('card-modal').classList.add('hidden');
            }
        });

        document.getElementById('delete-card-btn').addEventListener('click', () => {
            if (this.currentCardId && confirm('Delete this task?')) {
                Storage.deleteCard(this.currentCardId);
                document.getElementById('card-modal').classList.add('hidden');
                Board.render();
                App.updateDashboard();
            }
        });
    },

    open(cardId) {
        this.currentCardId = cardId;
        const card = Storage.getCard(cardId);
        if (!card) return;

        document.getElementById('card-title-input').value = card.title;
        document.getElementById('card-pomodoros').textContent = `${card.pomodoros} pomodoros`;
        document.getElementById('card-created').textContent = `Created ${this.formatDate(card.createdAt)}`;
        document.getElementById('card-column-select').value = card.column;

        Journal.render(card);

        document.getElementById('card-modal').classList.remove('hidden');
    },

    formatDate(isoString) {
        const date = new Date(isoString);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    refresh() {
        if (this.currentCardId) {
            const card = Storage.getCard(this.currentCardId);
            if (card) {
                document.getElementById('card-pomodoros').textContent = `${card.pomodoros} pomodoros`;
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Card.init();
});