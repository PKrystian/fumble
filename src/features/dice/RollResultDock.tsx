import { RotateCw, X } from 'lucide-react';
import { type RollMode, describeRolls } from './engine';
import { useRollStore } from './rollStore';

const MODE_LABELS: Record<RollMode, string> = {
  normal: 'Normal',
  advantage: 'Advantage',
  disadvantage: 'Disadvantage',
};

export function RollResultDock() {
  const log = useRollStore((s) => s.log);
  const dockOpen = useRollStore((s) => s.dockOpen);
  const closeDock = useRollStore((s) => s.closeDock);
  const clearLog = useRollStore((s) => s.clearLog);
  const roll = useRollStore((s) => s.roll);

  const latest = log[0];
  if (!dockOpen || !latest) return null;

  const { outcome, label } = latest;
  const reroll = (mode: RollMode) => roll(outcome.expression, mode, label);
  const hasD20 = outcome.groups.some((g) => g.sides === 20);

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-80">
      <div className="animate-fade-in-up rounded-t-2xl border border-ink-700 bg-ink-900 shadow-2xl sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-ink-700 px-4 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
            Dice Result
          </span>
          <button
            type="button"
            onClick={closeDock}
            aria-label="Close dice result"
            className="rounded p-1 text-ink-400 hover:bg-ink-800 hover:text-ink-50"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 text-center">
          {label && (
            <p className="text-xs font-medium uppercase tracking-wide text-arcane-300">
              {label}
            </p>
          )}
          <p className="text-sm text-ink-300">
            {outcome.expression}
            {outcome.mode !== 'normal' && ` (${MODE_LABELS[outcome.mode]})`}
          </p>
          <p className="my-1 font-display text-5xl font-black text-ember-400">
            {outcome.total}
          </p>
          <p className="text-xs text-ink-400">{describeRolls(outcome)}</p>

          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => reroll('normal')}
              className="inline-flex items-center gap-1 rounded-md bg-arcane-700 px-3 py-1.5 text-sm font-medium text-ink-50 hover:bg-arcane-500"
            >
              <RotateCw size={14} /> Reroll
            </button>
            {hasD20 && (
              <>
                <button
                  type="button"
                  onClick={() => reroll('advantage')}
                  className="rounded-md border border-ink-700 px-2.5 py-1.5 text-sm text-ink-200 hover:bg-ink-800"
                  title="Roll with advantage"
                >
                  Adv
                </button>
                <button
                  type="button"
                  onClick={() => reroll('disadvantage')}
                  className="rounded-md border border-ink-700 px-2.5 py-1.5 text-sm text-ink-200 hover:bg-ink-800"
                  title="Roll with disadvantage"
                >
                  Dis
                </button>
              </>
            )}
          </div>
        </div>

        {log.length > 1 && (
          <div className="max-h-40 overflow-y-auto border-t border-ink-700 px-4 py-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                Recent
              </span>
              <button
                type="button"
                onClick={clearLog}
                className="text-xs text-ink-400 hover:text-ink-50"
              >
                Clear
              </button>
            </div>
            <ul className="flex flex-col gap-0.5">
              {log.slice(1, 12).map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between text-sm text-ink-300"
                >
                  <span className="min-w-0 truncate">
                    {entry.label ? `${entry.label}: ` : ''}
                    {entry.outcome.expression}
                    {entry.outcome.mode !== 'normal' &&
                      ` (${MODE_LABELS[entry.outcome.mode][0]})`}
                  </span>
                  <span className="ml-2 font-display font-bold text-ink-50">
                    {entry.outcome.total}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
