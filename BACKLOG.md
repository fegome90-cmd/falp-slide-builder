# Backlog

Entries are tasks and decisions only. Session logs do not belong here.

## As-is

- Backend foundation: Fastify server with `GET /health`, configuration checks, Problem Details errors, graceful shutdown and tests.
- Quality gates: Biome (format, lint, architecture rules), TypeScript type checking, Vitest, blocking CI, and a non-blocking dependency audit. The dependency allowlist test checks that `package.json` matches the library table in [ARCHITECTURE.md](ARCHITECTURE.md).
- DeckSpec v1 validates six layout shapes and editorial status. A read-only React/Vite viewer serves at `/studio/` through Fastify. There is still no deck CRUD, editable studio, autosave, export or AI generation.

## To be done, in order

Each "To be decided" item in [ARCHITECTURE.md](ARCHITECTURE.md) is chosen when concrete work needs it, not all together. Record each decision in ARCHITECTURE.md › Decisions and update the library table in the same change.

- [ ] Build the first vertical slice in `src/modules/decks`: deck schema in `domain/`, `POST /decks` and `GET /decks/:id` in `routes/`, an in-memory adapter, and tests. This slice becomes the pattern for later modules. It needs persistence: start in memory, and choose the persistence library before any durable adapter.
- [x] Read-only frontend baseline: React/Vite, six tested layouts and Playwright+axe on the Fastify production output. No UI component library is installed; keep form controls native.
- [ ] Optional AI slide generation module: not a dependency of the HTML MVP; choose provider when needed.
- [ ] Portable HTML-only export: the exact viewer and local assets, no PPTX conversion.
- [ ] Figma integration.
- [ ] Later quality gates, once there is feature code: Gate 2 architecture reviewer skill; `docs/TESTING.md` when the test suite grows; stricter module isolation if needed.
