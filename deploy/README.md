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
