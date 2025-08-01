# Contributing to Packy

Thank you for your interest in contributing to Packy! We welcome pull requests, issues, and suggestions to improve the project.

## How to Contribute

- **Panel/Component Structure:**
  - Add new panels in `src/components/` and register them in `app-shell.tsx`.
  - Create new UI primitives in `src/components/ui/` and document their props.
  - Keep panels self-contained and communicate via props; avoid implicit coupling.

- **Hooks & Utilities:**
  - Use or extend custom hooks in `src/hooks/` for debounced actions and downloads.
  - Extend npm/package logic in `src/lib/npm.ts` as needed.

- **Client-Side Only:**
  - All logic must remain client-side. Do not introduce server dependencies.

- **Code Style & Linting:**
  - Run `npm run lint` before submitting a PR.
  - Use the provided ESLint and TypeScript configs for type-aware linting.

- **Documentation:**
  - Document new components, hooks, and utilities with clear prop and usage examples.

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the development server:
   ```sh
   npm run dev
   ```
4. Make your changes and submit a pull request.

## Code of Conduct

Please be respectful and constructive in all interactions. See [CODEOWNERS](.github/CODEOWNERS) for project maintainers.

---

We appreciate your contributions!
