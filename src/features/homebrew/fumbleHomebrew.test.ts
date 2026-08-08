import { describe, expect, it } from 'vitest';
import type { CompendiumEntryBase } from '@/data/compendium/types';
import {
  FUMBLE_CAMPAIGNS,
  fumbleHomebrewDefinitions,
  fumbleHomebrewItems,
  FUMBLE_SOURCE,
  isFumbleHomebrew,
} from './fumbleHomebrew';

describe('Fumble homebrew catalog', () => {
  it('maps every localized definition to a Fumble compendium item', () => {
    const items = fumbleHomebrewItems('en');
    const ids = new Set(items.map((item) => item.id));
    const homebrewItems = items.filter(isFumbleHomebrew);

    expect(items).toHaveLength(fumbleHomebrewDefinitions.length);
    expect(ids.size).toBe(items.length);
    expect(homebrewItems).toHaveLength(fumbleHomebrewDefinitions.length - 1);
    expect(items.filter((item) => item.source === FUMBLE_SOURCE)).toHaveLength(
      homebrewItems.length,
    );
    expect(
      homebrewItems.every(
        (item) =>
          item._fumble &&
          ((item.entries?.length ?? 0) > 0 ||
            Array.isArray(item.features) ||
            Array.isArray(item.traits) ||
            Array.isArray(item.actions)),
      ),
    ).toBe(true);
    expect(items.find((item) => item.id === 'warlock-great-serpent')?.name).toBe(
      'Warlock: Great Serpent',
    );
  });

  it('assigns every record to one or more known campaigns', () => {
    const items = fumbleHomebrewItems('en');
    const campaignIds = new Set(FUMBLE_CAMPAIGNS.map((campaign) => campaign.id));

    expect(
      items.every(
        (item) =>
          item.campaigns.length > 0 && item.campaigns.every((id) => campaignIds.has(id)),
      ),
    ).toBe(true);
    expect(items.find((item) => item.id === 'allied-hunter')?.campaigns).toEqual([
      'glod-smoka',
      'siedmiu-zbiegow',
      'wedrowcy-granic',
    ]);
    expect(items.find((item) => item.id === 'paladin-oathbreaker-ua')?.campaigns).toEqual(
      ['siedmiu-zbiegow', 'wedrowcy-granic'],
    );
    expect(
      isFumbleHomebrew(items.find((item) => item.id === 'paladin-oathbreaker-ua')!),
    ).toBe(false);
  });

  it('assigns Fumble content to the requested campaigns', () => {
    const items = fumbleHomebrewItems('en');
    const campaignCounts = (campaign: string) =>
      items
        .filter((item) => item.campaigns.includes(campaign as never))
        .reduce<Record<string, number>>((counts, item) => {
          counts[item.category] = (counts[item.category] ?? 0) + 1;
          return counts;
        }, {});

    expect(campaignCounts('grobowiec-zaglady')).toEqual({
      classes: 1,
      items: 3,
      rules: 9,
    });
    expect(campaignCounts('krysztalowa-sfera')).toEqual({
      classes: 1,
      feats: 16,
      items: 2,
      rules: 14,
    });
    expect(campaignCounts('glod-smoka')).toEqual({
      bestiary: 1,
      classes: 1,
      feats: 16,
      items: 10,
      rules: 3,
      spells: 13,
    });
    expect(campaignCounts('siedmiu-zbiegow')).toEqual({
      bestiary: 1,
      classes: 4,
      feats: 22,
      firearms: 28,
      items: 9,
      rules: 17,
      species: 4,
      spells: 13,
    });
    expect(campaignCounts('wedrowcy-granic')).toEqual({
      bestiary: 1,
      classes: 4,
      feats: 22,
      firearms: 28,
      items: 11,
      rules: 17,
      species: 4,
      spells: 13,
    });

    expect(items.find((item) => item.id === 'firearms-catalog')?.campaigns).toEqual([
      'siedmiu-zbiegow',
      'wedrowcy-granic',
    ]);
    expect(items.find((item) => item.id === 'armed-gloves')?.campaigns).toEqual([
      'wedrowcy-granic',
    ]);
    expect(items.find((item) => item.id === 'end-of-tyranny')?.campaigns).toEqual([
      'wedrowcy-granic',
    ]);
    expect(
      items.find((item) => item.id === 'crystal-of-possibilities')?.campaigns,
    ).toEqual(['krysztalowa-sfera']);
  });

  it('keeps classes and subclasses in the classes JSON category', () => {
    const items = fumbleHomebrewItems('en');
    const witch = items.find((item) => item.id === 'witch');
    const warlock = items.find((item) => item.id === 'warlock-great-serpent');

    expect(witch).toMatchObject({
      category: 'classes',
      subtitle: 'Hit Die d8',
      hitDie: 'd8',
    });
    expect(((witch?.features as unknown[] | undefined) ?? []).length).toBeGreaterThan(10);
    expect(((witch?.subclasses as unknown[] | undefined) ?? []).length).toBe(4);
    expect(warlock).toMatchObject({
      category: 'classes',
      isSubclass: true,
      className: 'Warlock',
      parentClassId: 'warlock',
      subclassName: 'Great Serpent',
    });
    expect(items.find((item) => item.id === 'paladin-oathbreaker-ua')).toMatchObject({
      category: 'classes',
      source: 'UA10',
      isSubclass: true,
      className: 'Paladin',
      parentClassId: 'paladin',
      subclassName: 'Oathbreaker',
      alwaysVisible: true,
    });
    expect(items.filter((item) => item.category === 'optionalfeatures')).toHaveLength(0);
    expect(items.find((item) => item.id === 'apothecary')).toBeUndefined();
  });

  it('keeps the four Fumble lineages separate and complete', () => {
    const english = fumbleHomebrewItems('en');
    const polish = fumbleHomebrewItems('pl');
    const species = english.filter((item) => item.category === 'species');
    const nocturnal = species.find((item) => item.id === 'nocturnal-moth')!;
    const diurnal = species.find((item) => item.id === 'diurnal-moth')!;
    const diurnalRoles = diurnal.entries?.find(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        'name' in entry &&
        entry.name === 'Caste Roles',
    );

    expect(species.map((item) => item.id)).toEqual([
      'nocturnal-moth',
      'diurnal-moth',
      'wooden-warforged',
      'spiryknot',
    ]);
    expect(JSON.stringify(nocturnal)).not.toContain('Diurnal');
    expect(JSON.stringify(nocturnal)).toContain('{@variantrule Darkness|XPHB}');
    expect(JSON.stringify(nocturnal)).not.toContain('{@spell Darkness|XPHB}');
    expect(diurnal).toMatchObject({
      name: 'Diurnal Moth',
      subtitle: 'Monstrosity, Medium or Small',
    });
    expect(diurnalRoles).toEqual(
      expect.objectContaining({
        type: 'entries',
        entries: expect.arrayContaining([
          expect.objectContaining({
            type: 'list',
            items: expect.arrayContaining([
              expect.objectContaining({ name: 'Caretaker' }),
              expect.objectContaining({ name: 'Soldier' }),
              expect.objectContaining({ name: 'Builder' }),
              expect.objectContaining({ name: 'Scout' }),
            ]),
          }),
        ]),
      }),
    );
    expect(polish.find((item) => item.id === 'diurnal-moth')).toMatchObject({
      name: 'Ciem dzienny',
    });
    expect(
      JSON.stringify(polish.find((item) => item.id === 'nocturnal-moth')),
    ).not.toContain('Role kastowe ciemów dziennych');
  });

  it('keeps starting flaws aligned with the source and removes duplicate examples', () => {
    const feats = fumbleHomebrewItems('en')
      .filter((item) => item.category === 'feats')
      .map((item) => item.id);

    expect(feats).toHaveLength(22);
    expect(feats).toContain('starting-flaw-immobile');
    expect(feats).toContain('starting-flaw-curse-of-giant');
    expect(feats).not.toContain('starting-flaw-taboo-of-passage');
    expect(feats).not.toContain('starting-flaw-taboo-of-sun');
    expect(feats).not.toContain('starting-flaw-small-frame');
    expect(feats).not.toContain('curse-of-magical-healing');

    const immobile = fumbleHomebrewItems('en').find(
      (item) => item.id === 'starting-flaw-immobile',
    );
    const delicate = fumbleHomebrewItems('en').find(
      (item) => item.id === 'starting-flaw-delicate',
    );
    expect(JSON.stringify(immobile)).toContain('reduced by 10 feet');
    expect(JSON.stringify(immobile)).not.toContain('Speed|XPHB} is 0');
    expect(JSON.stringify(delicate)).toContain('one-quarter');
    expect(JSON.stringify(delicate)).toContain('2 levels of Exhaustion');
  });

  it('provides the complete Oathbreaker subclass in both locales', () => {
    const english = fumbleHomebrewItems('en').find(
      (item) => item.id === 'paladin-oathbreaker-ua',
    )!;
    const polish = fumbleHomebrewItems('pl').find(
      (item) => item.id === 'paladin-oathbreaker-ua',
    )!;
    const englishFeatures = english.features as Array<{
      level: number;
      name: string;
      entries: unknown[];
    }>;
    const polishFeatures = polish.features as Array<{
      level: number;
      name: string;
      entries: unknown[];
    }>;

    expect(englishFeatures.filter((feature) => feature.level === 3)).toHaveLength(3);
    expect(englishFeatures.map((feature) => feature.name)).toEqual(
      expect.arrayContaining([
        'Conjure Undead',
        'Dreadful Aspect',
        'Oathbreaker Spells',
        'Aura of Hate',
        'Supernatural Resistance',
        'Dread Lord',
      ]),
    );
    expect(JSON.stringify(englishFeatures)).toContain('always have certain spells ready');
    expect(JSON.stringify(englishFeatures)).toContain('{@spell Hellish Rebuke|XPHB}');
    expect(JSON.stringify(englishFeatures)).toContain(
      '{@creature Skeleton|XMM|Skeleton}',
    );
    expect(JSON.stringify(englishFeatures)).toContain('Shadow Strike');
    expect(JSON.stringify(englishFeatures)).toContain('{@damage 3d10}');
    expect(polish).toMatchObject({
      name: 'Paladyn: Wiarołomca',
      subtitle: 'Podklasa Świętej Przysięgi',
      subclassName: 'Wiarołomca',
    });
    expect(polishFeatures.map((feature) => feature.name)).toEqual(
      expect.arrayContaining([
        'Przywołanie Nieumarłych',
        'Przerażające Oblicze',
        'Zaklęcia Wiarołomcy',
        'Aura Nienawiści',
        'Nadnaturalna Odporność',
        'Władca Grozy',
      ]),
    );
    expect(JSON.stringify(polish)).toContain('Zdobądź Wielką Moc za Wszelką Cenę');
    expect(JSON.stringify(polish)).toContain(
      'zawsze masz przygotowane określone zaklęcia',
    );
    expect(JSON.stringify(polish)).toContain('{@creature Skeleton|XMM|Szkielet}');
    expect(JSON.stringify(polish)).toContain(
      '{@spell Hellish Rebuke|XPHB|Piekielna Nagana}',
    );
  });

  it('keeps class intros separate from the lore sections', () => {
    const items = fumbleHomebrewItems('en');

    expect(items.find((item) => item.id === 'witch')).toMatchObject({
      intro: [{ name: 'Witch' }],
    });
    expect(items.find((item) => item.id === 'witch')?.lore).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Witch' })]),
    );
    expect(JSON.stringify(items.find((item) => item.id === 'witch'))).not.toContain(
      'Core Witch Traits',
    );
    expect(JSON.stringify(items)).not.toContain('Apothecary');
  });

  it('localizes Witch and standalone subclass data in Polish', () => {
    const items = fumbleHomebrewItems('pl');
    const witch = items.find((item) => item.id === 'witch');
    const witchSubclasses = witch?.subclasses as
      | Array<{ name?: string; image?: string; features?: Array<{ name?: string }> }>
      | undefined;

    expect(witch).toMatchObject({
      name: 'Wiedźma',
      subtitle: 'Kość Wytrzymałości d8',
      primaryAbility: 'Mądrość',
      savingThrows: 'Mądrość, Charyzma',
      subclassTitle: 'Sabat',
      table: { headers: expect.arrayContaining(['Poziom', 'Cechy']) },
    });
    expect(witch?.spellList).toHaveLength(195);
    expect(JSON.stringify(witch)).not.toContain('Zaklęcia Wiedźmy');
    expect((witch?.features as Array<{ name?: string }>)[0]?.name).toBe(
      'Rzucanie Zaklęć',
    );
    expect(witchSubclasses?.[0]).toMatchObject({
      name: 'Sabat Szponu',
      image: expect.stringContaining('claw-witch'),
    });
    expect(witchSubclasses?.[0]?.features?.[0]?.name).toBe('Zaklęcia Szponu');
    expect(JSON.stringify(witch)).toContain('Wiedźmy słyną ze swoich klątw');
    expect(JSON.stringify(witch)).not.toContain(
      'When you cast a Spell with a range of Touch',
    );

    expect(items.find((item) => item.id === 'warlock-great-serpent')).toMatchObject({
      name: 'Czarnoksiężnik Wielkiego Węża',
      subclassName: 'Wielki Wąż',
    });
    expect(items.find((item) => item.id === 'sorcerer-serpent-bloodline')).toMatchObject({
      name: 'Wężowy Zaklinacz',
      subclassName: 'Wężowy Zaklinacz',
    });
    expect(items.find((item) => item.id === 'zerth-warrior')).toMatchObject({
      name: 'Mnich: Wojownik Zerth',
      subclassName: 'Wojownik Zerth',
    });
  });

  it('keeps Serpent subclass choices and follow-up benefits scoped', () => {
    const english = fumbleHomebrewItems('en');
    const polish = fumbleHomebrewItems('pl');
    const warlock = english.find((item) => item.id === 'warlock-great-serpent')!;
    const polishWarlock = polish.find((item) => item.id === 'warlock-great-serpent')!;
    const sorcerer = english.find((item) => item.id === 'sorcerer-serpent-bloodline')!;
    const features = (item: typeof warlock) =>
      (item.features ?? []) as Array<{ level: number; name: string; entries: unknown[] }>;
    const findFeature = (item: typeof warlock, name: string) =>
      features(item).find((feature) => feature.name === name);
    const findList = (entries: unknown[]) =>
      entries.find(
        (entry): entry is { type: 'list'; items: unknown[] } =>
          typeof entry === 'object' &&
          entry !== null &&
          'type' in entry &&
          entry.type === 'list' &&
          'items' in entry &&
          Array.isArray(entry.items),
      );

    const strangeGifts = findFeature(warlock, 'Strange Gifts')!;
    expect(JSON.stringify(strangeGifts)).toContain(
      'one of the following mutations of your choice',
    );
    expect(findList(strangeGifts.entries)?.items).toHaveLength(3);
    expect(JSON.stringify(strangeGifts)).toContain('gouge out your eyes');

    const strangerGifts = findFeature(warlock, 'Stranger Gifts')!;
    expect(JSON.stringify(strangerGifts)).toContain(
      'Depending on which mutation you chose at 3rd level',
    );
    expect(findList(strangerGifts.entries)?.items).toHaveLength(3);
    expect(JSON.stringify(findFeature(warlock, 'Level 14'))).toContain('other Yuan-ti');
    expect(JSON.stringify(findFeature(warlock, 'Level 14'))).toContain('(3 or 4)');

    const sorcererTransformation = JSON.stringify(
      findFeature(sorcerer, 'Serpent Transformation'),
    );
    expect(sorcererTransformation).toContain("don't yet have Spell slots");
    expect(JSON.stringify(findFeature(sorcerer, 'Serpent Abomination'))).toContain(
      '{@itemMastery Sap|XPHB}',
    );
    expect(
      JSON.stringify(polish.find((item) => item.id === 'sorcerer-serpent-bloodline')),
    ).toContain('komórek czaru');
    expect(
      findList(findFeature(polishWarlock, 'Osobliwe Dary')!.entries)?.items,
    ).toHaveLength(3);
    expect(
      findList(findFeature(polishWarlock, 'Dziwniejsze Dary')!.entries)?.items,
    ).toHaveLength(3);
  });

  it('provides Witch spells, magic items, and the Allied Hunter in both locales', () => {
    const english = fumbleHomebrewItems('en');
    const polish = fumbleHomebrewItems('pl');

    expect(english.filter((item) => item.category === 'spells')).toHaveLength(13);
    expect(english.filter((item) => item.category === 'items')).toHaveLength(17);
    expect(english.filter((item) => item.category === 'firearms')).toHaveLength(28);
    const firearms = english.filter(
      (item) =>
        item.id.startsWith('pneumatic-') ||
        item.id.startsWith('explosive-') ||
        item.id.endsWith('-grenade') ||
        item.id.endsWith('-spray') ||
        item.id.startsWith('firearm-') ||
        item.id === 'bullet-spray' ||
        item.id === 'fire-spray' ||
        item.id === 'napalm-spray' ||
        item.id === 'acid-spray',
    );
    expect(firearms).toHaveLength(28);
    expect(firearms.every((item) => item.category === 'firearms')).toBe(true);
    expect(firearms.every((item) => item.source === FUMBLE_SOURCE && item._fumble)).toBe(
      true,
    );
    expect(
      firearms
        .filter((item) => item.type === 'Weapon')
        .every((item) =>
          JSON.stringify(item.entries).includes('firearms-catalog|Fumble'),
        ),
    ).toBe(true);
    expect(
      fumbleHomebrewItems('pl').find((item) => item.id === 'pneumatic-pistol'),
    ).toMatchObject({
      name: 'Pistolet pneumatyczny',
      subtitle: 'Broń palna, pneumatyczna, ręczna',
    });
    const firearmsRule = english.find((item) => item.id === 'firearms-catalog');
    const polishFirearmsRule = fumbleHomebrewItems('pl').find(
      (item) => item.id === 'firearms-catalog',
    );
    expect(JSON.stringify(firearmsRule)).toContain(
      '{@firearm Pneumatic Pistol|Fumble|Pneumatic Pistol}',
    );
    expect(JSON.stringify(firearmsRule)).toContain(
      '{@firearm Explosion|Fumble|Explosion}',
    );
    expect(JSON.stringify(firearmsRule)).toContain('{@itemMastery Slow|XPHB}');
    expect(JSON.stringify(polishFirearmsRule)).toContain(
      '{@firearm Pneumatic Pistol|Fumble|Pistolet pneumatyczny}',
    );
    expect(english.find((item) => item.id === 'allied-hunter')).toMatchObject({
      category: 'bestiary',
      actions: expect.any(Array),
    });
    expect(polish.find((item) => item.id === 'cackle')).toMatchObject({
      name: 'Chichot',
      englishName: 'Cackle',
    });
    expect(
      JSON.stringify(english.find((item) => item.id === 'healing-potions')),
    ).toContain('{@action Utilize|XPHB}');
    expect(
      JSON.stringify(polish.find((item) => item.id === 'healing-potions')),
    ).toContain('5 stóp');
    expect(polish.find((item) => item.id === 'bauble-trap')?.name).toBe(
      'Pułapka na Błyskotkę',
    );
    expect(polish.find((item) => item.id === 'allied-hunter')?.name).toBe(
      'Sprzymierzony Łowca',
    );
  });

  it('keeps only Spiryknot as the construct Fumble species', () => {
    const english = fumbleHomebrewItems('en').filter(
      (item) => item.category === 'species',
    );
    const polish = fumbleHomebrewItems('pl').filter(
      (item) => item.category === 'species',
    );
    const woodenWarforged = english.find((item) => item.id === 'wooden-warforged');
    const spiryknot = english.find((item) => item.id === 'spiryknot');

    expect(woodenWarforged).toMatchObject({
      creatureType: 'Humanoid',
      subtitle: 'Humanoid, Medium',
    });
    expect(JSON.stringify(woodenWarforged)).not.toContain('Construct');
    expect(spiryknot).toMatchObject({
      creatureType: 'Construct',
      subtitle: 'Construct, Medium',
    });
    expect(polish.find((item) => item.id === 'wooden-warforged')).toMatchObject({
      subtitle: 'Humanoid, średni',
    });
    expect(
      JSON.stringify(polish.find((item) => item.id === 'wooden-warforged')),
    ).toContain('Jesteś Humanoidem.');
  });

  it('includes the Zerth Warriors 17th-level features in both locales', () => {
    const english = fumbleHomebrewItems('en').find((item) => item.id === 'zerth-warrior');
    const polish = fumbleHomebrewItems('pl').find((item) => item.id === 'zerth-warrior');
    const englishFeatures = (english?.features ?? []) as Array<{
      level: number;
      name: string;
      entries: unknown[];
    }>;
    const polishFeatures = (polish?.features ?? []) as Array<{
      level: number;
      name: string;
      entries: unknown[];
    }>;

    expect(englishFeatures.filter((feature) => feature.level === 17)).toHaveLength(3);
    expect(englishFeatures.map((feature) => feature.name)).toEqual(
      expect.arrayContaining([
        'Improved Mental Shielding',
        'Powerful Mind',
        'Temporal Strike',
      ]),
    );
    expect(JSON.stringify(englishFeatures)).toContain('{@spell Sanctuary|XPHB}');
    expect(JSON.stringify(englishFeatures)).toContain("{@spell Bigby's Hand|XPHB}");
    expect(JSON.stringify(englishFeatures)).toContain('Charisma saving throw');
    expect(polishFeatures.filter((feature) => feature.level === 17)).toHaveLength(3);
    expect(polishFeatures.map((feature) => feature.name)).toEqual(
      expect.arrayContaining([
        'Ulepszona Osłona Umysłu',
        'Potężny Umysł',
        'Uderzenie Czasu',
      ]),
    );
  });

  it('keeps the crystal as a detailed item record', () => {
    const crystal = fumbleHomebrewItems('pl').find(
      (item) => item.id === 'crystal-of-possibilities',
    );

    expect(crystal).toMatchObject({
      name: 'Kryształ możliwości',
      subtitle: 'Cudowny przedmiot, artefakt, wymaga dostrojenia',
      type: 'Wondrous Item',
      rarity: 'Artifact',
      attunement: 'Requires attunement',
    });
    expect(crystal?.entries?.length).toBe(13);

    const serialized = JSON.stringify(crystal?.entries);
    expect(serialized).toContain('Dostrojenie');
    expect(serialized).toContain('Tryby kryształu');
    expect(serialized).toContain('Funkcje trybu niszczenia');
    expect(serialized).toContain('Funkcje trybu tworzenia');
    expect(serialized).toContain('Funkcje trybu teleportacji');
    expect(serialized).toContain('{@spell Summon Aberration|TCE}');
    expect(serialized).toContain('{@item Sphere of Annihilation|XDMG}');

    const findMode = (name: string) =>
      crystal?.entries?.find(
        (entry) =>
          typeof entry === 'object' &&
          entry !== null &&
          'name' in entry &&
          entry.name === name,
      );
    const destruction = JSON.stringify(findMode('Tryb niszczenia') ?? '');
    const creation = JSON.stringify(findMode('Tryb tworzenia') ?? '');
    const transformation = JSON.stringify(findMode('Tryb przemiany') ?? '');
    expect(destruction).toContain('{@spell Meteor Swarm|XPHB}');
    expect(destruction).toContain('{@spell Fire Storm|XPHB}');
    expect(creation).toContain('{@spell Major Image|XPHB}');
    expect(creation).not.toContain('{@spell Meteor Swarm|XPHB}');
    expect(transformation).toContain('{@spell Mass Polymorph|XGE}');

    const timeChanger = JSON.stringify(findMode('Tryb czaso-zmieniacza') ?? '');
    const disrupted = JSON.stringify(findMode('Rozstrojony') ?? '');
    expect(timeChanger).toContain('{@spell Time Ravage|EGW}');
    expect(disrupted).not.toContain('{@spell Time Ravage|EGW}');
    expect(disrupted).not.toContain('Odbicie');
  });

  it('provides Polish names with English search names where needed', () => {
    const items = fumbleHomebrewItems('pl');

    expect(items.find((item) => item.id === 'witch')).toMatchObject({
      name: 'Wiedźma',
      englishName: 'Witch',
    });
    expect(items.find((item) => item.id === 'flanking')?.name).toBe('Flankowanie');
    expect(items.find((item) => item.id === 'nocturnal-moth')?.name).toBe('Ciem nocny');
  });

  it('identifies only marked entries as Fumble homebrew', () => {
    const [item] = fumbleHomebrewItems('en');

    expect(isFumbleHomebrew(item!)).toBe(true);
    expect(
      isFumbleHomebrew({ ...item!, _fumble: false } as unknown as CompendiumEntryBase),
    ).toBe(false);
  });
});
