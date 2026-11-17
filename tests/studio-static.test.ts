import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('Fastify serves the compiled HTML studio, not a Vite-only preview', () => {
  it('serves Spanish HTML and hashed JS/CSS assets on loopback without a CDN', async () => {
    const app = buildApp();
    try {
      const response = await app.inject({ method: 'GET', url: '/studio/' });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<html lang="es">');
      const assetMatch = response.body.match(/src="\.\/(assets\/[^"]+\.js)"/);
      expect(assetMatch).not.toBeNull();
      const asset = await app.inject({ method: 'GET', url: `/studio/${assetMatch?.[1]}` });
      expect(asset.statusCode).toBe(200);
      expect(asset.headers['content-type']).toContain('javascript');
      const health = await app.inject({ method: 'GET', url: '/health' });
      expect(health.statusCode).toBe(200);
    } finally {
      await app.close();
    }
  });
  it('does not expose TypeScript source through the static route', async () => {
    const app = buildApp();
    try {
      const response = await app.inject({ method: 'GET', url: '/studio/src/app.ts' });
      expect(response.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });
});
