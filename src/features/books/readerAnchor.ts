export interface ReaderAnchor {
  page: number | null;
  name: string | null;
}

export function bookAnchorHash(
  page: number | undefined,
  name: string | undefined,
): string {
  const params = new URLSearchParams();
  if (page != null && Number.isFinite(page)) params.set('page', String(page));
  if (name?.trim()) params.set('name', name);
  const value = params.toString();
  return value ? `#${value}` : '';
}

export function readBookAnchor(hash: string, search: string): ReaderAnchor {
  const hashValue = hash.startsWith('#') ? hash.slice(1) : hash;
  const hashParams = new URLSearchParams(hashValue);
  const params =
    hashParams.has('page') || hashParams.has('name')
      ? hashParams
      : new URLSearchParams(search);
  const rawPage = params.get('page');
  const page = rawPage == null ? null : Number(rawPage);
  return {
    page: page != null && Number.isFinite(page) ? page : null,
    name: params.get('name'),
  };
}
