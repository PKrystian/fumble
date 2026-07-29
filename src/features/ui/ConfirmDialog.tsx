import { useEffect, useRef } from 'react';
import { useT } from '@/i18n/useT';
import { useDialogStore } from './confirmStore';
import { Button } from './primitives';
import { panelClass } from './styles';

export function ConfirmDialog() {
  const { t } = useT();
  const request = useDialogStore((s) => s.request);
  const respond = useDialogStore((s) => s.respond);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!request) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && respond(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
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
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={panelClass('w-full max-w-sm border-ink-700 p-5 shadow-xl')}
      >
        <h2 className="font-display text-lg font-bold text-ink-50">{title}</h2>
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
