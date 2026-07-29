import { create } from 'zustand';

export type DialogTone = 'default' | 'danger';

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: DialogTone;
}

interface AlertOptions {
  title?: string;
  okLabel?: string;
}

interface DialogRequest {
  kind: 'confirm' | 'alert';
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: DialogTone;
  resolve: (value: boolean) => void;
}

interface DialogState {
  request: DialogRequest | null;
  respond: (value: boolean) => void;
}

export const useDialogStore = create<DialogState>((set, get) => ({
  request: null,
  respond: (value) => {
    get().request?.resolve(value);
    set({ request: null });
  },
}));

export function confirmDialog(
  message: string,
  options: ConfirmOptions = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    useDialogStore.setState({
      request: {
        kind: 'confirm',
        title: options.title ?? '',
        message,
        confirmLabel: options.confirmLabel ?? '',
        cancelLabel: options.cancelLabel ?? '',
        tone: options.tone ?? 'default',
        resolve,
      },
    });
  });
}

export function alertDialog(message: string, options: AlertOptions = {}): Promise<void> {
  return new Promise((resolve) => {
    useDialogStore.setState({
      request: {
        kind: 'alert',
        title: options.title ?? '',
        message,
        confirmLabel: options.okLabel ?? '',
        cancelLabel: '',
        tone: 'default',
        resolve: () => resolve(),
      },
    });
  });
}
