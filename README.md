# ReelScript

Transcreva Reels do Instagram (ou qualquer vídeo) em texto usando Whisper — 100% local e gratuito.

![Python](https://img.shields.io/badge/Python-3.10+-blue) ![React](https://img.shields.io/badge/React-18-61dafb) ![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

## Como funciona

1. Cole o link de um Reels do Instagram ou faça upload do vídeo
2. Escolha o modelo Whisper e o idioma
3. Receba a transcrição com timestamps, pronta para copiar ou baixar (.txt / .srt)

## Stack

| Backend | Frontend |
|---------|----------|
| Python 3.10+ / FastAPI | React 18 / Vite |
| yt-dlp (download de vídeos) | Tailwind CSS |
| FFmpeg (extração de áudio) | Lucide React (ícones) |
| OpenAI Whisper (transcrição local) | WebSocket (progresso real-time) |

## Pré-requisitos

- **Python 3.10+**
- **Node.js 18+**
- **FFmpeg** instalado e no PATH:
  ```bash
  # macOS
  brew install ffmpeg

  # Ubuntu/Debian
  sudo apt install ffmpeg

  # Windows — baixar de https://ffmpeg.org/download.html e adicionar ao PATH
  ```

## Instalação e Uso

```bash
# 1. Clone o repositório
git clone https://github.com/TheAs35/ReelScript.git
cd ReelScript

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 3. Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

Acesse **http://localhost:5173**

## API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/api/transcribe/link` | Transcrever via URL do Instagram |
| `POST` | `/api/transcribe/upload` | Transcrever via upload de vídeo |
| `GET` | `/api/download/txt/{job_id}` | Baixar transcrição em .txt |
| `GET` | `/api/download/srt/{job_id}` | Baixar transcrição em .srt |
| `WS` | `/ws/{job_id}` | Progresso em tempo real |

## Modelos Whisper

| Modelo | Velocidade | Precisão | VRAM |
|--------|-----------|----------|------|
| `tiny` | Muito rápido | Baixa | ~1 GB |
| `base` | Rápido | Boa | ~1 GB |
| `small` | Moderado | Muito boa | ~2 GB |
| `medium` | Lento | Excelente | ~5 GB |

## Nota sobre cookies do Instagram

Se o download de Reels falhar, o yt-dlp pode precisar de cookies do seu navegador:

```bash
# Exportar cookies automaticamente do Chrome
yt-dlp --cookies-from-browser chrome "URL_DO_REEL"
```

## Estrutura do Projeto

```
ReelScript/
├── backend/
│   ├── main.py              # FastAPI app, rotas, WebSocket
│   ├── requirements.txt
│   └── services/
│       ├── downloader.py    # Download via yt-dlp
│       ├── transcriber.py   # Transcrição com Whisper
│       └── utils.py         # Helpers e geração SRT
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── components/      # UI components
        └── hooks/           # WebSocket hook
```

## License

MIT
