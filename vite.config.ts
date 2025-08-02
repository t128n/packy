import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
	base: "/packy/",
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		headers: {
			"Cross-Origin-Embedder-Policy": "require-corp",
			"Cross-Origin-Opener-Policy": "same-origin",
		},
	},
	// Inject the current git commit SHA at build time so the app can link to it
	define: {
		__COMMIT_SHA__: JSON.stringify(process.env.VITE_COMMIT_SHA || process.env.COMMIT_SHA || "dev"),
	},
});
