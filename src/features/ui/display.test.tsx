import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Logo } from './Logo';
import { OriginalName } from './OriginalName';

describe('small display components', () => {
  it('renders the logo with a custom class', () => {
    const { container } = render(<Logo className="brand" />);
    expect(container.querySelector('svg')).toHaveClass('brand');
  });

  it('renders and styles an original name', () => {
    render(<OriginalName name="Fireball" className="extra" />);
    expect(screen.getByText('Fireball')).toHaveAttribute('title', 'Fireball');
    expect(screen.getByText('Fireball')).toHaveClass('extra');
  });

  it('omits an absent original name', () => {
    const { container } = render(<OriginalName />);
    expect(container).toBeEmptyDOMElement();
  });
});
