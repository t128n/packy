# Review implementation plan

Status: independent review changes implemented; upstream Combobox integration
pending. The branch was fast-forwarded to `b38b5a1` (`chore: add reviews`).

Completed independently: layout and copy refinement, footer cleanup, CI split,
build-failure guidance, download feedback, offline-install caveats, focus
management, unit/browser coverage, and refreshed previews. Still pending: the
upstream Combobox integration and participant usability testing.

Sources:

- `REVIEW.md` — full UI/UX refinement brief
- Inline `<review>` blocks in `.github/workflows/ci.yml` and
  `src/components/app-footer.svelte`
- Current app: `src/App.svelte`, `src/components/*`, `src/lib/core/*`

## 1. Review block inventory

| Location                              | Review                                                                                                                             | Planned resolution                                                                                                                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REVIEW.md:1`                         | Empty `<review></review>` placeholder                                                                                              | No actionable content. Remove the empty marker when the review document is next edited; do not treat it as a requirement.                                                                             |
| `.github/workflows/ci.yml:13`         | Use `ubuntu-slim` to reduce runner cost; refers to the 1-vCPU public runner announcement                                           | Change the CI job to `runs-on: ubuntu-slim`, verify the first run, and remove the review block. Consider the same change for the deploy build job only if the runner is available to this repository. |
| `src/components/app-footer.svelte:21` | Remove “· one package per archive”; investigate the cost of adding it and what should change in `@t128n/ui` to prevent the problem | Keep the note short (`© 2026 Torben Haack`), remove the workflow sentence, and write an upstream `@t128n/ui` proposal for structured footer metadata. See §5.1.                                       |

The empty `REVIEW.md` block is the only unexplained marker; all other review
blocks are covered below.

## 2. Current-state assessment

| Area             | Current state                                                                                              | Gap against the brief                                                                                                                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task column      | `.page.task-column` caps at 45rem (720px)                                                                  | Working at desktop; verify mobile and all three states. Page title and content spacing still need tightening.                                                                                           |
| Package screen   | Page header plus a `Section` titled “Choose a package”; search is an `Input` with plain result buttons     | Redundant heading; search lacks a highlighted result and Arrow Up/Down/Escape handling; persistent “Type at least 3 characters” copy; no combobox/listbox semantics.                                    |
| Package summary  | Name, description, `Change package`, separate selected-version line                                        | Mostly good; needs one coherent summary block and less duplicated version metadata.                                                                                                                     |
| Version selector | `Combobox` with flat labels: `latest tag · x.y.z` and version rows; 300-version cap; custom range/tag mode | Tags and versions are not grouped or labelled clearly enough; requested vs resolved version needs stronger presentation; large-list behavior should be explicit.                                        |
| Primary action   | “Build bundle”                                                                                             | Brief asks for “Create bundle” consistently.                                                                                                                                                            |
| Build state      | Five stages, indeterminate progress, `Not run`, technical details, retry/edit                              | Package target is only in the section description; pending explanation can be more specific; failure classification uses log regexes in the component.                                                  |
| Error state      | Inline `Alert`, retry/edit, exit code, details                                                             | Needs a tested failure taxonomy (invalid input, registry/network, build, download, unknown) and a clearly primary correction action.                                                                    |
| Result state     | “Bundle ready”, name/version, filename, size, download, install command, copy                              | Rename installation section to “Install locally”; move copy adjacent to command; replace “Bundle another package” with “Create another bundle”; offline wording overstates what the archive guarantees. |
| Footer           | `packy`, GitHub, raw short commit, t128n.dev; note includes workflow copy                                  | Remove the note suffix; reduce competing metadata; decide whether the raw commit belongs in the default footer.                                                                                         |
| CI               | `ubuntu-latest`                                                                                            | Use `ubuntu-slim` per review.                                                                                                                                                                           |
| Tests            | 83 core tests; no UI interaction tests                                                                     | Brief requires search, keyboard, version, build, failure, download, copy, responsive, and accessibility coverage.                                                                                       |

## 3. Decisions and trade-offs

### 3.1 Keep the core and the visual language

No changes to the archive pipeline, design tokens, typography, palette, or
component library. Work is limited to layout, copy, interaction state, and
accessibility. `src/lib/core/**` stays framework-free.

### 3.2 Version selector strategy

Preferred path: make the existing `@t128n/ui` `Combobox` meet the brief rather
than building a second combobox in the app. Required upstream capabilities:

- open on input/focus, not only from the trigger;
- an input-change callback so remote package search can drive `items`;
- optional item groups (`Dist-tags`, `Versions`);
- a selected-item label/value distinction;
- documented empty/loading/error behavior;
- a large-list strategy (windowed rendering or a documented cap).

Fallback if an upstream release is not available in time: use `Combobox` for the
version selector with explicit `Dist-tag`/`Version` label prefixes, and implement
one app-local accessible listbox for package search using the WAI-ARIA combobox
pattern. The fallback must not be duplicated in multiple components.

### 3.3 Requested version vs resolved version

Keep the existing distinction explicit:

- `Requested: latest` / `Requested: ^18.0.0`
- `Resolved: 18.3.1` when known from registry metadata
- `Resolved during build` for ranges/tags that npm resolves later

The archive result always shows the actual packed `name@version` from npm; the
UI must not imply that the requested spec is the resolved artifact.

### 3.4 Offline installation accuracy

Do not claim that every archive installs fully offline. The current copy in
`README.md` and the result view says installation works “without registry
access”; this is only true for the dependency tree npm bundled.

The result view and README will state:

- the archive contains the selected package and the dependency tree npm bundled;
- peer dependencies are not bundled;
- lifecycle scripts are intentionally disabled with `--ignore-scripts`;
- peer dependencies, platform binaries, or other external requirements must be
  made available separately;
- verify the archive contents before relying on it for a fully air-gapped
  install.

The install command stays:
`npm install --ignore-scripts ./packages/<archive>.tgz`.

### 3.5 Footer note

Remove “· one package per archive”. A footer note is not the place to explain the
product’s archive semantics; that copy belongs near the build/result action.

Investigation of `@t128n/ui`:

- **Cost of the current API:** `Footer.note` is a plain string rendered in a
  right-aligned `<span>`. It cannot hold structured metadata, links, or a
  separator-aware layout. Using it for workflow copy duplicated product
  semantics, competed with primary content, and wrapped poorly on narrow
  screens.
- **Upstream guidance:** the existing string prop already supports copyright-only
  text; no component API change is required for this review. Add an explicit
  consumer-facing Footer content rule: reserve notes for brief legal/provenance
  context, do not repeat workflow instructions or product constraints there.
  Keep copyright-only stories as positive examples and add a contrasting
  misuse example. Enforce this during application review rather than pretending
  a generic component can reliably validate arbitrary human copy.
- **App change now:** `note="© 2026 Torben Haack"`. Remove the raw commit from
  the visible footer by default; if build provenance is needed, expose it as a
  compact labelled “Build” link or in an upstream `meta` snippet rather than a
  bare hash.

### 3.6 Commit hash visibility

The brief asks to reconsider the raw hash. Plan: remove the bare `b0eac57` link
from the default footer. Keep GitHub and t128n.dev. If provenance remains useful
for deployment debugging, add it back only as `Build <short>` with the full hash
in the link title, after the footer layout is settled. This is a small P2
decision and does not block the workflow changes.

## 4. Workstreams

### 4.0 Upstream design-system work (enabler for P0/P1)

**Goal:** remove the app-level workarounds and keep `@t128n/ui` as the single
component source.

Detailed upstream brief: `COMBOBOX_UPSTREAM.md`.

Tasks:

1. Add `Combobox` support for:
    - `open`/`onOpenChange` and open-on-input/focus;
    - `onInputValueChange` or an equivalent async callback;
    - grouped items with group labels;
    - selected value vs input text;
    - documented empty, loading, and error states;
    - a large-list strategy.
2. Clarify the Footer content guidance in the component reference and stories;
   no new prop is needed for a copyright-only note.
3. Add tests/stories for both changes, bump the package version, and publish.
4. Pin the app to the new version.

If the upstream change is not approved, execute the fallback in §3.2 and record
the trade-off in the PR.

**Acceptance:** package search and version selection are driven by one
design-system combobox; no duplicate keyboard handling exists in Packy.

### 4.1 Layout and information hierarchy (P1, implement first)

**Goal:** one stable 720px task column across search, configuration, build,
failure, and success.

Tasks:

1. Keep `.task-column` at 45rem; verify at 1440, 768, 390, and 320px.
2. Remove the redundant “Choose a package” heading; keep the page title
   “Create an offline bundle” and the short description.
3. Use one vertical rhythm: header, active content, primary action, supporting
   text. Avoid adding a `Section` heading just to repeat the page purpose.
4. Constrain the version control to a sensible form width; keep the package
   search full-width within the task column.
5. Keep the selected package summary and primary action in the same visual group.
6. Preserve the existing navbar and footer structures; remove unnecessary
   borders/cards.
7. Remove repeated status descriptions from `App.svelte` and the section
   descriptions; let the active state own its copy.

**Files:** `src/App.svelte`, `src/app.css`, possibly `src/components/*.svelte`

**Acceptance:** all three states share the same left edge, column width, and
spacing rhythm; no duplicate headings; mobile has no horizontal overflow.

### 4.2 Package search (P0/P1)

**Goal:** the initial screen is heading, description, package search, and
compact popular shortcuts.

Tasks:

1. Change the label to “Package” and the placeholder to “Search npm packages…”.
2. Remove the persistent “Type at least 3 characters” instruction. Show minimum
   length or empty-state copy only when relevant.
3. Render results directly beneath the search field with name and description.
4. Add a visible highlighted result and full keyboard support:
   Arrow Up, Arrow Down, Enter, Escape, Home/End where appropriate.
5. Keep focus predictable when results open/close and after selection.
6. Announce loading, result count, no results, and errors in a polite live
   region.
7. Preserve scoped package names and long names with wrapping.
8. Keep request IDs/abort behavior so stale responses cannot overwrite newer
   searches.
9. Keep popular shortcuts as quiet inline links; remove the “Popular packages”
   heading if it adds no value.
10. Remove the “Choose a package” wrapper once results are a natural extension
    of the field.

**Files:** `src/components/package-picker.svelte` (or split search into a
focused child component), `src/lib/npm-registry.ts` only if response typing
changes.

**Tests:** exact and partial search, scoped names, empty/failed search,
overlapping searches, keyboard selection, Escape, focus return, long names.

### 4.3 Package summary and version configuration (P0)

**Goal:** users know exactly what package and version they are packaging.

Tasks:

1. Keep a compact package summary: name, short description, and secondary
   “Change package”.
2. Present the version selector as one searchable combobox, not as competing
   input patterns.
3. Group/label dist-tags separately from published versions:
    - `Dist-tag · latest → 19.3.1`
    - `Dist-tag · next → 19.3.0-canary…`
    - `Version · 19.3.1 · latest`
4. Show the selected item clearly and keep the selected value visible when the
   list closes.
5. Show requested vs resolved version:
    - requested tag/range;
    - resolved version from registry metadata when known;
    - “resolved during build” otherwise.
6. Keep custom version ranges/tags as an advanced mode, but present it as a
   mode switch rather than a second always-visible field.
7. Validate known-invalid exact versions, unmatched ranges, and invalid tags
   before enabling the build.
8. Keep the 300-version cap with a concise note and a range/tag path for older
   versions; do not render thousands of options.
9. Rename the primary action to “Create bundle” everywhere.
10. Disable the action for incomplete/invalid selections and when
    cross-origin isolation is unavailable.

**Files:** `src/components/package-picker.svelte`, `src/lib/npm-registry.ts`,
`src/lib/core/normalize-input.ts` (range acceptance already fixed),
`src/lib/core/normalize-input.test.ts`.

**Tests:** exact version, range, dist-tag, scoped package, invalid exact
version, unmatched range, invalid tag, cap behavior, large packument.

### 4.4 Build state and recovery (P0)

**Goal:** build progress is predictable and failures are recoverable without
losing configuration.

Tasks:

1. Keep a compact package target visible in build, error, and result states.
2. Keep the five stages but use user-facing operation text:
    - “Preparing a workspace”
    - “Downloading the package and dependencies”
    - “Preparing files for offline installation”
    - “Creating the archive”
    - “Reading the completed archive”
3. Do not invent percentages; keep one indeterminate indicator.
4. Mark stages after a failure “Not run”, not “Waiting”.
5. Keep technical npm output in an expandable “Technical details” section.
6. Prevent duplicate submissions at both the UI and run boundary; test a rapid
   double activation.
7. Extract failure classification into a pure helper:
    - invalid input/version;
    - registry/network;
    - build/install/pack;
    - download;
    - unknown.
8. Use that classification for:
    - the primary correction action (change version/package vs retry);
    - actionable copy;
    - an explicit unknown-cause message when the cause cannot be determined.
9. Preserve the package/version configuration when returning from an error;
   only “Create another bundle” from success resets the picker.
10. Handle download failures inline near the download action.

**Files:** `src/App.svelte`, `src/components/run-view.svelte`,
`src/components/result-view.svelte`, new pure helper under `src/lib/ui/` or
`src/lib/core/` if it has no DOM dependency, tests.

### 4.5 Bundle-ready state and installation truth (P0/P1)

**Goal:** the result answers: what was created, where to download it, and how to
install it.

Tasks:

1. Keep “Bundle ready” as the result heading.
2. Present a compact artifact summary:
    - package name and exact resolved version;
    - archive filename;
    - compressed archive size.
3. Make “Download bundle” the single primary action; include the filename only
   if it remains readable.
4. Rename the installation section to “Install locally”.
5. Put the copy action inside or immediately adjacent to the command block.
6. Use “Create another bundle” as the secondary action.
7. Generate the command from `result.filename`; do not duplicate filename
   formatting logic.
8. Correct the offline copy:
    - state what is bundled;
    - state that peer dependencies are not bundled;
    - state that `--ignore-scripts` disables lifecycle scripts;
    - state what may still be required for a fully air-gapped install.
9. Update `README.md` with the same caveats.
10. Keep copy feedback inline and announced politely.

**Files:** `src/components/result-view.svelte`, `src/App.svelte`, `README.md`.

**Verification:** inspect the actual tarball contents for a package with
transitive dependencies and a package with peer dependencies; confirm the
installation command against the produced filename.

### 4.6 Footer, chrome, CI, and review cleanup (P2)

Tasks:

1. Remove “· one package per archive” from the footer note.
2. Keep copyright text short; remove the bare commit link by default (see §3.6).
3. Remove the `<review>` block after resolving it.
4. Change `.github/workflows/ci.yml` to `runs-on: ubuntu-slim`; remove the
   review block. Verify the first CI run.
5. Consider `ubuntu-slim` for the deploy build job, but only after confirming
   availability for this repository.
6. Remove the empty `<review></review>` marker in `REVIEW.md` only if editing
   that document is desired; it has no implementation content.
7. Run formatter after the remote footer indentation change.

### 4.7 Test and QA workstream

Existing tests cover the core. Add/expand:

**Pure/unit tests**

- version option labels and tag/version grouping;
- requested vs resolved semantics;
- version validation (exact, range, tag, invalid);
- failure classification and copy;
- install command generation;
- footer note/commit omission if a helper is introduced.

**Browser tests (Playwright, if approved as a dev dependency)**

- search and select a package;
- scoped package search;
- keyboard navigation and Escape;
- results/loading/empty announcements;
- version selection, dist-tag resolution, custom range;
- invalid version blocks the build;
- rapid double click does not start two runs;
- successful build downloads the expected filename;
- failure state offers retry/edit and preserves configuration;
- copy command feedback;
- mobile width and no horizontal overflow;
- basic accessibility (roles, names, focus rings).

If Playwright is not added, use a small `bun:test` suite for pure helpers plus
manual browser checks, and document the gap.

**Manual verification**

- desktop and mobile screenshots for search, selection, build, error, success;
- `lodash`, a scoped package, an exact version, a range, and a dist-tag;
- archive contents for a package with dependencies;
- peer-dependency caveat;
- offline install in an empty project with registry access disabled;
- invalid version and network failure paths;
- no console errors, no horizontal overflow, visible focus.

## 5. Sequencing

### Milestone 1 — Hierarchy and copy (0.5–1 day)

- 720px consistency, remove redundant heading, labels/placeholders, primary
  action rename, footer note, CI runner.
- Gate: screenshots at desktop/mobile; no workflow behavior changes.

### Milestone 2 — Search and version interaction (1.5–2 days)

- Upstream combobox decision/implementation; package search keyboard/listbox;
  version groups and requested/resolved presentation; validation.
- Gate: keyboard and async tests; scoped packages; large version history.

### Milestone 3 — Build, failure, and result (1.5–2 days)

- Target summary, stage copy, duplicate-submission guard, failure classifier,
  retry/edit, result composition, command/copy, offline truth.
- Gate: successful build, invalid version, network/build failure, retry without
  configuration loss.

### Milestone 4 — Test hardening and polish (1 day)

- Component/browser tests, accessibility pass, responsive pass, screenshots.
- Gate: `bun run test`, `bun run build`, manual matrix complete.

Upstream design-system work, if required for the combobox or footer, adds about
0.5–1 day and must be released before the app pin is updated.

## 6. Files likely to change

| File                                   | Change                                                        |
| -------------------------------------- | ------------------------------------------------------------- |
| `src/App.svelte`                       | Layout, state summary, copy, failure actions, reset semantics |
| `src/app.css`                          | 720px layout, any app-owned spacing only                      |
| `src/components/package-picker.svelte` | Search/selection, version semantics, validation               |
| `src/components/run-view.svelte`       | Progress copy, Not run, failure classification                |
| `src/components/result-view.svelte`    | Artifact summary, install/copy composition, offline caveats   |
| `src/components/app-footer.svelte`     | Note and commit visibility                                    |
| `src/lib/npm-registry.ts`              | Only if types/response normalization need changes             |
| `src/lib/core/normalize-input.test.ts` | Range acceptance tests already added                          |
| new UI helper + tests                  | Failure classification, install command, version labels       |
| `README.md`                            | Offline-install accuracy                                      |
| `.github/workflows/ci.yml`             | `ubuntu-slim`                                                 |
| `REVIEW.md`                            | Optionally remove empty review marker                         |
| `docs/pr/*.png`                        | Refresh after implementation                                  |

## 7. Risks and open questions

1. **Upstream `Combobox` timing.** Preferred path requires a `@t128n/ui` change
   and release. If that is not available, the app fallback adds an app-local
   listbox; it must be isolated and tested.
2. **Offline correctness.** The exact bundled tree and peer behavior need
   verification with real tarballs. Do not claim “fully offline” until the
   archive and install command prove it.
3. **Commit hash visibility.** Proposed removal; confirm whether deployment
   provenance must remain visible.
4. **Version list size.** 300 visible versions plus a range/tag path is the
   current compromise; a virtualized combobox would allow older versions
   without the cap.
5. **Test tooling.** Adding Playwright is a new dev dependency; the brief asks
   for interaction coverage, so this is a scope decision.
6. **`ubuntu-slim` availability.** Confirm the runner label and repository
   permissions on the first CI run.
7. **Footer guidance.** A generic string prop cannot reliably enforce content
   placement; documentation and consumer review must apply the rule.

## 8. Definition of done

- [ ] All applicable `<review>` blocks are resolved and removed.
- [ ] All workflow states share the 720px column, alignment, and spacing.
- [ ] Redundant headings and persistent instructional copy are removed.
- [ ] Package search supports keyboard selection, highlighted results, loading,
      empty, error, scoped names, and stale-response protection.
- [ ] Version selection supports search, dist-tags with resolved versions,
      exact versions, ranges, large histories, and clear requested/resolved copy.
- [ ] Invalid versions are blocked before build with a specific message.
- [ ] Build state shows the selected target, meaningful operation text, Not run
      stages, one indeterminate indicator, and collapsed technical details.
- [ ] Duplicate submissions are prevented.
- [ ] Errors explain the cause or explicitly say the cause is unknown, and offer
      the right retry/change action while preserving configuration.
- [ ] Success shows name, resolved version, filename, compressed size, one
      primary download action, and “Install locally” with an adjacent copy action.
- [ ] Offline-install wording is technically accurate and documented in README.
- [ ] Footer and CI reviews are addressed.
- [ ] `bun run test` and `bun run build` pass.
- [ ] Desktop/mobile screenshots and accessibility checks are refreshed.
