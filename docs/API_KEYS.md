# Configuración de API Keys - VESTA

Guía detallada para obtener cada API key necesaria.

---

## Resumen de APIs Necesarias

| Servicio | Propósito | Costo | Prioridad |
|----------|-----------|-------|-----------|
| Supabase | Base de datos + Auth | Gratis (tier Free) | Obligatorio |
| RevenueCat | Suscripciones | Gratis | Obligatorio |
| Finnhub | Precios de Stocks | Gratis | Obligatorio |
| CoinGecko | Precios de Crypto | Gratis | Obligatorio |
| Metals-API | Precios de Metales | Gratis (limitado) | Recomendado |
| OpenAI | AI Advisor | Pago (~$0.01/query) | Opcional para dev |

---

## 1. Supabase (OBLIGATORIO)

### Paso a paso:

1. **Crear cuenta:** https://supabase.com/dashboard

2. **Crear proyecto:**
   - Click "New Project"
   - Nombre: `vesta-portfolio`
   - Password: Guárdalo (para conexión directa a PostgreSQL)
   - Region: La más cercana

3. **Obtener credenciales:**
   - Ve a Settings → API
   - Copia:
     - `Project URL` → `EXPO_PUBLIC_SUPABASE_URL`
     - `anon public` → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Límites del Plan Gratuito:
- 500 MB de base de datos
- 1 GB de almacenamiento de archivos
- 2 GB de ancho de banda
- 50,000 usuarios activos/mes

---

## 2. RevenueCat (OBLIGATORIO)

### Paso a paso:

1. **Crear cuenta:** https://app.revenuecat.com

2. **Crear proyecto:**
   - Click "+ New Project"
   - Nombre: "Vesta"

3. **Configurar App (iOS):**
   - Apps → + New → Apple App Store
   - Bundle ID: `com.tuempresa.vesta`
   - Shared Secret: Obtenerlo de App Store Connect

4. **Configurar App (Android):**
   - Apps → + New → Google Play Store
   - Package Name: `com.tuempresa.vesta`
   - Service Account JSON: De Google Play Console

5. **Obtener API Key:**
   - Project Settings → API Keys
   - Copia el Public SDK Key:
     - iOS: `appl_xxxxx` → `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
     - Android: `goog_xxxxx` → `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`

### Productos a crear:

| Identificador | Tipo | Precio | Entitlement |
|---------------|------|--------|-------------|
| vesta_premium_monthly | Suscripción | $4.99/mes | premium |
| vesta_premium_plus_monthly | Suscripción | $9.99/mes | premium_plus |
| vesta_premium_annual | Suscripción | $39.99/año | premium |
| vesta_premium_plus_annual | Suscripción | $79.99/año | premium_plus |

---

## 3. Finnhub (OBLIGATORIO - Stocks)

### Paso a paso:

1. **Crear cuenta:** https://finnhub.io/register

2. **Verificar email**

3. **Obtener API Key:**
   - Dashboard → API Key
   - Copia → `EXPO_PUBLIC_FINNHUB_API_KEY`

### Límites del Plan Gratuito:
- 60 API calls/minuto
- Datos en tiempo real (15 min delay)
- Stocks US, ETFs, Forex

### Endpoints que usamos:
```
GET /quote?symbol=AAPL
GET /search?q=apple
```

---

## 4. CoinGecko (OBLIGATORIO - Crypto)

### Paso a paso:

1. **Sin API Key (Plan Demo):**
   - El plan gratuito NO requiere key
   - Límite: 10-50 calls/minuto
   - Suficiente para desarrollo

2. **Con API Key (opcional, más requests):**
   - Crear cuenta: https://www.coingecko.com/en/api/pricing
   - Plan gratuito: 30 calls/min
   - Dashboard → API Key
   - Copia → `EXPO_PUBLIC_COINGECKO_API_KEY`

### Límites:
| Plan | Calls/min | Costo |
|------|-----------|-------|
| Demo (sin key) | 10-30 | Gratis |
| Free (con key) | 30 | Gratis |
| Analyst | 500 | $129/mes |

### Endpoints que usamos:
```
GET /simple/price?ids=bitcoin,ethereum&vs_currencies=usd
GET /coins/markets?vs_currency=usd&ids=bitcoin
GET /search?query=bitcoin
```

---

## 5. Metals-API (RECOMENDADO - Oro, Plata, Platino)

### Paso a paso:

1. **Crear cuenta:** https://metals-api.com/register

2. **Seleccionar plan gratuito**

3. **Obtener API Key:**
   - Dashboard → Access Key
   - Copia → `EXPO_PUBLIC_METALS_API_KEY`

### Límites del Plan Gratuito:
- 100 requests/mes
- Solo metal base (XAU/USD)
- Sin datos históricos

### Alternativas gratuitas:
- **Gold-API:** https://www.goldapi.io (50 calls/mes gratis)
- **Datos manuales:** El usuario puede ingresar precios manualmente

### Endpoints:
```
GET /latest?base=USD&symbols=XAU,XAG,XPT
```

---

## 6. OpenAI (OPCIONAL para desarrollo)

### Paso a paso:

1. **Crear cuenta:** https://platform.openai.com

2. **Agregar créditos:**
   - Billing → Add payment method
   - Add credits: $5-10 es suficiente para desarrollo

3. **Crear API Key:**
   - API Keys → Create new secret key
   - Nombre: "vesta-dev"
   - Copia INMEDIATAMENTE (solo se muestra una vez)
   - → `EXPO_PUBLIC_OPENAI_API_KEY`

### Costos estimados:
| Modelo | Input | Output | Costo/query típico |
|--------|-------|--------|-------------------|
| GPT-4o-mini | $0.15/1M | $0.60/1M | ~$0.001 |
| GPT-4o | $2.50/1M | $10/1M | ~$0.01 |

### Para desarrollo:
- Puedes usar respuestas mock
- O usar GPT-4o-mini que es muy barato

---

## Archivo .env Final

```bash
# ===========================================
# VESTA - Environment Variables
# ===========================================

# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://xxxxxxxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# RevenueCat
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_xxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_xxxxxxxxxx

# Price APIs
EXPO_PUBLIC_FINNHUB_API_KEY=xxxxxxxxxx
EXPO_PUBLIC_COINGECKO_API_KEY=
EXPO_PUBLIC_METALS_API_KEY=xxxxxxxxxx

# OpenAI (opcional para dev)
EXPO_PUBLIC_OPENAI_API_KEY=sk-xxxxxxxxxx
```

---

## Desarrollo sin API Keys

Mientras obtienes las API keys, puedes:

### 1. Mock Data para Supabase
- La app funcionará con estado local
- Usa Zustand stores sin persistencia
- Los datos se perderán al cerrar la app

### 2. Mock Prices
- Crear archivo `src/services/prices/mock.ts`
- Devolver precios estáticos para pruebas

### 3. Skip RevenueCat
- Todos los usuarios tienen tier "free"
- El paywall muestra la UI pero no procesa pagos

### 4. Skip OpenAI
- El chat de IA muestra respuestas predefinidas
- Ejemplo: "Para obtener análisis personalizados, configura tu API key de OpenAI"

---

## Seguridad

### IMPORTANTE:

1. **NUNCA** commitear el archivo `.env` a Git
2. **NUNCA** exponer las keys del servidor (solo las EXPO_PUBLIC_*)
3. Las `EXPO_PUBLIC_*` son seguras para el cliente porque:
   - Supabase usa RLS para proteger datos
   - RevenueCat valida compras del lado del servidor
   - Las API de precios son públicas

### Keys que NUNCA deben ser públicas:
- Supabase `service_role` key
- Passwords de base de datos
- Secret keys de Stripe/Payments
