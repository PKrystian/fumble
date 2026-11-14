import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  allowSoundboardReplacement,
  getSoundboardSaveStatus,
  saveSoundboard,
  serializeSoundboard,
  soundboardStorage,
  useSoundboardSaveStatus,
} from './persistence';
import { useSoundboardStore } from './store';
import { soundboardBackup } from './files';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';

const data = {
  tracks: [
    {
      id: 'one',
      name: 'Rain',
      videoId: 'jNQXAC9IVRw',
      category: 'custom',
      favorite: true,
    },
  ],
  categories: [{ id: 'custom', name: null }],
};
beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  allowSoundboardReplacement();
});
describe('safe soundboard persistence', () => {
  it('provides a stable server snapshot without exposing browser storage', () => {
    function Status() {
      return createElement('span', null, String(useSoundboardSaveStatus().saved));
    }
    expect(renderToString(createElement(Status))).toBe('<span>true</span>');
  });
  it('keeps current tracks exportable when storage fails and notifies subscribers on retry', () => {
    const { result } = renderHook(() => useSoundboardSaveStatus());
    const fail = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    act(() => expect(saveSoundboard(data)).toBe(false));
    expect(result.current.saved).toBe(false);
    expect(soundboardBackup(data).soundboard.state).toEqual(data);
    fail.mockRestore();
    act(() => expect(saveSoundboard(data)).toBe(true));
    expect(result.current.saved).toBe(true);
    expect(localStorage.getItem('fumble-soundboard')).toBe(serializeSoundboard(data));
  });
  it('preserves malformed and future records and blocks automatic writes', async () => {
    for (const raw of [
      '{broken',
      JSON.stringify({ version: 99, state: data }),
      JSON.stringify({ version: 6, state: { tracks: null, categories: [] } }),
    ]) {
      localStorage.setItem('fumble-soundboard', raw);
      expect(await soundboardStorage!.getItem('fumble-soundboard')).toBeNull();
      expect(getSoundboardSaveStatus()).toMatchObject({ blocked: true, raw });
      expect(saveSoundboard(data)).toBe(false);
      useSoundboardStore.setState(data);
      expect(localStorage.getItem('fumble-soundboard')).toBe(raw);
    }
    allowSoundboardReplacement();
    expect(saveSoundboard(data)).toBe(true);
    expect(await soundboardStorage!.getItem('fumble-soundboard')).toMatchObject({
      state: data,
      version: 6,
    });
  });
  it('reports read failures without claiming to have recovered original contents', async () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(await soundboardStorage!.getItem('fumble-soundboard')).toBeNull();
    expect(getSoundboardSaveStatus()).toEqual({ saved: false, blocked: true, raw: null });
    read.mockRestore();
    expect(await soundboardStorage!.getItem('fumble-soundboard')).toBeNull();
    expect(getSoundboardSaveStatus().blocked).toBe(false);
    soundboardStorage!.removeItem('fumble-soundboard');
    expect(getSoundboardSaveStatus().saved).toBe(false);
  });
});
