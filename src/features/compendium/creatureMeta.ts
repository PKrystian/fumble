type Gender = 'f' | 'n';

const TYPE_GENDER: Record<string, Gender> = {
  Aberracja: 'f',
  Bestia: 'f',
  Maź: 'f',
  Roślina: 'f',
  Monstrum: 'n',
};

const SIZE_FORMS: Record<string, Record<Gender, string>> = {
  Malutki: { f: 'Malutka', n: 'Malutkie' },
  Mały: { f: 'Mała', n: 'Małe' },
  Średni: { f: 'Średnia', n: 'Średnie' },
  Duży: { f: 'Duża', n: 'Duże' },
  Wielki: { f: 'Wielka', n: 'Wielkie' },
  Gigantyczny: { f: 'Gigantyczna', n: 'Gigantyczne' },
  Zmienny: { f: 'Zmienna', n: 'Zmienne' },
};

export function agreeSize(size: string, creatureType: string | undefined): string {
  if (!creatureType) return size;
  const base = creatureType.replace(/\s*\(.*\)$/, '').trim();
  const gender = TYPE_GENDER[base];
  if (!gender) return size;
  return size
    .split(' ')
    .map((word) => SIZE_FORMS[word]?.[gender] ?? word)
    .join(' ');
}
