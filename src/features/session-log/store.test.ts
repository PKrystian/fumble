import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatClockTime,
  formatDuration,
  formatPromptWithTranscript,
  formatTranscriptForExport,
  SUMMARY_PROMPT,
  useSessionStore,
  type Session,
} from './store';

const session: Session = {
  id: 'session-1',
  title: 'The Keep',
  createdAt: new Date(2025, 0, 2, 10, 20, 30).getTime(),
  durationMs: 0,
  notes: '',
  entries: [],
};

describe('session store', () => {
  beforeEach(() => {
    localStorage.clear();
    useSessionStore.setState({ sessions: [], transcriptionLang: 'english' });
    vi.restoreAllMocks();
  });

  it('creates and edits sessions', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001',
    );
    vi.spyOn(Date, 'now').mockReturnValue(1000);
    const id = useSessionStore.getState().addSession();
    expect(id).toBe('00000000-0000-4000-8000-000000000001');

    useSessionStore.getState().updateSession(id, { title: 'Dragon Lair' });
    useSessionStore.getState().appendNote(id, 'First note');
    useSessionStore.getState().appendNote(id, 'Second note');
    useSessionStore.getState().appendTranscript(id, 'A dragon appeared.');
    useSessionStore.getState().setTranscriptionLang('polish');

    expect(useSessionStore.getState()).toMatchObject({
      transcriptionLang: 'polish',
      sessions: [
        {
          title: 'Dragon Lair',
          notes: 'First note\nSecond note',
          entries: [{ time: 1000, text: 'A dragon appeared.' }],
        },
      ],
    });

    useSessionStore.getState().deleteSession(id);
    expect(useSessionStore.getState().sessions).toEqual([]);
  });

  it('ignores edits for unknown sessions', () => {
    useSessionStore.setState({ sessions: [session] });
    useSessionStore.getState().updateSession('missing', { title: 'Other' });
    useSessionStore.getState().appendNote('missing', 'Text');
    useSessionStore.getState().appendTranscript('missing', 'Text');
    expect(useSessionStore.getState().sessions).toEqual([session]);
  });

  it('formats durations and transcript exports', () => {
    expect(formatDuration(65_000)).toBe('1:05');
    expect(formatDuration(3_661_000)).toBe('1:01:01');
    expect(formatClockTime(session.createdAt)).toBe('10:20:30');
    expect(formatTranscriptForExport(session)).not.toContain('Notes:');

    const populated = {
      ...session,
      notes: '  Find the crown.  ',
      entries: [{ time: session.createdAt, text: 'The gate opened.' }],
    };
    const exported = formatTranscriptForExport(populated);
    expect(exported).toContain('Notes:\nFind the crown.');
    expect(exported).toContain('[10:20:30] The gate opened.');
    expect(formatPromptWithTranscript(populated)).toBe(
      `${SUMMARY_PROMPT}\n\n${exported}`,
    );
  });

  it('migrates missing sessions and legacy notes', async () => {
    localStorage.setItem('fumble-sessions', JSON.stringify({ state: {}, version: 2 }));
    await useSessionStore.persist.rehydrate();
    expect(useSessionStore.getState().sessions).toEqual([]);

    localStorage.setItem('fumble-sessions', JSON.stringify({ state: null, version: 2 }));
    await useSessionStore.persist.rehydrate();
    expect(useSessionStore.getState().sessions).toEqual([]);

    localStorage.setItem(
      'fumble-sessions',
      JSON.stringify({
        state: { sessions: [{ ...session, notes: undefined }] },
        version: 2,
      }),
    );
    await useSessionStore.persist.rehydrate();
    expect(useSessionStore.getState().sessions[0]!.notes).toBe('');
  });
});
