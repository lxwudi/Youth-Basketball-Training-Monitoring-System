import { useNavigate } from 'react-router-dom';
import { Activity, Shield, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const TRAINING_TYPES = [
  {
    id: 'dribbling',
    title: '运球训练',
    description: '分析运球频率、重心控制、关节角度等指标',
    icon: Activity,
    themeClass: 'is-dribble',
    path: '/coach/training/dribbling',
  },
  {
    id: 'shooting',
    title: '投篮训练',
    description: '分析投篮姿态、出手角度、身体协调性等指标',
    icon: Target,
    themeClass: 'is-shoot',
    path: '/coach/training/shooting',
  },
  {
    id: 'defense',
    title: '防守训练',
    description: '分析防守姿态、重心稳定性、肢体展开程度等指标',
    icon: Shield,
    themeClass: 'is-defense',
    path: '/coach/training/defense',
  },
];

export function TrainingSelection() {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 标题区域 - 渐变文字 */}
      <div className="space-y-3">
        <h1 className="text-4xl font-bold gradient-text-vibrant">训练分析系统</h1>
        <p className="text-lg text-slate-600 dark:text-slate-400">选择训练类型开始智能视频分析</p>
      </div>

      {/* 训练类型卡片网格 */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {TRAINING_TYPES.map((type, index) => {
          const Icon = type.icon;
          return (
            <Card
              key={type.id}
              className="glass-card cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-2 border-transparent hover:border-neon-cyan group animate-slide-up card-3d relative overflow-hidden"
              onClick={() => navigate(type.path)}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* 背景装饰 */}
              <div className="absolute top-0 right-0 h-32 w-32 bg-gradient-to-br from-neon-purple/10 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
              
              <CardHeader className="relative z-10">
                {/* 图标容器 - 霓虹效果 */}
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-neon-cyan via-neon-purple to-neon-pink flex items-center justify-center mb-5 text-white shadow-lg shadow-neon-purple/50 group-hover:shadow-neon-cyan transition-all duration-300 animate-glow-pulse">
                  <Icon className="w-10 h-10" />
                </div>
                <CardTitle className="text-2xl font-bold gradient-text mb-2">{type.title}</CardTitle>
                <CardDescription className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                  {type.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10">
                <Button 
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-neon-purple to-neon-cyan text-white font-semibold shadow-lg hover:shadow-neon-purple transition-all duration-300 hover:scale-105"
                  variant="outline"
                >
                  <span className="flex items-center gap-2">
                    进入分析
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Button>
              </CardContent>

              {/* 悬浮光晕 */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-cyan-500/5 to-pink-500/5 opacity-0 transition-opacity group-hover:opacity-100" />
            </Card>
          );
        })}
      </div>

      {/* 使用说明卡片 - 玻璃态 + 渐变 */}
      <Card className="glass-card relative overflow-hidden animate-slide-up">
        {/* 装饰背景 */}
        <div className="absolute top-0 left-0 h-full w-2 bg-gradient-to-b from-neon-cyan via-neon-purple to-neon-pink" />
        
        <CardHeader className="pl-6">
          <CardTitle className="text-2xl gradient-text flex items-center gap-3">
            <svg className="h-6 w-6 text-neon-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            使用说明
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm pl-6">
          {[
            '选择您要分析的训练类型（运球、投篮或防守）',
            '上传训练视频文件（支持MP4、AVI、MOV等格式）',
            '系统将自动识别姿态并生成带骨架标注的视频',
            '播放视频时，相关指标将实时显示在右侧面板'
          ].map((text, index) => (
            <div key={index} className="flex items-start gap-4 animate-slide-up" style={{ animationDelay: `${(index + 3) * 100}ms` }}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple text-white flex items-center justify-center flex-shrink-0 font-bold shadow-lg shadow-neon-purple/30">
                {index + 1}
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-7 pt-0.5">{text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
