import { describe, expect, it } from 'vitest';
import {
  IMAGE_HOST,
  PRIMARY_IMAGE_HEIGHT,
  PRIMARY_IMAGE_WIDTH,
  PRIMARY_IMAGE_WIDTHS,
  imageUrl,
  optimizedImageSrcSet,
  optimizedImageUrl,
} from './images';

describe('imageUrl', () => {
  it('defines stable primary image dimensions', () => {
    expect(PRIMARY_IMAGE_WIDTH).toBe(440);
    expect(PRIMARY_IMAGE_HEIGHT).toBe(558);
    expect(PRIMARY_IMAGE_WIDTHS).toEqual([224, 320, 440]);
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

  it('uses Cloudflare transformations only when an origin is configured', () => {
    expect(optimizedImageUrl('classes/TEST/TestClass.webp')).toBe(
      `${IMAGE_HOST}classes/TEST/TestClass.webp`,
    );
    expect(
      optimizedImageUrl('classes/TEST/TestClass.webp', 'https://fumble.example///', 640),
    ).toBe(
      'https://fumble.example/cdn-cgi/image/width=640,quality=75,format=auto/https://5e.tools/img/classes/TEST/TestClass.webp',
    );
    expect(
      optimizedImageUrl('classes/TEST/TestClass.webp', 'https://fumble.example'),
    ).toBe(
      'https://fumble.example/cdn-cgi/image/width=440,quality=75,format=auto/https://5e.tools/img/classes/TEST/TestClass.webp',
    );
    expect(
      optimizedImageUrl('https://example.com/image.webp', 'https://fumble.example'),
    ).toBe('https://example.com/image.webp');
  });

  it('builds responsive transformed image sources', () => {
    expect(
      optimizedImageSrcSet('bestiary/MM/Aarakocra.webp', 'https://fumble.example'),
    ).toBe(
      'https://fumble.example/cdn-cgi/image/width=224,quality=75,format=auto/https://5e.tools/img/bestiary/MM/Aarakocra.webp 224w, https://fumble.example/cdn-cgi/image/width=320,quality=75,format=auto/https://5e.tools/img/bestiary/MM/Aarakocra.webp 320w, https://fumble.example/cdn-cgi/image/width=440,quality=75,format=auto/https://5e.tools/img/bestiary/MM/Aarakocra.webp 440w',
    );
    expect(optimizedImageSrcSet('bestiary/MM/Aarakocra.webp')).toBeUndefined();
  });
});
