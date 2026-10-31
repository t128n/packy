import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import Icons from "unplugin-icons/vite";
import { defineConfig } from "vite";

const gitCommitHash = execSync("git rev-parse HEAD").toString().trim();

const crossOriginHeaders = {
	"Cross-Origin-Opener-Policy": "same-origin",
	"Cross-Origin-Embedder-Policy": "require-corp",
};

// https://vite.dev/config/
export default defineConfig({
	define: {
		__GIT_COMMIT_HASH__: JSON.stringify(gitCommitHash),
	},
	resolve: {
		alias: {
			"~": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	plugins: [svelte(), Icons({ compiler: "svelte" })],
	server: {
		headers: crossOriginHeaders,
	},
	preview: {
		headers: crossOriginHeaders,
	},
});
