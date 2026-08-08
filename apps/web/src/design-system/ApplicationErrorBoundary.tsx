import { Component, type ErrorInfo, type ReactNode } from 'react';
import { EchooSystemStatePage } from './EchooSystemStatePage';

type ApplicationErrorBoundaryProps = {
  children: ReactNode;
};

type ApplicationErrorBoundaryState = {
  hasError: boolean;
};

export class ApplicationErrorBoundary extends Component<
  ApplicationErrorBoundaryProps,
  ApplicationErrorBoundaryState
> {
  state: ApplicationErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ApplicationErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DigiStream application render failed', error, info.componentStack);
  }

  private reloadPage = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <EchooSystemStatePage
          actionLabel="Reload page"
          kind="error"
          onAction={this.reloadPage}
          title="Something went wrong"
        >
          DigiStream could not finish displaying this page. Reload to restore the latest state from the server.
        </EchooSystemStatePage>
      );
    }

    return this.props.children;
  }
}
