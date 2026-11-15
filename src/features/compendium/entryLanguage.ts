import { createContext } from 'react';
import type { Locale } from '@/i18n/locales';

export const EntryLanguage = createContext<Locale | undefined>(undefined);
