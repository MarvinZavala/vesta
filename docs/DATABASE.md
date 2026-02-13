# Esquema de Base de Datos - VESTA

Este archivo contiene el SQL completo para crear todas las tablas en Supabase.

---

## Instrucciones

1. Ve a tu proyecto en Supabase
2. Abre **SQL Editor**
3. Crea un nuevo query
4. Copia y pega TODO el SQL de abajo
5. Ejecuta (Run o Cmd+Enter)

---

## SQL Schema Completo

```sql
-- ============================================
-- VESTA PORTFOLIO TRACKER - DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  preferred_currency TEXT DEFAULT 'USD',
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'premium', 'premium_plus')),
  revenuecat_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. PORTFOLIOS TABLE
-- ============================================
CREATE TABLE public.portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can CRUD own portfolios"
  ON public.portfolios FOR ALL
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_portfolios_user_id ON public.portfolios(user_id);

-- Trigger to create default portfolio
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.portfolios (user_id, name, is_default)
  VALUES (NEW.id, 'My Portfolio', TRUE);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_profile();

-- ============================================
-- 3. HOLDINGS TABLE
-- ============================================
CREATE TABLE public.holdings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL CHECK (asset_type IN (
    'stock', 'etf', 'mutual_fund', 'crypto',
    'commodity_gold', 'commodity_silver', 'commodity_platinum',
    'fixed_income_bond', 'fixed_income_cd',
    'real_estate', 'cash', 'other'
  )),
  symbol TEXT,
  name TEXT NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL DEFAULT 0,
  cost_basis DECIMAL(20, 2),
  purchase_date DATE,
  currency TEXT DEFAULT 'USD',

  -- For non-traded assets
  manual_price DECIMAL(20, 2),
  manual_price_updated_at TIMESTAMPTZ,

  -- For fixed income
  maturity_date DATE,
  interest_rate DECIMAL(5, 2),
  payment_frequency TEXT CHECK (payment_frequency IN ('monthly', 'quarterly', 'annually')),

  -- For real estate
  property_address TEXT,
  property_type TEXT CHECK (property_type IN ('residential', 'commercial', 'land')),
  last_valuation_date DATE,

  -- Metadata
  notes TEXT,
  sector TEXT,
  country TEXT DEFAULT 'US',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access holdings in their own portfolios
CREATE POLICY "Users can CRUD own holdings"
  ON public.holdings FOR ALL
  USING (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_holdings_portfolio_id ON public.holdings(portfolio_id);
CREATE INDEX idx_holdings_asset_type ON public.holdings(asset_type);
CREATE INDEX idx_holdings_symbol ON public.holdings(symbol);

-- ============================================
-- 4. PRICE CACHE TABLE
-- ============================================
CREATE TABLE public.price_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  price_change_24h DECIMAL(20, 8),
  price_change_percent_24h DECIMAL(10, 4),
  currency TEXT DEFAULT 'USD',
  source TEXT CHECK (source IN ('finnhub', 'coingecko', 'metals_api', 'manual')),
  fetched_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(symbol, asset_type, currency)
);

-- No RLS needed - prices are public
CREATE INDEX idx_price_cache_symbol ON public.price_cache(symbol);
CREATE INDEX idx_price_cache_fetched_at ON public.price_cache(fetched_at);

-- ============================================
-- 5. ALERTS TABLE
-- ============================================
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  holding_id UUID NOT NULL REFERENCES public.holdings(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'price_above', 'price_below', 'percent_change', 'maturity', 'revaluation'
  )),
  target_value DECIMAL(20, 2),
  target_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users can CRUD own alerts"
  ON public.alerts FOR ALL
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_alerts_user_id ON public.alerts(user_id);
CREATE INDEX idx_alerts_holding_id ON public.alerts(holding_id);
CREATE INDEX idx_alerts_is_active ON public.alerts(is_active);

-- ============================================
-- 6. AI ANALYSIS TABLE
-- ============================================
CREATE TABLE public.ai_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  analysis_type TEXT NOT NULL CHECK (analysis_type IN (
    'diversification', 'risk', 'rebalance', 'general'
  )),
  prompt_hash TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.ai_analysis ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users can CRUD own analysis"
  ON public.ai_analysis FOR ALL
  USING (
    portfolio_id IN (
      SELECT id FROM public.portfolios WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_ai_analysis_portfolio_id ON public.ai_analysis(portfolio_id);
CREATE INDEX idx_ai_analysis_prompt_hash ON public.ai_analysis(prompt_hash);

-- ============================================
-- 7. CHAT SESSIONS TABLE (AI Chat History)
-- ============================================
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users can CRUD own chat sessions"
  ON public.chat_sessions FOR ALL
  USING (auth.uid() = user_id);

-- Index
CREATE INDEX idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_updated_at ON public.chat_sessions(updated_at DESC);

-- ============================================
-- 8. CHAT MESSAGES TABLE (AI Chat Messages)
-- ============================================
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy
CREATE POLICY "Users can CRUD messages in own sessions"
  ON public.chat_messages FOR ALL
  USING (
    session_id IN (
      SELECT id FROM public.chat_sessions WHERE user_id = auth.uid()
    )
  );

-- Index
CREATE INDEX idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(created_at);

-- ============================================
-- 9. UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_holdings_updated_at
  BEFORE UPDATE ON public.holdings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 10. HELPER VIEWS
-- ============================================

-- View: Holdings with latest prices
CREATE OR REPLACE VIEW public.holdings_with_prices AS
SELECT
  h.*,
  COALESCE(p.price, h.manual_price, 0) as current_price,
  COALESCE(p.price, h.manual_price, 0) * h.quantity as current_value,
  p.price_change_24h,
  p.price_change_percent_24h,
  CASE
    WHEN h.cost_basis IS NOT NULL AND h.cost_basis > 0 THEN
      (COALESCE(p.price, h.manual_price, 0) * h.quantity) - h.cost_basis
    ELSE NULL
  END as gain_loss
FROM public.holdings h
LEFT JOIN public.price_cache p ON (
  h.symbol = p.symbol
  AND h.asset_type = p.asset_type
  AND p.fetched_at > NOW() - INTERVAL '1 hour'
)
ORDER BY h.created_at DESC;

-- ============================================
-- 11. SAMPLE DATA (Optional - for testing)
-- ============================================
-- Uncomment below to add sample data after your first sign up

/*
-- After signing up, replace YOUR_USER_ID with your actual user ID

INSERT INTO public.holdings (portfolio_id, asset_type, symbol, name, quantity, cost_basis, currency)
SELECT
  p.id,
  'stock',
  'AAPL',
  'Apple Inc.',
  10,
  1500.00,
  'USD'
FROM public.portfolios p
WHERE p.is_default = true
LIMIT 1;

INSERT INTO public.holdings (portfolio_id, asset_type, symbol, name, quantity, cost_basis, currency)
SELECT
  p.id,
  'crypto',
  'bitcoin',
  'Bitcoin',
  0.5,
  15000.00,
  'USD'
FROM public.portfolios p
WHERE p.is_default = true
LIMIT 1;

INSERT INTO public.holdings (portfolio_id, asset_type, symbol, name, quantity, cost_basis, currency)
SELECT
  p.id,
  'commodity_gold',
  'XAU',
  'Gold (oz)',
  2,
  3800.00,
  'USD'
FROM public.portfolios p
WHERE p.is_default = true
LIMIT 1;
*/
```

---

## Verificación

Después de ejecutar el SQL, verifica que las tablas se crearon:

1. Ve a **Table Editor** en Supabase
2. Deberías ver estas tablas:
   - profiles
   - portfolios
   - holdings
   - price_cache
   - alerts
   - ai_analysis
   - chat_sessions
   - chat_messages

3. Ve a **Authentication** → **Users**
4. Crea un usuario de prueba
5. Verifica que se haya creado automáticamente:
   - Un registro en `profiles`
   - Un portfolio default en `portfolios`

---

## Diagrama de Relaciones

```
┌──────────────┐
│  auth.users  │
└──────┬───────┘
       │ 1:1
       ▼
┌──────────────┐      ┌──────────────┐
│   profiles   │──1:N─│  portfolios  │
└──────┬───────┘      └──────┬───────┘
       │                     │ 1:N
       │                     ▼
       │              ┌──────────────┐
       │              │   holdings   │
       │              └──────┬───────┘
       │ 1:N                 │
       ▼                     │ N:1
┌──────────────┐      ┌──────┴───────┐
│    alerts    │◄─────│              │
└──────────────┘      └──────────────┘

┌──────────────┐
│ price_cache  │ (sin relaciones, caché global)
└──────────────┘

┌──────────────┐
│ ai_analysis  │──N:1─→ portfolios
└──────────────┘
```

---

## Row Level Security (RLS)

Todas las tablas tienen RLS habilitado:

- **profiles**: Solo puedes ver/editar tu propio perfil
- **portfolios**: Solo puedes CRUD tus propios portfolios
- **holdings**: Solo puedes CRUD holdings de tus portfolios
- **alerts**: Solo puedes CRUD tus propias alertas
- **ai_analysis**: Solo puedes ver análisis de tus portfolios
- **price_cache**: Sin RLS (precios son públicos)
