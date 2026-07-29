import { Search, X } from 'lucide-react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react';
import { forwardRef } from 'react';
import {
  buttonClass,
  classes,
  inputClass,
  toggleChipClass,
  type ButtonVariant,
  type ControlSize,
} from './styles';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ControlSize;
  iconOnly?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    iconOnly = false,
    className,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({
        variant,
        size,
        iconOnly,
        ...(className ? { className } : {}),
      })}
      {...props}
    />
  );
});

type IconButtonProps = Omit<ButtonProps, 'children' | 'iconOnly' | 'aria-label'> & {
  label: string;
  children: ReactNode;
};

export function IconButton({ label, title = label, ...props }: IconButtonProps) {
  return <Button aria-label={label} title={title} iconOnly {...props} />;
}

export const TextInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function TextInput({ className, ...props }, ref) {
  return <input ref={ref} className={inputClass(className)} {...props} />;
});

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClass(className)} {...props} />;
}

type SearchFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string;
  clearLabel?: string;
  onClear?: () => void;
};

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(
    { label, clearLabel = label, value, onClear, className, ...props },
    ref,
  ) {
    const hasValue = typeof value === 'string' && value.length > 0;

    return (
      <label
        className={classes(
          'flex min-h-10 w-full items-center gap-2 rounded-lg border border-ink-700 bg-ink-950 px-3',
          'text-ink-500 transition-colors hover:border-ink-600 focus-within:border-arcane-500',
          className,
        )}
      >
        <span className="sr-only">{label}</span>
        <Search size={16} aria-hidden="true" className="shrink-0" />
        <input
          ref={ref}
          type="search"
          value={value}
          className="min-w-0 flex-1 bg-transparent py-2 text-sm text-ink-50 outline-none placeholder:text-ink-500"
          {...props}
        />
        {hasValue && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="rounded p-1 text-ink-500 transition-colors hover:bg-ink-800 hover:text-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arcane-400"
            aria-label={clearLabel}
          >
            <X size={14} aria-hidden="true" />
          </button>
        ) : null}
      </label>
    );
  },
);

type ToggleChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
};

export function ToggleChip({
  active,
  className,
  type = 'button',
  ...props
}: ToggleChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={toggleChipClass(active, className)}
      {...props}
    />
  );
}
