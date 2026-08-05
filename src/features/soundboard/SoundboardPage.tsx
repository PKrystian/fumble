import { useState } from 'react';
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { rectSortingStrategy, SortableContext, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Eraser,
  GripVertical,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  X,
} from 'lucide-react';
import { confirmDialog } from '@/features/ui/confirmStore';
import plBardifyNames from '@/data/generated/pl/bardify.json';
import type { Locale } from '@/i18n/locales';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { type SoundboardCategory, type Track, useSoundboardStore } from './store';
import { embedUrl, parseYouTubeId, thumbnailUrl } from './youtube';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';

const DEFAULT_TRACK_NAME_KEYS: Record<string, string> = {
  'bardify-playlist-places': 'soundboard.defaultTrack.places',
  'bardify-playlist-planes': 'soundboard.defaultTrack.planes',
  'bardify-playlist-situations': 'soundboard.defaultTrack.situations',
  'bardify-playlist-settlements': 'soundboard.defaultTrack.settlements',
  'bardify-playlist-ambience': 'soundboard.defaultTrack.ambience',
  'bardify-playlist-travel': 'soundboard.defaultTrack.travel',
  'bardify-playlist-dungeons': 'soundboard.defaultTrack.dungeons',
  'bardify-playlist-tavern': 'soundboard.defaultTrack.tavern',
  'bardify-playlist-combat': 'soundboard.defaultTrack.combat',
};

function displayTrackName(
  track: Track,
  t: (key: string) => string,
  locale: Locale,
): string {
  if (locale === 'pl') {
    const localized = (plBardifyNames as Record<string, string>)[track.id];
    if (localized) return localized;
  }
  const key = DEFAULT_TRACK_NAME_KEYS[track.id];
  return key ? t(key) : track.name;
}

interface SortableTrackProps {
  track: Track;
  categories: SoundboardCategory[];
  selected: boolean;
  editing: boolean;
  onPlay: () => void;
  onEdit: () => void;
  onFinishEditing: () => void;
  onRemove: () => void;
  onCategoryChange: (category: string) => void;
}

function SortableTrack({
  track,
  categories,
  selected,
  editing,
  onPlay,
  onEdit,
  onFinishEditing,
  onRemove,
  onCategoryChange,
}: SortableTrackProps) {
  const { t, locale } = useT();
  const displayName = displayTrackName(track, t, locale);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: track.id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        'group relative overflow-hidden rounded-xl border bg-ink-900 will-change-transform',
        isDragging ? 'z-10 opacity-35' : '',
        selected
          ? 'border-arcane-300 ring-2 ring-arcane-700'
          : 'border-ink-700 hover:border-arcane-500',
      ].join(' ')}
    >
      <button type="button" onClick={onPlay} className="block w-full text-left">
        <div className="relative aspect-video bg-ink-800">
          <img
            src={thumbnailUrl(track.videoId)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <Play className="text-ink-50 drop-shadow" size={36} />
          </span>
        </div>
        <span className="block truncate px-3 py-2 text-sm font-medium text-ink-50">
          {displayName}
        </span>
      </button>

      {editing && (
        <div className="border-t border-ink-700 p-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-ink-400">
            {t('soundboard.categoryLabel')}
            <select
              value={track.category}
              onChange={(event) => onCategoryChange(event.target.value)}
              aria-label={t('soundboard.changeTrackCategory', { name: displayName })}
              className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5 text-sm font-normal text-ink-50 focus:border-arcane-500 focus:outline-none"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name ?? t(`soundboard.category.${category.id}`)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={onFinishEditing}
            className="mt-2 w-full rounded-md bg-arcane-700 px-3 py-1.5 text-xs font-medium text-ink-50 hover:bg-arcane-500"
          >
            {t('soundboard.done')}
          </button>
        </div>
      )}

      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t('common.dragToReorder')}
        className="absolute left-1 top-1 cursor-grab touch-none rounded bg-ink-950/80 p-1.5 text-ink-300 opacity-100 hover:text-ink-50 active:cursor-grabbing sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100"
      >
        <GripVertical size={14} />
      </button>
      <div className="absolute right-1 top-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
        <button
          type="button"
          aria-label={t('soundboard.editTrack', { name: displayName })}
          onClick={onEdit}
          className="rounded bg-ink-950/80 p-1.5 text-ink-300 hover:text-ink-50"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          aria-label={t('soundboard.removeTrack', { name: displayName })}
          onClick={onRemove}
          className="rounded bg-ink-950/80 p-1.5 text-ink-300 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

function TrackOverlay({ track }: { track: Track }) {
  const { t, locale } = useT();
  return (
    <div className="w-56 rotate-1 overflow-hidden rounded-xl border border-arcane-400 bg-ink-900 shadow-2xl shadow-black/60">
      <img
        src={thumbnailUrl(track.videoId)}
        alt=""
        className="aspect-video w-full object-cover"
      />
      <div className="truncate px-3 py-2 text-sm font-medium text-ink-50">
        {displayTrackName(track, t, locale)}
      </div>
    </div>
  );
}

export function SoundboardPage() {
  const { t, locale } = useT();
  useSeo(t('seo.pageTitles.soundboard'), t('seo.pageDescriptions.soundboard'));
  const tracks = useSoundboardStore((s) => s.tracks);
  const categories = useSoundboardStore((s) => s.categories);
  const addTrack = useSoundboardStore((s) => s.addTrack);
  const removeTrack = useSoundboardStore((s) => s.removeTrack);
  const moveTrack = useSoundboardStore((s) => s.moveTrack);
  const setTrackCategory = useSoundboardStore((s) => s.setTrackCategory);
  const addCategory = useSoundboardStore((s) => s.addCategory);
  const renameCategory = useSoundboardStore((s) => s.renameCategory);
  const removeCategory = useSoundboardStore((s) => s.removeCategory);
  const resetEmpty = useSoundboardStore((s) => s.resetEmpty);
  const resetToExamples = useSoundboardStore((s) => s.resetToExamples);

  const [active, setActive] = useState<Track | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('custom');
  const [newCategory, setNewCategory] = useState('');
  const [managingCategories, setManagingCategories] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [draggedTrackId, setDraggedTrackId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const { params, update } = useUrlSearchState();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  );
  const requestedCategory = params.get('category');
  const category =
    requestedCategory &&
    categories.some((soundboardCategory) => soundboardCategory.id === requestedCategory)
      ? requestedCategory
      : 'all';
  const visibleTracks =
    category === 'all' ? tracks : tracks.filter((track) => track.category === category);
  const categoryLabel = (id: string, customName: string | null = null) =>
    customName ?? t(`soundboard.category.${id}`);

  const add = () => {
    const videoId = parseYouTubeId(url);
    if (!videoId) {
      setError(t('soundboard.invalidLink'));
      return;
    }
    addTrack(name.trim() || t('soundboard.untitledTrack'), videoId, selectedCategory);
    setName('');
    setUrl('');
    setError('');
  };

  const onDragStart = (event: DragStartEvent) => {
    setDraggedTrackId(event.active.id as string);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setDraggedTrackId(null);
    if (!event.over || event.active.id === event.over.id) return;
    const from = tracks.findIndex((track) => track.id === event.active.id);
    const to = tracks.findIndex((track) => track.id === event.over?.id);
    if (from >= 0 && to >= 0) moveTrack(from, to);
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-ink-50">
          {t('soundboard.title')}
        </h1>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setManagingCategories((open) => !open)}
            aria-expanded={managingCategories}
            className="inline-flex items-center gap-1 rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-300 hover:bg-ink-800"
          >
            <Settings2 size={14} /> {t('soundboard.manageCategories')}
          </button>
          <button
            type="button"
            onClick={async () => {
              const ok = await confirmDialog(t('soundboard.clearConfirm'), {
                confirmLabel: t('soundboard.clear'),
              });
              if (ok) {
                resetEmpty();
                setActive(null);
                update({ category: null });
                setSelectedCategory('custom');
              }
            }}
            className="inline-flex items-center gap-1 rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-300 hover:bg-ink-800"
          >
            <Eraser size={14} /> {t('soundboard.clear')}
          </button>
          <button
            type="button"
            onClick={async () => {
              const ok = await confirmDialog(t('soundboard.examplesConfirm'), {
                confirmLabel: t('soundboard.restoreExamples'),
              });
              if (ok) {
                resetToExamples();
                setActive(null);
                update({ category: null });
                setSelectedCategory('custom');
              }
            }}
            className="inline-flex items-center gap-1 rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-300 hover:bg-ink-800"
          >
            <RotateCcw size={14} /> {t('soundboard.restoreExamples')}
          </button>
        </div>
      </div>

      {active && (
        <div className="mb-6 overflow-hidden rounded-xl border border-arcane-700 bg-ink-900">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="font-medium text-ink-50">
              {t('soundboard.nowPlaying', { name: displayTrackName(active, t, locale) })}
            </span>
            <button
              type="button"
              aria-label={t('soundboard.stop')}
              onClick={() => setActive(null)}
              className="rounded p-1 text-ink-300 hover:bg-ink-800 hover:text-ink-50"
            >
              <X size={18} />
            </button>
          </div>
          <iframe
            key={active.id}
            title={displayTrackName(active, t, locale)}
            src={embedUrl(active.videoId, active.playlistId)}
            allow="autoplay; encrypted-media"
            className="aspect-video w-full"
          />
        </div>
      )}

      {managingCategories && (
        <section className="mb-6 rounded-xl border border-ink-700 bg-ink-900 p-4">
          <h2 className="font-display text-lg font-bold text-ink-50">
            {t('soundboard.manageCategories')}
          </h2>
          <div className="mt-4 flex gap-2">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && newCategory.trim()) {
                  addCategory(newCategory.trim());
                  setNewCategory('');
                }
              }}
              aria-label={t('soundboard.newCategory')}
              placeholder={t('soundboard.newCategoryPlaceholder')}
              className="min-w-0 flex-1 rounded-md border border-ink-700 bg-ink-950 px-3 py-2 text-sm text-ink-50 focus:border-arcane-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={!newCategory.trim()}
              onClick={() => {
                addCategory(newCategory.trim());
                setNewCategory('');
              }}
              className="inline-flex items-center gap-1 rounded-md bg-arcane-700 px-3 py-2 text-sm font-medium text-ink-50 hover:bg-arcane-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={16} /> {t('soundboard.addCategory')}
            </button>
          </div>
          <ul className="mt-4 divide-y divide-ink-800">
            {categories.map((soundboardCategory) => (
              <li key={soundboardCategory.id} className="flex items-center gap-2 py-2">
                <input
                  value={categoryLabel(soundboardCategory.id, soundboardCategory.name)}
                  onChange={(event) =>
                    renameCategory(soundboardCategory.id, event.target.value)
                  }
                  aria-label={t('soundboard.renameCategory', {
                    name: categoryLabel(soundboardCategory.id, soundboardCategory.name),
                  })}
                  className="min-w-0 flex-1 rounded-md border border-ink-700 bg-ink-950 px-3 py-1.5 text-sm text-ink-50 focus:border-arcane-500 focus:outline-none"
                />
                {soundboardCategory.id !== 'custom' && (
                  <button
                    type="button"
                    onClick={() => {
                      removeCategory(soundboardCategory.id);
                      if (selectedCategory === soundboardCategory.id) {
                        setSelectedCategory('custom');
                      }
                      if (category === soundboardCategory.id) {
                        update({ category: null });
                      }
                    }}
                    aria-label={t('soundboard.removeCategory', {
                      name: categoryLabel(soundboardCategory.id, soundboardCategory.name),
                    })}
                    className="rounded p-2 text-ink-400 hover:bg-ink-800 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-ink-700 bg-ink-900 p-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-xs font-semibold text-ink-400">
            {t('soundboard.name')}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('soundboard.namePlaceholder')}
            className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-ink-50 focus:border-arcane-500 focus:outline-none"
          />
        </label>
        <label className="flex min-w-40 flex-col gap-1 text-sm">
          <span className="text-xs font-semibold text-ink-400">
            {t('soundboard.categoryLabel')}
          </span>
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-ink-50 focus:border-arcane-500 focus:outline-none"
          >
            {categories.map((soundboardCategory) => (
              <option key={soundboardCategory.id} value={soundboardCategory.id}>
                {categoryLabel(soundboardCategory.id, soundboardCategory.name)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-[2] flex-col gap-1 text-sm">
          <span className="text-xs font-semibold text-ink-400">
            {t('soundboard.youtubeLink')}
          </span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="https://www.youtube.com/watch?v=…"
            className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-ink-50 focus:border-arcane-500 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-md bg-arcane-700 px-4 py-2 text-sm font-medium text-ink-50 hover:bg-arcane-500"
        >
          <Plus size={16} /> {t('soundboard.add')}
        </button>
      </div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div className="mb-4 flex flex-wrap gap-2" aria-label={t('soundboard.categories')}>
        {[
          { id: 'all', name: t('soundboard.category.all') },
          ...categories.map((item) => ({
            id: item.id,
            name: categoryLabel(item.id, item.name),
          })),
        ].map((item) => {
          const selected = category === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected}
              onClick={() => update({ category: item.id === 'all' ? null : item.id })}
              className={[
                'rounded-full px-3 py-1 text-sm font-medium transition-colors',
                selected
                  ? 'bg-arcane-700 text-white ring-1 ring-arcane-300'
                  : 'bg-ink-800 text-ink-200 hover:bg-ink-700',
              ].join(' ')}
            >
              {item.name}
            </button>
          );
        })}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={() => setDraggedTrackId(null)}
      >
        <SortableContext
          items={visibleTracks.map((track) => track.id)}
          strategy={rectSortingStrategy}
        >
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibleTracks.map((track) => (
              <SortableTrack
                key={track.id}
                track={track}
                categories={categories}
                selected={active?.id === track.id}
                editing={editingTrackId === track.id}
                onPlay={() => setActive(track)}
                onEdit={() =>
                  setEditingTrackId((current) => (current === track.id ? null : track.id))
                }
                onFinishEditing={() => setEditingTrackId(null)}
                onRemove={() => {
                  removeTrack(track.id);
                  if (editingTrackId === track.id) setEditingTrackId(null);
                }}
                onCategoryChange={(nextCategory) =>
                  setTrackCategory(track.id, nextCategory)
                }
              />
            ))}
          </ul>
        </SortableContext>
        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
          {draggedTrackId ? (
            <TrackOverlay track={tracks.find((track) => track.id === draggedTrackId)!} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <p className="mt-6 text-xs text-ink-500">{t('soundboard.footerNote')}</p>
    </div>
  );
}
