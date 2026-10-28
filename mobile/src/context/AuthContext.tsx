/**
 * Giữ thông tin "ai đang đăng nhập" cho cả app (giống AuthContext ở Buổi 8).
 *
 * Dùng trong màn hình:
 *   const { user, login, register, logout, updateUser } = useAuth();
 *
 * - Token lưu trong expo-secure-store → tắt app mở lại vẫn còn đăng nhập.
 * - Mở app: có token cũ thì gọi /auth/me để lấy lại user; token hỏng thì xoá.
 * - user khác null là đã đăng nhập → RootNavigator tự chuyển sang MainTabs.
 */
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi, LoginBody, RegisterBody } from '../api/auth';
import { setAuthToken, setOnUnauthorized } from '../api/client';
import type { AuthResponse, AuthUser } from '../types/models';

const TOKEN_KEY = 'vsa_token';

interface AuthContextValue {
  user: AuthUser | null;
  /** true trong lúc mở app đang kiểm tra token cũ */
  isBootstrapping: boolean;
  login: (body: LoginBody) => Promise<void>;
  register: (body: RegisterBody) => Promise<void>;
  logout: () => Promise<void>;
  /** Gọi sau khi sửa hồ sơ để cập nhật user mới mà không cần đăng nhập lại */
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const logout = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }, []);

  // Mở app: thử đăng nhập lại bằng token đã lưu
  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
    });
    (async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          setUser(await authApi.me());
        }
      } catch {
        await logout();
      } finally {
        setIsBootstrapping(false);
      }
    })();
    return () => setOnUnauthorized(null);
  }, [logout]);

  const saveSession = async (res: AuthResponse) => {
    await SecureStore.setItemAsync(TOKEN_KEY, res.token);
    setAuthToken(res.token);
    setUser(res.user);
  };

  // Lỗi (sai mật khẩu, trùng username...) được ném ra ngoài để màn hình tự bắt và hiện
  const login = useCallback(async (body: LoginBody) => {
    await saveSession(await authApi.login(body));
  }, []);

  const register = useCallback(async (body: RegisterBody) => {
    await saveSession(await authApi.register(body));
  }, []);

  const value = useMemo(
    () => ({ user, isBootstrapping, login, register, logout, updateUser: setUser }),
    [user, isBootstrapping, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() phải nằm trong <AuthProvider>');
  }
  return ctx;
}
