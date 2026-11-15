import { useEffect } from 'react';
import { useBlocker } from 'react-router-dom';
import { Button } from '@/features/ui/primitives';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import { useT } from '@/i18n/useT';

export function MapDraftGuard({
  dirty,
  retry,
  download,
}: {
  dirty: boolean;
  retry: () => void;
  download: () => void;
}) {
  const { t } = useT();
  const blocker = useBlocker(dirty);
  const ref = useDialogFocus(blocker.state === 'blocked', blocker.reset);
  useEffect(() => {
    if (!dirty && blocker.state === 'blocked') blocker.proceed();
  }, [dirty, blocker]);
  useEffect(() => {
    if (!dirty) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);
  if (blocker.state !== 'blocked') return null;
  return (
    <div className="dialog-overlay">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-draft-leave-title"
        tabIndex={-1}
        className="dialog-panel max-w-lg p-5"
      >
        <h2 id="map-draft-leave-title" className="section-title">
          {t('wiki.mapDraftLeaveTitle')}
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-300">{t('wiki.mapDraftUnsaved')}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={blocker.reset}>{t('wiki.mapDraftStay')}</Button>
          <Button onClick={retry}>{t('wiki.mapDraftSave')}</Button>
          <Button onClick={download}>{t('wiki.mapDraftDownload')}</Button>
          <Button variant="danger" onClick={blocker.proceed}>
            {t('wiki.mapDraftLeave')}
          </Button>
        </div>
      </div>
    </div>
  );
}
