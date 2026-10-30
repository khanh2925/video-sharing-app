# Phần Thanh — giao diện và tích hợp API

Triển khai theo tab **Thanh** trong [hướng dẫn project mẫu](../../video-sharing-app_Full/docs/HuongDanCode_Mobile.html) và các [ảnh thiết kế](../thaygui/video_sharing_app_screens/).

| Mục | Mã nguồn | Chức năng |
|---|---|---|
| 03 Trang chủ | [HomeScreen](../mobile/src/screens/home/HomeScreen.tsx) | Khách/đăng nhập, story, trending, chủ đề, live, âm thanh, kéo làm mới |
| 04 Tìm kiếm | [SearchScreen](../mobile/src/screens/search/SearchScreen.tsx) | Debounce 400 ms, bốn tab, hashtag, phân trang, theo dõi tài khoản |
| 05 Xem video | [WatchScreen](../mobile/src/screens/video/WatchScreen.tsx) | Vuốt dọc, sáu nguồn feed, nhạc nền, đếm lượt xem, thích, theo dõi |
| 06 Bình luận | [CommentsScreen](../mobile/src/screens/video/CommentsScreen.tsx) | Modal, phân trang, gửi/xoá/thích, ẩn ô nhập khi tắt bình luận |
| File phụ | [LiveParts](../mobile/src/screens/live/LiveParts.tsx) | Video phát lặp, tim bay Reanimated, chat, thông báo kết nối |
| 19 Phát livestream | [GoLiveScreen](../mobile/src/screens/live/GoLiveScreen.tsx) | Chọn video công khai của mình, tiêu đề, sản phẩm ghim, xử lý live cũ |
| 23 Đang phát live | [LiveHostScreen](../mobile/src/screens/live/LiveHostScreen.tsx) | Chat STOMP, người xem, thời gian, xác nhận kết thúc, tổng kết |
| 18 Xem live | [LiveWatchScreen](../mobile/src/screens/live/LiveWatchScreen.tsx) | Chat, tim, theo dõi, sản phẩm ghim, thông báo kết thúc |

Backend UC04/05/11/13/14 và chính sách quyền xem đã có sẵn; giao diện gọi qua lớp API hiện có. Live theo R12 là phát lặp video nguồn, không truyền camera trực tiếp. Các nút chia sẻ/mua hàng/thông báo vẫn báo tính năng ở phiên bản sau theo R16.

Nhánh `Thanh` đã cập nhật `origin/main` ngày 30/10/2026, nhận các màn đăng nhập, đăng ký và tạo/quản lý video do Khánh hoàn thiện. Các file này không thuộc phần thay đổi trong PR của Thanh. Màn hồ sơ và story thuộc phần khác vẫn giữ hiện trạng; các liên kết từ phần Thanh đã nối tới đúng route.

## Chạy và kiểm tra

1. Khởi động MySQL và backend theo [README](../README.md), sử dụng **JDK 21**.
2. Đặt `EXPO_PUBLIC_API_URL` trong cấu hình môi trường mobile thành địa chỉ máy chạy backend mà điện thoại truy cập được.
3. Trong thư mục mobile: `npm install`, sau đó `npm start`. Mở bằng Expo Go trên điện thoại cùng mạng.
4. Tài khoản mẫu: `lan`, `minh`, `hoa`, `an`; mật khẩu `123456` khi backend có dữ liệu seed.
5. Sau đăng nhập: Trang chủ → **Phát livestream** để mở màn chuẩn bị, không cần đi qua màn tạo video của phần khác.

Các lệnh kiểm tra mobile: `npm run typecheck`, `npm run lint`, `npm test`.

Kiểm tra backend phần Thanh (trong thư mục backend):

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21.0.12'
.\mvnw.cmd -B '-Dtest=VideoServiceTest,InteractionServiceTest,SearchServiceTest,LiveStreamServiceTest,CoreUtilityTest' test
```

## Kiểm tra trực tiếp trên thiết bị

- Khách mở Trang chủ/Tìm kiếm/Xem video; bấm thích hoặc gửi bình luận phải được mời đăng nhập.
- Đăng nhập, kéo làm mới Trang chủ; chọn chủ đề và kiểm tra nguồn feed.
- Gõ nhanh rồi đổi liên tục bốn tab tìm kiếm: kết quả cũ không được ghi đè tab mới.
- Vuốt video: chỉ video đang hiện phát; mở bình luận/hồ sơ hoặc đưa app ra nền thì video và nhạc dừng.
- Thích video/bình luận và theo dõi tài khoản; khi API lỗi giao diện trả về trạng thái cũ.
- Thêm/xoá bình luận rồi cuộn tải tiếp: tổng số cập nhật, không lặp/bỏ sót vì dịch trang.
- Chọn video công khai của mình để phát live; video riêng tư/nháp không được dùng làm nguồn.
- Dùng hai tài khoản trên hai thiết bị: kiểm tra chat, tim, số người xem và rời phòng.
- Ngắt mạng rồi gửi chat: giữ nguyên nội dung để gửi lại khi kết nối phục hồi.
- Chủ phòng kết thúc: người xem nhận màn kết thúc, chủ phòng có bảng tổng kết.

## Kết quả kiểm tra tự động

- TypeScript: đạt.
- ESLint phần Thanh và các file hỗ trợ thay đổi: không có lỗi. Sau khi cập nhật `origin/main`, lint toàn project phát hiện 10 lỗi ở các màn `CameraScreen`, `EditVideoScreen`, `MyVideoScreen`, `PostVideoScreen` của Khánh cùng 5 cảnh báo ở mã nền. Giữ nguyên các file thuộc người khác để nhóm trưởng/người phụ trách xử lý.
- Mobile: 7 test đạt (ghép lịch sử chat, chống trùng, STOMP join/chat/react/leave, lỗi máy chủ và kết nối lại).
- Backend: 29 test đạt trong năm lớp test của phần Thanh nêu trên.
- Expo export Android: đóng gói thành công.

Các kiểm thử tự động không thay thế kiểm tra video, bàn phím và WebSocket trên thiết bị thật. Chưa chạy kiểm tra trực tiếp bằng hai thiết bị trong phiên này.

## Quy trình Git và phần cần nhóm trưởng rà soát

- Làm việc trên nhánh `Thanh` hiện có; lấy mã nền từ `origin/main` sau khi phần khung đã vào main.
- Chia commit theo phần dùng chung, Trang chủ/Tìm kiếm, Xem video/Bình luận, Livestream và kiểm thử/tài liệu.
- Các thay đổi dùng chung đã được tạo ở lượt triển khai trước: chống phản hồi REST cũ trong `useFetch`/`usePagedList`, hook theo dõi trạng thái ứng dụng, helper ghép lịch sử chat và cấu hình ESLint/test. Tách riêng để nhóm trưởng rà soát; chưa coi là được duyệt chỉ vì đã có trong nhánh.
- Đưa nhánh lên GitHub bằng PR nháp từ `Thanh` vào `main`, nhờ `khanh2925` review phần dùng chung trước khi merge. Không tự merge vào `main`.
- Không đưa cấu hình môi trường cá nhân, thư viện cài sẵn hay sản phẩm đóng gói vào commit.
