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
│   ├── main.py           # App + 11 endpoints (4 auth + 7 notes)
│   ├── models.py         # SQLAlchemy: User, Note, RefreshToken
│   ├── schemas.py        # Pydantic: Note CRUD + auth schemas
│   ├── auth.py           # JWT create/verify, bcrypt, refresh tokens, get_current_user
│   ├── database.py       # SQLite engine/SessionLocal/Base/get_db
│   └── requirements.txt
└── note-keeper-ui/       # React frontend
    └── src/
        ├── App.tsx       # AuthProvider wrapper, conditional auth/notes view
        ├── api.ts        # apiFetch wrapper (auto-refresh on 401), all API calls
        ├── types.ts      # TS interfaces
        ├── context/
        │   └── AuthContext.tsx  # Auth state, login/register/logout, proactive refresh
        └── components/
            ├── AuthPage.tsx     # Login/register form with toggle
            ├── NoteCard.tsx     # Card with pin/color/delete
            ├── CreateNote.tsx   # Inline create form
            └── EditModal.tsx    # Modal for editing
```

## API Endpoints (FastAPI, port 8004)
| Method | Path | What | Schema |
|--------|------|------|--------|
| GET | `/` | Health check | — |
| POST | `/register` | Register | UserCreate (email, password) |
| POST | `/login` | Login | LoginRequest → Token (access_token + refresh_token) |
| POST | `/refresh` | Refresh tokens | RefreshRequest → new Token pair |
| POST | `/logout` | Logout (revoke all tokens) | — (requires auth) |
| POST | `/notes` | Create | NoteCreate (title required) |
| GET | `/notes` | List all | ?search=&pinned= |
| GET | `/notes/{id}` | Get one | — |
| PUT | `/notes/{id}` | Full replace | NoteCreate |
| PATCH | `/notes/{id}` | Partial update | NoteUpdate |
| PATCH | `/notes/{id}/pin` | Toggle pin | — |
| DELETE | `/notes/{id}` | Delete | — |

All note endpoints require `Authorization: Bearer <access_token>`. Queries are scoped to the authenticated user.

Swagger UI at `http://localhost:8004/docs`

## Note Model
- id (int, PK), title (str, required), content (text, nullable), color (str, default #ffffff)
- is_pinned (bool), is_archived (bool)
- created_at, updated_at (datetime, UTC)
- user_id (int, FK → users.id)

## Auth Models
- **User:** id, email (unique), hashed_password (bcrypt), token_version (int, for invalidation)
- **RefreshToken:** id, token_hash (SHA-256 of raw token), user_id (FK), expires_at, is_used (for rotation)

## Key Decisions
- **PUT vs PATCH:** PUT = full replace (sends all fields), PATCH = merge (only sent fields)
- **Close button:** Dismisses form without saving (user expectation)
- **CORS:** API allows `localhost:5173` + `127.0.0.1:5173`
- **Python speed:** I/O-bound APIs are not bottlenecked by Python; FastAPI's auto-docs from type hints is its killer feature vs Express
- **Auth:** JWT access tokens (30min) + refresh tokens (7 days) with rotation. Logout increments `token_version` to invalidate all existing tokens server-side. Reusing a used refresh token revokes all tokens for that user (security measure).

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
- `python-jose` requires `sub` JWT claim to be a string (not int) — cast with `str(user.id)`
- `passlib` 1.7.4 is incompatible with `bcrypt>=5.0` — pin to `bcrypt<4.1`
- SQLite stores naive datetimes — use `.replace(tzinfo=None)` before comparing DB values with `datetime.now(timezone.utc)`

## Next Steps / Possible Extensions
- Tag/label system for notes
- Docker compose
- Deploy
