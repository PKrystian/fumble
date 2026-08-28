import { useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/useT';
import wasmBinaryUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url';
import wasmFactoryUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPipeline = (audio: Float32Array, opts?: Record<string, unknown>) => Promise<any>;

let pipelinePromise: Promise<AnyPipeline> | null = null;

const WHISPER_MODEL = 'onnx-community/whisper-tiny';

class WhisperModelError extends Error {}

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

type NativeSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: NativeSpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type NativeSpeechRecognitionConstructor = new () => NativeSpeechRecognition;

type SpeechWindow = Window & {
  SpeechRecognition?: NativeSpeechRecognitionConstructor;
  webkitSpeechRecognition?: NativeSpeechRecognitionConstructor;
};

function getNativeSpeechRecognition(): NativeSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as SpeechWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function hasLocalSpeechCapture(): boolean {
  return (
    typeof window !== 'undefined' &&
    'MediaRecorder' in window &&
    typeof navigator.mediaDevices?.getUserMedia === 'function'
  );
}

function stopNativeSpeechRecognition(recognition: NativeSpeechRecognition): void {
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
          if (p.status === 'downloading' || p.status === 'loading') {
            const pct =
              typeof p.progress === 'number'
                ? ` ${Math.round(p.progress as number)}%`
                : '';
            onStatus(`${downloadLabel}${pct}…`);
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

async function transcribeBlob(
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

const CHUNK_DURATION_MS = 10000;

const MIN_BLOB_BYTES = 3000;

export interface SpeechHook {
  supported: boolean;
  listening: boolean;

  interim: string;
  speechError: string;
  start: () => void;
  stop: () => void;
}

export function useSpeechRecognition(
  onFinal: (text: string) => void,
  language = 'english',
): SpeechHook {
  const [supported] = useState(
    () => Boolean(getNativeSpeechRecognition()) || hasLocalSpeechCapture(),
  );
  const { t } = useT();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [speechError, setSpeechError] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const nativeRef = useRef<NativeSpeechRecognition | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<Blob[]>([]);
  const processingRef = useRef(false);
  const shouldListenRef = useRef(false);
  const transcriptionUnavailableRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  const languageRef = useRef(language);
  onFinalRef.current = onFinal;
  languageRef.current = language;

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (chunkTimerRef.current !== null) clearTimeout(chunkTimerRef.current);
      if (nativeRef.current) stopNativeSpeechRecognition(nativeRef.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const processQueue = async (): Promise<void> => {
    if (processingRef.current || transcriptionUnavailableRef.current) return;
    processingRef.current = true;
    try {
      while (queueRef.current.length > 0 && !transcriptionUnavailableRef.current) {
        const blob = queueRef.current.shift()!;
        setInterim(t('sessionLog.transcribing'));
        try {
          const text = await transcribeBlob(
            blob,
            languageRef.current,
            setInterim,
            t('sessionLog.downloadingModel'),
          );
          if (text) onFinalRef.current(text);
        } catch (error) {
          if (error instanceof WhisperModelError) {
            transcriptionUnavailableRef.current = true;
            queueRef.current = [];
            setSpeechError(t('sessionLog.transcriptionUnavailable'));
          } else {
            setSpeechError(t('sessionLog.speechErrTranscribe'));
          }
        }
      }
    } finally {
      processingRef.current = false;
      setInterim('');
    }
  };

  const startChunk = (stream: MediaStream): boolean => {
    try {
      const localChunks: Blob[] = [];
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;

      rec.ondataavailable = (e) => {
        if (e.data.size > 0) localChunks.push(e.data);
      };

      rec.onstop = () => {
        const blob = new Blob(localChunks, { type: rec.mimeType });
        if (blob.size >= MIN_BLOB_BYTES && !transcriptionUnavailableRef.current) {
          queueRef.current.push(blob);
          void processQueue();
        }

        if (shouldListenRef.current && streamRef.current) {
          startChunk(streamRef.current);
        }
      };

      rec.start();

      chunkTimerRef.current = setTimeout(() => {
        if (rec.state === 'recording') rec.stop();
      }, CHUNK_DURATION_MS);
      return true;
    } catch {
      shouldListenRef.current = false;
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      recorderRef.current = null;
      setListening(false);
      setSpeechError(t('sessionLog.speechErrRecorder'));
      return false;
    }
  };

  const startLocalCapture = async (preserveListening = false): Promise<boolean> => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      shouldListenRef.current = preserveListening;
      setSpeechError(
        t(preserveListening ? 'sessionLog.speechErrFallback' : 'sessionLog.speechErrMic'),
      );
      return false;
    }
    if (!shouldListenRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return false;
    }
    streamRef.current = stream;
    return startChunk(stream);
  };

  const fallbackToLocalCapture = async (): Promise<void> => {
    const native = nativeRef.current;
    nativeRef.current = null;
    if (native) stopNativeSpeechRecognition(native);
    setInterim('');
    await startLocalCapture(true);
    if (!recorderRef.current) {
      shouldListenRef.current = false;
      setListening(false);
    }
  };

  const startNativeCapture = (): boolean => {
    const Recognition = getNativeSpeechRecognition();
    if (!Recognition) return false;

    let recognition: NativeSpeechRecognition;
    try {
      recognition = new Recognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = languageRef.current === 'polish' ? 'pl-PL' : 'en-US';
      recognition.onresult = (event) => {
        let interimText = '';
        for (let index = event.resultIndex; index < event.results.length; index++) {
          const result = event.results[index];
          const transcript = result?.[0]?.transcript.trim() ?? '';
          if (result?.isFinal) {
            if (transcript) onFinalRef.current(transcript);
          } else if (transcript) {
            interimText = `${interimText} ${transcript}`.trim();
          }
        }
        setInterim(interimText);
      };
      recognition.onerror = () => {
        if (nativeRef.current !== recognition || !shouldListenRef.current) return;
        void fallbackToLocalCapture();
      };
      recognition.onend = () => {
        if (nativeRef.current !== recognition || !shouldListenRef.current) return;
        try {
          recognition.start();
        } catch {
          void fallbackToLocalCapture();
        }
      };
      nativeRef.current = recognition;
      recognition.start();
      return true;
    } catch {
      nativeRef.current = null;
      return false;
    }
  };

  const start = async (): Promise<void> => {
    if (shouldListenRef.current) return;
    setSpeechError('');
    transcriptionUnavailableRef.current = false;
    shouldListenRef.current = true;

    if (startNativeCapture()) {
      setListening(true);
      return;
    }

    if (await startLocalCapture()) setListening(true);
  };

  const stop = (): void => {
    shouldListenRef.current = false;
    if (chunkTimerRef.current !== null) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    const native = nativeRef.current;
    nativeRef.current = null;
    if (native) stopNativeSpeechRecognition(native);
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    streamRef.current = null;
    setListening(false);
  };

  return { supported, listening, interim, speechError, start, stop };
}
