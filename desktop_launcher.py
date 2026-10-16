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
import subprocess
import threading
import urllib.request
from pathlib import Path

# Determine directory paths
if getattr(sys, "frozen", False):
    RESOURCE_DIR = Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    RESOURCE_DIR = Path(__file__).resolve().parent
    BASE_DIR = RESOURCE_DIR

PORT = 8000
HOST = "127.0.0.1"
URL = f"http://{HOST}:{PORT}"

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
        if is_server_running():
            try:
                with urllib.request.urlopen(f"{URL}/api/auth/status", timeout=1.0) as resp:
                    if resp.status in (200, 401, 403):
                        return True
            except Exception:
                pass
        time.sleep(0.25)
    return False

def start_backend_frozen():
    """In frozen PyInstaller mode, run uvicorn in a daemon thread."""
    import uvicorn
    # Add RESOURCE_DIR to sys.path so app and its modules are found
    if str(RESOURCE_DIR) not in sys.path:
        sys.path.insert(0, str(RESOURCE_DIR))
    import app
    uvicorn.run(app.app, host="0.0.0.0", port=PORT, log_level="warning")

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

def launch_desktop_window():
    """Launch the browser in standalone app mode."""
    browser_exe = find_app_browser()
    profile_dir = BASE_DIR / "data" / ".app_profile"
    profile_dir.mkdir(parents=True, exist_ok=True)
    
    if browser_exe:
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
            print(f"Error launching app-mode browser: {e}")

    # Fallback: Open in default system browser
    import webbrowser
    print("Opening in default system web browser...")
    webbrowser.open(URL)
    # If using fallback, keep process alive until user hits Ctrl+C
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
        print("Starting Arcane Ledger backend server...")
        if getattr(sys, "frozen", False):
            # In compiled binary: start thread
            t = threading.Thread(target=start_backend_frozen, daemon=True)
            t.start()
        else:
            # In live dev mode: start subprocess pointing to app.py
            app_script = RESOURCE_DIR / "app.py"
            # On Windows, creationflags=0x08000000 (CREATE_NO_WINDOW) prevents console popup
            creationflags = 0x08000000 if sys.platform == "win32" else 0
            server_process = subprocess.Popen(
                [sys.executable, str(app_script)],
                cwd=str(RESOURCE_DIR),
                creationflags=creationflags
            )

        if not wait_for_server(timeout=15.0):
            print("Failed to start Arcane Ledger backend. Exiting.")
            if server_process:
                server_process.terminate()
            sys.exit(1)
    else:
        print("Arcane Ledger backend is already running on port 8000.")

    # 2. Open desktop window
    print(f"Opening Arcane Ledger DM Command Center ({URL})...")
    try:
        launch_desktop_window()
    finally:
        # If we spawned an external subprocess, cleanly terminate it on window close
        if started_by_us and server_process:
            print("Closing Arcane Ledger backend server...")
            try:
                server_process.terminate()
                server_process.wait(timeout=3)
            except Exception:
                try:
                    server_process.kill()
                except Exception:
                    pass

if __name__ == "__main__":
    from typing import Optional
    main()
