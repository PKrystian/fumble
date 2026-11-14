import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { useT } from '@/i18n/useT';
import { stripLocale } from '@/i18n/pathUtils';
import { Button, IconButton } from '@/features/ui/primitives';
import { useRollStore } from './rollStore';
import { RollResult } from './RollResult';

export function RollResultDock() {
  const { t } = useT();
  const { pathname } = useLocation();
  const latest = useRollStore((state) => state.log[0]);
  const open = useRollStore((state) => state.dockOpen);
  const close = useRollStore((state) => state.closeDock);
  const reroll = useRollStore((state) => state.reroll);
  const [expanded, setExpanded] = useState(false);
  if (stripLocale(pathname).rest.replace(/\/$/, '') === '/dice' || !open || !latest)
    return null;
  return (
    <aside aria-label={t('dice.diceResult')} className="dock">
      <div className="dock-panel">
        <div className="dock-header">
          <h2 id="dock-roll-title" tabIndex={-1} className="dock-title">
            {t('dice.diceResult')}
          </h2>
          <div className="flex gap-1">
            <IconButton
              label={t(expanded ? 'dice.collapseResult' : 'dice.expandResult')}
              size="sm"
              variant="ghost"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown size={16} aria-hidden="true" />
              ) : (
                <ChevronUp size={16} aria-hidden="true" />
              )}
            </IconButton>
            <IconButton
              label={t('dice.closeDiceResult')}
              size="sm"
              variant="ghost"
              onClick={close}
            >
              <X size={16} aria-hidden="true" />
            </IconButton>
          </div>
        </div>
        <p role="status" aria-atomic="true" className="sr-only">
          {t('dice.announcedResult', {
            expression: latest.outcome.expression,
            total: latest.outcome.total,
          })}
        </p>
        <div className="max-h-[60dvh] overflow-y-auto px-4 py-3">
          {expanded ? (
            <>
              <RollResult key={latest.id} entry={latest} compact />
              {latest.outcome.groups.some((group) => group.sides === 20) && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => reroll(latest, 'advantage')}>
                    {t('dice.modeAdvantage')}
                  </Button>
                  <Button size="sm" onClick={() => reroll(latest, 'disadvantage')}>
                    {t('dice.modeDisadvantage')}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div>
              <p className="break-words text-sm text-ink-300 [overflow-wrap:anywhere]">
                {latest.label ? latest.label + ': ' : ''}
                {latest.outcome.expression}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <strong className="text-3xl text-ink-50 tabular-nums">
                  {latest.outcome.total}
                </strong>
                <Button size="sm" onClick={() => reroll(latest)}>
                  {t('dice.reroll')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
