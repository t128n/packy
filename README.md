# 🎒 packy: Web-Based NPM Bundler

Packy is a modern, browser-based npm bundler built with React, TypeScript, Vite and WebContainers. It empowers developers to bundle npm packages directly in the browser; no backend required. Packy provides a fast, intuitive UI for exploring, bundling, and downloading npm packages, making it ideal for rapid prototyping, education, and sharing code.

## Features

- **Client-Side Bundling:** Bundle npm packages in the browser—no server, no install.
- **Modern UI:** Built with reusable UI primitives for a consistent, accessible experience.
- **Panel-Based Layout:** Modular panels for package bundling, downloads, and terminal output.
- **Instant Downloads:** Download bundled packages as ready-to-use files.
- **Debounced Actions:** Responsive UI with debounced input and download logic.
- **No Global State:** State flows via React hooks and props for clarity and maintainability.

## How It Works

Packy leverages browser-based npm logic to fetch, bundle, and serve packages. All operations are performed client-side, ensuring privacy and speed. The app shell coordinates layout and panel registration, while each panel is self-contained and communicates via props.

## Project Structure

- App.tsx, main.tsx: App entry and mounting
- app-shell.tsx: Layout and panel registration
- components: Panels and UI primitives
- npm.ts: Core npm/package logic
- hooks: Custom hooks for debouncing and downloads
- public: Static assets

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Start the development server:**
   ```sh
   npm run dev
   ```
3. **Open [http://localhost:5173](http://localhost:5173) in your browser.**

## Contributing

Contributions are welcome! Please follow the established component and panel structure, reuse UI primitives, and keep all logic client-side.

## License

MIT
