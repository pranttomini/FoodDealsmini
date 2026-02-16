import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="text-7xl mb-6">🍕</div>
            <h1 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Oops!</h1>
            <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
              Something went wrong. Don't worry — just reload and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-orange-500 text-white px-8 py-3 rounded-xl font-bold shadow-md shadow-orange-500/20 hover:bg-orange-600 transition-colors"
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
