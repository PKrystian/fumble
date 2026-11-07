import { useEffect, useRef } from 'react';
import { useT } from '@/i18n/useT';
import { useDialogStore } from './confirmStore';
import { Button } from './primitives';
import { useDialogFocus } from './useDialogFocus';

export function ConfirmDialog() {
  const { t } = useT();
  const request = useDialogStore((s) => s.request);
  const respond = useDialogStore((s) => s.respond);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useDialogFocus(Boolean(request), () => respond(false));

  useEffect(() => {
    if (!request) return;
    confirmRef.current?.focus();
  }, [request, respond]);

  if (!request) return null;

  const isAlert = request.kind === 'alert';
  const title = request.title || t(isAlert ? 'common.notice' : 'common.confirmTitle');
  const confirmLabel =
    request.confirmLabel || t(isAlert ? 'common.ok' : 'common.confirm');
  const cancelLabel = request.cancelLabel || t('common.cancel');

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      onClick={() => respond(false)}
      className="dialog-overlay z-[80]"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="dialog-panel max-w-sm p-5"
      >
        <h2 className="text-ink-50 section-title">{title}</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-ink-300">{request.message}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!isAlert && <Button onClick={() => respond(false)}>{cancelLabel}</Button>}
          <Button
            ref={confirmRef}
            onClick={() => respond(true)}
            variant={request.tone === 'danger' ? 'danger' : 'primary'}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
