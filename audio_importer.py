#!/usr/bin/env python3
"""
Arcane Ledger - Audio Downloader & Sound Library Importer
Downloads tracks and playlists from YouTube and Spotify (via metadata match + yt-dlp),
transcodes to clean MP3, automatically tags them (Weather, Ambiance, Dungeon, Combat, Music),
and registers them into the Atmosphere Studio audio library.
"""

import os
import re
import sys
import json
import uuid
import shutil
import logging
import threading
import urllib.request
import urllib.parse
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable

logger = logging.getLogger("audio_importer")
logger.setLevel(logging.INFO)

# Global in-memory job store
DOWNLOAD_JOBS: Dict[str, Dict[str, Any]] = {}
JOBS_LOCK = threading.Lock()

# Supported Atmosphere primary tags/categories
ATMOSPHERE_CATEGORIES = ["Weather", "Ambiance", "Dungeon", "Combat", "Music"]
DEFAULT_CATEGORY_ICONS = {
    "Weather": "🌧️",
    "Ambiance": "🌲",
    "Dungeon": "💀",
    "Combat": "⚔️",
    "Music": "🎵",
    "Tension": "🕯️",
    "Custom": "🔊"
}


def get_ffmpeg_path() -> Optional[str]:
    """Resolve FFmpeg binary from imageio-ffmpeg or system PATH."""
    try:
        import imageio_ffmpeg
        exe = imageio_ffmpeg.get_ffmpeg_exe()
        if exe and os.path.exists(exe):
            return exe
    except Exception:
        pass
    
    sys_ffmpeg = shutil.which("ffmpeg")
    if sys_ffmpeg and os.path.exists(sys_ffmpeg):
        return sys_ffmpeg
    return None


def sanitize_filename(name: str) -> str:
    """Sanitize filename to be filesystem-safe across Windows, macOS, and Linux."""
    cleaned = re.sub(r'[\\/*?:"<>|]', "", name)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:100] or f"track_{uuid.uuid4().hex[:6]}"


def auto_detect_category(title: str) -> str:
    """Intelligently suggest an Atmosphere tag based on keywords in title."""
    t = (title or "").lower()
    if any(k in t for k in ["rain", "storm", "thunder", "wind", "blizzard", "weather", "snow", "hail", "fog"]):
        return "Weather"
    if any(k in t for k in ["dungeon", "crypt", "catacomb", "cave", "sewer", "haunted", "tomb", "abyss"]):
        return "Dungeon"
    if any(k in t for k in ["battle", "combat", "fight", "boss", "action", "war", "duel", "skirmish", "encounter"]):
        return "Combat"
    if any(k in t for k in ["tavern", "forest", "campfire", "town", "market", "nature", "night", "meadow", "city", "camp", "river", "birds", "crickets", "ambience", "ambiance"]):
        return "Ambiance"
    return "Music"


def is_spotify_url(url: str) -> bool:
    return bool(re.search(r"spotify\.com/(track|playlist|album)/[a-zA-Z0-9]+", url or ""))


def is_youtube_url(url: str) -> bool:
    return bool(re.search(r"(youtube\.com|youtu\.be)/", url or ""))


def fetch_spotify_metadata(url: str) -> Dict[str, Any]:
    """Extract metadata for Spotify track, playlist, or album via public embed endpoint."""
    m = re.search(r"spotify\.com/(track|playlist|album)/([a-zA-Z0-9]+)", url)
    if not m:
        return {"error": "Invalid Spotify link"}
    
    kind, item_id = m.group(1), m.group(2)
    embed_url = f"https://open.spotify.com/embed/{kind}/{item_id}"
    req = urllib.request.Request(embed_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode("utf-8")
    except Exception as e:
        return {"error": f"Failed to connect to Spotify: {e}"}

    m_json = re.search(r'<script id=.__NEXT_DATA__.[^>]*>(.*?)</script>', html)
    if not m_json:
        return {"error": "Could not parse Spotify embed data"}

    try:
        data = json.loads(m_json.group(1))
        props = data.get("props", {}).get("pageProps", {}).get("state", {}).get("data", {}).get("entity", {})
        title = props.get("name", "Unknown Spotify Item")
        
        tracks = []
        if kind == "track":
            artists = props.get("artists", [])
            artist_name = ", ".join([a.get("name", "") for a in artists]) if artists else ""
            tracks.append({
                "title": title,
                "artist": artist_name,
                "duration_ms": props.get("duration", 0)
            })
        else:
            for t in props.get("trackList", []):
                tracks.append({
                    "title": t.get("title", ""),
                    "artist": t.get("subtitle", ""),
                    "duration_ms": t.get("duration", 0)
                })

        return {
            "platform": "spotify",
            "type": "track" if kind == "track" else "playlist",
            "title": title,
            "count": len(tracks),
            "tracks": tracks,
            "suggested_category": auto_detect_category(title)
        }
    except Exception as e:
        return {"error": f"Error parsing Spotify tracklist: {e}"}


def fetch_youtube_metadata(url: str) -> Dict[str, Any]:
    """Extract metadata for YouTube video or playlist using yt-dlp flat extraction."""
    try:
        import yt_dlp
    except ImportError:
        return {"error": "yt-dlp is not installed in the python environment."}

    ydl_opts = {
        "extract_flat": True,
        "quiet": True,
        "skip_download": True,
        "no_warnings": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                return {"error": "No media info returned by YouTube."}

            if "entries" in info:
                raw_entries = list(info["entries"])
                tracks = []
                for e in raw_entries:
                    if not e:
                        continue
                    tracks.append({
                        "title": e.get("title") or "YouTube Track",
                        "url": e.get("url") or e.get("webpage_url") or "",
                        "duration": e.get("duration") or 0
                    })
                title = info.get("title") or "YouTube Playlist"
                return {
                    "platform": "youtube",
                    "type": "playlist",
                    "title": title,
                    "count": len(tracks),
                    "tracks": tracks,
                    "suggested_category": auto_detect_category(title)
                }
            else:
                title = info.get("title") or "YouTube Video"
                return {
                    "platform": "youtube",
                    "type": "track",
                    "title": title,
                    "count": 1,
                    "tracks": [{
                        "title": title,
                        "url": info.get("webpage_url") or url,
                        "duration": info.get("duration") or 0
                    }],
                    "suggested_category": auto_detect_category(title)
                }
    except Exception as e:
        return {"error": f"YouTube extraction error: {e}"}


def preview_audio_source(url: str) -> Dict[str, Any]:
    """Unified preview for any audio source link."""
    clean_url = (url or "").strip()
    if not clean_url:
        return {"error": "Please provide a valid URL."}
    
    if is_spotify_url(clean_url):
        return fetch_spotify_metadata(clean_url)
    elif is_youtube_url(clean_url):
        return fetch_youtube_metadata(clean_url)
    else:
        return {"error": "Unsupported link. Please paste a YouTube or Spotify URL."}


class AudioDownloadWorker:
    """Manages the background downloading, transcoding, and library insertion of tracks."""

    def __init__(self, data_dir: Path, uploads_dir: Path, read_json_fn: Callable, write_json_fn: Callable):
        self.data_dir = data_dir
        self.uploads_dir = uploads_dir
        self.read_json = read_json_fn
        self.write_json = write_json_fn
        self.audio_dest_dir = self.uploads_dir / "audio"
        self.audio_dest_dir.mkdir(parents=True, exist_ok=True)

    def start_download_job(
        self,
        url: str,
        category: str = "Ambiance",
        tags: Optional[List[str]] = None,
        max_tracks: int = 50,
        custom_name: str = ""
    ) -> Dict[str, Any]:
        """Initiate an async background download job and return immediate tracking info."""
        clean_url = url.strip()
        job_id = f"job-{uuid.uuid4().hex[:10]}"
        
        preview = preview_audio_source(clean_url)
        if "error" in preview:
            return {"error": preview["error"]}

        cat = category if category in ATMOSPHERE_CATEGORIES else (preview.get("suggested_category") or "Ambiance")
        all_tags = list(tags or [])
        if cat not in all_tags:
            all_tags.insert(0, cat)

        all_tracks = preview.get("tracks", [])
        total_to_download = min(len(all_tracks), max(1, max_tracks))
        target_tracks = all_tracks[:total_to_download]

        job = {
            "id": job_id,
            "status": "in_progress",
            "platform": preview.get("platform", "unknown"),
            "type": preview.get("type", "track"),
            "title": custom_name or preview.get("title") or "Imported Audio",
            "category": cat,
            "tags": all_tags,
            "total": total_to_download,
            "current_index": 0,
            "current_track_name": target_tracks[0].get("title", "") if target_tracks else "",
            "percent": 0.0,
            "completed_tracks": [],
            "error": None,
            "cancelled": False,
            "message": "Initializing download engine..."
        }

        with JOBS_LOCK:
            DOWNLOAD_JOBS[job_id] = job

        # Spawn background execution thread
        t = threading.Thread(
            target=self._run_job,
            args=(job_id, clean_url, preview, target_tracks, cat, all_tags, custom_name),
            daemon=True
        )
        t.start()

        return {
            "status": "success",
            "job_id": job_id,
            "title": job["title"],
            "total_tracks": total_to_download,
            "platform": job["platform"]
        }

    def _run_job(
        self,
        job_id: str,
        url: str,
        preview: Dict[str, Any],
        target_tracks: List[Dict[str, Any]],
        category: str,
        tags: List[str],
        custom_name: str
    ):
        try:
            import yt_dlp
        except ImportError:
            self._update_job(job_id, status="error", error="yt-dlp is not available.")
            return

        ffmpeg_path = get_ffmpeg_path()
        platform = preview.get("platform")
        total = len(target_tracks)

        for i, item in enumerate(target_tracks):
            # Check cancellation
            with JOBS_LOCK:
                if DOWNLOAD_JOBS.get(job_id, {}).get("cancelled"):
                    self._update_job(job_id, status="cancelled", message="Download cancelled by user.")
                    return

            track_title = item.get("title") or f"Track {i + 1}"
            artist = item.get("artist") or ""
            query_or_url = ""

            if platform == "spotify":
                # Spotify: search YouTube for matching audio
                query_or_url = f"ytsearch1:{track_title} {artist} audio"
                display_name = f"{track_title} - {artist}" if artist else track_title
            else:
                # YouTube: direct URL
                query_or_url = item.get("url") or url
                display_name = track_title

            if custom_name and total == 1:
                display_name = custom_name

            current_pct = round((i / total) * 100, 1)
            self._update_job(
                job_id,
                current_index=i + 1,
                current_track_name=display_name,
                percent=current_pct,
                message=f"Downloading ({i + 1}/{total}): {display_name}..."
            )

            # Generate target filename
            clean_stem = sanitize_filename(display_name)
            unique_filename = f"{clean_stem}_{uuid.uuid4().hex[:6]}.mp3"
            target_outpath = self.audio_dest_dir / unique_filename

            # Configure yt-dlp options
            ydl_opts = {
                "format": "bestaudio/best",
                "outtmpl": str(target_outpath.with_suffix(".%(ext)s")),
                "quiet": True,
                "noplaylist": True,
                "no_warnings": True,
            }

            if ffmpeg_path:
                ydl_opts["ffmpeg_location"] = ffmpeg_path
                ydl_opts["postprocessors"] = [{
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }]
            else:
                # Fallback to direct m4a/opus container if ffmpeg not installed
                ydl_opts["format"] = "bestaudio[ext=m4a]/bestaudio/best"

            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([query_or_url])
                
                # Check actual downloaded file on disk
                final_file = None
                if target_outpath.exists():
                    final_file = target_outpath
                else:
                    # Look for matching files with any extension
                    possible = list(self.audio_dest_dir.glob(f"{clean_stem}_*"))
                    if possible:
                        final_file = possible[0]

                if final_file and final_file.exists():
                    rel_url = f"/uploads/audio/{final_file.name}"
                    track_id = f"track-{uuid.uuid4().hex[:8]}"
                    icon = DEFAULT_CATEGORY_ICONS.get(category, "🎵")

                    new_track = {
                        "id": track_id,
                        "name": display_name,
                        "category": category,
                        "tags": tags,
                        "icon": icon,
                        "url": rel_url,
                        "volume": 0.7,
                        "defaultVolume": 0.7,
                        "active": False
                    }

                    # Add to audio_library.json
                    library = self.read_json("audio_library.json", [])
                    library.append(new_track)
                    self.write_json("audio_library.json", library)

                    with JOBS_LOCK:
                        DOWNLOAD_JOBS[job_id]["completed_tracks"].append(new_track)

            except Exception as e:
                logger.error(f"Error downloading {display_name}: {e}")

        # Complete job
        with JOBS_LOCK:
            job = DOWNLOAD_JOBS.get(job_id)
            if job and not job.get("cancelled"):
                completed_count = len(job.get("completed_tracks", []))
                job["status"] = "completed"
                job["percent"] = 100.0
                job["message"] = f"Successfully downloaded and added {completed_count} track(s) under tag [{category}]!"

    def _update_job(self, job_id: str, **kwargs):
        with JOBS_LOCK:
            if job_id in DOWNLOAD_JOBS:
                DOWNLOAD_JOBS[job_id].update(kwargs)

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        with JOBS_LOCK:
            job = DOWNLOAD_JOBS.get(job_id)
            if not job:
                return None
            return dict(job)

    def cancel_job(self, job_id: str) -> bool:
        with JOBS_LOCK:
            if job_id in DOWNLOAD_JOBS:
                DOWNLOAD_JOBS[job_id]["cancelled"] = True
                DOWNLOAD_JOBS[job_id]["status"] = "cancelled"
                DOWNLOAD_JOBS[job_id]["message"] = "Download cancelled by user."
                return True
        return False
