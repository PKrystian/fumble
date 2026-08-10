import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  setCanonical,
  setDocumentTitle,
  setHreflangAlternates,
  setMetaDescription,
} from './head';
import { useSeo } from './useSeo';

function SeoHarness({
  title,
  description,
  indexable,
}: {
  title: string;
  description?: string;
  indexable?: boolean;
}) {
  useSeo(title, description, indexable);
  return null;
}

describe('SEO head helpers', () => {
  beforeEach(() => {
    document.title = '';
    document.head
      .querySelectorAll(
        'meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"], link[rel="alternate"]',
      )
      .forEach((element) => element.remove());
  });

  it('creates and updates title, description and canonical tags', () => {
    setDocumentTitle('First');
    setMetaDescription('Initial description');
    setCanonical('https://example.com/first');
    setMetaDescription('Updated description');
    setCanonical('https://example.com/second');

    expect(document.title).toBe('First');
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Updated description',
    );
    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://example.com/second',
    );
  });

  it('replaces hreflang alternates', () => {
    setHreflangAlternates([
      { hreflang: 'en', href: 'https://example.com/en' },
      { hreflang: 'pl', href: 'https://example.com/pl' },
    ]);
    setHreflangAlternates([
      { hreflang: 'x-default', href: 'https://example.com/default' },
    ]);
    const links = document.head.querySelectorAll('link[rel="alternate"]');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('hreflang', 'x-default');
  });

  it('sets route-aware SEO tags through hooks', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/pl/compendium/spells']}>
        <SeoHarness title="Spells" description="Spell list" />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Spells - Fumble');
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Spell list',
    );
    expect(document.head.querySelector('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://fumble.krystianpinczak.com/pl/compendium/spells/',
    );
    expect(document.head.querySelector('link[hreflang="en"]')).toHaveAttribute(
      'href',
      'https://fumble.krystianpinczak.com/compendium/spells/',
    );
    expect(document.head.querySelector('link[hreflang="pl"]')).toHaveAttribute(
      'href',
      'https://fumble.krystianpinczak.com/pl/compendium/spells/',
    );
    expect(document.head.querySelector('link[hreflang="x-default"]')).toHaveAttribute(
      'href',
      'https://fumble.krystianpinczak.com/compendium/spells/',
    );
    expect(document.head.querySelectorAll('link[rel="alternate"]')).toHaveLength(3);
    expect(document.head.querySelector('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Spells - Fumble',
    );

    rerender(
      <MemoryRouter initialEntries={['/pl/compendium/spells']}>
        <SeoHarness title="Updated" />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Updated - Fumble');
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      expect.stringContaining('Dungeons & Dragons 2024'),
    );

    rerender(
      <MemoryRouter initialEntries={['/']}>
        <SeoHarness title="Fumble" />
      </MemoryRouter>,
    );
    expect(document.title).toBe('Fumble');
    expect(document.head.querySelector('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Fumble',
    );
  });

  it('marks private routes as noindex', () => {
    render(
      <MemoryRouter>
        <SeoHarness title="Private character" indexable={false} />
      </MemoryRouter>,
    );
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('link[rel="alternate"]')).toBeNull();
  });

  it('clips long descriptions to the search snippet limit', () => {
    render(
      <MemoryRouter>
        <SeoHarness title="Long page" description={'A'.repeat(200)} />
      </MemoryRouter>,
    );
    expect(document.head.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      `${'A'.repeat(157)}...`,
    );
  });

  it('marks query variants as noindex while keeping links crawlable', () => {
    render(
      <MemoryRouter initialEntries={['/compendium/spells/?q=fireball']}>
        <SeoHarness title="Spells" />
      </MemoryRouter>,
    );
    expect(document.head.querySelector('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, follow',
    );
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.head.querySelector('link[rel="alternate"]')).toBeNull();
  });
});
