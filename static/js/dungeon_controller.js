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
                const realLevel = (activeDungeon.levels || []).find(l => l.id !== 'all' && !l.id.endsWith('-all'));
                const partyNode = (activeDungeon.nodes || []).find(n => n.id === activeDungeon.activeChamberId);
                activeLevelId = (partyNode && partyNode.level) ? partyNode.level : (realLevel ? realLevel.id : 'all');
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
                    const realLevel = (activeDungeon.levels || []).find(l => l.id !== 'all' && !l.id.endsWith('-all'));
                    const partyNode = (activeDungeon.nodes || []).find(n => n.id === activeDungeon.activeChamberId);
                    activeLevelId = (partyNode && partyNode.level) ? partyNode.level : (realLevel ? realLevel.id : 'all');
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
        }).join('') + `
            <button onclick="window.DungeonController.openAddFloorModal()"
                class="px-2.5 py-1 rounded-xl text-xs font-mono font-bold bg-ledger-800 hover:bg-slate-700 text-amber-400 border border-ledger-700 transition flex items-center gap-1 shadow-sm"
                title="Add a new floor/level to this dungeon">
                <span>+ Floor</span>
            </button>
        `;
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
                const data = await res.json();
                if (window.appState && data.broadcast) {
                    window.appState.broadcast = data.broadcast;
                }
                if (typeof window.renderBroadcastPill === 'function') {
                    window.renderBroadcastPill();
                }
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

        let enc = (window.appState && window.appState.encounters || []).find(e => e.id === encounterId);
        if (!enc && activeDungeon) {
            for (const n of (activeDungeon.nodes || [])) {
                const found = (n.encounters || []).find(e => e.id === encounterId);
                if (found) { enc = found; break; }
            }
        }

        if (window.appState && enc) {
            window.appState.stagedEncounter = (enc.monsters || []).map(m => {
                const monId = m.monsterId || m.id;
                const mon = (window.appState.monsters || []).find(x => x.id === monId || (x.name && m.name && x.name.toLowerCase() === m.name.toLowerCase()));
                return {
                    monsterId: mon ? mon.id : (monId || 'wolf'),
                    count: m.count || 1
                };
            });
        }

        if (typeof renderEncountersView === 'function') {
            renderEncountersView();
        }

        if (typeof switchTab === 'function') {
            switchTab('encounters');
        }

        if (window.showToast) {
            window.showToast(`Loaded "${enc ? enc.name : 'Chamber Encounter'}" into Encounter Builder!`, "success");
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

        // When "All Floors" is active, offset each floor horizontally so they NEVER stack!
        const realLevels = (activeDungeon.levels || []).filter(l => l.id !== 'all' && !l.id.endsWith('-all'));
        const levelIndexMap = new Map();
        realLevels.forEach((lvl, idx) => levelIndexMap.set(lvl.id, idx));

        const FLOOR_SPACING_X = 800;
        const FLOOR_HEADER_OFFSET_Y = 85;

        function getNodeRenderCoords(node) {
            if (!isAll) {
                return { x: node.x || 0, y: node.y || 0 };
            }
            const floorIdx = levelIndexMap.has(node.level) ? levelIndexMap.get(node.level) : 0;
            return {
                x: (node.x || 0) + (floorIdx * FLOOR_SPACING_X),
                y: (node.y || 0) + FLOOR_HEADER_OFFSET_Y
            };
        }

        // Floor Headers (when viewing All Floors)
        const floorHeadersSVG = [];
        if (isAll) {
            realLevels.forEach((lvl, idx) => {
                const floorX = idx * FLOOR_SPACING_X;
                const floorNodes = allNodes.filter(n => n.level === lvl.id);
                floorHeadersSVG.push(`
                    <g class="dungeon-floor-header" transform="translate(${floorX + 20}, 15)">
                        <rect x="0" y="0" width="720" height="52" rx="14" fill="#090d14" stroke="#334155" stroke-width="1.5" opacity="0.95" />
                        <rect x="0" y="0" width="6" height="52" rx="3" fill="#f59e0b" />
                        <text x="22" y="32" fill="#f59e0b" font-family="Cinzel, serif" font-size="16" font-weight="bold">${lvl.name}</text>
                        <text x="700" y="32" text-anchor="end" fill="#94a3b8" font-family="JetBrains Mono, monospace" font-size="11">${floorNodes.length} Chambers</text>
                    </g>
                `);
            });
        }

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

                // Coordinates with floor offset if in All Floors view
                const p1 = getNodeRenderCoords(source);
                const p2 = getNodeRenderCoords(target);
                const x1 = p1.x + 80;
                const y1 = p1.y + 35;
                const x2 = p2.x + 80;
                const y2 = p2.y + 35;

                const isSecret = exit.type === 'secret' || exit.state === 'secret';
                const isStairs = exit.type === 'stairs' || exit.type === 'ladder' || source.level !== target.level;
                const strokeColor = isSecret ? '#a855f7' : (isStairs ? '#38bdf8' : '#64748b');
                const strokeDash = isSecret ? 'stroke-dasharray="6,4"' : (isStairs ? 'stroke-dasharray="8,4"' : '');
                const strokeWidth = isSecret ? '2.5' : (isStairs ? '2.5' : '2');

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

            const pos = getNodeRenderCoords(node);

            return `
                <g class="dungeon-node-g cursor-pointer tap-active"
                    transform="translate(${pos.x}, ${pos.y})"
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
            ${floorHeadersSVG.join('')}
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
                                            <span>${(enc.monsters || []).map(m => `${m.count && m.count > 1 ? `${m.count}x ` : ''}${m.name} (${m.hp || 20} HP)`).join(', ')}</span>
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

    let modalChamberData = null;

    function openAddFloorModal() {
        if (!activeDungeon) return;
        const floorName = prompt("Enter name for new floor/level (e.g. '5. Crypts' or 'Attic Belfry'):");
        if (!floorName || !floorName.trim()) return;

        const newLvl = {
            id: `lvl-${Date.now().toString(36)}`,
            name: floorName.trim()
        };
        if (!activeDungeon.levels) activeDungeon.levels = [];
        activeDungeon.levels.push(newLvl);
        activeLevelId = newLvl.id;

        saveDungeonToBackend("New floor created!", () => {
            renderLevelPills();
            renderGraph();
        });
    }

    function addNewChamber() {
        if (!activeDungeon) return;
        const currentLevel = (activeLevelId && activeLevelId !== 'all' && !activeLevelId.endsWith('-all'))
            ? activeLevelId
            : ((activeDungeon.levels && activeDungeon.levels.find(l => l.id !== 'all' && !l.id.endsWith('-all')))?.id || 'lvl-1');

        const allNodes = activeDungeon.nodes || [];
        const floorNodes = allNodes.filter(n => n.level === currentLevel);
        const nextNum = allNodes.length + 1;

        let newX = 140;
        let newY = 140;
        if (floorNodes.length > 0) {
            const lastNode = floorNodes[floorNodes.length - 1];
            newX = (lastNode.x || 100) + 200;
            newY = lastNode.y || 140;
            if (newX > 650) {
                newX = 140;
                newY = (lastNode.y || 140) + 120;
            }
        }

        const newId = `node-${Date.now().toString(36)}`;
        const newNode = {
            id: newId,
            code: `Area ${nextNum}`,
            name: `Chamber ${nextNum}`,
            level: currentLevel,
            x: newX,
            y: newY,
            state: 'unexplored',
            boxedText: '',
            lighting: 'Darkness',
            atmosphere: 'Silent and still.',
            features: [],
            secrets: [],
            traps: [],
            encounters: [],
            loot: [],
            exits: []
        };

        if (!activeDungeon.nodes) activeDungeon.nodes = [];
        activeDungeon.nodes.push(newNode);
        selectedNodeId = newId;

        saveDungeonToBackend(`Created ${newNode.code}!`, () => {
            renderGraph();
            renderActiveChamberDossier();
            openEditChamberModal(newId);
        });
    }

    async function deleteChamber(nodeId) {
        if (!activeDungeon) return;
        const targetId = nodeId || (modalChamberData ? modalChamberData.id : selectedNodeId);
        const node = (activeDungeon.nodes || []).find(n => n.id === targetId);
        if (!node) return;

        if (!confirm(`Delete ${node.code || ''} ${node.name || 'chamber'}? All exits connected to it will also be removed.`)) return;

        activeDungeon.nodes = activeDungeon.nodes.filter(n => n.id !== targetId);
        activeDungeon.nodes.forEach(n => {
            if (n.exits) {
                n.exits = n.exits.filter(e => e.target !== targetId);
            }
        });

        if (activeDungeon.activeChamberId === targetId) {
            activeDungeon.activeChamberId = activeDungeon.nodes[0] ? activeDungeon.nodes[0].id : null;
        }
        selectedNodeId = activeDungeon.nodes[0] ? activeDungeon.nodes[0].id : null;

        if (typeof closeModal === 'function') closeModal('modal-dungeon-edit-chamber');

        saveDungeonToBackend("Chamber deleted.", () => {
            renderGraph();
            renderActiveChamberDossier();
        });
    }

    async function saveDungeonToBackend(toastMsg, callback) {
        try {
            const res = await fetch('/api/dungeons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(activeDungeon)
            });
            if (res.ok) {
                const idx = dungeons.findIndex(d => d.id === activeDungeon.id);
                if (idx >= 0) dungeons[idx] = activeDungeon;
                if (callback) callback();
                if (toastMsg && window.showToast) window.showToast(toastMsg, "success");
            }
        } catch (err) {
            console.error("Error saving dungeon:", err);
            if (window.showToast) window.showToast("Error saving dungeon changes", "error");
        }
    }

    function openEditChamberModal(nodeId) {
        if (!activeDungeon) return;
        const node = (activeDungeon.nodes || []).find(n => n.id === nodeId);
        if (!node) return;

        modalChamberData = JSON.parse(JSON.stringify(node));
        if (!modalChamberData.exits) modalChamberData.exits = [];
        if (!modalChamberData.features) modalChamberData.features = [];
        if (!modalChamberData.secrets) modalChamberData.secrets = [];
        if (!modalChamberData.traps) modalChamberData.traps = [];
        if (!modalChamberData.loot) modalChamberData.loot = [];
        if (!modalChamberData.encounters) modalChamberData.encounters = [];

        document.getElementById('modal-edit-node-id').value = modalChamberData.id;
        document.getElementById('modal-edit-node-code').value = modalChamberData.code || '';
        document.getElementById('modal-edit-node-name').value = modalChamberData.name || '';

        const levelSel = document.getElementById('modal-edit-node-level');
        if (levelSel) {
            const realLevels = (activeDungeon.levels || []).filter(l => l.id !== 'all' && !l.id.endsWith('-all'));
            levelSel.innerHTML = realLevels.map(lvl => `
                <option value="${lvl.id}" ${lvl.id === modalChamberData.level ? 'selected' : ''}>${lvl.name}</option>
            `).join('');
        }

        const stateSel = document.getElementById('modal-edit-node-state');
        if (stateSel) {
            stateSel.value = modalChamberData.state || 'unexplored';
        }

        document.getElementById('modal-edit-node-boxed').value = modalChamberData.boxedText || '';
        document.getElementById('modal-edit-node-lighting').value = modalChamberData.lighting || '';
        document.getElementById('modal-edit-node-atmosphere').value = modalChamberData.atmosphere || '';

        const featEl = document.getElementById('modal-edit-node-features');
        if (featEl) {
            featEl.value = (modalChamberData.features || []).join('\n');
        }

        const lootEl = document.getElementById('modal-edit-node-loot');
        if (lootEl) {
            lootEl.value = (modalChamberData.loot || []).map(l => typeof l === 'string' ? l : `${l.name || ''}${l.quantity ? ` (${l.quantity})` : ''}`).join(', ');
        }

        const encNameEl = document.getElementById('modal-edit-enc-name');
        const encCrEl = document.getElementById('modal-edit-enc-cr');
        const firstEnc = (modalChamberData.encounters && modalChamberData.encounters[0]) || {};
        if (encNameEl) encNameEl.value = firstEnc.name || '';
        if (encCrEl) encCrEl.value = firstEnc.cr || '';

        // Initialize chamber encounter monsters array from existing data or bestiary match
        modalChamberData.encounterMonsters = (firstEnc.monsters || []).map(m => {
            const mon = (window.appState && window.appState.monsters || []).find(x => x.id === (m.monsterId || m.id) || (x.name && m.name && x.name.toLowerCase() === m.name.toLowerCase()));
            return {
                id: mon ? mon.id : (m.monsterId || m.id || `m-${Date.now()}`),
                monsterId: mon ? mon.id : (m.monsterId || m.id || ''),
                name: mon ? mon.name : (m.name || 'Monster'),
                cr: mon ? mon.cr : (m.cr || '1'),
                hp: mon ? (parseInt(mon.hp) || 20) : (parseInt(m.hp) || 20),
                ac: mon ? (parseInt(mon.ac) || 12) : (parseInt(m.ac) || 12),
                type: mon ? (mon.type || 'creature') : 'creature',
                count: m.count || 1
            };
        });

        populateChamberMonsterPicker();
        renderChamberMonstersRoster();

        renderModalExitsList();
        renderModalSecretsList();
        renderModalTrapsList();
        populateModalTargetChambersDropdown();

        const modal = document.getElementById('modal-dungeon-edit-chamber');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    function populateChamberMonsterPicker(filterText = '') {
        const select = document.getElementById('modal-enc-monster-select');
        if (!select) return;

        let monsters = (window.appState && window.appState.monsters) || [];
        if (filterText) {
            const q = filterText.toLowerCase().trim();
            monsters = monsters.filter(m => {
                const nameMatch = (m.name || '').toLowerCase().includes(q);
                const typeMatch = (m.type || '').toLowerCase().includes(q);
                const crMatch = String(m.cr || '').toLowerCase().includes(q) || `cr ${m.cr}`.toLowerCase().includes(q);
                return nameMatch || typeMatch || crMatch;
            });
        }

        if (monsters.length === 0) {
            select.innerHTML = '<option value="">-- No matching monsters --</option>';
            return;
        }

        select.innerHTML = monsters.map(m => {
            const crLabel = m.cr !== undefined ? `CR ${m.cr}` : 'CR 1';
            const hpLabel = m.hp ? `${m.hp} HP` : '';
            const typeLabel = m.type ? m.type : 'creature';
            return `<option value="${m.id}">[${crLabel}] ${m.name} (${typeLabel}${hpLabel ? `, ${hpLabel}` : ''})</option>`;
        }).join('');
    }

    function filterChamberMonsterPicker(filterText) {
        populateChamberMonsterPicker(filterText);
    }

    function renderChamberMonstersRoster() {
        const roster = document.getElementById('modal-enc-roster');
        const badge = document.getElementById('modal-enc-summary-badge');
        if (!roster || !modalChamberData) return;

        const monsters = modalChamberData.encounterMonsters || [];
        if (monsters.length === 0) {
            roster.innerHTML = '<div class="text-slate-500 text-xs italic py-1">No monsters staged for this encounter yet. Select from the SRD bestiary below.</div>';
            if (badge) {
                badge.className = "px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono text-[9px] border border-slate-700 font-semibold";
                badge.textContent = "No Combatants";
            }
            return;
        }

        let totalMonsters = 0;
        let totalHp = 0;
        roster.innerHTML = monsters.map((m, idx) => {
            const count = m.count || 1;
            totalMonsters += count;
            totalHp += (m.hp || 20) * count;

            return `
                <div class="p-2 rounded-xl bg-ledger-900 border border-ledger-750 flex items-center justify-between gap-2 text-xs">
                    <div class="flex items-center gap-2 min-w-0">
                        <span class="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-300 font-mono font-bold text-xs flex items-center justify-center shrink-0 border border-rose-500/30">
                            ${count}x
                        </span>
                        <div class="min-w-0">
                            <span class="font-bold text-slate-200 truncate block">${m.name}</span>
                            <div class="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                                <span>CR ${m.cr || '1'}</span>
                                <span>•</span>
                                <span>${m.hp || 20} HP</span>
                                ${m.type ? `<span>•</span><span class="capitalize">${m.type}</span>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5 shrink-0">
                        <div class="flex items-center gap-1 bg-ledger-950 border border-ledger-750 rounded-lg p-0.5 font-mono text-[10px]">
                            <button type="button" onclick="window.DungeonController.adjustChamberMonsterCount(${idx}, -1)" class="w-5 h-5 rounded hover:bg-ledger-800 text-slate-400 hover:text-white flex items-center justify-center font-bold">-</button>
                            <span class="w-4 text-center font-bold text-slate-200">${count}</span>
                            <button type="button" onclick="window.DungeonController.adjustChamberMonsterCount(${idx}, 1)" class="w-5 h-5 rounded hover:bg-ledger-800 text-slate-400 hover:text-white flex items-center justify-center font-bold">+</button>
                        </div>
                        <button type="button" onclick="window.DungeonController.removeChamberMonster(${idx})" class="p-1 text-slate-400 hover:text-rose-400 font-mono font-bold text-sm" title="Remove">&times;</button>
                    </div>
                </div>
            `;
        }).join('');

        if (badge) {
            badge.className = "px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[9px] border border-rose-500/30 font-semibold";
            badge.textContent = `${totalMonsters} Combatant${totalMonsters > 1 ? 's' : ''} (${totalHp} Total HP)`;
        }

        // Auto-suggest name or CR if empty
        const nameInput = document.getElementById('modal-edit-enc-name');
        if (nameInput && !nameInput.value.trim() && monsters.length > 0) {
            nameInput.value = monsters.length === 1 ? `${monsters[0].name} Encounter` : `${monsters[0].name} Ambush`;
        }
        const crInput = document.getElementById('modal-edit-enc-cr');
        if (crInput && !crInput.value.trim() && monsters.length > 0) {
            crInput.value = monsters[0].cr || '1';
        }
    }

    function addChamberMonster() {
        if (!modalChamberData) return;
        const select = document.getElementById('modal-enc-monster-select');
        const countInput = document.getElementById('modal-enc-monster-count');
        if (!select || !select.value) return;

        const count = Math.max(1, parseInt(countInput?.value, 10) || 1);
        const monId = select.value;
        const allMonsters = (window.appState && window.appState.monsters) || [];
        const mon = allMonsters.find(m => m.id === monId);
        if (!mon) return;

        if (!modalChamberData.encounterMonsters) modalChamberData.encounterMonsters = [];

        const existing = modalChamberData.encounterMonsters.find(m => m.monsterId === monId || m.name.toLowerCase() === mon.name.toLowerCase());
        if (existing) {
            existing.count = (existing.count || 1) + count;
        } else {
            modalChamberData.encounterMonsters.push({
                id: mon.id,
                monsterId: mon.id,
                name: mon.name,
                cr: mon.cr || '1',
                hp: parseInt(mon.hp) || 20,
                ac: parseInt(mon.ac) || 12,
                type: mon.type || 'creature',
                count
            });
        }

        renderChamberMonstersRoster();
        if (countInput) countInput.value = 1;
    }

    function removeChamberMonster(index) {
        if (!modalChamberData || !modalChamberData.encounterMonsters) return;
        modalChamberData.encounterMonsters.splice(index, 1);
        renderChamberMonstersRoster();
    }

    function adjustChamberMonsterCount(index, delta) {
        if (!modalChamberData || !modalChamberData.encounterMonsters) return;
        const m = modalChamberData.encounterMonsters[index];
        if (!m) return;
        m.count = (m.count || 1) + delta;
        if (m.count <= 0) {
            modalChamberData.encounterMonsters.splice(index, 1);
        }
        renderChamberMonstersRoster();
    }

    function populateModalTargetChambersDropdown() {
        const select = document.getElementById('modal-new-exit-target');
        if (!select || !activeDungeon || !modalChamberData) return;

        const otherNodes = (activeDungeon.nodes || []).filter(n => n.id !== modalChamberData.id);
        const existingTargetIds = new Set(modalChamberData.exits.map(e => e.target));

        select.innerHTML = '<option value="">-- Choose Chamber to Attach --</option>' + otherNodes.map(n => {
            const lvl = (activeDungeon.levels || []).find(l => l.id === n.level);
            const isAlready = existingTargetIds.has(n.id) ? ' (Already Connected)' : '';
            return `<option value="${n.id}" ${existingTargetIds.has(n.id) ? 'disabled' : ''}>[${lvl ? lvl.name : n.level}] ${n.code}: ${n.name}${isAlready}</option>`;
        }).join('');
    }

    function renderModalExitsList() {
        const cont = document.getElementById('modal-edit-exits-list');
        if (!cont || !modalChamberData) return;

        if (modalChamberData.exits.length === 0) {
            cont.innerHTML = '<div class="text-slate-500 text-xs italic py-1">No attached chambers. Use the form below to connect rooms.</div>';
            return;
        }

        const typeLabels = {
            door: '🚪 Door',
            archway: '🏛️ Archway',
            stairs: '🪜 Stairs',
            ladder: '🪜 Ladder',
            secret: '👁️ Secret',
            locked: '🔒 Locked',
            portcullis: '⛓️ Portcullis',
            trapdoor: '🕳️ Trapdoor'
        };

        cont.innerHTML = modalChamberData.exits.map((exit, idx) => {
            const tgtNode = (activeDungeon.nodes || []).find(n => n.id === exit.target);
            const tgtLabel = tgtNode ? `${tgtNode.code}: ${tgtNode.name}` : (exit.label || exit.target);
            const badge = typeLabels[exit.type] || '🚪 Door';
            return `
                <div class="flex items-center justify-between p-2 rounded-xl bg-ledger-950 border border-ledger-800 text-xs">
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-0.5 rounded-lg bg-ledger-850 border border-ledger-700 font-mono text-[10px] text-amber-300 font-bold">${badge}</span>
                        <span class="text-slate-200 font-bold">→ ${tgtLabel}</span>
                    </div>
                    <button type="button" onclick="window.DungeonController.removeChamberExit(${idx})" class="text-rose-400 hover:text-rose-300 px-2 py-1 text-xs font-bold" title="Sever Connection">✕</button>
                </div>
            `;
        }).join('');
    }

    function addChamberExit() {
        if (!modalChamberData || !activeDungeon) return;
        const targetSelect = document.getElementById('modal-new-exit-target');
        const typeSelect = document.getElementById('modal-new-exit-type');
        const twoWayChk = document.getElementById('modal-new-exit-twoway');

        const targetId = targetSelect ? targetSelect.value : '';
        const exitType = typeSelect ? typeSelect.value : 'door';
        const isTwoWay = twoWayChk ? twoWayChk.checked : true;

        if (!targetId) {
            alert("Please choose a target chamber to connect.");
            return;
        }

        const tgtNode = (activeDungeon.nodes || []).find(n => n.id === targetId);
        const tgtLabel = tgtNode ? `${tgtNode.code}: ${tgtNode.name}` : 'Connected Chamber';

        if (!modalChamberData.exits.some(e => e.target === targetId)) {
            modalChamberData.exits.push({
                target: targetId,
                label: tgtLabel,
                type: exitType,
                state: exitType === 'secret' ? 'secret' : (exitType === 'locked' ? 'locked' : 'open'),
                twoWay: isTwoWay
            });
        }

        renderModalExitsList();
        populateModalTargetChambersDropdown();
        if (targetSelect) targetSelect.value = '';
    }

    function removeChamberExit(index) {
        if (!modalChamberData || !modalChamberData.exits) return;
        modalChamberData.exits.splice(index, 1);
        renderModalExitsList();
        populateModalTargetChambersDropdown();
    }

    function renderModalSecretsList() {
        const cont = document.getElementById('modal-edit-secrets-list');
        if (!cont || !modalChamberData) return;
        if (modalChamberData.secrets.length === 0) {
            cont.innerHTML = '<div class="text-slate-500 text-xs italic py-1">No hidden secrets added.</div>';
            return;
        }
        cont.innerHTML = modalChamberData.secrets.map((sec, idx) => `
            <div class="flex items-center justify-between p-2 rounded-xl bg-ledger-950 border border-ledger-800 text-xs gap-2">
                <div>
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">DC ${sec.dc} ${sec.skill || 'Perception'}</span>
                    <span class="text-slate-300 ml-1.5">${sec.text}</span>
                </div>
                <button type="button" onclick="window.DungeonController.removeChamberSecret(${idx})" class="text-rose-400 hover:text-rose-300 px-1.5 py-0.5 text-xs font-bold">✕</button>
            </div>
        `).join('');
    }

    function addChamberSecret() {
        if (!modalChamberData) return;
        const dcInput = document.getElementById('modal-new-secret-dc');
        const skillInput = document.getElementById('modal-new-secret-skill');
        const textInput = document.getElementById('modal-new-secret-text');

        const dc = parseInt(dcInput ? dcInput.value : '15') || 15;
        const skill = skillInput ? skillInput.value : 'Perception';
        const text = textInput ? textInput.value.trim() : '';

        if (!text) {
            alert("Please enter secret details.");
            return;
        }

        modalChamberData.secrets.push({ dc, skill, text });
        if (textInput) textInput.value = '';
        renderModalSecretsList();
    }

    function removeChamberSecret(idx) {
        if (!modalChamberData || !modalChamberData.secrets) return;
        modalChamberData.secrets.splice(idx, 1);
        renderModalSecretsList();
    }

    function renderModalTrapsList() {
        const cont = document.getElementById('modal-edit-traps-list');
        if (!cont || !modalChamberData) return;
        if (modalChamberData.traps.length === 0) {
            cont.innerHTML = '<div class="text-slate-500 text-xs italic py-1">No traps or hazards added.</div>';
            return;
        }
        cont.innerHTML = modalChamberData.traps.map((tr, idx) => `
            <div class="flex items-center justify-between p-2 rounded-xl bg-ledger-950 border border-red-900/40 text-xs gap-2">
                <div>
                    <span class="font-bold text-red-400">⚡ ${tr.name || 'Hazard'}</span>
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 ml-1">DC ${tr.dc || 15}</span>
                    <p class="text-slate-400 text-[11px] mt-0.5">${tr.trigger ? `Trigger: ${tr.trigger}. ` : ''}${tr.effect || ''}</p>
                </div>
                <button type="button" onclick="window.DungeonController.removeChamberTrap(${idx})" class="text-rose-400 hover:text-rose-300 px-1.5 py-0.5 text-xs font-bold">✕</button>
            </div>
        `).join('');
    }

    function addChamberTrap() {
        if (!modalChamberData) return;
        const nameInput = document.getElementById('modal-new-trap-name');
        const dcInput = document.getElementById('modal-new-trap-dc');
        const trigInput = document.getElementById('modal-new-trap-trigger');
        const effInput = document.getElementById('modal-new-trap-effect');

        const name = nameInput ? nameInput.value.trim() : 'Trap';
        const dc = parseInt(dcInput ? dcInput.value : '15') || 15;
        const trigger = trigInput ? trigInput.value.trim() : '';
        const effect = effInput ? effInput.value.trim() : '';

        if (!effect && !trigger) {
            alert("Please enter trap trigger or effect.");
            return;
        }

        modalChamberData.traps.push({ name, dc, trigger, effect });
        if (nameInput) nameInput.value = '';
        if (trigInput) trigInput.value = '';
        if (effInput) effInput.value = '';
        renderModalTrapsList();
    }

    function removeChamberTrap(idx) {
        if (!modalChamberData || !modalChamberData.traps) return;
        modalChamberData.traps.splice(idx, 1);
        renderModalTrapsList();
    }

    async function saveChamberModalEdits() {
        if (!activeDungeon || !modalChamberData) return;
        const node = (activeDungeon.nodes || []).find(n => n.id === modalChamberData.id);
        if (!node) return;

        node.code = document.getElementById('modal-edit-node-code').value.trim();
        node.name = document.getElementById('modal-edit-node-name').value.trim();

        const lvlSel = document.getElementById('modal-edit-node-level');
        if (lvlSel && lvlSel.value) node.level = lvlSel.value;

        const stateSel = document.getElementById('modal-edit-node-state');
        if (stateSel && stateSel.value) node.state = stateSel.value;

        node.boxedText = document.getElementById('modal-edit-node-boxed').value.trim();
        node.lighting = document.getElementById('modal-edit-node-lighting').value.trim();
        node.atmosphere = document.getElementById('modal-edit-node-atmosphere').value.trim();

        const featText = document.getElementById('modal-edit-node-features')?.value || '';
        node.features = featText.split('\n').map(s => s.trim()).filter(Boolean);

        const lootText = document.getElementById('modal-edit-node-loot')?.value || '';
        node.loot = lootText.split(',').map(s => s.trim()).filter(Boolean).map(itemStr => ({ name: itemStr, quantity: '1' }));

        const encName = document.getElementById('modal-edit-enc-name')?.value.trim();
        const encCr = document.getElementById('modal-edit-enc-cr')?.value.trim();
        const monsters = modalChamberData.encounterMonsters || [];

        if (monsters.length > 0 || encName) {
            node.encounters = [{
                id: (node.encounters && node.encounters[0] && node.encounters[0].id) || `enc-${node.id}`,
                name: encName || (monsters.length > 0 ? `${monsters[0].name} Encounter` : 'Chamber Encounter'),
                cr: encCr || (monsters.length > 0 ? String(monsters[0].cr || '1') : '1'),
                monsters: monsters.map(m => ({
                    id: m.id || m.monsterId,
                    monsterId: m.monsterId || m.id,
                    name: m.name,
                    cr: m.cr || '1',
                    hp: m.hp || 20,
                    ac: m.ac || 12,
                    count: m.count || 1
                }))
            }];
        } else {
            node.encounters = [];
        }

        node.secrets = modalChamberData.secrets || [];
        node.traps = modalChamberData.traps || [];

        node.exits = modalChamberData.exits.map(e => ({
            target: e.target,
            label: e.label,
            type: e.type,
            state: e.state || 'open'
        }));

        // Handle Two-Way connection creation
        modalChamberData.exits.forEach(exit => {
            if (exit.twoWay) {
                const targetNode = (activeDungeon.nodes || []).find(n => n.id === exit.target);
                if (targetNode) {
                    if (!targetNode.exits) targetNode.exits = [];
                    if (!targetNode.exits.some(e => e.target === node.id)) {
                        targetNode.exits.push({
                            target: node.id,
                            label: `${node.code}: ${node.name}`,
                            type: exit.type,
                            state: exit.state || 'open'
                        });
                    }
                }
            }
        });

        if (typeof closeModal === 'function') closeModal('modal-dungeon-edit-chamber');

        saveDungeonToBackend("Chamber dossier updated!", () => {
            renderGraph();
            renderActiveChamberDossier();
        });
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
        openAddFloorModal,
        addNewChamber,
        deleteChamber,
        addChamberExit,
        removeChamberExit,
        addChamberSecret,
        removeChamberSecret,
        addChamberTrap,
        removeChamberTrap,
        populateChamberMonsterPicker,
        filterChamberMonsterPicker,
        renderChamberMonstersRoster,
        addChamberMonster,
        removeChamberMonster,
        adjustChamberMonsterCount,
        openNewDungeonModal,
        saveNewDungeon,
        zoomIn,
        zoomOut,
        resetView,
        centerOnParty
    };
})();
