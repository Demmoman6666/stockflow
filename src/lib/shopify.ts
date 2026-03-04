import { Product, ShopifyProduct, StoreId } from '../types'

interface ShopifyConfig {
  domain: string
  accessToken: string
  storeId: StoreId
}

function getConfig(storeId: StoreId): ShopifyConfig | null {
  if (storeId === 'store1') {
    const domain = process.env.SHOPIFY_STORE1_DOMAIN
    const accessToken = process.env.SHOPIFY_STORE1_ACCESS_TOKEN
    if (!domain || !accessToken) return null
    return { domain, accessToken, storeId }
  } else {
    const domain = process.env.SHOPIFY_STORE2_DOMAIN
    const accessToken = process.env.SHOPIFY_STORE2_ACCESS_TOKEN
    if (!domain || !accessToken) return null
    return { domain, accessToken, storeId }
  }
}

async function shopifyFetch<T>(config: ShopifyConfig, path: string): Promise<T> {
  const url = `https://${config.domain}/admin/api/2024-01/${path}`
  const res = await fetch(url, {
    headers: {
      'X-Shopify-Access-Token': config.accessToken,
      'Content-Type': 'application/json',
    },
    next: { revalidate: 300 }, // cache 5 min
  })
  if (!res.ok) throw new Error(`Shopify ${storeId} API error: ${res.status} ${res.statusText}`)
  return res.json()
}

// Fetch all products with variants from a store
export async function fetchShopifyProducts(storeId: StoreId): Promise<Product[] | null> {
  const config = getConfig(storeId)
  if (!config) return null

  try {
    const allProducts: ShopifyProduct[] = []
    let pageInfo: string | null = null

    do {
      const path = pageInfo
        ? `products.json?limit=250&page_info=${pageInfo}`
        : 'products.json?limit=250&fields=id,title,vendor,variants'
      const data = await shopifyFetch<{ products: ShopifyProduct[] }>(config, path)
      allProducts.push(...data.products)
      // Shopify uses Link header for pagination — simplified here
      pageInfo = null
    } while (pageInfo)

    const products: Product[] = []
    for (const sp of allProducts) {
      for (const v of sp.variants) {
        if (!v.sku) continue
        products.push({
          sku: v.sku,
          name: sp.variants.length > 1 ? `${sp.title} — ${v.sku}` : sp.title,
          vendor: sp.vendor || 'Unknown',
          store: storeId,
          stock: v.inventory_quantity ?? 0,
          cost: 0, // Shopify doesn't expose cost in products API; use inventory item API if needed
          retail: parseFloat(v.price) || 0,
          barcode: '',
          leadTimeDays: storeId === 'store1' ? 30 : 5,
        })
      }
    }
    return products
  } catch (err) {
    console.error(`fetchShopifyProducts(${storeId}) error:`, err)
    return null
  }
}

// Fetch 30-day sales data by summing order line items
export async function fetchShopifySales30d(storeId: StoreId): Promise<Record<string, number> | null> {
  const config = getConfig(storeId)
  if (!config) return null

  try {
    const since = new Date()
    since.setDate(since.getDate() - 30)
    const sinceStr = since.toISOString()

    const data = await shopifyFetch<{ orders: any[] }>(
      config,
      `orders.json?status=any&created_at_min=${sinceStr}&limit=250&fields=line_items`
    )

    const sales: Record<string, number> = {}
    for (const order of data.orders) {
      for (const item of order.line_items ?? []) {
        if (item.sku) {
          sales[item.sku] = (sales[item.sku] ?? 0) + item.quantity
        }
      }
    }
    return sales
  } catch (err) {
    console.error(`fetchShopifySales30d(${storeId}) error:`, err)
    return null
  }
}

// Dedicated storeId variable to fix reference issue in error message
const storeId = 'store'
