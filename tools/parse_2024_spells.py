import re
import json
from pathlib import Path

SCHOOLS = [
    'Abjuration', 'Conjuration', 'Divination', 'Enchantment',
    'Evocation', 'Illusion', 'Necromancy', 'Transmutation'
]

ALL_CLASSES = [
    'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger',
    'Sorcerer', 'Warlock', 'Wizard'
]

def parse_spells():
    with open('spells_full.md', 'r', encoding='utf-8') as f:
        text = f.read()

    pos = text.find('## Spell Descriptions')
    chunk = text[pos:]

    # Match each spell starting with #### Name followed by _Type line_
    spell_pattern = r'^####\s+([^\n]+)\n\n_([^_]+)_\n\n(.*?)(?=\n####\s+[^\n]+\n\n_|\Z)'
    matches = list(re.finditer(spell_pattern, chunk, re.MULTILINE | re.DOTALL))
    print(f"Found {len(matches)} spell definitions.")

    spells = []
    seen_ids = set()

    for m in matches:
        raw_name = m.group(1).strip()
        type_line = m.group(2).strip()
        body = m.group(3).strip()

        # ID
        base_id = re.sub(r'[^a-z0-9]+', '-', raw_name.lower()).strip('-')
        spell_id = base_id
        suffix = 2
        while spell_id in seen_ids:
            spell_id = f"{base_id}-{suffix}"
            suffix += 1
        seen_ids.add(spell_id)

        # Level
        level = 0
        lvl_m = re.search(r'Level\s*(\d+)', type_line, re.IGNORECASE)
        if lvl_m:
            level = int(lvl_m.group(1))

        # School
        school = 'Universal'
        for s in SCHOOLS:
            if s.lower() in type_line.lower():
                school = s
                break

        # Ritual
        ritual = 'ritual' in type_line.lower()

        # Classes
        classes = []
        for c in ALL_CLASSES:
            if c.lower() in type_line.lower():
                classes.append(c)

        # Header fields
        ct_m = re.search(r'\*\*Casting Time:\*\*\s*([^\n]+)', body)
        casting_time = ct_m.group(1).strip() if ct_m else 'Action'

        rng_m = re.search(r'\*\*Range:\*\*\s*([^\n]+)', body)
        spell_range = rng_m.group(1).strip() if rng_m else 'Self'

        comp_m = re.search(r'\*\*Components:\*\*\s*([^\n]+)', body)
        components = comp_m.group(1).strip() if comp_m else 'V, S'

        dur_m = re.search(r'\*\*Duration:\*\*\s*([^\n]+)', body)
        duration = dur_m.group(1).strip() if dur_m else 'Instantaneous'

        concentration = 'concentration' in duration.lower()

        # Description: slice after **Duration:**
        desc_start = dur_m.end() if dur_m else 0
        raw_desc = body[desc_start:].strip()

        # Extract higher level upgrade if present
        higher_levels = ""
        upg_m = re.search(r'_(?:Using a Higher-Level Spell Slot|Cantrip Upgrade)\._\s*(.*)', raw_desc, re.DOTALL)
        if upg_m:
            higher_levels = upg_m.group(1).strip()
            raw_desc = raw_desc[:upg_m.start()].strip()

        spells.append({
            'id': spell_id,
            'name': raw_name,
            'level': level,
            'school': school,
            'classes': classes,
            'ritual': ritual,
            'castingTime': casting_time,
            'range': spell_range,
            'components': components,
            'duration': duration,
            'concentration': concentration,
            'description': raw_desc,
            'higherLevels': higher_levels
        })

    # Sort alphabetically by name
    spells.sort(key=lambda s: s['name'].lower())

    with open('data/spells.json', 'w', encoding='utf-8') as f:
        json.dump(spells, f, indent=2, ensure_ascii=False)

    print(f"Successfully generated data/spells.json with {len(spells)} spells!")

if __name__ == '__main__':
    parse_spells()
