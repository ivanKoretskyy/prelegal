#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE_NAME="prelegal"
CONTAINER_NAME="prelegal"
VOLUME_NAME="prelegal-data"
PORT=8000

echo "Building ${IMAGE_NAME} image..."
docker build -t "${IMAGE_NAME}" .

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Removing existing ${CONTAINER_NAME} container..."
  docker rm -f "${CONTAINER_NAME}" >/dev/null
fi

touch .env

if ! grep -q '^SESSION_SECRET_KEY=' .env; then
  # Ensure the file ends with a newline first — appending onto a file that
  # doesn't would merge this line with the previous one, corrupting both.
  [ -s .env ] && [ "$(tail -c1 .env)" != "" ] && echo >> .env
  echo "SESSION_SECRET_KEY=$(openssl rand -hex 32)" >> .env
  echo "Generated a new SESSION_SECRET_KEY in .env — keep it stable across restarts, or all existing sessions and saved documents become inaccessible."
fi

if ! grep -q '^OPENROUTER_API_KEY=' .env; then
  echo "Warning: OPENROUTER_API_KEY not set in .env — AI chat won't work." >&2
fi

docker volume create "${VOLUME_NAME}" >/dev/null

echo "Starting ${CONTAINER_NAME} on port ${PORT}..."
docker run -d --name "${CONTAINER_NAME}" --env-file .env -v "${VOLUME_NAME}:/app/data" -p "${PORT}:8000" "${IMAGE_NAME}"

echo "Backend available at http://localhost:${PORT}"
