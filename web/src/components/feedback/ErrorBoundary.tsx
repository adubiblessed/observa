import React, { type ErrorInfo, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  onReset?: () => void;
  variant?: "full-screen" | "panel";
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const {
        fallbackTitle = "Something went wrong",
        fallbackDescription = "An unexpected error occurred while rendering this section. The rest of the application remains available.",
        variant = "panel",
      } = this.props;

      if (variant === "full-screen") {
        return (
          <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-on-surface">
            <div className="mb-6">
              <Logo size="lg" />
            </div>
            <div className="max-w-md rounded-lg border border-outline-variant bg-surface p-6 shadow-modal">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-error/15 text-error">
                <Icon name="error" className="text-[24px]" />
              </div>
              <h2 className="text-headline-md font-semibold text-on-surface">{fallbackTitle}</h2>
              <p className="mt-2 text-body-sm text-on-surface-variant">{fallbackDescription}</p>
              {this.state.error ? (
                <pre className="mt-3 max-h-32 overflow-auto rounded bg-surface-container-lowest p-2 text-left font-code-sm text-[11px] text-error">
                  {this.state.error.message}
                </pre>
              ) : null}
              <div className="mt-6 flex justify-center gap-3">
                <Button variant="outline" size="md" onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
                <Button variant="primaryContainer" size="md" onClick={this.handleReset}>
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded border border-outline-variant/60 bg-surface-container-lowest p-6 text-center">
          <Icon name="warning" className="mb-2 text-[24px] text-warning" />
          <h4 className="text-body-md font-semibold text-on-surface">{fallbackTitle}</h4>
          <p className="mt-1 max-w-sm text-body-sm text-on-surface-variant">{fallbackDescription}</p>
          <div className="mt-4">
            <Button variant="outline" size="sm" onClick={this.handleReset}>
              Retry Section
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
