import { useEffect, useId } from 'react';
import { useBlocker } from 'react-router-dom';
import { Button } from '@/features/ui/primitives';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import { confirmDialog } from '@/features/ui/confirmStore';
import { useT } from '@/i18n/useT';
import type { SpeechHook } from './speech';

export function RecordingNavigationGuard({ speech }: { speech: SpeechHook }) {
  const { t } = useT();
  const { busy, stop } = speech;
  const blocker = useBlocker(busy);
  const id = useId();
  const ref = useDialogFocus(blocker.state === 'blocked', blocker.reset);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    stop();
    if (!busy) blocker.proceed();
  }, [blocker, busy, stop]);
  if (blocker.state !== 'blocked') return null;
  return (
    <div className="dialog-overlay z-50">
      <section
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
        className="dialog-panel w-full max-w-md p-5"
      >
        <h2 id={id} className="section-title">
          {t('sessionLog.leaveHeading')}
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-300">{t('sessionLog.leaveHelp')}</p>
        <p role="status" className="notice mt-4">
          {t('sessionLog.pending', { count: speech.pendingCount })}
        </p>
        {speech.speechError && (
          <p role="alert" className="notice notice-error mt-3">
            {speech.speechError}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => blocker.reset()}>{t('sessionLog.stay')}</Button>
          {speech.canRetry && (
            <>
              <Button onClick={() => void speech.retry()}>
                {t('sessionLog.retryTranscription')}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (
                    await confirmDialog(t('sessionLog.discardPendingConfirm'), {
                      tone: 'danger',
                      confirmLabel: t('sessionLog.discardPending'),
                      initialFocus: 'cancel',
                    })
                  )
                    speech.discardPending();
                }}
              >
                {t('sessionLog.discardPending')}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
