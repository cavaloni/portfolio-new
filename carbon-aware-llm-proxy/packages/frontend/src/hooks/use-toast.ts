'use client';

import { toast as sonnerToast } from 'sonner';

type Toast = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
};

function useToast() {
  const toast = ({
    title,
    description,
    variant = 'default',
  }: Toast) => {
    const toastOptions = {
      className: `toast-${variant}`,
    };

    switch (variant) {
      case 'destructive':
        return sonnerToast.error(title, {
          ...toastOptions,
          description,
        });
      case 'success':
        return sonnerToast.success(title, {
          ...toastOptions,
          description,
        });
      case 'warning':
        return sonnerToast.warning(title, {
          ...toastOptions,
          description,
        });
      case 'info':
        return sonnerToast.info(title, {
          ...toastOptions,
          description,
        });
      default:
        return sonnerToast(title, {
          ...toastOptions,
          description,
        });
    }
  };

  return {
    toast,
    dismiss: sonnerToast.dismiss,
  };
}

export { useToast };

// Export toast function for direct use
const toast = (props: Toast) => {
  const { toast } = useToast();
  return toast(props);
};

export { toast };
