import { describe, expect, it } from 'vitest';
import { localizeCompendiumValue } from './localizeValue';

describe('localizeCompendiumValue', () => {
  it('localizes known untranslated Polish overlay values', () => {
    expect(localizeCompendiumValue('Standard', 'pl', 'languageType')).toBe('standardowy');
    expect(localizeCompendiumValue('Mały lub Mały', 'pl', 'objectSize')).toBe(
      'Malutki lub Mały',
    );
    expect(localizeCompendiumValue('Zaklęcie zaklęć', 'pl', 'vehicleType')).toBe(
      'Spelljammer',
    );
    expect(localizeCompendiumValue('status', 'pl', 'kind')).toBe('status');
    expect(localizeCompendiumValue('Mały lub Mały', 'pl', 'size')).toBe(
      'Malutki lub Mały',
    );
    expect(
      localizeCompendiumValue('Concentration, up to 1 minute', 'pl', 'duration'),
    ).toBe('Koncentracja, do 1 minuty');
    expect(localizeCompendiumValue('Transmutation', 'pl', 'school')).toBe('Przemiana');
    expect(localizeCompendiumValue('Two-Handed, Heavy', 'pl', 'properties')).toBe(
      'Dwuręczna, Ciężka',
    );
  });

  it('keeps English and unknown values unchanged', () => {
    expect(localizeCompendiumValue('Standard', 'en', 'languageType')).toBe('Standard');
    expect(localizeCompendiumValue('Custom', 'pl', 'languageType')).toBe('Custom');
    expect(localizeCompendiumValue(undefined, 'pl', 'languageType')).toBeUndefined();
  });

  it('localizes shared Fumble metadata', () => {
    expect(localizeCompendiumValue('Medium or Small', 'pl', 'size')).toBe(
      'Średni lub Mały',
    );
    expect(localizeCompendiumValue('Construct (Talent)', 'pl', 'creatureType')).toBe(
      'Konstrukt (Talent)',
    );
    expect(
      localizeCompendiumValue(
        '30 ft.; Climb 30 ft. (Land only); Fly 40 ft. (Air only); Swim 30 ft. (Water only); Burrow 20 ft.',
        'pl',
        'speed',
      ),
    ).toBe(
      '30 stóp; wspinaczka 30 stóp (tylko ląd); lot 40 stóp (tylko powietrze); pływanie 30 stóp (tylko woda); kopanie 20 stóp',
    );
    expect(localizeCompendiumValue('120 feet (120-foot cone)', 'pl', 'range')).toBe(
      '120 stóp (stożek 120 stóp)',
    );
    expect(localizeCompendiumValue('1 bonus', 'pl', 'castingTime')).toBe(
      '1 akcja dodatkowa',
    );
    expect(localizeCompendiumValue('Action', 'pl', 'castingTime')).toBe('Akcja');
    expect(localizeCompendiumValue('1 action', 'pl', 'castingTime')).toBe('1 akcja');
    expect(localizeCompendiumValue('2 reaction', 'pl', 'castingTime')).toBe('2 reakcja');
    expect(
      localizeCompendiumValue('Reaction after the trigger', 'pl', 'castingTime'),
    ).toBe('Reakcja after the trigger');
    expect(localizeCompendiumValue('1 minute', 'pl', 'castingTime')).toBe('1 minuta');
    expect(localizeCompendiumValue('2 minutes', 'pl', 'castingTime')).toBe('2 minut');
    expect(localizeCompendiumValue('1 foot', 'pl', 'castingTime')).toBe('1 stopa');
    expect(localizeCompendiumValue('2 feet', 'pl', 'castingTime')).toBe('2 stóp');
    expect(localizeCompendiumValue('1 mile', 'pl', 'castingTime')).toBe('1 mila');
    expect(localizeCompendiumValue('2 miles', 'pl', 'castingTime')).toBe('2 mil');
    expect(localizeCompendiumValue('1 hour', 'pl', 'castingTime')).toBe('1 godzina');
    expect(localizeCompendiumValue('2 hours', 'pl', 'castingTime')).toBe('2 godzin');
    expect(localizeCompendiumValue('1 day', 'pl', 'castingTime')).toBe('1 dzień');
    expect(localizeCompendiumValue('2 days', 'pl', 'castingTime')).toBe('2 dni');
    expect(
      localizeCompendiumValue(
        'Reaction, which you take when a creature within range is reduced to 0 Hit Points or fails a Death Saving Throw',
        'pl',
        'castingTime',
      ),
    ).toBe(
      'Reakcja, którą wykonujesz, gdy stworzenie w zasięgu zostanie zredukowane do 0 PW lub nie zda rzutu obronnego przed śmiercią',
    );
    expect(localizeCompendiumValue('24 hours or 366 days', 'pl', 'duration')).toBe(
      '24 godzin lub 366 dni',
    );
    expect(localizeCompendiumValue('Adventuring Gear', 'pl', 'type')).toBe(
      'Ekwipunek podróżny',
    );
    expect(
      localizeCompendiumValue(
        'Uncommon (+1), Rare (+2), or Very Rare (+3)',
        'pl',
        'rarity',
      ),
    ).toBe('Niepospolita (+1), rzadka (+2) lub bardzo rzadka (+3)');
    expect(localizeCompendiumValue('Finesse, Light, Loading', 'pl', 'properties')).toBe(
      'Finezja, Lekka, Ładowanie',
    );
    expect(localizeCompendiumValue('Fighting Style, FS:P', 'pl', 'featureType')).toBe(
      'Styl walki, FS:P',
    );
    expect(localizeCompendiumValue('120 feet (120-foot cone)', 'en', 'range')).toBe(
      '120 feet (120-foot cone)',
    );
  });
});
