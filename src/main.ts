import "@fontsource/geist/latin-400.css";
import "@fontsource/geist/latin-500.css";
import "@fontsource/geist/latin-600.css";
import "@fontsource/geist-mono/latin-400.css";
import { mount } from "svelte";

import "~/styles/tokens.css";
import "~/app.css";
import App from "~/App.svelte";

const target = document.getElementById("app");

if (!target) {
	throw new Error("Missing #app mount point");
}

mount(App, { target });
