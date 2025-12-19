const Collab = {
    currentBoardData: null,

    init() {
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('manage-team-btn').addEventListener('click', () => {
            this.openModal();
        });

        document.getElementById('send-invite-btn').addEventListener('click', () => {
            this.sendInvite();
        });

        document.getElementById('invite-email').addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.sendInvite();
            }
        });
    },

    async openModal() {
        const boardId = Storage.data.activeBoard;
        if (!boardId) return;

        this.hideMessages();
        document.getElementById('invite-email').value = '';
        document.getElementById('collab-modal').classList.remove('hidden');

        try {
            this.currentBoardData = await Api.getBoard(boardId);
            this.renderCollaborators();
            this.updateInviteVisibility();
        } catch (error) {
            this.showError('Failed to load team members');
        }
    },

    updateInviteVisibility() {
        const inviteSection = document.getElementById('invite-section');
        const currentUserId = this.getCurrentUserId();
        
        if (this.currentBoardData) {
            const isOwner = this.currentBoardData.owner._id === currentUserId;
            const isCollaborator = this.currentBoardData.collaborators.some(c => c._id === currentUserId);
            
            if (isOwner || isCollaborator) {
                inviteSection.style.display = 'flex';
            } else {
                inviteSection.style.display = 'none';
            }
        }
    },

    getCurrentUserId() {
        const token = localStorage.getItem('token');
        if (!token) return null;
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.userId;
        } catch {
            return null;
        }
    },

    renderCollaborators() {
        const list = document.getElementById('collaborators-list');
        list.innerHTML = '';

        if (!this.currentBoardData) return;

        const currentUserId = this.getCurrentUserId();
        const isOwner = this.currentBoardData.owner._id === currentUserId;

        const ownerLi = document.createElement('li');
        ownerLi.className = 'collaborator-item';
        ownerLi.innerHTML = `
            <div class="collaborator-info">
                <span class="collaborator-name">${this.currentBoardData.owner.name}</span>
                <span class="collaborator-email">${this.currentBoardData.owner.email}</span>
                <span class="collaborator-role">Owner</span>
            </div>
        `;
        list.appendChild(ownerLi);

        if (this.currentBoardData.collaborators.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.className = 'no-collaborators';
            emptyLi.textContent = 'No collaborators yet';
            list.appendChild(emptyLi);
            return;
        }

        this.currentBoardData.collaborators.forEach(collab => {
            const li = document.createElement('li');
            li.className = 'collaborator-item';
            li.innerHTML = `
                <div class="collaborator-info">
                    <span class="collaborator-name">${collab.name}</span>
                    <span class="collaborator-email">${collab.email}</span>
                </div>
                ${isOwner ? `<button class="btn-remove-collab" data-user-id="${collab._id}">Remove</button>` : ''}
            `;
            list.appendChild(li);
        });

        if (isOwner) {
            list.querySelectorAll('.btn-remove-collab').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    this.removeCollaborator(e.target.dataset.userId);
                });
            });
        }
    },

    async sendInvite() {
        const email = document.getElementById('invite-email').value.trim();
        if (!email) return;

        const boardId = Storage.data.activeBoard;
        if (!boardId) return;

        this.hideMessages();

        try {
            const result = await Api.inviteToBoard(boardId, email);
            this.currentBoardData = result.board;
            this.renderCollaborators();
            document.getElementById('invite-email').value = '';
            this.showSuccess('User invited successfully');
        } catch (error) {
            this.showError(error.message);
        }
    },

    async removeCollaborator(userId) {
        const boardId = Storage.data.activeBoard;
        if (!boardId) return;

        this.hideMessages();

        try {
            const result = await Api.removeCollaborator(boardId, userId);
            this.currentBoardData = result.board;
            this.renderCollaborators();
            this.showSuccess('Collaborator removed');
        } catch (error) {
            this.showError(error.message);
        }
    },

    showError(message) {
        const errorEl = document.getElementById('collab-error');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');
    },

    showSuccess(message) {
        const successEl = document.getElementById('collab-success');
        successEl.textContent = message;
        successEl.classList.remove('hidden');
        
        setTimeout(() => {
            successEl.classList.add('hidden');
        }, 3000);
    },

    hideMessages() {
        document.getElementById('collab-error').classList.add('hidden');
        document.getElementById('collab-success').classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Collab.init();
});