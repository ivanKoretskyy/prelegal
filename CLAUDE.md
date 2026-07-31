# Prelegal Project

## Overview

This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory.
The user can carry out AI chat in order to establish what document they want and how to fill in the fields.
The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The current implementation supports the Mutual NDA document type only, via a form-based UI (not yet AI chat), running on the Dockerized FastAPI + SQLite foundation with basic (non-JWT) user authentication. See Implementation Status below for what's built vs. planned.

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

### Planned, not yet implemented (PL-5)
- AI chat interface to replace the manual form for NDA creation
- LiteLLM via OpenRouter with Cerebras inference (gpt-oss-120b model), per the Cerebras skill
- Structured outputs for reliable field extraction from conversation
- Live preview updates as AI extracts fields from chat
- AI greets user, asks questions conversationally, and confirms when complete

### Planned, not yet implemented (PL-6)
- Support for the other 10 document types from catalog.json (only Mutual NDA exists today)
- AI detects document type from user requests and routes accordingly
- Dedicated preview/PDF components per document type, or a generic fallback

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

### Planned API Endpoints (not yet implemented)
- `GET /api/documents` - List user's saved documents (auth required)
- `POST /api/documents` - Save new document (auth required)
- `GET /api/documents/{id}` - Get specific document (auth required)
- `PUT /api/documents/{id}` - Update document (auth required)
- `DELETE /api/documents/{id}` - Delete document (auth required)
- `GET /api/chat/greeting` - Get AI greeting
- `POST /api/chat/message` - Send chat message and get AI response