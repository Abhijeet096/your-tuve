import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Unhandled render error:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="p-8 max-w-lg mx-auto text-center">
          <h1 className="text-lg font-semibold mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-600 mb-4">{this.state.error.message}</p>
          <button
            className="px-4 py-2 bg-black text-white rounded"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
