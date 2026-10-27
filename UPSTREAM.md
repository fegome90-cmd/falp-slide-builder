# Source provenance and reuse limits

## Exact foundation

- Source: [`fegome90-cmd/kit_fundador`](https://github.com/fegome90-cmd/kit_fundador).
- Commit: [`c212571d500d737ed4d7527e41f1ae9287a3e777`](https://github.com/fegome90-cmd/kit_fundador/commit/c212571d500d737ed4d7527e41f1ae9287a3e777).
- Imported directory: [`templates/fastify-core`](https://github.com/fegome90-cmd/kit_fundador/tree/c212571d500d737ed4d7527e41f1ae9287a3e777/templates/fastify-core).

The `src/` and `tests/` trees, `tsconfig.json`, `.gitignore`, and `pnpm-workspace.yaml` are copied without byte changes from that revision. In `package.json`, only the name, description, license field, and formatting are adapted; direct dependencies, runtime constraints, scripts, and the package-manager pin are unchanged. The upstream README is replaced by project-specific English documentation. CI is new.

The lockfile starts from that revision, with one reviewed security deviation: transitive `fast-uri` resolutions are patched from `3.1.8` to `3.1.9` and `4.2.2` to `4.2.3`, within the existing dependency ranges. No other package resolution changes. The upstream [3.x](https://github.com/fastify/fast-uri/releases/tag/v3.1.9) and [4.x](https://github.com/fastify/fast-uri/releases/tag/v4.2.3) security releases address four URI parsing/normalization advisories. The original lockfile audit reported eight affected-version entries (four moderate and four low, across those two versions). This is dependency evidence, not a demonstrated exploit of this starter's `/health` route. Fresh frozen installation, tests, and a production dependency audit must verify the patched candidate; an audit is time-bound, not a security certification.

No source-repository root application, database configuration, setup scripts, hooks, clinical recipe, branding, private documents, or external assets are imported. Future upstream changes must be reviewed explicitly; there is no automatic template update or overwrite mechanism.

## License status

This project is licensed under the [MIT License](LICENSE). The upstream template is by the same author, and its [root `package.json`](https://github.com/fegome90-cmd/kit_fundador/blob/c212571d500d737ed4d7527e41f1ae9287a3e777/package.json) declares `MIT`. Third-party dependencies retain their own licenses.

No optional design-token source with verified reuse terms was established for this import. Consequently no design tokens or other design assets are copied. A future reference or import must identify its source, revision, applicable license, and notices independently of any institutional endorsement.

## Scope

This is Felipe's personal project, not an institutional FALP product. Neither the repository name nor reuse of a licensed design reference would establish sponsorship, endorsement, or approval.
