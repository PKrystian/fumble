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
): ReactNode {
  const source = parts[1]?.trim();
  const display = parts[3]?.trim() || first;
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

function externalReference(first: string, parts: string[], key: number): ReactNode {
  const firstIsUrl = /^https?:\/\//i.test(first);
  const href = firstIsUrl ? first : parts[1]?.trim();
  const label = firstIsUrl ? parts[2]?.trim() || first : first;
  if (!href || !/^https?:\/\//i.test(href)) {
    return <Fragment key={key}>{label}</Fragment>;
  }
  return (
    <a key={key} href={href} target="_blank" rel="noreferrer">
      {label}
    </a>
  );
}

function unitLabel(parts: string[]): string {
  const amount = parts[0] ?? '';
  const singular = parts[1]?.trim();
  const plural = parts[2]?.trim() || singular;
  if (!singular) return amount;
  const numericAmount = Number(amount);
  const unit = numericAmount === 1 ? singular : plural;
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
      return <Fragment key={key}>{first}</Fragment>;
    case 'classFeature':
      return <Fragment key={key}>{featureLabel(first, parts, [2, 4])}</Fragment>;
    case 'subclassFeature':
      return <Fragment key={key}>{featureLabel(first, parts, [2, 4])}</Fragment>;
    case 'skillCheck':
      return <Fragment key={key}>{skillCheckLabel(first, parts)}</Fragment>;
    case 'subclass':
      return <Fragment key={key}>{first}</Fragment>;
    case 'itemProperty':
      return <Fragment key={key}>{display}</Fragment>;
    case 'link':
      return externalReference(first, parts, key);
    case 'unit':
      return <Fragment key={key}>{unitLabel(parts)}</Fragment>;
    case 'color':
    case 'style':
    case 'd20':
    case 'area':
      return <Fragment key={key}>{first}</Fragment>;
    case 'book':
    case 'adventure':
      return bookReference(tag, first, parts, key);
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
          label={first}
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
          {localizedDisplay}
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
            label={display}
            {...(source ? { source } : {})}
          />
        );
      }

      return <Fragment key={key}>{display}</Fragment>;
    }
  }
}

export function parseMarkup(text: string, locale: Locale = DEFAULT_LOCALE): ReactNode[] {
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
