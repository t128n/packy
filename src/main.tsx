import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./main.css";
import WebContainerProvider from "react-webcontainers";
import { Toaster } from "@/components/ui/sonner";
import { DownloadProvider } from "@/lib/downloads";
import { TerminalProvider } from "@/lib/terminal";
import { App } from "./App";

function getRootElementOrThrow(): HTMLElement {
	const root = document.getElementById("root");
	if (!root) {
		const message =
			"Root element with id 'root' was not found in the document.\n\n" +
			"This usually means your index.html is missing:\n" +
			'  <div id="root"></div>\n\n' +
			"If the problem persists, please open an issue:\n" +
			"https://github.com/t128n/packy/issues";

		// Create a descriptive error to capture stack trace
		const err = new Error(message);

		// Also render a friendly fallback in the page for non-dev users
		const fallback = document.createElement("div");
		fallback.style.fontFamily =
			"system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
		fallback.style.padding = "16px";
		fallback.style.color = "#b00020";
		fallback.style.maxWidth = "720px";
		fallback.style.margin = "24px auto";
		fallback.style.lineHeight = "1.5";
		fallback.innerHTML = `
      <h1 style="margin:0 0 8px;">Application failed to start</h1>
      <p>We couldn't find the root element <code>#root</code> in the page.</p>
      <p>Please ensure your <code>index.html</code> contains:</p>
      <pre style="background:#f6f8fa;padding:12px;border-radius:8px;overflow:auto;">
&lt;div id="root"&gt;&lt;/div&gt;
      </pre>
      <p>
        If this keeps happening, open an issue:
        <a href="https://github.com/t128n/packy/issues" target="_blank" rel="noreferrer">
          t128n/packy issues
        </a>
      </p>
      <details style="margin-top:12px;">
        <summary>Technical details (stack trace)</summary>
        <pre style="background:#f6f8fa;padding:12px;border-radius:8px;overflow:auto;">${
					err.stack || "No stack trace available."
				}</pre>
      </details>
    `;
		document.body.appendChild(fallback);

		// Throw to fail fast in dev and surface the stack in console
		throw err;
	}
	return root;
}

function renderApp(): void {
	const rootEl = getRootElementOrThrow();
	const root = createRoot(rootEl);
	root.render(
		<StrictMode>
			<WebContainerProvider>
				<DownloadProvider>
					<TerminalProvider>
						<Toaster richColors position="bottom-right" />
						<App />
					</TerminalProvider>
				</DownloadProvider>
			</WebContainerProvider>
		</StrictMode>,
	);
}

// Guard against double-mount in some dev setups and ensure DOM is ready
if (document.readyState === "loading") {
	window.addEventListener("DOMContentLoaded", renderApp, { once: true });
} else {
	renderApp();
}
