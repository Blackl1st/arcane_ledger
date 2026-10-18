"""
Curse of Strahd Battlemap Pack Importer
=======================================
Automatically scans any folder of downloaded battlemaps (e.g. from DM Andy's Ko-fi/Patreon
or Mike Schley's map packs), identifies the chapter and floor, selects the optimal 4K
gridless version, and deploys it directly into Arcane Ledger.

Usage:
    python tools/import_cos_maps.py "C:\\path\\to\\DM_Andy_Maps"
    python tools/import_cos_maps.py "C:\\Downloads\\Curse_Of_Strahd_Maps.zip"
"""

import sys
import os
import shutil
import zipfile
import tempfile
from pathlib import Path
from typing import Dict, Any, List, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent
STATIC_COS_DIR = ROOT_DIR / "static" / "images" / "battlemaps" / "cos"
STATIC_COS_DIR.mkdir(parents=True, exist_ok=True)

# Pattern definitions for CoS battlemaps
SLOT_PATTERNS = [
    {
        "id": "cos_death_house_f1",
        "name": "Death House - Ground Floor",
        "target": "death_house_f1",
        "keywords": [["death", "house", "ground"], ["death", "house", "f1"], ["death", "house", "floor 1"], ["death", "house", "1st floor"], ["durst", "ground"]]
    },
    {
        "id": "cos_death_house_f2",
        "name": "Death House - Upper Floor",
        "target": "death_house_f2",
        "keywords": [["death", "house", "upper"], ["death", "house", "f2"], ["death", "house", "floor 2"], ["death", "house", "2nd floor"], ["durst", "upper"]]
    },
    {
        "id": "cos_death_house_attic",
        "name": "Death House - Attic & Children's Room",
        "target": "death_house_attic",
        "keywords": [["death", "house", "attic"], ["death", "house", "f3"], ["death", "house", "floor 3"], ["durst", "attic"]]
    },
    {
        "id": "cos_death_house_dungeon",
        "name": "Death House - Cult Undercroft & Reliquary",
        "target": "death_house_dungeon",
        "keywords": [["death", "house", "dungeon"], ["death", "house", "basement"], ["death", "house", "undercroft"], ["death", "house", "crypt"], ["durst", "dungeon"]]
    },
    {
        "id": "cos_castle_ravenloft_main",
        "name": "Castle Ravenloft - Main Floor",
        "target": "castle_ravenloft_main",
        "keywords": [["ravenloft", "main"], ["ravenloft", "ground"], ["ravenloft", "floor 1"], ["castle ravenloft", "entry"]]
    },
    {
        "id": "cos_castle_ravenloft_spire",
        "name": "Castle Ravenloft - Spires & Heart of Sorrow",
        "target": "castle_ravenloft_spire",
        "keywords": [["ravenloft", "spire"], ["ravenloft", "heart"], ["ravenloft", "tower"], ["castle ravenloft", "belfry"]]
    },
    {
        "id": "cos_castle_ravenloft_catacombs",
        "name": "Castle Ravenloft - Catacombs & Crypts",
        "target": "castle_ravenloft_catacombs",
        "keywords": [["ravenloft", "catacomb"], ["ravenloft", "crypt"], ["ravenloft", "tomb"], ["castle ravenloft", "dungeon"]]
    },
    {
        "id": "cos_old_bonegrinder",
        "name": "Old Bonegrinder Windmill",
        "target": "old_bonegrinder",
        "keywords": [["bonegrinder"], ["windmill", "hag"], ["morgantha"]]
    },
    {
        "id": "cos_vallaki_blue_water",
        "name": "Town of Vallaki - Blue Water Inn",
        "target": "vallaki_blue_water",
        "keywords": [["blue water"], ["vallaki", "inn"], ["martikov", "inn"]]
    },
    {
        "id": "cos_vallaki_church",
        "name": "Town of Vallaki - St. Andral's Church",
        "target": "vallaki_church",
        "keywords": [["andral"], ["vallaki", "church"]]
    },
    {
        "id": "cos_vallaki_coffin",
        "name": "Town of Vallaki - Coffin Maker's Shop",
        "target": "vallaki_coffin",
        "keywords": [["coffin"], ["henrik", "shop"], ["vampire nest"]]
    },
    {
        "id": "cos_tser_pool",
        "name": "Tser Pool Encampment",
        "target": "tser_pool",
        "keywords": [["tser pool"], ["madam eva"], ["vistani camp", "falls"]]
    },
    {
        "id": "cos_argynvostholt",
        "name": "Argynvostholt - Dragon Mansion",
        "target": "argynvostholt",
        "keywords": [["argynvost"], ["silver dragon"]]
    },
    {
        "id": "cos_berez_hut",
        "name": "Ruins of Berez & Baba Lysaga's Hut",
        "target": "berez_hut",
        "keywords": [["berez"], ["baba lysaga"], ["creeping hut"]]
    },
    {
        "id": "cos_van_richtens_tower",
        "name": "Van Richten's Tower",
        "target": "van_richtens_tower",
        "keywords": [["van richten", "tower"], ["khazan", "tower"], ["lake baratok", "tower"]]
    },
    {
        "id": "cos_wizard_of_wines",
        "name": "The Wizard of Wines Winery",
        "target": "wizard_of_wines",
        "keywords": [["wizard of wine"], ["winery"], ["martikov", "winery"]]
    },
    {
        "id": "cos_krezk_abbey",
        "name": "Abbey of Saint Markovia",
        "target": "krezk_abbey",
        "keywords": [["abbey", "markovia"], ["krezk", "abbey"], ["abbot", "abbey"]]
    },
    {
        "id": "cos_amber_temple",
        "name": "The Amber Temple - Vault of Vestiges",
        "target": "amber_temple",
        "keywords": [["amber temple"], ["amber vault"], ["exethanter"]]
    },
    {
        "id": "cos_yester_hill",
        "name": "Yester Hill - Gulthias Tree",
        "target": "yester_hill",
        "keywords": [["yester hill"], ["gulthias"], ["druid circle"]]
    },
    {
        "id": "cos_werewolf_den",
        "name": "Werewolf Den",
        "target": "werewolf_den",
        "keywords": [["werewolf den"], ["svalich pack"], ["werewolf cavern"]]
    }
]

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

def score_file_match(file_path: Path, keywords_group: List[List[str]]) -> int:
    name_lower = file_path.stem.lower()
    parent_lower = file_path.parent.name.lower()
    full_text = f"{parent_lower} {name_lower}"

    matched = False
    for kw_list in keywords_group:
        if all(kw in full_text for kw in kw_list):
            matched = True
            break
    
    if not matched:
        return 0

    score = 100
    # Bonus for gridless / no-grid versions
    if any(ng in name_lower for ng in ["nogrid", "no_grid", "no-grid", "gridless", "un-gridded", "ungridded"]):
        score += 50
    # Bonus for 4k / high res
    if "4k" in name_lower or "4000" in name_lower:
        score += 25
    # Slight preference for day or neutral lighting over night unless only night exists
    if "night" in name_lower:
        score -= 5
    return score

def import_cos_maps(source_path: Path):
    if not source_path.exists():
        print(f"Error: Path does not exist: {source_path}")
        return

    temp_dir = None
    search_dir = source_path

    # Extract if ZIP
    if source_path.is_file() and source_path.suffix.lower() == ".zip":
        print(f"Extracting archive: {source_path.name}...")
        temp_dir = tempfile.mkdtemp(prefix="cos_maps_")
        with zipfile.ZipFile(source_path, "r") as zf:
            zf.extractall(temp_dir)
        search_dir = Path(temp_dir)

    # Collect all image files
    all_images = [
        f for f in search_dir.rglob("*")
        if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
    ]

    print(f"Found {len(all_images)} potential image files in {search_dir}")
    print("=" * 80)
    print(f"{'SLOT':<35} | {'DEPLOYED FILE':<35} | {'STATUS'}")
    print("-" * 80)

    matched_count = 0
    for slot in SLOT_PATTERNS:
        slot_name = slot["name"]
        target_stem = slot["target"]
        candidates = []

        for img in all_images:
            s = score_file_match(img, slot["keywords"])
            if s > 0:
                candidates.append((s, img))

        if candidates:
            candidates.sort(key=lambda x: x[0], reverse=True)
            best_score, best_img = candidates[0]
            ext = best_img.suffix.lower()
            dst = STATIC_COS_DIR / f"{target_stem}{ext}"
            shutil.copy2(best_img, dst)
            matched_count += 1
            is_gridless = "✓ Gridless" if "nogrid" in best_img.stem.lower() or "gridless" in best_img.stem.lower() else "Gridded"
            print(f"{slot_name:<35} | {best_img.name[:35]:<35} | {is_gridless}")
        else:
            print(f"{slot_name:<35} | {'(Kept SVG Blueprint)':<35} | Waiting for file")

    print("=" * 80)
    print(f"Successfully matched and deployed {matched_count}/{len(SLOT_PATTERNS)} Curse of Strahd battlemaps!")
    print(f"Directory: {STATIC_COS_DIR}")

    # Clean up temp dir if extracted
    if temp_dir and os.path.exists(temp_dir):
        shutil.rmtree(temp_dir, ignore_errors=True)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python tools/import_cos_maps.py <path_to_folder_or_zip>")
        sys.exit(1)
    import_cos_maps(Path(sys.argv[1]))
