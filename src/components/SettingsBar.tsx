'use client'
import { ForecastSettings, ForecastModel } from '@/lib/types'

interface Props {
  settings: ForecastSettings
  onChange: (s: ForecastSettings) => void
}

const inp: React.CSSProperties = {
  background:'var(--surface2)', border:'1px solid var(--border)',
  color:'var(--text)', padding:'6px 10px', borderRadius:6,
  fontSize:13, outline:'none', fontFamily:'inherit',
  transition:'border-color 0.12s',
}

export default function SettingsBar({ settings, onChange }: Props) {
  const set = (key: keyof ForecastSettings, val: any) => onChange({ ...settings, [key]: val })

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:10, padding:'14px 18px', marginBottom:18,
      display:'flex', alignItems:'center', gap:18, flexWrap:'wrap',
    }}>
      <Group label="Days of Stock">
        <input type="number" style={{...inp, width:86}} value={settings.daysOfStock} min={1} max={365}
          onChange={e => set('daysOfStock', parseInt(e.target.value) || 180)} />
      </Group>
      <Div />
      <Group label="Lookback (days)">
        <input type="number" style={{...inp, width:86}} value={settings.lookbackDays} min={7} max={365}
          onChange={e => set('lookbackDays', parseInt(e.target.value) || 30)} />
      </Group>
      <Div />
      <Group label="Lead Time (days)">
        <input type="number" style={{...inp, width:86}} value={settings.leadTimeDays} min={1} max={180}
          onChange={e => set('leadTimeDays', parseInt(e.target.value) || 14)} />
      </Group>
      <Div />
      <Group label="Safety Stock">
        <select style={{...inp, width:158, cursor:'pointer'}} value={settings.safetyBuffer}
          onChange={e => set('safetyBuffer', parseFloat(e.target.value))}>
          <option value={0}>None (0%)</option>
          <option value={0.1}>Conservative (10%)</option>
          <option value={0.2}>Standard (20%)</option>
          <option value={0.3}>Aggressive (30%)</option>
          <option value={0.5}>High (50%)</option>
        </select>
      </Group>
      <Div />
      <Group label="Forecast Model">
        <select style={{...inp, width:168, cursor:'pointer'}} value={settings.model}
          onChange={e => set('model', e.target.value as ForecastModel)}>
          <option value="velocity">Sales Velocity</option>
          <option value="trend">Trend Adjusted (+12%)</option>
          <option value="seasonal">Seasonal</option>
          <option value="conservative">Conservative (−15%)</option>
        </select>
      </Group>
      <Div />
      <Group label="Store">
        <select style={{...inp, width:138, cursor:'pointer'}} value={settings.storeFilter}
          onChange={e => set('storeFilter', e.target.value)}>
          <option value="all">All Stores</option>
          <option value="store1">Store 1</option>
          <option value="store2">Store 2</option>
        </select>
      </Group>
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
      <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.6px', color:'var(--text3)', fontWeight:600 }}>{label}</div>
      {children}
    </div>
  )
}

function Div() {
  return <div style={{ width:1, height:34, background:'var(--border)', flexShrink:0 }} />
}
