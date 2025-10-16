import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport, ToastAction } from '@/components/ui/toast';
import { useToast } from '@/components/ui/use-toast';

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider>
      {toasts.map((toast) => {
        const { id, title, description, action, ...props } = toast;
        return (
          <Toast
            key={id}
            open={props.open}
            onOpenChange={(open) => {
              // 当 Radix 触发关闭时，同步状态管理中的 open=false
              if (!open) dismiss(id);
            }}
            {...props}
          >
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action ?? (
              <ToastAction
                aria-label="关闭提示"
                className="ml-2 rounded-full px-3 py-1 text-xs"
                onClick={() => dismiss(id)}
              >
                ×
              </ToastAction>
            )}
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
