import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-600 transition-colors dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-brand/10 text-brand',
        success: 'border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
        warning: 'border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        danger: 'border-transparent bg-accent/20 text-accent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
