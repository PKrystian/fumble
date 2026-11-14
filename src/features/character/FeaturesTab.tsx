import { useState } from 'react';
import { Copy, ExternalLink } from 'lucide-react';
import type { FeatEntry } from '@/data/compendium/types';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { Button, SearchField } from '@/features/ui/primitives';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { uid, type FeatureItem } from './model';
import { TextArea, TextField } from './fields';
import { CompendiumPicker } from './CompendiumPicker';
import type { SectionProps } from './sections';
import { AddButton, RemoveButton, RemovedNotice } from './rows';
import { focusNewRow, useRowRemoval } from './rowRemoval';

function matchesFeature(feature: FeatureItem, term: string) {
  return [feature.name, feature.source, feature.notes].some((value) =>
    normalizeSearchText(value).includes(term),
  );
}

export function FeaturesTab({ character, update }: SectionProps) {
  const { t } = useT();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const removal = useRowRemoval(character, 'features', update);
  const term = normalizeSearchText(query.trim());
  const manual = character.features.filter((f) => !f.auto);
  const auto = character.features.filter((f) => f.auto);
  const shownManual = term ? manual.filter((f) => matchesFeature(f, term)) : manual;
  const shownAuto = term ? auto.filter((f) => matchesFeature(f, term)) : auto;

  const add = () => {
    const id = uid();
    update({
      features: [...character.features, { id, name: '', source: '', notes: '' }],
    });
    focusNewRow(id);
  };
  const patch = (id: string, patchObj: Partial<FeatureItem>) =>
    update({
      features: character.features.map((f) => (f.id === id ? { ...f, ...patchObj } : f)),
    });
  const addFromCompendium = (entry: FeatEntry) =>
    update({
      features: [
        ...character.features,
        {
          id: uid(),
          name: entry.name,
          source: t('character.sheet.featuresTab.featSource'),
          notes: '',
          featId: entry.id,
        },
      ],
    });
  const copy = (feature: FeatureItem) => {
    update({
      features: [
        ...character.features,
        { id: uid(), name: feature.name, source: feature.source, notes: feature.notes },
      ],
    });
    setStatus(t('character.sheet.featuresTab.copied', { name: feature.name }));
  };

  return (
    <div className="flex flex-col gap-5">
      <SearchField
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setStatus(null);
        }}
        onClear={() => setQuery('')}
        label={t('character.sheet.featuresTab.search')}
        clearLabel={t('common.clearSearch')}
        placeholder={t('character.sheet.featuresTab.search')}
      />
      <p role="status" className="text-sm text-ink-300 empty:hidden">
        {status ??
          (term
            ? t('character.sheet.featuresTab.matches', {
                count: shownManual.length + shownAuto.length,
              })
            : '')}
      </p>

      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-ink-200">
          {t('character.sheet.featuresTab.yours', { count: manual.length })}
        </h3>
        <CompendiumPicker
          categoryId="feats"
          label={t('character.sheet.featuresTab.addFromCompendium')}
          placeholder={t('character.sheet.featuresTab.addFromCompendium')}
          onPick={(item) => addFromCompendium(item as FeatEntry)}
        />
        <RemovedNotice name={removal.removed?.name ?? null} onUndo={removal.undo} />
        {shownManual.length === 0 && (
          <p className="empty-state">
            {t(
              term
                ? 'character.sheet.featuresTab.noMatches'
                : 'character.sheet.featuresTab.empty',
            )}
          </p>
        )}
        {shownManual.map((feature) => (
          <div
            key={feature.id}
            data-row={feature.id}
            className="flex gap-2 rounded-lg border border-ink-700 p-3"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_10rem]">
                <TextField
                  label={t('character.sheet.featuresTab.nameLabel')}
                  hideLabel
                  value={feature.name}
                  onChange={(name) => patch(feature.id, { name })}
                  placeholder={t('character.sheet.featuresTab.namePlaceholder')}
                />
                <TextField
                  label={t('character.sheet.featuresTab.sourceLabel')}
                  hideLabel
                  value={feature.source}
                  onChange={(source) => patch(feature.id, { source })}
                  placeholder={t('character.sheet.featuresTab.sourcePlaceholder')}
                />
              </div>
              <TextArea
                label={t('character.sheet.featuresTab.descLabel')}
                hideLabel
                value={feature.notes}
                onChange={(notes) => patch(feature.id, { notes })}
                rows={3}
                placeholder={t('character.sheet.featuresTab.descPlaceholder')}
              />
              {feature.featId && (
                <Link
                  to={`/compendium/feats/${feature.featId}`}
                  className="back-link mb-0 self-start"
                >
                  <ExternalLink size={14} aria-hidden="true" />
                  {t('character.sheet.featuresTab.openFeat', { name: feature.name })}
                </Link>
              )}
            </div>
            <RemoveButton onClick={() => removal.remove(feature)} name={feature.name} />
          </div>
        ))}
        <AddButton label={t('character.sheet.featuresTab.add')} onClick={add} />
      </section>

      {auto.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink-200">
            {t('character.sheet.featuresTab.synced', { count: auto.length })}
          </h3>
          <p className="text-xs text-ink-400">
            {t(
              character.autoSyncFeatures
                ? 'character.sheet.featuresTab.syncedHelp'
                : 'character.sheet.featuresTab.syncOff',
            )}
          </p>
          {shownAuto.length === 0 && (
            <p className="empty-state">{t('character.sheet.featuresTab.noMatches')}</p>
          )}
          {shownAuto.map((feature) => (
            <details
              key={feature.id}
              className="group rounded-lg border border-ink-700 bg-ink-950/40"
            >
              <summary className="flex min-h-10 cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 font-semibold text-ink-50 [overflow-wrap:anywhere]">
                  {feature.name}
                </span>
                <span className="badge">{feature.source}</span>
              </summary>
              <div className="flex flex-col gap-3 border-t border-ink-800 px-3 py-3">
                <p className="whitespace-pre-line text-sm leading-6 text-ink-200 [overflow-wrap:anywhere]">
                  {feature.notes || t('character.sheet.featuresTab.noDescription')}
                </p>
                <Button size="sm" className="self-start" onClick={() => copy(feature)}>
                  <Copy size={14} aria-hidden="true" />
                  {t('character.sheet.featuresTab.copy')}
                </Button>
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  );
}
