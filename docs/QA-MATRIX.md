# QA Matrix — FALP Slide Studio HTML, personal read-only slice

This inventory describes **implemented coverage**, not future intent.

| Layer | Entry points | Verification | Scope / current limitation |
|---|---|---|---|
| Language / types | TypeScript NodeNext, six-pattern discriminated union | `pnpm typecheck` | No unrestricted HTML/JS user payloads |
| Coverage | `DeckSpec`, semantic slide views | `pnpm test:coverage` | Thresholds: statements >=80%, lines >=80%, functions >=80%, branches >=70%; full React interaction is covered separately by Playwright. |
| Grammar / security | `parseDeckSpec`, `DeckValidationError` | `tests/deck-spec.test.ts` | UUID, pin SHA, source HTTPS, all pattern constraints, Unicode, draft/reviewed |
| Editorial | `validateDeckReadyForExport`, `validateBrandRevision` | `tests/deck-spec.test.ts` | Human review is not clinical validation; full export not implemented |
| Component semantics | `CoverLayout`, `StatementEvidenceLayout`, `ComparisonLayout`, `ProcessLayout`, `DiagramLayout`, `ClosingLayout` | `tests/slide-view.test.ts` | SSR markup, accessible structure, escaped user text, label provenance |
| Navigation | `clampSlide`, `slideFromHash`, `SlideStudioPreview` | `tests/navigation.test.ts`, `e2e/visual.spec.ts` | Keyboard, hash, reload, focus and editable target |
| HTTP / production | `studioPlugin`, `buildApp` | `tests/studio-static.test.ts`, previous `tests/http.test.ts` | Built /studio/ index+assets, no source exposure, /health unaffected |
| Visual | Six real React layouts | `e2e/visual.spec.ts` | 24 layout×viewport checks: 1920, 1366, 390, 320; desktop-fit checks also include 1024×600; screenshots kept as CI artifacts |
| Clipping | Text range + nearest hidden/clip ancestor | `e2e/visual.spec.ts` negative injection | Rejects false PASS when document scrollWidth equals width |
| A11y | Browser and DOM/contrast | Playwright + axe-core | 6 patterns × 2 viewports (12 axe scans); **not** complete WCAG or screen-reader certification |
| CI | GitHub Actions | `verify` job | Locked install, Biome, TypeScript, production build, Vitest+V8 thresholds, Chromium E2E and axe, screenshot artifacts; blocking production dependency audit |
| Unimplemented | Editable controls, IndexedDB autosave, deck CRUD, HTML export, Kalka round-trip | NOT_RUN | These require their own PRs and test gates |

**No patient data.** The local preview has synthetic information. FALP colours serve as reference; no institutional logo or commercial photographs are redistributed. The app is a personal prototype and not an institutional product.

**Provenance:** the current branch builds on the open PR #2 (`d9919d579c2993940adfbd36563dc9cdf8d93bc4`), with no merge assumed. The existing `DeckShell` PR #6 is a reference, not a dependency of this React preview.

**Observed baseline on macOS Chromium (2026-11-17):** 75/75 Vitest, 8/8 Playwright, 24 slide×viewport render inspections, 12 axe checks. Coverage of tracked new domain/renderer files: statements 86.53%, branches 81.68%, functions 97.5%, lines 92.68%. These are measurements for this branch only, not full repository coverage. Negative clipping injection deliberately fails its geometry oracle before CSS fixes.

Security fix: @fastify/static pinned to 10.1.11 after the first CI audit exposed GHSA-83w8-p2f5-377r (high) and dependent moderates in 8.3.0. Verified using pnpm audit --prod (exit 0; zero advisories). The CI audit job is now blocking.
