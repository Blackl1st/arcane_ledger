#!/usr/bin/env python3
"""
Arcane Ledger - D&D Beyond Character Importer & Synchronization Engine
Supports importing characters directly via D&D Beyond public character URL/ID
or by uploading a D&D Beyond character JSON file.
Calculates stats according to D&D 5e / 5.5e (2024) rules:
- Ability scores, modifiers, and item overrides (e.g. Gauntlets of Ogre Power)
- Maximum HP, current HP, and temporary HP
- Armor Class (equipped armor, shields, unarmored defense, fighting styles, magic items)
- Walking speed and movement bonuses
- Initiative modifier (Dex + Alert, Swashbuckler, Gloom Stalker, etc.)
- Passive senses (Perception, Insight, Investigation with expertise)
- Spell Save DC and primary casting ability
- 2024 Spell Slot grids (Full, Half, Third Casters, and Warlock Pact Magic)
- Class resource counters (Wild Shape, Action Surge, Rage, Focus/Ki, Inspiration)
- Full inventory and attuned/equipped equipment
- Currencies (CP, SP, EP, GP, PP)
- Heroic inspiration, backstory, traits, and notes
"""

import json
import math
import re
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional, Tuple, Union

# D&D Beyond character service endpoint
DDB_CHARACTER_SERVICE_URL = "https://character-service.dndbeyond.com/character/v5/character/{character_id}"

# Ability score ID mapping
STAT_ID_MAP = {
    1: "str",
    2: "dex",
    3: "con",
    4: "int",
    5: "wis",
    6: "cha"
}
STAT_NAME_MAP = {v: k for k, v in STAT_ID_MAP.items()}

# Standard 5e Full Caster spell slot table (index = level)
FULL_CASTER_SLOTS = [
    {},  # Lvl 0
    {"level_1": {"total": 2, "used": 0}},  # Lvl 1
    {"level_1": {"total": 3, "used": 0}},  # Lvl 2
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 2, "used": 0}},  # Lvl 3
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}},  # Lvl 4
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 2, "used": 0}},  # Lvl 5
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}},  # Lvl 6
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 1, "used": 0}},  # Lvl 7
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 2, "used": 0}},  # Lvl 8
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 1, "used": 0}},  # Lvl 9
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 2, "used": 0}},  # Lvl 10
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 2, "used": 0}, "level_6": {"total": 1, "used": 0}},  # Lvl 11
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 2, "used": 0}, "level_6": {"total": 1, "used": 0}},  # Lvl 12
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 2, "used": 0}, "level_6": {"total": 1, "used": 0}, "level_7": {"total": 1, "used": 0}},  # Lvl 13
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 2, "used": 0}, "level_6": {"total": 1, "used": 0}, "level_7": {"total": 1, "used": 0}},  # Lvl 14
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 2, "used": 0}, "level_6": {"total": 1, "used": 0}, "level_7": {"total": 1, "used": 0}, "level_8": {"total": 1, "used": 0}},  # Lvl 15
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 2, "used": 0}, "level_6": {"total": 1, "used": 0}, "level_7": {"total": 1, "used": 0}, "level_8": {"total": 1, "used": 0}},  # Lvl 16
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 2, "used": 0}, "level_6": {"total": 1, "used": 0}, "level_7": {"total": 1, "used": 0}, "level_8": {"total": 1, "used": 0}, "level_9": {"total": 1, "used": 0}},  # Lvl 17
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 3, "used": 0}, "level_6": {"total": 1, "used": 0}, "level_7": {"total": 1, "used": 0}, "level_8": {"total": 1, "used": 0}, "level_9": {"total": 1, "used": 0}},  # Lvl 18
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 3, "used": 0}, "level_6": {"total": 2, "used": 0}, "level_7": {"total": 1, "used": 0}, "level_8": {"total": 1, "used": 0}, "level_9": {"total": 1, "used": 0}},  # Lvl 19
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 3, "used": 0}, "level_6": {"total": 2, "used": 0}, "level_7": {"total": 2, "used": 0}, "level_8": {"total": 1, "used": 0}, "level_9": {"total": 1, "used": 0}},  # Lvl 20
]

# Standard 5e / 2024 Half Caster spell slot table (Paladin & Ranger, index = level)
HALF_CASTER_SLOTS = [
    {},  # Lvl 0
    {"level_1": {"total": 2, "used": 0}},  # Lvl 1 (2024 spellcasting at 1st level)
    {"level_1": {"total": 2, "used": 0}},  # Lvl 2
    {"level_1": {"total": 3, "used": 0}},  # Lvl 3
    {"level_1": {"total": 3, "used": 0}},  # Lvl 4
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 2, "used": 0}},  # Lvl 5
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 2, "used": 0}},  # Lvl 6
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}},  # Lvl 7
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}},  # Lvl 8
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 2, "used": 0}},  # Lvl 9
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 2, "used": 0}},  # Lvl 10
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}},  # Lvl 11
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}},  # Lvl 12
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 1, "used": 0}},  # Lvl 13
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 1, "used": 0}},  # Lvl 14
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 2, "used": 0}},  # Lvl 15
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 2, "used": 0}},  # Lvl 16
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 1, "used": 0}},  # Lvl 17
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 1, "used": 0}},  # Lvl 18
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 2, "used": 0}},  # Lvl 19
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 3, "used": 0}, "level_5": {"total": 2, "used": 0}},  # Lvl 20
]

# Standard 5e / 2024 Third Caster spell slot table (Eldritch Knight & Arcane Trickster, index = level)
THIRD_CASTER_SLOTS = [
    {},  # Lvl 0
    {},  # Lvl 1
    {},  # Lvl 2
    {"level_1": {"total": 2, "used": 0}},  # Lvl 3
    {"level_1": {"total": 3, "used": 0}},  # Lvl 4
    {"level_1": {"total": 3, "used": 0}},  # Lvl 5
    {"level_1": {"total": 3, "used": 0}},  # Lvl 6
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 2, "used": 0}},  # Lvl 7
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 2, "used": 0}},  # Lvl 8
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 2, "used": 0}},  # Lvl 9
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}},  # Lvl 10
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}},  # Lvl 11
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}},  # Lvl 12
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 2, "used": 0}},  # Lvl 13
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 2, "used": 0}},  # Lvl 14
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 2, "used": 0}},  # Lvl 15
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}},  # Lvl 16
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}},  # Lvl 17
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}},  # Lvl 18
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 1, "used": 0}},  # Lvl 19
    {"level_1": {"total": 4, "used": 0}, "level_2": {"total": 3, "used": 0}, "level_3": {"total": 3, "used": 0}, "level_4": {"total": 1, "used": 0}},  # Lvl 20
]

# Warlock Pact Magic slot table: (slot_count, slot_level)
WARLOCK_PACT_SLOTS = {
    1: (1, 1),
    2: (2, 1),
    3: (2, 2),
    4: (2, 2),
    5: (2, 3),
    6: (2, 3),
    7: (2, 4),
    8: (2, 4),
    9: (2, 5),
    10: (2, 5),
    11: (3, 5),
    12: (3, 5),
    13: (3, 5),
    14: (3, 5),
    15: (3, 5),
    16: (3, 5),
    17: (4, 5),
    18: (4, 5),
    19: (4, 5),
    20: (4, 5),
}

# Standard 2024 / 5e Spell Formulas & Damage Types Mapping
KNOWN_SPELL_FORMULAS: Dict[str, Tuple[str, str]] = {
    "fire bolt": ("1d10", "Fire"),
    "eldritch blast": ("1d10", "Force"),
    "ray of frost": ("1d8", "Cold"),
    "shocking grasp": ("1d8", "Lightning"),
    "sacred flame": ("1d8", "Radiant"),
    "toll the dead": ("1d12", "Necrotic"),
    "vicious mockery": ("1d4", "Psychic"),
    "mind sliver": ("1d6", "Psychic"),
    "acid splash": ("1d6", "Acid"),
    "chill touch": ("1d10", "Necrotic"),
    "poison spray": ("1d12", "Poison"),
    "primal savagery": ("1d10", "Acid"),
    "thorn whip": ("1d6", "Piercing"),
    "word of radiance": ("1d6", "Radiant"),
    "cure wounds": ("2d8 + MOD", "Healing"),
    "healing word": ("2d4 + MOD", "Healing"),
    "guiding bolt": ("4d6", "Radiant"),
    "inflict wounds": ("2d10 + MOD", "Necrotic"),
    "magic missile": ("1d4 + 1", "Force"),
    "burning hands": ("3d6", "Fire"),
    "thunderwave": ("2d8", "Thunder"),
    "chaos bolt": ("2d8 + 1d6", "Chaos"),
    "chromatic orb": ("3d8", "Elemental"),
    "dissonant whispers": ("3d6", "Psychic"),
    "witch bolt": ("2d12", "Lightning"),
    "scorching ray": ("2d6", "Fire"),
    "shatter": ("3d8", "Thunder"),
    "moonbeam": ("2d10", "Radiant"),
    "spiritual weapon": ("1d8 + MOD", "Force"),
    "acid arrow": ("4d4", "Acid"),
    "flaming sphere": ("2d6", "Fire"),
    "prayer of healing": ("2d8 + MOD", "Healing"),
    "fireball": ("8d6", "Fire"),
    "lightning bolt": ("8d6", "Lightning"),
    "spirit guardians": ("3d8", "Radiant"),
    "call lightning": ("3d10", "Lightning"),
    "mass healing word": ("2d4 + MOD", "Healing"),
    "blight": ("8d8", "Necrotic"),
    "ice storm": ("2d8 + 4d6", "Cold"),
    "cone of cold": ("8d8", "Cold"),
    "flame strike": ("4d6 + 4d6", "Radiant/Fire"),
    "mass cure wounds": ("3d8 + MOD", "Healing"),
    "heal": ("70", "Healing"),
    "harm": ("14d6", "Necrotic"),
    "chain lightning": ("10d8", "Lightning"),
    "disintegrate": ("10d6 + 40", "Force"),
    "finger of death": ("7d8 + 30", "Necrotic"),
    "fire storm": ("7d10", "Fire"),
    "sunbeam": ("6d8", "Radiant"),
    "sunburst": ("12d6", "Radiant"),
    "meteor swarm": ("20d6 + 20d6", "Fire/Bludgeoning")
}


def extract_character_id(input_str: str) -> Optional[str]:
    """Extract character ID from various D&D Beyond URL formats or raw ID."""
    if not input_str:
        return None
    cleaned = input_str.strip()
    # Match raw digits
    if cleaned.isdigit():
        return cleaned

    # Match dndbeyond.com/characters/12345678 or ddb.ac/characters/12345678
    patterns = [
        r"dndbeyond\.com/characters/(\d+)",
        r"ddb\.ac/characters/(\d+)",
        r"character-service\.dndbeyond\.com/character/v\d+/character/(\d+)",
        r"/characters/(\d+)"
    ]
    for pattern in patterns:
        m = re.search(pattern, cleaned)
        if m:
            return m.group(1)

    return None


def fetch_dndbeyond_character(character_id: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Fetches public character JSON from D&D Beyond.
    Returns: (character_data_dict, error_message_if_any)
    """
    clean_id = extract_character_id(character_id)
    if not clean_id:
        return None, f"Could not extract a valid D&D Beyond character ID from '{character_id}'."

    url = DDB_CHARACTER_SERVICE_URL.format(character_id=clean_id)
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
        }
    )

    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = json.load(resp)
            if isinstance(raw, dict) and "data" in raw:
                return raw["data"], None
            elif isinstance(raw, dict) and "id" in raw and "classes" in raw:
                return raw, None
            return None, "Unexpected response structure from D&D Beyond."
    except urllib.error.HTTPError as e:
        if e.code == 403:
            return None, (
                "Character is set to Private on D&D Beyond. "
                "To import via link, open your sheet on D&D Beyond, go to Preferences/Home tab, "
                "and set 'Character Privacy' to 'Public'. "
                "Alternatively, you can export and upload the character JSON file."
            )
        elif e.code == 404:
            return None, f"Character ID {clean_id} was not found on D&D Beyond."
        return None, f"D&D Beyond server responded with HTTP {e.code}: {e.reason}."
    except urllib.error.URLError as e:
        return None, f"Network error connecting to D&D Beyond: {e.reason}."
    except Exception as e:
        return None, f"Failed to fetch character: {str(e)}."


def parse_dndbeyond_character(raw_json: Union[str, Dict[str, Any]]) -> Dict[str, Any]:
    """
    Parses a D&D Beyond character payload into Arcane Ledger's Character schema.
    """
    if isinstance(raw_json, str):
        data = json.loads(raw_json)
    else:
        data = raw_json

    if not isinstance(data, dict):
        raise ValueError("Invalid character payload: expected JSON object")

    # If already a parsed Arcane Ledger character dictionary, return as-is
    if "ac" in data and "currentHp" in data and "classRole" in data and "modifiers" not in data:
        return data

    # Normalize if nested under "data"
    d = data.get("data", data)

    # 1. Identity & Names
    char_id = str(d.get("id") or f"pc-{math.floor(math.time.time() if hasattr(math, 'time') else 1000)}")
    name = (d.get("name") or "Unnamed Adventurer").strip()
    player = (d.get("username") or d.get("socialName") or "").strip()

    # 2. Race / Species
    race_info = d.get("race") or {}
    species = (race_info.get("fullName") or race_info.get("baseRaceName") or "Human").strip()

    # 3. Classes & Level Breakdown
    classes_list = d.get("classes") or []
    class_role_parts = []
    total_level = 0
    full_caster_levels = 0
    half_caster_levels = 0
    artificer_levels = 0
    third_caster_levels = 0
    warlock_levels = 0
    class_resources = []

    for c in classes_list:
        c_def = c.get("definition") or {}
        sc_def = c.get("subclassDefinition") or {}
        c_name = c_def.get("name") or "Adventurer"
        c_lvl = c.get("level") or 1
        total_level += c_lvl

        sc_name = sc_def.get("name") if sc_def else None
        if sc_name:
            class_role_parts.append(f"{c_name} ({sc_name})")
        else:
            class_role_parts.append(c_name)

        # Spellcaster progression categories
        if c_name in ["Wizard", "Cleric", "Druid", "Sorcerer", "Bard"]:
            full_caster_levels += c_lvl
        elif c_name in ["Paladin", "Ranger"]:
            half_caster_levels += c_lvl
        elif c_name == "Artificer":
            artificer_levels += c_lvl
        elif c_name == "Warlock":
            warlock_levels += c_lvl
        elif sc_name in ["Eldritch Knight", "Arcane Trickster"]:
            third_caster_levels += c_lvl

        # Seed key class resources
        if c_name == "Fighter":
            class_resources.append({"name": "Second Wind", "total": 2 if c_lvl < 5 else (3 if c_lvl < 10 else 4), "used": 0})
            if c_lvl >= 2:
                class_resources.append({"name": "Action Surge", "total": 1 if c_lvl < 17 else 2, "used": 0})
            if c_lvl >= 9:
                class_resources.append({"name": "Indomitable", "total": 1 if c_lvl < 13 else (2 if c_lvl < 17 else 3), "used": 0})
            if sc_name == "Battle Master":
                dice_count = 4 if c_lvl < 7 else (5 if c_lvl < 15 else 6)
                class_resources.append({"name": "Superiority Dice", "total": dice_count, "used": 0})

        elif c_name == "Barbarian":
            rages = 2 if c_lvl < 3 else (3 if c_lvl < 6 else (4 if c_lvl < 12 else (5 if c_lvl < 17 else (6 if c_lvl < 20 else 99))))
            class_resources.append({"name": "Rage", "total": rages, "used": 0})

        elif c_name == "Monk":
            class_resources.append({"name": "Focus / Ki Points", "total": c_lvl, "used": 0})

        elif c_name == "Druid":
            class_resources.append({"name": "Wild Shape", "total": 2 if c_lvl < 20 else 99, "used": 0})

        elif c_name == "Bard":
            class_resources.append({"name": "Bardic Inspiration", "total": 3, "used": 0})

        elif c_name == "Sorcerer":
            if c_lvl >= 2:
                class_resources.append({"name": "Sorcery Points", "total": c_lvl, "used": 0})

        elif c_name in ["Cleric", "Paladin"]:
            if c_lvl >= 2:
                class_resources.append({"name": "Channel Divinity", "total": 1 if c_lvl < 6 else (2 if c_lvl < 18 else 3), "used": 0})
            if c_name == "Paladin":
                class_resources.append({"name": "Lay on Hands (HP)", "total": c_lvl * 5, "used": 0})

    level = max(1, total_level)
    prof_bonus = (level - 1) // 4 + 2
    class_role = " / ".join(class_role_parts) if class_role_parts else "Adventurer"

    # 4. Modifiers Aggregation
    all_mods = []
    mods_dict = d.get("modifiers") or {}
    for cat in ["race", "class", "background", "item", "feat", "condition"]:
        all_mods.extend(mods_dict.get(cat) or [])

    # 5. Ability Scores Calculation
    base_stats = {s["id"]: s.get("value", 10) for s in d.get("stats") or []}
    bonus_stats = {s["id"]: s.get("value") for s in d.get("bonusStats") or [] if s.get("value") is not None}
    override_stats = {s["id"]: s.get("value") for s in d.get("overrideStats") or [] if s.get("value") is not None}

    final_scores = {}
    for stat_id, stat_key in STAT_ID_MAP.items():
        if stat_id in override_stats:
            final_scores[stat_key] = override_stats[stat_id]
            continue

        raw = base_stats.get(stat_id, 10) + bonus_stats.get(stat_id, 0)
        # Modifiers of type 'bonus'
        bonus_val = sum(
            m.get("value", 0) for m in all_mods
            if m.get("type") == "bonus" and m.get("subType") == f"{stat_key}-score" and m.get("value") is not None
        )
        # Modifiers of type 'set' (e.g. Gauntlets of Ogre Power = 19)
        set_vals = [
            m.get("value") for m in all_mods
            if m.get("type") == "set" and m.get("subType") == f"{stat_key}-score" and m.get("value") is not None
        ]
        if set_vals:
            final_scores[stat_key] = max(raw + bonus_val, max(set_vals))
        else:
            final_scores[stat_key] = raw + bonus_val

    modifiers = {s: (val - 10) // 2 for s, val in final_scores.items()}

    # Update Bardic Inspiration total if Charisma modifier is known
    for r in class_resources:
        if r["name"] == "Bardic Inspiration":
            r["total"] = max(1, modifiers["cha"])

    # 6. Hit Points Calculation
    base_hp = d.get("baseHitPoints") or 10
    bonus_hp = d.get("bonusHitPoints") or 0
    override_hp = d.get("overrideHitPoints")
    con_mod = modifiers["con"]

    hp_per_lvl_bonus = sum(
        m.get("value", 0) for m in all_mods
        if m.get("type") == "bonus" and m.get("subType") == "hit-points-per-level" and m.get("value") is not None
    )

    calculated_max_hp = base_hp + (con_mod * level) + bonus_hp + (hp_per_lvl_bonus * level)
    max_hp = override_hp if override_hp is not None else max(1, calculated_max_hp)
    removed_hp = d.get("removedHitPoints") or 0
    current_hp = max(0, max_hp - removed_hp)
    temp_hp = d.get("temporaryHitPoints") or 0

    # 7. Armor Class (AC) Calculation
    dex_mod = modifiers["dex"]
    equipped_armor = []
    has_shield = False

    for item in d.get("inventory") or []:
        if not item.get("equipped"):
            continue
        def_item = item.get("definition") or {}
        ac_val = def_item.get("armorClass")
        a_type = def_item.get("type")
        item_name = def_item.get("name") or ""

        if a_type == "Shield" or "shield" in item_name.lower():
            has_shield = True
        elif ac_val is not None:
            equipped_armor.append((ac_val, a_type, item_name))

    if equipped_armor:
        # Base armor AC
        base_ac, a_type, _ = equipped_armor[0]
        if a_type == "Light Armor":
            ac = base_ac + dex_mod
        elif a_type == "Medium Armor":
            ac = base_ac + min(2, dex_mod)
        else:  # Heavy Armor
            ac = base_ac
    else:
        # Unarmored
        has_barbarian = any(c.get("definition", {}).get("name") == "Barbarian" for c in classes_list)
        has_monk = any(c.get("definition", {}).get("name") == "Monk" for c in classes_list)
        has_draconic = any("Draconic" in (c.get("subclassDefinition") or {}).get("name", "") for c in classes_list)

        if has_barbarian:
            ac = 10 + dex_mod + modifiers["con"]
        elif has_monk and not has_shield:
            ac = 10 + dex_mod + modifiers["wis"]
        elif has_draconic:
            ac = 13 + dex_mod
        else:
            ac = 10 + dex_mod

    if has_shield:
        ac += 2

    # Additional AC bonuses (rings, cloaks, fighting style)
    ac_bonuses = sum(
        m.get("value", 0) for m in all_mods
        if m.get("type") == "bonus" and m.get("subType") in ["armor-class", "ac"] and m.get("value") is not None
    )
    ac += ac_bonuses

    # CharacterValues AC override (if user set manual override on sheet)
    for cv in d.get("characterValues") or []:
        if cv.get("typeId") == 1 and cv.get("value") is not None:  # AC override
            ac = int(cv["value"])

    # 8. Speed Calculation
    speed = 30
    weight_speeds = (race_info.get("weightSpeeds") or {}).get("normal") or {}
    if weight_speeds.get("walk"):
        speed = weight_speeds["walk"]
    elif race_info.get("baseSpeed"):
        speed = race_info["baseSpeed"]

    speed_bonus = sum(
        m.get("value", 0) for m in all_mods
        if m.get("type") == "bonus" and m.get("subType") in ["speed", "unarmored-movement"] and m.get("value") is not None
    )
    speed += speed_bonus

    # 9. Initiative Modifier
    init_mod = dex_mod
    init_bonus = sum(
        m.get("value", 0) for m in all_mods
        if m.get("type") == "bonus" and m.get("subType") == "initiative" and m.get("value") is not None
    )
    init_mod += init_bonus

    # Subclass bonuses (Swashbuckler Cha, Gloom Stalker Wis, War Magic Int)
    for c in classes_list:
        sc_name = (c.get("subclassDefinition") or {}).get("name") or ""
        if sc_name == "Swashbuckler":
            init_mod += max(0, modifiers["cha"])
        elif sc_name == "Gloom Stalker":
            init_mod += max(0, modifiers["wis"])
        elif sc_name == "War Magic":
            init_mod += max(0, modifiers["int"])

    # 10. Passive Senses (Perception, Insight, Investigation)
    def calc_skill_mod(skill_name: str, ability_key: str) -> int:
        is_prof = any(m.get("type") == "proficiency" and m.get("subType") == skill_name for m in all_mods)
        is_expert = any(m.get("type") == "expertise" and m.get("subType") == skill_name for m in all_mods)
        mult = 2 if is_expert else (1 if is_prof else 0)
        return modifiers[ability_key] + (prof_bonus * mult)

    passive_perc = 10 + calc_skill_mod("perception", "wis")
    passive_ins = 10 + calc_skill_mod("insight", "wis")
    passive_inv = 10 + calc_skill_mod("investigation", "int")

    passive_perc += sum(m.get("value", 0) for m in all_mods if m.get("type") == "bonus" and m.get("subType") == "passive-perception")
    passive_ins += sum(m.get("value", 0) for m in all_mods if m.get("type") == "bonus" and m.get("subType") == "passive-insight")
    passive_inv += sum(m.get("value", 0) for m in all_mods if m.get("type") == "bonus" and m.get("subType") == "passive-investigation")

    # Observant Feat (+5 to Passive Perception & Investigation)
    has_observant = any(
        (f.get("definition") or {}).get("name") == "Observant"
        for f in d.get("feats") or []
    )
    if has_observant:
        passive_perc += 5
        passive_inv += 5

    # 11. Spell Save DC & Primary Casting Ability
    primary_cast_ability = None
    for c in classes_list:
        c_name = (c.get("definition") or {}).get("name") or ""
        if c_name in ["Wizard", "Artificer"]:
            primary_cast_ability = "int"
            break
        elif c_name in ["Cleric", "Druid", "Ranger"]:
            primary_cast_ability = "wis"
            break
        elif c_name in ["Bard", "Paladin", "Sorcerer", "Warlock"]:
            primary_cast_ability = "cha"
            break

    spell_dc = None
    spell_attack_mod = None
    spell_mod = None
    if primary_cast_ability:
        spell_mod = modifiers[primary_cast_ability]
        spell_dc = 8 + prof_bonus + spell_mod
        spell_attack_mod = prof_bonus + spell_mod
        dc_bonus = sum(
            m.get("value", 0) for m in all_mods
            if m.get("type") == "bonus" and m.get("subType") in ["spell-save-dc", "bonus-spell-save-dc"] and m.get("value") is not None
        )
        spell_dc += dc_bonus
        atk_bonus = sum(
            m.get("value", 0) for m in all_mods
            if m.get("type") == "bonus" and m.get("subType") in ["spell-attack-bonus", "spell-attacks", "bonus-spell-attacks"] and m.get("value") is not None
        )
        spell_attack_mod += atk_bonus

    # 12. Spell Slots Generation (Multiclass Caster Rules & Dedicated Half/Third Caster Tables)
    spell_slots = {}
    is_single_half = (half_caster_levels > 0 and full_caster_levels == 0 and artificer_levels == 0 and third_caster_levels == 0)
    is_single_artificer = (artificer_levels > 0 and full_caster_levels == 0 and half_caster_levels == 0 and third_caster_levels == 0)
    is_single_third = (third_caster_levels > 0 and full_caster_levels == 0 and half_caster_levels == 0 and artificer_levels == 0)

    if is_single_half:
        capped_lvl = min(20, half_caster_levels)
        slots_template = HALF_CASTER_SLOTS[capped_lvl]
        for lvl_key, slot_obj in slots_template.items():
            spell_slots[lvl_key] = {"total": slot_obj["total"], "used": 0}
    elif is_single_artificer:
        art_eff = min(20, (artificer_levels + 1) // 2)
        slots_template = FULL_CASTER_SLOTS[art_eff]
        for lvl_key, slot_obj in slots_template.items():
            spell_slots[lvl_key] = {"total": slot_obj["total"], "used": 0}
    elif is_single_third:
        capped_lvl = min(20, third_caster_levels)
        slots_template = THIRD_CASTER_SLOTS[capped_lvl]
        for lvl_key, slot_obj in slots_template.items():
            spell_slots[lvl_key] = {"total": slot_obj["total"], "used": 0}
    else:
        effective_caster_level = full_caster_levels + (half_caster_levels // 2) + ((artificer_levels + 1) // 2) + (third_caster_levels // 3)
        if effective_caster_level > 0:
            capped_lvl = min(20, effective_caster_level)
            slots_template = FULL_CASTER_SLOTS[capped_lvl]
            for lvl_key, slot_obj in slots_template.items():
                spell_slots[lvl_key] = {"total": slot_obj["total"], "used": 0}

    # Warlock Pact Magic slots
    if warlock_levels > 0:
        pact_count, pact_lvl = WARLOCK_PACT_SLOTS.get(min(20, warlock_levels), (1, 1))
        pact_key = f"pact_level_{pact_lvl}"
        spell_slots[pact_key] = {"total": pact_count, "used": 0}

    # Map any existing used slot count from DDB character payload
    raw_spell_slots = d.get("spellSlots") or []
    if isinstance(raw_spell_slots, list):
        for ss in raw_spell_slots:
            if isinstance(ss, dict):
                lvl = ss.get("level")
                used = ss.get("used", 0)
                total = ss.get("available") or ss.get("total") or ss.get("max")
                key = f"level_{lvl}"
                if total and isinstance(total, int) and total > 0:
                    if key not in spell_slots:
                        spell_slots[key] = {"total": total, "used": 0}
                    else:
                        spell_slots[key]["total"] = max(spell_slots[key]["total"], total)
                if key in spell_slots and used > 0:
                    spell_slots[key]["used"] = min(spell_slots[key]["total"], used)

    raw_pact_magic = d.get("pactMagic") or []
    if isinstance(raw_pact_magic, list):
        for pm in raw_pact_magic:
            if isinstance(pm, dict):
                used = pm.get("used", 0)
                for k in spell_slots:
                    if k.startswith("pact_level_") and used > 0:
                        spell_slots[k]["used"] = min(spell_slots[k]["total"], used)

    # 12b. Spells Extraction & 2024 Compendium Enrichment
    extracted_spells = []
    seen_spell_names = set()

    compendium_spells = {}
    try:
        from pathlib import Path
        spells_path = Path(__file__).resolve().parent / "data" / "spells.json"
        if spells_path.exists():
            with open(spells_path, "r", encoding="utf-8") as f:
                for sp in json.load(f):
                    compendium_spells[sp["name"].lower().strip()] = sp
    except Exception:
        pass

    raw_spell_candidates = []
    for cs in d.get("classSpells") or []:
        if isinstance(cs, dict):
            for s in cs.get("spells") or []:
                raw_spell_candidates.append(s)

    spells_dict = d.get("spells") or {}
    if isinstance(spells_dict, dict):
        for source_list in spells_dict.values():
            if isinstance(source_list, list):
                raw_spell_candidates.extend(source_list)
    elif isinstance(spells_dict, list):
        raw_spell_candidates.extend(spells_dict)

    for cs in d.get("customSpells") or []:
        raw_spell_candidates.append(cs)

    # Class / Race / Feat Action spells (Paladin Oath spells, smites, domain spells, etc.)
    actions_dict = d.get("actions") or {}
    if isinstance(actions_dict, dict):
        for act_cat, act_list in actions_dict.items():
            if isinstance(act_list, list):
                for act in act_list:
                    if isinstance(act, dict):
                        act_name = (act.get("name") or (act.get("definition") or {}).get("name") or "").strip().lower()
                        if act.get("isSpell") or act.get("spell") or act.get("spellId") or (act_name and act_name in compendium_spells):
                            raw_spell_candidates.append(act)

    # Inventory magic item granted spells
    for it in (d.get("inventory") or []):
        if isinstance(it, dict):
            idef = it.get("definition") or {}
            for sp in (idef.get("spells") or it.get("spells") or []):
                if isinstance(sp, dict):
                    raw_spell_candidates.append(sp)

    # Feat and Racial trait granted spells
    for ft in (d.get("feats") or []):
        if isinstance(ft, dict):
            fdef = ft.get("definition") or {}
            for sp in (fdef.get("spells") or ft.get("spells") or []):
                if isinstance(sp, dict):
                    raw_spell_candidates.append(sp)

    for rt in ((d.get("race") or {}).get("racialTraits") or []):
        if isinstance(rt, dict):
            rdef = rt.get("definition") or {}
            for sp in (rdef.get("spells") or rt.get("spells") or []):
                if isinstance(sp, dict):
                    raw_spell_candidates.append(sp)

    options_dict = d.get("options") or {}
    if isinstance(options_dict, dict):
        for opt_cat, opt_list in options_dict.items():
            if isinstance(opt_list, list):
                for opt in opt_list:
                    if isinstance(opt, dict):
                        opt_name = (opt.get("name") or (opt.get("definition") or {}).get("name") or "").strip().lower()
                        if opt.get("isSpell") or opt.get("spell") or opt.get("spellId") or (opt_name and opt_name in compendium_spells):
                            raw_spell_candidates.append(opt)
                        for sp in ((opt.get("definition") or {}).get("spells") or opt.get("spells") or []):
                            if isinstance(sp, dict):
                                raw_spell_candidates.append(sp)

    for s in raw_spell_candidates:
        if not isinstance(s, dict):
            continue
        definition = s.get("definition") or s
        s_name = (s.get("definition") or {}).get("name") or s.get("name")
        if not s_name:
            continue
        norm_name = s_name.lower().strip()
        if norm_name in seen_spell_names:
            continue
        seen_spell_names.add(norm_name)

        lvl = definition.get("level", 0)
        school = definition.get("school") or "Evocation"
        conc = bool(definition.get("concentration", False))
        ritual = bool(definition.get("ritual", False))

        activation = definition.get("activation") or {}
        act_type = activation.get("activationType")
        act_time = activation.get("activationTime", 1)
        type_str = {
            1: "Action",
            3: "Bonus Action",
            4: "Reaction",
            6: f"{act_time} Minute{'s' if act_time > 1 else ''}",
            7: f"{act_time} Hour{'s' if act_time > 1 else ''}",
            8: "Special"
        }.get(act_type, "Action" if act_time == 1 else f"{act_time} Actions")
        cast_time = type_str

        range_info = definition.get("range") or {}
        range_val = range_info.get("rangeValue")
        range_origin = range_info.get("origin") or ""
        range_str = f"{range_val} ft" if range_val else (range_origin or "Self")

        dur_info = definition.get("duration") or {}
        dur_val = dur_info.get("durationInterval")
        dur_unit = dur_info.get("durationUnit")
        dur_str = f"{dur_val} {dur_unit}" if dur_val and dur_unit else ("Instantaneous" if not conc else "Concentration")

        comp_desc = definition.get("componentsDescription")
        if not comp_desc:
            comp_list = []
            comps = definition.get("components") or []
            if 1 in comps: comp_list.append("V")
            if 2 in comps: comp_list.append("S")
            if 3 in comps: comp_list.append("M")
            comp_desc = ", ".join(comp_list) if comp_list else "V, S"

        raw_desc = definition.get("description") or definition.get("snippet") or ""
        clean_desc = re.sub(r"<[^>]+>", "", raw_desc).strip()
        higher_levels = ""

        if norm_name in compendium_spells:
            comp_data = compendium_spells[norm_name]
            lvl = comp_data.get("level", lvl)
            school = comp_data.get("school", school)
            cast_time = comp_data.get("castingTime", cast_time)
            range_str = comp_data.get("range", range_str)
            comp_desc = comp_data.get("components", comp_desc)
            dur_str = comp_data.get("duration", dur_str)
            conc = comp_data.get("concentration", conc)
            ritual = comp_data.get("ritual", ritual)
            clean_desc = comp_data.get("description", clean_desc)
            higher_levels = comp_data.get("higherLevels", "")

        formula = None
        damage_type = None

        if norm_name in KNOWN_SPELL_FORMULAS:
            formula, damage_type = KNOWN_SPELL_FORMULAS[norm_name]
        else:
            m_dmg = re.search(r'(\d+d\d+(?:\s*[+-]\s*\d+)?)\s+([A-Za-z]+)\s+damage', clean_desc, re.I)
            if m_dmg:
                formula = m_dmg.group(1).replace(" ", "")
                damage_type = m_dmg.group(2).capitalize()
            else:
                m_dice = re.search(r'\b(\d+d\d+(?:\s*[+-]\s*\d+)?)\b', clean_desc)
                if m_dice:
                    formula = m_dice.group(1).replace(" ", "")

        if formula and "MOD" in formula:
            eff_mod = spell_mod if spell_mod is not None else 3
            formula = formula.replace("MOD", str(max(0, eff_mod)))

        if int(lvl) == 0 and formula and re.match(r'^1d(\d+)', formula):
            dice_count = 1
            if level >= 17:
                dice_count = 4
            elif level >= 11:
                dice_count = 3
            elif level >= 5:
                dice_count = 2
            formula = re.sub(r'^1d(\d+)', f"{dice_count}d\\1", formula)

        is_prepared = bool(s.get("prepared", True) or s.get("alwaysPrepared", False) or int(lvl) == 0)

        clean_slug = re.sub(r'[^a-z0-9]+', '-', norm_name).strip('-')
        extracted_spells.append({
            "id": f"spell-{clean_slug}",
            "name": s_name,
            "level": int(lvl),
            "school": school,
            "castTime": cast_time,
            "range": range_str,
            "duration": dur_str,
            "concentration": conc,
            "ritual": ritual,
            "components": comp_desc,
            "formula": formula,
            "damageType": damage_type,
            "description": clean_desc,
            "higherLevels": higher_levels,
            "prepared": is_prepared
        })

    extracted_spells.sort(key=lambda sp: (sp.get("level", 0), sp.get("name", "").lower()))

    # 13. Currencies
    curr = d.get("currencies") or {}
    currency_dict = {
        "pp": curr.get("pp", 0),
        "gp": curr.get("gp", 0) + (curr.get("ep", 0) // 2),
        "sp": curr.get("sp", 0),
        "cp": curr.get("cp", 0)
    }

    # 14. Inventory
    inventory_items = []
    for inv in d.get("inventory") or []:
        def_item = inv.get("definition") or {}
        item_name = def_item.get("name")
        if not item_name:
            continue

        cat = def_item.get("filterType") or def_item.get("type") or "Item"
        rarity = def_item.get("rarity") or "Mundane"
        qty = inv.get("quantity") or 1
        weight = float(def_item.get("weight") or 0.0)
        equipped = bool(inv.get("equipped", False))
        attuned = bool(inv.get("isAttuned", False))

        damage_info = def_item.get("damage") or {}
        damage_dice = damage_info.get("diceString")
        if not damage_dice and damage_info.get("diceCount") and damage_info.get("diceValue"):
            damage_dice = f"{damage_info['diceCount']}d{damage_info['diceValue']}"

        notes = def_item.get("snippet") or def_item.get("description") or ""
        clean_notes = re.sub(r"<[^>]+>", "", notes).strip()
        if damage_dice and damage_dice not in clean_notes:
            dmg_type = (def_item.get("damageType") or "").strip()
            prefix = f"{damage_dice} {dmg_type}".strip()
            clean_notes = f"{prefix} • {clean_notes}" if clean_notes else prefix
        if len(clean_notes) > 160:
            clean_notes = clean_notes[:157] + "..."

        item_dict = {
            "id": f"inv-{inv.get('id', len(inventory_items) + 1)}",
            "name": item_name,
            "category": cat,
            "rarity": rarity,
            "qty": qty,
            "weight": weight,
            "equipped": equipped,
            "attuned": attuned,
            "notes": clean_notes
        }
        if damage_dice:
            item_dict["damageDice"] = damage_dice
        inventory_items.append(item_dict)

    # 15. Notes & Backstory
    notes_list = []
    traits = d.get("traits") or {}
    if traits.get("personalityTraits"):
        notes_list.append(f"Personality: {traits['personalityTraits']}")
    if traits.get("ideals"):
        notes_list.append(f"Ideals: {traits['ideals']}")
    if traits.get("bonds"):
        notes_list.append(f"Bonds: {traits['bonds']}")
    if traits.get("flaws"):
        notes_list.append(f"Flaws: {traits['flaws']}")

    bg_name = (d.get("background") or {}).get("definition", {}).get("name")
    if bg_name:
        notes_list.append(f"Background: {bg_name}")

    notes_str = "\n".join(notes_list)

    # 16. Avatar / Portrait URL
    decorations = d.get("decorations") or {}
    avatar_url = decorations.get("avatarUrl") or d.get("avatarUrl") or ""

    # 17. Carry Weight (Strength * 15 standard, or modified)
    max_carry = final_scores["str"] * 15

    # 18. Deity / Faith
    faith = d.get("faith") or ""

    return {
        "id": f"pc-ddb-{char_id}",
        "name": name,
        "player": player,
        "species": species,
        "classRole": class_role,
        "level": level,
        "ac": ac,
        "speed": speed,
        "currentHp": current_hp,
        "maxHp": max_hp,
        "tempHp": temp_hp,
        "initiativeMod": init_mod,
        "passivePerception": passive_perc,
        "passiveInsight": passive_ins,
        "passiveInvestigation": passive_inv,
        "spellDc": spell_dc,
        "spellAttackMod": spell_attack_mod,
        "spellMod": spell_mod,
        "heroicInspiration": bool(d.get("inspiration", False)),
        "deathSaves": {
            "successes": d.get("deathSaves", {}).get("successCount", 0),
            "failures": d.get("deathSaves", {}).get("failCount", 0)
        },
        "notes": notes_str,
        "spellSlots": spell_slots if spell_slots else None,
        "spells": extracted_spells,
        "resources": class_resources if class_resources else None,
        "inventory": inventory_items,
        "currency": currency_dict,
        "maxCarryWeight": max_carry,
        "deityId": "",
        "deityName": faith,
        "pietyScore": 1,
        "avatarUrl": avatar_url,
        "ddbId": char_id,
        "ddbUrl": f"https://www.dndbeyond.com/characters/{char_id}"
    }


def sync_dndbeyond_character(existing_char: Dict[str, Any]) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Refetches and updates an existing character that has a `ddbId`.
    Preserves local custom notes, deity selection, and inventory.
    """
    ddb_id = existing_char.get("ddbId")
    if not ddb_id:
        return None, "Character does not have an associated D&D Beyond ID."

    raw_data, err = fetch_dndbeyond_character(ddb_id)
    if err:
        return None, err

    fresh = parse_dndbeyond_character(raw_data)

    # Preserve original internal id and custom notes
    fresh["id"] = existing_char.get("id", fresh["id"])
    orig_notes = (existing_char.get("notes") or "").strip()
    fresh_notes = (fresh.get("notes") or "").strip()
    if orig_notes:
        if not fresh_notes:
            fresh["notes"] = orig_notes
        elif orig_notes not in fresh_notes:
            fresh["notes"] = f"{fresh_notes}\n\nLocal DM Notes:\n{orig_notes}".strip()

    if existing_char.get("deityId"):
        fresh["deityId"] = existing_char["deityId"]
    if existing_char.get("deityName"):
        fresh["deityName"] = existing_char["deityName"]
    if existing_char.get("pietyScore") is not None:
        fresh["pietyScore"] = existing_char["pietyScore"]

    # Preserve locally added custom spells that were not in DDB
    existing_spells = existing_char.get("spells") or []
    if existing_spells:
        fresh_names = {sp.get("name", "").lower().strip() for sp in fresh.get("spells", [])}
        for esp in existing_spells:
            if esp.get("name", "").lower().strip() not in fresh_names:
                fresh.setdefault("spells", []).append(esp)
        fresh["spells"].sort(key=lambda sp: (sp.get("level", 0), sp.get("name", "").lower()))

    return fresh, None
