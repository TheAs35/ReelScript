"""Audio extraction and Whisper transcription services."""

from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from typing import Any, Optional

import whisper


# ---------------------------------------------------------------------------
# Audio extraction
# ---------------------------------------------------------------------------

def _extract_audio_sync(video_path: str, audio_path: str) -> None:
    """Extract mono 16 kHz WAV audio from a video file using FFmpeg.

    Args:
        video_path: Absolute path to the source video file.
        audio_path: Absolute path where the WAV file will be written.

    Raises:
        RuntimeError: When FFmpeg exits with a non-zero return code.
    """
    cmd = [
        "ffmpeg",
        "-y",              # overwrite output without prompting
        "-i", video_path,
        "-ar", "16000",    # sample rate 16 kHz
        "-ac", "1",        # mono channel
        "-f", "wav",
        audio_path,
    ]
    result = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if result.returncode != 0:
        stderr_text = result.stderr.decode(errors="replace")
        raise RuntimeError(
            f"Erro ao extrair áudio com FFmpeg (código {result.returncode}): "
            f"{stderr_text[-500:]}"
        )


async def extract_audio(video_path: str, audio_path: str) -> None:
    """Async wrapper around :func:`_extract_audio_sync`.

    Args:
        video_path: Path to the source video file.
        audio_path: Destination path for the extracted WAV file.

    Raises:
        RuntimeError: Propagated from :func:`_extract_audio_sync`.
    """
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _extract_audio_sync, video_path, audio_path)


# ---------------------------------------------------------------------------
# Whisper transcription
# ---------------------------------------------------------------------------

def _transcribe_sync(
    audio_path: str,
    model_name: str,
    language: Optional[str],
) -> dict[str, Any]:
    """Load a Whisper model and transcribe *audio_path*.

    Args:
        audio_path: Path to the WAV (or any audio) file to transcribe.
        model_name: Whisper model size string, e.g. ``"base"``, ``"small"``,
            ``"medium"``, ``"large"``.
        language: BCP-47 language code (e.g. ``"pt"``, ``"en"``).  Pass
            ``None`` or ``"auto"`` to let Whisper auto-detect.

    Returns:
        A dict with the following keys:

        - ``text`` (str): Full concatenated transcript.
        - ``segments`` (list[dict]): Per-segment dicts with ``start``,
          ``end``, and ``text`` keys.
        - ``language`` (str): Detected or specified language code.
        - ``duration`` (float): Total audio duration in seconds.
    """
    model = whisper.load_model(model_name)

    transcribe_kwargs: dict[str, Any] = {"word_timestamps": True}
    if language and language.lower() not in ("auto", ""):
        transcribe_kwargs["language"] = language

    result = model.transcribe(audio_path, **transcribe_kwargs)

    segments: list[dict[str, Any]] = [
        {
            "start": seg["start"],
            "end": seg["end"],
            "text": seg["text"].strip(),
        }
        for seg in result.get("segments", [])
    ]

    duration: float = 0.0
    if segments:
        duration = float(segments[-1]["end"])

    return {
        "text": result.get("text", "").strip(),
        "segments": segments,
        "language": result.get("language", ""),
        "duration": duration,
    }


async def transcribe_audio(
    audio_path: str,
    model_name: str = "base",
    language: Optional[str] = None,
) -> dict[str, Any]:
    """Async wrapper around :func:`_transcribe_sync`.

    Runs blocking Whisper inference in a thread-pool executor.

    Args:
        audio_path: Path to the audio file to transcribe.
        model_name: Whisper model size (default ``"base"``).
        language: Language code or ``None``/``"auto"`` for auto-detection.

    Returns:
        Dict with ``text``, ``segments``, ``language``, and ``duration``.
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, _transcribe_sync, audio_path, model_name, language
    )
