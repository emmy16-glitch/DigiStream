import { useEffect } from 'react';

function visibleAutomaticStepHeading(): HTMLElement | null {
  const channelHeading = document.getElementById('create-channel-title');
  const channelPage = channelHeading?.closest('.creator-broadcasts-page');
  if (
    channelHeading instanceof HTMLElement &&
    channelPage &&
    !channelPage.querySelector('.channel-strip')
  ) {
    return channelHeading;
  }

  const broadcastHeading = document.getElementById('create-broadcast-title');
  const broadcastPage = broadcastHeading?.closest('.creator-broadcasts-page');
  if (
    broadcastHeading instanceof HTMLElement &&
    broadcastPage?.querySelector('[aria-label="First broadcast choices"]')
  ) {
    return broadcastHeading;
  }

  return null;
}

export function OnboardingStepFocusManager() {
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    let lastFocusedStep: HTMLElement | null = null;

    const focusRenderedStep = () => {
      const heading = visibleAutomaticStepHeading();
      if (!heading) {
        lastFocusedStep = null;
        return;
      }
      if (heading === lastFocusedStep) return;

      heading.focus();
      lastFocusedStep = heading;
    };

    const observer = new MutationObserver(focusRenderedStep);
    observer.observe(root, { childList: true, subtree: true });
    focusRenderedStep();

    return () => observer.disconnect();
  }, []);

  return null;
}
