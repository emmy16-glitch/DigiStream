import { createHash, randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { Socket } from 'node:net';
import type { FastifyInstance } from 'fastify';
import {
  authenticateSessionCookie,
  sessionRemainsActive,
} from '../../auth/session-auth.js';
import type { DatabaseContext } from '../../db/client.js';
import { RealtimeHub, type RealtimeConnection } from './realtime-hub.js';
import {
  authorizeRealtimeRoom,
  parseRealtimeRoom,
  userRoom,
} from './realtime-rooms.js';
import {
  encodeCloseFrame,
  encodeJsonFrame,
  encodeWebSocketFrame,
  WebSocketFrameParser,
  WebSocketProtocolError,
} from './websocket-protocol.js';

export const REALTIME_PATH = '/api/v1/realtime';
export const REALTIME_PROTOCOL = 'digistream.realtime.v1';

export type RealtimeServerOptions = {
  allowedOrigins?: string[];
  heartbeatIntervalMs?: number;
  sessionCheckIntervalMs?: number;
  maxMessageBytes?: number;
  maxBufferedBytes?: number;
  maxConnectionsPerUser?: number;
  maxMessagesPerWindow?: number;
  messageWindowMs?: number;
  maxReactionsPerWindow?: number;
  reactionWindowMs?: number;
  typingTtlMs?: number;
};

type ResolvedRealtimeOptions = Required<RealtimeServerOptions>;

type ClientMessage = {
  type?: unknown;
  requestId?: unknown;
  room?: unknown;
  reaction?: unknown;
  active?: unknown;
};

type ReactionWindow = { startedAt: number; count: number };

type InteractionRuntime = {
  reactionWindows: Map<string, ReactionWindow>;
  typingTimers: Map<string, NodeJS.Timeout>;
};

const ALLOWED_REACTIONS = new Set(['👍', '❤️', '👏', '😂', '🔥', '🎉']);

const STATUS_TEXT: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  426: 'Upgrade Required',
  429: 'Too Many Requests',
  503: 'Service Unavailable',
};

function boundedInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return Number.isInteger(value) && value! >= minimum && value! <= maximum
    ? value!
    : fallback;
}

function resolveOptions(options: RealtimeServerOptions): ResolvedRealtimeOptions {
  const configuredOrigins =
    options.allowedOrigins ??
    (process.env.REALTIME_ALLOWED_ORIGINS ?? process.env.WEB_ORIGIN ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter((value) => /^https?:\/\//.test(value));

  if (process.env.NODE_ENV === 'production' && configuredOrigins.length === 0) {
    throw new Error(
      'REALTIME_ALLOWED_ORIGINS or WEB_ORIGIN must be configured in production.',
    );
  }

  return {
    allowedOrigins: configuredOrigins,
    heartbeatIntervalMs: boundedInteger(
      options.heartbeatIntervalMs,
      30_000,
      1_000,
      120_000,
    ),
    sessionCheckIntervalMs: boundedInteger(
      options.sessionCheckIntervalMs,
      60_000,
      1_000,
      10 * 60_000,
    ),
    maxMessageBytes: boundedInteger(
      options.maxMessageBytes,
      16 * 1024,
      1_024,
      256 * 1024,
    ),
    maxBufferedBytes: boundedInteger(
      options.maxBufferedBytes,
      1024 * 1024,
      64 * 1024,
      16 * 1024 * 1024,
    ),
    maxConnectionsPerUser: boundedInteger(
      options.maxConnectionsPerUser,
      10,
      1,
      100,
    ),
    maxMessagesPerWindow: boundedInteger(
      options.maxMessagesPerWindow,
      40,
      5,
      1_000,
    ),
    messageWindowMs: boundedInteger(
      options.messageWindowMs,
      10_000,
      1_000,
      60_000,
    ),
    maxReactionsPerWindow: boundedInteger(
      options.maxReactionsPerWindow,
      8,
      1,
      100,
    ),
    reactionWindowMs: boundedInteger(
      options.reactionWindowMs,
      10_000,
      1_000,
      60_000,
    ),
    typingTtlMs: boundedInteger(options.typingTtlMs, 5_000, 1_000, 30_000),
  };
}

function rejectUpgrade(
  socket: Socket,
  statusCode: number,
  code: string,
  message: string,
  extraHeaders: Record<string, string> = {},
): void {
  const body = JSON.stringify({ error: { code, message } });
  const headers = Object.entries(extraHeaders)
    .map(([name, value]) => `${name}: ${value}\r\n`)
    .join('');
  socket.end(
    `HTTP/1.1 ${statusCode} ${STATUS_TEXT[statusCode] ?? 'Error'}\r\n` +
      'Connection: close\r\n' +
      'Content-Type: application/json\r\n' +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      headers +
      '\r\n' +
      body,
  );
}

function validWebSocketKey(value: string | undefined): value is string {
  if (!value) return false;
  try {
    return Buffer.from(value, 'base64').length === 16;
  } catch {
    return false;
  }
}

function originAllowed(
  request: IncomingMessage,
  allowedOrigins: string[],
): boolean {
  const origin = request.headers.origin;
  if (!origin) {
    return (
      process.env.NODE_ENV !== 'production' ||
      process.env.REALTIME_ALLOW_MISSING_ORIGIN === 'true'
    );
  }
  return allowedOrigins.includes(origin);
}

function requestId(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 && value.length <= 100
    ? value
    : undefined;
}

function sendError(
  connection: RealtimeConnection,
  code: string,
  message: string,
  id?: string,
  details?: Record<string, unknown>,
): void {
  connection.send({
    type: 'realtime.error',
    requestId: id,
    error: { code, message, ...details },
  });
}

function broadcastPresenceRoom(roomKey: string) {
  if (!roomKey.startsWith('broadcast:')) return null;
  return {
    key: roomKey,
    kind: 'broadcast' as const,
    id: roomKey.slice('broadcast:'.length),
  };
}

function publishPresence(
  hub: RealtimeHub,
  roomKey: string,
  userId: string,
  state: 'online' | 'offline',
  reason: 'joined' | 'left' | 'connection-ended',
): void {
  const room = broadcastPresenceRoom(roomKey);
  if (!room) return;
  hub.publish(roomKey, {
    type: 'presence.changed',
    room,
    user: { id: userId },
    state,
    reason,
    scope: 'socket',
    timestamp: new Date().toISOString(),
  });
}

function typingKey(connectionId: string, roomKey: string): string {
  return `${connectionId}:${roomKey}`;
}

function clearTypingForConnection(
  runtime: InteractionRuntime,
  hub: RealtimeHub,
  connection: RealtimeConnection,
): void {
  const prefix = `${connection.id}:`;
  for (const [key, timer] of runtime.typingTimers) {
    if (!key.startsWith(prefix)) continue;
    clearTimeout(timer);
    runtime.typingTimers.delete(key);
    const roomKey = key.slice(prefix.length);
    hub.publish(roomKey, {
      type: 'typing.changed',
      room: { key: roomKey, kind: 'broadcast', id: roomKey.slice('broadcast:'.length) },
      user: { id: connection.userId },
      active: false,
      reason: 'connection-ended',
      timestamp: new Date().toISOString(),
    });
  }
  runtime.reactionWindows.delete(connection.id);
}

async function handleClientMessage(
  database: DatabaseContext,
  hub: RealtimeHub,
  connection: RealtimeConnection,
  text: string,
  options: ResolvedRealtimeOptions,
  runtime: InteractionRuntime,
): Promise<void> {
  const now = Date.now();
  if (now - connection.messageWindowStartedAt >= options.messageWindowMs) {
    connection.messageWindowStartedAt = now;
    connection.messageCount = 0;
  }
  connection.messageCount += 1;
  if (connection.messageCount > options.maxMessagesPerWindow) {
    sendError(
      connection,
      'REALTIME_RATE_LIMITED',
      'Too many real-time commands were sent.',
    );
    connection.close(1008, 'Command rate limit exceeded');
    return;
  }

  let message: ClientMessage;
  try {
    const parsed = JSON.parse(text) as unknown;
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new Error('not an object');
    }
    message = parsed as ClientMessage;
  } catch {
    sendError(
      connection,
      'INVALID_REALTIME_MESSAGE',
      'Send a valid JSON object.',
    );
    return;
  }

  const id = requestId(message.requestId);
  if (message.type === 'ping') {
    connection.send({
      type: 'realtime.pong',
      requestId: id,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const roomCommands = new Set(['join', 'leave', 'reaction.send', 'typing.set']);
  if (typeof message.type !== 'string' || !roomCommands.has(message.type)) {
    sendError(
      connection,
      'UNSUPPORTED_REALTIME_COMMAND',
      'Supported commands are join, leave, ping, reaction.send and typing.set.',
      id,
    );
    return;
  }

  const roomRequest = parseRealtimeRoom(message.room);
  if (!roomRequest) {
    sendError(
      connection,
      'INVALID_REALTIME_ROOM',
      'Provide a valid user, organisation or broadcast room request.',
      id,
    );
    return;
  }

  const room = await authorizeRealtimeRoom(
    database.db,
    connection.userId,
    roomRequest,
  );
  if (!room) {
    sendError(
      connection,
      'REALTIME_ROOM_NOT_AVAILABLE',
      'The requested room is unavailable.',
      id,
    );
    return;
  }

  if (message.type === 'join') {
    const wasPresent =
      room.kind === 'broadcast' && hub.countUserInRoom(room.key, connection.userId) > 0;
    hub.join(connection, room.key);
    connection.send({
      type: 'room.joined',
      requestId: id,
      room,
    });
    if (room.kind === 'broadcast') {
      connection.send({
        type: 'presence.snapshot',
        room,
        users: hub.userIdsInRoom(room.key).map((userId) => ({ id: userId })),
        scope: 'socket',
        timestamp: new Date().toISOString(),
      });
      if (!wasPresent) {
        publishPresence(hub, room.key, connection.userId, 'online', 'joined');
      }
    }
    return;
  }

  if (message.type === 'leave') {
    if (room.kind === 'user') {
      sendError(
        connection,
        'USER_ROOM_REQUIRED',
        'The authenticated user room cannot be left.',
        id,
      );
      return;
    }
    hub.leave(connection, room.key);
    if (
      room.kind === 'broadcast' &&
      hub.countUserInRoom(room.key, connection.userId) === 0
    ) {
      publishPresence(hub, room.key, connection.userId, 'offline', 'left');
    }
    const key = typingKey(connection.id, room.key);
    const timer = runtime.typingTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      runtime.typingTimers.delete(key);
      hub.publish(room.key, {
        type: 'typing.changed',
        room,
        user: { id: connection.userId },
        active: false,
        reason: 'room-left',
        timestamp: new Date().toISOString(),
      });
    }
    connection.send({
      type: 'room.left',
      requestId: id,
      room,
    });
    return;
  }

  if (room.kind !== 'broadcast' || !connection.rooms.has(room.key)) {
    sendError(
      connection,
      'REALTIME_INTERACTION_ROOM_REQUIRED',
      'Join an authorized broadcast room before sending live interactions.',
      id,
    );
    return;
  }

  if (message.type === 'reaction.send') {
    if (typeof message.reaction !== 'string' || !ALLOWED_REACTIONS.has(message.reaction)) {
      sendError(
        connection,
        'INVALID_REALTIME_REACTION',
        'Use a supported reaction.',
        id,
      );
      return;
    }

    const currentWindow = runtime.reactionWindows.get(connection.id);
    const window = !currentWindow || now - currentWindow.startedAt >= options.reactionWindowMs
      ? { startedAt: now, count: 0 }
      : currentWindow;
    window.count += 1;
    runtime.reactionWindows.set(connection.id, window);
    if (window.count > options.maxReactionsPerWindow) {
      const retryAfterMs = Math.max(1, options.reactionWindowMs - (now - window.startedAt));
      sendError(
        connection,
        'REALTIME_REACTION_RATE_LIMITED',
        'Too many reactions were sent.',
        id,
        { retryAfterMs },
      );
      return;
    }

    hub.publish(room.key, {
      type: 'reaction.sent',
      requestId: id,
      room,
      user: { id: connection.userId },
      reaction: message.reaction,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (typeof message.active !== 'boolean') {
    sendError(
      connection,
      'INVALID_TYPING_STATE',
      'Typing state must be a boolean.',
      id,
    );
    return;
  }

  const key = typingKey(connection.id, room.key);
  const existing = runtime.typingTimers.get(key);
  if (existing) {
    clearTimeout(existing);
    runtime.typingTimers.delete(key);
  }

  const expiresAt = new Date(Date.now() + options.typingTtlMs).toISOString();
  hub.publish(room.key, {
    type: 'typing.changed',
    requestId: id,
    room,
    user: { id: connection.userId },
    active: message.active,
    expiresAt: message.active ? expiresAt : undefined,
    timestamp: new Date().toISOString(),
  });

  if (message.active) {
    const timer = setTimeout(() => {
      runtime.typingTimers.delete(key);
      hub.publish(room.key, {
        type: 'typing.changed',
        room,
        user: { id: connection.userId },
        active: false,
        reason: 'expired',
        timestamp: new Date().toISOString(),
      });
    }, options.typingTtlMs);
    timer.unref();
    runtime.typingTimers.set(key, timer);
  }
}

export function registerRealtimeServer(
  app: FastifyInstance,
  database: DatabaseContext | null,
  options: RealtimeServerOptions = {},
): RealtimeHub {
  const resolved = resolveOptions(options);
  const hub = new RealtimeHub();
  const runtime: InteractionRuntime = {
    reactionWindows: new Map(),
    typingTimers: new Map(),
  };
  let heartbeatRunning = false;

  app.get(REALTIME_PATH, async (_request, reply) =>
    reply
      .code(426)
      .header('upgrade', 'websocket')
      .send({
        error: {
          code: 'WEBSOCKET_UPGRADE_REQUIRED',
          message: 'Connect using the DigiStream real-time WebSocket protocol.',
        },
        protocol: REALTIME_PROTOCOL,
      }),
  );

  app.get('/api/v1/realtime/status', async () => ({
    transport: 'websocket',
    path: REALTIME_PATH,
    protocol: REALTIME_PROTOCOL,
    authenticated: true,
  }));

  const handleUpgrade = async (
    request: IncomingMessage,
    socket: Socket,
    head: Buffer,
  ): Promise<void> => {
    socket.pause();

    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    if (pathname !== REALTIME_PATH) {
      rejectUpgrade(socket, 404, 'REALTIME_ROUTE_NOT_FOUND', 'Not found.');
      return;
    }
    if (!database) {
      rejectUpgrade(
        socket,
        503,
        'DATABASE_UNAVAILABLE',
        'Real-time connections are temporarily unavailable.',
      );
      return;
    }
    if (
      request.method !== 'GET' ||
      request.headers.upgrade?.toLowerCase() !== 'websocket' ||
      !String(request.headers.connection ?? '')
        .toLowerCase()
        .split(',')
        .map((value) => value.trim())
        .includes('upgrade') ||
      request.headers['sec-websocket-version'] !== '13'
    ) {
      rejectUpgrade(
        socket,
        400,
        'INVALID_WEBSOCKET_UPGRADE',
        'The WebSocket upgrade request was invalid.',
      );
      return;
    }

    const keyHeader = request.headers['sec-websocket-key'];
    const key = Array.isArray(keyHeader) ? keyHeader[0] : keyHeader;
    if (!validWebSocketKey(key)) {
      rejectUpgrade(
        socket,
        400,
        'INVALID_WEBSOCKET_KEY',
        'The WebSocket key was invalid.',
      );
      return;
    }

    const offeredProtocols = String(
      request.headers['sec-websocket-protocol'] ?? '',
    )
      .split(',')
      .map((value) => value.trim());
    if (!offeredProtocols.includes(REALTIME_PROTOCOL)) {
      rejectUpgrade(
        socket,
        426,
        'REALTIME_PROTOCOL_REQUIRED',
        'Use the DigiStream real-time protocol.',
        { 'Sec-WebSocket-Protocol': REALTIME_PROTOCOL },
      );
      return;
    }
    if (!originAllowed(request, resolved.allowedOrigins)) {
      rejectUpgrade(
        socket,
        403,
        'REALTIME_ORIGIN_REJECTED',
        'The real-time request origin was rejected.',
      );
      return;
    }

    const session = await authenticateSessionCookie(
      database.db,
      request.headers.cookie,
    );
    if (!session) {
      rejectUpgrade(
        socket,
        401,
        'AUTHENTICATION_REQUIRED',
        'Sign in with an active DigiStream session.',
      );
      return;
    }
    if (hub.countForUser(session.userId) >= resolved.maxConnectionsPerUser) {
      rejectUpgrade(
        socket,
        429,
        'REALTIME_CONNECTION_LIMIT',
        'Too many real-time connections are active for this account.',
      );
      return;
    }

    const accept = createHash('sha1')
      .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
      .digest('base64');
    socket.write(
      'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n` +
        `Sec-WebSocket-Protocol: ${REALTIME_PROTOCOL}\r\n` +
        '\r\n',
    );
    socket.setNoDelay(true);
    socket.setKeepAlive(true, resolved.heartbeatIntervalMs);

    const parser = new WebSocketFrameParser({
      maxMessageBytes: resolved.maxMessageBytes,
      expectMasked: true,
    });
    let closing = false;
    const connection: RealtimeConnection = {
      id: randomUUID(),
      userId: session.userId,
      sessionId: session.sessionId,
      socket,
      rooms: new Set<string>(),
      awaitingPong: false,
      lastSessionCheckAt: Date.now(),
      messageWindowStartedAt: Date.now(),
      messageCount: 0,
      operationQueue: Promise.resolve(),
      send(event): boolean {
        if (closing || socket.destroyed || !socket.writable) return false;
        if (socket.writableLength > resolved.maxBufferedBytes) {
          connection.close(1013, 'Connection backpressure limit exceeded');
          return false;
        }
        socket.write(encodeJsonFrame(event));
        return true;
      },
      close(code, reason): void {
        if (closing || socket.destroyed) return;
        closing = true;
        socket.write(encodeCloseFrame(code, reason));
        socket.end();
        setTimeout(() => socket.destroy(), 1_000).unref();
      },
    };

    hub.add(connection);
    const personalRoom = userRoom(session.userId);
    hub.join(connection, personalRoom.key);

    socket.on('data', (chunk: Buffer) => {
      try {
        const frames = parser.push(chunk);
        for (const frame of frames) {
          if (frame.type === 'ping') {
            socket.write(encodeWebSocketFrame(0xa, frame.payload));
          } else if (frame.type === 'pong') {
            connection.awaitingPong = false;
          } else if (frame.type === 'close') {
            if (!closing) socket.write(encodeWebSocketFrame(0x8, frame.payload));
            closing = true;
            socket.end();
          } else {
            connection.operationQueue = connection.operationQueue
              .then(() =>
                handleClientMessage(
                  database,
                  hub,
                  connection,
                  frame.text,
                  resolved,
                  runtime,
                ),
              )
              .catch((error: unknown) => {
                app.log.error(
                  { error, connectionId: connection.id },
                  'Realtime command failed',
                );
                connection.close(1011, 'Real-time command failed');
              });
          }
        }
      } catch (error) {
        if (error instanceof WebSocketProtocolError) {
          connection.close(error.closeCode, error.message);
          return;
        }
        app.log.error(
          { error, connectionId: connection.id },
          'Realtime frame processing failed',
        );
        connection.close(1011, 'Real-time processing failed');
      }
    });
    socket.on('error', (error) => {
      app.log.debug(
        { error, connectionId: connection.id },
        'Realtime socket error',
      );
    });
    socket.on('close', () => {
      const presenceRooms = [...connection.rooms].filter((roomKey) =>
        roomKey.startsWith('broadcast:'),
      );
      clearTypingForConnection(runtime, hub, connection);
      hub.remove(connection);
      for (const roomKey of presenceRooms) {
        if (hub.countUserInRoom(roomKey, connection.userId) === 0) {
          publishPresence(
            hub,
            roomKey,
            connection.userId,
            'offline',
            'connection-ended',
          );
        }
      }
    });

    connection.send({
      type: 'realtime.connected',
      connectionId: connection.id,
      user: {
        id: session.userId,
        displayName: session.displayName,
      },
      rooms: [personalRoom],
      protocol: REALTIME_PROTOCOL,
      heartbeatIntervalMs: resolved.heartbeatIntervalMs,
    });

    if (head.length > 0) socket.emit('data', head);
    socket.resume();
  };

  const upgradeListener = (
    request: IncomingMessage,
    socket: Socket,
    head: Buffer,
  ) => {
    void handleUpgrade(request, socket, head).catch((error: unknown) => {
      app.log.error({ error }, 'Realtime upgrade failed');
      if (!socket.destroyed) {
        rejectUpgrade(
          socket,
          503,
          'REALTIME_UPGRADE_FAILED',
          'The real-time connection could not be established.',
        );
      }
    });
  };

  app.server.on('upgrade', upgradeListener);

  const heartbeat = setInterval(() => {
    if (heartbeatRunning || !database) return;
    heartbeatRunning = true;
    void Promise.all(
      hub.allConnections().map(async (connection) => {
        if (connection.socket.destroyed) return;
        if (connection.awaitingPong) {
          connection.socket.destroy();
          return;
        }

        const now = Date.now();
        if (now - connection.lastSessionCheckAt >= resolved.sessionCheckIntervalMs) {
          connection.lastSessionCheckAt = now;
          const active = await sessionRemainsActive(
            database.db,
            connection.sessionId,
            connection.userId,
          );
          if (!active) {
            connection.send({
              type: 'realtime.session-ended',
              error: {
                code: 'AUTHENTICATION_REQUIRED',
                message: 'The DigiStream session is no longer active.',
              },
            });
            connection.close(4401, 'Session ended');
            return;
          }
        }

        connection.awaitingPong = true;
        connection.socket.write(encodeWebSocketFrame(0x9));
      }),
    )
      .catch((error: unknown) => {
        app.log.error({ error }, 'Realtime heartbeat failed');
      })
      .finally(() => {
        heartbeatRunning = false;
      });
  }, resolved.heartbeatIntervalMs);

  app.addHook('onClose', async () => {
    clearInterval(heartbeat);
    for (const timer of runtime.typingTimers.values()) clearTimeout(timer);
    runtime.typingTimers.clear();
    runtime.reactionWindows.clear();
    app.server.off('upgrade', upgradeListener);
    hub.closeAll();
  });

  return hub;
}
