'use client'
import { ForecastSettings, ForecastModel } from '@/lib/types'

interface Props {
  settings: ForecastSettings
  onChange: (s: ForecastSettings) => void
}

const S: React.CSSProperties = {
  background:'var(--surface2)', border:'1px solid var(--border)',
  color:'var(--text)', padding:'7px 11px', borderRadius:7,
  fontSize:13, outline:'none', fontFamily:'inherit',
}

export default function SettingsBar({ settings, onChange }: Props) {
  const set = (key: keyof ForecastSettings, val: any) => onChange({ ...settings, [key]: val })

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:12, padding:'16px 20px', marginBottom:22,
      display:'flex', alignItems:'center', gap:20, flexWrap:'wrap',
    }}>
      <Group label="Days of Stock">
        <input type="number" style={{...S, width:90}} value={settings.daysOfStock} min={1} max={365}
          onChange={e => set('daysOfStock', parseInt(e.target.value) || 180)} />
      </Group>
      <Divider />
      <Group label="Lookback (days)">
        <input type="number" style={{...S, width:90}} value={settings.lookbackDays} min={7} max={365}
          onChange={e => set('lookbackDays', parseInt(e.target.value) || 30)} />
      </Group>
      <Divider />
      <Group label="Lead Time (days)">
        <input type="number" style={{...S, width:90}} value={settings.leadTimeDays} min={1} max={180}
          onChange={e => set('leadTimeDays', parseInt(e.target.value) || 14)} />
      </Group>
      <Divider />
      <Group label="Safety Stock">
        <select style={{...S, width:160}} value={settings.safetyBuffer}
          onChange={e => set('safetyBuffer', parseFloat(e.target.value))}>
          <option value={0}>None (0%)</option>
          <option value={0.1}>Conservative (10%)</option>
          <option value={0.2}>Standard (20%)</option>
          <option value={0.3}>Aggressive (30%)</option>
          <option value={0.5}>High (50%)</option>
        </select>
      </Group>
      <Divider />
      <Group label="Forecast Model">
        <select style={{...S, width:160}} value={settings.model}
          onChange={e => set('model', e.target.value as ForecastModel)}>
          <option value="velocity">Sales Velocity</option>
          <option value="trend">Trend Adjusted (+12%)</option>
          <option value="seasonal">Seasonal</option>
          <option value="conservative">Conservative (−15%)</option>
        </select>
      </Group>
      <Divider />
      <Group label="Store">
        <select style={{...S, width:140}} value={settings.storeFilter}
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
      <div style={{ fontSize:10, textTransform:'uppercase', letterSpacing:'0.8px', color:'var(--text3)', fontWeight:600 }}>{label}</div>
      {children}
    </div>
  )
}

function Divider() {
  return <div style={{ width:1, height:38, background:'var(--border)' }} />
}
