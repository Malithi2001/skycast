# API Usage (Open‑Meteo)

No API key is required.

- **Geocoding**: `https://geocoding-api.open-meteo.com/v1/search?name=<query>&count=8&language=en&format=json`
- **Reverse Geocoding**: `https://geocoding-api.open-meteo.com/v1/reverse?latitude=<lat>&longitude=<lon>&language=en&format=json`
- **Forecast** (sample):
```
https://api.open-meteo.com/v1/forecast?latitude=6.9271&longitude=79.8612&current_weather=true&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weathercode,wind_speed_10m,uv_index&daily=weathercode,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto
```

Important fields used:
- `current_weather.temperature`, `current_weather.weathercode`, `current_weather.windspeed`
- Hourly arrays: `time[]`, `temperature_2m[]`, `relative_humidity_2m[]`, `apparent_temperature[]`, `precipitation_probability[]`, `weathercode[]`, `uv_index[]`
- Daily arrays: `time[]`, `temperature_2m_max[]`, `temperature_2m_min[]`, `sunrise[]`, `sunset[]`, `uv_index_max[]`, `precipitation_sum[]`
