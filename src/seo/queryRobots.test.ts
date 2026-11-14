import { afterEach, describe, expect, it } from 'vitest';
import { applyQueryRobots } from './queryRobots';

describe('query route robots metadata', () => {
  afterEach(() => {
    document.head.querySelector('meta[name="robots"]')?.remove();
  });

  it('marks a query route as noindex and keeps it crawlable', () => {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'index, follow';
    document.head.append(robots);

    applyQueryRobots('?q=fireball');

    expect(robots).toHaveAttribute('content', 'noindex, follow');
  });

  it('leaves a clean route indexable', () => {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'index, follow';
    document.head.append(robots);

    applyQueryRobots('');

    expect(robots).toHaveAttribute('content', 'index, follow');
  });

  it('does nothing when the page has no robots metadata', () => {
    expect(() => applyQueryRobots('?q=fireball')).not.toThrow();
  });

  it('preserves the stricter directive on a private page with parameters', () => {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'noindex, nofollow';
    document.head.append(robots);
    applyQueryRobots('?q=fireball');
    expect(robots).toHaveAttribute('content', 'noindex, nofollow');
  });

  it('applies query directives from the browser entry point', async () => {
    const robots = document.createElement('meta');
    robots.name = 'robots';
    robots.content = 'index, follow';
    document.head.append(robots);
    window.history.replaceState(null, '', '/?q=fireball');
    await import('./queryRobotsEntry');
    expect(robots).toHaveAttribute('content', 'noindex, follow');
    window.history.replaceState(null, '', '/');
  });
});
