# Contributing to SkyCast

Thanks for your interest!

## Workflow
- Create a feature branch: `feature/<short-desc>`
- Keep commits small and descriptive (Conventional Commits encouraged).
- Open a PR to `main` with a clear description and screenshots/GIFs if UI changes.

## Local Setup
- Serve locally:
  - Python: `python -m http.server 5173`
  - Node (optional): `npm i && npm run start`
- Format code: `npm run format` (optional)

## Coding Guidelines
- Plain HTML/CSS/JS (no frameworks) for portability.
- Keep UI accessible (ARIA, keyboard navigation).
- Prefer relative URLs; the app must work on a subpath (GitHub Pages).

## Testing
- Manually verify:
  - Search suggestions work
  - Hourly/daily data loads
  - Unit toggle
  - Favorites pin/remove
  - PWA install and offline (airplane mode)

## Security
- Do not commit secrets. (Open‑Meteo requires none.)
- Report vulnerabilities via SECURITY.md.
