import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { BACKUP_REMINDER_KEY, recordFullBackup } from '@/features/data/backupReminder';
import { useRollStore } from '@/features/dice/rollStore';
import { BackupReminder } from './BackupReminder';

const DAY = 86_400_000;
const renderReminder = (hasData = true, path = '/', dataSince: number | null = null) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <BackupReminder hasData={hasData} dataSince={dataSince} />
    </MemoryRouter>,
  );

describe('BackupReminder', () => {
  beforeEach(() => {
    localStorage.clear();
    useRollStore.setState({ log: [], dockOpen: false });
  });

  it('stays hidden without local data or with a recent backup', () => {
    const view = renderReminder(false);
    expect(view.container).toBeEmptyDOMElement();
    view.unmount();
    const recent = renderReminder(true, '/', Date.now() - DAY);
    expect(recent.container).toBeEmptyDOMElement();
    recent.unmount();
    recordFullBackup();
    expect(renderReminder().container).toBeEmptyDOMElement();
  });

  it('offers the backup page without taking focus and postpones on dismissal', () => {
    renderReminder();
    const region = screen.getByRole('complementary', { name: 'Data backup' });
    expect(region).toHaveTextContent('no full backup has been downloaded here yet');
    expect(region).not.toContainElement(document.activeElement as HTMLElement);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('link', { name: 'Open Data backup' })).toHaveAttribute(
      'href',
      '/data/',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remind me in 30 days' }));
    expect(screen.queryByRole('complementary')).toBeNull();
    const saved = JSON.parse(localStorage.getItem(BACKUP_REMINDER_KEY)!) as {
      state: { snoozedUntil: number };
    };
    expect(saved.state.snoozedUntil).toBeGreaterThan(Date.now() + 29 * DAY);
  });

  it('states the age of an old backup in Polish', () => {
    recordFullBackup(Date.now() - 40 * DAY);
    renderReminder(true, '/pl/');
    expect(
      screen.getByText('Ostatnia pełna kopia z tej przeglądarki jest sprzed 40 dni.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Otwórz Kopię danych' })).toHaveAttribute(
      'href',
      '/pl/data/',
    );
  });

  it('yields to an open roll result dock', () => {
    useRollStore.setState({
      dockOpen: true,
      log: [{ id: 'roll' }] as never,
    });
    expect(renderReminder().container).toBeEmptyDOMElement();
  });
});
