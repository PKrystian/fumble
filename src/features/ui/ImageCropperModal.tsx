import { Button } from '@/features/ui/primitives';
import { useCallback, useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { Check, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { useDialogFocus } from './useDialogFocus';

interface ImageCropperModalProps {
  file: File | Blob;

  aspect?: number;
  shape?: 'circle' | 'rounded';

  outputWidth?: number;
  title?: string;
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
  onChooseAnother?: () => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

type Point = { x: number; y: number };

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function sanitizeObjectUrl(url: string): string | null {
  try {
    if (new URL(url).protocol !== 'blob:') return null;
    const sanitized = DOMPurify.sanitize(url, {
      ALLOWED_URI_REGEXP: /^blob:/,
    });
    return sanitized === url ? sanitized : null;
  } catch {
    return null;
  }
}

export function ImageCropperModal({
  file,
  aspect = 1,
  shape = 'rounded',
  outputWidth = 480,
  title,
  onCancel,
  onSave,
  onChooseAnother,
}: ImageCropperModalProps) {
  const { t } = useT();
  const dialogTitle = title ?? t('common.adjustImage');
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<'load' | 'save' | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const dialogRef = useDialogFocus(true, onCancel);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    const safe = sanitizeObjectUrl(objectUrl);
    setSrc(safe);
    setError(safe ? null : 'load');
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  useEffect(() => {
    setOffset({ x: 0, y: 0 });
    setZoom(1);
    setNatural({ width: 0, height: 0 });
  }, [src]);

  useEffect(() => {
    const el = frameRef.current!;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setFrame({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = frameRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => clampZoom(z * (1 - e.deltaY * 0.0015)));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const baseScale =
    natural.width && frame.width
      ? Math.max(frame.width / natural.width, frame.height / natural.height)
      : 0;
  const displayScale = baseScale * zoom;
  const displayWidth = natural.width * displayScale;
  const displayHeight = natural.height * displayScale;

  const clampOffset = useCallback(
    (x: number, y: number): Point => {
      const maxX = Math.max(0, (displayWidth - frame.width) / 2);
      const maxY = Math.max(0, (displayHeight - frame.height) / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, x)),
        y: Math.min(maxY, Math.max(-maxY, y)),
      };
    },
    [displayWidth, displayHeight, frame.width, frame.height],
  );

  useEffect(() => {
    setOffset((o) => clampOffset(o.x, o.y));
  }, [clampOffset]);

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };

  const handlePointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const pts = pointers.current;
    if (!pts.has(e.pointerId)) return;
    const prevPoints = new Map(pts);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pts.size === 1) {
      const prev = prevPoints.get(e.pointerId)!;
      const cur = pts.get(e.pointerId)!;
      setOffset((o) => clampOffset(o.x + (cur.x - prev.x), o.y + (cur.y - prev.y)));
      return;
    }

    const [idA, idB] = [...pts.keys()];
    const prevA = prevPoints.get(idA!)!;
    const prevB = prevPoints.get(idB!)!;
    const curA = pts.get(idA!)!;
    const curB = pts.get(idB!)!;

    const prevDist = Math.hypot(prevB.x - prevA.x, prevB.y - prevA.y);
    const curDist = Math.hypot(curB.x - curA.x, curB.y - curA.y);
    const prevMid = { x: (prevA.x + prevB.x) / 2, y: (prevA.y + prevB.y) / 2 };
    const curMid = { x: (curA.x + curB.x) / 2, y: (curA.y + curB.y) / 2 };

    if (prevDist > 0) setZoom((z) => clampZoom(z * (curDist / prevDist)));
    setOffset((o) =>
      clampOffset(o.x + (curMid.x - prevMid.x), o.y + (curMid.y - prevMid.y)),
    );
  };

  const handleSave = async () => {
    if (!natural.width || !frame.width) return;
    setSaving(true);
    setError(null);
    try {
      const img = await loadImage(src!);
      const outputHeight = Math.round(outputWidth / aspect);
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      const imgLeft = frame.width / 2 + offset.x - displayWidth / 2;
      const imgTop = frame.height / 2 + offset.y - displayHeight / 2;
      const sx = -imgLeft / displayScale;
      const sy = -imgTop / displayScale;
      const sWidth = frame.width / displayScale;
      const sHeight = frame.height / displayScale;

      ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, outputWidth, outputHeight);
      onSave(canvas.toDataURL('image/jpeg', 0.85));
    } catch {
      setError('save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dialogTitle}
      ref={dialogRef}
      tabIndex={-1}
      onClick={onCancel}
      className="dialog-overlay"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="dialog-panel max-w-sm gap-4 overflow-y-auto p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-ink-50 section-title">{dialogTitle}</h2>
          <Button
            type="button"
            onClick={onCancel}
            aria-label={t('common.cancel')}
            variant="ghost"
            size="sm"
            iconOnly
          >
            <X size={18} />
          </Button>
        </div>

        <div
          ref={frameRef}
          role="group"
          tabIndex={0}
          aria-label={t('common.cropperFrame')}
          className={[
            'relative mx-auto w-full touch-none select-none overflow-hidden border border-ink-700 bg-ink-950',
            shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          ].join(' ')}
          style={{ aspectRatio: String(aspect), maxWidth: 280 }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={handlePointerEnd}
          onKeyDown={(event) => {
            const steps: Record<string, Point> = {
              ArrowLeft: { x: -1, y: 0 },
              ArrowRight: { x: 1, y: 0 },
              ArrowUp: { x: 0, y: -1 },
              ArrowDown: { x: 0, y: 1 },
            };
            const direction = steps[event.key];
            if (!direction) return;
            event.preventDefault();
            const step = event.shiftKey ? 24 : 6;
            setOffset((current) =>
              clampOffset(current.x + direction.x * step, current.y + direction.y * step),
            );
          }}
        >
          {src && (
            <img
              src={src}
              alt=""
              draggable={false}
              onLoad={(e) => {
                setNatural({
                  width: e.currentTarget.naturalWidth,
                  height: e.currentTarget.naturalHeight,
                });
              }}
              onError={() => setError('load')}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
              style={{
                width: displayWidth || undefined,
                height: displayHeight || undefined,
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          <ZoomOut size={16} className="shrink-0 text-ink-400" aria-hidden="true" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(clampZoom(Number(e.target.value)))}
            aria-label={t('common.zoom')}
            className="flex-1 accent-arcane-500"
          />
          <ZoomIn size={16} className="shrink-0 text-ink-400" aria-hidden="true" />
        </div>

        <p className="text-center text-xs text-ink-400">{t('common.cropperHint')}</p>
        <p className="text-center text-xs text-ink-400">{t('common.cropperKeyboard')}</p>
        {error && (
          <p role="alert" className="notice" data-tone="error">
            {t(error === 'load' ? 'common.cropperLoadError' : 'common.cropperSaveError')}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {error && onChooseAnother && (
            <Button onClick={onChooseAnother}>{t('common.cropperChooseAnother')}</Button>
          )}
          <Button type="button" onClick={onCancel} variant="secondary">
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || !natural.width || error === 'load'}
            variant="primary"
          >
            <Check size={16} /> {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  );
}
