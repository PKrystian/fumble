import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createCharacter } from './model';
import { CharacterSheetPage } from './CharacterSheetPage';

const mocks = vi.hoisted(() => ({
  character: undefined as ReturnType<typeof createCharacter> | undefined,
  saveCharacter: vi.fn(),
  updateCharacter: vi.fn(),
  movePanel: vi.fn(),
  fillPdf: vi.fn(),
  alertDialog: vi.fn(),
  syncClassFeatures: vi.fn(() => ({ hitDice: '1d8' })),
}));

vi.mock('./store', () => ({
  useCharacter: () => mocks.character,
  useCharacterStore: (
    selector: (state: {
      saveCharacter: typeof mocks.saveCharacter;
      updateCharacter: typeof mocks.updateCharacter;
    }) => unknown,
  ) =>
    selector({
      saveCharacter: mocks.saveCharacter,
      updateCharacter: mocks.updateCharacter,
    }),
}));

vi.mock('./compendiumSync', () => ({
  useClassEntryPair: () => ({
    localized: { name: 'Wizard' },
    english: { name: 'Wizard' },
  }),
  useSpeciesEntryPair: () => ({ localized: { name: 'Elf' }, english: { name: 'Elf' } }),
  useBackgroundEntryPair: () => ({
    localized: { name: 'Sage' },
    english: { name: 'Sage' },
  }),
  useSpellIndex: () => new Map(),
  findSubclassPair: () => ({
    localized: { name: 'Evoker' },
    english: { name: 'Evoker' },
  }),
  syncClassFeatures: () => mocks.syncClassFeatures(),
}));

const zones = {
  left: ['abilities', 'savingThrows'],
  center: ['tabs'],
  right: ['combat'],
};

vi.mock('./layoutStore', () => {
  const useLayoutStore = (
    selector: (state: {
      zones: typeof zones;
      movePanel: typeof mocks.movePanel;
    }) => unknown,
  ) => selector({ zones, movePanel: mocks.movePanel });
  useLayoutStore.getState = () => ({ zones });
  return { useLayoutStore };
});

vi.mock('./sections', () => {
  const panel = (name: string) => () => <div>{name}</div>;
  return {
    AbilityScoresPanel: panel('Abilities panel'),
    CombatPanel: panel('Combat panel'),
    HitPointsPanel: panel('Hit points panel'),
    IdentityHeader: ({
      update,
    }: {
      update: (patch: Record<string, unknown>) => void;
    }) => (
      <button type="button" onClick={() => update({ name: 'Updated' })}>
        Identity
      </button>
    ),
    PassivesPanel: panel('Passives panel'),
    ProficienciesPanel: panel('Proficiencies panel'),
    SavingThrowsPanel: panel('Saving throws panel'),
    SessionLogQuickPanel: panel('Session log panel'),
    SkillsPanel: panel('Skills panel'),
    SpellcastingPanel: panel('Spellcasting panel'),
    TrackingPanel: panel('Tracking panel'),
  };
});

vi.mock('./tabs', () => ({
  SheetTabs: () => <div>Tabs panel</div>,
}));

vi.mock('./SortablePanel', () => ({
  SortablePanel: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SortableZone: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock('./CharacterSettingsModal', () => ({
  CharacterSettingsModal: ({
    onClose,
    update,
  }: {
    onClose: () => void;
    update: (patch: Record<string, unknown>) => void;
  }) => (
    <div>
      <button type="button" onClick={() => update({ level: 2 })}>
        Update settings
      </button>
      <button type="button" onClick={onClose}>
        Close settings
      </button>
    </div>
  ),
}));

vi.mock('./pdfExport', () => ({
  fillCharacterSheetPdf: (...args: unknown[]) => mocks.fillPdf(...args),
}));

vi.mock('@/features/ui/confirmStore', () => ({
  alertDialog: (...args: unknown[]) => mocks.alertDialog(...args),
}));

vi.mock('@dnd-kit/core', () => ({
  PointerSensor: function PointerSensor() {},
  useSensor: () => ({}),
  useSensors: () => [],
  DragOverlay: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DndContext: ({
    children,
    onDragStart,
    onDragEnd,
    onDragCancel,
  }: {
    children: ReactNode;
    onDragStart: (event: { active: { id: string } }) => void;
    onDragEnd: (event: { active: { id: string }; over: { id: string } | null }) => void;
    onDragCancel: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onDragStart({ active: { id: 'abilities' } })}>
        Start drag
      </button>
      <button
        type="button"
        onClick={() =>
          onDragEnd({ active: { id: 'abilities' }, over: { id: 'savingThrows' } })
        }
      >
        End drag
      </button>
      <button
        type="button"
        onClick={() => onDragEnd({ active: { id: 'abilities' }, over: null })}
      >
        Drop nowhere
      </button>
      <button
        type="button"
        onClick={() =>
          onDragEnd({ active: { id: 'abilities' }, over: { id: 'unknown' } })
        }
      >
        Drop unknown
      </button>
      <button type="button" onClick={onDragCancel}>
        Cancel drag
      </button>
      {children}
    </div>
  ),
}));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/character/test']}>
      <Routes>
        <Route path="/character/:id" element={<CharacterSheetPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CharacterSheetPage', () => {
  beforeEach(() => {
    mocks.character = undefined;
    mocks.saveCharacter.mockReset();
    mocks.updateCharacter.mockReset();
    mocks.movePanel.mockReset();
    mocks.fillPdf.mockReset();
    mocks.fillPdf.mockResolvedValue(new Blob(['pdf']));
    mocks.alertDialog.mockReset();
    mocks.syncClassFeatures.mockClear();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
  });

  it('shows a missing character state', () => {
    renderPage();
    expect(screen.getByText('This character could not be found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to characters' })).toBeInTheDocument();
  });

  it('auto-syncs, updates fields, settings and panel layout', () => {
    mocks.character = {
      ...createCharacter('Hero'),
      id: 'test',
      autoSyncFeatures: true,
      className: 'Wizard',
      subclass: 'Evoker',
      species: 'Elf',
      background: 'Sage',
    };
    renderPage();
    expect(mocks.syncClassFeatures).toHaveBeenCalled();
    expect(mocks.updateCharacter).toHaveBeenCalledWith('test', { hitDice: '1d8' });

    fireEvent.click(screen.getByRole('button', { name: 'Identity' }));
    expect(mocks.updateCharacter).toHaveBeenCalledWith('test', { name: 'Updated' });
    fireEvent.click(screen.getByRole('button', { name: 'Character Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Update settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close settings' }));

    fireEvent.click(screen.getByRole('button', { name: 'Start drag' }));
    expect(screen.getAllByText('Abilities panel').length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('button', { name: 'End drag' }));
    expect(mocks.movePanel).toHaveBeenCalledWith('abilities', 'left', 1);
    fireEvent.click(screen.getByRole('button', { name: 'Drop nowhere' }));
    fireEvent.click(screen.getByRole('button', { name: 'Drop unknown' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel drag' }));
  });

  it('exports JSON and both PDF editions', async () => {
    mocks.character = { ...createCharacter('Hero'), id: 'test' };
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(URL.createObjectURL).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Sheet (2024)' }));
    await waitFor(() =>
      expect(mocks.fillPdf).toHaveBeenCalledWith(mocks.character, '2024'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sheet (2014)' }));
    await waitFor(() =>
      expect(mocks.fillPdf).toHaveBeenCalledWith(mocks.character, '2014'),
    );
  });

  it('reports PDF export failures', async () => {
    mocks.character = { ...createCharacter(''), id: 'test' };
    mocks.fillPdf.mockRejectedValue(new Error('failed'));
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Export' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sheet (2024)' }));
    await waitFor(() => expect(mocks.alertDialog).toHaveBeenCalled());
    mocks.fillPdf.mockResolvedValue(new Blob());
    fireEvent.click(screen.getByRole('button', { name: 'Sheet (2014)' }));
    await waitFor(() => expect(URL.createObjectURL).toHaveBeenCalled());
  });

  it('does not auto-sync when the setting is disabled', () => {
    mocks.character = {
      ...createCharacter('Hero'),
      id: 'test',
      autoSyncFeatures: false,
    };
    renderPage();
    expect(mocks.syncClassFeatures).not.toHaveBeenCalled();
  });
});
