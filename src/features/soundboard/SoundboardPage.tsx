import { useEffect, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Button, SearchField, Select, ToggleChip } from '@/features/ui/primitives';
import { confirmDialog } from '@/features/ui/confirmStore';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { useSoundboardStore } from './store';
import {
  allowSoundboardReplacement,
  saveSoundboard,
  useSoundboardSaveStatus,
} from './persistence';
import { downloadSoundboard, downloadSoundboardFile } from './files';
import { categoryName, selectTracks, trackName, type TrackSort } from './catalog';
import { TrackForm } from './TrackForm';
import { TrackCard } from './TrackCard';
import { SoundboardDialog } from './SoundboardDialog';
import { CategoryManager } from './CategoryManager';
import { SoundboardPlayer } from './SoundboardPlayer';
import type { SoundboardCategory, SoundboardData, Track } from './validation';

const PAGE_SIZE = 50;
export function SoundboardPage() {
  const { t, locale } = useT();
  useSeo(t('seo.pageTitles.soundboard'), t('seo.pageDescriptions.soundboard'), false);
  const state = useSoundboardStore();
  const { tracks, categories } = state;
  const saved = useSoundboardSaveStatus();
  const { params, update } = useUrlSearchState();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Track | null>(null);
  const [managing, setManaging] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [downloadError, setDownloadError] = useState(false);
  const [undo, setUndo] = useState<SoundboardData | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  useEffect(() => {
    if (saved.saved) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [saved.saved]);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const requestedCategory = params.get('category');
  const category = categories.some((item) => item.id === requestedCategory)
    ? requestedCategory!
    : 'all';
  const favorites = params.get('favorites') === '1';
  const requestedSort = params.get('sort');
  const sort: TrackSort =
    requestedSort === 'name' || requestedSort === 'recent' ? requestedSort : 'manual';
  const filtered = selectTracks(tracks, { query, category, favorites, sort, locale, t });
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)));
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const active = tracks.find((track) => track.id === activeId);
  const manual = sort === 'manual';
  const nameOf = (track: Track) => trackName(track, locale, t);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const mutate = (action: () => void) => {
    setUndo(null);
    setAdded(null);
    action();
  };
  const snapshot = () => ({
    tracks: useSoundboardStore.getState().tracks,
    categories: useSoundboardStore.getState().categories,
  });
  const download = (original = false) => {
    try {
      if (original && saved.raw !== null)
        downloadSoundboardFile(saved.raw, 'fumble-soundboard-original.json');
      else downloadSoundboard(snapshot());
      setDownloadError(false);
      setFeedback(t('soundboard.downloaded'));
    } catch {
      setDownloadError(true);
    }
  };
  const confirm = (message: string, label: string) =>
    confirmDialog(message, {
      title: t('soundboard.confirmTitle'),
      confirmLabel: label,
      tone: 'danger',
      initialFocus: 'cancel',
    });
  const removeTrack = async (track: Track) => {
    if (
      !(await confirm(
        t('soundboard.removeTrackConfirm', { name: nameOf(track) }),
        t('common.delete'),
      ))
    )
      return;
    const previous = snapshot();
    state.removeTrack(track.id);
    setUndo(previous);
    if (activeId === track.id) setActiveId(null);
    setFeedback(t('soundboard.removed', { name: nameOf(track) }));
  };
  const removeCategory = async (item: SoundboardCategory) => {
    if (
      !(await confirm(
        t('soundboard.removeCategoryConfirm', {
          name: categoryName(item, t),
          count: tracks.filter((track) => track.category === item.id).length,
        }),
        t('common.delete'),
      ))
    )
      return;
    const previous = snapshot();
    state.removeCategory(item.id);
    setUndo(previous);
    if (category === item.id) update({ category: null });
    setFeedback(t('soundboard.removed', { name: categoryName(item, t) }));
  };
  const reset = async (examples: boolean) => {
    if (
      !(await confirm(
        t(examples ? 'soundboard.examplesConfirm' : 'soundboard.clearConfirm'),
        t(examples ? 'soundboard.restoreExamples' : 'soundboard.clear'),
      ))
    )
      return;
    const previous = saved.blocked ? null : snapshot();
    allowSoundboardReplacement();
    if (examples) state.resetToExamples();
    else state.resetEmpty();
    setActiveId(null);
    setUndo(previous);
    setAdded(null);
    update({ category: null, favorites: null });
    setQuery('');
    setPage(1);
    setFeedback(t('soundboard.resetDone'));
  };
  const move = (fromId: string, toId: string) => {
    const from = tracks.findIndex((track) => track.id === fromId);
    const to = tracks.findIndex((track) => track.id === toId);
    const destinationIndex = filtered.findIndex((track) => track.id === toId);
    if (from < 0 || to < 0 || destinationIndex < 0) return;
    mutate(() => state.moveTrack(from, to));
    const destinationPage = Math.floor(destinationIndex / PAGE_SIZE) + 1;
    if (destinationPage !== currentPage) {
      setPage(destinationPage);
      resultsRef.current?.focus();
    }
    setFeedback(t('soundboard.moved', { name: nameOf(tracks[from]!) }));
  };
  const onDragEnd = (event: DragEndEvent) => {
    if (event.over && event.active.id !== event.over.id)
      move(String(event.active.id), String(event.over.id));
  };
  const undoNotice = undo && (
    <div className="notice mt-3 flex flex-wrap items-center justify-between gap-3">
      <span>{t('soundboard.undoHelp')}</span>
      <Button
        onClick={() => {
          state.replaceData(undo);
          setUndo(null);
          setFeedback(t('soundboard.undone'));
        }}
      >
        {t('soundboard.undo')}
      </Button>
    </div>
  );
  const addedTrack = tracks.find((track) => track.id === added);
  return (
    <div className="page-shell">
      <h1 className="page-title">{t('soundboard.title')}</h1>
      <p className="page-description">{t('soundboard.description')}</p>
      <div className="my-6 flex flex-wrap gap-2">
        <Button
          variant="primary"
          disabled={saved.blocked}
          onClick={() => setAdding(true)}
        >
          {t('soundboard.addTrack')}
        </Button>
        <Button onClick={() => setManaging(true)} disabled={saved.blocked}>
          {t('soundboard.manageCategories')}
        </Button>
        <details className="w-full">
          <summary className="back-link cursor-pointer">{t('soundboard.tools')}</summary>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => void reset(false)} variant="danger">
              {t('soundboard.clear')}
            </Button>
            <Button onClick={() => void reset(true)} variant="danger">
              {t('soundboard.restoreExamples')}
            </Button>
          </div>
          <p className="mt-3 text-sm text-ink-400">
            {t('soundboard.backupHelp')}{' '}
            <Link to="/data" className="text-arcane-300 underline">
              {t('nav.data')}
            </Link>
          </p>
        </details>
      </div>
      <div className="mb-6" role={saved.saved ? 'status' : 'alert'}>
        <p className={saved.saved ? 'text-sm text-ink-400' : 'notice notice-error'}>
          {t(
            saved.blocked
              ? 'soundboard.corruptStorage'
              : saved.saved
                ? 'soundboard.saved'
                : 'soundboard.unsaved',
          )}
        </p>
        {!saved.saved && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {saved.blocked ? (
              <Button
                onClick={() => {
                  void useSoundboardStore.persist.rehydrate();
                }}
              >
                {t('soundboard.retryRead')}
              </Button>
            ) : (
              <Button onClick={() => saveSoundboard(snapshot())}>
                {t('soundboard.retrySave')}
              </Button>
            )}
            <Button
              disabled={saved.blocked && saved.raw === null}
              onClick={() => download(saved.blocked)}
            >
              {t(
                saved.blocked
                  ? 'soundboard.downloadOriginal'
                  : 'soundboard.emergencyExport',
              )}
            </Button>
            <Link to="/data" className="back-link">
              {t('nav.data')}
            </Link>
          </div>
        )}
      </div>
      <div aria-live="polite" aria-atomic="true" className="mb-4 min-h-6">
        <p className="text-sm text-ink-300">{feedback}</p>
      </div>
      {downloadError && (
        <p role="alert" className="notice notice-error mb-4">
          {t('soundboard.downloadError')}
        </p>
      )}
      {undoNotice}
      {!saved.blocked && (
        <>
          {active && (
            <SoundboardPlayer
              key={`${active.id}:${active.videoId}:${active.playlistId ?? ''}`}
              track={active}
              name={nameOf(active)}
              onStop={() => setActiveId(null)}
            />
          )}
          {addedTrack && (
            <Button
              className="mb-4"
              onClick={() => {
                setQuery('');
                update({ category: addedTrack.category, favorites: null });
                const list = selectTracks(tracks, {
                  query: '',
                  category: addedTrack.category,
                  favorites: false,
                  sort,
                  locale,
                  t,
                });
                setPage(
                  Math.floor(
                    list.findIndex((track) => track.id === addedTrack.id) / PAGE_SIZE,
                  ) + 1,
                );
                setAdded(null);
              }}
            >
              {t('soundboard.showAdded')}
            </Button>
          )}
          <section className="catalog-toolbar mb-4" aria-labelledby="soundboard-results">
            <h2
              ref={resultsRef}
              tabIndex={-1}
              id="soundboard-results"
              className="section-title"
            >
              {t('soundboard.library')}
            </h2>
            <div className="mt-3 grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(160px,220px)]">
              <div className="min-w-0">
                <SearchField
                  label={t('soundboard.search')}
                  placeholder={t('soundboard.search')}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPage(1);
                  }}
                  onClear={() => {
                    setQuery('');
                    setPage(1);
                  }}
                  clearLabel={t('common.clearSearch')}
                />
              </div>
              <label>
                <span className="field-label">{t('soundboard.sort')}</span>
                <Select
                  value={sort}
                  onChange={(event) => {
                    update({
                      sort: event.target.value === 'manual' ? null : event.target.value,
                    });
                    setPage(1);
                  }}
                >
                  <option value="manual">{t('soundboard.sortManual')}</option>
                  <option value="name">{t('soundboard.sortName')}</option>
                  <option value="recent">{t('soundboard.sortRecent')}</option>
                </Select>
              </label>
            </div>
            <div
              className="mt-4 flex flex-wrap gap-2"
              aria-label={t('soundboard.categories')}
            >
              <ToggleChip
                active={category === 'all'}
                onClick={() => {
                  update({ category: null });
                  setPage(1);
                }}
              >
                {t('soundboard.category.all')} ({tracks.length})
              </ToggleChip>
              {categories.map((item) => (
                <ToggleChip
                  key={item.id}
                  active={category === item.id}
                  onClick={() => {
                    update({ category: item.id });
                    setPage(1);
                  }}
                >
                  {categoryName(item, t)} (
                  {tracks.filter((track) => track.category === item.id).length})
                </ToggleChip>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ToggleChip
                active={favorites}
                onClick={() => {
                  update({ favorites: favorites ? null : '1' });
                  setPage(1);
                }}
              >
                {t('soundboard.favorites')} (
                {tracks.filter((track) => track.favorite).length})
              </ToggleChip>
              {(favorites || category !== 'all') && (
                <Button
                  size="sm"
                  onClick={() => {
                    update({ category: null, favorites: null });
                    setPage(1);
                  }}
                >
                  {t('soundboard.resetFilters')}
                </Button>
              )}
              <p role="status" className="text-sm text-ink-300">
                {t('soundboard.results', {
                  count: filtered.length,
                  from: filtered.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0,
                  to: Math.min(currentPage * PAGE_SIZE, filtered.length),
                })}
              </p>
            </div>
            {!manual && (
              <p className="mt-3 text-sm text-ink-400">{t('soundboard.reorderHelp')}</p>
            )}
          </section>
          {visible.length === 0 && (
            <p className="empty-state">
              {t(
                tracks.length === 0
                  ? 'soundboard.emptyPanel'
                  : query.trim()
                    ? 'soundboard.noMatches'
                    : favorites
                      ? 'soundboard.noFavorites'
                      : 'soundboard.emptyState',
              )}
            </p>
          )}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
            accessibility={{
              screenReaderInstructions: { draggable: t('soundboard.dragInstructions') },
              announcements: {
                onDragStart: ({ active: item }) =>
                  t('soundboard.dragStarted', {
                    name: nameOf(tracks.find((track) => track.id === item.id)!),
                  }),
                onDragOver: ({ active: dragging, over }) =>
                  over && over.id !== dragging.id
                    ? t('soundboard.dragOver', {
                        name: nameOf(tracks.find((track) => track.id === over.id)!),
                      })
                    : undefined,
                onDragEnd: ({ active: item, over }) =>
                  t(over ? 'soundboard.dragFinished' : 'soundboard.dragCancelled', {
                    name: nameOf(tracks.find((track) => track.id === item.id)!),
                  }),
                onDragCancel: () => t('soundboard.dragCancelled'),
              },
            }}
          >
            <SortableContext
              items={visible.map((track) => track.id)}
              strategy={rectSortingStrategy}
            >
              <ul className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visible.map((track) => {
                  const index = filtered.findIndex((item) => item.id === track.id);
                  return (
                    <TrackCard
                      key={`${track.id}:${track.videoId}`}
                      track={track}
                      name={nameOf(track)}
                      category={categoryName(
                        categories.find((item) => item.id === track.category)!,
                        t,
                      )}
                      selected={activeId === track.id}
                      manual={manual}
                      first={index === 0}
                      last={index === filtered.length - 1}
                      onPlay={() => setActiveId(track.id)}
                      onEdit={() => setEditing(track)}
                      onRemove={() => void removeTrack(track)}
                      onFavorite={() => mutate(() => state.toggleFavorite(track.id))}
                      onMove={(direction) =>
                        move(track.id, filtered[index + direction]!.id)
                      }
                    />
                  );
                })}
              </ul>
            </SortableContext>
          </DndContext>
          {filtered.length > PAGE_SIZE && (
            <nav
              className="my-6 flex flex-wrap items-center justify-between gap-3"
              aria-label={t('soundboard.pagination')}
            >
              <Button
                disabled={currentPage === 1}
                onClick={() => {
                  setPage(currentPage - 1);
                  resultsRef.current?.focus();
                }}
              >
                {t('soundboard.previous')}
              </Button>
              <span className="text-sm text-ink-300">
                {currentPage} / {Math.ceil(filtered.length / PAGE_SIZE)}
              </span>
              <Button
                disabled={currentPage * PAGE_SIZE >= filtered.length}
                onClick={() => {
                  setPage(currentPage + 1);
                  resultsRef.current?.focus();
                }}
              >
                {t('soundboard.next')}
              </Button>
            </nav>
          )}
        </>
      )}
      {managing && (
        <SoundboardDialog
          title={t('soundboard.manageCategories')}
          onClose={() => setManaging(false)}
        >
          <CategoryManager
            categories={categories}
            tracks={tracks}
            onAdd={(name) => mutate(() => state.addCategory(name))}
            onRename={(id, name) => mutate(() => state.renameCategory(id, name))}
            onRemove={(item) => void removeCategory(item)}
          />
          {undoNotice}
        </SoundboardDialog>
      )}
      {adding && (
        <SoundboardDialog
          title={t('soundboard.addTrack')}
          onClose={() => setAdding(false)}
        >
          <TrackForm
            categories={categories}
            category={category === 'all' ? 'custom' : category}
            onCancel={() => setAdding(false)}
            onSave={(name, source, nextCategory) => {
              let id = '';
              mutate(() => {
                id = state.addTrack(
                  name,
                  source.videoId,
                  nextCategory,
                  source.playlistId,
                );
              });
              setAdded(id);
              setAdding(false);
              setFeedback(
                t('soundboard.added', {
                  name,
                  category: categoryName(
                    categories.find((item) => item.id === nextCategory)!,
                    t,
                  ),
                }),
              );
            }}
          />
        </SoundboardDialog>
      )}
      {editing && (
        <SoundboardDialog
          title={t('soundboard.editTrack', { name: nameOf(editing) })}
          onClose={() => setEditing(null)}
        >
          <TrackForm
            categories={categories}
            category={editing.category}
            track={editing}
            displayName={nameOf(editing)}
            onCancel={() => setEditing(null)}
            onSave={(name, source, nextCategory) => {
              const renamed = name !== nameOf(editing);
              mutate(() =>
                state.updateTrack(
                  editing.id,
                  renamed ? name : editing.name,
                  source,
                  nextCategory,
                  Boolean(editing.customName) || renamed,
                ),
              );
              setEditing(null);
              setFeedback(t('soundboard.updated', { name }));
            }}
          />
        </SoundboardDialog>
      )}
      <p className="mt-6 text-sm text-ink-400">{t('soundboard.footerNote')}</p>
    </div>
  );
}
