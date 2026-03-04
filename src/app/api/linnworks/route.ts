import { NextRequest, NextResponse } from 'next/server'
import { pushPurchaseOrderToLinnworks, isLinnworksConfigured } from '@/lib/linnworks'
import { PurchaseOrder } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  if (!isLinnworksConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Linnworks not configured. Add LINNWORKS_APP_ID, LINNWORKS_APP_SECRET, and LINNWORKS_TOKEN to your environment variables.' },
      { status: 400 }
    )
  }

  try {
    const po: PurchaseOrder = await req.json()
    if (!po || !po.lines?.length) {
      return NextResponse.json({ success: false, error: 'Invalid purchase order data' }, { status: 400 })
    }

    const result = await pushPurchaseOrderToLinnworks(po)
    if (result.success) {
      return NextResponse.json({ success: true, lwOrderId: result.lwOrderId })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ configured: isLinnworksConfigured() })
}
