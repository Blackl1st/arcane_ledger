// Arcane Ledger - 5.5e / 5e Loot & Merchant Inventory Data Pools

const SHOP_CATALOGS = {
    "blacksmith": {
        name: "Blacksmith & Armory",
        description: "Forged weapons, tempered armor, shields, and ammunition.",
        tiers: {
            "village": [
                { name: "Dagger", cost: 2, unit: "gp", type: "Weapon", desc: "1d4 piercing, Finesse, Light, Thrown (20/60). Mastery: Nick" },
                { name: "Handaxe", cost: 5, unit: "gp", type: "Weapon", desc: "1d6 slashing, Light, Thrown (20/60). Mastery: Vex" },
                { name: "Spear", cost: 1, unit: "gp", type: "Weapon", desc: "1d6 (1d8) piercing, Thrown (20/60), Versatile. Mastery: Sap" },
                { name: "Shortsword", cost: 10, unit: "gp", type: "Weapon", desc: "1d6 piercing, Finesse, Light. Mastery: Vex" },
                { name: "Mace", cost: 5, unit: "gp", type: "Weapon", desc: "1d6 bludgeoning. Mastery: Sap" },
                { name: "Shield", cost: 10, unit: "gp", type: "Armor", desc: "+2 Armor Class. Requires 1 hand." },
                { name: "Leather Armor", cost: 10, unit: "gp", type: "Armor", desc: "AC 11 + Dex modifier." },
                { name: "Arrows (20)", cost: 1, unit: "gp", type: "Ammo", desc: "Bundle of 20 arrows." },
                { name: "Whetstone", cost: 1, unit: "cp", type: "Gear", desc: "Honing stone for maintaining blade edges." }
            ],
            "town": [
                { name: "Longsword", cost: 15, unit: "gp", type: "Weapon", desc: "1d8 (1d10) slashing, Versatile. Mastery: Sap" },
                { name: "Rapier", cost: 25, unit: "gp", type: "Weapon", desc: "1d8 piercing, Finesse. Mastery: Vex" },
                { name: "Greatsword", cost: 50, unit: "gp", type: "Weapon", desc: "2d6 slashing, Heavy, Two-Handed. Mastery: Graze" },
                { name: "Warhammer", cost: 15, unit: "gp", type: "Weapon", desc: "1d8 (1d10) bludgeoning, Versatile. Mastery: Push" },
                { name: "Halberd", cost: 20, unit: "gp", type: "Weapon", desc: "1d10 slashing, Heavy, Reach, Two-Handed. Mastery: Cleave" },
                { name: "Heavy Crossbow", cost: 50, unit: "gp", type: "Weapon", desc: "1d10 piercing, Ammunition (100/400), Heavy, Loading. Mastery: Push" },
                { name: "Chain Shirt", cost: 50, unit: "gp", type: "Armor", desc: "Medium: AC 13 + Dex (max 2)." },
                { name: "Scale Mail", cost: 50, unit: "gp", type: "Armor", desc: "Medium: AC 14 + Dex (max 2). Disadvantage on Stealth." },
                { name: "Chain Mail", cost: 75, unit: "gp", type: "Armor", desc: "Heavy: AC 16. Str 13 req. Disadvantage on Stealth." },
                { name: "Crossbow Bolts (20)", cost: 1, unit: "gp", type: "Ammo", desc: "Quiver of 20 crossbow bolts." }
            ],
            "city": [
                { name: "Breastplate", cost: 400, unit: "gp", type: "Armor", desc: "Medium: AC 14 + Dex (max 2). No Stealth disadvantage." },
                { name: "Half Plate Armor", cost: 750, unit: "gp", type: "Armor", desc: "Medium: AC 15 + Dex (max 2). Disadvantage on Stealth." },
                { name: "Plate Armor", cost: 1500, unit: "gp", type: "Armor", desc: "Heavy: AC 18. Str 15 req. Disadvantage on Stealth." },
                { name: "Silvered Weapon Upgrade", cost: 100, unit: "gp", type: "Service", desc: "Bypasses damage resistance of lycanthropes & specters." },
                { name: "Adamantine Weapon Coating", cost: 500, unit: "gp", type: "Upgrade", desc: "Any hit against an object is a critical hit." },
                { name: "Weapon of Warning", cost: 800, unit: "gp", type: "Magic Item", desc: "Uncommon. Advantage on Initiative; party cannot be surprised." },
                { name: "Shield +1", cost: 1200, unit: "gp", type: "Magic Item", desc: "Uncommon. +3 total bonus to Armor Class." }
            ]
        }
    },
    "apothecary": {
        name: "Apothecary & Herbalist",
        description: "Healing draughts, alchemical reagents, antidotes, and salves.",
        tiers: {
            "village": [
                { name: "Potion of Healing", cost: 50, unit: "gp", type: "Potion", desc: "Regain 2d4 + 2 HP. Bonus Action in 2024 rules to self-administer." },
                { name: "Antitoxin", cost: 50, unit: "gp", type: "Remedy", desc: "Advantage on saving throws against poison for 1 hour." },
                { name: "Healer's Kit", cost: 5, unit: "gp", type: "Kit", desc: "10 uses. Stabilizes a dying creature without a Medicine check." },
                { name: "Herbalism Kit", cost: 5, unit: "gp", type: "Tools", desc: "Required to craft Antitoxin and Potions of Healing." },
                { name: "Smelling Salts", cost: 10, unit: "gp", type: "Remedy", desc: "Awakens an unconscious non-dying creature instantly." },
                { name: "Torch of Repelling", cost: 15, unit: "gp", type: "Curio", desc: "Emits sulfur smoke that keeps non-magical insects at bay." }
            ],
            "town": [
                { name: "Potion of Greater Healing", cost: 200, unit: "gp", type: "Potion", desc: "Regain 4d4 + 4 Hit Points." },
                { name: "Alchemist's Fire (Flask)", cost: 50, unit: "gp", type: "Alchemical", desc: "Ranged attack (20 ft). Deals 1d4 fire at start of target's turn." },
                { name: "Acid (Vial)", cost: 25, unit: "gp", type: "Alchemical", desc: "Ranged attack (20 ft). Deals 2d6 acid damage." },
                { name: "Holy Water (Flask)", cost: 25, unit: "gp", type: "Sacred", desc: "Deals 2d6 radiant damage to Fiends and Undead." },
                { name: "Potion of Animal Friendship", cost: 100, unit: "gp", type: "Potion", desc: "Cast Animal Friendship (save DC 13) for 1 hour." },
                { name: "Elixir of Vitality Salve", cost: 75, unit: "gp", type: "Salve", desc: "Applied over 1 minute: immediately removes Poisoned condition." }
            ],
            "city": [
                { name: "Potion of Superior Healing", cost: 1000, unit: "gp", type: "Potion", desc: "Regain 8d4 + 8 Hit Points." },
                { name: "Potion of Invisibility", cost: 800, unit: "gp", type: "Potion", desc: "Invisible for 1 hour (ends if you attack or cast a spell)." },
                { name: "Potion of Speed", cost: 1200, unit: "gp", type: "Potion", desc: "Gain effect of Haste spell for 1 minute (no concentration required)." },
                { name: "Oil of Slipperiness", cost: 450, unit: "gp", type: "Oil", desc: "Gain effect of Freedom of Movement spell for 8 hours." },
                { name: "Philter of Love", cost: 350, unit: "gp", type: "Potion", desc: "Charmed by the next creature seen within 10 minutes." },
                { name: "Dust of Disappearance", cost: 600, unit: "gp", type: "Magic Dust", desc: "Invisibility for all within 10 ft for 2d4 minutes." }
            ]
        }
    },
    "general": {
        name: "General Store & Outfitter",
        description: "Rations, camping gear, lighting, exploration tools, and packs.",
        tiers: {
            "village": [
                { name: "Backpack", cost: 2, unit: "gp", type: "Gear", desc: "Holds 1 cubic foot / 30 lbs of gear." },
                { name: "Bedroll & Blanket", cost: 1, unit: "gp", type: "Camping", desc: "Essential for Long Rests outdoors." },
                { name: "Torches (x5)", cost: 5, unit: "cp", type: "Light", desc: "Burns for 1 hour, shedding bright light 20ft, dim light 20ft." },
                { name: "Rations (5 days)", cost: 25, unit: "sp", type: "Food", desc: "Dry, nutritious travel trail rations." },
                { name: "Waterskin", cost: 2, unit: "sp", type: "Gear", desc: "Holds 4 pints of liquid." },
                { name: "Tinderbox", cost: 5, unit: "sp", type: "Gear", desc: "Flint, fire steel, and tinder to kindle a fire." },
                { name: "Hemp Rope (50 ft)", cost: 1, unit: "gp", type: "Exploration", desc: "Has 2 HP and can be burst with DC 17 Strength check." }
            ],
            "town": [
                { name: "Crowbar", cost: 2, unit: "gp", type: "Tool", desc: "Grants Advantage on Strength checks where leverage applies." },
                { name: "Grappling Hook", cost: 2, unit: "gp", type: "Exploration", desc: "Secures rope to walls, battlements, or tree limbs." },
                { name: "Bullseye Lantern", cost: 10, unit: "gp", type: "Light", desc: "60 ft cone of bright light, 60 ft dim light. Burns 6 hrs per oil pint." },
                { name: "Flask of Oil (x3)", cost: 3, unit: "sp", type: "Fuel", desc: "Fuel for lanterns or splash for 5 fire damage when lit." },
                { name: "Silk Rope (50 ft)", cost: 10, unit: "gp", type: "Exploration", desc: "Weighs only 5 lbs, burst with DC 17 Strength check." },
                { name: "Thieves' Tools", cost: 25, unit: "gp", type: "Tools", desc: "Required to pick locks and disarm mechanical traps." },
                { name: "Manacles & Key", cost: 2, unit: "gp", type: "Restraint", desc: "Restrains Small or Medium humanoid. DC 20 Dex / DC 20 Str." }
            ],
            "city": [
                { name: "Climber's Kit", cost: 25, unit: "gp", type: "Kit", desc: "Pitons, boot tips, gloves, and harness. Prevents falls > 25ft." },
                { name: "Magnifying Glass", cost: 100, unit: "gp", type: "Tool", desc: "Advantage on Investigation checks on minute details." },
                { name: "Spyglass", cost: 1000, unit: "gp", type: "Optics", desc: "Objects viewed through it are magnified to twice their size." },
                { name: "Hourglass", cost: 25, unit: "gp", type: "Instrument", desc: "Measures precise elapsed time up to 1 hour." },
                { name: "Portable Ram", cost: 4, unit: "gp", type: "Tool", desc: "+4 bonus to Strength checks to break down doors." }
            ]
        }
    },
    "arcane": {
        name: "Arcane Curio & Spellbroker",
        description: "Enchanted curios, spell scrolls, arcane focuses, and wondrous items.",
        tiers: {
            "village": [
                { name: "Arcane Focus (Wand / Crystal)", cost: 10, unit: "gp", type: "Focus", desc: "Substitute for material spell components with no stated cost." },
                { name: "Component Pouch", cost: 25, unit: "gp", type: "Focus", desc: "Compartmentalized belt pouch holding common spell reagents." },
                { name: "Spell Scroll (Cantrip)", cost: 25, unit: "gp", type: "Scroll", desc: "Cast specified cantrip without expending a spell slot." },
                { name: "Spell Scroll (1st Level)", cost: 75, unit: "gp", type: "Scroll", desc: "Common 1st level spell (e.g. Shield, Magic Missile, Detect Magic)." },
                { name: "Candle of the Deep", cost: 50, unit: "gp", type: "Common Wonder", desc: "The flame burns underwater and cannot be extinguished by water." }
            ],
            "town": [
                { name: "Spell Scroll (2nd Level)", cost: 200, unit: "gp", type: "Scroll", desc: "2nd level spell (e.g. Misty Step, Hold Person, Invisibility)." },
                { name: "Spell Scroll (3rd Level)", cost: 500, unit: "gp", type: "Scroll", desc: "3rd level spell (e.g. Fireball, Counterspell, Dispel Magic)." },
                { name: "Bag of Holding", cost: 600, unit: "gp", type: "Wondrous Item", desc: "Uncommon. Holds up to 500 lbs / 64 cubic ft, weighs 15 lbs." },
                { name: "Goggles of Night", cost: 450, unit: "gp", type: "Wondrous Item", desc: "Uncommon. Gain 60 ft Darkvision (or +60 ft if already possessed)." },
                { name: "Wand of Secrets", cost: 350, unit: "gp", type: "Wand", desc: "Uncommon (3 charges). Senses hidden doors and traps within 30 ft." },
                { name: "Sending Stones (Pair)", cost: 500, unit: "gp", type: "Wondrous Item", desc: "Uncommon. Cast Sending between the stones 1/day." }
            ],
            "city": [
                { name: "Cloak of Elvenkind", cost: 800, unit: "gp", type: "Wondrous Item", desc: "Uncommon (Attunement). Adv on Stealth, Wis (Perc) checks against have Disadv." },
                { name: "Pearl of Power", cost: 1000, unit: "gp", type: "Wondrous Item", desc: "Uncommon (Attunement). Regain one expended spell slot up to 3rd lvl 1/day." },
                { name: "Ring of Protection", cost: 3500, unit: "gp", type: "Ring", desc: "Rare (Attunement). +1 bonus to Armor Class and all Saving Throws." },
                { name: "Immovable Rod", cost: 800, unit: "gp", type: "Wondrous Item", desc: "Uncommon. Click button to fix rod in space; holds up to 8,000 lbs." },
                { name: "Spell Scroll (4th Level)", cost: 1500, unit: "gp", type: "Scroll", desc: "4th level spell (e.g. Dimension Door, Polymorph, Greater Invisibility)." },
                { name: "Spell Scroll (5th Level)", cost: 3000, unit: "gp", type: "Scroll", desc: "5th level spell (e.g. Teleportation Circle, Cone of Cold, Wall of Force)." }
            ]
        }
    },
    "fence": {
        name: "The Shady Fence & Black Market",
        description: "Contraband, illicit poisons, forged documents, and stolen oddities.",
        tiers: {
            "village": [
                { name: "Loaded / Weighted Dice", cost: 5, unit: "gp", type: "Contraband", desc: "Rolls designated outcome unless opponent succeeds on DC 15 Investigation." },
                { name: "Concealed Boot Dagger", cost: 8, unit: "gp", type: "Weapon", desc: "DC 17 Investigation check required to discover during a pat-down." },
                { name: "Basic Poison (Vial)", cost: 100, unit: "gp", type: "Poison", desc: "Coats 1 weapon or 3 ammo. DC 10 Con save or take 1d4 poison damage." },
                { name: "Forged Merchant Guild Pass", cost: 25, unit: "gp", type: "Writs", desc: "Grants bypass through trade tollbridges for 1 week." }
            ],
            "town": [
                { name: "Drow Poison (Vial)", cost: 200, unit: "gp", type: "Injury Poison", desc: "DC 13 Con save or Poisoned for 1 hour; fail by 5+ = Unconscious." },
                { name: "Sewer Master Grate Key", cost: 75, unit: "gp", type: "Key", desc: "Unlocks municipal waterworks grates beneath the merchant ward." },
                { name: "Forgery Kit", cost: 15, unit: "gp", type: "Tools", desc: "Enables creating imitation wax seals, official decrees, and signatures." },
                { name: "Disguise Kit", cost: 25, unit: "gp", type: "Tools", desc: "Cosmetics, hair dye, and minor prosthetics for creating alter egos." },
                { name: "Stolen Noble Signet Ring", cost: 120, unit: "gp", type: "Loot", desc: "Gold signet stamped with the seal of House Ashford." }
            ],
            "city": [
                { name: "Assassin's Blood (Ingested)", cost: 150, unit: "gp", type: "Poison", desc: "DC 10 Con save or take 1d12 poison and be Poisoned for 24 hours." },
                { name: "Midnight Tears (Ingested)", cost: 1500, unit: "gp", type: "Lethal Poison", desc: "Undetectable until midnight: DC 17 Con save or 9d6 poison (half on save)." },
                { name: "Cloak of the Bat", cost: 4000, unit: "gp", type: "Magic Item", desc: "Rare (Attunement). Adv on Stealth, fly speed 40ft in darkness, polymorph to bat." },
                { name: "Ring of Mind Shielding", cost: 1500, unit: "gp", type: "Ring", desc: "Uncommon (Attunement). Immune to mind reading and lie detection magic." }
            ]
        }
    }
};

const INDIVIDUAL_LOOT_TABLES = {
    "cr_0_4": {
        coins: () => {
            const roll = Math.floor(Math.random() * 100) + 1;
            if (roll <= 30) return `${Math.floor(Math.random() * 6) + 1} sp, ${Math.floor(Math.random() * 20) + 5} cp`;
            if (roll <= 60) return `${Math.floor(Math.random() * 10) + 2} sp, ${Math.floor(Math.random() * 4) + 1} gp`;
            if (roll <= 85) return `${Math.floor(Math.random() * 12) + 3} gp, ${Math.floor(Math.random() * 8) + 1} sp`;
            return `${Math.floor(Math.random() * 20) + 5} gp, 1 pp`;
        },
        trinketChance: 0.55
    },
    "cr_5_10": {
        coins: () => {
            const gp = (Math.floor(Math.random() * 20) + 5) * 10;
            const sp = (Math.floor(Math.random() * 12) + 2) * 5;
            const pp = Math.floor(Math.random() * 6);
            return `${gp} gp, ${sp} sp${pp > 0 ? `, ${pp} pp` : ''}`;
        },
        trinketChance: 0.75
    },
    "cr_11_16": {
        coins: () => {
            const gp = (Math.floor(Math.random() * 30) + 10) * 20;
            const pp = (Math.floor(Math.random() * 10) + 2) * 5;
            return `${gp} gp, ${pp} pp`;
        },
        trinketChance: 0.90
    },
    "cr_17_plus": {
        coins: () => {
            const gp = (Math.floor(Math.random() * 40) + 20) * 100;
            const pp = (Math.floor(Math.random() * 30) + 10) * 50;
            return `${gp} gp, ${pp} pp`;
        },
        trinketChance: 1.0
    }
};

const GEMSTONES_AND_ART = {
    "10gp": ["Azurite (opaque blue)", "Banded agate (striped)", "Blue quartz (pale blue)", "Eye agate (circular bands)", "Hematite (sparkling grey-black)", "Lapis lazuli (speckled gold)", "Malachite (striated green)", "Tiger eye (rich brown)"],
    "50gp": ["Bloodstone (dark green with red flecks)", "Carnelian (fiery orange-red)", "Chalcedony (milky white)", "Chrysoprase (translucent apple-green)", "Citrine (pale yellow)", "Jasper (earthy blue-grey)", "Moonstone (opalescent white)", "Onyx (striated black & white)", "Star rose quartz (translucent pink with star center)", "Zircon (pale blue-green)"],
    "100gp": ["Amber (translucent gold with insect)", "Amethyst (deep violet)", "Chrysoberyl (yellow-green)", "Coral (crimson pink)", "Garnet (fiery red)", "Jade (translucent sea green)", "Pearl (lustrous white)", "Spinel (deep red)", "Tourmaline (pale green)"],
    "500gp": ["Alexandrite (dark green turning red)", "Aquamarine (pale sea green)", "Black pearl (iridescent black)", "Blue spinel (deep blue)", "Peridot (olive green)", "Topaz (golden yellow)"]
};

const TRINKETS_LIST = [
    "A small brass pocket watch that runs backward twice as fast as normal.",
    "A dried four-leaf clover pressed inside a silver locket with no portrait.",
    "A small iron key that feels ice cold to the touch and smells of sea water.",
    "A piece of black glass that reflects the moon regardless of current weather.",
    "A clay marble inscribed with a tiny rune that glows faint green in the dark.",
    "A pair of weighted bone dice that always roll ones when rolled by an elf.",
    "A scorched silver coin stamped with a monarch whose name was struck from history.",
    "A hollowed-out stone containing a preserved moth whose wings shimmer like oil.",
    "A tiny music box that only plays a haunting three-note melody when wound.",
    "A scrap of parchment bearing a detailed charcoal sketch of an unknown coastline.",
    "A brass compass that points toward the nearest underground spring rather than north.",
    "A wax-sealed glass vial filled with fine grey ash from a volcano in the Feywild.",
    "A small lead figurine of an owl with amethyst chip eyes."
];

const MAGIC_ITEMS_TIERS = {
    "minor": [
        "Potion of Healing (2d4+2)", "Potion of Climbing", "Scroll of Shield", "Scroll of Magic Missile",
        "Scroll of Detect Magic", "Potion of Animal Friendship", "Wand of Pyrotechnics", "Smoldering Armor",
        "Cloak of Billowing", "Boots of False Tracks", "Candle of the Deep", "Rope of Mending"
    ],
    "medium": [
        "Potion of Greater Healing (4d4+4)", "Bag of Holding", "Cloak of Elvenkind", "Goggles of Night",
        "Wand of Magic Detection", "Weapon +1 (Longsword / Rapier)", "Shield +1", "Boots of Elvenkind",
        "Pearl of Power", "Ring of Mind Shielding", "Immovable Rod", "Slippers of Spider Climbing"
    ],
    "major": [
        "Potion of Superior Healing (8d4+8)", "Weapon +2", "Armor +1", "Flame Tongue Longsword",
        "Ring of Protection", "Cloak of the Bat", "Sun Blade", "Belt of Hill Giant Strength (Str 21)",
        "Staff of the Woodlands", "Wand of Fireballs", "Bracers of Defense", "Boots of Speed"
    ]
};
