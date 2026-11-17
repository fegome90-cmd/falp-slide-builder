# falp-slide-builder

A **personal project by Felipe González**, starting with a minimal Fastify backend for future presentation-building work. It is **not an institutional FALP product** and does not claim FALP sponsorship, endorsement, approval, or affiliation. Institutional approval is not a prerequisite for developing this personal project.

## Current scope

This bootstrap provides an HTTP server, `/health`, configuration validation, error handling, lifecycle management, DeckSpec v1 validation, a read-only HTML slide showcase and automated tests. It does **not** yet provide a slide editor, AI generation, HTML export, Figma integration, authentication, or persistence. A **read-only local HTML design preview** with six synthetic slide types is available at `/studio/` after running `pnpm build` or `pnpm test`. There are no internal assets, clinical records, or patient data in this starter.

The foundation is [Kit Fundador Fastify Core at `c212571d500d737ed4d7527e41f1ae9287a3e777`](https://github.com/fegome90-cmd/kit_fundador/tree/c212571d500d737ed4d7527e41f1ae9287a3e777/templates/fastify-core). See [provenance and licensing limits](UPSTREAM.md).

## Run locally

Requirements: **Node.js 24** (`>=24 <25`) and **pnpm 11.25.0**, pinned in `package.json`. When using Corepack, enable its shims so nested `pnpm` commands also use the pinned version. A preinstalled pnpm 11.25.0 may instead be used directly, without the `corepack enable` step. If Corepack is unavailable, install the pinned package manager using its official documentation; do not change the project's version pin.

```sh
corepack enable
pnpm install --frozen-lockfile --ignore-scripts
pnpm check
pnpm typecheck
pnpm test
pnpm start
```

`corepack enable` installs shims alongside Corepack. To avoid changing an existing installation, use `corepack enable --install-directory <writable-directory>` and prepend that directory to `PATH`. Verify `pnpm --version` reports `11.25.0` from the project directory.

`pnpm check` runs Biome (formatting, lint and architecture rules) without writing files. `pnpm lint` runs only the linter, and `pnpm format` rewrites files with the formatter. `pnpm test` runs the Vitest suite. Its asynchronous global setup compiles both `dist/server.js` (TypeScript) and `dist/studio/` (Vite) before the tests start, including from a clean checkout. `pnpm test:coverage` performs the same preparation independently. In Vitest watch mode, both artifacts rebuild on rerun. To start the server without tests, run `pnpm build` first. Development mode is `pnpm dev`.

The default address is `http://127.0.0.1:3000`. Check it with `curl http://127.0.0.1:3000/health`. Optional environment variables are `PORT` (an integer from 0 to 65535) and `HOST` (`127.0.0.1`, `localhost`, `0.0.0.0`, `::1`, or `::`). Use a fixed nonzero port for the example URL; port `0` requests an automatically allocated port.

`/health` only reports that the HTTP process responds. It does not check databases, external services, or production readiness. `buildApp()` creates the app without opening a port. Register future plugins through the existing `beforeRoutes → routes → afterRoutes` composition boundary; keep resource cleanup in the existing lifecycle helpers.

## Working with coding agents

Coding agents should read [AGENTS.md](AGENTS.md) first, then [ARCHITECTURE.md](ARCHITECTURE.md) before creating files, adding modules or adding dependencies.

## Safety and optional design references

- Keep the loopback default. Binding to `0.0.0.0` or `::` exposes the process beyond loopback; it is not deployment hardening.
- The template limits request bodies, sanitizes error responses, disables proxy trust, avoids automatic request-URL logs, and redacts sensitive headers. Schema-validation 400 responses list the failing fields (`in`, `path`, `message`). Request IDs are random UUIDs. These defaults are not a security certification.
- Before Internet deployment, independently configure access controls, TLS, proxy trust, traffic limits, and operational monitoring. Nothing in this repository deploys anything.
- Existing design tokens may be an **optional reference only when their license permits the intended reuse**. Preserve required notices and check code, fonts, imagery, trademarks, and other assets separately. No institutional logo, restricted image or font is included. The personal HTML study uses publicly documented reference colour values; distribution of protected assets still requires separate permission. Design reuse does not imply institutional endorsement and is not an approval gate for developing the application.

## Verification

The blocking `verify` job runs on pushes to `main` and PRs on Node 24. After frozen installation, Biome and typecheck, it checks that `dist/` is absent and runs `pnpm test` before any explicit production build. The job then checks coverage, builds production assets, and runs Chromium Playwright and axe. The `audit` job checks production dependencies on PRs, pushes and weekly, and is blocking. The static HTTP test compares the served page title against the Studio source and fetches real JS/CSS. HTML/CSS freshness in watch is an operational smoke test, not a continuous CI gate. No end-to-end editable authoring, presentation export, external-provider integration, clinical validation or public deployment is established.

The npm package is deliberately `private: true`; the GitHub repository can still be public. The project is licensed under the [MIT License](LICENSE); the exact import boundary is recorded in [UPSTREAM.md](UPSTREAM.md).

## Local HTML visual test slice

Run `corepack pnpm build` to produce both `dist/server.js` and `dist/studio/`. Start with `corepack pnpm start`, then visit `http://127.0.0.1:3000/studio/`. The six compositions show **synthetic content**, not patient records or verified clinical findings. Brand assets are intentionally absent.

- `corepack pnpm check`: Biome format/lint/architecture.
- `corepack pnpm typecheck`: TypeScript for backend, test interfaces and visual components.
- `corepack pnpm test`: desde un checkout sin `dist/`, construye TypeScript y Vite antes de ejecutar DeckSpec, layouts, navegación y rutas reales HTML/JS/CSS.
- `corepack pnpm test:coverage`: genera sus propios artefactos también desde un checkout frío y mide cobertura con umbrales (80/70).
- `corepack pnpm test:e2e`: Chromium Playwright tests against the **compiled Fastify production server**. Install its matching browser once with `corepack pnpm exec playwright install chromium`. For an existing compatible Chromium executable, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.
- `corepack pnpm studio:dev`: optional Vite development server; passing Vite alone does **not** establish production readiness.

HTML-only: no PPTX export. The current preview cannot save user content, import prior decks or synchronize data. Those are explicitly separate implementation gates. See `docs/QA-MATRIX.md`.
