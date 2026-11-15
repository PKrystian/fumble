import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/i18n/useT';
import {
  getNativeSpeechRecognition,
  hasLocalSpeechCapture,
  stopNativeSpeechRecognition,
  transcribeBlob,
  WhisperModelError,
  type NativeSpeechRecognition,
} from './speechEngine';

export type SpeechMode = 'auto' | 'browser' | 'local';
export type SpeechStatus = 'idle' | 'starting' | 'listening' | 'processing' | 'error';
export interface SpeechStamp {
  time: number;
  offsetMs: number;
}
type FinalCallback = (text: string, stamp: SpeechStamp) => void;
interface Run {
  onFinal: FinalCallback;
  onDuration: ((ms: number) => void) | undefined;
  language: string;
  mode: SpeechMode;
  startedAt: number | null;
  elapsed: number;
  stopping: boolean;
  native: NativeSpeechRecognition | null;
  recorder: MediaRecorder | null;
  stream: MediaStream | null;
  timer: ReturnType<typeof setTimeout> | null;
  stopTimer: ReturnType<typeof setTimeout> | null;
}
interface Job {
  blob: Blob;
  run: Run;
  stamp: SpeechStamp;
}
export interface SpeechHook {
  supported: boolean;
  listening: boolean;
  busy: boolean;
  status: SpeechStatus;
  interim: string;
  speechError: string;
  modelProgress: string;
  pendingCount: number;
  elapsedMs: number;
  backend: 'browser' | 'local' | null;
  canRetry: boolean;
  start: () => Promise<void>;
  stop: () => void;
  retry: () => Promise<void>;
  discardPending: () => void;
}
export const MAX_PENDING_CHUNKS = 30;

export function useSpeechRecognition(
  onFinal: FinalCallback,
  language = 'english',
  options: { mode?: SpeechMode; onDuration?: (ms: number) => void } = {},
): SpeechHook {
  const { t } = useT();
  const callbacks = useRef({ onFinal, language, options, t });
  callbacks.current = { onFinal, language, options, t };
  const mounted = useRef(true);
  const active = useRef<Run | null>(null);
  const queue = useRef<Job[]>([]);
  const processing = useRef(false);
  const errorKey = useRef('');
  const finishing = useRef(new Set<Run>());
  const stopRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState({
    status: 'idle' as SpeechStatus,
    interim: '',
    modelProgress: '',
    pendingCount: 0,
    elapsedMs: 0,
    backend: null as 'browser' | 'local' | null,
  });
  const elapsed = (run: Run) =>
    run.elapsed + (run.startedAt === null ? 0 : Math.max(0, Date.now() - run.startedAt));
  const patch = useCallback((value: Partial<typeof state>) => {
    if (mounted.current) setState((current) => ({ ...current, ...value }));
  }, []);
  const publish = () => {
    const pendingCount =
      queue.current.length + Number(processing.current) + finishing.current.size;
    const run = active.current;
    patch({
      pendingCount,
      status: errorKey.current
        ? 'error'
        : run
          ? run.startedAt === null
            ? 'starting'
            : 'listening'
          : pendingCount
            ? 'processing'
            : 'idle',
    });
  };
  const pauseClock = (run: Run) => {
    run.elapsed = elapsed(run);
    run.startedAt = null;
  };
  const commitClock = (run: Run) => {
    pauseClock(run);
    if (run.elapsed > 0) run.onDuration?.(run.elapsed);
  };
  const finishNative = (run: Run) => {
    clearTimeout(run.stopTimer!);
    run.native = null;
    finishing.current.delete(run);
    publish();
  };
  const closeCapture = (run: Run) => {
    if (run.stopping) return;
    run.stopping = true;
    active.current = null;
    if (run.timer) clearTimeout(run.timer);
    commitClock(run);
    if (run.native) {
      finishing.current.add(run);
      run.stopTimer = setTimeout(() => finishNative(run), 2500);
      stopNativeSpeechRecognition(run.native);
    }
    if (run.recorder?.state === 'recording') {
      finishing.current.add(run);
      try {
        run.recorder.stop();
      } catch {
        finishing.current.delete(run);
        errorKey.current = 'sessionLog.speechErrRecorder';
      }
    }
    run.stream?.getTracks().forEach((track) => track.stop());
    run.stream = null;
    patch({ interim: '', elapsedMs: run.elapsed });
    publish();
  };
  const fail = (key: string, run: Run) => {
    errorKey.current = key;
    closeCapture(run);
    publish();
  };
  const processQueue = async (): Promise<void> => {
    if (processing.current || errorKey.current || !queue.current.length) return;
    processing.current = true;
    publish();
    try {
      while (queue.current.length && !errorKey.current) {
        const job = queue.current.shift()!;
        publish();
        try {
          const text = await transcribeBlob(
            job.blob,
            job.run.language,
            (modelProgress) => patch({ modelProgress }),
            callbacks.current.t('sessionLog.downloadingModel'),
          );
          if (text) job.run.onFinal(text, job.stamp);
        } catch (error) {
          queue.current.unshift(job);
          fail(
            error instanceof WhisperModelError
              ? 'sessionLog.transcriptionUnavailable'
              : 'sessionLog.speechErrTranscribe',
            job.run,
          );
        }
      }
    } finally {
      processing.current = false;
      patch({ modelProgress: '' });
      publish();
    }
  };
  const startChunk = (run: Run): void => {
    try {
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(run.stream!);
      run.recorder = recorder;
      recorder.onerror = () => fail('sessionLog.speechErrRecorder', run);
      const stamp = { time: Date.now(), offsetMs: elapsed(run) };
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onstop = () => {
        finishing.current.delete(run);
        if (run.timer) clearTimeout(run.timer);
        const blob = new Blob(chunks, { type: recorder.mimeType });
        if (blob.size) {
          queue.current.push({ blob, run, stamp });
          if (queue.current.length >= MAX_PENDING_CHUNKS)
            fail('sessionLog.queueFull', run);
          void processQueue();
        }
        if (!run.stopping) startChunk(run);
        publish();
      };
      recorder.start();
      if (run.startedAt === null) run.startedAt = Date.now();
      patch({ backend: 'local' });
      publish();
      run.timer = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 10_000);
    } catch {
      fail('sessionLog.speechErrRecorder', run);
    }
  };
  const startLocal = async (run: Run): Promise<void> => {
    if (!hasLocalSpeechCapture()) {
      fail('sessionLog.voiceNotSupported', run);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      if (run.stopping) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      run.stream = stream;
      startChunk(run);
    } catch {
      if (!run.stopping) fail('sessionLog.speechErrMic', run);
    }
  };
  const fallback = async (run: Run): Promise<void> => {
    const native = run.native!;
    run.native = null;
    stopNativeSpeechRecognition(native);
    pauseClock(run);
    patch({ interim: '' });
    if (run.mode !== 'auto') {
      fail('sessionLog.speechErrBrowser', run);
      return;
    }
    publish();
    await startLocal(run);
  };
  const startNative = (run: Run): boolean => {
    const Recognition = getNativeSpeechRecognition();
    if (!Recognition) return false;
    try {
      const recognition = new Recognition();
      run.native = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.lang = run.language === 'polish' ? 'pl-PL' : 'en-US';
      recognition.onstart = () => {
        if (run.stopping || run.native !== recognition) return;
        run.startedAt = Date.now();
        patch({ backend: 'browser' });
        publish();
      };
      recognition.onresult = (event) => {
        if (run.native !== recognition) return;
        const words: string[] = [];
        for (let index = event.resultIndex; index < event.results.length; index++) {
          const result = event.results[index];
          const text = result?.[0]?.transcript.trim() ?? '';
          if (result?.isFinal) {
            if (text) run.onFinal(text, { time: Date.now(), offsetMs: elapsed(run) });
          } else if (text) words.push(text);
        }
        patch({ interim: words.join(' ') });
      };
      recognition.onerror = (event) => {
        if (run.native !== recognition || run.stopping) return;
        if (event?.error === 'not-allowed' || event?.error === 'service-not-allowed')
          fail('sessionLog.speechErrMic', run);
        else void fallback(run);
      };
      recognition.onend = () => {
        if (run.native !== recognition) return;
        if (run.stopping) {
          finishNative(run);
          return;
        }
        pauseClock(run);
        publish();
        try {
          recognition.start();
        } catch {
          void fallback(run);
        }
      };
      recognition.start();
      return true;
    } catch {
      run.native = null;
      return false;
    }
  };
  const start = async (): Promise<void> => {
    if (
      active.current ||
      processing.current ||
      queue.current.length ||
      finishing.current.size
    )
      return;
    const current = callbacks.current;
    const run: Run = {
      onFinal: current.onFinal,
      onDuration: current.options.onDuration,
      language: current.language,
      mode: current.options.mode ?? 'auto',
      startedAt: null,
      elapsed: 0,
      stopping: false,
      native: null,
      recorder: null,
      stream: null,
      timer: null,
      stopTimer: null,
    };
    errorKey.current = '';
    active.current = run;
    patch({ interim: '', modelProgress: '', elapsedMs: 0, backend: null });
    publish();
    if (run.mode !== 'local' && startNative(run)) return;
    if (run.mode === 'browser') {
      fail('sessionLog.speechErrBrowser', run);
      return;
    }
    await startLocal(run);
  };
  const stop = (): void => {
    if (active.current) closeCapture(active.current);
  };
  stopRef.current = stop;
  useEffect(() => {
    mounted.current = true;
    const leave = (event: BeforeUnloadEvent) => {
      const busy = Boolean(
        active.current ||
        processing.current ||
        queue.current.length ||
        finishing.current.size,
      );
      stopRef.current!();
      if (busy) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', leave);
    return () => {
      mounted.current = false;
      stopRef.current!();
      window.removeEventListener('beforeunload', leave);
    };
  }, []);
  useEffect(() => {
    if (state.status !== 'listening') return;
    const interval = setInterval(() => {
      if (active.current) patch({ elapsedMs: elapsed(active.current) });
    }, 500);
    return () => clearInterval(interval);
  }, [patch, state.status]);
  return {
    ...state,
    supported: Boolean(getNativeSpeechRecognition()) || hasLocalSpeechCapture(),
    listening: state.status === 'listening',
    busy:
      state.status === 'starting' ||
      state.status === 'listening' ||
      state.pendingCount > 0,
    speechError: errorKey.current ? t(errorKey.current) : '',
    canRetry: Boolean(errorKey.current && queue.current.length && !processing.current),
    start,
    stop,
    retry: async () => {
      errorKey.current = '';
      publish();
      await processQueue();
    },
    discardPending: () => {
      if (processing.current) return;
      queue.current = [];
      errorKey.current = '';
      publish();
    },
  };
}
