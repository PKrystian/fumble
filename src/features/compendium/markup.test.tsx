import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { markupLabel, parseMarkup } from './markup';

function renderMarkup(text: string, locale: 'en' | 'pl' = 'en') {
  return render(<MemoryRouter>{parseMarkup(text, locale)}</MemoryRouter>);
}

describe('parseMarkup', () => {
  it('passes through plain text', () => {
    const { container } = renderMarkup('Just plain text.');
    expect(container).toHaveTextContent('Just plain text.');
    expect(
      render(<MemoryRouter>{parseMarkup('Default locale')}</MemoryRouter>).container,
    ).toHaveTextContent('Default locale');
  });

  it('renders damage tags as their dice expression', () => {
    const { container } = renderMarkup('takes {@damage 8d6} fire');
    expect(container).toHaveTextContent('takes 8d6 fire');
  });

  it('localizes variables in summon formulas', () => {
    expect(
      renderMarkup('{@damage 1d8 + summonSpellLevel}', 'pl').container,
    ).toHaveTextContent('1d8 + poziom czaru');
    expect(renderMarkup('{@damage 1d8 + PB}', 'pl').container).toHaveTextContent(
      '1d8 + Bonus Biegłości',
    );
  });

  it('formats dc and hit helper tags', () => {
    expect(renderMarkup('{@dc 15}').container).toHaveTextContent('DC 15');
    expect(renderMarkup('{@hit 5}').container).toHaveTextContent('+5');
  });

  it('links condition references into the compendium', () => {
    renderMarkup('You have the {@condition Prone} condition');
    const link = screen.getByRole('link', { name: 'Prone' });
    expect(link).toHaveAttribute('href', '/compendium/conditions/prone/');
  });

  it('does not link reference tags without a shipped target', () => {
    const { container } = renderMarkup('{@adventure Curse of Strahd|CoS}');
    expect(container).toHaveTextContent('Curse of Strahd');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('links skill references now that skills ship', () => {
    renderMarkup('make a {@skill Stealth} check');
    expect(screen.getByRole('link', { name: 'Stealth' })).toHaveAttribute(
      'href',
      '/compendium/skills/stealth/',
    );
  });

  it('links variant-rule references to the rules glossary', () => {
    renderMarkup('you gain {@variantrule Advantage|XPHB}');
    expect(screen.getByRole('link', { name: 'Advantage' })).toHaveAttribute(
      'href',
      '/compendium/rules/advantage/',
    );
  });

  it('shows the label of a filter tag, not its parameters', () => {
    const { container } = renderMarkup(
      'gain a {@filter Fighting Style|feats|category=FS}',
    );
    expect(container).toHaveTextContent('gain a Fighting Style');
    expect(container).not.toHaveTextContent('category=FS');
  });

  it('links feat references now that feats ship', () => {
    renderMarkup('take the {@feat Grappler|XPHB} feat');
    expect(screen.getByRole('link', { name: 'Grappler' })).toHaveAttribute(
      'href',
      '/compendium/feats/grappler/',
    );
  });

  it('renders recharge tags as a recharge range', () => {
    expect(renderMarkup('Tongue {@recharge}').container).toHaveTextContent(
      'Tongue (Recharge 6)',
    );
    expect(renderMarkup('Fire Breath {@recharge 5}').container).toHaveTextContent(
      'Fire Breath (Recharge 5-6)',
    );
  });

  it('renders 2024 action save labels', () => {
    expect(renderMarkup('{@actSave dex} DC 15').container).toHaveTextContent(
      'Dexterity Saving Throw: DC 15',
    );
    expect(renderMarkup('{@actSaveFail} half damage').container).toHaveTextContent(
      'Failure: half damage',
    );
  });

  it('handles nested tags inside formatting tags', () => {
    const { container } = renderMarkup('{@i deals {@damage 1d6} cold}');
    const emphasis = container.querySelector('em');
    expect(emphasis).not.toBeNull();
    expect(emphasis).toHaveTextContent('deals 1d6 cold');
  });

  it('renders bold, italic and note formatting aliases', () => {
    const { container } = renderMarkup(
      '{@b Bold} {@bold Strong} {@italic Italic} {@note Note}',
    );
    expect(container.querySelectorAll('strong')).toHaveLength(2);
    expect(container.querySelectorAll('em')).toHaveLength(2);
  });

  it('renders attack helpers and localized attack types', () => {
    expect(renderMarkup('{@hit -2}').container).toHaveTextContent('-2');
    expect(renderMarkup('{@atk mw}').container).toHaveTextContent('Melee Weapon Attack:');
    expect(renderMarkup('{@atkr custom}').container).toHaveTextContent('custom');
    expect(renderMarkup('{@h}').container).toHaveTextContent('Hit:');
    expect(renderMarkup('{@dcYourSpellSave}').container).toHaveTextContent(
      'your spell save DC',
    );
    expect(renderMarkup('{@chance 25}').container).toHaveTextContent('25%');
  });

  it('renders every action label in both locales', () => {
    const tags = [
      '{@actSaveSuccess}',
      '{@actSaveSuccessOrFail}',
      '{@actSaveFailBy 5}',
      '{@actTrigger}',
      '{@actResponse}',
    ].join(' ');
    expect(renderMarkup(tags).container).toHaveTextContent(
      'Success: Failure or Success: Failure by 5 or More: Trigger: Response:',
    );
    expect(
      renderMarkup('{@actSave str} {@actSaveFailBy 3}', 'pl').container,
    ).toHaveTextContent('Rzut Obronny Siły: Niepowodzenie o 3 lub Więcej:');
    expect(renderMarkup('{@actSave luck}').container).toHaveTextContent(
      'luck Saving Throw:',
    );
    expect(markupLabel('pl', 'statBlock')).toBe('(blok statystyk)');
  });

  it('renders simple helper tags and non-rollable formulas', () => {
    const { container } = renderMarkup(
      '{@footnote Foot} {@quickref Quick} {@hitYourSpellAttack Spell} {@dice variable}',
    );
    expect(container).toHaveTextContent('Foot Quick Spell variable');
    expect(container.querySelector('.text-ember-400')).not.toBeNull();
    expect(renderMarkup('{@quickref 123}').container).toHaveTextContent('123');
  });

  it('localizes quick-reference labels', () => {
    expect(
      renderMarkup('{@quickref Cover||3||half cover}', 'pl').container,
    ).toHaveTextContent('Połowiczna osłona');
    expect(
      renderMarkup('{@quickref difficult terrain||trudny teren}', 'pl').container,
    ).toHaveTextContent('trudny teren');
  });

  it('uses translated display text and handles incomplete markup', () => {
    expect(
      renderMarkup('{@spell Fireball|XPHB|Kula Ognia}', 'pl').container,
    ).toHaveTextContent('Kula Ognia');
    expect(renderMarkup('before {@b unfinished').container).toHaveTextContent(
      'before unfinished',
    );
  });
});
