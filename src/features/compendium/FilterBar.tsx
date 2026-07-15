import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Search, Shuffle, SlidersHorizontal, X } from 'lucide-react';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import { HOMEBREW_SOURCE } from '@/features/homebrew/store';
import type { CategoryFilter } from './categories';

interface FilterBarProps {
  filters: CategoryFilter[];
  items: CompendiumEntryBase[];
  selected: Record<string, string[]>;
  onToggle: (filterId: string, value: string) => void;
  onClear: () => void;
  onRandom: () => void;
}

interface FilterGroup {
  filter: CategoryFilter;
  values: string[];
}

function chipClass(active: boolean): string {
  return [
    'rounded-full px-2 py-0.5 text-xs transition-colors',
    active ? 'bg-arcane-600 text-ink-50' : 'bg-ink-800 text-ink-200 hover:bg-ink-700',
  ].join(' ');
}

function FacetSection({
  group,
  selected,
  onToggle,
  search,
  hideLabel,
}: {
  group: FilterGroup;
  selected: string[];
  onToggle: (value: string) => void;
  search: string;
  hideLabel?: boolean;
}) {
  const { filter, values } = group;
  const term = search.trim().toLowerCase();
  const visible = term
    ? values.filter((v) => (filter.labelFor?.(v) ?? v).toLowerCase().includes(term))
    : values;
  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        {!hideLabel && (
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            {filter.label}
          </p>
        )}
        <div className="ml-auto flex gap-2 text-[0.65rem] text-ink-400">
          <button
            type="button"
            onClick={() => visible.forEach((v) => !selected.includes(v) && onToggle(v))}
            className="hover:text-ink-50"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => visible.forEach((v) => selected.includes(v) && onToggle(v))}
            className="hover:text-ink-50"
          >
            Clear
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {visible.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onToggle(value)}
            aria-pressed={selected.includes(value)}
            className={chipClass(selected.includes(value))}
          >
            {filter.labelFor?.(value) ?? value}
          </button>
        ))}
      </div>
    </div>
  );
}

export function FilterBar({
  filters,
  items,
  selected,
  onToggle,
  onClear,
  onRandom,
}: FilterBarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setModalOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const groups = useMemo(
    () =>
      filters.map((filter) => {
        const values = new Set<string>();
        for (const item of items)
          for (const value of filter.valuesFor(item)) values.add(value);
        const sorted = [...values].sort((a, b) =>
          filter.sortKey
            ? filter.sortKey(a) - filter.sortKey(b)
            : (filter.labelFor?.(a) ?? a).localeCompare(filter.labelFor?.(b) ?? b),
        );
        return { filter, values: sorted };
      }),
    [filters, items],
  );

  const sourceGroup = groups.find((g) => g.filter.id === 'source');
  const otherGroups = groups.filter((g) => g.filter.id !== 'source');
  const coreValues = sourceGroup?.values.filter((v) => v !== HOMEBREW_SOURCE) ?? [];
  const homebrewValues = sourceGroup?.values.filter((v) => v === HOMEBREW_SOURCE) ?? [];

  const activeChips = groups.flatMap(({ filter, values }) =>
    values
      .filter((v) => selected[filter.id]?.includes(v))
      .map((value) => ({
        filterId: filter.id,
        value,
        label: filter.labelFor?.(value) ?? value,
      })),
  );
  const activeCount = activeChips.length;

  return (
    <div className="border-b border-ink-700">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-200 hover:text-ink-50"
        >
          <SlidersHorizontal size={15} />
          Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-arcane-700 px-1.5 text-xs text-ink-50">
              {activeCount}
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            aria-pressed={summaryOpen}
            title="Toggle filter summary"
            aria-label="Toggle filter summary"
            className={[
              'rounded p-1 transition-colors',
              summaryOpen
                ? 'bg-ink-800 text-ink-50'
                : 'text-ink-400 hover:bg-ink-800 hover:text-ink-50',
            ].join(' ')}
          >
            <SlidersHorizontal size={14} className="rotate-90" />
          </button>
          <button
            type="button"
            onClick={onRandom}
            title="Random entry"
            aria-label="Jump to a random entry"
            className="rounded p-1 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-50"
          >
            <Shuffle size={14} />
          </button>
          <button
            type="button"
            onClick={onClear}
            disabled={activeCount === 0}
            title="Reset filters"
            aria-label="Reset filters"
            className="rounded p-1 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-50 disabled:opacity-40"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {summaryOpen && activeCount > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-ink-800 px-3 py-2">
          {activeChips.map((chip) => (
            <button
              key={`${chip.filterId}:${chip.value}`}
              type="button"
              onClick={() => onToggle(chip.filterId, chip.value)}
              className="inline-flex items-center gap-1 rounded-full bg-arcane-700 px-2 py-0.5 text-xs text-ink-50 hover:bg-arcane-600"
            >
              {chip.label}
              <X size={10} />
            </button>
          ))}
        </div>
      )}

      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          onClick={() => setModalOpen(false)}
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-4 pt-16"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl border border-ink-700 bg-ink-900 shadow-xl"
          >
            <div className="flex items-center justify-between gap-3 border-b border-ink-700 p-3">
              <div className="flex flex-1 items-center gap-2 rounded-md border border-ink-700 bg-ink-950 px-2 py-1.5">
                <Search size={14} className="text-ink-400" aria-hidden="true" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search filters…"
                  aria-label="Search filter options"
                  className="w-full bg-transparent text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none"
                />
              </div>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className="whitespace-nowrap text-xs text-ink-400 hover:text-ink-50"
                >
                  Clear all
                </button>
              )}
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Close filters"
                className="rounded p-1 text-ink-400 hover:bg-ink-800 hover:text-ink-50"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-4 overflow-y-auto p-4">
              {sourceGroup && (coreValues.length > 0 || homebrewValues.length > 0) && (
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Source
                  </p>
                  {coreValues.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-[0.65rem] italic text-ink-400">
                        Core/Supplements
                      </p>
                      <FacetSection
                        group={{ filter: sourceGroup.filter, values: coreValues }}
                        selected={selected.source ?? []}
                        onToggle={(value) => onToggle('source', value)}
                        search={search}
                        hideLabel
                      />
                    </div>
                  )}
                  {homebrewValues.length > 0 && (
                    <div className="flex flex-col gap-1">
                      <p className="text-[0.65rem] italic text-ink-400">Homebrew</p>
                      <FacetSection
                        group={{ filter: sourceGroup.filter, values: homebrewValues }}
                        selected={selected.source ?? []}
                        onToggle={(value) => onToggle('source', value)}
                        search={search}
                        hideLabel
                      />
                    </div>
                  )}
                </div>
              )}

              {otherGroups.map((group) => (
                <FacetSection
                  key={group.filter.id}
                  group={group}
                  selected={selected[group.filter.id] ?? []}
                  onToggle={(value) => onToggle(group.filter.id, value)}
                  search={search}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
