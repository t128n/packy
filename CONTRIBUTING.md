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
- Use Bootstrap 5 utilities and SvelteStrap components. Do not add another
  component library, a new token system, or broad custom styling. Keep
  application-specific CSS limited to genuine layout and behavior needs.
- Keep `src/lib/core/` free of Svelte, DOM, network, and filesystem access.
- Add `bun:test` coverage for core behavior changes.
- `src/sveltestrap.d.ts` is a compatibility shim for SvelteStrap's Svelte 3-era
  type declarations. Remove it when upstream publishes Svelte 5 types.
- Include a clear summary in the pull request template.
