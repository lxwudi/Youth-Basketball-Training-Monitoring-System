import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type Angle = {
  id: string;
  label: string;
  value: number;
  unit?: string;
  threshold: number;
  description?: string;
  reverse?: boolean;
};

type AnglePanelProps = {
  angles: Angle[];
  className?: string;
};

export function AnglePanel({ angles, className }: AnglePanelProps) {
  return (
    <div className={cn('grid gap-5 md:grid-cols-2', className)}>
      {angles.map((angle, index) => {
        const isNormal = angle.reverse ? angle.value <= angle.threshold : angle.value >= angle.threshold;
        return (
          <Card 
            key={angle.id} 
            className={cn(
              'glass-card relative overflow-hidden group animate-slide-up hover-lift',
              !isNormal && 'border-2 border-orange-500/40 neon-border-cyan'
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* 装饰背景 */}
            <div className={cn(
              "absolute top-0 right-0 h-24 w-24 rounded-bl-full opacity-30 transition-opacity group-hover:opacity-50",
              isNormal ? "bg-gradient-to-br from-green-500/20 to-transparent" : "bg-gradient-to-br from-orange-500/20 to-transparent"
            )} />
            
            <CardHeader className="flex flex-row items-center justify-between pb-4 relative z-10">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shadow-lg",
                  isNormal 
                    ? "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/50" 
                    : "bg-gradient-to-br from-orange-500 to-red-500 shadow-orange-500/50 animate-glow-pulse"
                )}>
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    {isNormal ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    )}
                  </svg>
                </div>
                <CardTitle className="text-lg font-bold gradient-text">{angle.label}</CardTitle>
              </div>
              <Badge 
                variant={isNormal ? 'success' : 'danger'}
                className={cn(
                  "px-3 py-1 text-xs font-semibold",
                  isNormal 
                    ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30" 
                    : "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/30"
                )}
              >
                {isNormal ? '✓ 规范' : '⚠ 需优化'}
              </Badge>
            </CardHeader>
            
            <CardContent className="flex items-start justify-between pt-2 relative z-10">
              <div className="space-y-2">
                <p className="text-4xl font-bold gradient-text">
                  {angle.value.toFixed(1)}
                  <span className="text-xl ml-1 text-slate-500 dark:text-slate-400">{angle.unit ?? '°'}</span>
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <span className="inline-block h-1 w-1 rounded-full bg-neon-cyan" />
                  阈值 {angle.threshold.toFixed(1)} {angle.unit ?? '°'}
                </p>
              </div>
              {angle.description ? (
                <div className="max-w-[14rem] text-right">
                  <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
                    {angle.description}
                  </p>
                </div>
              ) : null}
            </CardContent>

            {/* 底部装饰线 */}
            <div className={cn(
              "absolute bottom-0 left-0 right-0 h-1 opacity-50 group-hover:opacity-100 transition-opacity",
              isNormal 
                ? "bg-gradient-to-r from-green-500 via-emerald-500 to-green-500" 
                : "bg-gradient-to-r from-orange-500 via-red-500 to-orange-500"
            )} />
          </Card>
        );
      })}
    </div>
  );
}
