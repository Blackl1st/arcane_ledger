/**
 * ARCANE LEDGER — Node-Based Dungeon & Pointcrawl Navigator
 * ==========================================================
 * Interactive dungeon flowcharts, chamber dossiers, read-aloud broadcasts,
 * secrets/traps, direct encounter launches, party token tracking, and fog of war.
 */

window.DungeonController = (function() {
    'use strict';

    let dungeons = [];
    let activeDungeon = null;
    let activeLevelId = 'all';
    let selectedNodeId = null;

    // Viewport transform for graph canvas
    let zoomLevel = 1.0;
    let panX = 40;
    let panY = 40;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;

    async function init() {
        await loadDungeons();
        setupGraphInteraction();
    }

    async function loadDungeons() {
        try {
            const res = await fetch('/api/dungeons');
            if (!res.ok) return;
            const data = await res.json();
            dungeons = data.dungeons || [];
            const activeId = data.activeDungeonId;
            activeDungeon = dungeons.find(d => d.id === activeId) || dungeons[0] || null;
            
            if (activeDungeon) {
                activeLevelId = (activeDungeon.levels && activeDungeon.levels[0]) ? activeDungeon.levels[0].id : 'all';
                selectedNodeId = activeDungeon.activeChamberId || (activeDungeon.nodes && activeDungeon.nodes[0] ? activeDungeon.nodes[0].id : null);
            }

            renderDungeonDropdown();
            renderLevelPills();
            renderGraph();
            renderActiveChamberDossier();
        } catch (err) {
            console.error("Error loading dungeons:", err);
        }
    }

    function setupGraphInteraction() {
        const svgContainer = document.getElementById('dungeon-graph-viewport');
        if (!svgContainer) return;

        svgContainer.addEventListener('mousedown', (e) => {
            if (e.target.closest('.dungeon-node-g')) return; // handled by node click
            isPanning = true;
            panStartX = e.clientX - panX;
            panStartY = e.clientY - panY;
            svgContainer.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            panX = e.clientX - panStartX;
            panY = e.clientY - panStartY;
            applyTransform();
        });

        window.addEventListener('mouseup', () => {
            if (isPanning) {
                isPanning = false;
                if (svgContainer) svgContainer.style.cursor = 'grab';
            }
        });

        svgContainer.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
            zoomLevel = Math.max(0.35, Math.min(2.5, zoomLevel * zoomFactor));
            applyTransform();
            updateZoomReadout();
        }, { passive: false });
    }

    function applyTransform() {
        const g = document.getElementById('dungeon-graph-world');
        if (g) {
            g.setAttribute('transform', `translate(${panX}, ${panY}) scale(${zoomLevel})`);
        }
    }

    function zoomIn() {
        zoomLevel = Math.min(2.5, zoomLevel * 1.2);
        applyTransform();
        updateZoomReadout();
    }

    function zoomOut() {
        zoomLevel = Math.max(0.35, zoomLevel / 1.2);
        applyTransform();
        updateZoomReadout();
    }

    function resetView() {
        zoomLevel = 1.0;
        panX = 40;
        panY = 40;
        applyTransform();
        updateZoomReadout();
    }

    function updateZoomReadout() {
        const el = document.getElementById('dungeon-zoom-readout');
        if (el) el.textContent = `${Math.round(zoomLevel * 100)}%`;
    }

    function centerOnParty() {
        if (!activeDungeon) return;
        const partyNode = (activeDungeon.nodes || []).find(n => n.id === activeDungeon.activeChamberId);
        if (!partyNode) return;
        
        const container = document.getElementById('dungeon-graph-viewport');
        const rect = container ? container.getBoundingClientRect() : { width: 700, height: 500 };
        zoomLevel = 1.0;
        panX = (rect.width / 2) - partyNode.x;
        panY = (rect.height / 2) - partyNode.y;
        applyTransform();
        updateZoomReadout();
        selectNode(partyNode.id);
    }

    function renderDungeonDropdown() {
        const select = document.getElementById('dungeon-select-dropdown');
        if (!select) return;
        select.innerHTML = dungeons.map(d => `
            <option value="${d.id}" ${activeDungeon && activeDungeon.id === d.id ? 'selected' : ''}>
                ${d.name} (${d.nodes ? d.nodes.length : 0} Chambers)
            </option>
        `).join('');
    }

    async function onDungeonSelect(dungeonId) {
        try {
            const res = await fetch('/api/dungeons/active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dungeonId })
            });
            if (res.ok) {
                activeDungeon = dungeons.find(d => d.id === dungeonId) || null;
                if (activeDungeon) {
                    activeLevelId = (activeDungeon.levels && activeDungeon.levels[0]) ? activeDungeon.levels[0].id : 'all';
                    selectedNodeId = activeDungeon.activeChamberId || (activeDungeon.nodes && activeDungeon.nodes[0] ? activeDungeon.nodes[0].id : null);
                }
                renderLevelPills();
                resetView();
                renderGraph();
                renderActiveChamberDossier();
            }
        } catch (err) {
            console.error("Error setting active dungeon:", err);
        }
    }

    function renderLevelPills() {
        const container = document.getElementById('dungeon-level-pills');
        if (!container || !activeDungeon) return;

        const levels = activeDungeon.levels || [];
        container.innerHTML = levels.map(lvl => {
            const isActive = lvl.id === activeLevelId;
            return `
                <button onclick="window.DungeonController.filterLevel('${lvl.id}')"
                    class="px-2.5 py-1 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                        isActive
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                            : 'bg-ledger-900 text-slate-400 hover:text-slate-200 border border-ledger-750'
                    }">
                    <span>${lvl.name}</span>
                </button>
            `;
        }).join('');
    }

    function filterLevel(levelId) {
        activeLevelId = levelId;
        renderLevelPills();
        renderGraph();
    }

    function selectNode(nodeId) {
        selectedNodeId = nodeId;
        renderGraph();
        renderActiveChamberDossier();
    }

    async function movePartyToNode(nodeId) {
        if (!activeDungeon) return;
        try {
            const res = await fetch('/api/dungeons/move-party', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dungeonId: activeDungeon.id, nodeId })
            });
            if (res.ok) {
                const data = await res.json();
                activeDungeon = data.dungeon;
                const idx = dungeons.findIndex(d => d.id === activeDungeon.id);
                if (idx >= 0) dungeons[idx] = activeDungeon;
                selectedNodeId = nodeId;

                renderGraph();
                renderActiveChamberDossier();

                if (window.showToast) {
                    const node = (activeDungeon.nodes || []).find(n => n.id === nodeId);
                    const name = node ? `${node.code || ''} ${node.name || ''}`.trim() : 'New Chamber';
                    window.showToast(`Party moved to ${name}!`, "success");
                }
            }
        } catch (err) {
            console.error("Error moving party:", err);
        }
    }

    async function setNodeState(nodeId, state) {
        if (!activeDungeon) return;
        try {
            const res = await fetch('/api/dungeons/node-state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dungeonId: activeDungeon.id, nodeId, state })
            });
            if (res.ok) {
                const data = await res.json();
                activeDungeon = data.dungeon;
                const idx = dungeons.findIndex(d => d.id === activeDungeon.id);
                if (idx >= 0) dungeons[idx] = activeDungeon;
                renderGraph();
                renderActiveChamberDossier();
            }
        } catch (err) {
            console.error("Error updating node state:", err);
        }
    }

    async function resetFog() {
        if (!activeDungeon) return;
        if (!confirm(`Reset fog of war for ${activeDungeon.name}? All rooms except the party chamber will be veiled.`)) return;
        try {
            const res = await fetch('/api/dungeons/reset-fog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dungeonId: activeDungeon.id })
            });
            if (res.ok) {
                const data = await res.json();
                activeDungeon = data.dungeon;
                const idx = dungeons.findIndex(d => d.id === activeDungeon.id);
                if (idx >= 0) dungeons[idx] = activeDungeon;
                renderGraph();
                renderActiveChamberDossier();
                if (window.showToast) window.showToast("Dungeon fog of war reset to unexplored.", "info");
            }
        } catch (err) {
            console.error("Error resetting fog:", err);
        }
    }

    async function revealAll() {
        if (!activeDungeon) return;
        if (!confirm(`Reveal all chambers in ${activeDungeon.name}? All veiled nodes will be marked explored.`)) return;
        try {
            const res = await fetch('/api/dungeons/reveal-all', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dungeonId: activeDungeon.id })
            });
            if (res.ok) {
                const data = await res.json();
                activeDungeon = data.dungeon;
                const idx = dungeons.findIndex(d => d.id === activeDungeon.id);
                if (idx >= 0) dungeons[idx] = activeDungeon;
                renderGraph();
                renderActiveChamberDossier();
                if (window.showToast) window.showToast("All dungeon chambers revealed!", "success");
            }
        } catch (err) {
            console.error("Error revealing dungeon:", err);
        }
    }

    async function broadcastChamber(nodeId) {
        if (!activeDungeon) return;
        try {
            const res = await fetch('/api/dungeons/broadcast-room', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dungeonId: activeDungeon.id, nodeId })
            });
            if (res.ok) {
                if (window.showToast) {
                    window.showToast("Chamber narration broadcasted to player display & mobile companion!", "success");
                }
            }
        } catch (err) {
            console.error("Error broadcasting chamber:", err);
            if (window.showToast) window.showToast("Failed to broadcast chamber text", "error");
        }
    }

    function launchChamberEncounter(encounterId) {
        if (!encounterId) return;
        // Direct jump to encounter builder or combat
        if (typeof switchTab === 'function') {
            switchTab('encounters');
            setTimeout(() => {
                const btn = document.querySelector(`button[onclick*="${encounterId}"]`);
                if (btn) btn.click();
                if (window.showToast) window.showToast("Chamber encounter loaded in Encounter Builder!", "success");
            }, 100);
        }
    }

    function renderGraph() {
        const svgWorld = document.getElementById('dungeon-graph-world');
        if (!svgWorld || !activeDungeon) return;

        const allNodes = activeDungeon.nodes || [];
        const isAll = !activeLevelId || activeLevelId === 'all' || activeLevelId.includes('-all');

        // Filter nodes by level if specific level selected
        const visibleNodes = isAll ? allNodes : allNodes.filter(n => n.level === activeLevelId);
        const nodeMap = new Map();
        visibleNodes.forEach(n => nodeMap.set(n.id, n));

        // Generate Edge Lines
        const edgesSVG = [];
        const drawnPairs = new Set();

        allNodes.forEach(source => {
            if (!nodeMap.has(source.id)) return;
            (source.exits || []).forEach(exit => {
                const target = nodeMap.get(exit.target);
                if (!target) return; // connected node is in another level or not found
                
                const pairKey = [source.id, target.id].sort().join('--');
                if (drawnPairs.has(pairKey)) return;
                drawnPairs.add(pairKey);

                // Coordinates
                const x1 = source.x + 80;
                const y1 = source.y + 35;
                const x2 = target.x + 80;
                const y2 = target.y + 35;

                const isSecret = exit.type === 'secret' || exit.state === 'secret';
                const isStairs = exit.type === 'stairs';
                const strokeColor = isSecret ? '#a855f7' : (isStairs ? '#38bdf8' : '#64748b');
                const strokeDash = isSecret ? 'stroke-dasharray="6,4"' : '';
                const strokeWidth = isSecret ? '2.5' : '2';

                // Midpoint for icon badge
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                let badgeIcon = '';
                if (isSecret) badgeIcon = '👁️';
                else if (isStairs) badgeIcon = '🪜';
                else if (exit.state === 'locked') badgeIcon = '🔒';

                edgesSVG.push(`
                    <g class="dungeon-edge-g">
                        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeWidth}" ${strokeDash} opacity="0.75" />
                        ${badgeIcon ? `
                            <circle cx="${midX}" cy="${midY}" r="10" fill="#0d1117" stroke="${strokeColor}" stroke-width="1.5" />
                            <text x="${midX}" y="${midY + 3.5}" text-anchor="middle" font-size="10">${badgeIcon}</text>
                        ` : ''}
                    </g>
                `);
            });
        });

        // Generate Node Cards
        const nodesSVG = visibleNodes.map(node => {
            const isPartyHere = node.id === activeDungeon.activeChamberId;
            const isSelected = node.id === selectedNodeId;
            const state = node.state || 'unexplored';
            const isExplored = state === 'explored' || state === 'active' || state === 'cleared';
            const isCleared = state === 'cleared';

            // Styling classes
            let borderColor = '#334155';
            let bgColor = '#0f172a';
            let titleColor = '#94a3b8';
            let pulseClass = '';

            if (isPartyHere) {
                borderColor = '#f59e0b';
                bgColor = '#1e1406';
                titleColor = '#fef08a';
                pulseClass = 'animate-pulse';
            } else if (isCleared) {
                borderColor = '#10b981';
                bgColor = '#062016';
                titleColor = '#6ee7b7';
            } else if (isExplored) {
                borderColor = '#38bdf8';
                bgColor = '#0c1a2e';
                titleColor = '#e2e8f0';
            } else {
                // Unexplored (Fog of war)
                borderColor = '#1e293b';
                bgColor = '#080d14';
                titleColor = '#475569';
            }

            const codeText = node.code || '';
            const nameText = isExplored ? (node.name || 'Chamber') : 'Veiled Chamber';
            const truncatedName = nameText.length > 20 ? nameText.substring(0, 18) + '...' : nameText;

            // Danger indicator if encounters or traps exist
            const hasDanger = (node.encounters && node.encounters.length > 0) || (node.traps && node.traps.length > 0);

            return `
                <g class="dungeon-node-g cursor-pointer tap-active"
                    transform="translate(${node.x}, ${node.y})"
                    onclick="window.DungeonController.selectNode('${node.id}')"
                    ondblclick="window.DungeonController.movePartyToNode('${node.id}')">
                    
                    <!-- Selection / Glow Halo -->
                    ${isSelected ? `
                        <rect x="-4" y="-4" width="168" height="78" rx="18" fill="none" stroke="#f59e0b" stroke-width="2.5" opacity="0.9" />
                    ` : ''}

                    <!-- Main Node Card Box -->
                    <rect x="0" y="0" width="160" height="70" rx="14" fill="${bgColor}" stroke="${borderColor}" stroke-width="${isPartyHere ? 2.5 : 1.5}" class="${isPartyHere ? pulseClass : ''}" filter="drop-shadow(0 6px 12px rgba(0,0,0,0.6))" />

                    <!-- Header Bar / Room Code -->
                    <text x="12" y="24" fill="${isPartyHere ? '#fbbf24' : '#64748b'}" font-family="JetBrains Mono, monospace" font-size="11" font-weight="bold">${codeText}</text>

                    <!-- Status Badges -->
                    ${isPartyHere ? `
                        <g transform="translate(100, 11)">
                            <rect x="0" y="0" width="48" height="16" rx="8" fill="#d97706" />
                            <text x="24" y="11.5" text-anchor="middle" font-family="sans-serif" font-size="9" font-weight="bold" fill="#000">⚔️ PARTY</text>
                        </g>
                    ` : (isCleared ? `
                        <text x="145" y="23" text-anchor="end" font-size="12">🛡️</text>
                    ` : (hasDanger && isExplored ? `
                        <text x="145" y="23" text-anchor="end" font-size="12">⚠️</text>
                    ` : (!isExplored ? `
                        <text x="145" y="23" text-anchor="end" font-size="12">🌫️</text>
                    ` : '')))}

                    <!-- Chamber Title -->
                    <text x="12" y="46" fill="${titleColor}" font-family="Cinzel, serif" font-size="11" font-weight="bold">${truncatedName}</text>

                    <!-- Subtext Features summary -->
                    <text x="12" y="60" fill="#64748b" font-family="sans-serif" font-size="9">
                        ${!isExplored ? 'Awaiting Discovery' : (isCleared ? 'Secured & Looted' : (hasDanger ? 'Threats Lurking' : 'Empty / Navigable'))}
                    </text>
                </g>
            `;
        }).join('');

        svgWorld.innerHTML = `
            ${edgesSVG.join('')}
            ${nodesSVG}
        `;
    }

    function renderActiveChamberDossier() {
        const container = document.getElementById('dungeon-chamber-dossier');
        if (!container || !activeDungeon) return;

        const nodes = activeDungeon.nodes || [];
        const node = nodes.find(n => n.id === selectedNodeId) || nodes[0];
        if (!node) {
            container.innerHTML = `<div class="p-6 text-center text-slate-500 font-mono text-xs">No chamber selected.</div>`;
            return;
        }

        const isPartyHere = node.id === activeDungeon.activeChamberId;
        const levelObj = (activeDungeon.levels || []).find(l => l.id === node.level);
        const levelName = levelObj ? levelObj.name : 'Chamber';

        const state = node.state || 'unexplored';
        const isExplored = state === 'explored' || state === 'active' || state === 'cleared';
        const isCleared = state === 'cleared';

        container.innerHTML = `
            <div class="space-y-4">
                <!-- CHAMBER HEADER & STATUS BAR -->
                <div class="p-4 rounded-2xl bg-ledger-900 border border-ledger-750 shadow-lg space-y-3">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    ${node.code || 'Room'}
                                </span>
                                <span class="text-xs text-slate-400 font-mono">${levelName}</span>
                                ${isPartyHere ? `
                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-ledger-950 flex items-center gap-1 shadow-sm">
                                        <span>⚔️</span> <span>Party Present</span>
                                    </span>
                                ` : ''}
                            </div>
                            <h2 class="font-display font-bold text-lg text-amber-200 mt-1">${node.name || 'Unnamed Chamber'}</h2>
                        </div>

                        <!-- State Dropdown -->
                        <div class="flex items-center gap-1.5 shrink-0">
                            <select onchange="window.DungeonController.setNodeState('${node.id}', this.value)"
                                class="bg-ledger-950 border border-ledger-700 text-slate-300 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold focus:outline-none focus:border-amber-500">
                                <option value="unexplored" ${state === 'unexplored' ? 'selected' : ''}>🌫️ Veiled</option>
                                <option value="explored" ${state === 'explored' ? 'selected' : ''}>👁️ Explored</option>
                                <option value="active" ${state === 'active' ? 'selected' : ''}>🌟 Active</option>
                                <option value="cleared" ${state === 'cleared' ? 'selected' : ''}>🛡️ Cleared</option>
                            </select>
                        </div>
                    </div>

                    <!-- QUICK ACTION BUTTONS -->
                    <div class="flex flex-wrap items-center gap-2 pt-1 border-t border-ledger-800">
                        ${!isPartyHere ? `
                            <button onclick="window.DungeonController.movePartyToNode('${node.id}')"
                                class="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-ledger-950 font-bold text-xs flex items-center gap-1.5 shadow transition tap-active">
                                <span>🚀</span> <span>Move Party Here</span>
                            </button>
                        ` : ''}

                        <button onclick="window.DungeonController.broadcastChamber('${node.id}')"
                            class="px-3 py-1.5 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-200 text-xs font-bold flex items-center gap-1.5 shadow transition tap-active"
                            title="Broadcast read-aloud boxed text to Tabletop screen and Companion App">
                            <span>📢</span> <span>Broadcast to Table</span>
                        </button>

                        <button onclick="window.DungeonController.setNodeState('${node.id}', '${isCleared ? 'explored' : 'cleared'}')"
                            class="px-2.5 py-1.5 rounded-xl bg-ledger-800 hover:bg-slate-700 text-slate-300 border border-ledger-700 text-xs font-semibold flex items-center gap-1 transition tap-active">
                            <span>${isCleared ? '↩️' : '🛡️'}</span> <span>${isCleared ? 'Unclear' : 'Mark Cleared'}</span>
                        </button>

                        <button onclick="window.DungeonController.openEditChamberModal('${node.id}')"
                            class="px-2.5 py-1.5 rounded-xl bg-ledger-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-ledger-700 text-xs font-semibold flex items-center gap-1 transition ml-auto"
                            title="Edit chamber notes, traps, and secrets">
                            <span>✏️</span> <span>Edit</span>
                        </button>
                    </div>
                </div>

                <!-- BOXED TEXT (READ-ALOUD FLAVOR) -->
                ${node.boxedText ? `
                    <div class="p-4 rounded-2xl bg-gradient-to-br from-amber-950/20 via-ledger-900 to-ledger-900 border border-amber-500/30 shadow-lg space-y-2 relative overflow-hidden">
                        <div class="flex items-center justify-between">
                            <span class="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                <span>📜</span> <span>Boxed Text (Read Aloud)</span>
                            </span>
                            <div class="flex items-center gap-1.5">
                                <button onclick="navigator.clipboard.writeText(${JSON.stringify(node.boxedText)}); window.showToast('Boxed text copied!', 'info');"
                                    class="text-slate-400 hover:text-amber-300 text-xs p-1" title="Copy Text">
                                    📋
                                </button>
                                <button onclick="window.DungeonController.speakBoxedText(${JSON.stringify(node.boxedText)})"
                                    class="text-slate-400 hover:text-amber-300 text-xs p-1" title="Read Aloud via Text-To-Speech">
                                    🔊
                                </button>
                            </div>
                        </div>
                        <p class="font-serif italic text-sm text-slate-200 leading-relaxed pl-2 border-l-2 border-amber-500/50">
                            "${node.boxedText}"
                        </p>
                    </div>
                ` : ''}

                <!-- SENSES, LIGHTING & ATMOSPHERE -->
                <div class="p-3.5 rounded-xl bg-ledger-900/80 border border-ledger-800 space-y-2">
                    <h4 class="font-mono text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                        <span>🕯️</span> <span>Environment & Atmosphere</span>
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        <div class="bg-ledger-950/60 p-2 rounded-lg border border-ledger-800/80">
                            <span class="text-[10px] text-slate-500 block uppercase font-mono">Lighting</span>
                            <span class="text-slate-300">${node.lighting || 'Unspecified'}</span>
                        </div>
                        <div class="bg-ledger-950/60 p-2 rounded-lg border border-ledger-800/80">
                            <span class="text-[10px] text-slate-500 block uppercase font-mono">Acoustics & Scent</span>
                            <span class="text-slate-300">${node.atmosphere || 'Silent and still'}</span>
                        </div>
                    </div>
                </div>

                <!-- KEY FEATURES LIST -->
                ${node.features && node.features.length > 0 ? `
                    <div class="p-3.5 rounded-xl bg-ledger-900/80 border border-ledger-800 space-y-2">
                        <h4 class="font-mono text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                            <span>🔍</span> <span>Chamber Features</span>
                        </h4>
                        <ul class="space-y-1.5 text-xs text-slate-300">
                            ${node.features.map(f => `
                                <li class="flex items-start gap-2">
                                    <span class="text-amber-400 mt-0.5">•</span>
                                    <span>${f}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                ` : ''}

                <!-- SECRETS & TRAPS (DM EYES ONLY) -->
                ${((node.secrets && node.secrets.length > 0) || (node.traps && node.traps.length > 0)) ? `
                    <div class="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/50 space-y-2.5">
                        <h4 class="font-mono text-[11px] font-bold uppercase text-rose-300 flex items-center gap-1.5">
                            <span>🔒</span> <span>Secrets & Traps (DM Eyes Only)</span>
                        </h4>
                        <div class="space-y-2">
                            ${(node.secrets || []).map(s => `
                                <div class="p-2.5 rounded-lg bg-ledger-950/80 border border-rose-900/40 text-xs space-y-1">
                                    <div class="flex items-center gap-1.5">
                                        <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                            DC ${s.dc} ${s.skill || 'Perception'}
                                        </span>
                                        <span class="font-bold text-slate-300">Hidden Secret</span>
                                    </div>
                                    <p class="text-slate-300 text-[11px] leading-relaxed">${s.text}</p>
                                </div>
                            `).join('')}

                            ${(node.traps || []).map(t => `
                                <div class="p-2.5 rounded-lg bg-ledger-950/80 border border-red-900/40 text-xs space-y-1">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-1.5">
                                            <span class="text-red-400 font-bold">⚡ ${t.name || 'Hazard'}</span>
                                            <span class="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                                DC ${t.dc || 15}
                                            </span>
                                        </div>
                                    </div>
                                    <p class="text-slate-400 text-[11px]"><strong>Trigger:</strong> ${t.trigger || ''}</p>
                                    <p class="text-red-300/90 text-[11px]"><strong>Effect:</strong> ${t.effect || ''}</p>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- ENCOUNTERS & COMBATANTS -->
                ${node.encounters && node.encounters.length > 0 ? `
                    <div class="p-3.5 rounded-xl bg-ledger-900/80 border border-ledger-800 space-y-2">
                        <h4 class="font-mono text-[11px] font-bold uppercase text-red-400 flex items-center gap-1.5">
                            <span>⚔️</span> <span>Chamber Encounters</span>
                        </h4>
                        <div class="space-y-2">
                            ${node.encounters.map(enc => `
                                <div class="p-3 rounded-lg bg-ledger-950 border border-ledger-750 flex items-center justify-between gap-3">
                                    <div>
                                        <h5 class="font-display font-bold text-xs text-slate-200">${enc.name}</h5>
                                        <div class="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-slate-400">
                                            <span>CR ${enc.cr || '1'}</span>
                                            <span>•</span>
                                            <span>${(enc.monsters || []).map(m => `${m.name} (${m.hp} HP)`).join(', ')}</span>
                                        </div>
                                    </div>
                                    <button onclick="window.DungeonController.launchChamberEncounter('${enc.id}')"
                                        class="px-2.5 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700/60 font-bold text-xs flex items-center gap-1 shadow transition shrink-0 tap-active"
                                        title="Direct launch into Combat Tracker">
                                        <span>⚔️</span> <span>Launch</span>
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- LOOT & TREASURES -->
                ${node.loot && node.loot.length > 0 ? `
                    <div class="p-3.5 rounded-xl bg-ledger-900/80 border border-ledger-800 space-y-2">
                        <h4 class="font-mono text-[11px] font-bold uppercase text-amber-400 flex items-center gap-1.5">
                            <span>🪙</span> <span>Loot & Curiosities</span>
                        </h4>
                        <div class="space-y-1.5">
                            ${node.loot.map(item => `
                                <div class="p-2 rounded-lg bg-ledger-950/80 border border-ledger-800 flex items-center justify-between text-xs">
                                    <div>
                                        <span class="font-bold text-slate-200">${item.name}</span>
                                        ${item.quantity ? `<span class="text-amber-400 font-mono text-[10px] ml-1.5">(${item.quantity})</span>` : ''}
                                        ${item.notes ? `<p class="text-[11px] text-slate-400">${item.notes}</p>` : ''}
                                    </div>
                                    <button onclick="window.DungeonController.addItemToPartyStash(${JSON.stringify(item.name)})"
                                        class="px-2 py-1 rounded bg-ledger-800 hover:bg-slate-700 text-amber-300 text-[10px] font-mono transition"
                                        title="Transfer to Party Stash">
                                        + Stash
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}

                <!-- NAVIGABLE EXITS -->
                <div class="p-3.5 rounded-xl bg-ledger-900/80 border border-ledger-800 space-y-2">
                    <h4 class="font-mono text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                        <span>🚪</span> <span>Navigable Exits</span>
                    </h4>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        ${(node.exits || []).map(exit => {
                            const targetNode = nodes.find(n => n.id === exit.target);
                            const targetName = targetNode ? `${targetNode.code || ''} ${targetNode.name || ''}`.trim() : exit.label || 'Connected Hall';
                            const isDoor = exit.type === 'door';
                            const isStairs = exit.type === 'stairs';
                            const isSecret = exit.type === 'secret' || exit.state === 'secret';
                            const icon = isSecret ? '👁️' : (isStairs ? '🪜' : '🚪');

                            return `
                                <div class="p-2.5 rounded-lg bg-ledger-950 border border-ledger-750 flex items-center justify-between gap-2">
                                    <div class="min-w-0">
                                        <div class="flex items-center gap-1.5 text-xs font-bold text-slate-300 truncate">
                                            <span>${icon}</span>
                                            <span class="truncate">${targetName}</span>
                                        </div>
                                        <span class="text-[10px] font-mono text-slate-500 uppercase">${exit.state || 'open'}</span>
                                    </div>
                                    <button onclick="window.DungeonController.movePartyToNode('${exit.target}')"
                                        class="px-2 py-1 rounded bg-ledger-800 hover:bg-amber-500 hover:text-ledger-950 text-slate-300 text-xs font-mono font-bold transition shrink-0 tap-active"
                                        title="Walk Party to this room">
                                        Walk →
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    function speakBoxedText(text) {
        if (!('speechSynthesis' in window)) {
            if (window.showToast) window.showToast("Speech synthesis not supported in this browser", "error");
            return;
        }
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.92;
        utterance.pitch = 0.95;
        window.speechSynthesis.speak(utterance);
        if (window.showToast) window.showToast("Reading chamber narration...", "info");
    }

    async function addItemToPartyStash(itemName) {
        try {
            const res = await fetch('/api/party-stash/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: itemName, quantity: 1 })
            });
            if (res.ok) {
                if (window.showToast) window.showToast(`"${itemName}" added to Party Stash!`, "success");
            }
        } catch (err) {
            console.error("Error adding to stash:", err);
            if (window.showToast) window.showToast(`Transferred "${itemName}" to notes`, "info");
        }
    }

    function exportDungeon() {
        if (!activeDungeon) return;
        const blob = new Blob([JSON.stringify(activeDungeon, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(activeDungeon.name || 'Dungeon').replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function triggerImportDungeon() {
        const input = document.getElementById('dungeon-import-file-input');
        if (input) input.click();
    }

    async function handleDungeonFileImport(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        try {
            const text = await file.text();
            const dungeon = JSON.parse(text);
            if (!dungeon.name || !dungeon.nodes) {
                alert("Invalid dungeon file format: missing name or nodes.");
                return;
            }
            const res = await fetch('/api/dungeons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dungeon)
            });
            if (res.ok) {
                await loadDungeons();
                if (window.showToast) window.showToast(`Imported dungeon "${dungeon.name}"!`, "success");
            }
        } catch (err) {
            console.error("Error importing dungeon:", err);
            alert("Failed to parse dungeon JSON file.");
        }
        event.target.value = '';
    }

    function openEditChamberModal(nodeId) {
        if (!activeDungeon) return;
        const node = (activeDungeon.nodes || []).find(n => n.id === nodeId);
        if (!node) return;

        document.getElementById('modal-edit-node-id').value = node.id;
        document.getElementById('modal-edit-node-code').value = node.code || '';
        document.getElementById('modal-edit-node-name').value = node.name || '';
        document.getElementById('modal-edit-node-boxed').value = node.boxedText || '';
        document.getElementById('modal-edit-node-lighting').value = node.lighting || '';
        document.getElementById('modal-edit-node-atmosphere').value = node.atmosphere || '';

        const modal = document.getElementById('modal-dungeon-edit-chamber');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    async function saveChamberModalEdits() {
        if (!activeDungeon) return;
        const nodeId = document.getElementById('modal-edit-node-id').value;
        const node = (activeDungeon.nodes || []).find(n => n.id === nodeId);
        if (!node) return;

        node.code = document.getElementById('modal-edit-node-code').value.trim();
        node.name = document.getElementById('modal-edit-node-name').value.trim();
        node.boxedText = document.getElementById('modal-edit-node-boxed').value.trim();
        node.lighting = document.getElementById('modal-edit-node-lighting').value.trim();
        node.atmosphere = document.getElementById('modal-edit-node-atmosphere').value.trim();

        try {
            const res = await fetch('/api/dungeons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activeDungeon)
            });
            if (res.ok) {
                closeModal('modal-dungeon-edit-chamber');
                renderGraph();
                renderActiveChamberDossier();
                if (window.showToast) window.showToast("Chamber dossier saved!", "success");
            }
        } catch (err) {
            console.error("Error saving chamber:", err);
        }
    }

    function openNewDungeonModal() {
        const modal = document.getElementById('modal-dungeon-create');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    async function saveNewDungeon() {
        const name = document.getElementById('modal-new-dungeon-name').value.trim();
        const subtitle = document.getElementById('modal-new-dungeon-sub').value.trim();
        const region = document.getElementById('modal-new-dungeon-region').value.trim();
        if (!name) {
            alert("Dungeon name is required.");
            return;
        }

        const newDungeon = {
            id: `dungeon-${Date.now()}`,
            name,
            subtitle: subtitle || 'Custom Dungeon Flowchart',
            region: region || 'Wilderness',
            description: 'Custom dungeon pointcrawl map.',
            activeChamberId: 'node-1',
            levels: [
                { id: 'lvl-all', name: 'All Floors' },
                { id: 'lvl-1', name: 'Level 1' }
            ],
            nodes: [
                {
                    id: 'node-1',
                    code: 'Room 1',
                    name: 'Entrance Vestibule',
                    level: 'lvl-1',
                    x: 160,
                    y: 160,
                    state: 'active',
                    boxedText: 'Heavy stone arches loom overhead as cold air rushes from the darkness beyond.',
                    lighting: 'Darkness',
                    atmosphere: 'Dripping water echoing in the silence.',
                    features: ['Heavy iron-bound reinforced doors.'],
                    secrets: [],
                    traps: [],
                    encounters: [],
                    loot: [],
                    exits: []
                }
            ]
        };

        try {
            const res = await fetch('/api/dungeons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newDungeon)
            });
            if (res.ok) {
                closeModal('modal-dungeon-create');
                await loadDungeons();
                onDungeonSelect(newDungeon.id);
                if (window.showToast) window.showToast(`Dungeon "${name}" created!`, "success");
            }
        } catch (err) {
            console.error("Error creating dungeon:", err);
        }
    }

    return {
        init,
        loadDungeons,
        onDungeonSelect,
        filterLevel,
        selectNode,
        movePartyToNode,
        setNodeState,
        resetFog,
        revealAll,
        broadcastChamber,
        launchChamberEncounter,
        speakBoxedText,
        addItemToPartyStash,
        exportDungeon,
        triggerImportDungeon,
        handleDungeonFileImport,
        openEditChamberModal,
        saveChamberModalEdits,
        openNewDungeonModal,
        saveNewDungeon,
        zoomIn,
        zoomOut,
        resetView,
        centerOnParty
    };
})();
