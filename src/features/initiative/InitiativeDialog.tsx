import { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '@/features/ui/primitives';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import { useT } from '@/i18n/useT';

export function InitiativeDialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = useT();
  const titleId = useId();
  const ref = useDialogFocus(true, onClose);

  return (
    <div className="dialog-overlay z-[70]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={ref}
        tabIndex={-1}
        className="dialog-panel flex max-w-lg flex-col overflow-hidden"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-2 p-4">
          <h2 id={titleId} className="section-title min-w-0 [overflow-wrap:anywhere]">
            {title}
          </h2>
          <IconButton label={t('common.close')} size="sm" onClick={onClose}>
            <X size={16} aria-hidden="true" />
          </IconButton>
        </header>
        <div className="min-h-0 space-y-4 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>
  );
}
