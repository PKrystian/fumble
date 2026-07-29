import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import type { ClassEntry } from '@/data/compendium/types';
import * as normalize from '@/data/transform/normalize';
import { useHomebrewStore } from '@/features/homebrew/store';
import {
  ActionDetail,
  BackgroundDetail,
  BoonDetail,
  CharOptionDetail,
  ClassDetail,
  ConditionDetail,
  CultBoonDetail,
  DeckDetail,
  DeityDetail,
  FacilityDetail,
  FeatDetail,
  HazardDetail,
  ItemDetail,
  LanguageDetail,
  MasteryDetail,
  MonsterDetail,
  ObjectDetail,
  OptionalFeatureDetail,
  RecipeDetail,
  RuleDetail,
  SenseDetail,
  SkillDetail,
  SpeciesDetail,
  SpellDetail,
  TableDetail,
  VehicleDetail,
} from './details';

const base = {
  name: 'Test Entry',
  source: 'XPHB',
  entries: ['A useful description.'],
};

const show = (node: React.ReactNode) => render(<MemoryRouter>{node}</MemoryRouter>);

describe('compendium detail renderers', () => {
  afterEach(() => {
    cleanup();
    useHomebrewStore.setState({ entries: [] });
  });

  it('renders every standard normalized entry type', () => {
    const nodes = [
      <SpellDetail
        spell={normalize.normalizeSpell({ ...base, level: 1, school: 'A' })}
      />,
      <SpeciesDetail species={normalize.normalizeSpecies(base)} />,
      <FeatDetail feat={normalize.normalizeFeat(base)} />,
      <BackgroundDetail background={normalize.normalizeBackground(base)} />,
      <RuleDetail rule={normalize.normalizeRule(base)} />,
      <ActionDetail action={normalize.normalizeAction(base)} />,
      <OptionalFeatureDetail feature={normalize.normalizeOptionalFeature(base)} />,
      <DeityDetail deity={normalize.normalizeDeity(base)} />,
      <HazardDetail hazard={normalize.normalizeHazard(base, 'Hazard')} />,
      <BoonDetail boon={normalize.normalizeBoon(base)} />,
      <ItemDetail item={normalize.normalizeItem(base)} />,
      <MonsterDetail monster={normalize.normalizeMonster(base)} />,
      <ConditionDetail condition={normalize.normalizeCondition(base, 'condition')} />,
      <SkillDetail skill={normalize.normalizeSkill(base)} />,
      <SenseDetail sense={normalize.normalizeSense(base)} />,
      <LanguageDetail language={normalize.normalizeLanguage(base)} />,
      <CultBoonDetail cultBoon={normalize.normalizeCultBoon(base, 'Cult')} />,
      <FacilityDetail facility={normalize.normalizeFacility(base)} />,
      <RecipeDetail recipe={normalize.normalizeRecipe(base)} />,
      <ObjectDetail object={normalize.normalizeObject(base)} />,
      <VehicleDetail vehicle={normalize.normalizeVehicle(base)} />,
      <MasteryDetail mastery={normalize.normalizeMastery(base)} />,
      <CharOptionDetail option={normalize.normalizeCharOption(base)} />,
      <TableDetail table={normalize.normalizeTable(base)} />,
      <DeckDetail deck={normalize.normalizeDeck(base)} />,
    ];

    for (const node of nodes) {
      const view = show(node);
      expect(screen.getByRole('heading', { name: 'Test Entry' })).toBeVisible();
      view.unmount();
    }
  });

  it('renders populated monster, item, table and vehicle fields', () => {
    const monster = normalize.normalizeMonster({
      ...base,
      size: ['L'],
      type: 'dragon',
      alignment: ['C', 'E'],
      ac: [18],
      hp: { average: 100, formula: '10d12+30' },
      speed: { walk: 40, fly: 80 },
      str: 20,
      dex: 14,
      con: 17,
      int: 16,
      wis: 15,
      cha: 18,
      cr: '10',
      save: { str: '+9', dex: '-1' },
      skill: { perception: '+7', stealth: '-2' },
      vulnerable: ['cold'],
      resist: ['fire'],
      immune: ['poison'],
      conditionImmune: ['poisoned'],
      senses: ['darkvision 120 ft.'],
      passive: 17,
      languages: ['Common', 'Draconic', 'telepathy 120 ft.'],
      environment: ['mountain'],
      treasure: ['arcana'],
      trait: [{ name: 'Keen Senses', entries: ['The dragon is alert.'] }],
      action: [{ name: 'Bite', entries: ['Melee attack.'] }],
      bonus: [{ entries: ['A bonus action.'] }],
      reaction: [{ name: 'Parry', entries: ['Raise its defense.'] }],
      legendary: [
        { name: 'Wing Attack', entries: ['The dragon beats its wings.'] },
        { entries: ['The dragon moves.'] },
      ],
      legendaryActions: 4,
      legendaryActionsLair: 2,
    });
    const monsterView = show(<MonsterDetail monster={monster} />);
    expect(monsterView.container).toHaveTextContent('Keen Senses');
    expect(monsterView.container).toHaveTextContent('Bite');
    monsterView.unmount();

    const itemView = show(
      <ItemDetail
        item={normalize.normalizeItem({
          ...base,
          type: 'HA',
          rarity: 'rare',
          reqAttune: true,
          weight: 20,
          value: 150,
          dmg1: '1d8',
          dmgType: 'S',
          property: ['F'],
        })}
      />,
    );
    expect(itemView.container).toHaveTextContent('Heavy Armor');
    expect(itemView.container).toHaveTextContent('Requires attunement');
    itemView.unmount();

    const tableView = show(
      <TableDetail
        table={normalize.normalizeTable({
          ...base,
          caption: 'Results',
          colLabels: ['Roll', 'Outcome'],
          rows: [['1', 'Success']],
        })}
      />,
    );
    expect(tableView.container).toHaveTextContent('Success');
    tableView.unmount();

    const vehicleView = show(
      <VehicleDetail
        vehicle={normalize.normalizeVehicle({
          ...base,
          vehicleType: 'SHIP',
          size: 'L',
          capCrew: 4,
          capPassenger: 10,
          hull: { ac: 15, hp: 100 },
          weapon: [{ name: 'Ballista', entries: ['Ranged attack.'] }],
        })}
      />,
    );
    expect(vehicleView.container).toHaveTextContent('Ballista');
  });

  it('renders alternate spell, species, action, monster, skill and table fields', () => {
    const spell = normalize.normalizeSpell({ ...base, level: 0, school: 'A' });
    Object.assign(spell, {
      ritual: true,
      entriesHigherLevel: ['At higher levels.'],
      classes: ['Wizard'],
      subclasses: ['Evoker'],
    });
    const spellView = show(<SpellDetail spell={spell} />);
    expect(spellView.container).toHaveTextContent('At higher levels.');
    spellView.unmount();

    const species = normalize.normalizeSpecies(base);
    species.parentRace = 'Elf';
    const speciesView = show(<SpeciesDetail species={species} />);
    expect(speciesView.container).toHaveTextContent('Elf');
    speciesView.unmount();

    const action = normalize.normalizeAction(base);
    action.time = 'Reaction';
    const actionView = show(<ActionDetail action={action} />);
    expect(actionView.container).toHaveTextContent('Reaction');
    actionView.unmount();

    const monster = normalize.normalizeMonster({
      ...base,
      cr: '1',
      int: 8,
      languages: ['Common'],
    });
    monster.crDisplay = '';
    monster.languages = 'Common; telepathy 60 ft.';
    monster.lairActions = ['Lair effect.'];
    monster.regionalEffects = ['Regional effect.'];
    const monsterView = show(<MonsterDetail monster={monster} />);
    expect(monsterView.container).toHaveTextContent('telepathy 60 ft.');
    expect(monsterView.container).toHaveTextContent('Lair effect.');
    expect(monsterView.container).toHaveTextContent('Regional effect.');
    monsterView.unmount();

    const skill = normalize.normalizeSkill({ ...base, ability: 'Dexterity' });
    const skillView = show(<SkillDetail skill={skill} />);
    expect(skillView.container).toHaveTextContent('Dexterity');
    skillView.unmount();

    const table = normalize.normalizeTable(base);
    table.rows = [[{ type: 'item', entry: 'Structured cell' }]];
    const tableView = show(<TableDetail table={table} />);
    expect(tableView.container).not.toHaveTextContent('Structured cell');
    tableView.unmount();

    const objectView = show(
      <ObjectDetail object={normalize.normalizeObject({ ...base, str: 8 })} />,
    );
    expect(objectView.container).toHaveTextContent('-1');
  });

  it('switches, selects and merges class subclasses', () => {
    useHomebrewStore.getState().addImportedSubclasses([
      {
        className: 'Wizard',
        subclass: {
          name: 'Chronomancer',
          source: 'TIME',
          features: [{ level: 2, name: 'Time Step', entries: ['Shift time.'] }],
        },
      },
      {
        className: 'Paladin',
        subclass: {
          name: 'Oath',
          source: 'HB',
          features: [],
        },
      },
    ]);
    const cls: ClassEntry = {
      id: 'wizard',
      name: 'Wizard',
      source: 'XPHB',
      srd: false,
      hitDie: 'd6',
      primaryAbility: 'Intelligence',
      savingThrows: 'Intelligence, Wisdom',
      proficiencies: 'Daggers',
      armorProficiencies: '',
      weaponProficiencies: 'Daggers',
      toolProficiencies: '',
      subclassTitle: 'Arcane Tradition',
      table: {
        headers: ['Level', 'Features'],
        rows: [
          ['1', 'Spellcasting'],
          ['2', 'Subclass'],
        ],
      },
      features: [
        { level: 1, name: 'Spellcasting', entries: ['Cast spells.'] },
        { level: 2, name: 'Class Feature', entries: ['Learn more.'] },
      ],
      subclasses: [
        {
          name: 'Evoker',
          source: 'XPHB',
          features: [{ level: 2, name: 'Sculpt Spells', entries: ['Shape magic.'] }],
        },
        {
          name: 'Evoker',
          source: 'PHB',
          features: [{ level: 2, name: 'Old Evoker', entries: ['Legacy magic.'] }],
        },
        {
          name: 'Illusionist',
          source: 'XPHB',
          features: [{ level: 2, name: 'Illusions', entries: ['Create images.'] }],
        },
        {
          name: 'Legacy',
          source: 'UA',
          features: [],
        },
        {
          name: 'Legacy',
          source: 'PHB',
          features: [],
        },
      ],
    };
    const view = show(<ClassDetail cls={cls} />);
    expect(view.container).toHaveTextContent('Spellcasting');

    fireEvent.click(screen.getByRole('button', { name: "Evoker (PHB'24)" }));
    expect(view.container).toHaveTextContent('Sculpt Spells');
    fireEvent.click(screen.getByRole('button', { name: "Evoker (PHB'24)" }));
    fireEvent.click(screen.getByRole('button', { name: "Evoker (PHB'24)" }));

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'all' } });
    expect(screen.getByRole('button', { name: "Evoker (PHB'14)" })).toBeVisible();
    fireEvent.change(select, { target: { value: 'recent' } });

    fireEvent.click(
      screen.getByRole('button', { name: 'Select all visible subclasses' }),
    );
    expect(view.container).toHaveTextContent('Illusions');
    fireEvent.click(
      screen.getByRole('button', { name: 'Select all visible subclasses' }),
    );
    fireEvent.change(select, { target: { value: 'homebrew' } });
    expect(screen.getByRole('button', { name: /Chronomancer/ })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Pick a random subclass' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset selection' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle source labels' }));
    expect(screen.getByRole('button', { name: 'Evoker' })).toBeVisible();

    view.unmount();
    show(
      <ClassDetail
        cls={{
          ...cls,
          primaryAbility: '',
          savingThrows: '',
          subclasses: [],
        }}
      />,
    );
    expect(screen.getAllByText('-')).toHaveLength(2);
  });
});
