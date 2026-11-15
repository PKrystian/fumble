import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { createMemoryRouter, Link, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmDialog } from '@/features/ui/ConfirmDialog';
import { useDialogStore } from '@/features/ui/confirmStore';
import { SessionLogPage } from './SessionLogPage';
import { useSessionStore, type Session } from './store';

type Callback = (text: string, stamp: { time: number; offsetMs: number }) => void;
const mocks = vi.hoisted(() => ({
  callback: undefined as Callback | undefined,
  duration: undefined as ((ms: number) => void) | undefined,
  runningCallback: undefined as Callback | undefined,
  runningDuration: undefined as ((ms: number) => void) | undefined,
  speech: {
    supported: true,
    status: 'idle' as 'idle' | 'starting' | 'listening' | 'processing' | 'error',
    busy: false,
    listening: false,
    interim: '',
    speechError: '',
    modelProgress: '',
    pendingCount: 0,
    elapsedMs: 0,
    backend: null as 'browser' | 'local' | null,
    canRetry: false,
    start: vi.fn(),
    stop: vi.fn(),
    retry: vi.fn(),
    discardPending: vi.fn(),
  },
}));
vi.mock('./speech', () => ({
  useSpeechRecognition: (
    callback: Callback,
    _language: string,
    options?: { onDuration?: (ms: number) => void },
  ) => {
    mocks.callback = callback;
    mocks.duration = options?.onDuration;
    return mocks.speech;
  },
}));
const first: Session = {
  id: 'one',
  title: 'First session',
  createdAt: 1000,
  durationMs: 5000,
  notes: 'Written notes',
  entries: [],
};
const second: Session = {
  ...first,
  id: 'two',
  title: 'Second session',
  createdAt: 2000,
  notes: '',
};
function show(path = '/session-log/') {
  const router = createMemoryRouter(
    [
      { path: '/next/', element: <h1>Destination</h1> },
      {
        path: '*',
        element: (
          <>
            <Link to="/next/">Leave journal</Link>
            <SessionLogPage />
            <ConfirmDialog />
          </>
        ),
      },
    ],
    { initialEntries: [path] },
  );
  return { ...render(<RouterProvider router={router} />), router };
}
function transcript() {
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Session views' })).getByRole(
      'button',
      { name: /^Transcript/ },
    ),
  );
}
function contexts() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Manage campaign context' })[0]!);
  return screen.getByRole('dialog', { name: 'Campaign context' });
}
function exportDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Copy and export' }));
  return screen.getByRole('dialog', { name: 'Copy and export' });
}
function refresh() {
  useSessionStore.getState().updateSession('one', {});
}
beforeEach(async () => {
  vi.restoreAllMocks();
  localStorage.clear();
  await useSessionStore.persist.rehydrate();
  useDialogStore.setState({ request: null });
  useSessionStore.setState({
    sessions: [first, second],
    contexts: [],
    selectedSessionId: 'one',
    transcriptionLang: '',
    transcriptionMode: 'auto',
  });
  Object.assign(mocks.speech, {
    supported: true,
    status: 'idle',
    busy: false,
    listening: false,
    interim: '',
    speechError: '',
    modelProgress: '',
    pendingCount: 0,
    elapsedMs: 0,
    backend: null,
    canRetry: false,
  });
  mocks.runningCallback = undefined;
  mocks.runningDuration = undefined;
  mocks.speech.start.mockReset().mockImplementation(async () => {
    mocks.runningCallback = mocks.callback;
    mocks.runningDuration = mocks.duration;
    Object.assign(mocks.speech, {
      status: 'listening',
      busy: true,
      listening: true,
      backend: 'local',
    });
    refresh();
  });
  mocks.speech.stop.mockReset().mockImplementation(() => {
    if (!mocks.speech.listening && mocks.speech.status !== 'starting') return;
    mocks.runningDuration?.(4000);
    mocks.runningDuration = undefined;
    Object.assign(mocks.speech, {
      listening: false,
      busy: mocks.speech.pendingCount > 0,
      status: mocks.speech.pendingCount ? 'processing' : 'idle',
    });
    refresh();
  });
  mocks.speech.retry.mockReset().mockImplementation(async () => {
    Object.assign(mocks.speech, {
      busy: false,
      pendingCount: 0,
      canRetry: false,
      speechError: '',
      status: 'idle',
    });
    refresh();
  });
  mocks.speech.discardPending.mockReset().mockImplementation(() => {
    Object.assign(mocks.speech, {
      busy: false,
      pendingCount: 0,
      canRetry: false,
      speechError: '',
      status: 'idle',
    });
    refresh();
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn(async () => undefined) },
  });
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:journal'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
});
afterEach(() => vi.restoreAllMocks());

describe('session journal', () => {
  it('orders campaign names and keeps imported untitled sessions usable', async () => {
    useSessionStore.setState({
      sessions: [
        { ...first, title: '', campaign: 'Zulu' },
        { ...second, campaign: 'Alpha' },
      ],
    });
    show();
    const filter = screen.getByRole('combobox', { name: 'Campaign' });
    expect(
      within(filter)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['All campaigns', 'Alpha', 'Zulu']);
    expect(screen.getByRole('button', { name: /^Untitled session/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Delete session' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent('Untitled session');
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
    transcript();
    fireEvent.click(screen.getByRole('button', { name: 'Start transcription' }));
    await waitFor(() => expect(mocks.speech.start).toHaveBeenCalledOnce());
    act(() => {
      mocks.speech.backend = 'browser';
      refresh();
    });
    expect(screen.getByText('Using browser recognition')).toBeInTheDocument();
    expect(
      screen.getByText('Transcription belongs to: Untitled session'),
    ).toBeInTheDocument();
  });
  it('opens an empty journal without writing and creates a localized session', () => {
    useSessionStore.setState({ sessions: [], selectedSessionId: null });
    localStorage.removeItem('fumble-sessions');
    show('/pl/session-log/');
    expect(screen.getByText('Nie wybrano sesji.')).toBeInTheDocument();
    expect(localStorage.getItem('fumble-sessions')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Rozpocznij nową sesję' }));
    expect(useSessionStore.getState().sessions[0]!.title).toMatch(/^Sesja - /);
    expect(useSessionStore.getState().transcriptionLang).toBe('');
  });

  it('edits notes, metadata and summary, applies a template only to empty notes and preserves selection', () => {
    show();
    fireEvent.change(screen.getByRole('textbox', { name: 'Session notes' }), {
      target: { value: 'New notes' },
    });
    const title = screen.getByRole('textbox', { name: 'Session title' });
    fireEvent.change(title, { target: { value: 'Changed title ' } });
    fireEvent.blur(title);
    fireEvent.click(
      screen.getByText('Date, campaign and session number', { selector: 'summary' }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Campaign' }), {
      target: { value: 'Ring ' },
    });
    fireEvent.blur(screen.getByRole('textbox', { name: 'Campaign' }));
    fireEvent.change(screen.getByLabelText('Session date'), {
      target: { value: '2026-11-08' },
    });
    fireEvent.change(screen.getByLabelText('Session number'), { target: { value: '4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Summary' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Session summary' }), {
      target: { value: 'Summary content' },
    });
    expect(useSessionStore.getState().sessions[0]).toMatchObject({
      title: 'Changed title',
      campaign: 'Ring',
      number: '4',
      summary: 'Summary content',
      sessionDate: '2026-11-08',
      notes: 'New notes',
    });
    fireEvent.click(screen.getByRole('button', { name: /^Second session/ }));
    expect(useSessionStore.getState().selectedSessionId).toBe('two');
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Use a notes template' }));
    expect(
      (screen.getByRole('textbox', { name: 'Session notes' }) as HTMLTextAreaElement)
        .value,
    ).toContain('## Events');
    fireEvent.change(screen.getByRole('textbox', { name: 'Session title' }), {
      target: { value: '' },
    });
    fireEvent.blur(screen.getByRole('textbox', { name: 'Session title' }));
    expect(screen.getByRole('textbox', { name: 'Session title' })).toHaveValue(
      'Untitled session',
    );
  });

  it('copies notes without speech and exports selected scopes with a preview', async () => {
    show();
    const dialog = exportDialog();
    expect(within(dialog).getByRole('button', { name: 'Copy text' })).toBeEnabled();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy text' }));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Written notes'),
      ),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy with AI prompt' }));
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith(
        expect.stringContaining('Treat transcripts as source material'),
      ),
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Download TXT' }));
    expect(within(dialog).getByRole('status')).toHaveTextContent(
      /File downloaded|Copied/,
    );
    fireEvent.click(within(dialog).getByRole('button', { name: 'Download Markdown' }));
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    fireEvent.change(within(dialog).getByLabelText('Content to export'), {
      target: { value: 'transcript' },
    });
    expect(within(dialog).getByRole('button', { name: 'Copy text' })).toBeDisabled();
    expect(
      within(dialog).getByText('The selected scope has no session content to export.'),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Close' })[0]!);
  });

  it('retains an export preview when clipboard or download operations fail', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard'));
    vi.mocked(URL.createObjectURL).mockImplementation(() => {
      throw new Error('Download');
    });
    show();
    const dialog = exportDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy text' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('could not copy');
    expect(within(dialog).getByRole('textbox', { name: 'Export preview' })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Download TXT' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'could not be downloaded',
    );
  });

  it('creates, renames and edits shared context and includes selected facts in copied prompts', async () => {
    show();
    const dialog = contexts();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create collection' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Enter a collection name.',
    );
    fireEvent.change(within(dialog).getByLabelText('New collection name'), {
      target: { value: 'Fellowship' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create collection' }));
    const name = within(dialog).getByLabelText('Collection name');
    fireEvent.change(name, { target: { value: '' } });
    fireEvent.blur(name);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Enter a collection name.',
    );
    fireEvent.change(name, { target: { value: 'Ring' } });
    fireEvent.blur(name);
    fireEvent.change(within(dialog).getByLabelText('Shared facts'), {
      target: { value: 'Aragorn - player X' },
    });
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Close' })[0]!);
    fireEvent.click(
      screen.getByText('Campaign context', { selector: 'summary', exact: false }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Include "Ring" in this session' }),
    );
    fireEvent.change(screen.getByLabelText('New shared fact'), {
      target: { value: 'Rivendell is home to Elrond.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add to shared facts' }));
    expect(useSessionStore.getState().contexts[0]!.text).toContain('Rivendell');
    expect(useSessionStore.getState().sessions[0]!.notes).toBe('Written notes');
    const exported = exportDialog();
    fireEvent.click(
      within(exported).getByRole('button', { name: 'Copy with AI prompt' }),
    );
    await waitFor(() =>
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining('Aragorn - player X'),
      ),
    );
    expect(
      (within(exported).getByLabelText('Export preview') as HTMLTextAreaElement).value,
    ).toContain('Rivendell');
    fireEvent.click(within(exported).getByLabelText('Include selected campaign context'));
    expect(
      (within(exported).getByLabelText('Export preview') as HTMLTextAreaElement).value,
    ).not.toContain('Aragorn');
  });

  it('undoes shared additions without overwriting subsequent edits', () => {
    const id = useSessionStore.getState().addContext('Ring');
    useSessionStore.getState().updateSession('one', { contextIds: [id] });
    show();
    fireEvent.click(
      screen.getByText('Campaign context', { selector: 'summary', exact: false }),
    );
    fireEvent.change(screen.getByLabelText('New shared fact'), {
      target: { value: 'Fact' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add to shared facts' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(useSessionStore.getState().contexts[0]!.text).toBe('');
    fireEvent.change(screen.getByLabelText('New shared fact'), {
      target: { value: 'Fact' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add to shared facts' }));
    act(() =>
      useSessionStore.getState().updateContext(id, { text: 'Newer edited content' }),
    );
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Include "Ring" in this session' }),
    );
    expect(
      screen.getByText(
        'Select a collection above to add shared facts from this session.',
      ),
    ).toBeInTheDocument();
  });

  it('deletes and restores a context collection and its associations with Cancel focused first', async () => {
    const id = useSessionStore.getState().addContext('Ring');
    useSessionStore.getState().updateSession('one', { contextIds: [id] });
    show();
    const dialog = contexts();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete collection' }));
    let confirm = screen.getByRole('alertdialog');
    expect(within(confirm).getByText(/Delete "Ring"/)).toBeInTheDocument();
    expect(within(confirm).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.click(within(confirm).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
    expect(useSessionStore.getState().contexts).toHaveLength(1);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete collection' }));
    confirm = screen.getByRole('alertdialog');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(useSessionStore.getState().contexts).toHaveLength(0));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Undo' }));
    expect(useSessionStore.getState().contexts).toHaveLength(1);
    expect(useSessionStore.getState().sessions[0]!.contextIds).toEqual([id]);
  });

  it('edits, cancels, searches, manually adds, deletes and restores transcript fragments', async () => {
    useSessionStore
      .getState()
      .appendTranscript('one', 'Incorrect name', { time: 2000, offsetMs: 1000 });
    show();
    transcript();
    fireEvent.click(screen.getByRole('button', { name: 'Edit fragment 0:01' }));
    fireEvent.change(screen.getByLabelText('Fragment text'), { target: { value: ' ' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit fragment 0:01' }));
    fireEvent.change(screen.getByLabelText('Fragment text'), {
      target: { value: 'Aragorn' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(useSessionStore.getState().sessions[0]!.entries[0]!.text).toBe('Aragorn');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search transcript' }), {
      target: { value: 'missing' },
    });
    expect(screen.getByText('No matching transcript fragments.')).toBeInTheDocument();
    fireEvent.click(
      within(
        screen.getByRole('searchbox', { name: 'Search transcript' }).parentElement!,
      ).getByRole('button', { name: 'Clear search' }),
    );
    fireEvent.change(screen.getByLabelText('Add a transcript entry'), {
      target: { value: 'Manual detail' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add entry' }));
    expect(useSessionStore.getState().sessions[0]!.entries).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Delete fragment 0:01' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Delete',
      }),
    );
    await waitFor(() =>
      expect(useSessionStore.getState().sessions[0]!.entries).toHaveLength(1),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(useSessionStore.getState().sessions[0]!.entries).toHaveLength(2);
  });

  it('loads long transcripts in batches and follows new entries only when requested', () => {
    useSessionStore.getState().updateSession('one', {});
    useSessionStore.setState({
      sessions: [
        {
          ...first,
          entries: Array.from({ length: 105 }, (_, index) => ({
            id: `e${index}`,
            time: index * 1000,
            text: `Row ${index}`,
          })),
        },
      ],
    });
    show();
    transcript();
    expect(screen.queryByText('Row 0', { exact: true })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show earlier fragments' }));
    expect(screen.getByText('Row 0', { exact: true })).toBeInTheDocument();
    vi.mocked(Element.prototype.scrollIntoView).mockClear();
    act(() => useSessionStore.getState().appendTranscript('one', 'No forced scrolling'));
    expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Follow new fragments'));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('filters session content and campaigns and restores a missing selected session', () => {
    useSessionStore.setState({
      sessions: [first, { ...second, campaign: 'Ring', summary: 'Łódź' }],
      selectedSessionId: 'missing',
    });
    show();
    expect(screen.getByLabelText('Session title')).toHaveValue('First session');
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search session titles and content' }),
      { target: { value: 'lodz' } },
    );
    expect(
      screen.queryByRole('button', { name: /^First session/ }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Campaign' }), {
      target: { value: 'Ring' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort sessions' }), {
      target: { value: 'title' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Descending' }));
    fireEvent.change(
      screen.getByRole('searchbox', { name: 'Search session titles and content' }),
      { target: { value: 'unknown' } },
    );
    expect(screen.getByText('No sessions match your search.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear search and campaign' }));
    expect(screen.getByRole('button', { name: /^First session/ })).toBeInTheDocument();
  });

  it('shows save errors, creates an emergency backup, and retries saving current notes', async () => {
    show();
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Quota');
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Session notes' }), {
      target: { value: 'Unsaved current notes' },
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Changes could not be saved');
    fireEvent.click(
      within(screen.getByRole('alert')).getByRole('button', { name: 'Copy and export' }),
    );
    expect(
      (screen.getByRole('textbox', { name: 'Export preview' }) as HTMLTextAreaElement)
        .value,
    ).toContain('Unsaved current notes');
    fireEvent.click(
      within(screen.getByRole('dialog'))
        .getAllByRole('button', { name: 'Close' })
        .at(-1)!,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Download current data backup' }));
    expect(URL.createObjectURL).toHaveBeenCalled();
    vi.mocked(URL.createObjectURL).mockImplementation(() => {
      throw new Error('Download');
    });
    fireEvent.click(screen.getByRole('button', { name: 'Download current data backup' }));
    expect(screen.getByRole('alert')).toHaveTextContent('backup could not be created');
    write.mockRestore();
    fireEvent.click(screen.getByRole('button', { name: 'Retry saving' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(localStorage.getItem('fumble-sessions')).toContain('Unsaved current notes');
  });

  it('resolves a journal changed in another tab', async () => {
    show();
    const theirs = JSON.stringify({
      state: {
        sessions: [{ ...first, title: 'Their session' }],
        contexts: [],
        selectedSessionId: 'one',
        transcriptionLang: '',
        transcriptionMode: 'auto',
      },
      version: 4,
    });
    localStorage.setItem('fumble-sessions', theirs);
    fireEvent.change(screen.getByRole('textbox', { name: 'Session notes' }), {
      target: { value: 'Typed in this tab' },
    });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The journal changed in another tab');
    expect(localStorage.getItem('fumble-sessions')).toBe(theirs);
    expect(
      within(alert).queryByRole('button', { name: 'Retry saving' }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(alert).getByRole('button', { name: 'Download the saved original' }),
    );
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    vi.mocked(URL.createObjectURL).mockImplementationOnce(() => {
      throw new Error('Download');
    });
    fireEvent.click(
      within(alert).getByRole('button', { name: 'Download the saved original' }),
    );
    expect(alert).toHaveTextContent('backup could not be created');

    fireEvent.click(
      within(alert).getByRole('button', { name: 'Load the saved journal' }),
    );
    let dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load the saved journal' }));
    dialog = screen.getByRole('alertdialog');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Load the saved journal' }),
    );
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByRole('textbox', { name: 'Session title' })).toHaveValue(
      'Their session',
    );
  });

  it('keeps an unreadable journal until it is explicitly replaced', async () => {
    localStorage.setItem('fumble-sessions', '{broken');
    await useSessionStore.persist.rehydrate();
    show();
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The saved journal cannot be read');
    fireEvent.click(
      within(alert).getByRole('button', { name: 'Replace the saved journal' }),
    );
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Replace the saved journal',
      }),
    );
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(localStorage.getItem('fumble-sessions')).toContain('First session');
  });

  it('cancels, confirms and undoes a named session deletion', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Delete session' }));
    let dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/First session/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
    expect(useSessionStore.getState().sessions).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Delete session' }));
    dialog = screen.getByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(useSessionStore.getState().sessions).toHaveLength(1));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(screen.getByLabelText('Session title')).toHaveValue('First session');
  });

  it('keeps recording callbacks and duration attached to the original session when viewing another', async () => {
    show();
    transcript();
    fireEvent.click(screen.getByRole('button', { name: 'Start transcription' }));
    expect(screen.getByRole('button', { name: 'Delete session' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^Second session/ }));
    act(() =>
      mocks.runningCallback?.('A belongs to first', { time: 3000, offsetMs: 1000 }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(useSessionStore.getState().sessions[0]).toMatchObject({
      durationMs: 9000,
      entries: [{ text: 'A belongs to first', offsetMs: 6000 }],
    });
    expect(useSessionStore.getState().sessions[1]!.entries).toEqual([]);
    fireEvent.change(screen.getByRole('combobox', { name: 'Transcription language' }), {
      target: { value: 'polish' },
    });
    fireEvent.change(screen.getByRole('combobox', { name: 'Speech recognition mode' }), {
      target: { value: 'local' },
    });
    expect(useSessionStore.getState()).toMatchObject({
      transcriptionLang: 'polish',
      transcriptionMode: 'local',
    });
  });

  it('shows live capture outside its tab and blocks navigation until pending fragments finish', async () => {
    const { router } = show();
    transcript();
    fireEvent.click(screen.getByRole('button', { name: 'Start transcription' }));
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(screen.getByRole('button', { name: 'Show transcript' })).toBeInTheDocument();
    act(() => {
      mocks.speech.pendingCount = 1;
      refresh();
    });
    fireEvent.click(screen.getByRole('link', { name: 'Leave journal' }));
    expect(
      await screen.findByRole('dialog', { name: 'Finishing before leaving' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/session-log/');
    fireEvent.click(screen.getByRole('button', { name: 'Stay here' }));
    expect(
      screen.queryByRole('dialog', { name: 'Finishing before leaving' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Leave journal' }));
    act(() => {
      Object.assign(mocks.speech, { busy: false, pendingCount: 0, status: 'idle' });
      refresh();
    });
    await screen.findByRole('heading', { name: 'Destination' });
  });

  it('shows interim text and retry actions, requires confirmation before discarding pending audio', async () => {
    Object.assign(mocks.speech, {
      interim: 'Partial',
      speechError: 'Model unavailable',
      status: 'error',
      busy: true,
      pendingCount: 1,
      canRetry: true,
      modelProgress: 'Downloading 42%',
    });
    show();
    transcript();
    expect(screen.getByText('Partial')).toBeInTheDocument();
    expect(screen.getByText('Downloading 42%')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Discard pending audio' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
    expect(mocks.speech.discardPending).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Retry pending fragments' }));
    await waitFor(() => expect(mocks.speech.retry).toHaveBeenCalled());
  });

  it('handles empty-journal callbacks without creating orphan records', () => {
    useSessionStore.setState({ sessions: [], selectedSessionId: null });
    show();
    act(() => {
      mocks.callback?.('Ignored', { time: 1000, offsetMs: 0 });
      mocks.duration?.(2000);
    });
    expect(useSessionStore.getState().sessions).toEqual([]);
    expect(screen.getByText('No saved sessions yet.')).toBeInTheDocument();
  });

  it('selects multiple context collections and directs new facts to the chosen collection', () => {
    const one = useSessionStore.getState().addContext('People');
    const two = useSessionStore.getState().addContext('Places');
    show();
    const dialog = contexts();
    fireEvent.change(within(dialog).getByLabelText('Edit collection'), {
      target: { value: two },
    });
    expect(within(dialog).getByLabelText('Collection name')).toHaveValue('Places');
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Close' })[1]!);
    fireEvent.click(
      screen.getByText('Campaign context', { selector: 'summary', exact: false }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Include "People" in this session' }),
    );
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Include "Places" in this session' }),
    );
    fireEvent.change(screen.getByLabelText('Collection to update'), {
      target: { value: two },
    });
    fireEvent.submit(screen.getByLabelText('New shared fact').closest('form')!);
    expect(useSessionStore.getState().contexts[1]!.text).toBe('');
    fireEvent.change(screen.getByLabelText('New shared fact'), {
      target: { value: 'Rivendell' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add to shared facts' }));
    expect(useSessionStore.getState().contexts[0]!.text).toBe('');
    expect(useSessionStore.getState().contexts[1]!.text).toBe('Rivendell');
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'Include "People" in this session' }),
    );
    expect(useSessionStore.getState().sessions[0]!.contextIds).toEqual([two]);
    fireEvent.click(
      within(
        screen.getByText('Campaign context', { selector: 'summary', exact: false })
          .parentElement!,
      ).getByRole('button', { name: 'Manage campaign context' }),
    );
    expect(screen.getByRole('dialog', { name: 'Campaign context' })).toBeInTheDocument();
    expect(useSessionStore.getState().contexts[0]!.id).toBe(one);
  });

  it('keeps imported unnamed context usable and restores focus when overlays close', () => {
    const id = useSessionStore.getState().addContext('');
    useSessionStore.getState().updateSession('one', { contextIds: [id] });
    show();
    const trigger = screen.getAllByRole('button', {
      name: 'Manage campaign context',
    })[0]!;
    trigger.focus();
    fireEvent.click(trigger);
    let dialog = screen.getByRole('dialog', { name: 'Campaign context' });
    expect(
      within(dialog).getByRole('option', { name: 'Untitled collection' }),
    ).toBeInTheDocument();
    fireEvent.click(dialog);
    expect(screen.getByRole('dialog', { name: 'Campaign context' })).toBeInTheDocument();
    fireEvent.click(dialog.parentElement!);
    expect(trigger).toHaveFocus();
    fireEvent.click(
      screen.getByText('Campaign context', { selector: 'summary', exact: false }),
    );
    expect(
      screen.getByRole('checkbox', {
        name: 'Include "Untitled collection" in this session',
      }),
    ).toBeChecked();
    expect(screen.getByLabelText('Collection to update')).toHaveValue(id);
    const exported = exportDialog();
    fireEvent.click(exported.parentElement!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const menu = screen.getByRole('button', { name: 'Sessions (2)' });
    menu.focus();
    fireEvent.click(menu);
    dialog = screen.getByRole('dialog', { name: 'Sessions' });
    fireEvent.click(dialog.parentElement!);
    expect(menu).toHaveFocus();
    fireEvent.click(menu);
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Sessions' })).getByRole('button', {
        name: 'Close',
      }),
    );
    expect(menu).toHaveFocus();
  });

  it('resets copied feedback after its timeout and on export scope changes', async () => {
    vi.useFakeTimers();
    show();
    const dialog = exportDialog();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Copy text' }));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(within(dialog).getByRole('button', { name: 'Copied' })).toBeInTheDocument();
    await act(async () => vi.advanceTimersByTimeAsync(1500));
    expect(within(dialog).getByRole('button', { name: 'Copy text' })).toBeInTheDocument();
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Close' })[1]!);
    vi.useRealTimers();
  });

  it('paginates long lists and resets the page when search or sort changes', () => {
    useSessionStore.setState({
      sessions: Array.from({ length: 52 }, (_, index) => ({
        ...first,
        id: `entry${index}`,
        title: `Entry ${index}`,
        updatedAt: index,
      })),
      selectedSessionId: 'entry0',
    });
    show();
    const navigation = screen.getByRole('navigation', { name: 'Session list pages' });
    fireEvent.click(within(navigation).getByRole('button', { name: 'Next page' }));
    expect(within(navigation).getByText('Page 2 of 2')).toBeInTheDocument();
    fireEvent.click(within(navigation).getByRole('button', { name: 'Previous page' }));
    expect(within(navigation).getByText('Page 1 of 2')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Sort sessions' }), {
      target: { value: 'title' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Descending' }));
    expect(screen.getAllByRole('button', { name: /^Entry \d/ })[0]).toHaveTextContent(
      'Entry 0',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ascending' }));
    expect(screen.getAllByRole('button', { name: /^Entry \d/ })[0]).toHaveTextContent(
      'Entry 51',
    );
    const search = screen.getByRole('searchbox', {
      name: 'Search session titles and content',
    });
    fireEvent.change(search, { target: { value: 'Entry 51' } });
    expect(
      screen.queryByRole('navigation', { name: 'Session list pages' }),
    ).not.toBeInTheDocument();
    expect(useSessionStore.getState().selectedSessionId).toBe('entry0');
    fireEvent.click(
      within(search.parentElement!).getByRole('button', { name: 'Clear search' }),
    );
    expect(
      screen.getByRole('navigation', { name: 'Session list pages' }),
    ).toBeInTheDocument();
  });

  it('preserves transcript edit drafts across views and rejects blank submitted fragments', async () => {
    useSessionStore
      .getState()
      .appendTranscript('one', 'Original', { time: 1000, offsetMs: 0 });
    show();
    transcript();
    fireEvent.submit(screen.getByLabelText('Add a transcript entry').closest('form')!);
    expect(useSessionStore.getState().sessions[0]!.entries).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Edit fragment 0:00' }));
    fireEvent.change(screen.getByLabelText('Fragment text'), { target: { value: ' ' } });
    fireEvent.submit(screen.getByLabelText('Fragment text').closest('form')!);
    expect(useSessionStore.getState().sessions[0]!.entries[0]!.text).toBe('Original');
    fireEvent.change(screen.getByLabelText('Fragment text'), {
      target: { value: 'Draft correction' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    transcript();
    expect(screen.getByLabelText('Fragment text')).toHaveValue('Draft correction');
    fireEvent.click(screen.getByRole('button', { name: 'Delete fragment 0:00' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Fragment text')).toHaveValue('Draft correction');
    fireEvent.click(screen.getByRole('button', { name: 'Delete fragment 0:00' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
    await waitFor(() =>
      expect(useSessionStore.getState().sessions[0]!.entries).toHaveLength(0),
    );
    expect(screen.queryByLabelText('Fragment text')).not.toBeInTheDocument();
  });

  it('cancels microphone startup and keeps capture controls available from the notes view', () => {
    mocks.speech.start.mockImplementation(async () => {
      Object.assign(mocks.speech, {
        status: 'starting',
        listening: false,
        busy: true,
        backend: 'browser',
      });
      refresh();
    });
    show();
    transcript();
    fireEvent.click(screen.getByRole('button', { name: 'Start transcription' }));
    expect(
      screen.getByRole('combobox', { name: 'Transcription language' }),
    ).toBeDisabled();
    expect(screen.getByText('Starting microphone...')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show transcript' }));
    expect(screen.getByRole('button', { name: 'Stop' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Notes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(mocks.speech.stop).toHaveBeenCalled();
    expect(useSessionStore.getState().sessions[0]!.durationMs).toBe(5000);
  });

  it('keeps pending-audio navigation errors recoverable and closes the guard with Escape', async () => {
    Object.assign(mocks.speech, {
      status: 'error',
      speechError: 'Recoverable failure',
      busy: true,
      pendingCount: 1,
      canRetry: true,
    });
    show();
    fireEvent.click(screen.getByRole('link', { name: 'Leave journal' }));
    let dialog = await screen.findByRole('dialog', { name: 'Finishing before leaving' });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Recoverable failure');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(
      screen.queryByRole('dialog', { name: 'Finishing before leaving' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Leave journal' }));
    dialog = await screen.findByRole('dialog', { name: 'Finishing before leaving' });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Retry pending fragments' }),
    );
    await screen.findByRole('heading', { name: 'Destination' });
  });

  it('requires explicit confirmation before discarding pending audio to complete navigation', async () => {
    Object.assign(mocks.speech, {
      status: 'error',
      speechError: 'Recoverable failure',
      busy: true,
      pendingCount: 1,
      canRetry: true,
    });
    show();
    fireEvent.click(screen.getByRole('link', { name: 'Leave journal' }));
    const dialog = await screen.findByRole('dialog', {
      name: 'Finishing before leaving',
    });
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Discard pending audio' }),
    );
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Cancel' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument(),
    );
    expect(mocks.speech.discardPending).not.toHaveBeenCalled();
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Discard pending audio' }),
    );
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Discard pending audio',
      }),
    );
    await screen.findByRole('heading', { name: 'Destination' });
    expect(mocks.speech.discardPending).toHaveBeenCalledOnce();
  });

  it('can confirm discarding pending audio while remaining in the journal', async () => {
    Object.assign(mocks.speech, {
      status: 'error',
      speechError: 'Recoverable failure',
      busy: true,
      pendingCount: 1,
      canRetry: true,
    });
    show();
    transcript();
    fireEvent.click(screen.getByRole('button', { name: 'Discard pending audio' }));
    fireEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Discard pending audio',
      }),
    );
    await waitFor(() => expect(mocks.speech.discardPending).toHaveBeenCalledOnce());
  });

  it('keeps notes usable without speech APIs and closes the session list with Escape', () => {
    mocks.speech.supported = false;
    show();
    transcript();
    expect(
      screen.getByText("Voice capture isn't supported in this browser."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Start transcription' }),
    ).not.toBeInTheDocument();
    const open = screen.getByRole('button', { name: 'Sessions (2)' });
    open.focus();
    fireEvent.click(open);
    const dialog = screen.getByRole('dialog', { name: 'Sessions' });
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(open).toHaveFocus();
    fireEvent.click(open);
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Sessions' })).getByRole('button', {
        name: 'New session',
      }),
    );
    expect(useSessionStore.getState().sessions).toHaveLength(3);
  });
});
