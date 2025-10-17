import * as React from 'react';
import type { ToastActionElement, ToastProps } from './toast';

type ToasterToast = ToastProps & {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
};

type Toast = Omit<ToasterToast, 'id'>;

type ToastState = {
  toasts: ToasterToast[];
};

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 1000;

const listeners: Array<(state: ToastState) => void> = [];
let memoryState: ToastState = { toasts: [] };

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

type Action =
  | { type: 'ADD_TOAST'; toast: ToasterToast }
  | { type: 'UPDATE_TOAST'; toast: Partial<ToasterToast> }
  | { type: 'DISMISS_TOAST'; toastId?: ToasterToast['id'] }
  | { type: 'REMOVE_TOAST'; toastId?: ToasterToast['id'] };

function reducer(state: ToastState, action: Action): ToastState {
  switch (action.type) {
    case 'ADD_TOAST': {
      const toasts = [action.toast, ...state.toasts].slice(0, TOAST_LIMIT);
      return { ...state, toasts };
    }
    case 'UPDATE_TOAST': {
      return {
        ...state,
        toasts: state.toasts.map((toast) =>
          toast.id === action.toast.id ? { ...toast, ...action.toast } : toast,
        ),
      };
    }
    case 'DISMISS_TOAST': {
      const { toasts } = state;

      if (action.toastId) {
        queueRemoval(action.toastId);
      } else {
        toasts.forEach((toast) => queueRemoval(toast.id));
      }

      return {
        ...state,
        toasts: toasts.map((toast) =>
          toast.id === action.toastId || action.toastId === undefined
            ? { ...toast, open: false }
            : toast,
        ),
      };
    }
    case 'REMOVE_TOAST': {
      if (action.toastId === undefined) {
        return { ...state, toasts: [] };
      }
      return {
        ...state,
        toasts: state.toasts.filter((toast) => toast.id !== action.toastId),
      };
    }
  }
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

function queueRemoval(toastId: string) {
  if (toastTimeouts.has(toastId)) return;

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({ type: 'REMOVE_TOAST', toastId });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
}

function useToast() {
  const [state, setState] = React.useState<ToastState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    ...state,
    toast: ({ ...props }: Toast) => {
      const id = crypto.randomUUID();
      const update = (toast: Partial<ToasterToast>) =>
        dispatch({ type: 'UPDATE_TOAST', toast: { ...toast, id } });
      const dismiss = () => dispatch({ type: 'DISMISS_TOAST', toastId: id });

      const open = props.open ?? true;
      dispatch({ type: 'ADD_TOAST', toast: { ...props, id, open } });

      return {
        id,
        dismiss,
        update,
      };
    },
    dismiss: (toastId?: string) => dispatch({ type: 'DISMISS_TOAST', toastId }),
  };
}

export { useToast };
export type { Toast, ToasterToast };

// 清空所有 Toast：用于退出登录或切换角色时，避免跨页面残留提示
export function clearAllToasts() {
  // 取消所有待移除的定时器
  toastTimeouts.forEach((timeout) => clearTimeout(timeout));
  toastTimeouts.clear();
  // 直接移除全部 toast
  dispatch({ type: 'REMOVE_TOAST' });
}
