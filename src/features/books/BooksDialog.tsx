import { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { IconButton } from '@/features/ui/primitives';
import { useDialogFocus } from '@/features/ui/useDialogFocus';

export function BooksDialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const { t } = useT();
  const id = useId();
  const ref = useDialogFocus(open, onClose);
  if (!open) return null;
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        tabIndex={-1}
        className="dialog-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-ink-700 p-4">
          <h2 id={id} className="section-title">
            {title}
          </h2>
          <IconButton
            label={t('common.close')}
            variant="ghost"
            size="sm"
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </IconButton>
        </header>
        <div className="min-h-0 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
