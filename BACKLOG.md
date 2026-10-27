# Backlog

Entries are tasks and decisions only. Session logs do not belong here.

## As-is

- Backend foundation: Fastify server with `GET /health`, configuration checks, Problem Details errors, graceful shutdown and tests.
- Quality gates: Biome (format, lint, architecture rules), TypeScript type checking, Vitest, blocking CI, and a non-blocking dependency audit. The dependency allowlist test checks that `package.json` matches the library table in [ARCHITECTURE.md](ARCHITECTURE.md).
- No deck model yet: no slides, decks, generation, export or persistence.

## To be done, in order

Each "To be decided" item in [ARCHITECTURE.md](ARCHITECTURE.md) is chosen when concrete work needs it, not all together. Record each decision in ARCHITECTURE.md › Decisions and update the library table in the same change.

- [ ] Build the first vertical slice in `src/modules/decks`: deck schema in `domain/`, `POST /decks` and `GET /decks/:id` in `routes/`, an in-memory adapter, and tests. This slice becomes the pattern for later modules. It needs persistence: start in memory, and choose the persistence library before any durable adapter.
- [ ] Frontend: needs the frontend framework, the UI component library and Playwright. Decide them together when this item starts, then add a Playwright smoke test and run it in CI.
- [ ] AI slide generation module: needs the AI provider SDK; decide it when this module starts.
- [ ] PPTX export module: needs the PPTX library; decide it when this module starts.
- [ ] Figma integration.
- [ ] Later quality gates, once there is feature code: Gate 2 architecture reviewer skill; `docs/TESTING.md` when the test suite grows; stricter module isolation if needed.
