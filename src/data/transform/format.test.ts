import { describe, expect, it } from 'vitest';
import * as format from './format';

describe('data formatters', () => {
  it('formats generated labels in Polish', () => {
    expect(format.formatCastingTime([{ number: 1, unit: 'action' }], 'pl')).toBe(
      '1 akcję',
    );
    expect(
      format.formatRange({ type: 'cone', distance: { type: 'feet', amount: 15 } }, 'pl'),
    ).toBe('15 stóp (stożek, 15 stóp)');
    expect(format.formatSize(['S', 'M'], 'pl')).toBe('Mały lub Średni');
    expect(format.formatSpeed({ walk: 30, fly: 60 }, 'pl')).toBe('30 stóp, lot 60 stóp');
    expect(format.formatItemType('HA', 'rare', 'pl')).toBe('Ciężki pancerz');
    expect(format.formatRarity('very rare', 'pl')).toBe('Bardzo rzadki');
    expect(format.formatWeaponDamage('1d8', 'S', 'pl')).toBe('1d8 sieczne');
    expect(format.formatWeaponDamage('1d8', 'O', 'pl')).toBe('1d8 moc');
    expect(format.formatMonsterType('dragon', 'pl')).toBe('Smok');
    expect(format.formatMonsterType('humanoid', 'pl')).toBe('Humanoidalny');
    expect(format.formatAlignment(['C', 'E'], 'pl')).toBe('Chaotyczny Zły');
    expect(format.formatMonsterCrDisplay({ cr: '5', xp: 1800 }, 'pl')).toBe(
      '5 (PD 1800; Premia biegłości +3)',
    );
    expect(format.formatDailyLabel('2e', 'pl')).toBe('2/każdy dzień');
    expect(format.formatDiet('V', 'pl')).toBe('Wegetariańskie');
    expect(format.formatFacilityType('basic', 'pl')).toBe('Podstawowa');
    expect(format.formatVehicleCapacity(5, 10, 2, 'pl')).toBe(
      'Załoga 5, Pasażerowie 10, Ładunek 2 ton',
    );
  });

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
    expect(
      format.formatSpeed({ walk: { number: 30, condition: '(40 ft. in tiger form)' } }),
    ).toBe('30 ft. (40 ft. in tiger form)');
    expect(
      format.formatSpeed({
        choose: { amount: 2, from: ['walk', 30, 'fly'], note: 'while climbing' },
        alternate: {
          walk: [{ number: 30 }, { number: 'invalid' }, null, 'invalid'],
          fly: { number: 60, condition: 'only in sunlight' },
          custom: { number: 10 },
        },
        swim: { number: 20 },
        burrow: false,
        climb: 'not a speed',
      }),
    ).toBe(
      '2 ft. (walk or fly; while climbing), 30 ft., fly 60 ft. only in sunlight, custom 10 ft., swim 20 ft.',
    );
    expect(format.formatSpeed({ choose: { amount: 'two', from: ['walk'] } })).toBe('-');
    expect(format.formatSpeed({ choose: { amount: 2, from: 'walk' } })).toBe('-');
    expect(format.formatSpeed({ choose: { amount: 2, from: [30, false] } })).toBe('-');
    const polishSpeed = format.formatSpeed(
      {
        choose: { amount: 1, from: ['walk', 'fly'] },
        alternate: {
          walk: { number: 30 },
          swim: [{ number: 40, condition: 'tylko w wodzie' }],
          custom: { number: 20 },
        },
      },
      'pl',
    );
    expect(polishSpeed).toContain('1 stóp (chód lub lot)');
    expect(polishSpeed).toContain('30 stóp');
    expect(polishSpeed).toContain('pływanie 40 stóp tylko w wodzie');
    expect(polishSpeed).toContain('custom 20 stóp');
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
    expect(format.formatLanguageScript('Elvish', 'pl')).toBe('Elficki');
    expect(format.formatLanguageType('standard', 'pl')).toBe('Standardowy');
    expect(format.formatStringList(['Urban', 'Underdark'], 'pl', 'habitat')).toBe(
      'Miejski, Podmrok',
    );
    expect(format.formatDomains(['Life', 'Trickery'], 'pl')).toBe('Życie, Oszustwo');
    expect(format.formatServes({ exact: 4, note: 'people' }, 'pl')).toBe('4 osób');
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
    expect(format.formatImmunities(['fire', 'force', 'lightning'], 'pl')).toBe(
      'ogień, moc, piorun',
    );
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

  it('covers Polish and sparse formatter branches', () => {
    expect(
      format.formatCastingTime(
        [
          { number: 2, unit: 'action', condition: 'when ready' },
          { number: 1, unit: 'custom', condition: 'at dusk' },
        ],
        'pl',
      ),
    ).toContain('when ready');
    expect(format.formatRange({ type: 'mystery' }, 'pl')).toBe('Mystery');
    expect(
      format.formatRange({ type: 'point', distance: { type: 'feet', amount: 1 } }, 'pl'),
    ).toContain('stopa');
    expect(
      format.formatRange({ type: 'self', distance: { type: 'custom' } }, 'pl'),
    ).toContain('custom');
    expect(
      format.formatRange({ type: 'point', distance: { type: 'yards', amount: 1 } }, 'pl'),
    ).toContain('yard');
    expect(
      format.formatRange({ type: 'point', distance: { type: 'yards', amount: 2 } }, 'pl'),
    ).toContain('yards');
    expect(
      format.formatRange({ type: 'self', distance: { type: 'self' } }, 'pl'),
    ).toContain('Siebie');
    expect(format.formatRange({ type: 'point', distance: { type: 'touch' } }, 'pl')).toBe(
      'Dotyk',
    );
    expect(format.formatRange({ type: 'point', distance: { type: 'sight' } }, 'pl')).toBe(
      'Widoczność',
    );
    expect(
      format.formatRange({ type: 'point', distance: { type: 'unlimited' } }, 'pl'),
    ).toBe('Nieograniczony');
    expect(
      format.formatDuration(
        [
          { type: 'instant' },
          { type: 'permanent' },
          { type: 'special' },
          { type: 'timed' },
          { type: 'timed', duration: { type: 'hour', amount: 2 } },
          { type: 'timed', duration: { type: 'minute', amount: 1 }, concentration: true },
        ],
        'pl',
      ),
    ).toContain('Koncentracja');
    expect(format.formatSize(['custom'], 'pl')).toBe('custom');
    expect(format.formatSpeed(30, 'pl')).toContain('30');
    expect(format.formatSpeed({ walk: 30, unknown: 20 }, 'pl')).toContain('unknown');
    expect(
      format.formatProficiencies([{ str: true, choose: { from: ['dex'] } }], 'pl'),
    ).toContain('wybierz');
    expect(
      format.formatAbilityChoices([{ choose: { from: ['custom'] } }], 'pl'),
    ).toContain('custom');
    expect(format.formatFeatCategory(undefined, 'pl')).toBeTruthy();
    expect(format.formatFeatCategory('custom', 'pl')).toBe('custom');
    expect(format.formatRuleType(undefined, 'pl')).toBeTruthy();
    expect(format.formatRuleType('custom', 'pl')).toBe('custom');
    expect(
      format.formatPrerequisite(
        [
          {
            level: 4,
            ability: [{ custom: 13 }],
            pact: 'Blade',
            patron: 'Fiend',
            spellcasting2020: true,
          },
          { level: [{ level: 2 }] },
        ],
        'pl',
      ),
    ).toContain('Poziom');
    expect(format.formatOptionalFeatureType([], 'pl')).toBeTruthy();
    expect(
      format.formatOptionalFeatureType(['EI', 'MM', 'MV', 'FS', 'PB', 'AI', 'RN'], 'pl'),
    ).toContain('Run');
    expect(format.formatHazardType('MAG', 'Trap', 'pl')).toContain('Pułapka');
    expect(format.formatAbilityList(['str', 'custom'], 'pl')).toContain('custom');
    expect(
      format.formatPrimaryAbility([{ str: true, custom: true }, { dex: true }], 'pl'),
    ).toContain('i');
    expect(
      format.formatStartingProficiencies(
        {
          armor: ['light armor'],
          weapons: ['simple'],
          tools: ['custom'],
          skills: [{ dex: true }],
        },
        'pl',
      ),
    ).toContain('Umiejętności');

    expect(format.formatItemType('GEN', undefined, 'pl')).toBeTruthy();
    expect(format.formatItemType('CUSTOM', undefined, 'pl')).toBe('CUSTOM');
    expect(format.formatItemType(undefined, 'rare', 'pl')).toBeTruthy();
    expect(format.formatItemType(undefined, 'none', 'pl')).toBeTruthy();
    expect(format.formatRarity('varies', 'pl')).toBeTruthy();
    expect(format.formatWeight(1, 'pl')).toContain('1');
    expect(format.formatWeight(2, 'pl')).toContain('2');
    expect(format.formatValue(100, 'pl')).toBe('1 sz');
    expect(format.formatValue(101, 'pl')).toContain('101');
    expect(format.formatWeaponDamage('1d6', 'custom', 'pl')).toBe('1d6 custom');
    expect(format.formatItemProperties(['2H', 'CUSTOM'], 'pl')).toContain('CUSTOM');
    expect(format.formatItemReferences([{}, 'A'])).toEqual(['A']);
    expect(format.formatItemReferenceNames([{}, 'A|XPHB'])).toBe('A');
    expect(format.formatItemReferences(undefined)).toEqual([]);
    expect(format.formatRarity('custom', 'pl')).toBe('Custom');
    expect(format.formatAttunement(true, 'pl')).toContain('dostrojenia');
    expect(format.formatAttunement('by a wizard', 'pl')).toContain('dostrojenia');

    expect(
      format.formatMonsterType({ type: { choose: ['custom'] }, tags: [{}] }, 'pl'),
    ).toBe('Custom');
    expect(
      format.formatMonsterType(
        { type: { choose: ['fiend'] }, tags: ['demon', 'shapechanger'] },
        'pl',
      ),
    ).toBe('Czart (demon, zmiennokształtny)');
    expect(
      format.formatAlignment(['C', 'custom', { alignment: ['N', 'custom'] }], 'pl'),
    ).toContain('Chaotyczny');
    expect(format.formatKeyedBonuses({ str: '+2', luck: '+1' }, true, 'pl')).toContain(
      'Siła',
    );
    expect(format.formatKeyedBonuses({ str: '+2', luck: '+1' }, false, 'pl')).toContain(
      'Luck',
    );
    expect(format.formatSenses(['darkvision'], 12, 'pl')).toContain('Percepcja');
    expect(
      format.formatMonsterCrDisplay({ cr: '5', xp: 1000, xpLair: 2000 }, 'pl'),
    ).toContain('leżu');
    expect(
      format.formatDamageTypes(
        ['fire', { resist: ['cold'], note: 'note' }, { special: 'special' }, 'unknown'],
        'pl',
      ),
    ).toContain('special');
    expect(
      format.formatDamageTypes(['acid', 'cold', 'force', 'lightning', 'thunder'], 'pl'),
    ).toBe('kwas; zimno; moc; piorun; gromu');
    expect(
      format.formatConditionList(
        [
          'poisoned',
          { conditionImmune: ['charmed'], note: 'note' },
          { special: 'special' },
          'custom',
        ],
        'pl',
      ),
    ).toContain('zauroczony');
    expect(format.formatDailyLabel('9e', 'pl')).toContain('każdy');
    expect(format.formatDailyLabel('9', 'pl')).toContain('dzień');
    expect(format.formatLanguages(['Common', 'Unknown'], 'pl')).toContain('Unknown');
    expect(format.formatLanguageType(undefined, 'pl')).toBeTruthy();
    expect(format.formatDiet(['C', 'custom'], 'pl')).toContain('custom');
    expect(format.formatFacilityType('custom', 'pl')).toBe('Custom');
    expect(format.formatFacilityType(undefined, 'pl')).toBeTruthy();
    expect(
      format.formatFacilityPrereq(
        [{ level: 1, membership: ['Guild'], other: 'Approval' }, { level: 2 }],
        'pl',
      ),
    ).toContain('Poziom');
    expect(format.formatObjectType('SW', 'pl')).toBeTruthy();
    expect(format.formatObjectType('custom', 'pl')).toBe('Custom');
    expect(format.formatObjectType(undefined, 'pl')).toBeTruthy();
    expect(format.formatVehicleType('SHIP', 'pl')).toBeTruthy();
    expect(format.formatVehicleType('unknown_type', 'pl')).toBe('Unknown Type');
    expect(format.formatPace(5, 'pl')).toContain('5');
    expect(format.formatPace({ walk: 4, unknown: 8 }, 'pl')).toContain('unknown');
    expect(format.formatVehicleCapacity(undefined, undefined, 'box', 'pl')).toContain(
      'box',
    );
    expect(format.formatCostGp(1234, 'pl')).toContain('sz');
  });
});
