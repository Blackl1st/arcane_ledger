// Arcane Ledger - Multi-Track Audio Layering Engine & Soundboard
// Supports simultaneous layering of offline ambient tracks, presets, volume faders, and instant tabletop SFX

class AudioLayerEngine {
    constructor() {
        this.tracks = []; // Array of { id, name, category, icon, url, volume, active }
        this.audioElements = new Map(); // id -> HTMLAudioElement
        this.masterVolume = 0.75;
        this.isMuted = false;
        this.activePresetId = null;
        this.audioCtx = null;
    }

    // Initialize or refresh track library
    loadTracks(library) {
        if (!Array.isArray(library)) return;
        this.tracks = library.map(t => ({
            id: t.id || `track-${Math.random().toString(36).substr(2, 9)}`,
            name: t.name || 'Untitled Track',
            category: t.category || 'Ambiance',
            icon: t.icon || '🎵',
            url: t.url,
            volume: typeof t.volume === 'number' ? t.volume : 0.7,
            active: !!t.active
        }));

        // Clean up old audio elements no longer in tracks
        const currentIds = new Set(this.tracks.map(t => t.id));
        for (const [id, el] of this.audioElements.entries()) {
            if (!currentIds.has(id)) {
                el.pause();
                this.audioElements.delete(id);
            }
        }
    }

    _isSpotify(url) {
        if (!url || typeof url !== 'string') return false;
        return url.includes('spotify.com') || url.startsWith('spotify:');
    }

    _getAudioElement(track) {
        if (!track || !track.url || this._isSpotify(track.url)) {
            return null;
        }
        if (!this.audioElements.has(track.id)) {
            const el = new Audio();
            el.src = track.url;
            el.loop = true;
            el.preload = 'auto';
            el.volume = Math.max(0, Math.min(1, track.volume * this.masterVolume));
            this.audioElements.set(track.id, el);
        }
        return this.audioElements.get(track.id);
    }

    // Toggle track active state
    toggleTrack(id) {
        const track = this.tracks.find(t => t.id === id);
        if (!track) return false;

        if (track.active) {
            this.pauseTrack(id);
        } else {
            this.playTrack(id);
        }
        return track.active;
    }

    playTrack(id) {
        const track = Array.isArray(this.tracks) ? this.tracks.find(t => t.id === id) : null;
        if (!track) return;

        track.active = true;
        if (this._isSpotify(track.url)) {
            return;
        }
        const el = this._getAudioElement(track);
        if (!el) return;
        el.volume = this.isMuted ? 0 : Math.max(0, Math.min(1, track.volume * this.masterVolume));
        
        // Handle browser autoplay policy gracefully
        const playPromise = el.play();
        if (playPromise !== undefined) {
            playPromise.then(() => {
                if (!track.active) {
                    try {
                        el.pause();
                        el.currentTime = 0;
                    } catch (e) {}
                }
            }).catch(err => {
                console.warn(`Autoplay blocked for track ${track.name}, will play on user gesture:`, err);
            });
        }
    }

    pauseTrack(id) {
        const track = Array.isArray(this.tracks) ? this.tracks.find(t => t.id === id) : null;
        if (track) {
            track.active = false;
        }
        if (track && this._isSpotify(track.url)) {
            return;
        }
        if (this.audioElements.has(id)) {
            const el = this.audioElements.get(id);
            if (el) {
                try {
                    el.pause();
                    el.currentTime = 0;
                } catch (e) {
                    console.warn(`Error pausing audio track ${id}:`, e);
                }
            }
        }
    }

    setTrackVolume(id, vol) {
        const track = this.tracks.find(t => t.id === id);
        if (!track) return;

        track.volume = Math.max(0, Math.min(1, parseFloat(vol)));
        if (this.audioElements.has(id)) {
            const el = this.audioElements.get(id);
            el.volume = this.isMuted ? 0 : Math.max(0, Math.min(1, track.volume * this.masterVolume));
        }
    }

    setMasterVolume(vol) {
        this.masterVolume = Math.max(0, Math.min(1, parseFloat(vol)));
        for (const track of this.tracks) {
            if (this.audioElements.has(track.id)) {
                const el = this.audioElements.get(track.id);
                el.volume = this.isMuted ? 0 : Math.max(0, Math.min(1, track.volume * this.masterVolume));
            }
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        for (const track of this.tracks) {
            if (this.audioElements.has(track.id)) {
                const el = this.audioElements.get(track.id);
                el.volume = this.isMuted ? 0 : Math.max(0, Math.min(1, track.volume * this.masterVolume));
            }
        }
        return this.isMuted;
    }

    // Stop all active tracks immediately
    stopAll() {
        this.activePresetId = null;
        for (const [id, el] of this.audioElements.entries()) {
            try {
                el.pause();
                el.currentTime = 0;
            } catch (e) {}
        }
        for (const track of this.tracks) {
            track.active = false;
        }
    }

    // Play all currently marked active tracks
    playAllActive() {
        for (const track of this.tracks) {
            if (track.active) {
                this.playTrack(track.id);
            }
        }
    }

    // Smoothly fade out everything over 1.5 seconds
    fadeAll(callback) {
        this.activePresetId = null;
        const startMaster = this.masterVolume;
        const steps = 20;
        const stepTime = 75; // 1.5 seconds total
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            const factor = Math.max(0, (steps - currentStep) / steps);
            for (const track of this.tracks) {
                if (this.audioElements.has(track.id) && track.active) {
                    const el = this.audioElements.get(track.id);
                    el.volume = this.isMuted ? 0 : Math.max(0, Math.min(1, track.volume * startMaster * factor));
                }
            }
            if (currentStep >= steps) {
                clearInterval(interval);
                this.stopAll();
                this.setMasterVolume(startMaster); // Restore target master volume
                if (typeof callback === 'function') callback();
            }
        }, stepTime);
    }

    // Apply a preset: blends layer tracks, sets volumes, pauses non-member tracks
    applyPreset(preset) {
        if (!preset || !preset.layers) return;
        this.activePresetId = preset.id;
        const layerMap = preset.layers; // { trackId: volume }

        // Explicitly halt all audio elements not in the preset layers
        for (const [id, el] of this.audioElements.entries()) {
            if (layerMap[id] === undefined) {
                try {
                    el.pause();
                    el.currentTime = 0;
                } catch (e) {}
            }
        }

        for (const track of this.tracks) {
            if (layerMap[track.id] !== undefined) {
                track.volume = layerMap[track.id];
                this.playTrack(track.id);
            } else {
                this.pauseTrack(track.id);
            }
        }
    }

    getActiveCount() {
        return this.tracks.filter(t => t.active).length;
    }

    // =========================================================================
    // INSTANT TABLETOP SOUND EFFECTS (Zero-latency Web Audio Synthesizer)
    // =========================================================================
    _getAudioCtx() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    }

    playNat20() {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            // Triumphant fanfare arpeggio (C4, E4, G4, C5, E5)
            const freqs = [261.63, 329.63, 392.00, 523.25, 659.25];
            freqs.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                gain.gain.setValueAtTime(0, now + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.25 * this.masterVolume, now + idx * 0.08 + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.65);
            });
        } catch (e) {
            console.warn("SFX error:", e);
        }
    }

    playNat1() {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            // Dissonant downward slide
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(45, now + 0.7);
            gain.gain.setValueAtTime(0.22 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.8);
        } catch (e) {
            console.warn("SFX error:", e);
        }
    }

    playStrike() {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            // Metallic clash (high square pulse + noise)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(980, now);
            osc.frequency.exponentialRampToValueAtTime(280, now + 0.15);
            gain.gain.setValueAtTime(0.25 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.25);
        } catch (e) {
            console.warn("SFX error:", e);
        }
    }

    playSecret() {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            // Ethereal revelation chord
            [587.33, 880.00, 1174.66].forEach((f, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now + i * 0.05);
                gain.gain.setValueAtTime(0, now + i * 0.05);
                gain.gain.linearRampToValueAtTime(0.2 * this.masterVolume, now + i * 0.05 + 0.04);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 1.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.05);
                osc.stop(now + i * 0.05 + 1.25);
            });
        } catch (e) {
            console.warn("SFX error:", e);
        }
    }

    playBell() {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            // Cathedral Bell Toll (Harmonics: 220Hz, 440Hz, 660Hz, 880Hz)
            [220, 440, 660, 880].forEach((f, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(f, now);
                gain.gain.setValueAtTime((0.2 / (idx + 1)) * this.masterVolume, now);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 2.5);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 2.6);
            });
        } catch (e) {
            console.warn("SFX error:", e);
        }
    }

    playHeartbeat() {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            // Double-thump visceral heartbeat: lub-dub
            [0, 0.28].forEach((offset, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                const baseFreq = idx === 0 ? 58 : 46;
                osc.frequency.setValueAtTime(baseFreq, now + offset);
                osc.frequency.exponentialRampToValueAtTime(28, now + offset + 0.18);
                gain.gain.setValueAtTime(0, now + offset);
                gain.gain.linearRampToValueAtTime(0.35 * this.masterVolume, now + offset + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + offset);
                osc.stop(now + offset + 0.25);
            });
        } catch (e) {
            console.warn("Heartbeat sound error:", e);
        }
    }

    playBossThreat() {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            // Dark ominous brass/horn swell
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(110, now);
            osc.frequency.exponentialRampToValueAtTime(73.4, now + 1.2);
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(250, now);
            filter.frequency.linearRampToValueAtTime(550, now + 0.4);
            filter.frequency.exponentialRampToValueAtTime(140, now + 1.2);
            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.25 * this.masterVolume, now + 0.35);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.3);
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 1.35);
        } catch (e) {
            console.warn("Boss threat sound error:", e);
        }
    }

    playFireball() {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            
            // 1. Low frequency sub-bass boom
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(140, now);
            osc.frequency.exponentialRampToValueAtTime(28, now + 1.1);
            gain.gain.setValueAtTime(0.42 * this.masterVolume, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 1.2);

            // 2. Filtered noise explosion burst
            const bufferSize = ctx.sampleRate * 0.9;
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            const whiteNoise = ctx.createBufferSource();
            whiteNoise.buffer = noiseBuffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(850, now);
            filter.frequency.exponentialRampToValueAtTime(75, now + 0.85);

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.38 * this.masterVolume, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

            whiteNoise.connect(filter);
            filter.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            whiteNoise.start(now);
            whiteNoise.stop(now + 0.95);
        } catch (e) {
            console.warn("Fireball SFX error:", e);
        }
    }

    playDragonRoar() {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            [68, 72].forEach((baseFreq) => {
                const osc = ctx.createOscillator();
                const filter = ctx.createBiquadFilter();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(baseFreq, now);
                osc.frequency.linearRampToValueAtTime(baseFreq * 1.6, now + 0.4);
                osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.7, now + 1.4);

                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(260, now);
                filter.frequency.linearRampToValueAtTime(650, now + 0.5);
                filter.frequency.exponentialRampToValueAtTime(180, now + 1.4);
                filter.Q.value = 3.0;

                gain.gain.setValueAtTime(0.01, now);
                gain.gain.linearRampToValueAtTime(0.32 * this.masterVolume, now + 0.25);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 1.5);
            });
        } catch (e) {
            console.warn("Dragon roar SFX error:", e);
        }
    }

    playTrap() {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            // High metallic trigger click
            const clickOsc = ctx.createOscillator();
            const clickGain = ctx.createGain();
            clickOsc.type = 'triangle';
            clickOsc.frequency.setValueAtTime(2200, now);
            clickGain.gain.setValueAtTime(0.3 * this.masterVolume, now);
            clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            clickOsc.connect(clickGain);
            clickGain.connect(ctx.destination);
            clickOsc.start(now);
            clickOsc.stop(now + 0.06);

            // Heavy spring snap 40ms later
            const snapOsc = ctx.createOscillator();
            const snapGain = ctx.createGain();
            snapOsc.type = 'sawtooth';
            snapOsc.frequency.setValueAtTime(450, now + 0.04);
            snapOsc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
            snapGain.gain.setValueAtTime(0.35 * this.masterVolume, now + 0.04);
            snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
            snapOsc.connect(snapGain);
            snapGain.connect(ctx.destination);
            snapOsc.start(now + 0.04);
            snapOsc.stop(now + 0.3);
        } catch (e) {
            console.warn("Trap SFX error:", e);
        }
    }

    playRestChime() {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            // Serene ethereal celestial harp arpeggio (C4, E4, G4, B4, C5, E5)
            const notes = [261.63, 329.63, 392.00, 493.88, 523.25, 659.25];
            notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.12);
                gain.gain.setValueAtTime(0, now + idx * 0.12);
                gain.gain.linearRampToValueAtTime(0.22 * this.masterVolume, now + idx * 0.12 + 0.03);
                gain.gain.exponentialRampToValueAtTime(0.0005, now + idx * 0.12 + 1.8);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.12);
                osc.stop(now + idx * 0.12 + 1.85);
            });
        } catch (e) {
            console.warn("Rest chime error:", e);
        }
    }

    playTurnChime() {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            // Subtle crisp tabletop turn prompt: G5 (784Hz) -> C6 (1046Hz)
            [783.99, 1046.50].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                gain.gain.setValueAtTime(0, now + idx * 0.08);
                gain.gain.linearRampToValueAtTime(0.18 * this.masterVolume, now + idx * 0.08 + 0.015);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.45);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.08);
                osc.stop(now + idx * 0.08 + 0.5);
            });
        } catch (e) {
            console.warn("Turn chime error:", e);
        }
    }

    playVictoryFanfare() {
        try {
            const ctx = this._getAudioCtx();
            const now = ctx.currentTime;
            // Triumphant orchestral brass chords
            const chords = [
                { time: 0.0, freqs: [261.63, 329.63, 392.00] },
                { time: 0.22, freqs: [349.23, 440.00, 523.25] },
                { time: 0.45, freqs: [392.00, 493.88, 587.33] },
                { time: 0.72, freqs: [523.25, 659.25, 783.99] }
            ];
            chords.forEach((chord) => {
                chord.freqs.forEach((freq) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, now + chord.time);
                    gain.gain.setValueAtTime(0, now + chord.time);
                    gain.gain.linearRampToValueAtTime(0.15 * this.masterVolume, now + chord.time + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + chord.time + 0.65);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now + chord.time);
                    osc.stop(now + chord.time + 0.7);
                });
            });
        } catch (e) {
            console.warn("Victory fanfare error:", e);
        }
    }

    playSfxByName(name) {
        if (!name) return;
        const key = name.toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (key.includes('fireball') || key.includes('blast') || key.includes('explosion')) {
            this.playFireball();
        } else if (key.includes('sword') || key.includes('clash') || key.includes('strike') || key.includes('hit')) {
            this.playStrike();
        } else if (key.includes('dragon') || key.includes('roar') || key.includes('beast')) {
            this.playDragonRoar();
        } else if (key.includes('victory') || key.includes('fanfare') || key.includes('win')) {
            this.playVictoryFanfare();
        } else if (key.includes('defeat') || key.includes('bell') || key.includes('toll') || key.includes('death')) {
            this.playBell();
        } else if (key.includes('trap')) {
            this.playTrap();
        } else if (key.includes('secret') || key.includes('reveal')) {
            this.playSecret();
        } else if (key.includes('boss')) {
            this.playBossThreat();
        } else if (key.includes('nat20') || key.includes('crit')) {
            this.playNat20();
        } else if (key.includes('nat1') || key.includes('fumble')) {
            this.playNat1();
        } else if (key.includes('heartbeat')) {
            this.playHeartbeat();
        } else if (key.includes('rest')) {
            this.playRestChime();
        } else if (key.includes('turn')) {
            this.playTurnChime();
        } else {
            this.playStrike();
        }
    }
}

// Global engine instance
window.AudioEngine = new AudioLayerEngine();
// Backwards compatibility alias
window.TabletopAudio = window.AudioEngine;
