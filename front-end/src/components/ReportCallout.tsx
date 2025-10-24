import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const ACCENT_ICON_STYLES: Record<string, string> = {
  orange: 'bg-gradient-to-br from-orange-500 to-amber-500 shadow-orange-500/40',
  purple: 'bg-gradient-to-br from-neon-purple to-neon-pink shadow-neon-purple/40',
  cyan: 'bg-gradient-to-br from-neon-cyan to-neon-purple shadow-neon-cyan/40',
  lime: 'bg-gradient-to-br from-emerald-500 to-lime-400 shadow-emerald-500/40',
};

const ACCENT_STRIPES: Record<string, string> = {
  orange: 'from-orange-400/60 via-amber-400/50 to-orange-400/60',
  purple: 'from-neon-purple/60 via-neon-pink/50 to-neon-purple/60',
  cyan: 'from-neon-cyan/60 via-neon-purple/50 to-neon-cyan/60',
  lime: 'from-emerald-400/60 via-lime-300/50 to-emerald-400/60',
};

export type ReportCalloutProps = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  accent?: 'orange' | 'purple' | 'cyan' | 'lime';
  className?: string;
};

export function ReportCallout({
  icon,
  title,
  description,
  meta,
  actions,
  accent = 'purple',
  className,
}: ReportCalloutProps) {
  const iconContainer = ACCENT_ICON_STYLES[accent] ?? ACCENT_ICON_STYLES.purple;
  const accentStripe = ACCENT_STRIPES[accent] ?? ACCENT_STRIPES.purple;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/75 p-5 shadow-sm backdrop-blur dark:border-slate-800/60 dark:bg-slate-900/70',
        'flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:flex-nowrap',
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        {icon ? (
          <div
            className={cn(
              'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300',
              iconContainer,
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className="space-y-1 text-slate-600 dark:text-slate-300">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-100">{title}</p>
          {description ? <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</div> : null}
          {meta ? <div className="text-xs text-slate-500 dark:text-slate-400">{meta}</div> : null}
        </div>
      </div>
  {actions ? <div className="flex-shrink-0 sm:w-full sm:flex sm:justify-start lg:w-auto lg:flex-none">{actions}</div> : null}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-1 w-full bg-gradient-to-r opacity-70',
          accentStripe,
        )}
      />
    </div>
  );
}
