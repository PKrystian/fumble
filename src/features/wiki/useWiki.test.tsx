import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useWiki } from './useWiki';

describe('useWiki', () => {
  it('loads generated wiki data', async () => {
    const { result } = renderHook(() => useWiki());
    expect(result.current).toEqual({ status: 'loading', data: null });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.data).not.toBeNull();
  });

  it('does not update after unmounting', () => {
    const { unmount } = renderHook(() => useWiki());
    unmount();
  });
});
