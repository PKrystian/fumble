import type { Locale } from '@/i18n/locales';

const FORMULA_TERMS: Record<Locale, Record<string, string>> = {
  en: {
    summonSpellLevel: "the spell's level",
    PB: 'Proficiency Bonus',
  },
  pl: {
    summonSpellLevel: 'poziom czaru',
    PB: 'Bonus Biegłości',
  },
};

export function localizeFormula(text: string, locale: Locale): string {
  let result = text;
  for (const [term, replacement] of Object.entries(FORMULA_TERMS[locale])) {
    result = result.replace(new RegExp(`\\b${term}\\b`, 'g'), replacement);
  }
  if (locale !== 'pl') return result;
  return result
    .replace(
      /the steed has a number of Hit Dice \[k10s?\] equal to the spell's level/gi,
      'wierzchowiec ma liczbę Kości Wytrzymałości [k10] równą poziomowi czaru',
    )
    .replace(
      /the steed has a number of Hit Dice \[d10s?\] equal to the spell's level/gi,
      'wierzchowiec ma liczbę Kości Wytrzymałości [k10] równą poziomowi czaru',
    )
    .replace(/per spell level/gi, 'za każdy poziom czaru')
    .replace(
      /for each spell level above (\d+)(?:st|nd|rd|th)?/gi,
      'za każdy poziom czaru powyżej $1',
    )
    .replace(/\bHit Dice\b/g, 'Kości Wytrzymałości');
}
