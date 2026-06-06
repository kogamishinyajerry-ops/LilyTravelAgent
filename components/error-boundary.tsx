"use client";

import { AlertTriangle } from "lucide-react";
import { Component, ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  /** Title shown in the fallback. */
  title?: string;
  /** Description shown below the title. */
  description?: string;
  /** Label for the reset button. */
  resetLabel?: string;
  /** Optional custom fallback renderer. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Optional callback fired from componentDidCatch. */
  onError?: (error: Error, info: { componentStack?: string | null }) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    console.error("ErrorBoundary caught:", error, info);
    this.props.onError?.(error, info);
  }

  private handleReset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback(error, this.handleReset);
    }

    return (
      <div
        role="alert"
        aria-live="assertive"
        style={{
          display: "grid",
          placeItems: "center",
          gap: 12,
          padding: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "grid",
            placeItems: "center",
            width: 44,
            height: 44,
            borderRadius: 8,
            color: "#fff",
            background: "var(--rust)",
          }}
        >
          <AlertTriangle size={22} aria-hidden />
        </div>
        <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
          {this.props.title ?? "页面出现错误"}
        </h2>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.5 }}>
          {this.props.description ?? error.message}
        </p>
        <button
          type="button"
          className="primary-action"
          onClick={this.handleReset}
          style={{ minHeight: 42, padding: "0 18px" }}
        >
          {this.props.resetLabel ?? "重新加载"}
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
