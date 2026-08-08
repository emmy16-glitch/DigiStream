import type { ReactNode } from 'react';
import './echoo-system-state.css';

export type EchooSystemStateKind =
  | 'loading'
  | 'offline'
  | 'session-expired'
  | 'not-found'
  | 'error';

type EchooSystemStatePageProps = {
  kind: EchooSystemStateKind;
  title: string;
  children: ReactNode;
  actionLabel?: string;
  actionHref?: string;
  embedded?: boolean;
  onAction?: (() => void) | undefined;
};

function EchooStateIcon({ kind }: { kind: EchooSystemStateKind }) {
  if (kind === 'loading') {
    return <span className="echoo-system-spinner" aria-hidden="true" />;
  }

  if (kind === 'offline') {
    return (
      <svg className="echoo-system-icon is-danger" aria-hidden="true" viewBox="0 0 64 64">
        <path d="M10 25c12-11 32-11 44 0M17 33c8-7 22-7 30 0M24 41c4-4 12-4 16 0" />
        <path d="M10 10 54 54" />
        <circle cx="32" cy="50" r="2.5" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (kind === 'session-expired') {
    return (
      <svg className="echoo-system-icon" aria-hidden="true" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="22" />
        <path d="M32 19v14l10 6" />
      </svg>
    );
  }

  return (
    <svg className="echoo-system-icon is-danger" aria-hidden="true" viewBox="0 0 64 64">
      <path d="M19 8h19l9 9v35a4 4 0 0 1-4 4H19a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4Z" />
      <path d="M38 8v11h9M25 28l14 14M39 28 25 42" />
    </svg>
  );
}

export function EchooSystemStatePage({
  actionHref,
  actionLabel,
  children,
  embedded = false,
  kind,
  onAction,
  title,
}: EchooSystemStatePageProps) {
  const content = (
    <section className="echoo-system-card" aria-labelledby="echoo-system-title">
      <header className="echoo-system-brand-row">
        <span className="echoo-system-mark" aria-label="Echoo">
          <i />
          <i />
        </span>
        <span>Echoo</span>
      </header>

      <div className="echoo-system-content" role={kind === 'loading' ? 'status' : undefined}>
        <EchooStateIcon kind={kind} />
        <h1 id="echoo-system-title">{title}</h1>
        <p>{children}</p>
      </div>

      {actionLabel ? (
        actionHref ? (
          <a className="echoo-system-action" href={actionHref}>{actionLabel}</a>
        ) : (
          <button className="echoo-system-action" onClick={onAction} type="button">
            {actionLabel}
          </button>
        )
      ) : (
        <span className="echoo-system-action-spacer" aria-hidden="true" />
      )}
    </section>
  );

  if (embedded) {
    return (
      <section className={`echoo-system-page echoo-system-page-${kind} is-embedded`}>
        {content}
      </section>
    );
  }

  return (
    <main className={`echoo-system-page echoo-system-page-${kind}`}>
      {content}
    </main>
  );
}
