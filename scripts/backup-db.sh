#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${AFTERCLASS_ROOT:-/opt/afterclass}"
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"
BACKUP_DIR="${ROOT_DIR}/backups/postgres"
mkdir -p "${BACKUP_DIR}"

if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  . "${ENV_FILE}"
  set +a
fi

RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="${BACKUP_DIR}/afterclass-${STAMP}.sql.gz"

docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${OUT_FILE}"

ln -sfn "${OUT_FILE}" "${BACKUP_DIR}/latest.sql.gz"
find "${BACKUP_DIR}" -type f -name 'afterclass-*.sql.gz' -mtime +"${RETENTION_DAYS}" -delete

echo "backup created: ${OUT_FILE}"
