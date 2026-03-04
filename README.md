# StockFlow — Intelligent Replenishment

Multi-store inventory forecasting and purchase order management. Connects to your Shopify stores and pushes purchase orders directly to Linnworks.

## Features

- 📦 **Replenishment forecasting** with custom days-of-stock, lookback period, lead time, safety stock buffer
- 🏪 **Dual Shopify store** support — unified view across both stores
- 📊 **ABC classification** (A/B/C) based on revenue contribution
- 🔴 **Stock status alerts** — OOS, Urgent, Low, OK, Overstock
- 🛒 **Purchase order builder** with per-line qty adjustments
- 📤 **Linnworks integration** — push POs directly via API
- 📈 **Analytics** — velocity, at-risk items, ABC analysis
- 📥 **CSV export** of replenishment data
- 🌙 **Works in demo mode** without API keys (uses your real SKU data)

---

## Quick Start (Local Dev)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/stockflow.git
cd stockflow

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your API keys

# 4. Run dev server
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel (5 minutes)

### Option A — GitHub + Vercel UI (recommended)

1. **Push to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial StockFlow setup"
   git remote add origin https://github.com/Demmoman6666/stockflow.git
   git push -u origin main
   ```

2. **Deploy on Vercel:**
   - Go to [vercel.com](https://vercel.com) → New Project
   - Import your `stockflow` GitHub repo
   - Framework: **Next.js** (auto-detected)
   - Add Environment Variables (see below)
   - Click **Deploy**

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel --prod
```

---

## Environment Variables

Add these in **Vercel Project Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `SHOPIFY_STORE1_DOMAIN` | `yourstore.myshopify.com` |
| `SHOPIFY_STORE1_ACCESS_TOKEN` | Shopify Admin API token (shpat_...) |
| `SHOPIFY_STORE2_DOMAIN` | Second store domain |
| `SHOPIFY_STORE2_ACCESS_TOKEN` | Second store token |
| `LINNWORKS_APP_ID` | Linnworks Application ID |
| `LINNWORKS_APP_SECRET` | Linnworks Application Secret |
| `LINNWORKS_TOKEN` | Linnworks Session Token |

**Without any env vars**, the app runs in demo mode with your existing product data — fully functional for testing.

---

## Getting Shopify API Credentials

1. Go to your Shopify Admin → **Settings → Apps and sales channels**
2. Click **Develop apps** → **Create an app**
3. Name it `StockFlow`
4. Under **Configuration**, grant these Admin API scopes:
   - `read_products`
   - `read_orders`
   - `read_inventory`
5. **Install** the app → copy the **Admin API access token**
6. Repeat for Store 2

---

## Getting Linnworks Credentials

1. Log in to [linnworks.net](https://linnworks.net)
2. Go to **Settings → API → Application Keys**
3. Create a new application
4. Copy the **Application ID**, **Application Secret**
5. Generate a **Session Token**

---

## Project Structure

```
stockflow/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── shopify/route.ts     ← Fetches products + sales from Shopify
│   │   │   ├── linnworks/route.ts   ← Pushes POs to Linnworks
│   │   │   └── sync/route.ts        ← Manual cache invalidation
│   │   ├── page.tsx                 ← Main app (all pages)
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── SettingsBar.tsx
│   │   ├── ReplenishmentTable.tsx
│   │   └── POModal.tsx
│   └── lib/
│       ├── types.ts                 ← All TypeScript types
│       ├── forecast.ts              ← Forecasting engine
│       ├── shopify.ts               ← Shopify API client
│       ├── linnworks.ts             ← Linnworks API client
│       └── demoData.ts              ← Your real SKU demo data
├── .env.local.example
├── .gitignore                       ← .env.local is gitignored
└── README.md
```

---

## Forecast Calculation

**Sales Velocity** (default):
```
daily_velocity = sales_in_lookback_period / lookback_days
days_left = current_stock / daily_velocity
target_stock = daily_velocity × days_of_stock × (1 + safety_buffer)
order_qty = max(0, target_stock - current_stock)
```

**Reorder Date:**
```
reorder_date = today + (days_left - lead_time_days)
```

Models available: `velocity`, `trend` (+12%), `seasonal`, `conservative` (−15%)

---

## ABC Classification

Based on revenue contribution (sales × retail price) over the lookback period:
- **A** = Top 70% of revenue
- **B** = Next 20%  
- **C** = Bottom 10%
