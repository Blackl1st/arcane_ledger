// Arcane Ledger - Official Elgato Stream Deck Plugin Controller
// Connects to Elgato Stream Deck WebSocket and Arcane Ledger Backend (WebSocket & REST)

let streamDeckWs = null;
let arcaneWs = null;
let pluginUUID = null;
let globalSettings = { host: "127.0.0.1", port: 8000 };
const activeContexts = new Map(); // context -> { action, settings }

// Dial states
let dialStates = {
    tableLight: 45,
    atmosphereLight: 70,
    volume: 75,
    activePresetIndex: 0
};
const SCENE_PRESET_NAMES = ["tavern", "fireplace", "dungeon", "crypt", "boss", "thunderstorm", "forest"];

function getBaseUrl() {
    const host = globalSettings.host || "127.0.0.1";
    const port = globalSettings.port || 8000;
    return `http://${host}:${port}`;
}

function getWsUrl() {
    const host = globalSettings.host || "127.0.0.1";
    const port = globalSettings.port || 8000;
    return `ws://${host}:${port}/ws/streamdeck`;
}

// -----------------------------------------------------------------------------
// 1. ELGATO STREAM DECK SDK REGISTRATION & DISPATCH
// -----------------------------------------------------------------------------
function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo) {
    pluginUUID = inPluginUUID;
    streamDeckWs = new WebSocket("ws://127.0.0.1:" + inPort);

    streamDeckWs.onopen = function() {
        // Register plugin
        streamDeckWs.send(JSON.stringify({
            event: inRegisterEvent,
            uuid: inPluginUUID
        }));

        // Request global settings
        streamDeckWs.send(JSON.stringify({
            event: "getGlobalSettings",
            context: inPluginUUID
        }));

        connectArcaneWs();
    };

    streamDeckWs.onmessage = function(evt) {
        try {
            const data = JSON.parse(evt.data);
            handleStreamDeckMessage(data);
        } catch (e) {
            console.error("Stream Deck event parse error:", e);
        }
    };
}

function sendToStreamDeck(payload) {
    if (streamDeckWs && streamDeckWs.readyState === WebSocket.OPEN) {
        streamDeckWs.send(JSON.stringify(payload));
    }
}

function setKeyTitle(context, title) {
    sendToStreamDeck({
        event: "setTitle",
        context: context,
        payload: {
            title: title,
            target: 0
        }
    });
}

function setEncoderFeedback(context, title, value, icon) {
    sendToStreamDeck({
        event: "setFeedback",
        context: context,
        payload: {
            title: title,
            value: value,
            icon: icon
        }
    });
}

// -----------------------------------------------------------------------------
// 2. STREAM DECK EVENT HANDLER (KEY PRESSES & DIALS)
// -----------------------------------------------------------------------------
function handleStreamDeckMessage(msg) {
    const event = msg.event;
    const context = msg.context;
    const action = msg.action;
    const payload = msg.payload || {};

    if (event === "didReceiveGlobalSettings") {
        if (payload.settings) {
            globalSettings = Object.assign(globalSettings, payload.settings);
            connectArcaneWs();
        }
    } else if (event === "willAppear") {
        activeContexts.set(context, { action: action, settings: payload.settings || {} });
        initContextTitle(context, action, payload.settings || {});
    } else if (event === "willDisappear") {
        activeContexts.delete(context);
    } else if (event === "didReceiveSettings") {
        const item = activeContexts.get(context) || { action: action };
        item.settings = payload.settings || {};
        activeContexts.set(context, item);
        initContextTitle(context, action, item.settings);
    } else if (event === "keyDown") {
        handleKeyDown(context, action, payload.settings || {});
    } else if (event === "dialRotate") {
        handleDialRotate(context, action, payload.ticks || 1);
    } else if (event === "dialPress") {
        if (payload.pressed === true) {
            handleDialPress(context, action);
        }
    } else if (event === "propertyInspectorDidAppear") {
        // Send initial settings to PI
        sendToStreamDeck({
            event: "sendToPropertyInspector",
            context: context,
            payload: {
                globalSettings: globalSettings,
                settings: (activeContexts.get(context) || {}).settings || {}
            }
        });
    } else if (event === "sendToPlugin") {
        if (payload.saveGlobalSettings) {
            globalSettings = Object.assign(globalSettings, payload.saveGlobalSettings);
            sendToStreamDeck({
                event: "setGlobalSettings",
                context: pluginUUID,
                payload: globalSettings
            });
            connectArcaneWs();
        }
    }
}

function initContextTitle(context, action, settings) {
    if (action === "com.arcaneledger.dice.roll") {
        setKeyTitle(context, `d${settings.sides || 20}`);
    } else if (action === "com.arcaneledger.audio.sfx") {
        const name = (settings.sound || 'Fireball').split('_')[0];
        setKeyTitle(context, name.charAt(0).toUpperCase() + name.slice(1));
    } else if (action === "com.arcaneledger.lighting.preset") {
        const p = settings.preset || 'Tavern';
        setKeyTitle(context, p.charAt(0).toUpperCase() + p.slice(1));
    } else if (action === "com.arcaneledger.dial.table-light") {
        setEncoderFeedback(context, "Table Light", `${dialStates.tableLight}%`);
    } else if (action === "com.arcaneledger.dial.atmosphere") {
        setEncoderFeedback(context, "Atmosphere", `${dialStates.atmosphereLight}%`);
    } else if (action === "com.arcaneledger.dial.volume") {
        setEncoderFeedback(context, "Master Vol", `${dialStates.volume}%`);
    }
}

// -----------------------------------------------------------------------------
// 3. ACTION EXECUTION (HTTP POST & WEBSOCKET)
// -----------------------------------------------------------------------------
async function executeArcaneAction(endpoint, body = null) {
    const url = `${getBaseUrl()}${endpoint}`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : null
        });
        return await res.json().catch(() => ({}));
    } catch (e) {
        console.warn(`Arcane Ledger fetch error on ${endpoint}:`, e);
        return null;
    }
}

function handleKeyDown(context, action, settings) {
    if (action === "com.arcaneledger.combat.next-turn") {
        executeArcaneAction("/api/streamdeck/combat/next-turn");
    } else if (action === "com.arcaneledger.combat.prev-turn") {
        executeArcaneAction("/api/streamdeck/combat/prev-turn");
    } else if (action === "com.arcaneledger.combat.toggle") {
        executeArcaneAction("/api/streamdeck/combat/toggle");
    } else if (action === "com.arcaneledger.dice.roll-d20") {
        executeArcaneAction("/api/streamdeck/roll/d20");
    } else if (action === "com.arcaneledger.dice.roll") {
        const sides = settings.sides || 20;
        executeArcaneAction(`/api/streamdeck/roll/${sides}`);
    } else if (action === "com.arcaneledger.audio.sfx") {
        const sfx = settings.sound || "fireball";
        executeArcaneAction(`/api/streamdeck/audio/sfx/${sfx}`);
    } else if (action === "com.arcaneledger.lighting.preset") {
        const preset = settings.preset || "tavern";
        executeArcaneAction(`/api/streamdeck/lighting/preset/${preset}`);
    } else if (action === "com.arcaneledger.lighting.event") {
        const evt = settings.effect || "nat20";
        executeArcaneAction(`/api/streamdeck/lighting/event/${evt}`);
    } else if (action === "com.arcaneledger.party.rest") {
        const type = settings.restType || "short";
        executeArcaneAction(`/api/streamdeck/party/${type}-rest`);
    } else if (action === "com.arcaneledger.map.action") {
        const mapAct = settings.mapAction || "reveal-all";
        executeArcaneAction(`/api/streamdeck/map/${mapAct}`);
    }
}

function handleDialRotate(context, action, ticks) {
    const step = ticks * 5;
    if (action === "com.arcaneledger.dial.table-light") {
        dialStates.tableLight = Math.max(0, Math.min(100, dialStates.tableLight + step));
        setEncoderFeedback(context, "Table Light", `${dialStates.tableLight}%`);
        if (arcaneWs && arcaneWs.readyState === WebSocket.OPEN) {
            arcaneWs.send(JSON.stringify({ action: "adjust_encoder", encoder: "table_light", delta: ticks }));
        }
    } else if (action === "com.arcaneledger.dial.atmosphere") {
        dialStates.atmosphereLight = Math.max(0, Math.min(100, dialStates.atmosphereLight + step));
        setEncoderFeedback(context, "Atmosphere", `${dialStates.atmosphereLight}%`);
        if (arcaneWs && arcaneWs.readyState === WebSocket.OPEN) {
            arcaneWs.send(JSON.stringify({ action: "adjust_encoder", encoder: "atmosphere_light", delta: ticks }));
        }
    } else if (action === "com.arcaneledger.dial.volume") {
        dialStates.volume = Math.max(0, Math.min(100, dialStates.volume + step));
        setEncoderFeedback(context, "Master Vol", `${dialStates.volume}%`);
        if (arcaneWs && arcaneWs.readyState === WebSocket.OPEN) {
            arcaneWs.send(JSON.stringify({ action: "adjust_encoder", encoder: "volume", delta: ticks }));
        }
    }
}

function handleDialPress(context, action) {
    if (action === "com.arcaneledger.dial.table-light") {
        dialStates.tableLight = dialStates.tableLight > 0 ? 0 : 50;
        setEncoderFeedback(context, "Table Light", `${dialStates.tableLight}%`);
        if (arcaneWs && arcaneWs.readyState === WebSocket.OPEN) {
            arcaneWs.send(JSON.stringify({ action: "adjust_encoder", encoder: "table_light", delta: dialStates.tableLight > 0 ? 10 : -10 }));
        }
    } else if (action === "com.arcaneledger.dial.atmosphere") {
        dialStates.activePresetIndex = (dialStates.activePresetIndex + 1) % SCENE_PRESET_NAMES.length;
        const nextPreset = SCENE_PRESET_NAMES[dialStates.activePresetIndex];
        setEncoderFeedback(context, "Scene", nextPreset.toUpperCase());
        executeArcaneAction(`/api/streamdeck/lighting/preset/${nextPreset}`);
    } else if (action === "com.arcaneledger.dial.volume") {
        dialStates.volume = dialStates.volume > 0 ? 0 : 75;
        setEncoderFeedback(context, "Master Vol", dialStates.volume === 0 ? "MUTED" : `${dialStates.volume}%`);
        if (arcaneWs && arcaneWs.readyState === WebSocket.OPEN) {
            arcaneWs.send(JSON.stringify({ action: "adjust_encoder", encoder: "volume", delta: dialStates.volume > 0 ? 15 : -15 }));
        }
    }
}

// -----------------------------------------------------------------------------
// 4. ARCANE LEDGER REALTIME WEBSOCKET (LIVE LCD UPDATES)
// -----------------------------------------------------------------------------
function connectArcaneWs() {
    if (arcaneWs) {
        try { arcaneWs.close(); } catch(e){}
    }
    try {
        arcaneWs = new WebSocket(getWsUrl());
        arcaneWs.onmessage = function(evt) {
            try {
                const msg = JSON.parse(evt.data);
                handleArcaneLiveEvent(msg);
            } catch(e) {}
        };
        arcaneWs.onclose = function() {
            setTimeout(connectArcaneWs, 3000);
        };
    } catch(e) {
        setTimeout(connectArcaneWs, 3000);
    }
}

function handleArcaneLiveEvent(msg) {
    const event = msg.event;

    // 1. Live Turn Updates on Stream Deck LCD Key
    if (event === "combat_turn" || event === "sync_state") {
        const round = msg.round || (msg.combat ? msg.combat.round : 1);
        const name = msg.activeCombatant || "Turn";
        for (const [ctx, info] of activeContexts.entries()) {
            if (info.action === "com.arcaneledger.combat.next-turn") {
                setKeyTitle(ctx, `R${round}\n${name}`);
            }
        }
    }

    // 2. Live Dice Rolls on Key
    if (event === "dice_roll") {
        for (const [ctx, info] of activeContexts.entries()) {
            if (info.action === "com.arcaneledger.dice.roll-d20" && msg.sides === 20) {
                if (msg.isCrit) {
                    setKeyTitle(ctx, "👑 NAT 20\nCRIT!");
                } else if (msg.isFumble) {
                    setKeyTitle(ctx, "💀 NAT 1\nFAIL");
                } else {
                    setKeyTitle(ctx, `d20\n[ ${msg.roll} ]`);
                }
            } else if (info.action === "com.arcaneledger.dice.roll") {
                setKeyTitle(ctx, `d${msg.sides}\n[ ${msg.roll} ]`);
            }
        }
    }

    // 3. Encoder feedback sync
    if (event === "encoder_adjust") {
        for (const [ctx, info] of activeContexts.entries()) {
            if (msg.encoder === "table_light" && info.action === "com.arcaneledger.dial.table-light") {
                setEncoderFeedback(ctx, "Table Light", `${dialStates.tableLight}%`);
            } else if (msg.encoder === "atmosphere_light" && info.action === "com.arcaneledger.dial.atmosphere") {
                setEncoderFeedback(ctx, "Atmosphere", `${dialStates.atmosphereLight}%`);
            } else if (msg.encoder === "volume" && info.action === "com.arcaneledger.dial.volume") {
                setEncoderFeedback(ctx, "Master Vol", `${dialStates.volume}%`);
            }
        }
    }
}
