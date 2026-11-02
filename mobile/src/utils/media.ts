/** Xử lý đường dẫn file (video, ảnh) giữa app và backend. */
import { Platform } from 'react-native';
import { API_URL } from '../constants/config';

/**
 * Backend lưu đường dẫn tương đối "/files/videos/abc.mp4".
 * Muốn hiện lên <Image> / <VideoView> thì phải ghép thêm địa chỉ máy chủ.
 *   <Image source={{ uri: mediaUrl(video.thumbnailUrl) }} />
 */
export function mediaUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (path.startsWith('http') || path.startsWith('file:')) return path;
  return `${API_URL}${path}`;
}

/** Đoán kiểu file theo đuôi, dùng khi image-picker không trả mimeType */
function guessMimeType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mp4': return 'video/mp4';
    case 'mov': return 'video/quicktime';
    case 'webm': return 'video/webm';
    case 'png': return 'image/png';
    case 'webp': return 'image/webp';
    default: return 'image/jpeg';
  }
}

/**
 * Tạo "file" để append vào FormData khi upload (React Native gửi file theo kiểu {uri, name, type}).
 *   const form = new FormData();
 *   form.append('file', fileFromUri(asset.uri, asset.mimeType));
 *   form.append('title', title);
 *   await postMultipart<Video>('/videos', form);
 */
export function fileFromUri(uri: string, mimeType?: string | null) {
  const name = uri.split('/').pop() ?? 'upload';
  // React Native chấp nhận object này trong FormData; kiểu TS mặc định chỉ biết Blob nên ép kiểu
  return { uri, name, type: mimeType ?? guessMimeType(uri) } as unknown as Blob;
}

const EXT_BY_TYPE: Record<string, string> = {
  'video/mp4': 'mp4', 'video/quicktime': 'mov', 'video/webm': 'webm',
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
};

/**
 * Chuẩn bị file trước khi append vào FormData. Gọi ở các hàm api upload (videos, stories, avatar).
 * - Điện thoại: giữ nguyên object {uri, name, type} của fileFromUri.
 * - Web: trình duyệt chỉ nhận Blob/File thật (object {uri...} bị đổi thành chữ "[object Object]"
 *   và upload hỏng) → tải file từ uri (blob:/data:) thành File, đặt tên có đuôi đúng
 *   để backend nhận diện định dạng (mp4, mov, webm, jpg...).
 */
export async function toFormFile(file: Blob): Promise<Blob> {
  if (Platform.OS !== 'web' || file instanceof Blob) return file;
  const { uri, name, type } = file as unknown as { uri: string; name: string; type: string };
  const blob = await (await fetch(uri)).blob();
  const realType = blob.type || type;
  const ext = EXT_BY_TYPE[realType];
  const fileName = /\.[a-z0-9]{2,4}$/i.test(name) ? name : `upload.${ext ?? 'bin'}`;
  return new File([blob], fileName, { type: realType });
}
