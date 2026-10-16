#!/usr/bin/env python3
"""
Arcane Ledger - Dedicated Native Desktop Launcher
Provides a zero-configuration desktop app window for the DM Master Command Center.
Works on Windows, macOS, and Linux in both live dev mode and compiled PyInstaller builds.
"""

import os
import sys
import time
import socket
import logging
import traceback
import subprocess
import threading
import urllib.request
from pathlib import Path
from typing import Optional, Dict, Any, List

# Explicit top-level imports ensure PyInstaller static analyzer bundles these modules
import uvicorn
import map_generator
import updater
import app

# Determine directory paths
if getattr(sys, "frozen", False):
    RESOURCE_DIR = Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))
    if sys.platform == "darwin":
        # On macOS, store writable data in ~/Documents/ArcaneLedger to avoid read-only bundle translocation
        BASE_DIR = Path.home() / "Documents" / "ArcaneLedger"
    else:
        BASE_DIR = Path(sys.executable).resolve().parent
else:
    RESOURCE_DIR = Path(__file__).resolve().parent
    BASE_DIR = RESOURCE_DIR

try:
    BASE_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass

# Setup dual file and console logging for crash diagnostics
LOG_FILE = BASE_DIR / "launcher.log"
logger = logging.getLogger()
logger.setLevel(logging.INFO)
formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

try:
    file_handler = logging.FileHandler(str(LOG_FILE), encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
except Exception:
    pass

console_handler = logging.StreamHandler(sys.stdout)
console_handler.setFormatter(formatter)
logger.addHandler(console_handler)

logging.info(f"Arcane Ledger Desktop Launcher starting. Frozen={getattr(sys, 'frozen', False)}, Platform={sys.platform}")
logging.info(f"RESOURCE_DIR={RESOURCE_DIR}, BASE_DIR={BASE_DIR}")

PORT = 8000
HOST = "127.0.0.1"
URL = f"http://{HOST}:{PORT}"

backend_error = None
server_instance = None

def is_server_running(host=HOST, port=PORT, timeout=1.0) -> bool:
    """Check if Arcane Ledger backend is active and responding to HTTP requests."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            pass
    except (OSError, ConnectionRefusedError):
        return False

    # Confirm it's actually an Arcane Ledger server responding
    try:
        req = urllib.request.Request(f"http://{host}:{port}/api/auth/status")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status in (200, 401, 403)
    except Exception:
        # Fallback check on root URL
        try:
            req = urllib.request.Request(f"http://{host}:{port}/")
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status == 200
        except Exception:
            return False

def wait_for_server(timeout=15.0) -> bool:
    """Wait until the FastAPI backend responds to HTTP requests."""
    start = time.time()
    while time.time() - start < timeout:
        if backend_error:
            logging.error(f"Backend startup encountered an error: {backend_error}")
            return False
        if is_server_running():
            logging.info("Backend HTTP healthcheck passed.")
            return True
        time.sleep(0.25)
    return False

def start_backend_frozen():
    """In frozen PyInstaller mode, run uvicorn in a worker thread."""
    global backend_error, server_instance
    try:
        logging.info("Starting uvicorn server in background thread...")
        if str(RESOURCE_DIR) not in sys.path:
            sys.path.insert(0, str(RESOURCE_DIR))
        config = uvicorn.Config(
            app.app,
            host="0.0.0.0",
            port=PORT,
            log_level="warning",
            loop="asyncio"
        )
        server_instance = uvicorn.Server(config)
        server_instance.run()
    except Exception as e:
        backend_error = traceback.format_exc()
        logging.error(f"Fatal exception in backend server thread:\n{backend_error}")

def find_app_browser() -> Optional[str]:
    """Find a Chromium-based browser supporting --app mode."""
    candidates = []
    
    if sys.platform == "win32":
        candidates = [
            # Edge
            r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
            r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
            # Chrome
            r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
            # Brave
            r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
            os.path.expandvars(r"%LOCALAPPDATA%\BraveSoftware\Brave-Browser\Application\brave.exe"),
        ]
    elif sys.platform == "darwin":
        candidates = [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
        ]
    else:  # Linux
        for name in ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge"]:
            path = shutil_which(name)
            if path:
                candidates.append(path)

    for path in candidates:
        if path and os.path.isfile(path) and os.access(path, os.X_OK if sys.platform != "win32" else os.F_OK):
            return path
    return None

def shutil_which(cmd):
    """Fallback which implementation."""
    import shutil
    return shutil.which(cmd)

def show_alert_dialog(title: str, message: str):
    """Show native alert dialog if startup fails."""
    logging.error(f"Alert Dialog: [{title}] {message}")
    if sys.platform == "darwin":
        clean_msg = message.replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n')
        clean_title = title.replace('\\', '\\\\').replace('"', '\\"')
        script = f'display alert "{clean_title}" message "{clean_msg}" as critical'
        try:
            subprocess.run(["osascript", "-e", script], check=False)
        except Exception:
            pass
    elif sys.platform == "win32":
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, message, title, 0x10)
        except Exception:
            pass

def is_browser_running_for_profile(profile_dir: Path) -> bool:
    """Check if Chromium is actively running with the specified user-data-dir."""
    # 1. Check Chromium's SingletonLock symlink (target is hostname-pid)
    lock_file = profile_dir / "SingletonLock"
    if lock_file.is_symlink():
        try:
            target = os.readlink(str(lock_file))
            pid_str = target.rsplit("-", 1)[-1]
            pid = int(pid_str)
            os.kill(pid, 0)
            return True
        except (ValueError, OSError):
            pass
    elif lock_file.exists():
        return True

    # 2. Check pgrep on POSIX for matching profile path
    if sys.platform != "win32":
        try:
            res = subprocess.run(["pgrep", "-f", str(profile_dir)], capture_output=True, text=True)
            if res.returncode == 0 and res.stdout.strip():
                return True
        except Exception:
            pass

    return False

def keep_process_alive_while_browser_running(profile_dir: Path):
    """Keep the server process alive as long as the browser window is active."""
    # Give the browser up to 10 seconds to start and create its profile directory lock
    for _ in range(20):
        time.sleep(0.5)
        if is_browser_running_for_profile(profile_dir):
            break

    logging.info("Browser process detected. Server keepalive active.")
    consecutive_misses = 0
    try:
        while True:
            time.sleep(1.0)
            if is_browser_running_for_profile(profile_dir):
                consecutive_misses = 0
            else:
                consecutive_misses += 1
                # If profile lock is absent for 3 consecutive seconds, window was closed
                if consecutive_misses >= 3:
                    logging.info("Browser window closed. Exiting desktop launcher.")
                    break
    except KeyboardInterrupt:
        logging.info("Shutdown requested via KeyboardInterrupt.")

class DesktopBridge:
    """JS-to-Python bridge exposed to pywebview to handle external windows."""
    def open_browser_window(self, url: str):
        try:
            import webbrowser
            logging.info(f"DesktopBridge opening external display in default browser: {url}")
            webbrowser.open(url)
        except Exception as e:
            logging.error(f"DesktopBridge error opening browser: {e}")

def launch_native_window() -> bool:
    """Launch a true native OS window (Cocoa on macOS, WebView2 on Windows) using pywebview."""
    try:
        import webview
        logging.info("pywebview found. Launching true native desktop application window...")

        icon_path = None
        if sys.platform == "darwin":
            icon_icns = RESOURCE_DIR / "static" / "icon.icns"
            icon_png = RESOURCE_DIR / "static" / "icon.png"
            if icon_icns.exists():
                icon_path = str(icon_icns)
            elif icon_png.exists():
                icon_path = str(icon_png)
        elif sys.platform == "win32":
            icon_ico = RESOURCE_DIR / "static" / "icon.ico"
            if icon_ico.exists():
                icon_path = str(icon_ico)

        bridge = DesktopBridge()

        # Allow external links / popup displays (/map, /player) to open in browser for secondary displays
        webview.settings['OPEN_EXTERNAL_LINKS_IN_BROWSER'] = True
        webview.settings['ALLOW_DOWNLOADS'] = True

        window = webview.create_window(
            title="Arcane Ledger",
            url=URL,
            width=1600,
            height=1000,
            resizable=True,
            min_size=(1024, 700),
            text_select=True,
            js_api=bridge
        )

        def on_window_loaded():
            js_bridge = """
            (function() {
                if (window.__arcaneDesktopInjected) return;
                window.__arcaneDesktopInjected = true;
                const origOpen = window.open;
                window.open = function(url, target, features) {
                    if (window.pywebview && window.pywebview.api && typeof window.pywebview.api.open_browser_window === 'function') {
                        let fullUrl = url;
                        if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
                            fullUrl = window.location.origin + (url.startsWith('/') ? '' : '/') + url;
                        }
                        window.pywebview.api.open_browser_window(fullUrl);
                        return null;
                    }
                    return origOpen ? origOpen.apply(this, arguments) : null;
                };
            })();
            """
            try:
                window.evaluate_js(js_bridge)
            except Exception:
                pass

        window.events.loaded += on_window_loaded

        logging.info("Starting native window event loop (NSApplication / Cocoa)...")
        if icon_path:
            webview.start(icon=icon_path, debug=False)
        else:
            webview.start(debug=False)

        logging.info("Native window closed by user.")
        return True
    except ImportError as e:
        logging.warning(f"pywebview is not installed ({e}); falling back to browser app mode.")
        return False
    except Exception as e:
        logging.error(f"Error launching native pywebview window: {e}\n{traceback.format_exc()}")
        return False

def launch_desktop_window():
    """Launch the browser in standalone app mode."""
    profile_dir = BASE_DIR / "data" / ".app_profile"
    try:
        profile_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass

    # macOS: use LaunchServices 'open -W' to prevent TCC 'delete other apps' warnings
    if sys.platform == "darwin":
        mac_browser_apps = ["Google Chrome", "Microsoft Edge", "Brave Browser"]
        chosen_browser = None
        for app_name in mac_browser_apps:
            if os.path.exists(f"/Applications/{app_name}.app"):
                chosen_browser = app_name
                break

        if chosen_browser:
            logging.info(f"Launching app window via macOS LaunchServices with {chosen_browser}...")
            cmd = [
                "open", "-W", "-n", "-a", chosen_browser,
                "--args",
                f"--app={URL}",
                f"--user-data-dir={profile_dir}",
                "--window-size=1600,1000",
                "--no-first-run",
                "--no-default-browser-check"
            ]
            try:
                start_t = time.time()
                proc = subprocess.Popen(cmd)
                proc.wait()
                elapsed = time.time() - start_t
                logging.info(f"Browser launch process completed (elapsed={elapsed:.2f}s)")
                
                # If open -W returned quickly (< 3.0s), LaunchServices exited asynchronously.
                # In that case, enter the keepalive monitoring loop so Uvicorn does NOT die.
                if elapsed < 3.0:
                    logging.info("open command returned quickly; engaging profile monitoring loop...")
                    keep_process_alive_while_browser_running(profile_dir)
                return
            except Exception as e:
                logging.error(f"Error launching via open -a {chosen_browser}: {e}")

        # Fallback to default browser if Chrome/Edge/Brave aren't installed
        logging.info("Opening default browser via macOS 'open' command...")
        subprocess.Popen(["open", URL])
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            return

    # Windows and Linux:
    browser_exe = find_app_browser()
    if browser_exe:
        logging.info(f"Launching app window with browser: {browser_exe}")
        cmd = [
            browser_exe,
            f"--app={URL}",
            f"--user-data-dir={profile_dir}",
            "--window-size=1600,1000",
            "--window-position=50,50",
            "--no-first-run",
            "--no-default-browser-check"
        ]
        try:
            proc = subprocess.Popen(cmd)
            proc.wait()
            return
        except Exception as e:
            logging.error(f"Error launching app-mode browser: {e}")

    # Fallback: Open in default system browser
    import webbrowser
    logging.info("Opening in default system web browser...")
    webbrowser.open(URL)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass

def main():
    global server_instance
    server_process = None
    started_by_us = False

    # 1. Start server if not running
    if not is_server_running():
        started_by_us = True
        logging.info("Port 8000 is inactive. Starting Arcane Ledger backend server...")
        if getattr(sys, "frozen", False):
            # In compiled binary: start thread
            t = threading.Thread(target=start_backend_frozen, daemon=True)
            t.start()
        else:
            # In live dev mode: start subprocess pointing to app.py
            app_script = RESOURCE_DIR / "app.py"
            creationflags = 0x08000000 if sys.platform == "win32" else 0
            server_process = subprocess.Popen(
                [sys.executable, str(app_script)],
                cwd=str(RESOURCE_DIR),
                creationflags=creationflags
            )

        if not wait_for_server(timeout=15.0):
            err_details = backend_error or "Timed out waiting for port 8000."
            logging.error(f"Failed to start Arcane Ledger backend: {err_details}")
            show_alert_dialog(
                "Arcane Ledger Failed to Start",
                f"The backend server could not be started.\n\nDetails: {err_details[:200]}\n\nCheck log at:\n{LOG_FILE}"
            )
            if server_process:
                server_process.terminate()
            sys.exit(1)
    else:
        logging.info("Arcane Ledger backend is already running on port 8000.")

    # 2. Open desktop window
    logging.info(f"Opening Arcane Ledger DM Command Center ({URL})...")
    try:
        # Priority 1: Launch true native OS application window (Cocoa on macOS, WebView2 on Windows)
        # This renders "Arcane Ledger" in the macOS Menu Bar and uses the Arcane Ledger Dock icon.
        launched_native = False
        try:
            launched_native = launch_native_window()
        except Exception as e:
            logging.error(f"Native window launch encountered exception: {e}\n{traceback.format_exc()}")

        # Priority 2: Fallback to Chromium standalone app mode if pywebview is unavailable
        if not launched_native:
            logging.info("Falling back to browser app mode...")
            launch_desktop_window()
    except Exception as e:
        logging.error(f"Exception during desktop window loop: {e}\n{traceback.format_exc()}")
    finally:
        # Gracefully shut down in-process uvicorn server if running
        if server_instance:
            logging.info("Signaling in-process uvicorn server to stop...")
            server_instance.should_exit = True

        # If we spawned an external subprocess, cleanly terminate it on window close
        if started_by_us and server_process:
            logging.info("Closing Arcane Ledger backend server subprocess...")
            try:
                server_process.terminate()
                server_process.wait(timeout=3)
            except Exception:
                try:
                    server_process.kill()
                except Exception:
                    pass

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logging.critical(f"Unhandled exception in main:\n{traceback.format_exc()}")
        show_alert_dialog("Arcane Ledger Fatal Error", f"Unexpected error: {e}\nSee {LOG_FILE}")
