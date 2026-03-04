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
  oos:       { label: 'OOS',       bg:'rgba(239,68,68,0.15)',   color:'var(--red)',   border:'rgba(239,68,68,0.3)' },
  urgent:    { label: 'Urgent',    bg:'rgba(239,68,68,0.15)',   color:'var(--red)',   border:'rgba(239,68,68,0.3)' },
  low:       { label: 'Low',       bg:'rgba(245,158,11,0.15)',  color:'var(--amber)', border:'rgba(245,158,11,0.3)' },
  ok:        { label: 'OK',        bg:'rgba(34,197,94,0.15)',   color:'var(--green)', border:'rgba(34,197,94,0.3)' },
  overstock: { label: 'Overstock', bg:'rgba(79,124,255,0.15)',  color:'var(--accent)',border:'rgba(79,124,255,0.3)' },
}

const ABC_COLOR: Record<ABCClass, string> = { A: 'var(--green)', B: 'var(--amber)', C: 'var(--text3)' }

const PAGE_SIZE = 25

export default function ReplenishmentTable({ products, selectedSKUs, onToggleSKU, onSelectAll, onAddToPO, onQuickPO }: Props) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' }>({ field: 'daysLeft', dir: 'asc' })
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let list = products.filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search)
      const matchFilter = filter === 'all' ||
        (filter === 'urgent' && (p.status === 'urgent' || p.status === 'oos')) ||
        (filter === 'low'    && p.status === 'low') ||
        (filter === 'ok'     && p.status === 'ok') ||
        (filter === 'overstock' && p.status === 'overstock')
      return matchSearch && matchFilter
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
  }, [products, filter, search, sort])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (field: SortField) => {
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' })
    setPage(1)
  }

  const th: React.CSSProperties = {
    padding:'10px 14px', fontSize:10, fontWeight:600,
    textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)',
    borderBottom:'1px solid var(--border)', whiteSpace:'nowrap',
    cursor:'pointer', userSelect:'none', textAlign:'left', background:'var(--surface)',
  }

  const filterBtns: { key: FilterType; label: string }[] = [
    { key:'all', label:'All' },
    { key:'urgent', label:'🔴 Urgent' },
    { key:'low', label:'🟡 Low' },
    { key:'ok', label:'🟢 OK' },
    { key:'overstock', label:'📈 Overstock' },
  ]

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
          {/* Search */}
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', fontSize:15 }}>⌕</span>
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search products or SKU..."
              style={{ background:'var(--surface2)', border:'1px solid var(--border)', color:'var(--text)', padding:'7px 12px 7px 32px', borderRadius:8, fontSize:13, width:240, outline:'none', fontFamily:'inherit' }}
            />
          </div>
          {/* Filter chips */}
          {filterBtns.map(f => (
            <button key={f.key} onClick={() => { setFilter(f.key); setPage(1) }} style={{
              padding:'5px 12px', borderRadius:6, fontSize:12, cursor:'pointer',
              background: filter === f.key ? 'rgba(79,124,255,0.2)' : 'var(--surface2)',
              border: `1px solid ${filter === f.key ? 'rgba(79,124,255,0.5)' : 'var(--border)'}`,
              color: filter === f.key ? 'var(--accent)' : 'var(--text2)', fontFamily:'inherit',
            }}>{f.label}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={onSelectAll} style={ghostBtn}>Select All</button>
          <button onClick={onAddToPO} style={greenBtn}>＋ Add to PO ({selectedSKUs.size})</button>
          <button onClick={() => exportCSV(filtered)} style={ghostBtn}>⬇ CSV</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={th}><input type="checkbox" onChange={e => e.target.checked ? onSelectAll() : Array.from(selectedSKUs).forEach(s => onToggleSKU(s,false))} style={{ accentColor:'var(--accent)' }} /></th>
              {[
                { label:'SKU', field:'sku' as SortField },
                { label:'Product', field:'name' as SortField },
                { label:'Stock', field:'stock' as SortField },
                { label:'Days Left', field:'daysLeft' as SortField },
                { label:'Velocity/day', field:'dailyVelocity' as SortField },
                { label:'Order Qty', field:'replenishQty' as SortField },
                { label:'Lead Time', field:null },
                { label:'Reorder Date', field:null },
                { label:'Forecast £', field:'forecastCostValue' as SortField },
                { label:'ABC', field:'abc' as SortField },
                { label:'Status', field:'status' as SortField },
                { label:'', field:null },
              ].map((col, i) => (
                <th key={i} style={th} onClick={() => col.field && toggleSort(col.field)}>
                  {col.label}
                  {col.field && sort.field === col.field && <span style={{ color:'var(--accent)', marginLeft:3 }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 && (
              <tr><td colSpan={13} style={{ textAlign:'center', padding:'50px', color:'var(--text3)' }}>No products match your filters</td></tr>
            )}
            {paginated.map(p => {
              const badge = STATUS_BADGE[p.status]
              const daysColor = p.daysLeft < 8 ? 'var(--red)' : p.daysLeft < 15 ? 'var(--amber)' : 'var(--text)'
              const isSelected = selectedSKUs.has(p.sku)
              return (
                <tr key={p.sku} style={{
                  borderBottom:'1px solid var(--border)',
                  background: isSelected ? 'rgba(79,124,255,0.05)' : 'transparent',
                  transition:'background 0.1s',
                }}>
                  <td style={{ padding:'11px 14px' }}>
                    <input type="checkbox" checked={isSelected} onChange={e => onToggleSKU(p.sku, e.target.checked)} style={{ accentColor:'var(--accent)' }} />
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--text3)' }}>{p.sku}</div>
                  </td>
                  <td style={{ padding:'11px 14px', maxWidth:200 }}>
                    <div style={{ fontWeight:500, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>
                      {p.store === 'store1' ? '🛍 Store 1' : '🛍 Store 2'} · {p.vendor}
                    </div>
                  </td>
                  <td style={{ padding:'11px 14px', textAlign:'right', fontFamily:'DM Mono,monospace', fontSize:12 }}>{p.stock.toLocaleString()}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <div style={{ width:60, height:5, background:'var(--surface3)', borderRadius:3, overflow:'hidden' }}>
                        <div style={{
                          height:'100%', borderRadius:3,
                          width: `${Math.min(100, (p.daysLeft / 180) * 100)}%`,
                          background: p.daysLeft < 8 ? 'var(--red)' : p.daysLeft < 15 ? 'var(--amber)' : 'var(--green)',
                        }} />
                      </div>
                      <span style={{ color:daysColor, fontFamily:'DM Mono,monospace', fontSize:12 }}>{formatDays(p.daysLeft)}d</span>
                    </div>
                  </td>
                  <td style={{ padding:'11px 14px', fontFamily:'DM Mono,monospace', fontSize:12, color:'var(--text2)' }}>{p.dailyVelocity}/d</td>
                  <td style={{ padding:'11px 14px', textAlign:'right', fontFamily:'DM Mono,monospace', fontWeight:600, color:'var(--accent)' }}>{p.replenishQty.toLocaleString()}</td>
                  <td style={{ padding:'11px 14px', fontFamily:'DM Mono,monospace', fontSize:12, color:'var(--text2)' }}>{p.leadTimeDays ?? 30}d</td>
                  <td style={{ padding:'11px 14px', fontFamily:'DM Mono,monospace', fontSize:11 }}>{p.reorderDate}</td>
                  <td style={{ padding:'11px 14px', textAlign:'right', fontFamily:'DM Mono,monospace', fontSize:12 }}>{formatCurrency(p.forecastCostValue)}</td>
                  <td style={{ padding:'11px 14px', fontFamily:'DM Mono,monospace', fontWeight:700, color:ABC_COLOR[p.abc] }}>{p.abc}</td>
                  <td style={{ padding:'11px 14px' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', padding:'3px 8px', borderRadius:20, fontSize:10, fontWeight:600, background:badge.bg, color:badge.color, border:`1px solid ${badge.border}` }}>
                      {badge.label}
                    </span>
                  </td>
                  <td style={{ padding:'11px 14px' }}>
                    <button onClick={() => onQuickPO(p.sku)} style={{ ...ghostBtn, padding:'4px 10px', fontSize:11 }}>+ PO</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 18px', borderTop:'1px solid var(--border)', fontSize:12, color:'var(--text2)' }}>
        <span>Showing {Math.min((page-1)*PAGE_SIZE+1, filtered.length)}–{Math.min(page*PAGE_SIZE, filtered.length)} of {filtered.length}</span>
        <div style={{ display:'flex', gap:5 }}>
          {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => (
            <button key={i} onClick={() => setPage(i+1)} style={{
              width:28, height:28, borderRadius:6, border:`1px solid ${i+1===page?'var(--accent)':'var(--border)'}`,
              background: i+1===page ? 'rgba(79,124,255,0.2)' : 'var(--surface2)',
              color: i+1===page ? 'var(--accent)' : 'var(--text2)',
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
}

const greenBtn: React.CSSProperties = {
  padding:'7px 14px', borderRadius:7, fontSize:12, fontWeight:500,
  cursor:'pointer', border:'1px solid rgba(34,197,94,0.3)',
  background:'rgba(34,197,94,0.15)', color:'var(--green)', fontFamily:'inherit',
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
