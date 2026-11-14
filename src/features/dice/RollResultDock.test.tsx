import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RollResultDock } from './RollResultDock';
import { useRollStore } from './rollStore';
vi.mock('@/i18n/useT', () => ({
  useT: () => ({ locale: 'en', t: (key: string) => key }),
}));
function dock(path = '/character/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RollResultDock />
    </MemoryRouter>,
  );
}
describe('result dock', () => {
  beforeEach(() => {
    useRollStore.setState({ log: [], dockOpen: false, error: null });
  });
  it('is hidden without a result and on both dice page locales', () => {
    const view = dock();
    expect(view.container).toBeEmptyDOMElement();
    view.unmount();
    useRollStore.getState().roll('1d6');
    for (const path of ['/dice/', '/pl/dice/']) {
      const result = dock(path);
      expect(result.container).toBeEmptyDOMElement();
      result.unmount();
    }
  });
  it('starts compact, expands, preserves the mode on reroll and closes', () => {
    useRollStore.getState().roll('1d20+5', 'advantage', 'Attack');
    dock();
    expect(screen.queryByText('dice.copyResult')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'dice.reroll' }));
    expect(useRollStore.getState().log[0]?.outcome.mode).toBe('advantage');
    fireEvent.click(screen.getByRole('button', { name: 'dice.expandResult' }));
    expect(screen.getByRole('button', { name: 'dice.copyResult' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'dice.modeDisadvantage' }));
    expect(useRollStore.getState().log[0]?.outcome.mode).toBe('disadvantage');
    fireEvent.click(screen.getByRole('button', { name: 'dice.modeAdvantage' }));
    expect(useRollStore.getState().log[0]?.outcome.mode).toBe('advantage');
    fireEvent.click(screen.getByRole('button', { name: 'dice.collapseResult' }));
    fireEvent.click(screen.getByRole('button', { name: 'dice.closeDiceResult' }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });
  it('expands a non-d20 result without offering d20 modes', () => {
    useRollStore.getState().roll('1d6');
    dock();
    fireEvent.click(screen.getByRole('button', { name: 'dice.expandResult' }));
    expect(
      screen.queryByRole('button', { name: 'dice.modeAdvantage' }),
    ).not.toBeInTheDocument();
  });
});
