import type { FastifyInstance } from 'fastify';
import type { DatabaseContext } from '../../db/client.js';
import type { AccountTokenDelivery } from '../../auth/account-token-delivery.js';
import {
  confirmEmailVerificationToken,
  confirmPasswordResetToken,
  requestEmailVerification,
  requestPasswordReset,
} from './account-recovery.service.js';

type PasswordResetRequestBody = { email?: unknown };
type PasswordResetConfirmBody = { token?: unknown; password?: unknown };
type VerifyConfirmBody = { token?: unknown };

function databaseUnavailable(message: string) {
  return { error: { code: 'DATABASE_UNAVAILABLE', message } };
}

export function registerAccountRecoveryRoutes(
  app: FastifyInstance,
  database: DatabaseContext | null,
  delivery: AccountTokenDelivery | null,
): void {
  app.post('/api/v1/auth/email-verification/request', async (request, reply) => {
    if (!database) {
      return reply
        .code(503)
        .send(databaseUnavailable('Account verification is temporarily unavailable.'));
    }

    const result = await requestEmailVerification(
      database,
      request.headers.cookie,
      delivery,
    );
    if (!result.ok) {
      if (result.failure.code === 'AUTHENTICATION_REQUIRED') {
        return reply.code(401).send({
          error: {
            code: result.failure.code,
            message: 'Sign in to continue.',
          },
        });
      }
      if (result.failure.cause) {
        request.log.error(
          { error: result.failure.cause },
          'Failed to deliver email verification',
        );
      }
      return reply.code(503).send({
        error: {
          code: result.failure.code,
          message: 'Verification email is temporarily unavailable.',
        },
      });
    }

    if (result.status === 'already_verified') return reply.code(204).send();
    return reply.code(202).send({ status: 'verification_sent' });
  });

  app.post<{ Body: VerifyConfirmBody }>(
    '/api/v1/auth/email-verification/confirm',
    async (request, reply) => {
      if (!database) {
        return reply
          .code(503)
          .send(databaseUnavailable('Account verification is temporarily unavailable.'));
      }

      const result = await confirmEmailVerificationToken(
        database,
        request.body?.token,
      );
      if (!result.ok) {
        return reply.code(400).send({
          error: {
            code: result.failure.code,
            message: 'This verification link is invalid or expired.',
          },
        });
      }
      return reply.code(204).send();
    },
  );

  app.post<{ Body: PasswordResetRequestBody }>(
    '/api/v1/auth/password-reset/request',
    async (request, reply) => {
      if (!database) {
        return reply
          .code(503)
          .send(databaseUnavailable('Password recovery is temporarily unavailable.'));
      }

      const result = await requestPasswordReset(
        database,
        request.body?.email,
        delivery,
      );
      if (result.deliveryError) {
        request.log.error(
          { error: result.deliveryError },
          'Failed to deliver password reset',
        );
      }
      return reply.code(202).send({ status: result.status });
    },
  );

  app.post<{ Body: PasswordResetConfirmBody }>(
    '/api/v1/auth/password-reset/confirm',
    async (request, reply) => {
      if (!database) {
        return reply
          .code(503)
          .send(databaseUnavailable('Password recovery is temporarily unavailable.'));
      }

      const result = await confirmPasswordResetToken(
        database,
        request.body?.token,
        request.body?.password,
      );
      if (!result.ok) {
        return reply.code(400).send({
          error: {
            code: result.failure.code,
            message: 'This password reset link is invalid or expired.',
          },
        });
      }
      return reply.code(204).send();
    },
  );
}
