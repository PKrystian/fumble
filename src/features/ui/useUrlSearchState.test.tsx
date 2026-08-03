import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { useUrlSearchState } from './useUrlSearchState';

function Harness() {
  const { params, update } = useUrlSearchState();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <>
      <output>{location.search}</output>
      <span>{params.getAll('source').join('|')}</span>
      <button
        type="button"
        onClick={() => update({ source: ['XPHB', 'PHB'], q: 'fire' })}
      >
        Set
      </button>
      <button type="button" onClick={() => update({ q: 'fireball' }, true)}>
        Replace
      </button>
      <button type="button" onClick={() => update({ source: ['', 'PHB'], q: '' })}>
        Skip empty values
      </button>
      <button type="button" onClick={() => update({ source: null })}>
        Clear
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
    </>
  );
}

describe('useUrlSearchState', () => {
  it('sorts, repeats, clears and restores query parameters through history', async () => {
    render(
      <MemoryRouter initialEntries={['/compendium/spells']}>
        <Harness />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Set' }));
    expect(screen.getByRole('status')).toHaveTextContent(
      '?q=fire&source=XPHB&source=PHB',
    );
    expect(screen.getByText('XPHB|PHB')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
    expect(screen.getByRole('status')).toHaveTextContent('q=fireball');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByRole('status')).toHaveTextContent('?q=fireball');
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        '?q=fireball&source=XPHB&source=PHB',
      ),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Skip empty values' }));
    expect(screen.getByRole('status')).toHaveTextContent('?source=PHB');
  });
});
