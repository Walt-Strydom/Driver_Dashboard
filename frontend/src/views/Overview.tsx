import React, { useEffect, useState } from 'react'
import { Panel, Pill } from '../ui/table'
import { apiGet } from '../ui/api'

type Page<T> = { items: T[]; total: number; page: number; page_size: number }
type Job = { id: string; status: string; priority: string; customer: string; last_update_at: string }
type Alert = { id: string; severity: string; alert_type: string; status: string; created_at: string }

function tile(label: string, value: number, tone: 'ok'|'warn'|'danger'|'info'|'muted' = 'info') {
  return (
    <div style={{padding:12, border:'1px solid var(--border)', borderRadius:'var(--radius)', background:'var(--panel2)', minWidth:180}}>
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
  const [unassigned, setUnassigned] = useState(0)
  const [late, setLate] = useState(0)
  const [events, setEvents] = useState<string[]>([])

  async function load() {
    const j = await apiGet<Page<Job>>('/jobs', { page: 1, page_size: 1 })
    const a = await apiGet<Page<Alert>>('/alerts', { page: 1, page_size: 1, status: 'open' })
    const u = await apiGet<Page<Job>>('/jobs', { page: 1, page_size: 1, status: 'unassigned' })
    const l = await apiGet<Page<Job>>('/jobs', { page: 1, page_size: 1, status: 'late' })
    setJobs(j)
    setAlerts(a)
    setUnassigned(u.total)
    setLate(l.total)
  }

  useEffect(() => {
    load().catch(console.error)
  }, [])

  useEffect(() => {
    const onWs = (event: Event) => {
      const custom = event as CustomEvent<any>
      const msg = custom.detail
      if (!msg || typeof msg !== 'object') return
      setEvents(prev => [`${new Date().toLocaleTimeString()} · ${msg.type}`, ...prev].slice(0, 8))
      if (msg.type === 'job.created' || msg.type === 'job.updated' || msg.type === 'ops.refresh') {
        load().catch(console.error)
      }
    }
    window.addEventListener('ops:ws', onWs)
    return () => window.removeEventListener('ops:ws', onWs)
  }, [])

  return (
    <div style={{padding:12, display:'grid', gap:12}}>
      <Panel title="Today">
        <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
          {tile('Total jobs', jobs?.total ?? 0, 'info')}
          {tile('Open alerts', alerts?.total ?? 0, (alerts?.total ?? 0) > 20 ? 'warn' : 'ok')}
          {tile('Unassigned', unassigned, unassigned > 0 ? 'warn' : 'ok')}
          {tile('Late', late, late > 0 ? 'danger' : 'ok')}
        </div>
      </Panel>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <Panel title="At risk (sample)">
          <div style={{color:'var(--muted)'}}>Hook in SLA risk queries and exception flags in Phase 2.</div>
        </Panel>
        <Panel title="Operations feed (sample)">
          {events.length === 0 ? <div style={{color:'var(--muted)'}}>Waiting for live events…</div> : (
            <div style={{display:'grid', gap:6}}>
              {events.map((ev, i) => <div key={`${ev}-${i}`} style={{fontSize:13, color:'var(--text)'}}>{ev}</div>)}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}
