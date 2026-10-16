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

# Setup file logging for crash diagnostics
LOG_FILE = BASE_DIR / "launcher.log"
logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logging.info(f"Arcane Ledger Desktop Launcher starting. Frozen={getattr(sys, 'frozen', False)}, Platform={sys.platform}")
logging.info(f"RESOURCE_DIR={RESOURCE_DIR}, BASE_DIR={BASE_DIR}")

PORT = 8000
HOST = "127.0.0.1"
URL = f"http://{HOST}:{PORT}"

backend_error = None

def is_server_running(host=HOST, port=PORT, timeout=1.0) -> bool:
    """Check if port 8000 is open and responding."""
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except (OSError, ConnectionRefusedError):
        return False

def wait_for_server(timeout=15.0) -> bool:
    """Wait until the FastAPI backend responds to HTTP requests."""
    start = time.time()
    while time.time() - start < timeout:
        if backend_error:
            logging.error(f"Backend startup encountered an error: {backend_error}")
            return False
        if is_server_running():
            try:
                with urllib.request.urlopen(f"{URL}/api/auth/status", timeout=1.0) as resp:
                    if resp.status in (200, 401, 403):
                        logging.info("Backend HTTP healthcheck passed.")
                        return True
            except Exception as e:
                logging.debug(f"HTTP healthcheck retry: {e}")
        time.sleep(0.25)
    return False

def start_backend_frozen():
    """In frozen PyInstaller mode, run uvicorn in a daemon thread."""
    global backend_error
    try:
        logging.info("Starting uvicorn server in background thread...")
        # Add RESOURCE_DIR to sys.path so app and its modules are found
        if str(RESOURCE_DIR) not in sys.path:
            sys.path.insert(0, str(RESOURCE_DIR))
        uvicorn.run(app.app, host="0.0.0.0", port=PORT, log_level="warning")
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
        clean_msg = message.replace('"', '\\"').replace("'", "\\'")
        clean_title = title.replace('"', '\\"').replace("'", "\\'")
        os.system(f"""osascript -e 'display alert "{clean_title}" message "{clean_msg}" as critical' 2>/dev/null""")
    elif sys.platform == "win32":
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, message, title, 0x10)
        except Exception:
            pass

def launch_desktop_window():
    """Launch the browser in standalone app mode."""
    browser_exe = find_app_browser()
    profile_dir = BASE_DIR / "data" / ".app_profile"
    try:
        profile_dir.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    
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

    # macOS specific: launch via 'open' command if Chrome/Edge not installed
    if sys.platform == "darwin":
        logging.info("Opening default browser via macOS 'open' command...")
        subprocess.Popen(["open", URL])
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            return

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
        launch_desktop_window()
    except Exception as e:
        logging.error(f"Exception during desktop window loop: {e}\n{traceback.format_exc()}")
    finally:
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
