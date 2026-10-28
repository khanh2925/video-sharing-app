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

/** 5 tab dưới đáy. Tab "Create" chỉ là nút +, bấm vào mở màn Camera. */
export type MainTabParamList = {
  Home: undefined;
  Search: { q?: string } | undefined;
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
  Watch: { videoId: number };
  Comments: { videoId: number };
  Profile: { userId: number };
  StoryView: { ownerId: number };
  LiveWatch: { liveId: number };

  // Cần đăng nhập (mở qua useRequireAuth)
  EditProfile: undefined;
  StoryCreate: { uri: string; mediaType: MediaType };
  MyStory: undefined;
  /** filter, audio: do màn Filter / Music gửi về (navigate kèm merge: true, giống Lab 06 bài 1) */
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
