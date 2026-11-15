import { useEffect, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { IconButton } from './primitives';
import { useDialogFocus } from './useDialogFocus';

export function FormDialog({
  title,
  onClose,
  actions,
  children,
}: {
  title: string;
  onClose: () => void;
  actions: ReactNode;
  children: ReactNode;
}) {
  const { t } = useT();
  const titleId = useId();
  const ref = useDialogFocus(true, onClose);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-dialog-focus]')?.focus();
  }, [ref]);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dialog-panel flex max-w-2xl flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-2 border-b border-ink-700 p-4">
          <h2 id={titleId} className="section-title min-w-0 [overflow-wrap:anywhere]">
            {title}
          </h2>
          <IconButton
            label={t('common.close')}
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X size={16} aria-hidden="true" />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
        <footer className="flex flex-wrap-reverse justify-end gap-2 border-t border-ink-700 p-4">
          {actions}
        </footer>
      </div>
    </div>
  );
}
