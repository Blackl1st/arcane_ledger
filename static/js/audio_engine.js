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

    _getAudioElement(track) {
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

        const el = this._getAudioElement(track);
        if (track.active) {
            this.pauseTrack(id);
        } else {
            this.playTrack(id);
        }
        return track.active;
    }

    playTrack(id) {
        const track = this.tracks.find(t => t.id === id);
        if (!track) return;

        track.active = true;
        const el = this._getAudioElement(track);
        el.volume = this.isMuted ? 0 : Math.max(0, Math.min(1, track.volume * this.masterVolume));
        
        // Handle browser autoplay policy gracefully
        const playPromise = el.play();
        if (playPromise !== undefined) {
            playPromise.catch(err => {
                console.warn(`Autoplay blocked for track ${track.name}, will play on user gesture:`, err);
            });
        }
    }

    pauseTrack(id) {
        const track = this.tracks.find(t => t.id === id);
        if (!track) return;

        track.active = false;
        if (this.audioElements.has(id)) {
            const el = this.audioElements.get(id);
            el.pause();
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
        for (const track of this.tracks) {
            this.pauseTrack(track.id);
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
}

// Global engine instance
window.AudioEngine = new AudioLayerEngine();
// Backwards compatibility alias
window.TabletopAudio = window.AudioEngine;
