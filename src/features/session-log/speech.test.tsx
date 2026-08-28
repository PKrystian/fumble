import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpeechRecognition } from './speech';

const pipeline = vi.fn();
const transformer = vi.hoisted(() => ({
  failure: null as unknown,
}));

vi.mock('@huggingface/transformers', () => ({
  env: {},
  pipeline: vi.fn(async (_task, _model, options) => {
    options.progress_callback({ status: 'downloading', progress: 42 });
    options.progress_callback({ status: 'loading' });
    options.progress_callback({ status: 'ready', progress: 100 });
    if (transformer.failure) throw transformer.failure;
    return pipeline;
  }),
}));

class MediaRecorderMock {
  static instances: MediaRecorderMock[] = [];
  state = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(_stream: MediaStream) {
    MediaRecorderMock.instances.push(this);
  }

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    this.onstop?.();
  }
}

class NativeSpeechRecognitionMock {
  static instances: NativeSpeechRecognitionMock[] = [];
  continuous = false;
  interimResults = false;
  lang = '';
  maxAlternatives = 0;
  onresult:
    | ((event: {
        resultIndex: number;
        results: Array<{ isFinal: boolean; 0?: { transcript: string } }>;
      }) => void)
    | null = null;
  onerror: (() => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();

  constructor() {
    NativeSpeechRecognitionMock.instances.push(this);
  }
}

class ThrowingNativeSpeechRecognitionMock extends NativeSpeechRecognitionMock {
  start = vi.fn(() => {
    throw new Error('Speech recognition unavailable');
  });
}

const track = { stop: vi.fn() };
const stream = { getTracks: () => [track] } as unknown as MediaStream;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <MemoryRouter>{children}</MemoryRouter>
);

describe('speech recognition hook', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    MediaRecorderMock.instances = [];
    NativeSpeechRecognitionMock.instances = [];
    track.stop.mockClear();
    pipeline.mockReset();
    transformer.failure = null;
    vi.stubGlobal('MediaRecorder', MediaRecorderMock);
    Object.defineProperty(Blob.prototype, 'arrayBuffer', {
      configurable: true,
      value: vi.fn(async () => new ArrayBuffer(8)),
    });
    vi.stubGlobal(
      'AudioContext',
      class {
        decodeAudioData = vi.fn(async () => ({
          numberOfChannels: 1,
          length: 4,
          getChannelData: () => new Float32Array([0.2, 0.3, 0.2, 0.3]),
        }));
        close = vi.fn(async () => undefined);
      },
    );
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn(async () => stream) },
    });
  });

  it('keeps recording when the model download fails and retries after failure', async () => {
    transformer.failure = new TypeError('Failed to fetch');
    const first = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => first.result.current.start());
    const firstRecorder = MediaRecorderMock.instances[0]!;
    await act(async () => {
      firstRecorder.ondataavailable?.({
        data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }),
      });
      firstRecorder.stop();
    });
    await waitFor(() =>
      expect(first.result.current.speechError).toBe(
        'Transcription is unavailable. Recording continues. You can keep taking notes manually.',
      ),
    );
    expect(first.result.current.listening).toBe(true);
    expect(first.result.current.speechError).not.toContain('Failed to fetch');
    first.result.current.stop();
    first.unmount();

    transformer.failure = new Error('Model failed');
    const second = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => second.result.current.start());
    const secondRecorder = MediaRecorderMock.instances.at(-1)!;
    await act(async () => {
      secondRecorder.ondataavailable?.({
        data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }),
      });
      secondRecorder.stop();
    });
    await waitFor(() =>
      expect(second.result.current.speechError).toBe(
        'Transcription is unavailable. Recording continues. You can keep taking notes manually.',
      ),
    );
    second.result.current.stop();
    second.unmount();
  });

  it('uses browser speech recognition and emits final results', async () => {
    vi.stubGlobal('SpeechRecognition', NativeSpeechRecognitionMock);
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition(onFinal, 'polish'), {
      wrapper,
    });

    expect(result.current.supported).toBe(true);
    await act(async () => result.current.start());

    const recognition = NativeSpeechRecognitionMock.instances[0]!;
    expect(recognition.start).toHaveBeenCalledTimes(1);
    expect(recognition.continuous).toBe(true);
    expect(recognition.interimResults).toBe(true);
    expect(recognition.maxAlternatives).toBe(1);
    expect(recognition.lang).toBe('pl-PL');

    act(() => {
      recognition.onresult?.({
        resultIndex: 0,
        results: [
          { isFinal: false, 0: { transcript: 'partial words' } },
          { isFinal: true, 0: { transcript: 'final words' } },
        ],
      });
      recognition.onend?.();
    });

    expect(result.current.interim).toBe('partial words');
    expect(onFinal).toHaveBeenCalledWith('final words');
    expect(recognition.start).toHaveBeenCalledTimes(2);

    act(() => result.current.stop());
    expect(recognition.stop).toHaveBeenCalledTimes(1);
    expect(result.current.listening).toBe(false);
  });

  it('falls back to the local recorder when browser speech recognition fails', async () => {
    vi.stubGlobal('SpeechRecognition', NativeSpeechRecognitionMock);
    pipeline.mockResolvedValue({ text: 'Local fallback transcript' });
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition(onFinal), { wrapper });

    await act(async () => result.current.start());
    const recognition = NativeSpeechRecognitionMock.instances[0]!;
    expect(MediaRecorderMock.instances).toHaveLength(0);

    await act(async () => {
      recognition.onerror?.();
      await Promise.resolve();
    });
    await waitFor(() => expect(MediaRecorderMock.instances).toHaveLength(1));
    expect(result.current.listening).toBe(true);

    const recorder = MediaRecorderMock.instances[0]!;
    await act(async () => {
      recorder.ondataavailable?.({
        data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }),
      });
      recorder.stop();
    });
    await waitFor(() =>
      expect(onFinal).toHaveBeenCalledWith('Local fallback transcript'),
    );
    result.current.stop();
  });

  it('uses the local recorder when browser speech recognition cannot start', async () => {
    vi.stubGlobal('SpeechRecognition', ThrowingNativeSpeechRecognitionMock);
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });

    await act(async () => result.current.start());

    expect(MediaRecorderMock.instances).toHaveLength(1);
    expect(result.current.listening).toBe(true);
    result.current.stop();
  });

  it('reports when the local fallback cannot start', async () => {
    vi.stubGlobal('SpeechRecognition', NativeSpeechRecognitionMock);
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => {
          throw new Error('Permission denied');
        }),
      },
    });
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });

    await act(async () => result.current.start());
    const recognition = NativeSpeechRecognitionMock.instances[0]!;
    await act(async () => {
      recognition.onerror?.();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(result.current.speechError).toBe(
        'The backup transcription could not start. You can still use session notes.',
      ),
    );
    expect(result.current.listening).toBe(false);
  });

  it('starts, transcribes chunks and stops media resources', async () => {
    pipeline.mockResolvedValue({
      text: ' Dragon attacks, dragon attacks, dragon attacks, end ',
    });
    const onFinal = vi.fn();
    const { result, unmount } = renderHook(() => useSpeechRecognition(onFinal), {
      wrapper,
    });

    expect(result.current.supported).toBe(true);
    await act(async () => result.current.start());
    expect(result.current.listening).toBe(true);
    expect(MediaRecorderMock.instances).toHaveLength(1);

    const recorder = MediaRecorderMock.instances[0]!;
    await act(async () => {
      recorder.ondataavailable?.({ data: new Blob() });
      recorder.ondataavailable?.({
        data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }),
      });
      recorder.stop();
    });
    await waitFor(() =>
      expect(onFinal).toHaveBeenCalledWith('Dragon attacks, dragon attacks'),
    );

    act(() => result.current.stop());
    expect(result.current.listening).toBe(false);
    expect(track.stop).toHaveBeenCalled();
    unmount();
  });

  it('ignores silent and undersized chunks', async () => {
    vi.stubGlobal(
      'AudioContext',
      class {
        decodeAudioData = vi.fn(async () => ({
          numberOfChannels: 2,
          length: 2,
          getChannelData: () => new Float32Array([0, 0]),
        }));
        close = vi.fn(async () => undefined);
      },
    );
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition(onFinal), { wrapper });
    await act(async () => result.current.start());
    const recorder = MediaRecorderMock.instances[0]!;
    await act(async () => {
      recorder.ondataavailable?.({ data: new Blob(['small']) });
      recorder.ondataavailable?.({
        data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }),
      });
      recorder.stop();
    });
    await waitFor(() => expect(result.current.interim).toBe(''));
    expect(onFinal).not.toHaveBeenCalled();
    result.current.stop();
    result.current.stop();
  });

  it('reports microphone failures', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => {
          throw new Error('Permission denied');
        }),
      },
    });
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => result.current.start());
    expect(result.current.listening).toBe(false);
    expect(result.current.speechError).toBe('Microphone access denied');
  });

  it('reports recorder startup failures and releases the microphone', async () => {
    vi.stubGlobal(
      'MediaRecorder',
      class {
        constructor(_stream: MediaStream) {
          throw new Error('Recorder unavailable');
        }
      },
    );
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => result.current.start());
    expect(result.current.listening).toBe(false);
    expect(result.current.speechError).toBe(
      'Audio recording could not start. You can still use session notes.',
    );
    expect(track.stop).toHaveBeenCalled();
  });

  it('uses localized microphone errors for non-error rejections', async () => {
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: vi.fn(async () => {
          throw 'denied';
        }),
      },
    });
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => result.current.start());
    expect(result.current.speechError).toBe('Microphone access denied');
  });

  it('reports transcription failures and continues with the latest callback', async () => {
    pipeline
      .mockRejectedValueOnce(new Error('Transcription failed'))
      .mockResolvedValueOnce({ text: 'one, two, one' });
    const firstFinal = vi.fn();
    const secondFinal = vi.fn();
    const { result, rerender } = renderHook(
      ({ onFinal, language }) => useSpeechRecognition(onFinal, language),
      {
        initialProps: { onFinal: firstFinal, language: 'english' },
        wrapper,
      },
    );

    await act(async () => result.current.start());
    const firstRecorder = MediaRecorderMock.instances[0]!;
    await act(async () => {
      firstRecorder.ondataavailable?.({
        data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }),
      });
      firstRecorder.stop();
    });
    await waitFor(() => expect(result.current.speechError).toBe('Transcription failed'));

    rerender({ onFinal: secondFinal, language: 'polish' });
    const secondRecorder = MediaRecorderMock.instances.at(-1)!;
    await act(async () => {
      secondRecorder.ondataavailable?.({
        data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }),
      });
      secondRecorder.stop();
    });
    await waitFor(() => expect(secondFinal).toHaveBeenCalledWith('one, two, one'));
    expect(firstFinal).not.toHaveBeenCalled();
    expect(pipeline).toHaveBeenLastCalledWith(
      expect.any(Float32Array),
      expect.objectContaining({ language: 'polish' }),
    );
    result.current.stop();
  });

  it('uses localized transcription errors for non-error failures', async () => {
    pipeline.mockRejectedValue('failed');
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => result.current.start());
    const recorder = MediaRecorderMock.instances[0]!;
    await act(async () => {
      recorder.ondataavailable?.({
        data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }),
      });
      recorder.stop();
    });
    await waitFor(() => expect(result.current.speechError).toBe('Transcription failed'));
    result.current.stop();
  });

  it('ignores transcription results without text', async () => {
    pipeline.mockResolvedValue(null);
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition(onFinal), { wrapper });
    await act(async () => result.current.start());
    const recorder = MediaRecorderMock.instances[0]!;
    await act(async () => {
      recorder.ondataavailable?.({
        data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }),
      });
      recorder.stop();
    });
    await waitFor(() => expect(result.current.interim).toBe(''));
    expect(onFinal).not.toHaveBeenCalled();
    result.current.stop();
  });

  it('does not start a second queue processor while transcription is pending', async () => {
    let resolvePipeline: (value: { text: string }) => void = () => undefined;
    pipeline
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolvePipeline = resolve;
          }),
      )
      .mockResolvedValue({ text: 'Second chunk' });
    const onFinal = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition(onFinal), { wrapper });
    await act(async () => result.current.start());

    const first = MediaRecorderMock.instances[0]!;
    await act(async () => {
      first.ondataavailable?.({
        data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }),
      });
      first.stop();
    });
    const second = MediaRecorderMock.instances[1]!;
    await act(async () => {
      second.ondataavailable?.({
        data: new Blob([new Uint8Array(4000)], { type: 'audio/webm' }),
      });
      second.stop();
    });
    await act(async () => resolvePipeline({ text: 'First chunk' }));
    await waitFor(() => expect(onFinal).toHaveBeenCalledTimes(2));
    result.current.stop();
  });

  it('stops an active recorder and stream when unmounted', async () => {
    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
    const { result, unmount } = renderHook(() => useSpeechRecognition(vi.fn()), {
      wrapper,
    });
    await act(async () => result.current.start());
    const recorder = MediaRecorderMock.instances[0]!;
    const stopSpy = vi.spyOn(recorder, 'stop');

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(stopSpy).toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });

  it('only stops recording timers for active recorders', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => result.current.start());
    const recorder = MediaRecorderMock.instances[0]!;
    recorder.state = 'inactive';
    const stopSpy = vi.spyOn(recorder, 'stop');

    act(() => vi.advanceTimersByTime(10000));

    expect(stopSpy).not.toHaveBeenCalled();
    result.current.stop();
    vi.useRealTimers();
  });

  it('stops active recorders when the chunk timer expires', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    await act(async () => result.current.start());
    const recorder = MediaRecorderMock.instances[0]!;
    const stopSpy = vi.spyOn(recorder, 'stop');

    act(() => vi.advanceTimersByTime(10000));

    expect(stopSpy).toHaveBeenCalled();
    result.current.stop();
    vi.useRealTimers();
  });

  it('detects missing browser recording APIs', () => {
    Reflect.deleteProperty(window, 'MediaRecorder');
    Reflect.deleteProperty(window, 'AudioContext');
    const { result } = renderHook(() => useSpeechRecognition(vi.fn()), { wrapper });
    expect(result.current.supported).toBe(false);
  });
});
