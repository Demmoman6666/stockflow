'use client'
import { useState, useMemo } from 'react'
import { ProductWithForecast, ABCClass, StockStatus } from '@/lib/types'
import { formatCurrency, formatDays } from '@/lib/forecast'

interface Props {
  products: ProductWithForecast[]
  selectedSKUs: Set<string>
  onToggleSKU: (sku: string, checked: boolean) => void
  onSelectAll: () => void
  onAddToPO: () => void
  onQuickPO: (sku: string) => void
}

type FilterType = 'all' | 'urgent' | 'low' | 'ok' | 'overstock'
type SortField = 'sku' | 'name' | 'stock' | 'daysLeft' | 'dailyVelocity' | 'replenishQty' | 'forecastCostValue' | 'abc' | 'status'

const STATUS_BADGE: Record<StockStatus, { label: string; bg: string; color: string; border: string }> = {
  oos:       { label: 'OOS',       bg:'var(--red-soft)',   color:'var(--red)',   border:'rgba(244,63,94,0.25)' },
  urgent:    { label: 'Urgent',    bg:'var(--red-soft)',   color:'var(--red)',   border:'rgba(244,63,94,0.25)' },
  low:       { label: 'Low',       bg:'var(--amber-soft)', color:'var(--amber)', border:'rgba(245,158,11,0.25)' },
  ok:        { label: 'OK',        bg:'var(--green-soft)', color:'var(--green)', border:'rgba(16,185,129,0.25)' },
  overstock: { label: 'Overstock', bg:'var(--accent-soft)',color:'var(--accent)',border:'rgba(99,102,241,0.25)' },
}

const ABC_COLOR: Record<ABCClass, string> = { A: 'var(--green)', B: 'var(--amber)', C: 'var(--text3)' }
const PAGE_SIZE = 25

// Generates fake weekly sparkline data for demo; real data would come from API
function getSparkData(sku: string, sales30d: number): number[] {
  const seed = sku.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  const base = sales30d / 4
  return Array.from({ length: 8 }, (_, i) => {
    const rand = Math.sin(seed + i * 7.3) * 0.4 + 0.8
    return Math.max(0, Math.round(base * rand))
  })
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1)
  const W = 80, H = 28
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - (v / max) * H}`)
  return (
    <svg width={W} height={H} style={{ display:'block' }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.8}
      />
      {data.map((v, i) => (
        <circle
          key={i}
          cx={(i / (data.length - 1)) * W}
          cy={H - (v / max) * H}
          r={2}
          fill={color}
          opacity={0.6}
        />
      ))}
    </svg>
  )
}

function SalesTooltip({ product }: { product: ProductWithForecast }) {
  const weeks = getSparkData(product.sku, product.sales30d)
  const total = weeks.reduce((a, b) => a + b, 0)
  const sparkColor = product.status === 'oos' || product.status === 'urgent' ? 'var(--red)'
    : product.status === 'low' ? 'var(--amber)' : 'var(--green)'

  return (
    <div className="tooltip" style={{ minWidth: 240 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>
        {product.name.length > 30 ? product.name.slice(0, 30) + '…' : product.name}
      </div>
      {/* Sparkline */}
      <Sparkline data={weeks} color={sparkColor} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2, marginBottom: 10 }}>
        {['W1','W2','W3','W4','W5','W6','W7','W8'].map((w, i) => (
          <span key={i} style={{ fontSize: 9, color: 'var(--text3)' }}>{w}</span>
        ))}
      </div>
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
        <Stat label="30d Sales" value={String(product.sales30d)} />
        <Stat label="Daily Avg" value={`${product.dailyVelocity}/d`} />
        <Stat label="Days Left" value={formatDays(product.daysLeft) + 'd'} />
        <Stat label="Order Qty" value={String(product.replenishQty)} />
        <Stat label="Cost Value" value={formatCurrency(product.forecastCostValue)} />
        <Stat label="Retail Value" value={formatCurrency(product.forecastRetailValue)} />
      </div>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text3)' }}>Lead time</span>
        <span style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: 'var(--text)' }}>{product.leadTimeDays ?? 30} days</span>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--text)', fontWeight: 500 }}>{value}</div>
    </div>
  )
}

export default function ReplenishmentTable({ products, selectedSKUs, onToggleSKU, onSelectAll, onAddToPO, onQuickPO }: Props) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [vendorFilter, setVendorFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' }>({ field: 'daysLeft', dir: 'asc' })
  const [page, setPage] = useState(1)

  // Derive unique vendors from products
  const vendors = useMemo(() => {
    const v = Array.from(new Set(products.map(p => p.vendor))).sort()
    return v
  }, [products])

  const filtered = useMemo(() => {
    let list = products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search)
      const matchFilter = filter === 'all' ||
        (filter === 'urgent' && (p.status === 'urgent' || p.status === 'oos')) ||
        (filter === 'low'    && p.status === 'low') ||
        (filter === 'ok'     && p.status === 'ok') ||
        (filter === 'overstock' && p.status === 'overstock')
      const matchVendor = vendorFilter === 'all' || p.vendor === vendorFilter
      return matchSearch && matchFilter && matchVendor
    })
    list = [...list].sort((a, b) => {
      const { field, dir } = sort
      let va: any = a[field], vb: any = b[field]
      if (field === 'daysLeft') { va = a.daysLeft; vb = b.daysLeft }
      if (typeof va === 'string') { va = va.toLowerCase(); vb = (vb as string).toLowerCase() }
      if (va < vb) return dir === 'asc' ? -1 : 1
      if (va > vb) return dir === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [products, filter, vendorFilter, search, sort])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (field: SortField) => {
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' })
    setPage(1)
  }

  const filterBtns: { key: FilterType; label: string; count?: number }[] = [
    { key:'all', label:'All', count: products.length },
    { key:'urgent', label:'Urgent', count: products.filter(p => p.status === 'urgent' || p.status === 'oos').length },
    { key:'low', label:'Low Stock', count: products.filter(p => p.status === 'low').length },
    { key:'ok', label:'OK', count: products.filter(p => p.status === 'ok').length },
    { key:'overstock', label:'Overstock', count: products.filter(p => p.status === 'overstock').length },
  ]

  const thStyle: React.CSSProperties = {
    padding:'10px 14px', fontSize:11, fontWeight:500,
    color:'var(--text3)', borderBottom:'1px solid var(--border)',
    whiteSpace:'nowrap', cursor:'pointer', userSelect:'none',
    textAlign:'left', background:'var(--surface)', letterSpacing:'0.2px',
  }

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
      {/* Toolbar row 1 — search + actions */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border)', gap:10, flexWrap:'wrap' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', fontSize:14 }}>⌕</span>
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search products or SKU…"
              style={{ background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text)', padding:'7px 12px 7px 30px', borderRadius:7, fontSize:13, width:230, outline:'none', fontFamily:'inherit' }}
            />
          </div>
          {/* Vendor filter dropdown */}
          <select
            value={vendorFilter}
            onChange={e => { setVendorFilter(e.target.value); setPage(1) }}
            style={{ background:'var(--surface2)', border:'1px solid var(--border)', color: vendorFilter !== 'all' ? 'var(--accent)' : 'var(--text2)', padding:'7px 12px', borderRadius:7, fontSize:13, outline:'none', cursor:'pointer', fontFamily:'inherit', borderColor: vendorFilter !== 'all' ? 'rgba(99,102,241,0.4)' : 'var(--border)' }}
          >
            <option value="all">All Vendors</option>
            {vendors.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onSelectAll} style={ghostBtn}>Select All</button>
          <button onClick={onAddToPO} style={accentBtn}>＋ Add to PO ({selectedSKUs.size})</button>
          <button onClick={() => exportCSV(filtered)} style={ghostBtn}>↓ CSV</button>
        </div>
      </div>

      {/* Toolbar row 2 — status filters */}
      <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderBottom:'1px solid var(--border)', background:'var(--surface2)' }}>
        {filterBtns.map(f => (
          <button key={f.key} onClick={() => { setFilter(f.key); setPage(1) }} style={{
            padding:'4px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
            background: filter === f.key ? 'var(--accent-soft)' : 'transparent',
            border: `1px solid ${filter === f.key ? 'rgba(99,102,241,0.35)' : 'transparent'}`,
            color: filter === f.key ? 'var(--accent)' : 'var(--text2)',
            fontFamily:'inherit', display:'flex', alignItems:'center', gap:5,
            transition:'all 0.12s',
          }}>
            {f.label}
            {f.count !== undefined && (
              <span style={{ fontSize:10, background: filter === f.key ? 'rgba(99,102,241,0.2)' : 'var(--surface3)', padding:'1px 5px', borderRadius:10, color: filter === f.key ? 'var(--accent)' : 'var(--text3)' }}>
                {f.count}
              </span>
            )}
          </button>
        ))}
        {vendorFilter !== 'all' && (
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--accent)' }}>
            <span>Vendor: <strong>{vendorFilter}</strong></span>
            <button onClick={() => setVendorFilter('all')} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:14, lineHeight:1 }}>✕</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={thStyle}>
                <input type="checkbox" onChange={e => e.target.checked ? onSelectAll() : Array.from(selectedSKUs).forEach(s => onToggleSKU(s, false))} style={{ accentColor:'var(--accent)', cursor:'pointer' }} />
              </th>
              {[
                { label:'SKU', field:'sku' as SortField },
                { label:'Product', field:'name' as SortField },
                { label:'Stock', field:'stock' as SortField },
                { label:'Days Left', field:'daysLeft' as SortField },
                { label:'Velocity', field:'dailyVelocity' as SortField },
                { label:'Order Qty', field:'replenishQty' as SortField },
                { label:'Lead Time', field:null },
                { label:'Reorder Date', field:null },
                { label:'Order Cost', field:'forecastCostValue' as SortField },
                { label:'ABC', field:'abc' as SortField },
                { label:'Status', field:'status' as SortField },
                { label:'', field:null },
              ].map((col, i) => (
                <th key={i} style={thStyle} onClick={() => col.field && toggleSort(col.field)}>
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                    {col.label}
                    {col.field && sort.field === col.field && (
                      <span style={{ color:'var(--accent)', fontSize:10 }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr><td colSpan={13} style={{ textAlign:'center', padding:'50px', color:'var(--text3)', fontSize:13 }}>No products match your filters</td></tr>
            )}
            {paginated.map(p => {
              const badge = STATUS_BADGE[p.status]
              const daysColor = p.daysLeft < 8 ? 'var(--red)' : p.daysLeft < 15 ? 'var(--amber)' : p.daysLeft >= 9999 ? 'var(--text3)' : 'var(--text)'
              const isSelected = selectedSKUs.has(p.sku)
              const progressPct = Math.min(100, (Math.min(p.daysLeft, 180) / 180) * 100)
              const progressColor = p.daysLeft < 8 ? 'var(--red)' : p.daysLeft < 15 ? 'var(--amber)' : 'var(--green)'

              return (
                <tr key={p.sku} style={{
                  borderBottom:'1px solid var(--border)',
                  background: isSelected ? 'rgba(99,102,241,0.04)' : 'transparent',
                  transition:'background 0.1s',
                }}>
                  <td style={{ padding:'10px 14px' }}>
                    <input type="checkbox" checked={isSelected} onChange={e => onToggleSKU(p.sku, e.target.checked)} style={{ accentColor:'var(--accent)', cursor:'pointer' }} />
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--text3)' }}>{p.sku}</span>
                  </td>
                  {/* Name cell with hover tooltip */}
                  <td style={{ padding:'10px 14px', maxWidth:210 }}>
                    <div className="has-tooltip" style={{ position:'relative' }}>
                      <div style={{ fontWeight:500, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor:'default' }}>{p.name}</div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                        {p.store === 'store1' ? 'Store 1' : 'Store 2'} · <span style={{ color:'var(--text2)' }}>{p.vendor}</span>
                      </div>
                      <SalesTooltip product={p} />
                    </div>
                  </td>
                  <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'DM Mono,monospace', fontSize:12 }}>{p.stock.toLocaleString()}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:54, height:4, background:'var(--surface3)', borderRadius:2, overflow:'hidden', flexShrink:0 }}>
                        <div style={{ height:'100%', borderRadius:2, width:`${progressPct}%`, background:progressColor, transition:'width 0.3s' }} />
                      </div>
                      <span style={{ color:daysColor, fontFamily:'DM Mono,monospace', fontSize:12, fontWeight:500 }}>
                        {formatDays(p.daysLeft)}{p.daysLeft < 9999 ? 'd' : ''}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding:'10px 14px', fontFamily:'DM Mono,monospace', fontSize:12, color:'var(--text2)' }}>{p.dailyVelocity}/d</td>
                  <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'DM Mono,monospace', fontSize:13, fontWeight:600, color:'var(--accent)' }}>
                    {p.replenishQty > 0 ? p.replenishQty.toLocaleString() : <span style={{ color:'var(--text3)' }}>—</span>}
                  </td>
                  <td style={{ padding:'10px 14px', fontFamily:'DM Mono,monospace', fontSize:12, color:'var(--text2)' }}>{p.leadTimeDays ?? 30}d</td>
                  <td style={{ padding:'10px 14px', fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--text2)' }}>{p.reorderDate}</td>
                  <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'DM Mono,monospace', fontSize:12 }}>
                    {p.replenishQty > 0 ? formatCurrency(p.forecastCostValue) : <span style={{ color:'var(--text3)' }}>—</span>}
                  </td>
                  <td style={{ padding:'10px 14px', fontFamily:'DM Mono,monospace', fontWeight:700, fontSize:13, color:ABC_COLOR[p.abc] }}>{p.abc}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:500, background:badge.bg, color:badge.color, border:`1px solid ${badge.border}` }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding:'10px 14px' }}>
                    <button onClick={() => onQuickPO(p.sku)} style={{ padding:'4px 10px', borderRadius:5, fontSize:11, cursor:'pointer', border:'1px solid var(--border2)', background:'var(--surface3)', color:'var(--text2)', fontFamily:'inherit', transition:'all 0.12s' }}>
                      PO
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 16px', borderTop:'1px solid var(--border)', fontSize:12, color:'var(--text3)' }}>
        <span>
          Showing {filtered.length === 0 ? 0 : (page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, filtered.length)} of <strong style={{ color:'var(--text2)' }}>{filtered.length}</strong> products
        </span>
        <div style={{ display:'flex', gap:4 }}>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => (
            <button key={i} onClick={() => setPage(i+1)} style={{
              width:28, height:28, borderRadius:5,
              border:`1px solid ${i+1===page ? 'rgba(99,102,241,0.4)' : 'var(--border)'}`,
              background: i+1===page ? 'var(--accent-soft)' : 'var(--surface2)',
              color: i+1===page ? 'var(--accent)' : 'var(--text3)',
              fontSize:12, cursor:'pointer', fontFamily:'inherit',
            }}>{i+1}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

const ghostBtn: React.CSSProperties = {
  padding:'7px 14px', borderRadius:7, fontSize:12, fontWeight:500,
  cursor:'pointer', border:'1px solid var(--border)',
  background:'var(--surface2)', color:'var(--text2)', fontFamily:'inherit',
  transition:'all 0.12s',
}

const accentBtn: React.CSSProperties = {
  padding:'7px 14px', borderRadius:7, fontSize:12, fontWeight:500,
  cursor:'pointer', border:'1px solid rgba(99,102,241,0.35)',
  background:'var(--accent-soft)', color:'var(--accent)', fontFamily:'inherit',
  transition:'all 0.12s',
}

function exportCSV(products: ProductWithForecast[]) {
  const rows = [['SKU','Name','Store','Vendor','Stock','Days Left','Daily Velocity','Order Qty','Lead Time','Reorder Date','Forecast Cost','Forecast Retail','ABC','Status']]
  products.forEach(p => rows.push([
    p.sku, p.name, p.store, p.vendor,
    String(p.stock), formatDays(p.daysLeft), String(p.dailyVelocity),
    String(p.replenishQty), String(p.leadTimeDays ?? 30), p.reorderDate,
    String(p.forecastCostValue), String(p.forecastRetailValue), p.abc, p.status,
  ]))
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = 'data:text/csv,' + encodeURIComponent(csv)
  a.download = `replenishment_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
}
