import { Navigate, createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { LocaleLayout } from '@/app/layout/LocaleLayout';
import { HomePage } from '@/features/home/HomePage';
import { NotFoundPage } from '@/features/NotFoundPage';
import { CompendiumPage } from '@/features/compendium/CompendiumPage';
import { CharacterListPage } from '@/features/character/CharacterListPage';
import { CharacterSheetPage } from '@/features/character/CharacterSheetPage';
import { DiceRollerPage } from '@/features/dice/DiceRollerPage';
import { InitiativeTrackerPage } from '@/features/initiative/InitiativeTrackerPage';
import { EncounterCalculatorPage } from '@/features/dm/EncounterCalculatorPage';
import { LootGeneratorPage } from '@/features/dm/LootGeneratorPage';
import { HomebrewPage } from '@/features/homebrew/HomebrewPage';
import { BooksPage } from '@/features/books/BooksPage';
import { BookReaderPage } from '@/features/books/BookReaderPage';
import { SessionLogPage } from '@/features/session-log/SessionLogPage';
import { SoundboardPage } from '@/features/soundboard/SoundboardPage';
import { WikiPage } from '@/features/wiki/WikiPage';

const appRouteChildren: RouteObject[] = [
  { index: true, element: <HomePage /> },
  { path: 'character', element: <CharacterListPage /> },
  { path: 'character/:id', element: <CharacterSheetPage /> },
  { path: 'compendium', element: <CompendiumPage /> },
  { path: 'compendium/:category', element: <CompendiumPage /> },
  { path: 'compendium/:category/:id', element: <CompendiumPage /> },
  { path: 'homebrew', element: <HomebrewPage /> },
  { path: 'books', element: <BooksPage /> },
  { path: 'books/:id', element: <BookReaderPage /> },
  { path: 'books/:id/:chapter', element: <BookReaderPage /> },
  { path: 'dice', element: <DiceRollerPage /> },
  { path: 'session-log', element: <SessionLogPage /> },
  { path: 'dm/initiative', element: <InitiativeTrackerPage /> },
  { path: 'dm/loot', element: <LootGeneratorPage /> },
  { path: 'dm/encounter', element: <EncounterCalculatorPage /> },
  { path: 'dm/soundboard', element: <SoundboardPage /> },
  { path: 'wiki', element: <WikiPage /> },
  { path: 'wiki/:slug', element: <WikiPage /> },
  { path: '*', element: <NotFoundPage /> },
];

export const router = createBrowserRouter(
  [
    { path: '/', element: <LocaleLayout locale="en" />, children: appRouteChildren },
    { path: '/pl', element: <LocaleLayout locale="pl" />, children: appRouteChildren },

    { path: '*', element: <Navigate to="/" replace /> },
  ],
  { basename: import.meta.env.BASE_URL },
);
