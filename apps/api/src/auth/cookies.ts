const DEFAULT_COOKIE_NAME = 'digistream_session';

export function getSessionCookieName(): string {
  const configured = process.env.AUTH_COOKIE_NAME?.trim();
  return configured && /^[A-Za-z0-9_-]+$/.test(configured)
    ? configured
    : DEFAULT_COOKIE_NAME;
}

export function readCookie(
  cookieHeader: string | undefined,
  name: string,
): string | null {
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex < 0) {
      continue;
    }

    const key = part.slice(0, separatorIndex).trim();
    if (key !== name) {
      continue;
    }

    const value = part.slice(separatorIndex + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }

  return null;
}

function secureCookieEnabled(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.AUTH_COOKIE_SECURE === 'true'
  );
}

export function createSessionCookie(
  name: string,
  token: string,
  expiresAt: Date,
): string {
  const maxAge = Math.max(
    0,
    Math.floor((expiresAt.getTime() - Date.now()) / 1000),
  );
  const attributes = [
    `${name}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    `Expires=${expiresAt.toUTCString()}`,
  ];

  if (secureCookieEnabled()) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}

export function clearSessionCookie(name: string): string {
  const attributes = [
    `${name}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];

  if (secureCookieEnabled()) {
    attributes.push('Secure');
  }

  return attributes.join('; ');
}
