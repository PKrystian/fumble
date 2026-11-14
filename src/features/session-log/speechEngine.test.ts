import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const model = vi.hoisted(() => ({
  factory: vi.fn(),
  recognize: vi.fn(),
  decode: vi.fn(),
  close: vi.fn(),
  options: null as unknown,
  env: { backends: { onnx: {} } },
}));
vi.mock('@huggingface/transformers', () => ({
  env: model.env,
  pipeline: (...args: unknown[]) => model.factory(...args),
}));
beforeEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  model.factory.mockReset();
  model.recognize.mockReset();
  model.decode.mockReset();
  model.close.mockReset();
  model.factory.mockImplementation(async (_task, _name, options) => {
    model.options = options;
    options.progress_callback({ status: 'progress', progress: 42 });
    options.progress_callback({ status: 'downloading', progress: 0 });
    options.progress_callback({ status: 'loading' });
    options.progress_callback({ status: 'ready', progress: 100 });
    return model.recognize;
  });
  model.recognize.mockResolvedValue({ text: 'Recognized speech' });
  model.decode.mockResolvedValue({
    numberOfChannels: 2,
    length: 2,
    getChannelData: (channel: number) =>
      channel ? new Float32Array([0, 0.5]) : new Float32Array([0.5, 0.5]),
  });
  model.close.mockResolvedValue(undefined);
  vi.stubGlobal(
    'AudioContext',
    class {
      decodeAudioData = model.decode;
      close = model.close;
    },
  );
  Object.defineProperty(Blob.prototype, 'arrayBuffer', {
    configurable: true,
    value: vi.fn(async () => new ArrayBuffer(8)),
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('local speech engine', () => {
  it('loads the model once, reports download progress and downmixes channels', async () => {
    const engine = await import('./speechEngine');
    const status = vi.fn();
    expect(
      await engine.transcribeBlob(new Blob(['audio']), 'polish', status, 'Downloading'),
    ).toBe('Recognized speech');
    await engine.transcribeBlob(new Blob(['audio']), 'english', status, 'Downloading');
    expect(model.factory).toHaveBeenCalledTimes(1);
    expect(model.factory).toHaveBeenCalledWith(
      'automatic-speech-recognition',
      'onnx-community/whisper-tiny',
      expect.objectContaining({
        dtype: { encoder_model: 'int8', decoder_model_merged: 'int8' },
      }),
    );
    expect(Array.from(model.recognize.mock.calls[0]![0] as Float32Array)).toEqual([
      0.25, 0.5,
    ]);
    expect(model.recognize.mock.calls[0]![1]).toMatchObject({
      language: 'polish',
      task: 'transcribe',
    });
    expect(status.mock.calls.map(([value]) => value)).toEqual([
      'Downloading 42%...',
      'Downloading 0%...',
      'Downloading...',
    ]);
    expect(model.close).toHaveBeenCalledTimes(2);
  });

  it('clears a failed model initialization so a pending fragment can be retried', async () => {
    const engine = await import('./speechEngine');
    model.factory.mockRejectedValueOnce(new Error('Network'));
    await expect(
      engine.transcribeBlob(new Blob(['audio']), 'english', vi.fn(), ''),
    ).rejects.toBeInstanceOf(engine.WhisperModelError);
    expect(await engine.transcribeBlob(new Blob(['audio']), 'english', vi.fn(), '')).toBe(
      'Recognized speech',
    );
    expect(model.factory).toHaveBeenCalledTimes(2);
  });

  it.each([0, 2])('skips silent or empty audio with %i samples', async (length) => {
    model.decode.mockResolvedValue({
      numberOfChannels: 1,
      length,
      getChannelData: () => new Float32Array(length),
    });
    const engine = await import('./speechEngine');
    expect(await engine.transcribeBlob(new Blob(), 'english', vi.fn(), '')).toBe('');
    expect(model.factory).not.toHaveBeenCalled();
  });

  it('closes the audio context when decoding fails', async () => {
    model.decode.mockRejectedValue(new Error('Decode'));
    const engine = await import('./speechEngine');
    await expect(
      engine.transcribeBlob(new Blob(), 'english', vi.fn(), ''),
    ).rejects.toThrow('Decode');
    expect(model.close).toHaveBeenCalledOnce();
  });

  it.each([
    [{ text: ' A, B, B, B, C' }, 'A, B, B'],
    [{ text: 'A, B, A, B' }, 'A, B, A, B'],
    [{ text: ' , , ' }, ''],
    [{}, ''],
    [null, ''],
    [{ text: 42 }, '42'],
  ])('returns bounded text for model output %j', async (response, expected) => {
    model.recognize.mockResolvedValue(response);
    const engine = await import('./speechEngine');
    expect(await engine.transcribeBlob(new Blob(), 'english', vi.fn(), '')).toBe(
      expected,
    );
  });

  it('checks native and prefixed recognition, local prerequisites, and server environments', async () => {
    const engine = await import('./speechEngine');
    expect(engine.getNativeSpeechRecognition()).toBeNull();
    const native = class {};
    vi.stubGlobal('webkitSpeechRecognition', native);
    expect(engine.getNativeSpeechRecognition()).toBe(native);
    const preferred = class {};
    vi.stubGlobal('SpeechRecognition', preferred);
    expect(engine.getNativeSpeechRecognition()).toBe(preferred);
    vi.stubGlobal('MediaRecorder', class {});
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    expect(engine.hasLocalSpeechCapture()).toBe(true);
    vi.stubGlobal('AudioContext', undefined);
    expect(engine.hasLocalSpeechCapture()).toBe(false);
    vi.stubGlobal('AudioContext', class {});
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: undefined,
    });
    expect(engine.hasLocalSpeechCapture()).toBe(false);
    vi.stubGlobal('window', undefined);
    expect(engine.getNativeSpeechRecognition()).toBeNull();
    expect(engine.hasLocalSpeechCapture()).toBe(false);
    vi.unstubAllGlobals();
  });

  it('ignores native stop errors', async () => {
    const engine = await import('./speechEngine');
    const recognition = {
      stop: vi.fn(() => {
        throw new Error('Stopped');
      }),
    } as unknown as import('./speechEngine').NativeSpeechRecognition;
    expect(() => engine.stopNativeSpeechRecognition(recognition)).not.toThrow();
    recognition.stop = vi.fn();
    engine.stopNativeSpeechRecognition(recognition);
    expect(recognition.stop).toHaveBeenCalledOnce();
  });
});
