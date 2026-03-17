import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <p className="text-red-400 text-sm mb-2">Failed to load component</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="text-xs text-gray-400 hover:text-white underline"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
