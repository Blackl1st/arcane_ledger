import asyncio
import base64
import io
import json
import os
import random
import secrets
import shutil
import socket
import struct
import sys
import time
import uuid
import zipfile
import zlib
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
import uvicorn
from fastapi import FastAPI, HTTPException, Request, File, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from map_generator import ProceduralMapGenerator, get_random_title
import updater
import ddb_importer
import cos_module_pack
import audio_importer

# Resource & Data Directory Resolution (Handles Live Dev & PyInstaller Frozen App)
if getattr(sys, "frozen", False):
    RESOURCE_DIR = Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))
    if sys.platform == "darwin":
        # On macOS, store writable user data in ~/Documents/ArcaneLedger to avoid bundle write restrictions
        BASE_DIR = Path.home() / "Documents" / "ArcaneLedger"
    else:
        BASE_DIR = Path(sys.executable).resolve().parent
else:
    RESOURCE_DIR = Path(__file__).resolve().parent
    BASE_DIR = RESOURCE_DIR

try:
    BASE_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass

DATA_DIR = BASE_DIR / "data"
STATIC_DIR = RESOURCE_DIR / "static"
TEMPLATES_DIR = RESOURCE_DIR / "templates"
BACKUPS_DIR = DATA_DIR / "backups"
AUDIO_DIR = STATIC_DIR / "audio"
IMAGES_DIR = STATIC_DIR / "images"
BATTLEMAPS_DIR = IMAGES_DIR / "battlemaps"
CAMPAIGNS_DIR = DATA_DIR / "campaigns"
CAMPAIGNS_MANIFEST_FILE = DATA_DIR / "campaigns.json"
BATTLEMAPS_CATALOG_FILE = DATA_DIR / "battlemaps_catalog.json"
SECURITY_FILE = DATA_DIR / "security.json"
UPLOADS_DIR = DATA_DIR / "uploads"

for d in [DATA_DIR, BACKUPS_DIR, CAMPAIGNS_DIR, UPLOADS_DIR]:
    try:
        d.mkdir(parents=True, exist_ok=True)
    except Exception as _e:
        print(f"Warning: could not create writable directory {d}: {_e}")

# Read-only resource dirs: attempt creation only if not already present
for d in [STATIC_DIR, TEMPLATES_DIR, AUDIO_DIR, IMAGES_DIR, BATTLEMAPS_DIR]:
    try:
        d.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

# -------------------------------------------------------------
# BUNDLED SRD COMPENDIUM SEEDING & AUTO-HEALING
# -------------------------------------------------------------
SRD_COMPENDIUM_FILES = {
    "monsters.json",
    "spells.json",
    "items.json",
    "rules_2024.json",
    "audio_library.json",
    "audio_presets.json",
    "battlemaps_catalog.json"
}

def get_bundled_data_dir() -> Optional[Path]:
    """Find the directory containing the bundled reference datasets (monsters, spells, items, rules, etc.)."""
    candidates = []
    if getattr(sys, "frozen", False):
        if hasattr(sys, "_MEIPASS"):
            candidates.append(Path(sys._MEIPASS) / "data")
        candidates.append(Path(sys.executable).resolve().parent / "data")
        candidates.append(Path(sys.executable).resolve().parent.parent / "Resources" / "data")
    candidates.append(RESOURCE_DIR / "data")
    candidates.append(Path(__file__).resolve().parent / "data")

    for c in candidates:
        try:
            if c and c.is_dir() and (c / "monsters.json").exists() and (c / "monsters.json").stat().st_size > 1000:
                return c
        except Exception:
            continue
    return None

def seed_and_repair_data_directory():
    """Ensure that DATA_DIR contains all bundled files, and auto-repair any empty/corrupted SRD datasets."""
    bundled_data = get_bundled_data_dir()
    if not bundled_data or not bundled_data.is_dir():
        return
    if bundled_data.resolve() == DATA_DIR.resolve():
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Seed any completely missing files or directories
    try:
        for item in bundled_data.iterdir():
            dest = DATA_DIR / item.name
            if not dest.exists():
                try:
                    if item.is_dir():
                        shutil.copytree(item, dest)
                    else:
                        shutil.copy2(item, dest)
                    print(f"[DATA INIT] Seeded missing {item.name} from bundle.")
                except Exception as e:
                    print(f"[DATA INIT] Error seeding {item.name}: {e}")
    except Exception as e:
        print(f"[DATA INIT] Error scanning bundled data: {e}")

    # 2. Repair any core SRD files that exist but are empty or wiped (e.g. <= 100 bytes or empty list/dict)
    for filename in SRD_COMPENDIUM_FILES:
        target = DATA_DIR / filename
        source = bundled_data / filename
        if not source.exists():
            continue

        needs_restore = False
        if not target.exists():
            needs_restore = True
        else:
            try:
                size = target.stat().st_size
                if size < 100:
                    needs_restore = True
                else:
                    with open(target, "r", encoding="utf-8") as f:
                        content = json.load(f)
                    if isinstance(content, (list, dict)) and len(content) == 0:
                        needs_restore = True
            except Exception:
                needs_restore = True

        if needs_restore:
            try:
                shutil.copy2(source, target)
                print(f"[DATA REPAIR] Restored SRD compendium {filename} from bundle.")
            except Exception as e:
                print(f"[DATA REPAIR] Failed to restore {filename}: {e}")

    # 3. Ensure default campaign has default files if missing
    default_camp = DATA_DIR / "campaigns" / "default"
    bundled_default_camp = bundled_data / "campaigns" / "default"
    if bundled_default_camp.exists() and default_camp.exists():
        for item in bundled_default_camp.iterdir():
            dest = default_camp / item.name
            if not dest.exists() or dest.stat().st_size < 10:
                try:
                    shutil.copy2(item, dest)
                except Exception:
                    pass

# Run initial seeding and repair
seed_and_repair_data_directory()

# -------------------------------------------------------------
# SECURITY & LOCAL NETWORK ACCESS CONTROLS
# -------------------------------------------------------------
def get_security_config() -> Dict[str, Any]:
    default_cfg = {
        "pinEnabled": True,
        "pin": "1234",
        "localhostBypass": True,
        "sessionDurationHours": 48
    }
    if not SECURITY_FILE.exists():
        try:
            with open(SECURITY_FILE, "w", encoding="utf-8") as f:
                json.dump(default_cfg, f, indent=2)
        except Exception as e:
            print(f"Error creating security.json: {e}")
        return default_cfg
    try:
        with open(SECURITY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            for k, v in default_cfg.items():
                if k not in data:
                    data[k] = v
            return data
    except Exception as e:
        print(f"Error reading security.json: {e}")
        return default_cfg

def save_security_config(cfg: Dict[str, Any]) -> bool:
    temp_path = DATA_DIR / "security.json.tmp"
    try:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2)
        temp_path.replace(SECURITY_FILE)
        return True
    except Exception as e:
        print(f"Error saving security.json: {e}")
        if temp_path.exists():
            temp_path.unlink()
        return False

def get_local_lan_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return "127.0.0.1"

# In-memory registry of active authenticated DM sessions
ACTIVE_DM_SESSIONS: Dict[str, Dict[str, Any]] = {}

def clean_expired_sessions():
    now = time.time()
    expired = [t for t, s in ACTIVE_DM_SESSIONS.items() if s.get("expires_at", 0) < now]
    for t in expired:
        ACTIVE_DM_SESSIONS.pop(t, None)

def is_request_localhost(request: Request) -> bool:
    client_host = request.client.host if request.client else "127.0.0.1"
    return client_host in ("127.0.0.1", "::1", "localhost", "testclient")

def is_dm_authenticated(request: Request) -> bool:
    cfg = get_security_config()
    if not cfg.get("pinEnabled", True):
        return True
        
    if cfg.get("localhostBypass", True) and is_request_localhost(request):
        return True
        
    token = request.cookies.get("arcane_dm_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
            
    if token and token in ACTIVE_DM_SESSIONS:
        session = ACTIVE_DM_SESSIONS[token]
        if time.time() < session.get("expires_at", 0):
            return True
        else:
            ACTIVE_DM_SESSIONS.pop(token, None)
            
    return False

app = FastAPI(title="Arcane Ledger: D&D 5.5e DM Dashboard", version=updater.CURRENT_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def dm_security_middleware(request: Request, call_next):
    path = request.url.path
    
    # Static files, uploads, and favicon are always open
    if path.startswith("/static") or path.startswith("/uploads") or path == "/favicon.ico":
        return await call_next(request)
        
    # Public endpoints needed by players, tabletop TV displays, and authentication
    PUBLIC_PATHS = {
        "/player",
        "/map",
        "/companion",
        "/api/player-state",
        "/api/battlemap",
        "/api/auth/login",
        "/api/auth/status",
        "/api/auth/logout",
        "/api/auth/qr-code"
    }
    
    if path in PUBLIC_PATHS or path.startswith("/api/companion") or path.startswith("/api/streamdeck"):
        return await call_next(request)
        
    # If DM is authenticated (or localhost auto-bypass active), allow access
    if is_dm_authenticated(request):
        return await call_next(request)
        
    # Unauthenticated handling:
    # 1. Main DM Dashboard (GET /): serve DM Lock Screen
    if path == "/" and request.method == "GET":
        lock_file = TEMPLATES_DIR / "dm_lock.html"
        if lock_file.exists():
            return FileResponse(str(lock_file), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
            
    # 2. Protected API calls: return 401 Unauthorized
    if path.startswith("/api/"):
        return JSONResponse(
            status_code=401,
            content={
                "status": "error",
                "error": "unauthorized",
                "message": "DM Passcode required to access this console endpoint."
            }
        )
        
    # Any other unauthenticated page route redirects to lock screen
    lock_file = TEMPLATES_DIR / "dm_lock.html"
    if lock_file.exists():
        return FileResponse(str(lock_file), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
        
    return await call_next(request)

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
app.include_router(updater.router)

# Campaign Scoped vs Global Compendium routing
CAMPAIGN_SCOPED_FILES = {
    "party.json",
    "combat.json",
    "time_weather.json",
    "quests.json",
    "factions.json",
    "locations.json",
    "secrets.json",
    "handouts.json",
    "roster.json",
    "battlemap.json",
    "broadcast.json",
    "encounters.json",
    "session_notes.json",
    "world.json",
    "overworld.json",
    "pantheon.json",
    "timeline.json",
    "faction_relations.json",
    "party_stash.json",
    "travel.json",
    "tarokka.json",
    "dungeons.json",
    "dungeons_meta.json",
}

DEFAULT_MODULES = {
    "combat": True,
    "battlemap": True,
    "bestiary": True,
    "encounters": True,
    "spells": True,
    "items": True,
    "rules": True,
    "world": True,
    "overworld": True,
    "locations": True,
    "factions": True,
    "quests": True,
    "pantheon": True,
    "timeline": True,
    "travel": True,
    "secrets": True,
    "handouts": True,
    "npcs": True,
    "loot": True,
    "notes": True,
    "audio": True
}

PLAYSTYLE_PRESETS = {
    "full": {
        "id": "full",
        "name": "Full Tabletop Immersion",
        "description": "All modules enabled: Tactical Battlemap, Smart Lighting, Audio, Compendiums, Combat Tracker, and World Lore & Exploration.",
        "modules": {
            "combat": True, "battlemap": True, "bestiary": True, "encounters": True,
            "spells": True, "items": True, "rules": True, "world": True,
            "overworld": True, "locations": True, "factions": True, "quests": True,
            "pantheon": True, "timeline": True, "travel": True, "secrets": True, "handouts": True,
            "npcs": True, "loot": True, "notes": True, "audio": True
        }
    },
    "theater": {
        "id": "theater",
        "name": "Theater of the Mind",
        "description": "Streamlined for descriptive roleplay: Battlemap grid disabled. Keeps Combat tracker, Bestiary, Lore, Spells, Items, Audio, and Notes.",
        "modules": {
            "combat": True, "battlemap": False, "bestiary": True, "encounters": True,
            "spells": True, "items": True, "rules": True, "world": True,
            "overworld": True, "locations": True, "factions": True, "quests": True,
            "pantheon": True, "timeline": True, "travel": True, "secrets": True, "handouts": True,
            "npcs": True, "loot": True, "notes": True, "audio": True
        }
    },
    "prep": {
        "id": "prep",
        "name": "Worldbuilder & Prep",
        "description": "Tailored for session planning: World lore, Secrets, Handouts, Compendiums, NPCs, and Notes enabled. Live Combat tracker and Battlemap disabled.",
        "modules": {
            "combat": False, "battlemap": False, "bestiary": True, "encounters": True,
            "spells": True, "items": True, "rules": True, "world": True,
            "overworld": True, "locations": True, "factions": True, "quests": True,
            "pantheon": True, "timeline": True, "travel": True, "secrets": True, "handouts": True,
            "npcs": True, "loot": True, "notes": True, "audio": False
        }
    },
    "minimal": {
        "id": "minimal",
        "name": "Minimalist DM",
        "description": "Clean, focused, distraction-free screen: Combat tracker, Party status, Scratchpad notes, and 2024 Rules Engine only.",
        "modules": {
            "combat": True, "battlemap": False, "bestiary": False, "encounters": False,
            "spells": False, "items": False, "rules": True, "world": False,
            "overworld": False, "locations": False, "factions": False, "quests": False,
            "pantheon": False, "timeline": False, "travel": False, "secrets": False, "handouts": False,
            "npcs": False, "loot": False, "notes": True, "audio": False
        }
    }
}

def get_campaigns_manifest() -> Dict[str, Any]:
    if not CAMPAIGNS_MANIFEST_FILE.exists():
        ensure_campaigns_system()
    try:
        with open(CAMPAIGNS_MANIFEST_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error reading campaigns manifest: {e}")
        return {
            "activeCampaignId": "default",
            "campaigns": [
                {
                    "id": "default",
                    "name": "Default Campaign",
                    "description": "Primary adventuring party and world state",
                    "createdAt": datetime.now().isoformat(),
                    "lastPlayed": datetime.now().isoformat(),
                    "preset": "full",
                    "modules": dict(DEFAULT_MODULES)
                }
            ]
        }

def save_campaigns_manifest(data: Dict[str, Any]) -> bool:
    temp_path = DATA_DIR / "campaigns.json.tmp"
    try:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        temp_path.replace(CAMPAIGNS_MANIFEST_FILE)
        return True
    except Exception as e:
        print(f"Error saving campaigns manifest: {e}")
        if temp_path.exists():
            temp_path.unlink()
        return False

def get_active_campaign_id() -> str:
    manifest = get_campaigns_manifest()
    return manifest.get("activeCampaignId", "default")

def get_active_campaign_dir() -> Path:
    camp_id = get_active_campaign_id()
    camp_dir = CAMPAIGNS_DIR / camp_id
    camp_dir.mkdir(parents=True, exist_ok=True)
    return camp_dir

def check_and_upgrade_cos_campaign(camp_dir: Path, camp_obj: Dict[str, Any]):
    try:
        is_cos = (
            camp_obj.get("template") == "curse_of_strahd" or
            "strahd" in camp_obj.get("name", "").lower() or
            "strahd" in camp_obj.get("description", "").lower()
        )
        if is_cos:
            # Upgrade Roster if incomplete
            roster_path = camp_dir / "roster.json"
            if roster_path.exists():
                try:
                    with open(roster_path, "r", encoding="utf-8") as f:
                        curr_roster = json.load(f)
                    if len(curr_roster) < 30 or any("statName" not in n for n in curr_roster[:5]):
                        with open(roster_path, "w", encoding="utf-8") as f:
                            json.dump(cos_module_pack.get_cos_roster(), f, indent=2, ensure_ascii=False)
                except Exception:
                    pass

            # Upgrade Encounters if incomplete or old format
            enc_path = camp_dir / "encounters.json"
            if enc_path.exists():
                try:
                    with open(enc_path, "r", encoding="utf-8") as f:
                        curr_encs = json.load(f)
                    if len(curr_encs) < 30 or any("monsterId" not in m for e in curr_encs for m in e.get("monsters", [])[:1]):
                        with open(enc_path, "w", encoding="utf-8") as f:
                            json.dump(cos_module_pack.get_cos_encounters(), f, indent=2, ensure_ascii=False)
                except Exception:
                    pass

            # Fix Handouts so Kolyan's plea is not prematurely delivered
            hnd_path = camp_dir / "handouts.json"
            if hnd_path.exists():
                try:
                    with open(hnd_path, "r", encoding="utf-8") as f:
                        curr_hnds = json.load(f)
                    hnd_updated = False
                    for h in curr_hnds:
                        if h.get("id") == "hnd-cos-indirovich-plea" and h.get("isDelivered") is True:
                            h["isDelivered"] = False
                            h["status"] = "ready"
                            h.pop("deliveredAt", None)
                            hnd_updated = True
                    if hnd_updated:
                        with open(hnd_path, "w", encoding="utf-8") as f:
                            json.dump(curr_hnds, f, indent=2, ensure_ascii=False)
                except Exception:
                    pass

            # Upgrade Overworld to Barovia Regional Map if incomplete or default
            ow_path = camp_dir / "overworld.json"
            try:
                upgrade_ow = False
                if not ow_path.exists() or ow_path.stat().st_size < 100:
                    upgrade_ow = True
                else:
                    with open(ow_path, "r", encoding="utf-8") as f:
                        curr_ow = json.load(f)
                    if not isinstance(curr_ow, dict) or "shattered" in curr_ow.get("mapTitle", "").lower() or len(curr_ow.get("pins", [])) < 8 or curr_ow.get("mapUrl") != "/static/images/barovia_map.webp":
                        upgrade_ow = True
                if upgrade_ow:
                    with open(ow_path, "w", encoding="utf-8") as f:
                        json.dump(cos_module_pack.get_cos_barovia_overworld(), f, indent=2, ensure_ascii=False)
            except Exception as e:
                print(f"Error upgrading Barovia overworld: {e}")

            # Upgrade Dungeons if missing
            dung_path = camp_dir / "dungeons.json"
            dung_meta_path = camp_dir / "dungeons_meta.json"
            try:
                if not dung_path.exists() or dung_path.stat().st_size < 100:
                    with open(dung_path, "w", encoding="utf-8") as f:
                        json.dump(cos_module_pack.get_cos_dungeons(), f, indent=2, ensure_ascii=False)
                if not dung_meta_path.exists():
                    with open(dung_meta_path, "w", encoding="utf-8") as f:
                        json.dump({"activeDungeonId": "dungeon-ravenloft"}, f, indent=2, ensure_ascii=False)
            except Exception as e:
                print(f"Error upgrading CoS dungeons: {e}")

        # Auto-heal spell slots in party.json for Paladins/Rangers
        for party_path in [camp_dir / "party.json", DATA_DIR / "party.json"]:
            if party_path.exists():
                try:
                    with open(party_path, "r", encoding="utf-8") as f:
                        party = json.load(f)
                    party_updated = False
                    for pc in party:
                        role = (pc.get("classRole") or "").lower()
                        lvl = int(pc.get("level") or 1)
                        if ("paladin" in role or "ranger" in role) and lvl >= 5:
                            slots = pc.setdefault("spellSlots", {})
                            if "level_2" not in slots or slots["level_2"].get("total", 0) < 2:
                                slots["level_1"] = {"total": 4, "used": slots.get("level_1", {}).get("used", 0)}
                                slots["level_2"] = {"total": 2, "used": slots.get("level_2", {}).get("used", 0)}
                                party_updated = True
                    if party_updated:
                        with open(party_path, "w", encoding="utf-8") as f:
                            json.dump(party, f, indent=2, ensure_ascii=False)
                except Exception:
                    pass
    except Exception as e:
        print(f"Error checking/upgrading campaign data: {e}")

def is_active_campaign_cos() -> bool:
    try:
        manifest = get_campaigns_manifest()
        act_id = manifest.get("activeCampaignId", "default")
        camp = next((c for c in manifest.get("campaigns", []) if c.get("id") == act_id), None)
        if camp:
            mods = camp.get("modules", {})
            return (
                camp.get("template") == "curse_of_strahd" or
                mods.get("curse_of_strahd") is True or
                mods.get("cos") is True or
                "strahd" in camp.get("name", "").lower() or
                "strahd" in camp.get("description", "").lower() or
                camp.get("preset") == "curse_of_strahd"
            )
    except Exception:
        pass
    return False

def ensure_campaigns_system():
    CAMPAIGNS_DIR.mkdir(parents=True, exist_ok=True)
    default_dir = CAMPAIGNS_DIR / "default"
    default_dir.mkdir(parents=True, exist_ok=True)

    # Migrate any existing scoped files in DATA_DIR or bundled default campaign folder if they don't already exist
    bundled_data = get_bundled_data_dir()
    bundled_default = (bundled_data / "campaigns" / "default") if bundled_data else None
    for filename in CAMPAIGN_SCOPED_FILES:
        src = DATA_DIR / filename
        dst = default_dir / filename
        if src.exists() and not dst.exists():
            try:
                shutil.copy2(src, dst)
            except Exception as e:
                print(f"Error copying {filename} during migration: {e}")
        elif not dst.exists() and bundled_default and (bundled_default / filename).exists():
            try:
                shutil.copy2(bundled_default / filename, dst)
            except Exception:
                pass

    # Ensure all campaign profiles have an isolated timeline.json
    try:
        for c_dir in CAMPAIGNS_DIR.iterdir():
            if c_dir.is_dir():
                tl_file = c_dir / "timeline.json"
                if not tl_file.exists():
                    initial_tl = {
                        "eras": [
                            {"id": "mythic", "name": "The Ancient Mythic Age", "icon": "⚡", "badgeColor": "purple", "description": "The dawn of gods, primal dragons, and the shaping of the world."},
                            {"id": "cataclysm", "name": "The Ruin & Cataclysm", "icon": "🔥", "badgeColor": "rose", "description": "Planar cataclysm, shattered continents, and sunken kingdoms."},
                            {"id": "iron", "name": "The Century of Iron", "icon": "⚔️", "badgeColor": "amber", "description": "Rise of mortal empires, grand citadels, and mercantile guilds."},
                            {"id": "current", "name": "Current Campaign Arc", "icon": "🗡️", "badgeColor": "sky", "description": "Active campaign timeline and live party milestones."}
                        ],
                        "events": []
                    }
                    with open(tl_file, "w", encoding="utf-8") as f:
                        json.dump(initial_tl, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error ensuring timeline isolation: {e}")

    # Ensure all campaign profiles have isolated dungeons.json and dungeons_meta.json
    try:
        manifest_data = get_campaigns_manifest() if CAMPAIGNS_MANIFEST_FILE.exists() else {}
        campaign_list = manifest_data.get("campaigns", [])
        for c_dir in CAMPAIGNS_DIR.iterdir():
            if c_dir.is_dir():
                c_id = c_dir.name
                c_obj = next((c for c in campaign_list if c.get("id") == c_id), None)
                is_cos_camp = False
                if c_obj:
                    mods = c_obj.get("modules", {})
                    is_cos_camp = (
                        c_obj.get("template") == "curse_of_strahd" or
                        mods.get("curse_of_strahd") is True or
                        mods.get("cos") is True or
                        "strahd" in c_obj.get("name", "").lower() or
                        "strahd" in c_obj.get("description", "").lower() or
                        c_obj.get("preset") == "curse_of_strahd"
                    )
                dung_file = c_dir / "dungeons.json"
                dung_meta_file = c_dir / "dungeons_meta.json"
                if not dung_file.exists():
                    init_dungeons = cos_module_pack.get_cos_dungeons() if is_cos_camp else []
                    with open(dung_file, "w", encoding="utf-8") as f:
                        json.dump(init_dungeons, f, indent=2, ensure_ascii=False)
                if not dung_meta_file.exists():
                    init_meta = {"activeDungeonId": "dungeon-ravenloft"} if is_cos_camp else {"activeDungeonId": None}
                    with open(dung_meta_file, "w", encoding="utf-8") as f:
                        json.dump(init_meta, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Error ensuring dungeons isolation in campaigns: {e}")

    # Ensure manifest exists
    if not CAMPAIGNS_MANIFEST_FILE.exists():
        now_str = datetime.now().isoformat()
        manifest = {
            "activeCampaignId": "default",
            "campaigns": [
                {
                    "id": "default",
                    "name": "Default Campaign",
                    "description": "Primary adventuring party and world state",
                    "createdAt": now_str,
                    "lastPlayed": now_str,
                    "preset": "full",
                    "modules": dict(DEFAULT_MODULES)
                }
            ]
        }
        save_campaigns_manifest(manifest)

    try:
        manifest = get_campaigns_manifest()
        act_id = manifest.get("activeCampaignId", "default")
        act_camp = next((c for c in manifest.get("campaigns", []) if c.get("id") == act_id), None)
        if act_camp:
            check_and_upgrade_cos_campaign(CAMPAIGNS_DIR / act_id, act_camp)
    except Exception:
        pass

# Initialize on module import
ensure_campaigns_system()

def get_file_path(filename: str) -> Path:
    if filename in CAMPAIGN_SCOPED_FILES:
        camp_dir = get_active_campaign_dir()
        return camp_dir / filename
    return DATA_DIR / filename

def read_json(filename: str, default: Any = None) -> Any:
    file_path = get_file_path(filename)
    bundled_data = get_bundled_data_dir()
    bundled_file = (bundled_data / filename) if (bundled_data and (bundled_data / filename).exists()) else None

    if not file_path.exists():
        if bundled_file and bundled_file.exists():
            try:
                with open(bundled_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                write_json(filename, data)
                return data
            except Exception as e:
                print(f"Error reading bundled copy of {filename}: {e}")

        if default is not None:
            write_json(filename, default)
            return default
        return None

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Self-heal SRD compendiums if loaded as empty list/dict
        if filename in SRD_COMPENDIUM_FILES and (not data or len(data) == 0) and bundled_file:
            try:
                with open(bundled_file, "r", encoding="utf-8") as bf:
                    restored = json.load(bf)
                if restored and len(restored) > 0:
                    write_json(filename, restored)
                    return restored
            except Exception as be:
                print(f"Error self-healing {filename}: {be}")

        return data
    except Exception as e:
        print(f"Error reading {filename} ({file_path}): {e}")
        if bundled_file and bundled_file.exists():
            try:
                with open(bundled_file, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
        return default

def write_json(filename: str, data: Any) -> bool:
    file_path = get_file_path(filename)
    parent_dir = file_path.parent
    parent_dir.mkdir(parents=True, exist_ok=True)
    temp_path = parent_dir / f"{filename}.tmp"
    try:
        with open(temp_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        temp_path.replace(file_path)
        return True
    except Exception as e:
        print(f"Error writing {filename} ({file_path}): {e}")
        if temp_path.exists():
            temp_path.unlink()
        return False

# Audio Importer & Downloader Engine
audio_worker = audio_importer.AudioDownloadWorker(DATA_DIR, UPLOADS_DIR, read_json, write_json)

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
    spellSlots: Optional[Dict[str, Any]] = None
    resources: Optional[List[Dict[str, Any]]] = None
    inventory: Optional[List[Dict[str, Any]]] = None
    currency: Optional[Dict[str, int]] = None
    maxCarryWeight: Optional[int] = 150
    deityId: Optional[str] = ""
    deityName: Optional[str] = ""
    pietyScore: Optional[int] = 1
    avatarUrl: Optional[str] = ""
    ddbId: Optional[str] = ""
    ddbUrl: Optional[str] = ""

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
    population: Optional[str] = ""
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
    targetHeroId: Optional[str] = "all"  # "all" or character ID
    targetHeroName: Optional[str] = "All Party"
    secretWhisper: Optional[str] = ""
    isDelivered: bool = False
    deliveredAt: Optional[float] = None
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
    overworld: Optional[Dict[str, Any]] = None
    deity: Optional[Dict[str, Any]] = None

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
    companionAccessEnabled: Optional[bool] = None
    focusWorldX: Optional[float] = None
    focusWorldY: Optional[float] = None
    syncId: Optional[float] = None

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
    mapId: Optional[str] = None

class BattlemapPing(BaseModel):
    x: float
    y: float
    color: Optional[str] = "#f59e0b"

class BattlemapSelect(BaseModel):
    mapId: str

class BattlemapGenerateRequest(BaseModel):
    theme: str = "dungeon" # dungeon, cavern, forest, tavern, arcane, ruins
    title: Optional[str] = None
    widthSquares: int = 40
    heightSquares: int = 30
    gridSize: int = 50
    layout: str = "multi_room"
    lighting: str = "torchlit"
    hasWater: bool = False
    hasPillars: bool = True
    seed: Optional[int] = None
    deployImmediately: bool = True

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

class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = ""
    preset: Optional[str] = "full"
    template: Optional[str] = "blank"  # "blank" or "clone_active"
    modules: Optional[Dict[str, bool]] = None

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    preset: Optional[str] = None
    modules: Optional[Dict[str, bool]] = None

class LoginRequest(BaseModel):
    pin: str
    remember: bool = True

class UpdateSecurityRequest(BaseModel):
    pinEnabled: Optional[bool] = None
    newPin: Optional[str] = None
    currentPin: Optional[str] = None
    localhostBypass: Optional[bool] = None

# Routes
@app.get("/")
async def root(request: Request):
    if not is_dm_authenticated(request):
        lock_file = TEMPLATES_DIR / "dm_lock.html"
        if lock_file.exists():
            return FileResponse(str(lock_file), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    index_file = TEMPLATES_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    return {"message": "Arcane Ledger 5.5e DM Dashboard backend is running"}

@app.post("/api/auth/login")
async def auth_login(payload: LoginRequest, request: Request):
    clean_expired_sessions()
    cfg = get_security_config()
    configured_pin = str(cfg.get("pin", "1234")).strip()
    submitted_pin = str(payload.pin).strip()
    
    if submitted_pin != configured_pin:
        raise HTTPException(status_code=401, detail="Incorrect DM Passcode")
        
    token = secrets.token_hex(24)
    duration_hours = int(cfg.get("sessionDurationHours", 48)) if payload.remember else 12
    expires_at = time.time() + (duration_hours * 3600)
    
    client_ip = request.client.host if request.client else "unknown"
    ACTIVE_DM_SESSIONS[token] = {
        "created_at": time.time(),
        "expires_at": expires_at,
        "ip": client_ip
    }
    
    response = JSONResponse(content={
        "status": "success",
        "authenticated": True,
        "token": token,
        "expiresAt": expires_at
    })
    response.set_cookie(
        key="arcane_dm_token",
        value=token,
        max_age=duration_hours * 3600,
        httponly=True,
        samesite="lax",
        path="/"
    )
    return response

@app.post("/api/auth/logout")
async def auth_logout(request: Request):
    token = request.cookies.get("arcane_dm_token")
    if token:
        ACTIVE_DM_SESSIONS.pop(token, None)
    response = JSONResponse(content={"status": "success", "authenticated": False})
    response.delete_cookie("arcane_dm_token", path="/")
    return response

@app.get("/api/auth/status")
async def auth_status(request: Request):
    clean_expired_sessions()
    cfg = get_security_config()
    is_authed = is_dm_authenticated(request)
    is_local = is_request_localhost(request)
    lan_ip = get_local_lan_ip()
    
    return {
        "pinEnabled": cfg.get("pinEnabled", True),
        "localhostBypass": cfg.get("localhostBypass", True),
        "authenticated": is_authed,
        "isLocalhost": is_local,
        "lanIp": lan_ip,
        "playerUrl": f"http://{lan_ip}:8000/player",
        "companionUrl": f"http://{lan_ip}:8000/companion",
        "mapUrl": f"http://{lan_ip}:8000/map"
    }

@app.get("/api/auth/qr-code")
async def get_player_qr_code(view: str = "companion"):
    lan_ip = get_local_lan_ip()
    target_path = "player" if view == "player" else "companion"
    target_url = f"http://{lan_ip}:8000/{target_path}"
    try:
        import qrcode
        import qrcode.image.svg
        factory = qrcode.image.svg.SvgPathImage
        img = qrcode.make(target_url, image_factory=factory)
        buf = io.BytesIO()
        img.save(buf)
        svg_content = buf.getvalue().decode("utf-8")
        return {"status": "success", "url": target_url, "view": target_path, "svg": svg_content}
    except Exception as e:
        return {"status": "error", "url": target_url, "view": target_path, "error": str(e), "svg": None}

@app.post("/api/auth/update-settings")
async def update_security_settings(payload: UpdateSecurityRequest, request: Request):
    if not is_dm_authenticated(request):
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    cfg = get_security_config()
    
    if payload.newPin is not None:
        new_pin_clean = str(payload.newPin).strip()
        if len(new_pin_clean) < 4:
            raise HTTPException(status_code=400, detail="PIN must be at least 4 digits")
            
        current_pin_cfg = str(cfg.get("pin", "1234")).strip()
        if not is_request_localhost(request):
            if not payload.currentPin or str(payload.currentPin).strip() != current_pin_cfg:
                raise HTTPException(status_code=400, detail="Current PIN is required and must match")
                
        cfg["pin"] = new_pin_clean
        
    if payload.pinEnabled is not None:
        cfg["pinEnabled"] = bool(payload.pinEnabled)
        
    if payload.localhostBypass is not None:
        cfg["localhostBypass"] = bool(payload.localhostBypass)
        
    save_security_config(cfg)
    return {"status": "success", "security": cfg}

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

# In-memory registry of recent table rolls (broadcast from DM and player companions)
RECENT_TABLE_ROLLS: List[Dict[str, Any]] = []

@app.get("/companion")
async def companion_view():
    comp_file = TEMPLATES_DIR / "companion.html"
    if comp_file.exists():
        return FileResponse(str(comp_file), headers={"Cache-Control": "no-cache, no-store, must-revalidate"})
    return {"message": "Player companion template not found"}

@app.get("/api/companion/state")
async def get_companion_state(heroId: Optional[str] = None):
    party = read_json("party.json", [])
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    broadcast = read_json("broadcast.json", {"active": False, "title": "", "content": "", "type": "text"})
    handouts = read_json("handouts.json", [])
    last_rest = read_json("last_rest.json", None)
    manifest = get_campaigns_manifest()
    active_id = manifest.get("activeCampaignId", "default")
    active_camp = next((c for c in manifest.get("campaigns", []) if c.get("id") == active_id), None)
    camp_name = active_camp.get("name", "Active Campaign") if active_camp else "Active Campaign"

    # Filter handouts delivered to this hero or whole party
    delivered_handouts = []
    for h in handouts:
        is_deliv = h.get("isDelivered") or h.get("status") == "delivered" or h.get("isUnlocked") or h.get("unlocked")
        if not is_deliv:
            continue
        target = h.get("targetHeroId", "all")
        if not target or target == "all":
            delivered_handouts.append(h)
        elif heroId and target == heroId:
            delivered_handouts.append(h)

    tarokka_data = read_json("tarokka.json", None)
    revealed_tarokka = tarokka_data if (tarokka_data and (tarokka_data.get("broadcasted") is True or tarokka_data.get("isDelivered") is True)) else None

    b_state = read_json("battlemap.json", get_default_battlemap_state())
    has_map_access = bool(b_state.get("companionAccessEnabled", False))

    return {
        "status": "success",
        "campaignName": camp_name,
        "party": party,
        "combat": combat,
        "broadcast": broadcast,
        "handouts": delivered_handouts,
        "lastRest": last_rest,
        "tarokka": revealed_tarokka,
        "battlemapAccess": has_map_access,
        "recentRolls": sorted([r for r in RECENT_TABLE_ROLLS if not r.get("isDM", False)], key=lambda r: r.get("timestamp", 0), reverse=True)[:15]
    }

@app.post("/api/companion/update-hp")
async def update_companion_hp(payload: Dict[str, Any]):
    pc_id = payload.get("id")
    party = read_json("party.json", [])
    pc = next((p for p in party if p.get("id") == pc_id), None)
    if not pc:
        raise HTTPException(status_code=404, detail="Character not found")

    if "currentHp" in payload and payload["currentHp"] is not None:
        pc["currentHp"] = max(0, min(int(payload["currentHp"]), int(pc.get("maxHp", 999))))
    if "tempHp" in payload and payload["tempHp"] is not None:
        pc["tempHp"] = max(0, int(payload["tempHp"]))
    if "deathSaves" in payload and payload["deathSaves"] is not None:
        pc["deathSaves"] = payload["deathSaves"]
    if "heroicInspiration" in payload and payload["heroicInspiration"] is not None:
        pc["heroicInspiration"] = bool(payload["heroicInspiration"])

    write_json("party.json", party)

    # Automatically synchronize matching combatant in combat.json
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    combat_updated = False
    for cb in combat.get("combatants", []):
        if cb.get("sourceId") == pc_id or cb.get("id") == f"combat-{pc_id}":
            if "currentHp" in payload and payload["currentHp"] is not None:
                cb["currentHp"] = pc["currentHp"]
            if "tempHp" in payload and payload["tempHp"] is not None:
                cb["tempHp"] = pc["tempHp"]
            combat_updated = True
    if combat_updated:
        write_json("combat.json", combat)

    try:
        await streamdeck_manager.broadcast({
            "event": "party_updated",
            "character": pc,
            "party": party
        })
    except Exception:
        pass

    return {"status": "success", "character": pc}

@app.post("/api/companion/update-slots")
async def update_companion_slots(payload: Dict[str, Any]):
    pc_id = payload.get("id")
    party = read_json("party.json", [])
    pc = next((p for p in party if p.get("id") == pc_id), None)
    if not pc:
        raise HTTPException(status_code=404, detail="Character not found")

    if "spellSlots" in payload:
        pc["spellSlots"] = payload["spellSlots"]
    if "resources" in payload:
        pc["resources"] = payload["resources"]

    write_json("party.json", party)
    try:
        await streamdeck_manager.broadcast({
            "event": "party_updated",
            "character": pc,
            "party": party
        })
    except Exception:
        pass
    return {"status": "success", "spellSlots": pc.get("spellSlots"), "resources": pc.get("resources")}

@app.post("/api/companion/add-spell")
async def add_companion_spell(payload: Dict[str, Any]):
    pc_id = payload.get("id") or payload.get("characterId")
    party = read_json("party.json", [])
    pc = next((p for p in party if p.get("id") == pc_id), None)
    if not pc:
        raise HTTPException(status_code=404, detail="Character not found")

    spell = payload.get("spell")
    if not spell or not isinstance(spell, dict) or not spell.get("name"):
        raise HTTPException(status_code=400, detail="Invalid spell data")

    if "spells" not in pc or not isinstance(pc["spells"], list):
        pc["spells"] = []

    existing = next((s for s in pc["spells"] if s.get("name", "").lower() == spell["name"].lower()), None)
    if not existing:
        if "id" not in spell:
            spell["id"] = f"spl-{uuid.uuid4().hex[:8]}"
        pc["spells"].append(spell)

    write_json("party.json", party)
    try:
        await streamdeck_manager.broadcast({
            "event": "party_updated",
            "character": pc,
            "party": party
        })
    except Exception:
        pass
    return {"status": "success", "spells": pc["spells"], "character": pc}

@app.post("/api/companion/roll")
async def record_companion_roll(payload: Dict[str, Any]):
    roll_id = payload.get("id") or f"roll-{uuid.uuid4().hex[:8]}"
    raw_val = payload.get("rawRoll", payload.get("chosen", payload.get("total", 0)))
    total_val = payload.get("total", raw_val)
    dice_list = payload.get("dice", [raw_val] if isinstance(raw_val, (int, float)) else (raw_val if isinstance(raw_val, list) else []))
    label_val = payload.get("label", payload.get("rollType", "d20 Check"))
    roll_entry = {
        "id": roll_id,
        "source": payload.get("source", "companion"),
        "timestamp": time.time(),
        "timeStr": datetime.now().strftime("%H:%M:%S"),
        "characterId": payload.get("characterId", ""),
        "characterName": payload.get("characterName", "Adventurer"),
        "player": payload.get("player", ""),
        "avatarUrl": payload.get("avatarUrl", ""),
        "rollType": label_val,
        "label": label_val,
        "formula": payload.get("formula", "1d20"),
        "dice": dice_list,
        "rawRoll": raw_val,
        "modifier": payload.get("modifier", 0),
        "total": total_val,
        "isCrit": payload.get("isCrit", False),
        "isFumble": payload.get("isFumble", False),
        "isDM": False
    }
    RECENT_TABLE_ROLLS.append(roll_entry)
    if len(RECENT_TABLE_ROLLS) > 100:
        del RECENT_TABLE_ROLLS[0]

    # Broadcast live cinematic player roll to all screens
    try:
        await streamdeck_manager.broadcast({
            "event": "player_roll",
            **roll_entry,
            "id": roll_id,
            "roll": roll_entry,
            "entry": roll_entry,
            "total": total_val,
            "rawRoll": raw_val,
            "isPlayer": True,
            "isDM": False
        })
    except Exception:
        pass

    return {"status": "success", "roll": roll_entry}

@app.get("/api/companion/rolls")
async def get_companion_rolls():
    rolls = [r for r in RECENT_TABLE_ROLLS if not r.get("isDM", False)]
    return {"status": "success", "rolls": sorted(rolls, key=lambda r: r.get("timestamp", 0), reverse=True)[:25]}

@app.post("/api/rolls/record")
async def record_generic_roll(payload: Dict[str, Any]):
    is_dm = bool(payload.get("isDM", True))
    raw_val = payload.get("rawRoll", payload.get("chosen", payload.get("total", 20)))
    total_val = payload.get("total", raw_val)
    dice_type = payload.get("diceType", "d20")
    sides_val = 20
    if isinstance(dice_type, str) and dice_type.lower().startswith("d"):
        try:
            sides_val = int(dice_type[1:])
        except ValueError:
            sides_val = 20

    roll_id = payload.get("id") or f"roll-{uuid.uuid4().hex[:8]}"
    source_val = payload.get("source", "dashboard" if is_dm else "companion")
    label_val = payload.get("label", payload.get("rollType", "Roll"))
    roll_entry = {
        "id": roll_id,
        "source": source_val,
        "timestamp": time.time(),
        "timeStr": datetime.now().strftime("%H:%M:%S"),
        "characterId": payload.get("characterId", "dm" if is_dm else ""),
        "characterName": payload.get("characterName", "Dungeon Master" if is_dm else "Player"),
        "player": payload.get("player", "DM" if is_dm else ""),
        "avatarUrl": payload.get("avatarUrl", ""),
        "rollType": label_val,
        "label": label_val,
        "formula": payload.get("formula", ""),
        "dice": payload.get("dice", [raw_val] if isinstance(raw_val, (int, float)) else (raw_val if isinstance(raw_val, list) else [])),
        "rawRoll": raw_val,
        "modifier": payload.get("modifier", 0),
        "total": total_val,
        "isCrit": payload.get("isCrit", False),
        "isFumble": payload.get("isFumble", False),
        "isDM": is_dm
    }
    RECENT_TABLE_ROLLS.append(roll_entry)
    if len(RECENT_TABLE_ROLLS) > 100:
        del RECENT_TABLE_ROLLS[0]

    try:
        await streamdeck_manager.broadcast({
            "event": "dice_roll" if is_dm else "player_roll",
            **roll_entry,
            "id": roll_id,
            "source": source_val,
            "entry": roll_entry,
            "roll": total_val,
            "chosen": raw_val,
            "total": total_val,
            "sides": sides_val,
            "isPlayer": not is_dm,
            "isDM": is_dm
        })
    except Exception:
        pass

    return {"status": "success", "roll": roll_entry}

@app.get("/api/rolls/history")
async def get_rolls_history(player_only: bool = False):
    if player_only:
        rolls = [r for r in RECENT_TABLE_ROLLS if not r.get("isDM", False)]
    else:
        rolls = list(RECENT_TABLE_ROLLS)
    return {"status": "success", "rolls": sorted(rolls, key=lambda r: r.get("timestamp", 0), reverse=True)}

@app.post("/api/rolls/clear")
async def clear_rolls_history():
    RECENT_TABLE_ROLLS.clear()
    try:
        await streamdeck_manager.broadcast({"event": "rolls_cleared"})
    except Exception:
        pass
    return {"status": "success"}

@app.post("/api/companion/use-item")
async def use_companion_item(payload: Dict[str, Any]):
    pc_id = payload.get("characterId")
    item_id = payload.get("itemId")
    party = read_json("party.json", [])
    pc = next((p for p in party if p.get("id") == pc_id), None)
    if not pc:
        raise HTTPException(status_code=404, detail="Character not found")

    inventory = pc.get("inventory", [])
    item = next((it for it in inventory if it.get("id") == item_id or it.get("name") == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    msg = f"{pc.get('name')} used {item.get('name')}."
    heal_amount = 0

    item_name_lower = item.get("name", "").lower()
    if "potion of healing" in item_name_lower:
        d1 = random.randint(1, 4)
        d2 = random.randint(1, 4)
        heal_amount = d1 + d2 + 2
        prev_hp = pc.get("currentHp", 0)
        pc["currentHp"] = min(pc.get("maxHp", 999), prev_hp + heal_amount)
        msg = f"{pc.get('name')} drank a Potion of Healing and regained {heal_amount} HP! (2d4+2 = {d1}+{d2}+2)"
    elif "greater healing" in item_name_lower:
        d_rolls = [random.randint(1, 4) for _ in range(4)]
        heal_amount = sum(d_rolls) + 4
        prev_hp = pc.get("currentHp", 0)
        pc["currentHp"] = min(pc.get("maxHp", 999), prev_hp + heal_amount)
        msg = f"{pc.get('name')} drank a Potion of Greater Healing and regained {heal_amount} HP!"

    qty = item.get("qty", item.get("quantity", 1))
    if qty > 1:
        item["qty"] = qty - 1
        if "quantity" in item:
            item["quantity"] = qty - 1
    else:
        try:
            inventory.remove(item)
        except Exception:
            pass

    write_json("party.json", party)

    if heal_amount > 0:
        combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
        for cb in combat.get("combatants", []):
            if cb.get("sourceId") == pc_id:
                cb["currentHp"] = pc["currentHp"]
        write_json("combat.json", combat)

    RECENT_TABLE_ROLLS.append({
        "id": f"roll-{uuid.uuid4().hex[:8]}",
        "timestamp": time.time(),
        "timeStr": datetime.now().strftime("%H:%M:%S"),
        "characterId": pc_id,
        "characterName": pc.get("name"),
        "player": pc.get("player"),
        "rollType": "Item Used",
        "formula": item.get("name"),
        "dice": [],
        "modifier": 0,
        "total": heal_amount,
        "message": msg,
        "isCrit": False,
        "isFumble": False
    })

    return {"status": "success", "message": msg, "healed": heal_amount, "character": pc}

# =============================================================================
# =============================================================================
# STREAM DECK & HARDWARE MACRO REAL-TIME CONTROLLER & WEBSOCKET BUS
# =============================================================================

class StreamDeckConnectionManager:
    """Manages active WebSockets for browser DM Dashboards and Elgato Stream Deck plugins."""
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        dead_connections = []
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.append(connection)
        for dc in dead_connections:
            self.disconnect(dc)

streamdeck_manager = StreamDeckConnectionManager()

def ensure_streamdeck_plugin_bundle() -> Optional[Path]:
    plugin_zip = STATIC_DIR / "streamdeck" / "com.arcaneledger.streamdeck.streamDeckPlugin"
    if not plugin_zip.exists():
        try:
            from tools.build_streamdeck_plugin import main as build_plugin
            build_plugin()
        except Exception as e:
            print(f"Could not build stream deck plugin on demand: {e}")
    return plugin_zip if plugin_zip.exists() else None

def ensure_streamdeck_profile_bundle() -> Optional[Path]:
    profile_path = STATIC_DIR / "streamdeck" / "ArcaneLedger_15Key.streamDeckProfile"
    if not profile_path.exists():
        try:
            from tools.build_streamdeck_plugin import main as build_plugin
            build_plugin()
        except Exception as e:
            print(f"Could not build stream deck profile on demand: {e}")
    return profile_path if profile_path.exists() else None

@app.websocket("/ws/streamdeck")
async def websocket_streamdeck_endpoint(websocket: WebSocket):
    await streamdeck_manager.connect(websocket)
    try:
        # Send initial synchronization state
        combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
        combatants = combat.get("combatants", [])
        idx = combat.get("currentTurnIndex", 0)
        active_name = combatants[idx]["name"] if combatants and idx < len(combatants) else "None"
        lighting = read_json("lighting.json", {})
        last_roll = RECENT_TABLE_ROLLS[-1] if RECENT_TABLE_ROLLS else None

        await websocket.send_json({
            "event": "sync_state",
            "combat": combat,
            "round": combat.get("round", 1),
            "turnIndex": idx,
            "activeCombatant": active_name,
            "inCombat": combat.get("inCombat", False),
            "lighting": lighting,
            "lastRoll": last_roll
        })

        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                msg_action = payload.get("action") or payload.get("type")
                if msg_action == "next_turn":
                    await streamdeck_next_turn()
                elif msg_action == "prev_turn":
                    await streamdeck_prev_turn()
                elif msg_action == "toggle_combat":
                    await streamdeck_combat_toggle()
                elif msg_action == "roll_d20":
                    await streamdeck_roll_d20()
                elif msg_action == "roll_sides":
                    await streamdeck_roll_sides(int(payload.get("sides", 20)))
                elif msg_action == "sfx":
                    await streamdeck_audio_sfx(payload.get("sfx", "fireball"))
                elif msg_action == "lighting_preset":
                    await streamdeck_lighting_preset(payload.get("preset", "tavern"))
                elif msg_action == "lighting_event":
                    await streamdeck_lighting_event(payload.get("event", "nat20"))
                elif msg_action == "audio_layer_toggle" or msg_action == "toggle_audio_layer":
                    track_id = payload.get("trackId") or payload.get("track_id", "track-forest-rain")
                    await streamdeck_audio_layer_toggle(track_id)
                elif msg_action == "audio_layer_state":
                    await streamdeck_manager.broadcast({
                        "event": "audio_layer_state",
                        "trackId": payload.get("trackId"),
                        "active": payload.get("active")
                    })
                elif msg_action == "short_rest":
                    await streamdeck_short_rest()
                elif msg_action == "long_rest":
                    await streamdeck_long_rest()
                elif msg_action == "adjust_encoder":
                    encoder = payload.get("encoder")
                    delta = payload.get("delta", 0)
                    await streamdeck_manager.broadcast({
                        "event": "encoder_adjust",
                        "encoder": encoder,
                        "delta": delta,
                        "ticks": payload.get("ticks", 1)
                    })
            except Exception:
                pass
    except WebSocketDisconnect:
        streamdeck_manager.disconnect(websocket)
    except Exception:
        streamdeck_manager.disconnect(websocket)

@app.api_route("/api/streamdeck/combat/next-turn", methods=["GET", "POST"])
async def streamdeck_next_turn():
    result = await next_turn()
    combatants = result.get("combatants", [])
    idx = result.get("currentTurnIndex", 0)
    active_name = combatants[idx]["name"] if combatants and idx < len(combatants) else "None"
    res = {
        "status": "success",
        "action": "next_turn",
        "round": result.get("round", 1),
        "turnIndex": idx,
        "activeCombatant": active_name,
        "combat": result
    }
    await streamdeck_manager.broadcast({
        "event": "combat_turn",
        "action": "next_turn",
        "round": res["round"],
        "turnIndex": idx,
        "activeCombatant": active_name,
        "combat": result
    })
    return res

@app.api_route("/api/streamdeck/combat/prev-turn", methods=["GET", "POST"])
async def streamdeck_prev_turn():
    result = await prev_turn()
    combatants = result.get("combatants", [])
    idx = result.get("currentTurnIndex", 0)
    active_name = combatants[idx]["name"] if combatants and idx < len(combatants) else "None"
    res = {
        "status": "success",
        "action": "prev_turn",
        "round": result.get("round", 1),
        "turnIndex": idx,
        "activeCombatant": active_name,
        "combat": result
    }
    await streamdeck_manager.broadcast({
        "event": "combat_turn",
        "action": "prev_turn",
        "round": res["round"],
        "turnIndex": idx,
        "activeCombatant": active_name,
        "combat": result
    })
    return res

@app.api_route("/api/streamdeck/combat/toggle", methods=["GET", "POST"])
async def streamdeck_combat_toggle():
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    combat["inCombat"] = not combat.get("inCombat", False)
    write_json("combat.json", combat)
    res = {
        "status": "success",
        "inCombat": combat["inCombat"],
        "round": combat.get("round", 1),
        "combat": combat
    }
    await streamdeck_manager.broadcast({
        "event": "combat_update",
        "action": "toggle",
        "inCombat": combat["inCombat"],
        "round": combat.get("round", 1),
        "combat": combat
    })
    return res

@app.api_route("/api/streamdeck/combat/start", methods=["GET", "POST"])
async def streamdeck_combat_start():
    result = await start_combat()
    await streamdeck_manager.broadcast({
        "event": "combat_update",
        "action": "start",
        "inCombat": True,
        "combat": result
    })
    return result

@app.api_route("/api/streamdeck/combat/stop", methods=["GET", "POST"])
async def streamdeck_combat_stop():
    result = await end_combat()
    await streamdeck_manager.broadcast({
        "event": "combat_update",
        "action": "stop",
        "inCombat": False,
        "combat": result
    })
    return result

@app.api_route("/api/streamdeck/combat/reset", methods=["GET", "POST"])
async def streamdeck_combat_reset():
    result = await reset_combat()
    await streamdeck_manager.broadcast({
        "event": "combat_update",
        "action": "reset",
        "inCombat": False,
        "combat": result
    })
    return result

def get_atmosphere_node_ids() -> List[str]:
    try:
        cfg = read_json("lighting.json", {})
        atm = cfg.get("atmosphere", {})
        node_ids = atm.get("node_ids") or []
        if not node_ids:
            if isinstance(atm.get("fixtures"), list) and atm.get("fixtures"):
                node_ids = [f["node_id"] for f in atm["fixtures"] if f.get("enabled", True) and f.get("node_id")]
        if not node_ids and atm.get("node_id"):
            node_ids = [atm.get("node_id")]
        return [n for n in node_ids if n]
    except Exception:
        return ["400U5-52611A"]

@app.api_route("/api/streamdeck/roll/d20", methods=["GET", "POST"])
async def streamdeck_roll_d20():
    roll = random.randint(1, 20)
    is_crit = (roll == 20)
    is_fumble = (roll == 1)

    roll_entry = {
        "id": f"roll-{uuid.uuid4().hex[:8]}",
        "timestamp": time.time(),
        "timeStr": datetime.now().strftime("%H:%M:%S"),
        "characterId": "streamdeck",
        "characterName": "Dungeon Master",
        "player": "Stream Deck",
        "rollType": "Quick d20 Roll",
        "formula": "1d20",
        "dice": [roll],
        "modifier": 0,
        "total": roll,
        "isCrit": is_crit,
        "isFumble": is_fumble,
        "isDM": True
    }
    RECENT_TABLE_ROLLS.append(roll_entry)
    if len(RECENT_TABLE_ROLLS) > 100:
        del RECENT_TABLE_ROLLS[0]

    await streamdeck_manager.broadcast({
        "event": "dice_roll",
        "sides": 20,
        "roll": roll,
        "chosen": roll,
        "total": roll,
        "isCrit": is_crit,
        "isFumble": is_fumble,
        "characterName": "Dungeon Master",
        "entry": roll_entry
    })

    return {
        "status": "success",
        "roll": roll,
        "isCrit": is_crit,
        "isFumble": is_fumble,
        "entry": roll_entry
    }

@app.api_route("/api/streamdeck/roll/{sides}", methods=["GET", "POST"])
async def streamdeck_roll_sides(sides: int):
    if sides not in (4, 6, 8, 10, 12, 20, 100):
        sides = 20
    roll = random.randint(1, sides)
    is_crit = (sides == 20 and roll == 20)
    is_fumble = (sides == 20 and roll == 1)
    roll_entry = {
        "id": f"roll-{uuid.uuid4().hex[:8]}",
        "timestamp": time.time(),
        "timeStr": datetime.now().strftime("%H:%M:%S"),
        "characterId": "streamdeck",
        "characterName": "Dungeon Master",
        "player": "Stream Deck",
        "rollType": f"d{sides} Roll",
        "formula": f"1d{sides}",
        "dice": [roll],
        "modifier": 0,
        "total": roll,
        "isCrit": is_crit,
        "isFumble": is_fumble,
        "isDM": True
    }
    RECENT_TABLE_ROLLS.append(roll_entry)
    if len(RECENT_TABLE_ROLLS) > 100:
        del RECENT_TABLE_ROLLS[0]

    await streamdeck_manager.broadcast({
        "event": "dice_roll",
        "sides": sides,
        "roll": roll,
        "chosen": roll,
        "total": roll,
        "isCrit": is_crit,
        "isFumble": is_fumble,
        "characterName": "Dungeon Master",
        "entry": roll_entry
    })
    return {"status": "success", "sides": sides, "roll": roll, "isCrit": is_crit, "isFumble": is_fumble}

@app.api_route("/api/streamdeck/party/short-rest", methods=["GET", "POST"])
async def streamdeck_short_rest():
    res = await trigger_party_rest({"type": "short"})
    party = read_json("party.json", [])
    await streamdeck_manager.broadcast({
        "event": "party_rest",
        "type": "short",
        "party": party,
        "result": res
    })
    return res

@app.api_route("/api/streamdeck/party/long-rest", methods=["GET", "POST"])
async def streamdeck_long_rest():
    res = await trigger_party_rest({"type": "long"})
    party = read_json("party.json", [])
    await streamdeck_manager.broadcast({
        "event": "party_rest",
        "type": "long",
        "party": party,
        "result": res
    })
    return res

@app.api_route("/api/streamdeck/lighting/preset/{preset_name}", methods=["GET", "POST"])
async def streamdeck_lighting_preset(preset_name: str):
    preset_configs = {
        "fireplace": {"brightness": 65, "cct": 2500, "rgb": [255, 140, 40], "mode": "cct", "effect": "fire"},
        "tavern": {"brightness": 65, "cct": 2500, "rgb": [255, 160, 60], "mode": "cct", "effect": "fire"},
        "dungeon": {"brightness": 45, "cct": 6500, "rgb": [90, 40, 180], "mode": "rgb", "effect": "pulsing"},
        "crypt": {"brightness": 40, "cct": 7000, "rgb": [60, 30, 150], "mode": "rgb", "effect": "pulsing"},
        "boss": {"brightness": 85, "cct": 3000, "rgb": [255, 20, 20], "mode": "rgb", "effect": "pulsing"},
        "thunderstorm": {"brightness": 80, "cct": 8000, "rgb": [120, 160, 255], "mode": "rgb", "effect": "lightning"},
        "forest": {"brightness": 60, "cct": 4500, "rgb": [40, 180, 80], "mode": "rgb", "effect": "solid"},
        "investigation": {"brightness": 90, "cct": 5000, "rgb": [255, 255, 255], "mode": "cct", "effect": "solid"},
        "off": {"brightness": 0, "enabled": False}
    }
    cfg = preset_configs.get(preset_name.lower(), preset_configs["tavern"])
    current = read_json("lighting.json", {})
    current.update(cfg)
    write_json("lighting.json", current)

    # Broadcast to connected browser clients so window.LightingEngine applies the preset live
    await streamdeck_manager.broadcast({
        "event": "lighting_preset",
        "preset": preset_name.lower(),
        "config": cfg
    })
    return {"status": "success", "preset": preset_name, "config": cfg}

@app.api_route("/api/streamdeck/lighting/event/{event_name}", methods=["GET", "POST"])
async def streamdeck_lighting_event(event_name: str):
    await streamdeck_manager.broadcast({
        "event": "lighting_event",
        "effect": event_name.lower()
    })
    return {"status": "success", "event": event_name}

@app.api_route("/api/streamdeck/audio/sfx/{sound_name}", methods=["GET", "POST"])
async def streamdeck_audio_sfx(sound_name: str):
    sfx_entry = {
        "id": f"sfx-{uuid.uuid4().hex[:8]}",
        "timestamp": time.time(),
        "timeStr": datetime.now().strftime("%H:%M:%S"),
        "characterId": "streamdeck",
        "characterName": "Dungeon Master",
        "player": "Stream Deck",
        "rollType": "Sound Effect",
        "formula": sound_name,
        "dice": [],
        "modifier": 0,
        "total": 0,
        "sfx": sound_name,
        "isCrit": False,
        "isFumble": False
    }
    RECENT_TABLE_ROLLS.append(sfx_entry)
    if len(RECENT_TABLE_ROLLS) > 50:
        del RECENT_TABLE_ROLLS[0]

    await streamdeck_manager.broadcast({
        "event": "audio_sfx",
        "sfx": sound_name.lower(),
        "entry": sfx_entry
    })
    return {"status": "success", "sfx": sound_name}

@app.api_route("/api/streamdeck/audio/layer/{track_id}/toggle", methods=["GET", "POST"])
async def streamdeck_audio_layer_toggle(track_id: str):
    await streamdeck_manager.broadcast({
        "event": "audio_layer_toggle",
        "trackId": track_id
    })
    return {"status": "success", "trackId": track_id}

@app.api_route("/api/streamdeck/map/reveal-all", methods=["GET", "POST"])
async def streamdeck_map_reveal_all():
    state = read_json("battlemap.json", get_default_battlemap_state())
    state["fogMask"] = "REVEALED_ALL"
    target_map_id = state.get("activeMapId")
    if "mapFogMasks" not in state or not isinstance(state.get("mapFogMasks"), dict):
        state["mapFogMasks"] = {}
    if target_map_id:
        state["mapFogMasks"][target_map_id] = "REVEALED_ALL"
    write_json("battlemap.json", state)
    await streamdeck_manager.broadcast({
        "event": "battlemap_action",
        "action": "reveal_all",
        "state": state
    })
    return {"status": "success", "action": "reveal_all_fog"}

@app.api_route("/api/streamdeck/map/reset-fog", methods=["GET", "POST"])
async def streamdeck_map_reset_fog():
    state = read_json("battlemap.json", get_default_battlemap_state())
    state["fogMask"] = None
    target_map_id = state.get("activeMapId")
    if "mapFogMasks" not in state or not isinstance(state.get("mapFogMasks"), dict):
        state["mapFogMasks"] = {}
    if target_map_id:
        state["mapFogMasks"][target_map_id] = None
    write_json("battlemap.json", state)
    await streamdeck_manager.broadcast({
        "event": "battlemap_action",
        "action": "reset_fog",
        "state": state
    })
    return {"status": "success", "action": "reset_fog"}

@app.api_route("/api/streamdeck/map/ping", methods=["GET", "POST"])
async def streamdeck_map_ping():
    state = read_json("battlemap.json", get_default_battlemap_state())
    pings = state.get("pings", [])
    now = time.time()
    new_ping = {
        "id": str(uuid.uuid4()),
        "x": 50.0,
        "y": 50.0,
        "color": "#f59e0b",
        "timestamp": now
    }
    pings = [p for p in pings if now - p.get("timestamp", 0) < 10.0]
    pings.append(new_ping)
    state["pings"] = pings
    state["updatedAt"] = now
    write_json("battlemap.json", state)
    await streamdeck_manager.broadcast({
        "event": "battlemap_action",
        "action": "ping",
        "ping": new_ping
    })
    return {"status": "success", "action": "ping", "ping": new_ping}

@app.get("/api/streamdeck/download-plugin")
async def streamdeck_download_plugin():
    plugin_path = ensure_streamdeck_plugin_bundle()
    if plugin_path and plugin_path.exists():
        return FileResponse(
            path=str(plugin_path),
            filename="com.arcaneledger.streamdeck.streamDeckPlugin",
            media_type="application/octet-stream"
        )
    raise HTTPException(status_code=404, detail="Stream Deck Plugin bundle not found")

@app.get("/api/streamdeck/download-profile")
async def streamdeck_download_profile():
    profile_path = ensure_streamdeck_profile_bundle()
    if profile_path and profile_path.exists():
        return FileResponse(
            path=str(profile_path),
            filename="ArcaneLedger_15Key.streamDeckProfile",
            media_type="application/octet-stream"
        )
    raise HTTPException(status_code=404, detail="Stream Deck Profile not found")

@app.get("/api/streamdeck/status")
async def streamdeck_status():
    lan_ip = get_local_lan_ip()
    base_lan = f"http://{lan_ip}:8000/api/streamdeck"
    base_local = "http://127.0.0.1:8000/api/streamdeck"
    ws_local = "ws://127.0.0.1:8000/ws/streamdeck"
    ws_lan = f"ws://{lan_ip}:8000/ws/streamdeck"
    endpoints = [
        {"name": "Next Turn", "method": "GET / POST", "url": f"{base_local}/combat/next-turn", "desc": "Advance initiative turn and round"},
        {"name": "Previous Turn", "method": "GET / POST", "url": f"{base_local}/combat/prev-turn", "desc": "Step back initiative turn"},
        {"name": "Toggle Combat", "method": "GET / POST", "url": f"{base_local}/combat/toggle", "desc": "Start or pause active combat"},
        {"name": "Roll d20", "method": "GET / POST", "url": f"{base_local}/roll/d20", "desc": "Roll d20 with Nat 20/Nat 1 light fanfare"},
        {"name": "Short Rest", "method": "GET / POST", "url": f"{base_local}/party/short-rest", "desc": "Trigger party Short Rest"},
        {"name": "Long Rest", "method": "GET / POST", "url": f"{base_local}/party/long-rest", "desc": "Trigger party Long Rest (full HP, spell slots, resources)"},
        {"name": "Fireplace Light", "method": "GET / POST", "url": f"{base_local}/lighting/preset/fireplace", "desc": "Warm hearth 2500K fire flicker"},
        {"name": "Boss Fight Light", "method": "GET / POST", "url": f"{base_local}/lighting/preset/boss", "desc": "Pulsing red combat lighting"},
        {"name": "Dungeon Crypt Light", "method": "GET / POST", "url": f"{base_local}/lighting/preset/dungeon", "desc": "Eerie blue-purple dungeon aura"},
        {"name": "Thunderstorm Light", "method": "GET / POST", "url": f"{base_local}/lighting/preset/thunderstorm", "desc": "Lightning strobe and storm wash"},
        {"name": "Sound FX: Fireball", "method": "GET / POST", "url": f"{base_local}/audio/sfx/fireball", "desc": "Trigger Fireball detonation"},
        {"name": "Sound FX: Sword Clash", "method": "GET / POST", "url": f"{base_local}/audio/sfx/sword_clash", "desc": "Trigger melee sword clash"},
        {"name": "Sound FX: Dragon Roar", "method": "GET / POST", "url": f"{base_local}/audio/sfx/dragon_roar", "desc": "Trigger monstrous roar"},
        {"name": "Toggle Sound Layer", "method": "GET / POST", "url": f"{base_local}/audio/layer/track-forest-rain/toggle", "desc": "Toggle looping ambient sound layer (Rain, Campfire, Hearth, Wind)"},
        {"name": "Reveal Map Fog", "method": "GET / POST", "url": f"{base_local}/map/reveal-all", "desc": "Fully reveal active battlemap fog"},
        {"name": "Reset Map Fog", "method": "GET / POST", "url": f"{base_local}/map/reset-fog", "desc": "Conceal battlemap fog"},
        {"name": "Map Laser Ping", "method": "GET / POST", "url": f"{base_local}/map/ping", "desc": "Fire central laser ping coordinate"}
    ]
    return {
        "status": "success",
        "lanIp": lan_ip,
        "baseLocal": base_local,
        "baseLan": base_lan,
        "wsLocal": ws_local,
        "wsLan": ws_lan,
        "pluginDownload": f"{base_local}/download-plugin",
        "profileDownload": f"{base_local}/download-profile",
        "connectedClients": len(streamdeck_manager.active_connections),
        "endpoints": endpoints
    }

def get_default_overworld_state(locations: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    if locations is None:
        locations = read_json("locations.json", [])
    preset_coords = {
        "loc-sunken-ward": {"x": 30.0, "y": 63.0, "population": "4,200 (Dockside Slums)", "discovered": True, "icon": "⚓"},
        "loc-oakhaven-market": {"x": 37.5, "y": 50.0, "population": "18,500 (Crown Capital)", "discovered": True, "icon": "🏰"},
        "loc-rusted-anchor": {"x": 33.0, "y": 58.0, "population": "120 Patrons (Harbor Inn)", "discovered": True, "icon": "🍺"},
        "loc-cinder-forge": {"x": 45.0, "y": 43.0, "population": "6,800 (Industrial Foundries)", "discovered": True, "icon": "⚒️"},
        "loc-highspire-quarter": {"x": 39.5, "y": 38.0, "population": "3,100 (High Nobility)", "discovered": True, "icon": "👑"},
        "loc-sunken-catacombs": {"x": 55.5, "y": 74.0, "population": "Uninhabited (Undead Crypts)", "discovered": False, "icon": "💀"},
    }
    pins = []
    for idx, loc in enumerate(locations):
        loc_id = loc.get("id", f"loc-{idx}")
        preset = preset_coords.get(loc_id, {})
        loc_type = (loc.get("type") or "Settlement").lower()
        default_icon = "🏰"
        if "tavern" in loc_type or "inn" in loc_type:
            default_icon = "🍺"
        elif "dungeon" in loc_type or "ruin" in loc_type or "crypt" in loc_type:
            default_icon = "💀"
        elif "district" in loc_type:
            default_icon = "🏘️"
        elif "wilderness" in loc_type or "forest" in loc_type:
            default_icon = "🌲"

        pins.append({
            "id": f"pin-{loc_id}",
            "locationId": loc_id,
            "title": loc.get("name", "Landmark"),
            "type": loc.get("type", "Settlement"),
            "danger": loc.get("danger", "Low"),
            "population": loc.get("population") or preset.get("population", "1,500 Citizens"),
            "x": preset.get("x", round(25.0 + ((idx * 13) % 55), 1)),
            "y": preset.get("y", round(25.0 + ((idx * 17) % 55), 1)),
            "discovered": preset.get("discovered", idx < 4),
            "icon": preset.get("icon", default_icon),
            "notes": loc.get("summary", "")
        })

    # Add two extra wilderness/frontier POIs if default campaign
    if any(p["locationId"] == "loc-oakhaven-market" for p in pins):
        pins.extend([
            {
                "id": "pin-ironpeak-citadel",
                "locationId": "",
                "title": "Ironpeak Citadel Outskirts",
                "type": "Fortress / Outpost",
                "danger": "High",
                "population": "450 Garrisoned Dwarves & Watchmen",
                "x": 45.0,
                "y": 19.5,
                "discovered": True,
                "icon": "🛡️",
                "notes": "Mountain pass fortress guarding the northern silver mines against frost giants and wyverns."
            },
            {
                "id": "pin-whispering-standing-stones",
                "locationId": "",
                "title": "The Whispering Standing Stones",
                "type": "Wilderness Landmark",
                "danger": "High",
                "population": "Druidic Circle & Fey Spirits",
                "x": 48.5,
                "y": 46.5,
                "discovered": False,
                "icon": "🌲",
                "notes": "Ancient moss-covered monoliths deep in the Whispering Woods where the Feywild veil grows thin."
            }
        ])

    main_map = {
        "id": "map-main",
        "title": "Realm of the Shattered Coast",
        "subtitle": "Grand Strategic Cartography • 1 Hex = 24 Miles",
        "type": "Kingdom",
        "scale": "1 Hex = 24 Miles",
        "scaleMilesPerHex": 24,
        "mapUrl": "/static/images/overworld_default.svg",
        "partyMarker": {
            "x": 37.5,
            "y": 50.0,
            "label": "Adventuring Party",
            "visibleToPlayers": True,
            "terrain": "Forest"
        },
        "hexGrid": {
            "enabled": True,
            "opacity": 0.25,
            "size": 36
        },
        "fog": {
            "enabled": True,
            "revealedPoints": [
                {"x": 37.5, "y": 50.0, "radius": 9.0}
            ]
        },
        "trail": [
            {
                "id": "tr-initial-camp",
                "x": 37.5,
                "y": 50.0,
                "day": 1,
                "hour": 8,
                "label": "Camp at Oakhaven",
                "type": "camp",
                "notes": "Expedition base camp near the Iron-Oak."
            }
        ],
        "pins": pins
    }
    return {
        "activeMapId": "map-main",
        "maps": [main_map],
        "mapTitle": main_map["title"],
        "mapSubtitle": main_map["subtitle"],
        "mapUrl": main_map["mapUrl"],
        "scaleMilesPerHex": 24,
        "fogUnexplored": True,
        "hexGrid": main_map["hexGrid"],
        "fog": main_map["fog"],
        "trail": main_map["trail"],
        "partyMarker": main_map["partyMarker"],
        "pins": pins
    }

def get_default_faction_relations() -> Dict[str, Any]:
    return {
        "relations": [
            {
                "id": "rel-1",
                "factionA": "Order of the Silver Gauntlet",
                "factionB": "The Obsidian Syndicate",
                "status": "War",
                "note": "Martial sweeps of the Sunken Ward vs. midnight smuggler ambushes."
            },
            {
                "id": "rel-2",
                "factionA": "Order of the Silver Gauntlet",
                "factionB": "The Gilded Scales Consortium",
                "status": "Allied",
                "note": "The Consortium funds Gauntlet patrols in exchange for harbor security."
            },
            {
                "id": "rel-3",
                "factionA": "Order of the Silver Gauntlet",
                "factionB": "Circle of the Pale Moon",
                "status": "War",
                "note": "Inquisitorial purge against forbidden Shadowfell and necromantic rituals."
            },
            {
                "id": "rel-4",
                "factionA": "The Gilded Scales Consortium",
                "factionB": "The Ironbound Union",
                "status": "Rivalry",
                "note": "Hostile buyout of Cinder-Forge foundries has sparked union strike threats."
            },
            {
                "id": "rel-5",
                "factionA": "The Obsidian Syndicate",
                "factionB": "The Ironbound Union",
                "status": "Rivalry",
                "note": "Union dockworkers resist Syndicate protection rackets on the piers."
            },
            {
                "id": "rel-6",
                "factionA": "The Obsidian Syndicate",
                "factionB": "Circle of the Pale Moon",
                "status": "Friendly",
                "note": "Secret smuggling Pact: Syndicate moves necrotic focus crystals into the Catacombs."
            }
        ],
        "standingMilestones": {
            "Allied": {
                "score": "+2 or higher",
                "badge": "🛡️ Sworn Ally",
                "boons": [
                    "20% Discount on faction-affiliated merchants, smiths, and spellcasting services",
                    "Access to Faction Safehouses (uninterrupted Long Rests & hidden caches)",
                    "Call Reinforcements: 1/Session summon a CR 2 Faction Veteran or Spy squad to aid the party"
                ]
            },
            "Friendly": {
                "score": "+1",
                "badge": "🤝 Trusted Friend",
                "boons": [
                    "10% Discount on faction goods and priority access to lucrative Quest Bounties",
                    "Free passage through faction checkpoints and dockside toll gates",
                    "Advantage on Charisma (Persuasion) checks with faction officers"
                ]
            },
            "Neutral": {
                "score": "0",
                "badge": "⚖️ Unaligned",
                "boons": [
                    "Standard market prices (100% base cost) and normal legal scrutiny",
                    "Can accept public contract bounties to earn standing"
                ]
            },
            "Suspicious": {
                "score": "-1",
                "badge": "😠 Watched & Distrusted",
                "boons": [
                    "25% Price Markup at faction-controlled shops and fences",
                    "Disadvantage on Charisma checks with faction members; informants report party movements",
                    "Frequent stops and contraband searches by patrol guards or guild enforcers"
                ]
            },
            "Hostile": {
                "score": "-2 or lower",
                "badge": "⚔️ Marked Enemy",
                "boons": [
                    "Active Bounty Placed: Faction hit squads, assassins, or arrest patrols hunt the party",
                    "Refused service at all faction businesses; safehouses locked down",
                    "Faction actively works to sabotage party quests (+1 tick to rival Tension Clocks)"
                ]
            }
        },
        "turnHistory": []
    }

def get_default_pantheon() -> List[Dict[str, Any]]:
    return [
        {
            "id": "deity-aureon",
            "name": "Aureon, The Dawnfather",
            "title": "Sovereign of the Unbroken Sun & Forge of Law",
            "category": "Prime Deity",
            "alignment": "Lawful Good",
            "domains": ["Light", "Life", "Order"],
            "symbol": "Golden Sunburst emblazoned over a Crowned Anvil",
            "symbolIcon": "☀️",
            "worshippers": "Paladins of the Silver Gauntlet, Clerics, Judges, Smiths, and Sun-Sworn Magistrates",
            "rivals": ["Vespera, The Whispering Shadow", "Malakor, The Chained Fiend"],
            "tenets": [
                "Bring the light of truth to shadow-haunted places; suffer no undead abomination to walk.",
                "Honor sworn oaths and defend the weak with steel and shield.",
                "Temper justice with mercy, but strike down unrepentant tyranny without hesitation."
            ],
            "pietyBoons": {
                "3": "Devotee of the Dawn (Piety 3+): You can cast Light at will, and you gain Advantage on saving throws against being Blinded or Frightened.",
                "10": "Sun-Blessed Warden (Piety 10+): You can cast Daylight or Crusader's Mantle once per Long Rest without expending a spell slot.",
                "25": "Radiant Aegis (Piety 25+): You gain Resistance to Radiant and Necrotic damage. When you use Help or Healing Word, the ally gains Temp HP equal to your level.",
                "50": "Champion of the Unbroken Sun (Piety 50+): Increase Wisdom or Charisma by +2 (to a max of 22). Your weapon and spell attacks deal an extra 1d8 Radiant damage."
            },
            "description": "Worshipped inside the grand marble cathedral of Highspire, Aureon is the radiant architect of civilization, righteous law, and solar renewal."
        },
        {
            "id": "deity-sylvara",
            "name": "Sylvara, Mother of the Wild Weave",
            "title": "Keeper of the Ancient Oak & Emerald Tide",
            "category": "Prime Deity",
            "alignment": "Neutral Good",
            "domains": ["Nature", "Tempest", "Life"],
            "symbol": "Silver Crescent Moon cradled within Antlered Oak Branches",
            "symbolIcon": "🌿",
            "worshippers": "Druids, Rangers, Sailors, Herbalists, and Wardens of the Whispering Woods",
            "rivals": ["Malakor, The Chained Fiend"],
            "tenets": [
                "Preserve the ancient groves, rivers, and wild beasts from greedy despoilers.",
                "Walk in harmony with the cycle of storm, bloom, and autumn decay.",
                "Shelter travelers lost in the wilds who show respect to the old ways."
            ],
            "pietyBoons": {
                "3": "Child of the Root (Piety 3+): You learn Druidcraft and can cast Speak with Animals once per Short Rest.",
                "10": "Walker of the Canopy (Piety 10+): Difficult terrain composed of nonmagical plants or mud doesn't cost you extra movement; cast Pass without Trace 1/Long Rest.",
                "25": "Storm-Bough Guardian (Piety 25+): Resistance to Lightning and Poison damage. Summoned beasts/fey gain +10 temporary HP.",
                "50": "Avatar of the Wild Weave (Piety 50+): Increase Wisdom or Constitution by +2 (max 22). Cast Commune with Nature or Awaken 1/Long Rest without components."
            },
            "description": "Revered at the Iron-Oak of Oakhaven and the standing stones of the Whispering Woods, Sylvara embodies the untamed heartbeat of the natural world."
        },
        {
            "id": "deity-kordath",
            "name": "Kordath, Lord of the Iron Storm",
            "title": "The Thunder-Strider & Patron of Valor",
            "category": "Prime Deity",
            "alignment": "Chaotic Neutral",
            "domains": ["War", "Tempest", "Strength"],
            "symbol": "Crossed Greatswords struck by a Forked Lightning Bolt",
            "symbolIcon": "⚡",
            "worshippers": "Barbarians, Fighters, Gladiators, Mercenaries, and Storm-Sailors",
            "rivals": ["Malakor, The Chained Fiend", "Vespera, The Whispering Shadow"],
            "tenets": [
                "Test your mettle against worthy foes; never cower before overwhelming odds.",
                "Strength is meant to break chains, never to forge them.",
                "Celebrate victory with thunderous song and honor the glorious dead."
            ],
            "pietyBoons": {
                "3": "Thunderous Grip (Piety 3+): Your carrying capacity doubles, and you gain Advantage on Athletics checks to grapple or shove.",
                "10": "Stormborn Charge (Piety 10+): Cast Thunderwave or Heroism (2nd level) 1/Long Rest. +5 ft. walking speed.",
                "25": "Fury of the Gale (Piety 25+): When you score a Critical Hit, thunder erupts dealing 2d8 Thunder damage to the target and pushing it 10 ft.",
                "50": "Scion of the Iron Storm (Piety 50+): Increase Strength or Constitution by +2 (max 22). Immunity to Thunder damage and the Prone condition."
            },
            "description": "His shrines are found in arena halls, mountain peaks, and ship prows. Kordath laughs in the hurricane and blesses warriors who charge headlong into peril."
        },
        {
            "id": "deity-oghma-vael",
            "name": "Oghma-Vael, Keeper of the Eternal Ledger",
            "title": "The All-Seeing Scribe & Weaver of Stars",
            "category": "Prime Deity",
            "alignment": "True Neutral",
            "domains": ["Knowledge", "Arcana", "Twilight"],
            "symbol": "An Open Silver Tome surmounted by a Starry Eye and Quill",
            "symbolIcon": "👁️",
            "worshippers": "Wizards, Bards, Artificers, Cartographers, Archivists, and Detectives",
            "rivals": ["Vespera, The Whispering Shadow"],
            "tenets": [
                "No true knowledge should be burned; record history faithfully in the great ledger.",
                "Unravel riddles, ciphers, and arcane mysteries wherever they lie hidden.",
                "Wield magic with discipline, lest hubris invite a second Cataclysm."
            ],
            "pietyBoons": {
                "3": "Scholar's Eye (Piety 3+): Cast Comprehend Languages or Identify as a Ritual in 1 Action once per Long Rest. +2 to Passive Investigation.",
                "10": "Astral Recall (Piety 10+): Gain proficiency or Expertise in Arcana or History. Cast Augury or Detect Thoughts 1/Long Rest.",
                "25": "Weaver's Ward (Piety 25+): Advantage on Concentration saving throws and saving throws against Illusion spells.",
                "50": "Archmage of the Eternal Ledger (Piety 50+): Increase Intelligence or Wisdom by +2 (max 22). Recover one adicionales 5th-level or lower spell slot on a Short Rest."
            },
            "description": "Patron of the Arcane Ledger itself, Oghma-Vael records every deed, spell, and fallen empire across the planes."
        },
        {
            "id": "deity-vespera",
            "name": "Vespera, The Whispering Shadow",
            "title": "Lady of the Eclipse, Secrets & Silent Blades",
            "category": "Cosmic Cult / Dark Deity",
            "alignment": "Neutral Evil",
            "domains": ["Trickery", "Death", "Grave"],
            "symbol": "A Weeping Obsidian Mask beneath a Total Lunar Eclipse",
            "symbolIcon": "🌙",
            "worshippers": "Circle of the Pale Moon, Obsidian Syndicate Assassins, Shadow Monks, Warlocks",
            "rivals": ["Aureon, The Dawnfather", "Oghma-Vael, Keeper of the Eternal Ledger"],
            "tenets": [
                "Every secret is a blade; hold it to the throat of the powerful.",
                "Move unseen in the dark; let the light-blinded fools boast while you claim the prize.",
                "Thin the veil between the mortal world and the eternal quiet of the Shadowfell."
            ],
            "pietyBoons": {
                "3": "Cloak of Dusk (Piety 3+): You gain Darkvision out to 60 ft. (or +30 ft. if you already have it) and Advantage on Stealth checks in dim light.",
                "10": "Shadow Step Initiate (Piety 10+): Cast Invisibility or Darkness once per Long Rest without a spell slot.",
                "25": "Whisper in the Vein (Piety 25+): Once per turn when you hit a creature with Advantage, deal an extra 2d6 Necrotic or Psychic damage.",
                "50": "Harbinger of the Eclipse (Piety 50+): Increase Dexterity or Charisma by +2 (max 22). You can teleport 60 ft. between shadows as a Bonus Action."
            },
            "description": "Venerated in the flooded vaults of the Sunken Ward Catacombs, Vespera promises forbidden power to those who embrace the coming eclipse."
        },
        {
            "id": "deity-malakor",
            "name": "Malakor, The Chained Fiend of the Pit",
            "title": "Archdevil of Ash, Blood Contracts & Iron Tyranny",
            "category": "Fiendish Patron / Cult",
            "alignment": "Lawful Evil",
            "domains": ["War", "Fiend Patron", "Order"],
            "symbol": "A Crown of Nine Burning Iron Spikes dripping Molten Gold",
            "symbolIcon": "🔥",
            "worshippers": "Fiend Warlocks, Ruthless Usurers, Tyrants, Oathbreaker Knights, Infernal Cultists",
            "rivals": ["Aureon, The Dawnfather", "Sylvara, Mother of the Wild Weave", "Kordath, Lord of the Iron Storm"],
            "tenets": [
                "Bind the desperate in ironclad pacts; every favor carries a compounding price.",
                "Rule through fear, discipline, and overwhelming hellfire.",
                "Seek the Obsidian Key to unbind the ancient planar seals."
            ],
            "pietyBoons": {
                "3": "Hellfire Brand (Piety 3+): You gain Resistance to Fire damage and learn the Thaumaturgy cantrip.",
                "10": "Infernal Rebuke (Piety 10+): Cast Hellish Rebuke (2nd level) or Command (2nd level) 1/Long Rest.",
                "25": "Soul-Tax Collector (Piety 25+): Whenever you reduce a hostile creature to 0 HP, you gain Temporary HP equal to your level + Charisma modifier.",
                "50": "Paragon of the Nine Chains (Piety 50+): Increase Charisma or Intelligence by +2 (max 22). Fire damage you deal ignores Fire Resistance."
            },
            "description": "An ancient archfiend bound beneath the world during the Cataclysm whose whispers offer wealth, vengeance, and eldritch mastery."
        }
    ]

DEFAULT_TIMELINE_ERAS = [
    {"id": "mythic", "name": "The Ancient Mythic Age", "icon": "⚡", "badgeColor": "purple", "description": "The dawn of gods, primal dragons, and the shaping of the world."},
    {"id": "cataclysm", "name": "The Ruin & Cataclysm", "icon": "🔥", "badgeColor": "rose", "description": "Planar cataclysm, shattered continents, and sunken kingdoms."},
    {"id": "iron", "name": "The Century of Iron", "icon": "⚔️", "badgeColor": "amber", "description": "Rise of mortal empires, grand citadels, and mercantile guilds."},
    {"id": "current", "name": "Current Campaign Arc", "icon": "🗡️", "badgeColor": "sky", "description": "Active campaign timeline and live party milestones."}
]

def get_default_timeline_events() -> List[Dict[str, Any]]:
    return [
        {
            "id": "tl-mythic-1",
            "era": "mythic",
            "dateLabel": "Year -3200 (Mythic Dawn)",
            "sortOrder": -3200,
            "title": "The Forging of the World-Spire & First Iron-Oak",
            "category": "Mythic Lore",
            "location": "Oakhaven Market Square",
            "factions": [],
            "description": "Aureon and Sylvara bind the primordial elemental chaos beneath the Shattered Coast and plant the colossal Iron-Oak at the heart of what will become Oakhaven.",
            "isSessionLog": False,
            "sourceId": ""
        },
        {
            "id": "tl-mythic-2",
            "era": "mythic",
            "dateLabel": "Year -1850 (Mythic Dawn)",
            "sortOrder": -1850,
            "title": "The First Dragon Concord of the Ironpeaks",
            "category": "Ancient History",
            "location": "Ironpeak Citadel Outskirts",
            "factions": [],
            "description": "Ancient metallic and chromatic wyrms carve out the northern mountain vaults before retreating into centuries-long slumber.",
            "isSessionLog": False,
            "sourceId": ""
        },
        {
            "id": "tl-cataclysm-1",
            "era": "cataclysm",
            "dateLabel": "Year 0 (The Cataclysm)",
            "sortOrder": 0,
            "title": "The Night of Falling Stars & Sinking of Old Oakhaven",
            "category": "Cataclysm",
            "location": "The Sunken Ward",
            "factions": ["Circle of the Pale Moon"],
            "description": "A catastrophic planar rift tears open above the coast. Half of Old Oakhaven collapses beneath the sea, creating the flooded Sunken Ward and submerging the royal catacombs.",
            "isSessionLog": False,
            "sourceId": ""
        },
        {
            "id": "tl-cataclysm-2",
            "era": "cataclysm",
            "dateLabel": "Year 14 P.R. (Post-Ruin)",
            "sortOrder": 14,
            "title": "Sealing of the Obsidian Sanctum",
            "category": "Arcane Seal",
            "location": "The Sunken Ward Catacombs",
            "factions": ["Order of the Silver Gauntlet"],
            "description": "Archmages and Dawn-Paladins lock the Shadowfell breach beneath the catacombs using the Obsidian Key, swearing an oath to guard the seal forever.",
            "isSessionLog": False,
            "sourceId": ""
        },
        {
            "id": "tl-iron-1",
            "era": "iron",
            "dateLabel": "Year 240 P.R. (Century of Iron)",
            "sortOrder": 240,
            "title": "Founding of the Cinder-Forge & Silver Bastion",
            "category": "Political",
            "location": "The Cinder-Forge District",
            "factions": ["The Ironbound Union", "Order of the Silver Gauntlet"],
            "description": "Dwarven smith-clans ignite the great blast furnaces of the Cinder-Forge while the Order of the Silver Gauntlet raises the white marble walls of Highspire.",
            "isSessionLog": False,
            "sourceId": ""
        },
        {
            "id": "tl-iron-2",
            "era": "iron",
            "dateLabel": "Year 312 P.R. (Century of Iron)",
            "sortOrder": 312,
            "title": "The Grand Exchange Charter & Rise of the Syndicate",
            "category": "Political",
            "location": "Highspire Noble Quarter",
            "factions": ["The Gilded Scales Consortium", "The Obsidian Syndicate"],
            "description": "The Gilded Scales Consortium secures monopoly rights over maritime trade, inadvertently driving independent captains into the arms of the Obsidian Syndicate.",
            "isSessionLog": False,
            "sourceId": ""
        },
        {
            "id": "tl-current-1",
            "era": "current",
            "dateLabel": "Day 1 (348 P.R.)",
            "sortOrder": 348001,
            "title": "The Adventuring Party Convenes at the Rusted Anchor",
            "category": "Campaign Milestone",
            "location": "The Rusted Anchor Tavern",
            "factions": ["Order of the Silver Gauntlet", "The Obsidian Syndicate"],
            "description": "Our heroes gather in Oakhaven as tensions boil over between the Silver Gauntlet, the striking Ironbound dockworkers, and whispers of a Pale Moon ritual in the catacombs.",
            "isSessionLog": True,
            "sourceId": "campaign-start"
        }
    ]

def get_default_timeline(blank: bool = False) -> Dict[str, Any]:
    return {
        "eras": [dict(e) for e in DEFAULT_TIMELINE_ERAS],
        "events": [] if blank else get_default_timeline_events()
    }

def get_campaign_timeline_default() -> Dict[str, Any]:
    try:
        active_id = get_active_campaign_id()
    except Exception:
        active_id = "default"
    return get_default_timeline(blank=(active_id != "default"))

def normalize_timeline(data: Any, blank_default: bool = True) -> Dict[str, Any]:
    if isinstance(data, list):
        return {
            "eras": [dict(e) for e in DEFAULT_TIMELINE_ERAS],
            "events": data
        }
    if isinstance(data, dict):
        if "eras" not in data or not isinstance(data.get("eras"), list):
            data["eras"] = [dict(e) for e in DEFAULT_TIMELINE_ERAS]
        if "events" not in data or not isinstance(data.get("events"), list):
            data["events"] = []
        return data
    return get_campaign_timeline_default() if blank_default else get_default_timeline(blank=False)

def get_default_travel_state() -> Dict[str, Any]:
    return {
        "pace": "Normal",
        "terrain": "Forest",
        "road": "trail",
        "targetMiles": 48,
        "marchHours": 8,
        "navBonus": 0,
        "forageBonus": 0,
        "history": []
    }

def get_default_party_stash() -> Dict[str, Any]:
    return {
        "currency": {"pp": 2, "gp": 240, "sp": 85, "cp": 40},
        "items": [
            {
                "id": "stash-1",
                "name": "Bag of Holding",
                "category": "Wondrous Item",
                "rarity": "Uncommon",
                "qty": 1,
                "weight": 5.0,
                "cost": "400 gp",
                "notes": "Holds up to 500 lbs (max 64 cubic feet), always weighs 5 lbs."
            },
            {
                "id": "stash-2",
                "name": "Potion of Healing (Greater)",
                "category": "Potion",
                "rarity": "Uncommon",
                "qty": 2,
                "weight": 0.5,
                "cost": "150 gp",
                "notes": "Bonus Action to drink or administer: restores 4d4 + 4 HP."
            },
            {
                "id": "stash-3",
                "name": "Spell Scroll of Revivify",
                "category": "Scroll",
                "rarity": "Uncommon",
                "qty": 1,
                "weight": 0.1,
                "cost": "300 gp",
                "notes": "3rd-level Cleric/Paladin scroll; no 300 gp diamond needed when cast from scroll."
            },
            {
                "id": "stash-4",
                "name": "50ft Hempen Rope, Grappling Hook & Crowbar",
                "category": "Adventuring Gear",
                "rarity": "Mundane",
                "qty": 1,
                "weight": 16.0,
                "cost": "6 gp",
                "notes": "Party dungeoneering kit stored in the Bag of Holding."
            }
        ],
        "notes": "Shared party treasury, gemstones, and unassigned dungeon salvage."
    }

def ensure_party_inventory_defaults(party: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    starter_kits = {
        "pc-1": {
            "deityId": "deity-kordath",
            "deityName": "Kordath, Lord of the Iron Storm",
            "pietyScore": 4,
            "maxCarryWeight": 240,
            "currency": {"pp": 0, "gp": 65, "sp": 18, "cp": 12},
            "inventory": [
                {"id": "inv-101", "name": "Heavy Warhammer +1", "category": "Weapon", "rarity": "Uncommon", "qty": 1, "weight": 4.0, "equipped": True, "attuned": False, "notes": "1d8+1 bludgeoning (Versatile 1d10+1) • Push Mastery"},
                {"id": "inv-102", "name": "Dwarven Plate Armor", "category": "Armor", "rarity": "Mundane", "qty": 1, "weight": 65.0, "equipped": True, "attuned": False, "notes": "AC 18 • Heavy Armor"},
                {"id": "inv-103", "name": "Gauntlets of Ogre Power", "category": "Wondrous Item", "rarity": "Uncommon", "qty": 1, "weight": 1.0, "equipped": True, "attuned": True, "notes": "STR score becomes 19 while attuned."},
                {"id": "inv-104", "name": "Potion of Healing", "category": "Potion", "rarity": "Common", "qty": 2, "weight": 0.5, "equipped": False, "attuned": False, "notes": "2d4 + 2 HP (Bonus Action)"}
            ]
        },
        "pc-2": {
            "deityId": "deity-oghma-vael",
            "deityName": "Oghma-Vael, Keeper of the Eternal Ledger",
            "pietyScore": 5,
            "maxCarryWeight": 120,
            "currency": {"pp": 1, "gp": 88, "sp": 30, "cp": 5},
            "inventory": [
                {"id": "inv-201", "name": "Arcane Grimoire +1", "category": "Wondrous Item", "rarity": "Uncommon", "qty": 1, "weight": 3.0, "equipped": True, "attuned": True, "notes": "+1 to Wizard spell attack rolls and Spell Save DC."},
                {"id": "inv-202", "name": "Cloak of Protection", "category": "Wondrous Item", "rarity": "Uncommon", "qty": 1, "weight": 1.0, "equipped": True, "attuned": True, "notes": "+1 bonus to AC and all Saving Throws."},
                {"id": "inv-203", "name": "Pearl of Power", "category": "Wondrous Item", "rarity": "Uncommon", "qty": 1, "weight": 0.2, "equipped": True, "attuned": True, "notes": "Action: Recover up to a 3rd-level expended spell slot (1/Day)."},
                {"id": "inv-204", "name": "Component Pouch & Fine Inks", "category": "Adventuring Gear", "rarity": "Mundane", "qty": 1, "weight": 2.0, "equipped": True, "attuned": False, "notes": "Contains 100 gp of spell scribing inks."}
            ]
        },
        "pc-3": {
            "deityId": "deity-vespera",
            "deityName": "Vespera, The Whispering Shadow",
            "pietyScore": 3,
            "maxCarryWeight": 150,
            "currency": {"pp": 3, "gp": 115, "sp": 44, "cp": 29},
            "inventory": [
                {"id": "inv-301", "name": "Shortsword of Warning", "category": "Weapon", "rarity": "Uncommon", "qty": 1, "weight": 2.0, "equipped": True, "attuned": True, "notes": "1d6 piercing (Vex Mastery) • Advantage on Initiative rolls, party cannot be surprised."},
                {"id": "inv-302", "name": "Studded Leather Armor", "category": "Armor", "rarity": "Mundane", "qty": 1, "weight": 13.0, "equipped": True, "attuned": False, "notes": "AC 12 + DEX Mod"},
                {"id": "inv-303", "name": "Boots of Elvenkind", "category": "Wondrous Item", "rarity": "Uncommon", "qty": 1, "weight": 1.0, "equipped": True, "attuned": False, "notes": "Silent footsteps; Advantage on Stealth checks to move silently."},
                {"id": "inv-304", "name": "Masterwork Thieves' Tools", "category": "Tool", "rarity": "Mundane", "qty": 1, "weight": 1.0, "equipped": True, "attuned": False, "notes": "Utilize as a Bonus Action via Fast Hands."}
            ]
        },
        "pc-4": {
            "deityId": "deity-aureon",
            "deityName": "Aureon, The Dawnfather",
            "pietyScore": 11,
            "maxCarryWeight": 180,
            "currency": {"pp": 0, "gp": 52, "sp": 15, "cp": 0},
            "inventory": [
                {"id": "inv-401", "name": "Amulet of the Devout +1", "category": "Wondrous Item", "rarity": "Uncommon", "qty": 1, "weight": 1.0, "equipped": True, "attuned": True, "notes": "+1 Spell Attack/Save DC; 1/Day use Channel Divinity without expending a use."},
                {"id": "inv-402", "name": "Mace & Sun-Crest Shield", "category": "Weapon", "rarity": "Mundane", "qty": 1, "weight": 10.0, "equipped": True, "attuned": False, "notes": "Holy Symbol of Aureon emblazoned on shield (+2 AC)."},
                {"id": "inv-403", "name": "Chain Mail", "category": "Armor", "rarity": "Mundane", "qty": 1, "weight": 55.0, "equipped": True, "attuned": False, "notes": "AC 16 • Heavy Armor"},
                {"id": "inv-404", "name": "300 gp Diamond (Revivify)", "category": "Adventuring Gear", "rarity": "Rare", "qty": 2, "weight": 0.1, "equipped": False, "attuned": False, "notes": "Material component for Revivify."}
            ]
        }
    }
    changed = False
    for pc in party:
        pc_id = pc.get("id", "")
        preset = starter_kits.get(pc_id, {})
        if pc.get("inventory") is None:
            pc["inventory"] = preset.get("inventory", [
                {"id": f"inv-{uuid.uuid4().hex[:6]}", "name": "Adventurer's Pack & Rations (5 days)", "category": "Adventuring Gear", "rarity": "Mundane", "qty": 1, "weight": 15.0, "equipped": True, "attuned": False, "notes": "Bedroll, torches, flint & steel, waterskin."}
            ])
            changed = True
        if pc.get("currency") is None:
            pc["currency"] = preset.get("currency", {"pp": 0, "gp": 25, "sp": 10, "cp": 0})
            changed = True
        if not pc.get("maxCarryWeight"):
            pc["maxCarryWeight"] = preset.get("maxCarryWeight", 150)
            changed = True
        if pc.get("deityId") is None or (pc_id in starter_kits and not pc.get("deityId")):
            pc["deityId"] = preset.get("deityId", "")
            pc["deityName"] = preset.get("deityName", "")
            pc["pietyScore"] = preset.get("pietyScore", 1)
            changed = True
    if changed:
        write_json("party.json", party)
    return party

@app.get("/api/state")
async def get_full_state():
    party = read_json("party.json", [])
    party = ensure_party_inventory_defaults(party)
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

    overworld = read_json("overworld.json", get_default_overworld_state(locations))
    faction_relations = read_json("faction_relations.json", get_default_faction_relations())
    pantheon = read_json("pantheon.json", get_default_pantheon())
    timeline = normalize_timeline(read_json("timeline.json", get_campaign_timeline_default()))
    party_stash = read_json("party_stash.json", get_default_party_stash())
    travel = read_json("travel.json", get_default_travel_state())

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

    enriched_campaigns = get_enriched_campaigns()
    active_camp_id = get_active_campaign_id()
    current_campaign = next((c for c in enriched_campaigns if c.get("id") == active_camp_id), None)
    if not current_campaign and enriched_campaigns:
        current_campaign = enriched_campaigns[0]

    return {
        "party": party,
        "partyStash": party_stash,
        "combat": combat,
        "roster": roster,
        "world": world,
        "overworld": overworld,
        "factionRelations": faction_relations,
        "pantheon": pantheon,
        "timeline": timeline,
        "travel": travel,
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
        "lighting": lighting,
        "campaigns": enriched_campaigns,
        "activeCampaignId": active_camp_id,
        "currentCampaign": current_campaign,
        "presets": PLAYSTYLE_PRESETS
    }

def get_enriched_campaigns() -> List[Dict[str, Any]]:
    manifest = get_campaigns_manifest()
    enriched_campaigns = []
    for c in manifest.get("campaigns", []):
        c_copy = dict(c)
        party_file = CAMPAIGNS_DIR / c["id"] / "party.json"
        count = 0
        if party_file.exists():
            try:
                with open(party_file, "r", encoding="utf-8") as f:
                    party_data = json.load(f)
                    if isinstance(party_data, list):
                        count = len(party_data)
            except Exception:
                pass
        c_copy["partyCount"] = count
        enriched_campaigns.append(c_copy)
    return enriched_campaigns

# -----------------------------------------------------------------------------
# TABLETOP BATTLEMAP & FOG OF WAR (3RD SCREEN IN-TABLE TV) - CONFIG & DEFAULTS
# -----------------------------------------------------------------------------
DEFAULT_BATTLEMAPS_CATALOG = [
    {
        "id": "dungeon_crypt",
        "name": "Forgotten Dungeon Crypt",
        "url": "/static/images/battlemaps/dungeon_crypt.svg",
        "width": 2000,
        "height": 1500,
        "defaultGridSize": 50,
        "theme": "dungeon",
        "type": "preset",
        "createdAt": 1728950000
    },
    {
        "id": "forest_river",
        "name": "Whispering Woods & River Crossing",
        "url": "/static/images/battlemaps/forest_river.svg",
        "width": 2000,
        "height": 1500,
        "defaultGridSize": 50,
        "theme": "forest",
        "type": "preset",
        "createdAt": 1728950000
    },
    {
        "id": "tavern_cellar",
        "name": "Smuggler's Tavern Cellar",
        "url": "/static/images/battlemaps/tavern_cellar.svg",
        "width": 2000,
        "height": 1500,
        "defaultGridSize": 50,
        "theme": "tavern",
        "type": "preset",
        "createdAt": 1728950000
    }
]

def get_shared_battlemaps_catalog() -> List[Dict[str, Any]]:
    catalog = []
    if not BATTLEMAPS_CATALOG_FILE.exists():
        save_shared_battlemaps_catalog(DEFAULT_BATTLEMAPS_CATALOG)
        catalog = list(DEFAULT_BATTLEMAPS_CATALOG)
    else:
        try:
            with open(BATTLEMAPS_CATALOG_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list) and len(data) > 0:
                    catalog = data
        except Exception as e:
            print(f"Error loading battlemap catalog: {e}")
            catalog = list(DEFAULT_BATTLEMAPS_CATALOG)

    if not catalog:
        catalog = list(DEFAULT_BATTLEMAPS_CATALOG)

    cos_dir = STATIC_DIR / "images" / "battlemaps" / "cos"
    base_cos_dir = BASE_DIR / "static" / "images" / "battlemaps" / "cos"

    def resolve_best_map_url(map_id: str, current_url: str) -> str:
        cid = map_id.replace("cos_", "")
        for search_dir in [cos_dir, base_cos_dir]:
            for ext in [".jpg", ".png", ".webp", ".jpeg"]:
                candidate = search_dir / f"{cid}{ext}"
                if candidate.exists():
                    return f"/static/images/battlemaps/cos/{cid}{ext}"
        return current_url

    # Base clean catalog strictly excluding any CoS maps
    clean_catalog = [
        m for m in catalog
        if not m.get("id", "").startswith("cos_")
        and m.get("type") != "cos_module"
        and "/battlemaps/cos/" not in str(m.get("url", ""))
    ]

    # If the active campaign is NOT Curse of Strahd, strictly isolate and return only clean non-CoS maps
    if not is_active_campaign_cos():
        return clean_catalog

    # If active campaign IS Curse of Strahd, inject canonical CoS battlemaps
    cos_maps = cos_module_pack.get_cos_battlemaps()
    merged = list(clean_catalog)
    existing_ids = {m.get("id") for m in merged}
    for cm in cos_maps:
        target_url = resolve_best_map_url(cm["id"], cm.get("url", ""))
        if cm["id"] not in existing_ids:
            cm_copy = dict(cm)
            cm_copy["url"] = target_url
            merged.append(cm_copy)
            existing_ids.add(cm["id"])
        else:
            for m in merged:
                if m.get("id") == cm["id"]:
                    m["url"] = target_url
                    break

    extra_cos_maps = [
        {
            "id": "cos_castle_ravenloft_court",
            "name": "Castle Ravenloft - Court of the Count",
            "url": resolve_best_map_url("cos_castle_ravenloft_court", "/static/images/battlemaps/cos/castle_ravenloft_court.jpg"),
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "dungeon",
            "type": "cos_module",
            "chapter": "Chapter 4",
            "notes": "Audience Hall, Throne Room of King Barov, Count’s Balcony"
        },
        {
            "id": "cos_castle_ravenloft_larders",
            "name": "Castle Ravenloft - Larders of Ill Omen",
            "url": resolve_best_map_url("cos_castle_ravenloft_larders", "/static/images/battlemaps/cos/castle_ravenloft_larders.jpg"),
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "dungeon",
            "type": "cos_module",
            "chapter": "Chapter 4",
            "notes": "Wine Cellars, Iron Golem Vault, Torture Dungeon"
        },
        {
            "id": "cos_castle_ravenloft_weeping",
            "name": "Castle Ravenloft - Rooms of Weeping",
            "url": resolve_best_map_url("cos_castle_ravenloft_weeping", "/static/images/battlemaps/cos/castle_ravenloft_weeping.jpg"),
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "dungeon",
            "type": "cos_module",
            "chapter": "Chapter 4",
            "notes": "Gertruda’s Chamber, Helga’s Parlor, Clock Tower"
        }
    ]
    for em in extra_cos_maps:
        if em["id"] not in existing_ids:
            merged.append(em)
            existing_ids.add(em["id"])

    return merged

def save_shared_battlemaps_catalog(catalog: List[Dict[str, Any]]) -> None:
    try:
        clean_catalog = [
            m for m in catalog
            if not m.get("id", "").startswith("cos_")
            and m.get("type") != "cos_module"
            and "/battlemaps/cos/" not in str(m.get("url", ""))
        ]
        with open(BATTLEMAPS_CATALOG_FILE, "w", encoding="utf-8") as f:
            json.dump(clean_catalog, f, indent=2)
    except Exception as e:
        print(f"Error saving battlemap catalog: {e}")

def get_default_battlemap_state():
    catalog = get_shared_battlemaps_catalog()
    first_map = catalog[0] if catalog else DEFAULT_BATTLEMAPS_CATALOG[0]
    return {
        "activeMapId": first_map["id"],
        "activeMapUrl": first_map["url"],
        "activeMapName": first_map["name"],
        "gridSize": first_map.get("defaultGridSize", 50),
        "gridVisible": True,
        "gridColor": "rgba(255, 255, 255, 0.22)",
        "fogEnabled": True,
        "fogMask": None,
        "mapFogMasks": {},
        "rotation": 0,
        "panX": 0,
        "panY": 0,
        "zoom": 1.0,
        "locked": False,
        "pings": [],
        "tokens": [],
        "templates": [],
        "activeRuler": None,
        "companionAccessEnabled": False,
        "focusWorldX": None,
        "focusWorldY": None,
        "syncId": 0,
        "maps": catalog,
        "updatedAt": time.time()
    }

# Campaign Profiles & Module Manager Endpoints
@app.get("/api/campaigns")
async def list_campaigns():
    manifest = get_campaigns_manifest()
    return {
        "activeCampaignId": manifest.get("activeCampaignId", "default"),
        "campaigns": get_enriched_campaigns(),
        "presets": PLAYSTYLE_PRESETS
    }

@app.post("/api/campaigns")
async def create_campaign(payload: CampaignCreate):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Campaign name cannot be empty")

    manifest = get_campaigns_manifest()
    clean_slug = "".join(ch.lower() if ch.isalnum() else "_" for ch in name).strip("_")[:16]
    camp_id = f"camp_{int(time.time())}_{clean_slug or 'new'}"
    camp_dir = CAMPAIGNS_DIR / camp_id
    camp_dir.mkdir(parents=True, exist_ok=True)

    preset_key = payload.preset if payload.preset in PLAYSTYLE_PRESETS else "full"
    modules = dict(PLAYSTYLE_PRESETS[preset_key]["modules"])
    if payload.modules:
        modules.update(payload.modules)

    if payload.template == "clone_active":
        active_dir = get_active_campaign_dir()
        if active_dir.exists():
            for f in active_dir.glob("*.json"):
                if f.name in CAMPAIGN_SCOPED_FILES:
                    shutil.copy2(f, camp_dir / f.name)
    elif payload.template == "curse_of_strahd":
        defaults = {
            "party.json": [],
            "combat.json": {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []},
            "roster.json": cos_module_pack.get_cos_roster(),
            "world.json": {"customFactions": [], "customLocations": [], "useOnlyCustomFactions": False, "useOnlyCustomLocations": False},
            "session_notes.json": [
                {
                    "id": "note-cos-prep",
                    "title": "Barovia DM Primer & Chapter Milestones",
                    "content": "• Tser Pool: Run Madam Eva's Tarokka reading to determine relic placements.\n• Vallaki: Key powder keg between Baron Vargas and Lady Wachter.\n• Relics: Sunsword deals 20 radiant/round to Strahd and halts his regeneration.\n• Heart of Sorrow: Absorbs first 50 HP of damage dealt to Strahd.",
                    "category": "Session Notes",
                    "pinned": True,
                    "createdAt": time.time()
                }
            ],
            "time_weather.json": cos_module_pack.get_cos_time_weather(),
            "locations.json": cos_module_pack.get_cos_locations(),
            "factions.json": cos_module_pack.get_cos_factions(),
            "quests.json": cos_module_pack.get_cos_quests(),
            "broadcast.json": {"active": False, "title": "", "subtitle": "", "content": "", "type": "text", "imageUrl": ""},
            "encounters.json": cos_module_pack.get_cos_encounters(),
            "secrets.json": [],
            "handouts.json": cos_module_pack.get_cos_handouts(),
            "battlemap.json": get_default_battlemap_state(),
            "overworld.json": cos_module_pack.get_cos_barovia_overworld(),
            "dungeons.json": cos_module_pack.get_cos_dungeons(),
            "dungeons_meta.json": {"activeDungeonId": "dungeon-ravenloft"},
            "faction_relations.json": {"relations": [], "turnHistory": []},
            "pantheon.json": [
                {"id": "ptn-morninglord", "name": "The Morninglord", "domain": "Light, Life", "description": "The patron god of Barovia before the mists fell. Worshiped at the village church and St. Andral's in Vallaki."},
                {"id": "ptn-mother-night", "name": "Mother Night", "domain": "Death, Twilight, Trickery", "description": "The ancient, dark deity worshiped by the wild druids, werewolves, and Baba Lysaga."}
            ],
            "timeline.json": {"eras": [dict(e) for e in DEFAULT_TIMELINE_ERAS], "events": []},
            "party_stash.json": {"currency": {"pp": 0, "gp": 0, "sp": 0, "cp": 0}, "items": []},
            "travel.json": get_default_travel_state(),
            "tarokka.json": cos_module_pack.draw_tarokka_reading(),
        }
        for fname, dval in defaults.items():
            with open(camp_dir / fname, "w", encoding="utf-8") as f:
                json.dump(dval, f, indent=2, ensure_ascii=False)
    else:
        empty_party = []
        empty_combat = {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []}
        empty_roster = []
        empty_world = {"customFactions": [], "customLocations": [], "useOnlyCustomFactions": False, "useOnlyCustomLocations": False}
        empty_notes = []
        empty_time = {"day": 1, "hour": 9, "minute": 0, "weather": {"temperature": "Mild (65°F)", "wind": "Calm", "precipitation": "Clear Skies", "tacticalEffect": "None"}, "moonPhase": "Waxing Crescent", "activeTimers": []}
        empty_locations = []
        empty_factions = []
        empty_quests = {"quests": [], "rumors": []}
        empty_broadcast = {"active": False, "title": "", "subtitle": "", "content": "", "type": "text", "imageUrl": ""}
        empty_encounters = []
        empty_secrets = []
        empty_handouts = []
        empty_battlemap = get_default_battlemap_state()

        defaults = {
            "party.json": empty_party,
            "combat.json": empty_combat,
            "roster.json": empty_roster,
            "world.json": empty_world,
            "session_notes.json": empty_notes,
            "time_weather.json": empty_time,
            "locations.json": empty_locations,
            "factions.json": empty_factions,
            "quests.json": empty_quests,
            "broadcast.json": empty_broadcast,
            "encounters.json": empty_encounters,
            "secrets.json": empty_secrets,
            "handouts.json": empty_handouts,
            "battlemap.json": empty_battlemap,
            "overworld.json": get_default_overworld_state([]),
            "faction_relations.json": {"relations": [], "turnHistory": []},
            "pantheon.json": [],
            "timeline.json": {"eras": [dict(e) for e in DEFAULT_TIMELINE_ERAS], "events": []},
            "party_stash.json": {"currency": {"pp": 0, "gp": 0, "sp": 0, "cp": 0}, "items": []},
            "travel.json": get_default_travel_state(),
            "dungeons.json": [],
            "dungeons_meta.json": {"activeDungeonId": None},
        }
        for fname, dval in defaults.items():
            with open(camp_dir / fname, "w", encoding="utf-8") as f:
                json.dump(dval, f, indent=2, ensure_ascii=False)

    now_str = datetime.now().isoformat()
    new_campaign = {
        "id": camp_id,
        "name": name,
        "description": payload.description or "",
        "createdAt": now_str,
        "lastPlayed": now_str,
        "preset": preset_key,
        "modules": modules
    }

    manifest.setdefault("campaigns", []).append(new_campaign)
    manifest["activeCampaignId"] = camp_id
    save_campaigns_manifest(manifest)

    return {"status": "success", "campaign": new_campaign, "activeCampaignId": camp_id}

@app.post("/api/campaigns/{camp_id}/switch")
async def switch_campaign_endpoint(camp_id: str):
    manifest = get_campaigns_manifest()
    campaign = next((c for c in manifest.get("campaigns", []) if c["id"] == camp_id), None)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    campaign["lastPlayed"] = datetime.now().isoformat()
    manifest["activeCampaignId"] = camp_id
    save_campaigns_manifest(manifest)

    # Auto-upgrade CoS and heal spell slots if applicable
    camp_dir = CAMPAIGNS_DIR / camp_id
    if camp_dir.exists():
        check_and_upgrade_cos_campaign(camp_dir, campaign)

    return {"status": "success", "activeCampaignId": camp_id, "campaign": campaign}

@app.put("/api/campaigns/{camp_id}")
async def update_campaign_endpoint(camp_id: str, payload: CampaignUpdate):
    manifest = get_campaigns_manifest()
    campaign = next((c for c in manifest.get("campaigns", []) if c["id"] == camp_id), None)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if payload.name is not None and payload.name.strip():
        campaign["name"] = payload.name.strip()
    if payload.description is not None:
        campaign["description"] = payload.description.strip()
    if payload.preset is not None:
        campaign["preset"] = payload.preset
    if payload.modules is not None:
        if "modules" not in campaign:
            campaign["modules"] = dict(DEFAULT_MODULES)
        campaign["modules"].update(payload.modules)
        if "curse_of_strahd" in payload.modules:
            if payload.modules["curse_of_strahd"]:
                campaign["template"] = "curse_of_strahd"
            elif campaign.get("template") == "curse_of_strahd":
                campaign["template"] = "custom"

    save_campaigns_manifest(manifest)
    return {"status": "success", "campaign": campaign}

@app.post("/api/campaigns/{camp_id}/duplicate")
async def duplicate_campaign_endpoint(camp_id: str):
    manifest = get_campaigns_manifest()
    source = next((c for c in manifest.get("campaigns", []) if c["id"] == camp_id), None)
    if not source:
        raise HTTPException(status_code=404, detail="Campaign not found")

    src_dir = CAMPAIGNS_DIR / camp_id
    new_id = f"camp_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    dst_dir = CAMPAIGNS_DIR / new_id
    dst_dir.mkdir(parents=True, exist_ok=True)

    if src_dir.exists():
        for f in src_dir.glob("*.json"):
            shutil.copy2(f, dst_dir / f.name)

    now_str = datetime.now().isoformat()
    new_campaign = {
        "id": new_id,
        "name": f"{source['name']} (Copy)",
        "description": source.get("description", ""),
        "createdAt": now_str,
        "lastPlayed": now_str,
        "preset": source.get("preset", "full"),
        "modules": dict(source.get("modules", DEFAULT_MODULES))
    }

    manifest.setdefault("campaigns", []).append(new_campaign)
    save_campaigns_manifest(manifest)
    return {"status": "success", "campaign": new_campaign}

@app.delete("/api/campaigns/{camp_id}")
async def delete_campaign_endpoint(camp_id: str):
    manifest = get_campaigns_manifest()
    campaigns = manifest.get("campaigns", [])
    if len(campaigns) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only campaign")

    target = next((c for c in campaigns if c["id"] == camp_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if manifest.get("activeCampaignId") == camp_id:
        remaining = [c for c in campaigns if c["id"] != camp_id]
        manifest["activeCampaignId"] = remaining[0]["id"]

    manifest["campaigns"] = [c for c in campaigns if c["id"] != camp_id]
    save_campaigns_manifest(manifest)

    camp_dir = CAMPAIGNS_DIR / camp_id
    if camp_dir.exists():
        try:
            shutil.rmtree(camp_dir)
        except Exception as e:
            print(f"Error removing campaign dir {camp_dir}: {e}")

    return {"status": "success", "activeCampaignId": manifest["activeCampaignId"]}

# -------------------------------------------------------------
# CAMPAIGN MODULE PACK SYSTEM (.ledgerpack)
# -------------------------------------------------------------
@app.get("/api/campaigns/{camp_id}/export-pack")
async def export_campaign_pack(camp_id: str):
    manifest = get_campaigns_manifest()
    campaign = next((c for c in manifest.get("campaigns", []) if c["id"] == camp_id), None)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    camp_dir = CAMPAIGNS_DIR / camp_id
    if not camp_dir.exists():
        raise HTTPException(status_code=404, detail="Campaign directory not found")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        pack_manifest = {
            "formatVersion": "1.0",
            "packType": "arcane_ledger_module",
            "id": campaign.get("id"),
            "name": campaign.get("name"),
            "description": campaign.get("description", ""),
            "preset": campaign.get("preset", "full"),
            "modules": campaign.get("modules", {}),
            "template": campaign.get("template", "custom"),
            "exportedAt": time.time(),
            "exportDate": datetime.now().isoformat(),
            "appVersion": updater.CURRENT_VERSION if hasattr(updater, "CURRENT_VERSION") else "1.1.6"
        }
        zf.writestr("module_manifest.json", json.dumps(pack_manifest, indent=2, ensure_ascii=False))

        for root, dirs, files in os.walk(camp_dir):
            for file in files:
                file_path = Path(root) / file
                rel_path = file_path.relative_to(camp_dir)
                zf.write(file_path, arcname=str(rel_path).replace("\\", "/"))

    zip_buffer.seek(0)
    safe_title = "".join(c if c.isalnum() or c in ("-", "_") else "_" for c in campaign.get("name", "Campaign")).strip("_")
    filename = f"{safe_title or 'Campaign'}.ledgerpack"

    return StreamingResponse(
        zip_buffer,
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@app.post("/api/campaigns/import-pack")
async def import_campaign_pack(file: UploadFile = File(...), set_active: bool = True):
    if not file.filename.lower().endswith((".ledgerpack", ".zip")):
        raise HTTPException(status_code=400, detail="Only .ledgerpack and .zip campaign packs are supported")

    content = await file.read()
    try:
        zf = zipfile.ZipFile(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid package archive: {e}")

    pack_manifest = {}
    if "module_manifest.json" in zf.namelist():
        try:
            pack_manifest = json.loads(zf.read("module_manifest.json").decode("utf-8"))
        except Exception:
            pass

    camp_name = pack_manifest.get("name") or file.filename.rsplit(".", 1)[0].replace("_", " ")
    clean_slug = "".join(ch.lower() if ch.isalnum() else "_" for ch in camp_name).strip("_")[:16]
    new_camp_id = f"camp_{int(time.time())}_{clean_slug or 'imported'}"
    target_dir = CAMPAIGNS_DIR / new_camp_id
    target_dir.mkdir(parents=True, exist_ok=True)

    for member in zf.infolist():
        norm_name = os.path.normpath(member.filename).replace("\\", "/")
        if norm_name.startswith("../") or norm_name.startswith("/") or ".." in norm_name.split("/"):
            continue
        if norm_name == "module_manifest.json":
            continue
        if member.is_dir():
            (target_dir / norm_name).mkdir(parents=True, exist_ok=True)
        else:
            dest_file = target_dir / norm_name
            dest_file.parent.mkdir(parents=True, exist_ok=True)
            with open(dest_file, "wb") as f_out:
                f_out.write(zf.read(member.filename))

    manifest = get_campaigns_manifest()
    now_str = datetime.now().isoformat()
    new_campaign = {
        "id": new_camp_id,
        "name": camp_name,
        "description": pack_manifest.get("description", "Imported community campaign module"),
        "createdAt": now_str,
        "lastPlayed": now_str,
        "preset": pack_manifest.get("preset", "full"),
        "modules": pack_manifest.get("modules") or dict(DEFAULT_MODULES),
        "template": pack_manifest.get("template", "custom")
    }

    manifest.setdefault("campaigns", []).append(new_campaign)
    if set_active:
        manifest["activeCampaignId"] = new_camp_id
    save_campaigns_manifest(manifest)

    check_and_upgrade_cos_campaign(target_dir, new_campaign)

    return {
        "status": "success",
        "message": f"Successfully imported '{camp_name}'!",
        "campaign": new_campaign,
        "activeCampaignId": manifest.get("activeCampaignId"),
        "campaigns": get_enriched_campaigns()
    }


@app.get("/api/modules/curse-of-strahd/download-pack")
async def download_curse_of_strahd_official_pack():
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        pack_manifest = {
            "formatVersion": "1.0",
            "packType": "arcane_ledger_module",
            "id": "module-curse-of-strahd",
            "name": "Curse of Strahd (Complete Adventure Pack)",
            "description": "Official 5.5e turnkey campaign pack: 32 chapter encounters, 45 NPCs, 5 authentic handouts, 12 locations, 5 factions, weather, and the 54-card Tarokka Deck.",
            "preset": "full",
            "template": "curse_of_strahd",
            "author": "Arcane Ledger Official",
            "version": "1.1.6",
            "exportedAt": time.time(),
            "exportDate": datetime.now().isoformat(),
            "appVersion": updater.CURRENT_VERSION if hasattr(updater, "CURRENT_VERSION") else "1.1.6"
        }
        zf.writestr("module_manifest.json", json.dumps(pack_manifest, indent=2, ensure_ascii=False))

        cos_data = {
            "party.json": [],
            "combat.json": {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []},
            "roster.json": cos_module_pack.get_cos_roster(),
            "encounters.json": cos_module_pack.get_cos_encounters(),
            "handouts.json": cos_module_pack.get_cos_handouts(),
            "locations.json": cos_module_pack.get_cos_locations(),
            "factions.json": cos_module_pack.get_cos_factions(),
            "quests.json": cos_module_pack.get_cos_quests(),
            "time_weather.json": cos_module_pack.get_cos_time_weather(),
            "tarokka.json": cos_module_pack.draw_tarokka_reading(),
            "pantheon.json": [
                {"id": "ptn-morninglord", "name": "The Morninglord", "domain": "Light, Life", "description": "Patron deity of Barovia before the mists fell."},
                {"id": "ptn-mother-night", "name": "Mother Night", "domain": "Death, Twilight", "description": "Ancient dark goddess worshiped by druids and werewolves."}
            ],
            "session_notes.json": [
                {
                    "id": "note-cos-prep",
                    "title": "Barovia DM Primer & Chapter Milestones",
                    "content": "• Tser Pool: Run Madam Eva's Tarokka reading to determine relic placements.\n• Vallaki: Key powder keg between Baron Vargas and Lady Wachter.\n• Relics: Sunsword deals 20 radiant/round to Strahd and halts his regeneration.\n• Heart of Sorrow: Absorbs first 50 HP of damage dealt to Strahd.",
                    "category": "Session Notes",
                    "pinned": True,
                    "createdAt": time.time()
                }
            ],
            "world.json": {"customFactions": [], "customLocations": [], "useOnlyCustomFactions": False, "useOnlyCustomLocations": False},
            "party_stash.json": {"currency": {"pp": 0, "gp": 0, "sp": 0, "cp": 0}, "items": []},
            "battlemap.json": get_default_battlemap_state(),
            "dungeons.json": cos_module_pack.get_cos_dungeons(),
            "dungeons_meta.json": {"activeDungeonId": "dungeon-ravenloft"}
        }
        for fname, dval in cos_data.items():
            zf.writestr(fname, json.dumps(dval, indent=2, ensure_ascii=False))

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/octet-stream",
        headers={"Content-Disposition": 'attachment; filename="Curse_of_Strahd.ledgerpack"'}
    )

# Party management
@app.get("/api/party")
async def get_party():
    return read_json("party.json", [])

@app.post("/api/party")
async def save_party(party: List[Character]):
    data = [c.dict() for c in party]
    write_json("party.json", data)
    try:
        await streamdeck_manager.broadcast({
            "event": "party_updated",
            "party": data
        })
    except Exception:
        pass
    return {"status": "success", "count": len(data)}

# -------------------------------------------------------------
# D&D BEYOND CHARACTER IMPORTER & SYNC
# -------------------------------------------------------------
class DdbImportRequest(BaseModel):
    query: Optional[str] = None
    characterData: Optional[Dict[str, Any]] = None
    addToParty: bool = True

@app.post("/api/ddb/fetch-preview")
async def ddb_fetch_preview(payload: Dict[str, Any]):
    query = (payload.get("query") or "").strip()
    if not query:
        raise HTTPException(status_code=400, detail="Please provide a D&D Beyond character URL or ID.")
    
    char_id = ddb_importer.extract_character_id(query)
    if not char_id:
        raise HTTPException(status_code=400, detail=f"Could not extract a valid D&D Beyond character ID from '{query}'.")
    
    raw_data, err = ddb_importer.fetch_dndbeyond_character(char_id)
    if err:
        raise HTTPException(status_code=400, detail=err)
    
    parsed = ddb_importer.parse_dndbeyond_character(raw_data)
    return {"status": "success", "character": parsed}

@app.post("/api/ddb/import")
async def ddb_import_character(req: DdbImportRequest):
    parsed = None
    if req.query:
        char_id = ddb_importer.extract_character_id(req.query)
        if not char_id:
            raise HTTPException(status_code=400, detail=f"Could not extract character ID from '{req.query}'.")
        raw_data, err = ddb_importer.fetch_dndbeyond_character(char_id)
        if err:
            raise HTTPException(status_code=400, detail=err)
        parsed = ddb_importer.parse_dndbeyond_character(raw_data)
    elif req.characterData:
        try:
            parsed = ddb_importer.parse_dndbeyond_character(req.characterData)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse character JSON: {e}")
    else:
        raise HTTPException(status_code=400, detail="Neither query URL nor character data was provided.")

    if not parsed:
        raise HTTPException(status_code=400, detail="Failed to parse character.")

    if req.addToParty:
        party = read_json("party.json", [])
        existing_idx = None
        for i, p in enumerate(party):
            if p.get("ddbId") and p.get("ddbId") == parsed.get("ddbId"):
                existing_idx = i
                break
            elif p.get("name", "").lower() == parsed.get("name", "").lower():
                existing_idx = i
                break

        if existing_idx is not None:
            orig_id = party[existing_idx].get("id")
            orig_notes = party[existing_idx].get("notes", "")
            orig_deity_id = party[existing_idx].get("deityId")
            orig_deity_name = party[existing_idx].get("deityName")
            orig_piety = party[existing_idx].get("pietyScore", 1)

            parsed["id"] = orig_id
            if orig_deity_id:
                parsed["deityId"] = orig_deity_id
                parsed["deityName"] = orig_deity_name
                parsed["pietyScore"] = orig_piety
            if orig_notes and orig_notes not in parsed.get("notes", ""):
                parsed["notes"] = f"{parsed.get('notes', '')}\n\nLocal DM Notes:\n{orig_notes}".strip()

            party[existing_idx] = parsed
            action_desc = f"Updated existing party member '{parsed['name']}'"
        else:
            party.append(parsed)
            action_desc = f"Added '{parsed['name']}' to party"

        write_json("party.json", party)
        
        try:
            await streamdeck_manager.broadcast({
                "event": "party_updated",
                "character": parsed,
                "party": party
            })
        except Exception:
            pass

        return {
            "status": "success",
            "message": f"Successfully {action_desc}!",
            "character": parsed,
            "party": party
        }

    return {"status": "success", "character": parsed}

@app.post("/api/ddb/upload-json")
async def ddb_upload_json(file: UploadFile = File(...)):
    try:
        content = await file.read()
        raw_json = json.loads(content.decode("utf-8"))
        parsed = ddb_importer.parse_dndbeyond_character(raw_json)
        return {"status": "success", "character": parsed}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid D&D Beyond JSON file: {e}")

@app.post("/api/ddb/sync/{pc_id}")
async def ddb_sync_pc(pc_id: str):
    party = read_json("party.json", [])
    target_pc = None
    target_idx = None
    for i, p in enumerate(party):
        if p.get("id") == pc_id:
            target_pc = p
            target_idx = i
            break
    
    if target_pc is None:
        raise HTTPException(status_code=404, detail="Character not found in party.")
    
    if not target_pc.get("ddbId"):
        raise HTTPException(status_code=400, detail="This character was not imported from D&D Beyond or is missing a DDB ID.")
    
    fresh, err = ddb_importer.sync_dndbeyond_character(target_pc)
    if err:
        raise HTTPException(status_code=400, detail=err)
    
    party[target_idx] = fresh
    write_json("party.json", party)
    
    try:
        await streamdeck_manager.broadcast({
            "event": "party_updated",
            "character": fresh,
            "party": party
        })
    except Exception:
        pass
        
    return {
        "status": "success",
        "message": f"Synchronized '{fresh['name']}' with D&D Beyond!",
        "character": fresh,
        "party": party
    }

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

    # Bidirectional sync: NPC location <-> Locations notable figures
    npc_name = npc_dict.get("name", "").strip()
    npc_loc = npc_dict.get("location", "").strip()
    locations = read_json("locations.json", [])
    locs_changed = False

    if npc_name:
        for loc in locations:
            loc_name = loc.get("name", "").strip()
            if "notableNpcs" not in loc or not isinstance(loc["notableNpcs"], list):
                loc["notableNpcs"] = []
            
            if npc_loc and loc_name.lower() == npc_loc.lower():
                if not any(n.lower() == npc_name.lower() for n in loc["notableNpcs"]):
                    loc["notableNpcs"].append(npc_name)
                    locs_changed = True
            else:
                if any(n.lower() == npc_name.lower() for n in loc["notableNpcs"]):
                    loc["notableNpcs"] = [n for n in loc["notableNpcs"] if n.lower() != npc_name.lower()]
                    locs_changed = True

    if locs_changed:
        write_json("locations.json", locations)

    return {"status": "success", "npc": npc_dict, "roster": roster, "locations": locations if locs_changed else None}

@app.delete("/api/roster/{npc_id}")
async def delete_npc(npc_id: str):
    roster = read_json("roster.json", [])
    deleted_npc = next((item for item in roster if item.get("id") == npc_id), None)
    roster = [item for item in roster if item.get("id") != npc_id]
    write_json("roster.json", roster)

    if deleted_npc and deleted_npc.get("name"):
        d_name = deleted_npc["name"].strip().lower()
        locations = read_json("locations.json", [])
        locs_changed = False
        for loc in locations:
            if "notableNpcs" in loc and isinstance(loc["notableNpcs"], list):
                if any(n.lower() == d_name for n in loc["notableNpcs"]):
                    loc["notableNpcs"] = [n for n in loc["notableNpcs"] if n.lower() != d_name]
                    locs_changed = True
        if locs_changed:
            write_json("locations.json", locations)

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
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "currentTurnIndex": 0, "combatants": []})
    
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
                    
    # Sync active combatants matching party members
    for c in combat.get("combatants", []):
        match_pc = next((p for p in party if p.get("id") == c.get("id") or p.get("name") == c.get("name")), None)
        if match_pc:
            c["currentHp"] = match_pc.get("currentHp", c.get("currentHp"))
            c["tempHp"] = match_pc.get("tempHp", 0)
            c["deathSaves"] = match_pc.get("deathSaves", {"successes": 0, "failures": 0})

    write_json("party.json", party)
    write_json("combat.json", combat)

    rest_event = {
        "type": rest_type,
        "timestamp": time.time(),
        "message": f"{rest_type.title()} Rest completed! Slots and features recharged."
    }
    write_json("last_rest.json", rest_event)

    return {
        "status": "success",
        "message": f"{rest_type.title()} Rest completed! Slots and features recharged.",
        "party": party,
        "combat": combat,
        "lastRest": rest_event
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

@app.post("/api/time-weather/set")
async def set_time_weather(payload: Dict[str, Any]):
    state = read_json("time_weather.json", {
        "day": 1, "hour": 9, "minute": 0,
        "weather": {"temperature": "Mild", "wind": "Calm", "precipitation": "Clear", "tacticalEffect": "None"},
        "moonPhase": "Waxing Crescent",
        "activeTimers": []
    })
    if "day" in payload:
        state["day"] = max(1, int(payload["day"]))
    if "hour" in payload:
        state["hour"] = max(0, min(23, int(payload["hour"])))
    if "minute" in payload:
        state["minute"] = max(0, min(59, int(payload["minute"])))
    if "moonPhase" in payload:
        state["moonPhase"] = payload["moonPhase"]
    if "weather" in payload and isinstance(payload["weather"], dict):
        state["weather"].update(payload["weather"])

    write_json("time_weather.json", state)
    return {"status": "success", "timeWeather": state}

@app.post("/api/time-weather/advance")
async def advance_time(payload: Dict[str, Any]):
    hours_to_add = int(payload.get("hours", 0))
    minutes_to_add = int(payload.get("minutes", 0)) + (hours_to_add * 60)
    if minutes_to_add == 0 and "minutes" not in payload and "hours" not in payload:
        minutes_to_add = 10

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
        "timeWeather": state,
        "expiredTimers": expired_timers
    }

# -------------------------------------------------------------
# SRD COMPENDIUM RESTORATION & SYNC API
# -------------------------------------------------------------
@app.post("/api/compendium/restore-srd")
async def restore_srd_compendiums():
    """Manually restore all core SRD 5.5e datasets (monsters, spells, items, rules) from bundle."""
    bundled_data = get_bundled_data_dir()
    if not bundled_data:
        raise HTTPException(status_code=500, detail="Bundled reference data directory not found.")

    restored = {}
    is_same_dir = (bundled_data.resolve() == DATA_DIR.resolve())

    for filename in SRD_COMPENDIUM_FILES:
        src = bundled_data / filename
        dst = DATA_DIR / filename
        if src.exists():
            try:
                if not is_same_dir:
                    shutil.copy2(src, dst)
                with open(dst, "r", encoding="utf-8") as f:
                    data = json.load(f)
                count = len(data) if isinstance(data, (list, dict)) else 1
                restored[filename] = {"success": True, "count": count}
            except Exception as e:
                restored[filename] = {"success": False, "error": str(e)}
    return {"success": True, "restored": restored}


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

    # Find previous location state if editing
    prev_loc = next((l for l in locations if l.get("id") == l_dict["id"]), None)
    prev_notables = set(n.lower() for n in (prev_loc.get("notableNpcs", []) if prev_loc else []))
    new_notables = set(n.lower() for n in (l_dict.get("notableNpcs", []) or []))

    updated = False
    for i, l in enumerate(locations):
        if l.get("id") == l_dict["id"]:
            locations[i] = l_dict
            updated = True
            break
    if not updated:
        locations.insert(0, l_dict)

    write_json("locations.json", locations)

    # Bidirectional sync: Location notable figures <-> Roster NPC location
    roster = read_json("roster.json", [])
    roster_changed = False
    for npc_item in roster:
        npc_name = npc_item.get("name")
        if not npc_name:
            continue
        npc_name_lower = npc_name.strip().lower()
        # If NPC is in this location's notable figures, update their location to this location's name
        if npc_name_lower in new_notables:
            if npc_item.get("location") != l_dict["name"]:
                npc_item["location"] = l_dict["name"]
                roster_changed = True
        # If NPC was removed from this location's notable figures, clear their location if it was this location
        elif prev_loc and npc_name_lower in prev_notables:
            prev_name = (prev_loc.get("name") or "").strip().lower()
            cur_name = l_dict["name"].strip().lower()
            loc_val = (npc_item.get("location") or "").strip().lower()
            if loc_val == prev_name or loc_val == cur_name:
                npc_item["location"] = ""
                roster_changed = True

    if roster_changed:
        write_json("roster.json", roster)

    return {"status": "success", "location": l_dict, "locations": locations, "roster": roster if roster_changed else None}

@app.delete("/api/locations/{location_id}")
async def delete_location(location_id: str):
    locations = read_json("locations.json", [])
    loc_to_delete = next((l for l in locations if l.get("id") == location_id), None)
    locations = [l for l in locations if l.get("id") != location_id]
    write_json("locations.json", locations)

    if loc_to_delete and loc_to_delete.get("name"):
        del_name = loc_to_delete["name"].strip().lower()
        roster = read_json("roster.json", [])
        roster_changed = False
        for npc_item in roster:
            if (npc_item.get("location") or "").strip().lower() == del_name:
                npc_item["location"] = ""
                roster_changed = True
        if roster_changed:
            write_json("roster.json", roster)

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

def auto_sync_quest_to_timeline(q_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if q_dict.get("status") != "Completed":
        return None
    tl_data = normalize_timeline(read_json("timeline.json", get_campaign_timeline_default()))
    events = tl_data.setdefault("events", [])
    q_id = q_dict.get("id", "")
    if q_id and any(ev.get("sourceId") == q_id for ev in events if isinstance(ev, dict)):
        return None
    tw = read_json("time_weather.json", {"day": 1, "hour": 9, "minute": 0})
    day_num = int(tw.get("day", 1))
    new_ev = {
        "id": f"tl-qst-{uuid.uuid4().hex[:8]}",
        "era": "current",
        "dateLabel": f"Day {day_num} (348 P.R.)",
        "sortOrder": 348000 + day_num,
        "title": f"Quest Completed: {q_dict.get('title', 'Milestone')}",
        "category": "Quest Completed",
        "location": q_dict.get("location") or "Shattered Coast",
        "factions": [q_dict.get("giver")] if q_dict.get("giver") else [],
        "description": q_dict.get("summary") or f"The party successfully completed '{q_dict.get('title')}' (Reward: {q_dict.get('reward') or 'Renown'}).",
        "isSessionLog": True,
        "sourceId": q_id
    }
    events.append(new_ev)
    events.sort(key=lambda x: x.get("sortOrder", 0) if isinstance(x, dict) else 0)
    tl_data["events"] = events
    write_json("timeline.json", tl_data)
    return new_ev

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
    timeline_event = auto_sync_quest_to_timeline(q_dict)
    return {"status": "success", "quest": q_dict, "quests": quests, "timelineEvent": timeline_event}

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
    timeline_event = None
    if all_done and len(target_quest.get("objectives", [])) > 0:
        target_quest["status"] = "Completed"
        timeline_event = auto_sync_quest_to_timeline(target_quest)

    write_json("quests.json", data)
    return {"status": "success", "quest": target_quest, "objective": target_obj, "timelineEvent": timeline_event}

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
# OVERWORLD / REGIONAL MAP & EXPLORATION SUITE
# -------------------------------------------------------------
def ensure_overworld_schema(overworld: Dict[str, Any], locations: List[Dict[str, Any]] = None) -> Dict[str, Any]:
    if not isinstance(overworld, dict):
        if is_active_campaign_cos():
            overworld = cos_module_pack.get_cos_barovia_overworld()
        else:
            overworld = get_default_overworld_state(locations)

    is_cos = is_active_campaign_cos()
    default_title = "The Lands of Barovia" if is_cos else "Realm of the Shattered Coast"
    default_subtitle = "Curse of Strahd • Domains of Dread • 1 Hex = 1/4 Mile" if is_cos else "Grand Strategic Cartography • 1 Hex = 24 Miles"
    default_scale = "1 Hex = 1/4 Mile" if is_cos else "1 Hex = 24 Miles"
    default_miles = 0.25 if is_cos else 24
    default_url = "/static/images/barovia_map.svg" if is_cos else "/static/images/overworld_default.svg"

    if "maps" not in overworld or not isinstance(overworld["maps"], list) or len(overworld["maps"]) == 0:
        main_map = {
            "id": "map-main" if not is_cos else "map-barovia-regional",
            "title": overworld.get("mapTitle", default_title),
            "subtitle": overworld.get("mapSubtitle", default_subtitle),
            "type": "Kingdom",
            "scale": overworld.get("scale", default_scale),
            "scaleMilesPerHex": overworld.get("scaleMilesPerHex", default_miles),
            "mapUrl": overworld.get("mapUrl", default_url),
            "partyMarker": overworld.get("partyMarker", {
                "x": 81.0 if is_cos else 37.5, "y": 60.5 if is_cos else 50.0, "label": "Adventuring Party", "visibleToPlayers": True, "terrain": "Settlement" if is_cos else "Forest"
            }),
            "hexGrid": overworld.get("hexGrid", {"enabled": True, "opacity": 0.22 if is_cos else 0.25, "size": 32 if is_cos else 36}),
            "fog": overworld.get("fog", {"enabled": True, "revealedPoints": [{"x": 81.0 if is_cos else 37.5, "y": 60.5 if is_cos else 50.0, "radius": 12.0 if is_cos else 9.0}]}),
            "trail": overworld.get("trail", []),
            "pins": overworld.get("pins", [])
        }
        overworld["maps"] = [main_map]
        overworld["activeMapId"] = main_map["id"]

    active_id = overworld.get("activeMapId")
    active_map = next((m for m in overworld["maps"] if m.get("id") == active_id), overworld["maps"][0])
    overworld["activeMapId"] = active_map.get("id", "map-main")

    if "hexGrid" not in active_map or not isinstance(active_map["hexGrid"], dict):
        active_map["hexGrid"] = {"enabled": True, "opacity": 0.25, "size": 36}
    if "fog" not in active_map or not isinstance(active_map["fog"], dict):
        active_map["fog"] = {"enabled": True, "revealedPoints": [{"x": 37.5, "y": 50.0, "radius": 9.0}]}
    if "trail" not in active_map or not isinstance(active_map["trail"], list):
        active_map["trail"] = []
    if "pins" not in active_map or not isinstance(active_map["pins"], list):
        active_map["pins"] = []
    if "partyMarker" not in active_map or not isinstance(active_map["partyMarker"], dict):
        active_map["partyMarker"] = {"x": 37.5, "y": 50.0, "label": "Adventuring Party", "visibleToPlayers": True, "terrain": "Forest"}
    if "type" not in active_map:
        active_map["type"] = "Kingdom"
    if "scaleMilesPerHex" not in active_map:
        active_map["scaleMilesPerHex"] = 24

    if "tiers" not in overworld or not isinstance(overworld["tiers"], list) or not overworld["tiers"]:
        overworld["tiers"] = ["Kingdom", "Province", "Settlement", "Dungeon"]

    # Synchronize root keys with active map for backwards compatibility
    overworld["mapTitle"] = active_map.get("title", "Regional Map")
    overworld["mapSubtitle"] = active_map.get("subtitle", "")
    overworld["mapUrl"] = active_map.get("mapUrl", "/static/images/overworld_default.svg")
    overworld["scaleMilesPerHex"] = active_map.get("scaleMilesPerHex", 24)
    overworld["partyMarker"] = active_map.get("partyMarker")
    overworld["pins"] = active_map.get("pins", [])
    overworld["hexGrid"] = active_map.get("hexGrid")
    overworld["fog"] = active_map.get("fog")
    overworld["trail"] = active_map.get("trail", [])
    overworld["fogUnexplored"] = active_map.get("fog", {}).get("enabled", True)

    return overworld

def get_active_map_ref(overworld: Dict[str, Any]) -> Dict[str, Any]:
    active_id = overworld.get("activeMapId", "map-main")
    for m in overworld.get("maps", []):
        if m.get("id") == active_id:
            return m
    if overworld.get("maps"):
        return overworld["maps"][0]
    return {}

def find_bestiary_monster(catalog: List[Dict[str, Any]], name_query: str) -> Optional[Dict[str, Any]]:
    if not name_query or not catalog:
        return None
    q = name_query.strip().lower()

    # 1. Exact name match
    for m in catalog:
        if m.get("name", "").strip().lower() == q:
            return m

    # 2. Exact match with common suffixes (e.g. "Goblin" -> "Goblin Warrior", "Sahuagin" -> "Sahuagin Warrior")
    for suffix in ["Warrior", "Minion"]:
        cand = f"{q} {suffix}".lower()
        for m in catalog:
            if m.get("name", "").strip().lower() == cand:
                return m

    # 3. Non-boss substring match if query doesn't specify boss/captain
    q_is_boss = "boss" in q or "captain" in q
    substring_matches = [m for m in catalog if q in m.get("name", "").lower()]
    if substring_matches:
        if not q_is_boss:
            non_boss = [m for m in substring_matches if "boss" not in m.get("name", "").lower() and "captain" not in m.get("name", "").lower()]
            if non_boss:
                return non_boss[0]
        return substring_matches[0]

    # 4. Word-by-word match
    words = [w for w in q.split() if len(w) > 2]
    if words:
        for m in catalog:
            m_lower = m.get("name", "").lower()
            if all(w in m_lower for w in words):
                return m

    return None

OVERLAND_2024_ENCOUNTERS = {
    "Forest": [
        {
            "id": "enc-forest-1",
            "title": "Owlbear Territory & Gnawed Elk",
            "category": "combat",
            "danger": "Moderate",
            "narrative": "Deep scratches scar the pine trunks ten feet above the ground. The musk of fresh blood and musk leads to a massive, feathered carnivore crouched over a half-eaten forest elk.",
            "dcCheck": "DC 14 Wisdom (Survival) to spot the scent markers before blundering into line of sight, or DC 13 Dexterity save to avoid snapping dried deadfall.",
            "monsters": [{"name": "Owlbear", "count": 1, "cr": 3}],
            "tactics": "The Owlbear screeches with ear-piercing fury and charges the largest martial combatant, attempting to Pin and Shred with its Beak.",
            "complication": "Dense undergrowth counts as Difficult Terrain (halving speed).",
            "loot": "A silver signet ring (25 gp) in the gullet, plus 3 pristine Owlbear feather quills (15 gp each).",
            "atmosphere": "Emerald Deepwoods"
        },
        {
            "id": "enc-forest-2",
            "title": "Midnight Dire Wolf Pack",
            "category": "combat",
            "danger": "Moderate",
            "narrative": "Yellow eyes gleam between ancient gnarled boles. Low guttering snarls echo from both sides of the game trail as an alpha and hunting pack encircle the party.",
            "dcCheck": "DC 13 Wisdom (Perception) to notice the circling flankers before combat begins.",
            "monsters": [{"name": "Dire Wolf", "count": 3, "cr": 1}],
            "tactics": "Dire Wolves utilize Pack Tactics to grant each other Advantage, focusing on tripping PCs to the ground.",
            "complication": "Howling wind causes torches to flicker and limits darkvision beyond 40 feet.",
            "loot": "Heavy winter pelts worth 40 gp total.",
            "atmosphere": "Moonlit Shadows"
        },
        {
            "id": "enc-forest-3",
            "title": "Ancient Moss-Grave & Whispering Dryad",
            "category": "discovery",
            "danger": "Low",
            "narrative": "A stone crypt choked with elderberry bushes hums with fey magic. A willow dryad steps from the bark, demanding an offering of clean water or song to reveal a hidden secret.",
            "dcCheck": "DC 12 Charisma (Persuasion or Performance) to gain the Dryad's blessing.",
            "monsters": [],
            "tactics": "Non-hostile unless the grove is damaged.",
            "complication": "Fey glamour causes compass needles and navigation checks to spin erratically.",
            "loot": "Charm of the Woodland (Advantage on next 3 Survival checks) and 2 Potions of Healing nestled in moss.",
            "atmosphere": "Fey Twilight"
        },
        {
            "id": "enc-forest-4",
            "title": "Goblin Snare-Trench Ambush",
            "category": "combat",
            "danger": "Low",
            "narrative": "A tripwire hidden under oak leaves snaps! A log pendulum swings from overhead as cackling goblins loose shortbows from tree blinds.",
            "dcCheck": "DC 14 Dexterity save to dodge the 2d10 bludgeoning pendulum.",
            "monsters": [{"name": "Goblin", "count": 4, "cr": 0.25}],
            "tactics": "Goblins use Nimble Escape each turn to Disengage or Hide behind tree trunks.",
            "complication": "Concealed pit trap (10 ft deep, 1d6 fall damage).",
            "loot": "Stolen merchant lockbox with 32 gp, 45 sp, and a vial of antitoxin.",
            "atmosphere": "Amber Canopy"
        }
    ],
    "Mountain": [
        {
            "id": "enc-mountain-1",
            "title": "Wyvern Roost on the Razor Crag",
            "category": "combat",
            "danger": "Deadly",
            "narrative": "A deafening screech echoes across the canyon as a reptilian shadow blotches out the mountain sun. Leathery wings beat the thin alpine air as a Wyvern dives with its venomous stinger.",
            "dcCheck": "DC 15 Dexterity save against surprise dive-bomb attack.",
            "monsters": [{"name": "Wyvern", "count": 1, "cr": 6}],
            "tactics": "Dives from altitude, attempts to grapple a light target and drop them onto the scree slope (fall damage), then stings with DC 15 Con save vs 7d6 poison.",
            "complication": "High altitude: characters without cold-weather gear make DC 10 Con saves vs Exhaustion.",
            "loot": "Wyvern venom sac (worth 200 gp to alchemists), and broken dwarven prospector skeleton with a +1 Dagger.",
            "atmosphere": "Alpine Gale"
        },
        {
            "id": "enc-mountain-2",
            "title": "Crag Scree Avalanche & Lost Hermit",
            "category": "hazard",
            "danger": "Moderate",
            "narrative": "A thunderous crack resounds from the peak above. Thousands of tons of loose granite and ice plummet down the switchback trail directly toward the party!",
            "dcCheck": "DC 14 Strength (Athletics) or Dexterity (Acrobatics) to scramble into a sheltered rock overhang; failure deals 4d10 bludgeoning.",
            "monsters": [],
            "tactics": "Environmental hazard requiring quick positioning or spell utility.",
            "complication": "Trail is obliterated, requiring 2 hours of clearing or a DC 15 climb.",
            "loot": "Dislodged quartz vein yields uncut gemstones worth 75 gp.",
            "atmosphere": "Storm Grey"
        },
        {
            "id": "enc-mountain-3",
            "title": "Chimera Overlook",
            "category": "combat",
            "danger": "Deadly",
            "narrative": "Perched on a natural stone archway, a three-headed horror—lion, goat, and red dragon—surveys the pass with smoldering breath.",
            "dcCheck": "DC 15 Wisdom (Perception) to spot the dragon head exhaling smoke plumes.",
            "monsters": [{"name": "Chimera", "count": 1, "cr": 6}],
            "tactics": "Opens with 7d8 Fire Breath (DC 15 Dex), then flies into melee with Claws, Horns, and Bite.",
            "complication": "Narrow 5-ft ledge. Shoving creatures risks a 50-ft drop into jagged rocks.",
            "loot": "Chimera horns (50 gp), 180 gp scattered in its high nest, and a Potion of Greater Healing.",
            "atmosphere": "Crimson Horizon"
        }
    ],
    "Swamp": [
        {
            "id": "enc-swamp-1",
            "title": "Sunken Hydra in the Black Fen",
            "category": "combat",
            "danger": "Deadly",
            "narrative": "Sulfuric bubbles burble to the surface of the black mire. Five serpent heads crowned with spined frills rise simultaneously, hissing in terrible unison.",
            "dcCheck": "DC 14 Wisdom (Nature) to recall that fire damage prevents severed heads from regenerating.",
            "monsters": [{"name": "Hydra", "count": 1, "cr": 8}],
            "tactics": "Makes multiple reactive Opportunity Attacks and targets bleeding creatures.",
            "complication": "Knee-deep water is Difficult Terrain; extinguishing fire requires actions.",
            "loot": "Sunken treasure chest in the mud with 220 gp, 110 sp, and an Elixir of Health.",
            "atmosphere": "Toxic Miasma"
        },
        {
            "id": "enc-swamp-2",
            "title": "Will-o'-Wisps & Quicksand Bog",
            "category": "hazard",
            "danger": "Moderate",
            "narrative": "Gentle blue orbs dance across the cypress trunks, whispering words of safety and treasure. Step forward, and the ground gives way into churning quicksand!",
            "dcCheck": "DC 13 Intelligence (Arcana) or Wisdom (Perception) to see through the lures; DC 14 Strength (Athletics) to escape sinking.",
            "monsters": [{"name": "Will-o'-Wisp", "count": 2, "cr": 2}],
            "tactics": "Wait for victims to begin sinking into quicksand, then shock them with lightning.",
            "complication": "Quicksand pulls creatures under; submerged creatures begin suffocating.",
            "loot": "Silver necklace with emerald pendant (85 gp) clinging to a buried skeletal hand.",
            "atmosphere": "Spectral Glow"
        }
    ],
    "Road": [
        {
            "id": "enc-road-1",
            "title": "Overturned Wagon & Highwayman Ambush",
            "category": "combat",
            "danger": "Low",
            "narrative": "A merchant's grain wagon lies on its side across the stone bridge, crates splintered. Crossbowmen rise from behind ditch blinds while their captain demands an exorbitant 'toll'.",
            "dcCheck": "DC 13 Wisdom (Insight) to sense the staged nature of the wreck before crossing the bridge.",
            "monsters": [
                {"name": "Bandit Captain", "count": 1, "cr": 2},
                {"name": "Bandit", "count": 4, "cr": 0.125}
            ],
            "tactics": "Bandits shoot from behind half-cover (+2 AC), while Captain engages in melee with Dagger and Scimitar.",
            "complication": "Bridge is bottlenecked; horses cannot pass without clearing debris.",
            "loot": "Lockbox with 85 gp, 3 bottles of fine Elverquisst wine (20 gp each), and forged guard transit papers.",
            "atmosphere": "Amber Sunset"
        },
        {
            "id": "enc-road-2",
            "title": "Wandering Merchant Caravan of Oakhaven",
            "category": "social",
            "danger": "Safe",
            "narrative": "Three stout draft horses pull colorful vardo wagons flanked by singing sellswords. The caravan master, a jolly halfling named Barnaby, offers fresh bread and exotic traveling wares.",
            "dcCheck": "DC 10 Charisma to barter for a 10% discount on rations and travel gear.",
            "monsters": [],
            "tactics": "Caravan guards (Veterans) defend if attacked.",
            "complication": "Caravan travels in the opposite direction and shares fresh rumors from the capital.",
            "loot": "Offers travel rations, lantern oil, healer's kits, and 1 Potion of Climbing for sale at standard book price.",
            "atmosphere": "Golden Lantern"
        }
    ],
    "Plains": [
        {
            "id": "enc-plains-1",
            "title": "Manticore Hunting over the Grasslands",
            "category": "combat",
            "danger": "Moderate",
            "narrative": "The open steppe offers nowhere to hide. A leonine beast with bat wings and a spined scorpion tail swoops in circles, raining iron tail spikes into the dirt.",
            "dcCheck": "DC 13 Dexterity save to take cover behind a horse or wagon when tail spikes fire.",
            "monsters": [{"name": "Manticore", "count": 1, "cr": 3}],
            "tactics": "Maintains flight distance while firing 3 Tail Spikes per round, landing only when targets are pinned.",
            "complication": "Treeless flatlands offer zero natural cover.",
            "loot": "Manticore tail spikes (make 6 piercing darts +1) and 60 gp in an old soldier's belt pouch.",
            "atmosphere": "Open Steppe Gold"
        }
    ],
    "Desert": [
        {
            "id": "enc-desert-1",
            "title": "Chasm of the Giant Scorpions",
            "category": "combat",
            "danger": "Moderate",
            "narrative": "The baking dunes tremble as twin chittering carapaces erupt from beneath the red sands, claws snapping like iron shears.",
            "dcCheck": "DC 13 Dexterity save vs being Grappled by large claws.",
            "monsters": [{"name": "Giant Scorpion", "count": 2, "cr": 3}],
            "tactics": "Grapple targets with both claws, then strike with lethal stinger poison (DC 12 Con vs 4d10).",
            "complication": "Extreme heat: disadvantage on checks without constant water hydration.",
            "loot": "Scorpion chitin (can be crafted into light medium armor) and 45 gp.",
            "atmosphere": "Scorching Sun"
        }
    ],
    "Coastal": [
        {
            "id": "enc-coastal-1",
            "title": "Sahuagin Tide-Raiders at the Coves",
            "category": "combat",
            "danger": "Moderate",
            "narrative": "Foaming breakers crash over the tidepools as webbed humanoid forms armed with coral tridents surge from the surf, smelling blood on the wind.",
            "dcCheck": "DC 14 Wisdom (Perception) to notice the glistening dorsal fins amidst the sea spray.",
            "monsters": [
                {"name": "Sahuagin", "count": 3, "cr": 0.5},
                {"name": "Reef Shark", "count": 1, "cr": 0.5}
            ],
            "tactics": "Sahuagin have Blood Frenzy (advantage on targets without full HP).",
            "complication": "Slippery wet rocks require DC 10 Acrobatics checks when dashing.",
            "loot": "Pearls worth 60 gp and carved whalebone idol.",
            "atmosphere": "Storm Waves"
        }
    ],
    "Underdark": [
        {
            "id": "enc-underdark-1",
            "title": "Phase Spider Nest in the Fungal Chasm",
            "category": "combat",
            "danger": "Moderate",
            "narrative": "Bioluminescent mushrooms cast sickly violet light across a chasm strung with shimmering ether-webs. Without warning, an eight-legged terror blinks into existence right behind the rearguard!",
            "dcCheck": "DC 14 Passive Perception to spot the shimmering planar distortion before the spider bites.",
            "monsters": [{"name": "Phase Spider", "count": 2, "cr": 3}],
            "tactics": "Shifts between Ethereal and Material plane, biting to inject paralyzing poison then vanishing.",
            "complication": "Pitch darkness; webs count as difficult terrain and burn with foul smoke.",
            "loot": "Phase spider silk glands (can craft 2 Potions of Invisibility components) and 90 gp.",
            "atmosphere": "Bioluminescent Violet"
        }
    ]
}

@app.get("/api/overworld")
async def get_overworld():
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    # Persist schema migration if needed
    if raw != overworld:
        write_json("overworld.json", overworld)
    return overworld

@app.post("/api/overworld")
async def save_overworld(payload: Dict[str, Any]):
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    active_map = get_active_map_ref(overworld)

    if "mapTitle" in payload:
        active_map["title"] = payload["mapTitle"]
    if "mapSubtitle" in payload:
        active_map["subtitle"] = payload["mapSubtitle"]
    if "mapUrl" in payload:
        active_map["mapUrl"] = payload["mapUrl"]
    if "scale" in payload:
        active_map["scale"] = payload["scale"]
    if "scaleMilesPerHex" in payload:
        active_map["scaleMilesPerHex"] = payload["scaleMilesPerHex"]

    overworld = ensure_overworld_schema(overworld, locations)
    write_json("overworld.json", overworld)
    return {"status": "success", "overworld": overworld}

@app.post("/api/overworld/maps")
async def create_or_update_overworld_map(payload: Dict[str, Any]):
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)

    map_id = payload.get("id")
    existing_map = next((m for m in overworld.get("maps", []) if m.get("id") == map_id), None) if map_id else None

    if existing_map:
        if "title" in payload and payload["title"]: existing_map["title"] = payload["title"]
        if "subtitle" in payload: existing_map["subtitle"] = payload["subtitle"]
        if "type" in payload and payload["type"]: existing_map["type"] = payload["type"]
        if "scaleMilesPerHex" in payload: existing_map["scaleMilesPerHex"] = int(payload["scaleMilesPerHex"])
        if "scale" in payload and payload["scale"]: existing_map["scale"] = payload["scale"]
        elif "scaleMilesPerHex" in payload: existing_map["scale"] = f"1 Hex = {payload['scaleMilesPerHex']} Miles"
        if "mapUrl" in payload and payload["mapUrl"]: existing_map["mapUrl"] = payload["mapUrl"]
        target_map = existing_map
    else:
        map_id = f"map-{uuid.uuid4().hex[:8]}"
        new_map = {
            "id": map_id,
            "title": payload.get("title", "New Regional Map"),
            "subtitle": payload.get("subtitle", "Exploration Tier"),
            "type": payload.get("type", "Province"),
            "scale": payload.get("scale") or f"1 Hex = {payload.get('scaleMilesPerHex', 6)} Miles",
            "scaleMilesPerHex": int(payload.get("scaleMilesPerHex", 6)),
            "mapUrl": payload.get("mapUrl") or "/static/images/overworld_default.svg",
            "partyMarker": {
                "x": 50.0, "y": 50.0, "label": "Adventuring Party", "visibleToPlayers": True, "terrain": "Forest"
            },
            "hexGrid": {"enabled": True, "opacity": 0.25, "size": 36},
            "fog": {"enabled": True, "revealedPoints": [{"x": 50.0, "y": 50.0, "radius": 9.0}]},
            "trail": [],
            "pins": []
        }
        overworld["maps"].append(new_map)
        target_map = new_map

    if payload.get("activate", True):
        overworld["activeMapId"] = map_id

    overworld = ensure_overworld_schema(overworld, locations)
    write_json("overworld.json", overworld)
    return {"status": "success", "map": target_map, "overworld": overworld}

@app.get("/api/overworld/tiers")
async def get_overworld_tiers():
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    return {"status": "success", "tiers": overworld.get("tiers", ["Kingdom", "Province", "Settlement", "Dungeon"])}

@app.post("/api/overworld/tiers")
async def add_overworld_tier(payload: Dict[str, Any]):
    name = (payload.get("tier") or payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tier name cannot be empty")
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    tiers = overworld.setdefault("tiers", ["Kingdom", "Province", "Settlement", "Dungeon"])
    if name not in tiers:
        tiers.append(name)
    write_json("overworld.json", overworld)
    return {"status": "success", "tiers": tiers, "overworld": overworld}

@app.delete("/api/overworld/tiers/{tier_name}")
async def delete_overworld_tier(tier_name: str):
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    tiers = overworld.setdefault("tiers", ["Kingdom", "Province", "Settlement", "Dungeon"])
    if len(tiers) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only remaining map tier.")
    tiers = [t for t in tiers if t.lower() != tier_name.lower()]
    overworld["tiers"] = tiers
    write_json("overworld.json", overworld)
    return {"status": "success", "tiers": tiers, "overworld": overworld}

@app.post("/api/overworld/maps/switch")
async def switch_overworld_map(payload: Dict[str, Any]):
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)

    target_id = payload.get("mapId")
    if target_id and any(m.get("id") == target_id for m in overworld.get("maps", [])):
        overworld["activeMapId"] = target_id

    overworld = ensure_overworld_schema(overworld, locations)
    write_json("overworld.json", overworld)
    return {"status": "success", "overworld": overworld}

@app.delete("/api/overworld/maps/{map_id}")
async def delete_overworld_map(map_id: str):
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)

    if len(overworld.get("maps", [])) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only remaining map tier.")

    overworld["maps"] = [m for m in overworld.get("maps", []) if m.get("id") != map_id]
    if overworld.get("activeMapId") == map_id:
        overworld["activeMapId"] = overworld["maps"][0]["id"]

    overworld = ensure_overworld_schema(overworld, locations)
    write_json("overworld.json", overworld)
    return {"status": "success", "overworld": overworld}

@app.post("/api/overworld/pin")
async def save_overworld_pin(payload: Dict[str, Any]):
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    active_map = get_active_map_ref(overworld)

    pins = active_map.get("pins", [])
    pin_id = payload.get("id") or f"pin-{uuid.uuid4().hex[:8]}"
    pin_data = {
        "id": pin_id,
        "locationId": payload.get("locationId", ""),
        "subMapId": payload.get("subMapId", ""),
        "title": payload.get("title", "New Landmark"),
        "type": payload.get("type", "Settlement"),
        "danger": payload.get("danger", "Low"),
        "population": payload.get("population", "Unknown"),
        "x": float(payload.get("x", 50.0)),
        "y": float(payload.get("y", 50.0)),
        "discovered": bool(payload.get("discovered", True)),
        "icon": payload.get("icon", "📍"),
        "notes": payload.get("notes", "")
    }
    idx = next((i for i, p in enumerate(pins) if p.get("id") == pin_id), None)
    if idx is not None:
        pins[idx] = pin_data
    else:
        pins.append(pin_data)
    active_map["pins"] = pins

    # If discovered, automatically add a fog reveal point around it
    if pin_data["discovered"]:
        reveals = active_map.setdefault("fog", {}).setdefault("revealedPoints", [])
        if not any(abs(r.get("x", 0) - pin_data["x"]) < 2 and abs(r.get("y", 0) - pin_data["y"]) < 2 for r in reveals):
            reveals.append({"x": pin_data["x"], "y": pin_data["y"], "radius": 7.0})

    overworld = ensure_overworld_schema(overworld, locations)
    write_json("overworld.json", overworld)
    return {"status": "success", "pin": pin_data, "overworld": overworld}

@app.delete("/api/overworld/pin/{pin_id}")
async def delete_overworld_pin(pin_id: str):
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    active_map = get_active_map_ref(overworld)

    active_map["pins"] = [p for p in active_map.get("pins", []) if p.get("id") != pin_id]
    overworld = ensure_overworld_schema(overworld, locations)
    write_json("overworld.json", overworld)
    return {"status": "success", "overworld": overworld}

@app.post("/api/overworld/party-marker")
async def update_overworld_party_marker(payload: Dict[str, Any]):
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    active_map = get_active_map_ref(overworld)

    marker = active_map.setdefault("partyMarker", {"x": 37.5, "y": 50.0, "label": "Adventuring Party", "visibleToPlayers": True, "terrain": "Forest"})
    prev_x = marker.get("x")
    prev_y = marker.get("y")

    if "x" in payload:
        marker["x"] = round(float(payload["x"]), 2)
    if "y" in payload:
        marker["y"] = round(float(payload["y"]), 2)
    if "label" in payload:
        marker["label"] = payload["label"]
    if "visibleToPlayers" in payload:
        marker["visibleToPlayers"] = bool(payload["visibleToPlayers"])
    if "terrain" in payload:
        marker["terrain"] = payload["terrain"]

    # Add reveal circle around new party location
    reveals = active_map.setdefault("fog", {}).setdefault("revealedPoints", [])
    reveals.append({"x": marker["x"], "y": marker["y"], "radius": 8.5})

    # If dropTrail or significant movement (> 2% displacement), log waypoint
    if payload.get("dropTrail", True):
        dist = ((marker["x"] - (prev_x or marker["x"]))**2 + (marker["y"] - (prev_y or marker["y"]))**2)**0.5
        if dist > 1.5:
            tw = read_json("time_weather.json", {"day": 1, "hour": 9})
            trail = active_map.setdefault("trail", [])
            trail.append({
                "id": f"tr-{uuid.uuid4().hex[:6]}",
                "x": marker["x"],
                "y": marker["y"],
                "day": tw.get("day", 1),
                "hour": tw.get("hour", 9),
                "label": f"March Day {tw.get('day', 1)}",
                "type": "march"
            })
            if len(trail) > 50:
                trail.pop(0)

    overworld = ensure_overworld_schema(overworld, locations)
    write_json("overworld.json", overworld)
    return {"status": "success", "partyMarker": marker, "overworld": overworld}

@app.post("/api/overworld/hex-grid")
async def update_overworld_hex_grid(payload: Dict[str, Any]):
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    active_map = get_active_map_ref(overworld)

    grid = active_map.setdefault("hexGrid", {"enabled": True, "opacity": 0.25, "size": 36})
    if "enabled" in payload:
        grid["enabled"] = bool(payload["enabled"])
    if "opacity" in payload:
        grid["opacity"] = float(payload["opacity"])
    if "size" in payload:
        grid["size"] = int(payload["size"])
    if "scaleMilesPerHex" in payload:
        active_map["scaleMilesPerHex"] = int(payload["scaleMilesPerHex"])

    overworld = ensure_overworld_schema(overworld, locations)
    write_json("overworld.json", overworld)
    return {"status": "success", "hexGrid": grid, "overworld": overworld}

@app.post("/api/overworld/fog/reveal")
async def reveal_overworld_fog(payload: Dict[str, Any]):
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    active_map = get_active_map_ref(overworld)

    fog = active_map.setdefault("fog", {"enabled": True, "revealedPoints": []})
    reveals = fog.setdefault("revealedPoints", [])
    x = float(payload.get("x", 50.0))
    y = float(payload.get("y", 50.0))
    radius = float(payload.get("radius", 8.0))
    reveals.append({"x": round(x, 2), "y": round(y, 2), "radius": round(radius, 2)})

    overworld = ensure_overworld_schema(overworld, locations)
    write_json("overworld.json", overworld)
    return {"status": "success", "fog": fog, "overworld": overworld}

@app.post("/api/overworld/fog/shroud")
async def shroud_overworld_fog(payload: Dict[str, Any] = None):
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    active_map = get_active_map_ref(overworld)

    payload = payload or {}
    fog = active_map.setdefault("fog", {"enabled": True, "revealedPoints": []})
    if payload.get("resetAll", False):
        pm = active_map.get("partyMarker", {"x": 37.5, "y": 50.0})
        fog["revealedPoints"] = [{"x": pm.get("x", 37.5), "y": pm.get("y", 50.0), "radius": 8.0}]
    else:
        x = float(payload.get("x", 0))
        y = float(payload.get("y", 0))
        radius = float(payload.get("radius", 8.0))
        fog["revealedPoints"] = [
            r for r in fog.get("revealedPoints", [])
            if ((r.get("x", 0) - x)**2 + (r.get("y", 0) - y)**2)**0.5 > radius
        ]

    overworld = ensure_overworld_schema(overworld, locations)
    write_json("overworld.json", overworld)
    return {"status": "success", "fog": fog, "overworld": overworld}

@app.post("/api/overworld/fog/toggle")
async def toggle_overworld_fog(payload: Dict[str, Any] = None):
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    active_map = get_active_map_ref(overworld)

    fog = active_map.setdefault("fog", {"enabled": True, "revealedPoints": []})
    if payload and "enabled" in payload:
        fog["enabled"] = bool(payload["enabled"])
    else:
        fog["enabled"] = not fog.get("enabled", True)

    overworld = ensure_overworld_schema(overworld, locations)
    write_json("overworld.json", overworld)
    return {"status": "success", "fog": fog, "overworld": overworld}

@app.post("/api/overworld/trail/camp")
async def drop_overworld_campsite(payload: Dict[str, Any] = None):
    payload = payload or {}
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    active_map = get_active_map_ref(overworld)

    pm = active_map.get("partyMarker", {"x": 37.5, "y": 50.0})
    tw = read_json("time_weather.json", {"day": 1, "hour": 20})
    travel_data = read_json("travel.json", {"history": []})

    camp_id = f"camp-{uuid.uuid4().hex[:6]}"
    day_num = tw.get("day", 1)
    hour_num = tw.get("hour", 20)
    label = payload.get("label") or f"Night {day_num} Camp"
    notes = payload.get("notes") or f"Campsite pitched at {hour_num:02d}:00. Terrain: {pm.get('terrain', 'Wilderness')}."

    trail = active_map.setdefault("trail", [])
    camp_waypoint = {
        "id": camp_id,
        "x": pm.get("x", 37.5),
        "y": pm.get("y", 50.0),
        "day": day_num,
        "hour": hour_num,
        "label": label,
        "type": "camp",
        "notes": notes
    }
    trail.append(camp_waypoint)

    # Sync into travel history
    travel_data.setdefault("history", []).append({
        "id": f"camp-{camp_id}",
        "type": "camp",
        "label": label,
        "day": day_num,
        "hour": hour_num,
        "marchHours": 0,
        "pace": travel_data.get("pace", "Normal"),
        "terrain": pm.get("terrain", "Wilderness"),
        "road": travel_data.get("road", "trail"),
        "miles": 0.0,
        "notes": f"Pitched {label}. {notes}",
        "timestamp": datetime.now().isoformat()
    })
    write_json("travel.json", travel_data)

    overworld = ensure_overworld_schema(overworld, locations)
    write_json("overworld.json", overworld)
    return {"status": "success", "camp": camp_waypoint, "overworld": overworld, "travel": travel_data}

@app.delete("/api/overworld/trail/{trail_id}")
async def delete_overworld_trail_point(trail_id: str):
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    active_map = get_active_map_ref(overworld)

    active_map["trail"] = [t for t in active_map.get("trail", []) if t.get("id") != trail_id]
    overworld = ensure_overworld_schema(overworld, locations)
    write_json("overworld.json", overworld)
    return {"status": "success", "overworld": overworld}

@app.post("/api/overworld/settlement/rest")
async def rest_party_at_settlement(payload: Dict[str, Any] = None):
    payload = payload or {}
    rest_type = payload.get("restType", "long")
    loc_name = payload.get("locationName", "Tavern")

    tw = read_json("time_weather.json", {"day": 1, "hour": 9, "minute": 0, "weather": {}, "moonPhase": "Full Moon"})
    party = read_json("party.json", [])
    stash = read_json("party_stash.json", {"items": [], "coins": {"pp": 0, "gp": 0, "sp": 0, "cp": 0}})

    if rest_type == "long":
        current_hr = tw.get("hour", 9) + 8
        tw["day"] = tw.get("day", 1) + (current_hr // 24)
        tw["hour"] = current_hr % 24
        tw["minute"] = 0

        # Fully restore HP, reset death saves
        for pc in party:
            pc["currentHp"] = pc.get("maxHp", 10)
            pc["tempHp"] = 0
            pc["deathSaves"] = {"successes": 0, "failures": 0}

        # Deduct 1 ration per PC from stash if available
        rations_consumed = 0
        party_count = len(party)
        for item in stash.get("items", []):
            if "ration" in item.get("name", "").lower() and item.get("qty", 0) > 0:
                consume = min(party_count - rations_consumed, item["qty"])
                item["qty"] -= consume
                rations_consumed += consume
                if rations_consumed >= party_count:
                    break

        summary = f"The party completed a Long Rest (8 hours) at {loc_name}. HP fully restored to maximum, death saves reset, and daily abilities refreshed. Game clock advanced to Day {tw['day']}, {tw['hour']:02d}:00."
    else:
        current_hr = tw.get("hour", 9) + 1
        tw["day"] = tw.get("day", 1) + (current_hr // 24)
        tw["hour"] = current_hr % 24
        summary = f"The party took a Short Rest (1 hour) at {loc_name}. Game clock advanced to {tw['hour']:02d}:{tw.get('minute', 0):02d}."

    write_json("time_weather.json", tw)
    write_json("party.json", party)
    write_json("party_stash.json", stash)

    return {
        "status": "success",
        "summary": summary,
        "restType": rest_type,
        "timeWeather": tw,
        "party": party
    }

@app.post("/api/overworld/encounter/roll")
async def roll_overland_encounter(payload: Dict[str, Any] = None):
    payload = payload or {}
    terrain = payload.get("terrain", "Forest")
    danger = payload.get("danger", "all")
    time_of_day = payload.get("timeOfDay", "Day")

    encounters_pool = OVERLAND_2024_ENCOUNTERS.get(terrain, OVERLAND_2024_ENCOUNTERS["Forest"])
    if danger != "all":
        filtered = [e for e in encounters_pool if e.get("danger", "").lower() == danger.lower()]
        if filtered:
            encounters_pool = filtered

    chosen = dict(random.choice(encounters_pool))

    # Match monsters against monsters.json catalog
    monsters_catalog = read_json("monsters.json", [])
    resolved_monsters = []
    for m in chosen.get("monsters", []):
        name = m.get("name")
        matched = find_bestiary_monster(monsters_catalog, name)
        resolved_monsters.append({
            "name": matched.get("name") if matched else name,
            "count": m.get("count", 1),
            "cr": matched.get("cr") if matched else m.get("cr", 1),
            "hp": int(matched.get("hp", 20)) if matched else 20,
            "ac": int(matched.get("ac", 12)) if matched else 12,
            "size": matched.get("size", "Medium") if matched else "Medium",
            "monsterId": matched.get("id") if matched else None
        })
    chosen["monsters"] = resolved_monsters
    chosen["terrain"] = terrain
    chosen["timeOfDay"] = time_of_day

    return {"status": "success", "encounter": chosen}

@app.post("/api/overworld/encounter/spawn")
async def spawn_overland_encounter_to_combat(payload: Dict[str, Any]):
    monsters_list = payload.get("monsters", [])
    if not monsters_list:
        raise HTTPException(status_code=400, detail="No monsters specified for combat")

    combat = read_json("combat.json", {"inCombat": True, "round": 1, "currentTurnIndex": 0, "combatants": []})
    combat["inCombat"] = True
    catalog = read_json("monsters.json", [])
    bstate = read_json("battlemap.json", get_default_battlemap_state())
    existing_tokens = bstate.get("tokens", [])

    token_index = len(existing_tokens)
    base_x = 950.0
    base_y = 650.0

    added_names = []
    new_combatants = []
    new_tokens = []

    for item in monsters_list:
        m_name = item.get("name", "Beast")
        count = max(1, min(12, int(item.get("count", 1))))

        matched = find_bestiary_monster(catalog, m_name)

        hp = int(matched.get("hp", 10)) if matched else int(item.get("hp", 20))
        ac = int(matched.get("ac", 10)) if matched else int(item.get("ac", 12))
        dex = matched.get("stats", {}).get("dex", 10) if matched else 10
        dex_mod = (dex - 10) // 2
        cr_str = str(matched.get("cr", item.get("cr", "1"))) if matched else str(item.get("cr", "1"))
        cr_val = float(cr_str) if cr_str.replace('.', '', 1).isdigit() else 0.25
        is_boss = cr_val >= 10 or ("boss" in m_name.lower()) or ("dragon" in m_name.lower())
        color = "#a855f7" if is_boss else "#ef4444"
        m_size = matched.get("size", "Medium") if matched else item.get("size", "Medium")
        size_squares = get_monster_size_squares(m_size)
        m_id = matched.get("id") if matched else (item.get("monsterId") or f"m-{uuid.uuid4().hex[:6]}")
        img_url = (matched.get("imageUrl") if matched else None) or f"/static/images/monsters/{m_id}.webp"

        for i in range(count):
            init_roll = float(random.randint(1, 20) + dex_mod)
            name_suffix = f" {i + 1}" if count > 1 else ""
            combatant_id = f"mob-{m_id}-{int(time.time()*1000)}-{token_index}"
            full_name = f"{m_name}{name_suffix}"

            combatant = {
                "id": combatant_id,
                "name": full_name,
                "type": "monster",
                "monsterId": m_id,
                "size": m_size,
                "initiative": init_roll,
                "tieBreaker": round(dex_mod + random.uniform(0.01, 0.99), 2),
                "currentHp": hp,
                "maxHp": hp,
                "tempHp": 0,
                "ac": ac,
                "conditions": [],
                "concentrating": False,
                "hidden": False,
                "visibleToPlayers": True,
                "imageUrl": img_url,
                "healthStatus": "Healthy",
                "statusColor": "emerald",
                "notes": f"CR {cr_str} | Spd: {matched.get('speed', '30 ft.') if matched else '30 ft.'}"
            }
            new_combatants.append(combatant)
            added_names.append(full_name)

            col = token_index % 5
            row = token_index // 5
            token_x = base_x + col * 75.0
            token_y = base_y + row * 75.0

            token = {
                "id": f"token_{uuid.uuid4().hex[:8]}",
                "name": full_name,
                "monsterId": m_id,
                "combatantId": combatant_id,
                "size": m_size,
                "sizeSquares": size_squares,
                "x": token_x,
                "y": token_y,
                "imageUrl": img_url,
                "currentHp": hp,
                "maxHp": hp,
                "color": color,
                "visibleToPlayers": True
            }
            new_tokens.append(token)
            token_index += 1

    combat.setdefault("combatants", []).extend(new_combatants)
    combat["combatants"].sort(key=lambda c: (c.get("initiative", 0), c.get("tieBreaker", 0)), reverse=True)
    write_json("combat.json", combat)

    # Save tokens to battlemap.json
    existing_tokens.extend(new_tokens)
    bstate["tokens"] = existing_tokens
    bstate["updatedAt"] = time.time()
    write_json("battlemap.json", bstate)

    return {
        "status": "success",
        "addedCombatants": added_names,
        "combat": combat,
        "tokens": new_tokens
    }

@app.post("/api/overworld/broadcast")
async def broadcast_overworld_to_players():
    locations = read_json("locations.json", [])
    raw = read_json("overworld.json", None)
    overworld = ensure_overworld_schema(raw, locations)
    active_map = get_active_map_ref(overworld)

    fog = active_map.get("fog", {"enabled": True, "revealedPoints": []})
    fog_enabled = fog.get("enabled", True)
    visible_pins = [p for p in active_map.get("pins", []) if (p.get("discovered", False) or not fog_enabled)]

    player_overworld = {
        "mapTitle": active_map.get("title", "Regional Map"),
        "mapSubtitle": active_map.get("subtitle", "Overland Journey & Discovered Landmarks"),
        "type": active_map.get("type", "Kingdom"),
        "mapUrl": active_map.get("mapUrl", "/static/images/overworld_default.svg"),
        "scaleMilesPerHex": active_map.get("scaleMilesPerHex", 24),
        "partyMarker": active_map.get("partyMarker", {"x": 37.5, "y": 50.0, "label": "Adventuring Party", "visibleToPlayers": True}),
        "hexGrid": active_map.get("hexGrid", {"enabled": True, "opacity": 0.25, "size": 36}),
        "fog": active_map.get("fog", {"enabled": True, "revealedPoints": []}),
        "trail": active_map.get("trail", []),
        "pins": visible_pins
    }
    broadcast_data = {
        "active": True,
        "title": player_overworld["mapTitle"],
        "subtitle": f"{player_overworld['mapSubtitle']} • {len(visible_pins)} Discovered Landmarks",
        "content": "Cartographic projection of the party's overland journey and known points of interest.",
        "type": "regional_map",
        "imageUrl": player_overworld["mapUrl"],
        "overworld": player_overworld
    }
    write_json("broadcast.json", broadcast_data)
    return {"status": "success", "broadcast": broadcast_data}

# -------------------------------------------------------------
# FACTION RELATIONS MATRIX & BETWEEN-SESSION "FACTION TURN" ENGINE
# -------------------------------------------------------------
@app.get("/api/factions/relations")
async def get_faction_relations():
    return read_json("faction_relations.json", get_default_faction_relations())

@app.post("/api/factions/relations")
async def save_faction_relation(payload: Dict[str, Any]):
    state = read_json("faction_relations.json", get_default_faction_relations())
    if "relations" in payload and isinstance(payload["relations"], list):
        state["relations"] = payload["relations"]
    elif "factionA" in payload and "factionB" in payload:
        fac_a = payload["factionA"].strip()
        fac_b = payload["factionB"].strip()
        status = payload.get("status", "Neutral")
        note = payload.get("note", "")
        rel_id = payload.get("id") or f"rel-{uuid.uuid4().hex[:6]}"
        relations = state.get("relations", [])
        existing = next((r for r in relations if {r.get("factionA"), r.get("factionB")} == {fac_a, fac_b}), None)
        if existing:
            existing["status"] = status
            existing["note"] = note
        else:
            relations.append({"id": rel_id, "factionA": fac_a, "factionB": fac_b, "status": status, "note": note})
        state["relations"] = relations
    write_json("faction_relations.json", state)
    return {"status": "success", "factionRelations": state}

@app.post("/api/factions/turn")
async def run_faction_turn_simulator(payload: Optional[Dict[str, Any]] = None):
    payload = payload or {}
    target_faction_id = payload.get("factionId", "all")
    factions = read_json("factions.json", [])
    rel_state = read_json("faction_relations.json", get_default_faction_relations())
    quests_data = read_json("quests.json", {"quests": [], "rumors": []})
    if isinstance(quests_data, list):
        quests_data = {"quests": quests_data, "rumors": []}
    rumors = quests_data.get("rumors", [])
    tw = read_json("time_weather.json", {"day": 1})
    day_num = tw.get("day", 1)

    maneuver_templates = [
        "dispatched covert agents to secure leverage in {hq}",
        "pressured rival merchants and fortified checkpoints near {hq}",
        "intercepted a courier carrying sensitive dispatches from {rival}",
        "recruited veteran mercenaries to accelerate their agenda: {goal}",
        "bribed harbor officials to divert supplies toward {hq}"
    ]

    turn_events = []
    generated_rumors = []

    for fac in factions:
        if target_faction_id != "all" and fac.get("id") != target_faction_id:
            continue
        roll = random.randint(1, 20)
        fac_name = fac.get("name", "Faction")
        hq = fac.get("headquarters") or "the city wards"
        rivals = fac.get("rivals") or ["rival factions"]
        rival_name = random.choice(rivals)
        goal_short = (fac.get("goals") or "expanding influence")[:75]

        clocks = fac.get("clocks", [])
        active_clocks = [c for c in clocks if c.get("currentTicks", 0) < c.get("totalTicks", 4)]

        if roll >= 15:
            ticks_added = 2 if roll == 20 else 1
            outcome_type = "Major Breakthrough" if roll == 20 else "Goal Advanced"
        elif roll >= 8:
            ticks_added = 1
            outcome_type = "Steady Progress"
        else:
            ticks_added = 0
            outcome_type = "Stymied by Rivals"

        clock_msg = ""
        completed_clock_outcome = ""
        if ticks_added > 0 and active_clocks:
            chosen_clock = active_clocks[0]
            old_t = chosen_clock.get("currentTicks", 0)
            max_t = chosen_clock.get("totalTicks", 4)
            new_t = min(max_t, old_t + ticks_added)
            chosen_clock["currentTicks"] = new_t
            clock_msg = f"Clock '{chosen_clock.get('title')}' advanced ({old_t} → {new_t}/{max_t})."
            if new_t >= max_t:
                completed_clock_outcome = chosen_clock.get("outcome") or f"{fac_name} completed '{chosen_clock.get('title')}'!"
                rumor_text = f"[FACTION EVENT] {completed_clock_outcome}"
                veracity = "True"
            else:
                maneuver = random.choice(maneuver_templates).format(hq=hq, rival=rival_name, goal=goal_short)
                rumor_text = f"Whispers in {hq} claim that {fac_name} {maneuver} ({chosen_clock.get('title')}: {new_t}/{max_t})."
                veracity = "Partially True" if roll < 15 else "True"

            new_rumor = {
                "id": f"rum-fac-{uuid.uuid4().hex[:6]}",
                "text": rumor_text,
                "source": f"Faction Turn ({fac_name})",
                "location": hq,
                "veracity": veracity,
                "active": True
            }
            rumors.insert(0, new_rumor)
            generated_rumors.append(new_rumor)
        else:
            clock_msg = f"Opposition from {rival_name} stalled {fac_name}'s operations this turn."

        ev_record = {
            "id": f"ft-{uuid.uuid4().hex[:6]}",
            "day": f"Day {day_num}",
            "faction": fac_name,
            "roll": roll,
            "outcomeType": outcome_type,
            "summary": clock_msg,
            "completedOutcome": completed_clock_outcome
        }
        turn_events.append(ev_record)

        # If a clock completed, also record in campaign timeline!
        if completed_clock_outcome:
            tl_data = normalize_timeline(read_json("timeline.json", get_campaign_timeline_default()))
            tl_data.setdefault("events", []).append({
                "id": f"tl-fac-{uuid.uuid4().hex[:6]}",
                "era": "current",
                "dateLabel": f"Day {day_num} (348 P.R.)",
                "sortOrder": 348000 + int(day_num),
                "title": f"Faction Milestone: {fac_name}",
                "category": "Faction Turn",
                "location": hq,
                "factions": [fac_name],
                "description": completed_clock_outcome,
                "isSessionLog": True,
                "sourceId": fac.get("id", "")
            })
            tl_data["events"].sort(key=lambda x: x.get("sortOrder", 0) if isinstance(x, dict) else 0)
            write_json("timeline.json", tl_data)

    quests_data["rumors"] = rumors
    write_json("quests.json", quests_data)
    write_json("factions.json", factions)

    history = rel_state.get("turnHistory", [])
    rel_state["turnHistory"] = (turn_events + history)[:25]
    write_json("faction_relations.json", rel_state)

    return {
        "status": "success",
        "events": turn_events,
        "generatedRumors": generated_rumors,
        "factions": factions,
        "rumors": rumors,
        "factionRelations": rel_state,
        "timeline": normalize_timeline(read_json("timeline.json", get_campaign_timeline_default()))
    }

# -------------------------------------------------------------
# PANTHEON, DEITIES & COSMIC CULTS + PIETY TRACKER
# -------------------------------------------------------------
@app.get("/api/pantheon")
async def get_pantheon():
    return read_json("pantheon.json", get_default_pantheon())

@app.post("/api/pantheon")
async def save_deity(payload: Dict[str, Any]):
    pantheon = read_json("pantheon.json", get_default_pantheon())
    deity_id = payload.get("id") or f"deity-{uuid.uuid4().hex[:8]}"
    deity_data = {
        "id": deity_id,
        "name": payload.get("name", "Unnamed Deity"),
        "title": payload.get("title", "Immortal Sovereign"),
        "category": payload.get("category", "Prime Deity"),
        "alignment": payload.get("alignment", "Neutral"),
        "domains": payload.get("domains", ["Life"]),
        "symbol": payload.get("symbol", "Sacred Emblem"),
        "symbolIcon": payload.get("symbolIcon", "✨"),
        "worshippers": payload.get("worshippers", ""),
        "rivals": payload.get("rivals", []),
        "tenets": payload.get("tenets", []),
        "pietyBoons": payload.get("pietyBoons", {
            "3": "Devotee Boon (Piety 3+): Minor divine blessing.",
            "10": "Votary Boon (Piety 10+): Once per Long Rest domain spell.",
            "25": "Disciple Boon (Piety 25+): Supernatural resistance and aura.",
            "50": "Champion Boon (Piety 50+): +2 to primary ability score (max 22)."
        }),
        "description": payload.get("description", ""),
        "imageUrl": payload.get("imageUrl", "")
    }
    idx = next((i for i, d in enumerate(pantheon) if d.get("id") == deity_id), None)
    if idx is not None:
        pantheon[idx] = deity_data
    else:
        pantheon.insert(0, deity_data)
    write_json("pantheon.json", pantheon)
    return {"status": "success", "deity": deity_data, "pantheon": pantheon}

@app.delete("/api/pantheon/{deity_id}")
async def delete_deity(deity_id: str):
    pantheon = read_json("pantheon.json", get_default_pantheon())
    pantheon = [d for d in pantheon if d.get("id") != deity_id]
    write_json("pantheon.json", pantheon)
    return {"status": "success", "pantheon": pantheon}

@app.post("/api/pantheon/{deity_id}/broadcast")
async def broadcast_deity_symbol(deity_id: str):
    pantheon = read_json("pantheon.json", get_default_pantheon())
    deity = next((d for d in pantheon if d.get("id") == deity_id), None)
    if not deity:
        raise HTTPException(status_code=404, detail="Deity not found")

    domains_str = ", ".join(deity.get("domains", []))
    tenets_list = deity.get("tenets", [])
    tenets_text = "\n".join([f"• {t}" for t in tenets_list])
    content_body = f"Holy Symbol: {deity.get('symbolIcon', '✨')} {deity.get('symbol', '')}\n\n{deity.get('description', '')}\n\nTenets of Faith:\n{tenets_text}"

    broadcast_data = {
        "active": True,
        "title": deity.get("name", "Divine Icon"),
        "subtitle": f"{deity.get('title', '')} • {deity.get('alignment', '')} • Domains: {domains_str}",
        "content": content_body,
        "type": "deity",
        "imageUrl": deity.get("imageUrl", ""),
        "deity": deity
    }
    write_json("broadcast.json", broadcast_data)
    return {"status": "success", "broadcast": broadcast_data}

@app.post("/api/party/{pc_id}/piety")
async def update_pc_piety(pc_id: str, payload: Dict[str, Any]):
    party = read_json("party.json", [])
    party = ensure_party_inventory_defaults(party)
    pc = next((p for p in party if p.get("id") == pc_id), None)
    if not pc:
        raise HTTPException(status_code=404, detail="PC not found")

    if "deityId" in payload:
        pc["deityId"] = payload["deityId"]
    if "deityName" in payload:
        pc["deityName"] = payload["deityName"]
    if "delta" in payload:
        pc["pietyScore"] = max(0, int(pc.get("pietyScore") or 1) + int(payload["delta"]))
    elif "pietyScore" in payload:
        pc["pietyScore"] = max(0, int(payload["pietyScore"]))

    write_json("party.json", party)
    return {"status": "success", "pc": pc, "party": party}

# -------------------------------------------------------------
# CAMPAIGN HISTORICAL TIMELINE & ERAS CHRONOLOGY
# -------------------------------------------------------------
@app.get("/api/timeline")
async def get_timeline():
    return normalize_timeline(read_json("timeline.json", get_campaign_timeline_default()))

@app.post("/api/timeline")
async def save_timeline_event(payload: Dict[str, Any]):
    tl_data = normalize_timeline(read_json("timeline.json", get_campaign_timeline_default()))
    events = tl_data.get("events", [])
    ev_id = payload.get("id") or f"tl-{uuid.uuid4().hex[:8]}"
    ev_data = {
        "id": ev_id,
        "era": payload.get("era", "current"),
        "dateLabel": payload.get("dateLabel", "Day 1 (348 P.R.)"),
        "sortOrder": int(payload.get("sortOrder", 348001)),
        "title": payload.get("title", "Historical Event"),
        "category": payload.get("category", "Campaign Milestone"),
        "location": payload.get("location", ""),
        "factions": payload.get("factions", []),
        "description": payload.get("description", ""),
        "isSessionLog": bool(payload.get("isSessionLog", False)),
        "sourceId": payload.get("sourceId", "")
    }
    idx = next((i for i, e in enumerate(events) if e.get("id") == ev_id), None)
    if idx is not None:
        events[idx] = ev_data
    else:
        events.append(ev_data)
    events.sort(key=lambda x: x.get("sortOrder", 0))
    tl_data["events"] = events
    write_json("timeline.json", tl_data)
    return {"status": "success", "event": ev_data, "timeline": tl_data}

@app.delete("/api/timeline/{event_id}")
async def delete_timeline_event(event_id: str):
    tl_data = normalize_timeline(read_json("timeline.json", get_campaign_timeline_default()))
    tl_data["events"] = [e for e in tl_data.get("events", []) if e.get("id") != event_id]
    write_json("timeline.json", tl_data)
    return {"status": "success", "timeline": tl_data}

@app.post("/api/timeline/eras")
async def save_timeline_era(payload: Dict[str, Any]):
    tl_data = normalize_timeline(read_json("timeline.json", get_campaign_timeline_default()))
    eras = tl_data.get("eras", [])
    era_id = payload.get("id")
    if not era_id:
        clean_name = "".join(c.lower() if c.isalnum() else "_" for c in payload.get("name", "era")).strip("_")[:12]
        era_id = f"era_{clean_name}_{uuid.uuid4().hex[:4]}"
    
    era_data = {
        "id": era_id,
        "name": payload.get("name", "New Era"),
        "icon": payload.get("icon", "⏳"),
        "badgeColor": payload.get("badgeColor", "sky"),
        "description": payload.get("description", "")
    }
    idx = next((i for i, er in enumerate(eras) if er.get("id") == era_id), None)
    if idx is not None:
        eras[idx] = era_data
    else:
        eras.append(era_data)
    tl_data["eras"] = eras
    write_json("timeline.json", tl_data)
    return {"status": "success", "era": era_data, "timeline": tl_data}

@app.delete("/api/timeline/eras/{era_id}")
async def delete_timeline_era(era_id: str):
    tl_data = normalize_timeline(read_json("timeline.json", get_campaign_timeline_default()))
    eras = [er for er in tl_data.get("eras", []) if er.get("id") != era_id]
    if not eras:
        raise HTTPException(status_code=400, detail="Cannot delete all eras. At least one era must remain.")
    tl_data["eras"] = eras
    fallback_era = eras[0]["id"]
    for ev in tl_data.get("events", []):
        if ev.get("era") == era_id:
            ev["era"] = fallback_era
    write_json("timeline.json", tl_data)
    return {"status": "success", "timeline": tl_data}

@app.post("/api/timeline/sync")
async def sync_session_log_to_timeline():
    tl_data = normalize_timeline(read_json("timeline.json", get_campaign_timeline_default()))
    events = tl_data.get("events", [])
    existing_sources = {e.get("sourceId") for e in events if e.get("sourceId")}
    quests_data = read_json("quests.json", {"quests": [], "rumors": []})
    quests = quests_data.get("quests", []) if isinstance(quests_data, dict) else quests_data
    notes = read_json("session_notes.json", [])
    tw = read_json("time_weather.json", {"day": 1})
    day_num = int(tw.get("day", 1))
    added = 0

    for q in quests:
        q_id = q.get("id")
        if q.get("status") == "Completed" and q_id and q_id not in existing_sources:
            events.append({
                "id": f"tl-qst-{uuid.uuid4().hex[:6]}",
                "era": "current",
                "dateLabel": f"Day {day_num} (348 P.R.)",
                "sortOrder": 348000 + day_num,
                "title": f"Quest Completed: {q.get('title')}",
                "category": "Quest Completed",
                "location": q.get("location") or "Shattered Coast",
                "factions": [q.get("giver")] if q.get("giver") else [],
                "description": q.get("summary") or f"Completed quest '{q.get('title')}'.",
                "isSessionLog": True,
                "sourceId": q_id
            })
            existing_sources.add(q_id)
            added += 1

    for n in notes:
        n_id = n.get("id")
        if n.get("tag") in ("quest", "combat") and n_id and n_id not in existing_sources:
            text = n.get("text", "")
            events.append({
                "id": f"tl-note-{uuid.uuid4().hex[:6]}",
                "era": "current",
                "dateLabel": n.get("timestamp") or f"Day {day_num} (348 P.R.)",
                "sortOrder": 348000 + day_num,
                "title": text[:68] + ("..." if len(text) > 68 else ""),
                "category": f"Session Log (#{n.get('tag')})",
                "location": "",
                "factions": [],
                "description": text,
                "isSessionLog": True,
                "sourceId": n_id
            })
            existing_sources.add(n_id)
            added += 1

    events.sort(key=lambda x: x.get("sortOrder", 0))
    tl_data["events"] = events
    write_json("timeline.json", tl_data)
    return {"status": "success", "added": added, "timeline": tl_data}

@app.get("/api/timeline/recap")
async def generate_session_recap():
    manifest = get_campaigns_manifest()
    active_id = manifest.get("activeCampaignId", "default")
    active_camp = next((c for c in manifest.get("campaigns", []) if c.get("id") == active_id), None)
    camp_name = active_camp.get("name", "Active Campaign") if active_camp else "Active Campaign"

    tw = read_json("time_weather.json", {"day": 1, "hour": 9, "minute": 0, "season": "Autumn", "weather": "Clear"})
    day_num = int(tw.get("day", 1))
    season = tw.get("season", "Autumn")
    weather_raw = tw.get("weather", "Clear")
    if isinstance(weather_raw, dict):
        precip = weather_raw.get("precipitation") or "Clear Skies"
        temp = weather_raw.get("temperature") or "Mild"
        weather_desc = f"{precip}, {temp}"
    else:
        weather_desc = str(weather_raw)
    hour = int(tw.get("hour", 9))
    minute = int(tw.get("minute", 0))
    time_str = f"Day {day_num}, {hour:02d}:{minute:02d} ({season} • {weather_desc})"

    party = read_json("party.json", [])
    combat = read_json("combat.json", {"inCombat": False, "round": 1, "combatants": []})
    quests_data = read_json("quests.json", {"quests": [], "rumors": []})
    quests = quests_data.get("quests", []) if isinstance(quests_data, dict) else quests_data
    factions = read_json("factions.json", [])
    secrets = read_json("secrets.json", [])
    notes = read_json("session_notes.json", [])

    completed_quests = [q for q in quests if q.get("status") == "Completed"]
    active_quests = [q for q in quests if q.get("status") == "Active"]

    party_lines = []
    for pc in party:
        hp_status = f"{pc.get('currentHp')}/{pc.get('maxHp')} HP"
        if pc.get('currentHp', 0) == 0:
            hp_status += " (DOWN / UNCONSCIOUS)"
        party_lines.append(f"- **{pc.get('name')}** ({pc.get('classRole', 'Hero')}, Lv {pc.get('level', 1)}): {hp_status}")

    md_lines = [
        f"# 🛡️ Campaign Chronicle: Session Recap — Day {day_num}",
        f"**Campaign**: {camp_name} • **Date**: {time_str}\n",
        "## 👥 Adventuring Party Vitals",
        "\n".join(party_lines) if party_lines else "- No party members registered.",
        "\n## ⚔️ Combat & Tactical Engagements"
    ]

    cbs = combat.get("combatants", [])
    if combat.get("inCombat") or cbs:
        monsters = [c.get("name") for c in cbs if c.get("type") == "monster"]
        md_lines.append(f"- **Combat State**: {'Active Combat' if combat.get('inCombat') else 'Encounter Resolved'} (Round {combat.get('round', 1)})")
        if monsters:
            md_lines.append(f"- **Adversaries Engaged**: {', '.join(monsters)}")
    else:
        md_lines.append("- No active tactical engagements recorded.")

    md_lines.append("\n## 📜 Quests & Milestones")
    if completed_quests:
        md_lines.append("### Completed:")
        for q in completed_quests:
            md_lines.append(f"- **{q.get('title')}** ({q.get('location') or 'World'}): {q.get('summary') or 'Quest resolved.'}")
    if active_quests:
        md_lines.append("### Ongoing Quests:")
        for q in active_quests:
            objs = [o.get("description", "") for o in q.get("objectives", []) if o.get("completed")]
            obj_str = f" ({len(objs)}/{len(q.get('objectives', []))} objectives complete)" if q.get("objectives") else ""
            md_lines.append(f"- **{q.get('title')}**{obj_str}: {q.get('summary') or 'In progress.'}")
    if not completed_quests and not active_quests:
        md_lines.append("- No quest progression logged.")

    md_lines.append("\n## ⏳ Factions & Schemes")
    faction_lines = []
    for f in factions:
        clocks = f.get("clocks", [])
        if clocks:
            clock_strs = []
            for c in clocks:
                c_title = c.get("title") or c.get("name") or "Scheme"
                c_curr = c.get("currentTicks") if c.get("currentTicks") is not None else c.get("progress", 0)
                c_tot = c.get("totalTicks") if c.get("totalTicks") is not None else c.get("segments", c.get("max", 4))
                clock_strs.append(f"{c_title}: {c_curr}/{c_tot} ticks")
            faction_lines.append(f"- **{f.get('name')}**: {', '.join(clock_strs)}")
        elif f.get("clockSegments"):
            faction_lines.append(f"- **{f.get('name')}**: Clock {f.get('clockProgress', 0)}/{f.get('clockSegments', 4)} ticks")
    if faction_lines:
        md_lines.extend(faction_lines)
    else:
        md_lines.append("- Faction clocks steady.")

    md_lines.append("\n## 🔍 Discovered Secrets & Lore")
    discovered_secrets = [s for s in secrets if s.get("status") in ("Discovered", "Revealed", "discovered")]
    if discovered_secrets:
        for s in discovered_secrets[:5]:
            md_lines.append(f"- **{s.get('title', 'Secret')}**: {s.get('description', '')}")
    else:
        md_lines.append("- No new clues discovered this session.")

    md_lines.append("\n## 📝 Session Notes & Highlights")
    if notes:
        for n in notes[-6:]:
            md_lines.append(f"- [{n.get('tag', 'Note').upper()}] {n.get('text', '')}")
    else:
        md_lines.append("- No additional notes recorded.")

    full_markdown = "\n".join(md_lines)

    return {
        "status": "success",
        "day": day_num,
        "dateStr": time_str,
        "title": f"Session Recap — Day {day_num}",
        "campaign": camp_name,
        "markdown": full_markdown,
        "recap_markdown": full_markdown
    }

@app.post("/api/timeline/recap/save")
async def save_session_recap_to_timeline(payload: Dict[str, Any]):
    recap_data = await generate_session_recap()
    md_content = payload.get("markdown") or recap_data.get("markdown")
    day_num = recap_data.get("day", 1)
    
    tl_data = normalize_timeline(read_json("timeline.json", get_campaign_timeline_default()))
    events = tl_data.get("events", [])
    ev_id = f"tl-recap-{uuid.uuid4().hex[:6]}"
    ev_data = {
        "id": ev_id,
        "era": "current",
        "dateLabel": f"Day {day_num} (348 P.R.)",
        "sortOrder": 348000 + int(day_num),
        "title": f"Session Chronicle Recap — Day {day_num}",
        "category": "Session Chronicle",
        "location": payload.get("location", "Shattered Coast"),
        "factions": [],
        "description": md_content,
        "isSessionLog": True,
        "sourceId": ev_id
    }
    events.append(ev_data)
    events.sort(key=lambda x: x.get("sortOrder", 0))
    tl_data["events"] = events
    write_json("timeline.json", tl_data)
    return {"status": "success", "event": ev_data, "timeline": tl_data}

@app.post("/api/timeline/log-combat-victory")
async def log_combat_victory_to_timeline(payload: Dict[str, Any]):
    title = payload.get("title", "Victory in Combat")
    monster_name = payload.get("monsterName", "Adversaries")
    rounds = payload.get("rounds", 1)
    xp = payload.get("xp", 0)
    notes = payload.get("notes", "")

    tw = read_json("time_weather.json", {"day": 1})
    day_num = int(tw.get("day", 1))

    tl_data = normalize_timeline(read_json("timeline.json", get_campaign_timeline_default()))
    events = tl_data.get("events", [])
    ev_id = f"tl-combat-{uuid.uuid4().hex[:6]}"
    ev_data = {
        "id": ev_id,
        "era": "current",
        "dateLabel": f"Day {day_num} (348 P.R.)",
        "sortOrder": 348000 + int(day_num),
        "title": f"⚔️ Tactical Victory: {title}",
        "category": "Combat Victory",
        "location": payload.get("location", "Dungeon / Field"),
        "factions": [],
        "description": f"The party vanquished {monster_name} in {rounds} combat round(s). Awarded {xp} XP. {notes}".strip(),
        "isSessionLog": True,
        "sourceId": ev_id
    }
    events.append(ev_data)
    events.sort(key=lambda x: x.get("sortOrder", 0))
    tl_data["events"] = events
    write_json("timeline.json", tl_data)
    return {"status": "success", "event": ev_data, "timeline": tl_data}

@app.get("/api/timeline/export-markdown")
async def export_timeline_markdown(format: str = "download"):
    tl_data = normalize_timeline(read_json("timeline.json", get_campaign_timeline_default()))
    eras = tl_data.get("eras", [])
    events = tl_data.get("events", [])
    manifest = get_campaigns_manifest()
    active_id = manifest.get("activeCampaignId", "default")
    active_camp = next((c for c in manifest.get("campaigns", []) if c.get("id") == active_id), None)
    camp_name = active_camp.get("name", "Active Campaign") if active_camp else "Active Campaign"

    lines = [
        f"# ⏳ Historical Timeline & Campaign Chronicle — {camp_name}",
        f"*Compiled automatically on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n"
    ]

    for era in eras:
        era_id = era.get("id")
        lines.append(f"## {era.get('icon', '⏳')} {era.get('name', 'Era')}")
        if era.get("description"):
            lines.append(f"*{era.get('description')}*\n")

        era_events = [e for e in events if e.get("era") == era_id]
        if not era_events:
            lines.append("*(No recorded historical milestones in this era)*\n")
            continue

        for ev in era_events:
            loc_str = f" • Location: {ev.get('location')}" if ev.get('location') else ""
            cat_str = f"[{ev.get('category', 'Milestone')}]"
            lines.append(f"### {ev.get('title', 'Event')} — `{ev.get('dateLabel', 'Undated')}` {cat_str}{loc_str}")
            lines.append(f"{ev.get('description', '')}\n")

    full_md = "\n".join(lines)
    filename = f"Timeline_Chronicle_{active_id}_{datetime.now().strftime('%Y%m%d')}.md"

    if format == "json":
        return {
            "status": "success",
            "markdown": full_md,
            "filename": filename
        }

    return Response(
        content=full_md,
        media_type="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

# -------------------------------------------------------------
# WILDERNESS TRAVEL, HAZARDS & FORAGING CALCULATOR
# -------------------------------------------------------------
@app.get("/api/travel")
async def get_travel_state():
    return read_json("travel.json", get_default_travel_state())

@app.post("/api/travel")
async def save_travel_state(payload: Dict[str, Any]):
    state = read_json("travel.json", get_default_travel_state())
    state.update(payload)
    write_json("travel.json", state)
    return {"status": "success", "travel": state}

@app.post("/api/travel/march")
async def log_travel_march(payload: Dict[str, Any]):
    march_hours = int(payload.get("marchHours", 8))
    pace = payload.get("pace", "Normal")
    terrain = payload.get("terrain", "Forest")
    road = payload.get("road", "trail")
    miles = float(payload.get("miles", 24.0))
    notes = payload.get("notes", "")

    # Advance campaign in-game clock
    time_state = read_json("time_weather.json", {
        "day": 1, "hour": 9, "minute": 0,
        "weather": {"temperature": "Mild", "wind": "Calm", "precipitation": "Clear", "tacticalEffect": "None"},
        "moonPhase": "Waxing Crescent",
        "activeTimers": []
    })
    minutes_to_add = march_hours * 60
    current_min = time_state.get("minute", 0) + minutes_to_add
    extra_hours = current_min // 60
    time_state["minute"] = current_min % 60
    current_hour = time_state.get("hour", 9) + extra_hours
    extra_days = current_hour // 24
    time_state["hour"] = current_hour % 24
    time_state["day"] = time_state.get("day", 1) + extra_days

    # Update timers
    expired_timers = []
    remaining_timers = []
    for timer in time_state.get("activeTimers", []):
        rem = timer.get("remainingMinutes", 0) - minutes_to_add
        if rem <= 0:
            expired_timers.append(timer.get("name", "Timer"))
        else:
            timer["remainingMinutes"] = rem
            remaining_timers.append(timer)
    time_state["activeTimers"] = remaining_timers

    write_json("time_weather.json", time_state)

    # Append to travel march history
    travel_state = read_json("travel.json", get_default_travel_state())
    history = travel_state.get("history", [])
    march_entry = {
        "id": f"march-{uuid.uuid4().hex[:6]}",
        "day": time_state.get("day", 1),
        "hour": time_state.get("hour", 9),
        "marchHours": march_hours,
        "pace": pace,
        "terrain": terrain,
        "road": road,
        "miles": miles,
        "notes": notes,
        "timestamp": datetime.now().isoformat()
    }
    travel_state["history"] = [march_entry] + history[:50]
    travel_state["pace"] = pace
    travel_state["terrain"] = terrain
    travel_state["road"] = road
    travel_state["marchHours"] = march_hours
    write_json("travel.json", travel_state)

    return {
        "status": "success",
        "travel": travel_state,
        "timeWeather": time_state,
        "entry": march_entry,
        "expiredTimers": expired_timers
    }

# -------------------------------------------------------------
# PLAYER INVENTORY, CURRENCY & SHARED PARTY STASH
# -------------------------------------------------------------
@app.get("/api/party/stash")
async def get_party_stash():
    return read_json("party_stash.json", get_default_party_stash())

@app.post("/api/party/stash")
async def save_party_stash(payload: Dict[str, Any]):
    stash = read_json("party_stash.json", get_default_party_stash())
    stash.update(payload)
    write_json("party_stash.json", stash)
    return {"status": "success", "partyStash": stash}

@app.post("/api/party/{pc_id}/inventory")
async def update_pc_inventory(pc_id: str, payload: Dict[str, Any]):
    party = read_json("party.json", [])
    party = ensure_party_inventory_defaults(party)
    pc = next((p for p in party if p.get("id") == pc_id), None)
    if not pc:
        raise HTTPException(status_code=404, detail="PC not found")

    if "currency" in payload and isinstance(payload["currency"], dict):
        pc["currency"] = payload["currency"]
    if "maxCarryWeight" in payload:
        pc["maxCarryWeight"] = int(payload["maxCarryWeight"])
    if "inventory" in payload and isinstance(payload["inventory"], list):
        pc["inventory"] = payload["inventory"]
    elif "item" in payload and isinstance(payload["item"], dict):
        inv = pc.get("inventory", [])
        item = payload["item"]
        item_id = item.get("id") or f"inv-{uuid.uuid4().hex[:6]}"
        item["id"] = item_id
        idx = next((i for i, x in enumerate(inv) if x.get("id") == item_id), None)
        if idx is not None:
            inv[idx] = item
        else:
            inv.append(item)
        pc["inventory"] = inv

    write_json("party.json", party)
    return {"status": "success", "pc": pc, "party": party}

@app.post("/api/party/{pc_id}/spells")
async def update_pc_spells(pc_id: str, payload: Dict[str, Any]):
    party = read_json("party.json", [])
    pc = next((p for p in party if p.get("id") == pc_id), None)
    if not pc:
        raise HTTPException(status_code=404, detail="Character not found")

    if "spells" in payload and isinstance(payload["spells"], list):
        pc["spells"] = payload["spells"]
    elif "spell" in payload and isinstance(payload["spell"], dict):
        spells = pc.setdefault("spells", [])
        sp = payload["spell"]
        sp_id = sp.get("id") or f"spell-{re.sub(r'[^a-z0-9]+', '-', sp.get('name', '').lower()).strip('-')}"
        sp["id"] = sp_id
        idx = next((i for i, x in enumerate(spells) if x.get("id") == sp_id or x.get("name", "").lower() == sp.get("name", "").lower()), None)
        if idx is not None:
            spells[idx] = sp
        else:
            spells.append(sp)
        spells.sort(key=lambda s: (s.get("level", 0), s.get("name", "").lower()))
        pc["spells"] = spells
    elif "deleteSpellId" in payload:
        del_id = str(payload["deleteSpellId"])
        pc["spells"] = [s for s in pc.get("spells", []) if str(s.get("id")) != del_id and str(s.get("name")) != del_id]

    write_json("party.json", party)
    try:
        await streamdeck_manager.broadcast({
            "event": "party_updated",
            "character": pc,
            "party": party
        })
    except Exception:
        pass
    return {"status": "success", "pc": pc, "spells": pc.get("spells", [])}


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

@app.post("/api/handouts/{handout_id}/deliver")
async def deliver_handout_endpoint(handout_id: str, payload: Dict[str, Any]):
    handouts = read_json("handouts.json", [])
    handout = next((h for h in handouts if h.get("id") == handout_id), None)
    if not handout:
        raise HTTPException(status_code=404, detail="Handout not found")

    target_id = payload.get("targetHeroId", "all")
    target_name = payload.get("targetHeroName", "All Party")
    secret_whisper = (payload.get("secretWhisper") or "").strip()

    handout["targetHeroId"] = target_id
    handout["targetHeroName"] = target_name
    handout["secretWhisper"] = secret_whisper
    handout["isDelivered"] = True
    handout["status"] = "delivered"
    handout["deliveredAt"] = time.time()
    handout["updatedAt"] = time.time()

    write_json("handouts.json", handouts)
    return {
        "status": "success",
        "message": f"Handout delivered to {target_name}!",
        "handout": handout,
        "handouts": handouts
    }

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
# CURSE OF STRAHD: TAROKKA DECK ENGINE
# -------------------------------------------------------------
def format_tarokka_summary_note(t: dict) -> str:
    lines = [
        "Madam Eva's Tarokka Reading for Barovia:",
        "",
        f"1. THE TOME OF STRAHD: {t.get('tome', {}).get('card', 'Unknown')} ({t.get('tome', {}).get('suit', '')})",
        f"   Clue: \"{t.get('tome', {}).get('clue', '')}\"",
        f"   Exact Location: {t.get('tome', {}).get('location', '')}",
        "",
        f"2. THE HOLY SYMBOL OF RAVENKIND: {t.get('holySymbol', {}).get('card', 'Unknown')} ({t.get('holySymbol', {}).get('suit', '')})",
        f"   Clue: \"{t.get('holySymbol', {}).get('clue', '')}\"",
        f"   Exact Location: {t.get('holySymbol', {}).get('location', '')}",
        "",
        f"3. THE SUNSWORD: {t.get('sunsword', {}).get('card', 'Unknown')} ({t.get('sunsword', {}).get('suit', '')})",
        f"   Clue: \"{t.get('sunsword', {}).get('clue', '')}\"",
        f"   Exact Location: {t.get('sunsword', {}).get('location', '')}",
        "",
        f"4. STRAHD'S FATED ENEMY: {t.get('enemy', {}).get('card', 'Unknown')}",
        f"   Fated Ally: {t.get('enemy', {}).get('ally', '')}",
        "",
        f"5. STRAHD'S LAIR (FINAL CONFRONTATION): {t.get('location', {}).get('card', 'Unknown')}",
        f"   Sanctuary in Castle Ravenloft: {t.get('location', {}).get('location', '')}",
        "",
        f"Drawn at: {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(t.get('timestamp', time.time())))}"
    ]
    return "\n".join(lines)


@app.get("/api/tarokka/cards")
async def get_tarokka_cards():
    return {
        "status": "success",
        "common": cos_module_pack.TAROKKA_COMMON_DECK,
        "high": cos_module_pack.TAROKKA_HIGH_DECK
    }


@app.get("/api/tarokka/current")
async def get_current_tarokka():
    reading = read_json("tarokka.json", None)
    if not reading:
        reading = cos_module_pack.draw_tarokka_reading()
        write_json("tarokka.json", reading)
    return {"status": "success", "reading": reading}


@app.post("/api/tarokka/draw")
async def draw_tarokka(payload: Optional[Dict[str, Any]] = None):
    auto_save = False
    if payload and payload.get("save"):
        auto_save = True
    new_reading = cos_module_pack.draw_tarokka_reading()
    if auto_save:
        write_json("tarokka.json", new_reading)
    return {"status": "success", "reading": new_reading}


@app.post("/api/tarokka/save")
async def save_tarokka(payload: Dict[str, Any]):
    reading = payload.get("reading", payload)
    if not reading or not isinstance(reading, dict):
        raise HTTPException(status_code=400, detail="Invalid reading payload")
    
    reading["timestamp"] = reading.get("timestamp") or time.time()
    write_json("tarokka.json", reading)

    # Sync to session_notes.json
    try:
        notes = read_json("session_notes.json", [])
        note_title = "Madam Eva's Tarokka Reading"
        existing_note = next((n for n in notes if n.get("title") == note_title or n.get("id") == "note-cos-tarokka"), None)
        note_content = format_tarokka_summary_note(reading)
        if existing_note:
            existing_note["content"] = note_content
            existing_note["updatedAt"] = time.time()
        else:
            notes.insert(0, {
                "id": "note-cos-tarokka",
                "title": note_title,
                "content": note_content,
                "category": "Curse of Strahd",
                "pinned": True,
                "createdAt": time.time(),
                "updatedAt": time.time()
            })
        write_json("session_notes.json", notes)
    except Exception as e:
        print(f"Error syncing Tarokka to session notes: {e}")

    return {"status": "success", "reading": reading}


@app.post("/api/tarokka/broadcast")
async def broadcast_tarokka_endpoint(payload: Optional[Dict[str, Any]] = None):
    reading = None
    if payload and payload.get("reading"):
        reading = payload.get("reading")
    else:
        reading = read_json("tarokka.json", None)
        if not reading:
            reading = cos_module_pack.draw_tarokka_reading()

    reading["broadcasted"] = True
    reading["isDelivered"] = True
    write_json("tarokka.json", reading)

    player_summary = (
        "🔮 MADAM EVA'S TAROKKA PROPHECY 🔮\n\n"
        f"• The Tome of Strahd: {reading.get('tome', {}).get('card', 'Unknown')}\n"
        f"  \"{reading.get('tome', {}).get('clue', '')}\"\n\n"
        f"• Holy Symbol of Ravenkind: {reading.get('holySymbol', {}).get('card', 'Unknown')}\n"
        f"  \"{reading.get('holySymbol', {}).get('clue', '')}\"\n\n"
        f"• The Sunsword: {reading.get('sunsword', {}).get('card', 'Unknown')}\n"
        f"  \"{reading.get('sunsword', {}).get('clue', '')}\"\n\n"
        f"• Strahd's Enemy: {reading.get('enemy', {}).get('card', 'Unknown')}\n"
        f"  Ally: {reading.get('enemy', {}).get('ally', '')}\n\n"
        f"• The Darklord's Lair: {reading.get('location', {}).get('card', 'Unknown')}"
    )

    broadcast_data = {
        "active": True,
        "title": "Madam Eva's Tarokka Reading",
        "subtitle": "The Mists of Fate Reveal Barovia's Secrets",
        "content": player_summary,
        "type": "tarokka",
        "imageUrl": "",
        "tarokka": reading
    }
    write_json("broadcast.json", broadcast_data)
    return {"status": "success", "broadcast": broadcast_data}

@app.post("/api/tarokka/flip")
async def flip_tarokka_slot_endpoint(payload: Optional[Dict[str, Any]] = None):
    data = payload or {}
    slot_key = data.get("slotKey")
    is_flipped = data.get("flipped")
    all_flipped = data.get("allFlipped")

    reading = read_json("tarokka.json", None)
    if not reading:
        reading = cos_module_pack.draw_tarokka_reading()

    if "flipped" not in reading or not isinstance(reading["flipped"], dict):
        reading["flipped"] = {
            "tome": False,
            "holySymbol": False,
            "sunsword": False,
            "enemy": False,
            "location": False
        }

    if all_flipped is not None and isinstance(all_flipped, dict):
        reading["flipped"].update(all_flipped)
    elif slot_key:
        if is_flipped is not None:
            reading["flipped"][slot_key] = bool(is_flipped)
        else:
            reading["flipped"][slot_key] = not reading["flipped"].get(slot_key, False)

    reading["broadcasted"] = True
    reading["isDelivered"] = True
    reading["updatedAt"] = time.time()
    write_json("tarokka.json", reading)

    broadcast_data = {
        "active": True,
        "title": "Madam Eva's Tarokka Reading",
        "subtitle": "The Mists of Fate Reveal Barovia's Secrets",
        "content": format_tarokka_summary_note(reading),
        "type": "tarokka",
        "imageUrl": "",
        "tarokka": reading
    }
    write_json("broadcast.json", broadcast_data)

    return {"status": "success", "reading": reading, "flipped": reading["flipped"]}

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

    player_rolls = [r for r in RECENT_TABLE_ROLLS if not r.get("isDM", False)]
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
        "broadcast": broadcast,
        "recentRolls": sorted(player_rolls, key=lambda r: r.get("timestamp", 0), reverse=True)[:25],
        "lastPlayerRoll": player_rolls[-1] if player_rolls else None
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
# DUNGEON & POINTCRAWL NAVIGATOR ENGINE
# -------------------------------------------------------------
@app.get("/api/dungeons")
async def get_dungeons():
    dungeons = read_json("dungeons.json", None)
    if dungeons is None:
        if is_active_campaign_cos():
            dungeons = cos_module_pack.get_cos_dungeons()
        else:
            dungeons = []
        write_json("dungeons.json", dungeons)
    elif not isinstance(dungeons, list):
        dungeons = []
        write_json("dungeons.json", dungeons)
    
    meta = read_json("dungeons_meta.json", {})
    active_id = meta.get("activeDungeonId")
    if not any(d.get("id") == active_id for d in dungeons):
        active_id = dungeons[0]["id"] if dungeons else None
        meta["activeDungeonId"] = active_id
        write_json("dungeons_meta.json", meta)
    
    return {
        "status": "success",
        "dungeons": dungeons,
        "activeDungeonId": active_id
    }

@app.post("/api/dungeons/active")
async def set_active_dungeon(payload: Dict[str, Any]):
    dungeon_id = payload.get("dungeonId")
    meta = read_json("dungeons_meta.json", {})
    meta["activeDungeonId"] = dungeon_id
    write_json("dungeons_meta.json", meta)
    return {"status": "success", "activeDungeonId": dungeon_id}

@app.post("/api/dungeons")
async def save_or_update_dungeon(dungeon: Dict[str, Any]):
    if not dungeon.get("id"):
        dungeon["id"] = f"dungeon-{int(time.time()*1000)}"
    dungeons = read_json("dungeons.json", [])
    idx = next((i for i, d in enumerate(dungeons) if d.get("id") == dungeon["id"]), -1)
    if idx >= 0:
        dungeons[idx] = dungeon
    else:
        dungeons.append(dungeon)
    write_json("dungeons.json", dungeons)

    meta = read_json("dungeons_meta.json", {})
    if not meta.get("activeDungeonId") or not any(d.get("id") == meta.get("activeDungeonId") for d in dungeons):
        meta["activeDungeonId"] = dungeon["id"]
        write_json("dungeons_meta.json", meta)

    return {"status": "success", "dungeon": dungeon, "dungeons": dungeons, "activeDungeonId": meta.get("activeDungeonId")}

@app.delete("/api/dungeons/{dungeon_id}")
async def delete_dungeon(dungeon_id: str):
    dungeons = read_json("dungeons.json", [])
    dungeons = [d for d in dungeons if d.get("id") != dungeon_id]
    write_json("dungeons.json", dungeons)
    meta = read_json("dungeons_meta.json", {})
    if meta.get("activeDungeonId") == dungeon_id:
        meta["activeDungeonId"] = dungeons[0]["id"] if dungeons else None
        write_json("dungeons_meta.json", meta)
    return {"status": "success", "dungeons": dungeons, "activeDungeonId": meta.get("activeDungeonId")}

@app.post("/api/dungeons/move-party")
async def dungeon_move_party(payload: Dict[str, Any]):
    dungeon_id = payload.get("dungeonId")
    node_id = payload.get("nodeId")
    dungeons = read_json("dungeons.json", [])
    dungeon = next((d for d in dungeons if d.get("id") == dungeon_id), None)
    if not dungeon:
        raise HTTPException(status_code=404, detail="Dungeon not found")
    
    dungeon["activeChamberId"] = node_id
    target_node = None
    for n in dungeon.get("nodes", []):
        if n.get("id") == node_id:
            n["state"] = "active"
            target_node = n
        elif n.get("state") == "active":
            n["state"] = "explored"
    
    write_json("dungeons.json", dungeons)
    return {"status": "success", "dungeon": dungeon, "activeNode": target_node}

@app.post("/api/dungeons/node-state")
async def set_dungeon_node_state(payload: Dict[str, Any]):
    dungeon_id = payload.get("dungeonId")
    node_id = payload.get("nodeId")
    new_state = payload.get("state", "unexplored")
    dungeons = read_json("dungeons.json", [])
    dungeon = next((d for d in dungeons if d.get("id") == dungeon_id), None)
    if not dungeon:
        raise HTTPException(status_code=404, detail="Dungeon not found")
    
    target_node = None
    for n in dungeon.get("nodes", []):
        if n.get("id") == node_id:
            n["state"] = new_state
            target_node = n
            break
            
    write_json("dungeons.json", dungeons)
    return {"status": "success", "dungeon": dungeon, "node": target_node}

@app.post("/api/dungeons/reset-fog")
async def reset_dungeon_fog(payload: Dict[str, Any]):
    dungeon_id = payload.get("dungeonId")
    dungeons = read_json("dungeons.json", [])
    dungeon = next((d for d in dungeons if d.get("id") == dungeon_id), None)
    if not dungeon:
        raise HTTPException(status_code=404, detail="Dungeon not found")
    
    active_id = dungeon.get("activeChamberId")
    for n in dungeon.get("nodes", []):
        if n.get("id") == active_id:
            n["state"] = "active"
        else:
            n["state"] = "unexplored"
            
    write_json("dungeons.json", dungeons)
    return {"status": "success", "dungeon": dungeon}

@app.post("/api/dungeons/reveal-all")
async def reveal_all_dungeon_fog(payload: Dict[str, Any]):
    dungeon_id = payload.get("dungeonId")
    dungeons = read_json("dungeons.json", [])
    dungeon = next((d for d in dungeons if d.get("id") == dungeon_id), None)
    if not dungeon:
        raise HTTPException(status_code=404, detail="Dungeon not found")
    
    for n in dungeon.get("nodes", []):
        if n.get("state") == "unexplored":
            n["state"] = "explored"
            
    write_json("dungeons.json", dungeons)
    return {"status": "success", "dungeon": dungeon}

@app.post("/api/dungeons/broadcast-room")
async def broadcast_dungeon_room(payload: Dict[str, Any]):
    dungeon_id = payload.get("dungeonId")
    node_id = payload.get("nodeId")
    dungeons = read_json("dungeons.json", [])
    dungeon = next((d for d in dungeons if d.get("id") == dungeon_id), None)
    if not dungeon:
        raise HTTPException(status_code=404, detail="Dungeon not found")
    
    node = next((n for n in dungeon.get("nodes", []) if n.get("id") == node_id), None)
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    level_id = node.get("level")
    lvl = next((l for l in dungeon.get("levels", []) if l.get("id") == level_id), None)
    level_name = lvl.get("name") if lvl else ""
    
    code = node.get("code", "")
    name = node.get("name", "")
    title = f"{code}: {name}".strip(": ") if code else name
    
    b_dict = {
        "active": True,
        "title": title or "Chamber Discovery",
        "subtitle": f"{dungeon.get('name', 'Dungeon')} • {level_name}".strip(" •"),
        "content": node.get("boxedText", ""),
        "type": "room",
        "imageUrl": "",
        "timestamp": time.time()
    }
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
        "dungeons": read_json("dungeons.json", []),
        "dungeonsMeta": read_json("dungeons_meta.json", {}),
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
    if "dungeons" in data: write_json("dungeons.json", data["dungeons"])
    if "dungeonsMeta" in data: write_json("dungeons_meta.json", data["dungeonsMeta"])
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

# -------------------------------------------------------------
# AUDIO DOWNLOADER & IMPORTER ENDPOINTS (YouTube / Spotify)
# -------------------------------------------------------------
class AudioImportPreviewRequest(BaseModel):
    url: str

class AudioImportStartRequest(BaseModel):
    url: str
    category: Optional[str] = "Ambiance"
    tags: Optional[List[str]] = []
    max_tracks: Optional[int] = 50
    custom_name: Optional[str] = ""

class AudioTrackTagRequest(BaseModel):
    category: str
    tags: Optional[List[str]] = None

@app.post("/api/audio/import/preview")
async def preview_audio_import(req: AudioImportPreviewRequest):
    result = audio_importer.preview_audio_source(req.url)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/api/audio/import/start")
async def start_audio_import(req: AudioImportStartRequest):
    result = audio_worker.start_download_job(
        url=req.url,
        category=req.category or "Ambiance",
        tags=req.tags or [],
        max_tracks=req.max_tracks or 50,
        custom_name=req.custom_name or ""
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.get("/api/audio/import/status/{job_id}")
async def get_audio_import_status(job_id: str):
    job = audio_worker.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Download job not found.")
    return job

@app.post("/api/audio/import/cancel/{job_id}")
async def cancel_audio_import(job_id: str):
    cancelled = audio_worker.cancel_job(job_id)
    return {"status": "success" if cancelled else "not_found", "cancelled": cancelled}

@app.post("/api/audio/track/{track_id}/tag")
async def quick_tag_audio_track(track_id: str, req: AudioTrackTagRequest):
    library = read_json("audio_library.json", [])
    track = next((t for t in library if t.get("id") == track_id), None)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found.")
    
    track["category"] = req.category
    if req.tags is not None:
        track["tags"] = req.tags
    
    # Auto-adjust icon if still using default
    cat_icons = audio_importer.DEFAULT_CATEGORY_ICONS
    if track.get("category") in cat_icons:
        track["icon"] = cat_icons[track["category"]]

    write_json("audio_library.json", library)
    return {"status": "success", "track": track, "library": library}

@app.post("/api/upload")
@app.post("/api/overworld/upload-map")
async def upload_generic_file(file: UploadFile = File(...)):
    filename = file.filename or "uploaded_map.png"
    clean_name = "".join(c for c in filename if c.isalnum() or c in (".", "-", "_")).strip()
    if not clean_name:
        clean_name = f"upload_{uuid.uuid4().hex[:6]}.png"
    
    unique_name = f"{uuid.uuid4().hex[:6]}_{clean_name}"
    dest = UPLOADS_DIR / unique_name
    try:
        with open(dest, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        url = f"/uploads/{unique_name}"
    except Exception as e:
        print(f"Error saving to UPLOADS_DIR: {e}")
        dest = IMAGES_DIR / unique_name
        with open(dest, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        url = f"/static/images/{unique_name}"
        
    return {"status": "success", "url": url, "filename": unique_name}

@app.post("/api/images/upload")
async def upload_image_file(file: UploadFile = File(...)):
    filename = file.filename or "image.png"
    clean_name = "".join(c for c in filename if c.isalnum() or c in (".", "-", "_")).strip()
    if not clean_name:
        clean_name = f"art_{uuid.uuid4().hex[:6]}.png"
    dest = IMAGES_DIR / clean_name
    try:
        with open(dest, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        url = f"/static/images/{clean_name}"
    except Exception:
        dest = UPLOADS_DIR / clean_name
        with open(dest, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        url = f"/uploads/{clean_name}"
    return {"status": "success", "url": url}

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
    encs = read_json("encounters.json", [])
    try:
        camp_id = get_active_campaign_id()
        enriched = get_enriched_campaigns()
        camp_obj = next((c for c in enriched if c.get("id") == camp_id), {})
        is_cos = (
            camp_obj.get("template") == "curse_of_strahd" or
            "strahd" in camp_obj.get("name", "").lower() or
            "strahd" in camp_obj.get("description", "").lower()
        )
        if is_cos and (len(encs) < 30 or any("monsterId" not in m for e in encs for m in e.get("monsters", [])[:1])):
            encs = cos_module_pack.get_cos_encounters()
            write_json("encounters.json", encs)
    except Exception:
        pass
    return encs

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
async def launch_encounter(enc_id: str, request_data: Optional[Dict[str, Any]] = None):
    encounters = read_json("encounters.json", [])
    enc = next((e for e in encounters if e.get("id") == enc_id), None)
    if not enc:
        cos_encs = cos_module_pack.get_cos_encounters()
        enc = next((e for e in cos_encs if e.get("id") == enc_id), None)
        if not enc:
            raise HTTPException(status_code=404, detail="Encounter not found")

    monsters_lib = read_json("monsters.json", [])
    cos_monsters = getattr(cos_module_pack, "MONSTERS", [])
    existing_lib_ids = {x.get("id") for x in monsters_lib}
    all_monsters = monsters_lib + [m for m in cos_monsters if m.get("id") not in existing_lib_ids]

    opts = request_data or {}
    clear_combat = opts.get("clearCombat", False)
    participating_party_ids = opts.get("participatingPartyIds", [])
    auto_roll_party_init = opts.get("autoRollPartyInit", True)
    auto_roll_monster_init = opts.get("autoRollMonsterInit", True)
    spawn_tokens = opts.get("spawnTokens", True)

    if clear_combat:
        combat = {"inCombat": True, "round": 1, "currentTurnIndex": 0, "combatants": []}
    else:
        combat = read_json("combat.json", {"inCombat": True, "round": 1, "currentTurnIndex": 0, "combatants": []})
        combat["inCombat"] = True

    bstate = read_json("battlemap.json", get_default_battlemap_state())
    existing_tokens = bstate.get("tokens", [])
    if clear_combat:
        existing_tokens = [t for t in existing_tokens if not t.get("monsterId")]

    spawned_names = []
    new_combatants = []
    new_tokens = []
    token_index = 0
    base_x = 900.0
    base_y = 650.0

    # 1. Add Participating Party Members
    if participating_party_ids:
        party = read_json("party.json", [])
        existing_sources = {c.get("sourceId") or c.get("id") for c in combat.get("combatants", [])}
        for pid in participating_party_ids:
            pc = next((p for p in party if p.get("id") == pid), None)
            if pc and f"combat-{pc.get('id')}" not in existing_sources and pc.get("id") not in existing_sources:
                dex_mod = int(pc.get("initiativeMod") or 0)
                init_val = float(random.randint(1, 20) + dex_mod) if auto_roll_party_init else 0.0
                pc_combatant = {
                    "id": f"combat-{pc.get('id')}",
                    "name": pc.get("name", "Hero"),
                    "type": "pc",
                    "initiative": init_val,
                    "tieBreaker": round(dex_mod + random.uniform(0.01, 0.99), 2),
                    "ac": int(pc.get("ac", 10)),
                    "currentHp": int(pc.get("currentHp", 20)),
                    "maxHp": int(pc.get("maxHp", 20)),
                    "tempHp": int(pc.get("tempHp", 0)),
                    "conditions": [],
                    "isConcentrating": False,
                    "concentratingSpell": "",
                    "notes": pc.get("classRole", ""),
                    "statDetails": f"Speed: {pc.get('speed', 30)}ft | PP: {pc.get('passivePerception', 10)}",
                    "sourceId": pc.get("id"),
                    "hidden": False,
                    "visibleToPlayers": True
                }
                new_combatants.append(pc_combatant)
                spawned_names.append(f"{pc.get('name')} (PC)")

    # 2. Add Encounter Monsters
    for item in enc.get("monsters", []):
        m_id = item.get("monsterId") or item.get("id")
        count = int(item.get("count", 1))
        monster = next((m for m in all_monsters if m.get("id") == m_id or (m.get("name") and item.get("name") and m.get("name").lower() == item.get("name").lower())), None)
        if not monster:
            monster = {"id": m_id, "name": item.get("name") or m_id or "Creature", "hp": 20, "ac": 12, "cr": item.get("cr", "1")}

        stats_obj = monster.get("stats") or monster.get("abilities") or {}
        dex = stats_obj.get("dex", 10) if isinstance(stats_obj, dict) else 10
        dex_mod = (dex - 10) // 2

        cr_str = str(monster.get("cr", item.get("cr", 1)))
        try:
            cr_val = float(cr_str)
        except Exception:
            cr_val = 1.0

        is_boss = cr_val >= 10 or any(k in monster.get("name", "").lower() for k in ["dragon", "strahd", "boss", "lych", "lich", "neferon", "vladimir"])
        color = "#a855f7" if is_boss else "#ef4444"
        size_squares = get_monster_size_squares(monster.get("size", "Medium"))

        for i in range(count):
            init_val = float(random.randint(1, 20) + dex_mod) if auto_roll_monster_init else 0.0
            num_suffix = f" {i + 1}" if count > 1 else ""
            c_name = f"{item.get('name') or monster.get('name', 'Monster')}{num_suffix}"
            c_id = f"mob-{m_id}-{int(time.time()*1000)}-{token_index}"
            img_url = monster.get("imageUrl") or f"/static/images/monsters/{m_id}.webp"
            hp = int(monster.get("hp", 15))

            action_name = "Standard Attack"
            if monster.get("actions") and len(monster["actions"]) > 0:
                action_name = monster["actions"][0].get("name", "Standard Attack")

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
                "isConcentrating": False,
                "concentratingSpell": "",
                "hidden": True,
                "visibleToPlayers": False,
                "imageUrl": img_url,
                "notes": f"CR {monster.get('cr', item.get('cr', '?'))} | {monster.get('type', '')} | Spd: {monster.get('speed', '30 ft.')}",
                "statDetails": action_name
            }
            new_combatants.append(new_combatant)
            spawned_names.append(c_name)

            if spawn_tokens:
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

    if new_tokens:
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
def _send_amaran_raw(msg_type: str, args: Optional[Dict[str, Any]] = None, node_id: Optional[Union[str, List[str]]] = None, node_ids: Optional[List[str]] = None) -> Dict[str, Any]:
    targets: List[Optional[str]] = []
    if node_ids and isinstance(node_ids, list):
        targets.extend(node_ids)
    elif isinstance(node_id, list):
        targets.extend(node_id)
    elif isinstance(node_id, str) and node_id:
        targets.append(node_id)
    else:
        targets.append(None)

    last_result = {}
    try:
        s = socket.create_connection(('127.0.0.1', 12345), timeout=2.5)
        key = base64.b64encode(os.urandom(16)).decode('ascii')
        req = f'GET / HTTP/1.1\r\nHost: 127.0.0.1:12345\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n'
        s.sendall(req.encode('ascii'))
        s.recv(2048)

        for i, nid in enumerate(targets):
            if i > 0:
                time.sleep(0.180)

            payload = {'version': 1, 'client_id': 'dnd_dashboard', 'type': msg_type}
            if nid:
                payload['node_id'] = nid
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
            frame.extend(bytearray(b ^ mask[j % 4] for j, b in enumerate(data)))
            s.sendall(frame)

            hdr = s.recv(2)
            if not hdr:
                continue
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
            try:
                last_result = json.loads(buf.decode('utf-8'))
            except Exception:
                pass
        s.close()
    except Exception as e:
        last_result = {'error': str(e)}

    return last_result

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
    node_ids = payload.get("node_ids")
    resp = await asyncio.to_thread(_send_amaran_raw, msg_type, args, node_id, node_ids)
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
def is_transparent_mask(mask_str: Optional[str]) -> bool:
    if not mask_str or not isinstance(mask_str, str) or not mask_str.startswith("data:image/png;base64,"):
        return False
    try:
        data = base64.b64decode(mask_str.split(",")[1])
        if len(data) < 26 or data[25] != 6:  # color type 6 = RGBA
            return False
        w = int.from_bytes(data[16:20], "big")
        h = int.from_bytes(data[20:24], "big")
        idat = b""
        i = 8
        while i < len(data) - 4:
            length = int.from_bytes(data[i:i+4], "big")
            if data[i+4:i+8] == b"IDAT":
                idat += data[i+8:i+8+length]
            i += 12 + length
        decomp = zlib.decompress(idat)
        row_len = 1 + w * 4
        # Fast sampling: sample rows first
        for r in range(0, h, max(1, h // 50)):
            row_start = r * row_len + 1
            for c in range(3, w * 4, 4 * 10):
                if decomp[row_start + c] > 10:
                    return False
        # Full scan if no alpha in sample
        for r in range(h):
            row_start = r * row_len + 1
            for c in range(3, w * 4, 4):
                if decomp[row_start + c] > 10:
                    return False
        return True
    except Exception:
        return False

@app.get("/api/battlemap")
async def get_battlemap():
    defaults = get_default_battlemap_state()
    state = read_json("battlemap.json", defaults)
    for k, v in defaults.items():
        if k not in state or state[k] is None:
            state[k] = v

    if not isinstance(state.get("mapFogMasks"), dict):
        state["mapFogMasks"] = {}

    # Clean any corrupted 100% transparent masks
    if is_transparent_mask(state.get("fogMask")):
        state["fogMask"] = None
    for mid, msk in list(state["mapFogMasks"].items()):
        if is_transparent_mask(msk):
            state["mapFogMasks"][mid] = None

    catalog = get_shared_battlemaps_catalog()
    state["maps"] = catalog

    # Ensure activeMapId points to an existing map from the shared catalog
    active_id = state.get("activeMapId")
    if not is_active_campaign_cos() and active_id and (active_id.startswith("cos_") or "/battlemaps/cos/" in str(state.get("activeMapUrl", ""))):
        active_id = None

    matched = next((m for m in catalog if m["id"] == active_id), None)
    if matched:
        if matched.get("url") and matched["url"] != state.get("activeMapUrl"):
            state["activeMapUrl"] = matched["url"]
            state["activeMapName"] = matched.get("name", state.get("activeMapName"))
    elif catalog:
        matched = catalog[0]
        state["activeMapId"] = matched["id"]
        state["activeMapUrl"] = matched["url"]
        state["activeMapName"] = matched["name"]
        if "defaultGridSize" in matched:
            state["gridSize"] = matched["defaultGridSize"]

    # Sync fogMask and mapFogMasks
    curr_id = state.get("activeMapId")
    if curr_id:
        if curr_id in state["mapFogMasks"]:
            state["fogMask"] = state["mapFogMasks"][curr_id]
        elif state.get("fogMask"):
            state["mapFogMasks"][curr_id] = state["fogMask"]

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

    player_rolls = [r for r in RECENT_TABLE_ROLLS if not r.get("isDM", False)]
    state["recentRolls"] = sorted(player_rolls, key=lambda r: r.get("timestamp", 0), reverse=True)[:25]
    state["lastPlayerRoll"] = player_rolls[-1] if player_rolls else None

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
    if state.get("fogEnabled") is None:
        state["fogEnabled"] = True
    if "mapFogMasks" not in state or not isinstance(state.get("mapFogMasks"), dict):
        state["mapFogMasks"] = {}
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "state": state}

@app.post("/api/battlemap/toggle-companion-access")
async def toggle_companion_battlemap_access(payload: Optional[Dict[str, Any]] = None):
    state = read_json("battlemap.json", get_default_battlemap_state())
    data = payload or {}
    if "enabled" in data:
        state["companionAccessEnabled"] = bool(data["enabled"])
    else:
        state["companionAccessEnabled"] = not bool(state.get("companionAccessEnabled", False))
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)
    return {"status": "success", "companionAccessEnabled": state["companionAccessEnabled"]}

@app.post("/api/battlemap/fog")
async def update_battlemap_fog(update: BattlemapFogUpdate):
    state = read_json("battlemap.json", get_default_battlemap_state())
    if state.get("fogEnabled") is None:
        state["fogEnabled"] = True
    if "mapFogMasks" not in state or not isinstance(state.get("mapFogMasks"), dict):
        state["mapFogMasks"] = {}

    target_map_id = update.mapId or state.get("activeMapId")

    if update.reset:
        state["fogMask"] = None
        if target_map_id:
            state["mapFogMasks"][target_map_id] = None
    elif update.revealAll:
        state["fogMask"] = "REVEALED_ALL"
        if target_map_id:
            state["mapFogMasks"][target_map_id] = "REVEALED_ALL"
    elif update.fogMask is not None:
        if is_transparent_mask(update.fogMask):
            state["fogMask"] = None
            if target_map_id:
                state["mapFogMasks"][target_map_id] = None
        else:
            state["fogMask"] = update.fogMask
            if target_map_id:
                state["mapFogMasks"][target_map_id] = update.fogMask
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

@app.get("/api/battlemap/catalog")
async def get_battlemap_catalog():
    return {"status": "success", "catalog": get_shared_battlemaps_catalog()}

@app.delete("/api/battlemap/catalog/{map_id}")
async def delete_battlemap_from_catalog(map_id: str):
    catalog = get_shared_battlemaps_catalog()
    deleted = None
    new_catalog = []
    for m in catalog:
        if m["id"] == map_id:
            deleted = m
        else:
            new_catalog.append(m)
    
    if not deleted:
        raise HTTPException(status_code=404, detail="Map not found in catalog")
    
    # Don't delete presets if someone tries
    if deleted.get("type") == "preset":
        raise HTTPException(status_code=400, detail="Default preset maps cannot be deleted")

    save_shared_battlemaps_catalog(new_catalog)

    # If it was an uploaded or generated map, delete file
    if deleted.get("type") in ("generated", "uploaded"):
        url = deleted.get("url", "")
        if url.startswith("/static/images/battlemaps/"):
            filename = url.replace("/static/images/battlemaps/", "")
            file_path = BATTLEMAPS_DIR / filename
            if file_path.exists():
                try:
                    file_path.unlink()
                except Exception as e:
                    print(f"Error removing map file {file_path}: {e}")

    return {"status": "success", "catalog": new_catalog}

@app.post("/api/battlemap/preview")
async def preview_battlemap(req: BattlemapGenerateRequest):
    try:
        gen = ProceduralMapGenerator(
            theme=req.theme,
            width_squares=req.widthSquares,
            height_squares=req.heightSquares,
            grid_size=req.gridSize,
            layout=req.layout,
            lighting=req.lighting,
            has_water=req.hasWater,
            has_pillars=req.hasPillars,
            seed=req.seed
        )
        svg_content = gen.generate_svg()
        title = req.title.strip() if req.title and req.title.strip() else get_random_title(req.theme)
        return {
            "status": "success",
            "svg": svg_content,
            "title": title,
            "seed": gen.seed,
            "theme": req.theme,
            "width": gen.width,
            "height": gen.height,
            "gridSize": gen.grid_size
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Map preview generation failed: {str(e)}")

@app.post("/api/battlemap/generate")
async def generate_battlemap(req: BattlemapGenerateRequest):
    try:
        gen = ProceduralMapGenerator(
            theme=req.theme,
            width_squares=req.widthSquares,
            height_squares=req.heightSquares,
            grid_size=req.gridSize,
            layout=req.layout,
            lighting=req.lighting,
            has_water=req.hasWater,
            has_pillars=req.hasPillars,
            seed=req.seed
        )
        svg_content = gen.generate_svg()
        title = req.title.strip() if req.title and req.title.strip() else get_random_title(req.theme)
        map_id = f"gen_{req.theme}_{int(time.time())}_{uuid.uuid4().hex[:4]}"
        filename = f"{map_id}.svg"
        file_path = BATTLEMAPS_DIR / filename
        BATTLEMAPS_DIR.mkdir(parents=True, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(svg_content)
        
        map_entry = {
            "id": map_id,
            "name": title,
            "url": f"/static/images/battlemaps/{filename}",
            "width": gen.width,
            "height": gen.height,
            "defaultGridSize": gen.grid_size,
            "theme": req.theme,
            "type": "generated",
            "createdAt": time.time(),
            "seed": gen.seed
        }

        catalog = get_shared_battlemaps_catalog()
        catalog.append(map_entry)
        save_shared_battlemaps_catalog(catalog)

        state = None
        if req.deployImmediately:
            state = read_json("battlemap.json", get_default_battlemap_state())
            state["maps"] = catalog
            if state.get("fogEnabled") is None:
                state["fogEnabled"] = True
            if "mapFogMasks" not in state or not isinstance(state["mapFogMasks"], dict):
                state["mapFogMasks"] = {}
            old_map_id = state.get("activeMapId")
            if old_map_id and state.get("fogMask"):
                state["mapFogMasks"][old_map_id] = state["fogMask"]
            state["activeMapId"] = map_id
            state["activeMapUrl"] = map_entry["url"]
            state["activeMapName"] = map_entry["name"]
            state["gridSize"] = gen.grid_size
            state["fogMask"] = None
            state["mapFogMasks"][map_id] = None
            state["panX"] = 0
            state["panY"] = 0
            state["zoom"] = 1.0
            state["updatedAt"] = time.time()
            write_json("battlemap.json", state)

        return {
            "status": "success",
            "map": map_entry,
            "state": state,
            "catalog": catalog
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Map generation failed: {str(e)}")

@app.post("/api/battlemap/select")
async def select_battlemap(payload: BattlemapSelect):
    state = read_json("battlemap.json", get_default_battlemap_state())
    catalog = get_shared_battlemaps_catalog()
    if payload.mapId.startswith("cos_") and not is_active_campaign_cos():
        raise HTTPException(status_code=403, detail="Curse of Strahd battlemaps are only available in a Curse of Strahd campaign.")
    selected = next((m for m in catalog if m["id"] == payload.mapId), None)
    if not selected:
        raise HTTPException(status_code=404, detail="Map not found in shared catalog")

    if state.get("fogEnabled") is None:
        state["fogEnabled"] = True
    if "mapFogMasks" not in state or not isinstance(state["mapFogMasks"], dict):
        state["mapFogMasks"] = {}

    old_map_id = state.get("activeMapId")
    if old_map_id and state.get("fogMask"):
        if is_transparent_mask(state.get("fogMask")):
            state["mapFogMasks"][old_map_id] = None
        else:
            state["mapFogMasks"][old_map_id] = state["fogMask"]

    state["activeMapId"] = selected["id"]
    state["activeMapUrl"] = selected["url"]
    state["activeMapName"] = selected["name"]
    if "defaultGridSize" in selected:
        state["gridSize"] = selected["defaultGridSize"]
    state["fogMask"] = state["mapFogMasks"].get(selected["id"], None)
    state["panX"] = 0
    state["panY"] = 0
    state["zoom"] = 1.0
    state["maps"] = catalog
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

    catalog = get_shared_battlemaps_catalog()
    new_map = {
        "id": map_id,
        "name": map_name,
        "url": map_url,
        "width": 2000,
        "height": 1500,
        "defaultGridSize": 50,
        "theme": "custom",
        "type": "uploaded",
        "createdAt": time.time()
    }
    catalog.append(new_map)
    save_shared_battlemaps_catalog(catalog)

    state = read_json("battlemap.json", get_default_battlemap_state())
    state["maps"] = catalog
    if state.get("fogEnabled") is None:
        state["fogEnabled"] = True
    if "mapFogMasks" not in state or not isinstance(state["mapFogMasks"], dict):
        state["mapFogMasks"] = {}

    old_map_id = state.get("activeMapId")
    if old_map_id and state.get("fogMask"):
        state["mapFogMasks"][old_map_id] = state["fogMask"]

    state["activeMapId"] = map_id
    state["activeMapUrl"] = map_url
    state["activeMapName"] = map_name
    state["fogMask"] = None
    state["mapFogMasks"][map_id] = None
    state["panX"] = 0
    state["panY"] = 0
    state["zoom"] = 1.0
    state["updatedAt"] = time.time()
    write_json("battlemap.json", state)

    return {"status": "success", "map": new_map, "state": state, "catalog": catalog}

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
    lan_ip = get_local_lan_ip()
    print("\n=======================================================")
    print("  ARCANE LEDGER - D&D 5.5e (2024) DM DASHBOARD")
    print("  Host DM Command Center:    http://127.0.0.1:8000")
    print(f"  Local Network Player HUD:  http://{lan_ip}:8000/player")
    print(f"  Local Network Battlemap:   http://{lan_ip}:8000/map")
    print(f"  Player Mobile Companion:   http://{lan_ip}:8000/companion")
    print("=======================================================\n")
    if getattr(sys, "frozen", False):
        uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
    else:
        uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
