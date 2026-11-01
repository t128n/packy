# packy

[![](https://img.shields.io/badge/open-packy.js.org-0F62FE?style=for-the-badge&logo=javascript)](https://packy.js.org)

packy turns **one npm package reference** into a **single `.tgz` archive** that
can help install packages on a machine without registry access.

```text
one package reference
        │
        ├─ prepare   isolated workspace
        ├─ install   npm install --ignore-scripts --install-strategy=nested
        ├─ patch     bundle dependencies, neutralize lifecycle hooks
        ├─ pack      npm pack --ignore-scripts --json
        └─ capture   read the tarball bytes
        ▼
one archive + the identity npm actually packed
```

Authoring an archive requires registry access. Offline installation requires all
necessary dependencies and artifacts to be available locally. npm bundles the
resolved dependency tree where supported, but peer dependencies are not explicitly bundled.
Native binaries or other external resources may require additional preparation.
The recommended install command disables lifecycle scripts with `--ignore-scripts`;
packages that rely on those scripts may not work. Verify each archive and its
requirements before relying on it in an air-gapped environment.

## What it does

- Search the npm registry and choose exactly one package version.
- Resolve the dependency tree with npm inside WebContainers.
- Pack a single archive with npm's own filename and identity.
- Download the archive and install it locally, with the required dependencies available.

## Tech stack

- Svelte 5
- TypeScript
- Vite
- [`@t128n/ui`](https://github.com/t128n/design) (design system)
- WebContainers

## Requirements

packy runs in a modern browser and relies on cross-origin isolation for
WebContainer support (COOP/COEP headers in development, the bundled service
worker on static hosting).

## Development

```bash
bun install
bun run dev
```

## Checks

```bash
bun run test       # fmt, lint, knip, typecheck, unit
bunx playwright install chromium  # once, for browser tests
bun run test:browser
bun run build
```

## Architecture

- `src/lib/core/` — framework-free pipeline: input normalization, workspace
  manifest, manifest patching, pack-output parsing, bounded logging, and the
  `runBundle` orchestrator.
- `src/lib/runtime/` — WebContainer adapter and an in-memory fake for tests.
- `src/components/` — Svelte UI composed from `@t128n/ui`.

The core has no DOM, network, or filesystem access. The caller owns the Blob
URL and the download UI.
