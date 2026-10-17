#!/usr/bin/env python3
"""
Arcane Ledger - Elgato Stream Deck Plugin & Profile Builder
Generates:
1. `static/streamdeck/com.arcaneledger.streamdeck.sdPlugin` directory
2. `static/streamdeck/com.arcaneledger.streamdeck.streamDeckPlugin` (double-clickable Elgato installer)
3. High-resolution action & dial icons
4. Property Inspector configuration UI
5. Pre-configured 15-key Stream Deck Profile
"""

import json
import os
import sys
import zipfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT_DIR = Path(__file__).resolve().parent.parent
STATIC_SD_DIR = ROOT_DIR / "static" / "streamdeck"
PLUGIN_DIR = STATIC_SD_DIR / "com.arcaneledger.streamdeck.sdPlugin"
ICONS_DIR = PLUGIN_DIR / "icons"

STATIC_SD_DIR.mkdir(parents=True, exist_ok=True)
PLUGIN_DIR.mkdir(parents=True, exist_ok=True)
ICONS_DIR.mkdir(parents=True, exist_ok=True)


def draw_styled_icon(path: Path, size: int, symbol: str, bg_color=(15, 20, 28), border_color=(245, 158, 11), symbol_color=(251, 191, 36), is_circle=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = int(size * 0.05)
    box = [pad, pad, size - pad, size - pad]
    radius = int(size * 0.22) if not is_circle else size // 2

    if is_circle:
        draw.ellipse(box, fill=bg_color, outline=border_color, width=max(2, int(size * 0.035)))
    else:
        draw.rounded_rectangle(box, radius=radius, fill=bg_color, outline=border_color, width=max(2, int(size * 0.035)))

    # Try loading a system font or fall back to default
    font_size = int(size * 0.45)
    font = None
    for font_name in ["segoeui.ttf", "arial.ttf", "DejaVuSans.ttf"]:
        try:
            font = ImageFont.truetype(font_name, font_size)
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()

    # Center the text / symbol
    bbox = draw.textbbox((0, 0), symbol, font=font)
    w = bbox[2] - bbox[0]
    h = bbox[3] - bbox[1]
    x = (size - w) / 2 - bbox[0]
    y = (size - h) / 2 - bbox[1]

    draw.text((x, y), symbol, font=font, fill=symbol_color)
    img.save(path)


def generate_all_icons():
    icons_def = [
        ("plugin_icon.png", 72, "AL", (15, 20, 28), (245, 158, 11), (251, 191, 36), False),
        ("category_icon.png", 28, "⚔", (15, 20, 28), (245, 158, 11), (251, 191, 36), True),
        ("action_next_turn.png", 144, "⚔▶", (15, 23, 42), (56, 189, 248), (248, 250, 252), False),
        ("action_prev_turn.png", 144, "◀⚔", (15, 23, 42), (148, 163, 184), (203, 213, 225), False),
        ("action_combat.png", 144, "⚡", (28, 18, 24), (244, 63, 94), (251, 113, 133), False),
        ("action_d20.png", 144, "20", (26, 20, 10), (245, 158, 11), (251, 191, 36), True),
        ("action_dice.png", 144, "🎲", (20, 20, 30), (168, 85, 247), (216, 180, 254), False),
        ("action_sfx.png", 144, "🔊", (30, 15, 20), (239, 68, 68), (252, 165, 165), False),
        ("action_light.png", 144, "💡", (25, 22, 12), (234, 179, 8), (254, 240, 138), False),
        ("action_flash.png", 144, "✨", (22, 15, 30), (192, 132, 252), (233, 213, 255), True),
        ("action_rest.png", 144, "🏕", (12, 26, 20), (16, 185, 129), (110, 231, 183), False),
        ("action_map.png", 144, "🗺", (15, 25, 35), (14, 165, 233), (125, 211, 252), False),
        ("action_dial_light.png", 144, "☀", (25, 20, 10), (245, 158, 11), (253, 224, 71), True),
        ("action_dial_atmosphere.png", 144, "🔮", (24, 16, 35), (168, 85, 247), (216, 180, 254), True),
        ("action_dial_volume.png", 144, "🎚", (12, 25, 30), (6, 182, 212), (103, 232, 249), True),
    ]

    for filename, size, symbol, bg, border, sym_col, is_circ in icons_def:
        draw_styled_icon(ICONS_DIR / filename, size, symbol, bg, border, sym_col, is_circ)

    # Dial background strip for Stream Deck + LCD
    dial_bg = Image.new("RGBA", (200, 100), (15, 20, 28, 255))
    draw_bg = ImageDraw.Draw(dial_bg)
    draw_bg.rounded_rectangle([4, 4, 196, 96], radius=14, outline=(51, 65, 85), width=2)
    dial_bg.save(ICONS_DIR / "dial_bg.png")


def write_manifest():
    manifest = {
        "Actions": [
            {
                "UUID": "com.arcaneledger.combat.next-turn",
                "Name": "Next Combat Turn",
                "Tooltip": "Advance combat initiative to next combatant (shows current round & active hero on key)",
                "Icon": "icons/action_next_turn",
                "Controllers": ["Keypad"],
                "States": [
                    {
                        "Image": "icons/action_next_turn",
                        "TitleAlignment": "bottom",
                        "FontSize": 10,
                        "TitleColor": "#f8fafc"
                    }
                ]
            },
            {
                "UUID": "com.arcaneledger.combat.prev-turn",
                "Name": "Previous Combat Turn",
                "Tooltip": "Step combat initiative backward",
                "Icon": "icons/action_prev_turn",
                "Controllers": ["Keypad"],
                "States": [
                    {
                        "Image": "icons/action_prev_turn",
                        "TitleAlignment": "bottom",
                        "FontSize": 10,
                        "TitleColor": "#cbd5e1"
                    }
                ]
            },
            {
                "UUID": "com.arcaneledger.combat.toggle",
                "Name": "Toggle Encounter",
                "Tooltip": "Start, pause, or resume encounter tracker",
                "Icon": "icons/action_combat",
                "Controllers": ["Keypad"],
                "States": [
                    {
                        "Image": "icons/action_combat",
                        "TitleAlignment": "bottom",
                        "FontSize": 10,
                        "TitleColor": "#fda4af"
                    }
                ]
            },
            {
                "UUID": "com.arcaneledger.dice.roll-d20",
                "Name": "Roll d20",
                "Tooltip": "Roll d20 with 3D animation, smart Amaran lighting, and audio (shows roll on key)",
                "Icon": "icons/action_d20",
                "Controllers": ["Keypad"],
                "States": [
                    {
                        "Image": "icons/action_d20",
                        "TitleAlignment": "bottom",
                        "FontSize": 11,
                        "TitleColor": "#fbbf24"
                    }
                ]
            },
            {
                "UUID": "com.arcaneledger.dice.roll",
                "Name": "Polyhedral Dice (d4-d100)",
                "Tooltip": "Roll standard RPG dice (d4, d6, d8, d10, d12, d100)",
                "Icon": "icons/action_dice",
                "PropertyInspectorPath": "property_inspector.html",
                "Controllers": ["Keypad"],
                "States": [
                    {
                        "Image": "icons/action_dice",
                        "TitleAlignment": "bottom",
                        "FontSize": 10,
                        "TitleColor": "#e9d5ff"
                    }
                ]
            },
            {
                "UUID": "com.arcaneledger.audio.sfx",
                "Name": "Soundboard SFX",
                "Tooltip": "Trigger Fireball, Sword Clash, Dragon Roar, Victory, or Trap sound",
                "Icon": "icons/action_sfx",
                "PropertyInspectorPath": "property_inspector.html",
                "Controllers": ["Keypad"],
                "States": [
                    {
                        "Image": "icons/action_sfx",
                        "TitleAlignment": "bottom",
                        "FontSize": 9,
                        "TitleColor": "#fecaca"
                    }
                ]
            },
            {
                "UUID": "com.arcaneledger.lighting.preset",
                "Name": "Scene Atmosphere Light",
                "Tooltip": "Switch Amaran lights to Fireplace, Tavern, Dungeon, Crypt, or Boss",
                "Icon": "icons/action_light",
                "PropertyInspectorPath": "property_inspector.html",
                "Controllers": ["Keypad"],
                "States": [
                    {
                        "Image": "icons/action_light",
                        "TitleAlignment": "bottom",
                        "FontSize": 9,
                        "TitleColor": "#fef08a"
                    }
                ]
            },
            {
                "UUID": "com.arcaneledger.lighting.event",
                "Name": "Lighting FX Fanfare",
                "Tooltip": "Instant Nat 20 golden fanfare or Nat 1 crimson dread pulse",
                "Icon": "icons/action_flash",
                "PropertyInspectorPath": "property_inspector.html",
                "Controllers": ["Keypad"],
                "States": [
                    {
                        "Image": "icons/action_flash",
                        "TitleAlignment": "bottom",
                        "FontSize": 9,
                        "TitleColor": "#f5d0fe"
                    }
                ]
            },
            {
                "UUID": "com.arcaneledger.party.rest",
                "Name": "Party Rest",
                "Tooltip": "Execute Short Rest or Long Rest with party heal & chime",
                "Icon": "icons/action_rest",
                "PropertyInspectorPath": "property_inspector.html",
                "Controllers": ["Keypad"],
                "States": [
                    {
                        "Image": "icons/action_rest",
                        "TitleAlignment": "bottom",
                        "FontSize": 9,
                        "TitleColor": "#a7f3d0"
                    }
                ]
            },
            {
                "UUID": "com.arcaneledger.map.action",
                "Name": "Battlemap Controls",
                "Tooltip": "Reveal all fog, conceal fog, or ping tabletop location",
                "Icon": "icons/action_map",
                "PropertyInspectorPath": "property_inspector.html",
                "Controllers": ["Keypad"],
                "States": [
                    {
                        "Image": "icons/action_map",
                        "TitleAlignment": "bottom",
                        "FontSize": 9,
                        "TitleColor": "#bae6fd"
                    }
                ]
            },
            {
                "UUID": "com.arcaneledger.dial.table-light",
                "Name": "Table Light Dial (60d S)",
                "Tooltip": "Stream Deck + Dial: Rotate to adjust Reading Light; press to toggle on/off",
                "Icon": "icons/action_dial_light",
                "Controllers": ["Encoder"],
                "Encoder": {
                    "layout": "$B1",
                    "StackColor": "#f59e0b",
                    "Icon": "icons/action_dial_light",
                    "background": "icons/dial_bg.png"
                }
            },
            {
                "UUID": "com.arcaneledger.dial.atmosphere",
                "Name": "Atmosphere Dial (Ace 25c)",
                "Tooltip": "Stream Deck + Dial: Rotate to adjust mood brightness; press to cycle scene presets",
                "Icon": "icons/action_dial_atmosphere",
                "Controllers": ["Encoder"],
                "Encoder": {
                    "layout": "$B1",
                    "StackColor": "#a855f7",
                    "Icon": "icons/action_dial_atmosphere",
                    "background": "icons/dial_bg.png"
                }
            },
            {
                "UUID": "com.arcaneledger.dial.volume",
                "Name": "Master Volume Dial",
                "Tooltip": "Stream Deck + Dial: Rotate to adjust tabletop sound level; press to mute",
                "Icon": "icons/action_dial_volume",
                "Controllers": ["Encoder"],
                "Encoder": {
                    "layout": "$B1",
                    "StackColor": "#06b6d4",
                    "Icon": "icons/action_dial_volume",
                    "background": "icons/dial_bg.png"
                }
            }
        ],
        "Author": "Arcane Ledger",
        "Category": "Arcane Ledger",
        "CategoryIcon": "icons/category_icon",
        "CodePath": "index.html",
        "Description": "Tabletop controller for D&D 5.5e: Initiative Combat, 3D Dice, Amaran Studio Lighting, Sound Effects, and Battlemaps.",
        "Icon": "icons/plugin_icon",
        "Name": "Arcane Ledger",
        "Version": "1.1.0",
        "SDKVersion": 2,
        "Software": {
            "MinimumVersion": "6.0"
        },
        "OS": [
            {
                "Platform": "windows",
                "MinimumVersion": "10"
            },
            {
                "Platform": "mac",
                "MinimumVersion": "10.15"
            }
        ]
    }

    with open(PLUGIN_DIR / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)


def write_plugin_html():
    html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Arcane Ledger Stream Deck Plugin</title>
    <script src="plugin.js"></script>
</head>
<body style="background: #0b0f17; color: #fff;">
</body>
</html>
"""
    with open(PLUGIN_DIR / "index.html", "w", encoding="utf-8") as f:
        f.write(html)


def write_plugin_js():
    js = """// Arcane Ledger - Official Elgato Stream Deck Plugin Controller
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
                setKeyTitle(ctx, `R${round}\\n${name}`);
            }
        }
    }

    // 2. Live Dice Rolls on Key
    if (event === "dice_roll") {
        for (const [ctx, info] of activeContexts.entries()) {
            if (info.action === "com.arcaneledger.dice.roll-d20" && msg.sides === 20) {
                if (msg.isCrit) {
                    setKeyTitle(ctx, "👑 NAT 20\\nCRIT!");
                } else if (msg.isFumble) {
                    setKeyTitle(ctx, "💀 NAT 1\\nFAIL");
                } else {
                    setKeyTitle(ctx, `d20\\n[ ${msg.roll} ]`);
                }
            } else if (info.action === "com.arcaneledger.dice.roll") {
                setKeyTitle(ctx, `d${msg.sides}\\n[ ${msg.roll} ]`);
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
"""
    with open(PLUGIN_DIR / "plugin.js", "w", encoding="utf-8") as f:
        f.write(js)


def write_property_inspector():
    html = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Arcane Ledger Property Inspector</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f141c; color: #cbd5e1; font-size: 11px; margin: 0; padding: 12px; }
        .group { margin-bottom: 12px; }
        label { display: block; font-weight: bold; margin-bottom: 4px; color: #94a3b8; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px; }
        select, input { width: 100%; box-sizing: border-box; background: #1e293b; border: 1px solid #334155; border-radius: 6px; color: #f8fafc; padding: 6px 8px; font-size: 12px; outline: none; }
        select:focus, input:focus { border-color: #6366f1; }
        .row { display: flex; gap: 8px; }
        .badge { display: inline-block; padding: 2px 6px; background: rgba(99, 102, 241, 0.2); color: #818cf8; border-radius: 4px; font-weight: bold; font-size: 9px; margin-bottom: 8px; }
    </style>
</head>
<body>
    <div class="badge">ARCANE LEDGER 5.5e</div>

    <!-- Dice Action Settings -->
    <div id="section-dice" class="group" style="display: none;">
        <label>Die Type (Sides)</label>
        <select id="select-sides" onchange="saveActionSettings()">
            <option value="4">d4 (4 Sides)</option>
            <option value="6">d6 (6 Sides)</option>
            <option value="8">d8 (8 Sides)</option>
            <option value="10">d10 (10 Sides)</option>
            <option value="12">d12 (12 Sides)</option>
            <option value="20" selected>d20 (20 Sides)</option>
            <option value="100">d100 (Percentile)</option>
        </select>
    </div>

    <!-- SFX Action Settings -->
    <div id="section-sfx" class="group" style="display: none;">
        <label>Sound Effect</label>
        <select id="select-sound" onchange="saveActionSettings()">
            <option value="fireball" selected>🔥 Fireball Blast</option>
            <option value="sword_clash">⚔️ Sword Clash</option>
            <option value="dragon_roar">🐉 Dragon Roar</option>
            <option value="victory">🎺 Victory Fanfare</option>
            <option value="defeat">🔔 Defeat Knell</option>
            <option value="trap">⚙️ Dungeon Trap Trigger</option>
        </select>
    </div>

    <!-- Lighting Preset Settings -->
    <div id="section-lighting" class="group" style="display: none;">
        <label>Atmosphere Scene Preset</label>
        <select id="select-preset" onchange="saveActionSettings()">
            <option value="tavern" selected>🍺 Cozy Tavern Hearth (2500K Fire)</option>
            <option value="fireplace">🔥 Wilderness Campfire</option>
            <option value="dungeon">🕯️ Menacing Dungeon Torch</option>
            <option value="crypt">💀 Eerie Crypt Glow</option>
            <option value="boss">🥁 Blood Moon / Boss Combat</option>
            <option value="thunderstorm">⚡ Thunderstorm & Lightning</option>
            <option value="forest">🌲 Woodland Canopy</option>
            <option value="off">💡 Turn Lights Off</option>
        </select>
    </div>

    <!-- Lighting Event Flash Settings -->
    <div id="section-flash" class="group" style="display: none;">
        <label>Instant Lighting Flash FX</label>
        <select id="select-flash" onchange="saveActionSettings()">
            <option value="nat20" selected>✨ Nat 20 Golden Fanfare</option>
            <option value="nat1">💥 Nat 1 Crimson Hazard</option>
            <option value="strike">⚔️ Martial Strike White Flash</option>
        </select>
    </div>

    <!-- Party Rest Settings -->
    <div id="section-rest" class="group" style="display: none;">
        <label>Rest Duration</label>
        <select id="select-rest" onchange="saveActionSettings()">
            <option value="short" selected>☕ Short Rest (Restores Warlock Slots)</option>
            <option value="long">🏕️ Long Rest (Full HP, Slots & Resources)</option>
        </select>
    </div>

    <!-- Battlemap Settings -->
    <div id="section-map" class="group" style="display: none;">
        <label>Battlemap Action</label>
        <select id="select-map" onchange="saveActionSettings()">
            <option value="reveal-all" selected>👁️ Reveal Entire Fog of War</option>
            <option value="reset-fog">🌫️ Reset / Conceal Fog of War</option>
            <option value="ping">📍 Pulse Tabletop Ping Marker</option>
        </select>
    </div>

    <!-- Global Connection Settings -->
    <div class="group" style="border-top: 1px solid #1e293b; padding-top: 10px; margin-top: 14px;">
        <label>Arcane Ledger Server Host & Port</label>
        <div class="row">
            <input type="text" id="input-host" value="127.0.0.1" placeholder="Host/IP" onchange="saveGlobalSettings()" style="flex: 2;">
            <input type="number" id="input-port" value="8000" placeholder="Port" onchange="saveGlobalSettings()" style="flex: 1;">
        </div>
    </div>

    <script>
        let piSocket = null;
        let piUUID = null;
        let actionUUID = null;
        let currentSettings = {};

        function connectElgatoStreamDeckSocket(inPort, inUUID, inRegisterEvent, inInfo, inActionInfo) {
            piUUID = inUUID;
            const actionInfo = JSON.parse(inActionInfo);
            actionUUID = actionInfo.action;
            currentSettings = actionInfo.payload.settings || {};

            renderVisibleSections(actionUUID);
            populateFields(currentSettings);

            piSocket = new WebSocket("ws://127.0.0.1:" + inPort);
            piSocket.onopen = function() {
                piSocket.send(JSON.stringify({
                    event: inRegisterEvent,
                    uuid: inUUID
                }));
            };

            piSocket.onmessage = function(evt) {
                try {
                    const data = JSON.parse(evt.data);
                    if (data.event === "sendToPropertyInspector") {
                        if (data.payload.globalSettings) {
                            document.getElementById('input-host').value = data.payload.globalSettings.host || '127.0.0.1';
                            document.getElementById('input-port').value = data.payload.globalSettings.port || 8000;
                        }
                    }
                } catch(e){}
            };
        }

        function renderVisibleSections(action) {
            if (action.includes('.dice.roll')) document.getElementById('section-dice').style.display = 'block';
            if (action.includes('.audio.sfx')) document.getElementById('section-sfx').style.display = 'block';
            if (action.includes('.lighting.preset')) document.getElementById('section-lighting').style.display = 'block';
            if (action.includes('.lighting.event')) document.getElementById('section-flash').style.display = 'block';
            if (action.includes('.party.rest')) document.getElementById('section-rest').style.display = 'block';
            if (action.includes('.map.action')) document.getElementById('section-map').style.display = 'block';
        }

        function populateFields(settings) {
            if (settings.sides) document.getElementById('select-sides').value = settings.sides;
            if (settings.sound) document.getElementById('select-sound').value = settings.sound;
            if (settings.preset) document.getElementById('select-preset').value = settings.preset;
            if (settings.effect) document.getElementById('select-flash').value = settings.effect;
            if (settings.restType) document.getElementById('select-rest').value = settings.restType;
            if (settings.mapAction) document.getElementById('select-map').value = settings.mapAction;
        }

        function saveActionSettings() {
            const settings = {
                sides: parseInt(document.getElementById('select-sides')?.value || 20),
                sound: document.getElementById('select-sound')?.value || 'fireball',
                preset: document.getElementById('select-preset')?.value || 'tavern',
                effect: document.getElementById('select-flash')?.value || 'nat20',
                restType: document.getElementById('select-rest')?.value || 'short',
                mapAction: document.getElementById('select-map')?.value || 'reveal-all'
            };
            if (piSocket && piSocket.readyState === WebSocket.OPEN) {
                piSocket.send(JSON.stringify({
                    event: "setSettings",
                    context: piUUID,
                    payload: settings
                }));
            }
        }

        function saveGlobalSettings() {
            const globalSettings = {
                host: document.getElementById('input-host').value.trim() || '127.0.0.1',
                port: parseInt(document.getElementById('input-port').value || 8000)
            };
            if (piSocket && piSocket.readyState === WebSocket.OPEN) {
                piSocket.send(JSON.stringify({
                    event: "sendToPlugin",
                    context: piUUID,
                    payload: { saveGlobalSettings: globalSettings }
                }));
            }
        }
    </script>
</body>
</html>
"""
    with open(PLUGIN_DIR / "property_inspector.html", "w", encoding="utf-8") as f:
        f.write(html)


def bundle_plugin_zip():
    """Zips the `com.arcaneledger.streamdeck.sdPlugin` directory into `.streamDeckPlugin`"""
    zip_path = STATIC_SD_DIR / "com.arcaneledger.streamdeck.streamDeckPlugin"
    if zip_path.exists():
        zip_path.unlink()

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(PLUGIN_DIR):
            for file in files:
                full_path = Path(root) / file
                arcname = full_path.relative_to(PLUGIN_DIR.parent)
                zf.write(full_path, arcname)

    print(f"Generated Stream Deck Plugin Bundle: {zip_path} ({zip_path.stat().st_size} bytes)")
    return zip_path


def generate_preconfigured_profile():
    """Generates an importable 15-key Stream Deck Profile with pre-assigned actions"""
    profile_data = {
        "Name": "Arcane Ledger DM Console",
        "DeviceModel": "Stream Deck (15 Keys)",
        "Actions": [
            {"Key": 0, "Action": "com.arcaneledger.combat.prev-turn", "Title": "Prev Turn"},
            {"Key": 1, "Action": "com.arcaneledger.combat.next-turn", "Title": "Next Turn"},
            {"Key": 2, "Action": "com.arcaneledger.combat.toggle", "Title": "Combat"},
            {"Key": 3, "Action": "com.arcaneledger.dice.roll-d20", "Title": "Roll d20"},
            {"Key": 4, "Action": "com.arcaneledger.lighting.event", "Settings": {"effect": "nat20"}, "Title": "Nat 20"},

            {"Key": 5, "Action": "com.arcaneledger.lighting.preset", "Settings": {"preset": "tavern"}, "Title": "Tavern"},
            {"Key": 6, "Action": "com.arcaneledger.lighting.preset", "Settings": {"preset": "fireplace"}, "Title": "Campfire"},
            {"Key": 7, "Action": "com.arcaneledger.lighting.preset", "Settings": {"preset": "dungeon"}, "Title": "Dungeon"},
            {"Key": 8, "Action": "com.arcaneledger.lighting.preset", "Settings": {"preset": "boss"}, "Title": "Boss Fight"},
            {"Key": 9, "Action": "com.arcaneledger.lighting.preset", "Settings": {"preset": "thunderstorm"}, "Title": "Storm"},

            {"Key": 10, "Action": "com.arcaneledger.audio.sfx", "Settings": {"sound": "fireball"}, "Title": "Fireball"},
            {"Key": 11, "Action": "com.arcaneledger.audio.sfx", "Settings": {"sound": "sword_clash"}, "Title": "Sword"},
            {"Key": 12, "Action": "com.arcaneledger.audio.sfx", "Settings": {"sound": "dragon_roar"}, "Title": "Dragon"},
            {"Key": 13, "Action": "com.arcaneledger.party.rest", "Settings": {"restType": "short"}, "Title": "Short Rest"},
            {"Key": 14, "Action": "com.arcaneledger.party.rest", "Settings": {"restType": "long"}, "Title": "Long Rest"}
        ]
    }
    profile_path = STATIC_SD_DIR / "ArcaneLedger_15Key.streamDeckProfile"
    with open(profile_path, "w", encoding="utf-8") as f:
        json.dump(profile_data, f, indent=2)
    print(f"Generated Profile Configuration: {profile_path}")


def main():
    print("Building Arcane Ledger Stream Deck Plugin...")
    generate_all_icons()
    write_manifest()
    write_plugin_html()
    write_plugin_js()
    write_property_inspector()
    bundle_plugin_zip()
    generate_preconfigured_profile()
    print("Elgato Stream Deck Plugin build complete!")


if __name__ == "__main__":
    main()
