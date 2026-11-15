import { Plus, Trash2 } from 'lucide-react';
import { Button, IconButton } from '@/features/ui/primitives';
import { useT } from '@/i18n/useT';

export function RemovedNotice({
  name,
  onUndo,
}: {
  name: string | null;
  onUndo: () => void;
}) {
  const { t } = useT();
  return (
    <div role="status" className="empty:hidden">
      {name !== null && (
        <div className="notice flex flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 [overflow-wrap:anywhere]">
            {t('character.sheet.rows.removed', {
              name: name.trim() || t('character.sheet.rows.unnamed'),
            })}
          </span>
          <Button size="sm" onClick={onUndo}>
            {t('character.sheet.rows.undo')}
          </Button>
        </div>
      )}
    </div>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button onClick={onClick} size="sm" className="self-start">
      <Plus size={14} aria-hidden="true" /> {label}
    </Button>
  );
}

export function RemoveButton({ onClick, name }: { onClick: () => void; name: string }) {
  const { t } = useT();
  return (
    <IconButton
      label={t('character.sheet.rows.remove', {
        name: name.trim() || t('character.sheet.rows.unnamed'),
      })}
      onClick={onClick}
      variant="ghost"
      size="sm"
    >
      <Trash2 size={16} aria-hidden="true" />
    </IconButton>
  );
}
