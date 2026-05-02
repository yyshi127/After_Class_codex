#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: restore-db.sh /path/to/backup.sql.gz" >&2
  exit 1
fi

BACKUP_FILE="$1"
ROOT_DIR="${AFTERCLASS_ROOT:-/opt/afterclass}"
ENV_FILE="${ROOT_DIR}/.env.production"
COMPOSE_FILE="${ROOT_DIR}/docker-compose.prod.yml"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

gunzip -c "${BACKUP_FILE}" | docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
  psql -U "${POSTGRES_USER}" "${POSTGRES_DB}"

echo "database restored from: ${BACKUP_FILE}"
