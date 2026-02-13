# VESTA - Portfolio Tracker App

## Documentación Completa del Proyecto

---

# 1. CONTEXTO DEL PROYECTO

## 1.1 Hackathon: RevenueCat Shipyard

**URL:** https://devpost.com/software/revenuecat-shipyard
**Premio:** $20,000 USD (uno de 7 ganadores posibles, total $140,000)
**Deadline:** 12 de Febrero, 2026

### Brief Seleccionado: Josh (VisualFaktory) - Portfolio Tracker

**Descripción del Brief:**
Josh necesita una aplicación para rastrear su portafolio diversificado que incluye:
- Acciones (Stocks)
- Criptomonedas
- Oro y metales preciosos
- Bienes raíces
- Bonos y renta fija

**Requisitos del Brief:**
1. Ver valor total del portafolio en un solo lugar
2. Rastrear ganancias/pérdidas por activo
3. Alertas de precio
4. Visualizaciones hermosas

---

## 1.2 Nuestra Propuesta de Valor: VESTA

**Nombre:** Vesta (diosa romana del hogar y la seguridad)

**Diferenciador Principal:** AI Portfolio Advisor
- Análisis de diversificación con IA
- Puntuación de riesgo del portafolio
- Recomendaciones de rebalanceo
- Chat conversacional con IA sobre inversiones

---

# 2. STACK TECNOLÓGICO

## 2.1 Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React Native | 0.81.5 | Framework móvil |
| Expo SDK | 54 | Desarrollo y build |
| Expo Router | 6 | Navegación file-based |
| TypeScript | 5.9 | Tipado estático |
| Zustand | 5.0 | State management |
| React Native Reanimated | 4.1 | Animaciones 60fps |
| Victory Native | 41.20 | Gráficos y charts |
| Shopify Skia | 2.2 | Renderizado avanzado |

## 2.2 Backend

| Tecnología | Propósito |
|------------|-----------|
| Supabase | Base de datos PostgreSQL + Auth + RLS |
| RevenueCat | Gestión de suscripciones |
| OpenAI API | AI Portfolio Advisor |

## 2.3 APIs de Precios

| API | Activos Cubiertos | Límite Free |
|-----|-------------------|-------------|
| Finnhub | Stocks, ETFs | 60 calls/min |
| CoinGecko | Criptomonedas | 10-50 calls/min |
| Metals-API | Oro, Plata, Platino | 100 calls/mes |

---

# 3. ESTRUCTURA DEL PROYECTO

```
vesta/
├── app/                          # Expo Router (navegación)
│   ├── _layout.tsx               # Layout raíz + rutas protegidas
│   ├── (auth)/                   # Grupo de autenticación
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx           # Pantalla de bienvenida
│   │   ├── sign-in.tsx           # Iniciar sesión
│   │   ├── sign-up.tsx           # Registrarse
│   │   └── forgot-password.tsx   # Recuperar contraseña
│   ├── (tabs)/                   # Tabs principales (autenticado)
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Dashboard
│   │   ├── portfolio.tsx         # Lista de activos
│   │   ├── analysis.tsx          # Análisis y gráficos
│   │   ├── alerts.tsx            # Alertas de precio
│   │   └── settings.tsx          # Configuración
│   ├── paywall.tsx               # Modal de suscripción
│   └── ai-chat.tsx               # Chat con IA
│
├── src/
│   ├── components/
│   │   └── ui/                   # Componentes reutilizables
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── Input.tsx
│   │       └── AnimatedCounter.tsx
│   │
│   ├── constants/
│   │   └── theme.ts              # Colores, espaciado, tipografía
│   │
│   ├── hooks/
│   │   └── useTheme.ts           # Hook para tema claro/oscuro
│   │
│   ├── services/
│   │   ├── supabase.ts           # Cliente Supabase + helpers
│   │   └── prices/               # APIs de precios
│   │       ├── index.ts
│   │       ├── finnhub.ts
│   │       ├── coingecko.ts
│   │       └── metals.ts
│   │
│   ├── store/
│   │   ├── authStore.ts          # Estado de autenticación (Zustand)
│   │   └── portfolioStore.ts     # Estado del portafolio (Zustand)
│   │
│   ├── types/
│   │   └── database.ts           # Tipos TypeScript para DB
│   │
│   └── utils/
│       └── formatters.ts         # Formateo de moneda, fechas, etc.
│
├── docs/                         # Documentación
│   ├── README.md                 # Este archivo
│   ├── SETUP.md                  # Guía de configuración
│   ├── DATABASE.md               # Esquema de base de datos
│   └── API_KEYS.md               # Configuración de APIs
│
└── assets/                       # Recursos estáticos
    ├── fonts/
    └── images/
```

---

# 4. NAVEGACIÓN DE LA APP

## 4.1 Flujo de Navegación

```
┌─────────────────────────────────────────────────────────┐
│                    APP START                             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              ¿Usuario autenticado?                       │
└─────────────────────┬───────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │ NO                    │ SÍ
          ▼                       ▼
┌─────────────────┐     ┌─────────────────────────────────┐
│   (auth) GROUP  │     │         (tabs) GROUP            │
│                 │     │                                 │
│ ┌─────────────┐ │     │  ┌─────┬─────┬─────┬─────┬────┐│
│ │   Welcome   │ │     │  │Home │Port │Analy│Alert│Set ││
│ └──────┬──────┘ │     │  │     │folio│sis  │s    │ting││
│        │        │     │  └──┬──┴──┬──┴──┬──┴──┬──┴──┬─┘│
│        ▼        │     │     │     │     │     │     │  │
│ ┌─────────────┐ │     └─────┴─────┴─────┴─────┴─────┘  │
│ │   Sign In   │◄┼─────────────────────────────────────►│
│ └──────┬──────┘ │                                       │
│        │        │     ┌─────────────────────────────────┐
│        ▼        │     │        MODALS                   │
│ ┌─────────────┐ │     │  ┌─────────────┐               │
│ │   Sign Up   │ │     │  │   Paywall   │ (Suscripción) │
│ └─────────────┘ │     │  └─────────────┘               │
│                 │     │  ┌─────────────┐               │
│ ┌─────────────┐ │     │  │   AI Chat   │ (Asesor IA)   │
│ │  Forgot PW  │ │     │  └─────────────┘               │
│ └─────────────┘ │     └─────────────────────────────────┘
└─────────────────┘
```

## 4.2 Rutas Protegidas

El archivo `app/_layout.tsx` contiene el hook `useProtectedRoute()` que:
- Redirige a `/welcome` si no hay sesión activa
- Redirige a `/(tabs)` si ya está autenticado

---

# 5. MODELO DE DATOS

## 5.1 Tablas Principales

### profiles
```typescript
{
  id: string;                    // UUID del usuario
  email: string;
  display_name: string | null;
  preferred_currency: string;    // 'USD', 'EUR', etc.
  subscription_tier: 'free' | 'premium' | 'premium_plus';
  revenuecat_customer_id: string | null;
}
```

### portfolios
```typescript
{
  id: string;
  user_id: string;               // FK a profiles
  name: string;
  description: string | null;
  is_default: boolean;
}
```

### holdings (Activos)
```typescript
{
  id: string;
  portfolio_id: string;          // FK a portfolios
  asset_type: AssetType;         // 'stock', 'crypto', 'commodity_gold', etc.
  symbol: string | null;         // 'AAPL', 'BTC', null para real estate
  name: string;
  quantity: number;
  cost_basis: number | null;     // Precio de compra
  purchase_date: string | null;
  currency: string;

  // Para activos manuales (real estate, etc.)
  manual_price: number | null;

  // Para renta fija
  maturity_date: string | null;
  interest_rate: number | null;

  // Para bienes raíces
  property_address: string | null;
  property_type: 'residential' | 'commercial' | 'land' | null;
}
```

### alerts
```typescript
{
  id: string;
  user_id: string;
  holding_id: string;
  alert_type: 'price_above' | 'price_below' | 'percent_change' | 'maturity';
  target_value: number | null;
  is_active: boolean;
  triggered_at: string | null;
}
```

## 5.2 Tipos de Activos Soportados

```typescript
type AssetType =
  | 'stock'              // Acciones individuales
  | 'etf'                // ETFs
  | 'mutual_fund'        // Fondos mutuos
  | 'crypto'             // Criptomonedas
  | 'commodity_gold'     // Oro
  | 'commodity_silver'   // Plata
  | 'commodity_platinum' // Platino
  | 'fixed_income_bond'  // Bonos
  | 'fixed_income_cd'    // Certificados de depósito
  | 'real_estate'        // Bienes raíces
  | 'cash'               // Efectivo
  | 'other';             // Otros
```

---

# 6. MODELO DE MONETIZACIÓN

## 6.1 Tiers de Suscripción

| Feature | Free | Premium ($4.99/mes) | Premium+ ($9.99/mes) |
|---------|------|---------------------|----------------------|
| Activos máximos | 5 | Ilimitados | Ilimitados |
| Alertas de precio | 2 | Ilimitadas | Ilimitadas |
| Sync automático | Cada 24h | Cada hora | Tiempo real |
| Historial | 30 días | 2 años | 5 años |
| Export CSV/PDF | No | Sí | Sí |
| AI Advisor | No | No | Sí |
| Análisis avanzado | No | Básico | Completo |

## 6.2 Integración RevenueCat

RevenueCat maneja:
- Compras en App Store y Play Store
- Webhooks para sincronizar con Supabase
- Restauración de compras
- Ofertas y trials

---

# 7. ESTADO ACTUAL DEL DESARROLLO

## 7.1 Completado ✅

### Configuración Inicial
- [x] Proyecto Expo creado con template tabs
- [x] Dependencias instaladas (Supabase, RevenueCat, Zustand, etc.)
- [x] TypeScript configurado con path aliases (@/*)
- [x] Babel configurado con module-resolver
- [x] Estructura de carpetas creada

### Tipos y Servicios
- [x] Tipos de base de datos (database.ts)
- [x] Cliente Supabase con helpers de auth
- [x] Servicios de precios (Finnhub, CoinGecko, Metals)
- [x] Formateadores de moneda/fecha

### State Management
- [x] Auth Store (Zustand) - login, logout, session
- [x] Portfolio Store (Zustand) - holdings, summary

### Componentes UI
- [x] Button (variantes, tamaños, loading)
- [x] Input (con label, error, icons)
- [x] Card (shadow, padding, pressable)
- [x] AnimatedCounter (animación de valores)

### Pantallas de Auth
- [x] Welcome screen
- [x] Sign In screen
- [x] Sign Up screen
- [x] Forgot Password screen

### Pantallas de Tabs
- [x] Dashboard (resumen del portafolio)
- [x] Portfolio (lista de holdings)
- [x] Analysis (gráficos de distribución)
- [x] Alerts (lista de alertas)
- [x] Settings (perfil y preferencias)

### Pantallas Modales
- [x] Paywall (suscripción)
- [x] AI Chat (interfaz de chat)

### Sistema de Tema
- [x] Colores light/dark mode
- [x] Espaciado y tipografía
- [x] Sombras y bordes

## 7.2 Pendiente 🔲

### Configuración Externa (ACCIÓN REQUERIDA DEL USUARIO)
- [ ] Crear proyecto en Supabase
- [ ] Ejecutar schema SQL en Supabase
- [ ] Crear app en RevenueCat
- [ ] Obtener API keys (Finnhub, CoinGecko, Metals-API)
- [ ] Configurar variables de entorno

### Desarrollo Pendiente
- [ ] Pantalla de detalle de activo
- [ ] Bottom sheet para agregar activos
- [ ] Integración real con RevenueCat
- [ ] Integración real con OpenAI
- [ ] Sistema de notificaciones push
- [ ] Caché de precios en Supabase
- [ ] Edge Functions para actualización de precios

### Polish
- [ ] Animaciones de transición
- [ ] Haptic feedback
- [ ] Onboarding flow
- [ ] Empty states
- [ ] Loading skeletons
- [ ] Error handling UI

---

# 8. PRÓXIMOS PASOS

Ver el archivo `SETUP.md` para instrucciones detalladas de configuración.
