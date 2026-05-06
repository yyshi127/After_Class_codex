#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${AFTERCLASS_ROOT:-/opt/afterclass}"
THRESHOLD="${DISK_USAGE_THRESHOLD:-85}"

usage="$(df -P "${ROOT_DIR}" | awk 'NR==2 { gsub("%", "", $5); print $5 }')"

if [ -z "${usage}" ]; then
  echo "disk usage check failed for ${ROOT_DIR}" >&2
  exit 2
fi

if [ "${usage}" -ge "${THRESHOLD}" ]; then
  echo "disk usage ${usage}% exceeds threshold ${THRESHOLD}% for ${ROOT_DIR}" >&2
  exit 1
fi

echo "disk usage ${usage}% below threshold ${THRESHOLD}% for ${ROOT_DIR}"
