# `@t128n/ui` Combobox fix — implementation instructions

Status: implemented in `@t128n/ui@0.2.0` (upstream PR #72, release PR #71).

Target repository: `github.com/t128n/design`
Target component: `packages/ui/src/lib/Combobox.svelte`
Package: `@t128n/ui`

This is an upstream change, not a Packy-only workaround. Packy currently has to
use an `Input` plus custom result rows for package search because the component
cannot open on input or drive an async result set. Fix the component once, then
use it for both package search and version selection.

## 1. Current defects

Read `packages/ui/src/lib/Combobox.svelte` on `origin/main` first. The current
component:

1. **Does not open on typing.** `open` is never bound, and the input handler only
   sets `inputValue`. Users must click the chevron trigger before results appear.
2. **Does not forward `inputValue` to `Combobox.Root`.** Bits UI maintains the
   displayed input value internally, so selecting an item and later updating
   `inputValue` can leave the field and the selected value out of sync.
3. **Cannot support async search.** `filteredItems` always filters `items`
   client-side. There is no callback for “the query changed, fetch new items.”
4. **Cannot render grouped options.** Dist-tags and exact versions cannot be
   separated into labelled groups, even though Bits UI exports
   `Combobox.Group` and `Combobox.GroupHeading`.
5. **Has no interaction coverage.** `forms.test.ts` checks label/error wiring
   only; there is no test for opening, keyboard selection, filtering, grouping,
   async items, or selected-label display.
6. **Has hardcoded empty copy** (“No results”) and no loading state.

Do not rewrite the component from scratch and do not introduce another
combobox library. Fix the existing wrapper around Bits UI `Combobox`.

## 2. Target API

Keep the existing props backward compatible. Extend them additively:

```ts
export type ComboboxItem = {
	value: string;
	label: string;
	/** Optional secondary line, useful for package descriptions. */
	description?: string;
	disabled?: boolean;
	/** Optional group name, e.g. "Dist-tags" or "Versions". */
	group?: string;
};

type Props = {
	items: ComboboxItem[];

	/** Optional explicit group order. Derived from item.group when omitted. */
	groups?: string[];

	/** Bindable selected value. */
	value?: string;
	onValueChange?: (value: string) => void;

	/** Bindable input text; also used as the client-side filter query. */
	inputValue?: string;
	onInputValueChange?: (value: string) => void;

	/** Bindable popover state. */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;

	/** Open when the user types. Default: true. */
	openOnInput?: boolean;

	/** Open when the input receives focus. Default: false. */
	openOnFocus?: boolean;

	/**
	 * "client" filters items by label as the user types.
	 * "manual" renders items as supplied; use with onInputValueChange for async.
	 * Default: "client".
	 */
	filterMode?: "client" | "manual";

	/** Keep the selected item’s label in the input after selection. Default: true. */
	syncInputOnSelect?: boolean;

	/** Shown when the list is empty. Default: "No results". */
	emptyLabel?: string;

	/** Show a loading row instead of the empty row. Default: false. */
	loading?: boolean;

	/** Loading row copy. Default: "Loading…". */
	loadingLabel?: string;

	label: string;
	description?: string;
	placeholder?: string;
	error?: string;
	disabled?: boolean;
	required?: boolean;
	id?: string;
	name?: string;
	class?: string;
};
```

All existing call sites must continue to compile and behave the same with the
new props omitted.

## 3. Implementation

### 3.1 Props and state

In `Combobox.svelte`, add the new props with defaults:

```ts
let {
	items,
	groups,
	value = $bindable<string | undefined>(undefined),
	onValueChange,
	inputValue = $bindable(""),
	onInputValueChange,
	open = $bindable(false),
	onOpenChange,
	openOnInput = true,
	openOnFocus = false,
	filterMode = "client",
	syncInputOnSelect = true,
	emptyLabel = "No results",
	loading = false,
	loadingLabel = "Loading…",
	label,
	description,
	placeholder = "Search...",
	error,
	disabled = false,
	required = false,
	id,
	name,
	class: className = "",
}: Props = $props();
```

Keep the existing `Field`, `Icon`, `MergeClasses`, and `VisuallyHidden` usage.

### 3.2 Filtering and grouping

Replace the single `filteredItems` derivation with:

```ts
const normalizedQuery = $derived(inputValue.trim().toLowerCase());

const filteredItems = $derived.by(() => {
	if (filterMode === "manual") {
		return items;
	}

	if (normalizedQuery.length === 0) {
		return items;
	}

	return items.filter((item) =>
		item.label.toLowerCase().includes(normalizedQuery),
	);
});

const groupOrder = $derived(
	groups ??
		Array.from(
			new Set(
				items
					.map((item) => item.group)
					.filter((group): group is string => Boolean(group)),
			),
		),
);

const groupedItems = $derived(
	groupOrder
		.map((group) => ({
			group,
			items: filteredItems.filter((item) => item.group === group),
		}))
		.filter((entry) => entry.items.length > 0),
);

const ungroupedItems = $derived(filteredItems.filter((item) => !item.group));

const hasGroups = $derived(groupedItems.length > 0);
const hasAnyItems = $derived(
	groupedItems.length > 0 || ungroupedItems.length > 0,
);
```

Use `filterMode="manual"` when the caller supplies already-filtered async
results. Keep passing the full flat `items` array to `Combobox.Root`; Bits UI
uses it for typeahead and form autofill.

### 3.3 Bind open and input value

Pass `open` and `inputValue` to `Combobox.Root`:

```svelte
<Combobox.Root
	type="single"
	bind:value
	bind:open
	{inputValue}
	{items}
	{disabled}
	{required}
	{name}
	{onOpenChange}
	{onValueChange}
>
```

Note: if `inputValue` is not a bindable prop on the Bits UI root version in use,
pass it as a one-way controlled prop and keep the wrapper’s external `inputValue`
as the source of truth. Verify this with the test in §4.3 before finalizing.

If Bits UI does not update the wrapper’s external `inputValue` when the user
selects an item, update it in the wrapper’s `onValueChange` handler:

```ts
function handleValueChange(next: string | undefined) {
	if (syncInputOnSelect) {
		const selected = items.find((item) => item.value === next);
		inputValue = selected?.label ?? "";
	}

	onValueChange?.(next);
}
```

Use `handleValueChange` instead of forwarding `onValueChange` directly. Keep
`syncInputOnSelect` optional so an async search caller can keep its query text.

### 3.4 Open on input/focus

Update `Combobox.Input`:

```svelte
<Combobox.Input
	id={state.id}
	class="combobox-input"
	{placeholder}
	oninput={(event) => {
		const next = event.currentTarget.value;

		inputValue = next;
		onInputValueChange?.(next);

		if (!disabled && openOnInput) {
			open = true;
		}
	}}
	onfocus={() => {
		if (!disabled && openOnFocus) {
			open = true;
		}
	}}
	aria-labelledby={state.labelId}
	aria-required={state.required ? "true" : undefined}
	aria-invalid={state.invalid ? "true" : undefined}
	aria-describedby={state.describedBy}
/>
```

Expected behavior:

- Typing opens the list without requiring a trigger click.
- Focus alone does not open unless `openOnFocus` is true.
- Escape is handled by Bits UI and must close the list without clearing the
  selected value.
- Arrow Up/Down move the highlighted item; Enter selects; Tab leaves the field.
- Focus remains on the input while navigating; options are not tab stops.
- Selecting an item closes the list and leaves the selected label in the input.

Do not add custom keydown handlers for Arrow/Enter/Escape; Bits UI owns the
combobox behavior. Only add handlers for component-level concerns.

### 3.5 Render groups and descriptions

Replace the flat item loop with grouped rendering. Keep the same checkmark and
disabled styling.

```svelte
<Combobox.Viewport class="t128n-combobox-viewport">
	{#if loading}
		<div class="empty" role="status">{loadingLabel}</div>
	{:else if !hasAnyItems}
		<div class="empty" role="status">{emptyLabel}</div>
	{:else}
		{#if hasGroups}
			{#each groupedItems as group (group.group)}
				<Combobox.Group>
					<Combobox.GroupHeading class="group-label">
						{group.group}
					</Combobox.GroupHeading>
					{#each group.items as item (item.value)}
						{@render option(item)}
					{/each}
				</Combobox.Group>
			{/each}
		{/if}
		{#each ungroupedItems as item (item.value)}
			{@render option(item)}
		{/each}
	{/if}
</Combobox.Viewport>
```

Define the reusable snippet inside the component:

```svelte
{#snippet option(item: ComboboxItem)}
	<Combobox.Item
		value={item.value}
		label={item.label}
		disabled={item.disabled}
		class="combobox-item"
	>
		{#snippet children({ selected })}
			<span class="check" aria-hidden="true">
				{#if selected}<Icon icon={CheckIcon} class="check-icon" />{/if}
			</span>
			<span class="item-copy">
				<span class="item-label">{item.label}</span>
				{#if item.description}
					<span class="item-description">{item.description}</span>
				{/if}
			</span>
		{/snippet}
	</Combobox.Item>
{/snippet}
```

If `Combobox.Group`/`GroupHeading` is unavailable in the pinned Bits UI version,
stop and report the version mismatch rather than faking groups with styled
`div`s. The installed version exports both.

### 3.6 Styling

Use only existing tokens:

- `.group-label`: `font-size: var(--font-size-caption)`, `font-weight:
var(--font-weight-medium)`, `line-height: var(--line-height-caption)`,
  `color: var(--color-text-muted)`, padding using `--space-*`.
- `.item-copy`: `display: grid; gap: var(--space-xs); min-width: 0;`
- `.item-description`: `color: var(--color-text-secondary)`, `font-size:
var(--font-size-body-sm)`, `line-height: var(--line-height-body)`, wrap or
  truncate safely for long package names/descriptions.
- Loading/empty row: keep the existing `.empty` styling; use `role="status"`.
- Keep the existing focus ring and listbox highlight treatment. Do not add a
  second focus style.
- No raw hex, px, or new color tokens. Follow `AGENTS.md` and `DESIGN.md`.

### 3.7 Accessibility

- Preserve the `Field` label/description/error wiring.
- Keep the trigger’s `VisuallyHidden` “Open options” label.
- Do not set `outline: none` without the existing `:focus-within` replacement.
- Keep `aria-invalid`, `aria-required`, and `aria-describedby` from `FieldState`.
- Loading and empty text should be announced politely; `role="status"` is
  sufficient. Do not announce every keystroke.
- Long scoped names and version strings must wrap or truncate without horizontal
  overflow. The `.item-copy` must have `min-width: 0`.
- Test with keyboard only and at a narrow viewport.

## 4. Tests

Use the existing Vitest + Testing Library setup. Add `packages/ui/tests/combobox.test.ts`
or extend `forms.test.ts`; prefer a focused test file.

Required tests:

1. **Label/field wiring** (existing test stays green).
2. **Opens on input**: render with items, type a query, assert the listbox is
   visible and `aria-expanded="true"`.
3. **Client filtering**: type a partial label; only matching options remain.
4. **`onInputValueChange`** receives every typed value.
5. **Keyboard navigation**: Arrow Down highlights the first/second item, Enter
   selects it, and `onValueChange` is called once.
6. **Escape**: closes the list, returns focus to the input, and keeps the value.
7. **Selected label**: after selection, the input displays the selected item’s
   label (or the app-provided value when `syncInputOnSelect={false}`).
8. **Async/manual mode**: with `filterMode="manual"`, external item updates are
   rendered without client-side filtering; `onInputValueChange` drives the
   caller’s fetch.
9. **Grouped items**: group headings render in `groups` order; empty groups do
   not render; ungrouped items render after groups.
10. **Descriptions**: item descriptions render and do not become the selected
    label.
11. **Loading/empty**: `loading` shows the loading row; no items shows
    `emptyLabel`.
12. **Disabled/required/error** remain correct.
13. **`openOnFocus`**: false by default; true opens on focus.
14. **`onOpenChange`** fires when typing opens the list and when selection closes
    it.
15. **No duplicate selection** from a single Enter keypress.

Use `userEvent` for typing and keyboard interaction. Clean up portals between
tests if the test setup does not already do so.

## 5. Storybook and docs

Update `packages/ui/src/stories/Combobox.stories.svelte` with stories:

- `Default` (existing)
- `With value` (existing; verify selected label)
- `Open on input` (shows results after typing)
- `Grouped` (dist-tags + versions, using the new `group`/`groups` props)
- `Async results` (manual filtering, loading state)
- `Empty` (no items)
- `With error` / `Disabled` (existing)

Update `packages/ui/docs/components.mdx` Combobox section:

- Props list and defaults.
- Explain `filterMode="manual"` and `onInputValueChange`.
- Explain group ordering and `description`.
- Update the “Not for” line only if behavior actually changes.
- Add an example with groups and async search.

Follow the repository’s R48 rules: every public prop/behavior should have a
story, a real use or a documented exception, and a not-for note.

## 6. Packy consumption examples

Package search:

```svelte
<Combobox
	label="Package"
	placeholder="Search npm packages…"
	items={searchItems}
	bind:inputValue={query}
	onInputValueChange={scheduleSearch}
	filterMode="manual"
	openOnFocus
	loading={searching}
	emptyLabel={`No packages found for “${query}”.`}
	onValueChange={selectPackage}
/>
```

Version selection with groups:

```svelte
<Combobox
	label="Version"
	items={[
		{ value: "latest", label: "latest → 4.18.1", group: "Dist-tags" },
		{ value: "4.18.1", label: "4.18.1", description: "latest", group: "Versions" },
		{ value: "4.17.21", label: "4.17.21", group: "Versions" },
	]}
	groups={["Dist-tags", "Versions"]}
	value={requestedVersion}
	onValueChange={selectVersion}
	syncInputOnSelect
/>
```

Keep the requested value and the resolved package version separate in Packy’s
surrounding summary. The combobox supplies selection; it must not imply that a
dist-tag is an immutable version.

## 7. Release and consumption

1. Add a changeset with `bun run changeset`. Use a **minor** bump for the
   additive API and behavior changes (`openOnInput` default, grouped items,
   async callback).
2. Run from the design repository root:
    ```sh
    bun run test
    bun run test:storybook
    bun run build
    bun run verify
    bun run build-storybook
    ```
3. Fix all failures before publishing.
4. Publish through the existing npm OIDC workflow; do not add tokens.
5. In Packy, update the exact `@t128n/ui` pin and replace the custom package
   search list with the upgraded `Combobox`.
6. Verify Packy with:
    - package search typing and keyboard selection;
    - scoped package names;
    - dist-tag and grouped version selection;
    - async result updates and loading/empty states;
    - narrow viewport and keyboard-only use.

## 8. Acceptance checklist

- [ ] Typing opens the option list; no trigger click required.
- [ ] Arrow Up/Down, Enter, Escape, and Tab behave like a standard combobox.
- [ ] Selected value and selected label stay in sync.
- [ ] `onInputValueChange` supports async result sets.
- [ ] `filterMode="manual"` does not client-filter supplied items.
- [ ] Dist-tags and versions can be rendered in labelled groups.
- [ ] Item descriptions render and do not replace the selected label.
- [ ] Loading, empty, error, disabled, and required states are correct.
- [ ] Existing Combobox call sites and tests still pass.
- [ ] Storybook stories cover the new behavior.
- [ ] `components.mdx` documents the new props and async pattern.
- [ ] Changeset is present and the package is released.
- [ ] Packy switches from its custom search list to the upgraded component.

## 9. Non-goals

- Do not change the design language, tokens, or typography.
- Do not add a second combobox library or custom keyboard handling.
- Do not add multi-select, free-text creation, or remote fetching inside
  `@t128n/ui`; async fetching stays with the caller.
- Do not change `Select`, `Command`, or other components as part of this fix.
