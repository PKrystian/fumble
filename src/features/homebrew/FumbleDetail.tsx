import type {
  ClassEntry,
  ClassFeature,
  FeatEntry,
  ItemEntry,
  MonsterEntry,
  RuleEntry,
  SpeciesEntry,
  SpellEntry,
} from '@/data/compendium/types';
import { EntryRenderer } from '@/features/compendium/EntryRenderer';
import {
  ClassDetail,
  FeatDetail,
  ItemDetail,
  MonsterDetail,
  RuleDetail,
  SpeciesDetail,
  SpellDetail,
} from '@/features/compendium/details';
import { OriginalName } from '@/features/ui/OriginalName';
import type { Entry } from '@/data/compendium/entry';
import type { ReactNode } from 'react';
import { useT } from '@/i18n/useT';
import type { FumbleHomebrewItem } from './fumbleHomebrew';
import { FumbleBadge } from './FumbleBadge';

function GenericFumbleDetail({ item }: { item: FumbleHomebrewItem }) {
  return (
    <article className="flex flex-col gap-5">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-ink-50">
            {item.name} <OriginalName name={item.englishName} className="ml-2 text-lg" />
          </h1>
          <FumbleBadge />
        </div>
        {item.subtitle && <p className="text-sm italic text-ink-300">{item.subtitle}</p>}
      </header>
      <div className="flex flex-col gap-3">
        <EntryRenderer entries={(item.entries ?? []) as Entry[]} />
      </div>
    </article>
  );
}

function SubclassDetail({ item }: { item: FumbleHomebrewItem }) {
  const { t } = useT();
  const features = (item.features ?? []) as ClassFeature[];
  const lore = (item.lore ?? []) as Entry[];
  return (
    <article className="flex flex-col gap-5">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-ink-50">
            {item.name} <OriginalName name={item.englishName} className="ml-2 text-lg" />
          </h1>
          <FumbleBadge />
        </div>
        <p className="text-sm italic text-ink-300">
          {item.subtitle || `${item.className} - ${item.subclassTitle}`}
        </p>
      </header>
      {lore.length > 0 && <EntryRenderer entries={lore} />}
      <section className="flex flex-col gap-4">
        <h2 className="font-display text-xl font-bold text-ember-400">
          {t('compendium.classDetail.features')}
        </h2>
        {features.map((feature, index) => (
          <div
            key={`${feature.level}-${feature.name}-${index}`}
            className="flex flex-col gap-2"
          >
            <h3 className="font-display text-lg font-semibold text-ink-50">
              <span className="mr-2 rounded bg-ink-800 px-1.5 py-0.5 text-xs text-ink-300">
                {t('compendium.classDetail.level', { level: feature.level })}
              </span>
              {feature.name}
            </h3>
            <EntryRenderer entries={feature.entries} />
          </div>
        ))}
      </section>
    </article>
  );
}

function TaggedDetail({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <FumbleBadge />
      </div>
      {children}
    </div>
  );
}

export function FumbleDetail({ item }: { item: FumbleHomebrewItem }) {
  if (item.category === 'classes' && item.isSubclass && Array.isArray(item.features)) {
    return <SubclassDetail item={item} />;
  }

  if (
    item.category === 'classes' &&
    item.table &&
    Array.isArray(item.features) &&
    Array.isArray(item.subclasses)
  ) {
    return <ClassDetail cls={item as unknown as ClassEntry} badge={<FumbleBadge />} />;
  }

  if (item.category === 'items' || item.category === 'firearms') {
    return (
      <TaggedDetail>
        <ItemDetail item={item as unknown as ItemEntry} subtitle={item.subtitle} />
      </TaggedDetail>
    );
  }

  if (item.category === 'spells') {
    return (
      <TaggedDetail>
        <SpellDetail spell={item as unknown as SpellEntry} />
      </TaggedDetail>
    );
  }

  if (item.category === 'bestiary') {
    return (
      <TaggedDetail>
        <MonsterDetail monster={item as unknown as MonsterEntry} />
      </TaggedDetail>
    );
  }

  if (item.category === 'feats') {
    return (
      <TaggedDetail>
        <FeatDetail
          feat={
            {
              ...item,
              category: String(item.featCategory ?? item.category),
            } as unknown as FeatEntry
          }
          subtitle={item.subtitle}
        />
      </TaggedDetail>
    );
  }

  if (item.category === 'rules') {
    return (
      <TaggedDetail>
        <RuleDetail rule={item as unknown as RuleEntry} subtitle={item.subtitle} />
      </TaggedDetail>
    );
  }

  if (item.category === 'species') {
    return (
      <TaggedDetail>
        <SpeciesDetail
          species={item as unknown as SpeciesEntry}
          subtitle={item.subtitle}
        />
      </TaggedDetail>
    );
  }

  return <GenericFumbleDetail item={item} />;
}
