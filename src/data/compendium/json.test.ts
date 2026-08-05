import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadJson } from './json';

describe('loadJson', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads JSON on the main thread by default', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"value":42}', { status: 200 }),
    );

    await expect(loadJson<{ value: number }>('/data.json')).resolves.toEqual({
      value: 42,
    });
  });

  it('reports a failed main-thread response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }));

    await expect(loadJson('/data.json')).rejects.toThrow('Failed to load JSON');
  });

  it('uses the main thread when workers are unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"value":"fallback"}', { status: 200 }),
    );

    await expect(loadJson<{ value: string }>('/data.json', true)).resolves.toEqual({
      value: 'fallback',
    });
  });

  it('loads JSON in a worker and terminates it', async () => {
    const terminate = vi.fn();
    class MockWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;

      postMessage() {
        this.onmessage?.({
          data: { ok: true, value: { value: 'worker' } },
        } as MessageEvent);
      }

      terminate = terminate;
    }
    vi.stubGlobal('Worker', MockWorker);

    await expect(loadJson<{ value: string }>('/data.json', true)).resolves.toEqual({
      value: 'worker',
    });
    expect(terminate).toHaveBeenCalledOnce();
  });

  it('reports worker failures', async () => {
    class MockWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;

      postMessage() {
        this.onerror?.();
      }

      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker);

    await expect(loadJson('/data.json', true)).rejects.toThrow('Failed to load JSON');
  });

  it('reports a failed worker response', async () => {
    class MockWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: (() => void) | null = null;

      postMessage() {
        this.onmessage?.({ data: { ok: false } } as MessageEvent);
      }

      terminate() {}
    }
    vi.stubGlobal('Worker', MockWorker);

    await expect(loadJson('/data.json', true)).rejects.toThrow('Failed to load JSON');
  });

  it('falls back when a worker cannot be created', async () => {
    class FailingWorker {
      constructor() {
        throw new Error('worker unavailable');
      }
    }
    vi.stubGlobal('Worker', FailingWorker);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"value":"fallback"}', { status: 200 }),
    );

    await expect(loadJson<{ value: string }>('/data.json', true)).resolves.toEqual({
      value: 'fallback',
    });
  });
});
