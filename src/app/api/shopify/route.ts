import { NextResponse } from 'next/server'
import { fetchShopifyProducts, fetchShopifySales30d } from '@/lib/shopify'
import { DEMO_PRODUCTS, DEMO_SALES_30D } from '@/lib/demoData'
import { Product } from '@/lib/types'

export const runtime = 'nodejs'
export const revalidate = 300 // 5 min cache

export async function GET() {
  const store1Configured = !!(process.env.SHOPIFY_STORE1_DOMAIN && process.env.SHOPIFY_STORE1_ACCESS_TOKEN)
  const store2Configured = !!(process.env.SHOPIFY_STORE2_DOMAIN && process.env.SHOPIFY_STORE2_ACCESS_TOKEN)

  // If no stores configured, return demo data
  if (!store1Configured && !store2Configured) {
    return NextResponse.json({
      products: DEMO_PRODUCTS,
      sales30d: DEMO_SALES_30D,
      source: 'demo',
      stores: { store1: false, store2: false },
    })
  }

  const products: Product[] = []
  const sales30d: Record<string, number> = {}
  const stores = { store1: false, store2: false }

  // Fetch Store 1
  if (store1Configured) {
    const [p1, s1] = await Promise.allSettled([
      fetchShopifyProducts('store1'),
      fetchShopifySales30d('store1'),
    ])
    if (p1.status === 'fulfilled' && p1.value) {
      products.push(...p1.value)
      stores.store1 = true
    }
    if (s1.status === 'fulfilled' && s1.value) {
      Object.assign(sales30d, s1.value)
    }
  }

  // Fetch Store 2
  if (store2Configured) {
    const [p2, s2] = await Promise.allSettled([
      fetchShopifyProducts('store2'),
      fetchShopifySales30d('store2'),
    ])
    if (p2.status === 'fulfilled' && p2.value) {
      products.push(...p2.value)
      stores.store2 = true
    }
    if (s2.status === 'fulfilled' && s2.value) {
      Object.assign(sales30d, s2.value)
    }
  }

  // If live fetch failed entirely, fall back to demo
  if (products.length === 0) {
    return NextResponse.json({
      products: DEMO_PRODUCTS,
      sales30d: DEMO_SALES_30D,
      source: 'demo',
      stores,
    })
  }

  return NextResponse.json({ products, sales30d, source: 'live', stores })
}
