import { Button } from '@/features/ui/primitives';
import { X } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { useLightbox } from './lightboxStore';
import { useDialogFocus } from './useDialogFocus';

export function Lightbox() {
  const { t } = useT();
  const src = useLightbox((s) => s.src);
  const caption = useLightbox((s) => s.caption);
  const close = useLightbox((s) => s.close);
  const dialogRef = useDialogFocus(Boolean(src), close);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('common.imageViewer')}
      ref={dialogRef}
      tabIndex={-1}
      onClick={close}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/85 p-4"
    >
      <Button
        type="button"
        onClick={close}
        aria-label={t('common.closeImage')}
        variant="ghost"
        size="sm"
        iconOnly
        className="absolute right-4 top-4"
      >
        <X size={22} />
      </Button>
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
