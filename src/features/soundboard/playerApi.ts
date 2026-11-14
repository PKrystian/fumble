export type PlayerState =
  'loading' | 'ready' | 'playing' | 'paused' | 'ended' | 'blocked' | 'error';
export const YOUTUBE_ORIGIN = 'https://www.youtube.com';
const states: Record<number, PlayerState> = {
  1: 'playing',
  2: 'paused',
  0: 'ended',
  3: 'loading',
  5: 'ready',
  [-1]: 'ready',
};
export function listenToPlayer(frame: HTMLIFrameElement, id: number) {
  frame.contentWindow?.postMessage(
    JSON.stringify({ event: 'listening', id, channel: 'widget' }),
    YOUTUBE_ORIGIN,
  );
}
export function subscribeToPlayer(frame: HTMLIFrameElement, id: number) {
  for (const event of ['onReady', 'onStateChange', 'onError', 'onAutoplayBlocked'])
    frame.contentWindow?.postMessage(
      JSON.stringify({
        event: 'command',
        func: 'addEventListener',
        args: [event],
        id,
        channel: 'widget',
      }),
      YOUTUBE_ORIGIN,
    );
}
export function playerMessage(
  event: MessageEvent,
  frame: HTMLIFrameElement,
  id: number,
): PlayerState | 'handshake' | null {
  if (
    event.source !== frame.contentWindow ||
    event.origin !== YOUTUBE_ORIGIN ||
    typeof event.data !== 'string'
  )
    return null;
  let message: unknown;
  try {
    message = JSON.parse(event.data);
  } catch {
    return null;
  }
  if (!message || typeof message !== 'object') return null;
  const data = message as Record<string, unknown>;
  if (data.id !== id) return null;
  if (data.event === 'readyToListen') return 'handshake';
  if (data.event === 'onError') return 'error';
  if (data.event === 'onAutoplayBlocked') return 'blocked';
  if (data.event === 'onReady') return 'ready';
  if (data.event === 'onStateChange' && typeof data.info === 'number')
    return states[data.info] ?? null;
  if (
    (data.event === 'infoDelivery' || data.event === 'initialDelivery') &&
    data.info &&
    typeof data.info === 'object'
  ) {
    const code = (data.info as Record<string, unknown>).playerState;
    return typeof code === 'number' ? (states[code] ?? null) : 'handshake';
  }
  return null;
}
