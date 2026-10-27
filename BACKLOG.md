# Backlog

Entries are tasks and decisions only. Session logs do not belong here.

## As-is

- Backend foundation: Fastify server with `GET /health`, configuration checks, Problem Details errors, graceful shutdown and tests.
- Quality gates: Biome (format, lint, architecture rules), TypeScript type checking, Vitest, blocking CI, and a non-blocking dependency audit.
- No deck model yet: no slides, decks, generation, export or persistence.

## To be done, in order

- [ ] Decide the "To be decided" stack items in [ARCHITECTURE.md](ARCHITECTURE.md): frontend framework, UI component library, AI provider SDK, PPTX library, persistence.
- [ ] Build the first vertical slice in `src/modules/decks`: deck schema in `domain/`, `POST /decks` and `GET /decks/:id` in `routes/`, an in-memory adapter, and tests. This slice becomes the pattern for later modules.
- [ ] AI slide generation module.
- [ ] PPTX export module.
- [ ] Figma integration.
- [ ] Later quality gates, once there is feature code: an AI reviewer skill (Gate 2), and stricter module isolation if needed.
