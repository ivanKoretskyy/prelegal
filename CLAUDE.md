# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation supports all 11 document types from catalog.json. Users describe what they need via a freeform AI chat, which identifies the document type (or explains it can't help and suggests the closest supported one), then gathers that document's fields conversationally — with a generic manual form kept as a fallback for direct edits. This runs on the Dockerized FastAPI + SQLite foundation with basic (non-JWT) user authentication. See Implementation Status below for what's built vs. planned.

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
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.  
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
- `backend/`: uv-managed FastAPI + SQLModel project; SQLite DB file is deleted and recreated from scratch on every container start
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
- `GET /api/documents/{filename}` serves a document's `{name, fields, content}` for the frontend to render; `DocumentPreview`/`IntakeForm`/`DocumentWorkspace` are now fully generic (the old NDA-only `NdaWorkspace`/`standard-terms.ts` are gone)
- Frontend gained its first test infrastructure (vitest) specifically for the new markup parser, including a regression test that runs it against all 11 real template files

### Planned, not yet implemented (PL-7)
*(signup/signin with bcrypt-hashed passwords already exists as of PL-4 — remaining work is upgrading the session mechanism and adding persistence)*
- Upgrade session auth from the signed cookie to JWT tokens in HttpOnly cookies
- Document persistence — users can save documents to their account
- My Documents modal to view, load, and delete saved documents
- Shared auth context for user state across the app (today `AuthBar` manages its own local state)
- New Document button to start fresh
- Protected document save/load endpoints

### Current API Endpoints
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/signin` - Sign in and receive a session cookie
- `POST /api/auth/signout` - Clear the session cookie
- `GET /api/auth/me` - Get current user info
- `GET /api/health` - Health check
- `GET /api/chat/greeting` - Get AI greeting
- `POST /api/chat/message` - Send chat message and get AI response (document type + extracted fields + reply)
- `GET /api/documents/{filename}` - Get a template's name, field list, and raw content (unauthenticated; `filename` is one of catalog.json's 11 template files, e.g. `Mutual-NDA.md`)

### Planned API Endpoints (not yet implemented)
Note: these are for user document *persistence* (saved drafts), a different resource from the `GET /api/documents/{filename}` template-lookup route above — expect a path rename here to avoid the collision once this is built.
- `GET /api/documents` - List user's saved documents (auth required)
- `POST /api/documents` - Save new document (auth required)
- `GET /api/documents/{id}` - Get specific document (auth required)
- `PUT /api/documents/{id}` - Update document (auth required)
- `DELETE /api/documents/{id}` - Delete document (auth required)