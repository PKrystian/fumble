export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
export type ControlSize = 'sm' | 'md' | 'lg';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'border-arcane-700 bg-arcane-700 text-white hover:border-arcane-600 hover:bg-arcane-600',
  secondary:
    'border-ink-600 bg-ink-900 text-ink-200 hover:border-ink-500 hover:bg-ink-800 hover:text-ink-50',
  danger:
    'border-red-900 bg-red-950/40 text-red-300 hover:border-red-700 hover:bg-red-950/70 hover:text-red-200',
  success: 'border-green-700 bg-green-700 text-white hover:bg-green-800',
  ghost:
    'border-transparent bg-transparent text-ink-300 hover:bg-ink-800 hover:text-ink-50',
};

const controlSizes: Record<ControlSize, string> = {
  sm: 'min-h-8 px-2.5 py-1 text-sm',
  md: 'min-h-10 px-3.5 py-2 text-sm',
  lg: 'min-h-12 px-5 py-3 text-base',
};

export function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function buttonClass({
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ControlSize;
  iconOnly?: boolean;
  className?: string;
} = {}) {
  return classes(
    'ui-button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border font-medium transition-colors duration-150',
    'disabled:cursor-not-allowed disabled:opacity-50',
    buttonVariants[variant],
    iconOnly
      ? size === 'sm'
        ? 'h-8 w-8 p-0'
        : size === 'lg'
          ? 'h-12 w-12 p-0'
          : 'h-10 w-10 p-0'
      : controlSizes[size],
    className,
  );
}

export function inputClass(className?: string, size: ControlSize = 'md') {
  return classes(
    'ui-field min-w-0 w-full rounded-lg border border-ink-600 bg-ink-950 text-sm text-ink-50',
    controlSizes[size],
    'placeholder:text-ink-500 hover:border-ink-600 focus:border-arcane-500 focus:outline-none',
    'disabled:cursor-not-allowed disabled:opacity-50',
    className,
  );
}

export function toggleChipClass(active: boolean, className?: string) {
  return classes(
    'ui-chip inline-flex min-h-8 items-center justify-center rounded-full border px-3 py-1 text-sm font-medium transition-colors duration-150',
    'disabled:cursor-not-allowed disabled:opacity-50',
    active
      ? 'border-arcane-300 bg-arcane-700 text-white hover:bg-arcane-600'
      : 'border-ink-700 bg-ink-900 text-ink-300 hover:border-ink-600 hover:bg-ink-800 hover:text-ink-50',
    className,
  );
}

export function panelClass(className?: string) {
  return classes('surface rounded-xl border border-ink-700 bg-ink-900', className);
}
