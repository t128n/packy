import { execSync } from "node:child_process";

import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const gitCommitHash = execSync("git rev-parse HEAD").toString().trim();

// https://vite.dev/config/
export default defineConfig({
	define: {
		__GIT_COMMIT_HASH__: JSON.stringify(gitCommitHash),
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [vue()],
	server: {
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin",
			"Cross-Origin-Embedder-Policy": "require-corp",
		},
	},
	preview: {
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin",
			"Cross-Origin-Embedder-Policy": "require-corp",
		},
	},
});
