import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export async function POST() {
  revalidatePath('/api/shopify')
  return NextResponse.json({ success: true, synced: new Date().toISOString() })
}
