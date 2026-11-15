import { useId, useState } from 'react';
import { Button, Select, TextInput } from '@/features/ui/primitives';
import { useT } from '@/i18n/useT';
import { categoryName } from './catalog';
import { parseYouTubeSource, sourceUrl, type YouTubeSource } from './youtube';
import type { SoundboardCategory, Track } from './validation';

export function TrackForm({
  categories,
  category,
  track,
  displayName,
  onSave,
  onCancel,
}: {
  categories: SoundboardCategory[];
  category: string;
  track?: Track;
  displayName?: string;
  onSave: (name: string, source: YouTubeSource, category: string) => void;
  onCancel?: () => void;
}) {
  const { t } = useT();
  const id = useId();
  const [name, setName] = useState(displayName ?? '');
  const [url, setUrl] = useState(track ? sourceUrl(track) : '');
  const [selected, setSelected] = useState<string | null>(null);
  const [invalid, setInvalid] = useState(false);
  const source = parseYouTubeSource(url);
  return (
    <form
      className="grid min-w-0 gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!source) {
          setInvalid(true);
          return;
        }
        const nextCategory = categories.some((item) => item.id === (selected ?? category))
          ? (selected ?? category)
          : 'custom';
        const nextSource =
          !source.videoId && track && track.playlistId === source.playlistId
            ? { ...source, videoId: track.videoId }
            : source;
        onSave(name.trim() || t('soundboard.untitledTrack'), nextSource, nextCategory);
        if (!track) {
          setName('');
          setUrl('');
        }
        setInvalid(false);
      }}
    >
      <div className="grid min-w-0 gap-3 md:grid-cols-2">
        <label className="min-w-0">
          <span className="field-label">{t('soundboard.name')}</span>
          <TextInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t('soundboard.namePlaceholder')}
          />
        </label>
        <label className="min-w-0">
          <span className="field-label">{t('soundboard.categoryLabel')}</span>
          <Select
            value={
              categories.some((item) => item.id === (selected ?? category))
                ? (selected ?? category)
                : 'custom'
            }
            onChange={(event) => setSelected(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {categoryName(item, t)}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <label className="min-w-0">
        <span className="field-label">{t('soundboard.youtubeLink')}</span>
        <TextInput
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setInvalid(false);
          }}
          placeholder={t('soundboard.linkPlaceholder')}
          aria-invalid={invalid}
          aria-describedby={`${id}-help${invalid ? ` ${id}-error` : ''}`}
        />
      </label>
      <p id={`${id}-help`} className="text-sm text-ink-400">
        {source
          ? t(
              source.playlistId
                ? 'soundboard.detectedPlaylist'
                : 'soundboard.detectedTrack',
            )
          : t('soundboard.linkHelp')}
      </p>
      {invalid && (
        <p id={`${id}-error`} role="alert" className="notice notice-error">
          {t('soundboard.invalidLink')}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary">
          {t(track ? 'common.save' : 'soundboard.add')}
        </Button>
        {onCancel && <Button onClick={onCancel}>{t('common.cancel')}</Button>}
      </div>
    </form>
  );
}
