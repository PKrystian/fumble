export function hasPrerenderedPage(pathname: string): boolean {
  const path = document.getElementById('prerendered-content')?.dataset.path;
  return path === `${pathname.replace(/\/+$/, '')}/`;
}

export function showPrerenderedRetry(): void {
  document
    .querySelector<HTMLElement>('[data-prerendered-retry]')
    ?.removeAttribute('hidden');
}

export function revealApp(): void {
  document.getElementById('prerendered-content')?.remove();
  document.getElementById('app-root')?.setAttribute('data-app-ready', 'true');
}
