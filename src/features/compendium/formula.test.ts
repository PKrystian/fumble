import { describe, expect, it } from 'vitest';
import { localizeFormula } from './formula';

describe('localizeFormula', () => {
  it('translates summoned creature hit point formulas', () => {
    expect(
      localizeFormula(
        "5 + 10 per spell level (the steed has a number of Hit Dice [k10s] equal to the spell's level)",
        'pl',
      ),
    ).toBe(
      '5 + 10 za każdy poziom czaru (wierzchowiec ma liczbę Kości Wytrzymałości [k10] równą poziomowi czaru)',
    );
  });

  it('translates generic spell scaling formulas', () => {
    expect(localizeFormula('40 + 10 for each spell level above 4th', 'pl')).toBe(
      '40 + 10 za każdy poziom czaru powyżej 4',
    );
  });
});
