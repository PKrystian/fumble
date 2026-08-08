import {
  BookMarked,
  Calculator,
  CircleAlert,
  Coins,
  Dices,
  FlaskConical,
  GraduationCap,
  HardDriveDownload,
  ListTree,
  Mic,
  MousePointerClick,
  Music,
  Package,
  PawPrint,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  UserRound,
  WandSparkles,
  type LucideIcon,
} from 'lucide-react';
import { Logo } from '@/features/ui/Logo';

export type NavAccent = 'arcane' | 'teal' | 'ember' | 'violet' | 'slate';

export interface NavItem {
  labelKey: string;
  descriptionKey: string;
  to: string;
  icon: LucideIcon;
}

export interface NavSection {
  titleKey: string;
  descriptionKey: string;
  accent: NavAccent;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    titleKey: 'nav.sectionPlayer',
    descriptionKey: 'home.sections.player',
    accent: 'arcane',
    items: [
      {
        labelKey: 'nav.characterSheet',
        descriptionKey: 'home.cards.character',
        to: '/character',
        icon: ScrollText,
      },
      {
        labelKey: 'nav.species',
        descriptionKey: 'home.cards.species',
        to: '/compendium/species',
        icon: UserRound,
      },
      {
        labelKey: 'nav.classes',
        descriptionKey: 'home.cards.classes',
        to: '/compendium/classes',
        icon: GraduationCap,
      },
      {
        labelKey: 'nav.backgrounds',
        descriptionKey: 'home.cards.backgrounds',
        to: '/compendium/backgrounds',
        icon: BookMarked,
      },
      {
        labelKey: 'nav.feats',
        descriptionKey: 'home.cards.feats',
        to: '/compendium/feats',
        icon: Sparkles,
      },
      {
        labelKey: 'nav.items',
        descriptionKey: 'home.cards.items',
        to: '/compendium/items',
        icon: Package,
      },
      {
        labelKey: 'nav.spells',
        descriptionKey: 'home.cards.spells',
        to: '/compendium/spells',
        icon: WandSparkles,
      },
      {
        labelKey: 'nav.homebrew',
        descriptionKey: 'home.cards.homebrew',
        to: '/homebrew',
        icon: FlaskConical,
      },
    ],
  },
  {
    titleKey: 'nav.sectionRules',
    descriptionKey: 'home.sections.rules',
    accent: 'teal',
    items: [
      {
        labelKey: 'nav.books',
        descriptionKey: 'home.cards.books',
        to: '/books',
        icon: BookMarked,
      },
      {
        labelKey: 'nav.rules',
        descriptionKey: 'home.cards.rules',
        to: '/compendium/rules',
        icon: ListTree,
      },
      {
        labelKey: 'nav.conditions',
        descriptionKey: 'home.cards.conditions',
        to: '/compendium/conditions',
        icon: CircleAlert,
      },
      {
        labelKey: 'nav.actions',
        descriptionKey: 'home.cards.actions',
        to: '/compendium/actions',
        icon: MousePointerClick,
      },
    ],
  },
  {
    titleKey: 'nav.sectionDm',
    descriptionKey: 'home.sections.dm',
    accent: 'violet',
    items: [
      {
        labelKey: 'nav.bestiary',
        descriptionKey: 'home.cards.bestiary',
        to: '/compendium/bestiary',
        icon: PawPrint,
      },
      {
        labelKey: 'nav.initiative',
        descriptionKey: 'home.cards.initiative',
        to: '/dm/initiative',
        icon: Swords,
      },
      {
        labelKey: 'nav.encounterCr',
        descriptionKey: 'home.cards.encounter',
        to: '/dm/encounter',
        icon: Calculator,
      },
      {
        labelKey: 'nav.lootGenerator',
        descriptionKey: 'home.cards.loot',
        to: '/dm/loot',
        icon: Coins,
      },
      {
        labelKey: 'nav.soundboard',
        descriptionKey: 'home.cards.soundboard',
        to: '/dm/soundboard',
        icon: Music,
      },
    ],
  },
  {
    titleKey: 'nav.sectionCampaign',
    descriptionKey: 'home.sections.campaign',
    accent: 'ember',
    items: [
      {
        labelKey: 'nav.wiki',
        descriptionKey: 'home.cards.wiki',
        to: '/wiki',
        icon: Shield,
      },
      {
        labelKey: 'nav.sessionLog',
        descriptionKey: 'home.cards.sessionLog',
        to: '/session-log',
        icon: Mic,
      },
      {
        labelKey: 'nav.fumbleHomebrew',
        descriptionKey: 'home.cards.fumbleHomebrew',
        to: '/fumble-homebrew',
        icon: Logo,
      },
    ],
  },
  {
    titleKey: 'nav.sectionUtilities',
    descriptionKey: 'home.sections.utilities',
    accent: 'slate',
    items: [
      {
        labelKey: 'nav.diceRoller',
        descriptionKey: 'home.cards.dice',
        to: '/dice',
        icon: Dices,
      },
      {
        labelKey: 'nav.data',
        descriptionKey: 'home.cards.data',
        to: '/data',
        icon: HardDriveDownload,
      },
    ],
  },
];

export const allNavItems: NavItem[] = navSections.flatMap((section) => section.items);
