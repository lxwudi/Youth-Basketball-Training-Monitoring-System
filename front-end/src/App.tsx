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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-600 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-brand" aria-hidden />
        <p className="text-sm tracking-wide text-slate-500">智能加载体态监测数据...</p>
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
