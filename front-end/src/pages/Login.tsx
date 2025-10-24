import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/store/auth';
import { useTheme } from '@/components/theme-provider';
import type { UserRole } from '@/types';

const DEMO_ACCOUNTS: Array<{ username: string; password: string; role: UserRole; name: string; description: string }> = [
  {
    username: 'parent001',
    password: '123456',
    role: 'parent',
    name: '家长体验账号',
    description: '查看篮球动作矫正与成长档案',
  },
  {
    username: 'coach001',
    password: '123456',
    role: 'coach',
    name: '教练体验账号',
    description: '训练监测、球队档案与计划消息',
  },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const [username, setUsername] = useState('parent001');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      const redirect = user.role === 'parent' ? '/parent/basketball' : '/coach/training';
      navigate(redirect, { replace: true });
    }
  }, [user, navigate]);

  // 激活动效：滚动到 Hero 区域后显示下方指示箭头
  useEffect(() => {
    const node = heroRef.current;
    if (!node) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) node.classList.add('is-activated');
      else node.classList.remove('is-activated');
    }, { threshold: 0.2 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await login(username, password);
    setLoading(false);
    if (!result.success) {
      setError(result.message ?? '登录失败，请检查账号密码');
      return;
    }
    const matched = DEMO_ACCOUNTS.find((item) => item.username === username);
    if (matched) {
      const redirect = matched.role === 'parent' ? '/parent/basketball' : '/coach/training';
      navigate(redirect, { replace: true });
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      {/* 动态背景光效 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-96 w-96 rounded-full bg-neon-purple/30 blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-neon-cyan/30 blur-3xl animate-glow-pulse animation-delay-1000" />
        <div className="absolute top-1/2 left-1/2 h-64 w-64 rounded-full bg-neon-pink/20 blur-3xl animate-float" />
      </div>

      <div className="grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.2fr,1fr] animate-fade-in">
        {/* 左侧Hero区域 */}
        <div className="hero-aurora space-y-8" data-keep ref={heroRef}>
          <div className="space-y-6 text-slate-700 dark:text-slate-200">
            {/* 顶部标签 - 霓虹效果 */}
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-500/20 via-cyan-500/20 to-pink-500/20 px-5 py-2.5 backdrop-blur-sm border border-purple-500/30 neon-border-purple">
              <span className="h-2 w-2 rounded-full bg-neon-cyan animate-glow-pulse" />
              <span className="text-sm font-medium gradient-text">青少年篮球动作矫正平台</span>
            </div>

            {/* 主标题 - 渐变文字 */}
            <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
              <span className="gradient-text-vibrant animate-slide-up">
                多角色协同的
              </span>
              <br />
              <span className="gradient-text animate-slide-up">
                篮球动作矫正系统
              </span>
            </h1>

            {/* 描述文字 */}
            <p className="text-base leading-7 text-slate-600 dark:text-slate-300 animate-slide-up">
              专注青少年篮球专项训练的综合平台。结合动作分析示例数据、趋势分析与 PDF 报告导出，
              <span className="gradient-text font-semibold">帮助家长与教练实时掌握训练情况</span>。
            </p>

            {/* 快速体验卡片 - 玻璃态 + 霓虹边框 */}
            <div className="glass-card p-6 scan-line animate-scale-in">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan shadow-neon-cyan" />
                快速体验
              </h2>
              <div className="grid gap-3">
                {DEMO_ACCOUNTS.map((account, index) => (
                  <button
                    key={account.username}
                    type="button"
                    onClick={() => {
                      setUsername(account.username);
                      setPassword(account.password);
                    }}
                    className="card-3d group relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-slate-50/80 to-slate-100/60 dark:from-slate-800/80 dark:to-slate-900/60 px-5 py-4 text-left backdrop-blur-sm transition-all duration-300 hover:border-neon-cyan hover:shadow-neon-cyan shimmer-effect"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="relative z-10">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
                            {account.name}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                            账号 <span className="font-mono text-neon-cyan">{account.username}</span> · 
                            密码 <span className="font-mono text-neon-purple">{account.password}</span>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500">
                            {account.description}
                          </p>
                        </div>
                        <span className="ml-3 mt-1 text-xs font-medium text-neon-cyan opacity-0 transition-opacity group-hover:opacity-100">
                          一键填充 →
                        </span>
                      </div>
                    </div>
                    {/* 悬浮光晕 */}
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-pink-500/10 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                ))}
              </div>
            </div>

            <div className="hero-scroll-indicator" aria-hidden="true" />
          </div>
        </div>

        {/* 右侧登录卡片 - 增强玻璃态 */}
        <Card className="glass-card shadow-2xl shadow-purple-500/20 neon-border animate-scale-in">
          <CardHeader className="space-y-3 pb-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-neon-purple to-neon-cyan flex items-center justify-center shadow-neon-purple">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <CardTitle className="text-xl font-bold gradient-text">登录控制台</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  支持家长 / 教师 / 教练角色
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <Label htmlFor="username" className="text-sm font-medium">账号</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="请输入账号"
                  className="h-12 rounded-xl border-slate-300/50 bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-700/50 focus:border-neon-cyan focus:ring-neon-cyan transition-all"
                  required
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-medium">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                  className="h-12 rounded-xl border-slate-300/50 bg-slate-50/50 dark:bg-slate-900/50 dark:border-slate-700/50 focus:border-neon-purple focus:ring-neon-purple transition-all"
                  required
                />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-100/80 to-slate-50/60 dark:from-slate-800/80 dark:to-slate-900/60 p-4 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">深色模式</span>
                <div className="flex items-center gap-3">
                  <Switch 
                    checked={theme === 'dark'} 
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-neon-purple data-[state=checked]:to-neon-cyan"
                  />
                  <span className="text-sm font-medium gradient-text">
                    {theme === 'dark' ? '已开启' : '未开启'}
                  </span>
                </div>
              </div>
              {error ? (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 px-4 py-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                </div>
              ) : null}
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-pink text-white font-semibold shadow-lg hover:shadow-neon-purple transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed animate-gradient-x"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    登录中...
                  </span>
                ) : '立即登录'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
