import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { useLightbox } from './lightboxStore';

export function Lightbox() {
  const { t } = useT();
  const src = useLightbox((s) => s.src);
  const caption = useLightbox((s) => s.caption);
  const close = useLightbox((s) => s.close);

  useEffect(() => {
    if (!src) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [src, close]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('common.imageViewer')}
      onClick={close}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/85 p-4"
    >
      <button
        type="button"
        onClick={close}
        aria-label={t('common.closeImage')}
        className="absolute right-4 top-4 rounded-full bg-ink-900/80 p-2 text-ink-100 hover:bg-ink-800"
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt={caption}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-full rounded-lg object-contain"
      />
      {caption && <p className="mt-3 text-center text-sm text-ink-300">{caption}</p>}
    </div>
  );
}
