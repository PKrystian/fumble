import { Button, SearchField, Select } from '@/features/ui/primitives';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { wikiCatalog, WIKI_PAGE_SIZE } from './catalog';
import { isWikiPageIndexable } from './indexability';
import type { WikiCampaign } from './types';

export function WikiCatalog({
  campaign,
  selected,
  onNavigate,
}: {
  campaign: WikiCampaign;
  selected?: string | undefined;
  onNavigate?: (() => void) | undefined;
}) {
  const { locale, t } = useT();
  const { params, update } = useUrlSearchState();
  const query = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const uncategorized = !category && params.get('uncategorized') === '1';
  const categories = [
    ...new Set(campaign.pages.filter(isWikiPageIndexable).map((page) => page.category)),
  ].sort((a, b) => a.localeCompare(b, locale));
  const results = wikiCatalog(campaign.pages, locale, query, category, uncategorized);
  const pageCount = Math.max(1, Math.ceil(results.length / WIKI_PAGE_SIZE));
  const page = Math.min(
    pageCount,
    Math.max(1, Math.floor(Number(params.get('page')) || 1)),
  );
  const visible = results.slice((page - 1) * WIKI_PAGE_SIZE, page * WIKI_PAGE_SIZE);
  const grouped = new Map<string, typeof visible>();
  for (const entry of visible)
    grouped.set(entry.category, [...(grouped.get(entry.category) ?? []), entry]);
  const search = params.toString();
  return (
    <div className="space-y-4">
      <SearchField
        value={query}
        onChange={(event) => update({ q: event.target.value, page: null }, true)}
        onClear={() => update({ q: null, page: null }, true)}
        label={t('wiki.search')}
        clearLabel={t('common.clearSearch')}
        placeholder={t('wiki.search')}
      />
      <label className="block">
        <span className="field-label">{t('wiki.category')}</span>
        <Select
          value={category ? JSON.stringify(category) : uncategorized ? '""' : ''}
          onChange={(event) => {
            const value = event.target.value
              ? (JSON.parse(event.target.value) as string)
              : null;
            update({
              category: value,
              uncategorized: value === '' ? '1' : null,
              page: null,
            });
          }}
        >
          <option value="">{t('wiki.allCategories')}</option>
          {category && !categories.includes(category) && (
            <option value={JSON.stringify(category)}>{category}</option>
          )}
          {categories.map((value) => (
            <option key={value} value={JSON.stringify(value)}>
              {value || t('wiki.general')}
            </option>
          ))}
        </Select>
      </label>
      {(category || uncategorized) && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => update({ category: null, uncategorized: null, page: null })}
        >
          {t('wiki.resetCategory')}
        </Button>
      )}
      <p role="status" className="text-sm text-ink-400">
        {t('wiki.resultCount', {
          count: results.length,
          from: results.length ? (page - 1) * WIKI_PAGE_SIZE + 1 : 0,
          to: Math.min(page * WIKI_PAGE_SIZE, results.length),
        })}
      </p>
      {results.length === 0 ? (
        <p className="empty-state">{t('wiki.noResults')}</p>
      ) : (
        <nav aria-label={t('wiki.allPages')}>
          {[...grouped].map(([name, pages]) => (
            <section key={name} className="mb-5">
              <h3 className="mb-2 text-sm font-semibold text-ink-300">
                {name || t('wiki.general')}
              </h3>
              {pages.map((entry) => (
                <Link
                  key={entry.slug}
                  to={`/wiki/${campaign.id}/${entry.slug}${search ? `?${search}` : ''}`}
                  aria-current={entry.slug === selected ? 'page' : undefined}
                  className={`selection-row block ${entry.slug === selected ? 'bg-arcane-950 font-semibold' : ''}`}
                  onClick={onNavigate}
                >
                  {entry.title}
                </Link>
              ))}
            </section>
          ))}
        </nav>
      )}
      {pageCount > 1 && (
        <nav
          aria-label={t('wiki.pagination')}
          className="flex flex-wrap items-center gap-2"
        >
          <Button
            size="sm"
            disabled={page === 1}
            onClick={() => update({ page: String(page - 1) })}
          >
            {t('wiki.previous')}
          </Button>
          <span className="text-sm text-ink-400">
            {t('wiki.pageNumber', { page, count: pageCount })}
          </span>
          <Button
            size="sm"
            disabled={page === pageCount}
            onClick={() => update({ page: String(page + 1) })}
          >
            {t('wiki.next')}
          </Button>
        </nav>
      )}
    </div>
  );
}
