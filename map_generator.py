import random
import math
import time
from typing import Dict, Any, List, Optional

# Thematic title generators
TITLES = {
    "dungeon": [
        "Forgotten Crypt of the Iron Guard",
        "Catacombs of the Pale Lord",
        "Dungeon of the Crimson Vow",
        "The Sunken Sepulcher",
        "Vault of the Obsidian King",
        "Chamber of Whispering Skulls"
    ],
    "cavern": [
        "Grotto of the Bioluminescent Fungi",
        "The Abyssal Chasm",
        "Underdark Smuggler's Crevasse",
        "Cavern of Echoing Drips",
        "Lair of the Web-Spinner",
        "The Sunless Spring Grotto"
    ],
    "forest": [
        "Whispering Woods River Crossing",
        "The Emerald Clearing",
        "Shadowfen Bridge Ambush",
        "Druid's Ancient Oak Glade",
        "The Old King's Road Waystation",
        "Mistveil Hollow"
    ],
    "tavern": [
        "The Gilded Tankard Taproom",
        "Smuggler's Cellar & Speakeasy",
        "The Boar's Tusk Roadhouse",
        "The Salty Mermaid Tavern",
        "Dragon's Breath Alehouse",
        "The Laughing Goblin Inn"
    ],
    "arcane": [
        "Sanctum of the Astral Rift",
        "The Chronomancer's Observatory",
        "Void-Touched Summoning Chamber",
        "The Spire of Eldritch Runes",
        "Aetherium Core Pylon Chamber",
        "The Sealed Nether-Portal"
    ],
    "ruins": [
        "Overgrown Temple of the Sun God",
        "Fallen Citadel Courtyard",
        "The Shattered Colonnade",
        "Moss-Grown Altar of the Ancients",
        "Ruins of the Wyrm-Keeper",
        "The Sunken Shrine of Oakhaven"
    ]
}

def get_random_title(theme: str) -> str:
    pool = TITLES.get(theme, TITLES["dungeon"])
    return random.choice(pool)

class ProceduralMapGenerator:
    """
    Synthesizes crisp, infinitely-scalable tactical vector battlemaps for D&D 5.5e.
    Fully procedural and deterministic: every combination of theme, layout, lighting,
    water, pillars, and seed dynamically alters the visual output and tactical terrain.
    """
    def __init__(
        self,
        theme: str = "dungeon",
        width_squares: int = 40,
        height_squares: int = 30,
        grid_size: int = 50,
        layout: str = "multi_room",
        lighting: str = "torchlit",
        has_water: bool = False,
        has_pillars: bool = True,
        seed: Optional[int] = None
    ):
        self.theme = theme if theme in TITLES else "dungeon"
        self.width_squares = max(16, min(60, width_squares))
        self.height_squares = max(12, min(50, height_squares))
        self.grid_size = grid_size
        self.layout = layout if layout in ("multi_room", "arena", "winding", "crossroads") else "multi_room"
        self.lighting = lighting if lighting in ("torchlit", "dark", "bioluminescent", "ethereal", "bright") else "torchlit"
        self.has_water = bool(has_water)
        self.has_pillars = bool(has_pillars)
        self.seed = int(seed) if seed is not None else random.randint(100000, 999999)
        self.rng = random.Random(self.seed)

        self.width = self.width_squares * self.grid_size
        self.height = self.height_squares * self.grid_size

    def generate_svg(self) -> str:
        if self.theme == "dungeon":
            return self._generate_dungeon()
        elif self.theme == "cavern":
            return self._generate_cavern()
        elif self.theme == "forest":
            return self._generate_forest()
        elif self.theme == "tavern":
            return self._generate_tavern()
        elif self.theme == "arcane":
            return self._generate_arcane()
        elif self.theme == "ruins":
            return self._generate_ruins()
        return self._generate_dungeon()

    # -------------------------------------------------------------------------
    # COMMON LIGHTING DEFINITIONS & ATMOSPHERIC OVERLAYS
    # -------------------------------------------------------------------------
    def _get_lighting_defs(self) -> str:
        if self.lighting == "torchlit":
            glow_c1, glow_c2 = "#f59e0b", "#b45309"
        elif self.lighting == "dark":
            glow_c1, glow_c2 = "#38bdf8", "#0369a1"
        elif self.lighting == "bioluminescent":
            glow_c1, glow_c2 = "#06b6d4", "#a855f7"
        elif self.lighting == "ethereal":
            glow_c1, glow_c2 = "#c084fc", "#6366f1"
        else: # bright
            glow_c1, glow_c2 = "#fef08a", "#eab308"

        return f'''
    <radialGradient id="lightGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="{glow_c1}" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="{glow_c2}" stop-opacity="0.45"/>
      <stop offset="75%" stop-color="#000000" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="propShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="8" dy="12" stdDeviation="6" flood-color="#000000" flood-opacity="0.85"/>
    </filter>
    <filter id="waterGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#38bdf8" flood-opacity="0.4"/>
    </filter>
'''

    def _get_lighting_overlay(self) -> str:
        w, h = self.width, self.height
        if self.lighting == "dark":
            return f'''
  <!-- Atmospheric Pitch Darkness & Vignette Overlay -->
  <radialGradient id="darkVignette" cx="50%" cy="50%" r="60%">
    <stop offset="10%" stop-color="#000000" stop-opacity="0.4"/>
    <stop offset="55%" stop-color="#000000" stop-opacity="0.75"/>
    <stop offset="95%" stop-color="#000000" stop-opacity="0.92"/>
  </radialGradient>
  <rect width="{w}" height="{h}" fill="url(#darkVignette)" pointer-events="none"/>
'''
        elif self.lighting == "bioluminescent":
            return f'''
  <!-- Eerie Bioluminescent Spore Mist Overlay -->
  <radialGradient id="sporeVignette" cx="50%" cy="50%" r="65%">
    <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.08"/>
    <stop offset="50%" stop-color="#8b5cf6" stop-opacity="0.18"/>
    <stop offset="100%" stop-color="#020617" stop-opacity="0.65"/>
  </radialGradient>
  <rect width="{w}" height="{h}" fill="url(#sporeVignette)" pointer-events="none"/>
'''
        elif self.lighting == "ethereal":
            return f'''
  <!-- Astral Ether Shimmer Overlay -->
  <radialGradient id="etherealVignette" cx="50%" cy="50%" r="65%">
    <stop offset="0%" stop-color="#c084fc" stop-opacity="0.12"/>
    <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.16"/>
    <stop offset="100%" stop-color="#050714" stop-opacity="0.65"/>
  </radialGradient>
  <rect width="{w}" height="{h}" fill="url(#etherealVignette)" pointer-events="none"/>
'''
        elif self.lighting == "torchlit":
            return f'''
  <!-- Torchlit Perimeter Vignette -->
  <radialGradient id="torchVignette" cx="50%" cy="50%" r="70%">
    <stop offset="30%" stop-color="#000000" stop-opacity="0"/>
    <stop offset="80%" stop-color="#000000" stop-opacity="0.45"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.8"/>
  </radialGradient>
  <rect width="{w}" height="{h}" fill="url(#torchVignette)" pointer-events="none"/>
'''
        else: # bright
            return f'''
  <!-- Daylight Ambient Sunbeams -->
  <linearGradient id="sunbeam" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" stop-color="#fef08a" stop-opacity="0.08"/>
    <stop offset="50%" stop-color="#ffffff" stop-opacity="0.03"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.12"/>
  </linearGradient>
  <rect width="{w}" height="{h}" fill="url(#sunbeam)" pointer-events="none"/>
'''

    # -------------------------------------------------------------------------
    # THEME 1: DUNGEON / CRYPT
    # -------------------------------------------------------------------------
    def _generate_dungeon(self) -> str:
        w, h = self.width, self.height
        gs = self.grid_size
        pad_x, pad_y = 2 * gs, 2 * gs
        inner_w, inner_h = w - (2 * pad_x), h - (2 * pad_y)

        svg = []
        svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n<defs>')
        svg.append(self._get_lighting_defs())
        svg.append(f'''
    <pattern id="flagstone" width="{gs*2}" height="{gs*2}" patternUnits="userSpaceOnUse">
      <rect width="{gs*2}" height="{gs*2}" fill="#1c1f26"/>
      <rect x="2" y="2" width="{gs-4}" height="{gs-4}" fill="#252a34" rx="2" stroke="#13151a" stroke-width="2"/>
      <rect x="{gs+2}" y="2" width="{gs-4}" height="{gs-4}" fill="#21252e" rx="2" stroke="#13151a" stroke-width="2"/>
      <rect x="2" y="{gs+2}" width="{gs-4}" height="{gs-4}" fill="#232731" rx="2" stroke="#13151a" stroke-width="2"/>
      <rect x="{gs+2}" y="{gs+2}" width="{gs-4}" height="{gs-4}" fill="#272d38" rx="2" stroke="#13151a" stroke-width="2"/>
    </pattern>
    <pattern id="dungeonWall" width="{gs}" height="{gs//2}" patternUnits="userSpaceOnUse">
      <rect width="{gs}" height="{gs//2}" fill="#0d0e12"/>
      <rect x="1" y="1" width="{gs-2}" height="{(gs//2)-2}" fill="#181b22" stroke="#090a0d" stroke-width="1.5"/>
    </pattern>
  </defs>
  <!-- Void Void -->
  <rect width="{w}" height="{h}" fill="#090a0d"/>
  <!-- Floor -->
  <rect x="{pad_x}" y="{pad_y}" width="{inner_w}" height="{inner_h}" fill="url(#flagstone)"/>
  <!-- Outer Walls -->
  <rect x="{pad_x - gs//2}" y="{pad_y - gs//2}" width="{inner_w + gs}" height="{inner_h + gs}" fill="none" stroke="url(#dungeonWall)" stroke-width="{gs}"/>
''')

        # 1. LAYOUT ARCHITECTURE
        if self.layout == "multi_room":
            # Seed-driven room partitions
            div_x = pad_x + int(inner_w * (0.45 + (self.rng.random() * 0.1 - 0.05)))
            div_y = pad_y + int(inner_h * (0.50 + (self.rng.random() * 0.1 - 0.05)))
            door_w = 2 * gs

            svg.append(f'''
  <!-- Room Dividing Walls & Doorways -->
  <rect x="{pad_x}" y="{div_y - gs//2}" width="{div_x - pad_x - door_w}" height="{gs}" fill="url(#dungeonWall)"/>
  <rect x="{div_x + door_w}" y="{div_y - gs//2}" width="{pad_x + inner_w - div_x - door_w}" height="{gs}" fill="url(#dungeonWall)"/>
  <rect x="{div_x - gs//2}" y="{pad_y}" width="{gs}" height="{div_y - pad_y - door_w}" fill="url(#dungeonWall)"/>
  <rect x="{div_x - gs//2}" y="{div_y + door_w}" width="{gs}" height="{pad_y + inner_h - div_y - door_w}" fill="url(#dungeonWall)"/>
''')
        elif self.layout == "arena":
            # Massive circular arena ring in center with elevated dais
            mid_x, mid_y = w // 2, h // 2
            arena_r = min(inner_w, inner_h) // 2 - gs
            svg.append(f'''
  <!-- Grand Arena Fighting Ring -->
  <circle cx="{mid_x}" cy="{mid_y}" r="{arena_r}" fill="#181b22" stroke="#334155" stroke-width="6"/>
  <circle cx="{mid_x}" cy="{mid_y}" r="{arena_r - 2*gs}" fill="#222731" stroke="#475569" stroke-width="3" stroke-dasharray="16,8"/>
  <circle cx="{mid_x}" cy="{mid_y}" r="{gs*3}" fill="#2e1065" stroke="#9333ea" stroke-width="4"/>
''')
        elif self.layout == "winding":
            # Serpentine corridor cutting through rock walls
            mid_y = h // 2
            curve_y1 = mid_y - (4 * gs)
            curve_y2 = mid_y + (4 * gs)
            svg.append(f'''
  <!-- Winding Catacomb S-Chamber Walls -->
  <path d="M {pad_x},{pad_y} L {w//2 - 4*gs},{pad_y} Q {w//2},{curve_y1} {w//2 + 4*gs},{curve_y1} L {w - pad_x},{pad_y} Z" fill="url(#dungeonWall)"/>
  <path d="M {pad_x},{h - pad_y} L {w//2 - 4*gs},{h - pad_y} Q {w//2},{curve_y2} {w//2 + 4*gs},{curve_y2} L {w - pad_x},{h - pad_y} Z" fill="url(#dungeonWall)"/>
''')
        elif self.layout == "crossroads":
            # 4-way corridor intersection
            mid_x, mid_y = w // 2, h // 2
            cw = 8 * gs
            ch = 8 * gs
            svg.append(f'''
  <!-- 4-Way Crossroads Walls -->
  <rect x="{pad_x}" y="{pad_y}" width="{mid_x - cw//2 - pad_x}" height="{mid_y - ch//2 - pad_y}" fill="url(#dungeonWall)"/>
  <rect x="{mid_x + cw//2}" y="{pad_y}" width="{w - pad_x - (mid_x + cw//2)}" height="{mid_y - ch//2 - pad_y}" fill="url(#dungeonWall)"/>
  <rect x="{pad_x}" y="{mid_y + ch//2}" width="{mid_x - cw//2 - pad_x}" height="{h - pad_y - (mid_y + ch//2)}" fill="url(#dungeonWall)"/>
  <rect x="{mid_x + cw//2}" y="{mid_y + ch//2}" width="{w - pad_x - (mid_x + cw//2)}" height="{h - pad_y - (mid_y + ch//2)}" fill="url(#dungeonWall)"/>
  <circle cx="{mid_x}" cy="{mid_y}" r="{gs*3}" fill="#1a1c23" stroke="#eab308" stroke-width="3" stroke-dasharray="12,6"/>
''')

        # 2. WATER FEATURE (Flooded Aqueduct / Canal)
        if self.has_water:
            water_x = w // 2 + int(self.rng.randint(-2, 2) * gs)
            canal_w = int(2.5 * gs)
            bridge_y = h // 2
            svg.append(f'''
  <!-- Flooded Subterranean Canal & Stone Bridge -->
  <rect x="{water_x - canal_w//2}" y="{pad_y}" width="{canal_w}" height="{inner_h}" fill="#082f49" stroke="#0e7490" stroke-width="3"/>
  <line x1="{water_x}" y1="{pad_y}" x2="{water_x}" y2="{h - pad_y}" stroke="#38bdf8" stroke-width="2" stroke-dasharray="20,15" opacity="0.6"/>
  <!-- Arched Stone Footbridge -->
  <g filter="url(#propShadow)">
    <rect x="{water_x - canal_w//2 - gs//2}" y="{bridge_y - gs}" width="{canal_w + gs}" height="{gs*2}" rx="4" fill="#334155" stroke="#1e293b" stroke-width="3"/>
    <line x1="{water_x - canal_w//2 - gs//2}" y1="{bridge_y - gs}" x2="{water_x + canal_w//2 + gs//2}" y2="{bridge_y - gs}" stroke="#0f172a" stroke-width="4"/>
    <line x1="{water_x - canal_w//2 - gs//2}" y1="{bridge_y + gs}" x2="{water_x + canal_w//2 + gs//2}" y2="{bridge_y + gs}" stroke="#0f172a" stroke-width="4"/>
  </g>
''')

        # 3. PILLARS & TACTICAL COVER
        if self.has_pillars:
            svg.append('  <!-- Stone Pillars (Tactical Cover) -->\n  <g filter="url(#propShadow)">\n')
            pillar_r = int(gs * 0.42)
            # Generate pillars based on layout and seed
            if self.layout == "arena":
                # Ring of pillars
                num_p = 8
                ar = min(inner_w, inner_h) // 2 - (3 * gs)
                for i in range(num_p):
                    angle = (2 * math.pi / num_p) * i
                    px = w // 2 + int(math.cos(angle) * ar)
                    py = h // 2 + int(math.sin(angle) * ar)
                    svg.append(f'''
    <circle cx="{px}" cy="{py}" r="{pillar_r + 4}" fill="#181a20" stroke="#0f1115" stroke-width="2"/>
    <circle cx="{px}" cy="{py}" r="{pillar_r}" fill="#3f4553" stroke="#4b5563" stroke-width="3"/>
''')
            else:
                # 2-4 pillar pairs placed in open zones
                col_offsets = [-6, 6] if inner_w > 20*gs else [-4, 4]
                row_offsets = [-6, 0, 6]
                for co in col_offsets:
                    for ro in row_offsets:
                        px = w // 2 + (co * gs) + int(self.rng.randint(-1, 1) * 10)
                        py = h // 2 + (ro * gs) + int(self.rng.randint(-1, 1) * 10)
                        if pad_x + gs < px < w - pad_x - gs and pad_y + gs < py < h - pad_y - gs:
                            svg.append(f'''
    <circle cx="{px}" cy="{py}" r="{pillar_r + 4}" fill="#181a20" stroke="#0f1115" stroke-width="2"/>
    <circle cx="{px}" cy="{py}" r="{pillar_r}" fill="#3f4553" stroke="#4b5563" stroke-width="3"/>
''')
            svg.append('  </g>\n')

        # 4. SEED-DRIVEN PROPS (Sarcophagi, Tombs, Rubble)
        svg.append('  <!-- Seed-Randomized Tombs & Props -->\n  <g filter="url(#propShadow)">\n')
        tomb_w = int(1.6 * gs)
        tomb_h = int(2.8 * gs)
        for i in range(4):
            tx = pad_x + (2 * gs) + int(self.rng.randint(0, 3) * gs)
            ty = pad_y + (2 * gs) + (i * int(4.5 * gs))
            if ty + tomb_h < h - pad_y:
                svg.append(f'''
    <rect x="{tx}" y="{ty}" width="{tomb_w}" height="{tomb_h}" rx="5" fill="#333a48" stroke="#4b5563" stroke-width="2"/>
    <rect x="{tx + 6}" y="{ty + 6}" width="{tomb_w - 12}" height="{tomb_h - 12}" rx="3" fill="#1f242e"/>
    <text x="{tx + tomb_w//2}" y="{ty + tomb_h//2 + 6}" font-family="serif" font-size="20" fill="#64748b" text-anchor="middle">†</text>
''')
        svg.append('  </g>\n')

        # 5. LIGHTING TORCHES / SCONCES
        if self.lighting != "bright":
            light_color = "#f59e0b" if self.lighting in ("torchlit", "dark") else ("#06b6d4" if self.lighting == "bioluminescent" else "#c084fc")
            num_lights = 2 if self.lighting == "dark" else 6
            torch_pts = [
                (pad_x + gs, pad_y + gs),
                (w - pad_x - gs, pad_y + gs),
                (pad_x + gs, h - pad_y - gs),
                (w - pad_x - gs, h - pad_y - gs),
                (w // 2, pad_y + gs),
                (w // 2, h - pad_y - gs)
            ][:num_lights]

            for tx, ty in torch_pts:
                svg.append(f'''
  <circle cx="{tx}" cy="{ty}" r="{int(gs * 2.8)}" fill="url(#lightGlow)" pointer-events="none"/>
  <circle cx="{tx}" cy="{ty}" r="10" fill="{light_color}" stroke="#1e293b" stroke-width="3"/>
''')

        # 6. ATMOSPHERIC OVERLAY
        svg.append(self._get_lighting_overlay())
        svg.append('</svg>')
        return "".join(svg)

    # -------------------------------------------------------------------------
    # THEME 2: CAVERN / UNDERDARK
    # -------------------------------------------------------------------------
    def _generate_cavern(self) -> str:
        w, h = self.width, self.height
        gs = self.grid_size

        svg = []
        svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n<defs>')
        svg.append(self._get_lighting_defs())
        svg.append('</defs>\n<!-- Solid Rock Void -->\n<rect width="100%" height="100%" fill="#0a0c10"/>\n')

        # 1. LAYOUT ARCHITECTURE
        if self.layout == "multi_room":
            # 3 organic interconnected cave pockets
            p1_x, p1_y = w // 3, h // 2
            p2_x, p2_y = (w * 2) // 3, h // 3
            p3_x, p3_y = (w * 2) // 3, (h * 2) // 3
            r1 = min(w, h) // 3
            r2 = min(w, h) // 4
            svg.append(f'''
  <!-- Multi-Pocket Cavern Chambers -->
  <path d="M {2*gs},{h//2} Q {w//4},{gs} {w//2},{2*gs} T {w - 2*gs},{h//3} Q {w - gs},{h//2} {w - 3*gs},{h - 2*gs} Q {w//2},{h - gs} {w//3},{h - 2*gs} Z" fill="#1b1f28" stroke="#0e1117" stroke-width="{gs}"/>
  <circle cx="{p1_x}" cy="{p1_y}" r="{r1}" fill="#222834"/>
  <circle cx="{p2_x}" cy="{p2_y}" r="{r2}" fill="#222834"/>
  <circle cx="{p3_x}" cy="{p3_y}" r="{r2}" fill="#222834"/>
''')
        elif self.layout == "arena":
            # Giant open subterranean dome
            mid_x, mid_y = w // 2, h // 2
            rx, ry = (w // 2) - (2 * gs), (h // 2) - (2 * gs)
            svg.append(f'''
  <!-- Vast Underdark Cavern Dome -->
  <ellipse cx="{mid_x}" cy="{mid_y}" rx="{rx}" ry="{ry}" fill="#1e232d" stroke="#0e1117" stroke-width="{gs}"/>
  <ellipse cx="{mid_x}" cy="{mid_y}" rx="{rx - 3*gs}" ry="{ry - 3*gs}" fill="#252b37" stroke="#334155" stroke-width="3" stroke-dasharray="14,7"/>
''')
        elif self.layout == "winding":
            # Twisting S-shaped chasm ravine
            svg.append(f'''
  <!-- Twisting Canyon Ravine -->
  <path d="M {2*gs},{3*gs} Q {w//3},{h//2 - 4*gs} {w//2},{h//2} T {w - 2*gs},{h - 3*gs} L {w - 4*gs},{h - gs} Q {w//2},{h//2 + 4*gs} {w//3},{h//2} T {gs},{6*gs} Z" fill="#1e232d" stroke="#0e1117" stroke-width="{gs}"/>
''')
        elif self.layout == "crossroads":
            # 4 cavern tunnels meeting in center
            mid_x, mid_y = w // 2, h // 2
            cr = int(min(w, h) * 0.28)
            svg.append(f'''
  <!-- 4-Way Underdark Crossroads -->
  <rect x="{mid_x - 3*gs}" y="{gs}" width="{6*gs}" height="{h - 2*gs}" fill="#1e232d"/>
  <rect x="{gs}" y="{mid_y - 3*gs}" width="{w - 2*gs}" height="{6*gs}" fill="#1e232d"/>
  <circle cx="{mid_x}" cy="{mid_y}" r="{cr}" fill="#272e3b" stroke="#0e1117" stroke-width="4"/>
''')

        # 2. WATER FEATURE (Subterranean River or Abyss)
        if self.has_water:
            river_w = int(3.5 * gs)
            bend = int(self.rng.randint(-4, 4) * gs)
            svg.append(f'''
  <!-- Subterranean Abyss / Bioluminescent Stream -->
  <path d="M {w//2 - 2*gs + bend},0 Q {w//2 + 3*gs},{h//2} {w//2 - gs + bend},{h} L {w//2 + river_w + bend},{h} Q {w//2 + 3*gs + river_w},{h//2} {w//2 + river_w - 2*gs + bend},0 Z" fill="#082f49" stroke="#0284c7" stroke-width="3"/>
  <!-- Stepping Stones / Natural Rock Bridge -->
  <g filter="url(#propShadow)">
    <ellipse cx="{w//2 + bend//2}" cy="{h//2 - gs}" rx="{int(gs*0.7)}" ry="{int(gs*0.5)}" fill="#334155" stroke="#1e293b" stroke-width="2"/>
    <ellipse cx="{w//2 + bend//2 + gs}" cy="{h//2 + gs}" rx="{int(gs*0.7)}" ry="{int(gs*0.5)}" fill="#334155" stroke="#1e293b" stroke-width="2"/>
  </g>
''')

        # 3. PILLARS & STALAGMITES (Cover)
        if self.has_pillars:
            svg.append('  <!-- Stalagmites & Rock Formations (Tactical Cover) -->\n  <g filter="url(#propShadow)">\n')
            num_rocks = 10 + (self.seed % 6)
            for _ in range(num_rocks):
                rx = self.rng.randint(4 * gs, w - 4 * gs)
                ry = self.rng.randint(4 * gs, h - 4 * gs)
                rad_x = self.rng.randint(int(gs * 0.4), int(gs * 0.8))
                rad_y = self.rng.randint(int(gs * 0.3), int(gs * 0.6))
                svg.append(f'''
    <ellipse cx="{rx}" cy="{ry}" rx="{rad_x}" ry="{rad_y}" fill="#374151" stroke="#1f2937" stroke-width="3"/>
    <ellipse cx="{rx - 3}" cy="{ry - 3}" rx="{rad_x//2}" ry="{rad_y//2}" fill="#4b5563"/>
''')
            svg.append('  </g>\n')

        # 4. BIOLUMINESCENT SPORES / CRYSTALS (Seed-driven)
        fungus_color = "#06b6d4" if self.lighting == "bioluminescent" else ("#a855f7" if self.lighting == "ethereal" else "#f59e0b")
        for _ in range(6):
            fx = self.rng.randint(3 * gs, w - 3 * gs)
            fy = self.rng.randint(3 * gs, h - 3 * gs)
            svg.append(f'''
  <circle cx="{fx}" cy="{fy}" r="{int(gs * 2.2)}" fill="url(#lightGlow)" pointer-events="none"/>
  <circle cx="{fx}" cy="{fy}" r="8" fill="{fungus_color}" stroke="#1e293b" stroke-width="2"/>
  <circle cx="{fx + 10}" cy="{fy - 8}" r="5" fill="#a855f7"/>
''')

        # 5. ATMOSPHERIC OVERLAY
        svg.append(self._get_lighting_overlay())
        svg.append('</svg>')
        return "".join(svg)

    # -------------------------------------------------------------------------
    # THEME 3: FOREST / WILDERNESS
    # -------------------------------------------------------------------------
    def _generate_forest(self) -> str:
        w, h = self.width, self.height
        gs = self.grid_size

        svg = []
        svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n<defs>')
        svg.append(self._get_lighting_defs())
        svg.append('</defs>\n')

        # Base Grassland
        svg.append(f'  <!-- Forest Grassland Floor -->\n  <rect width="{w}" height="{h}" fill="#1c3d1b"/>\n')

        # 1. LAYOUT ARCHITECTURE (Trails & Clearings)
        if self.layout == "multi_room":
            # 3 distinct clearings linked by forest trails
            c1_x, c1_y = w // 3, h // 2
            c2_x, c2_y = (w * 2) // 3, h // 3
            c3_x, c3_y = (w * 2) // 3, (h * 2) // 3
            svg.append(f'''
  <!-- Glade Clearings & Interconnecting Dirt Paths -->
  <circle cx="{c1_x}" cy="{c1_y}" r="{min(w,h)//3}" fill="#285a26"/>
  <circle cx="{c2_x}" cy="{c2_y}" r="{min(w,h)//4}" fill="#285a26"/>
  <circle cx="{c3_x}" cy="{c3_y}" r="{min(w,h)//4}" fill="#285a26"/>
  <path d="M {c1_x},{c1_y} Q {w//2},{h//2} {c2_x},{c2_y} M {c1_x},{c1_y} Q {w//2},{h//2} {c3_x},{c3_y}" stroke="#654321" stroke-width="{gs*2}" stroke-linecap="round" fill="none" opacity="0.8"/>
''')
        elif self.layout == "arena":
            # Grand battle clearing bordered by deep woods
            mid_x, mid_y = w // 2, h // 2
            svg.append(f'''
  <!-- Vast Forest Arena Clearing -->
  <circle cx="{mid_x}" cy="{mid_y}" r="{min(w,h)//2 - 2*gs}" fill="#2d6a2b" stroke="#1c3d1b" stroke-width="8"/>
  <circle cx="{mid_x}" cy="{mid_y}" r="{min(w,h)//2 - 5*gs}" fill="#357a33" stroke="#4d7c0f" stroke-width="3" stroke-dasharray="14,8"/>
''')
        elif self.layout == "winding":
            # S-curving wagon trail
            mid_y = h // 2
            svg.append(f'''
  <!-- Winding Forest Trail -->
  <path d="M 0,{mid_y - 2*gs} Q {w//3},{mid_y - 5*gs} {w//2},{mid_y} T {w},{mid_y + 2*gs}" stroke="#785338" stroke-width="{gs*3}" fill="none" stroke-linecap="round" opacity="0.85"/>
''')
        elif self.layout == "crossroads":
            # 4-way forest crossroads
            mid_x, mid_y = w // 2, h // 2
            svg.append(f'''
  <!-- 4-Way Forest Crossroads -->
  <line x1="{mid_x}" y1="0" x2="{mid_x}" y2="{h}" stroke="#785338" stroke-width="{gs*3}" opacity="0.85"/>
  <line x1="0" y1="{mid_y}" x2="{w}" y2="{mid_y}" stroke="#785338" stroke-width="{gs*3}" opacity="0.85"/>
  <circle cx="{mid_x}" cy="{mid_y}" r="{gs*3}" fill="#69452b" opacity="0.9"/>
''')

        # 2. WATER FEATURE (Freshwater River & Plank Bridge)
        if self.has_water:
            river_x = w // 2 + int(self.rng.randint(-2, 2) * gs)
            bridge_y = h // 2
            svg.append(f'''
  <!-- Winding Freshwater River & Wooden Bridge -->
  <path d="M {river_x - gs},0 Q {river_x - 3*gs},{h//3} {river_x},{h//2} T {river_x - 2*gs},{h} L {river_x + 3*gs},{h} Q {river_x + 2*gs},{h//2} {river_x + 4*gs},{h//3} T {river_x + 4*gs},0 Z" fill="#0284c7" stroke="#0369a1" stroke-width="4"/>
  <g filter="url(#propShadow)">
    <rect x="{river_x - 3*gs}" y="{bridge_y - int(1.2*gs)}" width="{7*gs}" height="{int(2.4*gs)}" rx="4" fill="#583116" stroke="#2b180a" stroke-width="4"/>
    <line x1="{river_x - 3*gs}" y1="{bridge_y - int(1.2*gs)}" x2="{river_x + 4*gs}" y2="{bridge_y - int(1.2*gs)}" stroke="#271508" stroke-width="3"/>
    <line x1="{river_x - 3*gs}" y1="{bridge_y + int(1.2*gs)}" x2="{river_x + 4*gs}" y2="{bridge_y + int(1.2*gs)}" stroke="#271508" stroke-width="3"/>
  </g>
''')

        # 3. PILLARS & TREE CANOPIES (Tactical Cover)
        if self.has_pillars:
            svg.append('  <!-- Ancient Forest Trees (Cover) -->\n  <g filter="url(#propShadow)">\n')
            num_trees = 12 + (self.seed % 8)
            for _ in range(num_trees):
                tx = self.rng.randint(2 * gs, w - 2 * gs)
                ty = self.rng.randint(2 * gs, h - 2 * gs)
                tr = self.rng.randint(int(gs * 1.1), int(gs * 1.6))
                svg.append(f'''
    <circle cx="{tx}" cy="{ty}" r="{int(gs * 0.35)}" fill="#382212" stroke="#1c1109" stroke-width="2"/>
    <circle cx="{tx}" cy="{ty}" r="{tr}" fill="#144216" stroke="#0b280d" stroke-width="3" opacity="0.9"/>
    <circle cx="{tx - 4}" cy="{ty - 4}" r="{int(tr * 0.6)}" fill="#1d5920" opacity="0.6"/>
''')
            svg.append('  </g>\n')

        # 4. CAMPSITE & SEED PROPS
        camp_x = pad_x = 5 * gs
        camp_y = 5 * gs
        svg.append(f'''
  <!-- Adventurer Campfire -->
  <circle cx="{camp_x}" cy="{camp_y}" r="{int(gs * 2.5)}" fill="url(#lightGlow)" pointer-events="none"/>
  <circle cx="{camp_x}" cy="{camp_y}" r="{int(gs * 0.4)}" fill="#f59e0b" stroke="#b45309" stroke-width="3"/>
''')

        # 5. ATMOSPHERIC OVERLAY
        svg.append(self._get_lighting_overlay())
        svg.append('</svg>')
        return "".join(svg)

    # -------------------------------------------------------------------------
    # THEME 4: TAVERN / INN
    # -------------------------------------------------------------------------
    def _generate_tavern(self) -> str:
        w, h = self.width, self.height
        gs = self.grid_size
        pad_x, pad_y = 2 * gs, 2 * gs
        inner_w, inner_h = w - (2 * pad_x), h - (2 * pad_y)

        svg = []
        svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n<defs>')
        svg.append(self._get_lighting_defs())
        svg.append(f'''
    <pattern id="tavernPlanks" width="120" height="40" patternUnits="userSpaceOnUse">
      <rect width="120" height="40" fill="#2c1a0e"/>
      <rect x="1" y="1" width="118" height="18" fill="#3d2414" stroke="#1d1007" stroke-width="2"/>
      <rect x="61" y="21" width="58" height="18" fill="#361f10" stroke="#1d1007" stroke-width="2"/>
      <rect x="1" y="21" width="58" height="18" fill="#422716" stroke="#1d1007" stroke-width="2"/>
    </pattern>
    <pattern id="tavernStone" width="60" height="30" patternUnits="userSpaceOnUse">
      <rect width="60" height="30" fill="#14110e"/>
      <rect x="2" y="2" width="56" height="12" fill="#2d221a" stroke="#0d0b09" stroke-width="2"/>
      <rect x="2" y="16" width="26" height="12" fill="#271d16" stroke="#0d0b09" stroke-width="2"/>
      <rect x="32" y="16" width="26" height="12" fill="#2a1f17" stroke="#0d0b09" stroke-width="2"/>
    </pattern>
  </defs>
  <!-- Outside Earth -->
  <rect width="{w}" height="{h}" fill="#0f0c09"/>
  <!-- Floor -->
  <rect x="{pad_x}" y="{pad_y}" width="{inner_w}" height="{inner_h}" fill="url(#tavernPlanks)"/>
  <!-- Walls -->
  <rect x="{pad_x - gs//2}" y="{pad_y - gs//2}" width="{inner_w + gs}" height="{inner_h + gs}" fill="none" stroke="url(#tavernStone)" stroke-width="{gs}"/>
''')

        # 1. LAYOUT ARCHITECTURE
        if self.layout == "multi_room":
            # Taproom, VIP Snug, Kitchen, Cellar Storage
            split_x = pad_x + int(inner_w * 0.6)
            split_y = pad_y + int(inner_h * 0.5)
            svg.append(f'''
  <!-- Private Dining Snug & Kitchen Walls -->
  <rect x="{split_x}" y="{pad_y}" width="{gs}" height="{inner_h}" fill="url(#tavernStone)"/>
  <rect x="{split_x}" y="{split_y}" width="{w - pad_x - split_x}" height="{gs}" fill="url(#tavernStone)"/>
''')
        elif self.layout == "arena":
            # Grand open brawl hall with perimeter bar
            mid_x, mid_y = w // 2, h // 2
            svg.append(f'''
  <!-- Grand Brawl Hall Stage -->
  <rect x="{mid_x - 4*gs}" y="{mid_y - 3*gs}" width="{8*gs}" height="{6*gs}" rx="6" fill="#4d2b13" stroke="#2b180a" stroke-width="3"/>
''')
        elif self.layout == "crossroads":
            # Central bar counter hub with 4 dining wings
            mid_x, mid_y = w // 2, h // 2
            svg.append(f'''
  <!-- Central Island Bar Counter -->
  <rect x="{mid_x - 3*gs}" y="{mid_y - 3*gs}" width="{6*gs}" height="{6*gs}" rx="8" fill="#583116" stroke="#2b180a" stroke-width="4"/>
  <rect x="{mid_x - 2*gs}" y="{mid_y - 2*gs}" width="{4*gs}" height="{4*gs}" fill="#2e1a0b"/>
''')

        # 2. WATER FEATURE (Cellar Brewery Basin / Flooded Cistern)
        if self.has_water:
            basin_w = int(inner_w * 0.3)
            basin_h = int(inner_h * 0.35)
            svg.append(f'''
  <!-- Flooded Brewing Cistern & Wooden Catwalk -->
  <rect x="{w - pad_x - basin_w}" y="{h - pad_y - basin_h}" width="{basin_w}" height="{basin_h}" rx="6" fill="#082f49" stroke="#164e63" stroke-width="4"/>
  <rect x="{w - pad_x - basin_w}" y="{h - pad_y - basin_h//2 - gs//2}" width="{basin_w}" height="{gs}" fill="#583116" stroke="#2b180a" stroke-width="2"/>
''')

        # 3. PILLARS & ALE CASKS (Tactical Cover)
        if self.has_pillars:
            svg.append('  <!-- Giant Ale Casks & Timber Posts (Cover) -->\n  <g filter="url(#propShadow)">\n')
            # Massive beer casks
            for i in range(4):
                cx = pad_x + (2 * gs)
                cy = pad_y + (3 * gs) + (i * int(3.5 * gs))
                if cy < h - pad_y - gs:
                    svg.append(f'''
    <ellipse cx="{cx}" cy="{cy}" rx="{int(gs*0.9)}" ry="{int(gs*0.6)}" fill="#5c381e" stroke="#2e1a0b" stroke-width="3"/>
''')
            # Timber support posts
            posts = [
                (w // 2 - 5*gs, h // 2 - 4*gs),
                (w // 2 + 5*gs, h // 2 - 4*gs),
                (w // 2 - 5*gs, h // 2 + 4*gs),
                (w // 2 + 5*gs, h // 2 + 4*gs)
            ]
            for px, py in posts:
                svg.append(f'''
    <rect x="{px - gs//3}" y="{py - gs//3}" width="{gs*2//3}" height="{gs*2//3}" fill="#3d2414" stroke="#1d1007" stroke-width="2"/>
''')
            svg.append('  </g>\n')

        # 4. TABLES & FIREPLACE HEARTH (Seed-driven)
        mid_x = w // 2
        svg.append(f'''
  <!-- Roaring Fireplace Hearth -->
  <rect x="{mid_x - 3*gs}" y="{pad_y - gs//2}" width="{6*gs}" height="{int(1.4*gs)}" fill="#475569" stroke="#1e293b" stroke-width="3"/>
  <circle cx="{mid_x}" cy="{pad_y + gs//2}" r="{int(gs * 3.5)}" fill="url(#lightGlow)" pointer-events="none"/>
''')

        # 5. ATMOSPHERIC OVERLAY
        svg.append(self._get_lighting_overlay())
        svg.append('</svg>')
        return "".join(svg)

    # -------------------------------------------------------------------------
    # THEME 5: ARCANE SANCTUM / VOID RIFT
    # -------------------------------------------------------------------------
    def _generate_arcane(self) -> str:
        w, h = self.width, self.height
        gs = self.grid_size
        mid_x, mid_y = w // 2, h // 2

        svg = []
        svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n<defs>')
        svg.append(self._get_lighting_defs())
        svg.append(f'''
    <radialGradient id="riftCore" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="25%" stop-color="#38bdf8" stop-opacity="0.9"/>
      <stop offset="55%" stop-color="#a855f7" stop-opacity="0.6"/>
      <stop offset="85%" stop-color="#312e81" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- Obsidian Void Floor -->
  <rect width="{w}" height="{h}" fill="#05070e"/>
  <rect x="{gs}" y="{gs}" width="{w - 2*gs}" height="{h - 2*gs}" fill="#0b0f19" stroke="#1e293b" stroke-width="{gs}"/>
''')

        # 1. LAYOUT ARCHITECTURE
        if self.layout == "multi_room":
            # Central sanctum with 4 perimeter spell-containment cells
            svg.append(f'''
  <!-- Containment Barrier Fields -->
  <rect x="{gs}" y="{h//3}" width="{w//4}" height="{gs}" fill="#312e81" stroke="#6366f1" stroke-width="2"/>
  <rect x="{w - gs - w//4}" y="{h//3}" width="{w//4}" height="{gs}" fill="#312e81" stroke="#6366f1" stroke-width="2"/>
  <rect x="{gs}" y="{h*2//3}" width="{w//4}" height="{gs}" fill="#312e81" stroke="#6366f1" stroke-width="2"/>
  <rect x="{w - gs - w//4}" y="{h*2//3}" width="{w//4}" height="{gs}" fill="#312e81" stroke="#6366f1" stroke-width="2"/>
''')
        elif self.layout == "arena":
            # Massive concentric summoning circle
            svg.append(f'''
  <!-- Grand Planetary Sigil Ring -->
  <circle cx="{mid_x}" cy="{mid_y}" r="{min(w,h)//2 - 2*gs}" fill="none" stroke="#4338ca" stroke-width="4"/>
  <circle cx="{mid_x}" cy="{mid_y}" r="{min(w,h)//2 - 4*gs}" fill="none" stroke="#6366f1" stroke-width="2" stroke-dasharray="16,8"/>
''')
        elif self.layout == "crossroads":
            # 4 energy beams converging into the rift
            svg.append(f'''
  <!-- Energy Conduits Crossing -->
  <line x1="{mid_x}" y1="0" x2="{mid_x}" y2="{h}" stroke="#38bdf8" stroke-width="8" opacity="0.6"/>
  <line x1="0" y1="{mid_y}" x2="{w}" y2="{mid_y}" stroke="#a855f7" stroke-width="8" opacity="0.6"/>
''')

        # 2. WATER FEATURE (Liquid Aether / Mana Stream)
        if self.has_water:
            svg.append(f'''
  <!-- Rushing Liquid Mana Conduit -->
  <path d="M 0,{mid_y - 2*gs} Q {w//3},{mid_y - 4*gs} {mid_x},{mid_y} T {w},{mid_y + 2*gs}" stroke="#06b6d4" stroke-width="{gs*3}" fill="none" opacity="0.75" filter="url(#waterGlow)"/>
''')

        # 3. PILLARS (Floating Mana Pylons)
        if self.has_pillars:
            svg.append('  <!-- Floating Mana Pylons (Cover) -->\n  <g filter="url(#propShadow)">\n')
            pylons = [
                (mid_x - 6*gs, mid_y - 4*gs),
                (mid_x + 6*gs, mid_y - 4*gs),
                (mid_x - 6*gs, mid_y + 4*gs),
                (mid_x + 6*gs, mid_y + 4*gs)
            ]
            for px, py in pylons:
                svg.append(f'''
    <circle cx="{px}" cy="{py}" r="{int(gs * 0.8)}" fill="#1e1b4b" stroke="#4338ca" stroke-width="3"/>
    <polygon points="{px},{py - gs//2} {px + gs//2},{py} {px},{py + gs//2} {px - gs//2},{py}" fill="#38bdf8"/>
''')
            svg.append('  </g>\n')

        # 4. CENTRAL ASTRAL RIFT
        svg.append(f'''
  <!-- Central Astral Summoning Rift -->
  <circle cx="{mid_x}" cy="{mid_y}" r="{gs * 4}" fill="url(#riftCore)" pointer-events="none"/>
  <circle cx="{mid_x}" cy="{mid_y}" r="{gs * 2.5}" fill="none" stroke="#67e8f9" stroke-width="4" stroke-dasharray="20,10"/>
''')

        # 5. ATMOSPHERIC OVERLAY
        svg.append(self._get_lighting_overlay())
        svg.append('</svg>')
        return "".join(svg)

    # -------------------------------------------------------------------------
    # THEME 6: OVERGROWN ANCIENT RUINS
    # -------------------------------------------------------------------------
    def _generate_ruins(self) -> str:
        w, h = self.width, self.height
        gs = self.grid_size
        mid_x, mid_y = w // 2, h // 2

        svg = []
        svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n<defs>')
        svg.append(self._get_lighting_defs())
        svg.append('</defs>\n')

        # Base Weathered Ground
        svg.append(f'  <!-- Weathered Ruins Ground -->\n  <rect width="{w}" height="{h}" fill="#1c1f1c"/>\n')

        # 1. LAYOUT ARCHITECTURE
        if self.layout == "multi_room":
            # Collapsed temple halls & broken partitions
            svg.append(f'''
  <!-- Collapsed Ruin Sanctuary Walls -->
  <rect x="{2*gs}" y="{h//3}" width="{w//3}" height="{gs}" fill="#3f3f46" stroke="#18181b" stroke-width="3"/>
  <rect x="{w - 2*gs - w//3}" y="{h//3}" width="{w//3}" height="{gs}" fill="#3f3f46" stroke="#18181b" stroke-width="3"/>
  <rect x="{2*gs}" y="{h*2//3}" width="{w//3}" height="{gs}" fill="#3f3f46" stroke="#18181b" stroke-width="3"/>
''')
        elif self.layout == "arena":
            # Sunken ruined colosseum
            svg.append(f'''
  <!-- Sunken Colosseum Floor -->
  <circle cx="{mid_x}" cy="{mid_y}" r="{min(w,h)//2 - 2*gs}" fill="#27272a" stroke="#52525b" stroke-width="6"/>
  <circle cx="{mid_x}" cy="{mid_y}" r="{min(w,h)//2 - 5*gs}" fill="#18181b" stroke="#3f3f46" stroke-width="3" stroke-dasharray="16,8"/>
''')
        elif self.layout == "crossroads":
            # Overgrown colonnade intersection
            svg.append(f'''
  <!-- 4-Way Ruin Colonnades -->
  <line x1="{mid_x}" y1="0" x2="{mid_x}" y2="{h}" stroke="#27272a" stroke-width="{gs*4}"/>
  <line x1="0" y1="{mid_y}" x2="{w}" y2="{mid_y}" stroke="#27272a" stroke-width="{gs*4}"/>
''')

        # 2. WATER FEATURE (Sunken Reflecting Pool / Flooded Courtyard)
        if self.has_water:
            pool_r = int(min(w, h) * 0.25)
            svg.append(f'''
  <!-- Sunken Reflecting Pool & Stepping Stones -->
  <circle cx="{mid_x}" cy="{mid_y}" r="{pool_r}" fill="#082f49" stroke="#155e75" stroke-width="4"/>
  <g filter="url(#propShadow)">
    <circle cx="{mid_x - gs}" cy="{mid_y}" r="{int(gs*0.5)}" fill="#3f3f46"/>
    <circle cx="{mid_x + gs}" cy="{mid_y}" r="{int(gs*0.5)}" fill="#3f3f46"/>
  </g>
''')

        # 3. PILLARS & TOOMBED MARBLE COLUMNS (Tactical Cover)
        if self.has_pillars:
            svg.append('  <!-- Standing & Toppled Marble Columns (Cover) -->\n  <g filter="url(#propShadow)">\n')
            num_cols = 10 + (self.seed % 6)
            for i in range(num_cols):
                px = self.rng.randint(3 * gs, w - 3 * gs)
                py = self.rng.randint(3 * gs, h - 3 * gs)
                if i % 3 == 0:
                    # Toppled broken pillar shaft
                    rot = self.rng.randint(15, 75)
                    svg.append(f'''
    <rect x="{px - gs}" y="{py - gs//3}" width="{int(2.2*gs)}" height="{int(0.7*gs)}" rx="4" fill="#3f3f46" stroke="#18181b" stroke-width="2" transform="rotate({rot} {px} {py})"/>
''')
                else:
                    # Standing column
                    svg.append(f'''
    <circle cx="{px}" cy="{py}" r="{int(gs * 0.45)}" fill="#52525b" stroke="#27272a" stroke-width="3"/>
    <circle cx="{px}" cy="{py}" r="{int(gs * 0.28)}" fill="#71717a"/>
''')
            svg.append('  </g>\n')

        # 4. CENTRAL ALTAR & MOSS (Seed-driven)
        svg.append(f'''
  <!-- Ancient Altar -->
  <g filter="url(#propShadow)">
    <rect x="{mid_x - 3*gs}" y="{mid_y - 2*gs}" width="{6*gs}" height="{4*gs}" rx="6" fill="#3f3f46" stroke="#18181b" stroke-width="3"/>
    <rect x="{mid_x - int(1.5*gs)}" y="{mid_y - gs}" width="{3*gs}" height="{2*gs}" rx="3" fill="#18181b" stroke="#4b5563" stroke-width="2"/>
  </g>
''')

        # 5. ATMOSPHERIC OVERLAY
        svg.append(self._get_lighting_overlay())
        svg.append('</svg>')
        return "".join(svg)
