/* WHAT IT DO? Provides consistent loading and error surfaces for public data pages. */

import type { ReactElement } from "react";

export const LoadingState = ({ label = "Loading public accountability data..." }: { label?: string }): ReactElement => {
  return (
    <section className="page-state" aria-live="polite">
      <p>{label}</p>
    </section>
  );
};

export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }): ReactElement => {
  return (
    <section className="page-state page-state-error" role="alert">
      <h2>Unable to load data</h2>
      <p>{message}</p>
      {onRetry ? (
        <button className="button button-secondary" onClick={onRetry} type="button">
          Retry
        </button>
      ) : null}
    </section>
  );
};
