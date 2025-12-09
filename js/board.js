const Board = {
    draggedCard: null,

    init() {
        this.bindAddCard();
        this.bindDragAndDrop();
    },

    bindAddCard() {
        document.getElementById('add-card-btn').addEventListener('click', () => {
            document.getElementById('add-card-modal').classList.remove('hidden');
            document.getElementById('new-card-title').value = '';
            document.getElementById('new-card-title').focus();
        });

        document.getElementById('create-card-btn').addEventListener('click', () => {
            const title = document.getElementById('new-card-title').value.trim();
            if (title) {
                Storage.addCard(title);
                document.getElementById('add-card-modal').classList.add('hidden');
                this.render();
            }
        });

        document.getElementById('new-card-title').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('create-card-btn').click();
            }
        });

        document.getElementById('delete-board-btn').addEventListener('click', () => {
            const board = Storage.getActiveBoard();
            if (board) {
                document.getElementById('delete-board-name').textContent = board.name;
                document.getElementById('delete-board-input').value = '';
                document.getElementById('confirm-delete-board-btn').disabled = true;
                document.getElementById('delete-board-modal').classList.remove('hidden');
                document.getElementById('delete-board-input').focus();
            }
        });

        document.getElementById('delete-board-input').addEventListener('input', (e) => {
            const board = Storage.getActiveBoard();
            if (board) {
                const matches = e.target.value === board.name;
                document.getElementById('confirm-delete-board-btn').disabled = !matches;
            }
        });

        document.getElementById('confirm-delete-board-btn').addEventListener('click', () => {
            const board = Storage.getActiveBoard();
            if (board) {
                Storage.deleteBoard(board.id);
                document.getElementById('delete-board-modal').classList.add('hidden');
                App.renderBoardsList();
                this.render();
                App.updateDashboard();
            }
        });
    },

    bindDragAndDrop() {
        document.querySelectorAll('.column-cards').forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.classList.add('drag-over');
            });

            column.addEventListener('dragleave', () => {
                column.classList.remove('drag-over');
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.classList.remove('drag-over');
                if (this.draggedCard) {
                    const newColumn = column.dataset.column;
                    Storage.moveCard(this.draggedCard, newColumn);
                    this.render();
                }
            });
        });
    },

    render() {
        const board = Storage.getActiveBoard();
        if (!board) return;

        document.getElementById('board-title').textContent = board.name;

        const columns = {
            'todo': document.querySelector('.column-cards[data-column="todo"]'),
            'in-progress': document.querySelector('.column-cards[data-column="in-progress"]'),
            'done': document.querySelector('.column-cards[data-column="done"]')
        };

        Object.values(columns).forEach(col => col.innerHTML = '');

        const counts = { 'todo': 0, 'in-progress': 0, 'done': 0 };

        board.cards.forEach(card => {
            const cardEl = this.createCardElement(card);
            columns[card.column].appendChild(cardEl);
            counts[card.column]++;
        });

        document.querySelectorAll('.column-count').forEach(el => {
            const column = el.closest('.kanban-column').dataset.column;
            el.textContent = counts[column];
        });
    },

    createCardElement(card) {
        const div = document.createElement('div');
        div.className = 'task-card';
        div.draggable = true;
        div.dataset.cardId = card.id;

        div.innerHTML = `
            <div class="task-card-title">${card.title}</div>
            <div class="task-card-meta">
                <span>${card.pomodoros} pomodoros</span>
                <span>${card.journal.length} entries</span>
            </div>
        `;

        div.addEventListener('click', () => {
            Card.open(card.id);
        });

        div.addEventListener('dragstart', () => {
            this.draggedCard = card.id;
            div.classList.add('dragging');
        });

        div.addEventListener('dragend', () => {
            this.draggedCard = null;
            div.classList.remove('dragging');
        });

        return div;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Board.init();
});