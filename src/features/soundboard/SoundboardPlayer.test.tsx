import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SoundboardPlayer } from './SoundboardPlayer';
import { YOUTUBE_ORIGIN } from './playerApi';

const track = { id: 'rain', name: 'Rain', videoId: 'jNQXAC9IVRw', category: 'custom' };
function renderPlayer(playlistId?: string) {
  const stop = vi.fn();
  const view = render(
    <MemoryRouter>
      <SoundboardPlayer
        track={{ ...track, ...(playlistId ? { playlistId } : {}) }}
        name="Rain"
        onStop={stop}
      />
    </MemoryRouter>,
  );
  const frame = () => document.querySelector('iframe')!;
  const send = (
    event: string,
    info?: unknown,
    source = frame().contentWindow,
    origin = YOUTUBE_ORIGIN,
  ) => {
    const id = Number(new URL(frame().src).searchParams.get('widgetid'));
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify({ event, info, id }),
          source,
          origin,
        }),
      );
    });
  };
  return { ...view, frame, send, stop };
}
afterEach(() => vi.useRealTimers());
describe('isolated YouTube playback', () => {
  it('uses a cross-origin iframe without loading third-party scripts in Fumble', () => {
    const { frame, send, stop } = renderPlayer();
    const post = vi.spyOn(frame().contentWindow!, 'postMessage');
    fireEvent.load(frame());
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('listening'),
      YOUTUBE_ORIGIN,
    );
    expect(document.querySelector('script[src*="youtube"]')).toBeNull();
    expect(frame()).toHaveAttribute('title', 'Rain');
    send('readyToListen');
    expect(post).toHaveBeenCalledWith(
      expect.stringContaining('onStateChange'),
      YOUTUBE_ORIGIN,
    );
    send('onReady');
    expect(screen.getByRole('status')).toHaveTextContent('Ready.');
    for (const [code, label] of [
      [1, 'Playing'],
      [2, 'Paused'],
      [0, 'Playback ended'],
      [3, 'Loading YouTube...'],
      [5, 'Ready.'],
      [-1, 'Ready.'],
    ] as const) {
      send('onStateChange', code);
      expect(screen.getByRole('status')).toHaveTextContent(label);
    }
    send('infoDelivery', { playerState: 1 });
    expect(screen.getByRole('status')).toHaveTextContent('Playing');
    send('onAutoplayBlocked');
    expect(screen.getByRole('link', { name: 'Open on YouTube' })).toHaveAttribute(
      'href',
      'https://www.youtube.com/watch?v=jNQXAC9IVRw',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(stop).toHaveBeenCalledOnce();
  });
  it('rejects foreign sources, reports errors, and remounts the iframe on retry', () => {
    const { frame, send } = renderPlayer('PL1234567890');
    const oldFrame = frame();
    expect(frame().src).toContain('videoseries?list=PL1234567890');
    send('onError', 100, window);
    send('onError', 100, frame().contentWindow, 'https://example.com');
    expect(screen.queryByRole('alert')).toBeNull();
    send('onError', 100);
    expect(screen.getByRole('alert')).toHaveTextContent('YouTube could not play');
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(frame()).not.toBe(oldFrame);
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
    expect(frame()).toHaveAttribute('title', 'Rain');
  });
  it('times out if the player is blocked and releases polling when unmounted', async () => {
    vi.useFakeTimers();
    const { unmount, frame, send } = renderPlayer();
    const post = vi.spyOn(frame().contentWindow!, 'postMessage');
    await act(() => vi.advanceTimersByTimeAsync(500));
    expect(post).toHaveBeenCalled();
    send('ignored');
    await act(() => vi.advanceTimersByTimeAsync(20000));
    expect(screen.getByRole('status')).toHaveTextContent('Playback has not started');
    unmount();
    await act(() => vi.runOnlyPendingTimersAsync());
    expect(vi.getTimerCount()).toBe(0);
  });
});
