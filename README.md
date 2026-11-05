# LikTok – Video Sharing App – Đề tài 1 (TBDD)

Nhóm: Phạm Quốc Khánh (NT) · Nguyễn Anh Long · Huỳnh Hoài Thanh

| Phần | Công nghệ |
|---|---|
| Backend | Spring Boot · Java 21 · Maven |
| Database | MySQL 8.4 + PostgreSQL/pgvector (chạy bằng Docker) |
| AI | Spring AI · Google Gemini (tuỳ chọn) |
| Mobile | Expo React Native + TypeScript |

> **Hướng dẫn cài đặt và chạy chương trình đầy đủ (có hình minh hoạ):** [docs/HuongDan_ChayChuongTrinh.docx](docs/HuongDan_ChayChuongTrinh.docx) – bản PDF: [docs/HuongDan_ChayChuongTrinh.pdf](docs/HuongDan_ChayChuongTrinh.pdf).
> Bản đã triển khai: https://liktok.129-221-164-93.sslip.io

## 1. Cài trước (mỗi máy 1 lần)
- Git
- Docker Desktop: https://www.docker.com/products/docker-desktop/
- JDK 21
- IntelliJ IDEA
- Node.js 20+
- App **Expo Go** trên điện thoại

## 2. Lấy code về
~~~
git clone https://github.com/khanh2925/video-sharing-app.git
cd video-sharing-app
~~~

## 3. Chạy MySQL bằng Docker
Mở Docker Desktop trước, rồi:
~~~
docker compose up -d
docker ps
~~~
Thấy 2 container `vsa-mysql` (MySQL) và `vsa-pgvector` (kho vector cho AI) trạng thái `Up` là được.

| Thông số | Giá trị |
|---|---|
| Host | localhost |
| Port | 3307 |
| Database | video_sharing |
| User / Pass | root / root |

## 4. Chạy backend
1. IntelliJ → Open → chọn thư mục `backend`
2. Đợi Maven tải thư viện xong
3. Mở `BackendApplication.java` → bấm ▶
4. Mở http://localhost:8080/api/health → thấy `{"status":"UP", "mysqlVersion":"8.4.x"}` là OK
5. Lần chạy đầu backend tự nạp **dữ liệu mẫu** (8 video, chủ đề, nhạc, bình luận, 1 live). Mở http://localhost:8080/files/videos/video01.mp4 thấy video là OK.
   Tài khoản mẫu, mật khẩu đều `123456`: `admin` (quản trị viên), `lan`, `minh`, `hoa`, `an`.

> Trước khi code, đọc **[docs/NghiepVu_ChucNang.md](docs/NghiepVu_ChucNang.md)**: nghiệp vụ từng use case, quy ước đặt tên, phân công, quy ước Git và những thứ đã có sẵn để dùng lại.

## 5. Chạy mobile (Expo)
Điện thoại và máy tính phải cùng WiFi.
~~~
cd mobile
npm install
cp .env.example .env.local
~~~
Mở `.env.local`, thay `<IP-may-ban>` bằng IP máy tính (Mac: `ipconfig getifaddr en0`, Windows: `ipconfig` → IPv4).
~~~
npx expo start
~~~
Quét mã QR bằng Expo Go → thấy "✅ Backend: UP" là thông cả mobile ↔ backend ↔ MySQL.

## 6. Lệnh hay dùng
| Việc | Lệnh |
|---|---|
| Tắt MySQL | `docker compose down` |
| Xoá sạch dữ liệu DB | `docker compose down -v` |
| Vào MySQL gõ lệnh | `docker exec -it vsa-mysql mysql -uroot -proot video_sharing` |
| Lấy code mới nhất | `git pull` |
| Đẩy code lên | `git add .` → `git commit -m "..."` → `git push` |

## 7. Lỗi thường gặp
- **Cannot connect to the Docker daemon** → chưa mở Docker Desktop.
- **port 3307 already allocated** → cổng 3307 đang bị chiếm, tắt ứng dụng đó hoặc đổi cổng trong `docker-compose.yml` và `application.yaml`.
- **Communications link failure** (backend) → MySQL chưa chạy, chạy lại `docker compose up -d`.
- **Network request failed** (mobile) → sai IP, khác WiFi, hoặc backend chưa chạy.
- **JSON Parse error: Unexpected character <** (mobile) → IP trỏ nhầm máy/ứng dụng khác.
- Đổi WiFi → IP đổi → sửa lại `.env.local` rồi chạy lại `npx expo start`.
