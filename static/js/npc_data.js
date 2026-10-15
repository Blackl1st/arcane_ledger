// Procedural D&D 5.5e / 5e Data Pools for NPC Generation
const SPECIES_DATA = {
    "Human": {
        pronouns: ["he/him", "she/her", "they/them"],
        first: ["Alden", "Bramwell", "Cora", "Darian", "Eliza", "Falk", "Garrick", "Helena", "Idris", "Jorah", "Katerina", "Lucan", "Maren", "Nolan", "Orla", "Perrin", "Quinn", "Rowan", "Sabine", "Talia", "Ulric", "Vera", "Willem", "Yara", "Zane"],
        last: ["Ashford", "Blackwood", "Crowley", "Dunne", "Fairchild", "Graves", "Holloway", "Ironwood", "Kendrick", "Locke", "Mercer", "Norwood", "Oakhart", "Pendleton", "Redfield", "Shaw", "Thorne", "Vance", "Warrick", "Yates"]
    },
    "Dwarf": {
        pronouns: ["he/him", "she/her", "they/them"],
        first: ["Baelor", "Brunhild", "Dain", "Dolgrin", "Eberk", "Fargrim", "Gilda", "Harbek", "Kathra", "Mardred", "Morgran", "Orsik", "Ragnoli", "Riswynn", "Torbera", "Thorin", "Vondal", "Yurgun"],
        last: ["Amberhelm", "Brawnanvil", "Coppervein", "Deepdelver", "Fireforge", "Frostbeard", "Gorunn", "Hammerfast", "Ironfist", "Loderr", "Oakenheart", "Rumnaheim", "Silveraxe", "Stonebrow", "Trueanvil"]
    },
    "Elf": {
        pronouns: ["she/her", "he/him", "they/them"],
        first: ["Aelar", "Ariawyn", "Caladrel", "Elenion", "Faelar", "Galinndan", "Ielenia", "Keyleth", "Leshanna", "Meriele", "Naivara", "Quarion", "Sariel", "Syllin", "Tharivol", "Vaeril", "Xanaphia", "Zylphira"],
        last: ["Amakiir (Gemflower)", "Galanodel (Moonwhisper)", "Holimion (Diamonddew)", "Ilphelkiir (Gemblossom)", "Liadon (Silverfrond)", "Meliamne (Oakenheel)", "Naïlo (Nightbreeze)", "Siannodel (Moonbrook)", "Xiloscient (Goldpetal)"]
    },
    "Halfling": {
        pronouns: ["she/her", "he/him", "they/them"],
        first: ["Alton", "Ander", "Callie", "Chenna", "Corrin", "Eldon", "Euphemia", "Finnan", "Jillian", "Kithri", "Lavinia", "Lidda", "Merla", "Nedda", "Osborn", "Perrin", "Pip", "Roscoe", "Seraphina", "Verna"],
        last: ["Brushgather", "Goodbarrel", "Greenbottle", "High-hill", "Hilltopple", "Leagallow", "Tealeaf", "Thorngage", "Tosscobble", "Underbough", "Warmwater"]
    },
    "Tiefling": {
        pronouns: ["they/them", "she/her", "he/him"],
        first: ["Akmenos", "Amnon", "Bryseis", "Criella", "Damakos", "Ekemon", "Kairon", "Leucis", "Makaria", "Morthos", "Nemeia", "Orianna", "Pelaios", "Phelaia", "Rieta", "Skamos", "Therai", "Valafar"],
        last: ["Art", "Carrion", "Chant", "Creed", "Despair", "Excellence", "Fear", "Glory", "Hope", "Ideal", "Music", "Nowhere", "Open", "Poetry", "Quest", "Random", "Reverence", "Sorrow", "Temerity", "Torment"]
    },
    "Dragonborn": {
        pronouns: ["he/him", "she/her", "they/them"],
        first: ["Arjhan", "Balasar", "Bharash", "Donaar", "Farideh", "Ghesh", "Harann", "Kava", "Medrash", "Mehen", "Nadarr", "Pandjed", "Patrin", "Rhogar", "Shamash", "Sora", "Surina", "Tarhun", "Torinn"],
        last: ["Clethtinthiallor", "Daardendrian", "Delmirev", "Drachedandion", "Fenkenkabradon", "Kepeshkmolik", "Kerrhylon", "Kimbatuul", "Linxakasendalor", "Myastan", "Nemmonis", "Norixius", "Ophinshtalajiir", "Turnuroth", "Verthisathurgiesh"]
    },
    "Orc / Half-Orc": {
        pronouns: ["he/him", "she/her", "they/them"],
        first: ["Baggi", "Dench", "Emen", "Engong", "Feng", "Gell", "Henk", "Holg", "Imsh", "Kansif", "Keth", "Krusk", "Mhurren", "Myev", "Neega", "Ovak", "Ownka", "Ront", "Shautha", "Sutha", "Thokk", "Volen"],
        last: ["Bloodscar", "Brokenfang", "Craghorn", "Doomhammer", "Goretusk", "Grimeye", "Ironjaw", "Redhand", "Skullcleaver", "Steelgrip", "Stonebreaker", "Thunderfist", "Wolfbane"]
    },
    "Gnome": {
        pronouns: ["he/him", "she/her", "they/them"],
        first: ["Alston", "Alvyn", "Bimpnottin", "Breena", "Brocc", "Caramip", "Carlin", "Dimble", "Donella", "Eldon", "Erky", "Fonkin", "Frug", "Gerbo", "Gimble", "Glim", "Jebeddo", "Lilli", "Namfoodle", "Nyx", "Orryn", "Zook"],
        last: ["Beren", "Daergel", "Folkor", "Garrick", "Nackle", "Murnig", "Ningel", "Raulnor", "Scheppen", "Timbers", "Turen", "Sparklegem", "Gearwhistle", "Cogsworth"]
    },
    "Goliath": {
        pronouns: ["he/him", "she/her", "they/them"],
        first: ["Aukan", "Eglath", "Gae-Al", "Gauthak", "Ilikan", "Keothi", "Kuori", "Lo-Kag", "Manneo", "Maveith", "Nalla", "Orilo", "Paavu", "Pethani", "Thalai", "Thotham", "Uthal", "Vaunea", "Vimak"],
        last: ["Anakalathai", "Elanithino", "Gathakanathi", "Kalagiano", "Katho-Olavi", "Kolae-Gileana", "Ogolakanu", "Thuliaga", "Thunukalathi", "Vaimei-Laga"]
    },
    "Aasimar": {
        pronouns: ["she/her", "he/him", "they/them"],
        first: ["Aethel", "Celestia", "Elysian", "Gideon", "Harion", "Ilithiel", "Kaelen", "Lucian", "Mirielle", "Oriel", "Seraph", "Vaelin", "Zephyrus"],
        last: ["Dawnwhisper", "Halofall", "Lightbringer", "Starwarden", "Sunstrider", "Truthseeker", "Wingkeeper"]
    }
};

const EPITHETS = [
    '"Ash-Thumb"', '"Six-Fingers"', '"The Whisper"', '"Copper-Tongue"', '"Iron-Lung"', '"Half-Pint"', 
    '"The Velvet Knife"', '"Crow-Eye"', '"Salt-Beard"', '"The Unforgiven"', '"Twice-Hanged"', '"Lantern-Jaw"', 
    '"Silver-Smile"', '"Dead-Eye"', '"The Ledger"', '"Quick-Stitch"', '"Bitter-Cup"', '"Soot-Cloak"',
    '"The Owl"', '"Lock-Jaw"', '"Glass-Eye"', '"Three-Coins"', '"No-Shadow"', '"The Hound"'
];

const ROLES_BY_CATEGORY = {
    "Commoner & Labor": [
        { role: "Tavern Keeper", stat: "Commoner (CR 0)" },
        { role: "Dockworker & Stevedore", stat: "Thug (CR 1/2)" },
        { role: "Blacksmith's Apprentice", stat: "Commoner (CR 0)" },
        { role: "Nightsoil Collector", stat: "Commoner (CR 0)" },
        { role: "Gravedigger & Sexton", stat: "Commoner (CR 0)" },
        { role: "Stable Master", stat: "Commoner (CR 0)" },
        { role: "Ferryman", stat: "Commoner (CR 0)" },
        { role: "Street Butcher", stat: "Commoner (CR 0)" },
        { role: "Lamplighter", stat: "Commoner (CR 0)" },
        { role: "Brewmaster", stat: "Commoner (CR 0)" }
    ],
    "Underworld & Criminal": [
        { role: "Shady Fence & Pawnbroker", stat: "Spy (CR 1)" },
        { role: "Smuggler Captain", stat: "Bandit Captain (CR 2)" },
        { role: "Back-Alley Chirurgeon", stat: "Spy (CR 1)" },
        { role: "Forger of Seals & Writs", stat: "Spy (CR 1)" },
        { role: "Tavern Card Sharp", stat: "Bandit (CR 1/8)" },
        { role: "Syndicate Enforcer", stat: "Thug (CR 1/2)" },
        { role: "Information Broker", stat: "Spy (CR 1)" },
        { role: "Cat Burglar", stat: "Spy (CR 1)" },
        { role: "Pit Fight Promoter", stat: "Thug (CR 1/2)" },
        { role: "Black-Market Poisoner", stat: "Assassin (CR 8)" }
    ],
    "Martial & Watch": [
        { role: "Exhausted Watch Captain", stat: "Veteran (CR 3)" },
        { role: "Tollbridge Gatekeeper", stat: "Guard (CR 1/8)" },
        { role: "Caravan Outrider", stat: "Scout (CR 1/2)" },
        { role: "Disgraced Knight-Errant", stat: "Knight (CR 3)" },
        { role: "Bounty Hunter", stat: "Veteran (CR 3)" },
        { role: "Retired Siege Engineer", stat: "Veteran (CR 3)" },
        { role: "Prison Turnkey", stat: "Guard (CR 1/8)" },
        { role: "Mercenary Quartermaster", stat: "Thug (CR 1/2)" },
        { role: "Bodyguard-for-Hire", stat: "Berserker (CR 2)" }
    ],
    "Arcane & Scholar": [
        { role: "Hedge Alchemist", stat: "Mage (CR 6)" },
        { role: "Relic Appraiser", stat: "Priest (CR 2)" },
        { role: "Disgraced Astrologer", stat: "Cult Fanatic (CR 2)" },
        { role: "Scriveners' Guild Archivist", stat: "Commoner (CR 0)" },
        { role: "Apothecary & Herbalist", stat: "Druid (CR 2)" },
        { role: "Wandering Monster Taxonomist", stat: "Scout (CR 1/2)" },
        { role: "Shrine Caretaker", stat: "Acolyte (CR 1/4)" },
        { role: "Clockwork Tinker", stat: "Commoner (CR 0)" },
        { role: "Reluctant Cult Initiate", stat: "Cult Fanatic (CR 2)" }
    ],
    "Noble & Merchant": [
        { role: "Spice & Silk Importer", stat: "Noble (CR 1/8)" },
        { role: "Impoverished Aristocrat", stat: "Noble (CR 1/8)" },
        { role: "Guild Tax Assessor", stat: "Noble (CR 1/8)" },
        { role: "Diplomatic Envoy", stat: "Noble (CR 1/8)" },
        { role: "Master Jeweler", stat: "Commoner (CR 0)" },
        { role: "Auction House Proprietor", stat: "Noble (CR 1/8)" },
        { role: "Rare Book Dealer", stat: "Noble (CR 1/8)" },
        { role: "Magistrate's Clerk", stat: "Commoner (CR 0)" }
    ],
    "Wilderness & Outlander": [
        { role: "Swamp Guide & Trapper", stat: "Scout (CR 1/2)" },
        { role: "Monster Trophy Hunter", stat: "Veteran (CR 3)" },
        { role: "Herbalist Hermit", stat: "Druid (CR 2)" },
        { role: "Deep-Woods Charcoal Burner", stat: "Commoner (CR 0)" },
        { role: "Ruins Prospector", stat: "Scout (CR 1/2)" },
        { role: "Falconer & Houndmaster", stat: "Scout (CR 1/2)" },
        { role: "Borderlands Signal-Keeper", stat: "Guard (CR 1/8)" }
    ]
};

const STAT_ARCHETYPES = {
    "Commoner (CR 0)": { ac: 10, hp: 4, acHp: "AC 10 | HP 4 (1d8)", details: "Spd 30ft | Club +2 (1d4) | Passive Perc 10 | All stats +0" },
    "Bandit (CR 1/8)": { ac: 12, hp: 11, acHp: "AC 12 | HP 11 (2d8+2)", details: "Scimitar +3 (1d6+1) | Lt Crossbow +3 (1d8+1) | Dex +1" },
    "Guard (CR 1/8)": { ac: 16, hp: 11, acHp: "AC 16 | HP 11 (2d8+2)", details: "Spear +3 (1d6+1) | Shield | Perception +2 (Passive 12)" },
    "Noble (CR 1/8)": { ac: 15, hp: 9, acHp: "AC 15 | HP 9 (2d8)", details: "Rapier +3 (1d8+1) | Reaction: Parry (+2 AC) | Deception/Persuasion +4" },
    "Acolyte (CR 1/4)": { ac: 10, hp: 9, acHp: "AC 10 | HP 9 (2d8)", details: "Spellcaster DC 12, +4 hit | Bless, Cure Wounds, Sanctuary | Med/Rel +4" },
    "Thug (CR 1/2)": { ac: 11, hp: 32, acHp: "AC 11 | HP 32 (5d8+10)", details: "Multiattack x2 Mace +4 (1d6+2) | Pack Tactics | Intimidation +2" },
    "Scout (CR 1/2)": { ac: 13, hp: 16, acHp: "AC 13 | HP 16 (3d8+3)", details: "Multiattack x2: Shortsword +4 (1d6+2) or Longbow +4 (1d8+2) | Perc/Stealth +5" },
    "Spy (CR 1)": { ac: 12, hp: 27, acHp: "AC 12 | HP 27 (6d8)", details: "Cunning Action | Sneak Attack (+2d6) | Deception/Insight/Investigation +5" },
    "Bandit Captain (CR 2)": { ac: 15, hp: 65, acHp: "AC 15 | HP 65 (10d8+20)", details: "Multiattack x3 (2 Scimitar +5, 1 Dagger +5) | Parry (+2 AC) | Athletics/Deception +4" },
    "Cult Fanatic (CR 2)": { ac: 13, hp: 33, acHp: "AC 13 | HP 33 (6d8+6)", details: "Spellcaster DC 11, +3 hit | Hold Person, Spiritual Weapon, Inflict Wounds (+3d10)" },
    "Priest (CR 2)": { ac: 13, hp: 27, acHp: "AC 13 | HP 27 (5d8+5)", details: "Spellcaster DC 13, +5 hit | Spirit Guardians, Dispel Magic, Guiding Bolt (4d6)" },
    "Druid (CR 2)": { ac: 11, hp: 27, acHp: "AC 11 (16 Barkskin) | HP 27", details: "Spellcaster DC 12, +4 hit | Entangle, Thunderwave, Hold Person, Shillelagh" },
    "Berserker (CR 2)": { ac: 13, hp: 67, acHp: "AC 13 | HP 67 (9d8+27)", details: "Greataxe +5 (1d12+3) | Reckless Attack (Adv on melee, attacks against have Adv)" },
    "Veteran (CR 3)": { ac: 17, hp: 58, acHp: "AC 17 | HP 58 (9d8+18)", details: "Multiattack x2 Longsword +5 (1d8+3) + 1 Shortsword +5 (1d6+3) | Athletics +5" },
    "Knight (CR 3)": { ac: 18, hp: 52, acHp: "AC 18 (Plate) | HP 52 (8d8+16)", details: "Multiattack x2 Greatsword +5 (2d6+3) | Leadership (+1d4 to allies) | Brave" },
    "Mage (CR 6)": { ac: 12, hp: 40, acHp: "AC 12 (15 Mage Armor) | HP 40", details: "Spellcaster DC 14, +6 hit | Counterspell, Fireball (8d6), Fly, Misty Step, Shield" },
    "Assassin (CR 8)": { ac: 15, hp: 78, acHp: "AC 15 | HP 78 (12d8+24)", details: "Multiattack x2 Shortsword +6 (1d6+3 + 7d6 poison) | Assassinate | Sneak Attack 4d6" }
};

const APPEARANCE_FEATURES = [
    "Has a jagged lightning-bolt scar across one cheek and pale, sleepless eyes",
    "Missing the tip of their left ring finger; knuckles are permanently stained with dark ink",
    "Broad-shouldered and barrel-chested, with a booming laugh and a braided beard",
    "Wiry and gaunt, with darting magpie eyes and a nose broken at least twice",
    "Immaculately groomed hair streaked with premature silver and a faint smell of lavender",
    "Singed eyebrows, soot-smudged cheekbones, and chemical burns dotting their forearms",
    "A milky-white cataract in one eye that they squint through when judging someone's honesty",
    "Towering posture with ritualistic geometric tattoos curling up their neck and jaw",
    "Rosy-cheeked and deceptively cherubic, with a gold tooth that glints when they smirk",
    "Weathered leathery skin from decades at sea, with a brass hoop pierced through one ear",
    "Keeps their face half-hidden behind a high collar and wears tinted smoked-glass spectacles",
    "Crooked posture from an old war wound, leaning heavily on an iron-shod ash walking stick"
];

const APPEARANCE_ATTIRE = [
    "wearing a heavy oilskin coat with dozens of secret interior pockets clinking with glass vials.",
    "draped in a once-fine velvet cloak now frayed at the hem and patched with rough canvas.",
    "wearing a blood-and-grease-stained leather apron over surprisingly expensive silk cuffs.",
    "dressed in boiled watchman's leather with a tarnished badge pinned crookedly over the heart.",
    "wearing a patchwork travel cloak held together by a silver Elven brooch they clearly didn't buy.",
    "sporting a crisp merchant's doublet, three heavy signet rings, and mud-caked riding boots.",
    "wrapped in layer upon layer of wool shawls smelling of pipeweed, cloves, and damp dog.",
    "wearing practical dark woolen work clothes with a pair of brass calipers hanging from their belt."
];

const VOICE_CADENCE = [
    "Speaks in a gravelly, conspiratorial rasp, leaning in far too close",
    "Talks at a rapid-fire auctioneer's pace, interrupting themselves mid-sentence",
    "Slow, deliberate baritone; pauses for two full beats before answering any question",
    "Overly theatrical and booming, addressing the party as 'my dearest friends'",
    "Monotone, deadpan delivery with heavy sighs between every clause",
    "Nasal, clipped aristocratic cadence, constantly clearing their throat politely",
    "Warm, folksy drawl full of bizarre nautical or farming metaphors",
    "Soft, breathless whisper that forces everyone at the table to lean in to hear",
    "Hoarse and scratchy, as if they spent all of last night shouting in a tavern",
    "Crisp, military bark—clips words short and refers to everyone by title or species"
];

const VOICE_MANNERISM = [
    "while methodically flipping a worn silver coin across their knuckles.",
    "and compulsively taps glass vials or table edges in sets of three.",
    "while whittling a small piece of cedar wood into nothing but shavings.",
    "and never blinks when telling an obvious lie, maintaining unnerving eye contact.",
    "while constantly glancing over their left shoulder toward the nearest exit.",
    "and adjusts their spectacles or collar every time money is mentioned.",
    "while chewing on a bitter root that stains their teeth faint red.",
    "and jots down fragments of what the PCs say into a tiny leather ledger.",
    "while cleaning beneath their fingernails with the tip of a stiletto dagger.",
    "and absentmindedly polishes the same pewter mug with a dirty rag."
];

const PERSONALITY_DEMEANOR = [
    "Fiercely protective of their underlings and prickly toward armed strangers",
    "Cynical, mercenary, and amused by heroic idealism",
    "Nervous, superstitious, and convinced a bad omen follows the party",
    "Jovial and hospitable on the surface, but ruthlessly calculating underneath",
    "Arrogant and pedantic, correcting everyone's grammar and local history",
    "Weary, pragmatic, and just trying to survive until the end of the week",
    "Wide-eyed, gossipy, and thrilled to finally meet 'real adventurers'",
    "Stoic, honor-bound, and deeply uncomfortable with deception"
];

const PERSONALITY_MOTIVATION = [
    "wants to scrape together 200 gp before the new moon to pay off a syndicate blood-debt.",
    "is desperately looking for discrete muscle to escort a locked crate out of the district tonight.",
    "wants to clear their sibling's name after they were framed for a warehouse arson.",
    "is trying to sell a stolen map before the original owner's bounty hunters track them down.",
    "wants revenge on a corrupt Watch officer who confiscated their family heirloom.",
    "is searching for a rare monster reagent to cure a creeping curse afflicting their mentor.",
    "wants to buy passage on the next outbound caravan and vanish under a new identity.",
    "is quietly gathering blackmail on a local guildmaster to secure a seat on the council."
];

const BACKSTORIES = [
    "Once served as a quartermaster for a disastrous border campaign; walked away as the sole survivor of their company and swore never to pick up a spear again.",
    "Grew up as an urchin running messages for the local thieves' guild before buying a legitimate storefront with money from a heist gone wrong.",
    "Trained at an arcane academy until they were expelled for experimenting with forbidden necromantic texts; now plies their trade in back alleys.",
    "Was a respected guild artisan in a neighboring city until a political coup forced their family to flee with only what they could carry.",
    "Spent seven years aboard a privateer vessel in the southern Isles before losing a leg to a reef drake and settling down ashore.",
    "Inherited their current post after their predecessor mysteriously vanished three weeks ago—along with the guild's quarterly tax chest.",
    "Former temple acolyte who lost their faith after witnessing high priests cover up a noble's crime for a hefty donation.",
    "Raised in a remote frontier outpost that was swallowed by a planar rift; still suffers nightmares and collects maps of anomalous zones."
];

const SECRETS_AND_HOOKS = [
    "Hiding a stolen noble signet ring melted inside a brass weight on their counter—the noble's hounds are sniffing around the ward.",
    "Secretly feeding patrol schedules to an opposing faction in exchange for enchanted medicine keeping their spouse alive.",
    "Their basement cellar breaks through into an ancient, unmapped smuggling tunnel leading directly beneath the magistrate's manor.",
    "They accidentally bought a cursed dagger from a wild-eyed adventurer yesterday; strange whispers now echo from their lockbox at midnight.",
    "They witnessed a high-ranking city official meeting a hooded cultist in the rain two nights ago and sketched the symbol they exchanged.",
    "They are actually a polymorphed or disguised agent of a rival power observing the party's movements.",
    "They hold the only surviving key to an abandoned dwarven vault three miles outside town, hidden inside a hollowed-out boot heel.",
    "The friendly apprentice working beside them is actually a runaway noble heir with a 500 gp reward on their head."
];

const LOOT_POOLS = [
    "14 sp, 6 cp, a brass ring etched with an unfamiliar guild cipher, and a crumpled debt ledger with three names crossed out in red ink.",
    "3 gp, 8 sp, a tin of strong mint snuff, a wax-sealed love letter they haven't dared to open, and an iron skeleton key.",
    "22 sp, a carved bone die weighted to always roll sixes, a dried sprig of wolfsbane, and a pawn ticket for a silver locket.",
    "1 gp, 19 cp, a half-empty vial of antitoxin, a charcoal sketch of a wanted fugitive, and a clockwork beetle missing one leg.",
    "4 gp, 11 sp, a bloodstained handkerchief monogrammed with a noble crest, a whetstone, and two doses of sleeping draught.",
    "9 sp, 14 cp, a copper token granting safe passage through the sewer grates, a dog-eared prayer book with hollowed-out pages, and a silver thimble.",
    "2 gp, 5 sp, a glass eye that faintly glows near illusions, a receipt from an apothecary for 'nightshade extract', and a salted jerky strip.",
    "17 sp, a set of thieves' picks hidden inside a quill case, a forged travel writ signed by the Lord Mayor, and a chipped obsidian coin."
];

const FACTION_STANDINGS = [
    "Devout Loyalist (trusted insider)",
    "Reluctant Member (bound by debt or blackmail)",
    "Paid Informant (sells rumors for coin)",
    "Disillusioned Defector (looking for a way out)",
    "Ambitious Earner (trying to climb the ranks)",
    "Bitter Rival (actively undermining their operations)",
    "Unwitting Pawn (doesn't realize who really pulls the strings)"
];
