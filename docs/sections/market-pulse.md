# Market Pulse

Labor market and salary data visualization.

## Files
- `app/sections/market-pulse.tsx` - Main component
- `app/api/bls/route.ts` - BLS data API

## Features
- Top tech occupation salaries
- Year-over-year salary changes
- Historical salary trends
- KPI summary cards
- Interactive charts:
  - Salary comparison bar chart
  - Trend line charts
  - Growth rate visualization
- Occupation details view

## APIs
- Bureau of Labor Statistics (BLS)
- Occupational Employment Statistics (OES)

## TabzChrome Selectors
- `data-tabz-section="market-pulse"` - Container
- `data-tabz-action="refresh-bls"` - Refresh data
- `data-tabz-action="view-occupation"` - View details
- `data-tabz-region="kpis"` - KPI cards
- `data-tabz-region="salary-chart"` - Salary comparison
- `data-tabz-region="trends"` - Trend charts
- `data-tabz-list="occupations"` - Occupation list

## State
- TanStack Query with 24h cache (data updates monthly)
