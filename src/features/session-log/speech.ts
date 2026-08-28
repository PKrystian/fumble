import { useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/useT';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyPipeline = (audio: Float32Array, opts?: Record<string, unknown>) => Promise<any>;

let pipelinePromise: Promise<AnyPipeline> | null = null;

const WHISPER_MODEL = 'onnx-community/whisper-tiny';

class WhisperModelError extends Error {}

async function getWhisperPipeline(
  onStatus: (s: string) => void,
  downloadLabel: string,
): Promise<AnyPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = import('@huggingface/transformers')
      .then(async ({ pipeline, env }) => {
        (env as Record<string, unknown>).useBrowserCache = true;
        (env as Record<string, unknown>).allowLocalModels = false;

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
          dtype: { encoder_model: 'q8', decoder_model_merged: 'q8' },
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
    () =>
      typeof window !== 'undefined' &&
      'MediaRecorder' in window &&
      typeof navigator.mediaDevices?.getUserMedia === 'function',
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
  const transcriptionUnavailableRef = useRef(false);
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

  const start = async (): Promise<void> => {
    setSpeechError('');
    transcriptionUnavailableRef.current = false;
    shouldListenRef.current = true;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      shouldListenRef.current = false;
      setSpeechError(t('sessionLog.speechErrMic'));
      return;
    }
    streamRef.current = stream;

    if (startChunk(stream)) setListening(true);
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
