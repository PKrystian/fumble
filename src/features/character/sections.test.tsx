import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRollStore } from '@/features/dice/rollStore';
import { useSessionStore } from '@/features/session-log/store';
import { createCharacter, setSpellSlot, type Character } from './model';
import {
  AbilityScoresPanel,
  CombatPanel,
  IdentityHeader,
  PassivesPanel,
  ProficienciesPanel,
  SavingThrowsPanel,
  SessionLogQuickPanel,
  SkillsPanel,
  SpellcastingPanel,
  TrackingPanel,
} from './sections';
import { useSheetRollMode } from './rolls';
import { SheetHarness } from './sheetTestHarness';
import { currentCharacter } from './sheetTestState';

vi.mock('@/features/compendium/categories', () => ({
  getCategory: (id: string) => ({ id }),
}));

vi.mock('@/features/compendium/useCategoryItems', () => ({
  useCategoryItems: () => ({
    items: [
      { id: 'wizard', name: 'Wizard', hidden: false },
      { id: 'barbarian', name: 'Barbarian', hidden: false },
      { id: 'hidden', name: 'Hidden', hidden: true },
    ],
  }),
}));

vi.mock('./compendiumSync', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./compendiumSync')>();
  const cls = {
    id: 'wizard',
    name: 'Wizard',
    source: 'XPHB',
    srd: false,
    subclassTitle: 'Tradition',
    subclasses: [
      { name: 'Evoker', source: 'PHB', features: [] },
      { name: 'Evoker', source: 'XPHB', features: [] },
      { name: 'Evoker', source: 'PHB', features: [] },
      { name: 'Illusionist', source: 'XPHB', features: [] },
    ],
  };
  return {
    ...actual,
    useClassEntry: (id: string) => (id === 'wizard' ? cls : undefined),
  };
});

vi.mock('./CompendiumPicker', () => ({
  CompendiumSelectField: ({
    label,
    onChange,
  }: {
    label: string;
    onChange: (value: string) => void;
  }) => (
    <button type="button" onClick={() => onChange(`picked-${label}`)}>
      {label}
    </button>
  ),
}));

vi.mock('@/features/ui/ImageCropperModal', () => ({
  ImageCropperModal: ({
    onSave,
    onCancel,
  }: {
    onSave: (value: string) => void;
    onCancel: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onSave('data:image/jpeg;base64,x')}>
        save crop
      </button>
      <button type="button" onClick={onCancel}>
        cancel crop
      </button>
    </div>
  ),
}));

function mount(
  component: Parameters<typeof SheetHarness>[0]['component'],
  initial?: Character,
  computed: Partial<Character> | null = null,
) {
  return render(
    <SheetHarness
      initial={initial ?? createCharacter('Hero')}
      component={component}
      computed={computed}
    />,
  );
}

function setWide(wide: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: wide,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

describe('character sheet sections', () => {
  beforeEach(() => {
    useRollStore.setState({ log: [], dockOpen: false, error: null });
    useSheetRollMode.setState({ mode: 'normal' });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('edits identity, class, subclass, level and portrait', () => {
    mount(IdentityHeader);
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Mira' },
    });
    const classSelect = screen.getByRole('combobox', { name: 'Class' });
    expect(within(classSelect).queryByText('Hidden')).toBeNull();
    fireEvent.change(classSelect, { target: { value: 'wizard' } });
    const subclass = screen.getByRole('combobox', { name: 'Tradition' });
    expect(within(subclass).getAllByRole('option')).toHaveLength(3);
    fireEvent.change(subclass, { target: { value: 'Evoker|XPHB' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Level' }), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Species' }));
    fireEvent.click(screen.getByRole('button', { name: 'Background' }));
    expect(currentCharacter()).toMatchObject({
      name: 'Mira',
      className: 'wizard',
      subclass: 'Evoker|XPHB',
      level: 5,
      species: 'picked-Species',
      background: 'picked-Background',
    });

    const file = new File(['x'], 'portrait.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.click(screen.getByRole('button', { name: 'Add portrait' }));
    fireEvent.change(input, { target: { files: [] } });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText('cancel crop'));
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByText('save crop'));
    expect(currentCharacter().portrait).toBe('data:image/jpeg;base64,x');
    expect(screen.getByRole('button', { name: 'Change portrait' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove portrait' }));
    expect(currentCharacter().portrait).toBe('');
  });

  it('collapses identity details on narrow screens once a class is set', () => {
    setWide(false);
    const character = { ...createCharacter('Hero'), className: 'wizard' };
    mount(IdentityHeader, character);
    const open = screen.getByRole('button', {
      name: 'Name, class, species, and background',
    });
    expect(open).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(open);
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Name, class, species, and background' }),
    );
    expect(screen.queryByRole('textbox', { name: 'Name' })).toBeNull();
  });

  it('edits ability scores and rolls checks and saves through the shared dock', () => {
    mount((props) => (
      <>
        <AbilityScoresPanel {...props} />
        <SavingThrowsPanel {...props} />
      </>
    ));
    fireEvent.change(screen.getByRole('textbox', { name: 'Strength score' }), {
      target: { value: '16' },
    });
    expect(currentCharacter().abilities.str).toBe(16);
    act(() => useSheetRollMode.setState({ mode: 'advantage' }));
    fireEvent.click(screen.getByRole('button', { name: 'Roll Strength check +3' }));
    const entry = useRollStore.getState().log[0]!;
    expect(entry.label).toBe('Hero: Strength check');
    expect(entry.outcome.mode).toBe('advantage');
    expect(entry.outcome.expression).toBe('1d20 + 3');

    fireEvent.click(screen.getByRole('checkbox', { name: /Dexterity/ }));
    expect(currentCharacter().savingThrowProficiencies).toEqual(['dex']);
    fireEvent.click(screen.getByRole('button', { name: 'Roll Dexterity save +2' }));
    expect(useRollStore.getState().log[0]!.label).toBe('Hero: Dexterity save');
    fireEvent.click(screen.getByRole('checkbox', { name: /Dexterity/ }));
    expect(currentCharacter().savingThrowProficiencies).toEqual([]);
  });

  it('marks synchronized saving throws as manual and restores them', () => {
    const computed = { savingThrowProficiencies: ['str', 'con'] } as Partial<Character>;
    mount(SavingThrowsPanel, createCharacter('Hero'), computed);
    fireEvent.click(screen.getByRole('checkbox', { name: /Wisdom/ }));
    expect(currentCharacter().manualFields).toEqual(['savingThrows']);
    fireEvent.click(
      screen.getByRole('button', { name: 'Restore saving throws from class' }),
    );
    expect(currentCharacter()).toMatchObject({
      manualFields: [],
      savingThrowProficiencies: ['str', 'con'],
    });
  });

  it('cycles skill proficiency and rolls skills', () => {
    const character = createCharacter('');
    mount(SkillsPanel, character);
    const button = screen.getByRole('button', {
      name: 'Arcana proficiency: Not proficient',
    });
    fireEvent.click(button);
    expect(currentCharacter().skillProficiencies).toEqual(['arcana']);
    fireEvent.click(
      screen.getByRole('button', { name: 'Arcana proficiency: Proficient' }),
    );
    expect(currentCharacter().skillExpertise).toEqual(['arcana']);
    expect(
      screen.getByRole('button', { name: 'Arcana proficiency: Expertise' }),
    ).toHaveTextContent('E');
    fireEvent.click(
      screen.getByRole('button', { name: 'Arcana proficiency: Expertise' }),
    );
    expect(currentCharacter()).toMatchObject({
      skillProficiencies: [],
      skillExpertise: [],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Roll Stealth +0' }));
    expect(useRollStore.getState().log[0]!.label).toBe('Unnamed: Stealth');
    expect(useRollStore.getState().log[0]!.outcome.expression).toBe('1d20');
  });

  it('edits combat values, speeds and armor class overrides', () => {
    const computed = {
      speed: { walk: 25, swim: 0, climb: 0, fly: 0 },
    } as Partial<Character>;
    const fighter = createCharacter('Hero');
    fighter.abilities.dex = 14;
    mount(CombatPanel, fighter, computed);
    fireEvent.change(screen.getByRole('textbox', { name: 'Walk' }), {
      target: { value: '35' },
    });
    expect(currentCharacter()).toMatchObject({
      speed: { walk: 35 },
      manualFields: ['speed'],
    });
    fireEvent.click(screen.getByRole('button', { name: 'Restore speed from species' }));
    expect(currentCharacter().speed.walk).toBe(25);
    fireEvent.change(screen.getByRole('textbox', { name: 'Swim' }), {
      target: { value: '10' },
    });
    expect(currentCharacter().speed.swim).toBe(10);

    const ac = screen.getByRole('textbox', { name: 'Armor Class' });
    expect(ac).toHaveAccessibleDescription('Base 10 + DEX +2');
    fireEvent.change(ac, { target: { value: '17' } });
    expect(currentCharacter().acOverride).toBe(17);
    expect(ac).toHaveAccessibleDescription('Set manually');
    fireEvent.click(screen.getByRole('button', { name: 'Use calculated value' }));
    expect(currentCharacter().acOverride).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Roll Initiative +2' }));
    expect(useRollStore.getState().log[0]!.label).toBe('Hero: Initiative');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Heroic Inspiration' }));
    expect(currentCharacter().inspiration).toBe(true);
  });

  it('shows passives, proficiencies, tracking and spellcasting summaries', () => {
    const character = createCharacter('Hero');
    character.spellcastingAbility = 'int';
    character.abilities.int = 16;
    character.spellSlots = setSpellSlot([], 1, { longRestMax: 2, usedLongRest: 1 });
    const computed = { toolProficiencies: 'Smith' } as Partial<Character>;
    mount(
      (props) => (
        <>
          <PassivesPanel character={props.character} />
          <ProficienciesPanel {...props} />
          <TrackingPanel {...props} />
          <SpellcastingPanel character={props.character} />
        </>
      ),
      character,
      computed,
    );
    expect(screen.getByText('Investigation').nextSibling).toHaveTextContent('13');
    expect(screen.getByText('Save DC').nextSibling).toHaveTextContent('13');
    expect(screen.getByText('1 of 2')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Tools' }), {
      target: { value: 'Thieves tools' },
    });
    expect(currentCharacter().manualFields).toEqual(['toolProficiencies']);
    fireEvent.click(
      screen.getByRole('button', { name: 'Restore tools from class and background' }),
    );
    expect(currentCharacter().toolProficiencies).toBe('Smith');
    for (const [name, value] of [
      ['Armor', 'Light'],
      ['Weapons', 'Simple'],
      ['Languages', 'Common'],
      ['Concentration', 'Bless'],
      ['Active Conditions', 'Poisoned'],
      ['Resistances / Immunities', 'Fire'],
    ]) {
      fireEvent.change(screen.getByRole('textbox', { name: name! }), {
        target: { value },
      });
    }
    expect(currentCharacter()).toMatchObject({
      armorProficiencies: 'Light',
      weaponProficiencies: 'Simple',
      languages: 'Common',
      concentration: 'Bless',
      conditions: 'Poisoned',
      defenses: 'Fire',
    });
  });

  it('explains missing spellcasting and empty slots', () => {
    const { rerender } = render(
      <MemoryRouter>
        <SpellcastingPanel character={createCharacter('Hero')} />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Not a spellcaster/)).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <SpellcastingPanel
          character={{ ...createCharacter('Hero'), spellcastingAbility: 'wis' }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('No spell slots configured.')).toBeInTheDocument();
  });

  it('adds quick notes to the selected session or a new one', () => {
    useSessionStore.setState({ sessions: [], selectedSessionId: null });
    mount(() => <SessionLogQuickPanel />);
    const input = screen.getByRole('textbox', { name: 'Note for a new session' });
    const add = screen.getByRole('button', { name: 'Add note to session log' });
    expect(add).toBeDisabled();
    fireEvent.change(input, { target: { value: '  Found a key  ' } });
    fireEvent.click(add);
    expect(screen.getByText('Note added to a new session.')).toBeInTheDocument();
    const [session] = useSessionStore.getState().sessions;
    expect(session!.notes).toContain('Found a key');

    useSessionStore.getState().addSession('Second');
    useSessionStore.getState().selectSession(session!.id);
    fireEvent.change(screen.getByRole('textbox', { name: 'Note for Untitled session' }), {
      target: { value: 'More' },
    });
    fireEvent.submit(
      screen.getByRole('textbox', { name: 'Note for Untitled session' }).closest('form')!,
    );
    expect(screen.getByText('Note added to Untitled session.')).toBeInTheDocument();
    expect(
      useSessionStore.getState().sessions.find((s) => s.id === session!.id)!.notes,
    ).toContain('More');
    fireEvent.submit(
      screen.getByRole('textbox', { name: 'Note for Untitled session' }).closest('form')!,
    );
    expect(
      screen.getByRole('link', { name: 'Open full session log' }),
    ).toBeInTheDocument();
  });
});
