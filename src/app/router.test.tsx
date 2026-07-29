import { describe, expect, it } from 'vitest';
import { router } from './router';

describe('router', () => {
  it('loads every lazy route component', async () => {
    const children = router.routes.flatMap((route) => route.children ?? []);
    const loaded = [];
    for (const route of children) {
      if (typeof route.lazy === 'function') loaded.push(await route.lazy());
    }

    expect(loaded).toHaveLength(children.filter((route) => route.lazy).length);
    expect(loaded.every((route) => route.Component)).toBe(true);
  });
});
