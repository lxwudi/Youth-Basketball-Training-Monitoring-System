import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';

type TabItem = {
  key: string;
  label: string;
  path: string;
  icon: ReactNode;
  accent?: boolean;
};

type RoleTabsLayoutProps = {
  tabs: TabItem[];
  activeKey: string;
  children: ReactNode;
  title: string;
  subtitle?: string;
};

export function RoleTabsLayout({ tabs, activeKey, children, title, subtitle }: RoleTabsLayoutProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  
  return (
    <div className="relative flex min-h-screen flex-col bg-slate-50 pb-24 dark:bg-slate-950 md:pb-4">
      <header className="sticky top-0 z-20 flex flex-col gap-1 border-b border-slate-200 bg-white/80 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
          {subtitle ? <p className="text-xs text-slate-500 dark:text-slate-300">{subtitle}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-2 md:flex">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                to={tab.path}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-all',
                  activeKey === tab.key
                    ? 'bg-brand text-white shadow-brand'
                    : 'text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                )}
              >
                <span className="h-4 w-4">{tab.icon}</span>
                {tab.label}
              </Link>
            ))}
          </nav>
          <Button aria-label="退出登录" onClick={handleLogout} variant="outline" size="sm" className="rounded-full">
            退出登录
          </Button>
        </div>
      </header>
      <main className="flex-1 px-4 pb-8 pt-6 md:px-8 md:pt-8">{children}</main>
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex h-20 items-center justify-around border-t border-slate-200 bg-white/90 px-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 md:hidden">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            to={tab.path}
            className={cn(
              'flex flex-col items-center gap-1 text-xs transition-colors',
              activeKey === tab.key ? 'text-brand' : 'text-slate-400 hover:text-brand',
            )}
          >
            <span className="h-5 w-5">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
