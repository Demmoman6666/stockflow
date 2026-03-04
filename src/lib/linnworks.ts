import { PurchaseOrder } from './types'

const LW_BASE = 'https://api.linnworks.net/api'

interface LinnworksSession {
  Token: string
  Server: string
}

let _session: LinnworksSession | null = null

async function getSession(): Promise<LinnworksSession | null> {
  const appId = process.env.LINNWORKS_APP_ID
  const appSecret = process.env.LINNWORKS_APP_SECRET
  const token = process.env.LINNWORKS_TOKEN

  if (!appId || !appSecret || !token) return null

  if (_session) return _session

  try {
    const res = await fetch(`${LW_BASE}/Auth/AuthorizeByApplication`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        ApplicationId: appId,
        ApplicationSecret: appSecret,
        Token: token,
      }),
    })
    if (!res.ok) throw new Error(`Linnworks auth failed: ${res.status}`)
    _session = await res.json()
    return _session
  } catch (err) {
    console.error('Linnworks auth error:', err)
    return null
  }
}

async function lwFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const session = await getSession()
  if (!session) throw new Error('Linnworks not configured')

  const res = await fetch(`${session.Server}${path}`, {
    method: 'POST',
    headers: {
      Authorization: session.Token,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(
      Object.fromEntries(Object.entries(body).map(([k, v]) => [k, JSON.stringify(v)]))
    ),
  })
  if (!res.ok) throw new Error(`Linnworks API error: ${res.status}`)
  return res.json()
}

// Push a purchase order to Linnworks
export async function pushPurchaseOrderToLinnworks(po: PurchaseOrder): Promise<{ success: boolean; lwOrderId?: string; error?: string }> {
  try {
    const session = await getSession()
    if (!session) return { success: false, error: 'Linnworks not configured — add credentials in Settings' }

    // Step 1: Create the PO
    const createRes = await lwFetch<{ PurchaseOrderId: string }>('/api/PurchaseOrder/CreatePurchaseOrder', {
      purchaseOrder: {
        ExternalInvoiceNumber: po.number,
        Notes: po.notes || '',
        PlacedOn: po.date,
        DeliveryDate: po.expectedDelivery,
        VendorName: po.vendor,
        Status: 'OPEN',
      }
    })

    const lwOrderId = createRes.PurchaseOrderId

    // Step 2: Add line items
    for (const line of po.lines) {
      await lwFetch('/api/PurchaseOrder/AddPurchaseOrderItem', {
        purchaseOrderId: lwOrderId,
        item: {
          SKU: line.sku,
          ItemTitle: line.name,
          Quantity: line.qty,
          CostPrice: line.cost,
        }
      })
    }

    return { success: true, lwOrderId }
  } catch (err: any) {
    console.error('pushPurchaseOrderToLinnworks error:', err)
    return { success: false, error: err.message }
  }
}

// Fetch stock levels from Linnworks (optional cross-reference)
export async function fetchLinnworksStock(): Promise<Record<string, number> | null> {
  try {
    const data = await lwFetch<{ StockItems: { SKU: string; Quantity: number }[] }>(
      '/api/Stock/GetStockItemsFull',
      { request: { PageNumber: 1, EntriesPerPage: 2000 } }
    )
    const map: Record<string, number> = {}
    for (const item of data.StockItems ?? []) {
      map[item.SKU] = item.Quantity
    }
    return map
  } catch (err) {
    console.error('fetchLinnworksStock error:', err)
    return null
  }
}

export function isLinnworksConfigured(): boolean {
  return !!(
    process.env.LINNWORKS_APP_ID &&
    process.env.LINNWORKS_APP_SECRET &&
    process.env.LINNWORKS_TOKEN
  )
}
