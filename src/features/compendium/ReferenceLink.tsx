import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from '@/i18n/path';
import { useLocale } from '@/i18n/pathUtils';
import { useT } from '@/i18n/useT';
import { OriginalName } from '@/features/ui/OriginalName';
import {
  loadReferenceHint,
  loadReferenceName,
  resolveReference,
  type ReferenceHint,
} from './referenceHint';

interface ReferenceLinkProps {
  category: string;
  slug: string;
  label: string;
  source?: string;
}

interface Anchor {
  left: number;
  top: number;
  bottom: number;
}

const POPOVER_WIDTH = 288;

export function ReferenceLink({ category, slug, label, source }: ReferenceLinkProps) {
  const { t } = useT();
  const locale = useLocale();
  const ref = useRef<HTMLAnchorElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [hint, setHint] = useState<ReferenceHint | null | undefined>(undefined);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  const [localizedLabel, setLocalizedLabel] = useState<string | null>(null);
  const [resolvedSlug, setResolvedSlug] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    setResolvedSlug(undefined);
    setLocalizedLabel(null);
    void resolveReference(category, slug, locale, label, source)
      .then((resolved) => {
        if (cancelled) return;
        setResolvedSlug(resolved?.slug ?? null);
        if (!resolved) return;
        void loadReferenceName(category, resolved.slug, locale, label, source)
          .then((name) => {
            if (!cancelled && name) setLocalizedLabel(name);
          })
          .catch(() => undefined);
      })
      .catch(() => {
        if (!cancelled) setResolvedSlug(null);
      });
    return () => {
      cancelled = true;
    };
  }, [category, slug, locale, label, source]);

  const hide = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = null;
    setAnchor(null);
  }, []);

  const show = useCallback(() => {
    if (!resolvedSlug) return;
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const rect = ref.current!.getBoundingClientRect();
      setHint(undefined);
      setAnchor({ left: rect.left, top: rect.top, bottom: rect.bottom });
      void loadReferenceHint(category, resolvedSlug, locale, source)
        .then(setHint)
        .catch(() => setHint(null));
    }, 220);
  }, [category, locale, resolvedSlug, source]);

  useEffect(() => {
    if (!anchor) return;

    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [anchor, hide]);

  useEffect(() => () => hide(), [hide]);

  const placeBelow = anchor ? anchor.top < 180 : false;
  const left = anchor
    ? Math.max(8, Math.min(anchor.left, window.innerWidth - POPOVER_WIDTH - 8))
    : 0;

  const content = localizedLabel ?? label;
  return (
    <>
      {resolvedSlug ? (
        <Link
          ref={ref}
          to={`/compendium/${category}/${resolvedSlug}`}
          onMouseEnter={show}
          onMouseLeave={hide}
          onFocus={show}
          onBlur={hide}
          className="text-arcane-300 underline decoration-dotted underline-offset-2 hover:text-arcane-500"
        >
          {content}
        </Link>
      ) : (
        <span>{content}</span>
      )}
      {anchor &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              left,
              width: POPOVER_WIDTH,
              ...(placeBelow
                ? { top: anchor.bottom + 8 }
                : { bottom: window.innerHeight - anchor.top + 8 }),
            }}
            className="z-[60] animate-fade-in-up rounded-lg border border-ink-700 bg-ink-800 p-3 text-sm shadow-xl"
          >
            <p className="font-display font-bold text-ink-50">
              {hint?.name ?? label}
              <OriginalName name={hint?.englishName} className="ml-1.5 text-sm" />
            </p>
            {hint?.subtitle && (
              <p className="mt-0.5 text-xs uppercase tracking-wide text-arcane-300">
                {hint.subtitle}
              </p>
            )}
            <p className="mt-1.5 leading-snug text-ink-200">
              {hint === undefined
                ? t('common.loading')
                : (hint?.description ?? '') || t('compendium.referenceOpenFull')}
            </p>
          </div>,
          document.body,
        )}
    </>
  );
}
