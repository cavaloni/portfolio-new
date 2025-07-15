import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (props: { title: string; description?: string }) => {
    sonnerToast.success(props.title, {
      description: props.description,
    });
  },
  error: (props: { title: string; description?: string }) => {
    sonnerToast.error(props.title, {
      description: props.description,
    });
  },
  warning: (props: { title: string; description?: string }) => {
    sonnerToast.warning(props.title, {
      description: props.description,
    });
  },
  info: (props: { title: string; description?: string }) => {
    sonnerToast.info(props.title, {
      description: props.description,
    });
  },
};
