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
      background:'var(--surface)',
      borderRight:'1px solid var(--border)',
      display:'flex', flexDirection:'column', zIndex:100,
    }}>
      {/* Logo */}
      <div style={{ padding:'20px 18px 16px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ fontSize:17, fontWeight:700, letterSpacing:'-0.3px', color:'var(--text)' }}>
          Stock<span style={{ color:'var(--accent)' }}>Flow</span>
        </div>
        <div style={{ fontSize:10, color:'var(--text3)', marginTop:3, letterSpacing:'0.5px', textTransform:'uppercase' }}>
          Replenishment
        </div>
      </div>

      {/* Store badges */}
      <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:5 }}>
        <StoreBadge connected={store1Connected} name={store1Name} onClick={() => onNav('connections')} />
        <StoreBadge connected={store2Connected} name={store2Name} onClick={() => onNav('connections')} />
      </div>

      {/* Nav */}
      <div style={{ padding:'8px 8px', flex:1, overflowY:'auto' }}>
        {NAV.map(group => (
          <div key={group.section}>
            <div style={{ fontSize:10, fontWeight:600, letterSpacing:'0.8px', color:'var(--text3)', padding:'14px 10px 4px', textTransform:'uppercase' }}>
              {group.section}
            </div>
            {group.items.map(item => {
              const Icon = item.icon
              const isActive = active === item.id
              return (
                <button key={item.id} onClick={() => onNav(item.id)} style={{
                  display:'flex', alignItems:'center', gap:9,
                  padding:'8px 10px', borderRadius:7, width:'100%', border:'none',
                  background: isActive ? 'var(--accent-soft)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text2)',
                  fontSize:13, fontWeight: isActive ? 500 : 400,
                  cursor:'pointer', marginBottom:1, textAlign:'left',
                  transition:'all 0.12s', fontFamily:'inherit',
                }}>
                  <Icon size={14} strokeWidth={isActive ? 2 : 1.5} />
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)', fontSize:11, color:'var(--text3)' }}>
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
      borderRadius:6, padding:'5px 10px', cursor:'pointer', width:'100%',
      transition:'border-color 0.12s',
    }}>
      <div style={{
        width:6, height:6, borderRadius:'50%', flexShrink:0,
        background: connected ? 'var(--green)' : 'var(--text3)',
        boxShadow: connected ? '0 0 6px rgba(16,185,129,0.5)' : 'none',
      }} />
      <span style={{ fontSize:11, color: connected ? 'var(--text)' : 'var(--text3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
        {name}
      </span>
    </button>
  )
}
