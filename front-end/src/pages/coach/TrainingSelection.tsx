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
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50 hover:bg-blue-100',
    path: '/coach/training/dribbling',
  },
  {
    id: 'shooting',
    title: '投篮训练',
    description: '分析投篮姿态、出手角度、身体协调性等指标',
    icon: Target,
    color: 'from-orange-500 to-red-500',
    bgColor: 'bg-orange-50 hover:bg-orange-100',
    path: '/coach/training/shooting',
  },
  {
    id: 'defense',
    title: '防守训练',
    description: '分析防守姿态、重心稳定性、肢体展开程度等指标',
    icon: Shield,
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-50 hover:bg-green-100',
    path: '/coach/training/defense',
  },
];

export function TrainingSelection() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-800 mb-2">训练分析系统</h1>
        <p className="text-slate-600">选择训练类型开始视频分析</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {TRAINING_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <Card
              key={type.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${type.bgColor} border-2`}
              onClick={() => navigate(type.path)}
            >
              <CardHeader>
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${type.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl">{type.title}</CardTitle>
                <CardDescription className="text-sm">
                  {type.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  进入分析
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="bg-gradient-to-r from-slate-50 to-slate-100">
        <CardHeader>
          <CardTitle>使用说明</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              1
            </div>
            <p>选择您要分析的训练类型（运球、投篮或防守）</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              2
            </div>
            <p>上传训练视频文件（支持MP4、AVI、MOV等格式）</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              3
            </div>
            <p>系统将自动识别姿态并生成带骨架标注的视频</p>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center flex-shrink-0 mt-0.5">
              4
            </div>
            <p>播放视频时，相关指标将实时显示在右侧面板</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
