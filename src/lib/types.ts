export type StoreId = 'store1' | 'store2'
export type ABCClass = 'A' | 'B' | 'C'
export type StockStatus = 'oos' | 'urgent' | 'low' | 'ok' | 'overstock'
export type POStatus = 'draft' | 'sent' | 'pushed' | 'received'
export type ForecastModel = 'velocity' | 'trend' | 'seasonal' | 'conservative'

export interface Product {
  sku: string
  name: string
  vendor: string
  store: StoreId
  stock: number
  cost: number
  retail: number
  barcode?: string
  leadTimeDays?: number
  moq?: number
}

export interface ProductWithForecast extends Product {
  sales30d: number
  dailyVelocity: number
  daysLeft: number
  replenishQty: number
  forecastCostValue: number
  forecastRetailValue: number
  reorderDate: string
  abc: ABCClass
  status: StockStatus
}

export interface ForecastSettings {
  daysOfStock: number
  lookbackDays: number
  leadTimeDays: number
  safetyBuffer: number
  model: ForecastModel
  storeFilter: 'all' | StoreId
}

export interface POLine {
  sku: string
  name: string
  qty: number
  cost: number
  retail: number
  store: StoreId
}

export interface PurchaseOrder {
  id: string
  number: string
  vendor: string
  date: string
  expectedDelivery: string
  notes: string
  lines: POLine[]
  totalCost: number
  totalRetail: number
  status: POStatus
  linnworksPushed: boolean
  createdAt: string
}

export interface Vendor {
  id: string
  name: string
  email: string
  leadTimeDays: number
  minOrderValue: number
  paymentTerms: string
  currency: string
}

export interface ShopifyOrder {
  id: string
  created_at: string
  line_items: { sku: string; quantity: number; price: string }[]
}

export interface ShopifyProduct {
  id: string
  title: string
  variants: {
    id: string
    sku: string
    inventory_quantity: number
    price: string
    compare_at_price: string | null
  }[]
  vendor: string
}

export interface LinnworksStockItem {
  SKU: string
  ItemTitle: string
  Quantity: number
  StockValue: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  source: 'live' | 'demo'
}
