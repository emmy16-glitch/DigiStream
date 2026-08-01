import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';

export type VisualViewportMetrics = {
  height: number;
  offsetTop: number;
  keyboardInset: number;
};

export function calculateVisualViewportMetrics(
  innerHeight: number,
  viewportHeight: number,
  offsetTop: number,
): VisualViewportMetrics {
  const safeInnerHeight = Math.max(0, Math.round(innerHeight));
  const safeHeight = Math.max(0, Math.round(viewportHeight));
  const safeOffsetTop = Math.max(0, Math.round(offsetTop));
  return {
    height: safeHeight,
    offsetTop: safeOffsetTop,
    keyboardInset: Math.max(
      0,
      safeInnerHeight - safeHeight - safeOffsetTop,
    ),
  };
}

export function useMobileOverlayLayout(active: boolean): CSSProperties {
  const [metrics, setMetrics] = useState<VisualViewportMetrics | null>(null);

  useEffect(() => {
    if (!active) {
      setMetrics(null);
      return;
    }

    const viewport = window.visualViewport;
    const update = () => {
      if (viewport) {
        setMetrics(
          calculateVisualViewportMetrics(
            window.innerHeight,
            viewport.height,
            viewport.offsetTop,
          ),
        );
        return;
      }
      setMetrics(
        calculateVisualViewportMetrics(
          window.innerHeight,
          window.innerHeight,
          0,
        ),
      );
    };

    update();
    viewport?.addEventListener('resize', update);
    viewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      viewport?.removeEventListener('resize', update);
      viewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [active]);

  return useMemo(() => {
    if (!metrics) return {};
    return {
      '--ds-overlay-viewport-height': `${metrics.height}px`,
      '--ds-overlay-viewport-top': `${metrics.offsetTop}px`,
      '--ds-overlay-keyboard-inset': `${metrics.keyboardInset}px`,
    } as CSSProperties;
  }, [metrics]);
}

export function useFixedActionReservation(visible: boolean): void {
  useEffect(() => {
    const className = 'ds-listener-fixed-action-visible';
    if (visible) document.body.classList.add(className);
    else document.body.classList.remove(className);
    return () => document.body.classList.remove(className);
  }, [visible]);
}
