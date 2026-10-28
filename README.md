# packy

[![](https://img.shields.io/badge/open-packy.js.org-8E51FF?style=for-the-badge&logo=javascript)](https://packy.js.org)

packy is a browser-based tool for bundling npm dependencies into a tarball for air-gapped and offline-first deployments.

## What it does

- Search package metadata when registry access is available
- Select the dependencies you want to bundle
- Build a `.tgz` archive in the browser
- Download the bundle for local use

## Tech stack

- Vue 3
- TypeScript
- Vite
- WebContainers
- t128n design system

## Design system

The interface uses the t128n design system. `src/t128n/tokens.css` and
`src/t128n/layouts.css` are generated artifacts; see `src/t128n/README.md` before
changing them.

## Requirements

packy runs in a modern browser and relies on cross-origin isolation for WebContainer support.

It is designed for environments where direct access to npm registries cannot be guaranteed.

## Development

```bash
bun install
bun run dev
```

## Build

```bash
bun run build
```

## Preview

```bash
bun run preview
```
