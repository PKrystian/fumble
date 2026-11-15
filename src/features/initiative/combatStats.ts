export function statText(value: number | null) {
  return value === null ? '' : String(value);
}

export function parseCombatStat(value: string, allowNegative = false) {
  const text = value.trim();
  if (!text) return null;
  if (!/^[+-]?\d+$/.test(text)) return undefined;
  const number = Number(text);
  return Number.isSafeInteger(number) && (allowNegative || number >= 0)
    ? number
    : undefined;
}
