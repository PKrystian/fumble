import { Button } from '@/features/ui/primitives';
import { panelClass } from '@/features/ui/styles';
import { downloadStoredBackup } from '@/features/data/emergencyBackup';
import { Component, type ReactNode } from 'react';
import { reloadPage } from './reload';

interface AppErrorBoundaryProps {
  children: ReactNode;
  title: string;
  message: string;
  reloadLabel: string;
  backupLabel: string;
  backupDoneMessage: string;
  backupFailedMessage: string;
}

interface AppErrorBoundaryState {
  failed: boolean;
  backup: 'idle' | 'done' | 'failed';
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { failed: false, backup: 'idle' };

  static getDerivedStateFromError(): Partial<AppErrorBoundaryState> {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="flex min-h-full items-center justify-center bg-ink-950 p-6">
        <div role="alert" className={panelClass('w-full max-w-lg p-6 text-center')}>
          <h1 className="page-title">{this.props.title}</h1>
          <p className="mt-3 text-ink-200">{this.props.message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button onClick={reloadPage} variant="primary">
              {this.props.reloadLabel}
            </Button>
            <Button
              onClick={() =>
                this.setState({ backup: downloadStoredBackup() ? 'done' : 'failed' })
              }
            >
              {this.props.backupLabel}
            </Button>
          </div>
          <p aria-live="polite" className="mt-4 min-h-6 text-sm text-ink-300">
            {this.state.backup === 'done' && this.props.backupDoneMessage}
            {this.state.backup === 'failed' && this.props.backupFailedMessage}
          </p>
        </div>
      </main>
    );
  }
}
