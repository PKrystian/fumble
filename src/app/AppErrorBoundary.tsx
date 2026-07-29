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
          <h1 className="font-display text-2xl font-bold text-ink-50">
            {this.props.title}
          </h1>
          <p className="mt-3 text-ink-200">{this.props.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-arcane-700 px-4 py-2 font-medium text-ink-50 hover:bg-arcane-500"
          >
            {this.props.reloadLabel}
          </button>
        </div>
      </main>
    );
  }
}
