import type {
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
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
