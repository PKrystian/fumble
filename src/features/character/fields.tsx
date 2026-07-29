import { type ReactNode } from 'react';
import { inputClass, panelClass } from '@/features/ui/styles';

interface TextFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextField({ label, value, onChange, placeholder }: TextFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="text-xs font-semibold text-ink-400">{label}</span>}
      <input
        type="text"
        className={inputClass()}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface NumberFieldProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  className,
}: NumberFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="text-xs font-semibold text-ink-400">{label}</span>}
      <input
        type="number"
        className={inputClass(className)}
        value={Number.isNaN(value) ? '' : value}
        min={min}
        max={max}
        onChange={(event) => {
          const next = event.target.valueAsNumber;
          onChange(Number.isNaN(next) ? 0 : next);
        }}
      />
    </label>
  );
}

interface TextAreaProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

export function TextArea({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: TextAreaProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label && <span className="text-xs font-semibold text-ink-400">{label}</span>}
      <textarea
        className={inputClass('resize-y')}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

interface PanelProps {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}

export function Panel({ title, children, action }: PanelProps) {
  return (
    <section className={panelClass('flex flex-col gap-3 border-ink-700 p-4')}>
      <header className="flex items-center justify-between">
        <h2 className="font-display text-sm font-bold uppercase tracking-wide text-ember-400">
          {title}
        </h2>
        {action}
      </header>
      {children}
    </section>
  );
}
