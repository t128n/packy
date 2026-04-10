import { defineConfig } from "oxlint";

export default defineConfig({
	jsPlugins: ["@e18e/eslint-plugin"],
	ignorePatterns: ["dist", "node_modules"],
	rules: {
		// modernization
		"e18e/prefer-array-at": "error",
		"e18e/prefer-array-fill": "error",
		"e18e/prefer-includes": "error",
		"e18e/prefer-array-to-reversed": "error",
		"e18e/prefer-array-to-sorted": "error",
		"e18e/prefer-array-to-spliced": "error",
		"e18e/prefer-nullish-coalescing": "error",
		"e18e/prefer-object-has-own": "error",
		"e18e/prefer-spread-syntax": "error",
		"e18e/prefer-url-canparse": "error",

		// module replacements
		"e18e/ban-dependencies": "error",

		// performance improvements
		"e18e/prefer-array-from-map": "error",
		"e18e/prefer-timer-args": "error",
		"e18e/prefer-date-now": "error",
		"e18e/prefer-regex-test": "error",
		"e18e/prefer-array-some": "error",
		"e18e/prefer-static-regex": "error",
	},
});
