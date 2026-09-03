"""Validate latest.json / rankings.json shapes. Exit 1 on critical problems.

Usage:
    python scripts/validate_data.py [--latest data/latest.json] [--rankings data/rankings.json]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RANKING_KEYS = (
    "subscribers", "views", "videos",
    "subscriberGrowth24h", "subscriberGrowth7d", "subscriberGrowth30d",
    "viewGrowth24h", "viewGrowth7d", "viewGrowth30d",
)


def _is_int_or_none(v) -> bool:
    return v is None or (isinstance(v, int) and not isinstance(v, bool))


def validate_latest(data: object) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["latest.json root must be an object"]
    channels = data.get("channels")
    if not isinstance(channels, list) or not channels:
        return ["latest.json channels must be a non-empty array"]
    for i, ch in enumerate(channels):
        if not isinstance(ch, dict):
            errors.append(f"channels[{i}] must be an object")
            continue
        for field in ("subscriberCount", "viewCount", "videoCount"):
            if not _is_int_or_none(ch.get(field)):
                errors.append(f"channels[{i}].{field} must be int or null")
        url = ch.get("url") or ch.get("sourceUrl")
        if not url:
            errors.append(f"channels[{i}] missing url")
    return errors


def validate_rankings(data: object) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["rankings.json root must be an object"]
    channels = data.get("channels")
    if not isinstance(channels, dict):
        return ["rankings.json channels must be an object"]
    for key in RANKING_KEYS:
        if key not in channels:
            errors.append(f"rankings.json channels.{key} missing")
        elif not isinstance(channels[key], list):
            errors.append(f"rankings.json channels.{key} must be an array")
    highlights = data.get("highlights")
    if not isinstance(highlights, dict):
        errors.append("rankings.json highlights must be an object")
    else:
        for key in ("subscriberGrowth7d", "viewGrowth7d"):
            if not isinstance(highlights.get(key), list):
                errors.append(f"rankings.json highlights.{key} must be an array")
    if not isinstance(data.get("series"), dict):
        errors.append("rankings.json series must be an object")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate generated JSON data")
    parser.add_argument("--latest", default=str(ROOT / "data" / "latest.json"))
    parser.add_argument("--rankings", default=str(ROOT / "data" / "rankings.json"))
    args = parser.parse_args()
    errors: list[str] = []
    for path, validator in ((args.latest, validate_latest), (args.rankings, validate_rankings)):
        p = Path(path)
        if not p.exists():
            errors.append(f"missing file: {path}")
            continue
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            errors.append(f"broken JSON {path}: {exc}")
            continue
        errors.extend(validator(data))
    if errors:
        print("VALIDATION FAILED:")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("validation OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
