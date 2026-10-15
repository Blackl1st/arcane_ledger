import asyncio
import base64
import io
import json
import os
import random
import shutil
import socket
import struct
import time
import uuid
import zipfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import uvicorn
from fastapi import FastAPI, HTTPException, Request, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
BACKUPS_DIR = DATA_DIR / "backups"
AUDIO_DIR = STATIC_DIR / "audio"
IMAGES_DIR = STATIC_DIR / "images"
BATTLEMAPS_DIR = IMAGES_DIR / "battlemaps"

DATA_DIR.mkdir(exist_ok=True)
STATIC_DIR.mkdir(exist_ok=True)
TEMPLATES_DIR.mkdir(exist_ok=True)
BACKUPS_DIR.mkdir(exist_ok=True)
AUDIO_DIR.mkdir(exist_ok=True)
IMAGES_DIR.mkdir(exist_ok=True)
BATTLEMAPS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Arcane Ledger: D&D 5.5e DM Dashboard", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Helper functions for JSON storage
def read_json(filename: str, default: Any = None) -> Any:
    file_path = DATA_DIR / filename
    if not file_path.exists():
        if default is not None:
            write_json(filename, default)
            return default
        return None
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading {filename}: {e}")
        return default

def write_json(filename: str, data: Any) -> bool:
    file_path = DATA_DIR / filename
    temp_path = DATA_DIR / f"{filename}.tmp"
    try:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        temp_path.replace(file_path)
        return True
    except Exception as e:
        print(f"Error writing {filename}: {e}")
        if temp_path.exists():
            temp_path.unlink()
        return False

# Pydantic models for validation
class DeathSaves(BaseModel):
    successes: int = 0
    failures: int = 0

class Character(BaseModel):
    id: str
    name: str
    player: str = ""
    species: str = "Human"
    classRole: str = "Adventurer"
    level: int = 1
    ac: int = 10
    speed: int = 30
    currentHp: int = 10
    maxHp: int = 10
    tempHp: int = 0
    initiativeMod: int = 0
    passivePerception: int = 10
    passiveInsight: int = 10
    passiveInvestigation: int = 10
    spellDc: Optional[int] = None
    heroicInspiration: bool = False
    deathSaves: DeathSaves = DeathSaves()
    notes: str = ""

class Condition(BaseModel):
    name: str
    detail: str = ""
    durationRounds: Optional[int] = None
    appliedRound: int = 1

class Combatant(BaseModel):
    id: str
    name: str
    type: str = "monster"  # "pc", "monster", "npc", "boss"
    initiative: float = 0.0
    tieBreaker: float = 0.0
    ac: int = 10
    currentHp: int = 10
    maxHp: int = 10
    tempHp: int = 0
    conditions: List[Condition] = []
    isConcentrating: bool = False
    concentratingSpell: str = ""
    notes: str = ""
    statDetails: str = ""
    sourceId: Optional[str] = None
    hidden: Optional[bool] = False
    visibleToPlayers: Optional[bool] = True
    imageUrl: Optional[str] = ""
    monsterId: Optional[str] = None
    size: Optional[str] = "Medium"

class CombatState(BaseModel):
    inCombat: bool = False
    round: int = 1
    currentTurnIndex: int = 0
    combatants: List[Combatant] = []

class NPC(BaseModel):
    id: Optional[str] = None
    name: str
    epithet: str = ""
    species: str = ""
    role: str = ""
    category: str = ""
    voice: str = ""
    appearance: str = ""
    personality: str = ""
    backstory: str = ""
    secret: str = ""
    faction: str = ""
    factionStanding: str = ""
    location: str = ""
    loot: str = ""
    statName: str = ""
    statAcHp: str = ""
    statDetails: str = ""
    notes: str = ""

class WorldSettings(BaseModel):
    customFactions: List[str] = []
    customLocations: List[str] = []
    useOnlyCustomFactions: bool = False
    useOnlyCustomLocations: bool = False

# Phase 2 Models
class NoteItem(BaseModel):
    id: Optional[str] = None
    timestamp: str = ""
    text: str
    tag: str = "general"

class TimerItem(BaseModel):
    id: str
    name: str
    durationMinutes: int
    remainingMinutes: int
    source: str = ""

class WeatherState(BaseModel):
    temperature: str = "Mild (62°F / 17°C)"
    wind: str = "Gentle Breeze"
    precipitation: str = "Clear Skies"
    tacticalEffect: str = "None"

class TimeWeatherState(BaseModel):
    day: int = 1
    hour: int = 9
    minute: int = 0
    weather: WeatherState = WeatherState()
    moonPhase: str = "Waxing Crescent"
    activeTimers: List[TimerItem] = []

# Phase 3 Models
class MonsterTrait(BaseModel):
    name: str
    desc: str

class MonsterAction(BaseModel):
    name: str
    desc: str

class MonsterItem(BaseModel):
    id: Optional[str] = None
    name: str
    size: str = "Medium"
    type: str = "Humanoid"
    alignment: str = "Neutral"
    cr: str = "1/4"
    xp: int = 50
    ac: int = 10
    hp: int = 10
    hitDice: str = "2d8"
    speed: str = "30 ft."
    stats: Dict[str, Any] = {"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10}
    saves: Optional[str] = None
    skills: Optional[str] = None
    vulnerabilities: Optional[str] = None
    resistances: Optional[str] = None
    immunities: Optional[str] = None
    senses: str = "Passive Perception 10"
    languages: str = "Common"
    traits: List[MonsterTrait] = []
    actions: List[MonsterAction] = []
    bonusActions: Optional[List[MonsterAction]] = []
    reactions: Optional[List[MonsterAction]] = []
    legendaryActions: Optional[List[MonsterAction]] = []

class LocationItem(BaseModel):
    id: Optional[str] = None
    name: str
    type: str = "Settlement"
    danger: str = "Low"
    summary: str = ""
    description: str = ""
    factions: List[str] = []
    notableNpcs: List[str] = []
    secrets: str = ""
    tags: List[str] = []

class TensionClock(BaseModel):
    id: Optional[str] = None
    title: str
    totalTicks: int = 4
    currentTicks: int = 0
    outcome: str = ""
    active: bool = True

class FactionItem(BaseModel):
    id: Optional[str] = None
    name: str
    leader: str = ""
    influence: str = "Local"
    reputationScore: int = 0
    reputation: str = "Neutral"
    headquarters: str = ""
    goals: str = ""
    allies: List[str] = []
    rivals: List[str] = []
    description: str = ""
    clocks: List[TensionClock] = []

class QuestObjective(BaseModel):
    id: Optional[str] = None
    text: str
    completed: bool = False

class QuestItem(BaseModel):
    id: Optional[str] = None
    title: str
    giver: str = ""
    location: str = ""
    status: str = "Active"
    reward: str = ""
    summary: str = ""
    objectives: List[QuestObjective] = []
    notes: str = ""

class RumorItem(BaseModel):
    id: Optional[str] = None
    text: str
    source: str = ""
    location: str = ""
    veracity: str = "Unverified"
    active: bool = True

class SecretModel(BaseModel):
    id: Optional[str] = None
    text: str
    status: str = "unrevealed"  # "unrevealed" | "revealed" | "archived"
    category: str = "Plot"      # "Plot" | "Lore" | "NPC" | "Location" | "Faction" | "Danger"
    tiedLocation: Optional[str] = ""
    tiedNpc: Optional[str] = ""
    tiedFaction: Optional[str] = ""
    sessionNotes: Optional[str] = ""
    revealedAt: Optional[float] = None
    createdAt: Optional[float] = None

class HandoutModel(BaseModel):
    id: Optional[str] = None
    title: str = "Untitled Handout"
    type: str = "letter"  # "letter" | "journal" | "bounty" | "cipher" | "scroll"
    theme: str = "parchment"  # "parchment" | "burnt" | "vellum" | "blood" | "arcane"
    fontStyle: str = "cursive"  # "cursive" | "blackletter" | "serif" | "chisel" | "typewriter"
    author: Optional[str] = ""
    recipient: Optional[str] = ""
    dateString: Optional[str] = ""
    content: str = ""
    seal: Optional[str] = "crown"  # "none" | "crown" | "skull" | "arcane" | "scales" | "daggers" | "dragon" | "tree"
    sealColor: Optional[str] = "red"  # "red" | "gold" | "black" | "green" | "purple"
    isCoded: bool = False
    cipherType: Optional[str] = "runic"  # "runic" | "caesar" | "redacted" | "scramble" | "none"
    cipherShift: Optional[int] = 3
    cipherHint: Optional[str] = ""
    investigationDC: Optional[int] = 14
    isDeciphered: bool = False
    bountyReward: Optional[str] = ""
    bountyCrimes: Optional[str] = ""
    imageUrl: Optional[str] = ""
    tiedLocation: Optional[str] = ""
    tiedNpc: Optional[str] = ""
    sessionNotes: Optional[str] = ""
    status: str = "ready"  # "draft" | "ready" | "delivered"
    createdAt: Optional[float] = None
    updatedAt: Optional[float] = None

# Phase 4 Models
class BroadcastPayload(BaseModel):
    active: bool = True
    title: str = ""
    subtitle: str = ""
    content: str = ""
    type: str = "text"
    imageUrl: str = ""
    items: Optional[List[Dict[str, Any]]] = None
    handout: Optional[Dict[str, Any]] = None

class SnapshotCreate(BaseModel):
    label: str = ""

# Tabletop Battlemap Models
class BattlemapStateUpdate(BaseModel):
    activeMapId: Optional[str] = None
    activeMapUrl: Optional[str] = None
    activeMapName: Optional[str] = None
    gridSize: Optional[int] = None
    gridVisible: Optional[bool] = None
    gridColor: Optional[str] = None
    fogEnabled: Optional[bool] = None
    rotation: Optional[int] = None
    panX: Optional[float] = None
    panY: Optional[float] = None
    zoom: Optional[float] = None
    locked: Optional[bool] = None
    templates: Optional[List[Dict[str, Any]]] = None
    activeRuler: Optional[Dict[str, Any]] = None

class BattlemapRuler(BaseModel):
    startX: float
    startY: float
    endX: float
    endY: float
    distanceFeet: float
    distanceSquares: Optional[float] = None
    visibleToPlayers: Optional[bool] = True
    active: Optional[bool] = True

class BattlemapTemplate(BaseModel):
    id: Optional[str] = None
    type: str = "circle" # circle, cone, line, cube
    x: float
    y: float
    radiusFeet: Optional[float] = 20.0
    lengthFeet: Optional[float] = 60.0
    widthFeet: Optional[float] = 5.0
    rotation: Optional[float] = 0.0 # degrees
    color: Optional[str] = "#f97316"
    label: Optional[str] = "Spell AoE"
    visibleToPlayers: Optional[bool] = True

class BattlemapFogUpdate(BaseModel):
    fogMask: Optional[str] = None
    reset: Optional[bool] = False
    revealAll: Optional[bool] = False

class BattlemapPing(BaseModel):
    x: float
    y: float
    color: Optional[str] = "#f59e0b"

class BattlemapSelect(BaseModel):
    mapId: str

class BattlemapTokenCreate(BaseModel):
    id: Optional[str] = None
    name: str
    monsterId: Optional[str] = None
    combatantId: Optional[str] = None
    size: Optional[str] = "Medium"
    sizeSquares: Optional[float] = 1.0
    x: Optional[float] = None
    y: Optional[float] = None
    imageUrl: Optional[str] = ""
    currentHp: Optional[int] = 10
    maxHp: Optional[int] = 10
    color: Optional[str] = "#ef4444"
    visibleToPlayers: Optional[bool] = True
    elevation: Optional[int] = 0
    conditions: Optional[List[Any]] = []
    concentrating: Optional[bool] = False
    strideActive: Optional[bool] = False

class BattlemapTokenBatchCreate(BaseModel):
    tokens: List[BattlemapTokenCreate]

class BattlemapTokenMove(BaseModel):
    id: str
    x: float
    y: float

class BattlemapTokenUpdate(BaseModel):
    id: str
    name: Optional[str] = None
    currentHp: Optional[int] = None
    maxHp: Optional[int] = None
    visibleToPlayers: Optional[bool] = None
    color: Optional[str] = None
    x: Optional[float] = None
    y: Optional[float] = None
    elevation: Optional[int] = None
    conditions: Optional[List[Any]] = None
    concentrating: Optional[bool] = None
    strideActive: Optional[bool] = None

class ItemModel(BaseModel):
    id: Optional[str] = None
    name: str
    type: str = "Wondrous Item"
    rarity: str = "Common"
    attunement: Any = False
    cost: Optional[str] = ""
    weight: Optional[str] = ""
    description: Optional[str] = ""
    damage: Optional[str] = None
    damageType: Optional[str] = None
    properties: Optional[List[str]] = None
    ac: Optional[str] = None
    strengthReq: Optional[str] = None
    stealthDisadv: Optional[bool] = None
    isCustom: Optional[bool] = True

# Routes
@app.get("/")
async def root():
    index_file = TEMPLATES_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    return {"message": "Arcane Ledger 5.5e DM Dashboard backend is running"}

@app.get("/player")
async def player_view():
    player_file = TEMPLATES_DIR / "player.html"
    if player_file.exists():
        return FileResponse(str(player_file), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    return {"message": "Player screen template not found"}

@app.get("/map")
async def battlemap_view():
    map_file = TEMPLATES_DIR / "map.html"
    if map_file.exists():
        return FileResponse(str(map_file), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    return {"message": "Battlemap screen template not found"}

@app.get("/api/state")
async def get_full_state():
    party = read_json("party.json", [])
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    roster = read_json("roster.json", [])
    world = read_json("world.json", {
        "customFactions": [],
        "customLocations": [],
        "useOnlyCustomFactions": False,
        "useOnlyCustomLocations": False
    })
    rules = read_json("rules_2024.json", {})
    notes = read_json("session_notes.json", [])
    time_weather = read_json("time_weather.json", {
        "day": 1, "hour": 9, "minute": 0,
        "weather": {"temperature": "Mild", "wind": "Calm", "precipitation": "Clear", "tacticalEffect": "None"},
        "moonPhase": "Waxing Crescent",
        "activeTimers": []
    })
    monsters = read_json("monsters.json", [])
    locations = read_json("locations.json", [])
    factions = read_json("factions.json", [])
    quests_data = read_json("quests.json", {"quests": [], "rumors": []})
    if isinstance(quests_data, list):
        quests_list = quests_data
        rumors_list = []
    else:
        quests_list = quests_data.get("quests", [])
        rumors_list = quests_data.get("rumors", [])

    broadcast = read_json("broadcast.json", {
        "active": False,
        "title": "",
        "subtitle": "",
        "content": "",
        "type": "text",
        "imageUrl": ""
    })
    audio_library = read_json("audio_library.json", [])
    audio_presets = read_json("audio_presets.json", [])
    spells = read_json("spells.json", [])
    items = read_json("items.json", [])
    encounters = read_json("encounters.json", [])
    secrets = read_json("secrets.json", [])
    handouts = read_json("handouts.json", [])
    lighting = read_json("lighting.json", {
        "connected": False,
        "apiUrl": "ws://localhost:12345",
        "brightness": 65,
        "cct": 3200,
        "rgb": [255, 185, 110],
        "effect": "candle",
        "activePreset": "preset-tavern",
        "syncAudio": True,
        "diceTriggers": True
    })

    return {
        "party": party,
        "combat": combat,
        "roster": roster,
        "world": world,
        "rules": rules,
        "notes": notes,
        "timeWeather": time_weather,
        "monsters": monsters,
        "locations": locations,
        "factions": factions,
        "quests": quests_list,
        "rumors": rumors_list,
        "secrets": secrets,
        "handouts": handouts,
        "broadcast": broadcast,
        "audioLibrary": audio_library,
        "audioPresets": audio_presets,
        "spells": spells,
        "items": items,
        "encounters": encounters,
        "lighting": lighting
    }

# Party management
@app.get("/api/party")
async def get_party():
    return read_json("party.json", [])

@app.post("/api/party")
async def save_party(party: List[Character]):
    data = [c.dict() for c in party]
    write_json("party.json", data)
    return {"status": "success", "count": len(data)}

@app.post("/api/party/quick-hp")
async def update_party_quick_hp(payload: Dict[str, Any]):
    pc_id = payload.get("id")
    current_hp = payload.get("currentHp")
    temp_hp = payload.get("tempHp", 0)
    heroic_insp = payload.get("heroicInspiration")
    death_saves = payload.get("deathSaves")

    party = read_json("party.json", [])
    updated = False
    for pc in party:
        if pc.get("id") == pc_id:
            if current_hp is not None:
                pc["currentHp"] = max(0, min(current_hp, pc.get("maxHp", 999)))
            if temp_hp is not None:
                pc["tempHp"] = max(0, temp_hp)
            if heroic_insp is not None:
                pc["heroicInspiration"] = heroic_insp
            if death_saves is not None:
                pc["deathSaves"] = death_saves
            updated = True
            break

    if updated:
        write_json("party.json", party)
        return {"status": "success", "party": party}
    raise HTTPException(status_code=404, detail="PC not found")

# Combat management
@app.get("/api/combat")
async def get_combat():
    return read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})

@app.post("/api/combat/state")
async def save_combat_state(state: CombatState):
    write_json("combat.json", state.dict())
    return {"status": "success"}

@app.post("/api/combat/start")
async def start_combat():
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    combat["inCombat"] = True
    combat["round"] = 1
    combat["currentTurnIndex"] = 0
    # Sort combatants descending by initiative, then tieBreaker
    combatants = combat.get("combatants", [])
    combatants.sort(key=lambda c: (c.get("initiative", 0.0), c.get("tieBreaker", 0.0)), reverse=True)
    combat["combatants"] = combatants
    write_json("combat.json", combat)
    return combat

@app.post("/api/combat/end")
async def end_combat():
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    combat["inCombat"] = False
    combat["round"] = 1
    combat["currentTurnIndex"] = 0
    write_json("combat.json", combat)
    return combat

@app.post("/api/combat/reset")
async def reset_combat():
    combat = {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []}
    write_json("combat.json", combat)
    return combat

@app.post("/api/combat/next-turn")
async def next_turn():
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    combatants = combat.get("combatants", [])
    if not combatants:
        return combat

    current_idx = combat.get("currentTurnIndex", 0)
    current_round = combat.get("round", 1)

    next_idx = current_idx + 1
    if next_idx >= len(combatants):
        next_idx = 0
        current_round += 1
        combat["round"] = current_round

    combat["currentTurnIndex"] = next_idx

    # Check for expired conditions
    for c in combatants:
        new_conditions = []
        for cond in c.get("conditions", []):
            dur = cond.get("durationRounds")
            applied = cond.get("appliedRound", 1)
            if dur is not None and dur > 0:
                if current_round >= applied + dur:
                    continue  # Expired
            new_conditions.append(cond)
        c["conditions"] = new_conditions

    write_json("combat.json", combat)
    return combat

@app.post("/api/combat/prev-turn")
async def prev_turn():
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    combatants = combat.get("combatants", [])
    if not combatants:
        return combat

    current_idx = combat.get("currentTurnIndex", 0)
    current_round = combat.get("round", 1)

    prev_idx = current_idx - 1
    if prev_idx < 0:
        prev_idx = len(combatants) - 1
        current_round = max(1, current_round - 1)
        combat["round"] = current_round

    combat["currentTurnIndex"] = prev_idx
    write_json("combat.json", combat)
    return combat

@app.post("/api/combat/import-party")
async def import_party_to_combat(payload: Optional[Dict[str, Any]] = None):
    party = read_json("party.json", [])
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    existing_source_ids = {c.get("sourceId") for c in combat.get("combatants", []) if c.get("sourceId")}

    for pc in party:
        if pc["id"] in existing_source_ids:
            continue
        init_mod = pc.get("initiativeMod", 0)
        roll = random.randint(1, 20) + init_mod
        combat["combatants"].append({
            "id": f"combat-{pc['id']}",
            "name": pc["name"],
            "type": "pc",
            "initiative": float(roll),
            "tieBreaker": float(init_mod),
            "ac": pc.get("ac", 10),
            "currentHp": pc.get("currentHp", 10),
            "maxHp": pc.get("maxHp", 10),
            "tempHp": pc.get("tempHp", 0),
            "conditions": [],
            "isConcentrating": False,
            "concentratingSpell": "",
            "notes": pc.get("classRole", ""),
            "statDetails": f"Speed: {pc.get('speed', 30)} ft | PP: {pc.get('passivePerception', 10)}",
            "sourceId": pc["id"]
        })

    combat["combatants"].sort(key=lambda c: (c.get("initiative", 0.0), c.get("tieBreaker", 0.0)), reverse=True)
    write_json("combat.json", combat)
    return combat

@app.post("/api/combat/roll-monsters")
async def roll_monsters_initiative():
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    for c in combat.get("combatants", []):
        if c.get("type") in ["monster", "npc", "boss"]:
            # Roll 1d20 + tieBreaker
            d20 = random.randint(1, 20)
            c["initiative"] = float(d20 + c.get("tieBreaker", 0.0))
    combat["combatants"].sort(key=lambda c: (c.get("initiative", 0.0), c.get("tieBreaker", 0.0)), reverse=True)
    write_json("combat.json", combat)
    return combat

@app.post("/api/combat/add-combatant")
async def add_combatant(combatant: Combatant):
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    combat["combatants"].append(combatant.dict())
    if combat.get("inCombat"):
        combat["combatants"].sort(key=lambda c: (c.get("initiative", 0.0), c.get("tieBreaker", 0.0)), reverse=True)
    write_json("combat.json", combat)
    return combat

@app.delete("/api/combat/{combatant_id}")
async def remove_combatant(combatant_id: str):
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    combatants = combat.get("combatants", [])
    combat["combatants"] = [c for c in combatants if c.get("id") != combatant_id]
    if combat.get("currentTurnIndex", 0) >= len(combat["combatants"]) and combat["combatants"]:
        combat["currentTurnIndex"] = 0
    write_json("combat.json", combat)
    return combat

# Roster & NPC Management
@app.get("/api/roster")
async def get_roster():
    return read_json("roster.json", [])

@app.post("/api/roster")
async def save_npc(npc: NPC):
    roster = read_json("roster.json", [])
    npc_dict = npc.dict()
    if not npc_dict.get("id"):
        npc_dict["id"] = f"npc-{int(random.random() * 1000000)}"
    
    # Check if updating existing
    updated = False
    for i, item in enumerate(roster):
        if item.get("id") == npc_dict["id"]:
            roster[i] = npc_dict
            updated = True
            break
    if not updated:
        roster.insert(0, npc_dict)
    
    write_json("roster.json", roster)
    return {"status": "success", "npc": npc_dict, "roster": roster}

@app.delete("/api/roster/{npc_id}")
async def delete_npc(npc_id: str):
    roster = read_json("roster.json", [])
    roster = [item for item in roster if item.get("id") != npc_id]
    write_json("roster.json", roster)
    return {"status": "success", "roster": roster}

# World Settings
@app.get("/api/world")
async def get_world():
    return read_json("world.json", {})

@app.post("/api/world")
async def save_world(world: WorldSettings):
    write_json("world.json", world.dict())
    return {"status": "success"}

# 2024 Rules Reference
@app.get("/api/rules")
async def get_rules():
    return read_json("rules_2024.json", {})

# -------------------------------------------------------------
# PHASE 2: REST AUTOMATION (SHORT REST & LONG REST)
# -------------------------------------------------------------
@app.post("/api/party/rest")
async def trigger_party_rest(payload: Dict[str, Any]):
    rest_type = payload.get("type", "short")
    party = read_json("party.json", [])
    
    for pc in party:
        if rest_type == "long":
            # 2024 Long Rest rules:
            # 1. Regain all lost HP
            # 2. Reset Temp HP to 0
            # 3. Reset Death Saves
            # 4. Regain 1 level of Exhaustion
            # 5. Restore all spell slots and class resources
            pc["currentHp"] = pc.get("maxHp", 10)
            pc["tempHp"] = 0
            pc["deathSaves"] = {"successes": 0, "failures": 0}
            for lvl, s in pc.get("spellSlots", {}).items():
                s["used"] = 0
            for r in pc.get("resources", []):
                r["used"] = 0
        else:
            # Short Rest rules:
            # Recharge short-rest class features & Warlock pact slots
            for r in pc.get("resources", []):
                if r.get("resetOn") in ("Short Rest", "Turn"):
                    r["used"] = 0
            if pc.get("classRole", "").lower().startswith("warlock"):
                for lvl, s in pc.get("spellSlots", {}).items():
                    s["used"] = 0
                    
    write_json("party.json", party)
    return {
        "status": "success",
        "message": f"{rest_type.title()} Rest completed! Slots and features recharged.",
        "party": party
    }


# -------------------------------------------------------------
# PHASE 2: SESSION SCRATCHPAD & TAGGED NOTES
# -------------------------------------------------------------
@app.get("/api/notes")
async def get_notes():
    return read_json("session_notes.json", [])

@app.post("/api/notes")
async def save_note(note: NoteItem):
    notes = read_json("session_notes.json", [])
    note_dict = note.dict()
    if not note_dict.get("id"):
        note_dict["id"] = f"note-{int(random.random() * 1000000)}"
    
    updated = False
    for i, item in enumerate(notes):
        if item.get("id") == note_dict["id"]:
            notes[i] = note_dict
            updated = True
            break
    if not updated:
        notes.insert(0, note_dict)
    
    write_json("session_notes.json", notes)
    return {"status": "success", "note": note_dict, "notes": notes}

@app.delete("/api/notes/{note_id}")
async def delete_note(note_id: str):
    notes = read_json("session_notes.json", [])
    notes = [item for item in notes if item.get("id") != note_id]
    write_json("session_notes.json", notes)
    return {"status": "success", "notes": notes}

# -------------------------------------------------------------
# PHASE 2: IN-GAME TIME, TIMERS & WEATHER TRACKER
# -------------------------------------------------------------
@app.get("/api/time-weather")
async def get_time_weather():
    return read_json("time_weather.json", {
        "day": 1, "hour": 9, "minute": 0,
        "weather": {"temperature": "Mild", "wind": "Calm", "precipitation": "Clear", "tacticalEffect": "None"},
        "moonPhase": "Waxing Crescent",
        "activeTimers": []
    })

@app.post("/api/time-weather")
async def save_time_weather(state: TimeWeatherState):
    write_json("time_weather.json", state.dict())
    return {"status": "success", "state": state.dict()}

@app.post("/api/time-weather/advance")
async def advance_time(payload: Dict[str, Any]):
    minutes_to_add = int(payload.get("minutes", 10))
    state = read_json("time_weather.json", {
        "day": 1, "hour": 9, "minute": 0,
        "weather": {"temperature": "Mild", "wind": "Calm", "precipitation": "Clear", "tacticalEffect": "None"},
        "moonPhase": "Waxing Crescent",
        "activeTimers": []
    })

    current_min = state.get("minute", 0) + minutes_to_add
    extra_hours = current_min // 60
    state["minute"] = current_min % 60

    current_hour = state.get("hour", 9) + extra_hours
    extra_days = current_hour // 24
    state["hour"] = current_hour % 24

    state["day"] = state.get("day", 1) + extra_days

    # Update active timers
    expired_timers = []
    remaining_timers = []
    for timer in state.get("activeTimers", []):
        rem = timer.get("remainingMinutes", 0) - minutes_to_add
        if rem <= 0:
            expired_timers.append(timer.get("name", "Timer"))
        else:
            timer["remainingMinutes"] = rem
            remaining_timers.append(timer)
    state["activeTimers"] = remaining_timers

    # Cycle moon phase every 4 days
    MOON_PHASES = [
        "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
        "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"
    ]
    moon_idx = (state.get("day", 1) // 4) % len(MOON_PHASES)
    state["moonPhase"] = MOON_PHASES[moon_idx]

    write_json("time_weather.json", state)
    return {
        "status": "success",
        "state": state,
        "expiredTimers": expired_timers
    }

# -------------------------------------------------------------
# PHASE 3: BESTIARY & MONSTER ENCOUNTER BRIDGE
# -------------------------------------------------------------
@app.get("/api/monsters")
async def get_monsters():
    return read_json("monsters.json", [])

@app.post("/api/monsters")
async def save_monster(monster: MonsterItem):
    monsters = read_json("monsters.json", [])
    m_dict = monster.dict()
    if not m_dict.get("id"):
        m_dict["id"] = "m-" + str(uuid.uuid4())[:8]

    updated = False
    for i, m in enumerate(monsters):
        if m.get("id") == m_dict["id"]:
            monsters[i] = m_dict
            updated = True
            break
    if not updated:
        monsters.append(m_dict)

    write_json("monsters.json", monsters)
    return {"status": "success", "monster": m_dict, "monsters": monsters}

@app.delete("/api/monsters/{monster_id}")
async def delete_monster(monster_id: str):
    monsters = read_json("monsters.json", [])
    monsters = [m for m in monsters if m.get("id") != monster_id]
    write_json("monsters.json", monsters)
    return {"status": "success", "monsters": monsters}

@app.post("/api/monsters/{monster_id}/spawn")
async def spawn_monster_to_combat(monster_id: str, payload: Dict[str, Any] = None):
    payload = payload or {}
    count = max(1, min(12, int(payload.get("count", 1))))
    manual_init = payload.get("initiative")

    monsters = read_json("monsters.json", [])
    monster = next((m for m in monsters if m.get("id") == monster_id), None)
    if not monster:
        raise HTTPException(status_code=404, detail="Monster not found")

    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    dex = monster.get("stats", {}).get("dex", 10)
    dex_mod = (dex - 10) // 2

    # Check how many of this monster already exist in combat
    existing_same = [c for c in combat.get("combatants", []) if c.get("name", "").startswith(monster.get("name", "Monster"))]
    start_num = len(existing_same) + 1

    new_combatants = []
    for i in range(count):
        if manual_init is not None:
            init_val = float(manual_init)
        else:
            init_val = float(random.randint(1, 20) + dex_mod)

        num_label = f" {start_num + i}" if (count > 1 or len(existing_same) > 0) else ""
        c_id = f"mob-{monster_id}-{int(time.time()*1000)}-{i}"
        new_combatant = {
            "id": c_id,
            "name": f"{monster.get('name', 'Monster')}{num_label}",
            "type": "monster",
            "monsterId": monster_id,
            "size": monster.get("size", "Medium"),
            "initiative": init_val,
            "tieBreaker": round(dex_mod + random.uniform(0.01, 0.99), 2),
            "currentHp": int(monster.get("hp", 10)),
            "maxHp": int(monster.get("hp", 10)),
            "tempHp": 0,
            "ac": int(monster.get("ac", 10)),
            "conditions": [],
            "concentrating": False,
            "imageUrl": monster.get("imageUrl") or f"/static/images/monsters/{monster_id}.webp",
            "notes": f"CR {monster.get('cr', '?')} | {monster.get('type', '')} | Spd: {monster.get('speed', '30 ft.')}",
            "hidden": payload.get("hidden", False),
            "visibleToPlayers": not payload.get("hidden", False)
        }
        new_combatants.append(new_combatant)

    combat["combatants"].extend(new_combatants)
    combat["combatants"].sort(key=lambda c: (c.get("initiative", 0), c.get("tieBreaker", 0)), reverse=True)

    write_json("combat.json", combat)
    return {
        "status": "success",
        "spawned": len(new_combatants),
        "spawnedNames": [c["name"] for c in new_combatants],
        "combat": combat
    }

# -------------------------------------------------------------
# PHASE 3: LOCATIONS DIRECTORY
# -------------------------------------------------------------
@app.get("/api/locations")
async def get_locations():
    return read_json("locations.json", [])

@app.post("/api/locations")
async def save_location(loc: LocationItem):
    locations = read_json("locations.json", [])
    l_dict = loc.dict()
    if not l_dict.get("id"):
        l_dict["id"] = "loc-" + str(uuid.uuid4())[:8]

    updated = False
    for i, l in enumerate(locations):
        if l.get("id") == l_dict["id"]:
            locations[i] = l_dict
            updated = True
            break
    if not updated:
        locations.insert(0, l_dict)

    write_json("locations.json", locations)
    return {"status": "success", "location": l_dict, "locations": locations}

@app.delete("/api/locations/{location_id}")
async def delete_location(location_id: str):
    locations = read_json("locations.json", [])
    locations = [l for l in locations if l.get("id") != location_id]
    write_json("locations.json", locations)
    return {"status": "success", "locations": locations}

# -------------------------------------------------------------
# PHASE 3: FACTIONS & INTERACTIVE TENSION CLOCKS
# -------------------------------------------------------------
@app.get("/api/factions")
async def get_factions():
    return read_json("factions.json", [])

@app.post("/api/factions")
async def save_faction(fac: FactionItem):
    factions = read_json("factions.json", [])
    f_dict = fac.dict()
    if not f_dict.get("id"):
        f_dict["id"] = "fac-" + str(uuid.uuid4())[:8]

    score = f_dict.get("reputationScore", 0)
    if score >= 2:
        f_dict["reputation"] = "Allied"
    elif score == 1:
        f_dict["reputation"] = "Friendly"
    elif score == 0:
        f_dict["reputation"] = "Neutral"
    elif score == -1:
        f_dict["reputation"] = "Suspicious"
    else:
        f_dict["reputation"] = "Hostile"

    updated = False
    for i, f in enumerate(factions):
        if f.get("id") == f_dict["id"]:
            factions[i] = f_dict
            updated = True
            break
    if not updated:
        factions.append(f_dict)

    write_json("factions.json", factions)
    return {"status": "success", "faction": f_dict, "factions": factions}

@app.delete("/api/factions/{faction_id}")
async def delete_faction(faction_id: str):
    factions = read_json("factions.json", [])
    factions = [f for f in factions if f.get("id") != faction_id]
    write_json("factions.json", factions)
    return {"status": "success", "factions": factions}

@app.post("/api/factions/{faction_id}/clocks/{clock_id}/tick")
async def tick_tension_clock(faction_id: str, clock_id: str, payload: Dict[str, Any]):
    delta = int(payload.get("delta", 1))
    factions = read_json("factions.json", [])
    target_clock = None

    for fac in factions:
        if fac.get("id") == faction_id:
            for clk in fac.get("clocks", []):
                if clk.get("id") == clock_id:
                    target_clock = clk
                    total = clk.get("totalTicks", 4)
                    cur = clk.get("currentTicks", 0)
                    new_val = max(0, min(total, cur + delta))
                    clk["currentTicks"] = new_val
                    break
            break

    if not target_clock:
        raise HTTPException(status_code=404, detail="Faction or Clock not found")

    write_json("factions.json", factions)
    is_full = target_clock.get("currentTicks", 0) >= target_clock.get("totalTicks", 4)
    return {
        "status": "success",
        "clock": target_clock,
        "isFull": is_full,
        "factions": factions
    }

@app.post("/api/factions/{faction_id}/clocks")
async def add_faction_clock(faction_id: str, clock: TensionClock):
    factions = read_json("factions.json", [])
    c_dict = clock.dict()
    if not c_dict.get("id"):
        c_dict["id"] = "clk-" + str(uuid.uuid4())[:8]

    target_faction = None
    for fac in factions:
        if fac.get("id") == faction_id:
            target_faction = fac
            clocks = fac.get("clocks", [])
            clocks.append(c_dict)
            fac["clocks"] = clocks
            break

    if not target_faction:
        raise HTTPException(status_code=404, detail="Faction not found")

    write_json("factions.json", factions)
    return {"status": "success", "clock": c_dict, "factions": factions}

@app.delete("/api/factions/{faction_id}/clocks/{clock_id}")
async def delete_faction_clock(faction_id: str, clock_id: str):
    factions = read_json("factions.json", [])
    for fac in factions:
        if fac.get("id") == faction_id:
            fac["clocks"] = [c for c in fac.get("clocks", []) if c.get("id") != clock_id]
            break

    write_json("factions.json", factions)
    return {"status": "success", "factions": factions}

# -------------------------------------------------------------
# PHASE 3: QUESTS & RUMORS BOARD
# -------------------------------------------------------------
@app.get("/api/quests")
async def get_quests():
    data = read_json("quests.json", {"quests": [], "rumors": []})
    if isinstance(data, list):
        return {"quests": data, "rumors": []}
    return data

@app.post("/api/quests")
async def save_quest(quest: QuestItem):
    data = read_json("quests.json", {"quests": [], "rumors": []})
    if isinstance(data, list):
        data = {"quests": data, "rumors": []}
    quests = data.get("quests", [])
    q_dict = quest.dict()
    if not q_dict.get("id"):
        q_dict["id"] = "qst-" + str(uuid.uuid4())[:8]

    for i, obj in enumerate(q_dict.get("objectives", [])):
        if not obj.get("id"):
            obj["id"] = f"obj-{i+1}-{str(uuid.uuid4())[:4]}"

    updated = False
    for i, q in enumerate(quests):
        if q.get("id") == q_dict["id"]:
            quests[i] = q_dict
            updated = True
            break
    if not updated:
        quests.insert(0, q_dict)

    data["quests"] = quests
    write_json("quests.json", data)
    return {"status": "success", "quest": q_dict, "quests": quests}

@app.delete("/api/quests/{quest_id}")
async def delete_quest(quest_id: str):
    data = read_json("quests.json", {"quests": [], "rumors": []})
    if isinstance(data, list):
        data = {"quests": data, "rumors": []}
    data["quests"] = [q for q in data.get("quests", []) if q.get("id") != quest_id]
    write_json("quests.json", data)
    return {"status": "success", "quests": data["quests"]}

@app.post("/api/quests/{quest_id}/objectives/{obj_id}/toggle")
async def toggle_quest_objective(quest_id: str, obj_id: str):
    data = read_json("quests.json", {"quests": [], "rumors": []})
    if isinstance(data, list):
        data = {"quests": data, "rumors": []}

    target_quest = None
    target_obj = None
    for q in data.get("quests", []):
        if q.get("id") == quest_id:
            target_quest = q
            for obj in q.get("objectives", []):
                if obj.get("id") == obj_id:
                    target_obj = obj
                    obj["completed"] = not obj.get("completed", False)
                    break
            break

    if not target_obj:
        raise HTTPException(status_code=404, detail="Quest or Objective not found")

    all_done = all(obj.get("completed", False) for obj in target_quest.get("objectives", []))
    if all_done and len(target_quest.get("objectives", [])) > 0:
        target_quest["status"] = "Completed"

    write_json("quests.json", data)
    return {"status": "success", "quest": target_quest, "objective": target_obj}

@app.post("/api/rumors")
async def save_rumor(rumor: RumorItem):
    data = read_json("quests.json", {"quests": [], "rumors": []})
    if isinstance(data, list):
        data = {"quests": data, "rumors": []}
    rumors = data.get("rumors", [])
    r_dict = rumor.dict()
    if not r_dict.get("id"):
        r_dict["id"] = "rum-" + str(uuid.uuid4())[:8]

    updated = False
    for i, r in enumerate(rumors):
        if r.get("id") == r_dict["id"]:
            rumors[i] = r_dict
            updated = True
            break
    if not updated:
        rumors.insert(0, r_dict)

    data["rumors"] = rumors
    write_json("quests.json", data)
    return {"status": "success", "rumor": r_dict, "rumors": rumors}

@app.delete("/api/rumors/{rumor_id}")
async def delete_rumor(rumor_id: str):
    data = read_json("quests.json", {"quests": [], "rumors": []})
    if isinstance(data, list):
        data = {"quests": data, "rumors": []}
    data["rumors"] = [r for r in data.get("rumors", []) if r.get("id") != rumor_id]
    write_json("quests.json", data)
    return {"status": "success", "rumors": data["rumors"]}

# -------------------------------------------------------------
# SECRETS & CLUES ENGINE (LAZY DM PREP & DISCOVERY)
# -------------------------------------------------------------
@app.get("/api/secrets")
async def get_secrets():
    return read_json("secrets.json", [])

@app.post("/api/secrets")
async def save_secret(payload: SecretModel):
    secrets = read_json("secrets.json", [])
    sec_id = payload.id or f"sec-{uuid.uuid4().hex[:8]}"
    sec_dict = payload.dict()
    sec_dict["id"] = sec_id
    if not sec_dict.get("createdAt"):
        sec_dict["createdAt"] = time.time()
        
    existing_idx = next((i for i, s in enumerate(secrets) if s.get("id") == sec_id), None)
    if existing_idx is not None:
        secrets[existing_idx] = sec_dict
    else:
        secrets.insert(0, sec_dict)
        
    write_json("secrets.json", secrets)
    return {"status": "success", "secret": sec_dict, "secrets": secrets}

@app.delete("/api/secrets/{secret_id}")
async def delete_secret(secret_id: str):
    secrets = read_json("secrets.json", [])
    secrets = [s for s in secrets if s.get("id") != secret_id]
    write_json("secrets.json", secrets)
    return {"status": "success", "secrets": secrets}

@app.post("/api/secrets/{secret_id}/toggle")
async def toggle_secret_revealed(secret_id: str):
    secrets = read_json("secrets.json", [])
    secret = next((s for s in secrets if s.get("id") == secret_id), None)
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found")
        
    if secret.get("status") == "revealed":
        secret["status"] = "unrevealed"
        secret["revealedAt"] = None
    else:
        secret["status"] = "revealed"
        secret["revealedAt"] = time.time()
        
    write_json("secrets.json", secrets)
    return {"status": "success", "secret": secret, "secrets": secrets}

@app.post("/api/secrets/{secret_id}/to-rumor")
async def convert_secret_to_rumor(secret_id: str):
    secrets = read_json("secrets.json", [])
    secret = next((s for s in secrets if s.get("id") == secret_id), None)
    if not secret:
        raise HTTPException(status_code=404, detail="Secret not found")
        
    # Mark secret as revealed
    secret["status"] = "revealed"
    secret["revealedAt"] = time.time()
    write_json("secrets.json", secrets)
    
    # Add to quests.json rumors
    data = read_json("quests.json", {"quests": [], "rumors": []})
    if isinstance(data, list):
        data = {"quests": data, "rumors": []}
    rumors = data.get("rumors", [])
    
    rumor_dict = {
        "id": f"rum-{uuid.uuid4().hex[:8]}",
        "text": secret.get("text", ""),
        "source": secret.get("tiedNpc") or "Discovered Secret",
        "location": secret.get("tiedLocation") or "Campaign Discovery",
        "veracity": "True",
        "active": True
    }
    rumors.insert(0, rumor_dict)
    data["rumors"] = rumors
    write_json("quests.json", data)
    
    return {"status": "success", "secret": secret, "rumor": rumor_dict}

@app.post("/api/secrets/batch-template")
async def generate_secrets_batch_template():
    secrets = read_json("secrets.json", [])
    templates = [
        ("Plot", "A prominent faction is secretly preparing a midnight operation."),
        ("Lore", "An ancient magical relic is hidden beneath the foundations of the oldest building in town."),
        ("NPC", "A seemingly friendly merchant has a secret criminal alias and informant debt."),
        ("Location", "A hidden subterranean passageway bypasses the heavily guarded main entrance."),
        ("Danger", "An elite assassin or monster stalker has arrived in the settlement tracking the party.")
    ]
    new_items = []
    now = time.time()
    for cat, prompt in templates:
        item = {
            "id": f"sec-{uuid.uuid4().hex[:8]}",
            "text": prompt,
            "status": "unrevealed",
            "category": cat,
            "tiedLocation": "",
            "tiedNpc": "",
            "tiedFaction": "",
            "sessionNotes": "Prep note: customize this prompt for upcoming session.",
            "revealedAt": None,
            "createdAt": now
        }
        new_items.append(item)
    
    # Prepend new templates
    secrets = new_items + secrets
    write_json("secrets.json", secrets)
    return {"status": "success", "added": len(new_items), "secrets": secrets}

# -------------------------------------------------------------
# IN-WORLD HANDOUTS & LETTERS ENGINE
# -------------------------------------------------------------
@app.get("/api/handouts")
async def get_handouts():
    return read_json("handouts.json", [])

@app.get("/api/handouts/{handout_id}")
async def get_handout(handout_id: str):
    handouts = read_json("handouts.json", [])
    handout = next((h for h in handouts if h.get("id") == handout_id), None)
    if not handout:
        raise HTTPException(status_code=404, detail="Handout not found")
    return handout

@app.post("/api/handouts")
async def save_handout(payload: HandoutModel):
    handouts = read_json("handouts.json", [])
    h_id = payload.id or f"hnd-{uuid.uuid4().hex[:8]}"
    h_dict = payload.dict()
    h_dict["id"] = h_id
    now = time.time()
    if not h_dict.get("createdAt"):
        h_dict["createdAt"] = now
    h_dict["updatedAt"] = now

    existing_idx = next((i for i, h in enumerate(handouts) if h.get("id") == h_id), None)
    if existing_idx is not None:
        handouts[existing_idx] = h_dict
    else:
        handouts.insert(0, h_dict)

    write_json("handouts.json", handouts)
    return {"status": "success", "handout": h_dict, "handouts": handouts}

@app.delete("/api/handouts/{handout_id}")
async def delete_handout(handout_id: str):
    handouts = read_json("handouts.json", [])
    handouts = [h for h in handouts if h.get("id") != handout_id]
    write_json("handouts.json", handouts)
    return {"status": "success", "handouts": handouts}

@app.post("/api/handouts/{handout_id}/toggle-decipher")
async def toggle_handout_decipher(handout_id: str):
    handouts = read_json("handouts.json", [])
    handout = next((h for h in handouts if h.get("id") == handout_id), None)
    if not handout:
        raise HTTPException(status_code=404, detail="Handout not found")

    handout["isDeciphered"] = not handout.get("isDeciphered", False)
    handout["updatedAt"] = time.time()
    write_json("handouts.json", handouts)

    # If this handout is currently broadcast on the player screen, update live broadcast
    broadcast = read_json("broadcast.json", {})
    if broadcast.get("active") and broadcast.get("type") == "handout":
        b_handout = broadcast.get("handout")
        if b_handout and b_handout.get("id") == handout_id:
            broadcast["handout"] = handout
            write_json("broadcast.json", broadcast)

    return {"status": "success", "handout": handout, "handouts": handouts}

@app.post("/api/handouts/{handout_id}/broadcast")
async def broadcast_handout_endpoint(handout_id: str):
    handouts = read_json("handouts.json", [])
    handout = next((h for h in handouts if h.get("id") == handout_id), None)
    if not handout:
        raise HTTPException(status_code=404, detail="Handout not found")

    broadcast_data = {
        "active": True,
        "title": handout.get("title", "In-World Handout"),
        "subtitle": f"{handout.get('type', 'Letter').capitalize()} • {handout.get('author') or 'Unknown Author'}",
        "content": handout.get("content", ""),
        "type": "handout",
        "imageUrl": handout.get("imageUrl", ""),
        "handout": handout
    }
    write_json("broadcast.json", broadcast_data)
    return {"status": "success", "broadcast": broadcast_data}

@app.post("/api/handouts/batch-preset")
async def generate_handouts_batch_preset():
    presets = [
        {
            "id": f"hnd-preset-{uuid.uuid4().hex[:6]}",
            "title": "Intercepted Cultist Cypher",
            "type": "cipher",
            "theme": "burnt",
            "fontStyle": "chisel",
            "author": "The Pale Hand",
            "recipient": "Watcher at the Threshold",
            "dateString": "Night of the Shrouded Sun",
            "content": "The sacrificial relic was successfully unearthed from the ossuary. Assemble at the flooded watergate when the bells toll three. Bring the vial of wyrm blood.",
            "seal": "skull",
            "sealColor": "purple",
            "isCoded": True,
            "cipherType": "runic",
            "cipherShift": 4,
            "cipherHint": "Runic glyph transposition practiced by the sunken cult.",
            "investigationDC": 15,
            "isDeciphered": False,
            "bountyReward": "",
            "bountyCrimes": "",
            "tiedLocation": "Flooded Crypts of St. Jude",
            "tiedNpc": "Drake",
            "sessionNotes": "Found dropped near the broken crypt grating.",
            "status": "ready",
            "createdAt": time.time(),
            "updatedAt": time.time()
        },
        {
            "id": f"hnd-preset-{uuid.uuid4().hex[:6]}",
            "title": "Official Guild Promissory Note",
            "type": "letter",
            "theme": "parchment",
            "fontStyle": "cursive",
            "author": "Gilded Scales Consortium",
            "recipient": "Master Silas",
            "dateString": "Fourth of Marpenoth",
            "content": "To Silas the Scribe,\n\nWe acknowledge receipt of three crates of deep-mine salvage. Upon delivery to Warehouse Four, our factor will release the agreed sum of 300 silver ingots.\n\nAny interference by the Town Watch must be resolved through your established channels.\n\nSigned,\nConsortium Factor Vance",
            "seal": "scales",
            "sealColor": "gold",
            "isCoded": False,
            "cipherType": "none",
            "cipherShift": 0,
            "cipherHint": "",
            "investigationDC": 10,
            "isDeciphered": True,
            "bountyReward": "",
            "bountyCrimes": "",
            "tiedLocation": "Oakhaven Market Square",
            "tiedNpc": "Silas the Scribe",
            "sessionNotes": "Proof of Silas's commercial connection to the Gilded Consortium.",
            "status": "ready",
            "createdAt": time.time(),
            "updatedAt": time.time()
        }
    ]
    handouts = read_json("handouts.json", [])
    handouts = presets + handouts
    write_json("handouts.json", handouts)
    return {"status": "success", "added": len(presets), "handouts": handouts}

# -------------------------------------------------------------
# PHASE 4: PLAYER DISPLAY SCREEN & BROADCAST HANDOUTS
# -------------------------------------------------------------
@app.get("/api/player-state")
async def get_player_state():
    party = read_json("party.json", [])
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    time_weather = read_json("time_weather.json", {
        "day": 1, "hour": 9, "minute": 0,
        "weather": {"temperature": "Mild", "wind": "Calm", "precipitation": "Clear", "tacticalEffect": "None"},
        "moonPhase": "Waxing Crescent",
        "activeTimers": []
    })
    broadcast = read_json("broadcast.json", {
        "active": False,
        "title": "",
        "subtitle": "",
        "content": "",
        "type": "text",
        "imageUrl": ""
    })

    # Sanitize combatants for player screen (Hide exact HP and DM notes of monsters!)
    raw_combatants = combat.get("combatants", [])
    raw_turn_idx = combat.get("currentTurnIndex", 0)
    active_combatant = raw_combatants[raw_turn_idx] if (0 <= raw_turn_idx < len(raw_combatants)) else None
    active_is_hidden = False
    if active_combatant and (active_combatant.get("hidden") is True or active_combatant.get("visibleToPlayers") is False):
        active_is_hidden = True

    sanitized_combatants = []
    sanitized_turn_idx = 0

    for c in raw_combatants:
        # Hide unrevealed / stealth / fog-of-war creatures from the player screen!
        if c.get("hidden") is True or c.get("visibleToPlayers") is False:
            continue

        c_type = c.get("type", "monster")
        cur_hp = c.get("currentHp", 0)
        max_hp = c.get("maxHp", 1)

        if c_type == "pc":
            pc_match = next((p for p in party if p.get("id") == c.get("id") or p.get("name") == c.get("name")), {})
            sanitized_combatants.append({
                "id": c.get("id"),
                "name": c.get("name"),
                "type": "pc",
                "player": pc_match.get("player", ""),
                "classRole": pc_match.get("classRole", ""),
                "initiative": c.get("initiative", 0),
                "tieBreaker": c.get("tieBreaker", 0),
                "currentHp": cur_hp,
                "maxHp": max_hp,
                "tempHp": c.get("tempHp", 0),
                "heroicInspiration": pc_match.get("heroicInspiration", False),
                "conditions": c.get("conditions", []),
                "concentrating": c.get("concentrating", False)
            })
        else:
            if cur_hp <= 0:
                health_status = "Unconscious"
                status_color = "rose"
            elif cur_hp <= (max_hp // 2):
                health_status = "Bloodied"
                status_color = "amber"
            else:
                health_status = "Healthy"
                status_color = "emerald"

            sanitized_combatants.append({
                "id": c.get("id"),
                "name": c.get("name"),
                "type": c_type,
                "initiative": c.get("initiative", 0),
                "tieBreaker": c.get("tieBreaker", 0),
                "healthStatus": health_status,
                "statusColor": status_color,
                "conditions": c.get("conditions", []),
                "concentrating": c.get("concentrating", False)
            })

        if active_combatant and c.get("id") == active_combatant.get("id"):
            sanitized_turn_idx = len(sanitized_combatants) - 1

    hidden_active_spotlight = None
    if active_is_hidden and active_combatant:
        hidden_active_spotlight = {
            "id": "hidden-turn",
            "name": "Something in the Shadows...",
            "type": "hidden",
            "initiative": active_combatant.get("initiative", 0),
            "healthStatus": "Concealed",
            "statusColor": "amber",
            "conditions": [],
            "concentrating": False
        }

    return {
        "combat": {
            "inCombat": combat.get("inCombat", False),
            "round": combat.get("round", 1),
            "currentTurnIndex": sanitized_turn_idx,
            "activeIsHidden": active_is_hidden,
            "hiddenSpotlight": hidden_active_spotlight,
            "combatants": sanitized_combatants
        },
        "party": party,
        "timeWeather": time_weather,
        "broadcast": broadcast
    }

@app.get("/api/broadcast")
async def get_broadcast():
    return read_json("broadcast.json", {"active": False, "title": "", "subtitle": "", "content": "", "type": "text", "imageUrl": ""})

@app.post("/api/broadcast")
async def set_broadcast(payload: BroadcastPayload):
    b_dict = payload.dict()
    write_json("broadcast.json", b_dict)
    return {"status": "success", "broadcast": b_dict}

@app.post("/api/broadcast/dismiss")
async def dismiss_broadcast():
    b_dict = {"active": False, "title": "", "subtitle": "", "content": "", "type": "text", "imageUrl": ""}
    write_json("broadcast.json", b_dict)
    return {"status": "success", "broadcast": b_dict}

# -------------------------------------------------------------
# PHASE 4: OBSIDIAN MARKDOWN EXPORT & SNAPSHOT BACKUPS
# -------------------------------------------------------------
@app.get("/api/export/markdown")
async def export_campaign_markdown():
    party = read_json("party.json", [])
    roster = read_json("roster.json", [])
    locations = read_json("locations.json", [])
    factions = read_json("factions.json", [])
    quests_data = read_json("quests.json", {"quests": [], "rumors": []})
    quests = quests_data.get("quests", []) if isinstance(quests_data, dict) else quests_data
    rumors = quests_data.get("rumors", []) if isinstance(quests_data, dict) else []
    notes = read_json("session_notes.json", [])
    time_weather = read_json("time_weather.json", {"day": 1, "hour": 9, "minute": 0, "weather": {}, "moonPhase": ""})

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        # README.md
        readme = f"""# Arcane Ledger: Campaign Vault
Exported on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
System: D&D 5.5e (2024 Core Rules)

## In-Game Calendar & World Status
- **Current Day**: Day {time_weather.get('day', 1)}, {time_weather.get('hour', 9):02d}:{time_weather.get('minute', 0):02d}
- **Moon Phase**: {time_weather.get('moonPhase', 'Waxing Crescent')}
- **Active Weather**: {time_weather.get('weather', {}).get('precipitation', 'Clear')}, {time_weather.get('weather', {}).get('temperature', 'Mild')}

---
This vault contains organized markdown files designed for Obsidian or local markdown viewers.
"""
        zf.writestr("README.md", readme)

        # Party
        for pc in party:
            pc_name = pc.get("name", "Character").replace(" ", "_")
            pc_md = f"""---
name: "{pc.get('name')}"
player: "{pc.get('player', '')}"
species: "{pc.get('species', '')}"
class: "{pc.get('classRole', '')}"
level: {pc.get('level', 1)}
ac: {pc.get('ac', 10)}
max_hp: {pc.get('maxHp', 10)}
passive_perception: {pc.get('passivePerception', 10)}
heroic_inspiration: {pc.get('heroicInspiration', False)}
---

# {pc.get('name')}
**Player:** {pc.get('player', 'N/A')} | **Class:** {pc.get('classRole', 'Adventurer')} (Level {pc.get('level', 1)}) | **Species:** {pc.get('species', 'Human')}

## Core Vitals
- **Armor Class:** {pc.get('ac', 10)}
- **Hit Points:** {pc.get('currentHp', 10)} / {pc.get('maxHp', 10)} (Temp: {pc.get('tempHp', 0)})
- **Speed:** {pc.get('speed', 30)} ft.
- **Initiative Modifier:** {pc.get('initiativeMod', 0):+d}

## Senses & DC
- **Passive Perception:** {pc.get('passivePerception', 10)}
- **Passive Insight:** {pc.get('passiveInsight', 10)}
- **Passive Investigation:** {pc.get('passiveInvestigation', 10)}
- **Spell Save DC:** {pc.get('spellDc') or 'N/A'}

## Features & Notes
{pc.get('notes', 'None recorded.')}
"""
            zf.writestr(f"Party/{pc_name}.md", pc_md)

        # Session Notes
        notes_md = f"# Campaign Session Notes\n\n"
        for n in notes:
            tag = n.get("tag", "general")
            notes_md += f"- **[{n.get('timestamp')}]** `#{tag}` {n.get('text')}\n"
        zf.writestr("Sessions/Session_Notes.md", notes_md)

        # Locations
        for loc in locations:
            loc_filename = loc.get("name", "Location").replace(" ", "_").replace("/", "-")
            loc_md = f"""# {loc.get('name')}
**Type:** {loc.get('type')} | **Danger Level:** {loc.get('danger')}
**Tags:** {', '.join(loc.get('tags', []))}

## Summary
{loc.get('summary', '')}

## Atmosphere & Description
{loc.get('description', '')}

## Key Factions Present
{', '.join(loc.get('factions', [])) or 'None'}

## Notable NPCs
{', '.join(loc.get('notableNpcs', [])) or 'None'}

## DM Secrets & Hidden Discoveries
> [!WARNING] DM Secrets
> {loc.get('secrets', 'No hidden secrets recorded.')}
"""
            zf.writestr(f"World/Locations/{loc_filename}.md", loc_md)

        # Factions
        for fac in factions:
            fac_filename = fac.get("name", "Faction").replace(" ", "_")
            clocks_md = ""
            for clk in fac.get("clocks", []):
                clocks_md += f"- **{clk.get('title')}** ({clk.get('currentTicks')}/{clk.get('totalTicks')} ticks): {clk.get('outcome')}\n"
            fac_md = f"""# {fac.get('name')}
**Leader:** {fac.get('leader', 'Unknown')} | **Headquarters:** {fac.get('headquarters', 'Unknown')}
**Influence:** {fac.get('influence', 'Regional')} | **Party Standing:** {fac.get('reputation', 'Neutral')} ({fac.get('reputationScore', 0):+d})

## Goals & Agenda
{fac.get('goals', '')}

## Lore & Description
{fac.get('description', '')}

## Diplomatic Ties
- **Allies:** {', '.join(fac.get('allies', [])) or 'None'}
- **Rivals:** {', '.join(fac.get('rivals', [])) or 'None'}

## Active Tension Clocks
{clocks_md or 'No active clocks.'}
"""
            zf.writestr(f"World/Factions/{fac_filename}.md", fac_md)

        # Quests & Rumors
        quests_md = "# Campaign Quests\n\n"
        for q in quests:
            quests_md += f"## {q.get('title')} ({q.get('status', 'Active')})\n"
            if q.get('giver'): quests_md += f"- **Giver:** {q.get('giver')}\n"
            if q.get('location'): quests_md += f"- **Location:** {q.get('location')}\n"
            if q.get('reward'): quests_md += f"- **Reward:** {q.get('reward')}\n"
            quests_md += f"\n{q.get('summary', '')}\n\n### Objectives\n"
            for obj in q.get('objectives', []):
                mark = "x" if obj.get("completed") else " "
                quests_md += f"- [{mark}] {obj.get('text')}\n"
            quests_md += "\n---\n\n"
        zf.writestr("Quests/Quests.md", quests_md)

        rumors_md = "# Tavern Rumors & Clues\n\n"
        for r in rumors:
            rumors_md += f"- **\"{r.get('text')}\"**\n  - Source: {r.get('source', 'Unknown')} | Location: {r.get('location', 'Unknown')} | Veracity: `{r.get('veracity', 'Unverified')}`\n\n"
        zf.writestr("Quests/Rumors.md", rumors_md)

        # Roster NPCs
        roster_md = "# Arcane Ledger Roster NPCs\n\n"
        for npc in roster:
            roster_md += f"## {npc.get('name')} {npc.get('epithet', '')}\n"
            roster_md += f"**Species:** {npc.get('species')} | **Role:** {npc.get('role')} | **Location:** {npc.get('location')}\n"
            roster_md += f"- **Voice:** {npc.get('voice', '')}\n"
            roster_md += f"- **Personality:** {npc.get('personality', '')}\n"
            roster_md += f"- **Secret:** {npc.get('secret', '')}\n"
            roster_md += f"- **Stats:** {npc.get('statName', '')} ({npc.get('statAcHp', '')})\n\n---\n\n"
        zf.writestr("NPCs/Roster.md", roster_md)

    buf.seek(0)
    filename = f"arcane_ledger_vault_{datetime.now().strftime('%Y%m%d_%H%M')}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@app.get("/api/backup/snapshots")
async def list_snapshots():
    snapshots = []
    for f in sorted(BACKUPS_DIR.glob("*.json"), reverse=True):
        stat = f.stat()
        snapshots.append({
            "filename": f.name,
            "size": stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        })
    return {"snapshots": snapshots}

@app.post("/api/backup/create")
async def create_snapshot(payload: SnapshotCreate = None):
    label = (payload.label.strip() if payload and payload.label else "")
    clean_label = "".join(c for c in label if c.isalnum() or c in ("-", "_")).rstrip()
    if clean_label:
        clean_label = f"_{clean_label}"

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    snapshot_filename = f"snapshot_{timestamp}{clean_label}.json"

    all_data = {
        "timestamp": timestamp,
        "label": label,
        "party": read_json("party.json", []),
        "combat": read_json("combat.json", {}),
        "roster": read_json("roster.json", []),
        "world": read_json("world.json", {}),
        "rules": read_json("rules_2024.json", {}),
        "notes": read_json("session_notes.json", []),
        "timeWeather": read_json("time_weather.json", {}),
        "monsters": read_json("monsters.json", []),
        "locations": read_json("locations.json", []),
        "factions": read_json("factions.json", []),
        "quests": read_json("quests.json", {}),
        "broadcast": read_json("broadcast.json", {}),
        "audioLibrary": read_json("audio_library.json", []),
        "audioPresets": read_json("audio_presets.json", []),
        "spells": read_json("spells.json", []),
        "items": read_json("items.json", []),
        "encounters": read_json("encounters.json", []),
        "secrets": read_json("secrets.json", []),
        "handouts": read_json("handouts.json", []),
        "lighting": read_json("lighting.json", {})
    }

    file_path = BACKUPS_DIR / snapshot_filename
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(all_data, f, indent=2)

    return {"status": "success", "filename": snapshot_filename}

@app.post("/api/backup/restore")
async def restore_snapshot(payload: Dict[str, Any]):
    filename = payload.get("filename")
    if not filename:
        raise HTTPException(status_code=400, detail="Filename required")

    file_path = BACKUPS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Snapshot not found")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    if "party" in data: write_json("party.json", data["party"])
    if "combat" in data: write_json("combat.json", data["combat"])
    if "roster" in data: write_json("roster.json", data["roster"])
    if "world" in data: write_json("world.json", data["world"])
    if "rules" in data: write_json("rules_2024.json", data["rules"])
    if "notes" in data: write_json("session_notes.json", data["notes"])
    if "timeWeather" in data: write_json("time_weather.json", data["timeWeather"])
    if "monsters" in data: write_json("monsters.json", data["monsters"])
    if "locations" in data: write_json("locations.json", data["locations"])
    if "factions" in data: write_json("factions.json", data["factions"])
    if "quests" in data: write_json("quests.json", data["quests"])
    if "secrets" in data: write_json("secrets.json", data["secrets"])
    if "handouts" in data: write_json("handouts.json", data["handouts"])
    if "broadcast" in data: write_json("broadcast.json", data["broadcast"])
    if "audioLibrary" in data: write_json("audio_library.json", data["audioLibrary"])
    if "audioPresets" in data: write_json("audio_presets.json", data["audioPresets"])
    if "spells" in data: write_json("spells.json", data["spells"])
    if "items" in data: write_json("items.json", data["items"])
    if "encounters" in data: write_json("encounters.json", data["encounters"])
    if "lighting" in data: write_json("lighting.json", data["lighting"])

    return {"status": "success", "restored": filename}

# Audio Library & Presets Management
@app.get("/api/audio/library")
async def get_audio_library():
    return read_json("audio_library.json", [])

@app.post("/api/audio/track")
async def save_audio_track(track: Dict[str, Any]):
    library = read_json("audio_library.json", [])
    if not track.get("id"):
        track["id"] = f"track-{uuid.uuid4().hex[:8]}"
    existing = next((i for i, t in enumerate(library) if t.get("id") == track["id"]), None)
    if existing is not None:
        library[existing] = track
    else:
        library.append(track)
    write_json("audio_library.json", library)
    return {"status": "success", "track": track, "library": library}

@app.delete("/api/audio/track/{track_id}")
async def delete_audio_track(track_id: str):
    library = read_json("audio_library.json", [])
    library = [t for t in library if t.get("id") != track_id]
    write_json("audio_library.json", library)
    return {"status": "success", "library": library}

@app.get("/api/audio/presets")
async def get_audio_presets():
    return read_json("audio_presets.json", [])

@app.post("/api/audio/presets")
async def save_audio_presets(presets: List[Dict[str, Any]]):
    write_json("audio_presets.json", presets)
    return {"status": "success", "presets": presets}

@app.post("/api/audio/upload")
async def upload_audio_file(file: UploadFile = File(...)):
    filename = file.filename
    clean_name = "".join(c for c in filename if c.isalnum() or c in (".", "-", "_")).strip()
    if not clean_name:
        clean_name = f"audio_{uuid.uuid4().hex[:6]}.mp3"
    dest = AUDIO_DIR / clean_name
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    url = f"/static/audio/{clean_name}"
    track = {
        "id": f"track-{uuid.uuid4().hex[:8]}",
        "name": Path(clean_name).stem.replace("_", " ").replace("-", " ").title(),
        "category": "Custom",
        "icon": "🎵",
        "url": url,
        "volume": 0.7,
        "active": False
    }
    library = read_json("audio_library.json", [])
    library.append(track)
    write_json("audio_library.json", library)
    return {"status": "success", "url": url, "track": track, "library": library}

@app.post("/api/images/upload")
async def upload_image_file(file: UploadFile = File(...)):
    filename = file.filename
    clean_name = "".join(c for c in filename if c.isalnum() or c in (".", "-", "_")).strip()
    if not clean_name:
        clean_name = f"art_{uuid.uuid4().hex[:6]}.png"
    dest = IMAGES_DIR / clean_name
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {"status": "success", "url": f"/static/images/{clean_name}"}

# -----------------------------------------------------------------------------
# SPELLS (2024 COMPENDIUM)
# -----------------------------------------------------------------------------
@app.get("/api/spells")
async def get_spells():
    return read_json("spells.json", [])

@app.get("/api/spells/{spell_id}")
async def get_spell(spell_id: str):
    spells = read_json("spells.json", [])
    spell = next((s for s in spells if s.get("id") == spell_id), None)
    if not spell:
        raise HTTPException(status_code=404, detail="Spell not found")
    return spell

# -----------------------------------------------------------------------------
# ITEMS & EQUIPMENT (2024 / 5E SRD & CUSTOM HOMEBREW)
# -----------------------------------------------------------------------------
@app.get("/api/items")
async def get_items():
    return read_json("items.json", [])

@app.get("/api/items/{item_id}")
async def get_item(item_id: str):
    items = read_json("items.json", [])
    item = next((i for i in items if i.get("id") == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@app.post("/api/items")
async def save_item(payload: ItemModel):
    items = read_json("items.json", [])
    item_id = payload.id or f"custom_{uuid.uuid4().hex[:8]}"
    item_dict = payload.dict()
    item_dict["id"] = item_id
    if item_dict.get("isCustom") is None:
        item_dict["isCustom"] = True
    
    existing_idx = next((idx for idx, i in enumerate(items) if i.get("id") == item_id), None)
    if existing_idx is not None:
        items[existing_idx] = item_dict
    else:
        # Prepend new custom items so they appear at the top
        items.insert(0, item_dict)
        
    write_json("items.json", items)
    return {"status": "success", "item": item_dict}

@app.delete("/api/items/{item_id}")
async def delete_item(item_id: str):
    items = read_json("items.json", [])
    items = [i for i in items if i.get("id") != item_id]
    write_json("items.json", items)
    return {"status": "success", "deleted": item_id}

# -----------------------------------------------------------------------------
# ENCOUNTERS (2024 BUILDER & CALCULATOR)
# -----------------------------------------------------------------------------
@app.get("/api/encounters")
async def get_encounters():
    return read_json("encounters.json", [])

@app.post("/api/encounters")
async def save_encounter(enc: Dict[str, Any]):
    encounters = read_json("encounters.json", [])
    if not enc.get("id"):
        enc["id"] = f"enc-{uuid.uuid4().hex[:8]}"
    existing = next((i for i, e in enumerate(encounters) if e.get("id") == enc["id"]), None)
    if existing is not None:
        encounters[existing] = enc
    else:
        encounters.append(enc)
    write_json("encounters.json", encounters)
    return {"status": "success", "encounter": enc, "encounters": encounters}

@app.delete("/api/encounters/{enc_id}")
async def delete_encounter(enc_id: str):
    encounters = read_json("encounters.json", [])
    encounters = [e for e in encounters if e.get("id") != enc_id]
    write_json("encounters.json", encounters)
    return {"status": "success", "encounters": encounters}

def get_monster_size_squares(size_str: str) -> float:
    s = (size_str or "").lower()
    if "gargantuan" in s:
        return 4.0
    elif "huge" in s:
        return 3.0
    elif "large" in s:
        return 2.0
    elif "tiny" in s:
        return 0.8
    return 1.0

@app.post("/api/encounters/{enc_id}/launch")
async def launch_encounter(enc_id: str):
    encounters = read_json("encounters.json", [])
    enc = next((e for e in encounters if e.get("id") == enc_id), None)
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")

    monsters_lib = read_json("monsters.json", [])
    combat = read_json("combat.json", {"inCombat": True, "round": 1, "currentTurnIndex": 0, "combatants": []})
    combat["inCombat"] = True

    bstate = read_json("battlemap.json", get_default_battlemap_state())
    existing_tokens = bstate.get("tokens", [])

    spawned_names = []
    new_combatants = []
    new_tokens = []
    token_index = 0
    base_x = 900.0
    base_y = 650.0

    for item in enc.get("monsters", []):
        m_id = item.get("id")
        count = int(item.get("count", 1))
        monster = next((m for m in monsters_lib if m.get("id") == m_id), None)
        if not monster:
            continue

        dex = monster.get("stats", {}).get("dex", 10)
        dex_mod = (dex - 10) // 2

        cr_val = float(monster.get("cr", 0) or 0)
        is_boss = cr_val >= 10 or ("dragon" in monster.get("name", "").lower() or "boss" in monster.get("name", "").lower())
        color = "#a855f7" if is_boss else "#ef4444"
        size_squares = get_monster_size_squares(monster.get("size", "Medium"))

        for i in range(count):
            init_val = float(random.randint(1, 20) + dex_mod)
            num_suffix = f" {i + 1}" if count > 1 else ""
            c_name = f"{monster.get('name', 'Monster')}{num_suffix}"
            c_id = f"mob-{m_id}-{int(time.time()*1000)}-{token_index}"
            img_url = monster.get("imageUrl") or f"/static/images/monsters/{m_id}.webp"
            hp = int(monster.get("hp", 10))

            new_combatant = {
                "id": c_id,
                "name": c_name,
                "type": "monster",
                "monsterId": m_id,
                "size": monster.get("size", "Medium"),
                "initiative": init_val,
                "tieBreaker": round(dex_mod + random.uniform(0.01, 0.99), 2),
                "currentHp": hp,
                "maxHp": hp,
                "tempHp": 0,
                "ac": int(monster.get("ac", 10)),
                "conditions": [],
                "concentrating": False,
                "hidden": True,
                "visibleToPlayers": False,
                "imageUrl": img_url,
                "notes": f"CR {monster.get('cr', '?')} | {monster.get('type', '')} | Spd: {monster.get('speed', '30 ft.')}"
            }
            new_combatants.append(new_combatant)
            spawned_names.append(c_name)

            # Corresponding battlemap token (hidden from player view!)
            col = token_index % 5
            row = token_index // 5
            token_x = base_x + col * 75.0
            token_y = base_y + row * 75.0

            new_token = {
                "id": f"token_{uuid.uuid4().hex[:8]}",
                "name": c_name,
                "monsterId": m_id,
                "combatantId": c_id,
                "size": monster.get("size", "Medium"),
                "sizeSquares": size_squares,
                "x": token_x,
                "y": token_y,
                "imageUrl": img_url,
                "currentHp": hp,
                "maxHp": hp,
                "color": color,
                "visibleToPlayers": False
            }
            new_tokens.append(new_token)
            token_index += 1

    combat["combatants"].extend(new_combatants)
    combat["combatants"].sort(key=lambda c: (c.get("initiative", 0), c.get("tieBreaker", 0)), reverse=True)
    write_json("combat.json", combat)

    # Save battlemap tokens
    existing_tokens.extend(new_tokens)
    bstate["tokens"] = existing_tokens
    bstate["updatedAt"] = time.time()
    write_json("battlemap.json", bstate)

    return {
        "status": "success",
        "encounter": enc.get("name"),
        "spawned": len(new_combatants),
        "spawnedNames": spawned_names,
        "combat": combat,
        "tokens": new_tokens
    }

# -----------------------------------------------------------------------------
# LIGHTING & AMARAN DESKTOP INTEGRATION
# -----------------------------------------------------------------------------
def _send_amaran_raw(msg_type: str, args: Optional[Dict[str, Any]] = None, node_id: Optional[str] = None) -> Dict[str, Any]:
    try:
        s = socket.create_connection(('127.0.0.1', 12345), timeout=2.0)
        key = base64.b64encode(os.urandom(16)).decode('ascii')
        req = f'GET / HTTP/1.1\r\nHost: 127.0.0.1:12345\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'
        s.sendall(req.encode('ascii'))
        s.recv(2048)

        payload = {'version': 1, 'client_id': 'dnd_dashboard', 'type': msg_type}
        if node_id:
            payload['node_id'] = node_id
        if args is not None:
            payload['args'] = args

        data = json.dumps(payload).encode('utf-8')
        mask = os.urandom(4)
        frame = bytearray([0x81])
        if len(data) < 126:
            frame.append(0x80 | len(data))
        elif len(data) < 65536:
            frame.append(0x80 | 126)
            frame.extend(struct.pack('>H', len(data)))
        else:
            frame.append(0x80 | 127)
            frame.extend(struct.pack('>Q', len(data)))

        frame.extend(mask)
        frame.extend(bytearray(b ^ mask[i % 4] for i, b in enumerate(data)))
        s.sendall(frame)

        hdr = s.recv(2)
        if not hdr:
            s.close()
            return {'error': 'No response header from amaran Desktop'}
        length = hdr[1] & 0x7F
        if length == 126:
            length = struct.unpack('>H', s.recv(2))[0]
        elif length == 127:
            length = struct.unpack('>Q', s.recv(8))[0]

        buf = b''
        while len(buf) < length:
            chunk = s.recv(length - len(buf))
            if not chunk:
                break
            buf += chunk
        s.close()
        return json.loads(buf.decode('utf-8'))
    except Exception as e:
        return {'error': str(e)}

@app.get("/api/lighting")
async def get_lighting():
    return read_json("lighting.json", {
        "connected": False,
        "apiUrl": "ws://localhost:12345",
        "brightness": 65,
        "cct": 3200,
        "rgb": [255, 185, 110],
        "effect": "candle",
        "activePreset": "preset-tavern",
        "syncAudio": True,
        "diceTriggers": True
    })

@app.post("/api/lighting")
async def save_lighting(payload: Dict[str, Any]):
    current = read_json("lighting.json", {})
    current.update(payload)
    write_json("lighting.json", current)
    return {"status": "success", "lighting": current}

@app.get("/api/lighting/fixtures")
async def get_amaran_fixtures():
    resp = await asyncio.to_thread(_send_amaran_raw, "get_fixture_list")
    if "error" in resp:
        return {"connected": False, "fixtures": [], "error": resp["error"]}
    fixtures = resp.get("data", {}).get("data", [])
    return {"connected": True, "fixtures": fixtures}

@app.post("/api/lighting/command")
async def send_amaran_command_endpoint(payload: Dict[str, Any]):
    msg_type = payload.get("type", "")
    args = payload.get("args")
    node_id = payload.get("node_id")
    resp = await asyncio.to_thread(_send_amaran_raw, msg_type, args, node_id)
    return resp


# -----------------------------------------------------------------------------
# PARTY SPELL SLOTS & CLASS RESOURCES
# -----------------------------------------------------------------------------
@app.post("/api/party/{pc_id}/spell-slot")
async def update_pc_spell_slot(pc_id: str, payload: Dict[str, Any]):
    party = read_json("party.json", [])
    pc = next((p for p in party if p.get("id") == pc_id), None)
    if not pc:
        raise HTTPException(status_code=404, detail="PC not found")

    slots = pc.setdefault("spellSlots", {})
    lvl = str(payload.get("level"))
    if lvl not in slots:
        slots[lvl] = {"total": int(payload.get("total", 1)), "used": 0}

    if "used" in payload:
        slots[lvl]["used"] = max(0, min(slots[lvl]["total"], int(payload["used"])))
    elif "delta" in payload:
        slots[lvl]["used"] = max(0, min(slots[lvl]["total"], slots[lvl].get("used", 0) + int(payload["delta"])))

    write_json("party.json", party)
    return {"status": "success", "pc": pc}

@app.post("/api/party/{pc_id}/resource")
async def update_pc_resource(pc_id: str, payload: Dict[str, Any]):
    party = read_json("party.json", [])
    pc = next((p for p in party if p.get("id") == pc_id), None)
    if not pc:
        raise HTTPException(status_code=404, detail="PC not found")

    res_id = payload.get("id")
    res_list = pc.setdefault("resources", [])
    resource = next((r for r in res_list if r.get("id") == res_id or r.get("name") == payload.get("name")), None)
    if resource:
        if "used" in payload:
            resource["used"] = max(0, min(resource.get("total", 1), int(payload["used"])))
        elif "delta" in payload:
            resource["used"] = max(0, min(resource.get("total", 1), resource.get("used", 0) + int(payload["delta"])))

    write_json("party.json", party)
    return {"status": "success", "pc": pc}

# -----------------------------------------------------------------------------
# TABLETOP BATTLEMAP & FOG OF WAR (3RD SCREEN IN-TABLE TV)
# -----------------------------------------------------------------------------
def get_default_battlemap_state():
    return {
        "activeMapId": "dungeon_crypt",
        "activeMapUrl": "/static/images/battlemaps/dungeon_crypt.svg",
        "activeMapName": "Forgotten Dungeon Crypt",
        "gridSize": 50,
        "gridVisible": True,
        "gridColor": "rgba(255, 255, 255, 0.22)",
        "fogEnabled": True,
        "fogMask": None,
        "rotation": 0,
        "panX": 0,
        "panY": 0,
        "zoom": 1.0,
        "locked": False,
        "pings": [],
        "tokens": [],
        "templates": [],
        "activeRuler": None,
        "maps": [
            {
                "id": "dungeon_crypt",
                "name": "Forgotten Dungeon Crypt",
                "url": "/static/images/battlemaps/dungeon_crypt.svg",
                "width": 2000,
                "height": 1500,
                "defaultGridSize": 50
            },
            {
                "id": "forest_river",
                "name": "Whispering Woods & River Crossing",
                "url": "/static/images/battlemaps/forest_river.svg",
                "width": 2000,
                "height": 1500,
                "defaultGridSize": 50
            },
            {
                "id": "tavern_cellar",
                "name": "Smuggler's Tavern Cellar",
                "url": "/static/images/battlemaps/tavern_cellar.svg",
                "width": 2000,
                "height": 1500,
                "defaultGridSize": 50
            }
        ],
        "updatedAt": time.time()
    }

@app.get("/api/battlemap")
async def get_battlemap():
    state = read_json("battlemap.json", get_default_battlemap_state())
    now = time.time()
    if state and "pings" in state and isinstance(state["pings"], list):
        state["pings"] = [p for p in state["pings"] if now - p.get("timestamp", 0) < 10.0]

    # Include sanitized active combat turn for cinematic turn announcements on the player map
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    raw_combatants = combat.get("combatants", [])
    raw_turn_idx = combat.get("currentTurnIndex", 0)
    in_combat = combat.get("inCombat", False)

    active_combatant = raw_combatants[raw_turn_idx] if (0 <= raw_turn_idx < len(raw_combatants)) else None
    next_combatant = None
    if raw_combatants and len(raw_combatants) > 1:
        next_idx = (raw_turn_idx + 1) % len(raw_combatants)
        next_combatant = raw_combatants[next_idx]

    active_sanitized = None
    if active_combatant:
        is_hidden = active_combatant.get("hidden") is True or active_combatant.get("visibleToPlayers") is False
        if is_hidden:
            active_sanitized = {
                "id": "hidden-turn",
                "name": "Something in the Shadows...",
                "type": "hidden",
                "initiative": active_combatant.get("initiative", 0),
                "imageUrl": ""
            }
        else:
            active_sanitized = {
                "id": active_combatant.get("id"),
                "name": active_combatant.get("name"),
                "type": active_combatant.get("type", "monster"),
                "initiative": active_combatant.get("initiative", 0),
                "imageUrl": active_combatant.get("imageUrl", "")
            }

    next_sanitized = None
    if next_combatant:
        is_next_hidden = next_combatant.get("hidden") is True or next_combatant.get("visibleToPlayers") is False
        if is_next_hidden:
            next_sanitized = {"name": "Something in the Shadows...", "type": "hidden"}
        else:
            next_sanitized = {"name": next_combatant.get("name"), "type": next_combatant.get("type", "monster")}

    state["combat"] = {
        "inCombat": in_combat,
        "round": combat.get("round", 1),
        "turnIndex": raw_turn_idx,
        "active": active_sanitized,
        "next": next_sanitized
    }

    # Dynamically sync condition auras & concentration from combatants to tokens
    c_map = {c.get("id"): c for c in raw_combatants if c.get("id")}
    for t in state.get("tokens", []):
        cid = t.get("combatantId")
        if cid and cid in c_map:
            c = c_map[cid]
            cond_list = []
            for cond in c.get("conditions", []):
                if isinstance(cond, dict):
                    cond_list.append(cond.get("name", ""))
                elif isinstance(cond, str):
                    cond_list.append(cond)
            t["conditions"] = cond_list
            t["concentrating"] = c.get("isConcentrating", False)
            if c.get("currentHp") is not None:
                t["currentHp"] = c.get("currentHp")
            if c.get("maxHp") is not None:
                t["maxHp"] = c.get("maxHp")

    return state

@app.post("/api/battlemap/state")
async def update_battlemap_state(update: BattlemapStateUpdate):
    state = read_json("battlemap.json", get_default_battlemap_state())
    update_dict = {k: v for k, v in update.dict().items() if v is not None}
    state.update(update_dict)
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "state": state}

@app.post("/api/battlemap/fog")
async def update_battlemap_fog(update: BattlemapFogUpdate):
    state = read_json("battlemap.json", get_default_battlemap_state())
    if update.reset:
        state["fogMask"] = None
    elif update.revealAll:
        state["fogMask"] = "REVEALED_ALL"
    elif update.fogMask is not None:
        state["fogMask"] = update.fogMask
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "updatedAt": state["updatedAt"]}

@app.post("/api/battlemap/ping")
async def create_battlemap_ping(ping: BattlemapPing):
    state = read_json("battlemap.json", get_default_battlemap_state())
    pings = state.get("pings", [])
    now = time.time()
    new_ping = {
        "id": str(uuid.uuid4()),
        "x": ping.x,
        "y": ping.y,
        "color": ping.color or "#f59e0b",
        "timestamp": now
    }
    pings = [p for p in pings if now - p.get("timestamp", 0) < 10.0]
    pings.append(new_ping)
    state["pings"] = pings
    state["updatedAt"] = now
    write_json("battlemap.json", state)
    return {"status": "success", "ping": new_ping}

@app.post("/api/battlemap/ruler")
async def update_battlemap_ruler(payload: Dict[str, Any]):
    state = read_json("battlemap.json", get_default_battlemap_state())
    active = payload.get("active", True)
    if not active:
        state["activeRuler"] = None
    else:
        state["activeRuler"] = {
            "startX": payload.get("startX", 0.0),
            "startY": payload.get("startY", 0.0),
            "endX": payload.get("endX", 0.0),
            "endY": payload.get("endY", 0.0),
            "distanceFeet": payload.get("distanceFeet", 0.0),
            "distanceSquares": payload.get("distanceSquares", 0.0),
            "visibleToPlayers": payload.get("visibleToPlayers", True),
            "active": True
        }
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "ruler": state.get("activeRuler")}

@app.post("/api/battlemap/templates")
async def add_or_update_battlemap_template(payload: BattlemapTemplate):
    state = read_json("battlemap.json", get_default_battlemap_state())
    templates = state.get("templates", [])
    tpl_id = payload.id or f"tpl_{uuid.uuid4().hex[:8]}"
    existing = next((t for t in templates if t["id"] == tpl_id), None)
    
    tpl_data = {
        "id": tpl_id,
        "type": payload.type or "circle",
        "x": payload.x,
        "y": payload.y,
        "radiusFeet": payload.radiusFeet or 20.0,
        "lengthFeet": payload.lengthFeet or 60.0,
        "widthFeet": payload.widthFeet or 5.0,
        "rotation": payload.rotation or 0.0,
        "color": payload.color or "#f97316",
        "label": payload.label or "Spell AoE",
        "visibleToPlayers": payload.visibleToPlayers if payload.visibleToPlayers is not None else True
    }
    
    if existing:
        existing.update(tpl_data)
    else:
        templates.append(tpl_data)
        
    state["templates"] = templates
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "template": tpl_data, "templates": templates}

@app.delete("/api/battlemap/templates/{template_id}")
async def delete_battlemap_template(template_id: str):
    state = read_json("battlemap.json", get_default_battlemap_state())
    templates = state.get("templates", [])
    state["templates"] = [t for t in templates if t["id"] != template_id]
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "templates": state["templates"]}

@app.post("/api/battlemap/templates/clear")
async def clear_battlemap_templates():
    state = read_json("battlemap.json", get_default_battlemap_state())
    state["templates"] = []
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "templates": []}

@app.post("/api/battlemap/select")
async def select_battlemap(payload: BattlemapSelect):
    state = read_json("battlemap.json", get_default_battlemap_state())
    maps = state.get("maps", [])
    selected = next((m for m in maps if m["id"] == payload.mapId), None)
    if not selected:
        raise HTTPException(status_code=404, detail="Map not found")
    state["activeMapId"] = selected["id"]
    state["activeMapUrl"] = selected["url"]
    state["activeMapName"] = selected["name"]
    if "defaultGridSize" in selected:
        state["gridSize"] = selected["defaultGridSize"]
    state["fogMask"] = None
    state["panX"] = 0
    state["panY"] = 0
    state["zoom"] = 1.0
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "state": state}

@app.post("/api/battlemap/upload")
async def upload_battlemap_file(file: UploadFile = File(...)):
    filename = file.filename
    clean_name = "".join(c for c in filename if c.isalnum() or c in (".", "-", "_")).strip()
    if not clean_name:
        clean_name = f"map_{uuid.uuid4().hex[:6]}.png"
    dest = STATIC_DIR / "images" / "battlemaps" / clean_name
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    map_url = f"/static/images/battlemaps/{clean_name}"
    map_name = Path(filename).stem.replace("_", " ").replace("-", " ").title()
    map_id = f"map_{uuid.uuid4().hex[:8]}"

    state = read_json("battlemap.json", get_default_battlemap_state())
    maps = state.get("maps", [])
    new_map = {
        "id": map_id,
        "name": map_name,
        "url": map_url,
        "width": 2000,
        "height": 1500,
        "defaultGridSize": 50
    }
    maps.append(new_map)
    state["maps"] = maps
    state["activeMapId"] = map_id
    state["activeMapUrl"] = map_url
    state["activeMapName"] = map_name
    state["fogMask"] = None
    state["panX"] = 0
    state["panY"] = 0
    state["zoom"] = 1.0
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)

    return {"status": "success", "map": new_map, "state": state}

# Token Endpoints
@app.post("/api/battlemap/tokens")
async def add_battlemap_token(payload: BattlemapTokenCreate):
    state = read_json("battlemap.json", get_default_battlemap_state())
    tokens = state.get("tokens", [])
    token_id = payload.id or f"token_{uuid.uuid4().hex[:8]}"
    
    # Default position: center of map with small offset if multiple exist
    x = payload.x if payload.x is not None else (1000.0 + (len(tokens) % 5) * 60)
    y = payload.y if payload.y is not None else (750.0 + (len(tokens) // 5) * 60)

    new_token = {
        "id": token_id,
        "name": payload.name,
        "monsterId": payload.monsterId or "",
        "combatantId": payload.combatantId or "",
        "size": payload.size or "Medium",
        "sizeSquares": payload.sizeSquares or 1.0,
        "x": x,
        "y": y,
        "imageUrl": payload.imageUrl or "",
        "currentHp": payload.currentHp if payload.currentHp is not None else 10,
        "maxHp": payload.maxHp if payload.maxHp is not None else 10,
        "color": payload.color or "#ef4444",
        "visibleToPlayers": payload.visibleToPlayers if payload.visibleToPlayers is not None else True,
        "elevation": payload.elevation if payload.elevation is not None else 0,
        "conditions": payload.conditions or [],
        "concentrating": payload.concentrating or False,
        "strideActive": payload.strideActive or False
    }
    tokens.append(new_token)
    state["tokens"] = tokens
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "token": new_token, "tokens": tokens}

@app.post("/api/battlemap/tokens/batch")
async def add_battlemap_tokens_batch(payload: BattlemapTokenBatchCreate):
    state = read_json("battlemap.json", get_default_battlemap_state())
    tokens = state.get("tokens", [])
    added_tokens = []

    for t_payload in payload.tokens:
        token_id = t_payload.id or f"token_{uuid.uuid4().hex[:8]}"
        x = t_payload.x if t_payload.x is not None else (1000.0 + (len(tokens) % 5) * 60)
        y = t_payload.y if t_payload.y is not None else (750.0 + (len(tokens) // 5) * 60)

        new_token = {
            "id": token_id,
            "name": t_payload.name,
            "monsterId": t_payload.monsterId or "",
            "combatantId": t_payload.combatantId or "",
            "size": t_payload.size or "Medium",
            "sizeSquares": t_payload.sizeSquares or 1.0,
            "x": x,
            "y": y,
            "imageUrl": t_payload.imageUrl or "",
            "currentHp": t_payload.currentHp if t_payload.currentHp is not None else 10,
            "maxHp": t_payload.maxHp if t_payload.maxHp is not None else 10,
            "color": t_payload.color or "#ef4444",
            "visibleToPlayers": t_payload.visibleToPlayers if t_payload.visibleToPlayers is not None else False,
            "elevation": t_payload.elevation if t_payload.elevation is not None else 0,
            "conditions": t_payload.conditions or [],
            "concentrating": t_payload.concentrating or False,
            "strideActive": t_payload.strideActive or False
        }
        tokens.append(new_token)
        added_tokens.append(new_token)

    state["tokens"] = tokens
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "tokens": tokens, "added": added_tokens}

@app.post("/api/battlemap/tokens/move")
async def move_battlemap_token(payload: BattlemapTokenMove):
    state = read_json("battlemap.json", get_default_battlemap_state())
    tokens = state.get("tokens", [])
    token = next((t for t in tokens if t["id"] == payload.id), None)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    token["x"] = payload.x
    token["y"] = payload.y
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "token": token}

@app.post("/api/battlemap/tokens/update")
async def update_battlemap_token(payload: BattlemapTokenUpdate):
    state = read_json("battlemap.json", get_default_battlemap_state())
    tokens = state.get("tokens", [])
    token = next((t for t in tokens if t["id"] == payload.id), None)
    if not token:
        raise HTTPException(status_code=404, detail="Token not found")
    if payload.name is not None: token["name"] = payload.name
    if payload.currentHp is not None: token["currentHp"] = payload.currentHp
    if payload.maxHp is not None: token["maxHp"] = payload.maxHp
    if payload.visibleToPlayers is not None: token["visibleToPlayers"] = payload.visibleToPlayers
    if payload.color is not None: token["color"] = payload.color
    if payload.x is not None: token["x"] = payload.x
    if payload.y is not None: token["y"] = payload.y
    if payload.elevation is not None: token["elevation"] = payload.elevation
    if payload.conditions is not None: token["conditions"] = payload.conditions
    if payload.concentrating is not None: token["concentrating"] = payload.concentrating
    if payload.strideActive is not None: token["strideActive"] = payload.strideActive
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "token": token}

@app.delete("/api/battlemap/tokens/{token_id}")
async def delete_battlemap_token(token_id: str):
    state = read_json("battlemap.json", get_default_battlemap_state())
    tokens = state.get("tokens", [])
    tokens = [t for t in tokens if t["id"] != token_id]
    state["tokens"] = tokens
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "tokens": tokens}

@app.post("/api/battlemap/tokens/clear")
async def clear_battlemap_tokens():
    state = read_json("battlemap.json", get_default_battlemap_state())
    state["tokens"] = []
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "tokens": []}

if __name__ == "__main__":
    print("\n=======================================================")
    print("  ARCANE LEDGER - D&D 5.5e (2024) DM DASHBOARD")
    print("  Open your browser to: http://127.0.0.1:8000")
    print("=======================================================\n")
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
