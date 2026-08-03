import { describe, expect, it } from 'vitest';
import { localizedBookStoryline } from './data';

describe('book data localization', () => {
  it('localizes indexed storylines on the Polish route', () => {
    expect(localizedBookStoryline('Tales from the Yawning Portal', 'pl')).toBe(
      'Opowieści z Ziewającego Portalu',
    );
    expect(localizedBookStoryline('Tales from the Yawning Portal', 'en')).toBe(
      'Tales from the Yawning Portal',
    );
  });

  it('keeps unknown storylines available as a fallback', () => {
    expect(localizedBookStoryline('Custom campaign', 'pl')).toBe('Custom campaign');
    expect(localizedBookStoryline(undefined, 'pl')).toBeUndefined();
  });
});
