# Copilot Instructions for packy

## Project Overview
- **packy** is a web-based npm bundler built with React, TypeScript, and Vite. It provides a UI for bundling npm packages directly in the browser.
- The entry point is `src/main.tsx`, which mounts the app to the `#root` div in `index.html`.
- Major UI components are organized under `src/components/`, with shared UI primitives in `src/components/ui/`.
- Custom hooks are in `src/hooks/`, and core logic/utilities are in `src/lib/`.

## Architecture & Data Flow
- The app shell (`app-shell.tsx`) coordinates layout, header/footer, and main panels.
- Panels like `package-bundle-panel.tsx`, `download-panel.tsx`, and `terminal-panel.tsx` handle specific features (bundling, downloads, terminal output).
- Data and events flow via React props and hooks; no global state manager is present.
- Utility functions for npm/package logic are in `src/lib/npm.ts` and `src/lib/downloads.tsx`.

## Developer Workflows
- **Build/Run:** Use Vite for local development (`npm run dev`).
- **Lint:** ESLint is configured via `eslint.config.js`. Type-aware linting uses both `tsconfig.node.json` and `tsconfig.app.json`.
- **Type Checking:** TypeScript config is split for app and node usage (`tsconfig.app.json`, `tsconfig.node.json`).
- **Assets:** Static files (SVG, etc.) are in `public/` and referenced with absolute paths (e.g., `/packy.svg`).

## Project-Specific Patterns
- UI primitives (Button, Card, Dialog, etc.) are in `src/components/ui/` and should be reused for consistency.
- Panels are self-contained and communicate via props; avoid implicit coupling.
- Debounced and download logic is abstracted in hooks (`use-debounced.ts`, `use-downloads.ts`).
- All main logic for npm package handling is in `src/lib/npm.ts`.

## Integration Points
- No backend: all npm bundling and downloads are handled client-side.
- External dependencies: React, Vite, ESLint, and npm logic libraries.
- No custom global state or context provider; use hooks and props for state management.

## Examples
- To add a new panel, create a file in `src/components/` and register it in `app-shell.tsx`.
- To add a new UI primitive, place it in `src/components/ui/` and document its props.
- For npm/package logic, extend `src/lib/npm.ts` and update relevant panels.

## Key Files
- `src/App.tsx`, `src/main.tsx`: App entry and mounting
- `src/components/app-shell.tsx`: Layout and panel registration
- `src/lib/npm.ts`: Core npm/package logic
- `src/components/ui/`: UI primitives

---

**For AI agents:**
- Follow the established panel/component structure.
- Use existing hooks and UI primitives before creating new ones.
- Reference TypeScript configs for type-aware linting.
- Keep all logic client-side; do not introduce server dependencies.
- Document new components and utilities with clear prop and usage examples.
