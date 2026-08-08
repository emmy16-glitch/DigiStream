import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, count, eq } from 'drizzle-orm';
import { buildApp } from '../src/app.js';
import { createDatabase } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrate.js';
import {
  channels,
  organisationMemberships,
  organisations,
  users,
} from '../src/db/schema.js';
import { broadcastRecords } from '../src/modules/broadcasts/broadcasts.schema.js';
import { broadcastChatReports } from '../src/modules/chat/broadcast-chat.schema.js';
import { organisationAuditEvents } from '../src/modules/organisations/organisation-audit.schema.js';

const databaseUrl = process.env.DATABASE_URL;

function responseCookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers['set-cookie'];
  const value = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof value, 'string');
  return value.split(';', 1)[0] ?? '';
}

test(
  'broadcast chat moderation is durable, tenant-safe and idempotent',
  { skip: !databaseUrl, timeout: 90_000 },
  async () => {
    const database = createDatabase(databaseUrl);
    assert.ok(database);
    await runMigrations(database.pool);
    const app = buildApp({ database, realtime: false });
    const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
    const password = 'Chat-moderation-password-123!';
    const userIds: string[] = [];
    let organisationId = '';

    try {
      const register = async (label: string) => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/register',
          payload: {
            email: `chat-mod-${label}-${suffix}@example.test`,
            displayName: `Chat ${label}`,
            password,
          },
        });
        assert.equal(response.statusCode, 201);
        const userId = response.json().user.id as string;
        userIds.push(userId);
        return { userId, cookie: responseCookie(response) };
      };

      const owner = await register('Owner');
      const moderator = await register('Moderator');
      const analyst = await register('Analyst');
      const listener = await register('Listener');
      const outsider = await register('Outsider');

      const [organisation] = await database.db
        .insert(organisations)
        .values({
          name: 'Moderated Chat Network',
          slug: `moderated-chat-${suffix}`,
          createdByUserId: owner.userId,
        })
        .returning();
      assert.ok(organisation);
      organisationId = organisation.id;

      await database.db.insert(organisationMemberships).values([
        { organisationId, userId: owner.userId, role: 'owner' },
        { organisationId, userId: moderator.userId, role: 'moderator' },
        { organisationId, userId: analyst.userId, role: 'analyst' },
      ]);

      const [channel] = await database.db
        .insert(channels)
        .values({
          organisationId,
          name: 'Moderated public channel',
          slug: `moderated-public-${suffix}`,
          status: 'active',
          visibility: 'public',
          createdByUserId: owner.userId,
        })
        .returning();
      assert.ok(channel);

      const [broadcast] = await database.db
        .insert(broadcastRecords)
        .values({
          organisationId,
          channelId: channel.id,
          createdByUserId: owner.userId,
          title: 'Moderated live chat',
          slug: `moderated-live-${suffix}`,
          status: 'live',
          contributionRoomName: `moderated-room-${suffix}`,
          deliveryStreamName: `moderated-stream-${suffix}`,
        })
        .returning();
      assert.ok(broadcast);

      const publicPath =
        `/api/v1/broadcasts/${organisation.slug}/${channel.slug}/${broadcast.slug}/chat/messages`;
      const moderationPath =
        `/api/v1/organisations/${organisationId}/broadcasts/${broadcast.id}/chat/moderation`;

      const clientMessageId = randomUUID();
      const firstMessage = await app.inject({
        method: 'POST',
        url: publicPath,
        headers: { cookie: listener.cookie },
        payload: { clientMessageId, body: 'Please keep this discussion useful.' },
      });
      assert.equal(firstMessage.statusCode, 201);
      const messageId = firstMessage.json().message.id as string;

      const initialHistory = await app.inject({
        method: 'GET',
        url: publicPath,
        headers: { cookie: listener.cookie },
      });
      assert.equal(initialHistory.statusCode, 200);
      assert.deepEqual(initialHistory.json().chat.moderation, {
        chatDisabled: false,
        slowModeSeconds: 0,
        mutedUntil: null,
        blocked: false,
      });
      assert.equal(initialHistory.json().chat.canSend, true);

      const outsiderModeration = await app.inject({
        method: 'PATCH',
        url: moderationPath,
        headers: { cookie: outsider.cookie },
        payload: { chatDisabled: true },
      });
      assert.equal(outsiderModeration.statusCode, 404);
      assert.equal(outsiderModeration.json().error.code, 'CHAT_NOT_AVAILABLE');

      const analystModeration = await app.inject({
        method: 'PATCH',
        url: moderationPath,
        headers: { cookie: analyst.cookie },
        payload: { chatDisabled: true },
      });
      assert.equal(analystModeration.statusCode, 403);
      assert.equal(analystModeration.json().error.code, 'CHAT_MODERATION_FORBIDDEN');

      const slowMode = await app.inject({
        method: 'PATCH',
        url: moderationPath,
        headers: { cookie: moderator.cookie },
        payload: { slowModeSeconds: 30 },
      });
      assert.equal(slowMode.statusCode, 200);
      assert.equal(slowMode.json().settings.slowModeSeconds, 30);

      const replayDuringSlowMode = await app.inject({
        method: 'POST',
        url: publicPath,
        headers: { cookie: listener.cookie },
        payload: { clientMessageId, body: 'Please keep this discussion useful.' },
      });
      assert.equal(replayDuringSlowMode.statusCode, 200);
      assert.equal(replayDuringSlowMode.json().replayed, true);
      assert.equal(replayDuringSlowMode.json().message.id, messageId);

      const slowModeBlocked = await app.inject({
        method: 'POST',
        url: publicPath,
        headers: { cookie: listener.cookie },
        payload: { clientMessageId: randomUUID(), body: 'Second message too quickly.' },
      });
      assert.equal(slowModeBlocked.statusCode, 429);
      assert.equal(slowModeBlocked.json().error.code, 'CHAT_SLOW_MODE');
      assert.ok(slowModeBlocked.json().error.details.retryAfterSeconds >= 1);

      const disabled = await app.inject({
        method: 'PATCH',
        url: moderationPath,
        headers: { cookie: owner.cookie },
        payload: { chatDisabled: true, slowModeSeconds: 0 },
      });
      assert.equal(disabled.statusCode, 200);
      assert.equal(disabled.json().settings.chatDisabled, true);

      const disabledHistory = await app.inject({
        method: 'GET',
        url: publicPath,
        headers: { cookie: listener.cookie },
      });
      assert.equal(disabledHistory.statusCode, 200);
      assert.equal(disabledHistory.json().chat.canSend, false);
      assert.equal(disabledHistory.json().chat.moderation.chatDisabled, true);

      const disabledSend = await app.inject({
        method: 'POST',
        url: publicPath,
        headers: { cookie: listener.cookie },
        payload: { clientMessageId: randomUUID(), body: 'This should be disabled.' },
      });
      assert.equal(disabledSend.statusCode, 409);
      assert.equal(disabledSend.json().error.code, 'CHAT_DISABLED');

      const enabled = await app.inject({
        method: 'PATCH',
        url: moderationPath,
        headers: { cookie: moderator.cookie },
        payload: { chatDisabled: false },
      });
      assert.equal(enabled.statusCode, 200);

      const restrictionPath = `${moderationPath}/users/${listener.userId}`;
      const muted = await app.inject({
        method: 'PUT',
        url: restrictionPath,
        headers: { cookie: moderator.cookie },
        payload: { action: 'mute', durationSeconds: 60, reason: 'Cooling-off period' },
      });
      assert.equal(muted.statusCode, 200);
      assert.equal(typeof muted.json().restriction.mutedUntil, 'string');

      const mutedSend = await app.inject({
        method: 'POST',
        url: publicPath,
        headers: { cookie: listener.cookie },
        payload: { clientMessageId: randomUUID(), body: 'Muted message' },
      });
      assert.equal(mutedSend.statusCode, 429);
      assert.equal(mutedSend.json().error.code, 'CHAT_MUTED');

      const unmuted = await app.inject({
        method: 'PUT',
        url: restrictionPath,
        headers: { cookie: owner.cookie },
        payload: { action: 'unmute' },
      });
      assert.equal(unmuted.statusCode, 200);
      assert.equal(unmuted.json().restriction.mutedUntil, null);

      const blocked = await app.inject({
        method: 'PUT',
        url: restrictionPath,
        headers: { cookie: moderator.cookie },
        payload: { action: 'block', reason: 'Repeated abuse' },
      });
      assert.equal(blocked.statusCode, 200);
      assert.equal(blocked.json().restriction.blocked, true);

      const blockedSend = await app.inject({
        method: 'POST',
        url: publicPath,
        headers: { cookie: listener.cookie },
        payload: { clientMessageId: randomUUID(), body: 'Blocked message' },
      });
      assert.equal(blockedSend.statusCode, 403);
      assert.equal(blockedSend.json().error.code, 'CHAT_BLOCKED');

      const unblocked = await app.inject({
        method: 'PUT',
        url: restrictionPath,
        headers: { cookie: moderator.cookie },
        payload: { action: 'unblock' },
      });
      assert.equal(unblocked.statusCode, 200);
      assert.equal(unblocked.json().restriction.blocked, false);

      const reportPath = `${publicPath}/${messageId}/report`;
      const report = await app.inject({
        method: 'POST',
        url: reportPath,
        headers: { cookie: listener.cookie },
        payload: { reason: 'Potentially harmful content' },
      });
      assert.equal(report.statusCode, 201);
      assert.equal(report.json().replayed, false);

      const replayReport = await app.inject({
        method: 'POST',
        url: reportPath,
        headers: { cookie: listener.cookie },
        payload: { reason: 'A duplicate submit must not create another report' },
      });
      assert.equal(replayReport.statusCode, 200);
      assert.equal(replayReport.json().replayed, true);
      assert.equal(replayReport.json().report.id, report.json().report.id);

      const missingReport = await app.inject({
        method: 'POST',
        url: `${publicPath}/${randomUUID()}/report`,
        headers: { cookie: listener.cookie },
        payload: { reason: 'Missing message' },
      });
      assert.equal(missingReport.statusCode, 404);
      assert.equal(missingReport.json().error.code, 'CHAT_MESSAGE_NOT_FOUND');

      const [reportCount] = await database.db
        .select({ total: count() })
        .from(broadcastChatReports)
        .where(and(eq(broadcastChatReports.messageId, messageId), eq(broadcastChatReports.reporterUserId, listener.userId)));
      assert.equal(Number(reportCount?.total ?? 0), 1);

      const auditRows = await database.db
        .select({ action: organisationAuditEvents.action })
        .from(organisationAuditEvents)
        .where(eq(organisationAuditEvents.organisationId, organisationId));
      assert.ok(auditRows.some((row) => row.action === 'chat.settings.updated'));
      assert.ok(auditRows.some((row) => row.action === 'chat.user.muted'));
      assert.ok(auditRows.some((row) => row.action === 'chat.user.blocked'));
    } finally {
      await app.close();
      if (organisationId) {
        await database.db.delete(organisations).where(eq(organisations.id, organisationId));
      }
      for (const userId of userIds) {
        await database.db.delete(users).where(eq(users.id, userId));
      }
      await database.close();
    }
  },
);
