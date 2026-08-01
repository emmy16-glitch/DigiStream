import { useCallback, useEffect, useRef } from 'react';

type ModalHistoryDismissOptions = {
  active: boolean;
  blocked?: boolean;
  onBlocked?: () => void;
  onDismiss: () => void;
  stateKey: string;
};

function markerState(
  currentState: unknown,
  stateKey: string,
  marker: string,
): Record<string, unknown> {
  const state =
    currentState && typeof currentState === 'object'
      ? { ...(currentState as Record<string, unknown>) }
      : {};
  state[stateKey] = marker;
  return state;
}

function stateHasMarker(
  currentState: unknown,
  stateKey: string,
  marker: string,
): boolean {
  return Boolean(
    currentState &&
      typeof currentState === 'object' &&
      (currentState as Record<string, unknown>)[stateKey] === marker,
  );
}

function historyMarker(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `modal-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useModalHistoryDismiss({
  active,
  blocked = false,
  onBlocked,
  onDismiss,
  stateKey,
}: ModalHistoryDismissOptions): () => void {
  const blockedRef = useRef(blocked);
  const onBlockedRef = useRef(onBlocked);
  const onDismissRef = useRef(onDismiss);
  const markerRef = useRef<string | null>(null);
  const backRequestedRef = useRef(false);

  useEffect(() => {
    blockedRef.current = blocked;
    onBlockedRef.current = onBlocked;
    onDismissRef.current = onDismiss;
  }, [blocked, onBlocked, onDismiss]);

  const pushMarker = useCallback(
    (marker: string) => {
      window.history.pushState(
        markerState(window.history.state, stateKey, marker),
        '',
        window.location.href,
      );
      markerRef.current = marker;
      backRequestedRef.current = false;
    },
    [stateKey],
  );

  useEffect(() => {
    if (!active) return;

    const marker = historyMarker();
    pushMarker(marker);

    const onPopState = () => {
      if (markerRef.current !== marker) return;
      markerRef.current = null;
      backRequestedRef.current = false;

      if (blockedRef.current) {
        onBlockedRef.current?.();
        pushMarker(marker);
        return;
      }

      onDismissRef.current();
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      if (
        markerRef.current === marker &&
        stateHasMarker(window.history.state, stateKey, marker)
      ) {
        markerRef.current = null;
        backRequestedRef.current = true;
        window.history.back();
      }
    };
  }, [active, pushMarker, stateKey]);

  return useCallback(() => {
    if (!active) return;
    if (blockedRef.current) {
      onBlockedRef.current?.();
      return;
    }

    const marker = markerRef.current;
    if (
      marker &&
      !backRequestedRef.current &&
      stateHasMarker(window.history.state, stateKey, marker)
    ) {
      backRequestedRef.current = true;
      window.history.back();
      return;
    }

    onDismissRef.current();
  }, [active, stateKey]);
}
