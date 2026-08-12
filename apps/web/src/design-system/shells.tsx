import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { BrandLockup, SearchField } from './components';
import { visibleCreatorNavigation } from './creator-navigation-visibility';
import { Icon, type IconName } from './Icon';
import { useModalHistoryDismiss } from '../lib/use-modal-history-dismiss';
import './listener-trust.css';

export type CreatorNavigationItem = {
  icon: IconName;
  label: string;
  onSelect: () => void;
  shortLabel: string;
};

export type CreatorWorkspaceOption = { id: string; name: string };

function creatorFacingLabel(label: string): string {
  return label === 'Analytics' ? 'Analytics' : label;
}

function navigationGroup(label: string): 'workspace' | 'audience' {
  return label === 'Studio Lobby' || label === 'Chat' ? 'audience' : 'workspace';
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
  const mobileMoreRef = useRef<HTMLDialogElement>(null);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const previousActiveLabel = useRef(activeLabel);
  const canSwitchWorkspace = workspaceOptions.length > 1 && Boolean(workspaceId) && Boolean(onWorkspaceChange);
  const closeMobileMore = useCallback(() => {
    if (mobileMoreRef.current?.open) mobileMoreRef.current.open = false;
    setMobileMoreOpen(false);
  }, []);
  const closeCommand = useCallback(() => { setCommandOpen(false); setCommandQuery(''); }, []);
  const dismissMobileMore = useModalHistoryDismiss({ active: mobileMoreOpen, onDismiss: closeMobileMore, stateKey: 'creator-mobile-more' });
  const dismissCommand = useModalHistoryDismiss({ active: commandOpen, onDismiss: closeCommand, stateKey: 'creator-command-search' });

  const workspaceNavigation = visibleNavigation.filter((item) => navigationGroup(item.label) === 'workspace');
  const audienceNavigation = visibleNavigation.filter((item) => navigationGroup(item.label) === 'audience');
  const commandResults = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return visibleNavigation;
    return visibleNavigation.filter((item) => `${item.label} ${item.shortLabel}`.toLowerCase().includes(query));
  }, [commandQuery, visibleNavigation]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches('input, textarea, select, [contenteditable="true"]');
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }
      if (!typing && event.key === '/') {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.key === 'Escape') {
        if (commandOpen) dismissCommand();
        else if (mobileMoreOpen) dismissMobileMore();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [commandOpen, dismissCommand, dismissMobileMore, mobileMoreOpen]);

  useEffect(() => {
    if (!mobileMoreOpen && !commandOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (commandOpen) window.requestAnimationFrame(() => document.querySelector<HTMLInputElement>('.ds-command-dialog input')?.focus());
    return () => { document.body.style.overflow = previousOverflow; };
  }, [commandOpen, mobileMoreOpen]);

  useEffect(() => {
    if (previousActiveLabel.current === activeLabel) return;
    previousActiveLabel.current = activeLabel;
    window.requestAnimationFrame(() => mainContentRef.current?.focus({ preventScroll: true }));
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
        {workspaceOptions.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
      </select>
    );
  }

  function navGroup(label: string, items: CreatorNavigationItem[]) {
    if (!items.length) return null;
    return (
      <section className="ds-nav-group" aria-label={label}>
        <span className="ds-nav-group-label">{label}</span>
        <div>
          {items.map((item) => {
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
        </div>
      </section>
    );
  }

  return (
    <div className="ds-creator-shell">
      <a className="ds-skip-link" href="#ds-main-content">Skip to main content</a>

      <aside className="ds-creator-sidebar" aria-label="Creator workspace navigation">
        <a className="ds-shell-brand-link" href="/" aria-label="DigiStream creator home"><BrandLockup /></a>
        <button className="ds-command-trigger" onClick={() => setCommandOpen(true)} type="button">
          <Icon name="search" size={18} /><span>Search</span><kbd>⌘K</kbd>
        </button>
        <nav className="ds-creator-navigation">
          {navGroup('Workspace', workspaceNavigation)}
          {navGroup('Audience', audienceNavigation)}
        </nav>
        <section className="ds-workspace-summary" aria-label="Current workspace">
          <span>Workspace</span>
          {canSwitchWorkspace ? workspaceSelect() : <strong title={workspaceName}>{workspaceName}</strong>}
          <small title={workspaceDescription}>{workspaceDescription}</small>
        </section>
      </aside>

      <header className="ds-creator-topbar">
        <div className="ds-page-heading">
          <span>{eyebrow}</span>
          <h1>{creatorFacingLabel(title)}</h1>
        </div>
        <p className="sr-only" aria-live="polite" aria-atomic="true">{creatorFacingLabel(activeLabel)} page opened. Current workspace: {workspaceName}.</p>
        {canSwitchWorkspace ? <label className="ds-creator-workspace-compact"><span>Workspace</span>{workspaceSelect()}</label> : null}
        {actions ? (
          <div className="ds-creator-account-area" aria-label="Signed-in account actions">
            <div className="ds-creator-account-summary"><span className="ds-creator-account-label">Account</span><span className="ds-creator-account-identity" title={workspaceDescription}>{workspaceDescription}</span></div>
            <div className="ds-topbar-actions">{actions}</div>
            <details className="ds-mobile-account-menu">
              <summary aria-label="Open account and workspace menu"><Icon name="user" /></summary>
              <div className="ds-mobile-account-popover">
                <div><strong>{workspaceName}</strong><span>{workspaceDescription}</span></div>
                {canSwitchWorkspace ? workspaceSelect() : null}
                <div className="ds-mobile-account-actions">{actions}</div>
              </div>
            </details>
          </div>
        ) : null}
      </header>

      <main className="ds-creator-content" id="ds-main-content" ref={mainContentRef} tabIndex={-1}>{children}</main>

      <nav className="ds-creator-mobile-nav" aria-label="Creator mobile navigation">
        {primaryMobileNavigation.map((item) => {
          const active = item.label === activeLabel;
          return <button aria-current={active ? 'page' : undefined} className={active ? 'active' : ''} key={item.label} onClick={item.onSelect} type="button"><Icon name={item.icon} /><span>{item.shortLabel}</span></button>;
        })}
        {secondaryMobileNavigation.length > 0 ? (
          <div className="ds-creator-mobile-more">
            <button aria-expanded={mobileMoreOpen} aria-haspopup="dialog" onClick={() => setMobileMoreOpen(true)} type="button"><Icon name="menu" /><span>More</span></button>
            {mobileMoreOpen ? (
              <div className="ds-creator-mobile-more-backdrop" onMouseDown={dismissMobileMore} role="presentation">
                <dialog aria-label="More creator destinations" aria-modal="true" className="ds-creator-mobile-more-menu" onMouseDown={(event) => event.stopPropagation()} open ref={mobileMoreRef}>
                  <header><strong>More</strong><button aria-label="Close more menu" onClick={dismissMobileMore} type="button"><Icon name="close" /></button></header>
                  <button onClick={() => { closeMobileMore(); setCommandOpen(true); }} type="button"><Icon name="search" /><span>Search</span></button>
                  {secondaryMobileNavigation.map((item) => <button aria-current={item.label === activeLabel ? 'page' : undefined} className={item.label === activeLabel ? 'active' : ''} key={item.label} onClick={() => { item.onSelect(); closeMobileMore(); }} type="button"><Icon name={item.icon} /><span>{creatorFacingLabel(item.label)}</span></button>)}
                </dialog>
              </div>
            ) : null}
          </div>
        ) : null}
      </nav>

      {commandOpen ? (
        <div className="ds-command-backdrop" onMouseDown={dismissCommand} role="presentation">
          <section aria-label="Search DigiStream" aria-modal="true" className="ds-command-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog">
            <header><strong>Search DigiStream</strong><button aria-label="Close search" onClick={dismissCommand} type="button"><Icon name="close" /></button></header>
            <SearchField label="Search creator workspace" onChange={setCommandQuery} placeholder="Search pages and destinations…" value={commandQuery} />
            <div className="ds-command-results">
              {commandResults.length ? commandResults.map((item) => (
                <button key={item.label} onClick={() => { item.onSelect(); closeCommand(); }} type="button">
                  <span className="ds-command-result-icon"><Icon name={item.icon} /></span>
                  <span><strong>{creatorFacingLabel(item.label)}</strong><small>Open {creatorFacingLabel(item.label)}</small></span>
                  <Icon name="arrow-right" size={17} />
                </button>
              )) : <p>No matching destination.</p>}
            </div>
            <footer><span>Tip: press <kbd>/</kbd> or <kbd>Ctrl/⌘ K</kbd> anywhere in the creator workspace.</span></footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}

export function ListenerShell({ children, current, footer }: { children: ReactNode; current: 'discover' | 'live' | 'replay'; footer?: ReactNode }) {
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/listen';
  const replayRoute = pathname === '/listen/replays' || pathname.startsWith('/listen/replay/') || pathname.startsWith('/listen/member-replay/');
  const nestedBroadcastRoute = pathname.startsWith('/listen/') && !replayRoute;
  const resolvedCurrent = replayRoute ? 'replay' : nestedBroadcastRoute ? null : current;
  const resolvedFooter = nestedBroadcastRoute
    ? 'DigiStream selects the available playback path and recovers short interruptions when possible.'
    : footer ?? 'DigiStream delivers live audio for creators, churches and communities.';

  return (
    <div className="listener-page ds-listener-shell">
      <a className="ds-skip-link" href="#ds-listener-content">Skip to main content</a>
      <header className="ds-listener-header">
        <a className="ds-shell-brand-link" href="/listen" aria-label="DigiStream listener home"><BrandLockup /></a>
        <nav aria-label="Listener navigation">
          <a aria-current={resolvedCurrent === 'discover' ? 'page' : undefined} href="/listen">Discover</a>
          <a aria-current={resolvedCurrent === 'live' ? 'page' : undefined} href="/listen?status=live">Live now</a>
          <a aria-current={resolvedCurrent === 'replay' ? 'page' : undefined} href="/listen/replays">Replays</a>
        </nav>
        <a className="ds-listener-creator-link" href="/">Creator workspace<Icon name="arrow-right" size={17} /></a>
      </header>
      <main className="ds-listener-content" id="ds-listener-content">{children}</main>
      <footer className="ds-listener-footer">{resolvedFooter}</footer>
    </div>
  );
}
