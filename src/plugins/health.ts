import type { FastifyPluginAsync } from 'fastify';

export const healthPlugin: FastifyPluginAsync = async (app) => {
  app.get('/health', {
    schema: {
      response: {
        200: {
          type: 'object',
          required: ['ok'],
          properties: { ok: { type: 'boolean' } },
          additionalProperties: false,
        },
      },
    },
  }, async () => ({ ok: true }));
};
