# Crypto Dashboard

Cryptocurrency prices and market data.

## Files
- `app/sections/crypto-dashboard.tsx` - Main component

## Features
- Top cryptocurrencies by market cap
- Real-time prices with 24h change
- 7-day sparkline charts
- Sorting (rank, price, change, volume)
- Favorites system
- Search filtering
- Detailed coin view:
  - Price stats (high/low, ATH/ATL)
  - Supply info
  - Market metrics
- Live auto-refresh

## APIs
- CoinGecko (free tier, no API key)

## TabzChrome Selectors
- `data-tabz-section="crypto"` - Container
- `data-tabz-input="crypto-search"` - Search input
- `data-tabz-action="sort-crypto"` - Sort selector
- `data-tabz-action="toggle-favorite"` - Star/unstar coin
- `data-tabz-action="view-coin"` - View details
- `data-tabz-action="refresh-crypto"` - Manual refresh
- `data-tabz-list="coins"` - Coin list
- `data-tabz-item="coin"` - Individual coin

## State
- Favorites in localStorage (`crypto-favorites`)
- TanStack Query for price caching
