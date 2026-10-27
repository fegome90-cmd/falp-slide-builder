# Architecture

This file records the structure, request flows and library decisions. Rules are enforced by `biome.json`, `tests/architecture.test.ts` and `tests/dependency-allowlist.test.ts`; the [enforcement table](#enforcement) shows where each one lives.

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
| Prohibited imports (HTTP clients, test runners, HTTP servers) | `biome.json` `style/noRestrictedImports` paths, checked per zone by `tests/architecture.test.ts` |
| Every direct dependency is registered with an allowed status; prohibited, removed or undecided packages are not installed | `tests/dependency-allowlist.test.ts` |

## Quality gates

- **Gate 1, automated, blocking in CI:** Biome (`biome ci`), type checking, build and Vitest, including the architecture canary (`tests/architecture.test.ts`) and the dependency allowlist (`tests/dependency-allowlist.test.ts`).
- **Gate 2, semantic architecture review:** checks a change against this file. Not automated yet; tracked in [BACKLOG.md](BACKLOG.md).
- **Gate 3, human review by the project owner:** required for new dependencies and for changes to prohibitions.

Downward shift: when Gate 3 finds a problem, first try to encode it in Gate 1, as a Biome rule or a test. If it needs judgment, record it in this file for Gate 2 to check.

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

The table below is the single source of truth for dependencies. `tests/dependency-allowlist.test.ts` parses it and checks it against `package.json`. The Package column lists exact npm names in backticks; `—` means the row is not an npm package. Versions are not recorded here; `package.json` and the lockfile hold them.

### Statuses

- **Actively used**: installed and used by the code.
- **Used but not everywhere**: installed and used, but not yet in every place the role applies; the note says what is left.
- **Newly added**: installed recently; the note says what it replaces.
- **Migrating from**: still installed while the code moves to the replacement named in the note.
- **Deprecated**: still installed while it is being removed; it may already be absent from `package.json`.
- **To be decided**: no choice has been made for this role. The package is not prohibited, but it must not be installed until a decision is recorded.
- **Prohibited**: an adopted replacement already covers the same role, so the package must not be installed or imported. A prohibition needs a verifiable reason.
- **Removed**: used before and then discarded; the row stays as history, and the package must not be installed.

A package is prohibited only when an adopted replacement already covers the same role and there is a verifiable reason. A new need can reopen the decision, with evidence.

### Packages

| Package | Role | Status | Replacement / note |
| --- | --- | --- | --- |
| `fastify` | HTTP server | Actively used | The only HTTP server; see Decisions. |
| `typescript` | Type checking and build | Actively used | `pnpm typecheck`; `pnpm build` compiles to `dist/`. |
| `@types/node` | Node.js type definitions | Actively used | Types for the Node 24 APIs in use. |
| `@biomejs/biome` | Formatter, linter and architecture rules | Newly added | Replaces ESLint and Prettier. |
| `vitest` | Test runner | Newly added | Replaces the built-in `node:test`. |
| — | HTTP calls | Actively used | Native `fetch` for outbound HTTP. |
| `axios`, `node-fetch`, `got`, `superagent` | HTTP client | Prohibited | Native `fetch`. |
| `jest`, `mocha` | Test runner | Prohibited | Vitest. The built-in `node:test` is also prohibited; see the Removed row. |
| `express`, `koa`, `hapi`, `@hapi/hapi` | HTTP server | Prohibited | Fastify. |
| `eslint`, `prettier` | Lint and format | Prohibited | Biome. |
| — | Test runner, built-in `node:test` | Removed | Replaced by Vitest; reasons under Removed or replaced. |
| `lodash` | Utility functions | To be decided | Prefer native JavaScript. Add it only for a real need that native code does not meet cleanly, with the justification recorded in Decisions. |
| `moment` | Dates and times | To be decided | Use `Date` and `Intl` when they are sufficient. Do not assume equivalence for complex temporal operations. `Temporal` is not an unconditional native replacement on Node 24 because it needs explicit enabling. |
| `dotenv` | Environment files | To be decided | Do not add it now. If env files are needed, prefer `node --env-file`, stable in Node 24. |
| — | Frontend framework | To be decided | Not chosen; no code depends on it. Decided with the UI library and Playwright when the frontend item starts. |
| — | UI component library | To be decided | Not chosen. `fegome90-cmd/ui-kit` is a candidate, subject to license review. |
| — | AI provider SDK | To be decided | Not chosen; needed by the AI generation module. |
| — | PPTX library | To be decided | Not chosen; needed by the PPTX export module. |
| — | Persistence | To be decided | Not chosen; the decks slice starts in memory. |
| `@playwright/test` | End-to-end tests for the frontend | To be decided | Adopted together with the frontend framework. |

### Removed or replaced

- `node:test` → Vitest. Reasons: TypeScript tests that import `src/`, watch mode (`pnpm test:watch`), and a toolchain consistent with Biome.

## Decisions

This section is append-only: each decision adds one dated line. Changing a prohibition updates the table, `biome.json` and the architecture canary (`tests/architecture.test.ts`) in the same PR.

- 2026-10-27: Biome replaces ESLint and Prettier; `eslint` and `prettier` are prohibited.
- 2026-10-27: Vitest replaces the built-in `node:test`, which is removed; `jest` and `mocha` are prohibited.
- 2026-10-27: Native `fetch` is the HTTP client; `axios`, `node-fetch`, `got` and `superagent` are prohibited.
- 2026-10-27: Fastify is the only HTTP server; `express`, `koa`, `hapi` and `@hapi/hapi` are prohibited.
- 2026-10-27: `lodash`, `moment` and `dotenv` stay To be decided, with their criteria in the table. They are not added until a concrete need and a dated decision line exist.
- 2026-10-27: The dependency allowlist is enforced by `tests/dependency-allowlist.test.ts`: every declared package must be registered with an installable status, and no prohibited, removed or undecided package is installed.
- 2026-10-27: dependency-cruiser and eslint-plugin-boundaries are not used. Biome rules and the architecture canary already cover import cycles, public entries and layer direction, so these tools would duplicate that role. A need outside that role can reopen this.
