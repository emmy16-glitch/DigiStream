import type { CSSProperties, HTMLAttributes } from 'react';

export type IconName =
  | 'analytics'
  | 'arrow-right'
  | 'audience'
  | 'broadcast'
  | 'calendar'
  | 'chat'
  | 'check'
  | 'close'
  | 'copy'
  | 'error'
  | 'headphones'
  | 'home'
  | 'info'
  | 'microphone'
  | 'notification'
  | 'offline'
  | 'pause'
  | 'play'
  | 'recording'
  | 'refresh'
  | 'settings'
  | 'user'
  | 'volume'
  | 'volume-muted'
  | 'warning';

type IconProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & {
  name: IconName;
  size?: number;
  title?: string;
};

const glyphs: Record<IconName, string> = {
  analytics: '↗',
  'arrow-right': '→',
  audience: '◎',
  broadcast: '◉',
  calendar: '▦',
  chat: '□',
  check: '✓',
  close: '×',
  copy: '▣',
  error: '×',
  headphones: '∩',
  home: '⌂',
  info: 'i',
  microphone: '◍',
  notification: '◌',
  offline: '∅',
  pause: 'Ⅱ',
  play: '▶',
  recording: '▤',
  refresh: '↻',
  settings: '⚙',
  user: '○',
  volume: '◖',
  'volume-muted': '×',
  warning: '!',
};

export function Icon({ name, size = 20, title, className = '', style, ...props }: IconProps) {
  const accessibility = title
    ? { role: 'img' as const, 'aria-label': title }
    : { 'aria-hidden': true as const };
  const iconStyle = {
    '--ds-icon-size': `${size}px`,
    ...style,
  } as CSSProperties;

  return (
    <span
      {...accessibility}
      {...props}
      className={`ds-icon ${className}`.trim()}
      data-icon={name}
      style={iconStyle}
    >
      {glyphs[name]}
    </span>
  );
}
