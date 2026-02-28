# Peajes Colombia · Tráfico Total

## Project Overview
An interactive web dashboard for analyzing traffic data from Colombian toll stations. Displays KPIs, time series charts, station/department rankings, a geographic map, and automated insights.

## Tech Stack
- **Frontend**: Pure HTML5, CSS3, JavaScript (ES6+) — no build system
- **Visualization**: Plotly.js v2.30.0 (charts), Leaflet v1.9.4 (map)
- **Data**: `data_trafico_total.csv` — loaded client-side via `fetch()`
- **Dependencies**: All loaded via CDN (no npm/package manager)

## Project Structure
```
index.html              # Dashboard entry point
app.js                  # Data processing, filtering, chart/map logic
styles.css              # Custom dark-theme styles
data_trafico_total.csv  # Traffic data source
```

## Development
Served via Python's built-in HTTP server on port 5000:
```
python3 -m http.server 5000
```

## Deployment
Configured as a **static site** deployment (publicDir: `.`).
