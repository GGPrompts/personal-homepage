# Stocks Dashboard (Paper Trading)

A trading practice dashboard with real market data and virtual money.

## Status: Implemented

## Features

- **Real-time quotes** (15-min delayed on free tier) via Finnhub API
- **Paper trading** with $100,000 virtual starting balance
- **Portfolio tracking** with positions, P&L, and day's change
- **Watchlist** with 8 default stocks, searchable and sortable
- **Price charts** with multiple timeframes (1D, 5D, 1M, 6M, 1Y, 5Y)
- **Market statistics** (P/E, 52-week high/low, market cap)
- **Transaction history** with buy/sell records
- **localStorage persistence** for portfolio state

## Setup

### 1. Get a Finnhub API Key (Free)

1. Go to [finnhub.io/register](https://finnhub.io/register)
2. Create a free account
3. Copy your API key from the dashboard

### 2. Add to Environment

Create or edit `.env.local`:

```bash
FINNHUB_API_KEY=your_api_key_here
```

### 3. Restart Dev Server

```bash
npm run dev
```

## API Endpoints

| Endpoint | Description | Rate Limit |
|----------|-------------|------------|
| `/api/stocks?symbols=AAPL,MSFT` | Get quotes for symbols | Cached 1 min |
| `/api/stocks/history?symbol=AAPL&timeframe=1D` | Historical candles | Cached 1-5 min |
| `/api/stocks/search?q=apple` | Search stocks by name/symbol | Cached 1 hour |

## Timeframes

| Code | Resolution | Data Range |
|------|------------|------------|
| 1D | 5-minute candles | 1 day |
| 5D | 15-minute candles | 5 days |
| 1M | 1-hour candles | 30 days |
| 6M | Daily candles | 180 days |
| 1Y | Daily candles | 365 days |
| 5Y | Weekly candles | 5 years |

## Paper Trading

### Starting Balance
- $100,000 virtual cash

### Order Types
- **Market**: Execute at current price
- **Limit**: Execute at specified price (simulated - executes immediately at limit price)

### State Persistence
Portfolio data is stored in `localStorage` under key `stocks-portfolio`:

```typescript
{
  cash: number,
  positions: [{ symbol, shares, avgCost }],
  transactions: [{ id, type, symbol, shares, price, total, timestamp }],
  watchlist: string[],
  createdAt: string,
  updatedAt: string
}
```

### Reset
Click "Reset Portfolio" to restore to $100,000 and clear all positions/history.

## Default Watchlist

- AAPL (Apple)
- MSFT (Microsoft)
- GOOGL (Alphabet)
- AMZN (Amazon)
- NVDA (NVIDIA)
- TSLA (Tesla)
- META (Meta)
- NFLX (Netflix)

## Rate Limits

Finnhub free tier: **60 calls/minute**

The dashboard uses aggressive caching to stay well under limits:
- Quotes: 1-minute cache, refetch when "Live" mode enabled
- Historical data: 1-5 minute cache based on timeframe
- Company profiles: 24-hour cache
- Metrics (P/E, 52-week): 1-hour cache

## Limitations

1. **15-minute delayed quotes** - Free tier limitation
2. **No real order book** - Simplified to current bid/ask
3. **US stocks only** - Free tier focuses on US markets
4. **Market hours** - Data only during trading hours (9:30 AM - 4 PM ET)

## Files

```
app/
├── api/stocks/
│   ├── types.ts          # Types for API & paper trading
│   ├── route.ts          # Quote endpoint
│   ├── history/route.ts  # Historical candles
│   └── search/route.ts   # Stock search
└── sections/
    └── stocks-dashboard.tsx  # Main dashboard component
```

## Future Enhancements

- [ ] Add more stocks to search/watchlist
- [ ] WebSocket streaming for real-time updates (Finnhub supports this)
- [ ] Technical indicators (RSI, MACD) from Alpha Vantage
- [ ] GitHub sync for portfolio (like Notes/Bookmarks)
- [ ] Price alerts
- [ ] Performance charts over time
