# Architecture

This file records the structure, request flows and library decisions. Rules are enforced by `biome.json` and `tests/architecture.test.ts`; the [enforcement table](#enforcement) shows where each one lives.

## Layers and modules

```text
src/
  server.ts        entrypoint: listen(buildApp())
  app.ts           buildApp(): Fastify instance, hooks, error handling, module registration
  runtime.ts       listen(): configuration, signal handling, graceful shutdown
  config.ts        HOST and PORT parsing
  modules/
    health/
      index.ts     public entry, imported as #modules/health
      routes/      HTTP handlers
  shared/          cross-module utilities (not created yet)
tests/             Vitest suites
```

A feature is a module in `src/modules/<name>/`. It has a public `index.ts` and only the layers it needs:

| Layer | Holds | May import |
| --- | --- | --- |
| `index.ts` | the module's exports for other code | its own layers, `#shared/*`, other modules via `#modules/<name>` |
| `routes/` | HTTP handlers and request/response schemas (Fastify) | its `domain/` and `adapters/`, `#shared/*`, `fastify` |
| `domain/` | business rules as pure functions and types | its own files, `#shared/*` |
| `adapters/` | external systems: AI provider, PPTX writer, persistence | its own files, `#shared/*`, `domain/` types, external libraries |
| `src/shared/` | utilities used by more than one module; the lowest layer (not created yet) | external libraries only |
| `src/*.ts` | server wiring: configuration, app factory, lifecycle, entrypoint | `#modules/<name>`, `#shared/*`, sibling `src/*.ts` files |

Where new code goes:

- HTTP handlers and route schemas: `routes/`
- Business rules: `domain/`
- External services and storage: `adapters/`
- Utilities shared by several modules: `src/shared/`
- Startup, configuration and server lifecycle: `src/*.ts`

## Aliases

`package.json` `imports` defines two aliases:

| Alias | TypeScript (`types`) and Vitest (`development`) | Runtime (`default`) |
| --- | --- | --- |
| `#modules/<name>` | `src/modules/<name>/index.ts` | `dist/modules/<name>/index.js` |
| `#shared/<file>` | `src/shared/<file>.ts` | `dist/shared/<file>.js` |

TypeScript and Vitest read the source directly, so tests need no prior build. The compiled server runs `dist/` with plain Node. Aliases point only at public entries: deep paths such as `#modules/health/routes/health-route` do not resolve, so other code reaches a module only through its `index.ts`.

## Enforcement

| Rule | Enforced by |
| --- | --- |
| No import cycles | `biome.json` `suspicious/noImportCycles` |
| Modules are imported only via `#modules/<name>` | `biome.json` `style/noRestrictedImports` |
| No relative imports leaving a module | `biome.json` `style/noRestrictedImports` overrides for `src/modules/*/*.ts` and `src/modules/*/*/**` |
| `src/*.ts` use aliases for modules and shared code | `biome.json` `style/noRestrictedImports` override for `src/*.ts` |
| `shared/` does not import modules or app code | `biome.json` `style/noRestrictedImports` override for `src/shared/**` |
| `domain/` does not import Fastify, `node:http(s)`, `routes/` or `adapters/` | `biome.json` `style/noRestrictedImports` override for `src/modules/*/domain/**` |
| Kebab-case file names | `biome.json` `style/useFilenamingConvention` |
| Formatting | `biome.json` formatter settings, checked by `pnpm check` and `biome ci` |
| Each lint rule above still fires on a violating fixture; allowed fixtures stay clean | `tests/architecture.test.ts` (canary) |
| `#modules` alias resolves to `src/` under Vitest | `tests/architecture.test.ts` |

## Flows

### Built: `GET /health`

1. `buildApp()` in `src/app.ts` registers the hooks and error handler, then the health plugin.
2. The `onRequest` hook sets `x-request-id` to a random UUID. The `onSend` hook sets `x-content-type-options` and `referrer-policy`.
3. `src/modules/health/routes/health-route.ts` returns `{ "ok": true }`; the response schema allows only that shape.
4. Errors (404, 400 validation, 413 body limit, other 4xx and 5xx) use `application/problem+json`. 5xx responses and logs omit the error message.

### PLANNED (not built): deck flow

Create deck → edit or generate slides → export to PPTX.

None of these steps exist yet. When a change touches deck structures, run the tests of downstream features (generation, export) once they exist.

## Library lifecycle

Statuses: Actively used, Used but not everywhere, Newly added, Migrating from, Deprecated, To be decided.

| Library | Status | Scope / note |
| --- | --- | --- |
| Fastify 5 | Actively used | HTTP server. |
| TypeScript 5 | Actively used | Strict type checking (`pnpm typecheck`) and compilation to `dist/` (`pnpm build`). |
| Biome 2 | Newly added | Formatter, linter and architecture rules. Replaces nothing. |
| Vitest 5 | Newly added | Test runner. Replaces `node:test`. |
| Node native `fetch` | Actively used | Outbound HTTP when needed; the tests already use it against the local server. Do not add axios or similar. |
| Frontend framework | To be decided | Not chosen; no code depends on it. |
| UI component library | To be decided | Not chosen. `fegome90-cmd/ui-kit` is a candidate, subject to license review. |
| AI provider SDK | To be decided | Not chosen; no code depends on it. |
| PPTX library | To be decided | Not chosen; no code depends on it. |
| Persistence | To be decided | Not chosen; no code depends on it. |

### Removed or replaced

- `node:test` → Vitest. Reasons: TypeScript tests that import `src/`, watch mode (`pnpm test:watch`), and a toolchain consistent with Biome.
