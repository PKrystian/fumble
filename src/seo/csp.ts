const CSP_META_PATTERN =
  /<meta\b[^>]*\bhttp-equiv=(['"])Content-Security-Policy\1[^>]*>/i;
const CONTENT_ATTRIBUTE_PATTERN = /\bcontent=(['"])([\s\S]*?)\1/i;

export function cspHasSourceOrigin(
  html: string,
  directive: string,
  expectedOrigin: string,
): boolean {
  const meta = html.match(CSP_META_PATTERN)?.[0];
  if (!meta) return false;
  const policy = meta.match(CONTENT_ATTRIBUTE_PATTERN)?.[2];
  if (!policy) return false;
  const sourceList = policy
    .split(';')
    .map((part) => part.trim().split(/\s+/))
    .find(([name = '']) => name.toLowerCase() === directive.toLowerCase());
  if (!sourceList) return false;
  const expected = new URL(expectedOrigin).origin;
  return sourceList.slice(1).some((source) => {
    try {
      return new URL(source).origin === expected;
    } catch {
      return false;
    }
  });
}
