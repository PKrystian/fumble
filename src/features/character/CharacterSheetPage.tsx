import { type ReactNode, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Settings } from 'lucide-react';
import { Link } from '@/i18n/path';
import { useT } from '@/i18n/useT';
import { useSeo } from '@/seo/useSeo';
import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { alertDialog } from '@/features/ui/confirmStore';
import { type Character } from './model';
import { useCharacter, useCharacterStore } from './store';
import {
  AbilityScoresPanel,
  CombatPanel,
  HitPointsPanel,
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
import { SheetTabs } from './tabs';
import {
  findSubclassPair,
  syncClassFeatures,
  useSpellIndex,
  useBackgroundEntryPair,
  useClassEntryPair,
  useSpeciesEntryPair,
} from './compendiumSync';
import { CharacterSettingsModal } from './CharacterSettingsModal';
import { type LayoutZone, useLayoutStore } from './layoutStore';
import { SortablePanel, SortableZone } from './SortablePanel';
import { type SheetEdition, fillCharacterSheetPdf } from './pdfExport';

function findZone(
  zones: Record<LayoutZone, string[]>,
  id: string,
): LayoutZone | undefined {
  return (Object.keys(zones) as LayoutZone[]).find((zone) => zones[zone].includes(id));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportCharacter(character: Character) {
  const payload = {
    version: 1,
    character,

    layout: useLayoutStore.getState().zones,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  downloadBlob(blob, `${character.name || 'character'}.json`);
}

async function exportCharacterSheetPdf(
  character: Character,
  edition: SheetEdition,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  try {
    const blob = await fillCharacterSheetPdf(character, edition);
    downloadBlob(blob, `${character.name || 'character'}-${edition}.pdf`);
  } catch {
    await alertDialog(t('character.sheet.pdfFailedMessage', { edition }), {
      title: t('character.sheet.pdfFailedTitle'),
    });
  }
}

export function CharacterSheetPage() {
  const { t } = useT();
  const { id } = useParams();
  const character = useCharacter(id);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);

  const classPair = useClassEntryPair(character?.className ?? '');
  const speciesPair = useSpeciesEntryPair(character?.species ?? '');
  const backgroundPair = useBackgroundEntryPair(character?.background ?? '');
  const spellIndex = useSpellIndex();
  useSeo(character?.name || t('character.unnamed'), undefined, false);
  const cls = classPair.localized;
  const species = speciesPair.localized;
  const background = backgroundPair.localized;
  const subclassPair = findSubclassPair(classPair, character?.subclass ?? '');
  const subclassEntry = subclassPair.localized;

  useEffect(() => {
    if (!character || !character.autoSyncFeatures) return;
    const patch = syncClassFeatures(character, cls, subclassEntry, species, background, {
      cls: classPair.english,
      background: backgroundPair.english,
      subclass: subclassPair.english,
      spellIndex,
    });
    updateCharacter(character.id, patch);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    character?.className,
    character?.subclass,
    character?.level,
    character?.species,
    character?.background,
    character?.autoSyncFeatures,
    cls,
    subclassEntry,
    species,
    background,
    spellIndex,
  ]);

  if (!character) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="mb-4 text-ink-200">{t('character.sheet.notFound')}</p>
        <Link
          to="/character"
          className="rounded-lg bg-arcane-700 px-4 py-2 font-medium text-ink-50 hover:bg-arcane-500"
        >
          {t('character.sheet.backToCharacters')}
        </Link>
      </div>
    );
  }

  const update: UpdateCharacter = (patch) => updateCharacter(character.id, patch);

  return <CharacterSheetBody character={character} update={update} />;
}

function CharacterSheetBody({
  character,
  update,
}: {
  character: Character;
  update: UpdateCharacter;
}) {
  const { t } = useT();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pdfExporting, setPdfExporting] = useState<SheetEdition | null>(null);
  const zones = useLayoutStore((s) => s.zones);
  const movePanel = useLayoutStore((s) => s.movePanel);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

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

  const resolveOverZone = (
    overId: string,
  ): { zone: LayoutZone; index: number } | undefined => {
    const zone = findZone(zones, overId);
    if (!zone) return undefined;
    return { zone, index: zones[zone].indexOf(overId) };
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const target = resolveOverZone(over.id as string);
    if (!target) return;
    movePanel(active.id as string, target.zone, target.index);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 2xl:max-w-[min(92vw,120rem)]">
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/character"
          className="inline-flex items-center gap-1 text-sm text-ink-300 hover:text-ink-50"
        >
          <ArrowLeft size={16} /> {t('character.list.title')}
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-2 text-sm text-ink-200 hover:bg-ink-800"
          >
            <Settings size={16} /> {t('character.sheet.settings')}
          </button>
          <button
            type="button"
            onClick={() => exportCharacter(character)}
            className="inline-flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-2 text-sm text-ink-200 hover:bg-ink-800"
          >
            <Download size={16} /> {t('character.sheet.export')}
          </button>
          {(['2024', '2014'] as const).map((edition) => (
            <button
              key={edition}
              type="button"
              disabled={pdfExporting !== null}
              onClick={async () => {
                setPdfExporting(edition);
                await exportCharacterSheetPdf(character, edition, t);
                setPdfExporting(null);
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-ink-700 px-3 py-2 text-sm text-ink-200 hover:bg-ink-800 disabled:cursor-wait disabled:opacity-50"
            >
              <FileText size={16} />
              {pdfExporting === edition
                ? t('character.sheet.filling')
                : t('character.sheet.sheetEdition', { edition })}
            </button>
          ))}
        </div>
      </div>

      {settingsOpen && (
        <CharacterSettingsModal
          character={character}
          update={update}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      <div className="flex flex-col gap-4">
        <IdentityHeader character={character} update={update} />

        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            {(['left', 'center', 'right'] as const).map((zone) => (
              <div
                key={zone}
                className={zone === 'center' ? 'lg:col-span-6' : 'lg:col-span-3'}
              >
                <SortableZone panelIds={zones[zone]}>
                  {zones[zone].map((panelId) => (
                    <SortablePanel key={panelId} id={panelId}>
                      {panelElements[panelId]}
                    </SortablePanel>
                  ))}
                </SortableZone>
              </div>
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
            {activeId && (
              <div className="rotate-1 rounded-xl opacity-95 shadow-2xl shadow-black/50">
                {panelElements[activeId]}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
