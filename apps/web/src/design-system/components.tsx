import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react';
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
      <Icon name={icon ?? statusIcons[tone]} size={16} />
      <span>{children}</span>
    </span>
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
        aria-valuetext={
          muted
            ? 'Microphone muted'
            : `${percentage} percent, ${finiteDecibels ? `${decibels.toFixed(1)} dBFS` : 'silent'}`
        }
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

export type StateKind =
  | 'loading'
  | 'empty'
  | 'error'
  | 'offline'
  | 'unauthorized';

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
  return (
    <section
      aria-busy={kind === 'loading' || undefined}
      className={`ds-state-panel ds-state-${kind} ${compact ? 'ds-state-compact' : ''}`}
      role={kind === 'error' || kind === 'offline' ? 'alert' : 'status'}
    >
      <span className="ds-state-icon" aria-hidden="true">
        <Icon name={stateIcons[kind]} size={compact ? 20 : 26} />
      </span>
      <div className="ds-state-copy">
        <strong>{title}</strong>
        {children ? <div>{children}</div> : null}
      </div>
      {actionLabel && onAction ? (
        <Button onClick={onAction} variant="secondary">
          {actionLabel}
        </Button>
      ) : null}
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
      <span className="ds-brand-wordmark">Echoo</span>
    </span>
  );
}
