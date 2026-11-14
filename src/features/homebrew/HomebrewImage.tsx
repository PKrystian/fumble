import { useState, type ReactNode } from 'react';
import { imageUrl } from '@/data/compendium/images';
import { Button } from '@/features/ui/primitives';
import { useT } from '@/i18n/useT';

import { isLocalHomebrewImage } from './artworkPolicy';

export function HomebrewArtwork({
  src,
  children,
}: {
  src: string;
  children: (url: string) => ReactNode;
}) {
  const { t } = useT();
  const [allowed, setAllowed] = useState<string>();
  if (!src.trim()) return null;
  if (isLocalHomebrewImage(src)) return children(src);
  if (
    /^(?!https?:)[a-z][a-z\d+.-]*:/i.test(src) ||
    src.startsWith('//') ||
    src.includes('\\')
  )
    return null;
  const url = imageUrl(src);
  if (allowed === url) return children(url);
  return (
    <Button variant="secondary" size="sm" onClick={() => setAllowed(url)}>
      {t('homebrew.showExternalImage')}
    </Button>
  );
}

export function HomebrewImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const { t } = useT();
  const [failed, setFailed] = useState<string>();
  return (
    <HomebrewArtwork src={src}>
      {(url) =>
        failed === url ? (
          <span className="text-sm text-ink-400" role="status">
            {t('homebrew.artworkFailed')}
          </span>
        ) : (
          <img
            src={url}
            alt={alt}
            className={className}
            referrerPolicy="no-referrer"
            onError={() => setFailed(url)}
          />
        )
      }
    </HomebrewArtwork>
  );
}
