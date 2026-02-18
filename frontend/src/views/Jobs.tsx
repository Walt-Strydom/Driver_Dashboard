import React, { useEffect, useMemo, useState } from 'react'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { apiGet, apiPost } from '../ui/api'
import { Panel, SplitPane, ToolbarRow, inputStyle, btnStyle, btnPrimaryStyle, Pill } from '../ui/table'
import { useAppStore } from '../ui/store'

type Page<T> = { items: T[]; total: number; page: number; page_size: number }
type Job = {
  id: string
  job_code: string
  priority: string
  customer: string
  pickup_site?: string | null
  drop_site?: string | null
  scheduled_at?: string | null
  eta_at?: string | null
  status: string
  sla_minutes_total: number
  driver_id?: string | null
  vehicle_id?: string | null
  exceptions?: string | null
  last_update_at: string
  owner_user_id?: string | null
}

type Driver = { id: string; name: string; depot?: string | null; region?: string | null; compliance_state: string }
type Vehicle = { id: string; registration: string; vehicle_class?: string | null; compliance_state: string }

function toneForStatus(s: string) {
  if (s === 'completed') return 'ok'
  if (s === 'late' || s === 'failed') return 'danger'
  if (s === 'in_progress') return 'info'
  return 'muted'
}

export default function Jobs() {
  const { globalQuery } = useAppStore()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [stale, setStale] = useState<number | ''>('')
  const [data, setData] = useState<Page<Job> | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)
  const [error, setError] = useState<string>('')

  const columns = useMemo<ColumnDef<Job>[]>(() => [
    { header: 'Job ID', accessorKey: 'job_code', size: 120 },
    { header: 'Priority', accessorKey: 'priority', cell: ({row}) => <Pill tone={row.original.priority === 'critical' ? 'danger' : row.original.priority === 'high' ? 'warn' : 'muted'} text={row.original.priority} /> },
    { header: 'Customer', accessorKey: 'customer', size: 200 },
    { header: 'Pickup', accessorKey: 'pickup_site', size: 180 },
    { header: 'Drop', accessorKey: 'drop_site', size: 180 },
    { header: 'Status', accessorKey: 'status', cell: ({row}) => <Pill tone={toneForStatus(row.original.status) as any} text={row.original.status} /> },
    { header: 'Exceptions', accessorKey: 'exceptions', cell: ({row}) => row.original.exceptions ? <Pill tone="warn" text={row.original.exceptions} /> : <span style={{color:'var(--muted)'}}>-</span> },
    { header: 'Last update', accessorKey: 'last_update_at', size: 170, cell: ({row}) => new Date(row.original.last_update_at).toLocaleString() },
  ], [])

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  async function load() {
    setError('')
    const res = await apiGet<Page<Job>>('/jobs', {
      page,
      page_size: pageSize,
      q: globalQuery,
      status: status || undefined,
      priority: priority || undefined,
      stale_minutes: stale === '' ? undefined : stale,
    })
    setData(res)
    if (!selectedId && res.items.length) setSelectedId(res.items[0].id)
  }

  useEffect(() => { load().catch(e => setError(String(e))) }, [page, pageSize, status, priority, stale, globalQuery])

  useEffect(() => {
    if (!selectedId) return
    apiGet<any>(`/jobs/${selectedId}`).then(setDetail).catch(e => setError(String(e)))
  }, [selectedId])

  useEffect(() => {
    const onWs = (event: Event) => {
      const custom = event as CustomEvent<any>
      const msg = custom.detail
      if (!msg || typeof msg !== 'object') return
      const t = msg.type
      if (t === 'job.created' || t === 'job.updated' || t === 'ops.refresh') {
        load().catch(e => setError(String(e)))
        if (selectedId) {
          apiGet<any>(`/jobs/${selectedId}`).then(setDetail).catch(e => setError(String(e)))
        }
      }
    }
    window.addEventListener('ops:ws', onWs)
    return () => window.removeEventListener('ops:ws', onWs)
  }, [selectedId, page, pageSize, status, priority, stale, globalQuery])

  const right = (
    <Panel title="Job details" right={<span style={{color:'var(--muted)'}}>Split pane</span>}>
      {!detail ? <div style={{color:'var(--muted)'}}>Select a job</div> : (
        <div style={{display:'grid', gap:10}}>
          <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
            <div style={{fontWeight:800}}>{detail.job.job_code}</div>
            <Pill tone={toneForStatus(detail.job.status) as any} text={detail.job.status} />
            <Pill tone={detail.job.priority === 'critical' ? 'danger' : detail.job.priority === 'high' ? 'warn' : 'muted'} text={detail.job.priority} />
          </div>

          <div style={{display:'grid', gap:6, color:'var(--muted)'}}>
            <div><span style={{color:'var(--text)'}}>Customer:</span> {detail.job.customer}</div>
            <div><span style={{color:'var(--text)'}}>Pickup:</span> {detail.job.pickup_site || '-'}</div>
            <div><span style={{color:'var(--text)'}}>Drop:</span> {detail.job.drop_site || '-'}</div>
            <div><span style={{color:'var(--text)'}}>Exceptions:</span> {detail.job.exceptions || '-'}</div>
          </div>

          <hr />

          <AssignBlock job={detail.job} driver={detail.driver} vehicle={detail.vehicle} onSaved={() => { load().catch(console.error); apiGet(`/jobs/${selectedId}`).then(setDetail).catch(console.error) }} onError={setError} />

          <hr />

          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button style={btnPrimaryStyle} onClick={()=>navigator.clipboard.writeText(JSON.stringify(detail, null, 2))}>Copy JSON</button>
            <button style={btnStyle} onClick={()=>setSelectedId(null)}>Clear</button>
          </div>
        </div>
      )}
    </Panel>
  )

  const left = (
    <Panel title="Jobs" right={<span style={{color:'var(--muted)'}}>{data ? `${data.total} total` : '...'}</span>}>
      <ToolbarRow>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} style={inputStyle}>
          <option value="">Status</option>
          {['unassigned','assigned','in_progress','late','completed','failed','cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priority} onChange={(e)=>setPriority(e.target.value)} style={inputStyle}>
          <option value="">Priority</option>
          {['low','normal','high','critical'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={stale} onChange={(e)=>setStale(e.target.value === '' ? '' : Number(e.target.value))} style={inputStyle}>
          <option value="">Stale updates</option>
          {[15,30,60,120].map(m => <option key={m} value={m}>{m} min</option>)}
        </select>
        <button style={btnStyle} onClick={()=>{ setPage(1); load().catch(console.error) }}>Refresh</button>
      </ToolbarRow>

      {error ? <div style={{color:'var(--danger)', marginBottom:10}}>{error}</div> : null}

      <div style={{overflow:'auto', border:'1px solid var(--border)', borderRadius:10}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
          <thead style={{position:'sticky', top:0, background:'var(--panel2)', zIndex:1}}>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(h => (
                  <th key={h.id} style={{textAlign:'left', padding:'10px 10px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap'}}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(r => (
              <tr
                key={r.id}
                onClick={()=>setSelectedId(r.original.id)}
                style={{
                  cursor:'pointer',
                  background: r.original.id === selectedId ? 'rgba(96,165,250,0.12)' : 'transparent',
                }}
              >
                {r.getVisibleCells().map(c => (
                  <td key={c.id} style={{padding:'10px 10px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap'}}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10, color:'var(--muted)'}}>
        <div>
          Page {data?.page ?? page} of {data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1}
        </div>
        <div style={{display:'flex', gap:8}}>
          <button style={btnStyle} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
          <button style={btnStyle} onClick={()=>setPage(p=>p+1)}>Next</button>
        </div>
      </div>
    </Panel>
  )

  return <SplitPane left={left} right={right} />
}

function AssignBlock({ job, driver, vehicle, onSaved, onError }: { job: Job, driver: Driver | null, vehicle: Vehicle | null, onSaved: ()=>void, onError: (s:string)=>void }) {
  const [driverId, setDriverId] = useState(job.driver_id || '')
  const [vehicleId, setVehicleId] = useState(job.vehicle_id || '')
  const [override, setOverride] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  async function save() {
    try{
      await apiPost(`/jobs/${job.id}/assign`, {
        driver_id: driverId || null,
        vehicle_id: vehicleId || null,
        override,
        override_reason: override ? overrideReason : null,
      })
      onSaved()
    }catch(e:any){
      onError(e?.message || String(e))
    }
  }

  return (
    <div style={{display:'grid', gap:10}}>
      <div style={{fontWeight:700}}>Assign / reassign</div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
        <div>
          <div style={{fontSize:12, color:'var(--muted)', marginBottom:6}}>Driver ID</div>
          <input value={driverId} onChange={(e)=>setDriverId(e.target.value)} placeholder="UUID" style={inputStyle} />
          <div style={{fontSize:12, color:'var(--muted)', marginTop:6}}>
            Current: {driver ? driver.name : 'none'} {driver?.compliance_state === 'blocked' ? '(blocked)' : ''}
          </div>
        </div>
        <div>
          <div style={{fontSize:12, color:'var(--muted)', marginBottom:6}}>Vehicle ID</div>
          <input value={vehicleId} onChange={(e)=>setVehicleId(e.target.value)} placeholder="UUID" style={inputStyle} />
          <div style={{fontSize:12, color:'var(--muted)', marginTop:6}}>
            Current: {vehicle ? vehicle.registration : 'none'} {vehicle?.compliance_state === 'blocked' ? '(blocked)' : ''}
          </div>
        </div>
      </div>

      <label style={{display:'flex', gap:8, alignItems:'center', color:'var(--muted)'}}>
        <input type="checkbox" checked={override} onChange={(e)=>setOverride(e.target.checked)} />
        Manager override (audited)
      </label>

      {override ? (
        <input value={overrideReason} onChange={(e)=>setOverrideReason(e.target.value)} placeholder="Override reason (required in later phases)" style={inputStyle} />
      ) : null}

      <div style={{display:'flex', gap:8}}>
        <button style={btnPrimaryStyle} onClick={save}>Save assignment</button>
        <button style={btnStyle} onClick={()=>{ setDriverId(''); setVehicleId('') }}>Clear</button>
      </div>

      <div style={{fontSize:12, color:'var(--muted)'}}>
        Tip: Copy a driver/vehicle UUID from the Drivers/Vehicles tables.
      </div>
    </div>
  )
}
