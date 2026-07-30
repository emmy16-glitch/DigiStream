import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from 'fastify';

export type ApiErrorPayload = {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function createApiErrorPayload(
  request: FastifyRequest,
  code: string,
  message: string,
  details?: unknown,
): ApiErrorPayload {
  return {
    error: {
      code,
      message,
      requestId: request.id,
      ...(details === undefined ? {} : { details }),
    },
  };
}

function safeClientStatusCode(error: unknown): number | null {
  if (
    typeof error !== 'object' ||
    error === null ||
    !('statusCode' in error)
  ) {
    return null;
  }

  const statusCode = (error as { statusCode?: unknown }).statusCode;

  if (
    typeof statusCode === 'number' &&
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode < 500
  ) {
    return statusCode;
  }

  return null;
}

function sendApiError(
  request: FastifyRequest,
  reply: FastifyReply,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown,
): FastifyReply {
  return reply
    .code(statusCode)
    .send(createApiErrorPayload(request, code, message, details));
}

export function registerHttpErrorHandling(app: FastifyInstance): void {
  app.addHook('onSend', async (request, reply, payload) => {
    if (!reply.hasHeader('x-request-id')) {
      reply.header('x-request-id', request.id);
    }

    return payload;
  });

  app.setNotFoundHandler((request, reply) =>
    sendApiError(
      request,
      reply,
      404,
      'ROUTE_NOT_FOUND',
      'The requested API route was not found.',
    ),
  );

  app.setErrorHandler((error, request, reply) => {
    if (reply.sent) {
      return;
    }

    if (error instanceof ApiError) {
      return sendApiError(
        request,
        reply,
        error.statusCode,
        error.code,
        error.message,
        error.details,
      );
    }

    const clientStatusCode = safeClientStatusCode(error);

    if (clientStatusCode !== null) {
      return sendApiError(
        request,
        reply,
        clientStatusCode,
        'REQUEST_REJECTED',
        'The request could not be processed.',
      );
    }

    request.log.error(
      {
        err: error,
        requestId: request.id,
      },
      'Unhandled API request error',
    );

    return sendApiError(
      request,
      reply,
      500,
      'INTERNAL_SERVER_ERROR',
      'The server could not complete the request.',
    );
  });
}
