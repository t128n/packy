import { execSync } from "node:child_process";

import ui from "@nuxt/ui/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import svgLoader from "vite-svg-loader";

const gitCommitHash = execSync("git rev-parse HEAD").toString().trim();

// https://vite.dev/config/
export default defineConfig({
	define: {
		__GIT_COMMIT_HASH__: JSON.stringify(gitCommitHash),
	},
	resolve: {
		tsconfigPaths: true,
	},
	plugins: [
		vue(),
		svgLoader({
			svgoConfig: {
				plugins: [
					{
						name: "preset-default",
						params: {
							overrides: {
								removeViewBox: false, // Required for proper scaling
							},
						},
					},
				],
			},
		}),
		ui({
			router: false,
			ui: {
				colors: {
					primary: "violet",
					neutral: "taupe",
				},
			},
		}),
	],
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
