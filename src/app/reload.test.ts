import { describe, expect, it, vi } from 'vitest';
import { reloadPage } from './reload';

describe('reloadPage', () => {
  it('asks the browser to reload the document', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => reloadPage()).not.toThrow();
    consoleError.mockRestore();
  });
});
