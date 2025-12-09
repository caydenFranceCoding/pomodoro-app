const Timer = {
    currentTaskId: null,
    timeRemaining: 25 * 60,
    isRunning: false,
    isBreak: false,
    interval: null,

    init() {
        this.bindEvents();
        this.updateDisplay();
    },

    bindEvents() {
        document.getElementById('timer-start').addEventListener('click', () => {
            this.start();
        });

        document.getElementById('timer-pause').addEventListener('click', () => {
            this.pause();
        });

        document.getElementById('timer-reset').addEventListener('click', () => {
            this.reset();
        });

        document.getElementById('timer-expand').addEventListener('click', () => {
            document.getElementById('timer-widget').classList.toggle('collapsed');
        });

        document.getElementById('timer-widget-header').addEventListener('click', (e) => {
            if (e.target.id !== 'timer-expand') {
                document.getElementById('timer-widget').classList.toggle('collapsed');
            }
        });
    },

    setTask(taskId) {
        this.currentTaskId = taskId;
        const card = Storage.getCard(taskId);
        if (card) {
            document.getElementById('timer-task-name').textContent = card.title;
            this.reset();
            document.getElementById('timer-widget').classList.remove('collapsed');
        }
    },

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        document.getElementById('timer-start').disabled = true;
        document.getElementById('timer-pause').disabled = false;

        this.interval = setInterval(() => {
            this.timeRemaining--;
            this.updateDisplay();

            if (this.timeRemaining <= 0) {
                this.complete();
            }
        }, 1000);
    },

    pause() {
        this.isRunning = false;
        document.getElementById('timer-start').disabled = false;
        document.getElementById('timer-pause').disabled = true;
        clearInterval(this.interval);
    },

    reset() {
        this.pause();
        this.isBreak = false;
        this.timeRemaining = Storage.data.settings.focusDuration * 60;
        this.updateDisplay();
    },

    complete() {
        this.pause();

        if (this.isBreak) {
            this.isBreak = false;
            this.timeRemaining = Storage.data.settings.focusDuration * 60;
            this.notify('Break over', 'Time to focus!');
        } else {
            if (this.currentTaskId) {
                Storage.addPomodoro(this.currentTaskId);
                Card.refresh();
                Board.render();
                App.updateDashboard();
            }
            this.isBreak = true;
            this.timeRemaining = Storage.data.settings.breakDuration * 60;
            this.notify('Pomodoro complete', 'Take a short break!');
        }

        this.updateDisplay();
    },

    updateDisplay() {
        const mins = Math.floor(this.timeRemaining / 60);
        const secs = this.timeRemaining % 60;
        document.getElementById('timer-minutes').textContent = mins.toString().padStart(2, '0');
        document.getElementById('timer-seconds').textContent = secs.toString().padStart(2, '0');
    },

    notify(title, body) {
        if (Storage.data.settings.notifications && Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Timer.init();
});