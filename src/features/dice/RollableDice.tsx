import { useRollStore } from './rollStore';

interface RollableDiceProps {
  expression: string;

  display: string;

  label?: string;

  variant?: 'damage' | 'attack';
}

export function RollableDice({
  expression,
  display,
  label,
  variant = 'damage',
}: RollableDiceProps) {
  const roll = useRollStore((s) => s.roll);

  const color =
    variant === 'attack'
      ? 'text-arcane-300 decoration-arcane-300/40 hover:text-arcane-500'
      : 'text-ember-400 decoration-ember-400/40 hover:text-ember-500';

  return (
    <button
      type="button"
      onClick={() => roll(expression, 'normal', label)}
      title={`Roll ${expression}`}
      className={`inline cursor-pointer rounded align-baseline font-medium underline decoration-dotted underline-offset-2 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-arcane-500 ${color}`}
    >
      {display}
    </button>
  );
}
