# Dữ liệu mẫu (seed media)

`DataSeeder` đọc thư mục này khi backend chạy lần đầu (DB còn trống) và chép file sang `uploads/`.

- `videos/videoNN.mp4` – video mẫu (dọc 540x960, vài giây). Muốn video đẹp hơn thì thay bằng clip thật
  (10–20 giây, 720p, mỗi file vài MB, lấy ở Pexels / Pixabay), **giữ nguyên tên file**.
- `thumbnails/videoNN.jpg` – ảnh bìa tương ứng (không bắt buộc).

Muốn nạp lại dữ liệu mẫu từ đầu: xoá database rồi chạy lại backend
(`docker exec -it vsa-mysql mysql -uroot -proot -e "DROP DATABASE video_sharing; CREATE DATABASE video_sharing;"`).
