# Architecture Overview

SkyCast is a client‑only PWA.

## Data Flow
1. **Geocoding** (Open‑Meteo): `geocoding-api.open-meteo.com/v1/search` and `/v1/reverse`
2. **Forecast** (Open‑Meteo): `api.open-meteo.com/v1/forecast`
   - `current_weather=true`
   - `hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weathercode,wind_speed_10m,uv_index`
   - `daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum`
3. **Render**: current card, hourly scroller + Chart.js, 7‑day tiles
4. **Persistence**: `localStorage` (last place, favorites, unit, cached payload)
5. **Offline**: Service worker caches app shell (cache‑first) and API responses (network‑first with cache fallback).

## Notable Files
- `app.js` — UI logic and rendering
- `sw.js` — service worker
- `styles.css` — theme, layout, components
