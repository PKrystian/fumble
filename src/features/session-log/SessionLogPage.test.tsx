import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SessionLogPage } from './SessionLogPage';

const mocks = vi.hoisted(() => ({
  state: {
    sessions: [] as Array<{
      id: string;
      title: string;
      notes: string;
      durationMs: number;
      entries: Array<{ time: number; text: string }>;
    }>,
    addSession: vi.fn(() => 'new'),
    updateSession: vi.fn(),
    appendTranscript: vi.fn(),
    deleteSession: vi.fn(),
    transcriptionLang: 'english',
    setTranscriptionLang: vi.fn(),
  },
  speech: {
    supported: true,
    listening: false,
    interim: '',
    speechError: '',
    start: vi.fn(),
    stop: vi.fn(),
  },
  callback: undefined as ((text: string) => void) | undefined,
  confirmDialog: vi.fn(),
}));

vi.mock('./store', async (importOriginal) => {
  const original = await importOriginal<typeof import('./store')>();
  return {
    ...original,
    useSessionStore: (selector: (state: typeof mocks.state) => unknown) =>
      selector(mocks.state),
  };
});

vi.mock('./speech', () => ({
  useSpeechRecognition: (callback: (text: string) => void) => {
    mocks.callback = callback;
    return mocks.speech;
  },
}));

vi.mock('@/features/ui/confirmStore', () => ({
  confirmDialog: (...args: unknown[]) => mocks.confirmDialog(...args),
}));

const session = {
  id: 'one',
  title: 'Session One',
  notes: 'Initial notes',
  durationMs: 5000,
  entries: [{ time: Date.UTC(2026, 0, 1, 10, 0, 0), text: 'First transcript line' }],
};

const renderPage = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <SessionLogPage />
    </MemoryRouter>,
  );

describe('SessionLogPage', () => {
  beforeEach(() => {
    mocks.state.sessions = [];
    mocks.state.addSession.mockReset();
    mocks.state.addSession.mockReturnValue('new');
    mocks.state.updateSession.mockReset();
    mocks.state.appendTranscript.mockReset();
    mocks.state.deleteSession.mockReset();
    mocks.state.transcriptionLang = 'english';
    mocks.state.setTranscriptionLang.mockReset();
    mocks.speech.supported = true;
    mocks.speech.listening = false;
    mocks.speech.interim = '';
    mocks.speech.speechError = '';
    mocks.speech.start.mockReset();
    mocks.speech.stop.mockReset();
    mocks.confirmDialog.mockReset();
    mocks.confirmDialog.mockResolvedValue(true);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('creates a session from the empty state', () => {
    renderPage();
    expect(screen.getByText('No session selected.')).toBeInTheDocument();
    mocks.callback?.('Ignored words');
    expect(mocks.state.appendTranscript).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Start a new session' }));
    expect(mocks.state.addSession).toHaveBeenCalled();
  });

  it('creates a session with a Polish localized date', () => {
    renderPage('/pl/session-log');
    fireEvent.click(screen.getByRole('button', { name: /Rozpocznij/ }));
    expect(mocks.state.addSession).toHaveBeenCalledWith(expect.stringMatching(/\d{4}/));
  });

  it('edits, copies, navigates and deletes a populated session', async () => {
    mocks.state.sessions = [session];
    renderPage();
    await screen.findByDisplayValue('Session One');

    fireEvent.change(screen.getByDisplayValue('Session One'), {
      target: { value: 'Renamed' },
    });
    expect(mocks.state.updateSession).toHaveBeenCalledWith('one', { title: 'Renamed' });
    fireEvent.change(screen.getByLabelText('Session notes'), {
      target: { value: 'Changed notes' },
    });
    expect(mocks.state.updateSession).toHaveBeenCalledWith('one', {
      notes: 'Changed notes',
    });

    fireEvent.change(screen.getByLabelText('Transcription language'), {
      target: { value: 'polish' },
    });
    expect(mocks.state.setTranscriptionLang).toHaveBeenCalledWith('polish');
    fireEvent.click(screen.getByRole('button', { name: 'Copy transcript' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy with AI prompt' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2));
    expect(await screen.findAllByText('Copied')).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Close menu' })[1]!);
    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Close menu' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Delete session' }));
    await waitFor(() => expect(mocks.state.deleteSession).toHaveBeenCalledWith('one'));
  });

  it('records speech, appends transcript and accumulates duration', async () => {
    mocks.state.sessions = [session];
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    renderPage();
    await screen.findByDisplayValue('Session One');
    fireEvent.click(screen.getByRole('button', { name: 'Record' }));
    expect(mocks.speech.start).toHaveBeenCalled();
    mocks.callback?.('Recognized words');
    expect(mocks.state.appendTranscript).toHaveBeenCalledWith('one', 'Recognized words');

    now.mockReturnValue(4000);
    mocks.speech.listening = true;
    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(mocks.speech.stop).toHaveBeenCalled();
    expect(mocks.state.updateSession).toHaveBeenCalledWith('one', {
      durationMs: 8000,
    });
  });

  it('shows interim text, speech errors and unsupported recognition', async () => {
    mocks.state.sessions = [session];
    mocks.speech.listening = true;
    mocks.speech.interim = 'Interim words';
    mocks.speech.speechError = 'Microphone failed';
    const view = renderPage();
    await screen.findByText('Interim words');
    expect(screen.getByText('Microphone failed')).toBeInTheDocument();
    expect(screen.getByText('recording')).toBeInTheDocument();

    mocks.speech.supported = false;
    mocks.speech.listening = false;
    view.rerender(
      <MemoryRouter>
        <SessionLogPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText("Voice capture isn't supported in this browser."),
    ).toBeInTheDocument();
  });

  it('preserves a session when deletion is rejected', async () => {
    mocks.state.sessions = [session];
    mocks.confirmDialog.mockResolvedValue(false);
    renderPage();
    await screen.findByDisplayValue('Session One');
    fireEvent.click(screen.getByRole('button', { name: 'Delete session' }));
    await waitFor(() => expect(mocks.confirmDialog).toHaveBeenCalled());
    expect(mocks.state.deleteSession).not.toHaveBeenCalled();
  });

  it('switches sessions and renders an empty transcript', async () => {
    mocks.state.sessions = [
      session,
      {
        ...session,
        id: 'two',
        title: 'Session Two',
        entries: [],
      },
    ];
    renderPage();
    await screen.findByDisplayValue('Session One');
    fireEvent.click(screen.getByRole('button', { name: /Session Two/ }));
    expect(await screen.findByDisplayValue('Session Two')).toBeInTheDocument();
    expect(
      screen.getByText('Your session transcript will appear here as you speak…'),
    ).toBeInTheDocument();
  });

  it('updates the live timer and handles stopping without a recorded start', async () => {
    vi.useFakeTimers();
    mocks.state.sessions = [session];
    mocks.speech.listening = true;
    const view = renderPage();
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(mocks.speech.stop).toHaveBeenCalled();
    expect(mocks.state.updateSession).not.toHaveBeenCalled();
    view.unmount();
    vi.useRealTimers();
  });

  it('clears copied indicators after their timeout', async () => {
    vi.useFakeTimers();
    mocks.state.sessions = [session];
    renderPage();
    await act(async () => vi.advanceTimersByTimeAsync(0));
    fireEvent.click(screen.getByRole('button', { name: 'Copy transcript' }));
    fireEvent.click(screen.getByRole('button', { name: 'Copy with AI prompt' }));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getAllByText('Copied')).toHaveLength(2);
    await act(async () => vi.advanceTimersByTimeAsync(1500));
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
