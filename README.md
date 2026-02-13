# Vesta Portfolio

**One portfolio to track them all.** Track stocks, crypto, ETFs, gold, real estate, bonds and cash — all in one app with real-time prices and AI-powered insights.

Built for the [RevenueCat Shipyard: Creator Contest](https://www.revenuecat.com/shipyard/) hackathon.

---

## What is Vesta?

Most investors have assets spread across multiple platforms — Robinhood for stocks, Coinbase for crypto, a bank for bonds, a spreadsheet for real estate. **Vesta brings everything together** into a single, beautiful dashboard with live prices and intelligent analysis.

### The Problem
- No single app tracks **every** asset class
- Switching between 5+ apps to see your net worth
- No unified view of portfolio risk and allocation

### The Solution
Vesta supports **7 asset types** out of the box: Stocks, ETFs, Crypto, Gold/Silver, Real Estate, Bonds, and Cash. Add any asset in seconds and get a real-time portfolio overview.

---

## Features

### Free Tier
- Track up to **5 assets** across any category
- Real-time prices (stocks, crypto, metals)
- Interactive price charts (1D, 1W, 1M, 3M, 1Y)
- Portfolio allocation pie chart
- Up to **3 price alerts**
- Dark & light mode

### Vesta Pro ($4.99/mo or $29.99/yr)
- **Unlimited assets & alerts**
- **AI Portfolio Advisor** — powered by Claude, analyzes your holdings and gives personalized advice
- **Advanced analysis** — sector breakdown, geographic exposure, risk scoring
- **Real-time prices** — 1-min refresh vs 15-min on free
- **Export** portfolio data to CSV/PDF

---

## Tech Stack

### Frontend
| Tech | Purpose |
|------|---------|
| React Native 0.81 | Cross-platform mobile |
| Expo SDK 54 | Development & build tooling |
| Expo Router 6 | File-based navigation |
| TypeScript 5.9 | Type safety |
| Zustand 5 | State management (3 stores) |
| Reanimated 4.1 | 60fps animations |
| Shopify Skia | Canvas-based pie charts |
| Victory Native | Price line charts |

### Backend & Services
| Service | Purpose |
|---------|---------|
| **Supabase** | Auth, PostgreSQL database, real-time sync |
| **RevenueCat** | Subscription management & paywall |
| **Finnhub** | Stock & ETF real-time quotes |
| **CoinGecko** | Cryptocurrency prices & charts |
| **Yahoo Finance** | Fallback for restricted stock data |
| **Metals API** | Gold, silver, platinum spot prices |
| **Claude AI** | AI portfolio advisor (chat) |

### Architecture
- **New Architecture** enabled (React 19 concurrent features)
- **Multi-source price engine** with automatic fallbacks (Finnhub → Yahoo Finance)
- **Smart caching** — in-memory + Supabase price_cache table
- **Batch API calls** for portfolio price updates
- **RevenueCat smart sync** — prevents false downgrades when RC has no purchase history

---

## Screens

| Screen | Description |
|--------|-------------|
| **Overview** | Dashboard with portfolio total, 24h change, allocation chart, top holdings |
| **Holdings** | Searchable & filterable list of all assets with real-time prices |
| **Insights** | Risk score, sector analysis, geographic exposure (Pro) |
| **Alerts** | Create & manage price alerts with toggle on/off |
| **Settings** | Profile, currency preference, subscription management |
| **Asset Detail** | Individual asset view with price chart, edit/delete |
| **AI Chat** | Conversational AI advisor with portfolio context (Pro) |
| **Paywall** | Subscription upgrade with pricing toggle |

---

## Monetization Strategy

### RevenueCat Integration
- **SDK**: `react-native-purchases` v9 with StoreKit 2
- **Entitlement**: `Vesta Pro` — single entitlement unlocks all premium features
- **Products**: `monthly` ($4.99) and `yearly` ($29.99) via App Store Connect
- **Offering**: `default` with `$rc_monthly` and `$rc_annual` packages

### Conversion Hooks
1. **Asset limit (5)** — users hit the wall fast if they have a diverse portfolio
2. **AI Advisor badge** — visible on every screen, creates curiosity
3. **Locked analysis** — users see the sections but can't access data
4. **Alert limit (3)** — power users need more alerts
5. **Price refresh speed** — 1 min vs 15 min drives urgency for real-time data

### Why It Works
- **Low friction free tier** — enough to demonstrate value
- **Clear upgrade path** — every limitation has a visible "Upgrade" prompt
- **Yearly discount (50%)** — anchors the yearly plan as the obvious choice
- **7-day free trial** on yearly — reduces commitment anxiety

---

## Database Schema (Supabase)

```
profiles        — user settings, subscription_tier, preferred_currency
portfolios      — user portfolios (name, description)
holdings        — assets (symbol, quantity, cost_basis, asset_type, notes)
alerts          — price alerts (symbol, trigger_type, target_value, is_active)
chat_sessions   — AI chat conversations
chat_messages   — individual messages in chat sessions
price_cache     — cached prices to reduce API calls
```

---

## Getting Started

```bash
# Install dependencies
npm install

# Start development
npx expo start

# Build for iOS (TestFlight)
npx eas-cli build --platform ios --profile production
npx eas-cli submit --platform ios --latest
```

### Environment Variables
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=
EXPO_PUBLIC_FINNHUB_API_KEY=
EXPO_PUBLIC_COINGECKO_API_KEY=
EXPO_PUBLIC_ANTHROPIC_API_KEY=
```

---

## Demo Video Script

1. **Open app** → show the $497K portfolio dashboard
2. **Scroll overview** → allocation chart, top holdings
3. **Holdings tab** → filter by crypto, search for Bitcoin
4. **Tap an asset** → show price chart, details, edit
5. **Insights tab** → risk score, sector/geo breakdown
6. **AI Advisor** → ask "How is my portfolio diversified?"
7. **Alerts** → create a price alert for BTC
8. **Paywall** → show the upgrade flow
9. **Settings** → show subscription status

---

Built with Expo, Supabase & RevenueCat by Marvin Zavala.
