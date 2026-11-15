import wasmBinaryUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import wasmFactoryUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPipeline = (audio: Float32Array, opts?: Record<string, unknown>) => Promise<any>;

let pipelinePromise: Promise<AnyPipeline> | null = null;

const WHISPER_MODEL = 'onnx-community/whisper-tiny';

export class WhisperModelError extends Error {}

type NativeSpeechResult = {
  isFinal: boolean;
  [index: number]: { transcript: string } | undefined;
};

type NativeSpeechEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: NativeSpeechResult | undefined;
  };
};

export type NativeSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: NativeSpeechEvent) => void) | null;
  onstart: (() => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type NativeSpeechRecognitionConstructor = new () => NativeSpeechRecognition;

type SpeechWindow = Window & {
  SpeechRecognition?: NativeSpeechRecognitionConstructor;
  webkitSpeechRecognition?: NativeSpeechRecognitionConstructor;
};

export function getNativeSpeechRecognition(): NativeSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

export function hasLocalSpeechCapture(): boolean {
  return (
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    typeof AudioContext === 'function' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}

export function stopNativeSpeechRecognition(recognition: NativeSpeechRecognition): void {
  try {
    recognition.stop();
  } catch {
    return;
  }
}

async function getWhisperPipeline(
  onStatus: (s: string) => void,
  downloadLabel: string,
): Promise<AnyPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = import('@huggingface/transformers')
      .then(async ({ pipeline, env }) => {
        (env as Record<string, unknown>).useBrowserCache = true;
        (env as Record<string, unknown>).allowLocalModels = false;
        const onnxBackend = env.backends.onnx as {
          wasm?: { wasmPaths?: { mjs: string; wasm: string } };
        };
        onnxBackend.wasm ??= {};
        onnxBackend.wasm.wasmPaths = { mjs: wasmFactoryUrl, wasm: wasmBinaryUrl };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const progressCallback = (p: any) => {
          if (
            p.status === 'downloading' ||
            p.status === 'loading' ||
            p.status === 'progress'
          ) {
            const pct =
              typeof p.progress === 'number'
                ? ` ${Math.round(p.progress as number)}%`
                : '';
            onStatus(`${downloadLabel}${pct}...`);
          }
        };

        return pipeline('automatic-speech-recognition', WHISPER_MODEL, {
          dtype: { encoder_model: 'int8', decoder_model_merged: 'int8' },
          session_options: { graphOptimizationLevel: 'disabled' },
          progress_callback: progressCallback,
        }) as Promise<AnyPipeline>;
      })
      .catch(() => {
        pipelinePromise = null;
        throw new WhisperModelError();
      });
  }
  return pipelinePromise;
}

async function blobToFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();

  const ctx = new AudioContext({ sampleRate: 16000 });
  try {
    const buf = await ctx.decodeAudioData(arrayBuffer);
    const channels = buf.numberOfChannels;
    const mono = new Float32Array(buf.length);
    for (let ch = 0; ch < channels; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < buf.length; i++) mono[i]! += data[i]! / channels;
    }
    return mono;
  } finally {
    await ctx.close();
  }
}

function hasSpeech(audio: Float32Array): boolean {
  let sumSq = 0;
  for (let i = 0; i < audio.length; i++) {
    const v = audio[i]!;
    sumSq += v * v;
  }
  const rms = Math.sqrt(sumSq / audio.length);
  return rms > 0.01;
}

function trimRepetitions(text: string): string {
  const parts = text
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
  const result: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const cur = parts[i]!.toLowerCase();

    let streak = 0;
    for (let j = i - 1; j >= 0 && j >= i - 4; j--) {
      if (parts[j]!.toLowerCase() === cur) streak++;
      else break;
    }
    if (streak >= 2) break;
    result.push(parts[i]!);
  }
  return result.join(', ');
}

export async function transcribeBlob(
  blob: Blob,
  language: string,
  onStatus: (s: string) => void,
  downloadLabel: string,
): Promise<string> {
  const audio = await blobToFloat32(blob);
  if (!hasSpeech(audio)) return '';

  const pipe = await getWhisperPipeline(onStatus, downloadLabel);
  const result = (await pipe(audio, {
    language,
    task: 'transcribe',
    no_repeat_ngram_size: 5,
    repetition_penalty: 1.3,
    max_new_tokens: 256,
  })) as { text?: unknown };
  const raw = String(result?.text ?? '').trim();
  return trimRepetitions(raw);
}
