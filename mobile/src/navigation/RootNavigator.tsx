/**
 * Điều hướng gốc, chế độ khách kiểu TikTok (R3):
 * - Mở app luôn vào MainTabs, khách xem được Trang chủ, Tìm kiếm, video, hồ sơ.
 * - Login / Register là màn modal trượt từ dưới lên, mở từ bảng "Đăng nhập để tiếp tục".
 * - Màn cần đăng nhập vẫn khai báo ở đây; chỗ mở chúng phải bọc trong useRequireAuth().
 * - Đang đăng nhập mà bị đăng xuất (bấm Đăng xuất, hoặc token hết hạn → 401) thì đưa về MainTabs,
 *   tránh kẹt lại ở màn cần đăng nhập (Đăng video, Video nháp...).
 */
import { useContext, useEffect, useRef } from 'react';
import { NavigationContainerRefContext } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { LoginPromptProvider } from '../context/LoginPromptContext';
import { NotificationProvider } from '../context/NotificationContext';
import { Loading } from '../components';
import type { RootStackParamList } from './types';
import MainTabs from './MainTabs';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import WatchScreen from '../screens/video/WatchScreen';
import CommentsScreen from '../screens/video/CommentsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import StoryViewScreen from '../screens/story/StoryViewScreen';
import StoryCreateScreen from '../screens/story/StoryCreateScreen';
import MyStoryScreen from '../screens/story/MyStoryScreen';
import CameraScreen from '../screens/create/CameraScreen';
import FilterScreen from '../screens/create/FilterScreen';
import MusicScreen from '../screens/create/MusicScreen';
import PostVideoScreen from '../screens/create/PostVideoScreen';
import DraftsScreen from '../screens/create/DraftsScreen';
import MyVideoScreen from '../screens/create/MyVideoScreen';
import EditVideoScreen from '../screens/create/EditVideoScreen';
import GoLiveScreen from '../screens/live/GoLiveScreen';
import LiveHostScreen from '../screens/live/LiveHostScreen';
import LiveWatchScreen from '../screens/live/LiveWatchScreen';
import AudioScreen from '../screens/audio/AudioScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminVideosScreen from '../screens/admin/AdminVideosScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import WatchHistoryScreen from '../screens/settings/WatchHistoryScreen';
import ChatbotScreen from '../screens/ai/ChatbotScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { user, isBootstrapping } = useAuth();
  const rootNav = useContext(NavigationContainerRefContext);

  // user từ có → null: xoá hết các màn đang mở, về lại MainTabs
  const wasLoggedIn = useRef(false);
  useEffect(() => {
    if (wasLoggedIn.current && !user && rootNav?.isReady()) {
      rootNav.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
    }
    wasLoggedIn.current = !!user;
  }, [user, rootNav]);

  if (isBootstrapping) {
    return <Loading />;
  }

  return (
    <LoginPromptProvider>
      <NotificationProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="Watch" component={WatchScreen} />
        <Stack.Screen name="Comments" component={CommentsScreen} options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="StoryView" component={StoryViewScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="LiveWatch" component={LiveWatchScreen} />
        <Stack.Screen name="Audio" component={AudioScreen} />

        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
        <Stack.Screen name="AdminVideos" component={AdminVideosScreen} />
        <Stack.Screen name="AdminUsers" component={AdminUsersScreen} />
        <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
        <Stack.Screen name="WatchHistory" component={WatchHistoryScreen} />
        <Stack.Screen name="Chatbot" component={ChatbotScreen} />
        <Stack.Screen name="StoryCreate" component={StoryCreateScreen} />
        <Stack.Screen name="MyStory" component={MyStoryScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Camera" component={CameraScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Filter" component={FilterScreen} options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Music" component={MusicScreen} options={{ presentation: 'transparentModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="PostVideo" component={PostVideoScreen} />
        <Stack.Screen name="Drafts" component={DraftsScreen} />
        <Stack.Screen name="MyVideo" component={MyVideoScreen} />
        <Stack.Screen name="EditVideo" component={EditVideoScreen} />
        <Stack.Screen name="GoLive" component={GoLiveScreen} />
        <Stack.Screen name="LiveHost" component={LiveHostScreen} options={{ gestureEnabled: false }} />

        <Stack.Group screenOptions={{ presentation: 'modal', animation: 'slide_from_bottom' }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
        </Stack.Group>
      </Stack.Navigator>
      </NotificationProvider>
    </LoginPromptProvider>
  );
}
