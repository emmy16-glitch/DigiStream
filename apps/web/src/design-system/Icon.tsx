import type { SVGAttributes } from 'react';

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
  | 'menu'
  | 'microphone'
  | 'notification'
  | 'offline'
  | 'pause'
  | 'play'
  | 'recording'
  | 'refresh'
  | 'search'
  | 'settings'
  | 'user'
  | 'volume'
  | 'volume-muted'
  | 'warning';

type IconProps = Omit<SVGAttributes<SVGSVGElement>, 'children' | 'name'> & {
  name: IconName;
  size?: number;
  title?: string;
};

function IconPaths({ name }: { name: IconName }) {
  switch (name) {
    case 'analytics':
      return <><path d="M4 19V9" /><path d="M10 19V5" /><path d="M16 19v-7" /><path d="m15 5 4-4" /><path d="M15 1h4v4" /></>;
    case 'arrow-right':
      return <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>;
    case 'audience':
      return <><circle cx="9" cy="8" r="3" /><path d="M3 19a6 6 0 0 1 12 0" /><path d="M16 6a3 3 0 0 1 0 5" /><path d="M17 14a5 5 0 0 1 4 5" /></>;
    case 'broadcast':
      return <><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /><path d="M8.5 8.5a5 5 0 0 0 0 7" /><path d="M15.5 8.5a5 5 0 0 1 0 7" /><path d="M5 5a10 10 0 0 0 0 14" /><path d="M19 5a10 10 0 0 1 0 14" /></>;
    case 'calendar':
      return <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>;
    case 'chat':
      return <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M8 9h8M8 13h5" /></>;
    case 'check':
      return <path d="m5 12 4 4L19 6" />;
    case 'close':
    case 'error':
      return <><path d="m6 6 12 12" /><path d="M18 6 6 18" /></>;
    case 'copy':
      return <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>;
    case 'headphones':
      return <><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><path d="M4 14a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2ZM20 14a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2Z" /></>;
    case 'home':
      return <><path d="m3 11 9-8 9 8" /><path d="M5 10v11h14V10M9 21v-7h6v7" /></>;
    case 'info':
      return <><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><path d="M12 7h.01" /></>;
    case 'menu':
      return <><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></>;
    case 'microphone':
      return <><rect x="8" y="3" width="8" height="13" rx="4" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" /></>;
    case 'notification':
      return <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>;
    case 'offline':
      return <><path d="m3 3 18 18" /><path d="M8.5 5.5A10 10 0 0 1 21 9" /><path d="M3 9a10 10 0 0 1 2.5-2" /><path d="M6 13a8 8 0 0 1 3-2M14 11a8 8 0 0 1 4 2" /><path d="M9.5 16.5a4 4 0 0 1 5 0" /><path d="M12 20h.01" /></>;
    case 'pause':
      return <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></>;
    case 'play':
      return <path d="m8 5 11 7-11 7Z" />;
    case 'recording':
      return <><rect x="4" y="3" width="16" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M8 16h8" /></>;
    case 'refresh':
      return <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M6.1 9a7 7 0 0 1 11.5-2L20 9" /><path d="M17.9 15a7 7 0 0 1-11.5 2L4 15" /></>;
    case 'search':
      return <><circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></>;
    case 'settings':
      return <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>;
    case 'user':
      return <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>;
    case 'volume':
      return <><path d="M4 10v4h4l5 4V6L8 10Z" /><path d="M16 9a4 4 0 0 1 0 6" /><path d="M18.5 6.5a8 8 0 0 1 0 11" /></>;
    case 'volume-muted':
      return <><path d="M4 10v4h4l5 4V6L8 10Z" /><path d="m17 10 4 4M21 10l-4 4" /></>;
    case 'warning':
      return <><path d="M10.3 3.7 2.5 18a2 2 0 0 0 1.8 3h15.4a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>;
  }
}

export function Icon({ name, size = 20, title, className = '', ...props }: IconProps) {
  const accessibility = title
    ? { role: 'img' as const, 'aria-label': title }
    : { 'aria-hidden': true as const };

  return (
    <svg
      {...accessibility}
      {...props}
      className={`ds-icon ${className}`.trim()}
      data-icon={name}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <IconPaths name={name} />
    </svg>
  );
}
