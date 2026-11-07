import { Button } from '@/features/ui/primitives';
import { Component, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
  title: string;
  message: string;
  reloadLabel: string;
}

interface AppErrorBoundaryState {
  failed: boolean;
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="flex min-h-full items-center justify-center bg-ink-950 p-6">
        <div
          role="alert"
          className="w-full max-w-lg rounded-xl border border-red-900 bg-ink-900 p-6 text-center"
        >
          <h1 className="text-ink-50 page-title">{this.props.title}</h1>
          <p className="mt-3 text-ink-200">{this.props.message}</p>
          <Button
            type="button"
            onClick={() => window.location.reload()}
            variant="primary"
            className="mt-6"
          >
            {this.props.reloadLabel}
          </Button>
        </div>
      </main>
    );
  }
}
