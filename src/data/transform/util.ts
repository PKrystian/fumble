export const SPELL_SCHOOLS: Record<string, string> = {
  A: 'Abjuration',
  C: 'Conjuration',
  D: 'Divination',
  E: 'Enchantment',
  V: 'Evocation',
  I: 'Illusion',
  N: 'Necromancy',
  T: 'Transmutation',
};

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function stripMarkup(value: string): string {
  return value.replace(/\{@\w+\s*([^|}]*)[^}]*\}/g, (_, text: string) => text.trim());
}

export function proficiencyBonus(level: number): string {
  return `+${Math.ceil(level / 4) + 1}`;
}
