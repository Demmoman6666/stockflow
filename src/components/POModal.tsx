'use client'
import { useState, useEffect } from 'react'
import { ProductWithForecast, PurchaseOrder, POLine } from '@/lib/types'
import { formatCurrency } from '@/lib/forecast'

interface Props {
  open: boolean
  onClose: () => void
  products: ProductWithForecast[]
  selectedSKUs: Set<string>
  onPOCreated: (po: PurchaseOrder) => void
  linnworksConnected: boolean
}

export default function POModal({ open, onClose, products, selectedSKUs, onPOCreated, linnworksConnected }: Props) {
  const [qtys, setQtys] = useState<Record<string, number>>({})
  const [vendor, setVendor] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [date, setDate] = useState('')
  const [delivery, setDelivery] = useState('')
  const [notes, setNotes] = useState('')
  const [pushing, setPushing] = useState(false)
  const [pushResult, setPushResult] = useState<string | null>(null)

  const selected = products.filter(p => selectedSKUs.has(p.sku) && p.replenishQty > 0)

  useEffect(() => {
    if (!open) return
    const today = new Date()
    const del = new Date(today); del.setDate(del.getDate() + 30)
    setDate(today.toISOString().split('T')[0])
    setDelivery(del.toISOString().split('T')[0])
    const num = 'PO-' + String(Date.now()).slice(-5)
    setPoNumber(num)
    setPushResult(null)
    // Init quantities
    const init: Record<string, number> = {}
    products.filter(p => selectedSKUs.has(p.sku)).forEach(p => { init[p.sku] = p.replenishQty })
    setQtys(init)
    // Auto-set vendor if all selected are same vendor
    const vendors = [...new Set(products.filter(p => selectedSKUs.has(p.sku)).map(p => p.vendor))]
    if (vendors.length === 1) setVendor(vendors[0])
    else setVendor('')
  }, [open, selectedSKUs])

  const lines: POLine[] = selected.map(p => ({
    sku: p.sku, name: p.name, qty: qtys[p.sku] ?? p.replenishQty,
    cost: p.cost, retail: p.retail, store: p.store,
  }))

  const totalCost = lines.reduce((s, l) => s + l.qty * l.cost, 0)
  const totalRetail = lines.reduce((s, l) => s + l.qty * l.retail, 0)

  const buildPO = (status: PurchaseOrder['status']): PurchaseOrder => ({
    id: 'po-' + Date.now(),
    number: poNumber,
    vendor, date, expectedDelivery: delivery, notes, lines,
    totalCost, totalRetail, status,
    linnworksPushed: status === 'pushed',
    createdAt: new Date().toISOString(),
  })

  const handleSaveDraft = () => {
    onPOCreated(buildPO('draft'))
    onClose()
  }

  const handlePushToLinnworks = async () => {
    setPushing(true)
    setPushResult(null)
    try {
      const po = buildPO('pushed')
      const res = await fetch('/api/linnworks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(po),
      })
      const data = await res.json()
      if (data.success) {
        setPushResult('✅ Successfully pushed to Linnworks! Order ID: ' + (data.lwOrderId || 'N/A'))
        onPOCreated({ ...po, linnworksPushed: true })
        setTimeout(onClose, 2000)
      } else {
        setPushResult('❌ ' + (data.error || 'Push failed'))
      }
    } catch (err: any) {
      setPushResult('❌ Network error: ' + err.message)
    } finally {
      setPushing(false)
    }
  }

  if (!open) return null

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
      zIndex:200, display:'flex', alignItems:'center', justifyContent:'center',
      backdropFilter:'blur(4px)',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:16, width:680, maxWidth:'95vw', maxHeight:'88vh',
        overflow:'hidden', display:'flex', flexDirection:'column',
      }}>
        {/* Header */}
        <div style={{ padding:'18px 22px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div style={{ fontFamily:'Syne,sans-serif', fontSize:16, fontWeight:700 }}>Create Purchase Order</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:'var(--text2)', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:'20px 22px', overflowY:'auto', flex:1 }}>
          {/* Form fields */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:16 }}>
            <Field label="PO Number"><input style={inp} value={poNumber} onChange={e => setPoNumber(e.target.value)} /></Field>
            <Field label="Vendor"><input style={inp} value={vendor} onChange={e => setVendor(e.target.value)} placeholder="e.g. My Organics" /></Field>
            <Field label="Order Date"><input type="date" style={inp} value={date} onChange={e => setDate(e.target.value)} /></Field>
            <Field label="Expected Delivery"><input type="date" style={inp} value={delivery} onChange={e => setDelivery(e.target.value)} /></Field>
            <Field label="Notes" style={{ gridColumn:'1 / -1' }}>
              <input style={inp} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional..." />
            </Field>
          </div>

          {/* Lines */}
          <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)', fontWeight:600, marginBottom:8 }}>
            Order Lines ({lines.length} SKUs)
          </div>
          {lines.length === 0 && (
            <div style={{ textAlign:'center', padding:'30px', color:'var(--text3)', fontSize:13 }}>No items with replenishment quantity. Adjust your settings.</div>
          )}
          <div style={{ maxHeight:260, overflowY:'auto', marginBottom:12 }}>
            {lines.map(line => (
              <div key={line.sku} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:500 }}>{line.name}</div>
                  <div style={{ fontSize:10, color:'var(--text3)', fontFamily:'DM Mono,monospace' }}>SKU: {line.sku} · {line.store === 'store1' ? 'Store 1' : 'Store 2'}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginLeft:16 }}>
                  <span style={{ fontSize:11, color:'var(--text3)' }}>{formatCurrency(line.cost)} ea</span>
                  <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                    <Adj onClick={() => setQtys(q => ({ ...q, [line.sku]: Math.max(0, (q[line.sku] ?? line.qty) - 1) }))}>−</Adj>
                    <input
                      type="number"
                      value={qtys[line.sku] ?? line.qty}
                      onChange={e => setQtys(q => ({ ...q, [line.sku]: parseInt(e.target.value) || 0 }))}
                      style={{ width:65, textAlign:'center', background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text)', padding:'4px', borderRadius:5, fontFamily:'DM Mono,monospace', fontSize:13, outline:'none' }}
                    />
                    <Adj onClick={() => setQtys(q => ({ ...q, [line.sku]: (q[line.sku] ?? line.qty) + 1 }))}>＋</Adj>
                  </div>
                  <span style={{ fontSize:13, fontFamily:'DM Mono,monospace', fontWeight:600, width:70, textAlign:'right' }}>
                    {formatCurrency((qtys[line.sku] ?? line.qty) * line.cost)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderTop:'1px solid var(--border)' }}>
            <div style={{ fontSize:12, color:'var(--text2)' }}>
              Retail value: <span style={{ color:'var(--text)', fontWeight:600 }}>{formatCurrency(totalRetail)}</span>
            </div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:22, fontWeight:700, color:'var(--accent)' }}>
              Cost: {formatCurrency(totalCost)}
            </div>
          </div>

          {/* Push result */}
          {pushResult && (
            <div style={{ padding:'10px 14px', borderRadius:8, marginTop:10, background: pushResult.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border:`1px solid ${pushResult.startsWith('✅') ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, fontSize:13 }}>
              {pushResult}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'14px 22px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose} style={ghostBtn}>Cancel</button>
          <button onClick={handleSaveDraft} style={ghostBtn}>Save Draft</button>
          <button onClick={handlePushToLinnworks} disabled={pushing || lines.length === 0} style={{
            ...greenBtn, opacity: pushing || lines.length === 0 ? 0.6 : 1,
            display:'flex', alignItems:'center', gap:7,
          }}>
            {pushing ? <><span className="spinner" />Pushing...</> : '📦 Push to Linnworks'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, ...style }}>
      <label style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)', fontWeight:600 }}>{label}</label>
      {children}
    </div>
  )
}

function Adj({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width:24, height:24, background:'var(--surface3)', border:'none', color:'var(--text)', borderRadius:4, cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>
      {children}
    </button>
  )
}

const inp: React.CSSProperties = {
  background:'var(--surface2)', border:'1px solid var(--border)',
  color:'var(--text)', padding:'8px 12px', borderRadius:7,
  fontSize:13, fontFamily:'inherit', outline:'none', width:'100%',
}

const ghostBtn: React.CSSProperties = {
  padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:500,
  cursor:'pointer', border:'1px solid var(--border)',
  background:'var(--surface2)', color:'var(--text2)', fontFamily:'inherit',
}

const greenBtn: React.CSSProperties = {
  padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:500,
  cursor:'pointer', border:'1px solid rgba(34,197,94,0.35)',
  background:'rgba(34,197,94,0.15)', color:'var(--green)', fontFamily:'inherit',
}
