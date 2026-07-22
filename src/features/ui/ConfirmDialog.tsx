import { useEffect, useRef } from 'react';
import { useT } from '@/i18n/useT';
import { useDialogStore } from './confirmStore';

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
        className="w-full max-w-sm rounded-xl border border-ink-700 bg-ink-900 p-5 shadow-xl"
      >
        <h2 className="font-display text-lg font-bold text-ink-50">{title}</h2>
        <p className="mt-2 whitespace-pre-line text-sm text-ink-300">{request.message}</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {!isAlert && (
            <button
              type="button"
              onClick={() => respond(false)}
              className="rounded-md border border-ink-700 px-4 py-2 text-sm font-medium text-ink-200 hover:bg-ink-800"
            >
              {cancelLabel}
            </button>
          )}
          <button
            ref={confirmRef}
            type="button"
            onClick={() => respond(true)}
            className={[
              'rounded-md px-4 py-2 text-sm font-medium text-ink-50',
              request.tone === 'danger'
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-arcane-700 hover:bg-arcane-500',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
