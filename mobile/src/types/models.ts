/**
 * Kiểu dữ liệu khớp với DTO response bên backend (dtos/response/*.java).
 * Backend thêm/đổi field nào thì sửa ở đây cho khớp.
 * Ngày giờ backend trả dạng chuỗi "2026-10-25T10:30:00".
 */
export type Role = 'USER' | 'ADMIN';
export type Visibility = 'PUBLIC' | 'FOLLOWERS' | 'PRIVATE';
export type VideoStatus = 'DRAFT' | 'PUBLISHED' | 'HIDDEN';
export type MediaType = 'IMAGE' | 'VIDEO';

/** UserSummaryResponse — thông tin rút gọn, dùng trong danh sách. */
export interface UserSummary {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

/** AuthUserResponse — người đang đăng nhập. */
export interface AuthUser extends UserSummary {
  email: string;
  bio: string | null;
  role: Role;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface Topic {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
}

export interface Audio {
  id: number;
  title: string;
  artist: string;
  coverUrl: string | null;
  /** file nhạc "/files/audios/audio01.mp3", phát bằng useBackgroundMusic() */
  fileUrl: string | null;
  durationSec: number;
  trending: boolean;
}

export interface Video {
  id: number;
  title: string;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  filter: string | null;
  visibility: Visibility;
  status: VideoStatus;
  allowComments: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  liked: boolean;
  createdAt: string;
  owner: UserSummary;
  topic: Topic | null;
  audio: Audio | null;
  hashtags: string[];
}

export interface Story {
  id: number;
  mediaUrl: string;
  mediaType: MediaType;
  durationSec: number;
  createdAt: string;
  expiresAt: string;
  viewed: boolean;
  /** nhạc nền chọn khi đăng story, null nếu không có */
  audio: Audio | null;
}

/** Story gom theo từng người (GET /api/stories/feed). */
export interface StoryGroup {
  owner: UserSummary;
  mine: boolean;
  allViewed: boolean;
  stories: Story[];
}

/** PageResponse<T> — mọi API có phân trang đều trả dạng này. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

/** ErrorResponse — body backend trả khi lỗi (400, 401, 403, 404...). */
export interface ApiErrorBody {
  status: number;
  message: string;
  timestamp: string;
}

/** UserProfileResponse — hồ sơ công khai (GET /api/users/{id}). */
export interface UserProfile extends UserSummary {
  bio: string | null;
  followingCount: number;
  followerCount: number;
  likeCount: number;
  /** người đang xem có theo dõi họ không */
  following: boolean;
  /** đây là hồ sơ của chính mình */
  me: boolean;
}

/** CommentResponse — một bình luận. */
export interface Comment {
  id: number;
  content: string;
  likeCount: number;
  liked: boolean;
  createdAt: string;
  user: UserSummary;
}

/** Kiểu tìm kiếm, khớp tham số ?type= của GET /api/search */
export type SearchType = 'videos' | 'trending' | 'accounts' | 'streaming' | 'audio';

/** SearchResponse — giống PageResponse nhưng content tuỳ theo type. */
export interface SearchResponse<T> extends PageResponse<T> {
  type: SearchType;
}

export type LiveStatus = 'LIVE' | 'ENDED';
export type LiveMessageType = 'COMMENT' | 'REACTION';

/** LiveStreamResponse — một buổi livestream. */
export interface LiveStream {
  id: number;
  title: string;
  sourceVideoUrl: string;
  thumbnailUrl: string | null;
  status: LiveStatus;
  viewerCount: number;
  productName: string | null;
  productPrice: number;
  productImageUrl: string | null;
  startedAt: string;
  endedAt: string | null;
  host: UserSummary;
}

/** LiveMessageResponse — tin nhắn chat hoặc thả tim trong live. */
export interface LiveMessage {
  id: number;
  type: LiveMessageType;
  content: string;
  createdAt: string;
  sender: UserSummary;
}

/** Sự kiện backend đẩy qua WebSocket ở /topic/live/{id} */
export interface LiveSocketEvent {
  event: 'COMMENT' | 'REACTION' | 'VIEWERS' | 'ENDED';
  viewerCount: number | null;
  message: LiveMessage | null;
  live: LiveStream | null;
}

/**
 * FollowUserResponse — một người trong danh sách theo dõi / gợi ý / tìm kiếm tài khoản (UC12).
 * Cờ tính theo người đang xem: following + followsMe → "Bạn bè"; chỉ following → "Đang theo dõi";
 * chỉ followsMe → "Theo dõi lại"; không cờ nào → "Theo dõi". me = chính mình (ẩn nút).
 */
export interface FollowUser extends UserSummary {
  followerCount: number;
  following: boolean;
  followsMe: boolean;
  me: boolean;
}
