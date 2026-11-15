import { afterEach, describe, expect, it } from 'vitest';
import { playerMessage, YOUTUBE_ORIGIN } from './playerApi';

const frame = document.createElement('iframe');
document.body.append(frame);
afterEach(() => {
  if (!frame.isConnected) document.body.append(frame);
});
describe('YouTube event boundary', () => {
  it('validates the exact source, origin, widget identifier, JSON and supported events', () => {
    const parse = (
      data: unknown,
      origin = YOUTUBE_ORIGIN,
      source: MessageEventSource | null = frame.contentWindow,
    ) => playerMessage(new MessageEvent('message', { data, origin, source }), frame, 42);
    const valid = JSON.stringify({ id: 42, event: 'onReady' });
    expect(parse(valid)).toBe('ready');
    expect(parse(valid, 'https://youtube.com.attacker.test')).toBeNull();
    expect(parse(valid, YOUTUBE_ORIGIN, window)).toBeNull();
    for (const data of [
      'bad',
      'null',
      '1',
      '[]',
      '{}',
      JSON.stringify({ id: 1, event: 'onReady' }),
      JSON.stringify({ id: 42, event: 'onStateChange', info: 99 }),
      JSON.stringify({ id: 42, event: 'onStateChange', info: 'playing' }),
      JSON.stringify({ id: 42, event: 'infoDelivery', info: null }),
      { id: 42, event: 'onReady' },
    ])
      expect(parse(data)).toBeNull();
    expect(parse(JSON.stringify({ id: 42, event: 'initialDelivery', info: {} }))).toBe(
      'handshake',
    );
    expect(
      parse(
        JSON.stringify({ id: 42, event: 'initialDelivery', info: { playerState: 2 } }),
      ),
    ).toBe('paused');
    expect(
      parse(JSON.stringify({ id: 42, event: 'infoDelivery', info: { playerState: 99 } })),
    ).toBeNull();
  });
});
