import { describe, expect, it } from 'vitest';
import {
  BASE_TOKEN,
  escapeHtml,
  extractImageRefs,
  extractWikiLinkTargets,
  isPlayerVisible,
  leafletToPercent,
  parseFrontmatter,
  parseLeafletBlock,
  processBoxes,
  processImages,
  processMaps,
  processSecrets,
  processWikiLinks,
  pinHtml,
  renderMap,
  renderInfobox,
  slugify,
  validateFrontmatterKeys,
  wrapMap,
} from './transform';

describe('parseFrontmatter', () => {
  it('extracts key/value pairs and the body', () => {
    const { data, body } = parseFrontmatter(
      '---\ntitle: Silverhaven\nvisibility: player\npublish: false\n---\nThe city.',
    );
    expect(data.title).toBe('Silverhaven');
    expect(data.visibility).toBe('player');
    expect(data.publish).toBe(false);
    expect(body).toBe('The city.');
  });

  it('returns the raw text when there is no frontmatter', () => {
    expect(parseFrontmatter('No frontmatter').body).toBe('No frontmatter');
  });

  it('parses inline arrays', () => {
    const { data } = parseFrontmatter('---\ntags: [Elf, Wizard, "Guild Member"]\n---\n');
    expect(data.tags).toEqual(['Elf', 'Wizard', 'Guild Member']);
  });

  it('parses a nested facts map via indentation', () => {
    const { data } = parseFrontmatter(
      '---\ntitle: Aria\nfacts:\n  Race: Elf\n  Class: Wizard\nsummary: A mage.\n---\nBody.',
    );
    expect(data.facts).toEqual({ Race: 'Elf', Class: 'Wizard' });
    expect(data.title).toBe('Aria');
    expect(data.summary).toBe('A mage.');
  });

  it('skips blank and malformed frontmatter lines', () => {
    const { data } = parseFrontmatter(
      '---\n\nnot a pair\n  ignored\nfacts:\n  invalid\nfacts:\n  Role: Guide\n---\n',
    );
    expect(data.facts).toEqual({ Role: 'Guide' });
  });
});

describe('escapeHtml', () => {
  it('escapes HTML-significant characters', () => {
    expect(escapeHtml(`<b>"Tom & Jerry's"</b>`)).toBe(
      '&lt;b&gt;&quot;Tom &amp; Jerry&#39;s&quot;&lt;/b&gt;',
    );
  });
});

describe('isPlayerVisible', () => {
  it('hides DM-only and unpublished pages', () => {
    expect(isPlayerVisible({ visibility: 'dm' })).toBe(false);
    expect(isPlayerVisible({ publish: false })).toBe(false);
    expect(isPlayerVisible({ title: 'Town' })).toBe(true);
  });
});

describe('processSecrets', () => {
  it('removes :::secret blocks entirely', () => {
    const out = processSecrets('Before\n:::secret\nhidden lore\n:::\nAfter');
    expect(out).not.toContain('hidden lore');
    expect(out).toContain('Before');
    expect(out).toContain('After');
  });

  it('replaces :::locked blocks with a placeholder', () => {
    const out = processSecrets(':::locked\nsecret\n:::');
    expect(out).toContain('wiki-locked');
    expect(out).not.toContain('secret');
  });
});

describe('processImages', () => {
  it('converts Obsidian embeds to markdown images via the resolver', () => {
    const out = processImages(
      '![[map.svg|World Map]]',
      (f) => `${BASE_TOKEN}wiki-assets/${f}`,
    );
    expect(out).toBe('![World Map](%BASE%wiki-assets/map.svg)');
    expect(processImages('![[icon.png]]', (f) => f)).toBe('![](icon.png)');
  });
});

describe('processWikiLinks', () => {
  const resolve = (title: string) => (title === 'Silverhaven' ? 'silverhaven' : null);

  it('links to player-visible pages', () => {
    const out = processWikiLinks('Visit [[Silverhaven]].', resolve);
    expect(out).toContain('data-wiki-link="silverhaven"');
    expect(out).toContain('href="%BASE%wiki/silverhaven"');
  });

  it('uses the alias as link text', () => {
    expect(processWikiLinks('[[Silverhaven|the city]]', resolve)).toContain('>the city<');
  });

  it('degrades unknown/secret targets to plain text', () => {
    expect(processWikiLinks('[[Hidden Vault]]', resolve)).toBe('Hidden Vault');
    expect(processWikiLinks('[[|Alias]]', resolve)).toBe('Alias');
  });
});

describe('processMaps', () => {
  const block = [
    '```fumble-map',
    'image: world.svg',
    'marker: 25,40 | Silverhaven | [[Silverhaven]]',
    'marker: 70,60 | Secret Lair | dm',
    '```',
  ].join('\n');

  it('renders player markers and hides DM markers', () => {
    const html = processMaps(
      block,
      (f) => `${BASE_TOKEN}wiki-assets/${f}`,
      () => 'silverhaven',
    );
    expect(html).toContain('wiki-map');
    expect(html).toContain('Silverhaven');
    expect(html).not.toContain('Secret Lair');
  });

  it('handles plain, external, unresolved and invalid markers', () => {
    const html = renderMap(
      [
        'ignored',
        'image: map.png',
        'marker: invalid',
        'marker: 5,10',
        'marker: 10,20 | Plain',
        'marker: 20,30 | Site | https://example.com',
        'marker: 30,40 | Missing | [[Missing]]',
      ].join('\n'),
      (file) => file,
      () => null,
    );
    expect(html).toContain('Plain');
    expect(html).toContain('https://example.com');
    expect(html).toContain('Missing');
    expect(wrapMap('', [])).toBe('');
    expect(pinHtml(1, 2, 'No target', null, () => null)).toContain('<span');
    expect(pinHtml(1, 2, 'Plain target', 'Elsewhere', () => null)).toContain('<span');
  });
});

describe('parseLeafletBlock', () => {
  it('parses the image and markers from an Obsidian leaflet block', () => {
    const block = parseLeafletBlock(
      [
        'image: [[world.svg]]',
        'marker: default, 310, 224, [[Silverhaven]]',
        'marker: dm, 1, 1',
      ].join('\n'),
    );
    expect(block.image).toBe('world.svg');
    expect(block.markers).toHaveLength(2);
    expect(block.markers[0]).toEqual({
      type: 'default',
      lat: 310,
      lng: 224,
      target: '[[Silverhaven]]',
    });
    expect(block.markers[1]!.type).toBe('dm');
  });

  it('skips malformed leaflet lines and supports missing targets', () => {
    const block = parseLeafletBlock(
      [
        'ignored',
        'marker: default, nope, 2',
        'marker: default, 1, nope',
        'marker: , 1, 2',
      ].join('\n'),
    );
    expect(block.image).toBeNull();
    expect(block.markers).toEqual([{ type: '', lat: 1, lng: 2, target: null }]);
  });
});

describe('leafletToPercent', () => {
  it('flips latitude for leaflet bottom-left origin', () => {
    expect(leafletToPercent(310, 224, 800, 500)).toEqual({ x: 28, y: 38 });
  });

  it('clamps out-of-bounds coordinates', () => {
    expect(leafletToPercent(9999, 9999, 800, 500)).toEqual({ x: 100, y: 0 });
  });
});

describe('slugify', () => {
  it('produces url-safe slugs', () => {
    expect(slugify('The Sunken Temple')).toBe('the-sunken-temple');
  });
});

describe('renderInfobox', () => {
  const resolveAsset = (f: string) => `${BASE_TOKEN}wiki-assets/${f}`;
  const resolveSlug = (title: string) => (title === 'Silverhaven' ? 'silverhaven' : null);

  it('renders an image, summary, and facts table', () => {
    const html = renderInfobox(
      {
        image: 'aria.png',
        summary: 'A traveling mage.',
        facts: { Race: 'Elf', Class: 'Wizard' },
      },
      'Aria',
      resolveAsset,
      resolveSlug,
    );
    expect(html).toContain('wiki-infobox');
    expect(html).toContain(`src="${BASE_TOKEN}wiki-assets/aria.png"`);
    expect(html).toContain('<h3>Aria</h3>');
    expect(html).toContain('A traveling mage.');
    expect(html).toContain('<th>Race</th><td>Elf</td>');
  });

  it('resolves [[wikilinks]] inside fact values', () => {
    const html = renderInfobox(
      { facts: { Home: '[[Silverhaven]]', Rival: '[[Nobody]]' } },
      'Aria',
      resolveAsset,
      resolveSlug,
    );
    expect(html).toContain('data-wiki-link="silverhaven"');
    expect(html).toContain(`href="${BASE_TOKEN}wiki/silverhaven">Silverhaven</a>`);
    expect(html).toContain('<th>Rival</th><td>Nobody</td>');
  });

  it('renders fact aliases with empty targets as plain text', () => {
    const html = renderInfobox(
      { facts: { Note: '[[|Alias]]' } },
      'Page',
      resolveAsset,
      resolveSlug,
    );
    expect(html).toContain('<td>Alias</td>');
  });

  it('escapes fact values', () => {
    const html = renderInfobox(
      { facts: { Note: '<script>x</script>' } },
      'Page',
      resolveAsset,
      resolveSlug,
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('returns an empty string when there is nothing to show', () => {
    expect(renderInfobox({ title: 'Page' }, 'Page', resolveAsset, resolveSlug)).toBe('');
  });
});

describe('processBoxes', () => {
  const resolveAsset = (f: string) => `${BASE_TOKEN}wiki-assets/${f}`;
  const resolveSlug = () => null;

  it('renders a fumble-box block into a facts card', () => {
    const block = [
      '```fumble-box',
      'title: Quick Stats',
      'Str: 18 (+4)',
      'Dex: 12 (+1)',
      '```',
    ].join('\n');
    const html = processBoxes(block, resolveAsset, resolveSlug);
    expect(html).toContain('wiki-box');
    expect(html).toContain('<h3>Quick Stats</h3>');
    expect(html).toContain('<th>Str</th><td>18 (+4)</td>');
  });

  it('supports box images and ignores malformed lines', () => {
    const html = processBoxes(
      '```fumble-box\nignored\nimage: portrait.png\n```',
      resolveAsset,
      resolveSlug,
    );
    expect(html).toContain('portrait.png');
    expect(html).not.toContain('<h3>');
  });
});

describe('extractWikiLinkTargets', () => {
  it('collects link targets, stripping aliases', () => {
    expect(
      extractWikiLinkTargets('[[Silverhaven]] and [[The Sunken Temple|the temple]]'),
    ).toEqual(['Silverhaven', 'The Sunken Temple']);
  });

  it('excludes image embeds', () => {
    expect(extractWikiLinkTargets('![[map.svg]] [[Silverhaven]]')).toEqual([
      'Silverhaven',
    ]);
  });

  it('excludes leaflet `image:` lines that use [[file]] syntax', () => {
    const body = ['image: [[world.svg]]', 'marker: default, 1, 2, [[Silverhaven]]'].join(
      '\n',
    );
    expect(extractWikiLinkTargets(body)).toEqual(['Silverhaven']);
  });

  it('ignores blank link targets', () => {
    expect(extractWikiLinkTargets('[[   ]]')).toEqual([]);
  });
});

describe('extractImageRefs', () => {
  it('collects image embed targets, stripping alt text', () => {
    expect(extractImageRefs('![[map.svg|World Map]] ![[icon.png]]')).toEqual([
      'map.svg',
      'icon.png',
    ]);
  });

  it('ignores blank image targets', () => {
    expect(extractImageRefs('![[   ]]')).toEqual([]);
  });
});

describe('validateFrontmatterKeys', () => {
  it('flags keys outside the known allowlist', () => {
    expect(
      validateFrontmatterKeys({ title: 'A', catagory: 'B' }, ['title', 'category']),
    ).toEqual(['catagory']);
  });
});
