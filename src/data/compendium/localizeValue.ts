import type { Locale } from '@/i18n/locales';

const POLISH_VALUES: Record<string, Record<string, string>> = {
  conditionKind: {
    condition: 'stan',
    disease: 'choroba',
    status: 'status',
  },
  ability: {
    Charisma: 'Charyzma',
    Constitution: 'Kondycja',
    Dexterity: 'Zręczność',
    Intelligence: 'Inteligencja',
    Strength: 'Siła',
    Wisdom: 'Mądrość',
  },
  alignment: {
    'Any Alignment': 'Dowolne nastawienie',
    'Chaotic Evil': 'Chaotyczny Zły',
    'Chaotic Good': 'Chaotyczny Dobry',
    'Chaotic Neutral': 'Chaotyczny Neutralny',
    'Lawful Evil': 'Praworządny Zły',
    'Lawful Good': 'Praworządny Dobry',
    'Lawful Neutral': 'Praworządny Neutralny',
    Neutral: 'Neutralny',
    'Neutral Evil': 'Neutralny Zły',
    'Neutral Good': 'Neutralny Dobry',
    Unaligned: 'Niezestrojony',
    "as the eidolon's alignment": 'Zgodnie z nastawieniem eidolona',
    "host's alignment": 'Nastawienie gospodarza',
    'chaotic silly': 'Chaotyczne figlarne',
    'chaotic sticky': 'Chaotyczne lepkie',
    'lawful grumpy': 'Praworządne marudne',
    'neutral oozy': 'Neutralne maziowate',
  },
  facilityType: {
    Basic: 'Podstawowa',
    Special: 'Specjalna',
    Podstawowy: 'Podstawowa',
    Specjalny: 'Specjalna',
  },
  languageScript: {
    Celestial: 'Niebiański',
    Common: 'Wspólny',
    Dethek: 'Dethek',
    Draconic: 'Smoczy',
    Dwarvish: 'Krasnoludzki',
    Elvish: 'Elficki',
    Giant: 'Olbrzymi',
    Goblin: 'Gobliński',
    Infernal: 'Piekielny',
    Ogre: 'Ogrzy',
    Primordial: 'Pierwotny',
    Sylvan: 'Sylvański',
    Qualith: 'Qualith',
    Thorass: 'Thorass',
    none: 'Brak',
    Krasnolud: 'Krasnoludzki',
    nic: 'Brak',
  },
  pantheon: {
    Celtic: 'Celtycki',
    'Dawn War': 'Wojna Świtu',
    Dragonlance: 'Dragonlance',
    Drow: 'Drow',
    Duergar: 'Duergar',
    Dwarven: 'Krasnoludzki',
    Egyptian: 'Egipski',
    Elven: 'Elficki',
    Exandria: 'Exandria',
    Faerûnian: 'Faeruński',
    'Forgotten Realms': 'Zapomniane Krainy',
    Gnome: 'Gnomi',
    Gnomish: 'Gnomi',
    Greek: 'Grecki',
    Greyhawk: 'Greyhawk',
    Halfling: 'Niziołczy',
    Nonhuman: 'Nieludzki',
    Norse: 'Nordycki',
    Orc: 'Orkowy',
    Theros: 'Theros',
    Unknown: 'Nieznany',
    'Smocza Lanca': 'Dragonlance',
    Egipcjanin: 'Egipski',
    Elfy: 'Elficki',
    Krasnolud: 'Krasnoludzki',
  },
  recipeType: {
    Dwarven: 'Krasnoludzka',
    'Elixir/Ale': 'Eliksir/piwo',
    Elven: 'Elficka',
    Halfling: 'Niziołcza',
    Human: 'Ludzka',
    Recipe: 'Przepis',
    'Uncommon Cuisine': 'Niezwykła kuchnia',
    'The Fejwild': 'Kraina Feerii',
    'The Yawning Portal': 'Ziewający Portal',
    'The Driftwood Tavern': 'Karczma Dryfującego Konara',
    'The Moonstone Mask': 'Maska z Kamienia Księżycowego',
    'The Hissing Stones': 'Syczące Kamienie',
    'The Low Lantern': 'Niska Latarnia',
    'Lost in Realmspace': 'Zagubieni w Przestrzeni Królestw',
    'One-Eyed Jax': 'Jednooki Jax',
    'The Hearth': 'Domowe Ognisko',
    'The Gilded Horseshoe': 'Pozłacana Podkowa',
    'The Pink Flumph Theater': 'Teatr Różowego Flumpa',
    'The Halfway Inn': 'Gospoda Połowy Drogi',
    'The Rock of Bral': 'Skała Brala',
    Krasnolud: 'Krasnoludzka',
    Elfy: 'Elficka',
    Niziołek: 'Niziołcza',
    Człowiek: 'Ludzka',
  },
  languageType: {
    Exotic: 'Egzotyczny',
    Language: 'Język',
    Rare: 'Rzadki',
    Secret: 'Sekretny',
    Standard: 'Standardowy',
    Standardowy: 'Standardowy',
  },
  objectSize: {
    'Mały lub Mały': 'Malutki lub Mały',
    Gargantuan: 'Gigantyczny',
    Huge: 'Wielki',
    Large: 'Duży',
    Medium: 'Średni',
    'Medium or Small': 'Średni lub Mały',
    Small: 'Mały',
    'Small or Medium': 'Mały lub Średni',
    Tiny: 'Malutki',
    Varies: 'Zmienny',
  },
  vehicleType: {
    'Elemental Airship': 'Sterowiec żywiołów',
    'Infernal War Machine': 'Piekielna machina wojenna',
    Ship: 'Statek',
    Spelljammer: 'Spelljammer',
    Statek: 'Statek',
    'Creature Vehicle': 'Pojazd-stworzenie',
    'Pojazd Stworzenia': 'Pojazd-stworzenie',
    Vehicle: 'Pojazd',
    Pojazd: 'Pojazd',
    'Zaklęcie zaklęć': 'Spelljammer',
  },
  creatureType: {
    Aberration: 'Aberracja',
    Beast: 'Bestia',
    Celestial: 'Niebianin',
    Construct: 'Konstrukt',
    Dragon: 'Smok',
    Elemental: 'Żywiołak',
    Fey: 'Fej',
    Fiend: 'Czart',
    Giant: 'Olbrzym',
    Humanoid: 'Humanoidalny',
    Monstrosity: 'Monstrum',
    Ooze: 'Maź',
    Plant: 'Roślina',
    Undead: 'Nieumarły',
    Apparition: 'Zjawa',
    'Fire Guardian': 'Strażnik ognia',
    Keeper: 'Opiekun',
    'Totem Elemental': 'Żywiołak totemu',
    construct: 'Konstrukt',
    Humanoidalny: 'Humanoidalny',
    Aberracja: 'Aberracja',
    Bestia: 'Bestia',
    Czart: 'Czart',
    Fej: 'Fej',
    Konstrukt: 'Konstrukt',
    Maź: 'Maź',
    Monstrum: 'Monstrum',
    Niebianin: 'Niebianin',
    Nieumarły: 'Nieumarły',
    Olbrzym: 'Olbrzym',
    Roślina: 'Roślina',
    Smok: 'Smok',
    Zjawa: 'Zjawa',
    'Strażnik Ognia': 'Strażnik ognia',
    Totem: 'Żywiołak totemu',
    Żywiołak: 'Żywiołak',
  },
  featCategory: {
    'Epic Boon': 'Epicki dar',
    Feat: 'Atut',
    'Fighting Style': 'Styl walki',
    General: 'Ogólny',
    Origin: 'Pochodzenia',
    Atut: 'Atut',
    'Epicki Dar': 'Epicki dar',
    'Styl Walki': 'Styl walki',
  },
  school: {
    Abjuration: 'Osłona',
    Conjuration: 'Przywołanie',
    Divination: 'Wróżbiarstwo',
    Enchantment: 'Zaczarowanie',
    Evocation: 'Wywoływanie',
    Illusion: 'Iluzja',
    Necromancy: 'Nekromancja',
    Transmutation: 'Przemiana',
  },
  type: {
    'Adventuring Gear': 'Ekwipunek podróżny',
    Armor: 'Pancerz',
    'Melee Weapon': 'Broń do walki wręcz',
    Staff: 'Kostur',
    Weapon: 'Broń',
    'Weapon (Dagger or Sickle)': 'Broń (sztylet lub sierp)',
    'Weapon Modification': 'Modyfikacja broni',
    Ammunition: 'Amunicja',
    'Ammunition (Firearm)': 'Amunicja (broń palna)',
    "Artisan's Tools": 'Narzędzia rzemieślnicze',
    Explosive: 'Materiał wybuchowy',
    'Food and Drink': 'Jedzenie i napoje',
    'Gaming Set': 'Zestaw do gier',
    'Generic Variant': 'Wariant ogólny',
    'Heavy Armor': 'Ciężka zbroja',
    Instrument: 'Instrument',
    'Light Armor': 'Lekka zbroja',
    'Medium Armor': 'Średnia zbroja',
    Mount: 'Wierzchowiec',
    Other: 'Inne',
    Potion: 'Mikstura',
    'Ranged Weapon': 'Broń dystansowa',
    Ring: 'Pierścień',
    Rod: 'Pręt',
    Scroll: 'Zwój',
    Shield: 'Tarcza',
    'Spellcasting Focus': 'Ognisko rzucania zaklęć',
    'Tack and Harness': 'Uprząż i osprzęt',
    Tool: 'Narzędzie',
    'Trade Bar': 'Sztabka handlowa',
    'Trade Good': 'Towar handlowy',
    'Treasure (Art Object)': 'Skarb (dzieło sztuki)',
    'Treasure (Coinage)': 'Skarb (monety)',
    'Treasure (Gemstone)': 'Skarb (klejnot)',
    'Vehicle (Air)': 'Pojazd (powietrzny)',
    'Vehicle (Land)': 'Pojazd (lądowy)',
    'Vehicle (Space)': 'Pojazd (kosmiczny)',
    'Vehicle (Water)': 'Pojazd (wodny)',
    Wand: 'Różdżka',
    'Wondrous Item': 'Cudowny przedmiot',
    'Cudowny Przedmiot': 'Cudowny przedmiot',
    'Ekwipunek Podróżny': 'Ekwipunek podróżny',
    'Sprzęt poszukiwawczy': 'Ekwipunek podróżny',
    'Broń biała': 'Broń do walki wręcz',
    'Broń Dystansowa': 'Broń dystansowa',
    'Broń do Walki Wręcz': 'Broń do walki wręcz',
    'Ciężka Zbroja': 'Ciężka zbroja',
    'Ciężka zbroja': 'Ciężka zbroja',
    'Cudowny przedmiot': 'Cudowny przedmiot',
    'Jedzenie i Picie': 'Jedzenie i napoje',
    Laska: 'Pręt',
    'Lekka Zbroja': 'Lekka zbroja',
    'Lekka zbroja': 'Lekka zbroja',
    'Materiał Wybuchowy': 'Materiał wybuchowy',
    Napój: 'Mikstura',
    'Narzędzia Rzemieślnicze': 'Narzędzia rzemieślnicze',
    'Ognisko Rzucania Zaklęć': 'Ognisko rzucania zaklęć',
    'Pojazd (Kosmiczny)': 'Pojazd (kosmiczny)',
    'Pojazd (Ląd)': 'Pojazd (lądowy)',
    'Pojazd (Lądowy)': 'Pojazd (lądowy)',
    'Pojazd (Powietrzny)': 'Pojazd (powietrzny)',
    'Pojazd (Wodny)': 'Pojazd (wodny)',
    'Skarb (Dzieło Sztuki)': 'Skarb (dzieło sztuki)',
    'Skarb (Monety)': 'Skarb (monety)',
    'Skarb (monety)': 'Skarb (monety)',
    'Sztabka Handlowa': 'Sztabka handlowa',
    'Towar Handlowy': 'Towar handlowy',
    'Uprząż i Osprzęt': 'Uprząż i osprzęt',
    'Wariant Ogólny': 'Wariant ogólny',
    Wierzchowiec: 'Wierzchowiec',
    'Zestaw do Gier': 'Zestaw do gier',
    'Średnia Zbroja': 'Średnia zbroja',
    'Średni pancerz': 'Średnia zbroja',
    'Broń dystansowa': 'Broń dystansowa',
    Pręt: 'Pręt',
    Różdżka: 'Różdżka',
    'Ognisko rzucania zaklęć': 'Ognisko rzucania zaklęć',
  },
  rarity: {
    Artifact: 'Artefakt',
    Common: 'Pospolita',
    Legendary: 'Legendarna',
    Rare: 'Rzadka',
    Uncommon: 'Niepospolita',
    'Uncommon (+1), Rare (+2), or Very Rare (+3)':
      'Niepospolita (+1), rzadka (+2) lub bardzo rzadka (+3)',
    'Uncommon or Rare': 'Niepospolita lub rzadka',
    Varies: 'Zmienna',
    'Very Rare': 'Bardzo rzadka',
    'Bardzo Rzadka': 'Bardzo rzadka',
    'Bardzo rzadkie': 'Bardzo rzadka',
    Legendarna: 'Legendarna',
    Legendarny: 'Legendarna',
    Niepospolita: 'Niepospolita',
    'Nieznana (magiczna)': 'Nieznana (magiczna)',
    'Nieznany (magia)': 'Nieznana (magiczna)',
    Niezwykły: 'Niepospolita',
    Pospolita: 'Pospolita',
    Rzadka: 'Rzadka',
    Rzadki: 'Rzadka',
    Różnie: 'Zmienna',
    Wspólny: 'Pospolita',
    Zmienna: 'Zmienna',
  },
  weaponCategory: {
    martial: 'wojowa',
    simple: 'prosta',
  },
  featureType: {
    AS: 'AS',
    'Artificer Infusion': 'Infuzja artificera',
    'Class Feature': 'Cecha klasy',
    'Eldritch Invocation': 'Inwokacja nadnaturalna',
    'Fighting Style': 'Styl walki',
    Maneuver: 'Manewr',
    Metamagic: 'Metamagia',
    'Pact Boon': 'Dar paktu',
    Rune: 'Runa',
    Subclass: 'Podklasa',
    'Dobrodziejstwo Paktu': 'Dar paktu',
    'Inwokacja Nieziemska': 'Inwokacja nadnaturalna',
    'Niesamowita Inwokacja': 'Inwokacja nadnaturalna',
    'Napar rzemieślniczy': 'Infuzja artificera',
    'Pakt Boon': 'Dar paktu',
    'Styl walki': 'Styl walki',
  },
  ruleType: {
    Core: 'Podstawowa',
    'Fumble rule': 'Zasada Fumble',
    Optional: 'Opcjonalna',
    Rule: 'Zasada',
    Variant: 'Wariant',
    'Variant Optional': 'Wariant opcjonalny',
    Fakultatywny: 'Opcjonalna',
    Rdzeń: 'Podstawowa',
    Reguła: 'Zasada',
    Zasada: 'Zasada',
    Wariantowa: 'Wariant',
    'Wariant Opcjonalny': 'Wariant opcjonalny',
  },
  hazardType: {
    'Eldritch Storm': 'Burza nadnaturalna',
    'Environmental Hazard': 'Zagrożenie środowiskowe',
    'Generic Hazard': 'Ogólne zagrożenie',
    Hazard: 'Zagrożenie',
    'Magical Trap': 'Pułapka magiczna',
    'Mechanical Trap': 'Pułapka mechaniczna',
    Trap: 'Pułapka',
    Weather: 'Pogoda',
    'Wilderness Hazard': 'Zagrożenie dziczy',
    'Niebezpieczeństwo Dziczy': 'Zagrożenie dziczy',
    'Niebezpieczeństwo Środowiskowe': 'Zagrożenie środowiskowe',
    'Ogólne zagrożenie': 'Ogólne zagrożenie',
    'Pułapka Mechaniczna': 'Pułapka mechaniczna',
    'Zagrożenie dla środowiska': 'Zagrożenie środowiskowe',
    'Zagrożenie dzikiej przyrody': 'Zagrożenie dziczy',
    Zaryzykować: 'Zagrożenie',
    'Zwykłe Niebezpieczeństwo': 'Ogólne zagrożenie',
  },
  boonType: {
    Blessing: 'Błogosławieństwo',
    Boon: 'Dar',
    Charm: 'Urok',
    Curse: 'Przekleństwo',
    'Draconic Gift': 'Smoczy dar',
    'Fragment of Suffering': 'Fragment cierpienia',
    Inhabitation: 'Wcielenie',
    Other: 'Inne',
    'Piety Trait': 'Cecha pobożności',
    Czar: 'Urok',
    'Smoczy Dar': 'Smoczy dar',
    Inny: 'Inne',
    Życie: 'Wcielenie',
  },
  optionType: {
    'Background Race Feature': 'Cecha gatunku pochodzenia',
    'Character Secret': 'Sekret postaci',
    'Divine Gift': 'Dar boski',
    'Supernatural Gift': 'Dar nadnaturalny',
    'Boski Dar': 'Dar boski',
    'Funkcja wyścigu w tle': 'Cecha gatunku pochodzenia',
    'Nadprzyrodzony Dar': 'Dar nadnaturalny',
  },
  objectType: {
    'Generic Object': 'Obiekt ogólny',
    Object: 'Obiekt',
    'Siege Weapon': 'Broń oblężnicza',
    'Broń oblężnicza': 'Broń oblężnicza',
    'Machina Oblężnicza': 'Broń oblężnicza',
    'Obiekt ogólny': 'Obiekt ogólny',
    Obiekt: 'Obiekt',
  },
  cultBoonKind: {
    Boon: 'Dar',
    Cult: 'Kult',
  },
  cultBoonCategory: {
    Demonic: 'Demoniczny',
    Diabolical: 'Diabelski',
    'Elder Evil': 'Starsze zło',
    Elemental: 'Żywiołowy',
    Demoniczny: 'Demoniczny',
    Diaboliczny: 'Diabelski',
    Pierwiastkowy: 'Żywiołowy',
    'Starszy Zły': 'Starsze zło',
  },
};

const POLISH_DAMAGE_TYPES: Record<string, string> = {
  acid: 'kwas',
  bludgeoning: 'obuchowe',
  cold: 'zimno',
  fire: 'ogień',
  force: 'moc',
  lightning: 'piorun',
  necrotic: 'nekrotyczne',
  piercing: 'kłute',
  poison: 'trucizna',
  psychic: 'psychiczne',
  radiant: 'promieniste',
  slashing: 'sieczne',
  thunder: 'gromu',
  kwas: 'kwas',
  obuchowe: 'obuchowe',
  zimno: 'zimno',
  ogien: 'ogień',
  moc: 'moc',
  piorun: 'piorun',
  nekrotyczne: 'nekrotyczne',
  nekrotyczny: 'nekrotyczne',
  nekrotyczna: 'nekrotyczne',
  klute: 'kłute',
  trucizna: 'trucizna',
  trujacy: 'trucizna',
  trujaca: 'trucizna',
  psychiczne: 'psychiczne',
  psychiczny: 'psychiczne',
  psychiczna: 'psychiczne',
  promieniste: 'promieniste',
  swietliste: 'promieniste',
  blask: 'promieniste',
  sieczne: 'sieczne',
  grom: 'gromu',
  grzmot: 'gromu',
  dzwiek: 'gromu',
  silowe: 'moc',
  sila: 'moc',
  blyskawica: 'piorun',
  blyskawice: 'piorun',
  zatruc: 'trucizna',
  tluczone: 'obuchowe',
  przebijajace: 'kłute',
  ciete: 'sieczne',
};

const DAMAGE_FIELDS = new Set([
  'damage',
  'damageType',
  'immune',
  'immunities',
  'resist',
  'resistance',
  'resistances',
  'vulnerable',
  'vulnerabilities',
]);

const POLISH_LANGUAGE_NAMES: Record<string, string> = {
  Abyssal: 'Otchłani',
  Otchłanny: 'Otchłani',
  Celestial: 'Niebiański',
  Niebianin: 'Niebiański',
  Common: 'Wspólny',
  Aquan: 'Akwan',
  Aqua: 'Akwan',
  Aquana: 'Akwan',
  Aquanie: 'Akwan',
  Deep: 'Głębia',
  Draconic: 'Smoczy',
  Dwarvish: 'Krasnoludzki',
  Elvish: 'Elficki',
  Giant: 'Gigantów',
  Gianta: 'Gigantów',
  Gnomish: 'Gnomi',
  Gnome: 'Gnomi',
  Gnom: 'Gnomi',
  Goblin: 'Gobliński',
  Halfling: 'Niziołczy',
  Infernal: 'Piekielny',
  Orc: 'Orkowy',
  Ork: 'Orkowy',
  Primordial: 'Pierwotny',
  Sylvan: 'Sylvański',
  Undercommon: 'Wspólny Podmroku',
  Podmowa: 'Wspólny Podmroku',
  Dwarven: 'Krasnoludzki',
  Elven: 'Elficki',
  Orkish: 'Orkowy',
  Terran: 'Terrański',
  Terrański: 'Terrański',
  Druidic: 'Druidyczny',
  Druidyczny: 'Druidyczny',
  Powszechny: 'Wspólny',
  Pospolity: 'Wspólny',
  Wspólny: 'Wspólny',
  Wspólne: 'Wspólny',
  Krasnolud: 'Krasnoludzki',
  Krasnoludzkie: 'Krasnoludzki',
  Elf: 'Elficki',
  Elfy: 'Elficki',
  Sylwan: 'Sylvański',
  Sylwański: 'Sylvański',
  Otchłań: 'Otchłani',
  Niebiańska: 'Niebiański',
  Smocza: 'Smoczy',
  Smoczy: 'Smoczy',
  Piekielna: 'Piekielny',
  Piekielny: 'Piekielny',
  Podwspólny: 'Wspólny Podmroku',
  Podmroku: 'Wspólny Podmroku',
  Gobliński: 'Gobliński',
  Goblinski: 'Gobliński',
  Goblinowy: 'Gobliński',
  Goblinie: 'Gobliński',
  Gigancki: 'Gigantów',
  Gigant: 'Gigantów',
  Olbrzymi: 'Gigantów',
  Gigantyczny: 'Gigantów',
  Gigantyczna: 'Gigantów',
  Infernalny: 'Piekielny',
  Druidzki: 'Druidyczny',
  Druidyzm: 'Druidyczny',
};

const POLISH_HABITATS: Record<string, string> = {
  Arctic: 'Arktyka',
  Coastal: 'Wybrzeże',
  Desert: 'Pustynia',
  Forest: 'Las',
  Grassland: 'Równiny',
  Hill: 'Wzgórza',
  Mountain: 'Góry',
  Swamp: 'Bagna',
  Underdark: 'Podmrok',
  Underwater: 'Podwodne',
  Urban: 'Miejski',
  Abyss: 'Otchłań',
  'Nine Hells': 'Dziewięć Piekieł',
  Shadowfell: 'Kraina Cieni',
  Feywild: 'Kraina Feerii',
  'Kraina Wróżek': 'Kraina Feerii',
  'Krainy Wróżek': 'Kraina Feerii',
  'Kraina Wróżeków': 'Kraina Feerii',
  Cień: 'Kraina Cieni',
  Cienista: 'Kraina Cieni',
  'Cienista Otchłań': 'Kraina Cieni',
  Limbo: 'Limbo',
  Lower: 'Niższe Plany',
  Upper: 'Wyższe Plany',
  Elemental: 'Plany Żywiołów',
  Elementarny: 'Plany Żywiołów',
  Elementarne: 'Plany Żywiołów',
  Żywiołowy: 'Plany Żywiołów',
  Air: 'Powietrze',
  'Trawiasta Równina': 'Równiny',
  'Trawiaste Równiny': 'Równiny',
  Trawiasta: 'Równiny',
  Trawiasty: 'Równiny',
  Trawiaste: 'Równiny',
  Łąki: 'Równiny',
  Preria: 'Równiny',
  'Użytki zielone': 'Równiny',
  Łąka: 'Równiny',
  Przybrzeżne: 'Wybrzeże',
  Przybrzeżny: 'Wybrzeże',
  Leśne: 'Las',
  Lasy: 'Las',
  Arktyczne: 'Arktyka',
  Arktyczny: 'Arktyka',
  Wzgórze: 'Wzgórza',
  Górskie: 'Góry',
  Górska: 'Góry',
  Góra: 'Góry',
  Bagno: 'Bagna',
  Miejski: 'Miejski',
  Pustyni: 'Pustynia',
  Pustynie: 'Pustynia',
  Podwodny: 'Podwodne',
  Podmrocze: 'Podmrok',
  Planarne: 'Planarne',
  Płaszczyznowy: 'Planarne',
  Planarny: 'Planarne',
  Planar: 'Planarne',
  Płaska: 'Planarne',
  Górne: 'Wyższe Plany',
  Górny: 'Wyższe Plany',
  Dolne: 'Niższe Plany',
  Dolny: 'Niższe Plany',
  'Niższe Płaszczyzny': 'Niższe Plany',
  Woda: 'Podwodne',
  Powietrzne: 'Powietrze',
  'Płaszczyznowy (Żywiołowy Plan Ognia)': 'Planarne (Żywiołowy Plan Ognia)',
  Fejwild: 'Kraina Feerii',
  Mrocznoplan: 'Kraina Cieni',
  'Mroczna Otchłań': 'Kraina Cieni',
  Miasto: 'Miejski',
};

const POLISH_TREASURE: Record<string, string> = {
  Any: 'Dowolny',
  Arcana: 'Arkana',
  Armaments: 'Uzbrojenie',
  Implements: 'Narzędzia',
  Individual: 'Indywidualny',
  Relics: 'Relikty',
  Goods: 'Dobra',
  Tools: 'Narzędzia',
  None: 'Brak',
  Narzędzia: 'Narzędzia',
  Implementuje: 'Narzędzia',
  Implementy: 'Narzędzia',
  Indywidualny: 'Indywidualny',
  Indywidualne: 'Indywidualny',
  Osoba: 'Indywidualny',
  Uzbrojenie: 'Uzbrojenie',
  Relikwie: 'Relikty',
  Relikty: 'Relikty',
  Arkaniczny: 'Arkana',
  Tajemny: 'Arkana',
  'Wiedza Tajemna': 'Arkana',
  Magia: 'Arkana',
};

const POLISH_CONDITION_NAMES: Record<string, string> = {
  blinded: 'Oślepiony',
  charmed: 'Oczarowany',
  deafened: 'Ogłuchły',
  exhaustion: 'Wyczerpanie',
  frightened: 'Przestraszony',
  grappled: 'Chwycony',
  incapacitated: 'Bezradny',
  invisible: 'Niewidzialny',
  paralyzed: 'Sparaliżowany',
  petrified: 'Skamieniały',
  poisoned: 'Zatruty',
  prone: 'Powalony',
  restrained: 'Unieruchomiony',
  stunned: 'Oszołomiony',
  unconscious: 'Nieprzytomny',
  oślepienie: 'Oślepiony',
  choroba: 'Choroba',
  oczarowanie: 'Oczarowany',
  ogłuchnięcie: 'Ogłuchły',
  przerażenie: 'Przestraszony',
  pochwycenie: 'Chwycony',
  chwycenie: 'Chwycony',
  chwytanie: 'Chwycony',
  obezwładnienie: 'Bezradny',
  paraliż: 'Sparaliżowany',
  sparaliżowanie: 'Sparaliżowany',
  petryfikacja: 'Skamieniały',
  skamienienie: 'Skamieniały',
  zatrucie: 'Zatruty',
  powalenie: 'Powalony',
  leżenie: 'Powalony',
  unieruchomienie: 'Unieruchomiony',
  ogłuszenie: 'Oszołomiony',
  nieprzytomność: 'Nieprzytomny',
  wycieńczenie: 'Wyczerpanie',
};

const POLISH_SPACES: Record<string, string> = {
  Cramped: 'Zatłoczona',
  Roomy: 'Przestronna',
  Vast: 'Ogromna',
  Niezrozumiały: 'Zatłoczona',
  Ciasny: 'Zatłoczona',
  Pojemny: 'Przestronna',
  Przestronny: 'Przestronna',
  Rozległy: 'Ogromna',
  Zatłoczona: 'Zatłoczona',
  Przestronna: 'Przestronna',
  Ogromna: 'Ogromna',
};

const POLISH_ORDERS: Record<string, string> = {
  Empower: 'Wzmacnianie',
  Craft: 'Wytwarzanie',
  Research: 'Badania',
  Recruit: 'Rekrutacja',
  Trade: 'Handel',
  Harvest: 'Zbiory',
  Umożliwiać: 'Wzmacnianie',
  Rzemiosło: 'Wytwarzanie',
  Rekrut: 'Rekrutacja',
  Zbiór: 'Zbiory',
};

const POLISH_TERRAINS: Record<string, string> = {
  Air: 'Powietrze',
  Land: 'Ląd',
  Sea: 'Morze',
  Space: 'Kosmos',
  Powietrze: 'Powietrze',
  Ląd: 'Ląd',
  Morze: 'Morze',
  Kosmos: 'Kosmos',
  Grunt: 'Ląd',
  Przestrzeń: 'Kosmos',
  Ziemia: 'Ląd',
  ziemia: 'Ląd',
};

const POLISH_DOMAINS: Record<string, string> = {
  Arcana: 'Arkana',
  Death: 'Śmierć',
  Forge: 'Kuźnia',
  Grave: 'Grobowiec',
  Knowledge: 'Wiedza',
  Life: 'Życie',
  Light: 'Światło',
  Nature: 'Natura',
  Order: 'Porządek',
  Peace: 'Pokój',
  Tempest: 'Burza',
  Trickery: 'Oszustwo',
  Twilight: 'Zmierzch',
  War: 'Wojna',
  Unknown: 'Nieznana',
  Grób: 'Grobowiec',
  Sztorm: 'Burza',
  Naciągnięcie: 'Oszustwo',
};

const POLISH_DIETS: Record<string, string> = {
  'Contains meat': 'Zawiera mięso',
  Vegetarian: 'Wegetariańskie',
  Vegan: 'Wegańskie',
  Wegetariański: 'Wegetariańskie',
};

const POLISH_TYPICAL_SPEAKERS: Record<string, string> = {
  Dragons: 'Smoki',
  Elementals: 'Żywiołaki',
  Gods: 'Bogowie',
  Humans: 'Ludzie',
  Demons: 'Demony',
  Devils: 'Diabły',
  Dwarves: 'Krasnoludy',
  Elves: 'Elfy',
  Gnomes: 'Gnomy',
  Goblins: 'Gobliny',
  Halflings: 'Niziołki',
  Giants: 'Olbrzymy',
  Orcs: 'Orki',
  'Fey creatures': 'Stworzenia feja',
  'Mulan Ethnic Group': 'Grupa etniczna Mulan',
  'Calishite Ethnic Group': 'Grupa etniczna Kalishitów',
};

const POLISH_SENSES: Record<string, string> = {
  darkvision: 'widzenie w ciemności',
  blindsight: 'ślepowidzenie',
  tremorsense: 'wyczuwanie drgań',
  truesight: 'prawdziwe widzenie',
};

const POLISH_PROPERTIES: Record<string, string> = {
  Ammunition: 'Amunicja',
  'Ammunition (Firearm)': 'Amunicja (broń palna)',
  Automatic: 'Automatyczna',
  'Burst Fire': 'Ogień seryjny',
  Finesse: 'Finezja',
  Heavy: 'Ciężka',
  Light: 'Lekka',
  Loading: 'Ładowanie',
  Reach: 'Zasięg',
  Reload: 'Przeładowanie',
  Special: 'Specjalna',
  Thrown: 'Rzucana',
  'Two-Handed': 'Dwuręczna',
  Versatile: 'Wszechstronna',
  'Amunicja (Broń Palna)': 'Amunicja (broń palna)',
  'Ogień Seryjny': 'Ogień seryjny',
  Finezyjna: 'Finezja',
  Lekkość: 'Lekka',
  Światło: 'Lekka',
  Rzucanie: 'Rzucana',
  Rzucenie: 'Rzucana',
  Rzucony: 'Rzucana',
  Rzucane: 'Rzucana',
  Wszechstronność: 'Wszechstronna',
  Wszechstronny: 'Wszechstronna',
  Ciężki: 'Ciężka',
  Dwuręczny: 'Dwuręczna',
};

const CREATURE_DESCRIPTOR_VALUES: Record<string, string> = {
  'Any Race': 'Dowolna rasa',
  Archfey: 'Arcyfej',
  Beholder: 'Beholder',
  'Brother Broumane': 'Brat Broumane',
  'Cloud Giant': 'Chmurny olbrzym',
  Cattle: 'Bydło',
  Cleric: 'Kapłan',
  Changeling: 'Odmieniec',
  Drow: 'Drow',
  'Dire Corby': 'Dire Corby',
  Dinosaur: 'Dinozaur',
  Dragonborn: 'Smocze dziecię',
  Druid: 'Druid',
  Demon: 'Demon',
  Devil: 'Diabeł',
  Dwarf: 'Krasnolud',
  Elf: 'Elf',
  Elemental: 'Żywiołak',
  Fey: 'Fej',
  'Fire Giant': 'Ognisty olbrzym',
  'Frost Giant': 'Mrozowy olbrzym',
  Genasi: 'Genasi',
  Genie: 'Dżin',
  Gith: 'Gith',
  Gnome: 'Gnom',
  Goblin: 'Goblin',
  Goblinoid: 'Goblinoid',
  Goliath: 'Goliat',
  Grung: 'Grung',
  Halfling: 'Niziołek',
  Hag: 'Wiedźma',
  Harengon: 'Harengon',
  Human: 'Człowiek',
  'Half-black Dragon': 'Półczarny smok',
  'Half-dragon': 'Półsmok',
  'Half-elf': 'Półelf',
  'Half-orc': 'Półork',
  Healer: 'Uzdrowiciel',
  Inevitable: 'Nieuchronny',
  Kender: 'Kender',
  Kenku: 'Kenku',
  Kobold: 'Kobold',
  'Kuo-toa': 'Kuo-toa',
  Leonin: 'Leonin',
  Lizardfolk: 'Jaszczuroludzie',
  'Hill Giant': 'Wzgórzowy olbrzym',
  'Stone Giant': 'Kamienny olbrzym',
  'Storm Giant': 'Burzowy olbrzym',
  Locathah: 'Locathah',
  Lycanthrope: 'Likantrop',
  Mage: 'Mag',
  Medusa: 'Meduza',
  Mind: 'Umysł',
  'Mind Flayer': 'Łupieżca umysłów',
  Monk: 'Mnich',
  Mongrelfolk: 'Kundle',
  Ogre: 'Ogr',
  Orc: 'Ork',
  Paladin: 'Paladyn',
  Quaggoth: 'Quaggoth',
  Ranger: 'Łowca',
  Sahuagin: 'Sahuagin',
  'Shadar-kai': 'Shadar-kai',
  Shapeshifter: 'Zmiennokształtny',
  Shapechanger: 'Zmiennokształtny',
  Shifter: 'Zmiennokształtny',
  Sorcerer: 'Zaklinacz',
  'Lava Child': 'Dziecko lawy',
  Tabaxi: 'Tabaxi',
  Tiefling: 'Diabelstwo',
  Titan: 'Tytan',
  'Thri-kreen': 'Tri-kriny',
  Triton: 'Tryton',
  'Simic Hybrid': 'Hybryda Simic',
  Tortle: 'Żółw',
  Troglodyte: 'Troglodyta',
  Vampire: 'Wampir',
  Warforged: 'Warforged',
  Warlock: 'Czarnoksiężnik',
  Wizard: 'Czarodziej',
  Xvart: 'Xvart',
  'Yuan-ti': 'Yuan-ti',
  Yugoloth: 'Yugoloth',
  'zmienny kształt': 'Zmiennokształtny',
  Zmiennokształtny: 'Zmiennokształtny',
  'Zmieniacz Kształtu': 'Zmiennokształtny',
  'Dowolna Rasa': 'Dowolna rasa',
  'dowolna rasa': 'Dowolna rasa',
  'Łupieżca Umysłów': 'Łupieżca umysłów',
  'Wielki Mistrz': 'Wielki mistrz',
  'Dorosły Chromatyczny': 'Dorosły chromatyczny',
  'Młody Klejnotowy': 'Młody klejnotowy',
  'Smocze Dziecię': 'Smocze dziecię',
  'Pół-czarny Smok': 'Półczarny smok',
  'Pół-smok': 'Półsmok',
  'Pół-elf': 'Półelf',
  'Pół-ork': 'Półork',
  Goblinowy: 'Goblinowy',
};

const POLISH_CASTING_TIMES: Record<string, string> = {
  '1 reaction, which you take when a creature you can see dies within 120 feet of you.':
    '1 reakcja, którą wykonujesz, gdy stworzenie, które widzisz, umiera w odległości do 120 stóp od ciebie.',
  'Reaction, which you take when a creature within range is reduced to 0 Hit Points or fails a Death Saving Throw':
    'Reakcja, którą wykonujesz, gdy stworzenie w zasięgu zostanie zredukowane do 0 PW lub nie zda rzutu obronnego przed śmiercią',
};

function localizeMeasure(value: string): string {
  return value.replace(
    /(\d+)\s+(feet|foot|miles?|minutes?|hours?|days?)\b/gi,
    (_, amount, unit) => {
      const number = Number(amount);
      const units: Record<string, string> = {
        day: number === 1 ? 'dzień' : 'dni',
        days: 'dni',
        feet: number === 1 ? 'stopa' : 'stóp',
        foot: number === 1 ? 'stopa' : 'stóp',
        hour: number === 1 ? 'godzina' : 'godzin',
        hours: 'godzin',
        mile: number === 1 ? 'mila' : 'mil',
        miles: 'mil',
        minute: number === 1 ? 'minuta' : 'minut',
        minutes: 'minut',
      };
      return `${amount} ${units[unit.toLowerCase()] ?? unit}`;
    },
  );
}

function localizeDurationMeasure(value: string): string {
  return value.replace(/(\d+)\s+(minutes?|hours?|days?)\b/gi, (_, amount, unit) => {
    const units: Record<string, string> = {
      day: 'dnia',
      days: 'dni',
      hour: 'godziny',
      hours: 'godzin',
      minute: 'minuty',
      minutes: 'minut',
    };
    return `${amount} ${units[unit.toLowerCase()] ?? unit}`;
  });
}

function localizeSpeed(value: string): string {
  return value
    .replace(/(\d+)-foot radius/gi, 'promień $1 stóp')
    .replace(
      /(\d+)-foot (cone|cube|emanation|hemisphere|line|sphere)/gi,
      (_, amount, shape) => {
        const shapes: Record<string, string> = {
          cone: 'stożek',
          cube: 'sześcian',
          emanation: 'emanacja',
          hemisphere: 'półkula',
          line: 'linia',
          sphere: 'kula',
        };
        return `${shapes[shape.toLowerCase()] ?? shape} ${amount} stóp`;
      },
    )
    .replace(/\bClimb\b/gi, 'wspinaczka')
    .replace(/\bFly\b/gi, 'lot')
    .replace(/\bSwim\b/gi, 'pływanie')
    .replace(/\bBurrow\b/gi, 'kopanie')
    .replace(/\bLand only\b/gi, 'tylko ląd')
    .replace(/\bAir only\b/gi, 'tylko powietrze')
    .replace(/\bWater only\b/gi, 'tylko woda')
    .replace(/(\d+)\s+(?:feet?|ft\.?)(?=\s|[;,.()]|$)/gi, '$1 stóp');
}

function normalizedValue(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('pl-PL')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/g, 'l');
}

function lookupValue(values: Record<string, string>, value: string): string | undefined {
  const exact = values[value];
  if (exact) return exact;
  const normalized = normalizedValue(value);
  const key = Object.keys(values).find(
    (candidate) => normalizedValue(candidate) === normalized,
  );
  return key ? values[key] : undefined;
}

function preserveTokenCase(source: string, localized: string): string {
  if (!source.trim()) return source;
  const result = /^\p{Lu}/u.test(source.trim())
    ? localized[0]!.toLocaleUpperCase('pl-PL') + localized.slice(1)
    : localized[0]!.toLocaleLowerCase('pl-PL') + localized.slice(1);
  const leading = source.match(/^\s*/u)?.[0] ?? '';
  const trailing = source.match(/\s*$/u)?.[0] ?? '';
  return `${leading}${result}${trailing}`;
}

function localizeDelimitedValue(value: string, values: Record<string, string>): string {
  const exact = lookupValue(values, value);
  if (exact) return preserveTokenCase(value, exact);
  return value.replace(/[^,;]+/gu, (token) => {
    const localized = lookupValue(values, token);
    return localized ? preserveTokenCase(token, localized) : token;
  });
}

function localizeOutsideMarkup(
  value: string,
  localize: (part: string) => string,
): string {
  return value
    .split(/(\{@[^}]*\})/gu)
    .map((part) => (part.startsWith('{@') ? part : localize(part)))
    .join('');
}

function localizeFilterLabels(value: string, values: Record<string, string>): string {
  return value.replace(/\{@filter ([^|}]*)/gu, (_match, label: string) => {
    const localized = localizeDelimitedValue(label, values);
    return `{@filter ${localized === label ? localizeKnownWords(label, values) : localized}`;
  });
}

function localizeKnownWords(value: string, values: Record<string, string>): string {
  return value.replace(/[\p{L}\p{M}]+/gu, (token) => {
    const localized = lookupValue(values, token);
    return localized ? preserveTokenCase(token, localized) : token;
  });
}

function localizeSenses(value: string): string {
  return localizeMeasure(
    localizeSpeed(
      localizeKnownWords(
        value
          .replace(/\bPassive Perception\b/gi, 'Percepcja pasywna')
          .replace(/\bBierna Percepcja\b/gi, 'Percepcja pasywna')
          .replace(/\bPercepcja bierna\b/gi, 'Percepcja pasywna'),
        {
          ...POLISH_SENSES,
          Passive: 'Pasywna',
          Perception: 'Percepcja',
        },
      ),
    ),
  );
}

function localizeLanguages(value: string): string {
  const withLabels = localizeFilterLabels(value, POLISH_LANGUAGE_NAMES);
  return localizeOutsideMarkup(withLabels, (part) =>
    localizeKnownWords(part, POLISH_LANGUAGE_NAMES),
  );
}

function localizeHabitat(value: string): string {
  const withLabels = localizeFilterLabels(value, POLISH_HABITATS);
  return localizeOutsideMarkup(withLabels, (part) =>
    localizeDelimitedValue(part, POLISH_HABITATS),
  );
}

function localizeCreatureType(value: string): string {
  const match = /^(.+?)(?:\s*\((.*)\))?$/.exec(value.trim());
  if (!match) return value;
  const base = lookupValue(POLISH_VALUES.creatureType!, match[1]!);
  if (!base) return value;
  const descriptors = match[2]
    ?.split(',')
    .map((part) => lookupValue(CREATURE_DESCRIPTOR_VALUES, part) ?? part.trim())
    .join(', ');
  return descriptors ? `${base} (${descriptors})` : base;
}

function localizeDamageToken(token: string): string {
  const localized = POLISH_DAMAGE_TYPES[normalizedValue(token)];
  if (!localized) return token;
  return /^\p{Lu}/u.test(token)
    ? localized[0]!.toLocaleUpperCase('pl-PL') + localized.slice(1)
    : localized;
}

function localizeDamageValue(value: string): string {
  const exact = localizeDamageToken(value.trim());
  if (exact !== value.trim()) {
    return value.trim() === value ? exact : value.replace(value.trim(), exact);
  }
  return value.replace(/[\p{L}\p{M}]+/gu, (token) => localizeDamageToken(token));
}

function localizeFieldValue(value: string, field: string): string {
  if (field === 'creatureType') return localizeCreatureType(value);
  if (DAMAGE_FIELDS.has(field)) return localizeDamageValue(value);
  if (field === 'languages') return localizeLanguages(value);
  if (field === 'habitat') return localizeHabitat(value);
  if (field === 'treasure') return localizeDelimitedValue(value, POLISH_TREASURE);
  if (field === 'conditionImmunities')
    return localizeDelimitedValue(value, POLISH_CONDITION_NAMES);
  if (field === 'space') return localizeDelimitedValue(value, POLISH_SPACES);
  if (field === 'orders') return localizeDelimitedValue(value, POLISH_ORDERS);
  if (field === 'terrain') return localizeDelimitedValue(value, POLISH_TERRAINS);
  if (field === 'domains') return localizeDelimitedValue(value, POLISH_DOMAINS);
  if (field === 'diet') return localizeDelimitedValue(value, POLISH_DIETS);
  if (field === 'typicalSpeakers')
    return localizeDelimitedValue(value, POLISH_TYPICAL_SPEAKERS);
  if (field === 'senses') return localizeSenses(value);
  if (field === 'serves')
    return value
      .replace(/\bas an appetizer\b/gi, 'jako przystawka')
      .replace(/\bas a snack\b/gi, 'jako przekąska')
      .replace(/jako przekąskę/gi, 'jako przekąska')
      .replace(/\bpeople\b/gi, 'osób')
      .replace(/\bcreatures\b/gi, 'stworzeń');
  if (field === 'speed') return localizeSpeed(value);
  if (field === 'size') field = 'objectSize';
  if (field === 'castingTime') {
    if (POLISH_CASTING_TIMES[value]) return POLISH_CASTING_TIMES[value];
    if (value === 'Action') return 'Akcja';
    if (value === 'Bonus Action') return 'Akcja dodatkowa';
    if (value === 'Reaction') return 'Reakcja';
    if (/^\d+\s+action\b/i.test(value)) return value.replace(/action/gi, 'akcja');
    if (/^\d+\s+bonus\b/i.test(value)) return value.replace(/bonus/gi, 'akcja dodatkowa');
    if (/^\d+\s+reaction\b/i.test(value)) return value.replace(/reaction/gi, 'reakcja');
    if (/^reaction\b/i.test(value)) {
      return value
        .replace(/^reaction/i, 'Reakcja')
        .replace(/\bafter the trigger\b/gi, 'po wyzwalaczu');
    }
    return localizeMeasure(value);
  }
  if (field === 'duration') {
    if (value === 'Instantaneous') return 'Natychmiastowa';
    if (value === 'Special') return 'Specjalna';
    if (value === 'Until dispelled') return 'Do rozproszenia';
    const concentration = /^Concentration, up to (.+)$/i.exec(value);
    return concentration
      ? `Koncentracja, do ${localizeDurationMeasure(concentration[1]!).replace(/\bor\b/gi, 'lub')}`
      : localizeDurationMeasure(value).replace(/\bor\b/gi, 'lub');
  }
  if (field === 'range') {
    if (value === 'Self') return 'Siebie';
    if (value === 'Self (point)') return 'Siebie (punkt)';
    if (value === 'Touch') return 'Dotyk';
    if (value === 'Sight') return 'Widoczność';
    if (value === 'Special') return 'Specjalny';
    if (value === 'Unlimited') return 'Nieograniczony';
    return localizeMeasure(localizeSpeed(value));
  }
  if (field === 'properties') {
    return value
      .split(',')
      .map((part) => lookupValue(POLISH_PROPERTIES, part) ?? part.trim())
      .join(', ');
  }
  const fieldValues = POLISH_VALUES[field];
  const exact = fieldValues && lookupValue(fieldValues, value);
  if (exact) return exact;
  if (field === 'featureType' && value.includes(',')) {
    return value
      .split(',')
      .map((part) => lookupValue(POLISH_VALUES.featureType!, part) ?? part.trim())
      .join(', ');
  }
  return value;
}

export function localizeCompendiumValue(
  value: string | undefined,
  locale: Locale,
  field: string,
): string | undefined {
  if (!value || locale !== 'pl') return value;
  const lookupField =
    field === 'kind' ? 'conditionKind' : field === 'size' ? 'objectSize' : field;
  return localizeFieldValue(value, lookupField);
}
