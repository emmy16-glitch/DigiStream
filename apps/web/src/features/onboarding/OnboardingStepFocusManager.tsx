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

    let focusArmed = false;

    const armForOnboardingSubmit = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLFormElement)) return;
      if (!target.closest('.workspace-onboarding, .creator-broadcasts-page')) return;
      focusArmed = true;
    };

    const focusRenderedStep = () => {
      if (!focusArmed) return;
      const heading = visibleAutomaticStepHeading();
      if (!heading) return;

      heading.focus();
      focusArmed = false;
    };

    const observer = new MutationObserver(focusRenderedStep);
    root.addEventListener('submit', armForOnboardingSubmit, true);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      root.removeEventListener('submit', armForOnboardingSubmit, true);
      observer.disconnect();
    };
  }, []);

  return null;
}
