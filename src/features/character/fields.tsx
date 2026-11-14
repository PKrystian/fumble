import { useContext, useId, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { inputClass, panelClass } from '@/features/ui/styles';
import { useT } from '@/i18n/useT';
import { PanelFrameContext, parseWholeNumber } from './panelFrame';

function FieldLabel({ text, hidden }: { text: string; hidden?: boolean | undefined }) {
  return <span className={hidden ? 'sr-only' : 'field-label'}>{text}</span>;
}

interface TextFieldProps {
  label: string;
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextField({
  label,
  hideLabel,
  value,
  onChange,
  placeholder,
}: TextFieldProps) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <FieldLabel text={label} hidden={hideLabel} />
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
  label: string;
  hideLabel?: boolean;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  className?: string;
  inputClassName?: string;
  hint?: ReactNode;
}

export function NumberField({
  label,
  hideLabel,
  value,
  onChange,
  min,
  max,
  className,
  inputClassName,
  hint,
}: NumberFieldProps) {
  const { t } = useT();
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (Number.isFinite(value) ? String(value) : '');
  const invalid = draft !== null && parseWholeNumber(draft, min, max) === null;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [invalid ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`flex min-w-0 flex-col gap-1 text-sm ${className ?? ''}`.trim()}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'field-label'}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={inputClass(`tabular-nums ${inputClassName ?? ''}`.trim())}
        value={shown}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy || undefined}
        onChange={(event) => {
          const text = event.target.value;
          setDraft(text);
          const next = parseWholeNumber(text, min, max);
          if (next !== null && next !== value) onChange(next);
        }}
        onBlur={() => setDraft(null)}
      />
      {invalid && (
        <span id={errorId} className="text-xs text-red-300">
          {t('character.sheet.validation.range', { min, max })}
        </span>
      )}
      {hint && (
        <span id={hintId} className="text-xs text-ink-400">
          {hint}
        </span>
      )}
    </div>
  );
}

interface TextAreaProps {
  label: string;
  hideLabel?: boolean;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

export function TextArea({
  label,
  hideLabel,
  value,
  onChange,
  rows = 4,
  placeholder,
}: TextAreaProps) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm">
      <FieldLabel text={label} hidden={hideLabel} />
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
  const frame = useContext(PanelFrameContext);
  const headingId = useId();
  const bodyId = useId();
  const collapsed = Boolean(frame?.collapsible && frame.collapsed);

  return (
    <section
      aria-labelledby={headingId}
      className={panelClass('flex min-w-0 flex-col gap-3 p-4')}
    >
      <header className="flex min-h-8 items-center justify-between gap-2">
        <h2 id={headingId} className="panel-title min-w-0 [overflow-wrap:anywhere]">
          {frame?.collapsible ? (
            <button
              type="button"
              className="panel-toggle"
              aria-expanded={!collapsed}
              aria-controls={bodyId}
              onClick={frame.toggle}
            >
              <ChevronDown
                size={16}
                aria-hidden="true"
                className={collapsed ? '-rotate-90' : ''}
              />
              {title}
            </button>
          ) : (
            title
          )}
        </h2>
        {(action || frame?.layoutMenu) && (
          <div className="flex shrink-0 items-center gap-1">
            {action}
            {frame?.layoutMenu}
          </div>
        )}
      </header>
      {!collapsed && (
        <div id={bodyId} className="flex min-w-0 flex-col gap-3">
          {children}
        </div>
      )}
    </section>
  );
}
