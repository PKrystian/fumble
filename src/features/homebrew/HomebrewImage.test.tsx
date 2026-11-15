import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { HomebrewImage } from './HomebrewImage';
import { isLocalHomebrewImage } from './artworkPolicy';

describe('Homebrew artwork', () => {
  it('resolves local paths and rejects alternate hosts disguised as paths', () => {
    expect(isLocalHomebrewImage('/art/portrait.png')).toBe(true);
    for (const path of [
      '//example.invalid/art',
      '/\n/example.invalid/art',
      '//[',
      '/\\example.invalid/art',
    ])
      expect(isLocalHomebrewImage(path)).toBe(false);
  });
  it('shows local raster images and reports a load failure', () => {
    render(
      <MemoryRouter>
        <HomebrewImage src="data:image/jpeg;base64,test" alt="Local" />
      </MemoryRouter>,
    );
    const image = screen.getByRole('img', { name: 'Local' });
    expect(image).toHaveAttribute('src', 'data:image/jpeg;base64,test');
    fireEvent.error(image);
    expect(screen.getByRole('status')).toHaveTextContent('could not be loaded');
  });

  it('requires a separate action for each remote URL and refuses unsupported schemes', () => {
    const view = render(
      <MemoryRouter>
        <HomebrewImage src="https://example.invalid/one" alt="Remote" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('img')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show external image' }));
    expect(screen.getByRole('img')).toHaveAttribute('referrerPolicy', 'no-referrer');
    view.rerender(
      <MemoryRouter>
        <HomebrewImage src="https://example.invalid/two" alt="Remote" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('img')).toBeNull();
    view.rerender(
      <MemoryRouter>
        <HomebrewImage src="javascript:test" alt="Unsafe" />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
