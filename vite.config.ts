import { fileURLToPath } from "node:url";

import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

const crossOriginHeaders = {
	"Cross-Origin-Opener-Policy": "same-origin",
	"Cross-Origin-Embedder-Policy": "require-corp",
};

// https://vite.dev/config/
export default defineConfig({
	resolve: {
		alias: {
			"~": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	plugins: [svelte()],
	server: {
		headers: crossOriginHeaders,
	},
	preview: {
		headers: crossOriginHeaders,
	},
});
