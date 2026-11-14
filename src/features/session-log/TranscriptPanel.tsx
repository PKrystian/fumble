import { useEffect, useRef, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { Button, IconButton, SearchField } from '@/features/ui/primitives';
import { inputClass, panelClass } from '@/features/ui/styles';
import { confirmDialog } from '@/features/ui/confirmStore';
import { useT } from '@/i18n/useT';
import {
  formatClockTime,
  formatDuration,
  transcriptEntryId,
  useSessionStore,
  type Session,
  type TranscriptEntry,
} from './store';

export function TranscriptPanel({
  session,
  active,
}: {
  session: Session;
  active: boolean;
}) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(100);
  const [follow, setFollow] = useState(false);
  const [manual, setManual] = useState('');
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [removed, setRemoved] = useState<{
    entry: TranscriptEntry;
    index: number;
  } | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const term = normalizeSearchText(query.trim());
  const entries = session.entries
    .map((entry, index) => ({ entry, index, id: transcriptEntryId(entry, index) }))
    .filter(({ entry }) => !term || normalizeSearchText(entry.text).includes(term));
  useEffect(() => {
    if (active && follow && !query.trim())
      endRef.current?.scrollIntoView({ block: 'nearest' });
  }, [active, follow, query, session.entries.length]);
  return (
    <section className="space-y-4">
      <SearchField
        label={t('sessionLog.searchTranscript')}
        placeholder={t('sessionLog.searchTranscript')}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setLimit(100);
        }}
        onClear={() => {
          setQuery('');
          setLimit(100);
        }}
        clearLabel={t('common.clearSearch')}
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-sm text-ink-400">
          {t('sessionLog.transcriptMatches', { count: entries.length })}
        </p>
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={follow}
            onChange={(event) => setFollow(event.target.checked)}
          />
          {t('sessionLog.followTranscript')}
        </label>
      </div>
      {entries.length > limit && (
        <Button onClick={() => setLimit((value) => value + 100)}>
          {t('sessionLog.loadEarlier')}
        </Button>
      )}
      <div className="space-y-3">
        {entries.slice(-limit).map(({ entry, index, id }) => {
          const time =
            entry.offsetMs === undefined
              ? formatClockTime(entry.time)
              : formatDuration(entry.offsetMs);
          return (
            <article key={id} className={panelClass('p-4')}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <time
                  dateTime={new Date(entry.time).toISOString()}
                  className="font-mono text-xs text-ink-400"
                >
                  [{time}]
                </time>
                <div className="flex gap-1">
                  <IconButton
                    label={t('sessionLog.editEntry', { time })}
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing({ id, text: entry.text })}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label={t('sessionLog.deleteEntry', { time })}
                    size="sm"
                    variant="danger"
                    onClick={async () => {
                      if (
                        !(await confirmDialog(
                          t('sessionLog.deleteEntryConfirm', {
                            text: entry.text.slice(0, 120),
                          }),
                          {
                            tone: 'danger',
                            confirmLabel: t('common.delete'),
                            initialFocus: 'cancel',
                          },
                        ))
                      )
                        return;
                      useSessionStore.getState().deleteTranscript(session.id, id);
                      setRemoved({ entry, index });
                      if (editing?.id === id) setEditing(null);
                    }}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </IconButton>
                </div>
              </div>
              {editing?.id === id ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (!editing.text.trim()) return;
                    useSessionStore
                      .getState()
                      .updateTranscript(session.id, id, editing.text.trim());
                    setEditing(null);
                  }}
                >
                  <label className="field-label" htmlFor={`edit-${id}`}>
                    {t('sessionLog.editingEntry')}
                  </label>
                  <textarea
                    id={`edit-${id}`}
                    className={inputClass('mt-2 w-full resize-y')}
                    rows={4}
                    value={editing.text}
                    onChange={(event) => setEditing({ id, text: event.target.value })}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={!editing.text.trim()}
                    >
                      {t('common.save')}
                    </Button>
                    <Button onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
                  </div>
                </form>
              ) : (
                <p className="whitespace-pre-wrap break-words leading-7 text-ink-200">
                  {entry.text}
                </p>
              )}
            </article>
          );
        })}
        {!entries.length && (
          <p className="empty-state">
            {t(
              term ? 'sessionLog.noTranscriptMatches' : 'sessionLog.transcriptEmptyState',
            )}
          </p>
        )}
      </div>
      <div ref={endRef} />
      {removed && (
        <div
          role="status"
          className="notice flex flex-wrap items-center justify-between gap-2"
        >
          <span>{t('sessionLog.entryDeleted')}</span>
          <Button
            onClick={() => {
              useSessionStore
                .getState()
                .restoreTranscript(session.id, removed.entry, removed.index);
              setRemoved(null);
            }}
          >
            {t('sessionLog.undo')}
          </Button>
        </div>
      )}
      <form
        className="space-y-3 border-t border-ink-700 pt-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!manual.trim()) return;
          useSessionStore.getState().appendTranscript(session.id, manual);
          setManual('');
        }}
      >
        <label className="field-label" htmlFor="manual-transcript">
          {t('sessionLog.manualEntry')}
        </label>
        <textarea
          id="manual-transcript"
          className={inputClass('w-full resize-y')}
          rows={3}
          value={manual}
          onChange={(event) => setManual(event.target.value)}
        />
        <Button type="submit" disabled={!manual.trim()}>
          {t('sessionLog.addEntry')}
        </Button>
      </form>
    </section>
  );
}
