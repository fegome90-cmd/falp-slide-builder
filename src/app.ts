import { STATUS_CODES } from 'node:http';
import Fastify, { LogController, type FastifyInstance } from 'fastify';
import { healthPlugin } from './plugins/health.js';

export interface AppComposition {
  /** Register cross-cutting plugins (for example Swagger) before any routes. */
  beforeRoutes?: (app: FastifyInstance) => void;
  /** Register UI/endpoints that depend on already-declared routes. */
  afterRoutes?: (app: FastifyInstance) => void;
}

/** Pure app factory: no ports, storage services or external connections. */
export function buildApp(composition: AppComposition = {}): FastifyInstance {
  const app = Fastify({
    logger: {
      level: 'info',
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'res.headers["set-cookie"]',
        ],
        censor: '[REDACTED]',
      },
    },
    bodyLimit: 1024 * 1024,
    // Avoid automatic request URL logging (which could contain query secrets).
    // Use Fastify's supported controller API, not deprecated top-level options.
    logController: new LogController({ disableRequestLogging: true }),
    trustProxy: false,
  });

  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });
  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('x-content-type-options', 'nosniff');
    reply.header('referrer-policy', 'no-referrer');
    return payload;
  });

  app.setErrorHandler((error, request, reply) => {
    // Match Fastify's statusCode || status precedence for thrown errors.
    const candidate = typeof error === 'object' && error !== null
      ? (('statusCode' in error ? error.statusCode : undefined) ||
          ('status' in error ? error.status : undefined))
      : undefined;
    const status = typeof candidate === 'number' && candidate >= 400 && candidate < 600
      ? candidate
      : 500;
    // RFC 9457 'about:blank' titles should match the HTTP status's
    // standard reason phrase, not "Internal Server Error" for every 5xx.
    const title = STATUS_CODES[status] ?? 'HTTP Error';
    if (status >= 500) {
      // Do not log raw errors or untrusted message bodies in the public starter.
      request.log.error({ statusCode: status, requestId: request.id }, 'Request failed');
    }
    reply.code(status).type('application/problem+json').send({
      type: 'about:blank', title, status, requestId: request.id,
    });
  });
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).type('application/problem+json').send({
      type: 'about:blank', title: 'Not Found', status: 404, requestId: request.id,
    });
  });

  composition.beforeRoutes?.(app);
  app.register(healthPlugin);
  composition.afterRoutes?.(app);
  return app;
}
