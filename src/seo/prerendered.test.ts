import { beforeEach, describe, expect, it } from 'vitest';
import { hasPrerenderedPage, revealApp, showPrerenderedRetry } from './prerendered';

describe('revealApp', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('removes the fallback and reveals the application root', () => {
    document.body.innerHTML =
      '<div id="app-root" data-app-ready="false"></div><main id="prerendered-content"></main>';

    revealApp();

    expect(document.getElementById('prerendered-content')).toBeNull();
    expect(document.getElementById('app-root')).toHaveAttribute('data-app-ready', 'true');
  });

  it('does not require either node to exist', () => {
    expect(() => revealApp()).not.toThrow();
  });

  it('only matches the same path and can show a retry without removing the fallback', () => {
    expect(hasPrerenderedPage('/books/phb/0')).toBe(false);
    expect(() => showPrerenderedRetry()).not.toThrow();
    document.body.innerHTML =
      '<main id="prerendered-content" data-path="/books/phb/0/"><p data-prerendered-retry hidden>Retry</p></main>';
    expect(hasPrerenderedPage('/books/phb/0')).toBe(true);
    expect(hasPrerenderedPage('/books/phb/1/')).toBe(false);
    showPrerenderedRetry();
    expect(document.querySelector('[data-prerendered-retry]')).not.toHaveAttribute(
      'hidden',
    );
  });
});
