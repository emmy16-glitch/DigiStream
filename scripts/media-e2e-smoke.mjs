#!/usr/bin/env node

import { createHmac, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';

const composeFile = process.env.DIGISTREAM_MEDIA_COMPOSE ?? 'compose.media.yml';
const apiBase = process.env.DIGISTREAM_API_URL ?? 'http://127.0.0.1:3000';
const liveKitApiUrl = process.env.LIVEKIT_SMOKE_API_URL ?? 'http://127.0.0.1:7880';
const liveKitApiKey = process.env.LIVEKIT_API_KEY ?? 'devkey';
const liveKitApiSecret = process.env.LIVEKIT_API_SECRET ?? 'secret';
const mediaControlSecret =
  process.env.MEDIA_CONTROL_SECRET ??
  'local-media-control-secret-change-before-deployment';

const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
const email = `media-smoke-${suffix}@example.test`;
const password = 'Media-smoke-password-123!';
const organisationSlug = `media-smoke-${suffix}`;
const channelSlug = `audio-${suffix}`;
const broadcastSlug = `live-${suffix}`;
let publisher = null;
let cookie = '';
let organisationId = '';
let broadcastId = '';
let lifecycleVersion = 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function liveKitServiceToken(video) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: 'HS256', typ: 'JWT' });
  const payload = encodeJson({
    iss: liveKitApiKey,
    nbf: issuedAt,
    exp: issuedAt + 60,
    jti: randomUUID(),
    video,
  });
  const unsigned = `${header}.${payload}`;
  const signature = createHmac('sha256', liveKitApiSecret)
    .update(unsigned)
    .digest('base64url');
  return `${unsigned}.${signature}`;
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers);
  if (options.body !== undefined) headers.set('content-type', 'application/json');
  if (cookie) headers.set('cookie', cookie);

  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
    body:
      options.body === undefined || typeof options.body === 'string'
        ? options.body
        : JSON.stringify(options.body),
  });
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    throw new Error(
      `${options.method ?? 'GET'} ${path} failed with ${response.status}: ${
        typeof payload === 'string' ? payload : JSON.stringify(payload)
      }`,
    );
  }
  return { response, payload };
}

function compose(args, options = {}) {
  const result = spawnSync('docker', ['compose', '-f', composeFile, ...args], {
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `docker compose ${args.join(' ')} failed: ${result.stderr || result.stdout}`,
    );
  }
  return result.stdout?.trim() ?? '';
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function psql(statement) {
  compose(
    [
      'exec',
      '-T',
      'postgres',
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      'digistream',
      '-d',
      'digistream',
      '-c',
      statement,
    ],
    { capture: true },
  );
}

async function waitForApi() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${apiBase}/health`);
      const body = await response.json();
      if (response.ok && body.database?.status === 'connected') return;
    } catch {
      // The stack is still starting.
    }
    await sleep(2_000);
  }
  throw new Error('DigiStream API did not become healthy within 120 seconds.');
}

function hasUnmutedAudioTrack(participant) {
  return (
    Array.isArray(participant?.tracks) &&
    participant.tracks.some((track) => {
      const audioType = track?.type === 'AUDIO' || track?.type === 0;
      const microphoneSource =
        track?.source === 'MICROPHONE' || track?.source === 2;
      return (audioType || microphoneSource) && track?.muted !== true;
    })
  );
}

async function waitForPublisher(roomName) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (publisher?.exitCode !== null) {
      throw new Error(
        `LiveKit audio publisher exited early with ${publisher?.exitCode}.`,
      );
    }
    try {
      const response = await fetch(
        `${liveKitApiUrl}/twirp/livekit.RoomService/ListParticipants`,
        {
          method: 'POST',
          headers: {
            authorization: `Bearer ${liveKitServiceToken({
              room: roomName,
              roomAdmin: true,
            })}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ room: roomName }),
        },
      );
      if (response.ok) {
        const body = await response.json();
        if (
          Array.isArray(body.participants) &&
          body.participants.some(hasUnmutedAudioTrack)
        ) {
          return;
        }
      }
    } catch {
      // LiveKit or the audio publisher is still connecting.
    }
    await sleep(2_000);
  }
  throw new Error(
    'The simulated publisher did not publish an unmuted LiveKit audio track in time.',
  );
}

async function waitForDelivery() {
  const deadline = Date.now() + 150_000;
  let last = null;
  while (Date.now() < deadline) {
    const { payload } = await api(
      `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/delivery/refresh`,
      { method: 'POST' },
    );
    last = payload.delivery;
    lifecycleVersion = last.broadcast.lifecycleVersion;
    if (last.ready && last.broadcast.status === 'live') return last;
    if (last.broadcast.status === 'failed') {
      throw new Error('The media bridge reported a failed broadcast.');
    }
    await sleep(3_000);
  }
  throw new Error(`OME delivery did not become ready. Last state: ${JSON.stringify(last)}`);
}

async function waitForLlHls(url) {
  const deadline = Date.now() + 90_000;
  let lastStatus = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { redirect: 'error' });
      lastStatus = response.status;
      const body = await response.text();
      if (response.ok && body.includes('#EXTM3U')) return;
    } catch {
      // OME may be creating the first segment.
    }
    await sleep(2_000);
  }
  throw new Error(`The signed LL-HLS manifest was not available. Last status: ${lastStatus}`);
}

async function cleanup() {
  if (publisher && publisher.exitCode === null) {
    publisher.kill('SIGTERM');
    await Promise.race([
      new Promise((resolve) => publisher.once('exit', resolve)),
      sleep(5_000),
    ]);
    if (publisher.exitCode === null) publisher.kill('SIGKILL');
  }

  if (organisationId && broadcastId && cookie) {
    try {
      const detail = await api(
        `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}`,
      );
      lifecycleVersion = detail.payload.broadcast.lifecycleVersion;
      const status = detail.payload.broadcast.status;
      if (status === 'live' || status === 'reconnecting' || status === 'starting') {
        const ended = await api(
          `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/end`,
          {
            method: 'POST',
            headers: { 'idempotency-key': `smoke-end-${suffix}` },
            body: { expectedVersion: lifecycleVersion },
          },
        );
        lifecycleVersion = ended.payload.broadcast.lifecycleVersion;
      }
      if (status === 'ending' || lifecycleVersion > 0) {
        await api(
          `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/delivery/stop`,
          { method: 'POST' },
        ).catch(() => undefined);
      }
    } catch {
      // SQL cleanup below removes all smoke records.
    }
  }

  try {
    psql(`DELETE FROM organisations WHERE slug = ${sqlLiteral(organisationSlug)};`);
    psql(`DELETE FROM users WHERE email = ${sqlLiteral(email)};`);
  } catch {
    // Preserve the original smoke-test failure.
  }
}

async function main() {
  console.log('Waiting for the local DigiStream media stack...');
  await waitForApi();

  const registration = await api('/api/v1/auth/register', {
    method: 'POST',
    body: {
      email,
      displayName: 'Media Smoke Broadcaster',
      password,
    },
  });
  const setCookie = registration.response.headers.get('set-cookie');
  if (!setCookie) throw new Error('Registration returned no session cookie.');
  cookie = setCookie.split(';', 1)[0];

  psql(`
    INSERT INTO user_platform_capabilities (
      user_id,
      capability,
      granted_by_user_id
    )
    SELECT id, 'broadcaster', id
    FROM users
    WHERE email = ${sqlLiteral(email)}
    ON CONFLICT (user_id, capability)
    DO UPDATE SET revoked_at = NULL;
  `);

  const organisation = await api('/api/v1/organisations', {
    method: 'POST',
    body: { name: 'Media Smoke Network', slug: organisationSlug },
  });
  organisationId = organisation.payload.organisation.id;

  const channel = await api(
    `/api/v1/organisations/${organisationId}/channels`,
    {
      method: 'POST',
      body: {
        name: 'Audio Smoke Channel',
        slug: channelSlug,
        category: 'technology',
        visibility: 'public',
      },
    },
  );
  const channelId = channel.payload.channel.id;

  await api(`/api/v1/organisations/${organisationId}/channels/${channelId}`, {
    method: 'PATCH',
    body: { status: 'pending_review' },
  });
  await api(`/api/v1/organisations/${organisationId}/channels/${channelId}`, {
    method: 'PATCH',
    body: { status: 'active' },
  });

  const broadcast = await api(
    `/api/v1/organisations/${organisationId}/channels/${channelId}/broadcasts`,
    {
      method: 'POST',
      body: {
        title: 'Live media smoke test',
        slug: broadcastSlug,
        description: 'Automated LiveKit to OvenMediaEngine verification.',
      },
    },
  );
  broadcastId = broadcast.payload.broadcast.id;
  lifecycleVersion = broadcast.payload.broadcast.lifecycleVersion;

  const scheduled = await api(
    `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/schedule`,
    {
      method: 'POST',
      headers: { 'idempotency-key': `smoke-schedule-${suffix}` },
      body: {
        expectedVersion: lifecycleVersion,
        scheduledStartAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      },
    },
  );
  lifecycleVersion = scheduled.payload.broadcast.lifecycleVersion;

  const started = await api(
    `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/start`,
    {
      method: 'POST',
      headers: { 'idempotency-key': `smoke-start-${suffix}` },
      body: { expectedVersion: lifecycleVersion },
    },
  );
  lifecycleVersion = started.payload.broadcast.lifecycleVersion;

  const contribution = await api(
    `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/contribution-token`,
    { method: 'POST', body: { participantRole: 'host' } },
  );
  const roomName = contribution.payload.credential.roomName;

  publisher = spawn(
    'docker',
    [
      'compose',
      '-f',
      composeFile,
      '--profile',
      'tools',
      'run',
      '--rm',
      'livekit-cli',
      'load-test',
      '--url',
      'ws://livekit:7880',
      '--api-key',
      liveKitApiKey,
      '--api-secret',
      liveKitApiSecret,
      '--room',
      roomName,
      '--audio-publishers',
      '1',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  publisher.stdout.on('data', (chunk) =>
    process.stdout.write(`[audio-publisher] ${chunk}`),
  );
  publisher.stderr.on('data', (chunk) =>
    process.stderr.write(`[audio-publisher] ${chunk}`),
  );

  await waitForPublisher(roomName);

  const contributionReady = await api(
    `/api/v1/internal/media/broadcasts/${broadcastId}/events`,
    {
      method: 'POST',
      headers: { 'x-digistream-media-secret': mediaControlSecret },
      body: {
        event: 'contribution_ready',
        idempotencyKey: `smoke-contribution-ready-${suffix}`,
      },
    },
  );
  lifecycleVersion = contributionReady.payload.broadcast.lifecycleVersion;

  const deliveryStart = await api(
    `/api/v1/organisations/${organisationId}/broadcasts/${broadcastId}/delivery/start`,
    { method: 'POST' },
  );
  lifecycleVersion = deliveryStart.payload.delivery.broadcast.lifecycleVersion;

  const delivery = deliveryStart.payload.delivery.ready
    ? deliveryStart.payload.delivery
    : await waitForDelivery();
  lifecycleVersion = delivery.broadcast.lifecycleVersion;

  const playback = await api(
    `/api/v1/broadcasts/${organisationSlug}/${channelSlug}/${broadcastSlug}/playback`,
  );
  const llhls = playback.payload.playback.sources.find(
    (source) => source.protocol === 'llhls',
  );
  if (!llhls?.url) throw new Error('Playback response contained no LL-HLS source.');
  await waitForLlHls(llhls.url);

  console.log('PASS: LiveKit room -> Egress -> OME -> signed LL-HLS manifest.');
}

try {
  await main();
} finally {
  await cleanup();
}
