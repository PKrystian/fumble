import { useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Shuffle } from 'lucide-react';
import {
  canonicalHabitat,
  localizeCompendiumValue,
} from '@/data/compendium/localizeValue';
import { normalizeSearchText } from '@/data/compendium/searchText';
import { sourceName } from '@/data/compendium/sources';
import { OriginalName } from '@/features/ui/OriginalName';
import { Button, SearchField, Select } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { useT } from '@/i18n/useT';
import {
  encounterCreature,
  matchesCreatureHabitat,
  MISSING_HABITAT,
  type EncounterCreature,
} from './encounterModel';
import { pickRandomMonster, XP_BY_CR } from './xp';
import type { useEncounterCatalog } from './useEncounterCatalog';

const PAGE_SIZE = 10;
type Catalog = ReturnType<typeof useEncounterCatalog>;

interface Props {
  catalog: Catalog;
  retry: () => void;
  remaining: number | null;
  add: (creature: EncounterCreature) => boolean;
  randomCost: (creature: EncounterCreature) => number | null;
}

function CreatureResult({
  item,
  add,
}: {
  item: EncounterCreature;
  add: (item: EncounterCreature) => void;
}) {
  const { locale, t } = useT();
  return (
    <li
      className={panelClass(
        'flex flex-wrap items-center justify-between gap-2 p-3 text-sm',
      )}
    >
      <div className="min-w-0 flex-1 basis-40 [overflow-wrap:anywhere]">
        <p className="font-semibold text-ink-50">{item.name}</p>
        <OriginalName name={item.name !== item.original ? item.original : undefined} />
        <p className="text-xs text-ink-300">
          {[
            item.source && sourceName(item.source, locale),
            item.cr && t('encounter.crValue', { cr: item.cr }),
            item.xp === null
              ? t('encounter.unknownXp')
              : t('encounter.xpValue', { xp: item.xp.toLocaleString(locale) }),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
      <Button
        size="sm"
        aria-label={t('encounter.addCreatureNamed', { name: item.name })}
        onClick={() => add(item)}
      >
        <Plus size={14} aria-hidden="true" /> {t('encounter.addCreature')}
      </Button>
    </li>
  );
}

export function EncounterCatalog({ catalog, retry, remaining, add, randomCost }: Props) {
  const { t, locale } = useT();
  const { params, update } = useUrlSearchState();
  const { status, rows, items, mode } = catalog;
  const searchRef = useRef<HTMLInputElement>(null);
  const [randomFailed, setRandomFailed] = useState<string | null>(null);
  const query = params.get('q') ?? '';
  const term = normalizeSearchText(query.trim());
  const monsterId = params.get('monster');
  const selectedHabitat = canonicalHabitat(params.get('habitat') ?? '');
  const includeAny = params.get('includeAny') === '1';
  const sort = params.get('sort') ?? 'name';
  const browsing = params.get('browse') === '1' || Boolean(term || selectedHabitat);
  const monster = useMemo(
    () => (monsterId && !term ? items.find((item) => item.id === monsterId) : undefined),
    [items, monsterId, term],
  );
  const habitatLabel = (value: string) =>
    localizeCompendiumValue(value, locale, 'habitat') ?? value;
  const habitats = [...new Set(rows.flatMap((row) => row.habitats))].sort((a, b) =>
    habitatLabel(a).localeCompare(habitatLabel(b), locale),
  );
  const unknownHabitat =
    status === 'ready' &&
    Boolean(selectedHabitat) &&
    selectedHabitat !== MISSING_HABITAT &&
    !habitats.includes(selectedHabitat);
  const canIncludeAny =
    Boolean(selectedHabitat) &&
    !unknownHabitat &&
    selectedHabitat !== 'Any' &&
    selectedHabitat !== MISSING_HABITAT;
  const filtered = useMemo(
    () =>
      rows
        .filter(
          ({ names, habitats }) =>
            (!term || names.includes(term)) &&
            matchesCreatureHabitat(
              habitats,
              selectedHabitat,
              includeAny && canIncludeAny,
            ),
        )
        .sort((a, b) => {
          const left = a.creature;
          const right = b.creature;
          if (sort === 'cr' || sort === 'cr-desc') {
            if (!left.cr && right.cr) return 1;
            if (left.cr && !right.cr) return -1;
            const diff = (XP_BY_CR[left.cr] ?? 0) - (XP_BY_CR[right.cr] ?? 0);
            if (diff) return sort === 'cr-desc' ? -diff : diff;
          }
          return (
            left.name.localeCompare(right.name, locale) || left.id.localeCompare(right.id)
          );
        }),
    [rows, term, selectedHabitat, includeAny, canIncludeAny, sort, locale],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(
    pages,
    Math.max(1, Number.parseInt(params.get('page') ?? '', 10) || 1),
  );
  const first = (page - 1) * PAGE_SIZE;
  const randomKey = JSON.stringify([
    remaining,
    term,
    selectedHabitat,
    includeAny,
    mode,
    filtered.length,
  ]);

  const addResult = (item: EncounterCreature, linked = false) => {
    if (add(item)) {
      setRandomFailed(null);
      if (linked) update({ monster: null }, true);
    }
    searchRef.current?.focus();
  };

  const random = () => {
    if (remaining === null) return;
    const candidate = pickRandomMonster(
      filtered.map(({ creature }) => ({ item: creature, xp: randomCost(creature) ?? 0 })),
      remaining,
    );
    if (candidate) addResult(candidate);
    else setRandomFailed(randomKey);
  };

  return (
    <section
      className={panelClass('min-w-0 space-y-4 p-4 sm:p-5')}
      aria-labelledby="encounter-catalog-title"
    >
      <h2 className="panel-title" id="encounter-catalog-title">
        {t('encounter.catalog')}
      </h2>
      <div className="catalog-toolbar">
        <SearchField
          ref={searchRef}
          value={query}
          label={t('encounter.searchMonsters')}
          placeholder={t('encounter.searchMonsters')}
          clearLabel={t('common.clearSearch')}
          onChange={(event) =>
            update({ q: event.target.value, monster: null, page: null }, true)
          }
          onClear={() => {
            update({ q: null, monster: null, page: null }, true);
            searchRef.current?.focus();
          }}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="min-w-0">
            <span className="field-label">{t('encounter.habitat')}</span>
            <Select
              className="w-full"
              value={selectedHabitat}
              onChange={(event) =>
                update(
                  {
                    habitat: event.target.value || null,
                    includeAny: null,
                    page: null,
                  },
                  true,
                )
              }
            >
              <option value="">{t('encounter.allHabitats')}</option>
              {habitats.map((value) => (
                <option key={value} value={value}>
                  {habitatLabel(value)}
                </option>
              ))}
              <option value={MISSING_HABITAT}>{t('encounter.missingHabitat')}</option>
              {unknownHabitat && (
                <option value={selectedHabitat}>{t('encounter.invalidHabitat')}</option>
              )}
            </Select>
          </label>
          <label className="min-w-0">
            <span className="field-label">{t('encounter.sort')}</span>
            <Select
              className="w-full"
              value={sort}
              onChange={(event) => update({ sort: event.target.value, page: null }, true)}
            >
              <option value="name">{t('encounter.sortName')}</option>
              <option value="cr">{t('encounter.sortCr')}</option>
              <option value="cr-desc">{t('encounter.sortCrDesc')}</option>
            </Select>
          </label>
        </div>
        {canIncludeAny && (
          <label className="flex min-h-10 items-center gap-2 text-sm text-ink-300">
            <input
              type="checkbox"
              className="accent-arcane-500"
              checked={includeAny}
              onChange={() =>
                update({ includeAny: includeAny ? null : '1', page: null }, true)
              }
            />
            {t('encounter.includeAny')}
          </label>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            disabled={status !== 'ready' || remaining === null || remaining <= 0}
            onClick={random}
          >
            <Shuffle size={16} aria-hidden="true" /> {t('encounter.addRandomMonster')}
          </Button>
          {selectedHabitat && (
            <Button
              onClick={() =>
                update({ habitat: null, includeAny: null, page: null }, true)
              }
            >
              {t('encounter.clearHabitat')}
            </Button>
          )}
        </div>
        <p className="text-xs text-ink-300">
          {t(
            remaining === null
              ? 'encounter.randomNeedsBudget'
              : remaining <= 0
                ? 'encounter.randomNoBudget'
                : 'encounter.addRandomMonsterHint',
          )}
        </p>
        {randomFailed === randomKey && remaining !== null && remaining > 0 && (
          <p role="status" className="notice">
            {t('encounter.randomMonsterUnavailable')}
          </p>
        )}
      </div>
      {status === 'loading' && (
        <p role="status" className="notice">
          {t('encounter.loadingBestiary')}
        </p>
      )}
      {status === 'error' && (
        <div className="notice notice-error space-y-2">
          <p role="alert">{t('encounter.bestiaryError')}</p>
          <Button
            onClick={() => {
              retry();
              searchRef.current?.focus();
            }}
          >
            {t('encounter.retryBestiary')}
          </Button>
        </div>
      )}
      {monsterId && !term && (monster || status === 'ready') && (
        <div className="space-y-2">
          <p className="text-sm text-ink-300">
            {t(monster ? 'encounter.linkedCreature' : 'encounter.missingCreature')}
          </p>
          {monster && (
            <ul>
              <CreatureResult
                item={encounterCreature(monster)}
                add={(item) => addResult(item, true)}
              />
            </ul>
          )}
          <Button
            size="sm"
            onClick={() => {
              update({ monster: null }, true);
              searchRef.current?.focus();
            }}
          >
            {t('encounter.clearLinked')}
          </Button>
        </div>
      )}
      {status === 'ready' && (
        <>
          <p role="status" className="text-sm text-ink-300">
            {t('encounter.resultCount', {
              count: filtered.length.toLocaleString(locale),
            })}
          </p>
          {browsing ? (
            filtered.length ? (
              <>
                <ul className="space-y-2">
                  {filtered.slice(first, first + PAGE_SIZE).map(({ creature }) => (
                    <CreatureResult key={creature.id} item={creature} add={addResult} />
                  ))}
                </ul>
                {pages > 1 && (
                  <nav
                    className="flex flex-wrap items-center gap-2"
                    aria-label={t('encounter.resultPages')}
                  >
                    <Button
                      size="sm"
                      disabled={page === 1}
                      onClick={() => update({ page: String(page - 1) }, true)}
                    >
                      <ChevronLeft size={14} aria-hidden="true" />{' '}
                      {t('encounter.previousPage')}
                    </Button>
                    <span role="status" className="text-sm text-ink-300">
                      {t('encounter.pageOf', { page, pages })}
                    </span>
                    <Button
                      size="sm"
                      disabled={page === pages}
                      onClick={() => update({ page: String(page + 1) }, true)}
                    >
                      {t('encounter.nextPage')}{' '}
                      <ChevronRight size={14} aria-hidden="true" />
                    </Button>
                  </nav>
                )}
                {!term && !selectedHabitat && (
                  <Button
                    onClick={() => {
                      update({ browse: null, page: null }, true);
                      searchRef.current?.focus();
                    }}
                  >
                    {t('encounter.hideCatalog')}
                  </Button>
                )}
              </>
            ) : (
              <p className="empty-state">{t('encounter.noResults')}</p>
            )
          ) : filtered.length > 0 ? (
            <Button onClick={() => update({ browse: '1' }, true)}>
              {t('encounter.browse')}
            </Button>
          ) : (
            <p className="empty-state">{t('encounter.noResults')}</p>
          )}
        </>
      )}
    </section>
  );
}
