import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LootGeneratorPage } from './LootGeneratorPage';

const mocks = vi.hoisted(() => ({
  status: 'ready',
  items: [
    { id: 'sword', name: 'Sword', type: 'weapon', rarity: 'common' },
    { id: 'wand', name: 'Wand', type: 'wand', rarity: 'rare' },
    { id: 'hidden', name: 'Hidden', type: 'weapon', rarity: 'common', hidden: true },
    { id: 'money', name: 'Money', type: 'currency', rarity: 'common' },
  ],
  characters: [] as Array<{
    id: string;
    name: string;
    level: number;
    className?: string;
    subclass?: string;
    dm?: boolean;
  }>,
  rolls: [] as Array<number | null>,
  emptyUsable: false,
}));

vi.mock('@/features/compendium/useCategoryItems', () => ({
  useCategoryItems: () => ({ status: mocks.status, items: mocks.items }),
}));

vi.mock('@/features/compendium/categories', () => ({
  getCategory: () => ({ id: 'items' }),
}));

vi.mock('@/features/character/store', () => ({
  useCharacterList: () => mocks.characters,
}));

vi.mock('@/features/character/model', () => ({
  isDmCharacter: (character: { dm?: boolean }) => character.dm,
}));

vi.mock('@/features/dice/engine', () => ({
  rollExpression: () => {
    const total = mocks.rolls.shift();
    return total == null ? null : { total };
  },
}));

vi.mock('./loot', () => {
  const tiers = [
    {
      id: 1,
      minLevel: 1,
      maxLevel: 4,
      rarities: ['common'],
      coinDice: '1d6',
      coinMultiplier: 10,
      gemValue: 10,
      itemDice: '1d2',
    },
    {
      id: 2,
      minLevel: 5,
      maxLevel: 10,
      rarities: ['common', 'rare'],
      coinDice: '2d6',
      coinMultiplier: 20,
      gemValue: 50,
      itemDice: '1d2',
    },
  ];
  return {
    TIERS: tiers,
    isExcludedItemType: (type: string) => type === 'currency',
    isUsableByParty: () => true,
    rarityMatches: (rarity: string, allowed: string[]) => allowed.includes(rarity),
    rarityAtMost: () => true,
    tierForLevel: (level: number) => (level >= 5 ? tiers[1] : tiers[0]),
    usableByNames: (_item: unknown, characters: Array<{ name: string }>) =>
      mocks.emptyUsable
        ? []
        : characters.map((character) => character.name).filter(Boolean),
  };
});

vi.mock('@/i18n/path', () => ({
  Link: ({ children, to, ...props }: React.ComponentProps<'a'> & { to: string }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/i18n/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}));

vi.mock('@/seo/useSeo', () => ({
  useSeo: vi.fn(),
}));

describe('LootGeneratorPage', () => {
  beforeEach(() => {
    mocks.status = 'ready';
    mocks.characters = [];
    mocks.rolls = [];
    mocks.emptyUsable = false;
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  it('links to character creation when the party is empty', () => {
    render(<LootGeneratorPage />);
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.savedCharacters' }));
    const link = screen.getByRole('link');
    expect(link.parentElement).toHaveTextContent('dm.loot.noCharactersYet');
    expect(link).toHaveAttribute('href', '/character');
  });

  it('selects party members and generates minor and major rewards', () => {
    mocks.characters = [
      {
        id: 'hero',
        name: 'Hero',
        level: 6,
        className: 'Wizard',
        subclass: 'Evoker',
      },
      { id: 'dm', name: '', level: 4, dm: true },
    ];
    render(<LootGeneratorPage />);
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.savedCharacters' }));
    expect(screen.getByText('character.unnamed')).toBeInTheDocument();
    expect(screen.getByText('character.dmBadge')).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(checkboxes[0]!);
    mocks.rolls = [null, null];
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.minorReward' }));
    expect(screen.getByText('dm.loot.noMagicItems')).toBeInTheDocument();

    mocks.rolls = [2, 3, 2];
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.majorReward' }));
    expect(screen.getByText('Sword')).toBeInTheDocument();
    expect(screen.getByText('Wand')).toBeInTheDocument();
    expect(screen.getAllByText('dm.loot.usableBy')).toHaveLength(2);
    expect(screen.getByText(/3 × 50 gp/)).toBeInTheDocument();
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
    expect(screen.queryByText('Money')).not.toBeInTheDocument();

    mocks.rolls = [null, null, null];
    mocks.emptyUsable = true;
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.majorReward' }));
    expect(screen.getByText('Sword')).toBeInTheDocument();
  });

  it('builds a manual mixed-level party', () => {
    render(<LootGeneratorPage />);
    const count = screen.getByRole('spinbutton', {
      name: 'dm.loot.characterCount',
    });
    const level = screen.getByRole('spinbutton', {
      name: 'dm.loot.characterLevel',
    });
    fireEvent.change(count, { target: { value: '3' } });
    fireEvent.change(level, { target: { value: '6' } });
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.addLevelGroup' }));
    expect(screen.getAllByRole('spinbutton')).toHaveLength(4);
    fireEvent.click(
      screen.getAllByRole('button', { name: 'dm.loot.removeLevelGroup' })[1]!,
    );

    mocks.rolls = [2, 3, 1];
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.majorReward' }));
    expect(screen.getByText('Sword')).toBeInTheDocument();
  });

  it('generates and rerolls a tier hoard', () => {
    render(<LootGeneratorPage />);
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.modeTier' }));
    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'dm.loot.tierLabel dm.loot.tierLevels',
      })[1]!,
    );
    mocks.rolls = [2, 1, 2];
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.generateHoard' }));
    expect(screen.getByText('Sword')).toBeInTheDocument();
    expect(screen.getByText('Wand')).toBeInTheDocument();

    mocks.rolls = [null, null, null];
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.generateHoard' }));

    mocks.rolls = [1];
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.rerollItems' }));
    expect(screen.getByText('Sword')).toBeInTheDocument();
  });

  it('generates wildcard loot and exposes loading states', () => {
    mocks.characters = [{ id: 'hero', name: 'Hero', level: 3 }];
    const view = render(<LootGeneratorPage />);
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.modeWildcard' }));
    fireEvent.click(
      screen.getAllByRole('button', {
        name: 'dm.loot.tierLabel dm.loot.tierLevels',
      })[1]!,
    );
    mocks.rolls = [4, 1];
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.rollWildcardLoot' }));
    expect(screen.getByText('Sword')).toBeInTheDocument();

    mocks.rolls = [null, null];
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.rollWildcardLoot' }));

    mocks.status = 'loading';
    view.rerender(<LootGeneratorPage />);
    fireEvent.click(screen.getByRole('button', { name: 'dm.loot.modeTier' }));
    expect(screen.getByRole('button', { name: 'dm.loot.loadingItems' })).toBeDisabled();
  });
});
