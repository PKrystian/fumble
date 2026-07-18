import { EntryRenderer } from '@/features/compendium/EntryRenderer';
import type { HomebrewCompendiumItem } from './store';

export function HomebrewDetail({ item }: { item: HomebrewCompendiumItem }) {
  return (
    <article className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-2xl font-bold text-ink-50">{item.name}</h2>
          <span className="rounded-full border border-ember-500/50 px-2 py-0.5 text-xs uppercase tracking-wide text-ember-400">
            Homebrew
          </span>
        </div>
        {item.subtitle && <p className="text-sm italic text-ink-300">{item.subtitle}</p>}
      </header>
      {item.entries.length > 0 && (
        <div className="flex flex-col gap-3">
          <EntryRenderer entries={item.entries} />
        </div>
      )}
    </article>
  );
}
