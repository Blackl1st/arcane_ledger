import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MAPS_DIR = BASE_DIR / "static" / "images" / "battlemaps"
MAPS_DIR.mkdir(parents=True, exist_ok=True)

def generate_dungeon_crypt():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 1500" width="2000" height="1500">
  <defs>
    <!-- Background Patterns & Gradients -->
    <radialGradient id="torchGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffb703" stop-opacity="0.85"/>
      <stop offset="35%" stop-color="#fb8500" stop-opacity="0.45"/>
      <stop offset="70%" stop-color="#d62828" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="altarGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#b5179e" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#7209b7" stop-opacity="0.5"/>
      <stop offset="80%" stop-color="#480ca8" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <pattern id="stoneFloor" width="100" height="100" patternUnits="userSpaceOnUse">
      <rect width="100" height="100" fill="#1b1e24"/>
      <!-- Slabs -->
      <rect x="2" y="2" width="46" height="46" fill="#242831" rx="2" stroke="#111317" stroke-width="2"/>
      <rect x="52" y="2" width="46" height="46" fill="#1f232b" rx="2" stroke="#111317" stroke-width="2"/>
      <rect x="2" y="52" width="46" height="46" fill="#21252e" rx="2" stroke="#111317" stroke-width="2"/>
      <rect x="52" y="52" width="46" height="46" fill="#262b35" rx="2" stroke="#111317" stroke-width="2"/>
      <!-- Subtle cracks -->
      <path d="M10 20 L22 30 L28 26" stroke="#16181d" stroke-width="1.5" fill="none"/>
      <path d="M70 65 L82 72 L86 85" stroke="#16181d" stroke-width="1.5" fill="none"/>
    </pattern>
    <pattern id="wallStone" width="50" height="50" patternUnits="userSpaceOnUse">
      <rect width="50" height="50" fill="#0d0e12"/>
      <rect x="2" y="2" width="46" height="21" fill="#14171d" stroke="#08090b" stroke-width="2"/>
      <rect x="2" y="27" width="21" height="21" fill="#161920" stroke="#08090b" stroke-width="2"/>
      <rect x="27" y="27" width="21" height="21" fill="#121419" stroke="#08090b" stroke-width="2"/>
    </pattern>
    <!-- Drop Shadow for pillars and sarcophagi -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="10" dy="14" stdDeviation="8" flood-color="#000000" flood-opacity="0.8"/>
    </filter>
  </defs>

  <!-- Solid Void Background -->
  <rect width="2000" height="1500" fill="#090a0d"/>

  <!-- Main Dungeon Chamber Floor -->
  <rect x="150" y="150" width="1700" height="1200" fill="url(#stoneFloor)"/>

  <!-- Crypt Walls (Border) -->
  <rect x="120" y="120" width="1760" height="1260" fill="none" stroke="url(#wallStone)" stroke-width="60"/>

  <!-- Entrance Passage South -->
  <rect x="900" y="1320" width="200" height="180" fill="url(#stoneFloor)"/>
  <rect x="880" y="1320" width="20" height="180" fill="url(#wallStone)"/>
  <rect x="1100" y="1320" width="20" height="180" fill="url(#wallStone)"/>
  <!-- Iron Portcullis Gates -->
  <line x1="900" y1="1350" x2="1100" y2="1350" stroke="#475569" stroke-width="8" stroke-dasharray="15,10"/>
  <line x1="900" y1="1400" x2="1100" y2="1400" stroke="#475569" stroke-width="8" stroke-dasharray="15,10"/>

  <!-- North Crypt Sanctuary Dais -->
  <rect x="650" y="200" width="700" height="300" fill="#2d3340" rx="8" stroke="#3d4455" stroke-width="4" filter="url(#shadow)"/>
  <rect x="700" y="230" width="600" height="240" fill="#242935" rx="6" stroke="#4a5568" stroke-width="3"/>
  
  <!-- Occult Ritual Circle on Dais -->
  <circle cx="1000" cy="350" r="90" fill="none" stroke="#7209b7" stroke-width="4" stroke-dasharray="12,6"/>
  <circle cx="1000" cy="350" r="70" fill="none" stroke="#b5179e" stroke-width="2"/>
  <polygon points="1000,285 1060,385 940,385" fill="none" stroke="#f72585" stroke-width="2"/>
  <polygon points="1000,415 1060,315 940,315" fill="none" stroke="#f72585" stroke-width="2"/>
  <!-- Altar Glow -->
  <circle cx="1000" cy="350" r="220" fill="url(#altarGlow)" pointer-events="none"/>

  <!-- Stone Altar Table -->
  <rect x="940" y="325" width="120" height="50" rx="4" fill="#181a20" stroke="#6b7280" stroke-width="4" filter="url(#shadow)"/>
  <line x1="950" y1="350" x2="1050" y2="350" stroke="#991b1b" stroke-width="6"/>

  <!-- Sarcophagi Rows (Left and Right Wings) -->
  <!-- West Wing Sarcophagi -->
  <g filter="url(#shadow)">
    <!-- Tomb 1 -->
    <rect x="300" y="300" width="90" height="160" rx="6" fill="#333a48" stroke="#4b5563" stroke-width="3"/>
    <rect x="315" y="315" width="60" height="130" rx="4" fill="#222731" stroke="#374151" stroke-width="2"/>
    <text x="345" y="385" font-family="serif" font-size="28" fill="#64748b" text-anchor="middle">†</text>
    
    <!-- Tomb 2 -->
    <rect x="300" y="550" width="90" height="160" rx="6" fill="#333a48" stroke="#4b5563" stroke-width="3"/>
    <rect x="315" y="565" width="60" height="130" rx="4" fill="#222731" stroke="#374151" stroke-width="2"/>
    <text x="345" y="635" font-family="serif" font-size="28" fill="#64748b" text-anchor="middle">†</text>

    <!-- Tomb 3 -->
    <rect x="300" y="800" width="90" height="160" rx="6" fill="#333a48" stroke="#4b5563" stroke-width="3"/>
    <rect x="315" y="815" width="60" height="130" rx="4" fill="#222731" stroke="#374151" stroke-width="2"/>
    <text x="345" y="885" font-family="serif" font-size="28" fill="#64748b" text-anchor="middle">†</text>

    <!-- Tomb 4 (Shattered / Open) -->
    <rect x="300" y="1050" width="90" height="160" rx="6" fill="#1a1c22" stroke="#4b5563" stroke-width="3"/>
    <polygon points="305,1055 350,1110 320,1200 305,1200" fill="#0f1115"/>
    <rect x="380" y="1070" width="50" height="130" rx="4" fill="#333a48" stroke="#4b5563" stroke-width="2" transform="rotate(18, 400, 1100)"/>
  </g>

  <!-- East Wing Sarcophagi -->
  <g filter="url(#shadow)">
    <!-- Tomb 5 -->
    <rect x="1610" y="300" width="90" height="160" rx="6" fill="#333a48" stroke="#4b5563" stroke-width="3"/>
    <rect x="1625" y="315" width="60" height="130" rx="4" fill="#222731" stroke="#374151" stroke-width="2"/>
    <text x="1655" y="385" font-family="serif" font-size="28" fill="#64748b" text-anchor="middle">†</text>

    <!-- Tomb 6 -->
    <rect x="1610" y="550" width="90" height="160" rx="6" fill="#333a48" stroke="#4b5563" stroke-width="3"/>
    <rect x="1625" y="565" width="60" height="130" rx="4" fill="#222731" stroke="#374151" stroke-width="2"/>
    <text x="1655" y="635" font-family="serif" font-size="28" fill="#64748b" text-anchor="middle">†</text>

    <!-- Tomb 7 -->
    <rect x="1610" y="800" width="90" height="160" rx="6" fill="#333a48" stroke="#4b5563" stroke-width="3"/>
    <rect x="1625" y="815" width="60" height="130" rx="4" fill="#222731" stroke="#374151" stroke-width="2"/>
    <text x="1655" y="885" font-family="serif" font-size="28" fill="#64748b" text-anchor="middle">†</text>

    <!-- Tomb 8 -->
    <rect x="1610" y="1050" width="90" height="160" rx="6" fill="#333a48" stroke="#4b5563" stroke-width="3"/>
    <rect x="1625" y="1065" width="60" height="130" rx="4" fill="#222731" stroke="#374151" stroke-width="2"/>
    <text x="1655" y="1135" font-family="serif" font-size="28" fill="#64748b" text-anchor="middle">†</text>
  </g>

  <!-- Massive Stone Crypt Pillars -->
  <!-- Row 1 -->
  <circle cx="650" cy="600" r="45" fill="#2b313d" stroke="#475569" stroke-width="6" filter="url(#shadow)"/>
  <circle cx="650" cy="600" r="30" fill="#1b1e26" stroke="#334155" stroke-width="3"/>
  <circle cx="1350" cy="600" r="45" fill="#2b313d" stroke="#475569" stroke-width="6" filter="url(#shadow)"/>
  <circle cx="1350" cy="600" r="30" fill="#1b1e26" stroke="#334155" stroke-width="3"/>

  <!-- Row 2 -->
  <circle cx="650" cy="900" r="45" fill="#2b313d" stroke="#475569" stroke-width="6" filter="url(#shadow)"/>
  <circle cx="650" cy="900" r="30" fill="#1b1e26" stroke="#334155" stroke-width="3"/>
  <circle cx="1350" cy="900" r="45" fill="#2b313d" stroke="#475569" stroke-width="6" filter="url(#shadow)"/>
  <circle cx="1350" cy="900" r="30" fill="#1b1e26" stroke="#334155" stroke-width="3"/>

  <!-- Row 3 -->
  <circle cx="650" cy="1200" r="45" fill="#2b313d" stroke="#475569" stroke-width="6" filter="url(#shadow)"/>
  <circle cx="650" cy="1200" r="30" fill="#1b1e26" stroke="#334155" stroke-width="3"/>
  <circle cx="1350" cy="1200" r="45" fill="#2b313d" stroke="#475569" stroke-width="6" filter="url(#shadow)"/>
  <circle cx="1350" cy="1200" r="30" fill="#1b1e26" stroke="#334155" stroke-width="3"/>

  <!-- Wall Braziers & Torches Glow -->
  <!-- Torch 1 (North West) -->
  <circle cx="200" cy="200" r="160" fill="url(#torchGlow)" pointer-events="none"/>
  <circle cx="200" cy="200" r="12" fill="#ffb703" stroke="#d97706" stroke-width="3"/>

  <!-- Torch 2 (North East) -->
  <circle cx="1800" cy="200" r="160" fill="url(#torchGlow)" pointer-events="none"/>
  <circle cx="1800" cy="200" r="12" fill="#ffb703" stroke="#d97706" stroke-width="3"/>

  <!-- Torch 3 (Center West) -->
  <circle cx="200" cy="750" r="160" fill="url(#torchGlow)" pointer-events="none"/>
  <circle cx="200" cy="750" r="12" fill="#ffb703" stroke="#d97706" stroke-width="3"/>

  <!-- Torch 4 (Center East) -->
  <circle cx="1800" cy="750" r="160" fill="url(#torchGlow)" pointer-events="none"/>
  <circle cx="1800" cy="750" r="12" fill="#ffb703" stroke="#d97706" stroke-width="3"/>

  <!-- Torch 5 (Entrance West) -->
  <circle cx="850" cy="1300" r="140" fill="url(#torchGlow)" pointer-events="none"/>
  <circle cx="850" cy="1300" r="12" fill="#ffb703" stroke="#d97706" stroke-width="3"/>

  <!-- Torch 6 (Entrance East) -->
  <circle cx="1150" cy="1300" r="140" fill="url(#torchGlow)" pointer-events="none"/>
  <circle cx="1150" cy="1300" r="12" fill="#ffb703" stroke="#d97706" stroke-width="3"/>

  <!-- Subtle Vignette Frame -->
  <rect x="0" y="0" width="2000" height="1500" fill="none" stroke="#000000" stroke-width="25"/>
</svg>'''
    (MAPS_DIR / "dungeon_crypt.svg").write_text(svg, encoding="utf-8")
    print("Created dungeon_crypt.svg")

def generate_forest_river():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 1500" width="2000" height="1500">
  <defs>
    <!-- Gradients & Textures -->
    <radialGradient id="sunlight" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#fffbeb" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#064e3b" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="campGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.9"/>
      <stop offset="35%" stop-color="#ea580c" stop-opacity="0.5"/>
      <stop offset="70%" stop-color="#b91c1c" stop-opacity="0.2"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="foliageShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="15" dy="20" stdDeviation="10" flood-color="#062211" flood-opacity="0.75"/>
    </filter>
    <filter id="bridgeShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="10" dy="14" stdDeviation="6" flood-color="#021a28" flood-opacity="0.8"/>
    </filter>
  </defs>

  <!-- Grassland Forest Floor -->
  <rect width="2000" height="1500" fill="#2d5a27"/>

  <!-- Variation in terrain patches (Forest Floor Moss / Earth) -->
  <ellipse cx="400" cy="350" rx="350" ry="250" fill="#24481f"/>
  <ellipse cx="1600" cy="400" rx="380" ry="280" fill="#22441d"/>
  <ellipse cx="1400" cy="1150" rx="420" ry="300" fill="#274f22"/>
  <ellipse cx="350" cy="1200" rx="360" ry="260" fill="#22441d"/>

  <!-- Dirt Trail Crossing East-West -->
  <path d="M0,800 C300,780 600,820 850,810 C1050,800 1350,760 1700,770 C1850,775 2000,790 2000,790 L2000,880 C1850,865 1700,860 1350,850 C1050,890 850,900 600,910 C300,870 0,890 0,890 Z" fill="#785338" opacity="0.85"/>
  <!-- Trail Footprints & Pebbles -->
  <path d="M0,810 C300,795 600,830 850,820 C1050,810 1350,775 1700,785 C1850,790 2000,805 2000,805 L2000,865 C1850,850 1700,845 1350,835 C1050,875 850,885 600,895 C300,855 0,875 0,875 Z" fill="#936848" opacity="0.65"/>

  <!-- Winding Blue River Cutting North-South -->
  <path d="M850,0 C750,250 1150,550 950,800 C750,1050 1250,1300 1150,1500 L1400,1500 C1500,1300 1000,1050 1200,800 C1400,550 1000,250 1100,0 Z" fill="#1b4965"/>
  <!-- River Deep Core -->
  <path d="M900,0 C820,250 1100,550 990,800 C810,1050 1200,1300 1200,1500 L1350,1500 C1420,1300 1050,1050 1150,800 C1320,550 1050,250 1050,0 Z" fill="#0f3044"/>
  <!-- Foam & Shallows Shorelines -->
  <path d="M850,0 C750,250 1150,550 950,800 C750,1050 1250,1300 1150,1500" fill="none" stroke="#62b6cb" stroke-width="8" stroke-opacity="0.6"/>
  <path d="M1100,0 C1000,250 1400,550 1200,800 C1000,1050 1500,1300 1400,1500" fill="none" stroke="#62b6cb" stroke-width="8" stroke-opacity="0.6"/>

  <!-- River Boulders and Rocks -->
  <ellipse cx="980" cy="400" rx="25" ry="20" fill="#475569" stroke="#334155" stroke-width="3"/>
  <ellipse cx="1120" cy="620" rx="35" ry="25" fill="#64748b" stroke="#334155" stroke-width="4"/>
  <ellipse cx="940" cy="1150" rx="30" ry="22" fill="#475569" stroke="#1e293b" stroke-width="3"/>
  <ellipse cx="1220" cy="1320" rx="28" ry="20" fill="#64748b" stroke="#334155" stroke-width="3"/>

  <!-- Heavy Wooden Plank Bridge Across River -->
  <g filter="url(#bridgeShadow)">
    <!-- Main Bridge Structure -->
    <rect x="880" y="780" width="340" height="140" rx="6" fill="#583116" stroke="#39200e" stroke-width="5"/>
    <!-- Individual Planks -->
    <line x1="910" y1="780" x2="910" y2="920" stroke="#78441f" stroke-width="20"/>
    <line x1="940" y1="780" x2="940" y2="920" stroke="#663a1a" stroke-width="20"/>
    <line x1="970" y1="780" x2="970" y2="920" stroke="#78441f" stroke-width="20"/>
    <line x1="1000" y1="780" x2="1000" y2="920" stroke="#5d3417" stroke-width="20"/>
    <line x1="1030" y1="780" x2="1030" y2="920" stroke="#78441f" stroke-width="20"/>
    <line x1="1060" y1="780" x2="1060" y2="920" stroke="#663a1a" stroke-width="20"/>
    <line x1="1090" y1="780" x2="1090" y2="920" stroke="#78441f" stroke-width="20"/>
    <line x1="1120" y1="780" x2="1120" y2="920" stroke="#5d3417" stroke-width="20"/>
    <line x1="1150" y1="780" x2="1150" y2="920" stroke="#78441f" stroke-width="20"/>
    <line x1="1180" y1="780" x2="1180" y2="920" stroke="#663a1a" stroke-width="20"/>
    <!-- Guardrails -->
    <rect x="875" y="775" width="350" height="12" rx="3" fill="#2b180a" stroke="#170c05" stroke-width="2"/>
    <rect x="875" y="913" width="350" height="12" rx="3" fill="#2b180a" stroke="#170c05" stroke-width="2"/>
  </g>

  <!-- Adventurer Campsite (North West clearing) -->
  <g>
    <!-- Campfire Stones & Fire -->
    <circle cx="480" cy="450" r="140" fill="url(#campGlow)" pointer-events="none"/>
    <circle cx="480" cy="450" r="30" fill="#1c1917" stroke="#44403c" stroke-width="6"/>
    <!-- Stone circle around fire -->
    <circle cx="455" cy="450" r="7" fill="#78716c"/>
    <circle cx="465" cy="430" r="6" fill="#a8a29e"/>
    <circle cx="495" cy="430" r="8" fill="#78716c"/>
    <circle cx="505" cy="450" r="7" fill="#a8a29e"/>
    <circle cx="495" cy="470" r="7" fill="#78716c"/>
    <circle cx="465" cy="470" r="8" fill="#a8a29e"/>
    <!-- Flames -->
    <polygon points="480,432 490,455 470,455" fill="#f59e0b"/>
    <polygon points="480,436 486,450 474,450" fill="#ef4444"/>

    <!-- Log Benches -->
    <rect x="420" y="380" width="120" height="25" rx="10" fill="#543310" stroke="#361f06" stroke-width="3" transform="rotate(-15, 480, 390)"/>
    <rect x="410" y="490" width="130" height="25" rx="10" fill="#543310" stroke="#361f06" stroke-width="3" transform="rotate(20, 470, 500)"/>

    <!-- Canvas Tents -->
    <polygon points="320,320 370,420 270,420" fill="#d97706" stroke="#92400e" stroke-width="3" filter="url(#foliageShadow)"/>
    <polygon points="260,460 310,560 210,560" fill="#0284c7" stroke="#0369a1" stroke-width="3" filter="url(#foliageShadow)"/>
  </g>

  <!-- Trees / Forest Canopy with Shadows -->
  <!-- Tree Clump North-East -->
  <g filter="url(#foliageShadow)">
    <circle cx="1600" cy="220" r="90" fill="#1b4332"/>
    <circle cx="1580" cy="200" r="75" fill="#2d6a4f"/>
    <circle cx="1720" cy="280" r="100" fill="#1b4332"/>
    <circle cx="1700" cy="260" r="85" fill="#40916c"/>
    <circle cx="1820" cy="180" r="85" fill="#1b4332"/>
    <circle cx="1800" cy="160" r="70" fill="#2d6a4f"/>
  </g>

  <!-- Tree Clump South-East -->
  <g filter="url(#foliageShadow)">
    <circle cx="1650" cy="1150" r="110" fill="#1b4332"/>
    <circle cx="1630" cy="1130" r="95" fill="#2d6a4f"/>
    <circle cx="1780" cy="1250" r="120" fill="#1b4332"/>
    <circle cx="1760" cy="1230" r="105" fill="#40916c"/>
    <circle cx="1550" cy="1300" r="95" fill="#1b4332"/>
    <circle cx="1530" cy="1280" r="80" fill="#2d6a4f"/>
  </g>

  <!-- Tree Clump South-West -->
  <g filter="url(#foliageShadow)">
    <circle cx="280" cy="1200" r="115" fill="#1b4332"/>
    <circle cx="260" cy="1180" r="100" fill="#2d6a4f"/>
    <circle cx="420" cy="1300" r="100" fill="#1b4332"/>
    <circle cx="400" cy="1280" r="85" fill="#40916c"/>
    <circle cx="180" cy="1350" r="90" fill="#1b4332"/>
    <circle cx="160" cy="1330" r="75" fill="#2d6a4f"/>
  </g>

  <!-- Giant Ancient Oak (Center North) -->
  <g filter="url(#foliageShadow)">
    <circle cx="800" cy="200" r="130" fill="#143627"/>
    <circle cx="780" cy="180" r="110" fill="#24583f"/>
    <circle cx="760" cy="160" r="85" fill="#387a59"/>
  </g>

  <!-- Sunlight Shimmer Overlay -->
  <rect width="2000" height="1500" fill="url(#sunlight)" pointer-events="none"/>
</svg>'''
    (MAPS_DIR / "forest_river.svg").write_text(svg, encoding="utf-8")
    print("Created forest_river.svg")

def generate_tavern_cellar():
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 1500" width="2000" height="1500">
  <defs>
    <!-- Warm Lantern Gradients -->
    <radialGradient id="lanternWarm" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fde047" stop-opacity="0.9"/>
      <stop offset="30%" stop-color="#f59e0b" stop-opacity="0.5"/>
      <stop offset="70%" stop-color="#b45309" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <pattern id="woodPlanks" width="120" height="40" patternUnits="userSpaceOnUse">
      <rect width="120" height="40" fill="#2c1a0e"/>
      <rect x="1" y="1" width="118" height="18" fill="#3d2414" stroke="#1d1007" stroke-width="2"/>
      <rect x="61" y="21" width="58" height="18" fill="#361f10" stroke="#1d1007" stroke-width="2"/>
      <rect x="1" y="21" width="58" height="18" fill="#422716" stroke="#1d1007" stroke-width="2"/>
    </pattern>
    <pattern id="brickWall" width="60" height="30" patternUnits="userSpaceOnUse">
      <rect width="60" height="30" fill="#14110e"/>
      <rect x="2" y="2" width="56" height="12" fill="#2d221a" stroke="#0d0b09" stroke-width="2"/>
      <rect x="2" y="16" width="26" height="12" fill="#271d16" stroke="#0d0b09" stroke-width="2"/>
      <rect x="32" y="16" width="26" height="12" fill="#2a1f17" stroke="#0d0b09" stroke-width="2"/>
    </pattern>
    <filter id="caskShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="8" dy="12" stdDeviation="6" flood-color="#050302" flood-opacity="0.85"/>
    </filter>
  </defs>

  <!-- Outside Basement Earth -->
  <rect width="2000" height="1500" fill="#0f0c09"/>

  <!-- Cellar Floor -->
  <rect x="180" y="150" width="1640" height="1200" fill="url(#woodPlanks)"/>

  <!-- Thick Dungeon Brick Walls -->
  <rect x="140" y="110" width="1720" height="1280" fill="none" stroke="url(#brickWall)" stroke-width="70"/>

  <!-- Stone Staircase leading up to Taproom (North Center) -->
  <g filter="url(#caskShadow)">
    <rect x="850" y="140" width="300" height="180" fill="#333742" stroke="#1e222a" stroke-width="4"/>
    <!-- Steps -->
    <rect x="850" y="140" width="300" height="30" fill="#474d5c" stroke="#1e222a" stroke-width="2"/>
    <rect x="850" y="170" width="300" height="30" fill="#3f4552" stroke="#1e222a" stroke-width="2"/>
    <rect x="850" y="200" width="300" height="30" fill="#373d49" stroke="#1e222a" stroke-width="2"/>
    <rect x="850" y="230" width="300" height="30" fill="#303540" stroke="#1e222a" stroke-width="2"/>
    <rect x="850" y="260" width="300" height="30" fill="#282d37" stroke="#1e222a" stroke-width="2"/>
    <rect x="850" y="290" width="300" height="30" fill="#22262e" stroke="#1e222a" stroke-width="2"/>
    <text x="1000" y="220" font-family="sans-serif" font-weight="bold" font-size="16" fill="#94a3b8" text-anchor="middle">▲ UP TO TAPROOM ▲</text>
  </g>

  <!-- Massive Oak Beer & Wine Casks (West Wall) -->
  <g filter="url(#caskShadow)">
    <!-- Cask 1 -->
    <ellipse cx="280" cy="350" rx="70" ry="50" fill="#5c381e" stroke="#2e1a0b" stroke-width="4"/>
    <ellipse cx="280" cy="350" rx="55" ry="38" fill="none" stroke="#92400e" stroke-width="4"/>
    <ellipse cx="280" cy="350" rx="35" ry="24" fill="none" stroke="#2e1a0b" stroke-width="3"/>

    <!-- Cask 2 -->
    <ellipse cx="280" cy="500" rx="70" ry="50" fill="#5c381e" stroke="#2e1a0b" stroke-width="4"/>
    <ellipse cx="280" cy="500" rx="55" ry="38" fill="none" stroke="#92400e" stroke-width="4"/>

    <!-- Cask 3 -->
    <ellipse cx="280" cy="650" rx="70" ry="50" fill="#5c381e" stroke="#2e1a0b" stroke-width="4"/>
    <ellipse cx="280" cy="650" rx="55" ry="38" fill="none" stroke="#92400e" stroke-width="4"/>

    <!-- Cask 4 -->
    <ellipse cx="280" cy="800" rx="70" ry="50" fill="#5c381e" stroke="#2e1a0b" stroke-width="4"/>
    <ellipse cx="280" cy="800" rx="55" ry="38" fill="none" stroke="#92400e" stroke-width="4"/>

    <!-- Cask 5 -->
    <ellipse cx="280" cy="950" rx="70" ry="50" fill="#5c381e" stroke="#2e1a0b" stroke-width="4"/>
    <ellipse cx="280" cy="950" rx="55" ry="38" fill="none" stroke="#92400e" stroke-width="4"/>
  </g>

  <!-- Crates and Burlap Sacks Stash (East Wall) -->
  <g filter="url(#caskShadow)">
    <!-- Crates Group -->
    <rect x="1600" y="320" width="100" height="90" fill="#6c4424" stroke="#36200f" stroke-width="3"/>
    <line x1="1600" y1="320" x2="1700" y2="410" stroke="#36200f" stroke-width="2"/>
    <line x1="1600" y1="410" x2="1700" y2="320" stroke="#36200f" stroke-width="2"/>

    <rect x="1620" y="430" width="80" height="80" fill="#784c28" stroke="#36200f" stroke-width="3"/>
    <line x1="1620" y1="430" x2="1700" y2="510" stroke="#36200f" stroke-width="2"/>
    
    <rect x="1590" y="530" width="110" height="100" fill="#5e3a1e" stroke="#36200f" stroke-width="3"/>
    <line x1="1590" y1="530" x2="1700" y2="630" stroke="#36200f" stroke-width="2"/>

    <!-- Grain Sacks -->
    <ellipse cx="1640" cy="680" rx="40" ry="30" fill="#a16207" stroke="#713f12" stroke-width="3"/>
    <ellipse cx="1670" cy="730" rx="35" ry="25" fill="#ca8a04" stroke="#713f12" stroke-width="3"/>
    <ellipse cx="1630" cy="760" rx="38" ry="28" fill="#a16207" stroke="#713f12" stroke-width="3"/>

    <!-- More Crates South East -->
    <rect x="1600" y="900" width="90" height="90" fill="#6c4424" stroke="#36200f" stroke-width="3"/>
    <rect x="1590" y="1010" width="110" height="100" fill="#5e3a1e" stroke="#36200f" stroke-width="3"/>
  </g>

  <!-- Heavy Support Timber Pillars -->
  <g filter="url(#caskShadow)">
    <rect x="650" y="550" width="80" height="80" rx="8" fill="#452713" stroke="#241307" stroke-width="4"/>
    <rect x="665" y="565" width="50" height="50" fill="#2d190b"/>

    <rect x="1270" y="550" width="80" height="80" rx="8" fill="#452713" stroke="#241307" stroke-width="4"/>
    <rect x="1285" y="565" width="50" height="50" fill="#2d190b"/>

    <rect x="650" y="950" width="80" height="80" rx="8" fill="#452713" stroke="#241307" stroke-width="4"/>
    <rect x="665" y="965" width="50" height="50" fill="#2d190b"/>

    <rect x="1270" y="950" width="80" height="80" rx="8" fill="#452713" stroke="#241307" stroke-width="4"/>
    <rect x="1285" y="965" width="50" height="50" fill="#2d190b"/>
  </g>

  <!-- Secret Smuggler Trapdoor (South West Corner) -->
  <g filter="url(#caskShadow)">
    <rect x="350" y="1120" width="130" height="130" fill="#1e293b" stroke="#0f172a" stroke-width="4" rx="4"/>
    <!-- Iron Grid Lines -->
    <line x1="375" y1="1120" x2="375" y2="1250" stroke="#475569" stroke-width="4"/>
    <line x1="415" y1="1120" x2="415" y2="1250" stroke="#475569" stroke-width="4"/>
    <line x1="455" y1="1120" x2="455" y2="1250" stroke="#475569" stroke-width="4"/>
    <!-- Pull Ring -->
    <circle cx="415" cy="1185" r="14" fill="none" stroke="#94a3b8" stroke-width="4"/>
    <circle cx="415" cy="1185" r="6" fill="#64748b"/>
  </g>

  <!-- Warm Oil Lanterns Glow -->
  <!-- Lantern 1 (North Entrance) -->
  <circle cx="820" cy="220" r="180" fill="url(#lanternWarm)" pointer-events="none"/>
  <circle cx="820" cy="220" r="12" fill="#fbbf24" stroke="#92400e" stroke-width="3"/>

  <!-- Lantern 2 (Center West) -->
  <circle cx="450" cy="720" r="220" fill="url(#lanternWarm)" pointer-events="none"/>
  <circle cx="450" cy="720" r="14" fill="#fbbf24" stroke="#92400e" stroke-width="3"/>

  <!-- Lantern 3 (Center East) -->
  <circle cx="1500" cy="720" r="220" fill="url(#lanternWarm)" pointer-events="none"/>
  <circle cx="1500" cy="720" r="14" fill="#fbbf24" stroke="#92400e" stroke-width="3"/>

  <!-- Lantern 4 (South Center) -->
  <circle cx="1000" cy="1200" r="240" fill="url(#lanternWarm)" pointer-events="none"/>
  <circle cx="1000" cy="1200" r="14" fill="#fbbf24" stroke="#92400e" stroke-width="3"/>
</svg>'''
    (MAPS_DIR / "tavern_cellar.svg").write_text(svg, encoding="utf-8")
    print("Created tavern_cellar.svg")

if __name__ == "__main__":
    generate_dungeon_crypt()
    generate_forest_river()
    generate_tavern_cellar()
