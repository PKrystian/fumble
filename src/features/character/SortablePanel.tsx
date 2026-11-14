import type { ReactNode } from 'react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowDown, ArrowUp, Columns3, GripVertical, MoveHorizontal } from 'lucide-react';
import { ActionMenu, type ActionMenuItem } from '@/features/ui/ActionMenu';
import { useT } from '@/i18n/useT';
import { PanelFrameContext } from './panelFrame';
import { PANEL_TITLE_KEYS } from './layoutMeta';
import {
  LAYOUT_ZONES,
  findPanelZone,
  useLayoutStore,
  type LayoutZone,
} from './layoutStore';

function PanelLayoutMenu({
  id,
  wide,
  onMoved,
}: {
  id: string;
  wide: boolean;
  onMoved: (message: string) => void;
}) {
  const { t } = useT();
  const zones = useLayoutStore((state) => state.zones);
  const mobileOrder = useLayoutStore((state) => state.mobileOrder);
  const title = t(PANEL_TITLE_KEYS[id] ?? id);
  const zone = findPanelZone(zones, id);
  const list = wide ? (zone ? zones[zone] : []) : mobileOrder;
  const index = list.indexOf(id);

  const announce = (nextZone: LayoutZone | null) => {
    const state = useLayoutStore.getState();
    const target = nextZone ? state.zones[nextZone] : state.mobileOrder;
    onMoved(
      nextZone
        ? t('character.sheet.layout.movedColumn', {
            panel: title,
            position: target.indexOf(id) + 1,
            column: t(`character.sheet.layout.columns.${nextZone}`),
          })
        : t('character.sheet.layout.moved', {
            panel: title,
            position: target.indexOf(id) + 1,
          }),
    );
  };

  const move = (offset: -1 | 1) => {
    const store = useLayoutStore.getState();
    if (wide) store.movePanelBy(id, offset);
    else store.moveMobile(id, offset);
    announce(wide && zone ? zone : null);
  };

  const items: ActionMenuItem[] = [
    {
      id: 'up',
      label: t('character.sheet.layout.moveUp'),
      icon: <ArrowUp size={16} aria-hidden="true" />,
      disabled: index <= 0,
      onSelect: () => move(-1),
    },
    {
      id: 'down',
      label: t('character.sheet.layout.moveDown'),
      icon: <ArrowDown size={16} aria-hidden="true" />,
      disabled: index < 0 || index >= list.length - 1,
      onSelect: () => move(1),
    },
    ...(wide
      ? LAYOUT_ZONES.filter((target) => target !== zone).map((target) => ({
          id: `zone-${target}`,
          label: t('character.sheet.layout.moveTo', {
            column: t(`character.sheet.layout.columns.${target}`),
          }),
          icon: <MoveHorizontal size={16} aria-hidden="true" />,
          onSelect: () => {
            useLayoutStore
              .getState()
              .movePanel(id, target, useLayoutStore.getState().zones[target].length);
            announce(target);
          },
        }))
      : []),
  ];

  return (
    <ActionMenu
      label={t('character.sheet.layout.menu', { panel: title })}
      items={items}
      iconOnly
      variant="ghost"
      size="sm"
    >
      <Columns3 size={16} aria-hidden="true" />
    </ActionMenu>
  );
}

export function SortablePanel({
  id,
  children,
  wide,
  onMoved,
}: {
  id: string;
  children: ReactNode;
  wide: boolean;
  onMoved: (message: string) => void;
}) {
  const { t } = useT();
  const collapsed = useLayoutStore((state) => state.collapsed.includes(id));
  const toggleCollapsed = useLayoutStore((state) => state.toggleCollapsed);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: !wide });

  const layoutMenu = (
    <>
      {wide && (
        <span
          {...attributes}
          {...listeners}
          tabIndex={-1}
          role="presentation"
          aria-hidden="true"
          title={t('common.dragToReorder')}
          className="drag-grip"
        >
          <GripVertical size={16} />
        </span>
      )}
      <PanelLayoutMenu id={id} wide={wide} onMoved={onMoved} />
    </>
  );

  return (
    <div
      ref={setNodeRef}
      data-panel={id}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`min-w-0 ${isDragging ? 'relative z-10 opacity-50' : ''}`.trim()}
    >
      <PanelFrameContext.Provider
        value={{
          collapsible: !wide && id !== 'tabs',
          collapsed,
          toggle: () => toggleCollapsed(id),
          layoutMenu,
        }}
      >
        {children}
      </PanelFrameContext.Provider>
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
      <div className="flex min-h-16 min-w-0 flex-col gap-4">{children}</div>
    </SortableContext>
  );
}
