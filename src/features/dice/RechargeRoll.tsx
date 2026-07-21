import { useState } from 'react';
import { useT } from '@/i18n/useT';
import { useRollStore } from './rollStore';

export function RechargeRoll({ min }: { min: number }) {
  const { t } = useT();
  const roll = useRollStore((s) => s.roll);
  const [result, setResult] = useState<number | null>(null);

  const range = min >= 6 ? '6' : `${min}–6`;
  const recharged = result != null && result >= min;

  const onClick = () => {
    const outcome = roll('1d6', 'normal', t('dice.rechargeLabel', { range }));
    setResult(outcome ? outcome.total : null);
  };

  return (
    <span className="inline-flex items-baseline gap-1">
      <button
        type="button"
        onClick={onClick}
        title={t('dice.rechargeTitle')}
        className="cursor-pointer rounded font-medium text-arcane-300 underline decoration-dotted underline-offset-2 transition-colors hover:text-arcane-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-arcane-500"
      >
        {t('dice.rechargeParen', { range })}
      </button>
      {result != null && (
        <span
          className={
            recharged ? 'text-xs font-semibold text-green-400' : 'text-xs text-ink-400'
          }
        >
          {t('dice.rechargeRolled', {
            result,
            status: recharged ? t('dice.recharged') : t('dice.rechargeNotYet'),
          })}
        </span>
      )}
    </span>
  );
}
