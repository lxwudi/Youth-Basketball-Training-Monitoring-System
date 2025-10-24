import { useEffect, type ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import CoachTabs from '@/pages/CoachTabs';
import LoginPage from '@/pages/Login';
import ParentTabs from '@/pages/ParentTabs';
import { useAuthStore } from '@/store/auth';
import type { UserRole } from '@/types';

const ROLE_DEFAULT_PATH: Record<UserRole, string> = {
  parent: '/parent/basketball',
  coach: '/coach/training',
};

function ProtectedRoute({ allowRoles, children }: { allowRoles: UserRole[]; children: ReactElement }) {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!allowRoles.includes(user.role)) {
    return <Navigate to={ROLE_DEFAULT_PATH[user.role]} replace />;
  }
  return children;
}

function AuthInitializer({ children }: { children: ReactElement }) {
  const initialize = useAuthStore((state) => state.initialize);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 overflow-hidden">
        {/* 动态背景 */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/3 left-1/3 h-96 w-96 rounded-full bg-neon-purple/40 blur-3xl animate-glow-pulse" />
          <div className="absolute bottom-1/3 right-1/3 h-96 w-96 rounded-full bg-neon-cyan/40 blur-3xl animate-glow-pulse" />
        </div>

        {/* 加载动画 */}
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-4 border-slate-200/30 dark:border-slate-700/30" />
          <div className="absolute inset-0 h-20 w-20 animate-spin rounded-full border-4 border-transparent border-t-neon-cyan border-r-neon-purple" />
          <div className="absolute inset-2 h-16 w-16 rounded-full bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 animate-glow-pulse" />
        </div>

        {/* 加载文字 */}
        <div className="text-center space-y-2">
          <p className="text-base font-semibold gradient-text animate-glow-pulse">
            智能加载体态监测数据
          </p>
          <div className="flex items-center justify-center gap-1">
            <span className="h-2 w-2 rounded-full bg-neon-cyan animate-bounce" />
            <span className="h-2 w-2 rounded-full bg-neon-purple animate-bounce" style={{ animationDelay: '0.1s' }} />
            <span className="h-2 w-2 rounded-full bg-neon-pink animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      </div>
    );
  }

  return children;
}

function RedirectByRole() {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_DEFAULT_PATH[user.role]} replace />;
}

export default function App() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  return (
    <AuthInitializer>
      <Routes location={location}>
        <Route path="/login" element={user ? <Navigate to={ROLE_DEFAULT_PATH[user.role]} replace /> : <LoginPage />} />
        <Route
          path="/parent/*"
          element={
            <ProtectedRoute allowRoles={['parent']}>
              <ParentTabs />
            </ProtectedRoute>
          }
        />

        <Route
          path="/coach/*"
          element={
            <ProtectedRoute allowRoles={['coach']}>
              <CoachTabs />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<RedirectByRole />} />
        <Route path="*" element={<Navigate to={user ? ROLE_DEFAULT_PATH[user.role] : '/login'} replace />} />
      </Routes>
    </AuthInitializer>
  );
}
