import { useEffect, useRef, useState } from 'react';
import { Button } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { useT } from '@/i18n/useT';
import {
  listenToPlayer,
  subscribeToPlayer,
  playerMessage,
  type PlayerState,
} from './playerApi';
import { embedUrl, sourceUrl } from './youtube';
import type { Track } from './validation';

export function SoundboardPlayer({
  track,
  name,
  onStop,
}: {
  track: Track;
  name: string;
  onStop: () => void;
}) {
  const { t, locale } = useT();
  const frame = useRef<HTMLIFrameElement>(null);
  const [state, setState] = useState<PlayerState>('loading');
  const [attempt, setAttempt] = useState(0);
  const [widgetId] = useState(() => crypto.getRandomValues(new Uint32Array(1))[0]!);
  const language = useRef(locale);
  const configure = () => {
    listenToPlayer(frame.current!, widgetId);
  };
  useEffect(() => {
    const timeout = setTimeout(() => setState('blocked'), 20000);
    const polling = setInterval(() => {
      listenToPlayer(frame.current!, widgetId);
    }, 250);
    let subscribed = false;
    const onMessage = (event: MessageEvent) => {
      const message = playerMessage(event, frame.current!, widgetId);
      if (!message) return;
      if (!subscribed) {
        subscribeToPlayer(frame.current!, widgetId);
        subscribed = true;
      }
      if (message === 'handshake') listenToPlayer(frame.current!, widgetId);
      else {
        clearTimeout(timeout);
        clearInterval(polling);
        setState(message);
      }
    };
    window.addEventListener('message', onMessage);
    return () => {
      clearTimeout(timeout);
      clearInterval(polling);
      window.removeEventListener('message', onMessage);
    };
  }, [widgetId, attempt]);

  return (
    <section
      className={panelClass(
        'sticky top-0 z-20 mb-6 grid min-w-0 grid-cols-1 gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_320px]',
      )}
      aria-label={t('soundboard.player')}
    >
      <div className="flex flex-wrap content-start items-start justify-between gap-3 bg-ink-900 py-2">
        <div className="min-w-0">
          <p
            title={name}
            className="line-clamp-2 break-words font-semibold text-ink-50 [overflow-wrap:anywhere]"
          >
            {t('soundboard.nowPlaying', { name })}
          </p>
          <p
            role={state === 'error' ? 'alert' : 'status'}
            className="mt-1 text-sm text-ink-300"
          >
            {t(`soundboard.playerState.${state}`)}
          </p>
        </div>
        <Button onClick={onStop}>{t('soundboard.stop')}</Button>
      </div>
      <iframe
        key={attempt}
        ref={frame}
        title={name}
        src={`${embedUrl(track.videoId, track.playlistId)}&enablejsapi=1&origin=${encodeURIComponent(window.location.origin)}&widgetid=${widgetId}&hl=${language.current}&playsinline=1`}
        onLoad={configure}
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        className="aspect-video min-h-[200px] min-w-0 w-full max-w-[480px]"
      />

      {(state === 'error' || state === 'blocked') && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button
            onClick={() => {
              setState('loading');
              setAttempt((value) => value + 1);
            }}
          >
            {t('common.retry')}
          </Button>
          <a
            href={sourceUrl(track)}
            target="_blank"
            rel="noreferrer"
            className="back-link"
          >
            {t('soundboard.openYouTube')}
          </a>
        </div>
      )}
    </section>
  );
}
