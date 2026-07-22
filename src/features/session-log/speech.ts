import { useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/useT';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPipeline = (audio: Float32Array, opts?: Record<string, unknown>) => Promise<any>;

let pipelinePromise: Promise<AnyPipeline> | null = null;

async function getWhisperPipeline(
  onStatus?: (s: string) => void,
  downloadLabel = 'Downloading Whisper model',
): Promise<AnyPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = import('@huggingface/transformers').then(
      async ({ pipeline, env }) => {
        (env as Record<string, unknown>).useBrowserCache = true;
        (env as Record<string, unknown>).allowLocalModels = false;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const progressCallback = (p: any) => {
          if (p.status === 'downloading' || p.status === 'loading') {
            const pct =
              typeof p.progress === 'number'
                ? ` ${Math.round(p.progress as number)}%`
                : '';
            onStatus?.(`${downloadLabel}${pct}…`);
          }
        };

        return pipeline('automatic-speech-recognition', 'onnx-community/whisper-base', {
          dtype: { encoder_model: 'q8', decoder_model_merged: 'fp32' },
          progress_callback: progressCallback,
        }) as Promise<AnyPipeline>;
      },
    );
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
      for (let i = 0; i < buf.length; i++) mono[i]! += (data[i] ?? 0) / channels;
    }
    return mono;
  } finally {
    await ctx.close();
  }
}

function hasSpeech(audio: Float32Array): boolean {
  let sumSq = 0;
  for (let i = 0; i < audio.length; i++) {
    const v = audio[i] ?? 0;
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
    const cur = (parts[i] ?? '').toLowerCase();

    let streak = 0;
    for (let j = i - 1; j >= 0 && j >= i - 4; j--) {
      if ((parts[j] ?? '').toLowerCase() === cur) streak++;
      else break;
    }
    if (streak >= 2) break;
    result.push(parts[i] ?? '');
  }
  return result.join(', ');
}

async function transcribeBlob(
  blob: Blob,
  language: string,
  onStatus?: (s: string) => void,
  downloadLabel?: string,
): Promise<string> {
  const pipe = await getWhisperPipeline(onStatus, downloadLabel);
  const audio = await blobToFloat32(blob);
  if (!hasSpeech(audio)) return '';

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
    () =>
      typeof window !== 'undefined' &&
      'MediaRecorder' in window &&
      'AudioContext' in window,
  );
  const { t } = useT();
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [speechError, setSpeechError] = useState('');

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queueRef = useRef<Blob[]>([]);
  const processingRef = useRef(false);
  const shouldListenRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  const languageRef = useRef(language);
  onFinalRef.current = onFinal;
  languageRef.current = language;

  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      if (chunkTimerRef.current !== null) clearTimeout(chunkTimerRef.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const processQueue = async (): Promise<void> => {
    if (processingRef.current) return;
    processingRef.current = true;
    try {
      while (queueRef.current.length > 0) {
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
        } catch (e) {
          setSpeechError(
            e instanceof Error ? e.message : t('sessionLog.speechErrTranscribe'),
          );
        }
      }
    } finally {
      processingRef.current = false;
      setInterim('');
    }

    if (queueRef.current.length > 0) void processQueue();
  };

  const startChunk = (stream: MediaStream): void => {
    if (!shouldListenRef.current) return;

    const localChunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    recorderRef.current = rec;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) localChunks.push(e.data);
    };

    rec.onstop = () => {
      const blob = new Blob(localChunks, { type: rec.mimeType });
      if (blob.size >= MIN_BLOB_BYTES) {
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
  };

  const start = async (): Promise<void> => {
    setSpeechError('');
    shouldListenRef.current = true;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (e) {
      shouldListenRef.current = false;
      setSpeechError(e instanceof Error ? e.message : t('sessionLog.speechErrMic'));
      return;
    }
    streamRef.current = stream;

    getWhisperPipeline(setInterim, t('sessionLog.downloadingModel')).catch(
      (e: unknown) => {
        setSpeechError(e instanceof Error ? e.message : t('sessionLog.speechErrModel'));
      },
    );

    startChunk(stream);
    setListening(true);
  };

  const stop = (): void => {
    shouldListenRef.current = false;
    if (chunkTimerRef.current !== null) {
      clearTimeout(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }

    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    streamRef.current = null;
    setListening(false);
  };

  return { supported, listening, interim, speechError, start, stop };
}
