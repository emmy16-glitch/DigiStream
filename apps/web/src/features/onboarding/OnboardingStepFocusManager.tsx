import { useEffect } from 'react';

type OnboardingFocusTarget = 'create-channel-title' | 'create-broadcast-title';

type PendingFocusRequest = {
  originPath: string;
  targetId: OnboardingFocusTarget;
};

function requestedTargetForSubmit(form: HTMLFormElement): OnboardingFocusTarget | null {
  const organisationSetup = form.closest('.workspace-onboarding');
  if (organisationSetup?.querySelector('#workspace-onboarding-title')) {
    return 'create-channel-title';
  }

  const channelPage = form.closest('.creator-broadcasts-page');
  const firstChannelForm = form.closest('section[aria-labelledby="create-channel-title"]');
  if (channelPage && firstChannelForm && !channelPage.querySelector('.channel-strip')) {
    return 'create-broadcast-title';
  }

  return null;
}

function renderedRequestedHeading(targetId: OnboardingFocusTarget): HTMLElement | null {
  const heading = document.getElementById(targetId);
  if (!(heading instanceof HTMLElement)) return null;

  const page = heading.closest('.creator-broadcasts-page');
  if (!page) return null;

  if (targetId === 'create-channel-title') {
    return page.querySelector('.channel-strip') ? null : heading;
  }

  return page.querySelector('[aria-label="First broadcast choices"]') ? heading : null;
}

export function OnboardingStepFocusManager() {
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    let pendingRequest: PendingFocusRequest | null = null;

    const armForOnboardingSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      const targetId = requestedTargetForSubmit(form);
      if (!targetId) return;

      pendingRequest = {
        originPath: window.location.pathname,
        targetId,
      };
    };

    const focusRenderedStep = () => {
      const request = pendingRequest;
      if (!request) return;

      const pathname = window.location.pathname;
      if (pathname !== request.originPath && pathname !== '/creator/broadcasts') {
        pendingRequest = null;
        return;
      }

      const heading = renderedRequestedHeading(request.targetId);
      if (!heading) return;

      heading.focus();
      pendingRequest = null;
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
