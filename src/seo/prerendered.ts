export function revealApp(): void {
  document.getElementById('prerendered-content')?.remove();
  document.getElementById('app-root')?.setAttribute('data-app-ready', 'true');
}
