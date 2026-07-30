import assert from 'node:assert/strict';
import test from 'node:test';
import { LiveKitEgressProvider } from '../src/modules/media/livekit-egress-provider.js';

function decodePayload(token: string): Record<string, unknown> {
  const part = token.split('.')[1];
  assert.ok(part);
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as Record<
    string,
    unknown
  >;
}

test('LiveKit Egress starts, inspects and stops an audio-only RTMP relay', async () => {
  const requests: Array<{ url: string; body: Record<string, unknown>; token: string }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const authorization = new Headers(init?.headers).get('authorization');
    assert.ok(authorization?.startsWith('Bearer '));
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
    requests.push({ url, body, token: authorization.slice(7) });

    if (url.endsWith('/StartRoomCompositeEgress')) {
      return new Response(
        JSON.stringify({ egress_id: 'EG_test', status: 'EGRESS_STARTING' }),
        { status: 200 },
      );
    }
    if (url.endsWith('/ListEgress')) {
      return new Response(
        JSON.stringify({
          items: [{ egress_id: 'EG_test', status: 'EGRESS_ACTIVE' }],
        }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({ egress_id: 'EG_test', status: 'EGRESS_COMPLETE' }),
      { status: 200 },
    );
  };

  const provider = new LiveKitEgressProvider(
    {
      apiUrl: 'https://livekit.example.test',
      apiKey: 'devkey',
      apiSecret: 'development-secret',
      requestTimeoutMs: 5_000,
    },
    {
      fetchImpl,
      now: () => new Date('2026-07-30T18:00:00.000Z'),
    },
  );

  const started = await provider.startAudioRelay({
    broadcastId: 'broadcast-id',
    roomName: 'broadcast-room',
    targetUrl: 'rtmp://ome.example.test:1935/app/public-stream',
    protocol: 'rtmp',
  });
  assert.equal(started.externalId, 'EG_test');
  assert.equal(started.status, 'starting');

  const startBody = requests[0]?.body;
  assert.equal(startBody?.room_name, 'broadcast-room');
  assert.equal(startBody?.audio_only, true);
  assert.deepEqual(startBody?.stream_outputs, [
    {
      protocol: 'RTMP',
      urls: ['rtmp://ome.example.test:1935/app/public-stream'],
    },
  ]);

  const tokenPayload = decodePayload(requests[0]!.token);
  assert.deepEqual(tokenPayload.video, { roomRecord: true });

  const active = await provider.inspectRelay('EG_test');
  assert.equal(active.status, 'active');

  const stopped = await provider.stopRelay('EG_test');
  assert.equal(stopped.status, 'stopped');
  assert.ok(requests[2]?.url.endsWith('/StopEgress'));
});
