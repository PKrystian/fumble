import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/generated/wiki.json', () => {
  throw new Error('wiki unavailable');
});

import { useWiki } from './useWiki';

describe('useWiki errors', () => {
  it('reports a failed generated-data import', async () => {
    const { result } = renderHook(() => useWiki());
    await waitFor(() => expect(result.current.status).toBe('error'), {
      timeout: 10_000,
    });
    expect(result.current.data).toBeNull();
  });

  it('ignores an import failure after unmounting', () => {
    const { unmount } = renderHook(() => useWiki());
    unmount();
  });
});
