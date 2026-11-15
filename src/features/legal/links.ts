export const REPOSITORY_URL = 'https://github.com/PKrystian/Fumble';
export const LEGAL_PAGES = [
  'overview',
  'privacy',
  'connections',
  'terms',
  'licenses',
  'accessibility',
  'contact',
] as const;
export type LegalPageId = (typeof LEGAL_PAGES)[number];
export const LEGAL_DATES: Record<LegalPageId, string> = {
  overview: '2026-11-07',
  privacy: '2026-11-08',
  connections: '2026-11-08',
  terms: '2026-08-28',
  licenses: '2026-11-07',
  accessibility: '2026-08-28',
  contact: '2026-11-07',
};
export function legalPath(page: LegalPageId): string {
  return page === 'overview' ? '/legal' : `/legal/${page}`;
}
export const LEGAL_LINKS: Record<string, { to: string; label: string }> = {
  contact: { to: '/legal/contact', label: 'legal.contact.title' },
  backup: { to: '/data', label: 'nav.data' },
  connections: { to: '/legal/connections', label: 'legal.connections.title' },
  licenses: { to: '/legal/licenses', label: 'legal.licenses.title' },
  profile: { to: 'https://github.com/PKrystian', label: 'legal.contact.profileLabel' },
  repository: { to: REPOSITORY_URL, label: 'legal.contact.repositoryLabel' },
  mit: { to: `${REPOSITORY_URL}/blob/main/LICENSE`, label: 'legal.references.mit' },
  notices: {
    to: `${REPOSITORY_URL}/blob/main/THIRD_PARTY_NOTICES.md`,
    label: 'legal.references.notices',
  },
  security: {
    to: `${REPOSITORY_URL}/security/advisories/new`,
    label: 'legal.contact.securityLabel',
  },
  securityPolicy: {
    to: `${REPOSITORY_URL}/security/policy`,
    label: 'legal.references.securityPolicy',
  },
  bug: {
    to: `${REPOSITORY_URL}/issues/new?template=bug_report.yml`,
    label: 'legal.contact.bugLabel',
  },
  content: {
    to: `${REPOSITORY_URL}/issues/new?template=content_report.yml`,
    label: 'legal.contact.contentLabel',
  },
  accessibility: {
    to: `${REPOSITORY_URL}/issues/new?template=accessibility.yml`,
    label: 'legal.contact.accessibilityLabel',
  },
  srd: { to: 'https://www.dndbeyond.com/srd', label: 'legal.references.srd' },
  cc: {
    to: 'https://creativecommons.org/licenses/by/4.0/legalcode',
    label: 'legal.references.cc',
  },
};

export const DISCOVERY_LINKS = [
  { to: '/compendium', label: 'nav.compendium' },
  { to: '/books', label: 'nav.books' },
  { to: '/fumble-homebrew', label: 'nav.fumbleHomebrew' },
  { to: '/wiki', label: 'nav.wiki' },
  { to: '/dice', label: 'nav.diceRoller' },
  { to: '/site-map', label: 'siteMap.title' },
] as const;
