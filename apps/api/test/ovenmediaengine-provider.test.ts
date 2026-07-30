import assert from 'node:assert/strict';
import test from 'node:test';
import { createOvenMediaEngineDeliveryProvider } from '../src/modules/media/ovenmediaengine-provider.js';

test('OvenMediaEngine provider creates relay delivery and signs playback URLs', async () => {
  const calls: Array<{
    url: string;
    method: string;
    authorization: string | null;
    body: unknown;
  }> = [];
  const responses = [
    new Response(JSON.stringify({ statusCode: 404 }), { status: 404 }),
    new Response(JSON.stringify({ statusCode: 201 }), { status: 201 }),
    new Response(
      JSON.stringify({
        statusCode: 200,
        response: { connections: { webrtc: 2, llhls: 5 } },
      }),
      { status: 200 },
    ),
    new Response(JSON.stringify({ statusCode: 200 }), { status: 200 }),
  ];

  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      authorization: headers.get('authorization'),
      body: init?.body ? JSON.parse(String(init.body)) : null,
    });
    const response = responses.shift();
    assert.ok(response, 'unexpected extra OME request');
    return response;
  }) as typeof fetch;

  const provider = createOvenMediaEngineDeliveryProvider(
    {
      apiUrl: 'https://ome-api.example.test:8081',
      accessToken: 'api-user:strong-password',
      vhost: 'default',
      app: 'live',
      webrtcBaseUrl: 'wss://media.example.test:3334',
      llhlsBaseUrl: 'https://media.example.test:3334',
      signedPolicySecret: 'signed-policy-secret',
      relayUrlTemplate:
        'rtsp://relay.internal:8554/{roomName}/{streamName}',
    },
    fetcher,
  );

  const health = await provider.ensureDelivery({
    broadcastId: '4e11b027-1f5f-49cf-a3a5-0d47126cc38b',
    streamName: 'broadcast-stream',
    contributionRoomName: 'broadcast-room',
  });
  assert.deepEqual(health, {
    ready: true,
    connections: { webrtc: 2, llhls: 5 },
  });
  assert.equal(calls[0]?.method, 'GET');
  assert.equal(calls[1]?.method, 'POST');
  assert.equal(
    calls[1]?.authorization,
    `Basic ${Buffer.from('api-user:strong-password').toString('base64')}`,
  );
  assert.deepEqual(calls[1]?.body, {
    name: 'broadcast-stream',
    urls: ['rtsp://relay.internal:8554/broadcast-room/broadcast-stream'],
    properties: {
      persistent: false,
      noInputFailoverTimeoutMs: 5000,
      unusedStreamDeletionTimeoutMs: 60000,
    },
  });

  const expiresAt = new Date('2030-01-02T03:04:05.000Z');
  const playback = provider.issuePlayback('broadcast-stream', expiresAt);
  assert.equal(playback.sources.length, 2);
  for (const source of playback.sources) {
    const url = new URL(source.url);
    assert.ok(url.searchParams.get('policy'));
    assert.ok(url.searchParams.get('signature'));
    const policy = JSON.parse(
      Buffer.from(url.searchParams.get('policy')!, 'base64url').toString('utf8'),
    );
    assert.equal(policy.url_expire, expiresAt.getTime());
    assert.equal(policy.stream_expire, expiresAt.getTime());
    assert.equal(source.url.includes('signed-policy-secret'), false);
  }
  assert.equal(playback.sources[0]?.protocol, 'webrtc');
  assert.equal(playback.sources[1]?.protocol, 'llhls');
  assert.ok(playback.sources[1]?.url.includes('/live/broadcast-stream/llhls.m3u8'));

  await provider.stopDelivery('broadcast-stream');
  assert.equal(calls[3]?.method, 'DELETE');
});
