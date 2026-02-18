import React, { useEffect, useMemo, useState } from 'react'
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { apiGet } from '../ui/api'
import { Panel, SplitPane, ToolbarRow, inputStyle, btnStyle, Pill } from '../ui/table'
import { useAppStore } from '../ui/store'

type Page<T> = { items: T[]; total: number; page: number; page_size: number }
type Driver = {
  id: string
  name: string
  staff_id?: string | null
  status: string
  depot?: string | null
  region?: string | null
  hours_today: number
  hours_week: number
  compliance_state: string
  last_update_at: string
}

function tone(s: string) {
  if (s === 'on_job') return 'info'
  if (s === 'on_duty') return 'ok'
  if (s === 'idle') return 'warn'
  return 'muted'
}

export default function Drivers() {
  const { globalQuery } = useAppStore()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [data, setData] = useState<Page<Driver> | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<any>(null)

  const columns = useMemo<ColumnDef<Driver>[]>(() => [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Staff ID', accessorKey: 'staff_id', cell: ({row}) => <span style={{color:'var(--muted)'}}>{row.original.staff_id || '-'}</span> },
    { header: 'Status', accessorKey: 'status', cell: ({row}) => <Pill tone={tone(row.original.status) as any} text={row.original.status} /> },
    { header: 'Hours today', accessorKey: 'hours_today' },
    { header: 'Hours week', accessorKey: 'hours_week' },
    { header: 'Compliance', accessorKey: 'compliance_state', cell: ({row}) => <Pill tone={row.original.compliance_state === 'ok' ? 'ok' : 'danger'} text={row.original.compliance_state} /> },
    { header: 'Last update', accessorKey: 'last_update_at', cell: ({row}) => new Date(row.original.last_update_at).toLocaleString() },
  ], [])

  const table = useReactTable({ data: data?.items ?? [], columns, getCoreRowModel: getCoreRowModel() })

  useEffect(() => {
    apiGet<Page<Driver>>('/drivers', { page, page_size: 80, q: globalQuery, status: status || undefined })
      .then(res => {
        setData(res)
        if (!selectedId && res.items.length) setSelectedId(res.items[0].id)
      })
      .catch(console.error)
  }, [page, status, globalQuery])

  useEffect(() => {
    if (!selectedId) return
    apiGet(`/drivers/${selectedId}`).then(setDetail).catch(console.error)
  }, [selectedId])

  useEffect(() => {
    const onWs = (event: Event) => {
      const custom = event as CustomEvent<any>
      const msg = custom.detail
      if (!msg || typeof msg !== 'object') return
      const t = msg.type
      if (t === 'driver.updated' || t === 'job.updated' || t === 'ops.refresh') {
        apiGet<Page<Driver>>('/drivers', { page, page_size: 80, q: globalQuery, status: status || undefined })
          .then(setData)
          .catch(console.error)
        if (selectedId) apiGet(`/drivers/${selectedId}`).then(setDetail).catch(console.error)
      }
    }
    window.addEventListener('ops:ws', onWs)
    return () => window.removeEventListener('ops:ws', onWs)
  }, [page, status, globalQuery, selectedId])

  const left = (
    <Panel title="Drivers" right={<span style={{color:'var(--muted)'}}>{data ? `${data.total} total` : '...'}</span>}>
      <ToolbarRow>
        <select value={status} onChange={(e)=>setStatus(e.target.value)} style={inputStyle}>
          <option value="">Status</option>
          {['on_duty','on_job','idle','off_duty'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button style={btnStyle} onClick={()=>setPage(1)}>Reset page</button>
      </ToolbarRow>

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
              <tr key={r.id} onClick={()=>setSelectedId(r.original.id)} style={{cursor:'pointer', background: r.original.id === selectedId ? 'rgba(96,165,250,0.12)' : 'transparent'}}>
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

      <div style={{display:'flex', justifyContent:'space-between', marginTop:10}}>
        <button style={btnStyle} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</button>
        <button style={btnStyle} onClick={()=>setPage(p=>p+1)}>Next</button>
      </div>
    </Panel>
  )

  const right = (
    <Panel title="Driver details">
      {!detail ? <div style={{color:'var(--muted)'}}>Select a driver</div> : (
        <div style={{display:'grid', gap:8}}>
          <div style={{display:'flex', gap:8, alignItems:'center', flexWrap:'wrap'}}>
            <div style={{fontWeight:800}}>{detail.driver.name}</div>
            <Pill tone={tone(detail.driver.status) as any} text={detail.driver.status} />
            <Pill tone={detail.driver.compliance_state === 'ok' ? 'ok' : 'danger'} text={detail.driver.compliance_state} />
          </div>
          <div style={{color:'var(--muted)'}}>UUID: <span style={{color:'var(--text)'}}>{detail.driver.id}</span></div>
          <div style={{color:'var(--muted)'}}>Hours today: <span style={{color:'var(--text)'}}>{detail.driver.hours_today}</span></div>
          <div style={{color:'var(--muted)'}}>Hours week: <span style={{color:'var(--text)'}}>{detail.driver.hours_week}</span></div>
          <hr />
          <div style={{color:'var(--muted)'}}>Current job: <span style={{color:'var(--text)'}}>{detail.current_job?.job_code || '-'}</span></div>
          <div style={{fontSize:12, color:'var(--muted)'}}>Copy the UUID into the Jobs assignment panel.</div>
        </div>
      )}
    </Panel>
  )

  return <SplitPane left={left} right={right} />
}
