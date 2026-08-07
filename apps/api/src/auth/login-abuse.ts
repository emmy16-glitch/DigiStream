import { createHash } from 'node:crypto';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { DatabaseContext } from '../db/client.js';

const DEFAULT_WINDOW_SECONDS = 15 * 60;
const DEFAULT_EMAIL_FAILURE_LIMIT = 5;
const DEFAULT_IP_FAILURE_LIMIT = 20;

type LoginBody = { email?: unknown };

type LoginContext = {
  emailHash: string;
  ipHash: string;
  blocked: boolean;
};

const contexts = new WeakMap<FastifyRequest, LoginContext>();

function configuredInteger(name: string, fallback: number, min: number, max: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value >= min && value <= max ? value : fallback;
}

function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 3 || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }
  return email;
}

function fingerprint(value: string): string {
  const namespace = process.env.AUTH_AUDIT_HASH_SECRET?.trim() || 'digistream-auth-audit-v1';
  return createHash('sha256').update(namespace).update('\0').update(value).digest('hex');
}

async function recentFailures(
  database: DatabaseContext,
  column: 'email_hash' | 'ip_hash',
  value: string,
  windowSeconds: number,
): Promise<number> {
  const result = await database.pool.query<{ count: string }>(
    `SELECT count(*)::text AS count
       FROM auth_login_attempts
      WHERE ${column} = $1
        AND outcome IN ('invalid_credentials', 'account_unavailable', 'rate_limited')
        AND created_at >= now() - ($2::int * interval '1 second')`,
    [value, windowSeconds],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function recordAttempt(
  database: DatabaseContext,
  request: FastifyRequest,
  context: LoginContext,
  outcome: 'success' | 'invalid_credentials' | 'account_unavailable' | 'rate_limited',
): Promise<void> {
  const email = normaliseEmail((request.body as LoginBody | undefined)?.email);
  const userResult = email
    ? await database.pool.query<{ id: string }>('SELECT id FROM users WHERE email = $1 LIMIT 1', [email])
    : null;
  await database.pool.query(
    `INSERT INTO auth_login_attempts (email_hash, ip_hash, user_id, outcome, request_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [context.emailHash, context.ipHash, userResult?.rows[0]?.id ?? null, outcome, request.id],
  );
}

export function registerLoginAbuseControls(
  app: FastifyInstance,
  database: DatabaseContext | null,
): void {
  if (!database) return;

  app.addHook('preHandler', async (request, reply) => {
    if (request.routeOptions.url !== '/api/v1/auth/login' || request.method !== 'POST') return;

    const email = normaliseEmail((request.body as LoginBody | undefined)?.email);
    if (!email) return;

    const context: LoginContext = {
      emailHash: fingerprint(email),
      ipHash: fingerprint(request.ip || 'unknown'),
      blocked: false,
    };
    contexts.set(request, context);

    const windowSeconds = configuredInteger(
      'AUTH_LOGIN_FAILURE_WINDOW_SECONDS',
      DEFAULT_WINDOW_SECONDS,
      60,
      24 * 60 * 60,
    );
    const emailLimit = configuredInteger('AUTH_LOGIN_EMAIL_FAILURE_LIMIT', DEFAULT_EMAIL_FAILURE_LIMIT, 2, 100);
    const ipLimit = configuredInteger('AUTH_LOGIN_IP_FAILURE_LIMIT', DEFAULT_IP_FAILURE_LIMIT, 5, 1000);

    const [emailFailures, ipFailures] = await Promise.all([
      recentFailures(database, 'email_hash', context.emailHash, windowSeconds),
      recentFailures(database, 'ip_hash', context.ipHash, windowSeconds),
    ]);

    if (emailFailures >= emailLimit || ipFailures >= ipLimit) {
      context.blocked = true;
      await recordAttempt(database, request, context, 'rate_limited');
      reply.header('retry-after', String(Math.min(windowSeconds, 900)));
      return reply.code(429).send({
        error: {
          code: 'LOGIN_RATE_LIMITED',
          message: 'Too many sign-in attempts. Try again later.',
        },
      });
    }
  });

  app.addHook('onResponse', async (request, reply) => {
    if (request.routeOptions.url !== '/api/v1/auth/login' || request.method !== 'POST') return;
    const context = contexts.get(request);
    if (!context || context.blocked) return;

    let outcome: 'success' | 'invalid_credentials' | 'account_unavailable' | null = null;
    if (reply.statusCode >= 200 && reply.statusCode < 300) outcome = 'success';
    else if (reply.statusCode === 401) outcome = 'invalid_credentials';
    else if (reply.statusCode === 403) outcome = 'account_unavailable';
    if (!outcome) return;

    try {
      await recordAttempt(database, request, context, outcome);
    } catch (error) {
      request.log.error({ error }, 'Failed to record authentication audit attempt');
    }
  });
}
