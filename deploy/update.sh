#!/usr/bin/env bash
# Cập nhật VPS lên code mới nhất của nhánh hiện tại rồi build lại.
#     bash video-sharing-app/deploy/update.sh
set -euo pipefail
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$(dirname "$DEPLOY_DIR")"

SUDO=""; [ "$(id -u)" -ne 0 ] && ! groups | grep -qw docker && SUDO="sudo"

git pull --ff-only
$SUDO docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d --build
$SUDO docker image prune -f >/dev/null
$SUDO docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env ps
