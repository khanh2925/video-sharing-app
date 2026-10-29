/** Xử lý đường dẫn file (video, ảnh) giữa app và backend. */
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
