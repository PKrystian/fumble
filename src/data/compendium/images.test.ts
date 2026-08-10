import { describe, expect, it } from 'vitest';
import {
  IMAGE_HOST,
  PRIMARY_IMAGE_HEIGHT,
  PRIMARY_IMAGE_WIDTH,
  imageUrl,
} from './images';

describe('imageUrl', () => {
  it('defines stable primary image dimensions', () => {
    expect(PRIMARY_IMAGE_WIDTH).toBe(440);
    expect(PRIMARY_IMAGE_HEIGHT).toBe(558);
  });

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

  it('builds direct image URLs for names with spaces', () => {
    expect(imageUrl('bestiary/tokens/BAM/Aartuk Starhorror.webp')).toBe(
      `${IMAGE_HOST}bestiary/tokens/BAM/Aartuk%20Starhorror.webp`,
    );
  });
});
