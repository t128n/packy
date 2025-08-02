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
	define: {
		__COMMIT_SHA__: JSON.stringify(
			process.env.VITE_COMMIT_SHA || process.env.COMMIT_SHA || "dev",
		),
	},
});
