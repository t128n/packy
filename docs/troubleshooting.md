
# Troubleshooting (Web App)

Accessing Packy at [https://t128n.github.io/packy/](https://t128n.github.io/packy/)

## Common Issues & Fixes

- **App doesn’t load or bundle fails:**
  - Make sure you are using a modern browser (Chrome, Firefox, Edge).
  - Safari may not fully support all features (especially WebContainers).

- **WebContainers not supported:**
  - Packy relies on browser support for WebContainers (in-browser npm bundling).
  - If you see a warning or the app doesn’t bundle, check [WebContainers browser support](https://webcontainers.io/).
  - Try updating your browser to the latest version.

- **Service Worker issues (offline, caching):**
  - If the app seems stuck, not updating, or behaving oddly:
    1. Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R).
    2. Clear browser cache for the site.
    3. Check if a service worker is registered (DevTools > Application > Service Workers). Unregister if needed and reload.

- **Downloads not working:**
  - Ensure browser pop-ups/downloads are allowed for the site.

- **General troubleshooting:**
  - Disable browser extensions that may block scripts or service workers.
  - Try in a private/incognito window.
  - If issues persist, report them on the project’s GitHub page.
