export type GuestRoute = {
  kind: 'guest-invitation';
  token: string;
};

export function parseGuestRoute(pathname: string): GuestRoute | null {
  const match = /^\/guest\/([^/]+)\/?$/.exec(pathname);
  if (!match?.[1]) return null;
  try {
    const token = decodeURIComponent(match[1]);
    return token.length >= 30 && token.length <= 200
      ? { kind: 'guest-invitation', token }
      : null;
  } catch {
    return null;
  }
}
