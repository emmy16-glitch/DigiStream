import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { useId } from 'react';
import { Button, StatusBadge, type StatusTone } from './components';
import { Icon, type IconName } from './Icon';

export type FieldProps = {
  children: ReactNode;
  className?: string;
  error?: ReactNode;
  hint?: ReactNode;
  htmlFor?: string;
  label: ReactNode;
  required?: boolean;
};

export function Field({
  children,
  className = '',
  error,
  hint,
  htmlFor,
  label,
  required = false,
}: FieldProps) {
  return (
    <div className={`ds-field ${className}`.trim()}>
      <label className="ds-field-label" htmlFor={htmlFor}>
        <span>{label}</span>
        {required ? <span className="ds-field-required" aria-hidden="true">*</span> : null}
      </label>
      {children}
      {error ? <p className="ds-field-error">{error}</p> : hint ? <p className="ds-field-hint">{hint}</p> : null}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...props }: InputProps) {
  return <input {...props} className={`ds-input ${className}`.trim()} />;
}

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = '', children, ...props }: SelectProps) {
  return (
    <select {...props} className={`ds-select ${className}`.trim()}>
      {children}
    </select>
  );
}

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = '', ...props }: TextareaProps) {
  return <textarea {...props} className={`ds-textarea ${className}`.trim()} />;
}

export type CardProps = HTMLAttributes<HTMLElement> & {
  compact?: boolean;
  flat?: boolean;
  as?: 'article' | 'section' | 'div';
};

export function Card({
  as: Element = 'section',
  className = '',
  compact = false,
  flat = false,
  ...props
}: CardProps) {
  return (
    <Element
      {...props}
      className={`ds-card ${compact ? 'ds-card-compact' : ''} ${flat ? 'ds-card-flat' : ''} ${className}`.trim()}
    />
  );
}

export function IconTile({
  className = '',
  icon,
  label,
}: {
  className?: string;
  icon: IconName;
  label?: string;
}) {
  return (
    <span
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={`ds-icon-tile ${className}`.trim()}
      role={label ? 'img' : undefined}
    >
      <Icon name={icon} />
    </span>
  );
}

export function PageHeader({
  action,
  description,
  eyebrow,
  title,
}: {
  action?: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
}) {
  return (
    <header className="ds-page-header">
      <div>
        {eyebrow ? <span className="ds-page-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="ds-page-header-action">{action}</div> : null}
    </header>
  );
}

export function SectionHeader({
  action,
  description,
  id,
  title,
}: {
  action?: ReactNode;
  description?: ReactNode;
  id?: string;
  title: ReactNode;
}) {
  return (
    <header className="ds-section-header">
      <div>
        <h3 id={id}>{title}</h3>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="ds-section-header-action">{action}</div> : null}
    </header>
  );
}

export function SearchField({
  className = '',
  label = 'Search',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className={`ds-search-field ${className}`.trim()}>
      <span className="sr-only">{label}</span>
      <Icon name="search" size={18} />
      <input {...props} aria-label={label} type="search" />
    </label>
  );
}

export type FilterTab = {
  count?: number;
  label: string;
  value: string;
};

export function FilterTabs({
  ariaLabel,
  controls,
  idPrefix,
  onChange,
  tabs,
  value,
}: {
  ariaLabel: string;
  controls?: string;
  idPrefix?: string;
  onChange(value: string): void;
  tabs: FilterTab[];
  value: string;
}) {
  return (
    <div aria-label={ariaLabel} className="ds-filter-tabs" role="tablist">
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            aria-controls={controls}
            aria-selected={selected}
            className="ds-filter-tab"
            id={idPrefix ? `${idPrefix}-${tab.value}` : undefined}
            key={tab.value}
            onClick={() => onChange(tab.value)}
            role="tab"
            type="button"
          >
            <span>{tab.label}</span>
            {typeof tab.count === 'number' ? <small>{tab.count}</small> : null}
          </button>
        );
      })}
    </div>
  );
}

export function TaskList({ children, className = '', label }: { children: ReactNode; className?: string; label: string }) {
  return <div aria-label={label} className={`ds-task-list ${className}`.trim()}>{children}</div>;
}

export function TaskRow({
  action,
  children,
  icon,
  title,
  tone = 'neutral',
}: {
  action?: ReactNode;
  children?: ReactNode;
  icon: IconName;
  title: ReactNode;
  tone?: StatusTone;
}) {
  return (
    <article className={`ds-task-row ds-task-row-${tone}`}>
      <span className="ds-task-row-icon" aria-hidden="true"><Icon name={icon} size={18} /></span>
      <div className="ds-task-row-copy">
        <strong>{title}</strong>
        {children ? <div>{children}</div> : null}
      </div>
      {action ? <div className="ds-task-row-action">{action}</div> : null}
    </article>
  );
}

export function RecordList({ children, className = '', label }: { children: ReactNode; className?: string; label: string }) {
  return <div aria-label={label} className={`ds-record-list ${className}`.trim()}>{children}</div>;
}

export function RecordRow({
  action,
  children,
  leading,
  meta,
  status,
  title,
}: {
  action?: ReactNode;
  children?: ReactNode;
  leading?: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
  title: ReactNode;
}) {
  return (
    <article className="ds-record-row">
      {leading ? <div className="ds-record-row-leading">{leading}</div> : null}
      <div className="ds-record-row-copy">
        <strong>{title}</strong>
        {meta ? <div className="ds-record-row-meta">{meta}</div> : null}
        {children}
      </div>
      {status ? <div className="ds-record-row-status">{status}</div> : null}
      {action ? <div className="ds-record-row-action">{action}</div> : null}
    </article>
  );
}

export function ContextCard({
  children,
  className = '',
  label,
  title,
  tone = 'neutral',
}: {
  children: ReactNode;
  className?: string;
  label?: ReactNode;
  title: ReactNode;
  tone?: 'neutral' | 'brand' | 'lavender' | 'sky' | 'mint' | 'amber' | 'peach';
}) {
  return (
    <section className={`ds-context-card ds-context-card-${tone} ${className}`.trim()}>
      {label ? <span className="ds-context-label">{label}</span> : null}
      <h3>{title}</h3>
      <div className="ds-context-body">{children}</div>
    </section>
  );
}

export function InsightCard({
  className = '',
  detail,
  label,
  tone = 'brand',
  value,
}: {
  className?: string;
  detail?: ReactNode;
  label: ReactNode;
  tone?: 'brand' | 'lavender' | 'sky' | 'mint' | 'amber' | 'peach';
  value: ReactNode;
}) {
  return (
    <article className={`ds-insight-card ds-insight-card-${tone} ${className}`.trim()}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? <small>{detail}</small> : null}
    </article>
  );
}

export function ApprovalCard({
  cancelLabel = 'Cancel',
  confirmLabel,
  description,
  onCancel,
  onConfirm,
  pending = false,
  title,
  tone = 'danger',
}: {
  cancelLabel?: string;
  confirmLabel: string;
  description: ReactNode;
  onCancel(): void;
  onConfirm(): void;
  pending?: boolean;
  title: ReactNode;
  tone?: 'danger' | 'warning';
}) {
  const titleId = useId();
  return (
    <section className={`ds-approval-card ds-approval-card-${tone}`} role="alertdialog" aria-labelledby={titleId}>
      <StatusBadge tone={tone}>{tone === 'danger' ? 'Consequential action' : 'Confirm action'}</StatusBadge>
      <h3 id={titleId}>{title}</h3>
      <div>{description}</div>
      <div className="ds-approval-actions">
        <Button disabled={pending} onClick={onCancel} variant="secondary">{cancelLabel}</Button>
        <Button loading={pending} onClick={onConfirm} variant={tone === 'danger' ? 'danger' : 'primary'}>{confirmLabel}</Button>
      </div>
    </section>
  );
}

export function CompactAction({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`ds-compact-action ${props.className ?? ''}`.trim()} type={props.type ?? 'button'}>{children}</button>;
}
