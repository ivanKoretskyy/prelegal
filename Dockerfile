# ---- Frontend build stage ----
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- Backend runtime stage ----
FROM python:3.12-slim AS backend
COPY --from=ghcr.io/astral-sh/uv:0.10.11 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:${PATH}"

WORKDIR /app

# Install dependencies first so the layer is cached while only app code changes.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY backend/ ./
RUN uv sync --frozen --no-dev

# Static frontend export, served by FastAPI at "/".
COPY --from=frontend-build /app/frontend/out ./src/backend/static

# Document templates + catalog, read by the backend at runtime.
COPY templates/ ./templates
COPY catalog.json ./catalog.json
ENV TEMPLATES_DIR=/app/templates \
    CATALOG_PATH=/app/catalog.json \
    BACKEND_DB_PATH=/app/data/backend.db

# SQLite file lives here so it survives restarts when this is mounted on a
# volume (see scripts/start-*). Falls back to an anonymous volume if run
# without -v, so data isn't lost to the writable container layer either way.
VOLUME ["/app/data"]

EXPOSE 8000
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
