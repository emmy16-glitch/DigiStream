import {
  useId,
  useState,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type FormEvent,
  type ReactNode,
} from 'react';
import { EchooSystemStatePage } from './EchooSystemStatePage';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  fullWidth?: boolean;
  icon?: IconName;
  loading?: boolean;
  variant?: ButtonVariant;
};

export function Button({
  children,
  className = '',
  disabled,
  fullWidth = false,
  icon,
  loading = false,
  type = 'button',
  variant = 'secondary',
  ...props
}: ButtonProps) {
  const unavailable = disabled || loading;
  return (
    <button
      {...props}
      aria-busy={loading || undefined}
      className={`ds-button ds-button-${variant} ${fullWidth ? 'ds-button-full' : ''} ${className}`.trim()}
      disabled={unavailable}
      type={type}
    >
      {loading ? <span className="ds-spinner" aria-hidden="true" /> : icon ? <Icon name={icon} /> : null}
      <span>{children}</span>
    </button>
  );
}

export type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  fullWidth?: boolean;
  icon?: IconName;
  variant?: Exclude<ButtonVariant, 'danger'>;
};

export function LinkButton({
  children,
  className = '',
  fullWidth = false,
  icon,
  variant = 'secondary',
  ...props
}: LinkButtonProps) {
  return (
    <a
      {...props}
      className={`ds-button ds-button-${variant} ${fullWidth ? 'ds-button-full' : ''} ${className}`.trim()}
    >
      {icon ? <Icon name={icon} /> : null}
      <span>{children}</span>
    </a>
  );
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
};

export function IconButton({
  className = '',
  icon,
  label,
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      aria-label={label}
      className={`ds-icon-button ${className}`.trim()}
      title={label}
      type={type}
    >
      <Icon name={icon} />
    </button>
  );
}

export type StatusTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'live';

const statusIcons: Record<StatusTone, IconName> = {
  neutral: 'info',
  info: 'info',
  success: 'check',
  warning: 'warning',
  danger: 'error',
  live: 'broadcast',
};

export function StatusBadge({
  children,
  className = '',
  icon,
  tone = 'neutral',
}: {
  children: ReactNode;
  className?: string;
  icon?: IconName;
  tone?: StatusTone;
}) {
  return (
    <span className={`ds-status ds-status-${tone} ${className}`.trim()}>
      <Icon name={icon ?? statusIcons[tone]} size={15} />
      <span>{children}</span>
    </span>
  );
}

export function PageHeader({
  actions,
  description,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  description?: ReactNode;
  eyebrow?: string;
  title: ReactNode;
}) {
  return (
    <header className="ds-page-header">
      <div className="ds-page-header-copy">
        {eyebrow ? <span className="ds-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="ds-page-header-actions">{actions}</div> : null}
    </header>
  );
}

export function SectionHeader({
  actions,
  description,
  title,
}: {
  actions?: ReactNode;
  description?: ReactNode;
  title: ReactNode;
}) {
  return (
    <header className="ds-section-header">
      <div>
        <h3>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="ds-section-header-actions">{actions}</div> : null}
    </header>
  );
}

export function SearchField({
  label = 'Search',
  onChange,
  placeholder = 'Search',
  value,
}: {
  label?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  const inputId = useId();
  return (
    <label className="ds-search-field" htmlFor={inputId}>
      <span className="sr-only">{label}</span>
      <Icon name="search" size={18} />
      <input
        id={inputId}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
      {value ? (
        <button aria-label="Clear search" onClick={() => onChange('')} type="button">
          <Icon name="close" size={16} />
        </button>
      ) : null}
    </label>
  );
}

export type FilterTab = {
  count?: number;
  id: string;
  label: string;
};

export function FilterTabs({
  activeId,
  onChange,
  tabs,
}: {
  activeId: string;
  onChange: (id: string) => void;
  tabs: FilterTab[];
}) {
  return (
    <div className="ds-filter-tabs" role="tablist" aria-label="Filters">
      {tabs.map((tab) => (
        <button
          aria-selected={activeId === tab.id}
          className={activeId === tab.id ? 'active' : ''}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          role="tab"
          type="button"
        >
          <span>{tab.label}</span>
          {typeof tab.count === 'number' ? <small>{tab.count}</small> : null}
        </button>
      ))}
    </div>
  );
}

/** Compact, truthful work item. Domain code supplies the actual state and action. */
export function TaskRow({
  action,
  children,
  icon,
  status,
  title,
  tone = 'neutral',
}: {
  action?: ReactNode;
  children?: ReactNode;
  icon?: IconName;
  status?: ReactNode;
  title: ReactNode;
  tone?: 'neutral' | 'lavender' | 'sky' | 'mint' | 'amber' | 'peach';
}) {
  return (
    <article className={`ds-task-row ds-task-row-${tone}`}>
      {icon ? <span className="ds-task-row-icon" aria-hidden="true"><Icon name={icon} /></span> : null}
      <div className="ds-task-row-copy"><strong>{title}</strong>{children ? <span>{children}</span> : null}</div>
      {status ? <div className="ds-task-row-status">{status}</div> : null}
      {action ? <div className="ds-task-row-action">{action}</div> : null}
    </article>
  );
}

export function TaskList({ children }: { children: ReactNode }) {
  return <div className="ds-task-list">{children}</div>;
}

/** Supporting resource facts, deliberately separate from lifecycle ownership. */
export function ContextCard({
  children,
  className = '',
  title,
  tone = 'neutral',
}: {
  children: ReactNode;
  className?: string;
  title: ReactNode;
  tone?: 'neutral' | 'lavender' | 'sky' | 'mint' | 'amber' | 'peach';
}) {
  return <section className={`ds-context-card ds-context-card-${tone} ${className}`.trim()}><h3>{title}</h3><div>{children}</div></section>;
}

export function InsightCard({
  detail,
  icon,
  label,
  tone = 'neutral',
  trend,
  value,
}: {
  detail?: ReactNode;
  icon?: IconName;
  label: string;
  tone?: 'neutral' | 'lavender' | 'sky' | 'mint' | 'amber' | 'peach';
  trend?: ReactNode;
  value: ReactNode;
}) {
  return (
    <article className={`ds-insight-card ds-insight-${tone}`}>
      <header>
        <span>{label}</span>
        {icon ? <Icon name={icon} size={18} /> : null}
      </header>
      <strong className="ds-insight-value">{value}</strong>
      {trend ? <div className="ds-insight-trend">{trend}</div> : null}
      {detail ? <p>{detail}</p> : null}
    </article>
  );
}

export function DataTable({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="ds-data-table-scroll" role="region" aria-label={label} tabIndex={0}>
      <table className="ds-data-table">{children}</table>
    </div>
  );
}

export function ResponsiveRecordRow({
  action,
  children,
  meta,
  status,
  title,
}: {
  action?: ReactNode;
  children?: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  title: ReactNode;
}) {
  return (
    <article className="ds-record-row">
      <div className="ds-record-main">
        <strong>{title}</strong>
        {children ? <span>{children}</span> : null}
      </div>
      {meta ? <div className="ds-record-meta">{meta}</div> : null}
      {status ? <div className="ds-record-status">{status}</div> : null}
      {action ? <div className="ds-record-action">{action}</div> : null}
    </article>
  );
}

export function ApprovalCard({
  busy = false,
  cancelLabel = 'Cancel',
  children,
  confirmLabel,
  danger = false,
  onCancel,
  onConfirm,
  title,
}: {
  busy?: boolean;
  cancelLabel?: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
}) {
  return (
    <section className="ds-approval-card" role="alertdialog" aria-label={title}>
      <div className="ds-approval-copy">
        <span className={`ds-approval-icon ${danger ? 'is-danger' : ''}`} aria-hidden="true">
          <Icon name={danger ? 'warning' : 'check'} />
        </span>
        <div><h3>{title}</h3><p>{children}</p></div>
      </div>
      <div className="ds-approval-actions">
        <Button disabled={busy} onClick={onCancel} variant="ghost">{cancelLabel}</Button>
        <Button loading={busy} onClick={onConfirm} variant={danger ? 'danger' : 'primary'}>{confirmLabel}</Button>
      </div>
    </section>
  );
}

export function SelectionBar({
  actions,
  children,
}: {
  actions?: ReactNode;
  children: ReactNode;
}) {
  return <aside className="ds-selection-bar"><strong>{children}</strong>{actions ? <div>{actions}</div> : null}</aside>;
}

export function MessageRow({
  author,
  children,
  meta,
  own = false,
}: {
  author: string;
  children: ReactNode;
  meta?: ReactNode;
  own?: boolean;
}) {
  return (
    <article className={`ds-message-row ${own ? 'is-own' : ''}`}>
      <div className="ds-message-avatar" aria-hidden="true">{author.trim().slice(0, 1).toUpperCase()}</div>
      <div className="ds-message-body"><header><strong>{author}</strong>{meta ? <span>{meta}</span> : null}</header><div>{children}</div></div>
    </article>
  );
}

export function Composer({
  disabled = false,
  onSend,
  placeholder = 'Write a message…',
}: {
  disabled?: boolean;
  onSend: (message: string) => void;
  placeholder?: string;
}) {
  const [value, setValue] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = value.trim();
    if (!message || disabled) return;
    onSend(message);
    setValue('');
  }
  return (
    <form className="ds-composer" onSubmit={submit}>
      <label className="sr-only" htmlFor="ds-composer-input">Message</label>
      <textarea
        disabled={disabled}
        id="ds-composer-input"
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        rows={1}
        value={value}
      />
      <IconButton disabled={disabled || !value.trim()} icon="arrow-right" label="Send message" type="submit" />
    </form>
  );
}

export function AudioLevelMeter({
  clipping = false,
  decibels,
  label,
  level,
  muted = false,
  segments = 24,
}: {
  clipping?: boolean;
  decibels: number;
  label: string;
  level: number;
  muted?: boolean;
  segments?: number;
}) {
  const normalizedLevel = Math.min(1, Math.max(0, level));
  const activeSegments = Math.round(normalizedLevel * segments);
  const percentage = Math.round(normalizedLevel * 100);
  const finiteDecibels = Number.isFinite(decibels);
  const state = muted
    ? { label: 'Muted', tone: 'neutral' as const }
    : clipping
      ? { label: 'Clipping', tone: 'danger' as const }
      : normalizedLevel >= 0.025
        ? { label: 'Input detected', tone: 'success' as const }
        : { label: 'Listening', tone: 'info' as const };

  return (
    <div className={`ds-audio-meter ${muted ? 'is-muted' : ''} ${clipping ? 'is-clipping' : ''}`.trim()}>
      <div className="ds-audio-meter-header">
        <strong>{label}</strong>
        <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
      </div>
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={percentage}
        aria-valuetext={muted ? 'Microphone muted' : `${percentage} percent, ${finiteDecibels ? `${decibels.toFixed(1)} dBFS` : 'silent'}`}
        className="ds-audio-meter-bars"
        role="meter"
        style={{ gridTemplateColumns: `repeat(${segments}, minmax(3px, 1fr))` }}
      >
        {Array.from({ length: segments }, (_, index) => {
          const active = index < activeSegments;
          const hot = active && index >= Math.floor(segments * 0.84);
          return <i className={hot ? 'is-hot' : active ? 'is-active' : ''} key={index} />;
        })}
      </div>
      <div className="ds-audio-meter-readout" aria-hidden="true">
        <span>{muted ? 'Muted' : `${percentage}%`}</span>
        <span>{finiteDecibels ? `${decibels.toFixed(1)} dBFS` : 'Silent'}</span>
      </div>
    </div>
  );
}

export type StateKind = 'loading' | 'empty' | 'error' | 'offline' | 'unauthorized';

const stateIcons: Record<StateKind, IconName> = {
  loading: 'refresh',
  empty: 'info',
  error: 'error',
  offline: 'offline',
  unauthorized: 'warning',
};

export function StatePanel({
  actionLabel,
  children,
  compact = false,
  kind,
  onAction,
  title,
}: {
  actionLabel?: string;
  children?: ReactNode;
  compact?: boolean;
  kind: StateKind;
  onAction?: () => void;
  title: string;
}) {
  if (!compact && kind === 'loading' && title === 'Opening DigiStream') {
    return (
      <EchooSystemStatePage embedded kind="loading" title="Loading">
        Please wait a moment…
      </EchooSystemStatePage>
    );
  }

  if (!compact && kind === 'offline' && title === 'Cannot connect to DigiStream') {
    return (
      <EchooSystemStatePage actionLabel="Retry" embedded kind="offline" onAction={onAction} title="No connection">
        We could not reach DigiStream. Check the local server or network connection, then try again.
      </EchooSystemStatePage>
    );
  }

  return (
    <section
      aria-busy={kind === 'loading' || undefined}
      className={`ds-state-panel ds-state-${kind} ${compact ? 'ds-state-compact' : ''}`}
      role={kind === 'error' || kind === 'offline' ? 'alert' : 'status'}
    >
      <span className="ds-state-icon" aria-hidden="true"><Icon name={stateIcons[kind]} size={compact ? 20 : 26} /></span>
      <div className="ds-state-copy"><strong>{title}</strong>{children ? <div>{children}</div> : null}</div>
      {actionLabel && onAction ? <Button onClick={onAction} variant="secondary">{actionLabel}</Button> : null}
    </section>
  );
}

export function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`ds-brand ${compact ? 'ds-brand-compact' : ''}`}>
      <span className="ds-brand-mark" aria-hidden="true">
        <i className="ds-brand-petal ds-brand-petal-primary" />
        <i className="ds-brand-petal ds-brand-petal-secondary" />
      </span>
      <span className="ds-brand-wordmark">DigiStream</span>
    </span>
  );
}