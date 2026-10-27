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
pnpm typecheck
pnpm test
pnpm start
```

`corepack enable` installs shims alongside Corepack. To avoid changing an existing installation, use `corepack enable --install-directory <writable-directory>` and prepend that directory to `PATH`. Verify `pnpm --version` reports `11.25.0` from the project directory.

`test` builds the project before running its tests, so `start` has compiled files available. After installation, a build without tests is `pnpm build`; development mode is `pnpm dev`.

The default address is `http://127.0.0.1:3000`. Check it with `curl http://127.0.0.1:3000/health`. Optional environment variables are `PORT` (an integer from 0 to 65535) and `HOST` (`127.0.0.1`, `localhost`, `0.0.0.0`, `::1`, or `::`). Use a fixed nonzero port for the example URL; port `0` requests an automatically allocated port.

`/health` only reports that the HTTP process responds. It does not check databases, external services, or production readiness. `buildApp()` creates the app without opening a port. Register future plugins through the existing `beforeRoutes → routes → afterRoutes` composition boundary; keep resource cleanup in the existing lifecycle helpers.

## Safety and optional design references

- Keep the loopback default. Binding to `0.0.0.0` or `::` exposes the process beyond loopback; it is not deployment hardening.
- The template limits request bodies, sanitizes error responses, disables proxy trust, avoids automatic request-URL logs, and redacts sensitive headers. These defaults are not a security certification.
- Before Internet deployment, independently configure access controls, TLS, proxy trust, traffic limits, and operational monitoring. This PR does not deploy anything.
- Use synthetic content only. Do not commit patient data, clinical information, internal documents, private branding, credentials, or unlicensed assets.
- Existing design tokens may be an **optional reference only when their license permits the intended reuse**. Preserve required notices and check code, fonts, imagery, trademarks, and other assets separately. No token package, logo, institutional asset, or font is included or required here. Design reuse does not imply institutional endorsement and is not an approval gate for developing the application.

## Verification

CI runs the pinned dependency installation, type checking, the inherited tests, and a production dependency audit on Node.js 24. The lockfile includes only the transitive security patches documented in [UPSTREAM.md](UPSTREAM.md). Local checks and CI results must be reported separately; an unexecuted workflow is not a passing check. No end-to-end presentation export, external-provider integration, clinical validation, or production deployment has been established by this bootstrap.

The npm package is deliberately `private: true`; the GitHub repository can still be public. License status and the exact import boundary are recorded in [UPSTREAM.md](UPSTREAM.md).
