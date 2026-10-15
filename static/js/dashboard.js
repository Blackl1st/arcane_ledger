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
    lighting: null
};
window.appState = appState;

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
            if (data.party && data.party.length > 0) appState.party = data.party;
            if (data.combat) appState.combat = data.combat;
            if (data.roster && data.roster.length > 0) appState.roster = data.roster;
            if (data.world && data.world.customFactions) appState.world = data.world;
            if (data.rules) appState.rules = data.rules;
            if (data.notes) appState.notes = data.notes;
            if (data.timeWeather) appState.timeWeather = data.timeWeather;
            if (data.monsters && data.monsters.length > 0) {
                appState.monsters = data.monsters;
                if (!appState.selectedMonsterId) appState.selectedMonsterId = data.monsters[0].id;
            }
            if (data.locations) appState.locations = data.locations;
            if (data.factions) appState.factions = data.factions;
            if (data.quests) appState.quests = data.quests;
            if (data.rumors) appState.rumors = data.rumors;
            if (data.broadcast !== undefined) {
                appState.broadcast = data.broadcast;
                renderBroadcastPill();
            }
            if (data.audioLibrary) {
                appState.audioLibrary = data.audioLibrary;
                if (window.AudioEngine) window.AudioEngine.loadTracks(data.audioLibrary);
            }
            if (data.audioPresets) {
                appState.audioPresets = data.audioPresets;
            }
            if (data.spells && data.spells.length > 0) {
                appState.spells = data.spells;
                if (!appState.selectedSpellId) appState.selectedSpellId = data.spells[0].id;
            }
            if (data.encounters) {
                appState.encounters = data.encounters;
            }
            if (data.lighting) {
                appState.lighting = data.lighting;
                if (window.LightingEngine) {
                    window.LightingEngine.state = Object.assign(window.LightingEngine.state, data.lighting);
                    window.LightingEngine.updateUI();
                }
            }
            updateConnectionStatus(true);
            return;
        }
    } catch (err) {
        console.warn("Backend not reached, loading local storage:", err);
    }
    updateConnectionStatus(false);
    loadFromLocalStorage();
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
    'rules': { icon: '📜', title: '2024 Rules Engine' },
    'world': { icon: '🏰', title: 'World, Factions & Quests' },
    'npcs': { icon: '👤', title: 'NPC Generator & Roster' },
    'loot': { icon: '💰', title: 'Loot & Merchants' },
    'notes': { icon: '📝', title: 'Session Scratchpad' },
    'audio': { icon: '🎭', title: 'Atmosphere & Lighting' },
    'settings': { icon: '⚙️', title: 'System Settings & Keybinds' }
};

function switchTab(tab) {
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
    const popoverIds = ['time-weather-popover', 'audio-popover', 'displays-popover', 'dice-drawer'];
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
        { popover: 'dice-drawer', trigger: 'dice-btn' }
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
        const hpPct = Math.max(0, Math.min(100, Math.round((pc.currentHp / pc.maxHp) * 100)));
        const isBloodied = pc.currentHp > 0 && pc.currentHp <= Math.floor(pc.maxHp / 2);
        const isUnconscious = pc.currentHp === 0;

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
    apiSaveParty();
    showToast(`Saved character: ${pc.name}`, "success");
}

function deleteCurrentPC() {
    const id = document.getElementById('edit-pc-id').value;
    if (!confirm("Are you sure you want to remove this character from the party?")) return;
    appState.party = appState.party.filter(p => p.id !== id);
    closeModal('edit-pc-modal');
    renderPartyHUD();
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
        const isActiveTurn = combat.inCombat && idx === combat.currentTurnIndex;
        const hpPct = Math.max(0, Math.min(100, Math.round((c.currentHp / c.maxHp) * 100)));
        const isBloodied = c.currentHp > 0 && c.currentHp <= Math.floor(c.maxHp / 2);
        const isDefeated = c.currentHp <= 0;

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
    if (!container || !rules) return;

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
    if (appState.world.useOnlyCustomFactions && appState.world.customFactions.length > 0) {
        return appState.world.customFactions;
    }
    return Array.from(new Set([...DEFAULT_FACTIONS, ...(appState.world.customFactions || [])]));
}

function getActiveLocationsPool() {
    if (appState.world.useOnlyCustomLocations && appState.world.customLocations.length > 0) {
        return appState.world.customLocations;
    }
    return Array.from(new Set([...DEFAULT_LOCATIONS, ...(appState.world.customLocations || [])]));
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
    appState.currentNPC.secret = document.getElementById('npc-secret').innerText.trim();
    appState.currentNPC.faction = document.getElementById('npc-faction').innerText.trim();
    appState.currentNPC.factionStanding = document.getElementById('npc-faction-standing').innerText.trim();
    appState.currentNPC.location = document.getElementById('npc-location').innerText.trim();
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

    appState.currentNPC.faction = (factionFilter !== "ANY") ? factionFilter : pickRandom(factions);
    appState.currentNPC.factionStanding = pickRandom(FACTION_STANDINGS);
    appState.currentNPC.location = (locationFilter !== "ANY") ? locationFilter : pickRandom(locations);
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
    document.getElementById('npc-secret').innerText = npc.secret;
    document.getElementById('npc-faction').innerText = npc.faction;
    document.getElementById('npc-faction-standing').innerText = npc.factionStanding;
    document.getElementById('npc-location').innerText = npc.location;
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
    showToast(`Loaded "${found.name}"`, "info");
}

function deleteNPCFromRoster(id, event) {
    if (event) event.stopPropagation();
    if (!confirm("Delete this NPC from the campaign roster?")) return;
    appState.roster = appState.roster.filter(item => item.id !== id);
    if (appState.currentNPC.id === id) appState.currentNPC.id = null;
    apiDeleteRosterNPC(id);
    renderRoster();
    showToast("Removed NPC from roster", "info");
}

function renderRoster() {
    const listEl = document.getElementById('roster-list');
    const countEl = document.getElementById('roster-count');
    if (!listEl) return;

    const query = (document.getElementById('roster-search')?.value || "").toLowerCase().trim();
    if (countEl) countEl.innerText = appState.roster.length;

    const filtered = appState.roster.filter(npc => {
        if (!query) return true;
        return (
            (npc.name && npc.name.toLowerCase().includes(query)) ||
            (npc.epithet && npc.epithet.toLowerCase().includes(query)) ||
            (npc.role && npc.role.toLowerCase().includes(query)) ||
            (npc.species && npc.species.toLowerCase().includes(query)) ||
            (npc.faction && npc.faction.toLowerCase().includes(query)) ||
            (npc.location && npc.location.toLowerCase().includes(query)) ||
            (npc.notes && npc.notes.toLowerCase().includes(query))
        );
    });

    if (filtered.length === 0) {
        listEl.innerHTML = `
            <div class="text-center py-10 px-3 border border-dashed border-ledger-700 rounded-xl text-slate-400 text-xs space-y-1">
                <p class="font-semibold text-slate-300">No Saved NPCs Found</p>
                <p>Click "Save to Roster" on any generated NPC to keep them for your campaign.</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = filtered.map(npc => `
        <div onclick="loadNPCFromRoster('${npc.id}')" class="group p-3 rounded-xl bg-ledger-950/90 hover:bg-ledger-800 border border-ledger-800 hover:border-amber-500/40 cursor-pointer transition relative">
            <div class="flex items-start justify-between gap-2">
                <div>
                    <h4 class="font-bold text-xs sm:text-sm text-white group-hover:text-amber-300 transition">
                        ${escapeHTML(npc.name)} <span class="text-amber-400/80 italic font-normal">${escapeHTML(npc.epithet || '')}</span>
                    </h4>
                    <p class="text-[11px] text-sky-300 font-medium mt-0.5">${escapeHTML(npc.species)} • ${escapeHTML(npc.role)}</p>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="event.stopPropagation(); sendRosterNPCToCombat('${npc.id}')" title="Send to Combat Tracker" class="p-1 rounded bg-amber-500/10 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 transition text-xs flex items-center gap-1">
                        <span>⚔️</span>
                    </button>
                    <button onclick="deleteNPCFromRoster('${npc.id}', event)" title="Delete from Roster" class="p-1 rounded hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 transition">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                <span class="px-1.5 py-0.5 rounded bg-ledger-900 border border-ledger-700 text-indigo-300 truncate max-w-[140px]">${escapeHTML(npc.faction)}</span>
                <span class="px-1.5 py-0.5 rounded bg-ledger-900 border border-ledger-700 text-emerald-300 truncate max-w-[140px]">${escapeHTML(npc.location)}</span>
            </div>
            ${npc.notes ? `<p class="mt-1.5 text-[11px] text-amber-200/90 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-1 italic line-clamp-2">"${escapeHTML(npc.notes)}"</p>` : ''}
        </div>
    `).join('');
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

function populateTopFilterDropdowns() {
    const spSelect = document.getElementById('filter-species');
    if (!spSelect) return;
    const currentSp = spSelect.value || "ANY";
    spSelect.innerHTML = `<option value="ANY" class="bg-ledger-900">Any Species</option>` +
        Object.keys(SPECIES_DATA).map(s => `<option value="${escapeHTML(s)}" class="bg-ledger-900">${escapeHTML(s)}</option>`).join('');
    spSelect.value = currentSp;

    const facSelect = document.getElementById('filter-faction');
    const currentFac = facSelect.value || "ANY";
    const factions = getActiveFactionsPool();
    facSelect.innerHTML = `<option value="ANY" class="bg-ledger-900">Any Faction</option>` +
        factions.map(f => `<option value="${escapeHTML(f)}" class="bg-ledger-900">${escapeHTML(f)}</option>`).join('');
    facSelect.value = factions.includes(currentFac) ? currentFac : "ANY";

    const locSelect = document.getElementById('filter-location');
    const currentLoc = locSelect.value || "ANY";
    const locations = getActiveLocationsPool();
    locSelect.innerHTML = `<option value="ANY" class="bg-ledger-900">Any Location</option>` +
        locations.map(l => `<option value="${escapeHTML(l)}" class="bg-ledger-900">${escapeHTML(l)}</option>`).join('');
    locSelect.value = locations.includes(currentLoc) ? currentLoc : "ANY";
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

    renderTimersListModal();
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

function renderShopInventory() {
    const shop = appState.currentShop;
    const container = document.getElementById('shop-inventory-list');
    const titleEl = document.getElementById('shop-inventory-title');
    const descEl = document.getElementById('shop-inventory-desc');

    if (!container || !shop) return;

    if (titleEl) titleEl.innerText = shop.name;
    if (descEl) descEl.innerText = `${shop.desc} • Price Multiplier: ${Math.round(shop.multiplier * 100)}% (${shop.tier.toUpperCase()})`;

    container.innerHTML = shop.items.map(item => `
        <div class="trait-card rounded-xl p-3 flex flex-col justify-between space-y-1.5">
            <div class="flex items-start justify-between gap-2">
                <div>
                    <h4 class="font-bold text-xs sm:text-sm text-slate-100">${escapeHTML(item.name)}</h4>
                    <span class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-ledger-900 border border-ledger-700 text-sky-300">${escapeHTML(item.type)}</span>
                </div>
                <div class="text-right">
                    <span class="font-mono font-bold text-xs sm:text-sm text-amber-300">${item.finalCost} ${item.unit}</span>
                    <span class="text-[10px] text-slate-400 block">Stock: ${item.qty}</span>
                </div>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug pt-1 border-t border-ledger-800/80">${escapeHTML(item.desc)}</p>
        </div>
    `).join('');
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
            <div class="p-6 text-center text-slate-500 text-xs italic">
                No monsters match your filters.
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

function switchWorldSubtab(subtab) {
    appState.worldActiveSubtab = subtab;
    document.querySelectorAll('.world-panel').forEach(p => p.classList.add('hidden'));
    document.querySelectorAll('.world-subtab-btn').forEach(btn => {
        btn.classList.remove('bg-amber-500', 'text-ledger-950');
        btn.classList.add('text-slate-400');
    });

    const activePanel = document.getElementById(`world-panel-${subtab}`);
    const activeBtn = document.getElementById(`world-subtab-${subtab}`);
    if (activePanel) activePanel.classList.remove('hidden');
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-400');
        activeBtn.classList.add('bg-amber-500', 'text-ledger-950');
    }

    if (subtab === 'locations') renderLocations();
    else if (subtab === 'factions') renderFactions();
    else if (subtab === 'quests') renderQuests();
}

function renderWorldView() {
    switchWorldSubtab(appState.worldActiveSubtab || 'locations');
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
                                ${loc.factions.map(f => `<span class="px-1.5 py-0.5 rounded bg-ledger-950 border border-ledger-700 text-slate-300 font-mono text-[10px]">${escapeHTML(f)}</span>`).join('')}
                            </div>
                        </div>` : ''}

                    ${loc.notableNpcs && loc.notableNpcs.length > 0 ? `
                        <div>
                            <span class="text-slate-400 font-bold block mb-0.5">Notable Figures:</span>
                            <div class="flex flex-wrap gap-1">
                                ${loc.notableNpcs.map(n => `<span class="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px]">${escapeHTML(n)}</span>`).join('')}
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

function openAddLocationModal() {
    document.getElementById('loc-name-input').value = '';
    document.getElementById('loc-type-input').value = 'Settlement';
    document.getElementById('loc-danger-input').value = 'Low';
    document.getElementById('loc-summary-input').value = '';
    document.getElementById('loc-desc-input').value = '';
    document.getElementById('loc-factions-input').value = '';
    document.getElementById('loc-npcs-input').value = '';
    document.getElementById('loc-secrets-input').value = '';

    openModal('add-location-modal');
}

async function saveLocationFromModal() {
    const name = document.getElementById('loc-name-input')?.value.trim();
    const summary = document.getElementById('loc-summary-input')?.value.trim();
    if (!name || !summary) {
        showToast("Location Name and Summary are required.", "warning");
        return;
    }

    const parseComma = (text) => (text || '').split(',').map(s => s.trim()).filter(Boolean);

    const locObj = {
        name: name,
        type: document.getElementById('loc-type-input')?.value || 'Settlement',
        danger: document.getElementById('loc-danger-input')?.value || 'Low',
        summary: summary,
        description: document.getElementById('loc-desc-input')?.value.trim() || '',
        factions: parseComma(document.getElementById('loc-factions-input')?.value),
        notableNpcs: parseComma(document.getElementById('loc-npcs-input')?.value),
        secrets: document.getElementById('loc-secrets-input')?.value.trim() || '',
        tags: [document.getElementById('loc-type-input')?.value || 'Location']
    };

    try {
        const res = await fetch('/api/locations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(locObj)
        });
        if (res.ok) {
            const data = await res.json();
            if (data.locations) appState.locations = data.locations;
            closeModal('add-location-modal');
            showToast(`🗺️ Saved location: ${name}!`, "success");
            renderLocations();
        }
    } catch (e) {
        showToast("Error saving location.", "error");
    }
}

async function deleteLocation(id) {
    if (!confirm("Delete this location?")) return;
    try {
        const res = await fetch(`/api/locations/${id}`, { method: 'DELETE' });
        if (res.ok) {
            const data = await res.json();
            if (data.locations) appState.locations = data.locations;
            showToast("Location deleted.", "info");
            renderLocations();
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
            <div class="trait-card rounded-xl p-5 space-y-4">
                
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
                <div class="trait-card rounded-xl p-4 flex flex-col justify-between space-y-3 transition">
                    
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

function openAddQuestModal() {
    document.getElementById('quest-title-input').value = '';
    document.getElementById('quest-giver-input').value = '';
    document.getElementById('quest-location-input').value = '';
    document.getElementById('quest-reward-input').value = '';
    document.getElementById('quest-status-input').value = 'Active';
    document.getElementById('quest-summary-input').value = '';
    document.getElementById('quest-objectives-input').value = '';
    document.getElementById('quest-notes-input').value = '';

    openModal('add-quest-modal');
}

async function saveQuestFromModal() {
    const title = document.getElementById('quest-title-input')?.value.trim();
    if (!title) {
        showToast("Quest Title is required.", "warning");
        return;
    }

    const lines = (document.getElementById('quest-objectives-input')?.value || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const objectives = lines.map((text, i) => ({
        id: `obj-${i+1}-${Date.now()}`,
        text: text,
        completed: false
    }));

    const questObj = {
        title: title,
        giver: document.getElementById('quest-giver-input')?.value.trim() || '',
        location: document.getElementById('quest-location-input')?.value.trim() || '',
        reward: document.getElementById('quest-reward-input')?.value.trim() || '',
        status: document.getElementById('quest-status-input')?.value || 'Active',
        summary: document.getElementById('quest-summary-input')?.value.trim() || '',
        objectives: objectives,
        notes: document.getElementById('quest-notes-input')?.value.trim() || ''
    };

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

function openAddRumorModal() {
    document.getElementById('rumor-text-input').value = '';
    document.getElementById('rumor-source-input').value = '';
    document.getElementById('rumor-location-input').value = '';
    document.getElementById('rumor-veracity-input').value = 'Unverified';

    openModal('add-rumor-modal');
}

async function saveRumorFromModal() {
    const text = document.getElementById('rumor-text-input')?.value.trim();
    if (!text) {
        showToast("Rumor text is required.", "warning");
        return;
    }

    const rumorObj = {
        text: text,
        source: document.getElementById('rumor-source-input')?.value.trim() || '',
        location: document.getElementById('rumor-location-input')?.value.trim() || '',
        veracity: document.getElementById('rumor-veracity-input')?.value || 'Unverified',
        active: true
    };

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
            showToast("📜 Pinned new tavern rumor!", "success");
            renderRumors();
        }
    } catch (e) {
        showToast("Error pinning rumor.", "error");
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

// =============================================================================
// PHASE 4: IMMERSION, BROADCAST, PROCEDURAL AUDIO & BACKUP CONTROLLER
// =============================================================================

function openPlayerScreenWindow() {
    window.open('/player', 'ArcaneLedgerPlayer', 'width=1280,height=800,menubar=no,toolbar=no,location=no,status=no');
}

function openTabletopMapWindow() {
    window.open('/map', 'ArcaneLedgerTabletopMap', 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no');
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
            // Channel 2: Atmosphere Ace 25c
            if (preset.lighting.atmosphere) {
                const atm = preset.lighting.atmosphere;
                if (atm.brightness !== undefined) window.LightingEngine.setAtmosphereBrightness(atm.brightness);
                if (atm.cct !== undefined) window.LightingEngine.state.atmosphere.cct = atm.cct;
                if (atm.color) window.LightingEngine.setAtmosphereHex(atm.color);
                if (atm.effect) window.LightingEngine.setAtmosphereEffect(atm.effect);
            }
            window.LightingEngine.state.atmosphere.activePreset = presetId;
            window.LightingEngine.updateUI();
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
        container.innerHTML = `<div class="p-8 text-center text-slate-500 text-xs italic">No spells found matching filters.</div>`;
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
    const payload = {
        title: s.name,
        subtitle: `${s.level === 0 ? 'Cantrip' : 'Level ' + s.level} ${s.school} • ${s.casting_time}`,
        content: `${s.description}\n\n${s.at_higher_levels ? 'At Higher Levels: ' + s.at_higher_levels : ''}`,
        type: 'lore'
    };
    try {
        const res = await fetch('/api/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            appState.broadcast = payload;
            renderBroadcastPill();
            showToast(`📺 Broadcasted "${s.name}" to player display!`, "success");
        }
    } catch (e) {
        showToast("Error broadcasting spell", "error");
    }
}

function broadcastCurrentModalSpell() {
    if (window._modalSpellId) broadcastSpellCard(window._modalSpellId);
}

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
                const baseText = tooltip.textContent.replace(/Alt\+[0-9M,]|Ctrl\+\S+|Shift\+\S+|\S+$/g, '').trim();
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

// Render Settings View
function renderSettingsView() {
    loadArcaneSettings();
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

window.onload = async function() {
    initSidebarState();
    loadArcaneSettings();
    updateSidebarKeybindTooltips();
    await fetchFullState();
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
    generateShop();
    renderBroadcastPill();
    if (window.LightingEngine) window.LightingEngine.init();
};

