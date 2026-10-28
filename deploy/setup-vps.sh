#!/usr/bin/env bash
# Cài đặt VPS Oracle Cloud (Ubuntu 22.04/24.04, x86 hoặc ARM Ampere) cho Video Sharing App.
# Chạy trên VPS, sau khi đã clone repo:
#     bash video-sharing-app/deploy/setup-vps.sh
# Tuỳ chọn: DOMAIN=api.tenmien.com bash .../setup-vps.sh   (mặc định dùng <ip>.sslip.io)
# Chạy lại nhiều lần vẫn an toàn.

set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(dirname "$DEPLOY_DIR")"
ENV_FILE="$DEPLOY_DIR/.env"
COMPOSE=(docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" --env-file "$ENV_FILE")

SUDO=""
[ "$(id -u)" -ne 0 ] && SUDO="sudo"

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }

# ---------------------------------------------------------------------------
step "1/6 Cập nhật hệ thống, cài gói cần thiết"
export DEBIAN_FRONTEND=noninteractive
$SUDO apt-get update -y
$SUDO apt-get install -y ca-certificates curl git openssl iptables-persistent
ok "Xong"

# ---------------------------------------------------------------------------
step "2/6 Tạo swap 2GB (tránh hết RAM khi build Maven)"
if [ "$($SUDO swapon --show --noheadings | wc -l)" -eq 0 ]; then
  $SUDO fallocate -l 2G /swapfile
  $SUDO chmod 600 /swapfile
  $SUDO mkswap /swapfile >/dev/null
  $SUDO swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' | $SUDO tee -a /etc/fstab >/dev/null
  ok "Đã tạo swap"
else
  ok "Đã có swap, bỏ qua"
fi

# ---------------------------------------------------------------------------
step "3/6 Mở cổng 80, 443 trong iptables của Ubuntu (image Oracle mặc định chặn)"
# Làm TRƯỚC khi cài Docker để không lưu lẫn luật của Docker.
for proto in tcp udp; do
  ports="80,443"; [ "$proto" = "udp" ] && ports="443"
  if ! $SUDO iptables -C INPUT -p "$proto" -m state --state NEW -m multiport --dports "$ports" -j ACCEPT 2>/dev/null; then
    $SUDO iptables -I INPUT 1 -p "$proto" -m state --state NEW -m multiport --dports "$ports" -j ACCEPT
  fi
done
if ! command -v docker >/dev/null 2>&1; then
  $SUDO netfilter-persistent save >/dev/null
fi
ok "Đã mở cổng (nhớ mở cả Security List trên Oracle Console)"

# ---------------------------------------------------------------------------
step "4/6 Cài Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | $SUDO sh
  $SUDO systemctl enable --now docker
  [ -n "$SUDO" ] && $SUDO usermod -aG docker "$USER"
  ok "Đã cài $(docker --version)"
else
  ok "Đã có $(docker --version)"
fi
[ -n "$SUDO" ] && COMPOSE=("$SUDO" "${COMPOSE[@]}")

# ---------------------------------------------------------------------------
step "5/6 Tạo file cấu hình deploy/.env"
if [ ! -f "$ENV_FILE" ]; then
  PUBLIC_IP="$(curl -fsS --max-time 10 https://api.ipify.org || curl -fsS --max-time 10 https://ifconfig.me)"
  DOMAIN="${DOMAIN:-${PUBLIC_IP//./-}.sslip.io}"
  umask 077
  cat > "$ENV_FILE" <<EOF
DOMAIN=$DOMAIN
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 16)
MYSQL_PASSWORD=$(openssl rand -hex 16)
JWT_SECRET=$(openssl rand -hex 32)
EOF
  ok "Đã tạo $ENV_FILE (mật khẩu ngẫu nhiên)"
else
  ok "Đã có $ENV_FILE, giữ nguyên"
fi
DOMAIN="$(grep '^DOMAIN=' "$ENV_FILE" | cut -d= -f2-)"

# ---------------------------------------------------------------------------
step "6/6 Build và chạy (lần đầu mất 5–10 phút)"
cd "$REPO_DIR"
"${COMPOSE[@]}" up -d --build
"${COMPOSE[@]}" ps

if [ -n "$DOMAIN" ]; then URL="https://$DOMAIN"; else URL="http://$(curl -fsS https://api.ipify.org)"; fi

printf '\nĐang chờ backend khởi động'
for _ in $(seq 1 60); do
  if curl -fsS --max-time 5 "$URL/api/health" >/dev/null 2>&1; then
    echo
    ok "Backend chạy: $(curl -fsS "$URL/api/health")"
    cat <<EOF

=================================================================
  API:        $URL
  Kiểm tra:   $URL/api/health
  Video mẫu:  $URL/files/videos/video01.mp4

  Trong mobile/.env.local đặt:
      EXPO_PUBLIC_API_URL=$URL
=================================================================
EOF
    exit 0
  fi
  printf '.'; sleep 10
done

echo
warn "Chưa gọi được $URL/api/health sau 10 phút. Kiểm tra:"
echo "  - Security List trên Oracle Console đã mở TCP 80, 443 chưa"
echo "  - Log: ${COMPOSE[*]} logs -f backend caddy"
exit 1
