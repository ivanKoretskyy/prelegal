# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation supports all 11 document types from catalog.json. Users describe what they need via a freeform AI chat, which identifies the document type (or explains it can't help and suggests the closest supported one), then gathers that document's fields conversationally — with a generic manual form kept as a fallback for direct edits. This runs on the Dockerized FastAPI + SQLite foundation with JWT-based user authentication, and signed-in users can save documents to their account, view/load/delete them from a My Documents modal, and start over with New Document. See Implementation Status below for what's built vs. planned.

## Development process

When instructed to build a feature:
1. Use your Atlassian tools to read the feature instructions from Jira
2. Develop the feature - do not skip any step from the feature-dev 7 step process
3. Thoroughly test the feature with unit tests and integration tests and fix any issues
4. Submit a PR using your github tools

## AI design

When writing code to make calls to LLMs, use your Cerebras skill to use LiteLLM via OpenRouter to the `openrouter/openai/gpt-oss-120b` model with Cerebras as the inference provider. You should use Structured Outputs so that you can interpret the results and populate fields in the legal document.

There is an OPENROUTER_API_KEY in the .env file in the project root.

## Technical design

The entire project should be packaged into a Docker container.  
The backend should be in backend/ and be a uv project, using FastAPI.  
The frontend should be in frontend/  
The database uses SQLite. It was originally recreated from scratch on every container start; as of PL-7, it persists across restarts on a mounted Docker volume (`scripts/start-*` create/mount `prelegal-data:/app/data`), since saved documents and accounts need to survive restarts to be meaningful. Users table supports sign up and sign in.  
Consider statically building the frontend and serving it via FastAPI, if that will work.  
There should be scripts in scripts/ for:  
```bash
# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
```
Backend available at http://localhost:8000

## Color Scheme
- Accent Yellow: `#ecad0a`
- Blue Primary: `#209dd7`
- Purple Secondary: `#753991` (submit buttons)
- Dark Navy: `#032147` (headings)
- Gray Text: `#888888`

## Implementation Status

*Note: this section previously marked PL-4 through PL-7 as all "Completed," but only PL-4's scope actually existed in the codebase. It's been corrected below to reflect what's really built (verified with a real `docker build`/`docker run` via `scripts/start-mac.sh`) vs. what's still planned.*

### Completed (PL-4) — issue #8, PR #11 (merged), branch `feature/v1-foundation`
- Docker multi-stage build: Node stage builds the Next.js static export, Python/uv stage runs FastAPI and serves it — a single container on port 8000
- `backend/`: uv-managed FastAPI + SQLModel project; SQLite DB file was deleted and recreated from scratch on every container start (changed in PL-7 — the DB now persists on a mounted volume)
- Auth routes: `POST /api/auth/signup`, `POST /api/auth/signin`, `POST /api/auth/signout`, `GET /api/auth/me` — passwords are bcrypt-hashed; the session is a signed (`itsdangerous`) HttpOnly cookie, **not JWT yet** (intentionally minimal placeholder — see PL-7)
- Minimal sign up/sign in bar in the frontend (`AuthBar.tsx`), styled to match the existing NDA workspace, wired to the auth endpoints above
- Start/stop scripts for Mac, Linux, Windows (`scripts/`)
- Mutual NDA form with live preview and PDF download — unchanged from the original prototype, just now served through the new foundation
- Backend test suite (pytest) covering signup/duplicate signup/signin/wrong password/me/signout

### Completed (PL-5) — issue #9
- AI chat interface for NDA creation. The original manual form was kept as a fallback for direct edits rather than removed (a deliberate scope decision, not a gap) — it's tucked behind an "Edit fields manually" disclosure below the chat
- `POST /api/chat/message` uses LiteLLM via OpenRouter with Cerebras inference (gpt-oss-120b model), per the Cerebras skill, with structured outputs (`response_format=ChatReply`) for reliable field extraction from conversation
- The backend is stateless: the frontend sends the full message history plus the current field snapshot on every turn; the system prompt tracks known vs. missing fields and instructs the model to always return the full field snapshot
- Live preview updates as the AI extracts fields from chat; `GET /api/chat/greeting` provides the opening message; the AI asks questions conversationally and confirms when the document is complete
- Known limitation: a field can be corrected via chat but not cleared back to blank (the model has no way to signal "unset this") — clearing a field currently requires the manual form fallback

### Completed (PL-6) — issue #10
- All 11 document types from catalog.json are supported, driven entirely by parsing `templates/*.md` rather than hand-authored per-document code — the templates mark fill-in blanks with `<span class="{coverpage|keyterms|orderform|sow|businessterms}_link">Label</span>`, which both backend and frontend parse directly (`backend/src/backend/templates.py`, `frontend/src/lib/document-template.ts`)
- Chat is now two-phase: while no document type is set, `POST /api/chat/message` runs a classification prompt against the catalog; once confirmed, it switches to field-gathering using a Pydantic model built dynamically per document (`create_model` with `Field(alias=label)`, so the JSON schema — and thus the LLM's structured output — uses the real field labels as keys)
- If the user asks for something outside the 11 supported types, the AI explains it can't generate that and suggests the closest one, without committing until the user confirms
- `GET /api/documents/{filename}` (moved to `GET /api/templates/{filename}` in PL-7) serves a document's `{name, fields, content}` for the frontend to render; `DocumentPreview`/`IntakeForm`/`DocumentWorkspace` are now fully generic (the old NDA-only `NdaWorkspace`/`standard-terms.ts` are gone)
- Frontend gained its first test infrastructure (vitest) specifically for the new markup parser, including a regression test that runs it against all 11 real template files

### Completed (PL-7) — issue #14
- Session auth upgraded from the signed (itsdangerous) cookie to JWT (PyJWT) in an HttpOnly cookie, signed with `SESSION_SECRET_KEY`. That key and the SQLite DB now both persist across container restarts (see Technical design above); `scripts/start-*` auto-generate and persist `SESSION_SECRET_KEY` into `.env` on first run if it's missing
- `Document` table (per-user, no sharing) storing a saved document's type + field values (not chat history — reopening a saved document restores its fields but starts a fresh chat); full CRUD under `/api/documents`, ownership-checked (cross-user access returns 404, not 403)
- The old unauthenticated template-lookup route moved from `GET /api/documents/{filename}` to `GET /api/templates/{filename}` to free up `/api/documents` for the new persistence resource (`backend/src/backend/routers/templates.py` / `routers/documents.py`)
- Frontend gained its first shared React Context (`frontend/src/context/AuthContext.tsx`) — `AuthBar` now reads/writes auth state through `useAuth()` instead of owning it locally, so other components (the My Documents modal, Save button) can see whether a user is signed in
- Save button in `DocumentWorkspace` (visible when signed in): first save `POST`s a new `Document`; saving again on the same loaded document `PUT`s it in place rather than creating a duplicate
- My Documents modal (`frontend/src/components/MyDocumentsModal.tsx`, built on a new generic `Modal.tsx` primitive — the app's first modal) lists a signed-in user's saved documents by an auto-generated label (document name + save timestamp, no user-supplied name), with Load and Delete (Delete asks for confirmation first)
- New Document button resets the workspace (document type, fields, chat) to start over

### Current API Endpoints
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Sign in and receive a session cookie (JWT)
- `POST /api/auth/signout` - Clear the session cookie
- `GET /api/auth/me` - Get current user info
- `GET /api/health` - Health check
- `GET /api/chat/greeting` - Get AI greeting
- `POST /api/chat/message` - Send chat message and get AI response (document type + extracted fields + reply)
- `GET /api/templates/{filename}` - Get a template's name, field list, and raw content (unauthenticated; `filename` is one of catalog.json's 11 template files, e.g. `Mutual-NDA.md`)
- `GET /api/documents` - List the signed-in user's saved documents (auth required)
- `POST /api/documents` - Save a new document (auth required)
- `GET /api/documents/{id}` - Get one of the signed-in user's saved documents (auth required, 404 if not owned)
- `PUT /api/documents/{id}` - Update a saved document's fields (auth required, 404 if not owned)
- `DELETE /api/documents/{id}` - Delete a saved document (auth required, 404 if not owned)