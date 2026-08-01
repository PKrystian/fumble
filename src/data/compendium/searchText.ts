export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replaceAll('ł', 'l');
}

export function withEnglishName<T extends { name: string; englishName?: string }>(
  item: T,
  englishName: string,
): T {
  if (item.name === englishName || item.englishName) return item;
  return { ...item, englishName };
}
