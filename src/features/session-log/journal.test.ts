import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createBackup,
  parseBackup,
  restoreBackup,
  summarizeBackup,
} from '@/features/data/backup';
import { validateBackupEntry } from '@/features/data/backupValidation';
import { createJournalBackup } from './journalBackup';
import {
  downloadJournalFile,
  filterSessions,
  formatSessionExport,
  hasExportContent,
  sessionExportFilename,
  type ExportLabels,
} from './journal';
import {
  SESSION_SAVE_EVENT,
  sessionDateValue,
  sessionSaveSucceeded,
  transcriptEntryId,
  useSessionStore,
  type Session,
} from './store';

const base: Session = {
  id: 'a',
  title: 'Session 2',
  createdAt: 1000,
  durationMs: 0,
  notes: '',
  entries: [],
};
const labels: ExportLabels = {
  untitled: 'Untitled',
  campaign: 'Campaign',
  date: 'Date',
  number: 'Number',
  context: 'Campaign context',
  notes: 'Notes',
  transcript: 'Transcript',
  summary: 'Summary',
};
const options = { scope: 'all' as const, includeContext: true, markdown: false, labels };
beforeEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  await useSessionStore.persist.rehydrate();
  useSessionStore.setState({
    sessions: [],
    contexts: [],
    selectedSessionId: null,
    transcriptionLang: '',
    transcriptionMode: 'auto',
  });
});

describe('journal records and campaign context', () => {
  it('changes context selection atomically for legacy sessions and avoids duplicates', () => {
    useSessionStore.setState({ sessions: [base] });
    const store = useSessionStore.getState();
    store.setSessionContext('a', 'one', false);
    expect(useSessionStore.getState().sessions[0]!.contextIds).toEqual([]);
    store.setSessionContext('a', 'one', true);
    store.setSessionContext('a', 'two', true);
    store.setSessionContext('a', 'one', true);
    store.setSessionContext('a', 'one', false);
    expect(useSessionStore.getState().sessions[0]!.contextIds).toEqual(['two']);
  });
  it('creates, selects and updates sessions without changing identity', () => {
    const id = useSessionStore.getState().addSession('First');
    expect(useSessionStore.getState().selectedSessionId).toBe(id);
    expect(useSessionStore.getState().sessions[0]).toMatchObject({
      id,
      title: 'First',
      contextIds: [],
      summary: '',
      sessionDate: sessionDateValue(Date.now()),
    });
    useSessionStore.getState().updateSession(id, {
      campaign: 'Ring',
      number: '1',
      sessionDate: '2026-11-08',
      summary: 'Found a ring',
    });
    useSessionStore.getState().addDuration(id, 500);
    useSessionStore.getState().addDuration(id, -500);
    useSessionStore.getState().setTranscriptionMode('local');
    useSessionStore.getState().selectSession(null);
    expect(useSessionStore.getState().sessions[0]).toMatchObject({
      durationMs: 500,
      campaign: 'Ring',
      number: '1',
    });
    expect(useSessionStore.getState().transcriptionMode).toBe('local');
    expect(useSessionStore.getState().selectedSessionId).toBeNull();
  });

  it('uses stable fragment identifiers and supports edits, deletion and undo', () => {
    useSessionStore.setState({ sessions: [base] });
    const store = useSessionStore.getState();
    store.appendTranscript('a', '   ');
    expect(useSessionStore.getState().sessions[0]!.entries).toEqual([]);
    store.appendTranscript('a', ' First ', { time: 2000, offsetMs: 500 });
    store.appendTranscript('a', 'Second');
    const entry = useSessionStore.getState().sessions[0]!.entries[0]!;
    expect(entry).toMatchObject({ time: 2000, offsetMs: 500, text: 'First' });
    store.updateTranscript('a', 'missing', 'Ignored');
    store.updateTranscript('a', entry.id!, 'Corrected');
    expect(useSessionStore.getState().sessions[0]!.entries[0]!.text).toBe('Corrected');
    store.deleteTranscript('a', 'missing');
    store.deleteTranscript('a', entry.id!);
    store.restoreTranscript('a', entry, 0);
    store.restoreTranscript('a', entry, 0);
    expect(useSessionStore.getState().sessions[0]!.entries).toHaveLength(2);
    expect(transcriptEntryId({ time: 1, text: 'Legacy' }, 2)).toBe('1-2');
    store.restoreTranscript('a', { time: 3, text: 'Legacy' }, 1);
    expect(useSessionStore.getState().sessions[0]!.entries[1]!.text).toBe('Legacy');
    store.updateTranscript('missing', 'x', 'Ignored');
    store.deleteTranscript('missing', 'x');
  });

  it('restores a deleted session once at its previous position', () => {
    useSessionStore.setState({
      sessions: [base, { ...base, id: 'b' }],
      selectedSessionId: 'a',
    });
    const store = useSessionStore.getState();
    store.deleteSession('b');
    expect(useSessionStore.getState().selectedSessionId).toBe('a');
    store.deleteSession('a');
    expect(useSessionStore.getState().selectedSessionId).toBeNull();
    store.restoreSession(base, 0);
    store.restoreSession(base, 0);
    expect(useSessionStore.getState().sessions).toEqual([base]);
    expect(useSessionStore.getState().selectedSessionId).toBe('a');
  });

  it('shares named context between sessions, appends facts and restores deleted associations', () => {
    useSessionStore.setState({ sessions: [base, { ...base, id: 'b', contextIds: [] }] });
    const store = useSessionStore.getState();
    const id = store.addContext(' Fellowship ');
    store.updateContext('missing', { name: 'Ignored' });
    store.updateContext(id, { name: 'Ring', text: 'Aragorn - player X' });
    store.appendContext('missing', 'Ignored');
    store.appendContext(id, ' ');
    store.appendContext(id, 'Rivendell');
    store.updateSession('a', { contextIds: [id] });
    const context = useSessionStore.getState().contexts[0]!;
    expect(context).toMatchObject({
      name: 'Ring',
      text: 'Aragorn - player X\n\nRivendell',
    });
    store.deleteContext(id);
    expect(useSessionStore.getState().sessions[0]!.contextIds).toEqual([]);
    store.restoreContext(context, ['a']);
    store.restoreContext(context, ['a']);
    expect(useSessionStore.getState().contexts).toHaveLength(1);
    expect(useSessionStore.getState().sessions[0]!.contextIds).toEqual([id]);
    expect(useSessionStore.getState().sessions[1]!.contextIds).toEqual([]);
  });

  it('migrates version three data and preserves current context, preferences and fragments', async () => {
    localStorage.setItem(
      'fumble-sessions',
      JSON.stringify({
        version: 3,
        state: { sessions: [base], transcriptionLang: 'polish' },
      }),
    );
    await useSessionStore.persist.rehydrate();
    expect(useSessionStore.getState()).toMatchObject({
      contexts: [],
      selectedSessionId: null,
      transcriptionLang: 'polish',
      transcriptionMode: 'auto',
    });
    expect(useSessionStore.getState().sessions[0]).toMatchObject({
      summary: '',
      contextIds: [],
      campaign: '',
    });
    const existing = {
      ...base,
      entries: [{ id: 'e', time: 1, text: 'Text' }],
      updatedAt: 2,
      notes: 'Notes',
      summary: 'Summary',
      number: '2',
      sessionDate: '2026-11-08',
      campaign: 'Ring',
      contextIds: ['c'],
    };
    const context = { id: 'c', name: 'Ring', text: 'Facts', createdAt: 1, updatedAt: 1 };
    localStorage.setItem(
      'fumble-sessions',
      JSON.stringify({
        version: 2,
        state: {
          sessions: [existing],
          contexts: [context],
          selectedSessionId: 'a',
          transcriptionMode: 'local',
        },
      }),
    );
    await useSessionStore.persist.rehydrate();
    expect(useSessionStore.getState().sessions[0]).toEqual(existing);
    expect(useSessionStore.getState()).toMatchObject({
      contexts: [context],
      selectedSessionId: 'a',
      transcriptionMode: 'local',
      transcriptionLang: '',
    });
  });

  it('assigns identities to legacy fragments and restores context links to legacy sessions', async () => {
    localStorage.setItem(
      'fumble-sessions',
      JSON.stringify({
        version: 3,
        state: { sessions: [{ ...base, entries: [{ time: 1000, text: 'Old text' }] }] },
      }),
    );
    await useSessionStore.persist.rehydrate();
    expect(useSessionStore.getState().sessions[0]!.entries[0]!.id).toEqual(
      expect.any(String),
    );
    useSessionStore.setState({ sessions: [base] });
    useSessionStore
      .getState()
      .restoreContext(
        { id: 'c', name: 'Context', text: '', createdAt: 1, updatedAt: 1 },
        ['a'],
      );
    expect(useSessionStore.getState().sessions[0]!.contextIds).toEqual(['c']);
  });

  it('reports failed writes and recovers without losing in-memory text', () => {
    const listener = vi.fn();
    window.addEventListener(SESSION_SAVE_EVENT, listener);
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    const id = useSessionStore.getState().addSession('Unsaved');
    expect(sessionSaveSucceeded()).toBe(false);
    expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({ detail: false }));
    write.mockRestore();
    useSessionStore.setState({});
    expect(sessionSaveSucceeded()).toBe(true);
    expect(
      JSON.parse(localStorage.getItem('fumble-sessions')!).state.sessions[0].id,
    ).toBe(id);
    useSessionStore.persist.clearStorage();
    expect(localStorage.getItem('fumble-sessions')).toBeNull();
    window.removeEventListener(SESSION_SAVE_EVENT, listener);
  });
});

describe('journal discovery and export', () => {
  it('searches localized text, summaries and fragments and combines campaign filters', () => {
    const sessions = [
      base,
      {
        ...base,
        id: 'b',
        title: 'Other',
        notes: 'Łódź',
        campaign: 'Ring',
        summary: 'Crown',
        entries: [{ time: 1, text: 'Aragorn' }],
      },
    ];
    for (const query of ['  lodz  ', 'crown', 'ARAGORN', 'Ring'])
      expect(
        filterSessions(sessions, query, 'Ring', 'title', 'asc', 'pl').map(
          (session) => session.id,
        ),
      ).toEqual(['b']);
    expect(filterSessions(sessions, 'missing', '', 'date', 'desc', 'en')).toEqual([]);
    expect(filterSessions(sessions, '', 'Unknown', 'updated', 'asc', 'en')).toEqual([]);
  });

  it('sorts names naturally and keeps missing titles and dates last in both directions', () => {
    const sessions = [
      { ...base, id: 'b', title: 'Session 10', sessionDate: '2026-01-02', updatedAt: 3 },
      { ...base, sessionDate: '2026-01-01', updatedAt: 1 },
      { ...base, id: 'c', title: '', sessionDate: '' },
    ];
    for (const direction of ['asc', 'desc'] as const)
      expect(
        filterSessions([...sessions].reverse(), '', '', 'date', direction, 'en').at(-1)!
          .id,
      ).toBe('c');
    expect(
      filterSessions(sessions, '', '', 'title', 'asc', 'en').map((session) => session.id),
    ).toEqual(['a', 'b', 'c']);
    expect(
      filterSessions(sessions, '', '', 'date', 'desc', 'en').map((session) => session.id),
    ).toEqual(['b', 'a', 'c']);
    expect(filterSessions(sessions, '', '', 'updated', 'desc', 'en')[0]!.id).toBe('c');
    expect(
      filterSessions([base, { ...base, id: 'b' }], '', '', 'date', 'asc', 'en')[0]!.id,
    ).toBe('a');
    expect(
      filterSessions(
        [
          { ...base, id: 'b', title: '' },
          { ...base, title: '' },
        ],
        '',
        '',
        'title',
        'desc',
        'en',
      )[0]!.id,
    ).toBe('a');
  });

  it('exports only selected scopes and selected nonempty context boards', () => {
    const session = {
      ...base,
      campaign: 'Ring',
      number: '3',
      notes: 'Notes content',
      summary: 'Summary content',
      contextIds: ['c', 'empty'],
      entries: [
        { time: 1000, text: 'Speech' },
        { time: 2000, offsetMs: 1000, text: 'Later speech' },
      ],
    };
    const contexts = [
      { id: 'c', name: 'People', text: 'Aragorn - X', createdAt: 1, updatedAt: 1 },
      { id: 'empty', name: '', text: ' ', createdAt: 1, updatedAt: 1 },
      { id: 'other', name: 'Other', text: 'Spoiler', createdAt: 1, updatedAt: 1 },
    ];
    const text = formatSessionExport(session, contexts, options);
    expect(text).toContain('Aragorn - X');
    expect(text).not.toContain('Spoiler');
    expect(text).toContain('Campaign: Ring');
    expect(text).toContain('Number: 3');
    expect(text).toContain('[0:01] Later speech');
    for (const scope of ['notes', 'transcript', 'summary'] as const) {
      const result = formatSessionExport(session, contexts, {
        ...options,
        scope,
        includeContext: false,
      });
      expect(result).not.toContain('Aragorn');
      expect(hasExportContent(session, scope)).toBe(true);
      if (scope !== 'notes') expect(result).not.toContain('Notes content');
      if (scope !== 'summary') expect(result).not.toContain('Summary content');
      if (scope !== 'transcript') expect(result).not.toContain('Speech');
    }
    expect(
      formatSessionExport(session, contexts, { ...options, markdown: true }),
    ).toContain('### People');
    expect(
      formatSessionExport(
        { ...base, title: '', sessionDate: '', contextIds: ['c'] },
        [{ ...contexts[0]!, name: '' }],
        options,
      ),
    ).toContain('Untitled');
    for (const scope of ['all', 'notes', 'transcript', 'summary'] as const)
      expect(hasExportContent(base, scope)).toBe(false);
    expect(hasExportContent({ ...base, notes: 'Only notes' }, 'all')).toBe(true);
    expect(formatSessionExport(base, contexts, options)).not.toContain(
      'Campaign context',
    );
  });

  it('creates safe filenames and revokes file URLs on successful and failed downloads', () => {
    const filename = sessionExportFilename({ ...base, title: '../../x:*? Łódź' }, 'md');
    expect(filename).toMatch(/^fumble-session-[\p{L}\p{N}_.-]+\.md$/u);
    expect(filename).toContain('Łódź');
    expect(
      sessionExportFilename({ ...base, title: 'x'.repeat(200) }, 'txt').length,
    ).toBeLessThan(100);
    expect(sessionExportFilename({ ...base, title: '' }, 'txt')).toBe(
      'fumble-session-a.txt',
    );
    const create = vi.fn(() => 'blob:journal');
    const revoke = vi.fn();
    Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: create });
    Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: revoke });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    downloadJournalFile('Text', 'session.md', 'text/markdown');
    expect(create).toHaveBeenCalledWith(expect.any(Blob));
    expect(revoke).toHaveBeenCalledWith('blob:journal');
    expect(document.querySelector('a[download]')).toBeNull();
    click.mockImplementation(() => {
      throw new Error('Download');
    });
    expect(() => downloadJournalFile('Text', 'session.md', 'text/markdown')).toThrow(
      'Download',
    );
    expect(revoke).toHaveBeenCalledTimes(2);
  });

  it('includes current unsaved context and sessions in a validated whole-data backup', () => {
    useSessionStore.setState({ sessions: [base] });
    const id = useSessionStore.getState().addContext('Ring');
    useSessionStore.getState().updateContext(id, { text: 'Aragorn' });
    useSessionStore.getState().updateSession('a', { contextIds: [id], summary: 'Done' });
    localStorage.setItem('fumble-campaign-map-editor:test', '[0,1]');
    const backup = parseBackup(createJournalBackup(localStorage));
    expect(summarizeBackup(backup)).toMatchObject({ sessions: 1, contexts: 1, maps: 1 });
    restoreBackup(localStorage, backup);
    expect(
      parseBackup(JSON.stringify(createBackup(localStorage))).data['fumble-sessions'],
    ).toContain('Aragorn');
    const raw = JSON.parse(backup.data['fumble-sessions']!);
    for (const patch of [
      { contexts: [{ id: 'x' }] },
      { selectedSessionId: 2 },
      { transcriptionMode: 'remote-unknown' },
      { sessions: [{ ...base, contextIds: [2] }] },
    ])
      expect(() =>
        validateBackupEntry('fumble-sessions', {
          ...raw,
          state: { ...raw.state, ...patch },
        }),
      ).toThrow('backup-invalid-data');
  });
});
