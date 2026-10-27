# Source provenance and reuse limits

## Exact foundation

- Source: [`fegome90-cmd/kit_fundador`](https://github.com/fegome90-cmd/kit_fundador).
- Commit: [`c212571d500d737ed4d7527e41f1ae9287a3e777`](https://github.com/fegome90-cmd/kit_fundador/commit/c212571d500d737ed4d7527e41f1ae9287a3e777).
- Imported directory: [`templates/fastify-core`](https://github.com/fegome90-cmd/kit_fundador/tree/c212571d500d737ed4d7527e41f1ae9287a3e777/templates/fastify-core).

The import started byte-identical to that revision for `src/`, `tests/`, `tsconfig.json`, `.gitignore`, and `pnpm-workspace.yaml`. `tsconfig.json`, `.gitignore`, and `pnpm-workspace.yaml` remain unchanged. In `package.json`, the name, description, and formatting were adapted at import; direct dependencies, runtime constraints, and the package-manager pin are unchanged. The upstream README is replaced by project-specific English documentation. CI is new.

The lockfile starts from that revision, with one reviewed security deviation: transitive `fast-uri` resolutions are patched from `3.1.8` to `3.1.9` and `4.2.2` to `4.2.3`, within the existing dependency ranges. No other package resolution changes. The upstream [3.x](https://github.com/fastify/fast-uri/releases/tag/v3.1.9) and [4.x](https://github.com/fastify/fast-uri/releases/tag/v4.2.3) security releases address four URI parsing/normalization advisories. The original lockfile audit reported eight affected-version entries (four moderate and four low, across those two versions). This is dependency evidence, not a demonstrated exploit of this starter's `/health` route. An audit is time-bound, not a security certification.

No source-repository root application, database configuration, setup scripts, hooks, clinical recipe, branding, private documents, or external assets are imported. Future upstream changes must be reviewed explicitly; there is no automatic template update or overwrite mechanism.

### Local changes since the import

- `src/app.ts`: random UUID request IDs (`genReqId`); schema-validation 400 responses include an `errors` array (`in`, `path`, `message`); 5xx logs record the error name, code and stack frames, never the message.
- `src/runtime.ts`: `listen` accepts `shutdownTimeoutMs` (default 10 s), after which a hung shutdown exits with code 1; the custom startup line previously written to stdout was removed in favor of Fastify's "Server listening at" log.
- `tests/`: the test suite was adapted to these changes, and new tests were added.
- `package.json`: `license` set to `MIT`; `dev` runs `dev:tsc` (`tsc --watch`) and `dev:server` (`node --watch`) in parallel.
- `.github/workflows/ci.yml`: push trigger limited to `main`, superseded runs cancelled, and the dependency audit moved to a separate non-blocking `audit` job that also runs weekly.

## License status

The repository is licensed under the [MIT License](LICENSE). The upstream template is by the same author, and its [root `package.json`](https://github.com/fegome90-cmd/kit_fundador/blob/c212571d500d737ed4d7527e41f1ae9287a3e777/package.json) declares `MIT`. Third-party dependencies retain their own licenses.

No optional design-token source with verified reuse terms was established for this import. Consequently no design tokens or other design assets are copied. A future reference or import must identify its source, revision, applicable license, and notices independently of any institutional endorsement.

## Scope

This is Felipe's personal project, not an institutional FALP product. Neither the repository name nor reuse of a licensed design reference would establish sponsorship, endorsement, or approval.
