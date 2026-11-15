import { Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { confirmDialog } from '@/features/ui/confirmStore';
import { Button, IconButton } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { useT } from '@/i18n/useT';
import { lootTitle } from './lootFiles';
import { useLootStore } from './lootStore';

export function LootHistory() {
  const { locale, t } = useT();
  const { data, selectResult, deleteResult } = useLootStore();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusAfterDelete = useRef(false);
  useEffect(() => {
    if (focusAfterDelete.current) {
      titleRef.current?.focus();
      focusAfterDelete.current = false;
    }
  }, [data.history]);
  return (
    <section className="space-y-3" aria-labelledby="loot-history-title">
      <h2 ref={titleRef} tabIndex={-1} id="loot-history-title" className="section-title">
        {t('dm.loot.history')} ({data.history.length})
      </h2>
      <p className="text-sm text-ink-400">{t('dm.loot.historyHelp')}</p>
      {data.history.length === 0 ? (
        <p className="empty-state">{t('dm.loot.historyEmpty')}</p>
      ) : (
        <ul className="space-y-2">
          {data.history.map((result) => {
            const title = lootTitle(result, locale);
            const selected = result.id === data.selectedId;
            return (
              <li key={result.id} className={panelClass('flex items-center gap-2 p-2')}>
                <Button
                  variant="ghost"
                  aria-label={t('dm.loot.viewResult', { name: title })}
                  aria-pressed={selected}
                  className="min-w-0 flex-1 justify-start text-left aria-pressed:bg-arcane-950 aria-pressed:font-semibold"
                  onClick={() => selectResult(result.id)}
                >
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    <span className="block whitespace-normal text-ink-50">{title}</span>
                    <time
                      dateTime={new Date(result.createdAt).toISOString()}
                      className="block whitespace-normal text-xs text-ink-400"
                    >
                      {new Date(result.createdAt).toLocaleString(locale)}
                    </time>
                  </span>
                </Button>
                <IconButton
                  variant="danger"
                  label={t('dm.loot.deleteResult', { name: title })}
                  onClick={() => {
                    void confirmDialog(t('dm.loot.confirmDelete', { name: title }), {
                      title: t('dm.loot.history'),
                      confirmLabel: t('common.delete'),
                      tone: 'danger',
                      initialFocus: 'cancel',
                    }).then((accepted) => {
                      if (accepted) {
                        focusAfterDelete.current = true;
                        deleteResult(result.id);
                      }
                    });
                  }}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
