import { Navigate, createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import type { ComponentType } from 'react';
import { LocaleEntryLayout } from '@/app/layout/LocaleEntryLayout';
import { LocaleLayout } from '@/app/layout/LocaleLayout';
import { HomePage } from '@/features/home/HomePage';

function lazyComponent<T extends Record<string, unknown>>(
  load: () => Promise<T>,
  name: keyof T,
): () => Promise<{ Component: ComponentType }> {
  return async () => ({ Component: (await load())[name] as ComponentType });
}

const appRouteChildren: RouteObject[] = [
  { index: true, element: <HomePage /> },
  {
    path: 'character',
    lazy: lazyComponent(
      () => import('@/features/character/CharacterListPage'),
      'CharacterListPage',
    ),
  },
  {
    path: 'character/:id',
    lazy: lazyComponent(
      () => import('@/features/character/CharacterSheetPage'),
      'CharacterSheetPage',
    ),
  },
  {
    path: 'compendium',
    lazy: lazyComponent(
      () => import('@/features/compendium/CompendiumPage'),
      'CompendiumPage',
    ),
  },
  {
    path: 'compendium/:category',
    lazy: lazyComponent(
      () => import('@/features/compendium/CompendiumPage'),
      'CompendiumPage',
    ),
  },
  {
    path: 'compendium/:category/:id',
    lazy: lazyComponent(
      () => import('@/features/compendium/CompendiumPage'),
      'CompendiumPage',
    ),
  },
  {
    path: 'homebrew',
    lazy: lazyComponent(() => import('@/features/homebrew/HomebrewPage'), 'HomebrewPage'),
  },
  {
    path: 'books',
    lazy: lazyComponent(() => import('@/features/books/BooksPage'), 'BooksPage'),
  },
  {
    path: 'books/:id',
    lazy: lazyComponent(
      () => import('@/features/books/BookReaderPage'),
      'BookReaderPage',
    ),
  },
  {
    path: 'books/:id/:chapter',
    lazy: lazyComponent(
      () => import('@/features/books/BookReaderPage'),
      'BookReaderPage',
    ),
  },
  {
    path: 'dice',
    lazy: lazyComponent(() => import('@/features/dice/DiceRollerPage'), 'DiceRollerPage'),
  },
  {
    path: 'data',
    lazy: lazyComponent(
      () => import('@/features/data/DataManagementPage'),
      'DataManagementPage',
    ),
  },
  {
    path: 'session-log',
    lazy: lazyComponent(
      () => import('@/features/session-log/SessionLogPage'),
      'SessionLogPage',
    ),
  },
  {
    path: 'dm/initiative',
    lazy: lazyComponent(
      () => import('@/features/initiative/InitiativeTrackerPage'),
      'InitiativeTrackerPage',
    ),
  },
  {
    path: 'dm/loot',
    lazy: lazyComponent(
      () => import('@/features/dm/LootGeneratorPage'),
      'LootGeneratorPage',
    ),
  },
  {
    path: 'dm/encounter',
    lazy: lazyComponent(
      () => import('@/features/dm/EncounterCalculatorPage'),
      'EncounterCalculatorPage',
    ),
  },
  {
    path: 'dm/soundboard',
    lazy: lazyComponent(
      () => import('@/features/soundboard/SoundboardPage'),
      'SoundboardPage',
    ),
  },
  {
    path: 'wiki',
    lazy: lazyComponent(() => import('@/features/wiki/WikiPage'), 'WikiPage'),
  },
  {
    path: 'wiki/:slug',
    lazy: lazyComponent(() => import('@/features/wiki/WikiPage'), 'WikiPage'),
  },
  {
    path: 'legal',
    lazy: lazyComponent(() => import('@/features/legal/LegalPages'), 'LegalOverviewPage'),
  },
  {
    path: 'legal/privacy',
    lazy: lazyComponent(() => import('@/features/legal/LegalPages'), 'PrivacyPage'),
  },
  {
    path: 'legal/connections',
    lazy: lazyComponent(() => import('@/features/legal/LegalPages'), 'ConnectionsPage'),
  },
  {
    path: 'legal/terms',
    lazy: lazyComponent(() => import('@/features/legal/LegalPages'), 'TermsPage'),
  },
  {
    path: 'legal/licenses',
    lazy: lazyComponent(() => import('@/features/legal/LegalPages'), 'LicensesPage'),
  },
  {
    path: 'legal/accessibility',
    lazy: lazyComponent(() => import('@/features/legal/LegalPages'), 'AccessibilityPage'),
  },
  {
    path: 'legal/contact',
    lazy: lazyComponent(() => import('@/features/legal/LegalPages'), 'ContactPage'),
  },
  {
    path: '*',
    lazy: lazyComponent(() => import('@/features/NotFoundPage'), 'NotFoundPage'),
  },
];

export const router = createBrowserRouter(
  [
    { path: '/', element: <LocaleEntryLayout />, children: appRouteChildren },
    { path: '/pl', element: <LocaleLayout locale="pl" />, children: appRouteChildren },

    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { basename: import.meta.env.BASE_URL },
);
