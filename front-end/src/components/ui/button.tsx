import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ring-offset-background',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-r from-neon-purple to-neon-cyan text-white shadow-lg shadow-neon-purple/50 hover:shadow-neon-cyan hover:scale-105',
        outline: 'border-2 border-slate-300/50 bg-white hover:bg-slate-50 hover:border-neon-cyan hover:shadow-neon-cyan dark:border-slate-700/50 dark:bg-slate-900 dark:hover:bg-slate-800 dark:hover:border-neon-purple',
        subtle: 'bg-gradient-to-r from-slate-100 to-slate-200 text-slate-900 hover:from-slate-200 hover:to-slate-300 dark:from-slate-800 dark:to-slate-900 dark:text-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-800 border border-slate-300/50 dark:border-slate-600/50',
        ghost: 'hover:bg-gradient-to-r hover:from-neon-purple/10 hover:to-neon-cyan/10 hover:text-neon-purple dark:hover:from-neon-cyan/10 dark:hover:to-neon-purple/10 dark:hover:text-neon-cyan',
        destructive: 'bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600 shadow-lg shadow-red-500/30',
      },
      size: {
        default: 'h-11 px-5 rounded-xl',
        sm: 'h-9 rounded-lg px-4',
        lg: 'h-12 rounded-2xl px-6 text-base',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
