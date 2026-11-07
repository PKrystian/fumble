import { Button, SearchField, ToggleChip } from '@/features/ui/primitives';
import { useMemo, useState } from 'react';
import { Pencil, SlidersHorizontal, X } from 'lucide-react';
import { useDialogFocus } from '@/features/ui/useDialogFocus';
import type { CompendiumCategoryId, CompendiumEntryBase } from '@/data/compendium/types';
import { getCategory } from '@/features/compendium/categories';
import { useCategoryItems } from '@/features/compendium/useCategoryItems';
import { applyContentMode } from '@/features/compendium/contentFilter';
import { useContentModeStore } from '@/features/ui/contentModeStore';
import { useT } from '@/i18n/useT';
import { sourceName } from '@/data/compendium/sources';

interface CompendiumPickerProps {
  categoryId: CompendiumCategoryId;
  placeholder: string;
  onPick: (item: CompendiumEntryBase) => void;
}

export function CompendiumPicker({
  categoryId,
  placeholder,
  onPick,
}: CompendiumPickerProps) {
  const { t, locale } = useT();
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const { status, items } = useCategoryItems(getCategory(categoryId));
  const contentMode = useContentModeStore((s) => s.mode);

  const visibleItems = useMemo(
    () => applyContentMode(items, contentMode),
    [items, contentMode],
  );

  const availableSources = useMemo(
    () =>
      [...new Set(visibleItems.map((item) => item.source))].sort((a, b) =>
        sourceName(a, locale).localeCompare(sourceName(b, locale)),
      ),
    [visibleItems, locale],
  );

  const toggleSource = (source: string) =>
    setSelectedSources((prev) =>
      prev.includes(source) ? prev.filter((s) => s !== source) : [...prev, source],
    );

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return visibleItems
      .filter(
        (item) =>
          item.name.toLowerCase().includes(term) &&
          (selectedSources.length === 0 || selectedSources.includes(item.source)),
      )
      .slice(0, 8);
  }, [visibleItems, query, selectedSources]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        <SearchField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            status === 'loading'
              ? t('character.sheet.picker.loadingCompendium')
              : placeholder
          }
          label={placeholder}
          onClear={() => setQuery('')}
          clearLabel={t('common.clearSearch')}
        />
        {availableSources.length > 1 && (
          <Button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-pressed={showFilters}
            aria-label={t('character.sheet.picker.filterBySource')}
            variant="secondary"
            iconOnly
          >
            <SlidersHorizontal size={14} />
            {selectedSources.length > 0 && (
              <span className="ml-1 rounded-full bg-arcane-700 px-1 text-xs text-ink-50">
                {selectedSources.length}
              </span>
            )}
          </Button>
        )}
      </div>
      {showFilters && availableSources.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-1 rounded-md border border-ink-700 bg-ink-900 p-2">
          {availableSources.map((source) => {
            const active = selectedSources.includes(source);
            return (
              <ToggleChip
                key={source}
                type="button"
                onClick={() => toggleSource(source)}
                active={active}
              >
                {sourceName(source, locale)}
              </ToggleChip>
            );
          })}
        </div>
      )}
      {results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-ink-700 bg-ink-800 shadow-xl">
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(item);
                  setQuery('');
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-ink-100 hover:bg-ink-700"
              >
                {item.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface CompendiumSelectModalFieldProps {
  label: string;
  categoryId: CompendiumCategoryId;
  value: string;
  onChange: (name: string) => void;
  placeholder: string;
}

export function CompendiumSelectModalField({
  label,
  categoryId,
  value,
  onChange,
  placeholder,
}: CompendiumSelectModalFieldProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dialogRef = useDialogFocus(open, () => setOpen(false));
  const { status, items } = useCategoryItems(getCategory(categoryId));

  const selected =
    items.find((item) => item.id === value) ??
    items.find((item) => item.name.toLowerCase() === value.trim().toLowerCase());
  const displayName = selected?.name ?? value;

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    const visible = items.filter((item) => !item.hidden);
    const filtered = term
      ? visible.filter((item) => item.name.toLowerCase().includes(term))
      : visible;
    return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
  }, [items, query]);

  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-xs font-semibold text-ink-400">{label}</span>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${label}: ${displayName || t('character.sheet.fields.noneSelected')}`}
        variant="secondary"
        className="w-full justify-between text-left"
      >
        <span className="min-w-0 truncate">
          {displayName || t('character.sheet.fields.noneSelected')}
        </span>
        <Pencil size={13} className="shrink-0 text-ink-400" />
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          ref={dialogRef}
          tabIndex={-1}
          onClick={() => setOpen(false)}
          className="dialog-overlay"
        >
          <div onClick={(e) => e.stopPropagation()} className="dialog-panel">
            <div className="flex items-center justify-between gap-2 border-b border-ink-700 p-3">
              <SearchField
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={status === 'loading' ? t('common.loading') : placeholder}
                label={placeholder}
                onClear={() => setQuery('')}
                clearLabel={t('common.clearSearch')}
              />
              <Button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t('common.close')}
                variant="ghost"
                size="sm"
                iconOnly
              >
                <X size={16} />
              </Button>
            </div>
            <ul className="flex-1 overflow-y-auto p-1">
              {results.length === 0 && (
                <li className="px-3 py-2 text-sm text-ink-400">
                  {t('compendium.noMatches')}
                </li>
              )}
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setQuery('');
                      setOpen(false);
                    }}
                    className="selection-row"
                    aria-pressed={item.id === selected?.id}
                  >
                    {item.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
