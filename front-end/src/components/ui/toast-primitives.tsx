'use client';

import * as React from 'react';
import * as ToastPrimitives from '@radix-ui/react-toast';
import { cn } from '@/lib/utils';

type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';

const toastVariantStyles: Record<ToastVariant, string> = {
  default:
    'border-slate-200 bg-white text-slate-900 shadow-lg dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100',
  destructive:
    'border-red-500/40 bg-red-950/80 text-red-100 shadow-[0_10px_30px_rgba(248,113,113,0.4)] dark:border-red-400/30',
  success:
    'border-emerald-400/40 bg-emerald-950/80 text-emerald-100 shadow-[0_10px_30px_rgba(16,185,129,0.35)] dark:border-emerald-300/30',
  warning:
    'border-amber-400/40 bg-amber-950/80 text-amber-100 shadow-[0_10px_30px_rgba(251,191,36,0.35)] dark:border-amber-300/30',
  info:
    'border-sky-400/40 bg-sky-950/80 text-sky-100 shadow-[0_10px_30px_rgba(56,189,248,0.35)] dark:border-sky-300/30',
};

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Viewport>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>>(
  ({ className, ...props }, ref) => (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
        'fixed top-0 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-3 p-4 sm:top-auto sm:left-auto sm:right-6 sm:bottom-6 sm:translate-x-0',
        className,
      )}
      {...props}
    />
  ),
);
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & { variant?: ToastVariant }
>(
  ({ className, variant = 'default', ...props }, ref) => (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        'group pointer-events-auto relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-2xl border p-4 pr-6 transition-all hover:border-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand u-surface-light dark:u-surface-dark',
        toastVariantStyles[variant],
        className,
      )}
      data-variant={variant}
      {...props}
    />
  ),
);
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastTitle = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Title>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>>(
  ({ className, ...props }, ref) => (
    <ToastPrimitives.Title ref={ref} className={cn('text-sm font-semibold', className)} {...props} />
  ),
);
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Description>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>>(
  ({ className, ...props }, ref) => (
    <ToastPrimitives.Description ref={ref} className={cn('text-sm text-slate-500 dark:text-slate-400', className)} {...props} />
  ),
);
ToastDescription.displayName = ToastPrimitives.Description.displayName;

const ToastClose = ToastPrimitives.Close;

export type { ToastVariant };
export { ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription, ToastClose };
