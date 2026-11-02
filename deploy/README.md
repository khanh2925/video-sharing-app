# Triển khai backend lên VPS Oracle Cloud (Always Free)

Kết quả: MySQL + Spring Boot + Caddy chạy bằng Docker trên VPS, có **HTTPS miễn phí** qua `sslip.io`
(không cần mua tên miền). App Expo gọi `https://<ip>.sslip.io` từ bất kỳ mạng nào, không cần chung WiFi.

```
Điện thoại ──HTTPS──▶ Caddy :443 ──▶ backend :8080 ──▶ MySQL :3306
                      (chỉ Caddy mở cổng ra Internet)
```

> Không sửa file dùng chung nào (`application.yaml`, `pom.xml`…): cấu hình production truyền qua biến môi trường.

## 1. Tạo VPS trên Oracle Console

1. **Compute → Instances → Create instance**
2. **Image**: Canonical Ubuntu **24.04**
3. **Shape**: Ampere `VM.Standard.A1.Flex` – **2 OCPU, 12 GB RAM** (mức Always Free hiện tại)
   - Báo *Out of capacity* → đổi Availability Domain khác hoặc thử lại sau. Có thể dùng tạm `VM.Standard.E2.1.Micro` (1 GB RAM, build sẽ chậm).
4. **Networking**: tạo VCN mới, public subnet, tick **Assign a public IPv4 address**
5. **SSH keys**: *Generate a key pair* → tải **private key** về (vd `oracle.key`)
6. Create → đợi trạng thái **Running**, ghi lại **Public IP**

## 2. Mở cổng 80, 443 trên Oracle

Instance → **Subnet** → **Security Lists** → *Default Security List* → **Add Ingress Rules**:

| Source CIDR | Protocol | Destination port |
|---|---|---|
| `0.0.0.0/0` | TCP | `80,443` |

(Cổng 22 cho SSH đã mở sẵn. Tường lửa bên trong Ubuntu do script tự mở.)

## 3. SSH vào VPS và lấy code

```bash
chmod 600 oracle.key                 # Windows: dùng PowerShell, bỏ qua dòng này
ssh -i oracle.key ubuntu@<PUBLIC_IP>
```

Repo đang **private** nên VPS cần quyền đọc. Dùng *Deploy key* (chỉ đọc, chỉ repo này):

```bash
ssh-keygen -t ed25519 -N "" -f ~/.ssh/id_ed25519
cat ~/.ssh/id_ed25519.pub
```

Copy dòng in ra → GitHub repo → **Settings → Deploy keys → Add deploy key** → dán vào → Add
(không tick *Allow write access*; cần quyền admin repo – nhờ Khánh nếu không có).

```bash
git clone git@github.com:khanh2925/video-sharing-app.git
cd video-sharing-app
git checkout main                    # hoặc nhánh muốn deploy
```

## 4. Chạy script cài đặt

```bash
bash deploy/setup-vps.sh
```

Script tự làm: cập nhật Ubuntu, tạo swap, mở iptables, cài Docker, sinh mật khẩu DB + JWT ngẫu nhiên
vào `deploy/.env`, build và chạy. Lần đầu mất 5–10 phút. Xong sẽ in ra:

```
API:        https://140-238-1-2.sslip.io
Trong mobile/.env.local đặt:
    EXPO_PUBLIC_API_URL=https://140-238-1-2.sslip.io
```

Có tên miền riêng? Trỏ bản ghi A về IP VPS rồi chạy `DOMAIN=api.tenmien.com bash deploy/setup-vps.sh`
(nếu đã có `deploy/.env` thì sửa dòng `DOMAIN=` trong đó rồi chạy lại).

## 5. Nối app mobile

```
EXPO_PUBLIC_API_URL=https://<ip-noi-bang-gach>.sslip.io
```

`npx expo start` lại → thấy "✅ Backend: UP". Video lưu trong DB dạng `/files/...`, app ghép với `EXPO_PUBLIC_API_URL` như cũ.

## Lệnh hay dùng (chạy trong thư mục `video-sharing-app`)

| Việc | Lệnh |
|---|---|
| Cập nhật code mới + build lại | `bash deploy/update.sh` |
| Xem log backend | `sudo docker compose -f deploy/docker-compose.prod.yml logs -f backend` |
| Trạng thái container | `sudo docker compose -f deploy/docker-compose.prod.yml ps` |
| Khởi động lại | `sudo docker compose -f deploy/docker-compose.prod.yml restart backend` |
| Vào MySQL | `sudo docker compose -f deploy/docker-compose.prod.yml exec db sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" video_sharing'` |
| Sao lưu DB | `sudo docker compose -f deploy/docker-compose.prod.yml exec db sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" video_sharing' > backup.sql` |
| Xoá sạch dữ liệu, seed lại từ đầu | `sudo docker compose -f deploy/docker-compose.prod.yml down -v` rồi `bash deploy/setup-vps.sh` |

Sau lần chạy đầu, đăng xuất SSH rồi vào lại là gõ `docker` không cần `sudo`.

## Lỗi thường gặp

- **Script đứng ở "Đang chờ backend"** → chưa mở Security List (bước 2). Xem `logs -f caddy`: lỗi *timeout during connect* là do cổng 80 bị chặn.
- **Backend restart liên tục** → `logs backend`; thường do MySQL chưa sẵn sàng lần đầu, đợi thêm 1 phút.
- **Upload video lỗi "File quá lớn"** → giới hạn do quản trị viên chỉnh (`VIDEO_MAX_SIZE_MB`), trần cứng 500MB.
- **Hết ổ đĩa** → `df -h`; dọn image cũ: `sudo docker system prune -f`. Boot volume Always Free tổng 200 GB, có thể tăng kích thước trên Console.
- **Oracle tắt instance vì "idle"** → tài khoản Free có thể bị thu hồi máy nhàn rỗi lâu ngày; nâng lên Pay As You Go (vẫn miễn phí trong hạn mức) để tránh.

## Bật Spring AI (gợi ý video, chatbot)

Container `vector-db` (pgvector) đã có sẵn trong `docker-compose.prod.yml`. AI mặc định **tắt**.

1. Mở `deploy/.env`, thêm dòng `SPRING_PROFILES_ACTIVE=ai`.
2. Chạy `bash video-sharing-app/deploy/update.sh`.
3. Kiểm tra log: `docker compose -f deploy/docker-compose.prod.yml logs backend | grep profile` phải thấy `"ai"`.
4. Đăng nhập tài khoản admin, gọi `POST /api/admin/ai/reindex` **một lần** để nạp vector cho video có sẵn.

Tắt lại: xoá dòng ở bước 1 rồi chạy lại `update.sh`. Key AI đã ghi sẵn trong `backend/src/main/resources/application-ai.yaml`.
pgvector tốn thêm khoảng 100–200 MB RAM.

## Trang web xem database (Adminer)

Giống phpMyAdmin: mở `https://<DOMAIN>/db/` bằng trình duyệt, xem và truy vấn cả MySQL lẫn pgvector. Mặc định **tắt và bị khoá**.

**Bật / đổi mật khẩu** (trên VPS):
```bash
bash video-sharing-app/deploy/set-db-panel-password.sh
```
Script hỏi tên đăng nhập và mật khẩu (≥ 12 ký tự), tự ghi vào `deploy/.env` rồi khởi động trang.

**Vào trang**: có 2 lớp đăng nhập.
1. Hộp đăng nhập của trình duyệt: tên + mật khẩu vừa đặt bằng script.
2. Form của Adminer:
   - MySQL: System `MySQL`, Server `db`, Username `root`, Password = `MYSQL_ROOT_PASSWORD` trong `deploy/.env`, Database `video_sharing`.
   - Kho vector: System `PostgreSQL`, Server `vector-db`, Username `vsa`, Password = `VECTOR_DB_PASSWORD` (mặc định `vsa`), Database `vsa_vectors`.

**Tắt**: xoá 3 dòng `DB_PANEL_USER`, `DB_PANEL_HASH`, `COMPOSE_PROFILES` trong `deploy/.env`, rồi chạy:
```bash
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env rm -sf adminer && bash deploy/update.sh
```

Trang này sửa xoá được toàn bộ dữ liệu: không chia sẻ mật khẩu, chỉ bật khi cần, nên tắt sau khi chấm đồ án.
