import { useState } from 'react';
import { Button, TextInput } from '@/features/ui/primitives';
import { useT } from '@/i18n/useT';
import { categoryName, categoryNameError } from './catalog';
import type { SoundboardCategory, Track } from './validation';

function CategoryEditor({
  item,
  categories,
  onSave,
  onCancel,
}: {
  item: SoundboardCategory;
  categories: SoundboardCategory[];
  onSave: (name: string) => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [name, setName] = useState(categoryName(item, t));
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="w-full space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        const problem = categoryNameError(name, categories, t, item.id);
        setError(problem);
        if (!problem) onSave(name.trim());
      }}
    >
      <label>
        <span className="field-label">{t('soundboard.categoryName')}</span>
        <TextInput
          autoFocus
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `category-error-${item.id}` : undefined}
        />
      </label>
      {error && (
        <p id={`category-error-${item.id}`} role="alert" className="text-sm text-red-300">
          {t(error)}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="primary">
          {t('common.save')}
        </Button>
        <Button onClick={onCancel}>{t('common.cancel')}</Button>
      </div>
    </form>
  );
}

export function CategoryManager({
  categories,
  tracks,
  onAdd,
  onRename,
  onRemove,
}: {
  categories: SoundboardCategory[];
  tracks: Track[];
  onAdd: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (item: SoundboardCategory) => void;
}) {
  const { t } = useT();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <div>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          const problem = categoryNameError(name, categories, t);
          setError(problem);
          if (!problem) {
            onAdd(name.trim());
            setName('');
          }
        }}
      >
        <label>
          <span className="field-label">{t('soundboard.newCategory')}</span>
          <TextInput
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
            placeholder={t('soundboard.newCategoryPlaceholder')}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'new-category-error' : undefined}
          />
        </label>
        {error && (
          <p id="new-category-error" role="alert" className="text-sm text-red-300">
            {t(error)}
          </p>
        )}
        <Button type="submit">{t('soundboard.addCategory')}</Button>
      </form>
      <ul className="mt-6 divide-y divide-ink-800">
        {categories.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-start justify-between gap-3 py-3"
          >
            {editing === item.id ? (
              <CategoryEditor
                item={item}
                categories={categories}
                onSave={(next) => {
                  onRename(item.id, next);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium text-ink-100 [overflow-wrap:anywhere]">
                    {categoryName(item, t)}
                  </p>
                  <p className="text-sm text-ink-400">
                    {t('soundboard.categoryCount', {
                      count: tracks.filter((track) => track.category === item.id).length,
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    aria-label={t('soundboard.renameCategory', {
                      name: categoryName(item, t),
                    })}
                    onClick={() => setEditing(item.id)}
                  >
                    {t('soundboard.rename')}
                  </Button>
                  {item.id !== 'custom' && (
                    <Button
                      size="sm"
                      variant="danger"
                      aria-label={t('soundboard.removeCategory', {
                        name: categoryName(item, t),
                      })}
                      onClick={() => onRemove(item)}
                    >
                      {t('common.delete')}
                    </Button>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
