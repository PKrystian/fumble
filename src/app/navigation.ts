import {
  BookOpen,
  Dices,
  FlaskConical,
  Home,
  Mic,
  Music,
  ScrollText,
  Shield,
  Swords,
  Coins,
  Calculator,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  labelKey: string;
  to: string;
  icon: LucideIcon;
}

export interface NavSection {
  titleKey: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    titleKey: 'nav.sectionPlayer',
    items: [
      { labelKey: 'nav.home', to: '/', icon: Home },
      { labelKey: 'nav.characterSheet', to: '/character', icon: ScrollText },
      { labelKey: 'nav.compendium', to: '/compendium', icon: BookOpen },
      { labelKey: 'nav.homebrew', to: '/homebrew', icon: FlaskConical },
      { labelKey: 'nav.diceRoller', to: '/dice', icon: Dices },
      { labelKey: 'nav.sessionLog', to: '/session-log', icon: Mic },
    ],
  },
  {
    titleKey: 'nav.sectionDm',
    items: [
      { labelKey: 'nav.initiative', to: '/dm/initiative', icon: Swords },
      { labelKey: 'nav.lootGenerator', to: '/dm/loot', icon: Coins },
      { labelKey: 'nav.encounterCr', to: '/dm/encounter', icon: Calculator },
      { labelKey: 'nav.soundboard', to: '/dm/soundboard', icon: Music },
    ],
  },
  {
    titleKey: 'nav.sectionCampaign',
    items: [{ labelKey: 'nav.wiki', to: '/wiki', icon: Shield }],
  },
];

export const allNavItems: NavItem[] = navSections.flatMap((section) => section.items);
