import { useMemo, useState } from 'react';
import { Dices } from 'lucide-react';
import { getCategory } from '@/features/compendium/categories';
import { useCategoryItems } from '@/features/compendium/useCategoryItems';
import { isDmCharacter } from '@/features/character/model';
import { useCharacterList } from '@/features/character/store';
import { Button, ToggleChip } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { useContentModeStore } from '@/features/ui/contentModeStore';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { TIERS, tierForLevel } from './loot';
import {
  MAX_PARTY_COUNT,
  validPartyNumber,
  type LootContext,
  type LootReward,
} from './lootData';
import {
  generateLoot,
  lootCandidates,
  lootCatalog,
  rollLootItems,
} from './lootGenerator';
import { useLootStore } from './lootStore';
import { LootDataControls } from './LootDataControls';
import { LootPartyEditor } from './LootPartyEditor';
import { LootResultPanel } from './LootResultPanel';
import { LootHistory } from './LootHistory';

export function LootGeneratorPage() {
  const { t, locale } = useT();
  useSeo(t('seo.pageTitles.loot'), t('seo.pageDescriptions.loot'));
  const { data, blocked, updateSettings, addResult, updateResult } = useLootStore();
  const settings = data.settings;
  const characters = useCharacterList();
  const edition = useContentModeStore((state) => state.mode);
  const [retryKey, setRetryKey] = useState(0);
  const { status, items } = useCategoryItems(
    getCategory('items'),
    false,
    undefined,
    undefined,
    retryKey,
  );
  const catalog = useMemo(() => lootCatalog(items), [items]);
  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);
  const [message, setMessage] = useState({ text: '', error: false, sequence: 0 });
  const feedback = (text: string, error = false) =>
    setMessage((previous) => ({ text, error, sequence: previous.sequence + 1 }));
  const selectedIds =
    settings.selectedIds ??
    characters
      .filter((character) => !isDmCharacter(character))
      .map((character) => character.id);
  const selected = characters.filter((character) => selectedIds.includes(character.id));
  const groupsValid = settings.groups.every(
    (group) =>
      validPartyNumber(group.count, MAX_PARTY_COUNT) && validPartyNumber(group.level, 20),
  );
  const savedValid = selected.every(
    (character) =>
      Number.isInteger(character.level) && character.level >= 1 && character.level <= 20,
  );
  const partySize =
    settings.source === 'manual'
      ? settings.groups.reduce(
          (sum, group) => sum + (groupsValid ? Number(group.count) : 0),
          0,
        )
      : selected.length;
  const partyLevel =
    settings.source === 'manual'
      ? groupsValid
        ? Math.round(
            settings.groups.reduce(
              (sum, group) => sum + Number(group.count) * Number(group.level),
              0,
            ) / partySize,
          )
        : 1
      : selected.length && savedValid
        ? Math.round(
            selected.reduce((sum, character) => sum + character.level, 0) /
              selected.length,
          )
        : 1;
  const partyValid =
    settings.source === 'manual' ? groupsValid : savedValid && partySize > 0;
  const contextFor = (reward: LootReward): LootContext => ({
    mode: settings.mode,
    reward:
      settings.mode === 'party'
        ? reward === 'minor'
          ? 'minor'
          : 'major'
        : settings.mode === 'tier'
          ? 'hoard'
          : 'wildcard',
    tierId:
      settings.mode === 'party'
        ? tierForLevel(partyLevel).id
        : settings.mode === 'tier'
          ? settings.tierId
          : settings.wildcardTierId,
    partySize: settings.mode === 'party' ? partySize : 0,
    partyLevel: settings.mode === 'party' ? partyLevel : 1,
    party:
      settings.mode === 'party' && settings.source === 'saved'
        ? selected.map(
            ({
              id,
              name,
              level,
              className,
              armorProficiencies,
              weaponProficiencies,
            }) => ({
              id,
              name,
              level,
              className,
              armorProficiencies,
              weaponProficiencies,
            }),
          )
        : [],
    edition,
    includeUnknown: settings.mode === 'wildcard' && settings.includeUnknown,
  });
  const context = contextFor('major');
  const mainPool = lootCandidates(catalog.valid, context);
  const minorPool = lootCandidates(catalog.valid, contextFor('minor'));
  const ready =
    status === 'ready' && !blocked && (settings.mode !== 'party' || partyValid);
  const result = data.history.find((result) => result.id === data.selectedId);
  const pending = Boolean(
    result &&
    JSON.stringify(result.context) !== JSON.stringify(contextFor(result.context.reward)),
  );
  const generate = (reward: LootReward) => {
    try {
      const result = generateLoot(catalog.valid, contextFor(reward));
      addResult(result);
      feedback(
        t('dm.loot.resultGenerated', {
          gold: result.gold.toLocaleString(locale),
          unit: t('dm.loot.goldUnit'),
          count: result.items.length,
        }),
      );
    } catch {
      feedback(t('dm.loot.rollError'), true);
    }
  };

  return (
    <div className="page-shell space-y-6">
      <div>
        <h1 className="page-title">{t('dm.loot.title')}</h1>
        <p className="page-description">{t('dm.loot.description')}</p>
      </div>
      <LootDataControls feedback={feedback} />
      <fieldset
        disabled={blocked}
        className="min-w-0 space-y-4"
        aria-label={t('dm.loot.configuration')}
      >
        <nav className="flex flex-wrap gap-2" aria-label={t('dm.loot.modeNav')}>
          {(['party', 'tier', 'wildcard'] as const).map((mode) => (
            <ToggleChip
              key={mode}
              active={mode === settings.mode}
              onClick={() => updateSettings({ mode })}
            >
              {t(
                `dm.loot.${({ party: 'modeParty', tier: 'modeTier', wildcard: 'modeWildcard' } as const)[mode]}`,
              )}
            </ToggleChip>
          ))}
        </nav>
        <div className={panelClass('space-y-4 p-4')}>
          <p className="text-sm text-ink-400">
            {t('dm.loot.edition', { edition: t(`dm.loot.editions.${edition}`) })}
          </p>
          {settings.mode === 'party' ? (
            <>
              <LootPartyEditor
                settings={settings}
                characters={characters}
                selectedIds={selectedIds}
                update={updateSettings}
              />
              <p className="text-sm text-ink-300">
                {t('dm.loot.effectiveTier', {
                  tier: t('dm.loot.tierLabel', { n: context.tierId }),
                  level: partyLevel,
                })}
              </p>
              {settings.source === 'saved' && selected.length === 0 && (
                <p className="notice">{t('dm.loot.emptySelection')}</p>
              )}
              {settings.source === 'saved' && !savedValid && (
                <p role="alert" className="notice notice-error">
                  {t('dm.loot.invalidLevel')}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {TIERS.map((tier) => (
                  <ToggleChip
                    key={tier.id}
                    active={tier.id === context.tierId}
                    className="text-left"
                    aria-label={`${t('dm.loot.tierLabel', { n: tier.id })} ${t('dm.loot.tierLevels', { min: tier.minLevel, max: tier.maxLevel })}`}
                    onClick={() =>
                      updateSettings(
                        settings.mode === 'tier'
                          ? { tierId: tier.id }
                          : { wildcardTierId: tier.id },
                      )
                    }
                  >
                    <span>
                      <span className="block font-semibold">
                        {t('dm.loot.tierLabel', { n: tier.id })}
                      </span>
                      <span className="block text-xs">
                        {t('dm.loot.tierLevels', {
                          min: tier.minLevel,
                          max: tier.maxLevel,
                        })}
                      </span>
                    </span>
                  </ToggleChip>
                ))}
              </div>
              {settings.mode === 'wildcard' && (
                <>
                  <label className="flex cursor-pointer items-start gap-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 accent-arcane-500"
                      checked={settings.includeUnknown}
                      onChange={(event) =>
                        updateSettings({ includeUnknown: event.target.checked })
                      }
                    />
                    {t('dm.loot.includeUnknown')}
                  </label>
                  {settings.includeUnknown && (
                    <p className="notice">{t('dm.loot.unknownHelp')}</p>
                  )}
                </>
              )}
            </>
          )}
        </div>
        {status === 'loading' && (
          <p role="status" className="notice">
            {t('dm.loot.loadingItems')}
          </p>
        )}
        {status === 'error' && (
          <div role="alert" className="notice notice-error">
            <p>{t('dm.loot.loadingError')}</p>
            <Button className="mt-3" onClick={() => setRetryKey((key) => key + 1)}>
              {t('dm.loot.retry')}
            </Button>
          </div>
        )}
        {status === 'ready' && mainPool.candidates.length === 0 && (
          <p role="status" className="notice">
            {t(
              mainPool.visible.length === 0
                ? 'dm.loot.emptyPool'
                : 'dm.loot.noCandidates',
            )}
          </p>
        )}
        {status === 'ready' &&
          settings.mode === 'party' &&
          mainPool.candidates.length > 0 &&
          minorPool.candidates.length === 0 && (
            <p className="notice">{t('dm.loot.noMinorCandidates')}</p>
          )}
        {catalog.skipped.length > 0 && (
          <details className={panelClass('p-4 text-sm')}>
            <summary className="cursor-pointer">
              {t('dm.loot.skippedItems', { count: catalog.skipped.length })}
            </summary>
            <p className="mt-3 text-ink-300">{t('dm.loot.skippedHelp')}</p>
            <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto [overflow-wrap:anywhere]">
              {catalog.skipped.map((item) => (
                <li key={item.id}>{item.name}</li>
              ))}
            </ul>
            <Link to="/homebrew" className="back-link mt-3 inline-flex">
              {t('nav.homebrew')}
            </Link>
          </details>
        )}
        <div className="flex flex-wrap gap-2">
          {settings.mode === 'party' && (
            <Button
              size="lg"
              disabled={!ready || minorPool.candidates.length === 0}
              onClick={() => generate('minor')}
            >
              <Dices size={18} aria-hidden="true" />
              {t('dm.loot.minorReward')}
            </Button>
          )}
          <Button
            size="lg"
            variant="primary"
            disabled={!ready || mainPool.candidates.length === 0}
            onClick={() => generate('major')}
          >
            <Dices size={20} aria-hidden="true" />
            {t(
              settings.mode === 'party'
                ? 'dm.loot.majorReward'
                : settings.mode === 'tier'
                  ? 'dm.loot.generateHoard'
                  : 'dm.loot.rollWildcardLoot',
            )}
          </Button>
        </div>
        {settings.mode === 'party' && (
          <p className="text-sm text-ink-400">{t('dm.loot.minorMajorNote')}</p>
        )}
      </fieldset>
      <div aria-live="polite" aria-atomic="true" className="min-h-6">
        <p
          key={message.sequence}
          role={message.error ? 'alert' : undefined}
          className={message.error ? 'notice notice-error' : 'text-sm text-ink-300'}
        >
          {message.text}
        </p>
      </div>
      {result ? (
        <LootResultPanel
          key={result.id}
          result={result}
          catalog={byId}
          canonical={catalog.valid}
          pending={pending}
          canReroll={
            status === 'ready' &&
            !blocked &&
            lootCandidates(catalog.valid, result.context).candidates.length > 0
          }
          reroll={() => {
            try {
              updateResult(result.id, {
                items: rollLootItems(catalog.valid, result.context),
              });
              feedback(t('dm.loot.itemsRerolled'));
            } catch {
              feedback(t('dm.loot.rollError'), true);
            }
          }}
          feedback={feedback}
        />
      ) : (
        <p className="empty-state">{t('dm.loot.initialResult')}</p>
      )}
      <LootHistory />
      <p className="text-xs text-ink-400">{t('dm.loot.footerNote')}</p>
    </div>
  );
}
