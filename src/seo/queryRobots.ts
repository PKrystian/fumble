export function applyQueryRobots(search: string): void {
  const robots = document.querySelector('meta[name="robots"]');
  if (robots && search) {
    robots.setAttribute('content', 'noindex, follow');
  }
}

applyQueryRobots(window.location.search);
