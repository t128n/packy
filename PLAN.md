# Plan: migrate Packy to `SPEC.md` + `@t128n/ui`

Scope: replace the Vue 3 / Nuxt UI app with a Svelte 5 app using
`@t128n/ui@0.1.1`, and restructure the WebContainer pipeline into the
framework-free core defined by `SPEC.md` (branch `docs/core-spec`).

## Workstreams

```
T1 foundation ─┬─> T2 core pure ─┬─> T4 runtime + run ─┐
               └─> T3 picker      └─> T5 run/result UI ─┴─> T6 integrate ─> T7 audit ─> T8 screenshots + PR
```

| Task                | Owner      | Files (exclusive)                                                                                                              | Depends on                     |
| ------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| T1 foundation       | lead       | toolchain configs, `src/main.ts`, `src/App.svelte`, `src/app.css`, `index.html`, core types/errors                             | —                              |
| T2 core pure        | subagent A | `src/lib/core/normalize-input.ts`, `workspace-manifest.ts`, `patch-manifest.ts`, `parse-pack-output.ts`, `log.ts`, `*.test.ts` | T1                             |
| T3 picker           | subagent C | `src/components/package-picker.svelte`, `src/lib/npm-registry.ts`                                                              | T1                             |
| T4 runtime + run    | subagent B | `src/lib/core/run.ts`, `run.test.ts`, `src/lib/runtime/*`                                                                      | T2                             |
| T5 run/result UI    | subagent D | `src/components/run-view.svelte`, `result-view.svelte`, `app-navbar.svelte`, `app-footer.svelte`                               | T1 (types), T2/T4 API contract |
| T6 integrate        | lead       | `src/App.svelte`, `src/app.css`, leftovers                                                                                     | T3, T4, T5                     |
| T7 audit            | subagent E | read-only audit; fixes in agreed files                                                                                         | T6                             |
| T8 screenshots + PR | lead       | `docs/pr/*.png`, `README.md`, PR body                                                                                          | T7                             |

## Acceptance gates

- `bun run test` green: fmt, lint, knip, typecheck, `bun test`.
- `bun run build` green.
- `SPEC.md` §11 pure and fake-runtime criteria covered by `bun test`.
- Manual: `lodash`, scoped package, exact version, range, unknown package,
  retry, cleanup, offline install.
- No Vue, Nuxt UI, Tailwind, Lucide, Simple Icons, mascots, or gradients.
- Before/after screenshots committed under `docs/pr/` and embedded in the PR.

## Contracts (frozen for parallel work)

`src/lib/core/types.ts`:

- `RunStage = 'prepare' | 'install' | 'patch' | 'pack' | 'capture'`
- `PackageReference = { name: string; versionSpec: string }`
- `Runtime` = `mount(files)`, `exec(cmd, args, opts)`, `readText`, `writeText`,
  `readBinary`, `list`, `remove`
- `RunResult = { bytes, filename, name, version, log }`
- `RunOptions = { runtime, reference, onStage?, onLog? }`

`runBundle(options): Promise<RunResult>` is the only entry point the UI uses.

## Design decisions

- Svelte 5 runes + `onclick` event attributes.
- Published `@t128n/ui@0.1.1`; styles via `@t128n/ui/styles`; Carbon icons via
  `~icons/carbon/*` and `unplugin-icons`.
- Light theme only (`data-theme="light"`), matching the design system's
  documented light-first default.
- Remove mascots, gradient hero, stepper, multi-package selection,
  bundle name/version/method, `package.json` import/export, and dev mode.
- One package reference; one archive; core returns bytes; UI owns Blob URLs.
- `npm pack --json` is the source of filename and identity.

## Outcome

All workstreams completed on `feat/svelte-design-system`.

- Svelte 5 + `@t128n/ui@0.1.1` shell, picker, run view, result view, navbar,
  and footer.
- Framework-free core with 82 passing `bun:test` cases.
- `bun run test` (fmt, lint, knip, typecheck, unit) and `bun run build` pass.
- Manual browser checks: `lodash` → `lodash-4.18.1.tgz` (307 KiB);
  `@types/node` → `types-node-26.6.6.tgz` (492 KiB); nonexistent version fails
  at `install` with exit code 1, retry, and change-package paths.
- Before/after screenshots live in `docs/pr/`.
