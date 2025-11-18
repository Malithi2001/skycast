/* SkyCast — A beautiful, progressive weather web app using Open‑Meteo
 * Features:
 *  - Search with live suggestions (Open‑Meteo Geocoding)
 *  - Current, hourly (next 24h), and 7‑day forecast
 *  - Unit toggle (°C/°F), geolocation button
 *  - Favorites (pinned places) with localStorage
 *  - Chart.js temperature chart
 *  - Offline-ready (service worker caches app & last view)
 *  - Accessibility: ARIA labels, live regions, keyboardable suggestions
 */

(() => {
  'use strict';

  // -------------------- DOM --------------------
  const $ = sel => document.querySelector(sel);
  const $$ = sel => document.querySelectorAll(sel);
  const el = {
    banner: $('#status-banner'),
    search: $('#search'),
    suggestions: $('#suggestions'),
    clearSearch: $('#clear-search'),
    unitC: $('#unit-c'),
    unitF: $('#unit-f'),
    useLocation: $('#use-location'),
    pinCurrent: $('#pin-current'),
    placeName: $('#place-name'),
    updatedAt: $('#updated-at'),
    currentIcon: $('#current-icon'),
    currentTemp: $('#current-temp'),
    currentDesc: $('#current-desc'),
    feelsLike: $('#feels-like'),
    humidity: $('#humidity'),
    wind: $('#wind'),
    uv: $('#uv'),
    sunrise: $('#sunrise'),
    sunset: $('#sunset'),
    hourly: $('#hourly'),
    daily: $('#daily'),
    hourlyLegend: $('#hourly-legend'),
    tempChart: $('#temp-chart'),
    favorites: $('#favorites'),
  };

  // -------------------- State --------------------
  const state = {
    unit: localStorage.getItem('unit') || 'C',
    lastPlace: JSON.parse(localStorage.getItem('lastPlace') || 'null'),
    lastPayloadKey: localStorage.getItem('lastPayloadKey') || null,
    chart: null,
  };

  // -------------------- Constants --------------------
  const GEOCODE_URL = name =>
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=8&language=en&format=json`;

  const REVERSE_URL = (lat, lon) =>
    `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=en&format=json`;

  const FORECAST_URL = (lat, lon) =>
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation_probability,weathercode,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum&timezone=auto`;

  // -------------------- Utils --------------------
  function debounce(fn, delay = 300){
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  }

  async function fetchJSON(url){
    const res = await fetch(url);
    if(!res.ok) throw new Error('Network error');
    return res.json();
  }

  const fmt = {
    time(s){ return new Date(s).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}); },
    day(s){ return new Date(s).toLocaleDateString([], {weekday:'short'}); },
    date(s){ return new Date(s).toLocaleDateString([], {weekday:'short', month:'short', day:'numeric'}); },
    kmh(n){ return `${Math.round(n)} km/h`; },
    uv(n){ return typeof n === 'number' ? n.toFixed(1) : '--'; }
  };

  function cToF(c){ return (c * 9/5) + 32; }
  function formatTemp(c){
    if (c == null || isNaN(c)) return '--°';
    return state.unit === 'C' ? `${Math.round(c)}°` : `${Math.round(cToF(c))}°`;
  }
  function formatRange(cMin, cMax){
    return state.unit === 'C'
      ? `${Math.round(cMin)}° / ${Math.round(cMax)}°`
      : `${Math.round(cToF(cMin))}° / ${Math.round(cToF(cMax))}°`;
  }

  // Map Open‑Meteo weather codes to label + emoji
  function wx(wcode){
    const map = [
      [[0], ['Clear', '☀️']],
      [[1,2,3], ['Partly cloudy', '⛅']],
      [[45,48], ['Foggy', '🌫️']],
      [[51,53,55], ['Drizzle', '🌦️']],
      [[56,57], ['Freezing drizzle', '🌧️']],
      [[61,63,65], ['Rain', '🌧️']],
      [[66,67], ['Freezing rain', '🌧️']],
      [[71,73,75], ['Snow', '🌨️']],
      [[77], ['Snow grains', '🌨️']],
      [[80,81,82], ['Showers', '🌧️']],
      [[85,86], ['Snow showers', '🌨️']],
      [[95], ['Thunderstorm', '⛈️']],
      [[96,99], ['Hail', '⛈️']],
    ];
    for(const [codes, [label, emoji]] of map){
      if(codes.includes(Number(wcode))) return { label, emoji };
    }
    return { label: '—', emoji: '❓' };
  }

  function setBanner(msg, type='info'){
    if(!msg){ el.banner.hidden = true; return; }
    el.banner.textContent = msg;
    el.banner.className = 'banner' + (type === 'error' ? ' error' : '');
    el.banner.hidden = false;
  }

  function nowISOHour(date = new Date()){
    const d = new Date(date);
    d.setMinutes(0,0,0);
    return d.toISOString().slice(0,13)+':00';
  }

  function nearestIndex(times, targetISO){
    const idx = times.indexOf(targetISO);
    if(idx !== -1) return idx;
    // Fallback: find closest
    const target = new Date(targetISO).getTime();
    let best = 0, bestDelta = Infinity;
    times.forEach((t,i)=>{
      const delta = Math.abs(new Date(t).getTime() - target);
      if(delta < bestDelta){ bestDelta = delta; best = i; }
    });
    return best;
  }

  function saveLast(lat, lon, name, payload){
    const key = `wx_${lat.toFixed(4)}_${lon.toFixed(4)}`;
    localStorage.setItem('lastPlace', JSON.stringify({lat, lon, name}));
    localStorage.setItem('lastPayloadKey', key);
    try { localStorage.setItem(key, JSON.stringify(payload)); } catch {}
  }

  function loadCached(lat, lon){
    const key = `wx_${lat.toFixed(4)}_${lon.toFixed(4)}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }

  // -------------------- Renderers --------------------
  function renderCurrent(placeName, data){
    const cw = data.current_weather;
    const hourly = data.hourly;
    const daily = data.daily;

    el.placeName.textContent = placeName;
    el.updatedAt.textContent = 'Updated ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

    const { label, emoji } = wx(cw.weathercode);
    el.currentIcon.textContent = emoji;
    el.currentTemp.textContent = formatTemp(cw.temperature);
    el.currentDesc.textContent = label;

    // Feels like and humidity from hourly at current hour
    const target = nowISOHour(new Date(cw.time));
    const i = nearestIndex(hourly.time, target);
    const feels = hourly.apparent_temperature?.[i];
    const rh = hourly.relative_humidity_2m?.[i];
    const wind = cw.windspeed; // km/h
    const uv = hourly.uv_index?.[i];

    el.feelsLike.textContent = formatTemp(feels);
    el.humidity.textContent = (rh != null ? Math.round(rh) + '%' : '--');
    el.wind.textContent = fmt.kmh(wind);
    el.uv.textContent = fmt.uv(uv);

    // Sunrise/Sunset today (index 0 is today)
    el.sunrise.textContent = fmt.time(daily.sunrise?.[0]);
    el.sunset.textContent = fmt.time(daily.sunset?.[0]);

    // Remove skeletons
    [el.currentTemp, el.feelsLike, el.humidity, el.wind, el.uv, el.sunrise, el.sunset].forEach(n=> n.classList.remove('skeleton'));

    // Update page accent subtly by weather
    document.documentElement.style.setProperty('--primary', colorByCode(cw.weathercode));
  }

  function colorByCode(code){
    if([0].includes(code)) return '#fbbf24';       // sunny amber
    if([1,2,3].includes(code)) return '#0ea5e9';   // sky
    if([61,63,65,80,81,82].includes(code)) return '#38bdf8'; // rain blue
    if([71,73,75,85,86].includes(code)) return '#a3e1ff';    // snow cyan
    if([95,96,99].includes(code)) return '#818cf8';          // storm indigo
    return '#22d3ee';
  }

  function renderHourly(data){
    const hourly = data.hourly;
    const t = nowISOHour(new Date());
    const start = nearestIndex(hourly.time, t);
    const end = Math.min(start+24, hourly.time.length);

    el.hourly.innerHTML = '';
    for(let i=start; i<end; i++){
      const { label, emoji } = wx(hourly.weathercode?.[i] ?? hourly.weather_code?.[i]); // compatibility
      const item = document.createElement('div');
      item.className = 'hour';
      item.innerHTML = `
        <div class="time">${fmt.time(hourly.time[i])}</div>
        <div class="ico" aria-hidden="true">${emoji}</div>
        <div class="t">${formatTemp(hourly.temperature_2m[i])}</div>
        <div class="muted" title="Precipitation probability">💧 ${hourly.precipitation_probability?.[i] ?? 0}%</div>
      `;
      el.hourly.appendChild(item);
    }

    // Build chart
    const labels = hourly.time.slice(start,end).map(s => new Date(s).toLocaleTimeString([], {hour:'2-digit'}));
    const tempsC = hourly.temperature_2m.slice(start,end).map(Number);
    const temps = state.unit === 'C' ? tempsC : tempsC.map(cToF);

    if (state.chart){ state.chart.destroy(); state.chart = null; }
    const ctx = el.tempChart.getContext('2d');
    state.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: `Temperature (°${state.unit})`,
            data: temps,
            tension: 0.35,
            pointRadius: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { display:false } },
          y: { grid: { color: 'rgba(255,255,255,0.08)' } }
        }
      }
    });
    el.hourlyLegend.textContent = `Showing ${labels.length} hours`;
    // Ensure chart area has height
    el.tempChart.parentElement.style.height = '180px';
  }

  function renderDaily(data){
    const d = data.daily;
    el.daily.innerHTML = '';
    for(let i=0; i<Math.min(7, d.time.length); i++){
      const { label, emoji } = wx(d.weathercode[i]);
      const day = document.createElement('div');
      day.className = 'day';
      day.innerHTML = `
        <div class="date">${fmt.date(d.time[i])}</div>
        <div class="ico" aria-hidden="true">${emoji}</div>
        <div class="muted">${label}</div>
        <div class="range">${formatRange(d.temperature_2m_min[i], d.temperature_2m_max[i])}</div>
        <div class="muted">UV ${fmt.uv(d.uv_index_max?.[i])} · 💧 ${Math.round(d.precipitation_sum?.[i] ?? 0)}mm</div>
      `;
      el.daily.appendChild(day);
    }
  }

  function renderFavorites(){
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    el.favorites.innerHTML = '';
    if(favs.length === 0){
      const p = document.createElement('p');
      p.className = 'muted';
      p.textContent = 'No pinned places yet.';
      el.favorites.appendChild(p);
      return;
    }
    for(const f of favs){
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.innerHTML = `<button title="Open ${f.name}" aria-label="Open ${f.name}">${f.name}</button><button title="Remove" aria-label="Remove ${f.name}">✖</button>`;
      const [openBtn, removeBtn] = chip.querySelectorAll('button');
      openBtn.addEventListener('click', () => loadPlace(f.lat, f.lon, f.name));
      removeBtn.addEventListener('click', () => {
        const rest = favs.filter(x => !(x.lat===f.lat && x.lon===f.lon));
        localStorage.setItem('favorites', JSON.stringify(rest));
        renderFavorites();
      });
      el.favorites.appendChild(chip);
    }
  }

  // -------------------- Actions --------------------
  async function loadPlace(lat, lon, displayName){
    try{
      setBanner('Loading weather…');
      const url = FORECAST_URL(lat, lon);
      const payload = await fetchJSON(url);
      saveLast(lat, lon, displayName, payload);

      renderCurrent(displayName, payload);
      renderHourly(payload);
      renderDaily(payload);
      setBanner('');
    }catch(err){
      console.error(err);
      // Try cached
      const cached = loadCached(lat, lon);
      if(cached){
        renderCurrent(displayName, cached);
        renderHourly(cached);
        renderDaily(cached);
        setBanner('You are offline. Showing last saved data.', 'error');
      }else{
        setBanner('Failed to load weather. Check connection and try again.', 'error');
      }
    }
  }

  async function geocodeAndLoad(query){
    if(!query || !query.trim()) return;
    try{
      const data = await fetchJSON(GEOCODE_URL(query));
      const results = data.results || [];
      renderSuggestions(results);
    }catch(e){
      console.error(e);
      renderSuggestions([]);
    }
  }

  function renderSuggestions(results){
    el.suggestions.innerHTML = '';
    if(!results.length){
      const li = document.createElement('li');
      li.textContent = 'No matches';
      li.className = 'muted';
      el.suggestions.appendChild(li);
      return;
    }
    for(const r of results){
      const li = document.createElement('li');
      li.setAttribute('role','option');
      li.dataset.lat = r.latitude;
      li.dataset.lon = r.longitude;
      const name = [r.name, r.admin1, r.country_code].filter(Boolean).join(', ');
      li.innerHTML = `<span>${name}</span><small>${r.latitude.toFixed(2)}, ${r.longitude.toFixed(2)}</small>`;
      li.addEventListener('click', () => {
        el.search.value = name;
        el.suggestions.innerHTML = '';
        loadPlace(r.latitude, r.longitude, name);
      });
      el.suggestions.appendChild(li);
    }
  }

  const debouncedSearch = debounce(() => geocodeAndLoad(el.search.value), 350);

  // Keyboard navigation for suggestions
  function setupSuggestionKeyboard(){
    let activeIndex = -1;
    el.search.addEventListener('keydown', (e) => {
      const items = [...el.suggestions.querySelectorAll('li[role="option"]')];
      if(!items.length) return;
      if(e.key === 'ArrowDown'){ e.preventDefault(); activeIndex = Math.min(items.length-1, activeIndex+1); update(); }
      else if(e.key === 'ArrowUp'){ e.preventDefault(); activeIndex = Math.max(0, activeIndex-1); update(); }
      else if(e.key === 'Enter' && activeIndex >= 0){ e.preventDefault(); items[activeIndex].click(); }
      function update(){
        items.forEach((li,i)=> li.setAttribute('aria-selected', i===activeIndex ? 'true':'false'));
      }
    });
  }

  function setUnit(u){
    state.unit = u;
    localStorage.setItem('unit', u);
    el.unitC.classList.toggle('active', u==='C');
    el.unitF.classList.toggle('active', u==='F');
    el.unitC.setAttribute('aria-pressed', String(u==='C'));
    el.unitF.setAttribute('aria-pressed', String(u==='F'));
    // Re-render current view if we have last payload cached
    const last = JSON.parse(localStorage.getItem('lastPlace')||'null');
    if(last){
      const cached = loadCached(last.lat, last.lon);
      if(cached){
        renderCurrent(last.name, cached);
        renderHourly(cached);
        renderDaily(cached);
      }
    }
  }

  async function useMyLocation(){
    if(!('geolocation' in navigator)){
      setBanner('Geolocation not supported by browser.', 'error');
      return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      let name = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
      try{
        const rev = await fetchJSON(REVERSE_URL(lat, lon));
        const r = rev?.results?.[0];
        if(r){
          name = [r.name, r.admin1, r.country_code].filter(Boolean).join(', ');
        }
      }catch(_){}
      loadPlace(lat, lon, name);
    }, (err) => {
      setBanner('Unable to get your location.', 'error');
      console.error(err);
    }, { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 });
  }

  function pinCurrentPlace(){
    const last = JSON.parse(localStorage.getItem('lastPlace')||'null');
    if(!last){ setBanner('Open a place first, then pin it.'); return; }
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if(!favs.find(f => f.lat===last.lat && f.lon===last.lon)){
      favs.push(last);
      localStorage.setItem('favorites', JSON.stringify(favs));
      renderFavorites();
      setBanner(`Pinned ${last.name}.`);
    }else{
      setBanner('Already pinned.');
    }
  }

  // -------------------- Events --------------------
  function setupEvents(){
    el.search.addEventListener('input', debouncedSearch);
    el.clearSearch.addEventListener('click', () => { el.search.value=''; el.suggestions.innerHTML=''; el.search.focus(); });
    setupSuggestionKeyboard();
    el.unitC.addEventListener('click', () => setUnit('C'));
    el.unitF.addEventListener('click', () => setUnit('F'));
    el.useLocation.addEventListener('click', useMyLocation);
    el.pinCurrent.addEventListener('click', pinCurrentPlace);

    window.addEventListener('online', () => setBanner('Back online.'));
    window.addEventListener('offline', () => setBanner('You are offline. Showing cached data.', 'error'));
  }

  // -------------------- Init --------------------
  async function init(){
    setupEvents();
    renderFavorites();
    setUnit(state.unit);

    // Try last place or default to Colombo, Sri Lanka
    let start = state.lastPlace || { lat: 6.9271, lon: 79.8612, name: 'Colombo, LK' };
    await loadPlace(start.lat, start.lon, start.name);

    // Register SW
    if('serviceWorker' in navigator){
      try{ await navigator.serviceWorker.register('./sw.js'); }
      catch(e){ console.warn('SW register failed', e); }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
