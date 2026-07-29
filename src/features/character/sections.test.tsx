import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from '@/features/session-log/store';
import { createCharacter, setSpellSlot, type Character } from './model';
import {
  AbilityScoresPanel,
  CombatPanel,
  HitPointsPanel,
  IdentityHeader,
  PassivesPanel,
  ProficienciesPanel,
  SavingThrowsPanel,
  SessionLogQuickPanel,
  SkillsPanel,
  SpellcastingPanel,
  TrackingPanel,
} from './sections';

vi.mock('@/i18n/useT', () => ({
  useT: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${Object.values(values).join(' ')}` : key,
  }),
}));

vi.mock('@/features/compendium/categories', () => ({
  getCategory: (id: string) => ({ id }),
}));

vi.mock('@/features/compendium/useCategoryItems', () => ({
  useCategoryItems: () => ({
    items: [
      { id: 'wizard', name: 'Wizard', hidden: false },
      { id: 'fighter', name: 'Fighter', hidden: false },
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
  CompendiumSelectModalField: ({
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
    <>
      <button type="button" onClick={() => onSave('data:image/png;base64,test')}>
        save-crop
      </button>
      <button type="button" onClick={onCancel}>
        cancel-crop
      </button>
    </>
  ),
}));

function Harness({
  initial,
  children,
}: {
  initial: Character;
  children: (
    character: Character,
    update: (patch: Partial<Character>) => void,
  ) => React.ReactNode;
}) {
  const [character, setCharacter] = useState(initial);
  const update = (patch: Partial<Character>) =>
    setCharacter((current) => ({ ...current, ...patch }));
  return (
    <>
      <span data-testid="state">{JSON.stringify(character)}</span>
      {children(character, update)}
    </>
  );
}

function state(): Character {
  return JSON.parse(screen.getByTestId('state').textContent ?? '') as Character;
}

describe('character sheet sections', () => {
  beforeEach(() => useSessionStore.setState({ sessions: [] }));

  it('renders identity fields without a selected class', () => {
    render(
      <Harness initial={createCharacter('Hero')}>
        {(character, update) => <IdentityHeader character={character} update={update} />}
      </Harness>,
    );

    expect(screen.getByText('character.sheet.fields.subclass')).toBeInTheDocument();
    expect(screen.getAllByRole('combobox')[1]).toBeDisabled();
  });

  it('edits identity selections and portrait', () => {
    const character = createCharacter('Hero');
    character.className = 'wizard';
    render(
      <Harness initial={character}>
        {(current, update) => <IdentityHeader character={current} update={update} />}
      </Harness>,
    );

    fireEvent.change(screen.getByLabelText('character.sheet.fields.name'), {
      target: { value: 'Merlin' },
    });
    fireEvent.change(screen.getByDisplayValue('Wizard'), {
      target: { value: 'wizard' },
    });
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1]!, { target: { value: 'Evoker|XPHB' } });
    fireEvent.change(screen.getByLabelText('character.sheet.fields.level'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByText('character.sheet.fields.species'));
    fireEvent.click(screen.getByText('character.sheet.fields.background'));
    expect(state()).toMatchObject({
      name: 'Merlin',
      className: 'wizard',
      subclass: 'Evoker|XPHB',
      level: 5,
      species: 'picked-character.sheet.fields.species',
      background: 'picked-character.sheet.fields.background',
    });

    fireEvent.click(screen.getByLabelText('character.sheet.addPortrait'));
    const file = new File(['portrait'], 'portrait.png', { type: 'image/png' });
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [] },
    });
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByText('cancel-crop'));
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByText('save-crop'));
    expect(state().portrait).toBe('data:image/png;base64,test');
    fireEvent.click(screen.getByLabelText('character.sheet.removePortrait'));
    expect(state().portrait).toBe('');
  });

  it('updates abilities, saving throws and skill proficiency levels', () => {
    render(
      <Harness initial={createCharacter('Hero')}>
        {(character, update) => (
          <>
            <AbilityScoresPanel character={character} update={update} />
            <SavingThrowsPanel character={character} update={update} />
            <SkillsPanel character={character} update={update} />
          </>
        )}
      </Harness>,
    );

    fireEvent.change(screen.getByLabelText('character.sheet.abilities.str'), {
      target: { value: '16' },
    });
    expect(state().abilities.str).toBe(16);
    fireEvent.change(screen.getByLabelText('character.sheet.abilities.str'), {
      target: { value: '' },
    });
    expect(state().abilities.str).toBe(0);

    const savingThrow = screen.getByLabelText(
      'character.sheet.skillsPanel.savingThrowProficiencyAria character.sheet.abilities.str',
    );
    fireEvent.click(savingThrow);
    expect(state().savingThrowProficiencies).toEqual(['str']);
    fireEvent.click(savingThrow);
    expect(state().savingThrowProficiencies).toEqual([]);

    const skill = screen.getByLabelText(
      'character.sheet.skillsPanel.proficiencyAria character.sheet.skillNames.acrobatics',
    );
    fireEvent.click(skill);
    expect(state().skillProficiencies).toContain('acrobatics');
    fireEvent.click(skill);
    expect(state().skillExpertise).toContain('acrobatics');
    fireEvent.click(skill);
    expect(state().skillExpertise).not.toContain('acrobatics');
  });

  it('updates combat values and toggles automatic armor class', () => {
    const character = createCharacter('Fighter');
    character.abilities.dex = 12;
    render(
      <Harness initial={character}>
        {(character, update) => <CombatPanel character={character} update={update} />}
      </Harness>,
    );

    fireEvent.change(screen.getByLabelText('character.sheet.combat.walk'), {
      target: { value: '35' },
    });
    fireEvent.change(screen.getByLabelText('character.sheet.combat.swim'), {
      target: { value: '20' },
    });
    fireEvent.change(screen.getByLabelText('character.sheet.combat.climb'), {
      target: { value: '15' },
    });
    fireEvent.change(screen.getByLabelText('character.sheet.combat.fly'), {
      target: { value: '60' },
    });
    fireEvent.click(screen.getByText('character.sheet.combat.heroicInspiration'));
    expect(state()).toMatchObject({
      speed: { walk: 35, swim: 20, climb: 15, fly: 60 },
      inspiration: true,
    });

    fireEvent.click(screen.getByTitle(/character\.sheet\.acBase/));
    expect(state().acOverride).toBe(11);
    fireEvent.click(screen.getByTitle('character.sheet.fields.acAuto'));
    expect(state().acOverride).toBeNull();
    fireEvent.change(screen.getAllByRole('spinbutton')[0]!, {
      target: { value: '16' },
    });
    expect(state().acOverride).toBe(16);
  });

  it('applies healing and damage through temporary hit points', () => {
    const character = createCharacter('Tank');
    character.hp = { current: 5, max: 12, temp: 3 };
    render(
      <Harness initial={character}>
        {(current, update) => <HitPointsPanel character={current} update={update} />}
      </Harness>,
    );

    fireEvent.change(screen.getByLabelText('character.sheet.hpFields.current'), {
      target: { value: '6' },
    });
    fireEvent.change(screen.getByLabelText('character.sheet.hpFields.max'), {
      target: { value: '14' },
    });
    fireEvent.change(screen.getByLabelText('character.sheet.hpFields.temp'), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText('character.sheet.hpFields.amount'), {
      target: { value: '5' },
    });
    fireEvent.click(screen.getByText('character.sheet.hpFields.heal'));
    expect(state().hp.current).toBe(11);
    fireEvent.click(screen.getByText('character.sheet.hpFields.damage'));
    expect(state().hp).toMatchObject({ current: 10, temp: 0 });

    fireEvent.change(screen.getByLabelText('character.sheet.hpFields.amount'), {
      target: { value: '20' },
    });
    fireEvent.click(screen.getByText('character.sheet.hpFields.heal'));
    expect(state().hp.current).toBe(14);
  });

  it('edits proficiencies and tracking fields and renders passive scores', () => {
    render(
      <Harness initial={createCharacter('Scout')}>
        {(character, update) => (
          <>
            <PassivesPanel character={character} />
            <ProficienciesPanel character={character} update={update} />
            <TrackingPanel character={character} update={update} />
          </>
        )}
      </Harness>,
    );

    fireEvent.change(screen.getByLabelText('character.sheet.proficiencies.armor'), {
      target: { value: 'Light armor' },
    });
    fireEvent.change(screen.getByLabelText('character.sheet.proficiencies.weapons'), {
      target: { value: 'Simple weapons' },
    });
    fireEvent.change(screen.getByLabelText('character.sheet.proficiencies.tools'), {
      target: { value: 'Thieves tools' },
    });
    fireEvent.change(screen.getByLabelText('character.sheet.proficiencies.languages'), {
      target: { value: 'Common' },
    });
    fireEvent.change(screen.getByLabelText('character.sheet.tracking.concentration'), {
      target: { value: 'Bless' },
    });
    fireEvent.change(screen.getByLabelText('character.sheet.tracking.activeConditions'), {
      target: { value: 'Prone' },
    });
    fireEvent.change(
      screen.getByLabelText('character.sheet.tracking.resistancesImmunities'),
      { target: { value: 'Fire resistance' } },
    );
    expect(state()).toMatchObject({
      armorProficiencies: 'Light armor',
      weaponProficiencies: 'Simple weapons',
      toolProficiencies: 'Thieves tools',
      languages: 'Common',
      concentration: 'Bless',
      conditions: 'Prone',
      defenses: 'Fire resistance',
    });
    expect(screen.getByText('character.sheet.passives.perception')).toBeInTheDocument();
  });

  it('renders non-casters and configured spell slots', () => {
    const caster = createCharacter('Mage');
    caster.spellcastingAbility = 'int';
    caster.spellSlots = setSpellSlot([], 2, {
      longRestMax: 2,
      shortRestMax: 1,
      usedLongRest: 1,
      usedShortRest: 0,
    });
    const { rerender } = render(
      <SpellcastingPanel character={createCharacter('Commoner')} />,
    );
    expect(
      screen.getByText('character.sheet.spellcasting.notSpellcaster'),
    ).toBeInTheDocument();

    rerender(<SpellcastingPanel character={caster} />);
    expect(
      screen.getByText('character.sheet.spellcasting.spellLevelShort 2'),
    ).toBeInTheDocument();
    expect(screen.getByText('character.sheet.abilities.int')).toBeInTheDocument();

    caster.spellSlots = [];
    rerender(<SpellcastingPanel character={caster} />);
    expect(screen.getByText('character.sheet.spellcasting.noSlots')).toBeInTheDocument();
  });

  it('creates a session and appends quick notes', () => {
    render(
      <MemoryRouter>
        <SessionLogQuickPanel />
      </MemoryRouter>,
    );
    const input = screen.getByPlaceholderText('character.sheet.sessionQuick.placeholder');
    fireEvent.change(input, { target: { value: '  Found the key  ' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(useSessionStore.getState().sessions[0]?.notes).toBe('Found the key');
    expect(input).toHaveValue('');
    fireEvent.click(screen.getByLabelText('character.sheet.sessionQuick.addNote'));
    expect(useSessionStore.getState().sessions[0]?.notes).toBe('Found the key');
    expect(screen.getByText('character.sheet.sessionQuick.openFull')).toHaveAttribute(
      'href',
      '/session-log/',
    );
  });
});
