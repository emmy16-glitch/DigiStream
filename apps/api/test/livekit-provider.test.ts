import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import { LiveKitContributionProvider } from '../src/modules/media/livekit-provider.js';

const config = {
  clientUrl: 'wss://livekit.example.test',
  apiUrl: 'https://livekit.example.test',
  apiKey: 'test-api-key',
  apiSecret: 'test-api-secret',
  tokenTtlSeconds: 300,
  roomEmptyTimeoutSeconds: 600,
  roomDepartureTimeoutSeconds: 60,
  roomMaxParticipants: 12,
  requestTimeoutMs: 5_000,
};

function decodeToken(token: string): Record<string, unknown> {
  const [header, payload, signature] = token.split('.');
  assert.ok(header && payload && signature);
  const expected = createHmac('sha256', config.apiSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
  assert.equal(signature, expected);
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;
}

test('LiveKit provider creates a missing room and issues microphone-only tokens', async () => {
  const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    requests.push({ url, body });
    if (url.endsWith('/ListRooms')) {
      return new Response(JSON.stringify({ rooms: [] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ name: body.name }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };

  const provider = new LiveKitContributionProvider(config, {
    fetchImpl,
    now: () => new Date('2026-07-30T18:00:00.000Z'),
  });
  const room = {
    roomName: 'broadcast-room-123',
    broadcastId: '11111111-1111-4111-8111-111111111111',
    organisationId: '22222222-2222-4222-8222-222222222222',
    channelId: '33333333-3333-4333-8333-333333333333',
  };

  await provider.ensureRoom(room);
  assert.equal(requests.length, 2);
  assert.ok(requests[0]?.url.endsWith('/ListRooms'));
  assert.ok(requests[1]?.url.endsWith('/CreateRoom'));
  assert.equal(requests[1]?.body.name, room.roomName);
  assert.equal(requests[1]?.body.max_participants, 12);

  const credential = await provider.issueCredential({
    ...room,
    userId: '44444444-4444-4444-8444-444444444444',
    displayName: 'Creator Test',
    participantRole: 'host',
  });
  assert.equal(credential.provider, 'livekit');
  assert.equal(credential.url, config.clientUrl);
  assert.equal(credential.permissions.canPublish, true);
  assert.deepEqual(credential.permissions.canPublishSources, ['microphone']);

  const payload = decodeToken(credential.token);
  assert.equal(payload.iss, config.apiKey);
  assert.equal(payload.name, 'Creator Test');
  assert.equal(Number(payload.exp) - Number(payload.nbf), 300);
  const video = payload.video as Record<string, unknown>;
  assert.equal(video.room, room.roomName);
  assert.equal(video.roomJoin, true);
  assert.equal(video.canPublish, true);
  assert.equal(video.canPublishData, false);
  assert.deepEqual(video.canPublishSources, ['microphone']);
});

test('LiveKit monitor credentials cannot publish and existing rooms are reused', async () => {
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response(
      JSON.stringify({ rooms: [{ name: 'existing-room' }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  const provider = new LiveKitContributionProvider(config, { fetchImpl });
  const room = {
    roomName: 'existing-room',
    broadcastId: '11111111-1111-4111-8111-111111111111',
    organisationId: '22222222-2222-4222-8222-222222222222',
    channelId: '33333333-3333-4333-8333-333333333333',
  };

  await provider.ensureRoom(room);
  assert.equal(calls, 1);

  const credential = await provider.issueCredential({
    ...room,
    userId: '55555555-5555-4555-8555-555555555555',
    displayName: 'Moderator Test',
    participantRole: 'monitor',
  });
  assert.equal(credential.permissions.canPublish, false);
  assert.deepEqual(credential.permissions.canPublishSources, []);
  const video = decodeToken(credential.token).video as Record<string, unknown>;
  assert.equal(video.canPublish, false);
  assert.equal(video.canSubscribe, true);
});
