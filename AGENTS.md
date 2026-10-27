# AGENTS.md

falp-slide-builder is a personal TypeScript project (Fastify 5) for building slide decks. Today it is an HTTP backend foundation with `GET /health`.

## Read only what the task needs

- [ARCHITECTURE.md](ARCHITECTURE.md): creating files, adding a module, changing dependencies or choosing a library.
- [BACKLOG.md](BACKLOG.md): picking up or planning work.
- [README.md](README.md): setup and commands.

Before finishing any change, run:

```sh
pnpm check && pnpm typecheck && pnpm test
```

## Global rules

- Search `src/shared/` and the target module before writing a new helper.
- Put new code in exactly one place, as [ARCHITECTURE.md](ARCHITECTURE.md) defines. If the place is unclear, ask instead of creating a second location.
- When structure, flows or library status change, update ARCHITECTURE.md and BACKLOG.md in the same change.
- Never weaken a Biome rule or the architecture canary test to get green.
- Keep agent session logs, prompts and chat transcripts out of the repository.
- Do not add, remove or replace a dependency without an explicit decision from the project owner, recorded in ARCHITECTURE.md (Decisions and Library lifecycle). CI checks that package.json and the table agree; it does not authorize the change.

Architecture rules and prohibited libraries live in `biome.json`, not in this file. The canary test in `tests/architecture.test.ts` checks that the rules still work; `tests/dependency-allowlist.test.ts` checks that installed packages match the library table.
