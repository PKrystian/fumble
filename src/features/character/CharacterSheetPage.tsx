import { useCallback, useState, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Settings } from 'lucide-react';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ActionMenu } from '@/features/ui/ActionMenu';
import { downloadBlob, downloadTextFile } from '@/features/storage/downloadFile';
import { Button } from '@/features/ui/primitives';
import { buttonClass } from '@/features/ui/styles';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import { characterFileText, safeFilename } from './characterData';
import { CharacterDataNotice } from './CharacterDataNotice';
import { CharacterSettingsModal } from './CharacterSettingsModal';
import { HitPointsPanel } from './HitPointsPanel';
import {
  LAYOUT_ZONES,
  findPanelZone,
  layoutSnapshot,
  useLayoutStore,
} from './layoutStore';
import type { Character } from './model';
import {
  AbilityScoresPanel,
  CombatPanel,
  IdentityHeader,
  PassivesPanel,
  ProficienciesPanel,
  SavingThrowsPanel,
  SessionLogQuickPanel,
  SkillsPanel,
  SpellcastingPanel,
  TrackingPanel,
  type UpdateCharacter,
} from './sections';
import { SheetStatusBar } from './SheetStatusBar';
import { SortablePanel, SortableZone } from './SortablePanel';
import { useWideLayout } from './layoutMeta';
import { SheetSyncContext, useSheetSync } from './sync';
import { SheetTabs } from './tabs';
import { useCharacter, useCharacterStore } from './store';
import { useCharacterLabels } from './useCharacterLabels';

type SheetEdition = '2024' | '2014';

export function CharacterSheetPage() {
  const { t } = useT();
  const { id } = useParams();
  const character = useCharacter(id);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);
  const update = useCallback<UpdateCharacter>(
    (patch) => updateCharacter(id!, patch),
    [id, updateCharacter],
  );
  const sync = useSheetSync(character, update);
  useSeo(character?.name || t('character.unnamed'), undefined, false);

  if (!character) {
    return (
      <div className="page-shell page-shell-wide">
        <h1 className="page-title">{t('character.sheet.notFoundTitle')}</h1>
        <p className="page-description mb-6">{t('character.sheet.notFound')}</p>
        <CharacterDataNotice />
        <Link to="/character" className={buttonClass({ variant: 'primary' })}>
          {t('character.sheet.backToCharacters')}
        </Link>
      </div>
    );
  }

  return (
    <SheetSyncContext.Provider value={sync.computed}>
      <CharacterSheetBody
        character={character}
        update={update}
        computed={sync.computed}
      />
    </SheetSyncContext.Provider>
  );
}

function CharacterSheetBody({
  character,
  update,
  computed,
}: {
  character: Character;
  update: UpdateCharacter;
  computed: Partial<Character> | null;
}) {
  const { t } = useT();
  const labels = useCharacterLabels();
  const wide = useWideLayout();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [layoutMessage, setLayoutMessage] = useState('');
  const [exporting, setExporting] = useState<SheetEdition | null>(null);
  const zones = useLayoutStore((s) => s.zones);
  const mobileOrder = useLayoutStore((s) => s.mobileOrder);
  const movePanel = useLayoutStore((s) => s.movePanel);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );
  const name = character.name.trim() || t('character.unnamed');
  const label = labels(character);
  const summary = [
    t('character.list.level', { level: character.level }),
    label.className,
    label.species,
  ]
    .filter(Boolean)
    .join(' - ');

  const panelElements: Record<string, ReactNode> = {
    abilities: <AbilityScoresPanel character={character} update={update} />,
    savingThrows: <SavingThrowsPanel character={character} update={update} />,
    passives: <PassivesPanel character={character} />,
    combat: <CombatPanel character={character} update={update} />,
    hitPoints: <HitPointsPanel character={character} update={update} />,
    tabs: <SheetTabs character={character} update={update} />,
    skills: <SkillsPanel character={character} update={update} />,
    proficiencies: <ProficienciesPanel character={character} update={update} />,
    tracking: <TrackingPanel character={character} update={update} />,
    spellcasting: <SpellcastingPanel character={character} />,
    sessionLog: <SessionLogQuickPanel />,
  };

  const exportJson = () => {
    try {
      downloadTextFile(
        characterFileText([character], layoutSnapshot()),
        `${safeFilename(name, 'character')}.json`,
      );
      setMessage({ text: t('character.sheet.exported'), error: false });
    } catch {
      setMessage({ text: t('character.data.downloadFailed'), error: true });
    }
  };

  const exportPdf = async (edition: SheetEdition) => {
    setExporting(edition);
    setMessage({ text: t('character.sheet.filling'), error: false });
    try {
      const { fillCharacterSheetPdf } = await import('./pdfExport');
      const blob = await fillCharacterSheetPdf(character, edition, {
        className: label.className,
        subclass: character.subclass.replace(/\|.*$/, ''),
        species: label.species,
        background: label.background,
      });
      downloadBlob(blob, `${safeFilename(name, 'character')}-${edition}.pdf`);
      setMessage({ text: t('character.sheet.pdfReady', { edition }), error: false });
    } catch {
      setMessage({
        text: t('character.sheet.pdfFailedMessage', { edition }),
        error: true,
      });
    } finally {
      setExporting(null);
    }
  };

  const handleDragStart = (event: DragStartEvent) => setActiveId(String(event.active.id));
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const zone = findPanelZone(zones, String(over.id));
    if (!zone) return;
    movePanel(String(active.id), zone, zones[zone].indexOf(String(over.id)));
  };

  return (
    <div className="page-shell page-shell-wide">
      <Link to="/character" className="back-link">
        <ArrowLeft size={16} aria-hidden="true" /> {t('character.list.title')}
      </Link>
      <header className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">{name}</h1>
          {summary && <p className="page-description mt-1">{summary}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-end">
          <Button onClick={() => setSettingsOpen(true)}>
            <Settings size={16} aria-hidden="true" /> {t('character.sheet.settings')}
          </Button>
          <ActionMenu
            label={t('common.exportOptions')}
            buttonClassName="w-full"
            items={[
              {
                id: 'json',
                label: t('character.sheet.export'),
                icon: <Download size={16} aria-hidden="true" />,
                onSelect: exportJson,
              },
              ...(['2024', '2014'] as const).map((edition) => ({
                id: `pdf-${edition}`,
                label: t('character.sheet.sheetEdition', { edition }),
                icon: <FileText size={16} aria-hidden="true" />,
                disabled: exporting !== null,
                onSelect: () => void exportPdf(edition),
              })),
            ]}
          />
        </div>
      </header>

      <CharacterDataNotice />
      {message && (
        <p
          role={message.error ? 'alert' : 'status'}
          className={`mb-4 ${message.error ? 'notice notice-error' : 'notice'}`}
        >
          {message.text}
        </p>
      )}

      <SheetStatusBar character={character} update={update} />

      {settingsOpen && (
        <CharacterSettingsModal
          character={character}
          update={update}
          computed={computed}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <p role="status" className="sr-only">
        {layoutMessage}
      </p>

      <div className="flex flex-col gap-4">
        <IdentityHeader character={character} update={update} />

        {wide ? (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
            <div className="grid grid-cols-12 gap-4">
              {LAYOUT_ZONES.map((zone) => (
                <div
                  key={zone}
                  className={zone === 'center' ? 'col-span-6' : 'col-span-3'}
                >
                  <SortableZone panelIds={zones[zone]}>
                    {zones[zone].map((panelId) => (
                      <SortablePanel
                        key={panelId}
                        id={panelId}
                        wide
                        onMoved={setLayoutMessage}
                      >
                        {panelElements[panelId]}
                      </SortablePanel>
                    ))}
                  </SortableZone>
                </div>
              ))}
            </div>
            <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
              {activeId && (
                <div className="opacity-95 shadow-2xl shadow-black/50">
                  {panelElements[activeId]}
                </div>
              )}
            </DragOverlay>
          </DndContext>
        ) : (
          <DndContext>
            <SortableZone panelIds={mobileOrder}>
              {mobileOrder.map((panelId) => (
                <SortablePanel
                  key={panelId}
                  id={panelId}
                  wide={false}
                  onMoved={setLayoutMessage}
                >
                  {panelElements[panelId]}
                </SortablePanel>
              ))}
            </SortableZone>
          </DndContext>
        )}
      </div>
    </div>
  );
}
