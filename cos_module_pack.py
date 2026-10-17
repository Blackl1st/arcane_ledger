"""
Curse of Strahd Module Pack for Arcane Ledger
==============================================
Provides turnkey gothic horror campaign data, pre-loaded NPCs, authentic Barovian handouts,
chapter encounters, atmospheric lighting/audio presets, and an interactive Tarokka Deck engine.
"""

import time
import random
from typing import Dict, Any, List

# =============================================================================
# THE TAROKKA DECK OF FATE (54 CARDS)
# =============================================================================
# Standard 54-card deck: 40 Common Cards (Swords, Stars, Coins, Glyphs 1-10) + 14 High Deck Cards

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
    {"id": "glyphs-4", "name": "The Shepherd", "suit": "Glyphs", "symbol": "🐑", "clue": "Beneath a ring ofStanding stones where ravens leave gifts of shiny silver.", "loc": "Raven River Stone Circle"},
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

    # 1. Tome of Strahd (Common Deck)
    card1 = common_shuffled.pop()
    # 2. Holy Symbol of Ravenkind (Common Deck)
    card2 = common_shuffled.pop()
    # 3. Sunsword (Common Deck)
    card3 = common_shuffled.pop()
    # 4. Strahd's Enemy / Ally (High Deck)
    card4 = high_shuffled.pop()
    # 5. Strahd's Location in Castle Ravenloft (High Deck)
    card5 = high_shuffled.pop()

    return {
        "timestamp": time.time(),
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


# =============================================================================
# CURSE OF STRAHD PRE-BUILT ROSTER & STATBLOCKS
# =============================================================================
def get_cos_roster() -> List[Dict[str, Any]]:
    return [
        {
            "id": "npc-strahd",
            "name": "Count Strahd von Zarovich",
            "title": "Lord of Castle Ravenloft & Master of Barovia",
            "type": "Undead (Vampire)",
            "cr": "15",
            "ac": 16,
            "hp": 144,
            "speed": "30 ft, Climb 30 ft",
            "stats": {"str": 18, "dex": 18, "con": 18, "int": 20, "wis": 15, "cha": 18},
            "alignment": "Lawful Evil",
            "voice": "Aristocratic, silky velveteen, cultured, deeply predatory. Speaks in calm, measured cadence.",
            "secrets": "Obsessed with claiming Ireena Kolyana, whom he knows to be the reincarnation of Tatyana. Bound to the dark powers of the Amber Temple.",
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
            "title": "Adopted Daughter of the Burgomaster",
            "type": "Human (Noble)",
            "cr": "1/8",
            "ac": 15,
            "hp": 22,
            "speed": "30 ft",
            "stats": {"str": 11, "dex": 12, "con": 11, "int": 12, "wis": 14, "cha": 16},
            "alignment": "Lawful Good",
            "voice": "Gentle but defiant. Refuses to be a passive victim. Speaks with iron determination.",
            "secrets": "She has been bitten twice by Strahd. A third bite will turn her into a vampire spawn.",
            "traits": [{"name": "Steadfast Heart", "desc": "Advantage on saving throws against being charmed or frightened."}],
            "actions": [{"name": "Rapier", "desc": "Melee Weapon Attack: +3 to hit, reach 5 ft. Hit: 1d8+1 piercing damage."}]
        },
        {
            "id": "npc-ismark",
            "name": "Ismark Kolyanovich",
            "title": "'Ismark the Lesser', Burgomaster of Barovia",
            "type": "Human (Veteran)",
            "cr": "3",
            "ac": 17,
            "hp": 58,
            "speed": "30 ft",
            "stats": {"str": 16, "dex": 13, "con": 14, "int": 10, "wis": 11, "cha": 10},
            "alignment": "Lawful Good",
            "voice": "Gruff, weary, earnest. Carries the burden of his father's sudden death.",
            "secrets": "Fears he is not half the leader his father was. Will give his life to see Ireena escorted safely to Vallaki or Krezk.",
            "traits": [{"name": "Brave", "desc": "Advantage on saving throws against being frightened."}],
            "actions": [
                {"name": "Multiattack", "desc": "Makes two longsword attacks and one shortsword attack."},
                {"name": "Longsword", "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft. Hit: 1d8+3 slashing (or 1d10+3 two-handed)."},
                {"name": "Shortsword", "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft. Hit: 1d6+3 piercing."}
            ]
        },
        {
            "id": "npc-madam-eva",
            "name": "Madam Eva",
            "title": "Elder Seer of the Tser Pool Vistani",
            "type": "Human (Diviner)",
            "cr": "10",
            "ac": 12,
            "hp": 88,
            "speed": "20 ft",
            "stats": {"str": 8, "dex": 12, "con": 14, "int": 17, "wis": 20, "cha": 16},
            "alignment": "Neutral",
            "voice": "Raspy, knowing, theatrical cackle that turns piercingly serious when reading fate.",
            "secrets": "Secretly the half-sister of Strahd von Zarovich (daughter of King Barov and a Vistani woman). She wants Strahd freed from his curse or put out of his misery.",
            "traits": [{"name": "Foresight", "desc": "Cannot be surprised and has advantage on attack rolls, ability checks, and saving throws."}],
            "actions": [
                {"name": "Tarokka Curse", "desc": "Target within 30 ft must succeed on DC 17 Charisma save or suffer disadvantage on all d20 rolls until next dawn."},
                {"name": "Dagger", "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft. Hit: 1d4+1 piercing."}
            ]
        },
        {
            "id": "npc-van-richten",
            "name": "Dr. Rudolph van Richten",
            "title": "Legendary Monster Hunter (Disguised as 'Rictavio' the Bard)",
            "type": "Human (Hunter)",
            "cr": "5",
            "ac": 14,
            "hp": 77,
            "speed": "30 ft",
            "stats": {"str": 10, "dex": 14, "con": 12, "int": 16, "wis": 18, "cha": 14},
            "alignment": "Lawful Good",
            "voice": "When Rictavio: flamboyant, loud, boastful carnival entertainer with an exaggerated accent. When Van Richten: razor-sharp, gravelly, cold, calculating veteran hunter.",
            "secrets": "Carries a cursed ring of mind shielding. He is preparing to assassinate Strahd single-handedly using sunlight and holy water.",
            "traits": [
                {"name": "Monster Lore", "desc": "Knows the exact vulnerabilities, resistances, and immunities of all undead, fiends, and lycanthropes."},
                {"name": "Undead Slayer", "desc": "Deals an extra 2d8 radiant damage on weapon attacks against undead."}
            ],
            "actions": [
                {"name": "Silvered Shortsword", "desc": "Melee Weapon Attack: +5 to hit, reach 5 ft. Hit: 1d6+2 piercing + 2d8 radiant vs undead."},
                {"name": "Hand Crossbow", "desc": "Ranged Weapon Attack: +5 to hit, range 30/120 ft. Hit: 1d6+2 piercing (wooden stake)."}
            ]
        },
        {
            "id": "npc-ezmerelda",
            "name": "Ezmerelda d'Avenir",
            "title": "Master Vistani Monster Hunter",
            "type": "Human (Ranger / Fighter)",
            "cr": "8",
            "ac": 17,
            "hp": 82,
            "speed": "30 ft",
            "stats": {"str": 14, "dex": 19, "con": 14, "int": 16, "wis": 14, "cha": 14},
            "alignment": "Chaotic Good",
            "voice": "Passionate, fiery, fiercely courageous. Speaks with sharp wit and zero patience for cowardice.",
            "secrets": "Lost her lower right leg to a werewolf attack; wears an artisan prosthetic with a secret compartment holding holy water. Searching for her mentor Van Richten.",
            "traits": [{"name": "Cunning Action", "desc": "Can Dash, Disengage, or Hide as a Bonus Action."}],
            "actions": [
                {"name": "Multiattack", "desc": "Makes three weapon attacks: two with her rapier and one with her handaxe."},
                {"name": "+1 Rapier", "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft. Hit: 1d8+5 piercing damage."},
                {"name": "Silvered Handaxe", "desc": "Melee or Ranged Weapon Attack: +5 to hit, reach 5 ft or range 20/60 ft. Hit: 1d6+2 slashing."}
            ]
        },
        {
            "id": "npc-rahadin",
            "name": "Rahadin",
            "title": "Chamberlain of Castle Ravenloft",
            "type": "Dusk Elf",
            "cr": "10",
            "ac": 18,
            "hp": 135,
            "speed": "35 ft",
            "stats": {"str": 14, "dex": 18, "con": 17, "int": 15, "wis": 13, "cha": 18},
            "alignment": "Lawful Evil",
            "voice": "Emotionless, chillingly polite, loyal to a fault. Accompanied by the horrifying spectral screams of his victims.",
            "secrets": "Committed genocide against his own Dusk Elf people to serve Strahd. The screams of the thousands he butchered echo perpetually around him in a 10-foot aura.",
            "traits": [
                {"name": "Deathly Choir", "desc": "Any hostile creature that starts its turn within 10 ft of Rahadin hears spectral screams and takes 4d6 psychic damage (DC 16 Wis save for half)."}
            ],
            "actions": [
                {"name": "Multiattack", "desc": "Makes three scimitar attacks and one dart attack."},
                {"name": "Scimitar", "desc": "Melee Weapon Attack: +8 to hit, reach 5 ft. Hit: 1d6+4 slashing damage."},
                {"name": "Poison Dart", "desc": "Ranged Weapon Attack: +8 to hit, range 20/60 ft. Hit: 1d4+4 piercing + 3d6 poison."}
            ]
        }
    ]


# =============================================================================
# CURSE OF STRAHD AUTHENTIC HANDOUTS (READY FOR PHONES)
# =============================================================================
def get_cos_handouts() -> List[Dict[str, Any]]:
    return [
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
                "Hail to thee of might and valor:\n\n"
                "We, the despairing folk of the village of Barovia, send our cry for aid into the world beyond. "
                "A creature of darkness and ancient malice stalks our lands, and my adopted daughter, the fair Ireena Kolyana, "
                "has been afflicted by his unholy bite. Twice he has visited her; a third time will seal her doom into living death.\n\n"
                "I beg you: haste to the village of Barovia. Protect my child, or take her far beyond the reach of Castle Ravenloft. "
                "Our wealth, our lives, and our eternal prayers are yours if you deliver us from the Devil Strahd.\n\n"
                "In desperate supplication,\n"
                "Kolyan Indirovich, Burgomaster"
            ),
            "seal": "crown",
            "sealColor": "red",
            "isCoded": False,
            "status": "delivered",
            "targetHeroId": "all",
            "targetHeroName": "All Party",
            "secretWhisper": "Delivered into your hands by a cloaked Vistani messenger outside the tavern.",
            "isDelivered": True,
            "deliveredAt": time.time(),
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
                "Hail to thee of might and valor:\n\n"
                "Do not enter our lands! The mists have closed and the devil of Castle Ravenloft has claimed the valley. "
                "The road ahead leads only to death and terror. Turn back while your boots still tread dry earth.\n\n"
                "If thou dost cherish breath, flee the woods of Svalich and burn this parchment.\n\n"
                "Signed in dread,\n"
                "Kolyan Indirovich"
            ),
            "seal": "dragon",
            "sealColor": "black",
            "isCoded": False,
            "status": "ready",
            "targetHeroId": "all",
            "targetHeroName": "All Party",
            "secretWhisper": "Discovered on the cold corpse of a messenger pinned with raven feathers at the border gate.",
            "isDelivered": False,
            "tiedLocation": "Svalich Woods Gates",
            "tiedNpc": "Count Strahd von Zarovich"
        },
        {
            "id": "hnd-cos-tome-excerpt",
            "title": "Tome of Strahd: The Fall of Sergei",
            "type": "journal",
            "theme": "burnt",
            "fontStyle": "serif",
            "author": "Count Strahd von Zarovich",
            "recipient": "The Chronicle of Eternity",
            "dateString": "Centuries Ago - Day of Sergei's Wedding",
            "content": (
                "I am the Ancient, I am the Land. My beginnings are lost amidst the darkness of the feudal past.\n\n"
                "I brought peace to this valley with blade and blood. In my youth I was a conqueror, but age grew cold upon my bones. "
                "Then she came. Tatyana. Radiant as dawn, sweet as spring water. But she loved Sergei, my younger brother. "
                "She called me 'brother'—an iron dagger twisted in my heart.\n\n"
                "On the day of their wedding, I sealed the pact with Death. I drank Sergei’s blood, and my castle guards turned their bows upon me. "
                "Tatyana cast herself from the high walls of Ravenloft into the thousand-foot abyss rather than accept my embrace.\n\n"
                "The mists arose and swallowed Barovia. I died, yet I live. And she shall be mine."
            ),
            "seal": "skull",
            "sealColor": "purple",
            "isCoded": False,
            "status": "ready",
            "targetHeroId": "all",
            "targetHeroName": "All Party",
            "secretWhisper": "Ancient scorched vellum recovered from a secret lead-lined chest.",
            "isDelivered": False,
            "tiedLocation": "Castle Ravenloft",
            "tiedNpc": "Count Strahd von Zarovich"
        },
        {
            "id": "hnd-cos-van-richten-notes",
            "title": "Dr. van Richten's Guide to Vampiric Weaknesses",
            "type": "journal",
            "theme": "parchment",
            "fontStyle": "typewriter",
            "author": "Dr. Rudolph van Richten",
            "recipient": "Ezmerelda d'Avenir",
            "dateString": "Current Year - Lake Baratok",
            "content": (
                "FIELD OBSERVATIONS ON THE DREAD VAMPIRE OF BAROVIA:\n\n"
                "1. RUNNING WATER: A vampire takes 20 acid damage if it ends its turn in running water. The Ivlis River is our ally.\n"
                "2. SUNLIGHT: Direct sunlight deals 20 radiant damage per turn and eliminates regeneration and misty escape entirely. The Sunsword is paramount.\n"
                "3. WOODEN STAKES: A stake through the heart incapacitates only while the creature rests within its native resting earth.\n"
                "4. HEART OF SORROW: Strahd possesses an eldritch crystal pulsating atop the tower. It absorbs the first 50 points of damage dealt to him. Destroy the crystal first!"
            ),
            "seal": "daggers",
            "sealColor": "black",
            "isCoded": False,
            "status": "ready",
            "targetHeroId": "all",
            "targetHeroName": "All Party",
            "secretWhisper": "Found hidden under the false bottom of Rictavio's trunk in the Blue Water Inn.",
            "isDelivered": False,
            "tiedLocation": "Van Richten's Tower",
            "tiedNpc": "Dr. Rudolph van Richten"
        },
        {
            "id": "hnd-cos-strahd-dinner",
            "title": "Dinner Invitation to Castle Ravenloft",
            "type": "letter",
            "theme": "vellum",
            "fontStyle": "cursive",
            "author": "Count Strahd von Zarovich",
            "recipient": "The Distinguished Adventurers",
            "dateString": "Night of the Gibbous Moon",
            "content": (
                "My Honored Guests:\n\n"
                "You have traversed my lands with uncommon courage and provided me with rare amusement. "
                "Such vigor deserves civil conversation over spiced wine and fine roasted venison.\n\n"
                "I formally request the pleasure of your company for dinner at Castle Ravenloft on the morrow. "
                "A black carriage awaits your pleasure at the crossroads. You have my solemn personal oath of safe passage "
                "until the third bell after midnight strikes.\n\n"
                "Do not disappoint me.\n\n"
                "Count Strahd von Zarovich\n"
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
        }
    ]


# =============================================================================
# CURSE OF STRAHD CHAPTER ENCOUNTERS
# =============================================================================
def get_cos_encounters() -> List[Dict[str, Any]]:
    return [
        {
            "id": "enc-cos-wolves",
            "name": "1. Svalich Woods: Dire Wolf Ambush",
            "location": "Old Svalich Road",
            "difficulty": "Medium",
            "targetCr": 4,
            "notes": "Fog rolls in thick. Howls echo from three sides. 3 Dire Wolves flank from the tree line while 4 normal wolves herd the party.",
            "monsters": [
                {"name": "Dire Wolf", "count": 3, "cr": 1, "hp": 37, "ac": 14},
                {"name": "Wolf", "count": 4, "cr": "1/4", "hp": 11, "ac": 13}
            ]
        },
        {
            "id": "enc-cos-church-doru",
            "name": "2. Barovia Church: Doru the Vampire Spawn",
            "location": "Church Undercroft",
            "difficulty": "Hard",
            "targetCr": 5,
            "notes": "Father Donavich prays frantically upstairs while his starved vampire spawn son screams for blood beneath the floor trapdoor.",
            "monsters": [
                {"name": "Vampire Spawn (Doru)", "count": 1, "cr": 5, "hp": 82, "ac": 15, "notes": "Starved. Regeneration 10. Spider climb."}
            ]
        },
        {
            "id": "enc-cos-bonegrinder",
            "name": "3. Old Bonegrinder: Night Hag Coven",
            "location": "Old Bonegrinder Windmill",
            "difficulty": "Deadly",
            "targetCr": 7,
            "notes": "Morgantha, Bella Sunbane, and Offalia Wormwiggle. Shared spellcasting: Lightning Bolt, Hold Person, Eyebite, Ray of Enfeeblement.",
            "monsters": [
                {"name": "Night Hag (Morgantha)", "count": 1, "cr": 5, "hp": 112, "ac": 17},
                {"name": "Night Hag (Bella)", "count": 1, "cr": 5, "hp": 90, "ac": 17},
                {"name": "Night Hag (Offalia)", "count": 1, "cr": 5, "hp": 90, "ac": 17}
            ]
        },
        {
            "id": "enc-cos-feast",
            "name": "4. Feast of St. Andral: Vampire Ambush",
            "location": "Vallaki Coffin Maker's Shop",
            "difficulty": "Deadly",
            "targetCr": 8,
            "notes": "6 Vampire Spawn burst out of shipping crates in the attic of Henrik van der Voort. Their goal: steal the bones of St. Andral and terrorize Vallaki.",
            "monsters": [
                {"name": "Vampire Spawn", "count": 6, "cr": 5, "hp": 82, "ac": 15}
            ]
        },
        {
            "id": "enc-cos-yester-hill",
            "name": "5. Yester Hill: The Tree Blight Ritual",
            "location": "Yester Hill",
            "difficulty": "Hard",
            "targetCr": 7,
            "notes": "Evil druids and wild berserkers dance around the black Gulthias Tree, attempting to birth an enormous Tree Blight using a stolen winery gem.",
            "monsters": [
                {"name": "Tree Blight", "count": 1, "cr": 7, "hp": 149, "ac": 15},
                {"name": "Druid", "count": 4, "cr": 2, "hp": 27, "ac": 11},
                {"name": "Berserker", "count": 4, "cr": 2, "hp": 67, "ac": 13}
            ]
        },
        {
            "id": "enc-cos-amber-temple",
            "name": "6. The Amber Temple: Guardians of the Sarcophagi",
            "location": "The Amber Temple Vaults",
            "difficulty": "Deadly",
            "targetCr": 11,
            "notes": "Giant stone Amber Golems stand sentinel over the obsidian sarcophagi of dark vestiges. 3 Flameskulls patrol the high arches.",
            "monsters": [
                {"name": "Amber Golem (Stone Golem)", "count": 2, "cr": 10, "hp": 178, "ac": 17},
                {"name": "Flameskull", "count": 3, "cr": 4, "hp": 40, "ac": 13}
            ]
        },
        {
            "id": "enc-cos-ravenloft-climax",
            "name": "7. Castle Ravenloft: Count Strahd von Zarovich",
            "location": "Castle Ravenloft (Tarokka Fated Location)",
            "difficulty": "Boss",
            "targetCr": 16,
            "notes": "The final showdown. Strahd fights with full legendary actions, phasing through walls and calling vampire brides and bats. Sunlight stops his regeneration.",
            "monsters": [
                {"name": "Count Strahd von Zarovich", "count": 1, "cr": 15, "hp": 144, "ac": 16},
                {"name": "Vampire Spawn Bride (Ludmilla)", "count": 1, "cr": 5, "hp": 82, "ac": 15},
                {"name": "Rahadin (Chamberlain)", "count": 1, "cr": 10, "hp": 135, "ac": 18}
            ]
        }
    ]


# =============================================================================
# CURSE OF STRAHD LOCATIONS & FACTIONS
# =============================================================================
def get_cos_locations() -> List[Dict[str, Any]]:
    return [
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


def get_cos_factions() -> List[Dict[str, Any]]:
    return [
        {"id": "fac-keepens-feather", "name": "Keepers of the Feather", "alignment": "Lawful Good", "reputation": "Friendly", "description": "A secret society of wereravens based out of the Wizard of Wines and Blue Water Inn. They aid good adventurers against Strahd."},
        {"id": "fac-vistani", "name": "The Vistani", "alignment": "True Neutral", "reputation": "Neutral", "description": "Nomadic travelers with immunity to the mists. Some are loyal allies of Madam Eva, while others act as eyes and ears for Strahd."},
        {"id": "fac-silver-dragon", "name": "Order of the Silver Dragon", "alignment": "Lawful Evil (Revenants)", "reputation": "Hostile", "description": "Undead knights led by Vladimir Horngaard. They hate Strahd, but want him to suffer forever in Barovia rather than be destroyed."},
        {"id": "fac-wachter-cult", "name": "The Wachter Cult", "alignment": "Lawful Evil", "reputation": "Hostile", "description": "A secret devil-worshiping cabal in Vallaki led by Lady Fiona Wachter, scheming to overthrow the Burgomaster and open the gates to Strahd."},
        {"id": "fac-werewolves", "name": "The Svalich Werewolf Pack", "alignment": "Chaotic Evil", "reputation": "Hostile", "description": "A ferocious pack of lycanthropes led by Kiril Stoyanovich, kidnapping children from Barovian villages to swell their ranks."}
    ]


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
