import { describe, expect, it } from 'vitest';
import { cspHasSourceOrigin } from './csp';

const policy = (value: string) =>
  `<meta\n  http-equiv="Content-Security-Policy"\n  content="${value}"\n/>`;

describe('cspHasSourceOrigin', () => {
  it('matches an exact source origin in the requested directive', () => {
    expect(
      cspHasSourceOrigin(
        policy(
          "default-src 'self'; connect-src 'self' https://cloudflareinsights.com; script-src 'self' https://static.cloudflareinsights.com",
        ),
        'connect-src',
        'https://cloudflareinsights.com',
      ),
    ).toBe(true);
  });

  it('rejects a source that only contains the expected origin as a substring', () => {
    expect(
      cspHasSourceOrigin(
        policy(
          'connect-src https://cloudflareinsights.com.attacker.test; script-src https://attacker.test/https://static.cloudflareinsights.com',
        ),
        'connect-src',
        'https://cloudflareinsights.com',
      ),
    ).toBe(false);
    expect(
      cspHasSourceOrigin(
        policy(
          'connect-src https://cloudflareinsights.com.attacker.test; script-src https://attacker.test/https://static.cloudflareinsights.com',
        ),
        'script-src',
        'https://static.cloudflareinsights.com',
      ),
    ).toBe(false);
  });

  it('rejects missing policies, directives and invalid source tokens', () => {
    expect(
      cspHasSourceOrigin('<html></html>', 'connect-src', 'https://example.com'),
    ).toBe(false);
    expect(
      cspHasSourceOrigin(
        '<meta http-equiv="Content-Security-Policy" />',
        'connect-src',
        'https://example.com',
      ),
    ).toBe(false);
    expect(
      cspHasSourceOrigin(
        policy("default-src 'self'; connect-src 'self'"),
        'script-src',
        'https://example.com',
      ),
    ).toBe(false);
    expect(
      cspHasSourceOrigin(
        policy("connect-src 'self' invalid-source"),
        'connect-src',
        'https://example.com',
      ),
    ).toBe(false);
  });
});
