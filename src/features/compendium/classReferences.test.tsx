import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  ClassReferenceList,
  ClassReferenceText,
  SubclassReferenceList,
} from './classReferences';

function show(node: React.ReactNode) {
  return render(
    <MemoryRouter initialEntries={['/pl/compendium/spells/alarm']}>{node}</MemoryRouter>,
  );
}

describe('class references', () => {
  it('links localized class names to stable class routes', () => {
    show(
      <ClassReferenceList
        values={['Rzemieślnik', 'Czarodziej']}
        referenceValues={['Artificer', 'Wizard']}
      />,
    );

    expect(screen.getByRole('link', { name: 'Rzemieślnik' })).toHaveAttribute(
      'href',
      '/pl/compendium/classes/artificer/',
    );
    expect(screen.getByRole('link', { name: 'Czarodziej' })).toHaveAttribute(
      'href',
      '/pl/compendium/classes/wizard/',
    );
  });

  it('links localized subclass names using their English route identity', () => {
    show(
      <SubclassReferenceList
        values={['Czarodziej: Mechaniczna Dusza', 'Bard: Szkoła Wiedzy']}
        referenceValues={['Sorcerer: Clockwork Soul', 'Bard: College of Lore']}
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Czarodziej: Mechaniczna Dusza' }),
    ).toHaveAttribute('href', '/pl/compendium/classes/sorcerer/clockwork-soul/');
    expect(screen.getByRole('link', { name: 'Bard: Szkoła Wiedzy' })).toHaveAttribute(
      'href',
      '/pl/compendium/classes/bard/college-of-lore/',
    );
  });

  it('links class names inside requirement text', () => {
    show(
      <ClassReferenceText text="Wymaga zestrojenia przez czarodzieja, łowcę lub duchownego" />,
    );

    expect(screen.getByRole('link', { name: 'czarodzieja' })).toHaveAttribute(
      'href',
      '/pl/compendium/classes/wizard/',
    );
    expect(screen.getByRole('link', { name: 'łowcę' })).toHaveAttribute(
      'href',
      '/pl/compendium/classes/ranger/',
    );
    expect(screen.getByRole('link', { name: 'duchownego' })).toHaveAttribute(
      'href',
      '/pl/compendium/classes/cleric/',
    );
  });

  it('keeps unknown classes as text and supports parent-class references', () => {
    const view = show(
      <>
        <ClassReferenceList values={['Unknown Class', 'Wizard']} />
        <SubclassReferenceList values={['Wizard', 'Unknown Class: Mystery']} />
        <ClassReferenceText text="{@class Wizard|XPHB|Wizard}" />
      </>,
    );

    expect(view.container).toHaveTextContent('Unknown Class');
    expect(screen.getAllByRole('link', { name: 'Wizard' })).toHaveLength(2);
    expect(screen.getAllByRole('link', { name: 'Wizard' })[1]).toHaveAttribute(
      'href',
      '/pl/compendium/classes/wizard/',
    );
    expect(view.container).toHaveTextContent('Unknown Class: Mystery');
  });
});
