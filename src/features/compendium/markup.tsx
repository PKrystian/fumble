import { Fragment, type ReactNode } from 'react';
import { parseExpression } from '@/features/dice/engine';
import { RollableDice } from '@/features/dice/RollableDice';
import { RechargeRoll } from '@/features/dice/RechargeRoll';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/locales';
import { translate } from '@/i18n/useT';
import { localizeFormula } from './formula';
import { ReferenceLink } from './ReferenceLink';
import { getBook } from '@/features/books/data';
import { bookAnchorHash } from '@/features/books/readerAnchor';
import { Link } from '@/i18n/path';

const LINKABLE: Record<string, string> = {
  spell: 'spells',
  condition: 'conditions',
  status: 'conditions',
  disease: 'conditions',
  feat: 'feats',
  background: 'backgrounds',
  race: 'species',
  item: 'items',
  firearm: 'firearms',
  class: 'classes',
  creature: 'bestiary',
  action: 'actions',
  optfeature: 'optionalfeatures',
  psionic: 'psionics',
  deity: 'deities',
  hazard: 'hazards',
  reward: 'boons',
  variantrule: 'rules',
  skill: 'skills',
  sense: 'senses',
  language: 'languages',
  object: 'objects',
  vehicle: 'vehicles',
  recipe: 'recipes',
  facility: 'facilities',
  cult: 'cultsboons',
  boon: 'cultsboons',
  itemMastery: 'masteries',
  charoption: 'charoptions',
  table: 'tables',
  deck: 'decks',
  card: 'decks',
};

const SAVE_ABILITY: Record<Locale, Record<string, string>> = {
  en: {
    str: 'Strength',
    dex: 'Dexterity',
    con: 'Constitution',
    int: 'Intelligence',
    wis: 'Wisdom',
    cha: 'Charisma',
  },
  pl: {
    str: 'Siły',
    dex: 'Zręczności',
    con: 'Kondycji',
    int: 'Inteligencji',
    wis: 'Roztropności',
    cha: 'Charyzmy',
  },
};

const ATTACK_TYPES: Record<Locale, Record<string, string>> = {
  en: {
    mw: 'Melee Weapon Attack:',
    rw: 'Ranged Weapon Attack:',
    'mw,rw': 'Melee or Ranged Weapon Attack:',
    ms: 'Melee Spell Attack:',
    rs: 'Ranged Spell Attack:',
    'ms,rs': 'Melee or Ranged Spell Attack:',
    m: 'Melee Attack Roll:',
    r: 'Ranged Attack Roll:',
    'm,r': 'Melee or Ranged Attack Roll:',
  },
  pl: {
    mw: 'Atak Bronią do Walki Wręcz:',
    rw: 'Atak Bronią Dystansową:',
    'mw,rw': 'Atak Bronią do Walki Wręcz lub Dystansową:',
    ms: 'Atak Zaklęciem w Zwarciu:',
    rs: 'Atak Zaklęciem na Dystans:',
    'ms,rs': 'Atak Zaklęciem w Zwarciu lub na Dystans:',
    m: 'Rzut na Atak w Zwarciu:',
    r: 'Rzut na Atak Dystansowy:',
    'm,r': 'Rzut na Atak w Zwarciu lub Dystansowy:',
  },
};

const POLISH_LANGUAGE_LABELS: Record<string, string> = {
  abyssal: 'Otchłani',
  aquan: 'Akwan',
  celestial: 'Niebiański',
  common: 'Wspólny',
  'deep speech': 'Głęboka Mowa',
  draconic: 'Smoczy',
  druidic: 'Druidyczny',
  dwarvish: 'Krasnoludzki',
  elvish: 'Elficki',
  giant: 'Gigantów',
  gnomish: 'Gnomi',
  goblin: 'Gobliński',
  infernal: 'Piekielny',
  primordial: 'Pierwotny',
  sylvan: 'Sylvański',
  terran: 'Terrański',
  undercommon: 'Wspólny Podmroku',
};

const POLISH_REFERENCE_LABELS: Record<string, string> = {
  "artisan's tools": 'narzędzia rzemieślnicze',
  implements: 'Narzędzia',
  implementuje: 'Narzędzia',
  implementy: 'Narzędzia',
  'implements tables': 'Tabele narzędzi',
  'implementuje tabele': 'Tabele narzędzi',
  'feywild trinkets table': 'tabela błyskotek z Krainy Feerii',
  'feywild trinkets': 'Bibeloty z Krainy Feerii',
  'ghost orchids': 'Widmowe Orchidee',
  'hunting rifle': 'Karabin Myśliwski',
  'black ghost orchid seed': 'Nasiono Czarnej Orchidei-Widma',
  'white ghost orchid seed': 'Nasiona orchidei Biały Duch',
  'unrolling scroll': 'Rozwijany Zwój',
  '1st-level wizard spell': 'zaklęcie czarodzieja 1. poziomu',
  '2nd-order powers': 'Moce 2. kręgu',
  '3rd-order powers': 'Moce 3. kręgu',
  '4th-order powers': 'Moce 4. kręgu',
  '5th-order powers': 'Moce 5. kręgu',
  '6th-order powers': 'Moce 6. kręgu',
  "astral adventurer's guide": 'Przewodnik Astralnego Poszukiwacza Przygód',
  "baldur's gate: descent into avernus": 'Wrota Baldura: Zstąpienie do Avernusu',
  'bigby presents: glory of the giants': 'Bigby Przedstawia: Chwałę Olbrzymów',
  "boo's astral menagerie": 'Astralny Zwierzyniec Boo',
  'book of kith and kin': 'Księga Krewnych i Rodziny',
  'cast a spell': 'Rzuć Zaklęcie',
  'churning hull': 'Wirujący Kadłub',
  'concussive rounds': 'Ogłuszające Pociski',
  'curse of strahd': 'Klątwa Strahda',
  "dungeon master's guide": 'Podręcznik Mistrza Podziemi',
  'dragonlance: shadow of the dragon queen': 'Dragonlance: Cień Smoczej Królowej',
  'dragon sails': 'Smocze Żagle',
  'eldritch mind': 'Nadnaturalny Umysł',
  'eberron: rising from the last war': 'Eberron: Powstanie z Ostatniej Wojny',
  'ever-full sails': 'Zawsze Pełne Żagle',
  'explosive rounds': 'Wybuchowe Pociski',
  'fey wanderer': 'Wróżkowy Wędrowiec',
  "fizban's treasury of dragons": 'Skarbiec Smoków Fizbana',
  flames: 'Płomienie',
  'flapjack the flumph': 'Flapjack, flumph',
  fool: 'Głupiec',
  gem: 'Klejnot',
  'ghosts of saltmarsh': 'Duchy Saltmarsh',
  'grasping rounds': 'Chwytające Pociski',
  'hoard of the dragon queen': 'Skarb Smoczej Królowej',
  'horror nimbus': 'Nimb Grozy',
  idiot: 'Idiota',
  jester: 'Błazen',
  knight: 'Rycerz',
  moon: 'Księżyc',
  'manifest a power': 'manifestuj moc',
  'mordenkainen presents: monsters of the multiverse':
    'Mordenkainen Przedstawia: Potwory Multiwersum',
  "morte's planar parade": "Planarna Parada Morte'a",
  'monster manual': 'Podręcznik Potworów',
  'monsters of the multiverse': 'Potwory Multiwersum',
  "player's handbook": 'Podręcznik Gracza',
  'reinforced hull': 'Wzmocniony Kadłub',
  'rise of tiamat': 'Powstanie Tiamat',
  ruin: 'Ruina',
  'screaming sails': 'Wrzeszczące Żagle',
  'scything oars': 'Koszące Wiosła',
  'shadow jaunt': 'Cienisty Skok',
  "sword coast adventurer's guide": 'Przewodnik Poszukiwacza Przygód po Wybrzeżu Mieczy',
  "tasha's cauldron of everything": 'Kociołek Wszystkiego Tashy',
  "taskmaster's drums": 'Bębny Nadzorcy',
  'the rise of tiamat': 'Powstanie Tiamat',
  'the void': 'Pustka',
  'the wild beyond the witchlight': 'Dziki Kraj za Zaklętym Światłem',
  'tomb of annihilation': 'Grobowiec Zagłady',
  'bones of endless toil': 'Kości Nieustannego Trudu',
  'clockwork oars': 'Zębate Wiosła',
  'defiant sails': 'Buntownicze Żagle',
  'guardian figurehead': 'Galion Strażnika',
  'red dragon figurehead': 'Galion Czerwonego Smoka',
  skull: 'Czaszka',
  staff: 'Kostur',
  star: 'Gwiazda',
  sun: 'Słońce',
  talons: 'Szpony',
  throne: 'Tron',
  undying: 'Nieśmiertelny',
  'use an object': 'Użycie Przedmiotu',
  'vehicles (land)': 'pojazdy (lądowe)',
  'vehicles (water)': 'pojazdy (wodne)',
  'gaming set': 'zestaw do gier',
  vizier: 'Wezyr',
  void: 'Pustka',
  'opportunity attack': 'Atak Okazyjny',
  magic: 'Magia',
  attack: 'Atak',
  hide: 'Ukrycie',
  disengage: 'Wycofanie',
  dash: 'Bieg',
  dodge: 'Unik',
  utilize: 'Wykorzystanie',
  study: 'Nauka',
  help: 'Pomoc',
  search: 'Przeszukanie',
  "smuggler's banner": 'Chorągiew Przemytnika',
  influence: 'Wpływ',
  shove: 'Pchnięcie',
  ready: 'Gotowość',
  grapple: 'Chwyt',
  "volo's guide": 'Przewodnik Volo',
  "volo's guide to monsters": 'Przewodnik Volo po Potworach',
  'vigilant watch': 'Czujna Wachta',
  "xanathar's guide to everything": 'Przewodnik Xanathara po Wszystkim',
  abjurer: 'Abjurator',
  'arcane artillery': 'Arkaniczna Artyleria',
  anarchist: 'Anarchista',
  artifact: 'Artefakt',
  avenger: 'Mściciel',
  balance: 'Równowaga',
  beggar: 'Żebrak',
  berserker: 'Berserker',
  bishop: 'Biskup',
  book: 'Księga',
  bridge: 'Most',
  'broken one': 'Złamany',
  campfire: 'Ognisko',
  cavern: 'Jaskinia',
  champion: 'Czempion',
  chancellor: 'Kanclerz',
  chaos: 'Chaos',
  coin: 'Moneta',
  conjurer: 'Przywoływacz',
  corpse: 'Zwłoki',
  crossroads: 'Rozstaje',
  crown: 'Korona',
  darklord: 'Mroczny Władca',
  dawn: 'Świt',
  day: 'Dzień',
  'death vessel': 'Statek Śmierci',
  destiny: 'Przeznaczenie',
  dictator: 'Dyktator',
  diviner: 'Wróżbita',
  donjon: 'Loch',
  door: 'Drzwi',
  dusk: 'Zmierzch',
  elementalist: 'Żywiołomanta',
  enchanter: 'Zaklinacz',
  end: 'Koniec',
  evoker: 'Wywoływacz',
  executioner: 'Egzekutor',
  expert: 'Ekspert',
  fates: 'Losy',
  'frost-locked hull': 'Zamarznięty Kadłub',
  ghost: 'Duch',
  'guild member': 'Członek Gildii',
  healer: 'Uzdrowiciel',
  'hooded one': 'Zakapturzony',
  horseman: 'Jeździec',
  illusionist: 'Iluzjonista',
  innocent: 'Niewinny',
  isolation: 'Izolacja',
  justice: 'Sprawiedliwość',
  key: 'Klucz',
  knife: 'Nóż',
  lance: 'Kopia',
  'living vessel': 'Żywy Statek',
  lock: 'Zamek',
  mage: 'Mag',
  map: 'Mapa',
  marionette: 'Marionetka',
  mercenary: 'Najemnik',
  merchant: 'Kupiec',
  mischief: 'Psota',
  miser: 'Skąpiec',
  missionary: 'Misjonarz',
  mists: 'Mgły',
  monk: 'Mnich',
  mystery: 'Tajemnica',
  myrmidon: 'Mirmidon',
  necromancer: 'Nekromanta',
  night: 'Noc',
  order: 'Porządek',
  paladin: 'Paladyn',
  philanthropist: 'Filantrop',
  path: 'Ścieżka',
  pit: 'Jama',
  prisoner: 'Więzień',
  puzzle: 'Zagadka',
  raven: 'Kruk',
  ring: 'Pierścień',
  rogue: 'Łotr',
  sage: 'Mędrzec',
  seer: 'Jasnowidz',
  shepherd: 'Pasterz',
  ship: 'Statek',
  soldier: 'Żołnierz',
  stairway: 'Schody',
  statue: 'Posąg',
  'storm giant figurehead': 'Galion Olbrzyma Burzy',
  student: 'Uczeń',
  swashbuckler: 'Zawadiaka',
  'tax collector': 'Poborca Podatkowy',
  tavern: 'Karczma',
  temple: 'Świątynia',
  tempter: 'Kusiciel',
  thief: 'Złodziej',
  tomb: 'Grobowiec',
  torturer: 'Oprawca',
  tower: 'Wieża',
  trader: 'Handlarz',
  traitor: 'Zdrajca',
  transmuter: 'Przemiennik',
  tree: 'Drzewo',
  vulture: 'Sęp',
  warrior: 'Wojownik',
  well: 'Studnia',
  wizard: 'Czarodziej',
};

const POLISH_LORE_LABELS: Record<string, string> = {
  'adventure and sidekick ideas!': 'Pomysły na Przygody i Pomocników!',
  'aid from phandalin': 'Pomoc z Phandalin',
  'an elf from lorwyn': 'Elf z Lorwyn',
  'abyssal invasions': 'Najazdy z Otchłani',
  'absolute law and order': 'Absolutne Prawo i Porządek',
  'affable and positive': 'Uprzejmi i Pozytywni',
  'arms and armor': 'Broń i Zbroja',
  'auril the frostmaiden': 'Auril Lodowa Dziewica',
  'back to gehenna': 'Powrót do Gehenny',
  'benevolent dictators and brutal tyrants': 'Dobrotliwi Dyktatorzy i Brutalni Tyrani',
  'birth and transformation': 'Narodziny i Przemiana',
  'blend into the crowd': 'Wtopić się w Tłum',
  'bound and shaped': 'Ujarzmione i Ukształtowane',
  'bound by love and light': 'Związani Miłością i Światłem',
  'born of the sea': 'Zrodzeni z Morza',
  'carvers and seers': 'Rzeźbiarze i Jasnowidze',
  'celestial champions': 'Niebiańscy Czempioni',
  'children of lolth': 'Dzieci Lolth',
  'children of the trickster': 'Dzieci Oszusta',
  'clans and kingdoms': 'Klany i Królestwa',
  'cold of heart': 'Zimne Serce',
  'cogs of the great machine': 'Tryby Wielkiej Machiny',
  'creatures of darkness': 'Stworzenia Ciemności',
  'creatures of ego': 'Stworzenia Ego',
  'curse of lycanthropy': 'Klątwa Likantropii',
  'dark dealers and soul mongers': 'Mroczni Handlarze i Kupcy Dusz',
  'dendar, the night serpent': 'Dendar, Nocny Wąż',
  'devil true names and talismans': 'Prawdziwe Imiona Czartów i Talizmany',
  'dragon age categories': 'Kategorie Wiekowe Smoków',
  'dragon barrow': 'Kurhan Smoka',
  'dragon hatchery': 'Wylęgarnia Smoków',
  'dragon season': 'Sezon Smoków',
  "dragon's rest": 'Odpoczynek Smoka',
  'creating domains of dread': 'Tworzenie Domen Grozy',
  'eyes of the grave': 'Oczy Grobu',
  'ending the adventure': 'Zakończenie Przygody',
  'elemental nature': 'Natura Żywiołaka',
  'exploration and adventure': 'Eksploracja i Przygoda',
  'faces of evil': 'Oblicza Zła',
  'falling from grace or rising to it': 'Upadek z Łaski lub Wzniesienie ku Niej',
  'family names (common translations):': 'Nazwiska (Najczęstsze Tłumaczenia):',
  'female infernal names:': 'Żeńskie Imiona Piekielne:',
  'feywild overview': 'Przegląd Krainy Feerii',
  'fire forged': 'Wykuci w Ogniu',
  'friends and foes': 'Przyjaciele i Wrogowie',
  'from cyan depths': 'Z Cyjanowych Głębin',
  'followers of gith': 'Wyznawcy Gith',
  'fortress of memories': 'Twierdza Wspomnień',
  'giant gods': 'Bogowie Olbrzymów',
  'goblin arrows': 'Goblińskie Strzały',
  'growing your franchise': 'Rozwijanie Swojej Franczyzy',
  'goblin (dankwood)': 'Goblin (Dankwood)',
  'goblin (ixalan)': 'Goblin (Ixalan)',
  'gods, gold, and clan': 'Bogowie, Złoto i Klan',
  'hearts of ice': 'Serca z Lodu',
  'heirs to elemental power': 'Dziedzice Potęgi Żywiołów',
  'hidden woodland and realms': 'Ukryte Lasy i Krainy',
  'heralds of doom': 'Heroldowie Zagłady',
  'heart of fire': 'Serce Ognia',
  'hunt for mage tower': 'Polowanie na Wieżę Maga',
  'high and mighty': 'Wyniośli i Potężni',
  'hunger of the mind': 'Głód Umysłu',
  'humanoid fascination': 'Fascynacja Humanoidami',
  'in lorwyn': 'W Lorwyn',
  'in shadowmoor': 'W Shadowmoor',
  'inhabitants of a stone world': 'Mieszkańcy Kamiennego Świata',
  'infernal bloodline': 'Piekielne Pochodzenie',
  'infernal hierarchy': 'Piekielna Hierarchia',
  'infernal illusions': 'Piekielne Iluzje',
  'kind and curious': 'Życzliwi i Ciekawscy',
  'king of good dragons': 'Król Dobrych Smoków',
  'layers and lords of the nine hells layer':
    'Warstwy i Władcy Warstwy Dziewięciu Piekieł',
  'long arms and stony skin': 'Długie Ramiona i Kamienna Skóra',
  'lightning keep': 'Twierdza Błyskawic',
  "mad wizard's lair": 'Legowisko Szalonego Czarodzieja',
  'maze level': 'Poziom Labiryntu',
  'lords of tyranny': 'Władcy Tyranii',
  'male infernal names:': 'Męskie Imiona Piekielne:',
  'merrshaulk, master of the pit': 'Merrshaulk, Władca Jamy',
  'minions of rak tulkhesh': 'Słudzy Raka Tulkhesha',
  'note to the dm: playing an angelic guide':
    'Uwaga dla MP: Odgrywanie Anielskiego Przewodnika',
  'obsession with tragedy': 'Obsesja na Punkcie Tragedii',
  'obedience and ambition': 'Posłuszeństwo i Ambicja',
  'ogres of war': 'Ogry Wojny',
  'orc eye of gruumsh': 'Ork Oko Gruumsha',
  'ooze nature': 'Natura Mazi',
  'outposts in the mortal realm': 'Placówki w Świecie Śmiertelników',
  'poison predilection': 'Upodobanie do Trucizny',
  'power and control': 'Władza i Kontrola',
  'proud dragon kin': 'Dumne Smocze Pochodzenie',
  'promotion and demotion': 'Awans i Degradacja',
  'queen of evil dragons': 'Królowa Złych Smoków',
  'red dragon riders': 'Jeźdźcy Czerwonych Smoków',
  'reavers of the storm': 'Łupieżcy Burzy',
  'reward for outsiders': 'Nagroda dla Przybyszów',
  'roots of the gulthias tree': 'Korzenie Drzewa Gulthiasa',
  "scions of giants' gods": 'Potomkowie Bogów Olbrzymów',
  'scions of slaughter': 'Potomkowie Rzezi',
  'seeing the world': 'Poznawanie Świata',
  'self-reliant and suspicious': 'Samowystarczalni i Podejrzliwi',
  'serpent kings of fallen empires': 'Wężowi Królowie Upadłych Imperiów',
  'servants of darkness': 'Słudzy Ciemności',
  'short and stout': 'Niziści i Krzepcy',
  'signs of corruption': 'Oznaki Zepsucia',
  'similar and diverse': 'Podobni i Różnorodni',
  'slender and graceful': 'Smukli i Pełni Wdzięku',
  'small and practical': 'Mali i Praktyczni',
  'slow to trust': 'Powoli Obdarzający Zaufaniem',
  'spawn of chaos': 'Pomiot Chaosu',
  'spawn of gehenna': 'Pomiot Gehenny',
  'spawn of juiblex': 'Pomiot Juiblexa',
  'sargauth level': 'Poziom Sargauth',
  'sseth, the sibilant death': 'Sseth, Sycząca Śmierć',
  'stronger and smarter': 'Silniejsi i Sprytniejsi',
  'stupid and deadly': 'Głupi i Śmiercionośni',
  'the beast within': 'Bestia Wewnątrz',
  'the books of keeping': 'Księgi Przechowywania',
  'the deck': 'Talia',
  'the deck of many things': 'Talia Wielu Rzeczy',
  'the desert lands': 'Pustynne Krainy',
  'the face of death': 'Oblicze Śmierci',
  'the general of gehenna': 'Generał Gehenny',
  'the great modron march': 'Wielki Marsz Modronów',
  'the infernal hierarchy': 'Piekielna Hierarchia',
  'the journey yet to come': 'Przyszła Podróż',
  'the learned of dal quor': 'Uczeni Dal Quor',
  'the nine hells': 'Dziewięć Piekieł',
  'the ordning': 'Porządek',
  'the power of pleasure': 'Potęga Przyjemności',
  'the persistence of memory': 'Wytrwałość Pamięci',
  'the queen of shadows': 'Królowa Cieni',
  'the spawning stone': 'Kamień Rozrodu',
  'terminus level': 'Poziom Terminusa',
  'the undying court': 'Nieśmiertelny Dwór',
  'ugly inside and out': 'Brzydcy Wewnątrz i na Zewnątrz',
  'undead nature': 'Natura Nieumarłych',
  'underdark cities': 'Miasta Podmroku',
  'undead patron warlock': 'Czarnoksiężnik z Patronem Nieumarłych',
  'vaprak the destroyer': 'Vaprak Niszczyciel',
  'variant: drow magic armor and weapons': 'Wariant: Magiczna Zbroja i Broń Drowów',
  'variant: rope of entanglement': 'Wariant: Lina Uwikłania',
  'wealth and power': 'Bogactwo i Władza',
  'wild and confident': 'Dzicy i Pewni Siebie',
  'welcome to leilon': 'Witaj w Leilon',
  'yuan-ti malison variants: types 4 and 5': 'Warianty Malisonów yuan-ti: Typy 4 i 5',
  'monsters and npcs': 'Potwory i BN-y',
  'creatures of the night': 'Stworzenia Nocy',
  'blessings of knowledge': 'Błogosławieństwa Wiedzy',
  'grave domain cleric': 'Kleryk Domeny Grobu',
  'college of spirits bard': 'Bard Kolegium Duchów',
  'circle of mortality': 'Krąg Śmiertelności',
  'running the adventure': 'Prowadzenie Przygody',
  'running the game': 'Prowadzenie Gry',
  'atlas of faerûn': 'Atlas Faerûnu',
  "the spider's web": 'Pajęcza Sieć',
  "the magister's masquerade": 'Maskarada Magistra',
  'domains of ravenloft': 'Domeny Ravenloftu',
  'disciples of zerthimon': 'Uczniowie Zerthimona',
  'the orrery of the wanderer': 'Planetarium Wędrowca',
  'the lost library of lethchauntos': 'Zaginiona Biblioteka Lethchauntosa',
  'a reckoning in ruins': 'Rozrachunek w Ruinach',
  'afterword: playing with your food': 'Posłowie: Zabawa Jedzeniem',
  'the rock of bral': 'Skała Brala',
  'barbarian starting wealth': 'Początkowe Bogactwo Barbarzyńcy',
  'bard starting wealth': 'Początkowe Bogactwo Barda',
  'captivity or coercion': 'Uwięzienie lub Przymus',
  'cleric starting wealth': 'Początkowe Bogactwo Kleryka',
  'druid starting wealth': 'Początkowe Bogactwo Druida',
  'fighter starting wealth': 'Początkowe Bogactwo Wojownika',
  'monk starting wealth': 'Początkowe Bogactwo Mnicha',
  'paladin starting wealth': 'Początkowe Bogactwo Paladyna',
  power: 'Moc',
  'ranger starting wealth': 'Początkowe Bogactwo Łowcy',
  'rogue starting wealth': 'Początkowe Bogactwo Łotrzyka',
  'sorcerer starting wealth': 'Początkowe Bogactwo Zaklinacza',
  'theft or property crime': 'Kradzież lub Przestępstwo Przeciw Mieniu',
  'warlock starting wealth': 'Początkowe Bogactwo Czarnoksiężnika',
  'wizard starting wealth': 'Początkowe Bogactwo Czarodzieja',
  'piercing w kościach': 'Kolczyki w kościach',
  '+3 wand of the war mage': '+3 Różdżka Maga Wojennego',
  '20. huge pit filled with spikes': '20. Wielka Rozpadlina z Kolcami',
  'huge pit filled with spikes': 'Wielka Rozpadlina z Kolcami',
  'd. false door with overhead block': 'D. Fałszywe Drzwi z Blokiem nad Głową',
  'false door with overhead block': 'Fałszywe Drzwi z Blokiem nad Głową',
  'dragon-in-the-box': 'Smok w Pudełku',
  'druid with wild companion': 'Druid z Dzikim Towarzyszem',
  'e. door with crossbow': 'E. Drzwi z Kuszą',
  'door with crossbow': 'Drzwi z Kuszą',
  'g6. undead pit': 'G6. Rozpadlina Nieumarłych',
  'undead pit': 'Rozpadlina Nieumarłych',
  'shield trap': 'Pułapka z Tarczą',
  'lower-level apartments': 'Mieszkania na Niższym Poziomie',
  'mud-and-wattle door': 'Drzwi z Gliny i Wikliny',
  'plate-of-gold': 'Złota Płyta',
  'relationship with your deity': 'Relacja z Bóstwem',
  'saving throws': 'Rzuty Obronne',
  "sticking with what they've got": 'Pozostanie przy Tym, Co Mają',
  't5. lower-level apartments': 'T5. Mieszkania na Niższym Poziomie',
  'talk with your dm': 'Porozmawiaj z MG',
  "think about your characters' actions": 'Pomyśl o Działaniach Swoich Postaci',
  'undead beast': 'Nieumarła Bestia',
  'vision and light': 'Wizja i Światło',
  "what they'll settle for": 'Na Czym Poprzestaną',
  "what's for dinner": 'Co na Obiad',
  'who is your rival': 'Kim Jest Twój Rywal',
  'weapon features': 'Cechy Broni',
  'weapon mastery properties': 'Właściwości Mistrzostwa Broni',
  'weapon properties': 'Właściwości Broni',
  "your world's calendar": 'Kalendarz Twojego Świata',
  'dcxtog in the same stitch:': 'dcXtog w Tym Samym Ściegu:',
  '"i am he who rules the world, don\'t you know? one little piece at a time."\u2013jarlaxle':
    '"To ja rządzę światem, nie wiedziałeś? Po kawałeczku." - Jarlaxle',
  'the dark mere': 'Mroczne Jezioro',
  'the mountain door': 'Górskie Drzwi',
  'what is the f***ing point?!': 'JAKI JEST, DO CHOLERY, CEL?!',
};

const POLISH_FEYWILD_LABELS: Record<string, string> = {
  feywild: 'Kraina Feerii',
  feywildem: 'Krainą Feerii',
  feywilda: 'Kraina Feerii',
  'feywildowe bibeloty': 'Bibeloty z Krainy Feerii',
  'wola feywild': 'Wola Krainy Feerii',
};

const POLISH_DAMAGE_LABELS: Record<string, string> = {
  acid: 'Kwas',
  bludgeoning: 'Obuchowe',
  cold: 'Zimno',
  fire: 'Ogień',
  force: 'Moc',
  lightning: 'Piorun',
  necrotic: 'Nekrotyczne',
  piercing: 'Kłute',
  poison: 'Trucizna',
  psychic: 'Psychiczne',
  radiant: 'Promieniste',
  slashing: 'Sieczne',
  thunder: 'Gromu',
};

const POLISH_CREATURE_LABELS: Record<string, string> = {
  'chardalyn dragon': 'Smok chardalynowy',
  demon: 'Demon Cienia',
  'faerie dragon': 'Smok wróżkowy',
  'faerie dragon (jeśli jest czerwony, pomarańczowy lub żółty)':
    'Smok wróżkowy (jeśli jest czerwony, pomarańczowy lub żółty)',
  'faerie dragon (jeśli jest zielony, niebieski, indygo lub fioletowy)':
    'Smok wróżkowy (jeśli jest zielony, niebieski, indygo lub fioletowy)',
  'fey dotknął': 'Dotknięty przez Fejów',
  'fey wędrowiec': 'Wróżkowy Wędrowiec',
  'humanoid mutuje': 'Mutujący humanoid',
  piercing: 'Przebijak',
  piercer: 'Przebijak',
  piercers: 'Przebijaki',
  'shadow demon': 'Demon Cienia',
  'zombie koboldy icewind': 'Zombie koboldy z Doliny Lodowego Wichru',
};

const POLISH_TITLE_WORDS: Record<string, string> = {
  a: '',
  academy: 'Akademia',
  acid: 'Kwasowy',
  adult: 'Dorosły',
  adventure: 'Przygoda',
  adventures: 'Przygody',
  abyss: 'Otchłań',
  abyssal: 'Otchłani',
  additional: 'Dodatkowe',
  ammunition: 'Amunicja',
  and: 'i',
  ancient: 'Starożytny',
  armor: 'Zbroja',
  amethyst: 'Ametystowy',
  another: 'Kolejny',
  astral: 'Astralny',
  art: 'Sztuka',
  attack: 'Atak',
  attacks: 'Ataki',
  atlas: 'Atlas',
  at: 'w',
  backgrounds: 'Pochodzenia',
  battle: 'Bitwa',
  bear: 'Niedźwiedź',
  begins: 'Początek',
  black: 'Czarny',
  blue: 'Niebieski',
  blood: 'Krew',
  brass: 'Mosiężny',
  book: 'Księga',
  books: 'Księgi',
  bronze: 'Brązowy',
  cards: 'Karty',
  cave: 'Jaskinia',
  caves: 'Jaskinie',
  characters: 'Postacie',
  character: 'Postać',
  city: 'Miasto',
  cities: 'Miasta',
  cliffs: 'Klify',
  colors: 'Kolory',
  coming: 'Nadejście',
  construction: 'Budowa',
  creating: 'Tworzenie',
  creature: 'Stworzenie',
  creatures: 'Stworzenia',
  copper: 'Miedziany',
  cult: 'Kult',
  crystal: 'Kryształowy',
  darkening: 'Mrocznienie',
  dark: 'Ciemny',
  darkness: 'Ciemność',
  dalelands: 'Krainy Dolin',
  dangerous: 'Niebezpieczne',
  deep: 'Głębinowy',
  desert: 'Pustynia',
  drow: 'Drowów',
  dungeon: 'Loch',
  drowned: 'Zatopione',
  dwarf: 'Krasnolud',
  dwarves: 'Krasnoludy',
  dwarvish: 'Krasnoludzki',
  elemental: 'Żywiołowy',
  elves: 'Elfy',
  emerald: 'Szmaragdowy',
  end: 'Koniec',
  ending: 'Zakończenie',
  enemy: 'Wróg',
  escape: 'Ucieczka',
  eve: 'Przeddzień',
  everything: 'Wszystko',
  eye: 'Oko',
  eyes: 'Oczy',
  faerûn: 'Faerûn',
  far: 'Daleka',
  fetid: 'Cuchnące',
  fiery: 'Ognista',
  five: 'Pięciu',
  forbidden: 'Zakazana',
  forge: 'Kuźnia',
  features: 'Cechy',
  forest: 'Las',
  fortress: 'Forteca',
  frozen: 'Zamarznięte',
  frostmaiden: 'Lodowej Dziewicy',
  game: 'Gra',
  games: 'Gry',
  giant: 'Olbrzym',
  giants: 'Olbrzymy',
  gods: 'Bogowie',
  gold: 'Złoto',
  goblin: 'Goblin',
  goblins: 'Gobliny',
  goals: 'Cele',
  dragon: 'Smok',
  dragons: 'Smoki',
  graveyard: 'Cmentarz',
  guards: 'Strażnicy',
  gate: 'Brama',
  gates: 'Bramy',
  harmony: 'Harmonia',
  hidden: 'Ukryta',
  hall: 'Sala',
  halls: 'Sale',
  higher: 'Wyższy',
  hoards: 'Skarby',
  hatchery: 'Wylęgarnia',
  hill: 'Wzgórze',
  home: 'Dom',
  horrors: 'Grozy',
  house: 'Dom',
  hunger: 'Głód',
  inner: 'Wewnętrzne',
  identifiers: 'Identyfikatory',
  ideals: 'Ideały',
  in: 'w',
  infinite: 'Nieskończone',
  island: 'Wyspa',
  islands: 'Wyspy',
  jungle: 'Dżungla',
  journey: 'Podróż',
  joy: 'Radość',
  kaladesh: 'Kaladeshu',
  kenku: 'Kenku',
  lands: 'Krainy',
  land: 'Kraina',
  last: 'Ostatnia',
  lair: 'Legowisko',
  lairs: 'Legowiska',
  library: 'Biblioteka',
  level: 'Poziom',
  levels: 'Poziomy',
  lost: 'Zaginione',
  magic: 'Magia',
  mage: 'Mag',
  mountain: 'Góra',
  lower: 'Dolny',
  multiverse: 'Multiwersum',
  name: 'Imię',
  names: 'Imiona',
  night: 'Noc',
  npc: 'BN',
  npcs: 'BN-y',
  north: 'Północ',
  of: '',
  on: 'na',
  orrery: 'Planetarium',
  outer: 'Zewnętrzne',
  part: 'Część',
  path: 'Ścieżka',
  paths: 'Ścieżki',
  party: 'Drużyna',
  peril: 'Niebezpieczeństwo',
  planeswalkers: 'Wędrowcy Planów',
  playing: 'Rozgrywanie',
  points: 'Punkty',
  palace: 'Pałac',
  pirate: 'Piracki',
  pool: 'Basen',
  poison: 'Trucizna',
  power: 'Potęga',
  progress: 'Postęp',
  properties: 'Właściwości',
  prison: 'Więzienie',
  prisoners: 'Więźniowie',
  plume: 'Pióropusz',
  prelude: 'Preludium',
  quest: 'Zadanie',
  races: 'Gatunki',
  radiant: 'Promienna',
  realms: 'Krainy',
  realm: 'Kraina',
  reading: 'Czytanie',
  reality: 'Rzeczywistość',
  reavers: 'Łupieżcy',
  reach: 'Sięgnij',
  return: 'Powrót',
  rifts: 'Szczeliny',
  rise: 'Powstanie',
  rime: 'Szron',
  road: 'Droga',
  ruins: 'Ruiny',
  running: 'Prowadzenie',
  saviors: 'Wybawcy',
  school: 'Szkoła',
  schemes: 'Spiski',
  scene: 'Scena',
  sea: 'Morze',
  secret: 'Sekret',
  session: 'Sesja',
  saving: 'Obronne',
  shadow: 'Cień',
  shadows: 'Cienie',
  ship: 'Statek',
  ships: 'Statki',
  shield: 'Tarcza',
  spell: 'Zaklęcie',
  spells: 'Zaklęcia',
  six: 'Sześciu',
  small: 'Małe',
  storm: 'Burza',
  storage: 'Magazyn',
  story: 'Historia',
  sword: 'Miecz',
  talons: 'Szpony',
  tavern: 'Karczma',
  temple: 'Świątynia',
  theros: 'Theros',
  the: '',
  thunder: 'Grom',
  time: 'Czas',
  tomb: 'Grobowiec',
  tower: 'Wieża',
  trail: 'Szlak',
  trap: 'Pułapka',
  traps: 'Pułapki',
  trials: 'Próby',
  trouble: 'Kłopoty',
  trickster: 'Oszust',
  through: 'Przez',
  to: 'do',
  traffickers: 'Handlarze',
  transformation: 'Przemiana',
  village: 'Wioska',
  void: 'Pustka',
  voice: 'Głos',
  treasure: 'Skarb',
  treasures: 'Skarby',
  throws: 'Rzuty',
  town: 'Miasto',
  room: 'Komnata',
  rooms: 'Komnaty',
  locations: 'Lokalizacje',
  connections: 'Powiązania',
  personality: 'Osobowość',
  traits: 'Cechy',
  fire: 'Ogień',
  cold: 'Zimno',
  damage: 'Obrażenia',
  general: 'Ogólne',
  using: 'Korzystanie',
  starting: 'Rozpoczynanie',
  campaign: 'Kampania',
  journal: 'Dziennik',
  player: 'Gracz',
  players: 'Gracze',
  version: 'Wersja',
  upper: 'Górny',
  war: 'Wojna',
  warhosts: 'Hufce Wojenne',
  waterdeep: 'Wrota Wody',
  wayward: 'Zabłąkane',
  when: 'Gdy',
  weapon: 'Broń',
  weapons: 'Bronie',
  wilderness: 'Dzicz',
  wine: 'Wino',
  wizard: 'Czarodziej',
  wizards: 'Czarodzieje',
  white: 'Biały',
  young: 'Młody',
  world: 'Świat',
  worlds: 'Światy',
  written: 'Zapisane',
  yuan: 'Yuan',
};

interface LabelSet {
  hit: string;
  miss: string;
  dc: string;
  dcYourSpellSave: string;
  saveSuffix: string;
  failure: string;
  success: string;
  failureOrSuccess: string;
  trigger: string;
  response: string;
  statBlock: string;
}

const LABELS: Record<Locale, LabelSet> = {
  en: {
    hit: 'Hit:',
    miss: 'Miss:',
    dc: 'DC',
    dcYourSpellSave: 'your spell save DC',
    saveSuffix: ' Saving Throw:',
    failure: 'Failure:',
    success: 'Success:',
    failureOrSuccess: 'Failure or Success:',
    trigger: 'Trigger:',
    response: 'Response:',
    statBlock: '(stat block)',
  },
  pl: {
    hit: 'Trafienie:',
    miss: 'Chybienie:',
    dc: 'ST',
    dcYourSpellSave: 'ST rzutu obronnego twojego zaklęcia',
    saveSuffix: '',
    failure: 'Niepowodzenie:',
    success: 'Powodzenie:',
    failureOrSuccess: 'Niepowodzenie lub Powodzenie:',
    trigger: 'Wyzwalacz:',
    response: 'Odpowiedź:',
    statBlock: '(blok statystyk)',
  },
};

function localizePolishGenericLabels(text: string, locale: Locale): string {
  if (locale !== 'pl') return text;
  return text.replace(/(\{@[^}]*}|\{#[^}]*})|([^{}]+)/g, (part, tag, plain) =>
    tag ? part : localizePolishLabel(plain, locale),
  );
}

function localizePolishLanguageLabel(text: string, locale: Locale): string {
  if (locale !== 'pl') return text;
  return POLISH_LANGUAGE_LABELS[text.toLowerCase()] ?? localizePolishLabel(text, locale);
}

function localizePolishReferenceLabel(tag: string, text: string, locale: Locale): string {
  if (locale === 'pl' && tag === 'creature') {
    const creatureLabel = POLISH_CREATURE_LABELS[text.trim().toLowerCase()];
    if (creatureLabel) return creatureLabel;
  }
  return localizePolishLabel(text, locale);
}

function preserveLabelWhitespace(text: string, label: string): string {
  const leadingLength = text.length - text.trimStart().length;
  const trailingLength = text.length - text.trimEnd().length;
  return `${text.slice(0, leadingLength)}${label}${text.slice(text.length - trailingLength)}`;
}

function localizePolishLabel(text: string, locale: Locale): string {
  if (locale !== 'pl') return text;
  const referenceLabel = POLISH_REFERENCE_LABELS[text.trim().toLowerCase()];
  if (referenceLabel) return preserveLabelWhitespace(text, referenceLabel);
  const loreLabel = POLISH_LORE_LABELS[text.trim().toLowerCase()];
  if (loreLabel) return preserveLabelWhitespace(text, loreLabel);
  const damageLabel = POLISH_DAMAGE_LABELS[text.trim().toLowerCase()];
  if (damageLabel) return preserveLabelWhitespace(text, damageLabel);
  const feywildLabel = POLISH_FEYWILD_LABELS[text.trim().toLowerCase()];
  if (feywildLabel) return preserveLabelWhitespace(text, feywildLabel);
  const parenthesizedHeading = text.match(/^\(([^)]+)\)(?:[\u2013\u2014-]\s*|\s+)(.+)$/u);
  if (parenthesizedHeading) {
    return `(${parenthesizedHeading[1]!}) - ${localizePolishLabel(parenthesizedHeading[2]!, locale)}`;
  }
  const numberedHeading = text.match(/^((?:\d+[A-Za-z]*|[A-Z]\d+)\.\s+)(.+)$/u);
  if (numberedHeading) {
    const translatedHeading = localizePolishLabel(numberedHeading[2]!, locale);
    if (translatedHeading !== numberedHeading[2]!) {
      return `${numberedHeading[1]!}${translatedHeading}`;
    }
  }
  const localizedUnrollingScroll = text.replaceAll('Unrolling Scroll', 'Rozwijany Zwój');
  if (localizedUnrollingScroll !== text) return localizedUnrollingScroll;
  const localizedFeywild = text
    .replace(/Wola Feywild/gi, 'Wola Krainy Feerii')
    .replace(/Feywildowe bibeloty/gi, 'bibeloty z Krainy Feerii')
    .replace(/Fejwildską domenę/gi, 'domenę Krainy Feerii')
    .replace(/Feywildem/gi, 'Krainą Feerii')
    .replace(/Feywilda/gi, 'Kraina Feerii')
    .replace(/Feywild/gi, 'Kraina Feerii');
  if (localizedFeywild !== text) return localizedFeywild;
  let localized = text
    .replace(/^Fiends$/i, 'Czarty')
    .replace(/^Fiend$/i, 'Czart')
    .replace(/^Aberrations?$/i, 'Aberracja')
    .replace(/^Beasts?$/i, 'Bestia')
    .replace(/^Celestials?$/i, 'Niebianin')
    .replace(/^Constructs?$/i, 'Konstrukt')
    .replace(/^Dragons?$/i, 'Smok')
    .replace(/^Elementals?$/i, 'Żywiołak')
    .replace(/^Fey$/i, 'Fej')
    .replace(/^Giants?$/i, 'Olbrzym')
    .replace(/^Humanoids?$/i, 'Humanoidalny')
    .replace(/^Monstrosities?$/i, 'Monstrum')
    .replace(/^Oozes?$/i, 'Maź')
    .replace(/^Plants?$/i, 'Roślina')
    .replace(/^Undead$/i, 'Nieumarły')
    .replace(/^Arctic$/i, 'Arktyka')
    .replace(/^Coastal$/i, 'Wybrzeże')
    .replace(/^Desert$/i, 'Pustynia')
    .replace(/^Forest$/i, 'Las')
    .replace(/^Grassland$/i, 'Równiny')
    .replace(/^Hill$/i, 'Wzgórza')
    .replace(/^Mountain$/i, 'Góry')
    .replace(/^Swamp$/i, 'Bagna')
    .replace(/^Underdark$/i, 'Podmrok')
    .replace(/^Underwater$/i, 'Podwodne')
    .replace(/^Urban$/i, 'Miejski')
    .replace(/^Planar$/i, 'Planarne')
    .replace(/^Planar \(Abyss\)$/i, 'Planarne (Otchłań)')
    .replace(/^Planar \(Acheron\)$/i, 'Planarne (Acheron)')
    .replace(/^Planar \(Feywild\)$/i, 'Planarne (Kraina Feerii)')
    .replace(/^Planar \(Lower Planes\)$/i, 'Planarne (Niższe Plany)')
    .replace(/^Planar \(Nine Hells\)$/i, 'Planarne (Dziewięć Piekieł)')
    .replace(/^Planar \(Shadowfell\)$/i, 'Planarne (Kraina Cieni)')
    .replace(/^Elemental$/i, 'Plany Żywiołów')
    .replace(/^Implements$/i, 'Narzędzia')
    .replace(/^Individual$/i, 'Indywidualny')
    .replace(
      /^Random Magic Items - Implements$/i,
      'Losowe magiczne przedmioty - narzędzia',
    )
    .replace(/\bhelmed horrors\b/gi, 'Pancerne Koszmary')
    .replace(/\bshield guardians\b/gi, 'Tarczownicy')
    .replace(/\bstone golems\b/gi, 'Kamienne Golemy')
    .replace(/\bmodrons\b/gi, 'Modrony')
    .replace(/\bTreantów\b/g, 'Drzewców')
    .replace(/\btreantów\b/g, 'drzewców')
    .replace(/\bTreantami\b/g, 'Drzewcami')
    .replace(/\btreantami\b/g, 'drzewcami')
    .replace(/\bTreantom\b/g, 'Drzewcom')
    .replace(/\btreantom\b/g, 'drzewcom')
    .replace(/\bTreantem\b/g, 'Drzewcem')
    .replace(/\btreantem\b/g, 'drzewcem')
    .replace(/\bTreanta\b/g, 'Drzewca')
    .replace(/\btreanta\b/g, 'drzewca')
    .replace(/\bTreanty\b/g, 'Drzewce')
    .replace(/\btreanty\b/g, 'drzewce')
    .replace(/\bTreants\b/g, 'Drzewce')
    .replace(/\btreants\b/g, 'drzewce')
    .replace(/\bTrenta\b/g, 'Drzewca')
    .replace(/\btrenta\b/g, 'drzewca')
    .replace(/\bTrenty\b/g, 'Drzewce')
    .replace(/\btrenty\b/g, 'drzewce')
    .replace(/\bTreant\b/g, 'Drzewiec')
    .replace(/\btreant\b/g, 'drzewiec')
    .replace(/\bWightów\b/g, 'Zjaw')
    .replace(/\bwightów\b/g, 'zjaw')
    .replace(/\bWighta\b/g, 'Zjawy')
    .replace(/\bwighta\b/g, 'zjawy')
    .replace(/\bWights\b/g, 'Zjawy')
    .replace(/\bwights\b/g, 'zjawy')
    .replace(/\bWightem\b/g, 'Zjawą')
    .replace(/\bwightem\b/g, 'zjawą')
    .replace(/\bWight\b/g, 'Zjawa')
    .replace(/\bwight\b/g, 'zjawa')
    .replace(/\bRevenantów\b/g, 'Zmor')
    .replace(/\brevenantów\b/g, 'zmor')
    .replace(/\bRevenantami\b/g, 'Zmorami')
    .replace(/\brevenantami\b/g, 'zmorami')
    .replace(/\bRevenantem\b/g, 'Zmorą')
    .replace(/\brevenantem\b/g, 'zmorą')
    .replace(/\bRevenanta\b/g, 'Zmorę')
    .replace(/\brevenanta\b/g, 'zmorę')
    .replace(/\bRevenants\b/g, 'Zmory')
    .replace(/\brevenants\b/g, 'zmory')
    .replace(/\bRevenanty\b/g, 'Zmory')
    .replace(/\brevenanty\b/g, 'zmory')
    .replace(/\bRevenant\b/g, 'Zmora')
    .replace(/\brevenant\b/g, 'zmora')
    .replace(/\bwraithów\b/g, 'upiorów')
    .replace(/\bWraithów\b/g, 'Upiorów')
    .replace(/\bWraithami\b/g, 'Upiorami')
    .replace(/\bwraithami\b/g, 'upiorami')
    .replace(/\bWraithem\b/g, 'Upiorem')
    .replace(/\bwraithem\b/g, 'upiorem')
    .replace(/\bWraitha\b/g, 'Upiora')
    .replace(/\bwraitha\b/g, 'upiora')
    .replace(/\bWraithy\b/g, 'Upiory')
    .replace(/\bwraithy\b/g, 'upiory')
    .replace(/\bWraiths\b/g, 'Upiory')
    .replace(/\bwraiths\b/g, 'upiory')
    .replace(/\bWraith\b/g, 'Upiór')
    .replace(/\bwraith\b/g, 'upiór');
  localized = localized
    .replace(/\bSpecters\b/g, 'Widma')
    .replace(/\bspecters\b/g, 'widma')
    .replace(/\bSpecter\b/g, 'Widmo')
    .replace(/\bspecter\b/g, 'widmo')
    .replace(/\bWater Weirds\b/g, 'Wodne dziwa')
    .replace(/\bwater weirds\b/g, 'wodne dziwa')
    .replace(/\bWater Weird\b/g, 'Wodne dziwo')
    .replace(/\bwater weird\b/g, 'wodne dziwo')
    .replace(/\bGhosts\b/g, 'Duchy')
    .replace(/\bghosts\b/g, 'duchy')
    .replace(/\bGhost\b/g, 'Duch')
    .replace(/\bghost\b/g, 'duch')
    .replace(/\bShadows\b/g, 'Cienie')
    .replace(/\bshadows\b/g, 'cienie')
    .replace(/\bShadow\b/g, 'Cień')
    .replace(/\bshadow\b/g, 'cień')
    .replace(/\bImpy\b/g, 'Diabliki')
    .replace(/\bimpy\b/g, 'diabliki')
    .replace(/\bImpów\b/g, 'Diablików')
    .replace(/\bimpów\b/g, 'diablików')
    .replace(/\bImpami\b/g, 'Diablikami')
    .replace(/\bimpami\b/g, 'diablikami')
    .replace(/\bImptom\b/g, 'Diablikom')
    .replace(/\bimptom\b/g, 'diablikom')
    .replace(/\bImpem\b/g, 'Diablikiem')
    .replace(/\bimpem\b/g, 'diablikiem')
    .replace(/\bImpa\b/g, 'Diablika')
    .replace(/\bimpa\b/g, 'diablika')
    .replace(/\bImp\b/g, 'Diablik')
    .replace(/\bimp\b/g, 'diablik')
    .replace(/\bSprite'a\b/g, 'Chochlika')
    .replace(/\bsprite'a\b/g, 'chochlika')
    .replace(/\bSprite'y\b/g, 'Chochliki')
    .replace(/\bsprite'y\b/g, 'chochliki')
    .replace(/\bSprites\b/g, 'Chochliki')
    .replace(/\bsprites\b/g, 'chochliki')
    .replace(/\bPixies\b/g, 'Piksi')
    .replace(/\bpixies\b/g, 'piksi')
    .replace(/\bPixie\b/g, 'Piksi')
    .replace(/\bpixie\b/g, 'piksi')
    .replace(/\bSprity\b/g, 'Chochliki')
    .replace(/\bsprity\b/g, 'chochliki')
    .replace(/\bDuszki\b/g, 'Chochliki')
    .replace(/\bduszki\b/g, 'chochliki')
    .replace(/\bDuszka\b/g, 'Chochlika')
    .replace(/\bduszka\b/g, 'chochlika')
    .replace(/\bSprite\b/g, 'Chochlik')
    .replace(/\bsprite\b/g, 'chochlik');
  localized = localized
    .replace(/\bhełmowe horrory\b/gi, 'Pancerne Koszmary')
    .replace(/\bhełmowy horror\b/gi, 'Pancerny Koszmar')
    .replace(/\bForce Strike\b/g, 'Siłowe Uderzenie')
    .replace(/\bBrain Burn\b/g, 'Oparzenie Mózgu')
    .replace(/\bLob Acid\b/g, 'Kwasowy Pocisk')
    .replace(/\bcold brew\b/gi, 'kawa parzona na zimno')
    .replace(/^acid arrow$/i, 'Kwaśna Strzała')
    .replace(
      /^demon, devil, or yugoloth in the Monster Manual$/i,
      'demon, czart lub yugoloth z Podręcznika Potworów',
    )
    .replace(/\bMonster Manual\b/gi, 'Podręcznik Potworów')
    .replace(/^Devil of Greed and Obsession$/i, 'Diabeł Chciwości i Obsesji')
    .replace(/^Devil of Force and Intimidation$/i, 'Diabeł Mocy i Zastraszania')
    .replace(/^Demons of Frenzy and Vulgarity$/i, 'Demony Szału i Wulgarności')
    .replace(/^Sentries and Watch Members$/i, 'Strażnicy i Członkowie Warty')
    .replace(/^Keepers of the Spore$/i, 'Strażnicy Zarodników')
    .replace(/^Plants Sprouted from Evil$/i, 'Rośliny Zrodzone ze Zła')
    .replace(/^Human cleric of Waukeen$/i, 'Ludzki kapłan Waukeen')
    .replace(/^Servant of Superstition$/i, 'Sługa Zabobonu')
    .replace(
      /^Deadly Spores and Predatory Polyps$/i,
      'Śmiercionośne Zarodniki i Drapieżne Polipy',
    )
    .replace(/^Book of Kith and Kin$/i, 'Księga Krewnych i Rodziny')
    .replace(/^Curse of Strahd$/i, 'Klątwa Strahda')
    .replace(/^The Callapheia$/i, 'Callapheia')
    .replace(/^bolt of holding$/i, 'bełt więżący')
    .replace(/^bolt of blinding$/i, 'oślepiający bełt')
    .replace(/^bolt of vapors$/i, 'bełt oparów')
    .replace(/^vehicles \(water\)$/i, 'pojazdy (wodne)')
    .replace(/^incarnations of nature$/i, 'wcielenia natury')
    .replace(/^scroll case$/i, 'futerał na zwoje')
    .replace(/^animated armor$/i, 'Ożywiony Pancerz')
    .replace(/^flesh golem$/i, 'Golem z Ciał')
    .replace(/^ghast$/i, 'Ghast')
    .replace(/^helmed horror$/i, 'Pancerny Koszmar')
    .replace(/^imp$/i, 'Diablik')
    .replace(/^manes$/i, 'Manes')
    .replace(/^shambling mound$/i, 'Gnilec')
    .replace(/^shield guardian$/i, 'Tarczownik')
    .replace(/^sprite$/i, 'Chochlik')
    .replace(/^treant$/i, 'Drzewiec')
    .replace(/^wight$/i, 'Zjawa')
    .replace(/^red dragons$/i, 'czerwone smoki')
    .replace(/^green$/i, 'zielony')
    .replace(/^mummies$/i, 'mumie')
    .replace(/^mummy lords$/i, 'władcy mumii')
    .replace(/^ghasts$/i, 'ghasty')
    .replace(/^ghouls$/i, 'ghule')
    .replace(/^wights$/i, 'zjawy')
    .replace(/^commoners$/i, 'pospolici')
    .replace(/^cultists$/i, 'kultyści')
    .replace(/^mages$/i, 'magowie')
    .replace(/^awakened trees$/i, 'przebudzone drzewa')
    .replace(/^awakened shrubs$/i, 'przebudzone krzewy')
    .replace(/^shambling mounds$/i, 'gnilce')
    .replace(/^treants$/i, 'drzewce');
  localized = localized
    .replace(/^rats$/i, 'szczury')
    .replace(/^cats$/i, 'koty')
    .replace(/^snakes$/i, 'węże')
    .replace(/^wolves$/i, 'wilki')
    .replace(/^bats$/i, 'nietoperze')
    .replace(/^zombies$/i, 'zombie')
    .replace(/^zombie$/i, 'Zombie')
    .replace(/^bard$/i, 'Bard')
    .replace(/^druid$/i, 'Druid')
    .replace(/^serpents$/i, 'węże')
    .replace(/^Vision and Light$/i, 'Wizja i Światło')
    .replace(/^Fey Wanderer$/i, 'Wróżkowy Wędrowiec')
    .replace(/^Diviner$/i, 'Wróżbita')
    .replace(/^Archfey Patron$/i, 'Patron Arcyfeja')
    .replace(/^Wild Magic Sorcery$/i, 'Dzika Magia')
    .replace(/\bKnights of the Mystic Fire\b/gi, 'Rycerze Mistycznego Ognia')
    .replace(/\bPaladins\b/gi, 'Paladyni')
    .replace(/\bEldritch Knights\b/gi, 'Rycerze Eldryccy')
    .replace(/\bEldritch Knight\b/gi, 'Rycerz Eldrycki')
    .replace(/\bBladesingingu\b/gi, 'Śpiewu Ostrzy')
    .replace(/\bBladesinging\b/gi, 'Śpiew Ostrzy')
    .replace(/\bBladesingerzy\b/gi, 'Śpiewacy Ostrzy')
    .replace(/\bBladesingerów\b/gi, 'Śpiewaków Ostrzy')
    .replace(/\bBladesingerowi\b/gi, 'Śpiewakowi Ostrzy')
    .replace(/\bBladesingera\b/gi, 'Śpiewaka Ostrzy')
    .replace(/\bBladesingerem\b/gi, 'Śpiewakiem Ostrzy')
    .replace(/\bBladesingers\b/gi, 'Śpiewacy Ostrzy')
    .replace(/\bBladesinger\b/gi, 'Śpiewak Ostrzy')
    .replace(/^Istoty fey$/i, 'Istoty fejów')
    .replace(
      /^Planarne \((?:Cienista Otchłań|Cień|Mroczna Otchłań|Mrocznoplan)\)$/i,
      'Planarne (Kraina Cieni)',
    )
    .replace(
      /^Planarne \((?:Dolne Plany|Dolne Płaszczyzny)\)$/i,
      'Planarne (Niższe Plany)',
    )
    .replace(
      /^Planarne \((?:Górne Plany|Górne Płaszczyzny)\)$/i,
      'Planarne (Wyższe Plany)',
    )
    .replace(/^Planarny \((.*)\)$/i, 'Planarne ($1)')
    .replace(/^Górskie$/i, 'Góry')
    .replace(/^Lasy$/i, 'Las')
    .replace(/^Podmrocze$/i, 'Podmrok')
    .replace(/^Podwodny$/i, 'Podwodne')
    .replace(/^Preria$/i, 'Równiny')
    .replace(/^Trawiasta Równina$/i, 'Równiny')
    .replace(/^Trawiaste$/i, 'Równiny')
    .replace(/^Użytki zielone$/i, 'Równiny')
    .replace(/^Miejskie$/i, 'Miejski')
    .replace(/^Wild Tricksters and Troublemakers$/i, 'Dzikie psotniki i utrapienia')
    .replace(/\bForce Strike\b/gi, 'Siłowe Uderzenie')
    .replace(/\bBrain Burn\b/gi, 'Oparzenie Mózgu')
    .replace(/\bLob Acid\b/gi, 'Kwasowy Pocisk')
    .replace(/\b1st-level wizard spell\b/gi, 'zaklęcie czarodzieja 1. poziomu')
    .replace(/\bcleric spell up to 9th level\b/gi, 'zaklęcie kapłana do 9. poziomu')
    .replace(/\bspell up to 9th level\b/gi, 'zaklęcie do 9. poziomu')
    .replace(/\bDark Gift\b/gi, 'Mroczny Dar')
    .replace(/\bForce Grey\b/gi, 'Szare Siły')
    .replace(/\bcold brew\b/gi, 'kawa parzona na zimno')
    .replace(/\bUndercommonem\b/gi, 'Wspólnym Podmroku')
    .replace(/\bUndercommon\b/gi, 'Wspólny Podmroku')
    .replace(/\bDwarvish\b/gi, 'Krasnoludzki')
    .replace(/\bDraconic\b/gi, 'Smoczy')
    .replace(/\bAquan\b/gi, 'Akwan')
    .replace(/\bTerran\b/gi, 'Terrański')
    .replace(/\bInfernal\b/gi, 'Piekielny')
    .replace(/\bAbyssal\b/gi, 'Otchłani')
    .replace(/\bPrimordial\b/gi, 'Pierwotny')
    .replace(/\bSylvan\b/gi, 'Sylvański')
    .replace(/\bCommon\b/gi, 'Wspólny')
    .replace(/\bViziers\b/gi, 'Wezyrowie')
    .replace(/\bviziers\b/gi, 'wezyrowie')
    .replace(/\bInitiates\b/gi, 'Inicjowani')
    .replace(/\binitiates\b/gi, 'inicjowani')
    .replace(/\bHorror Nimbus\b/gi, 'Nimb Grozy')
    .replace(/^egzorcyści w Heralds of Dust$/i, 'egzorcyści w Heroldach Pyłu')
    .replace(/\bHeralds of Dust\b/gi, 'Heroldowie Pyłu')
    .replace(/\bw całym rozległym Underdarku\b/gi, 'w całym rozległym Podmroku')
    .replace(/\bUnderdarku\b/gi, 'Podmroku')
    .replace(/\bUnderdark\b/gi, 'Podmrok')
    .replace(/\bw Shadowfell\b/gi, 'w Krainie Cieni')
    .replace(/\bShadowfell\b/gi, 'Krainie Cieni')
    .replace(/\bkrainie Faerie\b/gi, 'Krainie Wróżek')
    .replace(/\bkrainę Faerie\b/gi, 'Krainę Wróżek')
    .replace(/\bPlan Faerie\b/gi, 'Kraina Wróżek')
    .replace(/\bPochodzenie Faerie\b/gi, 'Pochodzenie Wróżek')
    .replace(/\bkrólową faerie\b/gi, 'królową wróżek')
    .replace(/\bsmokami faerie\b/gi, 'wróżkowymi smokami')
    .replace(/\bsmoki faerie\b/gi, 'wróżkowe smoki')
    .replace(/\bsmokiem faerie\b/gi, 'wróżkowym smokiem')
    .replace(/\bsmoka faerie\b/gi, 'wróżkowego smoka')
    .replace(/\bsmok faerie\b/gi, 'wróżkowy smok')
    .replace(/\bfaerie smoki\b/gi, 'wróżkowe smoki')
    .replace(/\bfaerie smoka\b/gi, 'wróżkowego smoka')
    .replace(/\bfaerie smok\b/gi, 'wróżkowy smok')
    .replace(/\bblaskiem faerie\b/gi, 'blaskiem wróżkowym')
    .replace(/\bfaerie\b/gi, 'wróżkowy');
  localized = localized
    .replace(/^Fey Dotknął$/i, 'Dotknięty przez Fejów')
    .replace(/^Fey Wędrowiec$/i, 'Wróżkowy Wędrowiec')
    .replace(/\bFey\b/gi, 'Fej')
    .replace(/\bTortles\b/gi, 'Żółwiołaki')
    .replace(/\bTortle\b/gi, 'Żółwiołak')
    .replace(/^air$/i, 'powietrze')
    .replace(/^earth$/i, 'ziemia')
    .replace(/^water elementals$/i, 'żywiołaki wody')
    .replace(/^fire elementals$/i, 'żywiołaki ognia')
    .replace(/^bottle of black ink$/i, 'butelka czarnego atramentu')
    .replace(/^holy water$/i, 'święcona woda')
    .replace(/^vial of holy water$/i, 'fiolka święconej wody')
    .replace(/^red dragon$/i, 'czerwony smok')
    .replace(/^giant serpents$/i, 'wielkie węże')
    .replace(/^giant frogs$/i, 'wielkie żaby')
    .replace(/^giant constrictor snakes$/i, 'wielkie węże dusiciele')
    .replace(/^giant spiders$/i, 'wielkie pająki')
    .replace(/^giant centipedes$/i, 'wielkie stonogi')
    .replace(/^swarms of bats$/i, 'roje nietoperzy')
    .replace(/^swarms of rats$/i, 'roje szczurów')
    .replace(/^spell scroll$/i, 'zwój zaklęcia')
    .replace(/^potion of giant strength \(hill\)$/i, 'mikstura siły olbrzyma (wzgórz)')
    .replace(/^older faerie dragon$/i, 'starszy smok wróżkowy')
    .replace(/^ring of resistance \(force\)$/i, 'pierścień odporności (moc)')
    .replace(/^potion of resistance \(fire\)$/i, 'mikstura odporności (ogień)')
    .replace(/^caress of fire$/i, 'Pieszczota Ognia')
    .replace(/^etali, primal storm$/i, 'Etali, Pierwotna Burza')
    .replace(/^ghalta, primal hunger$/i, 'Ghalta, Pierwotny Głód')
    .replace(/^nezahal, primal tide$/i, 'Nezahal, Pierwotny Przypływ')
    .replace(/^tetzimoc, primal death$/i, 'Tetzimoc, Pierwotna Śmierć')
    .replace(/^zacama, primal calamity$/i, 'Zacama, Pierwotna Katastrofa')
    .replace(/^zetalpa, primal dawn$/i, 'Zetalpa, Pierwotny Świt')
    .replace(/^Tiny$/i, 'Malutki')
    .replace(/^Small$/i, 'Mały')
    .replace(/^Medium$/i, 'Średni')
    .replace(/^Large$/i, 'Duży')
    .replace(/^Huge$/i, 'Wielki')
    .replace(/^Gargantuan$/i, 'Gigantyczny');
  localized = localized
    .replace(/^Hunter$/i, '\u0141owca')
    .replace(/^Pyromancer \(PSK\)$/i, 'Piromanta (PSK)')
    .replace(/^Shadow Magic$/i, 'Magia Cienia')
    .replace(/^Chardalyn Dragon$/i, 'Smok chardalynowy')
    .replace(
      /^demon, diabeł lub yugoloth w Księdze Potworów$/i,
      'demon, czart lub yugoloth z Podręcznika Potworów',
    )
    .replace(/^Shadow Sorcery$/i, 'Zaklinaczstwo Cienia')
    .replace(/^Spellfire Sorcery$/i, 'Zaklinaczstwo Ognia Zaklęć')
    .replace(/^Spellfire Burst$/i, 'Wybuch Ognia Zaklęć')
    .replace(/^Bolstering Flames$/i, 'Wzmacniające Płomienie')
    .replace(/^Radiant Fire$/i, 'Promienisty Ogień')
    .replace(/^Innate Sorcery$/i, 'Wrodzone Zaklinaczstwo')
    .replace(/^Abjurer$/i, 'Abjurator')
    .replace(/\bWild Magic Surge\b/gi, 'Przypływ Dzikiej Magii')
    .replace(/\bAkcja Bonusowa\b/gi, 'Akcja dodatkowa')
    .replace(/\bBonus Biegłości\b/gi, 'Premia Biegłości')
    .replace(/\bGP\b/g, 'SZ')
    .replace(/\bgp\b/g, 'sz')
    .replace(/\bbonus action\b/gi, 'Akcja dodatkowa')
    .replace(/\baction\b/gi, 'Akcja')
    .replace(/\breaction\b/gi, 'Reakcja')
    .replace(/\bsaving throw\b/gi, 'Rzut obronny')
    .replace(/\bability check\b/gi, 'Test cechy')
    .replace(/\bhit points\b/gi, 'Punkty Wytrzymałości')
    .replace(/\barmor class\b/gi, 'Klasa Pancerza')
    .replace(/\bspell slots\b/gi, 'Komórki zaklęć')
    .replace(/\bspell slot\b/gi, 'Komórka zaklęcia')
    .replace(/\bslots\b/gi, 'komórki')
    .replace(/\bslot\b/gi, 'komórka')
    .replace(/\bsorcery points?\b/gi, 'Punkty Magii')
    .replace(/\bsorcery\b/gi, 'Zaklinaczstwo')
    .replace(/\bcantrips\b/gi, 'Sztuczki')
    .replace(/\bcantrip\b/gi, 'Sztuczka')
    .replace(/\bdarkvision\b/gi, 'Widzenie w ciemności')
    .replace(/\bconcentration\b/gi, 'Koncentracja')
    .replace(/\blong rest\b/gi, 'Długi odpoczynek')
    .replace(/\bshort rest\b/gi, 'Krótki odpoczynek')
    .replace(/\bbonus\b/gi, 'Premia');
  localized = localized
    .replace(/\bforce damage\b/gi, 'obrażenia od mocy')
    .replace(/\bradiant damage\b/gi, 'obrażenia promieniste')
    .replace(/\bnecrotic damage\b/gi, 'obrażenia nekrotyczne')
    .replace(/\bpsychic damage\b/gi, 'obrażenia psychiczne')
    .replace(/\bthunder damage\b/gi, 'obrażenia od gromu')
    .replace(/\blightning damage\b/gi, 'obrażenia od piorunów')
    .replace(/\bacid damage\b/gi, 'obrażenia od kwasu')
    .replace(/\bcold damage\b/gi, 'obrażenia od zimna')
    .replace(/\bfire damage\b/gi, 'obrażenia od ognia')
    .replace(/\bpoison damage\b/gi, 'obrażenia od trucizny')
    .replace(/\bpiercing damage\b/gi, 'obrażenia kłute')
    .replace(/\bslashing damage\b/gi, 'obrażenia sieczne')
    .replace(/\bbludgeoning damage\b/gi, 'obrażenia obuchowe')
    .replace(/^(\s*\d+\s+)Piercing\b/gi, '$1Kłute')
    .replace(/^(\s*\d+\s+)Bludgeoning\b/gi, '$1Obuchowe')
    .replace(/^(\s*\d+\s+)Slashing\b/gi, '$1Sieczne')
    .replace(/^Piercing(?=\s+\d+d\d+\b)/i, 'Kłute')
    .replace(/^Bludgeoning(?=\s+\d+d\d+\b)/i, 'Obuchowe')
    .replace(/^Slashing(?=\s+\d+d\d+\b)/i, 'Sieczne')
    .replace(/\bfeet\b/gi, 'stóp')
    .replace(/\bminutes\b/gi, 'minut')
    .replace(/\bminute\b/gi, 'minuta')
    .replace(/\bsee\s+the\s+appendix\b/gi, 'zobacz dodatek')
    .replace(/\bsee\s+appendix\s+([A-Z])\b/gi, 'zobacz dodatek $1')
    .replace(/\bchapters\s+(\d+)\b/gi, 'Rozdziały $1')
    .replace(/\bchapter\s+(\d+)\b/gi, 'Rozdział $1')
    .replace(/\bappendix\s+([A-Z])\b/gi, 'Dodatek $1')
    .replace(/\brules glossary\b/gi, 'słownik zasad');
  localized = localized
    .replace(/\bspellcasting focus\b/gi, 'Ognisko Magiczne')
    .replace(/\bspellcasting\b/gi, 'Rzucanie Czarów')
    .replace(/\bmanifestation time\b/gi, 'Czas manifestacji')
    .replace(/\brange\b/gi, 'Zasięg')
    .replace(/\bduration\b/gi, 'Czas trwania')
    .replace(/^self$/i, 'Własny')
    .replace(/\bmanifest a power\b/gi, 'manifestuj moc')
    .replace(/\bcast a spell\b/gi, 'rzuć zaklęcie')
    .replace(/^body strain$/i, 'napięcie ciała')
    .replace(/^mind strain$/i, 'napięcie umysłu')
    .replace(/^soul strain$/i, 'napięcie duszy')
    .replace(/^Cerebral Breakthrough\.$/i, 'Przełom mózgowy.')
    .replace(/^Mind Over Matter\.$/i, 'Umysł ponad materią.')
    .replace(/^Mind Whisperer\.$/i, 'Szeptacz umysłu.')
    .replace(/^Prescribed Effects\.$/i, 'Zalecone efekty.')
    .replace(/^Mentally Prepared\.$/i, 'Przygotowany mentalnie.')
    .replace(/^Fight or Flight Response\.$/i, 'Reakcja walcz albo uciekaj.')
    .replace(/^Draconic Genome\.$/i, 'Smoczy genom.')
    .replace(/^Giant Genome\.$/i, 'Genom olbrzyma.')
    .replace(/^Cerebellum Genome\.$/i, 'Genom móżdżku.')
    .replace(/^Psionic Exertion$/i, 'Wysiłek psioniczny')
    .replace(/^Powers$/i, 'Moce')
    .replace(/^Beast$/i, 'Bestia')
    .replace(/^feat$/i, 'atut')
    .replace(/^type=Light Armor$/i, 'lekkiej zbroi')
    .replace(/^type=Medium Armor$/i, 'zbroi średniej')
    .replace(/^type=Heavy Armor$/i, 'ciężkiej zbroi')
    .replace(/^type=simple weapon;martial weapon$/i, 'broni prostej lub wojskowej')
    .replace(/^type=simple weapon;melee weapon=sand$/i, 'prostych broni do walki wręcz')
    .replace(/^type=martial weapon;melee weapon=sand$/i, 'wojskowej broni do walki wręcz')
    .replace(/^type=martial weapon;ranged weapon=sand$/i, 'broni wojskowej dystansowej');
  localized = localized
    .replace(
      /^type=melee weapon;ranged weapon=sand$/i,
      'broni do walki wręcz lub broni dystansowej',
    )
    .replace(/^type=melee weapon$/i, 'broni do walki wręcz')
    .replace(/^type=martial weapon$/i, 'broni wojskowej')
    .replace(/^damage type=acid$/i, 'obrażeń od kwasu')
    .replace(/^damage type=lightning$/i, 'obrażeń od piorunów')
    .replace(/^damage type=fire$/i, 'obrażeń od ognia')
    .replace(/^damage type=poison$/i, 'obrażeń od trucizny')
    .replace(/^damage type=cold$/i, 'obrażeń od zimna')
    .replace(/^cast time=action$/i, 'zaklęć o czasie rzucania 1 akcja')
    .replace(
      /(\d)(?:st|nd|rd|th)-level spell from the apothecary spell/gi,
      (_, level: string) => `Zaklęcie aptekarza ${level}. poziomu`,
    )
    .replace(
      /apothecary spells that deals damage/gi,
      'zaklęcia aptekarza zadające obrażenia',
    )
    .replace(
      /apothecary spell slot that targets a single creature and restores hit points/gi,
      'miejsce zaklęcia aptekarza obierające za cel pojedyncze stworzenie i przywracające punkty wytrzymałości',
    )
    .replace(
      /\b([1-6])(?:st|nd|rd|th) order or lower\b/gi,
      (_, level: string) => `moc ${level}. kręgu lub niższa`,
    )
    .replace(
      /\bdemon of challenge rating (\d+) or lower\b/gi,
      'demona o stopniu zagrożenia $1 lub niższym',
    )
    .replace(/\b1st-order powers\b/gi, 'Moce 1. kręgu')
    .replace(/\b2nd-order powers\b/gi, 'Moce 2. kręgu')
    .replace(/\b3rd-order powers\b/gi, 'Moce 3. kręgu')
    .replace(/\b4th-order powers\b/gi, 'Moce 4. kręgu')
    .replace(/\b5th-order powers\b/gi, 'Moce 5. kręgu')
    .replace(/\b6th-order powers\b/gi, 'Moce 6. kręgu');
  localized = localized
    .replace(/\b1st-order power\b/gi, 'Moc 1. kręgu')
    .replace(/\b2nd-order power\b/gi, 'Moc 2. kręgu')
    .replace(/\b3rd-order power\b/gi, 'Moc 3. kręgu')
    .replace(/\b4th-order power\b/gi, 'Moc 4. kręgu')
    .replace(/\b5th-order power\b/gi, 'Moc 5. kręgu')
    .replace(/\b6th-order power\b/gi, 'Moc 6. kręgu')
    .replace(/\b2nd order or higher\b/gi, '2. krąg lub wyższy')
    .replace(/\b3rd order or lower\b/gi, '3. krąg lub niższy')
    .replace(/\b4th order or lower\b/gi, '4. krąg lub niższy')
    .replace(/\b5th order or lower\b/gi, '5. krąg lub niższy')
    .replace(/\b1st order through 5th order\b/gi, 'od 1. do 5. kręgu')
    .replace(/\bunarmed strike\b/gi, 'Atak Bez Broni')
    .replace(/\bopportunity attack\b/gi, 'Atak Okazyjny')
    .replace(/\bincapacitated\b/gi, 'Bezradny')
    .replace(/\bdisengage\b/gi, 'Wycofanie')
    .replace(/\badvantage\b/gi, 'Przewaga')
    .replace(/\bdisadvantage\b/gi, 'Utrudnienie')
    .replace(/\battack\b/gi, 'Atak')
    .replace(/\bdash\b/gi, 'Bieg')
    .replace(/\bdodge\b/gi, 'Unik')
    .replace(/\bhelp\b/gi, 'Pomoc')
    .replace(/\bhide\b/gi, 'Ukrycie')
    .replace(/\binfluence\b/gi, 'Wpływ')
    .replace(/\bmagic\b/gi, 'Magia')
    .replace(/\bready\b/gi, 'Gotowość')
    .replace(/\butilize\b/gi, 'Wykorzystanie')
    .replace(/\bfighting style\b/gi, 'Styl walki')
    .replace(/\bfinesse\b/gi, 'Finezja')
    .replace(/\breaction\b/gi, 'Reakcja')
    .replace(/\bspeed\b/gi, 'Szybkość')
    .replace(/\btouch\b/gi, 'Dotyk')
    .replace(/\bconcentration\b/gi, 'Koncentracja')
    .replace(/\bsearch\b/gi, 'Przeszukanie')
    .replace(/\bstudy\b/gi, 'Nauka')
    .replace(/\bnothing here\b/gi, 'Brak treści')
    .replace(/\bchapter\b/gi, 'rozdział')
    .replace(/\bappendix\b/gi, 'dodatek')
    .replace(/\bhere\b/gi, 'tutaj')
    .replace(/\bsee\b/gi, 'zobacz');
  return localizePolishTitle(localized) ?? localized;
}

function localizePolishTitle(text: string): string | undefined {
  const trimmed = text.trim();
  if (
    trimmed.length < 2 ||
    trimmed.length > 96 ||
    /[.!?]$/u.test(trimmed) ||
    !/^[\dA-ZŻŹĆŃŁŚĄĘÓ]/u.test(trimmed)
  ) {
    return undefined;
  }
  let changes = 0;
  const localized = trimmed.replace(/[\p{L}][\p{L}'’-]*/gu, (word) => {
    const value = POLISH_TITLE_WORDS[word.toLowerCase()];
    if (value === undefined) return word;
    changes += 1;
    return value;
  });
  if (changes === 0) return undefined;
  return localized
    .replace(/\s{2,}/gu, ' ')
    .replace(/\s+([,:;])/gu, '$1')
    .trim();
}

export function localizePlainText(text: string, locale: Locale): string {
  return localizePolishLabel(text, locale);
}

const QUICKREF_LABELS: Record<Locale, Record<string, string>> = {
  en: {},
  pl: {
    cover: 'Osłona',
    'difficult terrain': 'Trudny teren',
    'vision and light': 'Wzrok i światło',
    'total cover': 'Całkowita osłona',
    'half cover': 'Połowiczna osłona',
    'three-quarters cover': 'Trzy czwarte osłony',
    'lightly obscured': 'Lekko przesłonięty',
    'lightly obscure': 'Lekko przesłania',
    'lightly obscures': 'Lekko przesłania',
    'lightly obscuring': 'Lekko przesłaniając',
    'heavily obscured': 'Silnie przesłonięty',
    'heavily obscures': 'Silnie przesłania',
    'bright light': 'Jasne światło',
    'dim light': 'Słabe światło',
    'dimly lit': 'Słabo oświetlony',
    dim: 'Słabo',
    dark: 'Ciemność',
    'no light': 'Brak światła',
    vision: 'Wzrok',
    surprised: 'Zaskoczony',
  },
};

export function markupLabel(locale: Locale, key: keyof LabelSet): string {
  return LABELS[locale][key];
}

function saveLabel(locale: Locale, ability: string): string {
  const name = SAVE_ABILITY[locale][ability.toLowerCase()] ?? ability;
  return locale === 'pl' ? `Rzut Obronny ${name}:` : `${name}${LABELS.en.saveSuffix}`;
}

function failureBy(locale: Locale, n: string): string {
  return locale === 'pl'
    ? `Niepowodzenie o ${n} lub Więcej:`
    : `Failure by ${n} or More:`;
}

function quickrefLabel(locale: Locale, parts: string[]): string {
  const candidates = [parts[2], parts[4], parts[3], parts[0]].filter(
    (part): part is string =>
      typeof part === 'string' && part.length > 0 && !/^\d+$/.test(part),
  );
  const value = candidates[0] ?? parts[0]!;
  return QUICKREF_LABELS[locale][value.toLowerCase()] ?? value;
}

function featureLabel(first: string, parts: string[], sourceIndexes: number[]): string {
  const candidate = parts.at(-1)?.trim();
  const sourceValues = sourceIndexes
    .map((index) => parts[index]?.trim())
    .filter((value): value is string => Boolean(value));
  if (!candidate || /^\d+$/.test(candidate) || sourceValues.includes(candidate)) {
    return first;
  }
  return candidate;
}

function bookReference(
  tag: 'book' | 'adventure',
  first: string,
  parts: string[],
  key: number,
  locale: Locale,
): ReactNode {
  const source = parts[1]?.trim();
  const display = localizePolishLabel(parts[3]?.trim() || first, locale);
  const book = source ? getBook(source.toLowerCase()) : undefined;
  if (!book) return <Fragment key={key}>{display}</Fragment>;
  const chapter = Number(parts[2]);
  const chapterPath = Number.isInteger(chapter) ? `/${chapter}` : '';
  return (
    <Link
      key={key}
      to={{
        pathname: `/books/${book.id}${chapterPath}`,
        ...(parts[3] ? { hash: bookAnchorHash(undefined, display) } : {}),
      }}
      className="text-arcane-300 underline decoration-arcane-500/50 underline-offset-2 hover:text-arcane-200"
      data-reference-type={tag}
    >
      {display}
    </Link>
  );
}

function externalReference(
  first: string,
  parts: string[],
  key: number,
  locale: Locale,
): ReactNode {
  const firstIsUrl = /^https?:\/\//i.test(first);
  const href = firstIsUrl ? first : parts[1]?.trim();
  const label = localizePolishLabel(
    firstIsUrl ? parts[2]?.trim() || first : first,
    locale,
  );
  if (!href || !/^https?:\/\//i.test(href)) {
    return <Fragment key={key}>{label}</Fragment>;
  }
  return (
    <a key={key} href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

const POLISH_UNITS: Record<string, [string, string]> = {
  bar: ['tabliczka', 'tabliczki'],
  block: ['kostka', 'kostki'],
  clove: ['ząbek', 'ząbki'],
  container: ['pojemnik', 'pojemniki'],
  egg: ['jajko', 'jajka'],
  package: ['opakowanie', 'opakowania'],
  yolk: ['żółtko', 'żółtka'],
};

function unitLabel(parts: string[], locale: Locale): string {
  const amount = parts[0] ?? '';
  const singular = parts[1]?.trim();
  const plural = parts[2]?.trim() || singular;
  if (!singular) return amount;
  const numericAmount = Number(amount);
  const unit = numericAmount === 1 ? singular : plural;
  if (locale === 'pl') {
    const localized = POLISH_UNITS[singular.toLowerCase()];
    if (localized)
      return `${amount} ${numericAmount === 1 ? localized[0] : localized[1]}`.trim();
  }
  return `${amount} ${unit}`.trim();
}

function skillCheckLabel(first: string, parts: string[]): string {
  const match = /^\S+\s+(.+)$/.exec(first.trim());
  return match?.[1] ?? parts[2]?.trim() ?? parts[1]?.trim() ?? first;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function renderTag(content: string, key: number, locale: Locale): ReactNode {
  const spaceIndex = content.indexOf(' ');
  const tag = spaceIndex === -1 ? content : content.slice(0, spaceIndex);
  const rest = spaceIndex === -1 ? '' : content.slice(spaceIndex + 1);
  const parts = rest.split('|');
  const first = parts[0]!;
  const source = parts[1] || undefined;
  const display = parts[2] || first;

  switch (tag) {
    case 'b':
    case 'bold':
      return <strong key={key}>{parseMarkup(rest, locale)}</strong>;
    case 'i':
    case 'italic':
    case 'note':
      return <em key={key}>{parseMarkup(rest, locale)}</em>;
    case 'hit': {
      const shown = first.startsWith('-') ? first : `+${first}`;
      const bonus = first.startsWith('-') ? first : `+ ${first}`;
      return (
        <RollableDice
          key={key}
          variant="attack"
          expression={`1d20 ${bonus}`}
          display={shown}
          label={translate(locale, 'compendium.detail.attackRoll')}
        />
      );
    }
    case 'atk':
    case 'atkr':
      return (
        <em key={key} className="text-ink-300">
          {ATTACK_TYPES[locale][first] ?? first}
        </em>
      );
    case 'h':
      return (
        <Fragment key={key}>
          <em className="text-ink-300">{LABELS[locale].hit}</em>{' '}
        </Fragment>
      );
    case 'm':
      return (
        <Fragment key={key}>
          <em className="text-ink-300">{LABELS[locale].miss}</em>{' '}
        </Fragment>
      );
    case 'dc':
      return (
        <Fragment key={key}>
          {LABELS[locale].dc} {first}
        </Fragment>
      );
    case 'dcYourSpellSave':
      return <Fragment key={key}>{LABELS[locale].dcYourSpellSave}</Fragment>;
    case 'chance':
      return <Fragment key={key}>{first}%</Fragment>;
    case 'recharge': {
      const min = first ? Number(first) : 6;
      return <RechargeRoll key={key} min={min} />;
    }

    case 'actSave':
      return (
        <em key={key} className="font-semibold not-italic text-ink-100">
          {saveLabel(locale, first)}
        </em>
      );
    case 'actSaveFail':
      return (
        <em key={key} className="font-semibold not-italic text-ink-100">
          {LABELS[locale].failure}
        </em>
      );
    case 'actSaveSuccess':
      return (
        <em key={key} className="font-semibold not-italic text-ink-100">
          {LABELS[locale].success}
        </em>
      );
    case 'actSaveSuccessOrFail':
      return (
        <em key={key} className="font-semibold not-italic text-ink-100">
          {LABELS[locale].failureOrSuccess}
        </em>
      );
    case 'actSaveFailBy':
      return (
        <em key={key} className="font-semibold not-italic text-ink-100">
          {failureBy(locale, first)}
        </em>
      );
    case 'actTrigger':
      return (
        <em key={key} className="font-semibold not-italic text-ink-100">
          {LABELS[locale].trigger}
        </em>
      );
    case 'actResponse':
      return (
        <em key={key} className="font-semibold not-italic text-ink-100">
          {LABELS[locale].response}
        </em>
      );
    case 'filter':
    case 'footnote':
    case 'hitYourSpellAttack':
      return <Fragment key={key}>{localizePolishLabel(first, locale)}</Fragment>;
    case 'language':
      return (
        <ReferenceLink
          key={key}
          category="languages"
          slug={slugify(first)}
          label={localizePolishLanguageLabel(display, locale)}
          {...(source ? { source } : {})}
        />
      );
    case 'classFeature':
      return (
        <Fragment key={key}>
          {localizePolishLabel(featureLabel(first, parts, [2, 4]), locale)}
        </Fragment>
      );
    case 'subclassFeature':
      return (
        <Fragment key={key}>
          {localizePolishLabel(featureLabel(first, parts, [2, 4]), locale)}
        </Fragment>
      );
    case 'skillCheck':
      return (
        <Fragment key={key}>
          {localizePolishLabel(skillCheckLabel(first, parts), locale)}
        </Fragment>
      );
    case 'subclass':
      return <Fragment key={key}>{localizePolishLabel(first, locale)}</Fragment>;
    case 'itemProperty':
      return <Fragment key={key}>{localizePolishLabel(display, locale)}</Fragment>;
    case 'link':
      return externalReference(first, parts, key, locale);
    case 'unit':
      return <Fragment key={key}>{unitLabel(parts, locale)}</Fragment>;
    case 'color':
    case 'style':
    case 'd20':
      return <Fragment key={key}>{first}</Fragment>;
    case 'area':
      return <Fragment key={key}>{localizePolishLabel(first, locale)}</Fragment>;
    case 'book':
    case 'adventure':
      return bookReference(tag, first, parts, key, locale);
    case 'quickref':
      return <Fragment key={key}>{quickrefLabel(locale, parts)}</Fragment>;
    case 'card': {
      const deckName = parts[1]?.trim();
      const deckSource = parts[2]?.trim();
      if (!deckName) return <Fragment key={key}>{first}</Fragment>;
      return (
        <ReferenceLink
          key={key}
          category="decks"
          slug={slugify(deckName)}
          label={localizePolishLabel(first, locale)}
          {...(deckSource ? { source: deckSource } : {})}
        />
      );
    }
    case 'damage':
    case 'dice':
    case 'scaledamage':
    case 'scaledice': {
      const rollExpr = parseExpression(display) ? display : first;
      const localizedDisplay = localizeFormula(display, locale);
      if (parseExpression(rollExpr)) {
        return (
          <RollableDice
            key={key}
            variant="damage"
            expression={rollExpr}
            display={localizedDisplay}
          />
        );
      }
      return (
        <span key={key} className="font-medium text-ember-400">
          {/^\s*\d/u.test(localizedDisplay)
            ? localizedDisplay
            : localizePolishLabel(localizedDisplay, locale)}
        </span>
      );
    }
    default: {
      const category = LINKABLE[tag];
      if (category) {
        return (
          <ReferenceLink
            key={key}
            category={category}
            slug={slugify(first)}
            label={localizePolishReferenceLabel(tag, display, locale)}
            {...(source ? { source } : {})}
          />
        );
      }

      return (
        <Fragment key={key}>
          {localizePolishReferenceLabel(tag, display, locale)}
        </Fragment>
      );
    }
  }
}

export function parseMarkup(text: string, locale: Locale = DEFAULT_LOCALE): ReactNode[] {
  text = localizePolishGenericLabels(text, locale);
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;

  while (cursor < text.length) {
    const start = text.indexOf('{@', cursor);
    if (start === -1) {
      nodes.push(text.slice(cursor));
      break;
    }
    if (start > cursor) nodes.push(text.slice(cursor, start));

    let depth = 0;
    let end = start;
    for (; end < text.length; end += 1) {
      if (text[end] === '{') depth += 1;
      else if (text[end] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    nodes.push(renderTag(text.slice(start + 2, end), key++, locale));
    cursor = end + 1;
  }

  return nodes;
}
