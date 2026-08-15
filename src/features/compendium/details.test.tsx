import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  SourceDataDetail,
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

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">
      {location.pathname}
      {location.search}
    </output>
  );
}

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
      <SourceDataDetail
        entry={{
          id: 'source-entry',
          name: 'Test Entry',
          source: 'TEST',
          srd: false,
          collection: 'test',
          data: { name: 'Test Entry', source: 'TEST', entries: ['Source text.'] },
          entries: ['Source text.'],
        }}
      />,
    ];

    for (const node of nodes) {
      const view = show(node);
      expect(screen.getByRole('heading', { name: 'Test Entry' })).toBeVisible();
      view.unmount();
    }
  });

  it('renders sparse detail metadata without optional values', () => {
    const sparse = { ...base, entries: [] };
    const nodes = [
      <SpellDetail
        spell={
          {
            ...sparse,
            level: 1,
            school: 'A',
            castingTime: undefined,
            range: undefined,
            components: undefined,
            duration: undefined,
            ritual: false,
            classes: [],
            subclasses: [],
          } as never
        }
      />,
      <SpeciesDetail
        species={
          {
            ...sparse,
            size: undefined,
            speed: undefined,
            creatureType: undefined,
            parentRace: undefined,
          } as never
        }
      />,
      <FeatDetail
        feat={{ ...sparse, category: undefined, prerequisite: undefined } as never}
      />,
      <BackgroundDetail
        background={
          {
            ...sparse,
            abilityScores: undefined,
            skills: undefined,
            tools: undefined,
            feat: 'Alert',
          } as never
        }
      />,
      <RuleDetail rule={{ ...sparse, ruleType: undefined } as never} />,
      <ActionDetail action={{ ...sparse, time: undefined } as never} />,
      <OptionalFeatureDetail
        feature={
          { ...sparse, featureType: undefined, prerequisite: 'General feat' } as never
        }
      />,
      <DeityDetail
        deity={
          {
            ...sparse,
            pantheon: undefined,
            alignment: undefined,
            domains: undefined,
            symbol: undefined,
          } as never
        }
      />,
      <HazardDetail hazard={{ ...sparse, hazardType: undefined } as never} />,
      <BoonDetail boon={{ ...sparse, boonType: undefined } as never} />,
      <ItemDetail
        item={
          {
            ...sparse,
            type: undefined,
            rarity: undefined,
            attunement: undefined,
            weight: undefined,
            value: undefined,
            damage: undefined,
            ac: undefined,
            properties: undefined,
          } as never
        }
      />,
      <MonsterDetail
        monster={
          {
            ...sparse,
            size: undefined,
            creatureType: undefined,
            alignment: undefined,
            ac: undefined,
            initiative: undefined,
            hp: '',
            speed: undefined,
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10,
            saves: undefined,
            skills: undefined,
            vulnerabilities: undefined,
            resistances: undefined,
            immunities: undefined,
            conditionImmunities: undefined,
            senses: undefined,
            languages: undefined,
            cr: '',
            crDisplay: '',
            habitat: undefined,
            treasure: undefined,
            traits: [],
            spellcasting: [],
            actions: [],
            bonusActions: [],
            reactions: [],
            legendaryActions: [],
            legendaryIntro: undefined,
            lairActions: [],
            regionalEffects: [],
          } as never
        }
      />,
      <ConditionDetail condition={{ ...sparse, kind: undefined } as never} />,
      <SkillDetail skill={{ ...sparse, ability: undefined } as never} />,
      <SenseDetail sense={sparse as never} />,
      <LanguageDetail
        language={
          {
            ...sparse,
            languageType: undefined,
            script: undefined,
            typicalSpeakers: undefined,
          } as never
        }
      />,
      <CultBoonDetail
        cultBoon={{ ...sparse, category: undefined, kind: undefined } as never}
      />,
      <FacilityDetail
        facility={
          {
            ...sparse,
            facilityType: undefined,
            level: undefined,
            prerequisite: undefined,
            space: undefined,
            orders: undefined,
          } as never
        }
      />,
      <RecipeDetail
        recipe={
          {
            ...sparse,
            recipeType: undefined,
            serves: undefined,
            diet: undefined,
          } as never
        }
      />,
      <ObjectDetail
        object={
          {
            ...sparse,
            size: undefined,
            objectType: undefined,
            ac: undefined,
            hp: undefined,
            str: 10,
            dex: 10,
            con: 10,
            int: 10,
            wis: 10,
            cha: 10,
            immune: undefined,
            senses: undefined,
            actions: [],
          } as never
        }
      />,
      <VehicleDetail
        vehicle={
          {
            ...sparse,
            vehicleType: undefined,
            size: undefined,
            dimensions: undefined,
            terrain: undefined,
            capacity: undefined,
            pace: undefined,
            speed: undefined,
            cost: undefined,
            ac: undefined,
            hp: undefined,
            immune: undefined,
            weapons: [],
          } as never
        }
      />,
      <CharOptionDetail
        option={
          { ...sparse, optionType: undefined, prerequisite: 'General feat' } as never
        }
      />,
    ];

    for (const node of nodes) {
      const view = show(node);
      expect(view.getByRole('heading', { name: 'Test Entry' })).toBeVisible();
      view.unmount();
    }

    const classView = show(
      <ClassDetail
        cls={{
          id: 'wizard',
          name: 'Wizard',
          source: 'XPHB',
          srd: true,
          hitDie: 'd6',
          primaryAbility: 'Intelligence',
          savingThrows: 'Intelligence, Wisdom',
          proficiencies: '',
          armorProficiencies: '',
          weaponProficiencies: '',
          toolProficiencies: '',
          subclassTitle: 'Arcane Tradition',
          table: { headers: ['Level'], rows: [['1']] },
          features: [],
          subclasses: [
            {
              id: 'lore',
              name: 'Lore',
              source: 'XPHB',
              features: [],
              lore: ['Lore text.'],
            },
          ],
        }}
        selectedSubclassId="lore"
      />,
    );
    expect(classView.container).toHaveTextContent('Lore text.');
    classView.unmount();
  });

  it('renders nested source loot tables as rollable tables', () => {
    const view = show(
      <SourceDataDetail
        entry={{
          id: 'ancient-dragon',
          name: 'Ancient',
          source: 'FTD',
          srd: false,
          collection: 'dragon',
          data: {
            name: 'Ancient',
            source: 'FTD',
            gems: {
              amount: '6d6',
              typeTable: [
                { min: 1, max: 50, type: 100 },
                { min: 51, max: 100, type: 500 },
              ],
            },
            magicItems: [
              {
                amount: '2d6',
                typeTable: [{ min: 1, max: 100, type: 'I' }],
              },
            ],
          },
          entries: [],
        }}
      />,
    );
    expect(view.getAllByRole('table')).toHaveLength(2);
    expect(view.getByText('6d6')).toBeVisible();
    expect(view.getByText('2d6')).toBeVisible();
    expect(view.getAllByText('Gemstones')).toHaveLength(2);
    view.unmount();
  });

  it('renders the supported source data value shapes', () => {
    const view = show(
      <SourceDataDetail
        entry={{
          id: 'source-shapes',
          name: 'Source Shapes',
          source: 'TEST',
          srd: false,
          collection: 'test',
          data: {
            camelCaseField: 'plain text',
            numberField: 3,
            booleanField: true,
            emptyField: null,
            entriesArray: [{ type: 'entries', entries: ['Structured entry.'] }],
            primitiveArray: ['text', 2, null, true],
            tableValue: {
              option: 'Clan',
              diceExpression: 'd100',
              table: [
                {
                  min: 0,
                  max: 0,
                  result: 'First',
                  item: ['Sword', 2, null, true],
                  coins: { cp: 1, gp: { min: 2, max: 3 } },
                  gems: { amount: '2d6', type: 50 },
                  artObjects: { amount: 2 },
                  magicItems: { item: 'Wand', amount: 1 },
                  cost: { min: 5, max: 5 },
                  customField: { nestedValue: 'Nested' },
                },
                {
                  min: 1,
                  max: 3,
                  result: 'Range',
                  gems: {},
                  artObjects: { type: 10 },
                  cost: { min: 6, max: 8 },
                },
                {
                  result: 'Sparse cost',
                  cost: { min: 'unknown' },
                },
                'Primitive row',
              ],
            },
            tableArray: [
              { option: 'Female', table: [{ min: 1, max: 1, result: 'Female result' }] },
              { option: 'Male', table: [{ min: 2, max: 2, result: 'Male result' }] },
              { option: 'Unknown', table: [{ min: 3, max: 3, result: 'Other result' }] },
            ],
            levelTable: {
              minlvl: 1,
              maxlvl: 4,
              table: [{ min: 1, max: 4, result: 'Level result' }],
            },
            typeTables: [
              {
                amount: '1d6',
                typeTable: [
                  { min: 1, max: 50, type: 'I', typeAltChoose: 'II' },
                  { type: 'II', otherField: 'Other' },
                  'Type result',
                ],
              },
            ],
            mmValue: { mm: 5, entry: '{@b Measure}' },
            renderableValue: { type: 'entries', entries: ['Renderable entry.'] },
            namedValue: {
              name: 'Named value',
              cost: { min: 2, max: 4 },
              entries: ['Named entry.'],
            },
            namedWithoutCost: { name: 'No cost', entries: [] },
            fallbackValue: {
              unknownField: 'Unknown field',
              renderableWithoutEntries: { type: 'unknown' },
              nestedEmpty: { '': ['Empty key item'] },
            },
            '': [{ typeTable: [{ type: 'Empty key type' }] }],
          },
          entries: ['Top-level entry.'],
        }}
      />,
    );
    expect(view.container).toHaveTextContent('Source Shapes');
    expect(view.container).toHaveTextContent('Structured entry.');
    expect(view.container).toHaveTextContent('Named value');
    expect(view.getAllByRole('table').length).toBeGreaterThan(3);
    view.unmount();

    const tableView = show(
      <SourceDataDetail
        entry={{
          id: 'root-table',
          name: 'Root Table',
          source: 'TEST',
          srd: false,
          collection: 'test',
          data: { table: [{ result: 'Root result' }] },
          entries: [],
        }}
      />,
    );
    expect(tableView.getByText('Root result')).toBeVisible();
    tableView.unmount();

    const typeTableView = show(
      <SourceDataDetail
        entry={{
          id: 'root-type-table',
          name: 'Root Type Table',
          source: 'TEST',
          srd: false,
          collection: 'test',
          data: { typeTable: [{ type: 'I' }] },
          entries: [],
        }}
      />,
    );
    expect(typeTableView.getByText('I')).toBeVisible();
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

    const sparseItemView = show(
      <ItemDetail
        item={normalize.normalizeItem({
          ...base,
          property: ['|XPHB', 'Missing|XPHB'],
          mastery: ['|XPHB', 'Missing|XPHB'],
          variant: { customField: 'Custom value' },
        })}
      />,
    );
    expect(sparseItemView.container).toHaveTextContent('Variant data');
    expect(sparseItemView.container).toHaveTextContent('Custom value');
    sparseItemView.unmount();

    const variantItemView = show(
      <ItemDetail
        item={normalize.normalizeItem({
          ...base,
          entries: ['You gain a {=bonusAc} bonus.'],
          variant: {
            inherits: {
              namePrefix: '+1 ',
              bonusAc: '+1',
              classFeatures: ['Replicate Magic Item'],
              lootTables: ['Armaments - Rare|XDMG'],
            },
            baseItems: [{ name: 'Breastplate', source: 'XPHB' }],
          },
        })}
      />,
    );
    expect(variantItemView.container).toHaveTextContent('You gain a +1 bonus.');
    expect(variantItemView.container).toHaveTextContent('Base items');
    expect(variantItemView.container).toHaveTextContent('Breastplate');
    expect(variantItemView.container).toHaveTextContent('Found On');
    expect(variantItemView.container).toHaveTextContent('Replicate Magic Item');
    variantItemView.unmount();

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

  it('links spell class metadata and item attunement requirements', () => {
    const spell = normalize.normalizeSpell({ ...base, level: 1, school: 'A' });
    Object.assign(spell, {
      classes: ['Czarodziej'],
      subclasses: ['Czarodziej: Mechaniczna Dusza'],
      _englishClasses: ['Wizard'],
      _englishSubclasses: ['Sorcerer: Clockwork Soul'],
    });
    const spellView = show(<SpellDetail spell={spell} />);
    expect(screen.getByRole('link', { name: 'Czarodziej' })).toHaveAttribute(
      'href',
      '/compendium/classes/wizard/',
    );
    expect(
      screen.getByRole('link', { name: 'Czarodziej: Mechaniczna Dusza' }),
    ).toHaveAttribute('href', '/compendium/classes/sorcerer/clockwork-soul/');
    spellView.unmount();

    const item = normalize.normalizeItem({ ...base, reqAttune: true });
    item.attunement = 'Requires attunement by a wizard';
    const itemView = show(<ItemDetail item={item} />);
    expect(screen.getByRole('link', { name: 'wizard' })).toHaveAttribute(
      'href',
      '/compendium/classes/wizard/',
    );
    itemView.unmount();
  });

  it('renders weapon mastery and property rules', () => {
    const view = show(
      <ItemDetail
        item={normalize.normalizeItem({
          ...base,
          source: 'XPHB',
          type: 'M|XPHB',
          property: ['H|XPHB', '2H|XPHB'],
          mastery: ['Graze|XPHB'],
        })}
      />,
    );

    expect(view.container).toHaveTextContent('Weapon Mastery');
    expect(view.container).toHaveTextContent('Graze');
    expect(view.container).toHaveTextContent(
      'You have Disadvantage on attack rolls with a Heavy weapon',
    );
    expect(view.container).toHaveTextContent('A Two-Handed weapon requires two hands');
    view.unmount();

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ items: [] }), { status: 200 })),
      );
    const polishView = render(
      <MemoryRouter initialEntries={['/pl/compendium/items']}>
        <ItemDetail
          item={normalize.normalizeItem({
            ...base,
            source: 'XPHB',
            type: 'M|XPHB',
            property: ['H|XPHB', '2H|XPHB'],
            mastery: ['Graze|XPHB'],
          })}
        />
      </MemoryRouter>,
    );
    expect(polishView.container).toHaveTextContent('Mistrzostwo broni');
    polishView.unmount();
    fetchMock.mockRestore();
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
    expect(
      screen.getByRole('heading', { name: /Spellcasting/, level: 3 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Subclass view' })).toBeInTheDocument();

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

  it('renders media for a selected subclass', () => {
    const cls: ClassEntry = {
      id: 'monk',
      name: 'Monk',
      source: 'XPHB',
      srd: true,
      hitDie: 'd8',
      primaryAbility: 'Wisdom',
      savingThrows: 'Strength and Dexterity',
      proficiencies: '',
      armorProficiencies: '',
      weaponProficiencies: '',
      toolProficiencies: '',
      subclassTitle: 'Monk Subclass',
      table: { headers: ['Level'], rows: [['1']] },
      features: [{ level: 1, name: 'Class Feature', entries: ['Base.'] }],
      subclasses: [
        {
          id: 'zerth-warrior',
          name: 'Zerth Warrior',
          source: 'Fumble',
          image: 'https://example.com/zerth.webp',
          lore: ['Lore.'],
          features: [{ level: 3, name: 'Psionic Wellspring', entries: ['Power.'] }],
        },
      ],
    };

    const view = show(<ClassDetail cls={cls} selectedSubclassId="zerth-warrior" />);
    const image = screen.getByRole('img', { name: 'Zerth Warrior' });
    expect(image).toHaveAttribute('src', 'https://example.com/zerth.webp');
    const classFeature = screen.getByRole('heading', { name: /Class Feature/ });
    expect(
      classFeature.compareDocumentPosition(image) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(screen.getByText('Lore.')).toBeInTheDocument();
    fireEvent.error(image);
    expect(image).toHaveStyle({ display: 'none' });
    view.unmount();
  });

  it('makes a selected subclass shareable through its route', () => {
    const cls: ClassEntry = {
      id: 'monk',
      name: 'Monk',
      source: 'XPHB',
      srd: true,
      hitDie: 'd8',
      primaryAbility: 'Wisdom',
      savingThrows: 'Strength and Dexterity',
      proficiencies: '',
      armorProficiencies: '',
      weaponProficiencies: '',
      toolProficiencies: '',
      subclassTitle: 'Monk Subclass',
      table: { headers: ['Level'], rows: [['1']] },
      features: [],
      subclasses: [
        { id: 'zerth-warrior', name: 'Zerth Warrior', source: 'Fumble', features: [] },
      ],
    };
    render(
      <MemoryRouter initialEntries={['/compendium/classes/monk']}>
        <Routes>
          <Route path="/compendium/classes/:id" element={<ClassDetail cls={cls} />} />
          <Route
            path="/compendium/classes/:id/:subclass"
            element={<ClassDetail cls={cls} />}
          />
        </Routes>
        <LocationProbe />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zerth Warrior (Fumble)' }));
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/compendium/classes/monk/zerth-warrior',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset selection' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/compendium/classes/monk');
  });

  it('adds the Artificer overview and subclass comparison', () => {
    const baseClass: ClassEntry = {
      id: 'artificer',
      name: 'Artificer',
      source: 'EFA',
      srd: false,
      hitDie: 'd8',
      primaryAbility: 'Intelligence',
      savingThrows: 'Constitution, Intelligence',
      proficiencies: 'Tools',
      armorProficiencies: 'Light',
      weaponProficiencies: 'Simple',
      toolProficiencies: "Tinker's tools",
      subclassTitle: 'Artificer Subclass',
      table: { headers: ['Level'], rows: [['1']] },
      features: [],
      subclasses: [],
    };

    const noRows = show(
      <ClassDetail
        cls={{
          ...baseClass,
          subclasses: [{ name: 'Unknown', source: 'EFA', features: [] }],
        }}
      />,
    );
    expect(
      screen.queryByRole('heading', { name: 'Artificer subclass comparison' }),
    ).not.toBeInTheDocument();
    noRows.unmount();

    const view = show(
      <ClassDetail
        cls={{
          ...baseClass,
          subclasses: [
            { name: 'Alchemist', source: 'EFA', features: [] },
            { name: 'Armorer', source: 'EFA', features: [] },
          ],
        }}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Overview' })).toBeVisible();
    expect(view.container).toHaveTextContent(
      'Artificers are Intelligence-focused inventors',
    );
    expect(
      screen.getByRole('heading', { name: 'Artificer subclass comparison' }),
    ).toBeVisible();
    const tables = screen.getAllByRole('table');
    const comparison = tables[1]!;
    expect(comparison).toHaveTextContent('Support and utility');
    expect(comparison).toHaveTextContent('Defense and infiltration');
    expect(comparison).toHaveTextContent('Create elixirs');
    view.unmount();

    const polishView = render(
      <MemoryRouter initialEntries={['/pl/compendium/classes/artificer/']}>
        <ClassDetail
          cls={{
            ...baseClass,
            name: 'Rzemieślnik',
            subclasses: [{ name: 'Alchemik', source: 'EFA', features: [] }],
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Opis' })).toBeVisible();
    const polishComparison = screen.getAllByRole('table')[1]!;
    expect(polishComparison).toHaveTextContent('Alchemik');
    expect(polishComparison).toHaveTextContent('Wsparcie i użyteczność');
    polishView.unmount();
  });
});
