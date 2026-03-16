"""ReelScript — FastAPI backend for Instagram Reels transcription."""

from __future__ import annotations

import asyncio
import os
import uuid
from pathlib import Path
from typing import Any, Optional

from fastapi import (
    BackgroundTasks,
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

from services.downloader import download_video
from services.transcriber import extract_audio, transcribe_audio
from services.utils import clean_temp_files, generate_srt, is_valid_instagram_url

# ---------------------------------------------------------------------------
# Directories & constants
# ---------------------------------------------------------------------------

BASE_DIR = Path(__file__).parent
TEMP_DIR = BASE_DIR / "temp"
UPLOADS_DIR = BASE_DIR / "uploads"

TEMP_DIR.mkdir(exist_ok=True)
UPLOADS_DIR.mkdir(exist_ok=True)

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_SIZE_MB", "500")) * 1024 * 1024
DEFAULT_MODEL = os.getenv("WHISPER_DEFAULT_MODEL", "base")

# ---------------------------------------------------------------------------
# In-memory job storage
# ---------------------------------------------------------------------------

# job_id -> transcription result dict (populated when job completes)
job_results: dict[str, dict[str, Any]] = {}

# job_id -> asyncio.Queue for sending WebSocket messages
job_queues: dict[str, asyncio.Queue] = {}

# ---------------------------------------------------------------------------
# App & CORS
# ---------------------------------------------------------------------------

app = FastAPI(title="ReelScript API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class TranscribeLinkRequest(BaseModel):
    url: str
    model: str = DEFAULT_MODEL
    language: str = "auto"


class JobResponse(BaseModel):
    job_id: str


# ---------------------------------------------------------------------------
# WebSocket helpers
# ---------------------------------------------------------------------------


async def _send(job_id: str, message: dict[str, Any]) -> None:
    """Push a message onto the job's queue (no-op if queue does not exist)."""
    queue = job_queues.get(job_id)
    if queue:
        await queue.put(message)


async def _send_step(
    job_id: str,
    step: int,
    step_name: str,
    status: str,
    progress: Optional[int] = None,
) -> None:
    msg: dict[str, Any] = {
        "step": step,
        "step_name": step_name,
        "status": status,
    }
    if progress is not None:
        msg["progress"] = progress
    await _send(job_id, msg)


# ---------------------------------------------------------------------------
# Core processing pipeline
# ---------------------------------------------------------------------------


async def _process_job(
    job_id: str,
    video_path: str,
    model_name: str,
    language: str,
) -> None:
    """Run extract-audio → transcribe pipeline and store result.

    Args:
        job_id: Unique job identifier.
        video_path: Absolute path to the video file to process.
        model_name: Whisper model size string.
        language: Language code or ``"auto"`` for auto-detection.
    """
    audio_path = str(TEMP_DIR / f"{job_id}.wav")

    try:
        # Step 2 — extract audio
        await _send_step(job_id, 2, "Extraindo áudio", "processing")
        await extract_audio(video_path, audio_path)
        await _send_step(job_id, 2, "Extraindo áudio", "done")

        # Step 3 — transcribe
        await _send_step(job_id, 3, "Transcrevendo", "processing", progress=0)
        result = await transcribe_audio(audio_path, model_name, language)
        await _send_step(job_id, 3, "Transcrevendo", "done", progress=100)

        # Store result for download endpoints
        job_results[job_id] = result

        # Notify WebSocket client
        await _send(
            job_id,
            {
                "type": "complete",
                "transcript": result["text"],
                "segments": result["segments"],
                "language": result["language"],
                "duration": result["duration"],
            },
        )
    except Exception as exc:  # noqa: BLE001
        await _send(
            job_id,
            {"type": "error", "message": str(exc)},
        )
    finally:
        # Clean up temp video and audio; keep result in memory
        clean_temp_files(video_path, audio_path)
        # Signal queue end so the WebSocket sender can close gracefully
        await _send(job_id, None)


async def _process_link_job(
    job_id: str,
    url: str,
    model_name: str,
    language: str,
) -> None:
    """Download a video from *url* then run the transcription pipeline.

    Args:
        job_id: Unique job identifier.
        url: Instagram (or compatible) video URL.
        model_name: Whisper model size string.
        language: Language code or ``"auto"``.
    """
    try:
        # Step 1 — download
        await _send_step(job_id, 1, "Baixando vídeo", "processing")
        video_path = await download_video(url, job_id, TEMP_DIR)
        await _send_step(job_id, 1, "Baixando vídeo", "done")
    except ValueError as exc:
        await _send(job_id, {"type": "error", "message": str(exc)})
        await _send(job_id, None)
        return

    await _process_job(job_id, video_path, model_name, language)


async def _process_upload_job(
    job_id: str,
    video_path: str,
    model_name: str,
    language: str,
) -> None:
    """Run the transcription pipeline for an already-saved upload.

    Args:
        job_id: Unique job identifier.
        video_path: Absolute path to the uploaded video file.
        model_name: Whisper model size string.
        language: Language code or ``"auto"``.
    """
    # Step 1 is "receiving file" — already done before this coroutine runs
    await _send_step(job_id, 1, "Recebendo arquivo", "done")
    await _process_job(job_id, video_path, model_name, language)


# ---------------------------------------------------------------------------
# REST endpoints
# ---------------------------------------------------------------------------


@app.post("/api/transcribe/link", response_model=JobResponse)
async def transcribe_link(
    body: TranscribeLinkRequest,
    background_tasks: BackgroundTasks,
) -> JobResponse:
    """Accept an Instagram Reel URL and start background transcription.

    Args:
        body: Request body containing ``url``, ``model``, and ``language``.
        background_tasks: FastAPI background task runner.

    Returns:
        A :class:`JobResponse` with the generated ``job_id``.

    Raises:
        HTTPException: 400 when the URL does not match Instagram patterns.
    """
    if not is_valid_instagram_url(body.url):
        raise HTTPException(
            status_code=400,
            detail="URL inválida. Use um link do Instagram Reels válido.",
        )

    job_id = str(uuid.uuid4())
    job_queues[job_id] = asyncio.Queue()

    background_tasks.add_task(
        _process_link_job,
        job_id,
        body.url,
        body.model or DEFAULT_MODEL,
        body.language or "auto",
    )
    return JobResponse(job_id=job_id)


@app.post("/api/transcribe/upload", response_model=JobResponse)
async def transcribe_upload(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    model: str = Form(DEFAULT_MODEL),
    language: str = Form("auto"),
) -> JobResponse:
    """Accept a video file upload and start background transcription.

    Args:
        background_tasks: FastAPI background task runner.
        file: Uploaded video file (mp4, mov, avi, mkv, webm).
        model: Whisper model size (default from env).
        language: Language code or ``"auto"``.

    Returns:
        A :class:`JobResponse` with the generated ``job_id``.

    Raises:
        HTTPException: 400 for unsupported file types or oversized files.
    """
    original_name = file.filename or "upload"
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Formato de arquivo não suportado: '{ext}'. "
                f"Use: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    job_id = str(uuid.uuid4())
    dest_path = UPLOADS_DIR / f"{job_id}{ext}"

    # Stream file to disk and check size
    written = 0
    chunk_size = 1024 * 1024  # 1 MB
    with dest_path.open("wb") as fp:
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            written += len(chunk)
            if written > MAX_UPLOAD_BYTES:
                fp.close()
                dest_path.unlink(missing_ok=True)
                raise HTTPException(
                    status_code=400,
                    detail=(
                        f"Arquivo muito grande. Tamanho máximo: "
                        f"{MAX_UPLOAD_BYTES // (1024 * 1024)} MB."
                    ),
                )
            fp.write(chunk)

    job_queues[job_id] = asyncio.Queue()

    background_tasks.add_task(
        _process_upload_job,
        job_id,
        str(dest_path),
        model or DEFAULT_MODEL,
        language or "auto",
    )
    return JobResponse(job_id=job_id)


# ---------------------------------------------------------------------------
# Download endpoints
# ---------------------------------------------------------------------------


@app.get("/api/download/txt/{job_id}")
async def download_txt(job_id: str) -> Response:
    """Download transcription as plain text.

    Args:
        job_id: The job identifier returned by the transcribe endpoints.

    Returns:
        Plain-text file response.

    Raises:
        HTTPException: 404 when the job result is not found.
    """
    result = job_results.get(job_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail="Transcrição não encontrada. O job pode não ter terminado ainda.",
        )
    content = result["text"]
    return Response(
        content=content.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="transcricao_{job_id[:8]}.txt"'
        },
    )


@app.get("/api/download/srt/{job_id}")
async def download_srt(job_id: str) -> Response:
    """Download transcription as an SRT subtitle file.

    Args:
        job_id: The job identifier returned by the transcribe endpoints.

    Returns:
        SRT file response.

    Raises:
        HTTPException: 404 when the job result is not found.
    """
    result = job_results.get(job_id)
    if not result:
        raise HTTPException(
            status_code=404,
            detail="Transcrição não encontrada. O job pode não ter terminado ainda.",
        )
    srt_content = generate_srt(result["segments"])
    return Response(
        content=srt_content.encode("utf-8"),
        media_type="text/plain; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="transcricao_{job_id[:8]}.srt"'
        },
    )


# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------


@app.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str) -> None:
    """Stream real-time progress updates for a transcription job.

    The client connects before or immediately after issuing the transcribe
    request.  Messages are JSON objects; a ``None`` sentinel on the internal
    queue signals that processing has finished and the socket should close.

    Args:
        websocket: The WebSocket connection instance.
        job_id: The job identifier to subscribe to.
    """
    await websocket.accept()

    # Create queue if the background task hasn't created it yet (race window)
    if job_id not in job_queues:
        job_queues[job_id] = asyncio.Queue()

    queue = job_queues[job_id]

    try:
        while True:
            message = await queue.get()
            if message is None:
                # Sentinel: processing finished
                break
            await websocket.send_json(message)
    except WebSocketDisconnect:
        pass
    finally:
        # Clean up queue entry
        job_queues.pop(job_id, None)
        try:
            await websocket.close()
        except Exception:  # noqa: BLE001
            pass
