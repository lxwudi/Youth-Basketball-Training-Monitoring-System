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
    <div className={cn('grid gap-4 md:grid-cols-2', className)}>
      {angles.map((angle) => {
        const isNormal = angle.reverse ? angle.value <= angle.threshold : angle.value >= angle.threshold;
        return (
          <Card key={angle.id} className={cn('border-none bg-slate-100/80 dark:bg-slate-900/80', !isNormal && 'ring-1 ring-accent/50')}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{angle.label}</CardTitle>
              <Badge variant={isNormal ? 'success' : 'danger'}>{isNormal ? '规范' : '需优化'}</Badge>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-slate-600 dark:text-slate-300">
              <div>
                <p className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
                  {angle.value.toFixed(1)} {angle.unit ?? '°'}
                </p>
                <p className="mt-1 text-xs opacity-70">阈值 {angle.threshold.toFixed(1)} {angle.unit ?? '°'}</p>
              </div>
              {angle.description ? <p className="max-w-[12rem] text-right text-xs leading-5 opacity-80">{angle.description}</p> : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
