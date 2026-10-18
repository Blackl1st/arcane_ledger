#!/usr/bin/env python3
"""
Arcane Ledger - Automatic Release Checking & Local Patching Engine
Provides background/startup update checking, manual checking in Settings,
download progress tracking, and in-place application patching for Windows and macOS.
"""

import os
import sys
import time
import json
import re
import shutil
import zipfile
import logging
import threading
import subprocess
import urllib.request
import urllib.error
import urllib.parse
import ssl
from pathlib import Path
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

CURRENT_VERSION = "1.1.6-beta.20"
REPO_OWNER = "Blackl1st"
REPO_NAME = "arcane_ledger"

# Directory layout determination
if getattr(sys, "frozen", False):
    RESOURCE_DIR = Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))
    if sys.platform == "darwin":
        BASE_DIR = Path.home() / "Documents" / "ArcaneLedger"
    else:
        BASE_DIR = Path(sys.executable).resolve().parent
else:
    RESOURCE_DIR = Path(__file__).resolve().parent
    BASE_DIR = RESOURCE_DIR

DATA_DIR = BASE_DIR / "data"
UPDATES_DIR = BASE_DIR / ".updates"
UPDATES_SETTINGS_FILE = DATA_DIR / "updater_settings.json"

try:
    UPDATES_DIR.mkdir(parents=True, exist_ok=True)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
except Exception:
    pass

router = APIRouter(prefix="/api/updates", tags=["Updates"])


def parse_version_tuple(v_str: str):
    """Convert version string like 'v1.0.3', '1.1.6-beta.1', or '1.1.6-nightly.1' to a comparable tuple."""
    if not v_str:
        return (0, 0, 0, 0, 0, 0)
    cleaned = v_str.strip().lstrip("vV")
    prerelease = ""
    if "-" in cleaned:
        base, prerelease = cleaned.split("-", 1)
    else:
        base = cleaned

    parts = []
    for piece in base.split("."):
        try:
            parts.append(int(piece))
        except ValueError:
            parts.append(0)
    while len(parts) < 3:
        parts.append(0)

    # In semver, a release without prerelease tag (e.g. 1.1.6) is HIGHER than a prerelease (1.1.6-beta.1).
    # 4th component: 1 for stable, 0 for prerelease.
    if not prerelease:
        return (parts[0], parts[1], parts[2], 1, 0, 0)
    else:
        # Match type and optional number: e.g. "beta.1", "beta1", "nightly.20261016", "rc2"
        m = re.match(r"^([a-zA-Z]+)[._-]?(\d+)?", prerelease)
        if m:
            pre_type = m.group(1).lower()
            num_str = m.group(2)
            pre_num = int(num_str) if num_str else 0
        else:
            pre_type = prerelease.lower()
            pre_num = 0
        type_weight = {"alpha": 1, "nightly": 2, "beta": 3, "rc": 4}.get(pre_type, 2)
        return (parts[0], parts[1], parts[2], 0, type_weight, pre_num)


def get_updater_settings() -> Dict[str, Any]:
    """Load updater preferences from disk."""
    is_prerelease = any(x in CURRENT_VERSION.lower() for x in ["-beta", "-alpha", "-rc", "-nightly"])
    default_settings = {
        "auto_check": True,
        "channel": "beta" if is_prerelease else "stable",
        "github_token": "",
        "last_check_time": None,
        "last_version_seen": None
    }
    if UPDATES_SETTINGS_FILE.exists():
        try:
            with open(UPDATES_SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                default_settings.update(data)
        except Exception as e:
            logging.warning(f"Could not load updater settings: {e}")
    return default_settings


def save_updater_settings(settings: Dict[str, Any]):
    """Persist updater preferences to disk."""
    try:
        with open(UPDATES_SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(settings, f, indent=2)
    except Exception as e:
        logging.error(f"Failed to save updater settings: {e}")


class GithubRedirectHandler(urllib.request.HTTPRedirectHandler):
    """
    Subclasses HTTPRedirectHandler to safely handle GitHub API 302 redirects
    to AWS S3 (objects.githubusercontent.com) by stripping the Authorization header.
    AWS S3 rejects requests with both Authorization and query-param signatures.
    """
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        new_req = super().redirect_request(req, fp, code, msg, headers, newurl)
        if new_req is not None:
            parsed = urllib.parse.urlparse(newurl)
            if "api.github.com" not in parsed.netloc:
                if "Authorization" in new_req.headers:
                    del new_req.headers["Authorization"]
                if "authorization" in new_req.headers:
                    del new_req.headers["authorization"]
        return new_req


def create_github_opener(unverified: bool = False):
    """Build a urllib opener with GithubRedirectHandler and appropriate SSL context."""
    handlers = [GithubRedirectHandler()]
    if unverified:
        try:
            ctx = ssl._create_unverified_context()
            handlers.append(urllib.request.HTTPSHandler(context=ctx))
        except Exception:
            pass
    else:
        ctx = None
        try:
            import certifi
            if os.path.exists(certifi.where()):
                ctx = ssl.create_default_context(cafile=certifi.where())
        except Exception:
            pass
        if ctx:
            handlers.append(urllib.request.HTTPSHandler(context=ctx))
    return urllib.request.build_opener(*handlers)


class UpdateState:
    """Thread-safe state manager for background check, download, and patch operations."""
    def __init__(self):
        self.lock = threading.Lock()
        self.status = "idle"  # idle, checking, available, downloading, downloaded, applying, ready_to_restart, error
        self.progress_pct = 0.0
        self.bytes_downloaded = 0
        self.total_bytes = 0
        self.target_version = None
        self.release_info = None
        self.downloaded_zip_path = None
        self.error_message = None

    def reset(self):
        with self.lock:
            self.status = "idle"
            self.progress_pct = 0.0
            self.bytes_downloaded = 0
            self.total_bytes = 0
            self.target_version = None
            self.release_info = None
            self.downloaded_zip_path = None
            self.error_message = None

    def to_dict(self):
        with self.lock:
            return {
                "status": self.status,
                "progress_pct": round(self.progress_pct, 1),
                "bytes_downloaded": self.bytes_downloaded,
                "total_bytes": self.total_bytes,
                "target_version": self.target_version,
                "release_info": self.release_info,
                "error_message": self.error_message,
                "current_version": CURRENT_VERSION,
                "is_frozen": getattr(sys, "frozen", False),
                "platform": sys.platform
            }


update_state = UpdateState()


def select_asset_for_platform(assets: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Select the correct release archive (.zip) for the host operating system."""
    if sys.platform == "darwin":
        for a in assets:
            name = a.get("name", "").lower()
            if "macos" in name and name.endswith(".zip"):
                return a
            if "darwin" in name and name.endswith(".zip"):
                return a
    elif sys.platform == "win32":
        for a in assets:
            name = a.get("name", "").lower()
            if ("windows" in name or "win-x64" in name or "win64" in name) and name.endswith(".zip"):
                return a

    # Fallback to any zip archive
    for a in assets:
        if a.get("name", "").endswith(".zip"):
            return a
    return None


def fetch_latest_release(token: Optional[str] = None, channel: str = "stable") -> Dict[str, Any]:
    """Query GitHub Releases API to retrieve the latest version information according to channel (stable vs beta)."""
    list_url = f"https://api.github.com/repos/{REPO_OWNER}/{REPO_NAME}/releases"
    headers = {
        "User-Agent": "ArcaneLedger-Updater",
        "Accept": "application/vnd.github.v3+json"
    }
    if token and token.strip():
        headers["Authorization"] = f"Bearer {token.strip()}"

    req = urllib.request.Request(list_url, headers=headers)

    try:
        try:
            opener = create_github_opener(unverified=False)
            resp = opener.open(req, timeout=15)
        except (urllib.error.URLError, ssl.SSLError) as ssl_err:
            err_str = str(ssl_err).lower()
            if not isinstance(ssl_err, urllib.error.HTTPError) and any(k in err_str for k in ("certificate", "cert", "ssl", "verify failed")):
                logging.warning(f"SSL verification failed on host ({ssl_err}); retrying with unverified SSL context...")
                opener = create_github_opener(unverified=True)
                resp = opener.open(req, timeout=15)
            else:
                raise ssl_err

        with resp:
            releases = json.loads(resp.read().decode("utf-8"))
            if not isinstance(releases, list) or not releases:
                raise HTTPException(status_code=404, detail="No releases found in repository.")

            valid = [r for r in releases if not r.get("draft", False)]
            if not valid:
                raise HTTPException(status_code=404, detail="No published releases found.")

            # Sort releases strictly by SemVer descending so beta.10 is always higher than beta.9
            valid.sort(key=lambda r: parse_version_tuple(r.get("tag_name", "")), reverse=True)

            if channel == "beta":
                # In beta channel, accept the newest release whether prerelease or stable
                return valid[0]
            else:
                # In stable channel, choose the newest release that is NOT a prerelease and has no beta/nightly tag
                for r in valid:
                    tag = r.get("tag_name", "").lower()
                    if not r.get("prerelease", False) and not any(x in tag for x in ["-beta", "-nightly", "-rc", "-alpha"]):
                        return r
                raise HTTPException(status_code=404, detail="No official stable release found on the stable channel.")
    except urllib.error.HTTPError as e:
        if e.code == 404:
            raise HTTPException(
                status_code=404,
                detail="GitHub repository release not found (HTTP 404). If the repository is private, please configure a GitHub Personal Access Token in Settings -> Updates."
            )
        elif e.code == 401:
            raise HTTPException(
                status_code=401,
                detail="GitHub Personal Access Token was rejected (HTTP 401 Unauthorized). Please check your token in Settings."
            )
        else:
            raise HTTPException(
                status_code=e.code,
                detail=f"GitHub API returned error {e.code}: {e.reason}"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to connect to GitHub Releases API: {str(e)}"
        )


def check_for_updates_internal(force: bool = False, token: Optional[str] = None) -> Dict[str, Any]:
    """Check whether a newer version of Arcane Ledger is published on GitHub."""
    settings = get_updater_settings()
    auth_token = token if token is not None else settings.get("github_token", "")
    channel = settings.get("channel", "stable")

    try:
        release = fetch_latest_release(auth_token, channel=channel)
    except HTTPException as e:
        if e.status_code == 404 and "No official stable release" in str(e.detail):
            with update_state.lock:
                update_state.status = "idle"
                update_state.target_version = None
                update_state.release_info = None
            return {
                "update_available": False,
                "current_version": CURRENT_VERSION,
                "target_version": None,
                "release_info": None,
                "channel": channel,
                "message": e.detail
            }
        raise
    tag_name = release.get("tag_name", "").strip()
    latest_version = tag_name.lstrip("vV")

    current_tup = parse_version_tuple(CURRENT_VERSION)
    latest_tup = parse_version_tuple(latest_version)

    update_available = (latest_tup > current_tup)
    asset = select_asset_for_platform(release.get("assets", []))

    # Update settings metadata
    settings["last_check_time"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    settings["last_version_seen"] = tag_name
    save_updater_settings(settings)

    rel_info = {
        "tag_name": tag_name,
        "version": latest_version,
        "name": release.get("name") or tag_name,
        "body": release.get("body", ""),
        "published_at": release.get("published_at", ""),
        "html_url": release.get("html_url", ""),
        "asset_name": asset.get("name") if asset else None,
        "asset_size": asset.get("size") if asset else None,
        "asset_url": asset.get("url") if asset else None,
        "browser_download_url": asset.get("browser_download_url") if asset else None,
        "asset_id": asset.get("id") if asset else None
    }

    with update_state.lock:
        update_state.target_version = tag_name
        update_state.release_info = rel_info
        if update_available:
            update_state.status = "available"
        else:
            if update_state.status in ("idle", "checking", "available"):
                update_state.status = "idle"

    is_mac = sys.platform == "darwin"
    is_translocated = False
    in_downloads = False
    if is_mac and getattr(sys, "frozen", False):
        exe_str = str(Path(sys.executable).resolve())
        if "AppTranslocation" in exe_str or "/private/var" in exe_str:
            is_translocated = True
        if "/Downloads/" in exe_str or (Path.home() / "Downloads" / "ArcaneLedger.app").exists():
            in_downloads = True

    return {
        "success": True,
        "update_available": update_available,
        "current_version": CURRENT_VERSION,
        "latest_version": tag_name,
        "release": rel_info,
        "is_frozen": getattr(sys, "frozen", False),
        "is_dev": not getattr(sys, "frozen", False) and (RESOURCE_DIR / ".git").is_dir(),
        "is_translocated": is_translocated,
        "in_downloads": in_downloads,
        "platform": sys.platform
    }


def download_worker(asset_info: Dict[str, Any], token: Optional[str]):
    """Background worker that streams and downloads the update archive."""
    try:
        with update_state.lock:
            update_state.status = "downloading"
            update_state.progress_pct = 0.0
            update_state.bytes_downloaded = 0
            update_state.total_bytes = asset_info.get("asset_size") or 0
            update_state.error_message = None

        UPDATES_DIR.mkdir(parents=True, exist_ok=True)
        version_label = update_state.target_version or "latest"
        zip_path = UPDATES_DIR / f"ArcaneLedger_update_{version_label}.zip"

        # If token is present, request the asset via the API with application/octet-stream
        if token and token.strip() and asset_info.get("asset_url"):
            req_url = asset_info["asset_url"]
            headers = {
                "User-Agent": "ArcaneLedger-Updater",
                "Accept": "application/octet-stream",
                "Authorization": f"Bearer {token.strip()}"
            }
        else:
            req_url = asset_info.get("browser_download_url") or asset_info.get("asset_url")
            headers = {
                "User-Agent": "ArcaneLedger-Updater",
                "Accept": "*/*"
            }
            if token and token.strip():
                headers["Authorization"] = f"Bearer {token.strip()}"

        req = urllib.request.Request(req_url, headers=headers)

        try:
            opener = create_github_opener(unverified=False)
            resp = opener.open(req, timeout=60)
        except (urllib.error.URLError, ssl.SSLError) as ssl_err:
            err_str = str(ssl_err).lower()
            if not isinstance(ssl_err, urllib.error.HTTPError) and any(k in err_str for k in ("certificate", "cert", "ssl", "verify failed")):
                logging.warning(f"SSL verification failed on download ({ssl_err}); retrying with unverified SSL context...")
                opener = create_github_opener(unverified=True)
                resp = opener.open(req, timeout=60)
            else:
                raise ssl_err

        with resp:
            content_length = resp.headers.get("Content-Length")
            total = int(content_length) if content_length else update_state.total_bytes
            with update_state.lock:
                update_state.total_bytes = total

            downloaded = 0
            chunk_size = 131072  # 128 KB chunks
            with open(zip_path, "wb") as f_out:
                while True:
                    chunk = resp.read(chunk_size)
                    if not chunk:
                        break
                    f_out.write(chunk)
                    downloaded += len(chunk)
                    with update_state.lock:
                        update_state.bytes_downloaded = downloaded
                        if total > 0:
                            update_state.progress_pct = min(100.0, (downloaded / total) * 100.0)

        # Validate archive integrity
        if not zipfile.is_zipfile(zip_path):
            raise ValueError("Downloaded file is not a valid zip archive.")

        with update_state.lock:
            update_state.downloaded_zip_path = str(zip_path)
            update_state.status = "downloaded"
            update_state.progress_pct = 100.0
            logging.info(f"Update package successfully downloaded to: {zip_path}")

    except Exception as e:
        logging.error(f"Update download failed: {e}", exc_info=True)
        with update_state.lock:
            update_state.status = "error"
            update_state.error_message = f"Download error: {str(e)}"


def execute_patch_and_restart() -> Dict[str, Any]:
    """Extract staged files and dispatch an OS-native helper script to replace the application."""
    with update_state.lock:
        if update_state.status != "downloaded" or not update_state.downloaded_zip_path:
            raise ValueError("No verified update download ready to apply.")
        zip_path = Path(update_state.downloaded_zip_path)

    if not zip_path.exists():
        raise FileNotFoundError(f"Update zip missing at {zip_path}")

    staging_dir = UPDATES_DIR / "staged"
    if staging_dir.exists():
        try:
            shutil.rmtree(staging_dir, ignore_errors=True)
        except Exception:
            pass
    staging_dir.mkdir(parents=True, exist_ok=True)

    logging.info(f"Extracting update archive {zip_path} into {staging_dir}...")
    if sys.platform == "darwin":
        # On macOS, NEVER use python's zipfile module to extract app bundles!
        # Python's zipfile writes symlinks in Python.framework as plain text files, corrupting dyld libraries.
        # Native /usr/bin/ditto -x -k or /usr/bin/unzip preserves 100% of symlinks, resource forks, and Unix permissions.
        try:
            subprocess.run(["/usr/bin/ditto", "-x", "-k", str(zip_path), str(staging_dir)], check=True, capture_output=True)
        except Exception as e:
            logging.warning(f"ditto failed ({e}), falling back to unzip...")
            subprocess.run(["/usr/bin/unzip", "-q", "-o", str(zip_path), "-d", str(staging_dir)], check=True, capture_output=True)

        try:
            subprocess.run(["/usr/bin/xattr", "-cr", str(staging_dir)], check=False, capture_output=True)
        except Exception:
            pass
    else:
        with zipfile.ZipFile(zip_path, "r") as zf:
            zf.extractall(staging_dir)

    is_frozen = getattr(sys, "frozen", False)
    current_pid = os.getpid()

    if sys.platform == "darwin":
        staged_app = None
        for item in staging_dir.iterdir():
            if item.is_dir() and item.name.endswith(".app"):
                staged_app = item
                break

        if not staged_app:
            raise FileNotFoundError("Could not find .app bundle in update archive.")

        if is_frozen:
            target_app = Path(sys.executable).resolve().parent.parent.parent
            if not target_app.name.endswith(".app") or "AppTranslocation" in str(target_app) or "/private/var" in str(target_app):
                if Path("/Applications/ArcaneLedger.app").exists():
                    target_app = Path("/Applications/ArcaneLedger.app")
                elif (Path.home() / "Applications" / "ArcaneLedger.app").exists():
                    target_app = Path.home() / "Applications" / "ArcaneLedger.app"
                elif (Path.home() / "Downloads" / "ArcaneLedger.app").exists():
                    target_app = Path.home() / "Downloads" / "ArcaneLedger.app"
                elif (Path.home() / "Desktop" / "ArcaneLedger.app").exists():
                    target_app = Path.home() / "Desktop" / "ArcaneLedger.app"
                else:
                    target_app = Path("/Applications/ArcaneLedger.app")
        else:
            target_app = Path("/Applications/ArcaneLedger.app")

        script_path = UPDATES_DIR / "apply_update.sh"
        script_content = f"""#!/bin/bash
OLD_PID="{current_pid}"
STAGED_APP="{staged_app.resolve()}"
TARGET_APP="{target_app.resolve()}"
LOG_FILE="{UPDATES_DIR.resolve()}/patch.log"

exec > "$LOG_FILE" 2>&1
echo "=== Starting Arcane Ledger In-Place Update ==="
echo "OLD_PID: $OLD_PID"
echo "STAGED_APP: $STAGED_APP"
echo "TARGET_APP: $TARGET_APP"

# 1. Wait for OLD_PID to exit
echo "Waiting for process $OLD_PID to exit..."
for i in {{1..20}}; do
    if ! kill -0 "$OLD_PID" 2>/dev/null; then
        echo "Process $OLD_PID exited."
        break
    fi
    sleep 0.3
done

# Terminate any remaining ArcaneLedger or WebKit processes to release file locks
echo "Terminating any lingering processes on port 8000..."
pkill -9 -f "ArcaneLedger.app" 2>/dev/null
lsof -ti :8000 | xargs kill -9 2>/dev/null
sleep 1.0

# 2. Crucial: Clean up any nested app that was accidentally copied inside TARGET_APP
if [ -d "$TARGET_APP/ArcaneLedger.app" ]; then
    echo "Found nested ArcaneLedger.app inside TARGET_APP; cleaning up to fix doubled size..."
    rm -rf "$TARGET_APP/ArcaneLedger.app" 2>/dev/null
fi

# 3. Safe Atomic Swap on macOS
TARGET_PARENT="$(dirname "$TARGET_APP")"

# If /Applications is not writable without root, fall back to ~/Applications/ArcaneLedger.app
if [ ! -w "$TARGET_PARENT" ] && [ "$TARGET_APP" = "/Applications/ArcaneLedger.app" ]; then
    echo "Notice: /Applications is not writable by current user."
    echo "Falling back to user applications directory: $HOME/Applications/ArcaneLedger.app"
    mkdir -p "$HOME/Applications" 2>/dev/null
    TARGET_APP="$HOME/Applications/ArcaneLedger.app"
    TARGET_PARENT="$HOME/Applications"
fi

BACKUP_APP="$TARGET_PARENT/.ArcaneLedger_backup_$$"
STAGED_TEMP="$TARGET_PARENT/.ArcaneLedger_new_$$"

echo "Performing application replacement..."
rm -rf "$BACKUP_APP" "$STAGED_TEMP" 2>/dev/null

if ditto "$STAGED_APP" "$STAGED_TEMP" 2>/dev/null; then
    echo "Staged copy created at $STAGED_TEMP"
    if mv "$TARGET_APP" "$BACKUP_APP" 2>/dev/null; then
        echo "Moved current app to $BACKUP_APP"
        if mv "$STAGED_TEMP" "$TARGET_APP" 2>/dev/null; then
            echo "Successfully moved new app to $TARGET_APP"
            rm -rf "$BACKUP_APP" 2>/dev/null &
        else
            echo "Failed to move new app to target; restoring backup..."
            mv "$BACKUP_APP" "$TARGET_APP" 2>/dev/null
        fi
    else
        echo "Could not rename $TARGET_APP; applying ditto in-place..."
        rm -rf "$STAGED_TEMP" 2>/dev/null
        ditto "$STAGED_APP" "$TARGET_APP"
    fi
else
    echo "Could not create temp staging in $TARGET_PARENT; applying direct ditto..."
    ditto "$STAGED_APP" "$TARGET_APP"
fi

# Ensure any nested app inside TARGET_APP is removed
rm -rf "$TARGET_APP/ArcaneLedger.app" 2>/dev/null

# 4. Remove quarantine and ensure execute permissions
echo "Setting permissions and clearing quarantine..."
/usr/bin/xattr -cr "$TARGET_APP" 2>/dev/null || xattr -cr "$TARGET_APP" 2>/dev/null
/usr/bin/xattr -dr com.apple.quarantine "$TARGET_APP" 2>/dev/null || xattr -dr com.apple.quarantine "$TARGET_APP" 2>/dev/null
chmod -R 755 "$TARGET_APP/Contents/MacOS" 2>/dev/null
find "$TARGET_APP" -name "*.dylib" -exec chmod 755 {{}} + 2>/dev/null
find "$TARGET_APP" -name "*.so" -exec chmod 755 {{}} + 2>/dev/null

# 5. Cleanup staging directory and zip
echo "Cleaning up download and staging artifacts..."
rm -rf "{staging_dir.resolve()}" 2>/dev/null
rm -f "{zip_path.resolve()}" 2>/dev/null

# 6. Relaunch Arcane Ledger
echo "Relaunching Arcane Ledger at $TARGET_APP..."
open -n "$TARGET_APP"
echo "=== Update Complete ==="
"""
        with open(script_path, "w", newline="\n") as f:
            f.write(script_content)
        os.chmod(script_path, 0o755)

        logging.info(f"Launching macOS patch script: {script_path}")
        subprocess.Popen(["/bin/bash", str(script_path)], start_new_session=True)

    elif sys.platform == "win32":
        staged_folder = staging_dir
        if (staging_dir / "ArcaneLedger" / "ArcaneLedger.exe").exists():
            staged_folder = staging_dir / "ArcaneLedger"
        elif (staging_dir / "ArcaneLedger.exe").exists():
            staged_folder = staging_dir

        if is_frozen:
            target_dir = Path(sys.executable).resolve().parent
        else:
            target_dir = BASE_DIR

        script_path = UPDATES_DIR / "apply_update.bat"
        script_content = f"""@echo off
set OLD_PID={current_pid}
set STAGED={staged_folder.resolve()}
set TARGET={target_dir.resolve()}
set EXE_NAME=ArcaneLedger.exe

:: 1. Allow 2 seconds for parent process to exit cleanly, then force-terminate OLD_PID if still holding locks
timeout /t 2 /nobreak > nul
taskkill /F /PID %OLD_PID% > nul 2>&1

:: 2. Terminate any browser window displaying Arcane Ledger so the relaunch opens fresh
taskkill /F /FI "WINDOWTITLE eq Arcane Ledger*" > nul 2>&1
timeout /t 1 /nobreak > nul

:: 3. Overwrite binaries and app assets, explicitly preserving user data
robocopy "%STAGED%" "%TARGET%" /E /IS /IT /XD "%STAGED%\\data" /R:2 /W:1 > nul
if exist "%STAGED%\\%EXE_NAME%" (
    copy /y "%STAGED%\\%EXE_NAME%" "%TARGET%\\%EXE_NAME%" > nul
)

:: 4. Cleanup staging
rd /s /q "{staging_dir.resolve()}" 2> nul
del /f /q "{zip_path.resolve()}" 2> nul

:: 5. Relaunch Arcane Ledger
cd /d "%TARGET%"
start "" "%TARGET%\\%EXE_NAME%"
exit
"""
        with open(script_path, "w", newline="\r\n") as f:
            f.write(script_content)

        logging.info(f"Launching Windows patch script: {script_path}")
        # Use cmd.exe with CREATE_NO_WINDOW (0x08000000); do NOT combine with DETACHED_PROCESS (0x08) which breaks standard handles
        subprocess.Popen(
            ["cmd.exe", "/c", str(script_path)],
            creationflags=0x08000000,
            close_fds=True
        )

    with update_state.lock:
        update_state.status = "ready_to_restart"

    # Schedule delayed exit to allow HTTP response to return
    def delayed_exit():
        time.sleep(1.2)
        logging.info("Exiting Arcane Ledger to permit update script to swap files.")
        os._exit(0)

    t = threading.Thread(target=delayed_exit, daemon=True)
    t.start()

    return {"status": "success", "message": "Update process initiated. Arcane Ledger will restart momentarily."}


# =============================================================================
# FASTAPI ENDPOINTS
# =============================================================================

class UpdateSettingsRequest(BaseModel):
    auto_check: Optional[bool] = None
    channel: Optional[str] = None
    github_token: Optional[str] = None


@router.get("/status")
async def get_status():
    """Retrieve current update check and download status."""
    res = update_state.to_dict()
    is_mac = sys.platform == "darwin"
    is_translocated = False
    in_downloads = False
    if is_mac and getattr(sys, "frozen", False):
        exe_str = str(Path(sys.executable).resolve())
        if "AppTranslocation" in exe_str or "/private/var" in exe_str:
            is_translocated = True
        if "/Downloads/" in exe_str or (Path.home() / "Downloads" / "ArcaneLedger.app").exists():
            in_downloads = True
    res["is_translocated"] = is_translocated
    res["in_downloads"] = in_downloads
    res["platform"] = sys.platform
    return res


@router.get("/check")
async def check_updates(force: bool = False, auto: bool = False):
    """Check for latest release on GitHub."""
    settings = get_updater_settings()
    if auto and not settings.get("auto_check", True) and not force:
        return {"success": True, "update_available": False, "skipped": True}

    with update_state.lock:
        update_state.status = "checking"
        update_state.error_message = None

    try:
        res = check_for_updates_internal(force=force)
        return res
    except HTTPException as e:
        with update_state.lock:
            update_state.status = "error"
            update_state.error_message = e.detail
        return {
            "success": False,
            "update_available": False,
            "error": e.detail,
            "current_version": CURRENT_VERSION
        }
    except Exception as e:
        err_msg = str(e)
        with update_state.lock:
            update_state.status = "error"
            update_state.error_message = err_msg
        return {
            "success": False,
            "update_available": False,
            "error": err_msg,
            "current_version": CURRENT_VERSION
        }


@router.post("/download")
async def start_download(background_tasks: BackgroundTasks):
    """Initiate background download of the latest release package."""
    with update_state.lock:
        if update_state.status == "downloading":
            return {"status": "in_progress", "message": "Download is already running."}
        if not update_state.release_info:
            raise HTTPException(status_code=400, detail="No update information available. Please check for updates first.")
        rel = update_state.release_info

    settings = get_updater_settings()
    token = settings.get("github_token", "")

    background_tasks.add_task(download_worker, rel, token)
    return {"status": "started", "message": "Download initiated in background."}


@router.post("/apply")
async def apply_update():
    """Extract downloaded update and launch the OS-native replacement helper."""
    try:
        res = execute_patch_and_restart()
        return res
    except Exception as e:
        logging.error(f"Error applying update: {e}", exc_info=True)
        with update_state.lock:
            update_state.status = "error"
            update_state.error_message = str(e)
        raise HTTPException(status_code=500, detail=f"Failed to apply update: {str(e)}")


@router.get("/settings")
async def get_settings():
    """Get current updater settings, masking the GitHub Personal Access Token."""
    settings = get_updater_settings()
    raw_token = settings.get("github_token", "")
    masked = ""
    if raw_token:
        masked = raw_token[:4] + ("*" * max(4, len(raw_token) - 8)) + raw_token[-4:]
    return {
        "auto_check": settings.get("auto_check", True),
        "channel": settings.get("channel", "stable"),
        "has_token": bool(raw_token),
        "masked_token": masked,
        "last_check_time": settings.get("last_check_time"),
        "last_version_seen": settings.get("last_version_seen"),
        "current_version": CURRENT_VERSION,
        "platform": sys.platform,
        "is_frozen": getattr(sys, "frozen", False)
    }


@router.post("/settings")
async def update_settings(payload: UpdateSettingsRequest):
    """Save updater settings."""
    settings = get_updater_settings()
    if payload.auto_check is not None:
        settings["auto_check"] = payload.auto_check
    if payload.channel is not None and payload.channel in ("stable", "beta"):
        settings["channel"] = payload.channel
    if payload.github_token is not None:
        # If user submits empty string, clear it; otherwise update
        settings["github_token"] = payload.github_token.strip()
    save_updater_settings(settings)
    return {"status": "success", "message": "Updater settings saved."}


@router.post("/dev-pull")
async def dev_git_pull():
    """For development source installations, execute git pull origin main."""
    if getattr(sys, "frozen", False):
        raise HTTPException(status_code=400, detail="Git pull is only supported in source development mode.")
    git_dir = RESOURCE_DIR / ".git"
    if not git_dir.is_dir():
        raise HTTPException(status_code=400, detail="Not a git repository.")

    try:
        proc = subprocess.run(
            ["git", "pull", "origin", "main"],
            cwd=str(RESOURCE_DIR),
            capture_output=True,
            text=True,
            timeout=30
        )
        return {
            "status": "success" if proc.returncode == 0 else "error",
            "returncode": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Git pull failed: {str(e)}")
