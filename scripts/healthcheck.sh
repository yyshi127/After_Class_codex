#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${AFTERCLASS_ROOT:-/opt/afterclass}"
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"

cd "${ROOT_DIR}"

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  set +a
fi

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps

if [ -n "${APP_BASE_URL:-}" ]; then
  curl -fsS "${APP_BASE_URL}" >/dev/null
fi

if [ -n "${API_BASE_URL:-}" ]; then
  curl -fsS "${API_BASE_URL}/health" >/dev/null
fi

echo "healthcheck passed"
