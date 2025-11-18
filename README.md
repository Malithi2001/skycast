# SkyCast — Beautiful Weather PWA

SkyCast is a fast, offline‑friendly weather web app built with **vanilla HTML/CSS/JS** and the **Open‑Meteo** API.  
It supports **live place search**, **current / hourly / 7‑day forecasts**, **unit toggle (°C/°F)**, **favorites**, and a **PWA** service worker.

## Features
- Modern, glass UI with responsive cards and skeleton loading
- Live **search** with debounced suggestions (Open‑Meteo Geocoding)
- **Geolocation** button
- **Hourly chart** (Chart.js) for the next 24 hours
- **Favorites** (pinned places) saved locally
- **Offline**: caches the app and last viewed forecast
- **Accessibility**: ARIA, live regions, keyboard navigation

## Quick Start (Local)
**Option A — Python**
```bash
python -m http.server 5173
# open http://localhost:5173
```

**Option B — Node.js (optional)**
```bash
npm i
npm run start
# open http://localhost:5173
```

## Deploy to GitHub Pages (CI)
The repo is configured with **GitHub Actions** to deploy from the `main` branch.

1. Push to GitHub (see instructions below).
2. In **Settings → Pages**, choose **Source: GitHub Actions**.
3. The workflow at `.github/workflows/pages.yml` will publish the site.  
   The URL will be: `https://<your-username>.github.io/<repo-name>/`.

The app uses relative paths and will work from a subpath.

## Repo Structure
```
.
├─ index.html
├─ styles.css
├─ app.js
├─ sw.js
├─ manifest.webmanifest
├─ assets/
│  └─ icons/ (PWA icons)
├─ docs/
│  ├─ architecture.md
│  ├─ api.md
│  └─ accessibility.md
├─ scripts/
│  └─ bump-version.sh
├─ .github/
│  ├─ workflows/pages.yml
│  ├─ ISSUE_TEMPLATE/bug_report.md
│  ├─ ISSUE_TEMPLATE/feature_request.md
│  └─ PULL_REQUEST_TEMPLATE.md
├─ .editorconfig
├─ .gitignore
├─ .prettierrc.json
├─ .prettierignore
├─ CONTRIBUTING.md
├─ CODE_OF_CONDUCT.md
├─ SECURITY.md
└─ LICENSE
```

## Tech Stack
- **Open‑Meteo** Forecast & Geocoding (no API key)
- **Chart.js** for the hourly temperature chart
- **PWA** service worker + manifest

## Development Notes
- Update the service worker cache version in `sw.js` → `VERSION`.
- Use `scripts/bump-version.sh v1.0.1` to bump it and force an update.

## Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md).

## License
[MIT](LICENSE)
