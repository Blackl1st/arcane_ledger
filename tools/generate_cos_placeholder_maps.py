"""
Generate sleek gothic tactical placeholder SVGs for all Curse of Strahd battlemap slots.
"""
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import cos_module_pack

STATIC_DIR = Path("static/images/battlemaps/cos")
STATIC_DIR.mkdir(parents=True, exist_ok=True)

def generate_svg(bm):
    map_id = bm["id"]
    name = bm["name"]
    chapter = bm.get("chapter", "Curse of Strahd")
    notes = bm.get("notes", "")
    theme = bm.get("theme", "dungeon")
    grid_size = bm.get("defaultGridSize", 70)
    
    # SVG color scheme based on theme
    accent_color = "#e0a96d"
    border_color = "#881337"
    if theme == "forest":
        accent_color = "#86efac"
        border_color = "#14532d"
    elif theme == "tavern":
        accent_color = "#fcd34d"
        border_color = "#78350f"
    elif theme == "sanctum":
        accent_color = "#93c5fd"
        border_color = "#1e3a8a"
    elif theme == "swamp":
        accent_color = "#a3e635"
        border_color = "#365314"

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3840 2160" width="3840" height="2160">
  <defs>
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#151d28" />
      <stop offset="70%" stop-color="#0c1219" />
      <stop offset="100%" stop-color="#05080c" />
    </radialGradient>
    <pattern id="grid" width="{grid_size}" height="{grid_size}" patternUnits="userSpaceOnUse">
      <path d="M {grid_size} 0 L 0 0 0 {grid_size}" fill="none" stroke="{accent_color}" stroke-width="1.2" stroke-opacity="0.18" />
    </pattern>
  </defs>

  <rect width="3840" height="2160" fill="url(#vignette)" />
  <rect width="3840" height="2160" fill="url(#grid)" />

  <!-- Outer Ornate Border -->
  <rect x="60" y="60" width="3720" height="2040" fill="none" stroke="{accent_color}" stroke-width="3" stroke-opacity="0.35" />
  <rect x="80" y="80" width="3680" height="2000" fill="none" stroke="{border_color}" stroke-width="2" stroke-opacity="0.6" />

  <!-- Central Schematic HUD Box -->
  <g transform="translate(1920, 1080)" text-anchor="middle">
    <rect x="-700" y="-280" width="1400" height="560" rx="24" fill="#090d13" stroke="{border_color}" stroke-width="3" opacity="0.94" filter="drop-shadow(0 20px 40px rgba(0,0,0,0.8))" />
    
    <text y="-180" font-family="Georgia, serif" font-size="28" font-weight="bold" fill="{accent_color}" letter-spacing="6">CURSE OF STRAHD • TACTICAL BATTLEMAP SLOT</text>
    <text y="-80" font-family="Georgia, serif" font-size="56" font-weight="bold" fill="#ffffff" letter-spacing="2">{name}</text>
    <text y="-10" font-family="sans-serif" font-size="28" font-mono="true" fill="#94a3b8" letter-spacing="3">{chapter} • 5-Foot Tactical Grid ({grid_size}px / square)</text>

    <!-- Divider Line -->
    <line x1="-500" y1="40" x2="500" y2="40" stroke="{accent_color}" stroke-width="1.5" stroke-opacity="0.4" />

    <text y="90" font-family="Georgia, serif" font-size="26" font-style="italic" fill="#cbd5e1">{notes}</text>
    <text y="170" font-family="sans-serif" font-size="22" font-mono="true" fill="{accent_color}">Drop DM Andy 4K JPG or Mike Schley image to deploy instant visual battlemap</text>
    <text y="210" font-family="sans-serif" font-size="18" font-mono="true" fill="#64748b">File target: static/images/battlemaps/cos/{map_id.replace('cos_', '')}.jpg</text>
  </g>
</svg>"""
    return svg

def main():
    maps = cos_module_pack.get_cos_battlemaps()
    count = 0
    for bm in maps:
        filename = bm["url"].split("/")[-1]
        svg_filename = filename.replace(".jpg", ".svg").replace(".png", ".svg")
        target_path = STATIC_DIR / svg_filename
        # Write SVG
        svg_content = generate_svg(bm)
        with open(target_path, "w", encoding="utf-8") as f:
            f.write(svg_content)
        count += 1
    print(f"Generated {count} Curse of Strahd SVG battlemap placeholders in {STATIC_DIR}")

if __name__ == "__main__":
    main()
