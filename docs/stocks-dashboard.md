# Stocks Dashboard (Planned)

A trading practice dashboard with real market data and paper trading.

## Overview

Based on the template from `~/projects/portfolio-style-guides/app/templates/` - a stocks dashboard that could be adapted for real data and simulated trading.

## Features

- Real-time (15-min delayed) stock quotes
- Portfolio tracking with fake money
- Watchlists
- Technical indicators (RSI, MACD, etc.)
- Historical charts
- Paper trading to practice without risk

## Free Stock Market APIs

| API | Free Tier | Best For |
|-----|-----------|----------|
| [Alpha Vantage](https://www.alphavantage.co/) | 25 requests/day | Historical data, 50+ technical indicators |
| [Finnhub](https://finnhub.io/) | 60 calls/minute | Real-time quotes, company fundamentals |
| [Twelve Data](https://twelvedata.com/) | 800 calls/day | WebSocket streaming (~170ms latency) |
| [Marketstack](https://marketstack.com/) | 100 calls/month | Simple REST API, 30k+ tickers |
| [EOD Historical Data](https://eodhd.com/) | 20 calls/day | 30+ years historical data |

## Recommended APIs

### Alpha Vantage
- Most popular free option
- 25 requests/day is enough for personal use with caching
- Covers stocks, ETFs, forex, crypto
- Built-in technical indicators (RSI, MACD, Bollinger Bands, etc.)

### Finnhub
- More generous rate limits (60/min)
- Good for real-time quotes
- WebSocket support for streaming
- Company fundamentals and news

### Twelve Data
- Best WebSocket streaming for live updates
- ~170ms latency
- Good for real-time price tickers

## Implementation Considerations

### Data Caching
- Cache responses in localStorage or TanStack Query
- Avoid hitting rate limits on every page load
- Refresh on user action or scheduled intervals

### Market Hours
- Real-time data only during trading hours (9:30 AM - 4:00 PM ET)
- Show "Market Closed" indicator outside hours
- Pre/post market data if available

### Delayed Quotes
- Most free tiers have 15-minute delayed quotes
- Display delay notice to users
- Sufficient for practice/learning

### US Focus
- Free tiers typically focus on US markets
- International markets may require paid plans

## Paper Trading Features

- Starting balance (e.g., $100,000 fake money)
- Buy/sell at current market price
- Track positions and P&L
- Transaction history
- Performance metrics over time
- localStorage persistence (or GitHub sync like Bookmarks/Notes)

## Reference

Template location: `~/projects/portfolio-style-guides/app/templates/`

## Complexity

Medium-High
- API integration with rate limiting
- Real-time updates (polling or WebSocket)
- Paper trading state management
- Charts (Recharts or similar)
