#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

IMAGE_NAME="prelegal"
CONTAINER_NAME="prelegal"
PORT=8000

echo "Building ${IMAGE_NAME} image..."
docker build -t "${IMAGE_NAME}" .

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "Removing existing ${CONTAINER_NAME} container..."
  docker rm -f "${CONTAINER_NAME}" >/dev/null
fi

ENV_FILE_ARGS=()
if [ -f .env ]; then
  ENV_FILE_ARGS=(--env-file .env)
else
  echo "Warning: .env not found — AI chat won't work without OPENROUTER_API_KEY." >&2
fi

echo "Starting ${CONTAINER_NAME} on port ${PORT}..."
docker run -d --name "${CONTAINER_NAME}" ${ENV_FILE_ARGS[@]+"${ENV_FILE_ARGS[@]}"} -p "${PORT}:8000" "${IMAGE_NAME}"

echo "Backend available at http://localhost:${PORT}"
