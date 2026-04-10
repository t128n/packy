import { defineConfig } from "oxfmt";

// https://t128n.dev/writing/code-formatting-guidelines
export default defineConfig({
	printWidth: 80,

	useTabs: true,
	tabWidth: 4,

	semi: true,
	singleQuote: false,
	trailingComma: "all",

	sortImports: {},
	sortPackageJson: {},
	sortTailwindcss: {},

	ignorePatterns: ["**/*.mdc", "content/**/*.md"],
});
