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
        templates: [],
        activeRuler: null,
        maps: []
    };

    // Tool state
    let currentTool = 'brush'; // 'brush', 'box', 'shroud', 'ping', 'ruler', 'template'
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

    // Tactical Ruler State
    let isRulerDragging = false;
    let rulerStartX = 0;
    let rulerStartY = 0;
    let broadcastRulerToTable = true;
    let activeRuler = null;

    // Spell AoE Template State
    let currentAoEShape = 'circle'; // 'circle', 'cone', 'cube', 'line'
    let currentAoESize = 20; // feet (radius for circle, size for cube)
    let currentAoELength = 60; // feet (for cone and line)
    let currentAoEWidth = 5; // feet (for line)
    let currentAoERotation = 0; // degrees
    let currentAoEColor = '#f97316';
    let currentAoELabel = 'Fireball (20ft)';
    let broadcastAoEToTable = true;
    let activeTemplate = null;
    let isAimingTemplate = false;
    let templateOriginX = 0;
    let templateOriginY = 0;
    let lastAimPushTime = 0;
    const activeStrideTokens = new Set();

    const SPELL_PRESETS = {
        'fireball': { name: 'Fireball', shape: 'circle', size: 20, color: '#f97316', label: 'Fireball (20ft r)' },
        'spirit_guardians': { name: 'Spirit Guardians', shape: 'circle', size: 15, color: '#eab308', label: 'Spirit Guardians (15ft r)' },
        'darkness': { name: 'Darkness / Fog Cloud', shape: 'circle', size: 15, color: '#64748b', label: 'Darkness (15ft r)' },
        'moonbeam': { name: 'Moonbeam', shape: 'circle', size: 5, color: '#38bdf8', label: 'Moonbeam (5ft r)' },
        'burning_hands': { name: 'Burning Hands / Breath', shape: 'cone', length: 15, color: '#ef4444', label: 'Burning Hands (15ft cone)' },
        'cone_of_cold': { name: 'Cone of Cold', shape: 'cone', length: 60, color: '#06b6d4', label: 'Cone of Cold (60ft cone)' },
        'lightning_bolt': { name: 'Lightning Bolt', shape: 'line', length: 100, width: 5, color: '#3b82f6', label: 'Lightning Bolt (100×5ft)' },
        'gust_of_wind': { name: 'Gust of Wind', shape: 'line', length: 60, width: 10, color: '#94a3b8', label: 'Gust of Wind (60×10ft)' },
        'faerie_fire': { name: 'Faerie Fire', shape: 'cube', size: 20, color: '#a855f7', label: 'Faerie Fire (20ft cube)' },
        'web': { name: 'Web', shape: 'cube', size: 20, color: '#84cc16', label: 'Web (20ft cube)' },
        'thunderwave': { name: 'Thunderwave', shape: 'cube', size: 15, color: '#14b8a6', label: 'Thunderwave (15ft cube)' }
    };

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
        setTool(currentTool || 'brush');

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

        // Close table settings popover on outside click
        document.addEventListener('click', (e) => {
            const popover = document.getElementById('dm-table-calibration-popover');
            const btn = document.getElementById('dm-table-settings-btn');
            if (popover && !popover.classList.contains('hidden')) {
                if (!popover.contains(e.target) && (!btn || !btn.contains(e.target))) {
                    popover.classList.add('hidden');
                }
            }
        });

        // Keyboard Shortcuts for Battlemap Overlays (M for Ruler, T for Template, Esc for Clear)
        window.addEventListener('keydown', (e) => {
            const active = document.activeElement;
            const isTyping = active && (
                active.tagName === 'INPUT' ||
                active.tagName === 'TEXTAREA' ||
                active.tagName === 'SELECT' ||
                active.isContentEditable
            );
            if (isTyping) return;

            const isBattlemapActive = (window.appState && (window.appState.activeTab === 'battlemap' || window.appState.activeTab === 'session'));
            if (!isBattlemapActive) return;

            if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                setTool('ruler');
            } else if (e.key === 't' || e.key === 'T') {
                e.preventDefault();
                setTool('template');
            } else if (e.key === 'b' || e.key === 'B') {
                e.preventDefault();
                setTool('brush');
            } else if (e.key === 's' || e.key === 'S') {
                e.preventDefault();
                setTool('shroud');
            } else if (e.key === 'x' || e.key === 'X') {
                e.preventDefault();
                setTool('box');
            } else if (e.key === 'Escape') {
                if (activeRuler || (state.templates && state.templates.length > 0)) {
                    e.preventDefault();
                    clearActiveOverlay();
                }
            }
        });
    }

    // -------------------------------------------------------------------------
    // API SYNC
    // -------------------------------------------------------------------------
    async function fetchState() {
        try {
            const res = await fetch('/api/battlemap');
            if (res.ok) {
                state = await res.json();
                if (!state.templates) state.templates = [];
                if (state.templates.length > 0) activeTemplate = state.templates[0];
                if (state.activeRuler) activeRuler = state.activeRuler;
                (state.tokens || []).forEach(t => {
                    if (t.strideActive) activeStrideTokens.add(t.id);
                });
                updateUIControls();
                renderDMTokens();
                renderPreview();
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

                let needsPreviewRerender = false;

                // Sync tokens if not currently dragging
                if (!draggedToken && newState.tokens) {
                    const localLen = (state.tokens || []).length;
                    const newLen = newState.tokens.length;
                    const tokensJson = JSON.stringify(newState.tokens);
                    if (localLen !== newLen) {
                        state.tokens = newState.tokens;
                        renderDMTokens();
                        needsPreviewRerender = true;
                    } else if (tokensJson !== JSON.stringify(state.tokens)) {
                        state.tokens = newState.tokens;
                        state.tokens.forEach(t => updateTokenDOM(t));
                        needsPreviewRerender = true;
                    }

                    // Sync stride active tokens
                    newState.tokens.forEach(t => {
                        if (t.strideActive) activeStrideTokens.add(t.id);
                        else activeStrideTokens.delete(t.id);
                    });
                }

                // Sync templates if changed remotely
                if (newState.templates !== undefined) {
                    const templatesJson = JSON.stringify(newState.templates);
                    if (templatesJson !== JSON.stringify(state.templates || [])) {
                        state.templates = newState.templates || [];
                        if (state.templates.length > 0) activeTemplate = state.templates[0];
                        needsPreviewRerender = true;
                    }
                }

                // Sync activeRuler if not dragging locally
                if (!isRulerDragging && newState.activeRuler !== undefined) {
                    const rulerJson = JSON.stringify(newState.activeRuler);
                    if (rulerJson !== JSON.stringify(activeRuler || null)) {
                        activeRuler = newState.activeRuler;
                        needsPreviewRerender = true;
                    }
                }

                // Sync companion battlemap access toggle
                if (newState.companionAccessEnabled !== undefined && newState.companionAccessEnabled !== state.companionAccessEnabled) {
                    state.companionAccessEnabled = newState.companionAccessEnabled;
                    updateCompanionAccessUI();
                }

                if (needsPreviewRerender) {
                    renderPreview();
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
        if (!isMapLoaded || state.fogEnabled === false || state.fogMask === "REVEALED_ALL") {
            return;
        }

        // Validate that offscreenFog contains actual shroud; never push a 100% transparent mask
        try {
            const imgData = offscreenCtx.getImageData(0, 0, mapWidth, mapHeight).data;
            let hasFog = false;
            const step = Math.max(1, Math.floor((mapWidth * mapHeight) / 5000));
            for (let i = 3; i < imgData.length; i += 4 * step) {
                if (imgData[i] > 10) {
                    hasFog = true;
                    break;
                }
            }
            if (!hasFog) {
                for (let i = 3; i < imgData.length; i += 4) {
                    if (imgData[i] > 10) {
                        hasFog = true;
                        break;
                    }
                }
            }
            if (!hasFog) {
                // If completely cleared, treat as revealAll
                await fetch('/api/battlemap/fog', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ revealAll: true, mapId: state.activeMapId })
                });
                return;
            }
        } catch (e) {
            // Fall through if getImageData fails (e.g. cross-origin canvas security)
        }

        const maskDataUrl = offscreenFog.toDataURL('image/png');
        try {
            await fetch('/api/battlemap/fog', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fogMask: maskDataUrl, mapId: state.activeMapId })
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

        const onImageReady = () => {
            mapWidth = mapImgEl.naturalWidth || 2000;
            mapHeight = mapImgEl.naturalHeight || 1500;

            // Set size of all canvases
            [gridCanvas, dmFogCanvas, previewCanvas, offscreenFog].forEach(c => {
                if (c) {
                    c.width = mapWidth;
                    c.height = mapHeight;
                }
            });

            viewportEl.style.width = `${mapWidth}px`;
            viewportEl.style.height = `${mapHeight}px`;

            isMapLoaded = true;

            if (state.fogEnabled === undefined || state.fogEnabled === null) {
                state.fogEnabled = true;
            }

            // Clear offscreen canvas first to avoid stale artifacts
            offscreenCtx.clearRect(0, 0, mapWidth, mapHeight);

            // Initialize Fog Mask
            if (state.fogMask && state.fogMask !== "REVEALED_ALL") {
                const img = new Image();
                img.onload = () => {
                    offscreenCtx.clearRect(0, 0, mapWidth, mapHeight);
                    offscreenCtx.drawImage(img, 0, 0, mapWidth, mapHeight);

                    // Self-healing: verify the loaded mask isn't completely transparent
                    let hasFog = false;
                    try {
                        const imgData = offscreenCtx.getImageData(0, 0, mapWidth, mapHeight).data;
                        const step = Math.max(1, Math.floor((mapWidth * mapHeight) / 5000));
                        for (let i = 3; i < imgData.length; i += 4 * step) {
                            if (imgData[i] > 10) {
                                hasFog = true;
                                break;
                            }
                        }
                        if (!hasFog) {
                            for (let i = 3; i < imgData.length; i += 4) {
                                if (imgData[i] > 10) {
                                    hasFog = true;
                                    break;
                                }
                            }
                        }
                    } catch (e) {
                        hasFog = true;
                    }

                    if (!hasFog) {
                        console.warn("Corrupted all-transparent fog mask detected. Re-initializing to 100% shroud.");
                        offscreenCtx.fillStyle = '#000000';
                        offscreenCtx.fillRect(0, 0, mapWidth, mapHeight);
                        state.fogMask = null;
                        if (state.activeMapId && state.mapFogMasks) {
                            state.mapFogMasks[state.activeMapId] = null;
                        }
                    }

                    renderDMFog();
                };
                img.src = state.fogMask;
            } else if (state.fogMask === "REVEALED_ALL" || state.fogEnabled === false) {
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

        mapImgEl.onload = onImageReady;
        if (!mapImgEl.src || !mapImgEl.src.endsWith(state.activeMapUrl)) {
            mapImgEl.src = state.activeMapUrl;
        }
        if (mapImgEl.complete && mapImgEl.naturalWidth > 0 && mapImgEl.src.endsWith(state.activeMapUrl)) {
            onImageReady();
        }
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

        if (state.fogEnabled === false || state.fogMask === "REVEALED_ALL") {
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
        if (state.fogEnabled === false || state.fogMask === "REVEALED_ALL") return false;
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

    // -------------------------------------------------------------------------
    // TACTICAL OVERLAYS DRAWING HELPERS (RULER, AOE TEMPLATES, STRIDE AURAS)
    // -------------------------------------------------------------------------
    function drawRuler(ctx, ruler, gridSize) {
        if (!ruler || !ruler.active) return;
        const x1 = ruler.startX;
        const y1 = ruler.startY;
        const x2 = ruler.endX;
        const y2 = ruler.endY;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distPx = Math.hypot(dx, dy);
        if (distPx < 3) return;

        const sq = distPx / gridSize;
        const feet = typeof ruler.distanceFeet === 'number' ? ruler.distanceFeet : Math.round(sq * 5);

        ctx.save();
        // Outer glow
        ctx.strokeStyle = 'rgba(2, 132, 199, 0.45)';
        ctx.lineWidth = 8 / dmZoom;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Core cyan laser line
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3 / dmZoom;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // 5ft / 1 square tick marks
        const unitX = dx / distPx;
        const unitY = dy / distPx;
        const perpX = -unitY;
        const perpY = unitX;
        const tickHalf = 6 / dmZoom;

        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 2 / dmZoom;
        for (let d = gridSize; d < distPx - 4; d += gridSize) {
            const tx = x1 + unitX * d;
            const ty = y1 + unitY * d;
            ctx.beginPath();
            ctx.moveTo(tx - perpX * tickHalf, ty - perpY * tickHalf);
            ctx.lineTo(tx + perpX * tickHalf, ty + perpY * tickHalf);
            ctx.stroke();
        }

        // Start & End points
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(x1, y1, 5 / dmZoom, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5 / dmZoom;
        ctx.beginPath();
        ctx.arc(x2, y2, 8 / dmZoom, 0, Math.PI * 2);
        ctx.stroke();

        // Distance Badge
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        drawAoEBadge(ctx, midX, midY - 14 / dmZoom, `📏 ${feet} ft (${sq.toFixed(1)} sq)`, '#38bdf8');
        ctx.restore();
    }

    function drawAoETemplate(ctx, tpl, gridSize, isGhost = false) {
        if (!tpl) return;
        const type = tpl.type || 'circle';
        const x = tpl.x;
        const y = tpl.y;
        const color = tpl.color || '#f97316';
        const label = tpl.label || 'Spell Effect';
        const rotationDeg = tpl.rotation || 0;
        const theta = rotationDeg * Math.PI / 180;
        const fillAlpha = isGhost ? 0.16 : 0.28;
        const strokeAlpha = isGhost ? 0.55 : 0.90;

        ctx.save();
        if (!isGhost) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 14;
        }

        if (type === 'circle') {
            const radiusFeet = tpl.radiusFeet || 20;
            const rPx = (radiusFeet / 5) * gridSize;

            ctx.fillStyle = hexToRgba(color, fillAlpha);
            ctx.beginPath();
            ctx.arc(x, y, rPx, 0, Math.PI * 2);
            ctx.fill();

            // Concentric guide ring
            ctx.strokeStyle = hexToRgba(color, 0.40);
            ctx.lineWidth = 1 / dmZoom;
            ctx.setLineDash([4 / dmZoom, 4 / dmZoom]);
            ctx.beginPath();
            ctx.arc(x, y, rPx * 0.5, 0, Math.PI * 2);
            ctx.stroke();

            // Outer boundary
            ctx.strokeStyle = hexToRgba(color, strokeAlpha);
            ctx.lineWidth = (isGhost ? 1.5 : 2.5) / dmZoom;
            ctx.setLineDash(isGhost ? [4 / dmZoom, 4 / dmZoom] : [8 / dmZoom, 4 / dmZoom]);
            ctx.beginPath();
            ctx.arc(x, y, rPx, 0, Math.PI * 2);
            ctx.stroke();

            drawAoEBadge(ctx, x, y, `${label} • ${radiusFeet}ft r`, color);

        } else if (type === 'cone') {
            const lengthFeet = tpl.lengthFeet || 60;
            const lenPx = (lengthFeet / 5) * gridSize;
            const alpha = 0.4636; // 26.565 deg (5e cone 53.13 deg arc)

            ctx.fillStyle = hexToRgba(color, fillAlpha);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(x, y, lenPx, theta - alpha, theta + alpha);
            ctx.closePath();
            ctx.fill();

            ctx.strokeStyle = hexToRgba(color, strokeAlpha);
            ctx.lineWidth = (isGhost ? 1.5 : 2.5) / dmZoom;
            ctx.setLineDash(isGhost ? [4 / dmZoom, 4 / dmZoom] : [8 / dmZoom, 4 / dmZoom]);
            ctx.stroke();

            // Direction arrow
            ctx.strokeStyle = hexToRgba(color, 0.5);
            ctx.lineWidth = 1.5 / dmZoom;
            ctx.setLineDash([3 / dmZoom, 3 / dmZoom]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(theta) * lenPx, y + Math.sin(theta) * lenPx);
            ctx.stroke();

            const badgeX = x + Math.cos(theta) * (lenPx * 0.55);
            const badgeY = y + Math.sin(theta) * (lenPx * 0.55);
            drawAoEBadge(ctx, badgeX, badgeY, `${label} • ${lengthFeet}ft cone`, color);

        } else if (type === 'cube') {
            const sizeFeet = tpl.radiusFeet || tpl.lengthFeet || 20;
            const sPx = (sizeFeet / 5) * gridSize;

            ctx.translate(x, y);
            ctx.rotate(theta);

            ctx.fillStyle = hexToRgba(color, fillAlpha);
            ctx.beginPath();
            ctx.rect(-sPx / 2, -sPx / 2, sPx, sPx);
            ctx.fill();

            ctx.strokeStyle = hexToRgba(color, strokeAlpha);
            ctx.lineWidth = (isGhost ? 1.5 : 2.5) / dmZoom;
            ctx.setLineDash(isGhost ? [4 / dmZoom, 4 / dmZoom] : [8 / dmZoom, 4 / dmZoom]);
            ctx.stroke();

            drawAoEBadge(ctx, 0, 0, `${label} • ${sizeFeet}ft cube`, color);

        } else if (type === 'line') {
            const lengthFeet = tpl.lengthFeet || 60;
            const widthFeet = tpl.widthFeet || 5;
            const lenPx = (lengthFeet / 5) * gridSize;
            const widthPx = Math.max(8, (widthFeet / 5) * gridSize);

            ctx.translate(x, y);
            ctx.rotate(theta);

            ctx.fillStyle = hexToRgba(color, fillAlpha);
            ctx.beginPath();
            ctx.rect(0, -widthPx / 2, lenPx, widthPx);
            ctx.fill();

            ctx.strokeStyle = hexToRgba(color, strokeAlpha);
            ctx.lineWidth = (isGhost ? 1.5 : 2.5) / dmZoom;
            ctx.setLineDash(isGhost ? [4 / dmZoom, 4 / dmZoom] : [6 / dmZoom, 3 / dmZoom]);
            ctx.stroke();

            drawAoEBadge(ctx, lenPx / 2, 0, `${label} • ${lengthFeet}×${widthFeet}ft`, color);
        }

        ctx.restore();
    }

    function drawAoEBadge(ctx, bx, by, text, color) {
        ctx.save();
        const fontSize = Math.max(9, Math.round(11 / dmZoom));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const m = ctx.measureText(text);
        const padX = 8 / dmZoom;
        const padY = 3 / dmZoom;
        const w = m.width + padX * 2;
        const h = fontSize + padY * 2 + 4 / dmZoom;

        ctx.fillStyle = 'rgba(10, 14, 20, 0.94)';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2 / dmZoom;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(bx - w / 2, by - h / 2, w, h, 6 / dmZoom);
        } else {
            ctx.rect(bx - w / 2, by - h / 2, w, h);
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, bx, by);
        ctx.restore();
    }

    function drawTokenStride(ctx, token, gridSize) {
        const speed = token.speed || 30;
        const walkPx = (speed / 5) * gridSize;
        const dashPx = walkPx * 2;
        const x = token.x;
        const y = token.y;

        ctx.save();
        // Walk circle (soft emerald)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
        ctx.beginPath();
        ctx.arc(x, y, walkPx, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2 / dmZoom;
        ctx.setLineDash([5 / dmZoom, 4 / dmZoom]);
        ctx.beginPath();
        ctx.arc(x, y, walkPx, 0, Math.PI * 2);
        ctx.stroke();

        // Dash circle (dashed cyan)
        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 1.5 / dmZoom;
        ctx.setLineDash([3 / dmZoom, 5 / dmZoom]);
        ctx.beginPath();
        ctx.arc(x, y, dashPx, 0, Math.PI * 2);
        ctx.stroke();

        drawAoEBadge(ctx, x, y - walkPx, `Walk ${speed}ft`, '#10b981');
        ctx.restore();
    }

    function hexToRgba(hex, alpha) {
        if (!hex) return `rgba(245, 158, 11, ${alpha})`;
        let c = hex.replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        const r = parseInt(c.substring(0, 2), 16) || 245;
        const g = parseInt(c.substring(2, 4), 16) || 158;
        const b = parseInt(c.substring(4, 6), 16) || 11;
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function renderPreview() {
        if (!isMapLoaded || !previewCtx) return;
        previewCtx.clearRect(0, 0, mapWidth, mapHeight);

        const gridSize = state.gridSize || 50;

        // 1. Render active Token Stride Ranges
        const tokens = state.tokens || [];
        tokens.forEach(t => {
            if (activeStrideTokens.has(t.id) || t.strideActive) {
                drawTokenStride(previewCtx, t, gridSize);
            }
        });

        // 2. Render persistent Spell AoE Templates
        const templates = state.templates || [];
        templates.forEach(tpl => {
            drawAoETemplate(previewCtx, tpl, gridSize);
        });

        // 3. Render persistent Ruler (if active and not currently drawing new ruler)
        if (activeRuler && activeRuler.active && !isRulerDragging) {
            drawRuler(previewCtx, activeRuler, gridSize);
        }

        // 4. Interactive Previews during Hover or Dragging
        if (currentTool === 'ruler' && isRulerDragging && activeRuler) {
            drawRuler(previewCtx, activeRuler, gridSize);
            return;
        }

        if (currentTool === 'template' && isAimingTemplate && activeTemplate) {
            // Draw active template with live aim rotation
            drawAoETemplate(previewCtx, activeTemplate, gridSize);

            // Draw interactive aiming ray & target reticle from origin to cursor
            const dx = currentMouseX - templateOriginX;
            const dy = currentMouseY - templateOriginY;
            const dist = Math.hypot(dx, dy);

            previewCtx.save();
            // Origin marker pin
            previewCtx.fillStyle = activeTemplate.color || '#f97316';
            previewCtx.beginPath();
            previewCtx.arc(templateOriginX, templateOriginY, 5 / dmZoom, 0, Math.PI * 2);
            previewCtx.fill();

            if (dist > 8) {
                // Dashed aiming guide line
                previewCtx.strokeStyle = activeTemplate.color || '#f97316';
                previewCtx.lineWidth = 2 / dmZoom;
                previewCtx.setLineDash([4 / dmZoom, 4 / dmZoom]);
                previewCtx.beginPath();
                previewCtx.moveTo(templateOriginX, templateOriginY);
                previewCtx.lineTo(currentMouseX, currentMouseY);
                previewCtx.stroke();

                // Target reticle ring at cursor
                previewCtx.strokeStyle = '#ffffff';
                previewCtx.lineWidth = 2 / dmZoom;
                previewCtx.beginPath();
                previewCtx.arc(currentMouseX, currentMouseY, 8 / dmZoom, 0, Math.PI * 2);
                previewCtx.stroke();

                // Live rotation badge floating near cursor
                drawAoEBadge(previewCtx, currentMouseX, currentMouseY - 14 / dmZoom, `🎯 ${currentAoERotation}°`, activeTemplate.color || '#f97316');
            }
            previewCtx.restore();
            return;
        }

        if (!isInsideCanvas && !isDrawing) return;

        if (currentTool === 'template' && !isAimingTemplate && !isDrawing) {
            const snap = findTokenAt(currentMouseX, currentMouseY);
            const hx = snap ? snap.x : currentMouseX;
            const hy = snap ? snap.y : currentMouseY;

            const hoverTpl = {
                type: currentAoEShape,
                x: hx,
                y: hy,
                radiusFeet: currentAoESize,
                lengthFeet: currentAoELength,
                widthFeet: currentAoEWidth,
                rotation: currentAoERotation,
                color: currentAoEColor,
                label: currentAoELabel
            };
            drawAoETemplate(previewCtx, hoverTpl, gridSize, true);

            // If snapping to a token, draw a distinct target lock ring and name badge
            if (snap) {
                previewCtx.save();
                previewCtx.strokeStyle = currentAoEColor;
                previewCtx.lineWidth = 2.5 / dmZoom;
                previewCtx.setLineDash([4 / dmZoom, 4 / dmZoom]);
                previewCtx.beginPath();
                const snapR = ((snap.sizeSquares || 1) * gridSize * 0.5) + (4 / dmZoom);
                previewCtx.arc(snap.x, snap.y, snapR, 0, Math.PI * 2);
                previewCtx.stroke();
                drawAoEBadge(previewCtx, snap.x, snap.y - snapR - 10 / dmZoom, `Target: ${snap.name}`, currentAoEColor);
                previewCtx.restore();
            }
        } else if (currentTool === 'brush' || currentTool === 'shroud') {
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

        if (tokensLayerEl) {
            const isOverlayTool = (currentTool === 'ruler' || currentTool === 'template' || currentTool === 'ping');
            tokensLayerEl.classList.toggle('tokens-tool-mode', isOverlayTool);
        }
    }

    function startTokenDrag(e, tokenId) {
        if (e.button !== 0) return; // Left click only

        // When measurement or spell AoE tool is active, don't drag the token.
        // Instead, forward to canvas tool so rulers and templates can anchor on tokens.
        if (currentTool === 'ruler' || currentTool === 'template' || currentTool === 'ping' || e.shiftKey) {
            handleMouseDown(e);
            return;
        }

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

        const startPos = screenToWorld(dragStartX, dragStartY);
        function onTokenMove(ev) {
            if (!draggedToken) return;
            const currentPos = screenToWorld(ev.clientX, ev.clientY);
            const deltaWorldX = currentPos.x - startPos.x;
            const deltaWorldY = currentPos.y - startPos.y;

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
                        <button onclick="window.BattlemapController.toggleTokenStride('${t.id}')" title="Toggle 30ft Walk / 60ft Dash Stride Range" class="p-1 rounded hover:bg-ledger-800 ${activeStrideTokens.has(t.id) || t.strideActive ? 'text-emerald-400 font-bold bg-emerald-950/80 border border-emerald-500/50' : 'text-slate-400 hover:text-emerald-400'}">
                            🏃
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
    function findTokenAt(worldX, worldY, hitRadiusFactor = 0.6) {
        const tokens = state.tokens || [];
        const gridSize = state.gridSize || 50;
        for (let i = tokens.length - 1; i >= 0; i--) {
            const t = tokens[i];
            if (t.x === undefined || t.y === undefined) continue;
            const sizeSquares = t.sizeSquares || 1.0;
            const radius = (sizeSquares * gridSize) * hitRadiusFactor;
            const dist = Math.hypot(worldX - t.x, worldY - t.y);
            if (dist <= radius) {
                return t;
            }
        }
        return null;
    }

    function screenToWorld(clientX, clientY) {
        if (!viewportEl) return { x: 0, y: 0 };
        const rect = viewportEl.getBoundingClientRect();
        if (!rect || rect.width === 0 || rect.height === 0) {
            return { x: 0, y: 0 };
        }
        const worldX = ((clientX - rect.left) / rect.width) * mapWidth;
        const worldY = ((clientY - rect.top) / rect.height) * mapHeight;
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

        // Tactical Ruler Measurement Tool
        if (currentTool === 'ruler') {
            const snap = findTokenAt(pos.x, pos.y);
            const startX = snap ? snap.x : pos.x;
            const startY = snap ? snap.y : pos.y;
            isRulerDragging = true;
            rulerStartX = startX;
            rulerStartY = startY;
            activeRuler = {
                startX: startX,
                startY: startY,
                endX: startX,
                endY: startY,
                distanceFeet: 0,
                distanceSquares: 0,
                visibleToPlayers: broadcastRulerToTable,
                active: true
            };
            updateRulerReadout(0, 0);
            renderPreview();
            pushRulerUpdate();
            return;
        }

        // Spell AoE Template Tool (Hold & Point to Aim)
        if (currentTool === 'template') {
            const snap = findTokenAt(pos.x, pos.y);
            templateOriginX = snap ? snap.x : pos.x;
            templateOriginY = snap ? snap.y : pos.y;
            isAimingTemplate = true;

            const tplId = activeTemplate ? activeTemplate.id : ('tpl_' + Math.random().toString(36).substr(2, 8));
            activeTemplate = {
                id: tplId,
                type: currentAoEShape,
                x: templateOriginX,
                y: templateOriginY,
                radiusFeet: currentAoESize,
                lengthFeet: currentAoELength,
                widthFeet: currentAoEWidth,
                rotation: currentAoERotation,
                color: currentAoEColor,
                label: currentAoELabel,
                visibleToPlayers: broadcastAoEToTable
            };
            state.templates = [activeTemplate];
            renderPreview();
            pushTemplateUpdate(activeTemplate);
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

        if (isRulerDragging) {
            const snap = findTokenAt(pos.x, pos.y);
            let endX = pos.x;
            let endY = pos.y;
            if (snap && (Math.hypot(snap.x - rulerStartX, snap.y - rulerStartY) > 5)) {
                endX = snap.x;
                endY = snap.y;
            }
            const dx = endX - rulerStartX;
            const dy = endY - rulerStartY;
            const distPx = Math.hypot(dx, dy);
            const sq = distPx / (state.gridSize || 50);
            const feet = Math.round(sq * 5);
            activeRuler = {
                startX: rulerStartX,
                startY: rulerStartY,
                endX: endX,
                endY: endY,
                distanceFeet: feet,
                distanceSquares: parseFloat(sq.toFixed(1)),
                visibleToPlayers: broadcastRulerToTable,
                active: true
            };
            updateRulerReadout(feet, sq);
            renderPreview();

            // Throttle live ruler measurement broadcast to player table screen (every ~120ms)
            const now = Date.now();
            if (broadcastRulerToTable && (now - lastAimPushTime > 120)) {
                lastAimPushTime = now;
                pushRulerUpdate();
            }
            return;
        }

        // Dynamic Hold-and-Point Aiming for Templates (Cones, Lines, Cubes)
        if (isAimingTemplate && activeTemplate) {
            const dx = pos.x - templateOriginX;
            const dy = pos.y - templateOriginY;
            const distPx = Math.hypot(dx, dy);

            // If mouse moved more than 6px from origin, dynamically rotate towards cursor
            if (distPx > 6) {
                let angleDeg = Math.round(Math.atan2(dy, dx) * 180 / Math.PI);
                if (angleDeg < 0) angleDeg += 360;
                currentAoERotation = angleDeg;
                activeTemplate.rotation = currentAoERotation;

                const rotEl = document.getElementById('dm-aoe-rot-val');
                if (rotEl) rotEl.textContent = `${currentAoERotation}°`;

                // Throttle live updates to the player table screen (every ~150ms)
                const now = Date.now();
                if (broadcastAoEToTable && (now - lastAimPushTime > 150)) {
                    lastAimPushTime = now;
                    pushTemplateUpdate(activeTemplate);
                }
            }

            renderPreview();
            return;
        }

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

        if (isRulerDragging) {
            isRulerDragging = false;
            renderPreview();
            pushRulerUpdate();
            return;
        }

        if (isAimingTemplate) {
            isAimingTemplate = false;
            if (activeTemplate) {
                pushTemplateUpdate(activeTemplate);
                if (window.showToast) {
                    const rotStr = (currentAoEShape === 'cone' || currentAoEShape === 'line' || currentAoEShape === 'cube') 
                        ? ` facing ${currentAoERotation}°` : '';
                    window.showToast(`✨ Placed ${activeTemplate.label}${rotStr}`, "success");
                }
            }
            renderPreview();
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
                body: JSON.stringify({ revealAll: true, mapId: state.activeMapId })
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
                body: JSON.stringify({ reset: true, mapId: state.activeMapId })
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
            btn.classList.remove('bg-amber-500', 'text-ledger-950', 'font-bold', 'shadow');
            btn.classList.add('text-slate-300');
        });
        const activeBtn = document.getElementById(`dm-tool-btn-${tool}`);
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-300');
            activeBtn.classList.add('bg-amber-500', 'text-ledger-950', 'font-bold', 'shadow');
        }

        if (tokensLayerEl) {
            const isOverlayTool = (tool === 'ruler' || tool === 'template' || tool === 'ping');
            tokensLayerEl.classList.toggle('tokens-tool-mode', isOverlayTool);
        }

        renderOverlayToolbar();
        renderPreview();
    }

    function renderOverlayToolbar() {
        const toolbar = document.getElementById('dm-aoe-ruler-toolbar');
        const container = document.getElementById('dm-overlay-controls');
        if (!toolbar || !container) return;

        toolbar.classList.remove('hidden');

        if (currentTool === 'brush') {
            container.innerHTML = `
                <div class="flex items-center justify-between w-full text-xs flex-wrap gap-2">
                    <div class="flex items-center gap-3 flex-wrap">
                        <span class="font-bold text-amber-400 flex items-center gap-1.5">
                            <span>🖌️</span>
                            <span>Reveal Fog Brush:</span>
                        </span>
                        <div class="flex items-center gap-2 bg-ledger-950 border border-ledger-700 px-2.5 py-1 rounded-lg text-xs font-mono">
                            <span class="text-slate-400 text-[11px]">Size:</span>
                            <input type="range" id="dm-brush-size-slider" min="15" max="250" value="${brushRadius}" oninput="window.BattlemapController.setBrushRadius(this.value)" class="w-20 h-1.5 bg-ledger-700 accent-amber-500 cursor-pointer">
                            <span id="dm-brush-size-label" class="text-amber-400 font-bold w-9 text-right text-[11px]">${brushRadius}px</span>
                        </div>
                        <div class="flex items-center gap-1 bg-ledger-950 border border-ledger-700 p-0.5 rounded-lg text-[11px]">
                            <button onclick="window.BattlemapController.setBrushRadius(30)" class="px-2 py-0.5 rounded ${brushRadius === 30 ? 'bg-amber-500 text-ledger-950 font-bold' : 'text-slate-400 hover:text-white'}">30px</button>
                            <button onclick="window.BattlemapController.setBrushRadius(60)" class="px-2 py-0.5 rounded ${brushRadius === 60 ? 'bg-amber-500 text-ledger-950 font-bold' : 'text-slate-400 hover:text-white'}">60px</button>
                            <button onclick="window.BattlemapController.setBrushRadius(120)" class="px-2 py-0.5 rounded ${brushRadius === 120 ? 'bg-amber-500 text-ledger-950 font-bold' : 'text-slate-400 hover:text-white'}">120px</button>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button onclick="window.BattlemapController.undo()" class="px-2.5 py-1 rounded-lg bg-ledger-800 hover:bg-ledger-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition" title="Undo last fog stroke">
                            <span>↩️ Undo</span>
                        </button>
                        <button onclick="window.BattlemapController.revealAll()" class="px-2.5 py-1 rounded-lg bg-ledger-800 hover:bg-amber-500/20 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition" title="Reveal entire map">
                            <span>👁️ Reveal All</span>
                        </button>
                        <button onclick="window.BattlemapController.resetFog()" class="px-2.5 py-1 rounded-lg bg-ledger-800 hover:bg-rose-900/40 text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition" title="Shroud entire map in darkness">
                            <span>🌑 Shroud All</span>
                        </button>
                    </div>
                </div>
            `;
        } else if (currentTool === 'shroud') {
            container.innerHTML = `
                <div class="flex items-center justify-between w-full text-xs flex-wrap gap-2">
                    <div class="flex items-center gap-3 flex-wrap">
                        <span class="font-bold text-rose-400 flex items-center gap-1.5">
                            <span>⬛</span>
                            <span>Re-Shroud Brush:</span>
                        </span>
                        <div class="flex items-center gap-2 bg-ledger-950 border border-ledger-700 px-2.5 py-1 rounded-lg text-xs font-mono">
                            <span class="text-slate-400 text-[11px]">Size:</span>
                            <input type="range" id="dm-brush-size-slider" min="15" max="250" value="${brushRadius}" oninput="window.BattlemapController.setBrushRadius(this.value)" class="w-20 h-1.5 bg-ledger-700 accent-rose-500 cursor-pointer">
                            <span id="dm-brush-size-label" class="text-rose-400 font-bold w-9 text-right text-[11px]">${brushRadius}px</span>
                        </div>
                        <div class="flex items-center gap-1 bg-ledger-950 border border-ledger-700 p-0.5 rounded-lg text-[11px]">
                            <button onclick="window.BattlemapController.setBrushRadius(30)" class="px-2 py-0.5 rounded ${brushRadius === 30 ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'}">30px</button>
                            <button onclick="window.BattlemapController.setBrushRadius(60)" class="px-2 py-0.5 rounded ${brushRadius === 60 ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'}">60px</button>
                            <button onclick="window.BattlemapController.setBrushRadius(120)" class="px-2 py-0.5 rounded ${brushRadius === 120 ? 'bg-rose-500 text-white font-bold' : 'text-slate-400 hover:text-white'}">120px</button>
                        </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button onclick="window.BattlemapController.undo()" class="px-2.5 py-1 rounded-lg bg-ledger-800 hover:bg-ledger-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 transition">
                            <span>↩️ Undo</span>
                        </button>
                        <button onclick="window.BattlemapController.resetFog()" class="px-2.5 py-1 rounded-lg bg-ledger-800 hover:bg-rose-900/40 text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition" title="Shroud entire map in darkness">
                            <span>🌑 Shroud All</span>
                        </button>
                    </div>
                </div>
            `;
        } else if (currentTool === 'box') {
            container.innerHTML = `
                <div class="flex items-center justify-between w-full text-xs flex-wrap gap-2">
                    <div class="flex items-center gap-3">
                        <span class="font-bold text-amber-400 flex items-center gap-1.5">
                            <span>🔲</span>
                            <span>Room Box Reveal:</span>
                        </span>
                        <span class="text-slate-400 text-[11px]">
                            Click & drag a rectangle across any room or corridor on the map to reveal it instantly.
                        </span>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button onclick="window.BattlemapController.undo()" class="px-2.5 py-1 rounded-lg bg-ledger-800 hover:bg-ledger-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1 transition">
                            <span>↩️ Undo</span>
                        </button>
                        <button onclick="window.BattlemapController.revealAll()" class="px-2.5 py-1 rounded-lg bg-ledger-800 hover:bg-amber-500/20 text-amber-300 text-[11px] font-semibold flex items-center gap-1 transition">
                            <span>👁️ Reveal All</span>
                        </button>
                    </div>
                </div>
            `;
        } else if (currentTool === 'ping') {
            container.innerHTML = `
                <div class="flex items-center gap-3 text-xs">
                    <span class="font-bold text-rose-400 flex items-center gap-1.5">
                        <span class="animate-pulse">🔴</span>
                        <span>Laser Ping Mode:</span>
                    </span>
                    <span class="text-slate-300 text-[11px]">
                        Click anywhere on the map (or hold <kbd class="bg-ledger-800 px-1.5 py-0.5 rounded text-amber-400 font-mono text-[10px]">Shift+Click</kbd> with any tool) to pulse an animated laser ping for players on the table screen.
                    </span>
                </div>
            `;
        } else if (currentTool === 'ruler') {
            const feet = activeRuler ? activeRuler.distanceFeet : 0;
            const sq = activeRuler ? activeRuler.distanceSquares : 0;
            container.innerHTML = `
                <div class="flex items-center justify-between w-full text-xs flex-wrap gap-2">
                    <div class="flex items-center gap-3">
                        <span class="font-bold text-sky-400 flex items-center gap-1.5">
                            <span>📏</span>
                            <span>Tactical Distance:</span>
                        </span>
                        <span id="dm-ruler-readout" class="font-mono font-bold text-sky-300 bg-sky-950/80 border border-sky-500/50 px-2.5 py-0.5 rounded-lg text-xs shadow-inner">
                            ${feet} ft (${sq} sq)
                        </span>
                        <span class="text-slate-400 text-[11px]">
                            Click & drag on ground or tokens to measure movement. Snaps to token centers.
                        </span>
                    </div>
                    <div class="flex items-center gap-2">
                        <label class="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-ledger-950 px-2.5 py-1 rounded-lg border border-ledger-700" title="Broadcast measurement line to Table TV">
                            <input type="checkbox" id="dm-overlay-table-sync-toggle" ${broadcastRulerToTable ? 'checked' : ''} onchange="window.BattlemapController.toggleOverlayTableSync(this.checked)" class="rounded bg-ledger-900 border-ledger-700 text-sky-500 focus:ring-0">
                            <span class="text-[11px] font-semibold text-sky-300">Broadcast to Table</span>
                        </label>
                        <button onclick="window.BattlemapController.clearActiveOverlay()" class="px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition">
                            <span>✕ Clear</span>
                        </button>
                    </div>
                </div>
            `;
        } else if (currentTool === 'template') {
            const isConeOrLine = currentAoEShape === 'cone' || currentAoEShape === 'line';
            const sizeVal = isConeOrLine ? currentAoELength : currentAoESize;
            const sizeLabel = currentAoEShape === 'line' ? 'Length' : (currentAoEShape === 'cone' ? 'Cone Len' : (currentAoEShape === 'cube' ? 'Cube Size' : 'Radius'));

            container.innerHTML = `
                <div class="flex items-center justify-between w-full text-xs flex-wrap gap-2">
                    <div class="flex items-center gap-2.5 flex-wrap">
                        <!-- Preset Selector -->
                        <div class="flex items-center gap-1.5 bg-ledger-950 border border-ledger-700 px-2 py-0.5 rounded-lg">
                            <span class="text-amber-400 font-semibold text-[11px]">Preset:</span>
                            <select onchange="window.BattlemapController.selectSpellPreset(this.value)" class="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer text-xs">
                                <option value="">-- 5.5e Presets --</option>
                                <option value="fireball">🔥 Fireball (20ft)</option>
                                <option value="spirit_guardians">✨ Spirit Guardians (15ft)</option>
                                <option value="darkness">🌑 Darkness / Fog (15ft)</option>
                                <option value="moonbeam">🌙 Moonbeam (5ft)</option>
                                <option value="burning_hands">🐉 Burning Hands (15ft)</option>
                                <option value="cone_of_cold">❄️ Cone of Cold (60ft)</option>
                                <option value="lightning_bolt">⚡ Lightning Bolt (100ft)</option>
                                <option value="gust_of_wind">💨 Gust of Wind (60ft)</option>
                                <option value="faerie_fire">🧚 Faerie Fire (20ft)</option>
                                <option value="web">🕸️ Web (20ft)</option>
                                <option value="thunderwave">💥 Thunderwave (15ft)</option>
                            </select>
                        </div>

                        <!-- Shape Buttons -->
                        <div class="flex items-center gap-0.5 bg-ledger-950 border border-ledger-700 p-0.5 rounded-lg">
                            <button onclick="window.BattlemapController.setAoEShape('circle')" class="px-2 py-0.5 rounded text-[11px] font-semibold ${currentAoEShape === 'circle' ? 'bg-amber-500 text-ledger-950 font-bold' : 'text-slate-300 hover:text-white'}">🟢 Sphere</button>
                            <button onclick="window.BattlemapController.setAoEShape('cone')" class="px-2 py-0.5 rounded text-[11px] font-semibold ${currentAoEShape === 'cone' ? 'bg-amber-500 text-ledger-950 font-bold' : 'text-slate-300 hover:text-white'}">📐 Cone</button>
                            <button onclick="window.BattlemapController.setAoEShape('cube')" class="px-2 py-0.5 rounded text-[11px] font-semibold ${currentAoEShape === 'cube' ? 'bg-amber-500 text-ledger-950 font-bold' : 'text-slate-300 hover:text-white'}">🔲 Cube</button>
                            <button onclick="window.BattlemapController.setAoEShape('line')" class="px-2 py-0.5 rounded text-[11px] font-semibold ${currentAoEShape === 'line' ? 'bg-amber-500 text-ledger-950 font-bold' : 'text-slate-300 hover:text-white'}">📏 Line</button>
                        </div>

                        <!-- Size Slider -->
                        <div class="flex items-center gap-1.5 bg-ledger-950 border border-ledger-700 px-2 py-0.5 rounded-lg font-mono text-[11px]">
                            <span class="text-slate-400 font-sans">${sizeLabel}:</span>
                            <input type="range" min="5" max="120" step="5" value="${sizeVal}" oninput="window.BattlemapController.setAoESize(this.value)" class="w-14 h-1 bg-ledger-700 accent-amber-500 cursor-pointer">
                            <span id="dm-aoe-size-val" class="text-amber-400 font-bold w-8 text-right">${sizeVal}ft</span>
                        </div>

                        <!-- Rotation Controls -->
                        ${isConeOrLine ? `
                            <div class="flex items-center gap-1 bg-ledger-950 border border-ledger-700 px-2 py-0.5 rounded-lg font-mono text-[11px]" title="Hold & point on the map to aim direction dynamically, or use ↺ / ↻">
                                <span class="text-slate-400 font-sans">Aim:</span>
                                <button onclick="window.BattlemapController.adjustAoERotation(-45)" title="Rotate -45°" class="hover:text-amber-400 px-0.5 font-bold">↺</button>
                                <span id="dm-aoe-rot-val" class="text-amber-400 font-bold px-0.5 w-8 text-center">${currentAoERotation}°</span>
                                <button onclick="window.BattlemapController.adjustAoERotation(45)" title="Rotate +45°" class="hover:text-amber-400 px-0.5 font-bold">↻</button>
                                <span class="text-slate-500 font-sans text-[10px] hidden md:inline ml-1 border-l border-ledger-700 pl-1">Hold & point</span>
                            </div>
                        ` : ''}

                        <!-- Color Swatches -->
                        <div class="flex items-center gap-1 bg-ledger-950 border border-ledger-700 px-2 py-0.5 rounded-lg">
                            ${['#f97316', '#06b6d4', '#eab308', '#a855f7', '#84cc16', '#3b82f6'].map(col => `
                                <button onclick="window.BattlemapController.setAoEColor('${col}')" style="background-color: ${col};" class="w-3.5 h-3.5 rounded-full ${currentAoEColor === col ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'} transition"></button>
                            `).join('')}
                        </div>
                    </div>

                    <div class="flex items-center gap-2">
                        <label class="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-ledger-950 px-2.5 py-1 rounded-lg border border-ledger-700" title="Broadcast spell template to Table TV">
                            <input type="checkbox" id="dm-overlay-table-sync-toggle" ${broadcastAoEToTable ? 'checked' : ''} onchange="window.BattlemapController.toggleOverlayTableSync(this.checked)" class="rounded bg-ledger-900 border-ledger-700 text-amber-500 focus:ring-0">
                            <span class="text-[11px] font-semibold text-amber-300">Broadcast</span>
                        </label>
                        <button onclick="window.BattlemapController.clearActiveOverlay()" class="px-2.5 py-1 rounded-lg bg-rose-950/70 hover:bg-rose-900 border border-rose-800 text-rose-300 text-[11px] font-semibold flex items-center gap-1 transition">
                            <span>✕ Clear</span>
                        </button>
                    </div>
                </div>
            `;
        }
    }

    function updateRulerReadout(feet, sq) {
        const el = document.getElementById('dm-ruler-readout');
        if (el) {
            el.textContent = `${feet} ft (${parseFloat(sq.toFixed(1))} sq)`;
        }
    }

    function selectSpellPreset(key) {
        if (!key || !SPELL_PRESETS[key]) return;
        const p = SPELL_PRESETS[key];
        currentAoEShape = p.shape;
        currentAoEColor = p.color;
        currentAoELabel = p.label;
        if (p.size) currentAoESize = p.size;
        if (p.length) currentAoELength = p.length;
        if (p.width) currentAoEWidth = p.width;

        if (activeTemplate) {
            activeTemplate.type = p.shape;
            activeTemplate.color = p.color;
            activeTemplate.label = p.label;
            if (p.size) activeTemplate.radiusFeet = p.size;
            if (p.length) activeTemplate.lengthFeet = p.length;
            if (p.width) activeTemplate.widthFeet = p.width;
            pushTemplateUpdate(activeTemplate);
        }

        renderOverlayToolbar();
        renderPreview();
    }

    function setAoEShape(shape) {
        currentAoEShape = shape;
        if (activeTemplate) {
            activeTemplate.type = shape;
            pushTemplateUpdate(activeTemplate);
        }
        renderOverlayToolbar();
        renderPreview();
    }

    function setAoESize(val) {
        const num = parseInt(val, 10);
        if (currentAoEShape === 'cone' || currentAoEShape === 'line') {
            currentAoELength = num;
            if (activeTemplate) activeTemplate.lengthFeet = num;
        } else {
            currentAoESize = num;
            if (activeTemplate) activeTemplate.radiusFeet = num;
        }
        const valEl = document.getElementById('dm-aoe-size-val');
        if (valEl) valEl.textContent = `${num}ft`;

        if (activeTemplate) pushTemplateUpdate(activeTemplate);
        renderPreview();
    }

    function adjustAoERotation(delta) {
        currentAoERotation = (currentAoERotation + delta + 360) % 360;
        const rotEl = document.getElementById('dm-aoe-rot-val');
        if (rotEl) rotEl.textContent = `${currentAoERotation}°`;
        if (activeTemplate) {
            activeTemplate.rotation = currentAoERotation;
            pushTemplateUpdate(activeTemplate);
        }
        renderPreview();
    }

    function setAoEColor(col) {
        currentAoEColor = col;
        if (activeTemplate) {
            activeTemplate.color = col;
            pushTemplateUpdate(activeTemplate);
        }
        renderOverlayToolbar();
        renderPreview();
    }

    function toggleOverlayTableSync(checked) {
        broadcastRulerToTable = checked;
        broadcastAoEToTable = checked;
        if (activeRuler) {
            activeRuler.visibleToPlayers = checked;
            pushRulerUpdate();
        }
        if (activeTemplate) {
            activeTemplate.visibleToPlayers = checked;
            pushTemplateUpdate(activeTemplate);
        }
    }

    function clearActiveOverlay() {
        isRulerDragging = false;
        isAimingTemplate = false;
        if (activeRuler) {
            activeRuler = null;
            pushRulerUpdate(false);
            updateRulerReadout(0, 0);
        }
        if (state.templates && state.templates.length > 0) {
            state.templates = [];
            activeTemplate = null;
            fetch('/api/battlemap/templates/clear', { method: 'POST' }).catch(console.error);
        }
        renderPreview();
        if (window.showToast) {
            window.showToast("Cleared active measurements and templates.", "info");
        }
    }

    function toggleTokenStride(tokenId) {
        const t = (state.tokens || []).find(tok => tok.id === tokenId);
        if (!t) return;
        if (activeStrideTokens.has(tokenId)) {
            activeStrideTokens.delete(tokenId);
            t.strideActive = false;
        } else {
            activeStrideTokens.add(tokenId);
            t.strideActive = true;
        }
        renderDMTokens();
        renderTokensDrawer();
        renderPreview();

        // Push token update to server so player table TV displays walk/dash circles
        fetch('/api/battlemap/tokens/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: tokenId, strideActive: t.strideActive })
        }).catch(console.error);
    }

    async function pushRulerUpdate(active = true) {
        if (activeRuler) {
            state.activeRuler = {
                ...activeRuler,
                active: active,
                visibleToPlayers: broadcastRulerToTable
            };
        } else {
            state.activeRuler = null;
        }
        try {
            await fetch('/api/battlemap/ruler', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state.activeRuler ? state.activeRuler : { active: false })
            });
        } catch (err) {
            console.error("Failed to push ruler update:", err);
        }
    }

    async function pushTemplateUpdate(tpl) {
        if (!tpl) return;
        const payload = {
            ...tpl,
            visibleToPlayers: broadcastAoEToTable
        };
        state.templates = [payload];
        try {
            await fetch('/api/battlemap/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.error("Failed to push template update:", err);
        }
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

    function toggleTableSettingsModal() {
        const popover = document.getElementById('dm-table-calibration-popover');
        if (popover) {
            popover.classList.toggle('hidden');
        }
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
            btn.className = "px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1 shadow transition";
            btn.innerHTML = `<span>🔒</span> <span>Table Locked</span>`;
            btn.title = "Table TV viewport is locked to prevent miniatures from shifting. Click to unlock.";
        } else {
            btn.className = "px-2.5 py-1 rounded-lg bg-ledger-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 border border-ledger-700 transition";
            btn.innerHTML = `<span>🔓</span> <span>Table Free</span>`;
            btn.title = "Table TV viewport is free. Click to lock viewport for physical miniatures.";
        }
    }

    function syncViewportToTable() {
        pushStateUpdate({
            panX: Math.round(dmPanX),
            panY: Math.round(dmPanY),
            zoom: parseFloat(dmZoom.toFixed(2))
        });
    }

    function updateCompanionAccessUI() {
        const btn = document.getElementById('dm-companion-map-toggle-btn');
        const textEl = document.getElementById('dm-companion-map-text');
        const iconEl = document.getElementById('dm-companion-map-icon');
        if (!btn) return;
        const isLive = Boolean(state.companionAccessEnabled);
        if (isLive) {
            btn.className = "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900/80 shadow-sm";
            btn.title = "Player mobile battlemap access is LIVE (Click to veil map from players)";
            if (textEl) textEl.textContent = "Mobile: Live";
            if (iconEl) iconEl.textContent = "🗺️";
        } else {
            btn.className = "px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition bg-ledger-800 text-slate-400 border-ledger-700 hover:text-slate-200";
            btn.title = "Player mobile battlemap access is OFF (Click to broadcast map to mobile)";
            if (textEl) textEl.textContent = "Mobile: Off";
            if (iconEl) iconEl.textContent = "📱";
        }
    }

    async function toggleCompanionAccess(explicitState) {
        try {
            const payload = explicitState !== undefined ? { enabled: Boolean(explicitState) } : {};
            const res = await fetch('/api/battlemap/toggle-companion-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                const data = await res.json();
                state.companionAccessEnabled = data.companionAccessEnabled;
                updateCompanionAccessUI();
                if (window.showToast) {
                    if (state.companionAccessEnabled) {
                        window.showToast("Tactical Battlemap is now LIVE on player companion screens!", "success");
                    } else {
                        window.showToast("Tactical Battlemap is now VEILED on player companion screens.", "info");
                    }
                }
            }
        } catch (err) {
            console.error("Error toggling companion map access:", err);
            if (window.showToast) window.showToast("Failed to toggle mobile battlemap access", "error");
        }
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
        updateCompanionAccessUI();
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
            if (isMapLoaded && state.activeMapId && state.fogEnabled !== false && state.fogMask !== "REVEALED_ALL") {
                await pushFogMask();
            }
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

    // -------------------------------------------------------------------------
    // PROCEDURAL BATTLEMAP GENERATOR & CATALOG
    // -------------------------------------------------------------------------
    const MAP_THEME_TITLES = {
        dungeon: [
            "Forgotten Crypt of the Iron Guard",
            "Catacombs of the Pale Lord",
            "Dungeon of the Crimson Vow",
            "The Sunken Sepulcher",
            "Vault of the Obsidian King",
            "Chamber of Whispering Skulls"
        ],
        cavern: [
            "Grotto of the Bioluminescent Fungi",
            "The Abyssal Chasm",
            "Underdark Smuggler's Crevasse",
            "Cavern of Echoing Drips",
            "Lair of the Web-Spinner",
            "The Sunless Spring Grotto"
        ],
        forest: [
            "Whispering Woods River Crossing",
            "The Emerald Clearing",
            "Shadowfen Bridge Ambush",
            "Druid's Ancient Oak Glade",
            "The Old King's Road Waystation",
            "Mistveil Hollow"
        ],
        tavern: [
            "The Gilded Tankard Taproom",
            "Smuggler's Cellar & Speakeasy",
            "The Boar's Tusk Roadhouse",
            "The Salty Mermaid Tavern",
            "Dragon's Breath Alehouse",
            "The Laughing Goblin Inn"
        ],
        arcane: [
            "Sanctum of the Astral Rift",
            "The Chronomancer's Observatory",
            "Void-Touched Summoning Chamber",
            "The Spire of Eldritch Runes",
            "Aetherium Core Pylon Chamber",
            "The Sealed Nether-Portal"
        ],
        ruins: [
            "Overgrown Temple of the Sun God",
            "Fallen Citadel Courtyard",
            "The Shattered Colonnade",
            "Moss-Grown Altar of the Ancients",
            "Ruins of the Wyrm-Keeper",
            "The Sunken Shrine of Oakhaven"
        ]
    };

    let currentGenTheme = 'dungeon';
    let previewDebounceTimer = null;
    let isPreviewLoading = false;
    let currentCatalog = [];

    function openMapGeneratorModal() {
        const modal = document.getElementById('map-generator-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        // Set default title if empty
        const titleInput = document.getElementById('gen-map-title');
        if (titleInput && !titleInput.value.trim()) {
            randomizeMapTitle();
        }

        // Set default seed if empty
        const seedInput = document.getElementById('gen-map-seed');
        if (seedInput && !seedInput.value) {
            rerollSeed();
        }

        switchMapModalTab('forge');
        triggerMapPreview();
    }

    function closeMapGeneratorModal() {
        const modal = document.getElementById('map-generator-modal');
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    function switchMapModalTab(tab) {
        const forgeTab = document.getElementById('map-modal-tab-forge');
        const catalogTab = document.getElementById('map-modal-tab-catalog');
        const forgeBtn = document.getElementById('map-modal-tab-btn-forge');
        const catalogBtn = document.getElementById('map-modal-tab-btn-catalog');

        if (tab === 'forge') {
            if (forgeTab) forgeTab.classList.remove('hidden');
            if (catalogTab) catalogTab.classList.add('hidden');
            if (forgeBtn) {
                forgeBtn.className = "px-3 py-1 rounded-lg font-semibold transition bg-amber-500 text-ledger-950 font-bold shadow";
            }
            if (catalogBtn) {
                catalogBtn.className = "px-3 py-1 rounded-lg font-semibold text-slate-300 hover:text-white transition";
            }
        } else {
            if (forgeTab) forgeTab.classList.add('hidden');
            if (catalogTab) catalogTab.classList.remove('hidden');
            if (forgeBtn) {
                forgeBtn.className = "px-3 py-1 rounded-lg font-semibold text-slate-300 hover:text-white transition";
            }
            if (catalogBtn) {
                catalogBtn.className = "px-3 py-1 rounded-lg font-semibold transition bg-amber-500 text-ledger-950 font-bold shadow";
            }
            fetchCatalogAndRender();
        }
    }

    function setGenTheme(theme) {
        currentGenTheme = theme;
        document.querySelectorAll('.map-theme-btn').forEach(btn => {
            const btnTheme = btn.getAttribute('data-theme');
            if (btnTheme === theme) {
                btn.className = "map-theme-btn p-2 rounded-xl border border-amber-500/80 bg-amber-500/10 text-amber-300 font-semibold flex flex-col items-center gap-1 text-center transition";
            } else {
                btn.className = "map-theme-btn p-2 rounded-xl border border-ledger-700 bg-ledger-950 hover:border-slate-500 text-slate-300 font-semibold flex flex-col items-center gap-1 text-center transition";
            }
        });

        // Update default lighting based on theme
        const lightingSelect = document.getElementById('gen-map-lighting');
        if (lightingSelect) {
            if (theme === 'arcane') lightingSelect.value = 'ethereal';
            else if (theme === 'cavern') lightingSelect.value = 'bioluminescent';
            else if (theme === 'forest') lightingSelect.value = 'bright';
            else if (theme === 'tavern') lightingSelect.value = 'torchlit';
            else if (theme === 'dungeon') lightingSelect.value = 'torchlit';
            else if (theme === 'ruins') lightingSelect.value = 'bright';
        }

        randomizeMapTitle();
        triggerMapPreview();
    }

    function randomizeMapTitle() {
        const pool = MAP_THEME_TITLES[currentGenTheme] || MAP_THEME_TITLES.dungeon;
        const randomTitle = pool[Math.floor(Math.random() * pool.length)];
        const input = document.getElementById('gen-map-title');
        if (input) input.value = randomTitle;
    }

    function rerollSeed() {
        const seedInput = document.getElementById('gen-map-seed');
        if (seedInput) {
            seedInput.value = Math.floor(100000 + Math.random() * 900000);
        }
        triggerMapPreview();
    }

    function setGridDimensions(w, h) {
        const wInput = document.getElementById('gen-map-width');
        const hInput = document.getElementById('gen-map-height');
        if (wInput) wInput.value = w;
        if (hInput) hInput.value = h;
        triggerMapPreviewDebounced();
    }

    function triggerMapPreviewDebounced() {
        if (previewDebounceTimer) clearTimeout(previewDebounceTimer);
        previewDebounceTimer = setTimeout(triggerMapPreview, 250);
    }

    async function triggerMapPreview() {
        const wInput = document.getElementById('gen-map-width');
        const hInput = document.getElementById('gen-map-height');
        const layoutSelect = document.getElementById('gen-map-layout');
        const lightingSelect = document.getElementById('gen-map-lighting');
        const waterCheck = document.getElementById('gen-map-water');
        const pillarsCheck = document.getElementById('gen-map-pillars');
        const seedInput = document.getElementById('gen-map-seed');
        const titleInput = document.getElementById('gen-map-title');
        const loadingEl = document.getElementById('gen-map-preview-loading');
        const svgBox = document.getElementById('gen-map-preview-svg-box');

        const widthSquares = parseInt(wInput ? wInput.value : 40, 10) || 40;
        const heightSquares = parseInt(hInput ? hInput.value : 30, 10) || 30;
        const layout = layoutSelect ? layoutSelect.value : 'multi_room';
        const lighting = lightingSelect ? lightingSelect.value : 'torchlit';
        const hasWater = waterCheck ? waterCheck.checked : false;
        const hasPillars = pillarsCheck ? pillarsCheck.checked : true;
        const seed = seedInput && seedInput.value ? parseInt(seedInput.value, 10) : undefined;
        const title = titleInput ? titleInput.value.trim() : "";

        if (loadingEl) loadingEl.classList.remove('hidden');

        try {
            const res = await fetch('/api/battlemap/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    theme: currentGenTheme,
                    title: title,
                    widthSquares: widthSquares,
                    heightSquares: heightSquares,
                    gridSize: 50,
                    layout: layout,
                    lighting: lighting,
                    hasWater: hasWater,
                    hasPillars: hasPillars,
                    seed: seed
                })
            });

            if (res.ok) {
                const data = await res.json();
                if (svgBox) {
                    svgBox.innerHTML = data.svg;
                    const svgEl = svgBox.querySelector('svg');
                    if (svgEl) {
                        svgEl.style.width = '100%';
                        svgEl.style.height = '100%';
                        svgEl.style.maxHeight = '520px';
                        svgEl.style.objectFit = 'contain';
                    }
                }
                const badge = document.getElementById('gen-preview-badge');
                if (badge) {
                    badge.textContent = `${widthSquares}×${heightSquares} (${widthSquares * 50}×${heightSquares * 50})`;
                }
                const themeBadge = document.getElementById('gen-preview-theme-badge');
                if (themeBadge) {
                    themeBadge.textContent = `${currentGenTheme.toUpperCase()} · ${lighting.toUpperCase()}`;
                }
                if (seedInput && data.seed) {
                    seedInput.value = data.seed;
                }
            }
        } catch (err) {
            console.error("Error previewing battlemap:", err);
        } finally {
            if (loadingEl) loadingEl.classList.add('hidden');
        }
    }

    async function deployGeneratedMap() {
        const wInput = document.getElementById('gen-map-width');
        const hInput = document.getElementById('gen-map-height');
        const layoutSelect = document.getElementById('gen-map-layout');
        const lightingSelect = document.getElementById('gen-map-lighting');
        const waterCheck = document.getElementById('gen-map-water');
        const pillarsCheck = document.getElementById('gen-map-pillars');
        const seedInput = document.getElementById('gen-map-seed');
        const titleInput = document.getElementById('gen-map-title');

        const widthSquares = parseInt(wInput ? wInput.value : 40, 10) || 40;
        const heightSquares = parseInt(hInput ? hInput.value : 30, 10) || 30;
        const layout = layoutSelect ? layoutSelect.value : 'multi_room';
        const lighting = lightingSelect ? lightingSelect.value : 'torchlit';
        const hasWater = waterCheck ? waterCheck.checked : false;
        const hasPillars = pillarsCheck ? pillarsCheck.checked : true;
        const seed = seedInput && seedInput.value ? parseInt(seedInput.value, 10) : undefined;
        const title = titleInput && titleInput.value.trim() ? titleInput.value.trim() : (MAP_THEME_TITLES[currentGenTheme] || ["Tactical Battlemap"])[0];

        try {
            const res = await fetch('/api/battlemap/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    theme: currentGenTheme,
                    title: title,
                    widthSquares: widthSquares,
                    heightSquares: heightSquares,
                    gridSize: 50,
                    layout: layout,
                    lighting: lighting,
                    hasWater: hasWater,
                    hasPillars: hasPillars,
                    seed: seed,
                    deployImmediately: true
                })
            });

            if (res.ok) {
                const data = await res.json();
                state = data.state;
                populateMapDropdown();
                loadActiveMap();
                closeMapGeneratorModal();
                if (window.showToast) {
                    window.showToast(`⚔️ Deployed "${data.map.name}" to Table TV & DM View!`, "success");
                }
            } else {
                const errData = await res.json();
                alert(`Map generation error: ${errData.detail || 'Failed'}`);
            }
        } catch (err) {
            console.error("Error generating and deploying battlemap:", err);
        }
    }

    async function saveGeneratedMapToCatalog() {
        const wInput = document.getElementById('gen-map-width');
        const hInput = document.getElementById('gen-map-height');
        const layoutSelect = document.getElementById('gen-map-layout');
        const lightingSelect = document.getElementById('gen-map-lighting');
        const waterCheck = document.getElementById('gen-map-water');
        const pillarsCheck = document.getElementById('gen-map-pillars');
        const seedInput = document.getElementById('gen-map-seed');
        const titleInput = document.getElementById('gen-map-title');

        const widthSquares = parseInt(wInput ? wInput.value : 40, 10) || 40;
        const heightSquares = parseInt(hInput ? hInput.value : 30, 10) || 30;
        const layout = layoutSelect ? layoutSelect.value : 'multi_room';
        const lighting = lightingSelect ? lightingSelect.value : 'torchlit';
        const hasWater = waterCheck ? waterCheck.checked : false;
        const hasPillars = pillarsCheck ? pillarsCheck.checked : true;
        const seed = seedInput && seedInput.value ? parseInt(seedInput.value, 10) : undefined;
        const title = titleInput && titleInput.value.trim() ? titleInput.value.trim() : (MAP_THEME_TITLES[currentGenTheme] || ["Tactical Battlemap"])[0];

        try {
            const res = await fetch('/api/battlemap/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    theme: currentGenTheme,
                    title: title,
                    widthSquares: widthSquares,
                    heightSquares: heightSquares,
                    gridSize: 50,
                    layout: layout,
                    lighting: lighting,
                    hasWater: hasWater,
                    hasPillars: hasPillars,
                    seed: seed,
                    deployImmediately: false
                })
            });

            if (res.ok) {
                const data = await res.json();
                state.maps = data.catalog;
                populateMapDropdown();
                if (window.showToast) {
                    window.showToast(`💾 Saved "${data.map.name}" to global map library!`, "success");
                }
                switchMapModalTab('catalog');
            } else {
                const errData = await res.json();
                alert(`Map save error: ${errData.detail || 'Failed'}`);
            }
        } catch (err) {
            console.error("Error saving battlemap to catalog:", err);
        }
    }

    async function fetchCatalogAndRender() {
        try {
            const res = await fetch('/api/battlemap/catalog');
            if (res.ok) {
                const data = await res.json();
                currentCatalog = data.catalog || [];
                const countBadge = document.getElementById('map-catalog-count-badge');
                if (countBadge) countBadge.textContent = currentCatalog.length;
                renderCatalogGrid();
            }
        } catch (err) {
            console.error("Error fetching map catalog:", err);
        }
    }

    function renderCatalogGrid() {
        const grid = document.getElementById('map-catalog-grid');
        if (!grid) return;

        if (!currentCatalog || currentCatalog.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full py-8 text-center text-slate-500 text-xs italic">
                    No maps found in catalog. Generate or upload a new battlemap to get started!
                </div>
            `;
            return;
        }

        grid.innerHTML = currentCatalog.map(m => {
            const isCurrent = state && state.activeMapId === m.id;
            const isPreset = m.type === 'preset';
            const themeLabel = (m.theme || 'custom').toUpperCase();
            const width = m.width || 2000;
            const height = m.height || 1500;
            const squaresW = Math.round(width / (m.defaultGridSize || 50));
            const squaresH = Math.round(height / (m.defaultGridSize || 50));

            return `
                <div class="bg-ledger-950 border ${isCurrent ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.25)]' : 'border-ledger-800'} rounded-2xl p-3 flex flex-col justify-between gap-2.5 transition hover:border-slate-600">
                    <div>
                        <div class="w-full h-32 rounded-xl bg-black border border-ledger-800 overflow-hidden relative mb-2">
                            <img src="${m.url}" alt="${m.name}" class="w-full h-full object-cover">
                            ${isCurrent ? `
                                <span class="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-ledger-950 shadow">
                                    ⚔️ Active on Table
                                </span>
                            ` : ''}
                            <span class="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase font-semibold bg-black/70 text-slate-300 border border-ledger-700 backdrop-blur-xs">
                                ${m.type || 'map'}
                            </span>
                        </div>
                        <h5 class="font-display font-bold text-slate-200 text-xs line-clamp-1">${m.name}</h5>
                        <div class="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-mono">
                            <span>${themeLabel}</span>
                            <span>•</span>
                            <span>${squaresW}×${squaresH} sq</span>
                        </div>
                    </div>

                    <div class="flex items-center gap-1.5 pt-2 border-t border-ledger-800/80">
                        <button type="button" onclick="window.BattlemapController.deployMapFromCatalog('${m.id}')" class="flex-1 py-1 rounded-lg ${isCurrent ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-ledger-800 hover:bg-ledger-700 text-slate-200 border border-ledger-700'} font-semibold text-xs transition flex items-center justify-center gap-1">
                            <span>⚔️</span>
                            <span>${isCurrent ? 'Active' : 'Deploy'}</span>
                        </button>
                        ${!isPreset ? `
                            <button type="button" onclick="window.BattlemapController.deleteMapFromCatalog('${m.id}')" class="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/30 transition text-xs" title="Delete map from catalog">
                                🗑️
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async function deployMapFromCatalog(mapId) {
        await onMapSelect(mapId);
        closeMapGeneratorModal();
        if (window.showToast) {
            const mapObj = currentCatalog.find(m => m.id === mapId);
            const name = mapObj ? mapObj.name : 'map';
            window.showToast(`⚔️ Deployed "${name}" to Table TV & DM View!`, "success");
        }
    }

    async function deleteMapFromCatalog(mapId) {
        const mapObj = currentCatalog.find(m => m.id === mapId);
        const name = mapObj ? mapObj.name : 'this map';
        if (!confirm(`Are you sure you want to delete "${name}" from the global catalog?`)) {
            return;
        }

        try {
            const res = await fetch(`/api/battlemap/catalog/${mapId}`, {
                method: 'DELETE'
            });
            if (res.ok) {
                const data = await res.json();
                currentCatalog = data.catalog;
                state.maps = data.catalog;
                populateMapDropdown();
                renderCatalogGrid();
                const countBadge = document.getElementById('map-catalog-count-badge');
                if (countBadge) countBadge.textContent = currentCatalog.length;
                if (window.showToast) {
                    window.showToast(`Deleted "${name}" from catalog.`, "info");
                }
            } else {
                const errData = await res.json();
                alert(errData.detail || "Failed to delete map");
            }
        } catch (err) {
            console.error("Error deleting map from catalog:", err);
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
        toggleCompanionAccess,
        updateCompanionAccessUI,
        toggleTableSettingsModal,
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
        renderDMFog,
        renderOverlayToolbar,
        updateRulerReadout,
        selectSpellPreset,
        setAoEShape,
        setAoESize,
        adjustAoERotation,
        setAoEColor,
        toggleOverlayTableSync,
        clearActiveOverlay,
        toggleTokenStride,
        openMapGeneratorModal,
        closeMapGeneratorModal,
        switchMapModalTab,
        setGenTheme,
        randomizeMapTitle,
        rerollSeed,
        setGridDimensions,
        triggerMapPreviewDebounced,
        triggerMapPreview,
        deployGeneratedMap,
        saveGeneratedMapToCatalog,
        fetchCatalogAndRender,
        renderCatalogGrid,
        deleteMapFromCatalog,
        getMaps: () => state.maps,
        getActiveMapId: () => state.activeMapId,
        getActiveMapName: () => state.activeMapName,
        getState: () => state
    };
})();
