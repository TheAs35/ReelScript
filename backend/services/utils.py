"""Utility helpers for ReelScript backend."""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any


# ---------------------------------------------------------------------------
# Instagram URL validation
# ---------------------------------------------------------------------------

_INSTAGRAM_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"https?://(www\.)?instagram\.com/reel/[\w-]+/?"),
    re.compile(r"https?://(www\.)?instagram\.com/p/[\w-]+/?"),
    re.compile(r"https?://(www\.)?instagram\.com/reels/[\w-]+/?"),
]


def is_valid_instagram_url(url: str) -> bool:
    """Return True if *url* matches a known Instagram Reel/post URL pattern.

    Args:
        url: The URL string to validate.

    Returns:
        True when the URL matches at least one recognised Instagram pattern.
    """
    url = url.strip()
    return any(pattern.match(url) for pattern in _INSTAGRAM_PATTERNS)


# ---------------------------------------------------------------------------
# SRT helpers
# ---------------------------------------------------------------------------

def seconds_to_srt_timestamp(seconds: float) -> str:
    """Convert a duration in seconds to an SRT timestamp string.

    Args:
        seconds: Non-negative duration in seconds (may include fractional part).

    Returns:
        A string in the format ``HH:MM:SS,mmm``.
    """
    total_ms = int(round(seconds * 1000))
    ms = total_ms % 1000
    total_s = total_ms // 1000
    secs = total_s % 60
    total_m = total_s // 60
    mins = total_m % 60
    hours = total_m // 60
    return f"{hours:02d}:{mins:02d}:{secs:02d},{ms:03d}"


def generate_srt(segments: list[dict[str, Any]]) -> str:
    """Build SRT file content from Whisper transcription segments.

    Args:
        segments: List of segment dicts, each containing at minimum
            ``start`` (float), ``end`` (float), and ``text`` (str) keys.

    Returns:
        A string with complete SRT-formatted content.
    """
    lines: list[str] = []
    for index, segment in enumerate(segments, start=1):
        start_ts = seconds_to_srt_timestamp(float(segment["start"]))
        end_ts = seconds_to_srt_timestamp(float(segment["end"]))
        text = segment["text"].strip()
        lines.append(str(index))
        lines.append(f"{start_ts} --> {end_ts}")
        lines.append(text)
        lines.append("")  # blank line separator
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Temp file cleanup
# ---------------------------------------------------------------------------

def clean_temp_files(*paths: str | Path) -> None:
    """Delete the given file paths, silently ignoring missing files.

    Args:
        *paths: One or more file paths (str or :class:`pathlib.Path`) to remove.
    """
    for path in paths:
        try:
            os.remove(path)
        except FileNotFoundError:
            pass
        except OSError:
            pass
