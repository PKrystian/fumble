import { Button, TextInput } from '@/features/ui/primitives';
import { confirmDialog } from '@/features/ui/confirmStore';
import {
  ArrowLeft,
  Grid3X3,
  Map as MapIcon,
  Pencil,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from 'react';
import { useParams } from 'react-router-dom';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { NotFoundPage } from '@/features/NotFoundPage';
import { MapDraftGuard } from './MapDraftGuard';
import {
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from '@/features/storage/safeStorage';
import {
  compressRevealedRanges,
  expandRevealedRanges,
  getCampaignMap,
  getHexGridPath,
  getMapEditorStorageKey,
  parseMapEditorCells,
} from './maps';

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const isMapEditorEnabled = import.meta.env.MODE !== 'production';

interface MapOffset {
  x: number;
  y: number;
}

interface MapDrag {
  pointerId: number;
  startX: number;
  startY: number;
  origin: MapOffset;
}

export function CampaignMapPage() {
  const { t } = useT();
  const { campaignId } = useParams<{ campaignId?: string }>();
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<MapDrag | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<MapOffset>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showHexGrid, setShowHexGrid] = useState(false);
  const map = campaignId ? getCampaignMap(campaignId) : null;
  const totalHexes = map ? map.columns * map.rows : 0;
  const revealed = useMemo(
    () =>
      map ? expandRevealedRanges(map.revealedRanges, totalHexes) : new Set<number>(),
    [map, totalHexes],
  );
  const editorStorageKey = map ? getMapEditorStorageKey(map.campaignId) : null;
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [localRevealed, setLocalRevealed] = useState<ReadonlySet<number> | null>(null);
  const [isRangesCopied, setIsRangesCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [resetError, setResetError] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  const [activeHex, setActiveHex] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [imageRetry, setImageRetry] = useState(0);

  useEffect(() => {
    if (!isMapEditorEnabled || !editorStorageKey) {
      setLocalRevealed(null);
      return;
    }
    setLocalRevealed(parseMapEditorCells(readLocalStorage(editorStorageKey), totalHexes));
  }, [editorStorageKey, totalHexes]);

  useSeo(t('seo.pageTitles.map'), t('seo.pageDescriptions.map'), Boolean(map));

  const clampOffset = useCallback((value: MapOffset, level: number): MapOffset => {
    if (level <= MIN_ZOOM) return { x: 0, y: 0 };
    const viewport = viewportRef.current!;
    const maxX = (viewport.clientWidth * (level - 1)) / 2;
    const maxY = (viewport.clientHeight * (level - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, value.x)),
      y: Math.max(-maxY, Math.min(maxY, value.y)),
    };
  }, []);

  const updateZoom = useCallback(
    (nextZoom: number) => {
      const level = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
      setZoom(level);
      setOffset((current) => clampOffset(current, level));
    },
    [clampOffset],
  );

  const resetView = useCallback(() => {
    setZoom(MIN_ZOOM);
    setOffset({ x: 0, y: 0 });
  }, []);

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    updateZoom(zoom + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (zoom <= MIN_ZOOM) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX || 0,
      startY: event.clientY || 0,
      origin: offset,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setOffset(
      clampOffset(
        {
          x: drag.origin.x + (event.clientX || 0) - drag.startX,
          y: drag.origin.y + (event.clientY || 0) - drag.startY,
        },
        zoom,
      ),
    );
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
    setIsDragging(false);
  };

  const displayedRevealed = localRevealed ?? revealed;
  const hexGridPath = useMemo(
    () =>
      map && showHexGrid ? getHexGridPath(map.columns, map.rows, displayedRevealed) : '',
    [displayedRevealed, map, showHexGrid],
  );
  const editorActive = isMapEditorEnabled && isEditorOpen;
  const hiddenHexPath = useMemo(() => {
    if (!map || editorActive) return '';
    const hidden = new Set<number>();
    for (let index = 0; index < totalHexes; index += 1) {
      if (!displayedRevealed.has(index)) hidden.add(index);
    }
    return getHexGridPath(map.columns, map.rows, hidden);
  }, [displayedRevealed, editorActive, map, totalHexes]);
  const editorRanges = useMemo(
    () => compressRevealedRanges(displayedRevealed),
    [displayedRevealed],
  );
  const editorExport = useMemo(
    () =>
      editorRanges.length === 0
        ? 'revealedRanges: []'
        : `revealedRanges: [\n${editorRanges.map((range) => `  '${range}',`).join('\n')}\n]`,
    [editorRanges],
  );

  const toggleHex = useCallback(
    (index: number) => {
      const next = new Set(displayedRevealed);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      const sorted = [...next].sort((left, right) => left - right);
      setSaveError(!writeLocalStorage(editorStorageKey!, JSON.stringify(sorted)));
      setLocalRevealed(next);
      setResetError(false);
      setIsRangesCopied(false);
      setCopyError(false);
    },
    [displayedRevealed, editorStorageKey],
  );

  const handleHexKeyDown = useCallback(
    (event: KeyboardEvent<HTMLSpanElement>, index: number) => {
      const columns = map!.columns;
      const neighbors: Record<string, number> = {
        ArrowLeft: index % columns === 0 ? index : index - 1,
        ArrowRight:
          (index + 1) % columns === 0 ? index : Math.min(totalHexes - 1, index + 1),
        ArrowUp: Math.max(index % columns, index - columns),
        ArrowDown: index + columns < totalHexes ? index + columns : index,
        Home: 0,
        End: totalHexes - 1,
      };
      const next = neighbors[event.key];
      if (next !== undefined) {
        event.preventDefault();
        event.stopPropagation();
        setActiveHex(next);
        viewportRef.current!.querySelector<HTMLElement>(`[data-hex="${next}"]`)!.focus();
        return;
      }
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      event.stopPropagation();
      toggleHex(index);
    },
    [map, totalHexes, toggleHex],
  );

  const gridItems = useMemo(() => {
    if (!map || !editorActive) return null;
    return Array.from({ length: totalHexes }, (_, index) => {
      const column = index % map.columns;
      const row = Math.floor(index / map.columns);
      const gridRow = row * 2 + (column % 2 === 0 ? 2 : 1);
      const isRevealed = displayedRevealed.has(index);
      return (
        <li
          key={index}
          className="wiki-chult-map__item"
          style={{
            gridColumn: `${column * 2 + 1} / span 3`,
            gridRow: `${gridRow} / span 2`,
          }}
        >
          <span
            className={[
              'wiki-chult-map__hex',
              isRevealed ? 'wiki-chult-map__hex--revealed' : '',
            ].join(' ')}
            role="button"
            tabIndex={index === activeHex ? 0 : -1}
            data-hex={index}
            onFocus={() => setActiveHex(index)}
            aria-label={t('wiki.mapEditorHex', {
              index,
              state: isRevealed ? t('wiki.mapEditorRevealed') : t('wiki.mapEditorHidden'),
            })}
            aria-pressed={isRevealed}
            onClick={() => toggleHex(index)}
            onKeyDown={(event) => handleHexKeyDown(event, index)}
          />
        </li>
      );
    });
  }, [
    displayedRevealed,
    editorActive,
    handleHexKeyDown,
    t,
    map,
    toggleHex,
    totalHexes,
    activeHex,
  ]);

  const copyEditorRanges = async () => {
    try {
      await navigator.clipboard.writeText(editorExport);
      setIsRangesCopied(true);
      setCopyError(false);
    } catch {
      setIsRangesCopied(false);
      setCopyError(true);
    }
  };

  const resetEditor = async () => {
    const accepted = await confirmDialog(t('wiki.mapDraftResetConfirm'), {
      title: t('wiki.mapDraftResetTitle'),
      confirmLabel: t('wiki.mapEditorReset'),
      tone: 'danger',
      initialFocus: 'cancel',
    });
    if (!accepted) return;
    if (!removeLocalStorage(editorStorageKey!)) {
      setResetError(true);
      return;
    }
    setLocalRevealed(null);
    setSaveError(false);
    setResetError(false);
    setIsRangesCopied(false);
    setCopyError(false);
  };

  const retrySave = () =>
    setSaveError(
      !writeLocalStorage(
        editorStorageKey!,
        JSON.stringify([...displayedRevealed].sort((a, b) => a - b)),
      ),
    );
  const downloadDraft = () => {
    try {
      const url = URL.createObjectURL(
        new Blob([editorExport], { type: 'text/plain;charset=utf-8' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = `${map!.campaignId}-revealed-ranges.txt`;
      document.body.append(link);
      try {
        link.click();
      } finally {
        link.remove();
        URL.revokeObjectURL(url);
      }
      setDownloadError(false);
    } catch {
      setDownloadError(true);
    }
  };

  if (!map) {
    return <NotFoundPage />;
  }

  const imageSrc = `${import.meta.env.BASE_URL}${map.imagePath}`;
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="page-shell page-shell-wide">
      <MapDraftGuard dirty={saveError} retry={retrySave} download={downloadDraft} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link to={`/wiki/${map.campaignId}`} className="back-link">
            <ArrowLeft size={16} aria-hidden="true" />
            {t('wiki.backToCampaign')}
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-ember-500/40 bg-ember-500/10 p-2 text-ember-400">
              <MapIcon size={22} aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-ink-50 page-title">{t('wiki.chultMap')}</h1>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            aria-label={showHexGrid ? t('wiki.mapGridHide') : t('wiki.mapGridShow')}
            aria-pressed={showHexGrid}
            title={showHexGrid ? t('wiki.mapGridHide') : t('wiki.mapGridShow')}
            onClick={() => setShowHexGrid((current) => !current)}
            variant="secondary"
          >
            <Grid3X3 size={16} aria-hidden="true" />
            {showHexGrid ? t('wiki.mapGridHide') : t('wiki.mapGridShow')}
          </Button>
          {isMapEditorEnabled && (
            <Button
              type="button"
              aria-label={
                isEditorOpen ? t('wiki.mapEditorClose') : t('wiki.mapEditorOpen')
              }
              title={isEditorOpen ? t('wiki.mapEditorClose') : t('wiki.mapEditorOpen')}
              onClick={() => setIsEditorOpen((current) => !current)}
              variant="secondary"
              className="text-ember-300 hover:text-ember-200"
            >
              <Pencil size={16} aria-hidden="true" />
              {isEditorOpen ? t('wiki.mapEditorClose') : t('wiki.mapEditorOpen')}
            </Button>
          )}
          <div
            role="group"
            aria-label={t('wiki.mapControls')}
            className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-900 p-1 shadow-lg shadow-black/20"
          >
            <Button
              type="button"
              aria-label={t('wiki.mapZoomOut')}
              title={t('wiki.mapZoomOut')}
              onClick={() => updateZoom(zoom - ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              variant="ghost"
              size="sm"
              iconOnly
            >
              <ZoomOut size={17} aria-hidden="true" />
            </Button>
            <span
              aria-live="polite"
              className="min-w-12 px-1 text-center text-xs tabular-nums text-ink-300"
            >
              {t('wiki.mapZoomLevel', { percent: zoomPercent })}
            </span>
            <Button
              type="button"
              aria-label={t('wiki.mapResetView')}
              title={t('wiki.mapResetView')}
              onClick={resetView}
              variant="ghost"
              size="sm"
              iconOnly
            >
              <RotateCcw size={16} aria-hidden="true" />
            </Button>
            <Button
              type="button"
              aria-label={t('wiki.mapZoomIn')}
              title={t('wiki.mapZoomIn')}
              onClick={() => updateZoom(zoom + ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              variant="ghost"
              size="sm"
              iconOnly
            >
              <ZoomIn size={17} aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      {isMapEditorEnabled && isEditorOpen && (
        <aside
          aria-label={t('wiki.mapEditorTitle')}
          className="mb-4 rounded-xl border border-ember-500/30 bg-ember-500/5 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ember-300">
                {t('wiki.mapEditorLocalOnly')}
              </p>
              <h2 className="mt-1 text-ink-50 section-title">
                {t('wiki.mapEditorTitle')}
              </h2>
              <p className="mt-1 text-sm leading-6 text-ink-300">
                {t('wiki.mapEditorDescription')}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-ink-900 px-2 py-1 text-xs tabular-nums text-ink-300">
                {t('wiki.mapEditorState', {
                  revealed: displayedRevealed.size,
                  total: totalHexes,
                })}
              </span>
              <Button type="button" onClick={copyEditorRanges} variant="secondary">
                {isRangesCopied
                  ? t('wiki.mapEditorCopied')
                  : t('wiki.mapEditorCopyRanges')}
              </Button>
              {copyError && (
                <span role="alert" className="text-xs text-red-300">
                  {t('common.clipboardError')}
                </span>
              )}
              <Button
                type="button"
                onClick={() => void resetEditor()}
                disabled={localRevealed === null}
                variant="danger"
              >
                {t('wiki.mapEditorReset')}
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block max-w-40">
              <span className="field-label">{t('wiki.mapHexNumber')}</span>
              <TextInput
                type="number"
                min={0}
                max={totalHexes - 1}
                value={activeHex}
                onChange={(event) =>
                  setActiveHex(
                    Math.max(
                      0,
                      Math.min(
                        totalHexes - 1,
                        Math.floor(Number(event.target.value) || 0),
                      ),
                    ),
                  )
                }
              />
            </label>
            <Button
              onClick={() =>
                viewportRef
                  .current!.querySelector<HTMLElement>(`[data-hex="${activeHex}"]`)!
                  .focus()
              }
            >
              {t('wiki.mapGoToHex')}
            </Button>
            <Button onClick={downloadDraft}>{t('wiki.mapDraftDownload')}</Button>
            {saveError && <Button onClick={retrySave}>{t('wiki.mapDraftSave')}</Button>}
          </div>
          <p
            role={saveError ? 'alert' : 'status'}
            className={`notice mt-4 ${saveError ? 'notice-error' : ''}`}
          >
            {t(
              saveError
                ? 'wiki.mapDraftUnsaved'
                : localRevealed
                  ? 'wiki.mapDraftSaved'
                  : 'wiki.mapDraftPublished',
            )}
          </p>
          {resetError && (
            <p role="alert" className="notice notice-error mt-3">
              {t('wiki.mapDraftResetError')}
            </p>
          )}
          {downloadError && (
            <p role="alert" className="notice notice-error mt-3">
              {t('wiki.mapDraftDownloadError')}
            </p>
          )}
          <label className="mt-4 block text-xs font-medium text-ink-300">
            {t('wiki.mapEditorExportLabel')}
            <textarea
              readOnly
              rows={5}
              value={editorExport}
              className="ui-field mt-2 block w-full resize-y font-mono leading-5"
            />
          </label>
        </aside>
      )}

      <p id="chult-map-help" className="mb-4 text-sm leading-6 text-ink-400">
        {t('wiki.mapKeyboardHint')}
      </p>
      {imageError && (
        <div role="alert" className="notice notice-error mb-4">
          <p>{t('wiki.mapImageError')}</p>
          <Button
            className="mt-3"
            onClick={() => {
              setImageError(false);
              setImageRetry((value) => value + 1);
            }}
          >
            {t('common.retry')}
          </Button>
        </div>
      )}
      <section className="overflow-hidden rounded-xl border border-ink-700 bg-ink-900">
        <div
          ref={viewportRef}
          className={[
            'wiki-chult-map__viewport',
            zoom > MIN_ZOOM ? 'wiki-chult-map__viewport--zoomed' : '',
            isDragging ? 'wiki-chult-map__viewport--dragging' : '',
          ].join(' ')}
          aria-label={t('wiki.chultMapAlt')}
          aria-describedby="chult-map-help"
          role="region"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget || zoom <= MIN_ZOOM) return;
            const movement: Record<string, MapOffset> = {
              ArrowLeft: { x: 40, y: 0 },
              ArrowRight: { x: -40, y: 0 },
              ArrowUp: { x: 0, y: 40 },
              ArrowDown: { x: 0, y: -40 },
            };
            const step = movement[event.key];
            if (!step) return;
            event.preventDefault();
            setOffset((value) =>
              clampOffset({ x: value.x + step.x, y: value.y + step.y }, zoom),
            );
          }}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            className="wiki-chult-map__canvas"
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`,
            }}
          >
            <img
              className="wiki-chult-map__image"
              key={imageRetry}
              src={imageRetry ? `${imageSrc}?retry=${imageRetry}` : imageSrc}
              hidden={imageError}
              onError={() => setImageError(true)}
              alt={t('wiki.chultMapAlt')}
              loading="eager"
              fetchPriority="high"
              decoding="async"
            />
            {!editorActive && (
              <svg
                className="wiki-chult-map__hidden-grid"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path className="wiki-chult-map__hidden-hexes" d={hiddenHexPath} />
              </svg>
            )}
            {editorActive && (
              <ol className="wiki-chult-map__grid wiki-chult-map__grid--editor">
                {gridItems}
              </ol>
            )}
            {showHexGrid && (
              <svg
                className="wiki-chult-map__grid-lines"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path className="wiki-chult-map__grid-line" d={hexGridPath} />
              </svg>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
