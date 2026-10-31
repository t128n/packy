# Contributing

## Setup

1. Install dependencies with `bun install`.
2. Start the app with `bun run dev`.

## Before opening a PR

1. Run `bun run test`.
2. Run `bun run build`.
3. If needed, format with `bun run fmt`.

## Guidelines

- Keep changes focused and small.
- Use Svelte 5 runes and `onclick` event attributes.
- Use `@t128n/ui` components and semantic tokens. Do not add Tailwind, another
  component library, another icon family, raw colors, or one-off control styles.
- Keep `src/lib/core/` free of Svelte, DOM, network, and filesystem access.
- Add `bun:test` coverage for core behavior changes.
- Include a clear summary in the pull request template.
