import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Entry } from '@/data/compendium/entry';
import { useLightbox } from '@/features/ui/lightboxStore';
import { useRollStore } from '@/features/dice/rollStore';
import { EntryRenderer } from './EntryRenderer';
import { renderBookChapter, renderMonster } from '@/seo/staticEntryRenderer';
import type { MonsterEntry } from '@/data/compendium/types';

const show = (entries: Entry[]) =>
  render(
    <MemoryRouter>
      <EntryRenderer entries={entries} />
    </MemoryRouter>,
  );
const roll = useRollStore.getState().roll;

describe('entry renderer', () => {
  beforeEach(() => {
    useLightbox.setState({ src: null, caption: '' });
    useRollStore.setState({ log: [], dockOpen: false, roll });
  });

  it('renders the chapter as readable HTML with tables and no inert dice buttons', () => {
    const html = renderBookChapter(
      {
        type: 'section',
        name: 'Chapter',
        entries: [
          'Roll {@dice 1d6} {@recharge 5}.',
          { type: 'table', colLabels: ['d6', 'Treasure'], rows: [['1', 'A gold ring']] },
        ],
      },
      '/books/test/0/',
    );
    expect(html).toContain('<table');
    expect(html).toContain('A gold ring');
    expect(html).toContain('1d6');
    expect(html).toContain('Recharge');
    expect(html).not.toContain('<button');
  });

  it('renders monster mechanics in static HTML', () => {
    const monster = {
      id: 'wight',
      name: 'Wight',
      source: 'XMM',
      size: 'Medium',
      creatureType: 'Undead',
      dex: 14,
      ac: '14',
      hp: '82 (11d8 + 33)',
      str: 15,
      con: 16,
      int: 10,
      wis: 13,
      cha: 15,
      cr: '3',
      traits: [],
      actions: [],
      spellcasting: [],
      bonusActions: [],
      reactions: [],
      legendaryActions: [],
      lairActions: [],
      regionalEffects: [],
    } as unknown as MonsterEntry;
    const html = renderMonster(monster, '/compendium/bestiary/wight/');
    expect(html).toContain('Wight');
    expect(html).toContain('82');
    expect(html).not.toContain('<button');
    const fumbleMonster = { ...monster, _fumble: true, category: 'bestiary' };
    expect(renderMonster(fumbleMonster, '/compendium/bestiary/wight/')).toContain(
      'Fumble',
    );
  });

  it('preserves grouped tables, dice ranges, flow steps and formula text', () => {
    const view = show([
      {
        type: 'tableGroup',
        name: 'Tables',
        tables: [
          {
            type: 'table',
            rows: [
              [
                { type: 'cell', roll: { exact: 7 } },
                { type: 'cell', roll: { min: 8, max: 12 } },
                { type: 'cell', entry: 'Explicit cell' },
                { type: 'cell' },
              ],
            ],
          },
        ],
      },
      {
        type: 'flowchart',
        blocks: [
          { type: 'flowBlock', name: 'Next step', entries: ['Resolve the check.'] },
        ],
      },
      { type: 'tableGroup' },
      { type: 'flowchart' },
      { type: 'abilityGeneric', text: 'Add the proficiency bonus.' },
      { type: 'abilityGeneric' },
      { type: 'hr' },
    ]);
    expect(screen.getByRole('table')).toHaveTextContent('78-12Explicit cell');
    expect(view.container).toHaveTextContent('Next stepResolve the check.');
    expect(view.container).toHaveTextContent('Add the proficiency bonus.');
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('renders structured entry variants', () => {
    const entries = [
      'Plain {@b text}.',
      {
        type: 'section',
        name: 'Section Name',
        page: 12,
        entries: ['Section body'],
      },
      { type: 'entries' },
      {
        type: 'list',
        items: ['First item', { type: 'item', name: 'Named', entry: 'Item body' }],
      },
      { type: 'list' },
      { type: 'item', entries: ['Nested item'] },
      {
        type: 'attack',
        attackEntries: ['Attack', 'roll.'],
        hitEntries: ['Damage', 'dealt.'],
      },
      { type: 'attack' },
      {
        type: 'statblock',
        tag: 'creature',
        name: 'Ancient Dragon',
      },
      { type: 'statblock', tag: 1 },
      {
        type: 'statblock',
        tag: 'unknown',
        name: 'Unknown Block',
      },
      {
        type: 'inset',
        name: 'Tip',
        entries: ['Inset body'],
      },
      {
        type: 'insetReadaloud',
        entries: ['Read aloud'],
      },
      {
        type: 'quote',
        entries: ['A famous quote'],
      },
      {
        type: 'unknown',
        entries: ['Fallback entries'],
      },
      {
        type: 'unknown',
        entry: 'Fallback entry',
      },
      { type: 'unknown' },
    ] as Entry[];
    const view = show(entries);
    expect(view.container).toHaveTextContent('Plain text.');
    expect(view.container.querySelector('#page-12')).toHaveAttribute(
      'data-entry-name',
      'section-name',
    );
    expect(screen.queryByRole('link', { name: 'Ancient Dragon' })).toBeNull();
    expect(view.container).toHaveTextContent('Ancient Dragon');
    expect(view.container.querySelector('aside')).toHaveTextContent('TipInset body');
    expect(view.container).toHaveTextContent('Unknown Block');
    expect(view.container).toHaveTextContent('Fallback entries');
    expect(view.container).toHaveTextContent('Fallback entry');
  });

  it('localizes statblock names without changing their source slug', () => {
    const view = render(
      <MemoryRouter initialEntries={['/pl/']}>
        <EntryRenderer
          entries={
            [{ type: 'statblock', tag: 'unknown', name: 'Adult Black Dragon' }] as Entry[]
          }
        />
      </MemoryRouter>,
    );
    expect(view.container).toHaveTextContent('Dorosły Czarny Smok');
    expect(view.container.querySelector('[data-entry-name]')).toHaveAttribute(
      'data-entry-name',
      'adult-black-dragon',
    );
  });

  it('renders images, galleries and opens the lightbox', () => {
    const view = show([
      {
        type: 'gallery',
        images: [
          {
            type: 'image',
            title: '{@b Dragon}',
            href: { url: 'https://example.test/dragon.webp' },
          },
          {
            type: 'image',
            href: { path: 'book/dragon.webp' },
          },
          { type: 'image', href: {} },
        ],
      },
      { type: 'gallery' },
    ] as Entry[]);
    const image = screen.getByRole('img', { name: 'Dragon' });
    fireEvent.click(image);
    expect(useLightbox.getState()).toMatchObject({
      src: 'https://example.test/dragon.webp',
      caption: 'Dragon',
    });
    fireEvent.error(image);
    expect(view.container.querySelector('figure')).toHaveStyle({ display: 'none' });
  });

  it('rolls on tables and highlights matching rows', () => {
    const view = show([
      {
        type: 'table',
        caption: 'Outcome',
        colLabels: ['d1', 'Result'],
        rows: [
          ['1', 'Exact'],
          ['1-0', 'Reversed'],
          [],
          [{ type: 'item', entry: 'Object cell' }],
          {
            type: 'row',
            style: 'row-indent-first',
            row: ['2-3', 'Range'],
          },
        ],
      },
      {
        type: 'table',
        colLabels: ['Name'],
        rows: [
          ['No roll'],
          { type: 'row', row: 'invalid' },
          [{ type: 'item', entry: 'Object cell' }],
        ],
      },
      { type: 'table' },
    ] as Entry[]);
    fireEvent.click(screen.getByRole('button', { name: 'd1' }));
    expect(useRollStore.getState().log).toHaveLength(1);
    expect(view.container.querySelector('tbody tr')).toHaveClass('bg-arcane-700/30');
    expect(view.container.querySelector('.pl-6')).toHaveTextContent('2-3');
  });

  it('handles a table roll without a caption or outcome', () => {
    useRollStore.setState({ roll: () => null as never });
    show([
      {
        type: 'table',
        colLabels: ['d1'],
        rows: [['1']],
      },
    ] as Entry[]);
    fireEvent.click(screen.getByRole('button', { name: 'd1' }));
    expect(screen.getByRole('button', { name: 'd1' })).toBeInTheDocument();
  });

  it('does not nest interactive dice markup inside the table roll control', () => {
    show([
      {
        type: 'table',
        colLabels: ['{@dice 1d12}', 'Result'],
        rows: [['1', 'Exact']],
      },
    ] as Entry[]);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAttribute('title', 'Roll 1d12');
  });
});
