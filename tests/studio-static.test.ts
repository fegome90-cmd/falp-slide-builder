import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

describe('Fastify serves the compiled HTML studio, not a Vite-only preview', () => {
  it('serves fresh Spanish HTML and hashed JS/CSS assets on loopback without a CDN', async () => {
    const app = buildApp();
    try {
      const response = await app.inject({ method: 'GET', url: '/studio/' });
      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toContain('text/html');
      expect(response.body).toContain('<html lang="es">');

      const sourceHtml = await readFile(new URL('../studio/index.html', import.meta.url), 'utf8');
      const sourceTitle = sourceHtml.match(/<title>([^<]+)<\/title>/)?.[1];
      const servedTitle = response.body.match(/<title>([^<]+)<\/title>/)?.[1];
      expect(sourceTitle).toBeTruthy();
      expect(servedTitle).toBe(sourceTitle);

      const stylesheetMatch = response.body.match(/href="\.\/(assets\/[^"]+\.css)"/);
      expect(stylesheetMatch).not.toBeNull();
      const css = await app.inject({ method: 'GET', url: '/studio/' + stylesheetMatch?.[1] });
      expect(css.statusCode).toBe(200);
      expect(css.headers['content-type']).toMatch(/^text\/css(?:;|$)/);

      const scriptMatch = response.body.match(/src="\.\/(assets\/[^"]+\.js)"/);
      expect(scriptMatch).not.toBeNull();
      const script = await app.inject({ method: 'GET', url: '/studio/' + scriptMatch?.[1] });
      expect(script.statusCode).toBe(200);
      expect(script.headers['content-type']).toContain('javascript');

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
