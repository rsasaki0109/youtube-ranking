import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))

from build_rankings import (  # noqa: E402
    build,
    build_series,
    build_top_videos,
    calc_growth,
    channel_key,
    find_snapshot_for_period,
    pick_highlights,
    rank_items,
    series_key,
)
from format_utils import format_compact, format_growth, format_int  # noqa: E402
from validate_data import validate_latest, validate_rankings  # noqa: E402
from youtube_provider import normalize_channel_info, normalize_video_info  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures"


def load_latest():
    return json.loads((FIXTURES / "latest.json").read_text(encoding="utf-8"))


def make_history(today, entries):
    """entries: list of (day_str, {key: {field: value}})."""
    return {day: chans for day, chans in entries}


# --- growth calculation ---

def test_subscriber_growth_basic():
    assert calc_growth(1_100_000, 1_000_000) == 100_000


def test_view_growth_basic():
    assert calc_growth(6_100_000, 6_000_000) == 100_000


def test_growth_negative():
    assert calc_growth(900, 1000) == -100


def test_growth_null_current():
    assert calc_growth(None, 1000) is None


def test_growth_null_previous():
    assert calc_growth(1000, None) is None


def test_growth_both_null():
    assert calc_growth(None, None) is None


def test_growth_invalid_data():
    assert calc_growth("abc", 100) is None
    assert calc_growth(100, "xyz") is None


# --- snapshot exploration ---

def test_snapshot_exact_match():
    history = make_history("2026-09-03", [
        ("2026-09-02", {}),
        ("2026-08-27", {}),
    ])
    assert find_snapshot_for_period(history, "2026-09-03", 1) == "2026-09-02"
    assert find_snapshot_for_period(history, "2026-09-03", 7) == "2026-08-27"


def test_snapshot_fallback_to_nearest_past():
    # 30 days ago (2026-08-04) missing -> 29 days ago used.
    history = make_history("2026-09-03", [
        ("2026-08-05", {}),
        ("2026-08-06", {}),
    ])
    assert find_snapshot_for_period(history, "2026-09-03", 30) == "2026-08-05"


def test_snapshot_too_far_away_returns_none():
    history = make_history("2026-09-03", [("2026-08-01", {})])  # age 33, dist 3.. within tol 5?
    # age 33 vs 30 -> dist 3 <= 5, so it IS used; use a really old one instead.
    history = make_history("2026-09-03", [("2026-06-01", {})])
    assert find_snapshot_for_period(history, "2026-09-03", 30) is None
    assert find_snapshot_for_period(history, "2026-09-03", 7) is None
    assert find_snapshot_for_period(history, "2026-09-03", 1) is None


def test_snapshot_insufficient_history():
    assert find_snapshot_for_period({}, "2026-09-03", 7) is None


def test_snapshot_ignores_today_and_future():
    history = make_history("2026-09-03", [
        ("2026-09-03", {}),
        ("2026-09-04", {}),
    ])
    assert find_snapshot_for_period(history, "2026-09-03", 1) is None


# --- ranking sort & ties ---

def test_ranking_sort_desc_nulls_last():
    items = [
        {"name": "b", "subscriberCount": 100},
        {"name": "a", "subscriberCount": None},
        {"name": "c", "subscriberCount": 300},
    ]
    ranked = rank_items(items, lambda c: c.get("subscriberCount"))
    assert [r["name"] for r in ranked] == ["c", "b", "a"]
    assert [r["rank"] for r in ranked] == [1, 2, 3]


def test_ranking_ties_share_rank_competition():
    items = [
        {"name": "a", "subscriberCount": 100},
        {"name": "b", "subscriberCount": 200},
        {"name": "c", "subscriberCount": 200},
        {"name": "d", "subscriberCount": 50},
    ]
    ranked = rank_items(items, lambda c: c.get("subscriberCount"))
    ranks = {r["name"]: r["rank"] for r in ranked}
    assert ranks["b"] == 1 and ranks["c"] == 1
    assert ranks["a"] == 3
    assert ranks["d"] == 4


def test_build_rankings_all_keys_present():
    latest = load_latest()
    latest = {**latest, "generatedAt": "2026-09-03T09:00:00Z"}
    history = {
        "2026-09-02": {channel_key(c): c for c in latest["channels"]},
        "2026-08-27": {channel_key(c): {**c,
            "subscriberCount": (c["subscriberCount"] - 1000) if c["subscriberCount"] else None,
            "viewCount": (c["viewCount"] - 5000) if c["viewCount"] else None} for c in latest["channels"]},
    }
    result = build(latest, history)
    for key in ("subscribers", "views", "videos",
                "subscriberGrowth24h", "subscriberGrowth7d", "subscriberGrowth30d",
                "viewGrowth24h", "viewGrowth7d", "viewGrowth30d"):
        assert key in result["channels"]
    # 24h growth vs identical snapshot -> 0
    g24 = {r["channelId"]: r["growthValue"] for r in result["channels"]["subscriberGrowth24h"]}
    assert g24["UCaurora001"] == 0
    # 7d growth -> +1000
    g7 = {r["channelId"]: r["growthValue"] for r in result["channels"]["subscriberGrowth7d"]}
    assert g7["UCaurora001"] == 1000
    # null channel stays null
    assert g7[None] is None


def test_build_rankings_no_history_growth_null():
    latest = load_latest()
    result = build(latest, {})
    for key in ("subscriberGrowth7d", "viewGrowth30d"):
        assert all(r["growthValue"] is None for r in result["channels"][key])


def test_build_preserves_country_and_category():
    latest = load_latest()
    result = build(latest, {})
    by_id = {r["channelId"]: r for r in result["channels"]["subscribers"]}
    assert by_id["UCaurora001"]["country"] == "JP"
    assert by_id["UCtech003"]["country"] == "US"
    assert by_id["UCtech003"]["category"] == "tech"


def test_build_series_chronological_with_current_last():
    latest = load_latest()
    latest = {**latest, "generatedAt": "2026-09-03T09:00:00Z"}
    ch = latest["channels"][0]
    key = channel_key(ch)
    history = {
        "2026-08-27": {key: {"subscriberCount": 100, "viewCount": 1000}},
        "2026-09-02": {key: {"subscriberCount": 150, "viewCount": 1500}},
    }
    series = build_series(latest["channels"], history)
    pts = series[series_key(ch)]
    assert [p["date"] for p in pts] == ["2026-08-27", "2026-09-02", ch["updatedAt"][:10]]
    assert pts[-1]["subscribers"] == ch["subscriberCount"]
    assert pts[0] == {"date": "2026-08-27", "subscribers": 100, "views": 1000}


def test_build_series_caps_points():
    ch = {"channelId": "UC1", "url": "https://x", "subscriberCount": 10,
          "viewCount": 20, "updatedAt": "2026-09-03T09:00:00Z"}
    history = {
        f"2026-01-{d:02d}": {"https://x": {"subscriberCount": d, "viewCount": d}}
        for d in range(1, 32)
    }
    import build_rankings

    old_max, build_rankings.SERIES_MAX_POINTS = build_rankings.SERIES_MAX_POINTS, 5
    try:
        pts = build_series([ch], history)[series_key(ch)]
    finally:
        build_rankings.SERIES_MAX_POINTS = old_max
    assert len(pts) == 5
    assert pts[-1]["subscribers"] == 10  # current snapshot is last


def test_pick_highlights_top_positive_only():
    ranked = [
        {"name": "a", "growthValue": 500},
        {"name": "b", "growthValue": None},
        {"name": "c", "growthValue": 0},
        {"name": "d", "growthValue": -10},
        {"name": "e", "growthValue": 300},
    ]
    out = pick_highlights(ranked)
    assert [o["name"] for o in out] == ["a", "e"]


def test_top_videos_sort_and_ties():
    videos = [
        {"videoId": "a", "title": "A", "url": "https://youtu.be/a", "viewCount": 10},
        {"videoId": "b", "title": "B", "url": "https://youtu.be/b", "viewCount": 30},
        {"videoId": "c", "title": "C", "url": "https://youtu.be/c", "viewCount": 30},
        {"videoId": "d", "title": "D", "url": "https://youtu.be/d", "viewCount": None},
        {"videoId": "bad", "title": None, "url": "https://youtu.be/bad", "viewCount": 99},
    ]
    ranked = build_top_videos(videos)
    assert [v["videoId"] for v in ranked] == ["b", "c", "a", "d"]
    assert [v["rank"] for v in ranked] == [1, 1, 3, 4]


def test_build_includes_highlights_and_series():
    latest = load_latest()
    latest = {**latest, "generatedAt": "2026-09-03T09:00:00Z"}
    history = {
        "2026-09-02": {channel_key(c): c for c in latest["channels"]},
        "2026-08-27": {channel_key(c): {**c,
            "subscriberCount": (c["subscriberCount"] - 1000) if c["subscriberCount"] else None,
            "viewCount": (c["viewCount"] - 5000) if c["viewCount"] else None} for c in latest["channels"]},
    }
    result = build(latest, history)
    assert set(result["highlights"]) == {"subscriberGrowth7d", "viewGrowth7d"}
    top = result["highlights"]["subscriberGrowth7d"][0]
    assert top["growth"] == 1000 and top["channelId"] == "UCaurora001"
    assert isinstance(result["series"], dict) and len(result["series"]) == len(latest["channels"])


def test_load_channels_reads_country_and_dedupes(tmp_path):
    from fetch_channels import load_channels

    cfg = tmp_path / "channels.yml"
    cfg.write_text(
        "channels:\n"
        "  - url: https://www.youtube.com/@a\n"
        "    country: jp\n"
        "    category: music\n"
        "  - url: https://www.youtube.com/@a\n"
        "    country: JP\n"
        "  - url: https://www.youtube.com/@b\n",
        encoding="utf-8",
    )
    channels = load_channels(cfg)
    assert channels == [
        {"url": "https://www.youtube.com/@a", "category": "music", "country": "JP"},
        {"url": "https://www.youtube.com/@b", "category": None, "country": None},
    ]


# --- invalid data ---

def test_validate_latest_invalid():
    assert validate_latest({}) != []
    assert validate_latest({"channels": []}) != []
    assert validate_latest({"channels": [{"subscriberCount": "lots"}]}) != []


def test_validate_rankings_missing_keys():
    assert validate_rankings({}) != []
    assert validate_rankings({"channels": {"subscribers": []}}) != []


def test_validate_sample_latest_ok():
    assert validate_latest(load_latest()) == []


# --- normalize / null handling ---

def test_normalize_full_fields():
    raw = {
        "channel_id": "UCxxxx",
        "channel": "Example",
        "uploader_id": "@example",
        "channel_follower_count": 1230000,
        "channel_view_count": 987654321,
        "video_count": 543,
        "description": "hello",
        "webpage_url": "https://www.youtube.com/@example",
        "thumbnails": [{"url": "https://t/small"}, {"url": "https://t/large"}],
    }
    info = normalize_channel_info(raw, "https://www.youtube.com/@example")
    assert info["channelId"] == "UCxxxx"
    assert info["subscriberCount"] == 1230000
    assert info["viewCount"] == 987654321
    assert info["videoCount"] == 543
    assert info["thumbnail"] == "https://t/large"
    assert info["handle"] == "@example"


def test_normalize_ignores_playlist_count():
    # playlist_count on a flat channel extract is the tab count, not videos.
    raw = {"channel": "X", "channel_id": "UC1", "playlist_count": 3, "view_count": None}
    info = normalize_channel_info(raw, "https://www.youtube.com/@x")
    assert info["videoCount"] is None
    assert info["viewCount"] is None


def test_normalize_missing_fields_become_null():
    info = normalize_channel_info({}, "https://www.youtube.com/@gone")
    assert info["subscriberCount"] is None
    assert info["viewCount"] is None
    assert info["thumbnail"] is None
    assert info["handle"] == "@gone"  # falls back to URL handle


def test_normalize_private_subscribers():
    info = normalize_channel_info({"channel": "X", "channel_id": "UC1"}, "https://x")
    assert info["subscriberCount"] is None
    assert info["name"] == "X"


def test_normalize_video_fields_without_download():
    info = normalize_video_info({
        "id": "abc123",
        "title": "Example video",
        "view_count": 12345,
        "upload_date": "20260903",
        "channel_id": "UC1",
        "channel": "Example",
    })
    assert info["videoId"] == "abc123"
    assert info["url"] == "https://www.youtube.com/watch?v=abc123"
    assert info["viewCount"] == 12345
    assert info["publishedAt"] == "2026-09-03"
    assert info["channelId"] == "UC1"


# --- number formatting ---

def test_format_compact():
    assert format_compact(None) == "-"
    assert format_compact(999) == "999"
    assert format_compact(1234) == "1.2K"
    assert format_compact(12_300) == "12.3K"
    assert format_compact(1_200_000) == "1.2M"
    assert format_compact(123_000_000) == "123M"
    assert format_compact(1_400_000_000) == "1.4B"


def test_format_int():
    assert format_int(None) == "-"
    assert format_int(1234567) == "1,234,567"


def test_format_growth():
    assert format_growth(None) == "-"
    assert format_growth(0) == "+0"
    assert format_growth(12300) == "+12.3K"
    assert format_growth(-500) == "-500"
