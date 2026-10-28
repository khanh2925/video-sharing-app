/**
 * Thanh tab dưới đáy: Trang chủ · Tìm kiếm · (+) · Bạn bè · Hồ sơ.
 * Nút (+) không có màn riêng: bấm vào thì mở màn Camera (nằm ở Stack, che cả tab bar).
 * Khách: tab Hồ sơ vẫn mở được (MyProfileScreen tự hiện màn "Đăng ký tài khoản").
 */
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts } from '../constants/theme';
import { useRequireAuth } from '../context/LoginPromptContext';
import type { MainTabParamList } from './types';
import HomeScreen from '../screens/home/HomeScreen';
import SearchScreen from '../screens/search/SearchScreen';
import FriendsScreen from '../screens/profile/FriendsScreen';
import MyProfileScreen from '../screens/profile/MyProfileScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = keyof typeof Ionicons.glyphMap;
const icons: Record<Exclude<keyof MainTabParamList, 'Create'>, [IconName, IconName]> = {
  Home: ['home', 'home-outline'],
  Search: ['search', 'search-outline'],
  Friends: ['people', 'people-outline'],
  MyProfile: ['person', 'person-outline'],
};

function EmptyScreen() {
  return null;
}

export default function MainTabs() {
  const rootNavigation = useNavigation(); // điều hướng của Stack ngoài (có màn Camera)
  const requireAuth = useRequireAuth();   // khách bấm + hoặc Bạn bè → bảng đăng nhập
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarStyle: { borderTopColor: colors.border },
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'Create') {
            return (
              <View style={styles.createBtn}>
                <Ionicons name="add" size={26} color={colors.white} />
              </View>
            );
          }
          const [on, off] = icons[route.name];
          return <Ionicons name={focused ? on : off} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Trang chủ' }} />
      <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Tìm kiếm' }} />
      <Tab.Screen
        name="Create"
        component={EmptyScreen}
        options={{ tabBarShowLabel: false, tabBarAccessibilityLabel: 'Tạo video' }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault(); // không chuyển sang tab trống
            requireAuth(() => rootNavigation.navigate('Camera'));
          },
        }}
      />
      <Tab.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ title: 'Bạn bè' }}
        listeners={{
          tabPress: (e) => {
            // Khách bấm tab Bạn bè → hiện bảng đăng nhập, ở lại tab cũ
            if (!requireAuth()) e.preventDefault();
          },
        }}
      />
      <Tab.Screen name="MyProfile" component={MyProfileScreen} options={{ title: 'Hồ sơ' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  createBtn: { width: 52, height: 36, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
});
