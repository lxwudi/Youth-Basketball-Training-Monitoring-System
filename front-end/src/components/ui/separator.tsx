import type { ForwardedRef, HTMLAttributes } from 'react';
import * as React from 'react';
import { cn } from '@/lib/utils';

type SeparatorProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
};

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => {
    const isHorizontal = orientation === 'horizontal';
    return (
      <div
        ref={ref as ForwardedRef<HTMLDivElement>}
        role={decorative ? 'none' : 'separator'}
        data-orientation={orientation}
        className={cn(
          'bg-slate-200 dark:bg-slate-800',
          isHorizontal ? 'h-px w-full' : 'h-full w-px',
          className,
        )}
        {...props}
      />
    );
  },
);
Separator.displayName = 'Separator';

export { Separator };
