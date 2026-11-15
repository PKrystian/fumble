import { useId } from 'react';
import { Button, IconButton, SearchField, Select } from '@/features/ui/primitives';
import { ArrowDownWideNarrow, ArrowUpWideNarrow } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { formatDuration, sessionDateValue, type Session } from './store';
import { filterSessions, type JournalSort } from './journal';

export interface JournalListView {
  query: string;
  campaign: string;
  sort: JournalSort;
  direction: 'asc' | 'desc';
  page: number;
}

export function SessionList({
  sessions,
  selectedId,
  view,
  onView,
  onSelect,
}: {
  sessions: Session[];
  selectedId: string | null;
  view: JournalListView;
  onView: (patch: Partial<JournalListView>) => void;
  onSelect: (id: string) => void;
}) {
  const { t, locale } = useT();
  const prefix = useId();
  const campaigns = [
    ...new Set(
      sessions
        .map((session) => session.campaign?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((a, b) => a.localeCompare(b, locale));
  const filtered = filterSessions(
    sessions,
    view.query,
    view.campaign,
    view.sort,
    view.direction,
    locale,
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 50));
  const page = Math.min(view.page, pages);
  return (
    <div className="min-w-0 space-y-4">
      <SearchField
        label={t('sessionLog.searchSessions')}
        placeholder={t('sessionLog.searchSessionsPlaceholder')}
        value={view.query}
        onChange={(event) => onView({ query: event.target.value, page: 1 })}
        onClear={() => onView({ query: '', page: 1 })}
        clearLabel={t('common.clearSearch')}
      />
      <div>
        <label className="field-label" htmlFor={`${prefix}-campaign`}>
          {t('sessionLog.campaign')}
        </label>
        <Select
          id={`${prefix}-campaign`}
          className="mt-2"
          value={view.campaign}
          onChange={(event) => onView({ campaign: event.target.value, page: 1 })}
        >
          <option value="">{t('sessionLog.allCampaigns')}</option>
          {campaigns.map((campaign) => (
            <option key={campaign} value={campaign}>
              {campaign}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label className="field-label" htmlFor={`${prefix}-sort`}>
            {t('sessionLog.sort')}
          </label>
          <Select
            id={`${prefix}-sort`}
            className="mt-2"
            value={view.sort}
            onChange={(event) =>
              onView({ sort: event.target.value as JournalSort, page: 1 })
            }
          >
            {(['updated', 'date', 'title'] as const).map((sort) => (
              <option key={sort} value={sort}>
                {t(`sessionLog.sort${sort[0]!.toUpperCase()}${sort.slice(1)}`)}
              </option>
            ))}
          </Select>
        </div>
        <IconButton
          label={t(
            view.direction === 'asc' ? 'sessionLog.ascending' : 'sessionLog.descending',
          )}
          onClick={() =>
            onView({ direction: view.direction === 'asc' ? 'desc' : 'asc', page: 1 })
          }
        >
          {view.direction === 'asc' ? (
            <ArrowUpWideNarrow size={18} aria-hidden="true" />
          ) : (
            <ArrowDownWideNarrow size={18} aria-hidden="true" />
          )}
        </IconButton>
      </div>
      <p role="status" className="text-sm text-ink-400">
        {t('sessionLog.results', { count: filtered.length })}
      </p>
      {(view.query || view.campaign) && (
        <Button
          variant="ghost"
          onClick={() => onView({ query: '', campaign: '', page: 1 })}
        >
          {t('sessionLog.clearFilters')}
        </Button>
      )}
      <ul className="space-y-2">
        {filtered.slice((page - 1) * 50, page * 50).map((session) => {
          const date = session.sessionDate ?? sessionDateValue(session.createdAt);
          return (
            <li key={session.id}>
              <button
                type="button"
                className="selection-row w-full break-words"
                aria-pressed={selectedId === session.id}
                onClick={() => onSelect(session.id)}
              >
                <span className="block font-semibold">
                  {session.title.trim() || t('sessionLog.untitled')}
                </span>
                <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-400">
                  {date && <time dateTime={date}>{date}</time>}
                  <span>{formatDuration(session.durationMs)}</span>
                  {session.campaign?.trim() && <span>{session.campaign}</span>}
                </span>
                <span className="mt-2 flex flex-wrap gap-2 text-xs text-ink-300">
                  <span>
                    {t('sessionLog.transcriptCount', { count: session.entries.length })}
                  </span>
                  {session.notes.trim() && <span>{t('sessionLog.hasNotes')}</span>}
                  {session.summary?.trim() && <span>{t('sessionLog.hasSummary')}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {!filtered.length && (
        <p className="empty-state">
          {t(sessions.length ? 'sessionLog.noMatches' : 'sessionLog.noSessions')}
        </p>
      )}
      {pages > 1 && (
        <nav
          aria-label={t('sessionLog.pagination')}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <Button
            size="sm"
            disabled={page <= 1}
            onClick={() => onView({ page: page - 1 })}
          >
            {t('compendium.browsePrevious')}
          </Button>
          <span className="text-sm text-ink-400">
            {t('compendium.catalog.page', { page, total: pages })}
          </span>
          <Button
            size="sm"
            disabled={page >= pages}
            onClick={() => onView({ page: page + 1 })}
          >
            {t('compendium.browseNext')}
          </Button>
        </nav>
      )}
    </div>
  );
}
