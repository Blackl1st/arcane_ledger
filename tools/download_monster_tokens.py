import json
import urllib.parse
import urllib.request
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor

DEST_DIR = Path("static/images/monsters")
DEST_DIR.mkdir(parents=True, exist_ok=True)

SOURCES = ['MM', 'XMM', 'VGM', 'MTF', 'MPMM', 'DMG']

def find_token_url(name):
    candidates = [name]
    for suffix in [' Warrior', ' Minion', ' Boss', ' Sentinel', ' Soldier', ' Captain', ' Apprentice']:
        if name.endswith(suffix):
            candidates.append(name[:-len(suffix)])

    for cand in candidates:
        for src in SOURCES:
            encoded = urllib.parse.quote(cand)
            url = f"https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/master/bestiary/tokens/{src}/{encoded}.webp"
            req = urllib.request.Request(url, method='HEAD')
            try:
                with urllib.request.urlopen(req, timeout=4) as resp:
                    if resp.status == 200:
                        return url
            except Exception:
                pass
    return None

def download_one(monster):
    m_id = monster['id']
    dest = DEST_DIR / f"{m_id}.webp"

    # If already downloaded and size > 1000 bytes, skip re-download
    if dest.exists() and dest.stat().st_size > 1000:
        monster['imageUrl'] = f"/static/images/monsters/{m_id}.webp"
        return m_id, True, "cached"

    url = find_token_url(monster['name'])
    if not url:
        return m_id, False, "no url"

    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = resp.read()
            with open(dest, 'wb') as f:
                f.write(data)
        monster['imageUrl'] = f"/static/images/monsters/{m_id}.webp"
        return m_id, True, "downloaded"
    except Exception as e:
        return m_id, False, str(e)

def main():
    with open('data/monsters.json', 'r', encoding='utf-8') as f:
        monsters = json.load(f)

    print(f"Starting download for {len(monsters)} monsters...")
    with ThreadPoolExecutor(max_workers=24) as ex:
        results = list(ex.map(download_one, monsters))

    success = sum(1 for r in results if r[1])
    failed = [r for r in results if not r[1]]
    print(f"Finished! Success: {success}/{len(monsters)}, Failed: {len(failed)}")

    with open('data/monsters.json', 'w', encoding='utf-8') as f:
        json.dump(monsters, f, indent=2, ensure_ascii=False)
    print("Updated data/monsters.json with local image URLs!")

if __name__ == '__main__':
    main()
