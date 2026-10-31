# Packy migration analysis: legacy Vue app → spec core + `@t128n/ui`

Status: executed on branch `feat/svelte-design-system`. See `PLAN.md` for the
task split and `docs/pr/` for before/after screenshots.

The original analysis below is retained as the migration record.

Sources:

- Packy spec: `SPEC.md` on branch `docs/core-spec` (commit `b14fd62`).
  It is **not** present on the current worktree branch.
- Design system: `github.com/t128n/design`, published as [`@t128n/ui@0.1.1`](https://www.npmjs.com/package/@t128n/ui).
- Current app: `main` at `5518faf` (detached worktree `happy-squid`).

## 1. Executive summary

This is **not a visual reskin**. The design system is Svelte 5-only
(`bits-ui`, runes, Svelte components), while Packy is Vue 3 + Nuxt UI +
Tailwind. Adopting `@t128n/ui` means **rewriting the UI layer in Svelte 5**.

At the same time, `SPEC.md` changes the product contract:

- one package reference per archive (no multi-package selection)
- no slim/full bundle choice, no user-supplied bundle name/version
- `npm pack --json` + identity verification instead of filename regexes
- lazy WebContainer boot, workspace cleanup, concurrency guard, 200 KiB log cap
- a framework-free, unit-tested core

The good news: the hard WebContainer pipeline already works (nested install,
manifest patching, `npm pack`). Most of it can be lifted out of
`step-bundle-view.vue` into the spec's core with modest changes.

Estimated effort: **4–5 focused days** for a developer comfortable with Svelte 5
and bits-ui; **6–8 days** if Svelte 5 is new. Roughly 2,600 lines of Vue are
replaced by ~1,800–2,200 lines of Svelte/app code plus ~600–800 lines of core
and tests (new).

## 2. What exists today

| Area      | Current implementation                                                                                                                           |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Framework | Vue 3.5, `<script setup>`, Vite 8                                                                                                                |
| UI kit    | Nuxt UI 4 + Tailwind 4 (`@nuxt/ui/vue-plugin`)                                                                                                   |
| Icons     | Iconify via Nuxt UI: Lucide + Simple Icons                                                                                                       |
| Flow      | `pack-stepper.vue`: Select → Bundle → Download (`UStepper`, `UCard`)                                                                             |
| Selection | `step-select-view.vue` (1013 lines): remote npm search, version picker, table, package.json import/export, bundle name/version, slim/full method |
| Run       | `step-bundle-view.vue` (583 lines): workspace mount, `npm install`, manifest patch, `npm pack`, stdout regex, Blob URL                           |
| Result    | `step-download-view.vue`: download link + copy install command                                                                                   |
| Runtime   | `use-webcontainer.ts`: boots at app startup, `exec`, mount/read                                                                                  |
| Registry  | `npm-registry.ts`: npm search + packument fetch via `ofetch`                                                                                     |
| Branding  | Four mascot SVGs in `public/`, gradient hero, multi-line footer credits                                                                          |
| Tests     | None                                                                                                                                             |
| Deploy    | GitHub Pages, COOP/COEP headers in dev, `coi-serviceworker` for production                                                                       |

Notable current behavior that the spec removes:

- multiple top-level packages per archive
- `slim-bundle` vs `full-bundle`
- archive name/version independent of the packed package
- importing a project `package.json`
- `?devMode` navigation mocks
- regex-based tarball filename discovery
- WebContainer boot on page load
- no workspace cleanup

## 3. Design system facts that drive the migration

### Distribution

`@t128n/ui@0.1.1` is public on npm (MIT), with:

- `@t128n/ui` → compiled Svelte 5 components + types
- `@t128n/ui/styles` → tokens, IBM Plex Sans/Mono, base styles, component CSS
- peer dependency: `svelte ^5.0.0`
- bundled deps: `bits-ui`, `carbon-icons-svelte`, `runed`,
  `@internationalized/date`

Do **not** vendor the local `~/Workspace/Repos/github.com/t128n/design` checkout:
it is behind `origin/main` and its `packages/ui/package.json` still says
`private: true`, while npm has the newer 0.1.1 build (which also exports
`Page`, `Section`, `Stack`, `Text`, `Code`, `Grid`, `Container`,
`EmptyState`, and supports dark mode).

Pin the exact version (`0.1.1`) while the package is pre-1.0.

### Toolchain compatibility

- Packy already has Vite `^8.0.8`, which is fine.
- Use `@sveltejs/vite-plugin-svelte@^7.3.1` (peer: Vite `^8`, Svelte `^5.46`).
  The older plugin v6 only supports Vite 6/7.
- `@t128n/ui` requires Svelte 5 (current: 5.57).
- Add `unplugin-icons` + `@iconify-json/carbon` for app icons
  (`~icons/carbon/*`). The design system ships its own internal icons.
- Bun 1.4.3 is available locally and matches the design repo's requirement.

### Design rules that conflict with the current UI

| Current                              | Design rule                                         | Action                                              |
| ------------------------------------ | --------------------------------------------------- | --------------------------------------------------- |
| Mascot SVGs (sleep/happy/sad/waking) | R31: no mascots/illustrations in product surfaces   | Remove from product UI; keep favicon                |
| Gradient hero background             | R31: no gradients                                   | Delete `hero-background.vue`                        |
| Cards wrapping every step            | R13/R14: no default card wrappers                   | Use `Page`/`Section` on white workspace             |
| Lucide + Simple Icons                | R38: Carbon only, one family                        | Replace with Carbon or text links                   |
| Dark terminal panel with green text  | R46/R30: tokens only, one overlay shadow            | Use `Code` block on `surface-subtle`                |
| Spinning stage icon                  | R35: infinite animation only for true indeterminate | Text status + one optional indeterminate `Progress` |
| Toasts (Nuxt UI)                     | R1: no toasts                                       | Inline `Alert`                                      |
| Modal for runtime error              | R1/R4: inline, specific                             | Page-level `Alert` with cause + fix                 |
| Tailwind utility classes             | Tokens + component CSS                              | Remove Tailwind entirely                            |

### Gaps in the design system for Packy

1. **No Stepper.** Compose the flow from `Page`, `Section`, `Stack`, and
   status text. Do not add a one-off stepper variant; if it proves reusable,
   contribute it upstream (R47/R48).
2. **No async/virtualized combobox.** `Combobox` filters a supplied `items`
   array client-side. Remote npm search must update `items` from a debounced
   input; this works but is not a first-class async pattern. Version lists can
   be thousands of entries (React), so cap or window them.
3. **`Button` is a `<button>` only.** No polymorphic `as`. For the download
   anchor, trigger a programmatic `<a download>` click or style a local link
   with tokens.
4. **No terminal/log component.** `Code` supports block mode; avoid a nested
   scroll container (R17). Put the log behind a `Collapsible` and let the page
   grow, or show only the tail on failure.
5. **`Navbar` brand is a string.** No logo or subtitle slot. Use
   `brand="packy"` and put the tagline in a `PageHeader` description.
6. **Table cell rendering** is fine via `TableRow`/`TableCell`, but columns
   only carry `label`, `align`, `numeric`. Interactive version cells must be
   composed inside `TableCell`.

## 4. Target architecture

```text
src/
  main.ts                    mount Svelte app, import @t128n/ui/styles
  App.svelte                 AppShell + Navbar + Page + Footer
  lib/
    core/                    framework-free, no DOM/network/fs
      normalize-input.ts     validate one package reference
      workspace-manifest.ts  generate bundle/package.json
      patch-manifest.ts      bundleDependencies + hook neutralization
      parse-pack-output.ts   npm pack --json parsing + fallback
      run.ts                 stage orchestration, log cap, cleanup
      errors.ts              stage-tagged failures
      log.ts                 ANSI stripping, CRLF normalization, cap
      types.ts
    runtime/
      types.ts               mount/exec/readText/writeText/readBinary/list/remove
      webcontainer.ts        lazy boot, COI check, production adapter
      fake.ts                in-memory fake for tests (test-only)
    npm-registry.ts          search + packument (client-only)
  components/
    package-picker.svelte    remote search, version choice, selected ref
    run-view.svelte          stages, live log, retry
    result-view.svelte       download, install command, copy
    app-navbar.svelte
    app-footer.svelte
  app.css                    minimal app-level token usage only
```

Rules to keep the core honest:

- `src/lib/core/**` imports nothing from Svelte, WebContainers, `ofetch`, or the DOM.
- Only `runtime/webcontainer.ts` touches `@webcontainer/api`.
- The caller owns the Blob/object URL; the core returns bytes.
- One active run per runtime instance; a second call rejects at `prepare`.
- Every run cleans up in `finally`, including failures.
- A failure never returns a partial result.

## 5. File-by-file migration map

| Current file                              |     LOC | Target                            | Notes                                               |
| ----------------------------------------- | ------: | --------------------------------- | --------------------------------------------------- |
| `src/App.vue`                             |      24 | `src/App.svelte`                  | `AppShell` + `Navbar` + `Page` + `Footer`           |
| `src/main.ts`                             |       7 | `src/main.ts`                     | `mount()` from Svelte; import `@t128n/ui/styles`    |
| `src/style.css`                           |      10 | `src/app.css`                     | Tokens only; remove Tailwind + Nuxt UI              |
| `src/components/app-container.vue`        |       5 | delete                            | `Container` / `Page`                                |
| `src/components/app-main.vue`             |       5 | delete                            | `AppShell`                                          |
| `src/components/app-header.vue`           |      83 | `app-navbar.svelte`               | Remove mascot + hero + modal; inline `Alert`        |
| `src/components/hero-background.vue`      |      61 | delete                            | Gradients banned                                    |
| `src/components/app-footer.vue`           |     160 | `app-footer.svelte`               | Concise links, commit hash, copyright               |
| `src/components/pack-stepper.vue`         |     261 | delete                            | Replace with one-page flow + `run` state            |
| `src/components/step-select-view.vue`     |    1013 | `package-picker.svelte`           | One package; remove bundle name/version/method      |
| `src/components/step-bundle-view.vue`     |     583 | `run-view.svelte` + `lib/core/**` | Split pipeline out of the component                 |
| `src/components/step-download-view.vue`   |      97 | `result-view.svelte`              | Download + copy; no URL owned by core               |
| `src/composables/use-webcontainer.ts`     |     147 | `lib/runtime/webcontainer.ts`     | Lazy boot, adapter surface                          |
| `src/lib/npm-registry.ts`                 |      56 | keep                              | Adapt types; client-only                            |
| `public/packy_*.svg`                      |       — | delete                            | Mascots banned in product surfaces                  |
| `src/assets/node-modules.svg`, `npmx.svg` |       — | delete                            | Replace with Carbon/text links                      |
| `index.html`                              |      28 | update                            | Theme color `#0F62FE`; remove `isolate` class       |
| `vite.config.ts`                          |      56 | rewrite                           | Svelte + Icons; keep COOP/COEP + git hash           |
| `tsconfig*.json`                          | 3 files | rewrite                           | Svelte configs; drop `@vue/tsconfig` and Nuxt paths |
| `package.json`                            |       — | rewrite                           | Svelte + `@t128n/ui`; drop Vue/Nuxt/Tailwind        |
| `knip.json`                               |       — | rewrite                           | New entry points; remove legacy ignores             |
| `oxfmt.config.ts`                         |       — | update                            | Drop `sortTailwindcss`                              |
| `scripts/copy-coi-serviceworker.ts`       |       — | keep                              | Still needed on GitHub Pages                        |
| `.github/workflows/deploy.yml`            |       — | keep                              | Build command changes underneath                    |
| `README.md`                               |       — | update                            | Tech stack, flow, one-package contract              |
| `CONTRIBUTING.md`                         |       — | update                            | Svelte conventions                                  |

## 6. Existing pipeline → spec core

The current `step-bundle-view.vue` already implements most of §6:

| Current                                                  | Spec requirement                                   | Change                                                       |
| -------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ |
| Workspace `workspace/<uuid>/bundle`                      | `/workspace/<id>/bundle`, lowercase alnum + `-`    | Normalize id; validate                                       |
| Manifest with selected packages                          | Exactly one dependency, name `packy-repack`        | Simplify                                                     |
| `npm install --ignore-scripts --install-strategy=nested` | Same                                               | Keep; add fixed env                                          |
| Patch every selected manifest                            | Patch the one installed manifest                   | Formalize pure function; sorted/de-duped union; all 13 hooks |
| `npm pack --ignore-scripts`                              | `npm pack --ignore-scripts --json`                 | Add `--json`                                                 |
| Regex filename from stdout                               | Parse last complete JSON array; directory fallback | Replace                                                      |
| Synthetic name/version                                   | npm's filename/name/version; verify identity       | Replace                                                      |
| Boot at startup                                          | Lazy boot on first run                             | Move into adapter                                            |
| No cleanup                                               | Remove workspace in `finally`                      | Add                                                          |
| No concurrency guard                                     | Reject second run at `prepare`                     | Add                                                          |
| Unbounded output                                         | 200 KiB tail + `[truncated]`                       | Add                                                          |
| Blob URL in bundle view                                  | Core returns bytes; caller owns URL                | Move                                                         |

## 7. Phased plan

### Phase 0 — decisions and baseline (0.5 day)

- Confirm the Svelte rewrite (recommended) versus porting only tokens into Vue
  (not recommended: loses behavior, accessibility, and upstream fixes).
- Decide mascot removal, dark mode, and `package.json` import.
- Create a branch; keep `main` deployable until the rewrite is complete.
- Record baseline: `bun install`, `bun run build`, current bundle of `lodash`.

### Phase 1 — toolchain + shell (0.5 day)

- Replace Vue/Nuxt/Tailwind deps with Svelte 5, plugin v7, `@t128n/ui@0.1.1`,
  `unplugin-icons`, `@iconify-json/carbon`.
- Rewrite `vite.config.ts`, `tsconfig*`, `package.json`, `main.ts`, `App.svelte`.
- Remove Tailwind/Nuxt UI imports; import `@t128n/ui/styles`.
- Build a static shell: `AppShell` + `Navbar` + `PageHeader` + empty
  `Section` + `Footer`.
- Verify: COI headers, fonts, focus ring, responsive layout, `bun run build`.

### Phase 2 — core + tests (1–1.5 days)

- Implement the five pure responsibilities with `bun:test`:
  normalize, workspace manifest, patch manifest, parse pack output, log.
- Implement `run.ts` with a fake runtime; stage order, errors, cleanup,
  concurrency, byte equality.
- Add the WebContainer adapter with lazy boot and COI precheck.
- Delete the pipeline code from the Vue component (it is now unused).
- Gate: all §11 acceptance criteria that do not need a browser pass.

### Phase 3 — package picker (1 day)

- `Combobox` for package search: debounced npm search, exact-name fallback,
  `dist-tags.latest`, empty/error states.
- Version picker (`Combobox` or capped `Select`) with `latest`/`deprecated`
  labels and unpacked size.
- One selected package summary; remove bundle name/version/method.
- Keep keyboard behavior: Enter to start, Backspace to clear when empty
  (optional; not required by spec).
- Gate: `lodash`, `@types/node`, a deprecated package, an unknown name.

### Phase 4 — run + result (1 day)

- Run view: stage list with text status, inline error `Alert`, retry, log
  behind a disclosure.
- Result view: npm filename, package identity, size, download, install
  command, copy with inline confirmation.
- Remove object URLs on reset/unmount.
- Gate: spec §11 manual integration checks.

### Phase 5 — cleanup and release (0.5–1 day)

- Delete mascots, SVGs, hero, unused deps, knip ignores, devMode.
- Update README/CONTRIBUTING, meta tags, CNAME unchanged.
- Run `bun run build`, `bun run test`, `bun run lint`, `bun run fmt`.
- Deploy preview; verify GH Pages COI service worker, offline install,
  scoped package filename, forced failure, retry, and cleanup.

## 8. Risks and open decisions

### Risks

1. **Framework rewrite is the dominant cost.** Any attempt to keep Vue means
   forking the design system; do not do both.
2. **Pre-1.0 design system.** Pin `@t128n/ui@0.1.1`; review its changelog
   before upgrading. Local design source is ahead of the app's pinned version.
3. **Async search fit.** `Combobox` is client-filter-first. If the remote
   search interaction feels wrong, build the picker from bits-ui `Combobox`
   directly in the app (still using design tokens) rather than modifying
   `@t128n/ui`.
4. **Version list scale.** Cap initial versions (e.g. newest 100) with a
   "load older" action, or accept slower rendering for very large packuments.
5. **Log display.** A 200 KiB log and R17 (no nested scroll) conflict. Use a
   disclosure plus page scroll, or show only the tail on failure.
6. **Vite/plugin versions.** Use plugin v7 for Vite 8; plugin v6 requires a Vite
   downgrade.
7. **Design drift.** The published 0.1.1 supports OS dark mode, while the local
   `DESIGN.md` still says light-only. Verify against the 0.1.1 Storybook docs
   and explicitly set `data-theme="light"` if dark is out of scope.
8. **CI/tooling.** Oxlint may not lint `.svelte` templates; rely on
   `svelte-check` for Svelte and keep oxlint for TS. Update `knip` for Svelte
   entry points.

### Decisions needed before implementation

1. Full Svelte rewrite? (recommended)
2. Mascot/brand: remove mascots for strict compliance, or record a written
   exception in the design repo?
3. `package.json` import: drop it for v1 (matches the one-reference spec), or
   keep it as a picker helper that chooses exactly one package?
4. Dark mode: light-only (`data-theme="light"`) or follow OS?
5. Branding copy: keep `packy — frictionless dependency bundling` in the page
   header?

## 9. Definition of done

- [ ] One package reference in, one `.tgz` out; no multi-package UI.
- [ ] Archive identity and filename come from `npm pack --json`.
- [ ] No lifecycle script runs during archiving or installation.
- [ ] Workspace is removed on success and failure.
- [ ] Concurrent runs are rejected at `prepare`.
- [ ] Aborted/failed runs never expose a partial download.
- [ ] Core is framework-free and covered by `bun test`.
- [ ] UI uses only `@t128n/ui` components, tokens, IBM Plex, Carbon icons.
- [ ] No Tailwind, Nuxt UI, Lucide, Simple Icons, mascots, or gradients.
- [ ] COOP/COEP + service worker still work on GitHub Pages.
- [ ] `lodash`, a scoped package, an exact version, a range, and a forced
      failure are manually verified, including offline install.
