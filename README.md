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
- Nuxt UI
- WebContainers

## Requirements

packy runs in a modern browser and relies on cross-origin isolation for WebContainer support.

It is designed for environments where direct access to npm registries cannot be guaranteed.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```
