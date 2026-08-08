import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { fumbleHomebrewItems } from './fumbleHomebrew';
import { FumbleDetail } from './FumbleDetail';

describe('FumbleDetail', () => {
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

  it('renders a class record without optional progression sections', () => {
    const source = fumbleHomebrewItems('en').find((entry) => entry.id === 'witch')!;
    const item = {
      ...source,
      name: 'Minimal Witch',
      entries: [],
      features: [],
      subclasses: undefined,
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
});
