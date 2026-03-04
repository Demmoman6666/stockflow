import { Product, ProductWithForecast, ForecastSettings, ABCClass, StockStatus } from './types'

export function calculateForecasts(
  products: Product[],
  sales30d: Record<string, number>,
  settings: ForecastSettings
): ProductWithForecast[] {
  const { daysOfStock, lookbackDays, leadTimeDays, safetyBuffer, model } = settings

  // Calculate total revenue per SKU for ABC classification
  const revenues = products.map(p => ({
    sku: p.sku,
    rev: (sales30d[p.sku] ?? 0) * p.retail,
  }))
  revenues.sort((a, b) => b.rev - a.rev)
  const totalRev = revenues.reduce((s, r) => s + r.rev, 0)
  let cumRev = 0
  const abcMap: Record<string, ABCClass> = {}
  for (const r of revenues) {
    cumRev += r.rev
    const pct = totalRev > 0 ? cumRev / totalRev : 1
    abcMap[r.sku] = pct < 0.7 ? 'A' : pct < 0.9 ? 'B' : 'C'
  }

  return products.map(p => {
    const rawSales = sales30d[p.sku] ?? 0
    // Adjust velocity by lookback ratio and model
    let scaledSales = rawSales * (lookbackDays / 30)
    let dailyVelocity = lookbackDays > 0 ? scaledSales / lookbackDays : 0

    if (model === 'trend') dailyVelocity *= 1.12
    else if (model === 'seasonal') dailyVelocity *= (0.88 + (Math.sin(Date.now() / 1e10) * 0.2))
    else if (model === 'conservative') dailyVelocity *= 0.85

    dailyVelocity = Math.max(0, dailyVelocity)

    const effectiveLead = p.leadTimeDays ?? leadTimeDays
    const daysLeft = dailyVelocity > 0 ? Math.floor(p.stock / dailyVelocity) : 9999
    const targetStock = dailyVelocity * daysOfStock * (1 + safetyBuffer)
    const safetyStockQty = dailyVelocity * effectiveLead * safetyBuffer
    const replenishQty = Math.max(0, Math.ceil(targetStock - p.stock))

    // Reorder date = when stock will hit safety stock level
    const daysToReorder = Math.max(0, daysLeft - effectiveLead)
    const reorderDate = new Date()
    reorderDate.setDate(reorderDate.getDate() + daysToReorder)
    const reorderStr = daysLeft < 9999
      ? reorderDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
      : '—'

    // Status
    let status: StockStatus = 'ok'
    if (p.stock === 0) status = 'oos'
    else if (daysLeft <= 7) status = 'urgent'
    else if (daysLeft <= 14) status = 'low'
    else if (daysLeft > daysOfStock * 1.3) status = 'overstock'

    return {
      ...p,
      sales30d: rawSales,
      dailyVelocity: Math.round(dailyVelocity * 100) / 100,
      daysLeft: daysLeft === 9999 ? 9999 : daysLeft,
      replenishQty,
      forecastCostValue: Math.round(replenishQty * p.cost * 100) / 100,
      forecastRetailValue: Math.round(replenishQty * p.retail * 100) / 100,
      reorderDate: reorderStr,
      abc: abcMap[p.sku] ?? 'C',
      status,
    }
  })
}

export function formatCurrency(v: number, symbol = '£') {
  return symbol + v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDays(d: number) {
  if (d >= 9999) return '∞'
  return d.toString()
}
