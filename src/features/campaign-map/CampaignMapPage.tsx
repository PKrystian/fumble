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

  useEffect(() => {
    if (!isMapEditorEnabled || !editorStorageKey) {
      setLocalRevealed(null);
      return;
    }
    setLocalRevealed(
      parseMapEditorCells(localStorage.getItem(editorStorageKey), totalHexes),
    );
  }, [editorStorageKey, totalHexes]);

  useSeo(t('wiki.chultMap'));

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
  const editorRanges = compressRevealedRanges(displayedRevealed);
  const editorExport =
    editorRanges.length === 0
      ? 'revealedRanges: []'
      : `revealedRanges: [\n${editorRanges.map((range) => `  '${range}',`).join('\n')}\n]`;
  const editorActive = isMapEditorEnabled && isEditorOpen;

  const toggleHex = (index: number) => {
    const next = new Set(displayedRevealed);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    const sorted = [...next].sort((left, right) => left - right);
    localStorage.setItem(editorStorageKey!, JSON.stringify(sorted));
    setLocalRevealed(next);
    setIsRangesCopied(false);
  };

  const handleHexKeyDown = (event: KeyboardEvent<HTMLSpanElement>, index: number) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    toggleHex(index);
  };

  const copyEditorRanges = async () => {
    await navigator.clipboard.writeText(editorExport);
    setIsRangesCopied(true);
  };

  const resetEditor = () => {
    localStorage.removeItem(editorStorageKey!);
    setLocalRevealed(null);
    setIsRangesCopied(false);
  };

  if (!map) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-ink-50">
          {t('wiki.mapUnavailable')}
        </h1>
        <Link
          to="/wiki"
          className="mt-6 inline-flex items-center gap-2 text-sm text-arcane-300 hover:text-arcane-500"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {t('wiki.backToCampaigns')}
        </Link>
      </div>
    );
  }

  const imageSrc = `${import.meta.env.BASE_URL}${map.imagePath}`;
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            to={`/wiki/${map.campaignId}`}
            className="mb-3 inline-flex items-center gap-2 text-sm text-ink-300 hover:text-ink-50"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            {t('wiki.backToCampaign')}
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-ember-500/40 bg-ember-500/10 p-2 text-ember-400">
              <MapIcon size={22} aria-hidden="true" />
            </span>
            <div>
              <h1 className="font-display text-3xl font-bold text-ink-50">
                {t('wiki.chultMap')}
              </h1>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            aria-label={showHexGrid ? t('wiki.mapGridHide') : t('wiki.mapGridShow')}
            aria-pressed={showHexGrid}
            title={showHexGrid ? t('wiki.mapGridHide') : t('wiki.mapGridShow')}
            onClick={() => setShowHexGrid((current) => !current)}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50"
          >
            <Grid3X3 size={16} aria-hidden="true" />
            {showHexGrid ? t('wiki.mapGridHide') : t('wiki.mapGridShow')}
          </button>
          {isMapEditorEnabled && (
            <button
              type="button"
              aria-label={
                isEditorOpen ? t('wiki.mapEditorClose') : t('wiki.mapEditorOpen')
              }
              title={isEditorOpen ? t('wiki.mapEditorClose') : t('wiki.mapEditorOpen')}
              onClick={() => setIsEditorOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg border border-ember-500/40 bg-ember-500/10 px-3 py-2 text-sm text-ember-300 transition-colors hover:bg-ember-500/20 hover:text-ember-200"
            >
              <Pencil size={16} aria-hidden="true" />
              {isEditorOpen ? t('wiki.mapEditorClose') : t('wiki.mapEditorOpen')}
            </button>
          )}
          <div
            role="group"
            aria-label={t('wiki.mapControls')}
            className="flex items-center gap-1 rounded-lg border border-ink-700 bg-ink-900 p-1 shadow-lg shadow-black/20"
          >
            <button
              type="button"
              aria-label={t('wiki.mapZoomOut')}
              title={t('wiki.mapZoomOut')}
              onClick={() => updateZoom(zoom - ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              className="rounded-md p-2 text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomOut size={17} aria-hidden="true" />
            </button>
            <span
              aria-live="polite"
              className="min-w-12 px-1 text-center text-xs tabular-nums text-ink-300"
            >
              {t('wiki.mapZoomLevel', { percent: zoomPercent })}
            </span>
            <button
              type="button"
              aria-label={t('wiki.mapResetView')}
              title={t('wiki.mapResetView')}
              onClick={resetView}
              className="rounded-md p-2 text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50"
            >
              <RotateCcw size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={t('wiki.mapZoomIn')}
              title={t('wiki.mapZoomIn')}
              onClick={() => updateZoom(zoom + ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              className="rounded-md p-2 text-ink-200 transition-colors hover:bg-ink-800 hover:text-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ZoomIn size={17} aria-hidden="true" />
            </button>
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
              <h2 className="mt-1 font-display text-lg font-semibold text-ink-50">
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
              <button
                type="button"
                onClick={copyEditorRanges}
                className="rounded-md border border-ink-600 bg-ink-900 px-3 py-2 text-sm text-ink-100 transition-colors hover:bg-ink-800"
              >
                {isRangesCopied
                  ? t('wiki.mapEditorCopied')
                  : t('wiki.mapEditorCopyRanges')}
              </button>
              <button
                type="button"
                onClick={resetEditor}
                disabled={localRevealed === null}
                className="rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-300 transition-colors hover:bg-ink-800 hover:text-ink-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('wiki.mapEditorReset')}
              </button>
            </div>
          </div>
          <label className="mt-4 block text-xs font-medium text-ink-300">
            {t('wiki.mapEditorExportLabel')}
            <textarea
              readOnly
              rows={5}
              value={editorExport}
              className="mt-2 block w-full resize-y rounded-lg border border-ink-700 bg-ink-950 p-3 font-mono text-xs leading-5 text-ink-200 outline-none focus:border-arcane-400"
            />
          </label>
        </aside>
      )}

      <section className="overflow-hidden rounded-xl border border-ink-700 bg-ink-900/70 shadow-2xl shadow-black/20">
        <p id="chult-map-help" className="sr-only">
          {t('wiki.chultMapInteractionHint')}
        </p>
        <div
          ref={viewportRef}
          className={[
            'wiki-chult-map__viewport',
            zoom > MIN_ZOOM ? 'wiki-chult-map__viewport--zoomed' : '',
            isDragging ? 'wiki-chult-map__viewport--dragging' : '',
          ].join(' ')}
          aria-label={t('wiki.chultMapAlt')}
          aria-describedby="chult-map-help"
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
              src={imageSrc}
              alt={t('wiki.chultMapAlt')}
            />
            <ol
              className={[
                'wiki-chult-map__grid',
                editorActive ? 'wiki-chult-map__grid--editor' : '',
              ].join(' ')}
              aria-hidden={editorActive ? undefined : true}
            >
              {Array.from({ length: totalHexes }, (_, index) => {
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
                      role={editorActive ? 'button' : undefined}
                      tabIndex={editorActive ? 0 : undefined}
                      aria-label={
                        editorActive
                          ? t('wiki.mapEditorHex', {
                              index,
                              state: isRevealed
                                ? t('wiki.mapEditorRevealed')
                                : t('wiki.mapEditorHidden'),
                            })
                          : undefined
                      }
                      aria-pressed={editorActive ? isRevealed : undefined}
                      onClick={editorActive ? () => toggleHex(index) : undefined}
                      onKeyDown={
                        editorActive
                          ? (event) => handleHexKeyDown(event, index)
                          : undefined
                      }
                    />
                  </li>
                );
              })}
            </ol>
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
