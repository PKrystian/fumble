import type {
  ActionEntry,
  BackgroundEntry,
  BoonEntry,
  CharOptionEntry,
  ClassEntry,
  ClassFeature,
  ClassSubclass,
  ClassTable,
  ConditionEntry,
  CultBoonEntry,
  DeckEntry,
  DeityEntry,
  FacilityEntry,
  FeatEntry,
  HazardEntry,
  ItemEntry,
  JsonObject,
  JsonValue,
  LanguageEntry,
  MasteryEntry,
  MonsterEntry,
  ObjectEntry,
  OptionalFeatureEntry,
  RecipeEntry,
  RuleEntry,
  SenseEntry,
  SkillEntry,
  SpeciesEntry,
  SpellEntry,
  SourceDataEntry,
  StatBlockSection,
  TableEntry,
  VehicleEntry,
} from '@/data/compendium/types';
import itemPropertiesData from '@/data/generated/item-properties.json';
import itemPropertyOverlay from '@/data/generated/pl/item-properties.json';
import masteriesData from '@/data/generated/masteries.json';
import masteryOverlay from '@/data/generated/pl/masteries.json';
import type { Entry, EntryNode } from '@/data/compendium/entry';
import { Fragment, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckSquare, RotateCcw, Shuffle, Tag } from 'lucide-react';
import { imageUrl } from '@/data/compendium/images';
import { localizeCompendiumValue } from '@/data/compendium/localizeValue';
import { RollableDice } from '@/features/dice/RollableDice';
import { sourceAbbrev, sourceRank } from '@/data/compendium/sources';
import { useHomebrewStore } from '@/features/homebrew/store';
import { useLightbox } from '@/features/ui/lightboxStore';
import { Link } from '@/i18n/path';
import { useLocale, useNavigate } from '@/i18n/pathUtils';
import { useT } from '@/i18n/useT';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { OriginalName } from '@/features/ui/OriginalName';
import { agreeSize } from './creatureMeta';
import { EntryRenderer } from './EntryRenderer';
import { localizeFormula } from './formula';
import { parseMarkup } from './markup';
import { ReferenceLink } from './ReferenceLink';
import { findSubclassByRouteKey, subclassRouteKey } from './subclassRoute';
import { itemRarityLabel, itemTypeLabel, spellSchoolLabel } from './filterValues';
import {
  ClassReferenceList,
  ClassReferenceText,
  SubclassReferenceList,
} from './classReferences';

interface ItemRuleRecord {
  id: string;
  source: string;
  name: string;
  abbreviation?: string;
  entries: Entry[];
}

const itemPropertyRecords = itemPropertiesData.items as unknown as ItemRuleRecord[];
const itemPropertyTranslations = itemPropertyOverlay as unknown as Record<
  string,
  Partial<ItemRuleRecord>
>;
const masteryRecords = masteriesData.items as unknown as ItemRuleRecord[];
const masteryTranslations = masteryOverlay as unknown as Record<
  string,
  Partial<ItemRuleRecord>
>;

function ruleMap(
  records: ItemRuleRecord[],
  translations: Record<string, Partial<ItemRuleRecord>>,
  locale: string,
): Map<string, ItemRuleRecord> {
  return new Map(
    records.map((record) => [
      `${record.abbreviation ?? record.name}|${record.source}`,
      locale === 'pl' ? { ...record, ...translations[record.id] } : record,
    ]),
  );
}

function findRule(
  rules: Map<string, ItemRuleRecord>,
  reference: string,
  fallbackSource: string,
): ItemRuleRecord | undefined {
  const [name, source] = reference.split('|');
  if (!name) return undefined;
  for (const candidate of [source, fallbackSource, 'XPHB', 'PHB']) {
    if (!candidate) continue;
    const rule = rules.get(`${name}|${candidate}`);
    if (rule) return rule;
  }
  return undefined;
}

function itemRuleEntries(
  item: ItemEntry,
  locale: string,
  masteryLabel: string,
): { entries: Entry[]; masteryNames: string } {
  const properties = ruleMap(itemPropertyRecords, itemPropertyTranslations, locale);
  const masteries = ruleMap(masteryRecords, masteryTranslations, locale);
  const propertyEntries = (item.propertyRefs ?? [])
    .map((reference) => findRule(properties, reference, item.source))
    .filter((rule): rule is ItemRuleRecord => rule !== undefined)
    .flatMap((rule) => rule.entries);
  const masteryRules = (item.masteryRefs ?? [])
    .map((reference) => findRule(masteries, reference, item.source))
    .filter((rule): rule is ItemRuleRecord => rule !== undefined);
  const masteryEntries = masteryRules.map((rule) => ({
    type: 'entries',
    name: `${masteryLabel}: ${rule.name}`,
    entries: rule.entries,
  }));
  return {
    entries: [...propertyEntries, ...masteryEntries],
    masteryNames: masteryRules.map((rule) => rule.name).join(', ') || item.mastery || '',
  };
}

function RulesLink({ rule, children }: { rule: string; children: ReactNode }) {
  return (
    <Link
      to={`/compendium/rules/${rule}`}
      className="underline decoration-dotted decoration-ink-500 underline-offset-2 hover:text-arcane-300"
    >
      {children}
    </Link>
  );
}

function RollableBonuses({ text, label }: { text: string; label: string }) {
  const parts = text.split(/([+-]\d+)/g);
  return (
    <>
      {parts.map((part, index) => {
        const match = /^([+-])(\d+)$/.exec(part);
        if (!match) return <Fragment key={index}>{part}</Fragment>;
        const expr = `1d20 ${match[1] === '-' ? '-' : '+'} ${match[2]}`;
        return (
          <RollableDice
            key={index}
            variant="attack"
            expression={expr}
            display={part}
            label={label}
          />
        );
      })}
    </>
  );
}

function RollableRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <p className="text-sm text-ink-200">
      <span className="font-semibold text-ink-50">{label}: </span>
      <RollableBonuses text={value} label={label} />
    </p>
  );
}

function LanguageLinks({ text }: { text: string }) {
  const { t } = useT();
  if (!text) return null;
  const [langsPart, ...rest] = text.split(';');
  const special = rest.join(';').trim();
  const langs = langsPart!
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <p className="text-sm text-ink-200">
      <span className="font-semibold text-ink-50">
        {t('compendium.detail.languages')}:{' '}
      </span>
      {langs.map((lang, index) => (
        <Fragment key={index}>
          {index > 0 && ', '}
          <ReferenceLink category="languages" slug={lang.toLowerCase()} label={lang} />
        </Fragment>
      ))}
      {special && <span className="text-ink-300">; {special}</span>}
    </p>
  );
}

function DetailHeader({
  title,
  original,
  subtitle,
  badge,
}: {
  title: string;
  original?: string | undefined;
  subtitle?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <header>
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display text-2xl font-bold text-ink-50">
          {title} <OriginalName name={original} className="ml-2 text-lg" />
        </h1>
        {badge}
      </div>
      {subtitle && <p className="text-sm italic text-ink-300">{subtitle}</p>}
    </header>
  );
}

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  const locale = useLocale();
  if (!value) return null;
  return (
    <p className="text-sm text-ink-200">
      <span className="font-semibold text-ink-50">{label}: </span>
      {typeof value === 'string' ? parseMarkup(value, locale) : value}
    </p>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
        {label}
      </dt>
      <dd className="text-ink-50">{value}</dd>
    </div>
  );
}

type SourceTranslator = ReturnType<typeof useT>['t'];

const SOURCE_FIELD_KEYS: Record<string, string> = {
  abbreviations: 'compendium.sourceData.fields.abbreviations',
  ac: 'compendium.sourceData.fields.ac',
  artObjects: 'compendium.sourceData.fields.artObjects',
  attackBonus: 'compendium.sourceData.fields.attackBonus',
  coins: 'compendium.sourceData.fields.coins',
  concentration: 'compendium.sourceData.fields.concentration',
  cp: 'compendium.sourceData.fields.cp',
  crMax: 'compendium.sourceData.fields.crMax',
  crMin: 'compendium.sourceData.fields.crMin',
  designers: 'compendium.sourceData.fields.designers',
  dpr: 'compendium.sourceData.fields.dpr',
  effect: 'compendium.sourceData.fields.effect',
  entries: 'compendium.sourceData.fields.entries',
  example: 'compendium.sourceData.fields.example',
  footnotes: 'compendium.sourceData.fields.footnotes',
  finishing: 'compendium.sourceData.fields.finishing',
  focus: 'compendium.sourceData.fields.focus',
  gauge: 'compendium.sourceData.fields.gauge',
  gems: 'compendium.sourceData.fields.gems',
  hasNumberParam: 'compendium.sourceData.fields.hasNumberParam',
  height: 'compendium.sourceData.fields.height',
  hooks: 'compendium.sourceData.fields.hooks',
  hp: 'compendium.sourceData.fields.hp',
  instructions: 'compendium.sourceData.fields.instructions',
  item: 'compendium.sourceData.fields.item',
  level: 'compendium.sourceData.fields.level',
  magicItems: 'compendium.sourceData.fields.magicItems',
  max: 'compendium.sourceData.fields.max',
  min: 'compendium.sourceData.fields.min',
  modes: 'compendium.sourceData.fields.modes',
  name: 'compendium.sourceData.fields.name',
  notes: 'compendium.sourceData.fields.notes',
  notions: 'compendium.sourceData.fields.notions',
  option: 'compendium.sourceData.fields.option',
  order: 'compendium.sourceData.fields.order',
  other: 'compendium.sourceData.fields.other',
  patternType: 'compendium.sourceData.fields.patternType',
  reasons: 'compendium.sourceData.fields.reasons',
  result: 'compendium.sourceData.fields.result',
  resultAttitude: 'compendium.sourceData.fields.resultAttitude',
  rollAttitude: 'compendium.sourceData.fields.rollAttitude',
  seeAlsoCreature: 'compendium.sourceData.fields.seeAlsoCreature',
  seeAlsoItem: 'compendium.sourceData.fields.seeAlsoItem',
  size: 'compendium.sourceData.fields.size',
  stitches: 'compendium.sourceData.fields.stitches',
  sizeNote: 'compendium.sourceData.fields.sizeNote',
  tables: 'compendium.sourceData.fields.tables',
  table: 'compendium.sourceData.fields.table',
  type: 'compendium.sourceData.fields.type',
  yarn: 'compendium.sourceData.fields.yarn',
  amount: 'compendium.sourceData.fields.amount',
  duration: 'compendium.sourceData.fields.duration',
  dragonMundaneItems: 'compendium.sourceData.fields.dragonMundaneItems',
  gp: 'compendium.sourceData.fields.gp',
  pp: 'compendium.sourceData.fields.pp',
  rarity: 'compendium.sourceData.fields.rarity',
  sp: 'compendium.sourceData.fields.sp',
  tier: 'compendium.sourceData.fields.tier',
  typeAltChoose: 'compendium.sourceData.fields.typeAltChoose',
  unit: 'compendium.sourceData.fields.unit',
  width: 'compendium.sourceData.fields.width',
};

function sourceFieldLabel(key: string, t: SourceTranslator): string {
  const translationKey = SOURCE_FIELD_KEYS[key];
  if (translationKey) return t(translationKey);
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isSourceTable(value: JsonValue): value is JsonObject & { table: JsonValue[] } {
  return isJsonObject(value) && Array.isArray(value.table);
}

function isSourceTypeTable(
  value: JsonValue,
): value is JsonObject & { typeTable: JsonValue[] } {
  return isJsonObject(value) && Array.isArray(value.typeTable);
}

function sourceRange(value: JsonObject): string {
  const min = typeof value.min === 'number' ? (value.min === 0 ? 100 : value.min) : null;
  const max = typeof value.max === 'number' ? (value.max === 0 ? 100 : value.max) : null;
  if (min == null || max == null) return '';
  return min === max ? String(min) : `${min}-${max}`;
}

function sourceOptionLabel(option: string, t: SourceTranslator): string {
  const options: Record<string, string> = {
    Clan: 'compendium.sourceData.options.clan',
    Female: 'compendium.sourceData.options.female',
    Male: 'compendium.sourceData.options.male',
  };
  return options[option] ? t(options[option]) : option;
}

function sourceTableCaption(value: JsonObject, t: SourceTranslator): string | undefined {
  if (typeof value.option === 'string') return sourceOptionLabel(value.option, t);
  if (typeof value.minlvl === 'number' && typeof value.maxlvl === 'number') {
    return t('compendium.sourceData.levelRange', {
      min: value.minlvl,
      max: value.maxlvl,
    });
  }
  return undefined;
}

function formatSourceCell(value: JsonValue, key: string, t: SourceTranslator): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value === null) return '-';
  if (key === 'cost' && isJsonObject(value)) {
    const min = typeof value.min === 'number' ? value.min : null;
    const max = typeof value.max === 'number' ? value.max : null;
    if (min != null && max != null) return min === max ? String(min) : `${min}-${max}`;
  }
  if (Array.isArray(value)) {
    return value.map((item) => formatSourceCell(item, key, t)).join(', ');
  }
  if (key === 'coins') {
    return Object.entries(value)
      .map(([currency, amount]) => `${formatSourceCell(amount, currency, t)} ${currency}`)
      .join(', ');
  }
  if (key === 'gems' || key === 'artObjects') {
    const amount = value.amount ? formatSourceCell(value.amount, 'amount', t) : '';
    const type = value.type ? formatSourceCell(value.type, 'type', t) : '';
    const unit =
      key === 'gems'
        ? t('compendium.sourceData.gemstones')
        : t('compendium.sourceData.artObjects');
    return [amount, unit, type ? `(${type} gp)` : ''].filter(Boolean).join(' ');
  }
  if (key === 'magicItems') {
    return Object.entries(value)
      .map(
        ([field, child]) =>
          `${sourceFieldLabel(field, t)}: ${formatSourceCell(child, field, t)}`,
      )
      .join(', ');
  }
  return Object.entries(value)
    .map(
      ([field, child]) =>
        `${sourceFieldLabel(field, t)}: ${formatSourceCell(child, field, t)}`,
    )
    .join(', ');
}

function sourceTableNode(
  value: JsonObject & { table: JsonValue[] },
  caption: string | undefined,
  t: SourceTranslator,
): EntryNode {
  const records = value.table.map((row, index) =>
    isJsonObject(row) ? row : { min: index + 1, max: index + 1, result: row },
  );
  const fieldNames = new Set<string>();
  for (const row of records) {
    for (const key of Object.keys(row)) {
      if (key !== 'min' && key !== 'max') fieldNames.add(key);
    }
  }
  const fields = [...fieldNames].sort((a, b) => {
    const order = ['result', 'item', 'coins', 'gems', 'artObjects', 'magicItems'];
    return (
      (order.indexOf(a) === -1 ? order.length : order.indexOf(a)) -
      (order.indexOf(b) === -1 ? order.length : order.indexOf(b))
    );
  });
  const dice =
    typeof value.diceExpression === 'string' ? value.diceExpression : undefined;
  return {
    type: 'table',
    ...(caption ? { caption } : {}),
    colLabels: [
      dice ?? t('compendium.sourceData.range'),
      ...fields.map((field) => sourceFieldLabel(field, t)),
    ],
    rows: records.map((row) => [
      sourceRange(row),
      ...fields.map((field) => formatSourceCell(row[field] ?? null, field, t)),
    ]),
  };
}

function sourceTypeTableNode(
  value: JsonObject & { typeTable: JsonValue[] },
  caption: string | undefined,
  t: SourceTranslator,
): EntryNode {
  const records = value.typeTable.map((row, index) =>
    isJsonObject(row) ? row : { min: index + 1, max: index + 1, result: row },
  );
  const fieldNames = new Set<string>();
  for (const row of records) {
    for (const key of Object.keys(row)) {
      if (key !== 'min' && key !== 'max') fieldNames.add(key);
    }
  }
  const fields = [...fieldNames].sort((a, b) => {
    const order = ['type', 'typeAltChoose', 'result'];
    return (
      (order.indexOf(a) === -1 ? order.length : order.indexOf(a)) -
      (order.indexOf(b) === -1 ? order.length : order.indexOf(b))
    );
  });
  return {
    type: 'table',
    ...(caption ? { caption } : {}),
    colLabels: [
      t('compendium.sourceData.range'),
      ...fields.map((field) => sourceFieldLabel(field, t)),
    ],
    rows: records.map((row) => [
      sourceRange(row),
      ...fields.map((field) => formatSourceCell(row[field] ?? null, field, t)),
    ]),
  };
}

function SourceDataValue({ value, fieldKey }: { value: JsonValue; fieldKey?: string }) {
  const { locale, t } = useT();
  if (typeof value === 'string') {
    return <p className="leading-relaxed text-ink-200">{parseMarkup(value, locale)}</p>;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return <span className="text-ink-200">{String(value)}</span>;
  }
  if (value === null) return <span className="text-ink-400">-</span>;
  if (Array.isArray(value)) {
    if (value.every((item) => isJsonObject(item) && typeof item.type === 'string')) {
      return <EntryRenderer entries={value as unknown as EntryNode[]} />;
    }
    if (value.every(isSourceTable)) {
      return (
        <div className="flex flex-col gap-4">
          {value.map((table, index) => {
            const caption = sourceTableCaption(table, t);
            return (
              <EntryRenderer key={index} entries={[sourceTableNode(table, caption, t)]} />
            );
          })}
        </div>
      );
    }
    if (value.every(isSourceTypeTable)) {
      return (
        <div className="flex flex-col gap-4">
          {value.map((table, index) => (
            <SourceDataValue
              key={index}
              value={table}
              {...(fieldKey ? { fieldKey } : {})}
            />
          ))}
        </div>
      );
    }
    return (
      <ul className="ml-5 list-disc space-y-2 text-ink-200">
        {value.map((item, index) => (
          <li key={index}>
            <SourceDataValue value={item} {...(fieldKey ? { fieldKey } : {})} />
          </li>
        ))}
      </ul>
    );
  }
  if (isSourceTable(value)) {
    const caption = sourceTableCaption(value, t);
    return <EntryRenderer entries={[sourceTableNode(value, caption, t)]} />;
  }
  if (isSourceTypeTable(value)) {
    const amount = value.amount;
    const caption = fieldKey ? sourceFieldLabel(fieldKey, t) : undefined;
    return (
      <div className="flex flex-col gap-3">
        {amount !== undefined && (
          <MetaRow
            label={t('compendium.sourceData.fields.amount')}
            value={formatSourceCell(amount, 'amount', t)}
          />
        )}
        <EntryRenderer entries={[sourceTypeTableNode(value, caption, t)]} />
      </div>
    );
  }
  if (typeof value.mm === 'number' && typeof value.entry === 'string') {
    return (
      <span className="text-ink-200">
        {value.mm} mm ({parseMarkup(value.entry, locale)})
      </span>
    );
  }
  if (
    typeof value.type === 'string' &&
    ('entries' in value || 'rows' in value || 'items' in value || 'entry' in value)
  ) {
    return <EntryRenderer entries={[value as unknown as EntryNode]} />;
  }
  if (typeof value.name === 'string' && Array.isArray(value.entries)) {
    const cost = value.cost ? formatSourceCell(value.cost, 'cost', t) : '';
    return (
      <section className="flex flex-col gap-2 rounded-lg border border-ink-800 bg-ink-950/40 p-3">
        <h4 className="font-display text-lg font-semibold text-ink-50">
          {parseMarkup(value.name, locale)}
          {cost && (
            <span className="ml-2 text-sm font-normal text-ember-400">({cost})</span>
          )}
        </h4>
        <EntryRenderer entries={value.entries as unknown as EntryNode[]} />
      </section>
    );
  }
  return (
    <dl className="flex flex-col gap-3">
      {Object.entries(value).map(([key, child]) => (
        <div key={key}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            {sourceFieldLabel(key, t)}
          </dt>
          <dd className="mt-1">
            <SourceDataValue value={child} fieldKey={key} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function SourceDataDetail({ entry }: { entry: SourceDataEntry }) {
  const { t } = useT();
  const data = Object.fromEntries(
    Object.entries(entry.data).filter(
      ([key]) =>
        ![
          'name',
          'source',
          'page',
          'srd52',
          '_copy',
          'entries',
          'hasFluff',
          'hasFluffImages',
          'reprintedAs',
        ].includes(key),
    ),
  ) as JsonObject;
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={entry.name}
        original={entry.englishName}
        subtitle={t(`compendium.sourceData.collections.${entry.collection}`)}
      />
      {entry.entries.length > 0 && (
        <div className="flex flex-col gap-3">
          <EntryRenderer entries={entry.entries} />
        </div>
      )}
      <SourceDataValue value={data} />
    </article>
  );
}

export function SpellDetail({ spell }: { spell: SpellEntry }) {
  const { t } = useT();
  const locale = useLocale();
  const school = spellSchoolLabel(spell.school, locale);
  const levelLabel =
    spell.level === 0
      ? t('compendium.detail.cantrip', { school })
      : t('compendium.detail.levelSchool', { level: spell.level, school });

  return (
    <article className="flex flex-col gap-5">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink-50">
          {spell.name} <OriginalName name={spell.englishName} className="ml-2 text-lg" />
        </h1>
        <p className="text-sm italic text-ink-300">
          {levelLabel}
          {spell.ritual && t('compendium.detail.ritualSuffix')}
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-ink-700 bg-ink-900 p-4 sm:grid-cols-4">
        <MetaCell
          label={t('compendium.detail.castingTime')}
          value={
            localizeCompendiumValue(spell.castingTime, locale, 'castingTime') ??
            spell.castingTime
          }
        />
        <MetaCell
          label={t('compendium.detail.range')}
          value={localizeCompendiumValue(spell.range, locale, 'range') ?? spell.range}
        />
        <MetaCell label={t('compendium.detail.components')} value={spell.components} />
        <MetaCell
          label={t('compendium.detail.duration')}
          value={
            localizeCompendiumValue(spell.duration, locale, 'duration') ?? spell.duration
          }
        />
      </dl>

      <div className="flex flex-col gap-3">
        <EntryRenderer entries={spell.entries} />
        {spell.entriesHigherLevel && <EntryRenderer entries={spell.entriesHigherLevel} />}
      </div>

      {(spell.classes?.length || spell.subclasses?.length) && (
        <div className="flex flex-col gap-2 border-t border-ink-700 pt-4 text-sm">
          {spell.classes?.length && (
            <MetaRow
              label={t('compendium.filters.labels.class')}
              value={
                <ClassReferenceList
                  values={spell.classes}
                  {...(spell._englishClasses
                    ? { referenceValues: spell._englishClasses }
                    : {})}
                />
              }
            />
          )}
          {spell.subclasses?.length && (
            <MetaRow
              label={t('compendium.filters.labels.subclass')}
              value={
                <SubclassReferenceList
                  values={spell.subclasses}
                  {...(spell._englishSubclasses
                    ? { referenceValues: spell._englishSubclasses }
                    : {})}
                />
              }
            />
          )}
        </div>
      )}
    </article>
  );
}

export function SpeciesDetail({
  species,
  subtitle,
}: {
  species: SpeciesEntry;
  subtitle?: string;
}) {
  const { t, locale } = useT();
  const defaultSubtitle = species.parentRace
    ? t('compendium.detail.subraceOf', { parent: species.parentRace })
    : (localizeCompendiumValue(species.creatureType, locale, 'creatureType') ??
      species.creatureType);
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={species.name}
        original={species.englishName}
        subtitle={subtitle ?? defaultSubtitle}
      />
      <div className="flex flex-col gap-1">
        <MetaRow
          label={t('compendium.detail.size')}
          value={localizeCompendiumValue(species.size, locale, 'objectSize')}
        />
        <MetaRow
          label={t('compendium.detail.speed')}
          value={localizeCompendiumValue(species.speed, locale, 'speed') ?? species.speed}
        />
      </div>
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={species.entries} />
      </div>
    </article>
  );
}

export function FeatDetail({ feat, subtitle }: { feat: FeatEntry; subtitle?: string }) {
  const { t, locale } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={feat.name}
        original={feat.englishName}
        subtitle={
          subtitle ??
          t('compendium.detail.featCategory', {
            category:
              localizeCompendiumValue(feat.category, locale, 'featCategory') ??
              feat.category,
          })
        }
      />
      <div className="flex flex-col gap-1">
        {feat.prerequisite && (
          <MetaRow
            label={t('compendium.detail.prerequisite')}
            value={<ClassReferenceText text={feat.prerequisite} />}
          />
        )}
      </div>
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={feat.entries} />
      </div>
    </article>
  );
}

export function BackgroundDetail({ background }: { background: BackgroundEntry }) {
  const { t } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={background.name}
        original={background.englishName}
        subtitle={t('compendium.detail.background')}
      />
      <div className="flex flex-col gap-1">
        <MetaRow
          label={t('compendium.detail.abilityScores')}
          value={background.abilityScores}
        />
        <MetaRow
          label={t('compendium.detail.skillProficiencies')}
          value={background.skills}
        />
        <MetaRow
          label={t('compendium.detail.toolProficiencies')}
          value={background.tools}
        />
        {background.feat && (
          <MetaRow
            label={t('compendium.detail.feat')}
            value={<ClassReferenceText text={background.feat} />}
          />
        )}
      </div>
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={background.entries} />
      </div>
    </article>
  );
}

export function RuleDetail({ rule, subtitle }: { rule: RuleEntry; subtitle?: string }) {
  const { t, locale } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={rule.name}
        original={rule.englishName}
        subtitle={
          subtitle ??
          t('compendium.detail.ruleType', {
            type:
              localizeCompendiumValue(rule.ruleType, locale, 'ruleType') ?? rule.ruleType,
          })
        }
      />
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={rule.entries} />
      </div>
    </article>
  );
}

export function ActionDetail({ action }: { action: ActionEntry }) {
  const { t } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={action.name}
        original={action.englishName}
        subtitle={t('compendium.detail.action')}
      />
      {action.time && <MetaRow label={t('compendium.detail.time')} value={action.time} />}
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={action.entries} />
      </div>
    </article>
  );
}

export function OptionalFeatureDetail({ feature }: { feature: OptionalFeatureEntry }) {
  const { t, locale } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={feature.name}
        original={feature.englishName}
        subtitle={
          localizeCompendiumValue(feature.featureType, locale, 'featureType') ??
          feature.featureType
        }
      />
      <div className="flex flex-col gap-1">
        {feature.prerequisite && (
          <MetaRow
            label={t('compendium.detail.prerequisite')}
            value={<ClassReferenceText text={feature.prerequisite} />}
          />
        )}
      </div>
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={feature.entries} />
      </div>
    </article>
  );
}

export function DeityDetail({ deity }: { deity: DeityEntry }) {
  const { t } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={deity.name}
        original={deity.englishName}
        subtitle={deity.pantheon}
      />
      <div className="flex flex-col gap-1">
        <MetaRow label={t('compendium.detail.alignment')} value={deity.alignment} />
        <MetaRow label={t('compendium.detail.domains')} value={deity.domains} />
        <MetaRow label={t('compendium.detail.symbol')} value={deity.symbol} />
      </div>
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={deity.entries} />
      </div>
    </article>
  );
}

export function HazardDetail({ hazard }: { hazard: HazardEntry }) {
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={hazard.name}
        original={hazard.englishName}
        subtitle={hazard.hazardType}
      />
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={hazard.entries} />
      </div>
    </article>
  );
}

export function BoonDetail({ boon }: { boon: BoonEntry }) {
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={boon.name}
        original={boon.englishName}
        subtitle={boon.boonType}
      />
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={boon.entries} />
      </div>
    </article>
  );
}

export function ItemDetail({
  item,
  subtitle,
}: {
  item: ItemEntry;
  subtitle?: ReactNode;
}) {
  const { t } = useT();
  const locale = useLocale();
  const itemSubtitle = [
    itemTypeLabel(item.type, locale),
    itemRarityLabel(item.rarity, locale),
  ]
    .filter(Boolean)
    .join(', ');
  const rules = itemRuleEntries(item, locale, t('compendium.detail.weaponMastery'));
  const entries = [...item.entries, ...rules.entries];
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={item.name}
        original={item.englishName}
        subtitle={subtitle ?? itemSubtitle}
      />
      <div className="flex flex-col gap-1">
        <MetaRow label={t('compendium.detail.damage')} value={item.damage} />
        <MetaRow label={t('compendium.detail.armorClass')} value={item.ac} />
        <MetaRow
          label={t('compendium.detail.properties')}
          value={
            localizeCompendiumValue(item.properties, locale, 'properties') ??
            item.properties
          }
        />
        <MetaRow label={t('compendium.detail.mastery')} value={rules.masteryNames} />
        {item.attunement && (
          <MetaRow
            label={t('compendium.detail.attunement')}
            value={<ClassReferenceText text={item.attunement} />}
          />
        )}
        <MetaRow label={t('compendium.detail.weight')} value={item.weight} />
        <MetaRow label={t('compendium.detail.value')} value={item.value} />
      </div>
      {entries.length > 0 && (
        <div className="flex flex-col gap-3">
          <EntryRenderer entries={entries} />
        </div>
      )}
      {item.variant && (
        <section className="flex flex-col gap-3 border-t border-ink-800 pt-4">
          <h2 className="font-display text-lg font-bold text-ember-400">
            {t('compendium.detail.variantData')}
          </h2>
          <SourceDataValue value={item.variant} />
        </section>
      )}
    </article>
  );
}

function ProgressionTable({
  table,
  featuresByLevel,
}: {
  table: ClassTable;
  featuresByLevel: Map<number, string[]>;
}) {
  const { t } = useT();
  const featureCol = table.headers.indexOf('Features');
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-bold text-ember-400">
        {t('compendium.detail.progression')}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-ink-950/60">
              {table.headers.map((header) => (
                <th
                  key={header}
                  className="whitespace-nowrap border-b border-ink-700 px-2 py-1 font-semibold text-ink-50"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, rowIndex) => {
              const merged = featuresByLevel.get(rowIndex + 1)?.join(', ');
              return (
                <tr
                  key={rowIndex}
                  className="align-top odd:bg-ink-950 even:bg-ink-800/60"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="border-b border-ink-800 px-2 py-1 text-ink-200"
                    >
                      {cellIndex === featureCol && merged ? merged : cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

type MergedFeature = ClassFeature & { sub: string; subclass?: ClassSubclass };

type ViewMode = 'default' | 'recent' | 'all' | 'homebrew';

function subKey(sub: { name: string; source: string }): string {
  return `${'id' in sub && typeof sub.id === 'string' ? sub.id : sub.name}|${sub.source}`;
}

function pickPreferred<T extends { source: string }>(
  group: T[],
  preferredSource?: string,
): T {
  if (preferredSource) {
    const match = group.find((s) => s.source === preferredSource);
    if (match) return match;
  }
  return group.reduce((best, s) =>
    sourceRank(s.source) > sourceRank(best.source) ? s : best,
  );
}

const ARTIFICER_SUBCLASS_KEYS = [
  { names: ['Alchemist', 'Alchemik'], key: 'alchemist' },
  { names: ['Armorer', 'Zbrojmistrz'], key: 'armorer' },
  { names: ['Artillerist', 'Artylerzysta'], key: 'artillerist' },
  { names: ['Battle Smith', 'Kowal Bitewny'], key: 'battleSmith' },
  { names: ['Cartographer', 'Kartograf'], key: 'cartographer' },
  { names: ['Reanimator'], key: 'reanimator' },
] as const;

function ArtificerSubclassComparison({ cls }: { cls: ClassEntry }) {
  const { t } = useT();
  const rows = ARTIFICER_SUBCLASS_KEYS.flatMap((subclass) => {
    const match = cls.subclasses.find((entry) =>
      subclass.names.some((name) => name === entry.name),
    );
    return match ? [{ ...subclass, name: match.name }] : [];
  });
  if (rows.length === 0) return null;

  return (
    <section
      className="flex flex-col gap-3"
      aria-labelledby="artificer-subclass-comparison"
    >
      <h2
        id="artificer-subclass-comparison"
        className="font-display text-xl font-bold text-ember-400"
      >
        {t('compendium.classDetail.subclassComparison')}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="bg-ink-950/60">
              <th className="border-b border-ink-700 px-2 py-2 font-semibold text-ink-50">
                {t('compendium.classDetail.subclass')}
              </th>
              <th className="border-b border-ink-700 px-2 py-2 font-semibold text-ink-50">
                {t('compendium.classDetail.subclassRole')}
              </th>
              <th className="border-b border-ink-700 px-2 py-2 font-semibold text-ink-50">
                {t('compendium.classDetail.subclassPlaystyle')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((subclass) => (
              <tr
                key={subclass.key}
                className="align-top odd:bg-ink-950 even:bg-ink-800/60"
              >
                <th
                  scope="row"
                  className="whitespace-nowrap px-2 py-2 font-semibold text-ink-50"
                >
                  {subclass.name}
                </th>
                <td className="px-2 py-2 text-ink-200">
                  {t(`compendium.classDetail.subclasses.${subclass.key}.role`)}
                </td>
                <td className="px-2 py-2 text-ink-200">
                  {t(`compendium.classDetail.subclasses.${subclass.key}.playstyle`)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SubclassImage({ subclass }: { subclass: ClassSubclass }) {
  const openLightbox = useLightbox((state) => state.open);
  if (!subclass.image) return null;
  return (
    <img
      src={imageUrl(subclass.image)}
      alt={subclass.name}
      loading="lazy"
      onClick={() => openLightbox(imageUrl(subclass.image!), subclass.name)}
      onError={(event) => {
        event.currentTarget.style.display = 'none';
      }}
      className="h-auto max-h-80 max-w-full cursor-zoom-in rounded-lg border border-ink-700 object-contain"
    />
  );
}

export function ClassDetail({
  cls,
  badge,
  subtitle,
  selectedSubclassId,
}: {
  cls: ClassEntry;
  badge?: ReactNode;
  subtitle?: string;
  selectedSubclassId?: string;
}) {
  const { t } = useT();
  const { params } = useUrlSearchState();
  const navigate = useNavigate();
  const { id: routeClassId, subclass: routeSubclassId } = useParams<{
    id?: string;
    subclass?: string;
  }>();
  const [selected, setSelected] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('default');
  const [showSourceLabels, setShowSourceLabels] = useState(true);

  const homebrewEntries = useHomebrewStore((s) => s.entries);
  const homebrewSubclasses = useMemo(
    () =>
      homebrewEntries
        .filter(
          (e): e is Extract<typeof e, { kind: 'subclass' }> =>
            e.kind === 'subclass' && e.className.toLowerCase() === cls.name.toLowerCase(),
        )
        .map((e) => e.subclass),
    [homebrewEntries, cls.name],
  );

  const allSubclasses = useMemo(
    () => [...cls.subclasses, ...homebrewSubclasses],
    [cls.subclasses, homebrewSubclasses],
  );
  const searchSignature = params.toString();
  const querySubclassKeys = useMemo(
    () => new URLSearchParams(searchSignature).getAll('subclass'),
    [searchSignature],
  );
  const requestedRouteKeys = useMemo(
    () =>
      selectedSubclassId
        ? [selectedSubclassId]
        : routeSubclassId
          ? [routeSubclassId]
          : querySubclassKeys,
    [querySubclassKeys, routeSubclassId, selectedSubclassId],
  );
  const requestedSubclasses = useMemo(
    () =>
      requestedRouteKeys
        .map(
          (key) =>
            allSubclasses.find((subclass) => subKey(subclass) === key) ??
            findSubclassByRouteKey(allSubclasses, key),
        )
        .filter((subclass): subclass is ClassSubclass => subclass !== undefined),
    [allSubclasses, requestedRouteKeys],
  );
  const isClassRoute = routeClassId === cls.id;

  useEffect(() => {
    if (requestedSubclasses.length > 0) {
      setSelected(requestedSubclasses.map(subKey));
    } else if (isClassRoute) {
      setSelected([]);
    }
  }, [isClassRoute, requestedSubclasses]);

  const syncSelection = (next: string[]) => {
    setSelected(next);
    const nextSubclasses = next
      .map(
        (key) =>
          allSubclasses.find((subclass) => subKey(subclass) === key) ??
          findSubclassByRouteKey(allSubclasses, key),
      )
      .filter((subclass): subclass is ClassSubclass => subclass !== undefined);
    const search = new URLSearchParams(params);
    search.delete('subclass');
    if (nextSubclasses.length === 1) {
      navigate({
        pathname: `/compendium/classes/${cls.id}/${subclassRouteKey(nextSubclasses[0]!)}`,
        search: search.toString(),
      });
      return;
    }
    for (const subclass of nextSubclasses)
      search.append('subclass', subclassRouteKey(subclass));
    navigate({
      pathname: `/compendium/classes/${cls.id}`,
      search: search.toString(),
    });
  };

  const toggle = (key: string) => {
    syncSelection(
      selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key],
    );
  };

  const groups = useMemo(() => {
    const m = new Map<string, ClassSubclass[]>();
    for (const s of cls.subclasses) {
      const list = m.get(s.name) ?? [];
      list.push(s);
      m.set(s.name, list);
    }
    return m;
  }, [cls.subclasses]);

  const visibleSubclasses = useMemo(() => {
    if (viewMode === 'all') {
      return [...cls.subclasses].sort(
        (a, b) =>
          a.name.localeCompare(b.name) || sourceRank(a.source) - sourceRank(b.source),
      );
    }
    const base = [...groups.values()].map((group) =>
      viewMode === 'recent' ? pickPreferred(group) : pickPreferred(group, cls.source),
    );
    const list = viewMode === 'homebrew' ? [...base, ...homebrewSubclasses] : base;
    for (const subclass of requestedSubclasses) {
      if (!list.some((entry) => subKey(entry) === subKey(subclass))) list.push(subclass);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [
    viewMode,
    groups,
    cls.subclasses,
    cls.source,
    homebrewSubclasses,
    requestedSubclasses,
  ]);

  const allSelected =
    visibleSubclasses.length > 0 &&
    visibleSubclasses.every((s) => selected.includes(subKey(s)));
  const toggleSelectAll = () =>
    syncSelection(allSelected ? [] : visibleSubclasses.map(subKey));
  const pickRandom = () => {
    const subclass =
      visibleSubclasses[Math.floor(Math.random() * visibleSubclasses.length)];
    if (subclass) syncSelection([subKey(subclass)]);
  };

  const selectedSubs = visibleSubclasses.filter((s) => selected.includes(subKey(s)));

  const featuresByLevel = new Map<number, string[]>();
  const addLevel = (level: number, name: string) => {
    const list = featuresByLevel.get(level) ?? [];
    list.push(name);
    featuresByLevel.set(level, list);
  };
  for (const f of cls.features) addLevel(f.level, f.name);
  for (const sub of selectedSubs) for (const f of sub.features) addLevel(f.level, f.name);

  const merged: MergedFeature[] = [
    ...cls.features.map((f) => ({ ...f, sub: '' })),
    ...selectedSubs.flatMap((sub) => {
      const context =
        sub.image || sub.lore?.length
          ? [
              {
                level: sub.features[0]?.level ?? 3,
                name: sub.name,
                entries: [],
                sub: sub.name,
                subclass: sub,
              },
            ]
          : [];
      return [...context, ...sub.features.map((f) => ({ ...f, sub: sub.name }))];
    }),
  ].sort((a, b) => {
    const level = a.level - b.level;
    if (level !== 0) return level;
    const rank = (feature: MergedFeature) => (feature.subclass ? 1 : feature.sub ? 2 : 0);
    return rank(a) - rank(b);
  });

  return (
    <article className="flex flex-col gap-6">
      <DetailHeader
        title={cls.name}
        original={cls.englishName}
        subtitle={subtitle ?? t('compendium.classDetail.subtitle')}
        badge={badge}
      />
      {cls.intro && cls.intro.length > 0 && (
        <div className="flex flex-col gap-3">
          <EntryRenderer entries={cls.intro} />
        </div>
      )}
      {cls.id === 'artificer' && (
        <section className="flex flex-col gap-2" aria-labelledby="class-overview">
          <h2
            id="class-overview"
            className="font-display text-xl font-bold text-ember-400"
          >
            {t('compendium.classDetail.overview')}
          </h2>
          <p className="leading-relaxed text-ink-200">
            {t('compendium.classDetail.artificerOverview')}
          </p>
        </section>
      )}
      <dl className="grid grid-cols-2 gap-3 rounded-lg border border-ink-700 bg-ink-900 p-4 sm:grid-cols-3">
        <MetaCell label={t('compendium.classDetail.hitDie')} value={cls.hitDie} />
        <MetaCell
          label={t('compendium.classDetail.primaryAbility')}
          value={cls.primaryAbility || '-'}
        />
        <MetaCell
          label={t('compendium.classDetail.savingThrows')}
          value={cls.savingThrows || '-'}
        />
      </dl>
      {cls.proficiencies && (
        <MetaRow
          label={t('compendium.classDetail.proficiencies')}
          value={cls.proficiencies}
        />
      )}

      <ProgressionTable table={cls.table} featuresByLevel={featuresByLevel} />

      {cls.id === 'artificer' && <ArtificerSubclassComparison cls={cls} />}

      {cls.subclasses.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink-300">
              {t('compendium.classDetail.subclassPrompt', { title: cls.subclassTitle })}
            </p>
            <div className="flex items-center gap-1">
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as ViewMode)}
                aria-label={t('compendium.classDetail.viewLabel')}
                className="rounded-md border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-ink-200 focus:border-arcane-500 focus:outline-none"
              >
                <option value="default">{t('compendium.classDetail.viewDefault')}</option>
                <option value="recent">{t('compendium.classDetail.viewRecent')}</option>
                <option value="all">{t('compendium.classDetail.viewAll')}</option>
                {homebrewSubclasses.length > 0 && (
                  <option value="homebrew">
                    {t('compendium.classDetail.viewHomebrew')}
                  </option>
                )}
              </select>
              <button
                type="button"
                onClick={toggleSelectAll}
                aria-label={t('compendium.classDetail.selectAllLabel')}
                aria-pressed={allSelected}
                className={[
                  'rounded p-1.5 transition-colors',
                  allSelected
                    ? 'bg-arcane-700 text-ink-50'
                    : 'text-ink-400 hover:bg-ink-800 hover:text-ink-50',
                ].join(' ')}
              >
                <CheckSquare size={15} />
              </button>
              <button
                type="button"
                onClick={pickRandom}
                aria-label={t('compendium.classDetail.pickRandomLabel')}
                className="rounded p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-50"
              >
                <Shuffle size={15} />
              </button>
              <button
                type="button"
                onClick={() => syncSelection([])}
                aria-label={t('compendium.classDetail.resetSelectionLabel')}
                className="rounded p-1.5 text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-50"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={() => setShowSourceLabels((v) => !v)}
                aria-label={t('compendium.classDetail.toggleSourceLabelsLabel')}
                aria-pressed={showSourceLabels}
                className={[
                  'rounded p-1.5 transition-colors',
                  showSourceLabels
                    ? 'bg-arcane-700 text-ink-50'
                    : 'text-ink-400 hover:bg-ink-800 hover:text-ink-50',
                ].join(' ')}
              >
                <Tag size={15} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleSubclasses.map((sub) => {
              const key = subKey(sub);
              const active = selected.includes(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggle(key)}
                  aria-pressed={active}
                  className={[
                    'rounded-full border px-3 py-1 text-sm transition-colors',
                    active
                      ? 'border-arcane-500 bg-arcane-700 text-ink-50'
                      : 'border-ink-700 bg-ink-900 text-ink-200 hover:bg-ink-800',
                  ].join(' ')}
                >
                  {showSourceLabels
                    ? `${sub.name} (${sourceAbbrev(sub.source)})`
                    : sub.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-bold text-ember-400">
          {t('compendium.classDetail.features')}
        </h2>
        {merged.map((feature, index) => (
          <div
            key={`${feature.sub}-${feature.name}-${feature.level}-${index}`}
            className="flex flex-col gap-2"
          >
            <h3 className="font-display text-lg font-semibold text-ink-50">
              <span className="mr-2 rounded bg-ink-800 px-1.5 py-0.5 text-xs text-ink-300">
                {t('compendium.classDetail.level', { level: feature.level })}
              </span>
              {feature.sub && feature.sub !== feature.name && (
                <span className="mr-2 rounded bg-arcane-700/50 px-1.5 py-0.5 text-xs text-arcane-200">
                  {feature.sub}
                </span>
              )}
              {feature.name}
            </h3>
            {feature.subclass && (
              <>
                <SubclassImage subclass={feature.subclass} />
                {feature.subclass.lore && (
                  <EntryRenderer entries={feature.subclass.lore} />
                )}
              </>
            )}
            {feature.entries.length > 0 && <EntryRenderer entries={feature.entries} />}
          </div>
        ))}
      </section>
    </article>
  );
}

function abilityMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function SectionGroup({
  title,
  sections,
}: {
  title?: string;
  sections: StatBlockSection[];
}) {
  const { locale } = useT();
  if (sections.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      {title && (
        <h2 className="border-b border-ember-500/40 pb-1 font-display text-lg font-bold text-ember-400">
          {title}
        </h2>
      )}
      {sections.map((section, index) => (
        <div key={`${section.name}-${index}`} className="text-ink-200">
          {section.name && (
            <span className="font-semibold text-ink-50">
              {parseMarkup(section.name, locale)}.{' '}
            </span>
          )}
          <EntryRenderer entries={section.entries} />
        </div>
      ))}
    </section>
  );
}

export function MonsterDetail({ monster }: { monster: MonsterEntry }) {
  const { t, locale } = useT();
  const localizedCreatureType =
    localizeCompendiumValue(monster.creatureType, locale, 'creatureType') ??
    monster.creatureType;
  const localizedSize = localizeCompendiumValue(monster.size, locale, 'objectSize');
  const abilities = [
    [t('compendium.detail.abbrStr'), monster.str],
    [t('compendium.detail.abbrDex'), monster.dex],
    [t('compendium.detail.abbrCon'), monster.con],
    [t('compendium.detail.abbrInt'), monster.int],
    [t('compendium.detail.abbrWis'), monster.wis],
    [t('compendium.detail.abbrCha'), monster.cha],
  ] as const;

  const crText = monster.crDisplay || monster.cr;
  const crMatch = crText.match(/^([^ (]+)(.*)$/);

  return (
    <article className="flex flex-col gap-4">
      <header>
        <h1 className="font-display text-2xl font-bold text-ink-50">
          {monster.name}{' '}
          <OriginalName name={monster.englishName} className="ml-2 text-lg" />
        </h1>
        <p className="text-sm italic text-ink-300">
          {localizedSize && (
            <RulesLink rule="size">
              {agreeSize(localizedSize, localizedCreatureType)}
            </RulesLink>
          )}
          {localizedSize && localizedCreatureType && ' '}
          {localizedCreatureType && (
            <RulesLink rule="creature-type">{localizedCreatureType}</RulesLink>
          )}
          {monster.alignment && (
            <>
              , <RulesLink rule="alignment">{monster.alignment}</RulesLink>
            </>
          )}
        </p>
      </header>

      <div className="flex flex-col gap-3 rounded-lg border border-ink-700 bg-ink-900 p-4">
        <div className="flex flex-col gap-1">
          <MetaRow label={t('compendium.detail.ac')} value={monster.ac} />
          <RollableRow
            label={t('compendium.detail.initiative')}
            value={monster.initiative}
          />
          <MetaRow
            label={t('compendium.detail.hp')}
            value={localizeFormula(monster.hp, locale)}
          />
          <MetaRow
            label={t('compendium.detail.speed')}
            value={
              localizeCompendiumValue(monster.speed, locale, 'speed') ?? monster.speed
            }
          />
        </div>

        <dl className="grid grid-cols-6 gap-2 border-y border-ink-700 py-3 text-center">
          {abilities.map(([label, score]) => {
            const mod = Math.floor((score - 10) / 2);
            const expr = `1d20 ${mod < 0 ? '-' : '+'} ${Math.abs(mod)}`;
            return (
              <div key={label}>
                <dt className="text-xs font-semibold text-ink-400">{label}</dt>
                <dd className="text-ink-50">
                  {score}{' '}
                  <RollableDice
                    variant="attack"
                    expression={expr}
                    display={`(${mod >= 0 ? `+${mod}` : mod})`}
                    label={t('compendium.detail.abilityCheck', { ability: label })}
                  />
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="flex flex-col gap-1">
          <RollableRow
            label={t('compendium.detail.savingThrows')}
            value={monster.saves}
          />
          <RollableRow label={t('compendium.detail.skills')} value={monster.skills} />
          <MetaRow
            label={t('compendium.detail.vulnerabilities')}
            value={monster.vulnerabilities}
          />
          <MetaRow
            label={t('compendium.detail.resistances')}
            value={monster.resistances}
          />
          <MetaRow label={t('compendium.detail.immunities')} value={monster.immunities} />
          <MetaRow
            label={t('compendium.detail.conditionImmunities')}
            value={monster.conditionImmunities}
          />
          <MetaRow label={t('compendium.detail.senses')} value={monster.senses} />
          <LanguageLinks text={monster.languages} />
          {crText && (
            <p className="text-sm text-ink-200">
              <span className="font-semibold text-ink-50">
                {t('compendium.detail.cr')}:{' '}
              </span>
              <Link
                to="/dm/encounter"
                className="underline decoration-dotted decoration-ink-500 underline-offset-2 hover:text-arcane-300"
              >
                {crMatch![1]}
              </Link>
              {crMatch?.[2]}
            </p>
          )}
          <MetaRow label={t('compendium.detail.habitat')} value={monster.habitat} />
          {monster.treasure && (
            <p className="text-sm text-ink-200">
              <span className="font-semibold text-ink-50">
                {t('compendium.detail.treasure')}:{' '}
              </span>
              <Link
                to="/dm/loot"
                className="underline decoration-dotted decoration-ink-500 underline-offset-2 hover:text-arcane-300"
              >
                {monster.treasure}
              </Link>
            </p>
          )}
        </div>
      </div>

      <SectionGroup sections={monster.traits} />
      <SectionGroup sections={monster.spellcasting} />
      <SectionGroup title={t('compendium.detail.actions')} sections={monster.actions} />
      <SectionGroup
        title={t('compendium.detail.bonusActions')}
        sections={monster.bonusActions}
      />
      <SectionGroup
        title={t('compendium.detail.reactions')}
        sections={monster.reactions}
      />
      {monster.legendaryActions.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="border-b border-ember-500/40 pb-1 font-display text-lg font-bold text-ember-400">
            {t('compendium.detail.legendaryActions')}
          </h2>
          {monster.legendaryIntro && (
            <p className="text-sm italic text-ink-300">
              {parseMarkup(monster.legendaryIntro, locale)}
            </p>
          )}
          {monster.legendaryActions.map((section, index) => (
            <div key={`${section.name}-${index}`} className="text-ink-200">
              {section.name && (
                <span className="font-semibold text-ink-50">
                  {parseMarkup(section.name, locale)}.{' '}
                </span>
              )}
              <EntryRenderer entries={section.entries} />
            </div>
          ))}
        </section>
      )}
      {monster.lairActions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="border-b border-ember-500/40 pb-1 font-display text-lg font-bold text-ember-400">
            {t('compendium.detail.lairActions')}
          </h2>
          <EntryRenderer entries={monster.lairActions} />
        </section>
      )}
      {monster.regionalEffects.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="border-b border-ember-500/40 pb-1 font-display text-lg font-bold text-ember-400">
            {t('compendium.detail.regionalEffects')}
          </h2>
          <EntryRenderer entries={monster.regionalEffects} />
        </section>
      )}
    </article>
  );
}

export function ConditionDetail({ condition }: { condition: ConditionEntry }) {
  const { locale } = useT();
  return (
    <article className="flex flex-col gap-5">
      <header className="flex items-center gap-3">
        <h1 className="font-display text-2xl font-bold text-ink-50">
          {condition.name}{' '}
          <OriginalName name={condition.englishName} className="ml-2 text-lg" />
        </h1>
        <span className="rounded-full border border-ink-600 px-2 py-0.5 text-xs uppercase tracking-wide text-ink-300">
          {localizeCompendiumValue(condition.kind, locale, 'conditionKind')}
        </span>
      </header>
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={condition.entries} />
      </div>
    </article>
  );
}

export function SkillDetail({ skill }: { skill: SkillEntry }) {
  const { t } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={skill.name}
        original={skill.englishName}
        subtitle={
          skill.ability
            ? t('compendium.detail.abilitySkill', { ability: skill.ability })
            : t('compendium.detail.skill')
        }
      />
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={skill.entries} />
      </div>
    </article>
  );
}

export function SenseDetail({ sense }: { sense: SenseEntry }) {
  const { t } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={sense.name}
        original={sense.englishName}
        subtitle={t('compendium.detail.sense')}
      />
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={sense.entries} />
      </div>
    </article>
  );
}

export function LanguageDetail({ language }: { language: LanguageEntry }) {
  const { t, locale } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={language.name}
        original={language.englishName}
        subtitle={t('compendium.detail.languageTypeLanguage', {
          type:
            localizeCompendiumValue(language.languageType, locale, 'languageType') ??
            language.languageType,
        })}
      />
      <div className="flex flex-col gap-1">
        <MetaRow label={t('compendium.detail.script')} value={language.script} />
        <MetaRow
          label={t('compendium.detail.typicalSpeakers')}
          value={language.typicalSpeakers}
        />
      </div>
      {language.entries.length > 0 && (
        <div className="flex flex-col gap-3">
          <EntryRenderer entries={language.entries} />
        </div>
      )}
    </article>
  );
}

export function CultBoonDetail({ cultBoon }: { cultBoon: CultBoonEntry }) {
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={cultBoon.name}
        original={cultBoon.englishName}
        subtitle={[cultBoon.category, cultBoon.kind].filter(Boolean).join(' ')}
      />
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={cultBoon.entries} />
      </div>
    </article>
  );
}

export function FacilityDetail({ facility }: { facility: FacilityEntry }) {
  const { t } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={facility.name}
        original={facility.englishName}
        subtitle={t('compendium.detail.bastionFacility', {
          type: facility.facilityType,
        })}
      />
      <div className="flex flex-col gap-1">
        <MetaRow label={t('compendium.detail.level')} value={facility.level} />
        <MetaRow
          label={t('compendium.detail.prerequisite')}
          value={facility.prerequisite}
        />
        <MetaRow label={t('compendium.detail.space')} value={facility.space} />
        <MetaRow label={t('compendium.detail.orders')} value={facility.orders} />
      </div>
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={facility.entries} />
      </div>
    </article>
  );
}

export function RecipeDetail({ recipe }: { recipe: RecipeEntry }) {
  const { t } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={recipe.name}
        original={recipe.englishName}
        subtitle={recipe.recipeType}
      />
      <div className="flex flex-col gap-1">
        <MetaRow label={t('compendium.detail.serves')} value={recipe.serves} />
        <MetaRow label={t('compendium.detail.diet')} value={recipe.diet} />
      </div>
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={recipe.entries} />
      </div>
    </article>
  );
}

export function ObjectDetail({ object }: { object: ObjectEntry }) {
  const { t, locale } = useT();
  const abilities = [
    [t('compendium.detail.abbrStr'), object.str],
    [t('compendium.detail.abbrDex'), object.dex],
    [t('compendium.detail.abbrCon'), object.con],
    [t('compendium.detail.abbrInt'), object.int],
    [t('compendium.detail.abbrWis'), object.wis],
    [t('compendium.detail.abbrCha'), object.cha],
  ] as const;

  return (
    <article className="flex flex-col gap-4">
      <DetailHeader
        title={object.name}
        original={object.englishName}
        subtitle={[
          localizeCompendiumValue(object.size, locale, 'objectSize'),
          object.objectType,
        ]
          .filter(Boolean)
          .join(' ')}
      />
      <div className="flex flex-col gap-3 rounded-lg border border-ink-700 bg-ink-900 p-4">
        <div className="flex flex-col gap-1">
          <MetaRow label={t('compendium.detail.ac')} value={object.ac} />
          <MetaRow label={t('compendium.detail.hp')} value={object.hp} />
        </div>
        <dl className="grid grid-cols-6 gap-2 border-y border-ink-700 py-3 text-center">
          {abilities.map(([label, score]) => (
            <div key={label}>
              <dt className="text-xs font-semibold text-ink-400">{label}</dt>
              <dd className="text-ink-50">
                {score} <span className="text-ink-300">({abilityMod(score)})</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-col gap-1">
          <MetaRow label={t('compendium.detail.immunities')} value={object.immune} />
          <MetaRow label={t('compendium.detail.senses')} value={object.senses} />
        </div>
      </div>
      <SectionGroup title={t('compendium.detail.actions')} sections={object.actions} />
    </article>
  );
}

export function VehicleDetail({ vehicle }: { vehicle: VehicleEntry }) {
  const { t, locale } = useT();
  return (
    <article className="flex flex-col gap-4">
      <DetailHeader
        title={vehicle.name}
        original={vehicle.englishName}
        subtitle={[
          localizeCompendiumValue(vehicle.size, locale, 'objectSize'),
          localizeCompendiumValue(vehicle.vehicleType, locale, 'vehicleType'),
        ]
          .filter(Boolean)
          .join(' ')}
      />
      <div className="flex flex-col gap-1 rounded-lg border border-ink-700 bg-ink-900 p-4">
        <MetaRow label={t('compendium.detail.dimensions')} value={vehicle.dimensions} />
        <MetaRow label={t('compendium.detail.terrain')} value={vehicle.terrain} />
        <MetaRow label={t('compendium.detail.capacity')} value={vehicle.capacity} />
        <MetaRow label={t('compendium.detail.travelPace')} value={vehicle.pace} />
        <MetaRow label={t('compendium.detail.speed')} value={vehicle.speed} />
        <MetaRow label={t('compendium.detail.armorClass')} value={vehicle.ac} />
        <MetaRow label={t('compendium.detail.hitPoints')} value={vehicle.hp} />
        <MetaRow label={t('compendium.detail.immunities')} value={vehicle.immune} />
        <MetaRow label={t('compendium.detail.cost')} value={vehicle.cost} />
      </div>
      {vehicle.entries.length > 0 && (
        <div className="flex flex-col gap-3">
          <EntryRenderer entries={vehicle.entries} />
        </div>
      )}
      <SectionGroup title={t('compendium.detail.weapons')} sections={vehicle.weapons} />
    </article>
  );
}

export function MasteryDetail({ mastery }: { mastery: MasteryEntry }) {
  const { t } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={mastery.name}
        original={mastery.englishName}
        subtitle={t('compendium.detail.weaponMastery')}
      />
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={mastery.entries} />
      </div>
    </article>
  );
}

export function CharOptionDetail({ option }: { option: CharOptionEntry }) {
  const { t } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={option.name}
        original={option.englishName}
        subtitle={option.optionType}
      />
      <div className="flex flex-col gap-1">
        {option.prerequisite && (
          <MetaRow
            label={t('compendium.detail.prerequisite')}
            value={<ClassReferenceText text={option.prerequisite} />}
          />
        )}
      </div>
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={option.entries} />
      </div>
    </article>
  );
}

export function TableDetail({ table }: { table: TableEntry }) {
  const { t, locale } = useT();
  return (
    <article className="flex flex-col gap-4">
      <DetailHeader
        title={table.name}
        original={table.englishName}
        subtitle={t('compendium.detail.table')}
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-ink-200">
          {table.colLabels.length > 0 && (
            <thead>
              <tr className="bg-ink-950/60">
                {table.colLabels.map((label, index) => (
                  <th
                    key={index}
                    className="border-b border-ink-700 px-2 py-1 font-semibold text-ink-50"
                  >
                    {parseMarkup(label, locale)}
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {table.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="odd:bg-ink-950 even:bg-ink-800/60">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="border-b border-ink-800 px-2 py-1">
                    {typeof cell === 'string' ? parseMarkup(cell, locale) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

export function DeckDetail({ deck }: { deck: DeckEntry }) {
  const { t } = useT();
  return (
    <article className="flex flex-col gap-5">
      <DetailHeader
        title={deck.name}
        original={deck.englishName}
        subtitle={t('compendium.detail.deckCards', { count: deck.cardCount })}
      />
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={deck.entries} />
      </div>
    </article>
  );
}
