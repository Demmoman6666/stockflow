'use client'
import { useState, useEffect, useMemo, useCallback } from 'react'
import Sidebar from '@/components/Sidebar'
import SettingsBar from '@/components/SettingsBar'
import ReplenishmentTable from '@/components/ReplenishmentTable'
import POModal from '@/components/POModal'
import { Product, ProductWithForecast, ForecastSettings, PurchaseOrder, Vendor } from '@/lib/types'
import { calculateForecasts, formatCurrency } from '@/lib/forecast'

type PageId = 'replenishment' | 'purchase-orders' | 'analytics' | 'products' | 'vendors' | 'connections' | 'settings'

const DEFAULT_SETTINGS: ForecastSettings = {
  daysOfStock: 180,
  lookbackDays: 30,
  leadTimeDays: 30,
  safetyBuffer: 0.2,
  model: 'velocity',
  storeFilter: 'all',
}

const DEFAULT_VENDORS: Vendor[] = [
  { id:'v1', name:'My Organics', email:'orders@myorganics.com', leadTimeDays:30, minOrderValue:0, paymentTerms:'Net 30', currency:'GBP' },
  { id:'v2', name:'Agenda', email:'orders@agenda.co.uk', leadTimeDays:5, minOrderValue:0, paymentTerms:'Net 30', currency:'GBP' },
]

export default function App() {
  const [page, setPage] = useState<PageId>('replenishment')
  const [settings, setSettings] = useState<ForecastSettings>(DEFAULT_SETTINGS)
  const [rawProducts, setRawProducts] = useState<Product[]>([])
  const [sales30d, setSales30d] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [dataSource, setDataSource] = useState<'live' | 'demo'>('demo')
  const [stores, setStores] = useState({ store1: false, store2: false })
  const [selectedSKUs, setSelectedSKUs] = useState<Set<string>>(new Set())
  const [poModalOpen, setPOModalOpen] = useState(false)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [vendors, setVendors] = useState<Vendor[]>(DEFAULT_VENDORS)
  const [syncing, setSyncing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [linnworksConfigured, setLinnworksConfigured] = useState(false)

  // Connections state
  const [s1Domain, setS1Domain] = useState('')
  const [s1Token, setS1Token] = useState('')
  const [s2Domain, setS2Domain] = useState('')
  const [s2Token, setS2Token] = useState('')
  const [lwAppId, setLwAppId] = useState('')
  const [lwSecret, setLwSecret] = useState('')
  const [lwToken, setLwToken] = useState('')

  // Vendor form
  const [vName, setVName] = useState('')
  const [vEmail, setVEmail] = useState('')
  const [vLead, setVLead] = useState(14)
  const [vMoq, setVMoq] = useState(0)
  const [vTerms, setVTerms] = useState('Net 30')
  const [showVendorForm, setShowVendorForm] = useState(false)

  // Fetch data on mount
  useEffect(() => {
    fetchData()
    checkLinnworks()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/shopify')
      const data = await res.json()
      setRawProducts(data.products || [])
      setSales30d(data.sales30d || {})
      setDataSource(data.source)
      setStores(data.stores || { store1: false, store2: false })
    } catch (e) {
      showToast('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const checkLinnworks = async () => {
    try {
      const res = await fetch('/api/linnworks')
      const data = await res.json()
      setLinnworksConfigured(data.configured)
    } catch {}
  }

  // Forecasted products
  const forecasted = useMemo((): ProductWithForecast[] => {
    const filtered = settings.storeFilter === 'all'
      ? rawProducts
      : rawProducts.filter(p => p.store === settings.storeFilter)
    return calculateForecasts(filtered, sales30d, settings)
  }, [rawProducts, sales30d, settings])

  // Stats
  const stats = useMemo(() => {
    const toReplenish = forecasted.filter(p => p.replenishQty > 0).length
    const totalCost = forecasted.reduce((s, p) => s + p.forecastCostValue, 0)
    const totalRetail = forecasted.reduce((s, p) => s + p.forecastRetailValue, 0)
    const oos = forecasted.filter(p => p.status === 'oos').length
    const urgent = forecasted.filter(p => p.status === 'urgent').length
    const avgVelocity = forecasted.length > 0
      ? forecasted.reduce((s, p) => s + p.dailyVelocity, 0) / forecasted.length
      : 0
    const atRisk14 = forecasted.filter(p => p.daysLeft < 14).length
    return { toReplenish, totalCost, totalRetail, oos, urgent, avgVelocity, atRisk14 }
  }, [forecasted])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await fetch('/api/sync', { method: 'POST' })
      await fetchData()
      showToast('✅ Sync complete')
    } catch { showToast('Sync failed') }
    finally { setSyncing(false) }
  }

  const handleToggleSKU = useCallback((sku: string, checked: boolean) => {
    setSelectedSKUs(prev => { const n = new Set(prev); checked ? n.add(sku) : n.delete(sku); return n })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedSKUs(new Set(forecasted.filter(p => p.replenishQty > 0).map(p => p.sku)))
  }, [forecasted])

  const handleOpenPO = useCallback(() => {
    if (selectedSKUs.size === 0) {
      // Auto-select urgent + low
      setSelectedSKUs(new Set(forecasted.filter(p => p.status === 'urgent' || p.status === 'oos' || p.status === 'low').map(p => p.sku)))
    }
    setPOModalOpen(true)
  }, [selectedSKUs, forecasted])

  const handleQuickPO = useCallback((sku: string) => {
    setSelectedSKUs(new Set([sku]))
    setPOModalOpen(true)
  }, [])

  const handlePOCreated = (po: PurchaseOrder) => {
    setPurchaseOrders(prev => [po, ...prev])
    setSelectedSKUs(new Set())
    showToast(po.linnworksPushed ? '✅ PO pushed to Linnworks!' : '💾 Draft PO saved')
  }

  const handlePushExistingPO = async (po: PurchaseOrder) => {
    setSyncing(true)
    try {
      const res = await fetch('/api/linnworks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(po) })
      const data = await res.json()
      if (data.success) {
        setPurchaseOrders(prev => prev.map(p => p.id === po.id ? { ...p, status:'pushed', linnworksPushed:true } : p))
        showToast('✅ PO pushed to Linnworks!')
      } else {
        showToast('❌ ' + (data.error || 'Push failed'))
      }
    } catch { showToast('Network error') }
    finally { setSyncing(false) }
  }

  const saveVendor = () => {
    setVendors(prev => [...prev, { id:'v'+Date.now(), name:vName, email:vEmail, leadTimeDays:vLead, minOrderValue:vMoq, paymentTerms:vTerms, currency:'GBP' }])
    setShowVendorForm(false)
    setVName(''); setVEmail('')
    showToast('Vendor saved')
  }

  const pageTitles: Record<PageId, string> = {
    'replenishment': 'Replenishment',
    'purchase-orders': 'Purchase Orders',
    'analytics': 'Analytics',
    'products': 'All Products',
    'vendors': 'Vendors',
    'connections': 'Connections',
    'settings': 'Settings',
  }

  return (
    <div style={{ display:'flex', minHeight:'100vh' }}>
      <Sidebar
        active={page}
        onNav={id => setPage(id as PageId)}
        store1Connected={stores.store1}
        store2Connected={stores.store2}
        store1Name={stores.store1 ? (s1Domain || 'Store 1') : 'Store 1 — Demo'}
        store2Name={stores.store2 ? (s2Domain || 'Store 2') : 'Store 2 — Demo'}
      />

      <div style={{ marginLeft:220, flex:1, display:'flex', flexDirection:'column', minHeight:'100vh' }}>
        {/* Topbar */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 26px', borderBottom:'1px solid var(--border)', background:'var(--bg)', position:'sticky', top:0, zIndex:50 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:17, fontWeight:700 }}>{pageTitles[page]}</div>
            {dataSource === 'demo' && (
              <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, background:'rgba(245,158,11,0.15)', color:'var(--amber)', border:'1px solid rgba(245,158,11,0.3)', fontWeight:600 }}>
                DEMO DATA
              </span>
            )}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={handleSync} disabled={syncing} style={{ padding:'7px 14px', borderRadius:7, fontSize:12, cursor:'pointer', border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text2)', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
              {syncing ? <><span className="spinner"/>Syncing...</> : '↻ Sync Now'}
            </button>
            <button onClick={handleOpenPO} style={{ padding:'7px 16px', borderRadius:7, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', background:'var(--accent)', color:'white', fontFamily:'inherit' }}>
              + Create PO
            </button>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding:'24px 26px', flex:1 }}>

          {/* REPLENISHMENT */}
          {page === 'replenishment' && (
            <div className="fade-in">
              <SettingsBar settings={settings} onChange={setSettings} />
              {/* Stats */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
                <StatCard label="To Replenish" value={String(stats.toReplenish)} sub="Items need ordering" color="var(--red)" />
                <StatCard label="Order Cost Est." value={formatCurrency(stats.totalCost)} sub={`Retail: ${formatCurrency(stats.totalRetail)}`} color="var(--accent)" />
                <StatCard label="Out of Stock" value={String(stats.oos)} sub={`${stats.urgent} urgent (<7 days)`} color="var(--amber)" />
                <StatCard label="Total SKUs" value={String(forecasted.length)} sub={dataSource === 'live' ? '🟢 Live Shopify data' : '🟡 Demo data'} color="var(--text)" />
              </div>
              {loading
                ? <div style={{ textAlign:'center', padding:'60px', color:'var(--text3)' }}><span className="spinner" style={{ width:24, height:24, borderWidth:3 }} /></div>
                : <ReplenishmentTable
                    products={forecasted}
                    selectedSKUs={selectedSKUs}
                    onToggleSKU={handleToggleSKU}
                    onSelectAll={handleSelectAll}
                    onAddToPO={handleOpenPO}
                    onQuickPO={handleQuickPO}
                  />
              }
            </div>
          )}

          {/* PURCHASE ORDERS */}
          {page === 'purchase-orders' && (
            <div className="fade-in">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <div style={{ fontSize:14, color:'var(--text2)' }}>{purchaseOrders.length} purchase order{purchaseOrders.length !== 1 ? 's' : ''}</div>
                <button onClick={handleOpenPO} style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', background:'var(--accent)', color:'white', fontFamily:'inherit' }}>+ New PO</button>
              </div>
              {purchaseOrders.length === 0 && (
                <div style={{ textAlign:'center', padding:'80px', color:'var(--text3)' }}>
                  <div style={{ fontSize:40, marginBottom:12 }}>🛒</div>
                  <div>No purchase orders yet</div>
                  <div style={{ fontSize:12, marginTop:6 }}>Create one from the Replenishment tab</div>
                </div>
              )}
              {purchaseOrders.map(po => (
                <div key={po.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', marginBottom:16 }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', borderBottom:'1px solid var(--border)', flexWrap:'wrap', gap:10 }}>
                    <div>
                      <div style={{ fontWeight:600, fontSize:14 }}>{po.number} — {po.vendor}</div>
                      <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>Created {po.date} · Delivery: {po.expectedDelivery || 'TBD'} · {po.lines.length} lines</div>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, color:'var(--accent)' }}>{formatCurrency(po.totalCost)}</div>
                      <StatusPill status={po.status} linnworks={po.linnworksPushed} />
                      {!po.linnworksPushed && (
                        <button onClick={() => handlePushExistingPO(po)} style={{ padding:'6px 12px', borderRadius:7, fontSize:12, cursor:'pointer', border:'1px solid rgba(34,197,94,0.3)', background:'rgba(34,197,94,0.15)', color:'var(--green)', fontFamily:'inherit' }}>
                          📦 Push to Linnworks
                        </button>
                      )}
                    </div>
                  </div>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr>{['SKU','Product','Store','Qty','Unit Cost','Total'].map(h => (
                        <th key={h} style={{ padding:'8px 16px', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px', color:'var(--text3)', borderBottom:'1px solid var(--border)', textAlign:'left' }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {po.lines.map(l => (
                        <tr key={l.sku} style={{ borderBottom:'1px solid var(--border)' }}>
                          <td style={{ padding:'10px 16px', fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--text3)' }}>{l.sku}</td>
                          <td style={{ padding:'10px 16px', fontSize:13 }}>{l.name}</td>
                          <td style={{ padding:'10px 16px', fontSize:12, color:'var(--text2)' }}>{l.store === 'store1' ? 'Store 1' : 'Store 2'}</td>
                          <td style={{ padding:'10px 16px', textAlign:'right', fontFamily:'DM Mono,monospace' }}>{l.qty}</td>
                          <td style={{ padding:'10px 16px', textAlign:'right', fontFamily:'DM Mono,monospace' }}>{formatCurrency(l.cost)}</td>
                          <td style={{ padding:'10px 16px', textAlign:'right', fontFamily:'DM Mono,monospace', fontWeight:600 }}>{formatCurrency(l.qty * l.cost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* ANALYTICS */}
          {page === 'analytics' && (
            <div className="fade-in">
              <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:22 }}>
                <StatCard label="Avg Daily Velocity" value={stats.avgVelocity.toFixed(2)} sub="Units/day across all SKUs" color="var(--accent)" />
                <StatCard label="At Risk (14 days)" value={String(stats.atRisk14)} sub="Items may stock out soon" color="var(--red)" />
                <StatCard label="A-Class SKUs" value={String(forecasted.filter(p=>p.abc==='A').length)} sub="Top 70% revenue" color="var(--green)" />
                <StatCard label="Overstock Items" value={String(forecasted.filter(p=>p.status==='overstock').length)} sub="Excess stock tied up" color="var(--amber)" />
              </div>
              {/* ABC Table */}
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontWeight:600, fontSize:14 }}>ABC Analysis</div>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr>{['Class','Products','Avg Velocity','Total Stock','Forecast Order Value','% Revenue'].map(h => (
                      <th key={h} style={{ padding:'10px 16px', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px', color:'var(--text3)', borderBottom:'1px solid var(--border)', textAlign:'left' }}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {(['A','B','C'] as const).map(cls => {
                      const items = forecasted.filter(p => p.abc === cls)
                      const avgVel = items.length ? (items.reduce((s,p)=>s+p.dailyVelocity,0)/items.length).toFixed(2) : '0'
                      const totalStock = items.reduce((s,p)=>s+p.stock,0)
                      const orderVal = items.reduce((s,p)=>s+p.forecastCostValue,0)
                      const revPct = cls === 'A' ? '70%' : cls === 'B' ? '20%' : '10%'
                      const color = cls === 'A' ? 'var(--green)' : cls === 'B' ? 'var(--amber)' : 'var(--text3)'
                      return (
                        <tr key={cls} style={{ borderBottom:'1px solid var(--border)' }}>
                          <td style={{ padding:'12px 16px', fontFamily:'DM Mono,monospace', fontWeight:700, color, fontSize:16 }}>{cls}</td>
                          <td style={{ padding:'12px 16px', fontFamily:'DM Mono,monospace' }}>{items.length}</td>
                          <td style={{ padding:'12px 16px', fontFamily:'DM Mono,monospace' }}>{avgVel}/day</td>
                          <td style={{ padding:'12px 16px', fontFamily:'DM Mono,monospace' }}>{totalStock.toLocaleString()}</td>
                          <td style={{ padding:'12px 16px', fontFamily:'DM Mono,monospace' }}>{formatCurrency(orderVal)}</td>
                          <td style={{ padding:'12px 16px' }}><span style={{ fontFamily:'DM Mono,monospace', color }}>{revPct}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PRODUCTS */}
          {page === 'products' && (
            <div className="fade-in">
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr>{['SKU','Product','Store','Vendor','Stock','Retail','Cost','ABC','30d Sales','Status'].map(h => (
                        <th key={h} style={{ padding:'10px 14px', fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.7px', color:'var(--text3)', borderBottom:'1px solid var(--border)', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {forecasted.map(p => (
                        <tr key={p.sku} style={{ borderBottom:'1px solid var(--border)' }}>
                          <td style={{ padding:'10px 14px', fontFamily:'DM Mono,monospace', fontSize:11, color:'var(--text3)' }}>{p.sku}</td>
                          <td style={{ padding:'10px 14px', fontSize:13, maxWidth:200, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</td>
                          <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text2)' }}>{p.store === 'store1' ? 'Store 1' : 'Store 2'}</td>
                          <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text2)' }}>{p.vendor}</td>
                          <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'DM Mono,monospace' }}>{p.stock}</td>
                          <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'DM Mono,monospace' }}>{formatCurrency(p.retail)}</td>
                          <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'DM Mono,monospace' }}>{formatCurrency(p.cost)}</td>
                          <td style={{ padding:'10px 14px', fontFamily:'DM Mono,monospace', fontWeight:700, color:p.abc==='A'?'var(--green)':p.abc==='B'?'var(--amber)':'var(--text3)' }}>{p.abc}</td>
                          <td style={{ padding:'10px 14px', textAlign:'right', fontFamily:'DM Mono,monospace' }}>{p.sales30d}</td>
                          <td style={{ padding:'10px 14px' }}>
                            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:20, fontWeight:600, background:p.status==='ok'?'rgba(34,197,94,0.1)':p.status==='overstock'?'rgba(79,124,255,0.1)':'rgba(239,68,68,0.1)', color:p.status==='ok'?'var(--green)':p.status==='overstock'?'var(--accent)':'var(--red)', border:`1px solid ${p.status==='ok'?'rgba(34,197,94,0.2)':p.status==='overstock'?'rgba(79,124,255,0.2)':'rgba(239,68,68,0.2)'}` }}>{p.status.toUpperCase()}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* VENDORS */}
          {page === 'vendors' && (
            <div className="fade-in">
              <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
                <button onClick={() => setShowVendorForm(!showVendorForm)} style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', background:'var(--accent)', color:'white', fontFamily:'inherit' }}>+ Add Vendor</button>
              </div>
              {showVendorForm && (
                <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20, marginBottom:20 }}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                    {[['Name',vName,setVName,'e.g. My Organics'],['Email',vEmail,setVEmail,'orders@vendor.com']].map(([label,val,fn,ph]:[string,any,any,string]) => (
                      <div key={label} style={{ display:'flex', flexDirection:'column', gap:5 }}>
                        <label style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)', fontWeight:600 }}>{label}</label>
                        <input value={val} onChange={e => fn(e.target.value)} placeholder={ph} style={inpStyle} />
                      </div>
                    ))}
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      <label style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)', fontWeight:600 }}>Lead Time (days)</label>
                      <input type="number" value={vLead} onChange={e => setVLead(parseInt(e.target.value)||0)} style={inpStyle} />
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      <label style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)', fontWeight:600 }}>Min Order (£)</label>
                      <input type="number" value={vMoq} onChange={e => setVMoq(parseInt(e.target.value)||0)} style={inpStyle} />
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                      <label style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)', fontWeight:600 }}>Payment Terms</label>
                      <select value={vTerms} onChange={e => setVTerms(e.target.value)} style={inpStyle}>
                        <option>Net 30</option><option>Net 60</option><option>COD</option><option>Prepayment</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:10 }}>
                    <button onClick={() => setShowVendorForm(false)} style={{ padding:'8px 16px', borderRadius:8, fontSize:13, cursor:'pointer', border:'1px solid var(--border)', background:'var(--surface2)', color:'var(--text2)', fontFamily:'inherit' }}>Cancel</button>
                    <button onClick={saveVendor} style={{ padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', border:'none', background:'var(--accent)', color:'white', fontFamily:'inherit' }}>Save Vendor</button>
                  </div>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
                {vendors.map(v => (
                  <div key={v.id} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:20 }}>
                    <div style={{ fontSize:24, marginBottom:10 }}>🏭</div>
                    <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, marginBottom:4 }}>{v.name}</div>
                    <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.7 }}>
                      📧 {v.email}<br/>⏱ Lead: {v.leadTimeDays}d<br/>💳 {v.paymentTerms}<br/>📦 Min: £{v.minOrderValue}
                    </div>
                    <div style={{ marginTop:14, display:'flex', gap:8 }}>
                      <button onClick={() => {
                        setSelectedSKUs(new Set(forecasted.filter(p => p.vendor === v.name && p.replenishQty > 0).map(p => p.sku)))
                        setPOModalOpen(true)
                      }} style={{ flex:1, padding:'7px', borderRadius:7, fontSize:12, cursor:'pointer', border:'none', background:'var(--accent)', color:'white', fontFamily:'inherit' }}>Create PO</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CONNECTIONS */}
          {page === 'connections' && (
            <div className="fade-in" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
              {/* Store 1 */}
              <ConnectCard title="Shopify — Store 1" icon="🛍️" connected={stores.store1} desc="Connect your primary Shopify store. Pulls products, stock levels, and 30-day order history.">
                <Field2 label="Store Domain"><input style={inpStyle} value={s1Domain} onChange={e => setS1Domain(e.target.value)} placeholder="yourstore.myshopify.com" /></Field2>
                <Field2 label="Admin API Access Token"><input type="password" style={inpStyle} value={s1Token} onChange={e => setS1Token(e.target.value)} placeholder="shpat_..." /></Field2>
                <div style={{ marginTop:8, fontSize:11, color:'var(--text3)' }}>Create a Custom App in Shopify Admin → Apps → App Development. Grant read_products, read_orders, read_inventory scopes.</div>
              </ConnectCard>
              {/* Store 2 */}
              <ConnectCard title="Shopify — Store 2" icon="🛍️" connected={stores.store2} desc="Connect your second Shopify store to unify forecasting across both channels.">
                <Field2 label="Store Domain"><input style={inpStyle} value={s2Domain} onChange={e => setS2Domain(e.target.value)} placeholder="yourstore2.myshopify.com" /></Field2>
                <Field2 label="Admin API Access Token"><input type="password" style={inpStyle} value={s2Token} onChange={e => setS2Token(e.target.value)} placeholder="shpat_..." /></Field2>
              </ConnectCard>
              {/* Linnworks */}
              <ConnectCard title="Linnworks" icon="📦" connected={linnworksConfigured} desc="Push purchase orders directly to Linnworks for receiving, tracking, and stock sync.">
                <Field2 label="Application ID"><input style={inpStyle} value={lwAppId} onChange={e => setLwAppId(e.target.value)} placeholder="Linnworks App ID" /></Field2>
                <Field2 label="Application Secret"><input type="password" style={inpStyle} value={lwSecret} onChange={e => setLwSecret(e.target.value)} placeholder="App Secret" /></Field2>
                <Field2 label="Session Token"><input type="password" style={inpStyle} value={lwToken} onChange={e => setLwToken(e.target.value)} placeholder="Session Token" /></Field2>
                <div style={{ marginTop:8, fontSize:11, color:'var(--text3)' }}>Go to linnworks.net → Settings → Application Keys to create credentials.</div>
              </ConnectCard>
              {/* Instructions */}
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:22 }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, marginBottom:12 }}>⚡ Deployment Setup</div>
                <div style={{ fontSize:12, color:'var(--text2)', lineHeight:2 }}>
                  1. Add credentials to <strong style={{color:'var(--text)'}}>Vercel Environment Variables</strong><br/>
                  2. Set <code style={{fontFamily:'DM Mono,monospace',color:'var(--accent)',fontSize:11}}>SHOPIFY_STORE1_DOMAIN</code> + <code style={{fontFamily:'DM Mono,monospace',color:'var(--accent)',fontSize:11}}>SHOPIFY_STORE1_ACCESS_TOKEN</code><br/>
                  3. Repeat for Store 2 and Linnworks<br/>
                  4. Redeploy → live data will replace demo data automatically<br/><br/>
                  <strong style={{color:'var(--text)'}}>Never</strong> commit API keys to GitHub. Vercel env vars are encrypted at rest.
                </div>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          {page === 'settings' && (
            <div className="fade-in" style={{ maxWidth:700 }}>
              <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:24 }}>
                <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, marginBottom:18 }}>Global Defaults</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  {[
                    ['Default Days of Stock', settings.daysOfStock, (v:number) => setSettings(s=>({...s,daysOfStock:v}))],
                    ['Default Lookback (days)', settings.lookbackDays, (v:number) => setSettings(s=>({...s,lookbackDays:v}))],
                    ['Default Lead Time (days)', settings.leadTimeDays, (v:number) => setSettings(s=>({...s,leadTimeDays:v}))],
                    ['Safety Stock (0–1)', settings.safetyBuffer, (v:number) => setSettings(s=>({...s,safetyBuffer:v}))],
                  ].map(([label,val,fn]) => (
                    <div key={String(label)} style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <label style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)', fontWeight:600 }}>{String(label)}</label>
                      <input type="number" value={Number(val)} onChange={e => (fn as any)(parseFloat(e.target.value)||0)} style={inpStyle} />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:18, padding:'14px 18px', borderRadius:10, background:'rgba(79,124,255,0.08)', border:'1px solid rgba(79,124,255,0.2)', fontSize:12, color:'var(--text2)' }}>
                  Settings changes apply immediately to all forecasts. They're stored in your browser session.
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* PO Modal */}
      <POModal
        open={poModalOpen}
        onClose={() => setPOModalOpen(false)}
        products={forecasted}
        selectedSKUs={selectedSKUs}
        onPOCreated={handlePOCreated}
        linnworksConnected={linnworksConfigured}
      />

      {/* Toast */}
      {toast && (
        <div style={{
          position:'fixed', bottom:24, right:24, zIndex:999,
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:10, padding:'12px 18px', fontSize:13,
          boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
        }}>{toast}</div>
      )}

      {/* Syncing overlay bar */}
      {syncing && (
        <div style={{
          position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
          background:'var(--surface)', border:'1px solid var(--border)',
          borderRadius:10, padding:'11px 20px', fontSize:13, zIndex:999,
          display:'flex', alignItems:'center', gap:10,
        }}>
          <span className="spinner" />
          Syncing...
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:18 }}>
      <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)', fontWeight:600, marginBottom:10 }}>{label}</div>
      <div style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:700, color, marginBottom:4 }}>{value}</div>
      <div style={{ fontSize:11, color:'var(--text3)' }}>{sub}</div>
    </div>
  )
}

function ConnectCard({ title, icon, connected, desc, children }: { title:string; icon:string; connected:boolean; desc:string; children:React.ReactNode }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, padding:22 }}>
      <div style={{ fontSize:28, marginBottom:10 }}>{icon}</div>
      <div style={{ fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:15, marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:12, color:'var(--text2)', marginBottom:14, lineHeight:1.5 }}>{desc}</div>
      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:14, fontSize:12 }}>
        <div style={{ width:7, height:7, borderRadius:'50%', background:connected?'var(--green)':'var(--text3)', boxShadow:connected?'0 0 5px rgba(34,197,94,0.6)':'none' }} />
        <span style={{ color:connected?'var(--green)':'var(--text3)' }}>{connected?'Connected':'Not connected'}</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>{children}</div>
      <div style={{ marginTop:12, fontSize:11, color:'var(--text3)', padding:'10px 12px', background:'rgba(79,124,255,0.06)', borderRadius:7, border:'1px solid var(--border)' }}>
        Add credentials to Vercel env vars — do not enter keys here in production.
      </div>
    </div>
  )
}

function Field2({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)', fontWeight:600 }}>{label}</label>
      {children}
    </div>
  )
}

const inpStyle: React.CSSProperties = {
  background:'var(--surface2)', border:'1px solid var(--border)',
  color:'var(--text)', padding:'8px 12px', borderRadius:7,
  fontSize:13, fontFamily:'inherit', outline:'none', width:'100%',
}

function StatusPill({ status, linnworks }: { status: PurchaseOrder['status']; linnworks: boolean }) {
  if (linnworks) return <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, fontWeight:600, background:'rgba(34,197,94,0.15)', color:'var(--green)', border:'1px solid rgba(34,197,94,0.3)' }}>✓ In Linnworks</span>
  if (status === 'draft') return <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, fontWeight:600, background:'rgba(245,158,11,0.15)', color:'var(--amber)', border:'1px solid rgba(245,158,11,0.3)' }}>Draft</span>
  return <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, fontWeight:600, background:'var(--surface3)', color:'var(--text2)', border:'1px solid var(--border)' }}>{status}</span>
}
