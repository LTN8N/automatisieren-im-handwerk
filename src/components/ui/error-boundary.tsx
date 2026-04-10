"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 rounded-lg border border-destructive/50 bg-destructive/5 p-8 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <div className="space-y-1">
            <p className="font-semibold text-destructive">Etwas ist schiefgelaufen</p>
            <p className="text-sm text-muted-foreground">
              {this.state.error?.message ?? "Unbekannter Fehler"}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            <RefreshCw className="size-4" />
            Neu laden
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
