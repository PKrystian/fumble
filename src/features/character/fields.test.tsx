import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { NumberField, Panel, TextArea, TextField } from './fields';
import { PanelFrameContext, parseWholeNumber } from './panelFrame';

function wrap(children: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/character/x']}>{children}</MemoryRouter>,
  );
}

describe('character fields', () => {
  it('parses whole numbers within a range', () => {
    expect(parseWholeNumber(' 12 ', 0, 20)).toBe(12);
    expect(parseWholeNumber('-3', -5, 5)).toBe(-3);
    expect(parseWholeNumber('1.5', 0, 5)).toBeNull();
    expect(parseWholeNumber('', 0, 5)).toBeNull();
    expect(parseWholeNumber('21', 0, 20)).toBeNull();
    expect(parseWholeNumber('99999999999999999999', 0, Infinity)).toBeNull();
  });

  it('keeps an invalid draft, explains it and restores the saved value on blur', () => {
    const onChange = vi.fn();
    wrap(
      <NumberField
        label="Level"
        value={3}
        min={1}
        max={20}
        onChange={onChange}
        hint="Help"
      />,
    );
    const input = screen.getByRole('textbox', { name: 'Level' });
    expect(input).toHaveAccessibleDescription('Help');
    fireEvent.change(input, { target: { value: '' } });
    expect(input).toHaveValue('');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a whole number from 1 to 20. Help');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '25' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '3' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '12' } });
    expect(onChange).toHaveBeenCalledWith(12);
    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('3');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('renders hidden labels and empty values for non-finite numbers', () => {
    wrap(
      <>
        <NumberField
          label="Hidden"
          hideLabel
          value={NaN}
          min={0}
          max={1}
          onChange={vi.fn()}
        />
        <TextField label="Name" hideLabel value="Mira" onChange={vi.fn()} />
        <TextArea label="Notes" value="" onChange={vi.fn()} placeholder="Write" />
      </>,
    );
    expect(screen.getByRole('textbox', { name: 'Hidden' })).toHaveValue('');
    expect(screen.getByText('Name')).toHaveClass('sr-only');
    expect(screen.getByText('Notes')).toHaveClass('field-label');
  });

  it('updates text fields', () => {
    const onText = vi.fn();
    const onArea = vi.fn();
    wrap(
      <>
        <TextField label="Name" value="" onChange={onText} />
        <TextArea label="Notes" value="" onChange={onArea} />
      </>,
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Mira' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Notes' }), {
      target: { value: 'Text' },
    });
    expect(onText).toHaveBeenCalledWith('Mira');
    expect(onArea).toHaveBeenCalledWith('Text');
  });

  it('renders panels with optional collapse and layout controls', () => {
    const toggle = vi.fn();
    const { rerender } = wrap(
      <Panel title="Plain" action={<button type="button">Act</button>}>
        <p>Body</p>
      </Panel>,
    );
    expect(screen.getByRole('region', { name: 'Plain' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Act' })).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <PanelFrameContext.Provider
          value={{
            collapsible: true,
            collapsed: true,
            toggle,
            layoutMenu: <span>Menu</span>,
          }}
        >
          <Panel title="Folded">
            <p>Hidden body</p>
          </Panel>
        </PanelFrameContext.Provider>
      </MemoryRouter>,
    );
    const button = screen.getByRole('button', { name: 'Folded' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Hidden body')).not.toBeInTheDocument();
    expect(screen.getByText('Menu')).toBeInTheDocument();
    fireEvent.click(button);
    expect(toggle).toHaveBeenCalled();

    rerender(
      <MemoryRouter>
        <PanelFrameContext.Provider
          value={{ collapsible: true, collapsed: false, toggle, layoutMenu: null }}
        >
          <Panel title="Open">
            <p>Visible body</p>
          </Panel>
        </PanelFrameContext.Provider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'Open' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByText('Visible body')).toBeInTheDocument();
  });
});
