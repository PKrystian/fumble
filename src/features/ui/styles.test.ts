import { describe, expect, it } from 'vitest';
import { buttonClass, classes, inputClass, panelClass, toggleChipClass } from './styles';

describe('UI style helpers', () => {
  it('combines only truthy class values', () => {
    expect(classes('a', false, null, undefined, 'b')).toBe('a b');
    expect(inputClass('custom')).toContain('custom');
    expect(panelClass('custom')).toContain('custom');
  });

  it('covers button variants and icon sizes', () => {
    expect(buttonClass()).toContain('bg-ink-900');
    expect(buttonClass({ variant: 'primary', size: 'sm' })).toContain('min-h-8');
    expect(buttonClass({ variant: 'danger', size: 'md' })).toContain('bg-red-950');
    expect(buttonClass({ variant: 'ghost', size: 'lg' })).toContain('bg-transparent');
    expect(buttonClass({ iconOnly: true, size: 'sm' })).toContain('h-8 w-8');
    expect(buttonClass({ iconOnly: true, size: 'md' })).toContain('h-10 w-10');
    expect(buttonClass({ iconOnly: true, size: 'lg' })).toContain('h-12 w-12');
  });

  it('styles active and inactive chips', () => {
    expect(toggleChipClass(true)).toContain('bg-arcane-700');
    expect(toggleChipClass(false, 'extra')).toContain('extra');
    expect(toggleChipClass(false)).toContain('bg-ink-900');
  });
});
