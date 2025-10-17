import { create } from 'zustand';
import { clearAllToasts } from '@/components/ui/use-toast';
import type { AuthUser, UserRole } from '@/types';

type Credentials = {
  username: string;
  password: string;
  role: UserRole;
  name: string;
};

const DEMO_ACCOUNTS: Credentials[] = [
  { username: 'parent001', password: '123456', role: 'parent', name: '陈晨家长' },
  { username: 'coach001', password: '123456', role: 'coach', name: '张衡教练' },
];

type AuthState = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  initialize: () => void;
};

const STORAGE_KEY = 'posture-demo-user';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  async login(username, password) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    const credential = DEMO_ACCOUNTS.find((item) => item.username === username);
    if (!credential || credential.password !== password) {
      return { success: false, message: '账号或密码不正确' };
    }
    const user: AuthUser = {
      id: credential.username,
      name: credential.name,
      role: credential.role,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));

    set({ user });
    return { success: true };
  },
  logout() {
    window.localStorage.removeItem(STORAGE_KEY);
    clearAllToasts();
    set({ user: null });
  },
  initialize() {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AuthUser;
        set({ user: parsed, isLoading: false });
        return;
      } catch (error) {
        console.warn('Failed to parse cached auth user', error);
      }
    }
    set({ user: null, isLoading: false });
  },
}));
