// =============================================================================
// AMARAN & TABLETOP DUAL-CHANNEL LIGHTING CONTROLLER
// Channel 1: amaran 60d S (Overhead Table / Battlemap Reading Light)
// Channel 2: amaran Ace 25c (Atmosphere, Colors, Dynamic FX & Scene Mood)
// =============================================================================

class TabletopLightingEngine {
    constructor() {
        this.apiUrl = "ws://127.0.0.1:12345";
        this.socket = null;
        this.isConnected = false;
        this.reconnectTimer = null;
        this.syncAudio = true;
        this.diceTriggers = true;
        this.reactiveCombat = true;
        this._isHeroDown = false;
        this._savedBeforeDownOverhead = null;
        this._savedBeforeDownAtmosphere = null;

        this.fixtures = [];
        this.fixtureConfigs = {};

        // Independent dual-channel lighting state
        this.state = {
            // CHANNEL 1: Overhead Table Light (amaran 60d S)
            overhead: {
                node_id: "400L5-13106A",
                name: "amaran 60d S #1",
                brightness: 45,       // 0 - 100% (ideal for map & character sheet visibility)
                enabled: true,
                linkFlashes: false    // If true, 60d S flashes along with dramatic combat rolls
            },
            // CHANNEL 2: Scene Atmosphere Light (amaran Ace 25c Group)
            atmosphere: {
                node_id: "400U5-52611A",
                node_ids: ["400U5-52611A"],
                fixtures: [
                    { node_id: "400U5-52611A", name: "amaran Ace 25c #1", enabled: true }
                ],
                name: "amaran Ace 25c (Group)",
                brightness: 70,       // 0 - 100%
                cct: 2500,            // 2300K - 10000K
                rgb: [255, 160, 60],  // R, G, B
                mode: "rgb",          // "cct", "rgb", "effect"
                effect: "fire",       // "solid", "fire", "lightning", "pulsing", "strobe"
                activePreset: "preset-tavern",
                enabled: true
            }
        };

        // Preset atmospheres for the Ace 25c
        this.presets = {
            "preset-tavern": {
                name: "Cozy Tavern Hearth",
                icon: "🍻",
                mode: "cct",
                cct: 2500,
                brightness: 65,
                rgb: [255, 160, 60],
                effect: "fire",
                description: "Warm 2500K hearth flicker on walls"
            },
            "preset-camp": {
                name: "Wilderness Campfire",
                icon: "🏕️",
                mode: "rgb",
                cct: 3800,
                brightness: 50,
                rgb: [255, 120, 30],
                effect: "fire",
                description: "Deep orange campfire flame glow"
            },
            "preset-stormy-crypt": {
                name: "Stormy Crypt & Thunder",
                icon: "🗝️",
                mode: "rgb",
                cct: 6500,
                brightness: 40,
                rgb: [80, 160, 255],
                effect: "lightning",
                description: "Cold blue gloom with lightning strikes"
            },
            "preset-combat-boss": {
                name: "Blood Moon / Boss Fight",
                icon: "🥁",
                mode: "rgb",
                cct: 4000,
                brightness: 80,
                rgb: [230, 20, 20],
                effect: "pulsing",
                description: "Menacing crimson combat pulse"
            },
            "preset-arcane-sanctum": {
                name: "Arcane Sanctum",
                icon: "🔮",
                mode: "rgb",
                cct: 5000,
                brightness: 60,
                rgb: [140, 30, 255],
                effect: "solid",
                description: "Mystic ethereal violet & deep indigo glow"
            },
            "preset-feywild": {
                name: "Feywild Glade",
                icon: "🌿",
                mode: "rgb",
                cct: 4500,
                brightness: 55,
                rgb: [30, 220, 110],
                effect: "solid",
                description: "Enchanted emerald fey forest light"
            },
            "preset-daylight": {
                name: "High Noon Daylight",
                icon: "☀️",
                mode: "cct",
                cct: 5600,
                brightness: 85,
                rgb: [255, 245, 235],
                effect: "solid",
                description: "Clean natural 5600K daylight"
            }
        };

        this._tempFlashTimeout = null;
        this._hasSentInitialState = false;
        this._lastOverheadNonZero = 45;

        // Serialized BLE Command Queue & Debounce Timers
        this._commandQueue = Promise.resolve();
        this._syncTimer = null;
    }

    _enqueue(fn) {
        this._commandQueue = this._commandQueue.then(async () => {
            try {
                await fn();
            } catch (e) {
                console.error("Lighting queue execution error:", e);
            }
        });
        return this._commandQueue;
    }

    _debouncedSyncToServer() {
        if (this._syncTimer) clearTimeout(this._syncTimer);
        this._syncTimer = setTimeout(() => {
            this._syncTimer = null;
            this.syncToServer();
        }, 400);
    }

    async init(config = {}) {
        try {
            const res = await fetch('/api/lighting');
            if (res.ok) {
                const remote = await res.json();
                config = Object.assign({}, remote, config);
            }
        } catch (e) {}

        if (config.apiUrl) this.apiUrl = config.apiUrl;
        if (config.syncAudio !== undefined) this.syncAudio = config.syncAudio;
        if (config.diceTriggers !== undefined) this.diceTriggers = config.diceTriggers;

        if (config.overhead) {
            this.state.overhead = Object.assign(this.state.overhead, config.overhead);
        }
        if (config.atmosphere) {
            this.state.atmosphere = Object.assign(this.state.atmosphere, config.atmosphere);
            if (!Array.isArray(this.state.atmosphere.fixtures) || this.state.atmosphere.fixtures.length === 0) {
                if (Array.isArray(this.state.atmosphere.node_ids) && this.state.atmosphere.node_ids.length > 0) {
                    this.state.atmosphere.fixtures = this.state.atmosphere.node_ids.map((nid, i) => ({
                        node_id: nid,
                        name: `amaran Ace 25c #${i + 1}`,
                        enabled: true
                    }));
                } else if (this.state.atmosphere.node_id) {
                    this.state.atmosphere.fixtures = [{
                        node_id: this.state.atmosphere.node_id,
                        name: this.state.atmosphere.name || "amaran Ace 25c #1",
                        enabled: true
                    }];
                }
            }
            this._updateAtmosphereNodeIds();
        }

        // Backward compatibility if flat values passed
        if (config.brightness !== undefined && !config.atmosphere) {
            this.state.atmosphere.brightness = config.brightness;
        }
        if (config.cct !== undefined && !config.atmosphere) {
            this.state.atmosphere.cct = config.cct;
        }
        if (config.rgb && !config.atmosphere) {
            this.state.atmosphere.rgb = config.rgb;
        }
        if (config.effect && !config.atmosphere) {
            this.state.atmosphere.effect = config.effect;
        }

        this.connect();
        this.fetchBackendFixtures();
        this.updateSimulatorVisuals();
        this.updateUI();
    }

    connect(url = null) {
        if (url) this.apiUrl = url;
        if (this.socket && this.socket.readyState === WebSocket.OPEN) return;

        try {
            this.socket = new WebSocket(this.apiUrl);

            this.socket.onopen = () => {
                this.isConnected = true;
                this.updateStatusBadge();
                this.queryFixtures();
            };

            this.socket.onmessage = (evt) => {
                try {
                    const msg = JSON.parse(evt.data);
                    this.handleSocketMessage(msg);
                } catch (e) {
                    console.error("Failed to parse amaran socket msg:", e);
                }
            };

            this.socket.onclose = () => {
                this.isConnected = false;
                this.updateStatusBadge();
                if (!this.reconnectTimer) {
                    this.reconnectTimer = setTimeout(() => {
                        this.reconnectTimer = null;
                        this.connect();
                    }, 6000);
                }
            };

            this.socket.onerror = () => {
                this.isConnected = false;
                this.updateStatusBadge();
            };
        } catch (e) {
            this.isConnected = false;
            this.updateStatusBadge();
            this.fetchBackendFixtures();
        }
    }

    queryFixtures() {
        this.sendRequest("get_fixture_list");
    }

    handleSocketMessage(msg) {
        if (!msg || msg.code !== 0) return;

        const reqType = msg.request ? msg.request.type : (msg.type || "");
        const data = msg.data ? (msg.data.data !== undefined ? msg.data.data : msg.data) : null;

        if (reqType === "get_fixture_list" && Array.isArray(data)) {
            this.fixtures = data;
            this._assignFixtureRoles();
            this.renderFixturesList();
            this.updateStatusBadge();

            this.fixtures.forEach(f => {
                this.sendRequest("get_node_config", null, f.node_id);
            });

            if (!this._hasSentInitialState) {
                this._hasSentInitialState = true;
                this.sendCurrentState();
            }
        } else if (reqType === "get_node_config" && data) {
            const nid = msg.data ? msg.data.node_id : (msg.request ? msg.request.node_id : null);
            if (nid) {
                this.fixtureConfigs[nid] = data;
            }
        }
    }

    async fetchBackendFixtures() {
        try {
            const res = await fetch('/api/lighting/fixtures');
            if (res.ok) {
                const data = await res.json();
                if (data.connected && Array.isArray(data.fixtures) && data.fixtures.length > 0) {
                    this.fixtures = data.fixtures;
                    this.isConnected = true;
                    this._assignFixtureRoles();
                    this.renderFixturesList();
                    this.updateStatusBadge();
                }
            }
        } catch (e) {}
    }

    _assignFixtureRoles() {
        if (!this.fixtures || this.fixtures.length === 0) return;

        // Auto-assign overhead table light (amaran 60d S)
        const sixty = this.fixtures.find(f => f.name.toLowerCase().includes("60d") || f.node_id.includes("400L"));
        if (sixty) {
            this.state.overhead.node_id = sixty.node_id;
            this.state.overhead.name = sixty.name;
        }

        // Auto-discover all amaran Ace 25c fixtures
        const aceFixtures = this.fixtures.filter(f => {
            const n = (f.name || "").toLowerCase();
            const id = (f.node_id || "");
            return n.includes("ace") || id.includes("400U") || n.includes("atmosphere");
        });

        let addedNew = false;
        if (aceFixtures.length > 0) {
            if (!Array.isArray(this.state.atmosphere.fixtures) || this.state.atmosphere.fixtures.length === 0) {
                this.state.atmosphere.fixtures = aceFixtures.map((f, i) => ({
                    node_id: f.node_id,
                    name: f.name || `amaran Ace 25c #${i + 1}`,
                    enabled: true
                }));
                addedNew = true;
            } else {
                aceFixtures.forEach(af => {
                    const exists = this.state.atmosphere.fixtures.find(f => f.node_id === af.node_id);
                    if (!exists) {
                        this.state.atmosphere.fixtures.push({
                            node_id: af.node_id,
                            name: af.name || `amaran Ace 25c #${this.state.atmosphere.fixtures.length + 1}`,
                            enabled: true
                        });
                        addedNew = true;
                    }
                });
            }
            this._updateAtmosphereNodeIds();
            if (addedNew) {
                this.syncToServer();
            }
        }
    }

    _updateAtmosphereNodeIds() {
        if (!Array.isArray(this.state.atmosphere.fixtures)) {
            this.state.atmosphere.fixtures = [];
        }
        const enabledIds = this.state.atmosphere.fixtures
            .filter(f => f && f.enabled !== false && f.node_id)
            .map(f => f.node_id);

        this.state.atmosphere.node_ids = enabledIds;
        if (enabledIds.length > 0) {
            this.state.atmosphere.node_id = enabledIds[0];
        }
    }

    getOverheadNodeId() {
        return this.state.overhead.node_id || "400L5-13106A";
    }

    getAtmosphereNodeIds() {
        this._updateAtmosphereNodeIds();
        if (this.state.atmosphere.node_ids && this.state.atmosphere.node_ids.length > 0) {
            return this.state.atmosphere.node_ids;
        }
        return [this.state.atmosphere.node_id || "400U5-52611A"];
    }

    getAtmosphereNodeId() {
        const ids = this.getAtmosphereNodeIds();
        return ids[0] || "400U5-52611A";
    }

    addAtmosphereFixture(nodeId, name = null) {
        if (!nodeId || typeof nodeId !== 'string') return;
        const cleanId = nodeId.trim();
        if (!cleanId) return;

        if (!Array.isArray(this.state.atmosphere.fixtures)) {
            this.state.atmosphere.fixtures = [];
        }

        const existing = this.state.atmosphere.fixtures.find(f => f.node_id === cleanId);
        if (existing) {
            existing.enabled = true;
            if (name) existing.name = name.trim();
        } else {
            const num = this.state.atmosphere.fixtures.length + 1;
            this.state.atmosphere.fixtures.push({
                node_id: cleanId,
                name: (name && name.trim()) || `amaran Ace 25c #${num}`,
                enabled: true
            });
        }

        this._updateAtmosphereNodeIds();
        this.sendAtmosphereState();
        this.updateAtmosphereUI();
        this.syncToServer();
        if (typeof showToast === 'function') {
            showToast(`Added ${name || cleanId} to Atmosphere Group`, "success");
        }
    }

    removeAtmosphereFixture(nodeId) {
        if (!Array.isArray(this.state.atmosphere.fixtures)) return;
        if (this.state.atmosphere.fixtures.length <= 1) {
            if (typeof showToast === 'function') {
                showToast("Cannot remove the last atmosphere fixture", "warning");
            }
            return;
        }

        this.state.atmosphere.fixtures = this.state.atmosphere.fixtures.filter(f => f.node_id !== nodeId);
        this._updateAtmosphereNodeIds();
        this.updateAtmosphereUI();
        this.syncToServer();
        if (typeof showToast === 'function') {
            showToast(`Removed fixture from Atmosphere Group`, "info");
        }
    }

    toggleAtmosphereFixture(nodeId, enabled = null) {
        if (!Array.isArray(this.state.atmosphere.fixtures)) return;
        const fix = this.state.atmosphere.fixtures.find(f => f.node_id === nodeId);
        if (fix) {
            fix.enabled = enabled !== null ? !!enabled : !fix.enabled;
            this._updateAtmosphereNodeIds();

            if (!fix.enabled) {
                this.sendRequest("set_intensity", { intensity: 0 }, nodeId);
            } else {
                const intensity = Math.round(this.state.atmosphere.brightness * 10);
                this.sendRequest("set_intensity", { intensity: intensity }, nodeId);
                setTimeout(() => {
                    if (this.state.atmosphere.mode === "rgb" || (this.state.atmosphere.rgb && this.state.atmosphere.effect !== "solid")) {
                        const hex = this._rgbToHex(this.state.atmosphere.rgb);
                        this.sendRequest("set_color", { color: hex }, nodeId);
                    } else {
                        this.sendRequest("set_cct", { cct: this.state.atmosphere.cct }, nodeId);
                    }
                    if (this.state.atmosphere.effect && this.state.atmosphere.effect !== "solid") {
                        setTimeout(() => {
                            const mapped = this._mapEffectName(this.state.atmosphere.effect);
                            this.sendRequest("set_system_effect", { effect_type: mapped }, nodeId);
                        }, 50);
                    }
                }, 50);
            }

            this.updateAtmosphereUI();
            this.syncToServer();
        }
    }

    async sendAtmosphereRequest(type, args = null, delayBetweenNodes = 100) {
        const ids = this.getAtmosphereNodeIds();
        if (!ids || ids.length === 0) return;

        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            for (let i = 0; i < ids.length; i++) {
                if (i > 0) {
                    await new Promise(r => setTimeout(r, delayBetweenNodes));
                }
                this.sendRequest(type, args, ids[i]);
            }
        } else {
            const payload = {
                version: 1,
                client_id: "dnd_dashboard",
                type: type,
                node_ids: ids
            };
            if (args) payload.args = args;
            try {
                await fetch('/api/lighting/command', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (e) {}
        }
    }

    sendRequest(type, args = null, nodeId = null) {
        const payload = {
            version: 1,
            client_id: "dnd_dashboard",
            type: type
        };
        if (nodeId) payload.node_id = nodeId;
        if (args) payload.args = args;

        const jsonStr = JSON.stringify(payload);

        let sent = false;
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            try {
                this.socket.send(jsonStr);
                sent = true;
            } catch (e) {
                console.warn("WebSocket direct send failed, using relay:", e);
            }
        }

        // Dual-dispatch / relay fallback to FastAPI backend
        if (!sent) {
            fetch('/api/lighting/command', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: jsonStr
            }).catch(() => {});
        }
    }

    sendCurrentState() {
        // 1. Send Overhead Table Light State (amaran 60d S)
        this.sendOverheadState();

        // 2. Send Atmosphere Light State (amaran Ace 25c Group)
        this.sendAtmosphereState();
    }

    sendOverheadState() {
        const nid = this.getOverheadNodeId();
        const intensity = this.state.overhead.enabled ? Math.round(this.state.overhead.brightness * 10) : 0;
        return this._enqueue(async () => {
            this.sendRequest("set_intensity", { intensity: intensity }, nid);
            await new Promise(r => setTimeout(r, 80));
        });
    }

    async sendAtmosphereState() {
        return this._enqueue(async () => {
            const intensity = this.state.atmosphere.enabled ? Math.round(this.state.atmosphere.brightness * 10) : 0;

            // Phase 1: Set intensity across all atmosphere fixtures
            await this.sendAtmosphereRequest("set_intensity", { intensity: intensity }, 100);

            // Phase 2: Set color or CCT base tone across all atmosphere fixtures first
            await new Promise(r => setTimeout(r, 120));
            if (this.state.atmosphere.mode === "rgb" || (this.state.atmosphere.rgb && this.state.atmosphere.effect !== "solid")) {
                const hex = this._rgbToHex(this.state.atmosphere.rgb);
                await this.sendAtmosphereRequest("set_color", { color: hex }, 100);
            } else {
                const cct = Math.max(2300, Math.min(10000, this.state.atmosphere.cct || 3200));
                await this.sendAtmosphereRequest("set_cct", { cct: cct }, 100);
            }

            // Phase 3: Dynamic hardware effect (if not solid), after color baseline is set
            if (this.state.atmosphere.effect && this.state.atmosphere.effect !== "solid") {
                await new Promise(r => setTimeout(r, 120));
                const mapped = this._mapEffectName(this.state.atmosphere.effect);
                await this.sendAtmosphereRequest("set_system_effect", { effect_type: mapped }, 100);
            }
        });
    }

    _mapEffectName(eff) {
        const map = {
            "candle": "fire",
            "fire": "fire",
            "lightning": "lightning",
            "storm": "lightning",
            "pulse": "pulsing",
            "pulsing": "pulsing",
            "strobe": "strobe",
            "explosion": "explosion",
            "dungeon": "fault_bulb",
            "flicker": "fault_bulb",
            "party": "party_lights",
            "party_lights": "party_lights"
        };
        return map[eff] || "fire";
    }

    _rgbToHex(rgb) {
        if (!Array.isArray(rgb) || rgb.length < 3) return "#FF9900";
        return "#" + rgb.slice(0, 3).map(x => {
            const n = Math.max(0, Math.min(255, parseInt(x) || 0));
            return n.toString(16).padStart(2, '0');
        }).join('');
    }

    // =========================================================================
    // CHANNEL 1: OVERHEAD TABLE LIGHT CONTROLS (amaran 60d S)
    // =========================================================================
    setOverheadBrightness(val) {
        const b = Math.max(0, Math.min(100, parseInt(val) || 0));
        this.state.overhead.brightness = b;
        this.state.overhead.enabled = b > 0;
        if (b > 0) this._lastOverheadNonZero = b;

        this.updateOverheadUI();
        this.updateStatusBadge();
        this._debouncedSyncToServer();

        const intensity = Math.round(b * 10);
        return this._enqueue(async () => {
            this.sendRequest("set_intensity", { intensity: intensity }, this.getOverheadNodeId());
            await new Promise(r => setTimeout(r, 80));
        });
    }

    setOverheadPreset(level) {
        let target = 45;
        if (level === 'off') target = 0;
        else if (level === 'dim') target = 20;
        else if (level === 'play') target = 45;
        else if (level === 'bright') target = 85;

        return this.setOverheadBrightness(target);
    }

    toggleOverheadPower() {
        if (this.state.overhead.brightness > 0) {
            this._lastOverheadNonZero = this.state.overhead.brightness;
            return this.setOverheadBrightness(0);
        } else {
            return this.setOverheadBrightness(this._lastOverheadNonZero || 45);
        }
    }

    toggleOverheadFlashes(checked) {
        this.state.overhead.linkFlashes = !!checked;
        this.syncToServer();
    }

    // =========================================================================
    // CHANNEL 2: SCENE ATMOSPHERE LIGHT CONTROLS (amaran Ace 25c)
    // =========================================================================
    setAtmosphereBrightness(val) {
        const b = Math.max(0, Math.min(100, parseInt(val) || 0));
        this.state.atmosphere.brightness = b;
        this.state.atmosphere.enabled = b > 0;

        this.updateAtmosphereUI();
        this.updateSimulatorVisuals();
        this._debouncedSyncToServer();

        const intensity = Math.round(b * 10);
        return this._enqueue(async () => {
            await this.sendAtmosphereRequest("set_intensity", { intensity: intensity }, 100);
        });
    }

    setAtmosphereCCT(val) {
        const cct = Math.max(2300, Math.min(10000, parseInt(val) || 3200));
        this.state.atmosphere.cct = cct;
        this.state.atmosphere.mode = "cct";
        this.state.atmosphere.effect = "solid";

        this.updateSimulatorVisuals();
        this.updateAtmosphereUI();
        this._debouncedSyncToServer();

        return this._enqueue(async () => {
            await this.sendAtmosphereRequest("set_cct", { cct: cct }, 100);
        });
    }

    setAtmosphereColor(rgb) {
        if (!Array.isArray(rgb)) return Promise.resolve();
        this.state.atmosphere.rgb = [rgb[0], rgb[1], rgb[2]];
        this.state.atmosphere.mode = "rgb";
        this.state.atmosphere.effect = "solid";

        const hex = this._rgbToHex(this.state.atmosphere.rgb);
        this.updateSimulatorVisuals();
        this.updateAtmosphereUI();
        this._debouncedSyncToServer();

        return this._enqueue(async () => {
            await this.sendAtmosphereRequest("set_color", { color: hex }, 100);
        });
    }

    setAtmosphereHex(hex) {
        if (!hex || typeof hex !== 'string') return Promise.resolve();
        const clean = hex.replace('#', '');
        if (clean.length === 6) {
            const r = parseInt(clean.substring(0, 2), 16) || 0;
            const g = parseInt(clean.substring(2, 4), 16) || 0;
            const b = parseInt(clean.substring(4, 6), 16) || 0;
            return this.setAtmosphereColor([r, g, b]);
        }
        return Promise.resolve();
    }

    setAtmosphereEffect(effectName) {
        this.state.atmosphere.effect = effectName;

        this.updateSimulatorVisuals();
        this.updateAtmosphereUI();
        this._debouncedSyncToServer();

        return this._enqueue(async () => {
            if (effectName === "solid") {
                if (this.state.atmosphere.mode === "rgb") {
                    const hex = this._rgbToHex(this.state.atmosphere.rgb);
                    await this.sendAtmosphereRequest("set_color", { color: hex }, 100);
                } else {
                    const cct = Math.max(2300, Math.min(10000, this.state.atmosphere.cct || 3200));
                    await this.sendAtmosphereRequest("set_cct", { cct: cct }, 100);
                }
            } else {
                // Ensure base tone is prepared across all fixtures before triggering hardware effect
                if (this.state.atmosphere.mode === "rgb" && this.state.atmosphere.rgb) {
                    const hex = this._rgbToHex(this.state.atmosphere.rgb);
                    await this.sendAtmosphereRequest("set_color", { color: hex }, 100);
                    await new Promise(r => setTimeout(r, 120));
                } else {
                    const cct = Math.max(2300, Math.min(10000, this.state.atmosphere.cct || 3200));
                    await this.sendAtmosphereRequest("set_cct", { cct: cct }, 100);
                    await new Promise(r => setTimeout(r, 120));
                }
                const mapped = this._mapEffectName(effectName);
                await this.sendAtmosphereRequest("set_system_effect", { effect_type: mapped }, 100);
            }
        });
    }

    async applyAtmosphereConfig(cfg, presetId = null) {
        if (!cfg) return;
        if (presetId) this.state.atmosphere.activePreset = presetId;

        if (cfg.brightness !== undefined) {
            const b = Math.max(0, Math.min(100, parseInt(cfg.brightness) || 0));
            this.state.atmosphere.brightness = b;
            this.state.atmosphere.enabled = b > 0;
        }
        if (cfg.mode) this.state.atmosphere.mode = cfg.mode;
        if (cfg.cct !== undefined) this.state.atmosphere.cct = Math.max(2300, Math.min(10000, parseInt(cfg.cct) || 3200));

        if (cfg.color) {
            const clean = String(cfg.color).replace('#', '');
            if (clean.length === 6) {
                this.state.atmosphere.rgb = [
                    parseInt(clean.substring(0, 2), 16) || 0,
                    parseInt(clean.substring(2, 4), 16) || 0,
                    parseInt(clean.substring(4, 6), 16) || 0
                ];
            }
        } else if (Array.isArray(cfg.rgb) && cfg.rgb.length >= 3) {
            this.state.atmosphere.rgb = [cfg.rgb[0], cfg.rgb[1], cfg.rgb[2]];
        }

        if (cfg.effect) this.state.atmosphere.effect = cfg.effect;

        // Apply immediately to visuals
        this.updateSimulatorVisuals();
        this.updateAtmosphereUI();
        this.updateStatusBadge();

        // Send hardware state reliably across all fixtures
        await this.sendAtmosphereState();

        // Sync to server once
        this.syncToServer();
    }

    async applyPreset(presetId) {
        // 1. First check appState.audioPresets for live user-edited lighting settings
        if (typeof appState !== 'undefined' && Array.isArray(appState.audioPresets)) {
            const ap = appState.audioPresets.find(p => p.id === presetId);
            if (ap && ap.lighting) {
                if (ap.lighting.overhead && ap.lighting.overhead.brightness !== undefined) {
                    await this.setOverheadBrightness(ap.lighting.overhead.brightness);
                }
                if (ap.lighting.atmosphere) {
                    await this.applyAtmosphereConfig(ap.lighting.atmosphere, presetId);
                    return;
                }
            }
        }

        const p = this.presets[presetId];
        if (!p) return;

        await this.applyAtmosphereConfig({
            brightness: p.brightness,
            mode: p.mode,
            cct: p.cct,
            rgb: p.rgb,
            effect: p.effect
        }, presetId);
    }

    // Compatibility wrappers for existing code
    setBrightness(val) { this.setAtmosphereBrightness(val); }
    setCCT(val) { this.setAtmosphereCCT(val); }
    setColor(rgb) { this.setAtmosphereColor(rgb); }
    setRGB(r, g, b) { this.setAtmosphereColor([r, g, b]); }
    setEffect(effectName) { this.setAtmosphereEffect(effectName); }

    // =========================================================================
    // DRAMATIC DICE & COMBAT REACTIVE HARDWARE FLASHES
    // =========================================================================
    triggerNat20Flash() {
        if (!this.diceTriggers) return;
        this._flashHardwareColor([255, 215, 0], 100, "party_lights", 1600);
    }

    triggerNat1Flash() {
        if (!this.diceTriggers) return;
        this._flashHardwareColor([255, 20, 20], 90, "pulsing", 1300);
    }

    triggerStrikeFlash() {
        if (!this.diceTriggers) return;
        this._flashHardwareColor([255, 255, 255], 100, "strobe", 350);
    }

    // =========================================================================
    // REACTIVE COMBAT STATE LIGHTING (Bloodied, 0 HP Hero Down, Boss Threat)
    // =========================================================================
    toggleReactiveCombat(enabled) {
        this.reactiveCombat = enabled !== undefined ? enabled : !this.reactiveCombat;
        this.updateReactiveCombatUI();
        return this.reactiveCombat;
    }

    updateReactiveCombatUI() {
        const dot = document.getElementById("reactive-combat-dot");
        const btn = document.getElementById("btn-reactive-combat-toggle");
        if (dot && btn) {
            if (this.reactiveCombat) {
                dot.className = "w-2 h-2 rounded-full bg-emerald-400 animate-pulse";
                btn.className = "px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition";
            } else {
                dot.className = "w-2 h-2 rounded-full bg-slate-500";
                btn.className = "px-2.5 py-1.5 rounded-lg bg-ledger-800 hover:bg-ledger-700 text-slate-400 border border-ledger-700 text-xs font-semibold flex items-center gap-1.5 transition";
            }
        }
    }

    triggerBloodiedPulse(combatant) {
        if (!this.reactiveCombat) return;
        const isBoss = combatant && (combatant.type === 'boss' || (combatant.name && combatant.name.toLowerCase().includes('boss')));
        
        if (this._tempFlashTimeout) clearTimeout(this._tempFlashTimeout);
        if (this._bloodiedTimeout) clearTimeout(this._bloodiedTimeout);

        const prevAtmosphere = JSON.parse(JSON.stringify(this.state.atmosphere));
        const prevOverhead = JSON.parse(JSON.stringify(this.state.overhead));

        const crimsonHex = isBoss ? "#990000" : "#DC2626";
        const pulseRgb = isBoss ? [180, 0, 0] : [240, 20, 20];
        const pulseIntensity = 1000;

        let beatCount = 0;
        const totalBeats = 3;

        const executeBeat = () => {
            if (beatCount >= totalBeats) {
                // Restore original state after 3 full heartbeats
                this.state.atmosphere = prevAtmosphere;
                this.state.overhead = prevOverhead;
                this.sendCurrentState();
                this.updateSimulatorVisuals();
                this.updateUI();
                return;
            }

            beatCount++;

            // 1. Play Heartbeat Sound (visceral double thump)
            if (window.AudioEngine && window.AudioEngine.playHeartbeat) {
                window.AudioEngine.playHeartbeat();
            }

            // 2. Ace 25c Surge to Crimson
            this.sendAtmosphereRequest("set_intensity", { intensity: pulseIntensity });
            this.sendAtmosphereRequest("set_color", { color: crimsonHex });

            // Visual simulation
            const sim = document.getElementById("lighting-ambiance-box");
            if (sim) {
                sim.style.backgroundColor = `rgb(${pulseRgb[0]}, ${pulseRgb[1]}, ${pulseRgb[2]})`;
                sim.style.boxShadow = `0 0 50px 15px rgba(${pulseRgb[0]}, ${pulseRgb[1]}, ${pulseRgb[2]}, 0.95)`;
            }
            const label = document.getElementById("lighting-effect-label");
            if (label) label.textContent = `🩸 BLOODIED HEARTBEAT (${beatCount}/${totalBeats})`;

            // 3. Drop down after 400ms for heartbeat trough
            setTimeout(() => {
                if (beatCount < totalBeats) {
                    this.sendAtmosphereRequest("set_intensity", { intensity: 150 });
                    if (sim) {
                        sim.style.boxShadow = `0 0 10px 2px rgba(${pulseRgb[0]}, ${pulseRgb[1]}, ${pulseRgb[2]}, 0.3)`;
                    }
                }
            }, 450);

            // Schedule next beat
            this._bloodiedTimeout = setTimeout(executeBeat, 1050);
        };

        if (typeof showToast === 'function') {
            const label = isBoss ? `Boss ${combatant.name} Enraged (≤50% HP)!` : `${combatant.name} Bloodied (≤50% HP)!`;
            showToast(`🩸 ${label}`, isBoss ? "error" : "warning");
        }

        executeBeat();
    }

    setHeroDownState(active, heroName) {
        if (!this.reactiveCombat) return;

        if (active) {
            if (this._isHeroDown) return;
            this._isHeroDown = true;
            this._savedBeforeDownOverhead = this.state.overhead.brightness;
            this._savedBeforeDownAtmosphere = JSON.parse(JSON.stringify(this.state.atmosphere));

            // Dim Tabletop Reading Light to cold 10%
            this.setOverheadBrightness(10);

            // Shift Ace 25c to eerie cold blue pulse
            const hex = "#1E3A8A";
            this.sendAtmosphereRequest("set_intensity", { intensity: 400 });
            this.sendAtmosphereRequest("set_color", { color: hex });
            this.sendAtmosphereRequest("set_system_effect", { effect_type: "pulsing" });

            const sim = document.getElementById("lighting-ambiance-box");
            if (sim) {
                sim.style.backgroundColor = "rgb(30, 58, 138)";
                sim.style.boxShadow = "0 0 25px 5px rgba(30, 58, 138, 0.8)";
            }
            const label = document.getElementById("lighting-effect-label");
            if (label) label.textContent = "💀 0 HP UNCONSCIOUS";

            if (window.AudioEngine) {
                if (window.AudioEngine.playNat1) window.AudioEngine.playNat1();
                if (window.AudioEngine.playHeartbeat) window.AudioEngine.playHeartbeat();
            }

            if (typeof showToast === 'function') {
                showToast(`💀 HERO DOWN: ${heroName} dropped to 0 HP and is dying!`, "error");
            }
        } else {
            if (!this._isHeroDown) return;
            this._isHeroDown = false;

            // Restore Tabletop Reading Light
            const restoreB = this._savedBeforeDownOverhead || 45;
            this.setOverheadBrightness(restoreB);

            // Triumphant golden revival flare
            this._flashHardwareColor([255, 215, 0], 85, "solid", 1800);

            if (window.AudioEngine && window.AudioEngine.playSecret) {
                window.AudioEngine.playSecret();
            }

            if (typeof showToast === 'function') {
                showToast(`✨ REVIVED: ${heroName || 'Hero'} healed and back in the fight!`, "success");
            }
        }
    }

    setTurnAmbiance(turnType, name) {
        if (!this.reactiveCombat) return;

        // Clear any ongoing turn transition restore timer
        if (this._turnAmbianceTimeout) {
            clearTimeout(this._turnAmbianceTimeout);
            this._turnAmbianceTimeout = null;
        }

        const sim = document.getElementById("lighting-ambiance-box");
        const label = document.getElementById("lighting-effect-label");
        const durationMs = turnType === 'boss' ? 2800 : 2200;

        if (turnType === 'boss') {
            // Boss Turn: Sinister Deep Violet / Crimson Pulse
            const hex = "#7C3AED";
            this.sendAtmosphereRequest("set_intensity", { intensity: 900 });
            this.sendAtmosphereRequest("set_color", { color: hex });

            if (window.AudioEngine && window.AudioEngine.playBossThreat) {
                window.AudioEngine.playBossThreat();
            }

            if (sim) {
                sim.style.backgroundColor = "rgb(124, 58, 237)";
                sim.style.boxShadow = "0 0 45px 12px rgba(124, 58, 237, 0.9)";
            }
            if (label) label.textContent = `⚔️ BOSS TURN: ${name ? name.toUpperCase() : 'BOSS'}`;

            if (typeof showToast === 'function') {
                showToast(`⚔️ Boss Turn: ${name}`, "warning");
            }
        } else if (turnType === 'monster' || turnType === 'npc') {
            // Enemy Turn: Menacing Shadow Red
            const hex = "#DC2626";
            this.sendAtmosphereRequest("set_intensity", { intensity: 850 });
            this.sendAtmosphereRequest("set_color", { color: hex });

            if (sim) {
                sim.style.backgroundColor = "rgb(220, 38, 38)";
                sim.style.boxShadow = "0 0 35px 8px rgba(220, 38, 38, 0.85)";
            }
            if (label) label.textContent = `⚔️ ENEMY TURN: ${name ? name.toUpperCase() : 'ENEMY'}`;

            if (typeof showToast === 'function') {
                showToast(`⚔️ Enemy Turn: ${name}`, "info");
            }
        } else {
            // Hero / Player Turn: Courageous Warm Golden Amber
            const hex = "#F59E0B";
            this.sendAtmosphereRequest("set_intensity", { intensity: 850 });
            this.sendAtmosphereRequest("set_color", { color: hex });

            if (sim) {
                sim.style.backgroundColor = "rgb(245, 158, 11)";
                sim.style.boxShadow = "0 0 35px 8px rgba(245, 158, 11, 0.85)";
            }
            if (label) label.textContent = `🛡️ HERO TURN: ${name ? name.toUpperCase() : 'PLAYER'}`;

            if (typeof showToast === 'function') {
                showToast(`🛡️ Player Turn: ${name}`, "info");
            }
        }

        // Return to active ambient scene lighting after the turn transition cue
        this._turnAmbianceTimeout = setTimeout(() => {
            if (this._isHeroDown) return;
            this.sendAtmosphereState();
            this.updateSimulatorVisuals();
            this.updateUI();
        }, durationMs);
    }

    restoreCombatBaseline() {
        if (this._turnAmbianceTimeout) {
            clearTimeout(this._turnAmbianceTimeout);
            this._turnAmbianceTimeout = null;
        }
        this.sendAtmosphereState();
        this.updateSimulatorVisuals();
        this.updateUI();
    }

    triggerDeathBlow(victimName) {
        if (!this.reactiveCombat) return;

        if (this._tempFlashTimeout) clearTimeout(this._tempFlashTimeout);
        if (this._deathBlowTimeout) clearTimeout(this._deathBlowTimeout);

        const prevAtmosphere = JSON.parse(JSON.stringify(this.state.atmosphere));
        const prevOverheadB = this.state.overhead.brightness;

        // Phase 1 (0ms - 800ms): Blinding White Critical Strike Flash
        if (window.AudioEngine && window.AudioEngine.playStrike) {
            window.AudioEngine.playStrike();
        }

        // Ace 25c: 100% pure brilliant white
        this.sendAtmosphereRequest("set_intensity", { intensity: 1000 });
        this.sendAtmosphereRequest("set_color", { color: "#FFFFFF" });

        // Flash Overhead 60d S to 100% as well for physical table impact
        this.sendRequest("set_intensity", { intensity: 1000 }, this.getOverheadNodeId());

        const sim = document.getElementById("lighting-ambiance-box");
        if (sim) {
            sim.style.backgroundColor = "rgb(255, 255, 255)";
            sim.style.boxShadow = "0 0 60px 25px rgba(255, 255, 255, 1)";
        }
        const label = document.getElementById("lighting-effect-label");
        if (label) label.textContent = `💥 CRITICAL STRIKE! SLAIN: ${victimName.toUpperCase()}`;

        if (typeof showToast === 'function') {
            showToast(`💥 Slain! ${victimName} defeated!`, "success");
        }

        // Phase 2 (800ms - 2200ms): Blood Red Dissipation Glow
        this._deathBlowTimeout = setTimeout(() => {
            // Restore overhead 60d S to normal reading brightness
            this.sendRequest("set_intensity", { intensity: Math.round(prevOverheadB * 10) }, this.getOverheadNodeId());

            // Ace 25c: Blood crimson death pulse
            this.sendAtmosphereRequest("set_intensity", { intensity: 850 });
            this.sendAtmosphereRequest("set_color", { color: "#E11D48" });

            if (sim) {
                sim.style.backgroundColor = "rgb(225, 29, 72)";
                sim.style.boxShadow = "0 0 40px 10px rgba(225, 29, 72, 0.85)";
            }

            // Phase 3 (2200ms): Full Restoration
            this._tempFlashTimeout = setTimeout(() => {
                this.state.atmosphere = prevAtmosphere;
                this.state.overhead.brightness = prevOverheadB;
                this.sendCurrentState();
                this.updateSimulatorVisuals();
                this.updateUI();
            }, 1400);
        }, 800);
    }

    _flashHardwareColor(rgb, brightness, effect, durationMs) {
        if (this._tempFlashTimeout) clearTimeout(this._tempFlashTimeout);

        const prevAtmosphere = JSON.parse(JSON.stringify(this.state.atmosphere));
        const prevOverhead = JSON.parse(JSON.stringify(this.state.overhead));

        // 1. Flash Atmosphere Light (Ace 25c Group)
        const hex = this._rgbToHex(rgb);
        const atmIntensity = Math.round(brightness * 10);

        this._enqueue(async () => {
            await this.sendAtmosphereRequest("set_intensity", { intensity: atmIntensity }, 100);
            await new Promise(r => setTimeout(r, 100));

            if (effect && effect !== "solid") {
                await this.sendAtmosphereRequest("set_color", { color: hex }, 100);
                await new Promise(r => setTimeout(r, 100));
                const mapped = this._mapEffectName(effect);
                await this.sendAtmosphereRequest("set_system_effect", { effect_type: mapped }, 100);
            } else {
                await this.sendAtmosphereRequest("set_color", { color: hex }, 100);
            }

            // 2. If Link Flashes is enabled, also flash the overhead 60d S
            if (this.state.overhead.linkFlashes) {
                await new Promise(r => setTimeout(r, 80));
                this.sendRequest("set_intensity", { intensity: 1000 }, this.getOverheadNodeId());
            }
        });

        // 3. Simulator visual flare
        const sim = document.getElementById("lighting-ambiance-box");
        if (sim) {
            sim.style.backgroundColor = `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
            sim.style.boxShadow = `0 0 35px 10px rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.9)`;
        }

        this._tempFlashTimeout = setTimeout(() => {
            this.state.atmosphere = prevAtmosphere;
            this.state.overhead = prevOverhead;
            this.sendCurrentState();
            this.updateSimulatorVisuals();
            this.updateUI();
        }, durationMs);
    }

    // =========================================================================
    // UI & SIMULATOR RENDERING
    // =========================================================================
    updateUI() {
        this.updateStatusBadge();
        this.updateOverheadUI();
        this.updateAtmosphereUI();
        this.updateSimulatorVisuals();
        this.renderFixturesList();
    }

    updateOverheadUI() {
        const b = this.state.overhead.brightness;
        
        ['overhead-dimmer-slider', 'overhead-tab-dimmer-slider'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = b;
        });

        ['overhead-dimmer-value', 'overhead-tab-dimmer-value'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = `${b}%`;
        });

        ['overhead-power-btn', 'overhead-tab-power-btn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (b > 0) {
                    el.className = "px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-ledger-950 font-bold text-[10px] transition";
                    el.innerHTML = `💡 Table ON`;
                } else {
                    el.className = "px-2.5 py-1 rounded bg-ledger-800 hover:bg-ledger-700 text-slate-400 font-bold text-[10px] border border-ledger-700 transition";
                    el.innerHTML = `🌑 Table OFF`;
                }
            }
        });

        ['overhead-link-flashes-toggle', 'overhead-tab-link-flashes'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.checked = !!this.state.overhead.linkFlashes;
        });
    }

    updateAtmosphereUI() {
        const b = this.state.atmosphere.brightness;

        ['atmosphere-dimmer-slider', 'atmosphere-tab-dimmer-slider', 'lighting-dimmer-slider'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = b;
        });

        ['atmosphere-dimmer-value', 'atmosphere-tab-dimmer-value', 'lighting-dimmer-value'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = `${b}%`;
        });

        const cct = this.state.atmosphere.cct;
        ['lighting-cct-slider', 'lighting-tab-cct-slider'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = cct;
        });

        ['lighting-cct-value', 'lighting-tab-cct-value'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = `${cct}K`;
        });

        const hex = this._rgbToHex(this.state.atmosphere.rgb);
        ['lighting-color-picker', 'lighting-tab-color-picker'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = hex;
        });

        const diceToggle = document.getElementById("lighting-dice-triggers-toggle");
        if (diceToggle) diceToggle.checked = this.diceTriggers;

        this.renderAtmosphereFixtures();
    }

    renderAtmosphereFixtures() {
        const fixtures = this.state.atmosphere.fixtures || [];
        const count = fixtures.length;
        const activeCount = fixtures.filter(f => f.enabled !== false).length;

        // Update count badges
        ['atmosphere-modal-fixtures-count', 'atmosphere-tab-fixtures-count'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = `${activeCount}/${count} Active`;
        });

        const modalList = document.getElementById("atmosphere-modal-fixtures-list");
        if (modalList) {
            if (fixtures.length === 0) {
                modalList.innerHTML = `<div class="p-2 text-slate-500 text-center italic text-[11px]">No Ace 25c fixtures synced. Click "+ Add Ace 25c" to add one.</div>`;
            } else {
                modalList.innerHTML = fixtures.map((f) => {
                    const isOnline = this.isConnected;
                    const isChecked = f.enabled !== false;
                    return `
                        <div class="p-2 rounded-lg bg-ledger-900 border ${isChecked ? 'border-indigo-500/40 bg-indigo-950/20' : 'border-ledger-800 opacity-60'} flex items-center justify-between gap-2 transition">
                            <div class="flex items-center gap-2 overflow-hidden">
                                <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.LightingEngine && window.LightingEngine.toggleAtmosphereFixture('${f.node_id}', this.checked)" class="rounded bg-ledger-900 border-ledger-700 text-indigo-500 focus:ring-0 cursor-pointer">
                                <span class="text-sm">🎭</span>
                                <div class="truncate">
                                    <div class="flex items-center gap-1.5">
                                        <span class="font-bold text-slate-200 text-xs truncate">${f.name || 'amaran Ace 25c'}</span>
                                        <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-ledger-800 text-indigo-300 border border-indigo-500/20">${f.node_id}</span>
                                    </div>
                                    <span class="text-[9px] text-slate-400 block">${isChecked ? 'Synced Atmosphere Lighting' : 'Muted / Standby'}</span>
                                </div>
                            </div>
                            <div class="flex items-center gap-1.5 flex-shrink-0">
                                <span class="w-2 h-2 rounded-full ${isOnline && isChecked ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}" title="${isOnline && isChecked ? 'Online & Synced' : 'Standby'}"></span>
                                ${fixtures.length > 1 ? `
                                    <button onclick="window.LightingEngine && window.LightingEngine.removeAtmosphereFixture('${f.node_id}')" class="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition" title="Remove fixture from group">
                                        ✕
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');
            }
        }

        const tabList = document.getElementById("atmosphere-tab-fixtures-list");
        if (tabList) {
            if (fixtures.length === 0) {
                tabList.innerHTML = `<div class="p-2 text-slate-500 text-center italic text-[10px]">No Ace 25c fixtures synced.</div>`;
            } else {
                tabList.innerHTML = fixtures.map((f) => {
                    const isChecked = f.enabled !== false;
                    return `
                        <div class="p-1.5 rounded-lg bg-ledger-900/90 border ${isChecked ? 'border-indigo-500/30' : 'border-ledger-800 opacity-60'} flex items-center justify-between gap-1.5 text-[10px]">
                            <label class="flex items-center gap-1.5 overflow-hidden cursor-pointer">
                                <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="window.LightingEngine && window.LightingEngine.toggleAtmosphereFixture('${f.node_id}', this.checked)" class="rounded bg-ledger-900 border-ledger-700 text-indigo-500 focus:ring-0">
                                <span class="font-semibold text-slate-200 truncate">${f.name || 'amaran Ace 25c'}</span>
                            </label>
                            <span class="font-mono text-[9px] text-indigo-300">${f.node_id}</span>
                        </div>
                    `;
                }).join('');
            }
        }
    }

    updateSimulatorVisuals() {
        let color = `rgb(${this.state.atmosphere.rgb[0]}, ${this.state.atmosphere.rgb[1]}, ${this.state.atmosphere.rgb[2]})`;
        if (this.state.atmosphere.mode === "cct") {
            const [r, g, b] = this._kelvinToRgb(this.state.atmosphere.cct);
            color = `rgb(${r}, ${g}, ${b})`;
        }

        const modeText = this.state.atmosphere.mode === 'cct' ? `${this.state.atmosphere.cct}K` : 'RGB Tone';
        const previewText = `Table: ${this.state.overhead.brightness}% • Atmosphere: ${modeText} (${this.state.atmosphere.brightness}%)`;

        ['lighting-preview-label', 'lighting-tab-preview-label'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = previewText;
        });

        ['lighting-ambiance-box', 'lighting-tab-ambiance-box'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.backgroundColor = color;
                el.style.boxShadow = `inset 0 0 20px rgba(0,0,0,0.5), 0 0 15px ${color}`;
                el.style.color = (this.state.atmosphere.cct < 3500 || this.state.atmosphere.mode === 'rgb') ? '#ffffff' : '#0f141c';
            }
        });

        const icons = {
            candle: "🕯️ Candle Flicker",
            fire: "🔥 Campfire Glow",
            lightning: "⚡ Storm Lightning",
            pulse: "💓 Atmosphere Pulse",
            pulsing: "💓 Atmosphere Pulse",
            strobe: "⚡ Strobe Clash",
            explosion: "💥 Spell Blast",
            fault_bulb: "🏚️ Dungeon Lantern",
            party_lights: "🎉 Festival Glow",
            solid: "💡 Steady Illumination"
        };
        const effectText = icons[this.state.atmosphere.effect] || `✨ ${this.state.atmosphere.effect.toUpperCase()}`;

        ['lighting-effect-label', 'lighting-tab-effect-label'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = effectText;
        });
    }

    renderFixturesList() {
        const container = document.getElementById("lighting-fixtures-container");
        const countLabel = document.getElementById("lighting-fixtures-count");
        const list = document.getElementById("lighting-fixtures-list");

        if (!container || !list) return;

        if (this.fixtures.length === 0) {
            container.classList.add("hidden");
            return;
        }

        container.classList.remove("hidden");
        if (countLabel) countLabel.textContent = `${this.fixtures.length} Active`;

        const currentAtmIds = (this.state.atmosphere.fixtures || []).map(af => af.node_id);

        list.innerHTML = this.fixtures.map(f => {
            const isAce = f.name.toLowerCase().includes("ace") || f.node_id.includes("400U");
            const icon = isAce ? "🎭" : "🎲";
            const roleBadge = isAce ? "Atmosphere Light" : "Table Overhead";
            const typeLabel = isAce ? "RGBWW Full Color" : "5600K Daylight";
            const isSyncedAtm = isAce && currentAtmIds.includes(f.node_id);
            return `
                <div class="p-2 rounded-lg bg-ledger-900 border border-amber-500/30 flex items-center justify-between gap-2">
                    <div class="flex items-center gap-2 overflow-hidden">
                        <span class="text-base">${icon}</span>
                        <div class="truncate">
                            <span class="font-bold text-slate-200 block truncate text-xs">${f.name}</span>
                            <div class="flex items-center gap-1.5 text-[9px]">
                                <span class="text-amber-400 font-semibold">${roleBadge}</span>
                                <span class="text-slate-500">•</span>
                                <span class="text-slate-400 font-mono">${f.node_id}</span>
                                <span class="text-slate-500">•</span>
                                <span class="text-slate-400">${typeLabel}</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        ${isAce && !isSyncedAtm ? `
                            <button onclick="window.LightingEngine && window.LightingEngine.addAtmosphereFixture('${f.node_id}', '${f.name}')" class="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[9px] font-bold transition">
                                + Add to Group
                            </button>
                        ` : ''}
                        <span class="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" title="Online"></span>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateStatusBadge() {
        const dot = document.getElementById("lighting-status-dot");
        const modalDot = document.getElementById("lighting-modal-status-dot");
        const modalText = document.getElementById("lighting-modal-status-text");
        const pillPreset = document.getElementById("lighting-preset-name");

        if (pillPreset) {
            const presetObj = this.presets[this.state.atmosphere.activePreset];
            const presetName = presetObj ? presetObj.name.split(' ')[0] : 'Scene';
            const aceCount = (this.state.atmosphere.fixtures || []).filter(f => f.enabled !== false).length;
            const countText = aceCount > 1 ? ` (${aceCount}x Ace)` : '';
            pillPreset.textContent = `Table: ${this.state.overhead.brightness}% • ${presetName}${countText}`;
        }

        if (this.isConnected) {
            if (dot) dot.className = "w-2 h-2 rounded-full bg-emerald-400 inline-block shadow-sm shadow-emerald-400 animate-pulse";
            if (modalDot) modalDot.className = "w-3 h-3 rounded-full bg-emerald-400 animate-pulse";
            if (modalText) {
                const totalAce = (this.state.atmosphere.fixtures || []).length || 1;
                modalText.innerHTML = `<span class="text-emerald-400 font-bold">amaran Desktop Connected (1 Overhead + ${totalAce} Ace 25c)</span>`;
            }
        } else {
            if (dot) dot.className = "w-2 h-2 rounded-full bg-amber-400 inline-block shadow-sm shadow-amber-400";
            if (modalDot) modalDot.className = "w-3 h-3 rounded-full bg-amber-400";
            if (modalText) {
                modalText.innerHTML = `<span class="text-amber-400 font-bold">Simulator Mode Active</span>`;
            }
        }
    }

    _kelvinToRgb(k) {
        const temp = k / 100;
        let r, g, b;
        if (temp <= 66) {
            r = 255;
            g = Math.min(255, Math.max(0, 99.4708025861 * Math.log(temp) - 161.1195681661));
            b = temp <= 19 ? 0 : Math.min(255, Math.max(0, 138.5177312231 * Math.log(temp - 10) - 305.0447927307));
        } else {
            r = Math.min(255, Math.max(0, 329.698727446 * Math.pow(temp - 60, -0.1332047592)));
            g = Math.min(255, Math.max(0, 288.1221695283 * Math.pow(temp - 60, -0.0755148492)));
            b = 255;
        }
        return [Math.round(r), Math.round(g), Math.round(b)];
    }

    async syncToServer() {
        try {
            await fetch('/api/lighting', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    connected: this.isConnected,
                    apiUrl: this.apiUrl,
                    overhead: this.state.overhead,
                    atmosphere: this.state.atmosphere,
                    syncAudio: this.syncAudio,
                    diceTriggers: this.diceTriggers
                })
            });
        } catch (e) {}
    }
}

// Global instance
window.LightingEngine = new TabletopLightingEngine();
