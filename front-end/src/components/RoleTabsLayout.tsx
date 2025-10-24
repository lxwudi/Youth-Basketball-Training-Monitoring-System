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
    <div className="relative flex min-h-screen flex-col pb-24 md:pb-4">
      {/* 顶部导航栏 - 玻璃态 + 霓虹效果 */}
      <header className="sticky top-0 z-20 glass-card border-b-2 border-neon-cyan/20 px-6 py-5 backdrop-blur-2xl animate-slide-up">
        {/* 顶部装饰线 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink" />
        
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold gradient-text-vibrant flex items-center gap-3">
              {title}
              <span className="h-2 w-2 rounded-full bg-neon-cyan animate-glow-pulse shadow-neon-cyan" />
            </h1>
            {subtitle ? (
              <p className="text-sm text-slate-600 dark:text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          
          <div className="flex items-center gap-3">
            {/* 桌面端导航 */}
            <nav className="hidden items-center gap-2 md:flex">
              {tabs.map((tab, index) => (
                <Link
                  key={tab.key}
                  to={tab.path}
                  className={cn(
                    'group relative flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all duration-300',
                    activeKey === tab.key
                      ? 'bg-gradient-to-r from-neon-purple to-neon-cyan text-white shadow-lg shadow-neon-purple/50'
                      : 'text-slate-600 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-slate-800/80',
                  )}
                  style={activeKey !== tab.key ? { animationDelay: `${index * 50}ms` } : undefined}
                >
                  <span className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    activeKey === tab.key ? "scale-110" : "group-hover:scale-110"
                  )}>
                    {tab.icon}
                  </span>
                  {tab.label}
                  {activeKey === tab.key && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-neon-cyan to-neon-pink rounded-full" />
                  )}
                </Link>
              ))}
            </nav>
            
            {/* 退出按钮 - 霓虹边框 */}
            <Button 
              aria-label="退出登录" 
              onClick={handleLogout} 
              variant="outline" 
              size="sm" 
              className="rounded-xl border-2 border-slate-300/50 hover:border-neon-pink hover:shadow-neon-pink dark:border-slate-700/50 transition-all duration-300"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              退出登录
            </Button>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <main className="flex-1 px-6 pb-10 pt-8 md:px-10 md:pt-10">
        {children}
      </main>

      {/* 移动端底部导航 - 玻璃态 + 霓虹 */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 glass-card border-t-2 border-neon-purple/20 backdrop-blur-2xl md:hidden">
        {/* 顶部装饰线 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-pink" />
        
        <div className="flex h-20 items-center justify-around px-4">
          {tabs.map((tab) => (
            <Link
              key={tab.key}
              to={tab.path}
              className={cn(
                'group flex flex-col items-center gap-2 text-xs font-medium transition-all duration-300',
                activeKey === tab.key 
                  ? 'text-neon-cyan scale-110' 
                  : 'text-slate-500 hover:text-neon-purple dark:text-slate-400',
              )}
            >
              <span className={cn(
                "relative h-6 w-6 transition-transform duration-300",
                activeKey === tab.key && "animate-glow-pulse"
              )}>
                {tab.icon}
                {activeKey === tab.key && (
                  <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-neon-cyan shadow-neon-cyan" />
                )}
              </span>
              <span className={activeKey === tab.key ? 'gradient-text font-semibold' : ''}>
                {tab.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  )
}
