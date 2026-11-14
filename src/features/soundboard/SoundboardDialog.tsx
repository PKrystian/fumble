import { useEffect, useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '@/features/ui/primitives';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import { useT } from '@/i18n/useT';

export function SoundboardDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useT();
  const id = useId();
  const ref = useDialogFocus(true, onClose);
  useEffect(() => {
    ref.current?.querySelector<HTMLInputElement>('input:not([type=checkbox])')?.focus();
  }, [ref]);
  return (
    <div className="dialog-overlay" onClick={onClose}>
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="dialog-panel max-w-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-700 p-4">
          <h2
            id={id}
            className="section-title min-w-0 break-words [overflow-wrap:anywhere]"
          >
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
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </section>
    </div>
  );
}
