#!/usr/bin/env bash
# Bật trang web xem database (https://<DOMAIN>/db/) và đặt mật khẩu lớp ngoài cho nó.
#     bash video-sharing-app/deploy/set-db-panel-password.sh
# Chạy lại để đổi mật khẩu. Tắt trang: xoá 3 dòng DB_PANEL_* / COMPOSE_PROFILES trong deploy/.env rồi chạy update.sh.
set -euo pipefail
DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"
SUDO=""; [ "$(id -u)" -ne 0 ] && ! groups | grep -qw docker && SUDO="sudo"

read -rp "Tên đăng nhập trang /db/ [admin]: " USER_NAME
USER_NAME="${USER_NAME:-admin}"
read -rsp "Mật khẩu (ít nhất 12 ký tự): " PASS; echo
[ "${#PASS}" -ge 12 ] || { echo "Mật khẩu quá ngắn"; exit 1; }

HASH="$($SUDO docker run --rm caddy:2 caddy hash-password --plaintext "$PASS")"

# Xoá dòng cũ (nếu có) rồi ghi lại. Dấu nháy đơn để docker compose không hiểu $ trong mã băm là biến.
sed -i '/^DB_PANEL_USER=/d;/^DB_PANEL_HASH=/d;/^COMPOSE_PROFILES=/d' "$ENV_FILE"
{
  echo "DB_PANEL_USER=$USER_NAME"
  echo "DB_PANEL_HASH='$HASH'"
  echo "COMPOSE_PROFILES=dbpanel"
} >> "$ENV_FILE"

cd "$(dirname "$DEPLOY_DIR")"
$SUDO docker compose -f deploy/docker-compose.prod.yml --env-file "$ENV_FILE" up -d adminer caddy
DOMAIN="$(grep -E '^DOMAIN=' "$ENV_FILE" | cut -d= -f2-)"
echo "Xong. Mở https://${DOMAIN:-<DOMAIN>}/db/ , đăng nhập lớp ngoài bằng $USER_NAME + mật khẩu vừa đặt."
