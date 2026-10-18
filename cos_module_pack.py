"""
Curse of Strahd Comprehensive Module Pack for Arcane Ledger
============================================================
Turnkey gothic horror campaign data, pre-loaded with 35 fully-detailed NPCs,
18 chapter encounters with valid monster IDs, 5 authentic Barovian handouts,
12 locations, 5 regional factions, quests, time/weather, and the 54-card Tarokka Deck.
"""

import time
import random
from typing import Dict, Any, List

# =============================================================================
# THE TAROKKA DECK OF FATE (54 CARDS)
# =============================================================================

TAROKKA_COMMON_DECK = [
    # Swords (Warriors / Strength)
    {"id": "swords-1", "name": "The Avenger", "suit": "Swords", "symbol": "🗡️", "clue": "Look for a dragon's resting place, where honor sleeps amidst bone.", "loc": "Argynvostholt (Mausoleum of Vladimir Horngaard)"},
    {"id": "swords-2", "name": "The Paladin", "suit": "Swords", "symbol": "🛡️", "clue": "It lies in a place of sacred sorrow, beneath a broken solar wheel.", "loc": "Abbey of Saint Markovia (Chapel Belfry)"},
    {"id": "swords-3", "name": "The Soldier", "suit": "Swords", "symbol": "⚔️", "clue": "Find the barracks where dead watchmen stand eternal guard.", "loc": "Castle Ravenloft (Guard Barracks, Room K10)"},
    {"id": "swords-4", "name": "The Mercenary", "suit": "Swords", "symbol": "💰", "clue": "Search the lair of wolves whose hunger knows no master.", "loc": "Werewolf Den (Cave Spring Pool)"},
    {"id": "swords-5", "name": "The Myrmidon", "suit": "Swords", "symbol": "🦾", "clue": "Buried in ash where a giant tree claws at empty sky.", "loc": "Yester Hill (Base of the Gulthias Tree)"},
    {"id": "swords-6", "name": "The Berserker", "suit": "Swords", "symbol": "🪓", "clue": "Deep in mountain caves where wild men intone ancient curses.", "loc": "Mount Baratok Foothills (Caves)"},
    {"id": "swords-7", "name": "The Hooded One", "suit": "Swords", "symbol": "🎭", "clue": "A stone tower that stands beside a cold and silent lake.", "loc": "Van Richten's Tower (Third Floor Armor Suit)"},
    {"id": "swords-8", "name": "The Dictator", "suit": "Swords", "symbol": "👑", "clue": "Behind the throne of a madman who smiles while his town burns.", "loc": "Vallaki (Burgomaster's Mansion Secret Library)"},
    {"id": "swords-9", "name": "The Torturer", "suit": "Swords", "symbol": "⛓️", "clue": "In dark iron cages hanging over a pit of screams.", "loc": "Castle Ravenloft (Dungeon Cells, Room K74)"},
    {"id": "swords-10", "name": "The Warrior", "suit": "Swords", "symbol": "⚔️", "clue": "In the tomb of one who gave his life for a king who knew no mercy.", "loc": "Castle Ravenloft (Catacombs, Crypt 14)"},

    # Stars (Wizards / Arcana)
    {"id": "stars-1", "name": "The Transmuter", "suit": "Stars", "symbol": "✨", "clue": "Seek the ruined house of a scholar whose mind broke against the void.", "loc": "Berez (Ruined Manor Cellar)"},
    {"id": "stars-2", "name": "The Diviner", "suit": "Stars", "symbol": "🔮", "clue": "High in the cold pass, guarded by golden statues with empty eyes.", "loc": "The Amber Temple (Statue of the God of Secrets)"},
    {"id": "stars-3", "name": "The Enchanter", "suit": "Stars", "symbol": "🪄", "clue": "Resting beneath the bed of a witch who nurses hatred in a drowning swamp.", "loc": "Berez (Baba Lysaga's Creeping Hut)"},
    {"id": "stars-4", "name": "The Abjurer", "suit": "Stars", "symbol": "🔷", "clue": "Guarded by a silver knight whose vows outlived his flesh.", "loc": "Argynvostholt (Beacon Room)"},
    {"id": "stars-5", "name": "The Elementalist", "suit": "Stars", "symbol": "🔥", "clue": "Near the frozen falls where water turns to knives.", "loc": "Tsolenka Pass (Guard Tower)"},
    {"id": "stars-6", "name": "The Evoker", "suit": "Stars", "symbol": "⚡", "clue": "Under black stone arches where shadows learn to speak your name.", "loc": "Castle Ravenloft (Treasury Vault, Room K41)"},
    {"id": "stars-7", "name": "The Illusionist", "suit": "Stars", "symbol": "🪞", "clue": "In a carnival wagon guarded by a smiling stranger with a secret blade.", "loc": "Vallaki (Rictavio's Carnival Wagon)"},
    {"id": "stars-8", "name": "The Necromancer", "suit": "Stars", "symbol": "💀", "clue": "In the crypt of the dark master's bride, wrapped in rotting lace.", "loc": "Castle Ravenloft (Crypt of Patrina Velikovna)"},
    {"id": "stars-9", "name": "The Conjurer", "suit": "Stars", "symbol": "🌀", "clue": "Hidden in the belly of an iron furnace that burns without fire.", "loc": "The Amber Temple (Lower Vaults)"},
    {"id": "stars-10", "name": "The Wizard", "suit": "Stars", "symbol": "🧙", "clue": "A dusty study where books of dark history await a worthy hand.", "loc": "Castle Ravenloft (Strahd's Study, Room K37)"},

    # Coins (Riches / Rogues)
    {"id": "coins-1", "name": "The Swashbuckler", "suit": "Coins", "symbol": "🗡️", "clue": "Amidst silver barrels in a house that smells of fermentation and raven feathers.", "loc": "The Wizard of Wines (Fermentation Vat 3)"},
    {"id": "coins-2", "name": "The Philanthropist", "suit": "Coins", "symbol": "🪙", "clue": "In the attic of a noble house where shadows whisper of devilry.", "loc": "Vallaki (Wachterhaus Secret Room)"},
    {"id": "coins-3", "name": "The Trader", "suit": "Coins", "symbol": "⚖️", "clue": "In the wooden chest of a toy-maker whose toys bring no laughter.", "loc": "Vallaki (Blinsky's Toy Shop Attic)"},
    {"id": "coins-4", "name": "The Merchant", "suit": "Coins", "symbol": "📜", "clue": "Under the hearth of a village tavern where ravens gather on the rafters.", "loc": "Vallaki (Blue Water Inn Cellar)"},
    {"id": "coins-5", "name": "The Guild Member", "suit": "Coins", "symbol": "🗝️", "clue": "Inside a stone vault locked by three clockwork dials.", "loc": "Castle Ravenloft (Wine Cellar, Room K63)"},
    {"id": "coins-6", "name": "The Beggar", "suit": "Coins", "symbol": "🪵", "clue": "In the hands of a broken effigy on the road to the forgotten abbey.", "loc": "Old Svalich Road (Wayside Shrine of the Morninglord)"},
    {"id": "coins-7", "name": "The Thief", "suit": "Coins", "symbol": "🗝️", "clue": "Tucked behind a tapestry of huntsmen in the castle's highest guest hall.", "loc": "Castle Ravenloft (Guest Room, Room K50)"},
    {"id": "coins-8", "name": "The Tax Collector", "suit": "Coins", "symbol": "💰", "clue": "In a chest of silver that has not clinked in four centuries.", "loc": "Town of Barovia (Burgomaster's Iron Safe)"},
    {"id": "coins-9", "name": "The Miser", "suit": "Coins", "symbol": "💎", "clue": "Inside an alabaster jar buried beneath the monastery garden.", "loc": "Abbey of Saint Markovia (Graveyard)"},
    {"id": "coins-10", "name": "The Rogue", "suit": "Coins", "symbol": "🗡️", "clue": "Hidden within the hollow organ pipes that play the music of the dead.", "loc": "Castle Ravenloft (Audience Hall Organ, Room K25)"},

    # Glyphs (Priests / Spirit)
    {"id": "glyphs-1", "name": "The Monk", "suit": "Glyphs", "symbol": "📿", "clue": "Under the altar of a church where a father weeps for his monstrous son.", "loc": "Village of Barovia (Church Undercroft, Doru's Cell)"},
    {"id": "glyphs-2", "name": "The Missionary", "suit": "Glyphs", "symbol": "📖", "clue": "In the ossuary beneath the church of Saint Andral, among stolen bones.", "loc": "Vallaki (St. Andral's Church Crypt)"},
    {"id": "glyphs-3", "name": "The Healer", "suit": "Glyphs", "symbol": "🌿", "clue": "In the walled garden where mad mongrelfolk sing to the moon.", "loc": "Abbey of Saint Markovia (Asylum Yard)"},
    {"id": "glyphs-4", "name": "The Shepherd", "suit": "Glyphs", "symbol": "🐑", "clue": "Beneath a ring of standing stones where ravens leave gifts of shiny silver.", "loc": "Raven River Stone Circle"},
    {"id": "glyphs-5", "name": "The Druid", "suit": "Glyphs", "symbol": "🌳", "clue": "Hidden in the stone effigy of Strahd erected by mountain wild folk.", "loc": "Yester Hill (Statue Cavity)"},
    {"id": "glyphs-6", "name": "The Anarchist", "suit": "Glyphs", "symbol": "🔥", "clue": "In the grinding stones of a windmill where old bones are baked into pastries.", "loc": "Old Bonegrinder (Third Floor Grinding Gears)"},
    {"id": "glyphs-7", "name": "The Charlatan", "suit": "Glyphs", "symbol": "🎭", "clue": "Inside a wagon adorned with painted moons, wrapped in red velvet.", "loc": "Tser Pool Encampment (Madam Eva's Tent)"},
    {"id": "glyphs-8", "name": "The Bishop", "suit": "Glyphs", "symbol": "⛪", "clue": "High in the chapel where stained glass depicts the dawn of raven wings.", "loc": "Castle Ravenloft (Chapel Pulpit, Room K15)"},
    {"id": "glyphs-9", "name": "The Traitor", "suit": "Glyphs", "symbol": "🐍", "clue": "In the crypt of the betrayer who let the mists into the valley.", "loc": "Castle Ravenloft (Catacombs, Crypt 38)"},
    {"id": "glyphs-10", "name": "The Priest", "suit": "Glyphs", "symbol": "✝️", "clue": "Beneath the stone altar of the morning sun in the lost silver dragon's hold.", "loc": "Argynvostholt (Chapel of the Morninglord)"}
]

TAROKKA_HIGH_DECK = [
    {"id": "high-1", "name": "The Artifact", "symbol": "🏺", "ally": "Sir Godfrey Gwilym (Revenant Knight of Argynvostholt)", "strahd_loc": "Castle Ravenloft (Hall of Bones, Room K67)"},
    {"id": "high-2", "name": "The Beast", "symbol": "🐺", "ally": "Zuleika Toranescu (Werewolf seeking revenge on Kiril)", "strahd_loc": "Castle Ravenloft (Audience Hall, Room K25)"},
    {"id": "high-3", "name": "The Broken One", "symbol": "🥀", "ally": "The Mad Mage of Mount Baratok (Archmage Mordenkainen)", "strahd_loc": "Castle Ravenloft (Strahd's Private Study, Room K37)"},
    {"id": "high-4", "name": "The Darklord", "symbol": "🦇", "ally": "No Ally (You face the darkness alone!)", "strahd_loc": "Castle Ravenloft (Strahd's Tomb, Room K86)"},
    {"id": "high-5", "name": "The Donjon", "symbol": "🏰", "ally": "Ismark Kolyanovich ('Ismark the Lesser', Burgomaster)", "strahd_loc": "Castle Ravenloft (Dungeon Oubliette, Room K74)"},
    {"id": "high-6", "name": "The Seer", "symbol": "👁️", "ally": "Madam Eva (The ancient Vistani seer herself)", "strahd_loc": "Castle Ravenloft (North Tower Peak, Room K60)"},
    {"id": "high-7", "name": "The Ghost", "symbol": "👻", "ally": "Sir Klutz Tripansky (Phantasmal jester knight)", "strahd_loc": "Castle Ravenloft (The Overlook / High Balcony, Room K6)"},
    {"id": "high-8", "name": "The Executioner", "symbol": "🪓", "ally": "Ezmerelda d'Avenir (Master Monster Hunter & Vistani Warrior)", "strahd_loc": "Castle Ravenloft (Chapel Altar, Room K15)"},
    {"id": "high-9", "name": "The Horseman", "symbol": "🐎", "ally": "Kasimir Velikov (Dusk Elf Mage seeking the Amber Temple)", "strahd_loc": "Castle Ravenloft (Catacombs of Sergei, Crypt 85)"},
    {"id": "high-10", "name": "The Innocent", "symbol": "🕊️", "ally": "Ireena Kolyana (Tatyana reincarnated - vengeance in her eyes)", "strahd_loc": "Castle Ravenloft (Tomb of Sergei von Zarovich, Room K85)"},
    {"id": "high-11", "name": "The Marionette", "symbol": "🎭", "ally": "Clovin Belview (Abbey Mongrelfolk Bell-Ringer)", "strahd_loc": "Castle Ravenloft (High Tower Stair, Room K18)"},
    {"id": "high-12", "name": "The Mists", "symbol": "🌫️", "ally": "Arabelle (Enchanted Vistani Child of royal blood)", "strahd_loc": "Castle Ravenloft (Treasury Overlook, Room K40)"},
    {"id": "high-13", "name": "The Raven", "symbol": "🦅", "ally": "Davian Martikov (Elder Wereraven & Wizard of Wines Patriarch)", "strahd_loc": "Castle Ravenloft (Tower of Raven Wings, Room K54)"},
    {"id": "high-14", "name": "The Tempter", "symbol": "🍷", "ally": "Dr. Rudolph van Richten ('Rictavio', Legendary Hunter)", "strahd_loc": "Castle Ravenloft (The Great Dining Hall of Guests, Room K10)"}
]

def draw_tarokka_reading() -> Dict[str, Any]:
    """Generates an authentic 5-card cross Tarokka reading."""
    common_shuffled = list(TAROKKA_COMMON_DECK)
    random.shuffle(common_shuffled)

    high_shuffled = list(TAROKKA_HIGH_DECK)
    random.shuffle(high_shuffled)

    card1 = common_shuffled.pop()
    card2 = common_shuffled.pop()
    card3 = common_shuffled.pop()
    card4 = high_shuffled.pop()
    card5 = high_shuffled.pop()

    return {
        "timestamp": time.time(),
        "broadcasted": False,
        "isDelivered": False,
        "tome": {
            "card": card1["name"],
            "suit": card1["suit"],
            "symbol": card1["symbol"],
            "clue": card1["clue"],
            "location": card1["loc"]
        },
        "holySymbol": {
            "card": card2["name"],
            "suit": card2["suit"],
            "symbol": card2["symbol"],
            "clue": card2["clue"],
            "location": card2["loc"]
        },
        "sunsword": {
            "card": card3["name"],
            "suit": card3["suit"],
            "symbol": card3["symbol"],
            "clue": card3["clue"],
            "location": card3["loc"]
        },
        "enemy": {
            "card": card4["name"],
            "symbol": card4["symbol"],
            "ally": card4["ally"]
        },
        "location": {
            "card": card5["name"],
            "symbol": card5["symbol"],
            "location": card5["strahd_loc"]
        }
    }

NPCS = [
    {
        "id": "npc-strahd",
        "name": "Count Strahd von Zarovich",
        "epithet": "Lord of Castle Ravenloft & Darklord of Barovia",
        "species": "Vampire / Undead",
        "role": "Master & Tyrant of Barovia",
        "category": "Villains",
        "voice": "Aristocratic, silky velveteen, cultured, deeply predatory. Speaks in calm, measured cadence.",
        "appearance": "Tall, gaunt, aristocratic nobleman with pale skin, intense piercing dark eyes, high cheekbones, jet-black hair slicked back, wearing an elaborate high-collared red and black cape lined with gold satin and noble armor.",
        "personality": "Unfathomably arrogant, patient, calculating. Views the people of Barovia as cattle and the party as playthings. Beneath the polite aristocrat lies volcanic wrath.",
        "backstory": "Centuries ago, Strahd was a conqueror prince who made a pact with the Dark Powers of the Amber Temple to become immortal and win the love of Tatyana. Instead, it led to the slaughter of his brother Sergei, Tatyana's suicide, and the entrapment of Barovia in the Shadowfell.",
        "secret": "Obsessed with claiming Ireena Kolyana (reincarnation of Tatyana). His Heart of Sorrow in the castle tower absorbs the first 50 damage dealt to him.",
        "faction": "Barovian Aristocracy",
        "location": "Castle Ravenloft",
        "loot": "Ring of Protection, silver signet ring with Zarovich seal, key to Castle Ravenloft treasury, cloak of the bat.",
        "statName": "Vampire (Spellcaster)",
        "statAcHp": "AC 16 • 144 HP",
        "statDetails": "Speed 30 ft, Climb 30 ft • CR 15 (13,000 XP) • STR 18 (+4), DEX 18 (+4), CON 18 (+4), INT 20 (+5), WIS 15 (+2), CHA 18 (+4) • Saves: Dex +9, Wis +7, Cha +9 • Spell DC 18",
        "cr": "15",
        "ac": 16,
        "hp": 144,
        "speed": "30 ft, Climb 30 ft",
        "stats": {"str": 18, "dex": 18, "con": 18, "int": 20, "wis": 15, "cha": 18},
        "alignment": "Lawful Evil",
        "traits": [
            {"name": "Misty Escape", "desc": "When dropped to 0 HP outside his coffin, Strahd transforms into mist and retreats to his tomb in Ravenloft."},
            {"name": "Regeneration", "desc": "Regains 20 Hit Points at start of turn if he has at least 1 HP and isn't in sunlight or running water."},
            {"name": "Spider Climb", "desc": "Can climb difficult surfaces, including upside down on ceilings, without needing an ability check."},
            {"name": "Legendary Resistance (3/Day)", "desc": "If Strahd fails a saving throw, he can choose to succeed instead."}
        ],
        "actions": [
            {"name": "Multiattack", "desc": "Strahd makes two attacks, only one of which can be a bite attack."},
            {"name": "Unarmed Strike", "desc": "Melee Weapon Attack: +9 to hit, reach 5 ft. Hit: 1d8+4 bludgeoning + 4d6 necrotic damage. Target is grappled (escape DC 18)."},
            {"name": "Bite", "desc": "Melee Weapon Attack: +9 to hit, reach 5 ft., one willing creature, or creature grappled/incapacitated. Hit: 1d6+4 piercing + 3d6 necrotic damage. Target's max HP reduced by necrotic dealt. Strahd regains equal HP."},
            {"name": "Charm (Recharge 5-6)", "desc": "Target within 30 ft must succeed on DC 17 Wisdom save or be charmed for 24 hours. The target regards Strahd as a trusted friend."},
            {"name": "Children of the Night (1/Day)", "desc": "Calls 2d4 swarms of bats or rats (indoors), or 3d6 wolves (outdoors) to arrive in 1d4 rounds."}
        ],
        "legendaryActions": [
            {"name": "Move", "cost": 1, "desc": "Strahd moves up to his speed without provoking opportunity attacks."},
            {"name": "Unarmed Strike", "cost": 1, "desc": "Strahd makes one unarmed strike."},
            {"name": "Bite (Costs 2 Actions)", "cost": 2, "desc": "Strahd makes one bite attack against a grappled creature."}
        ]
    },
    {
        "id": "npc-ireena",
        "name": "Ireena Kolyana",
        "epithet": "Tatyana Reincarnated & Adopted Noble",
        "species": "Human",
        "role": "Noble Survivor & Fated Soul",
        "category": "Allies",
        "voice": "Resolute, defiant, gentle yet carrying iron will. Speaks with clear diction and refuses pity.",
        "appearance": "Striking young woman with fiery auburn hair, hazel eyes, and noble bearing. Wears fine travel clothes with a leather jerkin and carries a rapier at her hip. Two small puncture wounds on her neck are concealed by a high lace collar.",
        "personality": "Brave, determined, fiercely loyal to her adopted brother Ismark. Refuses to be treated as a victim or prize to be stolen.",
        "backstory": "Adopted by Burgomaster Kolyan Indirovich as a child. Strahd recently discovered she is the reincarnation of his lost love Tatyana, and has visited her twice in the night to feed.",
        "secret": "She has been bitten twice by Strahd. If bitten a third time, she will die and rise as a vampire spawn.",
        "faction": "Barovian Aristocracy",
        "location": "Village of Barovia",
        "loot": "Silver locket with a portrait of her adoptive father, 15 gp, fine rapier, vial of holy water.",
        "statName": "Noble (Swashbuckler)",
        "statAcHp": "AC 15 • 22 HP",
        "statDetails": "Speed 30 ft • CR 1/8 (25 XP) • STR 11 (+0), DEX 14 (+2), CON 11 (+0), INT 12 (+1), WIS 14 (+2), CHA 16 (+3) • Saves: Cha +5",
        "cr": "1/8",
        "ac": 15,
        "hp": 22,
        "speed": "30 ft",
        "stats": {"str": 11, "dex": 14, "con": 11, "int": 12, "wis": 14, "cha": 16},
        "alignment": "Lawful Good",
        "traits": [
            {"name": "Steadfast Heart", "desc": "Advantage on saving throws against being charmed or frightened."}
        ],
        "actions": [
            {"name": "Rapier", "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 1d8+2 piercing damage."},
            {"name": "Parry", "desc": "Adds 2 to AC against one melee attack that would hit her (reaction)."}
        ]
    },
    {
        "id": "npc-ismark",
        "name": "Ismark Kolyanovich",
        "epithet": "'Ismark the Lesser', Burgomaster of Barovia",
        "species": "Human",
        "role": "Village Leader & Veteran Protector",
        "category": "Allies",
        "voice": "Gravelly, weary, earnest. Carries the burden of his father's sudden death and the siege of his home.",
        "appearance": "Broad-shouldered, rugged young man in his late twenties with dark disheveled hair, stubble, and dark circles of exhaustion. Wears a battered breastplate and carries a greatsword.",
        "personality": "Honorable, protective, stubborn, but deeply self-doubting. Nicknamed 'Ismark the Lesser' by locals who believe he cannot match his father's greatness.",
        "backstory": "His father Kolyan died of heart failure three days ago under the terror of Strahd's nightly wolf attacks. Ismark took up the mantle of Burgomaster and is determined to escort Ireena to safety in Vallaki.",
        "secret": "He suspects the church in Barovia is not a sanctuary anymore; he heard unnatural groans coming from beneath Father Donavich's chapel floor.",
        "faction": "Barovian Aristocracy",
        "location": "Village of Barovia",
        "loot": "Burgomaster signet ring, heavy iron key to the Kolyan mansion, potion of healing, 30 gp.",
        "statName": "Veteran Warrior",
        "statAcHp": "AC 17 • 58 HP",
        "statDetails": "Speed 30 ft • CR 3 (700 XP) • STR 16 (+3), DEX 13 (+1), CON 14 (+2), INT 10 (+0), WIS 11 (+0), CHA 10 (+0) • Saves: Str +5, Con +4",
        "cr": "3",
        "ac": 17,
        "hp": 58,
        "speed": "30 ft",
        "stats": {"str": 16, "dex": 13, "con": 14, "int": 10, "wis": 11, "cha": 10},
        "alignment": "Lawful Good",
        "traits": [
            {"name": "Brave", "desc": "Advantage on saving throws against being frightened."}
        ],
        "actions": [
            {"name": "Multiattack", "desc": "Makes two longsword attacks and one shortsword attack."},
            {"name": "Longsword", "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft. Hit: 1d8+3 slashing (or 1d10+3 two-handed)."},
            {"name": "Shortsword", "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft. Hit: 1d6+3 piercing."}
        ]
    },
    {
        "id": "npc-madam-eva",
        "name": "Madam Eva",
        "epithet": "Elder Seer of the Tser Pool Vistani",
        "species": "Human / Vistani",
        "role": "High Prophet & Tarokka Master",
        "category": "Vistani",
        "voice": "Raspy, knowing, theatrical cackle that abruptly shifts to chilling solemnity when reading destiny.",
        "appearance": "Ancient, hunched Vistani crone draped in colorful shawls of crimson, purple, and gold, adorned with dozens of tarnished silver bangles and necklaces. Her dark eyes gleam with ancient supernatural sight.",
        "personality": "Enigmatic, theatrical, perceptive. Treats mortal adventurers like pieces on an immense chessboard of fate.",
        "backstory": "Leader of the Tser Pool encampment. Possesses the true gift of prophecy granted by the Tarokka deck. She has guided generations of outlanders who enter the mists.",
        "secret": "She is secretly the half-sister of Strahd von Zarovich (daughter of King Barov and a Vistani woman). She seeks Strahd's death or release from his eternal torment.",
        "faction": "The Vistani",
        "location": "Tser Pool Encampment",
        "loot": "Authentic ancient Tarokka Deck of Fate, crystal gazing orb, dried raven talons, 50 gp in vintage Zarovich coins.",
        "statName": "Arch-Diviner",
        "statAcHp": "AC 12 • 88 HP",
        "statDetails": "Speed 20 ft • CR 10 (5,900 XP) • STR 8 (-1), DEX 12 (+1), CON 14 (+2), INT 17 (+3), WIS 20 (+5), CHA 16 (+3) • Saves: Wis +9, Int +7 • Spell DC 17",
        "cr": "10",
        "ac": 12,
        "hp": 88,
        "speed": "20 ft",
        "stats": {"str": 8, "dex": 12, "con": 14, "int": 17, "wis": 20, "cha": 16},
        "alignment": "Neutral",
        "traits": [
            {"name": "Foresight", "desc": "Cannot be surprised and has advantage on attack rolls, ability checks, and saving throws."},
            {"name": "Spellcasting", "desc": "9th-level spellcaster. Spells include Guidance, True Strike, Bless, Hold Person, Spirit Guardians, Divination, Commune."}
        ],
        "actions": [
            {"name": "Tarokka Curse", "desc": "Target within 30 ft must succeed on DC 17 Charisma save or suffer disadvantage on all d20 rolls until next dawn."},
            {"name": "Dagger", "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft. Hit: 1d4+1 piercing."}
        ]
    },
    {
        "id": "npc-van-richten",
        "name": "Dr. Rudolph van Richten",
        "epithet": "Legendary Monster Hunter (Disguised as 'Rictavio' the Bard)",
        "species": "Human",
        "role": "Master Slayer of the Undead",
        "category": "Allies",
        "voice": "As Rictavio: flamboyant, boastful, rapid-fire carnival entertainer with theatrical flourishes. As Van Richten: raspy, cold, razor-sharp veteran tactician.",
        "appearance": "Elderly man with silver hair and a neat goatee, dressed in an extravagant jester-like performer coat and feathered hat. Beneath the costume lies a wiry, scarred hunter carrying silvered weapons.",
        "personality": "Brilliant, obsessive, emotionally distant. He has dedicated his entire life to eradicating vampires after a Vistani clan cursed him and vampires slew his son Erasmus.",
        "backstory": "Has written the definitive guides on monsters across the multiverse. Entered Barovia disguised as Rictavio to study Castle Ravenloft and prepare a surgical strike to assassinate Strahd.",
        "secret": "Carries a cursed Ring of Mind Shielding. A Vistani curse causes doom to fall on anyone who becomes his close friend.",
        "faction": "Unaffiliated",
        "location": "Town of Vallaki",
        "loot": "Ring of Mind Shielding, hat of disguise, silvered shortsword, 3 vials of holy water, journal on vampire anatomy.",
        "statName": "Monster Hunter (Cleric / Ranger)",
        "statAcHp": "AC 14 • 77 HP",
        "statDetails": "Speed 30 ft • CR 5 (1,800 XP) • STR 10 (+0), DEX 14 (+2), CON 12 (+1), INT 16 (+3), WIS 18 (+4), CHA 14 (+2) • Saves: Wis +7, Int +6",
        "cr": "5",
        "ac": 14,
        "hp": 77,
        "speed": "30 ft",
        "stats": {"str": 10, "dex": 14, "con": 12, "int": 16, "wis": 18, "cha": 14},
        "alignment": "Lawful Good",
        "traits": [
            {"name": "Monster Lore", "desc": "Knows the exact vulnerabilities, resistances, and immunities of all undead, fiends, and lycanthropes."},
            {"name": "Undead Slayer", "desc": "Deals an extra 2d8 radiant damage on weapon attacks against undead."}
        ],
        "actions": [
            {"name": "Silvered Shortsword", "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft. Hit: 1d6+2 piercing + 2d8 radiant vs undead."},
            {"name": "Hand Crossbow", "desc": "Ranged Weapon Attack: +5 to hit, range 30/120 ft. Hit: 1d6+2 piercing + wooden stake effect vs vampires."}
        ]
    },
    {
        "id": "npc-ezmerelda",
        "name": "Ezmerelda d'Avenir",
        "epithet": "Vistani Monster Hunter & Van Richten's Protegee",
        "species": "Human / Vistani",
        "role": "Acrobatic Warrior & Demon Slayer",
        "category": "Allies",
        "voice": "Confident, energetic, defiant, speaks with a bold Vistani cadence and witty charm.",
        "appearance": "Athletic young Vistani woman with a prosthetic right foot made of carved wood and silver. Wears practical studded leather armor, a burgundy cloak, and brims with daggers and holy water.",
        "personality": "Fearless, independent, proactive. Impatient with hesitation; believes offense is the best defense against evil.",
        "backstory": "Was apprenticed to Dr. Rudolph van Richten as a youth. When he vanished into Barovia to face Strahd alone, she tracked him into the mists to stand by his side.",
        "secret": "Lost her lower right leg to a werewolf trap during an ambush in Darkon. She hides her wagon near Van Richten's Tower.",
        "faction": "The Vistani",
        "location": "Van Richten's Tower",
        "loot": "Silvered rapier, +1 shortsword, 4 vials of holy water, 2 wooden stakes, silver raven talisman, 35 gp.",
        "statName": "Monster Slayer (Ranger / Fighter)",
        "statAcHp": "AC 17 • 82 HP",
        "statDetails": "Speed 30 ft • CR 8 (3,900 XP) • STR 14 (+2), DEX 19 (+4), CON 14 (+2), INT 16 (+3), WIS 14 (+2), CHA 17 (+3) • Saves: Dex +7, Wis +5",
        "cr": "8",
        "ac": 17,
        "hp": 82,
        "speed": "30 ft",
        "stats": {"str": 14, "dex": 19, "con": 14, "int": 16, "wis": 14, "cha": 17},
        "alignment": "Chaotic Good",
        "traits": [
            {"name": "Acrobatic Agility", "desc": "Can Disengage or Dash as a bonus action."},
            {"name": "Curse-Breaker", "desc": "Advantage on saving throws against curses, charms, and possession."}
        ],
        "actions": [
            {"name": "Multiattack", "desc": "Makes three weapon attacks: two with her rapier and one with her shortsword."},
            {"name": "Silvered Rapier", "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft. Hit: 1d8+4 piercing damage."},
            {"name": "+1 Shortsword", "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft. Hit: 1d6+5 piercing damage."}
        ]
    },
    {
        "id": "npc-rahadin",
        "name": "Rahadin",
        "epithet": "Chamberlain of Castle Ravenloft",
        "species": "Dusk Elf",
        "role": "Loyal Right Hand of Strahd",
        "category": "Villains",
        "voice": "Ice-cold, emotionless, formal whisper that barely carries above a rustle of dry leaves.",
        "appearance": "Gaunt, slate-skinned dusk elf with raven-black hair slicked back tightly, dressed in an immaculate high-collared dark military coat with gold buttons. His pointed ears are scarred.",
        "personality": "Utterly ruthless, completely devoid of empathy, unconditionally loyal to Strahd. He exiled himself from his own people to serve his master.",
        "backstory": "Led the slaughter of his own dusk elf people when they refused to bow to Strahd. Centuries of executing Strahd's enemies have surrounded him with a supernatural psychic chorus of the screaming dead.",
        "secret": "He personally executed every female dusk elf on Strahd's orders after Patrina Velikovna was stoned to death.",
        "faction": "Barovian Aristocracy",
        "location": "Castle Ravenloft",
        "loot": "Master key to Castle Ravenloft, fine steel scimitar with Zarovich crest, ring of psychic protection, 60 gp.",
        "statName": "Dusk Elf Death Knight",
        "statAcHp": "AC 18 • 135 HP",
        "statDetails": "Speed 35 ft • CR 10 (5,900 XP) • STR 14 (+2), DEX 18 (+4), CON 17 (+3), INT 15 (+2), WIS 16 (+3), CHA 18 (+4) • Saves: Con +7, Wis +7",
        "cr": "10",
        "ac": 18,
        "hp": 135,
        "speed": "35 ft",
        "stats": {"str": 14, "dex": 18, "con": 17, "int": 15, "wis": 16, "cha": 18},
        "alignment": "Lawful Evil",
        "traits": [
            {"name": "Deathly Choir", "desc": "Any hostile creature within 10 ft must make DC 16 Wisdom save or take 4d6 psychic damage from screaming phantoms."},
            {"name": "Fey Ancestry", "desc": "Advantage on saves against being charmed, magic cannot put him to sleep."}
        ],
        "actions": [
            {"name": "Multiattack", "desc": "Rahadin makes three scimitar attacks and can cast Misty Step as a bonus action."},
            {"name": "Scimitar", "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft. Hit: 1d6+4 slashing + 2d6 poison damage."},
            {"name": "Dart", "desc": "Ranged Weapon Attack: +8 to hit, range 20/60 ft. Hit: 1d4+4 piercing + 1d6 poison damage."}
        ]
    },
    {
        "id": "npc-donavich",
        "name": "Father Donavich",
        "epithet": "Tormented Priest of the Morninglord",
        "species": "Human",
        "role": "Village Cleric & Broken Father",
        "category": "Townsfolk",
        "voice": "Feverish, cracked, tear-choked, repeating frantic prayers to the Morninglord under his breath.",
        "appearance": "Middle-aged man in threadbare, mud-stained clerical robes of the Morninglord. Wild unkempt grey hair, bloodshot eyes, and bleeding knees from endless kneeling on stone.",
        "personality": "Devout but driven half-mad by despair and guilt. Loves his son more than his faith, yet abhors the abomination his son has become.",
        "backstory": "Priest of the Barovian church. A year ago, a mad wizard led the villagers in an uprising against Castle Ravenloft. Donavich's son Doru joined the march, but was captured and returned as a vampire spawn.",
        "secret": "He keeps his starving vampire son locked beneath the church trapdoor, unable to kill him and unable to feed him.",
        "faction": "Unaffiliated",
        "location": "Village of Barovia",
        "loot": "Tarnished holy symbol of the Morninglord, key to the church undercroft, prayer book with tear-stained pages.",
        "statName": "Acolyte of Light",
        "statAcHp": "AC 10 • 18 HP",
        "statDetails": "Speed 30 ft • CR 1/4 (50 XP) • STR 10 (+0), DEX 10 (+0), CON 12 (+1), INT 10 (+0), WIS 14 (+2), CHA 11 (+0)",
        "cr": "1/4",
        "ac": 10,
        "hp": 18,
        "speed": "30 ft",
        "stats": {"str": 10, "dex": 10, "con": 12, "int": 10, "wis": 14, "cha": 11},
        "alignment": "Lawful Good",
        "traits": [
            {"name": "Spellcasting", "desc": "1st-level cleric. Spells: Sacred Flame, Thaumaturgy, Bless, Cure Wounds, Sanctuary."}
        ],
        "actions": [
            {"name": "Club", "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft. Hit: 1d4 bludgeoning damage."}
        ]
    },
    {
        "id": "npc-doru",
        "name": "Doru",
        "epithet": "Starving Vampire Spawn of the Undercroft",
        "species": "Undead / Vampire Spawn",
        "role": "Imprisoned Monster & Fallen Son",
        "category": "Villains",
        "voice": "Hissing, agonized screeching for blood; cries out for his father between feral lunges.",
        "appearance": "Gaunt, pale young man with sunken black eyes, bloodied fangs, torn ragged peasant clothing, and claws caked with dirt from scratching at the floorboards.",
        "personality": "Frenzied by unnatural vampiric hunger. Moments of human horror are overwhelmed by predatory instinct.",
        "backstory": "Marched on Ravenloft with the Mad Mage. Strahd drained him and sent him back to his father as a sadistic punishment.",
        "secret": "Has not fed in months. If released, he will tear through the village unless instantly restrained or destroyed.",
        "faction": "Barovian Aristocracy",
        "location": "Village of Barovia",
        "loot": "Torn silver baptismal medallion inscribed with 'Doru - Gift of the Morning'.",
        "statName": "Vampire Spawn",
        "statAcHp": "AC 15 • 82 HP",
        "statDetails": "Speed 30 ft, Climb 30 ft • CR 5 (1,800 XP) • STR 16 (+3), DEX 16 (+3), CON 16 (+3), INT 11 (+0), WIS 10 (+0), CHA 12 (+1) • Saves: Dex +6, Wis +3",
        "cr": "5",
        "ac": 15,
        "hp": 82,
        "speed": "30 ft, Climb 30 ft",
        "stats": {"str": 16, "dex": 16, "con": 16, "int": 11, "wis": 10, "cha": 12},
        "alignment": "Neutral Evil",
        "traits": [
            {"name": "Regeneration", "desc": "Regains 10 HP at start of turn if he has at least 1 HP and isn't in sunlight or running water."},
            {"name": "Spider Climb", "desc": "Can climb difficult surfaces, including ceilings, without ability checks."}
        ],
        "actions": [
            {"name": "Multiattack", "desc": "Makes two attacks, one of which can be a bite."},
            {"name": "Claws", "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft. Hit: 2d4+3 slashing. Target is grappled (escape DC 13)."},
            {"name": "Bite", "desc": "Melee Weapon Attack: +6 to hit against grappled target. Hit: 1d6+3 piercing + 2d6 necrotic."}
        ]
    },
    {
        "id": "npc-morgantha",
        "name": "Morgantha",
        "epithet": "Matron of the Old Bonegrinder Coven",
        "species": "Fiend / Night Hag",
        "role": "Wicked Pastry Vendor & Soul Harvester",
        "category": "Villains",
        "voice": "Sweet, grandmotherly coo that drops into a guttural, sulphur-scented demonic growl.",
        "appearance": "Huncheback old crone pushing a wooden handcart loaded with warm meat pies. Wears stained woolen skirts and a dirty bonnet. In true form: warty blue-black skin, yellow fangs, iron claws.",
        "personality": "Sadistic, mercantile, greedy. Delights in trading addictive pastries to desperate parents in exchange for their children.",
        "backstory": "Leads a coven of night hags operating out of the Old Bonegrinder windmill. Grinds the bones of Barovian children to make euphoric dream pastries that hook the populace.",
        "secret": "Carries a Heartstone and Soul Bag containing trapped mortal souls to sell on the Lower Planes.",
        "faction": "Unaffiliated",
        "location": "Old Bonegrinder",
        "loot": "Heartstone (cures diseases and grants ethereal jaunt), Soul Bag with 2 trapped souls, 8 dream pastries, 45 gp.",
        "statName": "Night Hag Coven Leader",
        "statAcHp": "AC 17 • 112 HP",
        "statDetails": "Speed 30 ft • CR 7 (2,900 XP, Coven) • STR 18 (+4), DEX 15 (+2), CON 16 (+3), INT 16 (+3), WIS 14 (+2), CHA 16 (+3) • Magic Resistance",
        "cr": "7",
        "ac": 17,
        "hp": 112,
        "speed": "30 ft",
        "stats": {"str": 18, "dex": 15, "con": 16, "int": 16, "wis": 14, "cha": 16},
        "alignment": "Neutral Evil",
        "traits": [
            {"name": "Magic Resistance", "desc": "Advantage on saving throws against spells and other magical effects."},
            {"name": "Coven Spellcasting", "desc": "Shared spells with daughters: Hold Person, Ray of Enfeeblement, Lightning Bolt, Eyebite."}
        ],
        "actions": [
            {"name": "Claws", "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft. Hit: 2d8+4 slashing damage."},
            {"name": "Etherealness", "desc": "Enters the Ethereal Plane from the Material Plane, or vice versa."}
        ]
    },
    {
        "id": "npc-bella",
        "name": "Bella Sunbane",
        "epithet": "Daughter of Morgantha & Miller Hag",
        "species": "Fiend / Night Hag",
        "role": "Coven Enforcer",
        "category": "Villains",
        "voice": "High-pitched, mocking shriek, punctuated by wet snorting laughter.",
        "appearance": "Gaunt, repulsive woman with stringy grease-stained hair, wearing a baker's apron spattered with blood and flour. Long iron-like fingernails.",
        "personality": "Cruel, spiteful, argumentative with her sister Offalia, yet fiercely obedient to Mother Morgantha.",
        "backstory": "Assists in grinding grain and bone on the third floor of the windmill, baking batches of dream pastries day and night.",
        "secret": "Desperately wants to overthrow Morgantha as coven leader once they acquire a third child for their unholy ritual.",
        "faction": "Unaffiliated",
        "location": "Old Bonegrinder",
        "loot": "Vial of toad venom, bone grinder crank key, 18 sp.",
        "statName": "Night Hag",
        "statAcHp": "AC 17 • 90 HP",
        "statDetails": "Speed 30 ft • CR 5 (1,800 XP) • STR 18 (+4), DEX 15 (+2), CON 16 (+3), INT 16 (+3), WIS 14 (+2), CHA 16 (+3)",
        "cr": "5",
        "ac": 17,
        "hp": 90,
        "speed": "30 ft",
        "stats": {"str": 18, "dex": 15, "con": 16, "int": 16, "wis": 14, "cha": 16},
        "alignment": "Neutral Evil",
        "traits": [
            {"name": "Magic Resistance", "desc": "Advantage on saving throws against spells and other magical effects."}
        ],
        "actions": [
            {"name": "Claws", "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft. Hit: 2d8+4 slashing damage."}
        ]
    },
    {
        "id": "npc-offalia",
        "name": "Offalia Wormiggle",
        "epithet": "Daughter of Morgantha & Child Keeper",
        "species": "Fiend / Night Hag",
        "role": "Coven Torturer",
        "category": "Villains",
        "voice": "Gurgling, lisping voice, singing sinister lullabies while poking prisoners with needles.",
        "appearance": "Rotund hag with greasy grey skin, bulbous nose covered in warts, and rotten teeth. Wears an oversized pinafore stuffed with small bones.",
        "personality": "Childish, sadistic, fond of playing cruel psychological games with captured children.",
        "backstory": "Watches over the children kept in wooden crates on the upper floor of Old Bonegrinder before they are harvested.",
        "secret": "She secretly eats children's finger bones raw behind her mother's back.",
        "faction": "Unaffiliated",
        "location": "Old Bonegrinder",
        "loot": "Bag of sweet candied plums laced with sleeping draught, 12 sp, brass key to child cages.",
        "statName": "Night Hag",
        "statAcHp": "AC 17 • 90 HP",
        "statDetails": "Speed 30 ft • CR 5 (1,800 XP) • STR 18 (+4), DEX 15 (+2), CON 16 (+3), INT 16 (+3), WIS 14 (+2), CHA 16 (+3)",
        "cr": "5",
        "ac": 17,
        "hp": 90,
        "speed": "30 ft",
        "stats": {"str": 18, "dex": 15, "con": 16, "int": 16, "wis": 14, "cha": 16},
        "alignment": "Neutral Evil",
        "traits": [
            {"name": "Magic Resistance", "desc": "Advantage on saving throws against spells and other magical effects."}
        ],
        "actions": [
            {"name": "Claws", "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft. Hit: 2d8+4 slashing damage."}
        ]
    },
    {
        "id": "npc-vargas",
        "name": "Baron Vargas Vallakovich",
        "epithet": "Burgomaster of Vallaki & Festival Tyrant",
        "species": "Human",
        "role": "Dictator of Mandatory Happiness",
        "category": "Townsfolk",
        "voice": "Bombastic, strained, twitching with manic artificial cheer; flies into furious rage at any hint of sadness.",
        "appearance": "Portly, pompous nobleman with sleek oiled hair, ornate brocade doublet with polished brass buttons, accompanied everywhere by his two vicious mastiffs.",
        "personality": "Delusional megalomaniac. Believes that forcing townspeople to celebrate festivals will ward off the devil Strahd. Slogan: 'All will be well!'",
        "backstory": "Has ruled Vallaki for decades through public stocks and exile. Anyone not smiling during his weekly festivals is locked in wicker donkey heads in the town square.",
        "secret": "Terrified of Lady Fiona Wachter. His son Victor is conducting forbidden necromancy in the mansion attic.",
        "faction": "Barovian Aristocracy",
        "location": "Town of Vallaki",
        "loot": "Key to the town treasury, signet ring of Vallaki, pouch with 60 gp, silk handkerchief.",
        "statName": "Noble Burgomaster",
        "statAcHp": "AC 15 • 36 HP",
        "statDetails": "Speed 30 ft • CR 1/8 (25 XP) • STR 11 (+0), DEX 12 (+1), CON 11 (+0), INT 12 (+1), WIS 10 (+0), CHA 14 (+2)",
        "cr": "1/8",
        "ac": 15,
        "hp": 36,
        "speed": "30 ft",
        "stats": {"str": 11, "dex": 12, "con": 11, "int": 12, "wis": 10, "cha": 14},
        "alignment": "Lawful Neutral",
        "traits": [
            {"name": "Call Guards", "desc": "Can summon 1d4+2 town guards with a whistle (arrive in 2 rounds)."}
        ],
        "actions": [
            {"name": "Rapier", "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft. Hit: 1d8+1 piercing damage."}
        ]
    },
    {
        "id": "npc-fiona",
        "name": "Lady Fiona Wachter",
        "epithet": "Matriarch of Wachterhaus & Cult Mistress",
        "species": "Human",
        "role": "Scheming Noble & Devil Loyalist",
        "category": "Villains",
        "voice": "Silky, cultured, condescending, icy calmness that masks absolute fanaticism.",
        "appearance": "Stern, aristocratic matriarch in elegant black velvet mourning gown with pearl chokers. Regal posture and calculating emerald eyes.",
        "personality": "Pragmatic, ambitious, ruthless. Views Strahd as a lawful feudal ruler rather than a monster, and despises the foolish festivals of Baron Vargas.",
        "backstory": "Head of the noble Wachter family. Commands a secret cult ('The Book Club') that worships devils and plots to overthrow the Burgomaster and surrender Vallaki to Strahd.",
        "secret": "She keeps the preserved corpse of her dead husband Nikolai in her bed, sleeping beside him every night under a gentle repose spell.",
        "faction": "The Wachter Cult",
        "location": "Town of Vallaki",
        "loot": "Tome of devil worship, key to Wachterhaus secret study, potion of poison, gold pendant with imp sigil, 80 gp.",
        "statName": "Cult Fanatic (Noble Priest)",
        "statAcHp": "AC 13 • 33 HP",
        "statDetails": "Speed 30 ft • CR 2 (450 XP) • STR 10 (+0), DEX 10 (+0), CON 12 (+1), INT 13 (+1), WIS 14 (+2), CHA 16 (+3) • Spell DC 12",
        "cr": "2",
        "ac": 13,
        "hp": 33,
        "speed": "30 ft",
        "stats": {"str": 10, "dex": 10, "con": 12, "int": 13, "wis": 14, "cha": 16},
        "alignment": "Lawful Evil",
        "traits": [
            {"name": "Dark Devotion", "desc": "Advantage on saving throws against being charmed or frightened."}
        ],
        "actions": [
            {"name": "Dagger", "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 1d4+2 piercing damage."},
            {"name": "Command Cultists", "desc": "Can command 4 cultists to attack or defend her."}
        ]
    },
    {
        "id": "npc-izek",
        "name": "Izek Strazni",
        "epithet": "Brutal Captain of the Vallaki Guard",
        "species": "Human / Fiend-Touched",
        "role": "Enforcer & Heavy Brawler",
        "category": "Villains",
        "voice": "Deep, rumbling, guttural growl; speaks in short brutal commands.",
        "appearance": "Towering, hulking brute over seven feet tall. His right arm is a barbed, scaly demonic claw capable of erupting in hellfire. Carries a massive greataxe.",
        "personality": "Sadistic, unfeeling bully. Loyal only to Baron Vargas, who took him in after he lost his family and arm in the woods.",
        "backstory": "Became an orphan after a dire wolf attack. Grew up in Vallaki and woke up one morning with a demonic arm grafted to his torso. Has dreams of a woman he has never met (Ireena).",
        "secret": "He is the long-lost biological brother of Ireena Kolyana. He has Blinsky carve dozens of wooden dolls in her likeness.",
        "faction": "Barovian Aristocracy",
        "location": "Town of Vallaki",
        "loot": "Doll of Ireena Kolyana, bloody battleaxe, heavy iron guardhouse keys, 25 gp.",
        "statName": "Fiendish Enforcer",
        "statAcHp": "AC 14 • 112 HP",
        "statDetails": "Speed 30 ft • CR 5 (1,800 XP) • STR 18 (+4), DEX 15 (+2), CON 16 (+3), INT 10 (+0), WIS 9 (-1), CHA 15 (+2) • Saves: Str +7, Con +6",
        "cr": "5",
        "ac": 14,
        "hp": 112,
        "speed": "30 ft",
        "stats": {"str": 18, "dex": 15, "con": 16, "int": 10, "wis": 9, "cha": 15},
        "alignment": "Neutral Evil",
        "traits": [
            {"name": "Brute", "desc": "Melee weapon deals an extra die of damage (included in greataxe)."}
        ],
        "actions": [
            {"name": "Multiattack", "desc": "Makes two attacks with his greataxe."},
            {"name": "Greataxe", "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft. Hit: 2d12+4 slashing damage."},
            {"name": "Hurl Flame", "desc": "Ranged Spell Attack: +5 to hit, range 150 ft. Hit: 3d6 fire damage."}
        ]
    },
    {
        "id": "npc-urwin",
        "name": "Urwin Martikov",
        "epithet": "Innkeeper of Blue Water Inn & Secret Wereraven",
        "species": "Human (Wereraven)",
        "role": "Information Broker & Rebel Leader",
        "category": "Allies",
        "voice": "Warm, welcoming, jovial barkeep who lowers his voice to a conspiratorial murmur when sharing vital intelligence.",
        "appearance": "Handsome, bearded Barovian man in his early forties with keen raven-like black eyes, wearing a clean linen apron over leather tunic.",
        "personality": "Generous, hospitable, shrewd. Opposed to Strahd's tyranny, but cautious not to expose his wife and children to retribution.",
        "backstory": "Proprietor of the Blue Water Inn, the only warm tavern in Vallaki. Leader of the local cell of the Keepers of the Feather.",
        "secret": "He and his entire family are wereravens. They use ravens across the valley to spy on Strahd's minions.",
        "faction": "Keepers of the Feather",
        "location": "Town of Vallaki",
        "loot": "Key to wine cellar, silver raven brooch, tankard of Purple Grapemash No. 3, 40 gp.",
        "statName": "Wereraven",
        "statAcHp": "AC 12 • 31 HP",
        "statDetails": "Speed 30 ft, Fly 50 ft (raven form) • CR 2 (450 XP) • STR 10 (+0), DEX 15 (+2), CON 11 (+0), INT 13 (+1), WIS 15 (+2), CHA 14 (+2) • Immune to nonmagical/nonsilvered physical damage",
        "cr": "2",
        "ac": 12,
        "hp": 31,
        "speed": "30 ft, Fly 50 ft",
        "stats": {"str": 10, "dex": 15, "con": 11, "int": 13, "wis": 15, "cha": 14},
        "alignment": "Lawful Good",
        "traits": [
            {"name": "Damage Immunity", "desc": "Bludgeoning, piercing, and slashing from nonmagical attacks not made with silvered weapons."},
            {"name": "Shapechanger", "desc": "Can polymorph into a raven or hybrid form."}
        ],
        "actions": [
            {"name": "Multiattack", "desc": "Makes two weapon attacks or two beak attacks in hybrid form."},
            {"name": "Beak", "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 1d4+2 piercing damage."}
        ]
    },
    {
        "id": "npc-danika",
        "name": "Danika Dorakova",
        "epithet": "Co-Proprietor of Blue Water Inn & Wereraven Scout",
        "species": "Human (Wereraven)",
        "role": "Innkeeper & Aerial Scout",
        "category": "Allies",
        "voice": "Sharp, witty, maternal, quick with a warm meal and sharp advice.",
        "appearance": "Athletic, sharp-featured woman with long dark braid and apron, bustling between tables with platters of roast wolf and wine.",
        "personality": "Observant, protective of her sons Brom and Bray, practical and fiercely committed to resisting the darkness.",
        "backstory": "Runs the Blue Water Inn alongside Urwin. Acts as the primary watcher of outlanders and adventurers entering town.",
        "secret": "Knows the secret entrance to the attic where Rictavio keeps his saber-toothed tiger.",
        "faction": "Keepers of the Feather",
        "location": "Town of Vallaki",
        "loot": "Silver raven pin, cellar pantry keys, 20 gp.",
        "statName": "Wereraven Scout",
        "statAcHp": "AC 12 • 31 HP",
        "statDetails": "Speed 30 ft, Fly 50 ft • CR 2 (450 XP) • Damage immunity to nonsilvered weapons",
        "cr": "2",
        "ac": 12,
        "hp": 31,
        "speed": "30 ft, Fly 50 ft",
        "stats": {"str": 10, "dex": 15, "con": 11, "int": 13, "wis": 15, "cha": 14},
        "alignment": "Lawful Good",
        "traits": [
            {"name": "Damage Immunity", "desc": "Immune to nonmagical nonsilvered weapon damage."}
        ],
        "actions": [
            {"name": "Shortsword", "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 1d6+2 piercing."}
        ]
    },
    {
        "id": "npc-davian",
        "name": "Davian Martikov",
        "epithet": "Patriarch of the Wizard of Wines Winery",
        "species": "Human (Wereraven)",
        "role": "Winery Elder & Resistance Patriarch",
        "category": "Allies",
        "voice": "Crusty, stubborn, gruff patriarch whose stern exterior hides a broken heart.",
        "appearance": "Stooped old man in his seventies with wild white hair, bushy eyebrows, and stained wine-maker's clothes, leaning on a wooden staff.",
        "personality": "Proud, stubborn, fiercely protective of his vineyard. Estranged from his son Urwin over a stolen magic gem.",
        "backstory": "Patriarch of the Martikov clan. Built the winery into the lifeblood of Barovia using three enchanted green gems.",
        "secret": "Two of the winery's three magic gems were stolen—one by Baba Lysaga, one by the wild druids of Yester Hill.",
        "faction": "Keepers of the Feather",
        "location": "The Wizard of Wines",
        "loot": "Key to the winery fermentation vats, bottle of Red Dragon Crush (vintage), 35 gp.",
        "statName": "Elder Wereraven",
        "statAcHp": "AC 12 • 31 HP",
        "statDetails": "Speed 30 ft, Fly 50 ft • CR 2 (450 XP) • Immune to nonmagical physical damage",
        "cr": "2",
        "ac": 12,
        "hp": 31,
        "speed": "30 ft, Fly 50 ft",
        "stats": {"str": 10, "dex": 15, "con": 11, "int": 14, "wis": 16, "cha": 13},
        "alignment": "Lawful Good",
        "traits": [
            {"name": "Damage Immunity", "desc": "Immune to nonsilvered nonmagical bludgeoning, piercing, slashing."}
        ],
        "actions": [
            {"name": "Quarterstaff", "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft. Hit: 1d6 bludgeoning."}
        ]
    },
    {
        "id": "npc-lucian",
        "name": "Father Lucian Petrovich",
        "epithet": "High Priest of Saint Andral's Church",
        "species": "Human",
        "role": "Spiritual Shepherd of Vallaki",
        "category": "Townsfolk",
        "voice": "Soft-spoken, compassionate, serene, but quivering with terror over a recent theft.",
        "appearance": "Gentle, bald man in his fifties with clean linen vestments embroidered with silver sun rays, wearing a wooden holy symbol of the Morninglord.",
        "personality": "Humble, selfless, genuinely devoted to protecting the innocent folk of Vallaki from despair.",
        "backstory": "Priest of the Church of Saint Andral in Vallaki. His sister is the wife of the Burgomaster, Baroness Lydia.",
        "secret": "The sacred bones of Saint Andral have been stolen from the crypt beneath his altar, stripping the church of its hallowed protection.",
        "faction": "Unaffiliated",
        "location": "Town of Vallaki",
        "loot": "Holy water flask, prayer bead rosary, key to the church ossuary, 10 gp.",
        "statName": "Cleric of the Morninglord",
        "statAcHp": "AC 10 • 27 HP",
        "statDetails": "Speed 30 ft • CR 1 (200 XP) • STR 10 (+0), DEX 10 (+0), CON 12 (+1), INT 12 (+1), WIS 16 (+3), CHA 14 (+2) • Spell DC 13",
        "cr": "1",
        "ac": 10,
        "hp": 27,
        "speed": "30 ft",
        "stats": {"str": 10, "dex": 10, "con": 12, "int": 12, "wis": 16, "cha": 14},
        "alignment": "Lawful Good",
        "traits": [
            {"name": "Spellcasting", "desc": "3rd-level cleric. Spells: Light, Spare the Dying, Bless, Cure Wounds, Lesser Restoration, Spiritual Weapon."}
        ],
        "actions": [
            {"name": "Mace", "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft. Hit: 1d6 bludgeoning."}
        ]
    },
    {
        "id": "npc-yeska",
        "name": "Yeska",
        "epithet": "Altar Boy of Saint Andral's Church",
        "species": "Human",
        "role": "Orphan & Reluctant Informant",
        "category": "Townsfolk",
        "voice": "Timid, high-pitched, stammering with guilt and fear of being beaten.",
        "appearance": "Skinny, pale boy of ten years in oversized acolyte robes, clutching his sleeves and constantly darting his eyes around.",
        "personality": "Innocent, impressionable, terrified of punishment.",
        "backstory": "Orphan raised in the church by Father Lucian. Does chores and rings the prayer bells.",
        "secret": "He confided the secret hiding spot of Saint Andral's bones to the coffin maker Henrik van der Voort.",
        "faction": "Unaffiliated",
        "location": "Town of Vallaki",
        "loot": "Carved wooden top from Blinsky's shop, brass bell, apple core.",
        "statName": "Commoner Child",
        "statAcHp": "AC 10 • 4 HP",
        "statDetails": "Speed 25 ft • CR 0 (10 XP) • STR 8 (-1), DEX 10 (+0), CON 10 (+0), INT 10 (+0), WIS 10 (+0), CHA 10 (+0)",
        "cr": "0",
        "ac": 10,
        "hp": 4,
        "speed": "25 ft",
        "stats": {"str": 8, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10},
        "alignment": "Neutral Good",
        "traits": [],
        "actions": [
            {"name": "Unarmed", "desc": "Melee Attack: +0 to hit. Hit: 1 bludgeoning."}
        ]
    },
    {
        "id": "npc-henrik",
        "name": "Henrik van der Voort",
        "epithet": "Coffin Maker of Vallaki",
        "species": "Human",
        "role": "Cowardly Undertaker",
        "category": "Townsfolk",
        "voice": "Nervous, oily, sniffling, sweating profusely, always looking over his shoulder.",
        "appearance": "Gaunt, sallow-skinned man in his late forties with greasy receding hair, stained apron, and wood shavings clinging to his clothes.",
        "personality": "Spineless, self-pitying coward. Cooperated with vampires purely out of fear for his own wretched life.",
        "backstory": "Runs the coffin maker's shop in the northeast district of Vallaki. Bribed Yeska to steal the bones of St. Andral.",
        "secret": "Six vampire spawn sent by Strahd are hiding in wooden shipping crates in his upstairs workshop attic.",
        "faction": "Unaffiliated",
        "location": "Town of Vallaki",
        "loot": "Heavy iron ring of keys to his shop, carpenter's hammer, 15 gp from vampire payment.",
        "statName": "Commoner Craftsman",
        "statAcHp": "AC 10 • 9 HP",
        "statDetails": "Speed 30 ft • CR 0 (10 XP) • STR 10 (+0), DEX 10 (+0), CON 10 (+0), INT 10 (+0), WIS 8 (-1), CHA 8 (-1)",
        "cr": "0",
        "ac": 10,
        "hp": 9,
        "speed": "30 ft",
        "stats": {"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 8, "cha": 8},
        "alignment": "Neutral Evil",
        "traits": [],
        "actions": [
            {"name": "Hammer", "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft. Hit: 1d4 bludgeoning."}
        ]
    },
    {
        "id": "npc-blinsky",
        "name": "Gadof Blinsky",
        "epithet": "Eccentric Toymaker of Vallaki",
        "species": "Human",
        "role": "Macabre Artisan",
        "category": "Townsfolk",
        "voice": "Boisterous, high, warbling, with an exaggerated eastern-European accent. Slogan: 'Is no fun, is no Blinsky!'",
        "appearance": "Portly, jovial craftsman in a jester-cap, wearing dirty overalls. A tiny pet monkey named Piccolo in a ballerina tutu rides on his shoulder.",
        "personality": "Bizarrely cheerful in the midst of grim despair. Truly believes his horrifying gothic toys bring joy to children.",
        "backstory": "Master toymaker whose shop is filled with hanging puppets, miniature guillotines, and clockwork corpses.",
        "secret": "Izek Strazni pays him handsomely to craft dozens of lifelike porcelain and cloth dolls depicting Ireena Kolyana.",
        "faction": "Unaffiliated",
        "location": "Town of Vallaki",
        "loot": "Clockwork screeching bat, 3 grotesque wooden dolls, Piccolo the pet monkey, 18 gp.",
        "statName": "Artisan Merchant",
        "statAcHp": "AC 10 • 12 HP",
        "statDetails": "Speed 30 ft • CR 0 (10 XP) • STR 10 (+0), DEX 10 (+0), CON 11 (+0), INT 14 (+2), WIS 10 (+0), CHA 12 (+1)",
        "cr": "0",
        "ac": 10,
        "hp": 12,
        "speed": "30 ft",
        "stats": {"str": 10, "dex": 10, "con": 11, "int": 14, "wis": 10, "cha": 12},
        "alignment": "Chaotic Good",
        "traits": [],
        "actions": [
            {"name": "Chisel", "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft. Hit: 1d4 piercing."}
        ]
    },
    {
        "id": "npc-kasimir",
        "name": "Kasimir Velikov",
        "epithet": "Elder Mage of the Dusk Elves",
        "species": "Dusk Elf",
        "role": "Grieving Brother & Arcane Seeker",
        "category": "Allies",
        "voice": "Melancholy, whispery, haunted by centuries of shame, yet ignited by a cold obsessive hope.",
        "appearance": "Ancient dusk elf with weathered ash-grey skin, long silver hair, and mutilated earlobes sliced by Rahadin's blade. Draped in heavy dark travel furs.",
        "personality": "Burdened by cosmic guilt, patient, scholarly, but willing to treat with dark powers to save his sister.",
        "backstory": "Leader of the surviving dusk elves outside Vallaki. Participated in stoning his sister Patrina to death centuries ago to keep Strahd from taking her.",
        "secret": "Patrina whispers to him in dreams from beyond the grave, urging him to travel to the Amber Temple where she claims a gift can resurrect her.",
        "faction": "Unaffiliated",
        "location": "Town of Vallaki",
        "loot": "Ring of Warmth, spellbook with ice magic, scroll of Greater Restoration, 40 gp.",
        "statName": "Dusk Elf Mage",
        "statAcHp": "AC 12 • 40 HP",
        "statDetails": "Speed 30 ft • CR 6 (2,300 XP) • STR 9 (-1), DEX 14 (+2), CON 11 (+0), INT 17 (+3), WIS 12 (+1), CHA 11 (+0) • Spell DC 14",
        "cr": "6",
        "ac": 12,
        "hp": 40,
        "speed": "30 ft",
        "stats": {"str": 9, "dex": 14, "con": 11, "int": 17, "wis": 12, "cha": 11},
        "alignment": "Neutral",
        "traits": [
            {"name": "Fey Ancestry", "desc": "Advantage on saves against charmed; cannot be put to sleep by magic."},
            {"name": "Spellcasting", "desc": "9th-level wizard. Spells: Mage Armor, Magic Missile, Misty Step, Fireball, Cone of Cold."}
        ],
        "actions": [
            {"name": "Dagger", "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft. Hit: 1d4+2 piercing."}
        ]
    },
    {
        "id": "npc-victor",
        "name": "Victor Vallakovich",
        "epithet": "Apprentice Mage of the Baron's Attic",
        "species": "Human",
        "role": "Arrogant Prodigy & Accidental Menace",
        "category": "Townsfolk",
        "voice": "Petulant, arrogant, sneering teenager with delusions of magical grandeur.",
        "appearance": "Skinny young man with greasy dark hair, dressed in stained silk robes that are too large for him. Fingers stained with ink and sulfur.",
        "personality": "Narcissistic, callous, views commoners as test subjects.",
        "backstory": "The Baron's son. Locked himself in the attic to study a spellbook he stole. Attempting to build a teleportation circle to escape Barovia.",
        "secret": "His botched teleportation experiments have disintegrated two of the mansion's maidservants into ash.",
        "faction": "Barovian Aristocracy",
        "location": "Town of Vallaki",
        "loot": "Stolen spellbook (contains 1st-3rd level spells), skeleton key, 25 gp.",
        "statName": "Apprentice Mage",
        "statAcHp": "AC 12 • 36 HP",
        "statDetails": "Speed 30 ft • CR 2 (450 XP) • STR 9 (-1), DEX 14 (+2), CON 11 (+0), INT 15 (+2), WIS 12 (+1), CHA 11 (+0) • Spell DC 12",
        "cr": "2",
        "ac": 12,
        "hp": 36,
        "speed": "30 ft",
        "stats": {"str": 9, "dex": 14, "con": 11, "int": 15, "wis": 12, "cha": 11},
        "alignment": "Neutral Evil",
        "traits": [
            {"name": "Spellcasting", "desc": "Spells: Animate Dead, Invisibility, Thunderwave, Suggestion."}
        ],
        "actions": [
            {"name": "Dagger", "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 1d4+2 piercing."}
        ]
    },
    {
        "id": "npc-abbot",
        "name": "The Abbot",
        "epithet": "Fallen Deva of Saint Markovia",
        "species": "Celestial (Fallen Deva)",
        "role": "Mad Sculptor of Flesh",
        "category": "Villains",
        "voice": "Sublime, heavenly, soothing, yet expressing deeply monstrous and horrifying ideas with serene tranquility.",
        "appearance": "Astonishingly handsome monk in simple brown habit. Beneath his hood, his eyes glow with golden celestial fire and his skin is flawless.",
        "personality": "Mad with corrupted celestial righteousness. Believes the only way to save Barovia is to cure Strahd's curse by building him the 'perfect bride'.",
        "backstory": "An angelic Deva sent by the gods centuries ago to restore Saint Markovia's abbey. The dark corruption of the mists warped his celestial mind.",
        "secret": "Has grafted animal heads and mismatched limbs onto the abbey's leper families (the Belviews) and is assembling a flesh golem bride from grave-robbed corpses.",
        "faction": "Unaffiliated",
        "location": "Village of Krezk & Abbey of Saint Markovia",
        "loot": "Amulet of angel wings, vial of celestial ichor, surgical bone saws and suturing silver thread, 50 gp.",
        "statName": "Deva (Celestial)",
        "statAcHp": "AC 17 • 136 HP",
        "statDetails": "Speed 30 ft, Fly 90 ft • CR 10 (5,900 XP) • STR 18 (+4), DEX 18 (+4), CON 18 (+4), INT 17 (+3), WIS 20 (+5), CHA 20 (+5) • Magic Resistance",
        "cr": "10",
        "ac": 17,
        "hp": 136,
        "speed": "30 ft, Fly 90 ft",
        "stats": {"str": 18, "dex": 18, "con": 18, "int": 17, "wis": 20, "cha": 20},
        "alignment": "Lawful Evil",
        "traits": [
            {"name": "Angelic Weapons", "desc": "Weapon attacks deal an extra 4d8 radiant damage."},
            {"name": "Magic Resistance", "desc": "Advantage on saving throws against spells and magical effects."}
        ],
        "actions": [
            {"name": "Multiattack", "desc": "Makes two melee attacks with his celestial mace."},
            {"name": "Mace", "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft. Hit: 1d6+4 bludgeoning + 4d8 radiant damage."},
            {"name": "Healing Touch (3/Day)", "desc": "Touches creature, restoring 4d8+2 HP and curing disease/poison."}
        ]
    },
    {
        "id": "npc-vasilka",
        "name": "Vasilka",
        "epithet": "Flesh Golem Bride of the Abbot",
        "species": "Construct / Flesh Golem",
        "role": "The Crafted Bride",
        "category": "Creatures",
        "voice": "Mute; communicates only through mechanical twitches and mournful gazes.",
        "appearance": "Tall, awkwardly graceful woman cobbled together from the corpses of various Barovian women, sewn with thick black thread and dressed in a soiled white wedding gown.",
        "personality": "Gentle, confused, yearning for humanity, but fiercely obedient to the Abbot's commands.",
        "backstory": "Created by the Abbot over three years of harvesting bodies from Krezk. The Abbot is teaching her courtly etiquette to present her to Strahd.",
        "secret": "The Abbot is still searching for the 'perfect face' to complete her—and has fixed his gaze on Ireena Kolyana.",
        "faction": "Unaffiliated",
        "location": "Village of Krezk & Abbey of Saint Markovia",
        "loot": "Tarnished silver bridal tiara set with amethysts, bridal veil.",
        "statName": "Flesh Golem",
        "statAcHp": "AC 9 • 93 HP",
        "statDetails": "Speed 30 ft • CR 5 (1,800 XP) • STR 19 (+4), DEX 9 (-1), CON 18 (+4), INT 6 (-2), WIS 10 (+0), CHA 5 (-3) • Lightning Absorption",
        "cr": "5",
        "ac": 9,
        "hp": 93,
        "speed": "30 ft",
        "stats": {"str": 19, "dex": 9, "con": 18, "int": 6, "wis": 10, "cha": 5},
        "alignment": "Neutral",
        "traits": [
            {"name": "Lightning Absorption", "desc": "Whenever subjected to lightning damage, takes no damage and regains HP equal to damage dealt."},
            {"name": "Berserk", "desc": "If HP drops below 40, DC 15 check each turn or goes berserk."}
        ],
        "actions": [
            {"name": "Multiattack", "desc": "Makes two slam attacks."},
            {"name": "Slam", "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft. Hit: 2d8+4 bludgeoning damage."}
        ]
    },
    {
        "id": "npc-dmitri",
        "name": "Dmitri Krezkov",
        "epithet": "Burgomaster of Krezk",
        "species": "Human",
        "role": "Grieving Father & Fortress Gatekeeper",
        "category": "Townsfolk",
        "voice": "Hollow, formal, broken by grief, speaks in quiet and guarded tones.",
        "appearance": "Gaunt nobleman in his fifties with solemn grey eyes, heavy fur coat, and dark wool mittens. Carries the heavy iron ring of the village gate.",
        "personality": "Sorrowful, cautious, stoic. Will not allow outsiders into Krezk without proof of good intent (a shipment of wine).",
        "backstory": "All four of his children have died of fever or winter starvation. His youngest son Ilya died just yesterday.",
        "secret": "The Abbot offered to resurrect his son Ilya from the dead—if Dmitri helps him acquire a wedding dress for Vasilka.",
        "faction": "Barovian Aristocracy",
        "location": "Village of Krezk & Abbey of Saint Markovia",
        "loot": "Heavy keys to Krezk's fortified gates, signet ring of Krezk, 20 gp.",
        "statName": "Noble Burgomaster",
        "statAcHp": "AC 11 • 18 HP",
        "statDetails": "Speed 30 ft • CR 1/8 (25 XP) • STR 11 (+0), DEX 12 (+1), CON 11 (+0), INT 12 (+1), WIS 14 (+2), CHA 12 (+1)",
        "cr": "1/8",
        "ac": 11,
        "hp": 18,
        "speed": "30 ft",
        "stats": {"str": 11, "dex": 12, "con": 11, "int": 12, "wis": 14, "cha": 12},
        "alignment": "Lawful Good",
        "traits": [],
        "actions": [
            {"name": "Shortsword", "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft. Hit: 1d6+1 piercing."}
        ]
    },
    {
        "id": "npc-anna",
        "name": "Anna Krezkova",
        "epithet": "Grieving Mother & Wife of the Burgomaster",
        "species": "Human",
        "role": "Heartbroken Matron",
        "category": "Townsfolk",
        "voice": "Whispering, tearful, desperate.",
        "appearance": "Thin, pale noblewoman dressed in black mourning lace, clutching an embroidered child's blanket to her chest.",
        "personality": "Desperate for her son's return, willing to accept any miracle regardless of the dark cost.",
        "backstory": "Has buried four children in the cold soil of Krezk. Clings to the Abbot's promise of resurrection.",
        "secret": "Visited the Abbey at midnight to deliver cloth for the Abbot's flesh bride.",
        "faction": "Barovian Aristocracy",
        "location": "Village of Krezk & Abbey of Saint Markovia",
        "loot": "Silver locket with hair from her four deceased children, 10 gp.",
        "statName": "Noble Matron",
        "statAcHp": "AC 10 • 9 HP",
        "statDetails": "Speed 30 ft • CR 0 (10 XP) • STR 8 (-1), DEX 10 (+0), CON 10 (+0), INT 11 (+0), WIS 12 (+1), CHA 11 (+0)",
        "cr": "0",
        "ac": 10,
        "hp": 9,
        "speed": "30 ft",
        "stats": {"str": 8, "dex": 10, "con": 10, "int": 11, "wis": 12, "cha": 11},
        "alignment": "Lawful Good",
        "traits": [],
        "actions": [
            {"name": "Dagger", "desc": "Melee Weapon Attack: +2 to hit, reach 5 ft. Hit: 1d4 piercing."}
        ]
    },
    {
        "id": "npc-vladimir",
        "name": "Sir Vladimir Horngaard",
        "epithet": "Commander of the Revenants of Argynvostholt",
        "species": "Undead / Revenant",
        "role": "Vengeful Warlord of the Silver Dragon",
        "category": "Villains",
        "voice": "Grave-deep, echoing, vibrating with pure unyielding hatred that has burned for 400 years.",
        "appearance": "Towering undead knight in blackened, cracked plate armor adorned with silver dragon motifs. Pale desiccated flesh, eyes glowing with baleful green phantom fire, wielding a colossal greatsword +2.",
        "personality": "Consumed by absolute, pathological vengeance. Hates Strahd above all else, but refuses to allow anyone to kill him, because death would end Strahd's eternal torment.",
        "backstory": "Leader of the Order of the Silver Dragon. Cut down by Strahd when Ravenloft's armies destroyed Argynvostholt. Rose as a revenant bound by hate.",
        "secret": "Will attack anyone attempting to destroy Strahd permanently. The beacon of Argynvostholt can lay his spirit to rest if the dragon's skull is returned.",
        "faction": "Order of the Silver Dragon",
        "location": "Argynvostholt",
        "loot": "+2 Greatsword, tarnished silver dragon medallion, keys to the Argynvostholt vault.",
        "statName": "Revenant Knight Commander",
        "statAcHp": "AC 17 • 136 HP",
        "statDetails": "Speed 30 ft • CR 7 (2,900 XP) • STR 18 (+4), DEX 14 (+2), CON 18 (+4), INT 13 (+1), WIS 16 (+3), CHA 18 (+4) • Immune to charm, exhaustion, fear, paralysis, poison",
        "cr": "7",
        "ac": 17,
        "hp": 136,
        "speed": "30 ft",
        "stats": {"str": 18, "dex": 14, "con": 18, "int": 13, "wis": 16, "cha": 18},
        "alignment": "Lawful Evil",
        "traits": [
            {"name": "Regeneration", "desc": "Regains 10 HP at the start of each turn. If destroyed, re-embodies in 24 hours."},
            {"name": "Vengeful Tracker", "desc": "Knows the distance and direction to his quarry (Strahd)."}
        ],
        "actions": [
            {"name": "Multiattack", "desc": "Makes two greatsword attacks."},
            {"name": "+2 Greatsword", "desc": "Melee Weapon Attack: +9 to hit, reach 5 ft. Hit: 2d6+6 slashing + 4d6 necrotic damage."}
        ]
    },
    {
        "id": "npc-godfrey",
        "name": "Sir Godfrey Gwilym",
        "epithet": "Fated Revenant Knight of the Silver Dragon",
        "species": "Undead / Revenant",
        "role": "Noble Paladin & Strahd's Fated Enemy",
        "category": "Allies",
        "voice": "Soft, noble, filled with ancient sorrow, echoing with righteous chivalry.",
        "appearance": "Handsome, sorrowful revenant knight in silver-crested chainmail, bearing the symbol of the Silver Dragon on his tabard. Eyes burn with calm white spectral light.",
        "personality": "Chivalrous, compassionate, horrified by Vladimir's descent into senseless vengeance.",
        "backstory": "Vladimir's second-in-command and beloved companion in life. Unlike Vladimir, Godfrey believes the order must help the living destroy Strahd and end Barovia's nightmare.",
        "secret": "If drawn as the Fated Ally in the Tarokka reading, his righteous oath overcomes Vladimir's command and he marches with the party to Ravenloft.",
        "faction": "Order of the Silver Dragon",
        "location": "Argynvostholt",
        "loot": "Silvered longsword, silver dragon holy symbol, 30 gp.",
        "statName": "Revenant Paladin",
        "statAcHp": "AC 15 • 136 HP",
        "statDetails": "Speed 30 ft • CR 6 (2,300 XP) • STR 18 (+4), DEX 12 (+1), CON 18 (+4), INT 13 (+1), WIS 16 (+3), CHA 17 (+3) • Paladin spellcaster",
        "cr": "6",
        "ac": 15,
        "hp": 136,
        "speed": "30 ft",
        "stats": {"str": 18, "dex": 12, "con": 18, "int": 13, "wis": 16, "cha": 17},
        "alignment": "Lawful Good",
        "traits": [
            {"name": "Regeneration", "desc": "Regains 10 HP at the start of each turn."},
            {"name": "Paladin Smite", "desc": "Can expend spell slots to deal extra radiant damage on longsword hits."}
        ],
        "actions": [
            {"name": "Multiattack", "desc": "Makes two longsword attacks."},
            {"name": "Longsword", "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft. Hit: 1d8+4 slashing + 2d8 radiant."}
        ]
    },
    {
        "id": "npc-baba-lysaga",
        "name": "Baba Lysaga",
        "epithet": "Mother of Strahd's Soul & Swamp Hag of Berez",
        "species": "Human / Swamp Witch",
        "role": "Dark Mother & Arch-Sorceress",
        "category": "Villains",
        "voice": "Shrill, croaking, fanatical cackling praise for her 'darling boy Strahd'.",
        "appearance": "Naked or filth-draped ancient crone with sagging wrinkled skin, bathing in warm blood inside a giant flying skull. Her fingernails are blackened talons.",
        "personality": "Deranged, motherly towards Strahd to the point of worship, deeply sadistic to all others.",
        "backstory": "Was the midwife who birthed Strahd. Believes she is his true spiritual mother. Consecrated him to the dark gods and poisoned Queen Ravenovia.",
        "secret": "Lives in a giant wooden hut that walks on gargantuan tree roots powered by a stolen magic winery gem.",
        "faction": "Unaffiliated",
        "location": "Ruins of Berez",
        "loot": "Giant flying giant's skull (vehicle), stolen green winery gem, wand of fear, stone pipe, 90 gp.",
        "statName": "Arch-Witch of Berez",
        "statAcHp": "AC 15 • 120 HP",
        "statDetails": "Speed 30 ft, Fly 40 ft (in skull) • CR 11 (7,200 XP) • STR 18 (+4), DEX 10 (+0), CON 16 (+3), INT 17 (+3), WIS 15 (+2), CHA 13 (+1) • Spell DC 17",
        "cr": "11",
        "ac": 15,
        "hp": 120,
        "speed": "30 ft, Fly 40 ft",
        "stats": {"str": 18, "dex": 10, "con": 16, "int": 17, "wis": 15, "cha": 13},
        "alignment": "Chaotic Evil",
        "traits": [
            {"name": "Shapechanger", "desc": "Can polymorph into a swarm of insects."},
            {"name": "Spellcasting", "desc": "16th-level spellcaster. Spells: Blight, Cloudkill, Finger of Death, Evard's Black Tentacles."}
        ],
        "actions": [
            {"name": "Multiattack", "desc": "Baba Lysaga makes three attacks with her iron claws or casts a spell."},
            {"name": "Claw", "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft. Hit: 2d8+4 slashing."}
        ]
    },
    {
        "id": "npc-mad-mage",
        "name": "The Mad Mage of Mount Baratok",
        "epithet": "Archmage Mordenkainen (Shattered Mind)",
        "species": "Human",
        "role": "Legendary Archmage & Fated Ally",
        "category": "Allies",
        "voice": "Wild, roaring, paranoid babbling in ancient draconic and high arcane tongues.",
        "appearance": "Wild-eyed old man in shredded velvet robes with hair down to his shoulders and beard down to his knees. Wields a staff of lightning bolts and casts spells without spellbooks.",
        "personality": "Completely paranoid, believes everyone is a shapeshifting spy of Strahd. If cured with Greater Restoration, his legendary brilliant mind returns.",
        "backstory": "The legendary archmage Mordenkainen of Oerth. Came to Barovia to free the valley, battled Strahd at Castle Ravenloft, and was hurled from the waterfalls, losing his mind and spellbook.",
        "secret": "A Greater Restoration or Mind Blank spell removes his madness and restores him to Archmage Mordenkainen.",
        "faction": "Unaffiliated",
        "location": "Town of Vallaki",
        "loot": "Staff of Power, spellbook cache hidden in private sanctum, 100 gp in crushed gems.",
        "statName": "Archmage",
        "statAcHp": "AC 15 • 99 HP",
        "statDetails": "Speed 30 ft • CR 12 (8,400 XP) • STR 10 (+0), DEX 14 (+2), CON 12 (+1), INT 20 (+5), WIS 15 (+2), CHA 16 (+3) • Spell DC 17",
        "cr": "12",
        "ac": 15,
        "hp": 99,
        "speed": "30 ft",
        "stats": {"str": 10, "dex": 14, "con": 12, "int": 20, "wis": 15, "cha": 16},
        "alignment": "Chaotic Neutral",
        "traits": [
            {"name": "Magic Resistance", "desc": "Advantage on saving throws against spells and other magical effects."},
            {"name": "Spellcasting", "desc": "18th-level archmage. Spells: Shield, Misty Step, Counterspell, Fireball, Teleport, Time Stop."}
        ],
        "actions": [
            {"name": "Staff Attack", "desc": "Melee Weapon Attack: +6 to hit, reach 5 ft. Hit: 1d6+2 bludgeoning."}
        ]
    },
    {
        "id": "npc-kiril",
        "name": "Kiril Stoyanovich",
        "epithet": "Alpha of the Svalich Werewolf Pack",
        "species": "Lycanthrope / Werewolf",
        "role": "Apex Predator & Strahd's Hound",
        "category": "Villains",
        "voice": "Deep, savage, sneering, filled with bloody feral dominance.",
        "appearance": "Muscular, scarred warrior in wolf pelts and leather harness. In wolf form: a massive black dire wolf with red burning eyes.",
        "personality": "Brutal, bloodthirsty, completely subservient to Strahd's will. Believes only the strongest deserve to survive.",
        "backstory": "Killed the previous pack alpha to claim leadership. Kidnaps children from Barovian villages and makes them fight to the death in the den; the survivor is infected with lycanthropy.",
        "secret": "Has imprisoned Zuleika's mate Emil in Castle Ravenloft's dungeons to keep her compliant.",
        "faction": "The Svalich Werewolf Pack",
        "location": "Werewolf Den",
        "loot": "Silver-tipped hunting spear, pelt of a winter wolf, key to child cage in werewolf cave, 35 gp.",
        "statName": "Werewolf Alpha",
        "statAcHp": "AC 14 • 90 HP",
        "statDetails": "Speed 40 ft (wolf form) • CR 5 (1,800 XP) • STR 18 (+4), DEX 14 (+2), CON 16 (+3), INT 11 (+0), WIS 12 (+1), CHA 12 (+1) • Immune to nonmagical nonsilvered attacks",
        "cr": "5",
        "ac": 14,
        "hp": 90,
        "speed": "40 ft",
        "stats": {"str": 18, "dex": 14, "con": 16, "int": 11, "wis": 12, "cha": 12},
        "alignment": "Chaotic Evil",
        "traits": [
            {"name": "Damage Immunity", "desc": "Immune to bludgeoning, piercing, and slashing from nonmagical attacks not made with silver."},
            {"name": "Keen Hearing and Smell", "desc": "Advantage on Perception checks relying on hearing or smell."}
        ],
        "actions": [
            {"name": "Multiattack", "desc": "Makes two attacks: one bite and one claw."},
            {"name": "Bite", "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft. Hit: 1d8+4 piercing. Target must succeed DC 14 Con save or be infected with lycanthropy."},
            {"name": "Claws", "desc": "Melee Weapon Attack: +7 to hit, reach 5 ft. Hit: 2d4+4 slashing."}
        ]
    },
    {
        "id": "npc-zuleika",
        "name": "Zuleika Toranescu",
        "epithet": "Imprisoned Werewolf Mate & Fated Ally",
        "species": "Lycanthrope / Werewolf",
        "role": "Rebellious Pack Mate",
        "category": "Allies",
        "voice": "Snarl that softens into guttural pleading for the return of her beloved mate.",
        "appearance": "Fierce she-wolf with grey-silver fur and amber eyes. In human form: wild-haired woman with severe battle scars guarding the cave shrine.",
        "personality": "Tormented by grief, loyal to her mate Emil, despises Kiril's cruel child-fighting practices.",
        "backstory": "Her mate Emil opposed Kiril's leadership. Kiril had Strahd take Emil away to the dungeons of Castle Ravenloft.",
        "secret": "Will ally with the party and fight Kiril to the death if the party promises to rescue Emil from Castle Ravenloft.",
        "faction": "The Svalich Werewolf Pack",
        "location": "Werewolf Den",
        "loot": "Carved bone pendant of Mother Night, 12 gp in tarnished silver.",
        "statName": "Werewolf",
        "statAcHp": "AC 12 • 58 HP",
        "statDetails": "Speed 30 ft, 40 ft (wolf) • CR 3 (700 XP) • STR 15 (+2), DEX 13 (+1), CON 14 (+2), INT 10 (+0), WIS 11 (+0), CHA 10 (+0) • Immune to nonsilvered weapons",
        "cr": "3",
        "ac": 12,
        "hp": 58,
        "speed": "30 ft",
        "stats": {"str": 15, "dex": 13, "con": 14, "int": 10, "wis": 11, "cha": 10},
        "alignment": "Chaotic Neutral",
        "traits": [
            {"name": "Damage Immunity", "desc": "Immune to nonmagical nonsilvered weapon attacks."}
        ],
        "actions": [
            {"name": "Bite", "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 1d8+2 piercing + curse of lycanthropy (DC 12 Con)."},
            {"name": "Claws", "desc": "Melee Weapon Attack: +4 to hit, reach 5 ft. Hit: 2d4+2 slashing."}
        ]
    },
    {
        "id": "npc-exethanter",
        "name": "Exethanter",
        "epithet": "Demilich Guardian of the Amber Temple",
        "species": "Undead / Lich",
        "role": "Amnesiac Keeper of Dark Secrets",
        "category": "Creatures",
        "voice": "Dusty, papery rattle like dry autumn leaves scraping across stone.",
        "appearance": "Floating jewel-encrusted skull with pinpoints of dull green light in its eye sockets. Surrounded by swirling dust and arcane runes.",
        "personality": "Senile, forgetful, indifferent to morality. Willing to share the dark secrets of the Amber Temple with anyone who shows respect.",
        "backstory": "The ancient lich who guarded the dark vestiges sealed in amber. Over centuries of solitude, his mind deteriorated and his body turned to dust.",
        "secret": "If targeted by a Greater Restoration spell, his mind clears and he remembers all the passwords to the amber vaults.",
        "faction": "Unaffiliated",
        "location": "The Amber Temple",
        "loot": "Spellbook etched on sheets of beaten copper, ruby eyes worth 1,000 gp each, wand of the war mage +2.",
        "statName": "Lich (Weakened Demilich)",
        "statAcHp": "AC 17 • 99 HP",
        "statDetails": "Speed 0 ft, Fly 30 ft (hover) • CR 10 (5,900 XP) • INT 20 (+5), WIS 14 (+2), CHA 16 (+3) • Legendary Actions",
        "cr": "10",
        "ac": 17,
        "hp": 99,
        "speed": "Fly 30 ft",
        "stats": {"str": 1, "dex": 10, "con": 10, "int": 20, "wis": 14, "cha": 16},
        "alignment": "Neutral Evil",
        "traits": [
            {"name": "Legendary Resistance (3/Day)", "desc": "If he fails a saving throw, he can choose to succeed instead."}
        ],
        "actions": [
            {"name": "Howl", "desc": "Each creature within 30 ft must succeed DC 15 Con save or drop to 0 HP."},
            {"name": "Life Drain", "desc": "Melee Spell Attack: +9 to hit. Hit: 6d6 necrotic damage. Regains equal HP."}
        ]
    }
]

ENCOUNTERS = [
    {
        "id": "enc-cos-death-house-shambler",
        "name": "1. Death House: Walter the Shambling Mound",
        "description": "In the flooded sacrificial chamber beneath Death House, the party awakens the cult's greatest horror: an enormous shambling mound formed of rot and sacrifice.",
        "location": "Village of Barovia",
        "difficulty": "Deadly",
        "totalXp": 1800,
        "monsters": [
            {"monsterId": "shambling-mound", "id": "shambling-mound", "name": "Shambling Mound", "count": 1, "cr": "5", "xp": 1800}
        ]
    },
    {
        "id": "enc-cos-death-house-crypt",
        "name": "2. Death House: Crypts of the Cult",
        "description": "Ghouls burst from shallow earthen graves in the winding catacombs beneath the Durst mansion, cutting off the escape route.",
        "location": "Village of Barovia",
        "difficulty": "Moderate",
        "totalXp": 1250,
        "monsters": [
            {"monsterId": "ghoul", "id": "ghoul", "name": "Ghoul", "count": 4, "cr": "1", "xp": 200},
            {"monsterId": "ghast", "id": "ghast", "name": "Ghast", "count": 1, "cr": "2", "xp": 450}
        ]
    },
    {
        "id": "enc-cos-svalich-wolves",
        "name": "3. Svalich Woods: Children of the Night",
        "description": "Dense fog blankets the Old Svalich Road as haunting howls echo from three directions. 2 Dire Wolves lead a hungry pack of 4 Barovian wolves.",
        "location": "Old Svalich Road",
        "difficulty": "Moderate",
        "totalXp": 600,
        "monsters": [
            {"monsterId": "dire-wolf", "id": "dire-wolf", "name": "Dire Wolf", "count": 2, "cr": "1", "xp": 200},
            {"monsterId": "wolf", "id": "wolf", "name": "Wolf", "count": 4, "cr": "1/4", "xp": 50}
        ]
    },
    {
        "id": "enc-cos-barovia-church-doru",
        "name": "4. Barovia Church: The Starving Son",
        "description": "Father Donavich weeps above while Doru, the starved vampire spawn locked in the church undercroft, bursts from the shadows smelling living blood.",
        "location": "Village of Barovia",
        "difficulty": "High",
        "totalXp": 1800,
        "monsters": [
            {"monsterId": "vampire-spawn", "id": "vampire-spawn", "name": "Vampire Spawn (Doru)", "count": 1, "cr": "5", "xp": 1800}
        ]
    },
    {
        "id": "enc-cos-barovia-graveyard",
        "name": "5. Barovia Graveyard: Night of the Risen Dead",
        "description": "During the burial of Burgomaster Kolyan Indirovich, dark clouds gather and skeletal claws erupt from fresh graves amidst the mist.",
        "location": "Village of Barovia",
        "difficulty": "Moderate",
        "totalXp": 500,
        "monsters": [
            {"monsterId": "zombie", "id": "zombie", "name": "Zombie", "count": 6, "cr": "1/4", "xp": 50},
            {"monsterId": "skeleton", "id": "skeleton", "name": "Skeleton", "count": 4, "cr": "1/4", "xp": 50}
        ]
    },
    {
        "id": "enc-cos-old-bonegrinder",
        "name": "6. Old Bonegrinder: Morgantha's Coven",
        "description": "The coven of three night hags unites their powers in the flour-dusted upper floor of the windmill, unleashing devastating shared spells.",
        "location": "Old Bonegrinder",
        "difficulty": "Deadly",
        "totalXp": 6500,
        "monsters": [
            {"monsterId": "night-hag", "id": "night-hag", "name": "Night Hag (Morgantha)", "count": 1, "cr": "7", "xp": 2900},
            {"monsterId": "night-hag", "id": "night-hag", "name": "Night Hag (Bella)", "count": 1, "cr": "5", "xp": 1800},
            {"monsterId": "night-hag", "id": "night-hag", "name": "Night Hag (Offalia)", "count": 1, "cr": "5", "xp": 1800}
        ]
    },
    {
        "id": "enc-cos-vallaki-coffin-spawn",
        "name": "7. Vallaki: The Feast of Saint Andral",
        "description": "6 Vampire Spawn burst out of shipping crates in the attic of Henrik van der Voort. Their goal: slaughter the town and extinguish the sacred bones.",
        "location": "Town of Vallaki",
        "difficulty": "Deadly",
        "totalXp": 10800,
        "monsters": [
            {"monsterId": "vampire-spawn", "id": "vampire-spawn", "name": "Vampire Spawn", "count": 6, "cr": "5", "xp": 1800}
        ]
    },
    {
        "id": "enc-cos-vallaki-cult-attic",
        "name": "8. Wachterhaus: Lady Wachter's Midnight Cult",
        "description": "Lady Fiona Wachter and her fanatical cultists gather in the candlelit cellar around a pentagram to summon shadowy fiends.",
        "location": "Town of Vallaki",
        "difficulty": "Moderate",
        "totalXp": 600,
        "monsters": [
            {"monsterId": "cultist-fanatic", "id": "cultist-fanatic", "name": "Cult Fanatic", "count": 1, "cr": "2", "xp": 450},
            {"monsterId": "cultist", "id": "cultist", "name": "Cultist", "count": 6, "cr": "1/8", "xp": 25}
        ]
    },
    {
        "id": "enc-cos-van-richten-tower",
        "name": "9. Van Richten's Tower: Pack of the Alpha",
        "description": "Werewolves from the Svalich pack track Ezmerelda's wagon to the causeway of Lake Baratok, ambushing the tower entrance.",
        "location": "Van Richten's Tower",
        "difficulty": "High",
        "totalXp": 3200,
        "monsters": [
            {"monsterId": "werewolf", "id": "werewolf", "name": "Werewolf", "count": 4, "cr": "3", "xp": 700},
            {"monsterId": "dire-wolf", "id": "dire-wolf", "name": "Dire Wolf", "count": 2, "cr": "1", "xp": 200}
        ]
    },
    {
        "id": "enc-cos-wizard-of-wines",
        "name": "10. Wizard of Wines: Infestation of the Fermenting Vats",
        "description": "Evil forest druids and wild berserkers have poisoned the wine fermentation vats, defiling the sacred cellars with foul rot.",
        "location": "The Wizard of Wines",
        "difficulty": "High",
        "totalXp": 3700,
        "monsters": [
            {"monsterId": "druid", "id": "druid", "name": "Evil Druid", "count": 2, "cr": "2", "xp": 450},
            {"monsterId": "berserker", "id": "berserker", "name": "Berserker", "count": 6, "cr": "2", "xp": 450}
        ]
    },
    {
        "id": "enc-cos-yester-hill-effigy",
        "name": "11. Yester Hill: Ritual of the Gulthias Tree",
        "description": "At the windswept summit of Yester Hill, mountain druids dance beneath thunderous skies as the ancient Gulthias Tree awakens to crush the valley.",
        "location": "Yester Hill",
        "difficulty": "Deadly",
        "totalXp": 4900,
        "monsters": [
            {"monsterId": "awakened-tree", "id": "awakened-tree", "name": "Gulthias Tree Blight", "count": 1, "cr": "2", "xp": 450},
            {"monsterId": "druid", "id": "druid", "name": "Mountain Druid", "count": 4, "cr": "2", "xp": 450},
            {"monsterId": "berserker", "id": "berserker", "name": "Wild Berserker", "count": 4, "cr": "2", "xp": 450}
        ]
    },
    {
        "id": "enc-cos-argynvostholt-knights",
        "name": "12. Argynvostholt: The Vengeful Revenants",
        "description": "Revenants of the Order of the Silver Dragon patrol the grand ruined ballroom, their hatred animating ancestral armor to challenge trespassers.",
        "location": "Argynvostholt",
        "difficulty": "High",
        "totalXp": 2700,
        "monsters": [
            {"monsterId": "knight", "id": "knight", "name": "Revenant Knight", "count": 1, "cr": "3", "xp": 700},
            {"monsterId": "warrior-veteran", "id": "warrior-veteran", "name": "Spectral Veteran", "count": 2, "cr": "3", "xp": 700},
            {"monsterId": "animated-armor", "id": "animated-armor", "name": "Silver Dragon Animated Armor", "count": 1, "cr": "1", "xp": 200}
        ]
    },
    {
        "id": "enc-cos-abbey-mongrelfolk",
        "name": "13. Abbey of Saint Markovia: The Flesh Golem Bride",
        "description": "In the belfry of the high abbey, the Abbot reveals his grotesque creation Vasilka as twisted mongrelfolk scream from courtyard cells.",
        "location": "Village of Krezk & Abbey of Saint Markovia",
        "difficulty": "Deadly",
        "totalXp": 7700,
        "monsters": [
            {"monsterId": "flesh-golem", "id": "flesh-golem", "name": "Vasilka (Flesh Golem)", "count": 1, "cr": "5", "xp": 1800},
            {"monsterId": "deva", "id": "deva", "name": "The Abbot (Fallen Deva)", "count": 1, "cr": "10", "xp": 5900}
        ]
    },
    {
        "id": "enc-cos-berez-baba-lysaga",
        "name": "14. Ruins of Berez: Baba Lysaga's Creeping Wrath",
        "description": "The foul swamp hag Baba Lysaga launches her giant skull into the air over the drowning ruins of Berez, summoning stinging vermin and swamp beasts.",
        "location": "Ruins of Berez",
        "difficulty": "Deadly",
        "totalXp": 3800,
        "monsters": [
            {"monsterId": "green-hag", "id": "green-hag", "name": "Baba Lysaga (Green Hag)", "count": 1, "cr": "3", "xp": 700},
            {"monsterId": "shambling-mound", "id": "shambling-mound", "name": "Creeping Swamp Shambler", "count": 1, "cr": "5", "xp": 1800},
            {"monsterId": "swarm-of-insects", "id": "swarm-of-insects", "name": "Swarm of Swamp Flies", "count": 2, "cr": "1/2", "xp": 100}
        ]
    },
    {
        "id": "enc-cos-werewolf-den",
        "name": "15. Werewolf Den: Lair of the Svalich Pack",
        "description": "Inside the natural cavern behind the waterfall, Kiril and his inner circle fight with savage fury to defend their captive children.",
        "location": "Werewolf Den",
        "difficulty": "Deadly",
        "totalXp": 5600,
        "monsters": [
            {"monsterId": "werewolf", "id": "werewolf", "name": "Werewolf Hunter", "count": 6, "cr": "3", "xp": 700},
            {"monsterId": "winter-wolf", "id": "winter-wolf", "name": "Winter Wolf", "count": 2, "cr": "3", "xp": 700}
        ]
    },
    {
        "id": "enc-cos-tsolenka-pass",
        "name": "16. Tsolenka Pass: Gatehouse of the Frozen Wind",
        "description": "Perched thousands of feet above the snowy abyss, two massive stone golems guard the frozen curtain wall alongside wailing specters.",
        "location": "Tsolenka Pass",
        "difficulty": "Deadly",
        "totalXp": 12700,
        "monsters": [
            {"monsterId": "stone-golem", "id": "stone-golem", "name": "Amber Gatekeeper (Stone Golem)", "count": 2, "cr": "10", "xp": 5900},
            {"monsterId": "ghost", "id": "ghost", "name": "Frozen Specter", "count": 2, "cr": "4", "xp": 1100}
        ]
    },
    {
        "id": "enc-cos-amber-temple-flames",
        "name": "17. The Amber Temple: The Sunken Vaults",
        "description": "In the colossal underground sanctum where dark vestiges whisper, ancient stone golems and shadows guard the sarcophagi of dark gods.",
        "location": "The Amber Temple",
        "difficulty": "Deadly",
        "totalXp": 14500,
        "monsters": [
            {"monsterId": "mage", "id": "mage", "name": "Amber Temple Arcane Guardian", "count": 1, "cr": "6", "xp": 2300},
            {"monsterId": "stone-golem", "id": "stone-golem", "name": "Stone Golem Sentinel", "count": 2, "cr": "10", "xp": 5900},
            {"monsterId": "shadow", "id": "shadow", "name": "Lurking Shadow", "count": 4, "cr": "1/2", "xp": 100}
        ]
    },
    {
        "id": "enc-cos-castle-ravenloft-spire",
        "name": "18. Castle Ravenloft: Climax with the Master",
        "description": "The final showdown atop the highest tower or deep in the catacombs. Count Strahd von Zarovich draws his blade surrounded by his vampire court.",
        "location": "Castle Ravenloft",
        "difficulty": "Deadly",
        "totalXp": 20250,
        "monsters": [
            {"monsterId": "vampire", "id": "vampire", "name": "Count Strahd von Zarovich", "count": 1, "cr": "15", "xp": 13000},
            {"monsterId": "vampire-spawn", "id": "vampire-spawn", "name": "Vampire Brides of Ravenloft", "count": 4, "cr": "5", "xp": 1800},
            {"monsterId": "swarm-of-bats", "id": "swarm-of-bats", "name": "Swarm of Bats", "count": 2, "cr": "1/4", "xp": 50}
        ]
    },
    {
        "id": "enc-cos-death-house-armor",
        "name": "19. Death House: The Animated Armor of the Balcony",
        "description": "As the heroes ascend the grand mahogany staircase toward the third-floor nursery, two imposing suits of blackened iron armor draw their steel blades and strike.",
        "location": "Village of Barovia (Death House)",
        "difficulty": "Moderate",
        "totalXp": 300,
        "monsters": [
            {"monsterId": "animated-armor", "id": "animated-armor", "name": "Animated Armor", "count": 1, "cr": "1", "xp": 200},
            {"monsterId": "animated-flying-sword", "id": "animated-flying-sword", "name": "Animated Flying Sword", "count": 2, "cr": "1/4", "xp": 50}
        ]
    },
    {
        "id": "enc-cos-death-house-shadows",
        "name": "20. Death House: Shadows in the Dark Shrine",
        "description": "Four shadowy apparitions detach from the damp stone walls of the relic shrine, whispering ancient praises to the Dark Powers as they reach for living strength.",
        "location": "Village of Barovia (Death House)",
        "difficulty": "High",
        "totalXp": 400,
        "monsters": [
            {"monsterId": "shadow", "id": "shadow", "name": "Relic Shrine Shadow", "count": 4, "cr": "1/2", "xp": 100}
        ]
    },
    {
        "id": "enc-cos-svalich-gallows",
        "name": "21. Old Svalich Road: The Corpse at the Crossroads",
        "description": "Beside the creaking wooden gallows, the hanging corpse turns to reveal the face of a party member! Skeletal claws burst from the muddy ditch as dead riders surround the road.",
        "location": "Old Svalich Road",
        "difficulty": "Moderate",
        "totalXp": 400,
        "monsters": [
            {"monsterId": "skeleton", "id": "skeleton", "name": "Barovian Skeleton", "count": 4, "cr": "1/4", "xp": 50},
            {"monsterId": "warhorse-skeleton", "id": "warhorse-skeleton", "name": "Skeletal Warhorse", "count": 1, "cr": "1/2", "xp": 100},
            {"monsterId": "zombie", "id": "zombie", "name": "Gallows Zombie", "count": 2, "cr": "1/4", "xp": 50}
        ]
    },
    {
        "id": "enc-cos-vallaki-town-guard",
        "name": "22. Town of Vallaki: Izek's Iron Enforcers",
        "description": "Baron Vallakovich's brutal enforcer Izek Strazni ignites his fiendish claw with blazing fire, cornering the party in the muddy town square for insolence.",
        "location": "Town of Vallaki",
        "difficulty": "Moderate",
        "totalXp": 800,
        "monsters": [
            {"monsterId": "warrior-veteran", "id": "warrior-veteran", "name": "Izek Strazni (Guard Captain)", "count": 1, "cr": "3", "xp": 700},
            {"monsterId": "guard", "id": "guard", "name": "Vallaki Town Guard", "count": 4, "cr": "1/8", "xp": 25}
        ]
    },
    {
        "id": "enc-cos-vallaki-arasek-vistani",
        "name": "23. Vallaki Outskirts: The Vistani Encampment",
        "description": "Distraught over the disappearance of young Arabelle, the Vistani brothers draw scimitars around their painted wagons, demanding answers from passing outlanders.",
        "location": "Town of Vallaki",
        "difficulty": "Moderate",
        "totalXp": 750,
        "monsters": [
            {"monsterId": "bandit-captain", "id": "bandit-captain", "name": "Luvash (Vistani Captain)", "count": 1, "cr": "2", "xp": 450},
            {"monsterId": "bandit", "id": "bandit", "name": "Vistani Scout", "count": 4, "cr": "1/8", "xp": 25},
            {"monsterId": "dire-wolf", "id": "dire-wolf", "name": "Camp War Wolf", "count": 1, "cr": "1", "xp": 200}
        ]
    },
    {
        "id": "enc-cos-lake-zarovich-bluto",
        "name": "24. Lake Zarovich: Sacrificial Waters",
        "description": "In a rowboat in the cold middle of Lake Zarovich, Bluto holds a burlap sack containing little Arabelle over the churning water, while drowned dead rise from the lake weeds.",
        "location": "Lake Zarovich",
        "difficulty": "Moderate",
        "totalXp": 525,
        "monsters": [
            {"monsterId": "bandit", "id": "bandit", "name": "Bluto Krogarov", "count": 1, "cr": "1/8", "xp": 25},
            {"monsterId": "ghoul", "id": "ghoul", "name": "Drowned Ghoul", "count": 2, "cr": "1", "xp": 200},
            {"monsterId": "giant-bat", "id": "giant-bat", "name": "Mist Strangler Bat", "count": 2, "cr": "1/4", "xp": 50}
        ]
    },
    {
        "id": "enc-cos-wagon-dragon-trap",
        "name": "25. Van Richten's Tower: The Wagon Trap & Gargoyles",
        "description": "Touching Ezmerelda's trapped vardo without disarming the door triggers a thunderous lightning detonation, awakening four ancient stone gargoyles perched on the tower turrets.",
        "location": "Van Richten's Tower",
        "difficulty": "High",
        "totalXp": 1800,
        "monsters": [
            {"monsterId": "gargoyle", "id": "gargoyle", "name": "Stone Gargoyle Guardian", "count": 4, "cr": "2", "xp": 450}
        ]
    },
    {
        "id": "enc-cos-wine-blight-siege",
        "name": "26. Wizard of Wines: Siege of the Needle Blights",
        "description": "Hundreds of thorns rattle against the cellar doors as the poisoned vineyards disgorge waves of bramble horrors commanded by howling mountain berserkers.",
        "location": "The Wizard of Wines",
        "difficulty": "High",
        "totalXp": 1650,
        "monsters": [
            {"monsterId": "berserker", "id": "berserker", "name": "Wild Vine Berserker", "count": 2, "cr": "2", "xp": 450},
            {"monsterId": "awakened-tree", "id": "awakened-tree", "name": "Corrupted Vine Blight", "count": 1, "cr": "2", "xp": 450},
            {"monsterId": "zombie", "id": "zombie", "name": "Rotting Vine Zombie", "count": 6, "cr": "1/4", "xp": 50}
        ]
    },
    {
        "id": "enc-cos-berez-scarecrow-ambush",
        "name": "27. Ruins of Berez: The Murmuring Scarecrows",
        "description": "Sackcloth heads stuffed with dead crows burst open with paralytic shrieks as Baba Lysaga's soul-bound scarecrows lunge from the murky swamp fog.",
        "location": "Ruins of Berez",
        "difficulty": "High",
        "totalXp": 2000,
        "monsters": [
            {"monsterId": "wight", "id": "wight", "name": "Baba Lysaga's Soul Scarecrow", "count": 2, "cr": "3", "xp": 700},
            {"monsterId": "specter", "id": "specter", "name": "Drowned Villager Specter", "count": 3, "cr": "1", "xp": 200}
        ]
    },
    {
        "id": "enc-cos-argynvost-vladimir",
        "name": "28. Argynvostholt: Vladimir Horngaard's Hall of Hatred",
        "description": "Seated upon his ruined throne with his greatsword across his knees, Sir Vladimir refuses to let Strahd die, commanding his revenant brotherhood to crush anyone who seeks peace.",
        "location": "Argynvostholt",
        "difficulty": "Deadly",
        "totalXp": 3300,
        "monsters": [
            {"monsterId": "knight", "id": "knight", "name": "Sir Vladimir Horngaard", "count": 1, "cr": "5", "xp": 1800},
            {"monsterId": "knight", "id": "knight", "name": "Revenant Knight of the Silver Dragon", "count": 2, "cr": "3", "xp": 700},
            {"monsterId": "animated-flying-sword", "id": "animated-flying-sword", "name": "Spectral Dragonblade", "count": 2, "cr": "1/4", "xp": 50}
        ]
    },
    {
        "id": "enc-cos-tsolenka-roc",
        "name": "29. Mount Ghakis: The Roc of the High Crags",
        "description": "Diving through howling blizzards over the 2,000-foot precipice of Tsolenka Pass, the monstrous two-hundred-foot wingspan terror descends to smash the guard tower and seize pack horses.",
        "location": "Tsolenka Pass",
        "difficulty": "Deadly",
        "totalXp": 7200,
        "monsters": [
            {"monsterId": "roc", "id": "roc", "name": "The Roc of Mount Ghakis", "count": 1, "cr": "11", "xp": 7200}
        ]
    },
    {
        "id": "enc-cos-amber-temple-neferon",
        "name": "30. The Amber Temple: Neferon's Watchtower",
        "description": "Sniping with Chain Lightning and Cone of Cold from the hollow head of the seventy-foot god statue, the jackal-headed fiend rains spells upon anyone crossing the temple floor.",
        "location": "The Amber Temple",
        "difficulty": "Deadly",
        "totalXp": 3500,
        "monsters": [
            {"monsterId": "mage", "id": "mage", "name": "Neferon the Arcanaloth", "count": 1, "cr": "9", "xp": 2300},
            {"monsterId": "specter", "id": "specter", "name": "Amber Vault Specter", "count": 4, "cr": "1", "xp": 200},
            {"monsterId": "shadow", "id": "shadow", "name": "Dark Vestige Shadow", "count": 4, "cr": "1/2", "xp": 100}
        ]
    },
    {
        "id": "enc-cos-ravenloft-heart",
        "name": "31. Castle Ravenloft: The Heart of Sorrow",
        "description": "Suspended in the high tower, a giant crystal heart pulses with crimson luminescence, protected by swirling halberds and Strahd's animated plate armor.",
        "location": "Castle Ravenloft",
        "difficulty": "Deadly",
        "totalXp": 2700,
        "monsters": [
            {"monsterId": "animated-armor", "id": "animated-armor", "name": "Strahd's Animated Plate Armor", "count": 1, "cr": "3", "xp": 700},
            {"monsterId": "animated-flying-sword", "id": "animated-flying-sword", "name": "Floating Halberd Guardian", "count": 4, "cr": "1/4", "xp": 50},
            {"monsterId": "vampire-spawn", "id": "vampire-spawn", "name": "Tower Vampire Guard", "count": 1, "cr": "5", "xp": 1800}
        ]
    },
    {
        "id": "enc-cos-ravenloft-rahadin",
        "name": "32. Castle Ravenloft: Rahadin's Execution Chamber",
        "description": "Strahd's ruthless dusk elf chamberlain draws his curved scimitar as the psychic screams of thousands of slaughtered innocents assault the minds of everyone in the room.",
        "location": "Castle Ravenloft",
        "difficulty": "Deadly",
        "totalXp": 6300,
        "monsters": [
            {"monsterId": "assassin", "id": "assassin", "name": "Rahadin (Chamberlain of Ravenloft)", "count": 1, "cr": "10", "xp": 5900},
            {"monsterId": "shadow", "id": "shadow", "name": "Soul Choir Shadow", "count": 4, "cr": "1/2", "xp": 100}
        ]
    }
]

HANDOUTS = [
    {
        "id": "hnd-cos-indirovich-plea",
        "title": "Kolyan Indirovich's Plea for Aid",
        "type": "letter",
        "theme": "parchment",
        "fontStyle": "cursive",
        "author": "Kolyan Indirovich, Burgomaster",
        "recipient": "To Valiant Travelers",
        "dateString": "Night of the Blood Moon",
        "content": (
            "Hail to thee of might and valor:\\n\\n"
            "We, the despairing folk of the village of Barovia, send our cry for aid into the world beyond. "
            "A creature of darkness and ancient malice stalks our lands, and my adopted daughter, the fair Ireena Kolyana, "
            "has been afflicted by his unholy bite. Twice he has visited her; a third time will seal her doom into living death.\\n\\n"
            "I beg you: haste to the village of Barovia. Protect my child, or take her far beyond the reach of Castle Ravenloft. "
            "Our wealth, our lives, and our eternal prayers are yours if you deliver us from the Devil Strahd.\\n\\n"
            "In desperate supplication,\\n"
            "Kolyan Indirovich, Burgomaster"
        ),
        "seal": "crown",
        "sealColor": "red",
        "isCoded": False,
        "status": "ready",
        "targetHeroId": "all",
        "targetHeroName": "All Party",
        "secretWhisper": "Delivered into your hands by a cloaked Vistani messenger outside the tavern.",
        "isDelivered": False,
        "tiedLocation": "Village of Barovia",
        "tiedNpc": "Ismark Kolyanovich"
    },
    {
        "id": "hnd-cos-strahd-forged",
        "title": "The Forged Letter of the Svalich Woods",
        "type": "letter",
        "theme": "vellum",
        "fontStyle": "blackletter",
        "author": "Kolyan Indirovich (Forged by Strahd)",
        "recipient": "Wayward Wanderers",
        "dateString": "Autumn Flamerule",
        "content": (
            "Hail to thee of might and valor:\\n\\n"
            "I, the Burgomaster of Barovia, send you honor and warning. Our fair land is infested with sickness and "
            "monsters of the wilderness. Do not venture into the mountains or approach the village gates, for all who enter "
            "are swallowed by the creeping mists.\\n\\n"
            "Turn back while your breath remains your own.\\n\\n"
            "Kolyan Indirovich"
        ),
        "seal": "skull",
        "sealColor": "silver",
        "isCoded": False,
        "status": "ready",
        "targetHeroId": "all",
        "targetHeroName": "All Party",
        "secretWhisper": "Discovered clutched in the cold hands of a dead traveler at the edge of the Svalich Woods.",
        "isDelivered": False,
        "tiedLocation": "Old Svalich Road",
        "tiedNpc": "Count Strahd von Zarovich"
    },
    {
        "id": "hnd-cos-tome-strahd-excerpt",
        "title": "Pages from the Tome of Strahd",
        "type": "parchment",
        "theme": "parchment",
        "fontStyle": "blackletter",
        "author": "Count Strahd von Zarovich",
        "recipient": "To Posterity",
        "dateString": "Year 351 of the Barovian Calendar",
        "content": (
            "I am the Ancient, I am the Land. My beginnings are lost amidst the darkness of the past.\\n\\n"
            "I was the warrior, I was good and just. I thundered across the land like the wrath of a just god, "
            "but the war years and the killing years wore down my soul as wind wears stone into dust.\\n\\n"
            "Then she arrived. Tatyana. Young, radiant, beautiful as the spring sunrise. I loved her with all that was left of my withered heart. "
            "Yet she looked upon me only as an elder brother, giving her adoration instead to Sergei, my youthful brother. "
            "He was handsome, carefree, and innocent. I hated him for it.\\n\\n"
            "On the day of their wedding, I sealed my pact with Death at the Amber Temple. I slit Sergei's throat and drank his blood. "
            "When Tatyana fled weeping to the castle overlook and cast herself into the thousand-foot abyss, the mists closed in forever.\\n\\n"
            "I am the master of Ravenloft. None leave this valley without my leave."
        ),
        "seal": "crown",
        "sealColor": "gold",
        "isCoded": False,
        "status": "ready",
        "targetHeroId": "all",
        "targetHeroName": "All Party",
        "secretWhisper": "Reveals Strahd's history, the tragic fate of Sergei, and the origin of his curse.",
        "isDelivered": False,
        "tiedLocation": "Castle Ravenloft",
        "tiedNpc": "Count Strahd von Zarovich"
    },
    {
        "id": "hnd-cos-dinner-invitation",
        "title": "Formal Dinner Invitation to Castle Ravenloft",
        "type": "letter",
        "theme": "parchment",
        "fontStyle": "cursive",
        "author": "Count Strahd von Zarovich",
        "recipient": "Honored Guests of Barovia",
        "dateString": "Night of the Crescent Moon",
        "content": (
            "My Honored Guests:\\n\\n"
            "You have traversed my lands with uncommon courage and provided me with rare amusement. "
            "Such vigor deserves civil conversation over spiced wine and fine roasted venison.\\n\\n"
            "I formally request the pleasure of your company for dinner at Castle Ravenloft on the morrow. "
            "A black carriage awaits your pleasure at the crossroads. You have my solemn personal oath of safe passage "
            "until the third bell after midnight strikes.\\n\\n"
            "Do not disappoint me.\\n\\n"
            "Count Strahd von Zarovich\\n"
            "Lord of Ravenloft"
        ),
        "seal": "crown",
        "sealColor": "gold",
        "isCoded": False,
        "status": "ready",
        "targetHeroId": "all",
        "targetHeroName": "All Party",
        "secretWhisper": "Handed to you by Rahadin, who bowed silently and stepped back into the shadows.",
        "isDelivered": False,
        "tiedLocation": "Castle Ravenloft",
        "tiedNpc": "Count Strahd von Zarovich"
    },
    {
        "id": "hnd-cos-journal-van-richten",
        "title": "Dr. van Richten's Vampire Anatomy Notes",
        "type": "journal",
        "theme": "vellum",
        "fontStyle": "cursive",
        "author": "Dr. Rudolph van Richten",
        "recipient": "To Any Who Hunt the Night",
        "dateString": "Session Notes 73",
        "content": (
            "Observations on the Lord of Ravenloft:\\n\\n"
            "1. SUNLIGHT HYPOTHESIS: Strahd suffers 20 radiant damage at the start of his turn in direct sunlight, "
            "and his supernatural regeneration is instantly neutralized. The Sunsword or Holy Symbol of Ravenkind are essential.\\n\\n"
            "2. THE HEART OF SORROW: Intelligence suggests an arcane crystalline heart suspended high in the North Tower "
            "absorbs the first fifty points of trauma dealt to Strahd. Destroy the heart before entering the fated tomb.\\n\\n"
            "3. RUNNING WATER: The Ivlis River burns his flesh like acid (20 acid damage per round), though he can mist across.\\n\\n"
            "4. STAKING: A wooden stake driven through his heart while incapacitated in his stone coffin will paralyze him permanently."
        ),
        "seal": "tree",
        "sealColor": "emerald",
        "isCoded": False,
        "status": "ready",
        "targetHeroId": "all",
        "targetHeroName": "All Party",
        "secretWhisper": "Torn page recovered from the hidden compartment of Rictavio's carnival wagon.",
        "isDelivered": False,
        "tiedLocation": "Van Richten's Tower",
        "tiedNpc": "Dr. Rudolph van Richten"
    }
]

LOCATIONS = [
    {"id": "loc-village-barovia", "name": "Village of Barovia", "type": "Settlement", "description": "A dismal, fog-choked village in the shadow of Castle Ravenloft. Most homes are shuttered with claw marks on the doors."},
    {"id": "loc-castle-ravenloft", "name": "Castle Ravenloft", "type": "Dungeon / Fortress", "description": "The terrifying gothic fortress of Count Strahd von Zarovich, perched upon a thousand-foot pillar of stone with over 80 rooms."},
    {"id": "loc-tser-pool", "name": "Tser Pool Encampment", "type": "Wilderness Encampment", "description": "The colorful tent camp of the Vistani beside a rushing waterfall, where Madam Eva reads the Tarokka deck."},
    {"id": "loc-old-bonegrinder", "name": "Old Bonegrinder", "type": "Windmill", "description": "A decrepit four-story windmill where Morgantha and her coven grind children's bones into addictive dream pastries."},
    {"id": "loc-vallaki", "name": "Town of Vallaki", "type": "Walled Town", "description": "The largest settlement in Barovia, ruled by Baron Vargas Vallakovich who mandates ceaseless happy festivals under pain of arrest."},
    {"id": "loc-argynvostholt", "name": "Argynvostholt", "type": "Fortress Ruins", "description": "The ancestral mansion of the Order of the Silver Dragon, guarded by vengeful revenants who refuse to let Barovia find peace until Strahd dies."},
    {"id": "loc-krezk", "name": "Village of Krezk & Abbey of Saint Markovia", "type": "Settlement / Abbey", "description": "A walled alpine village sheltered beneath a cliffside abbey where a mad celestial Deva sculpts flesh golems."},
    {"id": "loc-winery", "name": "The Wizard of Wines", "type": "Vineyard", "description": "The vineyard and winery of the Martikov family, the sole source of wine in all Barovia, currently overrun by evil druids and blights."},
    {"id": "loc-yester-hill", "name": "Yester Hill", "type": "Wilderness Hill", "description": "A windswept mound topped by standing stones and a Gulthias tree, facing a misty phantom vision of Strahd's ancient homeland."},
    {"id": "loc-berez", "name": "Ruins of Berez", "type": "Swamp Ruins", "description": "A flooded ghost town drowned by Strahd centuries ago, now the hunting ground of the wicked swamp hag Baba Lysaga."},
    {"id": "loc-tower", "name": "Van Richten's Tower", "type": "Wizard Tower", "description": "A four-story stone tower on the shores of Lake Baratok, protected by a lightning trap and an anti-magic field."},
    {"id": "loc-amber-temple", "name": "The Amber Temple", "type": "Ancient Mountain Vault", "description": "A subterranean temple carved into Mount Baratok's glaciers, housing the amber sarcophagi of dark gods and vestiges of ultimate evil."}
]

FACTIONS = [
    {"id": "fac-keepens-feather", "name": "Keepers of the Feather", "alignment": "Lawful Good", "reputation": "Friendly", "description": "A secret society of wereravens based out of the Wizard of Wines and Blue Water Inn. They aid good adventurers against Strahd."},
    {"id": "fac-vistani", "name": "The Vistani", "alignment": "True Neutral", "reputation": "Neutral", "description": "Nomadic travelers with immunity to the mists. Some are loyal allies of Madam Eva, while others act as eyes and ears for Strahd."},
    {"id": "fac-silver-dragon", "name": "Order of the Silver Dragon", "alignment": "Lawful Evil (Revenants)", "reputation": "Hostile", "description": "Undead knights led by Vladimir Horngaard. They hate Strahd, but want him to suffer forever in Barovia rather than be destroyed."},
    {"id": "fac-wachter-cult", "name": "The Wachter Cult", "alignment": "Lawful Evil", "reputation": "Hostile", "description": "A secret devil-worshiping cabal in Vallaki led by Lady Fiona Wachter, scheming to overthrow the Burgomaster and open the gates to Strahd."},
    {"id": "fac-werewolves", "name": "The Svalich Werewolf Pack", "alignment": "Chaotic Evil", "reputation": "Hostile", "description": "A ferocious pack of lycanthropes led by Kiril Stoyanovich, kidnapping children from Barovian villages to swell their ranks."}
]

def get_cos_roster() -> List[Dict[str, Any]]:
    return list(NPCS)

def get_cos_encounters() -> List[Dict[str, Any]]:
    return list(ENCOUNTERS)

def get_cos_handouts() -> List[Dict[str, Any]]:
    return list(HANDOUTS)

def get_cos_locations() -> List[Dict[str, Any]]:
    return list(LOCATIONS)

def get_cos_factions() -> List[Dict[str, Any]]:
    return list(FACTIONS)

def get_cos_quests() -> Dict[str, Any]:
    return {
        "quests": [
            {"id": "qst-cos-1", "title": "The Tarokka Reading of Madam Eva", "category": "Main Quest", "status": "active", "objective": "Travel to the Vistani camp at Tser Pool and learn the locations of the 3 relics and your fated ally."},
            {"id": "qst-cos-2", "title": "Escort Ireena Kolyana to Safety", "category": "Main Quest", "status": "active", "objective": "Escort Ireena out of the village of Barovia to the fortified town of Vallaki or the walled abbey of Krezk."},
            {"id": "qst-cos-3", "title": "The Bones of Saint Andral", "category": "Side Quest", "status": "active", "objective": "Recover the stolen holy bones to re-consecrate St. Andral's church before Strahd's spawn strike."},
            {"id": "qst-cos-4", "title": "Deliver Wine to Barovia", "category": "Side Quest", "status": "active", "objective": "Investigate the Wizard of Wines winery and recover the stolen magic gems to restart wine shipments."},
            {"id": "qst-cos-5", "title": "Light the Beacon of Argynvostholt", "category": "Side Quest", "status": "active", "objective": "Retrieve the skull of the silver dragon Argynvost from Castle Ravenloft and ignite the beacon to bring peace to the revenants."},
            {"id": "qst-cos-6", "title": "Confront the Devil Strahd", "category": "Climax", "status": "active", "objective": "Infiltrate Castle Ravenloft, destroy the Heart of Sorrow, and destroy Strahd in his fated lair."}
        ],
        "rumors": [
            {"id": "rmr-cos-1", "text": "The Burgomaster's son Ismark is offering coin to any warrior willing to take his sister away from the village.", "source": "Blood of the Vine Tavern"},
            {"id": "rmr-cos-2", "text": "The ravens of Barovia are not mere birds—they watch the roads and leave shiny trinkets for good souls.", "source": "Urwin Martikov"},
            {"id": "rmr-cos-3", "text": "Do not eat the dream pastries sold by the old woman with the wooden cart. Those who eat them slip into a waking nightmare.", "source": "Townsfolk of Vallaki"},
            {"id": "rmr-cos-4", "text": "A carnival master named Rictavio arrived in Vallaki with a saber-toothed tiger in his wagon.", "source": "Blue Water Inn Patrons"}
        ]
    }

def get_cos_time_weather() -> Dict[str, Any]:
    return {
        "day": 1,
        "hour": 16,
        "minute": 30,
        "season": "Autumn",
        "weather": {
            "temperature": "Chilly (44°F)",
            "wind": "Cold Mountain Breeze",
            "precipitation": "Heavy Mists & Grey Drizzle",
            "tacticalEffect": "Disadvantage on Wisdom (Perception) checks relying on sight beyond 60 ft."
        },
        "moonPhase": "Waxing Gibbous",
        "activeTimers": []
    }


def get_cos_dungeons() -> List[Dict[str, Any]]:
    return [
        {
            "id": "dungeon-death-house",
            "name": "Death House (Durst Manor)",
            "subtitle": "Curse of Strahd • Levels 1-3 Starter Dungeon",
            "region": "Village of Barovia",
            "description": "A four-story townhouse with a sinister past and a hidden sub-basement cult undercroft beneath the cobblestones.",
            "activeChamberId": "dh-1",
            "levels": [
                {"id": "lvl-dh-all", "name": "All Floors"},
                {"id": "lvl-dh-1", "name": "1. Ground Floor"},
                {"id": "lvl-dh-2", "name": "2. Upper Floor"},
                {"id": "lvl-dh-3", "name": "3. Attic"},
                {"id": "lvl-dh-4", "name": "4. Cult Undercroft"}
            ],
            "nodes": [
                {
                    "id": "dh-1",
                    "code": "Area 1",
                    "name": "Entrance Hall",
                    "level": "lvl-dh-1",
                    "x": 140,
                    "y": 140,
                    "state": "active",
                    "boxedText": "A wrought-iron gate with trefoils leads into an arched entrance hall. The walls are paneled in dark wood carved with weeping angels, twisting ivy, and coiled serpents. A heavy, iron-bound oak door stands at the far end.",
                    "lighting": "Darkness • Extinguished iron wall lanterns",
                    "atmosphere": "Drafty mountain air, scent of ancient furniture wax and dried lavender.",
                    "features": [
                        "Intricately carved mahogany paneling depicting cherubs and weeping angels.",
                        "Durst family heraldic shield on wall: a golden windmill on a field of black sable."
                    ],
                    "secrets": [
                        {"dc": 12, "skill": "Perception", "text": "Close examination reveals disturbing details in the carvings: the weeping angels have serpents in their eye sockets, and innocent cherubs are choking on thorned vines."}
                    ],
                    "traps": [],
                    "encounters": [],
                    "loot": [],
                    "exits": [
                        {"target": "dh-2", "label": "Main Hall", "type": "door", "state": "closed"}
                    ]
                },
                {
                    "id": "dh-2",
                    "code": "Area 2",
                    "name": "Main Hall",
                    "level": "lvl-dh-1",
                    "x": 360,
                    "y": 140,
                    "state": "unexplored",
                    "boxedText": "A wide hall with a black-and-white checkerboard marble floor opens before you. A grand mahogany staircase curves upward with sculpted railings. A tall grandfather clock in the corner ticks with a hollow, rhythmic cadence.",
                    "lighting": "Dim light filtering through fogged bay windows",
                    "atmosphere": "The rhythmic, heavy tick-tock of the tall grandfather clock echoes through the empty mansion.",
                    "features": [
                        "Grand sweeping staircase ascending to the second floor.",
                        "A brass grandfather clock that is meticulously wound and keeps exact Barovian time."
                    ],
                    "secrets": [
                        {"dc": 14, "skill": "Investigation", "text": "The clock mechanism is pristine and ticking despite decades of thick dust on every other surface in the foyer."}
                    ],
                    "traps": [],
                    "encounters": [],
                    "loot": [],
                    "exits": [
                        {"target": "dh-1", "label": "Entrance Hall", "type": "door", "state": "open"},
                        {"target": "dh-3", "label": "Den of Wolves", "type": "door", "state": "closed"},
                        {"target": "dh-4", "label": "Kitchen & Pantry", "type": "door", "state": "closed"},
                        {"target": "dh-5", "label": "Dining Room", "type": "door", "state": "closed"},
                        {"target": "dh-6", "label": "Upper Hall", "type": "stairs", "state": "open"}
                    ]
                },
                {
                    "id": "dh-3",
                    "code": "Area 3",
                    "name": "Den of Wolves",
                    "level": "lvl-dh-1",
                    "x": 580,
                    "y": 140,
                    "state": "unexplored",
                    "boxedText": "This oak-paneled den is decorated with the trophies of a dedicated hunter. Mounted wolves' heads stare with glass eyes from the walls, and a large taxidermied dire wolf stands snarling on a pedestal. An unlit stone hearth anchors the far wall.",
                    "lighting": "Darkness • Unlit hearth",
                    "atmosphere": "Smell of old animal hide, turpentine, and dry ash.",
                    "features": [
                        "Mounted heads of seven mountain wolves and one enormous dire wolf.",
                        "Comfortable high-backed leather armchairs beside a stone hearth."
                    ],
                    "secrets": [
                        {"dc": 15, "skill": "Perception", "text": "A secret button hidden behind the mounted dire wolf's ear slides open a concealed panel in the oak mantelpiece, holding a silver hip flask of dwarven brandy (worth 25 gp)."}
                    ],
                    "traps": [],
                    "encounters": [],
                    "loot": [
                        {"name": "Silver Hip Flask of Dwarven Brandy", "quantity": "1", "notes": "Worth 25 gp, contains 4 sips of potent warming spirit"}
                    ],
                    "exits": [
                        {"target": "dh-2", "label": "Main Hall", "type": "door", "state": "closed"}
                    ]
                },
                {
                    "id": "dh-4",
                    "code": "Area 4",
                    "name": "Kitchen & Pantry",
                    "level": "lvl-dh-1",
                    "x": 360,
                    "y": 300,
                    "state": "unexplored",
                    "boxedText": "A tidy kitchen features a high ceiling with iron hooks for smoked meats, now empty. A cold stone hearth with an iron spit dominates one wall. A small dumbwaiter shaft with heavy hemp rope is built into the corner wall.",
                    "lighting": "Darkness",
                    "atmosphere": "Faint sour odor of vinegar and rotten flour.",
                    "features": [
                        "Worktables scrubbed spotless with dried cleavers and carving knives.",
                        "Dumbwaiter shaft connecting directly to the second-floor library and third-floor master suite."
                    ],
                    "secrets": [
                        {"dc": 10, "skill": "Athletics", "text": "A Small creature can squeeze inside the dumbwaiter box to travel between floors."}
                    ],
                    "traps": [],
                    "encounters": [],
                    "loot": [
                        {"name": "Iron Chef's Cleaver", "quantity": "1", "notes": "Usable as a dagger"}
                    ],
                    "exits": [
                        {"target": "dh-2", "label": "Main Hall", "type": "door", "state": "closed"},
                        {"target": "dh-5", "label": "Dining Room", "type": "door", "state": "closed"},
                        {"target": "dh-7", "label": "Servants' Stair", "type": "door", "state": "closed"}
                    ]
                },
                {
                    "id": "dh-5",
                    "code": "Area 5",
                    "name": "Dining Room",
                    "level": "lvl-dh-1",
                    "x": 580,
                    "y": 300,
                    "state": "unexplored",
                    "boxedText": "In the center of this stately room, a mahogany dining table is surrounded by eight high-backed chairs. A crystal chandelier hangs overhead, coated in spiderwebs. The wall paneling depicts feast scenes that turn subtly into cannibalistic depravity.",
                    "lighting": "Darkness",
                    "atmosphere": "Chilly and still.",
                    "features": [
                        "Resplendent crystal chandelier hanging from a central ceiling medallion.",
                        "Silverware set for eight guests, polished to a dull shine."
                    ],
                    "secrets": [
                        {"dc": 12, "skill": "Investigation", "text": "The carved scenes in the paneling show noble men and women smiling warmly while drinking chalices filled with what appears to be human blood."}
                    ],
                    "traps": [],
                    "encounters": [],
                    "loot": [
                        {"name": "Fine Silver Tableware Set", "quantity": "8 sets", "notes": "Worth 50 gp total, stamped with Durst windmill crest"}
                    ],
                    "exits": [
                        {"target": "dh-2", "label": "Main Hall", "type": "door", "state": "closed"},
                        {"target": "dh-4", "label": "Kitchen & Pantry", "type": "door", "state": "closed"}
                    ]
                },
                {
                    "id": "dh-6",
                    "code": "Area 6",
                    "name": "Upper Hall",
                    "level": "lvl-dh-2",
                    "x": 360,
                    "y": 140,
                    "state": "unexplored",
                    "boxedText": "Unlit oil lamps hang from red velvet-papered walls. Mounted oil paintings depict stern Durst ancestors whose painted eyes seem to judge every step. The mahogany staircase continues upward toward a dark third floor.",
                    "lighting": "Darkness",
                    "atmosphere": "Soft creaking timber and heavy oppressive stillness.",
                    "features": [
                        "Portrait gallery of Gustav and Elisabeth Durst posing proudly with their infant child.",
                        "Balcony overlook looking down onto Area 2 Main Hall."
                    ],
                    "secrets": [],
                    "traps": [],
                    "encounters": [],
                    "loot": [],
                    "exits": [
                        {"target": "dh-2", "label": "Main Hall (Downstairs)", "type": "stairs", "state": "open"},
                        {"target": "dh-8", "label": "Library & Secret Room", "type": "door", "state": "closed"},
                        {"target": "dh-9", "label": "Conservatory", "type": "door", "state": "closed"},
                        {"target": "dh-10", "label": "Balcony & Third Floor", "type": "stairs", "state": "open"}
                    ]
                },
                {
                    "id": "dh-7",
                    "code": "Area 7",
                    "name": "Servants' Stair",
                    "level": "lvl-dh-2",
                    "x": 140,
                    "y": 220,
                    "state": "unexplored",
                    "boxedText": "A narrow, steep spiral wooden staircase ascends without risers in the damp darkness between floors, intended for quiet servant movement.",
                    "lighting": "Pitch darkness",
                    "atmosphere": "Musty, cramped, smelling of raw timber.",
                    "features": ["Tight wooden spiral staircase connecting Kitchen (Area 4), Second Floor, and Attic (Area 13)."],
                    "secrets": [],
                    "traps": [],
                    "encounters": [],
                    "loot": [],
                    "exits": [
                        {"target": "dh-4", "label": "Kitchen & Pantry (Floor 1)", "type": "stairs", "state": "open"},
                        {"target": "dh-6", "label": "Upper Hall (Floor 2)", "type": "door", "state": "closed"},
                        {"target": "dh-13", "label": "Servants' Quarters (Attic)", "type": "stairs", "state": "open"}
                    ]
                },
                {
                    "id": "dh-8",
                    "code": "Area 8",
                    "name": "Library & Secret Room",
                    "level": "lvl-dh-2",
                    "x": 580,
                    "y": 140,
                    "state": "unexplored",
                    "boxedText": "Floor-to-ceiling mahogany bookshelves line this solemn library. A heavy oak desk sits facing a stone hearth with an iron fire poker. The titles on the shelves treat of dark rituals, necromancy, and ancient bloodlines.",
                    "lighting": "Darkness",
                    "atmosphere": "Heavy smell of leather bindings and decaying parchment.",
                    "features": [
                        "Hundreds of tomes covering history, demonology, and alchemy.",
                        "Locked iron desk drawer holding a key with a feather motif."
                    ],
                    "secrets": [
                        {"dc": 15, "skill": "Perception", "text": "Pulling a false volume entitled 'The King in Golden Raiment' on the north shelf swings open a secret door into a hidden walk-in archive room."}
                    ],
                    "traps": [],
                    "encounters": [],
                    "loot": [
                        {"name": "Deed to Durst Manor", "quantity": "1", "notes": "Official legal parchment"},
                        {"name": "Deed to Old Bonegrinder Windmill", "quantity": "1", "notes": "Signed by Gustav Durst"},
                        {"name": "Letter from Strahd von Zarovich", "quantity": "1", "notes": "Handout: Strahd dismissing Gustav's cult as pathetic worms"}
                    ],
                    "exits": [
                        {"target": "dh-6", "label": "Upper Hall", "type": "door", "state": "closed"}
                    ]
                },
                {
                    "id": "dh-9",
                    "code": "Area 9",
                    "name": "Conservatory",
                    "level": "lvl-dh-2",
                    "x": 580,
                    "y": 300,
                    "state": "unexplored",
                    "boxedText": "Gauzy white dust covers drape over a standing harp and an ivory-keyed harpsichord. A tall arched stained-glass window looks out into the dreary Barovian mist.",
                    "lighting": "Pale gray exterior light",
                    "atmosphere": "A single note resonates faintly from the harp when the door opens.",
                    "features": [
                        "Ornate standing harp carved with weeping dryads.",
                        "Harpsichord with yellowed ivory keys."
                    ],
                    "secrets": [
                        {"dc": 12, "skill": "Performance", "text": "Playing a minor chord on the harpsichord reveals a secret velvet-lined compartment inside the soundboard containing a Potion of Climbing."}
                    ],
                    "traps": [],
                    "encounters": [],
                    "loot": [
                        {"name": "Potion of Climbing", "quantity": "1 vial", "notes": "Clear brown liquid with white sediment"}
                    ],
                    "exits": [
                        {"target": "dh-6", "label": "Upper Hall", "type": "door", "state": "closed"}
                    ]
                },
                {
                    "id": "dh-10",
                    "code": "Area 10",
                    "name": "Balcony & Animated Armor",
                    "level": "lvl-dh-3",
                    "x": 360,
                    "y": 120,
                    "state": "unexplored",
                    "boxedText": "A wooden balcony wraps around the grand stairwell, thirty feet above the ground floor. In an arched alcove at the center stands an imposing suit of blackened plate armor adorned with wolf-head pauldrons, gripping a greatsword.",
                    "lighting": "Dim light",
                    "atmosphere": "A chill draft sighs along the balcony.",
                    "features": [
                        "Blackened iron plate armor that stirs with unnatural malice when anyone approaches within 5 feet.",
                        "Two flying broadswords hovering in the upper shadows."
                    ],
                    "secrets": [
                        {"dc": 14, "skill": "Arcana", "text": "The armor radiates abjuration and transmutation magic—it is an Animated Armor primed to push trespassers off the balcony."}
                    ],
                    "traps": [
                        {"name": "Balcony Plunge Hazard", "dc": 13, "trigger": "Armor attempts to shove targets over the 30-ft railing", "effect": "3d6 bludgeoning falling damage and prone in Area 2"}
                    ],
                    "encounters": [
                        {"id": "enc-cos-death-house-armor", "name": "19. Death House: The Animated Armor of the Balcony", "cr": "2", "monsters": [{"name": "Animated Armor", "hp": 33}, {"name": "Flying Sword", "hp": 17}]}
                    ],
                    "loot": [],
                    "exits": [
                        {"target": "dh-6", "label": "Upper Hall (Floor 2)", "type": "stairs", "state": "open"},
                        {"target": "dh-11", "label": "Master Suite", "type": "door", "state": "closed"},
                        {"target": "dh-13", "label": "Servants' Quarters", "type": "door", "state": "closed"},
                        {"target": "dh-14", "label": "Children's Bedroom", "type": "door", "state": "locked"}
                    ]
                },
                {
                    "id": "dh-11",
                    "code": "Area 11",
                    "name": "Master Suite",
                    "level": "lvl-dh-3",
                    "x": 580,
                    "y": 120,
                    "state": "unexplored",
                    "boxedText": "A grand mahogany four-poster bed is draped in moth-eaten gossamer lace. An alabaster fireplace sits cold across from a vanity table with an oval glass mirror framed in carved ivy.",
                    "lighting": "Darkness",
                    "atmosphere": "Stale air of perfume gone sour.",
                    "features": [
                        "Silk-lined jewelry box on vanity with a silver comb and garnet ring.",
                        "Adjoining door to Area 12 Nursery."
                    ],
                    "secrets": [
                        {"dc": 13, "skill": "Investigation", "text": "In the wardrobe, behind heavy winter furs, is a secret compartment holding a velvet pouch with 40 gp and 100 sp."}
                    ],
                    "traps": [],
                    "encounters": [],
                    "loot": [
                        {"name": "Garnet Silver Ring", "quantity": "1", "notes": "Worth 50 gp"},
                        {"name": "Velvet Pouch of Coin", "quantity": "40 gp, 100 sp", "notes": "Old Barovian stamped coins"}
                    ],
                    "exits": [
                        {"target": "dh-10", "label": "Balcony & Third Floor", "type": "door", "state": "closed"},
                        {"target": "dh-12", "label": "Nursery", "type": "door", "state": "closed"}
                    ]
                },
                {
                    "id": "dh-12",
                    "code": "Area 12",
                    "name": "Nursery & Nursemaid's Specter",
                    "level": "lvl-dh-3",
                    "x": 580,
                    "y": 260,
                    "state": "unexplored",
                    "boxedText": "A crib draped in black netting sits in the center of the nursery. Beside it is a rocking chair that rocks gently of its own accord. A translucent figure of a young weeping woman rises from the shadows, her spectral face contorting into an agonized shriek!",
                    "lighting": "Faint cold ghostly glow",
                    "atmosphere": "The spectral temperature plummets below freezing. Breath fogs instantly.",
                    "features": [
                        "Empty crib with bundled blankets (no baby inside).",
                        "Weeping specter of the Nursemaid who was murdered after giving birth to Gustav's bastard child Walter."
                    ],
                    "secrets": [
                        {"dc": 12, "skill": "Insight", "text": "The specter shrieks 'My baby! Where is my Walter?!' and attacks furiously if anyone touches the crib."}
                    ],
                    "traps": [],
                    "encounters": [
                        {"id": "enc-cos-nursemaid-specter", "name": "Nursemaid's Wailing Specter", "cr": "1", "monsters": [{"name": "Specter (Nursemaid)", "hp": 22}]}
                    ],
                    "loot": [],
                    "exits": [
                        {"target": "dh-11", "label": "Master Suite", "type": "door", "state": "closed"}
                    ]
                },
                {
                    "id": "dh-13",
                    "code": "Area 13",
                    "name": "Servants' Quarters",
                    "level": "lvl-dh-3",
                    "x": 140,
                    "y": 120,
                    "state": "unexplored",
                    "boxedText": "Sparse wooden bunks with moldering straw mattresses crowd this uninsulated attic corner. Rain patters against bare rafters.",
                    "lighting": "Darkness",
                    "atmosphere": "Smell of damp wool, straw, and mice droppings.",
                    "features": ["Storage trunks with plain wool cloaks and servant uniforms."],
                    "secrets": [],
                    "traps": [],
                    "encounters": [],
                    "loot": [],
                    "exits": [
                        {"target": "dh-10", "label": "Balcony & Third Floor", "type": "door", "state": "closed"},
                        {"target": "dh-7", "label": "Servants' Stair (Down to Floor 1)", "type": "stairs", "state": "open"},
                        {"target": "dh-15", "label": "Attic Storage & Secret Stair", "type": "door", "state": "closed"}
                    ]
                },
                {
                    "id": "dh-14",
                    "code": "Area 14",
                    "name": "Children's Bedroom (Rose & Thorn)",
                    "level": "lvl-dh-3",
                    "x": 140,
                    "y": 260,
                    "state": "unexplored",
                    "boxedText": "The heavy door is padlocked from the outside. Inside, small twin beds are covered in dust. Sitting on the floor among wooden toys are two ghostly children holding hands: ten-year-old Rosavalda and seven-year-old Thornboldt, crying softly in the dark.",
                    "lighting": "Ethereal translucent blue-gray glow from the ghosts",
                    "atmosphere": "Profound sadness, faint smell of cedar and childhood tears.",
                    "features": [
                        "Skeletons of Rose and Thorn curled under the bedsheets (locked in by their parents and starved to death).",
                        "An exquisite dollhouse at the foot of the bed that is a perfect replica of the manor."
                    ],
                    "secrets": [
                        {"dc": 10, "skill": "Investigation", "text": "Examining the dollhouse reveals a hidden trapdoor in the attic storage room that opens to a secret spiral stone staircase leading hundreds of feet beneath the mansion."}
                    ],
                    "traps": [],
                    "encounters": [
                        {"id": "enc-cos-ghost-children", "name": "Ghosts of Rose and Thorn (Roleplay / Possession Hazard)", "cr": "1/2", "monsters": [{"name": "Ghost of Rose Durst", "hp": 15}, {"name": "Ghost of Thorn Durst", "hp": 12}]}
                    ],
                    "loot": [],
                    "exits": [
                        {"target": "dh-10", "label": "Balcony & Third Floor", "type": "door", "state": "locked"}
                    ]
                },
                {
                    "id": "dh-15",
                    "code": "Area 15",
                    "name": "Attic Storage & Secret Spiral Stair",
                    "level": "lvl-dh-3",
                    "x": 360,
                    "y": 260,
                    "state": "unexplored",
                    "boxedText": "Cobweb-strewn furniture and wooden crates fill this dead-end attic storage space. Behind an oak armoire lies a hidden flagstone trapdoor that lifts to reveal a narrow stone spiral staircase spiraling down into pitch-black subterranean depths.",
                    "lighting": "Pitch blackness",
                    "atmosphere": "A cold, damp breeze smelling of earth, decay, and stagnant water blows up from below.",
                    "features": [
                        "Flagstone trapdoor leading into the subterranean Cult Undercroft.",
                        "Narrow spiral stone staircase descending 40 feet into ancient soil."
                    ],
                    "secrets": [],
                    "traps": [],
                    "encounters": [],
                    "loot": [],
                    "exits": [
                        {"target": "dh-13", "label": "Servants' Quarters", "type": "door", "state": "closed"},
                        {"target": "dh-16", "label": "Cultist Quarters (Sub-Basement)", "type": "stairs", "state": "open"}
                    ]
                },
                {
                    "id": "dh-16",
                    "code": "Area 16",
                    "name": "Cultist Quarters",
                    "level": "lvl-dh-4",
                    "x": 180,
                    "y": 140,
                    "state": "unexplored",
                    "boxedText": "The spiral staircase terminates in a damp earthen basement. Clay jugs, rotting straw pallets, and moldy black cultist robes line the low-ceilinged earthen passages.",
                    "lighting": "Pitch blackness",
                    "atmosphere": "Faint, distant rhythmic chanting resonates through the stone floor: 'He is the Ancient. He is the Land.'",
                    "features": [
                        "Dozens of discarded black ceremonial robes with cowls.",
                        "Uneven earthen floors with pooling muddy water."
                    ],
                    "secrets": [],
                    "traps": [],
                    "encounters": [],
                    "loot": [],
                    "exits": [
                        {"target": "dh-15", "label": "Secret Spiral Stairs (Up to Attic)", "type": "stairs", "state": "open"},
                        {"target": "dh-17", "label": "Durst Family Crypts", "type": "archway", "state": "open"}
                    ]
                },
                {
                    "id": "dh-17",
                    "code": "Area 17",
                    "name": "Durst Family Crypts",
                    "level": "lvl-dh-4",
                    "x": 380,
                    "y": 140,
                    "state": "unexplored",
                    "boxedText": "Four stone vaults are carved into the damp earth, their lintels inscribed in Barovian script: 'Gustav Durst', 'Elisabeth Durst', 'Rosavalda Durst', and 'Thornboldt Durst'. Four ghouls claw their way up from the damp graves!",
                    "lighting": "Pitch blackness",
                    "atmosphere": "Sickening stench of rotting flesh.",
                    "features": [
                        "Four family burial niches. Rose and Thorn's crypts are empty (their skeletons still lie in the attic).",
                        "Ghouls waiting to ambush any who enter."
                    ],
                    "secrets": [
                        {"dc": 10, "skill": "Religion", "text": "Laying the children's skeletons to rest in their proper crypts grants the party a Blessing of Inspiration."}
                    ],
                    "traps": [],
                    "encounters": [
                        {"id": "enc-cos-death-house-crypts", "name": "2. Death House: Crypts of the Cult", "cr": "2", "monsters": [{"name": "Ghoul", "hp": 22}, {"name": "Ghoul", "hp": 22}]}
                    ],
                    "loot": [],
                    "exits": [
                        {"target": "dh-16", "label": "Cultist Quarters", "type": "archway", "state": "open"},
                        {"target": "dh-18", "label": "Relic Shrine of Dark Powers", "type": "archway", "state": "open"},
                        {"target": "dh-19", "label": "Hidden Prison & Torture Pit", "type": "archway", "state": "open"}
                    ]
                },
                {
                    "id": "dh-18",
                    "code": "Area 18",
                    "name": "Relic Shrine of Dark Powers",
                    "level": "lvl-dh-4",
                    "x": 580,
                    "y": 140,
                    "state": "unexplored",
                    "boxedText": "Stone niches around this octagonal shrine hold gruesome cult relics: shriveled mummified frogs, small bones, and dried organs. In the center stands a carved wooden statue of Count Strahd von Zarovich draped in a black cloak, holding an ominous smoky crystal orb. Four shadowy silhouettes rise from the corners!",
                    "lighting": "Pitch blackness",
                    "atmosphere": "The shadows whisper blasphemous syllables in chorus.",
                    "features": [
                        "Life-sized wooden effigy of Strahd holding an Orb of Dark Power.",
                        "Four shadows detach from the stone wall when the orb is touched."
                    ],
                    "secrets": [
                        {"dc": 14, "skill": "Arcana", "text": "The crystal orb in Strahd's hand is an arcane focus worth 25 gp, but touching it immediately animates the 4 shadows."}
                    ],
                    "traps": [],
                    "encounters": [
                        {"id": "enc-cos-death-house-shadows", "name": "20. Death House: Shadows in the Dark Shrine", "cr": "3", "monsters": [{"name": "Relic Shrine Shadow", "hp": 16}, {"name": "Relic Shrine Shadow", "hp": 16}, {"name": "Relic Shrine Shadow", "hp": 16}, {"name": "Relic Shrine Shadow", "hp": 16}]}
                    ],
                    "loot": [
                        {"name": "Arcane Focus Crystal Orb", "quantity": "1", "notes": "Deep smoky quartz, worth 25 gp"}
                    ],
                    "exits": [
                        {"target": "dh-17", "label": "Durst Family Crypts", "type": "archway", "state": "open"}
                    ]
                },
                {
                    "id": "dh-19",
                    "code": "Area 19",
                    "name": "Hidden Prison & Torture Pit",
                    "level": "lvl-dh-4",
                    "x": 380,
                    "y": 300,
                    "state": "unexplored",
                    "boxedText": "Rusted iron shackles and chains hang from the damp stone walls. Two skeletons in tattered rags are suspended over a 10-foot-deep pit with sharpened wooden stakes set into the bottom.",
                    "lighting": "Pitch blackness",
                    "atmosphere": "Chilling scent of dried blood and iron rust.",
                    "features": ["Spiked pit trap spanning the doorway to the ritual chamber."],
                    "secrets": [
                        {"dc": 13, "skill": "Perception", "text": "The wooden floorboards over the pit are rotted through and give way under more than 50 lbs of weight."}
                    ],
                    "traps": [
                        {"name": "Spiked Pit Trap", "dc": 15, "trigger": "Stepping on weakened planks without testing", "effect": "1d6 bludgeoning + 2d6 piercing damage from spikes"}
                    ],
                    "encounters": [],
                    "loot": [
                        {"name": "Gold Ring of the Prisoner", "quantity": "1", "notes": "Worth 15 gp, engraved with an unreadable crest"}
                    ],
                    "exits": [
                        {"target": "dh-17", "label": "Durst Family Crypts", "type": "archway", "state": "open"},
                        {"target": "dh-20", "label": "Ritual Chamber & Flesh Mound Altar", "type": "door", "state": "closed"}
                    ]
                },
                {
                    "id": "dh-20",
                    "code": "Area 20",
                    "name": "Ritual Chamber & Flesh Mound Altar",
                    "level": "lvl-dh-4",
                    "x": 580,
                    "y": 300,
                    "state": "unexplored",
                    "boxedText": "The earthen passage opens into a cavernous vaulted chamber. Stagnant knee-deep water sloshes beneath your boots. In the center rises a stone dais crowned by a blood-slick sacrificial altar. Thirteen hooded spectral cultists appear on alcoves chanting in unison: 'One must die! One must die!' From a mound of rotting refuse and bone at the rear, a towering horror of decomposing flesh awakens!",
                    "lighting": "Flickering spectral green flames on five stone torches",
                    "atmosphere": "Deafening rhythmic cult chant: 'One must die! One must die!' and putrid reek of decaying flesh.",
                    "features": [
                        "Sacrificial altar on central stone dais (requires a living sacrifice or Lorghoth awakens).",
                        "The Shambling Mound (Walter the Decayer) surges forth from the refuse pile if no sacrifice is made."
                    ],
                    "secrets": [
                        {"dc": 14, "skill": "Religion", "text": "Slaughtering any living creature—even a rat—upon the altar satisfies the cult and grants safe egress without combat."}
                    ],
                    "traps": [
                        {"name": "Escape Gauntlet / Poison Smoke", "dc": 14, "trigger": "Triggered when Lorghoth is defeated or altar refused", "effect": "House awakens into a deathtrap of scything blades and black choking smoke"}
                    ],
                    "encounters": [
                        {"id": "enc-cos-death-house-shambler", "name": "1. Death House: Walter the Shambling Mound", "cr": "5", "monsters": [{"name": "Lorghoth the Decayer (Shambling Mound)", "hp": 136}]}
                    ],
                    "loot": [
                        {"name": "Cloak of Protection", "quantity": "1", "notes": "Hidden in cult trunk behind altar"},
                        {"name": "Potion of Healing", "quantity": "4", "notes": "In iron flask container"}
                    ],
                    "exits": [
                        {"target": "dh-19", "label": "Hidden Prison & Torture Pit", "type": "door", "state": "open"}
                    ]
                }
            ]
        },
        {
            "id": "dungeon-castle-ravenloft",
            "name": "Castle Ravenloft: Key Spire & Catacombs",
            "subtitle": "Curse of Strahd • Iconic Spires, Crypts & Audience Halls",
            "region": "Castle Ravenloft",
            "description": "The terrifying gothic fortress of Count Strahd von Zarovich perched upon a thousand-foot stone pillar above the Svalich Woods.",
            "activeChamberId": "cr-1",
            "levels": [
                {"id": "lvl-cr-all", "name": "All Floors"},
                {"id": "lvl-cr-main", "name": "Main Floor & Great Halls"},
                {"id": "lvl-cr-towers", "name": "High Spires & Splay"},
                {"id": "lvl-cr-crypts", "name": "Catacombs & Dungeons"}
            ],
            "nodes": [
                {
                    "id": "cr-1",
                    "code": "K1",
                    "name": "Front Courtyard & Drawbridge",
                    "level": "lvl-cr-main",
                    "x": 120,
                    "y": 140,
                    "state": "active",
                    "boxedText": "A chilling wind howls across the thousand-foot chasm. The ancient wooden drawbridge groans underfoot, leading to a massive iron portcullis. Two arched towers flank the gateway, their stone gargoyles leering through the driving mist.",
                    "lighting": "Dreary Barovian moonlight & cold drizzle",
                    "atmosphere": "Howling mountain winds and the rumble of distant thunder.",
                    "features": ["1,000-foot drop into the foggy abyss of the pillar of stone."],
                    "secrets": [],
                    "traps": [],
                    "encounters": [],
                    "loot": [],
                    "exits": [
                        {"target": "cr-7", "label": "K7 Entry Pavilion", "type": "door", "state": "open"}
                    ]
                },
                {
                    "id": "cr-7",
                    "code": "K7",
                    "name": "Entry Pavilion",
                    "level": "lvl-cr-main",
                    "x": 300,
                    "y": 140,
                    "state": "unexplored",
                    "boxedText": "Heavy bronze-reinforced oak doors swing inward soundlessly. Beyond lies a grand vestibule where cold air sweeps past stone dragons whose eyes follow your steps.",
                    "lighting": "Dim amber lanterns",
                    "atmosphere": "Uncanny silence broken only by the sound of boots on flagstones.",
                    "features": ["Twin bronze dragons flanking the main entry portal."],
                    "secrets": [],
                    "traps": [],
                    "encounters": [],
                    "loot": [],
                    "exits": [
                        {"target": "cr-1", "label": "K1 Front Courtyard", "type": "door", "state": "open"},
                        {"target": "cr-8", "label": "K8 Great Entry Hall", "type": "door", "state": "open"}
                    ]
                },
                {
                    "id": "cr-8",
                    "code": "K8",
                    "name": "Great Entry Hall",
                    "level": "lvl-cr-main",
                    "x": 480,
                    "y": 140,
                    "state": "unexplored",
                    "boxedText": "Swept gothic arches soar thirty feet overhead in this vast hall. Eight stone gargoyles cling to the ceiling vaults. Cold red rugs lead toward double doors from which the distant sound of somber organ music drifts.",
                    "lighting": "Candelabras flickering with cold pale flames",
                    "atmosphere": "Haunting, melancholic pipe organ melody echoing through the halls.",
                    "features": ["Eight gargoyles perched high on stone corbels."],
                    "secrets": [{"dc": 15, "skill": "Perception", "text": "Four of the gargoyles are carved stone, but four are living monstrosities waiting for Strahd's command."}],
                    "traps": [],
                    "encounters": [],
                    "loot": [],
                    "exits": [
                        {"target": "cr-7", "label": "K7 Entry Pavilion", "type": "door", "state": "open"},
                        {"target": "cr-10", "label": "K10 Dining Hall of the Count", "type": "door", "state": "closed"},
                        {"target": "cr-15", "label": "K15 The Chapel", "type": "door", "state": "closed"},
                        {"target": "cr-18", "label": "K18 High Tower Stair", "type": "stairs", "state": "open"}
                    ]
                },
                {
                    "id": "cr-10",
                    "code": "K10",
                    "name": "Dining Hall of the Count",
                    "level": "lvl-cr-main",
                    "x": 680,
                    "y": 140,
                    "state": "unexplored",
                    "boxedText": "A blazing fire roars in an ornate hearth beneath a magnificent crystal chandelier. At the far end of an elongated dining table piled high with roast meats and decanters of red wine, an illusion of Count Strahd von Zarovich sits playing a solitary game of chess.",
                    "lighting": "Warm, roaring fireplace and crystal chandelier",
                    "atmosphere": "Delicious scent of roast lamb and aged wine masking a faint undercurrent of embalming spices.",
                    "features": [
                        "Illusion of Strahd that speaks graciously, welcoming the party to dinner.",
                        "Grand feast set with gold chalices and silver platters."
                    ],
                    "secrets": [{"dc": 14, "skill": "Insight", "text": "Strahd's image is a projected phantasm; his voice echoes from unseen speakers in the chimney masonry."}],
                    "traps": [],
                    "encounters": [],
                    "loot": [
                        {"name": "Set of Golden Goblets", "quantity": "6", "notes": "Worth 25 gp each"}
                    ],
                    "exits": [
                        {"target": "cr-8", "label": "K8 Great Entry Hall", "type": "door", "state": "open"},
                        {"target": "cr-25", "label": "K25 Audience Hall & Organ", "type": "door", "state": "closed"}
                    ]
                },
                {
                    "id": "cr-15",
                    "code": "K15",
                    "name": "The Chapel of Ravenloft",
                    "level": "lvl-cr-main",
                    "x": 480,
                    "y": 300,
                    "state": "unexplored",
                    "boxedText": "Shattered stained-glass windows show shards of the Morninglord's solar halo. Behind a desecrated marble altar stands a bronze statue of Saint Andral, weep marks stained down its face. The shadows here feel heavy and defiant.",
                    "lighting": "Faint violet-gray twilight",
                    "atmosphere": "Heavy chill, holy sanctuary aura resisting the surrounding vampiric curse.",
                    "features": ["Desecrated altar of the Morninglord where the Icon of Ravenkind may be discovered."],
                    "secrets": [{"dc": 15, "skill": "Investigation", "text": "Beneath the fallen altar stone is an intact secret compartment protected by a holy glyph."}],
                    "traps": [],
                    "encounters": [],
                    "loot": [
                        {"name": "Icon of Ravenkind (Possible Fated Relic)", "quantity": "1", "notes": "Holy platinum idol of a raven with ruby eyes"}
                    ],
                    "exits": [
                        {"target": "cr-8", "label": "K8 Great Entry Hall", "type": "door", "state": "closed"},
                        {"target": "cr-84", "label": "K84 Grand Catacombs", "type": "stairs", "state": "open"}
                    ]
                },
                {
                    "id": "cr-18",
                    "code": "K18",
                    "name": "High Tower Stair & Heart of Sorrow",
                    "level": "lvl-cr-towers",
                    "x": 680,
                    "y": 300,
                    "state": "unexplored",
                    "boxedText": "A dizzying circular stone stairway spirals up into the clouds inside a hollow tower. Suspended in the void by iron struts is a ten-foot-tall, faceted crystal heart that pulses with a deep crimson rhythm: thump... thump... thump...",
                    "lighting": "Throbbing crimson pulse from the crystal Heart of Sorrow",
                    "atmosphere": "Deep subterranean vibration that shakes the teeth in your jaw.",
                    "features": [
                        "The Heart of Sorrow: absorbs the first 50 HP of damage dealt to Count Strahd von Zarovich.",
                        "Defended by 4 animated halberds and Strahd's flying armor."
                    ],
                    "secrets": [{"dc": 14, "skill": "Arcana", "text": "Destroying the Heart (HP 50, AC 15) severs Strahd's damage ward and deals him intense psychic agony."}],
                    "traps": [],
                    "encounters": [
                        {"id": "enc-cos-ravenloft-heart", "name": "31. Castle Ravenloft: The Heart of Sorrow", "cr": "8", "monsters": [{"name": "The Heart of Sorrow", "hp": 50}, {"name": "Animated Halberd", "hp": 18}, {"name": "Animated Halberd", "hp": 18}]}
                    ],
                    "loot": [],
                    "exits": [
                        {"target": "cr-8", "label": "K8 Great Entry Hall", "type": "stairs", "state": "open"},
                        {"target": "cr-37", "label": "K37 Strahd's Study", "type": "door", "state": "closed"}
                    ]
                },
                {
                    "id": "cr-25",
                    "code": "K25",
                    "name": "Audience Hall & Spectral Organ",
                    "level": "lvl-cr-main",
                    "x": 880,
                    "y": 140,
                    "state": "unexplored",
                    "boxedText": "A massive pipe organ built of bone-inlaid silver dominates the northern wall, its keys depressing as if played by invisible master fingers. Above sits a high throne carved from black marble.",
                    "lighting": "Candelabras with black wax tapers",
                    "atmosphere": "Thunderous chords of Bach and gothic funeral dirges vibrating through the stone.",
                    "features": ["Autonomous spectral organ playing haunting dirges."],
                    "secrets": [{"dc": 16, "skill": "Perception", "text": "Behind the bass organ pipes is a secret latch opening a slide tube down to the catacombs."}],
                    "traps": [],
                    "encounters": [],
                    "loot": [],
                    "exits": [
                        {"target": "cr-10", "label": "K10 Dining Hall of the Count", "type": "door", "state": "closed"},
                        {"target": "cr-37", "label": "K37 Strahd's Study", "type": "stairs", "state": "open"}
                    ]
                },
                {
                    "id": "cr-37",
                    "code": "K37",
                    "name": "Count Strahd's Study & The Tome",
                    "level": "lvl-cr-towers",
                    "x": 880,
                    "y": 300,
                    "state": "unexplored",
                    "boxedText": "A cozy, book-lined study warmed by a gentle hearth. Above the mantel hangs an oil portrait of an exquisite auburn-haired maiden labeled 'Tatyana'. Upon an oak pedestal lies a heavy, leather-bound grimoire sealed with an iron latch.",
                    "lighting": "Warm hearth glow",
                    "atmosphere": "The scent of cedar, old paper, and sweet dried rose petals.",
                    "features": [
                        "Oil portrait of Tatyana Federovna (identical to Ireena Kolyana).",
                        "The Tome of Strahd resting on the central lectern."
                    ],
                    "secrets": [{"dc": 13, "skill": "Investigation", "text": "The Tome contains Strahd's personal chronicle of Sergei's murder and the pact made with the Dark Powers."}],
                    "traps": [],
                    "encounters": [],
                    "loot": [
                        {"name": "The Tome of Strahd (Fated Relic)", "quantity": "1", "notes": "Reveals Strahd's history, flaws, and vulnerabilities"}
                    ],
                    "exits": [
                        {"target": "cr-18", "label": "K18 High Tower Stair", "type": "door", "state": "closed"},
                        {"target": "cr-25", "label": "K25 Audience Hall", "type": "stairs", "state": "open"},
                        {"target": "cr-41", "label": "K41 The Treasury", "type": "door", "state": "locked"}
                    ]
                },
                {
                    "id": "cr-41",
                    "code": "K41",
                    "name": "The Treasury of Ravenloft",
                    "level": "lvl-cr-towers",
                    "x": 1080,
                    "y": 300,
                    "state": "unexplored",
                    "boxedText": "Behind a massive adamantine vault door with three keyholes lies Strahd's personal treasury. Piles of mint electrum, platinum crowns, and crystal decanters glitter in the darkness.",
                    "lighting": "Pitch blackness",
                    "atmosphere": "The metallic scent of hoard gold and ancient wards.",
                    "features": ["Three complex mechanical locks (DC 20 each to pick)."],
                    "secrets": [],
                    "traps": [
                        {"name": "Shadow Ward Trap", "dc": 18, "trigger": "Failing to disarm the vault locks triggers a blast of negative energy", "effect": "4d10 necrotic damage on a failed DC 15 Con save"}
                    ],
                    "encounters": [],
                    "loot": [
                        {"name": "Hoard of Ravenloft", "quantity": "500 pp, 2,500 ep, 10,000 sp", "notes": "Caramped into iron chests"},
                        {"name": "The Sunsword (Fated Relic)", "quantity": "1", "notes": "Hilt of living sunlight (if placed here by Tarokka)"}
                    ],
                    "exits": [
                        {"target": "cr-37", "label": "K37 Strahd's Study", "type": "door", "state": "locked"}
                    ]
                },
                {
                    "id": "cr-74",
                    "code": "K74",
                    "name": "Dungeon Cells & Rahadin's Post",
                    "level": "lvl-cr-crypts",
                    "x": 280,
                    "y": 480,
                    "state": "unexplored",
                    "boxedText": "Iron cages hang by chains over stagnant green water. From the shadows steps Rahadin, Strahd's dusk elf chamberlain, as the agonizing psychic screams of thousands of slaughtered innocents fill your mind!",
                    "lighting": "Dying torches in iron wall sconces",
                    "atmosphere": "The Deathly Choir: the psychic screams of Rahadin's victims echo in the mind of everyone within 30 feet.",
                    "features": ["Water-filled cells holding captive prisoners (including Emil the werewolf)."],
                    "secrets": [],
                    "traps": [],
                    "encounters": [
                        {"id": "enc-cos-ravenloft-rahadin", "name": "32. Castle Ravenloft: Rahadin's Execution Chamber", "cr": "10", "monsters": [{"name": "Rahadin", "hp": 135}, {"name": "Shadow", "hp": 16}, {"name": "Shadow", "hp": 16}]}
                    ],
                    "loot": [
                        {"name": "Rahadin's Curved Scimitar +1", "quantity": "1", "notes": "Exquisite dusk elf steel"}
                    ],
                    "exits": [
                        {"target": "cr-84", "label": "K84 Grand Catacombs", "type": "door", "state": "open"}
                    ]
                },
                {
                    "id": "cr-84",
                    "code": "K84",
                    "name": "The Grand Catacombs",
                    "level": "lvl-cr-crypts",
                    "x": 520,
                    "y": 480,
                    "state": "unexplored",
                    "boxedText": "A vast underground labyrinth of stone crypts stretches into darkness. Thick white fog covers the stone floor to a depth of three feet. Stone pillars support soaring archways carved with names of ancestors, warlords, and forgotten consorts.",
                    "lighting": "Pitch blackness • White rolling mist floor",
                    "atmosphere": "Deathly cold, total silence, smell of dry bones and ancient lime.",
                    "features": [
                        "Forty crypts carved into the stone.",
                        "Swarming bats clinging to the high vaulted ceiling."
                    ],
                    "secrets": [{"dc": 14, "skill": "Perception", "text": "Following the tracks through the fog floor leads straight to the crypts of Sergei, Barov, and the Dark Master."}],
                    "traps": [],
                    "encounters": [],
                    "loot": [],
                    "exits": [
                        {"target": "cr-15", "label": "K15 The Chapel (Upstairs)", "type": "stairs", "state": "open"},
                        {"target": "cr-74", "label": "K74 Dungeon Cells", "type": "door", "state": "open"},
                        {"target": "cr-85", "label": "K85 Tomb of Sergei", "type": "archway", "state": "open"},
                        {"target": "cr-86", "label": "K86 Tomb of Barov & Ravenovia", "type": "archway", "state": "open"},
                        {"target": "cr-88", "label": "K88 Tomb of Patrina", "type": "archway", "state": "open"},
                        {"target": "cr-90", "label": "K90 Tomb of Count Strahd", "type": "door", "state": "closed"}
                    ]
                },
                {
                    "id": "cr-85",
                    "code": "K85",
                    "name": "Tomb of Sergei von Zarovich",
                    "level": "lvl-cr-crypts",
                    "x": 720,
                    "y": 440,
                    "state": "unexplored",
                    "boxedText": "Inside this crypt rests a coffin of pure crystal that radiates a soft, holy golden luminescence. Within lies the uncorrupted body of a handsome young man in polished silver armor.",
                    "lighting": "Holy golden light radiating from the crystal coffin",
                    "atmosphere": "Pure peaceful silence defying the dark evil of the castle.",
                    "features": ["The uncorrupted remains of Prince Sergei von Zarovich."],
                    "secrets": [],
                    "traps": [],
                    "encounters": [],
                    "loot": [
                        {"name": "Sergei's Silver Plate Armor (+1)", "quantity": "1 suit", "notes": "Radiates gentle protection"}
                    ],
                    "exits": [
                        {"target": "cr-84", "label": "K84 Grand Catacombs", "type": "archway", "state": "open"}
                    ]
                },
                {
                    "id": "cr-86",
                    "code": "K86",
                    "name": "Tomb of Barov and Ravenovia",
                    "level": "lvl-cr-crypts",
                    "x": 720,
                    "y": 540,
                    "state": "unexplored",
                    "boxedText": "Two massive sarcophagi of polished black marble stand side by side, bearing the carved likenesses of King Barov and Queen Ravenovia.",
                    "lighting": "Pitch darkness",
                    "atmosphere": "Heavy ancestral gloom.",
                    "features": ["The sarcophagi of Strahd's parents for whom the valley and castle were named."],
                    "secrets": [],
                    "traps": [],
                    "encounters": [],
                    "loot": [],
                    "exits": [
                        {"target": "cr-84", "label": "K84 Grand Catacombs", "type": "archway", "state": "open"}
                    ]
                },
                {
                    "id": "cr-88",
                    "code": "K88",
                    "name": "Tomb of Patrina Velikovna",
                    "level": "lvl-cr-crypts",
                    "x": 920,
                    "y": 440,
                    "state": "unexplored",
                    "boxedText": "Rotting funeral lace spills from a stone coffin. From the darkness rises the shrieking banshee of Patrina Velikovna, the dusk elf mage stoned by her people for daring to marry Strahd!",
                    "lighting": "Ghostly pale green light",
                    "atmosphere": "Wailing wind of unfulfilled hatred.",
                    "features": ["The banshee spirit of Patrina."],
                    "secrets": [],
                    "traps": [],
                    "encounters": [
                        {"id": "enc-cos-patrina-banshee", "name": "Banshee of Patrina Velikovna", "cr": "4", "monsters": [{"name": "Banshee (Patrina)", "hp": 58}]}
                    ],
                    "loot": [
                        {"name": "Patrina's Spellbook", "quantity": "1", "notes": "Contains 12 high-level wizard spells"}
                    ],
                    "exits": [
                        {"target": "cr-84", "label": "K84 Grand Catacombs", "type": "archway", "state": "open"}
                    ]
                },
                {
                    "id": "cr-90",
                    "code": "K90",
                    "name": "Tomb of Count Strahd von Zarovich",
                    "level": "lvl-cr-crypts",
                    "x": 920,
                    "y": 540,
                    "state": "unexplored",
                    "boxedText": "The air in this vault is colder than the grave. In the center sits a polished black marble bier bearing a single coffin of ancient dark wood, carved with the single word: 'STRAHD'. Upon the bier stands Count Strahd von Zarovich, his red eyes burning with eternal wrath!",
                    "lighting": "Deep, unnatural gloom",
                    "atmosphere": "Oppressive supernatural majesty and deadly terror. The master is here.",
                    "features": [
                        "Strahd's true earth coffin where he regenerates if reduced to 0 HP.",
                        "Three vampire brides lurking on the high walls above."
                    ],
                    "secrets": [{"dc": 10, "skill": "Perception", "text": "Soil from his homeland of Barovia fills the bottom of the coffin."}],
                    "traps": [],
                    "encounters": [
                        {"id": "enc-cos-castle-ravenloft-spire", "name": "18. Castle Ravenloft: Climax with the Master", "cr": "15", "monsters": [{"name": "Count Strahd von Zarovich", "hp": 144}, {"name": "Vampire Spawn", "hp": 82}, {"name": "Vampire Spawn", "hp": 82}]}
                    ],
                    "loot": [
                        {"name": "Lord Strahd's Crested Signet Ring", "quantity": "1", "notes": "Master key to all locks in Castle Ravenloft"}
                    ],
                    "exits": [
                        {"target": "cr-84", "label": "K84 Grand Catacombs", "type": "door", "state": "closed"}
                    ]
                }
            ]
        }
    ]


# -------------------------------------------------------------
# BAROVIA REGIONAL OVERWORLD CARTOGRAPHY & LOCATION NODES
# -------------------------------------------------------------
def get_cos_barovia_overworld() -> Dict[str, Any]:
    barovia_pins = [
        {
            "id": "pin-cos-village-barovia",
            "locationId": "loc-village-barovia",
            "dungeonId": "dungeon-death-house",
            "battlemapId": "cos_death_house_f1",
            "title": "Village of Barovia",
            "type": "Settlement",
            "danger": "Moderate",
            "population": "450 Souls (Desolate & Shuttered)",
            "x": 80.2,
            "y": 61.5,
            "discovered": True,
            "icon": "🏚️",
            "notes": "A dismal, mist-shrouded village in the shadow of Castle Ravenloft. Contains Mad Mary's townhouse, the Blood of the Vine Tavern, the village church with Donavich and his undead son Doru, and the sinister Durst Manor (Death House)."
        },
        {
            "id": "pin-cos-castle-ravenloft",
            "locationId": "loc-castle-ravenloft",
            "dungeonId": "dungeon-castle-ravenloft",
            "battlemapId": "cos_castle_ravenloft_main",
            "title": "Castle Ravenloft",
            "type": "Dungeon / Fortress",
            "danger": "Deadly",
            "population": "Count Strahd von Zarovich & The Vampire Court",
            "x": 70.7,
            "y": 51.2,
            "discovered": True,
            "icon": "🏰",
            "notes": "Perched upon a sheer thousand-foot pillar of stone, the ancient gothic citadel looms over the valley. Contains the Great Hall, Court of the Count, Heart of Sorrow in the spires, and the ancestral catacombs below."
        },
        {
            "id": "pin-cos-tser-pool",
            "locationId": "loc-tser-pool",
            "battlemapId": "cos_tser_pool",
            "title": "Tser Pool Encampment",
            "type": "Wilderness Encampment",
            "danger": "Safe",
            "population": "35 Vistani Travelers",
            "x": 69.3,
            "y": 61.9,
            "discovered": True,
            "icon": "🎪",
            "notes": "Brightly painted barrel-topped vardos encircle a roaring campfire beside the falls. Here Madam Eva reads the Tarokka deck to divine the resting places of the Sunsword, Holy Symbol, Tome of Strahd, and the fated ally."
        },
        {
            "id": "pin-cos-tser-falls",
            "locationId": "",
            "battlemapId": "",
            "title": "Tser Falls & High Bridge",
            "type": "Bridge / Chasm",
            "danger": "Moderate",
            "population": "Gargoyles & Mist",
            "x": 57.7,
            "y": 56.0,
            "discovered": True,
            "icon": "🌉",
            "notes": "A precarious stone bridge spans a thousand-foot chasm through which the River Ivlis plummets into the mist. Weathered stone gargoyles watch from the parapets."
        },
        {
            "id": "pin-cos-old-bonegrinder",
            "locationId": "loc-old-bonegrinder",
            "battlemapId": "cos_old_bonegrinder",
            "title": "Old Bonegrinder",
            "type": "Windmill",
            "danger": "Deadly",
            "population": "Morgantha & The Night Hag Coven",
            "x": 50.8,
            "y": 38.0,
            "discovered": True,
            "icon": "🌾",
            "notes": "A decrepit stone windmill with four rotting vanes. Morgantha and her daughters Bella Sunbane and Offalia Wormwiggle grind children's bones to bake addictive Dream Pastries."
        },
        {
            "id": "pin-cos-vallaki",
            "locationId": "loc-vallaki",
            "battlemapId": "cos_vallaki_blue_water",
            "title": "Town of Vallaki",
            "type": "Walled Town",
            "danger": "Moderate",
            "population": "1,800 Citizens (Fortified)",
            "x": 41.8,
            "y": 31.8,
            "discovered": True,
            "icon": "🏘️",
            "notes": "The largest settlement in Barovia, protected by a stout wooden palisade. Baron Vargas Vallakovich stages endless forced festivals ('All Will Be Well!'), while Lady Fiona Wachter leads a secret cult of Strahd sympathizers."
        },
        {
            "id": "pin-cos-lake-zarovich",
            "locationId": "",
            "battlemapId": "",
            "title": "Lake Zarovich & Hill Encampment",
            "type": "Wilderness Lake / Camp",
            "danger": "Moderate",
            "population": "Luvash & Arrigal's Vistani Clan",
            "x": 45.0,
            "y": 24.5,
            "discovered": True,
            "icon": "⛵",
            "notes": "A deep, icy glacial lake beneath Mount Baratok. Near the south bank sits the second Vistani encampment and the dusk elf hovels led by Kasimir Velikov."
        },
        {
            "id": "pin-cos-argynvostholt",
            "locationId": "loc-argynvostholt",
            "battlemapId": "cos_argynvostholt",
            "title": "Argynvostholt",
            "type": "Fortress Ruins",
            "danger": "Deadly",
            "population": "Sir Vladimir Horngaard & The Revenant Order",
            "x": 37.0,
            "y": 50.0,
            "discovered": True,
            "icon": "🐉",
            "notes": "The crumbling mansion of the Order of the Silver Dragon. A colossal stone dragon statue guards the courtyard. Sir Vladimir Horngaard leads vengeful undead knights."
        },
        {
            "id": "pin-cos-berez",
            "locationId": "loc-berez",
            "battlemapId": "cos_berez_hut",
            "title": "Ruins of Berez",
            "type": "Swamp Ruins",
            "danger": "Deadly",
            "population": "Baba Lysaga & Creeping Hut",
            "x": 40.5,
            "y": 56.5,
            "discovered": False,
            "icon": "🛖",
            "notes": "A sunken ghost village drowned by Strahd centuries ago. Baba Lysaga lurks in a giant creeping hut animated by a stolen magic vineyard gem, guarded by swarms of flies and scarecrows."
        },
        {
            "id": "pin-cos-tower",
            "locationId": "loc-tower",
            "battlemapId": "cos_van_richtens_tower",
            "title": "Van Richten's Tower (Khazan's Tower)",
            "type": "Wizard Tower",
            "danger": "Moderate",
            "population": "Rudolph van Richten / Ezmerelda d'Avenir",
            "x": 22.8,
            "y": 27.0,
            "discovered": True,
            "icon": "🗼",
            "notes": "A four-story stone tower on the shores of Lake Baratok, protected by an arcane door trap and an anti-magic field. Ezmerelda's booby-trapped Vistani wagon sits outside."
        },
        {
            "id": "pin-cos-winery",
            "locationId": "loc-winery",
            "battlemapId": "cos_wizard_of_wines",
            "title": "The Wizard of Wines",
            "type": "Vineyard / Winery",
            "danger": "Moderate",
            "population": "Davian Martikov & Wereraven Family",
            "x": 12.2,
            "y": 47.5,
            "discovered": True,
            "icon": "🍇",
            "notes": "The sole wine producer in Barovia, operated by the wereraven Keepers of the Feather. Overrun by evil druids and twig/needle blights from Yester Hill who stole the magic gems."
        },
        {
            "id": "pin-cos-krezk",
            "locationId": "loc-krezk",
            "battlemapId": "cos_krezk_abbey",
            "title": "Village of Krezk & Abbey of Saint Markovia",
            "type": "Settlement / Abbey",
            "danger": "High",
            "population": "250 Villagers & The Abbot's Mongrelfolk",
            "x": 10.4,
            "y": 29.5,
            "discovered": True,
            "icon": "⛪",
            "notes": "A self-sufficient village behind heavy stone walls. In the cliffside abbey above, a mad celestial Deva (The Abbot) stitches together flesh golems and mongrelfolk."
        },
        {
            "id": "pin-cos-werewolf-den",
            "locationId": "",
            "battlemapId": "cos_werewolf_den",
            "title": "Werewolf Den",
            "type": "Cavern Lair",
            "danger": "Deadly",
            "population": "Kiril Stoyanovich's Pack (20+ Lycanthropes)",
            "x": 10.0,
            "y": 22.0,
            "discovered": False,
            "icon": "🐺",
            "notes": "A subterranean cave complex behind a waterfall in the northwestern foothills. The savage Svalich pack keeps kidnapped children here to infect and train into killers."
        },
        {
            "id": "pin-cos-tsolenka-pass",
            "locationId": "",
            "battlemapId": "",
            "title": "Tsolenka Pass Gatehouse",
            "type": "Mountain Pass",
            "danger": "Deadly",
            "population": "Stone Golems & Cold Winds",
            "x": 18.5,
            "y": 58.0,
            "discovered": False,
            "icon": "❄️",
            "notes": "A narrow mountain pass thousands of feet above the snowy abyss. Two stone golems guard the ancient gatehouse curtain wall."
        },
        {
            "id": "pin-cos-amber-temple",
            "locationId": "loc-amber-temple",
            "battlemapId": "cos_amber_temple",
            "title": "The Amber Temple",
            "type": "Ancient Mountain Vault",
            "danger": "Deadly",
            "population": "Exethanter (Lich), Vestiges of Dark Powers",
            "x": 29.5,
            "y": 79.0,
            "discovered": False,
            "icon": "🏛️",
            "notes": "Carved inside the glacial peaks of Mount Ghakis. Contains the amber sarcophagi where vestiges of extinct evil deities are entombed, offering corrupt Dark Gifts."
        },
        {
            "id": "pin-cos-yester-hill",
            "locationId": "loc-yester-hill",
            "battlemapId": "cos_yester_hill",
            "title": "Yester Hill",
            "type": "Wilderness Hill / Ritual Site",
            "danger": "High",
            "population": "Berserkers, Blood Druids & Gulthias Tree",
            "x": 7.0,
            "y": 61.0,
            "discovered": False,
            "icon": "🗿",
            "notes": "A windswept hill topped by a circle of standing stones and a black Gulthias tree. The druids chant around a massive effigy of Strahd, preparing to summon a colossal tree blight."
        },
        {
            "id": "pin-cos-eastern-gates",
            "locationId": "",
            "battlemapId": "",
            "title": "Gates of Barovia (Eastern Svalich)",
            "type": "Gateway",
            "danger": "Moderate",
            "population": "Silent Gargoyles",
            "x": 94.0,
            "y": 54.7,
            "discovered": True,
            "icon": "🚪",
            "notes": "Twin iron gates framed by gargoyles swing open of their own volition. Beyond lies only the suffocating wall of poisonous mists that traps all mortals in Barovia."
        },
        {
            "id": "pin-cos-western-gates",
            "locationId": "",
            "battlemapId": "",
            "title": "Gates of Barovia (Western Svalich)",
            "type": "Gateway",
            "danger": "Moderate",
            "population": "Silent Gargoyles",
            "x": 3.0,
            "y": 28.8,
            "discovered": True,
            "icon": "🚪",
            "notes": "The western boundary gates of Barovia leading into the impassable mists."
        }
    ]

    main_barovia_map = {
        "id": "map-barovia-regional",
        "title": "The Lands of Barovia",
        "subtitle": "Curse of Strahd • Official Regional Cartography • 1 Hex = 1/4 Mile",
        "type": "Kingdom",
        "scale": "1 Hex = 1/4 Mile",
        "scaleMilesPerHex": 0.25,
        "mapUrl": "/static/images/barovia_map.webp",
        "partyMarker": {
            "x": 80.2,
            "y": 61.5,
            "label": "Adventurers at Barovia Village",
            "visibleToPlayers": True,
            "terrain": "Settlement"
        },
        "hexGrid": {
            "enabled": True,
            "opacity": 0.15,
            "size": 32
        },
        "fog": {
            "enabled": True,
            "revealedPoints": [
                {"x": 80.2, "y": 61.5, "radius": 12.0},
                {"x": 70.7, "y": 51.2, "radius": 10.0},
                {"x": 69.3, "y": 61.9, "radius": 8.0}
            ]
        },
        "trail": [],
        "pins": barovia_pins
    }

    return {
        "activeMapId": "map-barovia-regional",
        "mapTitle": "The Lands of Barovia",
        "mapSubtitle": "Curse of Strahd • Official Regional Cartography • 1 Hex = 1/4 Mile",
        "mapUrl": "/static/images/barovia_map.webp",
        "scale": "1 Hex = 1/4 Mile",
        "scaleMilesPerHex": 0.25,
        "partyMarker": {
            "x": 80.2,
            "y": 61.5,
            "label": "Adventurers at Barovia Village",
            "visibleToPlayers": True,
            "terrain": "Settlement"
        },
        "fogUnexplored": True,
        "maps": [main_barovia_map],
        "pins": barovia_pins,
        "tiers": ["Kingdom", "Province", "Settlement", "Dungeon"]
    }


# -------------------------------------------------------------
# CURSE OF STRAHD CANONICAL BATTLEMAP CATALOG
# -------------------------------------------------------------
def get_cos_battlemaps() -> List[Dict[str, Any]]:
    return [
        {
            "id": "cos_death_house_f1",
            "name": "Death House - Ground Floor",
            "url": "/static/images/battlemaps/cos/death_house_f1.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "dungeon",
            "type": "cos_module",
            "chapter": "Appendix B",
            "notes": "Entry Hall, Foyer, Den, Dining Room"
        },
        {
            "id": "cos_death_house_f2",
            "name": "Death House - Upper Floor",
            "url": "/static/images/battlemaps/cos/death_house_f2.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "dungeon",
            "type": "cos_module",
            "chapter": "Appendix B",
            "notes": "Conservatory, Library, Balcony"
        },
        {
            "id": "cos_death_house_attic",
            "name": "Death House - Attic & Children's Room",
            "url": "/static/images/battlemaps/cos/death_house_attic.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "dungeon",
            "type": "cos_module",
            "chapter": "Appendix B",
            "notes": "Rose & Thorn's Bedroom, Secret Spiral Stairs"
        },
        {
            "id": "cos_death_house_dungeon",
            "name": "Death House - Cult Undercroft & Reliquary",
            "url": "/static/images/battlemaps/cos/death_house_dungeon.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "dungeon",
            "type": "cos_module",
            "chapter": "Appendix B",
            "notes": "Cult Crypts, Relic Shrine, Lorghoth the Decayer Altar"
        },
        {
            "id": "cos_castle_ravenloft_main",
            "name": "Castle Ravenloft - Main Floor",
            "url": "/static/images/battlemaps/cos/castle_ravenloft_main.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "dungeon",
            "type": "cos_module",
            "chapter": "Chapter 4",
            "notes": "Great Entry, Chapel, Dining Hall of the Count"
        },
        {
            "id": "cos_castle_ravenloft_spire",
            "name": "Castle Ravenloft - Spires & Heart of Sorrow",
            "url": "/static/images/battlemaps/cos/castle_ravenloft_spire.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "dungeon",
            "type": "cos_module",
            "chapter": "Chapter 4",
            "notes": "Heart of Sorrow, Belfry, High Tower Peak"
        },
        {
            "id": "cos_castle_ravenloft_catacombs",
            "name": "Castle Ravenloft - Catacombs & Crypts",
            "url": "/static/images/battlemaps/cos/castle_ravenloft_catacombs.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "dungeon",
            "type": "cos_module",
            "chapter": "Chapter 4",
            "notes": "Tombs of Barovian Royalty, Strahd's Tomb K90"
        },
        {
            "id": "cos_old_bonegrinder",
            "name": "Old Bonegrinder Windmill",
            "url": "/static/images/battlemaps/cos/old_bonegrinder.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "ruins",
            "type": "cos_module",
            "chapter": "Chapter 6",
            "notes": "Grinding Floor, Kitchen Oven, Attic Cages"
        },
        {
            "id": "cos_vallaki_blue_water",
            "name": "Town of Vallaki - Blue Water Inn",
            "url": "/static/images/battlemaps/cos/vallaki_blue_water.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "tavern",
            "type": "cos_module",
            "chapter": "Chapter 5",
            "notes": "Taproom, Kitchen, Martikov Quarters"
        },
        {
            "id": "cos_vallaki_church",
            "name": "Town of Vallaki - St. Andral's Church",
            "url": "/static/images/battlemaps/cos/vallaki_church.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "sanctum",
            "type": "cos_module",
            "chapter": "Chapter 5",
            "notes": "Nave, Father Lucian's Office, Relic Crypt"
        },
        {
            "id": "cos_vallaki_coffin",
            "name": "Town of Vallaki - Coffin Maker's Shop",
            "url": "/static/images/battlemaps/cos/vallaki_coffin.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "dungeon",
            "type": "cos_module",
            "chapter": "Chapter 5",
            "notes": "Workshop, Henrik's Bedroom, Vampire Spawn Attic"
        },
        {
            "id": "cos_tser_pool",
            "name": "Tser Pool Encampment",
            "url": "/static/images/battlemaps/cos/tser_pool.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "forest",
            "type": "cos_module",
            "chapter": "Chapter 9",
            "notes": "Vardo Encampment, Waterfall, Madam Eva's Tent"
        },
        {
            "id": "cos_argynvostholt",
            "name": "Argynvostholt - Dragon Mansion",
            "url": "/static/images/battlemaps/cos/argynvostholt.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "ruins",
            "type": "cos_module",
            "chapter": "Chapter 10",
            "notes": "Dragon Statue Foyer, Chapel, Vladimir's Hall"
        },
        {
            "id": "cos_berez_hut",
            "name": "Ruins of Berez & Baba Lysaga's Hut",
            "url": "/static/images/battlemaps/cos/berez_hut.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "swamp",
            "type": "cos_module",
            "chapter": "Chapter 7",
            "notes": "Drowned Marsh, Marina's Monument, Creeping Hut"
        },
        {
            "id": "cos_van_richtens_tower",
            "name": "Van Richten's Tower",
            "url": "/static/images/battlemaps/cos/van_richtens_tower.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "sanctum",
            "type": "cos_module",
            "chapter": "Chapter 11",
            "notes": "Lake Causeway, 4 Tower Levels, Ezmerelda's Wagon"
        },
        {
            "id": "cos_wizard_of_wines",
            "name": "The Wizard of Wines Winery",
            "url": "/static/images/battlemaps/cos/wizard_of_wines.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "tavern",
            "type": "cos_module",
            "chapter": "Chapter 12",
            "notes": "Fermentation Vats, Loading Dock, Wine Cellar"
        },
        {
            "id": "cos_krezk_abbey",
            "name": "Abbey of Saint Markovia",
            "url": "/static/images/battlemaps/cos/krezk_abbey.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "sanctum",
            "type": "cos_module",
            "chapter": "Chapter 8",
            "notes": "Courtyard, Madhouse, The Abbot's Operating Room"
        },
        {
            "id": "cos_amber_temple",
            "name": "The Amber Temple - Vault of Vestiges",
            "url": "/static/images/battlemaps/cos/amber_temple.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "dungeon",
            "type": "cos_module",
            "chapter": "Chapter 13",
            "notes": "God of Secrets Statue, Amber Vaults, Exethanter's Sanctum"
        },
        {
            "id": "cos_yester_hill",
            "name": "Yester Hill - Gulthias Tree",
            "url": "/static/images/battlemaps/cos/yester_hill.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "forest",
            "type": "cos_module",
            "chapter": "Chapter 14",
            "notes": "Stone Circle, Gulthias Tree, Effigy of Strahd"
        },
        {
            "id": "cos_werewolf_den",
            "name": "Werewolf Den",
            "url": "/static/images/battlemaps/cos/werewolf_den.jpg",
            "width": 3840,
            "height": 2160,
            "defaultGridSize": 70,
            "theme": "cavern",
            "type": "cos_module",
            "chapter": "Chapter 15",
            "notes": "Waterfall Entrance, Mother Night Cavern, Pups' Pit"
        }
    ]




