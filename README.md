# Local Alerts — Prototype

Mobile-first GitHub Pages prototype.

## Structure

- `index.html` — app shell
- `style.css` — UI
- `app.js` — interface logic
- `data.js` — **editable alert and contact data**
- `manifest.json` — PWA metadata

The project is designed so future service/contact updates can mostly be made in `data.js` without changing the UI.

## Important

This is an **independent public-help resource**, not a Kerala Government website or government service.

The current prototype uses sample/static data. Live weather, disaster, transport and other feeds should be connected only after their official/current access method is verified.

## GitHub Pages

Upload all files to a repository named `local-alerts`, then enable:

Settings → Pages → Deploy from branch → `main` → `/ (root)`.
