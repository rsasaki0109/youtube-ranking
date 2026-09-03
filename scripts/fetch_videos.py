"""Fetch recent videos per channel for the Top Videos ranking.

Usage:
    python scripts/fetch_videos.py [--config config/channels.yml]
        [--out data/videos.json] [--per-channel 3] [--workers 4]

Request budget: ~1 (flat video tab) + per_channel (one light extract per
video) requests per channel. Videos are an enhancement: even a total failure
writes an empty list and exits 0 so the core channel update still succeeds.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_channels import load_channels  # noqa: E402
from youtube_provider import fetch_channel_videos  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent


def fetch_one(entry: dict, per_channel: int) -> tuple[dict, list[dict], str | None]:
    try:
        videos = fetch_channel_videos(entry["url"], per_channel=per_channel)
    except Exception as exc:  # noqa: BLE001 - per-channel fault tolerance
        return entry, [], str(exc)[:300]
    enriched: list[dict] = []
    for v in videos:
        enriched.append({
            **v,
            "channelId": v.get("channelId"),
            "channelName": v.get("channelName"),
            "channelUrl": entry["url"] if not v.get("channelUrl") else v.get("channelUrl"),
            "category": entry.get("category"),
            "country": entry.get("country"),
            "sourceUrl": entry["url"],
        })
    return entry, enriched, None


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch recent videos per channel")
    parser.add_argument("--config", default=str(ROOT / "config" / "channels.yml"))
    parser.add_argument("--out", default=str(ROOT / "data" / "videos.json"))
    parser.add_argument("--per-channel", type=int, default=3)
    parser.add_argument("--workers", type=int, default=4)
    parser.add_argument("--interval", type=float, default=0.0,
                        help="Extra seconds between channel fetches (in addition to threading).")
    args = parser.parse_args()

    config_path = Path(args.config)
    if not config_path.exists():
        print(f"ERROR: config not found: {config_path}", file=sys.stderr)
        return 1
    channels = load_channels(config_path)
    if not channels:
        print("ERROR: no channels configured", file=sys.stderr)
        return 1

    stamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    videos: list[dict] = []
    failed = 0
    workers = max(1, min(args.workers, len(channels)))
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(fetch_one, ch, args.per_channel): ch for ch in channels}
        for fut in as_completed(futures):
            entry, found, error = fut.result()
            if error is not None:
                failed += 1
                print(f"WARNING {entry['url']}: {error}")
            videos.extend(found)
            if args.interval > 0:
                time.sleep(args.interval)

    for v in videos:
        v["fetchedAt"] = stamp
    # Stable order: viewCount desc, nulls last, then title.
    videos.sort(key=lambda v: (
        v.get("viewCount") is None, -(v.get("viewCount") or 0), str(v.get("title") or "")))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(
        json.dumps({"generatedAt": stamp, "videos": videos}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"{len(videos)} videos collected from {len(channels) - failed}/{len(channels)} channels")
    if failed == len(channels):
        print("WARNING: all video fetches failed — topVideos will be empty")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
