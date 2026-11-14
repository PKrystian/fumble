import {
  Axe,
  Brain,
  Droplets,
  Flame,
  Hammer,
  Leaf,
  Orbit,
  Skull,
  Snowflake,
  Sun,
  Swords,
  Volume2,
  Zap,
} from 'lucide-react';
import { useT } from '@/i18n/useT';
import type { DamageType } from './damage';

const ICONS = {
  acid: Droplets,
  bludgeoning: Hammer,
  cold: Snowflake,
  fire: Flame,
  force: Orbit,
  lightning: Zap,
  necrotic: Skull,
  piercing: Swords,
  poison: Leaf,
  psychic: Brain,
  radiant: Sun,
  slashing: Axe,
  thunder: Volume2,
};
export function DamageBadge({ type }: { type: DamageType }) {
  const { t } = useT();
  const Icon = ICONS[type];
  return (
    <span className="damage-badge" data-damage={type}>
      <Icon size={15} aria-hidden="true" />
      {t(`dice.damageTypes.${type}`)}
    </span>
  );
}
