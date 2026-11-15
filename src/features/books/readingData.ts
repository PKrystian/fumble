export const BOOK_READING_KEY = 'fumble-book-reading';
export const BOOK_READING_VERSION = 1;
export const MAX_READING_POSITIONS = 250;

export interface ReadingPosition {
  chapter: number;
  section?: string;
  updatedAt: number;
}

export interface BookReadingData {
  positions: Record<string, ReadingPosition>;
  wholeBook: boolean;
  wide: boolean;
}

export const emptyBookReading: BookReadingData = {
  positions: {},
  wholeBook: false,
  wide: false,
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isBookSection(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value);
}

function isReadingPosition(value: unknown): value is ReadingPosition {
  return (
    isObject(value) &&
    typeof value.chapter === 'number' &&
    Number.isSafeInteger(value.chapter) &&
    value.chapter >= 0 &&
    value.chapter < 10000 &&
    typeof value.updatedAt === 'number' &&
    Number.isSafeInteger(value.updatedAt) &&
    value.updatedAt >= 0 &&
    (value.section === undefined || isBookSection(value.section)) &&
    Object.keys(value).every((key) => ['chapter', 'section', 'updatedAt'].includes(key))
  );
}

export function readBookReading(value: unknown): BookReadingData | undefined {
  if (!isObject(value) || value.version !== BOOK_READING_VERSION) return undefined;
  const data = value.state;
  if (
    !isObject(data) ||
    typeof data.wholeBook !== 'boolean' ||
    typeof data.wide !== 'boolean' ||
    !isObject(data.positions) ||
    !Object.keys(data).every((key) => ['positions', 'wholeBook', 'wide'].includes(key))
  )
    return undefined;
  const positions = Object.entries(data.positions);
  if (
    positions.length > MAX_READING_POSITIONS ||
    !positions.every(
      ([id, position]) =>
        /^[a-z0-9][a-z0-9-]{0,79}$/.test(id) && isReadingPosition(position),
    )
  )
    return undefined;
  return data as unknown as BookReadingData;
}

export function parseBookReading(raw: string): BookReadingData | undefined {
  try {
    return readBookReading(JSON.parse(raw));
  } catch {
    return undefined;
  }
}

export function serializeBookReading(data: BookReadingData): string {
  return JSON.stringify({ version: BOOK_READING_VERSION, state: data });
}
