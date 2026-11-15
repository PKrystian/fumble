import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Pencil,
  Play,
  Star,
  Trash2,
  Music2,
  ListMusic,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, IconButton } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { useT } from '@/i18n/useT';
import { useState } from 'react';
import { thumbnailUrl } from './youtube';
import type { Track } from './validation';

export function TrackCard({
  track,
  name,
  category,
  selected,
  manual,
  first,
  last,
  onPlay,
  onEdit,
  onRemove,
  onFavorite,
  onMove,
}: {
  track: Track;
  name: string;
  category: string;
  selected: boolean;
  manual: boolean;
  first: boolean;
  last: boolean;
  onPlay: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onFavorite: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const { t } = useT();
  const [failedImage, setFailedImage] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: track.id, disabled: !manual });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={panelClass(
        `group min-w-0 overflow-hidden ${selected ? 'border-arcane-300 bg-arcane-950' : 'hover:border-arcane-500'} ${isDragging ? 'opacity-40' : ''}`,
      )}
    >
      <button
        type="button"
        onClick={onPlay}
        aria-label={name}
        aria-pressed={selected}
        className="block w-full text-left"
      >
        <span className="relative flex aspect-video items-center justify-center bg-ink-800">
          {track.videoId && !failedImage ? (
            <img
              src={thumbnailUrl(track.videoId)}
              alt=""
              width={320}
              height={180}
              loading="lazy"
              onError={() => setFailedImage(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <Music2 size={40} aria-hidden="true" className="text-ink-400" />
          )}
          <Play
            size={36}
            aria-hidden="true"
            className="relative text-white drop-shadow"
          />
        </span>
        <span className="block break-words px-3 pt-3 font-medium text-ink-50 [overflow-wrap:anywhere]">
          {name}
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-2 px-3 pt-2 text-xs text-ink-300">
        {track.playlistId ? (
          <ListMusic size={14} aria-hidden="true" />
        ) : (
          <Music2 size={14} aria-hidden="true" />
        )}
        <span>{t(track.playlistId ? 'soundboard.playlist' : 'soundboard.track')}</span>
        <span className="break-words [overflow-wrap:anywhere]">{category}</span>
        {selected && <span>{t('soundboard.selected')}</span>}
      </div>
      <div className="flex flex-wrap gap-1 p-2">
        <IconButton
          size="sm"
          label={t('soundboard.favoriteTrack', { name })}
          aria-pressed={Boolean(track.favorite)}
          onClick={onFavorite}
          variant="ghost"
        >
          <Star
            size={16}
            fill={track.favorite ? 'currentColor' : 'none'}
            aria-hidden="true"
          />
        </IconButton>
        <IconButton
          size="sm"
          label={t('soundboard.editTrack', { name })}
          onClick={onEdit}
          variant="ghost"
        >
          <Pencil size={16} aria-hidden="true" />
        </IconButton>
        <IconButton
          size="sm"
          label={t('soundboard.removeTrack', { name })}
          onClick={onRemove}
          variant="danger"
        >
          <Trash2 size={16} aria-hidden="true" />
        </IconButton>
        {manual && (
          <>
            <IconButton
              size="sm"
              label={t('soundboard.moveEarlier', { name })}
              disabled={first}
              onClick={() => onMove(-1)}
              variant="ghost"
            >
              <ArrowUp size={16} aria-hidden="true" />
            </IconButton>
            <IconButton
              size="sm"
              label={t('soundboard.moveLater', { name })}
              disabled={last}
              onClick={() => onMove(1)}
              variant="ghost"
            >
              <ArrowDown size={16} aria-hidden="true" />
            </IconButton>
            <Button
              {...attributes}
              {...listeners}
              ref={setActivatorNodeRef}
              size="sm"
              iconOnly
              aria-label={t('soundboard.dragTrack', { name })}
              title={t('soundboard.dragTrack', { name })}
              variant="ghost"
              className="touch-none cursor-grab"
            >
              <GripVertical size={16} aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
