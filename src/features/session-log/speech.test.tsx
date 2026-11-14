import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MAX_PENDING_CHUNKS, useSpeechRecognition } from './speech';
import { WhisperModelError } from './speechEngine';

const mocks = vi.hoisted(() => ({ transcribe: vi.fn() }));
vi.mock('./speechEngine', async (original) => ({
  ...(await original<typeof import('./speechEngine')>()),
  transcribeBlob: (...args: unknown[]) => mocks.transcribe(...args),
}));
class Recorder {
  static instances: Recorder[] = [];
  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(_stream: MediaStream) {
    Recorder.instances.push(this);
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.onstop?.();
  }
}
class Recognition {
  static instances: Recognition[] = [];
  continuous = false;
  interimResults = false;
  lang = '';
  maxAlternatives = 0;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((event?: { error?: string }) => void) | null = null;
  onresult:
    | ((event: {
        resultIndex: number;
        results: Array<{ isFinal: boolean; 0?: { transcript: string } } | undefined>;
      }) => void)
    | null = null;
  start = vi.fn(() => this.onstart?.());
  stop = vi.fn(() => this.onend?.());
  constructor() {
    Recognition.instances.push(this);
  }
}
const track = { stop: vi.fn() };
const stream = { getTracks: () => [track] } as unknown as MediaStream;
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);
function chunk(recorder = Recorder.instances.at(-1)!, bytes = 50) {
  recorder.ondataavailable?.({ data: new Blob([new Uint8Array(bytes)]) });
  recorder.stop();
}
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
beforeEach(() => {
  vi.unstubAllGlobals();
  Recorder.instances = [];
  Recognition.instances = [];
  track.stop.mockReset();
  mocks.transcribe.mockReset();
  mocks.transcribe.mockResolvedValue('Words');
  vi.stubGlobal('MediaRecorder', Recorder);
  vi.stubGlobal('AudioContext', class {});
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => stream) },
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('session-owned speech capture', () => {
  it('stops the microphone after a runtime recorder error and retains the final chunk for retry', async () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition(callback), { wrapper });
    await act(async () => result.current.start());
    const recorder = Recorder.instances[0]!;
    act(() => {
      recorder.ondataavailable?.({ data: new Blob(['Pending speech']) });
      recorder.onerror?.();
    });
    expect(result.current.status).toBe('error');
    expect(result.current.listening).toBe(false);
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.canRetry).toBe(true);
    expect(mocks.transcribe).not.toHaveBeenCalled();
    await act(async () => result.current.retry());
    expect(callback).toHaveBeenCalledOnce();
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.status).toBe('idle');
  });
  it('skips empty recognition results and does not extend duration after stopping', async () => {
    vi.useFakeTimers();
    mocks.transcribe.mockResolvedValue('');
    const callback = vi.fn();
    const duration = vi.fn();
    const { result } = renderHook(
      () => useSpeechRecognition(callback, 'english', { onDuration: duration }),
      { wrapper },
    );
    await act(async () => result.current.start());
    await act(async () => {
      chunk();
      await Promise.resolve();
    });
    expect(callback).not.toHaveBeenCalled();
    expect(result.current.listening).toBe(true);
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    act(() => {
      result.current.stop();
      vi.advanceTimersByTime(500);
    });
    expect(duration).toHaveBeenCalledExactlyOnceWith(1000);
    expect(result.current.elapsedMs).toBe(1000);
  });

  it('releases a recorder that enters recording state before start throws', async () => {
    vi.spyOn(Recorder.prototype, 'start').mockImplementation(function (this: Recorder) {
      this.state = 'recording';
      throw new Error('Device disconnected');
    });
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => result.current.start());
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.status).toBe('error');
    expect(result.current.busy).toBe(false);
  });
  it('pins pending audio, language, timestamps and duration to the original callbacks', async () => {
    const pending = deferred<string>();
    mocks.transcribe.mockReturnValue(pending.promise);
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const first = vi.fn();
    const second = vi.fn();
    const firstDuration = vi.fn();
    const secondDuration = vi.fn();
    const view = renderHook(
      ({ callback, language, duration }) =>
        useSpeechRecognition(callback, language, { onDuration: duration }),
      {
        wrapper,
        initialProps: { callback: first, language: 'english', duration: firstDuration },
      },
    );
    await act(async () => view.result.current.start());
    now.mockReturnValue(3000);
    act(() => chunk());
    view.rerender({ callback: second, language: 'polish', duration: secondDuration });
    now.mockReturnValue(5000);
    act(() => view.result.current.stop());
    expect(view.result.current.status).toBe('processing');
    expect(firstDuration).toHaveBeenCalledWith(4000);
    expect(secondDuration).not.toHaveBeenCalled();
    await act(async () => {
      pending.resolve('Original session');
      await pending.promise;
    });
    expect(first).toHaveBeenCalledWith('Original session', { time: 1000, offsetMs: 0 });
    expect(second).not.toHaveBeenCalled();
    expect(mocks.transcribe.mock.calls[0]![1]).toBe('english');
    expect(view.result.current.status).toBe('idle');
    expect(track.stop).toHaveBeenCalledTimes(1);
    act(() => view.result.current.stop());
    expect(firstDuration).toHaveBeenCalledTimes(1);
  });

  it('waits for microphone permission and cancels late streams without recording them', async () => {
    const pending = deferred<MediaStream>();
    vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    let starting!: Promise<void>;
    act(() => {
      starting = result.current.start();
    });
    expect(result.current.status).toBe('starting');
    expect(result.current.elapsedMs).toBe(0);
    await act(async () => result.current.start());
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
    act(() => result.current.stop());
    await act(async () => {
      pending.resolve(stream);
      await starting;
    });
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(Recorder.instances).toHaveLength(0);
    expect(result.current.status).toBe('idle');
  });

  it('ignores a permission rejection after the user stopped starting', async () => {
    const pending = deferred<MediaStream>();
    vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(pending.promise);
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    let starting!: Promise<void>;
    act(() => {
      starting = result.current.start();
    });
    act(() => result.current.stop());
    await act(async () => {
      pending.reject(new Error('Denied'));
      await starting;
    });
    expect(result.current.speechError).toBe('');
  });

  it('retains failed audio, stops the microphone and retries without duplicating text', async () => {
    mocks.transcribe.mockRejectedValueOnce(new WhisperModelError());
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition(onFinal), { wrapper });
    await act(async () => result.current.start());
    await act(async () => chunk());
    await waitFor(() => expect(result.current.canRetry).toBe(true));
    expect(result.current.listening).toBe(false);
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.speechError).toContain('microphone has stopped');
    const recorders = Recorder.instances.length;
    await act(async () => result.current.start());
    expect(Recorder.instances).toHaveLength(recorders);
    await act(async () => result.current.retry());
    expect(onFinal).toHaveBeenCalledTimes(1);
    expect(result.current.pendingCount).toBe(0);
    expect(result.current.status).toBe('idle');
    await act(async () => result.current.retry());
    expect(onFinal).toHaveBeenCalledTimes(1);
  });

  it.each([new Error('Decoder'), null])(
    'shows a localized processing error and discards only pending audio: %s',
    async (error) => {
      mocks.transcribe.mockRejectedValue(error);
      const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
      await act(async () => result.current.start());
      await act(async () => chunk());
      await waitFor(() => expect(result.current.canRetry).toBe(true));
      expect(result.current.speechError).toContain('could not be transcribed');
      act(() => result.current.discardPending());
      expect(result.current.pendingCount).toBe(0);
      expect(result.current.speechError).toBe('');
    },
  );

  it('bounds a slow transcription queue without dropping its pending fragments', async () => {
    const pending = deferred<string>();
    mocks.transcribe.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => result.current.start());
    act(() => {
      for (let index = 0; index <= MAX_PENDING_CHUNKS; index++) chunk();
    });
    expect(result.current.speechError).toContain('queue is full');
    expect(result.current.listening).toBe(false);
    expect(result.current.pendingCount).toBe(MAX_PENDING_CHUNKS + 1);
    act(() => result.current.discardPending());
    expect(result.current.pendingCount).toBe(MAX_PENDING_CHUNKS + 1);
    await act(async () => {
      pending.resolve('Completed');
      await pending.promise;
    });
    expect(result.current.pendingCount).toBe(MAX_PENDING_CHUNKS);
    expect(result.current.canRetry).toBe(true);
    act(() => result.current.discardPending());
    expect(result.current.pendingCount).toBe(0);
  });

  it('skips empty recorder output and keeps the original recording clock at timestamp zero', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const duration = vi.fn();
    const { result } = renderHook(
      () => useSpeechRecognition(vi.fn(), 'english', { onDuration: duration }),
      { wrapper },
    );
    await act(async () => result.current.start());
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(result.current.elapsedMs).toBe(1000);
    act(() => chunk(undefined, 0));
    expect(mocks.transcribe).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(Recorder.instances.length).toBeGreaterThan(2);
    act(() => result.current.stop());
    expect(duration).toHaveBeenCalledWith(11_000);
  });

  it('releases capture and commits duration on unmount while queued results keep their owner', async () => {
    const pending = deferred<string>();
    mocks.transcribe.mockReturnValue(pending.promise);
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    const onFinal = vi.fn();
    const duration = vi.fn();
    const view = renderHook(
      () => useSpeechRecognition(onFinal, 'polish', { onDuration: duration }),
      { wrapper },
    );
    await act(async () => view.result.current.start());
    act(() => chunk());
    now.mockReturnValue(4000);
    view.unmount();
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(duration).toHaveBeenCalledWith(3000);
    await act(async () => {
      pending.resolve('After navigation');
      await pending.promise;
    });
    expect(onFinal).toHaveBeenCalledTimes(1);
  });

  it('stops and warns before a browser unload', async () => {
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    const empty = new Event('beforeunload', { cancelable: true });
    act(() => window.dispatchEvent(empty));
    expect(empty.defaultPrevented).toBe(false);
    await act(async () => result.current.start());
    const event = new Event('beforeunload', { cancelable: true });
    act(() => window.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
    expect(track.stop).toHaveBeenCalled();
  });

  it.each(['constructor', 'start', 'stop'] as const)(
    'handles recorder %s failures without keeping the microphone active',
    async (stage) => {
      if (stage === 'constructor')
        vi.stubGlobal(
          'MediaRecorder',
          class {
            constructor() {
              throw new Error('Recorder');
            }
          },
        );
      else
        vi.spyOn(Recorder.prototype, stage).mockImplementation(() => {
          throw new Error('Recorder');
        });
      const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
      await act(async () => result.current.start());
      if (stage === 'stop') act(() => result.current.stop());
      expect(result.current.listening).toBe(false);
      expect(result.current.speechError).toContain('Audio recording');
      expect(track.stop).toHaveBeenCalled();
    },
  );

  it('reports missing APIs and denied permissions without a recording duration', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue('Denied');
    const duration = vi.fn();
    const { result } = renderHook(
      () => useSpeechRecognition(vi.fn(), 'polish', { onDuration: duration }),
      { wrapper },
    );
    await act(async () => result.current.start());
    expect(result.current.speechError).toContain('Microphone access');
    expect(duration).not.toHaveBeenCalled();
    vi.stubGlobal('AudioContext', undefined);
    await act(async () => result.current.start());
    expect(result.current.speechError).toContain("isn't supported");
    expect(result.current.supported).toBe(false);
  });

  it('emits native results, keeps final text after Stop and waits for native completion', async () => {
    vi.stubGlobal('SpeechRecognition', Recognition);
    const first = vi.fn();
    const second = vi.fn();
    const view = renderHook(({ callback }) => useSpeechRecognition(callback, 'polish'), {
      wrapper,
      initialProps: { callback: first },
    });
    await act(async () => view.result.current.start());
    const native = Recognition.instances[0]!;
    expect(native.lang).toBe('pl-PL');
    expect(native.continuous).toBe(true);
    expect(native.maxAlternatives).toBe(1);
    expect(view.result.current.backend).toBe('browser');
    view.rerender({ callback: second });
    act(() =>
      native.onresult?.({
        resultIndex: 0,
        results: [
          { isFinal: false, 0: { transcript: ' part ' } },
          { isFinal: false },
          { isFinal: true, 0: { transcript: ' final ' } },
          { isFinal: true, 0: { transcript: ' ' } },
        ],
      }),
    );
    expect(view.result.current.interim).toBe('part');
    expect(first).toHaveBeenCalledWith('final', expect.any(Object));
    expect(second).not.toHaveBeenCalled();
    native.stop.mockImplementation(() => undefined);
    act(() => view.result.current.stop());
    expect(view.result.current.status).toBe('processing');
    act(() =>
      native.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'Last' } }],
      }),
    );
    expect(first).toHaveBeenCalledTimes(2);
    act(() => native.onend?.());
    expect(view.result.current.status).toBe('idle');
    act(() =>
      native.onresult?.({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript: 'Too late' } }],
      }),
    );
    expect(first).toHaveBeenCalledTimes(2);
  });

  it('finishes native Stop even if its service never emits the end event', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('SpeechRecognition', Recognition);
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => result.current.start());
    const native = Recognition.instances[0]!;
    native.stop.mockImplementation(() => {
      throw new Error('Stopped');
    });
    act(() => result.current.stop());
    await act(async () => vi.advanceTimersByTimeAsync(2500));
    expect(result.current.busy).toBe(false);
    act(() => native.onstart?.());
    expect(result.current.status).toBe('idle');
  });

  it('restarts native recognition and falls back locally only in automatic mode', async () => {
    vi.stubGlobal('SpeechRecognition', Recognition);
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => result.current.start());
    const native = Recognition.instances[0]!;
    act(() => native.onend?.());
    expect(native.start).toHaveBeenCalledTimes(2);
    native.start.mockImplementation(() => {
      throw new Error('Restart');
    });
    await act(async () => native.onend?.());
    expect(result.current.backend).toBe('local');
    act(() => native.onerror?.());
    act(() => native.onend?.());
    expect(Recorder.instances).toHaveLength(1);
    act(() => result.current.stop());
  });

  it.each(['auto', 'browser'] as const)(
    'keeps permission errors explicit in %s mode',
    async (mode) => {
      vi.stubGlobal('SpeechRecognition', Recognition);
      const { result } = renderHook(
        () => useSpeechRecognition(vi.fn(), 'english', { mode }),
        { wrapper },
      );
      await act(async () => result.current.start());
      await act(async () =>
        Recognition.instances[0]!.onerror?.({ error: 'not-allowed' }),
      );
      expect(result.current.speechError).toContain('Microphone');
      expect(Recorder.instances).toHaveLength(0);
    },
  );

  it('reports a browser service error when explicit browser mode forbids local fallback', async () => {
    vi.stubGlobal('SpeechRecognition', Recognition);
    const { result } = renderHook(
      () => useSpeechRecognition(vi.fn(), 'english', { mode: 'browser' }),
      { wrapper },
    );
    await act(async () => result.current.start());
    await act(async () => Recognition.instances[0]!.onerror?.({ error: 'network' }));
    expect(result.current.speechError).toContain('Browser speech');
    expect(Recorder.instances).toHaveLength(0);
  });

  it('falls back after native startup failure and respects local-only mode', async () => {
    vi.stubGlobal(
      'SpeechRecognition',
      class extends Recognition {
        start = vi.fn(() => {
          throw new Error('Start');
        });
      },
    );
    const first = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => first.result.current.start());
    expect(first.result.current.backend).toBe('local');
    first.unmount();
    const browser = renderHook(
      () => useSpeechRecognition(vi.fn(), 'english', { mode: 'browser' }),
      { wrapper },
    );
    await act(async () => browser.result.current.start());
    expect(browser.result.current.speechError).toContain('Browser speech');
    browser.unmount();
    vi.stubGlobal('SpeechRecognition', Recognition);
    const local = renderHook(
      () => useSpeechRecognition(vi.fn(), 'english', { mode: 'local' }),
      { wrapper },
    );
    const previous = Recognition.instances.length;
    await act(async () => local.result.current.start());
    expect(Recognition.instances).toHaveLength(previous);
    expect(local.result.current.backend).toBe('local');
  });

  it('uses local capture after native construction throws and reports unavailable fallback', async () => {
    vi.stubGlobal(
      'SpeechRecognition',
      class {
        constructor() {
          throw new Error('Native');
        }
      },
    );
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => result.current.start());
    expect(result.current.backend).toBe('local');
    act(() => result.current.stop());
    vi.stubGlobal('AudioContext', undefined);
    await act(async () => result.current.start());
    expect(result.current.speechError).toContain("isn't supported");
  });

  it('shows model progress separately from provisional speech and keeps late failures retryable', async () => {
    const pending = deferred<string>();
    const duration = vi.fn();
    mocks.transcribe.mockImplementation((_blob, _language, status) => {
      status('Downloading 42%');
      return pending.promise;
    });
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const { result } = renderHook(
      () => useSpeechRecognition(vi.fn(), 'english', { onDuration: duration }),
      { wrapper },
    );
    await act(async () => result.current.start());
    act(() => chunk());
    expect(result.current.modelProgress).toBe('Downloading 42%');
    expect(result.current.interim).toBe('');
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    act(() => result.current.stop());
    await act(async () => {
      pending.reject(new Error('Decode after stop'));
      await Promise.resolve();
    });
    expect(result.current.canRetry).toBe(true);
    expect(duration).toHaveBeenCalledTimes(1);
    expect(result.current.listening).toBe(false);
    act(() => result.current.discardPending());
  });

  it('does not stop an already inactive recorder from its delayed timer', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => result.current.start());
    const recorder = Recorder.instances[0]!;
    recorder.state = 'inactive';
    const stop = vi.spyOn(recorder, 'stop');
    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(stop).not.toHaveBeenCalled();
    act(() => result.current.stop());
  });

  it('ignores old native start events after fallback and accepts sparse native results', async () => {
    vi.stubGlobal('SpeechRecognition', Recognition);
    const callback = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition(callback), { wrapper });
    await act(async () => result.current.start());
    const native = Recognition.instances[0]!;
    act(() => native.onresult?.({ resultIndex: 0, results: [undefined] }));
    expect(callback).not.toHaveBeenCalled();
    await act(async () => native.onerror?.());
    expect(result.current.backend).toBe('local');
    act(() => native.onstart?.());
    expect(result.current.backend).toBe('local');
    act(() => result.current.stop());
  });

  it('treats service permission denial as a microphone error without a second permission request', async () => {
    vi.stubGlobal('SpeechRecognition', Recognition);
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => result.current.start());
    await act(async () =>
      Recognition.instances[0]!.onerror?.({ error: 'service-not-allowed' }),
    );
    expect(result.current.speechError).toContain('Microphone');
    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });
});
