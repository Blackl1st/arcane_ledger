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
import shutil
import zipfile
import logging
import threading
import subprocess
import urllib.request
import urllib.error
import urllib.parse
from pathlib import Path
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

CURRENT_VERSION = "1.0.5"
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
    """Convert version string like 'v1.0.3' or '1.0.4-rc1' to comparable tuple."""
    if not v_str:
        return (0, 0, 0)
    cleaned = v_str.strip().lstrip("vV")
    base = cleaned.split("-")[0].split("+")[0]
    parts = []
    for piece in base.split("."):
        try:
            parts.append(int(piece))
        except ValueError:
            parts.append(0)
    while len(parts) < 3:
        parts.append(0)
    return tuple(parts)


def get_updater_settings() -> Dict[str, Any]:
    """Load updater preferences from disk."""
    default_settings = {
        "auto_check": True,
        "channel": "stable",
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
    opener = urllib.request.build_opener(GithubRedirectHandler())

    try:
        with opener.open(req, timeout=10) as resp:
            releases = json.loads(resp.read().decode("utf-8"))
            if not isinstance(releases, list) or not releases:
                raise HTTPException(status_code=404, detail="No releases found in repository.")

            valid = [r for r in releases if not r.get("draft", False)]
            if not valid:
                raise HTTPException(status_code=404, detail="No published releases found.")

            if channel == "beta":
                # In beta channel, accept the newest release whether prerelease or stable
                return valid[0]
            else:
                # In stable channel, choose the newest release that is NOT a prerelease and has no beta/nightly tag
                for r in valid:
                    tag = r.get("tag_name", "").lower()
                    if not r.get("prerelease", False) and not any(x in tag for x in ["-beta", "-nightly", "-rc", "-alpha"]):
                        return r
                return valid[0]
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

    release = fetch_latest_release(auth_token, channel=channel)
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

    return {
        "success": True,
        "update_available": update_available,
        "current_version": CURRENT_VERSION,
        "latest_version": tag_name,
        "release": rel_info,
        "is_frozen": getattr(sys, "frozen", False),
        "is_dev": not getattr(sys, "frozen", False) and (RESOURCE_DIR / ".git").is_dir()
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

        opener = urllib.request.build_opener(GithubRedirectHandler())

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

        with opener.open(req, timeout=45) as resp:
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
            # sys.executable is inside Contents/MacOS/ArcaneLedger
            target_app = Path(sys.executable).resolve().parent.parent.parent
            if not target_app.name.endswith(".app"):
                target_app = Path("/Applications/ArcaneLedger.app")
        else:
            target_app = Path("/Applications/ArcaneLedger.app")

        script_path = UPDATES_DIR / "apply_update.sh"
        script_content = f"""#!/bin/bash
OLD_PID="{current_pid}"
STAGED_APP="{staged_app.resolve()}"
TARGET_APP="{target_app.resolve()}"

# Wait for Arcane Ledger old process to terminate
while kill -0 "$OLD_PID" 2>/dev/null; do
    sleep 0.3
done
sleep 0.5

# Safely replace application bundle
rm -rf "$TARGET_APP"
cp -R "$STAGED_APP" "$TARGET_APP"
xattr -cr "$TARGET_APP"
chmod -R +x "$TARGET_APP/Contents/MacOS"

# Cleanup staging directory and zip
rm -rf "{staging_dir.resolve()}"
rm -f "{zip_path.resolve()}"

# Relaunch Arcane Ledger
open -n "$TARGET_APP"
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

:wait_loop
timeout /t 1 /nobreak > nul
tasklist /fi "PID eq %OLD_PID%" | find "%OLD_PID%" > nul
if %errorlevel% == 0 goto wait_loop

timeout /t 1 /nobreak > nul

:: Overwrite binaries and app assets, explicitly preserving user data
robocopy "%STAGED%" "%TARGET%" /E /IS /IT /XD "%STAGED%\\data" /R:2 /W:1 > nul
if exist "%STAGED%\\%EXE_NAME%" (
    copy /y "%STAGED%\\%EXE_NAME%" "%TARGET%\\%EXE_NAME%" > nul
)

:: Cleanup staging
rd /s /q "{staging_dir.resolve()}" 2> nul
del /f /q "{zip_path.resolve()}" 2> nul

:: Relaunch
cd /d "%TARGET%"
start "" "%TARGET%\\%EXE_NAME%"
exit
"""
        with open(script_path, "w", newline="\r\n") as f:
            f.write(script_content)

        creationflags = 0x08000000 | 0x00000008  # CREATE_NO_WINDOW | DETACHED_PROCESS
        logging.info(f"Launching Windows patch script: {script_path}")
        subprocess.Popen([str(script_path)], creationflags=creationflags, close_fds=True)

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
    return update_state.to_dict()


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
