import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from './primitives';
import type { ButtonVariant, ControlSize } from './styles';

export interface ActionMenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  danger?: boolean;
  onSelect: () => void;
}

interface ActionMenuProps {
  label: string;
  items: ActionMenuItem[];
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ControlSize;
  iconOnly?: boolean;
  align?: 'start' | 'end';
  className?: string;
  buttonClassName?: string;
}

export function ActionMenu({
  label,
  items,
  children,
  variant = 'secondary',
  size = 'md',
  iconOnly = false,
  align = 'end',
  className,
  buttonClassName,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const enabled = items.map((item, index) => (item.disabled ? -1 : index));
  const focusable = enabled.filter((index) => index >= 0);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onPointer);
    itemRefs.current[focusable[0] ?? -1]?.focus();
    return () => window.removeEventListener('mousedown', onPointer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (focusable.length === 0) return;
    const current = focusable.indexOf(
      itemRefs.current.findIndex((element) => element === document.activeElement),
    );
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? focusable.length - 1
          : (current + (event.key === 'ArrowDown' ? 1 : -1) + focusable.length) %
            focusable.length;
    itemRefs.current[focusable[next]!]?.focus();
  };

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`.trim()}>
      <Button
        ref={buttonRef}
        variant={variant}
        size={size}
        iconOnly={iconOnly}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        className={buttonClassName}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children ?? (
          <>
            {label}
            <ChevronDown size={14} aria-hidden="true" />
          </>
        )}
      </Button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={`action-menu ${align === 'end' ? 'right-0' : 'left-0'}`}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              data-danger={item.danger ? 'true' : undefined}
              className="action-menu-item"
              onClick={() => {
                close();
                item.onSelect();
              }}
            >
              {item.icon}
              <span className="min-w-0 [overflow-wrap:anywhere]">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
