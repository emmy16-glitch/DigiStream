from __future__ import annotations

from pathlib import Path

ROOT = Path.cwd()


def replace_once(relative: str, old: str, new: str) -> None:
    path = ROOT / relative
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one match in {relative}, found {count}: {old[:120]!r}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print(f"updated {relative}")


replace_once(
    "apps/api/src/modules/broadcasts/broadcasts.repository.ts",
    """        eq(channelRecords.visibility, 'public'),
      ),
    )
    .orderBy(""",
    """        eq(channelRecords.visibility, 'public'),
        or(
          sql`${broadcastRecords.status} <> 'scheduled'`,
          sql`${broadcastRecords.scheduledStartAt} > now()`,
        ),
      ),
    )
    .orderBy(""",
)

replace_once(
    "apps/web/src/features/broadcasting/CreatorBroadcastsPage.tsx",
    """import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';
import './creator-broadcasts-page.css';""",
    """import { ApiClientError, apiRequest, jsonBody } from '../../lib/api-client';
import {
  presentationLabel,
  presentationStatus,
  type BroadcastPresentationStatus,
} from '../../lib/broadcast-lifecycle';
import './creator-broadcasts-page.css';""",
)
replace_once(
    "apps/web/src/features/broadcasting/CreatorBroadcastsPage.tsx",
    """function statusTone(status: Broadcast['status']): StatusTone {
  if (status === 'live') return 'live';""",
    """function statusTone(status: BroadcastPresentationStatus): StatusTone {
  if (status === 'overdue') return 'warning';
  if (status === 'live') return 'live';""",
)
replace_once(
    "apps/web/src/features/broadcasting/CreatorBroadcastsPage.tsx",
    """                {broadcasts.map((broadcast) => (
                  <article className="broadcast-row" key={broadcast.id}>
                    <div className="broadcast-row-main">
                      <div className="broadcast-row-status">
                        <StatusBadge tone={statusTone(broadcast.status)}>
                          {sentenceCase(broadcast.status)}
                        </StatusBadge>
                        <span>{formatDate(broadcast.scheduledStartAt ?? broadcast.liveStartedAt)}</span>
                      </div>
                      <h4>{broadcast.title}</h4>
                      <p>{broadcast.description || 'No description has been added.'}</p>
                      <small>/{organisation.slug}/{selectedChannel?.slug}/{broadcast.slug}</small>
                    </div>
                    <div className="broadcast-row-actions">
                      <span>Version {broadcast.lifecycleVersion}</span>
                      <Button onClick={onOpenStudio}>Open in Studio</Button>
                    </div>
                  </article>
                ))}""",
    """                {broadcasts.map((broadcast) => {
                  const displayStatus = presentationStatus(
                    broadcast.status,
                    broadcast.scheduledStartAt,
                  );
                  const overdue = displayStatus === 'overdue';
                  return (
                    <article
                      className={overdue ? 'broadcast-row broadcast-row-overdue' : 'broadcast-row'}
                      key={broadcast.id}
                    >
                      <div className="broadcast-row-main">
                        <div className="broadcast-row-status">
                          <StatusBadge tone={statusTone(displayStatus)}>
                            {presentationLabel(displayStatus)}
                          </StatusBadge>
                          <span>{formatDate(broadcast.scheduledStartAt ?? broadcast.liveStartedAt)}</span>
                        </div>
                        <h4>{broadcast.title}</h4>
                        <p>{broadcast.description || 'No description has been added.'}</p>
                        {overdue ? (
                          <p className="broadcast-overdue-note">
                            The scheduled start time passed before this broadcast went live.
                            Open Studio to start it now, or cancel it before creating a new schedule.
                          </p>
                        ) : null}
                        <small>/{organisation.slug}/{selectedChannel?.slug}/{broadcast.slug}</small>
                      </div>
                      <div className="broadcast-row-actions">
                        <span>Version {broadcast.lifecycleVersion}</span>
                        <Button onClick={onOpenStudio}>
                          {overdue ? 'Open Studio to recover' : 'Open in Studio'}
                        </Button>
                      </div>
                    </article>
                  );
                })}""",
)

replace_once(
    "apps/web/src/design-system/responsive-operations.css",
    "@media (pointer: coarse) and (max-width: 1180px) {",
    "@media (pointer: coarse), (hover: none) and (any-pointer: coarse) {",
)

replace_once(
    "apps/web/src/features/listening/ListenerBroadcastPage.tsx",
    """import { ApiClientError, apiRequest } from '../../lib/api-client';
import type { ListenerRoute } from './listener-route';""",
    """import { ApiClientError, apiRequest } from '../../lib/api-client';
import {
  isOverdueBroadcast,
  presentationLabel,
  presentationStatus,
} from '../../lib/broadcast-lifecycle';
import type { ListenerRoute } from './listener-route';""",
)
replace_once(
    "apps/web/src/features/listening/ListenerBroadcastPage.tsx",
    """  if (broadcast.status === 'scheduled') {
    return `Scheduled for ${formatDate(broadcast.scheduledStartAt)}.`;
  }""",
    """  if (broadcast.status === 'scheduled') {
    return isOverdueBroadcast(broadcast.status, broadcast.scheduledStartAt)
      ? 'The scheduled start time passed before this broadcast went live.'
      : `Scheduled for ${formatDate(broadcast.scheduledStartAt)}.`;
  }""",
)
replace_once(
    "apps/web/src/features/listening/ListenerBroadcastPage.tsx",
    """      } catch (requestError) {
        setError(readableError(requestError));
        if (requestError instanceof ApiClientError && requestError.code === 'BROADCAST_NOT_PLAYABLE') {
          setPhase('waiting');
          setMessage('The creator has not completed the public audio path yet.');
        } else {
          setPhase('error');
          setMessage('Playback is unavailable right now.');
        }
      } finally {""",
    """      } catch (requestError) {
        if (requestError instanceof ApiClientError && requestError.code === 'BROADCAST_NOT_PLAYABLE') {
          setError('');
          setPhase('waiting');
          setMessage('The creator has not completed the public audio path yet.');
        } else {
          setError(
            requestError instanceof ApiClientError
              ? `Live audio delivery is unavailable: ${requestError.message}`
              : readableError(requestError),
          );
          setPhase('error');
          setMessage('The application is online, but the live audio path is unavailable.');
        }
      } finally {""",
)
replace_once(
    "apps/web/src/features/listening/ListenerBroadcastPage.tsx",
    """    const onlineHandler = () => {
      setOnline(true);
      if (hasPlayedRef.current) scheduleRecovery();
      else setMessage('Connection restored. Tap Listen live when ready.');
    };""",
    """    const onlineHandler = () => {
      setOnline(true);
      setError('');
      if (hasPlayedRef.current) {
        scheduleRecovery();
        return;
      }
      void loadMetadata()
        .then((current) => {
          setPhase(
            current.status === 'completed'
              ? 'ended'
              : playableStatuses.has(current.status)
                ? 'ready'
                : 'waiting',
          );
          setMessage(statusCopy(current));
        })
        .catch((requestError) => {
          setError(readableError(requestError));
          setPhase('error');
          setMessage('Broadcast details could not be refreshed after the connection returned.');
        });
    };""",
)
replace_once(
    "apps/web/src/features/listening/ListenerBroadcastPage.tsx",
    """  }, [scheduleRecovery]);""",
    """  }, [loadMetadata, scheduleRecovery]);""",
)
replace_once(
    "apps/web/src/features/listening/ListenerBroadcastPage.tsx",
    """  const primaryLabel =
    phase === 'playing' || phase === 'buffering'
      ? 'Pause'
      : phase === 'paused'
        ? 'Resume'
        : phase === 'reconnecting'
          ? 'Reconnecting…'
          : 'Listen live';

  return (""",
    """  const primaryLabel =
    phase === 'playing' || phase === 'buffering'
      ? 'Pause'
      : phase === 'paused'
        ? 'Resume'
        : phase === 'reconnecting'
          ? 'Reconnecting…'
          : isPlayable
            ? 'Listen live'
            : 'Check live status';
  const displayStatus = broadcast
    ? presentationStatus(broadcast.status, broadcast.scheduledStartAt)
    : null;
  const connectionDetail = !online
    ? 'Network unavailable'
    : isPlayable
      ? protocolLabel(activeProtocol)
      : 'Waiting for the broadcast to enter a playable state';

  return (""",
)
replace_once(
    "apps/web/src/features/listening/ListenerBroadcastPage.tsx",
    """          <span className={`listener-live-badge ${broadcast?.status ?? 'unknown'}`}>
            <i /> {broadcast?.status === 'live' ? 'Live now' : broadcast?.status ?? 'Loading'}
          </span>""",
    """          <span className={`listener-live-badge ${displayStatus ?? 'unknown'}`}>
            <i /> {displayStatus ? presentationLabel(displayStatus) : 'Loading'}
          </span>""",
)
replace_once(
    "apps/web/src/features/listening/ListenerBroadcastPage.tsx",
    "<small>{online ? protocolLabel(activeProtocol) : 'Network unavailable'}</small>",
    "<small>{connectionDetail}</small>",
)

replace_once(
    "apps/web/src/features/chat/PublicBroadcastChat.tsx",
    """      setError(
        requestError instanceof ApiClientError
          ? requestError.message
          : 'Live chat metadata could not be loaded.',
      );""",
    """      setError(
        requestError instanceof ApiClientError && requestError.code === 'API_UNREACHABLE'
          ? 'Broadcast chat temporarily lost its server connection. Broadcast details remain available, and chat will retry automatically.'
          : requestError instanceof ApiClientError
            ? requestError.message
            : 'Live chat metadata could not be loaded.',
      );""",
)

replace_once(
    "apps/web/src/main.tsx",
    """import './design-system/responsive-operations.css';
""",
    """import './design-system/responsive-operations.css';
import './design-system/manual-review-fixes.css';
""",
)

(ROOT / "apps/web/src/design-system/manual-review-fixes.css").write_text(
    """/* Final manual-review corrections for PR #29. */

.listener-orb::after {
  content: none;
}

.ds-listener-content {
  min-height: auto;
}

.ds-listener-content > .listener-page .listener-shell {
  min-height: auto;
  padding-block: clamp(24px, 5vw, 64px);
  align-items: start;
}

.ds-listener-shell:has(.listener-call-in-role-action) .ds-listener-content {
  padding-bottom: 24px;
}

.ds-listener-shell:has(.listener-call-in-role-action) .ds-listener-footer {
  margin-bottom: calc(82px + env(safe-area-inset-bottom));
}

.broadcast-row-overdue {
  border-color: color-mix(in srgb, #f3b33d 45%, var(--ds-border-subtle));
}

.broadcast-overdue-note {
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, #f3b33d 30%, transparent);
  border-radius: var(--ds-radius-md);
  color: #f5d89b !important;
  background: color-mix(in srgb, #f3b33d 9%, transparent);
  font-size: var(--ds-text-sm);
}

@media (max-width: 640px) {
  .ds-listener-shell:has(.listener-call-in-role-action) .ds-listener-footer {
    margin-bottom: calc(96px + env(safe-area-inset-bottom));
  }
}

@media (orientation: landscape) and (max-height: 700px) {
  .ds-listener-content > .listener-page .listener-shell {
    min-height: auto;
    padding-block: 18px;
    gap: clamp(18px, 4vw, 40px);
    align-items: center;
  }

  .ds-listener-content > .listener-page .listener-stage {
    min-height: min(260px, 66dvh);
  }

  .ds-listener-content > .listener-page .listener-orb {
    width: min(220px, 34vw);
    padding: 42px;
  }

  .ds-listener-content > .listener-page .listener-card {
    padding: 22px;
  }
}
""",
    encoding="utf-8",
)
print("created apps/web/src/design-system/manual-review-fixes.css")

replace_once(
    "tests/ui/creator-responsive.spec.ts",
    """  await expect(broadcastRow).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await attachViewport(page, testInfo, 'broadcasts');""",
    """  await expect(broadcastRow).toBeVisible();
  await expectNoHorizontalOverflow(page);
  if (testInfo.project.name === 'android-desktop-site') {
    const headingFontSize = await page
      .getByRole('heading', { name: 'Broadcasts', exact: true })
      .last()
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(headingFontSize).toBeGreaterThanOrEqual(20);
    const studioButton = broadcastRow.getByRole('button', { name: 'Open in Studio' });
    const studioButtonBox = await studioButton.boundingBox();
    expect(studioButtonBox).not.toBeNull();
    expect(studioButtonBox!.height).toBeGreaterThanOrEqual(44);
  }
  await attachViewport(page, testInfo, 'broadcasts');""",
)

(ROOT / "tests/ui/manual-review-regressions.spec.ts").write_text(
    """import { expect, test } from '@playwright/test';

const broadcast = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Manual review broadcast',
  slug: 'manual-review-broadcast',
  description: 'A scheduled broadcast used for responsive regression coverage.',
  status: 'scheduled',
  scheduledStartAt: new Date(Date.now() + 60 * 60_000).toISOString(),
  liveStartedAt: null,
  endedAt: null,
  organisation: {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Manual Review Organisation',
    slug: 'manual-review-org',
  },
  channel: {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Manual Review Channel',
    slug: 'manual-review-channel',
    category: 'community',
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

test('scheduled listener page keeps lifecycle honest and fixed creator CTA clear', async ({ page, context }) => {
  await page.route('**/api/v1/broadcasts/manual-review-org/manual-review-channel/manual-review-broadcast', async (route) => {
    await route.fulfill({ json: { broadcast } });
  });
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: '44444444-4444-4444-8444-444444444444',
          email: 'creator@example.test',
          displayName: 'Manual Review Creator',
        },
      },
    });
  });
  await page.route('**/api/v1/organisations', async (route) => {
    await route.fulfill({
      json: {
        organisations: [
          {
            id: broadcast.organisation.id,
            name: broadcast.organisation.name,
            slug: broadcast.organisation.slug,
            role: 'owner',
          },
        ],
      },
    });
  });

  await page.goto('/listen/manual-review-org/manual-review-channel/manual-review-broadcast');
  await expect(page.getByRole('heading', { name: broadcast.title })).toBeVisible();
  await expect(page.getByText(/Scheduled for/).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Manage broadcast' })).toBeVisible();

  const pseudoContent = await page.locator('.listener-orb').evaluate((element) =>
    getComputedStyle(element, '::after').content,
  );
  expect(['none', 'normal', '\"\"']).toContain(pseudoContent);

  await context.setOffline(true);
  await expect(page.getByText('Your device is offline.')).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByText(/Scheduled for/).first()).toBeVisible();
  await expect(page.getByText(/Connection restored\\. Tap Listen live/)).toHaveCount(0);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const actionBox = await page.getByRole('link', { name: 'Manage broadcast' }).boundingBox();
  const footerBox = await page.locator('.ds-listener-footer').boundingBox();
  expect(actionBox).not.toBeNull();
  expect(footerBox).not.toBeNull();
  expect(footerBox!.y + footerBox!.height).toBeLessThanOrEqual(actionBox!.y - 4);
});
""",
    encoding="utf-8",
)
print("created tests/ui/manual-review-regressions.spec.ts")

print("PR #29 manual-review patch applied successfully")
