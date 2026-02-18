import React, { useEffect, useState } from 'react'
import { Panel, Pill } from '../ui/table'
import { apiGet } from '../ui/api'

type Page<T> = { items: T[]; total: number; page: number; page_size: number }
type Job = { id: string; status: string; priority: string; customer: string; last_update_at: string }
type Alert = { id: string; severity: string; alert_type: string; status: string; created_at: string }

function tile(label: string, value: number, tone: 'ok'|'warn'|'danger'|'info'|'muted' = 'info') {
  return (
    <div style={{padding:12, border:'1px solid var(--border)', borderRadius:'var(--radius)', background:'#0b1220', minWidth:180}}>
      <div style={{fontSize:12, color:'var(--muted)'}}>{label}</div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6}}>
        <div style={{fontSize:22, fontWeight:800}}>{value}</div>
        <Pill tone={tone} text="today" />
      </div>
    </div>
  )
}

export default function Overview() {
  const [jobs, setJobs] = useState<Page<Job> | null>(null)
  const [alerts, setAlerts] = useState<Page<Alert> | null>(null)

  useEffect(() => {
    ;(async () => {
      const j = await apiGet<Page<Job>>('/jobs', { page: 1, page_size: 1 })
      const a = await apiGet<Page<Alert>>('/alerts', { page: 1, page_size: 1, status: 'open' })
      setJobs(j)
      setAlerts(a)
    })().catch(console.error)
  }, [])

  return (
    <div style={{padding:12, display:'grid', gap:12}}>
      <Panel title="Today">
        <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
          {tile('Total jobs', jobs?.total ?? 0, 'info')}
          {tile('Open alerts', alerts?.total ?? 0, (alerts?.total ?? 0) > 20 ? 'warn' : 'ok')}
          {tile('Unassigned', 0, 'muted')}
          {tile('Late', 0, 'danger')}
        </div>
      </Panel>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <Panel title="At risk (sample)">
          <div style={{color:'var(--muted)'}}>Hook in SLA risk queries and exception flags in Phase 2.</div>
        </Panel>
        <Panel title="Operations feed (sample)">
          <div style={{color:'var(--muted)'}}>WebSocket events will stream here in Phase 2.</div>
        </Panel>
      </div>
    </div>
  )
}
