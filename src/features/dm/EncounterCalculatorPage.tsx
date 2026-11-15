import { useMemo, useRef, useState } from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { sourceName } from '@/data/compendium/sources';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { OriginalName } from '@/features/ui/OriginalName';
import { Button, IconButton, Select, TextInput } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { useUrlSearchState } from '@/features/ui/useUrlSearchState';
import { EncounterCatalog } from './EncounterCatalog';
import { useEncounterCatalog } from './useEncounterCatalog';
import { EncounterDataControls } from './EncounterDataControls';
import { EncounterLibrary } from './EncounterLibrary';
import { EncounterTransfer } from './EncounterTransfer';
import { useEncounterStore } from './encounterStore';
import {
  DIFFICULTIES,
  ENCOUNTER_COUNT_LIMIT,
  ENCOUNTER_GROUP_LIMIT,
  ENCOUNTER_ROSTER_LIMIT,
  monsterXp,
  partyNumber,
  type EncounterCreature,
  type EncounterMonster,
} from './encounterModel';
import { partyBudget, rateEncounter, type Difficulty } from './xp';

export function EncounterCalculatorPage() {
  const { t, locale } = useT();
  useSeo(t('seo.pageTitles.encounter'), t('seo.pageDescriptions.encounter'));
  const { data, edit } = useEncounterStore();
  const { party, monsters, target, name } = data.draft;
  const { params } = useUrlSearchState();
  const [retry, setRetry] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferred, setTransferred] = useState<{ count: number; saved: boolean }>();
  const catalog = useEncounterCatalog(params.get('monster') ?? undefined, retry);
  const addGroup = useRef<HTMLButtonElement>(null);
  const rosterTitle = useRef<HTMLHeadingElement>(null);
  const draftTitle = useRef<HTMLHeadingElement>(null);
  const rosterControls = useRef(new Map<string, HTMLButtonElement>());
  const names = useMemo(
    () => new Map(catalog.items.map((item) => [item.id, item.name])),
    [catalog.items],
  );
  const roster = monsters.map((monster) => ({
    ...monster,
    name:
      names.get(monster.id) ??
      (locale === 'en' ? monster.original || monster.name : monster.name),
  }));
  const groups = party.map((group) => ({
    count: partyNumber(group.count, ENCOUNTER_COUNT_LIMIT),
    level: partyNumber(group.level, 20),
  }));
  const valid = groups.every((group) => group.count !== null && group.level !== null);
  const budget = valid
    ? partyBudget(groups.map(({ count, level }) => ({ count: count!, level: level! })))
    : null;
  const incomplete = monsters.some((monster) => monsterXp(monster) === null);
  const total = monsters.reduce(
    (sum, monster) => sum + (monsterXp(monster) ?? 0) * monster.count,
    0,
  );
  const remaining = budget && !incomplete ? budget[target] - total : null;
  const difficulty =
    budget && !incomplete && monsters.length ? rateEncounter(total, budget) : null;
  const xp = (value: number) =>
    t('encounter.xpValue', { xp: value.toLocaleString(locale) });

  const addMonster = (creature: EncounterCreature) => {
    const current = monsters.find((monster) => monster.id === creature.id);
    if (
      current
        ? current.count >= ENCOUNTER_COUNT_LIMIT
        : monsters.length >= ENCOUNTER_ROSTER_LIMIT
    ) {
      setFeedback(
        t(current ? 'encounter.countLimit' : 'encounter.rosterLimit', {
          limit: current ? ENCOUNTER_COUNT_LIMIT : ENCOUNTER_ROSTER_LIMIT,
        }),
      );
      return false;
    }
    edit({
      monsters: current
        ? monsters.map((monster) =>
            monster.id === creature.id
              ? { ...monster, count: monster.count + 1 }
              : monster,
          )
        : [...monsters, { ...creature, count: 1, inLair: false }],
    });
    setFeedback(t('encounter.creatureAdded', { name: creature.name }));
    return true;
  };

  const randomCost = (creature: EncounterCreature) => {
    const current = monsters.find((monster) => monster.id === creature.id);
    if (current) return current.count < ENCOUNTER_COUNT_LIMIT ? monsterXp(current) : null;
    return monsters.length < ENCOUNTER_ROSTER_LIMIT ? creature.xp : null;
  };

  const patchMonster = (
    id: string,
    patch: Partial<Pick<EncounterMonster, 'count' | 'inLair'>>,
  ) =>
    edit({
      monsters: monsters.map((monster) =>
        monster.id === id ? { ...monster, ...patch } : monster,
      ),
    });

  const removeMonster = (monster: EncounterMonster, index: number) => {
    const neighbor = monsters[index + 1] ?? monsters[index - 1];
    edit({ monsters: monsters.filter((row) => row.id !== monster.id) });
    setFeedback(t('encounter.creatureRemoved', { name: monster.name }));
    requestAnimationFrame(() => {
      (
        (neighbor && rosterControls.current.get(neighbor.id)) ||
        rosterTitle.current
      )?.focus();
    });
  };

  return (
    <div className="page-shell page-shell-wide space-y-6">
      <header>
        <h1 className="page-title">{t('encounter.title')}</h1>
        <p className="page-description">{t('encounter.description')}</p>
      </header>
      <section
        className={panelClass('space-y-4 p-4 sm:p-5')}
        aria-labelledby="encounter-draft-title"
      >
        <h2
          ref={draftTitle}
          tabIndex={-1}
          id="encounter-draft-title"
          className="section-title [overflow-wrap:anywhere]"
        >
          {name.trim() || t('encounter.draft')}
        </h2>
        <div role="status" className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="field-label">
              {t(incomplete ? 'encounter.knownXp' : 'encounter.totalXp')}
            </p>
            <p className="roll-value text-2xl">{total.toLocaleString(locale)}</p>
          </div>
          <div>
            <p className="field-label">{t('encounter.difficulty')}</p>
            <p className="font-semibold text-ink-50">
              {t(difficulty ? 'encounter.' + difficulty : 'encounter.notRated')}
            </p>
          </div>
          <div>
            <p className="field-label">{t('encounter.targetBudget')}</p>
            <p className="font-semibold text-ink-50">
              {remaining === null
                ? t('encounter.budgetPending')
                : t(remaining < 0 ? 'encounter.overTarget' : 'encounter.remainingXp', {
                    xp: xp(Math.abs(remaining)),
                  })}
            </p>
          </div>
        </div>
        {incomplete && (
          <p className="notice" role="status">
            {t('encounter.incompleteXp')}
          </p>
        )}
        <p role="status" className="text-sm text-ink-300">
          {feedback}
        </p>
      </section>
      <EncounterDataControls />
      <EncounterLibrary
        valid={valid}
        focusDraft={() => draftTitle.current?.focus()}
        announce={setFeedback}
      />

      <section
        className={panelClass('space-y-4 p-4 sm:p-5')}
        aria-labelledby="encounter-party-title"
      >
        <h2 id="encounter-party-title" className="panel-title">
          {t('encounter.party')}
        </h2>
        <div className="grid items-start gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {party.map((group, index) => (
              <div
                key={group.id}
                className="flex flex-wrap items-start gap-2 rounded-lg border border-ink-700 p-3"
              >
                {(['count', 'level'] as const).map((field) => {
                  const invalid = groups[index]![field] === null;
                  const errorId = 'encounter-' + group.id + '-' + field;
                  return (
                    <label key={field} className="min-w-0 flex-1 basis-20">
                      <span className="field-label">{t('encounter.' + field)}</span>
                      <TextInput
                        type="number"
                        min={1}
                        max={field === 'count' ? ENCOUNTER_COUNT_LIMIT : 20}
                        step={1}
                        className="w-full"
                        value={group[field]}
                        aria-invalid={invalid}
                        aria-describedby={invalid ? errorId : undefined}
                        onChange={(event) => {
                          const value = event.target.value.slice(0, 64);
                          edit({
                            party: party.map((item) =>
                              item.id === group.id ? { ...item, [field]: value } : item,
                            ),
                          });
                        }}
                      />
                      {invalid && (
                        <span className="mt-1 block text-xs text-red-300" id={errorId}>
                          {t(
                            field === 'count'
                              ? 'encounter.invalidCount'
                              : 'encounter.invalidLevel',
                            { limit: ENCOUNTER_COUNT_LIMIT },
                          )}
                        </span>
                      )}
                    </label>
                  );
                })}
                {party.length > 1 && (
                  <IconButton
                    variant="ghost"
                    label={t('encounter.removePartyGroup', { n: index + 1 })}
                    onClick={() => {
                      edit({ party: party.filter((item) => item.id !== group.id) });
                      requestAnimationFrame(() => addGroup.current?.focus());
                    }}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </IconButton>
                )}
              </div>
            ))}
            <Button
              ref={addGroup}
              disabled={party.length >= ENCOUNTER_GROUP_LIMIT}
              onClick={() =>
                edit({
                  party: [...party, { id: crypto.randomUUID(), count: '1', level: '1' }],
                })
              }
            >
              <Plus size={16} aria-hidden="true" /> {t('encounter.addLevelGroup')}
            </Button>
          </div>
          <div className="space-y-3">
            <label className="block">
              <span className="field-label">{t('encounter.targetDifficulty')}</span>
              <Select
                className="w-full"
                value={target}
                onChange={(event) => edit({ target: event.target.value as Difficulty })}
              >
                {DIFFICULTIES.map((key) => (
                  <option key={key} value={key}>
                    {t('encounter.' + key)}
                  </option>
                ))}
              </Select>
            </label>
            {budget ? (
              <dl className="grid grid-cols-3 gap-2 text-sm">
                {DIFFICULTIES.map((key) => (
                  <div className="min-w-0 [overflow-wrap:anywhere]" key={key}>
                    <dt className="field-label">{t('encounter.' + key)}</dt>
                    <dd className="font-semibold tabular-nums">{xp(budget[key])}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p role="status" className="notice notice-error">
                {t('encounter.invalidParty')}
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <EncounterCatalog
          catalog={catalog}
          retry={() => setRetry((value) => value + 1)}
          add={addMonster}
          remaining={remaining}
          randomCost={randomCost}
        />
        <section
          className={panelClass('min-w-0 space-y-4 p-4 sm:p-5')}
          aria-labelledby="encounter-monsters-title"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              className="panel-title"
              id="encounter-monsters-title"
              ref={rosterTitle}
              tabIndex={-1}
            >
              {t('encounter.monsters')}
            </h2>
            <Button disabled={!monsters.length} onClick={() => setTransferOpen(true)}>
              {t('encounter.transferTitle')}
            </Button>
          </div>
          {transferred && (
            <div
              role={transferred.saved ? 'status' : 'alert'}
              className={transferred.saved ? 'notice' : 'notice notice-error'}
            >
              <p>
                {t(
                  transferred.saved
                    ? 'encounter.transferred'
                    : 'encounter.transferUnsaved',
                  { count: transferred.count },
                )}
              </p>
              <Link className="back-link" to="/dm/initiative">
                {t('encounter.openInitiative')}
              </Link>
            </div>
          )}
          {roster.length === 0 ? (
            <p className="empty-state">{t('encounter.noMonstersYet')}</p>
          ) : (
            <ul className="space-y-2">
              {roster.map((monster, index) => {
                const known = names.has(monster.id);
                const value = monsterXp(monster);
                const metadata = [
                  monster.source && sourceName(monster.source, locale),
                  monster.cr && t('encounter.crValue', { cr: monster.cr }),
                  value === null ? t('encounter.unknownXp') : xp(value * monster.count),
                ].filter(Boolean);
                return (
                  <li
                    key={monster.id}
                    className={panelClass(
                      'space-y-2 p-3 text-sm [overflow-wrap:anywhere]',
                    )}
                  >
                    <div>
                      {known ? (
                        <Link
                          className="font-semibold text-arcane-300 hover:underline"
                          to={'/compendium/bestiary/' + encodeURIComponent(monster.id)}
                        >
                          {monster.name}
                        </Link>
                      ) : (
                        <p className="font-semibold text-ink-50">{monster.name}</p>
                      )}
                      <OriginalName
                        className="block text-xs"
                        name={
                          monster.name !== monster.original ? monster.original : undefined
                        }
                      />
                      <p className="mt-1 text-xs text-ink-300">{metadata.join(' · ')}</p>
                      {!known && catalog.status === 'ready' && (
                        <p className="text-xs text-ink-300">{t('encounter.snapshot')}</p>
                      )}
                    </div>
                    {monster.lairXp !== null && (
                      <label className="flex min-h-10 items-center gap-2">
                        <input
                          className="accent-arcane-500"
                          type="checkbox"
                          checked={monster.inLair}
                          onChange={(event) =>
                            patchMonster(monster.id, { inLair: event.target.checked })
                          }
                        />
                        {t('encounter.inLair', { xp: xp(monster.lairXp) })}
                      </label>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <IconButton
                        size="sm"
                        disabled={monster.count === 1}
                        label={t('encounter.fewer', { name: monster.name })}
                        onClick={() =>
                          patchMonster(monster.id, { count: monster.count - 1 })
                        }
                      >
                        <Minus size={14} aria-hidden="true" />
                      </IconButton>
                      <span className="min-w-6 text-center tabular-nums">
                        {monster.count}
                      </span>
                      <IconButton
                        size="sm"
                        disabled={monster.count >= ENCOUNTER_COUNT_LIMIT}
                        label={t('encounter.more', { name: monster.name })}
                        onClick={() =>
                          patchMonster(monster.id, { count: monster.count + 1 })
                        }
                      >
                        <Plus size={14} aria-hidden="true" />
                      </IconButton>
                      <Button
                        ref={(element) => {
                          if (element) rosterControls.current.set(monster.id, element);
                          else rosterControls.current.delete(monster.id);
                        }}
                        size="sm"
                        variant="danger"
                        aria-label={t('encounter.removeCreature', { name: monster.name })}
                        onClick={() => removeMonster(monster, index)}
                      >
                        <Trash2 size={14} aria-hidden="true" /> {t('common.delete')}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
      {transferOpen && (
        <EncounterTransfer
          monsters={roster}
          onClose={() => setTransferOpen(false)}
          onTransfer={(count, saved) => {
            setTransferred({ count, saved });
            setTransferOpen(false);
          }}
        />
      )}
    </div>
  );
}
