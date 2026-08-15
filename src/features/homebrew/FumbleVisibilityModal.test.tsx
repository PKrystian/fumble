import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FumbleHomebrewItem } from './fumbleHomebrew';
import { FumbleVisibilityModal } from './FumbleVisibilityModal';
import { useFumbleHomebrewStore } from './fumbleHomebrewStore';

const items: FumbleHomebrewItem[] = [
  {
    id: 'feat',
    name: 'Feat',
    source: 'Fumble',
    srd: false,
    category: 'feats',
    subtitle: '',
    campaigns: ['grobowiec-zaglady'],
  },
  {
    id: 'rule',
    name: 'Rule',
    source: 'Fumble',
    srd: false,
    category: 'rules',
    subtitle: '',
    campaigns: ['krysztalowa-sfera'],
  },
];

describe('FumbleVisibilityModal', () => {
  beforeEach(() => {
    useFumbleHomebrewStore.setState({
      compendiumCampaigns: null,
      compendiumCategories: null,
    });
  });

  it('toggles, clears, restores and saves visibility filters', () => {
    const onClose = vi.fn();
    const view = render(
      <MemoryRouter>
        <FumbleVisibilityModal items={items} onClose={onClose} />
      </MemoryRouter>,
    );

    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(checkboxes[0]!);
    fireEvent.click(checkboxes[5]!);
    fireEvent.click(checkboxes[5]!);
    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Clear campaigns' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear content types' }));
    expect(screen.getByText('0 Fumble entries selected')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save visibility' }));
    expect(useFumbleHomebrewStore.getState()).toMatchObject({
      compendiumCampaigns: [],
      compendiumCategories: [],
    });
    expect(onClose).toHaveBeenCalledTimes(2);
    view.unmount();

    useFumbleHomebrewStore.setState({
      compendiumCampaigns: ['grobowiec-zaglady'],
      compendiumCategories: ['feats'],
    });
    const configured = render(
      <MemoryRouter>
        <FumbleVisibilityModal items={items} onClose={onClose} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Select all campaigns' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select all content types' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save visibility' }));
    expect(useFumbleHomebrewStore.getState()).toMatchObject({
      compendiumCampaigns: null,
      compendiumCategories: null,
    });
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(4);
    configured.unmount();
  });
});
