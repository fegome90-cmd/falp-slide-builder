import { fileURLToPath } from 'node:url';
import fastifyStatic from '@fastify/static';
import type { FastifyPluginAsync } from 'fastify';

/** Build output is adjacent to the compiled server, not in a user's working directory. */
const studioRoot = fileURLToPath(new URL('../../../dist/studio/', import.meta.url));

/** Read-only preview surface; never serves repository source or local deck data. */
export const studioPlugin: FastifyPluginAsync = async (app) => {
  await app.register(fastifyStatic, {
    root: studioRoot,
    prefix: '/studio/',
    decorateReply: false,
    index: ['index.html'],
    wildcard: true,
    setHeaders: (response, file) => {
      if (file.endsWith('index.html')) response.setHeader('Cache-Control', 'no-store');
    },
  });
};
