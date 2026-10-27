# falp-slide-builder

A **personal project by Felipe González**, starting with a minimal Fastify backend for future presentation-building work. It is **not an institutional FALP product** and does not claim FALP sponsorship, endorsement, approval, or affiliation. Institutional approval is not a prerequisite for developing this personal project.

## Current scope

This bootstrap provides an HTTP server, `/health`, configuration validation, error handling, lifecycle management, and automated tests. It does **not** yet provide a slide editor, AI generation, PPTX export, Figma integration, authentication, or persistence. There are no internal assets, clinical records, or patient data in this starter.

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

`pnpm check` runs Biome (formatting, lint and architecture rules) without writing files. `pnpm lint` runs only the linter, and `pnpm format` rewrites files with the formatter. `pnpm test` runs the Vitest suite. Its global setup compiles `dist/` first, because the process-level tests start `dist/server.js`; `pnpm start` needs that build too, so run `pnpm build` first if you have not run the tests. Development mode is `pnpm dev`, which recompiles TypeScript and restarts the server when files change.

The default address is `http://127.0.0.1:3000`. Check it with `curl http://127.0.0.1:3000/health`. Optional environment variables are `PORT` (an integer from 0 to 65535) and `HOST` (`127.0.0.1`, `localhost`, `0.0.0.0`, `::1`, or `::`). Use a fixed nonzero port for the example URL; port `0` requests an automatically allocated port.

`/health` only reports that the HTTP process responds. It does not check databases, external services, or production readiness. `buildApp()` creates the app without opening a port. Register future plugins through the existing `beforeRoutes → routes → afterRoutes` composition boundary; keep resource cleanup in the existing lifecycle helpers.

## Working with coding agents

Coding agents should read [AGENTS.md](AGENTS.md) first, then [ARCHITECTURE.md](ARCHITECTURE.md) before creating files, adding modules or adding dependencies.

## Safety and optional design references

- Keep the loopback default. Binding to `0.0.0.0` or `::` exposes the process beyond loopback; it is not deployment hardening.
- The template limits request bodies, sanitizes error responses, disables proxy trust, avoids automatic request-URL logs, and redacts sensitive headers. Schema-validation 400 responses list the failing fields (`in`, `path`, `message`). Request IDs are random UUIDs. These defaults are not a security certification.
- Before Internet deployment, independently configure access controls, TLS, proxy trust, traffic limits, and operational monitoring. Nothing in this repository deploys anything.
- Existing design tokens may be an **optional reference only when their license permits the intended reuse**. Preserve required notices and check code, fonts, imagery, trademarks, and other assets separately. No token package, logo, institutional asset, or font is included or required here. Design reuse does not imply institutional endorsement and is not an approval gate for developing the application.

## Verification

The blocking `verify` job runs on pushes to `main` and on pull requests, on Node.js 24. It performs a frozen dependency installation without lifecycle scripts, then runs Biome (`biome ci`: formatting, lint and architecture rules), type checking, the build, and the Vitest suite (`pnpm test`) as separate steps. A separate `audit` job runs a production dependency audit on pull requests, pushes to `main`, and weekly; it is non-blocking, so its findings do not fail CI. The lockfile includes only the transitive security patches documented in [UPSTREAM.md](UPSTREAM.md). No end-to-end presentation export, external-provider integration, clinical validation, or production deployment has been established by this bootstrap.

The npm package is deliberately `private: true`; the GitHub repository can still be public. The project is licensed under the [MIT License](LICENSE); the exact import boundary is recorded in [UPSTREAM.md](UPSTREAM.md).
