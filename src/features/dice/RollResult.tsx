import { useState } from 'react';
import { Copy, RotateCw } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { Button } from '@/features/ui/primitives';
import { describeRolls, type RollOutcome } from './engine';
import { DamageBadge } from './DamageBadge';
import { focusRollResult } from './resultFocus';
import { useRollStore, type RollLogEntry } from './rollStore';

function outcomeText(outcome: RollOutcome): string {
  return `${outcome.calculation ?? describeRolls(outcome)} = ${outcome.total}`;
}

export function RollDetails({ outcome }: { outcome: RollOutcome }) {
  const { t } = useT();
  if (outcome.damage)
    return (
      <div className="mt-4 space-y-4">
        <ul className="space-y-2">
          {outcome.damage.parts.map(({ component, outcome: part }, index) => (
            <li
              key={`${component.id}-${index}`}
              className="damage-panel p-3"
              data-damage={component.type}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-ink-50">
                  {component.name || t('dice.componentNumber', { number: index + 1 })}
                </span>
                <DamageBadge type={component.type} />
              </div>
              <p className="mt-2 break-words text-sm text-ink-300">{part.expression}</p>
              <RollDetails outcome={part} />
            </li>
          ))}
        </ul>
        <div className="space-y-2 border-t border-ink-700 pt-3">
          {outcome.damage.totals.map((group) => (
            <div
              key={group.type}
              className="damage-panel flex flex-wrap items-center justify-between gap-2 p-3"
              data-damage={group.type}
            >
              <DamageBadge type={group.type} />
              <span className="text-sm text-ink-200">
                {group.defense.immunity
                  ? t('dice.immunity')
                  : [
                      group.defense.resistance && t('dice.resistance'),
                      group.defense.vulnerability && t('dice.vulnerability'),
                    ]
                      .filter(Boolean)
                      .join(' + ') || t('dice.normalDamage')}
              </span>
              <span className="font-semibold text-ink-50 tabular-nums">
                {group.raw} → {group.total}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  return (
    <div className="mt-3 space-y-2 text-sm">
      {outcome.groups.map((group, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <span className="text-ink-400">d{group.sides}</span>
          {group.rolls.map((face, faceIndex) => {
            const kept = group.keptIndices
              ? group.keptIndices.includes(faceIndex)
              : group.kept.includes(face);
            return (
              <span
                key={faceIndex}
                className={
                  kept
                    ? 'badge tabular-nums'
                    : 'badge text-ink-500 line-through tabular-nums'
                }
                aria-label={t(kept ? 'dice.keptDie' : 'dice.discardedDie', {
                  value: face,
                })}
              >
                {face}
              </span>
            );
          })}
        </div>
      ))}
      <p className="break-words text-ink-200 [overflow-wrap:anywhere]">
        {outcome.calculation ?? describeRolls(outcome)} = <strong>{outcome.total}</strong>
      </p>
    </div>
  );
}

export function RollResult({
  entry,
  compact = false,
}: {
  entry: RollLogEntry;
  compact?: boolean;
}) {
  const { locale, t } = useT();
  const reroll = useRollStore((state) => state.reroll);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const copy = async () => {
    const outcome = entry.outcome;
    const damage = outcome.damage;
    const details = damage
      ? damage.parts
          .map(
            (part) =>
              `${part.component.name}: ${part.outcome.expression} = ${part.outcome.total} (${t(`dice.damageTypes.${part.component.type}`)})`,
          )
          .join('\n') +
        '\n' +
        damage.totals
          .map(
            (group) =>
              `${t(`dice.damageTypes.${group.type}`)}: ${group.raw} -> ${group.total}`,
          )
          .join('\n')
      : outcomeText(outcome);
    try {
      await navigator.clipboard.writeText(
        `${entry.label ? entry.label + ': ' : ''}${outcome.expression} (${t(`dice.mode${outcome.mode[0]!.toUpperCase()}${outcome.mode.slice(1)}`)})\n${details}\n${t('dice.total')}: ${outcome.total}`,
      );
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  };
  return (
    <div>
      {entry.label && (
        <p className="font-semibold text-ink-50 [overflow-wrap:anywhere]">
          {entry.label}
        </p>
      )}
      <p className="mt-1 break-words text-sm text-ink-300 [overflow-wrap:anywhere]">
        {entry.outcome.expression}
      </p>
      {entry.outcome.mode !== 'normal' && (
        <p className="mt-1 text-sm text-arcane-300">
          {t(
            entry.outcome.mode === 'advantage'
              ? 'dice.modeAdvantage'
              : 'dice.modeDisadvantage',
          )}
        </p>
      )}
      <p
        className={
          compact
            ? 'my-2 text-3xl font-bold text-ink-50 tabular-nums'
            : 'my-3 text-5xl font-bold text-ink-50 tabular-nums'
        }
      >
        <span className="sr-only">{t('dice.total')}: </span>
        {entry.outcome.total}
      </p>
      {entry.createdAt !== undefined && (
        <p className="text-xs text-ink-400">
          <time dateTime={new Date(entry.createdAt).toISOString()}>
            {new Intl.DateTimeFormat(locale, {
              dateStyle: 'short',
              timeStyle: 'medium',
            }).format(entry.createdAt)}
          </time>
        </p>
      )}
      <RollDetails outcome={entry.outcome} />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            if (reroll(entry)) focusRollResult();
            setCopyStatus('idle');
          }}
          size={compact ? 'sm' : 'md'}
        >
          <RotateCw size={15} aria-hidden="true" />
          {t('dice.reroll')}
        </Button>
        <Button onClick={() => void copy()} size={compact ? 'sm' : 'md'}>
          <Copy size={15} aria-hidden="true" />
          {t('dice.copyResult')}
        </Button>
      </div>
      <div className="mt-2 min-h-5 text-sm" aria-live="polite">
        {copyStatus === 'copied' && <p className="text-ink-300">{t('dice.copied')}</p>}
        {copyStatus === 'failed' && (
          <p role="alert" className="text-red-300">
            {t('dice.copyFailed')}
          </p>
        )}
      </div>
    </div>
  );
}

export function RollHistoryItem({ entry }: { entry: RollLogEntry }) {
  const { t } = useT();
  const [expanded, setExpanded] = useState(false);
  return (
    <details
      className="rounded-lg border border-ink-700 p-3"
      onToggle={(event) => setExpanded(event.currentTarget.open)}
    >
      <summary className="cursor-pointer text-sm text-ink-200 [overflow-wrap:anywhere]">
        <span className="font-semibold">
          {entry.label ? entry.label + ': ' : ''}
          {entry.outcome.expression}
        </span>
        <span className="ml-2 text-ink-50 tabular-nums">= {entry.outcome.total}</span>
        {entry.outcome.mode !== 'normal' && (
          <span className="ml-2 text-arcane-300">
            {t(
              entry.outcome.mode === 'advantage'
                ? 'dice.modeAdvantage'
                : 'dice.modeDisadvantage',
            )}
          </span>
        )}
      </summary>
      {expanded && <RollResult entry={entry} compact />}
    </details>
  );
}
