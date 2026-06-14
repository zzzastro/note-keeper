# Note Keeper — Project Context

## Stack
- **Backend:** Python + FastAPI + SQLAlchemy + SQLite
- **Frontend:** React + Vite + TypeScript + Tailwind CSS v4
- **Runtime:** Bun (UI), uv + uvicorn (API)
- **GitHub:** https://github.com/zzzastro/note-keeper

## Project Structure
```
~/note-keeper/
├── start.sh              # Starts both API + UI
├── .gitignore
├── note-keeper-api/      # FastAPI backend
│   ├── main.py           # App + 7 endpoints
│   ├── models.py         # SQLAlchemy Note model
│   ├── schemas.py        # Pydantic: NoteCreate, NoteUpdate, NoteResponse
│   ├── database.py       # SQLite engine/SessionLocal/Base
│   └── requirements.txt
└── note-keeper-ui/       # React frontend
    └── src/
        ├── App.tsx       # Layout, search, pin filter
        ├── api.ts        # All fetch calls to localhost:8004
        ├── types.ts      # TS interfaces
        └── components/
            ├── NoteCard.tsx    # Card with pin/color/delete
            ├── CreateNote.tsx  # Inline create form
            └── EditModal.tsx   # Modal for editing
```

## API Endpoints (FastAPI, port 8004)
| Method | Path | What | Schema |
|--------|------|------|--------|
| GET | `/` | Health check | — |
| POST | `/notes` | Create | NoteCreate (title required) |
| GET | `/notes` | List all | ?search=&pinned= |
| GET | `/notes/{id}` | Get one | — |
| PUT | `/notes/{id}` | Full replace | NoteCreate |
| PATCH | `/notes/{id}` | Partial update | NoteUpdate |
| PATCH | `/notes/{id}/pin` | Toggle pin | — |
| DELETE | `/notes/{id}` | Delete | — |

Swagger UI at `http://localhost:8004/docs`

## Note Model
- id (int, PK), title (str, required), content (text, nullable), color (str, default #ffffff)
- is_pinned (bool), is_archived (bool)
- created_at, updated_at (datetime, UTC)

## Key Decisions
- **PUT vs PATCH:** PUT = full replace (sends all fields), PATCH = merge (only sent fields)
- **Close button:** Dismisses form without saving (user expectation)
- **CORS:** API allows `localhost:5173` + `127.0.0.1:5173`
- **Python speed:** I/O-bound APIs are not bottlenecked by Python; FastAPI's auto-docs from type hints is its killer feature vs Express

## How to Run
```bash
cd ~/note-keeper
./start.sh

# Or separately:
# API:
cd ~/note-keeper/note-keeper-api && uv run uvicorn main:app --host 0.0.0.0 --port 8004
# UI:
cd ~/note-keeper/note-keeper-ui && bun run dev
```

## WSL Filesystem Notes
- ~ = Linux ext4 (real Linux, use this for dev)
- /mnt/c/ = Windows NTFS mounted (native bindings may fail, slow)
- Keep projects in ~/ inside WSL

## Learned Fixes
- Moving folder → recreate venv (shebang paths break)
- Use `uv run python -m uvicorn` if `uv run uvicorn` fails
- No pip → use `uv` (already installed)
- Node.js native bindings fail on /mnt/c/ → reinstall node_modules from within WSL
- `cursor-pointer` on all buttons for UX

## Next Steps / Possible Extensions
- Tag/label system for notes
- User auth (JWT)
- Docker compose
- Deploy
