import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (user) {
      const redirect = user.role === 'parent' ? '/parent/basketball' : '/coach/training';
      navigate(redirect, { replace: true });
    }
  }, [user, navigate]);

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-slate-200/40 to-white px-4 py-10 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr,1fr]">
        <div className="space-y-6 text-slate-700 dark:text-slate-200">
          <p className="rounded-full bg-white/70 px-4 py-2 text-xs font-medium tracking-wider text-brand shadow-sm shadow-brand/20 dark:bg-slate-900/80">青少年篮球动作矫正平台</p>
          <h1 className="text-3xl font-bold leading-tight text-slate-900 dark:text-slate-50">
            多角色协同的篮球动作矫正系统
          </h1>
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            专注青少年篮球专项训练的综合平台。结合动作分析示例数据、趋势分析与 PDF 报告导出，帮助家长与教练实时掌握训练情况。
          </p>
          <div className="rounded-3xl bg-white/80 p-6 shadow-brand dark:bg-slate-900/70">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">快速体验</h2>
            <div className="mt-4 grid gap-3">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => {
                    setUsername(account.username);
                    setPassword(account.password);
                  }}
                  className="group flex items-start justify-between rounded-2xl border border-transparent bg-slate-100/80 px-4 py-3 text-left shadow-sm transition-all hover:border-brand hover:shadow-brand dark:bg-slate-800/70"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{account.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-300">账号 {account.username} · 密码 {account.password}</p>
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-400">{account.description}</p>
                  </div>
                  <span className="mt-1 text-xs text-brand opacity-0 transition-opacity group-hover:opacity-100">一键填充</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <Card className="border-none bg-white/90 shadow-2xl shadow-brand/20 dark:bg-slate-900/80">
          <CardHeader className="space-y-2">
            <CardTitle className="text-lg text-slate-900 dark:text-slate-100">登录控制台</CardTitle>
            <p className="text-xs text-slate-500 dark:text-slate-300">支持家长 / 教师 / 教练角色，进入后将自动跳转对应界面</p>
          </CardHeader>
          <CardContent>
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="username">账号</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="请输入账号"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="请输入密码"
                  required
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-100/80 p-3 text-xs text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
                <span>深色模式</span>
                <div className="flex items-center gap-2">
                  <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
                  <span>{theme === 'dark' ? '已开启' : '未开启'}</span>
                </div>
              </div>
              {error ? <p className="text-xs text-accent">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? '登录中...' : '立即登录'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
