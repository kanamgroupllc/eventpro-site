import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getOrCreateCorrelationId } from "@/lib/correlation";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
  correlationId: string | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, correlationId: null };

  static getDerivedStateFromError(): State {
    return { failed: true, correlationId: getOrCreateCorrelationId() };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unexpected page error", { error, componentStack: info.componentStack });
  }

  private retry = (): void => {
    this.setState({ failed: false, correlationId: null });
  };

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <Card className="max-w-lg p-8 text-center">
          <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-destructive" />
          <h1 className="text-2xl font-bold mb-2">This page couldn't finish loading</h1>
          <p className="text-muted-foreground mb-5">
            Your account and saved cart are safe. Try the page again, or reload the application.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-2">
            <Button onClick={this.retry}>Try Again</Button>
            <Button variant="outline" onClick={() => window.location.reload()}>Reload Application</Button>
          </div>
          {this.state.correlationId && (
            <p className="text-xs text-muted-foreground mt-5">
              Support ID: <span className="font-mono">{this.state.correlationId}</span>
            </p>
          )}
        </Card>
      </div>
    );
  }
}
