import { Fragment, type ReactNode } from 'react';
import { parseExpression } from '@/features/dice/engine';
import { RollableDice } from '@/features/dice/RollableDice';
import { RechargeRoll } from '@/features/dice/RechargeRoll';
import { DEFAULT_LOCALE, type Locale } from '@/i18n/locales';
import { ReferenceLink } from './ReferenceLink';

const LINKABLE: Record<string, string> = {
  spell: 'spells',
  condition: 'conditions',
  status: 'conditions',
  disease: 'conditions',
  feat: 'feats',
  background: 'backgrounds',
  race: 'species',
  item: 'items',
  class: 'classes',
  creature: 'bestiary',
  action: 'actions',
  optfeature: 'optionalfeatures',
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
  const first = parts[0] ?? '';
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
          label="Attack roll"
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
    case 'quickref':
    case 'hitYourSpellAttack':
      return <Fragment key={key}>{first}</Fragment>;
    case 'damage':
    case 'dice':
    case 'scaledamage':
    case 'scaledice': {
      const rollExpr = parseExpression(display) ? display : first;
      if (parseExpression(rollExpr)) {
        return (
          <RollableDice
            key={key}
            variant="damage"
            expression={rollExpr}
            display={display}
          />
        );
      }
      return (
        <span key={key} className="font-medium text-ember-400">
          {display}
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
