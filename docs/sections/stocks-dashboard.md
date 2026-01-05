# Stocks Dashboard

Paper trading simulator with real market data.

## Files
- `app/sections/stocks-dashboard.tsx` - Main component
- `app/api/stocks/route.ts` - Quote/history API
- `app/api/stocks/types.ts` - Shared types

## Features
- Real-time stock quotes
- Price charts (1D, 5D, 1M, 6M, 1Y, 5Y)
- Paper trading portfolio
- Buy/sell transactions
- Position tracking with P&L
- Transaction history
- Portfolio value over time
- Stock search
- Live price updates

## APIs
- Finnhub (real-time quotes)
- Alpha Vantage (historical data, fallback)

## TabzChrome Selectors
- `data-tabz-section="stocks"` - Container
- `data-tabz-input="stock-search"` - Symbol search
- `data-tabz-action="search-stock"` - Search
- `data-tabz-action="buy"` - Buy shares
- `data-tabz-action="sell"` - Sell shares
- `data-tabz-action="refresh-quotes"` - Refresh prices
- `data-tabz-action="change-timeframe"` - Chart timeframe
- `data-tabz-region="portfolio"` - Portfolio summary
- `data-tabz-list="positions"` - Open positions
- `data-tabz-list="transactions"` - Transaction history

## State
- Portfolio in localStorage (`stocks-portfolio`)
- TanStack Query for quote caching

## Configuration
API keys required in Settings:
- `finnhub-api-key` - Finnhub API key
- `alphavantage-api-key` - Alpha Vantage key (optional)
