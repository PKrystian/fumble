import packageInfo from '../../../package.json';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LegalFooter } from './LegalFooter';

describe('LegalFooter', () => {
  it('links the version to the changelog and offers issue reporting', () => {
    render(
      <MemoryRouter>
        <LegalFooter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('link', {
        name: `Version ${packageInfo.version} changelog`,
      }),
    ).toHaveAttribute(
      'href',
      `/changelog/#version-${packageInfo.version.replaceAll('.', '-')}`,
    );
    expect(screen.getByRole('link', { name: 'Site map' })).toHaveAttribute(
      'href',
      '/site-map/',
    );
    expect(screen.getAllByRole('navigation')).toHaveLength(2);
    expect(screen.getByRole('link', { name: 'Report issue' })).toHaveAttribute(
      'href',
      'https://github.com/PKrystian/Fumble/issues/new/choose',
    );
  });

  it('translates the new links in Polish', () => {
    render(
      <MemoryRouter initialEntries={['/pl/']}>
        <LegalFooter />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('link', { name: `Lista zmian wersji ${packageInfo.version}` }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Zgłoś problem' })).toBeInTheDocument();
  });
});
