export function bookDataUrl(url: string, compressed: boolean): string {
  return compressed ? `${url}.gz` : url;
}

export async function readBookData<T>(
  response: Response,
  compressed: boolean,
): Promise<T> {
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  if (!compressed) return (await response.json()) as T;
  if (response.headers.get('content-encoding')?.includes('gzip')) {
    return (await response.json()) as T;
  }
  if (!response.body) throw new Error('Compressed book data response has no body');
  const DecompressionStreamConstructor = (
    globalThis as typeof globalThis & {
      DecompressionStream?: typeof DecompressionStream;
    }
  ).DecompressionStream;
  if (!DecompressionStreamConstructor) {
    throw new Error('Compressed book data is not supported');
  }
  const stream = response.body.pipeThrough(new DecompressionStreamConstructor('gzip'));
  return (await new Response(stream).json()) as T;
}
