import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/compendium/ReferenceLink', () => ({
  ReferenceLink: ({
    category,
    slug,
    label,
  }: {
    category: string;
    slug: string;
    label: string;
  }) => <a href={`/compendium/${category}/${slug}/`}>{label}</a>,
}));

import { fumbleHomebrewItems } from './fumbleHomebrew';
import type { FumbleHomebrewItem } from './fumbleHomebrew';
import { FumbleDetail } from './FumbleDetail';

describe('FumbleDetail', () => {
  it('localizes fallback prerequisites in Polish Fumble data', () => {
    expect(
      fumbleHomebrewItems('pl').find((entry) => entry.id === 'starting-flaw-stuttering')
        ?.prerequisite,
    ).toBe('Cecha rzucania czarów lub Magia Paktu');
  });

  it('renders class progression, features, and subclasses', () => {
    const item = fumbleHomebrewItems('en').find((entry) => entry.id === 'witch')!;

    render(
      <MemoryRouter>
        <FumbleDetail item={item} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Witch' })).toBeInTheDocument();
    expect(screen.getByText('Class')).toBeInTheDocument();
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Spellcasting').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Coven of the Claw/ }));
    expect(screen.getAllByText('Coven of the Claw').length).toBeGreaterThan(0);
    expect(screen.getByRole('img', { name: 'Coven of the Claw' })).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/sbgzuael/image/upload/v1786089463/claw-witch_p73v97.webp',
    );
  });

  it('renders the Polish Witch GM guidance as a sidebar note', () => {
    const item = fumbleHomebrewItems('pl').find((entry) => entry.id === 'witch')!;

    const view = render(
      <MemoryRouter>
        <FumbleDetail item={item} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Wskazówka dla GM: Uraza wiedźmy')).toBeInTheDocument();
    expect(view.container.querySelector('aside')).toHaveTextContent(
      'Czasami istota wykroczy przeciwko wiedźmie',
    );
  });

  it('links the Polish Apothecary spellcasting focus to the rule record', () => {
    const item = fumbleHomebrewItems('pl').find((entry) => entry.id === 'apothecary')!;

    render(
      <MemoryRouter>
        <FumbleDetail item={item} />
      </MemoryRouter>,
    );

    expect(
      screen
        .getAllByRole('link', { name: 'skupienia rzucającego zaklęcia' })
        .every(
          (link) => link.getAttribute('href') === '/compendium/rules/spellcasting-focus/',
        ),
    ).toBe(true);
  });

  it('renders ordinary Fumble entries without class data', () => {
    const item = fumbleHomebrewItems('pl').find(
      (entry) => entry.id === 'crystal-of-possibilities',
    )!;

    render(
      <MemoryRouter>
        <FumbleDetail item={item} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Kryształ możliwości/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('table')).toHaveLength(13);
    expect(
      screen.getByRole('heading', { level: 4, name: 'Tryb tworzenia' }),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link')
        .some((link) =>
          link.getAttribute('href')?.includes('/items/sphere-of-annihilation'),
        ),
    ).toBe(true);
    expect(
      screen
        .getAllByRole('link')
        .some((link) => link.getAttribute('href')?.includes('/spells/meteor-swarm')),
    ).toBe(true);
    expect(
      screen
        .getAllByRole('link')
        .some((link) => link.getAttribute('href')?.includes('/spells/summon-aberration')),
    ).toBe(true);
  });

  it('renders Polish homebrew dice as rollable controls', () => {
    const item = fumbleHomebrewItems('pl').find((entry) => entry.id === 'crafting')!;

    render(
      <MemoryRouter>
        <FumbleDetail item={item} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: '5k6' })).toBeInTheDocument();
  });

  it('renders a class record without optional progression sections', () => {
    const source = fumbleHomebrewItems('en').find((entry) => entry.id === 'witch')!;
    const item = {
      ...source,
      name: 'Minimal Witch',
      entries: [],
      features: [],
      table: undefined,
    };

    render(
      <MemoryRouter>
        <FumbleDetail item={item} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Minimal Witch' })).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders standalone subclass features as class features', () => {
    const item = fumbleHomebrewItems('en').find(
      (entry) => entry.id === 'warlock-great-serpent',
    )!;

    render(
      <MemoryRouter>
        <FumbleDetail item={item} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: 'Warlock: Great Serpent' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Strange Gifts')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Through sacred rituals, you gain one of the following mutations of your choice:',
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/Serpent Perception\./)).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: /Pact of the Chain/ })).not.toHaveLength(
      0,
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('renders Fumble spell details', () => {
    const item = fumbleHomebrewItems('pl').find((entry) => entry.id === 'cackle')!;

    render(
      <MemoryRouter>
        <FumbleDetail item={item} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /Chichot/ })).toBeInTheDocument();
    expect(screen.getByText(/Wydajesz szalony chichot/)).toBeInTheDocument();
  });

  it('keeps localized spell subclass references linked to class routes', () => {
    const item = fumbleHomebrewItems('pl').find((entry) => entry.id === 'last-rites')!;

    render(
      <MemoryRouter>
        <FumbleDetail item={item} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Aptekarz: Egzorcysta' })).toHaveAttribute(
      'href',
      '/compendium/classes/apothecary/exorcist/',
    );
  });

  it('renders Fumble actions, psionics, and optional features', () => {
    const entries = [
      fumbleHomebrewItems('pl').find((entry) => entry.id === 'manifest-a-power')!,
      fumbleHomebrewItems('pl').find((entry) => entry.id === 'adapt')!,
      fumbleHomebrewItems('pl').find((entry) => entry.id === 'destructive-power')!,
    ];

    for (const item of entries) {
      const view = render(
        <MemoryRouter>
          <FumbleDetail item={item} />
        </MemoryRouter>,
      );
      expect(view.container.querySelector('h1')).not.toBeNull();
      view.unmount();
    }

    render(
      <MemoryRouter>
        <FumbleDetail item={entries[0]!} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /Manifestuj/ })).toBeInTheDocument();
    expect(screen.getAllByText(/akcj/).length).toBeGreaterThan(0);
  });

  it('renders Fumble bestiary details', () => {
    const item = fumbleHomebrewItems('pl').find((entry) => entry.id === 'allied-hunter')!;

    render(
      <MemoryRouter>
        <FumbleDetail item={item} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { name: /Sprzymierzony Łowca/ }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Sprytny Sprzymierzeniec/)).toBeInTheDocument();
    expect(screen.getByText(/Cios Łowcy/)).toBeInTheDocument();
  });

  it('renders a feat Fumble detail with and without an explicit feat category', () => {
    const source = fumbleHomebrewItems('en').find((entry) => entry.category === 'feats')!;
    const items = [
      { ...source, featCategory: 'Origin' },
      { ...source, featCategory: undefined },
    ];

    for (const item of items) {
      const view = render(
        <MemoryRouter>
          <FumbleDetail item={item} />
        </MemoryRouter>,
      );
      expect(view.container.querySelector('h1')).not.toBeNull();
      view.unmount();
    }
  });

  it('renders sparse generic and subclass records', () => {
    const generic = {
      id: 'generic',
      name: 'Generic',
      source: 'Fumble',
      srd: false,
      category: 'decks',
      campaigns: [],
    } as unknown as FumbleHomebrewItem;
    const subclass = {
      id: 'sparse-subclass',
      name: 'Wizard: Sparse',
      source: 'Fumble',
      srd: false,
      category: 'classes',
      isSubclass: true,
      className: 'Wizard',
      subclassTitle: 'Arcane Tradition',
      features: [],
      campaigns: [],
    } as unknown as FumbleHomebrewItem;

    const genericView = render(
      <MemoryRouter>
        <FumbleDetail item={generic} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Generic' })).toBeInTheDocument();
    genericView.unmount();

    render(
      <MemoryRouter>
        <FumbleDetail item={subclass} />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Wizard: Sparse' })).toBeInTheDocument();
    expect(screen.getByText('Wizard - Arcane Tradition')).toBeInTheDocument();
  });
});
