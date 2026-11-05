import { expect, test } from "@playwright/test";

const RESOLVED_VERSION = /Currently points to 2\.0\.0/;
const UNPUBLISHED = /not published/;
const REQUESTED = /Requested: latest/;
const REQUESTED_NEXT = /Requested: next/;
const NEXT_RESOLVED = /Currently points to 3\.0\.0-beta\.1/;
const REQUESTED_ONE = /Requested: 1\.0\.0/;
const NEW_RESULT = /new-result/;
const OLD_RESULT = /old-result/;
const EXAMPLE_RESULT = /@scope\/example/;

const metadata = {
	name: "@scope/example",
	description: "Example package",
	"dist-tags": { latest: "2.0.0", next: "3.0.0-beta.1" },
	versions: {
		"1.0.0": { name: "@scope/example", version: "1.0.0" },
		"2.0.0": { name: "@scope/example", version: "2.0.0" },
		"3.0.0-beta.1": { name: "@scope/example", version: "3.0.0-beta.1" },
	},
};

test.beforeEach(async ({ page }) => {
	await page.route("https://registry.npmjs.org/**", async (route) => {
		const url = new URL(route.request().url());
		if (url.pathname.includes("/-/v1/search")) {
			await route.fulfill({
				json: {
					objects: [
						{
							package: {
								name: metadata.name,
								version: "2.0.0",
								description: metadata.description,
							},
						},
					],
				},
			});
		} else {
			await route.fulfill({ json: metadata });
		}
	});
	await page.goto("/");
});

test("search, keyboard selection and version validation", async ({ page }) => {
	const search = page.getByLabel("Package", { exact: true });
	await search.fill("@scope/example");
	await search.press("Enter");
	await expect(
		page.getByRole("heading", { name: "@scope/example" }),
	).toBeVisible();
	await expect(page.getByText(RESOLVED_VERSION)).toBeVisible();
	await page.getByText("Advanced options").click();
	await page
		.getByRole("button", { name: "Use a version range or tag" })
		.click();
	const version = page.getByLabel("Version specification");
	await version.fill("99.99.99");
	await expect(page.getByText(UNPUBLISHED)).toBeVisible();
	await expect(
		page.getByRole("button", { name: "Create bundle" }),
	).toBeDisabled();
	await version.fill("^1.0.0");
	await expect(
		page.getByRole("button", { name: "Create bundle" }),
	).toBeEnabled();
});

test("version selector groups dist-tags and versions", async ({ page }) => {
	await selectFixture(page);
	const version = page.getByLabel("Version", { exact: true });
	await expect(version.locator("optgroup")).toHaveCount(2);
	await version.selectOption("next");
	await expect(page.getByText(REQUESTED_NEXT)).toBeVisible();
	await expect(page.getByText(NEXT_RESOLVED)).toBeVisible();
	await version.selectOption("1.0.0");
	await expect(page.getByText(REQUESTED_ONE)).toBeVisible();
});

test("mobile layout and footer stay focused", async ({ page }) => {
	await page.setViewportSize({ width: 320, height: 720 });
	await expect(
		page.getByRole("heading", { name: "Create an offline npm bundle" }),
	).toBeVisible();
	await expect(page.locator("footer")).toContainText("© 2026 Torben Haack");
	await expect(page.locator("footer")).not.toContainText(
		"one package per archive",
	);
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= innerWidth,
		),
	).toBe(true);
});

test("no search results explains how to continue", async ({ page }) => {
	await page.unrouteAll({ behavior: "wait" });
	await page.route("https://registry.npmjs.org/**", async (route) => {
		if (route.request().url().includes("/-/v1/search")) {
			await route.fulfill({ json: { objects: [] } });
		} else {
			await route.fulfill({ status: 404, json: { error: "Not found" } });
		}
	});
	await page.getByLabel("Package", { exact: true }).fill("missing-package");
	await expect(
		page.getByText(
			'No packages found for "missing-package". Check the spelling and try again.',
		),
	).toBeVisible();
});

test("an older search response cannot replace newer results", async ({
	page,
}) => {
	await page.unrouteAll({ behavior: "wait" });
	await page.route("https://registry.npmjs.org/**", async (route) => {
		const query = new URL(route.request().url()).searchParams.get("text");
		if (query === "older") {
			await new Promise((resolve) => setTimeout(resolve, 1200));
		}
		await route.fulfill({
			json: {
				objects: [
					{
						package: {
							name:
								query === "older" ? "old-result" : "new-result",
							version: "1.0.0",
						},
					},
				],
			},
		});
	});
	const search = page.getByLabel("Package", { exact: true });
	await search.fill("older");
	await page.waitForTimeout(400);
	await search.fill("newer");
	await expect(page.getByRole("button", { name: NEW_RESULT })).toBeVisible();
	await page.waitForTimeout(1300);
	await expect(page.getByRole("button", { name: OLD_RESULT })).toHaveCount(0);
});

const fakeRuntime = `
export function createWebContainerRuntime() {
  const files = new Map();
  return {
    async mount(entries) { for (const entry of entries) files.set(entry.path, entry.contents); },
    async exec(command, args, options) {
      window.__packyCommands = (window.__packyCommands || 0) + 1;
      if (args[0] === 'install') {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (window.__failInstall) { options.onOutput?.('npm error code ETARGET\\n'); return { exitCode: 1 }; }
        files.set(options.cwd + '/node_modules/@scope/example/package.json', JSON.stringify({name:'@scope/example',version:'2.0.0'}));
        return {exitCode:0};
      }
      files.set(options.cwd + '/scope-example-2.0.0.tgz', new Uint8Array([1,2,3]));
      options.onOutput?.(JSON.stringify([{name:'@scope/example',version:'2.0.0',filename:'scope-example-2.0.0.tgz'}]));
      return {exitCode:0};
    },
    async readText(path) { if (!files.has(path)) throw Error('missing'); return files.get(path); },
    async writeText(path, contents) { files.set(path,contents); },
    async readBinary(path) { if (!files.has(path)) throw Error('missing'); return files.get(path); },
    async list() { return []; },
    async remove(path) { for (const key of files.keys()) if (key.startsWith(path + '/')) files.delete(key); }
  };
}`;

async function selectFixture(page: import("@playwright/test").Page) {
	await page.getByLabel("Package", { exact: true }).fill("@scope/example");
	await page.getByRole("button", { name: EXAMPLE_RESULT }).first().click();
	await expect(
		page.getByRole("heading", { name: "@scope/example" }),
	).toBeVisible();
}

test("build, download, copy and reset", async ({ page, context }) => {
	await page.route("**/src/lib/runtime/webcontainer.ts*", (route) =>
		route.fulfill({ contentType: "text/javascript", body: fakeRuntime }),
	);
	await context.grantPermissions(["clipboard-read", "clipboard-write"]);
	await page.reload();
	await selectFixture(page);
	await page
		.getByRole("button", { name: "Create bundle" })
		.evaluate((button: HTMLButtonElement) => {
			button.click();
			button.click();
		});
	await expect(
		page.getByRole("heading", { name: "Bundle ready" }),
	).toBeVisible();
	await expect(page.locator(".workflow-focus")).toBeFocused();
	expect(
		await page.evaluate(
			() =>
				(window as unknown as { __packyCommands: number })
					.__packyCommands,
		),
	).toBe(2);
	await expect(
		page.getByText("@scope/example@2.0.0", { exact: true }),
	).toBeVisible();
	await expect(
		page.getByText("scope-example-2.0.0.tgz", { exact: true }),
	).toBeVisible();
	await expect(
		page.getByText(
			"npm install --ignore-scripts ./packages/scope-example-2.0.0.tgz",
		),
	).toBeVisible();
	await page.getByRole("button", { name: "Copy command" }).click();
	await expect(page.getByText("Copied", { exact: true })).toBeVisible();
	expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
		"scope-example-2.0.0.tgz",
	);
	const download = page.waitForEvent("download");
	await page.getByRole("button", { name: "Download bundle" }).click();
	expect((await download).suggestedFilename()).toBe(
		"scope-example-2.0.0.tgz",
	);
	await page.evaluate(() => {
		HTMLAnchorElement.prototype.click = () => {
			throw new Error("blocked");
		};
	});
	await page.getByRole("button", { name: "Download bundle" }).click();
	await expect(
		page.getByText(
			"The download could not be started. Check your browser’s download settings and try again.",
		),
	).toBeVisible();
	await page.getByRole("button", { name: "Create another bundle" }).click();
	await expect(page.getByLabel("Package", { exact: true })).toBeFocused();
});

test("failed build preserves configuration and supports retry", async ({
	page,
}) => {
	await page.route("**/src/lib/runtime/webcontainer.ts*", (route) =>
		route.fulfill({ contentType: "text/javascript", body: fakeRuntime }),
	);
	await page.addInitScript(() => {
		(window as unknown as { __failInstall: boolean }).__failInstall = true;
	});
	await page.reload();
	await selectFixture(page);
	await page.getByRole("button", { name: "Create bundle" }).click();
	await expect(
		page.getByText(
			"This version is not available on npm. Choose another version.",
		),
	).toBeVisible();
	await expect(page.locator(".workflow-focus")).toBeFocused();
	await expect(page.getByText("Not run").first()).toBeVisible();
	await page.getByRole("button", { name: "Edit package or version" }).click();
	await expect(
		page.getByRole("heading", { name: "@scope/example" }),
	).toBeVisible();
	await expect(page.getByText(REQUESTED)).toBeVisible();
	await page.evaluate(() => {
		(window as unknown as { __failInstall: boolean }).__failInstall = false;
	});
	await page.getByRole("button", { name: "Create bundle" }).click();
	await expect(
		page.getByRole("heading", { name: "Bundle ready" }),
	).toBeVisible();
});

test("a failed build can be retried without losing the selection", async ({
	page,
}) => {
	await page.route("**/src/lib/runtime/webcontainer.ts*", (route) =>
		route.fulfill({ contentType: "text/javascript", body: fakeRuntime }),
	);
	await page.addInitScript(() => {
		(window as unknown as { __failInstall: boolean }).__failInstall = true;
	});
	await page.reload();
	await selectFixture(page);
	await page.getByRole("button", { name: "Create bundle" }).click();
	await expect(
		page.getByText(
			"This version is not available on npm. Choose another version.",
		),
	).toBeVisible();
	await page.evaluate(() => {
		(window as unknown as { __failInstall: boolean }).__failInstall = false;
	});
	await page.getByRole("button", { name: "Retry" }).click();
	await expect(
		page.getByRole("heading", { name: "Bundle ready" }),
	).toBeVisible();
});
