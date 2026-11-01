import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	fullyParallel: false,
	use: { baseURL: "http://127.0.0.1:4173", ...devices["Desktop Chrome"] },
	webServer: {
		command: "bun run dev --host 127.0.0.1 --port 4173 --strictPort",
		url: "http://127.0.0.1:4173",
		reuseExistingServer: !process.env.CI,
		timeout: 60_000,
	},
});
