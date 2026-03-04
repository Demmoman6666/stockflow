'use client'
import { Package, ShoppingCart, BarChart2, Grid, Truck, Link2, Settings } from 'lucide-react'

const NAV = [
  { section: 'Planning', items: [
    { id: 'replenishment', label: 'Replenishment', icon: Package },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  ]},
  { section: 'Inventory', items: [
    { id: 'products', label: 'All Products', icon: Grid },
    { id: 'vendors', label: 'Vendors', icon: Truck },
  ]},
  { section: 'Config', items: [
    { id: 'connections', label: 'Connections', icon: Link2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]},
]

interface Props {
  active: string
  onNav: (id: string) => void
  store1Connected: boolean
  store2Connected: boolean
  store1Name: string
  store2Name: string
}

export default function Sidebar({ active, onNav, store1Connected, store2Connected, store1Name, store2Name }: Props) {
  return (
    <nav style={{
      position:'fixed', left:0, top:0, bottom:0, width:220,
      background:'var(--surface)', borderRight:'1px solid var(--border)',
      display:'flex', flexDirection:'column', zIndex:100,
    }}>
      {/* Logo */}
      <div style={{ padding:'22px 20px 18px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, letterSpacing:'-0.5px' }}>
          Stock<span style={{ color:'var(--accent)' }}>Flow</span>
        </div>
        <div style={{ fontSize:10, color:'var(--text3)', marginTop:4, letterSpacing:'0.5px' }}>
          Intelligent Replenishment
        </div>
      </div>

      {/* Store badges */}
      <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:6 }}>
        <StoreBadge connected={store1Connected} name={store1Name} onClick={() => onNav('connections')} />
        <StoreBadge connected={store2Connected} name={store2Name} onClick={() => onNav('connections')} />
      </div>

      {/* Nav */}
      <div style={{ padding:'10px 10px', flex:1, overflowY:'auto' }}>
        {NAV.map(group => (
          <div key={group.section}>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:'1px', color:'var(--text3)', padding:'12px 10px 5px', textTransform:'uppercase' }}>
              {group.section}
            </div>
            {group.items.map(item => {
              const Icon = item.icon
              const isActive = active === item.id
              return (
                <button key={item.id} onClick={() => onNav(item.id)} style={{
                  display:'flex', alignItems:'center', gap:10,
                  padding:'9px 12px', borderRadius:8, width:'100%', border:'none',
                  background: isActive ? 'rgba(79,124,255,0.15)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text2)',
                  fontSize:13, fontWeight:500, cursor:'pointer',
                  marginBottom:1, textAlign:'left', transition:'all 0.15s',
                  fontFamily:'inherit',
                }}>
                  <Icon size={15} />
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', fontSize:11, color:'var(--text3)' }}>
        StockFlow v1.0
      </div>
    </nav>
  )
}

function StoreBadge({ connected, name, onClick }: { connected: boolean; name: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      display:'flex', alignItems:'center', gap:7,
      background:'var(--surface2)', border:'1px solid var(--border)',
      borderRadius:7, padding:'5px 10px', cursor:'pointer', width:'100%',
    }}>
      <div style={{
        width:6, height:6, borderRadius:'50%',
        background: connected ? 'var(--green)' : 'var(--text3)',
        boxShadow: connected ? '0 0 5px rgba(34,197,94,0.6)' : 'none',
        flexShrink:0,
      }} />
      <span style={{ fontSize:11, color: connected ? 'var(--text)' : 'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {name}
      </span>
    </button>
  )
}
