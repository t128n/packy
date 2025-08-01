# 🎒 packy: Offline NPM Bundle Builder

Packy bundles an npm package and all of its dependencies into a single tarball
for offline deployment. Choose a package and version, Packy resolves the full
dependency tree, fetches the artifacts, and emits a self-contained archive you
can ship to air‑gapped or restricted environments.

Built with React, TypeScript, Vite, and WebContainers. Runs entirely in the
browser—no backend required.

## Why Packy

- Prepare offline deployments (air‑gapped, CI without registry access).
- Pin exact versions for reproducible installs.
- Share a single file containing a full dependency set.

## What You Get

- One tarball containing:
  - The selected package
  - All transitive dependencies
  - Metadata needed for offline installation

## Features

- **Full dependency capture:** Resolves and includes all transitive deps.
- **Version locking:** Pick any version or default to the latest.
- **Client‑side operation:** Fetch, resolve, and pack in the browser.
- **Instant download:** Get a single .tar/.tgz ready for transfer.
- **Transparent logs:** View resolution and packing output.
- **Modular UI:** Panel-based, reusable components.

## How It Works

1. Search and select a package/version.
2. Packy queries npm metadata, resolves the dependency graph, and fetches the
   required tarballs.
3. Everything is assembled into one archive for offline use.

No server is involved; data is processed in your browser via WebContainers.

## Getting Started

You can try out packy at [🎒 t128n.github.io/packy/](https://t128n.github.io/packy/)

## Usage

1. Search for a package.
2. Select a version (defaults to latest).
3. Click “Bundle” to create the offline tarball.
4. Download and transfer the archive to the target environment.

## Notes

- Large graphs can take time and memory; keep the tab focused during packing.
- Private packages currently aren't supported

## Contributing

PRs welcome. Aim for client‑side logic, clear composition, and reproducible
bundles.

## License

[MIT](LICENSE)
