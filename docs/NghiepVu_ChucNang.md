# Nghiệp vụ và chức năng hệ thống – LikTok (Video Sharing App, Đề tài 1)

> Tổng hợp từ: sơ đồ use case đã chốt (19 use case, 3 actor), tài liệu SDLC trên Google Docs (bản trình bày), class diagram và khung Back-End hiện tại (25/10/2026).
> Tên use case trong file này giữ **đúng tên trên sơ đồ use case**. Tên lớp, thuộc tính, enum giữ **đúng tên trong code** (tiếng Anh). Chú thích, câu báo lỗi vẫn tiếng Việt.
> Mục 7 ghi các **quyết định đã chốt** (25/10/2026) về đặt tên và những chỗ nghiệp vụ trước đó còn bỏ ngỏ. Code theo đúng mục này.
> **Cập nhật 01/11/2026:** đối chiếu lại với code thật trên `main` (UC01–03, UC08–10, UC17–18) và sửa các chỗ tài liệu ghi cũ: chế độ khách, đăng ký 3 bước, thoát màn Đăng video, lưới Video của tôi, tên bộ lọc, định dạng file story, hàng Stories, mã lỗi khi không có quyền xem video.

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Quy tắc chung của hệ thống](#2-quy-tắc-chung-của-hệ-thống)
3. [Actor và use case](#3-actor-và-use-case)
4. [Nghiệp vụ theo từng actor](#4-nghiệp-vụ-theo-từng-actor)
5. [Chi tiết từng use case](#5-chi-tiết-từng-use-case)
6. [Trạng thái video, tin, livestream](#6-trạng-thái-video-tin-livestream)
7. [Quyết định đã chốt](#7-quyết-định-đã-chốt)
8. [Phân công theo use case](#8-phân-công-theo-use-case)
9. [Hướng dẫn cho người code](#9-hướng-dẫn-cho-người-code)

---

## 1. Tổng quan

Ứng dụng di động chia sẻ video ngắn kiểu TikTok, dựng theo bộ **12 màn hình thiết kế** thầy giao.

- Người xem mở app là thấy ngay: hàng **Stories**, **Top trending**, **Browse topic** (chủ đề), **Streaming** (live đang phát), **Audio** (nhạc).
- Người dùng quay hoặc chọn video, thêm **bộ lọc màu**, **nhạc nền**, hashtag, chọn ai được xem, rồi đăng hoặc **lưu nháp**.
- Người xem thích, bình luận, theo dõi tác giả; xem và đăng **tin (story)** tự ẩn sau một khoảng thời gian (mặc định 24 giờ).
- **Livestream giả lập**: phát lại một video có sẵn làm luồng live; chat, thả cảm xúc và số người xem chạy **thời gian thực**.
- Quản trị viên ẩn video vi phạm, khoá tài khoản spam.

Công nghệ: Expo + React Native + TypeScript (mobile), Spring Boot 4 REST API + Spring Data JPA + Lombok (Back-End), MySQL 8 chạy bằng Docker Compose.

```
1_video_sharing_app/
├── backend/                Spring Boot (package com.vsa.backend) – cấu trúc giống đồ án WWW
│   ├── seed-media/         video + ảnh bìa mẫu cho DataSeeder
│   └── src/main/java/com/vsa/backend/
│       ├── configurations/ AppProperties, SecurityConfig, WebConfig (/files/**), DataSeeder
│       ├── controllers/    REST controller
│       ├── dtos/request/   dtos/response/
│       ├── entities/       14 entity
│       ├── enums/          7 enum
│       ├── exceptions/     ApiException, GlobalExceptionHandler
│       ├── mappers/        chuyển entity ↔ DTO
│       ├── repositories/   14 repository
│       ├── security/       JwtService, JwtAuthFilter
│       ├── services/       FileStorageService, SystemSettingService + service nghiệp vụ
│       └── utils/          SecurityUtils, AppConstants
├── mobile/                 Expo app (src/ chia sẵn thư mục, chưa có code)
├── docs/                   file này + uml/ (draw.io use case, class diagram)
├── postman/                collection test API
├── thaygui/                file thầy gửi (đề, 12 màn hình)
└── docker-compose.yml      MySQL 8, cổng 3307
```

---

## 2. Quy tắc chung của hệ thống

| # | Quy tắc |
|---|---|
| R1 | **Tên đăng nhập** 3–30 ký tự, chỉ gồm chữ không dấu, số, dấu chấm, gạch dưới, duy nhất. **Email** hợp lệ, tối đa 100 ký tự, duy nhất. **Tên hiển thị** tối đa 50 ký tự. **Mật khẩu** 6–72 ký tự (BCrypt chỉ dùng 72 byte đầu), lưu dạng băm **BCrypt**, không bao giờ trả ra API. Tên đăng nhập và email được đổi về chữ thường trước khi lưu và khi đăng nhập. |
| R2 | Đăng nhập bằng tên đăng nhập **hoặc** email, trả **JWT hạn 7 ngày**. Tài khoản `locked = true` bị từ chối **dù token còn hạn**. |
| R3 | **Khách** (chưa đăng nhập) chỉ đọc nội dung công khai. Mọi thao tác ghi (thích, bình luận, theo dõi, đăng…) cần đăng nhập; khách bấm vào thì hiện **bảng mời đăng nhập** (Đăng nhập / Tạo tài khoản mới / Để sau). Đăng nhập hoặc đăng ký xong thì quay lại đúng màn đang xem. |
| R4 | **Quyền xem video** theo `visibility` và `status` (xem bảng 6.2). Video `DRAFT`, `PRIVATE` chỉ tác giả thấy; `FOLLOWERS` chỉ người đang theo dõi tác giả thấy; `HIDDEN` không hiện ở đâu cả. |
| R5 | **Chỉ chủ sở hữu** được sửa, xoá video, bình luận, tin của mình. Người khác gọi API sửa / xoá → **HTTP 403**. Còn **xem** một video mình không có quyền (nháp hoặc riêng tư của người khác, chỉ cho người theo dõi mà mình chưa theo dõi, bị ẩn) thì trả **HTTP 404** "Video không tồn tại hoặc bạn không có quyền xem", để không lộ là video có tồn tại. |
| R6 | Mỗi người **thích một video / một bình luận tối đa 1 lần**, mỗi cặp theo dõi chỉ 1 dòng, mỗi người xem một tin chỉ ghi 1 lượt (ràng buộc unique trong DB). **Không tự theo dõi chính mình.** |
| R7 | Các bộ đếm `likeCount`, `commentCount`, `viewCount` (bảng `videos`) và `likeCount` (bảng `comments`) được cập nhật **trong cùng giao dịch** với bảng chi tiết, để trang chủ không phải đếm lại. |
| R8 | **Upload**: video mp4 / mov / webm ≤ **`VIDEO_MAX_SIZE_MB`** (mặc định 100 MB, quản trị viên chỉnh); ảnh jpg / jpeg / png / webp ≤ **5 MB** (`application.yaml`). Định dạng kiểm tra theo đuôi tên file. File lưu trong `uploads/` với **tên UUID**. Tin là video thì dài tối đa **`STORY_MAX_DURATION_SEC`** (mặc định 15 giây, quản trị viên chỉnh); app gửi kèm độ dài (`durationSec`), **backend kiểm tra** và từ chối nếu quá. |
| R9 | **Bộ lọc và nhạc chỉ lưu thông tin** (`filter`, `audio`) đi kèm video, không xử lý lại file. App hiển thị bộ lọc bằng lớp màu phủ khi phát. |
| R10 | Video: **tiêu đề bắt buộc, ≤ 150 ký tự**; mô tả ≤ 2000 ký tự. Bình luận **1–500 ký tự** (hằng số trong `AppConstants`, gắn với độ dài cột DB). Video tắt bình luận (`allowComments = false`) thì chặn gửi bình luận mới. |
| R11 | **Tin (story) hết hạn sau `STORY_LIFETIME_HOURS` giờ** (mặc định 24, quản trị viên chỉnh; `expiresAt` tính lúc đăng, đổi thông số không ảnh hưởng tin đã đăng). Hàng Stories chỉ hiện tin còn hạn của **bản thân và người mình đang theo dõi**. |
| R12 | **Livestream giả lập**: luồng hình là một video **của chính người phát** được phát lặp. Chat, cảm xúc, số người xem đi qua **WebSocket STOMP** (`/ws`). |
| R13 | Danh sách trả về **phân trang** `{content, page, size, totalElements, totalPages, last}`; bình luận 20 mục / trang (`app.paging.comment-page-size`), mới nhất trước. |
| R14 | Mọi lỗi API trả JSON thống nhất `{"status": 400, "message": "…", "timestamp": "…"}`. |
| R15 | Quản trị viên **không khoá được tài khoản quản trị**. Video bị ẩn không xoá khỏi DB (để tra lại khi cần), quản trị viên **bỏ ẩn được** khi ẩn nhầm (C4). |
| R17 | **Thông số không viết cứng**, chia 3 loại (C12): thông số quản trị viên chỉnh trên hệ thống (bảng `system_settings`, UC19); cấu hình kỹ thuật trong `application.yaml`; giới hạn gắn với cột DB trong `AppConstants`. |
| R16 | Các nút có trong thiết kế nhưng **ngoài phạm vi MVP** (Buy now, Message, Also post on, chia sẻ sang Facebook / Instagram / sao chép liên kết) vẫn hiện, bấm vào thì báo "Tính năng sẽ có ở phiên bản sau". |

---

## 3. Actor và use case

### 3.1 Actor

| Actor (tên trên sơ đồ) | Là ai | Ghi chú |
|---|---|---|
| Khách | Người mở app **chưa đăng nhập** | Xem trang chủ, tìm kiếm, xem video, xem hồ sơ; đăng ký tài khoản. |
| Người dùng | Người đã có tài khoản, vai trò `USER` | **Kế thừa** mọi việc của Khách, thêm tương tác, đăng video, đăng tin, theo dõi, phát và xem live. Người phát live cũng chỉ là Người dùng. |
| Quản trị viên | Tài khoản vai trò `ADMIN` | Kiểm duyệt video, khoá / mở khoá tài khoản, chỉnh thông số hệ thống. Làm trên **trang quản trị trong app** (chỉ hiện với tài khoản ADMIN; thiết kế của thầy không có màn này nên nhóm bổ sung). |

Vai trò lưu ở `User.role` (enum `Role`). Chỉ có **một bảng** `users` cho cả hai vai trò.

### 3.2 Danh sách 19 use case

| Mã | Use case | Actor | Quan hệ | Màn hình thiết kế |
|---|---|---|---|---|
| UC01 | Đăng ký tài khoản | Khách | | (bổ sung) Register |
| UC02 | Đăng nhập | Khách, Quản trị viên | Được các use case cần tài khoản «include» | (bổ sung) Login |
| UC03 | Đăng xuất | Người dùng, Quản trị viên | «include» Đăng nhập | My Profile (menu) |
| UC04 | Tìm kiếm | Khách, Người dùng | | Search Video, Home (Browse topic) |
| UC05 | Xem video | Khách, Người dùng | | Home – Video Listing, Video Watching |
| UC06 | Xem hồ sơ người dùng | Khách, Người dùng | | Profile Details |
| UC07 | Quản lý thông tin cá nhân | Người dùng | «include» Đăng nhập | My Profile |
| UC08 | Đăng video | Người dùng | «include» Đăng nhập | Create Video – Upload, Post Video |
| UC09 | Chỉnh sửa video | Người dùng | «extend» Đăng video | Select Filter, Select Music |
| UC10 | Quản lý video | Người dùng | «include» Đăng nhập | My Profile |
| UC11 | Tương tác video | Người dùng | «include» Đăng nhập | Video Watching, Comment on Video |
| UC12 | Theo dõi người dùng | Người dùng | «include» Đăng nhập | Follow, Profile Details |
| UC13 | Phát livestream | Người dùng | «include» Đăng nhập | Video Streaming |
| UC14 | Xem livestream | Người dùng | «include» Đăng nhập | Video Streaming |
| UC15 | Kiểm duyệt video | Quản trị viên | «include» Đăng nhập | (bổ sung) Quản trị → Kiểm duyệt video |
| UC16 | Quản lý người dùng | Quản trị viên | «include» Đăng nhập | (bổ sung) Quản trị → Quản lý người dùng |
| UC17 | Đăng story | Người dùng | «include» Đăng nhập | Home – Video Listing (Stories) |
| UC18 | Xem story | Người dùng | «include» Đăng nhập | Home – Video Listing (Stories) |
| UC19 | Cấu hình hệ thống | Quản trị viên | «include» Đăng nhập | (bổ sung) Quản trị → Cấu hình hệ thống |
| UC20 | Thông báo và chia sẻ | Người dùng | «include» Đăng nhập | Home (chuông), Video Watching (Chia sẻ) |

Người dùng —▷ Khách (kế thừa). Thích và bình luận gộp chung một use case **Tương tác video**; bộ lọc và nhạc **không** là use case riêng mà nằm trong **Chỉnh sửa video**.

---

## 4. Nghiệp vụ theo từng actor

### 4.1 Khách

- Xem trang chủ: Top trending, Browse topic, Streaming, Audio (hàng Stories chỉ hiện khi đã đăng nhập).
- Tìm kiếm video, tài khoản, live, nhạc.
- Xem video toàn màn hình, xem bình luận, xem hồ sơ người khác.
- Bấm thích, bình luận, theo dõi, "+", tab Bạn bè, đăng tin, phát / xem live → hiện bảng mời đăng nhập; tab Hồ sơ của khách có nút Đăng ký và link Đăng nhập.
- Đăng ký tài khoản.

```
HOME – VIDEO LISTING
[ Stories ]  (You +) (Lan●) (Minh●) (Hoa○) ...       ● viền xanh = có tin mới, ○ xám = đã xem

Top trending                                   [Show more]
 [video 1.5M views] [video 820K views] [video ...]
Browse topic
 (Sports) (Podcasts) (News) (Travel) (Health) (Weather) (Art)
Streaming
 [● LIVE  Shop Hoa – 12 phút trước – 1.2K xem]
Audio
 [Bài A 0:30] [Bài B 0:45]

[ Home ] [ Search ] [ + ] [ Friends ] [ My profile ]
```

### 4.2 Người dùng

**Tài khoản**: xem và sửa tên hiển thị, tiểu sử, ảnh đại diện; đăng xuất.

**Xem và tương tác**

1. Lướt video toàn màn hình, video tự lặp; mỗi lần mở tăng `viewCount` 1.
2. Bấm tim để thích / bỏ thích; mở bảng bình luận, gửi bình luận, thích bình luận, xoá bình luận của mình.
3. Bấm "Follow" ở video, hồ sơ hoặc mục gợi ý; xem danh sách followers / following ở tab Friends.

**Đăng video**

1. Bấm "+" → quay video mới (tối đa 60 giây), hoặc "Tải lên" chọn video trong thư viện (≤ 60 giây, ≤ 100 MB).
2. (Tuỳ chọn) chọn bộ lọc, chọn nhạc nền – UC09.
3. Màn Đăng video: nhập tiêu đề, mô tả, hashtag, chủ đề, đổi ảnh bìa; chọn **Ai được xem** (Mọi người / Người theo dõi / Chỉ mình tôi); bật / tắt Cho phép bình luận.
4. Bấm "Đăng" → video `PUBLISHED`, về tab Hồ sơ; hoặc "Lưu nháp" → video `DRAFT`, mở màn Video nháp để đăng sau.

```
POST ON SOCIAL
 [ảnh bìa]  Tiêu đề: [________________]  (bắt buộc, ≤150)
            Mô tả:   [________________]
 Hashtag:   #dulich #dalat  [+]
 Chủ đề:    [ Travel ▼ ]
 Ai được xem:  (•) Mọi người  ( ) Người theo dõi  ( ) Chỉ mình tôi
 Cho phép bình luận:  [ON]
            [ Lưu nháp ]                   [ Đăng ]
```

**Tin (story)**: bấm ô "Đăng tin" hoặc chế độ Story ở màn Camera, đăng ảnh hoặc video ngắn (mặc định ≤ 15 giây); xem tin của mình và của người mình theo dõi, tin tự ẩn sau 24 giờ (mặc định, quản trị viên chỉnh được).

**Livestream**: mở phòng live từ menu hồ sơ (chọn video nguồn của mình, gắn sản phẩm nếu muốn); vào xem live của người khác, chat, thả ❤️ / 👍 / 😀.

```
VIDEO STREAMING                                  👁 1.204   [X]
 [ video nguồn phát lặp ]
 Lan: giá bao nhiêu shop ơi?
 Minh: ❤️
 Hoa (chủ phòng): 199k nha
 ┌──────────────────────────────┐
 │ [ảnh] Áo thun basic  199.000đ │ [Buy now]   ← ngoài MVP, chỉ báo
 └──────────────────────────────┘
 [ Nhập bình luận...      ] [Gửi]   ❤️ 👍 😀
```

### 4.3 Quản trị viên

- Đăng nhập bằng tài khoản vai trò `ADMIN` (tạo sẵn trong dữ liệu mẫu).
- Ẩn video vi phạm → video chuyển `HIDDEN`, biến khỏi trang chủ, tìm kiếm, hồ sơ.
- Khoá / mở khoá tài khoản → `locked = true / false`; tài khoản bị khoá không đăng nhập được, token cũ cũng bị từ chối.
- Chỉnh thông số hệ thống (độ dài story, thời gian tồn tại story, dung lượng video) → có hiệu lực ngay, không phải sửa code hay chạy lại server.
- **Trang quản trị trong app** (thêm 02/11/2026): tài khoản ADMIN thấy dòng "Quản trị" trong menu ☰ ở Hồ sơ của tôi (và trong Cài đặt). Gồm:
  - **Bảng điều khiển**: số người dùng, số bị khoá, video đã đăng, video đã ẩn (`GET /api/admin/stats`); bấm ô số liệu mở đúng danh sách.
  - **Kiểm duyệt video (UC15)**: tìm theo tiêu đề / tác giả, lọc Tất cả / Đang hiện / Đã ẩn (`GET /api/admin/videos`), nút "Ẩn" có hỏi xác nhận.
  - **Quản lý người dùng (UC16)**: tìm theo tên, @tên đăng nhập, email, lọc Tất cả / Hoạt động / Bị khoá (`GET /api/admin/users`), nút "Khoá" / "Mở khoá" có hỏi xác nhận; tài khoản quản trị không có nút khoá (R15).
  - **Cấu hình hệ thống (UC19)**: sửa 3 thông số, kiểm tra số nguyên lớn hơn 0, chỉ gửi thông số đã đổi; rời màn khi chưa lưu thì hỏi.
- Mọi API vẫn nằm dưới `/api/admin/**`: chưa đăng nhập 401, người dùng thường 403. Postman vẫn dùng để kiểm thử API.

---

## 5. Chi tiết từng use case

Mỗi use case ghi: **Actor**, **Mục đích**, **Điều kiện trước**, **Luồng chính**, **Luồng phụ / lỗi**, **Quy tắc**, **API**, **Dữ liệu** (entity liên quan). Đặc tả đầy đủ dạng bảng nằm ở mục 3.3 tài liệu Google Docs.

### 5.1 Nhóm tài khoản

#### UC01. Đăng ký tài khoản
- **Actor**: Khách.
- **Luồng chính** (3 bước, có thanh tiến độ, nút "Tiếp tục" xám khi bước chưa hợp lệ):
  1. Email.
  2. Mật khẩu + nhập lại; danh sách điều kiện "Từ 6 đến 72 ký tự", "Hai lần nhập giống nhau" tự tick xanh.
  3. Tên đăng nhập + tên hiển thị, có thẻ xem trước hồ sơ → "Đăng ký".
  → Hệ thống kiểm tra → băm mật khẩu, lưu `User` (vai trò `USER`, `locked = false`) → tạo JWT → **đăng nhập luôn**, quay lại màn đang xem trước khi mở Đăng ký.
- **Luồng phụ**: nút lùi ở bước 2, 3 về bước trước (giữ dữ liệu đã nhập); ở bước 1 thì đóng màn. Link "Đăng nhập" chuyển sang màn Đăng nhập.
- **Lỗi**: sai định dạng; "Mật khẩu nhập lại không khớp" (400); "Tên đăng nhập đã tồn tại" / "Email đã được sử dụng" (409). Lỗi liên quan email thì app tự quay về bước 1, lỗi khác hiện ở bước 3.
- **Quy tắc**: R1.
- **API**: `POST /api/auth/register`.
- **Dữ liệu**: User.

#### UC02. Đăng nhập
- **Actor**: Khách, Quản trị viên.
- **Luồng chính**: nhập tên đăng nhập hoặc email + mật khẩu (có `@` thì tìm theo email) → so khớp BCrypt → kiểm tra tài khoản bị khoá → trả JWT, thông tin người dùng, vai trò → app lưu token vào SecureStore, đóng màn (mở dạng modal) và quay lại màn hình trước đó.
- **Luồng phụ**: mở lại app → app đọc token đã lưu, gọi `GET /api/auth/me`; token hết hạn hoặc tài khoản bị khoá (401) thì tự đăng xuất.
- **Lỗi**: bỏ trống → báo ngay dưới ô, không gọi server; "Tên đăng nhập hoặc mật khẩu không đúng" (401, dùng chung một câu để không dò được tài khoản nào tồn tại); "Tài khoản đã bị khóa" (403, chỉ báo khi mật khẩu đúng).
- **Quy tắc**: R1, R2.
- **API**: `POST /api/auth/login`, `GET /api/auth/me`.
- **Dữ liệu**: User.

#### UC03. Đăng xuất
- **Actor**: Người dùng, Quản trị viên.
- **Luồng chính**: Hồ sơ của tôi → menu ☰ → "Đăng xuất" → hộp hỏi "Đăng xuất?" → xoá token trên máy, về Trang chủ ở trạng thái khách.
- **Luồng phụ**: chọn "Hủy" → giữ phiên.
- **Ghi chú**: JWT không lưu ở server nên đăng xuất chỉ xoá token phía app, **không cần API**.

#### UC07. Quản lý thông tin cá nhân
- **Actor**: Người dùng.
- **Chức năng**: xem hồ sơ của mình (avatar, tên, tiểu sử, số Following / Followers / Likes, tab My Videos / Liked); "Edit Profile" sửa `displayName`, `bio`, `avatarUrl`.
- **Lỗi**: tên hiển thị để trống; ảnh sai định dạng hoặc > 5 MB.
- **Quy tắc**: R8. Không cho sửa tên đăng nhập, email ở MVP.
- **API**: `GET /api/auth/me`, `PUT /api/users/me`, `POST /api/users/me/avatar`.
- **Dữ liệu**: User.

### 5.2 Nhóm xem và tìm kiếm

#### UC04. Tìm kiếm
- **Actor**: Khách, Người dùng.
- **Luồng chính**: tab Search → nhập từ khoá (vd "Pet") → tìm video công khai có tiêu đề, mô tả hoặc hashtag chứa từ khoá, sắp theo lượt xem → hiện lưới video + mục "Maybe you're interested" (hashtag liên quan) → chọn bộ lọc **Trending / Accounts / Streaming / Audio**.
- **Luồng phụ**: chọn chủ đề ở Browse topic → video thuộc chủ đề, "Show more" tải thêm; chưa nhập từ khoá → hiện trending; không có kết quả → "Không tìm thấy kết quả".
- **Màn Âm thanh** (thêm 02/11/2026): bấm một bài nhạc (tab Âm thanh ở Tìm kiếm, mục Âm thanh nổi bật ở Trang chủ, tên bài / đĩa nhạc ở Xem video) → màn Âm thanh: tên bài, ca sĩ, nghe thử, số video đang dùng, nút "Dùng âm thanh này" (mở Camera gắn sẵn bài) và lưới video công khai đang dùng bài đó, nhiều lượt xem trước. API `GET /api/audios/{id}`, `GET /api/audios/{id}/videos`.
- **Quy tắc**: chỉ tìm video `PUBLISHED` + `PUBLIC` (R4). Bộ lọc là tab trên giao diện, **không** tách use case con.
- **API**: `GET /api/search?q=&type=`, `GET /api/search/suggestions?q=`, `GET /api/videos?topicId=`, `GET /api/topics`.
- **Dữ liệu**: Video, Hashtag, Topic, User, LiveStream, Audio.

#### UC05. Xem video
- **Actor**: Khách, Người dùng.
- **Luồng chính**: mở app → trang chủ (Stories, Top trending, Browse topic, Streaming, Audio) → chọn video → phát toàn màn hình, tự lặp, hiện tác giả, mô tả, hashtag, nhạc, số thích, số bình luận → tăng lượt xem → chạm để dừng / phát, vuốt lên sang video kế.
- **Lỗi**: không kết nối được máy chủ → "Chạm để thử lại"; video không được phép xem → "Video không tồn tại hoặc bạn không có quyền xem".
- **Quy tắc**: R3, R4, R7. File video phát qua `/files/**` có hỗ trợ HTTP Range (xem được ngay, không chờ tải hết).
- **API**: `GET /api/videos/trending`, `GET /api/videos/{id}`, `POST /api/videos/{id}/view`, `GET /api/lives`, `GET /api/audios`.
- **Dữ liệu**: Video, User, Audio, Hashtag, Topic.

#### UC06. Xem hồ sơ người dùng
- **Actor**: Khách, Người dùng.
- **Luồng chính**: chọn avatar / tên → hiện avatar, tên, tiểu sử, số Following / Followers / Likes, nút Follow, Message, "Suggested accounts" → tab Videos (video được phép xem) và Liked.
- **Luồng phụ**: mở hồ sơ của chính mình → chuyển sang UC07; bấm "Message" → báo tính năng sau (R16).
- **API**: `GET /api/users/{id}`, `GET /api/users/{id}/videos`, `GET /api/users/{id}/liked`.
- **Dữ liệu**: User, Video, Follow, VideoLike.

### 5.3 Nhóm video

#### UC08. Đăng video
- **Actor**: Người dùng.
- **Điều kiện trước**: đã đăng nhập, đã cấp quyền **camera và micro** (chọn video có sẵn thì không cần).
- **Luồng chính**: "+" → màn Camera (chế độ Video) → quay video (tự dừng ở 60 giây, có hẹn giờ 3 / 10 giây) hoặc "Tải lên" chọn video trong thư viện → (tuỳ chọn) UC09 → "Tiếp" → màn Đăng video: xem trước, nhập tiêu đề, mô tả, hashtag, chủ đề, ảnh bìa, ai được xem, bật / tắt bình luận → "Đăng" → lưu file, tạo `Video` (`PUBLISHED`), tạo / gắn `Hashtag` → về tab Hồ sơ, video mới hiện trong lưới.
- **Luồng phụ**:
  - "Lưu nháp" → `DRAFT`, mở màn Video nháp.
  - Rời màn Camera khi đang quay → hỏi "Bỏ video đang quay?".
  - Rời màn Đăng video khi chưa đăng → hỏi "Thoát mà chưa đăng?" với 3 lựa chọn: Lưu nháp / Bỏ video / Ở lại.
  - Không chọn ảnh bìa → video không có ảnh bìa, lưới hiện biểu tượng máy quay.
- **Lỗi**:
  - App: video chọn từ thư viện quá 60 giây hoặc quá 100 MB; chưa có video mà bấm "Tiếp"; thiếu tiêu đề ("Nhập tiêu đề để đăng", không gửi).
  - Backend: sai định dạng ("Chỉ nhận file mp4, mov, webm"); quá `VIDEO_MAX_SIZE_MB` ("File quá lớn, tối đa 100 MB"); ảnh bìa sai định dạng hoặc > 5 MB; chủ đề / bài nhạc không tồn tại (404); hashtag dài quá 50 ký tự. Lưu DB lỗi thì xoá file vừa lưu.
- **Quy tắc**: R8, R10. Hashtag lưu không dấu `#`, viết thường, tối đa 50 ký tự, bỏ trùng; trùng tên với hashtag đã có thì dùng lại dòng cũ. Mặc định: ai được xem = `PUBLIC`, cho phép bình luận = bật.
- **API**: `POST /api/videos` (multipart: `file`, `thumbnail` và các trường `title`, `description`, `hashtags`, `topicId`, `audioId`, `filter`, `visibility`, `allowComments`, `draft`); `GET /api/topics` để chọn chủ đề.
- **Dữ liệu**: Video, Hashtag, Topic, Audio.

#### UC09. Chỉnh sửa video («extend» Đăng video)
- **Actor**: Người dùng.
- **Luồng chính**:
  - Bộ lọc: bấm "Bộ lọc" → 3 tab Dành cho bạn / Thịnh hành / Đã lưu → chọn 1 trong 8 bộ lọc (Film, Đen trắng, Tự nhiên, Nghệ thuật, Cổ điển, Mùa xuân, Baby, Tương phản) → lớp màu phủ lên bản xem trước → "Xong".
  - Nhạc: bấm "Thêm nhạc" → danh sách nhạc (3 tab, bài thịnh hành lên trước) → chạm bài để nghe thử → "Dùng" → tên bài hiện trên nút.
- **Luồng phụ**: chọn ⊘ bỏ bộ lọc ("Không lọc"); đóng màn Bộ lọc mà không bấm "Xong" thì không đổi gì; gõ tên bài hoặc ca sĩ để lọc danh sách nhạc; "Bỏ nhạc" để không dùng nhạc. Tab "Đã lưu" của nhạc chưa có (R16).
- **Quy tắc**: R9. Kết quả chỉ là 2 thuộc tính `filter`, `audio` gửi cùng lúc Post.
- **API**: `GET /api/audios` (dữ liệu chọn); lưu cùng `POST /api/videos`.
- **Dữ liệu**: Video.filter, Audio.

#### UC10. Quản lý video
- **Actor**: Người dùng.
- **Chức năng con**:

| Chức năng | Mô tả | Quy tắc |
|---|---|---|
| Xem video của tôi | Lưới "Video của tôi" ở Hồ sơ: video `PUBLISHED` của mình với mọi chế độ hiển thị (video riêng tư có biểu tượng khoá). Ô đầu tiên là **"Bản nháp: N"** (chỉ hiện khi có nháp) | |
| Xem bản nháp | Ô "Bản nháp: N" hoặc menu ☰ → "Video nháp" | Chỉ video `DRAFT` của mình, mới nhất trước, phân trang |
| Sửa video | Đổi tiêu đề, mô tả, ai được xem, bật / tắt bình luận. **Không** đổi file video, bộ lọc, nhạc, hashtag, chủ đề, ảnh bìa. Sửa bản nháp thì vẫn là nháp | R5, R10. Rời màn khi có thay đổi chưa lưu → hỏi "Bỏ thay đổi?" |
| Đăng bản nháp | "Đăng ngay" → hỏi xác nhận (kèm ai được xem) → `DRAFT` → `PUBLISHED` | |
| Xoá video | Hỏi xác nhận → xoá video kèm lượt thích bình luận, bình luận, lượt thích video, liên kết hashtag và file | R5. Video `HIDDEN` chủ video không sửa, không xoá được (để quản trị viên tra) |

- **Lỗi**: video không thuộc mình → 403 "Bạn không có quyền với video này"; video bị ẩn → 403 "Video đã bị quản trị viên ẩn"; xoá tiêu đề khi sửa → 400 "Tiêu đề không được để trống".
- **API**: `PUT /api/videos/{id}` (gửi trường muốn đổi; `{"publish": true}` để đăng bản nháp), `DELETE /api/videos/{id}`, `GET /api/videos/me/drafts`.
- **Dữ liệu**: Video, VideoLike, Comment, CommentLike.

### 5.4 Nhóm tương tác

#### UC11. Tương tác video
- **Actor**: Người dùng.
- **Chức năng con**:

| Chức năng | Mô tả | Quy tắc |
|---|---|---|
| Thích video | Bấm tim → lưu `VideoLike`, +1 `likeCount`, tim đỏ | R6, R7 |
| Bỏ thích | Bấm lại tim đỏ → xoá lượt, −1 | |
| Xem bình luận | Mới nhất trước, 20 / trang, "x phút trước" | R13 |
| Gửi bình luận | 1–500 ký tự, +1 `commentCount`, hiện đầu danh sách | R10; ô trống thì nút Gửi bị mờ |
| Thích bình luận | Bấm tim ở bình luận | R6 |
| Xoá bình luận | Chỉ bình luận của mình, −1 `commentCount` | R5 |

- **Lỗi**: video đã tắt bình luận → "Video đã tắt bình luận".
- **API**: `POST/DELETE /api/videos/{id}/like`, `GET/POST /api/videos/{id}/comments`, `DELETE /api/comments/{id}`, `POST/DELETE /api/comments/{id}/like`.
- **Dữ liệu**: VideoLike, Comment, CommentLike, Video.

#### UC12. Theo dõi người dùng
- **Actor**: Người dùng.
- **Luồng chính**: bấm "Follow" → lưu `Follow`, nút đổi thành "Following", cập nhật số followers → tab Friends hiện 2 tab "x followers" / "y following" + "Suggestions for you".
- **Luồng phụ**: bấm "Following" → bỏ theo dõi; bấm X ở một gợi ý → ẩn gợi ý đó, **lưu trên máy chủ** (bảng `suggestion_dismissals`) nên mở lại app hay đổi máy cũng không gợi ý lại.
- **Lỗi**: tự theo dõi chính mình → "Bạn không thể tự theo dõi chính mình".
- **Quy tắc**: R6. Gợi ý lấy lần lượt 3 nhóm, nhóm trước xếp trên: (1) **bạn của bạn** – người mà những người mình đang theo dõi cũng theo dõi, nhiều bạn chung xếp trước; (2) **theo dõi lại** – người đang theo dõi mình mà mình chưa theo dõi lại; (3) **người nổi bật** – nhiều người theo dõi nhất (cho tài khoản mới). Luôn loại: chính mình, người đã theo dõi, người đã bấm X, quản trị viên, tài khoản bị khoá.
- **API**: `POST/DELETE /api/users/{id}/follow`, `GET /api/users/{id}/followers`, `GET /api/users/{id}/following`, `GET /api/users/suggestions`, `POST /api/users/suggestions/{id}/dismiss`.
- **Dữ liệu**: Follow, User, SuggestionDismissal.

### 5.5 Nhóm tin (story)

#### UC17. Đăng story
- **Actor**: Người dùng.
- **Luồng chính**: ô "Đăng tin" ở hàng Stories hoặc chế độ Story ở màn Camera → chọn ảnh / video ≤ `STORY_MAX_DURATION_SEC` → xem trước → "Đăng story" → lưu `Story` với `expiresAt = createdAt + STORY_LIFETIME_HOURS` → avatar của tôi có viền xanh.
- **Luồng phụ**: "Hủy" → không lưu; mở tin của mình → "Xóa".
- **Lỗi** (backend kiểm tra, app hiện câu lỗi trong hộp "Không đăng được"): file không phải jpg / jpeg / png / webp / mp4 / mov / webm; video thiếu độ dài ("Thiếu độ dài video (durationSec)"); video dài hơn `STORY_MAX_DURATION_SEC` ("Video story tối đa 15 giây", số lấy từ thông số); quá dung lượng (R8). Xoá tin của người khác → 403 "Bạn chỉ được xoá story của mình".
- **Quy tắc**: R8, R11. Loại tin (`IMAGE` / `VIDEO`) xác định theo đuôi file; tin ảnh lưu độ dài 0. Tin hết hạn vẫn còn trong DB, chỉ bị lọc khi lấy danh sách.
- **API**: `POST /api/stories` (multipart: `file`, `durationSec` bắt buộc khi là video), `DELETE /api/stories/{id}`.
- **Dữ liệu**: Story (`mediaType` = `IMAGE` / `VIDEO`), SystemSetting.

#### UC18. Xem story
- **Actor**: Người dùng.
- **Luồng chính**: hàng Stories hiện tin còn hạn của **chính mình (luôn đứng đầu)** và của người đang theo dõi; nhóm còn tin chưa xem (viền xanh) xếp trước, rồi theo tin mới nhất → chọn avatar → phát lần lượt các tin toàn màn hình, có thanh tiến trình → ghi `StoryView` → chạm phải / trái sang tin kế / trước → hết tin người này thì sang người tiếp theo.
- **Luồng phụ**: không ai có tin mới → chỉ hiện ô đăng tin; vuốt xuống → đóng.
- **Quy tắc**: R6, R11. Viền chuyển **xám** khi mình đã xem hết tin của người đó. Tin của chính mình luôn tính là đã xem, không ghi lượt xem. Xem tin đã hết hạn → 404 "Story đã hết hạn".
- **API**: `GET /api/stories/feed`, `POST /api/stories/{id}/view`.
- **Dữ liệu**: Story, StoryView, Follow.

### 5.6 Nhóm livestream

#### UC13. Phát livestream
- **Actor**: Người dùng.
- **Điều kiện trước**: có ít nhất một video của mình.
- **Luồng chính**: menu hồ sơ → "Phát livestream" → nhập tiêu đề, sản phẩm, giá, ảnh sản phẩm (tuỳ chọn), chọn video nguồn → "Bắt đầu live" → tạo `LiveStream` (`LIVE`, `startedAt = now`) → mở màn hình live → "Kết thúc" → `ENDED`, `endedAt = now`, báo người xem "Buổi live đã kết thúc".
- **Lỗi**: thiếu tiêu đề; chưa chọn video; chọn video của người khác.
- **Quy tắc**: R12. Mỗi người chỉ có **một** phiên `LIVE` cùng lúc; đang phát mà bấm mở phiên mới → báo "Bạn đang có một buổi live chưa kết thúc" (C6).
- **API**: `POST /api/lives`, `POST /api/lives/{id}/end`.
- **Dữ liệu**: LiveStream, Video.

#### UC14. Xem livestream
- **Actor**: Người dùng.
- **Luồng chính**: chọn live ở mục Streaming → kết nối WebSocket, đăng ký kênh phòng → +1 người xem, phát số mới cho cả phòng → hiện video, số người xem, bình luận gần nhất, thẻ sản phẩm → gửi bình luận / thả cảm xúc → lưu `LiveMessage` và phát cho mọi người.
- **Luồng phụ**: live đã kết thúc → "Buổi live đã kết thúc"; mất kết nối → tự kết nối lại sau 3 giây; thoát → −1 người xem; bấm "Buy now" → báo tính năng sau (R16).
- **Quy tắc**: R12.
- **API + WebSocket**: `GET /api/lives`, `GET /api/lives/{id}`, `GET /api/lives/{id}/messages`; client gửi `/app/live/{id}/join`, `/leave`, `/chat`, `/react`; server phát `/topic/live/{id}` các loại `COMMENT`, `REACTION`, `VIEWERS`.
- **Dữ liệu**: LiveStream, LiveMessage (`type` = `COMMENT` / `REACTION`).

### 5.6b Nhóm thông báo (thêm 02/11/2026)

#### UC20. Thông báo và chia sẻ
- **Actor**: Người dùng.
- **Luồng chính**: có người **thích** hoặc **bình luận** video của mình, **theo dõi** mình, hoặc **chia sẻ** video cho mình → hệ thống tạo một thông báo → nút chuông ở Trang chủ có chấm đỏ đếm số chưa đọc → bấm chuông → màn Thông báo (mới nhất trước, dòng chưa đọc nền hồng nhạt) → mở màn là đánh dấu đã đọc hết → bấm một dòng: có video thì mở Xem video, theo dõi thì mở hồ sơ người đó.
- **Chia sẻ**: ở Xem video bấm "Chia sẻ" → bảng chọn bạn bè (những người mình đang theo dõi, có ô tìm) → chọn tối đa 20 người, viết lời nhắn (không bắt buộc, ≤ 150 ký tự) → "Gửi" → mỗi người nhận một thông báo loại chia sẻ.
- **Luồng phụ**: tự thích / bình luận video của mình → không tạo thông báo; người nhận không xem được video (vd video "Người theo dõi" mà họ chưa theo dõi) → bỏ qua người đó, báo "Đã gửi cho x/y người"; không ai nhận được → 400 "Không gửi được cho ai: người nhận không xem được video này". Sao chép liên kết, Facebook, Instagram → báo tính năng sau (R16).
- **Hiện ngay**: người nhận đang mở app thì thông báo được đẩy qua WebSocket STOMP (`/user/queue/notifications`): số trên chuông tăng ngay và một banner trượt từ trên xuống 4 giây, bấm banner thì mở video / hồ sơ. Không mở app thì lần sau mở màn Thông báo vẫn thấy.
- **Quy tắc**: thông báo chỉ người nhận xem được; xoá video hoặc tài khoản thì thông báo liên quan tự xoá (ON DELETE CASCADE).
- **API**: `GET /api/notifications`, `GET /api/notifications/unread-count`, `PUT /api/notifications/read-all`, `PUT /api/notifications/{id}/read`, `POST /api/videos/{id}/share` (`{userIds, message}`).
- **Dữ liệu**: Notification (`type` = `LIKE` / `COMMENT` / `FOLLOW` / `SHARE`, `recipient`, `actor`, `video`, `text`, `read`).

#### Lịch sử xem và Cài đặt (thêm 02/11/2026)
- **Lịch sử xem**: người đã đăng nhập mở một video (cùng lúc tăng lượt xem) thì hệ thống ghi vào bảng `watch_history`, mỗi người một dòng cho mỗi video, xem lại thì đưa lên đầu. Xem ở tab **"Lịch sử"** của Hồ sơ của tôi hoặc Cài đặt → Lịch sử xem; bấm video thì vuốt tiếp trong đúng danh sách lịch sử; nút "Xoá" xoá toàn bộ (có hỏi xác nhận). Chỉ hiện video còn xem được (đã đăng, không phải riêng tư của người khác). Khách không ghi lịch sử. API `GET /api/videos/me/history`, `DELETE /api/videos/me/history`.
- **Cài đặt**: menu ☰ ở Hồ sơ của tôi → "Cài đặt": Sửa hồ sơ, Lịch sử xem, Video nháp, Thông báo, Đăng xuất; Đổi mật khẩu, Quyền riêng tư, Tài khoản đã chặn, Ngôn ngữ, Giao diện tối → báo tính năng sau (R16).
- Hộp xác nhận (đăng xuất, xoá lịch sử) dùng hộp thoại của trình duyệt khi chạy bản web, vì `Alert` của React Native không hiện trên web.

### 5.7 Nhóm quản trị

#### UC15. Kiểm duyệt video
- **Actor**: Quản trị viên.
- **Luồng chính**: gửi yêu cầu ẩn video → `status = HIDDEN` → video biến khỏi trang chủ, tìm kiếm, hồ sơ.
- **Luồng phụ**: ẩn nhầm → "Hiện lại" → `status = PUBLISHED`, video xuất hiện lại (C4); video đang không bị ẩn → 409.
- **Lỗi**: người gọi không có vai trò `ADMIN` → 403.
- **API**: `PUT /api/admin/videos/{id}/hide`, `PUT /api/admin/videos/{id}/unhide`.
- **Dữ liệu**: Video.

#### UC16. Quản lý người dùng
- **Actor**: Quản trị viên.
- **Luồng chính**: khoá tài khoản → `locked = true`, mọi token của tài khoản bị từ chối; người bị khoá đang mở app **nhận thông báo "Tài khoản của bạn đã bị quản trị viên khóa"** (WebSocket `/user/queue/account`, hoặc lỗi 401 ở lần gọi API kế tiếp), bấm "Đã hiểu" mới bị đăng xuất; mở khoá → `locked = false`.
- **Lỗi**: không phải quản trị viên → 403; khoá tài khoản quản trị → báo lỗi (R15).
- **API**: `PUT /api/admin/users/{id}/lock`, `PUT /api/admin/users/{id}/unlock`.
- **Dữ liệu**: User.

#### UC19. Cấu hình hệ thống
- **Actor**: Quản trị viên.
- **Luồng chính**: xem danh sách thông số (khoá, giá trị, mô tả, lần sửa cuối) → chọn một thông số → nhập giá trị mới → lưu → có hiệu lực ngay cho các thao tác sau đó.
- **Thông số**: `STORY_MAX_DURATION_SEC` (mặc định 15), `STORY_LIFETIME_HOURS` (mặc định 24), `VIDEO_MAX_SIZE_MB` (mặc định 100, không vượt trần 500 MB của `application.yaml`).
- **Lỗi**: không phải quản trị viên → 403; khoá không tồn tại → 404; giá trị không phải số nguyên dương → 400.
- **Quy tắc**: R8, R11, R17. Tin đã đăng giữ nguyên `expiresAt` cũ.
- **API**: `GET /api/admin/settings`, `PUT /api/admin/settings/{key}` (body `{"value": "30"}`); app đọc thông số qua `GET /api/settings` (công khai).
- **Dữ liệu**: SystemSetting (enum `SettingKey`). Dùng sẵn `SystemSettingService.getAll()`, `update(key, value)`.

---

## 6. Trạng thái video, tin, livestream

### 6.1 Trạng thái video (enum `VideoStatus`)

| Trạng thái | Nghĩa | Chuyển từ đâu |
|---|---|---|
| `DRAFT` | Lưu nháp, chỉ tác giả thấy | "Save draft" lúc đăng |
| `PUBLISHED` | Đã đăng, hiện theo chế độ hiển thị | "Post", hoặc "Đăng ngay" từ bản nháp |
| `HIDDEN` | Bị quản trị viên ẩn | Quản trị viên ẩn video |

```
Tạo video ──"Save draft"──▶ DRAFT ──"Đăng ngay"──┐
    └──────"Post"────────────────────────────────────▶ PUBLISHED ──Quản trị viên ẩn──▶ HIDDEN
```

### 6.2 Ai xem được video (enum `Visibility` + `VideoStatus`)

| | Tác giả | Người theo dõi tác giả | Người dùng khác | Khách |
|---|---|---|---|---|
| `PUBLISHED` + `PUBLIC` | ✓ | ✓ | ✓ | ✓ |
| `PUBLISHED` + `FOLLOWERS` | ✓ | ✓ | ✗ | ✗ |
| `PUBLISHED` + `PRIVATE` | ✓ | ✗ | ✗ | ✗ |
| `DRAFT` | ✓ | ✗ | ✗ | ✗ |
| `HIDDEN` | ✗ | ✗ | ✗ | ✗ |

Trending, Browse topic, Tìm kiếm **chỉ lấy** `PUBLISHED` + `PUBLIC`. Feed "Đang theo dõi" lấy `PUBLISHED` + (`PUBLIC` hoặc `FOLLOWERS`) của người mình theo dõi. Lưới "Video của tôi" lấy mọi video `PUBLISHED` của mình; bản nháp xem ở màn Video nháp.

Trường hợp ✗ ở bảng trên, API trả **404** "Video không tồn tại hoặc bạn không có quyền xem" (kể cả tác giả với video `HIDDEN`).

### 6.3 Tin (story)

Không có enum trạng thái. Tin **còn hiệu lực** khi `expiresAt > now`. Hết hạn thì không hiện ở hàng Stories nữa (dữ liệu vẫn còn trong DB).

### 6.4 Phiên live (enum `LiveStatus`) và tin nhắn live (enum `LiveMessageType`)

```
"Bắt đầu live" ──▶ LIVE ──"Kết thúc"──▶ ENDED
```

- Mục Streaming chỉ hiện phiên `LIVE`.
- Số người xem đếm **trong bộ nhớ server**, tăng khi có người `join`, giảm khi `leave` / mất kết nối, phát số mới qua WebSocket; cột `viewerCount` chỉ ghi vào DB khi kết thúc live (C7).
- `LiveMessage.type`: `COMMENT` (nội dung chat) hoặc `REACTION` (mã cảm xúc như `heart`, `like`, `smile`).

---

## 7. Quyết định đã chốt

> Chốt ngày 25/10/2026. Ai code phần nào cũng theo đúng bảng này; muốn đổi thì báo nhóm trưởng để sửa cả file này và Google Docs.

### 7.1 Đặt tên trong code

| # | Nội dung | Đã chốt | Ví dụ |
|---|---|---|---|
| C1 | **Tên field JSON** (DTO request / response) | **Tiếng Anh camelCase**, trùng tên thuộc tính entity. Mobile đặt type TypeScript đúng các tên này | `POST /api/auth/register` gửi `{"username": "lan", "email": "...", "password": "..."}`; video trả `{"id": 1, "title": "...", "likeCount": 12}` |
| C2 | **Tên lớp, thuộc tính, enum, bảng, Service / Controller / Repository, tên hàm** | **Tiếng Anh** (đổi lại ngày 25/10). Bảng DB số nhiều (`users`, `videos`…). Chú thích và câu báo lỗi tiếng Việt | `AuthService.register()`, `login()`; `VideoService.uploadVideo()`; `CommentController`; `UserRepository.findByUsername()` |
| C9 | **Mã use case** | **Giữ nguyên UC01–UC18**, use case mới đánh số nối tiếp (UC19 Cấu hình hệ thống) | |
| C10 | **Tên package** | **Số nhiều giống đồ án WWW** (đổi lại ngày 25/10): `configurations`, `controllers`, `dtos.request`, `dtos.response`, `entities`, `enums`, `exceptions`, `mappers`, `repositories`, `security`, `services`, `utils`. Đã tạo sẵn | `com.vsa.backend.services.VideoService` |

Danh sách Service dự kiến: `AuthService`, `UserService`, `VideoService`, `CommentService`, `FollowService`, `StoryService`, `SearchService`, `CatalogService` (chủ đề, nhạc), `LiveStreamService`, `AdminService`, `FileStorageService`, `SystemSettingService` (đã có).

> Lưu ý Spring Data: tên hàm repository phải ghép **đúng tên thuộc tính** entity, vd `findByUsername`, `existsByEmail`, `findByOwnerIdAndStatus`. Phần `findBy`, `existsBy`, `And`, `OrderBy…Desc` giữ tiếng Anh vì Spring đọc theo từ khoá đó.

### 7.2 Nghiệp vụ

| # | Nội dung | Đã chốt |
|---|---|---|
| C4 | Bỏ ẩn video | **Thêm API** `PUT /api/admin/videos/{id}/unhide` (sau góp ý khi test): video `HIDDEN` → `PUBLISHED` |
| C5 | Mở khoá tài khoản | **Thêm API** `PUT /api/admin/users/{id}/unlock` (đã thêm vào bảng API trên Google Docs) |
| C6 | Một người mở nhiều live | **Chặn**: đang có phiên `LIVE` thì báo lỗi "Bạn đang có một buổi live chưa kết thúc" |
| C7 | Đếm người xem live | **Đếm trong bộ nhớ** (`Map<liveStreamId, viewerCount>` trong `LiveStreamService`), phát số mới qua WebSocket mỗi lần có người vào / ra; ghi `viewerCount` vào DB khi kết thúc live |
| C12 | Thông số không viết cứng | **Chia 3 loại**: (1) quản trị viên chỉnh trên hệ thống → bảng `system_settings`, đọc bằng `SystemSettingService.getInt(SettingKey.X)`; (2) cấu hình kỹ thuật (JWT, định dạng file, cỡ ảnh, số mục mỗi trang) → `application.yaml`, đọc qua `AppProperties`; (3) giới hạn gắn với độ dài cột DB (tên đăng nhập, tiêu đề, bình luận…) → `AppConstants`. **Không viết số trực tiếp trong service** |

### 7.3 Việc cần nhớ khi làm (không cần quyết)

| # | Việc | Khi nào |
|---|---|---|
| C3 | `pom.xml` đã thêm Security, WebSocket, jjwt; `application.yaml` đặt trần multipart 500 MB (giới hạn thật lấy từ `VIDEO_MAX_SIZE_MB`) | **Đã xong** |
| C13 | Màn Camera đang **viết cứng** giới hạn 100 MB khi chọn video từ thư viện. Nên đọc `VIDEO_MAX_SIZE_MB` qua `GET /api/settings` cho đúng R17. Giới hạn 60 giây quay / chọn video là quy định riêng của app | Chưa làm |
| C8 | Xoá video: entity không tự xoá dây chuyền, phải xoá trong service theo thứ tự **lượt thích bình luận → bình luận → lượt thích video → video → file**, bọc trong `@Transactional` | Khi làm UC10 |
| C11 | Tài liệu chính là **Google Docs** "Tài liệu SDLC – Video Sharing App (Đề tài 1) – bản trình bày". Bản Claude Docs cũ không sửa nữa | |

---

## 8. Phân công theo use case

| Thành viên | Use case | Màn hình |
|---|---|---|
| **Phạm Quốc Khánh (NT)** | UC01–03 tài khoản; UC08–10 video; UC17–18 story; ghép code, review PR | Login, Register, Create Video (Upload / Filter / Music / Post), Video nháp, Stories |
| **Huỳnh Hoài Thanh** | UC04 tìm kiếm, UC05 xem video, UC11 tương tác (thích, bình luận), UC13–14 livestream (WebSocket) | Home, Search Video, Video Watching, Comment on Video, Video Streaming |
| **Nguyễn Anh Long** | UC06–07 hồ sơ, UC12 theo dõi, UC15–16, UC19 quản trị | Profile Details, My Profile, Follow, API admin |

**Thứ tự làm** (để lúc nào cũng có bản chạy được):

1. Khánh: UC01–03. UC01–02 là **mẫu đủ 4 tầng** (controller → service → repository → DTO) để cả nhóm làm theo cùng một cách.
2. Thanh: UC05 xem video + trang chủ (có sẵn video mẫu) → UC11 → UC04. Long: UC06–07 hồ sơ → UC12 theo dõi.
3. Khánh: UC08–10 đăng video. Thanh: UC13–14 livestream. Long: UC15–16, UC19 quản trị.
4. Khánh: UC17–18 story. Cả nhóm: test, sửa lỗi, slide.

**Quy ước Git**

- Nhánh `main` luôn chạy được. Mỗi người một nhánh riêng đặt theo tên: `khanh`, `long`, `thanh`.
- Xong một use case → push nhánh của mình → tạo **Pull Request** vào `main` → Khánh xem rồi merge.
- Trước khi làm, đứng ở nhánh của mình chạy `git pull origin main` để lấy code mới nhất của cả nhóm.
- **File dùng chung chỉ Khánh sửa**: `pom.xml`, `application.yaml`, `SecurityConfig`, `WebConfig`, `DataSeeder`, các entity, `App.tsx`, điều hướng mobile. Cần đổi thì nhắn Khánh.
- Mỗi người chỉ tạo / sửa file thuộc use case của mình (controller, service, DTO, màn hình).

**Thế nào là "xong" một use case**

1. API chạy đúng, đã thêm request mẫu vào collection Postman trong `postman/`.
2. Màn hình gọi API thật, hiển thị đúng theo thiết kế.
3. Có test cho service (đường đi chính + ít nhất 1 lỗi).
4. Đã tạo PR và được merge.

---

## 9. Hướng dẫn cho người code

### 9.1 Chạy backend lần đầu

1. `docker compose up -d` (MySQL cổng 3307).
2. IntelliJ → tab Maven → **Reload** → chạy `BackendApplication`.
3. Lần chạy đầu `DataSeeder` tự nạp dữ liệu mẫu và chép video sang `backend/uploads/`.
4. Log có dòng `Thông số hệ thống: …` và `Nạp xong: 5 người dùng, 8 video…` là được.
5. Kiểm tra: `GET http://localhost:8080/api/health`, mở `http://localhost:8080/files/videos/video01.mp4` thấy video.

**Tài khoản mẫu** (mật khẩu đều là `123456`):

| Tên đăng nhập | Vai trò | Ghi chú |
|---|---|---|
| `admin` | ADMIN | Test UC15–16, UC19 |
| `lan` | USER | Theo dõi minh, hoa |
| `minh` | USER | Có nhiều video nhất |
| `hoa` | USER | Đang có 1 phiên live |
| `an` | USER | Theo dõi lan, minh, hoa |

Có sẵn 8 video (1 bản nháp, 1 chỉ người theo dõi xem), 8 chủ đề, 5 bài nhạc, lượt thích, bình luận, 3 tin, 1 phiên live. Tin mẫu hết hạn sau 24 giờ; muốn nạp lại thì xoá database (xem `backend/seed-media/README.md`).

### 9.2 Những thứ đã có sẵn, dùng lại đừng viết lại

| Cần | Dùng | Ví dụ |
|---|---|---|
| Báo lỗi nghiệp vụ | `ApiException` | `throw ApiException.conflict("Tên đăng nhập đã tồn tại");` → JSON 409 |
| Lấy người đang đăng nhập | `SecurityUtils` | `Long currentUserId = SecurityUtils.getCurrentUserId();` (khách → 401) |
| Khách hay đã đăng nhập | `SecurityUtils.getCurrentUserIdOrNull()` | trả `null` nếu là khách |
| Trả danh sách phân trang | `PageResponse.of(page, mapper)` | `PageResponse.of(videoRepository.findAll(pageable), videoMapper::toResponse)` |
| Lưu file upload | `FileStorageService` | `saveVideo(file)`, `saveImage(file, AVATAR_DIR)`, `saveStoryFile(file)`, `delete(url)` |
| Kiểm tra dữ liệu gửi lên | `@Valid` + `@NotBlank`, `@Size`… trên DTO | lỗi tự thành JSON 400 với câu thông báo của bạn. Mẫu: `RegisterRequest` |
| Trả video ra API | `VideoResponse` + `VideoMapper.toResponse(video, liked)` | dùng lại cho trang chủ, chi tiết video, hồ sơ; người đăng nhúng sẵn dạng `UserSummaryResponse` |
| Thông tin rút gọn một người | `UserSummaryResponse`, `UserMapper.toSummary(user)` | người bình luận, người theo dõi, chủ live |
| Code mẫu đủ 4 tầng | UC01–02 | `AuthController` → `AuthService` → `UserRepository`; DTO `RegisterRequest`, `AuthResponse`; `UserMapper`; test `AuthServiceTest`; Postman thư mục "UC01-03 Tài khoản" |
| Chỉ quản trị viên gọi được | đặt đường dẫn dưới `/api/admin/**` | SecurityConfig đã chặn sẵn |
| Thông số quản trị viên chỉnh | `SystemSettingService` | `int hours = systemSettingService.getInt(SettingKey.STORY_LIFETIME_HOURS);` |
| Cấu hình kỹ thuật | `AppProperties` | `appProperties.paging().commentPageSize()` |
| Giới hạn độ dài | `AppConstants` | `@Size(max = AppConstants.COMMENT_MAX)` trên DTO |

Đường dẫn file lưu trong DB có dạng `/files/videos/<uuid>.mp4`. App ghép thêm địa chỉ server: `http://<IP>:8080/files/videos/<uuid>.mp4`.

### 9.3 Mẫu request / response

```http
POST /api/auth/register
{ "username": "lan2", "displayName": "Lan", "email": "lan2@gmail.com",
  "password": "123456", "confirmPassword": "123456" }

→ 201
{ "token": "eyJhbGciOi...", "user": { "id": 6, "username": "lan2", "displayName": "Lan",
  "email": "lan2@gmail.com", "bio": null, "avatarUrl": null, "role": "USER",
  "createdAt": "2026-10-25T14:00:00" } }
```

```http
POST /api/auth/login
{ "usernameOrEmail": "lan", "password": "123456" }      (nhập email cũng được)

→ 200   cùng dạng {token, user} như đăng ký
→ 401   "Tên đăng nhập hoặc mật khẩu không đúng"
→ 403   "Tài khoản đã bị khóa"
```

```http
GET /api/videos/1          (header Authorization: Bearer <token> nếu đã đăng nhập)

→ 200
{ "id": 1, "title": "Du lịch Đà Lạt", "description": "...", "videoUrl": "/files/videos/video01.mp4",
  "thumbnailUrl": "/files/thumbnails/video01.jpg", "filter": "Vintage", "visibility": "PUBLIC",
  "status": "PUBLISHED", "allowComments": true, "viewCount": 8000, "likeCount": 3, "commentCount": 3,
  "liked": false, "createdAt": "2026-10-25T14:00:00",
  "owner": { "id": 3, "username": "minh", "displayName": "Minh Trần", "avatarUrl": null },
  "topic": { "id": 4, "name": "Travel", "icon": "airplane", "color": "#3D7BF7" },
  "audio": { "id": 1, "title": "Chill buổi sáng", "artist": "Lofi VN", "coverUrl": null, "durationSec": 30, "trending": true },
  "hashtags": ["dalat", "dulich"] }
```

```http
POST /api/videos           (multipart/form-data, cần token)
file=<video.mp4>  thumbnail=<anh.jpg>  title=Đà Lạt  hashtags=#dulich #dalat
topicId=4  audioId=1  filter=Vintage  visibility=PUBLIC  allowComments=true  draft=false

→ 201   cùng dạng video như trên
```

```http
GET /api/settings          (công khai, app dùng để kiểm tra trước khi upload)

→ 200
{ "STORY_MAX_DURATION_SEC": 15, "STORY_LIFETIME_HOURS": 24, "VIDEO_MAX_SIZE_MB": 100 }

PUT /api/admin/settings/STORY_MAX_DURATION_SEC      (chỉ ADMIN)
{ "value": "30" }
```

```http
Lỗi bất kỳ → { "status": 409, "message": "Tên đăng nhập đã tồn tại", "timestamp": "2026-10-25T14:00:00" }
```

Quy tắc chung: **không bao giờ trả entity ra API**, luôn đổi sang DTO (tránh lộ `passwordHash` và lỗi vòng lặp quan hệ). Field nào chỉ có ý nghĩa với người đang xem (vd `liked`, `following`) thì tính trong service.
