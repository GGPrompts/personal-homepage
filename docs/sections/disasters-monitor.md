# Disasters Monitor

Real-time earthquake monitoring from USGS.

## Files
- `app/sections/disasters-monitor.tsx` - Main component

## Features
- Recent earthquakes (M2.5+ in last 24h)
- Significant earthquakes (week)
- Magnitude filtering (2.5-4, 4-5, 5-6, 6+)
- Earthquake details:
  - Location and depth
  - Magnitude and type
  - Felt reports
  - Tsunami warning status
- Statistics and charts
- Auto-refresh (5 min)

## APIs
- USGS Earthquake API (GeoJSON feeds)

## TabzChrome Selectors
- `data-tabz-section="disasters"` - Container
- `data-tabz-action="refresh-earthquakes"` - Refresh
- `data-tabz-action="filter-magnitude"` - Magnitude filter
- `data-tabz-action="view-earthquake"` - View details
- `data-tabz-region="recent"` - Recent quakes
- `data-tabz-region="significant"` - Significant quakes
- `data-tabz-region="stats"` - Statistics
- `data-tabz-list="earthquakes"` - Earthquake list
- `data-tabz-item="earthquake"` - Individual event

## State
- TanStack Query with 5 min refresh
