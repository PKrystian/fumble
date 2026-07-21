import { useState } from 'react';
import { BookOpen, Scroll, Search } from 'lucide-react';
import type { BookIndexEntry } from '@/data/compendium/types';
import { imageUrl } from '@/data/compendium/images';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { adventures, books } from './data';

function DocList({ items }: { items: BookIndexEntry[] }) {
  const { t } = useT();
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((doc) => (
        <li key={`${doc.type}-${doc.id}`}>
          <Link
            to={`/books/${doc.id}`}
            className="group flex h-full flex-col gap-2 rounded-lg border border-ink-700 bg-ink-900 p-3 transition-all hover:-translate-y-0.5 hover:border-arcane-500 hover:bg-ink-800"
          >
            {doc.cover ? (
              <img
                src={imageUrl(doc.cover)}
                alt=""
                loading="lazy"
                className="aspect-[2/3] w-full rounded object-cover"
              />
            ) : (
              <span className="flex aspect-[2/3] w-full items-center justify-center rounded bg-ink-800 text-ink-600">
                {doc.type === 'adventure' ? <Scroll size={28} /> : <BookOpen size={28} />}
              </span>
            )}
            <span className="font-medium text-ink-50 group-hover:text-arcane-300">
              {doc.name}
            </span>
            <span className="text-xs text-ink-400">
              {doc.storyline ? `${doc.storyline} · ` : ''}
              {t(doc.contents.length === 1 ? 'books.chapterOne' : 'books.chapterOther', {
                count: doc.contents.length,
              })}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function BooksPage() {
  const { t } = useT();
  useSeo(t('books.title'), t('books.subtitle'));
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const match = (d: BookIndexEntry) => !term || d.name.toLowerCase().includes(term);
  const shownBooks = books.filter(match);
  const shownAdventures = adventures.filter(match);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-bold text-ink-50">
          {t('books.title')}
        </h1>
        <p className="mt-1 text-sm text-ink-300">{t('books.subtitle')}</p>
      </header>

      <div className="mb-6 flex max-w-md items-center gap-2 rounded-lg bg-ink-800 px-3 py-2">
        <Search size={16} className="text-ink-400" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('books.searchPlaceholder')}
          aria-label={t('books.searchLabel')}
          className="w-full bg-transparent text-sm text-ink-50 placeholder:text-ink-400 focus:outline-none"
        />
      </div>

      {shownBooks.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
            <BookOpen size={14} /> {t('books.rulebooks')} ({shownBooks.length})
          </h2>
          <DocList items={shownBooks} />
        </section>
      )}

      {shownAdventures.length > 0 && (
        <section>
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-400">
            <Scroll size={14} /> {t('books.adventures')} ({shownAdventures.length})
          </h2>
          <DocList items={shownAdventures} />
        </section>
      )}

      {shownBooks.length === 0 && shownAdventures.length === 0 && (
        <p className="text-sm text-ink-400">{t('books.noMatches', { query })}</p>
      )}
    </div>
  );
}
