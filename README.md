<div align="center">

# ⚔️ Arcane Ledger
### Tactical D&D 5.5e (2024 Revision) DM Dashboard & Virtual Tabletop Suite

An ultra-fast, local-first Dungeon Master companion, tactical battlemap display, and smart-room immersion engine built from the ground up for the **2024 Dungeons & Dragons (5.5e)** rules revision.

[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Ruleset](https://img.shields.io/badge/D%26D-5.5e%20%2F%202024%20SRD-D4AF37?style=for-the-badge&logo=dungeonsanddragons&logoColor=white)](https://dndbeyond.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS%203-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Amaran Lighting](https://img.shields.io/badge/Amaran-Studio%20Lighting-FF5722?style=for-the-badge&logo=home-assistant&logoColor=white)](https://aputure.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

[Features](#-key-features) • [Three-Screen Architecture](#-three-screen-tabletop-architecture) • [Quick Start](#-quick-start) • [Keybindings](#-keyboard-shortcuts) • [Display Setup](#-in-table-display-setup-guide) • [Tools](#-developer--data-tools)

</div>

---

## 🌟 Overview

**Arcane Ledger** is a dedicated command console engineered for Dungeon Masters running modern **D&D 5.5e (2024)** games in person or in hybrid setups. Unlike heavy subscription-based VTTs that introduce cloud lag, complex account management, or bloated assets, Arcane Ledger runs **entirely locally on your machine with near-zero latency**.

It is architected specifically around a **multi-display tabletop environment**: control everything on your laptop while projecting an immersive player HUD on a wall monitor and streaming a physical-scale digital battlemap directly onto a TV recessed into your gaming table.

```
                    ┌───────────────────────────────────────────────────────────────┐
                    │                       ARCANE LEDGER                           │
                    │                 FastAPI Backend (Port 8000)                   │
                    └───────┬───────────────┬───────────────┬───────────────┬───────┘
                            │               │               │               │
                            ▼               ▼               ▼               ▼
                   ┌────────────────┐┌──────────────┐┌──────────────┐┌──────────────┐
                   │   DM Console   ││Player Screen ││Player Mobile ││ Tabletop Map │
                   │       /        ││   /player    ││  /companion  ││     /map     │
                   ├────────────────┤├──────────────┤├──────────────┤├──────────────┤
                   │ • God-Mode Fog ││ • Turn Order ││ • Live HP/Tmp││ • 1" Grid    │
                   │ • 330+ Bestiary││ • Party HUD  ││ • Spell Slots││ • Real Minis │
                   │ • 340+ Spells  ││ • Handouts   ││ • D20 Roller ││ • Fog Mask   │
                   │ • Audio Mixer  ││ • Calendar   ││ • Masteries  ││ • Laser Ping │
                   │ • Amaran Light ││ • Weather    ││ • Potions/Bag││ • 360° Rotate│
                   └────────────────┘└──────────────┘└──────────────┘└──────────────┘
```

---

## 🖥️ Four-Interface Tabletop Architecture

Arcane Ledger provides four specialized interfaces out of the box:

### 1. DM Master Command Center (`/`)
* **Full God-Mode Control**: Real-time initiative ordering, monster statblocks, live hit points, spell slots, resource counters, and fog-of-war brush.
* **Instant SRD Reference**: Search 330+ monsters, 340+ spells, and 2024 rules with zero page flipping.
* **Smart Atmosphere**: Integrated multi-track ambient audio mixer and direct WebSocket hardware control of Aputure/Amaran studio lighting.
* **PIN Protection & Localhost Auto-Bypass**: Full security lockout for external LAN devices while granting zero-friction instant access to the DM on the host computer.

### 2. Interactive Player Mobile Companion (`/companion`)
* **Handheld Phone & Tablet Web App**: Mobile-first touch interface for players at the table to control their character from their pocket.
* **Hero Claiming**: Players pick and claim their hero from the party list; selection is saved locally across reloads.
* **Two-Way Vitals Sync**: Tap to adjust HP, add Temp HP, mark Death Saves, or toggle Heroic Inspiration—syncing immediately with the DM's combat tracker.
* **Spell Slots & Class Powers Matrix**: Tap-to-expend bubbles for 1st–9th level slots and class resource pools (Rage, Superiority Dice, Channel Divinity).
* **Polyhedral Dice Roller**: Full dice set (d20, d4, d6, d8, d10, d12, d100) with Advantage / Disadvantage toggles, custom modifiers, and live roll broadcast to the DM console.
* **2024 Weapon Masteries & Potions**: Quick reference for weapon masteries (Push, Nick, Vex, Cleave) and 1-tap potion drinking with automatic HP recovery.

### 3. Spectator Player Display Screen (`/player`)
* **Projector / Wall TV HUD**: Displays the current initiative order, round tracker, active turn banner, party health state, and in-game calendar/weather.
* **Authentic In-World Handout Display**: Dedicated tactical prop renderer displaying parchment letters, torn journal fragments, wanted posters, encrypted elder ciphers, and ancient arcane scrolls with 3D wax seals and realistic paper textures.
* **Live DM Broadcasts**: Push character art, monster reveals, items, shop catalogs, handouts, and lore secrets to the player screen with a single click.
* **Anti-Spoiler Design**: Hides monster stats, AC, exact hit points, and secret DM notes automatically.

### 4. Dedicated Tabletop Battlemap (`/map`)
* **Horizontal In-Table Display**: Designed specifically for flat TVs embedded in gaming tables to host physical miniatures.
* **1-Inch Miniature Calibration**: Calibrate grid squares precisely to 1-inch physical miniatures regardless of TV screen size (40", 50", 55"+).
* **Dual-Canvas Fog of War**: DM reveals or conceals terrain using brushes or bounding boxes; players see an opaque parchment/shadow shroud.
* **Tactical Measurement & AoE Templates**: Tabletop rulers (5ft increments) and broadcastable spell AoE templates (Circles, Cones, Cubes, Lines) rendered directly onto the in-table TV display in real time.
* **Table Rotation**: Instant 0°, 90°, 180°, or 270° viewport rotation so players seated on any side of the table can view from their perspective.
* **Interactive Laser Pings**: Click on the DM screen to fire pulsing golden ping coordinates that sync across all displays in real time.

---

## ⚔️ Key Features

### 🏹 2024 Combat & Party Tracker
- **D&D 2024 Initiative Rules**: Automatic tie-breaking based on Dexterity scores in accordance with the 2024 Player's Handbook.
- **Deep Party Management**: Live HP tracking, temp HP, death saving throws (3 successes / 3 failures), hit dice pools, and exhaustion levels.
- **Spell Slot & Resource Matrices**: Complete Level 1–9 and Pact Magic slot tracking, plus custom class resource counters (Rage, Focus/Ki, Lay on Hands, Wild Shape, Bardic Inspiration).
- **Rest Automation**: One-click Short Rest (spend hit dice) and Long Rest (recover HP, reset slots, restore resources).
- **Concentration & Condition Badges**: Visual indicators for all 2024 conditions (Blinded, Charmed, Deafened, Frightened, Grappled, Incapacitated, Invisible, Paralyzed, Petrified, Poisoned, Prone, Restrained, Stunned, Unconscious, Exhaustion).

### 🐉 2024 Bestiary (330+ Monsters)
- Preloaded with **330+ monsters** from the 2024 Core Rules and System Reference Document.
- Instant search and filtering by Challenge Rating (CR 0 to 30), creature type, and size.
- Comprehensive statblocks with traits, actions, bonus actions, reactions, and legendary actions.
- **One-Click Deploy**: Spawn any monster directly into the active combat tracker and place its token on the battlemap.
- Pre-configured token art and portraits.

### 🔮 2024 Spells Compendium (340+ Spells)
- Complete searchable library of **340+ spells** updated to the 2024 revision.
- Filter instantly by spell level (Cantrip through 9th Level), magic school, class spell list, ritual status, concentration, and required components (V, S, M).
- Full text descriptions including upcasting bonuses, casting times, ranges, and area of effect dimensions.
- 1-click broadcast of full spell cards to player displays.

### ⚔️ 2024 Items Compendium & Weapon Masteries
- Complete directory of official 2024 weapons, armor, adventuring gear, tools, and magic items.
- **2024 Weapon Masteries**: Cleave, Graze, Nick, Push, Sap, Slow, Topple, and Vex with full rules text and mastery requirements.
- **Custom Item Forge**: Craft homebrew weapons, magical artifacts, potions, and equipment with custom rarity, attunement prerequisites, property tags, damage dice, and descriptions.
- **1-Click Broadcast**: Broadcast any item card directly to the player screen (`/player`).
- **1-Click Merchant Stock**: Push any compendium item directly into the active shop inventory for immediate purchase by the party.

### 📜 In-World Handout & Missive Generator
- **Tactical Physical-Look Props**: Generate authentic in-world documents including **Sealed Missives**, **Torn Journal Pages**, **Wanted Bounty Posters**, **Coded Ciphers & Runes**, and **Magic Sigil Scrolls**.
- **Parchment Themes**: 5 tactile backgrounds (`Aged Parchment`, `Royal Vellum`, `Burnt Ash`, `Bloodstained`, `Arcane Void`) with procedural wear and edge texturing.
- **Typography Styles**: 5 period fonts (`Handwritten Cursive`, `Gothic Blackletter`, `Classic Serif`, `Dwarven Runes / Chisel`, `Ledger Typewriter`).
- **3D Wax Seal Forge**: 8 emblem crests (`Crown`, `Skull`, `Arcane Eye`, `Scales of Justice`, `Daggers`, `Dragon`, `Tree`, `Scroll`) across 5 wax colors (`Red`, `Gold`, `Black`, `Green`, `Purple`) with realistic lighting gradients.
- **Cryptographic Cipher Engine**: Encrypt secret missives with Elder Futhark runes substitution, Caesar shifts, redacted blocks, or anagram scrambles. Set DC Investigation thresholds and DM hints with 1-click table reveal/decipher.
- **Live WYSIWYG Forge**: Live real-time preview in the DM console that dynamically shifts layout, banners, and typography the moment a document type is selected.
- **Entity & Campaign Linking**: Integrated dropdown selectors for **Author / Signer**, **Recipient**, **Tied Location**, and **Tied NPC** dynamically populated from active campaign profiles and rosters, with seamless custom-text fallbacks.
- **Dedicated Player Display**: Clean parchment rendering on the player screen (`/player`) isolated from standard interface styling.

### 🕵️ Campaign Secrets, Clues & Rumors
- **Clue & Discovery Board**: Track campaign secrets, mysteries, and investigation leads linked directly to NPCs, factions, and world locations.
- **State Progression**: Move clues smoothly between *Undiscovered*, *Discovered*, and *Publicly Revealed*.
- **Tavern Rumor Panning**: 1-click convert any discovered clue or in-world handout into an active Tavern Rumor.
- **Player Screen Broadcast**: Push important discoveries directly to player screens as tactical clues.

### 🗺️ Tabletop Battlemap & Miniatures Engine
- **Hardware-Calibrated Grid**: Adjustable square and hex grids with customizable grid size, opacity, and color.
- **Dual-Canvas Shroud**: Brush reveal, brush hide, box reveal, and full map reset.
- **Tactical Measurement & Spell AoE**: Dynamic measuring tape (5ft increments) and broadcastable spell templates (Circles, Cones, Cubes, Lines) synced live between DM laptop and in-table battlemap TV.
- **Virtual & Physical Token Support**:
  - Drag-and-drop movement with grid snapping.
  - Size scaling from Tiny up to Gargantuan.
  - Color rings, elevation indicators, status badges, and concentration markers.
  - Bloodied aura indicators and player visibility toggles.
- **Procedural Battlemap Forge & Generator**:
  - Synthesize infinite vector SVG battlemaps across 6 distinct D&D environments:
    - 🏰 **Dungeon Crypt**: Stone masonry, pillared chambers, sarcophagi, iron braziers, and tombs.
    - 🕳️ **Underdark Caverns**: Organic subterranean limestone, chasms, stalagmites, and bioluminescent fungal groves.
    - 🌲 **Forest & River Crossing**: Winding dirt trails, river bends, wooden bridges, campfires, and tree canopies.
    - 🍺 **Stronghold Tavern**: Hardwood floorboards, roaring hearth fireplaces, tavern bar counters, ale casks, and tables.
    - 🔮 **Arcane Sanctum**: Obsidian polished flagstones, eldritch summoning circles, astral rifts, and floating mana pylons.
    - 🏛️ **Overgrown Ancient Ruins**: Cracked flagstones, vine-covered broken colonnades, rubble heaps, and sacrificial altars.
  - **Customizable Tactical Parameters**: Choose room layouts (Multi-Room Chambers, Open Arena, Winding Trails, Crossroads), atmospheric lighting (Torchlit, Pitch Dark, Bioluminescent, Ethereal Astral, Ambient Daylight), water/chasm hazards, and pillar cover obstacles.
  - **Deterministic Seeds & Randomizer**: Deterministic seed generator for reproducible maps and thematic name generator.
  - **Live WYSIWYG Vector Preview**: Real-time interactive preview in the DM forge modal before committing to table deployment.
  - **1-Click Table Deployment**: Instantly deploy generated maps to the DM display and horizontal Table TV (`/map`) in real time.
- **Shared Multi-Campaign Map Catalog Architecture**:
  - **Global Map Catalog (`data/battlemaps_catalog.json`)**: All preset, generated, and uploaded battlemaps are shared across all campaign profiles, ensuring the DM never has to re-upload or re-generate maps when switching campaigns.
  - **Per-Profile Tactical Encounters (`data/campaigns/<id>/battlemap.json`)**: Active table deployments, miniature/token positions, condition auras, Fog of War reveals, spell AoE templates, and viewport zoom/pan are strictly isolated per campaign profile so different groups never cross-contaminate encounters.

### 🎲 Encounter Builder & XP Budget Calculator
- Automatically calculates party thresholds (Easy, Medium, Hard, Deadly) using the official 2024 encounter budget formulas.
- Live tally of total XP, adjusted XP, and per-player budget breakdown.
- Save custom encounter rosters and launch them straight into active combat with rolled initiatives.

### 💡 Aputure & Amaran Studio Lighting Integration
- Native local WebSocket bridge (`ws://127.0.0.1:12345`) to **Amaran Desktop** / Sidus Link.
- **Dual-Channel Tabletop Lighting**:
  - **Overhead Table Light (`amaran 60d S`)**: Dedicated reading light for character sheets and physical dice.
  - **Atmosphere Light (`amaran Ace 25c`)**: Dynamic RGB and CCT lighting for scene mood, color washes, and special effects.
- **Reactive Table Events**:
  - 🏆 **Natural 20**: Brilliant golden fanfare flare.
  - 💀 **Natural 1**: Deep crimson dread pulse.
  - 🩸 **Hero Down**: Flashing red emergency alarm when a character drops to 0 HP.
- **Scene Presets**: Tavern Fireplace (2500K flicker), Dungeon Crypt (eerie purple/blue), Boss Fight (pulsing crimson), Thunderstorm (strobe lightning).

### 🔊 Multi-Track Ambient Audio Engine
- Layered multi-channel audio mixer capable of playing simultaneous looping ambiance and one-shot sound effects.
- Built-in track library: Fireplace, Heavy Rain, Thunderstorm, Cavern Drone, Forest Stream, Tavern Murmur, War Drums, Mystic Pad, Heartbeat Suspense.
- Instant atmosphere presets with automatic crossfading.
- Custom sound uploader with independent channel faders and master mute.

### 📜 World Atlas, Faction Clocks & Quests
- **Location Codex**: Organize campaign settlements, ruins, dungeons, and points of interest with secret DM notes and NPC linkages.
- **Faction Progress Clocks**: Blades-in-the-Dark-style segmented countdown clocks (4, 6, 8 segments) to track faction schemes, war progress, and ticking doom clocks.
- **Faction Diplomacy & Profile-Scoped Linker**: Link factions into alliances, rivalries, or open war with relationship tags and notes; dropdown options are strictly scoped to factions defined in the active campaign profile.
- **Quest & Rumor Board**: Multi-step quest logs with toggleable objectives, quest giver tracking, and rumor cards.

### 🧑‍🎤 On-the-Fly 5.5e NPC Generator & Campaign Roster
- Generate rich, memorable NPCs in seconds with locked-trait rerolling.
- Generates 2024 species, distinct vocal coaching guides, vivid appearances, personalities, flaws, secrets, tailored loot, and matching CR statblock references.
- **Profile-Scoped Quick Filters**: Top bar Location and Faction dropdowns reflect only choices found in the active campaign profile.
- **Advanced Campaign Roster Organization**:
  - **Dynamic Grouping Modes**: Group saved NPCs `By Location`, `By Faction`, `By Category/Role`, or `Flat List` with collapsible accordions and live count badges.
  - **Density Controls**: Toggle between `Detailed Cards` (stats, traits, notes) and `Compact List` rows for scanning 50+ NPCs rapidly.
  - **Full-Screen Roster Directory**: Dual-mode modal featuring a responsive Card Grid (`▦`) and structured Data Table (`☰`) with global search, sorting, and inline action buttons (Edit in Workspace, Push to Combat, Copy MD, Delete).
  - **Full Markdown Export**: 1-click export of the entire campaign roster as a clean, structured `.md` document or individual character dossiers.
- Save directly to the campaign roster or export to Markdown.
- **Bonus Standalone Tool**: Includes `dnd_npc_generator.html` — a zero-dependency, single-file HTML app that can be run completely offline in any web browser without running Python.

### 💰 2024 Loot & Merchant Generator
- Individual monster loot tables and Hoard treasure generators organized by CR Tier (0–4, 5–10, 11–16, 17+).
- Currency calculators (cp, sp, ep, gp, pp), gemstones, art objects, and 2024 magic item tables.
- **Merchant Shop Generator**: Generate settlement shops by tier with variable markup and stock.
- **Broadcast Shop Catalog**: 1-click broadcast of full merchant catalogs (prices, stock, descriptions) to player screens in an interactive catalog grid.

### 💾 Safe Storage & Snapshot Backups
- Atomic JSON persistence: all campaign data is stored locally in human-readable JSON files.
- One-click timestamped snapshot backups with easy restore.
- One-click Markdown export of entire campaign state (party stats, active quests, faction clocks, and notes).

### 📜 Multi-Campaign Profile Manager
- **Complete World & Party Isolation**: Run multiple distinct adventuring groups or campaigns on the same machine without mixing data.
- **Isolated Per-Campaign Data**: Party vitals, combat encounters, session notes, faction clocks, locations, secrets, handouts, and battlemaps are cleanly partitioned into `data/campaigns/<campaign_id>/`.
- **Shared Global Compendiums**: All campaigns seamlessly share the core 330+ Bestiary, 340+ Spells, Items compendium, 2024 Rules Engine, Audio Soundscape library, and Amaran Studio Lighting hardware configurations.
- **Instant Topbar Switcher**: Switch active campaigns directly from the persistent topbar dropdown in a single click without restarting the server.
- **Full Profile Lifecycle**: Create fresh campaigns, clone existing campaign data (duplicate active party and lore), edit titles and descriptions, or archive older campaigns.

### 🧩 Module Manager & Playstyle Presets
- **Declutter Your Screen**: Toggle any of the 12 primary dashboard modules on or off per campaign profile to match your personal running style.
- **One-Click Playstyle Presets**:
  - ⚔️ **Full Tabletop Immersion**: All 12 modules enabled (Tactical Battlemap, Lighting, Audio, Compendiums, Combat Tracker, and Lore).
  - 🎭 **Theater of the Mind**: Grid battlemap disabled. Clean, distraction-free focus on descriptive roleplay, audio atmosphere, combat tracking, and lore.
  - 📜 **Worldbuilder & Prep**: Combat tracker and battlemap hidden. Dedicated workspace for lore prep, NPC creation, handouts forge, and rules compendiums.
  - ⚡ **Minimalist DM**: Compact setup keeping only the Combat Tracker, Party Vitals HUD, Scratchpad Notes, and Rules Engine.
  - 🛠️ **Custom Configuration**: Fine-tune individual switches for any combination of tools.

### 🔒 DM Passcode Protection & Tabletop Wi-Fi Security
- **Anti-Snooping Tabletop Security**: Keep players connecting over the local Wi-Fi network (phones, tablets, laptops) strictly on player displays (`/player` and `/map`) without letting them snoop on secret DM notes, monster HP, hidden battlemaps, or encounter budgets.
- **Zero-Friction Localhost Auto-Bypass**: The DM running Arcane Ledger on the host machine (`127.0.0.1`) experiences zero friction or passcode prompts.
- **Dedicated Fantasy Lock Screen (`templates/dm_lock.html`)**: Beautiful dark-fantasy PIN entry screen with animated digit boxes, touch/virtual keypad, physical keyboard listener, error shaking animation, and instant escape links to `/player` and `/map`.
- **Connect Tabletop Players Modal & QR Code**: Built-in LAN IP detection (`http://192.168.x.x:8000/player`) with a 1-click copyable link and dynamically generated SVG QR code for instant phone camera scanning at the physical table.
- **Configurable in System Settings**: Enable or disable PIN protection, customize your 4-digit PIN, or toggle Localhost Auto-Bypass anytime from the Settings tab.

---

## 🚀 Quick Start

### Prerequisites
* **Python 3.10+** installed on your system ([python.org](https://www.python.org/downloads/))
* Any modern web browser (Chrome, Firefox, Safari, Edge)

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/arcane_ledger.git
cd arcane_ledger
```

### 2. Setup Virtual Environment & Install Dependencies

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**On Windows:**
```cmd
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Launch the Server

**Using the startup script:**
* **macOS / Linux**: Double-click `start.command` in Finder or run `./run.sh` in Terminal
* **Windows**: Double-click `run.bat`

**Manual command line launch:**
```bash
source venv/bin/activate   # On Windows: venv\Scripts\activate
python app.py
```

The server will start at:
```
=======================================================
  ARCANE LEDGER - D&D 5.5e (2024) DM DASHBOARD
  Open your browser to: http://127.0.0.1:8000
=======================================================
```

### 4. Access the Interfaces
* **DM Dashboard**: [http://127.0.0.1:8000](http://127.0.0.1:8000) *(bypasses PIN automatically on the host computer)*
* **Player Mobile Companion**: [http://127.0.0.1:8000/companion](http://127.0.0.1:8000/companion) *(mobile sheet, HP, spell slots, d20 roller)*
* **Player Spectator Screen**: [http://127.0.0.1:8000/player](http://127.0.0.1:8000/player) *(wall TV / projector HUD)*
* **Tabletop Battlemap**: [http://127.0.0.1:8000/map](http://127.0.0.1:8000/map) *(in-table horizontal TV)*

> **Tip (Tabletop Wi-Fi & QR Code)**: Click the **Connect Players** button in the DM topbar to display a scannable QR code and direct local network link for either the **Player Mobile Companion** (`/companion`) or the **Spectator Screen** (`/player`). Tabletop players connecting from phones, tablets, or laptops over Wi-Fi are automatically routed to safe player displays and locked out of the DM console unless authorized with your DM passcode.

---

## ⌨️ Keyboard Shortcuts

Arcane Ledger includes comprehensive hotkeys designed for fast, seamless tabletop control:

### Navigation Shortcuts
| Keybind | Destination | Description |
| :--- | :--- | :--- |
| <kbd>Alt</kbd> + <kbd>1</kbd> | **Combat & Party** | Active initiative, turn tracker, character status |
| <kbd>Alt</kbd> + <kbd>M</kbd> | **Tabletop Battlemap** | Dual-canvas map, token manager, fog controls |
| <kbd>Alt</kbd> + <kbd>6</kbd> | **5.5e Bestiary** | Search 330+ monster statblocks |
| <kbd>Alt</kbd> + <kbd>9</kbd> | **Encounter Builder** | XP budget calculator & encounter builder |
| <kbd>Alt</kbd> + <kbd>0</kbd> | **Spells Compendium** | Filterable 2024 spellbook |
| <kbd>Alt</kbd> + <kbd>I</kbd> | **Items Compendium** | 2024 equipment, masteries & custom forge |
| <kbd>Alt</kbd> + <kbd>3</kbd> | **Rules Engine** | 2024 rules cheat sheet & conditions |
| <kbd>Alt</kbd> + <kbd>7</kbd> | **World & Factions** | Locations, progress clocks, quest log |
| <kbd>Alt</kbd> + <kbd>2</kbd> | **NPC Generator** | On-the-fly NPC roller & roster |
| <kbd>Alt</kbd> + <kbd>4</kbd> | **Loot & Merchants** | CR tier hoard roller & shop inventories |
| <kbd>Alt</kbd> + <kbd>5</kbd> | **Session Scratchpad** | Markdown notes & campaign log |
| <kbd>Alt</kbd> + <kbd>8</kbd> | **Atmosphere & Sound** | Multi-track audio & Amaran lighting |
| <kbd>Alt</kbd> + <kbd>,</kbd> | **Settings** | Configuration, backups, custom keybindings |

### Quick Action Shortcuts
| Key | Context | Action |
| :--- | :--- | :--- |
| <kbd>N</kbd> | Combat Tracker | Advance to the **Next Turn** in initiative |
| <kbd>P</kbd> | Combat Tracker | Step back to the **Previous Turn** |
| <kbd>R</kbd> | Combat Tracker | Quick Roll **d20** |
| <kbd>Alt</kbd> + <kbd>D</kbd> | Global | Toggle **Dice Drawer** popover |
| <kbd>G</kbd> | NPC Generator | Roll new random NPC traits |
| <kbd>S</kbd> | NPC Generator | Save current NPC to campaign roster |
| <kbd>C</kbd> | NPC Generator | Copy NPC markdown statblock to clipboard |
| <kbd>U</kbd> | NPC Generator | Unlock all NPC trait locks |
| <kbd>Esc</kbd> | Global | Close active popovers, modals, or dice drawers |

*(All keybindings can be fully customized or re-recorded in the Settings tab).*

---

## 📺 In-Table Display Setup Guide

If you are using a horizontal TV set into a gaming table for physical miniatures:

```
┌────────────────────────────────────────────────────────┐
│                      GAMING TABLE                      │
│                                                        │
│       [Player 1]                    [Player 2]         │
│          │                              │              │
│          ▼                              ▼              │
│    ┌──────────────────────────────────────────┐        │
│    │  HORIZONTAL 4K TV (Display 3: /map)      │        │
│    │  • 1-inch physical grid calibrated       │        │
│    │  • Physical minis placed on glass screen │        │
│    │  • Fog of war reveals terrain            │        │
│    │  • Laser pings highlight targets         │        │
│    └──────────────────────────────────────────┘        │
│          ▲                              ▲              │
│          │                              │              │
│       [Player 3]                    [Player 4]         │
│                                                        │
│  [WALL DISPLAY: /player]       [DM LAPTOP: /]          │
│   • Initiative HUD              • Full God-Mode Admin  │
│   • Character Health            • Audio & Lighting FX  │
│   • Handouts & Weather          • Monster Statblocks   │
└────────────────────────────────────────────────────────┘
```

1. Connect the horizontal TV as an extended desktop monitor.
2. Open a browser window on the TV screen and navigate to `http://127.0.0.1:8000/map`. Press <kbd>F11</kbd> for fullscreen.
3. On the DM Dashboard (`/`), open the **Battlemap** tab:
   - Use the **1" Physical Calibration** slider to adjust the on-screen grid squares until a physical 1-inch miniature base aligns with the grid.
   - Use the **Rotate** button (0°, 90°, 180°, 270°) to orient the map for your players.
   - Click **Sync Viewport** to instantly snap the tabletop TV to the DM's current coordinates.
   - Paint over unexplored areas with the Fog brush or reveal rooms as characters open doors.

---

## 📂 Project Structure

```
arcane_ledger/
├── app.py                      # FastAPI core backend & REST API endpoints
├── requirements.txt            # Python dependencies
├── run.bat                     # Quick-start batch file for Windows
├── run.sh                      # Quick-start shell script for macOS / Linux
├── start.command               # Double-clickable launcher for macOS Finder
├── dnd_npc_generator.html      # Standalone single-file offline NPC generator
├── map_generator.py            # Procedural vector SVG battlemap generation engine (6 environments)
├── README.md                   # Project documentation
│
├── data/                       # Local JSON database (human-readable, atomic saves)
│   ├── security.json           # DM security configuration (PIN, localhost bypass, session expiry)
│   ├── campaigns.json          # Multi-campaign profiles manifest & active profile selector
│   ├── campaigns/              # Per-campaign isolated data directories (party, combat, etc.)
│   ├── battlemaps_catalog.json # Shared multi-campaign global battlemaps catalog
│   ├── monsters.json           # 330+ 2024 D&D monsters & statblocks
│   ├── spells.json             # 340+ 2024 D&D spells & details
│   ├── items.json              # 2024 SRD equipment, weapon masteries & custom items
│   ├── handouts.json           # In-world parchment missives, journals, bounties & ciphers
│   ├── secrets.json            # Campaign clues, investigative secrets & rumor links
│   ├── rules_2024.json         # 2024 conditions, actions, and cheat sheets
│   ├── combat.json             # Active initiative, round, and combatant state
│   ├── party.json              # Player characters, spell slots, and resources
│   ├── roster.json             # Saved campaign NPCs
│   ├── battlemap.json          # Active map, tokens, fog mask, and viewport
│   ├── encounters.json         # Saved encounter templates and budgets
│   ├── factions.json           # Factions and progress clocks
│   ├── locations.json          # World settlements and dungeon points of interest
│   ├── quests.json             # Active quests, objectives, and rumors
│   ├── audio_library.json      # Audio track metadata
│   ├── audio_presets.json      # Atmospheric soundboard presets
│   ├── time_weather.json       # In-game calendar and tactical weather
│   └── backups/                # Timestamped snapshot archives
│
├── templates/                  # Jinja2 HTML5 frontends
│   ├── index.html              # Main DM Command Center dashboard
│   ├── companion.html          # Interactive Player Mobile Companion (HP, slots, dice, masteries)
│   ├── dm_lock.html            # Dark-fantasy PIN keypad & lock screen for unauthorized LAN devices
│   ├── player.html             # Dedicated spectator wall TV / projector HUD
│   └── map.html                # Dedicated in-table horizontal battlemap screen
│
├── static/                     # Web assets
│   ├── js/
│   │   ├── dashboard.js        # DM dashboard controller & state manager
│   │   ├── battlemap_controller.js # Dual-canvas Fog of War & VTT engine
│   │   ├── lighting_engine.js  # Amaran studio & reactive lighting controller
│   │   ├── audio_engine.js     # Multi-track audio layering soundboard
│   │   ├── npc_data.js         # 5.5e NPC generator tables & names
│   │   └── loot_data.js        # 2024 loot & merchant inventory tables
│   ├── audio/                  # Offline ambient audio tracks (.ogg / .wav)
│   └── images/
│       ├── battlemaps/         # High-resolution SVG and raster battlemaps
│       └── monsters/           # Pre-cached monster token artwork
│
└── tools/                      # Developer and data compilation utilities
    ├── parse_2024_monsters.py  # Monster parser and token matcher
    ├── parse_2024_spells.py    # Spellbook parser from raw rules data
    ├── download_monster_tokens.py # Automated token scraper & cacher
    └── generate_sample_maps.py # Procedural high-res SVG battlemap generator
```

---

## 🛠️ Developer & Data Tools

Arcane Ledger includes standalone Python scripts in the `tools/` directory for extending and compiling game data:

* **`tools/generate_sample_maps.py`**: Generates high-detail procedural vector SVG battlemaps with drop shadows, stone floor texturing, torch glows, and grid lines.
  ```bash
  python tools/generate_sample_maps.py
  ```
* **`tools/parse_2024_spells.py`**: Compiles raw Markdown spell descriptions into structured `data/spells.json` with regex parsing for school, components, classes, and ritual tags.
* **`tools/parse_2024_monsters.py`**: Transforms monster text descriptions into `data/monsters.json` statblocks.
* **`tools/download_monster_tokens.py`**: Concurrent downloader for caching monster token images locally in `static/images/monsters/`.

---

## 💡 Smart Lighting Configuration

To connect physical **Aputure / Amaran** lights to Arcane Ledger:

1. Launch **Amaran Desktop** (or Sidus Link bridge) on your host computer.
2. Ensure the local WebSocket server is enabled on port `12345`.
3. In Arcane Ledger's **Atmosphere & Lighting** tab (<kbd>Alt</kbd> + <kbd>8</kbd>):
   - Assign your overhead reading light (e.g., `amaran 60d S`) to **Channel 1**.
   - Assign your RGB atmosphere light (e.g., `amaran Ace 25c`) to **Channel 2**.
   - Enable **Reactive Combat Lighting** for automatic Natural 20, Natural 1, and Hero Down light pulses.

---

## 🛡️ License

This project is licensed under the **MIT License** — feel free to modify, extend, and adapt it for your home games and campaigns.

*Dungeons & Dragons and its respective trademarks belong to Wizards of the Coast LLC. This project is built for use with the Open Game License (OGL) and the 5.5e (2024) System Reference Document (SRD).*