const CREATOR_OVERVIEW_PATH = '/creator/overview';

const IMPLEMENTED_CREATOR_PATHS = new Set([
  CREATOR_OVERVIEW_PATH,
  '/creator/broadcasts',
  '/creator/audience',
  '/creator/studio-lobby',
  '/creator/chat',
  '/creator/recordings',
  '/creator/analytics',
]);

export type InitialRouteResolution = {
  path: string;
  replaceHistory: boolean;
};

export function resolveInitialRoute(pathname: string): InitialRouteResolution {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';

  if (normalizedPath === '/creator' || normalizedPath.startsWith('/creator/')) {
    if (IMPLEMENTED_CREATOR_PATHS.has(normalizedPath)) {
      return { path: normalizedPath, replaceHistory: normalizedPath !== pathname };
    }

    return { path: CREATOR_OVERVIEW_PATH, replaceHistory: true };
  }

  return { path: normalizedPath, replaceHistory: normalizedPath !== pathname };
}
