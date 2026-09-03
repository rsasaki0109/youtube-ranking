"""Shared compact-number formatting logic (mirrored in src/lib/format.ts).

Keep the integer in stored data; format only for display.
"""

from __future__ import annotations

from typing import Optional, Union

Number = Union[int, float, None]


def format_compact(value: Optional[float]) -> str:
    """Format a large number compactly: 1234 -> '1.2K', 1.4e9 -> '1.4B'.

    Returns '-' for None.
    """
    if value is None:
        return "-"
    try:
        n = float(value)
    except (TypeError, ValueError):
        return "-"
    sign = "-" if n < 0 else ""
    n = abs(n)
    if n < 1000:
        if float(n).is_integer():
            return f"{sign}{int(n):,}"
        return f"{sign}{n:,.1f}".rstrip("0").rstrip(".")
    for threshold, suffix in ((1_000_000_000, "B"), (1_000_000, "M"), (1_000, "K")):
        if n >= threshold:
            v = n / threshold
            if v >= 100:
                text = f"{v:.0f}"
            elif v >= 10:
                text = f"{v:.1f}".rstrip("0").rstrip(".")
            else:
                text = f"{v:.1f}".rstrip("0").rstrip(".")
            return f"{sign}{text}{suffix}"
    return f"{sign}{int(n):,}"


def format_int(value: Number) -> str:
    """Format an integer with thousands separators. None -> '-'."""
    if value is None:
        return "-"
    try:
        return f"{int(value):,}"
    except (TypeError, ValueError):
        return "-"


def format_growth(value: Number) -> str:
    """Format a growth delta with an explicit sign: +12,300 / -5 / '-'."""
    if value is None:
        return "-"
    try:
        n = int(value)
    except (TypeError, ValueError):
        return "-"
    if n == 0:
        return "+0"
    sign = "+" if n > 0 else "-"
    return f"{sign}{format_compact(abs(n))}"
