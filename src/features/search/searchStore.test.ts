import { beforeEach, describe, expect, it } from 'vitest';
import { useSearchStore } from './searchStore';

describe('search store', () => {
  beforeEach(() => {
    useSearchStore.setState({ open: false });
  });

  it('opens and closes the search palette', () => {
    useSearchStore.getState().setOpen(true);
    expect(useSearchStore.getState().open).toBe(true);
    useSearchStore.getState().setOpen(false);
    expect(useSearchStore.getState().open).toBe(false);
  });
});
