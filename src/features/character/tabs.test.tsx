import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRollStore } from '@/features/dice/rollStore';
import { useDialogStore } from '@/features/ui/confirmStore';
import { createCharacter, type Character } from './model';
import { useSheetRollMode } from './rolls';
import { SheetHarness } from './sheetTestHarness';
import { currentCharacter } from './sheetTestState';
import { SheetTabs } from './tabs';

const picks = vi.hoisted(() => ({
  spells: { id: 'shield', name: 'Shield', level: 1, concentration: false },
  cantrip: { id: 'light', name: 'Light', level: 0, concentration: false },
  items: {
    id: 'chain-mail',
    name: 'Chain Mail',
    type: 'Heavy Armor',
    rarity: '',
    ac: '16',
  },
  trinket: { id: 'rope', name: 'Rope', type: '', rarity: 'common', ac: '' },
  feats: { id: 'alert', name: 'Alert' },
}));

vi.mock('./CompendiumPicker', () => ({
  CompendiumPicker: ({
    categoryId,
    label,
    onPick,
    describe,
  }: {
    categoryId: 'spells' | 'items' | 'feats';
    label: string;
    onPick: (item: unknown) => void;
    describe?: (item: unknown) => string;
  }) => {
    const extra =
      categoryId === 'spells'
        ? picks.cantrip
        : categoryId === 'items'
          ? picks.trinket
          : null;
    return (
      <div>
        <button type="button" onClick={() => onPick(picks[categoryId])}>
          {label}
        </button>
        {extra && (
          <button type="button" onClick={() => onPick(extra)}>
            {`${label} extra`}
          </button>
        )}
        <span>{describe?.(picks[categoryId])}</span>
        <span>{extra && describe?.(extra)}</span>
      </div>
    );
  },
}));

function mount(character: Character = createCharacter('Hero'), path = '/character/x') {
  render(<SheetHarness initial={character} component={SheetTabs} path={path} />);
}

describe('SheetTabs', () => {
  beforeEach(() => {
    useRollStore.setState({ log: [], dockOpen: false, error: null });
    useSheetRollMode.setState({ mode: 'normal' });
  });

  it('uses the tablist pattern with keyboard navigation', () => {
    mount();
    const actions = screen.getByRole('tab', { name: 'Actions' });
    expect(actions).toHaveAttribute('aria-selected', 'true');
    expect(actions).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', actions.id);
    fireEvent.keyDown(actions, { key: 'ArrowLeft' });
    expect(screen.getByRole('tab', { name: 'Notes' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Notes' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Actions' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Actions' }), { key: 'End' });
    expect(screen.getByRole('tab', { name: 'Notes' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Notes' }), { key: 'Home' });
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Actions' }), { key: 'a' });
    expect(screen.getByRole('tab', { name: 'Actions' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    fireEvent.click(screen.getByRole('tab', { name: 'Spells' }));
    expect(screen.getByRole('tab', { name: 'Spells' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('opens the tab named in the URL and edits notes', () => {
    mount(createCharacter('Hero'), '/character/x?tab=notes');
    fireEvent.change(screen.getByRole('textbox', { name: 'Notes' }), {
      target: { value: 'Backstory' },
    });
    expect(currentCharacter().notes).toBe('Backstory');
  });

  it('adds, edits, removes and restores actions', () => {
    mount();
    expect(screen.getByText(/No actions yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add action' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Action name' }), {
      target: { value: 'Longsword' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Action details' }), {
      target: { value: '1d8 slashing' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add action' }));
    expect(currentCharacter().actions).toHaveLength(2);
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Action name' })[1]!, {
      target: { value: 'Bow' },
    });
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Action name' })[1]!, {
      target: { value: '' },
    });
    expect(currentCharacter().actions[0]!.name).toBe('Longsword');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Longsword' }));
    expect(screen.getByText('Longsword removed.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(currentCharacter().actions[0]).toMatchObject({
      name: 'Longsword',
      notes: '1d8 slashing',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Unnamed entry' }));
    expect(screen.getByText('Unnamed entry removed.')).toBeInTheDocument();
  });

  it('rolls through the shared dock in the selected mode', () => {
    mount(createCharacter('Hero'), '/character/x?tab=rolls');
    fireEvent.click(screen.getByRole('button', { name: 'Disadvantage' }));
    expect(screen.getByRole('button', { name: 'Disadvantage' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: /^Initiative/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Wisdom check/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Charisma save/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Survival/ }));
    const log = useRollStore.getState().log;
    expect(log.map((entry) => entry.label)).toEqual([
      'Hero: Survival',
      'Hero: Charisma save',
      'Hero: Wisdom check',
      'Hero: Initiative',
    ]);
    expect(log[0]!.outcome.mode).toBe('disadvantage');
    expect(useRollStore.getState().dockOpen).toBe(true);
  });

  it('manages coins and inventory items', () => {
    const owner = createCharacter('Hero');
    owner.inventory = [
      { id: 'shield', name: 'Shield', notes: '', quantity: 1, armorType: 'shield' },
    ];
    mount(owner, '/character/x?tab=inventory');
    expect(screen.getByRole('checkbox', { name: 'Equipped' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Shield' }));
    expect(screen.getByText('No items yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Shield' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Gold (gp)' }), {
      target: { value: '25' },
    });
    expect(currentCharacter().currency.gp).toBe(25);
    expect(screen.getByText('Heavy Armor')).toBeInTheDocument();
    expect(screen.getByText('common')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Add an item from the compendium...' }),
    );
    expect(currentCharacter().inventory[0]).toMatchObject({
      name: 'Chain Mail',
      armorType: 'heavy',
      baseAc: 16,
      equipped: true,
      itemId: 'chain-mail',
      notes: 'Heavy Armor',
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Add an item from the compendium... extra' }),
    );
    expect(currentCharacter().inventory[1]).toEqual(
      expect.not.objectContaining({ armorType: expect.anything() }),
    );
    fireEvent.click(screen.getByRole('checkbox', { name: 'Equipped' }));
    expect(currentCharacter().inventory[0]!.equipped).toBe(false);
    expect(
      screen.getByRole('link', { name: 'Open Chain Mail in the compendium' }),
    ).toHaveAttribute('href', '/compendium/items/chain-mail/');
    fireEvent.change(screen.getByRole('textbox', { name: 'Quantity of Chain Mail' }), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add item' }));
    const names = screen.getAllByRole('textbox', { name: 'Item name' });
    fireEvent.change(names[2]!, { target: { value: 'Torch' } });
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Item description' })[2]!, {
      target: { value: 'Lights' },
    });
    expect(currentCharacter().inventory[2]).toMatchObject({
      name: 'Torch',
      notes: 'Lights',
      quantity: 1,
    });
    expect(currentCharacter().inventory[0]!.quantity).toBe(2);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Torch' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(currentCharacter().inventory).toHaveLength(3);
  });

  it('separates synchronized and personal features', () => {
    const character = createCharacter('Hero');
    character.autoSyncFeatures = false;
    character.features = [
      {
        id: 'auto-feature-0',
        name: 'Rage',
        source: 'Barbarian 1',
        notes: 'Fury',
        auto: true,
      },
      { id: 'auto-feature-1', name: 'Dwarf', source: 'Species', notes: '', auto: true },
    ];
    mount(character, '/character/x?tab=features');
    expect(screen.getByText(/Synchronization is off/)).toBeInTheDocument();
    expect(screen.getByText('No personal features yet.')).toBeInTheDocument();
    expect(screen.getByText('No description.')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Copy to my features' })[0]!);
    expect(screen.getByText('Rage copied to your features.')).toBeInTheDocument();
    expect(currentCharacter().features.at(-1)).toMatchObject({
      name: 'Rage',
      notes: 'Fury',
    });
    expect(currentCharacter().features.at(-1)).not.toHaveProperty('auto');

    fireEvent.click(
      screen.getByRole('button', { name: 'Add a feat from the compendium...' }),
    );
    expect(currentCharacter().features.at(-1)).toMatchObject({
      name: 'Alert',
      source: 'Feat',
      featId: 'alert',
    });
    expect(
      screen.getByRole('link', { name: 'Open Alert in the compendium' }),
    ).toHaveAttribute('href', '/compendium/feats/alert/');

    fireEvent.click(screen.getByRole('button', { name: 'Add feature' }));
    const name = screen.getAllByRole('textbox', { name: 'Feature name' }).at(-1)!;
    fireEvent.change(name, { target: { value: 'Lucky' } });
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Feature source' }).at(-1)!, {
      target: { value: 'Custom' },
    });
    fireEvent.change(
      screen.getAllByRole('textbox', { name: 'Feature description' }).at(-1)!,
      {
        target: { value: 'Reroll' },
      },
    );
    expect(currentCharacter().features.at(-1)).toMatchObject({
      name: 'Lucky',
      source: 'Custom',
      notes: 'Reroll',
    });

    const search = screen.getByRole('searchbox', { name: 'Search features' });
    fireEvent.change(search, { target: { value: 'fury' } });
    expect(screen.getByText('2 matching features.')).toBeInTheDocument();
    expect(screen.queryByText('No features match your search.')).toBeNull();
    fireEvent.change(search, { target: { value: 'zzz' } });
    expect(screen.getAllByText('No features match your search.')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove Lucky' }));
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(currentCharacter().features.some((f) => f.name === 'Lucky')).toBe(true);
  });

  it('shows the synchronization note for active characters', () => {
    const character = createCharacter('Hero');
    character.features = [
      {
        id: 'auto-feature-0',
        name: 'Rage',
        source: 'Barbarian 1',
        notes: '',
        auto: true,
      },
    ];
    mount(character, '/character/x?tab=features');
    expect(screen.getByText(/These entries update/)).toBeInTheDocument();
  });

  it('manages spellcasting, slots, concentration and spells', async () => {
    const character = createCharacter('Hero');
    character.spells = [
      {
        id: 'auto-spell-light',
        name: 'Granted light',
        level: 0,
        prepared: true,
        auto: true,
      },
      {
        id: 'auto-spell-bless',
        name: 'Bless',
        level: 1,
        prepared: true,
        auto: true,
        source: 'Cleric',
        spellId: 'bless',
        concentration: true,
      },
    ];
    mount(character, '/character/x?tab=spells');
    expect(
      screen.getByText('No spell slots configured yet. Use Edit slots to add them.'),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Spellcasting Ability' }), {
      target: { value: 'wis' },
    });
    expect(currentCharacter().spellcastingAbility).toBe('wis');
    expect(screen.getByText('Granted by')).toBeInTheDocument();
    expect(screen.getByText('Spell Save DC').nextSibling).toHaveTextContent('10');
    expect(screen.getByText('Granted by Cleric')).toBeInTheDocument();
    expect(screen.getByText('Level 1', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Cantrips', { selector: 'span' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Concentrating on Bless' }));
    expect(currentCharacter().concentration).toBe('Bless');
    fireEvent.click(screen.getByRole('button', { name: 'Concentrating on Bless' }));
    expect(currentCharacter().concentration).toBe('');
    expect(
      screen.getByRole('link', { name: 'Open Bless in the compendium' }),
    ).toHaveAttribute('href', '/compendium/spells/bless/');

    fireEvent.click(screen.getByRole('button', { name: 'Edit slots' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Level 1 long rest slots' }), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Level 1 short rest slots' }), {
      target: { value: '1' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.getByText('3 of 3')).toBeInTheDocument();
    const spend = screen.getByRole('button', { name: 'Spend a level 1 slot' });
    const recover = screen.getByRole('button', { name: 'Recover a level 1 slot' });
    expect(recover).toBeDisabled();
    fireEvent.click(spend);
    fireEvent.click(spend);
    fireEvent.click(spend);
    expect(currentCharacter().spellSlots[0]).toMatchObject({
      usedLongRest: 2,
      usedShortRest: 1,
    });
    expect(spend).toBeDisabled();
    fireEvent.click(recover);
    fireEvent.click(recover);
    expect(currentCharacter().spellSlots[0]).toMatchObject({
      usedLongRest: 1,
      usedShortRest: 0,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Edit slots' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Level 1 long rest slots' }), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Level 1 short rest slots' }), {
      target: { value: '0' },
    });
    expect(currentCharacter().spellSlots[0]).toMatchObject({
      usedLongRest: 0,
      usedShortRest: 0,
    });
    await act(async () => fireEvent.keyDown(document.activeElement!, { key: 'Escape' }));

    fireEvent.click(
      screen.getByRole('button', { name: 'Add a spell from the compendium...' }),
    );
    expect(currentCharacter().spells.at(-1)).toMatchObject({
      name: 'Shield',
      level: 1,
      spellId: 'shield',
      prepared: false,
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Add a spell from the compendium... extra' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add spell' }));
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Spell name' }).at(-1)!, {
      target: { value: 'Custom' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Level of Custom' }), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getAllByRole('checkbox', { name: 'Prepared' })[0]!);
    fireEvent.click(screen.getByRole('button', { name: 'Prepared (3)' }));
    expect(screen.queryByText('Light')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'All (5)' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Spellcasting Ability' }), {
      target: { value: '' },
    });
    expect(currentCharacter().spellcastingAbility).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Custom' }));
    expect(screen.getByText('Custom removed.')).toBeInTheDocument();
  });

  it('explains empty spell lists', () => {
    mount(createCharacter('Hero'), '/character/x?tab=spells');
    expect(screen.getByText('No spells yet.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Prepared (0)' }));
    expect(screen.getByText('No prepared spells.')).toBeInTheDocument();
    expect(useDialogStore.getState().request).toBeNull();
  });
});
