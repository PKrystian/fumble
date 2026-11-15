import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { WikiCatalog } from './WikiCatalog';
import type { WikiCampaign } from './types';

const campaign: WikiCampaign = {
  id: 'test',
  title: 'Test',
  pages: Array.from({ length: 101 }, (_, index) => ({
    campaignId: 'test',
    slug: `page-${index}`,
    title: `Page ${String(index).padStart(3, '0')}`,
    category: index % 2 ? 'People' : '',
    html: '<p>Świat żółwi</p>',
  })),
};
function Location() {
  return <output data-testid="url">{useLocation().search}</output>;
}
function show(search = '') {
  return render(
    <MemoryRouter initialEntries={[`/${search}`]}>
      <WikiCatalog campaign={campaign} selected="page-0" />
      <Location />
    </MemoryRouter>,
  );
}

describe('campaign page catalog', () => {
  it('paginates, selects categories, preserves queries, and provides a clear action', () => {
    show();
    expect(screen.getAllByRole('link')).toHaveLength(50);
    expect(screen.getByRole('link', { name: 'Page 000' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByTestId('url')).toHaveTextContent('page=2');
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: '  SWIAT ZOLWI  ' },
    });
    expect(screen.getAllByRole('link')).toHaveLength(50);
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: JSON.stringify('People') },
    });
    expect(screen.getByTestId('url')).not.toHaveTextContent('page=');
    expect(screen.getByRole('link', { name: 'Page 001' })).toHaveAttribute(
      'href',
      expect.stringContaining('category=People'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset category' }));
    expect(screen.getByRole('searchbox')).toHaveValue('  SWIAT ZOLWI  ');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(screen.getByRole('searchbox')).toHaveValue('');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '""' } });
    expect(screen.getByTestId('url')).toHaveTextContent('uncategorized=1');
    expect(screen.queryByRole('link', { name: 'Page 001' })).toBeNull();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
  });
  it('retains unavailable filters and bounds invalid or excessive catalog pages', () => {
    const view = show('?category=Missing&page=900');
    expect(screen.getByRole('option', { name: 'Missing' })).toBeInTheDocument();
    expect(screen.getByText(/No pages match/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset category' }));
    expect(screen.getAllByRole('link')).toHaveLength(50);
    view.unmount();
    const second = show('?page=900');
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    second.unmount();
    show('?page=-2&q=missing');
    expect(screen.getByText('0 results, showing 0-0')).toHaveTextContent('0 results');
  });
});
