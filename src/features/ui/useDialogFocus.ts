import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
const dialogs: HTMLElement[] = [];

export function useDialogFocus<T extends HTMLElement = HTMLDivElement>(
  open: boolean,
  onClose?: () => void,
): RefObject<T | null> {
  const dialogRef = useRef<T>(null);
  const previousRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    previousRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialogs.push(dialog);
    const first = dialog.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialog).focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (dialogs.at(-1) !== dialog) return;
      if (event.key === 'Escape' && closeRef.current) {
        event.stopImmediatePropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusables.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const firstFocusable = focusables[0]!;
      const lastFocusable = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    };

    const onFocus = (event: FocusEvent) => {
      if (dialogs.at(-1) === dialog && !dialog.contains(event.target as Node)) {
        (dialog.querySelector<HTMLElement>(FOCUSABLE) ?? dialog).focus();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('focusin', onFocus);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('focusin', onFocus);
      dialogs.splice(dialogs.indexOf(dialog), 1);
      previousRef.current?.focus();
      previousRef.current = null;
    };
  }, [open]);

  return dialogRef;
}
