"""YouTube channel metadata provider built on yt-dlp (no API key).

Design rules (see README):
- Never download videos (skip_download=True).
- Never enumerate video lists (extract_flat + playlistend=1).
- Minimal retries, short timeout, one extract per channel URL.
- No cookies, no login, no secrets.
- Any missing field becomes None; one channel failure never crashes the run.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Callable, Optional


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _to_int_or_none(value: Any) -> Optional[int]:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    try:
        n = int(float(value))
    except (TypeError, ValueError):
        return None
    if n < 0:
        return None
    return n


def _pick_first(*values: Any) -> Any:
    for v in values:
        if v is not None and v != "":
            return v
    return None


def _pick_thumbnail(raw: dict) -> Optional[str]:
    thumbs = raw.get("thumbnails")
    if isinstance(thumbs, list) and thumbs:
        # Prefer the largest thumbnail (last entry is usually largest).
        for t in reversed(thumbs):
            if isinstance(t, dict) and t.get("url"):
                return str(t["url"])
    for key in ("thumbnail", "uploader_avatar", "avatar"):
        v = raw.get(key)
        if isinstance(v, str) and v:
            return v
    return None


def _pick_handle(raw: dict, source_url: str) -> Optional[str]:
    handle = _pick_first(
        raw.get("uploader_id"),
        raw.get("uploaderId"),
        raw.get("handle"),
        raw.get("channel_handle"),
    )
    if isinstance(handle, str) and handle:
        return handle if handle.startswith("@") else f"@{handle}"
    # Fall back to the handle embedded in the source URL (/​@handle).
    try:
        from urllib.parse import urlparse

        path = urlparse(source_url).path or ""
        for part in path.split("/"):
            if part.startswith("@") and len(part) > 1:
                return part
    except Exception:
        pass
    return None


def normalize_channel_info(raw: dict, source_url: str, fetched_at: Optional[str] = None) -> dict:
    """Normalize a raw yt-dlp info dict into the common channel data model."""
    raw = raw or {}
    channel_id = _pick_first(
        raw.get("channel_id"),
        raw.get("channelId"),
        raw.get("uploader_id") if str(raw.get("uploader_id", "")).startswith("UC") else None,
        raw.get("id") if str(raw.get("id", "")).startswith("UC") else None,
    )
    name = _pick_first(
        raw.get("channel"),
        raw.get("uploader"),
        raw.get("title"),
        raw.get("fulltitle"),
    )
    subscriber_count = _to_int_or_none(
        _pick_first(
            raw.get("channel_follower_count"),
            raw.get("subscriber_count"),
            raw.get("subscriberCount"),
            raw.get("followers"),
        )
    )
    view_count = _to_int_or_none(
        _pick_first(
            raw.get("channel_view_count"),
            raw.get("view_count"),
            raw.get("viewCount"),
            raw.get("views"),
        )
    )
    # NOTE: yt-dlp's `playlist_count` on a flat channel extract is the number of
    # channel tabs (usually ~3), NOT the video count, so it must not be used.
    # There is no reliable lightweight video-count field; missing -> None.
    video_count = _to_int_or_none(
        _pick_first(
            raw.get("video_count"),
            raw.get("videoCount"),
        )
    )
    description = raw.get("description")
    if not isinstance(description, str) or not description:
        description = None
    else:
        description = description[:2000]

    return {
        "channelId": str(channel_id) if channel_id else None,
        "name": str(name) if name else None,
        "handle": _pick_handle(raw, source_url),
        "url": str(raw.get("webpage_url") or raw.get("channel_url") or raw.get("uploader_url") or source_url),
        "thumbnail": _pick_thumbnail(raw),
        "subscriberCount": subscriber_count,
        "viewCount": view_count,
        "videoCount": video_count,
        "description": description,
        "updatedAt": fetched_at or _utcnow_iso(),
    }


YDL_OPTS: dict = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    # Do NOT walk the video list: flat extraction of (at most) 1 item.
    "extract_flat": True,
    "playlistend": 1,
    "socket_timeout": 20,
    "retries": 1,
    "fragment_retries": 0,
    "noplaylist": False,
}


def fetch_channel_info(
    url: str,
    ydl_factory: Optional[Callable[..., Any]] = None,
    fetched_at: Optional[str] = None,
) -> dict:
    """Fetch a single channel URL via yt-dlp and return the normalized model.

    Raises the underlying exception on failure; callers decide how to handle it.
    ``ydl_factory`` exists for tests (inject a fake YoutubeDL).
    """
    if ydl_factory is None:
        from yt_dlp import YoutubeDL

        ydl_factory = YoutubeDL
    with ydl_factory(dict(YDL_OPTS)) as ydl:  # type: ignore[operator]
        raw = ydl.extract_info(url, download=False)
    if raw is None:
        raise ValueError(f"yt-dlp returned no data for {url}")
    if raw.get("_type") == "playlist" and not raw.get("channel_id") and not raw.get("channel"):
        # Flat channel listing without metadata: keep entries out, surface what exists.
        pass
    info = normalize_channel_info(raw, url, fetched_at or _utcnow_iso())
    if info.get("name") is None and info.get("channelId") is None:
        raise ValueError(f"yt-dlp returned no channel metadata for {url}")
    info["sourceUrl"] = url
    return info


def _to_iso_date(value: Any) -> Optional[str]:
    """Normalize upload_date 'YYYYMMDD' (or timestamp) to 'YYYY-MM-DD'."""
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        try:
            return datetime.fromtimestamp(float(value), tz=timezone.utc).strftime("%Y-%m-%d")
        except (OSError, OverflowError, ValueError):
            return None
    s = str(value).strip()
    if len(s) == 8 and s.isdigit():
        return f"{s[:4]}-{s[4:6]}-{s[6:]}"
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        return s[:10]
    return None


def normalize_video_info(raw: dict, channel: Optional[dict] = None) -> dict:
    """Normalize a raw yt-dlp video dict into the common video data model."""
    raw = raw or {}
    channel = channel or {}
    video_id = raw.get("id")
    url = raw.get("webpage_url") or raw.get("url") or (
        f"https://www.youtube.com/watch?v={video_id}" if video_id else None
    )
    title = _pick_first(raw.get("title"), raw.get("fulltitle"))
    return {
        "videoId": str(video_id) if video_id else None,
        "title": str(title) if title else None,
        "url": str(url) if url else None,
        "thumbnail": _pick_thumbnail(raw),
        "viewCount": _to_int_or_none(raw.get("view_count")),
        "duration": _to_int_or_none(raw.get("duration")),
        "publishedAt": _to_iso_date(_pick_first(raw.get("upload_date"), raw.get("timestamp"),
                                                raw.get("release_timestamp"))),
        "channelId": str(raw.get("channel_id") or channel.get("channelId") or "") or None,
        "channelName": str(_pick_first(raw.get("channel"), raw.get("uploader"),
                                       channel.get("name")) or "") or None,
        "channelUrl": str(channel.get("url") or raw.get("channel_url") or "") or None,
    }


VIDEO_TAB_OPTS: dict = {
    **YDL_OPTS,
    "extract_flat": True,
}

VIDEO_DETAIL_OPTS: dict = {
    "quiet": True,
    "no_warnings": True,
    "skip_download": True,
    "socket_timeout": 20,
    "retries": 1,
    "fragment_retries": 0,
}


def fetch_channel_videos(
    url: str,
    per_channel: int = 3,
    ydl_factory: Optional[Callable[..., Any]] = None,
) -> list[dict]:
    """Fetch up to ``per_channel`` recent videos (id/title/views) for a channel.

    Costs one flat video-tab request. The flat entries already expose the
    title, thumbnail, ID and view count needed by the ranking, so individual
    video pages are deliberately not opened (this also avoids unnecessary
    anti-bot challenges).
    """
    if ydl_factory is None:
        from yt_dlp import YoutubeDL

        ydl_factory = YoutubeDL
    tab_url = url.rstrip("/") + "/videos"
    with ydl_factory(dict(VIDEO_TAB_OPTS, playlistend=per_channel)) as ydl:  # type: ignore[operator]
        tab = ydl.extract_info(tab_url, download=False)
    entries = (tab or {}).get("entries") or []
    channel = {
        "channelId": (tab or {}).get("channel_id"),
        "name": (tab or {}).get("channel") or (tab or {}).get("uploader"),
        "url": (tab or {}).get("channel_url") or url,
    }
    videos: list[dict] = []
    for e in entries:
        if not isinstance(e, dict) or not e.get("id"):
            continue
        info = normalize_video_info(e, channel)
        if info.get("videoId") and info.get("title"):
            videos.append(info)
        if len(videos) >= per_channel:
            break
    return videos
