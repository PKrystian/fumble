import { useT } from '@/i18n/useT';
import { Logo } from '@/features/ui/Logo';

interface FumbleBadgeProps {
  compact?: boolean;
}

export function FumbleBadge({ compact = false }: FumbleBadgeProps) {
  const { t } = useT();
  return (
    <span
      title={t('compendium.fumbleTooltip')}
      aria-label={t('compendium.fumbleTooltip')}
      className={[
        'badge border-arcane-500 text-arcane-300',
        compact ? 'px-1.5 py-0.5' : 'px-2 py-0.5',
      ].join(' ')}
    >
      <Logo size={compact ? 11 : 13} aria-hidden="true" />
      <span className={compact ? 'sr-only' : ''}>{t('compendium.fumbleBadge')}</span>
    </span>
  );
}
