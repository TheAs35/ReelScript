# CLAUDE.md — ReelScript: Transcritor de Reels do Instagram

## Visão Geral

Webapp local simples: o usuário cola o link de um Reels do Instagram (ou faz upload do vídeo), e o sistema transcreve o áudio usando Whisper rodando localmente. Exibe a transcrição na tela com opção de copiar/baixar.

**100% gratuito. Zero API paga. Tudo roda local.**

---

## Stack

### Backend
- **Python 3.10+** com **FastAPI**
- **yt-dlp** (download de Reels do Instagram — gratuito, open-source, substituto do youtube-dl)
- **FFmpeg** (extração de áudio)
- **openai-whisper** (transcrição local — NÃO é API paga, roda o modelo na máquina)
- **WebSockets** (progresso em tempo real)

### Frontend
- **React 18** com **Vite**
- **Tailwind CSS**
- **Lucide React** (ícones)

---

## Estrutura de Pastas

```
reel-transcriber/
├── CLAUDE.md
├── backend/
│   ├── main.py                 # FastAPI app, rotas, WebSocket
│   ├── requirements.txt
│   ├── services/
│   │   ├── __init__.py
│   │   ├── downloader.py       # Download do Reels via yt-dlp
│   │   ├── transcriber.py      # Transcrição com Whisper
│   │   └── utils.py            # Helpers (limpeza de arquivos, etc)
│   ├── uploads/                # Vídeos enviados por upload
│   ├── temp/                   # Arquivos temporários (vídeos baixados, áudio extraído)
│   └── .env                    # Configurações opcionais
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       ├── components/
│       │   ├── LinkInput.jsx        # Campo para colar link do Reels
│       │   ├── VideoUploader.jsx    # Drag & drop para upload direto
│       │   ├── ModelSelector.jsx    # Escolha do modelo Whisper
│       │   ├── ProgressStatus.jsx   # Status de download + transcrição
│       │   ├── TranscriptResult.jsx # Exibição da transcrição final
│       │   └── LanguageSelector.jsx # Seletor de idioma (pt, en, es, etc)
│       └── hooks/
│           └── useWebSocket.js
```

---

## Funcionalidades

### 1. Input do Vídeo (duas opções)

**Opção A — Colar link do Reels:**
- Campo de texto onde o usuário cola a URL do Instagram Reels
- Aceitar formatos: `https://www.instagram.com/reel/XXXXX/`, `https://www.instagram.com/p/XXXXX/`, `https://www.instagram.com/reels/XXXXX/`
- Validar se é uma URL do Instagram antes de prosseguir
- Backend usa **yt-dlp** para baixar o vídeo:
  ```python
  import yt_dlp
  ydl_opts = {
      'format': 'best',
      'outtmpl': f'temp/{job_id}.%(ext)s',
      'quiet': True,
  }
  with yt_dlp.YoutubeDL(ydl_opts) as ydl:
      ydl.download([url])
  ```

**Opção B — Upload direto:**
- Área de drag & drop para o usuário subir o vídeo manualmente
- Aceitar: .mp4, .mov, .avi, .mkv, .webm
- Limite: 500MB
- Útil para quando o link não funcionar ou o usuário já tiver o vídeo salvo

### 2. Configurações (simples)

- **Modelo Whisper**: tiny / base / small / medium (default: base)
  - Mostrar indicação: tiny = rápido mas menos preciso, medium = lento mas muito preciso
- **Idioma**: auto-detectar (default) ou forçar idioma específico (pt, en, es, fr, etc)
  - Se "auto", Whisper detecta sozinho
  - Se especificado, passa `language="pt"` no transcribe()

### 3. Processamento

O pipeline tem 3 passos simples:

**Passo 1 — Download/Recebimento do vídeo**
- Se link: baixar com yt-dlp
- Se upload: salvar arquivo recebido
- Enviar progresso: "Baixando vídeo..."

**Passo 2 — Extração do áudio**
- Usar FFmpeg para extrair áudio em WAV 16kHz mono (formato ideal para Whisper):
  ```
  ffmpeg -i video.mp4 -ar 16000 -ac 1 -f wav audio.wav
  ```
- Enviar progresso: "Extraindo áudio..."

**Passo 3 — Transcrição com Whisper**
- Carregar modelo escolhido: `whisper.load_model(model_name)`
- Transcrever: `model.transcribe(audio_path, language=language, word_timestamps=True)`
- Retornar:
  - Texto completo da transcrição
  - Segmentos com timestamps (início, fim, texto)
  - Idioma detectado
- Enviar progresso: "Transcrevendo... X%"

**Passo 4 — Limpeza**
- Deletar vídeo e áudio temporários após transcrição
- Manter apenas o resultado em memória

### 4. Exibição do Resultado

A tela de resultado deve mostrar:

- **Texto completo** da transcrição em um bloco grande e legível
- **Segmentos com timestamps** em formato clicável:
  ```
  [00:00] Fala pessoal, hoje eu vou mostrar...
  [00:05] Como vocês podem automatizar...
  [00:12] A edição dos vídeos de vocês...
  ```
- **Idioma detectado** (ex: "Português detectado")
- **Botão "Copiar Texto"** — copia o texto completo para o clipboard
- **Botão "Baixar .txt"** — download do arquivo de texto
- **Botão "Baixar .srt"** — download como legenda SRT com timestamps
- **Botão "Nova Transcrição"** — volta para a tela inicial

---

## Interface do Usuário

### Design
- Visual **limpo, escuro e moderno** — foco total na funcionalidade
- Paleta: fundo escuro (#09090B), cards em (#18181B), borda sutil (#27272A), acento principal em verde (#22C55E), texto (#FAFAFA)
- Layout centralizado, largura máxima 720px — é uma ferramenta single-purpose
- Uma única página com estados (input → processando → resultado), sem roteamento
- Transições suaves entre estados
- Mobile-friendly (criadores de conteúdo usam celular)

### Layout da Página

**Estado 1 — Input (tela inicial)**
```
┌─────────────────────────────────────┐
│          🎬 ReelScript              │
│    Transcreva Reels em segundos     │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Cole o link do Reels aqui...  │  │
│  └───────────────────────────────┘  │
│          [Transcrever →]            │
│                                     │
│         ─── ou ───                  │
│                                     │
│  ┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐  │
│  │   Arraste o vídeo aqui       │  │
│  │   ou clique para selecionar  │  │
│  └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘  │
│                                     │
│  Modelo: [base ▼]  Idioma: [auto ▼]│
└─────────────────────────────────────┘
```

**Estado 2 — Processando**
```
┌─────────────────────────────────────┐
│          🎬 ReelScript              │
│                                     │
│     ◉ Baixando vídeo... ✓          │
│     ◉ Extraindo áudio... ✓         │
│     ◉ Transcrevendo... 67%          │
│     ○ Pronto                        │
│                                     │
│     [████████░░░░░] 67%             │
│                                     │
└─────────────────────────────────────┘
```

**Estado 3 — Resultado**
```
┌─────────────────────────────────────┐
│          🎬 ReelScript              │
│                                     │
│  Idioma: Português  Duração: 0:32   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ Fala pessoal, hoje eu vou     │  │
│  │ mostrar como vocês podem      │  │
│  │ automatizar a edição dos      │  │
│  │ vídeos de vocês usando...     │  │
│  └───────────────────────────────┘  │
│                                     │
│  [📋 Copiar] [📄 .txt] [🎬 .srt]  │
│                                     │
│  ▼ Ver com timestamps               │
│  [00:00] Fala pessoal, hoje eu...  │
│  [00:05] Como vocês podem...        │
│                                     │
│  [← Nova Transcrição]              │
└─────────────────────────────────────┘
```

---

## API (Backend)

```
POST /api/transcribe/link     → Body: { "url": "...", "model": "base", "language": "auto" }
POST /api/transcribe/upload   → Multipart: file + model + language
GET  /api/download/txt/{id}   → Download da transcrição em .txt
GET  /api/download/srt/{id}   → Download da transcrição em .srt
WS   /ws/{job_id}             → Progresso em tempo real
```

### WebSocket Messages
```json
{ "step": 1, "step_name": "Baixando vídeo", "status": "processing" }
{ "step": 1, "step_name": "Baixando vídeo", "status": "done" }
{ "step": 2, "step_name": "Extraindo áudio", "status": "processing" }
{ "step": 2, "step_name": "Extraindo áudio", "status": "done" }
{ "step": 3, "step_name": "Transcrevendo", "status": "processing", "progress": 67 }
{ "step": 3, "step_name": "Transcrevendo", "status": "done" }
{ "type": "complete", "transcript": "...", "segments": [...], "language": "pt", "duration": 32.5 }
{ "type": "error", "message": "URL inválida ou vídeo privado" }
```

---

## Geração do arquivo SRT

Converter os segmentos do Whisper para formato SRT:
```
1
00:00:00,000 --> 00:00:03,500
Fala pessoal, hoje eu vou mostrar

2
00:00:03,500 --> 00:00:07,200
como vocês podem automatizar
```

Cada segmento do Whisper tem `start` e `end` em segundos — converter para formato `HH:MM:SS,mmm`.

---

## Regras

1. **Zero API paga** — Whisper roda local. yt-dlp é open-source e gratuito.
2. **Limpeza** — Deletar vídeos e áudios temporários imediatamente após transcrição. Não acumular arquivos.
3. **Erro claro** — Se o link for inválido, vídeo for privado, ou download falhar, mostrar mensagem clara ao usuário.
4. **Um job por vez** — Processamento simples, sem fila. Um vídeo de cada vez.
5. **yt-dlp atualizado** — yt-dlp precisa estar na última versão para funcionar com Instagram. Instalar via pip: `pip install -U yt-dlp`.
6. **Cookies do Instagram** — yt-dlp pode precisar de cookies para baixar Reels. Documentar no README como exportar cookies do navegador se necessário. Usar a flag `--cookies-from-browser chrome` ou um arquivo cookies.txt.
7. **CORS** — Configurar CORS no FastAPI para aceitar requests do frontend (localhost:5173).

---

## requirements.txt
```
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
python-multipart>=0.0.6
websockets>=12.0
openai-whisper>=20231117
yt-dlp>=2024.01.01
aiofiles>=23.2.0
```

## Pré-requisitos do sistema
```bash
# FFmpeg (obrigatório)
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt install ffmpeg

# Windows
# Baixar de https://ffmpeg.org/download.html
```

## Como rodar
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

Acesse `http://localhost:5173`
