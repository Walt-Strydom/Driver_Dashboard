import React, { useEffect, useMemo, useState } from 'react'
import { apiGet } from '../ui/api'
import { Panel, ToolbarRow, btnStyle, inputStyle, Pill } from '../ui/table'

type JobsReport = {
  window_days: number
  generated_at: string
  totals: {
    all_jobs: number
    jobs_in_window: number
    open_jobs: number
    completed_jobs: number
    avg_resolution_minutes: number | null
  }
  status_counts: Record<string, number>
  priority_counts_window: Record<string, number>
  daily_volume: { date: string; created: number; completed: number; failed: number; late: number }[]
  monthly_volume: { month: string; created: number }[]
  top_customers_window: { customer: string; jobs: number }[]
}

function tile(label: string, value: string | number, tone: 'ok'|'warn'|'danger'|'info'|'muted' = 'info') {
  return (
    <div style={{padding:12, border:'1px solid var(--border)', borderRadius:'var(--radius)', background:'var(--panel2)', minWidth:220}}>
      <div style={{fontSize:12, color:'var(--muted)'}}>{label}</div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6}}>
        <div style={{fontSize:22, fontWeight:800}}>{value}</div>
        <Pill tone={tone} text="analytics" />
      </div>
    </div>
  )
}

function Bars({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{display:'grid', gap:8}}>
      {data.map((d) => (
        <div key={d.label} style={{display:'grid', gridTemplateColumns:'120px 1fr 60px', gap:10, alignItems:'center'}}>
          <div style={{fontSize:12, color:'var(--muted)'}}>{d.label}</div>
          <div style={{height:10, background:'var(--panel2)', border:'1px solid var(--border)', borderRadius:999, overflow:'hidden'}}>
            <div style={{height:'100%', width:`${Math.max(2, (d.value / max) * 100)}%`, background:'rgba(var(--accent-rgb),0.7)'}} />
          </div>
          <div style={{fontSize:12, color:'var(--text)', textAlign:'right'}}>{d.value}</div>
        </div>
      ))}
    </div>
  )
}

export default function Reports() {
  const [days, setDays] = useState(180)
  const [data, setData] = useState<JobsReport | null>(null)
  const [error, setError] = useState('')

  async function load() {
    setError('')
    const res = await apiGet<JobsReport>('/reports/jobs', { days })
    setData(res)
  }

  useEffect(() => { load().catch(e => setError(String(e))) }, [days])

  useEffect(() => {
    const onWs = (event: Event) => {
      const custom = event as CustomEvent<any>
      const msg = custom.detail
      if (!msg || typeof msg !== 'object') return
      if (msg.type === 'job.created' || msg.type === 'job.updated' || msg.type === 'ops.refresh') {
        load().catch(e => setError(String(e)))
      }
    }
    window.addEventListener('ops:ws', onWs)
    return () => window.removeEventListener('ops:ws', onWs)
  }, [days])

  const statusRows = useMemo(() => {
    if (!data) return []
    return Object.entries(data.status_counts)
      .sort((a, b) => b[1] - a[1])
      .map(([status, count]) => ({ status, count }))
  }, [data])

  return (
    <div style={{padding:12, display:'grid', gap:12}}>
      <Panel title="Operational reporting & analytics" right={<span style={{color:'var(--muted)'}}>{data ? `Generated ${new Date(data.generated_at).toLocaleString()}` : '...'}</span>}>
        <ToolbarRow>
          <select value={days} onChange={(e)=>setDays(Number(e.target.value))} style={inputStyle}>
            {[30, 60, 90, 180, 365, 730].map(v => <option key={v} value={v}>Last {v} days</option>)}
          </select>
          <button style={btnStyle} onClick={()=>load().catch(e=>setError(String(e)))}>Refresh analytics</button>
        </ToolbarRow>

        {error ? <div style={{color:'var(--danger)', marginBottom:10}}>{error}</div> : null}

        <div style={{display:'flex', gap:10, flexWrap:'wrap'}}>
          {tile('All jobs (historical)', data?.totals.all_jobs ?? 0, 'info')}
          {tile(`Jobs in ${days}d window`, data?.totals.jobs_in_window ?? 0, 'ok')}
          {tile('Open jobs', data?.totals.open_jobs ?? 0, (data?.totals.open_jobs ?? 0) > 0 ? 'warn' : 'ok')}
          {tile('Completed jobs', data?.totals.completed_jobs ?? 0, 'ok')}
          {tile('Avg resolution (min)', data?.totals.avg_resolution_minutes ?? '-', 'muted')}
        </div>
      </Panel>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <Panel title="Status distribution (all history)">
          <Bars data={statusRows.map(r => ({ label: r.status, value: r.count }))} />
        </Panel>

        <Panel title={`Daily job creation (${days}d)`}>
          <Bars data={(data?.daily_volume ?? []).slice(-20).map(d => ({ label: d.date.slice(5), value: d.created }))} />
        </Panel>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
        <Panel title="Top customers (window)">
          <Bars data={(data?.top_customers_window ?? []).map(c => ({ label: c.customer, value: c.jobs }))} />
        </Panel>

        <Panel title="Monthly creation trend (all history)">
          <Bars data={(data?.monthly_volume ?? []).slice(-12).map(m => ({ label: m.month, value: m.created }))} />
        </Panel>
      </div>
    </div>
  )
}
