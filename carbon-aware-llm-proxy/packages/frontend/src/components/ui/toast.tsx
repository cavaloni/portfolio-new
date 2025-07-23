"use client";

import {
  toast as sonnerToast,
  Toaster as SonnerToaster,
  type ExternalToast,
  type ToastT as ToastPrimitive,
  type ToasterProps,
} from "sonner";

type ToastVariant = "default" | "destructive" | "success" | "warning" | "info";

type ToastOptions = Omit<ExternalToast, "description"> & {
  description?: string | React.ReactNode;
  variant?: ToastVariant;
};

interface ToastFunction {
  (message: string, options?: ToastOptions): string | number;
  success: (
    message: string,
    options?: Omit<ToastOptions, "variant">,
  ) => string | number;
  error: (
    message: string,
    options?: Omit<ToastOptions, "variant">,
  ) => string | number;
  warning: (
    message: string,
    options?: Omit<ToastOptions, "variant">,
  ) => string | number;
  info: (
    message: string,
    options?: Omit<ToastOptions, "variant">,
  ) => string | number;
  loading: (
    message: string,
    options?: Omit<ToastOptions, "variant">,
  ) => string | number;
  dismiss: (toastId?: string | number) => void;
  promise: <T>(
    promise: Promise<T>,
    msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    },
    opts?: Omit<ToastOptions, "variant">,
  ) => Promise<T>;
}

const getToastClassName = (variant: ToastVariant = "default"): string => {
  const baseClasses = "text-white";

  switch (variant) {
    case "destructive":
      return `${baseClasses} bg-destructive`;
    case "success":
      return `${baseClasses} bg-green-500`;
    case "warning":
      return `${baseClasses} bg-yellow-500`;
    case "info":
      return `${baseClasses} bg-blue-500`;
    default:
      return baseClasses;
  }
};

const toast = ((message: string, options: ToastOptions = {}) => {
  const { variant = "default", ...rest } = options;
  const className = getToastClassName(variant);

  return sonnerToast(message, {
    className,
    ...rest,
  });
}) as ToastFunction;

// Add type-safe methods for each variant
toast.success = (
  message: string,
  options: Omit<ToastOptions, "variant"> = {},
) => {
  return toast(message, { ...options, variant: "success" });
};

toast.error = (
  message: string,
  options: Omit<ToastOptions, "variant"> = {},
) => {
  return toast(message, { ...options, variant: "destructive" });
};

toast.warning = (
  message: string,
  options: Omit<ToastOptions, "variant"> = {},
) => {
  return toast(message, { ...options, variant: "warning" });
};

toast.info = (message: string, options: Omit<ToastOptions, "variant"> = {}) => {
  return toast(message, { ...options, variant: "info" });
};

toast.loading = (
  message: string,
  options: Omit<ToastOptions, "variant"> = {},
) => {
  return sonnerToast.loading(message, options);
};

toast.dismiss = (toastId?: string | number) => {
  sonnerToast.dismiss(toastId);
};

toast.promise = <T,>(
  promise: Promise<T>,
  msgs: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  },
  opts: Omit<ToastOptions, "variant"> = {},
): Promise<T> => {
  const toastId = sonnerToast.loading(msgs.loading, {
    ...opts,
    duration: Infinity,
  });

  promise
    .then((data) => {
      const message =
        typeof msgs.success === "function" ? msgs.success(data) : msgs.success;

      sonnerToast.success(message, {
        ...opts,
        id: toastId,
        duration: 5000,
      });
    })
    .catch((error) => {
      const message =
        typeof msgs.error === "function" ? msgs.error(error) : msgs.error;

      sonnerToast.error(message, {
        ...opts,
        id: toastId,
        duration: 10000,
      });
    });

  return promise;
};

const Toaster = SonnerToaster;

// Export toast and Toaster components
export { toast, sonnerToast as toastNative, Toaster };

// Export types for better type support
export type { ToastPrimitive as Toast, ToasterProps };
