import { describe, expect, it } from 'vitest';
import { IMAGE_HOST, imageUrl } from './images';

describe('imageUrl', () => {
  it('keeps absolute and data URLs', () => {
    expect(imageUrl('https://example.com/token.png')).toBe(
      'https://example.com/token.png',
    );
    expect(imageUrl('http://example.com/token.png')).toBe('http://example.com/token.png');
    expect(imageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('encodes relative image path segments', () => {
    expect(imageUrl('bestiary/goblin chief.png')).toBe(
      `${IMAGE_HOST}bestiary/goblin%20chief.png`,
    );
  });
});
