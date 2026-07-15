import { useRef, useState } from 'react';
import { GripVertical, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { confirmDialog } from '@/features/ui/confirmStore';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { type Track, useSoundboardStore } from './store';
import { embedUrl, parseYouTubeId, thumbnailUrl } from './youtube';

export function SoundboardPage() {
  const { t } = useT();
  useSeo(t('nav.soundboard'));
  const tracks = useSoundboardStore((s) => s.tracks);
  const addTrack = useSoundboardStore((s) => s.addTrack);
  const removeTrack = useSoundboardStore((s) => s.removeTrack);
  const moveTrack = useSoundboardStore((s) => s.moveTrack);
  const resetToDefaults = useSoundboardStore((s) => s.resetToDefaults);

  const [active, setActive] = useState<Track | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const dragIndex = useRef<number | null>(null);

  const add = () => {
    const videoId = parseYouTubeId(url);
    if (!videoId) {
      setError('Enter a valid YouTube link.');
      return;
    }
    addTrack(name.trim() || 'Untitled track', videoId);
    setName('');
    setUrl('');
    setError('');
  };

  const onDrop = (index: number) => {
    if (dragIndex.current !== null) moveTrack(dragIndex.current, index);
    dragIndex.current = null;
  };

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-ink-50">Soundboard</h1>
        <button
          type="button"
          onClick={async () => {
            const ok = await confirmDialog('Reset the soundboard to defaults?', {
              confirmLabel: 'Reset',
            });
            if (ok) resetToDefaults();
          }}
          className="inline-flex items-center gap-1 rounded-md border border-ink-700 px-3 py-2 text-sm text-ink-300 hover:bg-ink-800"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      {active && (
        <div className="mb-6 overflow-hidden rounded-xl border border-arcane-700 bg-ink-900">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="font-medium text-ink-50">Now playing: {active.name}</span>
            <button
              type="button"
              aria-label="Stop"
              onClick={() => setActive(null)}
              className="rounded p-1 text-ink-300 hover:bg-ink-800 hover:text-ink-50"
            >
              <X size={18} />
            </button>
          </div>
          <iframe
            key={active.id}
            title={active.name}
            src={embedUrl(active.videoId)}
            allow="autoplay; encrypted-media"
            className="aspect-video w-full"
          />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-end gap-2 rounded-xl border border-ink-700 bg-ink-900 p-4">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          <span className="text-xs font-semibold text-ink-400">Name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tavern brawl music"
            className="rounded-md border border-ink-700 bg-ink-950 px-2 py-1 text-ink-50 focus:border-arcane-500 focus:outline-none"
          />
        </label>
        <label className="flex flex-[2] flex-col gap-1 text-sm">
          <span className="text-xs font-semibold text-ink-400">YouTube link</span>
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
          <Plus size={16} /> Add
        </button>
      </div>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tracks.map((track, index) => (
          <li
            key={track.id}
            draggable
            onDragStart={() => (dragIndex.current = index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(index)}
            className="group relative overflow-hidden rounded-xl border border-ink-700 bg-ink-900"
          >
            <button
              type="button"
              onClick={() => setActive(track)}
              className="block w-full text-left"
            >
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
                {track.name}
              </span>
            </button>

            <span className="absolute left-1 top-1 cursor-grab rounded bg-ink-950/70 p-1 text-ink-300 opacity-0 group-hover:opacity-100">
              <GripVertical size={14} />
            </span>
            <button
              type="button"
              aria-label={`Remove ${track.name}`}
              onClick={() => removeTrack(track.id)}
              className="absolute right-1 top-1 rounded bg-ink-950/70 p-1 text-ink-300 opacity-0 hover:text-red-400 group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-xs text-ink-500">
        Tiles play YouTube videos in a looping embedded player. Drag tiles to reorder
        them; your list is saved in this browser.
      </p>
    </div>
  );
}
