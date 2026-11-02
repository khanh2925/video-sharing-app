# Build bản web của app (Expo) rồi đóng gói chung với Caddy.
# Caddy vừa phục vụ giao diện web, vừa chuyển /api, /files, /ws vào backend (xem Caddyfile).
# Dùng trong docker-compose.prod.yml (service caddy), build context là thư mục mobile/.

# ---------- 1. Build giao diện web ----------
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Địa chỉ backend được gắn cứng vào bản build (giống EXPO_PUBLIC_API_URL trong .env.local)
ARG API_URL
ENV EXPO_PUBLIC_API_URL=${API_URL}
RUN npx expo export --platform web --output-dir dist

# ---------- 2. Caddy + các file web đã build ----------
FROM caddy:2
COPY --from=build /app/dist /srv
