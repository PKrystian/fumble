import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { DetailContents } from './DetailContents';

describe('DetailContents', () => {
  it('omits short outlines and updates when article sections change', async () => {
    const article = (count: number) => (
      <MemoryRouter>
        <DetailContents>
          {Array.from({ length: count }, (_, index) => (
            <h2 key={index} {...(index === 0 ? { id: 'existing' } : {})}>
              Section {index}
            </h2>
          ))}
        </DetailContents>
      </MemoryRouter>
    );
    const view = render(article(2));
    expect(screen.queryByText('On this page')).not.toBeInTheDocument();
    view.rerender(article(6));
    await waitFor(() => expect(screen.getByText('On this page')).toBeInTheDocument());
    fireEvent.click(screen.getByText('On this page'));
    const heading = screen.getByRole('heading', { name: 'Section 0' });
    const scroll = vi.spyOn(heading, 'scrollIntoView');
    fireEvent.click(screen.getByRole('link', { name: 'Section 0' }));
    expect(heading).toHaveFocus();
    expect(scroll).toHaveBeenCalledWith({ block: 'start' });
    expect(screen.getAllByRole('heading').every((heading) => heading.id)).toBe(true);
    view.rerender(article(7));
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Section 6' })).toBeInTheDocument(),
    );
  });
});
