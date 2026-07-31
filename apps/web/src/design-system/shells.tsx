import type { ReactNode } from 'react';
import { BrandLockup } from './components';
import { Icon, type IconName } from './Icon';

export type CreatorNavigationItem = {
  icon: IconName;
  label: string;
  onSelect: () => void;
  shortLabel: string;
};

export function CreatorShell({
  actions,
  activeLabel,
  children,
  eyebrow,
  navigation,
  title,
  workspaceDescription = 'Sign in to load organisation access',
  workspaceName = 'Creator workspace',
}: {
  actions?: ReactNode;
  activeLabel: string;
  children: ReactNode;
  eyebrow: string;
  navigation: CreatorNavigationItem[];
  title: string;
  workspaceDescription?: string;
  workspaceName?: string;
}) {
  return (
    <div className="ds-creator-shell">
      <a className="ds-skip-link" href="#ds-main-content">Skip to main content</a>

      <aside className="ds-creator-sidebar" aria-label="Creator workspace navigation">
        <a className="ds-shell-brand-link" href="/" aria-label="DigiStream creator home">
          <BrandLockup />
        </a>

        <nav className="ds-creator-navigation">
          {navigation.map((item) => {
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
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="ds-workspace-summary" aria-label="Current workspace">
          <span>Workspace</span>
          <strong>{workspaceName}</strong>
          <small>{workspaceDescription}</small>
        </section>
      </aside>

      <header className="ds-creator-topbar">
        <div className="ds-page-heading">
          <span>{eyebrow}</span>
          <h1>{title}</h1>
        </div>
        {actions ? <div className="ds-topbar-actions">{actions}</div> : null}
      </header>

      <main className="ds-creator-content" id="ds-main-content">
        {children}
      </main>

      <nav className="ds-creator-mobile-nav" aria-label="Creator mobile navigation">
        {navigation.slice(0, 5).map((item) => {
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
  current: 'discover' | 'live';
  footer?: ReactNode;
}) {
  return (
    <div className="listener-page ds-listener-shell">
      <a className="ds-skip-link" href="#ds-listener-content">Skip to listener content</a>

      <header className="ds-listener-header">
        <a className="ds-shell-brand-link" href="/listen" aria-label="DigiStream listener home">
          <BrandLockup />
        </a>
        <nav aria-label="Listener navigation">
          <a aria-current={current === 'discover' ? 'page' : undefined} href="/listen">
            Discover
          </a>
          <a aria-current={current === 'live' ? 'page' : undefined} href="/listen?status=live">
            Live now
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

      <footer className="ds-listener-footer">
        {footer ?? 'DigiStream delivers professional live audio for creators, churches and communities.'}
      </footer>
    </div>
  );
}
