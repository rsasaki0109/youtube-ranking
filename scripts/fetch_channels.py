"""Fetch YouTube channel metadata and store daily snapshots.

Usage:
    python scripts/fetch_channels.py [--config config/channels.yml]
        [--latest data/latest.json] [--history-dir data/history]
        [--interval 2.0] [--date YYYY-MM-DD]

- One yt-dlp extract per unique URL (deduplicated).
- Failures are collected as warnings; the run only fails if ALL channels fail.
- Failed channels keep their previous latest.json record (marked stale) when available.
- History file for the UTC date is (over)written, never duplicated.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import yaml

sys.path.insert(0, str(Path(__file__).resolve().parent))
from youtube_provider import fetch_channel_info  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def load_channels(config_path: Path) -> list[dict]:
    with config_path.open(encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    raw = data.get("channels") or []
    seen: set[str] = set()
    channels: list[dict] = []
    for entry in raw:
        if not isinstance(entry, dict):
            continue
        url = str(entry.get("url") or "").strip()
        if not url or url in seen:
            continue
        seen.add(url)
        category = entry.get("category")
        country = entry.get("country")
        channels.append({
            "url": url,
            "category": str(category) if category else None,
            "country": str(country).upper() if country else None,
        })
    return channels


def load_previous_latest(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    prev: dict[str, dict] = {}
    for ch in data.get("channels", []) if isinstance(data, dict) else []:
        if isinstance(ch, dict):
            key = ch.get("sourceUrl") or ch.get("url")
            if key:
                prev[str(key)] = ch
    return prev


def fetch_all(
    channels: list[dict],
    interval: float = 2.0,
    fetched_at: str | None = None,
    sleep: bool = True,
) -> tuple[list[dict], list[dict]]:
    """Fetch every channel; returns (updated, failed). Never raises per-channel."""
    updated: list[dict] = []
    failed: list[dict] = []
    stamp = fetched_at or datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    for i, ch in enumerate(channels):
        url = ch["url"]
        try:
            info = fetch_channel_info(url, fetched_at=stamp)
            info["category"] = ch.get("category")
            info["country"] = ch.get("country")
            updated.append(info)
        except Exception as exc:  # noqa: BLE001 - fault tolerance is the point
            failed.append({"url": url, "category": ch.get("category"), "error": str(exc)[:500]})
        if sleep and interval > 0 and i < len(channels) - 1:
            time.sleep(interval)
    return updated, failed


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch channel metadata via yt-dlp")
    parser.add_argument("--config", default=str(ROOT / "config" / "channels.yml"))
    parser.add_argument("--latest", default=str(ROOT / "data" / "latest.json"))
    parser.add_argument("--history-dir", default=str(ROOT / "data" / "history"))
    parser.add_argument("--interval", type=float, default=2.0,
                        help="Seconds to wait between channel fetches (rate limiting).")
    parser.add_argument("--date", default=None, help="Override UTC date YYYY-MM-DD for history file.")
    args = parser.parse_args()

    config_path = Path(args.config)
    latest_path = Path(args.latest)
    history_dir = Path(args.history_dir)
    if not config_path.exists():
        print(f"ERROR: config not found: {config_path}", file=sys.stderr)
        return 1

    channels = load_channels(config_path)
    if not channels:
        print("ERROR: no channels configured in channels.yml", file=sys.stderr)
        return 1

    prev = load_previous_latest(latest_path)
    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    updated, failed = fetch_all(channels, interval=args.interval, fetched_at=stamp)

    # Carry over previous records for failed channels so history stays continuous.
    records: list[dict] = list(updated)
    carried = 0
    for f in failed:
        old = prev.get(f["url"])
        if old:
            stale = dict(old)
            stale["stale"] = True
            records.append(stale)
            carried += 1

    if not records:
        print(f"ERROR: all {len(channels)} channel fetches failed", file=sys.stderr)
        for f in failed:
            print(f"  FAILED {f['url']}: {f['error']}", file=sys.stderr)
        return 1

    # Stable order: subscriberCount desc, nulls last, then name.
    records.sort(key=lambda c: (
        c.get("subscriberCount") is None,
        -(c.get("subscriberCount") or 0),
        (c.get("name") or "").lower(),
    ))

    latest_path.parent.mkdir(parents=True, exist_ok=True)
    history_dir.mkdir(parents=True, exist_ok=True)
    payload = {"generatedAt": stamp, "channels": records}
    latest_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    day = args.date or now.strftime("%Y-%m-%d")
    history_path = history_dir / f"{day}.json"
    history_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"{len(updated)} channels updated, {len(failed)} channels failed "
          f"({carried} carried over from previous snapshot)")
    for f in failed:
        print(f"WARNING {f['url']}: {f['error']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
