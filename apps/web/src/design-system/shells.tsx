import { useEffect, useRef, type ReactNode } from 'react';
import { BrandLockup } from './components';
import { visibleCreatorNavigation } from './creator-navigation-visibility';
import { Icon, type IconName } from './Icon';
import './listener-trust.css';

export type CreatorNavigationItem = {
  icon: IconName;
  label: string;
  onSelect: () => void;
  shortLabel: string;
};

export type CreatorWorkspaceOption = {
  id: string;
  name: string;
};

function creatorFacingLabel(label: string): string {
  return label === 'Analytics' ? 'Stats' : label;
}

export function CreatorShell({
  actions,
  activeLabel,
  children,
  eyebrow,
  navigation,
  onWorkspaceChange,
  title,
  workspaceDescription = 'Sign in to load organisation access',
  workspaceId,
  workspaceName = 'Creator workspace',
  workspaceOptions = [],
  workspaceSelectionDisabled = false,
}: {
  actions?: ReactNode;
  activeLabel: string;
  children: ReactNode;
  eyebrow: string;
  navigation: CreatorNavigationItem[];
  onWorkspaceChange?: (organisationId: string) => void;
  title: string;
  workspaceDescription?: string;
  workspaceId?: string | undefined;
  workspaceName?: string;
  workspaceOptions?: CreatorWorkspaceOption[];
  workspaceSelectionDisabled?: boolean;
}) {
  const visibleNavigation = visibleCreatorNavigation(navigation);
  const primaryMobileNavigation = visibleNavigation.slice(0, 4);
  const secondaryMobileNavigation = visibleNavigation.slice(4);
  const mainContentRef = useRef<HTMLElement>(null);
  const previousActiveLabel = useRef(activeLabel);
  const canSwitchWorkspace =
    workspaceOptions.length > 1 && Boolean(workspaceId) && Boolean(onWorkspaceChange);
  const visibleActiveLabel = creatorFacingLabel(activeLabel);
  const visibleTitle = creatorFacingLabel(title);

  useEffect(() => {
    if (previousActiveLabel.current === activeLabel) return;

    previousActiveLabel.current = activeLabel;
    window.requestAnimationFrame(() => {
      mainContentRef.current?.focus({ preventScroll: true });
    });
  }, [activeLabel]);

  function workspaceSelect() {
    if (!canSwitchWorkspace || !workspaceId || !onWorkspaceChange) return null;

    return (
      <select
        aria-label="Switch creator workspace"
        className="ds-workspace-select"
        disabled={workspaceSelectionDisabled}
        onChange={(event) => onWorkspaceChange(event.target.value)}
        value={workspaceId}
      >
        {workspaceOptions.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="ds-creator-shell">
      <a className="ds-skip-link" href="#ds-main-content">Skip to main content</a>

      <aside className="ds-creator-sidebar" aria-label="Creator workspace navigation">
        <a className="ds-shell-brand-link" href="/" aria-label="Echoo creator home">
          <BrandLockup />
        </a>

        <nav className="ds-creator-navigation">
          {visibleNavigation.map((item) => {
            const active = item.label === activeLabel;
            return (
              <button
                aria-current={active ? 'page' : undefined}
                className={active ? 'ds-shell-nav-item active' : 'ds-shell-nav-item'}
                key={item.label}
                onClick={item.onSelect}
                type="button"
              >
                <Icon name={item.icon} />
                <span>{creatorFacingLabel(item.label)}</span>
              </button>
            );
          })}
        </nav>

        <section className="ds-workspace-summary" aria-label="Current workspace">
          <span>Workspace</span>
          {canSwitchWorkspace ? workspaceSelect() : <strong>{workspaceName}</strong>}
          <small>{workspaceDescription}</small>
        </section>
      </aside>

      <header className="ds-creator-topbar">
        <div className="ds-page-heading">
          <span>{eyebrow}</span>
          <h1>{visibleTitle}</h1>
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {visibleActiveLabel} page opened. Current workspace: {workspaceName}.
        </p>
        {canSwitchWorkspace ? (
          <label className="ds-creator-workspace-compact">
            <span>Workspace</span>
            {workspaceSelect()}
          </label>
        ) : null}
        {actions ? (
          <div className="ds-creator-account-area" aria-label="Signed-in account actions">
            <div className="ds-creator-account-summary">
              <span className="ds-creator-account-label">Account</span>
              <span className="ds-creator-account-identity" title={workspaceDescription}>
                Signed in as {workspaceDescription}
              </span>
            </div>
            <div className="ds-topbar-actions">{actions}</div>
            <details className="ds-mobile-account-menu">
              <summary aria-label="Open account and workspace menu">
                <Icon name="user" />
              </summary>
              <div className="ds-mobile-account-popover">
                <div>
                  <strong>{workspaceName}</strong>
                  <span>Signed in as {workspaceDescription}</span>
                </div>
                {canSwitchWorkspace ? workspaceSelect() : null}
                <div className="ds-mobile-account-actions">{actions}</div>
              </div>
            </details>
          </div>
        ) : null}
      </header>

      <main
        className="ds-creator-content"
        id="ds-main-content"
        ref={mainContentRef}
        tabIndex={-1}
      >
        {children}
      </main>

      <nav className="ds-creator-mobile-nav" aria-label="Creator mobile navigation">
        {primaryMobileNavigation.map((item) => {
          const active = item.label === activeLabel;
          return (
            <button
              aria-current={active ? 'page' : undefined}
              className={active ? 'active' : ''}
              key={item.label}
              onClick={item.onSelect}
              type="button"
            >
              <Icon name={item.icon} />
              <span>{item.shortLabel}</span>
            </button>
          );
        })}
        {secondaryMobileNavigation.length > 0 ? (
          <details className="ds-creator-mobile-more">
            <summary aria-label="More creator destinations">
              <Icon name="menu" />
              <span>More</span>
            </summary>
            <div className="ds-creator-mobile-more-menu">
              {secondaryMobileNavigation.map((item) => {
                const active = item.label === activeLabel;
                return (
                  <button
                    aria-current={active ? 'page' : undefined}
                    className={active ? 'active' : ''}
                    key={item.label}
                    onClick={item.onSelect}
                    type="button"
                  >
                    <Icon name={item.icon} />
                    <span>{creatorFacingLabel(item.label)}</span>
                  </button>
                );
              })}
            </div>
          </details>
        ) : null}
      </nav>
    </div>
  );
}

export function ListenerShell({
  children,
  current,
  footer,
}: {
  children: ReactNode;
  current: 'discover' | 'live' | 'replay';
  footer?: ReactNode;
}) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/listen';
  const replayRoute =
    pathname === '/listen/replays' ||
    pathname.startsWith('/listen/replay/') ||
    pathname.startsWith('/listen/member-replay/');
  const nestedBroadcastRoute =
    pathname.startsWith('/listen/') && !replayRoute;
  const resolvedCurrent = replayRoute ? 'replay' : nestedBroadcastRoute ? null : current;
  const resolvedFooter = nestedBroadcastRoute
    ? 'Echoo automatically selects a healthy playback path and recovers short interruptions when possible.'
    : footer ??
      'Echoo delivers professional live audio for creators, churches and communities.';

  return (
    <div className="listener-page ds-listener-shell">
      <a className="ds-skip-link" href="#ds-listener-content">Skip to main content</a>

      <header className="ds-listener-header">
        <a className="ds-shell-brand-link" href="/listen" aria-label="Echoo listener home">
          <BrandLockup />
        </a>
        <nav aria-label="Listener navigation">
          <a aria-current={resolvedCurrent === 'discover' ? 'page' : undefined} href="/listen">
            Discover
          </a>
          <a aria-current={resolvedCurrent === 'live' ? 'page' : undefined} href="/listen?status=live">
            Live now
          </a>
          <a aria-current={resolvedCurrent === 'replay' ? 'page' : undefined} href="/listen/replays">
            Replays
          </a>
        </nav>
        <a className="ds-listener-creator-link" href="/">
          Creator workspace
          <Icon name="arrow-right" size={17} />
        </a>
      </header>

      <main className="ds-listener-content" id="ds-listener-content">
        {children}
      </main>

      <footer className="ds-listener-footer">{resolvedFooter}</footer>
    </div>
  );
}
