// Arcane Ledger - D&D 5.5e (2024) DM Dashboard Controller

let appState = {
    party: [],
    combat: {
        inCombat: false,
        round: 1,
        currentTurnIndex: 0,
        combatants: []
    },
    roster: [],
    world: {
        customFactions: [],
        customLocations: [],
        useOnlyCustomFactions: false,
        useOnlyCustomLocations: false
    },
    rules: {},
    currentNPC: {
        id: null,
        name: "Bramwell Vance",
        epithet: '"Ash-Thumb"',
        species: "Human (he/him)",
        role: "Hedge Alchemist",
        category: "Arcane & Scholar",
        voice: "Speaks at a rapid-fire auctioneer's pace, interrupting themselves mid-sentence while compulsively tapping glass vials or table edges in sets of three.",
        appearance: "Singed eyebrows, soot-smudged cheekbones, and chemical burns dotting their forearms, wearing a heavy oilskin coat with dozens of secret interior pockets clinking with glass vials.",
        personality: "Fiercely protective of their underlings and prickly toward armed strangers; is searching for a rare monster reagent to cure a creeping curse afflicting their mentor.",
        backstory: "Trained at an arcane academy until they were expelled for experimenting with forbidden necromantic texts; now plies their trade in back alleys.",
        secret: "Hiding a stolen noble signet ring melted inside a brass weight on their counter—the noble's hounds are sniffing around the ward.",
        faction: "Circle of the Pale Moon (Arcane Cabal)",
        factionStanding: "Disillusioned Defector (looking for a way out)",
        location: "The Cinder-Forge District",
        loot: "1 gp, 19 cp, a half-empty vial of antitoxin, a charcoal sketch of a wanted fugitive, and a clockwork beetle missing one leg.",
        statName: "Mage (CR 6)",
        statAcHp: "AC 12 (15 Mage Armor) | HP 40",
        statDetails: "Spellcaster DC 14, +6 hit | Counterspell, Fireball (8d6), Fly, Misty Step, Shield",
        notes: "",
        imageUrl: "/static/images/npcs/alchemist.webp"
    },
    locks: {
        identity: false,
        voice: false,
        appearance: false,
        personality: false,
        backstory: false,
        secret: false,
        world: false,
        loot: false,
        stats: false
    },
    activeTab: 'combat',
    diceHistory: [],
    activeAdvantage: 'normal', // 'normal', 'advantage', 'disadvantage'
    diceModifier: 0,
    // Phase 2 state
    notes: [],
    notesFilter: 'all',
    activeNoteTag: 'quest',
    timeWeather: {
        day: 1,
        hour: 9,
        minute: 0,
        weather: {
            temperature: "Mild (62°F / 17°C)",
            wind: "Gentle Breeze",
            precipitation: "Clear Skies",
            tacticalEffect: "None. Normal visibility and travel conditions."
        },
        moonPhase: "Waxing Crescent",
        activeTimers: []
    },
    currentShop: null,
    currentLoot: null,
    // Phase 3 state
    monsters: [],
    selectedMonsterId: null,
    locations: [],
    factions: [],
    quests: [],
    rumors: [],
    secrets: [],
    secretStatusFilter: 'all',
    secretCategoryFilter: 'all',
    secretSearchQuery: '',
    handouts: [],
    handoutTypeFilter: 'all',
    handoutThemeFilter: 'all',
    handoutStatusFilter: 'all',
    handoutSearchQuery: '',
    previewDecipherState: false,
    worldActiveSubtab: 'locations',
    revealedSecrets: {},
    bestiarySearchQuery: '',
    bestiaryCrFilter: 'all',
    bestiaryTypeFilter: 'all',
    questStatusFilter: 'all',
    locationSearchQuery: '',
    locationTypeFilter: 'all',
    locationDangerFilter: 'all',
    // Phase 4 state
    broadcast: null,
    audioLibrary: [],
    audioPresets: [],
    audioActiveCategory: 'all',
    activeAudioPresetId: null,
    // Phase 5 state: 2024 Spells, Encounters, and amaran Lighting
    spells: [],
    selectedSpellId: null,
    spellFilterLevel: 'all',
    spellFilterClass: 'all',
    spellFilterSchool: 'all',
    spellFilterRitual: false,
    spellFilterConcentration: false,
    spellSearchQuery: '',
    encounters: [],
    stagedEncounter: [], // array of { monsterId, count }
    encounterSearchQuery: '',
    encounterCrFilter: 'all',
    encounterTypeFilter: 'all',
    lighting: null,
    // Compendium: Items & Equipment state
    items: [],
    selectedItemId: null,
    itemFilterType: 'all',
    itemFilterRarity: 'all',
    itemFilterAttunement: false,
    itemFilterCustomOnly: false,
    itemSearchQuery: '',
    // Campaign Profile Manager & Module Manager
    campaigns: [],
    activeCampaignId: 'default',
    currentCampaign: null,
    playstylePresets: {},
    // Phase 6: Regional Overworld, Faction Matrix, Pantheon, Timeline, Travel & Inventory
    overworld: {
        mapUrl: '/static/images/overworld_default.svg',
        title: 'The Shattered Coast & Crownlands',
        scale: '1 Hex = 24 Miles (1 Day Normal Pace)',
        partyPosition: { x: 42, y: 55, label: "Adventuring Party Camp" },
        pins: []
    },
    overworldMode: 'inspect', // 'inspect', 'add_pin', 'move_party'
    selectedOverworldPinId: null,
    factionRelations: { relations: [], turnHistory: [] },
    factionTurnHistory: [],
    pantheon: [],
    timeline: { eras: [], events: [] },
    timelineFilterEra: 'all',
    partyStash: {
        currency: { pp: 0, gp: 0, sp: 0, cp: 0 },
        items: []
    },
    activeInventoryTab: 'stash',
    itemPickerTarget: 'stash',
    itemPickerCategory: 'all',
    travel: { pace: 'Normal', terrain: 'Forest', road: 'trail', targetMiles: 48, marchHours: 8, navBonus: 0, forageBonus: 0, history: [] },
    travelPace: 'Normal'
};
window.appState = appState;

const AVAILABLE_MODULES = [
    { id: 'combat', name: 'Combat & Party', icon: '⚔️', desc: 'Active combat encounter tracker, initiative ladder, death saves & party vitals HUD.' },
    { id: 'battlemap', name: 'Tabletop Battlemap', icon: '🗺️', desc: 'Tactical grid map, tokens, Fog of War, measuring tools, and AoE spell templates.' },
    { id: 'bestiary', name: '5.5e Bestiary', icon: '🐉', desc: 'Compendium of 300+ 2024 monsters, stat blocks, attacks, and instant token spawning.' },
    { id: 'encounters', name: 'Encounter Builder', icon: '⚖️', desc: 'XP budget calculator, party CR balancing, and pre-planned encounter rosters.' },
    { id: 'spells', name: 'Spells Compendium', icon: '📖', desc: '360+ 2024 D&D spells, school filters, components, upcasting, and class lists.' },
    { id: 'items', name: 'Items Compendium', icon: '🛡️', desc: 'Weapons, armor, magic items, weapon masteries, attunement, and shop stocks.' },
    { id: 'rules', name: '2024 Rules Engine', icon: '📜', desc: 'Fast reference for conditions, cover, exhaustion, weapon masteries, and actions.' },
    { id: 'world', name: 'World & Lore (Main)', icon: '🏰', desc: 'Master module toggle for World & Lore and its sidebar navigation.' },
    { id: 'overworld', name: 'Regional Overworld Map', icon: '🗺️', desc: 'Grand regional cartography, POI lore pins, settlement danger popovers, and overland journey.' },
    { id: 'locations', name: 'Locations Directory', icon: '📍', desc: 'Comprehensive directory of cities, dungeons, taverns, and regional points of interest.' },
    { id: 'factions', name: 'Factions & Turn Engine', icon: '⚖️', desc: 'Inter-faction attitude web, tension clocks, and between-session faction turn simulator.' },
    { id: 'quests', name: 'Quests & Rumors', icon: '📜', desc: 'Campaign quest log, side objectives, tavern rumors, bounty leads, and quest milestone rewards.' },
    { id: 'pantheon', name: 'Pantheon & Cosmic Cults', icon: '🏛️', desc: 'Compendium of deities, divine domains, player piety tracker, and holy symbol broadcasts.' },
    { id: 'timeline', name: 'Campaign Historical Timeline', icon: '⏳', desc: 'Chronological timeline feed, customizable historical eras, event tags, and quest sync.' },
    { id: 'travel', name: 'Wilderness Travel & Foraging', icon: '🧭', desc: 'Overland pace calculator, 5.5e foraging and navigation DCs, and roadside complications.' },
    { id: 'secrets', name: 'Secrets & Clues', icon: '🗝️', desc: 'DM prep secret truths, revealable clues, and session revelations.' },
    { id: 'handouts', name: 'Handouts & Letters', icon: '✉️', desc: 'In-game letters, player props, parchments, and broadcastable handouts.' },
    { id: 'npcs', name: 'NPC Generator & Roster', icon: '👤', desc: 'Instant 5.5e NPC generator with voices, secrets, statblocks, and campaign roster.' },
    { id: 'loot', name: 'Loot & Merchant Generator', icon: '💰', desc: 'Random treasure hoards, coin pouch rolling, and categorized shopkeepers.' },
    { id: 'notes', name: 'Session Scratchpad', icon: '📝', desc: 'In-session DM scratchpad, tagged notes, quick search, and session logs.' },
    { id: 'audio', name: 'Atmosphere & Lighting', icon: '🎭', desc: 'Layered soundscapes, ambient soundboards, and Amaran smart studio lighting.' }
];

const WORLD_SUBMODULE_IDS = ['overworld', 'locations', 'factions', 'quests', 'pantheon', 'timeline', 'travel', 'secrets', 'handouts'];

const DEFAULT_FACTIONS = [
    "Unaligned / Independent Local",
    "The Obsidian Syndicate (Smugglers & Thieves)",
    "Order of the Silver Gauntlet (Chivalric Watch)",
    "The Gilded Scales Consortium (Merchant Guild)",
    "Circle of the Pale Moon (Arcane Cabal)",
    "The Ironbound Union (Artisans & Dockworkers)",
    "Whispering Court (Spy Network)"
];

const DEFAULT_LOCATIONS = [
    "The Sunken Ward (Dockside Slums)",
    "Oakhaven Market Square",
    "The Cinder-Forge District",
    "Highspire Noble Quarter",
    "The Rusted Anchor Tavern",
    "Crossroads Caravan Waystation",
    "Ironpeak Citadel Outskirts"
];

// Simple synthesized dice roll sound via Web Audio API
function playDiceSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        for (let i = 0; i < 4; i++) {
            setTimeout(() => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(280 + Math.random() * 260, audioCtx.currentTime);
                gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 0.08);
            }, i * 45);
        }
    } catch (e) {
        // audio context not allowed or unsupported
    }
}

// -----------------------------------------------------------------------------
// API & STORAGE LAYER
// -----------------------------------------------------------------------------
async function fetchFullState() {
    try {
        const res = await fetch('/api/state');
        if (res.ok) {
            const data = await res.json();
            appState.party = Array.isArray(data.party) ? data.party : [];
            if (data.combat) appState.combat = data.combat;
            if (Array.isArray(data.roster)) appState.roster = data.roster;
            if (data.world) appState.world = data.world;
            if (data.rules) appState.rules = data.rules;
            if (Array.isArray(data.notes)) appState.notes = data.notes;
            if (data.timeWeather) appState.timeWeather = data.timeWeather;
            if (Array.isArray(data.monsters) && data.monsters.length > 0) {
                appState.monsters = data.monsters;
                if (!appState.selectedMonsterId) appState.selectedMonsterId = data.monsters[0].id;
            }
            if (Array.isArray(data.locations)) appState.locations = data.locations;
            if (Array.isArray(data.factions)) appState.factions = data.factions;
            if (Array.isArray(data.quests)) appState.quests = data.quests;
            if (Array.isArray(data.rumors)) appState.rumors = data.rumors;
            if (Array.isArray(data.secrets)) appState.secrets = data.secrets;
            if (Array.isArray(data.handouts)) appState.handouts = data.handouts;
            if (data.broadcast !== undefined) {
                appState.broadcast = data.broadcast;
                renderBroadcastPill();
            }
            if (Array.isArray(data.audioLibrary)) {
                appState.audioLibrary = data.audioLibrary;
                if (window.AudioEngine) window.AudioEngine.loadTracks(data.audioLibrary);
            }
            if (Array.isArray(data.audioPresets)) {
                appState.audioPresets = data.audioPresets;
            }
            if (Array.isArray(data.spells) && data.spells.length > 0) {
                appState.spells = data.spells;
                if (!appState.selectedSpellId) appState.selectedSpellId = data.spells[0].id;
            }
            if (Array.isArray(data.items) && data.items.length > 0) {
                appState.items = data.items;
                if (!appState.selectedItemId) appState.selectedItemId = data.items[0].id;
            }
            if (Array.isArray(data.encounters)) {
                appState.encounters = data.encounters;
            }
            if (data.lighting) {
                appState.lighting = data.lighting;
                if (window.LightingEngine) {
                    window.LightingEngine.state = Object.assign(window.LightingEngine.state, data.lighting);
                    window.LightingEngine.updateUI();
                }
            }
            if (data.campaigns) appState.campaigns = data.campaigns;
            if (data.activeCampaignId) appState.activeCampaignId = data.activeCampaignId;
            if (data.presets) appState.playstylePresets = data.presets;
            if (data.currentCampaign) {
                appState.currentCampaign = data.currentCampaign;
            } else if (appState.campaigns && appState.campaigns.length > 0) {
                appState.currentCampaign = appState.campaigns.find(c => c.id === appState.activeCampaignId) || appState.campaigns[0];
            }
            appState.overworld = data.overworld || { pins: [], routes: [], regions: [] };
            appState.factionRelations = data.factionRelations || { relations: [], turnHistory: [] };
            appState.pantheon = Array.isArray(data.pantheon) ? data.pantheon : [];
            appState.timeline = data.timeline || { eras: [], events: [] };
            appState.partyStash = data.partyStash || { currency: { pp: 0, gp: 0, sp: 0, cp: 0 }, items: [] };
            if (!appState.partyStash.coins && appState.partyStash.currency) {
                appState.partyStash.coins = appState.partyStash.currency;
            }
            appState.travel = data.travel || { pace: 'Normal', terrain: 'Forest', road: 'trail', targetMiles: 48, marchHours: 8, navBonus: 0, forageBonus: 0, history: [] };
            renderCampaignTopbar();
            applyModuleVisibility();
            populateTopFilterDropdowns();
            updateConnectionStatus(true);
            return;
        }
    } catch (err) {
        console.warn("Backend not reached, loading local storage:", err);
    }
    updateConnectionStatus(false);
    loadFromLocalStorage();
    populateTopFilterDropdowns();
}

function updateConnectionStatus(online) {
    const el = document.getElementById('connection-status');
    if (!el) return;
    if (online) {
        el.className = "flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-800/60";
        el.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span>Server Active</span>`;
    } else {
        el.className = "flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-950/80 text-amber-400 border border-amber-800/60";
        el.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span><span>Browser Cache</span>`;
    }
}

function loadFromLocalStorage() {
    const local = localStorage.getItem("ARCANE_LEDGER_STORAGE_V2");
    if (local) {
        try {
            const parsed = JSON.parse(local);
            if (parsed.party) appState.party = parsed.party;
            if (parsed.combat) appState.combat = parsed.combat;
            if (parsed.roster) appState.roster = parsed.roster;
            if (parsed.world) appState.world = parsed.world;
        } catch (e) {
            console.error(e);
        }
    }
}

function saveToLocalStorage() {
    const payload = {
        party: appState.party,
        combat: appState.combat,
        roster: appState.roster,
        world: appState.world
    };
    localStorage.setItem("ARCANE_LEDGER_STORAGE_V2", JSON.stringify(payload));
}

async function apiSaveParty() {
    saveToLocalStorage();
    try {
        await fetch('/api/party', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appState.party)
        });
    } catch (e) {}
}

async function apiSaveCombat() {
    saveToLocalStorage();
    try {
        await fetch('/api/combat/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appState.combat)
        });
    } catch (e) {}
}

async function apiSaveRosterNPC(npc) {
    saveToLocalStorage();
    try {
        const res = await fetch('/api/roster', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(npc)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.roster) appState.roster = data.roster;
            if (data.locations) {
                appState.locations = data.locations;
                renderLocations();
            }
        }
    } catch (e) {}
}

async function apiDeleteRosterNPC(id) {
    saveToLocalStorage();
    try {
        const res = await fetch(`/api/roster/${id}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.roster) appState.roster = data.roster;
            if (data.locations) {
                appState.locations = data.locations;
                renderLocations();
            }
        }
    } catch (e) {}
}

// -----------------------------------------------------------------------------
// TAB NAVIGATION & OPTION B SIDEBAR / TOPBAR
// -----------------------------------------------------------------------------
const TAB_TITLES = {
    'combat': { icon: '⚔️', title: 'Combat & Party' },
    'battlemap': { icon: '🗺️', title: 'Tabletop Battlemap' },
    'bestiary': { icon: '🐉', title: '5.5e Bestiary' },
    'encounters': { icon: '⚖️', title: 'Encounter Builder' },
    'spells': { icon: '📖', title: 'Spells Compendium' },
    'items': { icon: '⚔️', title: 'Items Compendium' },
    'rules': { icon: '📜', title: '2024 Rules Engine' },
    'world': { icon: '🏰', title: 'World, Factions & Quests' },
    'npcs': { icon: '👤', title: 'NPC Generator & Roster' },
    'loot': { icon: '💰', title: 'Loot & Merchants' },
    'notes': { icon: '📝', title: 'Session Scratchpad' },
    'audio': { icon: '🎭', title: 'Atmosphere & Lighting' },
    'settings': { icon: '⚙️', title: 'System Settings & Keybinds' }
};

function switchTab(tab) {
    if (tab !== 'settings' && appState.currentCampaign?.modules && appState.currentCampaign.modules[tab] === false) {
        const modDef = AVAILABLE_MODULES.find(m => m.id === tab);
        showToast(`The ${modDef ? modDef.name : tab} module is disabled for this campaign. Enable it in Settings > Modules.`, 'info');
        return;
    }
    appState.activeTab = tab;
    document.querySelectorAll('.tab-view').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-amber-500/20', 'text-amber-300', 'border-amber-500/40');
        btn.classList.add('text-slate-400');
    });

    const activeView = document.getElementById(`view-${tab}`);
    const activeBtn = document.getElementById(`tab-btn-${tab}`);
    if (activeView) activeView.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-400');
        activeBtn.classList.add('bg-amber-500/20', 'text-amber-300', 'border-amber-500/40');
    }

    const topTitle = document.getElementById('topbar-view-title');
    if (topTitle && TAB_TITLES[tab]) {
        topTitle.innerHTML = `<span>${TAB_TITLES[tab].icon}</span> <span>${TAB_TITLES[tab].title}</span>`;
    }

    if (tab === 'combat') {
        renderPartyHUD();
        renderCombatTracker();
    } else if (tab === 'npcs') {
        populateTopFilterDropdowns();
        renderCurrentNPC();
        renderRoster();
    } else if (tab === 'rules') {
        renderRulesScreen();
    } else if (tab === 'loot') {
        renderLootScreen();
    } else if (tab === 'notes') {
        renderSessionNotes();
    } else if (tab === 'bestiary') {
        renderBestiary();
    } else if (tab === 'world') {
        renderWorldView();
    } else if (tab === 'audio') {
        renderAudioMixer();
        if (window.LightingEngine) {
            window.LightingEngine.updateUI();
        }
    } else if (tab === 'encounters') {
        renderEncountersView();
    } else if (tab === 'spells') {
        renderSpellsView();
    } else if (tab === 'items') {
        renderItemsView();
    } else if (tab === 'battlemap') {
        if (window.BattlemapController) {
            window.BattlemapController.init();
        }
    } else if (tab === 'settings') {
        renderSettingsView();
    }
}

// Sidebar Expansion Toggle
function toggleSidebarExpansion() {
    const sidebar = document.getElementById('app-sidebar');
    const toggleIcon = document.getElementById('sidebar-toggle-icon');
    if (!sidebar) return;
    const isCurrentlyExpanded = sidebar.classList.contains('is-expanded');
    if (isCurrentlyExpanded) {
        sidebar.classList.remove('is-expanded');
        sidebar.classList.add('is-compact');
        if (toggleIcon) toggleIcon.textContent = '▶';
        localStorage.setItem('arcane_sidebar_expanded', 'false');
    } else {
        sidebar.classList.remove('is-compact');
        sidebar.classList.add('is-expanded');
        if (toggleIcon) toggleIcon.textContent = '◀';
        localStorage.setItem('arcane_sidebar_expanded', 'true');
    }
}

function initSidebarState() {
    const isExpanded = localStorage.getItem('arcane_sidebar_expanded') === 'true';
    const sidebar = document.getElementById('app-sidebar');
    const toggleIcon = document.getElementById('sidebar-toggle-icon');
    if (!sidebar) return;
    if (isExpanded) {
        sidebar.classList.remove('is-compact');
        sidebar.classList.add('is-expanded');
        if (toggleIcon) toggleIcon.textContent = '◀';
    } else {
        sidebar.classList.remove('is-expanded');
        sidebar.classList.add('is-compact');
        if (toggleIcon) toggleIcon.textContent = '▶';
    }
}

// Topbar Popovers Management
function toggleTopPopover(popoverId) {
    const target = document.getElementById(popoverId);
    if (!target) return;
    const isHidden = target.classList.contains('hidden');
    closeAllTopPopovers();
    if (isHidden) {
        target.classList.remove('hidden');
    }
}

function closeAllTopPopovers() {
    const popoverIds = ['time-weather-popover', 'audio-popover', 'zoom-popover', 'displays-popover', 'dice-drawer', 'campaign-popover'];
    popoverIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

// Global outside-click listener for topbar popovers
document.addEventListener('click', function(e) {
    const popovers = [
        { popover: 'time-weather-popover', trigger: 'time-weather-pill' },
        { popover: 'audio-popover', trigger: 'audio-pill' },
        { popover: 'displays-popover', trigger: 'displays-pill' },
        { popover: 'dice-drawer', trigger: 'dice-btn' },
        { popover: 'campaign-popover', trigger: 'topbar-campaign-btn' }
    ];

    popovers.forEach(item => {
        const popEl = document.getElementById(item.popover);
        const trigEl = document.getElementById(item.trigger);
        if (popEl && !popEl.classList.contains('hidden')) {
            if (!popEl.contains(e.target) && (!trigEl || !trigEl.contains(e.target))) {
                popEl.classList.add('hidden');
            }
        }
    });
});

// Close popovers on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAllTopPopovers();
    }
});

// -----------------------------------------------------------------------------
// PARTY STATUS HUD (2024 RULES)
// -----------------------------------------------------------------------------
function renderPartyHUD() {
    const container = document.getElementById('party-hud-list');
    if (!container) return;

    if (!appState.party || appState.party.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-6 text-center border border-dashed border-ledger-700 rounded-xl text-slate-400 text-xs">
                No active player characters. Click "+ Add Player Character" to setup your party roster.
            </div>`;
        return;
    }

    container.innerHTML = appState.party.map(pc => {
        const curHp = (pc.currentHp !== undefined) ? Number(pc.currentHp) : ((pc.hp !== undefined) ? Number(pc.hp) : 0);
        const maxHp = (pc.maxHp !== undefined) ? Number(pc.maxHp) : (curHp || 1);
        pc.currentHp = curHp;
        pc.maxHp = maxHp;
        const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, Math.round((curHp / maxHp) * 100))) : 0;
        const isBloodied = curHp > 0 && curHp <= Math.floor(maxHp / 2);
        const isUnconscious = curHp === 0;

        let hpBarColor = "bg-emerald-500";
        if (isUnconscious) hpBarColor = "bg-rose-700";
        else if (isBloodied) hpBarColor = "bg-amber-500";

        let spellSlotsHtml = '';
        if (pc.spellSlots && Object.keys(pc.spellSlots).length > 0) {
            const slotEntries = Object.entries(pc.spellSlots).filter(([lvl, s]) => s && s.total > 0);
            if (slotEntries.length > 0) {
                spellSlotsHtml = `
                    <div class="mt-2.5 pt-2 border-t border-ledger-800 text-xs">
                        <div class="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                            <span>✨ Spell Slots</span>
                            <span class="text-sky-400 font-mono">2024</span>
                        </div>
                        <div class="flex flex-wrap gap-2 items-center">
                            ${slotEntries.map(([lvl, s]) => {
                                const levelNum = lvl.replace('level_', '');
                                const total = s.total || 0;
                                const used = s.used || 0;
                                const remaining = Math.max(0, total - used);
                                return `
                                    <div class="flex items-center gap-1.5 bg-ledger-950 px-2 py-0.5 rounded-md border border-ledger-800 text-[10px]">
                                        <span class="text-slate-400 font-mono font-bold">L${levelNum}:</span>
                                        <div class="flex items-center gap-1">
                                            ${Array.from({ length: total }).map((_, i) => {
                                                const isAvailable = i < remaining;
                                                return `
                                                    <button onclick="toggleSpellSlot('${pc.id}', '${lvl}', ${i})" title="${isAvailable ? 'Click to expend slot' : 'Click to restore slot'}" class="w-3.5 h-3.5 rounded-full border transition active:scale-90 ${isAvailable ? 'bg-sky-400 border-sky-300 shadow-sm shadow-sky-400/50' : 'bg-ledger-900 border-ledger-700 hover:border-slate-500'}"></button>
                                                `;
                                            }).join('')}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }
        }

        let resourcesHtml = '';
        if (pc.resources && pc.resources.length > 0) {
            resourcesHtml = `
                <div class="mt-2 pt-1.5 border-t border-ledger-800/80 text-xs">
                    <div class="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">
                        <span>⚡ Features & Powers</span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 items-center">
                        ${pc.resources.map((r, rIdx) => {
                            const total = r.total || 1;
                            const used = r.used || 0;
                            const remaining = Math.max(0, total - used);
                            const isExhausted = remaining === 0;
                            return `
                                <div class="flex items-center gap-1.5 bg-ledger-950 px-2 py-0.5 rounded-md border ${isExhausted ? 'border-rose-900/60 text-slate-500 bg-rose-950/10' : 'border-ledger-800 text-slate-300'} text-[10px]">
                                    <span class="font-medium truncate max-w-[95px]" title="${escapeHTML(r.name)}">${escapeHTML(r.name)}</span>
                                    <button onclick="toggleResource('${pc.id}', ${rIdx}, 1)" title="Expend one charge" class="px-1.5 py-0.2 rounded bg-ledger-900 hover:bg-amber-500 hover:text-ledger-950 text-amber-300 font-mono font-bold border border-ledger-700 transition">
                                        ${remaining}/${total}
                                    </button>
                                    <button onclick="toggleResource('${pc.id}', ${rIdx}, -1)" title="Recover one charge" class="text-slate-500 hover:text-emerald-400 font-bold px-0.5 transition">+</button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }

        return `
            <div class="trait-card rounded-xl p-3.5 flex flex-col justify-between relative overflow-hidden transition ${isUnconscious ? 'border-rose-600/70 shadow-lg shadow-rose-950/40' : (isBloodied ? 'border-amber-500/50' : '')}">
                
                <!-- Card Header: Name, Player & Heroic Inspiration -->
                <div class="flex items-start justify-between gap-2">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <h3 class="font-bold text-sm text-slate-100 truncate">${escapeHTML(pc.name)}</h3>
                            ${pc.player ? `<span class="text-[10px] text-slate-400 font-mono truncate">(${escapeHTML(pc.player)})</span>` : ''}
                        </div>
                        <p class="text-[11px] text-sky-400/90 font-medium truncate">${escapeHTML(pc.classRole)} • Lvl ${pc.level}</p>
                    </div>

                    <!-- 2024 Heroic Inspiration Toggle -->
                    <button onclick="toggleHeroicInspiration('${pc.id}')" title="2024 Heroic Inspiration: Reroll any die roll or grant to ally" class="px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 border transition ${pc.heroicInspiration ? 'bg-amber-500 text-ledger-950 border-amber-300 shadow-md shadow-amber-500/30' : 'bg-ledger-900/80 text-slate-400 border-ledger-700 hover:text-amber-400'}">
                        <svg class="w-3.5 h-3.5 ${pc.heroicInspiration ? 'text-ledger-950' : 'text-amber-400'}" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        <span>${pc.heroicInspiration ? 'INSPIRED' : 'Inspiration'}</span>
                    </button>
                </div>

                <!-- Stats Bar: AC, Speed, Passive Senses, Spell DC -->
                <div class="grid grid-cols-4 gap-1.5 my-2.5 bg-ledger-950/80 p-1.5 rounded-lg border border-ledger-800 text-center">
                    <div>
                        <span class="text-[9px] uppercase tracking-wider text-slate-400 block">AC</span>
                        <span class="font-mono font-bold text-xs text-amber-300">${pc.ac}</span>
                    </div>
                    <div>
                        <span class="text-[9px] uppercase tracking-wider text-slate-400 block">PP</span>
                        <span class="font-mono font-bold text-xs text-slate-200" title="Passive Perception">${pc.passivePerception}</span>
                    </div>
                    <div>
                        <span class="text-[9px] uppercase tracking-wider text-slate-400 block">PI / PInv</span>
                        <span class="font-mono font-bold text-xs text-slate-200" title="Passive Insight / Investigation">${pc.passiveInsight}/${pc.passiveInvestigation}</span>
                    </div>
                    <div>
                        <span class="text-[9px] uppercase tracking-wider text-slate-400 block">Spell DC</span>
                        <span class="font-mono font-bold text-xs ${pc.spellDc ? 'text-sky-300' : 'text-slate-500'}">${pc.spellDc || '—'}</span>
                    </div>
                </div>

                <!-- Health Bar & Quick HP Control -->
                <div class="space-y-1.5">
                    <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-1.5">
                            <span class="font-semibold text-slate-300">HP:</span>
                            <span class="font-mono font-bold text-sm ${isUnconscious ? 'text-rose-400' : (isBloodied ? 'text-amber-300' : 'text-white')}">
                                ${pc.currentHp} / ${pc.maxHp}
                            </span>
                            ${pc.tempHp > 0 ? `<span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">+${pc.tempHp} Temp</span>` : ''}
                        </div>
                        <div class="flex items-center gap-1">
                            ${isBloodied ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">Bloodied</span>` : ''}
                            ${isUnconscious ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">0 HP (Down)</span>` : ''}
                        </div>
                    </div>

                    <!-- Visual Progress Bar -->
                    <div class="w-full bg-ledger-900 rounded-full h-2 overflow-hidden border border-ledger-700">
                        <div class="${hpBarColor} h-full transition-all duration-300" style="width: ${hpPct}%"></div>
                    </div>

                    <!-- Quick Modify Buttons -->
                    <div class="flex items-center justify-between gap-1 pt-1">
                        <div class="flex items-center gap-1">
                            <button onclick="modifyPCHp('${pc.id}', -5)" class="px-1.5 py-0.5 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-mono font-bold transition">-5</button>
                            <button onclick="modifyPCHp('${pc.id}', -1)" class="px-1.5 py-0.5 rounded bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-mono font-bold transition">-1</button>
                            <button onclick="modifyPCHp('${pc.id}', 1)" class="px-1.5 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 text-xs font-mono font-bold transition">+1</button>
                            <button onclick="modifyPCHp('${pc.id}', 5)" class="px-1.5 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 text-xs font-mono font-bold transition">+5</button>
                        </div>
                        <div class="flex items-center gap-1">
                            <button onclick="openPartyInventoryModal('${pc.id}')" title="Character Inventory & Magic Items" class="px-2 py-0.5 rounded bg-ledger-800 hover:bg-ledger-700 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-[11px] font-semibold flex items-center gap-0.5 transition"><span>🎒</span><span>Inv</span></button>
                            <button onclick="promptCustomHP('${pc.id}')" title="Custom Damage, Heal or Temp HP" class="px-2 py-0.5 rounded bg-ledger-800 hover:bg-ledger-700 border border-ledger-600 text-slate-300 hover:text-white text-[11px] transition">Adjust</button>
                            <button onclick="openEditPCModal('${pc.id}')" title="Edit Character Sheet" class="p-1 rounded bg-ledger-800 hover:bg-ledger-700 border border-ledger-700 text-slate-400 hover:text-amber-400 transition">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 2024 Spell Slots & Class Resources -->
                ${spellSlotsHtml}
                ${resourcesHtml}

                <!-- 2024 Death Saves Tracker (Appears when 0 HP) -->
                ${isUnconscious ? `
                    <div class="mt-2.5 pt-2 border-t border-rose-900/60 bg-rose-950/30 -mx-3.5 -mb-3.5 p-2.5 rounded-b-xl space-y-1.5">
                        <div class="flex items-center justify-between text-[11px]">
                            <span class="font-bold text-rose-300 uppercase tracking-wider">Death Saves (2024)</span>
                            <span class="text-[10px] text-slate-400">Nat 20 = 1 HP Stand</span>
                        </div>
                        <div class="flex items-center justify-between gap-3 text-xs">
                            <div class="flex items-center gap-1.5">
                                <span class="text-[10px] text-emerald-400 font-medium">Success:</span>
                                ${[0, 1, 2].map(i => `
                                    <button onclick="toggleDeathSave('${pc.id}', 'success', ${i})" class="w-4 h-4 rounded-full border border-emerald-500/60 flex items-center justify-center transition ${i < (pc.deathSaves?.successes || 0) ? 'bg-emerald-500 text-black' : 'bg-ledger-900 hover:bg-emerald-950'}">
                                        ${i < (pc.deathSaves?.successes || 0) ? '✓' : ''}
                                    </button>
                                `).join('')}
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="text-[10px] text-rose-400 font-medium">Failure:</span>
                                ${[0, 1, 2].map(i => `
                                    <button onclick="toggleDeathSave('${pc.id}', 'failure', ${i})" class="w-4 h-4 rounded-full border border-rose-500/60 flex items-center justify-center transition ${i < (pc.deathSaves?.failures || 0) ? 'bg-rose-600 text-white' : 'bg-ledger-900 hover:bg-rose-950'}">
                                        ${i < (pc.deathSaves?.failures || 0) ? '✕' : ''}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                ` : ''}

            </div>
        `;
    }).join('');
}

async function toggleSpellSlot(pcId, level, slotIndex) {
    const pc = appState.party.find(p => p.id === pcId);
    if (!pc || !pc.spellSlots || !pc.spellSlots[level]) return;
    const s = pc.spellSlots[level];
    const remaining = Math.max(0, s.total - (s.used || 0));
    if (slotIndex < remaining) {
        s.used = (s.used || 0) + 1;
    } else {
        s.used = Math.max(0, (s.used || 0) - 1);
    }
    renderPartyHUD();
    try {
        await fetch(`/api/party/${pcId}/spell-slot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ level: level, used: s.used })
        });
    } catch (e) {
        apiSaveParty();
    }
}

async function toggleResource(pcId, resourceIndex, delta) {
    const pc = appState.party.find(p => p.id === pcId);
    if (!pc || !pc.resources || !pc.resources[resourceIndex]) return;
    const r = pc.resources[resourceIndex];
    r.used = Math.max(0, Math.min(r.total, (r.used || 0) + delta));
    renderPartyHUD();
    try {
        await fetch(`/api/party/${pcId}/resource`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resourceId: r.id, used: r.used })
        });
    } catch (e) {
        apiSaveParty();
    }
}

function modifyPCHp(pcId, delta) {
    const pc = appState.party.find(p => p.id === pcId);
    if (!pc) return;

    const oldHp = pc.currentHp;
    const halfHp = Math.floor(pc.maxHp / 2);
    const wasBloodied = oldHp <= halfHp && oldHp > 0;
    const wasAlive = oldHp > 0;

    if (delta < 0) {
        let dmg = Math.abs(delta);
        // Absorb temp HP first
        if (pc.tempHp > 0) {
            if (pc.tempHp >= dmg) {
                pc.tempHp -= dmg;
                dmg = 0;
            } else {
                dmg -= pc.tempHp;
                pc.tempHp = 0;
            }
        }
        pc.currentHp = Math.max(0, pc.currentHp - dmg);
        if (pc.currentHp === 0 && !pc.deathSaves) {
            pc.deathSaves = { successes: 0, failures: 0 };
        }

        // Reactive Lighting & SFX for Party
        const isNowBloodied = pc.currentHp <= halfHp && pc.currentHp > 0;
        const isNowDown = pc.currentHp === 0;
        if (window.LightingEngine && window.LightingEngine.reactiveCombat) {
            if (wasAlive && isNowDown) {
                window.LightingEngine.setHeroDownState(true, pc.name);
            } else if (!wasBloodied && isNowBloodied) {
                window.LightingEngine.triggerBloodiedPulse({ name: pc.name, type: 'pc' });
            }
        }
    } else {
        pc.currentHp = Math.min(pc.maxHp, pc.currentHp + delta);
        if (pc.currentHp > 0 && pc.deathSaves) {
            pc.deathSaves.successes = 0;
            pc.deathSaves.failures = 0;
        }

        // Reactive Lighting: Hero Revived
        if (oldHp === 0 && pc.currentHp > 0) {
            if (window.LightingEngine && window.LightingEngine.reactiveCombat) {
                window.LightingEngine.setHeroDownState(false, pc.name);
            }
        }
    }

    renderPartyHUD();
    apiSaveParty();
}

function promptCustomHP(pcId) {
    const pc = appState.party.find(p => p.id === pcId);
    if (!pc) return;
    const amountStr = prompt(`Enter HP change for ${pc.name}:\n• Use positive for Heal (e.g. 12)\n• Use negative for Damage (e.g. -8)\n• Prefix with "t" for Temp HP (e.g. t10)`);
    if (!amountStr) return;

    const trimmed = amountStr.trim().toLowerCase();
    if (trimmed.startsWith('t')) {
        const val = parseInt(trimmed.slice(1));
        if (!isNaN(val)) {
            pc.tempHp = Math.max(0, val);
            showToast(`Set ${pc.name} Temp HP to ${pc.tempHp}`, "info");
        }
    } else {
        const val = parseInt(trimmed);
        if (!isNaN(val)) {
            modifyPCHp(pcId, val);
            showToast(`${pc.name}: ${val >= 0 ? '+' : ''}${val} HP`, "info");
        }
    }
    renderPartyHUD();
    apiSaveParty();
}

function toggleHeroicInspiration(pcId) {
    const pc = appState.party.find(p => p.id === pcId);
    if (!pc) return;
    pc.heroicInspiration = !pc.heroicInspiration;
    renderPartyHUD();
    apiSaveParty();
    showToast(`${pc.name} ${pc.heroicInspiration ? 'gained Heroic Inspiration! 🌟' : 'spent Heroic Inspiration'}`, "info");
}

function toggleDeathSave(pcId, type, index) {
    const pc = appState.party.find(p => p.id === pcId);
    if (!pc) return;
    if (!pc.deathSaves) pc.deathSaves = { successes: 0, failures: 0 };

    if (type === 'success') {
        pc.deathSaves.successes = (pc.deathSaves.successes === index + 1) ? index : index + 1;
        if (pc.deathSaves.successes >= 3) {
            showToast(`${pc.name} is STABILIZED! (Awakens with 1 HP in 1d4 hrs)`, "success");
        }
    } else {
        pc.deathSaves.failures = (pc.deathSaves.failures === index + 1) ? index : index + 1;
        if (pc.deathSaves.failures >= 3) {
            showToast(`${pc.name} has suffered 3 DEATH SAVE FAILURES! 💀`, "error");
        }
    }
    renderPartyHUD();
    apiSaveParty();
}

function openEditPCModal(pcId) {
    const pc = appState.party.find(p => p.id === pcId) || {
        id: "pc-" + Date.now(),
        name: "",
        player: "",
        species: "Human",
        classRole: "Fighter",
        level: 1,
        ac: 10,
        speed: 30,
        currentHp: 10,
        maxHp: 10,
        tempHp: 0,
        initiativeMod: 0,
        passivePerception: 10,
        passiveInsight: 10,
        passiveInvestigation: 10,
        spellDc: null,
        heroicInspiration: false,
        notes: ""
    };

    document.getElementById('edit-pc-id').value = pc.id;
    document.getElementById('edit-pc-name').value = pc.name;
    document.getElementById('edit-pc-player').value = pc.player;
    document.getElementById('edit-pc-species').value = pc.species;
    document.getElementById('edit-pc-class').value = pc.classRole;
    document.getElementById('edit-pc-level').value = pc.level;
    document.getElementById('edit-pc-ac').value = pc.ac;
    document.getElementById('edit-pc-speed').value = pc.speed || 30;
    document.getElementById('edit-pc-hp').value = pc.currentHp;
    document.getElementById('edit-pc-max-hp').value = pc.maxHp;
    document.getElementById('edit-pc-init-mod').value = pc.initiativeMod;
    document.getElementById('edit-pc-pp').value = pc.passivePerception;
    document.getElementById('edit-pc-pi').value = pc.passiveInsight;
    document.getElementById('edit-pc-pinv').value = pc.passiveInvestigation;
    document.getElementById('edit-pc-spelldc').value = pc.spellDc || "";
    document.getElementById('edit-pc-notes').value = pc.notes || "";

    openModal('edit-pc-modal');
}

function savePCFromModal() {
    const id = document.getElementById('edit-pc-id').value;
    let pc = appState.party.find(p => p.id === id);
    const isNew = !pc;

    if (isNew) {
        pc = { id: id, deathSaves: { successes: 0, failures: 0 } };
        appState.party.push(pc);
    }

    pc.name = document.getElementById('edit-pc-name').value.trim() || "Adventurer";
    pc.player = document.getElementById('edit-pc-player').value.trim();
    pc.species = document.getElementById('edit-pc-species').value.trim();
    pc.classRole = document.getElementById('edit-pc-class').value.trim();
    pc.level = parseInt(document.getElementById('edit-pc-level').value) || 1;
    pc.ac = parseInt(document.getElementById('edit-pc-ac').value) || 10;
    pc.speed = parseInt(document.getElementById('edit-pc-speed').value) || 30;
    pc.maxHp = parseInt(document.getElementById('edit-pc-max-hp').value) || 10;
    pc.currentHp = Math.min(pc.maxHp, parseInt(document.getElementById('edit-pc-hp').value) || pc.maxHp);
    pc.initiativeMod = parseInt(document.getElementById('edit-pc-init-mod').value) || 0;
    pc.passivePerception = parseInt(document.getElementById('edit-pc-pp').value) || 10;
    pc.passiveInsight = parseInt(document.getElementById('edit-pc-pi').value) || 10;
    pc.passiveInvestigation = parseInt(document.getElementById('edit-pc-pinv').value) || 10;
    
    const dcVal = document.getElementById('edit-pc-spelldc').value.trim();
    pc.spellDc = dcVal ? parseInt(dcVal) : null;
    pc.notes = document.getElementById('edit-pc-notes').value.trim();

    closeModal('edit-pc-modal');
    renderPartyHUD();
    renderShopInventory();
    apiSaveParty();
    showToast(`Saved character: ${pc.name}`, "success");
}

function deleteCurrentPC() {
    const id = document.getElementById('edit-pc-id').value;
    if (!confirm("Are you sure you want to remove this character from the party?")) return;
    appState.party = appState.party.filter(p => p.id !== id);
    closeModal('edit-pc-modal');
    renderPartyHUD();
    renderShopInventory();
    apiSaveParty();
    showToast("Removed character from party", "info");
}

// -----------------------------------------------------------------------------
// DYNAMIC 2024 INITIATIVE & COMBAT TRACKER
// -----------------------------------------------------------------------------
function renderCombatTracker() {
    const combat = appState.combat;
    const combatants = combat.combatants || [];

    // Header controls
    const roundBadge = document.getElementById('combat-round-badge');
    const statusBanner = document.getElementById('combat-turn-banner');
    const startEndBtn = document.getElementById('btn-toggle-combat');

    if (roundBadge) roundBadge.innerText = `Round ${combat.round || 1}`;
    
    if (startEndBtn) {
        if (combat.inCombat) {
            startEndBtn.className = "px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition";
            startEndBtn.innerText = "End Combat";
            startEndBtn.onclick = endCombatEncounter;
        } else {
            startEndBtn.className = "px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-ledger-950 font-bold text-xs shadow-md transition";
            startEndBtn.innerText = "Start Combat";
            startEndBtn.onclick = startCombatEncounter;
        }
    }

    if (statusBanner) {
        if (combat.inCombat && combatants.length > 0) {
            const active = combatants[combat.currentTurnIndex || 0];
            statusBanner.innerHTML = `
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                    <span class="text-xs text-slate-300">Active Turn:</span>
                    <span class="text-sm font-bold text-amber-300 font-display">${escapeHTML(active.name)}</span>
                    <span class="text-[11px] font-mono px-1.5 py-0.2 rounded bg-ledger-800 text-slate-300 border border-ledger-700">Init: ${active.initiative}</span>
                </div>
            `;
        } else {
            statusBanner.innerHTML = `<span class="text-xs text-slate-400 italic">Encounter idle. Add combatants and click "Start Combat".</span>`;
        }
    }

    const listEl = document.getElementById('combatants-list');
    if (!listEl) return;

    if (combatants.length === 0) {
        listEl.innerHTML = `
            <div class="text-center py-12 px-4 border border-dashed border-ledger-700 rounded-xl text-slate-400 text-xs space-y-2">
                <p class="font-semibold text-slate-300 text-sm">No Active Combatants</p>
                <p>Add party members, monsters, or send an NPC directly from your generator.</p>
                <div class="flex items-center justify-center gap-2 pt-2">
                    <button onclick="importPartyToCombat()" class="px-3 py-1.5 rounded-lg bg-ledger-800 hover:bg-ledger-700 text-sky-300 border border-ledger-600 text-xs font-semibold transition">
                        🛡️ Import Entire Party
                    </button>
                    <button onclick="openAddCombatantModal()" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-ledger-950 text-xs font-bold transition">
                        ➕ Add Monster / Enemy
                    </button>
                </div>
            </div>
        `;
        return;
    }

    listEl.innerHTML = combatants.map((c, idx) => {
        const curHp = (c.currentHp !== undefined) ? Number(c.currentHp) : ((c.hp !== undefined) ? Number(c.hp) : 0);
        const maxHp = (c.maxHp !== undefined) ? Number(c.maxHp) : (curHp || 1);
        c.currentHp = curHp;
        c.maxHp = maxHp;
        const isActiveTurn = combat.inCombat && idx === combat.currentTurnIndex;
        const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, Math.round((curHp / maxHp) * 100))) : 0;
        const isBloodied = curHp > 0 && curHp <= Math.floor(maxHp / 2);
        const isDefeated = curHp <= 0;

        let badgeTypeColor = "bg-sky-500/20 text-sky-300 border-sky-500/30";
        if (c.type === 'monster') badgeTypeColor = "bg-rose-500/20 text-rose-300 border-rose-500/30";
        else if (c.type === 'npc') badgeTypeColor = "bg-purple-500/20 text-purple-300 border-purple-500/30";
        else if (c.type === 'boss') badgeTypeColor = "bg-amber-500/20 text-amber-300 border-amber-500/40";

        return `
            <div class="trait-card rounded-xl p-3 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 transition relative overflow-hidden ${isActiveTurn ? 'border-amber-400 shadow-xl shadow-amber-950/40 ring-1 ring-amber-400/50 bg-ledger-800/95' : (isDefeated ? 'opacity-60 bg-ledger-950/90' : '')}">
                
                ${isActiveTurn ? `<div class="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400"></div>` : ''}

                <!-- Left: Initiative Badge + Combatant Identity -->
                <div class="flex items-center gap-3 min-w-[200px] flex-1">
                    <!-- Initiative Editable Pill -->
                    <div class="flex flex-col items-center justify-center w-11 h-11 rounded-lg bg-ledger-950 border border-ledger-700 shrink-0">
                        <span class="text-[9px] uppercase tracking-wider text-slate-500 leading-none">Init</span>
                        <input type="number" value="${c.initiative}" onchange="updateCombatantInit('${c.id}', this.value)" class="w-full text-center bg-transparent text-sm font-mono font-bold text-amber-300 focus:outline-none">
                    </div>

                    ${c.imageUrl ? `
                        <div class="w-11 h-11 rounded-lg bg-ledger-950 border border-amber-500/50 overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
                            <img src="${escapeHTML(c.imageUrl)}" alt="${escapeHTML(c.name)}" class="w-full h-full object-cover">
                        </div>
                    ` : ''}

                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase border ${badgeTypeColor}">${c.type}</span>
                            <h4 onclick="setCombatTurn(${idx})" class="font-bold text-sm text-slate-100 hover:text-amber-300 cursor-pointer truncate transition" title="Click to jump active turn here">${escapeHTML(c.name)}</h4>
                            ${c.hidden ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-400 border border-slate-700" title="Hidden from Player Screen (Stealth / Fog)">🙈 Stealth</span>` : ''}
                            ${isBloodied ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">Bloodied</span>` : ''}
                            ${isDefeated ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">Defeated</span>` : ''}
                        </div>
                        <p class="text-[11px] text-slate-400 truncate mt-0.5">AC <span class="text-amber-300 font-bold">${c.ac}</span> • ${c.statDetails ? escapeHTML(c.statDetails) : 'Standard'}</p>
                    </div>
                </div>

                <!-- Center: HP Bar & Quick Damage / Heal Inputs -->
                <div class="flex flex-col gap-1 w-full md:w-64 shrink-0">
                    <div class="flex items-center justify-between text-xs">
                        <span class="font-mono font-semibold text-slate-300">
                            HP: <span class="text-white font-bold">${c.currentHp}</span> / ${c.maxHp}
                            ${c.tempHp > 0 ? `<span class="text-sky-300 text-[10px]">+${c.tempHp}</span>` : ''}
                        </span>
                        <span class="text-[10px] text-slate-400">${hpPct}%</span>
                    </div>

                    <div class="w-full bg-ledger-950 rounded-full h-2 overflow-hidden border border-ledger-700">
                        <div class="${c.currentHp <= 0 ? 'bg-rose-700' : (isBloodied ? 'bg-amber-500' : 'bg-emerald-500')} h-full transition-all duration-300" style="width: ${hpPct}%"></div>
                    </div>

                    <!-- Quick Inline Damage / Heal -->
                    <div class="flex items-center gap-1 pt-0.5">
                        <input id="dmg-input-${c.id}" type="number" placeholder="Amt" class="w-14 bg-ledger-950 border border-ledger-700 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500">
                        <button onclick="applyCombatantDamage('${c.id}', true)" title="Deal Damage" class="px-2 py-0.5 rounded bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-200 text-xs font-bold transition">Dmg</button>
                        <button onclick="applyCombatantDamage('${c.id}', false)" title="Heal" class="px-2 py-0.5 rounded bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-200 text-xs font-bold transition">Heal</button>
                        <button onclick="applyCombatantTempHP('${c.id}')" title="Temp HP" class="px-1.5 py-0.5 rounded bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-200 text-xs font-bold transition">Temp</button>
                    </div>
                </div>

                <!-- Right: Conditions, Concentration & Actions -->
                <div class="flex items-center gap-2 flex-wrap justify-between md:justify-end flex-1">
                    <!-- Conditions Badges -->
                    <div class="flex items-center gap-1 flex-wrap max-w-xs">
                        ${c.isConcentrating ? `
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center gap-1">
                                <span>🧠 Conc: ${escapeHTML(c.concentratingSpell || 'Spell')}</span>
                                <button onclick="toggleConcentration('${c.id}')" class="hover:text-rose-400">✕</button>
                            </span>
                        ` : ''}

                        ${(c.conditions || []).map((cond, condIdx) => `
                            <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1" title="${escapeHTML(cond.detail || cond.name)}">
                                <span>${escapeHTML(cond.name)}${cond.detail ? ` (${escapeHTML(cond.detail)})` : ''}</span>
                                <button onclick="removeCondition('${c.id}', ${condIdx})" class="hover:text-white">✕</button>
                            </span>
                        `).join('')}

                        <button onclick="openConditionPicker('${c.id}')" class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ledger-800 hover:bg-ledger-700 text-slate-300 hover:text-white border border-ledger-700 transition">
                            + Condition
                        </button>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex items-center gap-1 shrink-0">
                        <button onclick="toggleCombatantVisibility('${c.id}')" title="${c.hidden ? 'Show on Player Screen (Currently Hidden)' : 'Hide from Player Screen (Stealth / Fog)'}" class="p-1.5 rounded hover:bg-ledger-700 ${c.hidden ? 'text-slate-500' : 'text-emerald-400'} border border-ledger-700 transition">
                            ${c.hidden ? '🙈' : '👁️'}
                        </button>
                        <button onclick="addCombatantTokenToBattlemap('${c.id}')" title="Place token onto tabletop battlemap" class="p-1.5 rounded hover:bg-emerald-950/80 text-slate-400 hover:text-emerald-400 border border-ledger-700 transition">
                            🗺️
                        </button>
                        <button onclick="duplicateCombatant('${c.id}')" title="Duplicate Combatant" class="p-1.5 rounded hover:bg-ledger-700 text-slate-400 hover:text-amber-400 border border-ledger-700 transition">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
                        </button>
                        <button onclick="removeCombatant('${c.id}')" title="Remove from Combat" class="p-1.5 rounded hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-ledger-700 transition">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                    </div>
                </div>

            </div>
        `;
    }).join('');
}

function applyCombatTurnLighting(combatant) {
    if (!combatant || !window.LightingEngine || !window.LightingEngine.reactiveCombat) return;
    const isBoss = combatant.type === 'boss' || (combatant.name && combatant.name.toLowerCase().includes('boss'));
    if (isBoss) {
        window.LightingEngine.setTurnAmbiance('boss', combatant.name);
    } else if (combatant.type === 'pc' || combatant.type === 'player') {
        window.LightingEngine.setTurnAmbiance('pc', combatant.name);
    } else {
        window.LightingEngine.setTurnAmbiance('monster', combatant.name);
    }
}

function startCombatEncounter() {
    if (!appState.combat.combatants || appState.combat.combatants.length === 0) {
        showToast("Add combatants before starting combat!", "error");
        return;
    }
    appState.combat.inCombat = true;
    appState.combat.round = 1;
    appState.combat.currentTurnIndex = 0;
    sortCombatantsByInitiative();
    renderCombatTracker();
    apiSaveCombat();
    showToast("⚔️ Encounter started! Round 1", "success");

    // Immediately trigger reactive lighting for the first combatant
    applyCombatTurnLighting(appState.combat.combatants[0]);
}

function endCombatEncounter() {
    if (!confirm("End the current combat encounter?")) return;
    appState.combat.inCombat = false;
    if (window.LightingEngine && window.LightingEngine.restoreCombatBaseline) {
        window.LightingEngine.restoreCombatBaseline();
    }
    renderCombatTracker();
    apiSaveCombat();
    showToast("Combat encounter ended.", "info");
}

function resetCombatEncounter() {
    if (!confirm("Clear all combatants and reset tracker?")) return;
    appState.combat.inCombat = false;
    appState.combat.round = 1;
    appState.combat.currentTurnIndex = 0;
    appState.combat.combatants = [];
    if (window.LightingEngine && window.LightingEngine.restoreCombatBaseline) {
        window.LightingEngine.restoreCombatBaseline();
    }
    renderCombatTracker();
    apiSaveCombat();
    showToast("Cleared combat tracker.", "info");
}

function nextCombatTurn() {
    const combat = appState.combat;
    const combatants = combat.combatants;
    if (!combatants || combatants.length === 0) return;

    // Ensure encounter state is active when stepping through turns
    combat.inCombat = true;

    let nextIdx = combat.currentTurnIndex + 1;
    let newRound = combat.round;

    if (nextIdx >= combatants.length) {
        nextIdx = 0;
        newRound += 1;
        combat.round = newRound;
        showToast(`🔔 Round ${newRound} begins!`, "info");
    }
    combat.currentTurnIndex = nextIdx;

    // Condition duration expiration check
    combatants.forEach(c => {
        if (c.conditions) {
            c.conditions = c.conditions.filter(cond => {
                if (cond.durationRounds && cond.durationRounds > 0) {
                    if (newRound >= cond.appliedRound + cond.durationRounds) {
                        showToast(`${c.name}: Condition "${cond.name}" expired`, "info");
                        return false;
                    }
                }
                return true;
            });
        }
    });

    // Reactive Turn Lighting Shifting (Hero vs Monster vs Boss)
    applyCombatTurnLighting(combatants[nextIdx]);

    renderCombatTracker();
    apiSaveCombat();
}

function prevCombatTurn() {
    const combat = appState.combat;
    const combatants = combat.combatants;
    if (!combatants || combatants.length === 0) return;

    combat.inCombat = true;

    let prevIdx = combat.currentTurnIndex - 1;
    if (prevIdx < 0) {
        prevIdx = combatants.length - 1;
        combat.round = Math.max(1, combat.round - 1);
    }
    combat.currentTurnIndex = prevIdx;

    // Reactive Turn Lighting Shifting (Hero vs Monster vs Boss)
    applyCombatTurnLighting(combatants[prevIdx]);

    renderCombatTracker();
    apiSaveCombat();
}

function setCombatTurn(idx) {
    if (!appState.combat.combatants || !appState.combat.combatants[idx]) return;
    appState.combat.inCombat = true;
    appState.combat.currentTurnIndex = idx;
    applyCombatTurnLighting(appState.combat.combatants[idx]);
    renderCombatTracker();
    apiSaveCombat();
}

function sortCombatantsByInitiative() {
    appState.combat.combatants.sort((a, b) => {
        if (b.initiative !== a.initiative) return b.initiative - a.initiative;
        return (b.tieBreaker || 0) - (a.tieBreaker || 0);
    });
}

function updateCombatantInit(id, val) {
    const c = appState.combat.combatants.find(item => item.id === id);
    if (!c) return;
    c.initiative = parseFloat(val) || 0;
    if (appState.combat.inCombat) {
        sortCombatantsByInitiative();
    }
    renderCombatTracker();
    apiSaveCombat();
}

function applyCombatantDamage(id, isDamage) {
    const input = document.getElementById(`dmg-input-${id}`);
    if (!input || !input.value) return;
    const val = parseInt(input.value);
    if (isNaN(val) || val <= 0) return;

    const c = appState.combat.combatants.find(item => item.id === id);
    if (!c) return;

    const oldHp = c.currentHp;
    const halfHp = Math.floor(c.maxHp / 2);
    const wasBloodied = oldHp <= halfHp && oldHp > 0;
    const wasAlive = oldHp > 0;

    if (isDamage) {
        let dmg = val;
        // Check temp HP
        if (c.tempHp > 0) {
            if (c.tempHp >= dmg) {
                c.tempHp -= dmg;
                dmg = 0;
            } else {
                dmg -= c.tempHp;
                c.tempHp = 0;
            }
        }
        c.currentHp = Math.max(0, c.currentHp - dmg);

        // REACTIVE LIGHTING & SOUND TRIGGERS
        const isNowBloodied = c.currentHp <= halfHp && c.currentHp > 0;
        const isNowDown = c.currentHp === 0;

        if (window.LightingEngine && window.LightingEngine.reactiveCombat) {
            // 1. Slain / Defeated Enemy (Monster/Boss died)
            if (wasAlive && isNowDown && (c.type === 'monster' || c.type === 'boss')) {
                window.LightingEngine.triggerDeathBlow(c.name);
            }
            // 2. Hero Down (Player reached 0 HP)
            else if (wasAlive && isNowDown && c.type === 'pc') {
                window.LightingEngine.setHeroDownState(true, c.name);
            }
            // 3. Bloodied Threshold crossed (50% HP)
            else if (!wasBloodied && isNowBloodied) {
                window.LightingEngine.triggerBloodiedPulse(c);
            }
        }

        // Concentration DC Check Alert (2024 Rule: DC 10 or half damage taken, whichever is higher)
        if (c.isConcentrating && dmg > 0) {
            const conDC = Math.max(10, Math.floor(dmg / 2));
            showToast(`⚠️ ${c.name} took ${dmg} dmg! Make CON save: DC ${conDC} to keep Concentration!`, "error");
        } else {
            showToast(`${c.name} took ${val} damage`, "info");
        }
    } else {
        c.currentHp = Math.min(c.maxHp, c.currentHp + val);
        showToast(`${c.name} healed +${val} HP`, "success");

        // REACTIVE LIGHTING: Hero Revived from 0 HP
        if (oldHp === 0 && c.currentHp > 0 && c.type === 'pc') {
            if (window.LightingEngine && window.LightingEngine.reactiveCombat) {
                window.LightingEngine.setHeroDownState(false, c.name);
            }
        }
    }

    // Sync to party member if linked
    if (c.sourceId) {
        const pc = appState.party.find(p => p.id === c.sourceId);
        if (pc) {
            pc.currentHp = c.currentHp;
            pc.tempHp = c.tempHp;
            renderPartyHUD();
            apiSaveParty();
        }
    }
    
    // Sync to Battlemap token if linked
    syncCombatantHpToBattlemap(c.id, c.currentHp, c.maxHp);

    input.value = "";
    renderCombatTracker();
    apiSaveCombat();
}

function syncCombatantHpToBattlemap(combatantId, currentHp, maxHp) {
    if (window.BattlemapController && typeof window.BattlemapController.updateTokenHpByCombatantId === 'function') {
        window.BattlemapController.updateTokenHpByCombatantId(combatantId, currentHp, maxHp);
    }
}

function applyCombatantTempHP(id) {
    const input = document.getElementById(`dmg-input-${id}`);
    if (!input || !input.value) return;
    const val = parseInt(input.value);
    if (isNaN(val)) return;

    const c = appState.combat.combatants.find(item => item.id === id);
    if (!c) return;
    c.tempHp = Math.max(0, val);
    input.value = "";
    renderCombatTracker();
    apiSaveCombat();
    showToast(`${c.name} gained ${val} Temp HP`, "info");
}

function importPartyToCombat() {
    if (!appState.party || appState.party.length === 0) {
        showToast("No party members found to import.", "error");
        return;
    }

    const existingSourceIds = new Set(appState.combat.combatants.map(c => c.sourceId).filter(Boolean));

    appState.party.forEach(pc => {
        if (existingSourceIds.has(pc.id)) return;
        const initRoll = Math.floor(Math.random() * 20) + 1 + (pc.initiativeMod || 0);
        appState.combat.combatants.push({
            id: `combat-${pc.id}`,
            name: pc.name,
            type: 'pc',
            initiative: initRoll,
            tieBreaker: pc.initiativeMod || 0,
            ac: pc.ac,
            currentHp: pc.currentHp,
            maxHp: pc.maxHp,
            tempHp: pc.tempHp || 0,
            conditions: [],
            isConcentrating: false,
            concentratingSpell: "",
            notes: pc.classRole,
            statDetails: `Speed: ${pc.speed || 30}ft | PP: ${pc.passivePerception}`,
            sourceId: pc.id
        });
    });

    sortCombatantsByInitiative();
    renderCombatTracker();
    apiSaveCombat();
    showToast("Imported party members into combat tracker!", "success");
}

function rollAllMonstersInitiative() {
    let count = 0;
    appState.combat.combatants.forEach(c => {
        if (c.type === 'monster' || c.type === 'npc' || c.type === 'boss') {
            const roll = Math.floor(Math.random() * 20) + 1 + (c.tieBreaker || 0);
            c.initiative = roll;
            count++;
        }
    });
    sortCombatantsByInitiative();
    renderCombatTracker();
    apiSaveCombat();
    showToast(`Rolled initiative for ${count} monsters!`, "info");
}

function duplicateCombatant(id) {
    const c = appState.combat.combatants.find(item => item.id === id);
    if (!c) return;
    const clone = JSON.parse(JSON.stringify(c));
    clone.id = `combat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    clone.sourceId = null; // Decouple from party
    // Append number if exists or add (2)
    const match = clone.name.match(/^(.*?)(?:\s+(\d+))?$/);
    if (match) {
        const baseName = match[1];
        const num = match[2] ? parseInt(match[2]) + 1 : 2;
        clone.name = `${baseName} ${num}`;
    } else {
        clone.name += " (Copy)";
    }
    appState.combat.combatants.push(clone);
    sortCombatantsByInitiative();
    renderCombatTracker();
    apiSaveCombat();
    showToast(`Cloned ${clone.name}`, "info");
}

function removeCombatant(id) {
    appState.combat.combatants = appState.combat.combatants.filter(c => c.id !== id);
    if (appState.combat.currentTurnIndex >= appState.combat.combatants.length && appState.combat.combatants.length > 0) {
        appState.combat.currentTurnIndex = 0;
    }
    renderCombatTracker();
    apiSaveCombat();
}

function clearDefeatedCombatants() {
    const initial = appState.combat.combatants.length;
    appState.combat.combatants = appState.combat.combatants.filter(c => c.type === 'pc' || c.currentHp > 0);
    const removed = initial - appState.combat.combatants.length;
    renderCombatTracker();
    apiSaveCombat();
    showToast(`Cleared ${removed} defeated enemies`, "info");
}

// -----------------------------------------------------------------------------
// CONDITIONS & CONCENTRATION PICKER (2024 RULES)
// -----------------------------------------------------------------------------
let selectedCombatantForCondition = null;

function openConditionPicker(combatantId) {
    selectedCombatantForCondition = combatantId;
    openModal('condition-picker-modal');
}

function applySelectedCondition(conditionName) {
    if (!selectedCombatantForCondition) return;
    const c = appState.combat.combatants.find(item => item.id === selectedCombatantForCondition);
    if (!c) return;

    if (!c.conditions) c.conditions = [];

    if (conditionName === "Concentrating") {
        const spell = prompt("Enter spell or ability being concentrated on:", "Bless");
        c.isConcentrating = true;
        c.concentratingSpell = spell || "Spell";
        closeModal('condition-picker-modal');
        renderCombatTracker();
        apiSaveCombat();
        if (window.BattlemapController && typeof window.BattlemapController.syncTokenConditionsByCombatantId === 'function') {
            window.BattlemapController.syncTokenConditionsByCombatantId(c.id, undefined, true);
        }
        showToast(`${c.name} is now concentrating on ${c.concentratingSpell}`, "info");
        return;
    }

    let detail = "";
    if (conditionName === "Exhaustion") {
        const lvl = prompt("2024 Exhaustion Level (1 to 6):\n(-2 per level to D20 tests, -5 ft speed per level):", "1");
        const lvlNum = Math.min(6, Math.max(1, parseInt(lvl) || 1));
        detail = `Level ${lvlNum}: -${lvlNum * 2} D20 Tests, -${lvlNum * 5} ft`;
    }

    const durationRounds = prompt("Duration in rounds (leave blank or 0 for indefinite):", "");
    const durNum = durationRounds ? parseInt(durationRounds) : null;

    c.conditions.push({
        name: conditionName,
        detail: detail,
        durationRounds: durNum,
        appliedRound: appState.combat.round || 1
    });

    closeModal('condition-picker-modal');
    renderCombatTracker();
    apiSaveCombat();
    if (window.BattlemapController && typeof window.BattlemapController.syncTokenConditionsByCombatantId === 'function') {
        const condNames = (c.conditions || []).map(x => typeof x === 'string' ? x : (x.name || ''));
        window.BattlemapController.syncTokenConditionsByCombatantId(c.id, condNames, c.isConcentrating);
    }
    showToast(`Applied ${conditionName} to ${c.name}`, "info");
}

function removeCondition(combatantId, conditionIndex) {
    const c = appState.combat.combatants.find(item => item.id === combatantId);
    if (!c || !c.conditions) return;
    const removed = c.conditions.splice(conditionIndex, 1)[0];
    renderCombatTracker();
    apiSaveCombat();
    if (window.BattlemapController && typeof window.BattlemapController.syncTokenConditionsByCombatantId === 'function') {
        const condNames = (c.conditions || []).map(x => typeof x === 'string' ? x : (x.name || ''));
        window.BattlemapController.syncTokenConditionsByCombatantId(c.id, condNames, c.isConcentrating);
    }
    showToast(`Removed ${removed.name} from ${c.name}`, "info");
}

function toggleConcentration(combatantId) {
    const c = appState.combat.combatants.find(item => item.id === combatantId);
    if (!c) return;
    c.isConcentrating = false;
    c.concentratingSpell = "";
    renderCombatTracker();
    apiSaveCombat();
    if (window.BattlemapController && typeof window.BattlemapController.syncTokenConditionsByCombatantId === 'function') {
        window.BattlemapController.syncTokenConditionsByCombatantId(c.id, undefined, false);
    }
    showToast(`Concentration ended for ${c.name}`, "info");
}

// -----------------------------------------------------------------------------
// ADD COMBATANT MODAL & MONSTER PRESETS
// -----------------------------------------------------------------------------
const MONSTER_PRESETS = [
    { name: "Goblin", ac: 15, hp: 7, initMod: 2, type: "monster", details: "Scimitar +4 (1d6+2) | Nimble Escape" },
    { name: "Skeleton", ac: 13, hp: 13, initMod: 2, type: "monster", details: "Shortsword +4 (1d6+2) | Vulnerable: Bludgeoning" },
    { name: "Zombie", ac: 8, hp: 22, initMod: -2, type: "monster", details: "Slam +3 (1d6+1) | Undead Fortitude" },
    { name: "Bandit", ac: 12, hp: 11, initMod: 1, type: "monster", details: "Scimitar +3 (1d6+1) | Lt Crossbow +3" },
    { name: "Guard", ac: 16, hp: 11, initMod: 1, type: "npc", details: "Spear +3 (1d6+1) | Shield | Passive Perc 12" },
    { name: "Thug", ac: 11, hp: 32, initMod: 0, type: "monster", details: "Mace +4 (1d6+2) x2 | Pack Tactics" },
    { name: "Cult Fanatic", ac: 13, hp: 33, initMod: 2, type: "monster", details: "DC 11 Spellcaster | Spiritual Weapon, Hold Person" },
    { name: "Veteran", ac: 17, hp: 58, initMod: 1, type: "npc", details: "Longsword +5 (1d8+3) x2 + Shortsword +5" },
    { name: "Mage", ac: 12, hp: 40, initMod: 2, type: "boss", details: "DC 14 Spellcaster | Fireball (8d6), Counterspell" }
];

function openAddCombatantModal() {
    const presetSelect = document.getElementById('add-combatant-preset');
    presetSelect.innerHTML = `<option value="">-- Choose Quick Preset (Optional) --</option>` +
        MONSTER_PRESETS.map((m, idx) => `<option value="${idx}">${m.name} (AC ${m.ac}, HP ${m.hp})</option>`).join('');

    // Clear form
    document.getElementById('add-combatant-name').value = "";
    document.getElementById('add-combatant-ac').value = "12";
    document.getElementById('add-combatant-hp').value = "15";
    document.getElementById('add-combatant-init').value = "";
    document.getElementById('add-combatant-type').value = "monster";
    document.getElementById('add-combatant-details').value = "";

    openModal('add-combatant-modal');
}

function onPresetSelected() {
    const idxStr = document.getElementById('add-combatant-preset').value;
    if (idxStr === "") return;
    const p = MONSTER_PRESETS[parseInt(idxStr)];
    if (!p) return;

    document.getElementById('add-combatant-name').value = p.name;
    document.getElementById('add-combatant-ac').value = p.ac;
    document.getElementById('add-combatant-hp').value = p.hp;
    document.getElementById('add-combatant-type').value = p.type;
    document.getElementById('add-combatant-details').value = p.details;
}

function saveCombatantFromModal() {
    const name = document.getElementById('add-combatant-name').value.trim() || "Creature";
    const ac = parseInt(document.getElementById('add-combatant-ac').value) || 10;
    const hp = parseInt(document.getElementById('add-combatant-hp').value) || 10;
    const initVal = document.getElementById('add-combatant-init').value.trim();
    const type = document.getElementById('add-combatant-type').value;
    const details = document.getElementById('add-combatant-details').value.trim();

    let initScore = initVal ? parseFloat(initVal) : Math.floor(Math.random() * 20) + 1;

    appState.combat.combatants.push({
        id: `combat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: name,
        type: type,
        initiative: initScore,
        tieBreaker: 0,
        ac: ac,
        currentHp: hp,
        maxHp: hp,
        tempHp: 0,
        conditions: [],
        isConcentrating: false,
        concentratingSpell: "",
        notes: "",
        statDetails: details
    });

    if (appState.combat.inCombat) {
        sortCombatantsByInitiative();
    }

    closeModal('add-combatant-modal');
    renderCombatTracker();
    apiSaveCombat();
    showToast(`Added ${name} to combat tracker!`, "success");
}

// -----------------------------------------------------------------------------
// SEND NPC DIRECTLY TO COMBAT FROM GENERATOR OR ROSTER
// -----------------------------------------------------------------------------
function sendCurrentNPCToCombat() {
    syncDOMToCurrentNPC();
    const npc = appState.currentNPC;

    // Parse AC and HP from statAcHp e.g. "AC 12 | HP 27 (6d8)"
    let ac = 12;
    let hp = 20;

    const acMatch = npc.statAcHp.match(/AC\s*(\d+)/i);
    if (acMatch) ac = parseInt(acMatch[1]);

    const hpMatch = npc.statAcHp.match(/HP\s*(\d+)/i);
    if (hpMatch) hp = parseInt(hpMatch[1]);

    const initRoll = Math.floor(Math.random() * 20) + 1;

    appState.combat.combatants.push({
        id: `combat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: `${npc.name} (${npc.role})`,
        type: 'npc',
        initiative: initRoll,
        tieBreaker: 0,
        ac: ac,
        currentHp: hp,
        maxHp: hp,
        tempHp: 0,
        conditions: [],
        isConcentrating: false,
        concentratingSpell: "",
        notes: `${npc.species} • ${npc.faction}`,
        statDetails: `${npc.statName}: ${npc.statDetails}`
    });

    if (appState.combat.inCombat) {
        sortCombatantsByInitiative();
    }

    apiSaveCombat();
    showToast(`⚔️ Injected "${npc.name}" into Combat Tracker (AC ${ac}, HP ${hp})!`, "success");
    switchTab('combat');
}

function sendRosterNPCToCombat(id) {
    const npc = appState.roster.find(item => item.id === id);
    if (!npc) return;

    let ac = 12;
    let hp = 20;
    const acMatch = (npc.statAcHp || "").match(/AC\s*(\d+)/i);
    if (acMatch) ac = parseInt(acMatch[1]);
    const hpMatch = (npc.statAcHp || "").match(/HP\s*(\d+)/i);
    if (hpMatch) hp = parseInt(hpMatch[1]);

    const initRoll = Math.floor(Math.random() * 20) + 1;

    appState.combat.combatants.push({
        id: `combat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        name: `${npc.name} (${npc.role})`,
        type: 'npc',
        initiative: initRoll,
        tieBreaker: 0,
        ac: ac,
        currentHp: hp,
        maxHp: hp,
        tempHp: 0,
        conditions: [],
        isConcentrating: false,
        concentratingSpell: "",
        notes: `${npc.species} • ${npc.location}`,
        statDetails: `${npc.statName}: ${npc.statDetails}`
    });

    if (appState.combat.inCombat) {
        sortCombatantsByInitiative();
    }

    apiSaveCombat();
    showToast(`⚔️ Injected "${npc.name}" into Combat Tracker!`, "success");
    switchTab('combat');
}

// -----------------------------------------------------------------------------
// GLOBAL DICE ENGINE & ROLLER WITH ON-SCREEN ANIMATED OVERLAY
// -----------------------------------------------------------------------------
let diceOverlayTimer = null;
let diceBtnTimer = null;
let diceTumbleInterval = null;

function showDiceRollOverlay(data) {
    const overlay = document.getElementById('dice-roll-overlay');
    if (!overlay) return;

    const iconEl = document.getElementById('dice-overlay-icon');
    const titleEl = document.getElementById('dice-overlay-title');
    const totalEl = document.getElementById('dice-overlay-total');
    const breakdownEl = document.getElementById('dice-overlay-breakdown');
    const critBadge = document.getElementById('dice-overlay-crit-badge');
    const diceBtnLabel = document.getElementById('dice-btn-label');

    // Update slim topbar button briefly
    if (diceBtnLabel) {
        diceBtnLabel.textContent = `[${data.total}]`;
        clearTimeout(diceBtnTimer);
        diceBtnTimer = setTimeout(() => {
            diceBtnLabel.textContent = 'Roll';
        }, 3500);
    }

    // Clear any pending timers/intervals
    clearTimeout(diceOverlayTimer);
    if (diceTumbleInterval) clearInterval(diceTumbleInterval);

    // Reset base classes
    overlay.className = "overlay-visible fixed top-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-5 py-3.5 rounded-2xl bg-[#0b0f17]/95 border-2 shadow-[0_20px_50px_rgba(0,0,0,0.95)] backdrop-blur-xl transition cursor-pointer select-none";
    iconEl.className = "w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold shadow-lg shrink-0 transition-transform";
    critBadge.classList.add('hidden');
    critBadge.className = "text-[9px] font-mono uppercase tracking-widest font-extrabold px-1.5 py-0.2 rounded border";

    // Set title
    const advTag = data.adv && data.adv !== 'normal' && data.sides === 20 ? `(${data.adv.toUpperCase()})` : '';
    titleEl.textContent = `d${data.sides} Roll ${advTag}`.trim();

    // Die tumbling animation
    iconEl.classList.add('dice-tumbling');
    setTimeout(() => iconEl.classList.remove('dice-tumbling'), 350);

    // Rapid number shuffle for visual feel
    let shuffleCount = 0;
    diceTumbleInterval = setInterval(() => {
        totalEl.textContent = Math.floor(Math.random() * data.sides) + 1;
        shuffleCount++;
        if (shuffleCount >= 5) {
            clearInterval(diceTumbleInterval);
            diceTumbleInterval = null;
            applyFinalDiceResult();
        }
    }, 30);

    function applyFinalDiceResult() {
        totalEl.textContent = data.total;
        
        let breakdownText = "";
        if (data.sides === 20 && data.adv === 'advantage') {
            breakdownText = `Adv: [${data.roll1}, ${data.roll2}]${data.modStr}`;
        } else if (data.sides === 20 && data.adv === 'disadvantage') {
            breakdownText = `Disadv: [${data.roll1}, ${data.roll2}]${data.modStr}`;
        } else if (data.mod !== 0) {
            breakdownText = `${data.chosen}${data.modStr}`;
        } else {
            breakdownText = `Pure roll: ${data.chosen}`;
        }
        breakdownEl.textContent = breakdownText;

        // Nat 20 Critical
        if (data.sides === 20 && data.chosen === 20) {
            overlay.classList.add('border-emerald-500', 'shadow-[0_0_35px_rgba(16,185,129,0.4)]');
            iconEl.classList.add('bg-gradient-to-br', 'from-emerald-400', 'to-emerald-600', 'text-ledger-950', 'border', 'border-emerald-300', 'crit-bounce');
            iconEl.textContent = '👑';
            totalEl.className = "font-display font-extrabold text-3xl text-emerald-400 leading-none crit-bounce";
            critBadge.textContent = "CRITICAL HIT!";
            critBadge.classList.remove('hidden');
            critBadge.classList.add('bg-emerald-500/20', 'text-emerald-300', 'border-emerald-500/50');
        } 
        // Nat 1 Fumble
        else if (data.sides === 20 && data.chosen === 1) {
            overlay.classList.add('border-rose-600', 'shadow-[0_0_35px_rgba(239,68,68,0.4)]', 'fumble-shake');
            iconEl.classList.add('bg-gradient-to-br', 'from-rose-500', 'to-rose-700', 'text-white', 'border', 'border-rose-400');
            iconEl.textContent = '💀';
            totalEl.className = "font-display font-extrabold text-3xl text-rose-500 leading-none";
            critBadge.textContent = "CRITICAL FUMBLE!";
            critBadge.classList.remove('hidden');
            critBadge.classList.add('bg-rose-500/20', 'text-rose-300', 'border-rose-500/50');
        } 
        // Normal Roll
        else {
            overlay.classList.add('border-amber-500/80', 'shadow-[0_0_25px_rgba(245,158,11,0.25)]');
            iconEl.classList.add('bg-gradient-to-br', 'from-amber-500', 'to-amber-700', 'text-ledger-950', 'border', 'border-amber-400/40');
            iconEl.textContent = '🎲';
            totalEl.className = "font-display font-extrabold text-3xl text-amber-300 leading-none";
        }

        // Set auto-dismiss timeout (3.5 seconds)
        diceOverlayTimer = setTimeout(dismissDiceOverlay, 3500);
    }
}

function dismissDiceOverlay() {
    const overlay = document.getElementById('dice-roll-overlay');
    if (overlay) {
        overlay.classList.remove('overlay-visible');
        overlay.classList.add('overlay-hidden');
    }
    clearTimeout(diceOverlayTimer);
    if (diceTumbleInterval) clearInterval(diceTumbleInterval);
}

function rollDie(sides) {
    playDiceSound();
    const adv = appState.activeAdvantage || 'normal';
    const mod = parseInt(document.getElementById('dice-mod-input')?.value || 0);

    let roll1 = Math.floor(Math.random() * sides) + 1;
    let roll2 = Math.floor(Math.random() * sides) + 1;
    let chosen = roll1;
    let tag = "";

    if (sides === 20) {
        if (adv === 'advantage') {
            chosen = Math.max(roll1, roll2);
            tag = ` [Adv: ${roll1}, ${roll2}]`;
        } else if (adv === 'disadvantage') {
            chosen = Math.min(roll1, roll2);
            tag = ` [Disadv: ${roll1}, ${roll2}]`;
        }
    }

    const total = chosen + mod;
    const modStr = mod !== 0 ? (mod > 0 ? ` + ${mod}` : ` - ${Math.abs(mod)}`) : '';
    const formulaStr = `d${sides}${modStr}`;
    const resultText = `${chosen}${tag}${modStr} = **${total}**`;

    // Nat 20 or Nat 1 special highlight on d20
    let specialClass = "text-amber-300";
    if (sides === 20 && chosen === 20) {
        specialClass = "text-emerald-400 font-extrabold animate-bounce";
        if (window.AudioEngine && (window.ArcaneSettings?.diceFanfares !== false)) window.AudioEngine.playNat20();
        if (window.LightingEngine) window.LightingEngine.triggerNat20Flash();
    } else if (sides === 20 && chosen === 1) {
        specialClass = "text-rose-500 font-extrabold";
        if (window.AudioEngine && (window.ArcaneSettings?.diceFanfares !== false)) window.AudioEngine.playNat1();
        if (window.LightingEngine) window.LightingEngine.triggerNat1Flash();
    }

    const banner = document.getElementById('dice-result-banner');
    if (banner) {
        banner.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-slate-400 font-mono text-xs">${formulaStr}:</span>
                <span class="text-sm font-bold font-mono ${specialClass}">${resultText}</span>
            </div>
        `;
    }

    appState.diceHistory.unshift({
        sides,
        total,
        text: `${formulaStr} ➔ ${resultText}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    });

    if (appState.diceHistory.length > 20) appState.diceHistory.pop();
    renderDiceHistory();

    // Trigger On-Screen Animated Floating HUD Overlay
    showDiceRollOverlay({
        sides,
        chosen,
        total,
        formulaStr,
        roll1,
        roll2,
        adv,
        tag,
        mod,
        modStr
    });
}

function setAdvantage(type) {
    appState.activeAdvantage = type;
    document.querySelectorAll('.adv-btn').forEach(b => {
        b.classList.remove('bg-amber-500', 'text-ledger-950', 'font-bold');
        b.classList.add('bg-ledger-800', 'text-slate-300');
    });

    const activeBtn = document.getElementById(`adv-btn-${type}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-ledger-800', 'text-slate-300');
        activeBtn.classList.add('bg-amber-500', 'text-ledger-950', 'font-bold');
    }
}

function renderDiceHistory() {
    const list = document.getElementById('dice-history-list');
    if (!list) return;
    list.innerHTML = appState.diceHistory.map(h => `
        <div class="flex items-center justify-between py-1 border-b border-ledger-800/60 text-xs">
            <span class="text-slate-200 font-mono">${escapeHTML(h.text)}</span>
            <span class="text-[10px] text-slate-500 font-mono">${h.time}</span>
        </div>
    `).join('');
}

// -----------------------------------------------------------------------------
// 2024 D&D 5.5E RULES SCREEN
// -----------------------------------------------------------------------------
function renderRulesScreen(query = "") {
    const rules = appState.rules;
    const container = document.getElementById('rules-content-container');
    if (!container) return;

    if (!rules || ((!rules.conditions || rules.conditions.length === 0) && (!rules.actions_in_combat || rules.actions_in_combat.length === 0))) {
        container.innerHTML = `
            <div class="p-12 text-center text-slate-500 text-xs italic space-y-3">
                <p>2024 Core Rules database is empty or not loaded.</p>
                <button onclick="restoreSrdCompendiums()" class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition">
                    <span>🔄</span> <span>Restore 2024 Core Rules & Conditions</span>
                </button>
            </div>`;
        return;
    }

    const q = query.toLowerCase().trim();

    // 1. Conditions
    const conditions = rules.conditions || [];
    const filteredConditions = conditions.filter(c => !q || c.name.toLowerCase().includes(q) || c.summary.toLowerCase().includes(q));

    // 2. Actions
    const actions = rules.actions_in_combat || [];
    const filteredActions = actions.filter(a => !q || a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));

    container.innerHTML = `
        <div class="space-y-6">
            
            <!-- Conditions Section -->
            <div>
                <h3 class="font-display font-bold text-base text-amber-400 mb-3 flex items-center gap-2">
                    <span>Conditions (2024 Core Rules)</span>
                    <span class="text-xs font-mono text-slate-400 font-normal">(${filteredConditions.length} entries)</span>
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    ${filteredConditions.map(c => `
                        <div class="bg-ledger-950/80 border border-ledger-800 p-3 rounded-xl space-y-1.5">
                            <h4 class="font-bold text-sm text-amber-300 font-mono">${escapeHTML(c.name)}</h4>
                            <p class="text-xs text-slate-300 font-medium">${escapeHTML(c.summary)}</p>
                            <ul class="text-[11px] text-slate-400 space-y-1 list-disc pl-4 pt-1">
                                ${(c.effects || []).map(eff => `<li>${escapeHTML(eff)}</li>`).join('')}
                            </ul>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Combat Actions Section -->
            <div>
                <h3 class="font-display font-bold text-base text-amber-400 mb-3 flex items-center gap-2">
                    <span>Actions in Combat (2024 Rules)</span>
                    <span class="text-xs font-mono text-slate-400 font-normal">(${filteredActions.length} entries)</span>
                </h3>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    ${filteredActions.map(a => `
                        <div class="bg-ledger-950/80 border border-ledger-800 p-3 rounded-xl space-y-1">
                            <div class="flex items-center justify-between">
                                <h4 class="font-bold text-sm text-sky-300">${escapeHTML(a.name)}</h4>
                                <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-ledger-900 border border-ledger-700 text-slate-400">${escapeHTML(a.type)}</span>
                            </div>
                            <p class="text-xs text-slate-300 leading-relaxed">${escapeHTML(a.description)}</p>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Quick Tables Section: Cover, Resting, Concentration, Death Saves -->
            <div>
                <h3 class="font-display font-bold text-base text-amber-400 mb-3">Tactical Cheat Sheets</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                    
                    <!-- Cover -->
                    <div class="bg-ledger-950/80 border border-ledger-800 p-3 rounded-xl space-y-2">
                        <h4 class="font-bold text-xs uppercase tracking-wider text-amber-300">Cover Bonuses</h4>
                        <div class="text-xs space-y-1.5 text-slate-300">
                            <div><strong class="text-amber-400">Half Cover:</strong> +2 AC & Dex saves</div>
                            <div><strong class="text-amber-400">3/4 Cover:</strong> +5 AC & Dex saves</div>
                            <div><strong class="text-amber-400">Total Cover:</strong> Can't be targeted directly</div>
                        </div>
                    </div>

                    <!-- Concentration Save -->
                    <div class="bg-ledger-950/80 border border-ledger-800 p-3 rounded-xl space-y-2">
                        <h4 class="font-bold text-xs uppercase tracking-wider text-amber-300">Concentration (2024)</h4>
                        <div class="text-xs space-y-1.5 text-slate-300">
                            <div><strong>Damage DC:</strong> DC 10 or half damage taken (whichever is higher).</div>
                            <div><strong>Incapacitated:</strong> Automatically ends.</div>
                            <div><strong>New Conc Spell:</strong> Previous ends immediately.</div>
                        </div>
                    </div>

                    <!-- Death Saves -->
                    <div class="bg-ledger-950/80 border border-ledger-800 p-3 rounded-xl space-y-2">
                        <h4 class="font-bold text-xs uppercase tracking-wider text-amber-300">Death Saves</h4>
                        <div class="text-xs space-y-1 text-slate-300">
                            <div><span class="text-emerald-400 font-bold">Nat 20:</span> Regain 1 HP & stand up!</div>
                            <div><span class="text-slate-200">10–19:</span> 1 Success (3 to stabilize)</div>
                            <div><span class="text-rose-400">2–9:</span> 1 Failure (3 to die)</div>
                            <div><span class="text-rose-500 font-bold">Nat 1:</span> 2 Failures</div>
                        </div>
                    </div>

                    <!-- Common DCs -->
                    <div class="bg-ledger-950/80 border border-ledger-800 p-3 rounded-xl space-y-2">
                        <h4 class="font-bold text-xs uppercase tracking-wider text-amber-300">Difficulty Class (DC)</h4>
                        <div class="text-xs space-y-1 font-mono text-slate-300">
                            <div class="flex justify-between"><span>Very Easy:</span><span class="text-emerald-400 font-bold">DC 5</span></div>
                            <div class="flex justify-between"><span>Easy:</span><span class="text-emerald-300 font-bold">DC 10</span></div>
                            <div class="flex justify-between"><span>Moderate:</span><span class="text-amber-300 font-bold">DC 15</span></div>
                            <div class="flex justify-between"><span>Hard:</span><span class="text-orange-400 font-bold">DC 20</span></div>
                            <div class="flex justify-between"><span>Very Hard:</span><span class="text-rose-400 font-bold">DC 25</span></div>
                            <div class="flex justify-between"><span>Nearly Impossible:</span><span class="text-purple-400 font-bold">DC 30</span></div>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    `;
}

// -----------------------------------------------------------------------------
// PRESERVED PROCEDURAL NPC GENERATOR LOGIC
// -----------------------------------------------------------------------------
function pickRandom(arr) {
    if (!arr || arr.length === 0) return "";
    return arr[Math.floor(Math.random() * arr.length)];
}

function getActiveFactionsPool() {
    const factions = new Set();
    (appState.factions || []).forEach(f => {
        if (f && f.name && f.name.trim()) factions.add(f.name.trim());
    });
    (appState.locations || []).forEach(l => {
        (l.factions || []).forEach(fn => {
            if (typeof fn === 'string' && fn.trim()) factions.add(fn.trim());
        });
    });
    (appState.world?.customFactions || []).forEach(cf => {
        if (typeof cf === 'string' && cf.trim()) factions.add(cf.trim());
    });
    return Array.from(factions).sort((a, b) => a.localeCompare(b));
}

function getActiveLocationsPool() {
    const locations = new Set();
    (appState.locations || []).forEach(l => {
        if (l && l.name && l.name.trim()) locations.add(l.name.trim());
    });
    (appState.overworld?.pins || []).forEach(p => {
        const label = (p.label || p.title || '').trim();
        if (label) locations.add(label);
    });
    if (appState.overworld?.maps) {
        appState.overworld.maps.forEach(m => {
            (m.pins || []).forEach(p => {
                const label = (p.label || p.title || '').trim();
                if (label) locations.add(label);
            });
        });
    }
    (appState.world?.customLocations || []).forEach(cl => {
        if (typeof cl === 'string' && cl.trim()) locations.add(cl.trim());
    });
    return Array.from(locations).sort((a, b) => a.localeCompare(b));
}

function syncDOMToCurrentNPC() {
    const elName = document.getElementById('npc-name');
    if (!elName) return;
    appState.currentNPC.name = elName.innerText.trim();
    appState.currentNPC.epithet = document.getElementById('npc-epithet').innerText.trim();
    appState.currentNPC.species = document.getElementById('npc-species-badge').innerText.trim();
    appState.currentNPC.role = document.getElementById('npc-role-badge').innerText.trim();
    appState.currentNPC.category = document.getElementById('npc-category-tag').innerText.trim();
    appState.currentNPC.voice = document.getElementById('npc-voice').innerText.trim();
    appState.currentNPC.appearance = document.getElementById('npc-appearance').innerText.trim();
    appState.currentNPC.personality = document.getElementById('npc-personality').innerText.trim();
    appState.currentNPC.backstory = document.getElementById('npc-backstory').innerText.trim();
    // Read faction from select or custom input
    const facSel = document.getElementById('npc-faction-select');
    const facCustom = document.getElementById('npc-faction-custom');
    if (facSel && facSel.value === '__custom__') {
        appState.currentNPC.faction = facCustom ? facCustom.value.trim() : '';
    } else if (facSel) {
        appState.currentNPC.faction = facSel.value.trim();
    } else {
        appState.currentNPC.faction = document.getElementById('npc-faction')?.innerText.trim() || '';
    }

    appState.currentNPC.factionStanding = document.getElementById('npc-faction-standing')?.innerText.trim() || '';

    // Read location from select or custom input
    const locSel = document.getElementById('npc-location-select');
    const locCustom = document.getElementById('npc-location-custom');
    if (locSel && locSel.value === '__custom__') {
        appState.currentNPC.location = locCustom ? locCustom.value.trim() : '';
    } else if (locSel) {
        appState.currentNPC.location = locSel.value.trim();
    } else {
        appState.currentNPC.location = document.getElementById('npc-location')?.innerText.trim() || '';
    }
    appState.currentNPC.loot = document.getElementById('npc-loot').innerText.trim();
    appState.currentNPC.statName = document.getElementById('npc-stat-name').innerText.trim();
    appState.currentNPC.statAcHp = document.getElementById('npc-stat-ac-hp').innerText.trim();
    appState.currentNPC.statDetails = document.getElementById('npc-stat-details').innerText.trim();
    appState.currentNPC.notes = document.getElementById('npc-session-notes').value.trim();
}

function rollIdentity() {
    const speciesFilter = document.getElementById('filter-species')?.value || "ANY";
    const roleFilter = document.getElementById('filter-role')?.value || "ANY";

    const speciesList = Object.keys(SPECIES_DATA);
    const chosenSpecies = (speciesFilter !== "ANY" && SPECIES_DATA[speciesFilter]) ? speciesFilter : pickRandom(speciesList);
    const spPool = SPECIES_DATA[chosenSpecies];
    const pronoun = pickRandom(spPool.pronouns);
    const firstName = pickRandom(spPool.first);
    const lastName = pickRandom(spPool.last);
    const epithet = Math.random() < 0.78 ? pickRandom(EPITHETS) : "";

    const categories = Object.keys(ROLES_BY_CATEGORY);
    const chosenCategory = (roleFilter !== "ANY" && ROLES_BY_CATEGORY[roleFilter]) ? roleFilter : pickRandom(categories);
    const roleObj = pickRandom(ROLES_BY_CATEGORY[chosenCategory]);

    appState.currentNPC.name = `${firstName} ${lastName}`;
    appState.currentNPC.epithet = epithet;
    appState.currentNPC.species = `${chosenSpecies} (${pronoun})`;
    appState.currentNPC.role = roleObj.role;
    appState.currentNPC.category = chosenCategory;

    if (!appState.locks.stats && STAT_ARCHETYPES[roleObj.stat]) {
        appState.currentNPC.statName = roleObj.stat;
        appState.currentNPC.statAcHp = STAT_ARCHETYPES[roleObj.stat].acHp;
        appState.currentNPC.statDetails = STAT_ARCHETYPES[roleObj.stat].details;
    }
}

function rollVoice() {
    appState.currentNPC.voice = `${pickRandom(VOICE_CADENCE)} ${pickRandom(VOICE_MANNERISM)}`;
}

function rollAppearance() {
    appState.currentNPC.appearance = `${pickRandom(APPEARANCE_FEATURES)}, ${pickRandom(APPEARANCE_ATTIRE)}`;
}

function rollPersonality() {
    appState.currentNPC.personality = `${pickRandom(PERSONALITY_DEMEANOR)}; ${pickRandom(PERSONALITY_MOTIVATION)}`;
}

function rollBackstory() {
    appState.currentNPC.backstory = pickRandom(BACKSTORIES);
}

function rollSecret() {
    appState.currentNPC.secret = pickRandom(SECRETS_AND_HOOKS);
}

function rollWorld() {
    const factionFilter = document.getElementById('filter-faction')?.value || "ANY";
    const locationFilter = document.getElementById('filter-location')?.value || "ANY";
    const factions = getActiveFactionsPool();
    const locations = getActiveLocationsPool();

    if (factionFilter !== "ANY") {
        appState.currentNPC.faction = factionFilter;
        appState.currentNPC.factionStanding = pickRandom(FACTION_STANDINGS);
    } else if (factions.length > 0) {
        appState.currentNPC.faction = pickRandom(factions);
        appState.currentNPC.factionStanding = pickRandom(FACTION_STANDINGS);
    } else {
        appState.currentNPC.faction = "";
        appState.currentNPC.factionStanding = "Independent";
    }

    if (locationFilter !== "ANY") {
        appState.currentNPC.location = locationFilter;
    } else if (locations.length > 0) {
        appState.currentNPC.location = pickRandom(locations);
    } else {
        appState.currentNPC.location = "";
    }
}

function rollLoot() {
    appState.currentNPC.loot = pickRandom(LOOT_POOLS);
}

function rollStats() {
    const statKeys = Object.keys(STAT_ARCHETYPES);
    const chosenStat = pickRandom(statKeys);
    appState.currentNPC.statName = chosenStat;
    appState.currentNPC.statAcHp = STAT_ARCHETYPES[chosenStat].acHp;
    appState.currentNPC.statDetails = STAT_ARCHETYPES[chosenStat].details;
}

function rerollTrait(traitKey) {
    syncDOMToCurrentNPC();
    switch (traitKey) {
        case 'identity': rollIdentity(); break;
        case 'voice': rollVoice(); break;
        case 'appearance': rollAppearance(); break;
        case 'personality': rollPersonality(); break;
        case 'backstory': rollBackstory(); break;
        case 'secret': rollSecret(); break;
        case 'world': rollWorld(); break;
        case 'loot': rollLoot(); break;
        case 'stats': rollStats(); break;
    }
    renderCurrentNPC([traitKey]);
}

function rollFullNPC() {
    syncDOMToCurrentNPC();
    const updatedTraits = [];

    if (!appState.locks.identity) { rollIdentity(); updatedTraits.push('identity'); }
    if (!appState.locks.voice) { rollVoice(); updatedTraits.push('voice'); }
    if (!appState.locks.appearance) { rollAppearance(); updatedTraits.push('appearance'); }
    if (!appState.locks.personality) { rollPersonality(); updatedTraits.push('personality'); }
    if (!appState.locks.backstory) { rollBackstory(); updatedTraits.push('backstory'); }
    if (!appState.locks.secret) { rollSecret(); updatedTraits.push('secret'); }
    if (!appState.locks.world) { rollWorld(); updatedTraits.push('world'); }
    if (!appState.locks.loot) { rollLoot(); updatedTraits.push('loot'); }
    if (!appState.locks.stats) {
        if (appState.locks.identity) rollStats();
        updatedTraits.push('stats');
    }

    if (!appState.locks.identity) {
        appState.currentNPC.id = null;
        appState.currentNPC.notes = "";
        appState.currentNPC.imageUrl = getMatchingNpcPortrait(appState.currentNPC.role, appState.currentNPC.category);
    }

    renderCurrentNPC(updatedTraits);
}

function renderCurrentNPC(flashCards = []) {
    const npc = appState.currentNPC;
    const nameEl = document.getElementById('npc-name');
    if (!nameEl) return;

    nameEl.innerText = npc.name;
    document.getElementById('npc-epithet').innerText = npc.epithet;
    document.getElementById('npc-species-badge').innerText = npc.species;
    document.getElementById('npc-role-badge').innerText = npc.role;
    document.getElementById('npc-category-tag').innerText = npc.category;
    document.getElementById('npc-voice').innerText = npc.voice;
    document.getElementById('npc-appearance').innerText = npc.appearance;
    document.getElementById('npc-personality').innerText = npc.personality;
    document.getElementById('npc-backstory').innerText = npc.backstory;
    const facHidden = document.getElementById('npc-faction');
    if (facHidden) facHidden.innerText = npc.faction || '';
    const facStandingEl = document.getElementById('npc-faction-standing');
    if (facStandingEl) facStandingEl.innerText = npc.factionStanding || '';
    const locHidden = document.getElementById('npc-location');
    if (locHidden) locHidden.innerText = npc.location || '';

    // Render Faction Dropdown
    const facSelect = document.getElementById('npc-faction-select');
    const facCustom = document.getElementById('npc-faction-custom');
    if (facSelect) {
        const factions = appState.factions || [];
        let facHtml = `<option value="">-- None / Unaffiliated --</option>`;
        let matchFound = !npc.faction;
        factions.forEach(f => {
            const isMatch = npc.faction && f.name.toLowerCase() === npc.faction.toLowerCase();
            if (isMatch) matchFound = true;
            facHtml += `<option value="${escapeHTML(f.name)}" ${isMatch ? 'selected' : ''}>${escapeHTML(f.name)}</option>`;
        });
        facHtml += `<option value="__custom__" ${(!matchFound && npc.faction) ? 'selected' : ''}>✏️ Custom Faction...</option>`;
        facSelect.innerHTML = facHtml;
        if (facCustom) {
            if (!matchFound && npc.faction) {
                facCustom.classList.remove('hidden');
                facCustom.value = npc.faction;
            } else {
                facCustom.classList.add('hidden');
                facCustom.value = '';
            }
        }
    }

    // Render Location Dropdown
    populateNpcLocationOptions(npc.location);

    document.getElementById('npc-loot').innerText = npc.loot;
    document.getElementById('npc-stat-name').innerText = npc.statName;
    document.getElementById('npc-stat-ac-hp').innerText = npc.statAcHp;
    document.getElementById('npc-stat-details').innerText = npc.statDetails;
    document.getElementById('npc-session-notes').value = npc.notes || "";

    const portraitEl = document.getElementById('npc-portrait-img');
    if (portraitEl) {
        portraitEl.src = npc.imageUrl || '/static/images/npcs/alchemist.webp';
    }

    flashCards.forEach(key => {
        const card = document.getElementById(`card-${key}`);
        if (card) {
            card.classList.remove('rolled-flash');
            void card.offsetWidth;
            card.classList.add('rolled-flash');
        }
    });
}

function populateNpcLocationOptions(selectedLoc = null) {
    const locSelect = document.getElementById('npc-location-select');
    const locCustom = document.getElementById('npc-location-custom');
    if (!locSelect) return;
    const targetLoc = (selectedLoc !== null && selectedLoc !== undefined) ? selectedLoc : (appState.currentNPC?.location || '');

    const locations = appState.locations || [];
    const pins = appState.overworld?.pins || [];
    const locationNames = new Set();
    locations.forEach(l => { if (l.name) locationNames.add(l.name); });
    pins.forEach(p => { if (p.label || p.title) locationNames.add(p.label || p.title); });

    let locHtml = `<option value="">-- None / Wandering --</option>`;
    let locMatchFound = !targetLoc;
    Array.from(locationNames).sort().forEach(locName => {
        const isMatch = targetLoc && locName.toLowerCase() === targetLoc.toLowerCase();
        if (isMatch) locMatchFound = true;
        locHtml += `<option value="${escapeHTML(locName)}" ${isMatch ? 'selected' : ''}>${escapeHTML(locName)}</option>`;
    });
    locHtml += `<option value="__custom__" ${(!locMatchFound && targetLoc) ? 'selected' : ''}>✏️ Custom Location...</option>`;
    locSelect.innerHTML = locHtml;
    if (locCustom) {
        if (!locMatchFound && targetLoc) {
            locCustom.classList.remove('hidden');
            locCustom.value = targetLoc;
        } else {
            locCustom.classList.add('hidden');
            locCustom.value = '';
        }
    }
}

let _npcDebounceTimer = null;
function saveCurrentNPCDebounced() {
    clearTimeout(_npcDebounceTimer);
    _npcDebounceTimer = setTimeout(() => {
        saveToLocalStorage();
        if (appState.currentNPC && appState.currentNPC.id) {
            const idx = (appState.roster || []).findIndex(r => r.id === appState.currentNPC.id);
            if (idx !== -1) {
                appState.roster[idx] = JSON.parse(JSON.stringify(appState.currentNPC));
                apiSaveRosterNPC(appState.roster[idx]);
                renderRoster();
            }
        }
    }, 400);
}

function syncNpcLocationToLocations(npcName, targetLocationName) {
    if (!npcName) return;
    let changed = false;
    const targetLocLower = (targetLocationName || '').trim().toLowerCase();

    (appState.locations || []).forEach(loc => {
        if (!loc.notableNpcs) loc.notableNpcs = [];
        const locNameLower = (loc.name || '').trim().toLowerCase();
        if (targetLocLower && locNameLower === targetLocLower) {
            if (!loc.notableNpcs.some(n => n.toLowerCase() === npcName.toLowerCase())) {
                loc.notableNpcs.push(npcName);
                changed = true;
            }
        } else {
            if (loc.notableNpcs.some(n => n.toLowerCase() === npcName.toLowerCase())) {
                loc.notableNpcs = loc.notableNpcs.filter(n => n.toLowerCase() !== npcName.toLowerCase());
                changed = true;
            }
        }
    });

    if (changed) {
        renderLocations();
    }
}

function syncLocationNpcsToRoster(locationName, notableNpcNames) {
    if (!locationName) return;
    const notableSet = new Set((notableNpcNames || []).map(n => n.trim().toLowerCase()));
    let changed = false;

    (appState.roster || []).forEach(npc => {
        if (!npc.name) return;
        const nameLower = npc.name.trim().toLowerCase();
        if (notableSet.has(nameLower)) {
            if (npc.location !== locationName) {
                npc.location = locationName;
                changed = true;
            }
        } else if (npc.location && npc.location.trim().toLowerCase() === locationName.trim().toLowerCase()) {
            npc.location = '';
            changed = true;
        }
    });

    if (appState.currentNPC && appState.currentNPC.name) {
        const currentLower = appState.currentNPC.name.trim().toLowerCase();
        if (notableSet.has(currentLower)) {
            appState.currentNPC.location = locationName;
            const locP = document.getElementById('npc-location');
            if (locP) locP.innerText = locationName;
            populateNpcLocationOptions(locationName);
        } else if (appState.currentNPC.location && appState.currentNPC.location.trim().toLowerCase() === locationName.trim().toLowerCase()) {
            appState.currentNPC.location = '';
            const locP = document.getElementById('npc-location');
            if (locP) locP.innerText = '';
            populateNpcLocationOptions('');
        }
    }

    if (changed) {
        renderRoster();
    }
}

function onNpcFactionSelectChanged() {
    const sel = document.getElementById('npc-faction-select');
    const custom = document.getElementById('npc-faction-custom');
    if (!sel || !appState.currentNPC) return;
    if (sel.value === '__custom__') {
        if (custom) {
            custom.classList.remove('hidden');
            custom.focus();
            appState.currentNPC.faction = custom.value.trim();
        }
    } else {
        if (custom) custom.classList.add('hidden');
        appState.currentNPC.faction = sel.value;
    }
    const hiddenP = document.getElementById('npc-faction');
    if (hiddenP) hiddenP.innerText = appState.currentNPC.faction;
    saveCurrentNPCDebounced();
}

function onNpcFactionCustomInput() {
    const custom = document.getElementById('npc-faction-custom');
    if (!custom || !appState.currentNPC) return;
    appState.currentNPC.faction = custom.value.trim();
    const hiddenP = document.getElementById('npc-faction');
    if (hiddenP) hiddenP.innerText = appState.currentNPC.faction;
    saveCurrentNPCDebounced();
}

function onNpcLocationSelectChanged() {
    const sel = document.getElementById('npc-location-select');
    const custom = document.getElementById('npc-location-custom');
    if (!sel || !appState.currentNPC) return;
    if (sel.value === '__custom__') {
        if (custom) {
            custom.classList.remove('hidden');
            custom.focus();
            appState.currentNPC.location = custom.value.trim();
        }
    } else {
        if (custom) custom.classList.add('hidden');
        appState.currentNPC.location = sel.value;
    }
    const hiddenP = document.getElementById('npc-location');
    if (hiddenP) hiddenP.innerText = appState.currentNPC.location;
    syncNpcLocationToLocations(appState.currentNPC.name, appState.currentNPC.location);
    saveCurrentNPCDebounced();
}

function onNpcLocationCustomInput() {
    const custom = document.getElementById('npc-location-custom');
    if (!custom || !appState.currentNPC) return;
    appState.currentNPC.location = custom.value.trim();
    const hiddenP = document.getElementById('npc-location');
    if (hiddenP) hiddenP.innerText = appState.currentNPC.location;
    syncNpcLocationToLocations(appState.currentNPC.name, appState.currentNPC.location);
    saveCurrentNPCDebounced();
}

function toggleLock(traitKey) {
    appState.locks[traitKey] = !appState.locks[traitKey];
    updateLockUI(traitKey);
}

function unlockAllTraits() {
    Object.keys(appState.locks).forEach(key => {
        appState.locks[key] = false;
        updateLockUI(key);
    });
    showToast("Unlocked all trait cards", "info");
}

function updateLockUI(traitKey) {
    const isLocked = appState.locks[traitKey];
    const card = document.getElementById(`card-${traitKey}`);
    const btn = document.getElementById(`lock-btn-${traitKey}`);
    if (!card || !btn) return;

    if (isLocked) {
        card.classList.add('locked');
        btn.classList.remove('text-slate-400');
        btn.classList.add('text-amber-400', 'bg-amber-500/15', 'border-amber-500/40');
        btn.innerHTML = `<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"/></svg>`;
    } else {
        card.classList.remove('locked');
        btn.classList.add('text-slate-400');
        btn.classList.remove('text-amber-400', 'bg-amber-500/15', 'border-amber-500/40');
        btn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>`;
    }
}

function saveCurrentNPCToRoster() {
    syncDOMToCurrentNPC();
    const npcCopy = JSON.parse(JSON.stringify(appState.currentNPC));

    // Mirror to locations
    syncNpcLocationToLocations(npcCopy.name, npcCopy.location);

    if (npcCopy.id) {
        const existingIdx = appState.roster.findIndex(item => item.id === npcCopy.id);
        if (existingIdx !== -1) {
            appState.roster[existingIdx] = npcCopy;
            apiSaveRosterNPC(npcCopy);
            renderRoster();
            showToast(`Updated "${npcCopy.name}" in Campaign Roster`, "success");
            return;
        }
    }

    npcCopy.id = "npc-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    appState.currentNPC.id = npcCopy.id;
    appState.roster.unshift(npcCopy);
    apiSaveRosterNPC(npcCopy);
    renderRoster();
    showToast(`Saved "${npcCopy.name}" to Campaign Roster!`, "success");
}

function loadNPCFromRoster(id) {
    const found = appState.roster.find(item => item.id === id);
    if (!found) return;
    appState.currentNPC = JSON.parse(JSON.stringify(found));
    renderCurrentNPC(['identity', 'voice', 'appearance', 'personality', 'backstory', 'secret', 'world', 'loot', 'stats']);
    renderRoster();
    showToast(`Loaded "${found.name}"`, "info");
}

function deleteNPCFromRoster(id, event) {
    if (event) event.stopPropagation();
    if (!confirm("Delete this NPC from the campaign roster?")) return;
    appState.roster = appState.roster.filter(item => item.id !== id);
    if (appState.currentNPC && appState.currentNPC.id === id) appState.currentNPC.id = null;
    apiDeleteRosterNPC(id);
    renderRoster();
    renderRosterDirectory();
    showToast("Removed NPC from roster", "info");
}

function getSpeciesEmoji(species) {
    if (!species) return '👤';
    const s = species.toLowerCase();
    if (s.includes('elf')) return '🧝';
    if (s.includes('dwarf')) return '🧔';
    if (s.includes('halfling') || s.includes('gnome')) return '🧙';
    if (s.includes('dragonborn')) return '🐲';
    if (s.includes('tiefling')) return '😈';
    if (s.includes('orc') || s.includes('goblin')) return '👹';
    return '👤';
}

function copySingleNPCMarkdown(id) {
    const npc = (appState.roster || []).find(n => n.id === id);
    if (!npc) return;
    const md = formatNPCMarkdown(npc);
    copyTextToClipboard(md, `Copied "${npc.name}" as Markdown!`);
}

function exportRosterMarkdown() {
    const list = appState.roster || [];
    if (list.length === 0) {
        showToast("Roster is empty. Nothing to export.", "info");
        return;
    }
    const lines = [
        `# Campaign NPC Roster`,
        `*Exported from The Arcane Ledger on ${new Date().toLocaleDateString()}*`,
        ``,
        `Total Saved NPCs: ${list.length}`,
        ``,
        `---`,
        ``
    ];
    list.forEach(npc => {
        lines.push(formatNPCMarkdown(npc));
        lines.push(`\n---\n`);
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Campaign_Roster_${new Date().toISOString().slice(0,10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Exported ${list.length} NPCs to Markdown!`, "success");
}

function onRosterGroupingChanged(val) {
    if (!appState.rosterUI) appState.rosterUI = {};
    appState.rosterUI.groupBy = val;
    renderRoster();
}

function onRosterSortChanged(val) {
    if (!appState.rosterUI) appState.rosterUI = {};
    appState.rosterUI.sortBy = val;
    renderRoster();
}

function onRosterFilterLocationChanged(val) {
    if (!appState.rosterUI) appState.rosterUI = {};
    appState.rosterUI.locationFilter = val;
    renderRoster();
}

function onRosterFilterFactionChanged(val) {
    if (!appState.rosterUI) appState.rosterUI = {};
    appState.rosterUI.factionFilter = val;
    renderRoster();
}

function setRosterDensity(density) {
    if (!appState.rosterUI) appState.rosterUI = {};
    appState.rosterUI.density = density;
    const detBtn = document.getElementById('roster-density-detailed');
    const compBtn = document.getElementById('roster-density-compact');
    if (detBtn && compBtn) {
        if (density === 'detailed') {
            detBtn.className = "px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-ledger-950 transition";
            compBtn.className = "px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-white transition";
        } else {
            compBtn.className = "px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-ledger-950 transition";
            detBtn.className = "px-1.5 py-0.5 rounded text-[10px] text-slate-400 hover:text-white transition";
        }
    }
    renderRoster();
}

function clearRosterSearch() {
    const input = document.getElementById('roster-search');
    if (input) input.value = '';
    const clearBtn = document.getElementById('roster-search-clear');
    if (clearBtn) clearBtn.classList.add('hidden');
    renderRoster();
}

function toggleRosterGroup(groupKey) {
    if (!appState.rosterUI) appState.rosterUI = {};
    if (!appState.rosterUI.collapsedGroups) appState.rosterUI.collapsedGroups = new Set();
    if (appState.rosterUI.collapsedGroups.has(groupKey)) {
        appState.rosterUI.collapsedGroups.delete(groupKey);
    } else {
        appState.rosterUI.collapsedGroups.add(groupKey);
    }
    renderRoster();
}

function sortNpcList(list, sortBy = 'name-asc') {
    const sorted = [...list];
    switch (sortBy) {
        case 'name-asc':
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'name-desc':
            sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
            break;
        case 'newest':
            // Roster array is naturally unshifted newest-first
            break;
        case 'oldest':
            sorted.reverse();
            break;
        case 'role':
            sorted.sort((a, b) => (a.role || '').localeCompare(b.role || ''));
            break;
        default:
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return sorted;
}

function syncRosterFilterDropdowns() {
    const locSel = document.getElementById('roster-filter-location');
    const facSel = document.getElementById('roster-filter-faction');
    if (!locSel || !facSel) return;

    const curLoc = appState.rosterUI?.locationFilter || 'ALL';
    const curFac = appState.rosterUI?.factionFilter || 'ALL';

    const locCounts = {};
    const facCounts = {};
    (appState.roster || []).forEach(n => {
        const l = n.location || '__none__';
        locCounts[l] = (locCounts[l] || 0) + 1;
        const f = n.faction || '__none__';
        facCounts[f] = (facCounts[f] || 0) + 1;
    });

    let locHtml = `<option value="ALL">All Locs (${appState.roster.length})</option>`;
    if (locCounts['__none__']) {
        locHtml += `<option value="__none__">Wandering (${locCounts['__none__']})</option>`;
    }
    Object.keys(locCounts).filter(k => k !== '__none__').sort().forEach(loc => {
        locHtml += `<option value="${escapeHTML(loc)}">${escapeHTML(loc)} (${locCounts[loc]})</option>`;
    });
    locSel.innerHTML = locHtml;
    locSel.value = curLoc;
    if (locSel.value !== curLoc) locSel.value = 'ALL';

    let facHtml = `<option value="ALL">All Factions (${appState.roster.length})</option>`;
    if (facCounts['__none__']) {
        facHtml += `<option value="__none__">Independent (${facCounts['__none__']})</option>`;
    }
    Object.keys(facCounts).filter(k => k !== '__none__').sort().forEach(fac => {
        facHtml += `<option value="${escapeHTML(fac)}">${escapeHTML(fac)} (${facCounts[fac]})</option>`;
    });
    facSel.innerHTML = facHtml;
    facSel.value = curFac;
    if (facSel.value !== curFac) facSel.value = 'ALL';
}

function renderRosterItem(npc, density, isActive) {
    if (density === 'compact') {
        return `
            <div id="roster-item-${npc.id}" onclick="loadNPCFromRoster('${npc.id}')" class="group p-2 rounded-lg bg-ledger-950/80 hover:bg-ledger-800 border ${isActive ? 'ring-1 ring-amber-400 border-amber-400 bg-amber-500/10' : 'border-ledger-800 hover:border-amber-500/40'} cursor-pointer transition flex items-center justify-between gap-1.5 text-xs">
                <div class="flex items-center gap-1.5 min-w-0 flex-1">
                    <span class="text-xs shrink-0">${getSpeciesEmoji(npc.species)}</span>
                    <div class="truncate">
                        <span class="font-bold text-white group-hover:text-amber-300 transition text-[11px] truncate">${escapeHTML(npc.name)}</span>
                        ${npc.role ? `<span class="text-[10px] text-sky-300/80 ml-1 truncate">(${escapeHTML(npc.role)})</span>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    ${npc.location ? `<span class="px-1.5 py-0.5 rounded bg-ledger-900 border border-ledger-700 text-emerald-300 text-[9px] truncate max-w-[75px]" title="${escapeHTML(npc.location)}">📍 ${escapeHTML(npc.location)}</span>` : ''}
                    <button type="button" onclick="event.stopPropagation(); copySingleNPCMarkdown('${npc.id}')" title="Copy Markdown" class="p-1 rounded text-slate-500 hover:text-slate-200 text-[10px]">
                        📋
                    </button>
                    <button type="button" onclick="event.stopPropagation(); sendRosterNPCToCombat('${npc.id}')" title="Send to Combat" class="p-1 rounded text-slate-500 hover:text-amber-400 text-[10px]">
                        ⚔️
                    </button>
                    <button type="button" onclick="deleteNPCFromRoster('${npc.id}', event)" title="Delete NPC" class="p-1 rounded text-slate-500 hover:text-rose-400 text-[10px]">
                        ✕
                    </button>
                </div>
            </div>
        `;
    }

    return `
        <div id="roster-item-${npc.id}" onclick="loadNPCFromRoster('${npc.id}')" class="group p-3 rounded-xl bg-ledger-950/90 hover:bg-ledger-800 border ${isActive ? 'border-amber-400 bg-amber-500/10 ring-1 ring-amber-400/60 shadow-lg' : 'border-ledger-800 hover:border-amber-500/40'} cursor-pointer transition relative space-y-2">
            <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <h4 class="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 transition truncate">
                            ${escapeHTML(npc.name)}
                        </h4>
                        ${npc.epithet ? `<span class="text-amber-400/80 italic text-[11px] font-normal truncate">${escapeHTML(npc.epithet)}</span>` : ''}
                        ${isActive ? `<span class="px-1 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[9px] font-mono font-bold uppercase">Active</span>` : ''}
                    </div>
                    <p class="text-[11px] text-sky-300 font-medium mt-0.5 truncate">${escapeHTML(npc.species || 'Unknown')} • ${escapeHTML(npc.role || 'Unspecified')}</p>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    <button type="button" onclick="event.stopPropagation(); copySingleNPCMarkdown('${npc.id}')" title="Copy Markdown" class="p-1 rounded hover:bg-ledger-700 text-slate-400 hover:text-slate-200 transition text-xs">
                        📋
                    </button>
                    <button type="button" onclick="event.stopPropagation(); sendRosterNPCToCombat('${npc.id}')" title="Send to Combat Tracker" class="p-1 rounded bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 transition text-xs flex items-center gap-1">
                        <span>⚔️</span>
                    </button>
                    <button type="button" onclick="deleteNPCFromRoster('${npc.id}', event)" title="Delete from Roster" class="p-1 rounded hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>
            <div class="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                ${npc.faction ? `<span class="px-1.5 py-0.5 rounded bg-ledger-900 border border-ledger-700 text-indigo-300 truncate max-w-[130px]">⚔️ ${escapeHTML(npc.faction)}</span>` : ''}
                ${npc.location ? `<span class="px-1.5 py-0.5 rounded bg-ledger-900 border border-ledger-700 text-emerald-300 truncate max-w-[130px]">📍 ${escapeHTML(npc.location)}</span>` : ''}
                ${npc.statName ? `<span class="px-1.5 py-0.5 rounded bg-ledger-900 border border-ledger-700 text-slate-400 truncate max-w-[130px] font-mono text-[9px]">📊 ${escapeHTML(npc.statName)}</span>` : ''}
            </div>
            ${npc.notes ? `<p class="mt-1 text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1 italic line-clamp-2">"${escapeHTML(npc.notes)}"</p>` : ''}
        </div>
    `;
}

function renderRoster() {
    const listEl = document.getElementById('roster-list');
    const countEl = document.getElementById('roster-count');
    if (!listEl) return;

    if (!appState.rosterUI) {
        appState.rosterUI = {
            groupBy: 'location',
            sortBy: 'name-asc',
            density: 'detailed',
            locationFilter: 'ALL',
            factionFilter: 'ALL',
            collapsedGroups: new Set()
        };
    }

    const query = (document.getElementById('roster-search')?.value || "").toLowerCase().trim();
    const clearBtn = document.getElementById('roster-search-clear');
    if (clearBtn) {
        if (query) clearBtn.classList.remove('hidden');
        else clearBtn.classList.add('hidden');
    }

    if (countEl) countEl.innerText = appState.roster.length;
    syncRosterFilterDropdowns();

    const locFilter = appState.rosterUI.locationFilter || 'ALL';
    const facFilter = appState.rosterUI.factionFilter || 'ALL';

    let filtered = appState.roster.filter(npc => {
        if (query) {
            const matchesQuery = (
                (npc.name && npc.name.toLowerCase().includes(query)) ||
                (npc.epithet && npc.epithet.toLowerCase().includes(query)) ||
                (npc.role && npc.role.toLowerCase().includes(query)) ||
                (npc.species && npc.species.toLowerCase().includes(query)) ||
                (npc.faction && npc.faction.toLowerCase().includes(query)) ||
                (npc.location && npc.location.toLowerCase().includes(query)) ||
                (npc.notes && npc.notes.toLowerCase().includes(query)) ||
                (npc.statName && npc.statName.toLowerCase().includes(query))
            );
            if (!matchesQuery) return false;
        }

        if (locFilter !== 'ALL') {
            if (locFilter === '__none__') {
                if (npc.location && npc.location.trim()) return false;
            } else if ((npc.location || '').trim().toLowerCase() !== locFilter.trim().toLowerCase()) {
                return false;
            }
        }

        if (facFilter !== 'ALL') {
            if (facFilter === '__none__') {
                if (npc.faction && npc.faction.trim()) return false;
            } else if ((npc.faction || '').trim().toLowerCase() !== facFilter.trim().toLowerCase()) {
                return false;
            }
        }

        return true;
    });

    if (filtered.length === 0) {
        if (appState.roster.length === 0) {
            listEl.innerHTML = `
                <div class="text-center py-10 px-3 border border-dashed border-ledger-700 rounded-xl text-slate-400 text-xs space-y-1">
                    <p class="font-semibold text-slate-300">No Saved NPCs Yet</p>
                    <p>Click "Save to Roster" on any generated NPC to preserve them for your campaign.</p>
                </div>
            `;
        } else {
            listEl.innerHTML = `
                <div class="text-center py-8 px-3 border border-dashed border-ledger-700 rounded-xl text-slate-400 text-xs space-y-2">
                    <p class="font-semibold text-slate-300">No NPCs match filters</p>
                    <button type="button" onclick="clearRosterFilters()" class="px-2.5 py-1 rounded bg-ledger-800 hover:bg-ledger-700 text-amber-300 text-xs font-semibold">
                        Reset Filters
                    </button>
                </div>
            `;
        }
        return;
    }

    filtered = sortNpcList(filtered, appState.rosterUI.sortBy || 'name-asc');
    const density = appState.rosterUI.density || 'detailed';
    const activeId = appState.currentNPC?.id || null;
    const groupBy = appState.rosterUI.groupBy || 'location';

    if (groupBy === 'none') {
        listEl.innerHTML = filtered.map(npc => renderRosterItem(npc, density, activeId === npc.id)).join('');
        return;
    }

    const groups = {};
    filtered.forEach(npc => {
        let key = '';
        if (groupBy === 'location') {
            key = npc.location ? `📍 ${npc.location}` : `🌲 Wandering / No Location`;
        } else if (groupBy === 'faction') {
            key = npc.faction ? `⚔️ ${npc.faction}` : `🛡️ Independent / Unaligned`;
        } else if (groupBy === 'category') {
            key = npc.category ? `🏷️ ${npc.category}` : (npc.role ? `🏷️ ${npc.role}` : `🏷️ Other`);
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(npc);
    });

    const groupKeys = Object.keys(groups).sort((a, b) => {
        if (a.includes('Wandering') || a.includes('Independent') || a.includes('Other')) return 1;
        if (b.includes('Wandering') || b.includes('Independent') || b.includes('Other')) return -1;
        return a.localeCompare(b);
    });

    listEl.innerHTML = groupKeys.map(gKey => {
        const isCollapsed = appState.rosterUI.collapsedGroups?.has(gKey);
        const items = groups[gKey];
        return `
            <div class="roster-group rounded-xl border border-ledger-800/90 bg-ledger-950/40 overflow-hidden transition">
                <button type="button" onclick="toggleRosterGroup('${escapeHTML(gKey)}')" class="w-full px-2.5 py-1.5 flex items-center justify-between bg-ledger-900/80 hover:bg-ledger-850 text-left transition text-xs font-semibold select-none border-b border-ledger-800/60">
                    <span class="flex items-center gap-1.5 text-amber-300/90 truncate">
                        <span class="text-[9px] text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}">▼</span>
                        <span class="truncate">${escapeHTML(gKey)}</span>
                    </span>
                    <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-ledger-800 text-slate-300 border border-ledger-700 font-bold shrink-0">
                        ${items.length}
                    </span>
                </button>
                <div class="p-1.5 space-y-1.5 ${isCollapsed ? 'hidden' : 'block'}">
                    ${items.map(npc => renderRosterItem(npc, density, activeId === npc.id)).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function clearRosterFilters() {
    clearRosterSearch();
    const locSel = document.getElementById('roster-filter-location');
    if (locSel) locSel.value = 'ALL';
    const facSel = document.getElementById('roster-filter-faction');
    if (facSel) facSel.value = 'ALL';
    if (appState.rosterUI) {
        appState.rosterUI.locationFilter = 'ALL';
        appState.rosterUI.factionFilter = 'ALL';
    }
    renderRoster();
}

function openRosterDirectoryModal() {
    if (!appState.rosterUI) appState.rosterUI = {};
    if (!appState.rosterUI.dirViewMode) appState.rosterUI.dirViewMode = 'grid';
    if (!appState.rosterUI.dirGroupBy) appState.rosterUI.dirGroupBy = 'location';
    if (!appState.rosterUI.dirSortBy) appState.rosterUI.dirSortBy = 'name-asc';

    const dirGroupBySel = document.getElementById('dir-roster-group-by');
    if (dirGroupBySel) dirGroupBySel.value = appState.rosterUI.dirGroupBy;
    const dirSortBySel = document.getElementById('dir-roster-sort-by');
    if (dirSortBySel) dirSortBySel.value = appState.rosterUI.dirSortBy;

    syncDirFilterDropdowns();
    renderRosterDirectory();
    openModal('roster-directory-modal');
}

function syncDirFilterDropdowns() {
    const locSel = document.getElementById('dir-filter-location');
    const facSel = document.getElementById('dir-filter-faction');
    if (!locSel || !facSel) return;

    const curLoc = appState.rosterUI?.dirLocationFilter || 'ALL';
    const curFac = appState.rosterUI?.dirFactionFilter || 'ALL';

    const locs = new Set();
    const facs = new Set();
    (appState.roster || []).forEach(n => {
        if (n.location) locs.add(n.location);
        if (n.faction) facs.add(n.faction);
    });

    locSel.innerHTML = `<option value="ALL">All Locations (${appState.roster.length})</option>` +
        Array.from(locs).sort().map(l => `<option value="${escapeHTML(l)}">${escapeHTML(l)}</option>`).join('');
    locSel.value = curLoc;

    facSel.innerHTML = `<option value="ALL">All Factions (${appState.roster.length})</option>` +
        Array.from(facs).sort().map(f => `<option value="${escapeHTML(f)}">${escapeHTML(f)}</option>`).join('');
    facSel.value = curFac;
}

function onDirRosterGroupingChanged(val) {
    if (!appState.rosterUI) appState.rosterUI = {};
    appState.rosterUI.dirGroupBy = val;
    renderRosterDirectory();
}

function onDirRosterSortChanged(val) {
    if (!appState.rosterUI) appState.rosterUI = {};
    appState.rosterUI.dirSortBy = val;
    renderRosterDirectory();
}

function setDirViewMode(mode) {
    if (!appState.rosterUI) appState.rosterUI = {};
    appState.rosterUI.dirViewMode = mode;
    const gridBtn = document.getElementById('dir-view-grid-btn');
    const tableBtn = document.getElementById('dir-view-table-btn');
    if (gridBtn && tableBtn) {
        if (mode === 'grid') {
            gridBtn.className = "px-2.5 py-1 rounded text-xs font-bold bg-amber-500 text-ledger-950 transition";
            tableBtn.className = "px-2.5 py-1 rounded text-xs text-slate-400 hover:text-white transition";
        } else {
            tableBtn.className = "px-2.5 py-1 rounded text-xs font-bold bg-amber-500 text-ledger-950 transition";
            gridBtn.className = "px-2.5 py-1 rounded text-xs text-slate-400 hover:text-white transition";
        }
    }
    renderRosterDirectory();
}

function clearDirFilters() {
    const sInput = document.getElementById('dir-roster-search');
    if (sInput) sInput.value = '';
    const locSel = document.getElementById('dir-filter-location');
    if (locSel) locSel.value = 'ALL';
    const facSel = document.getElementById('dir-filter-faction');
    if (facSel) facSel.value = 'ALL';
    if (appState.rosterUI) {
        appState.rosterUI.dirLocationFilter = 'ALL';
        appState.rosterUI.dirFactionFilter = 'ALL';
    }
    renderRosterDirectory();
}

function loadNpcAndCloseDir(id) {
    closeModal('roster-directory-modal');
    navigateToNpc(id);
}

function renderRosterDirectory() {
    const container = document.getElementById('roster-directory-content');
    const badgeEl = document.getElementById('dir-roster-count-badge');
    if (!container) return;

    const query = (document.getElementById('dir-roster-search')?.value || "").toLowerCase().trim();
    const locFilter = document.getElementById('dir-filter-location')?.value || 'ALL';
    const facFilter = document.getElementById('dir-filter-faction')?.value || 'ALL';
    const sortBy = document.getElementById('dir-roster-sort-by')?.value || 'name-asc';
    const groupBy = document.getElementById('dir-roster-group-by')?.value || 'location';
    const viewMode = appState.rosterUI?.dirViewMode || 'grid';

    let filtered = (appState.roster || []).filter(npc => {
        if (query) {
            const matchesQuery = (
                (npc.name && npc.name.toLowerCase().includes(query)) ||
                (npc.epithet && npc.epithet.toLowerCase().includes(query)) ||
                (npc.role && npc.role.toLowerCase().includes(query)) ||
                (npc.species && npc.species.toLowerCase().includes(query)) ||
                (npc.faction && npc.faction.toLowerCase().includes(query)) ||
                (npc.location && npc.location.toLowerCase().includes(query)) ||
                (npc.notes && npc.notes.toLowerCase().includes(query)) ||
                (npc.statName && npc.statName.toLowerCase().includes(query)) ||
                (npc.backstory && npc.backstory.toLowerCase().includes(query)) ||
                (npc.appearance && npc.appearance.toLowerCase().includes(query))
            );
            if (!matchesQuery) return false;
        }

        if (locFilter !== 'ALL') {
            if ((npc.location || '').trim().toLowerCase() !== locFilter.trim().toLowerCase()) return false;
        }
        if (facFilter !== 'ALL') {
            if ((npc.faction || '').trim().toLowerCase() !== facFilter.trim().toLowerCase()) return false;
        }
        return true;
    });

    if (badgeEl) {
        badgeEl.innerText = `${filtered.length} of ${appState.roster.length} NPCs`;
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16 px-4 border border-dashed border-ledger-700 rounded-2xl text-slate-400 space-y-2">
                <span class="text-3xl block">🔍</span>
                <p class="font-bold text-sm text-slate-300">No NPCs Match Your Search / Filter</p>
                <p class="text-xs text-slate-500">Try adjusting your query or resetting filters</p>
                <button type="button" onclick="clearDirFilters()" class="mt-2 px-3 py-1.5 rounded-xl bg-ledger-800 hover:bg-ledger-700 text-amber-300 font-semibold text-xs transition">
                    Reset All Filters
                </button>
            </div>
        `;
        return;
    }

    filtered = sortNpcList(filtered, sortBy);

    if (viewMode === 'table') {
        container.innerHTML = `
            <div class="overflow-x-auto rounded-2xl border border-ledger-800 bg-ledger-950/80 shadow-md">
                <table class="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr class="bg-ledger-900 border-b border-ledger-800 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                            <th class="p-3">NPC Identity</th>
                            <th class="p-3">Role & Species</th>
                            <th class="p-3">Location</th>
                            <th class="p-3">Faction</th>
                            <th class="p-3">5e Stat Block</th>
                            <th class="p-3">Session Notes</th>
                            <th class="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-ledger-800/70">
                        ${filtered.map(npc => `
                            <tr class="hover:bg-ledger-900/60 transition group cursor-pointer" onclick="loadNpcAndCloseDir('${npc.id}')">
                                <td class="p-3">
                                    <div class="font-bold text-white group-hover:text-amber-300 transition flex items-center gap-1.5">
                                        <span>${getSpeciesEmoji(npc.species)}</span>
                                        <span>${escapeHTML(npc.name)}</span>
                                    </div>
                                    ${npc.epithet ? `<div class="text-[10px] text-amber-400/80 italic">${escapeHTML(npc.epithet)}</div>` : ''}
                                </td>
                                <td class="p-3 text-slate-300">
                                    <div class="font-medium text-sky-300">${escapeHTML(npc.role)}</div>
                                    <div class="text-[10px] text-slate-500">${escapeHTML(npc.species)}</div>
                                </td>
                                <td class="p-3">
                                    ${npc.location ? `<span class="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/70 text-emerald-300 text-[10px] font-medium whitespace-nowrap">📍 ${escapeHTML(npc.location)}</span>` : '<span class="text-slate-600 italic">None</span>'}
                                </td>
                                <td class="p-3">
                                    ${npc.faction ? `<span class="px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/70 text-indigo-300 text-[10px] font-medium whitespace-nowrap">⚔️ ${escapeHTML(npc.faction)}</span>` : '<span class="text-slate-600 italic">Independent</span>'}
                                </td>
                                <td class="p-3 font-mono text-[11px] text-slate-300 whitespace-nowrap">
                                    ${npc.statName ? `<span class="text-amber-300 font-bold">${escapeHTML(npc.statName)}</span> (${escapeHTML(npc.statAcHp || '')})` : '<span class="text-slate-600 italic">—</span>'}
                                </td>
                                <td class="p-3 text-slate-400 max-w-[200px] truncate text-[11px]">
                                    ${npc.notes ? `“${escapeHTML(npc.notes)}”` : '<span class="text-slate-600 italic">—</span>'}
                                </td>
                                <td class="p-3 text-right whitespace-nowrap" onclick="event.stopPropagation()">
                                    <div class="flex items-center justify-end gap-1.5">
                                        <button type="button" onclick="loadNpcAndCloseDir('${npc.id}')" title="Load into Generator" class="p-1.5 rounded-lg bg-ledger-800 hover:bg-ledger-700 text-amber-400 border border-ledger-700 text-xs transition">
                                            ✏️ Edit
                                        </button>
                                        <button type="button" onclick="sendRosterNPCToCombat('${npc.id}')" title="Send to Combat" class="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs transition">
                                            ⚔️ Combat
                                        </button>
                                        <button type="button" onclick="copySingleNPCMarkdown('${npc.id}')" title="Copy Markdown" class="p-1.5 rounded-lg bg-ledger-800 hover:bg-ledger-700 text-slate-300 text-xs transition">
                                            📋
                                        </button>
                                        <button type="button" onclick="deleteNPCFromRoster('${npc.id}', event)" title="Delete NPC" class="p-1.5 rounded-lg hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition text-xs">
                                            ✕
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
        return;
    }

    // Grid View
    const renderCard = (npc) => `
        <div class="trait-card rounded-2xl p-4 flex flex-col justify-between space-y-3 bg-ledger-950/90 border border-ledger-800 hover:border-amber-500/50 shadow-md transition group">
            <div class="space-y-2">
                <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="text-base">${getSpeciesEmoji(npc.species)}</span>
                            <h4 class="font-bold text-sm text-white group-hover:text-amber-300 transition truncate">${escapeHTML(npc.name)}</h4>
                            ${npc.epithet ? `<span class="text-amber-400/80 italic text-xs font-normal">"${escapeHTML(npc.epithet)}"</span>` : ''}
                        </div>
                        <p class="text-xs text-sky-300 font-medium mt-0.5">${escapeHTML(npc.species)} • ${escapeHTML(npc.role)}</p>
                    </div>
                    <div class="flex items-center gap-1 shrink-0">
                        <button type="button" onclick="copySingleNPCMarkdown('${npc.id}')" title="Copy Markdown" class="p-1.5 rounded-lg hover:bg-ledger-800 text-slate-400 hover:text-slate-200 transition text-xs">
                            📋
                        </button>
                        <button type="button" onclick="deleteNPCFromRoster('${npc.id}', event)" title="Delete from Roster" class="p-1.5 rounded-lg hover:bg-rose-950 text-slate-500 hover:text-rose-400 transition text-xs">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Badges -->
                <div class="flex flex-wrap items-center gap-1.5 text-[10px]">
                    ${npc.location ? `<span class="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-semibold">📍 ${escapeHTML(npc.location)}</span>` : '<span class="px-2 py-0.5 rounded-full bg-ledger-900 border border-ledger-800 text-slate-500">🌲 Wandering</span>'}
                    ${npc.faction ? `<span class="px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/80 text-indigo-300 font-semibold">⚔️ ${escapeHTML(npc.faction)}</span>` : ''}
                    ${npc.statName ? `<span class="px-2 py-0.5 rounded-full bg-ledger-900 border border-ledger-800 text-slate-300 font-mono">📊 ${escapeHTML(npc.statName)} (${escapeHTML(npc.statAcHp || '')})</span>` : ''}
                </div>

                <!-- Appearance / Personality snippet -->
                ${npc.appearance ? `<p class="text-[11px] text-slate-300 leading-snug line-clamp-2"><span class="text-slate-500 font-semibold">Look:</span> ${escapeHTML(npc.appearance)}</p>` : ''}
                ${npc.notes ? `<p class="text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded-lg p-1.5 italic line-clamp-2">“${escapeHTML(npc.notes)}”</p>` : ''}
            </div>

            <!-- Footer Action Buttons -->
            <div class="pt-2.5 border-t border-ledger-800/80 flex items-center justify-between gap-2">
                <button type="button" onclick="loadNpcAndCloseDir('${npc.id}')" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-ledger-950 font-bold text-xs flex items-center gap-1 shadow transition">
                    <span>✏️</span> Edit in Generator
                </button>
                <button type="button" onclick="sendRosterNPCToCombat('${npc.id}')" class="px-3 py-1.5 rounded-xl bg-ledger-800 hover:bg-ledger-700 text-amber-300 border border-ledger-700 font-semibold text-xs flex items-center gap-1 transition">
                    <span>⚔️</span> Push to Combat
                </button>
            </div>
        </div>
    `;

    if (groupBy === 'none') {
        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                ${filtered.map(renderCard).join('')}
            </div>
        `;
        return;
    }

    const groups = {};
    filtered.forEach(npc => {
        let key = '';
        if (groupBy === 'location') {
            key = npc.location ? `📍 ${npc.location}` : `🌲 Wandering / No Location`;
        } else if (groupBy === 'faction') {
            key = npc.faction ? `⚔️ ${npc.faction}` : `🛡️ Independent / Unaligned`;
        } else if (groupBy === 'category') {
            key = npc.category ? `🏷️ ${npc.category}` : (npc.role ? `🏷️ ${npc.role}` : `🏷️ Other`);
        }
        if (!groups[key]) groups[key] = [];
        groups[key].push(npc);
    });

    const groupKeys = Object.keys(groups).sort((a, b) => {
        if (a.includes('Wandering') || a.includes('Independent') || a.includes('Other')) return 1;
        if (b.includes('Wandering') || b.includes('Independent') || b.includes('Other')) return -1;
        return a.localeCompare(b);
    });

    container.innerHTML = groupKeys.map(gKey => {
        const items = groups[gKey];
        return `
            <div class="space-y-3">
                <div class="flex items-center justify-between border-b border-ledger-800 pb-1.5">
                    <h4 class="font-display font-bold text-sm text-amber-400 flex items-center gap-2">
                        <span>${escapeHTML(gKey)}</span>
                        <span class="px-2 py-0.2 rounded-full text-[10px] font-mono bg-ledger-800 text-slate-300 border border-ledger-700 font-bold">${items.length}</span>
                    </h4>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    ${items.map(renderCard).join('')}
                </div>
            </div>
        `;
    }).join('');
}

function formatNPCMarkdown(npc) {
    return [
        `### ${npc.name} ${npc.epithet ? `*${npc.epithet}*` : ''}`,
        `**${npc.species} — ${npc.role}** *(${npc.category})*`,
        `- **Faction:** ${npc.faction} — *${npc.factionStanding}*`,
        `- **Location:** ${npc.location}`,
        `- **Voice & Mannerism:** ${npc.voice}`,
        `- **Appearance:** ${npc.appearance}`,
        `- **Personality & Motivation:** ${npc.personality}`,
        `- **Backstory:** ${npc.backstory}`,
        `- **Secret / Plot Hook:** ${npc.secret}`,
        `- **Pocket Loot:** ${npc.loot}`,
        `- **5e Stat Reference:** **${npc.statName}** (${npc.statAcHp}) — \`${npc.statDetails}\``,
        npc.notes ? `- **Session Notes:** ${npc.notes}` : ''
    ].filter(Boolean).join('\n');
}

function copyNPCMarkdown() {
    syncDOMToCurrentNPC();
    const md = formatNPCMarkdown(appState.currentNPC);
    copyTextToClipboard(md, `Copied "${appState.currentNPC.name}" as Markdown!`);
}

window.exportRosterMarkdown = exportRosterMarkdown;
window.copySingleNPCMarkdown = copySingleNPCMarkdown;
window.copyNPCMarkdown = copyNPCMarkdown;
window.onRosterGroupingChanged = onRosterGroupingChanged;
window.onRosterSortChanged = onRosterSortChanged;
window.onRosterFilterLocationChanged = onRosterFilterLocationChanged;
window.onRosterFilterFactionChanged = onRosterFilterFactionChanged;
window.setRosterDensity = setRosterDensity;
window.clearRosterSearch = clearRosterSearch;
window.clearRosterFilters = clearRosterFilters;
window.toggleRosterGroup = toggleRosterGroup;
window.openRosterDirectoryModal = openRosterDirectoryModal;
window.renderRosterDirectory = renderRosterDirectory;
window.setDirViewMode = setDirViewMode;
window.onDirRosterGroupingChanged = onDirRosterGroupingChanged;
window.onDirRosterSortChanged = onDirRosterSortChanged;
window.clearDirFilters = clearDirFilters;
window.loadNpcAndCloseDir = loadNpcAndCloseDir;
window.navigateToNpc = navigateToNpc;
window.renderRoster = renderRoster;
window.populateTopFilterDropdowns = populateTopFilterDropdowns;
window.getActiveFactionsPool = getActiveFactionsPool;
window.getActiveLocationsPool = getActiveLocationsPool;

function populateTopFilterDropdowns() {
    const spSelect = document.getElementById('filter-species');
    if (spSelect) {
        const currentSp = spSelect.value || "ANY";
        spSelect.innerHTML = `<option value="ANY" class="bg-ledger-900">Any Species</option>` +
            Object.keys(SPECIES_DATA).map(s => `<option value="${escapeHTML(s)}" class="bg-ledger-900">${escapeHTML(s)}</option>`).join('');
        spSelect.value = currentSp;
    }

    const facSelect = document.getElementById('filter-faction');
    if (facSelect) {
        const currentFac = facSelect.value || "ANY";
        const factions = getActiveFactionsPool();
        let facHtml = `<option value="ANY" class="bg-ledger-900">Any Faction</option>`;
        factions.forEach(f => {
            facHtml += `<option value="${escapeHTML(f)}" class="bg-ledger-900">${escapeHTML(f)}</option>`;
        });
        facSelect.innerHTML = facHtml;
        facSelect.value = factions.includes(currentFac) ? currentFac : "ANY";
    }

    const locSelect = document.getElementById('filter-location');
    if (locSelect) {
        const currentLoc = locSelect.value || "ANY";
        const locations = getActiveLocationsPool();
        let locHtml = `<option value="ANY" class="bg-ledger-900">Any Location</option>`;
        locations.forEach(l => {
            locHtml += `<option value="${escapeHTML(l)}" class="bg-ledger-900">${escapeHTML(l)}</option>`;
        });
        locSelect.innerHTML = locHtml;
        locSelect.value = locations.includes(currentLoc) ? currentLoc : "ANY";
    }
}

// -----------------------------------------------------------------------------
// UTILITIES, MODALS & TOASTS
// -----------------------------------------------------------------------------
function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('hidden');
    m.classList.add('flex');
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('hidden');
    m.classList.remove('flex');
}

function escapeHTML(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function copyTextToClipboard(text, successMsg) {
    navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg || "Copied to clipboard!", "success");
    }).catch(() => {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast(successMsg || "Copied to clipboard!", "success");
    });
}

function showToast(message, type = "info") {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    const colors = {
        success: "bg-emerald-950/95 border-emerald-500/50 text-emerald-200",
        error: "bg-rose-950/95 border-rose-500/50 text-rose-200",
        info: "bg-ledger-800/95 border-amber-500/50 text-amber-200"
    };
    toast.className = `px-3.5 py-2 rounded-lg border text-xs font-medium shadow-xl backdrop-blur-md transition-all duration-300 ${colors[type] || colors.info}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(6px)";
        setTimeout(() => toast.remove(), 300);
    }, 2400);
}

// =============================================================================
// PHASE 2: IN-GAME TIME, WEATHER & TIMERS
// =============================================================================
function getTimeOfDayName(hour) {
    if (hour >= 5 && hour < 8) return "Dawn";
    if (hour >= 8 && hour < 12) return "Morning";
    if (hour >= 12 && hour < 14) return "Noon";
    if (hour >= 14 && hour < 18) return "Afternoon";
    if (hour >= 18 && hour < 21) return "Dusk";
    if (hour >= 21 || hour < 1) return "Night";
    return "Midnight";
}

function renderTimeWeatherHUD() {
    const tw = appState.timeWeather;
    if (!tw) return;

    const clockEl = document.getElementById('world-clock-display');
    const weatherEl = document.getElementById('world-weather-display');
    const moonEl = document.getElementById('world-moon-display');
    const timerBadgeEl = document.getElementById('active-timers-count');

    const hh = String(tw.hour || 9).padStart(2, '0');
    const mm = String(tw.minute || 0).padStart(2, '0');
    const tod = getTimeOfDayName(tw.hour || 9);

    if (clockEl) {
        clockEl.innerHTML = `
            <span class="text-amber-400 font-bold">Day ${tw.day || 1}</span>
            <span class="text-slate-300 font-mono font-bold">${hh}:${mm}</span>
            <span class="text-[10px] text-slate-400 uppercase tracking-wider">(${tod})</span>
        `;
    }

    if (weatherEl) {
        weatherEl.innerHTML = `
            <span title="${escapeHTML(tw.weather?.tacticalEffect || '')}" class="flex items-center gap-1 text-slate-200">
                <span>⛅</span>
                <span class="truncate max-w-[150px]">${escapeHTML(tw.weather?.temperature || 'Mild')}, ${escapeHTML(tw.weather?.precipitation || 'Clear')}</span>
            </span>
        `;
    }

    if (moonEl) {
        moonEl.innerHTML = `
            <span class="flex items-center gap-1 text-indigo-300">
                <span>🌙</span>
                <span>${escapeHTML(tw.moonPhase || 'Waxing')}</span>
            </span>
        `;
    }

    if (timerBadgeEl) {
        const count = (tw.activeTimers || []).length;
        timerBadgeEl.innerText = count;
        timerBadgeEl.className = count > 0 ? "px-1.5 py-0.2 rounded-full bg-amber-500 text-ledger-950 font-bold text-[9px] animate-pulse" : "px-1.5 py-0.2 rounded-full bg-ledger-800 text-slate-400 text-[9px]";
    }

    const dayInput = document.getElementById('manual-clock-day');
    const hourInput = document.getElementById('manual-clock-hour');
    const minInput = document.getElementById('manual-clock-minute');
    if (dayInput && document.activeElement !== dayInput) dayInput.value = tw.day || 1;
    if (hourInput && document.activeElement !== hourInput) hourInput.value = tw.hour ?? 9;
    if (minInput && document.activeElement !== minInput) minInput.value = tw.minute ?? 0;

    renderTimersListModal();
}

async function saveManualGameTime() {
    const day = parseInt(document.getElementById('manual-clock-day')?.value, 10) || 1;
    const hour = Math.max(0, Math.min(23, parseInt(document.getElementById('manual-clock-hour')?.value, 10) || 0));
    const minute = Math.max(0, Math.min(59, parseInt(document.getElementById('manual-clock-minute')?.value, 10) || 0));

    try {
        const res = await fetch('/api/time-weather/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ day, hour, minute })
        });
        if (res.ok) {
            const data = await res.json();
            appState.timeWeather = data.timeWeather || data.state;
            renderTimeWeatherHUD();
            showToast(`Clock set to Day ${day}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, "success");
            return;
        }
    } catch (e) {
        console.error("Error setting game time:", e);
    }

    // Fallback if offline
    if (appState.timeWeather) {
        appState.timeWeather.day = day;
        appState.timeWeather.hour = hour;
        appState.timeWeather.minute = minute;
        renderTimeWeatherHUD();
        showToast(`Clock set to Day ${day}, ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`, "info");
    }
}

async function timeskipDays(days) {
    if (!days || isNaN(days)) return;
    const currentDay = appState.timeWeather?.day || 1;
    const newDay = Math.max(1, currentDay + days);
    const hour = appState.timeWeather?.hour ?? 9;
    const minute = appState.timeWeather?.minute ?? 0;

    try {
        const res = await fetch('/api/time-weather/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ day: newDay, hour, minute })
        });
        if (res.ok) {
            const data = await res.json();
            appState.timeWeather = data.timeWeather || data.state;
            renderTimeWeatherHUD();
            showToast(`Timeskip: Advanced ${days} day${days > 1 ? 's' : ''} to Day ${newDay}!`, "success");
            return;
        }
    } catch (e) {
        console.error("Error with timeskip:", e);
    }

    if (appState.timeWeather) {
        appState.timeWeather.day = newDay;
        renderTimeWeatherHUD();
        showToast(`Timeskip: Advanced ${days} day${days > 1 ? 's' : ''} to Day ${newDay}!`, "info");
    }
}

function promptTimeskipDays() {
    const input = prompt("Enter number of days to skip forward:", "3");
    if (!input) return;
    const days = parseInt(input.trim(), 10);
    if (isNaN(days) || days <= 0) {
        showToast("Please enter a valid positive number of days.", "warning");
        return;
    }
    timeskipDays(days);
}

async function advanceInGameTime(minutes) {
    try {
        const res = await fetch('/api/time-weather/advance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minutes: minutes })
        });
        if (res.ok) {
            const data = await res.json();
            appState.timeWeather = data.state;
            renderTimeWeatherHUD();
            if (data.expiredTimers && data.expiredTimers.length > 0) {
                data.expiredTimers.forEach(name => {
                    showToast(`🔥 Timer Expired: "${name}"!`, "error");
                });
            } else {
                showToast(`Advanced time +${minutes >= 60 ? (minutes/60)+' hr' : minutes+' min'}`, "info");
            }
            return;
        }
    } catch (e) {}

    // Fallback if offline
    let tw = appState.timeWeather;
    let totalMins = tw.minute + minutes;
    tw.minute = totalMins % 60;
    let extraHours = Math.floor(totalMins / 60);
    let totalHours = tw.hour + extraHours;
    tw.hour = totalHours % 24;
    tw.day += Math.floor(totalHours / 24);
    renderTimeWeatherHUD();
    showToast(`Advanced time +${minutes}m`, "info");
}

function rollRandomWeather() {
    const temps = ["Freezing Cold (DC 10 Con save or Exhaustion)", "Bitter Cold", "Chilly", "Mild & Pleasant", "Warm & Humid", "Sweltering Heat (DC 5+ Con save)"];
    const winds = ["Calm", "Light Breeze", "Moderate Gusts", "Strong Wind (Disadv on ranged attacks, clears fog)"];
    const precip = ["Clear Skies", "Overcast & Gloomy", "Light Drizzle", "Dense Fog (Heavily Obscured beyond 15ft)", "Heavy Downpour (Disadv on Perception, snuffs torches)", "Thunderstorm & Lightning"];

    const t = pickRandom(temps);
    const w = pickRandom(winds);
    const p = pickRandom(precip);

    let effect = "None. Normal conditions.";
    if (t.includes("Exhaustion") || t.includes("Heat")) effect = t;
    else if (w.includes("Disadv")) effect = w;
    else if (p.includes("Disadv") || p.includes("Fog")) effect = p;

    appState.timeWeather.weather = {
        temperature: t,
        wind: w,
        precipitation: p,
        tacticalEffect: effect
    };

    renderTimeWeatherHUD();
    fetch('/api/time-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState.timeWeather)
    });
    showToast(`New Weather: ${p}, ${t.split('(')[0]}`, "info");
}

async function triggerRest(type) {
    if (type === 'long') {
        if (!confirm("Take a Long Rest (8 Hours)?\n\n• Regain all lost HP\n• Reset Temp HP and Death Saves\n• Reduce Exhaustion by 1 level (2024 Rule)")) return;
        try {
            const res = await fetch('/api/party/rest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'long' })
            });
            if (res.ok) {
                const data = await res.json();
                appState.party = data.party;
            }
        } catch (e) {
            appState.party.forEach(pc => {
                pc.currentHp = pc.maxHp;
                pc.tempHp = 0;
                pc.deathSaves = { successes: 0, failures: 0 };
            });
        }
        await advanceInGameTime(480);
        renderPartyHUD();
        showToast("☀️ Long Rest complete! Full HP restored, Death Saves reset.", "success");
    } else {
        if (!confirm("Take a Short Rest (1 Hour)?\n\n• Recharges short-rest class features\n• Spend Hit Dice to heal")) return;
        try {
            await fetch('/api/party/rest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'short' })
            });
        } catch (e) {}
        await advanceInGameTime(60);
        showToast("⛺ Short Rest complete (1 Hour). Recharged short rest powers.", "info");
    }
}

function openAddTimerModal() {
    renderTimersListModal();
    openModal('timers-modal');
}

function renderTimersListModal() {
    const listEl = document.getElementById('active-timers-list');
    if (!listEl) return;
    const timers = appState.timeWeather?.activeTimers || [];

    if (timers.length === 0) {
        listEl.innerHTML = `<p class="text-slate-400 text-xs italic py-2">No active duration countdowns (torches, potions, spells).</p>`;
        return;
    }

    listEl.innerHTML = timers.map((t, idx) => `
        <div class="flex items-center justify-between gap-2 p-2 rounded-lg bg-ledger-950 border border-ledger-800 text-xs">
            <div>
                <span class="font-bold text-slate-200">${escapeHTML(t.name)}</span>
                ${t.source ? `<span class="text-[10px] text-slate-400 font-mono">(${escapeHTML(t.source)})</span>` : ''}
            </div>
            <div class="flex items-center gap-2">
                <span class="font-mono text-amber-300 font-bold">${t.remainingMinutes}m left</span>
                <button onclick="removeTimer('${t.id}')" class="text-slate-500 hover:text-rose-400">✕</button>
            </div>
        </div>
    `).join('');
}

function addTimerFromModal() {
    const name = document.getElementById('new-timer-name')?.value.trim();
    const duration = parseInt(document.getElementById('new-timer-duration')?.value) || 60;
    const source = document.getElementById('new-timer-source')?.value.trim() || "";

    if (!name) return;
    if (!appState.timeWeather.activeTimers) appState.timeWeather.activeTimers = [];

    appState.timeWeather.activeTimers.push({
        id: `timer-${Date.now()}`,
        name: name,
        durationMinutes: duration,
        remainingMinutes: duration,
        source: source
    });

    document.getElementById('new-timer-name').value = "";
    document.getElementById('new-timer-source').value = "";

    renderTimeWeatherHUD();
    fetch('/api/time-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState.timeWeather)
    });
    showToast(`Added countdown timer: ${name} (${duration}m)`, "success");
}

function removeTimer(id) {
    if (!appState.timeWeather?.activeTimers) return;
    appState.timeWeather.activeTimers = appState.timeWeather.activeTimers.filter(t => t.id !== id);
    renderTimeWeatherHUD();
    fetch('/api/time-weather', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appState.timeWeather)
    });
    showToast("Removed timer", "info");
}

// =============================================================================
// PHASE 2: LOOT & MERCHANT GENERATOR
// =============================================================================
function renderLootScreen() {
    if (!appState.currentShop) {
        generateShop();
    } else {
        renderShopInventory();
    }
}

function generateShop() {
    const shopType = document.getElementById('shop-type-select')?.value || "blacksmith";
    const shopTier = document.getElementById('shop-tier-select')?.value || "town";
    const multiplier = parseFloat(document.getElementById('shop-price-slider')?.value || "1.0");

    const catalog = SHOP_CATALOGS[shopType];
    if (!catalog) return;

    const availableTiers = ["village"];
    if (shopTier === "town") availableTiers.push("town");
    if (shopTier === "city") availableTiers.push("town", "city");

    let itemsPool = [];
    availableTiers.forEach(t => {
        if (catalog.tiers[t]) itemsPool.push(...catalog.tiers[t]);
    });

    // Randomize availability & prices
    const generatedItems = itemsPool.map(item => {
        const adjustedCost = Math.max(1, Math.round(item.cost * multiplier));
        const stockQty = (item.cost > 200) ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 4) + 1;
        return {
            ...item,
            finalCost: adjustedCost,
            qty: stockQty
        };
    });

    appState.currentShop = {
        type: shopType,
        name: catalog.name,
        desc: catalog.description,
        tier: shopTier,
        multiplier: multiplier,
        items: generatedItems
    };

    renderShopInventory();
}

function getPurseSummary(coins) {
    if (!coins) return "0 GP";
    const parts = [];
    if (coins.pp) parts.push(`${coins.pp}pp`);
    if (coins.gp || (!coins.pp && !coins.sp && !coins.cp)) parts.push(`${coins.gp || 0}gp`);
    if (coins.sp) parts.push(`${coins.sp}sp`);
    if (coins.cp) parts.push(`${coins.cp}cp`);
    return parts.join(', ');
}

function deductCoins(coins, costAmount, costUnit) {
    if (!coins) return null;
    const coinRates = { pp: 1000, gp: 100, sp: 10, cp: 1 };
    const unit = (costUnit || 'gp').toLowerCase();
    const rate = coinRates[unit] || 100;
    const costCp = costAmount * rate;

    let pp = coins.pp || 0;
    let gp = coins.gp || 0;
    let sp = coins.sp || 0;
    let cp = coins.cp || 0;

    let totalCp = pp * 1000 + gp * 100 + sp * 10 + cp;
    if (totalCp < costCp) return null;

    if (unit === 'gp' && gp >= costAmount) {
        gp -= costAmount;
    } else if (unit === 'sp' && sp >= costAmount) {
        sp -= costAmount;
    } else if (unit === 'cp' && cp >= costAmount) {
        cp -= costAmount;
    } else if (unit === 'pp' && pp >= costAmount) {
        pp -= costAmount;
    } else {
        let remCp = totalCp - costCp;
        let newPp = Math.min(pp, Math.floor(remCp / 1000));
        remCp -= newPp * 1000;
        let newGp = Math.floor(remCp / 100);
        remCp -= newGp * 100;
        let newSp = Math.floor(remCp / 10);
        remCp -= newSp * 10;
        let newCp = remCp;

        pp = newPp;
        gp = newGp;
        sp = newSp;
        cp = newCp;
    }
    return { pp, gp, sp, cp };
}

function renderShopInventory() {
    const shop = appState.currentShop;
    const container = document.getElementById('shop-inventory-list');
    const titleEl = document.getElementById('shop-inventory-title');
    const descEl = document.getElementById('shop-inventory-desc');

    if (!container || !shop) return;

    if (titleEl) titleEl.innerText = shop.name;
    if (descEl) descEl.innerText = `${shop.desc} • Price Multiplier: ${Math.round(shop.multiplier * 100)}% (${shop.tier.toUpperCase()})`;

    const stashCoins = appState.partyStash?.coins || appState.partyStash?.currency || { pp: 0, gp: 0, sp: 0, cp: 0 };
    const stashPurseStr = getPurseSummary(stashCoins);
    const party = appState.party || [];

    container.innerHTML = shop.items.map((item, idx) => {
        const partyOptions = party.map(pc => {
            const pcPurse = getPurseSummary(pc.currency);
            return `<option value="${pc.id}">${escapeHTML(pc.name)} (${pcPurse})</option>`;
        }).join('');

        const isOutOfStock = item.qty <= 0;

        return `
            <div class="trait-card rounded-xl p-3 flex flex-col justify-between space-y-2">
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <h4 class="font-bold text-xs sm:text-sm text-slate-100">${escapeHTML(item.name)}</h4>
                        <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-ledger-900 border border-ledger-700 text-sky-300">${escapeHTML(item.type)}</span>
                    </div>
                    <div class="text-right">
                        <span class="font-mono font-bold text-xs sm:text-sm text-amber-300">${item.finalCost} ${item.unit}</span>
                        <span class="text-[10px] ${isOutOfStock ? 'text-rose-400 font-bold' : 'text-slate-400'} block">Stock: ${item.qty}</span>
                    </div>
                </div>
                <p class="text-[11px] text-slate-300 leading-snug pt-1 border-t border-ledger-800/80">${escapeHTML(item.desc)}</p>
                
                <div class="pt-2 border-t border-ledger-800/80 flex items-center justify-between gap-2">
                    <div class="flex items-center gap-1.5 flex-1 min-w-0">
                        <label class="text-[10px] font-mono text-slate-400 shrink-0">Buyer:</label>
                        <select id="shop-buyer-${idx}" class="flex-1 bg-ledger-900 border border-ledger-700 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-amber-500 font-mono truncate">
                            <option value="stash">Party Stash (${stashPurseStr})</option>
                            ${partyOptions}
                        </select>
                    </div>
                    <button onclick="purchaseShopItem(${idx})" ${isOutOfStock ? 'disabled' : ''} class="px-3 py-1 rounded-lg ${isOutOfStock ? 'bg-ledger-900 text-slate-600 border border-ledger-800 cursor-not-allowed' : 'bg-amber-500 hover:bg-amber-400 text-ledger-950 shadow'} font-bold text-xs flex items-center gap-1 shrink-0 transition">
                        <span>🛒</span>
                        <span>${isOutOfStock ? 'Sold Out' : 'Buy'}</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function purchaseShopItem(itemIndex) {
    const shop = appState.currentShop;
    if (!shop || !shop.items || !shop.items[itemIndex]) return;
    const item = shop.items[itemIndex];

    if (item.qty <= 0) {
        showToast(`"${item.name}" is sold out!`, "warning");
        return;
    }

    const selectEl = document.getElementById(`shop-buyer-${itemIndex}`);
    const buyerId = selectEl ? selectEl.value : 'stash';

    const costAmount = item.finalCost || 1;
    const costUnit = (item.unit || 'gp').toLowerCase();

    if (buyerId === 'stash') {
        const stash = appState.partyStash || { coins: { pp: 0, gp: 0, sp: 0, cp: 0 }, currency: { pp: 0, gp: 0, sp: 0, cp: 0 }, items: [] };
        const currentCoins = Object.assign({ pp: 0, gp: 0, sp: 0, cp: 0 }, stash.coins || stash.currency || {});
        const updatedCoins = deductCoins(currentCoins, costAmount, costUnit);
        if (!updatedCoins) {
            showToast(`Shared Party Stash cannot afford ${item.name} (${costAmount} ${costUnit.toUpperCase()})! Current: ${getPurseSummary(currentCoins)}`, "error");
            return;
        }

        stash.coins = updatedCoins;
        stash.currency = updatedCoins;
        if (!stash.items) stash.items = [];
        const newItem = {
            id: `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            name: item.name,
            quantity: 1,
            qty: 1,
            weight: parseFloat(item.weight) || 1,
            category: item.type || "Equipment",
            rarity: item.rarity || "Common",
            cost: `${item.finalCost} ${costUnit}`,
            equipped: false,
            attuned: false,
            notes: item.desc || ""
        };
        stash.items.push(newItem);
        item.qty -= 1;

        await savePartyStashAPI(stash);
        renderShopInventory();
        if (typeof renderPartyInventoryModal === 'function') renderPartyInventoryModal();
        showToast(`Purchased "${item.name}" for ${costAmount} ${costUnit.toUpperCase()}! Charged to Party Stash.`, "success");
    } else {
        const pc = (appState.party || []).find(p => p.id === buyerId);
        if (!pc) {
            showToast("Selected buyer not found in party.", "error");
            return;
        }
        const currentCoins = Object.assign({ pp: 0, gp: 0, sp: 0, cp: 0 }, pc.currency || {});
        const updatedCoins = deductCoins(currentCoins, costAmount, costUnit);
        if (!updatedCoins) {
            showToast(`${pc.name} cannot afford ${item.name} (${costAmount} ${costUnit.toUpperCase()})! Current: ${getPurseSummary(currentCoins)}`, "error");
            return;
        }

        pc.currency = updatedCoins;
        if (!pc.inventory) pc.inventory = [];
        const newItem = {
            id: `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            name: item.name,
            quantity: 1,
            qty: 1,
            weight: parseFloat(item.weight) || 1,
            category: item.type || "Equipment",
            rarity: item.rarity || "Common",
            cost: `${item.finalCost} ${costUnit}`,
            equipped: false,
            attuned: false,
            notes: item.desc || ""
        };
        pc.inventory.push(newItem);
        item.qty -= 1;

        await savePCCurrencyAPI(pc.id, pc.currency);
        await savePCInventoryAPI(pc.id, pc.inventory);
        renderShopInventory();
        if (typeof renderPartyInventoryModal === 'function') renderPartyInventoryModal();
        showToast(`Purchased "${item.name}" for ${costAmount} ${costUnit.toUpperCase()}! Charged to ${pc.name}.`, "success");
    }
}

function copyShopMarkdown() {
    const shop = appState.currentShop;
    if (!shop) return;

    const md = [
        `### Merchant Inventory: ${shop.name}`,
        `*${shop.desc}* — Settlement: ${shop.tier.toUpperCase()} | Markup: ${Math.round(shop.multiplier * 100)}%\n`,
        ...shop.items.map(i => `- **${i.name}** (${i.type}) — **${i.finalCost} ${i.unit}** (Qty: ${i.qty}) — *${i.desc}*`)
    ].join('\n');

    copyTextToClipboard(md, `Copied ${shop.name} inventory as Markdown!`);
}

async function broadcastShopInventory() {
    const shop = appState.currentShop;
    if (!shop || !shop.items || shop.items.length === 0) {
        showToast("No active shop inventory to broadcast. Reroll or load a shop first!", "warning");
        return;
    }

    const sub = `${shop.desc} • Settlement: ${shop.tier.toUpperCase()} (${Math.round(shop.multiplier * 100)}% Pricing)`;
    const textLines = [
        `Merchant Catalog: ${shop.name}`,
        sub,
        '',
        ...shop.items.map((item, idx) => 
            `${idx + 1}. ${item.name} (${item.type}) — ${item.finalCost} ${item.unit} (Stock: ${item.qty})\n   ${item.desc || 'Standard merchant ware'}`
        )
    ].join('\n\n');

    const payload = {
        active: true,
        title: shop.name || 'Merchant Shop',
        subtitle: sub,
        content: textLines,
        type: 'shop',
        imageUrl: '',
        items: shop.items
    };

    try {
        const res = await fetch('/api/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            appState.broadcast = data.broadcast || payload;
            renderBroadcastPill();
            showToast(`🛒 Broadcasted "${shop.name}" inventory to player display!`, "success");
            if (window.TabletopAudio) {
                TabletopAudio.playSecret();
            }
        } else {
            showToast("Failed to broadcast shop inventory.", "error");
        }
    } catch (e) {
        console.error("Error broadcasting shop inventory:", e);
        showToast("Error broadcasting shop inventory.", "error");
    }
}

function generateIndividualLoot(crTier) {
    const table = INDIVIDUAL_LOOT_TABLES[crTier];
    if (!table) return;

    const coins = table.coins();
    let trinket = null;
    if (Math.random() < table.trinketChance) {
        trinket = pickRandom(TRINKETS_LIST);
    }

    const outputEl = document.getElementById('loot-roll-result');
    if (!outputEl) return;

    outputEl.innerHTML = `
        <div class="bg-ledger-950 border border-amber-500/40 rounded-xl p-3.5 space-y-2">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-400">Monster Loot (CR ${crTier.replace('cr_', '').replace('_', '–')})</span>
                <button onclick="copyLootMarkdown('Individual Loot', '${escapeHTML(coins)}', '${escapeHTML(trinket || '')}')" class="px-2 py-0.5 rounded bg-ledger-800 hover:bg-ledger-700 text-[11px] text-slate-300">Copy MD</button>
            </div>
            <div class="text-xs space-y-1">
                <p><strong class="text-amber-300">Coins:</strong> ${escapeHTML(coins)}</p>
                ${trinket ? `<p><strong class="text-sky-300">Pocket Trinket:</strong> ${escapeHTML(trinket)}</p>` : ''}
            </div>
        </div>
    `;
    showToast("Generated Individual Monster Loot!", "success");
}

function generateTreasureHoard(crTier) {
    let coins = "";
    let gems = [];
    let magicItems = [];

    if (crTier === "cr_0_4") {
        const cp = (Math.floor(Math.random() * 30) + 10) * 100;
        const sp = (Math.floor(Math.random() * 20) + 5) * 100;
        const gp = (Math.floor(Math.random() * 10) + 2) * 10;
        coins = `${gp} gp, ${sp} sp, ${cp} cp`;
        const gemCount = Math.floor(Math.random() * 4) + 2;
        for (let i = 0; i < gemCount; i++) gems.push(pickRandom(GEMSTONES_AND_ART["10gp"]) + " (10 gp)");
        magicItems.push(pickRandom(MAGIC_ITEMS_TIERS["minor"]));
        if (Math.random() < 0.4) magicItems.push(pickRandom(MAGIC_ITEMS_TIERS["minor"]));
    } else if (crTier === "cr_5_10") {
        const cp = (Math.floor(Math.random() * 20) + 5) * 100;
        const sp = (Math.floor(Math.random() * 15) + 5) * 100;
        const gp = (Math.floor(Math.random() * 20) + 5) * 100;
        const pp = (Math.floor(Math.random() * 6) + 1) * 10;
        coins = `${gp} gp, ${pp} pp, ${sp} sp, ${cp} cp`;
        const gemCount = Math.floor(Math.random() * 6) + 3;
        for (let i = 0; i < gemCount; i++) gems.push(pickRandom(GEMSTONES_AND_ART["50gp"]) + " (50 gp)");
        magicItems.push(pickRandom(MAGIC_ITEMS_TIERS["medium"]));
        magicItems.push(pickRandom(MAGIC_ITEMS_TIERS["minor"]));
    } else {
        const gp = (Math.floor(Math.random() * 40) + 10) * 1000;
        const pp = (Math.floor(Math.random() * 20) + 5) * 100;
        coins = `${gp} gp, ${pp} pp`;
        const gemCount = Math.floor(Math.random() * 6) + 4;
        for (let i = 0; i < gemCount; i++) gems.push(pickRandom(GEMSTONES_AND_ART["500gp"]) + " (500 gp)");
        magicItems.push(pickRandom(MAGIC_ITEMS_TIERS["major"]));
        magicItems.push(pickRandom(MAGIC_ITEMS_TIERS["medium"]));
    }

    const outputEl = document.getElementById('loot-roll-result');
    if (!outputEl) return;

    outputEl.innerHTML = `
        <div class="bg-ledger-950 border border-amber-500/50 rounded-xl p-4 space-y-2.5 shadow-xl">
            <div class="flex items-center justify-between">
                <span class="text-xs font-bold uppercase tracking-wider text-amber-400">🪙 Treasure Hoard Chest</span>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-ledger-800 text-amber-300 border border-ledger-700">CR ${crTier.replace('cr_', '').replace('_', '–')}</span>
            </div>
            <div class="text-xs space-y-1.5 text-slate-200">
                <p><strong class="text-amber-300">Coins:</strong> ${escapeHTML(coins)}</p>
                <div>
                    <strong class="text-sky-300">Gems & Art Objects (${gems.length}):</strong>
                    <ul class="list-disc pl-4 text-[11px] text-slate-300 space-y-0.5 mt-0.5">
                        ${gems.map(g => `<li>${escapeHTML(g)}</li>`).join('')}
                    </ul>
                </div>
                <div>
                    <strong class="text-purple-300">Magic Items:</strong>
                    <ul class="list-disc pl-4 text-[11px] text-slate-200 space-y-0.5 mt-0.5">
                        ${magicItems.map(m => `<li class="font-semibold text-purple-200">${escapeHTML(m)}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `;
    showToast("Rolled Treasure Hoard!", "success");
}

function copyLootMarkdown(title, coins, trinket) {
    const md = `### ${title}\n- **Coins:** ${coins}\n${trinket ? `- **Trinket:** ${trinket}\n` : ''}`;
    copyTextToClipboard(md, "Copied loot to clipboard!");
}

// =============================================================================
// PHASE 2: LIVE SESSION SCRATCHPAD & TAGGED NOTES
// =============================================================================
function setActiveNoteTag(tag) {
    appState.activeNoteTag = tag;
    document.querySelectorAll('.note-tag-btn').forEach(b => {
        b.classList.remove('ring-2', 'ring-amber-400', 'font-bold');
    });
    const active = document.getElementById(`tag-chip-${tag}`);
    if (active) active.classList.add('ring-2', 'ring-amber-400', 'font-bold');
}

function filterNotesByTag(tag) {
    appState.notesFilter = tag;
    document.querySelectorAll('.filter-tag-btn').forEach(b => {
        b.classList.remove('bg-amber-500', 'text-ledger-950', 'font-bold');
        b.classList.add('bg-ledger-900', 'text-slate-400');
    });
    const active = document.getElementById(`filter-tag-${tag}`);
    if (active) {
        active.classList.remove('bg-ledger-900', 'text-slate-400');
        active.classList.add('bg-amber-500', 'text-ledger-950', 'font-bold');
    }
    renderSessionNotes();
}

async function addSessionNote() {
    const input = document.getElementById('new-session-note-input');
    if (!input || !input.value.trim()) return;

    const tw = appState.timeWeather;
    const hh = String(tw.hour || 9).padStart(2, '0');
    const mm = String(tw.minute || 0).padStart(2, '0');
    const timestampStr = `Day ${tw.day || 1}, ${hh}:${mm}`;

    const newNote = {
        id: `note-${Date.now()}`,
        timestamp: timestampStr,
        text: input.value.trim(),
        tag: appState.activeNoteTag || 'general'
    };

    appState.notes.unshift(newNote);
    input.value = "";
    renderSessionNotes();

    try {
        await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newNote)
        });
    } catch (e) {}

    showToast("Added session note", "success");
}

async function deleteSessionNote(id) {
    appState.notes = appState.notes.filter(n => n.id !== id);
    renderSessionNotes();
    try {
        await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    } catch (e) {}
    showToast("Removed note", "info");
}

function renderSessionNotes() {
    const container = document.getElementById('session-notes-feed');
    if (!container) return;

    const filter = appState.notesFilter || 'all';
    const notes = (appState.notes || []).filter(n => filter === 'all' || n.tag === filter);

    if (notes.length === 0) {
        container.innerHTML = `
            <div class="py-10 text-center border border-dashed border-ledger-700 rounded-xl text-slate-400 text-xs">
                No session notes found for tag "${filter}". Use the input above to jot down instant notes.
            </div>
        `;
        return;
    }

    const TAG_COLORS = {
        quest: "bg-amber-500/20 text-amber-300 border-amber-500/40",
        clue: "bg-sky-500/20 text-sky-300 border-sky-500/40",
        loot: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        npc: "bg-purple-500/20 text-purple-300 border-purple-500/40",
        combat: "bg-rose-500/20 text-rose-300 border-rose-500/40",
        general: "bg-ledger-800 text-slate-300 border-ledger-700"
    };

    container.innerHTML = notes.map(n => `
        <div class="p-3 rounded-xl bg-ledger-950/80 border border-ledger-800 hover:border-ledger-700 flex items-start justify-between gap-3 transition">
            <div class="space-y-1 flex-1">
                <div class="flex items-center gap-2">
                    <span class="px-1.5 py-0.2 rounded text-[10px] font-bold uppercase border ${TAG_COLORS[n.tag] || TAG_COLORS.general}">#${n.tag}</span>
                    <span class="text-[10px] font-mono text-slate-400">${escapeHTML(n.timestamp)}</span>
                </div>
                <p class="text-xs text-slate-200 leading-relaxed">${escapeHTML(n.text)}</p>
            </div>
            <div class="flex items-center gap-1">
                <button onclick="broadcastSessionNote('${n.id}')" title="Broadcast note to player screen" class="text-slate-400 hover:text-sky-300 transition p-1 text-xs">📺</button>
                <button onclick="deleteSessionNote('${n.id}')" title="Delete Note" class="text-slate-500 hover:text-rose-400 transition p-1">✕</button>
            </div>
        </div>
    `).join('');
}

function exportSessionNotesMarkdown() {
    if (!appState.notes || appState.notes.length === 0) {
        showToast("No session notes to export.", "info");
        return;
    }

    const grouped = {};
    appState.notes.forEach(n => {
        const t = n.tag || 'general';
        if (!grouped[t]) grouped[t] = [];
        grouped[t].push(n);
    });

    let md = `# Session Scratchpad & Log (${new Date().toLocaleDateString()})\n\n`;
    Object.keys(grouped).forEach(tag => {
        md += `### #${tag.toUpperCase()}\n`;
        grouped[tag].forEach(n => {
            md += `- **[${n.timestamp}]** ${n.text}\n`;
        });
        md += `\n`;
    });

    copyTextToClipboard(md, "Exported all session notes as Markdown!");
}

// -----------------------------------------------------------------------------

// =============================================================================
// PHASE 3: BESTIARY & MONSTER ENCOUNTER BRIDGE
// =============================================================================

function calcStatMod(score) {
    const val = parseInt(score) || 10;
    const mod = Math.floor((val - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
}

function renderBestiary() {
    renderBestiaryList();
    renderMonsterStatblock();
}

function onBestiarySearch(val) {
    appState.bestiarySearchQuery = val.trim().toLowerCase();
    renderBestiaryList();
}

function filterBestiary() {
    const crEl = document.getElementById('bestiary-cr-filter');
    const typeEl = document.getElementById('bestiary-type-filter');
    if (crEl) appState.bestiaryCrFilter = crEl.value;
    if (typeEl) appState.bestiaryTypeFilter = typeEl.value;
    renderBestiaryList();
}

function parseCrValue(crStr) {
    if (!crStr) return 0;
    if (crStr === '1/8') return 0.125;
    if (crStr === '1/4') return 0.25;
    if (crStr === '1/2') return 0.5;
    return parseFloat(crStr) || 0;
}

function renderBestiaryList() {
    const container = document.getElementById('bestiary-monster-list');
    const countLabel = document.getElementById('bestiary-count-label');
    if (!container) return;

    let list = appState.monsters || [];

    if (appState.bestiarySearchQuery) {
        const q = appState.bestiarySearchQuery;
        list = list.filter(m => {
            const nameMatch = (m.name || '').toLowerCase().includes(q);
            const typeMatch = (m.type || '').toLowerCase().includes(q);
            const actionMatch = (m.actions || []).some(a => (a.name || '').toLowerCase().includes(q) || (a.desc || '').toLowerCase().includes(q));
            const traitMatch = (m.traits || []).some(t => (t.name || '').toLowerCase().includes(q) || (t.desc || '').toLowerCase().includes(q));
            return nameMatch || typeMatch || actionMatch || traitMatch;
        });
    }

    if (appState.bestiaryCrFilter && appState.bestiaryCrFilter !== 'all') {
        if (appState.bestiaryCrFilter === '0-0.5') {
            list = list.filter(m => parseCrValue(m.cr) <= 0.5);
        } else if (appState.bestiaryCrFilter === '1-4') {
            list = list.filter(m => {
                const val = parseCrValue(m.cr);
                return val >= 1 && val <= 4;
            });
        } else if (appState.bestiaryCrFilter === '5-10') {
            list = list.filter(m => {
                const val = parseCrValue(m.cr);
                return val >= 5 && val <= 10;
            });
        } else if (appState.bestiaryCrFilter === '11+') {
            list = list.filter(m => parseCrValue(m.cr) >= 11);
        }
    }

    if (appState.bestiaryTypeFilter && appState.bestiaryTypeFilter !== 'all') {
        const t = appState.bestiaryTypeFilter.toLowerCase();
        list = list.filter(m => (m.type || '').toLowerCase().includes(t));
    }

    if (countLabel) countLabel.innerText = `Showing ${list.length} Monster${list.length === 1 ? '' : 's'}`;

    if (list.length === 0) {
        container.innerHTML = `
            <div class="p-6 text-center text-slate-500 text-xs italic space-y-3">
                <p>No monsters match your filters or bestiary is empty.</p>
                <button onclick="restoreSrdCompendiums()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition">
                    <span>🔄</span> <span>Restore 5.5e SRD Bestiary (330+ Monsters)</span>
                </button>
            </div>`;
        return;
    }

    container.innerHTML = list.map(m => {
        const isSelected = m.id === appState.selectedMonsterId;
        return `
            <div onclick="selectBestiaryMonster('${m.id}')" class="p-2 rounded-lg border transition cursor-pointer flex items-center justify-between gap-2.5 ${isSelected ? 'bg-amber-500/15 border-amber-500/60 shadow-sm' : 'bg-ledger-950/40 border-ledger-800/80 hover:bg-ledger-800/60 hover:border-ledger-700'}">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <img src="${escapeHTML(m.imageUrl || `/static/images/monsters/${m.id}.webp`)}" alt="${escapeHTML(m.name)}" class="w-9 h-9 rounded-lg border border-amber-500/40 object-cover shrink-0 bg-ledger-950 shadow-sm" loading="lazy">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="font-bold text-xs ${isSelected ? 'text-amber-300' : 'text-slate-200'} truncate">${escapeHTML(m.name)}</span>
                            <span class="text-[10px] font-mono px-1 py-0.2 rounded bg-ledger-900 border border-ledger-700 text-slate-400 font-semibold">CR ${m.cr || '0'}</span>
                        </div>
                        <p class="text-[10px] text-slate-400 truncate">${escapeHTML(m.size || 'Medium')} ${escapeHTML(m.type || 'Creature')}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <div class="text-right font-mono text-[10px] text-slate-400">
                        <div>AC <span class="text-slate-200 font-bold">${m.ac}</span></div>
                        <div>HP <span class="text-slate-200 font-bold">${m.hp}</span></div>
                    </div>
                    <button onclick="event.stopPropagation(); addMonsterTokenToBattlemap('${m.id}')" title="Place token onto tabletop battlemap" class="p-1.5 rounded-md bg-ledger-800 hover:bg-emerald-600 text-slate-300 hover:text-white border border-ledger-700 transition">
                        🗺️
                    </button>
                    <button onclick="event.stopPropagation(); openSpawnMonsterModal('${m.id}')" title="Quick spawn into combat" class="p-1.5 rounded-md bg-ledger-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-ledger-700 transition">
                        ⚔️
                    </button>
                </div>
            </div>`;
    }).join('');
}

function selectBestiaryMonster(id) {
    appState.selectedMonsterId = id;
    renderBestiaryList();
    renderMonsterStatblock();
}

function renderMonsterStatblock() {
    const container = document.getElementById('bestiary-statblock-container');
    if (!container) return;

    const monster = (appState.monsters || []).find(m => m.id === appState.selectedMonsterId) || (appState.monsters || [])[0];
    if (!monster) {
        container.innerHTML = `
            <div class="p-12 text-center text-slate-500 text-xs">
                Select a monster from the list to view its complete 5.5e statblock.
            </div>`;
        return;
    }

    const bloodiedHp = Math.floor((monster.hp || 10) / 2);
    const stats = monster.stats || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

    container.innerHTML = `
        <div class="space-y-4 text-xs font-sans">
            
            <!-- Header / Title Banner -->
            <div class="flex items-start justify-between gap-3 border-b-2 border-amber-500/40 pb-3 flex-wrap">
                <div class="flex items-center gap-3">
                    <div class="relative group shrink-0">
                        <div class="w-14 h-14 rounded-xl bg-ledger-950 border-2 border-amber-500/60 p-0.5 shadow-md overflow-hidden flex items-center justify-center">
                            <img src="${escapeHTML(monster.imageUrl || `/static/images/monsters/${monster.id}.webp`)}" alt="${escapeHTML(monster.name)}" class="w-full h-full object-contain rounded-lg">
                        </div>
                        <button onclick="promptEditMonsterArt('${monster.id}')" title="Edit Monster Artwork URL" class="absolute -bottom-1 -right-1 p-1 rounded-full bg-ledger-900 border border-ledger-700 hover:border-amber-400 text-amber-300 text-[10px] shadow">
                            ✏️
                        </button>
                    </div>
                    <div>
                        <h3 class="font-display font-bold text-xl text-amber-300 tracking-wide">${escapeHTML(monster.name)}</h3>
                        <p class="text-xs text-slate-400 italic">${escapeHTML(monster.size || 'Medium')} ${escapeHTML(monster.type || 'Humanoid')}, ${escapeHTML(monster.alignment || 'Neutral')}</p>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="addMonsterTokenToBattlemap('${monster.id}')" class="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition" title="Place monster token onto tabletop battlemap">
                        <span>🗺️</span>
                        <span>Place on Map</span>
                    </button>
                    <button onclick="openSpawnMonsterModal('${monster.id}')" class="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition">
                        <span>⚔️</span>
                        <span>Send to Combat</span>
                    </button>
                    <button onclick="broadcastCurrentMonster()" title="Broadcast monster handout to player display" class="px-3 py-1.5 rounded-lg bg-sky-900/80 hover:bg-sky-800 text-sky-200 border border-sky-600/70 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-sky-950/40 transition">
                        <span>📺</span>
                        <span>Broadcast</span>
                    </button>
                    ${monster.id && monster.id.startsWith('m-') ? `
                        <button onclick="deleteMonster('${monster.id}')" title="Delete custom monster" class="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs transition">
                            🗑️
                        </button>` : ''}
                </div>
            </div>

            <!-- AC, HP, Speed Banner -->
            <div class="grid grid-cols-3 gap-2 bg-ledger-950 p-2.5 rounded-xl border border-ledger-800 text-center">
                <div>
                    <span class="text-[10px] text-slate-400 uppercase font-mono block">Armor Class</span>
                    <span class="text-sm font-bold text-amber-300 font-mono">${monster.ac}</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 uppercase font-mono block">Hit Points</span>
                    <span class="text-sm font-bold text-emerald-400 font-mono">${monster.hp}</span>
                    <span class="text-[10px] text-slate-400 font-mono">(${monster.hitDice || '—'})</span>
                    <span class="text-[10px] text-amber-500 font-semibold block">Bloodied: ≤${bloodiedHp}</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 uppercase font-mono block">Speed</span>
                    <span class="text-sm font-bold text-slate-200 font-mono">${escapeHTML(monster.speed || '30 ft.')}</span>
                </div>
            </div>

            <!-- Ability Scores Grid -->
            <div class="grid grid-cols-6 gap-1 bg-ledger-950/70 p-2 rounded-xl border border-ledger-800/80 text-center">
                <div>
                    <span class="text-[10px] text-slate-400 font-bold block">STR</span>
                    <span class="font-mono text-xs font-bold text-slate-100">${stats.str || 10}</span>
                    <span class="text-[10px] text-amber-400 font-mono block">(${calcStatMod(stats.str)})</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 font-bold block">DEX</span>
                    <span class="font-mono text-xs font-bold text-slate-100">${stats.dex || 10}</span>
                    <span class="text-[10px] text-amber-400 font-mono block">(${calcStatMod(stats.dex)})</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 font-bold block">CON</span>
                    <span class="font-mono text-xs font-bold text-slate-100">${stats.con || 10}</span>
                    <span class="text-[10px] text-amber-400 font-mono block">(${calcStatMod(stats.con)})</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 font-bold block">INT</span>
                    <span class="font-mono text-xs font-bold text-slate-100">${stats.int || 10}</span>
                    <span class="text-[10px] text-amber-400 font-mono block">(${calcStatMod(stats.int)})</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 font-bold block">WIS</span>
                    <span class="font-mono text-xs font-bold text-slate-100">${stats.wis || 10}</span>
                    <span class="text-[10px] text-amber-400 font-mono block">(${calcStatMod(stats.wis)})</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 font-bold block">CHA</span>
                    <span class="font-mono text-xs font-bold text-slate-100">${stats.cha || 10}</span>
                    <span class="text-[10px] text-amber-400 font-mono block">(${calcStatMod(stats.cha)})</span>
                </div>
            </div>

            <!-- Proficiencies, Senses & Languages -->
            <div class="space-y-1 text-slate-300 text-xs border-y border-ledger-800/80 py-2">
                ${monster.saves ? `<div><span class="font-bold text-slate-400">Saving Throws:</span> <span class="font-mono text-slate-200">${escapeHTML(monster.saves)}</span></div>` : ''}
                ${monster.skills ? `<div><span class="font-bold text-slate-400">Skills:</span> <span class="font-mono text-slate-200">${escapeHTML(monster.skills)}</span></div>` : ''}
                ${monster.vulnerabilities ? `<div><span class="font-bold text-rose-400">Damage Vulnerabilities:</span> <span class="text-rose-200">${escapeHTML(monster.vulnerabilities)}</span></div>` : ''}
                ${monster.resistances ? `<div><span class="font-bold text-amber-400">Damage Resistances:</span> <span class="text-amber-200">${escapeHTML(monster.resistances)}</span></div>` : ''}
                ${monster.immunities ? `<div><span class="font-bold text-emerald-400">Damage/Condition Immunities:</span> <span class="text-emerald-200">${escapeHTML(monster.immunities)}</span></div>` : ''}
                <div><span class="font-bold text-slate-400">Senses:</span> <span class="text-slate-200">${escapeHTML(monster.senses || 'Passive Perception 10')}</span></div>
                <div><span class="font-bold text-slate-400">Languages:</span> <span class="text-slate-200">${escapeHTML(monster.languages || '—')}</span></div>
                <div><span class="font-bold text-slate-400">Challenge:</span> <span class="font-mono font-bold text-amber-400">${monster.cr || '0'}</span> <span class="text-slate-400">(${monster.xp || 10} XP)</span></div>
            </div>

            <!-- Traits Section -->
            ${monster.traits && monster.traits.length > 0 ? `
                <div class="space-y-2">
                    <h4 class="font-display font-bold text-amber-400 text-xs uppercase tracking-wider">Traits & Special Abilities</h4>
                    <div class="space-y-1.5">
                        ${monster.traits.map(t => `
                            <p class="text-slate-300 text-xs leading-relaxed">
                                <span class="font-bold text-slate-100 italic">${escapeHTML(t.name)}.</span> ${escapeHTML(t.desc)}
                            </p>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Actions Section -->
            ${monster.actions && monster.actions.length > 0 ? `
                <div class="space-y-2 pt-2 border-t border-ledger-800">
                    <h4 class="font-display font-bold text-rose-400 text-xs uppercase tracking-wider">Actions</h4>
                    <div class="space-y-2">
                        ${monster.actions.map(a => `
                            <div class="bg-ledger-950/60 p-2.5 rounded-lg border border-ledger-800/80">
                                <span class="font-bold text-amber-300">${escapeHTML(a.name)}.</span> 
                                <span class="text-slate-300 leading-relaxed">${escapeHTML(a.desc)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Bonus Actions (if any) -->
            ${monster.bonusActions && monster.bonusActions.length > 0 ? `
                <div class="space-y-2 pt-2 border-t border-ledger-800">
                    <h4 class="font-display font-bold text-sky-400 text-xs uppercase tracking-wider">Bonus Actions</h4>
                    <div class="space-y-1.5">
                        ${monster.bonusActions.map(ba => `
                            <p class="text-slate-300 text-xs leading-relaxed"><span class="font-bold text-sky-200 italic">${escapeHTML(ba.name)}.</span> ${escapeHTML(ba.desc)}</p>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Reactions (if any) -->
            ${monster.reactions && monster.reactions.length > 0 ? `
                <div class="space-y-2 pt-2 border-t border-ledger-800">
                    <h4 class="font-display font-bold text-emerald-400 text-xs uppercase tracking-wider">Reactions</h4>
                    <div class="space-y-1.5">
                        ${monster.reactions.map(r => `
                            <p class="text-slate-300 text-xs leading-relaxed"><span class="font-bold text-emerald-300 italic">${escapeHTML(r.name)}.</span> ${escapeHTML(r.desc)}</p>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Legendary Actions (if any) -->
            ${monster.legendaryActions && monster.legendaryActions.length > 0 ? `
                <div class="space-y-2 pt-2 border-t border-ledger-800">
                    <h4 class="font-display font-bold text-amber-400 text-xs uppercase tracking-wider">Legendary Actions</h4>
                    <div class="space-y-1.5">
                        ${monster.legendaryActions.map(la => `
                            <p class="text-slate-300 text-xs leading-relaxed"><span class="font-bold text-amber-200 italic">${escapeHTML(la.name)}.</span> ${escapeHTML(la.desc)}</p>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

        </div>`;
}

function openSpawnMonsterModal(monsterId) {
    const monster = (appState.monsters || []).find(m => m.id === monsterId);
    if (!monster) return;

    const idInput = document.getElementById('spawn-monster-id');
    const nameLabel = document.getElementById('spawn-monster-name');
    const countInput = document.getElementById('spawn-monster-count');
    const autoRollCheck = document.getElementById('spawn-monster-autoroll');
    const manualWrap = document.getElementById('spawn-manual-init-wrap');
    const manualInput = document.getElementById('spawn-monster-manual-init');

    if (idInput) idInput.value = monster.id;
    if (nameLabel) nameLabel.innerText = monster.name;
    if (countInput) countInput.value = "1";
    if (autoRollCheck) autoRollCheck.checked = true;
    if (manualWrap) manualWrap.classList.add('hidden');
    if (manualInput) manualInput.value = "";

    openModal('spawn-monster-modal');
}

function toggleSpawnAutoRoll() {
    const autoRollCheck = document.getElementById('spawn-monster-autoroll');
    const manualWrap = document.getElementById('spawn-manual-init-wrap');
    if (!autoRollCheck || !manualWrap) return;
    if (autoRollCheck.checked) {
        manualWrap.classList.add('hidden');
    } else {
        manualWrap.classList.remove('hidden');
    }
}

async function confirmSpawnMonster() {
    const id = document.getElementById('spawn-monster-id')?.value;
    const count = parseInt(document.getElementById('spawn-monster-count')?.value) || 1;
    const autoRoll = document.getElementById('spawn-monster-autoroll')?.checked;
    const manualInitVal = document.getElementById('spawn-monster-manual-init')?.value;

    if (!id) return;

    const payload = {
        count: Math.max(1, Math.min(12, count)),
        initiative: (!autoRoll && manualInitVal !== "") ? parseFloat(manualInitVal) : null
    };

    try {
        const res = await fetch(`/api/monsters/${id}/spawn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.combat) appState.combat = data.combat;
            closeModal('spawn-monster-modal');
            showToast(`⚔️ Spawned ${data.spawned} ${data.spawnedNames ? data.spawnedNames.join(', ') : 'creature(s)'} into combat!`, "success");
            renderCombatTracker();
        } else {
            showToast("Failed to spawn monster to combat.", "error");
        }
    } catch (e) {
        showToast("Error connecting to server.", "error");
    }
}

function getMonsterTokenSizeSquares(sizeStr) {
    if (!sizeStr) return 1.0;
    const s = sizeStr.toLowerCase();
    if (s.includes('gargantuan')) return 4.0;
    if (s.includes('huge')) return 3.0;
    if (s.includes('large')) return 2.0;
    if (s.includes('tiny')) return 0.8;
    return 1.0; // Small and Medium are 1 square (1x1 inch)
}

async function addMonsterTokenToBattlemap(monsterId) {
    const monster = (appState.monsters || []).find(m => m.id === monsterId);
    if (!monster) {
        showToast("Monster not found.", "error");
        return;
    }

    // 1. ALSO spawn into Combat Tracker so it appears in the Combat tab!
    let combatantId = null;
    let combatantName = monster.name;
    let currentHp = monster.hp || 10;
    let maxHp = monster.hp || 10;

    try {
        const spawnRes = await fetch(`/api/monsters/${monster.id}/spawn`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count: 1 })
        });
        if (spawnRes.ok) {
            const spawnData = await spawnRes.json();
            if (spawnData.combat) {
                appState.combat = spawnData.combat;
                renderCombatTracker();
                // Find the newly spawned combatant
                const newlyAdded = (appState.combat.combatants || []).find(c => c.monsterId === monster.id || c.name.startsWith(monster.name));
                if (newlyAdded) {
                    combatantId = newlyAdded.id;
                    combatantName = newlyAdded.name;
                    currentHp = newlyAdded.currentHp;
                    maxHp = newlyAdded.maxHp;
                }
            }
        }
    } catch (e) {
        console.warn("Could not auto-spawn to combat:", e);
    }

    const crVal = parseFloat(monster.cr) || 0;
    const isBoss = crVal >= 10 || (monster.name && (monster.name.toLowerCase().includes('dragon') || monster.name.toLowerCase().includes('boss')));
    const color = isBoss ? '#a855f7' : '#ef4444';
    const squares = getMonsterTokenSizeSquares(monster.size);
    const imageUrl = monster.imageUrl || `/static/images/monsters/${monster.id}.webp`;

    try {
        const res = await fetch('/api/battlemap/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: combatantName,
                monsterId: monster.id,
                combatantId: combatantId || '',
                size: monster.size || 'Medium',
                sizeSquares: squares,
                imageUrl: imageUrl,
                currentHp: currentHp,
                maxHp: maxHp,
                color: color,
                visibleToPlayers: true
            })
        });

        if (res.ok) {
            const data = await res.json();
            showToast(`🗺️ Added ${combatantName} to Battlemap & Combat!`, "success");
            if (window.BattlemapController) {
                window.BattlemapController.onTokenAdded(data.token);
            }
        } else {
            showToast("Failed to place token on map.", "error");
        }
    } catch (e) {
        showToast("Error communicating with battlemap server.", "error");
    }
}

async function addCombatantTokenToBattlemap(combatantId) {
    const c = (appState.combat.combatants || []).find(x => x.id === combatantId);
    if (!c) {
        showToast("Combatant not found.", "error");
        return;
    }

    // Resolve bestiary monster by monsterId or clean name
    let monster = null;
    if (c.monsterId) {
        monster = (appState.monsters || []).find(m => m.id === c.monsterId);
    }
    if (!monster && c.name) {
        const cleanName = c.name.replace(/\s+\d+$/, '').trim().toLowerCase();
        monster = (appState.monsters || []).find(m => m.name.toLowerCase() === cleanName);
    }

    const isPc = c.type === 'pc' || c.type === 'player';
    const isBoss = c.type === 'boss' || (c.name && c.name.toLowerCase().includes('boss'));
    const color = isPc ? '#eab308' : (isBoss ? '#a855f7' : '#ef4444');

    // Proper size from combatant or bestiary monster
    const size = c.size || (monster ? monster.size : 'Medium');
    const squares = getMonsterTokenSizeSquares(size);

    // Proper portrait from combatant or bestiary monster
    let imageUrl = c.imageUrl;
    if (!imageUrl && monster) {
        imageUrl = monster.imageUrl || `/static/images/monsters/${monster.id}.webp`;
    }
    if (!imageUrl && isPc) {
        imageUrl = `/static/images/tokens/${c.name.toLowerCase().replace(/\s+/g, '_')}.webp`;
    }

    const isHidden = c.hidden === true || c.visibleToPlayers === false;

    try {
        const res = await fetch('/api/battlemap/tokens', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: c.name,
                combatantId: c.id,
                monsterId: c.monsterId || (monster ? monster.id : ''),
                size: size,
                sizeSquares: squares,
                imageUrl: imageUrl || '',
                currentHp: c.currentHp !== undefined ? c.currentHp : 10,
                maxHp: c.maxHp !== undefined ? c.maxHp : 10,
                color: color,
                visibleToPlayers: !isHidden
            })
        });

        if (res.ok) {
            const data = await res.json();
            showToast(`🗺️ Placed ${c.name} token on Tabletop Battlemap!`, "success");
            if (window.BattlemapController) {
                window.BattlemapController.onTokenAdded(data.token);
            }
        } else {
            showToast("Failed to place token on map.", "error");
        }
    } catch (e) {
        showToast("Error communicating with battlemap server.", "error");
    }
}

async function toggleCombatantVisibility(combatantId) {
    const c = (appState.combat.combatants || []).find(item => item.id === combatantId);
    if (!c) return;
    const newHidden = !c.hidden;
    c.hidden = newHidden;
    c.visibleToPlayers = !newHidden;

    // Synchronize to Battlemap token if placed
    if (window.BattlemapController && typeof window.BattlemapController.setTokenVisibilityByCombatantId === 'function') {
        window.BattlemapController.setTokenVisibilityByCombatantId(combatantId, !newHidden);
    }

    renderCombatTracker();
    apiSaveCombat();
    showToast(newHidden ? `🙈 ${c.name} hidden from player screen (Stealth / Fog)` : `👁️ ${c.name} revealed to players!`, "info");
}

function openAddMonsterModal() {
    document.getElementById('custom-monster-name').value = '';
    document.getElementById('custom-monster-cr').value = '1';
    document.getElementById('custom-monster-size').value = 'Medium';
    document.getElementById('custom-monster-type').value = 'Humanoid';
    document.getElementById('custom-monster-alignment').value = 'Neutral';
    document.getElementById('custom-monster-ac').value = '13';
    document.getElementById('custom-monster-hp').value = '25';
    document.getElementById('custom-monster-hitdice').value = '4d8 + 8';
    document.getElementById('custom-monster-speed').value = '30 ft.';
    document.getElementById('custom-monster-str').value = '14';
    document.getElementById('custom-monster-dex').value = '12';
    document.getElementById('custom-monster-con').value = '14';
    document.getElementById('custom-monster-int').value = '10';
    document.getElementById('custom-monster-wis').value = '10';
    document.getElementById('custom-monster-cha').value = '10';
    document.getElementById('custom-monster-senses').value = 'Passive Perception 10';
    document.getElementById('custom-monster-languages').value = 'Common';
    document.getElementById('custom-monster-actions').value = '';
    document.getElementById('custom-monster-traits').value = '';

    openModal('add-monster-modal');
}

async function saveCustomMonster() {
    const name = document.getElementById('custom-monster-name')?.value.trim();
    if (!name) {
        showToast("Monster name is required.", "warning");
        return;
    }

    const parseLines = (text) => {
        return (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(line => {
            const parts = line.split(':');
            if (parts.length > 1) {
                return { name: parts[0].trim(), desc: parts.slice(1).join(':').trim() };
            }
            return { name: "Action", desc: line };
        });
    };

    const monsterObj = {
        name: name,
        cr: document.getElementById('custom-monster-cr')?.value.trim() || '1',
        size: document.getElementById('custom-monster-size')?.value || 'Medium',
        type: document.getElementById('custom-monster-type')?.value.trim() || 'Humanoid',
        alignment: document.getElementById('custom-monster-alignment')?.value.trim() || 'Neutral',
        ac: parseInt(document.getElementById('custom-monster-ac')?.value) || 12,
        hp: parseInt(document.getElementById('custom-monster-hp')?.value) || 20,
        hitDice: document.getElementById('custom-monster-hitdice')?.value.trim() || '3d8',
        speed: document.getElementById('custom-monster-speed')?.value.trim() || '30 ft.',
        stats: {
            str: parseInt(document.getElementById('custom-monster-str')?.value) || 10,
            dex: parseInt(document.getElementById('custom-monster-dex')?.value) || 10,
            con: parseInt(document.getElementById('custom-monster-con')?.value) || 10,
            int: parseInt(document.getElementById('custom-monster-int')?.value) || 10,
            wis: parseInt(document.getElementById('custom-monster-wis')?.value) || 10,
            cha: parseInt(document.getElementById('custom-monster-cha')?.value) || 10
        },
        senses: document.getElementById('custom-monster-senses')?.value.trim() || 'Passive Perception 10',
        languages: document.getElementById('custom-monster-languages')?.value.trim() || 'Common',
        actions: parseLines(document.getElementById('custom-monster-actions')?.value),
        traits: parseLines(document.getElementById('custom-monster-traits')?.value)
    };

    try {
        const res = await fetch('/api/monsters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(monsterObj)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.monsters) appState.monsters = data.monsters;
            if (data.monster) appState.selectedMonsterId = data.monster.id;
            closeModal('add-monster-modal');
            showToast(`🐉 Saved custom monster: ${name}!`, "success");
            renderBestiary();
        }
    } catch (e) {
        showToast("Error saving custom monster.", "error");
    }
}

async function deleteMonster(id) {
    if (!confirm("Are you sure you want to delete this custom monster?")) return;
    try {
        const res = await fetch(`/api/monsters/${id}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.monsters) appState.monsters = data.monsters;
            if (appState.monsters.length > 0) appState.selectedMonsterId = appState.monsters[0].id;
            showToast("Monster removed.", "info");
            renderBestiary();
        }
    } catch (e) {
        showToast("Error deleting monster.", "error");
    }
}

// =============================================================================
// PHASE 3: WORLD & CAMPAIGN ARCHITECTURE
// =============================================================================

const WORLD_SUBTAB_METADATA = {
    'overworld': { icon: '🧭', title: 'Regional Overworld Map', desc: 'Strategic kingdom & regional cartography with interactive lore pins, settlement popovers, and player overland travel broadcast' },
    'locations': { icon: '🏰', title: 'Locations & Settlements', desc: 'Settlement directory, taverns, dungeons, wilderness landmarks, and DM secrets' },
    'factions': { icon: '⚖️', title: 'Factions, Relations & Faction Turns', desc: 'Diplomatic web, between-session faction turn simulator, tension clocks, and party standing milestones' },
    'quests': { icon: '📜', title: 'Quests & Tavern Rumors', desc: 'Campaign quest checklist, objectives, street rumors, and clue corkboard' },
    'pantheon': { icon: '☀️', title: 'Pantheon, Deities & Cosmic Cults', desc: 'Compendium of gods, celestial patrons, tenets of faith, and party piety tracking' },
    'timeline': { icon: '⏳', title: 'Campaign Historical Timeline', desc: 'Chronological eras feed and session log synchronization with the in-game calendar' },
    'travel': { icon: '🏕️', title: 'Wilderness Travel & Foraging Calculator', desc: 'Overland pace calculator, 5.5e foraging & navigation DCs, and roadside exploration complications' },
    'secrets': { icon: '🔍', title: 'Secrets & Clues Engine', desc: 'Prepare revelations, lore discoveries, and plot clues to drop during session play' },
    'handouts': { icon: '📜', title: 'In-World Handouts & Letters', desc: 'Forge authentic missives, burned journals, bounties, and decipherable coded notes' }
};

function toggleWorldSidebarSubmenu(forceOpen = null) {
    const submenu = document.getElementById('sidebar-world-subtabs');
    const chevron = document.getElementById('sidebar-world-chevron');
    if (!submenu) return;
    const shouldOpen = forceOpen !== null ? forceOpen : submenu.classList.contains('hidden');
    if (shouldOpen) {
        submenu.classList.remove('hidden');
        if (chevron) chevron.classList.add('rotate-180');
    } else {
        submenu.classList.add('hidden');
        if (chevron) chevron.classList.remove('rotate-180');
    }
}

function onSidebarWorldClick(e) {
    if (e) e.stopPropagation();
    if (appState.activeTab !== 'world') {
        switchTab('world');
        toggleWorldSidebarSubmenu(true);
    } else {
        toggleWorldSidebarSubmenu();
    }
}

function switchWorldSubtab(subtab) {
    if (!subtab) subtab = 'overworld';
    appState.worldActiveSubtab = subtab;

    // Ensure we are viewing the world tab
    if (appState.activeTab !== 'world') {
        switchTab('world');
    }

    // Ensure submenu is visible and chevron rotated
    toggleWorldSidebarSubmenu(true);

    // Hide all world panels
    document.querySelectorAll('.world-panel').forEach(p => p.classList.add('hidden'));

    // Reset all subtab buttons (sidebar buttons)
    document.querySelectorAll('.world-subtab-btn').forEach(btn => {
        btn.classList.remove(
            'bg-amber-500/20', 'bg-amber-500/25', 'bg-amber-500', 
            'text-amber-300', 'border', 'border-amber-500/40', 'border-amber-500/50', 'text-ledger-950'
        );
        btn.classList.add('text-slate-400');
    });

    const activePanel = document.getElementById(`world-panel-${subtab}`);
    const activeBtn = document.getElementById(`world-subtab-${subtab}`);
    if (activePanel) activePanel.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-400');
        activeBtn.classList.add('bg-amber-500/20', 'text-amber-300', 'border', 'border-amber-500/40');
    }

    // Update Header Breadcrumb in #view-world
    const meta = WORLD_SUBTAB_METADATA[subtab] || { icon: '🗺️', title: subtab, desc: '' };
    const iconEl = document.getElementById('world-active-subtab-icon');
    const titleEl = document.getElementById('world-active-subtab-title');
    const descEl = document.getElementById('world-active-subtab-desc');
    if (iconEl) iconEl.textContent = meta.icon;
    if (titleEl) titleEl.textContent = meta.title;
    if (descEl) descEl.textContent = meta.desc;

    // Trigger subtab renderers
    if (subtab === 'overworld') renderOverworld();
    else if (subtab === 'locations') renderLocations();
    else if (subtab === 'factions') { renderFactions(); renderFactionRelations(); }
    else if (subtab === 'quests') renderQuests();
    else if (subtab === 'pantheon') renderPantheon();
    else if (subtab === 'timeline') { fetchTimeline(); renderTimeline(); }
    else if (subtab === 'travel') renderTravel();
    else if (subtab === 'secrets') renderSecrets();
    else if (subtab === 'handouts') renderHandouts();
}

function renderWorldView() {
    switchWorldSubtab(appState.worldActiveSubtab || 'overworld');
}

function navigateToFaction(factionIdOrName) {
    if (!factionIdOrName) return;
    switchWorldSubtab('factions');
    const target = (appState.factions || []).find(f => f.id === factionIdOrName || (f.name && f.name.toLowerCase() === String(factionIdOrName).toLowerCase()));
    if (target) {
        setTimeout(() => {
            const card = document.getElementById(`faction-card-${target.id}`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.classList.add('ring-2', 'ring-amber-400');
                setTimeout(() => card.classList.remove('ring-2', 'ring-amber-400'), 2500);
            }
        }, 120);
    }
}

function navigateToNpc(npcIdOrName) {
    if (!npcIdOrName) return;
    switchTab('npcs');
    const target = (appState.roster || []).find(n => n.id === npcIdOrName || (n.name && n.name.toLowerCase() === String(npcIdOrName).toLowerCase()));
    if (target) {
        if (appState.rosterUI) {
            appState.rosterUI.locationFilter = 'ALL';
            appState.rosterUI.factionFilter = 'ALL';
            if (appState.rosterUI.collapsedGroups) {
                appState.rosterUI.collapsedGroups.clear();
            }
        }
        const searchInput = document.getElementById('roster-search');
        if (searchInput && searchInput.value) {
            searchInput.value = '';
            const clearBtn = document.getElementById('roster-search-clear');
            if (clearBtn) clearBtn.classList.add('hidden');
        }
        const locSel = document.getElementById('roster-filter-location');
        if (locSel) locSel.value = 'ALL';
        const facSel = document.getElementById('roster-filter-faction');
        if (facSel) facSel.value = 'ALL';

        loadNPCFromRoster(target.id);
        setTimeout(() => {
            const card = document.getElementById(`roster-item-${target.id}`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.classList.add('ring-2', 'ring-amber-400');
                setTimeout(() => card.classList.remove('ring-2', 'ring-amber-400'), 2500);
            }
        }, 120);
    }
}

function navigateToQuest(questIdOrTitle) {
    if (!questIdOrTitle) return;
    switchWorldSubtab('quests');
    if (appState.questStatusFilter && appState.questStatusFilter !== 'all') {
        filterQuests('all');
    }
    const target = (appState.quests || []).find(q => q.id === questIdOrTitle || (q.title && q.title.toLowerCase() === String(questIdOrTitle).toLowerCase()));
    if (target) {
        setTimeout(() => {
            const card = document.getElementById(`quest-card-${target.id}`);
            if (card) {
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                card.classList.add('ring-2', 'ring-amber-400');
                setTimeout(() => card.classList.remove('ring-2', 'ring-amber-400'), 2500);
            }
        }, 120);
    }
}

// -----------------------------------------------------------------------------
// LOCATIONS DIRECTORY
// -----------------------------------------------------------------------------
function filterLocations() {
    const qEl = document.getElementById('location-search');
    const typeEl = document.getElementById('location-type-filter');
    const dangerEl = document.getElementById('location-danger-filter');
    if (qEl) appState.locationSearchQuery = qEl.value.trim().toLowerCase();
    if (typeEl) appState.locationTypeFilter = typeEl.value;
    if (dangerEl) appState.locationDangerFilter = dangerEl.value;
    renderLocations();
}

function toggleSecret(locId) {
    appState.revealedSecrets[locId] = !appState.revealedSecrets[locId];
    renderLocations();
}

function renderLocations() {
    const container = document.getElementById('locations-grid');
    if (!container) return;

    let list = appState.locations || [];

    if (appState.locationSearchQuery) {
        const q = appState.locationSearchQuery;
        list = list.filter(l => {
            return (l.name || '').toLowerCase().includes(q) ||
                   (l.summary || '').toLowerCase().includes(q) ||
                   (l.description || '').toLowerCase().includes(q) ||
                   (l.tags || []).some(t => t.toLowerCase().includes(q));
        });
    }

    if (appState.locationTypeFilter && appState.locationTypeFilter !== 'all') {
        list = list.filter(l => l.type === appState.locationTypeFilter);
    }

    if (appState.locationDangerFilter && appState.locationDangerFilter !== 'all') {
        list = list.filter(l => l.danger === appState.locationDangerFilter);
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div class="col-span-full p-8 text-center border border-dashed border-ledger-700 rounded-xl text-slate-500 text-xs italic">
                No locations match your search criteria. Click "+ Add Location" to expand your world.
            </div>`;
        return;
    }

    const dangerBadgeStyles = {
        'Safe': 'bg-emerald-950 text-emerald-300 border-emerald-700/80',
        'Low': 'bg-sky-950 text-sky-300 border-sky-700/80',
        'Moderate': 'bg-amber-950 text-amber-300 border-amber-700/80',
        'Deadly': 'bg-rose-950 text-rose-300 border-rose-700/80'
    };

    container.innerHTML = list.map(loc => {
        const dStyle = dangerBadgeStyles[loc.danger] || 'bg-slate-900 text-slate-300 border-slate-700';
        const isSecretRevealed = !!appState.revealedSecrets[loc.id];

        return `
            <div class="trait-card rounded-xl p-4 flex flex-col justify-between space-y-3 transition">
                
                <!-- Card Header -->
                <div>
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <h3 class="font-display font-bold text-sm text-slate-100 truncate">${escapeHTML(loc.name)}</h3>
                            </div>
                            <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span class="text-[10px] font-mono px-2 py-0.5 rounded-full border ${dStyle} font-semibold">${loc.danger || 'Low'} Danger</span>
                                <span class="text-[10px] text-slate-400 font-mono">${escapeHTML(loc.type || 'Location')}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            <button onclick="broadcastLocation('${loc.id}')" title="Broadcast location handout to player display" class="text-slate-400 hover:text-sky-300 text-xs p-1 transition">
                                📺
                            </button>
                            <button onclick="openAddLocationModal('${loc.id}')" title="Edit location" class="text-slate-400 hover:text-amber-300 text-xs p-1 transition">
                                ✏️
                            </button>
                            <button onclick="deleteLocation('${loc.id}')" title="Delete location" class="text-slate-500 hover:text-rose-400 text-xs p-1 transition">
                                ✕
                            </button>
                        </div>
                    </div>

                    <p class="text-xs text-amber-300/90 font-medium mt-2 leading-relaxed">${escapeHTML(loc.summary || '')}</p>
                    ${loc.description ? `<p class="text-[11px] text-slate-400 mt-1 leading-relaxed">${escapeHTML(loc.description)}</p>` : ''}
                </div>

                <!-- Factions & Notable NPCs -->
                <div class="space-y-1.5 pt-2 border-t border-ledger-800 text-[11px]">
                    ${loc.factions && loc.factions.length > 0 ? `
                        <div>
                            <span class="text-slate-400 font-bold block mb-0.5">Factions:</span>
                            <div class="flex flex-wrap gap-1">
                                ${loc.factions.map(f => `<button type="button" onclick="navigateToFaction('${escapeHTML(f)}')" title="View Faction" class="px-1.5 py-0.5 rounded bg-ledger-950 hover:bg-ledger-800 border border-ledger-700 text-slate-300 font-mono text-[10px] cursor-pointer transition">⚔️ ${escapeHTML(f)}</button>`).join('')}
                            </div>
                        </div>` : ''}

                    ${loc.notableNpcs && loc.notableNpcs.length > 0 ? `
                        <div>
                            <span class="text-slate-400 font-bold block mb-0.5">Notable Figures:</span>
                            <div class="flex flex-wrap gap-1">
                                ${loc.notableNpcs.map(n => `<button type="button" onclick="navigateToNpc('${escapeHTML(n)}')" title="View in NPC Roster" class="px-1.5 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] cursor-pointer transition">👤 ${escapeHTML(n)}</button>`).join('')}
                            </div>
                        </div>` : ''}
                </div>

                <!-- DM Secrets Section -->
                ${loc.secrets ? `
                    <div class="pt-2 border-t border-ledger-800">
                        <div class="flex items-center justify-between gap-1">
                            <span class="text-[10px] uppercase font-bold text-amber-400 flex items-center gap-1">
                                <span>🔒</span> DM Secret
                            </span>
                            <button onclick="toggleSecret('${loc.id}')" class="text-[10px] text-slate-400 hover:text-amber-300 transition">
                                ${isSecretRevealed ? 'Hide' : '👁️ Reveal'}
                            </button>
                        </div>
                        ${isSecretRevealed ? `
                            <div class="mt-1.5 p-2 rounded-lg bg-amber-950/40 border border-amber-600/40 text-[11px] text-amber-200 leading-relaxed font-mono">
                                ${escapeHTML(loc.secrets)}
                            </div>` : ''}
                    </div>` : ''}

                <!-- Tags Footer -->
                ${loc.tags && loc.tags.length > 0 ? `
                    <div class="flex flex-wrap gap-1 pt-1">
                        ${loc.tags.map(t => `<span class="text-[9px] text-slate-500 font-mono">#${escapeHTML(t)}</span>`).join(' ')}
                    </div>` : ''}

            </div>`;
    }).join('');
}

let selectedLocationFactions = new Set();
let selectedLocationNpcs = new Set();

function openAddLocationModal(editLocId = null) {
    selectedLocationFactions = new Set();
    selectedLocationNpcs = new Set();
    const editIdInput = document.getElementById('loc-edit-id');
    if (editIdInput) editIdInput.value = editLocId || '';

    const existingLoc = editLocId ? (appState.locations || []).find(l => l.id === editLocId) : null;
    const titleEl = document.getElementById('loc-modal-title');
    if (titleEl) {
        titleEl.innerText = existingLoc ? `✏️ Edit Location: ${existingLoc.name}` : `🗺️ Add Campaign Location`;
    }

    document.getElementById('loc-name-input').value = existingLoc ? existingLoc.name : '';
    document.getElementById('loc-type-input').value = existingLoc ? (existingLoc.type || 'Settlement') : 'Settlement';
    document.getElementById('loc-danger-input').value = existingLoc ? (existingLoc.danger || 'Low') : 'Low';
    document.getElementById('loc-summary-input').value = existingLoc ? (existingLoc.summary || '') : '';
    document.getElementById('loc-desc-input').value = existingLoc ? (existingLoc.description || '') : '';
    document.getElementById('loc-secrets-input').value = existingLoc ? (existingLoc.secrets || '') : '';

    if (existingLoc) {
        (existingLoc.factions || []).forEach(f => selectedLocationFactions.add(f));
        (existingLoc.notableNpcs || []).forEach(n => selectedLocationNpcs.add(n));
    }

    renderLocationFactionsSelector();
    renderLocationNpcsSelector();

    openModal('add-location-modal');
}

function renderLocationFactionsSelector(filter = '') {
    const container = document.getElementById('loc-factions-selector');
    if (!container) return;
    const allFactions = new Set();
    (appState.factions || []).forEach(f => { if (f.name) allFactions.add(f.name); });
    selectedLocationFactions.forEach(f => allFactions.add(f));

    const list = Array.from(allFactions).sort().filter(f => !filter || f.toLowerCase().includes(filter.toLowerCase()));
    if (list.length === 0) {
        container.innerHTML = `<span class="text-[10px] text-slate-500 italic p-1">No factions match. Press Enter to add.</span>`;
        return;
    }

    container.innerHTML = list.map(f => {
        const isSel = selectedLocationFactions.has(f);
        return `
            <button type="button" onclick="toggleLocationFaction('${escapeHTML(f)}')" class="px-2 py-0.5 rounded-full border text-[11px] font-medium transition ${isSel ? 'bg-amber-500 text-ledger-950 border-amber-400 font-bold shadow' : 'bg-ledger-900 border-ledger-700 text-slate-300 hover:text-white'}">
                ${isSel ? '✓ ' : '+ '}${escapeHTML(f)}
            </button>
        `;
    }).join('');
}

function toggleLocationFaction(facName) {
    if (selectedLocationFactions.has(facName)) {
        selectedLocationFactions.delete(facName);
    } else {
        selectedLocationFactions.add(facName);
    }
    const searchVal = document.getElementById('loc-factions-search')?.value.trim() || '';
    renderLocationFactionsSelector(searchVal);
}

function filterLocationFactionOptions() {
    const val = document.getElementById('loc-factions-search')?.value.trim() || '';
    renderLocationFactionsSelector(val);
}

function onLocationFactionSearchKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = document.getElementById('loc-factions-search');
        const val = input ? input.value.trim() : '';
        if (val) {
            selectedLocationFactions.add(val);
            input.value = '';
            renderLocationFactionsSelector();
        }
    }
}

function renderLocationNpcsSelector(filter = '') {
    const container = document.getElementById('loc-npcs-selector');
    if (!container) return;
    const allNpcs = new Set();
    (appState.roster || []).forEach(n => { if (n.name) allNpcs.add(n.name); });
    selectedLocationNpcs.forEach(n => allNpcs.add(n));

    const list = Array.from(allNpcs).sort().filter(n => !filter || n.toLowerCase().includes(filter.toLowerCase()));
    if (list.length === 0) {
        container.innerHTML = `<span class="text-[10px] text-slate-500 italic p-1">No NPCs match. Press Enter to add.</span>`;
        return;
    }

    container.innerHTML = list.map(n => {
        const isSel = selectedLocationNpcs.has(n);
        return `
            <button type="button" onclick="toggleLocationNpc('${escapeHTML(n)}')" class="px-2 py-0.5 rounded-full border text-[11px] font-medium transition ${isSel ? 'bg-sky-500 text-ledger-950 border-sky-400 font-bold shadow' : 'bg-ledger-900 border-ledger-700 text-slate-300 hover:text-white'}">
                ${isSel ? '✓ ' : '+ '}${escapeHTML(n)}
            </button>
        `;
    }).join('');
}

function toggleLocationNpc(npcName) {
    if (selectedLocationNpcs.has(npcName)) {
        selectedLocationNpcs.delete(npcName);
    } else {
        selectedLocationNpcs.add(npcName);
    }
    const searchVal = document.getElementById('loc-npcs-search')?.value.trim() || '';
    renderLocationNpcsSelector(searchVal);
}

function filterLocationNpcOptions() {
    const val = document.getElementById('loc-npcs-search')?.value.trim() || '';
    renderLocationNpcsSelector(val);
}

function onLocationNpcSearchKeydown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = document.getElementById('loc-npcs-search');
        const val = input ? input.value.trim() : '';
        if (val) {
            selectedLocationNpcs.add(val);
            input.value = '';
            renderLocationNpcsSelector();
        }
    }
}

async function saveLocationFromModal() {
    const name = document.getElementById('loc-name-input')?.value.trim();
    const summary = document.getElementById('loc-summary-input')?.value.trim();
    if (!name || !summary) {
        showToast("Location Name and Summary are required.", "warning");
        return;
    }

    const editId = document.getElementById('loc-edit-id')?.value.trim() || null;
    const notableNpcs = Array.from(selectedLocationNpcs);

    const locObj = {
        name: name,
        type: document.getElementById('loc-type-input')?.value || 'Settlement',
        danger: document.getElementById('loc-danger-input')?.value || 'Low',
        summary: summary,
        description: document.getElementById('loc-desc-input')?.value.trim() || '',
        factions: Array.from(selectedLocationFactions),
        notableNpcs: notableNpcs,
        secrets: document.getElementById('loc-secrets-input')?.value.trim() || '',
        tags: [document.getElementById('loc-type-input')?.value || 'Location']
    };
    if (editId) locObj.id = editId;

    // Immediately sync notable figures with Roster NPCs
    syncLocationNpcsToRoster(name, notableNpcs);

    try {
        const res = await fetch('/api/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(locObj)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.locations) appState.locations = data.locations;
            if (data.roster) {
                appState.roster = data.roster;
                renderRoster();
            }
            closeModal('add-location-modal');
            showToast(`🗺️ Saved location: ${name}!`, "success");
            renderLocations();
            populateTopFilterDropdowns();
        }
    } catch (e) {
        showToast("Error saving location.", "error");
    }
}

async function deleteLocation(id) {
    if (!confirm("Delete this location?")) return;
    const locToDelete = (appState.locations || []).find(l => l.id === id);
    const locName = locToDelete ? locToDelete.name : null;

    try {
        const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.locations) appState.locations = data.locations;
            if (locName) {
                // Clear location from any roster NPCs that were tied to it
                const targetLower = locName.trim().toLowerCase();
                (appState.roster || []).forEach(npc => {
                    if (npc.location && npc.location.trim().toLowerCase() === targetLower) {
                        npc.location = '';
                    }
                });
                if (appState.currentNPC && appState.currentNPC.location && appState.currentNPC.location.trim().toLowerCase() === targetLower) {
                    appState.currentNPC.location = '';
                    const locP = document.getElementById('npc-location');
                    if (locP) locP.innerText = '';
                    populateNpcLocationOptions('');
                }
                renderRoster();
            }
            showToast("Location deleted.", "info");
            renderLocations();
            populateTopFilterDropdowns();
        }
    } catch (e) {
        showToast("Error deleting location.", "error");
    }
}

// -----------------------------------------------------------------------------
// FACTIONS & INTERACTIVE TENSION CLOCKS
// -----------------------------------------------------------------------------
function renderFactions() {
    const container = document.getElementById('factions-list');
    if (!container) return;

    const list = appState.factions || [];
    if (list.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center border border-dashed border-ledger-700 rounded-xl text-slate-500 text-xs italic">
                No factions recorded. Click "+ Add Faction" to begin tracking political powers.
            </div>`;
        return;
    }

    const repStyles = {
        'Allied': 'bg-emerald-950 text-emerald-300 border-emerald-600',
        'Friendly': 'bg-teal-950 text-teal-300 border-teal-600',
        'Neutral': 'bg-slate-900 text-slate-300 border-slate-700',
        'Suspicious': 'bg-amber-950 text-amber-300 border-amber-600',
        'Hostile': 'bg-rose-950 text-rose-300 border-rose-600'
    };

    container.innerHTML = list.map(fac => {
        const repScore = fac.reputationScore !== undefined ? fac.reputationScore : 0;
        const repText = fac.reputation || 'Neutral';
        const repStyle = repStyles[repText] || 'bg-slate-900 text-slate-300 border-slate-700';

        return `
            <div id="faction-card-${fac.id}" class="trait-card rounded-xl p-5 space-y-4">
                
                <!-- Faction Header -->
                <div class="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <h3 class="font-display font-bold text-base text-amber-300">${escapeHTML(fac.name)}</h3>
                            <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-ledger-950 border border-ledger-700 text-slate-300 font-semibold">${fac.influence || 'Regional'} Influence</span>
                        </div>
                        <p class="text-xs text-slate-400 mt-0.5">
                            <span class="text-slate-300 font-medium">Leader:</span> ${escapeHTML(fac.leader || 'Unknown')} 
                            ${fac.headquarters ? `• <span class="text-slate-300 font-medium">HQ:</span> ${escapeHTML(fac.headquarters)}` : ''}
                        </p>
                    </div>

                    <!-- Interactive Party Reputation Widget -->
                    <div class="flex items-center gap-2 bg-ledger-950 p-1.5 rounded-lg border border-ledger-800">
                        <span class="text-[10px] text-slate-400 uppercase font-mono mr-1">Party Standing:</span>
                        <button onclick="adjustFactionReputation('${fac.id}', -1)" title="Shift standing down" class="w-6 h-6 rounded bg-ledger-900 hover:bg-rose-900 text-slate-300 hover:text-white border border-ledger-700 text-xs font-bold transition flex items-center justify-center">
                            –
                        </button>
                        <span class="px-2 py-0.5 rounded border text-xs font-bold font-mono ${repStyle}">
                            ${repText} (${repScore >= 0 ? '+' : ''}${repScore})
                        </span>
                        <button onclick="adjustFactionReputation('${fac.id}', 1)" title="Shift standing up" class="w-6 h-6 rounded bg-ledger-900 hover:bg-emerald-900 text-slate-300 hover:text-white border border-ledger-700 text-xs font-bold transition flex items-center justify-center">
                            +
                        </button>
                        <button onclick="deleteFaction('${fac.id}')" title="Delete faction" class="text-slate-500 hover:text-rose-400 p-1 text-xs ml-1">
                            ✕
                        </button>
                    </div>
                </div>

                <!-- Goals & Lore -->
                <div class="text-xs text-slate-300 space-y-1.5 bg-ledger-950/40 p-3 rounded-lg border border-ledger-800/80">
                    <div><span class="font-bold text-amber-400/90">Goals:</span> <span class="leading-relaxed">${escapeHTML(fac.goals || 'None specified')}</span></div>
                    ${fac.description ? `<div><span class="font-bold text-slate-400">Lore:</span> <span class="text-slate-300 italic">${escapeHTML(fac.description)}</span></div>` : ''}
                    <div class="flex items-center gap-3 pt-1 text-[11px] flex-wrap">
                        ${fac.allies && fac.allies.length > 0 ? `<div><span class="font-bold text-emerald-400">Allies:</span> <span class="text-slate-300">${fac.allies.join(', ')}</span></div>` : ''}
                        ${fac.rivals && fac.rivals.length > 0 ? `<div><span class="font-bold text-rose-400">Rivals:</span> <span class="text-slate-300">${fac.rivals.join(', ')}</span></div>` : ''}
                    </div>
                </div>

                <!-- Interactive Tension Clocks -->
                <div class="space-y-2 pt-1">
                    <div class="flex items-center justify-between gap-2">
                        <span class="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
                            <span>⏳</span> Tension & Threat Clocks
                        </span>
                        <button onclick="openAddClockModal('${fac.id}')" class="px-2 py-0.5 rounded bg-ledger-900 hover:bg-ledger-800 text-slate-300 text-[11px] border border-ledger-700 font-semibold transition">
                            + Add Clock
                        </button>
                    </div>

                    ${fac.clocks && fac.clocks.length > 0 ? `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            ${fac.clocks.map(clk => {
                                const total = clk.totalTicks || 4;
                                const cur = clk.currentTicks || 0;
                                const isFull = cur >= total;

                                return `
                                    <div class="bg-ledger-950/80 p-3 rounded-xl border ${isFull ? 'border-rose-500/70 shadow-lg shadow-rose-950/50' : 'border-ledger-800'} space-y-2 relative">
                                        <div class="flex items-start justify-between gap-2">
                                            <div class="flex-1 min-w-0">
                                                <h4 class="font-bold text-xs ${isFull ? 'text-rose-400' : 'text-slate-100'} truncate">${escapeHTML(clk.title)}</h4>
                                                <p class="text-[10px] text-slate-400 leading-tight mt-0.5 truncate">${escapeHTML(clk.outcome || '')}</p>
                                            </div>
                                            <button onclick="deleteClock('${fac.id}', '${clk.id}')" title="Remove clock" class="text-slate-500 hover:text-rose-400 text-[10px] p-0.5">✕</button>
                                        </div>

                                        <!-- Interactive Segmented Clock Dial -->
                                        <div class="flex items-center justify-between gap-3 pt-1">
                                            <div class="flex items-center gap-1.5 flex-1">
                                                ${Array.from({ length: total }).map((_, idx) => {
                                                    const isFilled = idx < cur;
                                                    let segColor = isFilled ? (isFull ? 'bg-rose-500 border-rose-400' : 'bg-amber-500 border-amber-400') : 'bg-ledger-900 border-ledger-700 hover:border-amber-400';
                                                    return `
                                                        <button onclick="tickClockTo('${fac.id}', '${clk.id}', ${idx + 1 === cur ? idx : idx + 1})" title="Set ticks to ${idx + 1}" class="flex-1 h-5 rounded border ${segColor} transition active:scale-95"></button>
                                                    `;
                                                }).join('')}
                                            </div>

                                            <!-- Clock Controls -->
                                            <div class="flex items-center gap-1 font-mono text-xs">
                                                <button onclick="tickClock('${fac.id}', '${clk.id}', -1)" title="Rewind tick" class="w-6 h-6 rounded bg-ledger-900 hover:bg-slate-800 text-slate-300 border border-ledger-700 flex items-center justify-center font-bold">–</button>
                                                <span class="px-1.5 font-bold ${isFull ? 'text-rose-400 font-extrabold' : 'text-amber-400'}">${cur}/${total}</span>
                                                <button onclick="tickClock('${fac.id}', '${clk.id}', 1)" title="Advance tick" class="w-6 h-6 rounded bg-ledger-900 hover:bg-amber-500 hover:text-ledger-950 text-slate-300 border border-ledger-700 flex items-center justify-center font-bold">+</button>
                                            </div>
                                        </div>

                                        ${isFull ? `
                                            <div class="mt-1 p-1.5 rounded-lg bg-rose-950/90 border border-rose-600 text-rose-200 text-[10px] font-bold text-center animate-pulse">
                                                ⚠️ THREAT TRIGGERED: ${escapeHTML(clk.outcome || 'Event Completed!')}
                                            </div>
                                        ` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    ` : `
                        <div class="p-3 text-center border border-dashed border-ledger-800 rounded-lg text-slate-500 text-[11px] italic">
                            No active tension clocks. Add a clock to track impending heists, rituals, or rival moves.
                        </div>
                    `}
                </div>

            </div>`;
    }).join('');
}

async function adjustFactionReputation(factionId, delta) {
    const fac = (appState.factions || []).find(f => f.id === factionId);
    if (!fac) return;

    const cur = fac.reputationScore !== undefined ? fac.reputationScore : 0;
    fac.reputationScore = Math.max(-2, Math.min(2, cur + delta));

    try {
        const res = await fetch('/api/factions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fac)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.factions) appState.factions = data.factions;
            renderFactions();
        }
    } catch (e) {}
}

async function tickClock(factionId, clockId, delta) {
    try {
        const res = await fetch(`/api/factions/${factionId}/clocks/${clockId}/tick`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delta: delta })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.factions) appState.factions = data.factions;
            if (data.isFull) {
                showToast(`⚠️ TENSION CLOCK TRIGGERED: ${data.clock ? data.clock.outcome : 'Outcome imminent!'}`, "error");
            }
            renderFactions();
        }
    } catch (e) {
        showToast("Error updating tension clock.", "error");
    }
}

async function tickClockTo(factionId, clockId, targetTicks) {
    const fac = (appState.factions || []).find(f => f.id === factionId);
    if (!fac) return;
    const clk = (fac.clocks || []).find(c => c.id === clockId);
    if (!clk) return;

    const delta = targetTicks - (clk.currentTicks || 0);
    if (delta !== 0) {
        await tickClock(factionId, clockId, delta);
    }
}

function openAddClockModal(preselectedFactionId = null) {
    const sel = document.getElementById('clock-faction-select');
    if (sel) {
        sel.innerHTML = (appState.factions || []).map(f => `
            <option value="${f.id}" ${f.id === preselectedFactionId ? 'selected' : ''}>${escapeHTML(f.name)}</option>
        `).join('');
    }
    document.getElementById('clock-title-input').value = '';
    document.getElementById('clock-ticks-select').value = '6';
    document.getElementById('clock-outcome-input').value = '';

    openModal('add-clock-modal');
}

async function saveClockFromModal() {
    const facId = document.getElementById('clock-faction-select')?.value;
    const title = document.getElementById('clock-title-input')?.value.trim();
    const totalTicks = parseInt(document.getElementById('clock-ticks-select')?.value) || 6;
    const outcome = document.getElementById('clock-outcome-input')?.value.trim();

    if (!facId || !title) {
        showToast("Faction and Clock Title are required.", "warning");
        return;
    }

    const clockObj = {
        title: title,
        totalTicks: totalTicks,
        currentTicks: 0,
        outcome: outcome,
        active: true
    };

    try {
        const res = await fetch(`/api/factions/${facId}/clocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(clockObj)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.factions) appState.factions = data.factions;
            closeModal('add-clock-modal');
            showToast(`⏳ Started Tension Clock: ${title}!`, "success");
            renderFactions();
        }
    } catch (e) {
        showToast("Error creating clock.", "error");
    }
}

async function deleteClock(factionId, clockId) {
    if (!confirm("Remove this tension clock?")) return;
    try {
        const res = await fetch(`/api/factions/${factionId}/clocks/${clockId}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.factions) appState.factions = data.factions;
            showToast("Tension clock removed.", "info");
            renderFactions();
        }
    } catch (e) {
        showToast("Error deleting clock.", "error");
    }
}

function openAddFactionModal() {
    document.getElementById('fac-name-input').value = '';
    document.getElementById('fac-leader-input').value = '';
    document.getElementById('fac-influence-input').value = 'Regional';
    document.getElementById('fac-rep-input').value = '0';
    document.getElementById('fac-hq-input').value = '';
    document.getElementById('fac-goals-input').value = '';
    document.getElementById('fac-allies-input').value = '';
    document.getElementById('fac-rivals-input').value = '';
    document.getElementById('fac-desc-input').value = '';

    openModal('add-faction-modal');
}

async function saveFactionFromModal() {
    const name = document.getElementById('fac-name-input')?.value.trim();
    if (!name) {
        showToast("Faction name is required.", "warning");
        return;
    }

    const parseComma = (text) => (text || '').split(',').map(s => s.trim()).filter(Boolean);

    const factionObj = {
        name: name,
        leader: document.getElementById('fac-leader-input')?.value.trim() || '',
        influence: document.getElementById('fac-influence-input')?.value || 'Regional',
        reputationScore: parseInt(document.getElementById('fac-rep-input')?.value) || 0,
        headquarters: document.getElementById('fac-hq-input')?.value.trim() || '',
        goals: document.getElementById('fac-goals-input')?.value.trim() || '',
        allies: parseComma(document.getElementById('fac-allies-input')?.value),
        rivals: parseComma(document.getElementById('fac-rivals-input')?.value),
        description: document.getElementById('fac-desc-input')?.value.trim() || '',
        clocks: []
    };

    try {
        const res = await fetch('/api/factions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(factionObj)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.factions) appState.factions = data.factions;
            closeModal('add-faction-modal');
            showToast(`⚖️ Saved faction: ${name}!`, "success");
            renderFactions();
            populateTopFilterDropdowns();
        }
    } catch (e) {
        showToast("Error saving faction.", "error");
    }
}

async function deleteFaction(id) {
    if (!confirm("Delete this faction and all its clocks?")) return;
    try {
        const res = await fetch(`/api/factions/${id}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.factions) appState.factions = data.factions;
            showToast("Faction deleted.", "info");
            renderFactions();
            populateTopFilterDropdowns();
        }
    } catch (e) {
        showToast("Error deleting faction.", "error");
    }
}

// -----------------------------------------------------------------------------
// QUESTS & RUMORS BOARD
// -----------------------------------------------------------------------------
function filterQuests(status) {
    appState.questStatusFilter = status;
    document.querySelectorAll('.quest-filter-btn').forEach(btn => {
        btn.classList.remove('bg-amber-500', 'text-ledger-950', 'font-bold');
        btn.classList.add('bg-ledger-900', 'text-slate-400');
    });

    const activeBtn = document.getElementById(`quest-filter-${status.toLowerCase()}`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-ledger-900', 'text-slate-400');
        activeBtn.classList.add('bg-amber-500', 'text-ledger-950', 'font-bold');
    }

    renderQuests();
}

function renderQuests() {
    const container = document.getElementById('quests-grid');
    if (!container) return;

    let list = appState.quests || [];
    if (appState.questStatusFilter && appState.questStatusFilter !== 'all') {
        list = list.filter(q => q.status === appState.questStatusFilter);
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div class="col-span-full p-8 text-center border border-dashed border-ledger-700 rounded-xl text-slate-500 text-xs italic">
                No quests match this filter. Click "+ Add Quest" to log campaign adventures.
            </div>`;
    } else {
        const statusBadges = {
            'Active': 'bg-amber-950 text-amber-300 border-amber-600',
            'Completed': 'bg-emerald-950 text-emerald-300 border-emerald-600',
            'Failed': 'bg-rose-950 text-rose-300 border-rose-600'
        };

        container.innerHTML = list.map(q => {
            const objs = q.objectives || [];
            const doneCount = objs.filter(o => o.completed).length;
            const pct = objs.length > 0 ? Math.round((doneCount / objs.length) * 100) : 0;
            const sStyle = statusBadges[q.status] || 'bg-slate-900 text-slate-300 border-slate-700';

            return `
                <div id="quest-card-${q.id}" class="trait-card rounded-xl p-4 flex flex-col justify-between space-y-3 transition">
                    
                    <!-- Header -->
                    <div>
                        <div class="flex items-start justify-between gap-2">
                            <div class="flex-1 min-w-0">
                                <h3 class="font-display font-bold text-sm text-amber-300 truncate">${escapeHTML(q.title)}</h3>
                                <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-400 flex-wrap">
                                    ${q.giver ? `<span>Giver: <span class="text-slate-200">${escapeHTML(q.giver)}</span></span>` : ''}
                                    ${q.location ? `<span>• Loc: <span class="text-slate-200">${escapeHTML(q.location)}</span></span>` : ''}
                                </div>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <button onclick="broadcastQuest('${q.id}')" title="Broadcast quest bounty to player screen" class="text-slate-400 hover:text-sky-300 text-xs p-1">📺</button>
                                <button onclick="openAddQuestModal('${q.id}')" title="Edit quest details" class="text-slate-400 hover:text-amber-300 text-xs p-1">✏️</button>
                                <select onchange="changeQuestStatus('${q.id}', this.value)" class="text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${sStyle} bg-transparent cursor-pointer">
                                    <option value="Active" ${q.status === 'Active' ? 'selected' : ''}>Active</option>
                                    <option value="Completed" ${q.status === 'Completed' ? 'selected' : ''}>Completed</option>
                                    <option value="Failed" ${q.status === 'Failed' ? 'selected' : ''}>Failed</option>
                                </select>
                                <button onclick="deleteQuest('${q.id}')" title="Delete quest" class="text-slate-500 hover:text-rose-400 text-xs p-1">✕</button>
                            </div>
                        </div>

                        ${q.reward ? `
                            <div class="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] font-semibold font-mono">
                                <span>🎁</span> ${escapeHTML(q.reward)}
                            </div>
                        ` : ''}

                        <p class="text-xs text-slate-300 mt-2 leading-relaxed">${escapeHTML(q.summary || '')}</p>
                    </div>

                    <!-- Checklist Objectives -->
                    <div class="space-y-2 pt-2 border-t border-ledger-800">
                        <div class="flex items-center justify-between text-[11px] font-mono">
                            <span class="text-slate-400 font-bold uppercase">Objectives</span>
                            <span class="${doneCount === objs.length && objs.length > 0 ? 'text-emerald-400 font-bold' : 'text-amber-400'}">${doneCount} / ${objs.length} Done (${pct}%)</span>
                        </div>

                        <!-- Progress Bar -->
                        <div class="w-full h-1.5 bg-ledger-950 rounded-full overflow-hidden border border-ledger-800">
                            <div class="h-full ${pct === 100 ? 'bg-emerald-500' : 'bg-amber-500'} transition-all duration-300" style="width: ${pct}%"></div>
                        </div>

                        <!-- Objectives Checkboxes -->
                        <div class="space-y-1.5 pt-1 max-h-48 overflow-y-auto pr-1">
                            ${objs.map(obj => `
                                <label class="flex items-start gap-2.5 p-2 rounded-lg bg-ledger-950/70 border border-ledger-800/80 hover:border-ledger-700 cursor-pointer transition select-none">
                                    <input type="checkbox" ${obj.completed ? 'checked' : ''} onchange="toggleQuestObjective('${q.id}', '${obj.id}')" class="mt-0.5 rounded border-ledger-700 text-amber-500 focus:ring-amber-500/30 cursor-pointer">
                                    <span class="text-xs ${obj.completed ? 'line-through text-slate-500' : 'text-slate-200'} leading-tight flex-1">${escapeHTML(obj.text)}</span>
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    ${q.notes ? `
                        <div class="pt-2 border-t border-ledger-800 text-[10px] text-slate-400 italic">
                            Note: ${escapeHTML(q.notes)}
                        </div>` : ''}

                </div>`;
        }).join('');
    }

    renderRumors();
}

async function toggleQuestObjective(questId, objId) {
    try {
        const res = await fetch(`/api/quests/${questId}/objectives/${objId}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        if (res.ok) {
            const data = await res.json();
            if (data.quest) {
                const idx = (appState.quests || []).findIndex(q => q.id === questId);
                if (idx !== -1) appState.quests[idx] = data.quest;
                if (data.quest.status === 'Completed') {
                    showToast(`🎉 Quest Complete: ${data.quest.title}!`, "success");
                }
            }
            renderQuests();
        }
    } catch (e) {
        showToast("Error updating objective.", "error");
    }
}

async function changeQuestStatus(questId, newStatus) {
    const q = (appState.quests || []).find(q => q.id === questId);
    if (!q) return;

    q.status = newStatus;
    try {
        const res = await fetch('/api/quests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(q)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.quests) appState.quests = data.quests;
            renderQuests();
        }
    } catch (e) {}
}

function populateQuestGiverOptions(selectedGiver = '') {
    const select = document.getElementById('quest-giver-select');
    const customInput = document.getElementById('quest-giver-input');
    if (!select) return;

    const roster = appState.roster || [];
    let html = `<option value="">-- None / Unknown --</option>`;
    if (roster.length > 0) {
        html += `<optgroup label="Campaign NPC Roster">`;
        roster.forEach(n => {
            const label = n.name + (n.role ? ` (${n.role})` : (n.species ? ` (${n.species})` : ''));
            const isSel = (n.name && selectedGiver && n.name.toLowerCase() === selectedGiver.toLowerCase());
            html += `<option value="${escapeHTML(n.name)}" ${isSel ? 'selected' : ''}>${escapeHTML(label)}</option>`;
        });
        html += `</optgroup>`;
    }
    html += `<option value="__custom__">✏️ Custom Quest Giver...</option>`;
    select.innerHTML = html;

    const match = roster.find(n => n.name && selectedGiver && n.name.toLowerCase() === selectedGiver.toLowerCase());
    if (selectedGiver && !match) {
        select.value = '__custom__';
        if (customInput) {
            customInput.classList.remove('hidden');
            customInput.value = selectedGiver;
        }
    } else {
        if (customInput) {
            customInput.classList.add('hidden');
            customInput.value = match ? match.name : '';
        }
    }
}

function onQuestGiverSelectChange() {
    const select = document.getElementById('quest-giver-select');
    const customInput = document.getElementById('quest-giver-input');
    if (!select || !customInput) return;
    if (select.value === '__custom__') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
        customInput.value = select.value;
    }
}

function populateQuestLocationOptions(selectedLocation = '') {
    const select = document.getElementById('quest-location-select');
    const customInput = document.getElementById('quest-location-input');
    if (!select) return;

    const locSet = new Set();
    (appState.locations || []).forEach(l => { if (l.name) locSet.add(l.name); });
    (appState.overworld?.maps || []).forEach(m => {
        (m.pins || []).forEach(p => { if (p.label || p.title) locSet.add(p.label || p.title); });
    });

    const sortedLocs = Array.from(locSet).sort();
    let html = `<option value="">-- None / Wilderness --</option>`;
    if (sortedLocs.length > 0) {
        html += `<optgroup label="Campaign Locations & Landmarks">`;
        sortedLocs.forEach(locName => {
            const isSel = (selectedLocation && locName.toLowerCase() === selectedLocation.toLowerCase());
            html += `<option value="${escapeHTML(locName)}" ${isSel ? 'selected' : ''}>${escapeHTML(locName)}</option>`;
        });
        html += `</optgroup>`;
    }
    html += `<option value="__custom__">✏️ Custom Location...</option>`;
    select.innerHTML = html;

    const match = sortedLocs.find(l => selectedLocation && l.toLowerCase() === selectedLocation.toLowerCase());
    if (selectedLocation && !match) {
        select.value = '__custom__';
        if (customInput) {
            customInput.classList.remove('hidden');
            customInput.value = selectedLocation;
        }
    } else {
        if (customInput) {
            customInput.classList.add('hidden');
            customInput.value = match || '';
        }
    }
}

function onQuestLocationSelectChange() {
    const select = document.getElementById('quest-location-select');
    const customInput = document.getElementById('quest-location-input');
    if (!select || !customInput) return;
    if (select.value === '__custom__') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
        customInput.value = select.value;
    }
}

function openAddQuestModal(editQuestId = null) {
    const editIdInput = document.getElementById('quest-edit-id');
    if (editIdInput) editIdInput.value = editQuestId || '';

    const existingQuest = editQuestId ? (appState.quests || []).find(q => q.id === editQuestId) : null;
    const titleEl = document.getElementById('quest-modal-title');
    if (titleEl) {
        titleEl.innerText = existingQuest ? `✏️ Edit Quest: ${existingQuest.title}` : `📜 Add Campaign Quest`;
    }

    document.getElementById('quest-title-input').value = existingQuest ? existingQuest.title : '';
    populateQuestGiverOptions(existingQuest ? (existingQuest.giver || '') : '');
    populateQuestLocationOptions(existingQuest ? (existingQuest.location || '') : '');
    document.getElementById('quest-reward-input').value = existingQuest ? (existingQuest.reward || '') : '';
    document.getElementById('quest-status-input').value = existingQuest ? (existingQuest.status || 'Active') : 'Active';
    document.getElementById('quest-summary-input').value = existingQuest ? (existingQuest.summary || '') : '';
    
    const objs = existingQuest?.objectives || [];
    document.getElementById('quest-objectives-input').value = objs.map(o => o.text).join('\n');
    document.getElementById('quest-notes-input').value = existingQuest ? (existingQuest.notes || '') : '';

    openModal('add-quest-modal');
}

async function saveQuestFromModal() {
    const title = document.getElementById('quest-title-input')?.value.trim();
    if (!title) {
        showToast("Quest Title is required.", "warning");
        return;
    }

    const editId = document.getElementById('quest-edit-id')?.value.trim() || null;
    const existingQuest = editId ? (appState.quests || []).find(q => q.id === editId) : null;

    const giverSelect = document.getElementById('quest-giver-select');
    const giverCustom = document.getElementById('quest-giver-input');
    const giver = (giverSelect?.value === '__custom__') ? (giverCustom?.value.trim() || '') : (giverSelect?.value || giverCustom?.value.trim() || '');

    const locSelect = document.getElementById('quest-location-select');
    const locCustom = document.getElementById('quest-location-input');
    const location = (locSelect?.value === '__custom__') ? (locCustom?.value.trim() || '') : (locSelect?.value || locCustom?.value.trim() || '');

    const lines = (document.getElementById('quest-objectives-input')?.value || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const existingObjs = existingQuest?.objectives || [];
    const objectives = lines.map((text, i) => {
        const prev = existingObjs.find(o => o.text === text);
        return {
            id: prev ? prev.id : `obj-${i+1}-${Date.now()}`,
            text: text,
            completed: prev ? !!prev.completed : false
        };
    });

    const questObj = {
        title: title,
        giver: giver,
        location: location,
        reward: document.getElementById('quest-reward-input')?.value.trim() || '',
        status: document.getElementById('quest-status-input')?.value || 'Active',
        summary: document.getElementById('quest-summary-input')?.value.trim() || '',
        objectives: objectives,
        notes: document.getElementById('quest-notes-input')?.value.trim() || ''
    };
    if (editId) {
        questObj.id = editId;
    }

    try {
        const res = await fetch('/api/quests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(questObj)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.quests) appState.quests = data.quests;
            closeModal('add-quest-modal');
            showToast(`📜 Saved quest: ${title}!`, "success");
            renderQuests();
        }
    } catch (e) {
        showToast("Error saving quest.", "error");
    }
}

async function deleteQuest(id) {
    if (!confirm("Delete this quest?")) return;
    try {
        const res = await fetch(`/api/quests/${id}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.quests) appState.quests = data.quests;
            showToast("Quest deleted.", "info");
            renderQuests();
        }
    } catch (e) {
        showToast("Error deleting quest.", "error");
    }
}

// -----------------------------------------------------------------------------
// RUMORS CORKBOARD
// -----------------------------------------------------------------------------
function renderRumors() {
    const container = document.getElementById('rumors-grid');
    if (!container) return;

    const list = appState.rumors || [];
    if (list.length === 0) {
        container.innerHTML = `
            <div class="col-span-full p-6 text-center border border-dashed border-ledger-700 rounded-xl text-slate-500 text-xs italic">
                No rumors logged yet. Click "+ Pin Rumor" when the party listens to tavern gossip.
            </div>`;
        return;
    }

    const veracityStyles = {
        'True': 'bg-emerald-950 text-emerald-300 border-emerald-700',
        'False': 'bg-rose-950 text-rose-300 border-rose-700',
        'Exaggerated': 'bg-amber-950 text-amber-300 border-amber-700',
        'Unverified': 'bg-slate-900 text-slate-300 border-slate-700'
    };

    container.innerHTML = list.map(r => {
        const vStyle = veracityStyles[r.veracity] || 'bg-slate-900 text-slate-300 border-slate-700';
        return `
            <div class="trait-card rounded-xl p-3.5 flex flex-col justify-between space-y-2 relative border-amber-500/20 bg-ledger-950/90 shadow-md">
                <div class="space-y-1.5">
                    <div class="flex items-start justify-between gap-1">
                        <span class="text-[9px] font-mono px-1.5 py-0.5 rounded border ${vStyle} font-semibold">${r.veracity || 'Unverified'}</span>
                        <button onclick="deleteRumor('${r.id}')" title="Remove rumor" class="text-slate-500 hover:text-rose-400 text-xs p-0.5">✕</button>
                    </div>
                    <p class="text-xs text-amber-200/90 italic leading-relaxed">“${escapeHTML(r.text)}”</p>
                </div>
                <div class="pt-2 border-t border-ledger-800 text-[10px] text-slate-400 flex items-center justify-between gap-1">
                    <div class="truncate">
                        ${r.source ? `<span class="block text-slate-300 truncate">— ${escapeHTML(r.source)}</span>` : ''}
                        ${r.location ? `<span class="block text-slate-500 truncate">📍 ${escapeHTML(r.location)}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="openAddRumorModal('${r.id}')" title="Edit rumor details" class="p-1 rounded bg-ledger-900 hover:bg-amber-900/60 text-amber-300 border border-ledger-700 text-xs transition">
                            ✏️
                        </button>
                        <button onclick="broadcastRumor('${r.id}')" title="Broadcast rumor to player screen" class="p-1 rounded bg-ledger-900 hover:bg-sky-900 text-sky-400 border border-ledger-700 text-xs transition">
                            📺
                        </button>
                        <button onclick="logRumorToNotes('${r.id}')" title="Pin to Scratchpad notes" class="p-1 rounded bg-ledger-900 hover:bg-ledger-800 text-amber-400 border border-ledger-700 text-xs transition">
                            📝
                        </button>
                    </div>
                </div>
            </div>`;
    }).join('');
}

async function logRumorToNotes(rumorId) {
    const r = (appState.rumors || []).find(r => r.id === rumorId);
    if (!r) return;

    const notePayload = {
        text: `[Rumor / Clue] "${r.text}" — Source: ${r.source || 'Unknown'} (${r.location || 'Unknown location'})`,
        tag: 'clue'
    };

    try {
        const res = await fetch('/api/notes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(notePayload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.notes) appState.notes = data.notes;
            showToast("📝 Logged rumor to Session Scratchpad under #clue!", "success");
        }
    } catch (e) {
        showToast("Error logging rumor to notes.", "error");
    }
}

function populateRumorSourceOptions(selectedSource = '') {
    const select = document.getElementById('rumor-source-select');
    const customInput = document.getElementById('rumor-source-input');
    if (!select) return;

    const names = new Set();
    (appState.roster || []).forEach(n => { if (n.name) names.add(n.name); });
    (appState.locations || []).forEach(loc => {
        (loc.notableNpcs || []).forEach(n => names.add(n));
    });

    const sorted = Array.from(names).sort((a, b) => a.localeCompare(b));
    let html = `<option value="">-- None / Unknown Speaker --</option>`;
    sorted.forEach(n => {
        const isMatch = selectedSource && n.toLowerCase() === selectedSource.toLowerCase();
        html += `<option value="${escapeHTML(n)}" ${isMatch ? 'selected' : ''}>👤 ${escapeHTML(n)}</option>`;
    });
    html += `<option value="__custom__">✏️ Custom Speaker...</option>`;
    select.innerHTML = html;

    const match = sorted.find(n => selectedSource && n.toLowerCase() === selectedSource.toLowerCase());
    if (selectedSource && !match) {
        select.value = '__custom__';
        if (customInput) {
            customInput.classList.remove('hidden');
            customInput.value = selectedSource;
        }
    } else {
        if (customInput) {
            customInput.classList.add('hidden');
            customInput.value = match || '';
        }
    }
}

function onRumorSourceSelectChange() {
    const select = document.getElementById('rumor-source-select');
    const customInput = document.getElementById('rumor-source-input');
    if (!select || !customInput) return;
    if (select.value === '__custom__') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
        customInput.value = select.value;
    }
}

function populateRumorLocationOptions(selectedLoc = '') {
    const select = document.getElementById('rumor-location-select');
    const customInput = document.getElementById('rumor-location-input');
    if (!select) return;

    const locs = new Set();
    (appState.locations || []).forEach(l => { if (l.name) locs.add(l.name); });
    (appState.overworld?.pins || []).forEach(p => {
        const label = p.label || p.title;
        if (label) locs.add(label);
    });
    if (appState.overworld?.maps) {
        appState.overworld.maps.forEach(m => {
            (m.pins || []).forEach(p => {
                const label = p.label || p.title;
                if (label) locs.add(label);
            });
        });
    }

    const sorted = Array.from(locs).sort((a, b) => a.localeCompare(b));
    let html = `<option value="">-- None / Anywhere --</option>`;
    sorted.forEach(l => {
        const isMatch = selectedLoc && l.toLowerCase() === selectedLoc.toLowerCase();
        html += `<option value="${escapeHTML(l)}" ${isMatch ? 'selected' : ''}>📍 ${escapeHTML(l)}</option>`;
    });
    html += `<option value="__custom__">✏️ Custom Location...</option>`;
    select.innerHTML = html;

    const match = sorted.find(l => selectedLoc && l.toLowerCase() === selectedLoc.toLowerCase());
    if (selectedLoc && !match) {
        select.value = '__custom__';
        if (customInput) {
            customInput.classList.remove('hidden');
            customInput.value = selectedLoc;
        }
    } else {
        if (customInput) {
            customInput.classList.add('hidden');
            customInput.value = match || '';
        }
    }
}

function onRumorLocationSelectChange() {
    const select = document.getElementById('rumor-location-select');
    const customInput = document.getElementById('rumor-location-input');
    if (!select || !customInput) return;
    if (select.value === '__custom__') {
        customInput.classList.remove('hidden');
        customInput.focus();
    } else {
        customInput.classList.add('hidden');
        customInput.value = select.value;
    }
}

function openAddRumorModal(editRumorId = null) {
    const editIdInput = document.getElementById('rumor-edit-id');
    if (editIdInput) editIdInput.value = editRumorId || '';

    const existingRumor = editRumorId ? (appState.rumors || []).find(r => r.id === editRumorId) : null;
    const titleEl = document.getElementById('rumor-modal-title');
    if (titleEl) {
        titleEl.innerText = existingRumor ? `✏️ Edit Tavern Rumor` : `📜 Pin Tavern Rumor`;
    }

    document.getElementById('rumor-text-input').value = existingRumor ? existingRumor.text : '';
    populateRumorSourceOptions(existingRumor ? (existingRumor.source || '') : '');
    populateRumorLocationOptions(existingRumor ? (existingRumor.location || '') : '');
    document.getElementById('rumor-veracity-input').value = existingRumor ? (existingRumor.veracity || 'Unverified') : 'Unverified';

    openModal('add-rumor-modal');
}

async function saveRumorFromModal() {
    const text = document.getElementById('rumor-text-input')?.value.trim();
    if (!text) {
        showToast("Rumor text is required.", "warning");
        return;
    }

    const editId = document.getElementById('rumor-edit-id')?.value.trim() || null;

    const srcSelect = document.getElementById('rumor-source-select');
    const srcCustom = document.getElementById('rumor-source-input');
    const source = (srcSelect?.value === '__custom__') ? (srcCustom?.value.trim() || '') : (srcSelect?.value || srcCustom?.value.trim() || '');

    const locSelect = document.getElementById('rumor-location-select');
    const locCustom = document.getElementById('rumor-location-input');
    const location = (locSelect?.value === '__custom__') ? (locCustom?.value.trim() || '') : (locSelect?.value || locCustom?.value.trim() || '');

    const rumorObj = {
        text: text,
        source: source,
        location: location,
        veracity: document.getElementById('rumor-veracity-input')?.value || 'Unverified',
        active: true
    };
    if (editId) {
        rumorObj.id = editId;
    }

    try {
        const res = await fetch('/api/rumors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rumorObj)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.rumors) appState.rumors = data.rumors;
            closeModal('add-rumor-modal');
            showToast(editId ? "📜 Updated tavern rumor!" : "📜 Pinned new tavern rumor!", "success");
            renderRumors();
        }
    } catch (e) {
        showToast("Error saving rumor.", "error");
    }
}

async function deleteRumor(id) {
    try {
        const res = await fetch(`/api/rumors/${id}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.rumors) appState.rumors = data.rumors;
            showToast("Rumor removed.", "info");
            renderRumors();
        }
    } catch (e) {
        showToast("Error removing rumor.", "error");
    }
}

// -----------------------------------------------------------------------------
// SECRETS & CLUES CONTROLLER (LAZY DM ENGINE)
// -----------------------------------------------------------------------------

function getSecretCategoryBadge(cat) {
    const c = (cat || 'Plot').toLowerCase();
    switch (c) {
        case 'plot':
            return 'bg-amber-950/80 text-amber-300 border-amber-600/60';
        case 'lore':
            return 'bg-sky-950/80 text-sky-300 border-sky-600/60';
        case 'npc':
            return 'bg-purple-950/80 text-purple-300 border-purple-600/60';
        case 'location':
            return 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60';
        case 'faction':
            return 'bg-indigo-950/80 text-indigo-300 border-indigo-600/60';
        case 'danger':
            return 'bg-rose-950/80 text-rose-300 border-rose-600/60';
        default:
            return 'bg-slate-800 text-slate-300 border-slate-700';
    }
}

async function renderSecrets() {
    if (!appState.secrets || appState.secrets.length === 0) {
        try {
            const res = await fetch('/api/secrets');
            if (res.ok) {
                appState.secrets = await res.json();
            }
        } catch (e) {
            console.error("Error fetching secrets:", e);
        }
    }

    const secrets = appState.secrets || [];
    const container = document.getElementById('secrets-grid');
    if (!container) return;

    // Update stats counters
    const unrevealedCount = secrets.filter(s => s.status === 'unrevealed').length;
    const revealedCount = secrets.filter(s => s.status === 'revealed').length;
    const totalCount = secrets.length;
    const pct = totalCount > 0 ? Math.round((revealedCount / totalCount) * 100) : 0;

    const unrevEl = document.getElementById('secrets-stat-unrevealed');
    const revEl = document.getElementById('secrets-stat-revealed');
    const totEl = document.getElementById('secrets-stat-total');
    const barEl = document.getElementById('secrets-progress-bar');
    const pctEl = document.getElementById('secrets-progress-percent');
    const navBadge = document.getElementById('secrets-nav-badge');

    if (unrevEl) unrevEl.textContent = unrevealedCount;
    if (revEl) revEl.textContent = revealedCount;
    if (totEl) totEl.textContent = totalCount;
    if (barEl) barEl.style.width = `${pct}%`;
    if (pctEl) pctEl.textContent = `${pct}%`;
    if (navBadge) navBadge.textContent = `${unrevealedCount} left`;

    // Filter list
    let list = secrets;
    if (appState.secretStatusFilter === 'unrevealed') {
        list = list.filter(s => s.status === 'unrevealed');
    } else if (appState.secretStatusFilter === 'revealed') {
        list = list.filter(s => s.status === 'revealed');
    }

    if (appState.secretCategoryFilter && appState.secretCategoryFilter !== 'all') {
        list = list.filter(s => (s.category || '').toLowerCase() === appState.secretCategoryFilter.toLowerCase());
    }

    if (appState.secretSearchQuery) {
        const q = appState.secretSearchQuery.toLowerCase();
        list = list.filter(s => 
            (s.text || '').toLowerCase().includes(q) ||
            (s.tiedNpc || '').toLowerCase().includes(q) ||
            (s.tiedLocation || '').toLowerCase().includes(q) ||
            (s.tiedFaction || '').toLowerCase().includes(q) ||
            (s.sessionNotes || '').toLowerCase().includes(q)
        );
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-12 px-4 text-center border-2 border-dashed border-ledger-800 rounded-2xl space-y-2 text-slate-500 text-xs">
                <span class="text-3xl block">🔍</span>
                <p class="font-semibold text-slate-400">No secrets found matching filters.</p>
                <p>Click <strong class="text-amber-400">+ Add Secret</strong> or <strong class="text-amber-400">+5 Prep Prompts</strong> to prepare revelations for this session.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = list.map(sec => {
        const isRevealed = sec.status === 'revealed';
        const badgeClass = getSecretCategoryBadge(sec.category);
        const tags = [
            sec.tiedLocation ? `<span class="px-1.5 py-0.5 rounded bg-ledger-950 border border-ledger-700/80 text-emerald-300 text-[10px]">📍 ${escapeHTML(sec.tiedLocation)}</span>` : '',
            sec.tiedNpc ? `<span class="px-1.5 py-0.5 rounded bg-ledger-950 border border-ledger-700/80 text-purple-300 text-[10px]">👤 ${escapeHTML(sec.tiedNpc)}</span>` : '',
            sec.tiedFaction ? `<span class="px-1.5 py-0.5 rounded bg-ledger-950 border border-ledger-700/80 text-indigo-300 text-[10px]">⚖️ ${escapeHTML(sec.tiedFaction)}</span>` : ''
        ].filter(Boolean).join('');

        return `
            <div class="rounded-2xl p-4 flex flex-col justify-between space-y-3 transition border ${isRevealed ? 'bg-ledger-950/70 border-emerald-900/60 opacity-90' : 'bg-ledger-900/90 border-ledger-700/80 hover:border-amber-500/50 shadow-lg'}">
                <div class="space-y-2">
                    <!-- Top Badge Bar -->
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                        <div class="flex items-center gap-1.5">
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${badgeClass}">
                                ${escapeHTML(sec.category || 'Plot')}
                            </span>
                            ${isRevealed ? `
                                <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                                    <span>✓</span> <span>Discovered</span>
                                </span>
                            ` : `
                                <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase bg-amber-950/60 text-amber-300 border border-amber-800/60 flex items-center gap-1">
                                    <span>⏳</span> <span>Unrevealed</span>
                                </span>
                            `}
                        </div>
                        <div class="flex items-center gap-1">
                            <button onclick="toggleSecretStatus('${sec.id}')" title="${isRevealed ? 'Mark as Unrevealed' : 'Mark as Discovered by Party'}" class="px-2 py-1 rounded-lg text-xs font-semibold transition ${isRevealed ? 'bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800' : 'bg-amber-500 hover:bg-amber-400 text-ledger-950 font-bold'}">
                                ${isRevealed ? '✓ Revealed' : '👁️ Reveal'}
                            </button>
                        </div>
                    </div>

                    <!-- Secret Revelation Text -->
                    <p class="font-serif text-sm leading-relaxed ${isRevealed ? 'text-slate-300' : 'text-slate-100 font-medium'}">
                        “${escapeHTML(sec.text)}”
                    </p>

                    <!-- Associated Tags -->
                    ${tags ? `<div class="flex items-center gap-1.5 flex-wrap pt-1">${tags}</div>` : ''}

                    <!-- Discovery Notes (if any) -->
                    ${sec.sessionNotes ? `
                        <div class="bg-ledger-950/80 p-2 rounded-xl border border-ledger-800/80 text-[11px] text-slate-400 flex items-start gap-1.5">
                            <span class="text-amber-400 font-bold">💡</span>
                            <span class="leading-snug">${escapeHTML(sec.sessionNotes)}</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Card Actions Toolbar -->
                <div class="flex items-center justify-between gap-1.5 pt-2 border-t border-ledger-800/80 text-[11px] flex-wrap">
                    <div class="flex items-center gap-1.5">
                        <button onclick="convertSecretToRumor('${sec.id}')" title="Copy to Tavern Rumors corkboard" class="px-2.5 py-1 rounded-lg bg-ledger-950 hover:bg-ledger-800 border border-ledger-700 text-slate-300 hover:text-amber-300 flex items-center gap-1 transition">
                            <span>📜</span> <span>Pin Rumor</span>
                        </button>
                        <button onclick="broadcastSecretCard('${sec.id}')" title="Broadcast as Handout to Player Screen" class="px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 flex items-center gap-1 transition">
                            <span>📺</span> <span>Broadcast</span>
                        </button>
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="openCustomSecretModal('${sec.id}')" title="Edit Secret" class="px-2 py-1 rounded-lg text-slate-400 hover:text-white hover:bg-ledger-800 transition">
                            ✏️
                        </button>
                        <button onclick="deleteCustomSecret('${sec.id}')" title="Delete Secret" class="px-2 py-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-ledger-800 transition">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterSecrets() {
    appState.secretSearchQuery = document.getElementById('secret-search-input')?.value.trim() || '';
    appState.secretCategoryFilter = document.getElementById('secret-category-filter')?.value || 'all';
    renderSecrets();
}

function setSecretStatusFilter(status) {
    appState.secretStatusFilter = status;
    document.querySelectorAll('.secret-status-filter-btn').forEach(btn => {
        btn.classList.remove('bg-amber-500', 'text-ledger-950', 'font-bold');
        btn.classList.add('text-slate-400');
    });
    const btn = document.getElementById(`secret-filter-btn-${status}`);
    if (btn) {
        btn.classList.remove('text-slate-400');
        btn.classList.add('bg-amber-500', 'text-ledger-950', 'font-bold');
    }
    renderSecrets();
}

async function toggleSecretStatus(secretId) {
    try {
        const res = await fetch(`/api/secrets/${secretId}/toggle`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            const s = (appState.secrets || []).find(x => x.id === secretId);
            if (s) {
                s.status = data.secret.status;
                s.revealedAt = data.secret.revealedAt;
            }
            renderSecrets();
            showToast(data.secret.status === 'revealed' ? "✓ Secret marked as discovered!" : "⏳ Secret marked as unrevealed", "info");
        }
    } catch (e) {
        showToast("Error updating secret status", "error");
    }
}

function populateSecretEntityOptions(selectedNpc = '', selectedLoc = '', selectedFaction = '') {
    // 1. Tied NPC
    const npcSelect = document.getElementById('custom-secret-npc-select');
    const npcCustom = document.getElementById('custom-secret-npc');
    if (npcSelect) {
        const npcs = new Set();
        (appState.roster || []).forEach(n => { if (n.name) npcs.add(n.name); });
        (appState.locations || []).forEach(l => { (l.notableNpcs || []).forEach(n => npcs.add(n)); });
        const sortedNpcs = Array.from(npcs).sort((a, b) => a.localeCompare(b));
        let html = `<option value="">-- None / Unlinked --</option>`;
        sortedNpcs.forEach(n => {
            const isMatch = selectedNpc && n.toLowerCase() === selectedNpc.toLowerCase();
            html += `<option value="${escapeHTML(n)}" ${isMatch ? 'selected' : ''}>👤 ${escapeHTML(n)}</option>`;
        });
        html += `<option value="__custom__">✏️ Custom NPC...</option>`;
        npcSelect.innerHTML = html;

        const match = sortedNpcs.find(n => selectedNpc && n.toLowerCase() === selectedNpc.toLowerCase());
        if (selectedNpc && !match) {
            npcSelect.value = '__custom__';
            if (npcCustom) {
                npcCustom.classList.remove('hidden');
                npcCustom.value = selectedNpc;
            }
        } else {
            if (npcCustom) {
                npcCustom.classList.add('hidden');
                npcCustom.value = match || '';
            }
        }
    }

    // 2. Tied Location
    const locSelect = document.getElementById('custom-secret-location-select');
    const locCustom = document.getElementById('custom-secret-location');
    if (locSelect) {
        const locs = new Set();
        (appState.locations || []).forEach(l => { if (l.name) locs.add(l.name); });
        (appState.overworld?.pins || []).forEach(p => {
            const label = p.label || p.title;
            if (label) locs.add(label);
        });
        if (appState.overworld?.maps) {
            appState.overworld.maps.forEach(m => {
                (m.pins || []).forEach(p => {
                    const label = p.label || p.title;
                    if (label) locs.add(label);
                });
            });
        }
        const sortedLocs = Array.from(locs).sort((a, b) => a.localeCompare(b));
        let html = `<option value="">-- None / Unlinked --</option>`;
        sortedLocs.forEach(l => {
            const isMatch = selectedLoc && l.toLowerCase() === selectedLoc.toLowerCase();
            html += `<option value="${escapeHTML(l)}" ${isMatch ? 'selected' : ''}>📍 ${escapeHTML(l)}</option>`;
        });
        html += `<option value="__custom__">✏️ Custom Location...</option>`;
        locSelect.innerHTML = html;

        const match = sortedLocs.find(l => selectedLoc && l.toLowerCase() === selectedLoc.toLowerCase());
        if (selectedLoc && !match) {
            locSelect.value = '__custom__';
            if (locCustom) {
                locCustom.classList.remove('hidden');
                locCustom.value = selectedLoc;
            }
        } else {
            if (locCustom) {
                locCustom.classList.add('hidden');
                locCustom.value = match || '';
            }
        }
    }

    // 3. Tied Faction
    const facSelect = document.getElementById('custom-secret-faction-select');
    const facCustom = document.getElementById('custom-secret-faction');
    if (facSelect) {
        const factions = new Set();
        (appState.factions || []).forEach(f => { if (f.name) factions.add(f.name); });
        const sortedFactions = Array.from(factions).sort((a, b) => a.localeCompare(b));
        let html = `<option value="">-- None / Unlinked --</option>`;
        sortedFactions.forEach(f => {
            const isMatch = selectedFaction && f.toLowerCase() === selectedFaction.toLowerCase();
            html += `<option value="${escapeHTML(f)}" ${isMatch ? 'selected' : ''}>⚔️ ${escapeHTML(f)}</option>`;
        });
        html += `<option value="__custom__">✏️ Custom Faction...</option>`;
        facSelect.innerHTML = html;

        const match = sortedFactions.find(f => selectedFaction && f.toLowerCase() === selectedFaction.toLowerCase());
        if (selectedFaction && !match) {
            facSelect.value = '__custom__';
            if (facCustom) {
                facCustom.classList.remove('hidden');
                facCustom.value = selectedFaction;
            }
        } else {
            if (facCustom) {
                facCustom.classList.add('hidden');
                facCustom.value = match || '';
            }
        }
    }
}

function onSecretNpcSelectChange() {
    const select = document.getElementById('custom-secret-npc-select');
    const custom = document.getElementById('custom-secret-npc');
    if (!select || !custom) return;
    if (select.value === '__custom__') {
        custom.classList.remove('hidden');
        custom.focus();
    } else {
        custom.classList.add('hidden');
        custom.value = select.value;
    }
}

function onSecretLocationSelectChange() {
    const select = document.getElementById('custom-secret-location-select');
    const custom = document.getElementById('custom-secret-location');
    if (!select || !custom) return;
    if (select.value === '__custom__') {
        custom.classList.remove('hidden');
        custom.focus();
    } else {
        custom.classList.add('hidden');
        custom.value = select.value;
    }
}

function onSecretFactionSelectChange() {
    const select = document.getElementById('custom-secret-faction-select');
    const custom = document.getElementById('custom-secret-faction');
    if (!select || !custom) return;
    if (select.value === '__custom__') {
        custom.classList.remove('hidden');
        custom.focus();
    } else {
        custom.classList.add('hidden');
        custom.value = select.value;
    }
}

function openCustomSecretModal(secretId = null) {
    const modal = document.getElementById('custom-secret-modal');
    if (!modal) return;

    const titleEl = document.getElementById('custom-secret-modal-header-text');
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    if (secretId) {
        const s = (appState.secrets || []).find(x => x.id === secretId);
        if (s) {
            if (titleEl) titleEl.textContent = "Edit Secret & Clue";
            setVal('custom-secret-id', s.id);
            setVal('custom-secret-text', s.text);
            setVal('custom-secret-category', s.category || 'Plot');
            setVal('custom-secret-status', s.status || 'unrevealed');
            populateSecretEntityOptions(s.tiedNpc || '', s.tiedLocation || '', s.tiedFaction || '');
            setVal('custom-secret-notes', s.sessionNotes || '');
        }
    } else {
        if (titleEl) titleEl.textContent = "Add Secret & Clue";
        setVal('custom-secret-id', '');
        document.getElementById('custom-secret-form')?.reset();
        setVal('custom-secret-category', 'Plot');
        setVal('custom-secret-status', 'unrevealed');
        populateSecretEntityOptions('', '', '');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeCustomSecretModal() {
    const modal = document.getElementById('custom-secret-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function saveCustomSecret(e) {
    if (e) e.preventDefault();
    const id = document.getElementById('custom-secret-id')?.value.trim();
    const text = document.getElementById('custom-secret-text')?.value.trim();
    if (!text) {
        showToast("Please enter secret text", "error");
        return;
    }

    const npcSel = document.getElementById('custom-secret-npc-select');
    const npcCustom = document.getElementById('custom-secret-npc');
    const tiedNpc = (npcSel?.value === '__custom__') ? (npcCustom?.value.trim() || '') : (npcSel?.value || npcCustom?.value.trim() || '');

    const locSel = document.getElementById('custom-secret-location-select');
    const locCustom = document.getElementById('custom-secret-location');
    const tiedLocation = (locSel?.value === '__custom__') ? (locCustom?.value.trim() || '') : (locSel?.value || locCustom?.value.trim() || '');

    const facSel = document.getElementById('custom-secret-faction-select');
    const facCustom = document.getElementById('custom-secret-faction');
    const tiedFaction = (facSel?.value === '__custom__') ? (facCustom?.value.trim() || '') : (facSel?.value || facCustom?.value.trim() || '');

    const payload = {
        text: text,
        category: document.getElementById('custom-secret-category')?.value || 'Plot',
        status: document.getElementById('custom-secret-status')?.value || 'unrevealed',
        tiedNpc: tiedNpc,
        tiedLocation: tiedLocation,
        tiedFaction: tiedFaction,
        sessionNotes: document.getElementById('custom-secret-notes')?.value.trim() || ''
    };
    if (id) payload.id = id;

    try {
        const res = await fetch('/api/secrets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            const saved = data.secret;
            if (!appState.secrets) appState.secrets = [];
            const idx = appState.secrets.findIndex(x => x.id === saved.id);
            if (idx !== -1) {
                appState.secrets[idx] = saved;
            } else {
                appState.secrets.unshift(saved);
            }
            closeCustomSecretModal();
            renderSecrets();
            showToast("Saved secret & clue!", "success");
        }
    } catch (err) {
        showToast("Error saving secret", "error");
    }
}

async function deleteCustomSecret(secretId) {
    if (!confirm("Are you sure you want to delete this secret?")) return;
    try {
        const res = await fetch(`/api/secrets/${secretId}`, { method: 'DELETE' });
        if (res.ok) {
            appState.secrets = (appState.secrets || []).filter(s => s.id !== secretId);
            renderSecrets();
            showToast("Secret deleted.", "info");
        }
    } catch (e) {
        showToast("Error deleting secret", "error");
    }
}

async function convertSecretToRumor(secretId) {
    try {
        const res = await fetch(`/api/secrets/${secretId}/to-rumor`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            const s = (appState.secrets || []).find(x => x.id === secretId);
            if (s) s.status = 'revealed';
            if (!appState.rumors) appState.rumors = [];
            appState.rumors.unshift(data.rumor);
            renderSecrets();
            renderRumors();
            showToast("📜 Pinned secret as a Tavern Rumor & marked as discovered!", "success");
        }
    } catch (e) {
        showToast("Error pinning secret to rumors", "error");
    }
}

async function broadcastSecretCard(secretId) {
    const s = (appState.secrets || []).find(x => x.id === secretId);
    if (!s) return;

    let sub = `Discovery • ${s.category || 'Clue'}`;
    if (s.tiedLocation) sub += ` — ${s.tiedLocation}`;

    await broadcastHandout("Campaign Clue & Discovery", sub, s.text, 'lore');
}

function rollRandomSecret() {
    const unrevealed = (appState.secrets || []).filter(s => s.status === 'unrevealed');
    if (unrevealed.length === 0) {
        showToast("All secrets have been discovered! Add new secrets to prep your session.", "info");
        return;
    }

    const picked = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    const modal = document.getElementById('random-secret-modal');
    const content = document.getElementById('random-secret-content');
    const btn = document.getElementById('random-secret-mark-discovered-btn');
    if (!modal || !content) return;

    const badgeClass = getSecretCategoryBadge(picked.category);
    content.innerHTML = `
        <div class="space-y-3">
            <div class="flex items-center justify-between gap-2">
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${badgeClass}">
                    ${escapeHTML(picked.category || 'Plot')}
                </span>
                ${picked.tiedLocation ? `<span class="text-[11px] text-slate-400 font-mono">📍 ${escapeHTML(picked.tiedLocation)}</span>` : ''}
            </div>

            <div class="bg-ledger-950 p-4 rounded-xl border border-purple-500/40 shadow-inner">
                <p class="font-serif text-sm text-slate-100 leading-relaxed font-medium">
                    “${escapeHTML(picked.text)}”
                </p>
            </div>

            ${picked.sessionNotes ? `
                <div class="bg-ledger-950/60 p-2.5 rounded-xl border border-ledger-800 text-[11px] text-slate-400">
                    <strong class="text-amber-400">DM Prep Advice:</strong> ${escapeHTML(picked.sessionNotes)}
                </div>
            ` : ''}

            <div class="flex items-center gap-2 pt-1">
                <button onclick="broadcastSecretCard('${picked.id}')" class="px-3 py-1.5 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 text-xs font-semibold flex items-center gap-1 transition">
                    <span>📺</span> Broadcast Handout
                </button>
                <button onclick="convertSecretToRumor('${picked.id}')" class="px-3 py-1.5 rounded-lg bg-ledger-950 hover:bg-ledger-800 border border-ledger-700 text-amber-300 text-xs font-semibold flex items-center gap-1 transition">
                    <span>📜</span> Pin as Rumor
                </button>
            </div>
        </div>
    `;

    if (btn) {
        btn.onclick = async () => {
            await toggleSecretStatus(picked.id);
            closeModal('random-secret-modal');
        };
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

async function generateSecretsBatch() {
    try {
        const res = await fetch('/api/secrets/batch-template', { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            appState.secrets = data.secrets;
            renderSecrets();
            showToast(`Added ${data.added} prompt templates for session prep!`, "success");
        }
    } catch (e) {
        showToast("Error generating secret templates", "error");
    }
}

// Global window exposure for Secrets & Clues Engine
window.renderSecrets = renderSecrets;
window.filterSecrets = filterSecrets;
window.setSecretStatusFilter = setSecretStatusFilter;
window.toggleSecretStatus = toggleSecretStatus;
window.openCustomSecretModal = openCustomSecretModal;
window.closeCustomSecretModal = closeCustomSecretModal;
window.saveCustomSecret = saveCustomSecret;
window.deleteCustomSecret = deleteCustomSecret;
window.convertSecretToRumor = convertSecretToRumor;
window.broadcastSecretCard = broadcastSecretCard;
window.rollRandomSecret = rollRandomSecret;
window.generateSecretsBatch = generateSecretsBatch;
window.getSecretCategoryBadge = getSecretCategoryBadge;
window.onSecretNpcSelectChange = onSecretNpcSelectChange;
window.onSecretLocationSelectChange = onSecretLocationSelectChange;
window.onSecretFactionSelectChange = onSecretFactionSelectChange;
window.openAddRumorModal = openAddRumorModal;
window.saveRumorFromModal = saveRumorFromModal;
window.onRumorSourceSelectChange = onRumorSourceSelectChange;
window.onRumorLocationSelectChange = onRumorLocationSelectChange;

// =============================================================================
// IN-WORLD HANDOUTS & LETTERS ENGINE (PARCHMENT, CIPHERS, BOUNTIES & SEALS)
// =============================================================================

const RUNIC_MAP = {
    'A': 'ᚪ', 'B': 'ᛒ', 'C': 'ᚳ', 'D': 'ᛞ', 'E': 'ᛖ', 'F': 'ᚠ', 'G': 'ᚷ',
    'H': 'ᚻ', 'I': 'ᛁ', 'J': 'ᛃ', 'K': 'ᚲ', 'L': 'ᛚ', 'M': 'ᛗ', 'N': 'ᚾ',
    'O': 'ᚩ', 'P': 'ᛈ', 'Q': 'ᛩ', 'R': 'ᚱ', 'S': 'ᛋ', 'T': 'ᛏ', 'U': 'ᚢ',
    'V': 'ᚡ', 'W': 'ᚹ', 'X': 'ᛪ', 'Y': 'ᚣ', 'Z': 'ᛉ',
    'a': 'ᚪ', 'b': 'ᛒ', 'c': 'ᚳ', 'd': 'ᛞ', 'e': 'ᛖ', 'f': 'ᚠ', 'g': 'ᚷ',
    'h': 'ᚻ', 'i': 'ᛁ', 'j': 'ᛃ', 'k': 'ᚲ', 'l': 'ᛚ', 'm': 'ᛗ', 'n': 'ᚾ',
    'o': 'ᚩ', 'p': 'ᛈ', 'q': 'ᛩ', 'r': 'ᚱ', 's': 'ᛋ', 't': 'ᛏ', 'u': 'ᚢ',
    'v': 'ᚡ', 'w': 'ᚹ', 'x': 'ᛪ', 'y': 'ᚣ', 'z': 'ᛉ'
};

function applyCipher(text, type, shift = 3) {
    if (!text) return '';
    if (type === 'runic') {
        return text.split('').map(char => RUNIC_MAP[char] || char).join('');
    } else if (type === 'caesar') {
        const s = parseInt(shift, 10) || 3;
        return text.split('').map(char => {
            const code = char.charCodeAt(0);
            if (code >= 65 && code <= 90) {
                return String.fromCharCode(((code - 65 + s) % 26 + 26) % 26 + 65);
            } else if (code >= 97 && code <= 122) {
                return String.fromCharCode(((code - 97 + s) % 26 + 26) % 26 + 97);
            }
            return char;
        }).join('');
    } else if (type === 'redacted') {
        return text.replace(/\b[A-Za-z]{4,}\b/g, (match, offset) => {
            return (offset % 2 === 0) ? '█'.repeat(match.length) : match;
        });
    } else if (type === 'scramble') {
        return text.split(' ').map(word => {
            if (word.length <= 3) return word;
            const mid = word.slice(1, -1).split('').sort(() => 0.5 - Math.random()).join('');
            return word[0] + mid + word[word.length - 1];
        }).join(' ');
    }
    return text;
}

function getHandoutTypeBadge(type) {
    const t = (type || 'letter').toLowerCase();
    if (t === 'letter') return { label: '✉️ Sealed Letter', badge: 'bg-sky-950 text-sky-300 border-sky-800' };
    if (t === 'journal') return { label: '📖 Torn Journal', badge: 'bg-amber-950 text-amber-300 border-amber-800' };
    if (t === 'bounty') return { label: '⚔️ Bounty Notice', badge: 'bg-rose-950 text-rose-300 border-rose-800' };
    if (t === 'cipher') return { label: '🔒 Coded Cipher', badge: 'bg-purple-950 text-purple-300 border-purple-800' };
    if (t === 'scroll') return { label: '✨ Sigil Scroll', badge: 'bg-indigo-950 text-indigo-300 border-indigo-800' };
    return { label: '📜 Handout', badge: 'bg-ledger-800 text-slate-300 border-ledger-700' };
}

async function renderHandouts() {
    if (!appState.handouts || appState.handouts.length === 0) {
        try {
            const res = await fetch('/api/handouts');
            if (res.ok) {
                appState.handouts = await res.json();
            }
        } catch (e) {
            console.error("Error fetching handouts:", e);
        }
    }

    const handouts = appState.handouts || [];
    const container = document.getElementById('handouts-grid');
    if (!container) return;

    // Update stats and badges
    const totalCount = handouts.length;
    const countAllEl = document.getElementById('handout-count-all');
    const navBadge = document.getElementById('handouts-nav-badge');
    if (countAllEl) countAllEl.textContent = totalCount;
    if (navBadge) navBadge.textContent = totalCount;

    // Filter list
    let list = handouts;
    if (appState.handoutStatusFilter === 'ready') {
        list = list.filter(h => h.status === 'ready');
    } else if (appState.handoutStatusFilter === 'delivered') {
        list = list.filter(h => h.status === 'delivered');
    }

    if (appState.handoutTypeFilter && appState.handoutTypeFilter !== 'all') {
        list = list.filter(h => (h.type || '').toLowerCase() === appState.handoutTypeFilter.toLowerCase());
    }

    if (appState.handoutThemeFilter && appState.handoutThemeFilter !== 'all') {
        list = list.filter(h => (h.theme || '').toLowerCase() === appState.handoutThemeFilter.toLowerCase());
    }

    if (appState.handoutSearchQuery) {
        const q = appState.handoutSearchQuery.toLowerCase();
        list = list.filter(h =>
            (h.title || '').toLowerCase().includes(q) ||
            (h.author || '').toLowerCase().includes(q) ||
            (h.recipient || '').toLowerCase().includes(q) ||
            (h.content || '').toLowerCase().includes(q) ||
            (h.tiedLocation || '').toLowerCase().includes(q) ||
            (h.tiedNpc || '').toLowerCase().includes(q)
        );
    }

    if (list.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-12 px-4 text-center border-2 border-dashed border-ledger-800 rounded-2xl space-y-2 text-slate-500 text-xs">
                <span class="text-3xl block">📜</span>
                <p class="font-semibold text-slate-400">No in-world handouts found matching current filters.</p>
                <p>Click <strong class="text-amber-400">+ New Handout</strong> or <strong class="text-amber-400">⚡ +2 Lore Presets</strong> to forge immersive props for your table.</p>
            </div>
        `;
        return;
    }

    const sealIcons = {
        crown: '👑', skull: '💀', arcane: '👁️', scales: '⚖️',
        daggers: '🗡️', dragon: '🐉', tree: '🌳', scroll: '📜', none: ''
    };

    container.innerHTML = list.map(h => {
        const typeInfo = getHandoutTypeBadge(h.type);
        const sealIcon = sealIcons[h.seal || 'crown'] || '📜';
        const isCoded = Boolean(h.isCoded);
        const isDeciphered = Boolean(h.isDeciphered);

        let snippet = h.content || '';
        if (isCoded && !isDeciphered) {
            snippet = applyCipher(snippet, h.cipherType || 'runic', h.cipherShift || 3);
        }
        if (snippet.length > 180) snippet = snippet.slice(0, 180) + '...';

        const tags = [
            h.tiedLocation ? `<span class="px-1.5 py-0.5 rounded bg-ledger-950 border border-ledger-700/80 text-emerald-300 text-[10px]">📍 ${escapeHTML(h.tiedLocation)}</span>` : '',
            h.tiedNpc ? `<span class="px-1.5 py-0.5 rounded bg-ledger-950 border border-ledger-700/80 text-purple-300 text-[10px]">👤 ${escapeHTML(h.tiedNpc)}</span>` : '',
            h.dateString ? `<span class="px-1.5 py-0.5 rounded bg-ledger-950 border border-ledger-700/80 text-amber-300 text-[10px]">📅 ${escapeHTML(h.dateString)}</span>` : ''
        ].filter(Boolean).join('');

        const themeLabels = {
            parchment: '📜 Parchment',
            vellum: '👑 Vellum',
            burnt: '🔥 Burnt Ash',
            blood: '🩸 Bloodstained',
            arcane: '🔮 Arcane'
        };

        return `
            <div class="rounded-2xl p-4 flex flex-col justify-between space-y-3 transition border bg-ledger-900/90 border-ledger-700/80 hover:border-amber-500/50 shadow-lg">
                <div class="space-y-2.5">
                    <!-- Top Metadata & Seal Bar -->
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider border ${typeInfo.badge}">
                                ${typeInfo.label}
                            </span>
                            <span class="px-2 py-0.5 rounded-md text-[10px] font-mono bg-ledger-950 border border-ledger-800 text-slate-400">
                                ${themeLabels[h.theme] || '📜 Parchment'}
                            </span>
                            ${h.seal !== 'none' ? `
                                <span class="px-1.5 py-0.5 rounded-md text-[10px] bg-ledger-950 border border-ledger-800" title="Wax Seal: ${escapeHTML(h.seal)} (${escapeHTML(h.sealColor)})">
                                    ${sealIcon}
                                </span>
                            ` : ''}
                        </div>

                        <!-- Cipher status pill or Bounty tag -->
                        ${isCoded ? `
                            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${isDeciphered ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-purple-950/80 text-purple-300 border-purple-800'}">
                                ${isDeciphered ? '🔓 Deciphered' : `🔒 DC ${h.investigationDC || 14}`}
                            </span>
                        ` : ''}
                        ${h.type === 'bounty' && h.bountyReward ? `
                            <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                💰 ${escapeHTML(h.bountyReward)}
                            </span>
                        ` : ''}
                    </div>

                    <!-- Title & Parties -->
                    <div>
                        <h4 class="font-display font-bold text-sm text-slate-100 hover:text-amber-300 transition cursor-pointer" onclick="openCustomHandoutModal('${h.id}')">
                            ${escapeHTML(h.title)}
                        </h4>
                        ${(h.author || h.recipient) ? `
                            <div class="text-[11px] text-slate-400 font-serif mt-0.5 space-x-1.5">
                                ${h.author ? `<span>From: <strong class="text-slate-300">${escapeHTML(h.author)}</strong></span>` : ''}
                                ${h.recipient ? `<span>To: <strong class="text-slate-300">${escapeHTML(h.recipient)}</strong></span>` : ''}
                            </div>
                        ` : ''}
                    </div>

                    <!-- Miniature Styled Preview Snippet -->
                    <div class="bg-ledger-950/85 p-3 rounded-xl border border-ledger-800 font-serif text-xs leading-relaxed ${isCoded && !isDeciphered ? 'text-purple-300 font-mono tracking-wider' : 'text-slate-300'}">
                        “${escapeHTML(snippet)}”
                    </div>

                    <!-- Tags -->
                    ${tags ? `<div class="flex items-center gap-1.5 flex-wrap">${tags}</div>` : ''}
                </div>

                <!-- Bottom Action Toolbar -->
                <div class="flex items-center justify-between gap-1.5 pt-2.5 border-t border-ledger-800/80 text-[11px] flex-wrap">
                    <div class="flex items-center gap-1.5">
                        <button onclick="broadcastInWorldHandout('${h.id}')" title="Broadcast directly to Player Screen" class="px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 flex items-center gap-1 transition font-bold">
                            <span>📺</span> <span>Broadcast</span>
                        </button>
                        ${isCoded ? `
                            <button onclick="toggleHandoutDecipher('${h.id}')" title="${isDeciphered ? 'Re-encrypt for players' : 'Decipher and reveal translation to players'}" class="px-2.5 py-1 rounded-lg ${isDeciphered ? 'bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300' : 'bg-purple-950 hover:bg-purple-900 border border-purple-800 text-purple-300'} flex items-center gap-1 transition">
                                <span>${isDeciphered ? '🔒' : '🔓'}</span> <span>${isDeciphered ? 'Encrypt' : 'Decipher'}</span>
                            </button>
                        ` : ''}
                        <button onclick="convertHandoutToRumor('${h.id}')" title="Pin to Tavern Rumors corkboard" class="px-2 py-1 rounded-lg bg-ledger-950 hover:bg-ledger-800 border border-ledger-700 text-slate-300 hover:text-amber-300 flex items-center gap-1 transition">
                            <span>📜</span> <span>Rumor</span>
                        </button>
                    </div>

                    <div class="flex items-center gap-1">
                        <button onclick="openCustomHandoutModal('${h.id}')" title="Edit Handout" class="px-2 py-1 rounded-lg bg-ledger-950 hover:bg-ledger-800 border border-ledger-700 text-slate-300 hover:text-white transition">
                            ✏️ Edit
                        </button>
                        <button onclick="deleteCustomHandout('${h.id}')" title="Delete Handout" class="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition">
                            🗑️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filterHandouts() {
    const qEl = document.getElementById('handout-search');
    const typeEl = document.getElementById('handout-type-filter');
    const themeEl = document.getElementById('handout-theme-filter');
    if (qEl) appState.handoutSearchQuery = qEl.value.trim().toLowerCase();
    if (typeEl) appState.handoutTypeFilter = typeEl.value;
    if (themeEl) appState.handoutThemeFilter = themeEl.value;
    renderHandouts();
}

function setHandoutStatusFilter(status) {
    appState.handoutStatusFilter = status;
    document.querySelectorAll('.handout-status-filter-btn').forEach(btn => {
        btn.classList.remove('bg-amber-500', 'text-ledger-950', 'font-bold');
        btn.classList.add('text-slate-400');
    });
    const activeBtn = document.getElementById(`handout-filter-btn-${status}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-400');
        activeBtn.classList.add('bg-amber-500', 'text-ledger-950', 'font-bold');
    }
    renderHandouts();
}

function openCustomHandoutModal(id = null) {
    const modal = document.getElementById('custom-handout-modal');
    if (!modal) return;

    appState.previewDecipherState = false;
    const decipherBtn = document.getElementById('preview-decipher-btn');
    if (decipherBtn) {
        decipherBtn.textContent = "Decipher: Plaintext";
        decipherBtn.className = "px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 transition";
    }

    if (id) {
        const h = (appState.handouts || []).find(item => item.id === id);
        if (h) {
            document.getElementById('custom-handout-id').value = h.id;
            document.getElementById('custom-handout-title').value = h.title || '';
            document.getElementById('custom-handout-type').value = h.type || 'letter';
            document.getElementById('custom-handout-theme').value = h.theme || 'parchment';
            document.getElementById('custom-handout-font').value = h.fontStyle || 'cursive';
            document.getElementById('custom-handout-seal').value = h.seal || 'crown';
            document.getElementById('custom-handout-seal-color').value = h.sealColor || 'red';
            document.getElementById('custom-handout-author').value = h.author || '';
            document.getElementById('custom-handout-recipient').value = h.recipient || '';
            document.getElementById('custom-handout-date').value = h.dateString || '';
            document.getElementById('custom-handout-content').value = h.content || '';

            const isCodedBox = document.getElementById('custom-handout-is-coded');
            if (isCodedBox) isCodedBox.checked = Boolean(h.isCoded);
            document.getElementById('custom-handout-cipher-type').value = h.cipherType || 'runic';
            document.getElementById('custom-handout-cipher-dc').value = h.investigationDC || 14;
            document.getElementById('custom-handout-cipher-hint').value = h.cipherHint || '';

            document.getElementById('custom-handout-bounty-reward').value = h.bountyReward || '';
            document.getElementById('custom-handout-bounty-crimes').value = h.bountyCrimes || '';

            document.getElementById('custom-handout-location').value = h.tiedLocation || '';
            document.getElementById('custom-handout-npc').value = h.tiedNpc || '';
            document.getElementById('custom-handout-notes').value = h.sessionNotes || '';
            document.getElementById('custom-handout-modal-title').textContent = "Edit In-World Handout";

            populateHandoutDropdowns(h.author || '', h.recipient || '', h.tiedLocation || '', h.tiedNpc || '');
        }
    } else {
        document.getElementById('custom-handout-id').value = '';
        document.getElementById('custom-handout-title').value = '';
        document.getElementById('custom-handout-type').value = 'letter';
        document.getElementById('custom-handout-theme').value = 'parchment';
        document.getElementById('custom-handout-font').value = 'cursive';
        document.getElementById('custom-handout-seal').value = 'crown';
        document.getElementById('custom-handout-seal-color').value = 'red';
        document.getElementById('custom-handout-author').value = '';
        document.getElementById('custom-handout-recipient').value = '';
        document.getElementById('custom-handout-date').value = '';
        document.getElementById('custom-handout-content').value = '';

        const isCodedBox = document.getElementById('custom-handout-is-coded');
        if (isCodedBox) isCodedBox.checked = false;
        document.getElementById('custom-handout-cipher-type').value = 'runic';
        document.getElementById('custom-handout-cipher-dc').value = 14;
        document.getElementById('custom-handout-cipher-hint').value = '';

        document.getElementById('custom-handout-bounty-reward').value = '';
        document.getElementById('custom-handout-bounty-crimes').value = '';

        document.getElementById('custom-handout-location').value = '';
        document.getElementById('custom-handout-npc').value = '';
        document.getElementById('custom-handout-notes').value = '';
        document.getElementById('custom-handout-modal-title').textContent = "In-World Handout Forge";

        populateHandoutDropdowns('', '', '', '');
    }

    onHandoutTypeChanged();
    updateHandoutPreview();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function closeCustomHandoutModal() {
    const modal = document.getElementById('custom-handout-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function onHandoutTypeChanged(isUserChange = false) {
    const type = document.getElementById('custom-handout-type')?.value || 'letter';
    const bountyBox = document.getElementById('custom-handout-bounty-settings');
    const isCodedBox = document.getElementById('custom-handout-is-coded');
    const themeSelect = document.getElementById('custom-handout-theme');
    const fontSelect = document.getElementById('custom-handout-font');
    const sealSelect = document.getElementById('custom-handout-seal');
    const sealColorSelect = document.getElementById('custom-handout-seal-color');
    const isCreating = !document.getElementById('custom-handout-id')?.value;

    if (bountyBox) {
        if (type === 'bounty') bountyBox.classList.remove('hidden');
        else bountyBox.classList.add('hidden');
    }

    if (type === 'cipher') {
        if (isCodedBox) {
            isCodedBox.checked = true;
            isCodedBox.dataset.autoCipher = 'true';
        }
    } else if (isUserChange && isCodedBox && isCodedBox.dataset.autoCipher === 'true') {
        isCodedBox.checked = false;
        isCodedBox.dataset.autoCipher = 'false';
    }

    // When creating a new handout, adapt default theme/font/seal/placeholders to match the chosen document type:
    if (isUserChange && isCreating) {
        const titleInput = document.getElementById('custom-handout-title');
        const contentInput = document.getElementById('custom-handout-content');

        if (type === 'bounty') {
            if (themeSelect) themeSelect.value = 'parchment';
            if (fontSelect) fontSelect.value = 'blackletter';
            if (sealSelect) sealSelect.value = 'skull';
            if (sealColorSelect) sealColorSelect.value = 'red';
            if (titleInput && !titleInput.value) titleInput.placeholder = 'e.g. WANTED: The Jackdaw of Oakhaven';
            if (contentInput && !contentInput.value) contentInput.placeholder = 'Wanted dead or alive for high treason, piracy, and arcane arson...';
        } else if (type === 'journal') {
            if (themeSelect) themeSelect.value = 'burnt';
            if (fontSelect) fontSelect.value = 'serif';
            if (sealSelect) sealSelect.value = 'none';
            if (titleInput && !titleInput.value) titleInput.placeholder = 'e.g. Brother Thomas\'s Final Warning';
            if (contentInput && !contentInput.value) contentInput.placeholder = 'Day 14 — The lower sanctuary has gone silent. We barred the crypt gates...';
        } else if (type === 'cipher') {
            if (themeSelect) themeSelect.value = 'parchment';
            if (fontSelect) fontSelect.value = 'typewriter';
            if (sealSelect) sealSelect.value = 'daggers';
            if (sealColorSelect) sealColorSelect.value = 'black';
            if (titleInput && !titleInput.value) titleInput.placeholder = 'e.g. Smuggler\'s Dead Drop Cypher';
            if (contentInput && !contentInput.value) contentInput.placeholder = 'The iron coffer is submerged beneath the mill sluice gate at midnight...';
        } else if (type === 'scroll') {
            if (themeSelect) themeSelect.value = 'arcane';
            if (fontSelect) fontSelect.value = 'chisel';
            if (sealSelect) sealSelect.value = 'arcane';
            if (sealColorSelect) sealColorSelect.value = 'purple';
            if (titleInput && !titleInput.value) titleInput.placeholder = 'e.g. Ancient Sigil of Banishment';
            if (contentInput && !contentInput.value) contentInput.placeholder = 'By the eternal sigil of the astral plane, let the boundaries between realms dissolve...';
        } else { // letter
            if (themeSelect) themeSelect.value = 'parchment';
            if (fontSelect) fontSelect.value = 'cursive';
            if (sealSelect) sealSelect.value = 'crown';
            if (sealColorSelect) sealColorSelect.value = 'red';
            if (titleInput && !titleInput.value) titleInput.placeholder = 'e.g. Lady Cynthia\'s Sealed Missive';
            if (contentInput && !contentInput.value) contentInput.placeholder = 'My Lord, our house cannot abide another day of delay at the harbor...';
        }
    }
}

function togglePreviewDecipherState() {
    appState.previewDecipherState = !appState.previewDecipherState;
    const btn = document.getElementById('preview-decipher-btn');
    if (btn) {
        btn.textContent = appState.previewDecipherState ? "Decipher: Encrypted Runes" : "Decipher: Plaintext";
        btn.className = appState.previewDecipherState ?
            "px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition" :
            "px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-800 transition";
    }
    updateHandoutPreview();
}

function populateHandoutDropdowns(authorVal = '', recipientVal = '', locationVal = '', npcVal = '') {
    const npcSet = new Set();
    (appState.roster || []).forEach(n => { if (n.name && n.name.trim()) npcSet.add(n.name.trim()); });
    (appState.locations || []).forEach(l => { (l.notableNpcs || []).forEach(n => { if (n && n.trim()) npcSet.add(n.trim()); }); });
    if (appState.currentNPC?.name && appState.currentNPC.name.trim()) {
        npcSet.add(appState.currentNPC.name.trim());
    }
    const sortedNpcs = Array.from(npcSet).sort((a, b) => a.localeCompare(b));
    const sortedLocs = getActiveLocationsPool();

    // 1. Author Select
    const authorSel = document.getElementById('custom-handout-author-select');
    const authorInput = document.getElementById('custom-handout-author');
    if (authorSel) {
        let h = `<option value="">-- None / Anonymous --</option>`;
        if (sortedNpcs.length > 0) {
            h += `<optgroup label="Campaign NPCs">`;
            sortedNpcs.forEach(n => {
                h += `<option value="${escapeHTML(n)}">👤 ${escapeHTML(n)}</option>`;
            });
            h += `</optgroup>`;
        }
        h += `<option value="__custom__">✏️ Custom Author...</option>`;
        authorSel.innerHTML = h;

        const match = sortedNpcs.find(n => authorVal && n.toLowerCase() === authorVal.toLowerCase());
        if (match) {
            authorSel.value = match;
            if (authorInput) {
                authorInput.classList.add('hidden');
                authorInput.value = match;
            }
        } else if (authorVal) {
            authorSel.value = '__custom__';
            if (authorInput) {
                authorInput.classList.remove('hidden');
                authorInput.value = authorVal;
            }
        } else {
            authorSel.value = '';
            if (authorInput) {
                authorInput.classList.add('hidden');
                authorInput.value = '';
            }
        }
    }

    // 2. Recipient Select
    const recipSel = document.getElementById('custom-handout-recipient-select');
    const recipInput = document.getElementById('custom-handout-recipient');
    if (recipSel) {
        let h = `<option value="">-- None / To Whomever --</option>`;
        if (sortedNpcs.length > 0) {
            h += `<optgroup label="Campaign NPCs">`;
            sortedNpcs.forEach(n => {
                h += `<option value="${escapeHTML(n)}">👤 ${escapeHTML(n)}</option>`;
            });
            h += `</optgroup>`;
        }
        h += `<option value="__custom__">✏️ Custom Recipient...</option>`;
        recipSel.innerHTML = h;

        const match = sortedNpcs.find(n => recipientVal && n.toLowerCase() === recipientVal.toLowerCase());
        if (match) {
            recipSel.value = match;
            if (recipInput) {
                recipInput.classList.add('hidden');
                recipInput.value = match;
            }
        } else if (recipientVal) {
            recipSel.value = '__custom__';
            if (recipInput) {
                recipInput.classList.remove('hidden');
                recipInput.value = recipientVal;
            }
        } else {
            recipSel.value = '';
            if (recipInput) {
                recipInput.classList.add('hidden');
                recipInput.value = '';
            }
        }
    }

    // 3. Location Select
    const locSel = document.getElementById('custom-handout-location-select');
    const locInput = document.getElementById('custom-handout-location');
    if (locSel) {
        let h = `<option value="">-- None / Unlinked --</option>`;
        if (sortedLocs.length > 0) {
            h += `<optgroup label="Campaign Locations">`;
            sortedLocs.forEach(l => {
                h += `<option value="${escapeHTML(l)}">📍 ${escapeHTML(l)}</option>`;
            });
            h += `</optgroup>`;
        }
        h += `<option value="__custom__">✏️ Custom Location...</option>`;
        locSel.innerHTML = h;

        const match = sortedLocs.find(l => locationVal && l.toLowerCase() === locationVal.toLowerCase());
        if (match) {
            locSel.value = match;
            if (locInput) {
                locInput.classList.add('hidden');
                locInput.value = match;
            }
        } else if (locationVal) {
            locSel.value = '__custom__';
            if (locInput) {
                locInput.classList.remove('hidden');
                locInput.value = locationVal;
            }
        } else {
            locSel.value = '';
            if (locInput) {
                locInput.classList.add('hidden');
                locInput.value = '';
            }
        }
    }

    // 4. Tied NPC Select
    const npcSel = document.getElementById('custom-handout-npc-select');
    const npcInput = document.getElementById('custom-handout-npc');
    if (npcSel) {
        let h = `<option value="">-- None / Unlinked --</option>`;
        if (sortedNpcs.length > 0) {
            h += `<optgroup label="Campaign NPCs">`;
            sortedNpcs.forEach(n => {
                h += `<option value="${escapeHTML(n)}">👤 ${escapeHTML(n)}</option>`;
            });
            h += `</optgroup>`;
        }
        h += `<option value="__custom__">✏️ Custom NPC...</option>`;
        npcSel.innerHTML = h;

        const match = sortedNpcs.find(n => npcVal && n.toLowerCase() === npcVal.toLowerCase());
        if (match) {
            npcSel.value = match;
            if (npcInput) {
                npcInput.classList.add('hidden');
                npcInput.value = match;
            }
        } else if (npcVal) {
            npcSel.value = '__custom__';
            if (npcInput) {
                npcInput.classList.remove('hidden');
                npcInput.value = npcVal;
            }
        } else {
            npcSel.value = '';
            if (npcInput) {
                npcInput.classList.add('hidden');
                npcInput.value = '';
            }
        }
    }
}

function onHandoutAuthorSelectChange() {
    const sel = document.getElementById('custom-handout-author-select');
    const input = document.getElementById('custom-handout-author');
    if (!sel || !input) return;
    if (sel.value === '__custom__') {
        input.classList.remove('hidden');
        input.value = '';
        input.focus();
    } else {
        input.classList.add('hidden');
        input.value = sel.value;
    }
    updateHandoutPreview();
}

function onHandoutRecipientSelectChange() {
    const sel = document.getElementById('custom-handout-recipient-select');
    const input = document.getElementById('custom-handout-recipient');
    if (!sel || !input) return;
    if (sel.value === '__custom__') {
        input.classList.remove('hidden');
        input.value = '';
        input.focus();
    } else {
        input.classList.add('hidden');
        input.value = sel.value;
    }
    updateHandoutPreview();
}

function onHandoutLocationSelectChange() {
    const sel = document.getElementById('custom-handout-location-select');
    const input = document.getElementById('custom-handout-location');
    if (!sel || !input) return;
    if (sel.value === '__custom__') {
        input.classList.remove('hidden');
        input.value = '';
        input.focus();
    } else {
        input.classList.add('hidden');
        input.value = sel.value;
    }
}

function onHandoutNpcSelectChange() {
    const sel = document.getElementById('custom-handout-npc-select');
    const input = document.getElementById('custom-handout-npc');
    if (!sel || !input) return;
    if (sel.value === '__custom__') {
        input.classList.remove('hidden');
        input.value = '';
        input.focus();
    } else {
        input.classList.add('hidden');
        input.value = sel.value;
    }
}

function updateHandoutPreview() {
    const container = document.getElementById('handout-wysiwyg-container');
    if (!container) return;

    const type = document.getElementById('custom-handout-type')?.value || 'letter';
    const theme = document.getElementById('custom-handout-theme')?.value || 'parchment';
    const font = document.getElementById('custom-handout-font')?.value || 'cursive';
    const seal = document.getElementById('custom-handout-seal')?.value || 'crown';
    const sealColor = document.getElementById('custom-handout-seal-color')?.value || 'red';
    const typedTitle = document.getElementById('custom-handout-title')?.value.trim() || '';

    const authorSel = document.getElementById('custom-handout-author-select');
    const authorInput = document.getElementById('custom-handout-author');
    const author = (authorSel && authorSel.value !== '__custom__') ? (authorSel.value || authorInput?.value.trim() || '') : (authorInput?.value.trim() || '');

    const recipSel = document.getElementById('custom-handout-recipient-select');
    const recipInput = document.getElementById('custom-handout-recipient');
    const recipient = (recipSel && recipSel.value !== '__custom__') ? (recipSel.value || recipInput?.value.trim() || '') : (recipInput?.value.trim() || '');

    const date = document.getElementById('custom-handout-date')?.value.trim() || '';
    const typedContent = document.getElementById('custom-handout-content')?.value.trim() || '';

    const isCoded = Boolean(document.getElementById('custom-handout-is-coded')?.checked);
    const cipherType = document.getElementById('custom-handout-cipher-type')?.value || 'runic';
    const cipherShift = 3;
    const cipherDC = document.getElementById('custom-handout-cipher-dc')?.value || 14;
    const cipherHint = document.getElementById('custom-handout-cipher-hint')?.value.trim() || '';

    const bountyReward = document.getElementById('custom-handout-bounty-reward')?.value.trim() || '';
    const bountyCrimes = document.getElementById('custom-handout-bounty-crimes')?.value.trim() || '';

    const sealIcons = {
        crown: '👑', skull: '💀', arcane: '👁️', scales: '⚖️',
        daggers: '🗡️', dragon: '🐉', tree: '🌳', scroll: '📜', none: ''
    };
    const sealIcon = sealIcons[seal] || '📜';

    // Distinct contextual presets when fields are empty so live preview immediately reflects the chosen document type
    const typeDefaults = {
        letter: {
            title: 'Sealed Missive to Captain Drake',
            badge: '✉️ Sealed Missive',
            body: 'My Lord,\n\nOur house cannot abide another day of delay at the harbor. Deliver the sealed chest before midnight, and burn this missive upon reading.\n\nWith utmost discretion,\nCynthia'
        },
        journal: {
            title: 'Brother Thomas\'s Scorched Journal',
            badge: '📖 Torn Journal Page',
            body: 'Day 14 — The lower sanctuary has gone silent. We barred the crypt gates with iron spikes, but the dark water continues to rise through the cellar vents.'
        },
        bounty: {
            title: 'WANTED: The Shadow Broker',
            badge: '⚔️ Wanted Bounty Notice',
            body: 'Wanted alive or dead by decree of the High Magistrate. Known to frequent the dockside taverns under false aliases. Approach with extreme caution.'
        },
        cipher: {
            title: 'Smuggler\'s Dead Drop Cypher',
            badge: '🔒 Encrypted Cipher',
            body: 'The three casks of alchemical fire are secured beneath the loose flagstone by the mill wheel. Signal twice with the amber lantern when the patrol passes.'
        },
        scroll: {
            title: 'Ancient Sigil of Void Walking',
            badge: '✨ Magic Sigil Scroll',
            body: 'By the eternal sigil of the astral plane, let the boundaries between realms dissolve. Speak the unmaking words under the light of the eclipsed moon.'
        }
    };

    const currentPreset = typeDefaults[type] || typeDefaults.letter;
    const title = typedTitle || currentPreset.title;
    const rawContent = typedContent || currentPreset.body;

    let displayContent = rawContent;
    if (isCoded && !appState.previewDecipherState) {
        displayContent = applyCipher(rawContent, cipherType, cipherShift);
    }

    const paragraphs = displayContent.split('\n\n').map(p => `<p class="leading-relaxed mb-2.5">${escapeHTML(p).replace(/\n/g, '<br>')}</p>`).join('');

    container.className = `handout-paper-${theme} rounded-2xl p-5 shadow-2xl relative overflow-hidden transition-all duration-300 min-h-[360px] flex flex-col justify-between`;

    // Type-Specific Header Rendering
    let headerHTML = '';

    if (type === 'bounty') {
        headerHTML = `
            <div class="border-b-2 border-current/30 pb-2.5 text-center space-y-1">
                <span class="text-[9px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-black/15 font-bold inline-block">
                    ⚔️ OFFICIAL BOUNTY PROCLAMATION
                </span>
                <div class="font-display font-black text-2xl sm:text-3xl tracking-widest uppercase text-amber-900 dark:text-amber-200 drop-shadow-sm">
                    ⚔️ WANTED ⚔️
                </div>
                <h4 class="font-display font-extrabold text-base sm:text-lg tracking-wide uppercase opacity-95">
                    ${escapeHTML(title)}
                </h4>
                <div class="font-mono font-bold text-sm text-rose-700 dark:text-rose-400">
                    REWARD: ${escapeHTML(bountyReward || '500 Gold Pieces (Dead or Alive)')}
                </div>
                <div class="text-[11px] opacity-85 font-serif italic">
                    ${bountyCrimes ? `Charges: ${escapeHTML(bountyCrimes)}` : 'Charges: High Treason, Grand Larceny, Smuggling'}
                </div>
            </div>
        `;
    } else if (type === 'journal') {
        headerHTML = `
            <div class="border-b-2 border-dashed border-current/30 pb-2 flex items-start justify-between gap-2">
                <div>
                    <div class="flex items-center gap-2 text-[10px] font-mono opacity-80 uppercase tracking-wider">
                        <span>📖 TORN DIARY ENTRY</span>
                        ${date ? `<span>• 📅 ${escapeHTML(date)}</span>` : '<span>• 📅 Midnight Watch</span>'}
                    </div>
                    <h4 class="font-display font-bold text-lg sm:text-xl tracking-wide opacity-95 mt-0.5">
                        ${escapeHTML(title)}
                    </h4>
                    ${author ? `<div class="text-[11px] opacity-80 font-serif italic">Penned by ${escapeHTML(author)}</div>` : ''}
                </div>
                <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/10 border border-current/20 shrink-0">Page Frag.</span>
            </div>
        `;
    } else if (type === 'scroll') {
        headerHTML = `
            <div class="text-center pb-2 border-b border-current/20 space-y-0.5">
                <div class="text-xs font-mono tracking-[0.25em] opacity-80 py-0.5 text-indigo-500 dark:text-indigo-300">
                    ◈ ᚛ ᛟ ᚱ ᛞ ᚠ ᛊ ᚜ ◈
                </div>
                <span class="text-[9px] font-mono uppercase tracking-widest opacity-85">
                    ✨ ANCIENT MAGIC SCROLL ✨
                </span>
                <h4 class="font-display font-bold text-lg sm:text-xl tracking-wider opacity-95">
                    ${escapeHTML(title)}
                </h4>
            </div>
        `;
    } else if (type === 'cipher') {
        headerHTML = `
            <div class="border-b border-current/20 pb-2 flex items-start justify-between gap-2">
                <div>
                    <span class="text-[9px] font-mono uppercase tracking-widest opacity-80">🔒 ENCRYPTED MISSIVE</span>
                    <h4 class="font-display font-bold text-lg sm:text-xl tracking-wide opacity-95 mt-0.5">
                        ${escapeHTML(title)}
                    </h4>
                    ${(author || recipient) ? `
                        <div class="text-[11px] opacity-80 space-x-1.5 font-serif mt-0.5">
                            ${author ? `<span>From: <strong>${escapeHTML(author)}</strong></span>` : ''}
                            ${recipient ? `<span>• To: <strong>${escapeHTML(recipient)}</strong></span>` : ''}
                        </div>
                    ` : ''}
                </div>
                ${date ? `<span class="text-[10px] font-mono opacity-75 shrink-0">📅 ${escapeHTML(date)}</span>` : ''}
            </div>
        `;
    } else { // letter
        headerHTML = `
            <div class="border-b border-current/20 pb-2 flex items-start justify-between gap-2">
                <div>
                    <span class="text-[9px] font-mono uppercase tracking-widest opacity-75">✉️ SEALED MISSIVE</span>
                    <h4 class="font-display font-bold text-lg sm:text-xl tracking-wide opacity-95 mt-0.5">
                        ${escapeHTML(title)}
                    </h4>
                    ${(author || recipient) ? `
                        <div class="text-[11px] opacity-80 space-x-1.5 font-serif mt-0.5">
                            ${author ? `<span>From: <strong>${escapeHTML(author)}</strong></span>` : ''}
                            ${recipient ? `<span>• To: <strong>${escapeHTML(recipient)}</strong></span>` : ''}
                        </div>
                    ` : ''}
                </div>
                ${date ? `
                    <span class="text-[10px] font-mono opacity-75 shrink-0">
                        📅 ${escapeHTML(date)}
                    </span>
                ` : ''}
            </div>
        `;
    }

    container.innerHTML = `
        <div class="space-y-3 font-handout-${font}">
            <!-- Type-Specific Header -->
            ${headerHTML}

            <!-- Optional Cipher Banner (Always rendered when isCoded is true) -->
            ${isCoded ? `
                <div class="flex items-center justify-between text-[10px] px-2.5 py-1.5 rounded-lg ${appState.previewDecipherState ? 'bg-emerald-900/30 border border-emerald-700/50 text-emerald-800 dark:text-emerald-300' : 'bg-purple-900/30 border border-purple-700/50 text-purple-800 dark:text-purple-300'} font-mono">
                    <span class="flex items-center gap-1.5 font-bold">
                        <span>${appState.previewDecipherState ? '🔓' : '🔒'}</span>
                        <span>${appState.previewDecipherState ? 'DECIPHERED PREVIEW' : `ENCRYPTED CIPHER [DC ${cipherDC} INVESTIGATION]`}</span>
                    </span>
                    ${!appState.previewDecipherState && cipherHint ? `<span class="opacity-75 italic text-[10px]">${escapeHTML(cipherHint)}</span>` : ''}
                </div>
            ` : ''}

            <!-- Body -->
            <div class="text-xs sm:text-sm leading-relaxed max-h-[220px] overflow-y-auto pr-1">
                ${paragraphs}
            </div>

            ${type === 'scroll' ? `
                <div class="text-xs font-mono tracking-[0.25em] opacity-80 py-0.5 text-center text-indigo-500 dark:text-indigo-300 border-t border-current/20">
                    ◈ ᚛ ᛉ ᚳ ᛖ ᛗ ᚾ ᚹ ᚜ ◈
                </div>
            ` : ''}
        </div>

        <!-- Seal & Footer -->
        <div class="pt-2 border-t border-current/20 flex items-end justify-between gap-2 mt-3">
            <span class="text-[10px] opacity-75 italic font-serif">
                ${type === 'letter' ? '✉️ Delivered by courier' :
                  type === 'journal' ? '📓 Torn from leather binding' :
                  type === 'bounty' ? '⚖️ By order of the Town Magistrate' :
                  type === 'scroll' ? '✨ Sealed by arcane ward' :
                  '🔒 Shadow broker dead drop'}
            </span>
            ${seal !== 'none' ? `
                <div class="wax-seal wax-seal-${sealColor}" style="width: 44px; height: 44px;">
                    <div class="wax-seal-inner" style="width: 32px; height: 32px; font-size: 15px;">${sealIcon}</div>
                </div>
            ` : ''}
        </div>
    `;
}

async function saveCustomHandout(event) {
    if (event) event.preventDefault();

    const authorSel = document.getElementById('custom-handout-author-select');
    const authorInput = document.getElementById('custom-handout-author');
    const author = (authorSel?.value === '__custom__') ? (authorInput?.value.trim() || '') : (authorSel?.value || authorInput?.value.trim() || '');

    const recipSel = document.getElementById('custom-handout-recipient-select');
    const recipInput = document.getElementById('custom-handout-recipient');
    const recipient = (recipSel?.value === '__custom__') ? (recipInput?.value.trim() || '') : (recipSel?.value || recipInput?.value.trim() || '');

    const locSel = document.getElementById('custom-handout-location-select');
    const locInput = document.getElementById('custom-handout-location');
    const tiedLocation = (locSel?.value === '__custom__') ? (locInput?.value.trim() || '') : (locSel?.value || locInput?.value.trim() || '');

    const npcSel = document.getElementById('custom-handout-npc-select');
    const npcInput = document.getElementById('custom-handout-npc');
    const tiedNpc = (npcSel?.value === '__custom__') ? (npcInput?.value.trim() || '') : (npcSel?.value || npcInput?.value.trim() || '');

    const payload = {
        id: document.getElementById('custom-handout-id')?.value || undefined,
        title: document.getElementById('custom-handout-title')?.value.trim() || 'Untitled Handout',
        type: document.getElementById('custom-handout-type')?.value || 'letter',
        theme: document.getElementById('custom-handout-theme')?.value || 'parchment',
        fontStyle: document.getElementById('custom-handout-font')?.value || 'cursive',
        author: author,
        recipient: recipient,
        dateString: document.getElementById('custom-handout-date')?.value.trim() || '',
        content: document.getElementById('custom-handout-content')?.value.trim() || '',
        seal: document.getElementById('custom-handout-seal')?.value || 'crown',
        sealColor: document.getElementById('custom-handout-seal-color')?.value || 'red',
        isCoded: Boolean(document.getElementById('custom-handout-is-coded')?.checked),
        cipherType: document.getElementById('custom-handout-cipher-type')?.value || 'runic',
        cipherShift: 3,
        cipherHint: document.getElementById('custom-handout-cipher-hint')?.value.trim() || '',
        investigationDC: parseInt(document.getElementById('custom-handout-cipher-dc')?.value, 10) || 14,
        bountyReward: document.getElementById('custom-handout-bounty-reward')?.value.trim() || '',
        bountyCrimes: document.getElementById('custom-handout-bounty-crimes')?.value.trim() || '',
        tiedLocation: tiedLocation,
        tiedNpc: tiedNpc,
        sessionNotes: document.getElementById('custom-handout-notes')?.value.trim() || '',
        status: 'ready'
    };

    try {
        const res = await fetch('/api/handouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            appState.handouts = data.handouts;
            closeCustomHandoutModal();
            renderHandouts();
            showToast(`Handout "${payload.title}" saved!`, "success");
            return data.handout;
        } else {
            showToast("Failed to save handout.", "error");
        }
    } catch (e) {
        showToast("Error saving handout", "error");
    }
}

async function saveAndBroadcastHandout(event) {
    if (event) event.preventDefault();
    const saved = await saveCustomHandout(event);
    if (saved && saved.id) {
        await broadcastInWorldHandout(saved.id);
    }
}

async function deleteCustomHandout(id) {
    if (!confirm("Are you sure you want to delete this in-world handout?")) return;
    try {
        const res = await fetch(`/api/handouts/${id}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            appState.handouts = data.handouts;
            renderHandouts();
            showToast("Handout deleted.", "info");
        }
    } catch (e) {
        showToast("Error deleting handout", "error");
    }
}

async function toggleHandoutDecipher(id) {
    try {
        const res = await fetch(`/api/handouts/${id}/toggle-decipher`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            appState.handouts = data.handouts;
            renderHandouts();
            const h = data.handout;
            if (h && h.isDeciphered) {
                showToast(`Deciphered "${h.title}" for the table!`, "success");
                if (window.TabletopAudio && window.TabletopAudio.playBell) {
                    TabletopAudio.playBell();
                }
            } else {
                showToast(`Re-encrypted "${h.title}".`, "info");
            }
        }
    } catch (e) {
        showToast("Error toggling decipher state", "error");
    }
}

async function broadcastInWorldHandout(id) {
    try {
        const res = await fetch(`/api/handouts/${id}/broadcast`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            appState.broadcast = data.broadcast;
            renderBroadcastPill();
            showToast(`Broadcasted "${data.broadcast?.title}" to Player Screen!`, "success");
            if (window.TabletopAudio && window.TabletopAudio.playSecret) {
                TabletopAudio.playSecret();
            }
        } else {
            showToast("Failed to broadcast handout.", "error");
        }
    } catch (e) {
        showToast("Error broadcasting handout", "error");
    }
}

async function generateHandoutBatchPresets() {
    try {
        const res = await fetch('/api/handouts/batch-preset', { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            appState.handouts = data.handouts;
            renderHandouts();
            showToast(`Added ${data.added} campaign lore presets!`, "success");
        }
    } catch (e) {
        showToast("Error generating presets", "error");
    }
}

function rollQuickMissive() {
    const templates = [
        {
            title: "Desperate Extortion Demand",
            type: "letter",
            theme: "blood",
            font: "cursive",
            author: "A Friend in the Shadows",
            recipient: "Brog the Smith",
            date: "Third Watch",
            content: "We know where you hide the iron ledger. Bring fifty silver pieces to the south cistern before sunrise, or the High Magistrate receives the names of your suppliers.",
            seal: "daggers",
            sealColor: "black",
            isCoded: false
        },
        {
            title: "Dying Monk's Final Warning",
            type: "journal",
            theme: "burnt",
            font: "serif",
            author: "Brother Thomas",
            recipient: "Whomever Survives",
            date: "Midnight",
            content: "Do not unbar the lower sanctuary doors. The water did not put out the flame—it carried the drowned souls upward through the crypt vents. Burn the cedar incense or be taken.",
            seal: "skull",
            sealColor: "purple",
            isCoded: false
        },
        {
            title: "Smuggler's Dead Drop Cypher",
            type: "cipher",
            theme: "parchment",
            font: "typewriter",
            author: "Obsidian Quartermaster",
            recipient: "Silas",
            date: "New Moon",
            content: "The three casks of alchemical fire are secured beneath the loose flagstone by the mill wheel. Signal twice with the amber lantern when the patrol passes.",
            seal: "scales",
            sealColor: "gold",
            isCoded: true,
            cipherType: "runic",
            cipherDC: 13,
            cipherHint: "Dwarven dockworker cipher"
        }
    ];

    const pick = templates[Math.floor(Math.random() * templates.length)];
    openCustomHandoutModal();

    document.getElementById('custom-handout-title').value = pick.title;
    document.getElementById('custom-handout-type').value = pick.type;
    document.getElementById('custom-handout-theme').value = pick.theme;
    document.getElementById('custom-handout-font').value = pick.font;
    document.getElementById('custom-handout-author').value = pick.author;
    document.getElementById('custom-handout-recipient').value = pick.recipient;
    document.getElementById('custom-handout-date').value = pick.date;
    document.getElementById('custom-handout-content').value = pick.content;
    document.getElementById('custom-handout-seal').value = pick.seal;
    document.getElementById('custom-handout-seal-color').value = pick.sealColor;

    const isCodedBox = document.getElementById('custom-handout-is-coded');
    if (isCodedBox) isCodedBox.checked = pick.isCoded;
    if (pick.cipherType) document.getElementById('custom-handout-cipher-type').value = pick.cipherType;
    if (pick.cipherDC) document.getElementById('custom-handout-cipher-dc').value = pick.cipherDC;
    if (pick.cipherHint) document.getElementById('custom-handout-cipher-hint').value = pick.cipherHint;

    populateHandoutDropdowns(pick.author || '', pick.recipient || '', '', '');
    onHandoutTypeChanged();
    updateHandoutPreview();
    showToast(`Drafted quick missive: "${pick.title}"`, "info");
}

async function convertHandoutToRumor(id) {
    const h = (appState.handouts || []).find(item => item.id === id);
    if (!h) return;

    try {
        const payload = {
            text: `[Handout Lead] ${h.title}: ${h.content.slice(0, 150)}...`,
            source: h.author || 'Discovered Document',
            location: h.tiedLocation || 'In-World Artifact',
            veracity: 'True',
            active: true
        };
        const res = await fetch('/api/rumors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.rumors) appState.rumors = data.rumors;
            showToast(`Pinned "${h.title}" to Tavern Rumors corkboard!`, "success");
        }
    } catch (e) {
        showToast("Error creating rumor from handout", "error");
    }
}

// Global window exposure for In-World Handouts & Letters Engine
window.renderHandouts = renderHandouts;
window.filterHandouts = filterHandouts;
window.setHandoutStatusFilter = setHandoutStatusFilter;
window.openCustomHandoutModal = openCustomHandoutModal;
window.closeCustomHandoutModal = closeCustomHandoutModal;
window.onHandoutTypeChanged = onHandoutTypeChanged;
window.togglePreviewDecipherState = togglePreviewDecipherState;
window.updateHandoutPreview = updateHandoutPreview;
window.saveCustomHandout = saveCustomHandout;
window.saveAndBroadcastHandout = saveAndBroadcastHandout;
window.deleteCustomHandout = deleteCustomHandout;
window.toggleHandoutDecipher = toggleHandoutDecipher;
window.broadcastInWorldHandout = broadcastInWorldHandout;
window.generateHandoutBatchPresets = generateHandoutBatchPresets;
window.rollQuickMissive = rollQuickMissive;
window.convertHandoutToRumor = convertHandoutToRumor;
window.applyCipher = applyCipher;
window.getHandoutTypeBadge = getHandoutTypeBadge;
window.populateHandoutDropdowns = populateHandoutDropdowns;
window.onHandoutAuthorSelectChange = onHandoutAuthorSelectChange;
window.onHandoutRecipientSelectChange = onHandoutRecipientSelectChange;
window.onHandoutLocationSelectChange = onHandoutLocationSelectChange;
window.onHandoutNpcSelectChange = onHandoutNpcSelectChange;

// =============================================================================
// PHASE 4: IMMERSION, BROADCAST, PROCEDURAL AUDIO & BACKUP CONTROLLER
// =============================================================================

function openPlayerScreenWindow() {
    const url = (window.ArcaneScale && typeof window.ArcaneScale.getIsolatedUrl === 'function') 
        ? window.ArcaneScale.getIsolatedUrl('/player') 
        : '/player';
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.open_browser_window === 'function') {
        const fullUrl = window.location.origin + url;
        window.pywebview.api.open_browser_window(fullUrl);
        return;
    }
    window.open(url, 'ArcaneLedgerPlayer', 'width=1280,height=800,menubar=no,toolbar=no,location=no,status=no');
}

function openTabletopMapWindow() {
    const url = (window.ArcaneScale && typeof window.ArcaneScale.getIsolatedUrl === 'function') 
        ? window.ArcaneScale.getIsolatedUrl('/map') 
        : '/map';
    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.open_browser_window === 'function') {
        const fullUrl = window.location.origin + url;
        window.pywebview.api.open_browser_window(fullUrl);
        return;
    }
    window.open(url, 'ArcaneLedgerTabletopMap', 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no');
}


function openMapGeneratorModal() {
    if (window.BattlemapController && typeof window.BattlemapController.openMapGeneratorModal === 'function') {
        window.BattlemapController.openMapGeneratorModal();
    } else {
        openModal('map-generator-modal');
    }
}

function closeMapGeneratorModal() {
    if (window.BattlemapController && typeof window.BattlemapController.closeMapGeneratorModal === 'function') {
        window.BattlemapController.closeMapGeneratorModal();
    } else {
        closeModal('map-generator-modal');
    }
}

function renderBroadcastPill() {
    const pill = document.getElementById('active-broadcast-pill');
    const titleEl = document.getElementById('active-broadcast-title');
    if (!pill || !titleEl) return;
    if (appState.broadcast && appState.broadcast.active) {
        pill.classList.remove('hidden');
        pill.classList.add('flex');
        titleEl.innerText = appState.broadcast.title || 'Handout';
    } else {
        pill.classList.add('hidden');
        pill.classList.remove('flex');
    }
}

async function broadcastHandout(title, subtitle, content, type = 'handout', imageUrl = '') {
    const payload = {
        active: true,
        title: title || 'Tabletop Handout',
        subtitle: subtitle || '',
        content: content || '',
        type: type || 'handout',
        imageUrl: imageUrl || ''
    };
    try {
        const res = await fetch('/api/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            appState.broadcast = data.broadcast || payload;
            renderBroadcastPill();
            showToast(`Broadcasted "${title}" to Player Screen!`, "success");
            if (window.TabletopAudio) {
                TabletopAudio.playSecret();
            }
        } else {
            showToast("Failed to broadcast handout.", "error");
        }
    } catch (e) {
        console.error("Broadcast error:", e);
        showToast("Error sending broadcast.", "error");
    }
}

async function dismissBroadcast() {
    try {
        const res = await fetch('/api/broadcast/dismiss', { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            appState.broadcast = data.broadcast || { active: false };
            renderBroadcastPill();
            showToast("Dismissed broadcast from player display.", "info");
        }
    } catch (e) {
        console.error("Dismiss error:", e);
        showToast("Error dismissing broadcast.", "error");
    }
}

function broadcastCurrentMonster() {
    const monster = (appState.monsters || []).find(m => m.id === appState.selectedMonsterId) || (appState.monsters || [])[0];
    if (!monster) return;
    const sub = `${monster.size || 'Medium'} ${monster.type || 'Creature'} • CR ${monster.cr || '?'}`;
    let body = monster.description || '';
    if (!body && monster.traits && monster.traits.length > 0) {
        body = monster.traits.map(t => `${t.name}: ${t.desc}`).join('\n\n');
    }
    if (!body) body = "A dangerous creature appears before the adventuring party...";
    broadcastHandout(monster.name, sub, body, 'monster', monster.imageUrl || '');
}

function broadcastLocation(locId) {
    const loc = (appState.locations || []).find(l => l.id === locId);
    if (!loc) return;
    const sub = `${loc.type || 'Location'} • Danger: ${loc.danger || 'Low'}`;
    const body = (loc.summary || '') + (loc.description ? `\n\n${loc.description}` : '');
    broadcastHandout(loc.name, sub, body, 'location');
}

function broadcastRumor(rumorId) {
    const r = (appState.rumors || []).find(r => r.id === rumorId);
    if (!r) return;
    const sub = `Tavern Gossip • Source: ${r.source || 'Local Rumormonger'}${r.location ? ' • ' + r.location : ''}`;
    broadcastHandout("Rumor & Whispers", sub, `“${r.text}”`, 'lore');
}

function broadcastSessionNote(noteId) {
    const n = (appState.notes || []).find(note => note.id === noteId);
    if (!n) return;
    broadcastHandout(`Table Handout (#${(n.tag || 'general').toUpperCase()})`, `Logged: ${n.timestamp || 'Table Note'}`, n.text, 'note');
}

function broadcastQuest(questId) {
    const q = (appState.quests || []).find(quest => quest.id === questId);
    if (!q) return;
    const objText = (q.objectives || []).map(o => `${o.completed ? '☑' : '☐'} ${o.text}`).join('\n');
    const body = `${q.summary || ''}${objText ? '\n\nObjectives:\n' + objText : ''}`;
    broadcastHandout(q.title, `Quest Bounty • ${q.status}${q.reward ? ' • Reward: ' + q.reward : ''}`, body, 'quest');
}

function broadcastCurrentNPC() {
    if (!appState.currentNPC) return;
    const npc = appState.currentNPC;
    const title = `${npc.name} ${npc.epithet || ''}`.trim();
    const sub = `${npc.species} • ${npc.role} (${npc.category || 'NPC'})`;
    const body = `Appearance:\n${npc.appearance}\n\nVoice / Mannerisms:\n${npc.voice}\n\nFaction: ${npc.faction} (${npc.factionStanding})\nLocation: ${npc.location}`;
    broadcastHandout(title, sub, body, 'npc', npc.imageUrl || '');
}

// -----------------------------------------------------------------------------
// CUSTOM BROADCAST & HANDOUT MEDIA CONTROLLER
// -----------------------------------------------------------------------------
function openCustomBroadcastModal() {
    openModal('custom-broadcast-modal');
}

async function uploadBroadcastImageFile(input) {
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    showToast(`Uploading ${file.name}...`, "info");
    try {
        const res = await fetch('/api/images/upload', {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            const data = await res.json();
            const urlInput = document.getElementById('broadcast-input-image');
            if (urlInput) urlInput.value = data.url;
            showToast("Broadcast image uploaded!", "success");
        } else {
            showToast("Failed to upload image.", "error");
        }
    } catch (e) {
        console.error("Upload error:", e);
        showToast("Error uploading image.", "error");
    } finally {
        input.value = '';
    }
}

async function submitCustomBroadcast() {
    const title = (document.getElementById('broadcast-input-title').value || '').trim() || 'Notice';
    const subtitle = (document.getElementById('broadcast-input-subtitle').value || '').trim();
    const imageUrl = (document.getElementById('broadcast-input-image').value || '').trim();
    const content = (document.getElementById('broadcast-input-content').value || '').trim();
    const type = document.getElementById('broadcast-input-type').value || 'handout';

    await broadcastHandout(title, subtitle, content, type, imageUrl);
    closeModal('custom-broadcast-modal');
}

// -----------------------------------------------------------------------------
// NPC PORTRAIT MANAGEMENT
// -----------------------------------------------------------------------------
const NPC_PRESET_PORTRAITS = [
    { id: 'alchemist', label: 'Alchemist / Mage', url: '/static/images/npcs/alchemist.webp' },
    { id: 'assassin', label: 'Assassin / Rogue', url: '/static/images/npcs/assassin.webp' },
    { id: 'berserker', label: 'Berserker / Barbarian', url: '/static/images/npcs/berserker.webp' },
    { id: 'commoner', label: 'Commoner / Townsfolk', url: '/static/images/npcs/commoner.webp' },
    { id: 'druid', label: 'Druid / Ranger', url: '/static/images/npcs/druid.webp' },
    { id: 'gladiator', label: 'Gladiator / Fighter', url: '/static/images/npcs/gladiator.webp' },
    { id: 'guard', label: 'City Guard / Soldier', url: '/static/images/npcs/guard.webp' },
    { id: 'knight', label: 'Knight / Paladin', url: '/static/images/npcs/knight.webp' },
    { id: 'noble', label: 'Noble / Merchant', url: '/static/images/npcs/noble.webp' },
    { id: 'priest', label: 'Priest / Cleric', url: '/static/images/npcs/priest.webp' },
];

function getMatchingNpcPortrait(role, category) {
    const text = `${role || ''} ${category || ''}`.toLowerCase();
    if (text.match(/guard|soldier|watch|captain|sentinel|constable|patrol/)) return '/static/images/npcs/guard.webp';
    if (text.match(/knight|paladin|crusader|commander|cavalier|marshall/)) return '/static/images/npcs/knight.webp';
    if (text.match(/noble|lord|lady|king|queen|baron|duke|duchess|merchant|guildmaster|mayor|aristocrat/)) return '/static/images/npcs/noble.webp';
    if (text.match(/priest|cleric|bishop|acolyte|monk|shaman|healer|curate/)) return '/static/images/npcs/priest.webp';
    if (text.match(/druid|ranger|herbalist|hunter|scout|forester/)) return '/static/images/npcs/druid.webp';
    if (text.match(/alchemist|wizard|mage|sorcerer|warlock|artificer|sage|scholar|enchanter|witch/)) return '/static/images/npcs/alchemist.webp';
    if (text.match(/assassin|rogue|thief|spy|shadow|cutpurse|smuggler|informant/)) return '/static/images/npcs/assassin.webp';
    if (text.match(/berserker|barbarian|brawler|bandit|raider|pirate|thug|mercenary/)) return '/static/images/npcs/berserker.webp';
    if (text.match(/gladiator|fighter|champion|duelist|arena/)) return '/static/images/npcs/gladiator.webp';
    return '/static/images/npcs/commoner.webp';
}

function openChangeNpcPortraitModal() {
    const container = document.getElementById('npc-preset-portraits');
    const inputUrl = document.getElementById('npc-custom-portrait-url');
    const currentUrl = (appState.currentNPC && appState.currentNPC.imageUrl) || '/static/images/npcs/commoner.webp';
    if (inputUrl) inputUrl.value = currentUrl;

    if (container) {
        container.innerHTML = NPC_PRESET_PORTRAITS.map(p => {
            const isSelected = p.url === currentUrl;
            return `
                <button type="button" onclick="selectNpcPresetPortrait('${p.url}')" title="${p.label}" class="portrait-preset-btn flex flex-col items-center p-1 rounded-xl border-2 transition ${isSelected ? 'border-amber-400 bg-amber-500/20' : 'border-ledger-700 hover:border-slate-400 bg-ledger-900'}">
                    <img src="${p.url}" alt="${p.label}" class="w-12 h-12 rounded-lg object-contain">
                    <span class="text-[9px] text-slate-300 font-semibold truncate w-full text-center mt-1">${p.label.split(' / ')[0]}</span>
                </button>
            `;
        }).join('');
    }
    openModal('change-npc-portrait-modal');
}

function selectNpcPresetPortrait(url) {
    const inputUrl = document.getElementById('npc-custom-portrait-url');
    if (inputUrl) inputUrl.value = url;
    const buttons = document.querySelectorAll('.portrait-preset-btn');
    buttons.forEach(btn => {
        const img = btn.querySelector('img');
        if (img && img.getAttribute('src') === url) {
            btn.classList.add('border-amber-400', 'bg-amber-500/20');
            btn.classList.remove('border-ledger-700', 'bg-ledger-900');
        } else {
            btn.classList.remove('border-amber-400', 'bg-amber-500/20');
            btn.classList.add('border-ledger-700', 'bg-ledger-900');
        }
    });
}

async function uploadNpcPortraitFile(input) {
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    showToast(`Uploading ${file.name}...`, "info");
    try {
        const res = await fetch('/api/images/upload', {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            const data = await res.json();
            const urlInput = document.getElementById('npc-custom-portrait-url');
            if (urlInput) urlInput.value = data.url;
            showToast("NPC portrait uploaded!", "success");
        } else {
            showToast("Failed to upload image.", "error");
        }
    } catch (e) {
        console.error("Upload error:", e);
        showToast("Error uploading image.", "error");
    } finally {
        input.value = '';
    }
}

function applyNpcPortraitCustom() {
    const inputUrl = document.getElementById('npc-custom-portrait-url');
    const url = (inputUrl ? inputUrl.value.trim() : '') || '/static/images/npcs/commoner.webp';
    if (appState.currentNPC) {
        appState.currentNPC.imageUrl = url;
        const portraitEl = document.getElementById('npc-portrait-img');
        if (portraitEl) portraitEl.src = url;
    }
    closeModal('change-npc-portrait-modal');
    showToast("NPC portrait updated!", "success");
}

// -----------------------------------------------------------------------------
// MONSTER ARTWORK MANAGEMENT
// -----------------------------------------------------------------------------
function promptEditMonsterArt(monsterId) {
    const monster = (appState.monsters || []).find(m => m.id === monsterId);
    if (!monster) return;
    const idInput = document.getElementById('edit-monster-art-id');
    const nameEl = document.getElementById('edit-monster-art-name');
    const previewEl = document.getElementById('edit-monster-art-preview');
    const urlInput = document.getElementById('edit-monster-art-url');
    const defaultUrl = monster.imageUrl || `/static/images/monsters/${monster.id}.webp`;

    if (idInput) idInput.value = monster.id;
    if (nameEl) nameEl.innerText = monster.name;
    if (previewEl) previewEl.src = defaultUrl;
    if (urlInput) {
        urlInput.value = defaultUrl;
        urlInput.oninput = () => { if (previewEl) previewEl.src = urlInput.value; };
    }
    openModal('edit-monster-art-modal');
}

async function uploadMonsterArtFile(input) {
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    showToast(`Uploading ${file.name}...`, "info");
    try {
        const res = await fetch('/api/images/upload', {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            const data = await res.json();
            const urlInput = document.getElementById('edit-monster-art-url');
            const previewEl = document.getElementById('edit-monster-art-preview');
            if (urlInput) urlInput.value = data.url;
            if (previewEl) previewEl.src = data.url;
            showToast("Monster artwork uploaded!", "success");
        } else {
            showToast("Failed to upload artwork.", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Error uploading artwork.", "error");
    } finally {
        input.value = '';
    }
}

function saveMonsterArtCustom() {
    const idInput = document.getElementById('edit-monster-art-id');
    const urlInput = document.getElementById('edit-monster-art-url');
    if (!idInput || !urlInput) return;
    const id = idInput.value;
    const url = urlInput.value.trim();
    const monster = (appState.monsters || []).find(m => m.id === id);
    if (monster) {
        monster.imageUrl = url;
        if (appState.selectedMonsterId === id) {
            renderMonsterStatblock(monster);
        }
        showToast(`Artwork updated for ${monster.name}!`, "success");
    }
    closeModal('edit-monster-art-modal');
}

// -----------------------------------------------------------------------------
// MULTI-TRACK AUDIO MIXER & SCENE PRESETS CONTROLLER
// -----------------------------------------------------------------------------
function renderAudioMixer() {
    renderAudioPresets();
    renderAudioTracks();
    updateActiveLayersSummary();
}

function renderAudioPresets() {
    const grid = document.getElementById('audio-presets-grid');
    if (!grid) return;
    const presets = appState.audioPresets || [];
    if (presets.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-4 text-slate-500 text-xs italic">No scene presets configured.</div>`;
        return;
    }
    grid.innerHTML = presets.map(p => {
        const isActive = appState.activeAudioPresetId === p.id;
        const layerCount = Object.keys(p.layers || {}).length;
        const isBuiltin = ['preset-tavern', 'preset-camp', 'preset-stormy-crypt', 'preset-arcane-sanctum', 'preset-combat-boss', 'preset-creeping-dread'].includes(p.id);

        const l = p.lighting || {};
        const overheadB = l.overhead ? l.overhead.brightness : (p.id === 'preset-creeping-dread' ? 15 : (p.id === 'preset-camp' ? 30 : 45));
        const atm = l.atmosphere || {};
        const atmColor = atm.color || '#FFA03C';
        const atmEffect = atm.effect || 'fire';
        const atmB = atm.brightness !== undefined ? atm.brightness : 70;

        return `
            <div class="relative group bg-ledger-900 border ${isActive ? 'border-amber-400 bg-amber-950/20 shadow-md shadow-amber-500/20' : 'border-ledger-700/80 hover:border-ledger-600'} rounded-xl p-3 flex flex-col justify-between transition">
                <div>
                    <div class="flex items-center justify-between mb-1.5">
                        <span class="text-2xl">${escapeHTML(p.icon || '✨')}</span>
                        <div class="flex items-center gap-1">
                            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ledger-950 text-slate-400 border border-ledger-800">${layerCount} ${layerCount === 1 ? 'audio' : 'audio'}</span>
                            ${!isBuiltin ? `<button onclick="deleteAudioPreset('${p.id}')" title="Delete Preset" class="text-slate-500 hover:text-rose-400 p-0.5 text-xs">✕</button>` : ''}
                        </div>
                    </div>
                    <h4 class="font-display font-bold text-xs text-slate-200">${escapeHTML(p.name)}</h4>
                    <p class="text-[10px] text-slate-400 line-clamp-2 mt-0.5 leading-snug">${escapeHTML(p.description || '')}</p>

                    <!-- Combined Lighting Preview Badges -->
                    <div class="mt-2.5 pt-2 border-t border-ledger-800/80 flex items-center justify-between text-[9px] font-mono">
                        <div class="flex items-center gap-1 text-slate-400" title="Overhead Table Reading Light (60d S)">
                            <span>🎲</span>
                            <span>Table: <strong class="text-amber-400">${overheadB}%</strong></span>
                        </div>
                        <div class="flex items-center gap-1 text-slate-400" title="Scene Atmosphere & Mood (Ace 25c)">
                            <span class="w-2.5 h-2.5 rounded-full inline-block shadow-sm" style="background-color: ${atmColor}"></span>
                            <span class="capitalize">${escapeHTML(atmEffect)}: <strong class="text-indigo-400">${atmB}%</strong></span>
                        </div>
                    </div>
                </div>
                <button onclick="triggerQuickPreset('${p.id}')" class="mt-3 w-full py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${isActive ? 'bg-amber-500 text-ledger-950 shadow' : 'bg-ledger-800 hover:bg-amber-500 hover:text-ledger-950 text-amber-300 border border-ledger-700'}">
                    <span>${isActive ? '🎭 Active Scene' : '▶ Blend Scene'}</span>
                </button>
            </div>
        `;
    }).join('');
}

function renderAudioTracks() {
    const grid = document.getElementById('audio-mixer-grid');
    if (!grid) return;
    const cat = appState.audioActiveCategory || 'all';
    const tracks = (appState.audioLibrary || []).filter(t => cat === 'all' || t.category === cat);
    if (tracks.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 text-xs italic">No tracks found in category "${cat}".</div>`;
        return;
    }
    grid.innerHTML = tracks.map(t => {
        const engineTrack = (window.AudioEngine && window.AudioEngine.tracks[t.id]) || {};
        const isPlaying = !!engineTrack.isPlaying;
        const volume = engineTrack.volume !== undefined ? engineTrack.volume : (t.defaultVolume || 0.5);
        const volPercent = Math.round(volume * 100);
        const isCustom = t.category === 'Custom' || t.id.startsWith('track-');

        return `
            <div id="track-card-${t.id}" class="bg-ledger-900 border ${isPlaying ? 'border-emerald-500/70 shadow-lg shadow-emerald-950/40' : 'border-ledger-800 hover:border-ledger-700'} rounded-2xl p-4 flex flex-col justify-between transition">
                <div>
                    <!-- Header -->
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="text-2xl">${escapeHTML(t.icon || '🎵')}</span>
                            <div class="min-w-0">
                                <h4 class="font-bold text-xs text-slate-200 truncate">${escapeHTML(t.name)}</h4>
                                <span class="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-ledger-950 text-slate-400 border border-ledger-800 font-mono">${escapeHTML(t.category)}</span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1">
                            ${isPlaying ? '<span class="flex h-2 w-2 relative"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span>' : ''}
                            ${isCustom ? `<button onclick="deleteAudioTrack('${t.id}')" title="Delete Track" class="text-slate-500 hover:text-rose-400 p-1 text-xs">✕</button>` : ''}
                        </div>
                    </div>
                </div>

                <!-- Controls -->
                <div class="space-y-3 mt-2 pt-2 border-t border-ledger-800/80">
                    <!-- Volume Slider -->
                    <div>
                        <div class="flex justify-between items-center text-[10px] text-slate-400 mb-1 font-mono">
                            <span>Layer Volume</span>
                            <span id="track-vol-text-${t.id}" class="font-bold text-slate-200">${volPercent}%</span>
                        </div>
                        <input type="range" min="0" max="100" value="${volPercent}" oninput="setAudioTrackVolume('${t.id}', this.value)" class="w-full h-1.5 bg-ledger-950 rounded-lg accent-amber-500 cursor-pointer">
                    </div>

                    <!-- Play / Pause Button -->
                    <button onclick="toggleAudioTrack('${t.id}')" class="w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm ${isPlaying ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-ledger-800 hover:bg-ledger-700 text-slate-200 border border-ledger-700'}">
                        <span>${isPlaying ? '⏸️ Pause Layer' : '▶️ Play Layer'}</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function updateActiveLayersSummary() {
    const summaryEl = document.getElementById('active-layers-summary');
    if (!summaryEl) return;
    if (!window.AudioEngine) {
        summaryEl.innerText = "None (Silence)";
        return;
    }
    const active = [];
    Object.keys(window.AudioEngine.tracks).forEach(id => {
        const t = window.AudioEngine.tracks[id];
        if (t.isPlaying && t.volume > 0) {
            const trackDef = (appState.audioLibrary || []).find(l => l.id === id) || { name: id };
            active.push(`${trackDef.name} (${Math.round(t.volume * 100)}%)`);
        }
    });
    if (active.length === 0) {
        summaryEl.innerText = "None (Silence)";
    } else {
        summaryEl.innerText = active.join(' • ');
    }
}

function filterAudioCategory(cat) {
    appState.audioActiveCategory = cat;
    document.querySelectorAll('.cat-pill').forEach(btn => {
        if (btn.id === `cat-filter-${cat}`) {
            btn.classList.add('bg-amber-500', 'text-ledger-950', 'font-bold');
            btn.classList.remove('bg-ledger-900', 'text-slate-400', 'border');
        } else {
            btn.classList.remove('bg-amber-500', 'text-ledger-950', 'font-bold');
            btn.classList.add('bg-ledger-900', 'text-slate-400', 'border');
        }
    });
    renderAudioTracks();
}

function toggleAudioTrack(trackId) {
    if (!window.AudioEngine) return;
    window.AudioEngine.toggleTrack(trackId);
    renderAudioTracks();
    renderAudioPresets();
    updateActiveLayersSummary();
}

function setAudioTrackVolume(trackId, val) {
    const num = parseFloat(val) / 100;
    if (window.AudioEngine) {
        window.AudioEngine.setTrackVolume(trackId, num);
    }
    const textEl = document.getElementById(`track-vol-text-${trackId}`);
    if (textEl) textEl.innerText = `${val}%`;
    updateActiveLayersSummary();
}

function setMasterMixerVolume(val) {
    const num = parseFloat(val) / 100;
    if (window.AudioEngine) {
        window.AudioEngine.setMasterVolume(num);
    }
    const mixerSlider = document.getElementById('mixer-master-slider');
    const ribbonSlider = document.getElementById('ribbon-master-volume');
    const masterVal = document.getElementById('mixer-master-val');
    if (mixerSlider) mixerSlider.value = val;
    if (ribbonSlider) ribbonSlider.value = val;
    if (masterVal) masterVal.innerText = `${val}%`;
}

function stopAllAudio() {
    if (window.AudioEngine) {
        window.AudioEngine.stopAll();
    }
    appState.activeAudioPresetId = null;
    const topPresetLabel = document.getElementById('topbar-audio-preset');
    if (topPresetLabel) topPresetLabel.textContent = 'Silence';
    renderAudioMixer();
    showToast("All audio layers silenced.", "info");
}

function fadeAllAudio() {
    if (window.AudioEngine) {
        showToast("Fading out audio layers...", "info");
        window.AudioEngine.fadeAll(() => {
            appState.activeAudioPresetId = null;
            const topPresetLabel = document.getElementById('topbar-audio-preset');
            if (topPresetLabel) topPresetLabel.textContent = 'Silence';
            renderAudioMixer();
        });
    }
}

function triggerQuickPreset(presetId) {
    const preset = (appState.audioPresets || []).find(p => p.id === presetId);
    if (!preset) return;

    // 1. Audio layers
    if (window.AudioEngine) {
        window.AudioEngine.applyPreset(preset);
    }

    // 2. Lighting configuration
    if (window.LightingEngine) {
        if (preset.lighting) {
            // Channel 1: Overhead 60d S
            if (preset.lighting.overhead && preset.lighting.overhead.brightness !== undefined) {
                window.LightingEngine.setOverheadBrightness(preset.lighting.overhead.brightness);
            }
            // Channel 2: Atmosphere Ace 25c Group
            if (preset.lighting.atmosphere) {
                window.LightingEngine.applyAtmosphereConfig(preset.lighting.atmosphere, presetId);
            }
        } else {
            // Fallback for presets without lighting object
            window.LightingEngine.applyPreset(presetId);
        }
    }

    appState.activeAudioPresetId = presetId;
    const topPresetLabel = document.getElementById('topbar-audio-preset');
    if (topPresetLabel) topPresetLabel.textContent = preset.name || 'Active';
    renderAudioMixer();
    showToast(`Atmosphere & Lighting: "${preset.name}" Active!`, "info");
}

function openSavePresetModal() {
    openModal('save-preset-modal');
    
    // Auto-populate with current live lighting values
    if (window.LightingEngine) {
        const ob = window.LightingEngine.state.overhead.brightness;
        const ab = window.LightingEngine.state.atmosphere.brightness;
        const hex = window.LightingEngine._rgbToHex(window.LightingEngine.state.atmosphere.rgb);
        const eff = window.LightingEngine.state.atmosphere.effect || 'fire';

        const oSlider = document.getElementById('new-preset-overhead-slider');
        const oVal = document.getElementById('new-preset-overhead-val');
        const aSlider = document.getElementById('new-preset-atm-slider');
        const aVal = document.getElementById('new-preset-atm-val');
        const aColor = document.getElementById('new-preset-atm-color');
        const aEffect = document.getElementById('new-preset-atm-effect');

        if (oSlider) oSlider.value = ob;
        if (oVal) oVal.textContent = `${ob}%`;
        if (aSlider) aSlider.value = ab;
        if (aVal) aVal.textContent = `${ab}%`;
        if (aColor) aColor.value = hex;
        if (aEffect) aEffect.value = eff;
    }
}

async function saveCurrentMixAsPreset() {
    const nameInput = document.getElementById('new-preset-name') || document.getElementById('preset-name');
    const descInput = document.getElementById('new-preset-desc') || document.getElementById('preset-desc');
    const iconInput = document.getElementById('new-preset-icon') || document.getElementById('preset-icon');
    const name = nameInput ? nameInput.value.trim() : '';
    const desc = (descInput ? descInput.value.trim() : '') || 'Custom layered scene atmosphere';
    const icon = (iconInput ? iconInput.value.trim() : '') || '✨';
    if (!name) {
        showToast("Please enter a preset name.", "error");
        return;
    }

    // Capture active audio layers
    const layers = {};
    if (window.AudioEngine && Array.isArray(window.AudioEngine.tracks)) {
        window.AudioEngine.tracks.forEach(t => {
            if (t.active && t.volume > 0) {
                layers[t.id] = Math.round(t.volume * 100) / 100;
            }
        });
    }

    // Capture current lighting settings
    const overheadB = parseInt(document.getElementById('new-preset-overhead-slider')?.value || (window.LightingEngine?.state?.overhead?.brightness ?? 45));
    const atmB = parseInt(document.getElementById('new-preset-atm-slider')?.value || (window.LightingEngine?.state?.atmosphere?.brightness ?? 70));
    const atmColor = document.getElementById('new-preset-atm-color')?.value || (window.LightingEngine?._rgbToHex(window.LightingEngine.state.atmosphere.rgb) || '#FFA03C');
    const atmEffect = document.getElementById('new-preset-atm-effect')?.value || (window.LightingEngine?.state?.atmosphere?.effect || 'fire');

    const newPreset = {
        id: 'preset-' + Date.now(),
        name: name,
        icon: icon,
        description: desc,
        layers: layers,
        lighting: {
            overhead: {
                brightness: overheadB
            },
            atmosphere: {
                brightness: atmB,
                color: atmColor,
                cct: 2500,
                mode: "rgb",
                effect: atmEffect
            }
        }
    };

    appState.audioPresets.push(newPreset);
    try {
        const res = await fetch('/api/audio/presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appState.audioPresets)
        });
        if (res.ok) {
            closeModal('save-preset-modal');
            if (nameInput) nameInput.value = '';
            if (descInput) descInput.value = '';
            renderAudioMixer();
            showToast(`Scene Preset "${name}" saved with audio & lighting!`, "success");
        } else {
            showToast("Failed to save preset to server.", "error");
        }
    } catch (e) {
        console.error("Save preset error:", e);
        showToast("Error saving preset.", "error");
    }
}

async function deleteAudioPreset(presetId) {
    if (!confirm("Are you sure you want to remove this preset?")) return;
    appState.audioPresets = appState.audioPresets.filter(p => p.id !== presetId);
    try {
        const res = await fetch('/api/audio/presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(appState.audioPresets)
        });
        if (res.ok) {
            renderAudioPresets();
            showToast("Preset removed.", "info");
        }
    } catch (e) {
        console.error(e);
        showToast("Error deleting preset.", "error");
    }
}

function triggerAudioUpload() {
    const input = document.getElementById('audio-file-input');
    if (input) input.click();
}

async function handleAudioFileUpload(input) {
    if (!input || !input.files || input.files.length === 0) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    showToast(`Uploading ${file.name}...`, "info");

    try {
        const res = await fetch('/api/audio/upload', {
            method: 'POST',
            body: formData
        });
        if (res.ok) {
            const data = await res.json();
            const trackName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
            const newTrack = {
                id: 'track-' + Date.now(),
                name: trackName.charAt(0).toUpperCase() + trackName.slice(1),
                category: 'Custom',
                icon: '🎧',
                url: data.url,
                defaultVolume: 0.5
            };
            const saveRes = await fetch('/api/audio/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTrack)
            });
            if (saveRes.ok) {
                const sdata = await saveRes.json();
                appState.audioLibrary = sdata.library || [...appState.audioLibrary, newTrack];
                if (window.AudioEngine) {
                    window.AudioEngine.loadTracks(appState.audioLibrary);
                }
                renderAudioTracks();
                showToast(`Uploaded and added "${newTrack.name}"!`, "success");
            }
        } else {
            showToast("Failed to upload audio file.", "error");
        }
    } catch (e) {
        console.error("Audio upload error:", e);
        showToast("Error uploading audio file.", "error");
    } finally {
        input.value = '';
    }
}

async function submitCustomAudioTrack() {
    const name = (document.getElementById('custom-track-name').value || '').trim();
    const cat = document.getElementById('custom-track-category').value;
    const icon = (document.getElementById('custom-track-icon').value || '').trim() || '🎵';
    const url = (document.getElementById('custom-track-url').value || '').trim();

    if (!name || !url) {
        showToast("Please enter a track name and audio URL.", "error");
        return;
    }

    const newTrack = {
        id: 'track-' + Date.now(),
        name: name,
        category: cat,
        icon: icon,
        url: url,
        defaultVolume: 0.5
    };

    try {
        const res = await fetch('/api/audio/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTrack)
        });
        if (res.ok) {
            const data = await res.json();
            appState.audioLibrary = data.library || [...appState.audioLibrary, newTrack];
            if (window.AudioEngine) {
                window.AudioEngine.loadTracks(appState.audioLibrary);
            }
            closeModal('add-track-modal');
            document.getElementById('custom-track-name').value = '';
            document.getElementById('custom-track-url').value = '';
            renderAudioTracks();
            showToast(`Track "${name}" added to library!`, "success");
        } else {
            showToast("Failed to add track.", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Error saving audio track.", "error");
    }
}

async function deleteAudioTrack(trackId) {
    if (!confirm("Remove this track from your audio library?")) return;
    try {
        const res = await fetch(`/api/audio/track/${encodeURIComponent(trackId)}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            if (window.AudioEngine && window.AudioEngine.tracks[trackId]) {
                window.AudioEngine.pauseTrack(trackId);
                delete window.AudioEngine.tracks[trackId];
            }
            appState.audioLibrary = appState.audioLibrary.filter(t => t.id !== trackId);
            renderAudioTracks();
            updateActiveLayersSummary();
            showToast("Track removed from library.", "info");
        }
    } catch (e) {
        console.error(e);
        showToast("Error deleting track.", "error");
    }
}

async function restoreSrdCompendiums() {
    if (!confirm("This will restore all default 5.5e SRD Bestiary monsters (330+), Spells (340+), Items (128+), and 2024 Core Rules from the app installation bundle. Continue?")) {
        return;
    }
    try {
        showToast("Restoring 5.5e SRD compendiums from bundle...", "info");
        const res = await fetch('/api/compendium/restore-srd', { method: 'POST' });
        const result = await res.json();
        if (result.success) {
            const stateRes = await fetch('/api/state');
            if (stateRes.ok) {
                const newState = await stateRes.json();
                appState.monsters = newState.monsters || [];
                appState.spells = newState.spells || [];
                appState.items = newState.items || [];
                appState.rules = newState.rules || {};

                if (typeof renderBestiary === 'function') renderBestiary();
                if (typeof renderBestiaryList === 'function') renderBestiaryList();
                if (typeof renderSpellsView === 'function') renderSpellsView();
                if (typeof renderItemsView === 'function') renderItemsView();
                if (typeof renderRulesScreen === 'function') renderRulesScreen();
            }
            showToast("Successfully restored 5.5e SRD monsters, spells, items, and rules!", "success");
        } else {
            showToast("Failed to restore SRD compendiums: " + (result.detail || "Unknown error"), "error");
        }
    } catch (e) {
        showToast("Error connecting to server: " + e.message, "error");
    }
}

function openBackupModal() {
    openModal('backup-modal');
    loadSnapshotsList();
}

async function loadSnapshotsList() {
    const listEl = document.getElementById('snapshots-list');
    if (!listEl) return;
    listEl.innerHTML = `<div class="text-center py-4 text-slate-500 italic text-xs">Loading snapshots...</div>`;
    try {
        const res = await fetch('/api/backup/snapshots');
        if (res.ok) {
            const data = await res.json();
            const snapshots = data.snapshots || [];
            if (snapshots.length === 0) {
                listEl.innerHTML = `
                    <div class="p-4 text-center border border-dashed border-ledger-800 rounded-lg text-slate-500 text-xs italic">
                        No snapshots yet. Enter a label above and click "Save Checkpoint".
                    </div>`;
                return;
            }
            listEl.innerHTML = snapshots.map(s => {
                const sizeKb = (s.size / 1024).toFixed(1);
                return `
                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-ledger-900 border border-ledger-800 hover:border-ledger-700 transition">
                        <div class="flex-1 min-w-0 pr-2">
                            <p class="font-bold text-slate-200 text-xs truncate">${escapeHTML(s.filename)}</p>
                            <p class="text-[10px] text-slate-400 font-mono">${escapeHTML(s.modified)} • ${sizeKb} KB</p>
                        </div>
                        <button onclick="restoreSnapshot('${escapeHTML(s.filename)}')" class="px-3 py-1 rounded bg-ledger-800 hover:bg-amber-500 hover:text-ledger-950 text-amber-300 border border-ledger-700 text-xs font-bold transition flex items-center gap-1">
                            <span>🔄</span>
                            <span>Restore</span>
                        </button>
                    </div>`;
            }).join('');
        } else {
            listEl.innerHTML = `<div class="p-3 text-center text-rose-400 text-xs">Failed to load snapshots.</div>`;
        }
    } catch (e) {
        console.error("Snapshots error:", e);
        listEl.innerHTML = `<div class="p-3 text-center text-rose-400 text-xs">Error connecting to server.</div>`;
    }
}

async function createCampaignSnapshot() {
    const input = document.getElementById('snapshot-label-input');
    const label = input ? input.value.trim() : '';
    try {
        const res = await fetch('/api/backup/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label: label })
        });
        if (res.ok) {
            const data = await res.json();
            if (input) input.value = '';
            showToast(`Checkpoint created: ${data.filename}`, "success");
            loadSnapshotsList();
        } else {
            showToast("Failed to create snapshot.", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Error creating snapshot.", "error");
    }
}

async function restoreSnapshot(filename) {
    if (!confirm(`Are you sure you want to restore "${filename}"?\n\nThis will replace all current campaign data with the checkpoint state.`)) {
        return;
    }
    try {
        const res = await fetch('/api/backup/restore', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: filename })
        });
        if (res.ok) {
            showToast(`Campaign restored from ${filename}!`, "success");
            await fetchFullState();
            renderPartyHUD();
            renderCombatTracker();
            renderCurrentNPC();
            renderRoster();
            renderRulesScreen();
            renderTimeWeatherHUD();
            renderSessionNotes();
            renderBestiary();
            renderWorldView();
            closeModal('backup-modal');
        } else {
            showToast("Failed to restore snapshot.", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Error restoring snapshot.", "error");
    }
}

// -----------------------------------------------------------------------------
// PHASE 5: 2024 ENCOUNTER BUILDER & XP DIFFICULTY CALCULATOR
// -----------------------------------------------------------------------------

// 2024 Encounter XP Thresholds per Character Level (from 2024 DMG)
const ENCOUNTER_XP_BUDGET_2024 = {
    1: { low: 50, moderate: 100, high: 150, deadly: 200 },
    2: { low: 100, moderate: 200, high: 300, deadly: 400 },
    3: { low: 150, moderate: 300, high: 450, deadly: 600 },
    4: { low: 250, moderate: 500, high: 750, deadly: 1000 },
    5: { low: 500, moderate: 1000, high: 1500, deadly: 2200 },
    6: { low: 600, moderate: 1200, high: 1800, deadly: 2600 },
    7: { low: 750, moderate: 1500, high: 2250, deadly: 3400 },
    8: { low: 900, moderate: 1800, high: 2700, deadly: 4200 },
    9: { low: 1100, moderate: 2200, high: 3300, deadly: 5200 },
    10: { low: 1300, moderate: 2600, high: 3900, deadly: 6400 },
    11: { low: 1600, moderate: 3200, high: 4800, deadly: 8000 },
    12: { low: 2000, moderate: 4000, high: 6000, deadly: 9600 },
    13: { low: 2400, moderate: 4800, high: 7200, deadly: 11500 },
    14: { low: 2800, moderate: 5600, high: 8400, deadly: 13500 },
    15: { low: 3500, moderate: 7000, high: 10500, deadly: 16500 },
    16: { low: 4200, moderate: 8400, high: 12600, deadly: 20000 },
    17: { low: 5200, moderate: 10400, high: 15600, deadly: 25000 },
    18: { low: 6300, moderate: 12600, high: 18900, deadly: 30000 },
    19: { low: 7500, moderate: 15000, high: 22500, deadly: 36000 },
    20: { low: 9000, moderate: 18000, high: 27000, deadly: 44000 }
};

function calculatePartyEncounterThresholds() {
    const party = appState.party || [];
    let totals = { low: 0, moderate: 0, high: 0, deadly: 0 };
    if (party.length === 0) {
        totals = { low: 2000, moderate: 4000, high: 6000, deadly: 8800 };
        return { count: 4, avgLevel: 5, totals };
    }
    let sumLevels = 0;
    party.forEach(pc => {
        const lvl = Math.max(1, Math.min(20, pc.level || 1));
        sumLevels += lvl;
        const budget = ENCOUNTER_XP_BUDGET_2024[lvl] || ENCOUNTER_XP_BUDGET_2024[1];
        totals.low += budget.low;
        totals.moderate += budget.moderate;
        totals.high += budget.high;
        totals.deadly += budget.deadly;
    });
    return {
        count: party.length,
        avgLevel: Math.round(sumLevels / party.length),
        totals
    };
}

function calculateCurrentEncounterXP() {
    const staged = appState.stagedEncounter || [];
    let totalXp = 0;
    let totalCount = 0;
    staged.forEach(item => {
        const m = appState.monsters.find(x => x.id === item.monsterId);
        if (m) {
            const xp = parseInt(m.xp) || 0;
            totalXp += xp * item.count;
            totalCount += item.count;
        }
    });
    return { totalXp, totalCount };
}

function renderEncountersView() {
    const partyInfo = calculatePartyEncounterThresholds();
    
    const countEl = document.getElementById('enc-party-count');
    if (countEl) countEl.textContent = `${partyInfo.count} Heroes (Avg Lvl ${partyInfo.avgLevel})`;
    
    const lowEl = document.getElementById('enc-thresh-low');
    const modEl = document.getElementById('enc-thresh-mod');
    const highEl = document.getElementById('enc-thresh-high');
    const deadlyEl = document.getElementById('enc-thresh-deadly');
    if (lowEl) lowEl.textContent = `${partyInfo.totals.low.toLocaleString()} XP`;
    if (modEl) modEl.textContent = `${partyInfo.totals.moderate.toLocaleString()} XP`;
    if (highEl) highEl.textContent = `${partyInfo.totals.high.toLocaleString()} XP`;
    if (deadlyEl) deadlyEl.textContent = `${partyInfo.totals.deadly.toLocaleString()} XP`;

    const { totalXp, totalCount } = calculateCurrentEncounterXP();
    const xpEl = document.getElementById('enc-total-xp');
    if (xpEl) xpEl.textContent = `${totalXp.toLocaleString()} XP`;

    const countLabel = document.getElementById('enc-total-monsters');
    if (countLabel) countLabel.textContent = `(${totalCount} Creature${totalCount === 1 ? '' : 's'})`;

    const perPlayerEl = document.getElementById('enc-per-player-xp');
    if (perPlayerEl) {
        const perPc = partyInfo.count > 0 ? Math.round(totalXp / partyInfo.count) : totalXp;
        perPlayerEl.textContent = `${perPc.toLocaleString()} XP per hero`;
    }

    const badgeEl = document.getElementById('enc-difficulty-badge');
    const barEl = document.getElementById('enc-xp-bar');
    let rating = "Trivial";
    let badgeClass = "bg-slate-800 text-slate-300 border-slate-700";
    let barColor = "bg-slate-500";
    
    const t = partyInfo.totals;
    if (totalXp === 0) {
        rating = "Trivial";
        badgeClass = "bg-slate-800 text-slate-300 border-slate-700";
        barColor = "bg-slate-500";
    } else if (totalXp < t.low) {
        rating = "Very Easy";
        badgeClass = "bg-emerald-950 text-emerald-400 border-emerald-700";
        barColor = "bg-emerald-400";
    } else if (totalXp < t.moderate) {
        rating = "Low";
        badgeClass = "bg-emerald-900 text-emerald-300 border-emerald-600";
        barColor = "bg-emerald-500";
    } else if (totalXp < t.high) {
        rating = "Moderate";
        badgeClass = "bg-sky-950 text-sky-300 border-sky-600";
        barColor = "bg-sky-500";
    } else if (totalXp < t.deadly) {
        rating = "High";
        badgeClass = "bg-amber-950 text-amber-300 border-amber-600";
        barColor = "bg-amber-500";
    } else {
        rating = "💀 Deadly";
        badgeClass = "bg-rose-950 text-rose-300 border-rose-600 animate-pulse";
        barColor = "bg-rose-600";
    }

    if (badgeEl) {
        badgeEl.textContent = rating;
        badgeEl.className = `px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase border ${badgeClass}`;
    }

    if (barEl) {
        const pct = t.deadly > 0 ? Math.min(100, Math.round((totalXp / t.deadly) * 100)) : 0;
        barEl.style.width = `${pct}%`;
        barEl.className = `h-full ${barColor} transition-all duration-300`;
    }

    renderStagedMonsters();
    renderEncounterTemplates();
    renderEncounterMonsterPicker();
}

function renderStagedMonsters() {
    const container = document.getElementById('enc-staged-list');
    if (!container) return;

    const staged = appState.stagedEncounter || [];
    if (staged.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 italic py-1">No monsters staged yet. Click "+ Add" on any 2024 creature below.</p>`;
        return;
    }

    container.innerHTML = staged.map(item => {
        const m = appState.monsters.find(x => x.id === item.monsterId);
        if (!m) return '';
        const xpEach = parseInt(m.xp) || 0;
        const subtotal = xpEach * item.count;
        const tokenUrl = m.imageUrl || `/static/images/monsters/${m.id}.webp`;

        return `
            <div class="flex items-center gap-2 bg-ledger-950 border border-ledger-700/80 rounded-xl px-2.5 py-1.5 text-xs shadow-sm">
                <img src="${tokenUrl}" alt="${escapeHTML(m.name)}" class="w-6 h-6 rounded-full object-contain bg-ledger-900 border border-ledger-700" onerror="this.src='/static/images/monsters/wolf.webp'">
                <div class="flex flex-col">
                    <span class="font-bold text-slate-200 leading-tight">${escapeHTML(m.name)}</span>
                    <span class="text-[10px] text-slate-400 font-mono">CR ${m.cr} • ${subtotal.toLocaleString()} XP</span>
                </div>
                <div class="flex items-center gap-1 bg-ledger-900 border border-ledger-700 rounded-lg px-1.5 py-0.5 ml-1">
                    <button onclick="modifyStagedCount('${m.id}', -1)" class="text-slate-400 hover:text-white font-mono font-bold px-1 text-xs">-</button>
                    <span class="font-mono font-bold text-amber-300 px-1 text-xs">${item.count}</span>
                    <button onclick="modifyStagedCount('${m.id}', 1)" class="text-slate-400 hover:text-white font-mono font-bold px-1 text-xs">+</button>
                </div>
                <button onclick="removeMonsterFromEncounter('${m.id}')" title="Remove creature" class="text-slate-500 hover:text-rose-400 font-bold ml-1 text-sm">✕</button>
            </div>
        `;
    }).join('');
}

function addMonsterToEncounter(monsterId) {
    if (!appState.stagedEncounter) appState.stagedEncounter = [];
    const existing = appState.stagedEncounter.find(x => x.monsterId === monsterId);
    if (existing) {
        existing.count += 1;
    } else {
        appState.stagedEncounter.push({ monsterId, count: 1 });
    }
    renderEncountersView();
    showToast("Added creature to staged encounter", "info");
}

function modifyStagedCount(monsterId, delta) {
    if (!appState.stagedEncounter) return;
    const item = appState.stagedEncounter.find(x => x.monsterId === monsterId);
    if (!item) return;
    item.count += delta;
    if (item.count <= 0) {
        appState.stagedEncounter = appState.stagedEncounter.filter(x => x.monsterId !== monsterId);
    }
    renderEncountersView();
}

function removeMonsterFromEncounter(monsterId) {
    if (!appState.stagedEncounter) return;
    appState.stagedEncounter = appState.stagedEncounter.filter(x => x.monsterId !== monsterId);
    renderEncountersView();
}

function clearEncounterBuilder() {
    appState.stagedEncounter = [];
    renderEncountersView();
    showToast("Encounter cleared", "info");
}

function renderEncounterTemplates() {
    const container = document.getElementById('enc-presets-list');
    const countEl = document.getElementById('enc-presets-count');
    if (!container) return;

    const templates = appState.encounters || [];
    if (countEl) countEl.textContent = `${templates.length} Preset${templates.length === 1 ? '' : 's'}`;

    if (templates.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-500 italic p-3">No saved encounters yet. Design an encounter and click "Save Preset".</p>`;
        return;
    }

    container.innerHTML = templates.map(enc => {
        let diffColor = "bg-slate-800 text-slate-300";
        if (enc.difficulty === 'Low') diffColor = "bg-emerald-950 text-emerald-400 border-emerald-800";
        else if (enc.difficulty === 'Moderate') diffColor = "bg-sky-950 text-sky-400 border-sky-800";
        else if (enc.difficulty === 'High') diffColor = "bg-amber-950 text-amber-300 border-amber-800";
        else if (enc.difficulty === 'Deadly') diffColor = "bg-rose-950 text-rose-300 border-rose-800";

        const monsterSummary = (enc.monsters || []).map(m => {
            const mon = appState.monsters.find(x => x.id === m.monsterId);
            return `${m.count}x ${mon ? mon.name : m.monsterId}`;
        }).join(', ');

        return `
            <div class="trait-card rounded-xl p-3.5 space-y-2 relative group">
                <div class="flex items-start justify-between gap-2">
                    <div>
                        <h4 class="font-bold text-sm text-slate-200">${escapeHTML(enc.name)}</h4>
                        <p class="text-[11px] text-slate-400 font-serif line-clamp-1">${escapeHTML(enc.description || '')}</p>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${diffColor}">${enc.difficulty || 'Custom'}</span>
                </div>
                <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-ledger-800">
                    <span class="font-mono text-amber-300 font-bold">${(enc.totalXp || 0).toLocaleString()} XP</span>
                    <span class="truncate max-w-[170px]" title="${escapeHTML(monsterSummary)}">${escapeHTML(monsterSummary)}</span>
                </div>
                <div class="flex items-center justify-end gap-2 pt-1">
                    <button onclick="loadEncounterTemplate('${enc.id}')" class="px-2.5 py-1 rounded bg-ledger-800 hover:bg-ledger-700 text-slate-300 hover:text-white text-xs font-semibold border border-ledger-700 transition">
                        Load
                    </button>
                    <button onclick="launchEncounterDirect('${enc.id}')" class="px-3 py-1 rounded bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-ledger-950 text-xs font-bold border border-amber-500/40 transition">
                        ⚔️ Direct Launch
                    </button>
                    <button onclick="deleteEncounterTemplate('${enc.id}')" title="Delete Template" class="p-1 rounded text-slate-500 hover:text-rose-400 opacity-50 group-hover:opacity-100 transition">✕</button>
                </div>
            </div>
        `;
    }).join('');
}

function loadEncounterTemplate(encId) {
    const enc = (appState.encounters || []).find(e => e.id === encId);
    if (!enc) return;
    appState.stagedEncounter = (enc.monsters || []).map(m => ({ monsterId: m.monsterId, count: m.count || 1 }));
    renderEncountersView();
    showToast(`Loaded "${enc.name}" into Encounter Builder!`, "success");
}

async function deleteEncounterTemplate(encId) {
    if (!confirm("Delete this saved encounter preset?")) return;
    try {
        const res = await fetch(`/api/encounters/${encId}`, { method: 'DELETE' });
        if (res.ok) {
            appState.encounters = (appState.encounters || []).filter(e => e.id !== encId);
            renderEncounterTemplates();
            showToast("Encounter preset deleted", "info");
        }
    } catch (e) {
        showToast("Error deleting encounter", "error");
    }
}

function openSaveEncounterModal() {
    const staged = appState.stagedEncounter || [];
    if (staged.length === 0) {
        showToast("Add some monsters before saving an encounter preset!", "warning");
        return;
    }
    const previewList = staged.map(item => {
        const m = appState.monsters.find(x => x.id === item.monsterId);
        return `${item.count}x ${m ? m.name : item.monsterId}`;
    }).join(' • ');

    const previewEl = document.getElementById('save-enc-preview');
    if (previewEl) previewEl.textContent = previewList;
    openModal('save-encounter-modal');
}

async function submitSaveEncounterPreset() {
    const name = document.getElementById('save-enc-name')?.value.trim();
    if (!name) {
        showToast("Please enter an encounter title", "warning");
        return;
    }
    const desc = document.getElementById('save-enc-desc')?.value.trim() || "";
    const { totalXp } = calculateCurrentEncounterXP();
    const partyInfo = calculatePartyEncounterThresholds();
    
    let difficulty = "Moderate";
    if (totalXp < partyInfo.totals.low) difficulty = "Low";
    else if (totalXp < partyInfo.totals.moderate) difficulty = "Low";
    else if (totalXp < partyInfo.totals.high) difficulty = "Moderate";
    else if (totalXp < partyInfo.totals.deadly) difficulty = "High";
    else difficulty = "Deadly";

    const payload = {
        name,
        description: desc,
        difficulty,
        totalXp,
        monsters: (appState.stagedEncounter || []).map(item => ({ monsterId: item.monsterId, count: item.count }))
    };

    try {
        const res = await fetch('/api/encounters', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.encounter) {
                appState.encounters.push(data.encounter);
                renderEncounterTemplates();
                closeModal('save-encounter-modal');
                showToast(`Encounter preset "${name}" saved!`, "success");
            }
        }
    } catch (e) {
        showToast("Error saving encounter preset", "error");
    }
}

async function launchCurrentEncounterToCombat() {
    const staged = appState.stagedEncounter || [];
    if (staged.length === 0) {
        showToast("Encounter is empty! Add monsters first.", "warning");
        return;
    }

    const totalCount = staged.reduce((acc, x) => acc + x.count, 0);
    if (!confirm(`Launch ${totalCount} monsters into the Combat Tracker & Battlemap (hidden from players)?`)) return;

    const newCombatants = [];
    const newTokens = [];
    let tokenIndex = 0;

    // Staging position on the battlemap
    const baseX = 900;
    const baseY = 650;
    const spacing = 75;

    staged.forEach(item => {
        const m = appState.monsters.find(x => x.id === item.monsterId);
        if (!m) return;
        const dexMod = Math.floor(((m.abilities?.dex || 10) - 10) / 2);

        let squares = 1.0;
        const s = (m.size || '').toLowerCase();
        if (s.includes('gargantuan')) squares = 4.0;
        else if (s.includes('huge')) squares = 3.0;
        else if (s.includes('large')) squares = 2.0;
        else if (s.includes('tiny')) squares = 0.8;

        const crVal = parseFloat(m.cr) || 0;
        const isBoss = crVal >= 10 || (m.name && (m.name.toLowerCase().includes('dragon') || m.name.toLowerCase().includes('boss')));
        const color = isBoss ? '#a855f7' : '#ef4444';
        const tokenUrl = m.imageUrl || `/static/images/monsters/${m.id}.webp`;

        for (let i = 1; i <= item.count; i++) {
            const cName = item.count > 1 ? `${m.name} ${i}` : m.name;
            const initRoll = Math.floor(Math.random() * 20) + 1 + dexMod;
            const combatantId = `comb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            const tokenId = `token_${Math.random().toString(36).substr(2, 8)}`;
            const hp = m.hp || 15;

            // 1. Combatant in Combat Tracker (hidden from players)
            const combatant = {
                id: combatantId,
                name: cName,
                type: 'monster',
                monsterId: m.id,
                imageUrl: tokenUrl,
                initiative: initRoll,
                ac: m.ac || 12,
                currentHp: hp,
                maxHp: hp,
                tempHp: 0,
                conditions: [],
                isConcentrating: false,
                concentratingSpell: "",
                hidden: true,
                visibleToPlayers: false,
                notes: `CR ${m.cr} • ${m.size} ${m.type}`,
                statDetails: (m.actions && m.actions.length > 0) ? m.actions[0].name : "Standard Attack"
            };
            newCombatants.push(combatant);
            appState.combat.combatants.push(combatant);

            // 2. Battlemap Token (hidden from players, staged in formation)
            const col = tokenIndex % 5;
            const row = Math.floor(tokenIndex / 5);
            const tokenX = baseX + col * spacing;
            const tokenY = baseY + row * spacing;

            const token = {
                id: tokenId,
                name: cName,
                monsterId: m.id,
                combatantId: combatantId,
                size: m.size || 'Medium',
                sizeSquares: squares,
                x: tokenX,
                y: tokenY,
                imageUrl: tokenUrl,
                currentHp: hp,
                maxHp: hp,
                color: color,
                visibleToPlayers: false
            };
            newTokens.push(token);
            tokenIndex++;
        }
    });

    sortCombatantsByInitiative();
    appState.combat.inCombat = true;
    await apiSaveCombat();

    // Batch add tokens to the battlemap
    try {
        const batchRes = await fetch('/api/battlemap/tokens/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokens: newTokens })
        });
        if (batchRes.ok) {
            if (window.BattlemapController && typeof window.BattlemapController.addTokens === 'function') {
                window.BattlemapController.addTokens(newTokens);
            }
        }
    } catch (err) {
        console.error("Error creating battlemap tokens:", err);
    }

    switchTab('combat');
    showToast(`⚔️ Encounter launched! ${newTokens.length} monster tokens placed on Battlemap (hidden from players). Drag them to position and reveal when ready!`, "success");
}

async function launchEncounterDirect(encId) {
    try {
        const res = await fetch(`/api/encounters/${encId}/launch`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            if (data.combat) {
                appState.combat = data.combat;
            }
            if (data.tokens && window.BattlemapController && typeof window.BattlemapController.addTokens === 'function') {
                window.BattlemapController.addTokens(data.tokens);
            }
            switchTab('combat');
            showToast(`⚔️ Encounter launched! ${data.spawned || 0} monster tokens placed on Battlemap (hidden from players).`, "success");
        }
    } catch (e) {
        showToast("Error launching encounter", "error");
    }
}

function filterEncounterMonsters() {
    appState.encounterSearchQuery = document.getElementById('enc-monster-search')?.value.toLowerCase() || '';
    appState.encounterCrFilter = document.getElementById('enc-cr-filter')?.value || 'all';
    appState.encounterTypeFilter = document.getElementById('enc-type-filter')?.value || 'all';
    renderEncounterMonsterPicker();
}

function renderEncounterMonsterPicker() {
    const container = document.getElementById('enc-monsters-picker-grid');
    if (!container) return;

    const query = appState.encounterSearchQuery || '';
    const crFilter = appState.encounterCrFilter || 'all';
    const typeFilter = appState.encounterTypeFilter || 'all';

    let monsters = appState.monsters || [];

    if (query) {
        monsters = monsters.filter(m => (m.name || '').toLowerCase().includes(query) || (m.type || '').toLowerCase().includes(query));
    }
    if (typeFilter !== 'all') {
        monsters = monsters.filter(m => (m.type || '').toLowerCase().includes(typeFilter.toLowerCase()));
    }
    if (crFilter !== 'all') {
        monsters = monsters.filter(m => {
            const cr = String(m.cr);
            if (crFilter === '0') return cr === '0' || cr === '1/8' || cr === '1/4' || cr === '1/2';
            if (crFilter === '1-4') return ['1', '2', '3', '4'].includes(cr);
            if (crFilter === '5-10') return ['5', '6', '7', '8', '9', '10'].includes(cr);
            if (crFilter === '11-16') return ['11', '12', '13', '14', '15', '16'].includes(cr);
            if (crFilter === '17+') return parseInt(cr) >= 17;
            return true;
        });
    }

    if (monsters.length === 0) {
        container.innerHTML = `<div class="col-span-full py-8 text-center text-slate-500 text-xs italic">No monsters match current filters.</div>`;
        return;
    }

    container.innerHTML = monsters.slice(0, 48).map(m => {
        const tokenUrl = m.imageUrl || `/static/images/monsters/${m.id}.webp`;
        const xp = parseInt(m.xp) || 0;
        return `
            <div class="trait-card rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs hover:border-amber-500/40 transition">
                <div class="flex items-center gap-2.5 min-w-0">
                    <img src="${tokenUrl}" alt="${escapeHTML(m.name)}" class="w-8 h-8 rounded-full object-contain bg-ledger-950 border border-ledger-700 flex-shrink-0" onerror="this.src='/static/images/monsters/wolf.webp'">
                    <div class="min-w-0">
                        <h4 class="font-bold text-slate-200 truncate leading-tight">${escapeHTML(m.name)}</h4>
                        <span class="text-[10px] text-slate-400 font-mono">CR ${m.cr} • ${xp.toLocaleString()} XP • ${escapeHTML(m.type || '')}</span>
                    </div>
                </div>
                <button onclick="addMonsterToEncounter('${m.id}')" title="Add to staged encounter" class="px-2 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-ledger-950 border border-amber-500/30 text-[11px] font-bold flex-shrink-0 transition">
                    + Add
                </button>
            </div>
        `;
    }).join('');
}

// -----------------------------------------------------------------------------
// PHASE 5: 2024 SPELL COMPENDIUM CONTROLLER
// -----------------------------------------------------------------------------

function renderSpellsView() {
    filterSpellsList();
}

function setSpellLevelFilter(lvl, btn = null) {
    appState.spellFilterLevel = lvl;
    document.querySelectorAll('.spell-lvl-pill').forEach(b => {
        b.classList.remove('bg-amber-500', 'text-ledger-950', 'font-bold');
        b.classList.add('bg-ledger-950', 'text-slate-400');
    });
    const target = btn || (typeof window !== 'undefined' && window.event ? window.event.target : null);
    if (target && target.classList) {
        target.classList.remove('bg-ledger-950', 'text-slate-400');
        target.classList.add('bg-amber-500', 'text-ledger-950', 'font-bold');
    }
    filterSpellsList();
}

function filterSpellsList() {
    appState.spellSearchQuery = document.getElementById('spell-search-input')?.value.toLowerCase() || '';
    appState.spellFilterClass = document.getElementById('spell-class-filter')?.value || 'all';
    appState.spellFilterSchool = document.getElementById('spell-school-filter')?.value || 'all';
    appState.spellFilterRitual = document.getElementById('spell-ritual-filter')?.checked || false;
    appState.spellFilterConcentration = document.getElementById('spell-concentration-filter')?.checked || false;

    let spells = appState.spells || [];

    if (appState.spellSearchQuery) {
        spells = spells.filter(s => (s.name || '').toLowerCase().includes(appState.spellSearchQuery));
    }
    if (appState.spellFilterLevel !== 'all') {
        spells = spells.filter(s => s.level === parseInt(appState.spellFilterLevel));
    }
    if (appState.spellFilterSchool !== 'all') {
        spells = spells.filter(s => (s.school || '').toLowerCase() === appState.spellFilterSchool.toLowerCase());
    }
    if (appState.spellFilterClass !== 'all') {
        spells = spells.filter(s => (s.classes || []).some(c => c.toLowerCase() === appState.spellFilterClass.toLowerCase()));
    }
    if (appState.spellFilterRitual) {
        spells = spells.filter(s => s.ritual);
    }
    if (appState.spellFilterConcentration) {
        spells = spells.filter(s => s.concentration);
    }

    renderSpellsDirectory(spells);

    const countEl = document.getElementById('spells-total-count');
    if (countEl) countEl.textContent = `${spells.length} Spell${spells.length === 1 ? '' : 's'}`;

    if (spells.length > 0 && !appState.selectedSpellId) {
        showSpellDetail(spells[0].id);
    }
}

function renderSpellsDirectory(spells) {
    const container = document.getElementById('spells-list-container');
    if (!container) return;

    if (!spells || spells.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-slate-500 text-xs italic space-y-3">
                <p>No spells found matching filters or compendium is empty.</p>
                <button onclick="restoreSrdCompendiums()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition">
                    <span>🔄</span> <span>Restore 5.5e SRD Spells (340+ Spells)</span>
                </button>
            </div>`;
        return;
    }

    container.innerHTML = spells.map(s => {
        const isSelected = s.id === appState.selectedSpellId;
        const levelBadge = s.level === 0 ? 'Cantrip' : `Level ${s.level}`;
        return `
            <div onclick="showSpellDetail('${s.id}')" class="px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${isSelected ? 'bg-amber-500/15 border-l-4 border-amber-400' : 'hover:bg-ledger-800/60'}">
                <div class="min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-xs ${isSelected ? 'text-amber-300' : 'text-slate-200'} truncate">${escapeHTML(s.name)}</span>
                        ${s.concentration ? `<span class="px-1 py-0.2 rounded text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/80">C</span>` : ''}
                        ${s.ritual ? `<span class="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/80">R</span>` : ''}
                    </div>
                    <span class="text-[10px] text-slate-400 italic">${s.school}</span>
                </div>
                <div class="flex items-center gap-5 text-right flex-shrink-0 text-[11px] font-mono">
                    <div class="hidden sm:block text-slate-400">
                        <span class="block text-[10px] text-slate-300">${s.casting_time}</span>
                        <span class="text-[9px] text-slate-500">${s.range}</span>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-bold ${s.level === 0 ? 'bg-slate-800 text-slate-300' : 'bg-ledger-950 text-amber-400 border border-ledger-700'}">${levelBadge}</span>
                </div>
            </div>
        `;
    }).join('');
}

function showSpellDetail(spellId) {
    appState.selectedSpellId = spellId;
    const s = (appState.spells || []).find(x => x.id === spellId);
    if (!s) return;

    const card = document.getElementById('spell-detail-card');
    if (!card) return;

    const levelText = s.level === 0 ? `${s.school} Cantrip` : `${s.level}${s.level === 1 ? 'st' : (s.level === 2 ? 'nd' : (s.level === 3 ? 'rd' : 'th'))}-Level ${s.school}`;

    card.innerHTML = `
        <div class="flex items-start justify-between border-b border-ledger-800 pb-3">
            <div>
                <h3 class="font-display font-bold text-lg text-amber-400">${escapeHTML(s.name)}</h3>
                <p class="text-[11px] text-sky-300 italic font-medium">${levelText} ${s.ritual ? '• Ritual' : ''}</p>
            </div>
            <button onclick="broadcastSpellCard('${s.id}')" title="Broadcast Spell Card to Player TV" class="px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 font-semibold flex items-center gap-1 transition">
                <span>📺</span> Broadcast
            </button>
        </div>

        <!-- Stats Bar -->
        <div class="grid grid-cols-2 gap-2 bg-ledger-950 p-2.5 rounded-xl border border-ledger-800 text-[11px]">
            <div>
                <span class="text-[9px] uppercase font-bold text-slate-400 block">Casting Time</span>
                <span class="font-semibold text-slate-200">${escapeHTML(s.casting_time)}</span>
            </div>
            <div>
                <span class="text-[9px] uppercase font-bold text-slate-400 block">Range</span>
                <span class="font-semibold text-slate-200">${escapeHTML(s.range)}</span>
            </div>
            <div>
                <span class="text-[9px] uppercase font-bold text-slate-400 block">Components</span>
                <span class="font-semibold text-slate-200">${escapeHTML(s.components || 'V, S')}</span>
            </div>
            <div>
                <span class="text-[9px] uppercase font-bold text-slate-400 block">Duration</span>
                <span class="font-semibold text-slate-200">${s.concentration ? '🧠 Concentration, ' : ''}${escapeHTML(s.duration)}</span>
            </div>
        </div>

        <!-- Description -->
        <div class="space-y-1.5">
            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Spell Effect (2024 SRD)</span>
            <div class="p-3 bg-ledger-950 rounded-xl border border-ledger-800 text-slate-200 font-serif leading-relaxed text-xs max-h-60 overflow-y-auto whitespace-pre-wrap">${escapeHTML(s.description)}</div>
        </div>

        ${s.at_higher_levels ? `
            <div class="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-1">
                <span class="font-bold text-amber-300 text-[11px]">Using a Higher-Level Slot:</span>
                <p class="text-slate-300 font-serif text-xs">${escapeHTML(s.at_higher_levels)}</p>
            </div>
        ` : ''}

        <!-- Classes -->
        <div class="text-[11px] text-slate-400 pt-1">
            <span class="font-bold text-slate-300">Spell Lists:</span> ${(s.classes || []).join(', ')}
        </div>
    `;

    document.querySelectorAll('#spells-list-container > div').forEach(div => {
        div.classList.remove('bg-amber-500/15', 'border-l-4', 'border-amber-400');
    });
    if (window.event && window.event.currentTarget) {
        window.event.currentTarget.classList.add('bg-amber-500/15', 'border-l-4', 'border-amber-400');
    }
}

function openSpellDetailModal(spellId) {
    const s = (appState.spells || []).find(x => x.id === spellId || x.name.toLowerCase() === spellId.toLowerCase());
    if (!s) return;

    document.getElementById('modal-spell-name').textContent = s.name;
    const levelText = s.level === 0 ? `${s.school} Cantrip` : `${s.level}${s.level === 1 ? 'st' : (s.level === 2 ? 'nd' : (s.level === 3 ? 'rd' : 'th'))}-Level ${s.school}`;
    document.getElementById('modal-spell-type').textContent = `${levelText} ${s.ritual ? '• Ritual' : ''}`;
    document.getElementById('modal-spell-time').textContent = s.casting_time;
    document.getElementById('modal-spell-range').textContent = s.range;
    document.getElementById('modal-spell-components').textContent = s.components || 'V, S';
    document.getElementById('modal-spell-duration').textContent = `${s.concentration ? '🧠 Concentration, ' : ''}${s.duration}`;
    document.getElementById('modal-spell-description').textContent = s.description;
    document.getElementById('modal-spell-classes').textContent = (s.classes || []).join(', ');

    const upcastBox = document.getElementById('modal-spell-upcast-box');
    const upcastText = document.getElementById('modal-spell-upcast');
    if (s.at_higher_levels) {
        upcastBox.classList.remove('hidden');
        upcastText.textContent = s.at_higher_levels;
    } else {
        upcastBox.classList.add('hidden');
    }

    window._modalSpellId = s.id;
    openModal('spell-detail-modal');
}

async function broadcastSpellCard(spellId) {
    const s = (appState.spells || []).find(x => x.id === spellId);
    if (!s) return;
    const sub = `${s.level === 0 ? 'Cantrip' : 'Level ' + s.level} ${s.school} • ${s.casting_time}`;
    let body = s.description || '';
    if (s.range || s.duration || s.components) {
        const meta = [
            s.range ? `Range: ${s.range}` : '',
            s.components ? `Components: ${s.components}` : '',
            s.duration ? `Duration: ${s.duration}` : ''
        ].filter(Boolean).join(' • ');
        body = meta + '\n\n' + body;
    }
    if (s.at_higher_levels) {
        body += `\n\nAt Higher Levels: ${s.at_higher_levels}`;
    }
    await broadcastHandout(s.name, sub, body, 'spell');
}

function broadcastCurrentModalSpell() {
    if (window._modalSpellId) broadcastSpellCard(window._modalSpellId);
}

// =============================================================================
// COMPENDIUM: ITEMS & EQUIPMENT CONTROLLER
// =============================================================================

function getItemRarityBadge(rarity) {
    const r = (rarity || 'Common').toLowerCase();
    switch (r) {
        case 'mundane':
            return 'bg-slate-800 text-slate-300 border-slate-700';
        case 'common':
            return 'bg-slate-700 text-slate-200 border-slate-600';
        case 'uncommon':
            return 'bg-emerald-950 text-emerald-300 border-emerald-700';
        case 'rare':
            return 'bg-sky-950 text-sky-300 border-sky-700';
        case 'very rare':
            return 'bg-violet-950 text-violet-300 border-violet-700';
        case 'legendary':
            return 'bg-amber-950 text-amber-300 border-amber-600';
        case 'artifact':
            return 'bg-rose-950 text-rose-300 border-rose-600';
        default:
            return 'bg-slate-800 text-slate-300 border-slate-700';
    }
}

async function renderItemsView() {
    if (!appState.items || appState.items.length === 0) {
        try {
            const res = await fetch('/api/items');
            if (res.ok) {
                const fetched = await res.json();
                if (Array.isArray(fetched) && fetched.length > 0) {
                    appState.items = fetched;
                    if (!appState.selectedItemId && appState.items.length > 0) {
                        appState.selectedItemId = appState.items[0].id;
                    }
                }
            }
        } catch (e) {
            console.error("Direct fetch of /api/items failed:", e);
        }
    }
    filterItemsList();
}

function setItemTypeFilter(type, btn = null) {
    appState.itemFilterType = type;
    const select = document.getElementById('item-type-filter');
    if (select) select.value = type;
    document.querySelectorAll('.item-type-pill').forEach(b => {
        b.classList.remove('bg-amber-500', 'text-ledger-950', 'font-bold');
        b.classList.add('bg-ledger-950', 'text-slate-400');
    });
    const target = btn || (typeof window !== 'undefined' && window.event ? (window.event.target.closest ? window.event.target.closest('.item-type-pill') : window.event.target) : null);
    if (target && target.classList) {
        target.classList.remove('bg-ledger-950', 'text-slate-400');
        target.classList.add('bg-amber-500', 'text-ledger-950', 'font-bold');
    }
    filterItemsList();
}

function filterItemsList() {
    appState.itemSearchQuery = document.getElementById('item-search-input')?.value.toLowerCase() || '';
    appState.itemFilterType = document.getElementById('item-type-filter')?.value || 'all';
    appState.itemFilterRarity = document.getElementById('item-rarity-filter')?.value || 'all';
    appState.itemFilterAttunement = document.getElementById('item-attunement-filter')?.checked || false;
    appState.itemFilterCustomOnly = document.getElementById('item-custom-only-filter')?.checked || false;

    let items = appState.items || [];

    if (appState.itemSearchQuery) {
        const q = appState.itemSearchQuery;
        items = items.filter(i => 
            (i.name || '').toLowerCase().includes(q) ||
            (i.type || '').toLowerCase().includes(q) ||
            (i.description || '').toLowerCase().includes(q) ||
            (i.damage || '').toLowerCase().includes(q) ||
            (i.properties || []).some(p => p.toLowerCase().includes(q))
        );
    }
    if (appState.itemFilterType !== 'all') {
        items = items.filter(i => (i.type || '').toLowerCase() === appState.itemFilterType.toLowerCase());
    }
    if (appState.itemFilterRarity !== 'all') {
        items = items.filter(i => (i.rarity || '').toLowerCase() === appState.itemFilterRarity.toLowerCase());
    }
    if (appState.itemFilterAttunement) {
        items = items.filter(i => !!i.attunement);
    }
    if (appState.itemFilterCustomOnly) {
        items = items.filter(i => !!i.isCustom);
    }

    renderItemsDirectory(items);

    const countEl = document.getElementById('items-total-count');
    if (countEl) countEl.textContent = `${items.length} Item${items.length === 1 ? '' : 's'}`;

    if (items.length > 0) {
        const hasSelected = items.some(x => x.id === appState.selectedItemId);
        if (!hasSelected) {
            showItemDetail(items[0].id);
        } else {
            showItemDetail(appState.selectedItemId);
        }
    } else {
        const card = document.getElementById('item-detail-card');
        if (card) {
            card.innerHTML = `
                <div class="text-center py-12 text-slate-500">
                    <span class="text-4xl block mb-2">🔍</span>
                    <p>No items found matching your filters.</p>
                </div>
            `;
        }
    }
}

function renderItemsDirectory(items) {
    const container = document.getElementById('items-list-container');
    if (!container) return;

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-slate-500 text-xs italic space-y-3">
                <p>No items found matching filters or compendium is empty.</p>
                <button onclick="restoreSrdCompendiums()" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-semibold hover:bg-amber-500/30 transition">
                    <span>🔄</span> <span>Restore 5.5e SRD Items (128+ Items)</span>
                </button>
            </div>`;
        return;
    }

    container.innerHTML = items.map(item => {
        const isSelected = item.id === appState.selectedItemId;
        const rarityBadge = getItemRarityBadge(item.rarity);
        const costWeight = [item.cost, item.weight].filter(Boolean).join(' • ');

        return `
            <div onclick="showItemDetail('${item.id}')" class="px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${isSelected ? 'bg-amber-500/15 border-l-4 border-amber-400' : 'hover:bg-ledger-800/60'}">
                <div class="min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="font-bold text-xs ${isSelected ? 'text-amber-300' : 'text-slate-200'} truncate">${escapeHTML(item.name)}</span>
                        ${item.isCustom ? `<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">Custom</span>` : ''}
                        ${item.attunement ? `<span class="px-1 py-0.2 rounded text-[9px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700/80" title="${escapeHTML(typeof item.attunement === 'string' ? item.attunement : 'Requires Attunement')}">🔮</span>` : ''}
                    </div>
                    <span class="text-[10px] text-slate-400">${escapeHTML(item.type)}</span>
                </div>
                <div class="flex items-center gap-4 text-right flex-shrink-0 text-[11px] font-mono">
                    <span class="hidden sm:inline text-slate-400 text-[10px]">${costWeight}</span>
                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold border ${rarityBadge}">${escapeHTML(item.rarity || 'Common')}</span>
                </div>
            </div>
        `;
    }).join('');
}

function showItemDetail(itemId) {
    appState.selectedItemId = itemId;
    const item = (appState.items || []).find(x => x.id === itemId);
    if (!item) return;

    const card = document.getElementById('item-detail-card');
    if (!card) return;

    const rarityBadge = getItemRarityBadge(item.rarity);
    const attunementStr = typeof item.attunement === 'string' ? item.attunement : (item.attunement ? 'Requires Attunement' : 'No Attunement Required');

    card.innerHTML = `
        <div class="flex items-start justify-between border-b border-ledger-800 pb-3 gap-2">
            <div>
                <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="font-display font-bold text-lg text-amber-400">${escapeHTML(item.name)}</h3>
                    ${item.isCustom ? `<span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">Custom Homebrew</span>` : ''}
                </div>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-[11px] text-sky-300 font-semibold">${escapeHTML(item.type)}</span>
                    <span class="text-slate-600">•</span>
                    <span class="px-2 py-0.2 rounded text-[10px] font-bold border ${rarityBadge}">${escapeHTML(item.rarity)}</span>
                </div>
            </div>
            <div class="flex items-center gap-1.5 flex-shrink-0">
                <button onclick="broadcastItemCard('${item.id}')" title="Broadcast Item Card to Player Screen" class="px-2.5 py-1 rounded-lg bg-sky-950 hover:bg-sky-900 border border-sky-800 text-sky-300 text-xs font-semibold flex items-center gap-1 transition">
                    <span>📺</span> Broadcast
                </button>
            </div>
        </div>

        <!-- Cost, Weight, Attunement Bar -->
        <div class="grid grid-cols-3 gap-2 bg-ledger-950 p-2.5 rounded-xl border border-ledger-800 text-[11px] font-mono">
            <div>
                <span class="text-[9px] uppercase font-bold text-slate-500 block font-sans">Cost</span>
                <span class="font-semibold text-amber-300">${item.cost || '—'}</span>
            </div>
            <div>
                <span class="text-[9px] uppercase font-bold text-slate-500 block font-sans">Weight</span>
                <span class="font-semibold text-slate-300">${item.weight || '—'}</span>
            </div>
            <div>
                <span class="text-[9px] uppercase font-bold text-slate-500 block font-sans">Attunement</span>
                <span class="font-semibold ${item.attunement ? 'text-indigo-400' : 'text-slate-400'}">${item.attunement ? 'Yes' : 'No'}</span>
            </div>
        </div>

        ${item.damage || item.ac || (item.properties && item.properties.length > 0) ? `
            <!-- Combat / Equipment Stats -->
            <div class="bg-ledger-950 p-3 rounded-xl border border-ledger-800 space-y-1.5 text-xs">
                ${item.damage ? `
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400 text-[11px]">Damage:</span>
                        <span class="font-mono font-bold text-amber-300">${escapeHTML(item.damage)} ${item.damageType ? '(' + escapeHTML(item.damageType) + ')' : ''}</span>
                    </div>
                ` : ''}
                ${item.ac ? `
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400 text-[11px]">Armor Class:</span>
                        <span class="font-mono font-bold text-emerald-400">${escapeHTML(item.ac)}</span>
                    </div>
                ` : ''}
                ${item.strengthReq ? `
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400 text-[11px]">Strength Req:</span>
                        <span class="font-mono text-slate-300">${escapeHTML(item.strengthReq)}</span>
                    </div>
                ` : ''}
                ${item.stealthDisadv ? `
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400 text-[11px]">Stealth:</span>
                        <span class="font-mono text-rose-300">Disadvantage</span>
                    </div>
                ` : ''}
                ${item.properties && item.properties.length > 0 ? `
                    <div class="pt-1 border-t border-ledger-800/80">
                        <span class="text-[10px] uppercase font-bold text-slate-500 block mb-1">Properties & 2024 Masteries</span>
                        <div class="flex flex-wrap gap-1">
                            ${(Array.isArray(item.properties) ? item.properties : [item.properties]).map(p => `
                                <span class="px-1.5 py-0.5 rounded bg-ledger-900 border border-ledger-700 text-sky-300 text-[10px]">${escapeHTML(p)}</span>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        ` : ''}

        ${item.attunement ? `
            <div class="p-2.5 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-[11px] text-indigo-300 flex items-center gap-2">
                <span>🔮</span>
                <span>${escapeHTML(attunementStr)}</span>
            </div>
        ` : ''}

        <!-- Description / Mechanics -->
        <div class="space-y-1.5">
            <span class="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Item Description & Effects</span>
            <div class="p-3.5 bg-ledger-950 rounded-xl border border-ledger-800 text-slate-200 font-serif leading-relaxed text-xs max-h-72 overflow-y-auto whitespace-pre-wrap">${escapeHTML(item.description)}</div>
        </div>

        <!-- Actions -->
        <div class="flex items-center justify-between pt-2 border-t border-ledger-800 text-xs flex-wrap gap-2">
            <div class="flex items-center gap-2 flex-wrap">
                <button onclick="giveItemToParty('${item.id}')" class="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold flex items-center gap-1.5 transition">
                    <span>🎁</span> Give to Party / Stash
                </button>
                <button onclick="addItemToLoot('${item.id}')" class="px-3 py-1.5 rounded-lg bg-ledger-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold flex items-center gap-1.5 transition">
                    <span>🛒</span> Add to Shop Inventory
                </button>
            </div>
            ${item.isCustom ? `
                <div class="flex items-center gap-2">
                    <button onclick="openCustomItemModal('${item.id}')" class="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold transition">
                        ✏️ Edit
                    </button>
                    <button onclick="deleteCustomItem('${item.id}')" class="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-semibold transition">
                        🗑️ Delete
                    </button>
                </div>
            ` : ''}
        </div>
    `;
}

function openCustomItemModal(itemId = null) {
    const modal = document.getElementById('custom-item-modal');
    if (!modal) {
        console.error("custom-item-modal element not found in DOM");
        return;
    }
    const titleEl = document.getElementById('custom-item-modal-header-text');

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    if (itemId) {
        const item = (appState.items || []).find(x => x.id === itemId);
        if (item) {
            if (titleEl) titleEl.textContent = `Edit Item: ${item.name}`;
            setVal('custom-item-id', item.id);
            setVal('custom-item-name', item.name);
            setVal('custom-item-type', item.type || 'Wondrous Item');
            setVal('custom-item-rarity', item.rarity || 'Uncommon');
            setVal('custom-item-cost', item.cost || '');
            setVal('custom-item-weight', item.weight || '');
            setVal('custom-item-attunement', typeof item.attunement === 'string' ? item.attunement : (item.attunement ? 'Requires Attunement' : ''));
            setVal('custom-item-damage', item.damage || '');
            setVal('custom-item-damage-type', item.damageType || '');
            setVal('custom-item-ac', item.ac || '');
            setVal('custom-item-properties', Array.isArray(item.properties) ? item.properties.join(', ') : (item.properties || ''));
            setVal('custom-item-desc', item.description || '');
        }
    } else {
        if (titleEl) titleEl.textContent = 'Create Custom Item';
        setVal('custom-item-id', '');
        const form = document.getElementById('custom-item-form');
        if (form) form.reset();
        setVal('custom-item-type', 'Wondrous Item');
        setVal('custom-item-rarity', 'Uncommon');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof openModal === 'function') {
        openModal('custom-item-modal');
    }
}

function closeCustomItemModal() {
    const modal = document.getElementById('custom-item-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    if (typeof closeModal === 'function') {
        closeModal('custom-item-modal');
    }
}

async function saveCustomItem(e) {
    if (e) e.preventDefault();

    const id = document.getElementById('custom-item-id')?.value.trim();
    const name = document.getElementById('custom-item-name')?.value.trim();
    if (!name) {
        showToast("Please enter an item name", "error");
        return;
    }

    const itemType = document.getElementById('custom-item-type')?.value || 'Wondrous Item';
    const rarity = document.getElementById('custom-item-rarity')?.value || 'Uncommon';
    const cost = document.getElementById('custom-item-cost')?.value.trim() || '';
    const weight = document.getElementById('custom-item-weight')?.value.trim() || '';
    const attunementVal = document.getElementById('custom-item-attunement')?.value.trim();
    const damage = document.getElementById('custom-item-damage')?.value.trim() || null;
    const damageType = document.getElementById('custom-item-damage-type')?.value.trim() || null;
    const ac = document.getElementById('custom-item-ac')?.value.trim() || null;
    const propStr = document.getElementById('custom-item-properties')?.value.trim();
    const properties = propStr ? propStr.split(',').map(s => s.trim()).filter(Boolean) : null;
    const description = document.getElementById('custom-item-desc')?.value.trim() || '';

    const payload = {
        name,
        type: itemType,
        rarity,
        attunement: attunementVal ? attunementVal : false,
        cost,
        weight,
        damage,
        damageType,
        ac,
        properties,
        description,
        isCustom: true
    };
    if (id) payload.id = id;

    try {
        const res = await fetch('/api/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            const savedItem = data.item;
            if (!appState.items) appState.items = [];
            const existingIdx = appState.items.findIndex(x => x.id === savedItem.id);
            if (existingIdx !== -1) {
                appState.items[existingIdx] = savedItem;
            } else {
                appState.items.unshift(savedItem);
            }
            appState.selectedItemId = savedItem.id;
            closeCustomItemModal();
            filterItemsList();
            showItemDetail(savedItem.id);
            showToast(`Saved item: ${savedItem.name}`, "success");
        } else {
            showToast("Failed to save item", "error");
        }
    } catch (err) {
        console.error("Error saving custom item:", err);
        showToast("Error saving item", "error");
    }
}

async function deleteCustomItem(itemId) {
    if (!confirm("Are you sure you want to delete this custom item?")) return;
    try {
        const res = await fetch(`/api/items/${itemId}`, { method: 'DELETE' });
        if (res.ok) {
            appState.items = (appState.items || []).filter(x => x.id !== itemId);
            if (appState.selectedItemId === itemId) {
                appState.selectedItemId = appState.items.length > 0 ? appState.items[0].id : null;
            }
            filterItemsList();
            if (appState.selectedItemId) showItemDetail(appState.selectedItemId);
            showToast("Item deleted", "info");
        }
    } catch (err) {
        console.error("Error deleting item:", err);
        showToast("Error deleting item", "error");
    }
}

async function broadcastItemCard(itemId) {
    const item = (appState.items || []).find(x => x.id === itemId);
    if (!item) return;

    let sub = `${item.rarity} ${item.type}`;
    if (item.attunement) sub += ` • ${typeof item.attunement === 'string' ? item.attunement : 'Requires Attunement'}`;

    const parts = [];
    if (item.cost || item.weight) {
        const cw = [item.cost ? `Cost: ${item.cost}` : '', item.weight ? `Weight: ${item.weight}` : ''].filter(Boolean).join(' • ');
        parts.push(cw);
    }
    if (item.damage) {
        parts.push(`Damage: ${item.damage}${item.damageType ? ' (' + item.damageType + ')' : ''}`);
    }
    if (item.ac) {
        parts.push(`Armor Class: ${item.ac}`);
    }
    if (item.properties && item.properties.length > 0) {
        const pStr = Array.isArray(item.properties) ? item.properties.join(', ') : item.properties;
        parts.push(`Properties & Masteries: ${pStr}`);
    }
    if (item.description) {
        parts.push(item.description);
    }

    const body = parts.join('\n\n');
    await broadcastHandout(item.name, sub, body, 'item');
}

function addItemToLoot(itemId) {
    const item = (appState.items || []).find(x => x.id === itemId);
    if (!item) return;

    if (!appState.currentShop) {
        generateShop();
    }

    if (appState.currentShop && appState.currentShop.items) {
        let costNum = 50;
        const match = (item.cost || '').match(/\d+/);
        if (match) costNum = parseInt(match[0], 10);

        appState.currentShop.items.unshift({
            name: item.name,
            cost: costNum,
            finalCost: costNum,
            unit: "gp",
            type: item.type,
            desc: item.description ? item.description.substring(0, 100) + '...' : '',
            qty: 1
        });
        renderShopInventory();
        switchTab('loot');
        showToast(`Added ${item.name} to merchant inventory!`, "success");
    }
}

// Global window exposure for inline event handlers & compendium interactions
window.renderItemsView = renderItemsView;
window.filterItemsList = filterItemsList;
window.setItemTypeFilter = setItemTypeFilter;
window.renderItemsDirectory = renderItemsDirectory;
window.showItemDetail = showItemDetail;
window.openCustomItemModal = openCustomItemModal;
window.closeCustomItemModal = closeCustomItemModal;
window.saveCustomItem = saveCustomItem;
window.deleteCustomItem = deleteCustomItem;
window.broadcastItemCard = broadcastItemCard;
window.broadcastShopInventory = broadcastShopInventory;
window.addItemToLoot = addItemToLoot;
window.getItemRarityBadge = getItemRarityBadge;

// -----------------------------------------------------------------------------
// PHASE 5: AMARAN INDEPENDENT DUAL-CHANNEL LIGHTING CONTROLLER
// -----------------------------------------------------------------------------

function openLightingModal() {
    openModal('lighting-modal');
    if (window.LightingEngine) {
        window.LightingEngine.updateUI();
    }
}

// Channel 1: Overhead Table Light (amaran 60d S)
function setOverheadBrightness(val) {
    if (window.LightingEngine) {
        window.LightingEngine.setOverheadBrightness(parseInt(val));
    }
}

function setOverheadPreset(preset) {
    if (window.LightingEngine) {
        window.LightingEngine.setOverheadPreset(preset);
    }
}

function toggleOverheadPower() {
    if (window.LightingEngine) {
        window.LightingEngine.toggleOverheadPower();
    }
}

function toggleOverheadFlashes(checked) {
    if (window.LightingEngine) {
        window.LightingEngine.toggleOverheadFlashes(checked);
    }
}

// Channel 2: Scene Atmosphere Light (amaran Ace 25c)
function setAtmosphereBrightness(val) {
    if (window.LightingEngine) {
        window.LightingEngine.setAtmosphereBrightness(parseInt(val));
    }
}

function setAtmosphereCCT(val) {
    if (window.LightingEngine) {
        window.LightingEngine.setAtmosphereCCT(parseInt(val));
    }
}

function setAtmosphereCustomColor(hex) {
    if (window.LightingEngine) {
        window.LightingEngine.setAtmosphereHex(hex);
    }
}

function applyAtmosphereColor(rgb, label) {
    if (window.LightingEngine) {
        window.LightingEngine.setAtmosphereColor(rgb);
        const effectEl = document.getElementById('lighting-effect-label');
        if (effectEl) effectEl.textContent = `🎨 ${label}`;
    }
}

function setAtmosphereEffect(effect) {
    if (window.LightingEngine) {
        window.LightingEngine.setAtmosphereEffect(effect);
        const effectEl = document.getElementById('lighting-effect-label');
        if (effectEl) effectEl.textContent = `✨ ${effect.toUpperCase()}`;
    }
}

// Backward compatibility aliases
function setLightingBrightness(val) { setAtmosphereBrightness(val); }
function setLightingCCT(val) { setAtmosphereCCT(val); }
function setLightingCustomColor(hex) { setAtmosphereCustomColor(hex); }
function applyLightingColor(rgb, label) { applyAtmosphereColor(rgb, label); }
function setLightingEffect(effect) { setAtmosphereEffect(effect); }

function toggleDiceLightingTriggers(checked) {
    if (window.LightingEngine) {
        window.LightingEngine.diceTriggers = checked;
        fetch('/api/lighting', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ diceTriggers: checked })
        }).catch(() => {});
    }
}

function toggleReactiveCombatLighting() {
    if (window.LightingEngine) {
        const state = window.LightingEngine.toggleReactiveCombat();
        showToast(`⚡ Reactive Combat Lighting: ${state ? 'ENABLED' : 'DISABLED'}`, state ? "success" : "info");
    }
}

function promptAddAce25c() {
    const modal = document.getElementById('add-ace-modal');
    if (!modal) {
        const nodeId = prompt("Enter amaran Ace 25c Node ID (e.g. 400U5-52611B):");
        if (nodeId && window.LightingEngine) {
            const name = prompt("Enter friendly name / location (optional):", "amaran Ace 25c");
            window.LightingEngine.addAtmosphereFixture(nodeId, name);
        }
        return;
    }

    const idInput = document.getElementById('add-ace-node-id');
    const nameInput = document.getElementById('add-ace-name');
    if (idInput) idInput.value = '';
    if (nameInput) {
        const count = (window.LightingEngine?.state?.atmosphere?.fixtures?.length || 0) + 1;
        nameInput.value = `amaran Ace 25c #${count}`;
    }

    const discSec = document.getElementById('add-ace-discovered-section');
    const discList = document.getElementById('add-ace-discovered-list');
    if (discSec && discList && window.LightingEngine) {
        const currentIds = (window.LightingEngine.state.atmosphere.fixtures || []).map(f => f.node_id);
        const unassigned = (window.LightingEngine.fixtures || []).filter(f => {
            const isAce = (f.name || '').toLowerCase().includes('ace') || (f.node_id || '').includes('400U');
            return isAce && !currentIds.includes(f.node_id);
        });

        if (unassigned.length > 0) {
            discSec.classList.remove('hidden');
            discList.innerHTML = unassigned.map(f => `
                <div class="flex items-center justify-between p-1.5 rounded bg-ledger-900 border border-indigo-500/20">
                    <div class="truncate">
                        <span class="font-bold text-slate-200 text-[10px] block truncate">${f.name}</span>
                        <span class="font-mono text-indigo-300 text-[9px]">${f.node_id}</span>
                    </div>
                    <button onclick="document.getElementById('add-ace-node-id').value = '${f.node_id}'; document.getElementById('add-ace-name').value = '${f.name}';" class="px-2 py-0.5 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[9px] font-bold transition">
                        Select
                    </button>
                </div>
            `).join('');
        } else {
            discSec.classList.add('hidden');
        }
    }

    openModal('add-ace-modal');
}

function submitAddAce25c() {
    const idInput = document.getElementById('add-ace-node-id');
    const nameInput = document.getElementById('add-ace-name');
    const nodeId = idInput ? idInput.value.trim() : '';
    const name = nameInput ? nameInput.value.trim() : '';

    if (!nodeId) {
        if (typeof showToast === 'function') showToast("Please enter a valid Node ID", "warning");
        return;
    }

    if (window.LightingEngine) {
        window.LightingEngine.addAtmosphereFixture(nodeId, name);
    }
    closeModal('add-ace-modal');
}

window.promptAddAce25c = promptAddAce25c;
window.submitAddAce25c = submitAddAce25c;

// -----------------------------------------------------------------------------
// KEYBOARD SHORTCUTS & INIT
// -----------------------------------------------------------------------------
// =============================================================================
// ARCANE LEDGER SETTINGS & CUSTOM KEYBINDINGS ENGINE
// =============================================================================

const DEFAULT_KEYBINDS = {
    // Navigation
    nav_combat: { label: "Combat & Party", group: "Navigation", default: "Alt+1", scope: "global" },
    nav_battlemap: { label: "Tabletop Battlemap", group: "Navigation", default: "Alt+M", scope: "global" },
    nav_bestiary: { label: "5.5e Bestiary (300+)", group: "Navigation", default: "Alt+6", scope: "global" },
    nav_encounters: { label: "Encounter Builder", group: "Navigation", default: "Alt+9", scope: "global" },
    nav_spells: { label: "Spells Compendium", group: "Navigation", default: "Alt+0", scope: "global" },
    nav_items: { label: "Items Compendium", group: "Navigation", default: "Alt+I", scope: "global" },
    nav_rules: { label: "2024 Rules Engine", group: "Navigation", default: "Alt+3", scope: "global" },
    nav_world: { label: "World, Factions & Quests", group: "Navigation", default: "Alt+7", scope: "global" },
    nav_npcs: { label: "NPC Generator & Roster", group: "Navigation", default: "Alt+2", scope: "global" },
    nav_loot: { label: "Loot & Merchant Generator", group: "Navigation", default: "Alt+4", scope: "global" },
    nav_notes: { label: "Session Scratchpad", group: "Navigation", default: "Alt+5", scope: "global" },
    nav_audio: { label: "Atmosphere & Lighting", group: "Navigation", default: "Alt+8", scope: "global" },
    nav_settings: { label: "Settings & Keybinds", group: "Navigation", default: "Alt+,", scope: "global" },

    // Combat & Tabletop Actions
    action_next_turn: { label: "Next Turn in Initiative", group: "Combat Tracker", default: "N", scope: "combat" },
    action_prev_turn: { label: "Previous Turn in Initiative", group: "Combat Tracker", default: "P", scope: "combat" },
    action_roll_d20: { label: "Quick Roll d20", group: "Combat Tracker", default: "R", scope: "combat" },
    action_dice_drawer: { label: "Toggle Quick Dice Drawer", group: "Dice & Tools", default: "Alt+D", scope: "global" },

    // NPC Generator Actions
    action_roll_npc: { label: "Generate / Roll Random NPC", group: "NPC Generator", default: "G", scope: "npcs" },
    action_save_npc: { label: "Save Current NPC to Roster", group: "NPC Generator", default: "S", scope: "npcs" },
    action_copy_npc: { label: "Copy NPC Statblock Markdown", group: "NPC Generator", default: "C", scope: "npcs" },
    action_unlock_npc: { label: "Unlock All Traits", group: "NPC Generator", default: "U", scope: "npcs" }
};

const DEFAULT_SETTINGS = {
    fogOpacity: 0.40,
    bloodiedAura: "standard",
    monsterHpRoll: "average",
    hoverRibbon: true,
    hideFogMonstersOnPlayerScreen: true,
    showClockOnPlayerScreen: true,
    autoBroadcastArt: false,
    crossfadeDuration: 3,
    diceFanfares: true,
    smartLights: true
};

window.ArcaneSettings = { ...DEFAULT_SETTINGS };
let activeRebindingAction = null;

function loadArcaneSettings() {
    try {
        const stored = localStorage.getItem('arcane_app_settings');
        if (stored) {
            window.ArcaneSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.warn("Could not load stored settings:", e);
        window.ArcaneSettings = { ...DEFAULT_SETTINGS };
    }
}

function saveArcaneSettings() {
    try {
        localStorage.setItem('arcane_app_settings', JSON.stringify(window.ArcaneSettings));
    } catch (e) {
        console.warn("Could not save settings to localStorage:", e);
    }
}

function getActiveKeybinds() {
    const map = {};
    for (const [id, def] of Object.entries(DEFAULT_KEYBINDS)) {
        map[id] = def.default;
    }
    try {
        const stored = localStorage.getItem('arcane_custom_keybinds');
        if (stored) {
            const custom = JSON.parse(stored);
            Object.assign(map, custom);
        }
    } catch (e) {
        console.warn("Could not load custom keybinds:", e);
    }
    return map;
}

function resetAllKeybindsToDefault() {
    localStorage.removeItem('arcane_custom_keybinds');
    updateSidebarKeybindTooltips();
    renderSettingsKeybinds();
    showToast("All keyboard shortcuts reset to default!", "info");
}

function resetSingleKeybind(actionId) {
    const current = getActiveKeybinds();
    if (DEFAULT_KEYBINDS[actionId]) {
        current[actionId] = DEFAULT_KEYBINDS[actionId].default;
        localStorage.setItem('arcane_custom_keybinds', JSON.stringify(current));
        updateSidebarKeybindTooltips();
        renderSettingsKeybinds();
        showToast(`Reset ${DEFAULT_KEYBINDS[actionId].label} to default (${DEFAULT_KEYBINDS[actionId].default}).`, "info");
    }
}

function normalizeKeyCombo(e) {
    const parts = [];
    if (e.ctrlKey) parts.push("Ctrl");
    if (e.altKey) parts.push("Alt");
    if (e.shiftKey && e.key !== "Shift") parts.push("Shift");
    if (e.metaKey) parts.push("Meta");

    let key = e.key;
    if (key === " " || key === "Spacebar") {
        key = "Space";
    } else if (key.length === 1) {
        key = key.toUpperCase();
    } else if (key.startsWith("Arrow")) {
        key = key.replace("Arrow", "");
    }
    
    // Ignore lone modifier presses
    if (["Control", "Alt", "Shift", "Meta"].includes(key)) {
        return null;
    }

    parts.push(key);
    return parts.join("+");
}

function startRebinding(actionId) {
    activeRebindingAction = actionId;
    const allBtns = document.querySelectorAll('.rebind-btn');
    allBtns.forEach(btn => {
        btn.innerHTML = 'Record';
        btn.classList.remove('bg-amber-400', 'text-ledger-950', 'animate-pulse');
        btn.classList.add('bg-ledger-800', 'text-slate-300');
    });

    const targetBtn = document.getElementById(`rebind-btn-${actionId}`);
    if (targetBtn) {
        targetBtn.innerHTML = '<span class="animate-pulse text-amber-950 font-bold">Press key... (Esc to cancel)</span>';
        targetBtn.classList.remove('bg-ledger-800', 'text-slate-300');
        targetBtn.classList.add('bg-amber-400', 'text-ledger-950');
    }
}

function cancelRebinding() {
    if (!activeRebindingAction) return;
    const targetBtn = document.getElementById(`rebind-btn-${activeRebindingAction}`);
    if (targetBtn) {
        targetBtn.innerHTML = 'Record';
        targetBtn.classList.remove('bg-amber-400', 'text-ledger-950');
        targetBtn.classList.add('bg-ledger-800', 'text-slate-300');
    }
    activeRebindingAction = null;
    showToast("Rebinding cancelled.", "info");
}

function handleRebindKeyEvent(e) {
    if (e.key === 'Escape') {
        cancelRebinding();
        return;
    }

    const combo = normalizeKeyCombo(e);
    if (!combo) return;

    const actionId = activeRebindingAction;
    activeRebindingAction = null;

    const keybinds = getActiveKeybinds();
    let collisionAction = null;
    for (const [otherId, otherCombo] of Object.entries(keybinds)) {
        if (otherId !== actionId && otherCombo && otherCombo.toUpperCase() === combo.toUpperCase()) {
            collisionAction = otherId;
            break;
        }
    }

    if (collisionAction) {
        const otherLabel = DEFAULT_KEYBINDS[collisionAction]?.label || collisionAction;
        showToast(`⚠️ "${combo}" was bound to ${otherLabel}. Swapped!`, "warning");
        keybinds[collisionAction] = keybinds[actionId];
    }

    keybinds[actionId] = combo;
    localStorage.setItem('arcane_custom_keybinds', JSON.stringify(keybinds));
    updateSidebarKeybindTooltips();
    renderSettingsKeybinds();

    showToast(`Keybinding saved: ${DEFAULT_KEYBINDS[actionId]?.label || actionId} ➔ ${combo}`, "success");
}

function updateSidebarKeybindTooltips() {
    const keybinds = getActiveKeybinds();
    const tabMap = {
        'combat': keybinds.nav_combat,
        'battlemap': keybinds.nav_battlemap,
        'bestiary': keybinds.nav_bestiary,
        'encounters': keybinds.nav_encounters,
        'spells': keybinds.nav_spells,
        'items': keybinds.nav_items,
        'rules': keybinds.nav_rules,
        'world': keybinds.nav_world,
        'npcs': keybinds.nav_npcs,
        'loot': keybinds.nav_loot,
        'notes': keybinds.nav_notes,
        'audio': keybinds.nav_audio,
        'settings': keybinds.nav_settings
    };

    for (const [tabKey, combo] of Object.entries(tabMap)) {
        const btn = document.getElementById(`tab-btn-${tabKey}`);
        if (btn) {
            const tooltip = btn.querySelector('.sidebar-tooltip');
            if (tooltip) {
                const baseText = tooltip.textContent.replace(/Alt\+[0-9MI,]|Ctrl\+\S+|Shift\+\S+|\S+$/g, '').trim();
                tooltip.innerHTML = `${baseText} <kbd class="ml-1 text-[9px] text-slate-400 font-mono">${combo}</kbd>`;
            }
        }
    }
}

function executeKeybindAction(actionId) {
    switch (actionId) {
        case 'nav_combat': switchTab('combat'); break;
        case 'nav_battlemap': switchTab('battlemap'); break;
        case 'nav_bestiary': switchTab('bestiary'); break;
        case 'nav_encounters': switchTab('encounters'); break;
        case 'nav_spells': switchTab('spells'); break;
        case 'nav_items': switchTab('items'); break;
        case 'nav_rules': switchTab('rules'); break;
        case 'nav_world': switchTab('world'); break;
        case 'nav_npcs': switchTab('npcs'); break;
        case 'nav_loot': switchTab('loot'); break;
        case 'nav_notes': switchTab('notes'); break;
        case 'nav_audio': switchTab('audio'); break;
        case 'nav_settings': switchTab('settings'); break;

        case 'action_next_turn': nextCombatTurn(); break;
        case 'action_prev_turn': prevCombatTurn(); break;
        case 'action_roll_d20': rollDie(20); break;
        case 'action_dice_drawer': toggleTopPopover('dice-drawer'); break;

        case 'action_roll_npc': rollFullNPC(); break;
        case 'action_save_npc': saveCurrentNPCToRoster(); break;
        case 'action_copy_npc': copyNPCMarkdown(); break;
        case 'action_unlock_npc': unlockAllTraits(); break;
    }
}

// Global Keydown Listener
document.addEventListener('keydown', (e) => {
    if (activeRebindingAction) {
        e.preventDefault();
        e.stopPropagation();
        handleRebindKeyEvent(e);
        return;
    }

    const active = document.activeElement;
    const isTyping = active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT' ||
        active.isContentEditable
    );
    if (isTyping) return;

    const combo = normalizeKeyCombo(e);
    if (!combo) return;

    const keybinds = getActiveKeybinds();
    for (const [actionId, boundCombo] of Object.entries(keybinds)) {
        if (boundCombo && boundCombo.toUpperCase() === combo.toUpperCase()) {
            const def = DEFAULT_KEYBINDS[actionId];
            if (!def) continue;

            if (def.scope === 'global' || def.scope === appState.activeTab) {
                e.preventDefault();
                executeKeybindAction(actionId);
                return;
            }
        }
    }
});

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// -----------------------------------------------------------------------------
// CAMPAIGN PROFILE & MODULE MANAGER SYSTEM
// -----------------------------------------------------------------------------

function applyModuleVisibility() {
    if (!appState.currentCampaign || !appState.currentCampaign.modules) return;
    const modules = appState.currentCampaign.modules;
    const worldEnabled = modules.world !== false;

    AVAILABLE_MODULES.forEach(mod => {
        const isSub = WORLD_SUBMODULE_IDS.includes(mod.id);
        const isEnabled = modules[mod.id] !== false && (!isSub || worldEnabled);
        const btn = document.getElementById(`tab-btn-${mod.id}`);
        if (btn) {
            if (isEnabled) {
                btn.classList.remove('hidden');
            } else {
                btn.classList.add('hidden');
            }
        }
        const subBtn = document.getElementById(`world-subtab-${mod.id}`);
        if (subBtn) {
            if (isEnabled && worldEnabled) {
                subBtn.classList.remove('hidden');
            } else {
                subBtn.classList.add('hidden');
            }
        }
    });

    const worldBtn = document.getElementById('tab-btn-world');
    const worldSubtabs = document.getElementById('sidebar-world-subtabs');
    if (worldBtn) {
        if (worldEnabled) {
            worldBtn.classList.remove('hidden');
        } else {
            worldBtn.classList.add('hidden');
        }
    }
    if (worldSubtabs) {
        if (!worldEnabled) {
            worldSubtabs.classList.add('hidden');
        }
    }

    const currentTabDisabled = modules[appState.activeTab] === false || (appState.activeTab === 'world' && !worldEnabled);
    if (currentTabDisabled) {
        const firstEnabled = AVAILABLE_MODULES.find(m => {
            const isSub = WORLD_SUBMODULE_IDS.includes(m.id);
            return modules[m.id] !== false && (!isSub || worldEnabled);
        });
        const nextTab = firstEnabled ? firstEnabled.id : 'settings';
        switchTab(nextTab);
    }

    renderActivePresetBadge();
    renderModuleToggles();
}

function renderCampaignTopbar() {
    const nameEl = document.getElementById('topbar-campaign-name');
    const listEl = document.getElementById('topbar-campaign-list');
    if (!nameEl) return;

    const activeCamp = appState.currentCampaign || appState.campaigns.find(c => c.id === appState.activeCampaignId) || { name: 'Default Campaign' };
    nameEl.textContent = activeCamp.name || 'Default Campaign';

    if (!listEl) return;
    if (!appState.campaigns || appState.campaigns.length === 0) {
        listEl.innerHTML = `<div class="text-[11px] text-slate-500 py-2 text-center">No campaigns found</div>`;
        return;
    }

    listEl.innerHTML = appState.campaigns.map(camp => {
        const isActive = camp.id === appState.activeCampaignId;
        const presetName = appState.playstylePresets[camp.preset]?.name || (camp.preset === 'custom' ? 'Custom' : 'Full Immersion');
        return `
            <div onclick="switchCampaign('${camp.id}')" class="p-2 rounded-xl cursor-pointer transition flex items-center justify-between gap-2 ${isActive ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300' : 'bg-ledger-900/80 hover:bg-ledger-800 border border-ledger-700/60 text-slate-200'}">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                        <span class="font-bold text-xs truncate">${escapeHtml(camp.name)}</span>
                        ${isActive ? '<span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/30 text-amber-300 border border-amber-500/40">ACTIVE</span>' : ''}
                    </div>
                    <div class="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span>${presetName}</span>
                        ${camp.partyCount !== undefined ? `<span>• ${camp.partyCount} PCs</span>` : (isActive && appState.party?.length ? `<span>• ${appState.party.length} PCs</span>` : '')}
                    </div>
                </div>
                <div class="shrink-0 text-slate-400">
                    ${isActive ? '✓' : '→'}
                </div>
            </div>
        `;
    }).join('');
}

function renderCampaignSettingsCard() {
    const bannerEl = document.getElementById('settings-active-campaign-banner');
    const listEl = document.getElementById('settings-campaigns-list');
    if (!bannerEl || !listEl) return;

    const activeCamp = appState.currentCampaign || appState.campaigns.find(c => c.id === appState.activeCampaignId) || {
        id: 'default',
        name: 'Default Campaign',
        description: 'Primary adventuring party and world state',
        preset: 'full'
    };

    const presetName = appState.playstylePresets[activeCamp.preset]?.name || (activeCamp.preset === 'custom' ? 'Custom Configuration' : 'Full Tabletop Immersion');
    const activePcCount = (activeCamp.partyCount !== undefined) ? activeCamp.partyCount : (appState.party?.length || 0);

    bannerEl.innerHTML = `
        <div class="flex items-center gap-3 min-w-0">
            <div class="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-2xl text-amber-400 shrink-0">
                📜
            </div>
            <div class="min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">CURRENT ACTIVE CAMPAIGN</span>
                    <span class="text-[10px] text-slate-400 font-mono">Party: <strong class="text-slate-200">${activePcCount} Player Characters (PCs)</strong></span>
                    <span class="text-[10px] text-slate-400 font-mono">Preset: <strong class="text-slate-200">${presetName}</strong></span>
                </div>
                <h4 class="font-display font-bold text-lg text-slate-100 truncate mt-0.5">${escapeHtml(activeCamp.name)}</h4>
                <p class="text-xs text-slate-300 leading-snug truncate max-w-xl">${escapeHtml(activeCamp.description || 'No description provided.')}</p>
            </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
            <button onclick="openEditCampaignModal('${activeCamp.id}')" class="px-3 py-1.5 rounded-lg bg-ledger-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-ledger-700 transition flex items-center gap-1.5">
                <span>✏️</span> Edit Details
            </button>
            <button onclick="duplicateCampaign('${activeCamp.id}')" class="px-3 py-1.5 rounded-lg bg-ledger-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-ledger-700 transition flex items-center gap-1.5" title="Clone current party & lore into a new profile">
                <span>📋</span> Duplicate
            </button>
        </div>
    `;

    if (!appState.campaigns || appState.campaigns.length === 0) {
        listEl.innerHTML = `<div class="col-span-full text-center text-slate-500 text-xs py-4">No campaign profiles found.</div>`;
        return;
    }

    listEl.innerHTML = appState.campaigns.map(camp => {
        const isActive = camp.id === appState.activeCampaignId;
        const pName = appState.playstylePresets[camp.preset]?.name || (camp.preset === 'custom' ? 'Custom' : 'Full Immersion');
        const count = camp.partyCount !== undefined ? camp.partyCount : (isActive ? (appState.party?.length || 0) : 0);
        const lastPlayed = camp.lastPlayed ? new Date(camp.lastPlayed).toLocaleDateString() : 'Recently';

        return `
            <div class="bg-ledger-900/80 border ${isActive ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/30' : 'border-ledger-800 hover:border-ledger-700'} rounded-xl p-4 flex flex-col justify-between gap-3 transition shadow-sm">
                <div>
                    <div class="flex items-center justify-between gap-2 mb-1">
                        <div class="flex items-center gap-1.5 min-w-0">
                            <span class="text-base">📜</span>
                            <h5 class="font-bold text-sm text-slate-100 truncate">${escapeHtml(camp.name)}</h5>
                        </div>
                        ${isActive ? '<span class="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 font-bold shrink-0">ACTIVE</span>' : ''}
                    </div>
                    <p class="text-[11px] text-slate-400 line-clamp-2 leading-relaxed min-h-[32px]">${escapeHtml(camp.description || 'No description.')}</p>
                    <div class="flex items-center gap-3 text-[10px] font-mono text-slate-400 pt-2 border-t border-ledger-800/60 mt-2">
                        <span>👥 ${count} PCs (Player Characters)</span>
                        <span>•</span>
                        <span>🎭 ${pName}</span>
                        <span>•</span>
                        <span>🕒 ${lastPlayed}</span>
                    </div>
                </div>

                <div class="flex items-center justify-between gap-2 pt-2 border-t border-ledger-800/60">
                    <div class="flex items-center gap-1.5">
                        <button onclick="openEditCampaignModal('${camp.id}')" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition" title="Edit campaign title & notes">
                            ✏️
                        </button>
                        <button onclick="duplicateCampaign('${camp.id}')" class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition" title="Duplicate campaign">
                            📋
                        </button>
                        ${appState.campaigns.length > 1 ? `
                            <button onclick="deleteCampaign('${camp.id}')" class="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition" title="Delete campaign profile">
                                🗑️
                            </button>
                        ` : ''}
                    </div>

                    ${isActive ? `
                        <span class="text-xs font-semibold text-amber-400 flex items-center gap-1">
                            <span>✓</span> Loaded
                        </span>
                    ` : `
                        <button onclick="switchCampaign('${camp.id}')" class="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-ledger-950 font-bold text-xs transition border border-amber-500/30">
                            Switch Profile
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

function renderActivePresetBadge() {
    const badge = document.getElementById('active-preset-badge');
    const preset = appState.currentCampaign?.preset || 'full';
    const presetDef = appState.playstylePresets[preset];
    if (badge) {
        if (presetDef) {
            badge.textContent = presetDef.name;
            badge.className = "px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40";
        } else {
            badge.textContent = "Custom Configuration";
            badge.className = "px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40";
        }
    }

    ['full', 'theater', 'prep', 'minimal'].forEach(p => {
        const card = document.getElementById(`preset-card-${p}`);
        if (card) {
            if (preset === p) {
                card.classList.add('border-amber-500', 'bg-amber-500/10', 'ring-1', 'ring-amber-500/40');
                card.classList.remove('border-ledger-700', 'bg-ledger-900');
            } else {
                card.classList.remove('border-amber-500', 'bg-amber-500/10', 'ring-1', 'ring-amber-500/40');
                card.classList.add('border-ledger-700', 'bg-ledger-900');
            }
        }
    });
}

function renderModuleToggles() {
    const grid = document.getElementById('module-toggles-grid');
    if (!grid) return;
    const currentModules = appState.currentCampaign?.modules || {};

    grid.innerHTML = AVAILABLE_MODULES.map(mod => {
        const isEnabled = currentModules[mod.id] !== false;
        return `
            <div class="p-3 rounded-xl border ${isEnabled ? 'bg-ledger-900/90 border-ledger-700' : 'bg-ledger-950/60 border-ledger-800/80 opacity-60'} flex items-start justify-between gap-3 transition">
                <div class="flex items-start gap-2.5 min-w-0">
                    <span class="text-xl shrink-0 mt-0.5">${mod.icon}</span>
                    <div class="min-w-0">
                        <div class="font-bold text-xs text-slate-200 flex items-center gap-1.5">
                            <span>${mod.name}</span>
                            ${!isEnabled ? '<span class="text-[9px] font-mono text-slate-500 uppercase">Disabled</span>' : ''}
                        </div>
                        <p class="text-[11px] text-slate-400 leading-snug mt-0.5">${mod.desc}</p>
                    </div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
                    <input type="checkbox" ${isEnabled ? 'checked' : ''} onchange="toggleModule('${mod.id}', this.checked)" class="sr-only peer">
                    <div class="w-9 h-5 bg-ledger-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
            </div>
        `;
    }).join('');
}

async function switchCampaign(campaignId) {
    if (!campaignId || campaignId === appState.activeCampaignId) {
        closeAllTopPopovers();
        return;
    }
    try {
        const res = await fetch(`/api/campaigns/${campaignId}/switch`, {
            method: 'POST'
        });
        if (res.ok) {
            const data = await res.json();
            appState.activeCampaignId = data.activeCampaignId;
            closeAllTopPopovers();

            // Reset campaign-scoped in-memory state before loading new profile
            appState.party = [];
            appState.combat = { inCombat: false, round: 1, currentTurnIndex: 0, combatants: [] };
            appState.roster = [];
            appState.notes = [];
            appState.overworld = { pins: [], routes: [], regions: [] };
            appState.factionRelations = { relations: [], turnHistory: [] };
            appState.pantheon = [];
            appState.timeline = { eras: [], events: [] };
            appState.timelineFilterEra = 'all';
            appState.partyStash = { currency: { pp: 0, gp: 0, sp: 0, cp: 0 }, coins: { pp: 0, gp: 0, sp: 0, cp: 0 }, items: [] };
            appState.travel = { pace: 'Normal', terrain: 'Forest', road: 'trail', targetMiles: 48, marchHours: 8, navBonus: 0, forageBonus: 0, history: [] };

            await fetchFullState();

            populateTopFilterDropdowns();
            renderPartyHUD();
            renderCombatTracker();
            renderCurrentNPC();
            renderRoster();
            renderRulesScreen();
            renderTimeWeatherHUD();
            renderSessionNotes();
            renderWorldView();
            renderOverworld();
            renderFactionRelations();
            renderPantheon();
            renderTimeline();
            renderTravel();
            renderAudioMixer();
            renderEncountersView();
            renderSpellsView();
            renderItemsView();
            renderSecrets();
            renderHandouts();
            renderBroadcastPill();
            renderCampaignSettingsCard();
            renderShopInventory();
            if (typeof renderPartyInventoryModal === 'function') {
                renderPartyInventoryModal();
            }
            if (appState.activeTab === 'battlemap' && window.BattlemapController) {
                window.BattlemapController.init();
            }
            showToast(`Switched to campaign: ${data.campaign?.name || campaignId}`, 'success');
        } else {
            showToast('Failed to switch campaign.', 'error');
        }
    } catch (err) {
        console.error('Error switching campaign:', err);
        showToast('Network error while switching campaign.', 'error');
    }
}

function openNewCampaignModal() {
    closeAllTopPopovers();
    const nameInput = document.getElementById('new-campaign-name');
    const descInput = document.getElementById('new-campaign-desc');
    const presetSelect = document.getElementById('new-campaign-preset');
    if (nameInput) nameInput.value = '';
    if (descInput) descInput.value = '';
    if (presetSelect) presetSelect.value = 'full';
    openModal('new-campaign-modal');
    setTimeout(() => nameInput?.focus(), 100);
}

async function submitNewCampaign(event) {
    if (event) event.preventDefault();
    const name = document.getElementById('new-campaign-name')?.value?.trim();
    if (!name) return;
    const desc = document.getElementById('new-campaign-desc')?.value?.trim() || '';
    const preset = document.getElementById('new-campaign-preset')?.value || 'full';
    const template = document.querySelector('input[name="new-campaign-template"]:checked')?.value || 'blank';

    try {
        const res = await fetch('/api/campaigns', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: desc, preset, template })
        });
        if (res.ok) {
            const data = await res.json();
            closeModal('new-campaign-modal');
            await fetchFullState();
            renderPartyHUD();
            renderCombatTracker();
            renderCurrentNPC();
            renderRoster();
            renderRulesScreen();
            renderTimeWeatherHUD();
            renderSessionNotes();
            renderWorldView();
            renderOverworld();
            renderFactionRelations();
            renderPantheon();
            renderTimeline();
            renderTravel();
            renderAudioMixer();
            renderEncountersView();
            renderSpellsView();
            renderItemsView();
            renderSecrets();
            renderHandouts();
            renderBroadcastPill();
            renderCampaignSettingsCard();
            renderShopInventory();
            if (typeof renderPartyInventoryModal === 'function') {
                renderPartyInventoryModal();
            }
            if (appState.activeTab === 'battlemap' && window.BattlemapController) {
                window.BattlemapController.init();
            }
            showToast(`Campaign created: ${data.campaign.name}`, 'success');
        } else {
            const err = await res.json();
            showToast(err.detail || 'Failed to create campaign', 'error');
        }
    } catch (err) {
        console.error('Error creating campaign:', err);
        showToast('Network error creating campaign.', 'error');
    }
}

function openEditCampaignModal(campaignId) {
    const camp = appState.campaigns.find(c => c.id === campaignId);
    if (!camp) return;
    const idInput = document.getElementById('edit-campaign-id');
    const nameInput = document.getElementById('edit-campaign-name');
    const descInput = document.getElementById('edit-campaign-desc');
    if (idInput) idInput.value = camp.id;
    if (nameInput) nameInput.value = camp.name;
    if (descInput) descInput.value = camp.description || '';
    openModal('edit-campaign-modal');
    setTimeout(() => nameInput?.focus(), 100);
}

async function submitEditCampaign(event) {
    if (event) event.preventDefault();
    const campId = document.getElementById('edit-campaign-id')?.value;
    const name = document.getElementById('edit-campaign-name')?.value?.trim();
    if (!campId || !name) return;
    const desc = document.getElementById('edit-campaign-desc')?.value?.trim() || '';

    try {
        const res = await fetch(`/api/campaigns/${campId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description: desc })
        });
        if (res.ok) {
            const data = await res.json();
            closeModal('edit-campaign-modal');
            const target = appState.campaigns.find(c => c.id === campId);
            if (target) {
                target.name = data.campaign.name;
                target.description = data.campaign.description;
            }
            if (appState.currentCampaign?.id === campId) {
                appState.currentCampaign.name = data.campaign.name;
                appState.currentCampaign.description = data.campaign.description;
            }
            renderCampaignTopbar();
            renderCampaignSettingsCard();
            showToast('Campaign details updated.', 'success');
        } else {
            showToast('Failed to update campaign.', 'error');
        }
    } catch (err) {
        console.error('Error updating campaign:', err);
        showToast('Network error updating campaign.', 'error');
    }
}

async function duplicateCampaign(campaignId) {
    try {
        const res = await fetch(`/api/campaigns/${campaignId}/duplicate`, {
            method: 'POST'
        });
        if (res.ok) {
            const data = await res.json();
            appState.campaigns.push(data.campaign);
            renderCampaignTopbar();
            renderCampaignSettingsCard();
            showToast(`Campaign duplicated: ${data.campaign.name}`, 'success');
        } else {
            showToast('Failed to duplicate campaign.', 'error');
        }
    } catch (err) {
        console.error('Error duplicating campaign:', err);
        showToast('Network error duplicating campaign.', 'error');
    }
}

async function deleteCampaign(campaignId) {
    if (appState.campaigns.length <= 1) {
        showToast('Cannot delete the only campaign profile.', 'error');
        return;
    }
    const camp = appState.campaigns.find(c => c.id === campaignId);
    const conf = confirm(`Are you sure you want to delete campaign "${camp ? camp.name : campaignId}"? This will permanently delete its isolated party, combat, notes, and lore data.`);
    if (!conf) return;

    try {
        const res = await fetch(`/api/campaigns/${campaignId}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            const data = await res.json();
            await fetchFullState();
            renderPartyHUD();
            renderCombatTracker();
            renderCurrentNPC();
            renderRoster();
            renderTimeWeatherHUD();
            renderSessionNotes();
            renderWorldView();
            renderSecrets();
            renderHandouts();
            renderEncountersView();
            renderCampaignSettingsCard();
            if (appState.activeTab === 'battlemap' && window.BattlemapController) {
                window.BattlemapController.init();
            }
            showToast('Campaign deleted.', 'info');
        } else {
            showToast('Failed to delete campaign.', 'error');
        }
    } catch (err) {
        console.error('Error deleting campaign:', err);
        showToast('Network error deleting campaign.', 'error');
    }
}

async function applyPlaystylePreset(presetKey) {
    if (!appState.currentCampaign) return;
    const preset = appState.playstylePresets[presetKey];
    if (!preset) return;

    appState.currentCampaign.preset = presetKey;
    appState.currentCampaign.modules = Object.assign({}, preset.modules);

    try {
        await fetch(`/api/campaigns/${appState.activeCampaignId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preset: presetKey, modules: appState.currentCampaign.modules })
        });
        applyModuleVisibility();
        showToast(`Applied preset: ${preset.name}`, 'success');
    } catch (err) {
        console.error('Error saving preset:', err);
    }
}

async function toggleModule(moduleId, isEnabled) {
    if (!appState.currentCampaign) return;
    if (!appState.currentCampaign.modules) {
        appState.currentCampaign.modules = {};
    }
    appState.currentCampaign.modules[moduleId] = isEnabled;
    if (moduleId === 'world') {
        WORLD_SUBMODULE_IDS.forEach(subId => {
            appState.currentCampaign.modules[subId] = isEnabled;
        });
    } else if (WORLD_SUBMODULE_IDS.includes(moduleId) && isEnabled) {
        appState.currentCampaign.modules['world'] = true;
    }
    appState.currentCampaign.preset = 'custom';

    try {
        await fetch(`/api/campaigns/${appState.activeCampaignId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ preset: 'custom', modules: appState.currentCampaign.modules })
        });
        applyModuleVisibility();
        showToast(`${isEnabled ? 'Enabled' : 'Disabled'} ${moduleId} module`, 'info');
    } catch (err) {
        console.error('Error toggling module:', err);
    }
}

// Render Settings View
function renderSettingsView() {
    loadArcaneSettings();
    renderCampaignSettingsCard();
    renderModuleToggles();
    renderActivePresetBadge();
    renderSettingsKeybinds();

    const fogSlider = document.getElementById('setting-fog-opacity');
    const fogVal = document.getElementById('setting-fog-opacity-val');
    if (fogSlider && fogVal) {
        const pct = Math.round(window.ArcaneSettings.fogOpacity * 100);
        fogSlider.value = pct;
        fogVal.textContent = `${pct}%`;
    }

    const auraSelect = document.getElementById('setting-bloodied-aura');
    if (auraSelect) auraSelect.value = window.ArcaneSettings.bloodiedAura || 'standard';

    const hpSelect = document.getElementById('setting-monster-hp-roll');
    if (hpSelect) hpSelect.value = window.ArcaneSettings.monsterHpRoll || 'average';

    const hoverCheck = document.getElementById('setting-hover-ribbon');
    if (hoverCheck) hoverCheck.checked = window.ArcaneSettings.hoverRibbon !== false;

    const hideFogCheck = document.getElementById('setting-hide-fog-monsters');
    if (hideFogCheck) hideFogCheck.checked = window.ArcaneSettings.hideFogMonstersOnPlayerScreen !== false;

    const clockCheck = document.getElementById('setting-player-clock');
    if (clockCheck) clockCheck.checked = window.ArcaneSettings.showClockOnPlayerScreen !== false;

    const autoArtCheck = document.getElementById('setting-auto-broadcast-art');
    if (autoArtCheck) autoArtCheck.checked = !!window.ArcaneSettings.autoBroadcastArt;

    const crossfadeSelect = document.getElementById('setting-crossfade-duration');
    if (crossfadeSelect) crossfadeSelect.value = String(window.ArcaneSettings.crossfadeDuration || 3);

    const fanfaresCheck = document.getElementById('setting-dice-fanfares');
    if (fanfaresCheck) fanfaresCheck.checked = window.ArcaneSettings.diceFanfares !== false;

    const lightsCheck = document.getElementById('setting-smart-lights');
    if (lightsCheck) lightsCheck.checked = window.ArcaneSettings.smartLights !== false;
}

function renderSettingsKeybinds() {
    const container = document.getElementById('settings-keybinds-container');
    if (!container) return;

    const keybinds = getActiveKeybinds();
    const groups = {};
    for (const [id, def] of Object.entries(DEFAULT_KEYBINDS)) {
        if (!groups[def.group]) groups[def.group] = [];
        groups[def.group].push({ id, ...def, current: keybinds[id] || def.default });
    }

    let html = '';
    for (const [groupName, items] of Object.entries(groups)) {
        html += `
            <div class="space-y-2">
                <h4 class="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-ledger-800 pb-1.5 flex items-center justify-between">
                    <span>${groupName}</span>
                    <span class="text-[10px] text-slate-500 font-normal">Scope: ${items[0].scope}</span>
                </h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        `;

        for (const item of items) {
            const isCustom = item.current !== item.default;
            html += `
                <div class="flex items-center justify-between p-2.5 rounded-xl bg-ledger-900/90 border ${isCustom ? 'border-amber-500/50 bg-amber-500/5' : 'border-ledger-800'} transition hover:border-ledger-700">
                    <div class="flex items-center gap-2 min-w-0 pr-2">
                        <span class="text-xs text-slate-200 font-medium truncate">${item.label}</span>
                        ${isCustom ? '<span class="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">Custom</span>' : ''}
                    </div>
                    <div class="flex items-center gap-2 shrink-0">
                        <kbd id="keybind-badge-${item.id}" class="px-2.5 py-1 rounded-lg bg-ledger-950 border border-ledger-700 text-amber-300 font-mono text-xs font-bold shadow-inner min-w-[55px] text-center">
                            ${item.current}
                        </kbd>
                        <button id="rebind-btn-${item.id}" onclick="startRebinding('${item.id}')" class="rebind-btn px-2.5 py-1 rounded-lg bg-ledger-800 hover:bg-amber-500 hover:text-ledger-950 text-slate-300 text-xs font-bold border border-ledger-700 transition">
                            Record
                        </button>
                        ${isCustom ? `
                            <button onclick="resetSingleKeybind('${item.id}')" class="p-1 rounded-lg bg-ledger-950 hover:bg-rose-950 text-slate-400 hover:text-rose-300 border border-ledger-800 text-xs transition" title="Reset to default (${item.default})">
                                ↺
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

// Setting Updaters
function updateSettingFogOpacity(val) {
    const pct = parseInt(val, 10);
    const alpha = pct / 100;
    window.ArcaneSettings.fogOpacity = alpha;
    saveArcaneSettings();
    const label = document.getElementById('setting-fog-opacity-val');
    if (label) label.textContent = `${pct}%`;
    if (window.BattlemapController && typeof window.BattlemapController.renderDMFog === 'function') {
        window.BattlemapController.renderDMFog();
    }
}

function updateSettingBloodiedAura(val) {
    window.ArcaneSettings.bloodiedAura = val;
    saveArcaneSettings();
    showToast(`Bloodied Aura style updated.`, "info");
}

function updateSettingMonsterHp(val) {
    window.ArcaneSettings.monsterHpRoll = val;
    saveArcaneSettings();
    showToast(`Monster HP Generation set to: ${val === 'roll' ? 'Random Hit Dice' : 'Standard Average'}`, "info");
}

function updateSettingHoverRibbon(checked) {
    window.ArcaneSettings.hoverRibbon = checked;
    saveArcaneSettings();
    showToast(`Token Hover Stat Ribbon: ${checked ? 'Enabled' : 'Disabled'}`, "info");
}

function updateSettingHideFogMonsters(checked) {
    window.ArcaneSettings.hideFogMonstersOnPlayerScreen = checked;
    saveArcaneSettings();
    showToast(`Hide Fog Monsters on Player Screen: ${checked ? 'Enabled' : 'Disabled'}`, "info");
}

function updateSettingPlayerClock(checked) {
    window.ArcaneSettings.showClockOnPlayerScreen = checked;
    saveArcaneSettings();
    showToast(`Clock on Player Screen: ${checked ? 'Enabled' : 'Disabled'}`, "info");
}

function updateSettingAutoBroadcast(checked) {
    window.ArcaneSettings.autoBroadcastArt = checked;
    saveArcaneSettings();
    showToast(`Auto-Broadcast Art: ${checked ? 'Enabled' : 'Disabled'}`, "info");
}

function updateSettingCrossfade(val) {
    window.ArcaneSettings.crossfadeDuration = parseInt(val, 10);
    saveArcaneSettings();
    showToast(`Audio crossfade set to ${val}s.`, "info");
}

function updateSettingDiceFanfares(checked) {
    window.ArcaneSettings.diceFanfares = checked;
    saveArcaneSettings();
    showToast(`Dice roll fanfares: ${checked ? 'Enabled' : 'Disabled'}`, "info");
}

function updateSettingSmartLights(checked) {
    window.ArcaneSettings.smartLights = checked;
    saveArcaneSettings();
    showToast(`amaran smart lights: ${checked ? 'Enabled' : 'Disabled'}`, "info");
}

function clearDiceHistoryAction() {
    appState.diceHistory = [];
    renderDiceHistory();
    const banner = document.getElementById('dice-result-banner');
    if (banner) banner.innerHTML = '<span class="text-slate-500">Roll result...</span>';
    showToast("Dice roll history cleared.", "info");
}

// =============================================================================
// PHASE 6: REGIONAL OVERWORLD MAP, FACTION MATRIX, PANTHEON, TIMELINE, TRAVEL & INVENTORY
// =============================================================================

// -----------------------------------------------------------------------------
// 1. REGIONAL OVERWORLD CARTOGRAPHY & LORE PINS
// -----------------------------------------------------------------------------
function renderOverworld() {
    const ow = appState.overworld || {};
    const activeMap = (ow.maps && ow.maps.find(m => m.id === ow.activeMapId)) || ow.maps?.[0] || ow;
    const titleInput = document.getElementById('overworld-title-input');
    const scaleInput = document.getElementById('overworld-scale-input');
    const mapImg = document.getElementById('overworld-map-img');
    const mapSelect = document.getElementById('overworld-map-select');
    const breadcrumbBar = document.getElementById('overworld-breadcrumb-bar');
    const breadcrumbTrail = document.getElementById('overworld-breadcrumb-trail');
    const terrainBadge = document.getElementById('ow-current-terrain-badge');
    const hexToggleLabel = document.getElementById('ow-hex-toggle-label');
    const hexToggleBtn = document.getElementById('ow-hex-toggle-btn');

    // Populate Map Tier Selector grouped by tier
    if (mapSelect && Array.isArray(ow.maps)) {
        const availableTiers = ow.tiers || ["Kingdom", "Province", "Settlement", "Dungeon"];
        const tierSet = new Set(availableTiers);
        ow.maps.forEach(m => { if (m.type) tierSet.add(m.type); });
        const allTiers = Array.from(tierSet);

        let selectHtml = '';
        allTiers.forEach(tier => {
            const tierMaps = ow.maps.filter(m => (m.type || 'Kingdom').toLowerCase() === tier.toLowerCase());
            if (tierMaps.length > 0) {
                selectHtml += `<optgroup label="${escapeHTML(tier)} Tier (${tierMaps.length})">`;
                tierMaps.forEach(m => {
                    const icon = tier === 'Kingdom' ? '👑' : (tier === 'Province' ? '🗺️' : (tier === 'Settlement' ? '🏰' : (tier === 'Dungeon' ? '⚔️' : '📍')));
                    const isSel = m.id === ow.activeMapId ? 'selected' : '';
                    selectHtml += `<option value="${m.id}" ${isSel}>${icon} ${escapeHTML(m.title || 'Untitled Map')}</option>`;
                });
                selectHtml += `</optgroup>`;
            }
        });

        const uncategorized = ow.maps.filter(m => !allTiers.some(t => t.toLowerCase() === (m.type || '').toLowerCase()));
        if (uncategorized.length > 0) {
            selectHtml += `<optgroup label="Other Maps">`;
            uncategorized.forEach(m => {
                const isSel = m.id === ow.activeMapId ? 'selected' : '';
                selectHtml += `<option value="${m.id}" ${isSel}>📍 ${escapeHTML(m.title || 'Untitled Map')}</option>`;
            });
            selectHtml += `</optgroup>`;
        }
        mapSelect.innerHTML = selectHtml;
    }

    // Breadcrumbs
    if (breadcrumbBar) {
        if (ow.activeMapId && ow.activeMapId !== 'map-main' && ow.maps?.length > 1) {
            breadcrumbBar.classList.remove('hidden');
            breadcrumbBar.classList.add('flex');
            const rootMap = ow.maps.find(m => m.id === 'map-main') || ow.maps[0];
            if (breadcrumbTrail) {
                breadcrumbTrail.innerText = `${rootMap.title} > ${activeMap.title || 'Sub-Map'}`;
            }
        } else {
            breadcrumbBar.classList.add('hidden');
            breadcrumbBar.classList.remove('flex');
        }
    }

    if (titleInput && activeMap.title) titleInput.value = activeMap.title;
    if (scaleInput && activeMap.scale) scaleInput.value = activeMap.scale;
    if (mapImg && activeMap.mapUrl) mapImg.src = activeMap.mapUrl;

    const currentTerrain = activeMap.partyMarker?.terrain || 'Forest';
    const terrainSelect = document.getElementById('ow-current-terrain-select');
    if (terrainSelect) terrainSelect.value = currentTerrain;
    if (terrainBadge) {
        terrainBadge.innerText = `🌲 Terrain: ${currentTerrain}`;
    }

    const hexConfig = activeMap.hexGrid || { enabled: true, opacity: 0.25, size: 36 };
    if (hexToggleLabel) {
        hexToggleLabel.innerText = hexConfig.enabled ? 'Hex Grid (On)' : 'Hex Grid (Off)';
    }
    if (hexToggleBtn) {
        if (hexConfig.enabled) {
            hexToggleBtn.className = "px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border-amber-500/40";
        } else {
            hexToggleBtn.className = "px-2.5 py-1 rounded-lg text-xs font-bold border transition flex items-center gap-1.5 bg-ledger-800 text-slate-400 border-ledger-700 hover:text-white";
        }
    }

    // Render Layers
    renderOverworldHexGrid(document.getElementById('overworld-hex-svg'), hexConfig, false);
    renderOverworldFog(document.getElementById('overworld-fog-svg'), activeMap.fog || { enabled: true, revealedPoints: [] }, activeMap.pins || [], activeMap.partyMarker, false);
    renderOverworldRoutesAndTrail();
    renderOverworldCamps();
    renderOverworldPins();
    renderOverworldPinList();
    renderOverworldPinPopover();
    initOverworldPanZoom();
    updateOverworldTransform();
}

// -------------------------------------------------------------
// OVERWORLD ZOOM & PAN CONTROLLER
// -------------------------------------------------------------
let owZoom = 1.0;
let owPanX = 0;
let owPanY = 0;
let owIsDragging = false;
let owDragStartX = 0;
let owDragStartY = 0;
let owDragStartPanX = 0;
let owDragStartPanY = 0;
window._owHasDragged = false;
let owPanZoomInitialized = false;

function updateOverworldTransform() {
    const canvas = document.getElementById('overworld-map-canvas');
    const badge = document.getElementById('ow-zoom-level-badge');
    if (canvas) {
        canvas.style.transform = `translate(${owPanX}px, ${owPanY}px) scale(${owZoom})`;
        canvas.style.transformOrigin = '0 0';
    }
    if (badge) {
        badge.textContent = `${Math.round(owZoom * 100)}%`;
    }
}

function setOverworldZoom(newZoom, centerX = null, centerY = null) {
    const minZoom = 0.5;
    const maxZoom = 4.0;
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom));
    if (Math.abs(clampedZoom - owZoom) < 0.001) return;

    const vp = document.getElementById('overworld-map-viewport');
    if (vp) {
        const vpRect = vp.getBoundingClientRect();
        const mx = (centerX !== null) ? (centerX - vpRect.left) : (vpRect.width / 2);
        const my = (centerY !== null) ? (centerY - vpRect.top) : (vpRect.height / 2);
        const cx = (mx - owPanX) / owZoom;
        const cy = (my - owPanY) / owZoom;
        owPanX = mx - cx * clampedZoom;
        owPanY = my - cy * clampedZoom;
    }

    owZoom = clampedZoom;
    updateOverworldTransform();
}

function overworldZoomIn() {
    setOverworldZoom(owZoom * 1.25);
}

function overworldZoomOut() {
    setOverworldZoom(owZoom / 1.25);
}

function overworldResetZoom() {
    owZoom = 1.0;
    owPanX = 0;
    owPanY = 0;
    updateOverworldTransform();
}

function initOverworldPanZoom() {
    if (owPanZoomInitialized) return;
    const vp = document.getElementById('overworld-map-viewport');
    if (!vp) return;
    owPanZoomInitialized = true;

    // Wheel zoom
    vp.addEventListener('wheel', (e) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.15 : 0.87;
        setOverworldZoom(owZoom * factor, e.clientX, e.clientY);
    }, { passive: false });

    // Drag to pan
    vp.addEventListener('mousedown', (e) => {
        if (e.target.closest('button') || e.target.closest('#ow-ruler-banner') || e.target.closest('#ow-fog-banner') || e.target.closest('.ow-pin-marker') || e.target.closest('#ow-party-marker')) {
            return;
        }
        const isPanAction = (e.button === 1 || e.button === 2 || e.spaceKey || appState.overworldMode === 'pan' || appState.overworldMode === 'inspect');
        if (isPanAction) {
            owIsDragging = true;
            window._owHasDragged = false;
            owDragStartX = e.clientX;
            owDragStartY = e.clientY;
            owDragStartPanX = owPanX;
            owDragStartPanY = owPanY;
            vp.style.cursor = 'grabbing';
            if (e.button === 2) e.preventDefault();
        }
    });

    window.addEventListener('mousemove', (e) => {
        if (!owIsDragging) return;
        const dx = e.clientX - owDragStartX;
        const dy = e.clientY - owDragStartY;
        if (Math.hypot(dx, dy) > 4) {
            window._owHasDragged = true;
        }
        owPanX = owDragStartPanX + dx;
        owPanY = owDragStartPanY + dy;
        updateOverworldTransform();
    });

    window.addEventListener('mouseup', (e) => {
        if (owIsDragging) {
            owIsDragging = false;
            const curMode = appState.overworldMode || 'inspect';
            if (curMode === 'pan') vp.style.cursor = 'grab';
            else if (curMode === 'add_pin') vp.style.cursor = 'cell';
            else if (curMode === 'move_party') vp.style.cursor = 'crosshair';
            else if (curMode === 'measure') vp.style.cursor = 'pointer';
            else vp.style.cursor = 'default';
        }
    });

    vp.addEventListener('contextmenu', (e) => {
        if (window._owHasDragged) {
            e.preventDefault();
        }
    });

    // Touch events for tablets / mobile
    let touchStartDist = 0;
    let touchStartZoom = 1.0;
    vp.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            owIsDragging = true;
            window._owHasDragged = false;
            owDragStartX = e.touches[0].clientX;
            owDragStartY = e.touches[0].clientY;
            owDragStartPanX = owPanX;
            owDragStartPanY = owPanY;
        } else if (e.touches.length === 2) {
            owIsDragging = false;
            touchStartDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            touchStartZoom = owZoom;
        }
    }, { passive: true });

    vp.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && owIsDragging) {
            const dx = e.touches[0].clientX - owDragStartX;
            const dy = e.touches[0].clientY - owDragStartY;
            if (Math.hypot(dx, dy) > 4) window._owHasDragged = true;
            owPanX = owDragStartPanX + dx;
            owPanY = owDragStartPanY + dy;
            updateOverworldTransform();
        } else if (e.touches.length === 2 && touchStartDist > 0) {
            const currentDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
            const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
            const scaleFactor = currentDist / touchStartDist;
            setOverworldZoom(touchStartZoom * scaleFactor, midX, midY);
        }
    }, { passive: true });

    vp.addEventListener('touchend', () => {
        owIsDragging = false;
        touchStartDist = 0;
    }, { passive: true });
}

function setOverworldMode(mode) {
    appState.overworldMode = mode;
    ['inspect', 'pan', 'add_pin', 'move_party', 'measure', 'fog'].forEach(m => {
        const btn = document.getElementById(`ow-mode-${m.replace('_', '-')}`);
        if (btn) {
            if (m === mode) {
                btn.className = "px-2.5 py-1 rounded font-bold bg-amber-500 text-ledger-950 transition";
            } else {
                btn.className = "px-2.5 py-1 rounded text-slate-400 hover:text-white transition";
            }
        }
    });

    const rulerBanner = document.getElementById('ow-ruler-banner');
    if (rulerBanner) {
        if (mode === 'measure') {
            rulerBanner.classList.remove('hidden');
        } else if (!appState.measurePoints || appState.measurePoints.length === 0) {
            rulerBanner.classList.add('hidden');
        }
    }

    const fogBanner = document.getElementById('ow-fog-banner');
    if (fogBanner) {
        if (mode === 'fog') {
            fogBanner.classList.remove('hidden');
        } else {
            fogBanner.classList.add('hidden');
        }
    }

    const vp = document.getElementById('overworld-map-viewport');
    if (vp) {
        if (mode === 'pan') vp.style.cursor = 'grab';
        else if (mode === 'add_pin') vp.style.cursor = 'cell';
        else if (mode === 'move_party') vp.style.cursor = 'crosshair';
        else if (mode === 'measure') vp.style.cursor = 'pointer';
        else if (mode === 'fog') vp.style.cursor = 'radial-gradient';
        else vp.style.cursor = 'default';
    }
}

function handleOverworldCanvasClick(e) {
    if (window._owHasDragged) {
        window._owHasDragged = false;
        return;
    }
    if (appState.overworldMode === 'pan') return;
    if (e.target.closest('.ow-pin-marker') || e.target.closest('#ow-party-marker') || e.target.closest('#ow-ruler-banner') || e.target.closest('#ow-fog-banner') || e.target.closest('button')) return;
    
    const canvas = document.getElementById('overworld-map-canvas');
    const vp = document.getElementById('overworld-map-viewport');
    const targetEl = canvas || vp;
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const pctX = Math.max(1, Math.min(99, (clickX / rect.width) * 100));
    const pctY = Math.max(1, Math.min(99, (clickY / rect.height) * 100));

    if (appState.overworldMode === 'add_pin') {
        openAddOverworldPinModal(null, pctX, pctY);
    } else if (appState.overworldMode === 'move_party') {
        movePartyMarker(pctX, pctY);
    } else if (appState.overworldMode === 'measure') {
        if (!appState.measurePoints) appState.measurePoints = [];
        appState.measurePoints.push({ x: pctX, y: pctY });
        renderOverworldMeasurement();
    } else if (appState.overworldMode === 'fog') {
        handleFogCanvasClick(pctX, pctY);
    }
}

// -------------------------------------------------------------
// MULTI-TIER MAP HIERARCHY MANAGEMENT
// -------------------------------------------------------------
async function switchOverworldMapTier(mapId) {
    if (!mapId) return;
    try {
        const res = await fetch('/api/overworld/maps/switch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mapId })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.overworld) appState.overworld = data.overworld;
            appState.selectedOverworldPinId = null;
            clearOverworldMeasurement();
            overworldResetZoom();
            renderOverworld();
            const activeM = appState.overworld.maps?.find(m => m.id === mapId);
            showToast(`Switched map tier to ${activeM?.title || 'Map'}`, "info");
        }
    } catch (e) {
        showToast("Error switching map tier.", "error");
    }
}

function populateMapTierDropdownOptions(selectedTier = 'Province') {
    const selectEl = document.getElementById('ow-submap-type');
    if (!selectEl) return;
    const tiers = (appState.overworld && appState.overworld.tiers && appState.overworld.tiers.length > 0)
        ? appState.overworld.tiers
        : ["Kingdom", "Province", "Settlement", "Dungeon"];
    
    const all = Array.from(new Set([...tiers, selectedTier].filter(Boolean)));
    selectEl.innerHTML = all.map(t => `<option value="${escapeHTML(t)}" ${t.toLowerCase() === String(selectedTier).toLowerCase() ? 'selected' : ''}>${escapeHTML(t)}</option>`).join('');
}

function openAddOverworldMapModal() {
    const modal = document.getElementById('overworld-map-modal');
    if (!modal) return;
    const titleHeader = document.getElementById('ow-map-modal-title');
    if (titleHeader) titleHeader.innerText = "🗺️ Add Regional Map Tier";
    
    const editIdInput = document.getElementById('ow-submap-edit-id');
    if (editIdInput) editIdInput.value = '';

    document.getElementById('ow-submap-title').value = '';
    populateMapTierDropdownOptions('Province');
    document.getElementById('ow-submap-scale-miles').value = '6';
    document.getElementById('ow-submap-scale-desc').value = '1 Hex = 6 Miles';
    document.getElementById('ow-submap-url').value = '/static/images/overworld_default.svg';
    const previewWrap = document.getElementById('ow-submap-preview-wrap');
    if (previewWrap) previewWrap.classList.add('hidden');
    
    const delBtn = document.getElementById('ow-submap-delete-btn');
    if (delBtn) delBtn.classList.add('hidden');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function openEditOverworldMapModal(mapId = null) {
    const modal = document.getElementById('overworld-map-modal');
    if (!modal) return;
    
    const targetId = mapId || appState.overworld?.activeMapId || 'map-main';
    const targetMap = (appState.overworld?.maps || []).find(m => m.id === targetId) || (appState.overworld?.maps && appState.overworld.maps[0]) || appState.overworld;
    if (!targetMap) {
        showToast("No active map to edit.", "warning");
        return;
    }

    const titleHeader = document.getElementById('ow-map-modal-title');
    if (titleHeader) titleHeader.innerText = `✏️ Edit Map: ${targetMap.title || 'Regional Map'}`;

    const editIdInput = document.getElementById('ow-submap-edit-id');
    if (editIdInput) editIdInput.value = targetMap.id || targetId;

    document.getElementById('ow-submap-title').value = targetMap.title || '';
    populateMapTierDropdownOptions(targetMap.type || 'Kingdom');
    document.getElementById('ow-submap-scale-miles').value = targetMap.scaleMilesPerHex || 6;
    document.getElementById('ow-submap-scale-desc').value = targetMap.scale || `1 Hex = ${targetMap.scaleMilesPerHex || 6} Miles`;
    document.getElementById('ow-submap-url').value = targetMap.mapUrl || '/static/images/overworld_default.svg';

    const previewWrap = document.getElementById('ow-submap-preview-wrap');
    const previewImg = document.getElementById('ow-submap-preview-img');
    const previewName = document.getElementById('ow-submap-preview-name');
    if (previewWrap && previewImg && targetMap.mapUrl) {
        previewImg.src = targetMap.mapUrl;
        if (previewName) previewName.textContent = targetMap.title || 'Current Map';
        previewWrap.classList.remove('hidden');
    } else if (previewWrap) {
        previewWrap.classList.add('hidden');
    }

    const delBtn = document.getElementById('ow-submap-delete-btn');
    if (delBtn) {
        if (targetMap.id === 'map-main') {
            delBtn.classList.add('hidden');
        } else {
            delBtn.classList.remove('hidden');
        }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

async function submitOverworldMapModal() {
    const title = document.getElementById('ow-submap-title').value.trim();
    if (!title) {
        showToast("Please enter a map title.", "warning");
        return;
    }
    const editId = document.getElementById('ow-submap-edit-id')?.value;
    const type = document.getElementById('ow-submap-type').value;
    const scaleMilesPerHex = parseInt(document.getElementById('ow-submap-scale-miles').value) || 6;
    const scale = document.getElementById('ow-submap-scale-desc').value.trim() || `1 Hex = ${scaleMilesPerHex} Miles`;
    const mapUrl = document.getElementById('ow-submap-url').value.trim() || '/static/images/overworld_default.svg';

    const payload = {
        title,
        type,
        scale,
        scaleMilesPerHex,
        mapUrl
    };
    if (editId) {
        payload.id = editId;
    }

    try {
        const res = await fetch('/api/overworld/maps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.overworld) appState.overworld = data.overworld;
            closeModal('overworld-map-modal');
            renderOverworld();
            showToast(editId ? `Updated map: ${title}` : `Created new map tier: ${title}`, "success");
        }
    } catch (e) {
        showToast("Error saving map tier.", "error");
    }
}

async function deleteCurrentSubmap() {
    const editId = document.getElementById('ow-submap-edit-id')?.value;
    const targetId = editId || appState.overworld?.activeMapId;
    if (!targetId || targetId === 'map-main') {
        showToast("Cannot delete primary kingdom map.", "warning");
        return;
    }
    if (!confirm("Are you sure you want to delete this map tier?")) return;
    try {
        const res = await fetch(`/api/overworld/maps/${targetId}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.overworld) appState.overworld = data.overworld;
            closeModal('overworld-map-modal');
            renderOverworld();
            showToast("Map tier removed.", "info");
        }
    } catch (e) {
        showToast("Error deleting map tier.", "error");
    }
}

function openManageMapTiersModal() {
    const modal = document.getElementById('overworld-tiers-modal');
    if (!modal) return;
    renderOverworldTiersList();
    const input = document.getElementById('ow-new-tier-input');
    if (input) input.value = '';
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function renderOverworldTiersList() {
    const container = document.getElementById('ow-tiers-list');
    if (!container) return;
    const tiers = (appState.overworld && appState.overworld.tiers && appState.overworld.tiers.length > 0)
        ? appState.overworld.tiers
        : ["Kingdom", "Province", "Settlement", "Dungeon"];

    container.innerHTML = tiers.map(t => {
        const icon = t === 'Kingdom' ? '👑' : (t === 'Province' ? '🗺️' : (t === 'Settlement' ? '🏰' : (t === 'Dungeon' ? '⚔️' : '🏷️')));
        const count = (appState.overworld?.maps || []).filter(m => (m.type || '').toLowerCase() === t.toLowerCase()).length;
        const canDelete = tiers.length > 1;

        return `
            <div class="p-2 rounded-xl bg-ledger-950 border border-ledger-800 flex items-center justify-between gap-2 text-xs">
                <div class="flex items-center gap-2">
                    <span>${icon}</span>
                    <span class="font-bold text-slate-200">${escapeHTML(t)}</span>
                    <span class="text-[10px] text-slate-500 font-mono">(${count} ${count === 1 ? 'map' : 'maps'})</span>
                </div>
                ${canDelete ? `
                    <button onclick="deleteOverworldTier('${escapeHTML(t)}')" title="Delete tier" class="text-slate-500 hover:text-rose-400 p-1 text-xs transition">✕</button>
                ` : `<span class="text-[10px] text-slate-600 italic">Locked</span>`}
            </div>
        `;
    }).join('');
}

async function addOverworldTierFromModal() {
    const input = document.getElementById('ow-new-tier-input');
    const tierName = input?.value.trim();
    if (!tierName) {
        showToast("Please enter a tier name.", "warning");
        return;
    }
    try {
        const res = await fetch('/api/overworld/tiers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tier: tierName })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.tiers) {
                if (!appState.overworld) appState.overworld = {};
                appState.overworld.tiers = data.tiers;
            }
            if (data.overworld) appState.overworld = data.overworld;
            if (input) input.value = '';
            renderOverworldTiersList();
            renderOverworld();
            populateMapTierDropdownOptions(tierName);
            showToast(`Added map tier: ${tierName}`, "success");
        }
    } catch (e) {
        showToast("Error adding map tier.", "error");
    }
}

async function deleteOverworldTier(tierName) {
    if (!tierName) return;
    if (!confirm(`Are you sure you want to delete the "${tierName}" tier?`)) return;
    try {
        const res = await fetch(`/api/overworld/tiers/${encodeURIComponent(tierName)}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.tiers) {
                if (!appState.overworld) appState.overworld = {};
                appState.overworld.tiers = data.tiers;
            }
            if (data.overworld) appState.overworld = data.overworld;
            renderOverworldTiersList();
            renderOverworld();
            populateMapTierDropdownOptions();
            showToast(`Removed map tier: ${tierName}`, "info");
        } else {
            const err = await res.json();
            showToast(err.detail || "Cannot delete tier.", "warning");
        }
    } catch (e) {
        showToast("Error deleting tier.", "error");
    }
}

async function uploadOverworldSubmapFile(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
            const data = await res.json();
            if (data.url) {
                const urlInput = document.getElementById('ow-submap-url');
                if (urlInput) urlInput.value = data.url;
                const previewWrap = document.getElementById('ow-submap-preview-wrap');
                const previewImg = document.getElementById('ow-submap-preview-img');
                const previewName = document.getElementById('ow-submap-preview-name');
                if (previewWrap && previewImg) {
                    previewImg.src = data.url;
                    if (previewName) previewName.textContent = file.name;
                    previewWrap.classList.remove('hidden');
                }
                showToast("Uploaded map art.", "success");
            }
        } else {
            showToast("Failed to upload image file.", "error");
        }
    } catch (e) {
        showToast("Error uploading file.", "error");
    }
}

async function uploadActiveOverworldMapFile(input) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        if (res.ok) {
            const data = await res.json();
            if (data.url) {
                const finalUrl = data.url;
                const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
                activeMap.mapUrl = finalUrl;
                const mapImg = document.getElementById('overworld-map-img');
                if (mapImg) mapImg.src = finalUrl;
                await fetch('/api/overworld', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mapUrl: finalUrl })
                });
                showToast(`Updated regional map art with ${file.name}`, "success");
            }
        } else {
            showToast("Failed to upload image file.", "error");
        }
    } catch (e) {
        showToast("Error uploading file.", "error");
    } finally {
        input.value = '';
    }
}


// -------------------------------------------------------------
// SVG HEX GRID LAYER
// -------------------------------------------------------------
function renderOverworldHexGrid(svgEl, hexConfig, isPlayerView = false) {
    if (!svgEl) return;
    if (!hexConfig || hexConfig.enabled === false) {
        svgEl.innerHTML = '';
        return;
    }

    const size = hexConfig.size || 36;
    const opacity = hexConfig.opacity || (isPlayerView ? 0.20 : 0.25);
    const strokeColor = isPlayerView ? '#d97706' : '#f59e0b';
    const strokeWidth = 0.8;

    const W = Math.sqrt(3) * size;
    const H = 2 * size;
    const vertStep = 1.5 * size;
    const horizStep = W;

    let pathD = '';
    const cols = Math.ceil(1600 / horizStep) + 2;
    const rows = Math.ceil(1000 / vertStep) + 2;

    for (let r = 0; r < rows; r++) {
        const yCenter = r * vertStep;
        const xOffset = (r % 2 === 1) ? horizStep / 2 : 0;
        for (let c = 0; c < cols; c++) {
            const xCenter = c * horizStep + xOffset;
            const pts = [];
            for (let a = 0; a < 6; a++) {
                const angle = (Math.PI / 180) * (60 * a - 30);
                const px = xCenter + size * Math.cos(angle);
                const py = yCenter + size * Math.sin(angle);
                pts.push(`${px.toFixed(1)},${py.toFixed(1)}`);
            }
            pathD += `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} Z `;
        }
    }

    svgEl.innerHTML = `<path d="${pathD}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}" opacity="${opacity}" />`;
}

async function toggleOverworldHexGrid() {
    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
    const hexConfig = activeMap.hexGrid || { enabled: true, opacity: 0.25, size: 36 };
    hexConfig.enabled = !hexConfig.enabled;
    try {
        const res = await fetch('/api/overworld/hex-grid', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(hexConfig)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.overworld) appState.overworld = data.overworld;
            renderOverworld();
            showToast(hexConfig.enabled ? "Hex grid enabled." : "Hex grid hidden.", "info");
        }
    } catch (e) {
        showToast("Error updating hex grid.", "error");
    }
}

// -------------------------------------------------------------
// SVG FOG OF WAR MASK (DM MISTY SHROUD VS PLAYER TERRA INCOGNITA)
// -------------------------------------------------------------
function renderOverworldFog(svgEl, fogConfig, pins, partyMarker, isPlayerView = false) {
    if (!svgEl) return;
    if (!fogConfig || fogConfig.enabled === false) {
        svgEl.innerHTML = '';
        return;
    }

    const maskId = isPlayerView ? 'ow-player-fog-mask' : 'ow-dm-fog-mask';
    const revealedPoints = Array.isArray(fogConfig.revealedPoints) ? fogConfig.revealedPoints : [];

    let holesSvg = '';
    revealedPoints.forEach(pt => {
        const cx = (pt.x || 50) * 16;
        const cy = (pt.y || 50) * 10;
        const r = (pt.radius || 8) * 16;
        holesSvg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="black" />`;
    });

    // Discovered pins automatically cut fog holes
    pins.forEach(p => {
        if (p.discovered) {
            const cx = (p.x || 50) * 16;
            const cy = (p.y || 50) * 10;
            holesSvg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="110" fill="black" />`;
        }
    });

    // Party marker sight radius
    if (partyMarker) {
        const cx = (partyMarker.x || 50) * 16;
        const cy = (partyMarker.y || 50) * 10;
        holesSvg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="130" fill="black" />`;
    }

    const fillColor = isPlayerView ? '#1c1611' : '#080d16';
    const fillOpacity = isPlayerView ? 0.94 : 0.45;

    svgEl.innerHTML = `
        <defs>
            <mask id="${maskId}">
                <rect width="1600" height="1000" fill="white" />
                ${holesSvg}
            </mask>
        </defs>
        <rect width="1600" height="1000" fill="${fillColor}" mask="url(#${maskId})" opacity="${fillOpacity}" />
    `;
}

function setOverworldFogAction(action) {
    appState.fogBrushAction = action;
    const btnRev = document.getElementById('ow-fog-action-reveal');
    const btnShr = document.getElementById('ow-fog-action-shroud');
    if (btnRev && btnShr) {
        if (action === 'reveal') {
            btnRev.className = "px-2 py-0.5 rounded font-bold bg-sky-500 text-ledger-950";
            btnShr.className = "px-2 py-0.5 rounded text-slate-400 hover:text-white";
        } else {
            btnRev.className = "px-2 py-0.5 rounded text-slate-400 hover:text-white";
            btnShr.className = "px-2 py-0.5 rounded font-bold bg-rose-500 text-white";
        }
    }
}

async function handleFogCanvasClick(pctX, pctY) {
    const action = appState.fogBrushAction || 'reveal';
    const slider = document.getElementById('ow-fog-radius-slider');
    const radius = slider ? parseFloat(slider.value) : 8;

    try {
        const endpoint = action === 'reveal' ? '/api/overworld/fog/reveal' : '/api/overworld/fog/shroud';
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x: pctX, y: pctY, radius })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.overworld) appState.overworld = data.overworld;
            renderOverworld();
        }
    } catch (e) {
        console.error("Error updating fog:", e);
    }
}

async function resetOverworldFog() {
    if (!confirm("Reset fog of war exploration back to party location only?")) return;
    try {
        const res = await fetch('/api/overworld/fog/shroud', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resetAll: true })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.overworld) appState.overworld = data.overworld;
            renderOverworld();
            showToast("Reset fog of war.", "info");
        }
    } catch (e) {
        showToast("Error resetting fog.", "error");
    }
}

// -------------------------------------------------------------
// OVERLAND MEASUREMENT RULER & EXPEDITION WAYPOINTS
// -------------------------------------------------------------
function renderOverworldMeasurement() {
    const svgEl = document.getElementById('overworld-routes-svg');
    const banner = document.getElementById('ow-ruler-banner');
    if (!svgEl) return;

    const pts = appState.measurePoints || [];
    if (pts.length === 0) {
        renderOverworldRoutesAndTrail();
        if (banner) banner.classList.add('hidden');
        return;
    }

    if (banner) banner.classList.remove('hidden');

    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
    const scaleMiles = activeMap.scaleMilesPerHex || 24;

    let totalDistVirtual = 0;
    for (let i = 1; i < pts.length; i++) {
        const dx = (pts[i].x - pts[i - 1].x) * 16;
        const dy = (pts[i].y - pts[i - 1].y) * 10;
        totalDistVirtual += Math.sqrt(dx * dx + dy * dy);
    }

    // 1600 virtual width represents ~44.4 hexes across for size 36 hex (width ~62.35)
    const hexRadiusVirtual = 36 * Math.sqrt(3);
    const totalHexes = totalDistVirtual / hexRadiusVirtual;
    const totalMiles = totalHexes * scaleMiles;
    const normalDays = Math.max(0.1, totalMiles / 24);
    const fastDays = Math.max(0.1, totalMiles / 30);
    const slowDays = Math.max(0.1, totalMiles / 18);
    const partySize = (appState.party || []).length || 4;
    const rationsEst = Math.ceil(partySize * normalDays);

    document.getElementById('ow-ruler-miles').innerText = `${totalMiles.toFixed(1)} mi`;
    document.getElementById('ow-ruler-hexes').innerText = `(${totalHexes.toFixed(1)} hexes)`;
    document.getElementById('ow-ruler-days').innerText = `${normalDays.toFixed(1)} days`;
    document.getElementById('ow-ruler-fast').innerText = `${fastDays.toFixed(1)} d`;
    document.getElementById('ow-ruler-slow').innerText = `${slowDays.toFixed(1)} d`;
    document.getElementById('ow-ruler-rations').innerText = `${rationsEst} rations`;

    renderOverworldRoutesAndTrail();
}

function clearOverworldMeasurement() {
    appState.measurePoints = [];
    const banner = document.getElementById('ow-ruler-banner');
    if (banner) banner.classList.add('hidden');
    renderOverworldRoutesAndTrail();
}

async function movePartyToEndOfRoute() {
    const pts = appState.measurePoints || [];
    if (pts.length === 0) return;
    const dest = pts[pts.length - 1];
    await movePartyMarker(dest.x, dest.y);
    clearOverworldMeasurement();
    setOverworldMode('inspect');
    showToast("Party advanced to destination along route!", "success");
}

function renderOverworldRoutesAndTrail() {
    const svgEl = document.getElementById('overworld-routes-svg');
    if (!svgEl) return;

    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
    const trail = activeMap.trail || [];
    const measurePts = appState.measurePoints || [];

    let html = '';

    // Historical March Trail (Emerald Dotted Line)
    if (trail.length > 1) {
        const trailCoords = trail.map(t => `${((t.x || 50) * 16).toFixed(1)},${((t.y || 50) * 10).toFixed(1)}`).join(' ');
        html += `<polyline points="${trailCoords}" fill="none" stroke="#10b981" stroke-width="2.5" stroke-dasharray="6,5" opacity="0.75" />`;
    }

    // Active Measurement Route (Golden Pulsing Line)
    if (measurePts.length > 0) {
        const routeCoords = measurePts.map(p => `${((p.x || 50) * 16).toFixed(1)},${((p.y || 50) * 10).toFixed(1)}`).join(' ');
        html += `<polyline points="${routeCoords}" fill="none" stroke="#f59e0b" stroke-width="3.5" stroke-dasharray="9,6" />`;
        measurePts.forEach((p, idx) => {
            const cx = (p.x * 16).toFixed(1);
            const cy = (p.y * 10).toFixed(1);
            html += `<circle cx="${cx}" cy="${cy}" r="6" fill="#f59e0b" stroke="#000" stroke-width="2" />`;
            html += `<text x="${cx}" y="${cy - 12}" fill="#fde68a" font-size="16" font-family="monospace" font-weight="bold" text-anchor="middle">#${idx + 1}</text>`;
        });
    }

    svgEl.innerHTML = html;
}

function renderOverworldCamps() {
    const layer = document.getElementById('overworld-camps-layer');
    if (!layer) return;

    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
    const camps = (activeMap.trail || []).filter(t => t.type === 'camp');

    layer.innerHTML = camps.map(c => `
        <div style="left: ${c.x}%; top: ${c.y}%;" class="absolute -translate-x-1/2 -translate-y-1/2 group cursor-help pointer-events-auto" title="${escapeHTML(c.label || 'Camp')}">
            <div class="w-6 h-6 rounded-full bg-emerald-950/90 border border-emerald-400 shadow flex items-center justify-center text-xs group-hover:scale-125 transition">
                🏕️
            </div>
            <div class="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5 rounded bg-black/90 border border-emerald-500/50 text-[9px] font-mono font-bold text-emerald-300 whitespace-nowrap shadow opacity-0 group-hover:opacity-100 transition z-30">
                ${escapeHTML(c.label || 'Camp')} (Day ${c.day || 1})
            </div>
        </div>
    `).join('');
}

async function dropOverworldCampHere() {
    try {
        const res = await fetch('/api/overworld/trail/camp', { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            if (data.overworld) appState.overworld = data.overworld;
            if (data.travel) {
                appState.travel = data.travel;
                renderTravelMarchHistory();
            }
            renderOverworld();
            showToast("🏕️ Campsite pitched and logged to Expedition Chronicle!", "success");
        }
    } catch (e) {
        showToast("Error establishing campsite.", "error");
    }
}

// -------------------------------------------------------------
// BIOME & ATMOSPHERE INTEGRATION
// -------------------------------------------------------------
async function onOverworldTerrainChanged(newTerrain) {
    if (!newTerrain) return;
    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
    if (!activeMap.partyMarker) activeMap.partyMarker = { x: 50, y: 50, label: "Adventuring Party" };
    activeMap.partyMarker.terrain = newTerrain;

    const terrainSelect = document.getElementById('ow-current-terrain-select');
    if (terrainSelect) terrainSelect.value = newTerrain;
    const terrainBadge = document.getElementById('ow-current-terrain-badge');
    if (terrainBadge) terrainBadge.innerText = `🌲 Terrain: ${newTerrain}`;

    renderOverworldPinPopover();

    try {
        await fetch('/api/overworld/party-marker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ terrain: newTerrain, dropTrail: false })
        });
        await syncTerrainAtmosphere();
    } catch (e) {
        console.error("Error setting terrain:", e);
    }
}

async function syncTerrainAtmosphere() {
    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
    const terrain = activeMap.partyMarker?.terrain || 'Forest';

    const terrainThemes = {
        Forest: { color: "#10b981", name: "Emerald Deepwoods" },
        Mountain: { color: "#38bdf8", name: "Alpine Crag" },
        Swamp: { color: "#84cc16", name: "Murky Fen" },
        Plains: { color: "#eab308", name: "Golden Steppe" },
        Road: { color: "#f59e0b", name: "Kings Highway" },
        Desert: { color: "#f97316", name: "Scorching Dunes" },
        Coastal: { color: "#06b6d4", name: "Coastal Tides" },
        Underdark: { color: "#a855f7", name: "Bioluminescent Dark" }
    };

    const theme = terrainThemes[terrain] || terrainThemes.Forest;

    // Sync travel engine terrain
    try {
        await fetch('/api/travel/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ terrain })
        });
    } catch (e) {}

    showToast(`🎭 Synchronized atmosphere to ${theme.name} (${terrain})!`, "success");
}

// -------------------------------------------------------------
// SETTLEMENT & LANDMARK QUICK-DRAWER (POPULATES #overworld-pin-popover)
// -------------------------------------------------------------
function renderOverworldPinPopover() {
    const popover = document.getElementById('overworld-pin-popover');
    if (!popover) return;
    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
    const pins = activeMap.pins || [];
    const pin = pins.find(p => p.id === appState.selectedOverworldPinId);

    if (!pin) {
        const pm = activeMap.partyMarker || { x: 37.5, y: 50.0, terrain: 'Forest' };
        popover.innerHTML = `
            <div class="space-y-3">
                <div class="flex items-center justify-between border-b border-ledger-800 pb-2">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">🛡️</span>
                        <div>
                            <h4 class="font-display font-bold text-sm text-amber-300">${escapeHTML(pm.label || 'Party Encampment')}</h4>
                            <span class="text-[10px] font-mono text-slate-400">Position: (${pm.x}%, ${pm.y}%)</span>
                        </div>
                    </div>
                    <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300">Active Party</span>
                </div>
                <div class="p-3 rounded-xl bg-ledger-950 border border-ledger-800 text-xs space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400">Current Biome:</span>
                        <span class="font-bold text-emerald-300">${pm.terrain || 'Forest'}</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400">In-Game Date:</span>
                        <span class="font-mono text-sky-300">Day ${appState.timeWeather?.day || 1}, ${String(appState.timeWeather?.hour || 9).padStart(2,'0')}:00</span>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-slate-400">Party Strength:</span>
                        <span class="text-slate-200 font-semibold">${(appState.party || []).length} Adventurers</span>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <button onclick="setOverworldMode('move_party')" class="py-1.5 rounded-lg bg-ledger-800 hover:bg-ledger-700 text-amber-300 font-bold border border-ledger-700 transition">
                        🛡️ Move Party
                    </button>
                    <button onclick="dropOverworldCampHere()" class="py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 font-bold border border-emerald-700 transition">
                        🏕️ Pitch Camp
                    </button>
                </div>
                <p class="text-[11px] text-slate-500 text-center pt-1 italic">Click any landmark icon or pin in the directory to inspect its full Settlement Dossier.</p>
            </div>
        `;
        return;
    }

    const pinLabel = pin.label || pin.title || 'Landmark';
    const linkedLoc = pin.locationId ? (appState.locations || []).find(l => l.id === pin.locationId) : null;
    const dangerBadge = pin.danger === 'Deadly' ? 'bg-rose-950 text-rose-300 border-rose-700' : (pin.danger === 'Moderate' ? 'bg-amber-950 text-amber-300 border-amber-700' : 'bg-emerald-950 text-emerald-300 border-emerald-700');

    // Factions associated with this settlement
    const linkedFactions = (appState.factions || []).filter(f => {
        const text = `${f.name || ''} ${f.headquarters || ''} ${f.presence || ''}`.toLowerCase();
        return text.includes(pinLabel.toLowerCase()) || (linkedLoc && text.includes(linkedLoc.name.toLowerCase()));
    });

    // NPCs in this settlement
    const linkedNpcs = (appState.roster || []).filter(n => {
        const loc = (n.location || '').toLowerCase();
        return loc.includes(pinLabel.toLowerCase()) || (linkedLoc && loc.includes(linkedLoc.name.toLowerCase()));
    });

    // Quests & Rumors in this settlement
    const linkedQuests = (appState.quests || []).filter(q => (q.location || '').toLowerCase().includes(pinLabel.toLowerCase()));
    const linkedRumors = (appState.rumors || []).filter(r => (r.location || '').toLowerCase().includes(pinLabel.toLowerCase()));

    // Active sub-map link
    const childMap = pin.subMapId ? (appState.overworld?.maps || []).find(m => m.id === pin.subMapId) : null;

    popover.innerHTML = `
        <div class="space-y-3">
            <!-- Header -->
            <div class="flex items-start justify-between gap-2 border-b border-ledger-800 pb-2.5">
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="text-2xl shrink-0">${pin.icon || '📍'}</span>
                    <div class="min-w-0">
                        <h4 class="font-display font-bold text-sm text-amber-300 leading-tight truncate">${escapeHTML(pinLabel)}</h4>
                        <div class="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span>${escapeHTML(pin.type || 'Landmark')}</span>
                            ${pin.population ? `<span>• Pop: ${escapeHTML(pin.population)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${dangerBadge}">${pin.danger || 'Moderate'}</span>
            </div>

            <!-- Sub-Map Zoom Banner if Linked -->
            ${childMap ? `
                <div class="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-purple-500/20 border border-amber-500/40 flex items-center justify-between">
                    <div>
                        <div class="text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider">Nested Child Map</div>
                        <div class="text-xs font-bold text-white">${escapeHTML(childMap.title)}</div>
                    </div>
                    <button onclick="switchOverworldMapTier('${childMap.id}')" class="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-ledger-950 font-bold text-xs shadow transition">
                        🗺️ Zoom In
                    </button>
                </div>
            ` : ''}

            <!-- Lore & Overview -->
            <div class="text-xs text-slate-300 leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">${escapeHTML(pin.notes || (linkedLoc ? linkedLoc.description : 'No additional lore recorded.'))}</div>

            ${linkedLoc && linkedLoc.secret ? `
                <div class="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 text-[11px] text-purple-200">
                    <span class="font-bold block text-purple-400 uppercase tracking-wider text-[9px] mb-0.5">🔒 DM Secret</span>
                    ${escapeHTML(linkedLoc.secret)}
                </div>
            ` : ''}

            <!-- Linked Factions & Tension Clocks -->
            ${linkedFactions.length > 0 ? `
                <div class="space-y-1.5">
                    <span class="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">Local Factions & Clocks</span>
                    <div class="space-y-1">
                        ${linkedFactions.map(f => `
                            <div onclick="navigateToFaction('${f.id}')" role="button" title="Open ${escapeHTML(f.name)} in Factions tab" class="p-1.5 rounded-lg bg-ledger-950 hover:bg-ledger-800 border border-ledger-800 hover:border-amber-500/50 flex items-center justify-between text-xs cursor-pointer transition group">
                                <span class="font-semibold text-slate-200 group-hover:text-amber-300 transition">${escapeHTML(f.name)} ↗</span>
                                <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-ledger-900 text-amber-300">Standing: ${f.reputation >= 0 ? '+' : ''}${f.reputation || 0}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Resident NPCs -->
            ${linkedNpcs.length > 0 ? `
                <div class="space-y-1.5">
                    <span class="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">Resident NPCs (${linkedNpcs.length})</span>
                    <div class="flex items-center gap-1.5 overflow-x-auto py-1 custom-scrollbar">
                        ${linkedNpcs.map(n => `
                            <div onclick="navigateToNpc('${n.id}')" role="button" title="Open ${escapeHTML(n.name)} in NPCs tab" class="px-2 py-1 rounded-lg bg-ledger-950 hover:bg-ledger-800 border border-ledger-800 hover:border-sky-400 text-[11px] whitespace-nowrap shrink-0 flex items-center gap-1.5 text-slate-200 hover:text-sky-300 cursor-pointer transition">
                                <span>👤</span> <span>${escapeHTML(n.name)} ↗</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Active Quests / Rumors -->
            ${(linkedQuests.length > 0 || linkedRumors.length > 0) ? `
                <div class="space-y-1 text-xs">
                    <span class="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">Local Quests & Rumors</span>
                    ${linkedQuests.map(q => `
                        <div onclick="navigateToQuest('${q.id}')" role="button" title="Open ${escapeHTML(q.title)} in Quests tab" class="p-1.5 rounded bg-ledger-950 hover:bg-ledger-800 border border-ledger-800 hover:border-amber-400 text-[11px] text-amber-200 hover:text-amber-300 flex items-center justify-between gap-1.5 cursor-pointer transition">
                            <div class="flex items-center gap-1.5 truncate">
                                <span>⚔️</span> <span class="truncate">${escapeHTML(q.title)}</span>
                            </div>
                            <span class="text-[10px] font-mono text-amber-400/80 shrink-0">↗</span>
                        </div>
                    `).join('')}
                    ${linkedRumors.map(r => `
                        <div class="p-1.5 rounded bg-ledger-950 border border-ledger-800 text-[10px] text-slate-300 italic">
                            "${escapeHTML(r.text)}"
                        </div>
                    `).join('')}
                </div>
            ` : ''}

            <!-- Quick Actions Toolbar -->
            <div class="pt-2 border-t border-ledger-800 space-y-2">
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <button onclick="movePartyMarker(${pin.x}, ${pin.y})" class="py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-ledger-950 font-bold shadow transition flex items-center justify-center gap-1">
                        <span>🛡️</span> <span>Move Party Here</span>
                    </button>
                    <button onclick="restPartyAtSettlementPrompt('${escapeHTML(pinLabel)}')" class="py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 border border-emerald-600 text-emerald-300 font-bold shadow transition flex items-center justify-center gap-1">
                        <span>🏕️</span> <span>Rest at Tavern</span>
                    </button>
                </div>
                <div class="flex items-center justify-between gap-1.5 flex-wrap pt-1">
                    <button onclick="toggleOverworldPinDiscovery('${pin.id}')" class="px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${pin.discovered ? 'bg-emerald-950/80 border-emerald-700 text-emerald-300' : 'bg-ledger-800 border-ledger-700 text-slate-400 hover:text-white'}">
                        ${pin.discovered ? '✓ Visible to Players' : '👁️ Reveal to Players'}
                    </button>
                    <div class="flex items-center gap-1.5">
                        <button onclick="openAddOverworldPinModal('${pin.id}')" class="px-2.5 py-1 rounded-lg bg-ledger-800 hover:bg-ledger-700 text-slate-300 hover:text-white text-xs transition">Edit</button>
                        <button onclick="deleteOverworldPin('${pin.id}')" class="px-2.5 py-1 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs transition">Delete</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function restPartyAtSettlementPrompt(locName) {
    const isLong = confirm(`Take an 8-Hour Long Rest at ${locName}?\n\n- Restores all PCs to Maximum HP\n- Resets death saves and refreshes abilities\n- Advances game clock by 8 hours\n- Consumes 1 ration per adventurer\n\n(Click Cancel for a 1-hour Short Rest)`);
    const restType = isLong ? 'long' : 'short';
    try {
        const res = await fetch('/api/overworld/settlement/rest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ restType, locationName: locName })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.party) appState.party = data.party;
            if (data.timeWeather) appState.timeWeather = data.timeWeather;
            renderPartyHUD();
            renderTimeWeatherHUD();
            showToast(data.summary || `Party completed ${restType} rest at ${locName}!`, "success");
        }
    } catch (e) {
        showToast("Error executing rest.", "error");
    }
}

// -------------------------------------------------------------
// OVERLAND HAZARD & 2024 ENCOUNTER ROLLER
// -------------------------------------------------------------
function openOverlandEncounterModal() {
    const modal = document.getElementById('overworld-encounter-modal');
    if (!modal) return;
    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
    const currentTerrain = activeMap.partyMarker?.terrain || 'Forest';
    const select = document.getElementById('ow-enc-terrain-select');
    if (select) select.value = currentTerrain;

    const hour = appState.timeWeather?.hour || 9;
    const timeSelect = document.getElementById('ow-enc-time-select');
    if (timeSelect) timeSelect.value = (hour >= 20 || hour < 6) ? 'Night' : 'Day';

    const resultBox = document.getElementById('ow-encounter-result');
    if (resultBox) resultBox.classList.add('hidden');

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

async function rollOverlandEncounterUI() {
    const terrain = document.getElementById('ow-enc-terrain-select')?.value || 'Forest';
    const danger = document.getElementById('ow-enc-danger-select')?.value || 'all';
    const timeOfDay = document.getElementById('ow-enc-time-select')?.value || 'Day';
    const resultBox = document.getElementById('ow-encounter-result');
    if (!resultBox) return;

    try {
        const res = await fetch('/api/overworld/encounter/roll', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ terrain, danger, timeOfDay })
        });
        if (res.ok) {
            const data = await res.json();
            const enc = data.encounter;
            if (!enc) return;

            const categoryIcon = enc.category === 'combat' ? '⚔️' : (enc.category === 'hazard' ? '⚠️' : (enc.category === 'discovery' ? '✨' : '👥'));
            const dangerColor = enc.danger === 'Deadly' ? 'bg-rose-950 text-rose-300 border-rose-700' : (enc.danger === 'Moderate' ? 'bg-amber-950 text-amber-300 border-amber-700' : 'bg-emerald-950 text-emerald-300 border-emerald-700');

            resultBox.innerHTML = `
                <div class="flex items-start justify-between gap-3 border-b border-ledger-800 pb-2.5">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-xl">${categoryIcon}</span>
                            <h4 class="font-display font-bold text-base text-amber-300">${escapeHTML(enc.title)}</h4>
                        </div>
                        <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                            <span>Terrain: <strong class="text-slate-200">${escapeHTML(enc.terrain)}</strong></span>
                            <span>•</span>
                            <span>Time: <strong class="text-sky-300">${escapeHTML(enc.timeOfDay)}</strong></span>
                        </div>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-xs font-bold border ${dangerColor}">${enc.danger} Threat</span>
                </div>

                <div class="p-3 rounded-xl bg-ledger-900/90 border border-ledger-800 text-xs text-slate-200 leading-relaxed font-serif italic">
                    "${escapeHTML(enc.narrative)}"
                </div>

                ${enc.dcCheck ? `
                    <div class="p-2.5 rounded-xl bg-blue-950/30 border border-blue-800/50 text-xs text-blue-200">
                        <strong class="text-blue-300 block mb-0.5">🎲 Exploration DC Check:</strong>
                        ${escapeHTML(enc.dcCheck)}
                    </div>
                ` : ''}

                ${enc.monsters && enc.monsters.length > 0 ? `
                    <div class="space-y-1.5">
                        <span class="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-bold">Creatures Involved:</span>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            ${enc.monsters.map(m => `
                                <div class="p-2 rounded-xl bg-ledger-900 border border-ledger-800 flex items-center justify-between text-xs">
                                    <span class="font-bold text-white">${m.count}x ${escapeHTML(m.name)}</span>
                                    <span class="text-[10px] font-mono text-slate-400">CR ${m.cr || 1} • HP ${m.hp} • AC ${m.ac}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                ${enc.tactics ? `
                    <div class="text-xs text-slate-300">
                        <strong class="text-amber-400">Tactics:</strong> ${escapeHTML(enc.tactics)}
                    </div>
                ` : ''}

                ${enc.complication ? `
                    <div class="text-xs text-slate-300">
                        <strong class="text-amber-400">Complication:</strong> ${escapeHTML(enc.complication)}
                    </div>
                ` : ''}

                ${enc.loot ? `
                    <div class="p-2 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-xs text-emerald-200">
                        <strong class="text-emerald-300">💰 Discovery Loot / Reward:</strong> ${escapeHTML(enc.loot)}
                    </div>
                ` : ''}

                <div class="pt-2 flex items-center justify-end gap-2">
                    ${enc.monsters && enc.monsters.length > 0 ? `
                        <button onclick="spawnOverlandEncounterToCombat(${JSON.stringify(enc.monsters).replace(/"/g, '&quot;')})" class="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 transition">
                            <span>⚔️</span> <span>Push Monsters to Combat Tracker</span>
                        </button>
                    ` : ''}
                </div>
            `;
            resultBox.classList.remove('hidden');
        }
    } catch (e) {
        showToast("Error rolling overland encounter.", "error");
    }
}

async function spawnOverlandEncounterToCombat(monsters) {
    if (!monsters || monsters.length === 0) return;
    try {
        const res = await fetch('/api/overworld/encounter/spawn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ monsters })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.combat) appState.combat = data.combat;
            if (data.tokens && window.BattlemapController) {
                if (!appState.battlemap) appState.battlemap = {};
                if (!appState.battlemap.tokens) appState.battlemap.tokens = [];
                appState.battlemap.tokens.push(...data.tokens);
                try {
                    const bmRes = await fetch('/api/battlemap');
                    if (bmRes.ok) {
                        const bmData = await bmRes.json();
                        appState.battlemap = bmData;
                    }
                    if (typeof window.BattlemapController.renderDMTokens === 'function') {
                        window.BattlemapController.renderDMTokens();
                    }
                } catch (bErr) {
                    console.warn("Could not sync battlemap tokens immediately:", bErr);
                }
            }
            closeModal('overworld-encounter-modal');
            renderCombatTracker();
            switchTab('combat');
            showToast(`Spawned ${data.addedCombatants?.length || 'monsters'} into live Combat Tracker & Battlemap!`, "success");
        }
    } catch (e) {
        showToast("Error spawning encounter to combat.", "error");
    }
}

// -------------------------------------------------------------
// PINS & PARTY MARKER
// -------------------------------------------------------------
async function movePartyMarker(x, y) {
    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
    const marker = {
        x: parseFloat(x.toFixed(1)),
        y: parseFloat(y.toFixed(1)),
        label: activeMap.partyMarker?.label || "Adventuring Party Camp",
        visibleToPlayers: true,
        terrain: activeMap.partyMarker?.terrain || "Forest",
        dropTrail: true
    };
    activeMap.partyMarker = marker;
    renderOverworldPins();
    try {
        const res = await fetch('/api/overworld/party-marker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(marker)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.overworld) appState.overworld = data.overworld;
            renderOverworld();
            showToast(`Party moved to (${x.toFixed(0)}%, ${y.toFixed(0)}%)`, "info");
        }
    } catch (e) {
        console.error("Error updating party marker:", e);
    }
}

function renderOverworldPins() {
    const layer = document.getElementById('overworld-pins-layer');
    if (!layer) return;
    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
    const pins = activeMap.pins || [];
    const party = activeMap.partyMarker || { x: 37.5, y: 50.0, label: "Adventuring Party" };

    let html = '';

    // Adventuring Party Marker
    html += `
        <div id="ow-party-marker" onclick="inspectPartyMarker(event)" style="left: ${party.x}%; top: ${party.y}%;" class="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer group select-none" title="${escapeHTML(party.label || 'Adventuring Party')}">
            <div class="relative flex items-center justify-center">
                <span class="absolute w-8 h-8 rounded-full bg-emerald-400/40 animate-ping"></span>
                <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 border-2 border-white shadow-[0_0_20px_rgba(16,185,129,0.9)] flex items-center justify-center text-xs text-white font-bold group-hover:scale-125 transition">
                    🛡️
                </div>
            </div>
            <div class="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5 rounded-full bg-emerald-950/95 border border-emerald-400 text-[10px] font-mono font-extrabold text-emerald-200 whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition z-30">
                ${escapeHTML(party.label || 'Adventuring Party')}
            </div>
        </div>
    `;

    // Landmark Pins
    pins.forEach(pin => {
        const pinLabel = pin.label || pin.title || 'Landmark';
        const isSelected = pin.id === appState.selectedOverworldPinId;
        const isDiscovered = !!pin.discovered;
        html += `
            <div id="ow-pin-${pin.id}" onclick="selectOverworldPin('${pin.id}', event)" style="left: ${pin.x}%; top: ${pin.y}%;" class="ow-pin-marker absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group select-none" title="${escapeHTML(pinLabel)}">
                <div class="relative flex items-center justify-center">
                    ${isSelected ? `<span class="absolute w-10 h-10 rounded-full bg-amber-400/50 animate-pulse"></span>` : ''}
                    <div class="w-7 h-7 rounded-full ${isDiscovered ? 'bg-ledger-950/90 border-2 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.5)] text-amber-200' : 'bg-ledger-950/90 border-2 border-slate-600 border-dashed text-slate-500'} flex items-center justify-center text-xs group-hover:scale-125 transition">
                        ${pin.icon || '📍'}
                    </div>
                </div>
                <div class="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-0.5 rounded bg-ledger-950/95 border ${isSelected ? 'border-amber-400 text-amber-200' : 'border-ledger-700 text-slate-300'} text-[10px] font-display font-bold whitespace-nowrap shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition z-30">
                    <span>${escapeHTML(pinLabel)}</span>
                    ${!isDiscovered ? '<span class="text-slate-500 text-[9px] ml-1">(DM Only)</span>' : ''}
                </div>
            </div>
        `;
    });

    layer.innerHTML = html;
}

function selectOverworldPin(pinId, e) {
    if (e) e.stopPropagation();
    appState.selectedOverworldPinId = pinId;
    renderOverworldPins();
    renderOverworldPinPopover();
}

function inspectPartyMarker(e) {
    if (e) e.stopPropagation();
    appState.selectedOverworldPinId = null;
    renderOverworldPins();
    renderOverworldPinPopover();
}

function renderOverworldPinList() {
    const list = document.getElementById('overworld-pin-list');
    const count = document.getElementById('overworld-pin-count');
    if (!list) return;

    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
    const pins = activeMap.pins || [];
    if (count) count.textContent = `${pins.length} pins`;

    const filterVal = (document.getElementById('ow-pin-filter')?.value || '').toLowerCase();
    const filtered = pins.filter(p => (p.label || p.title || '').toLowerCase().includes(filterVal) || (p.type || '').toLowerCase().includes(filterVal));

    if (filtered.length === 0) {
        list.innerHTML = `<div class="text-[11px] text-slate-500 italic p-2 text-center">No landmarks matching filter.</div>`;
        return;
    }

    list.innerHTML = filtered.map(p => {
        const isSelected = p.id === appState.selectedOverworldPinId;
        const pLabel = p.label || p.title || 'Landmark';
        return `
            <div onclick="selectOverworldPin('${p.id}', event)" class="flex items-center justify-between p-2 rounded-xl border cursor-pointer transition ${isSelected ? 'bg-amber-500/15 border-amber-500/50 text-white' : 'bg-ledger-950/80 border-ledger-800 hover:border-slate-600 text-slate-300'}">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="text-sm shrink-0">${p.icon || '📍'}</span>
                    <span class="text-xs font-semibold truncate">${escapeHTML(pLabel)}</span>
                </div>
                <div class="flex items-center gap-1 shrink-0 text-[10px]">
                    ${p.discovered ? '<span class="text-emerald-400" title="Visible on Player Screen">✓</span>' : '<span class="text-slate-500" title="DM Only">🔒</span>'}
                    <span class="font-mono text-slate-400">(${Math.round(p.x)}%, ${Math.round(p.y)}%)</span>
                </div>
            </div>
        `;
    }).join('');
}

function filterOverworldPinList() {
    renderOverworldPinList();
}

function openAddOverworldPinModal(pinId = null, defaultX = 50, defaultY = 50) {
    const modal = document.getElementById('overworld-pin-modal');
    if (!modal) return;
    const locSelect = document.getElementById('ow-pin-location-link');
    if (locSelect) {
        locSelect.innerHTML = `<option value="">-- Custom / Unlinked Pin --</option>` +
            (appState.locations || []).map(l => `<option value="${l.id}">${escapeHTML(l.name)} (${l.type})</option>`).join('');
    }

    // Populate sub-map selector
    const submapSelect = document.getElementById('ow-pin-submap-link');
    if (submapSelect) {
        const maps = (appState.overworld?.maps || []).filter(m => m.id !== appState.overworld?.activeMapId);
        submapSelect.innerHTML = `<option value="">-- No Child Map (Standard Pin) --</option>` +
            maps.map(m => `<option value="${m.id}">🗺️ [${m.type}] ${escapeHTML(m.title)}</option>`).join('');
    }

    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};

    if (pinId) {
        const pin = (activeMap.pins || []).find(p => p.id === pinId);
        if (pin) {
            document.getElementById('ow-pin-id').value = pin.id;
            if (locSelect) locSelect.value = pin.locationId || '';
            if (submapSelect) submapSelect.value = pin.subMapId || '';
            document.getElementById('ow-pin-label').value = pin.label || pin.title || '';
            document.getElementById('ow-pin-icon').value = pin.icon || '🏰';
            document.getElementById('ow-pin-x').value = pin.x;
            document.getElementById('ow-pin-y').value = pin.y;
            document.getElementById('ow-pin-population').value = pin.population || '';
            document.getElementById('ow-pin-danger').value = pin.danger || 'Moderate';
            document.getElementById('ow-pin-notes').value = pin.notes || '';
            document.getElementById('ow-pin-discovered').checked = !!pin.discovered;
        }
    } else {
        document.getElementById('ow-pin-id').value = '';
        if (locSelect) locSelect.value = '';
        if (submapSelect) submapSelect.value = '';
        document.getElementById('ow-pin-label').value = '';
        document.getElementById('ow-pin-icon').value = '🏰';
        document.getElementById('ow-pin-x').value = defaultX;
        document.getElementById('ow-pin-y').value = defaultY;
        document.getElementById('ow-pin-population').value = '';
        document.getElementById('ow-pin-danger').value = 'Moderate';
        document.getElementById('ow-pin-notes').value = '';
        document.getElementById('ow-pin-discovered').checked = true;
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function onOverworldPinLocationSelect() {
    const locId = document.getElementById('ow-pin-location-link')?.value;
    if (!locId) return;
    const loc = (appState.locations || []).find(l => l.id === locId);
    if (!loc) return;
    document.getElementById('ow-pin-label').value = loc.name;
    document.getElementById('ow-pin-danger').value = loc.dangerLevel || 'Moderate';
    document.getElementById('ow-pin-notes').value = loc.description || '';
    if (loc.population) document.getElementById('ow-pin-population').value = loc.population;
    if (loc.type === 'Settlement') document.getElementById('ow-pin-icon').value = '🏰';
    else if (loc.type === 'Tavern / Inn') document.getElementById('ow-pin-icon').value = '🍺';
    else if (loc.type === 'Dungeon / Ruins') document.getElementById('ow-pin-icon').value = '🏛️';
    else if (loc.type === 'Wilderness') document.getElementById('ow-pin-icon').value = '🌲';
}

async function submitOverworldPinModal() {
    const id = document.getElementById('ow-pin-id').value.trim();
    const locationId = document.getElementById('ow-pin-location-link').value.trim();
    const subMapId = document.getElementById('ow-pin-submap-link')?.value.trim() || '';
    const label = document.getElementById('ow-pin-label').value.trim() || 'Landmark';
    const icon = document.getElementById('ow-pin-icon').value;
    const x = parseFloat(document.getElementById('ow-pin-x').value) || 50;
    const y = parseFloat(document.getElementById('ow-pin-y').value) || 50;
    const population = document.getElementById('ow-pin-population').value.trim();
    const danger = document.getElementById('ow-pin-danger').value;
    const notes = document.getElementById('ow-pin-notes').value.trim();
    const discovered = document.getElementById('ow-pin-discovered').checked;

    const payload = {
        id: id || undefined,
        locationId: locationId || undefined,
        subMapId: subMapId || undefined,
        label,
        title: label,
        icon,
        x,
        y,
        population,
        danger,
        notes,
        discovered
    };

    try {
        const res = await fetch('/api/overworld/pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.overworld) appState.overworld = data.overworld;
            if (payload.id) appState.selectedOverworldPinId = payload.id;
            else if (data.pin?.id) appState.selectedOverworldPinId = data.pin.id;
            closeModal('overworld-pin-modal');
            renderOverworld();
            populateTopFilterDropdowns();
            showToast(`Saved lore pin: ${label}`, "success");
        }
    } catch (e) {
        showToast("Error saving pin.", "error");
    }
}

async function deleteOverworldPin(pinId) {
    if (!confirm("Are you sure you want to remove this landmark pin?")) return;
    try {
        const res = await fetch(`/api/overworld/pin/${pinId}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.overworld) appState.overworld = data.overworld;
            if (appState.selectedOverworldPinId === pinId) appState.selectedOverworldPinId = null;
            renderOverworld();
            populateTopFilterDropdowns();
            showToast("Pin removed.", "info");
        }
    } catch (e) {
        showToast("Error deleting pin.", "error");
    }
}

async function toggleOverworldPinDiscovery(pinId) {
    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
    const pin = (activeMap.pins || []).find(p => p.id === pinId);
    if (!pin) return;
    pin.discovered = !pin.discovered;
    try {
        const res = await fetch('/api/overworld/pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pin)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.overworld) appState.overworld = data.overworld;
            renderOverworld();
            showToast(pin.discovered ? `Pin '${pin.label || pin.title}' is now visible to players!` : `Pin '${pin.label || pin.title}' hidden from players.`, "info");
        }
    } catch (e) {
        showToast("Error toggling discovery.", "error");
    }
}

async function saveOverworldSettings() {
    const title = document.getElementById('overworld-title-input')?.value.trim() || 'Regional Map';
    const scale = document.getElementById('overworld-scale-input')?.value.trim() || '1 Hex = 24 Miles';
    try {
        const res = await fetch('/api/overworld', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mapTitle: title, scale })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.overworld) appState.overworld = data.overworld;
            renderOverworld();
            showToast("Regional map settings saved.", "success");
        }
    } catch (e) {
        console.error("Error saving overworld settings:", e);
    }
}

function promptOverworldMapUrl() {
    const activeMap = (appState.overworld?.maps && appState.overworld.maps.find(m => m.id === appState.overworld.activeMapId)) || appState.overworld || {};
    const currentUrl = activeMap.mapUrl || '/static/images/overworld_default.svg';
    const newUrl = prompt("Enter regional map image URL or SVG path (Leave blank or type 'default' to reset to built-in cartography):", currentUrl);
    if (newUrl === null) return;
    const finalUrl = (newUrl.trim() === '' || newUrl.trim() === 'default') ? '/static/images/overworld_default.svg' : newUrl.trim();
    activeMap.mapUrl = finalUrl;
    const mapImg = document.getElementById('overworld-map-img');
    if (mapImg) mapImg.src = finalUrl;
    fetch('/api/overworld', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapUrl: finalUrl })
    });
    showToast("Updated regional map image.", "info");
}

async function broadcastOverworldMapToPlayers() {
    try {
        const res = await fetch('/api/overworld/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ active: true })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.broadcast) {
                appState.broadcast = data.broadcast;
                renderBroadcastPill();
            }
            showToast("📡 Regional Overworld Map broadcast to Player Screen!", "success");
        }
    } catch (e) {
        showToast("Error broadcasting overworld map.", "error");
    }
}

// -----------------------------------------------------------------------------
// 2. FACTION RELATIONS MATRIX & "FACTION TURN" ENGINE
// -----------------------------------------------------------------------------
function renderFactionRelations() {
    const list = document.getElementById('faction-relations-list');
    const hist = document.getElementById('faction-turn-history-list');
    if (!list) return;

    const relState = appState.factionRelations || {};
    const relations = relState.relations || [];
    const history = relState.turnHistory || [];

    if (relations.length === 0) {
        list.innerHTML = `<div class="text-xs text-slate-500 italic p-3 text-center">No inter-faction relations recorded yet. Click "+ Link Factions" to track alliances and wars.</div>`;
    } else {
        const statusColors = {
            'War': 'bg-rose-950/80 text-rose-300 border-rose-700',
            'Rivalry': 'bg-orange-950/80 text-orange-300 border-orange-700',
            'Cautious Alliance': 'bg-amber-950/80 text-amber-300 border-amber-700',
            'Friendly': 'bg-sky-950/80 text-sky-300 border-sky-700',
            'Allied': 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
        };

        list.innerHTML = relations.map((r, idx) => {
            const badgeClass = statusColors[r.status] || 'bg-ledger-950 text-slate-300 border-ledger-700';
            return `
                <div class="p-2.5 rounded-xl bg-ledger-950 border border-ledger-800 flex items-center justify-between gap-2 transition hover:border-ledger-700">
                    <div class="space-y-0.5 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-xs text-slate-100">${escapeHTML(r.factionA)}</span>
                            <span class="text-slate-500 text-xs">↔</span>
                            <span class="font-bold text-xs text-slate-100">${escapeHTML(r.factionB)}</span>
                            <span class="px-2 py-0.2 rounded text-[10px] font-bold border ${badgeClass}">${escapeHTML(r.status)}</span>
                        </div>
                        ${r.note ? `<p class="text-[11px] text-slate-400 truncate">${escapeHTML(r.note)}</p>` : ''}
                    </div>
                    <button onclick="deleteFactionRelation(${idx})" class="text-slate-500 hover:text-rose-400 text-xs px-2 py-1 transition" title="Sever link">✕</button>
                </div>
            `;
        }).join('');
    }

    if (hist) {
        if (history.length === 0) {
            hist.innerHTML = `<div class="text-xs text-slate-500 italic p-3 text-center">No faction turns run yet. Click "Run Faction Turn" to simulate between-session maneuvers.</div>`;
        } else {
            hist.innerHTML = history.slice(0, 10).map(h => `
                <div class="p-2 rounded-xl bg-ledger-950 border border-ledger-800 text-xs space-y-1">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-1.5">
                            <span class="font-bold text-purple-300">${escapeHTML(h.faction)}</span>
                            <span class="font-mono text-[10px] text-slate-400">${escapeHTML(h.day || '')}</span>
                        </div>
                        <span class="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-ledger-900 border border-purple-500/30 text-amber-300">d20: ${h.roll} • ${escapeHTML(h.outcomeType)}</span>
                    </div>
                    <p class="text-[11px] text-slate-300 leading-tight">${escapeHTML(h.summary)}</p>
                </div>
            `).join('');
        }
    }
}

function openAddFactionRelationModal() {
    const modal = document.getElementById('faction-relation-modal');
    if (!modal) return;
    const facA = document.getElementById('frel-source');
    const facB = document.getElementById('frel-target');
    const factions = getActiveFactionsPool();

    if (facA && facB) {
        if (factions.length === 0) {
            facA.innerHTML = `<option value="">-- No Factions in Campaign Profile --</option>`;
            facB.innerHTML = `<option value="">-- No Factions in Campaign Profile --</option>`;
            showToast("No factions found in current campaign profile. Create factions in the Factions tab first.", "warning");
        } else {
            facA.innerHTML = factions.map(f => `<option value="${escapeHTML(f)}">${escapeHTML(f)}</option>`).join('');
            facB.innerHTML = factions.map(f => `<option value="${escapeHTML(f)}">${escapeHTML(f)}</option>`).join('');
            if (factions.length > 1) {
                facB.selectedIndex = 1;
            }
        }
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

async function submitFactionRelationModal() {
    const facA = document.getElementById('frel-source')?.value.trim();
    const facB = document.getElementById('frel-target')?.value.trim();
    const status = document.getElementById('frel-status')?.value;
    const note = document.getElementById('frel-note')?.value.trim();

    if (!facA || !facB || facA === facB) {
        showToast("Please choose two different valid factions.", "warning");
        return;
    }

    const payload = { factionA: facA, factionB: facB, status, note };
    try {
        const res = await fetch('/api/factions/relations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.factionRelations) appState.factionRelations = data.factionRelations;
            closeModal('faction-relation-modal');
            renderFactionRelations();
            showToast(`Relationship established: ${facA} ↔ ${facB}`, "success");
        }
    } catch (e) {
        showToast("Error saving relation.", "error");
    }
}

async function deleteFactionRelation(index) {
    const relState = appState.factionRelations || {};
    const relations = (relState.relations || []).slice();
    relations.splice(index, 1);
    try {
        const res = await fetch('/api/factions/relations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relations })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.factionRelations) appState.factionRelations = data.factionRelations;
            renderFactionRelations();
            showToast("Relationship severed.", "info");
        }
    } catch (e) {
        showToast("Error deleting relation.", "error");
    }
}

async function simulateFactionTurn() {
    playDiceSound();
    showToast("🎲 Rolling between-session Faction Turns...", "info");
    try {
        const res = await fetch('/api/factions/turn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ factionId: "all" })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.factions) appState.factions = data.factions;
            if (data.factionRelations) appState.factionRelations = data.factionRelations;
            if (data.rumors) appState.rumors = data.rumors;
            if (data.timeline) appState.timeline = data.timeline;

            renderFactions();
            renderFactionRelations();
            renderQuests();
            renderTimeline();

            const rumorCount = (data.generatedRumors || []).length;
            showToast(`Faction turn completed! ${rumorCount} new rumor${rumorCount !== 1 ? 's' : ''} added to tavern board.`, "success");
        }
    } catch (e) {
        showToast("Error running faction turn.", "error");
    }
}

// -----------------------------------------------------------------------------
// 3. PANTHEON, DEITIES & COSMIC CULTS + PIETY TRACKER
// -----------------------------------------------------------------------------
function renderPantheon() {
    renderPietyTrackerStrip();

    const grid = document.getElementById('pantheon-grid');
    if (!grid) return;
    const searchQ = (document.getElementById('pantheon-search')?.value || '').toLowerCase().trim();
    const domainFilter = document.getElementById('pantheon-domain-filter')?.value || 'all';

    let deities = appState.pantheon || [];
    if (searchQ) {
        deities = deities.filter(d =>
            (d.name && d.name.toLowerCase().includes(searchQ)) ||
            (d.title && d.title.toLowerCase().includes(searchQ)) ||
            (d.domains && d.domains.some(dom => dom.toLowerCase().includes(searchQ))) ||
            (d.tenets && d.tenets.some(t => t.toLowerCase().includes(searchQ)))
        );
    }
    if (domainFilter !== 'all') {
        deities = deities.filter(d => d.domains && d.domains.includes(domainFilter));
    }

    if (deities.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-8 text-slate-500 italic">No deities or patrons match the current filter. Click "+ Add Deity / Patron" to expand the pantheon.</div>`;
        return;
    }

    grid.innerHTML = deities.map(d => {
        const domainsHtml = (d.domains || []).map(dom => `<span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">${escapeHTML(dom)}</span>`).join('');
        const tenetsHtml = (d.tenets || []).map(t => `<li class="text-[11px] text-slate-300 leading-snug">✓ ${escapeHTML(t)}</li>`).join('');
        const rivalsHtml = (d.rivals || []).map(r => `<span class="px-1.5 py-0.2 rounded text-[10px] bg-rose-950/60 border border-rose-800 text-rose-300">${escapeHTML(r)}</span>`).join(' ');

        return `
            <div class="bg-ledger-900 border border-ledger-700/80 rounded-2xl p-4 shadow-xl space-y-3 flex flex-col justify-between hover:border-amber-500/50 transition">
                <div class="space-y-2.5">
                    <!-- Header -->
                    <div class="flex items-start justify-between gap-2">
                        <div class="flex items-center gap-2.5">
                            <span class="text-3xl p-1.5 rounded-xl bg-ledger-950 border border-ledger-800">${d.symbolIcon || '☀️'}</span>
                            <div>
                                <h4 class="font-display font-bold text-base text-amber-300 leading-tight">${escapeHTML(d.name)}</h4>
                                <p class="text-[11px] text-sky-400 font-semibold">${escapeHTML(d.title || '')}</p>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-ledger-950 border border-ledger-800">${escapeHTML(d.alignment || 'Neutral')}</span>
                    </div>

                    <!-- Domains -->
                    <div class="flex items-center gap-1.5 flex-wrap">
                        ${domainsHtml}
                    </div>

                    <!-- Holy Symbol & Overview -->
                    <div class="bg-ledger-950 border border-ledger-800 rounded-xl p-2.5 text-xs text-slate-300 space-y-1">
                        <div class="text-[10px] font-mono uppercase text-slate-400">Holy Symbol: <strong class="text-amber-300 font-normal">${escapeHTML(d.symbol || '')}</strong></div>
                        <p class="text-[11px] text-slate-300 leading-relaxed">${escapeHTML(d.description || '')}</p>
                    </div>

                    <!-- Tenets of Faith -->
                    ${d.tenets && d.tenets.length > 0 ? `
                        <div class="space-y-1">
                            <span class="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">Sacred Tenets</span>
                            <ul class="space-y-1 pl-1">
                                ${tenetsHtml}
                            </ul>
                        </div>
                    ` : ''}

                    <!-- Rivals & Boons -->
                    ${d.rivals && d.rivals.length > 0 ? `
                        <div class="text-[11px] text-slate-400 flex items-center gap-1 flex-wrap">
                            <span class="text-rose-400 font-semibold">Clashing Rivals:</span> ${rivalsHtml}
                        </div>
                    ` : ''}

                    ${d.pietyBoons && d.pietyBoons['10'] ? `
                        <div class="p-2 rounded-lg bg-sky-950/40 border border-sky-800/60 text-[10px] text-sky-200">
                            <strong class="text-sky-300 block font-mono">⚡ Votary Boon (Piety 10+):</strong>
                            ${escapeHTML(d.pietyBoons['10'])}
                        </div>
                    ` : ''}
                </div>

                <!-- Footer Actions -->
                <div class="pt-2 border-t border-ledger-800 flex items-center justify-between gap-2">
                    <button onclick="broadcastDeity('${d.id}')" class="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-ledger-950 font-bold text-xs flex items-center gap-1.5 shadow transition">
                        <span>📡</span> <span>Broadcast Symbol</span>
                    </button>
                    <div class="flex items-center gap-1">
                        <button onclick="openAddDeityModal('${d.id}')" class="px-2 py-1 rounded bg-ledger-800 hover:bg-ledger-700 text-slate-300 text-xs">Edit</button>
                        <button onclick="deleteDeity('${d.id}')" class="px-2 py-1 rounded bg-rose-950 hover:bg-rose-900 text-rose-300 text-xs">Delete</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderPietyTrackerStrip() {
    const grid = document.getElementById('pantheon-piety-tracker-grid');
    if (!grid) return;
    const party = appState.party || [];
    const deities = appState.pantheon || [];

    if (party.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-xs text-slate-500 italic p-2 text-center">No party members created yet. Add characters in Combat tab to track divine piety.</div>`;
        return;
    }

    grid.innerHTML = party.map(pc => {
        const score = pc.pietyScore || 1;
        let rank = "Initiate";
        let rankColor = "text-slate-400 bg-ledger-950 border-ledger-800";
        if (score >= 50) { rank = "Champion"; rankColor = "text-amber-300 bg-amber-500/20 border-amber-500/40"; }
        else if (score >= 25) { rank = "Disciple"; rankColor = "text-purple-300 bg-purple-500/20 border-purple-500/40"; }
        else if (score >= 10) { rank = "Votary"; rankColor = "text-sky-300 bg-sky-500/20 border-sky-500/40"; }
        else if (score >= 3) { rank = "Devotee"; rankColor = "text-emerald-300 bg-emerald-500/20 border-emerald-500/40"; }

        return `
            <div class="p-2.5 rounded-xl bg-ledger-950 border border-ledger-800 space-y-2">
                <div class="flex items-center justify-between">
                    <div>
                        <h5 class="font-bold text-xs text-slate-100">${escapeHTML(pc.name)}</h5>
                        <p class="text-[10px] text-slate-400">${escapeHTML(pc.classRole || 'Adventurer')}</p>
                    </div>
                    <span class="px-2 py-0.2 rounded text-[10px] font-bold border ${rankColor}">${rank}</span>
                </div>

                <!-- Deity Selector -->
                <div>
                    <select onchange="assignPCDeity('${pc.id}', this.value)" class="w-full bg-ledger-900 border border-ledger-700 rounded px-2 py-1 text-[11px] text-slate-200">
                        <option value="">-- No Chosen Deity / Patron --</option>
                        ${deities.map(d => `<option value="${d.id}" ${pc.deityId === d.id ? 'selected' : ''}>${escapeHTML(d.name)} (${d.title || ''})</option>`).join('')}
                    </select>
                </div>

                <!-- Piety Score Modifier -->
                <div class="flex items-center justify-between pt-1 border-t border-ledger-900 text-xs">
                    <span class="text-[10px] text-slate-400 font-mono">Piety Score:</span>
                    <div class="flex items-center gap-1.5">
                        <button onclick="modifyPCPiety('${pc.id}', -1)" class="w-5 h-5 rounded bg-ledger-900 hover:bg-rose-950 text-rose-300 border border-ledger-700 font-bold flex items-center justify-center">-</button>
                        <span class="font-mono font-bold text-amber-300 w-6 text-center">${score}</span>
                        <button onclick="modifyPCPiety('${pc.id}', 1)" class="w-5 h-5 rounded bg-ledger-900 hover:bg-emerald-950 text-emerald-300 border border-ledger-700 font-bold flex items-center justify-center">+</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

async function assignPCDeity(pcId, deityId) {
    const deity = (appState.pantheon || []).find(d => d.id === deityId);
    try {
        const res = await fetch(`/api/party/${pcId}/piety`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deityId: deityId || "", deityName: deity ? deity.name : "" })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.party) appState.party = data.party;
            renderPantheon();
            renderPartyHUD();
            showToast(`Deity updated for character.`, "info");
        }
    } catch (e) {
        showToast("Error updating deity.", "error");
    }
}

async function modifyPCPiety(pcId, delta) {
    try {
        const res = await fetch(`/api/party/${pcId}/piety`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ delta })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.party) appState.party = data.party;
            renderPantheon();
            renderPartyHUD();
            showToast("Piety score adjusted.", "info");
        }
    } catch (e) {
        showToast("Error updating piety score.", "error");
    }
}

function openAddDeityModal(deityId = null) {
    const modal = document.getElementById('deity-modal');
    if (!modal) return;
    if (deityId) {
        const d = (appState.pantheon || []).find(x => x.id === deityId);
        if (d) {
            document.getElementById('deity-input-id').value = d.id;
            document.getElementById('deity-input-name').value = d.name || '';
            document.getElementById('deity-input-icon').value = d.symbolIcon || '☀️';
            document.getElementById('deity-input-title').value = d.title || '';
            document.getElementById('deity-input-alignment').value = d.alignment || '';
            document.getElementById('deity-input-domains').value = (d.domains || []).join(', ');
            document.getElementById('deity-input-symbol').value = d.symbol || '';
            document.getElementById('deity-input-tenets').value = (d.tenets || []).join('\n');
            document.getElementById('deity-input-rivals').value = (d.rivals || []).join(', ');
            document.getElementById('deity-input-boon').value = d.pietyBoons?.['10'] || '';
            document.getElementById('deity-input-desc').value = d.description || '';
        }
    } else {
        document.getElementById('deity-input-id').value = '';
        document.getElementById('deity-input-name').value = '';
        document.getElementById('deity-input-icon').value = '☀️';
        document.getElementById('deity-input-title').value = '';
        document.getElementById('deity-input-alignment').value = 'Neutral Good';
        document.getElementById('deity-input-domains').value = 'Life, Light';
        document.getElementById('deity-input-symbol').value = '';
        document.getElementById('deity-input-tenets').value = '';
        document.getElementById('deity-input-rivals').value = '';
        document.getElementById('deity-input-boon').value = '';
        document.getElementById('deity-input-desc').value = '';
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

async function submitDeityModal() {
    const id = document.getElementById('deity-input-id').value.trim();
    const name = document.getElementById('deity-input-name').value.trim();
    if (!name) {
        showToast("Please enter a deity name.", "warning");
        return;
    }
    const symbolIcon = document.getElementById('deity-input-icon').value.trim() || '☀️';
    const title = document.getElementById('deity-input-title').value.trim();
    const alignment = document.getElementById('deity-input-alignment').value.trim();
    const domains = document.getElementById('deity-input-domains').value.split(',').map(s => s.trim()).filter(Boolean);
    const symbol = document.getElementById('deity-input-symbol').value.trim();
    const tenets = document.getElementById('deity-input-tenets').value.split('\n').map(s => s.trim()).filter(Boolean);
    const rivals = document.getElementById('deity-input-rivals').value.split(',').map(s => s.trim()).filter(Boolean);
    const boon10 = document.getElementById('deity-input-boon').value.trim();
    const description = document.getElementById('deity-input-desc').value.trim();

    const payload = {
        id: id || undefined,
        name,
        symbolIcon,
        title,
        alignment,
        domains,
        symbol,
        tenets,
        rivals,
        description,
        pietyBoons: {
            "3": "Devotee: Minor divine guidance (add +1d4 to religion/insight).",
            "10": boon10 || "Votary: Cast domain spell once per long rest.",
            "25": "Disciple: Resistance to primary divine damage type.",
            "50": "Champion: Supernatural aura of faith."
        }
    };

    try {
        const res = await fetch('/api/pantheon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.pantheon) appState.pantheon = data.pantheon;
            closeModal('deity-modal');
            renderPantheon();
            showToast(`Saved deity: ${name}`, "success");
        }
    } catch (e) {
        showToast("Error saving deity.", "error");
    }
}

async function deleteDeity(deityId) {
    if (!confirm("Are you sure you want to remove this deity?")) return;
    try {
        const res = await fetch(`/api/pantheon/${deityId}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.pantheon) appState.pantheon = data.pantheon;
            renderPantheon();
            showToast("Deity removed.", "info");
        }
    } catch (e) {
        showToast("Error deleting deity.", "error");
    }
}

async function broadcastDeity(deityId) {
    try {
        const res = await fetch(`/api/pantheon/${deityId}/broadcast`, { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            if (data.broadcast) {
                appState.broadcast = data.broadcast;
                renderBroadcastPill();
            }
            showToast("📡 Divine Icon & Holy Tenets broadcast to Player Screen!", "success");
        }
    } catch (e) {
        showToast("Error broadcasting deity.", "error");
    }
}

// -----------------------------------------------------------------------------
// 4. CAMPAIGN HISTORICAL TIMELINE & ERAS CHRONOLOGY
// -----------------------------------------------------------------------------
const DEFAULT_TIMELINE_ERAS_CLIENT = [
    { id: 'mythic', name: 'The Ancient Mythic Age', icon: '✨', badgeColor: 'purple' },
    { id: 'cataclysm', name: 'The Ruin & Cataclysm', icon: '🌋', badgeColor: 'rose' },
    { id: 'iron', name: 'The Century of Iron', icon: '⚔️', badgeColor: 'amber' },
    { id: 'current', name: 'Current Campaign Arc', icon: '🛡️', badgeColor: 'sky' }
];

function getTimelineEras() {
    if (appState.timeline && Array.isArray(appState.timeline.eras) && appState.timeline.eras.length > 0) {
        return appState.timeline.eras;
    }
    return DEFAULT_TIMELINE_ERAS_CLIENT;
}

function getTimelineEvents() {
    if (Array.isArray(appState.timeline)) return appState.timeline;
    if (appState.timeline && Array.isArray(appState.timeline.events)) return appState.timeline.events;
    return [];
}

async function fetchTimeline() {
    try {
        const res = await fetch('/api/timeline');
        if (res.ok) {
            const data = await res.json();
            appState.timeline = data;
            renderTimeline();
        }
    } catch (e) {
        console.error("Error fetching timeline:", e);
    }
}

function getEraBadgeClass(color) {
    switch (color) {
        case 'purple': return 'bg-purple-950/80 text-purple-300 border-purple-700';
        case 'rose': return 'bg-rose-950/80 text-rose-300 border-rose-700';
        case 'amber': return 'bg-amber-950/80 text-amber-300 border-amber-700';
        case 'emerald': return 'bg-emerald-950/80 text-emerald-300 border-emerald-700';
        case 'indigo': return 'bg-indigo-950/80 text-indigo-300 border-indigo-700';
        case 'sky':
        default: return 'bg-sky-950/80 text-sky-300 border-sky-700';
    }
}

function renderTimelineEraFilters() {
    const bar = document.getElementById('timeline-era-filters-bar');
    if (!bar) return;
    const eras = getTimelineEras();
    const activeEra = appState.timelineFilterEra || 'all';

    let html = `<span class="text-[10px] font-mono uppercase tracking-wider text-slate-500 mr-1">Filter by Era:</span>`;
    html += `
        <button onclick="setTimelineEraFilter('all')" class="timeline-era-btn px-3 py-1.5 rounded-lg text-xs font-bold transition ${activeEra === 'all' ? 'bg-amber-500 text-ledger-950 font-bold' : 'bg-ledger-950 border border-ledger-800 text-slate-300 hover:text-white'}">
            All Eras
        </button>
    `;
    eras.forEach(er => {
        const isSelected = activeEra === er.id;
        html += `
            <button onclick="setTimelineEraFilter('${er.id}')" class="timeline-era-btn px-3 py-1.5 rounded-lg text-xs font-semibold transition ${isSelected ? 'bg-amber-500 text-ledger-950 font-bold' : 'bg-ledger-950 border border-ledger-800 text-slate-300 hover:text-white'}">
                <span>${er.icon || '⏳'}</span> <span>${escapeHTML(er.name)}</span>
            </button>
        `;
    });
    bar.innerHTML = html;
}

function setTimelineEraFilter(era) {
    appState.timelineFilterEra = era;
    renderTimelineEraFilters();
    renderTimeline();
}

function renderTimeline() {
    renderTimelineEraFilters();
    const container = document.getElementById('timeline-feed-container');
    if (!container) return;
    const filterEra = appState.timelineFilterEra || 'all';
    const searchQ = (document.getElementById('timeline-search')?.value || '').toLowerCase().trim();

    const eras = getTimelineEras();
    const eraMap = {};
    eras.forEach(e => { eraMap[e.id] = e; });

    let events = getTimelineEvents();
    if (filterEra !== 'all') {
        events = events.filter(e => e.era === filterEra);
    }
    if (searchQ) {
        events = events.filter(e =>
            (e.title && e.title.toLowerCase().includes(searchQ)) ||
            (e.dateLabel && e.dateLabel.toLowerCase().includes(searchQ)) ||
            (e.category && e.category.toLowerCase().includes(searchQ)) ||
            (e.description && e.description.toLowerCase().includes(searchQ))
        );
    }

    if (events.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-500 italic p-6 text-center">No chronicle events found for this era. Click "+ Add Event" or "Sync Quests".</div>`;
        return;
    }

    container.innerHTML = `
        <div class="absolute left-2 sm:left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-amber-500/50 via-sky-500/50 to-purple-500/50"></div>
        <div class="space-y-4">
            ${events.map(ev => {
                const eraDef = eraMap[ev.era] || { name: ev.era, badgeColor: 'sky', icon: '⏳' };
                const badge = getEraBadgeClass(eraDef.badgeColor);
                return `
                    <div class="relative pl-6 sm:pl-8">
                        <div class="absolute left-0 sm:left-2 top-3 w-4 h-4 rounded-full bg-ledger-950 border-2 border-amber-400 shadow-md flex items-center justify-center">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        </div>

                        <div class="bg-ledger-900 border border-ledger-700 rounded-2xl p-4 shadow-lg space-y-2 hover:border-slate-500 transition">
                            <div class="flex items-start justify-between gap-2 flex-wrap">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span class="font-mono font-bold text-xs text-amber-300">${escapeHTML(ev.dateLabel)}</span>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold border ${badge}">${eraDef.icon || '⏳'} ${escapeHTML(ev.category || eraDef.name)}</span>
                                    ${ev.isSessionLog ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Session Sync</span>' : ''}
                                </div>
                                <div class="flex items-center gap-1">
                                    <button onclick="openAddTimelineEventModal('${ev.id}')" class="text-slate-400 hover:text-white text-xs px-2 py-0.5 rounded hover:bg-ledger-800 transition">Edit</button>
                                    <button onclick="deleteTimelineEvent('${ev.id}')" class="text-slate-500 hover:text-rose-400 text-xs px-2 py-0.5 rounded hover:bg-ledger-800 transition">Delete</button>
                                </div>
                            </div>

                            <h4 class="font-display font-bold text-sm text-slate-100 leading-snug">${escapeHTML(ev.title)}</h4>
                            <p class="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">${escapeHTML(ev.description)}</p>

                            ${(ev.location || (ev.factions && ev.factions.length > 0)) ? `
                                <div class="flex items-center gap-3 pt-1 text-[11px] text-slate-400">
                                    ${ev.location ? `<span>📍 ${escapeHTML(ev.location)}</span>` : ''}
                                    ${ev.factions && ev.factions.length > 0 ? `<span>⚖️ ${escapeHTML(ev.factions.join(', '))}</span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function openManageErasModal() {
    renderTimelineErasModal();
    openModal('timeline-eras-modal');
}

function renderTimelineErasModal() {
    const listEl = document.getElementById('timeline-eras-list');
    if (!listEl) return;
    const eras = getTimelineEras();

    listEl.innerHTML = eras.map(er => {
        const badge = getEraBadgeClass(er.badgeColor);
        return `
            <div class="p-3 rounded-xl bg-ledger-950 border border-ledger-800 flex items-center justify-between gap-3">
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="text-lg shrink-0">${er.icon || '⏳'}</span>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-slate-200 text-xs">${escapeHTML(er.name)}</span>
                            <span class="px-1.5 py-0.2 rounded text-[10px] font-bold border ${badge}">${er.badgeColor}</span>
                        </div>
                        ${er.description ? `<p class="text-[11px] text-slate-400 truncate mt-0.5">${escapeHTML(er.description)}</p>` : ''}
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0">
                    <button onclick="editTimelineEra('${er.id}')" class="px-2 py-1 rounded bg-ledger-900 border border-ledger-700 text-slate-300 hover:text-white text-[11px] transition">Edit</button>
                    ${eras.length > 1 ? `
                        <button onclick="deleteTimelineEra('${er.id}')" class="px-2 py-1 rounded bg-rose-950/60 border border-rose-800 text-rose-300 hover:text-white text-[11px] transition">Delete</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function editTimelineEra(eraId) {
    const eras = getTimelineEras();
    const er = eras.find(e => e.id === eraId);
    if (!er) return;
    document.getElementById('era-edit-id').value = er.id;
    document.getElementById('era-edit-name').value = er.name || '';
    document.getElementById('era-edit-icon').value = er.icon || '⏳';
    document.getElementById('era-edit-color').value = er.badgeColor || 'sky';
    document.getElementById('era-edit-desc').value = er.description || '';
    const heading = document.getElementById('era-form-heading');
    if (heading) heading.textContent = `Edit Historical Era: ${er.name}`;
}

function resetEraForm() {
    document.getElementById('era-edit-id').value = '';
    document.getElementById('era-edit-name').value = '';
    document.getElementById('era-edit-icon').value = '⏳';
    document.getElementById('era-edit-color').value = 'sky';
    document.getElementById('era-edit-desc').value = '';
    const heading = document.getElementById('era-form-heading');
    if (heading) heading.textContent = '+ Add New Historical Era';
}

async function submitEraForm() {
    const id = document.getElementById('era-edit-id').value.trim();
    const name = document.getElementById('era-edit-name').value.trim();
    const icon = document.getElementById('era-edit-icon').value.trim() || '⏳';
    const badgeColor = document.getElementById('era-edit-color').value;
    const description = document.getElementById('era-edit-desc').value.trim();

    if (!name) {
        showToast("Please enter an era name.", "warning");
        return;
    }

    const payload = {
        id: id || undefined,
        name,
        icon,
        badgeColor,
        description
    };

    try {
        const res = await fetch('/api/timeline/eras', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.timeline) appState.timeline = data.timeline;
            resetEraForm();
            renderTimelineErasModal();
            renderTimelineEraFilters();
            renderTimeline();
            showToast("Era saved successfully.", "success");
        }
    } catch (e) {
        showToast("Error saving era.", "error");
    }
}

async function deleteTimelineEra(eraId) {
    if (!confirm("Are you sure you want to delete this era? Any events assigned to this era will be moved to another era.")) return;
    try {
        const res = await fetch(`/api/timeline/eras/${eraId}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.timeline) appState.timeline = data.timeline;
            if (appState.timelineFilterEra === eraId) appState.timelineFilterEra = 'all';
            renderTimelineErasModal();
            renderTimelineEraFilters();
            renderTimeline();
            showToast("Era deleted.", "info");
        } else {
            const err = await res.json();
            showToast(err.detail || "Failed to delete era.", "error");
        }
    } catch (e) {
        showToast("Error deleting era.", "error");
    }
}

function openAddTimelineEventModal(eventId = null) {
    const modal = document.getElementById('timeline-event-modal');
    if (!modal) return;

    // Dynamically render era select options
    const eraSelect = document.getElementById('tl-event-era');
    if (eraSelect) {
        const eras = getTimelineEras();
        eraSelect.innerHTML = eras.map(er => `
            <option value="${er.id}">${er.icon || '⏳'} ${escapeHTML(er.name)}</option>
        `).join('');
    }

    if (eventId) {
        const events = getTimelineEvents();
        const ev = events.find(e => e.id === eventId);
        if (ev) {
            document.getElementById('tl-event-id').value = ev.id;
            if (eraSelect) eraSelect.value = ev.era || 'current';
            const catEl = document.getElementById('tl-event-category');
            if (catEl) catEl.value = ev.category || 'Campaign Milestone';
            document.getElementById('tl-event-date').value = ev.dateLabel || '';
            document.getElementById('tl-event-order').value = ev.sortOrder || 100;
            document.getElementById('tl-event-title').value = ev.title || '';
            document.getElementById('tl-event-desc').value = ev.description || '';
        }
    } else {
        const day = appState.timeWeather?.day || 1;
        document.getElementById('tl-event-id').value = '';
        if (eraSelect) eraSelect.value = appState.timelineFilterEra !== 'all' ? appState.timelineFilterEra : 'current';
        const catEl = document.getElementById('tl-event-category');
        if (catEl) catEl.value = 'Campaign Milestone';
        document.getElementById('tl-event-date').value = `Day ${day} (348 P.R.)`;
        document.getElementById('tl-event-order').value = 348000 + day;
        document.getElementById('tl-event-title').value = '';
        document.getElementById('tl-event-desc').value = '';
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

async function submitTimelineEventModal() {
    const id = document.getElementById('tl-event-id').value.trim();
    const era = document.getElementById('tl-event-era').value;
    const category = document.getElementById('tl-event-category')?.value.trim() || 'Campaign Milestone';
    const dateLabel = document.getElementById('tl-event-date').value.trim() || 'Day 1';
    const sortOrder = parseInt(document.getElementById('tl-event-order').value, 10) || 100;
    const title = document.getElementById('tl-event-title').value.trim();
    const description = document.getElementById('tl-event-desc').value.trim();

    if (!title) {
        showToast("Please enter an event title.", "warning");
        return;
    }

    const payload = {
        id: id || undefined,
        era,
        category,
        dateLabel,
        sortOrder,
        title,
        description
    };

    try {
        const res = await fetch('/api/timeline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.timeline) appState.timeline = data.timeline;
            closeModal('timeline-event-modal');
            renderTimeline();
            showToast("Chronicle entry recorded.", "success");
        }
    } catch (e) {
        showToast("Error saving timeline entry.", "error");
    }
}

async function deleteTimelineEvent(eventId) {
    if (!confirm("Are you sure you want to remove this chronicle entry?")) return;
    try {
        const res = await fetch(`/api/timeline/${eventId}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.timeline) appState.timeline = data.timeline;
            renderTimeline();
            showToast("Event removed.", "info");
        }
    } catch (e) {
        showToast("Error deleting timeline event.", "error");
    }
}

async function syncTimelineFromQuests() {
    try {
        const res = await fetch('/api/timeline/sync', { method: 'POST' });
        if (res.ok) {
            const data = await res.json();
            if (data.timeline) appState.timeline = data.timeline;
            renderTimeline();
            showToast(`Chronicle synced! ${data.added || 0} completed quest milestones imported.`, "success");
        }
    } catch (e) {
        showToast("Error syncing timeline.", "error");
    }
}

// -----------------------------------------------------------------------------
// CAMPAIGN CHRONICLE & AUTO-SESSION RECAP GENERATOR
// -----------------------------------------------------------------------------
let currentRecapData = null;

async function openSessionRecapModal() {
    openModal('session-recap-modal');
    await refreshSessionRecap();
}

async function refreshSessionRecap() {
    const textEl = document.getElementById('recap-markdown-text');
    const countEl = document.getElementById('recap-char-count');
    const titleEl = document.getElementById('recap-title-input');
    
    if (textEl) {
        textEl.value = "Generating campaign session recap from current party vitals, quest states, and faction clocks...";
    }
    
    try {
        const res = await fetch('/api/timeline/recap');
        if (res.ok) {
            const data = await res.json();
            currentRecapData = data;
            if (textEl) {
                textEl.value = data.recap_markdown || "";
                if (countEl) countEl.innerText = `${(data.recap_markdown || "").length} characters`;
            }
            if (titleEl && (!titleEl.value || titleEl.value === 'Session Recap')) {
                titleEl.value = data.title || 'Session Recap';
            }
        } else {
            if (textEl) textEl.value = "Failed to generate recap. Server returned error.";
            showToast("Failed to generate session recap", "error");
        }
    } catch (e) {
        if (textEl) textEl.value = `Error generating session recap: ${e.message}`;
        showToast("Error generating recap", "error");
    }
}

async function copySessionRecapMarkdown() {
    const textEl = document.getElementById('recap-markdown-text');
    const btnText = document.getElementById('btn-copy-recap-text');
    if (!textEl || !textEl.value) return;

    try {
        await navigator.clipboard.writeText(textEl.value);
        if (btnText) btnText.innerText = "✓ Copied!";
        showToast("Session recap Markdown copied to clipboard!", "success");
        setTimeout(() => {
            if (btnText) btnText.innerText = "Copy Markdown";
        }, 2000);
    } catch (e) {
        textEl.select();
        document.execCommand('copy');
        showToast("Copied to clipboard!", "success");
    }
}

async function saveSessionRecapToTimeline() {
    const textEl = document.getElementById('recap-markdown-text');
    const titleEl = document.getElementById('recap-title-input');
    const title = (titleEl?.value || 'Session Recap').trim();
    const markdown = (textEl?.value || '').trim();

    if (!markdown) {
        showToast("Recap is empty. Nothing to save.", "warning");
        return;
    }

    try {
        const res = await fetch('/api/timeline/recap/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                recap_markdown: markdown,
                era: 'current'
            })
        });

        if (res.ok) {
            const data = await res.json();
            if (data.timeline) appState.timeline = data.timeline;
            renderTimeline();
            showToast("Recap saved to Timeline Chronicle!", "success");
            closeModal('session-recap-modal');
        } else {
            showToast("Failed to save recap to timeline", "error");
        }
    } catch (e) {
        showToast(`Error saving recap: ${e.message}`, "error");
    }
}

async function exportTimelineMarkdown() {
    try {
        const res = await fetch('/api/timeline/export-markdown?format=json');
        if (res.ok) {
            const data = await res.json();
            const blob = new Blob([data.markdown], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.filename || 'campaign_chronicle.md';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast("Campaign Chronicle (.md) downloaded!", "success");
        } else {
            window.location.href = '/api/timeline/export-markdown';
        }
    } catch (e) {
        window.location.href = '/api/timeline/export-markdown';
    }
}

// -----------------------------------------------------------------------------
// ELGATO STREAM DECK & HARDWARE MACRO REST API CONTROLLER
// -----------------------------------------------------------------------------
let streamDeckStatusData = null;
let activeStreamDeckCategory = 'all';

const STREAM_DECK_PRESETS = [
    { category: 'combat', icon: '⚔️', title: 'Next Combat Turn', path: '/api/streamdeck/combat/next-turn', desc: 'Advance active turn; decrements conditions and increments rounds.' },
    { category: 'combat', icon: '⏮️', title: 'Previous Combat Turn', path: '/api/streamdeck/combat/prev-turn', desc: 'Step back to previous turn in initiative order.' },
    { category: 'combat', icon: '⏯️', title: 'Toggle Combat Encounter', path: '/api/streamdeck/combat/toggle', desc: 'Start or pause encounter tracker.' },
    { category: 'combat', icon: '🛑', title: 'End Combat Encounter', path: '/api/streamdeck/combat/stop', desc: 'Stop encounter and clear active combatant indicator.' },
    { category: 'combat', icon: '🔄', title: 'Reset Encounter', path: '/api/streamdeck/combat/reset', desc: 'Reset combat tracker to Round 1.' },
    
    { category: 'dice', icon: '🎲', title: 'Roll 1d20 (Nat 20/1 Smart FX)', path: '/api/streamdeck/roll/d20', desc: 'Rolls d20, logs to table, and triggers Amaran gold/red smart light flash.' },
    { category: 'dice', icon: '🔺', title: 'Roll 1d4', path: '/api/streamdeck/roll/d4', desc: 'Standard d4 roll broadcast to table.' },
    { category: 'dice', icon: '🎲', title: 'Roll 1d6', path: '/api/streamdeck/roll/d6', desc: 'Standard d6 roll broadcast to table.' },
    { category: 'dice', icon: '💎', title: 'Roll 1d8', path: '/api/streamdeck/roll/d8', desc: 'Standard d8 roll broadcast to table.' },
    { category: 'dice', icon: '🔟', title: 'Roll 1d10', path: '/api/streamdeck/roll/d10', desc: 'Standard d10 roll broadcast to table.' },
    { category: 'dice', icon: '🔷', title: 'Roll 1d12', path: '/api/streamdeck/roll/d12', desc: 'Standard d12 roll broadcast to table.' },
    { category: 'dice', icon: '💯', title: 'Roll 1d100 (Percentile)', path: '/api/streamdeck/roll/d100', desc: 'Percentile 1-100 table roll.' },

    { category: 'party', icon: '☕', title: 'Execute Short Rest', path: '/api/streamdeck/party/short-rest', desc: 'Restores warlock/short-rest spell slots and broadcasts rest chime.' },
    { category: 'party', icon: '🏕️', title: 'Execute Long Rest', path: '/api/streamdeck/party/long-rest', desc: 'Restores party to full HP, all spell slots, and clears temporary statuses.' },

    { category: 'lighting', icon: '🔥', title: 'Lighting: Fireplace', path: '/api/streamdeck/lighting/preset/fireplace', desc: 'Warm flickering amber campfire/hearth ambiance.' },
    { category: 'lighting', icon: '🍺', title: 'Lighting: Tavern', path: '/api/streamdeck/lighting/preset/tavern', desc: 'Cozy golden tavern lantern lighting.' },
    { category: 'lighting', icon: '🕯️', title: 'Lighting: Dungeon', path: '/api/streamdeck/lighting/preset/dungeon', desc: 'Dim, menacing dungeon torchlight.' },
    { category: 'lighting', icon: '💀', title: 'Lighting: Crypt', path: '/api/streamdeck/lighting/preset/crypt', desc: 'Pale eerie blue necropolis glow.' },
    { category: 'lighting', icon: '👹', title: 'Lighting: Boss Battle', path: '/api/streamdeck/lighting/preset/boss', desc: 'Intense crimson boss combat lighting.' },
    { category: 'lighting', icon: '⚡', title: 'Lighting: Thunderstorm', path: '/api/streamdeck/lighting/preset/thunderstorm', desc: 'Deep tempest blue with lightning flashes.' },
    { category: 'lighting', icon: '🌲', title: 'Lighting: Forest', path: '/api/streamdeck/lighting/preset/forest', desc: 'Lush emerald woodland canopy lighting.' },
    { category: 'lighting', icon: '💡', title: 'Lighting: Turn Off', path: '/api/streamdeck/lighting/preset/off', desc: 'Powers off Amaran studio fixtures.' },
    { category: 'lighting', icon: '✨', title: 'Lighting FX: Nat 20 Critical', path: '/api/streamdeck/lighting/event/nat20', desc: 'Instant golden flash fanfare.' },
    { category: 'lighting', icon: '💥', title: 'Lighting FX: Nat 1 Critical Fail', path: '/api/streamdeck/lighting/event/nat1', desc: 'Instant pulsing crimson hazard flash.' },

    { category: 'audio', icon: '🔥', title: 'SFX: Fireball Blast', path: '/api/streamdeck/audio/sfx/fireball', desc: 'Roaring explosive arcane blast.' },
    { category: 'audio', icon: '⚔️', title: 'SFX: Sword Clash', path: '/api/streamdeck/audio/sfx/sword_clash', desc: 'Steel-on-steel martial strike.' },
    { category: 'audio', icon: '🐉', title: 'SFX: Dragon Roar', path: '/api/streamdeck/audio/sfx/dragon_roar', desc: 'Terrifying apex predator apex bellow.' },
    { category: 'audio', icon: '🎺', title: 'SFX: Victory Fanfare', path: '/api/streamdeck/audio/sfx/victory', desc: 'Triumphant encounter resolution horn.' },
    { category: 'audio', icon: '🔔', title: 'SFX: Defeat Toll', path: '/api/streamdeck/audio/sfx/defeat', desc: 'Somber toll of mortality.' },
    { category: 'audio', icon: '⚙️', title: 'SFX: Dungeon Trap Trigger', path: '/api/streamdeck/audio/sfx/trap', desc: 'Clicking pressure plate and spring mechanism.' },

    { category: 'map', icon: '👁️', title: 'Battlemap: Reveal Entire Fog', path: '/api/streamdeck/map/reveal-all', desc: 'Instantly clears all fog of war for the tabletop screen.' },
    { category: 'map', icon: '🌫️', title: 'Battlemap: Reset / Cover Fog', path: '/api/streamdeck/map/reset-fog', desc: 'Covers entire active battlemap with dense fog of war.' },
    { category: 'map', icon: '📍', title: 'Battlemap: Party Ping', path: '/api/streamdeck/map/ping', desc: 'Pulses animated radar ring on tabletop battlemap.' }
];

async function initStreamDeckUI() {
    try {
        const res = await fetch('/api/streamdeck/status');
        if (res.ok) {
            streamDeckStatusData = await res.json();
            const baseUrl = streamDeckStatusData.lan_base_url || streamDeckStatusData.local_base_url || `${window.location.origin}/api/streamdeck`;
            const baseInput = document.getElementById('streamdeck-base-url-input');
            if (baseInput) baseInput.value = baseUrl;
            const sampleUrlEl = document.getElementById('sd-guide-sample-url');
            if (sampleUrlEl) sampleUrlEl.innerText = `${baseUrl}/combat/next-turn`;
        }
    } catch (e) {
        console.warn("Could not fetch Stream Deck status:", e);
    }
}

async function openStreamDeckModal() {
    await initStreamDeckUI();
    renderStreamDeckEndpoints();
    openModal('streamdeck-endpoints-modal');
}

function filterStreamDeckCategory(category) {
    activeStreamDeckCategory = category;
    
    // Update tab button styles
    const buttons = document.querySelectorAll('#sd-category-filters .sd-filter-btn');
    buttons.forEach(btn => {
        if (btn.dataset.category === category) {
            btn.className = "sd-filter-btn px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-semibold transition";
        } else {
            btn.className = "sd-filter-btn px-2.5 py-1 rounded-lg bg-ledger-800 text-slate-300 hover:text-white transition";
        }
    });

    renderStreamDeckEndpoints();
}

function filterStreamDeckList() {
    renderStreamDeckEndpoints();
}

function renderStreamDeckEndpoints() {
    const listEl = document.getElementById('sd-endpoints-list');
    if (!listEl) return;

    const query = (document.getElementById('sd-search-input')?.value || '').toLowerCase().trim();
    const origin = window.location.origin;

    const filtered = STREAM_DECK_PRESETS.filter(item => {
        const matchesCategory = activeStreamDeckCategory === 'all' || item.category === activeStreamDeckCategory;
        const matchesQuery = !query || item.title.toLowerCase().includes(query) || item.path.toLowerCase().includes(query) || item.desc.toLowerCase().includes(query);
        return matchesCategory && matchesQuery;
    });

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="p-6 text-center text-slate-500 font-mono text-xs">
                No Stream Deck macros match your search or filter.
            </div>
        `;
        return;
    }

    listEl.innerHTML = filtered.map(item => {
        const fullUrl = `${origin}${item.path}`;
        return `
            <div class="p-3 rounded-2xl bg-ledger-950/90 border border-ledger-800 hover:border-ledger-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-start gap-3 min-w-0">
                    <span class="w-8 h-8 rounded-xl bg-ledger-900 border border-ledger-750 flex items-center justify-center text-base shrink-0 mt-0.5">${item.icon}</span>
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-slate-200 text-xs">${item.title}</span>
                            <span class="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">GET | POST</span>
                        </div>
                        <p class="text-[11px] text-slate-400 mt-0.5">${item.desc}</p>
                        <div class="mt-1 font-mono text-[10px] text-amber-300/90 truncate max-w-md select-all">${fullUrl}</div>
                    </div>
                </div>
                <div class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button onclick="copyStreamDeckMacroUrl('${fullUrl}')" class="px-3 py-1.5 rounded-lg bg-ledger-800 hover:bg-ledger-700 text-slate-200 text-xs font-semibold border border-ledger-700 transition flex items-center gap-1">
                        <span>📋</span> <span>Copy URL</span>
                    </button>
                    <button onclick="testStreamDeckEndpoint('${item.path}')" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 shadow">
                        <span>🧪</span> <span>Test</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function copyStreamDeckMacroUrl(url) {
    navigator.clipboard.writeText(url);
    showToast("Macro URL copied to clipboard!", "success");
}

async function testStreamDeckEndpoint(path) {
    try {
        const fullUrl = path.startsWith('http') ? path : `${window.location.origin}${path}`;
        const res = await fetch(fullUrl, { method: 'POST' });
        if (res.ok) {
            const data = await res.json().catch(() => ({}));
            showToast(`Stream Deck OK: ${data.message || data.status || path}`, "success");
            if (path.includes('/combat/')) {
                await fetchFullState();
                renderCombatTracker();
            } else if (path.includes('/party/')) {
                await fetchFullState();
                renderPartyHUD();
            }
        } else {
            showToast(`Stream Deck Error: HTTP ${res.status}`, "error");
        }
    } catch (e) {
        showToast(`Stream Deck Request Failed: ${e.message}`, "error");
    }
}

// -----------------------------------------------------------------------------
// 5. WILDERNESS TRAVEL, HAZARDS & FORAGING CALCULATOR
// -----------------------------------------------------------------------------
const TERRAIN_HAZARDS = {
    'Grassland': { dc: 10, forage: 'Abundant game & herbs (DC 10).', nav: 'Clear horizon; lost only on Nat 1.', hazard: 'None. Open skies and steady footing.' },
    'Forest': { dc: 15, forage: 'Berries, mushrooms, fowl (DC 15).', nav: 'Dense canopy blocks landmarks (DC 15 Navigation).', hazard: 'Concealed roots & tangled brambles.' },
    'Coast': { dc: 12, forage: 'Shellfish, kelp, tidal pools (DC 12).', nav: 'Follow water line (DC 12 Navigation).', hazard: 'Sudden rising tides & salt spray mud.' },
    'Mountain': { dc: 16, forage: 'Mountain hare, hardy roots (DC 16).', nav: 'Misleading switchbacks (DC 16 Navigation).', hazard: 'Rockslides, scree slopes & freezing heights.' },
    'Swamp': { dc: 16, forage: 'Marsh fowl, clean water rare (DC 16).', nav: 'Stagnant waterways look identical (DC 16 Navigation).', hazard: 'Quicksand, venomous leeches & miasma.' },
    'Desert': { dc: 18, forage: 'Extreme scarcity; cactus pulp (DC 18).', nav: 'Shifting dunes & heat mirages (DC 18 Navigation).', hazard: 'Extreme Heat (DC 10+ Con saves), dehydration.' },
    'Arctic': { dc: 18, forage: 'Subnivean game, ice fishing (DC 18).', nav: 'Blinding whiteout glare (DC 18 Navigation).', hazard: 'Extreme Cold, hypothermia, hidden crevasses.' },
    'Underdark': { dc: 17, forage: 'Bioluminescent moss, cave worms (DC 17).', nav: 'No sun/stars; acoustic echoes (DC 17 Navigation).', hazard: 'Sinkholes, toxic spores, echoing footsteps.' }
};

const EXPLORATION_COMPLICATIONS = [
    { title: "Abandoned Caravan", desc: "A merchant cart sits half-submerged in ditch mud. The mules are gone, but a locked strongbox or cargo manifest remains." },
    { title: "Ancient Milestone", desc: "A moss-crusted granite obelisk from the Iron Empire marks distances in an extinct dialect. A secret cache is wedged beneath." },
    { title: "Sudden Weather Shift", desc: "Violent headwinds and squalls surge in, halving visibility and extinguishing open torches for the next 2 hours." },
    { title: "Rival Adventurers / Hunters", desc: "A trio of grizzled frontier rangers roast rabbit over a concealed campfire; willing to trade rumors for rations." },
    { title: "Corrupted Wildlife / Strange Tracks", desc: "Oversized claw marks tear into ancient bark 10 feet up; fresh blood drips onto dry pine needles." },
    { title: "Wayside Shrine to the Old Gods", desc: "A stone alcove consecrated with wildflowers and copper coins. Leaving an offering grants guidance on the next check." },
    { title: "Washed Out Bridge / Ravine", desc: "The wooden span collapsed into rushing floodwaters. Requires DC 13 Athletics or finding a detour (+2 hours)." },
    { title: "Fugitive in Hiding", desc: "A wounded mercenary bearing a faction insignia hides in the hollow of a dead oak, pleading for medical aid." },
    { title: "Swarm of Blood Flies / Pestilence", desc: "A buzzing cloud of insects descends. Characters failing a DC 11 Con save suffer disadvantage on Perception until rested." },
    { title: "Magical Anomaly / Ley Fissure", desc: "The hair on your arms stands up as arcane static fills the air. Detect Magic reveals an unstable planar rift." }
];

function renderTravel() {
    if (appState.travel) {
        if (appState.travel.pace) {
            appState.travelPace = appState.travel.pace;
            setTravelPace(appState.travel.pace, false);
        }
        const terrainSel = document.getElementById('travel-terrain-select');
        if (terrainSel && appState.travel.terrain) terrainSel.value = appState.travel.terrain;

        const roadSel = document.getElementById('travel-road-select');
        if (roadSel && appState.travel.road) roadSel.value = appState.travel.road;

        const distInput = document.getElementById('travel-distance-miles');
        if (distInput && appState.travel.targetMiles) distInput.value = appState.travel.targetMiles;

        const hoursInput = document.getElementById('travel-hours-input');
        if (hoursInput && appState.travel.marchHours) hoursInput.value = appState.travel.marchHours;
    }
    updateTravelCalculator();
    renderTravelMarchHistory();
}

function setTravelPace(pace, shouldSave = true) {
    appState.travelPace = pace;
    ['Slow', 'Normal', 'Fast'].forEach(p => {
        const btn = document.getElementById(`travel-pace-btn-${p}`);
        if (btn) {
            if (p === pace) {
                btn.className = "p-2.5 rounded-xl border-2 border-amber-500 bg-amber-500/10 text-left transition";
            } else {
                btn.className = "p-2.5 rounded-xl border border-ledger-700 bg-ledger-950 text-left hover:border-slate-600 transition";
            }
        }
    });
    const badge = document.getElementById('travel-pace-badge');
    if (badge) {
        if (pace === 'Slow') badge.textContent = 'Slow Pace (18 mi/day • Stealth Advantage)';
        else if (pace === 'Fast') badge.textContent = 'Fast Pace (30 mi/day • -5 Passive Perception)';
        else badge.textContent = 'Normal Pace (24 mi/day • Standard)';
    }
    updateTravelCalculator();
    if (shouldSave) saveTravelSettingsAPI();
}

function updateTravelCalculator() {
    const pace = appState.travelPace || 'Normal';
    const terrain = document.getElementById('travel-terrain-select')?.value || 'Forest';
    const road = document.getElementById('travel-road-select')?.value || 'trail';
    const targetMiles = parseFloat(document.getElementById('travel-distance-miles')?.value) || 48;
    const marchHours = parseFloat(document.getElementById('travel-hours-input')?.value) || 8;

    let baseMph = pace === 'Slow' ? 2.25 : (pace === 'Fast' ? 3.75 : 3.0);
    let roadMult = 1.0;
    if (road === 'trackless') roadMult = 0.75;
    else if (road === 'difficult') roadMult = 0.5;

    const effectiveMph = baseMph * roadMult;
    const milesToday = (effectiveMph * marchHours).toFixed(1);
    const daysNeeded = (targetMiles / (effectiveMph * marchHours)).toFixed(1);

    const isForcedMarch = marchHours > 8;
    const forcedHours = Math.max(0, marchHours - 8);

    const summaryBox = document.getElementById('travel-calc-summary');
    if (summaryBox) {
        summaryBox.innerHTML = `
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div>Speed: <strong class="text-amber-300 font-mono">${effectiveMph.toFixed(2)} mph</strong></div>
                <div>Distance Today: <strong class="text-emerald-300 font-mono">${milesToday} miles</strong></div>
                <div>Total Days Required: <strong class="text-sky-300 font-mono">${daysNeeded} days</strong></div>
                <div>Forced March: <strong class="${isForcedMarch ? 'text-rose-400 font-bold' : 'text-slate-400'}">${isForcedMarch ? `+${forcedHours} hrs (DC ${10 + forcedHours} Con)` : 'None (Standard)'}</strong></div>
            </div>
            ${isForcedMarch ? `
                <div class="p-2 rounded bg-rose-950/50 border border-rose-800 text-[10px] text-rose-300">
                    ⚠️ <strong>5.5e Forced March Rule:</strong> For each hour beyond 8, each character must make a DC ${10 + forcedHours} Constitution saving throw or gain 1 level of Exhaustion.
                </div>
            ` : ''}
        `;
    }

    // Update Terrain Hazard & DC Pill
    const info = TERRAIN_HAZARDS[terrain] || TERRAIN_HAZARDS['Forest'];
    const dcPill = document.getElementById('travel-dc-pill');
    if (dcPill) dcPill.textContent = `Terrain DC ${info.dc}`;

    const hazardBox = document.getElementById('travel-terrain-hazard-box');
    if (hazardBox) {
        hazardBox.innerHTML = `
            <div class="text-[11px]"><strong class="text-emerald-300">🌿 Foraging:</strong> ${escapeHTML(info.forage)}</div>
            <div class="text-[11px]"><strong class="text-sky-300">🧭 Navigation:</strong> ${escapeHTML(info.nav)}</div>
            <div class="text-[11px]"><strong class="text-rose-300">⚠️ Hazards:</strong> ${escapeHTML(info.hazard)}</div>
        `;
    }
}

async function saveTravelSettingsAPI() {
    const pace = appState.travelPace || 'Normal';
    const terrain = document.getElementById('travel-terrain-select')?.value || 'Forest';
    const road = document.getElementById('travel-road-select')?.value || 'trail';
    const targetMiles = parseFloat(document.getElementById('travel-distance-miles')?.value) || 48;
    const marchHours = parseFloat(document.getElementById('travel-hours-input')?.value) || 8;

    if (!appState.travel) appState.travel = { history: [] };
    appState.travel.pace = pace;
    appState.travel.terrain = terrain;
    appState.travel.road = road;
    appState.travel.targetMiles = targetMiles;
    appState.travel.marchHours = marchHours;

    try {
        await fetch('/api/travel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pace, terrain, road, targetMiles, marchHours })
        });
    } catch (e) {
        console.error("Error saving travel settings:", e);
    }
}

function renderTravelMarchHistory() {
    const container = document.getElementById('travel-march-history-list');
    if (!container) return;
    const history = (appState.travel && appState.travel.history) ? appState.travel.history : [];
    if (history.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-500 italic p-4 text-center">No overland marches logged yet. Click "Log March & Advance Clock" to record party travel.</div>`;
        return;
    }
    container.innerHTML = history.slice().reverse().map(entry => {
        const isCamp = entry.type === 'camp';
        const formattedTime = `Day ${entry.day || 1}, ${String(entry.hour || 0).padStart(2, '0')}:00`;

        if (isCamp) {
            return `
                <div class="p-2.5 rounded-xl bg-gradient-to-r from-emerald-950/70 to-ledger-950 border border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div class="flex items-center gap-2.5">
                        <span class="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 font-bold shrink-0 text-sm">🏕️</span>
                        <div>
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="font-bold text-emerald-300">${escapeHTML(entry.label || 'Overland Campsite')}</span>
                                <span class="px-1.5 py-0.5 rounded border text-[10px] font-mono bg-emerald-900/60 border-emerald-600 text-emerald-200">Camp Pitched</span>
                                <span class="text-[10px] text-slate-400 font-mono">${formattedTime} • ${escapeHTML(entry.terrain || 'Wilderness')}</span>
                            </div>
                            <div class="text-[11px] text-slate-300 mt-0.5">
                                ${escapeHTML(entry.notes || 'Pitched camp for party rest and recuperation.')}
                            </div>
                        </div>
                    </div>
                    <div class="text-[10px] font-mono text-slate-500 shrink-0">
                        ${entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                </div>
            `;
        }

        const paceColor = entry.pace === 'Fast' ? 'text-rose-400 bg-rose-950/40 border-rose-800' : (entry.pace === 'Slow' ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800' : 'text-amber-400 bg-amber-950/40 border-amber-800');
        return `
            <div class="p-2.5 rounded-xl bg-ledger-950 border border-ledger-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div class="flex items-center gap-2.5">
                    <span class="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold shrink-0">🥾</span>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-slate-200">${formattedTime}</span>
                            <span class="px-1.5 py-0.2 rounded border text-[10px] font-mono ${paceColor}">${entry.pace || 'Normal'} Pace</span>
                            <span class="text-[10px] text-slate-400 font-mono">${entry.terrain || 'Wilderness'} (${entry.road || 'trail'})</span>
                        </div>
                        <div class="text-[11px] text-slate-400 mt-0.5">
                            Marched <strong class="text-amber-300 font-mono">${entry.marchHours || 8} hours</strong> — Traveled <strong class="text-emerald-300 font-mono">${entry.miles || 0} miles</strong>
                        </div>
                    </div>
                </div>
                <div class="text-[10px] font-mono text-slate-500 shrink-0">
                    ${entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
            </div>
        `;
    }).join('');
}

async function executeWildernessMarch() {
    const marchHours = parseInt(document.getElementById('travel-hours-input')?.value, 10) || 8;
    const pace = appState.travelPace || 'Normal';
    const terrain = document.getElementById('travel-terrain-select')?.value || 'Forest';
    const road = document.getElementById('travel-road-select')?.value || 'trail';
    const targetMiles = parseFloat(document.getElementById('travel-distance-miles')?.value) || 48;

    let baseMph = pace === 'Slow' ? 2.25 : (pace === 'Fast' ? 3.75 : 3.0);
    let roadMult = 1.0;
    if (road === 'trackless') roadMult = 0.75;
    else if (road === 'difficult') roadMult = 0.5;
    const effectiveMph = baseMph * roadMult;
    const milesToday = parseFloat((effectiveMph * marchHours).toFixed(1));

    try {
        const res = await fetch('/api/travel/march', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                marchHours,
                pace,
                terrain,
                road,
                miles: milesToday
            })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.travel) {
                appState.travel = data.travel;
            }
            if (data.timeWeather) {
                appState.timeWeather = data.timeWeather;
                renderTimeWeatherHUD();
            }
            renderTravelMarchHistory();
            showToast(`Overland march logged: Marched ${milesToday} miles (${marchHours} hrs) through ${terrain}! Clock advanced.`, "success");
            if (data.expiredTimers && data.expiredTimers.length > 0) {
                showToast(`Timers expired: ${data.expiredTimers.join(', ')}`, "warning");
            }
        } else {
            showToast("Failed to log overland march.", "error");
        }
    } catch (e) {
        console.error("Travel march error:", e);
        showToast("Error advancing travel time.", "error");
    }
}

function rollTravelNavigationCheck() {
    playDiceSound();
    const terrain = document.getElementById('travel-terrain-select')?.value || 'Forest';
    const bonus = parseInt(document.getElementById('travel-nav-bonus')?.value, 10) || 0;
    const dc = TERRAIN_HAZARDS[terrain]?.dc || 15;
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + bonus;
    const isSuccess = total >= dc;

    const box = document.getElementById('travel-check-result-box');
    if (box) {
        box.innerHTML = `
            <div class="flex items-center justify-between border-b border-ledger-800 pb-1.5 mb-1.5">
                <span class="font-bold text-sky-300">🧭 Navigation Roll: ${d20} + ${bonus} = <strong class="text-base">${total}</strong> (vs DC ${dc})</span>
                <span class="px-2 py-0.2 rounded text-[10px] font-bold ${isSuccess ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'}">${isSuccess ? 'ON COURSE' : 'LOST'}</span>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">
                ${isSuccess ? '✓ The party maintains steady bearing along landmarks without straying from the intended trail.' : '✕ Disoriented in difficult terrain! The party drifts off course, losing 1d4 hours or miles to backtracking.'}
            </p>
        `;
    }
}

function rollTravelForagingCheck() {
    playDiceSound();
    const terrain = document.getElementById('travel-terrain-select')?.value || 'Forest';
    const bonus = parseInt(document.getElementById('travel-forage-bonus')?.value, 10) || 0;
    const dc = TERRAIN_HAZARDS[terrain]?.dc || 15;
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + bonus;
    const isSuccess = total >= dc;

    const box = document.getElementById('travel-check-result-box');
    if (box) {
        const foodPounds = Math.floor(Math.random() * 6) + 1 + Math.max(0, bonus);
        box.innerHTML = `
            <div class="flex items-center justify-between border-b border-ledger-800 pb-1.5 mb-1.5">
                <span class="font-bold text-emerald-300">🌿 Foraging Roll: ${d20} + ${bonus} = <strong class="text-base">${total}</strong> (vs DC ${dc})</span>
                <span class="px-2 py-0.2 rounded text-[10px] font-bold ${isSuccess ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' : 'bg-rose-950 text-rose-300 border border-rose-700'}">${isSuccess ? 'SUCCESS' : 'FAILED'}</span>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">
                ${isSuccess ? `✓ Abundant foraging! Gathered <strong class="text-amber-300">${foodPounds} lbs of edible rations & potable water</strong> for the party.` : '✕ Barren stretch; failed to locate sufficient edible game or clean drinking water.'}
            </p>
        `;
    }
}

function rollWildernessComplication() {
    playDiceSound();
    const event = EXPLORATION_COMPLICATIONS[Math.floor(Math.random() * EXPLORATION_COMPLICATIONS.length)];
    const box = document.getElementById('travel-complication-result-box');
    if (box) {
        box.innerHTML = `
            <div class="space-y-1">
                <div class="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                    <span>🎲</span> <span>${escapeHTML(event.title)}</span>
                </div>
                <p class="text-slate-300 text-[11px] leading-relaxed">${escapeHTML(event.desc)}</p>
            </div>
            <div class="pt-2 border-t border-ledger-900 flex justify-end">
                <button onclick="rollWildernessComplication()" class="text-[10px] text-purple-300 hover:text-white underline">Reroll Table</button>
            </div>
        `;
    }
    showToast(`Roadside Discovery: ${event.title}`, "info");
}

// -----------------------------------------------------------------------------
// 6. PLAYER INVENTORY, CURRENCY & SHARED PARTY STASH
// -----------------------------------------------------------------------------
function openPartyInventoryModal(targetId = 'stash') {
    appState.activeInventoryTab = targetId || 'stash';
    const modal = document.getElementById('party-inventory-modal');
    if (!modal) return;
    renderPartyInventoryModal();
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function setInventoryTab(tabId) {
    appState.activeInventoryTab = tabId;
    renderPartyInventoryModal();
}

function renderPartyInventoryModal() {
    const tabsContainer = document.getElementById('inventory-modal-tabs');
    const bodyContainer = document.getElementById('inventory-modal-body');
    const totalGpEl = document.getElementById('inventory-party-total-gp');
    if (!tabsContainer || !bodyContainer) return;

    const party = appState.party || [];
    const stash = appState.partyStash || { coins: { pp: 0, gp: 0, sp: 0, cp: 0 }, items: [] };
    const activeTab = appState.activeInventoryTab || 'stash';

    // Calculate total party wealth
    let totalGp = (stash.coins?.pp || 0) * 10 + (stash.coins?.gp || 0) + (stash.coins?.sp || 0) * 0.1 + (stash.coins?.cp || 0) * 0.01;
    party.forEach(pc => {
        const c = pc.currency || { pp: 0, gp: 0, sp: 0, cp: 0 };
        totalGp += (c.pp || 0) * 10 + (c.gp || 0) + (c.sp || 0) * 0.1 + (c.cp || 0) * 0.01;
    });
    if (totalGpEl) totalGpEl.textContent = `${totalGp.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} GP`;

    // Render Tabs
    let tabsHtml = `
        <button onclick="setInventoryTab('stash')" class="px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition ${activeTab === 'stash' ? 'bg-amber-500 text-ledger-950 shadow' : 'bg-ledger-900 border border-ledger-700 text-slate-300 hover:text-white'}">
            <span>🎒</span> <span>Shared Party Stash</span>
            <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeTab === 'stash' ? 'bg-ledger-950 text-amber-300' : 'bg-ledger-800 text-slate-400'}">${(stash.items || []).length}</span>
        </button>
    `;
    party.forEach(pc => {
        const count = (pc.inventory || []).length;
        const isCurrent = activeTab === pc.id;
        tabsHtml += `
            <button onclick="setInventoryTab('${pc.id}')" class="px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 transition ${isCurrent ? 'bg-amber-500 text-ledger-950 shadow font-bold' : 'bg-ledger-900 border border-ledger-700 text-slate-300 hover:text-white'}">
                <span>🛡️</span> <span>${escapeHTML(pc.name)}</span>
                <span class="px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isCurrent ? 'bg-ledger-950 text-amber-300' : 'bg-ledger-800 text-slate-400'}">${count}</span>
            </button>
        `;
    });
    tabsContainer.innerHTML = tabsHtml;

    // Render Tab Body
    if (activeTab === 'stash') {
        renderSharedStashView(bodyContainer, stash);
    } else {
        const pc = party.find(p => p.id === activeTab);
        if (pc) renderPCInventoryView(bodyContainer, pc);
        else renderSharedStashView(bodyContainer, stash);
    }
}

function renderSharedStashView(container, stash) {
    const coins = stash.coins || { pp: 0, gp: 0, sp: 0, cp: 0 };
    const items = stash.items || [];
    let totalWeight = items.reduce((acc, it) => acc + (parseFloat(it.weight) || 0) * (it.quantity || 1), 0);

    container.innerHTML = `
        <div class="space-y-4">
            <!-- Stash Header & Coin Purse -->
            <div class="bg-ledger-950/80 border border-ledger-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">🧰</span>
                        <h4 class="font-display font-bold text-sm sm:text-base text-amber-300">Party Bag of Holding / Wagon Vault</h4>
                    </div>
                    <p class="text-xs text-slate-400">Total weight stored: <strong class="text-slate-200 font-mono">${totalWeight.toFixed(1)} lbs</strong></p>
                </div>

                <!-- Coin Purse Controls -->
                <div class="flex items-center gap-2 flex-wrap">
                    ${['pp', 'gp', 'sp', 'cp'].map(c => `
                        <div class="bg-ledger-900 border border-ledger-700 rounded-xl px-2.5 py-1.5 flex items-center gap-2 text-xs">
                            <span class="font-bold uppercase text-[10px] text-amber-400 font-mono">${c}</span>
                            <span class="font-mono font-bold text-slate-100">${coins[c] || 0}</span>
                            <div class="flex items-center gap-1 ml-1">
                                <button onclick="modifyCurrency('stash', '${c}', -10)" class="w-4 h-4 rounded bg-ledger-800 hover:bg-rose-950 text-slate-400 text-[10px] flex items-center justify-center">-</button>
                                <button onclick="modifyCurrency('stash', '${c}', 10)" class="w-4 h-4 rounded bg-ledger-800 hover:bg-emerald-950 text-emerald-300 text-[10px] flex items-center justify-center">+</button>
                            </div>
                        </div>
                    `).join('')}
                    <button onclick="setCurrencyPrompt('stash')" class="px-2 py-1.5 rounded-lg bg-ledger-800 hover:bg-ledger-700 text-slate-300 text-[11px] font-semibold transition">Adjust</button>
                </div>
            </div>

            <!-- Items Table & Add Button -->
            <div class="bg-ledger-950/80 border border-ledger-800 rounded-2xl p-4 space-y-3">
                <div class="flex items-center justify-between">
                    <h5 class="font-display font-bold text-xs uppercase tracking-wider text-amber-400">Stashed Party Equipment & Loot</h5>
                    <button onclick="openCompendiumItemPicker('stash')" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-ledger-950 font-bold text-xs shadow transition">
                        + Add Item to Stash
                    </button>
                </div>

                ${items.length === 0 ? `
                    <div class="text-xs text-slate-500 italic p-6 text-center">The party stash is currently empty. Add items from shop loot or custom entries.</div>
                ` : `
                    <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
                        ${items.map((it, idx) => `
                            <div class="p-3 rounded-xl bg-ledger-900 border border-ledger-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div class="space-y-0.5 min-w-0">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <span class="font-bold text-slate-100 text-xs">${escapeHTML(it.name)}</span>
                                        <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-ledger-950 border border-ledger-700 text-amber-300">${it.rarity || 'Common'}</span>
                                        <span class="text-[10px] text-slate-400">(${it.category || 'Gear'})</span>
                                        ${it.weight ? `<span class="text-[10px] text-slate-400 font-mono">• ${it.weight} lbs</span>` : ''}
                                    </div>
                                    ${it.notes ? `<p class="text-[11px] text-slate-400 truncate">${escapeHTML(it.notes)}</p>` : ''}
                                </div>
                                <div class="flex items-center gap-2 shrink-0">
                                    <div class="flex items-center gap-1 bg-ledger-950 border border-ledger-700 rounded-lg px-2 py-0.5 text-xs font-mono">
                                        <button onclick="modifyItemQty('stash', ${idx}, -1)" class="text-slate-400 hover:text-white">-</button>
                                        <span class="px-1 font-bold text-slate-200">${it.quantity || 1}</span>
                                        <button onclick="modifyItemQty('stash', ${idx}, 1)" class="text-slate-400 hover:text-white">+</button>
                                    </div>
                                    <select onchange="transferItem('stash', this.value, ${idx})" class="bg-ledger-950 border border-ledger-700 rounded-lg px-2 py-1 text-[11px] text-slate-200">
                                        <option value="">Give to PC...</option>
                                        ${(appState.party || []).map(p => `<option value="${p.id}">${escapeHTML(p.name)}</option>`).join('')}
                                    </select>
                                    <button onclick="deleteInventoryItem('stash', ${idx})" class="text-slate-500 hover:text-rose-400 p-1 text-xs" title="Delete Item">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
}

function renderPCInventoryView(container, pc) {
    const coins = pc.currency || { pp: 0, gp: 0, sp: 0, cp: 0 };
    const items = pc.inventory || [];
    const str = pc.str || 10;
    const maxWeight = pc.maxCarryWeight || (str * 15);
    const totalWeight = items.reduce((acc, it) => acc + (parseFloat(it.weight) || 0) * (it.quantity || 1), 0);
    const isOverCapacity = totalWeight > maxWeight;
    const isHeavilyEncumbered = totalWeight > (str * 10);

    // 5.5e Attunement (Max 3 Slots)
    const attunedItems = items.filter(it => it.attuned);

    container.innerHTML = `
        <div class="space-y-4">
            <!-- PC Header & Capacity Bar -->
            <div class="bg-ledger-950/80 border border-ledger-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="text-xl">🛡️</span>
                        <h4 class="font-display font-bold text-sm sm:text-base text-amber-300">${escapeHTML(pc.name)}'s Gear & Coin Purse</h4>
                        <span class="text-[10px] text-slate-400 font-mono">(${escapeHTML(pc.classRole || '')})</span>
                    </div>
                    <div class="flex items-center gap-2 text-xs">
                        <span>Encumbrance: <strong class="font-mono ${isOverCapacity ? 'text-rose-400' : 'text-slate-200'}">${totalWeight.toFixed(1)} / ${maxWeight} lbs</strong></span>
                        ${isOverCapacity ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-950 border border-rose-700 text-rose-300">OVER CARRY LIMIT</span>' : (isHeavilyEncumbered ? '<span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-950 border border-amber-700 text-amber-300">-20ft Speed</span>' : '')}
                    </div>
                </div>

                <!-- Coin Purse Controls -->
                <div class="flex items-center gap-2 flex-wrap">
                    ${['pp', 'gp', 'sp', 'cp'].map(c => `
                        <div class="bg-ledger-900 border border-ledger-700 rounded-xl px-2.5 py-1.5 flex items-center gap-2 text-xs">
                            <span class="font-bold uppercase text-[10px] text-amber-400 font-mono">${c}</span>
                            <span class="font-mono font-bold text-slate-100">${coins[c] || 0}</span>
                            <div class="flex items-center gap-1 ml-1">
                                <button onclick="modifyCurrency('${pc.id}', '${c}', -5)" class="w-4 h-4 rounded bg-ledger-800 hover:bg-rose-950 text-slate-400 text-[10px] flex items-center justify-center">-</button>
                                <button onclick="modifyCurrency('${pc.id}', '${c}', 5)" class="w-4 h-4 rounded bg-ledger-800 hover:bg-emerald-950 text-emerald-300 text-[10px] flex items-center justify-center">+</button>
                            </div>
                        </div>
                    `).join('')}
                    <button onclick="setCurrencyPrompt('${pc.id}')" class="px-2 py-1.5 rounded-lg bg-ledger-800 hover:bg-ledger-700 text-slate-300 text-[11px] font-semibold transition">Adjust</button>
                </div>
            </div>

            <!-- 5.5e Attunement Tracker (3 Slots) -->
            <div class="bg-ledger-950/80 border border-ledger-800 rounded-2xl p-3.5 space-y-2">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-display font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                        <span>🔮</span> <span>5.5e Magic Item Attunement (${attunedItems.length} / 3 Slots)</span>
                    </span>
                    <span class="text-[10px] font-mono text-slate-400">Short Rest to Attune / End Attunement</span>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    ${[0, 1, 2].map(slotIdx => {
                        const att = attunedItems[slotIdx];
                        return `
                            <div class="p-2 rounded-xl border ${att ? 'bg-purple-950/30 border-purple-800/60 text-purple-200' : 'bg-ledger-900/60 border-ledger-800 text-slate-500'} flex items-center justify-between text-xs">
                                <div class="flex items-center gap-2 min-w-0">
                                    <span class="w-2 h-2 rounded-full ${att ? 'bg-purple-400 animate-pulse' : 'bg-slate-700'}"></span>
                                    <span class="font-medium truncate">${att ? escapeHTML(att.name) : 'Empty Slot'}</span>
                                </div>
                                ${att ? `<button onclick="toggleAttuneItem('${pc.id}', ${items.indexOf(att)})" class="text-slate-400 hover:text-rose-400 text-[10px]">Unattune</button>` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>

            <!-- Inventory Items Table -->
            <div class="bg-ledger-950/80 border border-ledger-800 rounded-2xl p-4 space-y-3">
                <div class="flex items-center justify-between">
                    <h5 class="font-display font-bold text-xs uppercase tracking-wider text-amber-400">Equipped Gear & Backpack</h5>
                    <button onclick="openCompendiumItemPicker('${pc.id}')" class="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-ledger-950 font-bold text-xs shadow transition">
                        + Add Item to Character
                    </button>
                </div>

                ${items.length === 0 ? `
                    <div class="text-xs text-slate-500 italic p-6 text-center">No inventory items recorded for this character.</div>
                ` : `
                    <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
                        ${items.map((it, idx) => `
                            <div class="p-3 rounded-xl bg-ledger-900 border ${it.equipped ? 'border-amber-500/50 bg-amber-500/5' : 'border-ledger-700/80'} flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                <div class="space-y-0.5 min-w-0">
                                    <div class="flex items-center gap-2 flex-wrap">
                                        <button onclick="toggleEquipItem('${pc.id}', ${idx})" class="px-2 py-0.5 rounded text-[10px] font-bold transition ${it.equipped ? 'bg-amber-500 text-ledger-950' : 'bg-ledger-950 border border-ledger-700 text-slate-400 hover:text-white'}">
                                            ${it.equipped ? '⚔️ Equipped' : 'Equip'}
                                        </button>
                                        <span class="font-bold text-slate-100 text-xs">${escapeHTML(it.name)}</span>
                                        <span class="px-1.5 py-0.2 rounded text-[10px] font-mono bg-ledger-950 border border-ledger-700 text-amber-300">${it.rarity || 'Common'}</span>
                                        ${it.weight ? `<span class="text-[10px] text-slate-400 font-mono">• ${it.weight} lbs</span>` : ''}
                                        ${it.attuned ? '<span class="px-1.5 py-0.2 rounded text-[10px] bg-purple-950 border border-purple-800 text-purple-300 font-bold">Attuned</span>' : ''}
                                    </div>
                                    ${it.notes ? `<p class="text-[11px] text-slate-400 truncate">${escapeHTML(it.notes)}</p>` : ''}
                                </div>
                                <div class="flex items-center gap-2 shrink-0">
                                    <button onclick="toggleAttuneItem('${pc.id}', ${idx})" class="px-2 py-1 rounded bg-ledger-950 border border-purple-800/80 text-purple-300 hover:bg-purple-950 text-[11px] font-semibold transition" title="Toggle 5.5e Attunement">
                                        ${it.attuned ? '🔮 Attuned' : '🔮 Attune'}
                                    </button>
                                    <div class="flex items-center gap-1 bg-ledger-950 border border-ledger-700 rounded-lg px-2 py-0.5 text-xs font-mono">
                                        <button onclick="modifyItemQty('${pc.id}', ${idx}, -1)" class="text-slate-400 hover:text-white">-</button>
                                        <span class="px-1 font-bold text-slate-200">${it.quantity || 1}</span>
                                        <button onclick="modifyItemQty('${pc.id}', ${idx}, 1)" class="text-slate-400 hover:text-white">+</button>
                                    </div>
                                    <button onclick="transferItem('${pc.id}', 'stash', ${idx})" class="px-2 py-1 rounded bg-ledger-950 border border-ledger-700 text-slate-300 hover:text-white text-[11px]" title="Move to Party Bag">
                                        🎒 Stash
                                    </button>
                                    <button onclick="deleteInventoryItem('${pc.id}', ${idx})" class="text-slate-500 hover:text-rose-400 p-1 text-xs" title="Delete Item">🗑️</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
}

function quickAddItemToInventory(targetId) {
    const name = prompt("Enter item name (e.g. Potion of Healing, Longsword +1, 50ft Rope):");
    if (!name || !name.trim()) return;
    const qtyStr = prompt("Quantity:", "1");
    const weightStr = prompt("Weight (lbs per item):", "1");
    const qty = parseInt(qtyStr, 10) || 1;
    const weight = parseFloat(weightStr) || 1;

    const newItem = {
        id: `inv-${Date.now().toString(36)}`,
        name: name.trim(),
        quantity: qty,
        weight: weight,
        category: "Equipment",
        rarity: "Common",
        equipped: false,
        attuned: false,
        notes: ""
    };

    if (targetId === 'stash') {
        const stash = appState.partyStash || { coins: { pp: 0, gp: 0, sp: 0, cp: 0 }, items: [] };
        if (!stash.items) stash.items = [];
        stash.items.push(newItem);
        savePartyStashAPI(stash);
    } else {
        const pc = (appState.party || []).find(p => p.id === targetId);
        if (!pc) return;
        if (!pc.inventory) pc.inventory = [];
        pc.inventory.push(newItem);
        savePCInventoryAPI(targetId, pc.inventory);
    }
    renderPartyInventoryModal();
}

// -----------------------------------------------------------------------------
// COMPENDIUM ITEM PICKER (FOR INVENTORY / STASH)
// -----------------------------------------------------------------------------
async function openCompendiumItemPicker(targetId = 'stash') {
    appState.itemPickerTarget = targetId;
    appState.itemPickerCategory = 'All';

    const modal = document.getElementById('inventory-compendium-picker-modal');
    if (!modal) return;

    if (!appState.items || appState.items.length === 0) {
        try {
            const res = await fetch('/api/items');
            if (res.ok) {
                const fetched = await res.json();
                if (Array.isArray(fetched)) appState.items = fetched;
            }
        } catch (e) {
            console.error("Error fetching items for picker:", e);
        }
    }

    const label = document.getElementById('inv-picker-target-label');
    if (label) {
        if (targetId === 'stash') {
            label.textContent = "Adding items from 5.5e compendium to Shared Party Stash / Bag of Holding.";
        } else {
            const pc = (appState.party || []).find(p => p.id === targetId);
            label.textContent = `Adding items from 5.5e compendium to ${pc ? pc.name : 'Character'}'s inventory.`;
        }
    }

    const searchInput = document.getElementById('inv-picker-search');
    if (searchInput) searchInput.value = '';

    renderCompendiumPickerCategories();
    renderCompendiumPickerItems();

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

function renderCompendiumPickerCategories() {
    const container = document.getElementById('inv-picker-category-filters');
    if (!container) return;

    const categories = ['All', 'Weapon', 'Armor', 'Potion', 'Ring', 'Scroll', 'Wand', 'Staff', 'Wondrous Item', 'Adventuring Gear'];
    const activeCat = appState.itemPickerCategory || 'All';

    container.innerHTML = categories.map(cat => {
        const isActive = activeCat.toLowerCase() === cat.toLowerCase();
        return `
            <button onclick="setCompendiumPickerCategory('${cat}')" class="px-2.5 py-1 rounded-lg font-medium transition whitespace-nowrap ${isActive ? 'bg-amber-500 text-ledger-950 font-bold shadow' : 'bg-ledger-900 border border-ledger-700 text-slate-300 hover:text-white'}">
                ${cat}
            </button>
        `;
    }).join('');
}

function setCompendiumPickerCategory(cat) {
    appState.itemPickerCategory = cat;
    renderCompendiumPickerCategories();
    renderCompendiumPickerItems();
}

function filterCompendiumPickerItems() {
    renderCompendiumPickerItems();
}

function renderCompendiumPickerItems() {
    const list = document.getElementById('inv-picker-items-list');
    const countLabel = document.getElementById('inv-picker-count-label');
    if (!list) return;

    const query = (document.getElementById('inv-picker-search')?.value || '').toLowerCase().trim();
    const activeCat = (appState.itemPickerCategory || 'All').toLowerCase();

    let items = appState.items || [];

    if (activeCat !== 'all') {
        items = items.filter(it => {
            const type = (it.type || it.category || '').toLowerCase();
            return type.includes(activeCat);
        });
    }

    if (query) {
        items = items.filter(it => {
            const name = (it.name || '').toLowerCase();
            const desc = (it.description || '').toLowerCase();
            const type = (it.type || it.category || '').toLowerCase();
            const rarity = (it.rarity || '').toLowerCase();
            return name.includes(query) || desc.includes(query) || type.includes(query) || rarity.includes(query);
        });
    }

    if (countLabel) {
        countLabel.textContent = `Showing ${items.length} items from compendium`;
    }

    if (items.length === 0) {
        list.innerHTML = `
            <div class="text-center py-12 text-slate-500 space-y-2">
                <div class="text-2xl">🔍</div>
                <p class="text-xs">No items match your search or category filter.</p>
                <button onclick="openCustomItemFromPicker()" class="mt-2 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition">
                    + Create Custom Item
                </button>
            </div>
        `;
        return;
    }

    list.innerHTML = items.map((it, idx) => {
        const rarity = it.rarity || 'Common';
        let rarityClass = 'bg-slate-800 text-slate-300 border-slate-700';
        if (rarity === 'Uncommon') rarityClass = 'bg-emerald-950 text-emerald-300 border-emerald-700';
        else if (rarity === 'Rare') rarityClass = 'bg-sky-950 text-sky-300 border-sky-700';
        else if (rarity === 'Very Rare') rarityClass = 'bg-purple-950 text-purple-300 border-purple-700';
        else if (rarity === 'Legendary' || rarity === 'Artifact') rarityClass = 'bg-amber-950 text-amber-300 border-amber-700';

        const safeId = `comp-item-${idx}`;
        const desc = (it.description || '').slice(0, 130);

        return `
            <div class="p-3 rounded-2xl bg-ledger-950/80 border border-ledger-800 hover:border-ledger-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="space-y-1 min-w-0 flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="font-bold text-slate-100 text-xs">${escapeHTML(it.name)}</span>
                        <span class="px-1.5 py-0.2 rounded border text-[10px] font-mono ${rarityClass}">${rarity}</span>
                        <span class="text-[10px] text-slate-400">(${escapeHTML(it.type || it.category || 'Gear')})</span>
                        ${it.weight ? `<span class="text-[10px] text-slate-400 font-mono">• ${it.weight} lbs</span>` : ''}
                        ${it.cost ? `<span class="text-[10px] text-amber-300 font-mono font-bold">• ${escapeHTML(it.cost)}</span>` : ''}
                    </div>
                    ${desc ? `<p class="text-[11px] text-slate-400 line-clamp-1">${escapeHTML(desc)}</p>` : ''}
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <div class="flex items-center gap-1 bg-ledger-900 border border-ledger-700 rounded-lg px-2 py-1 text-xs">
                        <label class="text-[10px] text-slate-400">Qty:</label>
                        <input id="${safeId}-qty" type="number" min="1" max="99" value="1" class="w-10 bg-transparent text-center font-mono font-bold text-white focus:outline-none">
                    </div>
                    <button onclick="addItemFromPicker('${escapeHTML(it.id || it.name)}', '${safeId}-qty')" class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-ledger-950 font-bold text-xs transition shadow flex items-center gap-1">
                        <span>+ Add</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function addItemFromPicker(itemIdOrName, qtyInputId) {
    const targetId = appState.itemPickerTarget || 'stash';
    const qtyInput = document.getElementById(qtyInputId);
    const qty = parseInt(qtyInput ? qtyInput.value : 1, 10) || 1;

    let item = (appState.items || []).find(x => x.id === itemIdOrName || x.name === itemIdOrName);
    if (!item) {
        showToast("Item not found in compendium.", "warning");
        return;
    }

    const newItem = {
        id: `inv-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        name: item.name,
        quantity: qty,
        weight: parseFloat(item.weight) || 0,
        category: item.type || item.category || "Equipment",
        rarity: item.rarity || "Common",
        equipped: false,
        attuned: false,
        notes: item.description ? item.description.slice(0, 200) : ""
    };

    if (targetId === 'stash') {
        const stash = appState.partyStash || { coins: { pp: 0, gp: 0, sp: 0, cp: 0 }, items: [] };
        if (!stash.items) stash.items = [];
        const existing = stash.items.find(x => x.name.toLowerCase() === newItem.name.toLowerCase());
        if (existing) {
            existing.quantity = (existing.quantity || 1) + qty;
        } else {
            stash.items.push(newItem);
        }
        await savePartyStashAPI(stash);
        showToast(`Added ${qty}x ${item.name} to Shared Party Stash!`, "success");
    } else {
        const pc = (appState.party || []).find(p => p.id === targetId);
        if (!pc) return;
        if (!pc.inventory) pc.inventory = [];
        const existing = pc.inventory.find(x => x.name.toLowerCase() === newItem.name.toLowerCase());
        if (existing) {
            existing.quantity = (existing.quantity || 1) + qty;
        } else {
            pc.inventory.push(newItem);
        }
        await savePCInventoryAPI(targetId, pc.inventory);
        showToast(`Added ${qty}x ${item.name} to ${pc.name}'s inventory!`, "success");
    }
    renderPartyInventoryModal();
}

function openCustomItemFromPicker() {
    const targetId = appState.itemPickerTarget || 'stash';
    closeModal('inventory-compendium-picker-modal');
    quickAddItemToInventory(targetId);
}

async function toggleEquipItem(pcId, itemIndex) {
    const pc = (appState.party || []).find(p => p.id === pcId);
    if (!pc || !pc.inventory || !pc.inventory[itemIndex]) return;
    pc.inventory[itemIndex].equipped = !pc.inventory[itemIndex].equipped;
    await savePCInventoryAPI(pcId, pc.inventory);
    renderPartyInventoryModal();
}

async function toggleAttuneItem(pcId, itemIndex) {
    const pc = (appState.party || []).find(p => p.id === pcId);
    if (!pc || !pc.inventory || !pc.inventory[itemIndex]) return;
    const it = pc.inventory[itemIndex];
    if (!it.attuned) {
        const currentCount = pc.inventory.filter(x => x.attuned).length;
        if (currentCount >= 3) {
            showToast("5.5e Rule: Characters may only attune to a maximum of 3 magic items at once.", "warning");
            return;
        }
        it.attuned = true;
    } else {
        it.attuned = false;
    }
    await savePCInventoryAPI(pcId, pc.inventory);
    renderPartyInventoryModal();
}

async function modifyItemQty(targetId, itemIndex, delta) {
    if (targetId === 'stash') {
        const stash = appState.partyStash || { coins: {}, items: [] };
        if (!stash.items || !stash.items[itemIndex]) return;
        stash.items[itemIndex].quantity = (stash.items[itemIndex].quantity || 1) + delta;
        if (stash.items[itemIndex].quantity <= 0) {
            stash.items.splice(itemIndex, 1);
        }
        await savePartyStashAPI(stash);
    } else {
        const pc = (appState.party || []).find(p => p.id === targetId);
        if (!pc || !pc.inventory || !pc.inventory[itemIndex]) return;
        pc.inventory[itemIndex].quantity = (pc.inventory[itemIndex].quantity || 1) + delta;
        if (pc.inventory[itemIndex].quantity <= 0) {
            pc.inventory.splice(itemIndex, 1);
        }
        await savePCInventoryAPI(targetId, pc.inventory);
    }
    renderPartyInventoryModal();
}

async function deleteInventoryItem(targetId, itemIndex) {
    if (targetId === 'stash') {
        const stash = appState.partyStash || { coins: {}, items: [] };
        if (!stash.items || !stash.items[itemIndex]) return;
        stash.items.splice(itemIndex, 1);
        await savePartyStashAPI(stash);
    } else {
        const pc = (appState.party || []).find(p => p.id === targetId);
        if (!pc || !pc.inventory || !pc.inventory[itemIndex]) return;
        pc.inventory.splice(itemIndex, 1);
        await savePCInventoryAPI(targetId, pc.inventory);
    }
    renderPartyInventoryModal();
}

async function transferItem(sourceId, targetId, itemIndex) {
    if (!targetId) return;
    let itemToTransfer = null;

    if (sourceId === 'stash') {
        const stash = appState.partyStash || { coins: {}, items: [] };
        if (!stash.items || !stash.items[itemIndex]) return;
        itemToTransfer = Object.assign({}, stash.items[itemIndex]);
        stash.items.splice(itemIndex, 1);
        await savePartyStashAPI(stash);
    } else {
        const sourcePC = (appState.party || []).find(p => p.id === sourceId);
        if (!sourcePC || !sourcePC.inventory || !sourcePC.inventory[itemIndex]) return;
        itemToTransfer = Object.assign({}, sourcePC.inventory[itemIndex]);
        sourcePC.inventory.splice(itemIndex, 1);
        await savePCInventoryAPI(sourceId, sourcePC.inventory);
    }

    if (targetId === 'stash') {
        const stash = appState.partyStash || { coins: {}, items: [] };
        if (!stash.items) stash.items = [];
        itemToTransfer.equipped = false;
        itemToTransfer.attuned = false;
        stash.items.push(itemToTransfer);
        await savePartyStashAPI(stash);
        showToast(`Transferred ${itemToTransfer.name} to Party Stash.`, "info");
    } else {
        const destPC = (appState.party || []).find(p => p.id === targetId);
        if (!destPC) return;
        if (!destPC.inventory) destPC.inventory = [];
        itemToTransfer.equipped = false;
        itemToTransfer.attuned = false;
        destPC.inventory.push(itemToTransfer);
        await savePCInventoryAPI(targetId, destPC.inventory);
        showToast(`Gave ${itemToTransfer.name} to ${destPC.name}.`, "info");
    }

    renderPartyInventoryModal();
}

async function modifyCurrency(targetId, coin, delta) {
    if (targetId === 'stash') {
        const stash = appState.partyStash || { coins: { pp: 0, gp: 0, sp: 0, cp: 0 }, items: [] };
        if (!stash.coins) stash.coins = { pp: 0, gp: 0, sp: 0, cp: 0 };
        stash.coins[coin] = Math.max(0, (stash.coins[coin] || 0) + delta);
        await savePartyStashAPI(stash);
    } else {
        const pc = (appState.party || []).find(p => p.id === targetId);
        if (!pc) return;
        if (!pc.currency) pc.currency = { pp: 0, gp: 0, sp: 0, cp: 0 };
        pc.currency[coin] = Math.max(0, (pc.currency[coin] || 0) + delta);
        await savePCCurrencyAPI(targetId, pc.currency);
    }
    renderPartyInventoryModal();
    renderShopInventory();
}

async function setCurrencyPrompt(targetId) {
    const isStash = targetId === 'stash';
    const current = isStash ? (appState.partyStash?.coins || {}) : ((appState.party || []).find(p => p.id === targetId)?.currency || {});
    const gpStr = prompt(`Set GP amount (Current: ${current.gp || 0}):`, current.gp || 0);
    if (gpStr === null) return;
    const gp = Math.max(0, parseInt(gpStr, 10) || 0);

    if (isStash) {
        const stash = appState.partyStash || { coins: {}, items: [] };
        if (!stash.coins) stash.coins = {};
        stash.coins.gp = gp;
        await savePartyStashAPI(stash);
    } else {
        const pc = (appState.party || []).find(p => p.id === targetId);
        if (!pc) return;
        if (!pc.currency) pc.currency = {};
        pc.currency.gp = gp;
        await savePCCurrencyAPI(targetId, pc.currency);
    }
    renderPartyInventoryModal();
    renderShopInventory();
}

async function savePartyStashAPI(stash) {
    try {
        const res = await fetch('/api/party/stash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(stash)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.partyStash) appState.partyStash = data.partyStash;
        }
    } catch (e) {
        console.error("Error saving party stash:", e);
    }
}

async function savePCInventoryAPI(pcId, inventory) {
    try {
        const res = await fetch(`/api/party/${pcId}/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inventory })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.party) appState.party = data.party;
        }
    } catch (e) {
        console.error("Error saving PC inventory:", e);
    }
}

async function savePCCurrencyAPI(pcId, currency) {
    try {
        const res = await fetch(`/api/party/${pcId}/inventory`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currency })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.party) appState.party = data.party;
        }
    } catch (e) {
        console.error("Error saving PC currency:", e);
    }
}

function giveItemToParty(itemIdOrObj) {
    let item = typeof itemIdOrObj === 'string' ? (appState.items || []).find(x => x.id === itemIdOrObj) : itemIdOrObj;
    if (!item) {
        showToast("Item not found.", "warning");
        return;
    }

    const party = appState.party || [];
    const options = ["0: Shared Party Stash / Bag of Holding"].concat(party.map((p, i) => `${i + 1}: ${p.name}`));
    const choice = prompt(`Give '${item.name}' to:\n\n${options.join('\n')}\n\nEnter number (0 for Stash):`, "0");
    if (choice === null) return;
    const num = parseInt(choice.trim(), 10);

    const newItem = {
        id: `inv-${Date.now().toString(36)}`,
        name: item.name,
        quantity: 1,
        weight: parseFloat(item.weight) || 1,
        category: item.type || "Equipment",
        rarity: item.rarity || "Common",
        equipped: false,
        attuned: false,
        notes: item.description ? item.description.slice(0, 150) : ""
    };

    if (isNaN(num) || num <= 0 || num > party.length) {
        const stash = appState.partyStash || { coins: {}, items: [] };
        if (!stash.items) stash.items = [];
        stash.items.push(newItem);
        savePartyStashAPI(stash);
        showToast(`Added '${item.name}' to Shared Party Stash!`, "success");
    } else {
        const targetPC = party[num - 1];
        if (!targetPC.inventory) targetPC.inventory = [];
        targetPC.inventory.push(newItem);
        savePCInventoryAPI(targetPC.id, targetPC.inventory);
        showToast(`Given '${item.name}' to ${targetPC.name}!`, "success");
    }
}

// -------------------------------------------------------------
// LOCAL NETWORK ACCESS & DM PASSCODE PROTECTION CONTROLS
// -------------------------------------------------------------
let cachedSecurityStatus = null;

async function loadSecuritySettingsUI() {
    try {
        const res = await fetch('/api/auth/status');
        if (res.ok) {
            const data = await res.json();
            cachedSecurityStatus = data;
            
            const pinToggle = document.getElementById('sec-toggle-pin-enabled');
            if (pinToggle) pinToggle.checked = Boolean(data.pinEnabled);
            
            const bypassToggle = document.getElementById('sec-toggle-localhost-bypass');
            if (bypassToggle) bypassToggle.checked = Boolean(data.localhostBypass);
            
            const badge = document.getElementById('security-active-badge');
            if (badge) {
                if (data.pinEnabled) {
                    badge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-700";
                    badge.textContent = "Protected";
                } else {
                    badge.className = "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-950 text-amber-400 border border-amber-700";
                    badge.textContent = "Unprotected (No PIN)";
                }
            }

            const curWrap = document.getElementById('sec-current-pin-wrap');
            if (curWrap) {
                if (!data.isLocalhost) {
                    curWrap.classList.remove('hidden');
                } else {
                    curWrap.classList.add('hidden');
                }
            }

            const statusIcon = document.getElementById('connect-security-status-icon');
            const statusText = document.getElementById('connect-security-status-text');
            if (statusIcon) statusIcon.textContent = data.pinEnabled ? '🔒' : '⚠️';
            if (statusText) {
                statusText.textContent = data.pinEnabled ? 'Protected' : 'Open (PIN Disabled)';
                statusText.className = data.pinEnabled ? 'text-emerald-400 font-mono' : 'text-amber-400 font-mono';
            }
        }
    } catch (e) {
        console.warn("Could not fetch security status:", e);
    }
}

let currentConnectView = 'companion';

async function setConnectModalView(view) {
    currentConnectView = view;
    const btnCompanion = document.getElementById('btn-connect-view-companion');
    const btnPlayer = document.getElementById('btn-connect-view-player');
    const label = document.getElementById('connect-url-label');
    const hint = document.getElementById('connect-qr-hint');
    const urlInput = document.getElementById('connect-player-url');
    const qrContainer = document.getElementById('connect-qr-container');

    if (view === 'companion') {
        if (btnCompanion) {
            btnCompanion.className = 'py-2 px-3 rounded-xl text-xs font-bold font-mono bg-emerald-600 text-white shadow transition flex items-center justify-center gap-1.5';
        }
        if (btnPlayer) {
            btnPlayer.className = 'py-2 px-3 rounded-xl text-xs font-bold font-mono text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5';
        }
        if (label) label.textContent = 'Player Mobile Companion URL (Local Wi-Fi)';
        if (hint) hint.textContent = 'Point phone/tablet camera at QR code to open companion';
    } else {
        if (btnPlayer) {
            btnPlayer.className = 'py-2 px-3 rounded-xl text-xs font-bold font-mono bg-emerald-600 text-white shadow transition flex items-center justify-center gap-1.5';
        }
        if (btnCompanion) {
            btnCompanion.className = 'py-2 px-3 rounded-xl text-xs font-bold font-mono text-slate-400 hover:text-white transition flex items-center justify-center gap-1.5';
        }
        if (label) label.textContent = 'Spectator Screen URL (Local Wi-Fi)';
        if (hint) hint.textContent = 'Point display or player device camera at QR code';
    }

    if (!cachedSecurityStatus) {
        await loadSecuritySettingsUI();
    }

    const targetUrl = (view === 'companion')
        ? (cachedSecurityStatus?.companionUrl || `${window.location.origin}/companion`)
        : (cachedSecurityStatus?.playerUrl || `${window.location.origin}/player`);

    if (urlInput) urlInput.value = targetUrl;

    if (qrContainer) {
        qrContainer.innerHTML = '<span class="text-slate-400 font-mono text-xs animate-pulse">Loading QR Code...</span>';
        try {
            const res = await fetch(`/api/auth/qr-code?view=${view}`);
            if (res.ok) {
                const data = await res.json();
                if (data.svg) {
                    qrContainer.innerHTML = data.svg;
                    const svgEl = qrContainer.querySelector('svg');
                    if (svgEl) {
                        svgEl.setAttribute('width', '180');
                        svgEl.setAttribute('height', '180');
                        svgEl.style.maxWidth = '100%';
                        svgEl.style.height = 'auto';
                    }
                } else {
                    qrContainer.innerHTML = `<a href="${targetUrl}" target="_blank" class="text-center font-mono text-xs text-indigo-600 underline font-bold break-all p-2">${targetUrl}</a>`;
                }
            } else {
                qrContainer.innerHTML = `<span class="text-xs font-mono text-slate-500 break-all">${targetUrl}</span>`;
            }
        } catch (e) {
            qrContainer.innerHTML = `<span class="text-xs font-mono text-slate-500 break-all">${targetUrl}</span>`;
        }
    }
}

async function openConnectPlayersModal() {
    openModal('connect-players-modal');
    const copyBtnText = document.getElementById('copy-btn-text');
    if (copyBtnText) copyBtnText.textContent = "Copy";
    await setConnectModalView('companion');
}

function copyPlayerUrl() {
    const input = document.getElementById('connect-player-url');
    if (!input || !input.value) return;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(input.value).then(() => {
            const btnText = document.getElementById('copy-btn-text');
            if (btnText) btnText.textContent = "Copied!";
            showToast("Player URL copied to clipboard!", "success");
            setTimeout(() => {
                if (btnText) btnText.textContent = "Copy";
            }, 2000);
        }).catch(() => {
            input.select();
            document.execCommand('copy');
            showToast("Player URL copied!", "success");
        });
    } else {
        input.select();
        document.execCommand('copy');
        showToast("Player URL copied!", "success");
    }
}

async function toggleSecurityPinEnabled(enabled) {
    try {
        const res = await fetch('/api/auth/update-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pinEnabled: enabled })
        });
        if (res.ok) {
            showToast(`DM Passcode Protection ${enabled ? 'Enabled' : 'Disabled'}`, enabled ? 'success' : 'warning');
            loadSecuritySettingsUI();
        } else {
            showToast("Failed to update security settings", "error");
        }
    } catch (e) {
        showToast("Error updating security settings", "error");
    }
}

async function toggleSecurityLocalhostBypass(bypass) {
    try {
        const res = await fetch('/api/auth/update-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ localhostBypass: bypass })
        });
        if (res.ok) {
            showToast(`Localhost Auto-Bypass ${bypass ? 'Enabled' : 'Disabled'}`, 'info');
            loadSecuritySettingsUI();
        } else {
            showToast("Failed to update localhost bypass", "error");
        }
    } catch (e) {
        showToast("Error updating localhost bypass", "error");
    }
}

async function saveNewDmPin() {
    const newPinInput = document.getElementById('sec-input-new-pin');
    const curPinInput = document.getElementById('sec-input-current-pin');
    const newPin = newPinInput ? newPinInput.value.trim() : '';
    const curPin = curPinInput ? curPinInput.value.trim() : '';

    if (!newPin || newPin.length < 4) {
        showToast("New passcode must be at least 4 digits", "warning");
        return;
    }

    try {
        const res = await fetch('/api/auth/update-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                newPin: newPin,
                currentPin: curPin || undefined
            })
        });

        if (res.ok) {
            showToast("DM Passcode updated successfully!", "success");
            if (newPinInput) newPinInput.value = '';
            if (curPinInput) curPinInput.value = '';
            loadSecuritySettingsUI();
        } else {
            const err = await res.json().catch(() => ({}));
            showToast(err.detail || "Failed to update passcode", "error");
        }
    } catch (e) {
        showToast("Error saving new passcode", "error");
    }
}

async function testDmLockScreen() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        localStorage.removeItem('arcane_dm_token');
        showToast("Locking DM Console...", "info");
        setTimeout(() => {
            window.location.reload();
        }, 300);
    } catch (e) {
        window.location.reload();
    }
}

let lastSeenRollId = null;
async function pollCompanionRolls() {
    try {
        const res = await fetch('/api/companion/rolls');
        if (res.ok) {
            const data = await res.json();
            const rolls = data.rolls || [];
            if (rolls.length > 0) {
                const latest = rolls[rolls.length - 1];
                if (lastSeenRollId && latest.id !== lastSeenRollId) {
                    const critSuffix = latest.isCrit ? " ★ CRITICAL HIT!" : (latest.isFumble ? " 💀 FUMBLE!" : "");
                    showToast(`🎲 ${latest.characterName || 'Hero'} (${latest.player || 'Player'}): ${latest.rollType || 'Roll'} → ${latest.total}${critSuffix}`, latest.isCrit ? "success" : (latest.isFumble ? "error" : "info"));
                    await fetchFullState();
                    renderPartyHUD();
                    renderCombatTracker();
                }
                lastSeenRollId = latest.id;
            }
        }
    } catch (e) {
        // Silently ignore
    }
}

window.setConnectModalView = setConnectModalView;
window.openConnectPlayersModal = openConnectPlayersModal;
window.copyPlayerUrl = copyPlayerUrl;
window.toggleSecurityPinEnabled = toggleSecurityPinEnabled;
window.toggleSecurityLocalhostBypass = toggleSecurityLocalhostBypass;
window.saveNewDmPin = saveNewDmPin;
window.testDmLockScreen = testDmLockScreen;
window.loadSecuritySettingsUI = loadSecuritySettingsUI;
window.openSessionRecapModal = openSessionRecapModal;
window.refreshSessionRecap = refreshSessionRecap;
window.copySessionRecapMarkdown = copySessionRecapMarkdown;
window.saveSessionRecapToTimeline = saveSessionRecapToTimeline;
window.exportTimelineMarkdown = exportTimelineMarkdown;
window.openStreamDeckModal = openStreamDeckModal;
window.initStreamDeckUI = initStreamDeckUI;
window.filterStreamDeckCategory = filterStreamDeckCategory;
window.filterStreamDeckList = filterStreamDeckList;
window.renderStreamDeckEndpoints = renderStreamDeckEndpoints;
window.copyStreamDeckMacroUrl = copyStreamDeckMacroUrl;
window.testStreamDeckEndpoint = testStreamDeckEndpoint;

window.onload = async function() {
    initSidebarState();
    loadArcaneSettings();
    updateSidebarKeybindTooltips();
    await fetchFullState();
    setInterval(pollCompanionRolls, 2500);
    populateTopFilterDropdowns();
    renderPartyHUD();
    renderCombatTracker();
    renderCurrentNPC();
    renderRoster();
    renderRulesScreen();
    renderTimeWeatherHUD();
    renderSessionNotes();
    renderBestiary();
    renderWorldView();
    renderAudioMixer();
    renderEncountersView();
    renderSpellsView();
    renderItemsView();
    renderSecrets();
    renderHandouts();
    renderOverworld();
    renderFactionRelations();
    renderPantheon();
    renderTimeline();
    renderTravel();
    generateShop();
    renderBroadcastPill();
    renderCampaignSettingsCard();
    renderModuleToggles();
    loadSecuritySettingsUI();
    initStreamDeckUI();
    if (window.LightingEngine) window.LightingEngine.init();
    initUpdater();
};

// =============================================================================
// APPLICATION AUTO-UPDATER & PATCHING CONTROLLER
// =============================================================================

let updaterPollInterval = null;
let currentUpdateRelease = null;

async function initUpdater() {
    try {
        const res = await fetch('/api/updates/settings');
        if (res.ok) {
            const data = await res.json();
            const autoCheckToggle = document.getElementById('updater-auto-check-toggle');
            if (autoCheckToggle) {
                autoCheckToggle.checked = (data.auto_check !== false);
            }
            const tokenBadge = document.getElementById('updater-token-badge');
            if (tokenBadge) {
                if (data.has_token) {
                    tokenBadge.textContent = `Configured (${data.masked_token})`;
                    tokenBadge.className = 'text-[10px] font-mono text-emerald-400';
                } else {
                    tokenBadge.textContent = 'Not configured';
                    tokenBadge.className = 'text-[10px] font-mono text-slate-500';
                }
            }
            const versionBadge = document.getElementById('updater-installed-version-badge');
            if (versionBadge && data.current_version) {
                versionBadge.textContent = `v${data.current_version}`;
            }
            const channelSelect = document.getElementById('updater-channel-select');
            if (channelSelect && data.channel) {
                channelSelect.value = data.channel;
            }
            updateChannelBadge();

            const macLocationTip = document.getElementById('updater-mac-location-tip');
            if (macLocationTip) {
                if (data.is_translocated || data.in_downloads) {
                    macLocationTip.classList.remove('hidden');
                } else {
                    macLocationTip.classList.add('hidden');
                }
            }

            // If auto-check enabled, trigger background check after 1.5s delay
            if (data.auto_check !== false) {
                setTimeout(() => {
                    checkForUpdates(false);
                }, 1500);
            }
        }
    } catch (e) {
        console.warn('Updater initialization error:', e);
    }
}

function formatNoteInlineLinks(text) {
    if (!text) return '';
    let escaped = escapeHTML(text);
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100 font-semibold">$1</strong>');
    escaped = escaped.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 underline font-medium">$1</a>');
    escaped = escaped.replace(/(^|[\s(])(https?:\/\/[^\s)<>]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 underline font-medium">link</a>');
    return escaped;
}

function formatReleaseNotes(raw) {
    if (!raw || typeof raw !== 'string' || !raw.trim()) {
        return '<p class="text-slate-400 italic">No detailed release notes provided for this build.</p>';
    }

    const isOnlyCompare = /^(\*?\*?Full Changelog\*?\*?:\s*)?https?:\/\/github\.com\S+$/i.test(raw.trim());
    if (isOnlyCompare) {
        const urlMatch = raw.match(/https?:\/\/github\.com\S+/);
        const url = urlMatch ? urlMatch[0] : '#';
        return `
            <div class="space-y-2 text-slate-300">
                <p class="font-medium text-amber-300">What's New in this Release:</p>
                <ul class="list-disc pl-4 space-y-1 text-slate-300 text-xs">
                    <li>Core performance enhancements and campaign stability upgrades.</li>
                    <li>Bug fixes and workflow polish across world tools, timeline, and regional maps.</li>
                </ul>
                <div class="pt-1 text-[11px]">
                    <a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 underline font-semibold inline-flex items-center gap-1">
                        <span>🔗</span> View commit changes on GitHub
                    </a>
                </div>
            </div>
        `;
    }

    const lines = raw.split('\n');
    let html = '<div class="space-y-1 text-slate-300">';
    for (let line of lines) {
        let trimmed = line.trim();
        if (!trimmed) {
            html += '<div class="h-1"></div>';
            continue;
        }
        if (trimmed.startsWith('### ')) {
            html += `<h5 class="font-bold text-amber-300 text-xs mt-2 mb-1">${escapeHTML(trimmed.replace(/^###\s+/, ''))}</h5>`;
        } else if (trimmed.startsWith('## ')) {
            html += `<h4 class="font-bold text-amber-400 text-sm mt-3 mb-1">${escapeHTML(trimmed.replace(/^##\s+/, ''))}</h4>`;
        } else if (trimmed.startsWith('# ')) {
            html += `<h3 class="font-bold text-amber-400 text-base mt-3 mb-1">${escapeHTML(trimmed.replace(/^#\s+/, ''))}</h3>`;
        } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
            const bulletText = trimmed.replace(/^(\*|-)\s+/, '');
            const formatted = formatNoteInlineLinks(bulletText);
            html += `<div class="flex items-start gap-1.5 pl-2"><span class="text-amber-400 mt-0.5">•</span><span class="flex-1">${formatted}</span></div>`;
        } else if (/^(\*?\*?Full Changelog\*?\*?:)/i.test(trimmed)) {
            const urlMatch = trimmed.match(/https?:\/\/github\.com\S+/);
            if (urlMatch) {
                html += `<div class="pt-2 text-[11px]"><a href="${escapeHTML(urlMatch[0])}" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 underline font-semibold">🔗 View Full Commit Comparison on GitHub</a></div>`;
            }
        } else {
            html += `<p class="leading-relaxed">${formatNoteInlineLinks(trimmed)}</p>`;
        }
    }
    html += '</div>';
    return html;
}

function cleanBannerSummary(raw) {
    if (!raw || typeof raw !== 'string') return 'New features, performance enhancements, and bug fixes ready to install.';
    const isOnlyCompare = /^(\*?\*?Full Changelog\*?\*?:\s*)?https?:\/\/github\.com\S+$/i.test(raw.trim());
    if (isOnlyCompare) {
        return 'Includes regional map zoom & pan, local map file browsing, campaign-isolated timeline, and stability improvements.';
    }
    const cleanLines = raw.split('\n')
        .map(l => l.replace(/^[#*\-\s]+/, '').replace(/\[(.*?)\]\(.*?\)/g, '$1').trim())
        .filter(l => l.length > 5 && !l.toLowerCase().includes('full changelog') && !l.startsWith('http'));
    if (cleanLines.length > 0) {
        return cleanLines.slice(0, 3).join(' • ');
    }
    return raw.slice(0, 250);
}

async function checkForUpdates(manual = false) {
    const spinner = document.getElementById('updater-check-spinner');
    const checkBtn = document.getElementById('updater-check-btn');
    const statusTitle = document.getElementById('updater-status-title');
    const statusSub = document.getElementById('updater-status-subtitle');
    const statusIcon = document.getElementById('updater-status-icon');
    const downloadBtn = document.getElementById('updater-download-btn');
    const applyBtn = document.getElementById('updater-apply-btn');
    const notesBox = document.getElementById('updater-notes-box');

    if (spinner) spinner.classList.remove('hidden');
    if (checkBtn) checkBtn.disabled = true;
    if (statusTitle) statusTitle.textContent = 'Checking GitHub Releases for updates...';

    try {
        const url = `/api/updates/check?force=${manual ? 'true' : 'false'}&auto=${manual ? 'false' : 'true'}`;
        const res = await fetch(url);
        const data = await res.json();

        if (statusSub) {
            statusSub.textContent = `Last checked: ${new Date().toLocaleTimeString()}`;
        }

        const macLocationTip = document.getElementById('updater-mac-location-tip');
        if (macLocationTip) {
            if (data.is_translocated || data.in_downloads) {
                macLocationTip.classList.remove('hidden');
            } else {
                macLocationTip.classList.add('hidden');
            }
        }

        if (!res.ok || !data.success) {
            const errMsg = data.detail || data.error || 'Failed to check updates';
            if (statusTitle) statusTitle.textContent = 'Check Failed';
            if (statusIcon) statusIcon.textContent = '⚠️';
            if (statusSub) statusSub.textContent = errMsg;
            if (manual) showToast(errMsg, 'error');
            return;
        }

        if (data.update_available) {
            currentUpdateRelease = data.release;
            if (statusIcon) statusIcon.textContent = '🚀';
            if (statusTitle) statusTitle.textContent = `Update Available: ${data.latest_version}`;
            if (statusSub) statusSub.textContent = `Current: v${data.current_version} • New version published on GitHub`;
            
            if (downloadBtn) downloadBtn.classList.remove('hidden');
            if (applyBtn) applyBtn.classList.add('hidden');

            // Populate release notes in settings
            if (notesBox) {
                notesBox.classList.remove('hidden');
                const notesTitle = document.getElementById('updater-notes-title');
                const notesDate = document.getElementById('updater-notes-date');
                const notesContent = document.getElementById('updater-notes-content');
                if (notesTitle) notesTitle.textContent = data.release.name || data.latest_version;
                if (notesDate && data.release.published_at) {
                    notesDate.textContent = new Date(data.release.published_at).toLocaleDateString();
                }
                if (notesContent) {
                    notesContent.innerHTML = formatReleaseNotes(data.release.body);
                }
            }

            // Show floating startup banner if auto-check
            const banner = document.getElementById('update-notification-banner');
            if (banner) {
                const bannerVersion = document.getElementById('banner-update-version');
                const bannerNotes = document.getElementById('banner-release-notes');
                if (bannerVersion) bannerVersion.textContent = data.latest_version;
                if (bannerNotes) bannerNotes.textContent = cleanBannerSummary(data.release.body);
                banner.classList.remove('hidden');
                banner.classList.add('flex');
            }

            if (manual) showToast(`New Arcane Ledger update ${data.latest_version} is available!`, 'success');
        } else {
            if (statusIcon) statusIcon.textContent = '✅';
            if (statusTitle) statusTitle.textContent = `Arcane Ledger is up to date (v${data.current_version})`;
            if (statusSub) statusSub.textContent = `You are running the latest version.`;
            if (downloadBtn) downloadBtn.classList.add('hidden');
            if (applyBtn) applyBtn.classList.add('hidden');
            if (notesBox) notesBox.classList.add('hidden');
            if (manual) showToast('You are running the latest version of Arcane Ledger.', 'info');
        }
    } catch (e) {
        console.error('Error checking updates:', e);
        if (statusTitle) statusTitle.textContent = 'Check Failed';
        if (statusIcon) statusIcon.textContent = '⚠️';
        if (statusSub) statusSub.textContent = String(e);
        if (manual) showToast('Could not reach GitHub Releases API', 'error');
    } finally {
        if (spinner) spinner.classList.add('hidden');
        if (checkBtn) checkBtn.disabled = false;
    }
}

async function startUpdateDownload() {
    const downloadBtn = document.getElementById('updater-download-btn');
    const applyBtn = document.getElementById('updater-apply-btn');
    const progressContainer = document.getElementById('updater-progress-container');
    const progressBar = document.getElementById('updater-progress-bar');
    const progressText = document.getElementById('updater-progress-text');
    const progressLabel = document.getElementById('updater-progress-label');
    const statusTitle = document.getElementById('updater-status-title');

    if (downloadBtn) {
        downloadBtn.disabled = true;
        downloadBtn.classList.add('opacity-50');
    }
    if (progressContainer) progressContainer.classList.remove('hidden');
    if (statusTitle) statusTitle.textContent = 'Downloading update package...';

    try {
        const res = await fetch('/api/updates/download', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || 'Download initiation failed');
        }

        if (updaterPollInterval) clearInterval(updaterPollInterval);
        updaterPollInterval = setInterval(async () => {
            try {
                const sRes = await fetch('/api/updates/status');
                if (!sRes.ok) return;
                const statusData = await sRes.json();

                if (statusData.status === 'downloading') {
                    const pct = statusData.progress_pct || 0;
                    if (progressBar) progressBar.style.width = `${pct}%`;
                    const mbDown = (statusData.bytes_downloaded / (1024 * 1024)).toFixed(1);
                    const mbTotal = (statusData.total_bytes / (1024 * 1024)).toFixed(1);
                    if (progressText) progressText.textContent = `${mbDown} MB / ${mbTotal} MB (${pct}%)`;
                } else if (statusData.status === 'downloaded') {
                    clearInterval(updaterPollInterval);
                    if (progressBar) progressBar.style.width = '100%';
                    if (progressText) progressText.textContent = '100% (Verified)';
                    if (progressLabel) progressLabel.textContent = 'Update verified and ready to apply!';
                    if (statusTitle) statusTitle.textContent = 'Download Complete! Ready to Patch & Relaunch.';
                    if (downloadBtn) downloadBtn.classList.add('hidden');
                    if (applyBtn) {
                        applyBtn.classList.remove('hidden');
                        applyBtn.disabled = false;
                    }
                    showToast('Update package downloaded. Click Relaunch to apply.', 'success');
                } else if (statusData.status === 'error') {
                    clearInterval(updaterPollInterval);
                    if (statusTitle) statusTitle.textContent = 'Download Failed';
                    if (progressLabel) progressLabel.textContent = statusData.error_message || 'Download error';
                    if (downloadBtn) {
                        downloadBtn.disabled = false;
                        downloadBtn.classList.remove('opacity-50');
                    }
                    showToast(statusData.error_message || 'Download failed', 'error');
                }
            } catch (err) {
                console.warn('Status poll error:', err);
            }
        }, 400);

    } catch (e) {
        showToast(e.message, 'error');
        if (downloadBtn) {
            downloadBtn.disabled = false;
            downloadBtn.classList.remove('opacity-50');
        }
    }
}

async function startAutoUpdateDownload() {
    dismissUpdateBanner();
    switchTab('settings');
    scrollToUpdateSection();
    await startUpdateDownload();
}

async function applyUpdateAndRestart() {
    const applyBtn = document.getElementById('updater-apply-btn');
    const statusTitle = document.getElementById('updater-status-title');
    const statusSub = document.getElementById('updater-status-subtitle');

    if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.textContent = 'Relaunching Arcane Ledger...';
    }
    if (statusTitle) statusTitle.textContent = 'Patching Application & Relaunching...';
    if (statusSub) statusSub.textContent = 'Please wait while the new version replaces the local app.';

    try {
        const res = await fetch('/api/updates/apply', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(data.detail || 'Failed to dispatch updater');
        }
        showToast('Relaunching Arcane Ledger with the latest version...', 'info');

        // Full-screen overlay while relaunching
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 z-[100000] bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center gap-4 text-center p-6 text-white';
        overlay.innerHTML = `
            <div class="text-5xl animate-bounce">⚡</div>
            <h2 class="text-2xl font-bold font-display text-amber-400">Patching Arcane Ledger</h2>
            <p class="text-sm text-slate-300 max-w-md">The application is updating its local files and will automatically restart in a few moments.</p>
            <div class="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mt-2"></div>
        `;
        document.body.appendChild(overlay);

    } catch (e) {
        showToast(`Failed to apply update: ${e.message}`, 'error');
        if (applyBtn) {
            applyBtn.disabled = false;
            applyBtn.textContent = '⚡ Relaunch to Finish Update';
        }
    }
}

async function saveUpdaterSettings() {
    const toggle = document.getElementById('updater-auto-check-toggle');
    const channelSelect = document.getElementById('updater-channel-select');
    const autoCheck = toggle ? toggle.checked : true;
    const channel = channelSelect ? channelSelect.value : 'stable';
    try {
        await fetch('/api/updates/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ auto_check: autoCheck, channel: channel })
        });
        updateChannelBadge();
        showToast('Updater preferences saved.', 'info');
    } catch (e) {
        console.error('Error saving updater preferences:', e);
    }
}

function updateChannelBadge() {
    const channelSelect = document.getElementById('updater-channel-select');
    const badge = document.getElementById('updater-channel-badge');
    if (!channelSelect || !badge) return;
    if (channelSelect.value === 'beta') {
        badge.textContent = 'Beta Channel Active';
        badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40';
    } else {
        badge.textContent = 'Stable Channel Active';
        badge.className = 'px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40';
    }
}

async function saveUpdaterToken() {
    const input = document.getElementById('updater-token-input');
    if (!input) return;
    const token = input.value.trim();
    try {
        const res = await fetch('/api/updates/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ github_token: token })
        });
        if (res.ok) {
            showToast('GitHub token saved successfully.', 'success');
            input.value = '';
            initUpdater();
        } else {
            showToast('Failed to save GitHub token.', 'error');
        }
    } catch (e) {
        showToast('Error saving GitHub token: ' + e.message, 'error');
    }
}

function dismissUpdateBanner() {
    const banner = document.getElementById('update-notification-banner');
    if (banner) {
        banner.classList.add('hidden');
        banner.classList.remove('flex');
    }
}

function scrollToUpdateSection() {
    setTimeout(() => {
        const card = document.getElementById('settings-updater-card');
        if (card) {
            card.scrollIntoView({ behavior: 'smooth' });
        }
    }, 150);
}

window.initUpdater = initUpdater;
window.checkForUpdates = checkForUpdates;
window.startUpdateDownload = startUpdateDownload;
window.startAutoUpdateDownload = startAutoUpdateDownload;
window.applyUpdateAndRestart = applyUpdateAndRestart;
window.saveUpdaterSettings = saveUpdaterSettings;
window.saveUpdaterToken = saveUpdaterToken;
window.updateChannelBadge = updateChannelBadge;
window.dismissUpdateBanner = dismissUpdateBanner;
window.scrollToUpdateSection = scrollToUpdateSection;
window.overworldZoomIn = overworldZoomIn;
window.overworldZoomOut = overworldZoomOut;
window.overworldResetZoom = overworldResetZoom;
window.uploadActiveOverworldMapFile = uploadActiveOverworldMapFile;
window.uploadOverworldSubmapFile = uploadOverworldSubmapFile;
window.fetchTimeline = fetchTimeline;




