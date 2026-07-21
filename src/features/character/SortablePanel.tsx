import type { ReactNode } from 'react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { useT } from '@/i18n/useT';

export function SortablePanel({ id, children }: { id: string; children: ReactNode }) {
  const { t } = useT();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative ${isDragging ? 'z-10 opacity-50' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={t('common.dragToReorder')}
        className="absolute right-2 top-2 z-10 cursor-grab touch-none rounded p-1 text-ink-600 hover:bg-ink-800 hover:text-ink-200 active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>
      {children}
    </div>
  );
}

export function SortableZone({
  panelIds,
  children,
}: {
  panelIds: string[];
  children: ReactNode;
}) {
  return (
    <SortableContext items={panelIds} strategy={verticalListSortingStrategy}>
      <div className="flex min-h-16 flex-col gap-4">{children}</div>
    </SortableContext>
  );
}
