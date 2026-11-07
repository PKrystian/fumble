export function isSearchVariant(pathname: string, search: string): boolean {
  const book = /^\/(?:pl\/)?books\//.test(pathname);
  return Array.from(new URLSearchParams(search).keys()).some(
    (key) =>
      !key.startsWith('utm_') &&
      !['gclid', 'fbclid', 'msclkid'].includes(key) &&
      !(book && (key === 'page' || key === 'name')),
  );
}

export function applyQueryRobots(
  search: string,
  pathname = window.location.pathname,
): void {
  const robots = document.querySelector('meta[name="robots"]');
  if (
    robots?.getAttribute('content') === 'index, follow' &&
    isSearchVariant(pathname, search)
  ) {
    robots.setAttribute('content', 'noindex, follow');
  }
}

applyQueryRobots(window.location.search);
