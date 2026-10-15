/**
 * ARCANE LEDGER — DM TABLETOP BATTLEMAP & FOG OF WAR CONTROLLER
 * Real-time dual-canvas fog of war, physical 1-inch grid calibration,
 * table rotation, viewport lock, laser pings, map management,
 * and interactive monster/hero miniatures token support.
 */

window.BattlemapController = (function() {
    let state = {
        activeMapId: "dungeon_crypt",
        activeMapUrl: "/static/images/battlemaps/dungeon_crypt.svg",
        activeMapName: "Forgotten Dungeon Crypt",
        gridSize: 50,
        gridVisible: true,
        gridColor: "rgba(255, 255, 255, 0.22)",
        fogEnabled: true,
        fogMask: null,
        rotation: 0,
        panX: 0,
        panY: 0,
        zoom: 1.0,
        locked: false,
        pings: [],
        tokens: [],
        maps: []
    };

    // Tool state
    let currentTool = 'brush'; // 'brush', 'box', 'shroud', 'ping'
    let brushRadius = 50;
    let isDrawing = false;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let lastDrawX = 0;
    let lastDrawY = 0;
    let boxStartX = 0;
    let boxStartY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;
    let isInsideCanvas = false;

    // Token Dragging State
    let draggedToken = null;
    let dragStartX = 0;
    let dragStartY = 0;
    let tokenStartWorldX = 0;
    let tokenStartWorldY = 0;

    // Undo History
    const historyStack = [];
    const MAX_HISTORY = 10;

    // Canvases & DOM Elements
    let containerEl = null;
    let viewportEl = null;
    let mapImgEl = null;
    let gridCanvas = null;
    let dmFogCanvas = null;
    let previewCanvas = null;
    let pingLayerEl = null;
    let tokensLayerEl = null;

    let gridCtx = null;
    let dmFogCtx = null;
    let previewCtx = null;

    // Offscreen Full-Resolution Mask Canvas
    const offscreenFog = document.createElement('canvas');
    const offscreenCtx = offscreenFog.getContext('2d');

    let mapWidth = 2000;
    let mapHeight = 1500;
    let isMapLoaded = false;
    let initialized = false;
    let pollInterval = null;

    // DM Viewport transform
    let dmPanX = 0;
    let dmPanY = 0;
    let dmZoom = 0.55;

    // -------------------------------------------------------------------------
    // INITIALIZATION
    // -------------------------------------------------------------------------
    async function init() {
        if (!containerEl) {
            setupElements();
        }
        await fetchState();
        populateMapDropdown();
        loadActiveMap();

        if (!pollInterval) {
            pollInterval = setInterval(pollPingsAndSync, 1200);
        }
        initialized = true;
    }

    function setupElements() {
        containerEl = document.getElementById('dm-map-viewport-container');
        viewportEl = document.getElementById('dm-map-viewport');
        mapImgEl = document.getElementById('dm-map-base-img');
        gridCanvas = document.getElementById('dm-grid-canvas');
        dmFogCanvas = document.getElementById('dm-fog-canvas');
        previewCanvas = document.getElementById('dm-preview-canvas');
        pingLayerEl = document.getElementById('dm-ping-layer');
        tokensLayerEl = document.getElementById('dm-tokens-layer');

        if (!containerEl || !viewportEl) return;

        gridCtx = gridCanvas.getContext('2d');
        dmFogCtx = dmFogCanvas.getContext('2d');
        previewCtx = previewCanvas.getContext('2d');

        // Setup Event Listeners
        previewCanvas.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        containerEl.addEventListener('wheel', handleWheel, { passive: false });
        previewCanvas.addEventListener('mouseenter', () => { isInsideCanvas = true; });
        previewCanvas.addEventListener('mouseleave', () => {
            isInsideCanvas = false;
            renderPreview();
        });
        previewCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

        // File upload drag & drop
        containerEl.addEventListener('dragover', (e) => { e.preventDefault(); });
        containerEl.addEventListener('drop', handleFileDrop);
    }

    // -------------------------------------------------------------------------
    // API SYNC
    // -------------------------------------------------------------------------
    async function fetchState() {
        try {
            const res = await fetch('/api/battlemap');
            if (res.ok) {
                state = await res.json();
                updateUIControls();
                renderDMTokens();
            }
        } catch (err) {
            console.error("Error fetching battlemap state:", err);
        }
    }

    async function pollPingsAndSync() {
        try {
            const res = await fetch('/api/battlemap');
            if (res.ok) {
                const newState = await res.json();
                
                // Sync pings
                if (newState.pings && newState.pings.length > 0) {
                    newState.pings.forEach(p => {
                        if (Date.now() / 1000 - p.timestamp < 2.0) {
                            renderLocalPing(p.x, p.y, p.color);
                        }
                    });
                }

                // Sync tokens if not currently dragging
                if (!draggedToken && newState.tokens) {
                    const localLen = (state.tokens || []).length;
                    const newLen = newState.tokens.length;
                    const tokensJson = JSON.stringify(newState.tokens);
                    if (localLen !== newLen) {
                        state.tokens = newState.tokens;
                        renderDMTokens();
                    } else if (tokensJson !== JSON.stringify(state.tokens)) {
                        state.tokens = newState.tokens;
                        state.tokens.forEach(t => updateTokenDOM(t));
                    }
                }
            }
        } catch (err) {
            // Silently ignore polling network glitches
        }
    }

    async function pushStateUpdate(partial) {
        Object.assign(state, partial);
        try {
            await fetch('/api/battlemap/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(partial)
            });
        } catch (err) {
            console.error("Failed to push state update:", err);
        }
    }

    async function pushFogMask() {
        const maskDataUrl = offscreenFog.toDataURL('image/png');
        try {
            await fetch('/api/battlemap/fog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fogMask: maskDataUrl })
            });
        } catch (err) {
            console.error("Failed to push fog mask:", err);
        }
    }

    // -------------------------------------------------------------------------
    // MAP LOADING & SIZING
    // -------------------------------------------------------------------------
    function loadActiveMap() {
        if (!mapImgEl) return;
        isMapLoaded = false;
        mapImgEl.onload = () => {
            mapWidth = mapImgEl.naturalWidth || 2000;
            mapHeight = mapImgEl.naturalHeight || 1500;

            // Set size of all canvases
            [gridCanvas, dmFogCanvas, previewCanvas, offscreenFog].forEach(c => {
                c.width = mapWidth;
                c.height = mapHeight;
            });

            viewportEl.style.width = `${mapWidth}px`;
            viewportEl.style.height = `${mapHeight}px`;

            isMapLoaded = true;

            // Initialize Fog Mask
            if (state.fogMask && state.fogMask !== "REVEALED_ALL") {
                const img = new Image();
                img.onload = () => {
                    offscreenCtx.clearRect(0, 0, mapWidth, mapHeight);
                    offscreenCtx.drawImage(img, 0, 0, mapWidth, mapHeight);
                    renderDMFog();
                };
                img.src = state.fogMask;
            } else if (state.fogMask === "REVEALED_ALL" || !state.fogEnabled) {
                offscreenCtx.clearRect(0, 0, mapWidth, mapHeight);
                renderDMFog();
            } else {
                // Initial 100% full shroud
                offscreenCtx.fillStyle = '#000000';
                offscreenCtx.fillRect(0, 0, mapWidth, mapHeight);
                renderDMFog();
            }

            renderGrid();
            renderDMTokens();
            fitMapToWorkspace();
        };
        mapImgEl.src = state.activeMapUrl;
    }

    function fitMapToWorkspace() {
        if (!containerEl) return;
        const cWidth = containerEl.clientWidth || 0;
        const cHeight = containerEl.clientHeight || 0;
        if (!cWidth || !cHeight) {
            setTimeout(fitMapToWorkspace, 60);
            return;
        }
        const scaleX = (cWidth - 60) / mapWidth;
        const scaleY = (cHeight - 60) / mapHeight;
        dmZoom = Math.min(scaleX, scaleY, 0.85);
        dmPanX = Math.round((cWidth - mapWidth * dmZoom) / 2);
        dmPanY = Math.round((cHeight - mapHeight * dmZoom) / 2);
        applyDMTransform();
    }

    function applyDMTransform() {
        if (!viewportEl) return;
        viewportEl.style.transform = `translate(${dmPanX}px, ${dmPanY}px) scale(${dmZoom})`;
        const zoomLabel = document.getElementById('dm-zoom-display');
        if (zoomLabel) zoomLabel.textContent = `${Math.round(dmZoom * 100)}%`;
    }

    // -------------------------------------------------------------------------
    // CANVAS RENDERING
    // -------------------------------------------------------------------------
    function renderGrid() {
        if (!isMapLoaded || !gridCtx) return;
        gridCtx.clearRect(0, 0, mapWidth, mapHeight);

        if (!state.gridVisible || !state.gridSize || state.gridSize <= 5) return;

        const step = state.gridSize;
        gridCtx.strokeStyle = state.gridColor || 'rgba(255, 255, 255, 0.22)';
        gridCtx.lineWidth = 1.2;
        gridCtx.beginPath();

        for (let x = 0; x <= mapWidth; x += step) {
            gridCtx.moveTo(x + 0.5, 0);
            gridCtx.lineTo(x + 0.5, mapHeight);
        }
        for (let y = 0; y <= mapHeight; y += step) {
            gridCtx.moveTo(0, y + 0.5);
            gridCtx.lineTo(mapWidth, y + 0.5);
        }
        gridCtx.stroke();
    }

    function renderDMFog() {
        if (!isMapLoaded || !dmFogCtx) return;
        dmFogCtx.clearRect(0, 0, mapWidth, mapHeight);

        if (!state.fogEnabled || state.fogMask === "REVEALED_ALL") {
            return;
        }

        // Draw offscreen mask with opacity for DM God-Mode
        const fogAlpha = (window.ArcaneSettings && typeof window.ArcaneSettings.fogOpacity === 'number')
            ? window.ArcaneSettings.fogOpacity
            : 0.40;
        dmFogCtx.save();
        dmFogCtx.globalAlpha = fogAlpha;
        dmFogCtx.drawImage(offscreenFog, 0, 0);
        dmFogCtx.restore();
    }

    function isPointInFog(x, y) {
        if (!state.fogEnabled || state.fogMask === "REVEALED_ALL") return false;
        if (!offscreenCtx || !isMapLoaded) return false;
        try {
            const clampedX = Math.max(0, Math.min(mapWidth - 1, Math.floor(x)));
            const clampedY = Math.max(0, Math.min(mapHeight - 1, Math.floor(y)));
            const pixel = offscreenCtx.getImageData(clampedX, clampedY, 1, 1).data;
            // In our canvas, shroud is black with alpha > 0 (typically 255)
            // When cleared by brush, alpha is 0
            return pixel[3] > 64;
        } catch (e) {
            return false;
        }
    }

    function renderPreview() {
        if (!isMapLoaded || !previewCtx) return;
        previewCtx.clearRect(0, 0, mapWidth, mapHeight);

        if (!isInsideCanvas && !isDrawing) return;

        if (currentTool === 'brush' || currentTool === 'shroud') {
            previewCtx.save();
            previewCtx.beginPath();
            previewCtx.arc(currentMouseX, currentMouseY, brushRadius, 0, Math.PI * 2);
            if (currentTool === 'brush') {
                previewCtx.fillStyle = 'rgba(245, 158, 11, 0.25)';
                previewCtx.strokeStyle = '#f59e0b';
            } else {
                previewCtx.fillStyle = 'rgba(225, 29, 72, 0.25)';
                previewCtx.strokeStyle = '#e11d48';
            }
            previewCtx.lineWidth = 2 / dmZoom;
            previewCtx.setLineDash([4 / dmZoom, 4 / dmZoom]);
            previewCtx.fill();
            previewCtx.stroke();
            previewCtx.restore();
        } else if (currentTool === 'box' && isDrawing) {
            previewCtx.save();
            const minX = Math.min(boxStartX, currentMouseX);
            const minY = Math.min(boxStartY, currentMouseY);
            const w = Math.abs(currentMouseX - boxStartX);
            const h = Math.abs(currentMouseY - boxStartY);

            previewCtx.fillStyle = 'rgba(245, 158, 11, 0.2)';
            previewCtx.strokeStyle = '#fbbf24';
            previewCtx.lineWidth = 2 / dmZoom;
            previewCtx.setLineDash([6 / dmZoom, 4 / dmZoom]);
            previewCtx.fillRect(minX, minY, w, h);
            previewCtx.strokeRect(minX, minY, w, h);
            previewCtx.restore();
        } else if (currentTool === 'ping') {
            previewCtx.save();
            previewCtx.strokeStyle = '#f59e0b';
            previewCtx.lineWidth = 2 / dmZoom;
            previewCtx.beginPath();
            previewCtx.arc(currentMouseX, currentMouseY, 15 / dmZoom, 0, Math.PI * 2);
            previewCtx.stroke();
            previewCtx.restore();
        }
    }

    // -------------------------------------------------------------------------
    // -------------------------------------------------------------------------
    // MONSTER & HERO TOKENS (TABLETOP DISPLAY & INTERACTIVE DRAG)
    // -------------------------------------------------------------------------
    function getTokenConditionsAndAuras(token) {
        let conditions = Array.isArray(token.conditions) ? [...token.conditions] : [];
        let isConcentrating = token.concentrating === true;

        if (window.appState && window.appState.combat && Array.isArray(window.appState.combat.combatants)) {
            const c = window.appState.combat.combatants.find(item => item.id === token.combatantId || item.name === token.name);
            if (c) {
                if (c.isConcentrating || c.concentrating) isConcentrating = true;
                if (Array.isArray(c.conditions)) {
                    c.conditions.forEach(cond => {
                        const cName = typeof cond === 'string' ? cond : (cond.name || '');
                        if (cName && !conditions.includes(cName)) conditions.push(cName);
                    });
                }
            }
        }

        const auras = [];
        const badges = [];

        const isBloodied = token.currentHp > 0 && token.currentHp <= Math.floor(token.maxHp / 2);
        if (isBloodied) auras.push('bloodied-aura');

        if (isConcentrating) {
            auras.push('concentration-halo');
            badges.push({ emoji: '🧘', name: 'Concentrating' });
        }

        const lowerConds = conditions.map(x => String(x).toLowerCase());

        if (lowerConds.some(c => c.includes('stun') || c.includes('paralyz'))) {
            auras.push('stunned-aura');
            badges.push({ emoji: '⚡', name: 'Stunned' });
        }
        if (lowerConds.some(c => c.includes('poison'))) {
            auras.push('poisoned-aura');
            badges.push({ emoji: '🤢', name: 'Poisoned' });
        }
        if (lowerConds.some(c => c.includes('frighten') || c.includes('fear') || c.includes('charm'))) {
            auras.push('frightened-aura');
            badges.push({ emoji: '😱', name: 'Frightened / Charmed' });
        }
        if (lowerConds.some(c => c.includes('prone'))) {
            auras.push('prone-token');
            badges.push({ emoji: '💤', name: 'Prone' });
        }
        if (lowerConds.some(c => c.includes('invis'))) {
            auras.push('invisible-aura');
            badges.push({ emoji: '👻', name: 'Invisible' });
        }
        if (lowerConds.some(c => c.includes('blind'))) {
            badges.push({ emoji: '🙈', name: 'Blinded' });
        }
        if (lowerConds.some(c => c.includes('restrain') || c.includes('grappl'))) {
            badges.push({ emoji: '⛓️', name: 'Restrained' });
        }

        return { auras: auras.join(' '), badges, isConcentrating };
    }

    function renderDMTokens() {
        if (!tokensLayerEl) {
            tokensLayerEl = document.getElementById('dm-tokens-layer');
        }
        if (!tokensLayerEl) return;

        const tokens = state.tokens || [];
        const gridSize = state.gridSize || 50;
        const countEl = document.getElementById('dm-tokens-count');
        if (countEl) countEl.textContent = tokens.length;

        tokensLayerEl.innerHTML = tokens.map(t => {
            const sq = t.sizeSquares || 1.0;
            const sizePx = Math.round(sq * gridSize);
            const borderColor = t.color || '#ef4444';
            const avatar = t.imageUrl || '';
            const initials = t.name ? t.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'M';
            const isHidden = t.visibleToPlayers === false;
            const elev = parseInt(t.elevation, 10) || 0;

            const { auras, badges } = getTokenConditionsAndAuras(t);

            const elevShadow = elev > 0 ? `filter: drop-shadow(0px ${Math.min(26, Math.round(elev * 0.7))}px ${Math.min(20, Math.round(elev * 0.5))}px rgba(0,0,0,0.85));` : '';

            return `
                <div class="dm-map-token absolute cursor-grab select-none group pointer-events-auto ${auras}"
                     id="dm-token-${t.id}"
                     data-token-id="${t.id}"
                     style="left: ${t.x}px; top: ${t.y}px; width: ${sizePx}px; height: ${sizePx}px; transform: translate(-50%, -50%); border: ${isHidden ? '3px dashed' : '3.5px solid'} ${borderColor}; border-radius: 50%; opacity: ${isHidden ? '0.65' : '1'}; box-shadow: 0 4px 16px rgba(0,0,0,0.85); will-change: left, top; pointer-events: auto; ${elevShadow}">
                    
                    ${avatar ? `
                        <img src="${avatar}" alt="${t.name}" class="w-full h-full rounded-full object-cover bg-neutral-900 pointer-events-none" onerror="this.style.display='none'; if (this.nextElementSibling) { this.nextElementSibling.classList.remove('hidden'); this.nextElementSibling.classList.add('flex'); }">
                        <div class="w-full h-full rounded-full hidden items-center justify-center font-bold text-amber-300 font-serif text-sm bg-neutral-900 pointer-events-none">${initials}</div>
                    ` : `
                        <div class="w-full h-full rounded-full flex items-center justify-center font-bold text-amber-300 font-serif text-sm bg-neutral-900 pointer-events-none">${initials}</div>
                    `}

                    <!-- Elevation Badge (if non-zero) -->
                    ${elev !== 0 ? `
                        <div id="dm-token-elev-${t.id}" class="absolute -top-2.5 -right-2.5 ${elev > 0 ? 'bg-sky-950/95 text-sky-300 border-sky-400 shadow-sky-500/30' : 'bg-amber-950/95 text-amber-300 border-amber-600'} border font-mono text-[9px] font-extrabold px-1.5 py-0.2 rounded-full shadow-lg flex items-center gap-0.5 pointer-events-none z-30">
                            ${elev > 0 ? '🪽 +' : '▼ '}${elev}ft
                        </div>
                    ` : `
                        <div id="dm-token-elev-${t.id}" class="hidden absolute -top-2.5 -right-2.5"></div>
                    `}

                    <!-- Condition Badges (Aura Mini-Icons) -->
                    ${badges.length > 0 ? `
                        <div id="dm-token-badges-${t.id}" class="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 z-30 pointer-events-none">
                            ${badges.map(b => `<span title="${b.name}" class="text-xs filter drop-shadow">${b.emoji}</span>`).join('')}
                        </div>
                    ` : `
                        <div id="dm-token-badges-${t.id}" class="hidden absolute -top-6 left-1/2 -translate-x-1/2"></div>
                    `}

                    <!-- Name Label -->
                    <div id="dm-token-label-${t.id}" class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-ledger-950/95 text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-ledger-700 whitespace-nowrap pointer-events-none shadow flex items-center gap-1">
                        ${isHidden ? '<span title="Hidden from table display">🙈</span>' : ''}
                        <span>${t.name}</span>
                    </div>

                    <!-- Quick Hover / Context Action Strip with Hover Bridge -->
                    <div class="token-action-bridge absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex pb-3 pt-1 z-50 pointer-events-auto"
                         style="cursor: default;"
                         onmousedown="event.stopPropagation();"
                         onmouseup="event.stopPropagation();"
                         onclick="event.stopPropagation();">
                        <div class="flex items-center gap-1.5 bg-ledger-950/95 border border-ledger-700 rounded-lg px-2 py-0.5 shadow-2xl text-[11px] whitespace-nowrap">
                            <!-- HP Stepper -->
                            <button type="button" onmousedown="event.stopPropagation();" onclick="event.stopPropagation(); window.BattlemapController.modifyTokenHp('${t.id}', -1)" title="-1 HP" class="px-1.5 py-0.5 hover:text-rose-400 font-bold cursor-pointer transition active:scale-95">-</button>
                            <span id="dm-token-hp-${t.id}" class="font-mono text-amber-300 font-bold px-0.5">${t.currentHp}/${t.maxHp}</span>
                            <button type="button" onmousedown="event.stopPropagation();" onclick="event.stopPropagation(); window.BattlemapController.modifyTokenHp('${t.id}', 1)" title="+1 HP" class="px-1.5 py-0.5 hover:text-emerald-400 font-bold cursor-pointer transition active:scale-95">+</button>
                            
                            <span class="text-slate-600">|</span>

                            <!-- Elevation Stepper -->
                            <div class="flex items-center gap-0.5 bg-sky-950/70 border border-sky-500/40 rounded px-1 text-[10px]" title="Token Altitude / Elevation">
                                <button type="button" onmousedown="event.stopPropagation();" onclick="event.stopPropagation(); window.BattlemapController.modifyTokenElevation('${t.id}', -5)" title="-5 ft elevation" class="hover:text-sky-300 font-bold px-0.5 cursor-pointer">-</button>
                                <span onmousedown="event.stopPropagation();" onclick="event.stopPropagation(); window.BattlemapController.promptTokenElevation('${t.id}')" title="Click to set elevation in feet" class="cursor-pointer hover:underline text-sky-300 font-mono font-bold whitespace-nowrap">🪽${elev}ft</span>
                                <button type="button" onmousedown="event.stopPropagation();" onclick="event.stopPropagation(); window.BattlemapController.modifyTokenElevation('${t.id}', 5)" title="+5 ft elevation" class="hover:text-sky-300 font-bold px-0.5 cursor-pointer">+</button>
                            </div>

                            <span class="text-slate-600">|</span>

                            <!-- Visibility & Delete -->
                            <button type="button" id="dm-token-vis-btn-${t.id}" onmousedown="event.stopPropagation();" onclick="event.stopPropagation(); window.BattlemapController.toggleTokenVisibility('${t.id}')" title="${isHidden ? 'Show on table display' : 'Hide from table display'}" class="hover:text-amber-300 px-1 cursor-pointer transition">${isHidden ? '🙈' : '👁️'}</button>
                            <button type="button" onmousedown="event.stopPropagation();" onclick="event.stopPropagation(); window.BattlemapController.deleteToken('${t.id}')" title="Delete token" class="hover:text-rose-400 ml-0.5 px-1 cursor-pointer transition">🗑️</button>
                        </div>
                    </div>

                </div>
            `;
        }).join('');

        // Wire dragging for each token
        tokens.forEach(t => {
            const el = document.getElementById(`dm-token-${t.id}`);
            if (el) {
                el.addEventListener('mousedown', (e) => startTokenDrag(e, t.id));
            }
        });

        renderTokensDrawer();
    }

    function startTokenDrag(e, tokenId) {
        if (e.button !== 0) return; // Left click only
        e.stopPropagation(); // Don't trigger canvas drawing
        e.preventDefault();

        const token = (state.tokens || []).find(t => t.id === tokenId);
        if (!token) return;

        draggedToken = token;
        const el = document.getElementById(`dm-token-${token.id}`);
        if (el) el.classList.add('cursor-grabbing');

        dragStartX = e.clientX;
        dragStartY = e.clientY;
        tokenStartWorldX = token.x;
        tokenStartWorldY = token.y;

        function onTokenMove(ev) {
            if (!draggedToken) return;
            const deltaWorldX = (ev.clientX - dragStartX) / dmZoom;
            const deltaWorldY = (ev.clientY - dragStartY) / dmZoom;

            draggedToken.x = Math.max(0, Math.min(mapWidth, Math.round(tokenStartWorldX + deltaWorldX)));
            draggedToken.y = Math.max(0, Math.min(mapHeight, Math.round(tokenStartWorldY + deltaWorldY)));

            if (el) {
                el.style.left = `${draggedToken.x}px`;
                el.style.top = `${draggedToken.y}px`;
            }
        }

        function onTokenUp() {
            window.removeEventListener('mousemove', onTokenMove);
            window.removeEventListener('mouseup', onTokenUp);

            if (!draggedToken) return;
            if (el) el.classList.remove('cursor-grabbing');

            // Snap to nearest grid center
            const step = state.gridSize || 50;
            draggedToken.x = Math.round(draggedToken.x / step) * step;
            draggedToken.y = Math.round(draggedToken.y / step) * step;

            if (el) {
                el.style.left = `${draggedToken.x}px`;
                el.style.top = `${draggedToken.y}px`;
            }

            // Sync move to backend
            fetch('/api/battlemap/tokens/move', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: draggedToken.id,
                    x: draggedToken.x,
                    y: draggedToken.y
                })
            }).catch(console.error);

            draggedToken = null;
        }

        window.addEventListener('mousemove', onTokenMove);
        window.addEventListener('mouseup', onTokenUp);
    }

    function updateTokenDOM(token) {
        if (!token) return;
        const tokenEl = document.getElementById(`dm-token-${token.id}`);
        if (!tokenEl) {
            renderDMTokens();
            return;
        }

        // Update Condition Auras
        const { auras, badges } = getTokenConditionsAndAuras(token);
        const knownAuras = ['bloodied-aura', 'concentration-halo', 'stunned-aura', 'poisoned-aura', 'frightened-aura', 'prone-token', 'invisible-aura'];
        knownAuras.forEach(cls => tokenEl.classList.remove(cls));
        if (auras) {
            auras.split(' ').forEach(cls => { if (cls) tokenEl.classList.add(cls); });
        }

        // Update HP text span in ribbon
        const hpSpan = document.getElementById(`dm-token-hp-${token.id}`);
        if (hpSpan) {
            hpSpan.textContent = `${token.currentHp}/${token.maxHp}`;
        }

        // Update Elevation Badge & 3D Shadow
        const elev = parseInt(token.elevation, 10) || 0;
        if (elev > 0) {
            tokenEl.style.filter = `drop-shadow(0px ${Math.min(26, Math.round(elev * 0.7))}px ${Math.min(20, Math.round(elev * 0.5))}px rgba(0,0,0,0.85))`;
        } else {
            tokenEl.style.filter = '';
        }
        const elevEl = document.getElementById(`dm-token-elev-${token.id}`);
        if (elevEl) {
            if (elev !== 0) {
                elevEl.className = `absolute -top-2.5 -right-2.5 ${elev > 0 ? 'bg-sky-950/95 text-sky-300 border-sky-400 shadow-sky-500/30' : 'bg-amber-950/95 text-amber-300 border-amber-600'} border font-mono text-[9px] font-extrabold px-1.5 py-0.2 rounded-full shadow-lg flex items-center gap-0.5 pointer-events-none z-30`;
                elevEl.textContent = `${elev > 0 ? '🪽 +' : '▼ '}${elev}ft`;
            } else {
                elevEl.className = 'hidden absolute -top-2.5 -right-2.5';
            }
        }

        // Update Condition Badges
        const badgesEl = document.getElementById(`dm-token-badges-${token.id}`);
        if (badgesEl) {
            if (badges.length > 0) {
                badgesEl.className = 'absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 z-30 pointer-events-none';
                badgesEl.innerHTML = badges.map(b => `<span title="${b.name}" class="text-xs filter drop-shadow">${b.emoji}</span>`).join('');
            } else {
                badgesEl.className = 'hidden absolute -top-6 left-1/2 -translate-x-1/2';
                badgesEl.innerHTML = '';
            }
        }

        // Update Visibility styling
        const isHidden = token.visibleToPlayers === false;
        const borderColor = token.color || '#ef4444';
        tokenEl.style.border = isHidden ? `3px dashed ${borderColor}` : `3.5px solid ${borderColor}`;
        tokenEl.style.opacity = isHidden ? '0.65' : '1';

        // Update Vis button icon
        const visBtn = document.getElementById(`dm-token-vis-btn-${token.id}`);
        if (visBtn) {
            visBtn.textContent = isHidden ? '🙈' : '👁️';
            visBtn.title = isHidden ? 'Show on table display' : 'Hide from table display';
        }

        // Update label
        const labelEl = document.getElementById(`dm-token-label-${token.id}`);
        if (labelEl) {
            labelEl.innerHTML = `${isHidden ? '<span title="Hidden from table display">🙈</span>' : ''}<span>${token.name}</span>`;
        }

        renderTokensDrawer();
    }

    async function toggleTokenVisibility(tokenId) {
        const token = (state.tokens || []).find(t => t.id === tokenId);
        if (!token) return;
        const newVis = !(token.visibleToPlayers !== false);
        token.visibleToPlayers = newVis;
        updateTokenDOM(token);

        // Sync visibility to linked Combatant in Combat Tracker & Player Screen!
        if (window.appState && window.appState.combat && Array.isArray(window.appState.combat.combatants)) {
            const c = window.appState.combat.combatants.find(item => item.id === token.combatantId || item.name === token.name);
            if (c) {
                c.hidden = !newVis;
                c.visibleToPlayers = newVis;
                if (typeof renderCombatTracker === 'function') renderCombatTracker();
                if (typeof apiSaveCombat === 'function') apiSaveCombat();
            }
        }

        try {
            await fetch('/api/battlemap/tokens/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: tokenId, visibleToPlayers: newVis })
            });
            if (window.showToast) {
                window.showToast(newVis ? `👁️ ${token.name} is now visible to players` : `🙈 ${token.name} hidden from players (Stealth / Fog)`, "info");
            }
        } catch (err) {
            console.error(err);
        }
    }

    function setTokenVisibilityByCombatantId(combatantId, visibleToPlayers) {
        const token = (state.tokens || []).find(t => t.combatantId === combatantId);
        if (!token) return;
        token.visibleToPlayers = visibleToPlayers;
        updateTokenDOM(token);
        fetch('/api/battlemap/tokens/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: token.id, visibleToPlayers: visibleToPlayers })
        }).catch(console.error);
    }

    async function modifyTokenHp(tokenId, delta) {
        const token = (state.tokens || []).find(t => t.id === tokenId);
        if (!token) return;
        const newHp = Math.max(0, Math.min(token.maxHp, (token.currentHp || 0) + delta));
        token.currentHp = newHp;
        updateTokenDOM(token);

        // Bidirectional sync to Combat Tracker!
        if (window.appState && window.appState.combat && window.appState.combat.combatants) {
            const c = window.appState.combat.combatants.find(item => item.id === token.combatantId || item.name === token.name);
            if (c) {
                const oldHp = c.currentHp;
                c.currentHp = newHp;
                if (typeof renderCombatTracker === 'function') renderCombatTracker();
                if (typeof apiSaveCombat === 'function') apiSaveCombat();

                // Reactive lighting triggers
                const halfHp = Math.floor(c.maxHp / 2);
                if (window.LightingEngine && window.LightingEngine.reactiveCombat) {
                    if (oldHp > 0 && newHp === 0 && (c.type === 'monster' || c.type === 'boss')) {
                        window.LightingEngine.triggerDeathBlow(c.name);
                    } else if (oldHp > halfHp && newHp <= halfHp && newHp > 0) {
                        window.LightingEngine.triggerBloodiedPulse(c);
                    }
                }
            }
        }

        try {
            await fetch('/api/battlemap/tokens/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: tokenId, currentHp: newHp })
            });
        } catch (err) {
            console.error(err);
        }
    }

    function updateTokenHpByCombatantId(combatantId, newHp, maxHp) {
        const token = (state.tokens || []).find(t => t.combatantId === combatantId);
        if (token) {
            token.currentHp = newHp;
            if (maxHp !== undefined) token.maxHp = maxHp;
            updateTokenDOM(token);
            fetch('/api/battlemap/tokens/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: token.id, currentHp: newHp })
            }).catch(console.error);
        }
    }

    async function modifyTokenElevation(tokenId, delta) {
        const token = (state.tokens || []).find(t => t.id === tokenId);
        if (!token) return;
        const curElev = parseInt(token.elevation, 10) || 0;
        token.elevation = Math.max(-100, Math.min(500, curElev + delta));
        updateTokenDOM(token);
        try {
            await fetch('/api/battlemap/tokens/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: tokenId, elevation: token.elevation })
            });
            if (window.showToast) {
                window.showToast(`${token.name} altitude: ${token.elevation > 0 ? '+' : ''}${token.elevation} ft`, "info");
            }
        } catch (e) {
            console.error("Error updating token elevation:", e);
        }
    }

    async function promptTokenElevation(tokenId) {
        const token = (state.tokens || []).find(t => t.id === tokenId);
        if (!token) return;
        const curElev = parseInt(token.elevation, 10) || 0;
        const input = prompt(`Enter elevation for "${token.name}" in feet:\n• Positive numbers for flying/high ground (e.g. 30)\n• 0 for ground level\n• Negative numbers for burrowed/submerged (e.g. -10)`, curElev);
        if (input === null) return;
        const val = parseInt(input, 10);
        if (isNaN(val)) return;
        token.elevation = Math.max(-100, Math.min(500, val));
        updateTokenDOM(token);
        try {
            await fetch('/api/battlemap/tokens/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: tokenId, elevation: token.elevation })
            });
            if (window.showToast) {
                window.showToast(`${token.name} altitude set to ${token.elevation > 0 ? '+' : ''}${token.elevation} ft`, "info");
            }
        } catch (e) {
            console.error("Error setting token elevation:", e);
        }
    }

    function syncTokenConditionsByCombatantId(combatantId, conditions, isConcentrating) {
        const token = (state.tokens || []).find(t => t.combatantId === combatantId);
        if (!token) return;
        if (conditions !== undefined) token.conditions = conditions;
        if (isConcentrating !== undefined) token.concentrating = isConcentrating;
        updateTokenDOM(token);
    }

    async function deleteToken(tokenId) {
        state.tokens = (state.tokens || []).filter(t => t.id !== tokenId);
        renderDMTokens();

        try {
            await fetch(`/api/battlemap/tokens/${tokenId}`, { method: 'DELETE' });
        } catch (err) {
            console.error(err);
        }
    }

    async function clearAllTokens() {
        if (!confirm("Remove all tokens from the battlemap?")) return;
        state.tokens = [];
        renderDMTokens();

        try {
            await fetch('/api/battlemap/tokens/clear', { method: 'POST' });
        } catch (err) {
            console.error(err);
        }
    }

    function centerOnToken(tokenId) {
        const token = (state.tokens || []).find(t => t.id === tokenId);
        if (!token || !containerEl) return;
        const cWidth = containerEl.clientWidth || 1000;
        const cHeight = containerEl.clientHeight || 650;
        dmPanX = Math.round((cWidth / 2) - token.x * dmZoom);
        dmPanY = Math.round((cHeight / 2) - token.y * dmZoom);
        applyDMTransform();
    }

    function onTokenAdded(token) {
        if (!state.tokens) state.tokens = [];
        state.tokens.push(token);
        renderDMTokens();
    }

    function addTokens(newTokens) {
        if (!state.tokens) state.tokens = [];
        state.tokens.push(...newTokens);
        renderDMTokens();
        renderTokensDrawer();
    }

    function toggleTokensDrawer() {
        const drawer = document.getElementById('dm-tokens-drawer');
        if (!drawer) return;
        drawer.classList.toggle('hidden');
    }

    function renderTokensDrawer() {
        const container = document.getElementById('dm-tokens-drawer-list');
        if (!container) return;
        const tokens = state.tokens || [];

        if (tokens.length === 0) {
            container.innerHTML = `
                <div class="py-8 text-center text-slate-500 text-xs">
                    <span class="text-2xl block mb-1">👾</span>
                    No active tokens on map.<br>
                    <span class="text-[11px] text-slate-400">Click "+ Monster Token" or add from Bestiary.</span>
                </div>
            `;
            return;
        }

        container.innerHTML = tokens.map(t => {
            const isHidden = t.visibleToPlayers === false;
            const isBloodied = t.currentHp > 0 && t.currentHp <= Math.floor(t.maxHp / 2);
            const avatar = t.imageUrl || '';
            const initials = t.name ? t.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'M';
            const elev = parseInt(t.elevation, 10) || 0;
            const { badges } = getTokenConditionsAndAuras(t);

            return `
                <div class="flex items-center justify-between p-2 rounded-xl bg-ledger-900 border border-ledger-700/80 hover:border-amber-500/40 text-xs transition">
                    <div class="flex items-center gap-2.5 min-w-0 flex-1">
                        <div class="w-8 h-8 rounded-full border-2 border-amber-500/50 flex items-center justify-center shrink-0 overflow-hidden bg-ledger-950">
                            ${avatar ? `
                                <img src="${avatar}" alt="${t.name}" class="w-full h-full object-cover">
                            ` : `
                                <span class="font-bold text-[10px] text-amber-300 font-serif">${initials}</span>
                            `}
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <span class="font-bold text-slate-200 truncate">${t.name}</span>
                                <span class="text-[10px] text-slate-400 font-mono">(${t.size || 'Med'})</span>
                                ${badges.map(b => `<span title="${b.name}" class="text-[11px]">${b.emoji}</span>`).join('')}
                            </div>
                            <div class="flex items-center gap-2 text-[11px] font-mono mt-0.5 flex-wrap">
                                <div class="flex items-center gap-1">
                                    <span class="${isBloodied ? 'text-rose-400 font-bold' : 'text-emerald-400'}">HP ${t.currentHp}/${t.maxHp}</span>
                                    <div class="flex items-center gap-0.5 ml-0.5">
                                        <button onclick="window.BattlemapController.modifyTokenHp('${t.id}', -1)" class="w-4 h-4 rounded bg-ledger-800 hover:bg-rose-900 text-slate-300 font-bold text-[10px]">-</button>
                                        <button onclick="window.BattlemapController.modifyTokenHp('${t.id}', 1)" class="w-4 h-4 rounded bg-ledger-800 hover:bg-emerald-900 text-slate-300 font-bold text-[10px]">+</button>
                                    </div>
                                </div>
                                <div class="flex items-center gap-1 bg-sky-950/70 border border-sky-500/40 rounded px-1 text-[10px] text-sky-300" title="Token Altitude / Elevation">
                                    <button onclick="window.BattlemapController.modifyTokenElevation('${t.id}', -5)" class="hover:text-white font-bold px-0.5">-</button>
                                    <span onclick="window.BattlemapController.promptTokenElevation('${t.id}')" class="cursor-pointer hover:underline font-bold whitespace-nowrap">🪽${elev}ft</span>
                                    <button onclick="window.BattlemapController.modifyTokenElevation('${t.id}', 5)" class="hover:text-white font-bold px-0.5">+</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center gap-1 shrink-0 ml-2">
                        <button onclick="window.BattlemapController.centerOnToken('${t.id}')" title="Center map on token" class="p-1 rounded hover:bg-ledger-800 text-slate-400 hover:text-amber-400">
                            🎯
                        </button>
                        <button onclick="window.BattlemapController.toggleTokenVisibility('${t.id}')" title="${isHidden ? 'Show on Table Display' : 'Hide from Table Display (Stealth)'}" class="p-1 rounded hover:bg-ledger-800 ${isHidden ? 'text-slate-500' : 'text-emerald-400'}">
                            ${isHidden ? '🙈' : '👁️'}
                        </button>
                        <button onclick="window.BattlemapController.deleteToken('${t.id}')" title="Delete token" class="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Monster Spawner Modal
    function getMonstersList() {
        if (window.appState && Array.isArray(window.appState.monsters) && window.appState.monsters.length > 0) {
            return window.appState.monsters;
        }
        if (typeof appState !== 'undefined' && Array.isArray(appState.monsters) && appState.monsters.length > 0) {
            return appState.monsters;
        }
        return [];
    }

    async function openTokenSpawnerModal() {
        const modal = document.getElementById('spawn-token-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        const input = document.getElementById('token-spawner-search');
        if (input) {
            input.value = '';
            input.focus();
        }

        // If monsters list is empty, fetch from /api/monsters
        if (getMonstersList().length === 0) {
            try {
                const res = await fetch('/api/monsters');
                if (res.ok) {
                    const data = await res.json();
                    if (window.appState) window.appState.monsters = data;
                    if (typeof appState !== 'undefined') appState.monsters = data;
                }
            } catch (err) {
                console.error("Failed to load monsters:", err);
            }
        }
        filterTokenSpawner();
    }

    function filterTokenSpawner() {
        const container = document.getElementById('token-spawner-list');
        if (!container) return;
        const query = (document.getElementById('token-spawner-search')?.value || '').toLowerCase().trim();
        const monsters = getMonstersList();

        if (monsters.length === 0) {
            container.innerHTML = `<div class="py-8 text-center text-slate-500 text-xs">Loading bestiary monsters...</div>`;
            return;
        }

        const filtered = monsters.filter(m => {
            return !query || 
                (m.name && m.name.toLowerCase().includes(query)) ||
                (m.type && m.type.toLowerCase().includes(query)) ||
                (m.cr && m.cr.toString().toLowerCase().includes(query));
        }).slice(0, 50);

        if (filtered.length === 0) {
            container.innerHTML = `<div class="py-8 text-center text-slate-500 text-xs">No monsters match "${query}".</div>`;
            return;
        }

        container.innerHTML = filtered.map(m => `
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-ledger-950 border border-ledger-800 hover:border-emerald-500/50 transition">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <img src="${m.imageUrl || `/static/images/monsters/${m.id}.webp`}" alt="${m.name}" class="w-9 h-9 rounded-lg object-cover bg-neutral-900 shrink-0" onerror="this.src='/static/images/monsters/goblin.webp'">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5">
                            <span class="font-bold text-slate-200 text-xs truncate">${m.name}</span>
                            <span class="text-[10px] font-mono px-1 py-0.2 rounded bg-ledger-900 border border-ledger-700 text-amber-300 font-semibold">CR ${m.cr || '0'}</span>
                        </div>
                        <p class="text-[11px] text-slate-400 truncate">${m.size || 'Medium'} ${m.type || 'Creature'} • HP ${m.hp || 10}</p>
                    </div>
                </div>
                <button onclick="window.BattlemapController.spawnTokenFromModal('${m.id}')" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow shrink-0 ml-2 transition">
                    <span>+ Spawn Token</span>
                </button>
            </div>
        `).join('');
    }

    async function spawnTokenFromModal(monsterId) {
        if (window.closeModal) window.closeModal('spawn-token-modal');

        const monsters = getMonstersList();
        const monster = monsters.find(m => m.id === monsterId);
        if (!monster) return;

        // Calculate spawn position at the center of the current DM viewport
        const cWidth = containerEl ? containerEl.clientWidth : 1000;
        const cHeight = containerEl ? containerEl.clientHeight : 650;
        const spawnX = Math.round((-dmPanX + cWidth / 2) / dmZoom);
        const spawnY = Math.round((-dmPanY + cHeight / 2) / dmZoom);

        // Check if spawn location is shrouded in Fog of War!
        const inFog = isPointInFog(spawnX, spawnY);

        // Auto spawn combatant into combat tracker as well (hidden if in fog)!
        let combatantId = null;
        let combatantName = monster.name;
        let currentHp = monster.hp || 10;
        let maxHp = monster.hp || 10;

        try {
            const spawnRes = await fetch(`/api/monsters/${monster.id}/spawn`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ count: 1, hidden: inFog })
            });
            if (spawnRes.ok) {
                const spawnData = await spawnRes.json();
                if (spawnData.combat) {
                    if (window.appState) window.appState.combat = spawnData.combat;
                    if (typeof appState !== 'undefined') appState.combat = spawnData.combat;
                    if (typeof renderCombatTracker === 'function') renderCombatTracker();
                    const newlyAdded = (spawnData.combat.combatants || []).find(c => c.monsterId === monster.id || c.name.startsWith(monster.name));
                    if (newlyAdded) {
                        combatantId = newlyAdded.id;
                        combatantName = newlyAdded.name;
                        currentHp = newlyAdded.currentHp;
                        maxHp = newlyAdded.maxHp;
                    }
                }
            }
        } catch (e) {
            console.warn("Could not auto-spawn combatant:", e);
        }

        const crVal = parseFloat(monster.cr) || 0;
        const isBoss = crVal >= 10 || (monster.name && (monster.name.toLowerCase().includes('dragon') || monster.name.toLowerCase().includes('boss')));
        const color = isBoss ? '#a855f7' : '#ef4444';
        
        let squares = 1.0;
        const s = (monster.size || '').toLowerCase();
        if (s.includes('gargantuan')) squares = 4.0;
        else if (s.includes('huge')) squares = 3.0;
        else if (s.includes('large')) squares = 2.0;
        else if (s.includes('tiny')) squares = 0.8;

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
                    x: spawnX,
                    y: spawnY,
                    imageUrl: imageUrl,
                    currentHp: currentHp,
                    maxHp: maxHp,
                    color: color,
                    visibleToPlayers: !inFog
                })
            });

            if (res.ok) {
                const data = await res.json();
                onTokenAdded(data.token);
                if (window.showToast) {
                    if (inFog) {
                        window.showToast(`🙈 Spawned ${combatantName} in Fog of War (Hidden from Players)`, "info");
                    } else {
                        window.showToast(`👾 Spawned ${combatantName} to Battlemap & Combat!`, "success");
                    }
                }
            }
        } catch (err) {
            console.error(err);
        }
    }

    // -------------------------------------------------------------------------
    // MOUSE & DRAWING INTERACTIONS
    // -------------------------------------------------------------------------
    function screenToWorld(clientX, clientY) {
        const rect = viewportEl.getBoundingClientRect();
        const worldX = (clientX - rect.left) / dmZoom;
        const worldY = (clientY - rect.top) / dmZoom;
        return {
            x: Math.max(0, Math.min(mapWidth, Math.round(worldX))),
            y: Math.max(0, Math.min(mapHeight, Math.round(worldY)))
        };
    }

    function handleMouseDown(e) {
        // Middle click or Right click or Alt+Click initiates Pan
        if (e.button === 1 || e.button === 2 || e.altKey || e.ctrlKey) {
            isPanning = true;
            panStartX = e.clientX - dmPanX;
            panStartY = e.clientY - dmPanY;
            containerEl.style.cursor = 'grabbing';
            return;
        }

        if (e.button !== 0) return; // Only left click for tools

        const pos = screenToWorld(e.clientX, e.clientY);
        currentMouseX = pos.x;
        currentMouseY = pos.y;

        // Laser Ping Tool (or Shift+Click)
        if (currentTool === 'ping' || e.shiftKey) {
            triggerLaserPing(pos.x, pos.y);
            return;
        }

        // Save current mask to undo history
        saveHistory();

        isDrawing = true;
        lastDrawX = pos.x;
        lastDrawY = pos.y;

        if (currentTool === 'box') {
            boxStartX = pos.x;
            boxStartY = pos.y;
        } else if (currentTool === 'brush' || currentTool === 'shroud') {
            applyBrushStroke(pos.x, pos.y, pos.x, pos.y);
            renderDMFog();
        }
    }

    function handleMouseMove(e) {
        if (isPanning) {
            dmPanX = e.clientX - panStartX;
            dmPanY = e.clientY - panStartY;
            applyDMTransform();
            return;
        }

        const pos = screenToWorld(e.clientX, e.clientY);
        currentMouseX = pos.x;
        currentMouseY = pos.y;

        if (isDrawing) {
            if (currentTool === 'brush' || currentTool === 'shroud') {
                applyBrushStroke(lastDrawX, lastDrawY, pos.x, pos.y);
                lastDrawX = pos.x;
                lastDrawY = pos.y;
                renderDMFog();
            }
        }

        renderPreview();
    }

    function handleMouseUp(e) {
        if (isPanning) {
            isPanning = false;
            containerEl.style.cursor = 'crosshair';
            return;
        }

        if (!isDrawing) return;
        isDrawing = false;

        if (currentTool === 'box') {
            const minX = Math.min(boxStartX, currentMouseX);
            const minY = Math.min(boxStartY, currentMouseY);
            const w = Math.abs(currentMouseX - boxStartX);
            const h = Math.abs(currentMouseY - boxStartY);

            if (w > 5 && h > 5) {
                // Clear rectangle in fog mask
                offscreenCtx.save();
                offscreenCtx.globalCompositeOperation = 'destination-out';
                offscreenCtx.fillRect(minX, minY, w, h);
                offscreenCtx.restore();
                renderDMFog();
            }
        }

        renderPreview();
        pushFogMask();
    }

    function handleWheel(e) {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 1.12 : 0.88;
        const newZoom = Math.max(0.15, Math.min(3.5, dmZoom * zoomDelta));

        const rect = containerEl.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        dmPanX = mouseX - (mouseX - dmPanX) * (newZoom / dmZoom);
        dmPanY = mouseY - (mouseY - dmPanY) * (newZoom / dmZoom);
        dmZoom = newZoom;

        applyDMTransform();
    }

    function applyBrushStroke(x1, y1, x2, y2) {
        offscreenCtx.save();
        if (currentTool === 'brush') {
            offscreenCtx.globalCompositeOperation = 'destination-out';
        } else {
            offscreenCtx.globalCompositeOperation = 'source-over';
            offscreenCtx.fillStyle = '#000000';
            offscreenCtx.strokeStyle = '#000000';
        }

        offscreenCtx.lineWidth = brushRadius * 2;
        offscreenCtx.lineCap = 'round';
        offscreenCtx.lineJoin = 'round';

        offscreenCtx.beginPath();
        offscreenCtx.moveTo(x1, y1);
        offscreenCtx.lineTo(x2, y2);
        offscreenCtx.stroke();

        offscreenCtx.beginPath();
        offscreenCtx.arc(x2, y2, brushRadius, 0, Math.PI * 2);
        offscreenCtx.fill();

        offscreenCtx.restore();
    }

    // -------------------------------------------------------------------------
    // LASER PING SYSTEM
    // -------------------------------------------------------------------------
    function triggerLaserPing(x, y) {
        renderLocalPing(x, y, '#f59e0b');

        fetch('/api/battlemap/ping', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ x, y, color: '#f59e0b' })
        }).catch(console.error);
    }

    function renderLocalPing(x, y, color = '#f59e0b') {
        if (!pingLayerEl) return;
        const ring = document.createElement('div');
        ring.className = 'laser-ping-ring';
        ring.style.left = `${x}px`;
        ring.style.top = `${y}px`;
        ring.style.borderColor = color;
        ring.style.boxShadow = `0 0 25px ${color}, inset 0 0 15px ${color}`;

        const core = document.createElement('div');
        core.className = 'laser-ping-core';
        core.style.left = `${x}px`;
        core.style.top = `${y}px`;
        core.style.boxShadow = `0 0 20px ${color}`;

        pingLayerEl.appendChild(ring);
        pingLayerEl.appendChild(core);

        setTimeout(() => {
            ring.remove();
            core.remove();
        }, 1800);
    }

    // -------------------------------------------------------------------------
    // UNDO & FOG CONTROLS
    // -------------------------------------------------------------------------
    function saveHistory() {
        if (historyStack.length >= MAX_HISTORY) {
            historyStack.shift();
        }
        historyStack.push(offscreenFog.toDataURL('image/png'));
    }

    function undo() {
        if (historyStack.length === 0) return;
        const prevMask = historyStack.pop();
        const img = new Image();
        img.onload = () => {
            offscreenCtx.clearRect(0, 0, mapWidth, mapHeight);
            offscreenCtx.drawImage(img, 0, 0, mapWidth, mapHeight);
            renderDMFog();
            pushFogMask();
        };
        img.src = prevMask;
    }

    async function revealAll() {
        saveHistory();
        offscreenCtx.clearRect(0, 0, mapWidth, mapHeight);
        renderDMFog();
        try {
            await fetch('/api/battlemap/fog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ revealAll: true })
            });
        } catch (err) {
            console.error(err);
        }
    }

    async function resetFog() {
        saveHistory();
        offscreenCtx.fillStyle = '#000000';
        offscreenCtx.fillRect(0, 0, mapWidth, mapHeight);
        renderDMFog();
        try {
            await fetch('/api/battlemap/fog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reset: true })
            });
        } catch (err) {
            console.error(err);
        }
    }

    // -------------------------------------------------------------------------
    // TOOL SELECTION & UI SYNC
    // -------------------------------------------------------------------------
    function setTool(tool) {
        currentTool = tool;
        document.querySelectorAll('.dm-tool-btn').forEach(btn => {
            btn.classList.remove('bg-amber-500', 'text-ledger-950', 'font-bold');
            btn.classList.add('bg-ledger-800', 'text-slate-300');
        });
        const activeBtn = document.getElementById(`dm-tool-btn-${tool}`);
        if (activeBtn) {
            activeBtn.classList.remove('bg-ledger-800', 'text-slate-300');
            activeBtn.classList.add('bg-amber-500', 'text-ledger-950', 'font-bold');
        }
        renderPreview();
    }

    function setBrushRadius(val) {
        brushRadius = parseInt(val, 10);
        const label = document.getElementById('dm-brush-size-label');
        if (label) label.textContent = `${brushRadius}px`;
        renderPreview();
    }

    function setGridSize(val) {
        const size = parseInt(val, 10);
        state.gridSize = size;
        const label = document.getElementById('dm-grid-size-label');
        if (label) label.textContent = `${size}px`;
        renderGrid();
        renderDMTokens();
        pushStateUpdate({ gridSize: size });
    }

    function toggleGrid(visible) {
        state.gridVisible = visible;
        renderGrid();
        pushStateUpdate({ gridVisible: visible });
    }

    function setRotation(deg) {
        state.rotation = deg;
        document.querySelectorAll('.dm-rot-btn').forEach(btn => {
            btn.classList.remove('bg-amber-500', 'text-ledger-950');
            btn.classList.add('bg-ledger-800', 'text-slate-300');
        });
        const activeBtn = document.getElementById(`dm-rot-btn-${deg}`);
        if (activeBtn) {
            activeBtn.classList.remove('bg-ledger-800', 'text-slate-300');
            activeBtn.classList.add('bg-amber-500', 'text-ledger-950');
        }
        pushStateUpdate({ rotation: deg });
    }

    function toggleLock() {
        state.locked = !state.locked;
        updateLockBtn();
        pushStateUpdate({ locked: state.locked });
    }

    function updateLockBtn() {
        const btn = document.getElementById('dm-lock-viewport-btn');
        if (!btn) return;
        if (state.locked) {
            btn.className = "px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition";
            btn.innerHTML = `<span>🔒</span> <span>Table Viewport Locked</span>`;
        } else {
            btn.className = "px-3 py-1.5 rounded-lg bg-ledger-800 hover:bg-ledger-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-ledger-700 transition";
            btn.innerHTML = `<span>🔓</span> <span>Table Viewport Free</span>`;
        }
    }

    function syncViewportToTable() {
        pushStateUpdate({
            panX: Math.round(dmPanX),
            panY: Math.round(dmPanY),
            zoom: parseFloat(dmZoom.toFixed(2))
        });
    }

    function updateUIControls() {
        const gridInput = document.getElementById('dm-grid-size-slider');
        const gridLabel = document.getElementById('dm-grid-size-label');
        if (gridInput) gridInput.value = state.gridSize || 50;
        if (gridLabel) gridLabel.textContent = `${state.gridSize || 50}px`;

        const gridCheck = document.getElementById('dm-grid-visible-toggle');
        if (gridCheck) gridCheck.checked = state.gridVisible !== false;

        setRotation(state.rotation || 0);
        updateLockBtn();
    }

    // -------------------------------------------------------------------------
    // MAP LIBRARY & UPLOAD
    // -------------------------------------------------------------------------
    function populateMapDropdown() {
        const select = document.getElementById('dm-map-select');
        if (!select || !state.maps) return;

        select.innerHTML = state.maps.map(m => `
            <option value="${m.id}" ${m.id === state.activeMapId ? 'selected' : ''}>
                ${m.name}
            </option>
        `).join('');
    }

    async function onMapSelect(mapId) {
        try {
            const res = await fetch('/api/battlemap/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mapId })
            });
            if (res.ok) {
                const data = await res.json();
                state = data.state;
                loadActiveMap();
            }
        } catch (err) {
            console.error("Error selecting map:", err);
        }
    }

    async function handleFileDrop(e) {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            await uploadFile(files[0]);
        }
    }

    async function handleFileInput(input) {
        if (input.files && input.files.length > 0) {
            await uploadFile(input.files[0]);
        }
    }

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/battlemap/upload', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                state = data.state;
                populateMapDropdown();
                loadActiveMap();
            }
        } catch (err) {
            console.error("Error uploading battlemap:", err);
        }
    }

    // Public API
    return {
        init,
        setTool,
        setBrushRadius,
        setGridSize,
        toggleGrid,
        setRotation,
        toggleLock,
        syncViewportToTable,
        fitMapToWorkspace,
        undo,
        revealAll,
        resetFog,
        onMapSelect,
        handleFileInput,
        startTokenDrag,
        toggleTokenVisibility,
        modifyTokenHp,
        deleteToken,
        clearAllTokens,
        centerOnToken,
        onTokenAdded,
        addTokens,
        toggleTokensDrawer,
        openTokenSpawnerModal,
        filterTokenSpawner,
        spawnTokenFromModal,
        updateTokenHpByCombatantId,
        modifyTokenElevation,
        promptTokenElevation,
        syncTokenConditionsByCombatantId,
        renderDMTokens,
        isPointInFog,
        setTokenVisibilityByCombatantId,
        renderDMFog
    };
})();
