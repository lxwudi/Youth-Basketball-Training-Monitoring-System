// import { Cross2Icon } from '@radix-ui/react-icons';
import * as React from 'react';
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from './toast-primitives';
import { cn } from '@/lib/utils';

type ToastProps = React.ComponentProps<typeof Toast>;

type ToastActionElement = React.ReactNode;

const ToastAction = ({ className, ...props }: React.ComponentProps<typeof ToastClose>) => (
  <ToastClose
    className={cn(
      'inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800',
      className,
    )}
    toast-close=""
    {...props}
  />
);
ToastAction.displayName = ToastClose.displayName;

export { ToastAction, ToastProvider, ToastViewport, Toast, ToastTitle, ToastDescription };
export type { ToastProps, ToastActionElement };
