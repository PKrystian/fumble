import { beforeEach, describe, expect, it } from 'vitest';
import { revealApp } from './prerendered';

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
});
