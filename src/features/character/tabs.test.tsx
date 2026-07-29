import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { CompendiumCategoryId } from '@/data/compendium/types';
import { createCharacter, setSpellSlot, type Character } from './model';
import { SheetTabs } from './tabs';

vi.mock('@/i18n/useT', () => ({
  useT: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${Object.values(values).join(' ')}` : key,
  }),
}));

vi.mock('./CompendiumPicker', () => ({
  CompendiumPicker: ({
    categoryId,
    onPick,
  }: {
    categoryId: CompendiumCategoryId;
    onPick: (entry: unknown) => void;
  }) => (
    <>
      <button
        type="button"
        onClick={() =>
          onPick(
            categoryId === 'items'
              ? {
                  id: 'plate',
                  name: 'Plate',
                  source: 'XPHB',
                  srd: false,
                  type: 'Heavy Armor',
                  rarity: 'Rare',
                  ac: '18',
                }
              : categoryId === 'spells'
                ? {
                    id: 'shield',
                    name: 'Shield',
                    source: 'XPHB',
                    srd: false,
                    level: 1,
                  }
                : {
                    id: 'alert',
                    name: 'Alert',
                    source: 'XPHB',
                    srd: false,
                  },
          )
        }
      >
        pick-{categoryId}
      </button>
      {categoryId === 'items' && (
        <button
          type="button"
          onClick={() =>
            onPick({
              id: 'rope',
              name: 'Rope',
              source: 'XPHB',
              srd: false,
              type: 'Adventuring Gear',
              rarity: '',
              ac: '',
            })
          }
        >
          pick-items-plain
        </button>
      )}
    </>
  ),
}));

function Harness({ initial }: { initial: Character }) {
  const [character, setCharacter] = useState(initial);
  return (
    <>
      <span data-testid="state">{JSON.stringify(character)}</span>
      <SheetTabs
        character={character}
        update={(patch) => setCharacter((current) => ({ ...current, ...patch }))}
      />
    </>
  );
}

function state(): Character {
  return JSON.parse(screen.getByTestId('state').textContent ?? '') as Character;
}

function open(name: string) {
  fireEvent.click(screen.getByText(`character.sheet.tabs.${name}`));
}

describe('character sheet tabs', () => {
  it('adds, edits and removes actions, inventory and features', () => {
    render(<Harness initial={createCharacter('Hero')} />);

    fireEvent.click(screen.getByText('character.sheet.actionsTab.add'));
    fireEvent.click(screen.getByText('character.sheet.actionsTab.add'));
    fireEvent.change(
      screen.getAllByPlaceholderText('character.sheet.actionsTab.namePlaceholder')[0]!,
      {
        target: { value: 'Strike' },
      },
    );
    fireEvent.change(
      screen.getAllByPlaceholderText('character.sheet.actionsTab.detailsPlaceholder')[0]!,
      { target: { value: 'One target' } },
    );
    expect(state().actions[0]).toMatchObject({ name: 'Strike', notes: 'One target' });
    fireEvent.click(screen.getAllByLabelText('character.sheet.actionsTab.remove')[0]!);
    expect(state().actions).toHaveLength(1);

    open('inventory');
    fireEvent.click(screen.getByText('pick-items'));
    expect(state().inventory[0]).toMatchObject({
      name: 'Plate',
      quantity: 1,
      armorType: 'heavy',
      baseAc: 18,
      equipped: true,
    });
    fireEvent.click(screen.getByText('character.sheet.fields.equipped'));
    fireEvent.change(screen.getByDisplayValue('1'), { target: { value: '3' } });
    expect(state().inventory[0]).toMatchObject({ quantity: 3, equipped: false });
    fireEvent.click(screen.getByText('character.sheet.inventoryTab.add'));
    expect(state().inventory).toHaveLength(2);
    fireEvent.change(
      screen.getAllByPlaceholderText('character.sheet.inventoryTab.namePlaceholder')[0]!,
      { target: { value: 'Polished Plate' } },
    );
    fireEvent.change(
      screen.getAllByPlaceholderText('character.sheet.inventoryTab.descPlaceholder')[0]!,
      { target: { value: 'Heavy' } },
    );
    fireEvent.click(screen.getByText('pick-items-plain'));
    expect(state().inventory[2]).not.toHaveProperty('armorType');
    fireEvent.click(screen.getAllByLabelText('character.sheet.inventoryTab.remove')[0]!);
    expect(state().inventory).toHaveLength(2);

    open('features');
    fireEvent.click(screen.getByText('pick-feats'));
    expect(state().features[0]).toMatchObject({ name: 'Alert', source: 'Feat' });
    fireEvent.click(screen.getByText('character.sheet.featuresTab.add'));
    fireEvent.change(
      screen.getAllByPlaceholderText('character.sheet.featuresTab.namePlaceholder')[1]!,
      { target: { value: 'Custom Feature' } },
    );
    fireEvent.change(
      screen.getAllByPlaceholderText('character.sheet.featuresTab.sourcePlaceholder')[1]!,
      { target: { value: 'Class' } },
    );
    fireEvent.change(
      screen.getAllByPlaceholderText('character.sheet.featuresTab.descPlaceholder')[1]!,
      { target: { value: 'Description' } },
    );
    expect(state().features[1]).toMatchObject({
      name: 'Custom Feature',
      source: 'Class',
      notes: 'Description',
    });
    fireEvent.click(screen.getAllByLabelText('character.sheet.featuresTab.remove')[0]!);
    expect(state().features).toHaveLength(1);
  });

  it('manages spellcasting, spell slots and spells', () => {
    const character = createCharacter('Mage');
    character.spellSlots = setSpellSlot([], 1, {
      longRestMax: 1,
      shortRestMax: 1,
      usedLongRest: 0,
      usedShortRest: 0,
    });
    render(<Harness initial={character} />);
    open('spells');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'int' } });
    expect(state().spellcastingAbility).toBe('int');

    fireEvent.click(screen.getByLabelText('character.sheet.spellsTab.spendSlot 1'));
    expect(state().spellSlots[0]).toMatchObject({ usedLongRest: 1, usedShortRest: 0 });
    fireEvent.click(screen.getByLabelText('character.sheet.spellsTab.spendSlot 1'));
    expect(state().spellSlots[0]).toMatchObject({ usedLongRest: 1, usedShortRest: 1 });
    fireEvent.click(screen.getByLabelText('character.sheet.spellsTab.spendSlot 1'));
    fireEvent.click(screen.getByLabelText('character.sheet.spellsTab.recoverSlot 1'));
    expect(state().spellSlots[0]).toMatchObject({ usedLongRest: 1, usedShortRest: 0 });
    fireEvent.click(screen.getByLabelText('character.sheet.spellsTab.recoverSlot 1'));
    fireEvent.click(screen.getByLabelText('character.sheet.spellsTab.recoverSlot 1'));
    fireEvent.click(screen.getByText('character.sheet.spellsTab.shortRest'));
    fireEvent.click(screen.getByText('character.sheet.spellsTab.longRest'));
    expect(state().spellSlots[0]).toMatchObject({ usedLongRest: 0, usedShortRest: 0 });

    fireEvent.click(screen.getByText('pick-spells'));
    expect(state().spells[0]).toMatchObject({
      name: 'Shield',
      level: 1,
      prepared: false,
    });
    fireEvent.click(screen.getByText('character.sheet.spellsTab.prep'));
    fireEvent.change(screen.getByDisplayValue('Shield'), { target: { value: 'Ward' } });
    expect(state().spells[0]).toMatchObject({ name: 'Ward', prepared: true });
    fireEvent.click(screen.getByText('character.sheet.spellsTab.add'));
    expect(state().spells).toHaveLength(2);
    fireEvent.change(screen.getAllByRole('spinbutton')[1]!, {
      target: { value: '3' },
    });
    fireEvent.click(screen.getAllByLabelText('character.sheet.spellsTab.remove')[0]!);
    expect(state().spells).toHaveLength(1);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    expect(state().spellcastingAbility).toBeNull();
  });

  it('rolls in different modes and edits notes', () => {
    const character = createCharacter('Scout');
    character.abilities.str = 14;
    character.abilities.int = 8;
    render(<Harness initial={character} />);
    open('rolls');

    fireEvent.click(screen.getByText('dice.modeAdvantage'));
    fireEvent.click(screen.getByText(/character\.sheet\.combat\.initiative/));
    expect(screen.getAllByText(/dice\.modeAdvantage/)).toHaveLength(2);
    fireEvent.click(screen.getByText('dice.modeDisadvantage'));
    fireEvent.click(screen.getAllByText(/character\.sheet\.abilities\.str/)[0]!);
    expect(screen.getByText('character.sheet.rollsTab.recent')).toBeInTheDocument();
    fireEvent.click(screen.getByText('dice.modeNormal'));
    fireEvent.click(screen.getAllByText(/character\.sheet\.abilities\.str/)[0]!);
    fireEvent.click(screen.getAllByText(/character\.sheet\.abilities\.int/)[0]!);

    open('notes');
    fireEvent.change(
      screen.getByPlaceholderText('character.sheet.notesTab.placeholder'),
      {
        target: { value: 'Met a dragon.' },
      },
    );
    expect(state().notes).toBe('Met a dragon.');
  });

  it('shows the empty spell slot state', () => {
    render(<Harness initial={createCharacter('Commoner')} />);
    open('spells');
    expect(screen.getByText('character.sheet.spellsTab.noSlotsHint')).toBeInTheDocument();
  });

  it('treats missing equipped state as unequipped', () => {
    const character = createCharacter('Fighter');
    character.inventory = [
      {
        id: 'armor',
        name: 'Armor',
        quantity: 1,
        notes: '',
        armorType: 'heavy',
      },
    ];
    render(<Harness initial={character} />);
    open('inventory');
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });
});
