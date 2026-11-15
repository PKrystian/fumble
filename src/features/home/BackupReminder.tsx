import { useState } from 'react';
import { X } from 'lucide-react';
import {
  backupReminderStatus,
  readBackupReminder,
  snoozeBackupReminder,
} from '@/features/data/backupReminder';
import { useRollStore } from '@/features/dice/rollStore';
import { IconButton } from '@/features/ui/primitives';
import { buttonClass } from '@/features/ui/styles';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';

interface BackupReminderProps {
  hasData: boolean;
  dataSince: number | null;
}

export function BackupReminder({ hasData, dataSince }: BackupReminderProps) {
  const { t } = useT();
  const rollDockOpen = useRollStore((state) => state.dockOpen && state.log.length > 0);
  const [now] = useState(() => Date.now());
  const [reminder, setReminder] = useState(readBackupReminder);
  const status = backupReminderStatus(reminder, now, dataSince);
  if (!hasData || rollDockOpen || !status.due) return null;
  return (
    <aside aria-labelledby="backup-reminder-title" className="dock">
      <div className="dock-panel">
        <div className="dock-header">
          <h2 id="backup-reminder-title" className="dock-title">
            {t('home.backupReminder.title')}
          </h2>
          <IconButton
            label={t('home.backupReminder.later')}
            size="sm"
            variant="ghost"
            onClick={() => setReminder(snoozeBackupReminder())}
          >
            <X size={16} aria-hidden="true" />
          </IconButton>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm leading-6 text-ink-300">
            {status.days === null
              ? t('home.backupReminder.never')
              : t('home.backupReminder.stale', { days: status.days })}
          </p>
          <Link to="/data" className={buttonClass({ size: 'sm', className: 'mt-3' })}>
            {t('home.backupReminder.open')}
          </Link>
        </div>
      </div>
    </aside>
  );
}
