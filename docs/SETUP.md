# Guía de Configuración - VESTA

Esta guía explica todo lo que necesitas hacer de tu parte para que la app funcione.

---

## PASO 1: Configurar Supabase

### 1.1 Crear Proyecto

1. Ve a https://supabase.com
2. Crea una cuenta o inicia sesión
3. Click en "New Project"
4. Completa:
   - **Name:** vesta-portfolio
   - **Database Password:** (guarda esto en un lugar seguro)
   - **Region:** Selecciona la más cercana a ti
5. Click "Create new project" y espera ~2 minutos

### 1.2 Obtener Credenciales

Una vez creado el proyecto:

1. Ve a **Settings** (icono de engranaje) → **API**
2. Copia estos valores:
   - **Project URL** (ej: `https://xxxxx.supabase.co`)
   - **anon public key** (empieza con `eyJ...`)

### 1.3 Ejecutar Schema SQL

1. En Supabase, ve a **SQL Editor** (icono de terminal)
2. Click en **+ New query**
3. Copia y pega TODO el contenido del archivo `DATABASE.md` (sección SQL)
4. Click **Run** (o Cmd+Enter)
5. Verifica que diga "Success. No rows returned" para cada comando

---

## PASO 2: Configurar RevenueCat

### 2.1 Crear Proyecto

1. Ve a https://app.revenuecat.com
2. Crea una cuenta o inicia sesión
3. Click en **+ New Project**
4. Nombre: "Vesta"

### 2.2 Configurar Plataformas

#### Para iOS:
1. En RevenueCat, ve a **Apps** → **+ New**
2. Selecciona **Apple App Store**
3. Necesitarás:
   - Bundle ID de tu app
   - Shared Secret de App Store Connect

#### Para Android:
1. En RevenueCat, ve a **Apps** → **+ New**
2. Selecciona **Google Play Store**
3. Necesitarás:
   - Package Name de tu app
   - Service Account JSON de Google Play Console

### 2.3 Crear Productos

1. Ve a **Products** → **Entitlements**
2. Crea un entitlement llamado: `premium`
3. Crea otro entitlement llamado: `premium_plus`

4. Ve a **Products** → **Offerings**
5. Crea los productos:
   - `vesta_premium_monthly` → $4.99/mes
   - `vesta_premium_plus_monthly` → $9.99/mes

### 2.4 Obtener API Key

1. Ve a **Project Settings** → **API Keys**
2. Copia el **Public SDK Key** (empieza con `appl_` o `goog_`)

---

## PASO 3: Obtener API Keys de Precios

### 3.1 Finnhub (Stocks)

1. Ve a https://finnhub.io
2. Crea una cuenta gratuita
3. En el dashboard, copia tu **API Key**
4. Límite gratuito: 60 requests/minuto

### 3.2 CoinGecko (Crypto)

1. Ve a https://www.coingecko.com/en/api
2. El plan gratuito NO requiere API key
3. Pero si quieres más requests, crea cuenta en CoinGecko
4. Límite gratuito: 10-50 requests/minuto

### 3.3 Metals-API (Oro, Plata, Platino)

1. Ve a https://metals-api.com
2. Crea una cuenta gratuita
3. En el dashboard, copia tu **Access Key**
4. Límite gratuito: 100 requests/mes

> **Nota:** Para desarrollo, puedes usar datos mock mientras no tengas las API keys.

---

## PASO 4: Configurar OpenAI (AI Advisor)

1. Ve a https://platform.openai.com
2. Crea una cuenta o inicia sesión
3. Ve a **API Keys** → **Create new secret key**
4. Copia la key (solo se muestra una vez)
5. Añade créditos ($5-10 es suficiente para desarrollo)

---

## PASO 5: Variables de Entorno

### 5.1 Crear archivo .env

En la raíz del proyecto (`vesta/`), crea un archivo llamado `.env`:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# RevenueCat
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=appl_xxxxxxxxxx
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=goog_xxxxxxxxxx

# Price APIs
EXPO_PUBLIC_FINNHUB_API_KEY=xxxxxxxxxx
EXPO_PUBLIC_COINGECKO_API_KEY=           # Opcional, dejar vacío si no tienes
EXPO_PUBLIC_METALS_API_KEY=xxxxxxxxxx

# OpenAI
EXPO_PUBLIC_OPENAI_API_KEY=sk-xxxxxxxxxx
```

### 5.2 Verificar .gitignore

Asegúrate de que `.env` esté en `.gitignore`:

```bash
echo ".env" >> .gitignore
```

---

## PASO 6: Ejecutar la App

### 6.1 Instalar Dependencias

```bash
cd vesta
npm install
```

### 6.2 Iniciar Expo

```bash
npx expo start
```

### 6.3 Probar en Dispositivo

- **iOS Simulator:** Presiona `i` en la terminal
- **Android Emulator:** Presiona `a` en la terminal
- **Dispositivo físico:** Escanea el QR con Expo Go

---

## Troubleshooting

### Error: "supabase is not defined"
- Verifica que las variables de entorno estén correctas
- Reinicia Expo con `npx expo start --clear`

### Error: "Network request failed"
- Verifica tu conexión a internet
- Verifica que la URL de Supabase sea correcta

### Error: RevenueCat "Invalid API key"
- Verifica que estés usando la key correcta para la plataforma
- iOS usa `appl_...`, Android usa `goog_...`

### Los precios no cargan
- Verifica que las API keys estén configuradas
- Revisa los límites de rate limiting
- Usa datos mock para desarrollo

---

## Recursos Útiles

- [Documentación Expo](https://docs.expo.dev)
- [Documentación Supabase](https://supabase.com/docs)
- [Documentación RevenueCat](https://docs.revenuecat.com)
- [API Finnhub](https://finnhub.io/docs/api)
- [API CoinGecko](https://www.coingecko.com/en/api/documentation)
