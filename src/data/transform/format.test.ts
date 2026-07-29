import { describe, expect, it } from 'vitest';
import * as format from './format';

describe('data formatters', () => {
  it('formats spell fields', () => {
    expect(format.formatCastingTime(undefined)).toBe('-');
    expect(
      format.formatCastingTime([
        { number: 1, unit: 'action' },
        { number: 2, unit: 'round', condition: 'when hit' },
      ]),
    ).toBe('1 action or 2 rounds, when hit');
    expect(format.formatRange(undefined)).toBe('-');
    expect(format.formatRange({ type: 'special' })).toBe('Special');
    expect(format.formatRange({ type: 'point', distance: { type: 'touch' } })).toBe(
      'Touch',
    );
    expect(
      format.formatRange({ type: 'point', distance: { type: 'feet', amount: 1 } }),
    ).toBe('1 foot');
    expect(
      format.formatRange({ type: 'cone', distance: { type: 'self', amount: 15 } }),
    ).toBe('Self (15-foot cone)');
    expect(format.formatRange({ type: 'sphere', distance: { type: 'sight' } })).toBe(
      'Sight',
    );
    expect(format.formatRange({ type: 'point', distance: { type: 'unlimited' } })).toBe(
      'Unlimited',
    );
    expect(format.formatComponents(undefined)).toBe('-');
    expect(format.formatComponents({ v: true, s: true, m: 'a pearl' })).toBe(
      'V, S, M (a pearl)',
    );
    expect(format.formatComponents({ m: { text: 'ash' } })).toBe('M (ash)');
    expect(format.formatComponents({ m: true })).toBe('M');
    expect(format.formatDuration(undefined)).toBe('-');
    expect(
      format.formatDuration([
        { type: 'instant' },
        { type: 'permanent' },
        { type: 'special' },
        {
          type: 'timed',
          duration: { type: 'minute', amount: 1 },
          concentration: true,
        },
        { type: 'timed' },
        { type: 'custom' },
      ]),
    ).toBe(
      'Instantaneous or Until dispelled or Special or Concentration, up to 1 minute or Special or Custom',
    );
    expect(format.hasConcentration([{ type: 'timed', concentration: true }])).toBe(true);
    expect(format.hasConcentration(undefined)).toBe(false);
  });

  it('formats character options and prerequisites', () => {
    expect(format.formatSize(['S', 'M', 'custom'])).toBe('Small or Medium or custom');
    expect(format.formatSize([])).toBe('-');
    expect(format.formatSpeed(30)).toBe('30 ft.');
    expect(format.formatSpeed({ walk: 30, fly: 60, hover: true })).toBe(
      '30 ft., fly 60 ft.',
    );
    expect(format.formatSpeed(undefined)).toBe('-');
    expect(
      format.formatProficiencies([
        { str: true, dex: false },
        { choose: { count: 2, from: ['wis', 'arcana'] } },
      ]),
    ).toBe('Strength; choose 2 from Wisdom, Arcana');
    expect(
      format.formatAbilityChoices([
        { choose: { from: ['str', 'dex'] } },
        { choose: { weighted: { from: ['dex', 'wis', 'luck'] } } },
      ]),
    ).toBe('Choose from Strength, Dexterity, Wisdom, luck');
    expect(format.formatFeatRefs([{ 'alert|xphb': true, 'adept; fire|x': true }])).toBe(
      'Alert, Adept (Fire)',
    );
    expect(
      format.formatPrerequisite([
        {
          level: 4,
          ability: [{ str: 13 }],
          pact: 'Blade',
          patron: 'Fiend',
          spell: ['fireball', { entrySummary: 'magic missile' }],
          spellcasting: true,
          other: 'Training',
        },
        { level: [{ level: 3, class: { name: 'Wizard' } }] },
      ]),
    ).toContain('Level 4+');
    expect(format.formatOptionalFeatureType(['EI', 'EI', 'custom'])).toBe(
      'Eldritch Invocation, custom',
    );
    expect(format.formatHazardType('MAG', 'Trap')).toBe('Magical Trap');
    expect(format.formatHazardType('missing', 'Trap')).toBe('Trap');
    expect(format.formatDomains(['Life', 'Light'])).toBe('Life, Light');
    expect(format.formatAbilityList(['str', 'wis'])).toBe('Strength, Wisdom');
    expect(format.formatPrimaryAbility([{ str: true, dex: true }, { wis: true }])).toBe(
      'Strength and Dexterity or Wisdom',
    );
    expect(
      format.formatProfList(['str', 'martial weapons', { proficiency: 'dex' }]),
    ).toBe('Strength, Martial weapons, Dexterity');
    expect(
      format.formatStartingProficiencies({
        armor: ['light armor'],
        weapons: ['simple'],
        tools: ['thieves tools'],
        skills: [{ choose: { from: ['arcana'] } }],
      }),
    ).toContain('Armor: Light armor');
  });

  it('formats items and monsters', () => {
    expect(format.formatItemType('HA|XPHB', 'rare')).toBe('Heavy Armor');
    expect(format.formatItemType(undefined, 'rare')).toBe('Wondrous Item');
    expect(format.formatItemType(undefined, 'none')).toBe('Adventuring Gear');
    expect(format.formatRarity('very rare')).toBe('Very Rare');
    expect(format.formatRarity('none')).toBe('');
    expect(format.formatAttunement(true)).toBe('Requires attunement');
    expect(format.formatAttunement('by a wizard')).toBe(
      'Requires attunement by a wizard',
    );
    expect(format.formatWeight(2.5)).toBe('2.5 lb.');
    expect(format.formatValue(100)).toBe('1 gp');
    expect(format.formatValue(50)).toBe('50 cp');
    expect(format.formatWeaponDamage('1d8', 'S')).toBe('1d8 slashing');
    expect(format.formatItemProperties(['F', { uid: '2H|XPHB' }, {}])).toBe(
      'Finesse, Two-Handed',
    );
    expect(format.formatMonsterType('undead')).toBe('Undead');
    expect(
      format.formatMonsterType({
        type: { choose: ['fiend'] },
        tags: ['demon', { tag: 'shapechanger' }],
      }),
    ).toBe('Fiend (Demon, Shapechanger)');
    expect(format.formatAlignment(['L', 'G', { special: 'usually neutral' }])).toBe(
      'Lawful Good usually neutral',
    );
    expect(format.formatMonsterAc([18])).toBe('18');
    expect(format.formatMonsterAc([{ ac: 16 }])).toBe('16');
    expect(format.formatMonsterHp({ average: 10, formula: '3d6' })).toBe('10 (3d6)');
    expect(format.formatMonsterHp({ special: 'varies' })).toBe('varies');
    expect(format.formatKeyedBonuses({ str: '+4', dex: 2 }, true)).toBe('Str +4');
    expect(format.formatSenses(['darkvision 60 ft.'], 14)).toContain(
      'Passive Perception 14',
    );
    expect(format.abilityModifier(8)).toBe(-1);
    expect(format.crToProficiency('17')).toBe(6);
    expect(format.crToProficiency('1/2')).toBe(2);
    expect(format.formatInitiative(14, undefined, 2)).toBe('+2 (12)');
    expect(format.formatInitiative(14, { proficiency: 1 }, 3)).toBe('+5 (15)');
    expect(format.formatMonsterCrDisplay({ cr: '5', xp: 1800, xpLair: 2000 })).toBe(
      '5 (XP 1,800, or 2,000 in lair; PB +3)',
    );
  });

  it('formats lists and secondary categories', () => {
    expect(
      format.formatDamageTypes([
        'fire',
        { resist: ['cold'], note: 'from spells' },
        { special: 'varies' },
      ]),
    ).toBe('fire; cold from spells; varies');
    expect(
      format.formatConditionList([
        'poisoned',
        { conditionImmune: ['charmed'], note: 'while awake' },
        { special: 'none' },
      ]),
    ).toBe('poisoned; charmed while awake; none');
    expect(format.formatDailyLabel('2e')).toBe('2/day each');
    expect(format.formatDailyLabel('5')).toBe('5/day');
    expect(format.formatLanguages(['Common', 'Elvish'])).toBe('Common, Elvish');
    expect(format.formatLanguageType('standard')).toBe('Standard');
    expect(format.formatStringList(['fire damage', 'cold'])).toBe('Fire Damage, Cold');
    expect(format.formatDiet(['C', 'X'])).toBe('Contains meat, Vegan');
    expect(format.formatServes({ min: 2, max: 4, note: 'people' })).toBe('2-4 people');
    expect(format.formatServes({ exact: 1 })).toBe('1');
    expect(format.formatFacilityType('basic')).toBe('Basic');
    expect(
      format.formatFacilityPrereq([
        { level: 5, membership: ['Guild'], other: 'Approval' },
      ]),
    ).toBe('Level 5+, Guild, Approval');
    expect(format.formatObjectType('SW')).toBe('Siege Weapon');
    expect(format.formatImmunities(['fire', {}, 'cold'])).toBe('fire, cold');
    expect(format.formatVehicleType('INFWAR')).toBe('Infernal War Machine');
    expect(format.formatVehicleType('sea_skiff')).toBe('Sea Skiff');
    expect(format.formatDimensions(['10 ft.', '20 ft.'])).toContain('10 ft.');
    expect(format.formatPace(4)).toBe('4 mph');
    expect(format.formatPace({ walk: 4, fly: 8 })).toBe('4 mph, fly 8 mph');
    expect(format.formatVehicleCapacity(5, 10, 2)).toBe(
      'Crew 5, Passengers 10, Cargo 2 tons',
    );
    expect(format.formatCostGp(1234)).toBe('1,234 gp');
  });

  it('formats sparse, custom and alternate values', () => {
    expect(
      format.formatRange({
        type: 'line',
        distance: { type: 'meters', amount: 1 },
      }),
    ).toBe('1 meter (1-foot line)');
    expect(
      format.formatRange({
        type: 'point',
        distance: { type: 'custom', amount: 2 },
      }),
    ).toBe('2 custom');
    expect(
      format.formatRange({
        type: 'cube',
        distance: { type: 'custom' },
      }),
    ).toBe('undefined custom (cube)');
    expect(format.formatComponents({})).toBe('-');
    expect(
      format.formatDuration([
        {
          type: 'timed',
          duration: { type: 'hour', amount: 2 },
          concentration: false,
        },
      ]),
    ).toBe('2 hours');
    expect(format.formatProficiencies([{ choose: {} }])).toBe('choose 1 from ');
    expect(format.formatAbilityChoices([{ choose: {} }])).toBe('');
    expect(format.formatFeatRefs([{ 'custom|HB': true }])).toBe('Custom');
    expect(
      format.formatPrerequisite([
        {
          level: [{ level: 2 }],
          spell: [{ entry: 'shield' }, {}],
          spellcasting2020: true,
        },
      ]),
    ).toContain('shield');
    expect(
      format.formatPrerequisite([
        {
          ability: [{ luck: 13 }],
          spell: [{}],
        },
      ]),
    ).toContain('luck 13+');
    expect(format.formatAbilityList(['luck'])).toBe('luck');
    expect(format.formatPrimaryAbility([{ luck: true, str: false }])).toBe('luck');
    expect(format.formatProfList([{ full: 'all tools' }, {}, null])).toBe('All tools');
    expect(format.formatStartingProficiencies(undefined)).toBe('');
    expect(format.formatStartingProficiencies({})).toBe('');
  });

  it('formats monster and item fallbacks', () => {
    expect(format.formatItemType('CUSTOM|HB', undefined)).toBe('CUSTOM');
    expect(format.formatRarity('unknown')).toBe('');
    expect(format.formatAttunement(false)).toBe('');
    expect(format.formatWeight(undefined)).toBe('');
    expect(format.formatValue(undefined)).toBe('');
    expect(format.formatWeaponDamage('1d4', undefined)).toBe('1d4');
    expect(format.formatWeaponDamage('1d4', 'custom')).toBe('1d4 custom');
    expect(format.formatItemProperties(['CUSTOM'])).toBe('CUSTOM');
    expect(format.formatMonsterType({ tags: [] })).toBe('');
    expect(format.formatMonsterType({ type: 'beast' })).toBe('Beast');
    expect(format.formatMonsterType({ type: 'beast', tags: [{}] })).toBe('Beast');
    expect(format.formatMonsterType({ type: 'beast', tags: [] })).toBe('Beast');
    expect(format.formatAlignment([{ alignment: ['N', 'custom'] }, {}])).toBe(
      'Neutral custom',
    );
    expect(format.formatAlignment(['custom', null])).toBe('custom');
    expect(format.formatMonsterAc([{}])).toBe('-');
    expect(format.formatMonsterHp({ average: 4 })).toBe('4');
    expect(format.formatMonsterHp({})).toBe('-');
    expect(format.formatKeyedBonuses({ luck: '+2' })).toBe('Luck +2');
    expect(format.formatKeyedBonuses({ luck: '+2' }, true)).toBe('Luck +2');
    expect(format.crToProficiency('unknown')).toBe(2);
    expect(format.formatInitiative(10, -2, 2)).toBe('-2 (8)');
    expect(format.formatInitiative(10, { initiative: -1 }, 2)).toBe('-1 (9)');
    expect(format.formatMonsterCrDisplay(undefined)).toBe('-');
    expect(format.formatMonsterCrDisplay({})).toBe('- (PB +2)');
  });

  it('formats empty and alternative collection values', () => {
    expect(format.formatDamageTypes([{ immune: ['fire'], note: '' }, {}])).toBe('fire');
    expect(format.formatDamageTypes([{ immune: [{}] } as never])).toBe('');
    expect(format.formatConditionList([{ conditionImmune: ['charmed'] }, {}])).toBe(
      'charmed',
    );
    expect(format.formatDiet('V')).toBe('Vegetarian');
    expect(format.formatDiet('custom')).toBe('custom');
    expect(format.formatServes({ note: 'varies' })).toBe('varies');
    expect(format.formatFacilityType(undefined)).toBe('Facility');
    expect(format.formatFacilityType('custom')).toBe('Custom');
    expect(format.formatFacilityPrereq([{}])).toBe('');
    expect(format.formatObjectType(undefined)).toBe('Object');
    expect(format.formatObjectType('custom')).toBe('Custom');
    expect(format.formatVehicleCapacity(undefined, undefined, 'many crates')).toBe(
      'Cargo many crates',
    );
    expect(format.formatCostGp(undefined)).toBe('');
  });
});
