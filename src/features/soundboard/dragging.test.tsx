import { act, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DndContextProps, DragEndEvent } from '@dnd-kit/core';
import { SoundboardPage } from './SoundboardPage';
import { useSoundboardStore } from './store';
import { allowSoundboardReplacement } from './persistence';

const capture = vi.hoisted(() => ({ props: undefined as DndContextProps | undefined }));
vi.mock('@dnd-kit/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@dnd-kit/core')>();
  return {
    ...actual,
    DndContext: (props: DndContextProps) => {
      capture.props = props;
      return <>{props.children}</>;
    },
  };
});
const tracks = [
  { id: 'one', name: 'Forest', videoId: 'jNQXAC9IVRw', category: 'custom' },
  { id: 'hidden', name: 'Battle', videoId: 'jNQXAC9IVRw', category: 'combat' },
  { id: 'three', name: 'Rain', videoId: 'ewceCUF4qtU', category: 'custom' },
];
const event = (active = 'one', over: string | null = 'three') =>
  ({ active: { id: active }, over: over === null ? null : { id: over } }) as DragEndEvent;
beforeEach(() => {
  localStorage.clear();
  allowSoundboardReplacement();
  useSoundboardStore.setState({
    tracks,
    categories: [
      { id: 'custom', name: null },
      { id: 'combat', name: null },
    ],
  });
  render(
    <MemoryRouter initialEntries={['/pl/dm/soundboard?category=custom']}>
      <SoundboardPage />
    </MemoryRouter>,
  );
});
describe('filtered soundboard reordering', () => {
  it('preserves hidden tracks, ignores cancelled and stale drops, and persists a valid drop', () => {
    for (const input of [
      event('one', null),
      event('one', 'one'),
      event('missing'),
      event('one', 'missing'),
      event('one', 'hidden'),
    ]) {
      act(() => capture.props!.onDragEnd!(input));
      expect(useSoundboardStore.getState().tracks).toEqual(tracks);
    }
    act(() => capture.props!.onDragEnd!(event()));
    expect(useSoundboardStore.getState().tracks.map((track) => track.id)).toEqual([
      'hidden',
      'three',
      'one',
    ]);
    expect(
      JSON.parse(localStorage.getItem('fumble-soundboard')!).state.tracks.map(
        (track: { id: string }) => track.id,
      ),
    ).toEqual(['hidden', 'three', 'one']);
  });
  it('announces names and cancellation in the interface language', () => {
    const announcements = capture.props!.accessibility!.announcements!;
    expect(announcements.onDragStart(event())).toBe('Chwycono: Forest');
    expect(announcements.onDragOver!(event())).toBe('Nad: Rain');
    expect(announcements.onDragOver!(event('one', 'one'))).toBeUndefined();
    expect(announcements.onDragOver!(event('one', null))).toBeUndefined();
    expect(announcements.onDragEnd(event())).toBe('Odłożono: Forest');
    expect(announcements.onDragEnd(event('one', null))).toBe(
      'Anulowano zmianę kolejności.',
    );
    expect(announcements.onDragCancel(event())).toBe('Anulowano zmianę kolejności.');
  });
});
