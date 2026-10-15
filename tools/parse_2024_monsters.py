import re
import json
import os
from pathlib import Path

def get_matching_image(monster_id, name, creature_type):
    # 1. Exact match in static/images/monsters/
    exact_path = Path(f"static/images/monsters/{monster_id}.webp")
    if exact_path.exists():
        return f"/static/images/monsters/{monster_id}.webp"

    name_lower = name.lower()
    type_lower = creature_type.lower()

    # 2. Known aliases and monster families
    if "dragon" in name_lower:
        return "/static/images/monsters/young-green-dragon.webp"
    if "skeleton" in name_lower:
        return "/static/images/monsters/skeleton.webp"
    if "zombie" in name_lower:
        return "/static/images/monsters/zombie.webp"
    if "wolf" in name_lower:
        return "/static/images/monsters/wolf.webp"
    if "bandit" in name_lower:
        return "/static/images/monsters/bandit.webp"
    if "cultist" in name_lower or "fanatic" in name_lower:
        return "/static/images/monsters/cult-fanatic.webp"
    if "mage" in name_lower or "wizard" in name_lower or "archmage" in name_lower:
        return "/static/images/monsters/mage.webp"
    if "guard" in name_lower or "soldier" in name_lower:
        return "/static/images/monsters/guard.webp"
    if "thug" in name_lower or "ruffian" in name_lower:
        return "/static/images/monsters/thug.webp"
    if "veteran" in name_lower or "warrior" in name_lower or "gladiator" in name_lower:
        return "/static/images/monsters/veteran.webp"
    if "ghoul" in name_lower or "ghast" in name_lower:
        return "/static/images/monsters/ghoul.webp"
    if "wraith" in name_lower or "specter" in name_lower or "ghost" in name_lower or "shadow" in name_lower:
        return "/static/images/monsters/wraith.webp"

    # 3. NPC portrait matches for humanoids
    if "assassin" in name_lower or "spy" in name_lower:
        return "/static/images/npcs/assassin.webp"
    if "berserker" in name_lower or "barbarian" in name_lower:
        return "/static/images/npcs/berserker.webp"
    if "priest" in name_lower or "acolyte" in name_lower:
        return "/static/images/npcs/priest.webp"
    if "druid" in name_lower:
        return "/static/images/npcs/druid.webp"
    if "knight" in name_lower:
        return "/static/images/npcs/knight.webp"
    if "noble" in name_lower:
        return "/static/images/npcs/noble.webp"
    if "commoner" in name_lower:
        return "/static/images/npcs/commoner.webp"

    # 4. Creature-type archetypes
    if "undead" in type_lower:
        return "/static/images/monsters/skeleton.webp"
    if "beast" in type_lower:
        return "/static/images/monsters/wolf.webp"
    if "humanoid" in type_lower:
        return "/static/images/monsters/guard.webp"
    if "fiend" in type_lower:
        return "/static/images/monsters/wraith.webp"
    if "monstrosity" in type_lower:
        return "/static/images/monsters/owlbear.webp"
    if "giant" in type_lower:
        return "/static/images/monsters/troll.webp"
    if "aberration" in type_lower:
        return "/static/images/monsters/mimic.webp"

    # Fallback
    return "/static/images/monsters/goblin.webp"


def parse_all_2024_monsters():
    with open('monsters_full.md', 'r', encoding='utf-8') as f:
        m_text = f.read()
    with open('animals_full.md', 'r', encoding='utf-8') as f:
        a_text = f.read()

    pattern = r'^(##|###)\s+([^\n#]+)\n\n_([^_]+)_\n\n\*\*AC\*\*\s*(\d+)'

    all_monsters = []
    seen_ids = set()

    files = [
        ('monsters_full.md', m_text),
        ('animals_full.md', a_text)
    ]

    for fp, content in files:
        matches = list(re.finditer(pattern, content, re.MULTILINE))
        for i, match in enumerate(matches):
            start = match.start()
            end = matches[i+1].start() if i+1 < len(matches) else len(content)
            chunk = content[start:end]

            raw_name = match.group(2).strip()
            type_line = match.group(3).strip()
            ac = int(match.group(4))

            # ID
            base_id = re.sub(r'[^a-z0-9]+', '-', raw_name.lower()).strip('-')
            monster_id = base_id
            suffix = 2
            while monster_id in seen_ids:
                monster_id = f"{base_id}-{suffix}"
                suffix += 1
            seen_ids.add(monster_id)

            # Size, Type, Alignment
            if ',' in type_line:
                st_part, align_part = type_line.split(',', 1)
                alignment = align_part.strip()
            else:
                st_part = type_line
                alignment = 'Unaligned'

            sizes = ['Medium or Small', 'Small or Medium', 'Gargantuan', 'Huge', 'Large', 'Medium', 'Small', 'Tiny']
            size = 'Medium'
            creature_type = st_part.strip()
            for s in sizes:
                if st_part.startswith(s):
                    size = s
                    creature_type = st_part[len(s):].strip()
                    break

            # HP & Hit Dice
            hp_m = re.search(r'\*\*HP\*\*\s*(\d+)\s*(?:\(([^)]+)\))?', chunk)
            hp = int(hp_m.group(1)) if hp_m else 10
            hit_dice = hp_m.group(2) if hp_m and hp_m.group(2) else ''

            # Speed
            speed_m = re.search(r'\*\*Speed\*\*\s*([^\n<]+)', chunk)
            speed = speed_m.group(1).strip() if speed_m else '30 ft.'

            # Stats & Saves
            tbody = re.search(r'<tbody>(.*?)</tbody>', chunk, re.DOTALL)
            stats = {'str': 10, 'dex': 10, 'con': 10, 'int': 10, 'wis': 10, 'cha': 10}
            saves_list = []
            if tbody:
                rows = re.findall(r'<tr>(.*?)</tr>', tbody.group(1), re.DOTALL)
                for row in rows:
                    tds = [re.sub(r'<[^>]+>', '', td).strip() for td in re.findall(r'<td>(.*?)</td>', row, re.DOTALL)]
                    idx = 0
                    while idx < len(tds):
                        val = tds[idx].upper()
                        if val in ('STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'):
                            s_name = val.lower()
                            score_str = tds[idx+1] if idx+1 < len(tds) else '10'
                            score_m = re.search(r'\b(\d+)\b', score_str)
                            score = int(score_m.group(1)) if score_m else 1
                            stats[s_name] = score

                            save_str = tds[idx+3] if idx+3 < len(tds) else ''
                            save_m = re.search(r'([+\-−]\d+)', save_str)
                            if save_m:
                                s_val = save_m.group(1).replace('−', '-')
                                std_mod = (score - 10) // 2
                                std_str = f'+{std_mod}' if std_mod >= 0 else str(std_mod)
                                if s_val != std_str:
                                    saves_list.append(f"{s_name.title()} {s_val}")
                            idx += 4
                        else:
                            idx += 1

            if raw_name == "Will-o'-Wisp":
                stats['str'] = 1
            elif raw_name == 'Ancient Red Dragon':
                stats = {'str': 30, 'dex': 10, 'con': 29, 'int': 18, 'wis': 15, 'cha': 27}
                saves_list = ['Dex +7', 'Wis +9', 'Cha +15']
            elif raw_name == 'Remorhaz':
                stats = {'str': 24, 'dex': 13, 'con': 21, 'int': 4, 'wis': 10, 'cha': 5}

            # Optional info
            skills_m = re.search(r'\*\*Skills\*\*\s*([^\n<]+)', chunk)
            skills = skills_m.group(1).strip() if skills_m else ''

            vuln_m = re.search(r'\*\*(?:Damage )?Vulnerabilities\*\*\s*([^\n<]+)', chunk)
            vuln = vuln_m.group(1).strip() if vuln_m else ''

            res_m = re.search(r'\*\*(?:Damage )?Resistances\*\*\s*([^\n<]+)', chunk)
            res = res_m.group(1).strip() if res_m else ''

            imm_m = re.search(r'\*\*(?:Damage )?Immunities\*\*\s*([^\n<]+)', chunk)
            cond_imm_m = re.search(r'\*\*Condition Immunities\*\*\s*([^\n<]+)', chunk)
            imm_parts = []
            if imm_m: imm_parts.append(imm_m.group(1).strip())
            if cond_imm_m: imm_parts.append('Conditions: ' + cond_imm_m.group(1).strip())
            immunities = '; '.join(imm_parts)

            senses_m = re.search(r'\*\*Senses\*\*\s*([^\n<]+)', chunk)
            senses = senses_m.group(1).strip() if senses_m else 'Passive Perception 10'

            lang_m = re.search(r'\*\*Languages\*\*\s*([^\n<]+)', chunk)
            languages = lang_m.group(1).strip() if lang_m else '—'

            cr_m = re.search(r'\*\*CR\*\*\s*([0-9/]+)(?:\s*\(XP\s*([0-9,]+))?', chunk)
            cr = cr_m.group(1) if cr_m else '0'
            xp = int(cr_m.group(2).replace(',', '')) if cr_m and cr_m.group(2) else 10

            # Sections
            traits = []
            actions = []
            bonus_actions = []
            reactions = []
            legendary_actions = []

            sec_splits = re.split(r'^(?:###|####)\s+(Traits|Actions|Bonus Actions|Reactions|Legendary Actions)\s*\n', chunk, flags=re.MULTILINE)
            for s_idx in range(1, len(sec_splits), 2):
                s_name = sec_splits[s_idx].strip()
                s_body = sec_splits[s_idx+1]
                s_body = re.sub(r'<hr\s*/?>', '', s_body)

                item_matches = list(re.finditer(r'\*\*_(.*?)_\*\*\s*(.*?)(?=\n\s*\*\*_(?:.*?)_\*\*|\Z)', s_body, re.DOTALL))
                items = []
                for im in item_matches:
                    it_title = re.sub(r'[\.\s]+$', '', im.group(1).strip())
                    it_desc = im.group(2).strip().replace('<br>', '\n').replace('&emsp;', '  ')
                    it_desc = re.sub(r'<[^>]+>', '', it_desc).strip()
                    it_desc = re.sub(r'_([^_]+)_', r'\1', it_desc)
                    if it_title and it_desc:
                        items.append({'name': it_title, 'desc': it_desc})

                if not items:
                    item_matches2 = list(re.finditer(r'\*\*(.*?)\.\*\*\s*(.*?)(?=\n\s*\*\*.*?\.\*\*|\Z)', s_body, re.DOTALL))
                    for im in item_matches2:
                        it_title = re.sub(r'[\.\s]+$', '', im.group(1).strip())
                        it_desc = im.group(2).strip().replace('<br>', '\n').replace('&emsp;', '  ')
                        it_desc = re.sub(r'<[^>]+>', '', it_desc).strip()
                        it_desc = re.sub(r'_([^_]+)_', r'\1', it_desc)
                        if it_title and it_desc:
                            items.append({'name': it_title, 'desc': it_desc})

                if s_name == 'Traits':
                    traits.extend(items)
                elif s_name == 'Actions':
                    actions.extend(items)
                elif s_name == 'Bonus Actions':
                    bonus_actions.extend(items)
                elif s_name == 'Reactions':
                    reactions.extend(items)
                elif s_name == 'Legendary Actions':
                    legendary_actions.extend(items)

            image_url = get_matching_image(monster_id, raw_name, creature_type)

            monster_obj = {
                'id': monster_id,
                'name': raw_name,
                'size': size,
                'type': creature_type,
                'alignment': alignment,
                'cr': cr,
                'xp': xp,
                'ac': ac,
                'hp': hp,
                'hitDice': hit_dice,
                'speed': speed,
                'stats': stats,
                'skills': skills,
                'senses': senses,
                'languages': languages,
                'traits': traits,
                'actions': actions,
                'imageUrl': image_url
            }
            if saves_list: monster_obj['saves'] = ', '.join(saves_list)
            if vuln: monster_obj['vulnerabilities'] = vuln
            if res: monster_obj['resistances'] = res
            if immunities: monster_obj['immunities'] = immunities
            if bonus_actions: monster_obj['bonusActions'] = bonus_actions
            if reactions: monster_obj['reactions'] = reactions
            if legendary_actions: monster_obj['legendaryActions'] = legendary_actions

            all_monsters.append(monster_obj)

    # Sort alphabetically by name
    all_monsters.sort(key=lambda m: m['name'].lower())
    return all_monsters

if __name__ == '__main__':
    monsters = parse_all_2024_monsters()
    print(f"Parsed {len(monsters)} official 2024 monsters!")
    with open('data/monsters.json', 'w', encoding='utf-8') as f:
        json.dump(monsters, f, indent=2, ensure_ascii=False)
    print("Successfully wrote data/monsters.json!")
