import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const studio = fileURLToPath(new URL('./', import.meta.url));
const output = fileURLToPath(new URL('../dist/studio/', import.meta.url));
export default defineConfig({
  root: studio,
  base: './',
  build: { outDir: output, emptyOutDir: true },
  server: { host: '127.0.0.1', port: 4178, strictPort: true },
});
