import { gzipSync } from 'node:zlib';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { bookDataUrl, readBookData } from './dataCompression';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('book data transport', () => {
  it('keeps regular book data URLs when compression is disabled', () => {
    expect(bookDataUrl('/data/book/xphb.json', false)).toBe('/data/book/xphb.json');
  });

  it('adds the compressed suffix when compression is enabled', () => {
    expect(bookDataUrl('/data/book/xphb.json', true)).toBe('/data/book/xphb.json.gz');
  });

  it('reads regular JSON responses', async () => {
    await expect(
      readBookData(new Response(JSON.stringify({ data: ['chapter'] })), false),
    ).resolves.toEqual({ data: ['chapter'] });
  });

  it('decompresses gzip responses', async () => {
    const response = new Response(gzipSync(JSON.stringify({ data: ['chapter'] })));
    await expect(readBookData(response, true)).resolves.toEqual({ data: ['chapter'] });
  });

  it('accepts responses already decompressed by the static host', async () => {
    const response = new Response(JSON.stringify({ data: ['chapter'] }), {
      headers: { 'content-encoding': 'gzip' },
    });
    await expect(readBookData(response, true)).resolves.toEqual({ data: ['chapter'] });
  });

  it('rejects failed responses', async () => {
    await expect(
      readBookData(new Response(null, { status: 503 }), false),
    ).rejects.toThrow('HTTP 503');
  });

  it('rejects compressed responses without a body', async () => {
    await expect(readBookData(new Response(null), true)).rejects.toThrow(
      'Compressed book data response has no body',
    );
  });

  it('rejects compressed responses when gzip decompression is unavailable', async () => {
    vi.stubGlobal('DecompressionStream', undefined);
    const response = new Response(gzipSync(JSON.stringify({ data: ['chapter'] })));
    await expect(readBookData(response, true)).rejects.toThrow(
      'Compressed book data is not supported',
    );
  });
});
