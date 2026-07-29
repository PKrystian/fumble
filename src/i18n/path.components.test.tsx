import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { Link, Navigate, NavLink, useLocale, useNavigate } from './path';

function LocationProbe() {
  const location = useLocation();
  const locale = useLocale();
  return <output>{`${locale}:${location.pathname}${location.search}`}</output>;
}

function NavigationButtons() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate('/target', { replace: true })}>
        Path
      </button>
      <button type="button" onClick={() => navigate({ pathname: '/object' })}>
        Object
      </button>
      <button type="button" onClick={() => navigate('relative')}>
        Relative
      </button>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
    </>
  );
}

describe('localized router components', () => {
  it('localizes absolute string and object links but keeps relative links', () => {
    render(
      <MemoryRouter initialEntries={['/pl/current/']}>
        <Link to="/absolute">Absolute</Link>
        <Link to={{ pathname: '/object', search: '?q=1' }}>Object</Link>
        <Link to="relative">Relative</Link>
        <Link to={{ pathname: 'child' }}>Relative object</Link>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Absolute' })).toHaveAttribute(
      'href',
      '/pl/absolute/',
    );
    expect(screen.getByRole('link', { name: 'Object' })).toHaveAttribute(
      'href',
      '/pl/object/?q=1',
    );
    expect(screen.getByRole('link', { name: 'Relative' })).toHaveAttribute(
      'href',
      '/relative',
    );
    expect(screen.getByRole('link', { name: 'Relative object' })).toHaveAttribute(
      'href',
      '/child',
    );
  });

  it('localizes nav links and exposes active state', () => {
    render(
      <MemoryRouter initialEntries={['/pl/current/']}>
        <NavLink to="/current">Current</NavLink>
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: 'Current' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('localizes declarative redirects', () => {
    render(
      <MemoryRouter initialEntries={['/pl/start']}>
        <Routes>
          <Route path="/pl/start" element={<Navigate to="/destination" replace />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText('pl:/pl/destination/')).toBeInTheDocument();
  });

  it('localizes imperative paths and supports history deltas', () => {
    render(
      <MemoryRouter initialEntries={['/pl/previous', '/pl/start']}>
        <NavigationButtons />
        <LocationProbe />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Path' }));
    expect(screen.getByText('pl:/pl/target/')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Object' }));
    expect(screen.getByText('pl:/pl/object/')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Relative' }));
    expect(screen.getByText('en:/relative')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('pl:/pl/object/')).toBeInTheDocument();
  });
});
