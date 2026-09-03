"""Build pre-computed rankings (current values + growth) for the frontend.

Usage:
    python scripts/build_rankings.py [--latest data/latest.json]
        [--history-dir data/history] [--out data/rankings.json]

Growth:
    growth = currentValue - previousValue (None if either side is None).

Snapshot search:
    For a period of N days, look for the history snapshot whose age is closest
    to N days, within a tolerance window. Only snapshots strictly older than
    today are considered.
        1 day  -> ages 1..3   (tolerance 2)
        7 days -> ages 4..10  (tolerance 3)
        30 days -> ages 25..35 (tolerance 5)
    Newer snapshot wins ties. No candidate -> growth is None.

Ranking:
    Sorted descending, None last. Ties share the same rank (competition
    ranking: 1, 2, 2, 4). Ranks are 1-based.
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CURRENT_KEYS = ("subscribers", "views", "videos")
GROWTH_KEYS = (
    "subscriberGrowth24h", "subscriberGrowth7d", "subscriberGrowth30d",
    "viewGrowth24h", "viewGrowth7d", "viewGrowth30d",
)
ALL_KEYS = (*CURRENT_KEYS, *GROWTH_KEYS)

FIELD_FOR_KEY = {
    "subscribers": "subscriberCount",
    "views": "viewCount",
    "videos": "videoCount",
    "subscriberGrowth24h": "subscriberCount",
    "subscriberGrowth7d": "subscriberCount",
    "subscriberGrowth30d": "subscriberCount",
    "viewGrowth24h": "viewCount",
    "viewGrowth7d": "viewCount",
    "viewGrowth30d": "viewCount",
}

PERIOD_FOR_KEY = {
    "subscriberGrowth24h": 1, "viewGrowth24h": 1,
    "subscriberGrowth7d": 7, "viewGrowth7d": 7,
    "subscriberGrowth30d": 30, "viewGrowth30d": 30,
}

TOLERANCE_FOR_PERIOD = {1: 2, 7: 3, 30: 5}

# Time-series points kept per channel for frontend charts (bounded size).
SERIES_MAX_POINTS = 45
# Channels shown in the "trending" highlights strip.
HIGHLIGHT_COUNT = 5


def parse_day(name: str):
    try:
        return datetime.strptime(name, "%Y-%m-%d").date()
    except ValueError:
        return None


def load_history(history_dir: Path) -> dict[str, dict[str, dict]]:
    """Return {YYYY-MM-DD: {key: channel}} where key is sourceUrl/url/channelId."""
    out: dict[str, dict[str, dict]] = {}
    if not history_dir.exists():
        return out
    for path in sorted(history_dir.glob("*.json")):
        day = parse_day(path.stem)
        if day is None:
            continue
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        channels = data.get("channels", []) if isinstance(data, dict) else []
        by_key: dict[str, dict] = {}
        for ch in channels:
            if not isinstance(ch, dict):
                continue
            for k in (ch.get("sourceUrl"), ch.get("url"), ch.get("channelId")):
                if k:
                    by_key.setdefault(str(k), ch)
        out[path.stem] = by_key
    return out


def channel_key(ch: dict) -> str:
    for k in (ch.get("sourceUrl"), ch.get("url"), ch.get("channelId")):
        if k:
            return str(k)
    return str(ch.get("name") or id(ch))


def find_snapshot_for_period(
    history: dict[str, dict[str, dict]],
    today_str: str,
    days_ago: int,
    tolerance: int | None = None,
) -> str | None:
    """Find the snapshot date string closest to (today - days_ago) within tolerance."""
    today = parse_day(today_str)
    if today is None:
        return None
    tol = TOLERANCE_FOR_PERIOD.get(days_ago, 3) if tolerance is None else tolerance
    best: str | None = None
    best_dist: int | None = None
    for day_str in history:
        day = parse_day(day_str)
        if day is None:
            continue
        age = (today - day).days
        if age < 1:  # only strictly older snapshots
            continue
        dist = abs(age - days_ago)
        if dist > tol:
            continue
        if best is None or dist < best_dist or (dist == best_dist and age < (today - parse_day(best)).days):  # type: ignore[arg-type]
            best, best_dist = day_str, dist
    return best


def calc_growth(current: int | None, previous: int | None) -> int | None:
    if current is None or previous is None:
        return None
    try:
        return int(current) - int(previous)
    except (TypeError, ValueError):
        return None


def compute_growths(
    channel: dict,
    history: dict[str, dict[str, dict]],
    today_str: str,
) -> dict[str, int | None]:
    key = channel_key(channel)
    growths: dict[str, int | None] = {}
    for gkey in GROWTH_KEYS:
        period = PERIOD_FOR_KEY[gkey]
        field = FIELD_FOR_KEY[gkey]
        snap = find_snapshot_for_period(history, today_str, period)
        if snap is None:
            growths[gkey] = None
            continue
        old = history[snap].get(key)
        growths[gkey] = calc_growth(channel.get(field), (old or {}).get(field))
    return growths


def rank_items(items: list[dict], value_fn) -> list[dict]:
    """Sort desc (None last) and assign competition ranks (1,2,2,4)."""
    ordered = sorted(
        items,
        key=lambda c: (value_fn(c) is None, -(value_fn(c) or 0), str(c.get("name") or "").lower()),
    )
    ranked: list[dict] = []
    prev_value = object()
    prev_rank = 0
    for i, ch in enumerate(ordered, start=1):
        v = value_fn(ch)
        rank = prev_rank if v == prev_value else i
        ranked.append({**ch, "rank": rank, "value": v})
        prev_value, prev_rank = v, rank
    return ranked


def slim(channel: dict) -> dict:
    return {
        "channelId": channel.get("channelId"),
        "name": channel.get("name"),
        "handle": channel.get("handle"),
        "url": channel.get("url"),
        "thumbnail": channel.get("thumbnail"),
        "subscriberCount": channel.get("subscriberCount"),
        "viewCount": channel.get("viewCount"),
        "videoCount": channel.get("videoCount"),
        "description": channel.get("description"),
        "category": channel.get("category"),
        "country": channel.get("country"),
        "updatedAt": channel.get("updatedAt"),
    }


def build(latest: dict, history: dict[str, dict[str, dict]]) -> dict:
    channels = latest.get("channels", []) if isinstance(latest, dict) else []
    channels = [c for c in channels if isinstance(c, dict)]
    today_str = str((latest.get("generatedAt") or "")[:10])

    enriched: list[dict] = []
    for ch in channels:
        growths = compute_growths(ch, history, today_str) if parse_day(today_str) else {k: None for k in GROWTH_KEYS}
        enriched.append({**slim(ch), "sourceUrl": ch.get("sourceUrl"), "growth": growths})

    out_channels: dict[str, list[dict]] = {}
    for key in CURRENT_KEYS:
        field = FIELD_FOR_KEY[key]
        out_channels[key] = [
            {k: v for k, v in item.items() if k not in ("growth", "sourceUrl")}
            for item in rank_items(enriched, lambda c, f=field: c.get(f))
        ]
    for key in GROWTH_KEYS:
        out_channels[key] = [
            {**{k: v for k, v in item.items() if k not in ("growth", "sourceUrl")},
             "growthValue": item["growth"][key]}
            for item in rank_items(enriched, lambda c, k=key: c["growth"][k])
        ]

    return {
        "generatedAt": latest.get("generatedAt"),
        "channels": out_channels,
        "highlights": {
            "subscriberGrowth7d": pick_highlights(out_channels["subscriberGrowth7d"]),
            "viewGrowth7d": pick_highlights(out_channels["viewGrowth7d"]),
        },
        "series": build_series(channels, history),
        "meta": {
            "channelCount": len(enriched),
            "historyDays": len(history),
        },
    }


def series_key(channel: dict) -> str:
    """Stable key shared with the frontend: channelId, else URL."""
    for k in (channel.get("channelId"), channel.get("url"), channel.get("sourceUrl")):
        if k:
            return str(k)
    return str(channel.get("name") or "")


def build_series(
    channels: list[dict],
    history: dict[str, dict[str, dict]],
) -> dict[str, list[dict]]:
    """Per-channel time series of {date, subscribers, views}, oldest first.

    Includes the current snapshot as the last point. Capped at
    SERIES_MAX_POINTS recent points to bound rankings.json size.
    """
    days = sorted(d for d in history if parse_day(d) is not None)
    series: dict[str, list[dict]] = {}
    for ch in channels:
        key = channel_key(ch)
        points: list[dict] = []
        for day in days:
            old = history[day].get(key) or {}
            points.append({
                "date": day,
                "subscribers": old.get("subscriberCount"),
                "views": old.get("viewCount"),
            })
        points.append({
            "date": str((ch.get("updatedAt") or "")[:10]),
            "subscribers": ch.get("subscriberCount"),
            "views": ch.get("viewCount"),
        })
        # Drop leading/trailing empties, keep chronological, cap to recent.
        points = [p for p in points if p["date"]]
        series[series_key(ch)] = points[-SERIES_MAX_POINTS:]
    return series


def pick_highlights(ranked: list[dict]) -> list[dict]:
    """Top entries with positive growth for the trending strip."""
    out: list[dict] = []
    for item in ranked:
        g = item.get("growthValue")
        if not isinstance(g, int) or isinstance(g, bool) or g <= 0:
            continue
        out.append({
            "channelId": item.get("channelId"),
            "name": item.get("name"),
            "handle": item.get("handle"),
            "url": item.get("url"),
            "thumbnail": item.get("thumbnail"),
            "subscriberCount": item.get("subscriberCount"),
            "growth": g,
        })
        if len(out) >= HIGHLIGHT_COUNT:
            break
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Build rankings.json")
    parser.add_argument("--latest", default=str(ROOT / "data" / "latest.json"))
    parser.add_argument("--history-dir", default=str(ROOT / "data" / "history"))
    parser.add_argument("--out", default=str(ROOT / "data" / "rankings.json"))
    args = parser.parse_args()

    latest_path = Path(args.latest)
    if not latest_path.exists():
        print(f"ERROR: latest.json not found: {latest_path}", file=sys.stderr)
        return 1

    try:
        latest = json.loads(latest_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        print(f"ERROR: latest.json is broken: {exc}", file=sys.stderr)
        return 1
    if not isinstance(latest, dict) or not isinstance(latest.get("channels"), list):
        print("ERROR: latest.json has invalid shape", file=sys.stderr)
        return 1

    history = load_history(Path(args.history_dir))
    result = build(latest, history)
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"rankings.json built: {result['meta']['channelCount']} channels, "
          f"{result['meta']['historyDays']} history days")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
