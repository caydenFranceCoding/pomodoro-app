const Journal = {
    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('add-journal-btn').addEventListener('click', () => {
            this.addEntry();
        });

        document.getElementById('journal-entry').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.addEntry();
            }
        });
    },

    addEntry() {
        const textarea = document.getElementById('journal-entry');
        const text = textarea.value.trim();

        if (text && Card.currentCardId) {
            Storage.addJournalEntry(Card.currentCardId, text);
            textarea.value = '';
            const card = Storage.getCard(Card.currentCardId);
            this.render(card);
            Board.render();
        }
    },

    render(card) {
        const list = document.getElementById('journal-entries');
        list.innerHTML = '';

        if (card.journal.length === 0) {
            list.innerHTML = '<li class="empty-state">No journal entries yet.</li>';
            return;
        }

        card.journal.forEach(entry => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="entry-text">${this.escapeHtml(entry.text)}</div>
                <div class="entry-time">${this.formatTime(entry.createdAt)}</div>
            `;
            list.appendChild(li);
        });
    },

    formatTime(isoString) {
        const date = new Date(isoString);
        const options = { 
            month: 'short', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: '2-digit'
        };
        return date.toLocaleDateString('en-US', options);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Journal.init();
});