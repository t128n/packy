# packy core specification

Status: proposed, for implementation.

## 1. Purpose

packy does one thing: **turn one npm package reference into a single `.tgz`
archive that can be installed on a machine without registry access.**

```
one package reference: name + version spec
                  │
                  ├─ prepare   create an isolated workspace
                  ├─ install   npm install (no scripts, nested)
                  ├─ patch     mark dependencies as bundled, neutralize hooks
                  ├─ pack      npm pack (no scripts)
                  └─ capture   read the tarball bytes
                  ▼
        one archive + the identity npm actually packed
```

The archive contains the selected package and the dependency tree npm resolved
for it. Installing the archive recreates that package offline.

Authoring an archive requires registry access. Installing the archive does not.
That distinction is the reason the tool exists.

Everything else — search, version browsing, layout, download UI — is a client
of this core. The core must be usable, and testable, without a Vue component.

## 2. Core contract

Input:

- Exactly one package name.
- One version spec: exact version, semver range, or dist-tag.

No archive name or archive version is supplied. The identity of the archive is
the identity of the package npm installs and packs.

Output:

- The exact bytes of one npm tarball.
- The archive filename reported by npm.
- The package name and version actually packed.
- A bounded log of the run.

Guarantees:

- The selected package is present in the archive together with the dependency
  tree npm resolved for it.
- No lifecycle script from the package or its dependencies executes during
  archiving.
- Lifecycle scripts in the archived manifests are neutralized, so installing
  the archive does not execute package scripts either.
- Nothing is written outside the run's workspace, and the workspace is removed
  afterwards.
- A failed run produces no result and no partial download.

## 3. Scope

### In scope

- Normalizing one package reference.
- Creating an isolated workspace.
- Running `npm install` and `npm pack` in WebContainers.
- Patching the installed manifest so dependencies are included in the tarball.
- Capturing the archive deterministically.
- Stage-based errors and cleanup.

### Out of scope

- Combining multiple top-level packages into one archive. An archive has
  exactly one top-level package; its resolved dependencies are nested inside
  it. Multiple packages are handled by producing multiple archives and
  installing them together.
- Importing a project `package.json` or a dependency set. The core takes one
  package reference, not a manifest.
- Registry search, package metadata, version lists, sizes, deprecation badges.
- Package selection UI, stepper, progress visuals, download UI.
- External links (npmx, node-modules, pkg-size).
- Dev-mode mocks and navigation.
- Publishing, uploading, or storing archives.
- Dependency graph visualization.
- Transitive dependency resolution implemented by packy itself. npm does it.

## 4. Terms

- **Package reference**: a package name plus one version spec.
- **Version spec**: exact semver, a semver range, or a dist-tag. Only
  registry-resolvable specs are accepted.
- **Installed package**: the package npm places at
  `node_modules/<name>` in the workspace.
- **Archive**: the npm tarball produced from the installed package.
- **Run**: one attempt to produce an archive.
- **Stage**: one of `prepare`, `install`, `patch`, `pack`, `capture`.
- **Log**: captured output from the run, with ANSI codes removed and length
  capped.

## 5. Input rules

- Accept exactly one package reference. Reject zero or more than one.
- Trim the name and version spec.
- A missing or empty version spec means `latest`.
- Accept scoped names (`@scope/name`) and unscoped names.
- Valid names use lowercase letters, digits, `-`, `_`, `.`, optionally with one
  `@scope/` prefix. Names may not start with `.` or `_`.
- Reject names that are not valid npm package names.
- Reject non-registry specs: `file:`, `link:`, `workspace:`, `git+`, `http:`,
  `https:`, and `npm:` aliases.
- Do not accept a manifest, a lockfile, or a list of packages in the core.

Rationale: packy bundles one package from a registry. Unsupported specs would
fail later, inside npm, with a worse error.

## 6. Run behavior

### 6.1 Workspace

- One run uses one isolated directory: `/workspace/<id>/bundle`.
- The id is lowercase alphanumeric plus `-`.
- Only one run may be active per runtime instance. A second concurrent request
  rejects with a `prepare` failure.
- The workspace is removed in a `finally` block, on success and failure.
  Cleanup errors are logged and never mask the primary error.

### 6.2 Prepare

Write `bundle/package.json`:

```json
{
	"name": "packy-repack",
	"version": "0.0.0",
	"private": true,
	"dependencies": { "<name>": "<version spec>" }
}
```

The workspace package is only a vehicle for installing the selected package.
Its name and version are never exposed as the archive identity.

A failure while creating the workspace, booting the runtime, or checking browser
isolation is a `prepare` failure.

### 6.3 Install

Run in the workspace:

```
npm install --ignore-scripts --install-strategy=nested
```

Requirements:

- `--ignore-scripts` is mandatory.
- `--install-strategy=nested` is mandatory. It keeps each package's
  dependencies inside that package's own `node_modules`, where `npm pack` can
  bundle them.
- Disable color, progress, audit, funding, and update notices.
- A nonzero exit is an `install` failure and includes the exit code and log.

### 6.4 Patch

Read `bundle/node_modules/<name>/package.json` after install.

- Set `bundleDependencies` to the sorted, de-duplicated union of the keys of
  the manifest's `dependencies` and `optionalDependencies`.
- Set `bundledDependencies` to the same array (legacy alias).
- If the original manifest used `bundleDependencies: true`, replace it with the
  explicit array.
- For every lifecycle or publish/test hook present in `scripts`, replace the
  command with `echo skip-<hook>`. Hooks:
  `preinstall`, `install`, `postinstall`, `prepare`, `prepack`, `postpack`,
  `prepublish`, `prepublishOnly`, `publish`, `postpublish`, `pretest`,
  `test`, `posttest`.
- Preserve all other manifest fields and unrelated scripts.
- Write the manifest back before packing.

Peer dependencies are not added to the bundled list. The archive keeps the
original peer requirements, and the consumer's npm resolves them as usual.

A missing or unparsable installed manifest is a `patch` failure.

### 6.5 Pack

Run in the installed package directory:

```
npm pack --ignore-scripts --json
```

Requirements:

- `--ignore-scripts` is mandatory.
- A nonzero exit is a `pack` failure and includes the exit code and log.
- `npm pack` writes the tarball into the package directory.

### 6.6 Capture

- Primary source: the JSON array printed by `npm pack --json`, which contains
  `filename`, `name`, and `version`.
- The output stream may interleave notices. Parse the last complete JSON array
  in the captured output; do not assume the whole output is JSON.
- Fallback: if parsing fails, list the pack directory. If exactly one `*.tgz`
  exists, use it. Otherwise fail with a `capture` failure.
- Read the tarball as bytes.
- Report npm's filename exactly, including npm's handling of scoped names
  (`@scope/name` becomes `scope-name-<version>.tgz`).
- Never reconstruct the filename from the input.
- Report the name and version from npm's pack output. Verify that the identity
  matches the installed package; a mismatch is a `capture` failure.
- A missing or unreadable tarball is a `capture` failure.

### 6.7 Logging

- Strip ANSI escapes and normalize `\r\n` and `\r` before storing.
- Cap the retained log at 200 KiB. On overflow, keep the tail and prefix a
  `[truncated]` marker.
- Record each command before running it.
- Stream chunks to the caller while the run is active.
- The final result carries the capped log.

### 6.8 Cleanup

- Remove the run's workspace after success and after failure.
- Cleanup runs before the result or failure is reported.
- A cleanup error is appended to the log and does not replace the primary
  failure.

## 7. Runtime

The core needs a small runtime surface rather than direct access to a browser
API:

- mount a set of files at the workspace path
- run a command with a working directory, environment, and output callback
- read a text file
- write a text file
- read a binary file
- list a directory
- remove a directory tree

The production adapter uses WebContainers. Tests use an in-memory fake.

Runtime rules:

- Boot WebContainers lazily on the first run, not at app startup.
- Fail before `prepare` with a clear message if the browser is not
  cross-origin isolated.
- Use a fixed environment that disables color, progress, audit, funding, and
  update notices.
- Never reuse a workspace between runs.
- A retry is a fresh run with a fresh workspace.

## 8. Core responsibilities

The core has five responsibilities. Concrete names and module layout are left
to the implementation.

1. **Normalize input.** Validate the single package reference and produce the
   version spec used for installation. This part is pure.
2. **Generate the workspace manifest.** Produce the JSON described in §6.2.
   This part is pure.
3. **Patch an installed manifest.** Apply the rules in §6.4. This part is pure.
4. **Parse pack output.** Extract the filename and identity from npm output as
   described in §6.6. This part is pure.
5. **Execute a run.** Coordinate workspace, install, patch, pack, capture,
   logging, and cleanup, in that order.

Rules:

- Pure responsibilities have no browser, network, or filesystem access.
- A run never mutates caller input.
- Failures are reported with the stage that failed.
- All file paths are derived inside the core from the workspace id; callers do
  not pass paths.
- The core does not create object URLs or touch the DOM. The caller owns the
  download UI.

## 9. Error semantics

Every failure is reported with the stage that failed:

| Stage     | Typical causes                                                           |
| --------- | ------------------------------------------------------------------------ |
| `prepare` | invalid input, no cross-origin isolation, runtime boot, mount failure    |
| `install` | npm install nonzero exit, unresolvable package, network failure          |
| `patch`   | installed manifest missing or unparsable                                 |
| `pack`    | npm pack nonzero exit                                                    |
| `capture` | unparsable output, missing tarball, unreadable tarball, identity mismatch |

Requirements:

- Include npm's exit code for `install` and `pack`.
- Include the capped log tail (at most 200 KiB) for diagnosis.
- Do not expose a partial result.
- Do not leave the workspace behind.
- Wrap every non-input error; never swallow it.

## 10. Invariants

1. Exactly one package reference is accepted per run.
2. One run produces one archive with exactly one top-level package.
3. `bundleDependencies` lists exactly the manifest's `dependencies` and
   `optionalDependencies`, sorted and de-duplicated.
4. Lifecycle hooks in the archived manifest are no-ops.
5. No lifecycle script runs during archiving.
6. The reported filename is npm's filename, never a guess.
7. The reported identity comes from npm's pack output and matches the
   installed package.
8. Every run cleans up its workspace.
9. Concurrent runs are impossible within one runtime instance.
10. No result is emitted before the tarball bytes are in memory.
11. The core performs no DOM or URL work.

## 11. Acceptance criteria

### Pure behavior (automated with `bun test`)

- An empty package name is rejected.
- Invalid names and protocol specs (`file:`, `workspace:`, `git+…`) are
  rejected.
- A missing or empty version spec becomes `latest`.
- Exact versions, ranges, tags, and scoped names are accepted.
- The generated workspace manifest has the shape in §6.2 and contains exactly
  one dependency.
- Patching sets both bundle fields, sorts and de-duplicates, replaces
  `bundleDependencies: true`, neutralizes all listed hooks, and preserves
  unrelated scripts and fields.
- Pack-output parsing handles a plain JSON array, notices before or after the
  array, and scoped filenames; arbitrary text yields no match.
- Normalization does not mutate caller input.

### Run behavior with a fake runtime

- Stage order is `prepare → install → patch → pack → capture`.
- A nonzero install fails at `install` and includes the exit code and log.
- A nonzero pack fails at `pack`.
- A missing tarball fails at `capture`.
- An identity mismatch fails at `capture`.
- Cleanup runs on success and on failure.
- A second concurrent run is rejected at `prepare`.
- The returned bytes equal the bytes read from the runtime.

### Manual integration checks

- Archive `lodash`, install the archive in an empty project with the registry
  disabled, and `require("lodash")`.
- Archive a scoped package; confirm the filename and offline install both work.
- Archive a package with a `postinstall` fixture that writes a marker; confirm
  the marker is never created during archiving or installation.
- Archive an exact version and a range; confirm the filename and identity
  reflect npm's resolved package.
- Force a failure (unknown package) and confirm stage, log, retry, and cleanup.

## 12. Non-goals and explicit tradeoffs

- **One top-level package per archive.** There is no multi-package bundle
  mode. Users who need several packages produce several archives and install
  them together.
- **Not a dependency resolver.** npm inside WebContainers resolves versions and
  optional dependencies. packy orchestrates and captures.
- **Nested installs are intentional.** They make packing reliable and inflate
  archive size. Correctness of the offline install wins; size optimization is
  out of scope.
- **Ranges are resolved at run time.** Reproducible archives require exact
  versions. The result always reports what was actually packed.
- **No deduplication or hoisting.** The package keeps its own resolved tree.
- **Peer dependencies stay peer dependencies.** They are not bundled; the
  archive keeps the original requirement.
- **No script execution, ever.** Packages that only work via install scripts
  are outside the supported contract.
- **No manifest or dependency-set input.** The core accepts one package
  reference. Importing a project `package.json` belongs to the client, which
  must choose one package for the core.
- **Registry metadata is not core.** Search and version lists belong to the
  picker and must not be on the archive path.

## 13. Relationship to the current implementation

This spec preserves the existing working pipeline: nested install, manifest
patching, `npm pack`, and reading the tarball into memory.

It changes these decisions:

| Current                                            | Spec                                              |
| -------------------------------------------------- | ------------------------------------------------- |
| slim/full user choice                              | removed; every archive is a single-package repack |
| archive may contain several top-level packages     | exactly one top-level package per archive         |
| filename recovered with regexes from stdout        | `npm pack --json`, one directory-listing fallback |
| bundle view owns pipeline and state                | core run plus a state machine on top              |
| archive version derived from package list          | no synthetic identity; npm reports the identity   |
| WebContainer boots at app startup                  | lazy boot on first run                            |
| workspace never removed                            | removed after every run                           |
| unbounded console output                           | capped at 200 KiB                                 |
| download view owns URL lifecycle                   | caller owns Blob/URL; core returns bytes          |
| package.json import feeds the core                 | client selects one package before calling core    |
