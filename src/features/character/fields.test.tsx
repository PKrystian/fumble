import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NumberField, Panel, TextArea, TextField } from './fields';

describe('character fields', () => {
  it('edits text fields with and without labels', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TextField label="Name" value="Old" onChange={onChange} placeholder="Character" />,
    );
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New' } });
    expect(onChange).toHaveBeenCalledWith('New');

    rerender(<TextField value="" onChange={onChange} />);
    expect(screen.queryByText('Name')).toBeNull();
  });

  it('normalizes invalid numbers and renders optional bounds', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <NumberField
        label="Level"
        value={Number.NaN}
        min={1}
        max={20}
        className="compact"
        onChange={onChange}
      />,
    );
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(null);
    expect(input).toHaveAttribute('min', '1');
    rerender(<NumberField value={1} onChange={onChange} />);
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(0);
    fireEvent.change(input, { target: { value: '5' } });
    expect(onChange).toHaveBeenLastCalledWith(5);

    rerender(<NumberField value={2} onChange={onChange} />);
    expect(screen.queryByText('Level')).toBeNull();
  });

  it('edits text areas and uses the default row count', () => {
    const onChange = vi.fn();
    render(<TextArea value="Old" onChange={onChange} />);
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '4');
    fireEvent.change(textarea, { target: { value: 'New' } });
    expect(onChange).toHaveBeenCalledWith('New');
  });

  it('renders a panel action and body', () => {
    render(
      <Panel title="Stats" action={<button type="button">Edit</button>}>
        Body
      </Panel>,
    );
    expect(screen.getByRole('heading', { name: 'Stats' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });
});
