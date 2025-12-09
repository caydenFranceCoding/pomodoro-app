const Spotify = {
    clientId: '501fb72edecb4794a7d27b4d568b569a', 
    redirectUri: 'http://127.0.0.1:5500/',
    scopes: [
        'user-read-playback-state',
        'user-modify-playback-state',
        'user-read-currently-playing',
        'streaming',
        'user-read-email',
        'user-read-private'
    ].join(' '),
    
    accessToken: null,
    refreshToken: null,
    tokenExpiry: null,
    pollInterval: null,
    currentTrack: null,
    isPlaying: false,

    init() {
        this.loadTokens();
        this.bindEvents();
        this.checkAuthCallback();
        
        if (this.isAuthenticated()) {
            this.showPlayer();
            this.startPolling();
        } else {
            this.showConnect();
        }
    },

    loadTokens() {
        this.accessToken = localStorage.getItem('spotify_access_token');
        this.refreshToken = localStorage.getItem('spotify_refresh_token');
        this.tokenExpiry = localStorage.getItem('spotify_token_expiry');
    },

    saveTokens(accessToken, refreshToken, expiresIn) {
        this.accessToken = accessToken;
        if (refreshToken) {
            this.refreshToken = refreshToken;
            localStorage.setItem('spotify_refresh_token', refreshToken);
        }
        this.tokenExpiry = Date.now() + (expiresIn * 1000);
        localStorage.setItem('spotify_access_token', accessToken);
        localStorage.setItem('spotify_token_expiry', this.tokenExpiry);
    },

    clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        this.tokenExpiry = null;
        localStorage.removeItem('spotify_access_token');
        localStorage.removeItem('spotify_refresh_token');
        localStorage.removeItem('spotify_token_expiry');
    },

    isAuthenticated() {
        return this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry;
    },

    async checkAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        
        if (code) {
            window.history.replaceState({}, document.title, window.location.pathname);
            await this.exchangeCodeForTokens(code);
        }
    },

    generateRandomString(length) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    async generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    },

    async authorize() {
        const codeVerifier = this.generateRandomString(128);
        localStorage.setItem('spotify_code_verifier', codeVerifier);
        
        const codeChallenge = await this.generateCodeChallenge(codeVerifier);
        
        const params = new URLSearchParams({
            client_id: this.clientId,
            response_type: 'code',
            redirect_uri: this.redirectUri,
            scope: this.scopes,
            code_challenge_method: 'S256',
            code_challenge: codeChallenge
        });

        window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
    },

    async exchangeCodeForTokens(code) {
        const codeVerifier = localStorage.getItem('spotify_code_verifier');
        
        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: this.redirectUri,
                    code_verifier: codeVerifier
                })
            });

            const data = await response.json();
            
            if (data.error) {
                console.error('Token exchange error:', data.error);
                this.showError('Authentication failed');
                return;
            }

            this.saveTokens(data.access_token, data.refresh_token, data.expires_in);
            localStorage.removeItem('spotify_code_verifier');
            
            this.showPlayer();
            this.startPolling();
        } catch (error) {
            console.error('Token exchange failed:', error);
            this.showError('Authentication failed');
        }
    },

    async refreshAccessToken() {
        if (!this.refreshToken) {
            this.disconnect();
            return false;
        }

        try {
            const response = await fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: new URLSearchParams({
                    client_id: this.clientId,
                    grant_type: 'refresh_token',
                    refresh_token: this.refreshToken
                })
            });

            const data = await response.json();

            if (data.error) {
                console.error('Token refresh error:', data.error);
                this.disconnect();
                return false;
            }

            this.saveTokens(data.access_token, data.refresh_token, data.expires_in);
            return true;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.disconnect();
            return false;
        }
    },

    async apiRequest(endpoint, method = 'GET', body = null) {
        if (!this.isAuthenticated()) {
            const refreshed = await this.refreshAccessToken();
            if (!refreshed) return null;
        }

        try {
            const options = {
                method,
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            };

            if (body) {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(body);
            }

            const response = await fetch(`https://api.spotify.com/v1${endpoint}`, options);

            if (response.status === 401) {
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    return this.apiRequest(endpoint, method, body);
                }
                return null;
            }

            if (response.status === 204) return { success: true };
            if (!response.ok) return null;

            return response.json();
        } catch (error) {
            console.error('Spotify API error:', error);
            return null;
        }
    },

    async getCurrentPlayback() {
        const data = await this.apiRequest('/me/player');
        return data;
    },

    async play() {
        await this.apiRequest('/me/player/play', 'PUT');
        this.isPlaying = true;
        this.updatePlayPauseButton();
    },

    async pause() {
        await this.apiRequest('/me/player/pause', 'PUT');
        this.isPlaying = false;
        this.updatePlayPauseButton();
    },

    async togglePlayPause() {
        if (this.isPlaying) {
            await this.pause();
        } else {
            await this.play();
        }
    },

    async nextTrack() {
        await this.apiRequest('/me/player/next', 'POST');
        setTimeout(() => this.fetchCurrentTrack(), 500);
    },

    async previousTrack() {
        await this.apiRequest('/me/player/previous', 'POST');
        setTimeout(() => this.fetchCurrentTrack(), 500);
    },

    async seek(positionMs) {
        await this.apiRequest(`/me/player/seek?position_ms=${positionMs}`, 'PUT');
    },

    startPolling() {
        this.fetchCurrentTrack();
        this.pollInterval = setInterval(() => {
            this.fetchCurrentTrack();
        }, 3000);
    },

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    },

    async fetchCurrentTrack() {
        const playback = await this.getCurrentPlayback();
        
        if (!playback || !playback.item) {
            this.showIdle();
            return;
        }

        this.currentTrack = playback.item;
        this.isPlaying = playback.is_playing;
        this.updateUI(playback);
    },

    updateUI(playback) {
        const player = document.getElementById('spotify-player');
        const idle = document.getElementById('spotify-idle');
        
        if (!playback || !playback.item) {
            player?.classList.remove('active');
            idle?.classList.add('active');
            return;
        }

        player?.classList.add('active');
        idle?.classList.remove('active');

        const track = playback.item;
        const albumArt = document.getElementById('spotify-album-art');
        const trackName = document.getElementById('spotify-track-name');
        const artistName = document.getElementById('spotify-artist-name');
        const progressFill = document.getElementById('spotify-progress-fill');
        const currentTime = document.getElementById('spotify-current-time');
        const totalTime = document.getElementById('spotify-total-time');

        if (albumArt && track.album?.images?.[0]) {
            albumArt.src = track.album.images[0].url;
        }
        if (trackName) trackName.textContent = track.name;
        if (artistName) artistName.textContent = track.artists.map(a => a.name).join(', ');

        if (progressFill && playback.progress_ms && track.duration_ms) {
            const progress = (playback.progress_ms / track.duration_ms) * 100;
            progressFill.style.width = `${progress}%`;
        }

        if (currentTime) currentTime.textContent = this.formatTime(playback.progress_ms);
        if (totalTime) totalTime.textContent = this.formatTime(track.duration_ms);

        this.updatePlayPauseButton();
    },

    updatePlayPauseButton() {
        const btn = document.getElementById('spotify-play-pause');
        if (!btn) return;

        if (this.isPlaying) {
            btn.innerHTML = `<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
        } else {
            btn.innerHTML = `<svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>`;
        }
    },

    formatTime(ms) {
        if (!ms) return '0:00';
        const seconds = Math.floor(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    bindEvents() {
        document.getElementById('spotify-connect-btn')?.addEventListener('click', () => {
            this.authorize();
        });

        document.getElementById('spotify-play-pause')?.addEventListener('click', () => {
            this.togglePlayPause();
        });

        document.getElementById('spotify-prev')?.addEventListener('click', () => {
            this.previousTrack();
        });

        document.getElementById('spotify-next')?.addEventListener('click', () => {
            this.nextTrack();
        });

        document.getElementById('spotify-disconnect')?.addEventListener('click', () => {
            this.disconnect();
        });

        document.getElementById('spotify-disconnect-idle')?.addEventListener('click', () => {
            this.disconnect();
        });

        document.getElementById('spotify-retry')?.addEventListener('click', () => {
            this.authorize();
        });

        document.getElementById('spotify-progress-bar')?.addEventListener('click', async (e) => {
            if (!this.currentTrack) return;
            const bar = e.currentTarget;
            const rect = bar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            const positionMs = Math.floor(percent * this.currentTrack.duration_ms);
            await this.seek(positionMs);
            setTimeout(() => this.fetchCurrentTrack(), 300);
        });
    },

    showConnect() {
        document.getElementById('spotify-connect')?.classList.add('active');
        document.getElementById('spotify-player')?.classList.remove('active');
        document.getElementById('spotify-idle')?.classList.remove('active');
        document.getElementById('spotify-error')?.classList.remove('active');
    },

    showPlayer() {
        document.getElementById('spotify-connect')?.classList.remove('active');
        document.getElementById('spotify-player')?.classList.add('active');
    },

    showIdle() {
        document.getElementById('spotify-connect')?.classList.remove('active');
        document.getElementById('spotify-player')?.classList.remove('active');
        document.getElementById('spotify-idle')?.classList.add('active');
    },

    showError(message) {
        document.getElementById('spotify-connect')?.classList.remove('active');
        document.getElementById('spotify-player')?.classList.remove('active');
        document.getElementById('spotify-idle')?.classList.remove('active');
        const errorEl = document.getElementById('spotify-error');
        if (errorEl) {
            errorEl.classList.add('active');
            errorEl.querySelector('p').textContent = message;
        }
    },

    disconnect() {
        this.stopPolling();
        this.clearTokens();
        this.currentTrack = null;
        this.isPlaying = false;
        this.showConnect();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Spotify.init();
});