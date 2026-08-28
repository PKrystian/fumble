import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { markupLabel, parseMarkup } from './markup';

vi.mock('./ReferenceLink', () => ({
  ReferenceLink: ({
    category,
    slug,
    label,
  }: {
    category: string;
    slug: string;
    label: string;
  }) => <a href={`/compendium/${category}/${slug}/`}>{label}</a>,
}));

function renderMarkup(text: string, locale: 'en' | 'pl' = 'en') {
  return render(<MemoryRouter>{parseMarkup(text, locale)}</MemoryRouter>);
}

describe('parseMarkup', () => {
  it('passes through plain text', () => {
    const { container } = renderMarkup('Just plain text.');
    expect(container).toHaveTextContent('Just plain text.');
    expect(
      render(<MemoryRouter>{parseMarkup('Default locale')}</MemoryRouter>).container,
    ).toHaveTextContent('Default locale');
  });

  it('renders damage tags as their dice expression', () => {
    const { container } = renderMarkup('takes {@damage 8d6} fire');
    expect(container).toHaveTextContent('takes 8d6 fire');
  });

  it('localizes variables in summon formulas', () => {
    expect(
      renderMarkup('{@damage 1d8 + summonSpellLevel}', 'pl').container,
    ).toHaveTextContent('1d8 + poziom czaru');
    expect(renderMarkup('{@damage 1d8 + PB}', 'pl').container).toHaveTextContent(
      '1d8 + Bonus Biegłości',
    );
  });

  it('formats dc and hit helper tags', () => {
    expect(renderMarkup('{@dc 15}').container).toHaveTextContent('DC 15');
    expect(renderMarkup('{@hit 5}').container).toHaveTextContent('+5');
  });

  it('links condition references into the compendium', () => {
    renderMarkup('You have the {@condition Prone} condition');
    const link = screen.getByRole('link', { name: 'Prone' });
    expect(link).toHaveAttribute('href', '/compendium/conditions/prone/');
  });

  it('links book and adventure references to the matching reader route', () => {
    renderMarkup('{@adventure Curse of Strahd|CoS|0|Death House}');
    expect(screen.getByRole('link', { name: 'Death House' })).toHaveAttribute(
      'href',
      '/books/cos/0/#name=Death+House',
    );
  });

  it('keeps book references without a shipped target as text', () => {
    const { container } = renderMarkup(
      '{@adventure Unknown Adventure|UNKNOWN|0|Chapter}',
    );
    expect(container).toHaveTextContent('Chapter');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('links skill references now that skills ship', () => {
    renderMarkup('make a {@skill Stealth} check');
    expect(screen.getByRole('link', { name: 'Stealth' })).toHaveAttribute(
      'href',
      '/compendium/skills/stealth/',
    );
  });

  it('links variant-rule references to the rules glossary', () => {
    renderMarkup('you gain {@variantrule Advantage|XPHB}');
    expect(screen.getByRole('link', { name: 'Advantage' })).toHaveAttribute(
      'href',
      '/compendium/rules/advantage/',
    );
  });

  it('localizes variant-rule reference labels without changing their links', () => {
    renderMarkup('zyskujesz {@variantrule Advantage|XPHB}', 'pl');
    expect(screen.getByRole('link', { name: 'Przewaga' })).toHaveAttribute(
      'href',
      '/compendium/rules/advantage/',
    );
  });

  it('links Fumble firearm references to the firearm category', () => {
    renderMarkup('use a {@firearm Pneumatic Pistol|Fumble}');
    expect(screen.getByRole('link', { name: 'Pneumatic Pistol' })).toHaveAttribute(
      'href',
      '/compendium/firearms/pneumatic-pistol/',
    );
  });

  it('links Talent powers to the psionics category', () => {
    renderMarkup('manifest {@psionic Adapt|TalPsi}');
    expect(screen.getByRole('link', { name: 'Adapt' })).toHaveAttribute(
      'href',
      '/compendium/psionics/adapt/',
    );
  });

  it('shows the label of a filter tag, not its parameters', () => {
    const { container } = renderMarkup(
      'gain a {@filter Fighting Style|feats|category=FS}',
    );
    expect(container).toHaveTextContent('gain a Fighting Style');
    expect(container).not.toHaveTextContent('category=FS');
  });

  it('links feat references now that feats ship', () => {
    renderMarkup('take the {@feat Grappler|XPHB} feat');
    expect(screen.getByRole('link', { name: 'Grappler' })).toHaveAttribute(
      'href',
      '/compendium/feats/grappler/',
    );
  });

  it('links cards to their containing deck', () => {
    renderMarkup('draw a {@card Dragon|Deck of Many More Things|BMT}');
    expect(screen.getByRole('link', { name: 'Dragon' })).toHaveAttribute(
      'href',
      '/compendium/decks/deck-of-many-more-things/',
    );
  });

  it('localizes standalone Fiend card labels in Polish', () => {
    renderMarkup('draw a {@card Fiend|Deck of Many More Things|BMT}', 'pl');
    expect(screen.getByRole('link', { name: 'Czart' })).toHaveAttribute(
      'href',
      '/compendium/decks/deck-of-many-more-things/',
    );
  });

  it('localizes Wild Magic Surge labels without changing table links', () => {
    renderMarkup('roll on {@table Wild Magic Surge|PHB}', 'pl');
    expect(screen.getByRole('link', { name: 'Przypływ Dzikiej Magii' })).toHaveAttribute(
      'href',
      '/compendium/tables/wild-magic-surge/',
    );
  });

  it('localizes subclass labels while keeping their reference identity', () => {
    renderMarkup('choose {@subclass Hunter|Ranger|PHB}', 'pl');
    expect(screen.getByText(/Łowca/)).toBeInTheDocument();
  });

  it('renders recharge tags as a recharge range', () => {
    expect(renderMarkup('Tongue {@recharge}').container).toHaveTextContent(
      'Tongue (Recharge 6)',
    );
    expect(renderMarkup('Fire Breath {@recharge 5}').container).toHaveTextContent(
      'Fire Breath (Recharge 5-6)',
    );
  });

  it('renders 2024 action save labels', () => {
    expect(renderMarkup('{@actSave dex} DC 15').container).toHaveTextContent(
      'Dexterity Saving Throw: DC 15',
    );
    expect(renderMarkup('{@actSaveFail} half damage').container).toHaveTextContent(
      'Failure: half damage',
    );
  });

  it('handles nested tags inside formatting tags', () => {
    const { container } = renderMarkup('{@i deals {@damage 1d6} cold}');
    const emphasis = container.querySelector('em');
    expect(emphasis).not.toBeNull();
    expect(emphasis).toHaveTextContent('deals 1d6 cold');
  });

  it('renders 5etools hash item references without exposing the marker', () => {
    const { container } = renderMarkup(
      'The item is described in {#itemEntry Absorbing Tattoo|TCE}.',
    );
    expect(container).toHaveTextContent('The item is described in Absorbing Tattoo.');
    expect(container).not.toHaveTextContent('{#itemEntry');

    const polish = renderMarkup('{#itemTatuaż pochłaniający wejście|TCE}', 'pl');
    expect(polish.container).toHaveTextContent('Tatuaż pochłaniający wejście');
    expect(polish.container).not.toHaveTextContent('{#');
  });

  it('renders bold, italic and note formatting aliases', () => {
    const { container } = renderMarkup(
      '{@b Bold} {@bold Strong} {@italic Italic} {@note Note}',
    );
    expect(container.querySelectorAll('strong')).toHaveLength(2);
    expect(container.querySelectorAll('em')).toHaveLength(2);
  });

  it('renders attack helpers and localized attack types', () => {
    expect(renderMarkup('{@hit -2}').container).toHaveTextContent('-2');
    expect(renderMarkup('{@atk mw}').container).toHaveTextContent('Melee Weapon Attack:');
    expect(renderMarkup('{@atkr custom}').container).toHaveTextContent('custom');
    expect(renderMarkup('{@h}').container).toHaveTextContent('Hit:');
    expect(renderMarkup('{@dcYourSpellSave}').container).toHaveTextContent(
      'your spell save DC',
    );
    expect(renderMarkup('{@chance 25}').container).toHaveTextContent('25%');
  });

  it('renders every action label in both locales', () => {
    const tags = [
      '{@actSaveSuccess}',
      '{@actSaveSuccessOrFail}',
      '{@actSaveFailBy 5}',
      '{@actTrigger}',
      '{@actResponse}',
    ].join(' ');
    expect(renderMarkup(tags).container).toHaveTextContent(
      'Success: Failure or Success: Failure by 5 or More: Trigger: Response:',
    );
    expect(
      renderMarkup('{@actSave str} {@actSaveFailBy 3}', 'pl').container,
    ).toHaveTextContent('Rzut Obronny Siły: Niepowodzenie o 3 lub Więcej:');
    expect(renderMarkup('{@actSave luck}').container).toHaveTextContent(
      'luck Saving Throw:',
    );
    expect(markupLabel('pl', 'statBlock')).toBe('(blok statystyk)');
  });

  it('renders simple helper tags and non-rollable formulas', () => {
    const { container } = renderMarkup(
      '{@footnote Foot} {@quickref Quick} {@hitYourSpellAttack Spell} {@dice variable}',
    );
    expect(container).toHaveTextContent('Foot Quick Spell variable');
    expect(container.querySelector('.text-ember-400')).not.toBeNull();
    expect(renderMarkup('{@quickref 123}').container).toHaveTextContent('123');
    expect(
      renderMarkup('{@dice Barbarian Starting Wealth}', 'pl').container,
    ).toHaveTextContent('Początkowe Bogactwo Barbarzyńcy');
  });

  it('renders feature, skill-check, unit, and external-link tags', () => {
    const { container } = renderMarkup(
      '{@classFeature Cunning Strike|Rogue|XPHB|5|XPHB} {@subclassFeature Fast Hands|Rogue||Thief||3} {@subclassFeature Spellfire Burst|Sorcerer|XPHB|Spellfire|FRHoF|3|FRHoF} {@skill Acrobatics} {@skillCheck acrobatics 6} {@unit 2|egg|eggs} {@link Rules|https://example.com}',
    );
    expect(container).toHaveTextContent('Cunning Strike Fast Hands Spellfire Burst');
    expect(container).not.toHaveTextContent('FRHoF');
    expect(screen.getByRole('link', { name: 'Acrobatics' })).toBeInTheDocument();
    expect(container).toHaveTextContent('6');
    expect(container).toHaveTextContent('2 eggs');
    expect(screen.getByRole('link', { name: 'Rules' })).toHaveAttribute(
      'href',
      'https://example.com',
    );
  });

  it('localizes recipe units in Polish', () => {
    const { container } = renderMarkup(
      '{@unit 1|egg|eggs} {@unit 2|clove|cloves} {@unit 2|yolk|yolks} {@unit 1|block|blocks} {@unit 2|package|packages} {@unit 1|container|containers} {@unit 1|bar|bars}',
      'pl',
    );
    expect(container).toHaveTextContent(
      '1 jajko 2 ząbki 2 żółtka 1 kostka 2 opakowania 1 pojemnik 1 tabliczka',
    );
  });

  it('renders hit and miss markers', () => {
    expect(renderMarkup('{@h} Hit text {@m} Miss text').container).toHaveTextContent(
      'Hit: Hit text Miss: Miss text',
    );
  });

  it('localizes quick-reference labels', () => {
    expect(
      renderMarkup('{@quickref Cover||3||half cover}', 'pl').container,
    ).toHaveTextContent('Połowiczna osłona');
    expect(
      renderMarkup('{@quickref difficult terrain||trudny teren}', 'pl').container,
    ).toHaveTextContent('trudny teren');
  });

  it('uses translated display text and handles incomplete markup', () => {
    expect(
      renderMarkup('{@spell Fireball|XPHB|Kula Ognia}', 'pl').container,
    ).toHaveTextContent('Kula Ognia');
    expect(renderMarkup('before {@b unfinished').container).toHaveTextContent(
      'before unfinished',
    );
  });

  it('localizes psionic metadata labels and visible filter text', () => {
    const { container } = renderMarkup(
      '{@b Manifestation Time:} 1 action {@b Range:} 30 feet {@b Duration:} 1 minute {@filter 2nd-order powers|psionics|order=2nd-order}',
      'pl',
    );
    expect(container).toHaveTextContent(
      'Czas manifestacji: 1 Akcja Zasięg: 30 stóp Czas trwania: 1 minuta Moce 2. kręgu',
    );
  });

  it('localizes raw rules labels without changing their reference targets', () => {
    const { container } = renderMarkup(
      '{@variantrule Bonus Action|XPHB} {@variantrule Saving Throw|XPHB} {@variantrule Hit Points|XPHB}',
      'pl',
    );
    expect(container).toHaveTextContent(
      'Akcja dodatkowa Rzut obronny Punkty Wytrzymałości',
    );
    expect(screen.getByRole('link', { name: 'Akcja dodatkowa' })).toHaveAttribute(
      'href',
      '/compendium/rules/bonus-action/',
    );
  });

  it('localizes standalone damage type labels', () => {
    expect(
      renderMarkup('{@damage piercing} {@damage force} {@damage thunder}', 'pl')
        .container,
    ).toHaveTextContent('Kłute Moc Gromu');
  });

  it('keeps creature names separate from damage type labels', () => {
    renderMarkup(
      '{@creature Piercer||piercing} {@creature Shadow Demon||demon} {@creature Chardalyn Dragon|IDRotF|Chardalyn Dragon}',
      'pl',
    );
    expect(screen.getByRole('link', { name: 'Przebijak' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Demon Cienia' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Smok chardalynowy' })).toBeInTheDocument();
  });

  it('repairs mixed English and Polish reference labels', () => {
    expect(
      renderMarkup(
        '{@feat Fey-Touched|XPHB|Fey Dotknął} {@class Ranger|XPHB|Fey Wędrowiec}',
        'pl',
      ).container,
    ).toHaveTextContent('Dotknięty przez Fejów Wróżkowy Wędrowiec');
  });

  it('localizes remaining mixed creature display labels', () => {
    expect(
      renderMarkup(
        '{@creature Flapjack the flumph|LOX|Flapjack the flumph} {@creature Heralds of Dust Exorcist|AATM|egzorcyści w Heralds of Dust} {@creature Zombie Kobolds Icewind|IDRotF|Zombie koboldy Icewind}',
        'pl',
      ).container,
    ).toHaveTextContent(
      'Flapjack, flumph egzorcyści w Heroldach Pyłu Zombie koboldy z Doliny Lodowego Wichru',
    );
  });

  it('localizes damage labels in translated weapon tables', () => {
    expect(renderMarkup('1 Piercing', 'pl').container).toHaveTextContent('1 Kłute');
    expect(renderMarkup('Piercing 1d4', 'pl').container).toHaveTextContent('Kłute 1d4');
    expect(renderMarkup('Piercing w kościach', 'pl').container).toHaveTextContent(
      'Kolczyki w kościach',
    );
    expect(renderMarkup('Tatuaże lub piercing', 'pl').container).toHaveTextContent(
      'Tatuaże lub piercing',
    );
  });

  it('localizes explicit English display labels while preserving reference targets', () => {
    renderMarkup(
      '{@item Ink (1-ounce bottle)|PHB|bottle of black ink} {@creature air elemental|MM|air} {@creature Elder Dinosaur (Etali, Primal Storm)|PSX|Etali, Primal Storm}',
      'pl',
    );
    expect(
      screen.getByRole('link', { name: 'butelka czarnego atramentu' }),
    ).toHaveAttribute('href', '/compendium/items/ink-1-ounce-bottle/');
    expect(screen.getByRole('link', { name: 'powietrze' })).toHaveAttribute(
      'href',
      '/compendium/bestiary/air-elemental/',
    );
    expect(screen.getByRole('link', { name: 'Etali, Pierwotna Burza' })).toHaveAttribute(
      'href',
      '/compendium/bestiary/elder-dinosaur-etali-primal-storm/',
    );
  });

  it('localizes book, card, and vehicle upgrade labels', () => {
    const { container } = renderMarkup(
      "{@book Player's Handbook|PHB} {@adventure Tomb of Annihilation|ToA} {@card Fool|Deck of Many More Things|BMT} {@card Bridge|Deck of Many More Things|BMT} {@card Wizard|Tarokka Deck|RHW} {@card The Void|Deck of Many Things} {@vehupgrade Arcane Artillery|AAG}",
      'pl',
    );
    expect(container).toHaveTextContent(
      'Podręcznik Gracza Grobowiec Zagłady Głupiec Most Czarodziej Pustka Arkaniczna Artyleria',
    );
  });

  it('localizes habitat, language, treasure, and action labels', () => {
    const { container } = renderMarkup(
      "{@filter Forest|bestiary|environment=forest} {@filter Planar (Nine Hells)|bestiary|environment=planar, nine hells} {@filter artisan's tools|items} {@filter vehicles (land)|items} {@language Undercommon} {@table Random Magic Items - Implements|XDMG|Implements} {@creature Android|QftIS|Force Strike} {@filter 1st-level wizard spell|spells|level=1}",
      'pl',
    );
    expect(container).toHaveTextContent('Las Planarne (Dziewięć Piekieł)');
    expect(container).toHaveTextContent('narzędzia rzemieślnicze pojazdy (lądowe)');
    expect(screen.getByRole('link', { name: 'Wspólny Podmroku' })).toHaveAttribute(
      'href',
      '/compendium/languages/undercommon/',
    );
    expect(screen.getByRole('link', { name: 'Narzędzia' })).toHaveAttribute(
      'href',
      '/compendium/tables/random-magic-items-implements/',
    );
    expect(screen.getByRole('link', { name: 'Siłowe Uderzenie' })).toHaveAttribute(
      'href',
      '/compendium/bestiary/android/',
    );
    expect(container).toHaveTextContent('zaklęcie czarodzieja 1. poziomu');
  });

  it('localizes repeated creature, spell, and class display labels', () => {
    const { container } = renderMarkup(
      '{@creature helmed horror|MM|helmed horrors} {@creature shield guardian|MM|shield guardians} {@creature stone golem|MM|stone golems} {@creature modron|MM|modrons} {@spell acid arrow|XPHB|acid arrow} {@class Ranger|XPHB|Fey Wanderer} {@class Wizard|XPHB|Diviner} {@class Warlock|XPHB|Archfey Patron} {@class Sorcerer|XPHB|Wild Magic Sorcery} {@i Monster Manual} {@creature mummy|MM|mummies} {@creature awakened tree|MM|awakened trees} {@filter type=Medium Armor|items|type=Medium Armor} {@filter Górskie|bestiary|environment=mountain} {@filter Podmrocze|bestiary|environment=underdark}',
      'pl',
    );
    expect(container).toHaveTextContent(
      'Pancerne Koszmary Tarczownicy Kamienne Golemy Modrony Kwaśna Strzała Wróżkowy Wędrowiec Wróżbita Patron Arcyfeja Dzika Magia Podręcznik Potworów mumie przebudzone drzewa zbroi średniej Góry Podmrok',
    );
  });

  it('localizes remaining Feywild labels and titles', () => {
    const { container } = renderMarkup(
      '{@book Feywild|DMG|2|Feywilda} {@item Feywild Trinket|WBtW|Feywildowe bibeloty} {@i Poszukiwany: Wola Feywild} Fejwildską domenę Prismeer',
      'pl',
    );

    expect(container).toHaveTextContent(
      'Kraina Feerii Bibeloty z Krainy Feerii Poszukiwany: Wola Krainy Feerii domenę Krainy Feerii Prismeer',
    );
  });

  it('localizes area labels and translated fallback references', () => {
    expect(
      renderMarkup(
        '{@area Feywild Trinkets table|01a|x} {@area Ghost Orchids|4e9|x} {@item Hunting Rifle|XDMG} {@item White Ghost Orchid Seed|JttRC} Unrolling Scroll',
        'pl',
      ).container,
    ).toHaveTextContent(
      'tabela błyskotek z Krainy Feerii Widmowe Orchidee Karabin Myśliwski Nasiona orchidei Biały Duch Rozwijany Zwój',
    );
  });

  it('localizes recurring English labels inside Polish prose', () => {
    expect(
      renderMarkup(
        'The force includes helmed horrors, shield guardians, stone golems, and modrons. Eldritch Knights and the Dark Gift grant a spell up to 9th level. Force Grey serves cold brew.',
        'pl',
      ).container,
    ).toHaveTextContent(
      'The force includes Pancerne Koszmary, Tarczownicy, Kamienne Golemy, and Modrony. Rycerze Eldryccy and the Mroczny Dar grant a zaklęcie do 9. poziomu. Szare Siły serves kawa parzona na zimno.',
    );
  });

  it('localizes recurring creature names and action names inside Polish prose', () => {
    expect(
      renderMarkup(
        "Treanty bronią treanta. Wight atakuje, a wighta wspierają impy i sprite'y. Sprites, Pixies, sprity i duszki. Wraith i wraiths kryją się w cieniu, a ghosts i shadows czają się w Underdarku. Force Strike, Brain Burn, Lob Acid i cold brew.",
        'pl',
      ).container,
    ).toHaveTextContent(
      'Drzewce bronią drzewca. Zjawa atakuje, a zjawy wspierają diabliki i chochliki. Chochliki, Piksi, chochliki i chochliki. Upiór i upiory kryją się w cieniu, a duchy i cienie czają się w Podmroku. Siłowe Uderzenie, Oparzenie Mózgu, Kwasowy Pocisk i kawa parzona na zimno.',
    );
    expect(renderMarkup('Krwawy', 'pl').container).toHaveTextContent('Krwawy');
  });

  it('localizes elemental languages and Amonkhet terms inside Polish prose', () => {
    expect(
      renderMarkup(
        'Auran, Aquan, Ignan i Terran. Horror Nimbus, initiates, viziers.',
        'pl',
      ).container,
    ).toHaveTextContent(
      'Auran, Akwan, Ignan i Terrański. Nimb Grozy, Inicjowani, Wezyrowie.',
    );
  });

  it('localizes labels from Fumble class and psionic entries', () => {
    const { container } = renderMarkup(
      '{@b body strain} {@b Cerebral Breakthrough.} {@classFeature Psionic Exertion|Talent|TalPsi|3} {@filter Powers|psionics|source=talpsi}',
      'pl',
    );
    expect(container).toHaveTextContent(
      'napięcie ciała Przełom mózgowy. Wysiłek psioniczny Moce',
    );
  });

  it('localizes generic book labels in Polish prose', () => {
    expect(
      renderMarkup('Chapter 2 is here. See the appendix and rules glossary.', 'pl')
        .container,
    ).toHaveTextContent('Rozdział 2 is tutaj. zobacz dodatek and słownik zasad.');
  });

  it('localizes recurring lore headings in Polish', () => {
    expect(renderMarkup('Dragon Age Categories', 'pl').container).toHaveTextContent(
      'Kategorie Wiekowe Smoków',
    );
    expect(renderMarkup('The Persistence of Memory', 'pl').container).toHaveTextContent(
      'Wytrwałość Pamięci',
    );
    expect(renderMarkup('Self-Reliant and Suspicious', 'pl').container).toHaveTextContent(
      'Samowystarczalni i Podejrzliwi',
    );
    expect(renderMarkup('The Village of Barovia', 'pl').container).toHaveTextContent(
      'Wioska Barovia',
    );
  });

  it('localizes numbered and generic public headings', () => {
    const headings = [
      '10. Dragon Hatchery',
      '(16)\u2014Saving Throws',
      'Adult Black Dragon',
      'Weapon Properties',
    ]
      .map((heading) => renderMarkup(heading, 'pl').container.textContent)
      .join(' ');

    expect(headings).toBe(
      '10. Wylęgarnia Smoków (16) - Rzuty Obronne Dorosły Czarny Smok Właściwości Broni',
    );
  });

  it('covers fallback markup tags and non-reference forms', () => {
    const { container } = renderMarkup(
      '{@language Unknown Language|X} {@itemProperty Unknown Property|X|Unknown Display} {@color red} {@style italic} {@d20 d20} {@card Fool} {@link Invalid|not-a-url} {@link https://example.com|source|Example} {@unit 2} {@unit 2|unknown|unknown} {@skillCheck unknown} {@classFeature Feature|Class} {@subclassFeature Subclass Feature|Class} {@damage fire} {@damage 15 fire} {@unknown Label} 10. Unknown Heading',
      'pl',
    );

    expect(container).toHaveTextContent(
      'Unknown Language Unknown Display red italic d20 Fool Invalid Example 2 2 unknown unknown Class Class Ogień 15 fire Label 10. Unknown Heading',
    );
    expect(screen.getByRole('link', { name: 'Example' })).toHaveAttribute(
      'href',
      'https://example.com',
    );
    expect(renderMarkup('{@language Common}', 'en').container).toHaveTextContent(
      'Common',
    );
  });
});
