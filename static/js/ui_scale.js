/**
 * Arcane Ledger - Independent Window UI Scale & HiDPI Engine
 * 
 * Provides isolated, per-window UI scaling tailored for 4K and High-DPI monitors.
 * Prevents browser cross-window zoom synchronization (which inadvertently zooms
 * tabletop battlemaps and player displays when scaling the DM screen).
 */
(function(window) {
    'use strict';

    const PRESETS = [
        { label: '80% (Compact)', value: 0.8 },
        { label: '100% (Standard 1080p)', value: 1.0 },
        { label: '115% (Comfortable)', value: 1.15 },
        { label: '125% (1440p / Small 4K)', value: 1.25 },
        { label: '140% (4K Recommended)', value: 1.4 },
        { label: '150% (High-DPI 4K / TV)', value: 1.5 },
        { label: '175% (Ultra Large)', value: 1.75 },
        { label: '200% (Maximum 2x)', value: 2.0 }
    ];

    let currentScale = 1.0;
    let config = {
        view: 'dm', // 'dm', 'player', 'companion', 'map'
        storageKey: 'arcane_ui_scale_dm',
        minScale: 0.7,
        maxScale: 2.5,
        step: 0.1,
        allowKeyboardZoom: true,
        enablePinchZoom: true,
        showHudToast: true
    };

    let toastTimeout = null;

    function getStorageKey(view) {
        return `arcane_ui_scale_${view || 'dm'}`;
    }

    function applyScale(scale, notify = true) {
        scale = Math.min(Math.max(scale, config.minScale), config.maxScale);
        scale = Math.round(scale * 100) / 100;
        currentScale = scale;

        // Apply CSS zoom to document root (supported natively in Chromium, Safari, Firefox 126+)
        document.documentElement.style.zoom = String(scale);

        // Save preference per window view
        try {
            localStorage.setItem(config.storageKey, String(scale));
        } catch (e) {
            console.warn('[ArcaneScale] Unable to save to localStorage:', e);
        }

        // Update UI labels if present in DOM
        updateUILabels();

        // Dispatch custom event for views that need to recalculate canvas or layout coordinates
        window.dispatchEvent(new CustomEvent('arcane:uiscale', {
            detail: { scale: currentScale, view: config.view }
        }));

        if (notify && config.showHudToast) {
            showToast(`${Math.round(currentScale * 100)}%`);
        }
    }

    function updateUILabels() {
        const percentStr = `${Math.round(currentScale * 100)}%`;
        const labelEl = document.getElementById('topbar-zoom-label');
        if (labelEl) labelEl.textContent = percentStr;

        // Update active highlight on preset items
        const presetItems = document.querySelectorAll('.ui-scale-preset-item');
        presetItems.forEach(item => {
            const val = parseFloat(item.getAttribute('data-scale'));
            if (!isNaN(val) && Math.abs(val - currentScale) < 0.04) {
                item.classList.add('bg-amber-500/20', 'text-amber-300', 'font-bold');
                item.classList.remove('text-slate-300');
            } else {
                item.classList.remove('bg-amber-500/20', 'text-amber-300', 'font-bold');
                item.classList.add('text-slate-300');
            }
        });
    }

    function showToast(text) {
        let toast = document.getElementById('arcane-scale-hud-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'arcane-scale-hud-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: rgba(15, 20, 28, 0.95);
                border: 1px solid rgba(245, 158, 11, 0.6);
                box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 15px rgba(245, 158, 11, 0.2);
                color: #fbbf24;
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                font-weight: 700;
                font-size: 13px;
                padding: 7px 15px;
                border-radius: 9999px;
                z-index: 999999;
                pointer-events: none;
                opacity: 0;
                transform: translateY(8px) scale(0.95);
                transition: opacity 0.16s ease-out, transform 0.16s ease-out;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            document.body.appendChild(toast);
        }

        toast.innerHTML = `<span style="font-size: 14px;">🔍</span><span>UI Scale: ${text}</span>`;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0) scale(1)';

        if (toastTimeout) clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(8px) scale(0.95)';
        }, 1200);
    }

    function zoomIn() {
        applyScale(currentScale + config.step);
    }

    function zoomOut() {
        applyScale(currentScale - config.step);
    }

    function reset() {
        applyScale(1.0);
    }

    function setScale(scale) {
        applyScale(scale);
    }

    /**
     * Resolves an isolated loopback URL so Chrome keeps an independent host-zoom table.
     */
    function getIsolatedUrl(path) {
        const port = window.location.port ? `:${window.location.port}` : '';
        const host = window.location.hostname;
        const protocol = window.location.protocol;

        if (host === '127.0.0.1') {
            return `${protocol}//localhost${port}${path}`;
        } else if (host === 'localhost') {
            return `${protocol}//127.0.0.1${port}${path}`;
        }
        return path;
    }

    function init(userOptions = {}) {
        config = Object.assign({}, config, userOptions);
        config.storageKey = getStorageKey(config.view);

        // Load saved scale from localStorage
        let savedScale = null;
        try {
            const raw = localStorage.getItem(config.storageKey);
            if (raw) savedScale = parseFloat(raw);
        } catch (e) {}

        if (savedScale && !isNaN(savedScale) && savedScale >= config.minScale && savedScale <= config.maxScale) {
            applyScale(savedScale, false);
        } else if (config.defaultScale) {
            applyScale(config.defaultScale, false);
        } else {
            applyScale(1.0, false);
        }

        // Global Keydown Handler: Intercepts Cmd/Ctrl +/-/0 to prevent Chromium origin-zoom
        window.addEventListener('keydown', function(e) {
            const isModifier = e.metaKey || e.ctrlKey;
            if (!isModifier) return;

            // Allow Shift+Cmd+0 to pass through to the browser so the user can reset Chrome's host zoom if needed
            if (e.shiftKey && (e.key === '0' || e.code === 'Digit0')) {
                return;
            }

            // Zoom In: Cmd + / Cmd = / NumpadAdd
            if (e.key === '=' || e.key === '+' || e.code === 'Equal' || e.code === 'NumpadAdd') {
                e.preventDefault();
                e.stopPropagation();
                if (config.allowKeyboardZoom) {
                    zoomIn();
                }
            }
            // Zoom Out: Cmd - / NumpadSubtract
            else if (e.key === '-' || e.key === '_' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
                e.preventDefault();
                e.stopPropagation();
                if (config.allowKeyboardZoom) {
                    zoomOut();
                }
            }
            // Reset: Cmd 0
            else if (e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0') {
                e.preventDefault();
                e.stopPropagation();
                if (config.allowKeyboardZoom) {
                    reset();
                }
            }
        }, { capture: true, passive: false });

        // Optional trackpad pinch / Ctrl+Wheel zoom
        if (config.enablePinchZoom) {
            window.addEventListener('wheel', function(e) {
                if (e.ctrlKey) {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!config.allowKeyboardZoom) return;
                    const delta = e.deltaY < 0 ? 0.05 : -0.05;
                    applyScale(currentScale + delta);
                }
            }, { passive: false });
        }

        // Synchronize DOM elements when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateUILabels);
        } else {
            updateUILabels();
        }
    }

    // Export module
    window.ArcaneScale = {
        init,
        zoomIn,
        zoomOut,
        reset,
        setScale,
        getScale: () => currentScale,
        getIsolatedUrl,
        PRESETS
    };
})(window);
