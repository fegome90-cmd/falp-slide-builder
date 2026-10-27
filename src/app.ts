import { randomUUID } from 'node:crypto';
import { STATUS_CODES } from 'node:http';
import Fastify, { LogController, type FastifyInstance } from 'fastify';
import { healthPlugin } from './plugins/health.js';

export interface AppComposition {
  /** Register cross-cutting plugins (for example Swagger) before any routes. */
  beforeRoutes?: (app: FastifyInstance) => void;
  /** Register UI/endpoints that depend on already-declared routes. */
  afterRoutes?: (app: FastifyInstance) => void;
}

/** Fastify schema-validation failures carry Ajv errors and the failing part name. */
interface ValidationFailure {
  validation: { instancePath: string; message?: string }[];
  validationContext?: string;
}

function isValidationFailure(error: unknown): error is ValidationFailure {
  return typeof error === 'object' && error !== null &&
    'validation' in error && Array.isArray(error.validation);
}

/** Stack frames without the leading "Name: message" line, which may carry untrusted text. */
function stackFrames(error: unknown): string | undefined {
  if (!(error instanceof Error) || typeof error.stack !== 'string') return undefined;
  const header = error.message ? `${error.name}: ${error.message}` : error.name;
  // Fail closed: if the header cannot be stripped reliably, log no stack at all.
  if (!error.stack.startsWith(header)) return undefined;
  return error.stack.slice(header.length).replace(/^\n/, '');
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
    // Unique across restarts and instances; client-supplied IDs stay ignored.
    genReqId: () => randomUUID(),
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
      // The error message is never logged (it may carry untrusted input or secrets);
      // the error name, code and stack frames are logged to make 5xx failures debuggable.
      request.log.error({
        statusCode: status, requestId: request.id,
        errorName: error instanceof Error ? error.name : typeof error,
        errorCode: error instanceof Error && 'code' in error && typeof error.code === 'string'
          ? error.code
          : undefined,
        stack: stackFrames(error),
      }, 'Request failed');
    }
    const problem: Record<string, unknown> = {
      type: 'about:blank', title, status, requestId: request.id,
    };
    // Ajv messages are generated from the schema, not from input, so they are safe to return.
    if (status === 400 && isValidationFailure(error)) {
      const context = error.validationContext;
      problem.errors = error.validation.map(item => ({
        in: context, path: item.instancePath, message: item.message,
      }));
    }
    reply.code(status).type('application/problem+json').send(problem);
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
