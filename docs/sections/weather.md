# Weather

Full weather dashboard with forecasts, alerts, radar, and air quality.

## Files
- `app/sections/weather.tsx` - Main component
- `app/api/weather/route.ts` - API proxy

## Features
- Geolocation with location search
- Temperature unit toggle (F/C)
- Current conditions with feels-like
- Hourly and 7-day forecasts
- NWS weather alerts with dismiss
- Animated radar from RainViewer
- Air quality index (AQI)
- Historical comparison
- Live auto-refresh mode

## APIs
- Open-Meteo (forecasts, air quality)
- NWS (weather alerts)
- RainViewer (radar animation)

## TabzChrome Selectors
- `data-tabz-section="weather"` - Container
- `data-tabz-input="weather-location"` - Location search
- `data-tabz-action="search-location"` - Search button
- `data-tabz-action="select-location"` - Location result
- `data-tabz-action="set-temp-fahrenheit"` - Fahrenheit toggle
- `data-tabz-action="set-temp-celsius"` - Celsius toggle
- `data-tabz-action="refresh-weather"` - Manual refresh
- `data-tabz-action="toggle-live-updates"` - Live mode toggle
- `data-tabz-action="dismiss-alert"` - Dismiss alert
- `data-tabz-region="weather-alerts"` - Alerts container
- `data-tabz-region="current-conditions"` - Current weather
- `data-tabz-region="hourly-forecast"` - Hourly forecast
- `data-tabz-region="daily-forecast"` - 7-day forecast
- `data-tabz-region="weather-radar"` - Radar map
- `data-tabz-region="air-quality"` - AQI panel
