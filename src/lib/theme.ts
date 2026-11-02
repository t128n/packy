export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "packy-theme";

const THEME_COLORS: Record<Theme, string> = {
	light: "#FFFFFF",
	dark: "#161616",
};

export function getTheme(): Theme {
	return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function applyTheme(theme: Theme): void {
	const root = document.documentElement;
	root.dataset.theme = theme;
	root.style.colorScheme = theme;

	try {
		window.localStorage.setItem(THEME_STORAGE_KEY, theme);
	} catch {
		// Storage can be unavailable in private or restricted contexts.
	}

	document
		.querySelector('meta[name="theme-color"]')
		?.setAttribute("content", THEME_COLORS[theme]);
}

export function toggleTheme(): Theme {
	const next = getTheme() === "dark" ? "light" : "dark";
	applyTheme(next);
	return next;
}
