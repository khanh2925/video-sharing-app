/**
 * Khai báo mọi màn hình và tham số (params) của nó — giống RootStackParamList ở Buổi 4.
 * Thêm màn mới hoặc đổi params: sửa ở đây trước, rồi sửa RootNavigator.
 *
 * Trong màn hình:
 *   export default function DraftsScreen({ navigation, route }: RootScreenProps<'Drafts'>) { ... }
 *   navigation.navigate('Watch', { videoId: 5 });
 * Component con không nhận props navigation thì dùng:  const navigation = useNavigation();
 */
import type { NavigatorScreenParams, CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { Audio, MediaType } from '../types/models';

/**
 * Màn Xem video lấy danh sách video từ đâu để vuốt tiếp, tuỳ chỗ mở:
 *   Trang chủ → trending · Tìm kiếm → search · Hồ sơ → user (tab Video) / liked (tab Đã thích)
 *   Tab "Đang theo dõi" ở đầu màn → following (video của người mình theo dõi, cần đăng nhập)
 */
export type WatchSource =
  | { kind: 'trending' }
  | { kind: 'following' }
  | { kind: 'topic'; topicId: number }
  | { kind: 'search'; q: string }
  | { kind: 'user'; userId: number }
  | { kind: 'liked'; userId: number }
  | { kind: 'audio'; audioId: number };

/** Các tab kết quả trong màn Tìm kiếm */
export type SearchTab = 'video' | 'user' | 'live' | 'audio';

/** 5 tab dưới đáy. Tab "Create" chỉ là nút +, bấm vào mở màn Camera. */
export type MainTabParamList = {
  Home: undefined;
  /** q: từ khoá, tab: tab kết quả mở sẵn, nonce: Date.now() để mở lại cùng từ khoá vẫn tìm lại */
  Search: { q?: string; tab?: SearchTab; nonce?: number } | undefined;
  Create: undefined;
  Friends: undefined;
  MyProfile: undefined;
};

export type RootStackParamList = {
  // Luôn có, kể cả khách (R3). Login/Register mở dạng modal, đăng nhập xong thì goBack().
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Login: undefined;
  Register: undefined;

  // Xem (khách xem được)
  /**
   * source: danh sách để vuốt lên/xuống sang video kế (UC05). Không truyền thì chỉ xem 1 video.
   * Không có videoId: bắt đầu từ video đầu tiên của source (dùng khi bấm tab "Đang theo dõi").
   */
  Watch: { videoId?: number; source?: WatchSource };
  /** allowComments = false: tác giả tắt bình luận → ẩn ô viết */
  Comments: { videoId: number; allowComments?: boolean };
  Profile: { userId: number };
  StoryView: { ownerId: number };
  LiveWatch: { liveId: number };
  /** Màn Âm thanh: thông tin bài nhạc + các video đang dùng bài đó */
  Audio: { audioId: number };

  // Cần đăng nhập (mở qua useRequireAuth)
  EditProfile: undefined;
  Notifications: undefined;
  /**
   * audio: do màn Music gửi về (popTo kèm merge: true)
   * durationSec: độ dài video lấy từ ImagePicker (nếu có), để không phải chờ trình phát báo
   */
  StoryCreate: { uri: string; mediaType: MediaType; audio?: Audio; durationSec?: number };
  MyStory: undefined;
  /** filter, audio: do màn Filter / Music gửi về (popTo kèm merge: true, giống Lab 06 bài 1 nhưng dùng popTo) */
  Camera: { filter?: string; audio?: Audio } | undefined;
  Filter: { videoUri?: string; current?: string } | undefined;
  Music: { current?: number } | undefined;
  PostVideo: { videoUri?: string; filter?: string; audio?: Audio } | undefined;
  Drafts: undefined;
  MyVideo: { videoId: number };
  EditVideo: { videoId: number };
  GoLive: undefined;
  LiveHost: { liveId: number };
};

/** Props cho màn nằm trong Stack */
export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

/** Props cho màn nằm trong Tab (vẫn navigate được sang mọi màn của Stack) */
export type TabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

// Cho useNavigation() biết danh sách màn → gõ navigate('...') có gợi ý và báo lỗi sai tên
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
