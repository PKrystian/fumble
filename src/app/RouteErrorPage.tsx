import { useEffect, useState } from 'react';
import { useRouteError } from 'react-router-dom';
import { downloadStoredBackup } from '@/features/data/emergencyBackup';
import { Button } from '@/features/ui/primitives';
import { buttonClass, panelClass } from '@/features/ui/styles';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { isChunkLoadError } from './chunkError';
import { reloadPage } from './reload';

const RELOAD_KEY = 'fumble-chunk-reload';
const RELOAD_WINDOW_MS = 60_000;

function claimAutomaticReload(error: unknown): boolean {
  if (!isChunkLoadError(error)) return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_KEY));
    if (Date.now() - last < RELOAD_WINDOW_MS) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

export function RouteErrorPage() {
  const error = useRouteError();
  const { t } = useT();
  const outdated = isChunkLoadError(error);
  const [reloading] = useState(() => claimAutomaticReload(error));
  const [backup, setBackup] = useState<'idle' | 'done' | 'failed'>('idle');
  useSeo(t('errors.routeTitle'), t('errors.routeMessage'), false);

  useEffect(() => {
    if (reloading) reloadPage();
  }, [reloading]);

  return (
    <div className="page-shell page-shell-reading">
      <div role="alert" className={panelClass('p-6')}>
        <h1 className="page-title">{t('errors.routeTitle')}</h1>
        <p className="page-description">
          {t(outdated ? 'errors.routeOutdated' : 'errors.routeMessage')}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" onClick={reloadPage}>
            {t('errors.reload')}
          </Button>
          <Link to="/" className={buttonClass()}>
            {t('nav.home')}
          </Link>
          <Button onClick={() => setBackup(downloadStoredBackup() ? 'done' : 'failed')}>
            {t('errors.downloadBackup')}
          </Button>
        </div>
        <p aria-live="polite" className="mt-4 min-h-6 text-sm text-ink-300">
          {backup === 'done' && t('errors.backupDownloaded')}
          {backup === 'failed' && t('errors.backupFailed')}
        </p>
      </div>
    </div>
  );
}
