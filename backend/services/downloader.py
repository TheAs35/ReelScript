"""Instagram Reel downloader using yt-dlp."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Optional

import yt_dlp


def _download_sync(url: str, job_id: str, temp_dir: Path) -> str:
    """Blocking download of a video via yt-dlp.

    Args:
        url: The Instagram (or any yt-dlp-compatible) video URL.
        job_id: Unique identifier used as the output filename stem.
        temp_dir: Directory where the downloaded file will be saved.

    Returns:
        Absolute path to the downloaded video file.

    Raises:
        ValueError: When the URL is invalid, the video is private, or
            yt-dlp reports any download error.
    """
    output_template = str(temp_dir / f"{job_id}.%(ext)s")

    ydl_opts: dict = {
        "format": "best",
        "outtmpl": output_template,
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            # yt-dlp resolves the actual extension used
            ext = info.get("ext", "mp4")
            downloaded_path = temp_dir / f"{job_id}.{ext}"
            if not downloaded_path.exists():
                # Fallback: search for any file matching the job_id stem
                matches = list(temp_dir.glob(f"{job_id}.*"))
                if not matches:
                    raise ValueError(
                        "Download concluído, mas o arquivo não foi encontrado."
                    )
                downloaded_path = matches[0]
            return str(downloaded_path)
    except yt_dlp.utils.DownloadError as exc:
        message = str(exc)
        if "Private" in message or "private" in message:
            raise ValueError("O vídeo é privado e não pode ser baixado.") from exc
        if "not found" in message.lower() or "404" in message:
            raise ValueError("Vídeo não encontrado. Verifique o link.") from exc
        raise ValueError(f"Erro ao baixar o vídeo: {message}") from exc
    except yt_dlp.utils.ExtractorError as exc:
        raise ValueError(
            "URL inválida ou formato não suportado pelo yt-dlp."
        ) from exc


async def download_video(url: str, job_id: str, temp_dir: str | Path) -> str:
    """Async wrapper that downloads a video to *temp_dir/{job_id}.<ext>*.

    Runs the blocking yt-dlp call in a thread-pool executor so the event
    loop remains responsive.

    Args:
        url: The video URL to download.
        job_id: Unique job identifier used as the filename stem.
        temp_dir: Directory for downloaded files.

    Returns:
        Absolute path string to the downloaded video file.

    Raises:
        ValueError: Propagated from :func:`_download_sync` with a
            user-friendly Portuguese error message.
    """
    temp_path = Path(temp_dir)
    temp_path.mkdir(parents=True, exist_ok=True)

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None, _download_sync, url, job_id, temp_path
    )
